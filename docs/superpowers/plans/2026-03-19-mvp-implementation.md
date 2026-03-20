# MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining 15% of VIST Studio MVP — Cloudflare Workers proxy, 9 new AI models, pricing overhaul, LoRA UI, smart export, outpaint tool, and "bring your own" flow.

**Architecture:** 7 sequential phases. Phase 1 secures API keys via Cloudflare Worker proxy. Phase 2 integrates 9 new AI models into existing service files. Phase 3 overwrites the entire pricing model. Phases 4-7 are independent features that build on phases 1-3.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Supabase, Cloudflare Workers (Wrangler), fal.ai SDK, Replicate API.

**Spec:** `docs/superpowers/specs/2026-03-19-mvp-roadmap-design.md`

**Verification:** `tsc --noEmit` after each task (no test suite exists). Manual verification per the spec's checklist.

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `workers/ai-proxy/wrangler.toml` | Worker config — routes, secrets, KV binding |
| `workers/ai-proxy/src/index.ts` | Worker entry — CORS, auth, rate limit, provider routing |
| `workers/ai-proxy/src/providers.ts` | Provider-specific header injection and URL mapping |
| `utils/smartExport.ts` | Canvas center-crop + resize per social format |

### Modified files
| File | What changes |
|------|-------------|
| `services/falService.ts` | Add `generateWithKontextPro()`, `generateWithKleinEditLoRA()` |
| `services/replicateService.ts` | Add `upscaleWithRecraft()`, `expandWithBria()`, `generateWithFlux2Pro()`, `generateWithFlux2Klein()`, `editWithPruna()` |
| `services/toolEngines.ts` | Add `'nb-pro'` and `'pruna'` to EngineId, update TOOL_ENGINE_DEFAULTS, add engine functions |
| `types.ts` | New model enums, rewrite CREDIT_COSTS, remove OPERATION_CREDIT_COSTS |
| `services/photoSessionPipeline.ts` | Update SESSION_TIER_COSTS, tier routing to new engines |
| `components/PricingPage.tsx` | New plan prices, credits, packs |
| `pages/AIEditor.tsx` | Add "Expand" tool |
| `pages/CharacterGallery.tsx` | LoRA training button + status badge |
| `stores/characterStore.ts` | `trainLoRA()` action |
| `pages/ContentStudio.tsx` | Allow no-character access when photo uploaded |
| `pages/Director.tsx` | Skip character picker when upload present |
| `pages/UploadCharacter.tsx` | Soul 2.0 as prominent engine option |
| `features/export/ExportModal.tsx` | Use smartExport for format-aware download |
| `vite.config.ts` | Add Worker dev proxy (optional for local dev) |

---

## Phase 1: Cloudflare Workers Proxy

### Task 1: Scaffold Worker project

**Files:**
- Create: `workers/ai-proxy/wrangler.toml`
- Create: `workers/ai-proxy/src/index.ts`
- Create: `workers/ai-proxy/src/providers.ts`
- Create: `workers/ai-proxy/package.json`
- Create: `workers/ai-proxy/tsconfig.json`

- [ ] **Step 1: Create worker directory and package.json**

```bash
mkdir -p workers/ai-proxy/src
cd workers/ai-proxy
npm init -y
npm install wrangler --save-dev
```

- [ ] **Step 2: Create wrangler.toml**

```toml
name = "vist-ai-proxy"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[vars]
ALLOWED_ORIGIN = "https://vist-studio.pages.dev"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "create-via-wrangler"

# Secrets (set via `wrangler secret put`):
# GEMINI_API_KEY, FAL_KEY, REPLICATE_API_TOKEN,
# OPENAI_API_KEY, IDEOGRAM_API_KEY, ELEVENLABS_API_KEY,
# SUPABASE_JWT_SECRET
```

- [ ] **Step 3: Create providers.ts — provider URL mapping and header injection**

```typescript
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
```

- [ ] **Step 4: Create index.ts — main Worker with CORS, auth, rate limiting, routing**

```typescript
// workers/ai-proxy/src/index.ts
import { PROVIDERS } from './providers';

interface Env {
  RATE_LIMIT: KVNamespace;
  ALLOWED_ORIGIN: string;
  SUPABASE_JWT_SECRET: string;
  [key: string]: unknown;
}

const CORS_HEADERS = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-fal-target-url',
  'Access-Control-Max-Age': '86400',
});

async function verifySupabaseToken(token: string, secret: string): Promise<boolean> {
  // Decode JWT and verify — simplified check for MVP
  // In production, verify signature with SUPABASE_JWT_SECRET
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

async function checkRateLimit(userId: string, kv: KVNamespace): Promise<boolean> {
  const key = `rate:${userId}:${Math.floor(Date.now() / 60000)}`;
  const count = parseInt(await kv.get(key) || '0');
  if (count >= 100) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [env.ALLOWED_ORIGIN, 'http://localhost:5173', 'http://localhost:5174'];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : env.ALLOWED_ORIGIN;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS(corsOrigin) });
    }

    // Parse route: /api/ai/{provider}/{...path}
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/ai\/(\w+)(\/.*)?$/);
    if (!match) {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS(corsOrigin) });
    }

    const [, providerName, subPath = ''] = match;
    const provider = PROVIDERS[providerName];
    if (!provider) {
      return new Response(`Unknown provider: ${providerName}`, { status: 400, headers: CORS_HEADERS(corsOrigin) });
    }

    // Verify auth
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!await verifySupabaseToken(token, env.SUPABASE_JWT_SECRET)) {
      return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS(corsOrigin) });
    }

    // Rate limit
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!await checkRateLimit(payload.sub, env.RATE_LIMIT)) {
      return new Response('Rate limit exceeded', { status: 429, headers: CORS_HEADERS(corsOrigin) });
    }

    // Build upstream request
    let upstreamUrl: string;
    if (providerName === 'fal') {
      // FAL uses x-fal-target-url header for routing
      upstreamUrl = request.headers.get('x-fal-target-url') || `https://queue.fal.run${subPath}`;
    } else {
      upstreamUrl = `${provider.baseUrl}${subPath}${url.search}`;
    }

    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const authedRequest = provider.injectAuth(upstreamRequest, env as unknown as Record<string, string>);

    // Forward to provider
    const response = await fetch(authedRequest);

    // Return with CORS headers
    const responseHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS(corsOrigin)).forEach(([k, v]) => responseHeaders.set(k, v));

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
```

- [ ] **Step 5: Create tsconfig.json for Worker**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*.ts"]
}
```

