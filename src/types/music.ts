export type PlatformType = 'youtube' | 'web_audio' | 'soundcloud' | 'podcast' | 'local' | 'spotify';

export type GenreType =
  | 'Lo-Fi'
  | 'Synthwave'
  | 'Electronic'
  | 'Hip-Hop'
  | 'Rock & Indie'
  | 'Classical & Piano'
  | 'Ambient'
  | 'Pop'
  | 'Jazz & Soul'
  | 'Podcast & Talk';

export type MoodType =
  | 'Focus & Study'
  | 'Chill & Relax'
  | 'Workout & Energy'
  | 'Sleep & Night'
  | 'Melancholy & Rainy'
  | 'Euphoric & Uplifting'
  | 'Creative Flow';

export interface Track {
  id: string;
  title: string;
  artist: string;
  platform: PlatformType;
  sourceUrl: string;
  youtubeId?: string;
  spotifyId?: string;
  spotifyEmbedUrl?: string;
  audioUrl?: string; // Direct audio stream or blob URL
  duration: number; // in seconds
  coverUrl: string;
  genre: GenreType;
  mood: MoodType;
  channelId?: string;
  channelTitle?: string;
  channelUrl?: string;
  channelAvatarUrl?: string;
  views?: number;
  fileSize?: number; // Size in bytes
  createdAt?: number; // Timestamp of creation/publish
  tags: string[];
  energyLevel?: number; // 1-10
  vibeDescription?: string;
  isStream?: boolean;
  isOfflineReady?: boolean; // Available offline in IndexedDB
  offlineBlobId?: string;
  downloadDate?: number;
  addedAt?: number;
  playCount?: number;
  lastPlayedAt?: number;
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  trackIds: string[];
  isSmartAuto?: boolean;
  filterType?: 'genre' | 'mood' | 'offline' | 'custom';
  filterValue?: string;
  createdAt: number;
  updatedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  isMuted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  isBuffering: boolean;
  isPictureInPicture: boolean;
  isBackgroundAudioMode: boolean;
  equalizerPreset: string;
  sleepTimerEndsAt: number | null; // epoch timestamp
}

export interface EqualizerBands {
  subBass: number; // 60Hz (-12 to +12 dB)
  bass: number; // 250Hz
  mid: number; // 1000Hz
  upperMid: number; // 4000Hz
  treble: number; // 12000Hz
}

export interface DownloadProgress {
  trackId: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number; // 0 - 100
  errorMsg?: string;
}
