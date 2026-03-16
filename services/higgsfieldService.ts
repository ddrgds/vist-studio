import { InfluencerParams, AspectRatio } from '../types';

// ─────────────────────────────────────────────
// Higgsfield API — async submit + poll pattern
// Auth is injected by the /higgsfield-api proxy.
// ─────────────────────────────────────────────

const PROXY_BASE = '/higgsfield-api';
const POLL_INTERVAL = 2000; // 2s between status checks
const MAX_POLL_TIME = 120_000; // 2 min timeout

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const urlToDataUrl = async (url: string): Promise<string> => {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

/**
 * Maps AspectRatio to Higgsfield format.
 * Higgsfield supports: "1:1", "16:9", "9:16", "4:3", "3:4"
 */
const toHiggsfieldAspectRatio = (ratio: AspectRatio): string => {
  const map: Record<AspectRatio, string> = {
    [AspectRatio.Square]: '1:1',
    [AspectRatio.Portrait]: '3:4',
    [AspectRatio.Landscape]: '4:3',
    [AspectRatio.Wide]: '16:9',
    [AspectRatio.Tall]: '9:16',
  };
  return map[ratio] ?? '3:4';
};

// ─────────────────────────────────────────────
// Core API: submit + poll
// ─────────────────────────────────────────────

interface HiggsfieldSubmitResponse {
  request_id: string;
}

interface HiggsfieldStatusResponse {
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw' | 'cancelled';
  images?: { url: string; content_type: string }[];
  error?: string;
}

/**
 * Submit a generation request and poll until complete.
 * Returns the image URLs from the completed response.
 */
const submitAndPoll = async (
  modelId: string,
  input: Record<string, unknown>,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  // Submit
  const submitRes = await fetch(`${PROXY_BASE}/${modelId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: abortSignal,
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => submitRes.statusText);
    throw new Error(`Higgsfield submit failed (${submitRes.status}): ${errText}`);
  }

  const { request_id } = (await submitRes.json()) as HiggsfieldSubmitResponse;
  if (!request_id) throw new Error('Higgsfield: no request_id received');

  if (onProgress) onProgress(30);

  // Poll
  const start = Date.now();
  let lastProgress = 30;

  while (Date.now() - start < MAX_POLL_TIME) {
    if (abortSignal?.aborted) throw new Error('Generation cancelled');

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const statusRes = await fetch(`${PROXY_BASE}/requests/${request_id}/status`, {
      signal: abortSignal,
    });

    if (!statusRes.ok) continue; // retry on transient errors

    const status = (await statusRes.json()) as HiggsfieldStatusResponse;

    // Progress simulation based on elapsed time
    const elapsed = (Date.now() - start) / MAX_POLL_TIME;
    lastProgress = Math.min(30 + elapsed * 60, 90);
    if (onProgress) onProgress(lastProgress);

    switch (status.status) {
      case 'completed': {
        if (onProgress) onProgress(95);
        const urls = status.images?.map((img) => img.url) ?? [];
        if (urls.length === 0) throw new Error('Higgsfield: completed but no images');
        return urls;
      }
      case 'failed':
        throw new Error(`Higgsfield generation failed: ${status.error ?? 'unknown error'}`);
      case 'nsfw':
        throw new Error('Higgsfield: content flagged as NSFW and blocked');
      case 'cancelled':
        throw new Error('Higgsfield: generation was cancelled');
      // 'queued' | 'in_progress' → continue polling
    }
  }

  throw new Error('Higgsfield: generation timed out after 2 minutes');
};

// ─────────────────────────────────────────────
// Soul Standard — text-to-image (Director)
// Model: higgsfield-ai/soul/standard
// Fashion-aware, editorial-grade generation
// ─────────────────────────────────────────────

export const generateWithSoul = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
  styleId?: string,
): Promise<string[]> => {
  if (onProgress) onProgress(5);

  const character = params.characters[0];

  // Soul understands fashion terms and cultural references natively —
  // keep the prompt descriptive but natural, no photography jargon.
  let prompt = 'A stunning, photorealistic editorial photograph.';

  if (character.characteristics) prompt += ` The subject: ${character.characteristics}.`;

  if (character.outfitDescription) {
    prompt += ` Wearing: ${character.outfitDescription}.`;
  } else if (character.outfitImages?.length) {
    prompt += ` Wearing a high-fashion editorial outfit.`;
  }

  if (character.pose) prompt += ` Pose: ${character.pose}.`;
  if (character.accessory) prompt += ` With: ${character.accessory}.`;
  if (params.scenario) prompt += ` Scene: ${params.scenario}.`;
  if (params.lighting) prompt += ` Lighting: ${params.lighting}.`;
  if (params.camera) prompt += ` Camera: ${params.camera}.`;
  if (params.imageBoost) prompt += ` ${params.imageBoost}.`;
  if (params.negativePrompt) prompt += ` Avoid: ${params.negativePrompt}.`;

  prompt += ' Natural skin texture, editorial composition, magazine quality.';

  if (onProgress) onProgress(10);

  // Build input — Soul accepts prompt, aspect_ratio, resolution, style_id
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: toHiggsfieldAspectRatio(params.aspectRatio),
    resolution: '1080p',
  };
  if (styleId) input.style_id = styleId;

  const urls = await submitAndPoll(
    'higgsfield-ai/soul/standard',
    input,
    onProgress,
    abortSignal,
  );

  // Convert Higgsfield URLs to data URLs for consistency with other services
  const results = await Promise.all(urls.map(urlToDataUrl));
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Soul Reference — image-to-image (Photo Session)
// Takes a base image + prompt to generate variations
// maintaining composition, lighting, and style cues
// ─────────────────────────────────────────────

export const editWithSoulReference = async (
  baseImage: File,
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.Portrait,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
  styleId?: string,
): Promise<string[]> => {
  if (onProgress) onProgress(5);

  const imageDataUri = await fileToDataUri(baseImage);
  if (onProgress) onProgress(15);

  const input: Record<string, unknown> = {
    prompt,
    image_url: imageDataUri,
    aspect_ratio: toHiggsfieldAspectRatio(aspectRatio),
    resolution: '1080p',
    strength: 0.65,
  };
  if (styleId) input.style_id = styleId;

  const urls = await submitAndPoll(
    'higgsfield-ai/soul/image-to-image',
    input,
    onProgress,
    abortSignal,
  );

  const results = await Promise.all(urls.map(urlToDataUrl));
  if (onProgress) onProgress(100);
  return results;
};
