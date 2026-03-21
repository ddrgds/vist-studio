/// <reference types="vite/client" />
import { supabase } from './supabaseService';
import { SavedCharacter } from '../types';

const BUCKET = 'character-assets';

// ─────────────────────────────────────────────
// UPLOAD (save + upsert full character)
// ─────────────────────────────────────────────

/**
 * Uploads all image blobs to Supabase Storage and upserts the character row.
 * Called on create and on updates that change blob data (model images / outfit).
 */
export const uploadCharacterToCloud = async (
  char: SavedCharacter,
  userId: string,
): Promise<void> => {
  // Upload model image blobs
  const modelImageUrls: string[] = [];
  for (let i = 0; i < char.modelImageBlobs.length; i++) {
    const blob = char.modelImageBlobs[i];
    const ext = (blob.type?.split('/')[1]) || 'jpg';
    const path = `${userId}/${char.id}/model-${i}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });

    if (uploadErr) throw new Error(`Model blob upload failed: ${uploadErr.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    modelImageUrls.push(data.publicUrl);
  }

  // Upload outfit blob (if any)
  let outfitUrl: string | null = null;
  if (char.outfitBlob) {
    const ext = (char.outfitBlob.type?.split('/')[1]) || 'jpg';
    const path = `${userId}/${char.id}/outfit.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, char.outfitBlob, { contentType: char.outfitBlob.type || 'image/jpeg', upsert: true });

    if (uploadErr) throw new Error(`Outfit blob upload failed: ${uploadErr.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    outfitUrl = data.publicUrl;
  }

  // Upsert metadata row (no blobs — URLs only)
  const { error } = await supabase.from('characters').upsert({
    id: char.id,
    user_id: userId,
    name: char.name,
    thumbnail: char.thumbnail,
    model_image_urls: modelImageUrls,
    outfit_url: outfitUrl,
    outfit_description: char.outfitDescription,
    characteristics: char.characteristics,
    accessory: char.accessory,
    lora_url: char.loraUrl ?? null,
    lora_training_status: char.loraTrainingStatus ?? 'idle',
    lora_trained_at: char.loraTrainedAt ?? null,
    created_at: char.createdAt,
    updated_at: char.updatedAt,
    usage_count: char.usageCount,
    // DB: ALTER TABLE characters ADD COLUMN IF NOT EXISTS reference_photo_urls text[] DEFAULT '{}';
    reference_photo_urls: char.referencePhotoUrls ?? [],
  });

  if (error) throw new Error(`characters upsert failed: ${error.message}`);
};

// ─────────────────────────────────────────────
// UPDATE (scalar fields only — no blob re-upload)
// ─────────────────────────────────────────────

/**
 * Updates only scalar fields (name, usage, lora status, etc.) without
 * re-uploading blobs. Used for rename, usage increment, Soul ID status.
 */
export const updateCharacterInCloud = async (
  char: SavedCharacter,
  userId: string,
): Promise<void> => {
  const { error } = await supabase
    .from('characters')
    .update({
      name: char.name,
      thumbnail: char.thumbnail,
      outfit_description: char.outfitDescription,
      characteristics: char.characteristics,
      accessory: char.accessory,
      lora_url: char.loraUrl ?? null,
      lora_training_status: char.loraTrainingStatus ?? 'idle',
      lora_trained_at: char.loraTrainedAt ?? null,
      updated_at: char.updatedAt,
      usage_count: char.usageCount,
      reference_photo_urls: char.referencePhotoUrls ?? [],
    })
    .eq('id', char.id)
    .eq('user_id', userId);

  if (error) throw new Error(`characters update failed: ${error.message}`);
};

// ─────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────

/**
 * Loads all characters from Supabase, downloading image blobs from Storage.
 * Returns SavedCharacter[] with populated Blob arrays (mirrors local IndexedDB shape).
 */
export const loadCharactersFromCloud = async (userId: string): Promise<SavedCharacter[]> => {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`loadCharactersFromCloud failed: ${error.message}`);

  const rows = (data ?? []) as Record<string, unknown>[];

  const characters = await Promise.all(rows.map(async (row) => {
    // Download model image blobs from Storage URLs
    const modelImageUrls = (row.model_image_urls as string[]) ?? [];
    const modelImageBlobs: Blob[] = await Promise.all(
      modelImageUrls.map(async (url) => {
        const res = await fetch(url);
        return res.blob();
      })
    );

    // Download outfit blob (if any)
    let outfitBlob: Blob | null = null;
    if (row.outfit_url) {
      const res = await fetch(row.outfit_url as string);
      outfitBlob = await res.blob();
    }

    return {
      id: row.id as string,
      name: row.name as string,
      thumbnail: row.thumbnail as string,
      modelImageBlobs,
      outfitBlob,
      outfitDescription: (row.outfit_description as string) ?? '',
      characteristics: (row.characteristics as string) ?? '',
      accessory: (row.accessory as string) ?? '',
      loraUrl: row.lora_url as string | undefined,
      loraTrainingStatus: (row.lora_training_status as SavedCharacter['loraTrainingStatus']) ?? 'idle',
      loraTrainedAt: row.lora_trained_at as number | undefined,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      usageCount: (row.usage_count as number) ?? 0,
      referencePhotoUrls: (row.reference_photo_urls as string[]) ?? [],
    } satisfies SavedCharacter;
  }));

  return characters;
};

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

/**
 * Removes all Storage files for a character and deletes the DB row.
 */
export const deleteCharacterFromCloud = async (id: string, userId: string): Promise<void> => {
  // List all files in the character's folder and remove them
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${id}`);

  if (files && files.length > 0) {
    const paths = files.map(f => `${userId}/${id}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }

  // Delete DB row
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`deleteCharacterFromCloud failed: ${error.message}`);
};
