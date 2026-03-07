// Cloudflare Pages Function — Gemini API proxy
// /gemini-api/** → https://generativelanguage.googleapis.com/**
// Injects API key server-side so it is never exposed to the client.

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const pathParts = params.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const url = new URL(request.url);

  // Append API key as query param (Gemini uses ?key=)
  const target = new URL(`https://generativelanguage.googleapis.com/${pathStr}`);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  target.searchParams.set('key', env.GEMINI_API_KEY);

  const headers = new Headers(request.headers);
  headers.delete('origin');
  headers.delete('host');

  const response = await fetch(target.toString(), {
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
  };
}