```bash
cd workers/ai-proxy && npm install --save-dev @cloudflare/workers-types
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd workers/ai-proxy && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add workers/ai-proxy/
git commit -m "feat: scaffold Cloudflare Worker AI proxy with CORS, auth, rate limiting"
```

---

### Task 2: Update frontend services to use Worker proxy

**Files:**
- Modify: `services/geminiService.ts` (URL base)
- Modify: `services/falService.ts` (URL base)
- Modify: `services/replicateService.ts` (URL base)
- Modify: `services/openaiService.ts` (URL base)
- Modify: `services/ideogramService.ts` (URL base)
- Modify: `services/elevenLabsService.ts` (URL base)

- [ ] **Step 1: Create a shared API base URL utility**

Add to top of each service or create a shared constant. The pattern is:

```typescript
// In production: requests go to /api/ai/{provider}/...
// In dev: Vite proxy still works at /{provider}-api/... OR use Worker locally
const API_BASE = import.meta.env.PROD ? '/api/ai' : '';
```

For each service, the URL change is:
- `geminiService.ts`: `/gemini-api/` → `${API_BASE}/gemini/` (or `/gemini-api/` in dev)
- `falService.ts`: `/fal-api/` → `${API_BASE}/fal/` (keep `x-fal-target-url` header)
- `replicateService.ts`: `/replicate-api/` → `${API_BASE}/replicate/`
- `openaiService.ts`: `/openai-api/` → `${API_BASE}/openai/`
- `ideogramService.ts`: `/ideogram-api/` → `${API_BASE}/ideogram/`
- `elevenLabsService.ts`: `/elevenlabs-api/` → `${API_BASE}/elevenlabs/`

- [ ] **Step 2: Add Supabase auth token to requests in production**

In production, each `fetch()` call needs the Supabase JWT:

