import { buildChannelFolderHierarchy } from '../src/lib/channelFolderUtils';

function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  try {
    const params = req.query || getQueryParams(req.url);
    const channelName = ((params.name || params.query || '') as string).trim();
    const channelId = ((params.id || '') as string).trim();

    if (!channelName && !channelId) {
      return sendJson(res, 400, { error: 'Channel name or ID is required' });
    }

    const query = channelName || 'Music';
    const tracks: any[] = [];

    // Query iTunes for high quality artist songs
    try {
      const itRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=30`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (itRes.ok) {
        const data = await itRes.json();
        if (Array.isArray(data?.results)) {
          const seen = new Set<string>();
          for (const r of data.results) {
            if (!r.trackId || seen.has(String(r.trackId))) continue;
            seen.add(String(r.trackId));
            tracks.push({
              id: `itunes-${r.trackId}`,
              title: r.trackName || 'Track',
              artist: r.artistName || channelName,
              channelTitle: channelName || r.artistName,
              channelId: channelId || undefined,
              platform: 'web_audio',
              sourceUrl: r.trackViewUrl || '',
              audioUrl: r.previewUrl || '',
              duration: Math.round((r.trackTimeMillis || 180000) / 1000),
              coverUrl:
                (r.artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
              genre: r.primaryGenreName || 'Lo-Fi',
              mood: 'Chill & Relax',
              tags: ['channel', channelName.toLowerCase()],
              energyLevel: 5,
              views: 100000 + Math.floor(Math.random() * 2000000),
              fileSize: Math.round((r.trackTimeMillis || 180000) * 24),
              createdAt: Date.now() - Math.floor(Math.random() * 90 * 24 * 3600 * 1000),
              isOfflineReady: !!r.previewUrl,
              addedAt: Date.now(),
            });
          }
        }
      }
    } catch {}

    const channelProfile = {
      name: channelName || (tracks.length > 0 ? tracks[0].artist : 'Artist Channel'),
      id: channelId || (tracks.length > 0 ? tracks[0].channelId : undefined),
      avatarUrl:
        tracks.length > 0
          ? tracks[0].coverUrl
          : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      bannerUrl:
        tracks.length > 1
          ? tracks[1].coverUrl
          : tracks[0]?.coverUrl ||
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
      trackCount: tracks.length,
      genres: Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))),
      verified: true,
      subscribers: '1.2M subscribers',
    };

    const folders = buildChannelFolderHierarchy(tracks, channelProfile.name);

    return sendJson(res, 200, {
      success: true,
      channel: channelProfile,
      tracks,
      folders,
    });
  } catch (err: any) {
    console.error('Vercel channel handler error:', err);
    return sendJson(res, 500, { error: err.message || 'Channel failed' });
  }
}
