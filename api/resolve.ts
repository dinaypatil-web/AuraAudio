function classify(title: string, artist: string, tags: string[] = []) {
  const text = `${title} ${artist} ${tags.join(' ')}`.toLowerCase();
  let genre = 'Electronic';
  let mood = 'Focus & Study';
  let energyLevel = 5;

  if (text.includes('lofi') || text.includes('chillhop') || text.includes('relax') || text.includes('study')) {
    genre = 'Lo-Fi';
    mood = 'Chill & Relax';
    energyLevel = 3;
  } else if (text.includes('rock') || text.includes('metal') || text.includes('punk') || text.includes('guitar')) {
    genre = 'Rock & Indie';
    mood = 'Workout & Energy';
    energyLevel = 8;
  } else if (text.includes('pop') || text.includes('hit') || text.includes('dance')) {
    genre = 'Pop';
    mood = 'Euphoric & Uplifting';
    energyLevel = 7;
  } else if (text.includes('piano') || text.includes('classical')) {
    genre = 'Classical & Piano';
    mood = 'Focus & Study';
    energyLevel = 3;
  } else if (text.includes('ambient') || text.includes('sleep') || text.includes('meditation')) {
    genre = 'Ambient';
    mood = 'Sleep & Night';
    energyLevel = 2;
  }

  return { genre, mood, energyLevel };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.body || req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  const trimmedUrl = url.trim();

  // 1. Direct audio link
  if (trimmedUrl.match(/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i)) {
    const fileName = trimmedUrl.split('/').pop()?.split('?')[0] || 'Audio Stream';
    const cleanTitle = decodeURIComponent(fileName.replace(/\.(mp3|wav|m4a|aac|ogg)$/i, ''));
    const cl = classify(cleanTitle, 'Web Audio');
    return res.status(200).json({
      success: true,
      track: {
        id: `web-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: cleanTitle,
        artist: 'Web Audio Stream',
        platform: 'web_audio',
        sourceUrl: trimmedUrl,
        audioUrl: trimmedUrl,
        duration: 180,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        genre: cl.genre,
        mood: cl.mood,
        tags: ['web_audio', 'stream'],
        energyLevel: cl.energyLevel,
        isOfflineReady: true,
        addedAt: Date.now(),
      },
    });
  }

  // 2. Spotify Track / Playlist / Album
  const spotifyMatch = trimmedUrl.match(
    /(?:spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album)\/([a-zA-Z0-9]+)|spotify:(track|playlist|album):([a-zA-Z0-9]+))/i
  );
  if (spotifyMatch) {
    const spType = spotifyMatch[1] || spotifyMatch[3];
    const spotifyId = spotifyMatch[2] || spotifyMatch[4];

    let title = 'Spotify Track';
    let author = 'Spotify Artist';
    let coverUrl = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
    const iframeUrl = `https://open.spotify.com/embed/${spType}/${spotifyId}`;

    try {
      const spRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trimmedUrl)}`);
      if (spRes.ok) {
        const spData = await spRes.json();
        title = spData.title || title;
        if (spData.thumbnail_url) coverUrl = spData.thumbnail_url;
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          title = parts[0].trim();
          author = parts.slice(1).join(' - ').trim();
        }
      }
    } catch {}

    const cl = classify(title, author, ['spotify', 'music']);

    return res.status(200).json({
      success: true,
      track: {
        id: `spotify-${spotifyId}`,
        title,
        artist: author,
        platform: 'spotify',
        sourceUrl: trimmedUrl,
        spotifyId,
        spotifyEmbedUrl: iframeUrl,
        duration: 210,
        coverUrl,
        genre: cl.genre,
        mood: cl.mood,
        tags: ['spotify', 'music', 'streaming'],
        energyLevel: cl.energyLevel,
        isStream: false,
        addedAt: Date.now(),
      },
    });
  }

  // 3. YouTube URL
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
    return res.status(400).json({ error: 'Could not parse a valid YouTube Video ID or Spotify URL' });
  }

  let title = 'YouTube Track';
  let authorName = 'YouTube Creator';
  let thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

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
  } catch {}

  const cl = classify(title, authorName, ['youtube', 'audio']);

  return res.status(200).json({
    success: true,
    track: {
      id: `yt-${youtubeId}`,
      title,
      artist: authorName,
      platform: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      youtubeId,
      duration: 240,
      coverUrl: thumbnail,
      genre: cl.genre,
      mood: cl.mood,
      tags: ['youtube', 'audio'],
      energyLevel: cl.energyLevel,
      isStream: false,
      addedAt: Date.now(),
    },
  });
}
