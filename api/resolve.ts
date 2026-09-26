function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

function getQueryParams(urlStr: string = ''): Record<string, string> {
  try {
    const parsed = new URL(urlStr, 'http://localhost');
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((val, key) => {
      params[key] = val;
    });
    return params;
  } catch {
    return {};
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  try {
    let rawUrl = '';
    if (req.body) {
      if (typeof req.body === 'string') {
        try {
          rawUrl = JSON.parse(req.body)?.url || '';
        } catch {}
      } else {
        rawUrl = req.body.url || '';
      }
    }
    if (!rawUrl) {
      const params = req.query || getQueryParams(req.url);
      rawUrl = (params.url || params.q || '') as string;
    }

    const trimmed = (rawUrl || '').trim();
    if (!trimmed) {
      return sendJson(res, 400, { error: 'URL parameter required' });
    }

    // 1. Direct audio file
    if (trimmed.match(/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i)) {
      const fileName = trimmed.split('/').pop()?.split('?')[0] || 'Audio Stream';
      const cleanTitle = decodeURIComponent(fileName.replace(/\.(mp3|wav|m4a|aac|ogg)$/i, ''));
      return sendJson(res, 200, {
        success: true,
        track: {
          id: `web-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: cleanTitle,
          artist: 'Web Audio Stream',
          platform: 'web_audio',
          sourceUrl: trimmed,
          audioUrl: trimmed,
          duration: 180,
          coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
          genre: 'Ambient',
          mood: 'Chill & Relax',
          tags: ['web_audio', 'stream'],
          energyLevel: 4,
          isOfflineReady: true,
          addedAt: Date.now(),
        },
      });
    }

    // 2. Spotify link (track, episode, show, album, playlist, artist)
    const spotifyMatch = trimmed.match(
      /(?:spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album|episode|show|artist)\/([a-zA-Z0-9]+)|spotify:(track|playlist|album|episode|show|artist):([a-zA-Z0-9]+))/i
    );
    if (spotifyMatch) {
      const spType = (spotifyMatch[1] || spotifyMatch[3]).toLowerCase();
      const spotifyId = spotifyMatch[2] || spotifyMatch[4];
      const isPodcast = spType === 'episode' || spType === 'show';

      let title = isPodcast ? 'Spotify Episode' : 'Spotify Track';
      let author = isPodcast ? 'Spotify Podcast' : 'Spotify Artist';
      let coverUrl =
        'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
      let iframeUrl = `https://open.spotify.com/embed/${spType}/${spotifyId}`;

      try {
        const spRes = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`,
          { signal: AbortSignal.timeout(3500) }
        );
        if (spRes.ok) {
          const spData = await spRes.json();
          if (spData.title) title = spData.title;
          if (spData.thumbnail_url) coverUrl = spData.thumbnail_url;
          if (spData.iframe_url) iframeUrl = spData.iframe_url;
          if (spData.author_name) author = spData.author_name;

          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            title = parts[0].trim();
            author = parts.slice(1).join(' - ').trim();
          } else if (title.includes(' | ')) {
            const parts = title.split(' | ');
            title = parts[0].trim();
            author = parts.slice(1).join(' | ').trim();
          }
        }
      } catch (err) {}

      return sendJson(res, 200, {
        success: true,
        track: {
          id: `spotify-${spType}-${spotifyId}`,
          title,
          artist: author,
          platform: 'spotify',
          sourceUrl: trimmed,
          spotifyId,
          spotifyEmbedUrl: iframeUrl,
          duration: isPodcast ? 1800 : 210,
          coverUrl,
          genre: isPodcast ? 'Podcast & Talk' : 'Pop',
          mood: isPodcast ? 'Focus & Study' : 'Chill & Relax',
          tags: isPodcast ? ['spotify', 'podcast', 'episode'] : ['spotify', 'music'],
          energyLevel: 5,
          isStream: false,
          addedAt: Date.now(),
        },
      });
    }

    // 3. YouTube link
    let youtubeId = '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      youtubeId = trimmed;
    } else {
      const match = trimmed.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/
      );
      if (match && match[1]) {
        youtubeId = match[1];
      }
    }

    if (youtubeId) {
      let title = 'YouTube Audio';
      let author = 'YouTube Creator';
      let coverUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

      try {
        const oRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (oRes.ok) {
          const oData = await oRes.json();
          if (oData.title) title = oData.title;
          if (oData.author_name) author = oData.author_name;
          if (oData.thumbnail_url) coverUrl = oData.thumbnail_url;
        }
      } catch {}

      return sendJson(res, 200, {
        success: true,
        track: {
          id: `yt-${youtubeId}`,
          title,
          artist: author,
          platform: 'youtube',
          sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
          youtubeId,
          duration: 240,
          coverUrl,
          genre: 'Lo-Fi',
          mood: 'Chill & Relax',
          tags: ['youtube', 'video'],
          energyLevel: 5,
          isOfflineReady: false,
          addedAt: Date.now(),
        },
      });
    }

    return sendJson(res, 400, { error: 'Unsupported URL format' });
  } catch (err: any) {
    return sendJson(res, 500, { error: err.message || 'Resolve failed' });
  }
}
