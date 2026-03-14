// Cloudflare Pages Function — fal.ai API proxy
// /fal-api/** → https://queue.fal.run/**
// Injects Authorization header server-side so the key is never exposed to the client.

interface Env {
  FAL_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // The @fal-ai/client SDK sends the real target in "x-fal-target-url" header.
  // Fall back to path-based routing for direct calls.
  const falTarget = request.headers.get('x-fal-target-url');
  let targetUrl: string;
  if (falTarget) {
    targetUrl = falTarget;
  } else {
    const pathParts = params.path;
    const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
    const url = new URL(request.url);
    targetUrl = `https://queue.fal.run/${pathStr}${url.search}`;
  }

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Key ${env.FAL_KEY}`);
  headers.delete('origin');
  headers.delete('host');
  headers.delete('x-fal-target-url');

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-fal-target-url',
  };
}
