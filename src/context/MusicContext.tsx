import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Track, Playlist, PlayerState, GenreType, MoodType, ChannelFolder } from '../types/music';
import { audioManager } from '../lib/audioManager';
import { downloadManager } from '../lib/downloadManager';
import {
  idbGetAllTracks,
  idbSaveTrack,
  idbSaveTracks,
  idbDeleteTrack,
  idbGetAllPlaylists,
  idbSavePlaylist,
  idbSavePlaylists,
  idbDeletePlaylist,
  idbGetSetting,
  idbSetSetting,
} from '../lib/idb';
import { classifyTrackHeuristic, requestAICategorization } from '../lib/classifier';
import { ensureTrackSortMetadata } from '../lib/trackUtils';
import { buildChannelFolderHierarchy } from '../lib/channelFolderUtils';

export interface ChannelData {
  name: string;
  id?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  trackCount: number;
  subscribers?: string;
  genres?: string[];
  tracks: Track[];
  folders: ChannelFolder[];
  loading: boolean;
}

interface MusicContextType {
  tracks: Track[];
  playlists: Playlist[];
  playerState: PlayerState;
  queue: Track[];
  queueIndex: number;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  selectedGenreFilter: string | null;
  setSelectedGenreFilter: (genre: string | null) => void;
  selectedMoodFilter: string | null;
  setSelectedMoodFilter: (mood: string | null) => void;
  isOfflineModeOnly: boolean;
  setIsOfflineModeOnly: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: Track[];
  isSearching: boolean;
  searchPlatformFilter: string;
  setSearchPlatformFilter: (p: string) => void;
  searchPlatforms: (q: string, platform?: string) => Promise<void>;
  downloadsProgress: Record<string, number>;
  isOrganizing: boolean;
  organizeStatus: string | null;

  // Channel Exploration
  activeChannel: ChannelData | null;
  setActiveChannel: React.Dispatch<React.SetStateAction<ChannelData | null>>;
  exploreChannel: (channelOrArtistName: string, channelId?: string, initialTrack?: Track) => Promise<void>;

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void;
  toggleShuffle: () => void;
  playNext: () => void;
  playPrev: () => void;
  smartPlayPrev: () => void;
  toggleLike: (track: Track) => Promise<void>;
  isTrackLiked: (trackId: string) => boolean;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;

