import { InfluencerParams, IdeogramModel, AspectRatio } from '../types';
import { proxyUrl } from './apiAuth';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const BASE_URL = proxyUrl('ideogram', '/ideogram-api');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Maps AspectRatio to the Ideogram V1/V2 (/generate) format.
 */
const toIdeogramAspectRatio = (ratio: AspectRatio): string => {
  const map: Record<AspectRatio, string> = {
    [AspectRatio.Square]: 'ASPECT_1_1',
    [AspectRatio.Portrait]: 'ASPECT_3_4',
    [AspectRatio.Landscape]: 'ASPECT_4_3',
    [AspectRatio.Wide]: 'ASPECT_16_9',
    [AspectRatio.Tall]: 'ASPECT_9_16',
  };
  return map[ratio] ?? 'ASPECT_3_4';
};

/**
 * Maps AspectRatio to the Ideogram V3 (/v1/ideogram-v3/generate) format.
 * V3 uses "WxH" format without the ASPECT_ prefix.
 */
const toIdeogramAspectRatioV3 = (ratio: AspectRatio): string => {
  const map: Record<AspectRatio, string> = {
    [AspectRatio.Square]: '1x1',
    [AspectRatio.Portrait]: '3x4',
    [AspectRatio.Landscape]: '4x3',
    [AspectRatio.Wide]: '16x9',
    [AspectRatio.Tall]: '9x16',
  };
  return map[ratio] ?? '3x4';
};

/**
 * Selects the generation endpoint based on the model.
 * V3 uses /v1/ideogram-v3/generate; V1/V2 use /generate.
 */
const getEndpoint = (model: IdeogramModel): string => {
  if (model === IdeogramModel.V3) {
    return `${BASE_URL}/v1/ideogram-v3/generate`;
  }
  return `${BASE_URL}/generate`;
};

/**
 * Converts File to base64 data URI for style reference images.
 */
const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Downloads an image from URL and converts it to a local data URL.
 * Ephemeral Ideogram URLs (ideogram.ai/api/images/ephemeral/...)
 * don't have correct CORS headers, so they are routed through
 * the /ideogram-ephemeral proxy defined in vite.config.ts.
 */
const urlToDataUrl = async (url: string): Promise<string> => {
  // Route ephemeral Ideogram URLs through proxy to avoid CORS error
  const fetchUrl = url.startsWith('https://ideogram.ai/')
    ? url.replace('https://ideogram.ai', '/ideogram-ephemeral')
    : url;

  const resp = await fetch(fetchUrl);
  const blob = await resp.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

// ─────────────────────────────────────────────
// Prompt construction
// ─────────────────────────────────────────────
const buildPrompt = (params: InfluencerParams): string => {
  const character = params.characters[0];

  let prompt = 'An ultra-photorealistic fashion editorial photograph of a model';

  if (character.characteristics) prompt += ` described as: ${character.characteristics}.`;
  else prompt += '.';

  if (character.outfitDescription) {
    prompt += ` The model is wearing ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` The model is wearing a high-fashion, stylish outfit based on the reference imagery.`;
  }

  if (character.pose) {
    prompt += ` The model is posing in the following way: ${character.pose}.`;
  } else {
    prompt += ` The model is standing in a natural, confident fashion editorial stance.`;
  }

  if (character.accessory) {
    prompt += ` They are holding or interacting with: ${character.accessory}.`;
  }

  if (params.scenario) {
    prompt += ` The scene is set in: ${params.scenario}.`;
  }

  if (params.lighting) {
    prompt += ` The lighting is described as: ${params.lighting}.`;
  }

  if (params.imageBoost) {
    prompt += ` Additional styling elements: ${params.imageBoost}.`;
  }

  prompt += ' The image must feature professional studio quality, sharp detail, absolute photorealism, and must not have any watermarks or text.';

  return prompt;
};

// ─────────────────────────────────────────────
// Generation with Ideogram V3 (includes character reference)
// The /v1/ideogram-v3/generate endpoint uses a flat body (no wrapper
// image_request), aspect_ratio in "WxH" format, and a magic_prompt field.
// ─────────────────────────────────────────────
const generateWithV3 = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const character = params.characters[0];
  const prompt = buildPrompt(params);
  const count = params.numberOfImages || 1;
  const charRefFiles = character.modelImages?.slice(0, 4) ?? [];

  if (onProgress) onProgress(30);

  const fields: Record<string, string | number> = {
    prompt,
    rendering_speed: 'QUALITY',
    aspect_ratio: toIdeogramAspectRatioV3(params.aspectRatio),
    magic_prompt: 'AUTO',
    num_images: count,
    style_type: 'REALISTIC',
  };

  if (params.negativePrompt) {
    fields.negative_prompt = params.negativePrompt;
  }

  let response: Response;

  if (charRefFiles.length > 0) {
    // V3 character_reference_images requires multipart/form-data with binary
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, String(value));
    }
    for (const file of charRefFiles) {
      formData.append('character_reference_images', file);
    }
    response = await fetch(getEndpoint(IdeogramModel.V3), {
      method: 'POST',
      body: formData,
      signal: abortSignal,
    });
  } else {
    response = await fetch(getEndpoint(IdeogramModel.V3), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
      signal: abortSignal,
    });
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Ideogram error ${response.status}: ${JSON.stringify((err as any)?.detail || response.statusText)}`);
  }

  if (onProgress) onProgress(80);

  const data = await response.json() as { data: { url: string }[] };
  const results: string[] = [];

  for (const img of data.data) {
    if (img.url) {
      const dataUrl = await urlToDataUrl(img.url);
      results.push(dataUrl);
    }
  }

  return results;
};

// ─────────────────────────────────────────────
// Generation with Ideogram V2 / V2A
// ─────────────────────────────────────────────
const generateWithV2 = async (
  params: InfluencerParams,
  model: IdeogramModel,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const prompt = buildPrompt(params);
  const count = params.numberOfImages || 1;

  if (onProgress) onProgress(20);

  const imageRequest: Record<string, unknown> = {
    prompt,
    model,
    aspect_ratio: toIdeogramAspectRatio(params.aspectRatio),
    magic_prompt_option: 'AUTO',
    num_images: count,
    style_type: 'REALISTIC',
  };

  if (params.negativePrompt) {
    imageRequest.negative_prompt = params.negativePrompt;
  }

  const response = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_request: imageRequest }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Ideogram error ${response.status}: ${JSON.stringify((err as any)?.detail || response.statusText)}`);
  }

  if (onProgress) onProgress(85);

  const data = await response.json() as { data: { url: string }[] };
  const results: string[] = [];

  for (const img of data.data) {
    if (img.url) {
      const dataUrl = await urlToDataUrl(img.url);
      results.push(dataUrl);
    }
  }

  return results;
};

// ─────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────
export const generateWithIdeogram = async (
  params: InfluencerParams,
  model: IdeogramModel = IdeogramModel.V3,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  // API key is injected server-side by the Vite proxy (vite.config.ts)

  if (onProgress) onProgress(5);

  let results: string[];
  if (model === IdeogramModel.V3) {
    results = await generateWithV3(params, onProgress, abortSignal);
  } else {
    results = await generateWithV2(params, model, onProgress, abortSignal);
  }

  if (results.length === 0) {
    throw new Error('Ideogram did not return any images. Check your API key and parameters.');
  }

  if (onProgress) onProgress(100);
  return results;
};
