import { supabase } from './supabaseService';

export const AI_PROXY_BASE = '';

// Always use same-origin Pages Functions (e.g. /gemini-api, /fal-api, /replicate-api)
// These exist in functions/ and are deployed with Cloudflare Pages automatically.
const PROVIDER_TO_PATH: Record<string, string> = {
  gemini: '/gemini-api',
  fal: '/fal-api',
  replicate: '/replicate-api',
  openai: '/openai-api',
  ideogram: '/ideogram-api',
  modelslab: '/modelslab-api',
  higgsfield: '/higgsfield-api',
  elevenlabs: '/elevenlabs-api',
};

export function proxyUrl(provider: string, devFallback: string): string {
  return PROVIDER_TO_PATH[provider] || devFallback;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!import.meta.env.PROD) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
