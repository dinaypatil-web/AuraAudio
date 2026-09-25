import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Track, Playlist, PlayerState, GenreType, MoodType } from '../types/music';
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

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void;
  toggleShuffle: () => void;
  playNext: () => void;
  playPrev: () => void;
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
}

const MusicContext = createContext<MusicContextType | null>(null);

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

  // Modals
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [targetPlaylistForImport, setTargetPlaylistForImport] = useState<string | null>(null);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isSmartVibeModalOpen, setIsSmartVibeModalOpen] = useState(false);
  const [trackToAddPlaylist, setTrackToAddPlaylist] = useState<Track | null>(null);

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
    let q = newQueue || queue;
    if (!newQueue && (!queue.some((t) => t.id === track.id) || queue.length === 0)) {
      q = [track, ...queue.filter((t) => t.id !== track.id)];
      setQueue(q);
      setQueueIndex(0);
    } else if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((t) => t.id === track.id);
      setQueueIndex(idx !== -1 ? idx : 0);
    } else {
      const idx = queue.findIndex((t) => t.id === track.id);
      setQueueIndex(idx);
    }

    await audioManager.playTrack(track);

    // Update track play count and last played
    const updated = {
      ...track,
      playCount: (track.playCount || 0) + 1,
      lastPlayedAt: Date.now(),
    };
    await idbSaveTrack(updated);
    setTracks((prev) => prev.map((t) => (t.id === track.id ? updated : t)));
  };

  const togglePlay = () => audioManager.togglePlay();
  const seek = (sec: number) => audioManager.seek(sec);
  const setVolume = (v: number) => audioManager.setVolume(v);
  const toggleMute = () => audioManager.toggleMute();
  const setRepeatMode = (m: 'off' | 'all' | 'one') => audioManager.setRepeatMode(m);
  const toggleShuffle = () => audioManager.toggleShuffle();

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
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&platform=${plat}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.tracks || []);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.warn('Search platform request error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
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

  // Import YouTube link
  const importYouTubeUrl = async (url: string): Promise<Track> => {
    const res = await fetch('/api/youtube/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to import YouTube video');
    }

    const { track } = await res.json();
    // Classify
    const classified = classifyTrackHeuristic(track.title, track.artist, track.tags);
    const enriched: Track = {
      ...track,
      genre: classified.genre,
      mood: classified.mood,
      energyLevel: classified.energyLevel,
      vibeDescription: classified.vibeDescription,
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
        playTrack,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        setRepeatMode,
        toggleShuffle,
        playNext,
        playPrev,
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
