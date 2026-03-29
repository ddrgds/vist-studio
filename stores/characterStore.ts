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
import { useGalleryStore } from './galleryStore';

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
  // Pipeline redesign fields
  renderStyle?: string           // 'photorealistic' | 'anime' | '3d-render' | 'illustration' | 'stylized' | 'pixel-art'
  soulStyleId?: string           // UUID if Soul Style was chosen
  personalityTraits?: string[]   // e.g. ['bold', 'mysterious', 'playful']
  // Reference photos — user-curated face refs (max 20) used in Director
  referencePhotoUrls?: string[]
  // Cloud URLs for model images — populated when loaded from Supabase (no blob download)
  modelImageUrls?: string[]
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
  trainLoRA: (characterId: string) => Promise<void>;
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
      // Auto-migrate: characters without referencePhotoUrls get them from modelImageUrls
      for (const c of chars) {
        if ((!c.referencePhotoUrls || c.referencePhotoUrls.length === 0) && c.modelImageUrls && c.modelImageUrls.length > 0) {
          c.referencePhotoUrls = c.modelImageUrls.slice(0, 5);
        }
      }

      // Auto-migrate: ensure character creation photos exist in galleryStore
      // Wrapped in try/catch — gallery migration is non-critical, should not block hydrate
      try {
        const galleryState = useGalleryStore.getState();
        const existingIds = new Set(galleryState.items.map(i => `${i.characterId}::${i.url}`));
        const sheetLabels = ['Retrato', 'Ángulos de Rostro', 'Ángulos de Cuerpo', 'Expresiones'];
        const newGalleryItems: any[] = [];
        for (const c of chars) {
          if (!c.modelImageUrls || c.modelImageUrls.length === 0) continue;
          for (let i = 0; i < c.modelImageUrls.length; i++) {
            const url = c.modelImageUrls[i];
            if (!url || existingIds.has(`${c.id}::${url}`)) continue;
            newGalleryItems.push({
              id: crypto.randomUUID(), url,
              prompt: `${c.name} — ${sheetLabels[i] || 'Referencia'}`,
              model: 'character-creator', timestamp: c.createdAt + i,
              type: 'create', characterId: c.id,
              tags: ['character-creation', i === 0 ? 'portrait' : 'sheet'],
              source: 'director',
            });
          }
        }
        if (newGalleryItems.length > 0) galleryState.addItems(newGalleryItems);
      } catch { /* gallery migration failed — non-critical, chars still load */ }

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

  trainLoRA: async (characterId: string) => {
    const char = get().characters.find(c => c.id === characterId);
    if (!char) return;

    // Update status to training
    set(s => ({
      characters: s.characters.map(c =>
        c.id === characterId ? { ...c, loraTrainingStatus: 'training' as const } : c
      ),
    }));

    try {
      const { trainLoRAForCharacter } = await import('../services/falService');
      const images = char.modelImageBlobs || [];
      if (images.length < 5) throw new Error('Need at least 5 reference images');

      const result = await trainLoRAForCharacter(images, char.name || 'subject');

      // Persist to Supabase so status survives page refresh
      const userId = get()._userId;
      if (userId) {
        updateCharacterInCloud(
          { ...char, loraUrl: result.loraUrl, loraTrainingStatus: 'ready' as const },
          userId,
        ).catch(() => {});
      }

      set(s => ({
        characters: s.characters.map(c =>
          c.id === characterId
            ? { ...c, loraUrl: result.loraUrl, loraTrainingStatus: 'ready' as const, loraTrainedAt: Date.now() }
            : c
        ),
      }));
    } catch (err) {
      set(s => ({
        characters: s.characters.map(c =>
          c.id === characterId ? { ...c, loraTrainingStatus: 'failed' as const } : c
        ),
      }));
      throw err;
    }
  },
}));
