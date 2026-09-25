import React from 'react';
import {
  Compass,
  Library,
  HardDriveDownload,
  Layers,
  Plus,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export const MobileBottomNav: React.FC = () => {
  const {
    activeView,
    setActiveView,
    setSelectedPlaylistId,
    setSelectedGenreFilter,
    setSelectedMoodFilter,
    setIsUrlModalOpen,
    setIsMobileMenuOpen,
    tracks,
  } = useMusic();

  const offlineCount = tracks.filter((t) => t.isOfflineReady).length;

  const handleNav = (view: string) => {
    setActiveView(view);
    setSelectedPlaylistId(null);
    setSelectedGenreFilter(null);
    setSelectedMoodFilter(null);
  };

  return (
    <nav className="md:hidden h-14 bg-[#0a0b10] border-t border-slate-800/80 px-2 flex items-center justify-around z-30 select-none flex-shrink-0">
      <button
        onClick={() => handleNav('explore')}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
          activeView === 'explore'
            ? 'text-indigo-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Compass className="w-4 h-4" />
        <span>Explore</span>
      </button>

      <button
        onClick={() => handleNav('library')}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
          activeView === 'library'
            ? 'text-indigo-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Library className="w-4 h-4" />
        <span>Library</span>
      </button>

      {/* Central Quick Add Action */}
      <button
        onClick={() => setIsUrlModalOpen(true)}
        className="flex flex-col items-center justify-center gap-0.5 -mt-3 py-1 px-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
        title="Add YouTube or Audio Link"
      >
        <Plus className="w-5 h-5" />
      </button>

      <button
        onClick={() => handleNav('offline')}
        className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
          activeView === 'offline'
            ? 'text-emerald-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <HardDriveDownload className="w-4 h-4" />
        <span>Offline</span>
        {offlineCount > 0 && (
          <span className="absolute top-0 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>

      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
          activeView === 'playlist'
            ? 'text-indigo-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Layers className="w-4 h-4" />
        <span>Playlists</span>
      </button>
    </nav>
  );
};
