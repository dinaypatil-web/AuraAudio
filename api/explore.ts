function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

const SEED_TRACKS = [
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
    isStream: true,
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
    isStream: true,
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
    isStream: false,
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
    isStream: false,
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
    isStream: false,
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
    isStream: false,
  },
];

export default function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  sendJson(res, 200, {
    success: true,
    count: SEED_TRACKS.length,
    tracks: SEED_TRACKS,
  });
}
