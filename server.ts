import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini if key exists
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
}

// Curated seed catalog across YouTube & web audio platforms
const CURATED_EXPLORE_TRACKS = [
  {
    id: 'yt-lofi-girl',
    title: 'beats to relax/study to - Lofi Hip Hop Radio',
    artist: 'Lofi Girl',
    platform: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    youtubeId: 'jfKfPfyJRdk',
    duration: 3600,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    genre: 'Lo-Fi',
    mood: 'Chill & Relax',
    tags: ['lofi', 'beats', 'study', 'relax', 'chillhop', 'sleep'],
    energyLevel: 3,
    isStream: true
  },
  {
    id: 'yt-synthwave-radio',
    title: 'Synthwave Radio - Chill synth / retro beats',
    artist: 'Lofi Girl / Synthwave Boy',
    platform: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    youtubeId: '4xDzrJKXOOY',
    duration: 3600,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    genre: 'Synthwave',
    mood: 'Focus & Study',
    tags: ['synthwave', 'retrowave', 'cyberpunk', 'focus', 'electronic', 'night'],
    energyLevel: 5,
    isStream: true
  },
  {
    id: 'yt-ambient-rain',
    title: 'Coffee Shop Ambience & Rainy Jazz Piano',
    artist: 'Calm Soundscapes',
    platform: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=VMAPTo7RVCo',
    youtubeId: 'VMAPTo7RVCo',
    duration: 7200,
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    genre: 'Ambient',
    mood: 'Melancholy & Rainy',
    tags: ['rain', 'coffee shop', 'jazz', 'piano', 'study', 'peaceful'],
    energyLevel: 2,
    isStream: false
  },
  {
    id: 'yt-workout-phonk',
    title: 'High Energy Aggressive Drift Phonk & Bass',
    artist: 'Ghost Beats',
    platform: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=z8Xk0oK52tM',
    youtubeId: 'z8Xk0oK52tM',
    duration: 2150,
    coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    genre: 'Electronic',
    mood: 'Workout & Energy',
    tags: ['phonk', 'bass', 'workout', 'gym', 'energy', 'drift'],
    energyLevel: 9,
    isStream: false
  },
  {
    id: 'yt-cyberpunk-club',
    title: 'Cyberpunk Industrial Dark Club Electro Mix',
    artist: 'Neon Nexus',
    platform: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeId: 'hTWKbfoikeg',
    duration: 3420,
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    genre: 'Electronic',
    mood: 'Creative Flow',
    tags: ['cyberpunk', 'electronic', 'club', 'dark', 'industrial', 'future'],
    energyLevel: 8,
    isStream: false
  },
  {
    id: 'yt-acoustic-sunrise',
    title: 'Morning Acoustic Guitar & Gentle Breeze',
    artist: 'Acoustic Horizon',
    platform: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    youtubeId: 'kJQP7kiw5Fk',
    duration: 1840,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    genre: 'Rock & Indie',
    mood: 'Euphoric & Uplifting',
    tags: ['acoustic', 'guitar', 'morning', 'uplifting', 'calm', 'peaceful'],
    energyLevel: 4,
    isStream: false
  },
  {
    id: 'cc-starlight-synth',
    title: 'Starlight Odyssey - Melodic Electronic Drift',
    artist: 'Cosmic Sequence',
    platform: 'web_audio',
    sourceUrl: 'https://cdn.freesound.org/previews/612/612089_11861866-lq.mp3',
    audioUrl: 'https://cdn.freesound.org/previews/612/612089_11861866-lq.mp3',
    duration: 198,
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    genre: 'Synthwave',
    mood: 'Focus & Study',
    tags: ['electronic', 'space', 'melodic', 'deep', 'synthesizer'],
    energyLevel: 6,
    isOfflineReady: true
  },
  {
    id: 'cc-deep-meditation',
    title: 'Binaural Theta Waves (432Hz) & Soft Pad',
    artist: 'Mindful Resonance',
    platform: 'web_audio',
    sourceUrl: 'https://cdn.freesound.org/previews/538/538148_97763-lq.mp3',
    audioUrl: 'https://cdn.freesound.org/previews/538/538148_97763-lq.mp3',
    duration: 320,
    coverUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
    genre: 'Ambient',
    mood: 'Sleep & Night',
    tags: ['ambient', 'meditation', 'sleep', 'theta', 'soundscape'],
    energyLevel: 1,
    isOfflineReady: true
  },
  {
    id: 'cc-groove-hop',
    title: 'Midnight Cassette - Golden Era Chillhop',
    artist: 'Vintage Drummer',
    platform: 'web_audio',
    sourceUrl: 'https://cdn.freesound.org/previews/415/415082_5121236-lq.mp3',
    audioUrl: 'https://cdn.freesound.org/previews/415/415082_5121236-lq.mp3',
    duration: 172,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    genre: 'Hip-Hop',
    mood: 'Chill & Relax',
    tags: ['hiphop', 'chillhop', 'groove', 'vinyl', 'warm'],
    energyLevel: 4,
    isOfflineReady: true
  },
  {
    id: 'cc-nordic-piano',
    title: 'Frost Solitude - Minimalist Solo Piano',
    artist: 'Elena Lindholm',
    platform: 'web_audio',
    sourceUrl: 'https://cdn.freesound.org/previews/563/563814_11861866-lq.mp3',
    audioUrl: 'https://cdn.freesound.org/previews/563/563814_11861866-lq.mp3',
    duration: 215,
    coverUrl: 'https://images.unsplash.com/photo-1520523839898-5071270ef8e7?w=600&auto=format&fit=crop&q=80',
    genre: 'Classical & Piano',
    mood: 'Melancholy & Rainy',
    tags: ['piano', 'classical', 'minimalist', 'nordic', 'solitude'],
    energyLevel: 2,
    isOfflineReady: true
  },
  {
    id: 'cc-tokyo-neon',
    title: 'Shibuya Crosswalk - Japanese City Pop & Future Funk',
    artist: 'Akira Sound System',
    platform: 'web_audio',
    sourceUrl: 'https://cdn.freesound.org/previews/585/585257_11861866-lq.mp3',
    audioUrl: 'https://cdn.freesound.org/previews/585/585257_11861866-lq.mp3',
    duration: 240,
    coverUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
    genre: 'Pop',
    mood: 'Euphoric & Uplifting',
    tags: ['city pop', 'funk', 'tokyo', 'retro', 'dance'],
    energyLevel: 7,
    isOfflineReady: true
  },
  {
    id: 'cc-deep-focus-coder',
    title: 'Terminal Velocity - Minimalist Techno for Coding',
    artist: 'Kernel Panic',
    platform: 'web_audio',
    sourceUrl: 'https://cdn.freesound.org/previews/612/612090_11861866-lq.mp3',
    audioUrl: 'https://cdn.freesound.org/previews/612/612090_11861866-lq.mp3',
    duration: 310,
    coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    genre: 'Electronic',
    mood: 'Focus & Study',
    tags: ['techno', 'coding', 'minimal', 'loop', 'focus'],
    energyLevel: 6,
    isOfflineReady: true
  }
];

