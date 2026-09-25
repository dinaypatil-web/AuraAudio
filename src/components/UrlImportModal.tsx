import React, { useState, useEffect } from 'react';
import { X, Play, Plus, Sparkles, Youtube, Globe, Check } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export const UrlImportModal: React.FC = () => {
  const {
    isUrlModalOpen,
    setIsUrlModalOpen,
    importYouTubeUrl,
    playTrack,
    playlists,
    addTrackToPlaylist,
    targetPlaylistForImport,
    setTargetPlaylistForImport,
    createPlaylist,
  } = useMusic();

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    if (targetPlaylistForImport) {
      setSelectedPlaylistId(targetPlaylistForImport);
    }
  }, [targetPlaylistForImport]);

  if (!isUrlModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const track = await importYouTubeUrl(url.trim());

      let finalPlaylistId = selectedPlaylistId;
      if (isCreatingNew && newPlaylistName.trim()) {
        const newPl = await createPlaylist(newPlaylistName.trim());
        finalPlaylistId = newPl.id;
      }

      if (finalPlaylistId) {
        await addTrackToPlaylist(finalPlaylistId, track.id);
      }

      setUrl('');
      setTargetPlaylistForImport(null);
      setIsUrlModalOpen(false);

      try {
        await playTrack(track);
      } catch (playErr) {
        console.warn('Background playback note:', playErr);
      }
    } catch (err: any) {
      setError(err.message || 'Could not import video. Please check URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const customPlaylists = playlists.filter((p) => !p.isSmartAuto);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f111a] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={() => {
            setTargetPlaylistForImport(null);
            setIsUrlModalOpen(false);
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Add YouTube, Spotify, or Audio Link</h3>
            <p className="text-xs text-slate-400">Play in background & organize into playlists</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              YouTube, Spotify, or Audio URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://open.spotify.com/track/... or https://youtube.com/watch?v=..."
              autoFocus
              className="w-full bg-slate-900 border border-slate-700 text-xs text-white px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Supports Spotify tracks & playlists, YouTube videos, Lo-Fi feeds, podcasts, and web audio.
            </p>
          </div>

          {/* Add to Playlist Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">
                Save to Playlist
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                {isCreatingNew ? 'Select Existing Playlist' : '+ Create New Playlist'}
              </button>
            </div>

            {isCreatingNew ? (
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="w-full bg-slate-900 border border-indigo-500/50 text-xs text-white px-3 py-2 rounded-lg focus:outline-none placeholder:text-slate-500"
              />
            ) : (
              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Library Only (No specific playlist) --</option>
                {customPlaylists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.trackIds.length} tracks)
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setTargetPlaylistForImport(null);
                setIsUrlModalOpen(false);
              }}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLoading ? 'Resolving Link...' : 'Play & Add to Playlist'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
