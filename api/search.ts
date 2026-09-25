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

async function searchYouTube(query: string, maxResults: number = 12) {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

          const cl = classify(title, artist, [query]);

          tracks.push({
            id: `yt-${videoId}`,
            title,
            artist,
            platform: 'youtube',
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            youtubeId: videoId,
            duration,
            coverUrl,
            genre: cl.genre,
            mood: cl.mood,
            tags: ['youtube', 'search', query.toLowerCase()],
            energyLevel: cl.energyLevel,
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
    return [];
  }
}

async function searchITunes(query: string, mediaType: 'music' | 'podcast' = 'music', maxResults: number = 10) {
  try {
    const entity = mediaType === 'podcast' ? 'podcast' : 'song';
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=${mediaType}&entity=${entity}&limit=${maxResults}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.results)) return [];

    return data.results.map((r: any) => {
      const isPodcast = mediaType === 'podcast';
      const title = isPodcast ? r.collectionName || r.trackName : r.trackName || 'Audio Track';
      const artist = r.artistName || 'Audio Creator';
      const cl = classify(title, artist, [r.primaryGenreName || '']);

      return {
        id: `itunes-${r.trackId || r.collectionId || Math.random().toString(36).substring(2, 8)}`,
        title,
        artist,
        platform: isPodcast ? 'podcast' : 'web_audio',
        sourceUrl: r.trackViewUrl || r.collectionViewUrl || '',
        audioUrl: r.previewUrl || r.feedUrl || '',
        duration: Math.round((r.trackTimeMillis || 180000) / 1000),
        coverUrl: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : r.artworkUrl60 || '',
        genre: isPodcast ? 'Podcast & Talk' : cl.genre,
        mood: cl.mood,
        tags: [r.primaryGenreName?.toLowerCase() || 'audio', mediaType, query.toLowerCase()],
        energyLevel: cl.energyLevel,
        isStream: false,
        isOfflineReady: !isPodcast && !!r.previewUrl,
        addedAt: Date.now(),
      };
    });
  } catch {
    return [];
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = ((req.query.q || req.query.query || '') as string).trim();
  const platform = (req.query.platform as string) || 'all';

  if (!q) {
    return res.status(200).json({ success: true, count: 0, tracks: [] });
  }

  try {
    const promises: Promise<any[]>[] = [];
    if (platform === 'all' || platform === 'youtube') {
      promises.push(searchYouTube(q, 15));
    }
    if (platform === 'all' || platform === 'web_audio') {
      promises.push(searchITunes(q, 'music', 10));
    }
    if (platform === 'all' || platform === 'podcast') {
      promises.push(searchITunes(q, 'podcast', 8));
    }

    const arrays = await Promise.all(promises);
    const combined = arrays.flat();

    const seen = new Set<string>();
    const deduplicated = combined.filter((t) => {
      if (seen.has(t.id) || (t.youtubeId && seen.has(t.youtubeId))) return false;
      seen.add(t.id);
      if (t.youtubeId) seen.add(t.youtubeId);
      return true;
    });

    return res.status(200).json({
      success: true,
      query: q,
      count: deduplicated.length,
      tracks: deduplicated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
}
