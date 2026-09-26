import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderTree,
  Music2,
  Radio,
  Play,
  Pause,
  Search,
  Sparkles,
  Download,
  CheckCircle,
  FolderPlus,
  Heart,
  Maximize2,
  Minimize2,
  Disc3,
  Layers,
  ArrowUpRight,
  Eye,
  Clock,
  HardDrive,
  Filter,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Track, ChannelFolder } from '../types/music';
import { IdentificationBadge } from './IdentificationBadge';
import { formatDuration, formatViews, formatFileSize } from '../lib/trackUtils';
import {
  getAllTracksFromFolder,
  countAllTracks,
  countAllSubfolders,
  buildChannelFolderHierarchy,
} from '../lib/channelFolderUtils';

interface ChannelTreeViewProps {
  // If passed, restricts view to this specific channel. Otherwise displays all channels or allows switching.
  channelOverride?: {
    name: string;
    avatarUrl?: string;
    subscribers?: string;
    folders: ChannelFolder[];
    tracks: Track[];
  } | null;
  onOpenChannelView?: () => void;
  className?: string;
}

export const ChannelTreeView: React.FC<ChannelTreeViewProps> = ({
  channelOverride,
  onOpenChannelView,
  className = '',
}) => {
  const {
    activeChannel,
    tracks,
    playTrack,
    playerState,
    exploreChannel,
    setActiveView,
    setTrackToAddPlaylist,
    downloadTrackForOffline,
    downloadsProgress,
    removeOfflineTrack,
    toggleLike,
    isTrackLiked,
  } = useMusic();

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [treeSearch, setTreeSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'channels' | 'folders' | 'tracks'>('all');
  const [selectedChannelName, setSelectedChannelName] = useState<string>('all');

  // Known channel profiles from catalog/tracks
  const allChannels = useMemo(() => {
    const list: {
      name: string;
      avatarUrl?: string;
      subscribers?: string;
      folders: ChannelFolder[];
      tracks: Track[];
    }[] = [];

    const seenChannelNames = new Set<string>();

    // 1. Current active channel if available
    if (activeChannel && activeChannel.name) {
      list.push({
        name: activeChannel.name,
        avatarUrl: activeChannel.avatarUrl || activeChannel.tracks[0]?.coverUrl,
        subscribers: activeChannel.subscribers || '1.2M subscribers',
        folders: activeChannel.folders || buildChannelFolderHierarchy(activeChannel.tracks, activeChannel.name),
        tracks: activeChannel.tracks || [],
      });
      seenChannelNames.add(activeChannel.name.toLowerCase());
    }

    // 2. Curated channels with their tracks from the global library/explore
    const curatedChannels = [
      {
        name: 'Lofi Girl',
        subscribers: '14.2M subscribers',
        avatarUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      },
      {
        name: 'Calm Soundscapes',
        subscribers: '3.5M subscribers',
        avatarUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
      },
      {
        name: 'Ghost Beats',
        subscribers: '890K subscribers',
        avatarUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      },
      {
        name: 'Neon Nexus',
        subscribers: '1.8M subscribers',
        avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      },
      {
        name: 'Acoustic Horizon',
        subscribers: '620K subscribers',
        avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      },
    ];

    for (const c of curatedChannels) {
      if (seenChannelNames.has(c.name.toLowerCase())) continue;
      const chTracks = tracks.filter(
        (t) => (t.channelTitle || t.artist || '').toLowerCase().includes(c.name.toLowerCase())
      );
      const safeTracks = chTracks.length > 0 ? chTracks : tracks.slice(0, 10);
      list.push({
        name: c.name,
        avatarUrl: c.avatarUrl || safeTracks[0]?.coverUrl,
        subscribers: c.subscribers,
        folders: buildChannelFolderHierarchy(safeTracks, c.name),
        tracks: safeTracks,
      });
      seenChannelNames.add(c.name.toLowerCase());
    }

    // 3. Any additional channels discovered from tracks
    const otherChannelMap = new Map<string, Track[]>();
    for (const t of tracks) {
      const ch = (t.channelTitle || t.artist || '').trim();
      if (ch && !seenChannelNames.has(ch.toLowerCase())) {
        if (!otherChannelMap.has(ch)) otherChannelMap.set(ch, []);
        otherChannelMap.get(ch)!.push(t);
      }
    }

    otherChannelMap.forEach((trks, chName) => {
      seenChannelNames.add(chName.toLowerCase());
      list.push({
        name: chName,
        avatarUrl: trks[0]?.coverUrl,
        subscribers: 'Creator Channel',
        folders: buildChannelFolderHierarchy(trks, chName),
        tracks: trks,
      });
    });

    return list;
  }, [activeChannel, tracks]);

  // Determine effective channels to display
  const channelsToDisplay = useMemo(() => {
    if (channelOverride) {
      return [channelOverride];
    }
    if (selectedChannelName !== 'all') {
      const match = allChannels.find(
        (c) => c.name.toLowerCase() === selectedChannelName.toLowerCase()
      );
      return match ? [match] : allChannels;
    }
    return allChannels;
  }, [channelOverride, selectedChannelName, allChannels]);

  // Initial expand: expand the first channel and its top-level folders
  useEffect(() => {
    if (channelsToDisplay.length > 0) {
      setExpandedNodes((prev) => {
        const next = { ...prev };
        const firstCh = channelsToDisplay[0];
        const chKey = `channel-${firstCh.name}`;
        if (next[chKey] === undefined) {
          next[chKey] = true;
          // Also expand first level folders of first channel
          firstCh.folders?.forEach((f) => {
            next[`folder-${f.id}`] = true;
          });
        }
        return next;
      });
    }
  }, [channelsToDisplay]);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Expand / Collapse all
  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    const expandFolderRecursively = (f: ChannelFolder) => {
      next[`folder-${f.id}`] = true;
      if (f.subfolders) {
        f.subfolders.forEach(expandFolderRecursively);
      }
    };

    channelsToDisplay.forEach((ch) => {
      next[`channel-${ch.name}`] = true;
      ch.folders?.forEach(expandFolderRecursively);
    });
    setExpandedNodes(next);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Play folder recursively
  const handlePlayFolder = (folder: ChannelFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    const folderTracks = getAllTracksFromFolder(folder);
    if (folderTracks.length > 0) {
      playTrack(folderTracks[0], folderTracks);
    }
  };

  // Play whole channel
  const handlePlayChannel = (ch: typeof allChannels[0], e: React.MouseEvent) => {
    e.stopPropagation();
    const allTracks = ch.tracks?.length > 0 ? ch.tracks : ch.folders.flatMap(getAllTracksFromFolder);
    if (allTracks.length > 0) {
      playTrack(allTracks[0], allTracks);
    }
  };

  // Open channel in ChannelView
  const handleExploreChannel = (chName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    exploreChannel(chName);
    if (onOpenChannelView) {
      onOpenChannelView();
    } else {
      setActiveView('channel');
    }
  };

  // Search filter helper
  const matchesQuery = (str?: string) => {
    if (!treeSearch.trim()) return true;
    return (str || '').toLowerCase().includes(treeSearch.toLowerCase().trim());
  };

  // Recursive Track Node Renderer
  const renderTrackNode = (track: Track, parentFolderId: string, idx: number) => {
    if (filterType === 'channels' || filterType === 'folders') return null;

    const isMatch = matchesQuery(track.title) || matchesQuery(track.artist) || matchesQuery(track.genre);
    if (treeSearch.trim() && !isMatch) return null;

    const isCurrent = playerState.currentTrack?.id === track.id;
    const isPlaying = isCurrent && playerState.isPlaying;
    const isLiked = isTrackLiked(track.id);
    const isDownloading = downloadsProgress[track.id] !== undefined;

    return (
      <div
        key={`tree-track-${parentFolderId}-${track.id}-${idx}`}
        className={`group relative flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs transition-all duration-150 border ${
          isCurrent
            ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm'
            : 'hover:bg-slate-900/90 border-transparent hover:border-slate-800 text-slate-300'
        }`}
      >
        {/* Track Title, Identification & Playback */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
          {/* Play/Pause Action Button */}
          <button
            onClick={() => playTrack(track, [track])}
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
              isCurrent
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white'
            }`}
            title={isPlaying ? 'Pause' : 'Play Track'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Artwork Thumbnail */}
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-slate-950 border border-slate-800 shadow-sm"
          />

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                onClick={() => playTrack(track, [track])}
                className={`font-medium truncate cursor-pointer hover:underline text-xs ${
                  isCurrent ? 'text-emerald-300 font-semibold' : 'text-slate-200'
                }`}
                title={track.title}
              >
                {track.title}
              </span>
              <IdentificationBadge type="track" size="sm" />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span className="truncate">{track.artist}</span>
              <span>•</span>
              <span className="text-slate-500">{track.genre}</span>
              {track.duration > 0 && (
                <>
                  <span>•</span>
                  <span>{formatDuration(track.duration)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Track Actions */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0">
          {/* Add to Playlist */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTrackToAddPlaylist(track);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Add to Playlist"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* Like / Favorite */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(track);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLiked
                ? 'text-pink-500 hover:text-pink-400'
                : 'text-slate-400 hover:text-pink-400 hover:bg-slate-800'
            }`}
            title={isLiked ? 'In Favorites' : 'Add to Favorites'}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          {/* Download Offline */}
          <button
            onClick={(e) => {
              e.stopPropagation();
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
            title={track.isOfflineReady ? 'Offline ready' : 'Download for offline playback'}
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
  };

  // Recursive Folder Node Renderer
  const renderFolderNode = (folder: ChannelFolder, depth: number = 1, parentPath = '') => {
    if (filterType === 'channels') return null;

    const nodeId = `folder-${folder.id}`;
    const isExpanded = !!expandedNodes[nodeId];
    const subCount = countAllSubfolders(folder);
    const totalTrackCount = countAllTracks(folder);
    const directTracks = folder.tracks || [];
    const directSubfolders = folder.subfolders || [];

    // Folder type helper
    const folderTypeBadge = folder.folderType || (depth > 1 ? 'subfolder' : 'folder');

    // Filter check
    const matchesSelf = matchesQuery(folder.name) || matchesQuery(folder.description);
    const hasMatchingDescendants =
      treeSearch.trim().length > 0 &&
      getAllTracksFromFolder(folder).some(
        (t) => matchesQuery(t.title) || matchesQuery(t.artist) || matchesQuery(t.genre)
      );

    if (treeSearch.trim() && !matchesSelf && !hasMatchingDescendants) {
      return null;
    }

    return (
      <div key={nodeId} className="space-y-1">
        {/* Folder Header Row */}
        <div
          onClick={() => toggleNode(nodeId)}
          className={`group flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-150 cursor-pointer border select-none ${
            isExpanded
              ? 'bg-amber-950/20 border-amber-600/30 text-white'
              : 'hover:bg-slate-900/80 border-transparent hover:border-slate-800/80 text-slate-300'
          }`}
        >
          {/* Left: Chevron, Icon, Folder Name & Badges */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
            {/* Expand/Collapse Chevron */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(nodeId);
              }}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Folder Icon */}
            <div className="w-7 h-7 rounded-lg bg-amber-900/40 border border-amber-600/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              {depth > 1 ? (
                <FolderTree className="w-3.5 h-3.5" />
              ) : folder.folderType === 'album' ? (
                <Disc3 className="w-3.5 h-3.5" />
              ) : (
                <Folder className="w-3.5 h-3.5 fill-amber-400/20" />
              )}
            </div>

            {/* Folder Name & Identification */}
            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-white truncate group-hover:text-amber-300 transition-colors">
                {folder.name}
              </span>

              {/* Explicit Visual Identification Badge: FOLDER */}
              <IdentificationBadge
                type="folder"
                depth={depth}
                subType={folderTypeBadge}
                size="sm"
                countLabel={`${directSubfolders.length} subfolders · ${totalTrackCount} tracks`}
              />
            </div>
          </div>

          {/* Right: Counters & Play Folder Action */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              🎵 {totalTrackCount} tracks
            </span>

            <button
              onClick={(e) => handlePlayFolder(folder, e)}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
              title="Play all tracks in folder"
            >
              <Play className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Play</span>
            </button>
          </div>
        </div>

        {/* Folder Children (Nested Subfolders + Direct Tracks) */}
        {isExpanded && (
          <div className="ml-5 pl-3 border-l-2 border-amber-600/30 space-y-1 pt-1">
            {/* 1. Nested Subfolders ("Folders in Folders") */}
            {directSubfolders.length > 0 && (
              <div className="space-y-1">
                {directSubfolders.map((sub, sIdx) =>
                  renderFolderNode(sub, depth + 1, `${parentPath}/${folder.id}`)
                )}
              </div>
            )}

            {/* 2. Direct Tracks inside this folder */}
            {directTracks.length > 0 && filterType !== 'folders' && (
              <div className="space-y-0.5 pt-0.5">
                {directTracks.map((trk, tIdx) =>
                  renderTrackNode(trk, folder.id, tIdx)
                )}
              </div>
            )}

            {/* Empty folder notice */}
            {directSubfolders.length === 0 && directTracks.length === 0 && (
              <p className="text-[11px] text-slate-500 italic py-1 px-2">
                Empty folder (no tracks or subfolders)
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Channel Node Renderer
  const renderChannelNode = (ch: typeof allChannels[0], chIdx: number) => {
    const chKey = `channel-${ch.name}`;
    const isExpanded = !!expandedNodes[chKey];
    const totalTracks = ch.tracks?.length || ch.folders.flatMap(getAllTracksFromFolder).length;
    const rootFolders = ch.folders || [];

    // Filter check
    const matchesChName = matchesQuery(ch.name);
    const hasMatchingContent =
      treeSearch.trim().length > 0 &&
      (matchesChName ||
        ch.tracks?.some((t) => matchesQuery(t.title) || matchesQuery(t.artist)) ||
        rootFolders.some((f) =>
          getAllTracksFromFolder(f).some(
            (t) => matchesQuery(t.title) || matchesQuery(t.artist)
          )
        ));

    if (treeSearch.trim() && !matchesChName && !hasMatchingContent) {
      return null;
    }

    return (
      <div
        key={`tree-ch-${ch.name}-${chIdx}`}
        className="rounded-2xl border border-slate-800 bg-[#0d0f18]/80 overflow-hidden shadow-xl"
      >
        {/* Channel Root Node Header */}
        <div
          onClick={() => toggleNode(chKey)}
          className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b ${
            isExpanded
              ? 'bg-gradient-to-r from-red-950/30 via-slate-900/90 to-slate-950 border-red-900/30'
              : 'bg-slate-950/40 hover:bg-slate-900/60 border-slate-800/60'
          }`}
        >
          {/* Left: Chevron, Channel Avatar, Channel Name & Badges */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(chKey);
              }}
              className="p-1 rounded text-red-400 hover:text-white transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-red-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* Channel Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={
                  ch.avatarUrl ||
                  ch.tracks[0]?.coverUrl ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                }
                alt={ch.name}
                className="w-10 h-10 rounded-xl object-cover border border-red-700/60 bg-slate-950 shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-red-600 text-white shadow">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
              </div>
            </div>

            {/* Channel Title & Identification Badge */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                  {ch.name}
                </h3>
                {/* Visual Identification Badge: CHANNEL */}
                <IdentificationBadge
                  type="channel"
                  size="sm"
                  countLabel={ch.subscribers || 'Verified'}
                />
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                <span className="text-amber-400 font-medium">
                  📁 {rootFolders.length} Root Folders
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">
                  🎵 {totalTracks} Audio Tracks
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Play Channel Button */}
            <button
              onClick={(e) => handlePlayChannel(ch, e)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
              title="Play all tracks in channel"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Play Channel</span>
            </button>

            {/* Explore Channel View Button */}
            <button
              onClick={(e) => handleExploreChannel(ch.name, e)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Open full channel page"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Open View</span>
            </button>
          </div>
        </div>

        {/* Channel Tree Branches (Folders & Subfolders & Tracks) */}
        {isExpanded && (
          <div className="p-3 sm:p-4 space-y-2 bg-[#090a10]/60">
            {/* Folders in Channel */}
            {rootFolders.length > 0 ? (
              <div className="space-y-1">
                {rootFolders.map((f, fIdx) => renderFolderNode(f, 1, ch.name))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center italic">
                No folders organized in this channel yet.
              </p>
            )}

            {/* If channel has any root-level tracks not categorized in folders */}
            {filterType !== 'folders' && ch.tracks && ch.tracks.length > 0 && rootFolders.length === 0 && (
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400 font-mono">
                  <Music2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Direct Catalog Tracks:</span>
                </div>
                {ch.tracks.map((t, tIdx) => renderTrackNode(t, `root-${ch.name}`, tIdx))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto ${className}`}>
      {/* ========================================================================= */}
      {/* 1. TREEVIEW HEADER & VISUAL IDENTIFICATION LEGEND                          */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-red-950/20 via-amber-950/20 to-emerald-950/20 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 bg-indigo-950/70 border border-indigo-700/50 px-3 py-1 rounded-full shadow-inner mb-2">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Hierarchical Treeview Navigation</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Channels, Folders & Tracks Tree
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Explore deep nested folders within channels, with separate visual badges and instant playback for every node.
            </p>
          </div>

          {/* Expand/Collapse Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpandAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Expand all channels and folders"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Expand All</span>
            </button>
            <button
              onClick={handleCollapseAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Collapse all down to root"
            >
              <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Collapse All</span>
            </button>
          </div>
        </div>

        {/* Visual Identification Legend */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-slate-400 font-mono text-[11px] font-semibold">Separate Identification:</span>
            <IdentificationBadge type="channel" size="sm" countLabel="Channel Root" />
            <IdentificationBadge type="folder" depth={1} size="sm" countLabel="Level 1 Folder" />
            <IdentificationBadge type="folder" depth={2} size="sm" countLabel="Nested Subfolder" />
            <IdentificationBadge type="track" size="sm" countLabel="Audio Track" />
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {channelsToDisplay.length} Channels • Click chevrons to browse hierarchy
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER & SEARCH CONTROLS                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tree Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={treeSearch}
            onChange={(e) => setTreeSearch(e.target.value)}
            placeholder="Search channels, folders, or tracks in tree..."
            className="w-full pl-9 pr-8 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {treeSearch && (
            <button
              onClick={() => setTreeSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter by Node Type */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Nodes
          </button>
          <button
            onClick={() => setFilterType('channels')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterType === 'channels'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 text-red-400" />
            <span>Channels Only</span>
          </button>
          <button
            onClick={() => setFilterType('folders')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterType === 'folders'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Folder className="w-3 h-3 text-amber-400" />
            <span>Folders Only</span>
          </button>
          <button
            onClick={() => setFilterType('tracks')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterType === 'tracks'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music2 className="w-3 h-3 text-emerald-400" />
            <span>Include Tracks</span>
          </button>
        </div>

        {/* Channel Selection dropdown (if multiple channels) */}
        {!channelOverride && allChannels.length > 1 && (
          <select
            value={selectedChannelName}
            onChange={(e) => setSelectedChannelName(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
          >
            <option value="all">View All Channels ({allChannels.length})</option>
            {allChannels.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.folders.length} folders)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. TREEVIEW HIERARCHY NODES CONTAINER                                     */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {channelsToDisplay.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-2">
            <FolderTree className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-medium">No channels found in treeview</p>
            <p className="text-xs text-slate-500">Try clearing the search query.</p>
          </div>
        ) : (
          channelsToDisplay.map((ch, idx) => renderChannelNode(ch, idx))
        )}
      </div>
    </div>
  );
};
