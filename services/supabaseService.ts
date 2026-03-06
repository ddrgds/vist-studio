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
 * Extrae un mensaje legible de cualquier tipo de error.
 * Usado internamente para loguear y re-lanzar errores con contexto.
 */
const toMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Error desconocido en Supabase';
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
// GALLERY (imágenes generadas)
// ─────────────────────────────────────────────

/**
 * Sube imagen base64 o blob a Supabase Storage y guarda el registro en BD.
 * Lanza error si falla para que el caller pueda mostrar feedback al usuario.
 */
export const saveGalleryItem = async (item: GeneratedContent, userId: string): Promise<void> => {
  try {
    let publicUrl = item.url;

    // Si la URL es base64 o blob, subir al storage
    if (item.url.startsWith('data:') || item.url.startsWith('blob:')) {
      const res = await fetch(item.url);
      const blob = await res.blob();

      const ext = item.type === 'video' ? 'mp4' : 'png';
      const path = `${userId}/${item.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(path, blob, { contentType: blob.type, upsert: true });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path);
      publicUrl = urlData.publicUrl;
    }

    // Guardar metadatos en BD (sin File objects que no son serializables)
    const { error } = await supabase.from('gallery_items').upsert({
      id: item.id,
      user_id: userId,
      url: publicUrl,
      type: item.type === 'video' ? 'video' : 'image',
      generation_type: item.type,
      params: serializeParams(item.params),
      timestamp: item.timestamp,
    });

    if (error) throw new Error(`DB upsert failed: ${error.message}`);
  } catch (err) {
    // Re-lanzar con contexto para que App.tsx pueda mostrar mensaje al usuario
    throw new Error(`No se pudo guardar en la nube: ${toMessage(err)}`);
  }
};

export const loadGalleryItems = async (userId: string): Promise<GeneratedContent[]> => {
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    // loadGalleryItems puede fallar sin crashear la app — devuelve [] y lanza para que el caller decida
    throw new Error(`No se pudo cargar la galería: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    url: row.url,
    type: row.generation_type as 'create' | 'edit' | 'video',
    params: row.params || {},
    timestamp: row.timestamp,
    favorite: row.favorite ?? false,
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
  // Borrar de storage (intentar ambas extensiones, ignorar errores de "not found")
  await supabase.storage.from('gallery').remove([`${userId}/${id}.png`]);
  await supabase.storage.from('gallery').remove([`${userId}/${id}.mp4`]);

  // Borrar de BD — sí lanzar si falla
  const { error } = await supabase.from('gallery_items').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`No se pudo eliminar el elemento: ${error.message}`);
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
  if (error) throw new Error(`No se pudo guardar el preset: ${error.message}`);
};

export const loadPresetsFromCloud = async (userId: string): Promise<CustomPreset[]> => {
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los presets: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    data: row.config || {},
  }));
};

export const deletePresetFromCloud = async (id: string, userId: string): Promise<void> => {
  const { error } = await supabase.from('presets').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`No se pudo eliminar el preset: ${error.message}`);
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Elimina objetos File/Blob (no serializables a JSON) de los params antes de guardar en BD.
 */
const serializeParams = (params: unknown): unknown => {
  if (!params) return {};
  return JSON.parse(JSON.stringify(params, (_, value) => {
    if (value instanceof File) return undefined;
    if (value instanceof Blob) return undefined;
    return value;
  }));
};
