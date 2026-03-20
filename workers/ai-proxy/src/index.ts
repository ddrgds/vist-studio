// workers/ai-proxy/src/index.ts
import { PROVIDERS } from './providers';

interface Env {
  RATE_LIMIT: KVNamespace;
  ALLOWED_ORIGIN: string;
  SUPABASE_JWT_SECRET: string;
  [key: string]: unknown;
}

const CORS_HEADERS = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-fal-target-url',
  'Access-Control-Max-Age': '86400',
});

async function verifySupabaseToken(token: string, secret: string): Promise<boolean> {
  // Decode JWT and verify — simplified check for MVP
  // In production, verify signature with SUPABASE_JWT_SECRET
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

async function checkRateLimit(userId: string, kv: KVNamespace): Promise<boolean> {
  const key = `rate:${userId}:${Math.floor(Date.now() / 60000)}`;
  const count = parseInt(await kv.get(key) || '0');
  if (count >= 100) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [env.ALLOWED_ORIGIN, 'http://localhost:5173', 'http://localhost:5174'];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : env.ALLOWED_ORIGIN;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS(corsOrigin) });
    }

    // Parse route: /api/ai/{provider}/{...path}
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/ai\/(\w+)(\/.*)?$/);
    if (!match) {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS(corsOrigin) });
    }

    const [, providerName, subPath = ''] = match;
    const provider = PROVIDERS[providerName];
    if (!provider) {
      return new Response(`Unknown provider: ${providerName}`, { status: 400, headers: CORS_HEADERS(corsOrigin) });
    }

    // Verify auth
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!await verifySupabaseToken(token, env.SUPABASE_JWT_SECRET)) {
      return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS(corsOrigin) });
    }

    // Rate limit
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!await checkRateLimit(payload.sub, env.RATE_LIMIT)) {
      return new Response('Rate limit exceeded', { status: 429, headers: CORS_HEADERS(corsOrigin) });
    }

    // Build upstream request
    let upstreamUrl: string;
    if (providerName === 'fal') {
      // FAL uses x-fal-target-url header for routing
      upstreamUrl = request.headers.get('x-fal-target-url') || `https://queue.fal.run${subPath}`;
    } else {
      upstreamUrl = `${provider.baseUrl}${subPath}${url.search}`;
    }

    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const authedRequest = provider.injectAuth(upstreamRequest, env as unknown as Record<string, string>);

    // Forward to provider
    const response = await fetch(authedRequest);

    // Return with CORS headers
    const responseHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS(corsOrigin)).forEach(([k, v]) => responseHeaders.set(k, v));

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
