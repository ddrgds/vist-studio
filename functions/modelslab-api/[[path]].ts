// Cloudflare Pages Function — ModelsLab API proxy
// /modelslab-api/** → https://modelslab.com/api/**
// Injects API key into JSON body server-side so it is never exposed to the client.

interface Env {
  MODELSLAB_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const pathParts = params.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const url = new URL(request.url);
  const targetUrl = `https://modelslab.com/api/${pathStr}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('origin');
  headers.delete('host');

  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    // Inject API key into JSON body
    try {
      const json = await request.json();
      (json as Record<string, unknown>).key = env.MODELSLAB_API_KEY;
      body = JSON.stringify(json);
      headers.set('Content-Type', 'application/json');
    } catch {
      body = request.body ?? undefined;
    }
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
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
