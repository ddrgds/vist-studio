import Replicate from 'replicate';
import { InfluencerParams, ReplicateModel, AspectRatio } from '../types';
import { proxyUrl } from './apiAuth';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const REPLICATE_PROXY = proxyUrl('replicate', '/replicate-api');

const replicate = new Replicate({
  // The proxy injects the Authorization header server-side,
  // so we pass a dummy token to satisfy the SDK's type requirement while
  // avoiding a real Authorization header in the browser request (which
  // would trigger a CORS preflight that api.replicate.com blocks).
  auth: 'proxy-injected',
  fetch: (url: RequestInfo | URL, init?: RequestInit) => {
    // Rewrite URL through proxy (dev: Vite, prod: Cloudflare Worker)
    const urlStr = url.toString().replace('https://api.replicate.com', REPLICATE_PROXY);
    // Strip the Authorization header — the proxy adds the real token
    const headers = new Headers(init?.headers);
    headers.delete('Authorization');
    return fetch(urlStr, { ...init, headers });
  },
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Converts a File to base64 data URI.
 * Replicate accepts data URIs directly as image parameters.
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
 * Replicate returns temporary URLs — we convert them for consistency.
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
 * Maps AspectRatio to the format accepted by FLUX.2 [max] and FLUX.2 Pro.
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
 * Maps AspectRatio to the Gen-4 Image format.
 * Gen-4 supports: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
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
// FLUX.2 [max] — maximum fidelity, up to 8 refs
// Black Forest Labs model, Jan 2026
// Deployment-style endpoint (no version hash)
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

  // Convert reference images to data URI (up to 8)
  // FLUX.2 [max] uses separate fields: image_prompt, image_prompt_2 ... image_prompt_8
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
      safety_tolerance: 5,  // maximum allowed on Replicate (range 1–5)
      ...(params.seed !== undefined && { seed: params.seed }),
    };

    // FLUX.2 [max] accepts refs as individual fields: image_prompt, image_prompt_2 ... image_prompt_8
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
    throw new Error('FLUX.2 [max] did not return any images. Check your Replicate API key.');
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Runway Gen-4 Image — character + location consistency
// Up to 3 reference images, Jul 2025
// Supports @tagname notation in prompts
// ─────────────────────────────────────────────
export const generateWithGen4Image = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const character = params.characters[0];

  if (!character.modelImages || character.modelImages.length === 0) {
    throw new Error('Gen-4 Image requires at least one model reference photo.');
  }

  if (onProgress) onProgress(10);

  // Gen-4 accepts up to 3 references
  const refFiles = character.modelImages.slice(0, 3);
  const refDataUris = await Promise.all(refFiles.map(fileToDataUri));

  // Create tags for each reference (alphanumeric, 3–15 chars, starts with letter)
  const refTags = refDataUris.map((_, idx) => `model${idx > 0 ? idx + 1 : ''}`);
  // refTags = ["model", "model2", "model3"]

  if (onProgress) onProgress(20);

  // The first tag is the main character — use it in the prompt
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
    throw new Error('Gen-4 Image did not return any images. Check your Replicate API key.');
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// IDM-VTON — Virtual Try-On
// Non-commercial license: CC BY-NC-SA 4.0 (KAIST)
// Places a specific garment onto the person's photo
// Requires: person photo + garment photo + category
// ─────────────────────────────────────────────
export interface VTONParams {
  personImage: File;           // Person photo (ideally 3:4 ratio)
  garmentImage: File;          // Garment photo (product or worn)
  garmentDescription: string;  // Text description of the garment
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
        crop: true,   // Auto-crop if the ratio is not 3:4
        force_dc: false,
        steps: 30,
        seed: 42,
      },
      signal: abortSignal, // Pass abortSignal here
    }
  ) as unknown as string;

  if (!output) {
    throw new Error('IDM-VTON did not return a result. Check the images and try again.');
  }

  if (onProgress) onProgress(90);

  const dataUrl = await urlToDataUrl(output);
  if (onProgress) onProgress(100);
  return dataUrl;
};