// Heuristic classifier helper on the server
function serverClassifyTrack(title: string, artist: string, extraTags: string[] = []): { genre: string; mood: string; energyLevel: number } {
  const text = `${title} ${artist} ${extraTags.join(' ')}`.toLowerCase();
  let genre = 'Electronic';
  let mood = 'Focus & Study';
  let energyLevel = 5;

  if (text.includes('lofi') || text.includes('lo-fi') || text.includes('chillhop') || text.includes('relax') || text.includes('study beats')) {
    genre = 'Lo-Fi';
    mood = 'Chill & Relax';
    energyLevel = 3;
  } else if (text.includes('synth') || text.includes('retrowave') || text.includes('outrun') || text.includes('cyberpunk') || text.includes('80s')) {
    genre = 'Synthwave';
    mood = 'Focus & Study';
    energyLevel = 6;
  } else if (text.includes('rain') || text.includes('ambient') || text.includes('sleep') || text.includes('nature') || text.includes('binaural') || text.includes('meditation')) {
    genre = 'Ambient';
    mood = 'Sleep & Night';
    energyLevel = 2;
  } else if (text.includes('workout') || text.includes('gym') || text.includes('phonk') || text.includes('drift') || text.includes('bass') || text.includes('hype') || text.includes('hardstyle')) {
    genre = 'Electronic';
    mood = 'Workout & Energy';
    energyLevel = 9;
  } else if (text.includes('acoustic') || text.includes('guitar') || text.includes('folk') || text.includes('indie') || text.includes('unplugged')) {
    genre = 'Rock & Indie';
    mood = 'Euphoric & Uplifting';
    energyLevel = 4;
  } else if (text.includes('piano') || text.includes('classical') || text.includes('orchestra') || text.includes('violin') || text.includes('solitude')) {
    genre = 'Classical & Piano';
    mood = 'Melancholy & Rainy';
    energyLevel = 3;
  } else if (text.includes('hip hop') || text.includes('hiphop') || text.includes('rap') || text.includes('trap') || text.includes('boom bap')) {
    genre = 'Hip-Hop';
    mood = 'Chill & Relax';
    energyLevel = 6;
  } else if (text.includes('podcast') || text.includes('interview') || text.includes('talk') || text.includes('episode') || text.includes('discussion')) {
    genre = 'Podcast & Talk';
    mood = 'Focus & Study';
    energyLevel = 4;
  } else if (text.includes('pop') || text.includes('city pop') || text.includes('funk') || text.includes('dance')) {
    genre = 'Pop';
    mood = 'Euphoric & Uplifting';
    energyLevel = 7;
  }

  return { genre, mood, energyLevel };
}

