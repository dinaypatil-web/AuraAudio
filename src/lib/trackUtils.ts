import { Track } from '../types/music';

export type SortField = 'name' | 'artist' | 'genre' | 'date' | 'size' | 'views' | 'duration';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { field: 'name', direction: 'asc', label: 'Name (A → Z)' },
  { field: 'name', direction: 'desc', label: 'Name (Z → A)' },
  { field: 'artist', direction: 'asc', label: 'Channel / Artist (A → Z)' },
  { field: 'genre', direction: 'asc', label: 'Genre (A → Z)' },
  { field: 'date', direction: 'desc', label: 'Date Created (Newest First)' },
  { field: 'date', direction: 'asc', label: 'Date Created (Oldest First)' },
  { field: 'size', direction: 'desc', label: 'File Size (Largest First)' },
  { field: 'size', direction: 'asc', label: 'File Size (Smallest First)' },
  { field: 'views', direction: 'desc', label: 'Views (Most Popular)' },
  { field: 'views', direction: 'asc', label: 'Views (Least Popular)' },
  { field: 'duration', direction: 'desc', label: 'Duration (Longest First)' },
  { field: 'duration', direction: 'asc', label: 'Duration (Shortest First)' },
];

/**
 * Format raw bytes into human-readable MB / KB
 */
export function formatFileSize(bytes?: number, fallbackDuration: number = 210): string {
  const actualBytes = bytes && bytes > 0 ? bytes : Math.round(fallbackDuration * 24000); // 192kbps ~ 24 KB/s
  if (actualBytes >= 1024 * 1024 * 1024) {
    return `${(actualBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (actualBytes >= 1024 * 1024) {
    return `${(actualBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (actualBytes >= 1024) {
    return `${Math.round(actualBytes / 1024)} KB`;
  }
  return `${actualBytes} B`;
}

/**
 * Format view count into human-readable string (e.g. 2.4M views, 340K views)
 */
export function formatViews(views?: number): string {
  if (!views || views <= 0) return '120K views';
  if (views >= 1_000_000_000) {
    return `${(views / 1_000_000_000).toFixed(1)}B views`;
  }
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M views`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K views`;
  }
  return `${views} views`;
}

/**
 * Format timestamp into readable date (e.g., Oct 24, 2024)
 */
export function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Recent';
  try {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Format seconds to M:SS or H:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Generates consistent pseudo-views and file size if missing from track
 */
export function ensureTrackSortMetadata(t: Track): Track {
  // Hash track id to produce deterministic views if not present
  let hash = 0;
  const str = t.id + t.title;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const fallbackViews = 50000 + (positiveHash % 8500000);
  const fallbackSize = Math.round((t.duration || 210) * 24000); // ~24KB/sec for 192kbps MP3
  const fallbackDate = t.addedAt || t.downloadDate || Date.now() - (positiveHash % (365 * 24 * 3600 * 1000));

  return {
    ...t,
    channelTitle: t.channelTitle || t.artist,
    views: t.views !== undefined ? t.views : fallbackViews,
    fileSize: t.fileSize !== undefined ? t.fileSize : fallbackSize,
    createdAt: t.createdAt || fallbackDate,
  };
}

/**
 * Sorts array of tracks by field and direction
 */
export function sortTracks(tracks: Track[], sortField: SortField, sortDir: SortDirection): Track[] {
  const enriched = tracks.map(ensureTrackSortMetadata);

  return [...enriched].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
        break;

      case 'artist':
        comparison = (a.channelTitle || a.artist).localeCompare(b.channelTitle || b.artist, undefined, { sensitivity: 'base' });
        break;

      case 'genre':
        comparison = (a.genre || '').localeCompare(b.genre || '', undefined, { sensitivity: 'base' });
        break;

      case 'date': {
        const dateA = a.createdAt || a.addedAt || 0;
        const dateB = b.createdAt || b.addedAt || 0;
        comparison = dateA - dateB;
        break;
      }

      case 'size': {
        const sizeA = a.fileSize || a.duration * 24000;
        const sizeB = b.fileSize || b.duration * 24000;
        comparison = sizeA - sizeB;
        break;
      }

      case 'views': {
        const viewsA = a.views || 0;
        const viewsB = b.views || 0;
        comparison = viewsA - viewsB;
        break;
      }

      case 'duration':
        comparison = (a.duration || 0) - (b.duration || 0);
        break;

      default:
        comparison = 0;
    }

    return sortDir === 'asc' ? comparison : -comparison;
  });
}
