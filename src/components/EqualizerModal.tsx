import React, { useState, useEffect, useRef } from 'react';
import { X, Sliders, Activity, RotateCcw } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { audioManager } from '../lib/audioManager';
import { EqualizerBands } from '../types/music';

const PRESETS = ['Flat', 'Bass Boost', 'Electronic', 'Acoustic', 'Lo-Fi Vibe', 'Vocal'];

export const EqualizerModal: React.FC = () => {
  const { isEqualizerOpen, setIsEqualizerOpen, playerState } = useMusic();
  const [activePreset, setActivePreset] = useState<string>(playerState.equalizerPreset || 'Flat');
  const [bands, setBands] = useState<EqualizerBands>({
    subBass: 0,
    bass: 0,
    mid: 0,
    upperMid: 0,
    treble: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEqualizerOpen) return;

    // Draw live frequency analyser bars
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const data = audioManager.getVisualizerData();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (data && data.length > 0) {
        const barWidth = (canvas.width / 40) - 2;
        for (let i = 0; i < 40; i++) {
          const val = data[i] || 0;
          const barHeight = (val / 255) * (canvas.height - 10);

          const barGrad = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
          barGrad.addColorStop(0, '#818cf8');
          barGrad.addColorStop(1, '#4f46e5');
          ctx.fillStyle = barGrad;
          ctx.fillRect(i * (barWidth + 2), canvas.height - barHeight, barWidth, barHeight);
        }
      } else {
        // Subtle idle line
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isEqualizerOpen]);

  if (!isEqualizerOpen) return null;

  const handlePresetSelect = (preset: string) => {
    setActivePreset(preset);
    audioManager.applyEqualizerPreset(preset);
  };

  const handleBandChange = (key: keyof EqualizerBands, value: number) => {
    const updated = { ...bands, [key]: value };
    setBands(updated);
    setActivePreset('Custom');
    audioManager.setEqualizerBands(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f111a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={() => setIsEqualizerOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Audio Equalizer & Live Visualizer</h3>
            <p className="text-xs text-slate-400">5-Band Web Audio frequency response</p>
          </div>
        </div>

        {/* Live Spectrum Display */}
        <div className="rounded-xl overflow-hidden border border-slate-800">
          <canvas ref={canvasRef} width={460} height={100} className="w-full h-24 block" />
        </div>

        {/* Preset Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Acoustic Presets
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetSelect(preset)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-center ${
                  activePreset === preset
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* 5-Band Sliders */}
        <div className="pt-2">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Frequency Bands (-12dB to +12dB)
          </label>
          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              { key: 'subBass', label: '60 Hz', sub: 'Sub' },
              { key: 'bass', label: '250 Hz', sub: 'Bass' },
              { key: 'mid', label: '1 kHz', sub: 'Mid' },
              { key: 'upperMid', label: '4 kHz', sub: 'Presence' },
              { key: 'treble', label: '12 kHz', sub: 'Treble' },
            ].map((b) => (
              <div key={b.key} className="flex flex-col items-center space-y-2">
                <span className="text-[10px] font-mono text-indigo-400">
                  {bands[b.key as keyof EqualizerBands] > 0 ? '+' : ''}
                  {bands[b.key as keyof EqualizerBands]}dB
                </span>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={bands[b.key as keyof EqualizerBands]}
                  onChange={(e) =>
                    handleBandChange(b.key as keyof EqualizerBands, parseFloat(e.target.value))
                  }
                  className="h-28 w-2 appearance-none bg-slate-800 rounded-lg cursor-pointer accent-indigo-500 [writing-mode:vertical-lr] [direction:rtl]"
                />
                <div>
                  <div className="text-[11px] font-semibold text-slate-200">{b.sub}</div>
                  <div className="text-[10px] font-mono text-slate-500">{b.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={() => handlePresetSelect('Flat')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Flat</span>
          </button>
          <button
            onClick={() => setIsEqualizerOpen(false)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
