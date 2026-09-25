import React, { useState } from 'react';
import { X, Sparkles, Play, Plus, Music } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Playlist } from '../types/music';

const VIBE_SUGGESTIONS = [
  'Midnight cyber coding with dark synthwave',
  'Sunday morning acoustic coffee & gentle rain',
  'Intense barbell PR workout energy',
  'Deep sleep binaural theta frequencies',
  'Golden hour retro city pop cruise',
];

export const SmartVibeModal: React.FC = () => {
  const {
    isSmartVibeModalOpen,
    setIsSmartVibeModalOpen,
    tracks,
    createPlaylist,
    addTrackToPlaylist,
    playTrack,
    setSelectedPlaylistId,
    setActiveView,
  } = useMusic();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    playlistTitle: string;
    description: string;
    recommendedTrackIds: string[];
  } | null>(null);

  if (!isSmartVibeModalOpen) return null;

  const handleGenerate = async (queryText?: string) => {
    const textToUse = queryText || prompt;
    if (!textToUse.trim()) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const res = await fetch('/api/ai/smart-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToUse,
          availableTracks: tracks,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        throw new Error('Could not generate playlist');
      }
    } catch (err) {
      console.warn('Fallback generating local vibe playlist');
      // Fallback matching
      const q = textToUse.toLowerCase();
      const matched = tracks
        .filter(
          (t) =>
            t.mood.toLowerCase().includes(q) ||
            t.genre.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.toLowerCase().includes(q))
        )
        .slice(0, 8);

      setResult({
        playlistTitle: `Flow: ${textToUse.slice(0, 24)}`,
        description: `Handcrafted flow for "${textToUse}"`,
        recommendedTrackIds: (matched.length > 0 ? matched : tracks.slice(0, 6)).map((t) => t.id),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndPlay = async () => {
    if (!result) return;
    const pl = await createPlaylist(result.playlistTitle, result.description);
    for (const id of result.recommendedTrackIds) {
      await addTrackToPlaylist(pl.id, id);
    }

    const matchedTracks = result.recommendedTrackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter(Boolean) as any[];

    if (matchedTracks.length > 0) {
      await playTrack(matchedTracks[0], matchedTracks);
    }

    setSelectedPlaylistId(pl.id);
    setActiveView('playlist');
    setIsSmartVibeModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f111a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={() => setIsSmartVibeModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Vibe Playlist Generator</h3>
            <p className="text-xs text-slate-400">
              Describe your mood or setting to curate an auto-ordered playlist
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Late night coding in rain, chill lo-fi with heavy rain sounds..."
              className="w-full bg-slate-900 border border-slate-700 text-xs text-white px-3.5 py-3 rounded-lg focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerate();
              }}
            />
          </div>

          {/* Preset Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {VIBE_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                onClick={() => {
                  setPrompt(sug);
                  handleGenerate(sug);
                }}
                className="text-[11px] px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-md transition-colors cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Curating Flow...' : 'Generate Playlist'}</span>
          </button>
        </div>

        {/* Result preview */}
        {result && (
          <div className="p-4 bg-slate-900/60 border border-indigo-500/30 rounded-xl space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-indigo-300">{result.playlistTitle}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{result.description}</p>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                {result.recommendedTrackIds.length} tracks selected & ordered
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleSaveAndPlay}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Save & Play Now</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
