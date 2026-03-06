import Replicate from 'replicate';
import { InfluencerParams, ReplicateModel, AspectRatio } from '../types';

// ─────────────────────────────────────────────
// Config
// Replicate's API blocks direct browser calls (CORS). In dev we route
// through the Vite proxy (/replicate-api → https://api.replicate.com).
// ─────────────────────────────────────────────

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const replicate = new Replicate({
  // In dev the Vite proxy injects the Authorization header server-side,
  // so we pass a dummy token to satisfy the SDK's type requirement while
  // avoiding a real Authorization header in the browser request (which
  // would trigger a CORS preflight that api.replicate.com blocks).
  // In production the real token is used directly.
  auth: isDev ? 'proxy-injected' : process.env.REPLICATE_API_TOKEN,
  fetch: isDev
    ? ((url: RequestInfo | URL, init?: RequestInit) => {
      // Rewrite URL through Vite proxy
      const urlStr = url.toString().replace('https://api.replicate.com', '/replicate-api');
      // Strip the Authorization header — the proxy adds the real token
      const headers = new Headers(init?.headers);
      headers.delete('Authorization');
      return fetch(urlStr, { ...init, headers });
    })
    : undefined,
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Convierte un File a base64 data URI.
 * Replicate acepta data URIs directamente como parámetros de imagen.
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
 * Replicate devuelve URLs temporales — las convertimos para consistencia.
 */
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
 * Mapea AspectRatio al formato que acepta FLUX.2 [max] y FLUX.2 Pro.
 */
const toFluxAspectRatio = (ratio: AspectRatio): string => {
  const map: Record<AspectRatio, string> = {
    [AspectRatio.Square]: '1:1',
    [AspectRatio.Portrait]: '3:4',
    [AspectRatio.Landscape]: '4:3',
    [AspectRatio.Wide]: '16:9',
    [AspectRatio.Tall]: '9:16',
  };
  return map[ratio] ?? '3:4';
};

/**
 * Mapea AspectRatio al formato de Gen-4 Image.
 * Gen-4 soporta: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
 */
const toGen4AspectRatio = (ratio: AspectRatio): string => {
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
// FLUX.2 [max] — máxima fidelidad, hasta 8 refs
// Modelo de Black Forest Labs, Ene 2026
// Deployment-style endpoint (sin version hash)
// ─────────────────────────────────────────────
export const generateWithFlux2Max = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (onProgress) onProgress(10);

  const character = params.characters[0];

  let prompt = 'An ultra-photorealistic fashion editorial photograph of a model. The photo is taken with a Sony A7R V camera and an 85mm f/1.4 portrait lens, shot with Vogue magazine quality.';

  if (character.characteristics) prompt += ` The model is described as: ${character.characteristics}.`;

  if (character.outfitDescription) {
    prompt += ` They are wearing ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` They are wearing a high-fashion outfit, well-dressed, and stylish based on the reference clothing.`;
  }

  if (character.pose) {
    prompt += ` They are posing in the following way: ${character.pose}.`;
  } else {
    prompt += ` They are standing in a natural, confident fashion editorial stance.`;
  }

  if (character.accessory) {
    prompt += ` They are holding or interacting with: ${character.accessory}.`;
  }

  if (params.scenario) {
    prompt += ` The scene is set in: ${params.scenario}.`;
  }

  if (params.lighting) {
    prompt += ` The lighting features: ${params.lighting}.`;
  }

  if (params.imageBoost) {
    prompt += ` Additional styling elements: ${params.imageBoost}.`;
  }

  prompt += ' The image features sharp facial detail, natural skin texture, no watermarks, and no text.';
  const count = params.numberOfImages || 1;

  // Convierte imágenes de referencia a data URI (hasta 8)
  // FLUX.2 [max] usa campos separados: image_prompt, image_prompt_2 ... image_prompt_8
  const refDataUris: string[] = [];
  if (character.modelImages && character.modelImages.length > 0) {
    if (onProgress) onProgress(20);
    const imgs = await Promise.all(
      character.modelImages.slice(0, 8).map(fileToDataUri)
    );
    refDataUris.push(...imgs);
  }

  if (onProgress) onProgress(30);

  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: toFluxAspectRatio(params.aspectRatio),
      output_format: 'jpg',
      output_quality: 90,
      safety_tolerance: 5,  // máximo permitido en Replicate (rango 1–5)
      ...(params.seed !== undefined && { seed: params.seed }),
    };

    // FLUX.2 [max] acepta refs como campos individuales: image_prompt, image_prompt_2 … image_prompt_8
    if (refDataUris.length > 0) input.image_prompt = refDataUris[0];
    if (refDataUris.length > 1) input.image_prompt_2 = refDataUris[1];
    if (refDataUris.length > 2) input.image_prompt_3 = refDataUris[2];
    if (refDataUris.length > 3) input.image_prompt_4 = refDataUris[3];
    if (refDataUris.length > 4) input.image_prompt_5 = refDataUris[4];
    if (refDataUris.length > 5) input.image_prompt_6 = refDataUris[5];
    if (refDataUris.length > 6) input.image_prompt_7 = refDataUris[6];
    if (refDataUris.length > 7) input.image_prompt_8 = refDataUris[7];

    const output = await replicate.run(
      'black-forest-labs/flux-2-max' as `${string}/${string}`,
      { input, signal: abortSignal }
    ) as string | string[];

    if (onProgress) onProgress(40 + (i / count) * 50);

    const url = Array.isArray(output) ? output[0] : output;
    if (url) {
      const dataUrl = await urlToDataUrl(url);
      results.push(dataUrl);
    }
  }

  if (results.length === 0) {
    throw new Error('FLUX.2 [max] no devolvió ninguna imagen. Verifica tu API key de Replicate.');
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Runway Gen-4 Image — character + location consistency
// Hasta 3 imágenes de referencia, Jul 2025
// Supports @tagname notation in prompts
// ─────────────────────────────────────────────
export const generateWithGen4Image = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const character = params.characters[0];

  if (!character.modelImages || character.modelImages.length === 0) {
    throw new Error('Gen-4 Image requiere al menos una foto de referencia del modelo.');
  }

  if (onProgress) onProgress(10);

  // Gen-4 acepta hasta 3 referencias
  const refFiles = character.modelImages.slice(0, 3);
  const refDataUris = await Promise.all(refFiles.map(fileToDataUri));

  // Crea tags para cada referencia (alfanumérico, 3–15 chars, inicia con letra)
  const refTags = refDataUris.map((_, idx) => `model${idx > 0 ? idx + 1 : ''}`);
  // refTags = ["model", "model2", "model3"]

  if (onProgress) onProgress(20);

  // El primer tag es el personaje principal — úsalo en el prompt
  const characterTag = refTags[0]; // "model"

  let prompt = `An ultra-photorealistic fashion editorial photograph of @${characterTag}. The photo is taken with a Sony A7R V camera and an 85mm f/1.4 portrait lens, shot with Vogue magazine quality.`;

  if (character.characteristics) prompt += ` The model @${characterTag} is described as: ${character.characteristics}.`;

  if (character.outfitDescription) {
    prompt += ` They are wearing ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` They are wearing a high-fashion outfit, well-dressed, and stylish based on the reference clothing.`;
  }

  if (character.pose) {
    prompt += ` They are posing in the following way: ${character.pose}.`;
  } else {
    prompt += ` They are standing in a natural, confident fashion editorial stance.`;
  }

  if (character.accessory) {
    prompt += ` They are holding or interacting with: ${character.accessory}.`;
  }

  if (params.scenario) {
    prompt += ` The scene is set in: ${params.scenario}.`;
  }

  if (params.lighting) {
    prompt += ` The lighting features: ${params.lighting}.`;
  }

  if (params.imageBoost) {
    prompt += ` Additional styling elements: ${params.imageBoost}.`;
  }

  prompt += ' The image features sharp facial detail, natural skin texture, no watermarks, and no text.';
  const count = params.numberOfImages || 1;
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    if (onProgress) onProgress(25 + (i / count) * 60);

    const output = await replicate.run(
      'runwayml/gen4-image:81f2cdae261dbfd0f4528bec1d65878c2080e967e81cd5392137cf15d23dfd73' as `${string}/${string}:${string}`,
      {
        input: {
          prompt,
          reference_images: refDataUris,
          reference_tags: refTags,
          aspect_ratio: toGen4AspectRatio(params.aspectRatio),
          resolution: '1080p',
          ...(params.guidanceScale !== undefined && { guidance_scale: params.guidanceScale }),
          ...(params.seed !== undefined && { seed: params.seed }),
        },
        signal: abortSignal, // Pass abortSignal here
      }
    ) as string | string[];

    const url = Array.isArray(output) ? output[0] : output;
    if (url) {
      const dataUrl = await urlToDataUrl(url);
      results.push(dataUrl);
    }
  }

  if (results.length === 0) {
    throw new Error('Gen-4 Image no devolvió ninguna imagen. Verifica tu API key de Replicate.');
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// IDM-VTON — Virtual Try-On
// ⚠️ Licencia no-comercial: CC BY-NC-SA 4.0 (KAIST)
// Coloca una prenda específica sobre la foto de la persona
// Requiere: foto de persona + foto de prenda + categoría
// ─────────────────────────────────────────────
export interface VTONParams {
  personImage: File;           // Foto de la persona (idealmente ratio 3:4)
  garmentImage: File;          // Foto de la prenda (producto o usada)
  garmentDescription: string;  // Descripción textual de la prenda
  category: 'upper_body' | 'lower_body' | 'dresses';
}

const IDMVTON_VERSION = 'cuuupid/idm-vton:3b032a70c29aef7b9c3222f2e40b71660201d8c288336475ba326f3ca278a3e1';

export const generateVirtualTryOn = async (
  vtonParams: VTONParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (onProgress) onProgress(10);

  const personDataUri = await fileToDataUri(vtonParams.personImage);
  const garmentDataUri = await fileToDataUri(vtonParams.garmentImage);

  if (onProgress) onProgress(25);

  const output = await replicate.run(
    IDMVTON_VERSION as `${string}/${string}:${string}`,
    {
      input: {
        human_img: personDataUri,
        garm_img: garmentDataUri,
        garment_des: vtonParams.garmentDescription,
        category: vtonParams.category,
        crop: true,   // Auto-crop si el ratio no es 3:4
        force_dc: false,
        steps: 30,
        seed: 42,
      },
      signal: abortSignal, // Pass abortSignal here
    }
  ) as unknown as string;

  if (!output) {
    throw new Error('IDM-VTON no devolvió resultado. Verifica las imágenes e intenta de nuevo.');
  }

  if (onProgress) onProgress(90);

  const dataUrl = await urlToDataUrl(output);
  if (onProgress) onProgress(100);
  return dataUrl;
};

// ─────────────────────────────────────────────
// Face Swap — codeplugtech/face-swap (InsightFace / inswapper_128)
// ~1.8M runs · ~$0.003/run · ~28 s
// swap_image = cara fuente · target_image = foto de destino
// ─────────────────────────────────────────────
export const faceSwapWithReplicate = async (
  targetFile: File,
  sourceFile: File,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (onProgress) onProgress(15);

  const [targetDataUri, sourceDataUri] = await Promise.all([
    fileToDataUri(targetFile),
    fileToDataUri(sourceFile),
  ]);

  if (onProgress) onProgress(35);

  const output = await replicate.run(
    'codeplugtech/face-swap' as `${string}/${string}`,
    {
      input: {
        swap_image: sourceDataUri,    // cara a insertar (fuente)
        target_image: targetDataUri,  // imagen sobre la que se aplica
      },
      signal: abortSignal,
    }
  ) as unknown;

  const imageUrl: string | undefined =
    typeof output === 'string'
      ? output
      : Array.isArray(output)
        ? (output as string[])[0]
        : (output as any)?.output ?? (output as any)?.image?.url;

  if (!imageUrl) throw new Error('Face swap: no se recibió imagen. Verifica las fotos e intenta de nuevo.');

  if (onProgress) onProgress(90);
  const dataUrl = await urlToDataUrl(imageUrl);
  if (onProgress) onProgress(100);
  return dataUrl;
};

// ─────────────────────────────────────────────
// Grok Imagine — xAI SOTA text-to-image
// ~4s/img · 13 aspect ratios · no reference images required
// ─────────────────────────────────────────────

/**
 * Mapea AspectRatio a los ratios que soporta Grok Imagine.
 * Soportados: 2:1, 20:9, 19.5:9, 16:9, 4:3, 3:2, 1:1, 2:3, 3:4, 9:16, 9:19.5, 9:20, 1:2
 */
const toGrokAspectRatio = (ratio: AspectRatio): string => {
  const map: Record<AspectRatio, string> = {
    [AspectRatio.Square]: '1:1',
    [AspectRatio.Portrait]: '3:4',
    [AspectRatio.Landscape]: '4:3',
    [AspectRatio.Wide]: '16:9',
    [AspectRatio.Tall]: '9:16',
  };
  return map[ratio] ?? '1:1';
};

export const generateWithGrokImagine = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (onProgress) onProgress(10);

  const character = params.characters[0];

  let prompt = 'An ultra-photorealistic fashion editorial photograph of a model. Shot with Vogue magazine quality, sharp facial detail, natural skin texture.';

  if (character.characteristics) prompt += ` The model is: ${character.characteristics}.`;

  if (character.outfitDescription) {
    prompt += ` Wearing: ${character.outfitDescription}.`;
  } else if (character.outfitImages?.length) {
    prompt += ` Wearing a high-fashion outfit based on the reference clothing.`;
  }

  if (character.pose) {
    prompt += ` Pose: ${character.pose}.`;
  }

  if (character.accessory) {
    prompt += ` Holding or wearing: ${character.accessory}.`;
  }

  if (params.scenario) prompt += ` Scene: ${params.scenario}.`;
  if (params.lighting) prompt += ` Lighting: ${params.lighting}.`;
  if (params.camera) prompt += ` Camera: ${params.camera}.`;
  if (params.imageBoost) prompt += ` ${params.imageBoost}.`;
  if (params.negativePrompt) prompt += ` Avoid: ${params.negativePrompt}.`;

  const count = params.numberOfImages || 1;
  if (onProgress) onProgress(20);

  const output = await replicate.run(
    'xai/grok-imagine-image' as `${string}/${string}`,
    {
      input: {
        prompt,
        num_images: count,
        aspect_ratio: toGrokAspectRatio(params.aspectRatio),
        output_format: 'jpeg',
      },
      signal: abortSignal,
    }
  ) as unknown;

  if (onProgress) onProgress(80);

  // Output: array of URL strings or objects with .url
  const rawUrls: string[] = [];
  if (Array.isArray(output)) {
    for (const item of output as unknown[]) {
      if (typeof item === 'string') rawUrls.push(item);
      else if (item && typeof (item as any).url === 'string') rawUrls.push((item as any).url);
    }
  } else if (typeof output === 'string') {
    rawUrls.push(output);
  }

  if (rawUrls.length === 0) {
    throw new Error('Grok Imagine no devolvió ninguna imagen. Verifica tu API key de Replicate.');
  }

  const results = await Promise.all(rawUrls.map(urlToDataUrl));
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Router principal
// ─────────────────────────────────────────────
export const generateWithReplicate = async (
  params: InfluencerParams,
  model: ReplicateModel = ReplicateModel.Flux2Max,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  switch (model) {
    case ReplicateModel.Flux2Max:
      return generateWithFlux2Max(params, onProgress, abortSignal);
    case ReplicateModel.Gen4Image:
      return generateWithGen4Image(params, onProgress, abortSignal);
    case ReplicateModel.GrokImagine:
      return generateWithGrokImagine(params, onProgress, abortSignal);
    case ReplicateModel.IDMVTON:
      throw new Error('Para Virtual Try-On usa generateVirtualTryOn() directamente.');
    default:
      return generateWithFlux2Max(params, onProgress);
  }
};