// 1. YouTube Live Search via search scraping
async function searchYouTubeLive(query: string, maxResults: number = 15): Promise<any[]> {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const tracks: any[] = [];
    const seenIds = new Set<string>();

    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (Array.isArray(contents)) {
      for (const section of contents) {
        const itemSection = section?.itemSectionRenderer?.contents;
        if (!Array.isArray(itemSection)) continue;

        for (const item of itemSection) {
          const v = item?.videoRenderer;
          if (!v || !v.videoId || seenIds.has(v.videoId)) continue;
          seenIds.add(v.videoId);

          const videoId = v.videoId;
          const title = v.title?.runs?.[0]?.text || v.title?.simpleText || 'YouTube Video';
          const artist = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || 'YouTube Creator';
          const thumbnails = v.thumbnail?.thumbnails || [];
          const coverUrl = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          const lengthText = v.lengthText?.simpleText || '';

          let duration = 240;
          if (lengthText) {
            const parts = lengthText.split(':').map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              duration = parts[0] * 60 + parts[1];
            } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
              duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
          }

          const isStream = Array.isArray(v.badges) && v.badges.some((b: any) =>
            b.metadataBadgeRenderer?.style?.includes('LIVE') ||
            b.metadataBadgeRenderer?.label?.includes('LIVE')
          );

          const classification = serverClassifyTrack(title, artist, [query]);

          tracks.push({
            id: `yt-${videoId}`,
            title,
            artist,
            platform: 'youtube',
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            youtubeId: videoId,
            duration,
            coverUrl,
            genre: classification.genre,
            mood: classification.mood,
            tags: ['youtube', 'search', query.toLowerCase()],
            energyLevel: classification.energyLevel,
            isStream,
            addedAt: Date.now(),
          });

          if (tracks.length >= maxResults) break;
        }
        if (tracks.length >= maxResults) break;
      }
    }

    return tracks;
  } catch (err) {
    console.warn('YouTube live search error:', err);
    return [];
  }
}

// 2. Open Audio Search (iTunes audio streams & podcasts)
async function searchITunesLive(query: string, mediaType: 'music' | 'podcast' = 'music', maxResults: number = 10): Promise<any[]> {
  try {
    const entity = mediaType === 'podcast' ? 'podcast' : 'song';
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=${mediaType}&entity=${entity}&limit=${maxResults}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.results)) return [];

    return data.results.map((r: any) => {
      const isPodcast = mediaType === 'podcast';
      const title = r.trackName || r.collectionName || 'Track';
      const artist = r.artistName || 'Creator';
      const rawGenre = r.primaryGenreName || (isPodcast ? 'Podcast & Talk' : 'Pop');
      const classification = serverClassifyTrack(title, artist, [rawGenre, query]);

      return {
        id: `itunes-${r.trackId || r.collectionId}`,
        title,
        artist,
        platform: isPodcast ? 'podcast' : 'web_audio',
        sourceUrl: r.trackViewUrl || r.collectionViewUrl || '',
        audioUrl: r.previewUrl || '', // Direct audio stream for immediate play & offline caching!
        duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 180,
        coverUrl: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        genre: isPodcast ? 'Podcast & Talk' : classification.genre,
        mood: classification.mood,
        tags: [rawGenre.toLowerCase(), isPodcast ? 'podcast' : 'music', query.toLowerCase()],
        energyLevel: classification.energyLevel,
        isOfflineReady: !!r.previewUrl,
        addedAt: Date.now(),
      };
    });
  } catch (err) {
    console.warn('iTunes search error:', err);
    return [];
  }
}