  // Playlist actions
  createPlaylist: (title: string, description?: string) => Promise<Playlist>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  addLinkToPlaylist: (playlistId: string, url: string) => Promise<Track>;
  addTrackAndSaveToPlaylist: (track: Track, playlistId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;

  // Download & Offline actions
  downloadTrackForOffline: (track: Track) => Promise<void>;
  removeOfflineTrack: (trackId: string) => Promise<void>;

  // Organization
  autoOrganizeLibrary: (useAI?: boolean) => Promise<void>;

  // Importers
  importYouTubeUrl: (url: string) => Promise<Track>;
  importLocalAudioFile: (file: File) => Promise<Track>;

  // Modals
  isUrlModalOpen: boolean;
  setIsUrlModalOpen: (val: boolean) => void;
  targetPlaylistForImport: string | null;
  setTargetPlaylistForImport: (id: string | null) => void;
  isEqualizerOpen: boolean;
  setIsEqualizerOpen: (val: boolean) => void;
  isSleepTimerOpen: boolean;
  setIsSleepTimerOpen: (val: boolean) => void;
  isQueueOpen: boolean;
  setIsQueueOpen: (val: boolean) => void;
  isSmartVibeModalOpen: boolean;
  setIsSmartVibeModalOpen: (val: boolean) => void;
  trackToAddPlaylist: Track | null;
  setTrackToAddPlaylist: (track: Track | null) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

// Helper to resolve YouTube, Spotify, or audio links client-side (for offline, static Vercel, or when /api is unreachable)
async function resolveMediaLinkClient(url: string): Promise<Track> {
  const trimmed = url.trim();

  // 1. Direct audio file
  if (trimmed.match(/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i)) {
    const fileName = trimmed.split('/').pop()?.split('?')[0] || 'Audio Stream';
    const cleanTitle = decodeURIComponent(fileName.replace(/\.(mp3|wav|m4a|aac|ogg)$/i, ''));
    const classification = classifyTrackHeuristic(cleanTitle, 'Web Audio');
    return {
      id: `web-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: cleanTitle,
      artist: 'Web Audio Stream',
      platform: 'web_audio',
      sourceUrl: trimmed,
      audioUrl: trimmed,
      duration: 180,
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      genre: classification.genre,
      mood: classification.mood,
      tags: ['web_audio', 'stream'],
      energyLevel: classification.energyLevel,
      isOfflineReady: true,
      addedAt: Date.now(),
    };
  }

  // 2. Spotify Track / Playlist / Album link
  const spotifyMatch = trimmed.match(
    /(?:spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album)\/([a-zA-Z0-9]+)|spotify:(track|playlist|album):([a-zA-Z0-9]+))/i
  );
  if (spotifyMatch) {
    const spType = spotifyMatch[1] || spotifyMatch[3];
    const spotifyId = spotifyMatch[2] || spotifyMatch[4];

    let title = 'Spotify Track';
    let author = 'Spotify Artist';
    let coverUrl =
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
    const iframeUrl = `https://open.spotify.com/embed/${spType}/${spotifyId}`;

    try {
      const spRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`
      );
      if (spRes.ok) {
        const spData = await spRes.json();
        title = spData.title || title;
        if (spData.thumbnail_url) coverUrl = spData.thumbnail_url;
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          title = parts[0].trim();
          author = parts.slice(1).join(' - ').trim();
        }
      }
    } catch (spErr) {
      console.warn('Spotify client oEmbed fallback:', spErr);
    }

    const classification = classifyTrackHeuristic(title, author, ['spotify', 'music']);

    // Attempt client-side YouTube match so background audio can play immediately
    let matchedYoutubeId = '';
    try {
      const matchRes = await fetch(`/api/search?q=${encodeURIComponent(`${title} ${author}`)}&platform=youtube`);
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        const found = matchData.tracks?.find((t: any) => t.youtubeId);
        if (found?.youtubeId) matchedYoutubeId = found.youtubeId;
      }
    } catch {}

    return {
      id: `spotify-${spotifyId}`,
      title,
      artist: author,
      platform: 'spotify',
      sourceUrl: trimmed,
      spotifyId,
      spotifyEmbedUrl: iframeUrl,
      youtubeId: matchedYoutubeId || undefined,
      duration: 210,
      coverUrl,
      genre: classification.genre,
      mood: classification.mood,
      tags: ['spotify', 'music', 'streaming'],
      energyLevel: classification.energyLevel,
      vibeDescription: classification.vibeDescription,
      isStream: false,
      addedAt: Date.now(),
    };
  }

  // 3. YouTube link
  let youtubeId = '';

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    youtubeId = trimmed;
  } else {
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      if (parsed.searchParams.has('v')) {
        const v = parsed.searchParams.get('v');
        if (v && v.length === 11) youtubeId = v;
      }
      if (!youtubeId) {
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const last = pathParts[pathParts.length - 1];
        if (last && last.length === 11) {
          youtubeId = last;
        } else if (pathParts[0] === 'shorts' && pathParts[1] && pathParts[1].length === 11) {
          youtubeId = pathParts[1];
        }
      }
    } catch {}
  }

  if (!youtubeId) {
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;
    const match = trimmed.match(regExp);
    if (match && match[1]) {
      youtubeId = match[1];
    }
  }

  if (!youtubeId || youtubeId.length !== 11) {
    throw new Error('Could not parse a valid YouTube, Spotify, or Audio URL');
  }

  let title = 'YouTube Audio';
  let author = 'YouTube Creator';
  let thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
    );
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      title = data.title || title;
      author = data.author_name || author;
      if (data.thumbnail_url) {
        thumbnail = data.thumbnail_url;
      }
    }
  } catch (e) {
    console.warn('Client oEmbed fallback note:', e);
  }

  const classification = classifyTrackHeuristic(title, author, ['youtube', 'audio']);

  return {
    id: `yt-${youtubeId}`,
    title,
    artist: author,
    platform: 'youtube',
    sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    youtubeId,
    duration: 240,
    coverUrl: thumbnail,
    genre: classification.genre,
    mood: classification.mood,
    tags: ['youtube', 'audio'],
    energyLevel: classification.energyLevel,
    vibeDescription: classification.vibeDescription,
    isStream: false,
    addedAt: Date.now(),
  };
}

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>(audioManager.getState());
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);

  const [activeView, setActiveView] = useState<string>('explore');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string | null>(null);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | null>(null);
  const [isOfflineModeOnly, setIsOfflineModeOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchPlatformFilter, setSearchPlatformFilter] = useState<string>('all');
  const [downloadsProgress, setDownloadsProgress] = useState<Record<string, number>>({});
  const [isOrganizing, setIsOrganizing] = useState<boolean>(false);
  const [organizeStatus, setOrganizeStatus] = useState<string | null>(null);

  // Channel Exploration State
  const [activeChannel, setActiveChannel] = useState<ChannelData | null>(null);

  // Modals
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [targetPlaylistForImport, setTargetPlaylistForImport] = useState<string | null>(null);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isSmartVibeModalOpen, setIsSmartVibeModalOpen] = useState(false);
  const [trackToAddPlaylist, setTrackToAddPlaylist] = useState<Track | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initial load from IndexedDB + Server Catalog
  useEffect(() => {
    async function loadData() {
      const savedTracks = await idbGetAllTracks();
      const savedPlaylists = await idbGetAllPlaylists();
      const savedOfflineMode = await idbGetSetting<boolean>('offlineMode', false);
      setIsOfflineModeOnly(savedOfflineMode);

      if (savedTracks.length > 0) {
        setTracks(savedTracks);
      } else {
        // Fetch curated explore seed tracks
        try {
          const res = await fetch('/api/explore');
          if (res.ok) {
            const data = await res.json();
            if (data.tracks && data.tracks.length > 0) {
              setTracks(data.tracks);
              await idbSaveTracks(data.tracks);
            }
          }
        } catch (err) {
          console.warn('Initial tracks fetch note:', err);
        }
      }

      if (savedPlaylists.length > 0) {
        setPlaylists(savedPlaylists);
      } else {
        // Create initial default smart playlists
        const defaultPlaylists: Playlist[] = [
          {
            id: 'pl-favorites',
            title: 'Favorites & Starred',
            description: 'Your starred songs and priority background tracks',
            trackIds: [],
            isSmartAuto: true,
            filterType: 'custom',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'pl-offline-vault',
            title: 'Offline Vault',
            description: 'Saved on-device for zero-data background playback',
            trackIds: [],
            isSmartAuto: true,
            filterType: 'offline',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'pl-deep-focus',
            title: 'Deep Focus & Study',
            description: 'Continuous flow music optimized for concentration',
            trackIds: [],
            isSmartAuto: true,
            filterType: 'mood',
            filterValue: 'Focus & Study',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'pl-chill-night',
            title: 'Late Night Chill & Relax',
            description: 'Mellow lo-fi beats and cozy ambient soundscapes',
            trackIds: [],
            isSmartAuto: true,
            filterType: 'mood',
            filterValue: 'Chill & Relax',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];
        setPlaylists(defaultPlaylists);
        await idbSavePlaylists(defaultPlaylists);
      }
    }

    loadData();
  }, []);

  // Sync with audioManager state
  useEffect(() => {
    const unsub = audioManager.subscribe((newState) => {
      setPlayerState(newState);
    });
    return unsub;
  }, []);

  // Sync download progress
  useEffect(() => {
    const unsub = downloadManager.subscribe((trackId, progress, status) => {
      setDownloadsProgress((prev) => {
        if (status === 'completed' || status === 'error') {
          const next = { ...prev };
          delete next[trackId];
          return next;
        }
        return { ...prev, [trackId]: progress };
      });

      if (status === 'completed') {
        // Refresh track in state
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isOfflineReady: true, downloadDate: Date.now() } : t))
        );
      }
    });
    return unsub;
  }, []);

  // Handle track end in audioManager
  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    let nextIdx = queueIndex + 1;
    if (playerState.isShuffled && queue.length > 1) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (playerState.repeatMode === 'all') {
        nextIdx = 0;
      } else {
        return; // stopped
      }
    }

    setQueueIndex(nextIdx);
    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      audioManager.playTrack(nextTrack);
    }
  }, [queue, queueIndex, playerState.isShuffled, playerState.repeatMode]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;

    if (playerState.currentTime > 3) {
      audioManager.seek(0);
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }

    setQueueIndex(prevIdx);
    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      audioManager.playTrack(prevTrack);
    }
  }, [queue, queueIndex, playerState.currentTime]);

  useEffect(() => {
    const unsub = audioManager.onTrackEnd(() => {
      playNext();
    });
    return unsub;
  }, [playNext]);

  // Global MediaSession listener bridge
  useEffect(() => {
    const handlePrev = () => playPrev();
    const handleNext = () => playNext();
    window.addEventListener('aurawave:prev', handlePrev);
    window.addEventListener('aurawave:next', handleNext);
    return () => {
      window.removeEventListener('aurawave:prev', handlePrev);
      window.removeEventListener('aurawave:next', handleNext);
    };
  }, [playPrev, playNext]);

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    let trackToPlay = track;

    // If Spotify track doesn't have youtubeId yet, try fast resolution for continuous background playback
    if (track.platform === 'spotify' && !track.youtubeId) {
      try {
        const query = `${track.title} ${track.artist}`;
        const matchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}&platform=youtube`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          const firstYt = matchData.tracks?.find((t: any) => t.youtubeId);
          if (firstYt?.youtubeId) {
            trackToPlay = {
              ...track,
              youtubeId: firstYt.youtubeId,
            };
          }
        }
      } catch (err) {
        console.warn('Auto match Spotify to YouTube note:', err);
      }
    }

    let q = newQueue || queue;
    if (!newQueue && (!queue.some((t) => t.id === trackToPlay.id) || queue.length === 0)) {
      q = [trackToPlay, ...queue.filter((t) => t.id !== trackToPlay.id)];
      setQueue(q);
      setQueueIndex(0);
    } else if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((t) => t.id === trackToPlay.id);
      setQueueIndex(idx !== -1 ? idx : 0);
    } else {
      const idx = queue.findIndex((t) => t.id === trackToPlay.id);
      setQueueIndex(idx);
    }

    await audioManager.playTrack(trackToPlay);

    // Update track play count and last played
    const updated = {
      ...trackToPlay,
      playCount: (trackToPlay.playCount || 0) + 1,
      lastPlayedAt: Date.now(),
    };
    await idbSaveTrack(updated);
    setTracks((prev) => prev.map((t) => (t.id === trackToPlay.id ? updated : t)));
  };

