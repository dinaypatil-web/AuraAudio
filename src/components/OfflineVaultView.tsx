import React from 'react';
import {
  HardDriveDownload,
  Play,
  Pause,
  Trash2,
  FolderPlus,
  WifiOff,
  Music,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Track } from '../types/music';
import { idbGetAudioBlob } from '../lib/idb';

export const OfflineVaultView: React.FC = () => {
  const {
    tracks,
    playTrack,
    playerState,
    removeOfflineTrack,
    setTrackToAddPlaylist,
    isOfflineModeOnly,
    setIsOfflineModeOnly,
    setActiveView,
    exploreChannel,
  } = useMusic();

  const offlineTracks = tracks.filter((t) => t.isOfflineReady);

  const handleExportTrack = async (track: Track) => {
    const blob = await idbGetAudioBlob(track.id);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.artist} - ${track.title}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-teal-950/30 border border-emerald-800/40 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-700/40 px-2.5 py-1 rounded-md">
            <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400" />
            <span>IndexedDB Persistent Storage</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
            Offline Vault & Local Audio Cache
          </h2>
          <p className="text-xs lg:text-sm text-slate-300 max-w-xl">
            These tracks and audio buffers are stored directly in your browser's IndexedDB storage.
            They play seamlessly without internet or data connection.
          </p>
        </div>

        {/* Offline Mode Switch */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOfflineModeOnly(!isOfflineModeOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isOfflineModeOnly
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <WifiOff className="w-4 h-4" />
            <span>{isOfflineModeOnly ? 'Offline Mode Active' : 'Test Pure Offline Mode'}</span>
          </button>
        </div>
      </div>

      {/* Tracks list */}
      {offlineTracks.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 space-y-3">
          <HardDriveDownload className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No tracks in Offline Vault yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click the download button on any YouTube track, web audio stream, or upload local MP3s to cache them for offline playback.
          </p>
          <button
            onClick={() => setActiveView('explore')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Explore Tracks to Download
          </button>
        </div>
      ) : (
        <div className="space-y-1 bg-slate-900/40 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 font-mono border-b border-slate-800/60 mb-1">
            <span>{offlineTracks.length} tracks cached on-device</span>
            <span>Zero Data Playback Ready</span>
          </div>

          {offlineTracks.map((track, idx) => {
            const isCurrent = playerState.currentTrack?.id === track.id;
            const isPlaying = isCurrent && playerState.isPlaying;

            return (
              <div
                key={`${track.id}-${idx}`}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-colors border ${
                  isCurrent
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-white'
                    : 'hover:bg-slate-900/80 border-transparent hover:border-slate-800 text-slate-300'
                }`}
              >
                <div className="w-8 flex items-center justify-center">
                  <button
                    onClick={() => playTrack(track, offlineTracks)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 group-hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current text-emerald-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current text-emerald-400 ml-0.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-slate-950"
                  />
                  <div className="min-w-0 flex-1">
                    <h4
                      onClick={() => playTrack(track, offlineTracks)}
                      className={`font-semibold truncate cursor-pointer hover:underline ${
                        isCurrent ? 'text-emerald-300' : 'text-slate-100'
                      }`}
                    >
                      {track.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exploreChannel(track.channelTitle || track.artist, track.channelId, track);
                      }}
                      className="text-[11px] text-slate-400 hover:text-emerald-300 hover:underline truncate cursor-pointer text-left inline-flex items-center gap-1 transition-colors"
                      title={`Explore Channel: ${track.channelTitle || track.artist}`}
                    >
                      <span>{track.channelTitle || track.artist}</span>
                      <span className="text-[10px] text-slate-500 font-mono">↗</span>
                    </button>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 w-48 text-slate-400 font-mono text-[11px]">
                  <span>{track.genre}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">{track.mood}</span>
                </div>

                <div className="w-20 text-right font-mono text-[11px] text-slate-400">
                  {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                </div>

                <div className="flex items-center gap-1.5 ml-4">
                  <button
                    onClick={() => handleExportTrack(track)}
                    className="p-1.5 text-slate-400 hover:text-emerald-300 rounded hover:bg-slate-800 transition-colors"
                    title="Export / Save Audio to Computer"
                  >
                    <HardDriveDownload className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setTrackToAddPlaylist(track)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-800 transition-colors"
                    title="Add to Custom Playlist"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => removeOfflineTrack(track.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                    title="Delete from Offline Cache"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
