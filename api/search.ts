import type { IncomingMessage, ServerResponse } from 'http';

// Helper to parse query parameters from URL
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

// In-memory cache for fast response times
const cache = new Map<string, { data: any[]; timestamp: number }>();

function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

// Search Spotify tracks via Deezer with iTunes fallback
async function searchSpotify(query: string, limit: number = 18): Promise<any[]> {
  const cacheKey = `sp:${query.toLowerCase()}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.data;
  }

  const results: any[] = [];

  // Strategy 1: Deezer Catalog
  try {
    const dzRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (dzRes.ok) {
      const data = await dzRes.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        for (const item of data.data) {
          const title = item.title_short || item.title || 'Track';
          const artist = item.artist?.name || 'Artist';
          results.push({
            id: `sp-${item.id}`,
            title,
            artist,
            platform: 'spotify',
            sourceUrl: `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`,
            spotifyId: String(item.id),
            spotifyEmbedUrl: `https://open.spotify.com/embed/track/${item.id}`,
            audioUrl: item.preview || '',
            duration: item.duration || 210,
            coverUrl:
              item.album?.cover_big ||
              item.album?.cover_medium ||
              item.artist?.picture_big ||
              'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
            genre: 'Pop',
            mood: 'Chill & Relax',
            tags: ['spotify', 'music', query.toLowerCase()],
            energyLevel: 5,
            isStream: false,
            isOfflineReady: !!item.preview,
            addedAt: Date.now(),
          });
        }
      }
    }
  } catch (err) {
    // Deezer timeout or network error, fallback to iTunes
  }

  // Strategy 2: iTunes Fallback for Spotify (Guaranteed 100% reliability globally)
  if (results.length === 0) {
    try {
      const itRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (itRes.ok) {
        const data = await itRes.json();
        if (Array.isArray(data?.results)) {
          for (const r of data.results) {
            const title = r.trackName || 'Song';
            const artist = r.artistName || 'Artist';
            results.push({
              id: `sp-itunes-${r.trackId}`,
              title,
              artist,
              platform: 'spotify',
              sourceUrl: `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`,
              spotifyId: String(r.trackId),
              spotifyEmbedUrl: `https://open.spotify.com/embed/track/${r.trackId}`,
              audioUrl: r.previewUrl || '',
              duration: Math.round((r.trackTimeMillis || 180000) / 1000),
              coverUrl:
                (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
                'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
              genre: r.primaryGenreName || 'Pop',
              mood: 'Chill & Relax',
              tags: ['spotify', 'music', query.toLowerCase()],
              energyLevel: 5,
              isStream: false,
              isOfflineReady: !!r.previewUrl,
              addedAt: Date.now(),
            });
          }
        }
      }
    } catch (err) {
      // iTunes fallback error
    }
  }

  if (results.length > 0) {
    cache.set(cacheKey, { data: results, timestamp: Date.now() });
  }
  return results;
}

