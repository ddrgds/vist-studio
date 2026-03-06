import { InfluencerParams, IdeogramModel, AspectRatio } from '../types';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const BASE_URL = '/ideogram-api';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Mapea AspectRatio al formato de Ideogram V1/V2 (/generate).
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
 * Mapea AspectRatio al formato de Ideogram V3 (/v1/ideogram-v3/generate).
 * El V3 usa formato "WxH" sin el prefijo ASPECT_.
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
 * Elige el endpoint de generación según el modelo.
 * V3 usa /v1/ideogram-v3/generate; V1/V2 usan /generate.
 */
const getEndpoint = (model: IdeogramModel): string => {
  if (model === IdeogramModel.V3) {
    return `${BASE_URL}/v1/ideogram-v3/generate`;
  }
  return `${BASE_URL}/generate`;
};

/**
 * Convierte File a base64 data URI para imágenes de referencia de estilo.
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
 * Descarga una imagen desde URL y la convierte a data URL local.
 * Las URLs efímeras de Ideogram (ideogram.ai/api/images/ephemeral/...)
 * no tienen cabeceras CORS correctas, por lo que se enrutan a través
 * del proxy /ideogram-ephemeral definido en vite.config.ts.
 */
const urlToDataUrl = async (url: string): Promise<string> => {
  // Rutar URLs efímeras de Ideogram por proxy para evitar error CORS
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
// Construcción del prompt
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
// Generación con Ideogram V3 (incluye character reference)
// El endpoint /v1/ideogram-v3/generate usa body plano (sin wrapper
// image_request), aspect_ratio en formato "WxH", y campo magic_prompt.
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
    // V3 character_reference_images requiere multipart/form-data con binario
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
// Generación con Ideogram V2 / V2A
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
// Punto de entrada público
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
    throw new Error('Ideogram no devolvió ninguna imagen. Verifica tu API key y los parámetros.');
  }

  if (onProgress) onProgress(100);
  return results;
};
