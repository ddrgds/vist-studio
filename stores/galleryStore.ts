import { create } from 'zustand';
import type {
  GeneratedContent,
  InfluencerParams,
  PoseModificationParams,
  VideoParams,
  AIEditParams,
  AIProvider,
  FalModel,
  ReplicateModel,
  OpenAIModel,
  IdeogramModel,
} from '../types';
import {
  saveHistoryItem, loadHistoryItems, deleteHistoryItem, updateHistoryItem,
} from '../services/storageService';
import {
  saveGalleryItem, loadGalleryItems, deleteGalleryItem, updateGalleryItem,
} from '../services/supabaseService';

// ─────────────────────────────────────────────
// Item type — superset of GeneratedContent
// ─────────────────────────────────────────────

export interface GalleryItem {
  id: string;
  url: string;
  prompt?: string;
  model?: string;
  timestamp: number;
  type: 'create' | 'edit' | 'video' | 'session';
  characterId?: string;

  // Persistence fields (from GeneratedContent)
  favorite?: boolean;
  tags?: string[];
  params?: InfluencerParams | PoseModificationParams | VideoParams | AIEditParams;
  source?: 'generate' | 'director';
  aiProvider?: AIProvider;
  falModel?: FalModel;
  replicateModel?: ReplicateModel;
  openaiModel?: OpenAIModel;
  ideogramModel?: IdeogramModel;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Convert GalleryItem → GeneratedContent for the storage layer. */
const toGeneratedContent = (item: GalleryItem): GeneratedContent => ({
  id: item.id,
  url: item.url,
  // The storage layer expects a params object; default to empty if not set
  params: (item.params ?? {}) as GeneratedContent['params'],
  timestamp: item.timestamp,
  // 'session' is not a valid GeneratedContent type — map to 'create'
  type: item.type === 'session' ? 'create' : item.type,
  favorite: item.favorite,
  tags: item.tags,
  source: item.source,
  aiProvider: item.aiProvider,
  falModel: item.falModel,
  replicateModel: item.replicateModel,
  openaiModel: item.openaiModel,
  ideogramModel: item.ideogramModel,
});

/** Convert GeneratedContent → GalleryItem when loading from storage. */
const fromGeneratedContent = (gc: GeneratedContent): GalleryItem => ({
  id: gc.id,
  url: gc.url,
  timestamp: gc.timestamp,
  type: gc.type,
  params: gc.params,
  favorite: gc.favorite,
  tags: gc.tags,
  source: gc.source,
  aiProvider: gc.aiProvider,
  falModel: gc.falModel,
  replicateModel: gc.replicateModel,
  openaiModel: gc.openaiModel,
  ideogramModel: gc.ideogramModel,
});

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

interface GalleryState {
  items: GalleryItem[];
  selectedItem: GalleryItem | null;
  previewImage: string | null;

  /** True while hydrate() is loading data */
  isLoading: boolean;
  /** User ID set during hydrate — used for cloud persistence */
  _userId: string | undefined;

  hydrate: (userId?: string) => Promise<void>;
  addItems: (items: GalleryItem[]) => void;
  removeItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSelectedItem: (item: GalleryItem | null) => void;
  setPreviewImage: (url: string | null) => void;
  setItems: (items: GalleryItem[]) => void;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  items: [],
  selectedItem: null,
  previewImage: null,
  isLoading: false,
  _userId: undefined,

  // ─── Hydrate ────────────────────────────────
  hydrate: async (userId?: string) => {
    set({ isLoading: true, _userId: userId });

    try {
      let loaded: GeneratedContent[];

      if (userId) {
        try {
          loaded = await loadGalleryItems(userId);
        } catch {
          // Cloud unavailable — fall back to IndexedDB
          loaded = await loadHistoryItems();
        }
      } else {
        loaded = await loadHistoryItems();
      }

      set({ items: loaded.map(fromGeneratedContent) });
    } catch (err) {
      console.error('galleryStore hydrate failed:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── Add ────────────────────────────────────
  addItems: (newItems) => {
    // Optimistic update
    set((s) => ({ items: [...newItems, ...s.items] }));

    // Persist async
    const { _userId } = get();
    for (const item of newItems) {
      const gc = toGeneratedContent(item);

      // Always save to IndexedDB
      saveHistoryItem(gc).catch((err) =>
        console.warn('IndexedDB save failed:', err),
      );

      // Fire-and-forget cloud save
      if (_userId) {
        saveGalleryItem(gc, _userId).catch((err) =>
          console.warn('Cloud save failed:', err),
        );
      }
    }
  },

  // ─── Remove ─────────────────────────────────
  removeItem: (id) => {
    // Optimistic update
    set((s) => ({
      items: s.items.filter((item) => item.id !== id),
    }));

    // Persist async
    const { _userId } = get();
    deleteHistoryItem(id).catch((err) =>
      console.warn('IndexedDB delete failed:', err),
    );
    if (_userId) {
      deleteGalleryItem(id, _userId).catch((err) =>
        console.warn('Cloud delete failed:', err),
      );
    }
  },

  // ─── Toggle Favorite ───────────────────────
  toggleFavorite: (id) => {
    let updatedItem: GalleryItem | undefined;

    set((s) => ({
      items: s.items.map((item) => {
        if (item.id !== id) return item;
        updatedItem = { ...item, favorite: !item.favorite };
        return updatedItem;
      }),
    }));

    if (!updatedItem) return;

    const gc = toGeneratedContent(updatedItem);
    const { _userId } = get();

    updateHistoryItem(gc).catch((err) =>
      console.warn('IndexedDB update failed:', err),
    );
    if (_userId) {
      updateGalleryItem(gc, _userId).catch((err) =>
        console.warn('Cloud update failed:', err),
      );
    }
  },

  setSelectedItem: (item) => set({ selectedItem: item }),
  setPreviewImage: (url) => set({ previewImage: url }),
  setItems: (items) => set({ items }),
}));
