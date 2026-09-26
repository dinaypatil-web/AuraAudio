import React from 'react';
import { X, ListMusic, Trash2, Play, Pause, Music } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export const QueueDrawer: React.FC = () => {
  const {
    isQueueOpen,
    setIsQueueOpen,
    queue,
    queueIndex,
    playTrack,
    playerState,
    removeFromQueue,
    clearQueue,
    exploreChannel,
  } = useMusic();

  if (!isQueueOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0f111a] border-l border-slate-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Playback Queue</h3>
          <span className="text-xs text-slate-500 font-mono">({queue.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs text-slate-400 hover:text-red-400 p-1 transition-colors"
              title="Clear queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsQueueOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {queue.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <Music className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>Queue is currently empty</p>
          </div>
        ) : (
          queue.map((track, idx) => {
            const isCurrent = idx === queueIndex;
            return (
              <div
                key={`${track.id}-${idx}`}
                className={`group flex items-center justify-between p-2 rounded-lg text-xs transition-colors border ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                    : 'hover:bg-slate-900 border-transparent text-slate-300'
                }`}
              >
                <div
                  onClick={() => playTrack(track, queue)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-9 h-9 rounded object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-medium truncate ${isCurrent ? 'text-indigo-300' : 'text-slate-200'}`}>
                      {track.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsQueueOpen(false);
                        exploreChannel(track.channelTitle || track.artist, track.channelId, track);
                      }}
                      className="text-[10px] text-slate-400 hover:text-indigo-300 hover:underline truncate cursor-pointer text-left block"
                      title={`Explore Channel: ${track.channelTitle || track.artist}`}
                    >
                      {track.channelTitle || track.artist} ↗
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isCurrent && playerState.isPlaying && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse mr-1" />
                  )}
                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from queue"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
