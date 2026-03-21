/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { GeneratedContent, CustomPreset } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────────
// ERROR HELPER
// ─────────────────────────────────────────────

/**
 * Extracts a readable message from any error type.
 * Used internally to log and re-throw errors with context.
 */
const toMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown Supabase error';
};

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// ─────────────────────────────────────────────
// GALLERY (generated images)
// ─────────────────────────────────────────────

/**
 * Uploads a base64 or blob image to Supabase Storage and saves the record in the DB.
 * Throws an error if it fails so the caller can show feedback to the user.
 */
export const saveGalleryItem = async (item: GeneratedContent, userId: string): Promise<void> => {
  try {
    let publicUrl = item.url;

    // If the URL is base64 or blob, upload to storage
    if (item.url.startsWith('data:') || item.url.startsWith('blob:')) {
      const res = await fetch(item.url);
      let blob = await res.blob();

      // Compress images before upload (skip videos)
      const isVideo = item.type === 'video';
      if (!isVideo) blob = await compressImage(blob);

      const ext = isVideo ? 'mp4' : (blob.type === 'image/webp' ? 'webp' : 'png');
      const path = `${userId}/${item.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(path, blob, { contentType: blob.type, upsert: true });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path);
      publicUrl = urlData.publicUrl;
    }

    // Save metadata in DB (without File objects which are not serializable)
    const { error } = await supabase.from('gallery_items').upsert({
      id: item.id,
      user_id: userId,
      url: publicUrl,
      type: item.type === 'video' ? 'video' : 'image',
      generation_type: item.type,
      params: serializeParams(item.params),
      timestamp: item.timestamp,
      source: item.source ?? 'director',
      character_id: item.characterId ?? null,  // column: ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES characters(id) ON DELETE SET NULL;
    });

    if (error) throw new Error(`DB upsert failed: ${error.message}`);
  } catch (err) {
    // Re-throw with context so App.tsx can show a message to the user
    throw new Error(`Could not save to cloud: ${toMessage(err)}`);
  }
};

export const loadGalleryItems = async (userId: string): Promise<GeneratedContent[]> => {
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    // loadGalleryItems can fail without crashing the app — returns [] and throws so the caller decides
    throw new Error(`Could not load gallery: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    url: row.url,
    type: row.generation_type as 'create' | 'edit' | 'video',
    params: row.params || {},
    timestamp: row.timestamp,
    favorite: row.favorite ?? false,
    source: (row.source as 'generate' | 'director') ?? 'director',
    characterId: row.character_id ?? undefined,
  }));
};

export const updateGalleryItem = async (item: GeneratedContent, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('gallery_items')
    .update({ favorite: item.favorite ?? false })
    .eq('id', item.id)
    .eq('user_id', userId);

  if (error) console.warn(`Could not update gallery item: ${error.message}`);
};

export const deleteGalleryItem = async (id: string, userId: string): Promise<void> => {
  // Delete from storage (try both extensions, ignore "not found" errors)
  await supabase.storage.from('gallery').remove([`${userId}/${id}.png`]);
  await supabase.storage.from('gallery').remove([`${userId}/${id}.mp4`]);

  // Delete from DB — do throw if it fails
  const { error } = await supabase.from('gallery_items').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Could not delete the item: ${error.message}`);
};

// ─────────────────────────────────────────────
// PRESETS
// ─────────────────────────────────────────────

export const savePresetToCloud = async (preset: CustomPreset, userId: string): Promise<void> => {
  const { error } = await supabase.from('presets').upsert({
    id: preset.id,
    user_id: userId,
    name: preset.name,
    config: preset.data,
  });
  if (error) throw new Error(`Could not save the preset: ${error.message}`);
};

export const loadPresetsFromCloud = async (userId: string): Promise<CustomPreset[]> => {
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Could not load presets: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    data: row.config || {},
  }));
};

export const deletePresetFromCloud = async (id: string, userId: string): Promise<void> => {
  const { error } = await supabase.from('presets').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Could not delete the preset: ${error.message}`);
};

// ─────────────────────────────────────────────
// COMMUNITY FEED
// ─────────────────────────────────────────────

export interface CommunityShare {
  id: string;
  user_id: string;
  gallery_item_id: string;
  image_url: string;
  caption: string;
  display_name: string;
  avatar_url: string | null;
  shared_at: string;
}

export const shareToCommunity = async (
  galleryItem: GeneratedContent,
  userId: string,
  displayName: string,
  avatarUrl: string | null,
): Promise<void> => {
  const { error } = await supabase.from('community_shares').upsert({
    user_id: userId,
    gallery_item_id: galleryItem.id,
    image_url: galleryItem.url,
    caption: '',
    display_name: displayName || 'Anonymous',
    avatar_url: avatarUrl,
  }, { onConflict: 'user_id,gallery_item_id' });
  if (error) throw new Error(`Could not share: ${error.message}`);
};

export const unshareFromCommunity = async (
  galleryItemId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabase
    .from('community_shares')
    .delete()
    .eq('gallery_item_id', galleryItemId)
    .eq('user_id', userId);
  if (error) throw new Error(`Could not unshare: ${error.message}`);
};

export const loadCommunityFeed = async (
  limit = 20,
  offset = 0,
): Promise<CommunityShare[]> => {
  const { data, error } = await supabase
    .from('community_shares')
    .select('*')
    .order('shared_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Could not load community feed: ${error.message}`);
  return data || [];
};

export const loadUserSharedIds = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('community_shares')
    .select('gallery_item_id')
    .eq('user_id', userId);
  if (error) return new Set();
  return new Set((data || []).map(r => r.gallery_item_id));
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Compresses an image blob to WebP (quality 0.82) using canvas.
 * Returns the original blob if compression fails or the result is larger.
 */
const compressImage = (blob: Blob): Promise<Blob> => {
  if (!blob.type.startsWith('image/') || blob.type === 'image/gif') return Promise.resolve(blob);
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(blob); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((result) => {
        if (result && result.size < blob.size) {
          resolve(result);
        } else {
          resolve(blob); // Original was smaller or conversion failed
        }
      }, 'image/webp', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
};

/**
 * Removes File/Blob objects (not serializable to JSON) from params before saving to DB.
 */
const serializeParams = (params: unknown): unknown => {
  if (!params) return {};
  return JSON.parse(JSON.stringify(params, (_, value) => {
    if (value instanceof File) return undefined;
    if (value instanceof Blob) return undefined;
    return value;
  }));
};