  const togglePlay = () => audioManager.togglePlay();
  const seek = (sec: number) => audioManager.seek(sec);
  const skipForward = (sec: number = 10) => audioManager.skipForward(sec);
  const skipBackward = (sec: number = 10) => audioManager.skipBackward(sec);
  const setPlaybackRate = (rate: number) => audioManager.setPlaybackRate(rate);
  const setVolume = (v: number) => audioManager.setVolume(v);
  const toggleMute = () => audioManager.toggleMute();
  const setRepeatMode = (m: 'off' | 'all' | 'one') => audioManager.setRepeatMode(m);
  const toggleShuffle = () => audioManager.toggleShuffle();

  // Smart Prev: If played for > 3s, restart track like Spotify & Apple Music; else go to prev track
  const smartPlayPrev = () => {
    if (playerState.currentTime > 3) {
      audioManager.seek(0);
    } else {
      playPrev();
    }
  };

  // 1-Click Like / Favorite Heart Toggle
  const isTrackLiked = useCallback(
    (trackId: string) => {
      const favPl = playlists.find((p) => p.id === 'pl-favorites');
      return !!favPl?.trackIds.includes(trackId);
    },
    [playlists]
  );

  const toggleLike = useCallback(
    async (track: Track) => {
      let favPl = playlists.find((p) => p.id === 'pl-favorites');
      if (!favPl) {
        favPl = {
          id: 'pl-favorites',
          title: 'Favorites & Starred',
          description: 'Your starred songs and priority background tracks',
          trackIds: [],
          isSmartAuto: true,
          filterType: 'custom',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }

      // Ensure track exists in state and storage
      if (!tracks.some((t) => t.id === track.id)) {
        await idbSaveTrack(track);
        setTracks((prev) => [track, ...prev]);
      }

      const isLiked = favPl.trackIds.includes(track.id);
      const newTrackIds = isLiked
        ? favPl.trackIds.filter((id) => id !== track.id)
        : [track.id, ...favPl.trackIds];

      const updatedPl: Playlist = {
        ...favPl,
        trackIds: newTrackIds,
        updatedAt: Date.now(),
      };

      const nextPlaylists = playlists.some((p) => p.id === 'pl-favorites')
        ? playlists.map((p) => (p.id === 'pl-favorites' ? updatedPl : p))
        : [updatedPl, ...playlists];

      setPlaylists(nextPlaylists);
      await idbSavePlaylist(updatedPl);
    },
    [playlists, tracks]
  );

  const addToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (queueIndex > index) {
      setQueueIndex((prev) => prev - 1);
    }
  };

