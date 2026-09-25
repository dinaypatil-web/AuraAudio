import React, { useState } from 'react';
import { X, FolderPlus, Plus, Check } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export const AddToPlaylistModal: React.FC = () => {
  const {
    trackToAddPlaylist,
    setTrackToAddPlaylist,
    playlists,
    addTrackAndSaveToPlaylist,
    createPlaylist,
  } = useMusic();

  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!trackToAddPlaylist) return null;

  const handleSelectPlaylist = async (playlistId: string) => {
    await addTrackAndSaveToPlaylist(trackToAddPlaylist, playlistId);
    setSuccessMsg('Added to playlist!');
    setTimeout(() => {
      setSuccessMsg(null);
      setTrackToAddPlaylist(null);
    }, 800);
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const pl = await createPlaylist(newTitle.trim());
    await addTrackAndSaveToPlaylist(trackToAddPlaylist, pl.id);
    setNewTitle('');
    setIsCreating(false);
    setSuccessMsg('Created playlist & added track!');
    setTimeout(() => {
      setSuccessMsg(null);
      setTrackToAddPlaylist(null);
    }, 800);
  };

  const userPlaylists = playlists.filter((p) => !p.isSmartAuto);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f111a] border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={() => setTrackToAddPlaylist(null)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FolderPlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Add to Playlist</h3>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">
              {trackToAddPlaylist.title}
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-2.5 bg-emerald-950/50 border border-emerald-700/50 rounded-lg text-xs text-emerald-300 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {userPlaylists.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">No custom playlists created yet.</p>
          ) : (
            userPlaylists.map((pl) => {
              const alreadyHas = pl.trackIds.includes(trackToAddPlaylist.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => handleSelectPlaylist(pl.id)}
                  disabled={alreadyHas}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    alreadyHas
                      ? 'bg-slate-900/40 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer border border-slate-800'
                  }`}
                >
                  <span className="truncate">{pl.title}</span>
                  {alreadyHas ? (
                    <span className="text-[10px] text-slate-500 font-mono">Already in playlist</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {pl.trackIds.length} tracks
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Create new playlist toggle */}
        {isCreating ? (
          <form onSubmit={handleCreateAndAdd} className="pt-2 border-t border-slate-800 space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New playlist name..."
              autoFocus
              className="w-full bg-slate-900 border border-indigo-500/50 text-xs text-white px-3 py-2 rounded-lg focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
              >
                Create & Add
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Playlist</span>
          </button>
        )}
      </div>
    </div>
  );
};