```typescript
import { supabase } from './supabaseService';

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!import.meta.env.PROD) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

Add this to each service's fetch calls. In dev mode, Vite proxy handles auth — no token needed.

- [ ] **Step 3: Verify build compiles**

```bash
cd vist && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add services/ && git commit -m "feat: route API calls through Cloudflare Worker in production"
```

---

## Phase 2: New Model Integrations

### Task 3: Add new FAL models (Kontext Pro + Klein Edit+LoRA)

**Files:**
- Modify: `services/falService.ts`
- Modify: `types.ts` (add FalModel enums)

- [ ] **Step 1: Add model enums to types.ts**

In the `FalModel` enum (search for `export enum FalModel`), add:

```typescript
KontextPro = 'fal-ai/flux-kontext-pro',
KleinEditLoRA = 'fal-ai/flux-2/klein/9b/edit/lora',
```

- [ ] **Step 2: Add `generateWithKontextPro()` to falService.ts**

Add after `generateWithKontextMulti()` (~line 250). Pattern matches existing Kontext Multi but uses new endpoint:

```typescript
export async function generateWithKontextPro(
  params: InfluencerParams,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const character = params.characters[0];
  if (!character?.modelImages?.length) throw new Error('Kontext Pro requires reference images');

  const refUrls = await Promise.all(
    character.modelImages.slice(0, 4).map(f => uploadToFalStorage(f))
  );

  // Build prompt from params — same pattern as generateWithKontextMulti
  const prompt = [
    params.characters[0]?.modelPrompt || '',
    params.scenario || '',
    params.pose || '',
    params.lighting || '',
    params.additionalPrompt || '',
  ].filter(Boolean).join('. ');

  onProgress?.(10);
  const result = await fal.subscribe('fal-ai/flux-kontext-pro', {
    input: {
      prompt,
      image_urls: refUrls,
      num_images: params.numberOfImages || 1,
      guidance_scale: params.guidanceScale || 3.5,
      seed: params.seed,
    },
    pollInterval: 2000,
    onQueueUpdate: (u) => {
      if (u.status === 'IN_PROGRESS') onProgress?.(50);
    },
    ...(abortSignal ? { signal: abortSignal } : {}),
  });

  onProgress?.(100);
  return (result.data as any).images.map((img: any) => img.url);
}
```

- [ ] **Step 3: Add `generateWithKleinEditLoRA()` to falService.ts**

Add after `generateWithLoRA()` (~line 1720):

```typescript
export async function generateWithKleinEditLoRA(
  baseImageUrl: string,
  loraUrl: string,
  triggerWord: string,
  prompt: string,
  options?: { seed?: number; imageSize?: string },
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  onProgress?.(10);

  const result = await fal.subscribe('fal-ai/flux-2/klein/9b/edit/lora', {
    input: {
      prompt: `${triggerWord} ${prompt}`,
      image_urls: [baseImageUrl],
      loras: [{ path: loraUrl, scale: 0.9 }],
      seed: options?.seed,
      image_size: options?.imageSize || 'landscape_4_3',
    },
    pollInterval: 2000,
    onQueueUpdate: (u) => {
      if (u.status === 'IN_PROGRESS') onProgress?.(50);
    },
    ...(abortSignal ? { signal: abortSignal } : {}),
  });

  onProgress?.(100);
  return (result.data as any).images.map((img: any) => img.url);
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add services/falService.ts types.ts
git commit -m "feat: add FLUX Kontext Pro and Klein 9B Edit+LoRA to falService"
```

---

### Task 4: Add new Replicate models (Recraft, Bria, FLUX 2 Pro/Klein, Pruna)

**Files:**
- Modify: `services/replicateService.ts`
- Modify: `types.ts` (add ReplicateModel enums)

- [ ] **Step 1: Add model enums to types.ts**

In the `ReplicateModel` enum, add:

```typescript
RecraftCrispUpscale = 'recraft-ai/recraft-crisp-upscale',
BriaExpand = 'bria/expand-image',
Flux2Pro = 'black-forest-labs/flux-2-pro',
Flux2Klein4B = 'black-forest-labs/flux-2-klein-4b',
PrunaImageEdit = 'prunaai/p-image-edit',
```

- [ ] **Step 2: Add `upscaleWithRecraft()` to replicateService.ts**

Add after the last export function:

```typescript
// ⚠️ USE replicate.run() — same SDK pattern as existing functions (generateWithFlux2Max, etc.)
// The SDK handles URL rewriting and auth header stripping via the custom fetch in the config above.
export async function upscaleWithRecraft(
  imageUrl: string,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  onProgress?.(10);
  const output = await replicate.run('recraft-ai/recraft-crisp-upscale', {
    input: { image: imageUrl },
  });
  onProgress?.(100);
  // Replicate returns string or string[] depending on model
  return typeof output === 'string' ? output : (output as string[])[0];
}
```

- [ ] **Step 3: Add `expandWithBria()` to replicateService.ts**

```typescript
export async function expandWithBria(
  imageUrl: string,
  direction: 'up' | 'down' | 'left' | 'right' | 'all',
  pixels: number = 256,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  const padding = {
    up: { top: pixels, bottom: 0, left: 0, right: 0 },
    down: { top: 0, bottom: pixels, left: 0, right: 0 },
    left: { top: 0, bottom: 0, left: pixels, right: 0 },
    right: { top: 0, bottom: 0, left: 0, right: pixels },
    all: { top: pixels, bottom: pixels, left: pixels, right: pixels },
  }[direction];

  onProgress?.(10);
  const output = await replicate.run('bria/expand-image', {
    input: { image: imageUrl, ...padding },
  });
  onProgress?.(100);
  return typeof output === 'string' ? output : (output as string[])[0];
}
```

- [ ] **Step 4: Add `generateWithFlux2Pro()`, `generateWithFlux2Klein()`, `editWithPruna()`**

Follow the same pattern as `generateWithFlux2Max()` (lines 96-195) but with the new model IDs. Each takes `InfluencerParams` and returns `Promise<string[]>`.

For `editWithPruna()`:

```typescript
export async function editWithPruna(
  imageUrl: string,
  prompt: string,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  onProgress?.(10);
  const output = await replicate.run('prunaai/p-image-edit', {
    input: { image: imageUrl, prompt },
  });
  onProgress?.(100);
  return typeof output === 'string' ? output : (output as string[])[0];
}
```

For `generateWithFlux2Pro()` and `generateWithFlux2Klein()`, follow the exact pattern of `generateWithFlux2Max()` (lines 96-195). Specifically:

```typescript
export async function generateWithFlux2Pro(
  params: InfluencerParams,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const prompt = params.additionalPrompt || 'a beautiful photo';
  onProgress?.(10);
  const output = await replicate.run('black-forest-labs/flux-2-pro', {
    input: {
      prompt,
      aspect_ratio: params.aspectRatio === AspectRatio.Portrait ? '3:4' :
                     params.aspectRatio === AspectRatio.Landscape ? '4:3' :
                     params.aspectRatio === AspectRatio.Wide ? '16:9' : '1:1',
      num_outputs: params.numberOfImages || 1,
      guidance: params.guidanceScale || 3.5,
      ...(params.seed ? { seed: params.seed } : {}),
    },
  });
  onProgress?.(100);
  const urls = Array.isArray(output) ? output : [output];
  return urls.map(u => typeof u === 'string' ? u : (u as any).url || String(u));
}

export async function generateWithFlux2Klein(
  params: InfluencerParams,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const prompt = params.additionalPrompt || 'a beautiful photo';
  onProgress?.(10);
  const output = await replicate.run('black-forest-labs/flux-2-klein-4b', {
    input: {
      prompt,
      aspect_ratio: params.aspectRatio === AspectRatio.Portrait ? '3:4' :
                     params.aspectRatio === AspectRatio.Landscape ? '4:3' :
                     params.aspectRatio === AspectRatio.Wide ? '16:9' : '1:1',
      num_outputs: params.numberOfImages || 1,
      ...(params.seed ? { seed: params.seed } : {}),
    },
  });
  onProgress?.(100);
  const urls = Array.isArray(output) ? output : [output];
  return urls.map(u => typeof u === 'string' ? u : (u as any).url || String(u));
}
```

> **Note:** All new Replicate functions use `replicate.run()` (matching the SDK pattern of existing functions like `generateWithFlux2Max`, `generateWithGen4Image`, etc.). Do NOT use raw `fetch()` — the SDK handles URL rewriting and auth for both dev proxy and production.

- [ ] **Step 6: Verify + Commit**

```bash
npx tsc --noEmit
git add services/replicateService.ts types.ts
git commit -m "feat: add Recraft, Bria, FLUX 2 Pro/Klein, Pruna to replicateService"
```

---

### Task 5: Update toolEngines.ts with new edit engines

**Files:**
- Modify: `services/toolEngines.ts` (line 27 EngineId, line 36 defaults)

- [ ] **Step 1: Extend EngineId type**

At line 27, change:
```typescript
export type EngineId = 'grok' | 'kontext' | 'seedream' | 'qwen' | 'aura-sr' | 'nb2' | 'nb-pro' | 'pruna' | 'recraft';
```

- [ ] **Step 2: Add engine implementation functions for nb-pro and pruna**

After the existing `grokEdit()` wrapper (~line 144), add:

```typescript
import { GeminiImageModel, type AIEditParams } from '../types';

export async function nbProEdit(imageUrl: string, prompt: string): Promise<string> {
  // editImageWithAI takes AIEditParams object and returns string[]
  const { editImageWithAI } = await import('./geminiService');

  // Fetch the image URL and convert to File (same pattern as nb2Edit)
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const file = new File([blob], 'input.png', { type: blob.type });

  const params: AIEditParams = {
    baseImage: file,
    instruction: prompt,
    model: GeminiImageModel.Pro,  // Use NB Pro instead of default NB2
    // AIEditParams.model already exists in types.ts line 151.
    // Verify editImageWithAI reads params.model — if it hardcodes
    // the model, update it to: params.model || GeminiImageModel.Flash2
  };

  const results = await editImageWithAI(params);
  if (!results.length) throw new Error('NB Pro edit returned no results');
  return results[0];
}

export async function prunaEdit(imageUrl: string, prompt: string): Promise<string> {
  const { editWithPruna } = await import('./replicateService');
  return editWithPruna(imageUrl, prompt);
}
```

> **⚠️ IMPORTANT:** `editImageWithAI` in `geminiService.ts` currently hardcodes its model. You MUST add an optional `model` field to `AIEditParams` in `types.ts` and update `editImageWithAI` to use `params.model || GeminiImageModel.Flash2` (the current default) so NB Pro can be selected.

- [ ] **Step 3: Update tool functions to support new engines**

In each tool function (relight, changeScene, etc.), add cases for `'nb-pro'` and `'pruna'` in the engine switch. Pattern:

```typescript
case 'nb-pro': url = await nbProEdit(imageUrl, prompt); break;
case 'pruna': url = await prunaEdit(imageUrl, prompt); break;
```

- [ ] **Step 4: Update upscale function for Recraft**

In `upscale()` (~line 324), add Recraft as default:

```typescript
export async function upscale(imageUrl: string, engine: 'recraft' | 'aura-sr' = 'recraft'): Promise<ToolResult> {
  if (engine === 'aura-sr') {
    // Existing AuraSR logic
  } else {
    const { upscaleWithRecraft } = await import('./replicateService');
    const url = await upscaleWithRecraft(imageUrl);
    return { url, engine: 'recraft' };
  }
}
```

- [ ] **Step 5: Add edit engine fallback chain**

Per spec: "Fallback triggers: HTTP 5xx, content policy rejection, or timeout >30s. Failed attempts do NOT charge credits. Fallback chain: Grok → NB Pro → Pruna."

Add a `runWithFallback` wrapper in `toolEngines.ts`:

```typescript
const EDIT_FALLBACK_CHAIN: EngineId[] = ['grok', 'nb-pro', 'pruna'];

// 30-second timeout wrapper — works with any async function
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);
}

