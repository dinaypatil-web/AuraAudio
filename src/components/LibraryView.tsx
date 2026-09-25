import React, { useState } from 'react';
import {
  Play,
  Pause,
  Download,
  CheckCircle,
  FolderPlus,
  Sparkles,
  FolderSync,
  Upload,
  HardDriveDownload,
  Layers,
  Filter,
  Trash2,
  Headphones,
  Music,
  ExternalLink,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Track, MoodType, GenreType } from '../types/music';

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const LibraryView: React.FC = () => {
  const {
    tracks,
    playTrack,
    playerState,
    addToQueue,
    downloadTrackForOffline,
    downloadsProgress,
    removeOfflineTrack,
    setTrackToAddPlaylist,
    autoOrganizeLibrary,
    isOrganizing,
    organizeStatus,
    importLocalAudioFile,
    selectedGenreFilter,
    setSelectedGenreFilter,
    selectedMoodFilter,
    setSelectedMoodFilter,
    isOfflineModeOnly,
    searchQuery,
  } = useMusic();

  const [groupingMode, setGroupingMode] = useState<'all' | 'mood' | 'genre'>('mood');
  const [offlineFilter, setOfflineFilter] = useState<'all' | 'offline'>('all');

  // Filter tracks
  let filtered = tracks;

  if (isOfflineModeOnly || offlineFilter === 'offline') {
    filtered = filtered.filter((t) => t.isOfflineReady);
  }

  if (selectedGenreFilter) {
    filtered = filtered.filter((t) => t.genre === selectedGenreFilter);
  }

  if (selectedMoodFilter) {
    filtered = filtered.filter((t) => t.mood === selectedMoodFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.mood.toLowerCase().includes(q)
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      await importLocalAudioFile(files[i]);
    }
  };

  // Grouping sets
  const moods = Array.from(new Set(filtered.map((t) => t.mood))) as MoodType[];
  const genres = Array.from(new Set(filtered.map((t) => t.genre))) as GenreType[];

  const renderTrackRow = (track: Track, index: number, list: Track[]) => {
    const isCurrent = playerState.currentTrack?.id === track.id;
    const isPlaying = isCurrent && playerState.isPlaying;
    const isDownloading = downloadsProgress[track.id] !== undefined;
    const downloadPct = downloadsProgress[track.id] || 0;

    return (
      <div
        key={track.id}
        className={`group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-colors border ${
          isCurrent
            ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
            : 'hover:bg-slate-900/80 border-transparent hover:border-slate-800 text-slate-300'
        }`}
      >
        {/* Index / Play Button */}
        <div className="w-8 flex items-center justify-center">
          <button
            onClick={() => playTrack(track, list)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 group-hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current text-indigo-400" />
            ) : isCurrent ? (
              <Play className="w-3.5 h-3.5 fill-current text-indigo-400 ml-0.5" />
            ) : (
              <span className="group-hover:hidden font-mono text-[11px] text-slate-500">{index + 1}</span>
            )}
            <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block ml-0.5" />
          </button>
        </div>

        {/* Thumbnail & Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-slate-950"
          />
          <div className="min-w-0 flex-1">
            <h4
              onClick={() => playTrack(track, list)}
              className={`font-semibold truncate cursor-pointer hover:underline ${
                isCurrent ? 'text-indigo-300' : 'text-slate-100'
              }`}
              title={track.title}
            >
              {track.title}
            </h4>
            <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Genre & Mood metadata (clean unboxed) */}
        <div className="hidden md:flex items-center gap-2 w-56 text-slate-400 font-mono text-[11px] truncate">
          <span>{track.genre}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-indigo-400 truncate">{track.mood}</span>
        </div>

        {/* Platform tag */}
        <div className="hidden lg:block w-28 text-[11px] font-mono text-slate-400">
          <span className={track.platform === 'youtube' ? 'text-red-400' : 'text-sky-400'}>
            {track.platform === 'youtube' ? 'YouTube' : 'Web Audio'}
          </span>
        </div>

        {/* Duration */}
        <div className="w-16 text-right font-mono text-[11px] text-slate-400">
          {formatDuration(track.duration)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-4">
          <button
            onClick={() => setTrackToAddPlaylist(track)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-800 transition-colors"
            title="Add to Custom Playlist"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (track.isOfflineReady) {
                removeOfflineTrack(track.id);
              } else {
                downloadTrackForOffline(track);
              }
            }}
            disabled={isDownloading}
            className={`p-1.5 rounded transition-colors ${
              track.isOfflineReady
                ? 'text-emerald-400 hover:text-red-400'
                : isDownloading
                ? 'text-indigo-400 animate-spin'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
            }`}
            title={
              track.isOfflineReady
                ? 'Offline ready (Click to remove from cache)'
                : isDownloading
                ? `Downloading (${downloadPct}%)`
                : 'Download for Offline Playback'
            }
          >
            {track.isOfflineReady ? <CheckCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Audio Library & Smart Auto-Sort
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize background YouTube videos and audio files by genre or mood automatically.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI Auto-Organize */}
          <button
            onClick={() => autoOrganizeLibrary(true)}
            disabled={isOrganizing}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Categorize whole library with Gemini AI"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isOrganizing ? 'animate-spin' : ''}`} />
            <span>{isOrganizing ? 'AI Organizing...' : 'AI Auto-Organize'}</span>
          </button>

          {/* Quick Heuristic Sort */}
          <button
            onClick={() => autoOrganizeLibrary(false)}
            disabled={isOrganizing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <FolderSync className="w-3.5 h-3.5 text-slate-400" />
            <span>Instant Sort</span>
          </button>

          {/* Local Upload */}
          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Upload Audio</span>
            <input type="file" accept="audio/*" multiple onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Segmented Controls: Grouping Mode & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Group By selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
          <span className="text-[11px] text-slate-500 px-2 font-mono">Organize by:</span>
          <button
            onClick={() => setGroupingMode('mood')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              groupingMode === 'mood'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mood Clusters
          </button>
          <button
            onClick={() => setGroupingMode('genre')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              groupingMode === 'genre'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Genre Clusters
          </button>
          <button
            onClick={() => setGroupingMode('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              groupingMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Tracks ({filtered.length})
          </button>
        </div>

        {/* Offline Filter */}
        <div className="flex items-center gap-2">
          {selectedGenreFilter && (
            <button
              onClick={() => setSelectedGenreFilter(null)}
              className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-950/50 border border-indigo-800/40 px-2.5 py-1 rounded"
            >
              <span>Genre: {selectedGenreFilter}</span>
              <span className="text-slate-500 hover:text-white">×</span>
            </button>
          )}

          {selectedMoodFilter && (
            <button
              onClick={() => setSelectedMoodFilter(null)}
              className="flex items-center gap-1 text-xs text-purple-400 bg-purple-950/50 border border-purple-800/40 px-2.5 py-1 rounded"
            >
              <span>Mood: {selectedMoodFilter}</span>
              <span className="text-slate-500 hover:text-white">×</span>
            </button>
          )}

          <button
            onClick={() => setOfflineFilter(offlineFilter === 'all' ? 'offline' : 'all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              offlineFilter === 'offline'
                ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline Ready Only</span>
          </button>
        </div>
      </div>

      {/* Main Content Render */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <Headphones className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">No tracks found matching your filter</p>
          <p className="text-xs text-slate-500 mt-1">
            Explore YouTube videos or import audio links to start building your offline library.
          </p>
        </div>
      ) : groupingMode === 'mood' ? (
        /* Mood Clusters View */
        <div className="space-y-6">
          {moods.map((mood) => {
            const moodTracks = filtered.filter((t) => t.mood === mood);
            if (moodTracks.length === 0) return null;

            return (
              <div key={mood} className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{mood}</h3>
                    <span className="text-xs text-slate-500 font-mono">({moodTracks.length} tracks)</span>
                  </div>
                  <button
                    onClick={() => playTrack(moodTracks[0], moodTracks)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play Mood</span>
                  </button>
                </div>
                <div className="space-y-1">
                  {moodTracks.map((t, idx) => renderTrackRow(t, idx, moodTracks))}
                </div>
              </div>
            );
          })}
        </div>
      ) : groupingMode === 'genre' ? (
        /* Genre Clusters View */
        <div className="space-y-6">
          {genres.map((genre) => {
            const genreTracks = filtered.filter((t) => t.genre === genre);
            if (genreTracks.length === 0) return null;

            return (
              <div key={genre} className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{genre}</h3>
                    <span className="text-xs text-slate-500 font-mono">({genreTracks.length} tracks)</span>
                  </div>
                  <button
                    onClick={() => playTrack(genreTracks[0], genreTracks)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play Genre</span>
                  </button>
                </div>
                <div className="space-y-1">
                  {genreTracks.map((t, idx) => renderTrackRow(t, idx, genreTracks))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat List View */
        <div className="space-y-1 bg-slate-900/40 border border-slate-800/80 rounded-xl p-3">
          {filtered.map((t, idx) => renderTrackRow(t, idx, filtered))}
        </div>
      )}
    </div>
  );
};
