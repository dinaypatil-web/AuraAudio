import React from 'react';
import { MusicProvider, useMusic } from './context/MusicContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { ExploreView } from './components/ExploreView';
import { LibraryView } from './components/LibraryView';
import { PlaylistView } from './components/PlaylistView';
import { OfflineVaultView } from './components/OfflineVaultView';
import { ChannelView } from './components/ChannelView';
import { ChannelTreeView } from './components/ChannelTreeView';
import { UrlImportModal } from './components/UrlImportModal';
import { EqualizerModal } from './components/EqualizerModal';
import { SleepTimerModal } from './components/SleepTimerModal';
import { QueueDrawer } from './components/QueueDrawer';
import { SmartVibeModal } from './components/SmartVibeModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { MobileBottomNav } from './components/MobileBottomNav';

const AppContent: React.FC = () => {
  const { activeView } = useMusic();

  return (
    <div className="flex h-screen w-screen bg-[#0a0b10] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0e1017] to-[#0a0b10]">
          {activeView === 'explore' && <ExploreView />}
          {activeView === 'library' && <LibraryView />}
          {activeView === 'playlist' && <PlaylistView />}
          {activeView === 'offline' && <OfflineVaultView />}
          {activeView === 'channel' && <ChannelView />}
          {activeView === 'treeview' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <ChannelTreeView />
            </div>
          )}
        </main>

        {/* Unified Bottom Player */}
        <PlayerBar />

        {/* Mobile Navigation Bar */}
        <MobileBottomNav />
      </div>

      {/* Modals & Overlays */}
      <UrlImportModal />
      <EqualizerModal />
      <SleepTimerModal />
      <QueueDrawer />
      <SmartVibeModal />
      <AddToPlaylistModal />
    </div>
  );
};

export default function App() {
  return (
    <MusicProvider>
      <AppContent />
    </MusicProvider>
  );
}