  const clearQueue = () => {
    setQueue([]);
    setQueueIndex(-1);
  };

  // Playlists
  const createPlaylist = async (title: string, description: string = ''): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      description,
      trackIds: [],
      isSmartAuto: false,
      filterType: 'custom',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...playlists, newPlaylist];
    setPlaylists(updated);
    await idbSavePlaylist(newPlaylist);
    return newPlaylist;
  };

// Client-side Deezer JSONP search helper (bypasses browser CORS restrictions completely)
function searchDeezerJSONP(query: string): Promise<any[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve([]);
    const callbackName = `dz_cb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const script = document.createElement('script');
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve([]);
      }
    }, 1800);

    const cleanup = () => {
      clearTimeout(timer);
      try {
        delete (window as any)[callbackName];
      } catch {}
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    (window as any)[callbackName] = (data: any) => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve(Array.isArray(data?.data) ? data.data : []);
      }
    };

    script.src = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&output=jsonp&callback=${callbackName}`;
    script.onerror = () => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve([]);
      }
    };
    document.body.appendChild(script);
  });
}

  // Live Search Across Platforms
  const searchPlatforms = useCallback(async (query: string, platform?: string) => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const plat = platform || searchPlatformFilter;

    // 1. Try backend multi-platform search endpoint (supports Vercel serverless /api/search and local Express)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&platform=${plat}`, {
        signal: AbortSignal.timeout(3500),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          const seen = new Set<string>();
          const deduped: Track[] = [];
          for (const t of data.tracks) {
            const key = (t.id || t.youtubeId || `${t.title}-${t.artist}`).toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(t);
            }
          }
          setSearchResults(deduped);
          setIsSearching(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend search unreachable, running client search fallback:', err);
    }

    // 2. Client-side fallback search (essential on static Vercel hosting, offline, or when backend is cold-starting)
    try {
      const clientPromises: Promise<Track[]>[] = [];

      // A. Spotify Platform Search (Dual Engine: iTunes Music Catalog with Spotify metadata + Deezer JSONP)
      if (plat === 'all' || plat === 'spotify') {
        // iTunes open API formatted as Spotify tracks (100% reliable globally in every browser)
        clientPromises.push(
          fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=18`)
            .then((r) => r.json())
            .then((data) => {
              if (!Array.isArray(data?.results)) return [];
              const list: Track[] = [];
              const seen = new Set<string>();
              for (const r of data.results) {
                if (!r.trackId || seen.has(String(r.trackId))) continue;
                seen.add(String(r.trackId));
                const title = r.trackName || 'Track';
                const artist = r.artistName || 'Artist';
                const cl = classifyTrackHeuristic(title, artist, [r.primaryGenreName || '']);
                list.push({
                  id: `sp-itunes-${r.trackId}`,
                  title,
                  artist,
                  platform: 'spotify' as const,
                  sourceUrl: `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`,
                  spotifyId: String(r.trackId),
                  spotifyEmbedUrl: `https://open.spotify.com/embed/track/${r.trackId}`,
                  audioUrl: r.previewUrl || '',
                  duration: Math.round((r.trackTimeMillis || 180000) / 1000),
                  coverUrl:
                    (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
                    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
                  genre: cl.genre,
                  mood: cl.mood,
                  tags: ['spotify', 'music', (r.primaryGenreName || '').toLowerCase(), q.toLowerCase()],
                  energyLevel: cl.energyLevel,
                  isStream: false,
                  isOfflineReady: !!r.previewUrl,
                  addedAt: Date.now(),
                });
              }
              return list;
            })
            .catch(() => [])
        );

        // Also query Deezer catalog in parallel for additional Spotify tracks
        clientPromises.push(
          searchDeezerJSONP(q).then((items) => {
            if (!Array.isArray(items)) return [];
            const seen = new Set<string>();
            const list: Track[] = [];
            for (const item of items) {
              const id = `sp-${item.id}`;
              if (seen.has(id)) continue;
              seen.add(id);

              const title = item.title_short || item.title || 'Track';
              const artist = item.artist?.name || 'Artist';
              const cl = classifyTrackHeuristic(title, artist, ['spotify', 'music', q]);
              list.push({
                id,
                title,
                artist,
                platform: 'spotify' as const,
                sourceUrl: `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`,
                spotifyId: String(item.id),
                spotifyEmbedUrl: `https://open.spotify.com/embed/track/${item.id}`,
                audioUrl: item.preview || '',
                duration: item.duration || 210,
                coverUrl:
                  item.album?.cover_big ||
                  item.album?.cover_medium ||
                  item.artist?.picture_big ||
                  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
                genre: cl.genre,
                mood: cl.mood,
                tags: ['spotify', 'music', q.toLowerCase()],
                energyLevel: cl.energyLevel,
                isStream: false,
                isOfflineReady: !!item.preview,
                addedAt: Date.now(),
              });
            }
            return list;
          }).catch(() => [])
        );
      }

      // B. YouTube Search (Invidious Public APIs + iTunes Audio Matching)
      if (plat === 'all' || plat === 'youtube') {
        const invidiousFetch = async (): Promise<Track[]> => {
          const instances = [
            'https://inv.nadeko.net',
            'https://invidious.nerdvpn.de',
            'https://invidious.private.coffee',
          ];
          for (const inst of instances) {
            try {
              const iRes = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(q)}&type=video`, {
                signal: AbortSignal.timeout(2200),
              });
              if (iRes.ok) {
                const iData = await iRes.json();
                if (Array.isArray(iData) && iData.length > 0) {
                  return iData.slice(0, 15).map((v: any) => ({
                    id: `yt-${v.videoId}`,
                    title: v.title || 'YouTube Video',
                    artist: v.author || 'YouTube Creator',
                    platform: 'youtube' as const,
                    sourceUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
                    youtubeId: v.videoId,
                    duration: v.lengthSeconds || 240,
                    coverUrl:
                      v.videoThumbnails?.[0]?.url ||
                      `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
                    genre: 'Lo-Fi' as const,
                    mood: 'Focus & Study' as const,
                    tags: ['youtube', 'video', q.toLowerCase()],
                    energyLevel: 5,
                    isStream: !!v.liveNow,
                    isOfflineReady: false,
                    addedAt: Date.now(),
                  }));
                }
              }
            } catch {}
          }
          return [];
        };
        clientPromises.push(invidiousFetch());

        // Also query iTunes catalog for YouTube category
        clientPromises.push(
          fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=14`)
            .then((r) => r.json())
            .then((iData) => {
              if (!Array.isArray(iData?.results)) return [];
              const list: Track[] = [];
              for (const r of iData.results) {
                if (!r.trackId) continue;
                const cl = classifyTrackHeuristic(r.trackName || '', r.artistName || '', [r.primaryGenreName || '']);
                list.push({
                  id: `yt-itunes-${r.trackId}`,
                  title: r.trackName,
                  artist: r.artistName,
                  platform: 'youtube' as const,
                  sourceUrl: r.trackViewUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent((r.trackName || '') + ' ' + (r.artistName || ''))}`,
                  audioUrl: r.previewUrl,
                  duration: Math.round((r.trackTimeMillis || 180000) / 1000),
                  coverUrl: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') || r.artworkUrl100,
                  genre: cl.genre,
                  mood: cl.mood,
                  tags: [r.primaryGenreName?.toLowerCase() || 'music', 'audio', q.toLowerCase()],
                  energyLevel: cl.energyLevel,
                  isOfflineReady: true,
                  addedAt: Date.now(),
                });
              }
              return list;
            })
            .catch(() => [])
        );
      }

      // C. Web Audio / Royalty-Free Search
      if (plat === 'all' || plat === 'web_audio') {
        clientPromises.push(
          fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=12`)
            .then((r) => r.json())
            .then((iData) => {
              if (!Array.isArray(iData?.results)) return [];
              return iData.results.filter((r: any) => r.trackId).map((r: any) => {
                const cl = classifyTrackHeuristic(r.trackName || '', r.artistName || '', [r.primaryGenreName || '']);
                return {
                  id: `itunes-${r.trackId}`,
                  title: r.trackName,
                  artist: r.artistName,
                  platform: 'web_audio' as const,
                  sourceUrl: r.trackViewUrl,
                  audioUrl: r.previewUrl,
                  duration: Math.round((r.trackTimeMillis || 180000) / 1000),
                  coverUrl: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') || r.artworkUrl100,
                  genre: cl.genre,
                  mood: cl.mood,
                  tags: [r.primaryGenreName?.toLowerCase() || 'music', 'audio', q.toLowerCase()],
                  energyLevel: cl.energyLevel,
                  isOfflineReady: true,
                  addedAt: Date.now(),
                };
              });
            })
            .catch(() => [])
        );
      }

      // D. Podcast Search
      if (plat === 'all' || plat === 'podcast') {
        clientPromises.push(
          fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=podcast&entity=podcast&limit=8`)
            .then((r) => r.json())
            .then((pData) => {
              if (!Array.isArray(pData?.results)) return [];
              return pData.results
                .filter((r: any) => r.collectionId || r.trackId)
                .map((r: any) => {
                  const cl = classifyTrackHeuristic(r.collectionName || r.trackName || '', r.artistName || '', ['podcast']);
                  return {
                    id: `pod-${r.collectionId || r.trackId}`,
                    title: r.collectionName || r.trackName,
                    artist: r.artistName,
                    platform: 'podcast' as const,
                    sourceUrl: r.collectionViewUrl,
                    audioUrl: r.feedUrl,
                    duration: 1800,
                    coverUrl: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') || r.artworkUrl600 || r.artworkUrl100,
                    genre: 'Podcast & Talk' as const,
                    mood: 'Focus & Study' as const,
                    tags: ['podcast', 'talk', q.toLowerCase()],
                    energyLevel: cl.energyLevel,
                    isOfflineReady: false,
                    addedAt: Date.now(),
                  };
                });
            })
            .catch(() => [])
        );
      }

      const results = await Promise.all(clientPromises);
      const combined = results.flat();
      if (combined.length > 0) {
        const seen = new Set<string>();
        const deduped: Track[] = [];
        for (const t of combined) {
          const key = (t.id || t.youtubeId || `${t.title}-${t.artist}`).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(t);
          }
        }
        setSearchResults(deduped);
        setIsSearching(false);
        return;
      }
    } catch (cErr) {
      console.warn('Client search fallback error:', cErr);
    }

    setSearchResults([]);
    setIsSearching(false);
  }, [searchPlatformFilter]);

  // Debounced search when searchQuery or searchPlatformFilter changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      searchPlatforms(searchQuery, searchPlatformFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, searchPlatformFilter, searchPlatforms]);

  // Channel Exploration Handler
  const exploreChannel = useCallback(
    async (channelOrArtistName: string, channelId?: string, initialTrack?: Track) => {
      const name = (channelOrArtistName || '').trim();
      if (!name && !channelId) return;

      const deduplicateTrackList = (trackList: Track[]): Track[] => {
        const seenIds = new Set<string>();
        const seenYts = new Set<string>();
        const seenTitles = new Set<string>();
        const result: Track[] = [];

        for (const t of trackList) {
          if (!t) continue;
          const idKey = (t.id || '').toLowerCase();
          const ytKey = (t.youtubeId || '').toLowerCase();
          const titleKey = `${(t.title || '').trim().toLowerCase()}:::${(t.artist || '').trim().toLowerCase()}`;

          if ((idKey && seenIds.has(idKey)) || (ytKey && seenYts.has(ytKey)) || (titleKey && seenTitles.has(titleKey))) {
            // Already present, enhance existing track if new one has audioUrl/youtubeId
            if (idKey) {
              const existing = result.find((x) => (x.id || '').toLowerCase() === idKey);
              if (existing) {
                if (!existing.audioUrl && t.audioUrl) existing.audioUrl = t.audioUrl;
                if (!existing.youtubeId && t.youtubeId) existing.youtubeId = t.youtubeId;
              }
            }
            continue;
          }

          if (idKey) seenIds.add(idKey);
          if (ytKey) seenYts.add(ytKey);
          if (titleKey) seenTitles.add(titleKey);
          result.push(ensureTrackSortMetadata(t));
        }
        return result;
      };

      const baseList: Track[] = [];
      if (initialTrack) {
        baseList.push(initialTrack);
      }

      // Collect any matching tracks from library
      const libMatches = tracks.filter((t) =>
        (t.channelTitle || t.artist).toLowerCase().includes(name.toLowerCase())
      );
      for (const t of libMatches) {
        baseList.push(t);
      }

      // Collect matching tracks from active search results
      const searchMatches = searchResults.filter((t) =>
        (t.channelTitle || t.artist).toLowerCase().includes(name.toLowerCase())
      );
      for (const t of searchMatches) {
        baseList.push(t);
      }

      const initialTracks = deduplicateTrackList(baseList);

      // Transition view immediately so user sees responsiveness
      setActiveView('channel');
      setActiveChannel({
        name,
        id: channelId,
        avatarUrl: initialTrack?.coverUrl || initialTracks[0]?.coverUrl || '',
        bannerUrl: initialTracks[1]?.coverUrl || initialTracks[0]?.coverUrl || initialTrack?.coverUrl || '',
        trackCount: Math.max(initialTracks.length, 1),
        subscribers: '1.2M subscribers',
        genres: Array.from(new Set(initialTracks.map((t) => t.genre).filter(Boolean))),
        tracks: initialTracks,
        folders: buildChannelFolderHierarchy(initialTracks, name),
        loading: true,
      });

      try {
        const res = await fetch(
          `/api/channel?name=${encodeURIComponent(name)}&id=${encodeURIComponent(channelId || '')}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.channel && Array.isArray(data.tracks) && data.tracks.length > 0) {
            const rawCombined = initialTrack
              ? [initialTrack, ...initialTracks, ...data.tracks]
              : [...initialTracks, ...data.tracks];
            const mergedTracks = deduplicateTrackList(rawCombined);

            const channelFolders =
              Array.isArray(data.folders) && data.folders.length > 0
                ? data.folders
                : buildChannelFolderHierarchy(mergedTracks, data.channel.name || name);

            setActiveChannel({
              name: data.channel.name || name,
              id: data.channel.id || channelId,
              avatarUrl:
                data.channel.avatarUrl ||
                initialTrack?.coverUrl ||
                mergedTracks[0]?.coverUrl ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
              bannerUrl:
                data.channel.bannerUrl ||
                mergedTracks[1]?.coverUrl ||
                mergedTracks[0]?.coverUrl ||
                initialTrack?.coverUrl ||
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
              trackCount: mergedTracks.length,
              subscribers: data.channel.subscribers || '1.2M subscribers',
              genres: Array.from(new Set(mergedTracks.map((t) => t.genre).filter(Boolean))),
              tracks: mergedTracks,
              folders: channelFolders,
              loading: false,
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Channel endpoint unreachable, querying search fallback:', err);
      }

      // Fallback: search across platforms for the channel name
      try {
        const searchRes = await fetch(`/api/search?q=${encodeURIComponent(name)}&platform=all`);
        let fallbackTracks = [...initialTracks];
        if (searchRes.ok) {
          const sData = await searchRes.json();
          if (Array.isArray(sData.tracks)) {
            fallbackTracks = [...fallbackTracks, ...sData.tracks];
          }
        }

        const rawFallback = initialTrack ? [initialTrack, ...fallbackTracks] : fallbackTracks;
        const merged = deduplicateTrackList(rawFallback);

        setActiveChannel({
          name,
          id: channelId,
          avatarUrl:
            merged[0]?.coverUrl ||
            initialTrack?.coverUrl ||
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
          bannerUrl: merged[1]?.coverUrl || merged[0]?.coverUrl || initialTrack?.coverUrl || '',
          trackCount: merged.length,
          subscribers: '1.2M subscribers',
          genres: Array.from(new Set(merged.map((t) => t.genre).filter(Boolean))),
          tracks: merged,
          folders: buildChannelFolderHierarchy(merged, name),
          loading: false,
        });
      } catch {
        setActiveChannel((prev) => (prev ? { ...prev, loading: false } : null));
      }
    },
    [tracks, searchResults]
  );

  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    if (pl.trackIds.includes(trackId)) return;

    const updated: Playlist = {
      ...pl,
      trackIds: [...pl.trackIds, trackId],
      updatedAt: Date.now(),
    };

    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
    await idbSavePlaylist(updated);
  };

  // Add track to library if not existing, and save directly to a playlist
  const addTrackAndSaveToPlaylist = async (track: Track, playlistId: string) => {
    // Check if in tracks
    let updatedTracks = tracks;
    if (!tracks.some((t) => t.id === track.id)) {
      updatedTracks = [track, ...tracks];
      setTracks(updatedTracks);
      await idbSaveTrack(track);
    }
    await addTrackToPlaylist(playlistId, track.id);
  };

  // Add link directly to a specific playlist
  const addLinkToPlaylist = async (playlistId: string, url: string): Promise<Track> => {
    const imported = await importYouTubeUrl(url);
    await addTrackToPlaylist(playlistId, imported.id);
    return imported;
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;

    const updated: Playlist = {
      ...pl,
      trackIds: pl.trackIds.filter((id) => id !== trackId),
      updatedAt: Date.now(),
    };

    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? updated : p)));
    await idbSavePlaylist(updated);
  };

  const deletePlaylist = async (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    await idbDeletePlaylist(playlistId);
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
      setActiveView('library');
    }
  };

  // Offline Download
  const downloadTrackForOffline = async (track: Track) => {
    await downloadManager.downloadTrack(track);
  };

  const removeOfflineTrack = async (trackId: string) => {
    const t = tracks.find((x) => x.id === trackId);
    if (!t) return;
    const updated: Track = {
      ...t,
      isOfflineReady: false,
      downloadDate: undefined,
    };
    await idbSaveTrack(updated);
    setTracks((prev) => prev.map((x) => (x.id === trackId ? updated : x)));
  };

  // Auto-Organize Library by Genre and Mood (Heuristic + Gemini AI)
  const autoOrganizeLibrary = async (useAI: boolean = true) => {
    setIsOrganizing(true);
    setOrganizeStatus(useAI ? 'Analyzing audio library with Gemini AI...' : 'Categorizing tracks by genre and mood...');

    try {
      let classificationMap: Map<string, any>;
      if (useAI) {
        classificationMap = await requestAICategorization(tracks);
      } else {
        classificationMap = new Map();
        for (const t of tracks) {
          classificationMap.set(t.id, classifyTrackHeuristic(t.title, t.artist, t.tags));
        }
      }

      // Update tracks
      const updatedTracks = tracks.map((t) => {
        const info = classificationMap.get(t.id);
        if (info) {
          return {
            ...t,
            genre: info.genre || t.genre,
            mood: info.mood || t.mood,
            energyLevel: info.energyLevel || t.energyLevel || 5,
            vibeDescription: info.vibeDescription || t.vibeDescription,
          };
        }
        return t;
      });

      setTracks(updatedTracks);
      await idbSaveTracks(updatedTracks);

      setOrganizeStatus('Generating smart playlists for each genre & mood...');

      // Auto-create/update smart playlists for all genres and moods
      const newPlaylists = [...playlists];

      // Build genre playlists
      const genreSet = new Set(updatedTracks.map((t) => t.genre));
      genreSet.forEach((genre) => {
        const gTracks = updatedTracks.filter((t) => t.genre === genre).map((t) => t.id);
        const existingIdx = newPlaylists.findIndex((p) => p.filterType === 'genre' && p.filterValue === genre);
        if (existingIdx !== -1) {
          newPlaylists[existingIdx] = {
            ...newPlaylists[existingIdx],
            trackIds: gTracks,
            updatedAt: Date.now(),
          };
        } else {
          newPlaylists.push({
            id: `smart-genre-${genre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            title: `${genre} Collective`,
            description: `Auto-organized collection of ${genre} tracks`,
            trackIds: gTracks,
            isSmartAuto: true,
            filterType: 'genre',
            filterValue: genre,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      });

      // Build mood playlists
      const moodSet = new Set(updatedTracks.map((t) => t.mood));
      moodSet.forEach((mood) => {
        const mTracks = updatedTracks.filter((t) => t.mood === mood).map((t) => t.id);
        const existingIdx = newPlaylists.findIndex((p) => p.filterType === 'mood' && p.filterValue === mood);
        if (existingIdx !== -1) {
          newPlaylists[existingIdx] = {
            ...newPlaylists[existingIdx],
            trackIds: mTracks,
            updatedAt: Date.now(),
          };
        } else {
          newPlaylists.push({
            id: `smart-mood-${mood.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            title: `${mood} Flow`,
            description: `Auto-sorted playlist for ${mood} states`,
            trackIds: mTracks,
            isSmartAuto: true,
            filterType: 'mood',
            filterValue: mood,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      });

      setPlaylists(newPlaylists);
      await idbSavePlaylists(newPlaylists);

      setOrganizeStatus('Successfully organized library!');
      setTimeout(() => {
        setIsOrganizing(false);
        setOrganizeStatus(null);
      }, 1500);
    } catch (err) {
      console.error('Auto organize error:', err);
      setIsOrganizing(false);
      setOrganizeStatus(null);
    }
  };

  // Import YouTube link (with backend and client-side fallback for static Vercel)
  const importYouTubeUrl = async (url: string): Promise<Track> => {
    let resolvedTrack: Track | null = null;

    try {
      const res = await fetch('/api/youtube/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.track) {
          resolvedTrack = data.track;
        }
      }
    } catch (apiErr) {
      console.warn('API resolve endpoint not reachable, using client-side resolver:', apiErr);
    }

    if (!resolvedTrack) {
      resolvedTrack = await resolveMediaLinkClient(url);
    }

    // Classify
    const classified = classifyTrackHeuristic(resolvedTrack.title, resolvedTrack.artist, resolvedTrack.tags);
    const enriched: Track = {
      ...resolvedTrack,
      genre: resolvedTrack.genre || classified.genre,
      mood: resolvedTrack.mood || classified.mood,
      energyLevel: resolvedTrack.energyLevel || classified.energyLevel,
      vibeDescription: resolvedTrack.vibeDescription || classified.vibeDescription,
    };

    const updatedTracks = [enriched, ...tracks.filter((t) => t.id !== enriched.id)];
    setTracks(updatedTracks);
    await idbSaveTrack(enriched);
    return enriched;
  };

  // Import local audio file
  const importLocalAudioFile = async (file: File): Promise<Track> => {
    const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    const classified = classifyTrackHeuristic(cleanTitle, 'Local Import');

    const newTrack: Track = {
      id,
      title: cleanTitle,
      artist: 'Local Import',
      platform: 'local',
      sourceUrl: '',
      duration: 180, // estimated until metadata loads
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      genre: classified.genre,
      mood: classified.mood,
      tags: ['local', 'offline', 'audio'],
      energyLevel: classified.energyLevel,
      isOfflineReady: true,
      downloadDate: Date.now(),
      addedAt: Date.now(),
    };

    // Save audio blob into IndexedDB
    const { idbSaveAudioBlob } = await import('../lib/idb');
    await idbSaveAudioBlob(id, file);
    await idbSaveTrack(newTrack);

    setTracks((prev) => [newTrack, ...prev]);
    return newTrack;
  };

  const handleSetOfflineModeOnly = (enabled: boolean) => {
    setIsOfflineModeOnly(enabled);
    idbSetSetting('offlineMode', enabled);
  };

  return (
    <MusicContext.Provider
      value={{
        tracks,
        playlists,
        playerState,
        queue,
        queueIndex,
        activeView,
        setActiveView,
        selectedPlaylistId,
        setSelectedPlaylistId,
        selectedGenreFilter,
        setSelectedGenreFilter,
        selectedMoodFilter,
        setSelectedMoodFilter,
        isOfflineModeOnly,
        setIsOfflineModeOnly: handleSetOfflineModeOnly,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchPlatformFilter,
        setSearchPlatformFilter,
        searchPlatforms,
        downloadsProgress,
        isOrganizing,
        organizeStatus,
        activeChannel,
        setActiveChannel,
        exploreChannel,
        playTrack,
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
        playPrev,
        smartPlayPrev,
        toggleLike,
        isTrackLiked,
        addToQueue,
        removeFromQueue,
        clearQueue,
        createPlaylist,
        addTrackToPlaylist,
        addLinkToPlaylist,
        addTrackAndSaveToPlaylist,
        removeTrackFromPlaylist,
        deletePlaylist,
        downloadTrackForOffline,
        removeOfflineTrack,
        autoOrganizeLibrary,
        importYouTubeUrl,
        importLocalAudioFile,
        isUrlModalOpen,
        setIsUrlModalOpen,
        targetPlaylistForImport,
        setTargetPlaylistForImport,
        isEqualizerOpen,
        setIsEqualizerOpen,
        isSleepTimerOpen,
        setIsSleepTimerOpen,
        isQueueOpen,
        setIsQueueOpen,
        isSmartVibeModalOpen,
        setIsSmartVibeModalOpen,
        trackToAddPlaylist,
        setTrackToAddPlaylist,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