export async function runEditWithFallback(
  imageUrl: string,
  prompt: string,
  preferredEngine: EngineId,
  toolId: ToolId,
): Promise<ToolResult> {
  // Build ordered chain starting from preferred engine
  const chain = [preferredEngine, ...EDIT_FALLBACK_CHAIN.filter(e => e !== preferredEngine)];
  const getPrompt = (engine: EngineId) => PROMPTS[toolId]?.[engine]?.(prompt) || PROMPTS[toolId]?.grok?.(prompt) || prompt;

  for (const engine of chain) {
    try {
      let engineCall: Promise<string>;
      switch (engine) {
        case 'grok': engineCall = grokEdit(imageUrl, getPrompt(engine)); break;
        case 'nb-pro': engineCall = nbProEdit(imageUrl, getPrompt(engine)); break;
        case 'pruna': engineCall = prunaEdit(imageUrl, prompt); break;
        default: throw new Error(`Unknown edit engine: ${engine}`);
      }

      // Race the engine call against 30s timeout
      const url = await withTimeout(engineCall, 30000);
      return { url, engine };
    } catch (err: any) {
      const isRetryable = err?.status >= 500 || err?.message?.includes('content policy') || err?.message === 'Timeout';
      if (!isRetryable) throw err; // Non-retryable error, bubble up
      console.warn(`Engine ${engine} failed for ${toolId}, trying next...`, err.message);
    }
  }

  throw new Error(`All edit engines failed for ${toolId}`);
}
```

> **Note on PROMPTS map:** `'nb-pro'` and `'pruna'` won't have explicit entries in the `PROMPTS` map. The fallback `getPrompt()` helper above will use the `grok` prompt template for them, which is acceptable for MVP since all three engines accept natural language instructions. Pruna-specific prompt templates can be added later if needed.

> **Note on `runEngine()`:** The existing `runEngine()` function (line ~217) should be updated to delegate to `runEditWithFallback()` for edit-type tools, or each tool function should call `runEditWithFallback` directly. Either approach works — pick whichever is simpler for the given tool.

Update each tool function (relight, changeScene, etc.) to use `runEditWithFallback()` instead of calling engines directly.

- [ ] **Step 6: Verify + Commit**

```bash
npx tsc --noEmit
git add services/toolEngines.ts
git commit -m "feat: add NB Pro, Pruna, Recraft as edit engine options with fallback chain"
```

---

### Task 6: Update PhotoSession pipeline tiers

**Files:**
- Modify: `services/photoSessionPipeline.ts`

- [ ] **Step 1: Update tier routing**

In `runStandardTier()` (~line 158-222): for **text-only poses** (the `else` branch at line 198), replace the `generatePhotoSessionWithGrok()` call with `generateWithKontextPro()`. The image-pose branch (Leffa at line 183) stays the same.

```typescript
// Line ~198-207: Replace the Grok text-only branch with Kontext Pro
} else {
  // Text-only pose → use Kontext Pro for better consistency
  poseProgress('Generando variación...', 20);
  const { generateWithKontextPro } = await import('./falService');
  const results = await generateWithKontextPro({
    characters: [{ modelImages: [baseImage, ...(characterRefs || [])] }],
    scenario: scenario || undefined,
    pose: pose.text || 'natural varied pose',
    lighting: lighting || undefined,
    numberOfImages: 1,
    guidanceScale: 3.5,
  } as any, (p) => poseProgress('Generando...', 20 + p * 0.6), abortSignal);
  if (results.length > 0) images.push(results[0]);
}
```

In `runPremiumTier()`: replace `generateWithLoRA()` call with `generateWithKleinEditLoRA()` when base image is available.

- [ ] **Step 2: Update SESSION_TIER_COSTS**

```typescript
export const SESSION_TIER_COSTS = {
  basic: 6,      // Imagen 4 Fast default
  standard: 14,  // Kontext Pro
  premium: 9,    // Klein Edit+LoRA
} as const;
// ⚠️ LoRA training cost: use CREDIT_COSTS['lora-training'] (571) as single source of truth.
// Do NOT duplicate the cost here. Remove the old `loraTraining: 500` entry.
```

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add services/photoSessionPipeline.ts
git commit -m "feat: update session pipeline tiers to use Kontext Pro and Klein Edit+LoRA"
```

