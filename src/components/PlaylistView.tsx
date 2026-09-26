import React, { useState } from 'react';
import {
  Play,
  Shuffle,
  Download,
  Trash2,
  Clock,
  Layers,
  Sparkles,
  Music,
  Plus,
  Search,
  Check,
  Youtube,
  Globe,
  Headphones,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Track } from '../types/music';

function formatTotalDuration(tracks: Track[]): string {
  const totalSeconds = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

export const PlaylistView: React.FC = () => {
  const {
    playlists,
    selectedPlaylistId,
    tracks,
    playTrack,
    playerState,
    removeTrackFromPlaylist,
    deletePlaylist,
    downloadTrackForOffline,
    downloadsProgress,
    setActiveView,
    addLinkToPlaylist,
    addTrackAndSaveToPlaylist,
    exploreChannel,
  } = useMusic();

  const [inputUrl, setInputUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // In-playlist search & add drawer
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inPlaylistQuery, setInPlaylistQuery] = useState('');
  const [inPlaylistResults, setInPlaylistResults] = useState<Track[]>([]);
  const [isInSearching, setIsInSearching] = useState(false);

  const playlist = playlists.find((p) => p.id === selectedPlaylistId);

  if (!playlist) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No playlist selected.</p>
      </div>
    );
  }

  // Resolve playlist tracks
  let playlistTracks: Track[] = [];
  if (playlist.filterType === 'offline') {
    playlistTracks = tracks.filter((t) => t.isOfflineReady);
  } else if (playlist.filterType === 'mood') {
    playlistTracks = tracks.filter((t) => t.mood === playlist.filterValue);
  } else if (playlist.filterType === 'genre') {
    playlistTracks = tracks.filter((t) => t.genre === playlist.filterValue);
  } else {
    playlistTracks = playlist.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter(Boolean) as Track[];
  }

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) {
      playTrack(playlistTracks[0], playlistTracks);
    }
  };

  const handleShufflePlay = () => {
    if (playlistTracks.length > 0) {
      const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleDownloadAll = async () => {
    for (const t of playlistTracks) {
      if (!t.isOfflineReady) {
        await downloadTrackForOffline(t);
      }
    }
  };

  // Add Link Directly to this Playlist
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsAddingLink(true);
    setLinkError(null);

    try {
      const imported = await addLinkToPlaylist(playlist.id, inputUrl.trim());
      setInputUrl('');
      setSuccessNotice(`Added "${imported.title.slice(0, 30)}..." to playlist!`);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      setLinkError(err.message || 'Failed to resolve link. Please verify URL.');
    } finally {
      setIsAddingLink(false);
    }
  };

  // In-Playlist Search
  const handleInPlaylistSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = inPlaylistQuery.trim();
    if (!q) return;

    setIsInSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&platform=all`);
      if (res.ok) {
        const data = await res.json();
        setInPlaylistResults(data.tracks || []);
      }
    } catch (err) {
      console.warn('In playlist search error:', err);
    } finally {
      setIsInSearching(false);
    }
  };

  const handleAddSearchResult = async (track: Track) => {
    await addTrackAndSaveToPlaylist(track, playlist.id);
    setSuccessNotice(`Added "${track.title.slice(0, 25)}..."!`);
    setTimeout(() => setSuccessNotice(null), 2500);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Toast Notification */}
      {successNotice && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950/90 border border-emerald-600/60 text-emerald-200 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Playlist Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 bg-gradient-to-b from-indigo-950/30 to-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="w-36 h-36 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xl">
          {playlistTracks.length > 0 && playlistTracks[0].coverUrl ? (
            <img
              src={playlistTracks[0].coverUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Layers className="w-14 h-14 text-slate-700" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400">
              {playlist.isSmartAuto ? 'Smart Auto Playlist' : 'Custom Playlist'}
            </span>
            {playlist.isSmartAuto && <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
          </div>

          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white truncate">
            {playlist.title}
          </h2>

          <p className="text-xs text-slate-400 max-w-xl">
            {playlist.description || 'Custom collection organized for background listening.'}
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono pt-1">
            <span>{playlistTracks.length} tracks</span>
            <span aria-hidden="true">·</span>
            <span>{formatTotalDuration(playlistTracks)}</span>
          </div>
        </div>
      </div>

      {/* Direct "Paste Link to Playlist" Bar */}
      {!playlist.isSmartAuto && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <LinkIcon className="w-4 h-4 text-indigo-400" />
              <span>Add YouTube Video or Audio Link directly to this Playlist</span>
            </div>
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearchOpen ? 'Hide Search' : 'Search & Add from YouTube / Web'}</span>
            </button>
          </div>

          <form onSubmit={handleAddLink} className="flex items-center gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube link (https://www.youtube.com/watch?v=...) or direct audio URL"
              className="flex-1 bg-slate-950/80 border border-slate-700 text-xs text-white px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={isAddingLink || !inputUrl.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingLink ? 'Adding...' : 'Add Link to Playlist'}</span>
            </button>
          </form>

          {linkError && (
            <p className="text-xs text-red-400">{linkError}</p>
          )}

          {/* In-playlist Live Search Drawer */}
          {isSearchOpen && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <form onSubmit={handleInPlaylistSearch} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={inPlaylistQuery}
                    onChange={(e) => setInPlaylistQuery(e.target.value)}
                    placeholder="Search YouTube or audio platforms to add to this playlist..."
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-white pl-9 pr-3.5 py-2 rounded-lg focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isInSearching || !inPlaylistQuery.trim()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {isInSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {inPlaylistResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {inPlaylistResults.map((result, idx) => {
                    const alreadyIn = playlist.trackIds.includes(result.id);
                    return (
                      <div
                        key={`${result.id}-${idx}`}
                        className="flex items-center justify-between p-2 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={result.coverUrl}
                            alt={result.title}
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="font-medium text-slate-200 truncate">{result.title}</h5>
                            <p className="text-[10px] text-slate-400 truncate">
                              {result.artist} · {result.genre}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddSearchResult(result)}
                          disabled={alreadyIn}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ml-3 ${
                            alreadyIn
                              ? 'bg-slate-800 text-slate-500 cursor-default'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          {alreadyIn ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Playlist Action Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayAll}
            disabled={playlistTracks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Play All</span>
          </button>

          <button
            onClick={handleShufflePlay}
            disabled={playlistTracks.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-lg border border-slate-800 transition-colors cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-slate-400" />
            <span>Shuffle</span>
          </button>

          <button
            onClick={handleDownloadAll}
            disabled={playlistTracks.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-lg border border-slate-800 transition-colors cursor-pointer"
            title="Download all tracks for offline playback"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download All</span>
          </button>
        </div>

        {!playlist.isSmartAuto && (
          <button
            onClick={() => deletePlaylist(playlist.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Delete this playlist"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Playlist</span>
          </button>
        )}
      </div>

      {/* Tracks Table */}
      {playlistTracks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 space-y-3">
          <Music className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">This playlist is empty</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Paste a YouTube video link above or search across YouTube & audio platforms to add your favorite tracks.
          </p>
          <button
            onClick={() => setActiveView('explore')}
            className="px-3.5 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium hover:bg-indigo-600/30 transition-colors cursor-pointer"
          >
            Explore Music & Podcasts
          </button>
        </div>
      ) : (
        <div className="space-y-1 bg-slate-900/40 border border-slate-800/80 rounded-xl p-3">
          {playlistTracks.map((track, idx) => {
            const isCurrent = playerState.currentTrack?.id === track.id;
            const isPlaying = isCurrent && playerState.isPlaying;

            return (
              <div
                key={`${track.id}-${idx}`}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-colors border ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                    : 'hover:bg-slate-900/80 border-transparent hover:border-slate-800 text-slate-300'
                }`}
              >
                <div className="w-8 flex items-center justify-center">
                  <button
                    onClick={() => playTrack(track, playlistTracks)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 group-hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    ) : (
                      <span className="group-hover:hidden font-mono text-[11px] text-slate-500">{idx + 1}</span>
                    )}
                    <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block ml-0.5" />
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
                      onClick={() => playTrack(track, playlistTracks)}
                      className={`font-semibold truncate cursor-pointer hover:underline ${
                        isCurrent ? 'text-indigo-300' : 'text-slate-100'
                      }`}
                    >
                      {track.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exploreChannel(track.channelTitle || track.artist, track.channelId, track);
                      }}
                      className="text-[11px] text-slate-400 hover:text-indigo-300 hover:underline truncate cursor-pointer text-left inline-flex items-center gap-1 transition-colors"
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
                  <span className="text-indigo-400">{track.mood}</span>
                </div>

                <div className="w-16 text-right font-mono text-[11px] text-slate-400">
                  {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                </div>

                <div className="flex items-center gap-1.5 ml-4">
                  {!playlist.isSmartAuto && (
                    <button
                      onClick={() => removeTrackFromPlaylist(playlist.id, track.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove from playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
