import { InfluencerParams, AspectRatio, ModelsLabModel } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// API key lives in .env as MODELSLAB_API_KEY — injected via vite.config.ts define.
// Auth is sent as `key` field inside the JSON request body (not a header).
// Docs: https://docs.modelslab.com
// ─────────────────────────────────────────────────────────────────────────────

// API key is injected server-side by the /modelslab-api proxy.
const BASE = '/modelslab-api/v6';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// SDXL-optimized resolutions per aspect ratio
function toDimensions(ratio: AspectRatio): { width: number; height: number } {
  switch (ratio) {
    case AspectRatio.Tall:      return { width: 768,  height: 1344 };
    case AspectRatio.Portrait:  return { width: 832,  height: 1216 };
    case AspectRatio.Landscape: return { width: 1216, height: 832  };
    case AspectRatio.Wide:      return { width: 1344, height: 768  };
    default:                    return { width: 1024, height: 1024 };
  }
}

// File → hosted URL via base64 data URI (ModelsLab img2img needs a URL, not a blob)
// We send base64=true so the API accepts embedded image data directly.
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Async polling — ModelsLab returns status:'processing' for most requests.
// Poll POST /api/v6/realtime/fetch/{id} until status:'success' or timeout.
// ─────────────────────────────────────────────────────────────────────────────

async function pollForResult(
  id: string,
  onProgress: (p: number) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  const MAX_WAIT = 120_000; // 2 min
  const INTERVAL  = 3_000;  // 3s between polls
  const start = Date.now();
  let p = 40;

  while (Date.now() - start < MAX_WAIT) {
    if (signal?.aborted) throw new Error('Cancelled');
    await new Promise(r => setTimeout(r, INTERVAL));

    p = Math.min(85, p + 7);
    onProgress(p);

    const res = await fetch(`${BASE}/realtime/fetch/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'PROXIED' }),
      signal,
    });

    if (!res.ok) throw new Error(`ModelsLab poll HTTP ${res.status}`);
    const data = await res.json();

    if (data.status === 'success') return data.output as string[];
    if (data.status === 'error')   throw new Error(data.message || 'ModelsLab generation failed');
    // status === 'processing' → continue polling
  }

  throw new Error('ModelsLab: timeout (>2 min) esperando generación');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Image-to-Image
// Endpoint: POST /api/v6/images/img2img
// Transforms an existing image guided by a text prompt.
// `strength` (0–1): how much to deviate from original (0.5 = balanced).
// ─────────────────────────────────────────────────────────────────────────────

export async function editImageWithModelsLab(
  baseImage: File,
  instruction: string,
  modelId: ModelsLabModel,
  onProgress: (p: number) => void,
  options: { strength?: number; steps?: number; guidanceScale?: number; seed?: number; aspectRatio?: AspectRatio } = {},
  signal?: AbortSignal,
): Promise<string[]> {

  const { width, height } = toDimensions(options.aspectRatio ?? AspectRatio.Square);
  const base64 = await fileToBase64(baseImage);
  const initImageData = `data:${baseImage.type || 'image/jpeg'};base64,${base64}`;

  onProgress(5);
  if (signal?.aborted) throw new Error('Cancelled');

  const body = {
    key:                  'PROXIED',
    model_id:             modelId as string,
    prompt:               instruction,
    negative_prompt:      'ugly, deformed, noisy, blurry, distorted, lowres, bad anatomy',
    init_image:           initImageData,
    strength:             options.strength ?? 0.6,
    width:                String(width),
    height:               String(height),
    samples:              '1',
    num_inference_steps:  String(options.steps ?? 30),
    safety_checker:       'no',
    enhance_prompt:       'no',
    guidance_scale:       options.guidanceScale ?? 7,
    seed:                 options.seed ?? null,
    webhook:              null,
    track_id:             null,
  };

  const res = await fetch(`${BASE}/images/img2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ModelsLab img2img HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }

  const data = await res.json();
  onProgress(20);

  if (data.status === 'error') throw new Error(data.message || 'ModelsLab img2img error');

  let outputUrls: string[];

  if (data.status === 'success') {
    onProgress(80);
    outputUrls = data.output as string[];
  } else {
    const id: string | undefined =
      data.id ??
      (typeof data.fetch_result === 'string' ? data.fetch_result.split('/').pop() : undefined);
    if (!id) throw new Error('ModelsLab img2img: no ID para polling');
    onProgress(30);
    outputUrls = await pollForResult(id, onProgress, signal);
  }

  onProgress(90);
  const dataUrls = await Promise.all(outputUrls.map(urlToDataUrl));
  onProgress(100);
  return dataUrls;
}

export async function generateWithModelsLab(
  params: InfluencerParams,
  modelId: ModelsLabModel,
  onProgress: (p: number) => void,
  signal?: AbortSignal,
): Promise<string[]> {

  const { width, height } = toDimensions(params.aspectRatio);
  const char = params.characters[0];

  // Build prompt — características + outfit + escena + iluminación
  const promptParts: string[] = [];
  if (char?.characteristics)   promptParts.push(char.characteristics);
  if (char?.outfitDescription) promptParts.push(char.outfitDescription);
  if (char?.accessory)         promptParts.push(char.accessory);
  if (params.scenario)         promptParts.push(params.scenario);
  if (params.lighting)         promptParts.push(params.lighting);
  if (params.camera)           promptParts.push(params.camera);
  if (params.imageBoost)       promptParts.push(params.imageBoost);
  const prompt = promptParts.filter(Boolean).join(', ');

  const negativePrompt = [
    params.negativePrompt,
    'ugly, deformed, noisy, blurry, distorted, lowres, bad anatomy, bad hands, extra limbs, missing fingers',
  ].filter(Boolean).join(', ');

  onProgress(5);
  if (signal?.aborted) throw new Error('Cancelled');

  const body = {
    key:                  'PROXIED',
    model_id:             modelId as string,
    prompt,
    negative_prompt:      negativePrompt,
    width:                String(width),
    height:               String(height),
    samples:              String(Math.min(params.numberOfImages ?? 1, 4)),
    num_inference_steps:  String(params.steps ?? 30),
    safety_checker:       'no',   // NSFW unlocked — never send 'yes' for these models
    enhance_prompt:       'no',   // keep exact prompt intent
    guidance_scale:       params.guidanceScale ?? 7,
    seed:                 params.seed ?? null,
    webhook:              null,
    track_id:             null,
  };

  const res = await fetch(`${BASE}/images/text2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ModelsLab HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }

  const data = await res.json();
  onProgress(20);

  if (data.status === 'error') throw new Error(data.message || 'ModelsLab error desconocido');

  let outputUrls: string[];

  if (data.status === 'success') {
    onProgress(80);
    outputUrls = data.output as string[];
  } else {
    // status === 'processing' — extract request ID and poll
    const id: string | undefined =
      data.id ??
      (typeof data.fetch_result === 'string' ? data.fetch_result.split('/').pop() : undefined);

    if (!id) throw new Error('ModelsLab: no devolvió ID para polling');
    onProgress(30);
    outputUrls = await pollForResult(id, onProgress, signal);
  }

  onProgress(90);
  // Convert remote URLs → local dataURLs for gallery storage
  const dataUrls = await Promise.all(outputUrls.map(urlToDataUrl));
  onProgress(100);
  return dataUrls;
}