// ─────────────────────────────────────────────
// Face Swap — codeplugtech/face-swap (InsightFace / inswapper_128)
// ~1.8M runs · ~$0.003/run · ~28 s
// swap_image = source face · target_image = target photo
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
        swap_image: sourceDataUri,    // face to insert (source)
        target_image: targetDataUri,  // image to apply onto
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

  if (!imageUrl) throw new Error('Face swap: no image received. Check the photos and try again.');

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
 * Maps AspectRatio to the ratios supported by Grok Imagine.
 * Supported: 2:1, 20:9, 19.5:9, 16:9, 4:3, 3:2, 1:1, 2:3, 3:4, 9:16, 9:19.5, 9:20, 1:2
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
    throw new Error('Grok Imagine did not return any images. Check your Replicate API key.');
  }

  const results = await Promise.all(rawUrls.map(urlToDataUrl));
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Main router
// ─────────────────────────────────────────────
// Recraft Crisp Upscale — clarity-preserving upscale
// ─────────────────────────────────────────────
export async function upscaleWithRecraft(
  imageUrl: string,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  onProgress?.(10);
  const output = await replicate.run('recraft-ai/recraft-crisp-upscale' as `${string}/${string}`, {
    input: { image: imageUrl },
  });
  onProgress?.(100);
  // Replicate returns string or string[] depending on model
  return typeof output === 'string' ? output : (output as string[])[0];
}

// ─────────────────────────────────────────────
// Bria Expand — outpaint / expand image borders
// ─────────────────────────────────────────────
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

  // Replicate processes images server-side — blob:// and local URLs are unreachable.
  // Convert to base64 data URI so the SDK can send it inline.
  let image = imageUrl;
  if (!imageUrl.startsWith('http')) {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  onProgress?.(10);
  const output = await replicate.run('bria/expand-image' as `${string}/${string}`, {
    input: { image, ...padding },
  });
  onProgress?.(100);
  return typeof output === 'string' ? output : (output as string[])[0];
}

// ─────────────────────────────────────────────
// Pruna P-Image-Edit — fallback edit engine
// ─────────────────────────────────────────────
export async function editWithPruna(
  imageInput: string | File,
  prompt: string,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
  referenceImage?: File | null,
): Promise<string> {
  onProgress?.(10);
  const image = imageInput instanceof File
    ? await fileToDataUri(imageInput)
    : imageInput;

  // Pruna always expects the `images` array — singular `image` param is not accepted
  const inputParams: Record<string, unknown> = referenceImage
    ? {
        images: [image, await fileToDataUri(referenceImage)],
        prompt,
        reference_image: '1',
        disable_safety_checker: true,
      }
    : {
        images: [image],
        prompt,
        disable_safety_checker: true,
      };

  const output = await replicate.run('prunaai/p-image-edit' as `${string}/${string}`, {
    input: inputParams,
  });
  onProgress?.(100);

  // Replicate SDK can return: string | string[] | FileOutput | FileOutput[] | URL | {output: ...}
  const raw = output as any;

  // Extracts a plain string from any Replicate output type
  const extractUrl = (v: any): string | undefined => {
    if (!v) return undefined;
    if (typeof v === 'string') return v || undefined;
    if (typeof v?.url === 'function') return String(v.url()); // FileOutput.url() → URL obj → string
    if (v instanceof URL) return v.toString();
    const s = String(v);
    return s && s !== '[object Object]' ? s : undefined;
  };

  let result: string | undefined;
  if (Array.isArray(raw)) {
    result = extractUrl(raw[0]);
  } else if (raw?.output) {
    result = extractUrl(Array.isArray(raw.output) ? raw.output[0] : raw.output);
  } else {
    result = extractUrl(raw);
  }

  if (!result) throw new Error(`P-Image-Edit returned empty output (got: ${JSON.stringify(raw)}). Try a different engine.`);
  return result;
}

