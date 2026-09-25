/**
 * IndexedDB storage layer for offline audio blobs, track metadata, and custom playlists.
 */
import { Track, Playlist } from '../types/music';

const DB_NAME = 'aurawave_audio_db';
const DB_VERSION = 2;

const STORE_TRACKS = 'tracks';
const STORE_AUDIO_BLOBS = 'audio_blobs';
const STORE_PLAYLISTS = 'playlists';
const STORE_SETTINGS = 'settings';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO_BLOBS)) {
        db.createObjectStore(STORE_AUDIO_BLOBS); // key is track.id
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Track operations
export async function idbSaveTrack(track: Track): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS], 'readwrite');
    tx.objectStore(STORE_TRACKS).put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbSaveTracks(tracks: Track[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS], 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    tracks.forEach((track) => store.put(track));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetAllTracks(): Promise<Track[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS], 'readonly');
    const request = tx.objectStore(STORE_TRACKS).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function idbDeleteTrack(trackId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO_BLOBS], 'readwrite');
    tx.objectStore(STORE_TRACKS).delete(trackId);
    tx.objectStore(STORE_AUDIO_BLOBS).delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Audio Blob operations (Offline Playback)
export async function idbSaveAudioBlob(trackId: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_AUDIO_BLOBS], 'readwrite');
    tx.objectStore(STORE_AUDIO_BLOBS).put(blob, trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetAudioBlob(trackId: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_AUDIO_BLOBS], 'readonly');
    const request = tx.objectStore(STORE_AUDIO_BLOBS).get(trackId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function idbHasAudioBlob(trackId: string): Promise<boolean> {
  const blob = await idbGetAudioBlob(trackId);
  return !!blob;
}

// Playlist operations
export async function idbSavePlaylist(playlist: Playlist): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PLAYLISTS], 'readwrite');
    tx.objectStore(STORE_PLAYLISTS).put(playlist);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbSavePlaylists(playlists: Playlist[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PLAYLISTS], 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    playlists.forEach((p) => store.put(p));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetAllPlaylists(): Promise<Playlist[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PLAYLISTS], 'readonly');
    const request = tx.objectStore(STORE_PLAYLISTS).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function idbDeletePlaylist(playlistId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PLAYLISTS], 'readwrite');
    tx.objectStore(STORE_PLAYLISTS).delete(playlistId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Key-Value Settings
export async function idbSetSetting<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SETTINGS], 'readwrite');
    tx.objectStore(STORE_SETTINGS).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SETTINGS], 'readonly');
      const request = tx.objectStore(STORE_SETTINGS).get(key);
      request.onsuccess = () => {
        resolve(request.result !== undefined ? request.result : defaultValue);
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}
