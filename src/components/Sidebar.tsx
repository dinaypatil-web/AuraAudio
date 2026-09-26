import React, { useState } from 'react';
import {
  Compass,
  Library,
  HardDriveDownload,
  Heart,
  Plus,
  Trash2,
  FolderSync,
  Layers,
  Sparkles,
  Music,
  Headphones,
  Zap,
  Coffee,
  Dumbbell,
  Bed,
  CloudRain,
  Sun,
  Activity,
  ChevronRight,
  X,
  Radio,
  FolderTree,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { GenreType, MoodType } from '../types/music';

const MOODS_LIST: { name: MoodType; icon: React.ReactNode; color: string }[] = [
  { name: 'Focus & Study', icon: <Headphones className="w-3.5 h-3.5" />, color: 'text-indigo-400' },
  { name: 'Chill & Relax', icon: <Coffee className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  { name: 'Workout & Energy', icon: <Dumbbell className="w-3.5 h-3.5" />, color: 'text-amber-400' },
  { name: 'Sleep & Night', icon: <Bed className="w-3.5 h-3.5" />, color: 'text-sky-400' },
  { name: 'Melancholy & Rainy', icon: <CloudRain className="w-3.5 h-3.5" />, color: 'text-blue-400' },
  { name: 'Euphoric & Uplifting', icon: <Sun className="w-3.5 h-3.5" />, color: 'text-orange-400' },
  { name: 'Creative Flow', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-purple-400' },
];

const GENRES_LIST: GenreType[] = [
  'Lo-Fi',
  'Synthwave',
  'Electronic',
  'Hip-Hop',
  'Rock & Indie',
  'Classical & Piano',
  'Ambient',
  'Pop',
  'Jazz & Soul',
];

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    playlists,
    selectedPlaylistId,
    setSelectedPlaylistId,
    selectedGenreFilter,
    setSelectedGenreFilter,
    selectedMoodFilter,
    setSelectedMoodFilter,
    createPlaylist,
    deletePlaylist,
    tracks,
    autoOrganizeLibrary,
    isOrganizing,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    activeChannel,
  } = useMusic();

  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  const offlineCount = tracks.filter((t) => t.isOfflineReady).length;

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;
    const pl = await createPlaylist(newPlaylistTitle.trim());
    setNewPlaylistTitle('');
    setIsCreatingPlaylist(false);
    setSelectedPlaylistId(pl.id);
    setActiveView('playlist');
    setIsMobileMenuOpen(false);
  };

  const selectNav = (view: string) => {
    setActiveView(view);
    setSelectedPlaylistId(null);
    setSelectedGenreFilter(null);
    setSelectedMoodFilter(null);
    setIsMobileMenuOpen(false);
  };

  const selectMood = (mood: MoodType) => {
    setSelectedMoodFilter(mood);
    setSelectedGenreFilter(null);
    setSelectedPlaylistId(null);
    setActiveView('library');
    setIsMobileMenuOpen(false);
  };

  const selectGenre = (genre: GenreType) => {
    setSelectedGenreFilter(genre);
    setSelectedMoodFilter(null);
    setSelectedPlaylistId(null);
    setActiveView('library');
    setIsMobileMenuOpen(false);
  };

  const selectPlaylist = (id: string) => {
    setSelectedPlaylistId(id);
    setSelectedGenreFilter(null);
    setSelectedMoodFilter(null);
    setActiveView('playlist');
    setIsMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0a0b10] select-none">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              AuraWave
              <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                Audio
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Background & Offline Flow</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => selectNav('explore')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeView === 'explore' && !selectedPlaylistId && !selectedGenreFilter && !selectedMoodFilter
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Explore Platforms</span>
          </div>
        </button>

        <button
          onClick={() => selectNav('library')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeView === 'library' && !selectedPlaylistId && !selectedGenreFilter && !selectedMoodFilter
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Library className="w-4 h-4 text-sky-400" />
            <span>My Audio Library</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">{tracks.length}</span>
        </button>

        <button
          onClick={() => selectNav('offline')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeView === 'offline'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <HardDriveDownload className="w-4 h-4 text-emerald-400" />
            <span>Offline Vault</span>
          </div>
          <span className="text-[11px] text-emerald-500/80 font-mono">{offlineCount}</span>
        </button>

        <button
          onClick={() => selectNav('treeview')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeView === 'treeview'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FolderTree className="w-4 h-4 text-amber-400" />
            <span>Channel & Folder Tree</span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono">Tree</span>
        </button>

        {activeChannel && (
          <button
            onClick={() => selectNav('channel')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeView === 'channel'
                ? 'bg-red-600/20 text-red-300 border border-red-500/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Radio className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
              <span className="truncate">{activeChannel.name}</span>
            </div>
            <span className="text-[10px] text-red-400 font-mono flex-shrink-0">Channel</span>
          </button>
        )}
      </div>

      {/* Auto-Organize Action Button */}
      <div className="px-3 py-1.5">
        <button
          onClick={() => autoOrganizeLibrary(true)}
          disabled={isOrganizing}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 hover:from-indigo-900/90 hover:to-purple-900/90 border border-indigo-700/50 text-indigo-200 text-xs font-medium rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <FolderSync className={`w-3.5 h-3.5 text-indigo-400 ${isOrganizing ? 'animate-spin' : ''}`} />
          <span>{isOrganizing ? 'Auto-Organizing...' : 'Auto-Organize Library'}</span>
        </button>
      </div>

      {/* Scrollable Content: Moods, Genres, Playlists */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 text-xs text-slate-400 scrollbar-thin">
        {/* Organize by Mood */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Organized by Mood</span>
            <span className="text-[10px] text-slate-600 font-mono">AI / Auto</span>
          </div>
          <div className="space-y-0.5">
            {MOODS_LIST.map((m) => {
              const count = tracks.filter((t) => t.mood === m.name).length;
              const isSelected = selectedMoodFilter === m.name;
              return (
                <button
                  key={m.name}
                  onClick={() => selectMood(m.name)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white font-medium border-l-2 border-indigo-500'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={m.color}>{m.icon}</span>
                    <span className="truncate">{m.name}</span>
                  </div>
                  {count > 0 && <span className="text-[10px] text-slate-600 font-mono">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Organize by Genre */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Organized by Genre</span>
          </div>
          <div className="flex flex-wrap gap-1 px-1">
            {GENRES_LIST.map((genre) => {
              const count = tracks.filter((t) => t.genre === genre).length;
              const isSelected = selectedGenreFilter === genre;
              return (
                <button
                  key={genre}
                  onClick={() => selectGenre(genre)}
                  className={`px-2 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  <span>{genre}</span>
                  {count > 0 && <span className="text-slate-600 ml-1 font-mono">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Playlists */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Custom Playlists</span>
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition-colors cursor-pointer"
              title="Create Custom Playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New playlist inline form */}
          {isCreatingPlaylist && (
            <form onSubmit={handleCreatePlaylist} className="px-2 mb-2">
              <input
                type="text"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="Playlist name..."
                autoFocus
                className="w-full bg-slate-900 border border-indigo-500/50 text-xs text-white px-2 py-1.5 rounded focus:outline-none placeholder:text-slate-600"
              />
              <div className="flex items-center justify-end gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingPlaylist(false)}
                  className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          <div className="space-y-0.5">
            {playlists.map((pl) => {
              const isSelected = selectedPlaylistId === pl.id;
              return (
                <div
                  key={pl.id}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-white font-medium border-l-2 border-indigo-500'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <button
                    onClick={() => selectPlaylist(pl.id)}
                    className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{pl.title}</span>
                  </button>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-slate-600 font-mono">{pl.trackIds.length}</span>
                    {!pl.isSmartAuto && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist(pl.id);
                        }}
                        className="text-slate-600 hover:text-red-400 p-0.5 cursor-pointer"
                        title="Delete Playlist"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full border-r border-slate-800/80 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
