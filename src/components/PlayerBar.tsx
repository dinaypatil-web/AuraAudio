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
  VolumeX,
  Sliders,
  Clock,
  ListMusic,
  Tv,
  Download,
  CheckCircle,
  FolderPlus,
  Heart,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { audioManager } from '../lib/audioManager';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlayerBar: React.FC = () => {
  const {
    playerState,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setRepeatMode,
    toggleShuffle,
    playNext,
    playPrev,
    downloadTrackForOffline,
    downloadsProgress,
    setIsEqualizerOpen,
    setIsSleepTimerOpen,
    setIsQueueOpen,
    queue,
    queueIndex,
    setTrackToAddPlaylist,
  } = useMusic();

  const [visualizerBars, setVisualizerBars] = useState<number[]>([12, 24, 18, 30, 20, 14]);
  const animationFrameRef = useRef<number | null>(null);

  const track = playerState.currentTrack;
  const isDownloading = track ? downloadsProgress[track.id] !== undefined : false;
  const downloadPct = track ? downloadsProgress[track.id] || 0 : 0;

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
        // Fallback rhythmic pulsing animation when playing YouTube iframe
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

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const cycleRepeatMode = () => {
    if (playerState.repeatMode === 'off') setRepeatMode('all');
    else if (playerState.repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const handlePiPToggle = async () => {
    await audioManager.togglePictureInPicture();
  };

  const progressPercent =
    playerState.duration > 0
      ? Math.min(100, (playerState.currentTime / playerState.duration) * 100)
      : 0;

  if (!track) {
    return (
      <div className="h-20 bg-[#0c0d14] border-t border-slate-800/80 px-6 flex items-center justify-between text-slate-500 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
            <Radio className="w-5 h-5" />
          </div>
          <span>Select any YouTube video or audio stream to start background playback</span>
        </div>
        <div className="flex items-center gap-4 text-slate-600 text-xs">
          <span>Ready for background audio</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-22 bg-[#0c0d14]/95 backdrop-blur-lg border-t border-slate-800/80 px-4 lg:px-6 flex items-center justify-between gap-4 z-40 select-none">
      {/* Left Section: Track Info & Quick Actions */}
      <div className="flex items-center gap-3 w-1/4 min-w-[220px]">
        <div className="relative group">
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-13 h-13 rounded-lg object-cover border border-slate-700/60 shadow-md flex-shrink-0"
          />
          {playerState.isPlaying && (
            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-white truncate hover:underline cursor-pointer" title={track.title}>
            {track.title}
          </h4>
          <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>

          {/* Clean unboxed metadata with typographic separators (Anti-Slop) */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono">
            <span className={track.platform === 'youtube' ? 'text-red-400' : 'text-sky-400'}>
              {track.platform === 'youtube' ? 'YouTube' : 'Web Audio'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{track.genre}</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-400">{track.mood}</span>
          </div>
        </div>

        {/* Action icons: Save offline & Add to playlist */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTrackToAddPlaylist(track)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded hover:bg-slate-800"
            title="Add to Custom Playlist"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => downloadTrackForOffline(track)}
            disabled={track.isOfflineReady || isDownloading}
            className={`p-1.5 rounded transition-colors ${
              track.isOfflineReady
                ? 'text-emerald-400'
                : isDownloading
                ? 'text-indigo-400 animate-spin'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
            }`}
            title={
              track.isOfflineReady
                ? 'Downloaded & Cached for Offline Playback'
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

      {/* Center Section: Controls & Progress Bar */}
      <div className="flex-1 max-w-xl flex flex-col items-center justify-center gap-1.5">
        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`p-1.5 rounded text-xs transition-colors ${
              playerState.isShuffled ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={playPrev}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Previous (or restart)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white hover:bg-indigo-50 text-slate-950 flex items-center justify-center transition-all shadow-md shadow-white/10 hover:scale-105 active:scale-95 cursor-pointer"
            title={playerState.isPlaying ? 'Pause' : 'Play in Background'}
          >
            {playerState.isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={playNext}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={cycleRepeatMode}
            className={`p-1.5 rounded text-xs transition-colors ${
              playerState.repeatMode !== 'off' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title={`Repeat: ${playerState.repeatMode}`}
          >
            {playerState.repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="w-full flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="w-10 text-right">{formatTime(playerState.currentTime)}</span>

          <div className="flex-1 relative flex items-center group">
            <input
              type="range"
              min={0}
              max={playerState.duration || 100}
              value={playerState.currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none"
            />
            {/* Custom progress highlight */}
            <div
              className="absolute left-0 top-0 h-1 bg-indigo-500 rounded-l pointer-events-none group-hover:bg-indigo-400 transition-colors"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="w-10">{formatTime(playerState.duration)}</span>
        </div>
      </div>

      {/* Right Section: Mini Visualizer, PiP, Equalizer, Sleep, Volume, Queue */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[220px]">
        {/* Mini Frequency Visualizer */}
        <div className="hidden xl:flex items-end gap-0.5 h-5 px-2 py-0.5 bg-slate-900/60 rounded border border-slate-800">
          {visualizerBars.map((val, i) => (
            <div
              key={i}
              className="w-1 bg-indigo-500 rounded-t-sm transition-all duration-75"
              style={{ height: `${Math.max(15, val)}%` }}
            />
          ))}
        </div>

        {/* Picture-in-Picture mode */}
        <button
          onClick={handlePiPToggle}
          className={`p-1.5 rounded transition-colors ${
            playerState.isPictureInPicture
              ? 'text-indigo-300 bg-indigo-950/60 border border-indigo-700/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Picture-in-Picture Mini-Player (Keep visible in background)"
        >
          <Tv className="w-4 h-4" />
        </button>

        {/* Equalizer trigger */}
        <button
          onClick={() => setIsEqualizerOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title={`Equalizer (${playerState.equalizerPreset})`}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Sleep Timer */}
        <button
          onClick={() => setIsSleepTimerOpen(true)}
          className={`p-1.5 rounded transition-colors ${
            playerState.sleepTimerEndsAt
              ? 'text-amber-300 bg-amber-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Sleep Timer"
        >
          <Clock className="w-4 h-4" />
        </button>

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title={playerState.isMuted ? 'Unmute' : 'Mute'}
          >
            {playerState.isMuted || playerState.volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
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

        {/* Queue Drawer Button */}
        <button
          onClick={() => setIsQueueOpen(true)}
          className="relative p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Playback Queue"
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-mono flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
