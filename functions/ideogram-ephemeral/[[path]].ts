// Cloudflare Pages Function — Ideogram ephemeral image proxy
// Equivalent to the Vite dev proxy: /ideogram-ephemeral/** → https://ideogram.ai/**
// Proxies ephemeral image URLs that lack proper CORS headers.

interface Env {}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const pathParts = params.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const url = new URL(request.url);
  const targetUrl = `https://ideogram.ai/${pathStr}${url.search}`;

  const headers = new Headers(request.headers);
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
