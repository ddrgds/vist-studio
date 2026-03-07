/// <reference types="vite/client" />
import { supabase } from './supabaseService';
import { SubscriptionPlan, SubscriptionStatus } from '../types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface UserProfile {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  // Subscription
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  creditsRemaining: number;
  subscriptionRenewsAt: string | null;
  lemonSqueezySubscriptionId: string | null;
  // Meta
  createdAt: string;
}

const AVATAR_BUCKET = 'avatars';

// ─────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────

export const loadProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // row not found — first login
    throw new Error(`loadProfile failed: ${error.message}`);
  }

  return rowToProfile(data);
};

// ─────────────────────────────────────────────
// SAVE (upsert scalar fields)
// ─────────────────────────────────────────────

export const saveProfile = async (
  userId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'bio'>>,
): Promise<void> => {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: updates.displayName,
    bio: updates.bio,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`saveProfile failed: ${error.message}`);
};

// ─────────────────────────────────────────────
// AVATAR UPLOAD
// ─────────────────────────────────────────────

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadErr) throw new Error(`Avatar upload failed: ${uploadErr.message}`);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`; // cache-bust

  const { error: updateErr } = await supabase.from('profiles').upsert({
    id: userId,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  });

  if (updateErr) throw new Error(`Avatar URL persist failed: ${updateErr.message}`);

  return avatarUrl;
};

// ─────────────────────────────────────────────
// CREDITS — atomic decrement via RPC
// ─────────────────────────────────────────────

/**
 * Atomically decrements credits_remaining by `amount`.
 * Returns the new credit balance, or throws if insufficient.
 * Uses a Postgres function to avoid race conditions.
 */
export const decrementCreditsInDb = async (
  userId: string,
  amount: number,
): Promise<number> => {
  const { data, error } = await supabase.rpc('decrement_credits', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) throw new Error(error.message);
  return data as number;
};

export const restoreCreditsInDb = async (
  userId: string,
  amount: number,
): Promise<void> => {
  const { error } = await supabase.rpc('restore_credits', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) {
    // Fallback: read current balance then add amount (RPC may not exist yet)
    const { data: row, error: readErr } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .single();
    if (readErr) { console.warn('restoreCredits fallback read failed:', readErr.message); return; }
    const current = (row?.credits_remaining as number) ?? 0;
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ credits_remaining: current + amount })
      .eq('id', userId);
    if (updateErr) console.warn('restoreCredits fallback update failed:', updateErr.message);
  }
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const rowToProfile = (row: Record<string, unknown>): UserProfile => ({
  id:          row.id as string,
  displayName: (row.display_name as string) ?? '',
  bio:         (row.bio as string) ?? '',
  avatarUrl:   row.avatar_url as string | null,
  subscriptionPlan:   ((row.subscription_plan as string) ?? 'starter') as SubscriptionPlan,
  subscriptionStatus: ((row.subscription_status as string) ?? 'free') as SubscriptionStatus,
  creditsRemaining:   (row.credits_remaining as number) ?? 100,
  subscriptionRenewsAt:       row.subscription_renews_at as string | null,
  lemonSqueezySubscriptionId: row.lemon_squeezy_subscription_id as string | null,
  createdAt: (row.created_at as string) ?? new Date().toISOString(),
});
