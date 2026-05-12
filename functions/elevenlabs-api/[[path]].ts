// Cloudflare Pages Function — ElevenLabs API proxy.
// /elevenlabs-api/** → https://api.elevenlabs.io/**
// Injects the xi-api-key header server-side so the key never leaves Cloudflare.

interface Env {
  ELEVENLABS_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const pathParts = params.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const url = new URL(request.url);
  const targetUrl = `https://api.elevenlabs.io/${pathStr}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('xi-api-key', env.ELEVENLABS_API_KEY);
  headers.delete('origin');
  headers.delete('host');
  // Don't forward the browser's Authorization header (we use xi-api-key)
  headers.delete('authorization');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  });

  const responseHeaders = new Headers(response.headers);
  Object.entries(corsHeaders()).forEach(([k, v]) => responseHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, xi-api-key',
  };
}