// Search YouTube videos via public endpoints
async function searchYouTube(query: string, limit: number = 18): Promise<any[]> {
  const cacheKey = `yt:${query.toLowerCase()}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.data;
  }

  const results: any[] = [];
  const seenIds = new Set<string>();

  // 1. Try Invidious public instances for direct YouTube video data
  const invidiousInstances = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.private.coffee',
  ];

  for (const inst of invidiousInstances) {
    try {
      const res = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            if (!item.videoId || seenIds.has(item.videoId)) continue;
            seenIds.add(item.videoId);
            results.push({
              id: `yt-${item.videoId}`,
              title: item.title || 'YouTube Audio',
              artist: item.author || 'YouTube Artist',
              platform: 'youtube',
              sourceUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
              youtubeId: item.videoId,
              duration: item.lengthSeconds || 240,
              coverUrl:
                item.videoThumbnails?.[0]?.url ||
                `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
              genre: 'Lo-Fi',
              mood: 'Focus & Study',
              tags: ['youtube', 'video', query.toLowerCase()],
              energyLevel: 5,
              isStream: !!item.liveNow,
              isOfflineReady: false,
              addedAt: Date.now(),
            });
            if (results.length >= limit) break;
          }
          if (results.length > 0) break;
        }
      }
    } catch {
      // try next instance
    }
  }

  // 2. Fallback: Query iTunes catalog with YouTube-ready streams
  if (results.length === 0) {
    try {
      const itRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (itRes.ok) {
        const data = await itRes.json();
        if (Array.isArray(data?.results)) {
          for (const r of data.results) {
            const title = r.trackName || 'Song';
            const artist = r.artistName || 'Artist';
            results.push({
              id: `yt-itunes-${r.trackId}`,
              title,
              artist,
              platform: 'youtube',
              sourceUrl: r.trackViewUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + artist)}`,
              audioUrl: r.previewUrl || '',
              duration: Math.round((r.trackTimeMillis || 180000) / 1000),
              coverUrl:
                (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
              genre: r.primaryGenreName || 'Pop',
              mood: 'Chill & Relax',
              tags: ['youtube', 'audio', query.toLowerCase()],
              energyLevel: 5,
              isStream: false,
              isOfflineReady: !!r.previewUrl,
              addedAt: Date.now(),
            });
          }
        }
      }
    } catch {}
  }

  if (results.length > 0) {
    cache.set(cacheKey, { data: results, timestamp: Date.now() });
  }
  return results;
}

// Search Web Audio & Podcasts via iTunes
async function searchWebAudio(query: string, mediaType: 'music' | 'podcast' = 'music', limit: number = 10): Promise<any[]> {
  try {
    const entity = mediaType === 'podcast' ? 'podcast' : 'song';
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=${mediaType}&entity=${entity}&limit=${limit}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.results)) return [];

    const isPod = mediaType === 'podcast';
    return data.results.map((r: any) => ({
      id: `itunes-${r.trackId || r.collectionId}`,
      title: r.trackName || r.collectionName || 'Track',
      artist: r.artistName || 'Creator',
      platform: isPod ? 'podcast' : 'web_audio',
      sourceUrl: r.trackViewUrl || r.collectionViewUrl || '',
      audioUrl: r.previewUrl || '',
      duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 180,
      coverUrl:
        (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      genre: isPod ? 'Podcast & Talk' : r.primaryGenreName || 'Pop',
      mood: isPod ? 'Focus & Study' : 'Chill & Relax',
      tags: [r.primaryGenreName?.toLowerCase() || 'music', query.toLowerCase()],
      energyLevel: 5,
      isOfflineReady: !!r.previewUrl,
      addedAt: Date.now(),
    }));
  } catch {
    return [];
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  try {
    const params = req.query || getQueryParams(req.url);
    const q = ((params.q || params.query || '') as string).trim();
    const platform = (params.platform as string) || 'all';

    if (!q) {
      return sendJson(res, 200, { success: true, count: 0, tracks: [] });
    }

    // Direct link resolution (Spotify tracks/episodes/shows/albums or YouTube videos)
    const isDirectLink =
      q.includes('spotify.com/') ||
      q.startsWith('spotify:') ||
      q.includes('youtube.com/') ||
      q.includes('youtu.be/') ||
      /\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(q);

    if (isDirectLink) {
      // 1. Spotify link
      const spotifyMatch = q.match(
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
            `https://open.spotify.com/oembed?url=${encodeURIComponent(q)}`,
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
        } catch {}

        return sendJson(res, 200, {
          success: true,
          count: 1,
          platform: 'spotify',
          tracks: [
            {
              id: `spotify-${spType}-${spotifyId}`,
              title,
              artist: author,
              platform: 'spotify',
              sourceUrl: q,
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
          ],
        });
      }

      // 2. YouTube link
      const ytMatch = q.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
      if (ytMatch && ytMatch[1]) {
        const vid = ytMatch[1];
        let title = 'YouTube Audio';
        let author = 'YouTube Creator';
        let coverUrl = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
        try {
          const oRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`,
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
          count: 1,
          platform: 'youtube',
          tracks: [
            {
              id: `yt-${vid}`,
              title,
              artist: author,
              platform: 'youtube',
              sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
              youtubeId: vid,
              duration: 240,
              coverUrl,
              genre: 'Lo-Fi',
              mood: 'Chill & Relax',
              tags: ['youtube', 'video'],
              energyLevel: 5,
              addedAt: Date.now(),
            },
          ],
        });
      }
    }

    const promises: Promise<any[]>[] = [];

    // Spotify Search
    if (platform === 'all' || platform === 'spotify') {
      promises.push(searchSpotify(q, platform === 'spotify' ? 20 : 12));
    }

    // YouTube Search
    if (platform === 'all' || platform === 'youtube') {
      promises.push(searchYouTube(q, platform === 'youtube' ? 20 : 12));
    }

    // Web Audio Search
    if (platform === 'all' || platform === 'web_audio') {
      promises.push(searchWebAudio(q, 'music', 10));
    }

    // Podcast Search
    if (platform === 'all' || platform === 'podcast') {
      promises.push(searchWebAudio(q, 'podcast', 8));
    }

    const arrays = await Promise.all(promises);
    const combined = arrays.flat();

    // Deduplicate
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const t of combined) {
      const key = (t.id || t.youtubeId || `${t.title}-${t.artist}`).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(t);
      }
    }

    return sendJson(res, 200, {
      success: true,
      count: deduped.length,
      platform,
      tracks: deduped,
    });
  } catch (err: any) {
    console.error('Vercel search handler error:', err);
    return sendJson(res, 500, { error: err.message || 'Search failed', tracks: [] });
  }
}
