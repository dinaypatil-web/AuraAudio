import { Track } from '../types/music';
import { classifyTrackHeuristic } from './classifier';

export interface ResolvedMediaInfo {
  track: Track;
  isDirectLink: boolean;
}

/**
 * Checks whether a given string is a media link (Spotify, YouTube, or direct audio)
 */
export function isMediaUrl(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  return (
    t.includes('spotify.com/') ||
    t.startsWith('spotify:') ||
    t.includes('youtube.com/') ||
    t.includes('youtu.be/') ||
    /\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(t) ||
    t.includes('soundcloud.com/')
  );
}

/**
 * Resolves any Spotify, YouTube, or web audio URL into a complete Track object.
 * Fully supports Spotify episodes, shows, tracks, albums, playlists, and artists with query parameters.
 */
export async function resolveMediaUrl(rawUrl: string): Promise<Track> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Empty URL provided');
  }

  // 1. Direct audio file link
  if (trimmed.match(/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i)) {
    const fileName = trimmed.split('/').pop()?.split('?')[0] || 'Audio Stream';
    const cleanTitle = decodeURIComponent(fileName.replace(/\.(mp3|wav|m4a|aac|ogg)$/i, ''));
    const classification = classifyTrackHeuristic(cleanTitle, 'Web Audio');
    return {
      id: `web-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: cleanTitle,
      artist: 'Web Audio Stream',
      platform: 'web_audio',
      sourceUrl: trimmed,
      audioUrl: trimmed,
      duration: 180,
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      genre: classification.genre,
      mood: classification.mood,
      tags: ['web_audio', 'stream'],
      energyLevel: classification.energyLevel,
      isOfflineReady: true,
      addedAt: Date.now(),
    };
  }

  // 2. Spotify Track / Episode / Show / Playlist / Album / Artist Link
  const spotifyMatch = trimmed.match(
    /(?:spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album|episode|show|artist)\/([a-zA-Z0-9]+)|spotify:(track|playlist|album|episode|show|artist):([a-zA-Z0-9]+))/i
  );

  if (spotifyMatch) {
    const spType = (spotifyMatch[1] || spotifyMatch[3]).toLowerCase();
    const spotifyId = spotifyMatch[2] || spotifyMatch[4];
    const isEpisodeOrPodcast = spType === 'episode' || spType === 'show';

    let title = isEpisodeOrPodcast ? 'Spotify Episode' : 'Spotify Track';
    let author = isEpisodeOrPodcast ? 'Spotify Podcast' : 'Spotify Artist';
    let coverUrl =
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
    let iframeUrl = `https://open.spotify.com/embed/${spType}/${spotifyId}`;

    // Clean canonical URL for oEmbed
    const canonicalSpotifyUrl = `https://open.spotify.com/${spType}/${spotifyId}`;

    // Fetch official Spotify oEmbed metadata
    try {
      // First try canonical, then trimmed with query params
      let spRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(canonicalSpotifyUrl)}`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (!spRes.ok) {
        spRes = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`,
          { signal: AbortSignal.timeout(3500) }
        );
      }

      if (spRes.ok) {
        const spData = await spRes.json();
        if (spData.title) title = spData.title;
        if (spData.thumbnail_url) coverUrl = spData.thumbnail_url;
        if (spData.iframe_url) iframeUrl = spData.iframe_url;
        if (spData.author_name) author = spData.author_name;

        // Parse title and artist if formatted as "Song - Artist" or "Episode | Show"
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          title = parts[0].trim();
          author = parts.slice(1).join(' - ').trim();
        } else if (title.includes(' | ')) {
          const parts = title.split(' | ');
          title = parts[0].trim();
          author = parts.slice(1).join(' | ').trim();
        }
      } else {
        // If direct client oEmbed had an issue, try backend resolve endpoint
        try {
          const bRes = await fetch('/api/youtube/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: canonicalSpotifyUrl }),
            signal: AbortSignal.timeout(3000),
          });
          if (bRes.ok) {
            const bData = await bRes.json();
            if (bData?.track) {
              return bData.track;
            }
          }
        } catch {}
      }
    } catch (spErr) {
      console.warn('Spotify oEmbed fetch error, checking backend resolver fallback:', spErr);
      try {
        const bRes = await fetch('/api/youtube/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: canonicalSpotifyUrl }),
          signal: AbortSignal.timeout(3000),
        });
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData?.track) {
            return bData.track;
          }
        }
      } catch {}
    }

    const classification = classifyTrackHeuristic(
      title,
      author,
      isEpisodeOrPodcast ? ['podcast', 'talk', 'episode'] : ['spotify', 'music']
    );

    // Attempt client-side YouTube match so background audio can play immediately if possible
    let matchedYoutubeId = '';
    try {
      const cleanSearchQuery = `${title} ${author}`
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[()]/g, ' ')
        .trim();
      const matchRes = await fetch(`/api/search?q=${encodeURIComponent(cleanSearchQuery.slice(0, 60))}&platform=youtube`, {
        signal: AbortSignal.timeout(2500),
      });
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        const found = matchData.tracks?.find((t: any) => t.youtubeId);
        if (found?.youtubeId) matchedYoutubeId = found.youtubeId;
      }
    } catch {}

    return {
      id: `spotify-${spType}-${spotifyId}`,
      title,
      artist: author,
      platform: 'spotify',
      sourceUrl: trimmed,
      spotifyId,
      spotifyEmbedUrl: iframeUrl,
      youtubeId: matchedYoutubeId || undefined,
      duration: isEpisodeOrPodcast ? 1800 : 210,
      coverUrl,
      genre: isEpisodeOrPodcast ? 'Podcast & Talk' : classification.genre,
      mood: isEpisodeOrPodcast ? 'Focus & Study' : classification.mood,
      tags: isEpisodeOrPodcast
        ? ['spotify', 'podcast', 'episode', 'talk']
        : ['spotify', 'music', 'streaming'],
      energyLevel: classification.energyLevel,
      vibeDescription: classification.vibeDescription,
      isStream: false,
      addedAt: Date.now(),
    };
  }

  // 3. YouTube link (watch, youtu.be, shorts, embed)
  let youtubeId = '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    youtubeId = trimmed;
  } else {
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
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
    const match = trimmed.match(regExp);
    if (match && match[1]) {
      youtubeId = match[1];
    }
  }

  if (youtubeId) {
    let title = 'YouTube Audio';
    let author = 'YouTube Creator';
    let coverUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    let duration = 240;

    // Fetch official YouTube oEmbed metadata
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (oembedRes.ok) {
        const oData = await oembedRes.json();
        title = oData.title || title;
        author = oData.author_name || author;
        coverUrl = oData.thumbnail_url || coverUrl;
      }
    } catch (oErr) {
      console.warn('YouTube oEmbed note:', oErr);
    }

    const classification = classifyTrackHeuristic(title, author, ['youtube', 'video']);

    return {
      id: `yt-${youtubeId}`,
      title,
      artist: author,
      platform: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      youtubeId,
      duration,
      coverUrl,
      genre: classification.genre,
      mood: classification.mood,
      tags: ['youtube', 'video', 'import'],
      energyLevel: classification.energyLevel,
      vibeDescription: classification.vibeDescription,
      isStream: false,
      isOfflineReady: false,
      addedAt: Date.now(),
    };
  }

  throw new Error(`Unsupported or unrecognized link format: ${trimmed}`);
}