---

### Task 7: Add Soul 2.0 as character creation engine

**Files:**
- Modify: `pages/UploadCharacter.tsx` (~line 129, engine selection)

- [ ] **Step 1: Add Soul 2.0 to engine options in UploadCharacter**

Find the engine selection UI. Add Soul 2.0 as a prominent option alongside NB2:

```typescript
const CHARACTER_ENGINES = [
  { id: 'higgsfield:soul', label: 'Soul 2.0', desc: 'Fashion-grade realism', badge: 'Recommended' },
  { id: 'gemini:nb2', label: 'Nano Banana 2', desc: 'Fast & reliable' },
  { id: 'gemini:imagen4', label: 'Imagen 4', desc: 'Photorealistic, economical' },
  { id: 'gemini:pro', label: 'NB Pro', desc: 'Maximum quality' },
];
```

- [ ] **Step 2: Route generation to Soul 2.0 when selected**

In the generation handler, if engine is `higgsfield:soul`, call `generateWithSoul()` from `higgsfieldService.ts` instead of the default NB2 path.

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add pages/UploadCharacter.tsx
git commit -m "feat: add Soul 2.0 as character creation engine option"
```

---

## Phase 3: Pricing Update

### Task 8: Overwrite pricing model

**Files:**
- Modify: `types.ts` (CREDIT_COSTS, remove OPERATION_CREDIT_COSTS)
- Modify: `components/PricingPage.tsx` (plans, packs)

- [ ] **Step 1: Rewrite CREDIT_COSTS in types.ts**

Replace the entire `CREDIT_COSTS` record and `OPERATION_CREDIT_COSTS` with a single unified map. All values from the spec's credit table:

```typescript
export const CREDIT_COSTS: Record<string, number> = {
  // Generation — text-to-image (1K base, see RESOLUTION_MULTIPLIER for 2K/4K)
  [GeminiImageModel.Imagen4Fast]: 6,
  [GeminiImageModel.Imagen4]: 12,
  [GeminiImageModel.Imagen4Ultra]: 17,
  [GeminiImageModel.Flash2]: 19,        // NB2 at 1K
  [GeminiImageModel.Pro]: 38,           // NB Pro at 2K
  [GeminiImageModel.Flash]: 11,         // Gemini 2.5 Flash (legacy)
  [FalModel.KontextPro]: 14,
  [FalModel.KleinEditLoRA]: 9,
  [FalModel.KontextMulti]: 14,          // Legacy, kept
  [FalModel.Flux2Pro]: 12,           // FAL variant (edit endpoint: fal-ai/flux-2-pro/edit)
  [ReplicateModel.Flux2Pro]: 12,     // Replicate variant (generation: black-forest-labs/flux-2-pro)
  [ReplicateModel.Flux2Klein4B]: 4,
  [ReplicateModel.PrunaImageEdit]: 9,
  [ReplicateModel.RecraftCrispUpscale]: 9,
  [ReplicateModel.BriaExpand]: 14,
  [HiggsfieldModel.SoulStandard]: 14,
  // Editing — Grok tools (flat cost, resolution-independent)
  'grok-edit': 6,
  'pruna-edit': 9,
  'relight': 6,
  'scene': 6,
  'outfit': 6,
  'face-swap': 6,
  'realistic-skin': 6,
  'style-transfer': 6,
  'inpaint': 6,
  'bg-removal': 6,
  'try-on': 14,
  'angles-standard': 19,
  'angles-ultra': 26,
  'upscale-recraft': 9,
  'upscale-aura': 3,
  'expand': 14,
  // Video
  [VideoEngine.Kling26Standard]: 86,
  [VideoEngine.Kling26Pro]: 143,
  [VideoEngine.Kling3Pro]: 286,
  [VideoEngine.Kling26MotionStandard]: 86,
  [VideoEngine.Kling26MotionPro]: 143,
  [VideoEngine.Kling3MotionPro]: 286,
  [VideoEngine.WanReplace]: 57,
  [VideoEngine.KlingAvatarStandard]: 71,
  [VideoEngine.KlingAvatarPro]: 143,
  // Special
  'lora-training': 571,
};

