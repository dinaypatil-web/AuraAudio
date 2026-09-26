/**
 * AuraWave Unified Audio Manager
 * Coordinates YouTube IFrame API audio-first player, HTML5 audio (for offline blobs & streams),
 * Web Audio API Equalizer + Analyser, and MediaSession background lockscreen controls.
 */
import { Track, PlayerState, EqualizerBands } from '../types/music';
import { idbGetAudioBlob } from './idb';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export type PlayerListener = (state: PlayerState) => void;
export type TrackEndListener = () => void;

class AudioManager {
  private ytPlayer: any = null;
  private ytReady: boolean = false;
  private ytContainerId = 'aurawave-yt-frame';
  private audioElement: HTMLAudioElement | null = null;
  private silentKeeper: HTMLAudioElement | null = null;

  // Web Audio Nodes
  private audioContext: AudioContext | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private eqFilters: {
    subBass: BiquadFilterNode;
    bass: BiquadFilterNode;
    mid: BiquadFilterNode;
    upperMid: BiquadFilterNode;
    treble: BiquadFilterNode;
  } | null = null;

  // Canvas & Video for Picture-in-Picture
  private pipCanvas: HTMLCanvasElement | null = null;
  private pipVideo: HTMLVideoElement | null = null;
  private pipAnimationId: number | null = null;

  private state: PlayerState = {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    isMuted: false,
    playbackRate: 1,
    repeatMode: 'off',
    isShuffled: false,
    isBuffering: false,
    isPictureInPicture: false,
    isBackgroundAudioMode: true,
    equalizerPreset: 'Flat',
    sleepTimerEndsAt: null,
  };

  private listeners: Set<PlayerListener> = new Set();
  private onTrackEndCallbacks: Set<TrackEndListener> = new Set();
  private progressInterval: any = null;
  private sleepTimerTimeout: any = null;
  private activeMode: 'youtube' | 'audio' | null = null;
  private offlineBlobUrlMap: Map<string, string> = new Map();
  private isUserInitiatedPause: boolean = false;

  constructor() {
    this.initAudioElement();
    this.initSilentKeeper();
    this.loadYouTubeAPI();
    this.setupMediaSession();
    this.setupVisibilityListener();
  }

