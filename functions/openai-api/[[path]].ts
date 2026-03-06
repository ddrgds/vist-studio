// Cloudflare Pages Function — OpenAI API proxy
// Equivalent to the Vite dev proxy: /openai-api/** → https://api.openai.com/**
// Injects Authorization header server-side so the key is never exposed to the client.

interface Env {
  OPENAI_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const pathParts = params.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const url = new URL(request.url);
  const targetUrl = `https://api.openai.com/${pathStr}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${env.OPENAI_API_KEY}`);
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
