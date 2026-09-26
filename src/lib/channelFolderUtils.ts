import { Track, ChannelFolder } from '../types/music';
import { ensureTrackSortMetadata } from './trackUtils';

/**
 * Recursively extracts all tracks from a folder and all its nested subfolders.
 */
export function getAllTracksFromFolder(folder: ChannelFolder): Track[] {
  const list: Track[] = [...(folder.tracks || [])];
  if (Array.isArray(folder.subfolders)) {
    for (const sub of folder.subfolders) {
      list.push(...getAllTracksFromFolder(sub));
    }
  }
  // Deduplicate by id, youtubeId, and title+artist
  const seenIds = new Set<string>();
  const seenYts = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: Track[] = [];

  for (const t of list) {
    if (!t) continue;
    const idKey = (t.id || '').toLowerCase();
    const ytKey = (t.youtubeId || '').toLowerCase();
    const titleKey = `${(t.title || '').trim().toLowerCase()}:::${(t.artist || '').trim().toLowerCase()}`;

    if ((idKey && seenIds.has(idKey)) || (ytKey && seenYts.has(ytKey)) || (titleKey && seenTitles.has(titleKey))) {
      continue;
    }
    if (idKey) seenIds.add(idKey);
    if (ytKey) seenYts.add(ytKey);
    if (titleKey) seenTitles.add(titleKey);
    deduped.push(t);
  }
  return deduped;
}

/**
 * Counts total tracks in a folder and all its nested subfolders.
 */
export function countAllTracks(folder: ChannelFolder): number {
  return getAllTracksFromFolder(folder).length;
}

/**
 * Recursively counts all nested subfolders within a folder.
 */
export function countAllSubfolders(folder: ChannelFolder): number {
  if (!folder.subfolders || folder.subfolders.length === 0) return 0;
  let count = folder.subfolders.length;
  for (const sub of folder.subfolders) {
    count += countAllSubfolders(sub);
  }
  return count;
}

/**
 * Formats total duration of a track collection in minutes/hours
 */
export function formatFolderDuration(tracks: Track[]): string {
  const totalSec = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hrs > 0) {
    return `${hrs} hr ${mins} min`;
  }
  return `${mins} min`;
}

/**
 * Builds a multi-level hierarchical folder structure for any channel.
 * Implements "folders in folders" (Channel -> Folder -> Subfolders -> Sub-subfolders -> Tracks).
 */