// Resolution multipliers for Gemini models
export const RESOLUTION_CREDIT_MULTIPLIER: Record<string, Record<string, number>> = {
  [GeminiImageModel.Flash2]: { '1K': 1, '2K': 1.53, '4K': 2.26 },  // 19 → 29 → 43
  [GeminiImageModel.Pro]: { '2K': 1, '4K': 1.82 },                   // 38 → 69
};
```

- [ ] **Step 2: Remove OPERATION_CREDIT_COSTS**

Delete the entire `OPERATION_CREDIT_COSTS` constant. Search codebase for all references and update to use `CREDIT_COSTS` with the new operation keys.

**Migration table (old key → new key):**

| Old reference | New reference | Old value | New value |
|---|---|---|---|
| `OPERATION_CREDIT_COSTS.faceSwap` | `CREDIT_COSTS['face-swap']` | 15 | 6 |
| `OPERATION_CREDIT_COSTS.relight` | `CREDIT_COSTS['relight']` | 10 | 6 |
| `OPERATION_CREDIT_COSTS.virtualTryOn` | `CREDIT_COSTS['try-on']` | 15 | 14 |
| `OPERATION_CREDIT_COSTS.skinEnhancer` | `CREDIT_COSTS['realistic-skin']` | 8 | 6 |
| `OPERATION_CREDIT_COSTS.inpaint` | `CREDIT_COSTS['inpaint']` | 8 | 6 |
| `OPERATION_CREDIT_COSTS.upscale` | `CREDIT_COSTS['upscale-recraft']` or `CREDIT_COSTS['upscale-aura']` | 8 | 9 or 3 |
| `OPERATION_CREDIT_COSTS.lipsync` | `CREDIT_COSTS[VideoEngine.KlingAvatarStandard]` | 50 | 71 |
| `OPERATION_CREDIT_COSTS.photoSession` | Varies by tier: `SESSION_TIER_COSTS.basic/standard/premium` | 10 | 6/14/9 |

**Files to update (confirmed by grep):**
- `components/FaceSwapModal.tsx` — line 5 import, line 53 usage
- `components/InpaintingModal.tsx` — line 5 import, line 143 usage
- `components/SkinEnhancerModal.tsx` — line 3 import, line 46 usage
- `components/RelightModal.tsx` — line 9 import, line 786 usage
- `components/TryOnModal.tsx` — line 5 import, line 64 usage
- `pages/Director.tsx` — line 12 import, lines 286 and 351 usage
- `pages/PhotoSession.tsx` — line 11 import, line 300 usage

- [ ] **Step 3: Update PricingPage.tsx**

First, add `credits800` to the `V` object (~line 43):

```typescript
const V = {
  // ... existing entries ...
  credits800:     import.meta.env.VITE_LS_CREDITS_800_VARIANT_ID     ?? '',  // NEW — needs Lemon Squeezy variant
};
```

> **⚠️ Manual step:** Create a new product/variant in Lemon Squeezy for the 800-credit pack ($10) and add `VITE_LS_CREDITS_800_VARIANT_ID` to `.env.local`.

Replace the `PLANS` array (~line 52) with new values. **Include ALL required fields** from the `Plan` interface (`description`, `cta`, `ctaStyle`, `credits`, `limits`):

```typescript
const PLANS: Plan[] = [
  {
    id: 'starter', name: 'Starter', monthlyPrice: 0, annualPrice: 0,
    description: 'Explore the studio, no commitment.',
    cta: 'Get Started', ctaStyle: 'ghost',
    credits: '150 credits / mo',
    features: [
      { label: '150 monthly credits' },
      { label: '3 characters' },
      { label: 'Up to 1K resolution' },
      { label: 'Basic engines (Imagen 4 Fast, NB2)' },
    ],
    limits: [
      { label: 'Credits / mo', value: '150' },
      { label: 'Characters', value: '3' },
      { label: 'Max resolution', value: '1K' },
    ],
    monthlyVariantId: '', annualVariantId: '',
  },
  {
    id: 'pro', name: 'Pro', monthlyPrice: 9.99, annualPrice: 7.99,
    description: 'For serious creators who want full engine access.',
    badge: 'Popular',
    cta: 'Go Pro', ctaStyle: 'coral',
    credits: '1,000 credits / mo',
    features: [
      { label: '1,000 monthly credits' },
      { label: '10 characters' },
      { label: 'Up to 2K resolution' },
      { label: 'All engines + video' },
    ],
    limits: [
      { label: 'Credits / mo', value: '1,000' },
      { label: 'Characters', value: '10' },
      { label: 'Max resolution', value: '2K' },
    ],
    monthlyVariantId: V.proMonthly, annualVariantId: V.proAnnual,
  },
  {
    id: 'studio', name: 'Studio', monthlyPrice: 29.99, annualPrice: 24.99,
    description: 'Unlimited characters, max quality, LoRA training.',
    cta: 'Go Studio', ctaStyle: 'white',
    credits: '4,000 credits / mo',
    features: [
      { label: '4,000 monthly credits' },
      { label: 'Unlimited characters' },
      { label: 'Up to 4K resolution' },
      { label: 'All engines + LoRA training' },
    ],
    limits: [
      { label: 'Credits / mo', value: '4,000' },
      { label: 'Characters', value: 'Unlimited' },
      { label: 'Max resolution', value: '4K' },
    ],
    monthlyVariantId: V.studioMonthly, annualVariantId: V.studioAnnual,
  },
  {
    id: 'brand', name: 'Brand', monthlyPrice: 99.99, annualPrice: 84.99,
    description: 'Scale your virtual brand with priority access.',
    cta: 'Go Brand', ctaStyle: 'gold',
    credits: '15,000 credits / mo',
    features: [
      { label: '15,000 monthly credits' },
      { label: 'Unlimited everything' },
      { label: '4K resolution' },
      { label: 'Priority queue' },
    ],
    limits: [
      { label: 'Credits / mo', value: '15,000' },
      { label: 'Characters', value: 'Unlimited' },
      { label: 'Max resolution', value: '4K' },
    ],
    monthlyVariantId: V.brandMonthly, annualVariantId: V.brandAnnual,
  },
];
```

Replace CREDIT_PACKS (~line 139):

```typescript
const CREDIT_PACKS = [
  { credits: 200,   price: 3,  perCredit: '1.5¢', variantId: V.credits200 },
  { credits: 800,   price: 10, perCredit: '1.25¢', variantId: V.credits800 },
  { credits: 3000,  price: 30, perCredit: '1.0¢', badge: 'Best value', variantId: V.credits3000 },
];
```

- [ ] **Step 4: Update ProfileContext default credits**

In `contexts/ProfileContext.tsx` (line 66), update the Starter default credits from **100** to **150**:
```typescript
// Line 66: change creditsRemaining: 100 → creditsRemaining: 150
creditsRemaining: 150,
```

- [ ] **Step 5: Verify + Commit**

```bash
npx tsc --noEmit
git add types.ts components/PricingPage.tsx contexts/ProfileContext.tsx services/
git commit -m "feat: complete pricing model overhaul — new plans, unified CREDIT_COSTS, 65% margin"
```

---

## Phase 4: LoRA Training UI

### Task 9: Add LoRA training to CharacterGallery

**Files:**
- Modify: `pages/CharacterGallery.tsx`
- Modify: `stores/characterStore.ts`

- [ ] **Step 1: Add trainLoRA action to characterStore**

```typescript
trainLoRA: async (characterId: string) => {
  const char = get().characters.find(c => c.id === characterId);
  if (!char) return;

  // Update status
  set(s => ({
    characters: s.characters.map(c =>
      c.id === characterId ? { ...c, loraTrainingStatus: 'training' as const } : c
    ),
  }));

  try {
    const { trainLoRAForCharacter } = await import('../services/falService');
    const images = char.modelImageBlobs || [];
    if (images.length < 5) throw new Error('Need at least 5 reference images');

    const result = await trainLoRAForCharacter(images, char.name || 'subject');

    // Persist to Supabase so status survives page refresh
    const { updateCharacterInCloud } = await import('../services/supabaseGenerationService');
    await updateCharacterInCloud(characterId, {
      lora_url: result.loraUrl,
      lora_training_status: 'ready',
    });

    set(s => ({
      characters: s.characters.map(c =>
        c.id === characterId
          ? { ...c, loraUrl: result.loraUrl, loraTrainingStatus: 'ready' as const }
          : c
      ),
    }));
  } catch (err) {
    set(s => ({
      characters: s.characters.map(c =>
        c.id === characterId ? { ...c, loraTrainingStatus: 'failed' as const } : c
      ),
    }));
    throw err;
  }
},
```

- [ ] **Step 2: Add LoRA UI to CharacterGallery detail panel**

In the character detail panel section, add:

```tsx
{/* LoRA Training */}
{selectedChar && (
  <div className="mt-4">
    {selectedChar.loraTrainingStatus === 'ready' ? (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(80,216,160,0.1)' }}>
        <span>✓</span>
        <span className="text-sm" style={{ color: 'var(--joi-text-2)' }}>LoRA trained</span>
      </div>
    ) : selectedChar.loraTrainingStatus === 'training' ? (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(167,139,250,0.1)' }}>
        <span className="animate-spin">⏳</span>
        <span className="text-sm" style={{ color: 'var(--joi-text-2)' }}>Training LoRA (~15 min)...</span>
      </div>
    ) : (
      <button
        onClick={async () => {
          if (!confirm(`Train LoRA for ${selectedChar.name}? This costs 571 credits and takes ~15 minutes.`)) return;
          try {
            await trainLoRA(selectedChar.id);
            addToast('LoRA training started', 'success');
          } catch (e: any) {
            addToast(e.message || 'Training failed', 'error');
          }
        }}
        disabled={(selectedChar.modelImageBlobs?.length || 0) < 5}
        className="w-full px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}
      >
        Train LoRA {(selectedChar.modelImageBlobs?.length || 0) < 5 && '(need 5+ photos)'}
      </button>
    )}
  </div>
)}
```

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add pages/CharacterGallery.tsx stores/characterStore.ts
git commit -m "feat: add LoRA training UI to character gallery"
```

