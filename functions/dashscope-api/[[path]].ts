// Cloudflare Pages Function — DashScope (Alibaba) API proxy
// /dashscope-api/** → https://dashscope.aliyuncs.com/api/v1/**

interface Env {
  DASHSCOPE_API_KEY: string;
}

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-DashScope-Async, X-DashScope-OssResourceResolve',
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  // Debug: check if env var exists
  const apiKey = env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    const allKeys = Object.keys(env).join(', ');
    return new Response(
      JSON.stringify({ error: 'DASHSCOPE_API_KEY missing', available_keys: allKeys }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...cors() } },
    );
  }

  // Build target URL
  const pathParts = params.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const targetUrl = `https://dashscope-intl.aliyuncs.com/api/v1/${pathStr}`;

  // Forward request with auth
  const fwdHeaders = new Headers();
  fwdHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  fwdHeaders.set('Authorization', `Bearer ${apiKey}`);
  if (request.method === 'POST') {
    fwdHeaders.set('X-DashScope-Async', 'enable');
    fwdHeaders.set('X-DashScope-OssResourceResolve', 'enable');
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: fwdHeaders,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  });

  const respHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors())) respHeaders.set(k, v);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
};