export function buildChannelFolderHierarchy(rawTracks: Track[], channelName: string): ChannelFolder[] {
  const seenIds = new Set<string>();
  const safeTracks: Track[] = [];
  for (const t of rawTracks || []) {
    if (!t) continue;
    const idKey = (t.id || '').toLowerCase();
    if (idKey && seenIds.has(idKey)) continue;
    if (idKey) seenIds.add(idKey);
    safeTracks.push(ensureTrackSortMetadata(t));
  }
  const total = safeTracks.length;

  // Slicing helpers to distribute tracks gracefully across folders & subfolders
  const getSlice = (startRatio: number, endRatio: number): Track[] => {
    if (total === 0) return [];
    const start = Math.floor(startRatio * total);
    const end = Math.max(start + 1, Math.min(total, Math.ceil(endRatio * total)));
    const slice = safeTracks.slice(start, end);
    return slice.length > 0 ? slice : [safeTracks[0]];
  };

  const channelCover =
    safeTracks[0]?.coverUrl ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  const albumCover1 = safeTracks[1]?.coverUrl || channelCover;
  const albumCover2 = safeTracks[2]?.coverUrl || channelCover;
  const playlistCover1 = safeTracks[3]?.coverUrl || channelCover;
  const playlistCover2 = safeTracks[4]?.coverUrl || channelCover;
  const liveCover = safeTracks[5]?.coverUrl || channelCover;
  const singlesCover = safeTracks[6]?.coverUrl || channelCover;

  // Level 1 Folders containing Level 2 Subfolders, and some containing Level 3 sub-discs
  const folders: ChannelFolder[] = [
    {
      id: `folder-albums-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
      name: 'Albums & Discography',
      description: `Official studio releases, albums, and remastered recordings by ${channelName}`,
      folderType: 'album',
      coverUrl: albumCover1,
      createdAt: Date.now() - 30 * 24 * 3600 * 1000,
      tags: ['album', 'studio', 'discography'],
      tracks: getSlice(0, 0.25),
      subfolders: [
        {
          id: `subfolder-album-2024-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          name: '2024 Studio Master Collection',
          description: 'Latest studio collection featuring high-fidelity stereo master tracks',
          folderType: 'album',
          coverUrl: albumCover1,
          createdAt: Date.now() - 10 * 24 * 3600 * 1000,
          tracks: getSlice(0, 0.15),
          subfolders: [
            {
              id: `subfolder-disc-1-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
              name: 'Disc 1: Original Master Edits',
              description: 'Primary album track sequence with full vocal and main arrangements',
              folderType: 'disc',
              coverUrl: albumCover1,
              tracks: getSlice(0, 0.1),
              subfolders: [],
            },
            {
              id: `subfolder-disc-2-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
              name: 'Disc 2: Instrumental & Acoustic Cuts',
              description: 'Pure instrumental stems, background study versions, and acoustic acoustics',
              folderType: 'disc',
              coverUrl: albumCover2,
              tracks: getSlice(0.1, 0.2),
              subfolders: [],
            },
          ],
        },
        {
          id: `subfolder-album-classics-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          name: 'Classics & Golden Editions',
          description: 'Timeless fan favorites, remastered archives, and deluxe bonus releases',
          folderType: 'album',
          coverUrl: albumCover2,
          createdAt: Date.now() - 90 * 24 * 3600 * 1000,
          tracks: getSlice(0.2, 0.35),
          subfolders: [
            {
              id: `subfolder-remasters-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
              name: 'Remastered Audiophile Cuts',
              description: 'Enhanced dynamic range and frequency-tuned masters',
              folderType: 'disc',
              coverUrl: albumCover2,
              tracks: getSlice(0.2, 0.28),
              subfolders: [],
            },
            {
              id: `subfolder-deluxe-bonus-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
              name: 'Deluxe Bonus Vault',
              description: 'Unreleased snippets, alternate takes, and demo files',
              folderType: 'disc',
              coverUrl: albumCover1,
              tracks: getSlice(0.28, 0.35),
              subfolders: [],
            },
          ],
        },
      ],
    },
    {
      id: `folder-playlists-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
      name: 'Curated Playlists & Mixes',
      description: `Official themed playlists and continuous mixed flows compiled by ${channelName}`,
      folderType: 'playlist',
      coverUrl: playlistCover1,
      createdAt: Date.now() - 15 * 24 * 3600 * 1000,
      tags: ['playlist', 'mix', 'curated'],
      tracks: getSlice(0.35, 0.55),
      subfolders: [
        {
          id: `subfolder-focus-mixes-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          name: 'Deep Focus & Study Flow',
          description: 'Carefully paced tracks to sustain flow state, concentration, and reading',
          folderType: 'playlist',
          coverUrl: playlistCover1,
          tracks: getSlice(0.35, 0.45),
          subfolders: [
            {
              id: `subfolder-focus-vol1-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
              name: 'Volume 1: Daytime Ambient Concentration',
              description: 'Uplifting focus grooves for productive daylight work',
              folderType: 'folder',
              coverUrl: playlistCover1,
              tracks: getSlice(0.35, 0.4),
              subfolders: [],
            },
            {
              id: `subfolder-focus-vol2-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
              name: 'Volume 2: Late Night Midnight Coding',
              description: 'Deep sub-bass and tranquil night textures for after-hours productivity',
              folderType: 'folder',
              coverUrl: playlistCover2,
              tracks: getSlice(0.4, 0.46),
              subfolders: [],
            },
          ],
        },
        {
          id: `subfolder-chill-downtime-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          name: 'Chill & Evening Downtime',
          description: 'Warm tape saturation, peaceful melodies, and unwinding frequencies',
          folderType: 'playlist',
          coverUrl: playlistCover2,
          tracks: getSlice(0.46, 0.6),
          subfolders: [
            {
              id: `subfolder-sunset-waves-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
              name: 'Sunset Waves & Golden Hour',
              description: 'Mellow grooves for evening coffee and quiet reflection',
              folderType: 'folder',
              coverUrl: playlistCover2,
              tracks: getSlice(0.46, 0.53),
              subfolders: [],
            },
            {
              id: `subfolder-rainy-cozy-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
              name: 'Rainy Day Cozy Corner',
              description: 'Gentle vinyl crackle and soothing chord progressions',
              folderType: 'folder',
              coverUrl: playlistCover1,
              tracks: getSlice(0.53, 0.6),
              subfolders: [],
            },
          ],
        },
      ],
    },
    {
      id: `folder-live-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
      name: 'Live Radios & Broadcast Archives',
      description: `Non-stop continuous streams, concert sessions, and recorded broadcasts from ${channelName}`,
      folderType: 'series',
      coverUrl: liveCover,
      createdAt: Date.now() - 5 * 24 * 3600 * 1000,
      tags: ['live', 'radio', 'broadcast'],
      tracks: getSlice(0.6, 0.8),
      subfolders: [
        {
          id: `subfolder-continuous-radios-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          name: '24/7 Continuous Radio Streams',
          description: 'Uninterrupted background audio sessions with smooth crossfades',
          folderType: 'series',
          coverUrl: liveCover,
          tracks: getSlice(0.6, 0.7),
          subfolders: [],
        },
        {
          id: `subfolder-unplugged-sessions-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          name: 'Unplugged Live Studio Sessions',
          description: 'Intimate live studio recordings with raw instruments and analog gear',
          folderType: 'series',
          coverUrl: albumCover1,
          tracks: getSlice(0.7, 0.8),
          subfolders: [],
        },
      ],
    },
    {
      id: `folder-singles-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
      name: 'Singles, Collabs & Special Drops',
      description: `Standalone singles, featured guest appearances, and collaborative projects by ${channelName}`,
      folderType: 'collection',
      coverUrl: singlesCover,
      createdAt: Date.now() - 2 * 24 * 3600 * 1000,
      tags: ['singles', 'collabs', 'special'],
      tracks: getSlice(0.8, 1.0),
      subfolders: [
        {
          id: `subfolder-guest-collabs-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          name: 'Guest Artist Collaborations',
          description: 'Joint releases across indie, hip-hop, electronic, and jazz producers',
          folderType: 'collection',
          coverUrl: singlesCover,
          tracks: getSlice(0.8, 0.9),
          subfolders: [],
        },
        {
          id: `subfolder-remixes-b-sides-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          name: 'Remixes & Special Edits',
          description: 'Club edits, slowed & reverb cuts, and synthwave reimaginations',
          folderType: 'collection',
          coverUrl: playlistCover2,
          tracks: getSlice(0.9, 1.0),
          subfolders: [],
        },
      ],
    },
  ];

  return folders;
}
