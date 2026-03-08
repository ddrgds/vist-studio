import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { GeneratedContent, CustomPreset, InspirationImage } from '../types';
import {
  loadHistoryItems, saveHistoryItem, deleteHistoryItem,
  loadCustomPresets, saveCustomPreset, deleteCustomPreset,
  loadInspirationImages, saveInspirationImage, deleteInspirationImage,
  updateHistoryItem,
} from '../services/storageService';
import {
  saveGalleryItem, loadGalleryItems, deleteGalleryItem,
  savePresetToCloud, loadPresetsFromCloud, deletePresetFromCloud,
  updateGalleryItem,
  shareToCommunity, unshareFromCommunity, loadUserSharedIds,
} from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface GalleryContextValue {
  // Gallery
  generatedHistory: GeneratedContent[];
  setGeneratedHistory: React.Dispatch<React.SetStateAction<GeneratedContent[]>>;
  addItems: (items: GeneratedContent[]) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  batchDeleteItems: (ids: string[]) => Promise<void>;
  refreshHistory: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateItemTags: (id: string, tags: string[]) => Promise<void>;
  allTags: string[];

  // Storyboard
  storyboardIds: string[];
  addToStoryboard: (id: string) => void;
  removeFromStoryboard: (id: string) => void;
  reorderStoryboard: (ids: string[]) => void;

  // Filter / Sort
  filterType: 'all' | 'create' | 'edit' | 'video' | 'favorites';
  setFilterType: React.Dispatch<React.SetStateAction<'all' | 'create' | 'edit' | 'video' | 'favorites'>>;
  sourceFilter: 'all' | 'generate' | 'director';
  setSourceFilter: React.Dispatch<React.SetStateAction<'all' | 'generate' | 'director'>>;
  sortOrder: 'newest' | 'oldest';
  setSortOrder: React.Dispatch<React.SetStateAction<'newest' | 'oldest'>>;
  filteredHistory: GeneratedContent[];

  // Selection
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  isSelectionMode: boolean;

  // Delete confirm
  deleteConfirmId: string | null;
  setDeleteConfirmId: React.Dispatch<React.SetStateAction<string | null>>;

  // Modals
  selectedItem: GeneratedContent | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<GeneratedContent | null>>;
  editingItem: GeneratedContent | null;
  setEditingItem: React.Dispatch<React.SetStateAction<GeneratedContent | null>>;
  previewImage: string | null;
  setPreviewImage: React.Dispatch<React.SetStateAction<string | null>>;

  // Presets
  customPresets: CustomPreset[];
  refreshCustomPresets: () => Promise<void>;
  savePreset: (preset: CustomPreset) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;

  // Inspiration
  inspirationImages: InspirationImage[];
  refreshInspiration: () => Promise<void>;
  addInspiration: (file: File, name: string) => Promise<void>;
  deleteInspiration: (id: string) => Promise<void>;

  // Community sharing
  sharedIds: Set<string>;
  toggleShare: (item: GeneratedContent, displayName: string, avatarUrl: string | null) => Promise<void>;

  // Loading
  galleryLoading: boolean;

  // Error
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const GalleryContext = createContext<GalleryContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const GalleryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();

  // ─── Gallery ───────────────────────────────
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedContent[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'create' | 'edit' | 'video' | 'favorites'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'generate' | 'director'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<GeneratedContent | null>(null);
  const [editingItem, setEditingItem] = useState<GeneratedContent | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ─── Presets ───────────────────────────────
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);

  // ─── Inspiration ───────────────────────────
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);

  // ─── Community sharing ───────────────────────
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());

  // ─── Storyboard ────────────────────────────
  const STORYBOARD_KEY = 'vist_storyboard_ids';
  const [storyboardIds, setStoryboardIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORYBOARD_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // ─── Loading / Errors ─────────────────────────
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Loaders ───────────────────────────────
  const refreshHistory = async () => {
    setGeneratedHistory(prev => {
      prev.forEach(item => { if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url); });
      return prev;
    });
    if (user) {
      try {
        setGeneratedHistory(await loadGalleryItems(user.id));
      } catch {
        setGeneratedHistory(await loadHistoryItems());
      }
    } else {
      setGeneratedHistory(await loadHistoryItems());
    }
  };

  const refreshCustomPresets = async () => {
    if (user) {
      try {
        setCustomPresets(await loadPresetsFromCloud(user.id));
      } catch {
        setCustomPresets(await loadCustomPresets());
      }
    } else {
      setCustomPresets(await loadCustomPresets());
    }
  };

  const refreshInspiration = async () => {
    setInspirationImages(prev => {
      prev.forEach(img => { if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url); });
      return prev;
    });
    setInspirationImages(await loadInspirationImages());
  };

  // Reload when the user changes + cloud sync retry
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // 1. Load all data in parallel
      const [historyResult] = await Promise.allSettled([
        (async () => {
          // Revoke old blob URLs
          setGeneratedHistory(prev => {
            prev.forEach(item => { if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url); });
            return prev;
          });
          if (user) {
            try {
              const items = await loadGalleryItems(user.id);
              if (!cancelled) setGeneratedHistory(items);
              return items;
            } catch {
              const items = await loadHistoryItems();
              if (!cancelled) setGeneratedHistory(items);
              return null; // null = cloud unavailable
            }
          } else {
            const items = await loadHistoryItems();
            if (!cancelled) setGeneratedHistory(items);
            return null;
          }
        })(),
        (async () => {
          if (user) {
            try {
              const items = await loadPresetsFromCloud(user.id);
              if (!cancelled) setCustomPresets(items);
            } catch {
              const items = await loadCustomPresets();
              if (!cancelled) setCustomPresets(items);
            }
          } else {
            const items = await loadCustomPresets();
            if (!cancelled) setCustomPresets(items);
          }
        })(),
        (async () => {
          setInspirationImages(prev => {
            prev.forEach(img => { if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url); });
            return prev;
          });
          const items = await loadInspirationImages();
          if (!cancelled) setInspirationImages(items);
        })(),
        (async () => {
          if (user) {
            try {
              const ids = await loadUserSharedIds(user.id);
              if (!cancelled) setSharedIds(ids);
            } catch { /* silent */ }
          } else {
            setSharedIds(new Set());
          }
        })(),
      ]);

      if (!cancelled) setGalleryLoading(false);

      // 2. Cloud sync retry (only if logged in and cloud was reachable)
      if (!user || cancelled) return;
      const cloudItems = historyResult.status === 'fulfilled' ? historyResult.value : null;
      if (!cloudItems) return; // Cloud was unreachable

      try {
        const localItems = await loadHistoryItems();
        if (localItems.length === 0 || cancelled) return;

        const cloudIds = new Set(cloudItems.map(i => i.id));
        const pending = localItems.filter(i => !cloudIds.has(i.id));
        if (pending.length === 0) return;

        let synced = 0;
        for (const item of pending) {
          if (cancelled) break;
          try {
            await saveGalleryItem(item, user.id);
            await deleteHistoryItem(item.id);
            synced++;
          } catch { /* skip, retry next session */ }
        }
        if (synced > 0 && !cancelled) {
          console.info(`Cloud sync: uploaded ${synced}/${pending.length} local items`);
          const items = await loadGalleryItems(user.id);
          if (!cancelled) setGeneratedHistory(items);
        }
      } catch { /* silent */ }
    };

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── All Tags (computed) ───────────────────
  const allTags = useMemo<string[]>(() => {
    const tagSet = new Set<string>();
    generatedHistory.forEach(item => item.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [generatedHistory]);

  // ─── Filtered History ──────────────────────
  const filteredHistory = useMemo(() => {
    let result = [...generatedHistory];
    if (filterType === 'favorites') {
      result = result.filter(item => item.favorite === true);
    } else if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }
    if (sourceFilter !== 'all') {
      result = result.filter(item => item.source === sourceFilter);
    }
    result.sort((a, b) =>
      sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );
    return result;
  }, [generatedHistory, filterType, sourceFilter, sortOrder]);

  // ─── Gallery Mutations ─────────────────────
  const addItems = async (items: GeneratedContent[]) => {
    setGeneratedHistory(prev => [...items, ...prev]);
    if (user) {
      const results = await Promise.allSettled(
        items.map(item => saveGalleryItem(item, user.id))
      );
      // Fallback failed items to IndexedDB
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed.length > 0) {
        await Promise.allSettled(
          items.filter((_, i) => results[i].status === 'rejected').map(item => saveHistoryItem(item))
        );
        console.warn(`${failed.length}/${items.length} cloud saves failed, saved locally`, failed[0].reason);
        toast.warning('Some items saved locally (cloud unavailable)');
      }
    } else {
      await Promise.allSettled(items.map(item => saveHistoryItem(item)));
    }
  };

  const deleteItem = async (id: string) => {
    const backup = generatedHistory;
    setGeneratedHistory(prev => prev.filter(item => item.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    setDeleteConfirmId(null);

    try {
      if (user) {
        await deleteGalleryItem(id, user.id);
      } else {
        await deleteHistoryItem(id);
      }
    } catch (err) {
      setGeneratedHistory(backup);
      toast.error('Could not delete. Changes have been reverted.');
    }
  };

  const batchDeleteItems = async (ids: string[]) => {
    const backup = generatedHistory;
    setGeneratedHistory(prev => prev.filter(item => !ids.includes(item.id)));
    setSelectedIds(new Set());

    try {
      await Promise.all(ids.map(id =>
        user ? deleteGalleryItem(id, user.id) : deleteHistoryItem(id)
      ));
      toast.success(`${ids.length} ${ids.length === 1 ? 'item deleted' : 'items deleted'}`);
    } catch (err) {
      setGeneratedHistory(backup);
      setSelectedIds(new Set(ids));
      toast.error('Error deleting. Items have been restored.');
    }
  };

  // ─── Update Item Tags ──────────────────────
  const updateItemTags = async (id: string, tags: string[]) => {
    let updatedItem: GeneratedContent | undefined;
    setGeneratedHistory(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        updatedItem = { ...item, tags };
        return updatedItem;
      });
      return next;
    });
    if (updatedItem) {
      try {
        if (user) {
          await updateGalleryItem(updatedItem, user.id);
        } else {
          await updateHistoryItem(updatedItem);
        }
      } catch (err) {
        console.warn('Could not persist tags:', err);
      }
    }
  };

  // ─── Storyboard Mutations ──────────────────
  const addToStoryboard = (id: string) => {
    setStoryboardIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(STORYBOARD_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeFromStoryboard = (id: string) => {
    setStoryboardIds(prev => {
      const next = prev.filter(sid => sid !== id);
      localStorage.setItem(STORYBOARD_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reorderStoryboard = (ids: string[]) => {
    setStoryboardIds(ids);
    localStorage.setItem(STORYBOARD_KEY, JSON.stringify(ids));
  };

  // ─── Toggle Favorite ───────────────────────
  const toggleFavorite = async (id: string) => {
    let updatedItem: GeneratedContent | undefined;

    setGeneratedHistory(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        updatedItem = { ...item, favorite: !item.favorite };
        return updatedItem;
      });
      return next;
    });

    // Persist the change (best-effort, no rollback needed for a toggle)
    if (updatedItem) {
      try {
        if (user) {
          await updateGalleryItem(updatedItem, user.id);
        } else {
          await updateHistoryItem(updatedItem);
        }
      } catch (err) {
        console.warn('Could not persist favorite toggle:', err);
      }
    }
  };

  // ─── Selection ─────────────────────────────
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const isSelectionMode = selectedIds.size > 0;

  // ─── Preset Mutations ──────────────────────
  const savePreset = async (preset: CustomPreset) => {
    if (user) {
      await savePresetToCloud(preset, user.id);
    } else {
      await saveCustomPreset(preset);
    }
    await refreshCustomPresets();
  };

  const deletePreset = async (id: string) => {
    if (user) {
      await deletePresetFromCloud(id, user.id);
    } else {
      await deleteCustomPreset(id);
    }
    await refreshCustomPresets();
  };

  // ─── Inspiration Mutations ─────────────────
  const addInspiration = async (file: File, name: string) => {
    const newInspiration: InspirationImage = {
      id: crypto.randomUUID(),
      name,
      blob: file,
    };
    await saveInspirationImage(newInspiration);
    await refreshInspiration();
  };

  const deleteInspiration = async (id: string) => {
    await deleteInspirationImage(id);
    await refreshInspiration();
  };

  // ─── Community sharing ───────────────────────
  const toggleShare = async (item: GeneratedContent, displayName: string, avatarUrl: string | null) => {
    if (!user) return;
    if (sharedIds.has(item.id)) {
      await unshareFromCommunity(item.id, user.id);
      setSharedIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
      toast.info('Removed from community');
    } else {
      await shareToCommunity(item, user.id, displayName, avatarUrl);
      setSharedIds(prev => new Set(prev).add(item.id));
      toast.success('Shared to community!');
    }
  };

  return (
    <GalleryContext.Provider value={{
      generatedHistory, setGeneratedHistory,
      addItems, deleteItem, batchDeleteItems, refreshHistory,
      toggleFavorite,
      updateItemTags, allTags,
      storyboardIds, addToStoryboard, removeFromStoryboard, reorderStoryboard,
      filterType, setFilterType,
      sourceFilter, setSourceFilter,
      sortOrder, setSortOrder,
      filteredHistory,
      selectedIds, toggleSelection, clearSelection, isSelectionMode,
      deleteConfirmId, setDeleteConfirmId,
      selectedItem, setSelectedItem,
      editingItem, setEditingItem,
      previewImage, setPreviewImage,
      customPresets, refreshCustomPresets, savePreset, deletePreset,
      inspirationImages, refreshInspiration, addInspiration, deleteInspiration,
      sharedIds, toggleShare,
      galleryLoading,
      error, setError,
    }}>
      {children}
    </GalleryContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useGallery = (): GalleryContextValue => {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error('useGallery must be used inside <GalleryProvider>');
  return ctx;
};
