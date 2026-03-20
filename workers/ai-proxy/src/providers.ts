// workers/ai-proxy/src/providers.ts
export interface ProviderConfig {
  baseUrl: string;
  injectAuth: (request: Request, env: Record<string, string>) => Request;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    injectAuth: (req, env) => {
      const url = new URL(req.url);
      url.searchParams.set('key', env.GEMINI_API_KEY);
      return new Request(url.toString(), req);
    },
  },
  fal: {
    baseUrl: '', // Dynamic — reads x-fal-target-url header
    injectAuth: (req, env) => {
      const targetUrl = req.headers.get('x-fal-target-url');
      const headers = new Headers(req.headers);
      headers.set('Authorization', `Key ${env.FAL_KEY}`);
      headers.delete('x-fal-target-url');
      return new Request(targetUrl || req.url, { ...req, headers });
    },
  },
  replicate: {
    baseUrl: 'https://api.replicate.com',
    injectAuth: (req, env) => {
      const headers = new Headers(req.headers);
      headers.set('Authorization', `Bearer ${env.REPLICATE_API_TOKEN}`);
      return new Request(req.url, { ...req, headers });
    },
  },
  openai: {
    baseUrl: 'https://api.openai.com',
    injectAuth: (req, env) => {
      const headers = new Headers(req.headers);
      headers.set('Authorization', `Bearer ${env.OPENAI_API_KEY}`);
      return new Request(req.url, { ...req, headers });
    },
  },
  ideogram: {
    baseUrl: 'https://api.ideogram.ai',
    injectAuth: (req, env) => {
      const headers = new Headers(req.headers);
      headers.set('Api-Key', env.IDEOGRAM_API_KEY);
      return new Request(req.url, { ...req, headers });
    },
  },
  elevenlabs: {
    baseUrl: 'https://api.elevenlabs.io',
    injectAuth: (req, env) => {
      const headers = new Headers(req.headers);
      headers.set('xi-api-key', env.ELEVENLABS_API_KEY);
      return new Request(req.url, { ...req, headers });
    },
  },
};
