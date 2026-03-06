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

  // ─── Errors ────────────────────────────────
  const [error, setError] = useState<string | null>(null);

  // ─── Loaders ───────────────────────────────
  const refreshHistory = async () => {
    if (user) {
      try {
        const items = await loadGalleryItems(user.id);
        setGeneratedHistory(items);
      } catch {
        // Fallback silencioso a IndexedDB si Supabase no está disponible
        const items = await loadHistoryItems();
        setGeneratedHistory(items);
      }
    } else {
      const items = await loadHistoryItems();
      setGeneratedHistory(items);
    }
  };

  const refreshCustomPresets = async () => {
    if (user) {
      try {
        const items = await loadPresetsFromCloud(user.id);
        setCustomPresets(items);
      } catch {
        const items = await loadCustomPresets();
        setCustomPresets(items);
      }
    } else {
      const items = await loadCustomPresets();
      setCustomPresets(items);
    }
  };

  const refreshInspiration = async () => {
    const items = await loadInspirationImages();
    setInspirationImages(items);
  };

  // Recargar cuando cambie el usuario
  useEffect(() => {
    refreshHistory();
    refreshCustomPresets();
    refreshInspiration();
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
    result.sort((a, b) =>
      sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );
    return result;
  }, [generatedHistory, filterType, sortOrder]);

  // ─── Gallery Mutations ─────────────────────
  const addItems = async (items: GeneratedContent[]) => {
    setGeneratedHistory(prev => [...items, ...prev]);
    for (const item of items) {
      if (user) {
        try {
          await saveGalleryItem(item, user.id);
        } catch (saveErr) {
          // Fallback: guardar localmente si Supabase falla
          await saveHistoryItem(item);
          console.warn('Supabase save failed, saved locally instead:', saveErr);
          toast.warning('Sin conexión a la nube — guardado localmente');
        }
      } else {
        await saveHistoryItem(item);
      }
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
      toast.error('No se pudo eliminar. Los cambios han sido revertidos.');
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
      toast.success(`${ids.length} ${ids.length === 1 ? 'elemento eliminado' : 'elementos eliminados'}`);
    } catch (err) {
      setGeneratedHistory(backup);
      setSelectedIds(new Set(ids));
      toast.error('Error al eliminar. Los elementos han sido restaurados.');
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

  return (
    <GalleryContext.Provider value={{
      generatedHistory, setGeneratedHistory,
      addItems, deleteItem, batchDeleteItems, refreshHistory,
      toggleFavorite,
      updateItemTags, allTags,
      storyboardIds, addToStoryboard, removeFromStoryboard, reorderStoryboard,
      filterType, setFilterType,
      sortOrder, setSortOrder,
      filteredHistory,
      selectedIds, toggleSelection, clearSelection, isSelectionMode,
      deleteConfirmId, setDeleteConfirmId,
      selectedItem, setSelectedItem,
      editingItem, setEditingItem,
      previewImage, setPreviewImage,
      customPresets, refreshCustomPresets, savePreset, deletePreset,
      inspirationImages, refreshInspiration, addInspiration, deleteInspiration,
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
