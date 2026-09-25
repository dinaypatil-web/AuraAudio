import React, { useState } from 'react';
import {
  Search,
  Plus,
  Moon,
  Sliders,
  Sparkles,
  WifiOff,
  Wifi,
  Radio,
  Upload,
  Clock,
  Menu,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export const Navbar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    isOfflineModeOnly,
    setIsOfflineModeOnly,
    setIsUrlModalOpen,
    setIsEqualizerOpen,
    setIsSleepTimerOpen,
    setIsSmartVibeModalOpen,
    autoOrganizeLibrary,
    isOrganizing,
    organizeStatus,
    importLocalAudioFile,
    playerState,
    activeView,
    setActiveView,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useMusic();

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      await importLocalAudioFile(files[i]);
    }
    setIsUploading(false);
    setActiveView('library');
    e.target.value = '';
  };

  const sleepRemainingMinutes = playerState.sleepTimerEndsAt
    ? Math.max(0, Math.ceil((playerState.sleepTimerEndsAt - Date.now()) / 60000))
    : null;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0d0f17]/90 backdrop-blur-md px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="p-2 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 md:hidden cursor-pointer flex-shrink-0"
        aria-label="Open Navigation Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search Bar */}
      <div className="flex-1 max-w-md relative min-w-0">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim() && activeView !== 'explore') {
                setActiveView('explore');
              }
            }}
            placeholder="Search YouTube & audio..."
            className="w-full bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-100 pl-9 pr-7 sm:pr-12 py-2 rounded-lg focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50 placeholder:text-slate-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Center status message when organizing */}
      {isOrganizing && (
        <div className="hidden lg:flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 px-3 py-1.5 rounded-lg animate-pulse">
          <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>{organizeStatus || 'Organizing library...'}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
        {/* Paste YouTube / Audio Link Button */}
        <button
          onClick={() => setIsUrlModalOpen(true)}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          title="Paste YouTube link or Audio URL for background playback"
        >
          <Plus className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Add YouTube URL</span>
          <span className="sm:hidden">URL</span>
        </button>

        {/* Upload Local Audio (Hidden on smallest mobile, shown in sidebar) */}
        <label className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5 text-slate-400" />
          <span>{isUploading ? 'Importing...' : 'Upload MP3'}</span>
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>

        {/* AI Vibe Playlist Generator */}
        <button
          onClick={() => setIsSmartVibeModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-700/50 text-indigo-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          title="Create custom playlist with AI"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Vibe</span>
        </button>

        {/* Sleep Timer */}
        <button
          onClick={() => setIsSleepTimerOpen(true)}
          className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            sleepRemainingMinutes !== null
              ? 'bg-amber-950/50 border-amber-600/50 text-amber-300'
              : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Sleep Timer (Background Auto-Stop)"
        >
          <Clock className="w-3.5 h-3.5" />
          {sleepRemainingMinutes !== null && <span>{sleepRemainingMinutes}m</span>}
        </button>

        {/* Equalizer */}
        <button
          onClick={() => setIsEqualizerOpen(true)}
          className="p-1.5 sm:p-2 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
          title="Web Audio Equalizer & Visualizer"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Offline Mode Toggle */}
        <button
          onClick={() => setIsOfflineModeOnly(!isOfflineModeOnly)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            isOfflineModeOnly
              ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
              : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-300'
          }`}
          title={isOfflineModeOnly ? 'Offline Mode Active' : 'Switch to Offline Mode'}
        >
          {isOfflineModeOnly ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Offline</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Online</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