// 3. Jamendo Creative Commons direct audio search
async function searchJamendoLive(query: string, maxResults: number = 8): Promise<any[]> {
  try {
    const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=json&limit=${maxResults}&search=${encodeURIComponent(query)}&include=musicinfo`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.results)) return [];

    return data.results.map((r: any) => {
      const title = r.name || 'Song';
      const artist = r.artist_name || 'Independent Artist';
      const extraTags = r.musicinfo?.tags?.genres || [];
      const classification = serverClassifyTrack(title, artist, extraTags);

      return {
        id: `jamendo-${r.id}`,
        title,
        artist,
        platform: 'web_audio',
        sourceUrl: r.shareurl || '',
        audioUrl: r.audio,
        duration: r.duration || 180,
        coverUrl: r.image || r.album_image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        genre: classification.genre,
        mood: classification.mood,
        tags: ['jamendo', 'cc-audio', ...extraTags],
        energyLevel: classification.energyLevel,
        isOfflineReady: true,
        addedAt: Date.now(),
      };
    });
  } catch (err) {
    return [];
  }
}

// Unified Multi-Platform Search Endpoint
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q || req.query.query || '') as string).trim();
    const platform = (req.query.platform as string) || 'all';
    const genre = (req.query.genre as string) || 'all';
    const mood = (req.query.mood as string) || 'all';

    if (!q) {
      return res.json({ success: true, count: 0, tracks: [] });
    }

    // Parallel multi-platform search promises
    const promises: Promise<any[]>[] = [];

    // YouTube search
    if (platform === 'all' || platform === 'youtube') {
      promises.push(searchYouTubeLive(q, 15));
    }

    // Web Audio / Music search
    if (platform === 'all' || platform === 'web_audio') {
      promises.push(searchITunesLive(q, 'music', 10));
      promises.push(searchJamendoLive(q, 8));
    }

    // Podcast search
    if (platform === 'all' || platform === 'podcast') {
      promises.push(searchITunesLive(q, 'podcast', 8));
    }

    const searchResultsArrays = await Promise.all(promises);
    let combined = searchResultsArrays.flat();

    // Include matching curated tracks
    const matchingCurated = CURATED_EXPLORE_TRACKS.filter((t) => {
      const text = `${t.title} ${t.artist} ${t.genre} ${t.mood} ${(t.tags || []).join(' ')}`.toLowerCase();
      return text.includes(q.toLowerCase());
    });
    combined = [...matchingCurated, ...combined];

    // Deduplicate by ID and URL
    const seen = new Set<string>();
    let deduplicated = combined.filter((t) => {
      if (seen.has(t.id) || (t.youtubeId && seen.has(t.youtubeId))) return false;
      seen.add(t.id);
      if (t.youtubeId) seen.add(t.youtubeId);
      return true;
    });

    // Apply genre filter
    if (genre && genre !== 'all') {
      deduplicated = deduplicated.filter(
        (t) => t.genre.toLowerCase() === genre.toLowerCase()
      );
    }

    // Apply mood filter
    if (mood && mood !== 'all') {
      deduplicated = deduplicated.filter(
        (t) => t.mood.toLowerCase() === mood.toLowerCase()
      );
    }

    res.json({
      success: true,
      query: q,
      count: deduplicated.length,
      tracks: deduplicated,
    });
  } catch (err: any) {
    console.error('Search endpoint error:', err);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// 1. Get Curated Explore Tracks
app.get('/api/explore', (req: Request, res: Response) => {
  const { query, platform, genre, mood } = req.query;
  let results = [...CURATED_EXPLORE_TRACKS];

  if (platform && platform !== 'all') {
    results = results.filter((t) => t.platform === platform);
  }

  if (genre && genre !== 'all') {
    results = results.filter(
      (t) => t.genre.toLowerCase() === (genre as string).toLowerCase()
    );
  }

  if (mood && mood !== 'all') {
    results = results.filter(
      (t) => t.mood.toLowerCase() === (mood as string).toLowerCase()
    );
  }

  if (query && typeof query === 'string' && query.trim().length > 0) {
    const q = query.toLowerCase().trim();
    results = results.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.genre.toLowerCase().includes(q) ||
        t.mood.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: results.length, tracks: results });
});

// 2. Resolve YouTube / Web Link / Metadata
app.post('/api/youtube/resolve', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    const trimmedUrl = url.trim();

    // Check if direct audio link (.mp3, .wav, .m4a, .aac, .ogg)
    if (trimmedUrl.match(/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i)) {
      const fileName = trimmedUrl.split('/').pop()?.split('?')[0] || 'Audio Stream';
      const cleanTitle = decodeURIComponent(fileName.replace(/\.(mp3|wav|m4a|aac|ogg)$/i, ''));
      const classification = serverClassifyTrack(cleanTitle, 'Web Stream');

      const track = {
        id: `web-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: cleanTitle,
        artist: 'Web Audio Stream',
        platform: 'web_audio',
        sourceUrl: trimmedUrl,
        audioUrl: trimmedUrl,
        duration: 180,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        genre: classification.genre,
        mood: classification.mood,
        tags: ['web_audio', 'stream'],
        energyLevel: classification.energyLevel,
        isOfflineReady: true,
        addedAt: Date.now(),
      };
      return res.json({ success: true, track });
    }

    // Extract YouTube ID with robust mobile & desktop URL parser
    let youtubeId = '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
      youtubeId = trimmedUrl;
    } else {
      try {
        const parsed = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
        if (parsed.searchParams.has('v')) {
          const v = parsed.searchParams.get('v');
          if (v && v.length === 11) youtubeId = v;
        }
        if (!youtubeId) {
          const pathParts = parsed.pathname.split('/').filter(Boolean);
          const last = pathParts[pathParts.length - 1];
          if (last && last.length === 11) {
            youtubeId = last;
          } else if (pathParts[0] === 'shorts' && pathParts[1] && pathParts[1].length === 11) {
            youtubeId = pathParts[1];
          }
        }
      } catch {}
    }

    if (!youtubeId) {
      const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;
      const match = trimmedUrl.match(regExp);
      if (match && match[1]) {
        youtubeId = match[1];
      }
    }

    if (!youtubeId || youtubeId.length !== 11) {
      return res.status(400).json({ error: 'Could not parse a valid YouTube Video ID or Audio URL' });
    }

    // Use YouTube oEmbed endpoint to extract real video title & author
    let title = 'YouTube Track';
    let authorName = 'YouTube Creator';
    let thumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        title = oembedData.title || title;
        authorName = oembedData.author_name || authorName;
        if (oembedData.thumbnail_url) {
          thumbnail = oembedData.thumbnail_url;
        }
      }
    } catch (oembedErr) {
      console.warn('oEmbed fetch fallback:', oembedErr);
    }

    const classification = serverClassifyTrack(title, authorName);

    const track = {
      id: `yt-${youtubeId}`,
      title,
      artist: authorName,
      platform: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      youtubeId,
      duration: 240, // estimated default
      coverUrl: thumbnail,
      genre: classification.genre,
      mood: classification.mood,
      tags: ['youtube', 'audio'],
      energyLevel: classification.energyLevel,
      isStream: false,
      addedAt: Date.now(),
    };

    res.json({ success: true, track });
  } catch (err: any) {
    console.error('Resolve error:', err);
    res.status(500).json({ error: err.message || 'Failed to resolve link' });
  }
});

