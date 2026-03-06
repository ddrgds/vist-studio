import { SavedCharacter } from '../types';
import { blobToBase64, initDB } from './storageService';

// storageService.initDB() owns the schema (onupgradeneeded with all stores).
// We reuse it directly so the 'characters' store is always created before use.
const CHARACTERS_STORE = 'characters';

// Alias for clarity — callers use openDB(), but it now uses the authoritative initDB.
const openDB = initDB;

// ─── Thumbnail ────────────────────────────────────────────────────────────────

export const computeThumbnail = async (blobs: Blob[]): Promise<string> => {
  if (!blobs.length) return '';
  try {
    return await blobToBase64(blobs[0]);
  } catch {
    return '';
  }
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const saveCharacter = async (char: SavedCharacter): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHARACTERS_STORE, 'readwrite');
    const req = tx.objectStore(CHARACTERS_STORE).put(char);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const loadCharacters = async (): Promise<SavedCharacter[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHARACTERS_STORE, 'readonly');
    const req = tx.objectStore(CHARACTERS_STORE).getAll();
    req.onsuccess = () => {
      const items = req.result as SavedCharacter[];
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
};

export const updateCharacterRecord = async (char: SavedCharacter): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHARACTERS_STORE, 'readwrite');
    const req = tx.objectStore(CHARACTERS_STORE).put(char);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const deleteCharacterById = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHARACTERS_STORE, 'readwrite');
    const req = tx.objectStore(CHARACTERS_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};