// ─────────────────────────────────────────────
// FLUX 2 Pro — generation via Replicate
// ─────────────────────────────────────────────
export async function generateWithFlux2Pro(
  params: InfluencerParams,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const prompt = params.scenario || 'a beautiful photo';
  onProgress?.(10);
  const output = await replicate.run('black-forest-labs/flux-2-pro' as `${string}/${string}`, {
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
  return urls.map(u => typeof u === 'string' ? u : (u as any)?.url ?? (u as any)?.href ?? String(u ?? '')).filter(s => typeof s === 'string' && s.startsWith('http'));
}

// ─────────────────────────────────────────────
// FLUX 2 Klein 4B — fast, economical generation
// ─────────────────────────────────────────────
export async function generateWithFlux2Klein(
  params: InfluencerParams,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const prompt = params.scenario || 'a beautiful photo';
  onProgress?.(10);
  const output = await replicate.run('black-forest-labs/flux-2-klein-4b' as `${string}/${string}`, {
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
  return urls.map(u => typeof u === 'string' ? u : (u as any)?.url ?? (u as any)?.href ?? String(u ?? '')).filter(s => typeof s === 'string' && s.startsWith('http'));
}

// ─────────────────────────────────────────────
// Main router
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
      throw new Error('For Virtual Try-On use generateVirtualTryOn() directly.');
    case ReplicateModel.Flux2Pro:
      return generateWithFlux2Pro(params, onProgress, abortSignal);
    case ReplicateModel.Flux2Klein4B:
      return generateWithFlux2Klein(params, onProgress, abortSignal);
    case ReplicateModel.Wan27Image:
    case ReplicateModel.Wan27ImagePro:
      return generateWithWan27(params, model, onProgress, abortSignal);
    default:
      return generateWithFlux2Max(params, onProgress);
  }
};

// ─────────────────────────────────────────────
// Wan 2.7 Image (Pro) — Alibaba
// Text-to-image + multi-ref editing, up to 9 refs, 12 coherent outputs
// Thinking mode for better reasoning on complex prompts
// ─────────────────────────────────────────────

/**
 * Wan 2.7 — direct fetch submit+poll (bypasses SDK FileOutput issues).
 * The Replicate SDK returns FileOutput/ReadableStream objects that don't
 * work well through our proxy. Direct API calls are more reliable.
 */
export async function generateWithWan27(
  params: InfluencerParams,
  model: ReplicateModel.Wan27Image | ReplicateModel.Wan27ImagePro = ReplicateModel.Wan27ImagePro,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const character = params.characters[0];
  const isPro = model === ReplicateModel.Wan27ImagePro;

  const parts: string[] = [];
  if (params.imageBoost) parts.push(params.imageBoost);
  else parts.push('Ultra-photorealistic editorial photograph, natural skin with visible pores and fine texture');
  if (character?.characteristics) parts.push(`Subject: ${character.characteristics}`);
  if (character?.outfitDescription) parts.push(`Wearing: ${character.outfitDescription}`);
  if (character?.pose) parts.push(`Pose: ${character.pose}`);
  if (character?.accessory) parts.push(`With: ${character.accessory}`);
  if (params.scenario) parts.push(`Scene: ${params.scenario}`);
  if (params.lighting) parts.push(`Lighting: ${params.lighting}`);
  if (params.camera) parts.push(`Camera: ${params.camera}`);
  if (params.negativePrompt) parts.push(`Avoid: ${params.negativePrompt}`);
  const prompt = parts.filter(Boolean).join('. ') + '.';

  onProgress?.(10);

  // Upload reference images to HTTP URLs
  const images: string[] = [];
  if (character?.modelImages?.length) {
    const { fal } = await import('@fal-ai/client');
    for (const file of character.modelImages.slice(0, 5)) {
      try { images.push(await fal.storage.upload(file)); } catch { /* skip */ }
    }
  }
  onProgress?.(15);

  const input: Record<string, unknown> = {
    prompt,
    size: isPro ? '2K' : '1K',
    num_outputs: Math.min(params.numberOfImages || 1, isPro ? 12 : 4),
    ...(images.length === 0 && { thinking_mode: isPro }), // only for text-to-image (no images)
    ...(images.length > 0 && { images }),
    ...(params.seed !== undefined && { seed: params.seed }),
  };

  // Submit prediction via direct fetch (not SDK)
  const submitRes = await fetch(`${REPLICATE_PROXY}/v1/models/${model}/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    signal: abortSignal,
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => submitRes.statusText);
    throw new Error(`Wan submit failed (${submitRes.status}): ${errText.slice(0, 200)}`);
  }
  const prediction = await submitRes.json();
  const predictionUrl = prediction.urls?.get;
  if (!predictionUrl) throw new Error('Wan: no prediction URL returned');

  onProgress?.(25);

  // Poll for completion (max 2 min)
  const start = Date.now();
  while (Date.now() - start < 120_000) {
    if (abortSignal?.aborted) throw new Error('Cancelled');
    await new Promise(r => setTimeout(r, 2000));

    const pollRes = await fetch(predictionUrl.replace('https://api.replicate.com', REPLICATE_PROXY), { signal: abortSignal });
    if (!pollRes.ok) continue;

    const status = await pollRes.json();
    const elapsed = (Date.now() - start) / 120_000;
    onProgress?.(Math.min(25 + elapsed * 65, 90));

    if (status.status === 'succeeded') {
      onProgress?.(100);
      const output = status.output;
      if (!output || !Array.isArray(output)) throw new Error('Wan: no output array');
      return output.filter((u: unknown) => typeof u === 'string' && u.startsWith('http'));
    }
    if (status.status === 'failed') throw new Error(`Wan failed: ${status.error || 'unknown'}`);
    if (status.status === 'canceled') throw new Error('Wan: prediction canceled');
  }
  throw new Error('Wan: timed out after 2 minutes');
}

/**
 * Wan 2.7 Pro — image editing with multi-reference (direct fetch, no SDK).
 */
export async function editWithWan27Pro(
  baseImage: File,
  instruction: string,
  referenceImages: File[] = [],
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
  options?: { numOutputs?: number; seed?: number },
): Promise<string[]> {
  onProgress?.(10);
  const { fal } = await import('@fal-ai/client');
  const images: string[] = [];
  images.push(await fal.storage.upload(baseImage));
  for (const ref of referenceImages.slice(0, 8)) {
    try { images.push(await fal.storage.upload(ref)); } catch { /* skip */ }
  }
  onProgress?.(20);

  return wanSubmitAndPoll({
    prompt: instruction,
    images,
    size: '2K',
    num_outputs: options?.numOutputs ?? 1,
    ...(options?.seed !== undefined && { seed: options.seed }),
  }, onProgress, abortSignal);
}

/**
 * Wan 2.7 Pro — batch session generation via image_set_mode (direct fetch, no SDK).
 */
export async function generateSessionWithWan27(
  heroImage: File,
  count: number,
  instruction: string,
  identityRefs: File[] = [],
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  onProgress?.(10);
  const { fal } = await import('@fal-ai/client');
  const images: string[] = [];
  images.push(await fal.storage.upload(heroImage));
  for (const ref of identityRefs.slice(0, 7)) {
    try { images.push(await fal.storage.upload(ref)); } catch { /* skip */ }
  }
  onProgress?.(20);

  return wanSubmitAndPoll({
    prompt: instruction,
    images,
    size: '2K',
    num_outputs: Math.min(Math.max(count, 1), 12),
    image_set_mode: true,
  }, onProgress, abortSignal);
}

/** Shared submit+poll for all Wan 2.7 Pro calls */
async function wanSubmitAndPoll(
  input: Record<string, unknown>,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const submitRes = await fetch(`${REPLICATE_PROXY}/v1/models/${ReplicateModel.Wan27ImagePro}/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    signal: abortSignal,
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => submitRes.statusText);
    throw new Error(`Wan submit failed (${submitRes.status}): ${errText.slice(0, 200)}`);
  }
  const prediction = await submitRes.json();
  const predictionUrl = prediction.urls?.get;
  if (!predictionUrl) throw new Error('Wan: no prediction URL returned');
  onProgress?.(30);

  const start = Date.now();
  while (Date.now() - start < 120_000) {
    if (abortSignal?.aborted) throw new Error('Cancelled');
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(predictionUrl.replace('https://api.replicate.com', REPLICATE_PROXY), { signal: abortSignal });
    if (!pollRes.ok) continue;
    const status = await pollRes.json();
    onProgress?.(Math.min(30 + ((Date.now() - start) / 120_000) * 60, 90));
    if (status.status === 'succeeded') {
      onProgress?.(100);
      if (!status.output || !Array.isArray(status.output)) throw new Error('Wan: no output array');
      return status.output.filter((u: unknown) => typeof u === 'string' && u.startsWith('http'));
    }
    if (status.status === 'failed') throw new Error(`Wan failed: ${status.error || 'unknown'}`);
    if (status.status === 'canceled') throw new Error('Wan: canceled');
  }
  throw new Error('Wan: timed out');
}

/** Helper: File → data URL */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}