  private setupVisibilityListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (this.state.isPlaying && !this.isUserInitiatedPause) {
        this.playSilentKeeper();
        if (this.activeMode === 'youtube' && this.ytPlayer?.playVideo) {
          // Staggered resume attempts when browser switches to background
          setTimeout(() => {
            if (this.state.isPlaying && !this.isUserInitiatedPause && this.ytPlayer?.playVideo) {
              try {
                this.ytPlayer.playVideo();
              } catch {}
            }
          }, 80);
          setTimeout(() => {
            if (this.state.isPlaying && !this.isUserInitiatedPause && this.ytPlayer?.playVideo) {
              try {
                this.ytPlayer.playVideo();
              } catch {}
            }
          }, 250);
        } else if (this.activeMode === 'audio' && this.audioElement) {
          this.audioElement.play().catch(() => {});
        }
      }
    });
  }

  public subscribe(listener: PlayerListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  public onTrackEnd(callback: TrackEndListener): () => void {
    this.onTrackEndCallbacks.add(callback);
    return () => this.onTrackEndCallbacks.delete(callback);
  }

  private notify() {
    const copy = { ...this.state };
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = this.state.isPlaying ? 'playing' : 'paused';
      } catch {}
    }
    this.listeners.forEach((fn) => fn(copy));
    this.updateMediaSessionPosition();
  }

  private initAudioElement() {
    if (typeof window === 'undefined') return;
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.state.isBuffering = false;
      this.isUserInitiatedPause = false;
      this.notify();
      this.playSilentKeeper();
    });

    this.audioElement.addEventListener('pause', () => {
      if (!this.isUserInitiatedPause && this.state.isPlaying) {
        // Background pause by OS: attempt immediate resume
        this.audioElement?.play().catch(() => {});
        return;
      }
      this.state.isPlaying = false;
      this.notify();
    });

    this.audioElement.addEventListener('waiting', () => {
      this.state.isBuffering = true;
      this.notify();
    });

    this.audioElement.addEventListener('playing', () => {
      this.state.isBuffering = false;
      this.notify();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.activeMode === 'audio' && this.audioElement) {
        this.state.currentTime = this.audioElement.currentTime;
        if (!isNaN(this.audioElement.duration) && this.audioElement.duration > 0) {
          this.state.duration = this.audioElement.duration;
        }
        this.notify();
      }
    });

    this.audioElement.addEventListener('ended', async () => {
      // Check if track ended early because it was a 30s preview (audio preview cutoff)
      const current = this.state.currentTime;
      const expectedTotal = this.state.duration || this.state.currentTrack?.duration || 0;
      if (
        this.activeMode === 'audio' &&
        this.state.currentTrack &&
        expectedTotal > 45 &&
        current < expectedTotal - 15
      ) {
        console.log(`Audio preview ended at ${Math.round(current)}s of ${expectedTotal}s; transitioning to full track audio stream`);
        await this.switchToFullYouTubeTrack(this.state.currentTrack, Math.floor(current));
        return;
      }

      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio element playback error:', e);
      this.state.isBuffering = false;
      this.state.isPlaying = false;
      this.notify();
    });
  }

  /**
   * Generates a continuous 2-second sub-audible 28Hz audio buffer to maintain mobile OS playback category
   * (Prevents iOS mediaserverd silence detectors from suspending background execution)
   */
  private initSilentKeeper() {
    if (typeof window === 'undefined') return;
    try {
      const sampleRate = 8000;
      const numFrames = sampleRate * 2; // 2 seconds
      const dataSize = numFrames * 2; // 16-bit PCM
      const buffer = new Uint8Array(44 + dataSize);
      const view = new DataView(buffer.buffer);
      buffer.set([0x52, 0x49, 0x46, 0x46], 0); // 'RIFF'
      view.setUint32(4, 36 + dataSize, true);
      buffer.set([0x57, 0x41, 0x56, 0x45], 8); // 'WAVE'
      buffer.set([0x66, 0x6d, 0x74, 0x20], 12); // 'fmt '
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // 1 channel
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true); // 2 bytes per sample
      view.setUint16(34, 16, true); // 16-bit
      buffer.set([0x64, 0x61, 0x74, 0x61], 36); // 'data'
      view.setUint32(40, dataSize, true);

      // Sub-audible 28Hz sine wave to supply continuous non-zero audio energy to OS audio daemon
      const freq = 28;
      for (let i = 0; i < numFrames; i++) {
        const val = Math.round(300 * Math.sin((2 * Math.PI * freq * i) / sampleRate));
        view.setInt16(44 + i * 2, val, true);
      }

      let binary = '';
      for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
      }
      const toneDataUri = 'data:audio/wav;base64,' + btoa(binary);

      this.silentKeeper = new Audio(toneDataUri);
      this.silentKeeper.loop = true;
      this.silentKeeper.volume = 0.05; // Audible to OS power daemon, silent to human ear
      this.silentKeeper.setAttribute('playsinline', 'true');
      this.silentKeeper.setAttribute('webkit-playsinline', 'true');
      this.silentKeeper.style.position = 'fixed';
      this.silentKeeper.style.width = '1px';
      this.silentKeeper.style.height = '1px';
      this.silentKeeper.style.opacity = '0.01';
      this.silentKeeper.style.pointerEvents = 'none';

      if (document.body) {
        document.body.appendChild(this.silentKeeper);
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          document.body?.appendChild(this.silentKeeper!);
        });
      }
    } catch (err) {
      console.warn('Silent keeper setup note:', err);
    }
  }

  private playSilentKeeper() {
    if (this.silentKeeper && this.state.isBackgroundAudioMode) {
      const p = this.silentKeeper.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    }
  }

  private pauseSilentKeeper() {
    if (this.silentKeeper) {
      this.silentKeeper.pause();
    }
  }

  /**
   * Load the YouTube IFrame Player API
   */
  private loadYouTubeAPI() {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) {
      this.ytReady = true;
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      this.ytReady = true;
    };
  }

  private isMiniVideoVisible: boolean = false;

  public toggleMiniVideo(force?: boolean): boolean {
    this.isMiniVideoVisible = force !== undefined ? force : !this.isMiniVideoVisible;
    const container = document.getElementById(this.ytContainerId);
    if (container) {
      if (this.isMiniVideoVisible) {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        container.style.zIndex = '35';
        container.style.transform = 'translateY(0)';
      } else {
        container.style.opacity = '0.001';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-1';
        container.style.transform = 'translateY(20px)';
      }
    }
    return this.isMiniVideoVisible;
  }

  public getIsMiniVideoVisible(): boolean {
    return this.isMiniVideoVisible;
  }

  public ensureYouTubePlayer(): Promise<any> {
    return new Promise((resolve) => {
      if (this.ytPlayer) {
        resolve(this.ytPlayer);
        return;
      }

      const checkYT = () => {
        if (window.YT && window.YT.Player) {
          let container = document.getElementById(this.ytContainerId);
          if (!container) {
            container = document.createElement('div');
            container.id = this.ytContainerId;
            // Position with standard dimensions so YouTube engine never restricts or flags 1px player
            container.style.position = 'fixed';
            container.style.bottom = '96px';
            container.style.right = '20px';
            container.style.width = '280px';
            container.style.height = '160px';
            container.style.borderRadius = '12px';
            container.style.overflow = 'hidden';
            container.style.boxShadow = '0 12px 30px rgba(0,0,0,0.7)';
            container.style.border = '1px solid rgba(255,255,255,0.1)';
            container.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            if (this.isMiniVideoVisible) {
              container.style.opacity = '1';
              container.style.pointerEvents = 'auto';
              container.style.zIndex = '35';
            } else {
              container.style.opacity = '0.001';
              container.style.pointerEvents = 'none';
              container.style.zIndex = '-1';
            }
            document.body.appendChild(container);
          }

          this.ytPlayer = new window.YT.Player(this.ytContainerId, {
            height: '160',
            width: '280',
            playerVars: {
              autoplay: 1,
              controls: 1,
              disablekb: 0,
              fs: 0,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              iv_load_policy: 3,
              origin: typeof window !== 'undefined' ? window.location.origin : undefined,
              enablejsapi: 1,
            },
            events: {
              onReady: () => {
                this.ytPlayer.setVolume(this.state.volume * 100);
                resolve(this.ytPlayer);
              },
              onStateChange: (event: any) => {
                this.handleYouTubeStateChange(event.data);
              },
              onError: (err: any) => {
                console.warn('YouTube player error:', err);
                this.state.isBuffering = false;
                this.notify();
              },
            },
          });
        } else {
          setTimeout(checkYT, 100);
        }
      };

      checkYT();
    });
  }

  private handleYouTubeStateChange(ytState: number) {
    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (ytState === 1) {
      this.state.isPlaying = true;
      this.state.isBuffering = false;
      this.isUserInitiatedPause = false;
      this.startYouTubeProgressTimer();
      this.playSilentKeeper();
      this.notify();
    } else if (ytState === 2) {
      // If user did not manually pause, this pause was triggered by mobile browser tab blur or screen lock!
      if (this.state.isPlaying && !this.isUserInitiatedPause) {
        this.playSilentKeeper();
        setTimeout(() => {
          if (this.state.isPlaying && !this.isUserInitiatedPause && this.ytPlayer?.playVideo) {
            try {
              this.ytPlayer.playVideo();
            } catch {}
          }
        }, 80);
        return;
      }
      this.state.isPlaying = false;
      this.stopYouTubeProgressTimer();
      this.pauseSilentKeeper();
      this.notify();
    } else if (ytState === 3) {
      this.state.isBuffering = true;
      this.notify();
    } else if (ytState === 0) {
      this.handleTrackEnded();
      this.notify();
    }
  }

  private startYouTubeProgressTimer() {
    this.stopYouTubeProgressTimer();
    this.progressInterval = setInterval(() => {
      if (this.ytPlayer && this.activeMode === 'youtube' && this.ytPlayer.getCurrentTime) {
        try {
          const current = this.ytPlayer.getCurrentTime() || 0;
          const total = this.ytPlayer.getDuration() || this.state.duration;
          this.state.currentTime = current;
          if (total > 0) this.state.duration = total;
          this.notify();
        } catch {}
      }
    }, 500);
  }

  private stopYouTubeProgressTimer() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Play a track (handles YouTube, native audio stream, or offline cached blob)
   */
  public async playTrack(track: Track): Promise<void> {
    this.state.currentTrack = track;
    this.state.currentTime = 0;
    this.state.isBuffering = true;
    this.isUserInitiatedPause = false;
    this.playSilentKeeper();
    this.notify();

    // 1. Check if we have an offline cached audio blob in IndexedDB (full offline file)
    let offlineBlob = await idbGetAudioBlob(track.id);
    let playbackUrl = track.audioUrl;

    if (offlineBlob) {
      let objectUrl = this.offlineBlobUrlMap.get(track.id);
      if (!objectUrl) {
        objectUrl = URL.createObjectURL(offlineBlob);
        this.offlineBlobUrlMap.set(track.id, objectUrl);
      }
      playbackUrl = objectUrl;
    }

    // 2. Identify if audioUrl is just a 30s preview link or html embed
    const is30sPreview =
      !offlineBlob &&
      (!playbackUrl ||
        playbackUrl.includes('dz-preview') ||
        playbackUrl.includes('audio-preview') ||
        playbackUrl.includes('mzstatic') ||
        playbackUrl.includes('apple.com') ||
        playbackUrl.includes('deezer.com') ||
        playbackUrl.includes('open.spotify.com') ||
        playbackUrl.includes('youtube.com') ||
        track.platform === 'spotify' ||
        track.platform === 'youtube');

    // 3. If track has youtubeId already and no offline blob, ALWAYS play complete track via YouTube
    if (track.youtubeId && !offlineBlob) {
      this.activeMode = 'youtube';
      if (this.audioElement) {
        this.audioElement.pause();
      }

      await this.ensureYouTubePlayer();
      this.ytPlayer.loadVideoById(track.youtubeId);
      this.ytPlayer.setVolume(this.state.volume * 100);
      this.ytPlayer.playVideo();
      this.state.duration = track.duration || 240;
    } else if (is30sPreview && !offlineBlob) {
      // Track only has a 30s preview; resolve complete YouTube version dynamically so full song plays!
      try {
        const res = await fetch(`/api/match-audio?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
        if (res.ok) {
          const matchData = await res.json();
          if (matchData.youtubeId) {
            track.youtubeId = matchData.youtubeId;
            if (!track.duration || track.duration < 60) {
              track.duration = matchData.duration || 210;
            }
            this.activeMode = 'youtube';
            if (this.audioElement) {
              this.audioElement.pause();
            }
            await this.ensureYouTubePlayer();
            this.ytPlayer.loadVideoById(track.youtubeId);
            this.ytPlayer.setVolume(this.state.volume * 100);
            this.ytPlayer.playVideo();
            this.state.duration = track.duration;
            this.updateMediaSessionMetadata(track);
            this.updatePiPCanvas();
            this.notify();
            return;
          }
        }
      } catch (matchErr) {
        console.warn('Dynamic audio match failed, falling back to audio preview:', matchErr);
      }
    }

    // 4. Native audio playback (for uploaded MP3s, offline blobs, or direct full audio streams)
    if (this.activeMode !== 'youtube') {
      this.activeMode = 'audio';
      if (this.ytPlayer && this.ytPlayer.pauseVideo) {
        try {
          this.ytPlayer.pauseVideo();
        } catch {}
      }
      this.stopYouTubeProgressTimer();

      if (!this.audioElement) {
        this.initAudioElement();
      }

      this.initWebAudioNodes();

      if (this.audioElement) {
        const audioSrc = playbackUrl || (track.audioUrl && track.audioUrl.startsWith('http') ? track.audioUrl : '');
        const isHtmlPage = audioSrc.includes('open.spotify.com') || audioSrc.includes('youtube.com');

        if (audioSrc && !isHtmlPage) {
          this.audioElement.src = audioSrc;
          this.audioElement.volume = this.state.isMuted ? 0 : this.state.volume;
          this.audioElement.playbackRate = this.state.playbackRate;
          try {
            await this.audioElement.play();
          } catch (err) {
            console.warn('Audio play request failed, trying YouTube fallback:', err);
            if (track.youtubeId) {
              await this.switchToFullYouTubeTrack(track, 0);
            }
          }
        } else if (track.youtubeId) {
          await this.switchToFullYouTubeTrack(track, 0);
        }
      }
    }

    this.updateMediaSessionMetadata(track);
    this.updatePiPCanvas();
    this.notify();
  }

  /**
   * Seamlessly switches from a short preview audio stream to the complete YouTube track
   */
  public async switchToFullYouTubeTrack(track: Track, startSeconds: number = 0): Promise<void> {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
      }

      if (!track.youtubeId) {
        const res = await fetch(`/api/match-audio?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
        if (res.ok) {
          const matchData = await res.json();
          if (matchData.youtubeId) {
            track.youtubeId = matchData.youtubeId;
            if (!track.duration || track.duration < 60) {
              track.duration = matchData.duration || 210;
            }
          }
        }
      }

      if (track.youtubeId) {
        this.activeMode = 'youtube';
        await this.ensureYouTubePlayer();
        this.ytPlayer.loadVideoById({
          videoId: track.youtubeId,
          startSeconds: Math.max(0, startSeconds),
        });
        this.ytPlayer.setVolume(this.state.volume * 100);
        this.ytPlayer.playVideo();
        this.state.duration = track.duration || 240;
        this.state.currentTime = startSeconds;
        this.state.isPlaying = true;
        this.state.isBuffering = false;
        this.startYouTubeProgressTimer();
        this.notify();
      }
    } catch (err) {
      console.warn('Switch to full YouTube track failed:', err);
    }
  }

  public async togglePlay(): Promise<void> {
    if (!this.state.currentTrack) return;

    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public pause(): void {
    this.isUserInitiatedPause = true;
    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        this.ytPlayer.pauseVideo();
      } catch {}
    } else if (this.audioElement) {
      this.audioElement.pause();
    }
    this.pauseSilentKeeper();
    this.state.isPlaying = false;
    this.notify();
  }

  public resume(): void {
    this.isUserInitiatedPause = false;
    this.playSilentKeeper();
    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        this.ytPlayer.playVideo();
      } catch {}
    } else if (this.audioElement) {
      this.audioElement.play().catch(() => {});
    }
    this.state.isPlaying = true;
    this.notify();
  }

  public seek(seconds: number): void {
    this.state.currentTime = seconds;
    if (this.activeMode === 'youtube' && this.ytPlayer) {
      try {
        this.ytPlayer.seekTo(seconds, true);
      } catch {}
    } else if (this.audioElement) {
      this.audioElement.currentTime = seconds;
    }
    this.notify();
  }

  public skipForward(seconds: number = 10): void {
    const target = Math.min(this.state.duration || Infinity, this.state.currentTime + seconds);
    this.seek(target);
  }

  public skipBackward(seconds: number = 10): void {
    const target = Math.max(0, this.state.currentTime - seconds);
    this.seek(target);
  }

  public setPlaybackRate(rate: number): void {
    const validRate = Math.max(0.25, Math.min(3.0, rate));
    this.state.playbackRate = validRate;
    if (this.audioElement) {
      this.audioElement.playbackRate = validRate;
    }
    if (this.ytPlayer && typeof this.ytPlayer.setPlaybackRate === 'function') {
      try {
        this.ytPlayer.setPlaybackRate(validRate);
      } catch {}
    }
    this.notify();
  }

  public setVolume(val: number): void {
    const clamped = Math.max(0, Math.min(1, val));
    this.state.volume = clamped;
    this.state.isMuted = clamped === 0;

    if (this.ytPlayer && this.ytPlayer.setVolume) {
      try {
        this.ytPlayer.setVolume(clamped * 100);
      } catch {}
    }
    if (this.audioElement) {
      this.audioElement.volume = clamped;
    }
    this.notify();
  }

  public toggleMute(): void {
    this.state.isMuted = !this.state.isMuted;
    const vol = this.state.isMuted ? 0 : this.state.volume;
    if (this.ytPlayer && this.ytPlayer.setVolume) {
      try {
        this.ytPlayer.setVolume(vol * 100);
      } catch {}
    }
    if (this.audioElement) {
      this.audioElement.volume = vol;
    }
    this.notify();
  }

  public setRepeatMode(mode: 'off' | 'all' | 'one'): void {
    this.state.repeatMode = mode;
    this.notify();
  }

  public toggleShuffle(): void {
    this.state.isShuffled = !this.state.isShuffled;
    this.notify();
  }

  private handleTrackEnded(): void {
    if (this.state.repeatMode === 'one' && this.state.currentTrack) {
      this.seek(0);
      this.resume();
      return;
    }

    // Trigger next track callbacks
    this.onTrackEndCallbacks.forEach((cb) => cb());
  }

  /**
   * Sleep Timer Management
   */
  public setSleepTimer(minutes: number | null): void {
    if (this.sleepTimerTimeout) {
      clearTimeout(this.sleepTimerTimeout);
      this.sleepTimerTimeout = null;
    }

    if (minutes === null || minutes <= 0) {
      this.state.sleepTimerEndsAt = null;
      this.notify();
      return;
    }

    const durationMs = minutes * 60 * 1000;
    this.state.sleepTimerEndsAt = Date.now() + durationMs;
    this.notify();

    this.sleepTimerTimeout = setTimeout(() => {
      this.fadeVolumeAndStop();
    }, durationMs);
  }

  private fadeVolumeAndStop() {
    const startVolume = this.state.volume;
    const fadeSteps = 10;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const factor = (fadeSteps - step) / fadeSteps;
      this.setVolume(startVolume * factor);

      if (step >= fadeSteps) {
        clearInterval(interval);
        this.pause();
        this.setVolume(startVolume);
        this.state.sleepTimerEndsAt = null;
        this.notify();
      }
    }, 200);
  }

  /**
   * MediaSession API for OS lockscreen & background controls
   */
  private setupMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      this.isUserInitiatedPause = false;
      this.resume();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      this.isUserInitiatedPause = true;
      this.pause();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skip = details.seekOffset || 10;
      this.seek(Math.max(0, this.state.currentTime - skip));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skip = details.seekOffset || 10;
      this.seek(Math.min(this.state.duration, this.state.currentTime + skip));
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // Broadcast previous trigger
      window.dispatchEvent(new CustomEvent('aurawave:prev'));
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      // Broadcast next trigger
      window.dispatchEvent(new CustomEvent('aurawave:next'));
    });
  }

  private updateMediaSessionMetadata(track: Track) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      // Use clean artwork array without hardcoded type parameter to prevent WebKit MIME pattern syntax errors
      const artworkList: { src: string; sizes?: string }[] = [];
      if (track.coverUrl && typeof track.coverUrl === 'string' && track.coverUrl.startsWith('http')) {
        artworkList.push({ src: track.coverUrl, sizes: '512x512' });
        artworkList.push({ src: track.coverUrl, sizes: '256x256' });
        artworkList.push({ src: track.coverUrl, sizes: '96x96' });
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Audio Stream',
        artist: track.artist || 'AuraWave',
        album: `${track.genre || 'Music'} · ${track.mood || 'Flow'}`,
        artwork: artworkList,
      });
    } catch (err) {
      console.warn('MediaSession metadata assignment fallback:', err);
    }
  }

  private updateMediaSessionPosition() {
    if (
      typeof window === 'undefined' ||
      !('mediaSession' in navigator) ||
      !navigator.mediaSession.setPositionState ||
      !this.state.duration ||
      isNaN(this.state.duration) ||
      this.state.duration <= 0
    ) {
      return;
    }

    try {
      const duration = Math.max(0.1, Number(this.state.duration) || 1);
      const currentTime = Math.max(0, Math.min(Number(this.state.currentTime) || 0, duration));
      const playbackRate = Math.max(0.25, Math.min(2, Number(this.state.playbackRate) || 1));

      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position: currentTime,
      });
    } catch (err) {
      // Ignore position state errors on unsupported platforms
    }
  }

  /**
   * Web Audio API 5-Band Equalizer & Visualizer
   */
  private initWebAudioNodes() {
    if (this.audioContext || !this.audioElement) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      this.audioSourceNode = this.audioContext.createMediaElementSource(this.audioElement);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 128;

      // 5-band EQ filters
      const subBass = this.audioContext.createBiquadFilter();
      subBass.type = 'lowshelf';
      subBass.frequency.value = 60;

      const bass = this.audioContext.createBiquadFilter();
      bass.type = 'peaking';
      bass.frequency.value = 250;
      bass.Q.value = 1;

      const mid = this.audioContext.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;

      const upperMid = this.audioContext.createBiquadFilter();
      upperMid.type = 'peaking';
      upperMid.frequency.value = 4000;
      upperMid.Q.value = 1;

      const treble = this.audioContext.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 12000;

      // Chain: Source -> SubBass -> Bass -> Mid -> UpperMid -> Treble -> Analyser -> Destination
      this.audioSourceNode.connect(subBass);
      subBass.connect(bass);
      bass.connect(mid);
      mid.connect(upperMid);
      upperMid.connect(treble);
      treble.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      this.eqFilters = { subBass, bass, mid, upperMid, treble };
    } catch (err) {
      console.warn('Web Audio initialization note:', err);
    }
  }

  public getVisualizerData(): Uint8Array | null {
    if (!this.analyserNode) return null;
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public setEqualizerBands(bands: EqualizerBands): void {
    if (!this.eqFilters) return;
    this.eqFilters.subBass.gain.value = bands.subBass;
    this.eqFilters.bass.gain.value = bands.bass;
    this.eqFilters.mid.gain.value = bands.mid;
    this.eqFilters.upperMid.gain.value = bands.upperMid;
    this.eqFilters.treble.gain.value = bands.treble;
  }

  public applyEqualizerPreset(presetName: string): void {
    this.state.equalizerPreset = presetName;
    const presets: Record<string, EqualizerBands> = {
      Flat: { subBass: 0, bass: 0, mid: 0, upperMid: 0, treble: 0 },
      'Bass Boost': { subBass: 7, bass: 5, mid: 0, upperMid: -2, treble: -1 },
      Electronic: { subBass: 5, bass: 4, mid: -1, upperMid: 3, treble: 4 },
      Acoustic: { subBass: 2, bass: 3, mid: 2, upperMid: 3, treble: 2 },
      'Lo-Fi Vibe': { subBass: 4, bass: 3, mid: -2, upperMid: -4, treble: -6 },
      Vocal: { subBass: -3, bass: -1, mid: 4, upperMid: 4, treble: 1 },
    };

    const bands = presets[presetName] || presets.Flat;
    this.setEqualizerBands(bands);
    this.notify();
  }

  /**
   * Picture-in-Picture mode for persistent visual + background listening
   */
  public async togglePictureInPicture(): Promise<boolean> {
    if (typeof document === 'undefined') return false;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      this.state.isPictureInPicture = false;
      this.notify();
      return false;
    }

    try {
      if (!this.pipCanvas) {
        this.pipCanvas = document.createElement('canvas');
        this.pipCanvas.width = 480;
        this.pipCanvas.height = 480;
      }

      if (!this.pipVideo) {
        this.pipVideo = document.createElement('video');
        this.pipVideo.muted = true;
        this.pipVideo.autoplay = true;
        this.pipVideo.playsInline = true;
        this.pipVideo.style.position = 'fixed';
        this.pipVideo.style.bottom = '-9999px';
        document.body.appendChild(this.pipVideo);

        const stream = (this.pipCanvas as any).captureStream(30);
        this.pipVideo.srcObject = stream;
        await this.pipVideo.play();
      }

      this.startPiPCanvasLoop();
      await this.pipVideo.requestPictureInPicture();
      this.state.isPictureInPicture = true;
      this.notify();

      this.pipVideo.addEventListener(
        'leavepictureinpicture',
        () => {
          this.state.isPictureInPicture = false;
          this.stopPiPCanvasLoop();
          this.notify();
        },
        { once: true }
      );

      return true;
    } catch (err) {
      console.warn('Picture in picture error:', err);
      return false;
    }
  }

  private startPiPCanvasLoop() {
    this.stopPiPCanvasLoop();
    const render = () => {
      this.renderPiPFrame();
      this.pipAnimationId = requestAnimationFrame(render);
    };
    render();
  }

  private stopPiPCanvasLoop() {
    if (this.pipAnimationId) {
      cancelAnimationFrame(this.pipAnimationId);
      this.pipAnimationId = null;
    }
  }

  private updatePiPCanvas() {
    if (this.state.isPictureInPicture) {
      this.renderPiPFrame();
    }
  }

  private renderPiPFrame() {
    if (!this.pipCanvas) return;
    const ctx = this.pipCanvas.getContext('2d');
    if (!ctx) return;

    const w = this.pipCanvas.width;
    const h = this.pipCanvas.height;

    // Dark sleek background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const track = this.state.currentTrack;
    if (!track) return;

    // Draw visualizer frequency bars
    const freqData = this.getVisualizerData();
    if (freqData) {
      const barCount = 32;
      const barWidth = (w - 60) / barCount;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * 2] || 10;
        const barHeight = (val / 255) * 120;
        ctx.fillRect(30 + i * barWidth, h - 80 - barHeight, barWidth - 3, barHeight);
      }
    }

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const truncatedTitle = track.title.length > 30 ? track.title.slice(0, 27) + '...' : track.title;
    ctx.fillText(truncatedTitle, w / 2, 280);

    // Artist & tags
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`${track.artist} · ${track.genre}`, w / 2, 315);

    // Pill-less metadata indicator
    ctx.fillStyle = '#38bdf8';
    ctx.font = '14px monospace';
    const timeStr = `${Math.floor(this.state.currentTime / 60)}:${String(
      Math.floor(this.state.currentTime % 60)
    ).padStart(2, '0')}`;
    ctx.fillText(`AuraWave Background Audio [${timeStr}]`, w / 2, 350);
  }

  public getState(): PlayerState {
    return { ...this.state };
  }
}

export const audioManager = new AudioManager();
