import { supabase } from './supabaseService';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!import.meta.env.PROD) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
