import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Sliders,
  Clock,
  ListMusic,
  Tv,
  Download,
  CheckCircle,
  FolderPlus,
  Radio,
  ChevronDown,
  Maximize2,
  Minimize2,
  Heart,
  RotateCcw,
  RotateCw,
  Gauge,
  HelpCircle,
  X,
  ExternalLink,
  Youtube,
  Globe,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { audioManager } from '../lib/audioManager';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const PlayerBar: React.FC = () => {
  const {
    playerState,
    togglePlay,
    seek,
    skipForward,
    skipBackward,
    setPlaybackRate,
    setVolume,
    toggleMute,
    setRepeatMode,
    toggleShuffle,
    playNext,
    smartPlayPrev,
    toggleLike,
    isTrackLiked,
    downloadTrackForOffline,
    downloadsProgress,
    setIsEqualizerOpen,
    setIsSleepTimerOpen,
    setIsQueueOpen,
    queue,
    setTrackToAddPlaylist,
  } = useMusic();

  const [visualizerBars, setVisualizerBars] = useState<number[]>([14, 28, 20, 34, 22, 16]);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [showSpotifyEmbed, setShowSpotifyEmbed] = useState(false);
  const [showTimeRemaining, setShowTimeRemaining] = useState(false);
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const speedMenuRef = useRef<HTMLDivElement | null>(null);
  const volumeContainerRef = useRef<HTMLDivElement | null>(null);

  const track = playerState.currentTrack;
  const isDownloading = track ? downloadsProgress[track.id] !== undefined : false;
  const downloadPct = track ? downloadsProgress[track.id] || 0 : 0;
  const isLiked = track ? isTrackLiked(track.id) : false;

  // Keyboard Shortcuts (Space, Arrows, M, S, R, H, L, P, F, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipBackward(e.shiftKey ? 10 : 5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipForward(e.shiftKey ? 10 : 5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(1, playerState.volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, playerState.volume - 0.05));
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 's' || e.key === 'S') {
        toggleShuffle();
      } else if (e.key === 'r' || e.key === 'R') {
        cycleRepeatMode();
      } else if (track && (e.key === 'h' || e.key === 'H')) {
        toggleLike(track);
      } else if (e.key === 'l' || e.key === 'L') {
        setIsQueueOpen(true);
      } else if (e.key === 'p' || e.key === 'P') {
        handlePiPToggle();
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullPlayerOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsFullPlayerOpen(false);
        setShowShortcutsModal(false);
      } else if (e.key === '?') {
        setShowShortcutsModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipBackward, skipForward, setVolume, toggleMute, toggleShuffle, playerState.volume, track, toggleLike, setIsQueueOpen]);

  // Click outside to close speed menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    if (showSpeedMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSpeedMenu]);

  // Mouse wheel on volume area
  useEffect(() => {
    const el = volumeContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setVolume(Math.max(0, Math.min(1, playerState.volume + delta)));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [playerState.volume, setVolume]);

  // Real-time mini visualizer loop
  useEffect(() => {
    if (!playerState.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const updateBars = () => {
      const data = audioManager.getVisualizerData();
      if (data && data.length > 0) {
        const bars = [
          Math.min(100, Math.round((data[1] / 255) * 100)),
          Math.min(100, Math.round((data[4] / 255) * 100)),
          Math.min(100, Math.round((data[8] / 255) * 100)),
          Math.min(100, Math.round((data[12] / 255) * 100)),
          Math.min(100, Math.round((data[18] / 255) * 100)),
          Math.min(100, Math.round((data[24] / 255) * 100)),
        ];
        setVisualizerBars(bars);
      } else {
        const t = Date.now() / 250;
        setVisualizerBars([
          30 + Math.sin(t * 1.2) * 25,
          50 + Math.cos(t * 1.5) * 35,
          70 + Math.sin(t * 1.8) * 25,
          45 + Math.cos(t * 1.1) * 30,
          65 + Math.sin(t * 1.4) * 30,
          35 + Math.cos(t * 1.6) * 20,
        ]);
      }
      animationFrameRef.current = requestAnimationFrame(updateBars);
    };

    updateBars();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerState.isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = ratio * (playerState.duration || 100);
    setHoverTime(time);
    setHoverPosition(ratio * 100);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const cycleRepeatMode = () => {
    if (playerState.repeatMode === 'off') setRepeatMode('all');
    else if (playerState.repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const cyclePlaybackRate = () => {
    const current = playerState.playbackRate || 1.0;
    const currentIndex = SPEED_OPTIONS.indexOf(current);
    const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % SPEED_OPTIONS.length : 2;
    setPlaybackRate(SPEED_OPTIONS[nextIndex]);
  };

  const handlePiPToggle = async () => {
    await audioManager.togglePictureInPicture();
  };

  const progressPercent =
    playerState.duration > 0
      ? Math.min(100, (playerState.currentTime / playerState.duration) * 100)
      : 0;

  const remainingSeconds = Math.max(0, (playerState.duration || 0) - playerState.currentTime);

  if (!track) {
    return (
      <div className="h-16 md:h-22 bg-[#0c0d14] border-t border-slate-800/80 px-4 md:px-6 flex items-center justify-between text-slate-500 text-xs select-none">
        <div className="flex items-center gap-2.5 md:gap-3 truncate">
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 flex-shrink-0">
            <Radio className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="truncate">Select any song from YouTube, Spotify, or audio catalog to start</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-slate-600 text-xs flex-shrink-0 font-mono">
          <span>Continuous background audio active</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* --- MOBILE COMPACT MINI-PLAYER BAR (md:hidden) --- */}
      <div className="md:hidden relative bg-[#0c0d14]/98 backdrop-blur-xl border-t border-slate-800/90 z-40 select-none">
        {/* Hairline Progress Indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="h-16 px-3 flex items-center justify-between gap-2.5">
          {/* Track Info (Tapping opens expanded full player) */}
          <div
            onClick={() => setIsFullPlayerOpen(true)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          >
            <div className="relative flex-shrink-0">
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-10 h-10 rounded-lg object-cover border border-slate-800"
              />
              {playerState.isPlaying && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-white truncate leading-tight">
                {track.title}
              </h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {track.artist} ·{' '}
                <span className={track.platform === 'spotify' ? 'text-emerald-400 font-medium' : track.platform === 'youtube' ? 'text-red-400 font-medium' : 'text-sky-400 font-medium'}>
                  {track.platform === 'spotify' ? 'Spotify' : track.platform === 'youtube' ? 'YouTube' : 'Audio'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* 1-Click Like Heart */}
            <button
              onClick={() => toggleLike(track)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isLiked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-400'
              }`}
              title={isLiked ? 'Liked (in Favorites)' : 'Like song'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* PiP Floating Background Mode (keeps playing when browser minimized like VLC) */}
            <button
              onClick={handlePiPToggle}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                playerState.isPictureInPicture
                  ? 'text-sky-300 bg-sky-950/60 border border-sky-600/40'
                  : 'text-slate-400 hover:text-sky-300'
              }`}
              title="VLC Background Floating Mode"
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Play/Pause Hero Button */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer"
              title={playerState.isPlaying ? 'Pause' : 'Play'}
            >
              {playerState.isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={playNext}
              className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* --- INDUSTRY FULL-SCREEN EXPANDED PLAYER MODAL (Desktop & Mobile) --- */}
      {isFullPlayerOpen && (
        <div className="fixed inset-0 z-50 bg-[#090a0f]/98 backdrop-blur-2xl flex flex-col p-4 sm:p-6 lg:p-8 animate-fade-in select-none overflow-y-auto">
          {/* Ambient Glowing Background Glow matching Album Colors */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[520px] sm:h-[520px] rounded-full blur-[140px] opacity-25 pointer-events-none transition-all duration-700"
            style={{
              backgroundColor:
                track.platform === 'spotify'
                  ? '#10b981'
                  : track.platform === 'youtube'
                  ? '#ef4444'
                  : '#6366f1',
            }}
          />

          {/* Top Header Bar */}
          <div className="relative z-10 flex items-center justify-between pb-4 max-w-4xl w-full mx-auto">
            <button
              onClick={() => setIsFullPlayerOpen(false)}
              className="p-2 -ml-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Close Full Player (Esc)"
            >
              <ChevronDown className="w-5 h-5" />
              <span className="hidden sm:inline">Minimize</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full text-xs font-mono font-medium text-slate-300">
              <span
                className={
                  track.platform === 'spotify'
                    ? 'text-emerald-400 font-semibold flex items-center gap-1'
                    : track.platform === 'youtube'
                    ? 'text-red-400 font-semibold flex items-center gap-1'
                    : 'text-sky-400 font-semibold flex items-center gap-1'
                }
              >
                {track.platform === 'spotify' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Spotify</span>
                  </>
                ) : track.platform === 'youtube' ? (
                  <>
                    <Youtube className="w-3.5 h-3.5 text-red-400" />
                    <span>YouTube</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Web Audio</span>
                  </>
                )}
              </span>
              <span>·</span>
              <span>{track.genre}</span>
              <span className="text-indigo-400">· {track.mood}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowShortcutsModal(true)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                title="Keyboard Shortcuts (?)"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsFullPlayerOpen(false);
                  setIsQueueOpen(true);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                title="Queue"
              >
                <ListMusic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Stage: Artwork / Visualizer / Optional Spotify Embed */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-2 max-w-xl w-full mx-auto">
            {showSpotifyEmbed && track.spotifyEmbedUrl ? (
              <div className="w-full aspect-[4/3] max-w-[400px] rounded-2xl overflow-hidden shadow-2xl border border-emerald-500/40 bg-black/90">
                <iframe
                  src={track.spotifyEmbedUrl}
                  width="100%"
                  height="100%"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-2xl"
                />
              </div>
            ) : (
              <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[340px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800/90 bg-slate-950 transition-all duration-300">
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    playerState.isPlaying ? 'scale-105' : 'scale-100'
                  }`}
                />

                {/* Live frequency visualizer floating tag */}
                {playerState.isPlaying && (
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/75 backdrop-blur-md rounded-lg flex items-end gap-1 h-5 border border-white/10">
                    {visualizerBars.map((val, i) => (
                      <div
                        key={i}
                        className="w-1 bg-indigo-400 rounded-t-sm transition-all duration-75"
                        style={{ height: `${Math.max(20, val)}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Optional Spotify Player Toggle */}
            {track.platform === 'spotify' && track.spotifyEmbedUrl && (
              <button
                onClick={() => setShowSpotifyEmbed(!showSpotifyEmbed)}
                className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1 bg-emerald-950/50 border border-emerald-700/50 rounded-full transition-colors cursor-pointer"
              >
                <span>{showSpotifyEmbed ? 'Switch to Continuous Background Stream' : 'Switch to Spotify Native Player / Embed'}</span>
              </button>
            )}
          </div>

          {/* Bottom Area: Metadata, Controls, Scrubber */}
          <div className="relative z-10 space-y-4 pt-2 max-w-xl w-full mx-auto pb-4">
            {/* Title, Artist, and Quick Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-1">{track.title}</h3>
                <p className="text-sm text-slate-400 truncate mt-0.5">{track.artist}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* 1-Click Like Heart */}
                <button
                  onClick={() => toggleLike(track)}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isLiked
                      ? 'bg-pink-950/40 border-pink-700/50 text-pink-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-pink-400'
                  }`}
                  title={isLiked ? 'Liked (in Favorites)' : 'Like song'}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>

                {/* Add to Playlist */}
                <button
                  onClick={() => setTrackToAddPlaylist(track)}
                  className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-300 rounded-xl cursor-pointer"
                  title="Add to Playlist"
                >
                  <FolderPlus className="w-5 h-5 text-indigo-400" />
                </button>

                {/* Offline Download */}
                <button
                  onClick={() => downloadTrackForOffline(track)}
                  disabled={track.isOfflineReady || isDownloading}
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 cursor-pointer"
                  title={track.isOfflineReady ? 'Offline Ready' : 'Download'}
                >
                  {track.isOfflineReady ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Download className={`w-5 h-5 ${isDownloading ? 'text-indigo-400 animate-spin' : 'text-slate-400'}`} />
                  )}
                </button>
              </div>
            </div>

            {/* Precision Scrubber Slider with Time Remaining Toggle */}
            <div className="space-y-1.5">
              <div
                onMouseEnter={() => setIsHoveringSeek(true)}
                onMouseLeave={() => setIsHoveringSeek(false)}
                onMouseMove={handleSeekMouseMove}
                className="relative flex items-center group py-2"
              >
                {/* Hover Tooltip Timestamp */}
                {isHoveringSeek && hoverTime !== null && (
                  <div
                    className="absolute -top-7 px-2 py-0.5 bg-slate-900 border border-slate-700 text-xs text-white font-mono rounded shadow-lg pointer-events-none -translate-x-1/2 z-20"
                    style={{ left: `${hoverPosition}%` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}

                <input
                  type="range"
                  min={0}
                  max={playerState.duration || 100}
                  value={playerState.currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 group-hover:h-2 transition-all focus:outline-none"
                />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-indigo-500 rounded-l pointer-events-none group-hover:h-2 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>{formatTime(playerState.currentTime)}</span>
                <button
                  onClick={() => setShowTimeRemaining(!showTimeRemaining)}
                  className="hover:text-white cursor-pointer"
                  title="Click to toggle Total / Remaining time"
                >
                  {showTimeRemaining ? `-${formatTime(remainingSeconds)}` : formatTime(playerState.duration)}
                </button>
              </div>
            </div>

            {/* Big Industry Player Controls */}
            <div className="flex items-center justify-between py-2">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-colors relative cursor-pointer ${
                  playerState.isShuffled ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
                {playerState.isShuffled && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                )}
              </button>

              {/* Smart Previous: Restarts song if > 3s, else previous track */}
              <button
                onClick={smartPlayPrev}
                className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Previous (Restart if > 3s)"
              >
                <SkipBack className="w-6 h-6" />
              </button>

              {/* Rewind 10s */}
              <button
                onClick={() => skipBackward(10)}
                className="p-2 text-slate-400 hover:text-white transition-colors flex items-center justify-center relative cursor-pointer"
                title="Rewind 10s"
              >
                <RotateCcw className="w-6 h-6" />
                <span className="absolute text-[8px] font-bold font-mono">10</span>
              </button>

              {/* Giant Play/Pause Hero Button (64px) */}
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-xl shadow-white/20 active:scale-95 transition-all cursor-pointer ring-4 ring-white/10"
                title={playerState.isPlaying ? 'Pause' : 'Play'}
              >
                {playerState.isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </button>

              {/* Forward 10s */}
              <button
                onClick={() => skipForward(10)}
                className="p-2 text-slate-400 hover:text-white transition-colors flex items-center justify-center relative cursor-pointer"
                title="Forward 10s"
              >
                <RotateCw className="w-6 h-6" />
                <span className="absolute text-[8px] font-bold font-mono">10</span>
              </button>

              {/* Next Track */}
              <button
                onClick={playNext}
                className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-6 h-6" />
              </button>

              {/* Repeat Mode (Off, All, One) */}
              <button
                onClick={cycleRepeatMode}
                className={`p-2 transition-colors relative cursor-pointer ${
                  playerState.repeatMode !== 'off' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={`Repeat: ${playerState.repeatMode}`}
              >
                {playerState.repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
                {playerState.repeatMode !== 'off' && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                )}
              </button>
            </div>

            {/* Secondary Tools: Speed, Sleep timer, EQ, PiP */}
            <div className="flex items-center justify-around pt-3 border-t border-slate-800/80">
              <button
                onClick={cyclePlaybackRate}
                className="flex items-center gap-1 text-xs text-slate-300 py-1.5 px-3 bg-slate-900 rounded-lg border border-slate-800 font-mono cursor-pointer"
                title="Playback Speed"
              >
                <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                <span>{playerState.playbackRate || 1.0}x</span>
              </button>

              <button
                onClick={() => {
                  setIsFullPlayerOpen(false);
                  setIsSleepTimerOpen(true);
                }}
                className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border cursor-pointer ${
                  playerState.sleepTimerEndsAt
                    ? 'text-amber-300 bg-amber-950/60 border-amber-600/50'
                    : 'text-slate-400 hover:text-white bg-slate-900 border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Sleep</span>
              </button>

              <button
                onClick={() => {
                  setIsFullPlayerOpen(false);
                  setIsEqualizerOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white py-1.5 px-3 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>EQ</span>
              </button>

              <button
                onClick={handlePiPToggle}
                className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border cursor-pointer ${
                  playerState.isPictureInPicture
                    ? 'text-sky-300 bg-sky-950/60 border-sky-600/50'
                    : 'text-slate-400 hover:text-white bg-slate-900 border-slate-800'
                }`}
                title="VLC Background Floating Mode"
              >
                <Tv className="w-3.5 h-3.5 text-sky-400" />
                <span>PiP Floating</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- KEYBOARD SHORTCUTS MODAL --- */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f111a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <span>Keyboard Shortcuts</span>
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Play / Pause</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">Space</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Seek -5s / +5s</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">Left / Right</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Seek -10s / +10s</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">Shift + Left / Right</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Volume Up / Down</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">Up / Down</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Mute / Unmute</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">M</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Toggle Shuffle</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">S</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Cycle Repeat Mode</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">R</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Like / Star Track</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">H</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Toggle Full Player</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">F</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">PiP Floating Mode</span>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded">P</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DESKTOP BOTTOM PLAYER BAR (hidden md:flex) --- */}
      <div className="hidden md:flex h-22 bg-[#0c0d14]/95 backdrop-blur-lg border-t border-slate-800/80 px-4 lg:px-6 items-center justify-between gap-4 z-40 select-none">
        {/* Left Section: Track Info & Quick Actions */}
        <div className="flex items-center gap-3 w-1/4 min-w-[220px]">
          <div
            onClick={() => setIsFullPlayerOpen(true)}
            className="relative group cursor-pointer"
            title="Expand Full Player (F)"
          >
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-13 h-13 rounded-lg object-cover border border-slate-700/60 shadow-md flex-shrink-0 group-hover:opacity-80 transition-opacity"
            />
            {playerState.isPlaying && (
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              onClick={() => setIsFullPlayerOpen(true)}
              className="text-xs font-semibold text-white truncate hover:underline cursor-pointer"
              title={track.title}
            >
              {track.title}
            </h4>
            <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono">
              <span
                className={
                  track.platform === 'spotify'
                    ? 'text-emerald-400 font-semibold'
                    : track.platform === 'youtube'
                    ? 'text-red-400 font-semibold'
                    : 'text-sky-400'
                }
              >
                {track.platform === 'spotify' ? 'Spotify' : track.platform === 'youtube' ? 'YouTube' : 'Web Audio'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{track.genre}</span>
              <span aria-hidden="true">·</span>
              <span className="text-indigo-400">{track.mood}</span>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1">
            {/* Heart Like */}
            <button
              onClick={() => toggleLike(track)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isLiked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-400 hover:bg-slate-800'
              }`}
              title={isLiked ? 'Liked (in Favorites)' : 'Like song'}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Add to Playlist */}
            <button
              onClick={() => setTrackToAddPlaylist(track)}
              className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded hover:bg-slate-800 cursor-pointer"
              title="Add to Custom Playlist"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

            {/* Offline Download */}
            <button
              onClick={() => downloadTrackForOffline(track)}
              disabled={track.isOfflineReady || isDownloading}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                track.isOfflineReady
                  ? 'text-emerald-400'
                  : isDownloading
                  ? 'text-indigo-400 animate-spin'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              }`}
              title={
                track.isOfflineReady
                  ? 'Downloaded for Offline Playback'
                  : isDownloading
                  ? `Downloading (${downloadPct}%)`
                  : 'Download for Offline Playback'
              }
            >
              {track.isOfflineReady ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Center Section: Industry Player Controls & Scrub Bar with Hover Tooltip */}
        <div className="flex-1 max-w-xl flex flex-col items-center justify-center gap-1.5">
          <div className="flex items-center gap-3">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer relative ${
                playerState.isShuffled ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
              {playerState.isShuffled && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
              )}
            </button>

            {/* Smart Previous (restarts if > 3s) */}
            <button
              onClick={smartPlayPrev}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Previous (Restart if > 3s)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* 10s Rewind */}
            <button
              onClick={() => skipBackward(10)}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer relative flex items-center justify-center"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="absolute text-[7px] font-bold font-mono">10</span>
            </button>

            {/* Hero Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white hover:bg-indigo-50 text-slate-950 flex items-center justify-center transition-all shadow-md shadow-white/10 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-white/10"
              title={playerState.isPlaying ? 'Pause' : 'Play in Background'}
            >
              {playerState.isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* 10s Forward */}
            <button
              onClick={() => skipForward(10)}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer relative flex items-center justify-center"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
              <span className="absolute text-[7px] font-bold font-mono">10</span>
            </button>

            {/* Next Track */}
            <button
              onClick={playNext}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Repeat Mode */}
            <button
              onClick={cycleRepeatMode}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer relative ${
                playerState.repeatMode !== 'off' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title={`Repeat: ${playerState.repeatMode}`}
            >
              {playerState.repeatMode === 'one' ? (
                <Repeat1 className="w-3.5 h-3.5" />
              ) : (
                <Repeat className="w-3.5 h-3.5" />
              )}
              {playerState.repeatMode !== 'off' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
              )}
            </button>
          </div>

          {/* Interactive Scrub Bar with Hover Tooltip */}
          <div className="w-full flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="w-10 text-right">{formatTime(playerState.currentTime)}</span>

            <div
              onMouseEnter={() => setIsHoveringSeek(true)}
              onMouseLeave={() => setIsHoveringSeek(false)}
              onMouseMove={handleSeekMouseMove}
              className="flex-1 relative flex items-center group py-2"
            >
              {/* Hover Tooltip Timestamp */}
              {isHoveringSeek && hoverTime !== null && (
                <div
                  className="absolute -top-6 px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-[10px] text-white font-mono rounded shadow pointer-events-none -translate-x-1/2 z-20"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}

              <input
                type="range"
                min={0}
                max={playerState.duration || 100}
                value={playerState.currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 group-hover:h-1.5 transition-all focus:outline-none"
              />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-l pointer-events-none group-hover:h-1.5 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <button
              onClick={() => setShowTimeRemaining(!showTimeRemaining)}
              className="w-12 text-left hover:text-white cursor-pointer"
              title="Click to toggle Total / Remaining time"
            >
              {showTimeRemaining ? `-${formatTime(remainingSeconds)}` : formatTime(playerState.duration)}
            </button>
          </div>
        </div>

        {/* Right Section: Speed, Visualizer, PiP, Equalizer, Sleep, Volume, Queue */}
        <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[220px]">
          {/* Playback Speed Dropdown */}
          <div className="relative" ref={speedMenuRef}>
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-2 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white rounded transition-colors cursor-pointer flex items-center gap-1"
              title="Playback Speed"
            >
              <span>{playerState.playbackRate || 1.0}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-9 right-0 bg-[#0d0f17] border border-slate-700/80 rounded-lg shadow-xl p-1 w-24 z-50">
                <div className="text-[10px] uppercase font-mono text-slate-500 px-2 py-1">Speed</div>
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs rounded transition-colors font-mono cursor-pointer ${
                      playerState.playbackRate === rate
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {rate}x {rate === 1.0 ? '(Normal)' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visualizer bars */}
          <div className="hidden xl:flex items-end gap-0.5 h-5 px-1.5 py-0.5 bg-slate-900/60 rounded border border-slate-800">
            {visualizerBars.map((val, i) => (
              <div
                key={i}
                className="w-1 bg-indigo-500 rounded-t-sm transition-all duration-75"
                style={{ height: `${Math.max(15, val)}%` }}
              />
            ))}
          </div>

          {/* VLC PiP Floating Mode */}
          <button
            onClick={handlePiPToggle}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              playerState.isPictureInPicture
                ? 'text-sky-300 bg-sky-950/60 border border-sky-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="VLC Background Floating PiP Mode"
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Equalizer */}
          <button
            onClick={() => setIsEqualizerOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title={`Equalizer (${playerState.equalizerPreset})`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setIsSleepTimerOpen(true)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              playerState.sleepTimerEndsAt
                ? 'text-amber-300 bg-amber-950/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Sleep Timer"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Volume with Tooltip & Wheel Support */}
          <div
            ref={volumeContainerRef}
            onMouseEnter={() => setIsVolumeHovered(true)}
            onMouseLeave={() => setIsVolumeHovered(false)}
            className="relative flex items-center gap-1.5"
            title="Volume (Scroll wheel supported)"
          >
            {isVolumeHovered && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-[10px] text-white font-mono rounded shadow pointer-events-none z-20">
                {Math.round((playerState.isMuted ? 0 : playerState.volume) * 100)}%
              </div>
            )}
            <button
              onClick={toggleMute}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={playerState.isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {playerState.isMuted || playerState.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : playerState.volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={playerState.isMuted ? 0 : playerState.volume}
              onChange={handleVolume}
              className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
            />
          </div>

          {/* Queue Drawer */}
          <button
            onClick={() => setIsQueueOpen(true)}
            className="relative p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Playback Queue (L)"
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-mono flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>

          {/* Expand Full Player (Both Desktop & Mobile) */}
          <button
            onClick={() => setIsFullPlayerOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Full Player (F)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
