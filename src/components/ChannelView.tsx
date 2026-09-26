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
  Folder,
  FolderTree,
  ChevronRight,
  CornerLeftUp,
  Layers,
  Disc3,
  Youtube,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Track, ChannelFolder } from '../types/music';
import { SortBar } from './SortBar';
import { IdentificationBadge } from './IdentificationBadge';
import {
  SortField,
  SortDirection,
  sortTracks,
  formatViews,
  formatFileSize,
  formatDate,
  formatDuration,
} from '../lib/trackUtils';
import {
  getAllTracksFromFolder,
  countAllTracks,
  countAllSubfolders,
  formatFolderDuration,
} from '../lib/channelFolderUtils';

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

  // Navigation state for folders in folders
  const [currentFolderPath, setCurrentFolderPath] = useState<ChannelFolder[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'folders' | 'tracks'>('all');
  const [sortField, setSortField] = useState<SortField>('views');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchInChannel, setSearchInChannel] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);

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

  // Current active folder level (null means root of channel)
  const currentFolder: ChannelFolder | null =
    currentFolderPath.length > 0 ? currentFolderPath[currentFolderPath.length - 1] : null;

  // Subfolders available at current directory level
  const currentLevelSubfolders: ChannelFolder[] = useMemo(() => {
    if (currentFolder) {
      return currentFolder.subfolders || [];
    }
    return activeChannel.folders || [];
  }, [currentFolder, activeChannel.folders]);

  // Tracks available at current directory level (deduplicated by track id)
  const currentLevelDirectTracks: Track[] = useMemo(() => {
    const raw = currentFolder ? currentFolder.tracks || [] : activeChannel.tracks || [];
    const seen = new Set<string>();
    const deduped: Track[] = [];
    for (const t of raw) {
      const idKey = (t.id || '').toLowerCase();
      if (idKey && seen.has(idKey)) continue;
      if (idKey) seen.add(idKey);
      deduped.push(t);
    }
    return deduped;
  }, [currentFolder, activeChannel.tracks]);

  // All tracks playable recursively in current directory (including subfolders)
  const allPlayableTracksInCurrentLocation: Track[] = useMemo(() => {
    if (currentFolder) {
      return getAllTracksFromFolder(currentFolder);
    }
    return activeChannel.tracks || [];
  }, [currentFolder, activeChannel.tracks]);

  // Filter subfolders by search
  const filteredSubfolders = useMemo(() => {
    if (!searchInChannel.trim()) return currentLevelSubfolders;
    const q = searchInChannel.toLowerCase().trim();
    return currentLevelSubfolders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.tags && f.tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  }, [currentLevelSubfolders, searchInChannel]);

  // Filter & sort tracks by search, genre & sort criteria
  const processedTracks = useMemo(() => {
    let list = [...currentLevelDirectTracks];

    // Filter by search
    if (searchInChannel.trim()) {
      const q = searchInChannel.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q) ||
          (t.mood && t.mood.toLowerCase().includes(q)) ||
          (t.channelTitle && t.channelTitle.toLowerCase().includes(q))
      );
    }

    // Filter by genre
    if (selectedGenre) {
      list = list.filter((t) => t.genre === selectedGenre);
    }

    // Sort
    return sortTracks(list, sortField, sortDirection);
  }, [currentLevelDirectTracks, searchInChannel, selectedGenre, sortField, sortDirection]);

  // Folder navigation handlers
  const handleOpenFolder = (folder: ChannelFolder) => {
    setCurrentFolderPath((prev) => [...prev, folder]);
    setSearchInChannel('');
    setSelectedGenre(null);
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolderPath([]);
    } else {
      setCurrentFolderPath(currentFolderPath.slice(0, index + 1));
    }
    setSearchInChannel('');
    setSelectedGenre(null);
  };

  const handleUpOneLevel = () => {
    setCurrentFolderPath((prev) => prev.slice(0, -1));
  };

  // Playback handlers
  const handlePlayCurrentLocation = () => {
    const targetTracks =
      processedTracks.length > 0 ? processedTracks : allPlayableTracksInCurrentLocation;
    if (targetTracks.length > 0) {
      playTrack(targetTracks[0], targetTracks);
    }
  };

  const handleShuffleCurrentLocation = () => {
    const targetTracks =
      processedTracks.length > 0 ? processedTracks : allPlayableTracksInCurrentLocation;
    if (targetTracks.length > 0) {
      const shuffled = [...targetTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handlePlaySpecificFolder = (folder: ChannelFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    const folderTracks = getAllTracksFromFolder(folder);
    if (folderTracks.length > 0) {
      playTrack(folderTracks[0], folderTracks);
    }
  };

  // Available genres in current view
  const currentGenres = useMemo(() => {
    return Array.from(new Set(currentLevelDirectTracks.map((t) => t.genre).filter(Boolean)));
  }, [currentLevelDirectTracks]);

  return (
    <div className="min-h-full pb-32 space-y-6">
      {/* ========================================================================= */}
      {/* 1. CHANNEL IDENTIFICATION HEADER & PROFILE BANNER                         */}
      {/* ========================================================================= */}
      <div className="relative bg-[#0d0f18] border-b border-slate-800/80 overflow-hidden">
        {/* Ambient Gradient Backdrop */}
        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-red-600 via-indigo-600 to-purple-800 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Top Bar: Back to Explore & Verified Channel Badge */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveView('explore')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Explore</span>
            </button>

            {/* Visual Identification Badge: CHANNEL */}
            <div className="flex items-center gap-2">
              <IdentificationBadge
                type="channel"
                countLabel={activeChannel.subscribers || '1.2M subscribers'}
                size="md"
              />
            </div>
          </div>

          {/* Profile Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 pt-1">
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
                <IdentificationBadge type="channel" size="sm" />
              </div>

              {/* Channel Stats & Overview */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 font-mono">
                <span>{activeChannel.subscribers || '1.2M subscribers'}</span>
                <span>•</span>
                <span className="text-amber-400">
                  📁 {activeChannel.folders?.length || 4} Root Folders
                </span>
                <span>•</span>
                <span className="text-emerald-400">
                  🎵 {activeChannel.trackCount || activeChannel.tracks.length} Tracks Loaded
                </span>
                {activeChannel.genres && activeChannel.genres.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-400">
                      {activeChannel.genres.slice(0, 3).join(', ')}
                    </span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                <button
                  onClick={handlePlayCurrentLocation}
                  disabled={allPlayableTracksInCurrentLocation.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current text-slate-950" />
                  <span>{currentFolder ? `Play Folder` : 'Play Entire Channel'}</span>
                </button>

                <button
                  onClick={handleShuffleCurrentLocation}
                  disabled={allPlayableTracksInCurrentLocation.length === 0}
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

      {/* ========================================================================= */}
      {/* 2. HIERARCHICAL FOLDER BREADCRUMB & NAVIGATION BAR                        */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Visual Identification Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs font-mono font-medium">Items Legend:</span>
            <div className="flex items-center gap-2">
              <IdentificationBadge type="channel" size="sm" />
              <IdentificationBadge type="folder" size="sm" />
              <IdentificationBadge type="track" size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Location Depth: Level {currentFolderPath.length + 1}</span>
          </div>
        </div>

        {/* Interactive Breadcrumb Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-3 bg-[#0d0f18] border border-slate-800 rounded-xl text-xs font-mono">
          {currentFolderPath.length > 0 && (
            <button
              onClick={handleUpOneLevel}
              className="mr-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              title="Navigate Up One Folder Level"
            >
              <CornerLeftUp className="w-3.5 h-3.5" />
              <span>Up Level</span>
            </button>
          )}

          {/* Root Channel Segment */}
          <button
            onClick={() => handleNavigateToBreadcrumb(-1)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentFolderPath.length === 0
                ? 'bg-red-950/80 text-red-300 border border-red-700/60 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span>{activeChannel.name} (Root)</span>
          </button>

          {/* Nested Folder Segments in Path */}
          {currentFolderPath.map((folder, idx) => {
            const isLast = idx === currentFolderPath.length - 1;
            return (
              <React.Fragment key={`${folder.id}-${idx}`}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                <button
                  onClick={() => handleNavigateToBreadcrumb(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    isLast
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                  title={`Navigate to ${folder.name}`}
                >
                  {idx > 0 ? (
                    <FolderTree className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Folder className="w-3 h-3 text-amber-400" />
                  )}
                  <span className="truncate max-w-[180px] sm:max-w-[260px]">{folder.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Current Folder Context Banner (if inside a folder or subfolder) */}
        {currentFolder && (
          <div className="relative p-4 sm:p-5 bg-gradient-to-r from-amber-950/30 via-slate-900/80 to-slate-950 border border-amber-800/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-amber-900/40 border border-amber-600/50 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg">
                {currentFolderPath.length > 1 ? (
                  <FolderTree className="w-7 h-7" />
                ) : (
                  <Folder className="w-7 h-7 fill-amber-400/20" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">
                    {currentFolder.name}
                  </h2>
                  <IdentificationBadge
                    type="folder"
                    depth={currentFolderPath.length}
                    countLabel={`${currentLevelSubfolders.length} subfolders · ${currentLevelDirectTracks.length} tracks`}
                  />
                </div>
                {currentFolder.description && (
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                    {currentFolder.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                  <span>Total Duration: {formatFolderDuration(allPlayableTracksInCurrentLocation)}</span>
                  <span>•</span>
                  <span>Total Contained: {allPlayableTracksInCurrentLocation.length} audio tracks</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-shrink-0">
              <button
                onClick={handlePlayCurrentLocation}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-slate-950" />
                <span>Play Folder</span>
              </button>
              <button
                onClick={handleShuffleCurrentLocation}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title="Shuffle Folder"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Loading subtle indicator if fetching more catalog */}
        {activeChannel.loading && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs text-indigo-300 font-mono animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Loading complete YouTube & audio catalog from {activeChannel.name}...</span>
          </div>
        )}

        {/* Search & Tabs Filtering */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Search bar inside current folder */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchInChannel}
              onChange={(e) => setSearchInChannel(e.target.value)}
              placeholder={`Search in ${currentFolder ? currentFolder.name : activeChannel.name}...`}
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

          {/* View Category Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Items ({filteredSubfolders.length + processedTracks.length})
            </button>
            <button
              onClick={() => setActiveTab('folders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'folders'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Folders ({filteredSubfolders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('tracks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'tracks'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Tracks ({processedTracks.length})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. FOLDERS IN FOLDERS SECTION                                             */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'folders') && filteredSubfolders.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {currentFolder ? 'Subfolders in this Directory' : 'Channel Directory Folders'}
                </h3>
                <IdentificationBadge
                  type="folder"
                  depth={currentFolderPath.length + 1}
                  size="sm"
                  countLabel={`${filteredSubfolders.length} available`}
                />
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Click any folder to explore nested tracks
              </span>
            </div>

            {/* Folders Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredSubfolders.map((folder, idx) => {
                const subCount = countAllSubfolders(folder);
                const trackCount = countAllTracks(folder);
                const folderTracks = getAllTracksFromFolder(folder);
                const isPlayingFolder =
                  playerState.currentTrack &&
                  playerState.isPlaying &&
                  folderTracks.some((t) => t.id === playerState.currentTrack?.id);

                return (
                  <div
                    key={`${folder.id}-${idx}`}
                    onClick={() => handleOpenFolder(folder)}
                    className="group relative bg-[#0e1017] hover:bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-950/20 flex flex-col justify-between"
                  >
                    {/* Top tab styling */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={folder.coverUrl || activeChannel.avatarUrl || ''}
                          alt={folder.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700/60 bg-slate-950 shadow-md group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-md bg-amber-500 text-slate-950 shadow">
                          {subCount > 0 ? (
                            <FolderTree className="w-3 h-3" />
                          ) : (
                            <Folder className="w-3 h-3 fill-current" />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <IdentificationBadge
                          type="folder"
                          depth={currentFolderPath.length + 1}
                          size="sm"
                        />
                        <span className="text-[10px] text-amber-400 font-mono font-medium">
                          {subCount > 0 ? `${subCount} subfolders` : 'Leaf folder'}
                        </span>
                      </div>
                    </div>

                    {/* Folder Info */}
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-300 transition-colors line-clamp-1">
                        {folder.name}
                      </h4>
                      {folder.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {folder.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">🎵 {trackCount} tracks</span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handlePlaySpecificFolder(folder, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors cursor-pointer"
                          title="Play all tracks in folder"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform font-sans font-semibold text-xs flex items-center gap-0.5">
                          Open →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 4. TRACKS SECTION WITH COMPREHENSIVE SORTBAR                              */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'tracks') && (
          <section className="space-y-3 pt-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {currentFolder ? `Tracks in "${currentFolder.name}"` : 'Channel Audio Catalog'}
                </h3>
                <IdentificationBadge
                  type="track"
                  size="sm"
                  countLabel={`${processedTracks.length} tracks`}
                />
              </div>

              {/* Genre Pills Filter if genres exist */}
              {currentGenres.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedGenre === null
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {currentGenres.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        selectedGenre === g
                          ? 'bg-emerald-600 text-white'
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

            {/* Tracks List */}
            {processedTracks.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-2">
                <Music2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300 font-medium">
                  {currentLevelSubfolders.length > 0
                    ? 'No direct tracks in this folder; open the subfolders above to play tracks.'
                    : 'No tracks matched your criteria'}
                </p>
                <p className="text-xs text-slate-500">
                  Try changing the sort, clearing the search query, or navigating into subfolders.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 bg-[#0f111a]/80 border border-slate-800/80 rounded-2xl p-2.5 sm:p-3">
                {/* Table Header (Desktop) */}
                <div className="hidden md:flex items-center justify-between px-3.5 py-2 text-[11px] font-mono font-medium text-slate-500 border-b border-slate-800/60 select-none">
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1 min-w-0 pr-4">TITLE & IDENTIFIER</div>
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
                      key={`${track.id}-${idx}`}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors border ${
                        isCurrent
                          ? 'bg-indigo-950/50 border-indigo-500/50 text-white shadow-md'
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

                      {/* Artwork, Title & Identification */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-950 border border-slate-800"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4
                              onClick={() => playTrack(track, processedTracks)}
                              className={`font-semibold truncate cursor-pointer hover:underline ${
                                isCurrent ? 'text-indigo-300' : 'text-slate-100'
                              }`}
                              title={track.title}
                            >
                              {track.title}
                            </h4>
                            <IdentificationBadge type="track" size="sm" />
                          </div>
                          <p
                            onClick={(e) => {
                              const ch = track.channelTitle || track.artist;
                              if (ch && ch.toLowerCase() !== activeChannel.name.toLowerCase()) {
                                e.stopPropagation();
                                exploreChannel(ch, track.channelId, track);
                              }
                            }}
                            className={`text-[11px] truncate mt-0.5 ${
                              (track.channelTitle || track.artist)?.toLowerCase() !==
                              activeChannel.name.toLowerCase()
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
          </section>
        )}
      </div>
    </div>
  );
};