---

## Phase 5: Smart Export

### Task 10: Create smartExport utility

**Files:**
- Create: `utils/smartExport.ts`
- Modify: `features/export/ExportModal.tsx`

- [ ] **Step 1: Create utils/ directory and smartExport.ts**

```bash
mkdir -p utils
```

```typescript
// utils/smartExport.ts
export interface ExportFormat {
  name: string;
  width: number;
  height: number;
}

export const EXPORT_FORMATS: Record<string, ExportFormat> = {
  'ig-post':    { name: 'Instagram Post',    width: 1080, height: 1350 },
  'ig-story':   { name: 'Instagram Story',   width: 1080, height: 1920 },
  'tiktok':     { name: 'TikTok / Reel',     width: 1080, height: 1920 },
  'youtube':    { name: 'YouTube Thumbnail',  width: 1280, height: 720 },
  'twitter':    { name: 'Twitter / X',        width: 1600, height: 900 },
  'square':     { name: 'Square',             width: 1080, height: 1080 },
  'original':   { name: 'Original',           width: 0,    height: 0 },
};

export async function exportForFormat(
  imageUrl: string,
  formatKey: string,
): Promise<Blob> {
  const format = EXPORT_FORMATS[formatKey];
  if (!format || formatKey === 'original' || (format.width === 0 && format.height === 0)) {
    // Original — just fetch and return
    const res = await fetch(imageUrl);
    return res.blob();
  }

  // Load image
  const img = await loadImage(imageUrl);

  // Calculate center crop
  const targetRatio = format.width / format.height;
  const imgRatio = img.width / img.height;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgRatio > targetRatio) {
    // Image is wider — crop sides
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    // Image is taller — crop top/bottom
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  // Draw to canvas at target size
  const canvas = document.createElement('canvas');
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, format.width, format.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
```

- [ ] **Step 2: Update ExportModal to use smartExport**

In `features/export/ExportModal.tsx`, replace the download handler to use `exportForFormat()`:

```typescript
import { exportForFormat, EXPORT_FORMATS } from '../../utils/smartExport';

const handleExport = async (formatKey: string) => {
  setExporting(true);
  try {
    const blob = await exportForFormat(imageUrl, formatKey);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vist-${formatKey}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setExporting(false);
  }
};
```

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add utils/smartExport.ts features/export/ExportModal.tsx
git commit -m "feat: smart export with center-crop per social media format"
```

---

## Phase 6: Outpaint Tool

### Task 11: Add Expand tool to AIEditor

**Files:**
- Modify: `pages/AIEditor.tsx`

- [ ] **Step 1: Add Expand to tool list**

Find the tools array in AIEditor.tsx. Add:

```typescript
{ id: 'expand', label: 'Expand', icon: '↔️', desc: 'Expand image beyond borders' },
```

- [ ] **Step 2: Add Expand UI panel**

When `activeTool === 'expand'`, show direction selector and pixel amount:

```tsx
{activeTool === 'expand' && (
  <div className="space-y-3">
    <label className="text-xs font-medium" style={{ color: 'var(--joi-text-2)' }}>Direction</label>
    <div className="grid grid-cols-3 gap-2">
      {['up', 'down', 'left', 'right', 'all'].map(dir => (
        <button
          key={dir}
          onClick={() => setExpandDirection(dir)}
          className={`px-3 py-2 rounded-lg text-xs capitalize ${expandDirection === dir ? 'ring-1' : ''}`}
          style={{
            background: expandDirection === dir ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
            color: 'var(--joi-text-1)',
          }}
        >
          {dir}
        </button>
      ))}
    </div>
    <label className="text-xs font-medium" style={{ color: 'var(--joi-text-2)' }}>Pixels: {expandPixels}</label>
    <input type="range" min={128} max={512} step={64} value={expandPixels}
      onChange={(e) => setExpandPixels(Number(e.target.value))} className="w-full" />
  </div>
)}
```

- [ ] **Step 3: Add expand case in handleApply**

```typescript
case 'expand': {
  const { expandWithBria } = await import('../services/replicateService');
  resultUrl = await expandWithBria(inputImageUrl, expandDirection, expandPixels, setProgress);
  break;
}
```

- [ ] **Step 4: Add state variables**

```typescript
const [expandDirection, setExpandDirection] = useState<string>('all');
const [expandPixels, setExpandPixels] = useState(256);
```

- [ ] **Step 5: Verify + Commit**

```bash
npx tsc --noEmit
git add pages/AIEditor.tsx
git commit -m "feat: add Expand/Outpaint tool using Bria in AI Editor"
```

---

## Phase 7: "Bring Your Own" Flow

### Task 12: Allow Content Studio without character

**Files:**
- Modify: `pages/ContentStudio.tsx` (~line 644)
- Modify: `pages/Director.tsx`

- [ ] **Step 1: Remove character requirement in ContentStudio**

Find where character selection gates access to Director. Allow access when `source === 'upload'` or when an image is uploaded, even without a character:

```typescript
// Before: Director only renders when selectedChar exists
// After: Director renders when selectedChar exists OR source is upload/gallery
const canUseDirector = !!selectedChar || source === 'upload' || source === 'gallery';
```

- [ ] **Step 2: Update Director to handle no-character mode**

In Director.tsx, when no character is selected but an image is uploaded:
- Hide the character picker section
- Show the uploaded image as the working image
- Show edit tools immediately (Phase 2 tools)
- Skip the generation step (Phase 1)

```typescript
const hasUploadedImage = !!uploadedImageUrl;
const needsGeneration = !hasUploadedImage;

// If user uploaded an image, skip directly to edit tools
{needsGeneration ? (
  // Show existing Director accordion (scene, outfit, pose, etc.)
) : (
  // Show uploaded image + "Edit with AI tools" prompt
  <div className="text-center py-6">
    <p className="text-sm mb-3" style={{ color: 'var(--joi-text-2)' }}>
      Your photo is ready. Use the tools below to edit it.
    </p>
  </div>
)}
```

- [ ] **Step 3: Add prominent upload entry point**

In ContentStudio's Photo tab, add a visible entry point above the Director:

```tsx
{!selectedChar && (
  <div className="mb-4 p-4 rounded-xl border border-dashed flex items-center gap-4"
    style={{ borderColor: 'rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.05)' }}>
    <span className="text-2xl">📸</span>
    <div>
      <p className="text-sm font-medium" style={{ color: 'var(--joi-text-1)' }}>No character? No problem.</p>
      <p className="text-xs" style={{ color: 'var(--joi-text-3)' }}>Upload a photo and start editing directly.</p>
    </div>
    <label className="ml-auto cursor-pointer px-4 py-2 rounded-lg text-sm"
      style={{ background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)', color: 'white' }}>
      Upload
      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </label>
  </div>
)}
```

- [ ] **Step 4: Verify + Commit**

```bash
npx tsc --noEmit
git add pages/ContentStudio.tsx pages/Director.tsx
git commit -m "feat: allow Content Studio without character — 'bring your own' flow"
```

---

## Final Verification

### Task 13: Full build + manual verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Production build**

```bash
npm run build
```

- [ ] **Step 3: Run verification checklist from spec**

Manual checks:
1. Cloudflare Worker: All AI calls route through worker (check Network tab)
2. New models: Generate with each engine, verify credit deduction
3. Soul 2.0: Create character, verify quality
4. Edit engines: Use Grok/NB Pro/Pruna for same edit
5. Kontext Pro: Standard tier session
6. Klein Edit+LoRA: Premium tier with LoRA
7. LoRA Training: Trigger from CharacterGallery
8. Smart Export: IG Story on 1:1 image → verify crop
9. Expand: Expand portrait → landscape
10. "Bring your own": Upload → edit → export without character
11. Pricing: Verify all credit costs match spec

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete MVP — all 7 phases implemented"
```

---

*Plan generated: 2026-03-19*
*Spec: docs/superpowers/specs/2026-03-19-mvp-roadmap-design.md*
