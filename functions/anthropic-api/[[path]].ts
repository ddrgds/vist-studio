// Cloudflare Pages Function — Anthropic API proxy
// /anthropic-api/** → https://api.anthropic.com/**
// Injects API key server-side so it is never exposed to the client.
// Used by services/fluxPromptAdapter.ts for Haiku-based prompt rewriting.

interface Env {
  ANTHROPIC_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const pathParts = params.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const url = new URL(request.url);

  const target = new URL(`https://api.anthropic.com/${pathStr}`);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  const headers = new Headers(request.headers);
  headers.delete('origin');
  headers.delete('host');
  headers.set('x-api-key', env.ANTHROPIC_API_KEY);
  headers.set('anthropic-version', '2023-06-01');

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version',
  };
}
