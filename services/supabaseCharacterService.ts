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
): Promise<{ modelImageUrls: string[]; referencePhotoUrls: string[] }> => {
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

  // Permanent reference URLs = model image URLs from Supabase storage
  const referencePhotoUrls = modelImageUrls.length > 0 ? modelImageUrls : (char.referencePhotoUrls ?? []);

  // Upsert metadata row (no blobs — URLs only)
  const row: Record<string, unknown> = {
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
    reference_photo_urls: referencePhotoUrls,
    // DB: ALTER TABLE characters ADD COLUMN IF NOT EXISTS render_style text;
    render_style: char.renderStyle ?? null,
  };

  // Add voice columns conditionally — caller's migration 004 may not be applied
  if (char.voiceId !== undefined || char.voiceName !== undefined) {
    Object.assign(row, {
      voice_id: char.voiceId ?? null,
      voice_name: char.voiceName ?? null,
      voice_source: char.voiceSource ?? null,
      voice_preview_url: char.voicePreviewUrl ?? null,
      voice_created_at: char.voiceCreatedAt ? new Date(char.voiceCreatedAt).toISOString() : null,
    });
  }

  let { error } = await supabase.from('characters').upsert(row);

  // Retry without voice columns if migration 004 wasn't applied
  if (error && /column.*voice_.*does not exist|42703|PGRST204/i.test(`${error.message} ${(error as any).code ?? ''}`)) {
    console.warn('[saveCharacter] Voice columns missing — retrying without. Run migration 004_character_voice.sql.');
    const fallbackRow = { ...row };
    delete (fallbackRow as any).voice_id;
    delete (fallbackRow as any).voice_name;
    delete (fallbackRow as any).voice_source;
    delete (fallbackRow as any).voice_preview_url;
    delete (fallbackRow as any).voice_created_at;
    ({ error } = await supabase.from('characters').upsert(fallbackRow));
  }

  if (error) throw new Error(`characters upsert failed: ${error.message}`);

  return { modelImageUrls, referencePhotoUrls };
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
  const baseUpdate: Record<string, unknown> = {
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
    render_style: char.renderStyle ?? null,
  };
  // Only include voice fields if the caller is setting them (migration 004 may not be applied)
  if (char.voiceId !== undefined || char.voiceName !== undefined) {
    Object.assign(baseUpdate, {
      voice_id: char.voiceId ?? null,
      voice_name: char.voiceName ?? null,
      voice_source: char.voiceSource ?? null,
      voice_preview_url: char.voicePreviewUrl ?? null,
      voice_created_at: char.voiceCreatedAt ? new Date(char.voiceCreatedAt).toISOString() : null,
    });
  }

  let { error } = await supabase
    .from('characters')
    .update(baseUpdate)
    .eq('id', char.id)
    .eq('user_id', userId);

  // Retry without voice columns if migration 004 wasn't applied
  if (error && /column.*voice_.*does not exist|42703|PGRST204/i.test(`${error.message} ${(error as any).code ?? ''}`)) {
    console.warn('[updateCharacter] Voice columns missing — retrying without. Run migration 004_character_voice.sql.');
    const fallback = { ...baseUpdate };
    delete (fallback as any).voice_id;
    delete (fallback as any).voice_name;
    delete (fallback as any).voice_source;
    delete (fallback as any).voice_preview_url;
    delete (fallback as any).voice_created_at;
    ({ error } = await supabase
      .from('characters')
      .update(fallback)
      .eq('id', char.id)
      .eq('user_id', userId));
  }

  if (error) throw new Error(`characters update failed: ${error.message}`);
};

// ─────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────

/**
 * Loads all characters from Supabase — returns URLs only, no blob downloads.
 * Blobs are fetched lazily at generation time from modelImageUrls.
 *
 * Defensive: tries with voice columns first. If they don't exist yet
 * (migration 004 not applied), retries without them so existing users
 * don't lose access to their characters until they run the migration.
 */
const CORE_COLUMNS = 'id, name, model_image_urls, characteristics, accessory, created_at, updated_at, usage_count, reference_photo_urls, render_style';
const VOICE_COLUMNS = 'voice_id, voice_name, voice_source, voice_preview_url, voice_created_at';

export const loadCharactersFromCloud = async (userId: string): Promise<SavedCharacter[]> => {
  // Attempt full query first (typed as any since the column set varies on retry)
  let res: { data: any; error: any } = await supabase
    .from('characters')
    .select(`${CORE_COLUMNS}, ${VOICE_COLUMNS}`)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);

  // If voice columns don't exist (PGRST204 / 42703), fall back to core columns
  if (res.error && /column.*voice_.*does not exist|42703|PGRST204/i.test(`${res.error.message} ${res.error.code ?? ''}`)) {
    console.warn('[loadCharactersFromCloud] Voice columns missing — falling back. Run migration 004_character_voice.sql to enable voice features.');
    res = await supabase
      .from('characters')
      .select(CORE_COLUMNS)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);
  }

  if (res.error) throw new Error(`loadCharactersFromCloud failed: ${res.error.message}`);

  const rows = (res.data ?? []) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    thumbnail: ((row.model_image_urls as string[]) ?? [])[0] ?? '',
    modelImageBlobs: [],
    outfitBlob: null,
    modelImageUrls: (row.model_image_urls as string[]) ?? [],
    outfitDescription: '',
    characteristics: (row.characteristics as string) ?? '',
    accessory: (row.accessory as string) ?? '',
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    usageCount: (row.usage_count as number) ?? 0,
    referencePhotoUrls: (row.reference_photo_urls as string[]) ?? [],
    renderStyle: (row.render_style as string) ?? undefined,
    voiceId: (row.voice_id as string) ?? undefined,
    voiceName: (row.voice_name as string) ?? undefined,
    voiceSource: (row.voice_source as 'cloned' | 'library' | 'shared') ?? undefined,
    voicePreviewUrl: (row.voice_preview_url as string) ?? undefined,
    voiceCreatedAt: row.voice_created_at ? new Date(row.voice_created_at as string).getTime() : undefined,
  } satisfies SavedCharacter));
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
