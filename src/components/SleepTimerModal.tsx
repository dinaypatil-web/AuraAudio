import React from 'react';
import { X, Clock, Moon, Check, Ban } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { audioManager } from '../lib/audioManager';

export const SleepTimerModal: React.FC = () => {
  const { isSleepTimerOpen, setIsSleepTimerOpen, playerState } = useMusic();

  if (!isSleepTimerOpen) return null;

  const remainingMinutes = playerState.sleepTimerEndsAt
    ? Math.max(0, Math.ceil((playerState.sleepTimerEndsAt - Date.now()) / 60000))
    : null;

  const handleSetTimer = (minutes: number) => {
    audioManager.setSleepTimer(minutes);
    setIsSleepTimerOpen(false);
  };

  const handleClearTimer = () => {
    audioManager.setSleepTimer(null);
    setIsSleepTimerOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f111a] border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={() => setIsSleepTimerOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sleep Timer</h3>
            <p className="text-xs text-slate-400">Automatic volume fade & stop for night listening</p>
          </div>
        </div>

        {remainingMinutes !== null && (
          <div className="p-3 bg-amber-950/40 border border-amber-700/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <Moon className="w-4 h-4" />
              <span>Stopping in {remainingMinutes} minutes</span>
            </div>
            <button
              onClick={handleClearTimer}
              className="text-xs text-amber-400 hover:text-white underline"
            >
              Turn Off
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          {[15, 30, 45, 60, 90].map((mins) => (
            <button
              key={mins}
              onClick={() => handleSetTimer(mins)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <span>{mins} minutes</span>
              {remainingMinutes === mins && <Check className="w-4 h-4 text-amber-400" />}
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={() => setIsSleepTimerOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
