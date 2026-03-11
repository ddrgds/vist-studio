import { create } from 'zustand';
import {
  saveCharacter,
  loadCharacters,
  updateCharacterRecord,
  deleteCharacterById,
} from '../services/characterStorageService';
import {
  uploadCharacterToCloud,
  updateCharacterInCloud,
  loadCharactersFromCloud,
  deleteCharacterFromCloud,
} from '../services/supabaseCharacterService';

export interface SavedCharacter {
  id: string;
  name: string;
  thumbnail: string;
  modelImageBlobs: Blob[];
  outfitBlob: Blob | null;
  outfitDescription: string;
  characteristics: string;
  accessory: string;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  loraUrl?: string;
  loraTrainingStatus?: 'idle' | 'training' | 'ready' | 'failed';
  loraTrainedAt?: number;
}

interface CharacterState {
  characters: SavedCharacter[];
  isLoading: boolean;
  _userId: string | null;

  hydrate: (userId?: string) => Promise<void>;
  setCharacters: (chars: SavedCharacter[]) => void;
  addCharacter: (char: SavedCharacter) => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, updates: Partial<SavedCharacter>) => void;
  incrementUsage: (id: string) => void;
  setLoading: (v: boolean) => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  isLoading: true,
  _userId: null,

  hydrate: async (userId?: string) => {
    set({ isLoading: true, _userId: userId ?? null });
    try {
      let chars: SavedCharacter[];
      if (userId) {
        try {
          chars = await loadCharactersFromCloud(userId);
        } catch {
          // Cloud failed — fall back to local IndexedDB
          chars = await loadCharacters();
        }
      } else {
        chars = await loadCharacters();
      }
      set({ characters: chars, isLoading: false });
    } catch {
      // Even IndexedDB failed — start empty
      set({ characters: [], isLoading: false });
    }
  },

  setCharacters: (chars) => set({ characters: chars, isLoading: false }),

  addCharacter: (char) => {
    // Optimistic update
    set((s) => ({ characters: [char, ...s.characters] }));
    // Persist to IndexedDB
    saveCharacter(char).catch(() => {});
    // Fire-and-forget cloud sync
    const userId = get()._userId;
    if (userId) {
      uploadCharacterToCloud(char, userId).catch(() => {});
    }
  },

  removeCharacter: (id) => {
    // Optimistic update
    set((s) => ({ characters: s.characters.filter((c) => c.id !== id) }));
    // Persist to IndexedDB
    deleteCharacterById(id).catch(() => {});
    // Fire-and-forget cloud sync
    const userId = get()._userId;
    if (userId) {
      deleteCharacterFromCloud(id, userId).catch(() => {});
    }
  },

  updateCharacter: (id, updates) => {
    // Optimistic update
    set((s) => ({
      characters: s.characters.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    }));
    // Persist to IndexedDB
    const updated = get().characters.find((c) => c.id === id);
    if (updated) {
      updateCharacterRecord(updated).catch(() => {});
      // Fire-and-forget cloud sync
      const userId = get()._userId;
      if (userId) {
        updateCharacterInCloud(updated, userId).catch(() => {});
      }
    }
  },

  incrementUsage: (id) => set((s) => ({
    characters: s.characters.map(c =>
      c.id === id ? { ...c, usageCount: c.usageCount + 1, updatedAt: Date.now() } : c
    ),
  })),

  setLoading: (v) => set({ isLoading: v }),
}));