// 3. AI Categorize and Auto-Organize Tracks (via Gemini 3.8 Flash)
app.post('/api/ai/categorize', async (req: Request, res: Response) => {
  try {
    const { tracks } = req.body;
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({ error: 'No tracks provided for categorization' });
    }

    if (!aiClient) {
      // Return heuristic categorization if no Gemini key
      const fallbackCategorized = tracks.map((t: any) => {
        const text = `${t.title} ${t.artist} ${(t.tags || []).join(' ')}`.toLowerCase();
        let genre = 'Electronic';
        let mood = 'Focus & Study';

        if (text.includes('lofi') || text.includes('chillhop') || text.includes('relax') || text.includes('study')) {
          genre = 'Lo-Fi';
          mood = 'Chill & Relax';
        } else if (text.includes('synth') || text.includes('retro') || text.includes('wave') || text.includes('cyber')) {
          genre = 'Synthwave';
          mood = 'Focus & Study';
        } else if (text.includes('rain') || text.includes('ambient') || text.includes('sleep') || text.includes('nature') || text.includes('binaural')) {
          genre = 'Ambient';
          mood = 'Sleep & Night';
        } else if (text.includes('workout') || text.includes('gym') || text.includes('phonk') || text.includes('bass') || text.includes('energy')) {
          genre = 'Electronic';
          mood = 'Workout & Energy';
        } else if (text.includes('acoustic') || text.includes('guitar') || text.includes('folk')) {
          genre = 'Rock & Indie';
          mood = 'Euphoric & Uplifting';
        } else if (text.includes('piano') || text.includes('classical') || text.includes('orchestra')) {
          genre = 'Classical & Piano';
          mood = 'Melancholy & Rainy';
        } else if (text.includes('hiphop') || text.includes('rap') || text.includes('trap')) {
          genre = 'Hip-Hop';
          mood = 'Chill & Relax';
        }

        return {
          id: t.id,
          genre,
          mood,
          energyLevel: mood === 'Workout & Energy' ? 8 : mood === 'Sleep & Night' ? 2 : 5,
          vibeDescription: `Heuristically analyzed: ${genre} mood suited for ${mood}.`
        };
      });

      return res.json({
        success: true,
        source: 'heuristic',
        results: fallbackCategorized
      });
    }

    // Call Gemini to classify each track with structured JSON
    const simplifiedTracks = tracks.slice(0, 30).map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      tags: t.tags || []
    }));

    const prompt = `You are a world-class music musicologist and audio librarian.
Analyze the following list of music tracks / videos and classify each into:
- genre: Choose from ["Lo-Fi", "Synthwave", "Electronic", "Hip-Hop", "Rock & Indie", "Classical & Piano", "Ambient", "Pop", "Jazz & Soul", "Podcast & Talk"]
- mood: Choose from ["Focus & Study", "Chill & Relax", "Workout & Energy", "Sleep & Night", "Melancholy & Rainy", "Euphoric & Uplifting", "Creative Flow"]
- energyLevel: Integer from 1 (deep calm/sleep) to 10 (intense cardio/rage)
- vibeDescription: A short 6-12 word descriptive aesthetic note (e.g. "Warm cassette tape warmth with dusty vinyl crackle for midnight study")

Tracks to classify:
${JSON.stringify(simplifiedTracks, null, 2)}

Return a strict JSON array of objects with keys: id, genre, mood, energyLevel, vibeDescription.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              genre: { type: Type.STRING },
              mood: { type: Type.STRING },
              energyLevel: { type: Type.INTEGER },
              vibeDescription: { type: Type.STRING }
            },
            required: ['id', 'genre', 'mood', 'energyLevel', 'vibeDescription']
          }
        }
      }
    });

    const parsedResults = JSON.parse(response.text || '[]');
    res.json({
      success: true,
      source: 'gemini-3.8-flash',
      results: parsedResults
    });
  } catch (err: any) {
    console.error('AI Categorization Error:', err);
    res.status(500).json({ error: err.message || 'AI categorization failed' });
  }
});

// 4. AI Smart Playlist Generator
app.post('/api/ai/smart-playlist', async (req: Request, res: Response) => {
  try {
    const { prompt: userPrompt, availableTracks } = req.body;
    if (!userPrompt || typeof userPrompt !== 'string') {
      return res.status(400).json({ error: 'Playlist prompt is required' });
    }

    if (!aiClient || !availableTracks || availableTracks.length === 0) {
      // Fallback
      return res.json({
        playlistTitle: `Curated: ${userPrompt}`,
        description: `Custom flow created based on "${userPrompt}"`,
        recommendedTrackIds: (availableTracks || []).slice(0, 8).map((t: any) => t.id)
      });
    }

    const trackSummaries = availableTracks.map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      genre: t.genre,
      mood: t.mood
    }));

    const aiPrompt = `The user wants a playlist based on this request: "${userPrompt}".
Select and order the most fitting tracks from this library to create a seamless, cohesive listening journey:
${JSON.stringify(trackSummaries, null, 2)}

Provide a creative playlist title, an evocative 1-sentence subtitle description, and the ordered list of matching track IDs (up to 12).
Return strictly JSON with keys: playlistTitle, description, recommendedTrackIds (array of string IDs).`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: aiPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('AI Playlist Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate playlist' });
  }
});

// Proxy route for fetching audio files that need CORS headers for offline caching
app.get('/api/proxy-audio', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send('Missing url');
    }
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch audio stream');
    }
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).send(err.message || 'Audio fetch failed');
  }
});

// Setup Vite development middleware or static production serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`AuraWave server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
