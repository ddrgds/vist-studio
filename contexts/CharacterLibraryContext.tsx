import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SavedCharacter, CharacterParams } from '../types';
import {
  loadCharacters,
  saveCharacter,
  updateCharacterRecord,
  deleteCharacterById,
  computeThumbnail,
} from '../services/characterStorageService';
import {
  uploadCharacterToCloud,
  updateCharacterInCloud,
  loadCharactersFromCloud,
  deleteCharacterFromCloud,
} from '../services/supabaseCharacterService';
import { trainLoRAForCharacter } from '../services/falService';
import { useAuth } from './AuthContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface CharacterLibraryValue {
  savedCharacters: SavedCharacter[];
  isLoading: boolean;
  saveCurrentCharacter: (
    name: string,
    charParams: CharacterParams
  ) => Promise<SavedCharacter>;
  deleteCharacter: (id: string) => Promise<void>;
  renameCharacter: (id: string, name: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;
  loadCharacterIntoForm: (
    char: SavedCharacter,
    targetCharacterId: string,
    updateCharacter: (id: string, field: keyof Omit<CharacterParams, 'id'>, value: any) => void
  ) => void;
  trainSoulId: (
    id: string,
    onProgress?: (p: number) => void,
    abortSignal?: AbortSignal,
  ) => Promise<void>;
  refreshCharacters: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const CharacterLibraryContext = createContext<CharacterLibraryValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const CharacterLibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Load on mount / user change ───────────────────────────────────────────
  // Authenticated: load from Supabase (source of truth).
  // Anonymous: load from IndexedDB.
  const refreshCharacters = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        try {
          const items = await loadCharactersFromCloud(user.id);
          setSavedCharacters(items);
        } catch (cloudErr) {
          console.warn('CharacterLibrary: cloud load failed, falling back to local', cloudErr);
          const items = await loadCharacters();
          setSavedCharacters(items);
        }
      } else {
        const items = await loadCharacters();
        setSavedCharacters(items);
      }
    } catch (err) {
      console.error('CharacterLibrary: failed to load', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshCharacters(); }, [refreshCharacters]);

  // ─── Save ──────────────────────────────────────────────────────────────────
  // File extends Blob — we store File[] directly as Blob[] in IndexedDB.
  // No conversion needed; IndexedDB serializes Blobs natively.
  const saveCurrentCharacter = useCallback(async (
    name: string,
    charParams: CharacterParams
  ): Promise<SavedCharacter> => {
    const modelImageBlobs: Blob[] = charParams.modelImages ?? [];
    const outfitBlob: Blob | null = charParams.outfitImages?.[0] ?? null;
    const thumbnail = await computeThumbnail(modelImageBlobs);
    const now = Date.now();

    const newChar: SavedCharacter = {
      id: crypto.randomUUID(),
      name,
      thumbnail,
      modelImageBlobs,
      outfitBlob,
      outfitDescription: charParams.outfitDescription ?? '',
      characteristics: charParams.characteristics ?? '',
      accessory: charParams.accessory ?? '',
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    // Always save locally
    await saveCharacter(newChar);
    setSavedCharacters(prev => [newChar, ...prev]);

    // Mirror to cloud (fire-and-forget — blobs upload in background)
    if (user) {
      uploadCharacterToCloud(newChar, user.id).catch(err =>
        console.warn('CharacterLibrary: cloud save failed', err)
      );
    }

    return newChar;
  }, [user]);

  // ─── Delete ────────────────────────────────────────────────────────────────
  const deleteCharacter = useCallback(async (id: string) => {
    setSavedCharacters(prev => prev.filter(c => c.id !== id));
    await deleteCharacterById(id);
    if (user) {
      deleteCharacterFromCloud(id, user.id).catch(err =>
        console.warn('CharacterLibrary: cloud delete failed', err)
      );
    }
  }, [user]);

  // ─── Rename ────────────────────────────────────────────────────────────────
  const renameCharacter = useCallback(async (id: string, name: string) => {
    let updated: SavedCharacter | undefined;
    setSavedCharacters(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        updated = { ...c, name, updatedAt: Date.now() };
        return updated;
      })
    );
    if (updated) {
      await updateCharacterRecord(updated);
      if (user) {
        updateCharacterInCloud(updated, user.id).catch(err =>
          console.warn('CharacterLibrary: cloud rename failed', err)
        );
      }
    }
  }, [user]);

  // ─── Increment usage ───────────────────────────────────────────────────────
  const incrementUsage = useCallback(async (id: string) => {
    let updated: SavedCharacter | undefined;
    setSavedCharacters(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        updated = { ...c, usageCount: c.usageCount + 1, updatedAt: Date.now() };
        return updated;
      })
    );
    if (updated) {
      await updateCharacterRecord(updated);
      if (user) {
        updateCharacterInCloud(updated, user.id).catch(err =>
          console.warn('CharacterLibrary: cloud usage update failed', err)
        );
      }
    }
  }, [user]);

  // ─── Load into form ────────────────────────────────────────────────────────
  // Converts stored Blobs back to File objects (File constructor accepts Blob).
  // Purely synchronous — Blob→File is an in-memory operation.
  // Takes updateCharacter as a callback argument to avoid importing FormContext
  // and creating a circular context dependency.
  const loadCharacterIntoForm = useCallback((
    char: SavedCharacter,
    targetCharacterId: string,
    updateCharacter: (id: string, field: keyof Omit<CharacterParams, 'id'>, value: any) => void
  ) => {
    const modelFiles = char.modelImageBlobs.map((blob, i) =>
      new File([blob], `face-ref-${i}.jpg`, { type: blob.type || 'image/jpeg' })
    );
    const outfitFiles = char.outfitBlob
      ? [new File([char.outfitBlob], 'outfit-ref.jpg', { type: char.outfitBlob.type || 'image/jpeg' })]
      : [];

    updateCharacter(targetCharacterId, 'modelImages', modelFiles);
    updateCharacter(targetCharacterId, 'outfitImages', outfitFiles);
    updateCharacter(targetCharacterId, 'outfitDescription', char.outfitDescription);
    updateCharacter(targetCharacterId, 'characteristics', char.characteristics);
    updateCharacter(targetCharacterId, 'accessory', char.accessory);
  }, []);

  // ─── Soul ID training ──────────────────────────────────────────────────────
  const trainSoulId = useCallback(async (
    id: string,
    onProgress?: (p: number) => void,
    abortSignal?: AbortSignal,
  ) => {
    const char = savedCharacters.find(c => c.id === id);
    if (!char) throw new Error('Character not found');
    if (char.modelImageBlobs.length === 0) throw new Error('Upload at least one face reference photo first.');

    // Mark as training
    const training: SavedCharacter = { ...char, loraTrainingStatus: 'training', updatedAt: Date.now() };
    setSavedCharacters(prev => prev.map(c => c.id === id ? training : c));
    await updateCharacterRecord(training);
    if (user) updateCharacterInCloud(training, user.id).catch(e => console.warn('cloud sync', e));

    try {
      // Derive a safe trigger word from the character name (no spaces, uppercase)
      const triggerWord = char.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'CHAR';
      const { loraUrl } = await trainLoRAForCharacter(char.modelImageBlobs, triggerWord, onProgress, abortSignal);

      const ready: SavedCharacter = {
        ...training,
        loraUrl,
        loraTrainingStatus: 'ready',
        loraTrainedAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSavedCharacters(prev => prev.map(c => c.id === id ? ready : c));
      await updateCharacterRecord(ready);
      if (user) updateCharacterInCloud(ready, user.id).catch(e => console.warn('cloud sync', e));
    } catch (err) {
      if (abortSignal?.aborted) {
        // Revert to idle on cancel
        const reverted: SavedCharacter = { ...training, loraTrainingStatus: 'idle', updatedAt: Date.now() };
        setSavedCharacters(prev => prev.map(c => c.id === id ? reverted : c));
        await updateCharacterRecord(reverted);
        if (user) updateCharacterInCloud(reverted, user.id).catch(e => console.warn('cloud sync', e));
      } else {
        const failed: SavedCharacter = { ...training, loraTrainingStatus: 'failed', updatedAt: Date.now() };
        setSavedCharacters(prev => prev.map(c => c.id === id ? failed : c));
        await updateCharacterRecord(failed);
        if (user) updateCharacterInCloud(failed, user.id).catch(e => console.warn('cloud sync', e));
      }
      throw err;
    }
  }, [savedCharacters, user]);

  return (
    <CharacterLibraryContext.Provider value={{
      savedCharacters,
      isLoading,
      saveCurrentCharacter,
      deleteCharacter,
      renameCharacter,
      incrementUsage,
      loadCharacterIntoForm,
      trainSoulId,
      refreshCharacters,
    }}>
      {children}
    </CharacterLibraryContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useCharacterLibrary = (): CharacterLibraryValue => {
  const ctx = useContext(CharacterLibraryContext);
  if (!ctx) throw new Error('useCharacterLibrary must be used inside <CharacterLibraryProvider>');
  return ctx;
};
