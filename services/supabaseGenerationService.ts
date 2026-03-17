/// <reference types="vite/client" />
import { supabase } from './supabaseService';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface GenerationRecord {
  id: string;
  user_id: string;
  character_id: string | null;
  type: 'image' | 'video' | 'edit' | 'lipsync';
  result_url: string;
  thumbnail_url: string | null;
  prompt: string | null;
  engine: string | null;
  format: string | null;
  resolution: string | null;
  params_json: Record<string, any>;
  credits_used: number;
  favorite: boolean;
  tags: string[];
  exported_to: string[];
  created_at: string;
}

// ─────────────────────────────────────────────
// SAVE a generation
// ─────────────────────────────────────────────

export async function saveGeneration(gen: Omit<GenerationRecord, 'id' | 'created_at'>): Promise<string> {
  const { data, error } = await supabase
    .from('generations')
    .insert(gen)
    .select('id')
    .single();

  if (error) throw new Error(`saveGeneration failed: ${error.message}`);
  return data.id;
}

// ─────────────────────────────────────────────
// LOAD generations for current user
// ─────────────────────────────────────────────

export async function loadGenerations(opts?: {
  type?: GenerationRecord['type'];
  character_id?: string;
  limit?: number;
  offset?: number;
}): Promise<GenerationRecord[]> {
  let query = supabase
    .from('generations')
    .select('*')
    .order('created_at', { ascending: false });

  if (opts?.type) query = query.eq('type', opts.type);
  if (opts?.character_id) query = query.eq('character_id', opts.character_id);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw new Error(`loadGenerations failed: ${error.message}`);
  return data ?? [];
}

// ─────────────────────────────────────────────
// UPDATE (favorite, tags, exported_to)
// ─────────────────────────────────────────────

export async function updateGeneration(
  id: string,
  updates: Partial<Pick<GenerationRecord, 'favorite' | 'tags' | 'exported_to'>>,
): Promise<void> {
  const { error } = await supabase
    .from('generations')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(`updateGeneration failed: ${error.message}`);
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export async function deleteGeneration(id: string): Promise<void> {
  const { error } = await supabase
    .from('generations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`deleteGeneration failed: ${error.message}`);
}

// ─────────────────────────────────────────────
// DEDUCT CREDITS (calls the DB function)
// ─────────────────────────────────────────────

export async function deductCreditsAtomic(
  userId: string,
  amount: number,
  generationId?: string,
): Promise<number> {
  const { data, error } = await supabase
    .rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: 'generation',
      p_generation_id: generationId ?? null,
    });

  if (error) throw new Error(`deductCredits failed: ${error.message}`);
  return data as number; // returns new balance
}

// ─────────────────────────────────────────────
// CREDIT HISTORY
// ─────────────────────────────────────────────

export async function loadCreditHistory(limit = 50): Promise<{
  id: string;
  amount: number;
  reason: string;
  balance_after: number;
  created_at: string;
}[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('id, amount, reason, balance_after, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`loadCreditHistory failed: ${error.message}`);
  return data ?? [];
}
