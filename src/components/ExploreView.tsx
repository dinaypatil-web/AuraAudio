import React, { useState } from 'react';
import {
  Play,
  Pause,
  Plus,
  Radio,
  Download,
  CheckCircle,
  FolderPlus,
  Compass,
  Sparkles,
  Search,
  ExternalLink,
  Flame,
  Globe,
  Youtube,
  Headphones,
  Check,
  ListMusic,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Track } from '../types/music';

export const ExploreView: React.FC = () => {
  const {
    tracks,
    playTrack,
    playerState,
    addToQueue,
    downloadTrackForOffline,
    downloadsProgress,
    setTrackToAddPlaylist,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchPlatformFilter,
    setSearchPlatformFilter,
    isOfflineModeOnly,
    importYouTubeUrl,
    playlists,
    addTrackToPlaylist,
    addTrackAndSaveToPlaylist,
  } = useMusic();

  const [quickUrl, setQuickUrl] = useState('');
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const handleQuickImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;
    setIsResolving(true);
    try {
      const imported = await importYouTubeUrl(quickUrl.trim());
      if (targetPlaylistId) {
        await addTrackToPlaylist(targetPlaylistId, imported.id);
        const pl = playlists.find((p) => p.id === targetPlaylistId);
        setAddedNotice(`Added "${imported.title.slice(0, 30)}..." to ${pl?.title || 'playlist'}!`);
      } else {
        setAddedNotice(`Imported "${imported.title.slice(0, 30)}..."!`);
      }
      setQuickUrl('');
      await playTrack(imported);
      setTimeout(() => setAddedNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to resolve link. Please verify URL.');
    } finally {
      setIsResolving(false);
    }
  };

  const handle1ClickAddToPlaylist = async (track: Track, playlistId: string) => {
    await addTrackAndSaveToPlaylist(track, playlistId);
    const pl = playlists.find((p) => p.id === playlistId);
    setAddedNotice(`Added to "${pl?.title || 'playlist'}"!`);
    setTimeout(() => setAddedNotice(null), 2500);
  };

  // Determine active displayed tracks
  const isSearchActive = searchQuery.trim().length > 0;

  // Curated tracks fallback/browse
  let curatedFiltered = tracks;
  if (isOfflineModeOnly) {
    curatedFiltered = curatedFiltered.filter((t) => t.isOfflineReady);
  }
  if (searchPlatformFilter !== 'all') {
    curatedFiltered = curatedFiltered.filter((t) => t.platform === searchPlatformFilter);
  }

  // Active search display list (combines server search results with local tracks)
  let activeDisplayTracks: Track[] = [];
  if (isSearchActive) {
    const q = searchQuery.toLowerCase().trim();
    const localMatches = tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.mood.toLowerCase().includes(q)
    );

    // Merge searchResults with local matches
    const seen = new Set<string>();
    const merged = [...searchResults, ...localMatches].filter((t) => {
      if (seen.has(t.id) || (t.youtubeId && seen.has(t.youtubeId))) return false;
      seen.add(t.id);
      if (t.youtubeId) seen.add(t.youtubeId);
      return true;
    });

    activeDisplayTracks = isOfflineModeOnly ? merged.filter((t) => t.isOfflineReady) : merged;
  }

  const liveRadios = curatedFiltered.filter((t) => t.isStream);
  const focusTracks = curatedFiltered.filter((t) => t.mood === 'Focus & Study');
  const chillTracks = curatedFiltered.filter((t) => t.mood === 'Chill & Relax');
  const workoutTracks = curatedFiltered.filter((t) => t.mood === 'Workout & Energy');
  const ambientTracks = curatedFiltered.filter((t) => t.genre === 'Ambient' || t.mood === 'Sleep & Night');

  const customPlaylists = playlists.filter((p) => !p.isSmartAuto);

  const renderTrackCard = (track: Track, queueList: Track[]) => {
    const isCurrent = playerState.currentTrack?.id === track.id;
    const isPlaying = isCurrent && playerState.isPlaying;
    const isDownloading = downloadsProgress[track.id] !== undefined;

    return (
      <div
        key={track.id}
        className={`group relative bg-slate-900/60 hover:bg-slate-900/95 border rounded-xl p-3 transition-all duration-200 flex flex-col ${
          isCurrent ? 'border-indigo-500/60 shadow-lg shadow-indigo-950/30' : 'border-slate-800/80 hover:border-slate-700'
        }`}
      >
        {/* Cover with Play Overlay */}
        <div className="relative aspect-video sm:aspect-square w-full rounded-lg overflow-hidden bg-slate-950 mb-2.5">
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Platform Tag */}
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono font-medium text-slate-200 border border-white/10 flex items-center gap-1">
            {track.platform === 'youtube' ? (
              <>
                <Youtube className="w-3 h-3 text-red-400" />
                <span>YouTube</span>
              </>
            ) : track.platform === 'podcast' ? (
              <>
                <Headphones className="w-3 h-3 text-purple-400" />
                <span>Podcast</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3 text-sky-400" />
                <span>Web Audio</span>
              </>
            )}
          </div>

          {/* Offline Ready Tag */}
          {track.isOfflineReady && (
            <div className="absolute top-2 right-2 p-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
              <CheckCircle className="w-3 h-3" />
            </div>
          )}

          {/* Hover Play Button */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => playTrack(track, queueList)}
              className="w-11 h-11 rounded-full bg-white hover:bg-indigo-50 text-slate-950 flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer"
              title="Play in Background"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h4
              onClick={() => playTrack(track, queueList)}
              className="text-xs font-semibold text-white line-clamp-1 hover:text-indigo-300 cursor-pointer"
              title={track.title}
            >
              {track.title}
            </h4>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{track.artist}</p>
          </div>

          {/* Clean metadata (no pill enclosures) */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/60">
            <span>{track.genre}</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-400 truncate">{track.mood}</span>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between mt-2 pt-1 gap-1">
            <button
              onClick={() => addToQueue(track)}
              className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              + Queue
            </button>

            <div className="flex items-center gap-1">
              {/* Add to Playlist button */}
              <button
                onClick={() => setTrackToAddPlaylist(track)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 rounded text-[11px] font-medium transition-colors cursor-pointer border border-slate-700/60"
                title="Add to Custom Playlist"
              >
                <FolderPlus className="w-3 h-3 text-indigo-400" />
                <span>+ Playlist</span>
              </button>

              <button
                onClick={() => downloadTrackForOffline(track)}
                disabled={track.isOfflineReady || isDownloading}
                className={`p-1 rounded transition-colors ${
                  track.isOfflineReady
                    ? 'text-emerald-400'
                    : isDownloading
                    ? 'text-indigo-400 animate-spin'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                }`}
                title={track.isOfflineReady ? 'Offline ready' : 'Download for offline playback'}
              >
                {track.isOfflineReady ? <CheckCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-16">
      {/* Toast Notification */}
      {addedNotice && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950/90 border border-emerald-600/60 text-emerald-200 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{addedNotice}</span>
        </div>
      )}

      {/* Hero Stream & URL Importer + Playlist Assignment */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30 p-6 lg:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-700/40 px-2.5 py-1 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Explore, Search & Add Links to Playlists</span>
          </div>

          <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
            Listen in the background & build your playlists.
          </h2>

          <p className="text-xs lg:text-sm text-slate-300 leading-relaxed">
            Search YouTube videos, podcasts, and open audio streams in real-time, or paste any link to immediately listen
            in the background and attach it directly to a custom playlist.
          </p>

          {/* Fast Link Form with Optional Playlist Target */}
          <form onSubmit={handleQuickImport} className="space-y-2 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="Paste YouTube or Audio URL (e.g. https://www.youtube.com/watch?v=...)"
                className="flex-1 bg-slate-950/80 border border-slate-700 text-xs lg:text-sm text-white px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
              />

              {/* Playlist target selector */}
              {customPlaylists.length > 0 && (
                <select
                  value={targetPlaylistId}
                  onChange={(e) => setTargetPlaylistId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Add to: (Library Only)</option>
                  {customPlaylists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      Add to: {pl.title}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="submit"
                disabled={isResolving || !quickUrl.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs lg:text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isResolving ? 'Resolving...' : targetPlaylistId ? 'Add to Playlist' : 'Play & Save'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Platform Tabs & Live Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* Platform Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
          <button
            onClick={() => setSearchPlatformFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              searchPlatformFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Platforms
          </button>
          <button
            onClick={() => setSearchPlatformFilter('youtube')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              searchPlatformFilter === 'youtube'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube Videos</span>
          </button>
          <button
            onClick={() => setSearchPlatformFilter('web_audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              searchPlatformFilter === 'web_audio'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Royalty-Free Audio</span>
          </button>
          <button
            onClick={() => setSearchPlatformFilter('podcast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              searchPlatformFilter === 'podcast'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Podcasts</span>
          </button>
        </div>

        {/* Live Search status */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          {isSearching ? (
            <div className="flex items-center gap-2 text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Searching live platforms...</span>
            </div>
          ) : isSearchActive ? (
            <span>Found {activeDisplayTracks.length} live results</span>
          ) : (
            <span>{curatedFiltered.length} tracks in catalog</span>
          )}
        </div>
      </div>

      {/* --- LIVE SEARCH RESULTS SECTION (If searching) --- */}
      {isSearchActive ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Search Results for "{searchQuery}"</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Explore videos & tracks across YouTube & audio platforms. Click "+ Playlist" to save to any playlist.
              </p>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Back to Catalog
            </button>
          </div>

          {isSearching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-64 bg-slate-900/60 rounded-xl border border-slate-800" />
              ))}
            </div>
          ) : activeDisplayTracks.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">No results found for "{searchQuery}"</p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching for specific artists, genres (e.g. "lofi", "synthwave"), or paste a direct YouTube URL above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeDisplayTracks.map((t) => renderTrackCard(t, activeDisplayTracks))}
            </div>
          )}
        </section>
      ) : (
        /* --- CURATED EXPLORE SECTIONS --- */
        <>
          {/* 1. Live Continuous Background Radios */}
          {liveRadios.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-semibold text-white">Live Continuous Streams & 24/7 Radios</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">Uninterrupted Background</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {liveRadios.map((t) => renderTrackCard(t, curatedFiltered))}
              </div>
            </section>
          )}

          {/* 2. Deep Focus & Study Essentials */}
          {focusTracks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Deep Focus & Study Flows</h3>
                <span className="text-xs text-slate-400 font-mono">{focusTracks.length} items</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {focusTracks.map((t) => renderTrackCard(t, curatedFiltered))}
              </div>
            </section>
          )}

          {/* 3. Chill & Relax */}
          {chillTracks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Chill & Ambient Downtime</h3>
                <span className="text-xs text-slate-400 font-mono">{chillTracks.length} items</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {chillTracks.map((t) => renderTrackCard(t, curatedFiltered))}
              </div>
            </section>
          )}

          {/* 4. Workout & High Energy */}
          {workoutTracks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Workout & High-Energy Phonk</h3>
                <span className="text-xs text-slate-400 font-mono">{workoutTracks.length} items</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {workoutTracks.map((t) => renderTrackCard(t, curatedFiltered))}
              </div>
            </section>
          )}

          {/* 5. Sleep & Ambient Soundscapes */}
          {ambientTracks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Sleep, Nature & Binaural Frequencies</h3>
                <span className="text-xs text-slate-400 font-mono">{ambientTracks.length} items</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {ambientTracks.map((t) => renderTrackCard(t, curatedFiltered))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
