import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  FolderPlus,
  Download,
  CheckCircle,
  ArrowLeft,
  Search,
  Check,
  Radio,
  Sparkles,
  Eye,
  Calendar,
  HardDrive,
  Clock,
  Music2,
  ExternalLink,
  Youtube,
  Globe,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Track } from '../types/music';
import { SortBar } from './SortBar';
import { SortField, SortDirection, sortTracks, formatViews, formatFileSize, formatDate, formatDuration } from '../lib/trackUtils';

export const ChannelView: React.FC = () => {
  const {
    activeChannel,
    setActiveView,
    playTrack,
    playerState,
    setTrackToAddPlaylist,
    downloadTrackForOffline,
    downloadsProgress,
    removeOfflineTrack,
    toggleLike,
    isTrackLiked,
    exploreChannel,
  } = useMusic();

  const [sortField, setSortField] = useState<SortField>('views');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchInChannel, setSearchInChannel] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);

  // Compute sorted & filtered tracks
  const processedTracks = useMemo(() => {
    if (!activeChannel?.tracks) return [];

    let list = [...activeChannel.tracks];

    // Filter by in-channel search
    if (searchInChannel.trim()) {
      const q = searchInChannel.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q) ||
          (t.mood && t.mood.toLowerCase().includes(q))
      );
    }

    // Filter by genre
    if (selectedGenre) {
      list = list.filter((t) => t.genre === selectedGenre);
    }

    // Sort
    return sortTracks(list, sortField, sortDirection);
  }, [activeChannel?.tracks, searchInChannel, selectedGenre, sortField, sortDirection]);

  if (!activeChannel) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-400 text-sm">No channel selected.</p>
        <button
          onClick={() => setActiveView('explore')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (processedTracks.length > 0) {
      playTrack(processedTracks[0], processedTracks);
    }
  };

  const handleShufflePlay = () => {
    if (processedTracks.length > 0) {
      const shuffled = [...processedTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div className="min-h-full pb-28 space-y-6">
      {/* Top Header Banner & Creator Profile */}
      <div className="relative bg-[#0d0f18] border-b border-slate-800/80 overflow-hidden">
        {/* Ambient Gradient Backdrop */}
        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-red-600 via-indigo-600 to-purple-800 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveView('explore')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Explore</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-red-950/60 border border-red-800/50 text-red-400 rounded-full text-[11px] font-mono font-medium flex items-center gap-1">
                <Youtube className="w-3.5 h-3.5" />
                <span>Verified Channel</span>
              </span>
            </div>
          </div>

          {/* Profile Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 pt-2">
            <div className="relative group flex-shrink-0">
              <img
                src={
                  activeChannel.avatarUrl ||
                  activeChannel.tracks[0]?.coverUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                }
                alt={activeChannel.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-700/80 shadow-2xl bg-slate-950"
              />
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg border-2 border-[#0d0f18]">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {activeChannel.name}
                </h1>
                <span className="inline-flex items-center justify-center px-2 py-0.5 bg-indigo-950/60 border border-indigo-700/40 text-indigo-300 text-[11px] font-mono rounded self-center sm:self-auto">
                  Channel Creator
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 font-mono">
                <span>{activeChannel.subscribers || '1.2M subscribers'}</span>
                <span>•</span>
                <span>{activeChannel.trackCount || activeChannel.tracks.length} tracks loaded</span>
                {activeChannel.genres && activeChannel.genres.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-400">{activeChannel.genres.slice(0, 3).join(', ')}</span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                <button
                  onClick={handlePlayAll}
                  disabled={processedTracks.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current text-slate-950" />
                  <span>Play Channel</span>
                </button>

                <button
                  onClick={handleShufflePlay}
                  disabled={processedTracks.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Shuffle className="w-4 h-4 text-indigo-400" />
                  <span>Shuffle</span>
                </button>

                <button
                  onClick={() => setIsFollowed(!isFollowed)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isFollowed
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {isFollowed ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Subscribed</span>
                    </>
                  ) : (
                    <span>Subscribe</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Track Section with Comprehensive Sorting & Filtering */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Search inside Channel & Genre quick pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchInChannel}
              onChange={(e) => setSearchInChannel(e.target.value)}
              placeholder={`Search in ${activeChannel.name}...`}
              className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searchInChannel && (
              <button
                onClick={() => setSearchInChannel('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {activeChannel.genres && activeChannel.genres.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex-shrink-0 ${
                  selectedGenre === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Genres
              </button>
              {activeChannel.genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex-shrink-0 ${
                    selectedGenre === g
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dedicated Sorting Control Bar */}
        <SortBar
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={(field, direction) => {
            setSortField(field);
            setSortDirection(direction);
          }}
          totalTracks={processedTracks.length}
        />

        {activeChannel.loading && processedTracks.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs text-indigo-300 font-mono animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Loading complete YouTube & audio catalog from {activeChannel.name}...</span>
          </div>
        )}

        {/* Tracks List */}
        {activeChannel.loading && processedTracks.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Loading tracks from {activeChannel.name}...</p>
          </div>
        ) : processedTracks.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-2">
            <Music2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-medium">No tracks matched your criteria</p>
            <p className="text-xs text-slate-500">Try changing the sort or clearing the search query.</p>
          </div>
        ) : (
          <div className="space-y-1.5 bg-[#0f111a]/80 border border-slate-800/80 rounded-2xl p-2.5 sm:p-3">
            {/* Table Header (Desktop) */}
            <div className="hidden md:flex items-center justify-between px-3.5 py-2 text-[11px] font-mono font-medium text-slate-500 border-b border-slate-800/60 select-none">
              <div className="w-8 text-center">#</div>
              <div className="flex-1 min-w-0 pr-4">TITLE</div>
              <div className="w-28">GENRE</div>
              <div className="w-24 text-right">VIEWS</div>
              <div className="w-20 text-right">SIZE</div>
              <div className="w-24 text-right">DATE</div>
              <div className="w-16 text-right">DURATION</div>
              <div className="w-20 text-right pr-2">ACTIONS</div>
            </div>

            {/* Track Rows */}
            {processedTracks.map((track, idx) => {
              const isCurrent = playerState.currentTrack?.id === track.id;
              const isPlaying = isCurrent && playerState.isPlaying;
              const isLiked = isTrackLiked(track.id);
              const isDownloading = downloadsProgress[track.id] !== undefined;

              return (
                <div
                  key={track.id}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors border ${
                    isCurrent
                      ? 'bg-indigo-950/50 border-indigo-500/50 text-white'
                      : 'hover:bg-slate-900/80 border-transparent hover:border-slate-800/90 text-slate-300'
                  }`}
                >
                  {/* Number / Play Button */}
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <button
                      onClick={() => playTrack(track, processedTracks)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 group-hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current text-indigo-400" />
                      ) : isCurrent ? (
                        <Play className="w-3.5 h-3.5 fill-current text-indigo-400 ml-0.5" />
                      ) : (
                        <span className="group-hover:hidden font-mono text-[11px] text-slate-500">
                          {idx + 1}
                        </span>
                      )}
                      <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block ml-0.5" />
                    </button>
                  </div>

                  {/* Artwork & Title */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-950 border border-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <h4
                        onClick={() => playTrack(track, processedTracks)}
                        className={`font-semibold truncate cursor-pointer hover:underline ${
                          isCurrent ? 'text-indigo-300' : 'text-slate-100'
                        }`}
                        title={track.title}
                      >
                        {track.title}
                      </h4>
                      <p
                        onClick={(e) => {
                          const ch = track.channelTitle || track.artist;
                          if (ch && ch.toLowerCase() !== activeChannel.name.toLowerCase()) {
                            e.stopPropagation();
                            exploreChannel(ch, track.channelId, track);
                          }
                        }}
                        className={`text-[11px] truncate ${
                          (track.channelTitle || track.artist)?.toLowerCase() !== activeChannel.name.toLowerCase()
                            ? 'text-slate-400 hover:text-indigo-300 hover:underline cursor-pointer'
                            : 'text-slate-400'
                        }`}
                        title={track.channelTitle || track.artist}
                      >
                        {track.channelTitle || track.artist}
                      </p>
                    </div>
                  </div>

                  {/* Genre */}
                  <div className="hidden md:block w-28 text-slate-400 font-mono text-[11px] truncate">
                    {track.genre}
                  </div>

                  {/* Views */}
                  <div className="hidden md:flex items-center justify-end gap-1 w-24 text-right font-mono text-[11px] text-slate-400">
                    <Eye className="w-3 h-3 text-slate-500" />
                    <span>{formatViews(track.views)}</span>
                  </div>

                  {/* Size */}
                  <div className="hidden md:flex items-center justify-end gap-1 w-20 text-right font-mono text-[11px] text-slate-400">
                    <HardDrive className="w-3 h-3 text-slate-500" />
                    <span>{formatFileSize(track.fileSize, track.duration)}</span>
                  </div>

                  {/* Date Created */}
                  <div className="hidden md:flex items-center justify-end gap-1 w-24 text-right font-mono text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{formatDate(track.createdAt || track.addedAt)}</span>
                  </div>

                  {/* Duration */}
                  <div className="w-16 text-right font-mono text-[11px] text-slate-400">
                    {formatDuration(track.duration)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    {/* Add to Playlist */}
                    <button
                      onClick={() => setTrackToAddPlaylist(track)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Add to Playlist"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => {
                        if (track.isOfflineReady) {
                          removeOfflineTrack(track.id);
                        } else {
                          downloadTrackForOffline(track);
                        }
                      }}
                      disabled={isDownloading}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        track.isOfflineReady
                          ? 'text-emerald-400 hover:text-red-400'
                          : isDownloading
                          ? 'text-indigo-400 animate-spin'
                          : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                      }`}
                      title={track.isOfflineReady ? 'Offline ready' : 'Download'}
                    >
                      {track.isOfflineReady ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
