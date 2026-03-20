import { supabase } from './supabaseService';

export const AI_PROXY_BASE = import.meta.env.PROD
  ? 'https://vist-ai-proxy.delrio-g-diego.workers.dev'
  : '';

export function proxyUrl(provider: string, devFallback: string): string {
  return import.meta.env.PROD
    ? `${AI_PROXY_BASE}/api/ai/${provider}`
    : devFallback;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!import.meta.env.PROD) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
