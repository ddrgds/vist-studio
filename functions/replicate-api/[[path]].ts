// Cloudflare Pages Function — Replicate API proxy
// Equivalent to the Vite dev proxy: /replicate-api/** → https://api.replicate.com/**
// Injects Authorization header server-side so the token is never exposed to the client.

interface Env {
  REPLICATE_API_TOKEN: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  const pathParts = params.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const url = new URL(request.url);
  const targetUrl = `https://api.replicate.com/${pathStr}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Token ${env.REPLICATE_API_TOKEN}`);
  headers.delete('origin');
  headers.delete('host');

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
