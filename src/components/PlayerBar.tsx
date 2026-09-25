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
  Radio,
  ChevronDown,
  Maximize2,
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
    setTrackToAddPlaylist,
  } = useMusic();

  const [visualizerBars, setVisualizerBars] = useState<number[]>([12, 24, 18, 30, 20, 14]);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
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
      <div className="h-16 md:h-20 bg-[#0c0d14] border-t border-slate-800/80 px-4 md:px-6 flex items-center justify-between text-slate-500 text-xs select-none">
        <div className="flex items-center gap-2.5 md:gap-3 truncate">
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 flex-shrink-0">
            <Radio className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="truncate">Select any YouTube video or audio to start listening</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-slate-600 text-xs flex-shrink-0">
          <span>Ready for background audio</span>
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
          {/* Track Info (Tapping opens expanded player) */}
          <div
            onClick={() => setIsMobileExpanded(true)}
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
                {track.artist} · <span className="text-indigo-400">{track.genre}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Add to Playlist */}
            <button
              onClick={() => setTrackToAddPlaylist(track)}
              className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Add to Playlist"
            >
              <FolderPlus className="w-4 h-4" />
            </button>

            {/* Play/Pause Button */}
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

      {/* --- MOBILE FULL-SCREEN EXPANDED PLAYER SHEET (md:hidden) --- */}
      {isMobileExpanded && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#090a0f] flex flex-col p-6 animate-fade-in select-none">
          {/* Top Sheet Header */}
          <div className="flex items-center justify-between pb-4">
            <button
              onClick={() => setIsMobileExpanded(false)}
              className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <span className="text-xs uppercase font-mono tracking-widest text-slate-400">
              Now Playing
            </span>

            <button
              onClick={() => {
                setIsMobileExpanded(false);
                setIsQueueOpen(true);
              }}
              className="p-2 -mr-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>

          {/* Large Cover Art */}
          <div className="flex-1 flex items-center justify-center py-4">
            <div className="relative aspect-square w-full max-w-[280px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Track Details & Actions */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white line-clamp-1">{track.title}</h3>
                <p className="text-xs text-slate-400 truncate mt-0.5">{track.artist}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-1">
                  <span>{track.genre}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-indigo-400">{track.mood}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTrackToAddPlaylist(track)}
                  className="p-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl"
                  title="Add to Playlist"
                >
                  <FolderPlus className="w-4 h-4 text-indigo-400" />
                </button>
                <button
                  onClick={() => downloadTrackForOffline(track)}
                  disabled={track.isOfflineReady || isDownloading}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300"
                >
                  {track.isOfflineReady ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Download className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Seek Slider */}
            <div className="space-y-1">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={playerState.duration || 100}
                  value={playerState.currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{formatTime(playerState.currentTime)}</span>
                <span>{formatTime(playerState.duration)}</span>
              </div>
            </div>

            {/* Big Controls */}
            <div className="flex items-center justify-between py-2">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-colors ${
                  playerState.isShuffled ? 'text-indigo-400' : 'text-slate-500'
                }`}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={playPrev}
                className="p-2 text-slate-300 hover:text-white transition-colors"
              >
                <SkipBack className="w-6 h-6" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-xl shadow-white/10 active:scale-95 transition-all"
              >
                {playerState.isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </button>

              <button
                onClick={playNext}
                className="p-2 text-slate-300 hover:text-white transition-colors"
              >
                <SkipForward className="w-6 h-6" />
              </button>

              <button
                onClick={cycleRepeatMode}
                className={`p-2 transition-colors ${
                  playerState.repeatMode !== 'off' ? 'text-indigo-400' : 'text-slate-500'
                }`}
              >
                {playerState.repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Secondary Tools: Sleep timer & EQ */}
            <div className="flex items-center justify-around pt-3 border-t border-slate-800/80">
              <button
                onClick={() => {
                  setIsMobileExpanded(false);
                  setIsSleepTimerOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white py-1 px-3 bg-slate-900 rounded-lg border border-slate-800"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Sleep Timer</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileExpanded(false);
                  setIsEqualizerOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white py-1 px-3 bg-slate-900 rounded-lg border border-slate-800"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Equalizer</span>
              </button>

              <button
                onClick={handlePiPToggle}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white py-1 px-3 bg-slate-900 rounded-lg border border-slate-800"
              >
                <Tv className="w-3.5 h-3.5 text-sky-400" />
                <span>PiP Mirror</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DESKTOP BOTTOM PLAYER BAR (hidden md:flex) --- */}
      <div className="hidden md:flex h-22 bg-[#0c0d14]/95 backdrop-blur-lg border-t border-slate-800/80 px-4 lg:px-6 items-center justify-between gap-4 z-40 select-none">
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

          {/* Action icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTrackToAddPlaylist(track)}
              className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded hover:bg-slate-800 cursor-pointer"
              title="Add to Custom Playlist"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

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

        {/* Center Section: Controls & Progress Bar */}
        <div className="flex-1 max-w-xl flex flex-col items-center justify-center gap-1.5">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                playerState.isShuffled ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={playPrev}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Previous"
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
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={cycleRepeatMode}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
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
          <div className="hidden xl:flex items-end gap-0.5 h-5 px-2 py-0.5 bg-slate-900/60 rounded border border-slate-800">
            {visualizerBars.map((val, i) => (
              <div
                key={i}
                className="w-1 bg-indigo-500 rounded-t-sm transition-all duration-75"
                style={{ height: `${Math.max(15, val)}%` }}
              />
            ))}
          </div>

          <button
            onClick={handlePiPToggle}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              playerState.isPictureInPicture
                ? 'text-indigo-300 bg-indigo-950/60 border border-indigo-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Picture-in-Picture Mini-Player"
          >
            <Tv className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsEqualizerOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title={`Equalizer (${playerState.equalizerPreset})`}
          >
            <Sliders className="w-4 h-4" />
          </button>

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

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
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

          <button
            onClick={() => setIsQueueOpen(true)}
            className="relative p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
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
    </>
  );
};
