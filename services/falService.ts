import { fal } from '@fal-ai/client';
import { InfluencerParams, FalModel, AspectRatio, PoseModificationParams } from '../types';
import { proxyUrl } from './apiAuth';
import { FACE_LOCK_PROMPT, OUTFIT_PRESERVE_PROMPT, FACE_CHECK_PROMPT } from '../data/sessionPresets';
import { flattenCharacteristics } from '../data/characterChips';
import { compilePrompt } from './promptCompiler';

// ─────────────────────────────────────────────
// Config — API key is injected server-side by the proxy.
// ─────────────────────────────────────────────
fal.config({
  proxyUrl: proxyUrl('fal', '/fal-api'),
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Unwrap FAL SDK result — handles both { data: { images } } and { images } shapes.
 */
const unwrap = (result: any): any => result?.data ?? result ?? {};

/**
 * Converts a File to a base64 data URI for passing to fal.ai.
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
 * Uploads a File to fal.storage and returns the public URL.
 * Required for passing multiple reference images (PuLID SDXL).
 */
const uploadToFalStorage = async (file: File): Promise<string> => {
  return await fal.storage.upload(file);
};

/**
 * Maps the app's AspectRatio to the format accepted by fal.ai.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFalImageSize = (ratio: AspectRatio): any => {
  const map: Record<AspectRatio, string> = {
    [AspectRatio.Square]: 'square_hd',
    [AspectRatio.Portrait]: 'portrait_4_3',
    [AspectRatio.Landscape]: 'landscape_4_3',
    [AspectRatio.Wide]: 'landscape_16_9',
    [AspectRatio.Tall]: 'portrait_16_9',
  };
  return map[ratio] ?? 'portrait_4_3';
};

/**
 * Redimensiona una imagen en el cliente antes de subirla para acelerar el proceso.
 */
const resizeImageForPose = async (file: File, maxWidth = 1024): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.src = objUrl;
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      if (img.width <= maxWidth && img.height <= maxWidth) {
        resolve(file);
        return;
      }

      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
        } else {
          resolve(new File([blob], file.name, { type: file.type || 'image/jpeg' }));
        }
      }, file.type || 'image/jpeg', 0.85);
    };
    img.onerror = (e) => { URL.revokeObjectURL(objUrl); reject(e); };
  });
};

/**
 * Converts a pose photo into an OpenPose skeleton (DWPose).
 * This prevents the model from copying the clothing or face from the original photo.
 */
export const extractPoseSkeleton = async (file: File): Promise<File> => {
  // Resizing before upload drastically reduces upload and processing time
  const optimizedFile = await resizeImageForPose(file, 1024);
  const uploadedUrl = await uploadToFalStorage(optimizedFile);

  const result: any = await fal.subscribe("fal-ai/dwpose", {
    input: {
      image_url: uploadedUrl,
      draw_mode: "full-pose",
      // draw_mode: "full-pose" extracts body, face, and hands.
    },
  });

  const r = unwrap(result);
  const skeletonUrl = r?.image?.url || r?.images?.[0]?.url;
  if (!skeletonUrl) {
    throw new Error('Could not generate the pose skeleton.');
  }

  // Download the resulting image and convert it to a File
  const resp = await fetch(skeletonUrl);
  const blob = await resp.blob();
  return new File([blob], `skeleton-${Date.now()}.png`, { type: blob.type || 'image/png' });
};

// ─────────────────────────────────────────────
// FLUX.2 Pro Edit — multi-reference identity, state of the art (Nov 2025)
// Accepts up to 9 reference photos of the character via image_urls[]
// FLUX.2 backbone with 32B parameters — surpasses FLUX PuLID and PuLID SDXL
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Maps AspectRatio to Kontext Multi's aspect_ratio format
// ─────────────────────────────────────────────
const toKontextAspectRatio = (ratio: AspectRatio): string => {
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
// FLUX.1 Kontext Multi / Kontext Max Multi
// Multi-referencia con consistencia de identidad · 2026
// Mismo schema — solo cambia el endpoint
// ─────────────────────────────────────────────
export const generateWithKontextMulti = async (
  params: InfluencerParams,
  model: FalModel.KontextMulti | FalModel.KontextMaxMulti = FalModel.KontextMulti,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const character = params.characters[0];

  if (abortSignal?.aborted) throw new Error('Cancelado');

  if (!character.modelImages || character.modelImages.length === 0) {
    throw new Error('Kontext Multi requiere al menos una foto de referencia del modelo.');
  }

  if (onProgress) onProgress(10);

  const referenceUrls = await Promise.all(
    character.modelImages.map(f => uploadToFalStorage(f))
  );
  if (onProgress) onProgress(30);

  // ── FLUX Kontext prompt structure (research-backed 2026 best practices):
  // Identity anchor first → what to KEEP (explicit list) → outfit → pose → setting → lighting → camera → quality
  // Key: name subject by specific features, not pronouns. Explicitly list what must NOT change.
  // Reddit r/FluxAI: "88% character consistency" requires anchoring with feature-by-feature identity sheet.
  const subjectAnchor = character.characteristics
    ? `the character described as: ${flattenCharacteristics(character.characteristics)}`
    : 'the exact person shown in the reference images';

  const isKontextStylized = params.realistic === false
  const kontextStylePrefix = isKontextStylized && params.imageBoost
    ? params.imageBoost
    : 'Ultra-photorealistic fashion editorial photograph'

  let prompt = `${kontextStylePrefix} of ${subjectAnchor}. `;
  if (!isKontextStylized) {
    prompt += `IDENTITY LOCKED — preserve without alteration: exact facial bone structure, eye shape and color, nose shape, lip form, skin tone, skin texture, hair color and texture, overall face proportions. Do not idealize, smooth, blend, or reinterpret the face in any way. `;
  }

  // Outfit — be explicit (FLUX Kontext best practice: describe what to change precisely)
  if (character.outfitDescription) {
    prompt += `The person with the reference face is now wearing: ${character.outfitDescription}. `;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += `The person with the reference face is wearing a high-fashion editorial outfit, impeccably styled. `;
  }

  // Pose — FLUX Kontext: explicit body language description works best
  if (character.pose) {
    prompt += `Pose: ${character.pose}. `;
  } else {
    prompt += `Pose: natural confident fashion editorial stance, weight slightly shifted, relaxed shoulders. `;
  }

  // Accessory
  if (character.accessory) {
    prompt += `The person is holding or wearing: ${character.accessory}. `;
  }

  // Setting & lighting — compile through Flash Lite for FLUX-optimized language
  if (params.scenario || params.lighting) {
    const compiledScene = await compilePrompt({
      subjectIntent: params.scenario || 'fashion editorial setting',
      poseLighting: params.lighting,
      targetModel: model as string,
      isRealistic: !!params.realistic,
    });
    prompt += `${compiledScene} `;
  } else {
    prompt += `Lighting: soft directional studio light, slight rim highlight, natural skin tones. `;
  }

  // Camera & quality (FLUX Kontext is trained on DSLR-style data — use specific lens specs)
  if (params.imageBoost && !isKontextStylized) {
    prompt += `Style: ${params.imageBoost}. `;
  } else if (!isKontextStylized) {
    prompt += `Camera: Sony A7R V, 85mm f/1.4 portrait lens, shallow depth of field, RAW. Quality: Vogue / Harper's Bazaar editorial level, natural skin texture with visible pores, realistic hair strands, precise fabric microdetail, no AI artifacts, no plastic skin. `;
  }

  prompt += 'Sharp focus on the face. Preserve identity above all else.';

  const count = params.numberOfImages || 1;

  const result = await fal.subscribe(model as string, {
    input: {
      prompt,
      image_urls: referenceUrls,
      aspect_ratio: toKontextAspectRatio(params.aspectRatio),
      num_images: count,
      safety_tolerance: '6',
      ...(params.guidanceScale !== undefined && { guidance_scale: params.guidanceScale }),
      ...(params.seed !== undefined && { seed: params.seed }),
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(90, 30 + Math.random() * 55));
      }
    },
  }) as any;

  const r = unwrap(result);
  const images: Array<{ url: string }> = r?.images ?? [];
  if (images.length === 0) {
    throw new Error('Kontext Multi did not return any images. Check your API key and parameters.');
  }

  const results: string[] = [];
  for (const img of images) {
    if (img.url) {
      const resp = await fetch(img.url);
      if (!resp.ok) throw new Error(`Error downloading Kontext image (${resp.status}).`);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
      results.push(dataUrl);
    }
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// FLUX Kontext Pro — single/multi-ref identity editing
// Uses fal-ai/flux-kontext-pro endpoint
// ─────────────────────────────────────────────
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
    FACE_LOCK_PROMPT,
    'Keep the EXACT same face, skin tone, hair color and style from the base image.',
    params.characters[0]?.characteristics || '',
    params.scenario || '',
    params.characters[0]?.pose || '',
    params.lighting || '',
    params.camera || '',
    OUTFIT_PRESERVE_PROMPT,
    FACE_CHECK_PROMPT,
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

// ─────────────────────────────────────────────
// FLUX.2 Pro Edit — multi-reference image editor
// Keep for use in the editing panel
// ─────────────────────────────────────────────
export const generateWithFluxKontextMulti = async (
  params: InfluencerParams,
  model: FalModel,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const character = params.characters[0];
  if (!character.modelImages || character.modelImages.length === 0) {
    throw new Error('Kontext Multi requiere al menos una foto de referencia.');
  }

  if (abortSignal?.aborted) throw new Error('Cancelado');

  if (onProgress) onProgress(10);

  const referenceUrls = await Promise.all(
    character.modelImages.slice(0, 9).map(f => uploadToFalStorage(f))
  );
  if (onProgress) onProgress(30);

  let prompt = 'An ultra-photorealistic fashion editorial photograph of the exact person shown in the reference images. The photo is taken with a Sony A7R V camera and an 85mm f/1.4 portrait lens, shot in RAW with Vogue magazine quality.';
  prompt += ' Preserve the exact facial features, skin tone, and identity from the reference photos.';

  if (character.characteristics) prompt += ` The person is described as: ${flattenCharacteristics(character.characteristics)}.`;
  if (character.outfitDescription) {
    prompt += ` They are wearing ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` They are wearing a high-fashion outfit, well-dressed, and stylish.`;
  }
  if (character.pose) {
    prompt += ` Posing: ${character.pose}.`;
  } else {
    prompt += ` Natural, confident fashion editorial stance.`;
  }
  if (character.accessory) prompt += ` Holding: ${character.accessory}.`;
  if (params.scenario) prompt += ` Scene: ${params.scenario}.`;
  if (params.lighting) prompt += ` Lighting: ${params.lighting}.`;
  if (params.imageBoost) prompt += ` Style: ${params.imageBoost}.`;
  prompt += ' Sharp facial detail, natural skin texture, no AI artifacts.';

  const count = params.numberOfImages || 1;
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const result = await fal.subscribe(model as string, {
      input: {
        prompt,
        image_urls: referenceUrls,
        image_size: toFalImageSize(params.aspectRatio),
        safety_tolerance: '5',
        ...(params.seed !== undefined && { seed: params.seed }),
      },
      onQueueUpdate: (update: any) => {
        if (update.status === 'IN_PROGRESS' && onProgress) {
          onProgress(Math.min(90, 30 + (i / count) * 60 + Math.random() * 10));
        }
      },
    }) as any;

    const r = unwrap(result);
    const imageUrl: string = r?.images?.[0]?.url;
    if (imageUrl) {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Error downloading FLUX.2 Pro image (${resp.status}).`);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
      results.push(dataUrl);
    }
  }

  if (results.length === 0) {
    throw new Error('Kontext Multi did not return any images. Check your API key.');
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Seedream 4.5 — ByteDance, fotorrealismo 4K
// Text-to-image de alta calidad, sin referencia de cara
// ─────────────────────────────────────────────
export const generateWithSeedream45 = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  const character = params.characters[0];
  if (onProgress) onProgress(10);

  // ── Seedream 4.5 prompt structure (fal.ai research-backed 2026):
  // Order: style/subject → composition → lighting → technical/camera
  // Optimal length: 30-100 words. Seedream responds strongly to specific lighting vocabulary.
  const seedreamSubject = character.characteristics
    ? `A character described as: ${character.characteristics}`
    : 'A subject';

  const isStylized = params.realistic === false
  const stylePrefix = isStylized && params.imageBoost ? params.imageBoost : 'Ultra-photorealistic editorial photograph'

  let prompt = `${stylePrefix}. ${seedreamSubject}.`;

  if (character.outfitDescription) {
    prompt += ` Wearing: ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` Wearing a high-fashion editorial outfit, impeccably styled.`;
  }

  if (character.pose) {
    prompt += ` ${character.pose}.`;
  } else {
    prompt += ` Natural, confident editorial stance.`;
  }

  if (character.accessory) {
    prompt += ` Holding: ${character.accessory}.`;
  }

  if (params.scenario) {
    prompt += ` Setting: ${params.scenario}.`;
  }

  // Seedream 4.5 is highly responsive to specific lighting cues (fal.ai guide 2026)
  if (params.lighting) {
    prompt += ` Lighting: ${params.lighting}.`;
  } else if (!isStylized) {
    prompt += ` Lighting: soft directional studio light, slight rim highlight, natural skin tones.`;
  }

  // Append imageBoost only when it wasn't already used as the opening prefix
  if (params.imageBoost && !isStylized) {
    prompt += ` ${params.imageBoost}.`;
  }

  if (!isStylized) prompt += ' Shot on Sony A7R V, 85mm f/1.4. Sharp detail, visible skin texture, no artifacts.';
  const count = params.numberOfImages || 1;
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const result = await fal.subscribe(FalModel.Seedream45, {
      input: {
        prompt,
        image_size: toFalImageSize(params.aspectRatio),
        negative_prompt: params.negativePrompt || 'watermark, blurry, low quality, deformed, cartoon',
        num_inference_steps: 28,
        guidance_scale: params.guidanceScale || 4.5,
        ...(params.seed !== undefined && { seed: params.seed }),
        enable_safety_checker: false,
      },
      onQueueUpdate: (update: any) => {
        if (update.status === 'IN_PROGRESS' && onProgress) {
          const base = 20 + (i / count) * 70;
          onProgress(Math.min(90, base + Math.random() * 8));
        }
      },
    }) as any;

    const r = unwrap(result);
    const imageUrl: string = r?.images?.[0]?.url;
    if (imageUrl) {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
      results.push(dataUrl);
    }
  }

  if (results.length === 0) throw new Error('Seedream 4.5 did not return any images.');
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Seedream 5.0 Lite — ByteDance, web search + reasoning, 2K
// Next-gen text-to-image, no face reference
// ─────────────────────────────────────────────
export const generateWithSeedream50 = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const character = params.characters[0];
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  // ── Seedream 5.0 prompt structure (fal.ai research-backed 2026):
  // Same structure as 4.5: style/subject → composition → lighting → camera
  // Seedream responds strongly to specific lighting vocabulary.
  const seedreamSubject50 = character.characteristics
    ? `A character described as: ${character.characteristics}`
    : 'A subject';

  const isStylized50 = params.realistic === false
  const stylePrefix50 = isStylized50 && params.imageBoost ? params.imageBoost : 'Ultra-photorealistic editorial photograph'

  let prompt = `${stylePrefix50}. ${seedreamSubject50}.`;

  if (character.outfitDescription) {
    prompt += ` Wearing: ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` Wearing a high-fashion editorial outfit, impeccably styled.`;
  }

  if (character.pose) {
    prompt += ` ${character.pose}.`;
  } else {
    prompt += ` Natural, confident editorial stance.`;
  }

  if (character.accessory) {
    prompt += ` Holding: ${character.accessory}.`;
  }

  if (params.scenario) {
    prompt += ` Setting: ${params.scenario}.`;
  }

  if (params.lighting) {
    prompt += ` Lighting: ${params.lighting}.`;
  } else if (!isStylized50) {
    prompt += ` Lighting: soft directional studio light, slight rim highlight, natural skin tones.`;
  }

  if (params.imageBoost && !isStylized50) {
    prompt += ` ${params.imageBoost}.`;
  }

  if (!isStylized50) prompt += ' Shot on Sony A7R V, 85mm f/1.4. Natural skin with visible pores, fine hair texture, subtle imperfections, micro-freckles. Avoid plastic, airbrushed, or CGI skin. Real human skin luminosity and subsurface scattering.';
  const count = params.numberOfImages || 1;
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const result = await fal.subscribe(FalModel.Seedream50, {
      input: {
        prompt,
        image_size: toFalImageSize(params.aspectRatio),
        num_images: 1,
        enable_safety_checker: false,
        ...(params.guidanceScale !== undefined && { guidance_scale: params.guidanceScale }),
        ...(params.seed !== undefined && { seed: params.seed }),
      },
      onQueueUpdate: (update: any) => {
        if (update.status === 'IN_PROGRESS' && onProgress) {
          const base = 20 + (i / count) * 70;
          onProgress(Math.min(90, base + Math.random() * 8));
        }
      },
    }) as any;

    const r = unwrap(result);
    const imageUrl: string = r?.images?.[0]?.url;
    if (!imageUrl) {
      // If no image URL, check for NSFW concepts
      if (r?.has_nsfw_concepts?.[0]) {
        throw new Error('Seedream 5.0 filtered the content. Try a more neutral prompt.');
      }
      throw new Error('Seedream 5.0 did not return any images.');
    }

    const resp = await fetch(imageUrl);
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.readAsDataURL(blob);
    });
    results.push(dataUrl);
  }

  if (results.length === 0) throw new Error('Seedream 5.0 did not return any images.');
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Leffa Pose Transfer — changes pose via reference image
// Auto-extracts DWPose skeleton to avoid face/clothing leakage
// Preserva cara, ropa y piel del modelo original
// ─────────────────────────────────────────────
export const poseTransferWithLeffa = async (
  params: PoseModificationParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (!params.poseImages || params.poseImages.length === 0) {
    throw new Error('Leffa requires at least one pose reference image.');
  }

  if (onProgress) onProgress(5);

  // Step 1: Extract DWPose skeleton from the reference image
  // → prevents the reference model's face/clothing from "leaking" into the result
  let skeletonFile: File;
  try {
    skeletonFile = await extractPoseSkeleton(params.poseImages[0]);
    if (onProgress) onProgress(20);
  } catch {
    // If skeleton extraction fails, use the original image as fallback
    console.warn('⚠️ Could not extract skeleton — using reference image directly');
    skeletonFile = params.poseImages[0];
    if (onProgress) onProgress(20);
  }

  // Step 2: Upload person and pose image in parallel
  const [personUrl, poseUrl] = await Promise.all([
    uploadToFalStorage(params.baseImage),
    uploadToFalStorage(skeletonFile),
  ]);

  if (onProgress) onProgress(40);

  const result = await fal.subscribe('fal-ai/leffa/pose-transfer', {
    input: {
      person_image_url: personUrl,
      pose_image_url: poseUrl,
      num_inference_steps: 50,
      guidance_scale: params.guidanceScale || 3.5,
      ...(params.seed !== undefined && { seed: params.seed }),
      enable_safety_checker: false,
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 45 + Math.random() * 40));
      }
    },
  }) as any;

  const r = unwrap(result);
  const imageUrl: string = r?.image?.url || r?.images?.[0]?.url;
  if (!imageUrl) throw new Error('Leffa did not return any images.');

  if (onProgress) onProgress(92);
  const resp = await fetch(imageUrl);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((res) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

// ─────────────────────────────────────────────
// FLUX Kontext Pro — changes pose via text instruction
// Preserva cara, ropa y piel con solo texto descriptivo
// ─────────────────────────────────────────────
export const poseEditWithFluxKontext = async (
  params: PoseModificationParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (!params.pose) {
    throw new Error('FLUX Kontext requires a text description of the pose.');
  }
  if (abortSignal?.aborted) throw new Error('Cancelado');

  if (onProgress) onProgress(10);
  const personUrl = await uploadToFalStorage(params.baseImage);
  if (onProgress) onProgress(25);

  // Detailed prompt as an affirmative image description (FLUX works better with captions, not instructions)
  const promptInstruction = [
    `The exact same person from the input image, preserving the original art style, medium, and aesthetic.`,
    `They are posing in the following way: ${params.pose}.`,
    `The person retains their exact facial features, skin tone, hair style, and identity.`,
    `They are wearing the exact same outfit from the input image.`,
    `The background, setting, lighting, and camera angle are identical to the input image.`,
    params.accessory ? `They are holding or interacting with: ${params.accessory}.` : '',
  ].filter(Boolean).join(' ');

  const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      image_url: personUrl,
      prompt: promptInstruction,
      guidance_scale: params.guidanceScale || 3.5,
      ...(params.seed !== undefined && { seed: params.seed }),
      safety_tolerance: '6',
      enhance_prompt: false,
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 25 + Math.random() * 55));
      }
    },
  }) as any;

  const r = unwrap(result);
  if (r?.has_nsfw_concepts?.[0]) {
    throw new Error('FLUX Kontext filtered the content. Try a more neutral instruction or use Gemini AI Edit.');
  }

  const imageUrl: string = r?.images?.[0]?.url;
  if (!imageUrl) throw new Error('FLUX Kontext did not return any images.');

  if (onProgress) onProgress(90);
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Error downloading FLUX Kontext image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((res) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

// ─────────────────────────────────────────────
// Pose editing router for fal.ai
// → If sessionPoses exist: process each pose separately (batch)
// → If reference image exists: Leffa Pose Transfer (with auto-skeleton DWPose)
// → Si solo hay texto: FLUX Kontext Pro
// ─────────────────────────────────────────────
export const editPoseWithFal = async (
  params: PoseModificationParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  // Batch de sessionPoses: iterar cada pose individualmente
  if (params.sessionPoses && params.sessionPoses.length > 0) {
    const total = params.sessionPoses.length;
    const results: string[] = [];

    for (let i = 0; i < total; i++) {
      const session = params.sessionPoses[i];
      const sessionProgress = onProgress
        ? (p: number) => onProgress(Math.round((i / total + p / 100 / total) * 100))
        : undefined;

      const sessionParams: PoseModificationParams = {
        ...params,
        pose: session.text,
        poseImages: session.images,
        accessory: session.accessory,
        accessoryImages: session.accessoryImages || [],
      };

      const hasPoseImg = session.images && session.images.length > 0;
      const urls = hasPoseImg
        ? await poseTransferWithLeffa(sessionParams, sessionProgress, abortSignal)
        : await poseEditWithFluxKontext(sessionParams, sessionProgress, abortSignal);

      results.push(...urls);
    }

    if (onProgress) onProgress(100);
    return results;
  }

  // Llamada simple (sin batch)
  const hasPoseImage = params.poseImages && params.poseImages.length > 0;
  if (hasPoseImage) {
    return poseTransferWithLeffa(params, onProgress, abortSignal);
  }
  return poseEditWithFluxKontext(params, onProgress, abortSignal);
};

// ─────────────────────────────────────────────
// AuraSR — high quality 4× upscaling
// Ideal for upscaling generated fashion/portrait images
// ─────────────────────────────────────────────
export const upscaleWithAuraSR = async (
  imageDataUrl: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  // If data URL, convert to File and upload to fal storage
  let uploadUrl: string;
  if (imageDataUrl.startsWith('data:') || imageDataUrl.startsWith('blob:')) {
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const file = new File([blob], `upscale-input-${Date.now()}.png`, { type: blob.type || 'image/png' });
    uploadUrl = await uploadToFalStorage(file);
  } else {
    // URL remota directa
    uploadUrl = imageDataUrl;
  }

  if (onProgress) onProgress(30);

  const result = await fal.subscribe('fal-ai/aura-sr', {
    input: {
      image_url: uploadUrl,
      upscaling_factor: 4 as any,
      overlapping_tiles: true,
      checkpoint: 'v2',
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 30 + Math.random() * 50));
      }
    },
  }) as any;

  const r = unwrap(result);
  const resultUrl: string = r?.image?.url;
  if (!resultUrl) throw new Error('AuraSR did not return any images.');

  if (onProgress) onProgress(92);
  const resp = await fetch(resultUrl);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return dataUrl;
};

// ─────────────────────────────────────────────
// FLUX Kontext Pro — image editing via text instruction (AI Edit mode)
// Generic version for "Edit with AI" mode
// ─────────────────────────────────────────────
export const editImageWithFluxKontext = async (
  baseImage: File,
  instruction: string,
  onProgress?: (percent: number) => void,
  options?: { guidanceScale?: number; seed?: number },
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (!instruction.trim()) {
    throw new Error('FLUX Kontext requires an editing instruction.');
  }

  if (onProgress) onProgress(10);
  const imageUrl = await uploadToFalStorage(baseImage);
  if (onProgress) onProgress(28);

  const instructionCaption = [
    `The exact same person from the input image, preserving the original art style, medium, and aesthetic.`,
    `They retain their exact facial features, skin tone, hair style, and identity.`,
    `The scene and person feature the following details: ${instruction}.`,
    `The background, setting, lighting, and camera angle remain consistent with the input image unless specified otherwise.`,
  ].join(' ');

  const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      image_url: imageUrl,
      prompt: instructionCaption,
      guidance_scale: options?.guidanceScale || 3.5,
      ...(options?.seed !== undefined && { seed: options.seed }),
      safety_tolerance: '6',
      enhance_prompt: false,
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 28 + Math.random() * 55));
      }
    },
  }) as any;

  const r = unwrap(result);
  if (r?.has_nsfw_concepts?.[0]) {
    throw new Error('FLUX Kontext filtered the content. Try a more neutral instruction or use Gemini AI Edit.');
  }

  const resultUrl: string = r?.images?.[0]?.url;
  if (!resultUrl) throw new Error('FLUX Kontext did not return any images.');

  if (onProgress) onProgress(92);
  const resp = await fetch(resultUrl);
  if (!resp.ok) throw new Error(`Error downloading FLUX Kontext image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

// ─────────────────────────────────────────────
// Remove Background — fal-ai/birefnet
// Returns transparent PNG as data URL
// ─────────────────────────────────────────────
export const removeBackground = async (
  imageUrl: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  // If it's a local data URL, upload to fal storage first
  let inputUrl = imageUrl;
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    const resp = await fetch(imageUrl);
    const blob = await resp.blob();
    const file = new File([blob], `img-${Date.now()}.png`, { type: blob.type || 'image/png' });
    inputUrl = await uploadToFalStorage(file);
  }

  if (onProgress) onProgress(30);

  const result: any = await fal.subscribe('fal-ai/birefnet', {
    input: {
      image_url: inputUrl,
      model: 'General Use (Light)' as any,
      operating_resolution: '1024x1024',
    } as any,
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 40 + Math.random() * 40));
      }
    },
  });

  const r = unwrap(result);
  const outputUrl: string = r?.image?.url || r?.images?.[0]?.url;
  if (!outputUrl) throw new Error('Remove background: no output returned.');

  if (onProgress) onProgress(90);
  const respOut = await fetch(outputUrl);
  const blobOut = await respOut.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blobOut);
  });
  if (onProgress) onProgress(100);
  return dataUrl;
};

// ─────────────────────────────────────────────
// Inpaint Image — fal-ai/flux-pro/inpainting
// imageFile = original, maskFile = B&W mask (white = inpaint, black = keep)
// ─────────────────────────────────────────────
export const inpaintImage = async (
  imageFile: File,
  maskFile: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  const [imageUrl, maskUrl] = await Promise.all([
    uploadToFalStorage(imageFile),
    uploadToFalStorage(maskFile),
  ]);

  if (onProgress) onProgress(30);

  const result: any = await fal.subscribe('fal-ai/flux-pro/inpainting', {
    input: {
      image_url: imageUrl,
      mask_url: maskUrl,
      prompt,
      guidance_scale: 3.5,
      num_inference_steps: 28,
      strength: 0.99,
      num_images: 1,
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 35 + Math.random() * 50));
      }
    },
  });

  const r = unwrap(result);
  if (r?.has_nsfw_concepts?.[0]) {
    throw new Error('FLUX Inpaint filtered the content. Try a more neutral instruction.');
  }

  const outputUrl: string = r?.images?.[0]?.url || r?.image?.url;
  if (!outputUrl) throw new Error('Inpaint: no output returned.');

  if (onProgress) onProgress(90);
  const resp = await fetch(outputUrl);
  if (!resp.ok) throw new Error(`Error downloading Inpaint image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  if (onProgress) onProgress(100);
  return dataUrl;
};

// ─────────────────────────────────────────────
// Seedream 5.0 Lite Edit — multimodal editing with up to 10 images
// Images are referenced in the prompt as "Figure 1", "Figure 2", etc.
// Figure 1 = imagen base, Figure 2+ = referencias adicionales
// ─────────────────────────────────────────────
export const editImageWithSeedream5 = async (
  baseImage: File,
  instruction: string,
  referenceImages: File[],
  onProgress?: (percent: number) => void,
  options?: { guidanceScale?: number; seed?: number },
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (!instruction.trim()) {
    throw new Error('Seedream 5 Edit requires an editing instruction.');
  }

  if (onProgress) onProgress(10);

  // Upload base image + references in parallel (max 10 total)
  const allImages = [baseImage, ...referenceImages.slice(0, 9)];
  const imageUrls = await Promise.all(allImages.map(f => uploadToFalStorage(f)));

  if (onProgress) onProgress(35);

  const result = await fal.subscribe('fal-ai/bytedance/seedream/v5/lite/edit', {
    input: {
      prompt: instruction,
      image_urls: imageUrls,
      image_size: 'auto_2K',
      enable_safety_checker: false,
      ...(options?.guidanceScale !== undefined && { guidance_scale: options.guidanceScale }),
      ...(options?.seed !== undefined && { seed: options.seed }),
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 40 + Math.random() * 45));
      }
    },
  }) as any;

  const r = unwrap(result);
  const imageUrl: string = r?.images?.[0]?.url;
  if (!imageUrl) throw new Error('Seedream 5 Edit did not return any images.');

  if (onProgress) onProgress(92);
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Error downloading Seedream 5 Edit image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

// ─────────────────────────────────────────────
// FLUX.2 Pro Edit — AI editor with multiple references
// fal-ai/flux-2-pro/edit · image_urls[]
// ─────────────────────────────────────────────
export const editImageWithFlux2Pro = async (
  baseImage: File,
  instruction: string,
  referenceImages: File[],
  onProgress?: (percent: number) => void,
  options?: { seed?: number },
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (!instruction.trim()) {
    throw new Error('FLUX.2 Pro Edit requires an editing instruction.');
  }

  if (onProgress) onProgress(10);

  // Base image goes first; then references (max 9 additional)
  const allImages = [baseImage, ...referenceImages.slice(0, 9)];
  const imageUrls = await Promise.all(allImages.map(f => uploadToFalStorage(f)));

  if (onProgress) onProgress(35);

  // FLUX.2 Pro Edit uses @image1, @image2... syntax to reference images.
  // It does NOT support negative prompts — rephrase as positive descriptions.
  // Strip "Avoid:", "NO ", "NEVER" and rephrase.
  let fluxPrompt = instruction
    .replace(/\bAvoid:\s*[^.]*\./gi, '')
    .replace(/\bNO\s+\w[^.,]*[.,]/gi, '')
    .replace(/\bNEVER\s+\w[^.,]*[.,]/gi, '')
    .trim();

  // Add @image references if not already present
  if (!fluxPrompt.includes('@image')) {
    const refs: string[] = ['@image1 is the base image to edit'];
    for (let i = 1; i < imageUrls.length; i++) {
      refs.push(`@image${i + 1} is identity/style reference ${i}`);
    }
    fluxPrompt = `${refs.join('. ')}. ${fluxPrompt}`;
  }

  const result = await fal.subscribe(FalModel.Flux2Pro, {
    input: {
      prompt: fluxPrompt,
      image_urls: imageUrls,
      safety_tolerance: '5',
      ...(options?.seed !== undefined && { seed: options.seed }),
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 40 + Math.random() * 45));
      }
    },
  }) as any;

  const r = unwrap(result);
  const imageUrl: string = r?.images?.[0]?.url;
  if (!imageUrl) throw new Error('FLUX.2 Pro Edit did not return any images.');

  if (onProgress) onProgress(92);
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Error downloading FLUX.2 Pro Edit image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

// ─────────────────────────────────────────────
// PuLID v2 — face-locked photo-realistic identity generation
// Accepts a face reference image via face_image_url
// ─────────────────────────────────────────────
export const generateWithPulidV2 = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  const character = params.characters[0];
  if (onProgress) onProgress(10);

  let faceUrl: string | undefined;
  if (character.modelImages && character.modelImages.length > 0) {
    faceUrl = await uploadToFalStorage(character.modelImages[0]);
  }
  if (onProgress) onProgress(30);

  let prompt = 'Ultra-photorealistic editorial photograph of the exact person shown in the face reference.';
  if (character.characteristics) prompt += ` The person is described as: ${flattenCharacteristics(character.characteristics)}.`;
  if (character.outfitDescription) {
    prompt += ` Wearing: ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` Wearing a high-fashion editorial outfit, impeccably styled.`;
  }
  if (character.pose) {
    prompt += ` ${character.pose}.`;
  } else {
    prompt += ` Natural, confident editorial stance.`;
  }
  if (character.accessory) prompt += ` Holding: ${character.accessory}.`;
  if (params.scenario) prompt += ` Setting: ${params.scenario}.`;
  if (params.lighting) {
    prompt += ` Lighting: ${params.lighting}.`;
  } else {
    prompt += ` Lighting: soft directional studio light, slight rim highlight, natural skin tones.`;
  }
  if (params.imageBoost) prompt += ` ${params.imageBoost}.`;
  prompt += ' Sharp detail, visible skin texture, no artifacts.';

  const count = params.numberOfImages || 1;
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const result = await fal.subscribe(FalModel.PulidV2, {
      input: {
        ...(faceUrl ? { face_image_url: faceUrl } : {}),
        prompt,
        image_size: toFalImageSize(params.aspectRatio),
        num_images: 1,
        enable_safety_checker: false,
        ...(params.guidanceScale !== undefined && { guidance_scale: params.guidanceScale }),
        ...(params.seed !== undefined && { seed: params.seed }),
      },
      onQueueUpdate: (update: any) => {
        if (update.status === 'IN_PROGRESS' && onProgress) {
          const base = 30 + (i / count) * 60;
          onProgress(Math.min(90, base + Math.random() * 8));
        }
      },
    }) as any;

    const r = unwrap(result);
    const imageUrl: string = r?.images?.[0]?.url;
    if (imageUrl) {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Error downloading PuLID v2 image (${resp.status}).`);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
      results.push(dataUrl);
    }
  }

  if (results.length === 0) throw new Error('PuLID v2 did not return any images.');
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// FLUX Pro — state-of-the-art reference-guided generation
// Accepts a reference image via image_url
// ─────────────────────────────────────────────
export const generateWithFluxPro = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  const character = params.characters[0];
  if (onProgress) onProgress(10);

  let refUrl: string | undefined;
  if (character.modelImages && character.modelImages.length > 0) {
    refUrl = await uploadToFalStorage(character.modelImages[0]);
  }
  if (onProgress) onProgress(30);

  let prompt = 'Ultra-photorealistic editorial photograph. Preserve the exact identity, facial features, and skin tone from the reference image.';
  if (character.characteristics) prompt += ` The person is described as: ${flattenCharacteristics(character.characteristics)}.`;
  if (character.outfitDescription) {
    prompt += ` Wearing: ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` Wearing a high-fashion editorial outfit, impeccably styled.`;
  }
  if (character.pose) {
    prompt += ` ${character.pose}.`;
  } else {
    prompt += ` Natural, confident editorial stance.`;
  }
  if (character.accessory) prompt += ` Holding: ${character.accessory}.`;
  if (params.scenario) prompt += ` Setting: ${params.scenario}.`;
  if (params.lighting) {
    prompt += ` Lighting: ${params.lighting}.`;
  } else {
    prompt += ` Lighting: soft directional studio light, slight rim highlight, natural skin tones.`;
  }
  if (params.imageBoost) prompt += ` ${params.imageBoost}.`;
  prompt += ' Shot on Sony A7R V, 85mm f/1.4. Sharp detail, visible skin texture, no artifacts.';

  const count = params.numberOfImages || 1;
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const result = await fal.subscribe(FalModel.FluxPro, {
      input: {
        ...(refUrl ? { image_url: refUrl } : {}),
        prompt,
        image_size: toFalImageSize(params.aspectRatio),
        num_images: 1,
        enable_safety_checker: false,
        ...(params.guidanceScale !== undefined && { guidance_scale: params.guidanceScale }),
        ...(params.seed !== undefined && { seed: params.seed }),
      },
      onQueueUpdate: (update: any) => {
        if (update.status === 'IN_PROGRESS' && onProgress) {
          const base = 30 + (i / count) * 60;
          onProgress(Math.min(90, base + Math.random() * 8));
        }
      },
    }) as any;

    const r = unwrap(result);
    const imageUrl: string = r?.images?.[0]?.url;
    if (imageUrl) {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Error downloading FLUX Pro image (${resp.status}).`);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
      results.push(dataUrl);
    }
  }

  if (results.length === 0) throw new Error('FLUX Pro did not return any images.');
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// FLUX.2 Pro — text-to-image via fal.ai (JSON structured prompts)
// ─────────────────────────────────────────────

export const generateWithFlux2ProFal = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  const character = params.characters[0];
  if (onProgress) onProgress(10);

  // Extract clean subject description (strip NB2 JSON spec)
  let subjectDesc = character?.characteristics || '';
  const flatMatch = subjectDesc.match(/FLAT DESCRIPTION:\s*(.+?)(?:\n|$)/g);
  if (flatMatch) subjectDesc = flatMatch.map(m => m.replace('FLAT DESCRIPTION:', '').trim()).join(', ');

  // Build JSON structured prompt (FLUX excels at this format)
  const jsonPrompt = JSON.stringify({
    scene: params.scenario || 'Professional photography studio, clean neutral background',
    subjects: [{
      type: 'fashion model',
      description: subjectDesc || 'a person',
      outfit: character?.outfitDescription || 'stylish editorial outfit',
      pose: character?.pose || 'Standing casual, facing camera',
      accessories: character?.accessory || undefined,
    }],
    style: params.imageBoost || 'Ultra-photorealistic editorial photograph, natural skin with visible pores, fine detail',
    lighting: params.lighting || 'Soft directional studio light, natural skin tones',
    mood: 'Confident, editorial, striking',
    camera: { angle: 'eye level', distance: 'medium shot', lens: '85mm f/1.4' },
  });

  if (onProgress) onProgress(20);

  const result = await fal.subscribe(FalModel.Flux2ProGen, {
    input: {
      prompt: jsonPrompt,
      image_size: toFalImageSize(params.aspectRatio),
      safety_tolerance: '5',
      enable_safety_checker: false,
      output_format: 'jpeg',
      ...(params.seed !== undefined && { seed: params.seed }),
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 25 + Math.random() * 60));
      }
    },
  }) as any;

  const r = unwrap(result);
  const images = r?.images || [];
  if (images.length === 0) throw new Error('FLUX.2 Pro did not return any images.');

  const urls: string[] = [];
  for (const img of images) {
    const url = img?.url;
    if (url && typeof url === 'string') urls.push(url);
  }

  if (urls.length === 0) throw new Error('FLUX.2 Pro: no valid URLs in response.');
  if (onProgress) onProgress(100);
  return urls;
};

// ─────────────────────────────────────────────
// Wan 2.7 Pro — text-to-image via fal.ai
// ─────────────────────────────────────────────

export const generateWithWan27Fal = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  const character = params.characters[0];
  if (onProgress) onProgress(10);

  // Build natural-language prompt (Wan excels with vivid descriptions)
  let subjectDesc = character?.characteristics || '';
  const flatMatch = subjectDesc.match(/FLAT DESCRIPTION:\s*(.+?)(?:\n|$)/g);
  if (flatMatch) subjectDesc = flatMatch.map(m => m.replace('FLAT DESCRIPTION:', '').trim()).join(', ');
  // Strip render style prefixes and camera jargon
  subjectDesc = subjectDesc
    .replace(/Ultra-photorealistic digital human[^,]*/gi, '')
    .replace(/Premium anime character[^,]*/gi, '')
    .replace(/AAA game-quality[^,]*/gi, '')
    .replace(/shot on [^,.]*/gi, '')
    .replace(/Phase One[^,.]*/gi, '')
    .replace(/,{2,}/g, ',').replace(/^\s*,\s*/, '').trim();

  const parts: string[] = [];
  if (params.imageBoost) parts.push(params.imageBoost);
  else parts.push('High-end fashion editorial photograph, Vogue magazine quality, striking and bold, natural skin texture with visible pores');
  if (subjectDesc) parts.push(subjectDesc);
  if (character?.outfitDescription) parts.push(`Wearing ${character.outfitDescription}`);
  if (character?.pose) parts.push(character.pose);
  if (character?.accessory) parts.push(`With ${character.accessory}`);
  if (params.scenario) {
    parts.push(params.scenario.replace(/shot on [^,.]*/gi, '').replace(/Profoto[^,.]*/gi, '').trim());
  }
  if (params.lighting) parts.push(params.lighting);
  const prompt = parts.filter(Boolean).join('. ').replace(/\.\s*\./g, '.').trim() + '.';

  const negativePrompt = params.negativePrompt || '';

  if (onProgress) onProgress(20);

  const result = await fal.subscribe(FalModel.Wan27ProGen, {
    input: {
      prompt,
      negative_prompt: negativePrompt,
      image_size: toFalImageSize(params.aspectRatio),
      enable_safety_checker: false,
      enable_output_safety_checker: false,
      guidance_scale: 3.5,
      num_inference_steps: 40,
      image_format: 'jpeg',
      ...(params.seed !== undefined && { seed: params.seed }),
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) onProgress(Math.min(88, 25 + Math.random() * 60));
    },
  }) as any;

  const r = unwrap(result);
  const images = r?.images || [];
  const urls = images.map((img: any) => img?.url).filter((u: string) => typeof u === 'string' && u.startsWith('http'));
  if (urls.length === 0) throw new Error('Wan 2.7 Pro did not return any images.');
  if (onProgress) onProgress(100);
  return urls;
};

// ─────────────────────────────────────────────
// Grok Imagine — text-to-image via fal.ai (xAI, permissive)
// ─────────────────────────────────────────────

export const generateWithGrokFal = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  const character = params.characters[0];
  if (onProgress) onProgress(10);

  // Build descriptive prompt — Grok is permissive, vivid descriptions work well
  const parts: string[] = [];
  if (params.imageBoost) parts.push(params.imageBoost);
  else parts.push('Ultra-photorealistic fashion editorial, striking and bold, Vogue quality');
  if (character?.characteristics) {
    const flat = character.characteristics.match(/FLAT DESCRIPTION:\s*(.+?)(?:\n|$)/g);
    parts.push(flat ? flat.map(m => m.replace('FLAT DESCRIPTION:', '').trim()).join(', ') : character.characteristics);
  }
  if (character?.outfitDescription) parts.push(`Wearing ${character.outfitDescription}`);
  if (character?.pose) parts.push(character.pose);
  if (character?.accessory) parts.push(`With ${character.accessory}`);
  if (params.scenario) parts.push(params.scenario);
  if (params.lighting) parts.push(params.lighting);
  if (params.negativePrompt) parts.push(`Avoid: ${params.negativePrompt}`);
  const prompt = parts.filter(Boolean).join('. ') + '.';

  if (onProgress) onProgress(20);

  const toGrokAR = (ar: AspectRatio): string => {
    const map: Record<string, string> = { [AspectRatio.Portrait]: '3:4', [AspectRatio.Square]: '1:1', [AspectRatio.Landscape]: '4:3', [AspectRatio.Wide]: '16:9', [AspectRatio.Tall]: '9:16' };
    return map[ar] ?? '1:1';
  };

  const result = await fal.subscribe(FalModel.GrokImagineGen, {
    input: {
      prompt,
      num_images: params.numberOfImages || 1,
      aspect_ratio: toGrokAR(params.aspectRatio),
      output_format: 'jpeg',
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) onProgress(Math.min(88, 25 + Math.random() * 60));
    },
  }) as any;

  const r = unwrap(result);
  const images = r?.images || [];
  const urls = images.map((img: any) => img?.url).filter((u: string) => typeof u === 'string' && u.startsWith('http'));
  if (urls.length === 0) throw new Error('Grok Imagine did not return any images.');
  if (onProgress) onProgress(100);
  return urls;
};

// ─────────────────────────────────────────────
// Wan 2.7 (Pro) Edit — image editing via fal.ai
// ─────────────────────────────────────────────

export const editWithWan27Fal = async (
  baseImage: File,
  instruction: string,
  referenceImages: File[] = [],
  onProgress?: (percent: number) => void,
  options?: { pro?: boolean; guidanceScale?: number; seed?: number },
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  const allImages = [baseImage, ...referenceImages.slice(0, 8)];
  const imageUrls = await Promise.all(allImages.map(f => uploadToFalStorage(f)));
  if (onProgress) onProgress(30);

  const model = options?.pro ? FalModel.Wan27ProEdit : FalModel.Wan27Edit;

  const result = await fal.subscribe(model, {
    input: {
      prompt: instruction,
      image_urls: imageUrls,
      image_size: 'square_hd',
      enable_safety_checker: false,
      enable_output_safety_checker: false,
      guidance_scale: options?.guidanceScale ?? 3.5,
      ...(options?.seed !== undefined && { seed: options.seed }),
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) onProgress(Math.min(88, 35 + Math.random() * 50));
    },
  }) as any;

  const r = unwrap(result);
  const imageUrl: string = r?.images?.[0]?.url;
  if (!imageUrl) throw new Error('Wan 2.7 Edit did not return any images.');
  if (onProgress) onProgress(100);
  return [imageUrl];
};

// ─────────────────────────────────────────────
// Main router — selects the fal model based on configuration
// ─────────────────────────────────────────────
export const generateWithFal = async (
  params: InfluencerParams,
  model: FalModel = FalModel.KontextMulti,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  switch (model) {
    case FalModel.KontextMulti:
      return generateWithKontextMulti(params, FalModel.KontextMulti, onProgress, abortSignal);
    case FalModel.KontextMaxMulti:
      return generateWithKontextMulti(params, FalModel.KontextMaxMulti, onProgress, abortSignal);
    case FalModel.Flux2Pro:
      // generateWithFlux2Pro doesn't exist anymore, it's contexts multi
      return generateWithFluxKontextMulti(params, FalModel.Flux2Pro, onProgress, abortSignal);
    case FalModel.Seedream45:
      return generateWithSeedream45(params, onProgress);
    case FalModel.Seedream50:
      return generateWithSeedream50(params, onProgress);
    case FalModel.PulidV2:
      return generateWithPulidV2(params, onProgress, abortSignal);
    case FalModel.FluxPro:
      return generateWithFluxPro(params, onProgress, abortSignal);
    case FalModel.Flux2ProGen:
      return generateWithFlux2ProFal(params, onProgress, abortSignal);
    case FalModel.GrokImagineGen:
      return generateWithGrokFal(params, onProgress, abortSignal);
    case FalModel.Wan27ProGen:
      return generateWithWan27Fal(params, onProgress, abortSignal);
    default:
      return generateWithKontextMulti(params, FalModel.KontextMulti, onProgress);
  }
};

// ─────────────────────────────────────────────
// Video Generation — Kling Motion Control via fal.ai
// ─────────────────────────────────────────────
export const generateVideoWithKling = async (
  params: import('../types').VideoParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');

  const { VideoEngine } = await import('../types');

  if (!params.baseImage) {
    throw new Error('Kling requiere una imagen base (image-to-video).');
  }

  if (onProgress) onProgress(10);

  const imageUrl = await uploadToFalStorage(params.baseImage);
  let referenceVideoUrl = undefined;

  if (onProgress) onProgress(25);

  if (params.referenceVideo) {
    referenceVideoUrl = await uploadToFalStorage(params.referenceVideo);
  }

  if (onProgress) onProgress(40);

  // Route to the correct Kling endpoint based on engine
  const engineEndpoints: Record<string, string> = {
    [VideoEngine.Kling26Standard]: 'fal-ai/kling-video/v2.6/standard/image-to-video',
    [VideoEngine.Kling26Pro]: 'fal-ai/kling-video/v2.6/pro/image-to-video',
    [VideoEngine.Kling3Pro]: 'fal-ai/kling-video/v3/pro/image-to-video',
  };
  const endpoint = engineEndpoints[params.engine ?? VideoEngine.Kling26Pro]
    ?? 'fal-ai/kling-video/v2.6/pro/image-to-video';

  const result = await fal.subscribe(endpoint, {
    input: {
      prompt: params.prompt,
      start_image_url: imageUrl,
      duration: '5',
      ...(referenceVideoUrl && { reference_video_url: referenceVideoUrl })
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(90, 40 + Math.random() * 50));
      }
    },
  }) as any;

  const r = unwrap(result);
  const videoUrl: string = r?.video?.url || r?.url;
  if (!videoUrl) throw new Error(`${params.engine} did not return any video.`);

  if (onProgress) onProgress(100);
  return videoUrl;
};

// ─────────────────────────────────────────────
// Face Swap — Reemplazar cara en una imagen (fal.ai)
// ─────────────────────────────────────────────
export const faceSwapWithFal = async (
  baseImage: File,
  faceImage: File,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');

  if (onProgress) onProgress(10);
  const targetImageUrl = await uploadToFalStorage(baseImage);

  if (onProgress) onProgress(30);
  const sourceFaceUrl = await uploadToFalStorage(faceImage);

  if (onProgress) onProgress(50);

  const result = await fal.subscribe('fal-ai/face-swap', {
    input: {
      target_image_url: targetImageUrl,
      source_face_url: sourceFaceUrl,
      // Optional: enable_occlusion_prevention: false
      // If the photo has arms/hair in front of the face, this can be enabled
      // but costs double. We leave it false by default.
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(90, 50 + Math.random() * 40));
      }
    },
  }) as any;

  // The output could be in image.url or directly in url
  const r = unwrap(result);
  const finalImageUrl: string = r?.image?.url || r?.url;
  if (!finalImageUrl) throw new Error('Face Swap did not return an image.');

  if (onProgress) onProgress(100);
  return finalImageUrl;
};

// ─────────────────────────────────────────────
// Grok Imagine Edit — xai/grok-imagine-image/edit (fal.ai)
// Image-to-image editing via xAI Aurora model
// image_urls: array of public URLs (max 3) — we upload to fal.storage first
// ─────────────────────────────────────────────
export const editImageWithGrokFal = async (
  baseImage: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
  referenceImages?: File[],
  bypassCompiler?: boolean,
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(15);

  // Must upload to fal.storage — model expects public URLs, not data URIs
  const imageUrl = await uploadToFalStorage(baseImage);
  const refUrls: string[] = [];
  if (referenceImages?.length) {
    for (const ref of referenceImages) {
      refUrls.push(await uploadToFalStorage(ref));
    }
  }
  if (onProgress) onProgress(35);

  let fullPrompt: string;
  if (bypassCompiler) {
    // Synthesis prompts (try-on, multi-image composition) work better without
    // Flash Lite stripping — Grok understands "image 1 / image 2" natively.
    fullPrompt = prompt;
  } else {
    // Compile edit prompt through Flash Lite (EDIT_INPAINT rules: delta only)
    const compiledEdit = await compilePrompt({
      subjectIntent: prompt,
      targetModel: 'xai/grok-imagine-image/edit',
      isEdit: true,
    });
    // Grok needs explicit "lock" instructions to preserve unchanged areas
    const lockPrefix = 'Keep face, pose, and background unchanged unless the edit specifically requires changing them. ';
    fullPrompt = lockPrefix + compiledEdit;
  }

  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      prompt: fullPrompt,
      image_urls: [imageUrl, ...refUrls],
      num_images: 1,
      output_format: 'jpeg',
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 40 + Math.random() * 45));
      }
    },
  }) as any;

  if (onProgress) onProgress(90);

  const r = unwrap(result);
  const images: any[] = r?.images ?? [];
  const urls: string[] = images.map((img: any) => img.url).filter(Boolean);

  if (urls.length === 0) throw new Error('Grok Imagine Edit: did not return any images. Check your FAL_KEY for fal.ai.');

  // Convert to data URLs for persistence
  const dataUrls = await Promise.all(urls.map(async (url) => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Error downloading Grok image (${resp.status}).`);
    const blob = await resp.blob();
    return new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }));

  if (onProgress) onProgress(100);
  return dataUrls;
};

// ─────────────────────────────────────────────
// Photo Session with Grok (xai/grok-imagine-image/edit)
// Uploads reference image once, then runs N shots with different angles.
// ─────────────────────────────────────────────

const GROK_SESSION_ANGLES = [
  "front portrait at eye-level, relaxed confident expression, slight head tilt, natural warm smile, shoulders angled 15 degrees off camera axis",
  "three-quarter angle medium shot, weight shifted to one hip, one hand on hip or in pocket, looking past camera with contemplative expression",
  "full body walking toward camera mid-stride, natural arm swing, dynamic movement energy, candid street style",
  "looking back over shoulder, body turned away, mysterious half-smile, three-quarter back view with head rotation",
  "wide environmental shot, subject leaning against wall or sitting casually, relaxed authentic pose, rule-of-thirds placement",
  "low angle looking up at subject, power stance with feet apart, confident assertive expression, dramatic perspective",
  "candid mid-laugh, genuine joy with crinkled eyes, slightly off-center framing, natural unposed movement",
  "intimate close-up, eyes as focal point, shallow depth of field, intense or dreamy expression, slight smile",
];

export const generatePhotoSessionWithGrok = async (
  referenceImage: File,
  count: number,
  options: { angles?: string[]; scenario?: string; realistic?: boolean; negativePrompt?: string; imageBoost?: string } = {},
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<{ url: string; poseIndex: number }[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(5);

  // Upload once — reuse URL for all shots
  const imageUrl = await uploadToFalStorage(referenceImage);
  if (onProgress) onProgress(10);

  // Compile scenario through Flash Lite (RUNWAY_GROK rules)
  const compiledSessionScene = options.scenario
    ? await compilePrompt({
        subjectIntent: options.scenario,
        targetModel: 'xai/grok-imagine-image/edit',
        isEdit: true,
        isRealistic: options.realistic !== false,
      })
    : '';
  if (onProgress) onProgress(15);

  const clampedCount = Math.max(2, Math.min(8, count));
  const anglePool = (options.angles?.length) ? options.angles : GROK_SESSION_ANGLES;
  const angles = Array.from({ length: clampedCount }, (_, i) => anglePool[i % anglePool.length]);

  const toDataUrl = async (url: string): Promise<string> => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Error downloading Grok image (${resp.status}).`);
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const results: { url: string; poseIndex: number }[] = [];

  for (let i = 0; i < clampedCount; i++) {
    if (abortSignal?.aborted) throw new Error('Cancelado');
    const angle = angles[i];
    const scenePart = compiledSessionScene ? ` Scene: ${compiledSessionScene}.` : (options.scenario ? ` Scene: ${options.scenario}.` : '');
    const boostPart = options.imageBoost ? ` ${options.imageBoost}.` : '';
    const negativePart = options.negativePrompt ? ` Avoid: ${options.negativePrompt}.` : '';
    const isRealistic = options.realistic !== false;
    const prompt = isRealistic
      ? `${FACE_LOCK_PROMPT} ${OUTFIT_PRESERVE_PROMPT} Shot on iPhone 15 Pro, natural phone camera quality, looks like a real Instagram post not AI. Photo session — shot ${i + 1} of ${clampedCount}. Same person as reference image. Keep the EXACT same face, skin tone, hair color and style from the base image. Creative direction for this shot: ${angle}.${scenePart}${boostPart} The person should adopt the pose, expression, and body language described naturally — NOT a stiff copy of the reference. Phone visible in hand where the pose involves a selfie or mirror. Natural window light, no flash, slight lens softness, imperfect framing. Real environment clutter visible. Vary the pose and mood for each shot while keeping the same person and outfit.${negativePart} ${FACE_CHECK_PROMPT}`
      : `${FACE_LOCK_PROMPT} ${OUTFIT_PRESERVE_PROMPT} Photo session — shot ${i + 1} of ${clampedCount}. Same person as reference image. Keep the EXACT same face, skin tone, hair color and style from the base image. Creative direction for this shot: ${angle}.${scenePart}${boostPart} The person should adopt the pose, expression, and body language described naturally — NOT a stiff copy of the reference. Vary the pose and mood for each shot while keeping the same person and outfit.${negativePart} ${FACE_CHECK_PROMPT}`;

    const result = await fal.subscribe('xai/grok-imagine-image/edit', {
      input: { prompt, image_urls: [imageUrl] },
      onQueueUpdate: (update: any) => {
        if (update.status === 'IN_PROGRESS' && onProgress) {
          onProgress(Math.round(15 + ((i + 0.5) / clampedCount) * 80));
        }
      },
    }) as any;

    const r = unwrap(result);
    const imgUrl = r?.images?.[0]?.url ?? r?.images?.[0]?.url ?? r?.image?.url;
    if (!imgUrl) throw new Error(`Shot ${i + 1}: Grok did not return an image.`);

    results.push({ url: await toDataUrl(imgUrl), poseIndex: i });
    if (onProgress) onProgress(Math.round(15 + ((i + 1) / clampedCount) * 80));
  }

  if (results.length === 0) throw new Error('Grok Photo Session: no images were generated.');
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Image Editing — Qwen, FireRed, OneReward, Seedream5
// ─────────────────────────────────────────────

/**
 * Edits an image using Qwen Image 2 Pro.
 * Uploads the base image to fal.storage, then applies the prompt-based edit.
 */
export const editImageWithQwen = async (
  baseImage: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  const imageUrl = await uploadToFalStorage(baseImage);
  if (onProgress) onProgress(25);

  const result = await fal.subscribe('fal-ai/qwen-image-2/pro/edit', {
    input: {
      prompt,
      image_urls: [imageUrl],
      guidance_scale: 4.5,
      num_inference_steps: 35,
      num_images: 1,
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 25 + Math.random() * 55));
      }
    },
  }) as any;

  const r = unwrap(result);
  const imgUrl: string = r?.images?.[0]?.url ?? r?.image?.url;
  if (!imgUrl) throw new Error('Qwen Image Edit did not return any images.');

  if (onProgress) onProgress(90);
  const resp = await fetch(imgUrl);
  if (!resp.ok) throw new Error(`Error downloading Qwen edited image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((res) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

/**
 * Edits an image using FireRed Image Edit v1.1.
 * Supports optional reference images that are appended to the image_urls array.
 */
export const editImageWithFireRed = async (
  baseImage: File,
  prompt: string,
  referenceImages?: File[],
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  const baseUrl = await uploadToFalStorage(baseImage);
  if (onProgress) onProgress(20);

  const referenceUrls: string[] = [];
  if (referenceImages && referenceImages.length > 0) {
    for (const ref of referenceImages) {
      if (abortSignal?.aborted) throw new Error('Cancelado');
      referenceUrls.push(await uploadToFalStorage(ref));
    }
  }
  if (onProgress) onProgress(30);

  const allImageUrls = [baseUrl, ...referenceUrls];

  const result = await fal.subscribe('fal-ai/firered-image-edit-v1.1', {
    input: {
      prompt,
      image_urls: allImageUrls,
      guidance_scale: 4,
      num_inference_steps: 30,
      num_images: 1,
      output_format: 'png',
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 30 + Math.random() * 50));
      }
    },
  }) as any;

  const r = unwrap(result);
  const imgUrl: string = r?.images?.[0]?.url ?? r?.image?.url;
  if (!imgUrl) throw new Error('FireRed Image Edit did not return any images.');

  if (onProgress) onProgress(90);
  const resp = await fetch(imgUrl);
  if (!resp.ok) throw new Error(`Error downloading FireRed edited image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((res) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

/**
 * Inpaints an image using OneReward model.
 * Takes a base image and a mask image (white = area to inpaint).
 * Uses singular image_url / mask_url (not arrays).
 */
export const inpaintWithOneReward = async (
  baseImage: File,
  maskImage: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  const imageUrl = await uploadToFalStorage(baseImage);
  if (onProgress) onProgress(20);

  const maskUrl = await uploadToFalStorage(maskImage);
  if (onProgress) onProgress(30);

  const result = await fal.subscribe('fal-ai/onereward', {
    input: {
      prompt,
      image_url: imageUrl,
      mask_url: maskUrl,
      true_cfg: 4,
      num_inference_steps: 28,
      num_images: 1,
      output_format: 'jpeg',
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 30 + Math.random() * 50));
      }
    },
  }) as any;

  const r = unwrap(result);
  const imgUrl: string = r?.images?.[0]?.url ?? r?.image?.url;
  if (!imgUrl) throw new Error('OneReward inpaint did not return any images.');

  if (onProgress) onProgress(90);
  const resp = await fetch(imgUrl);
  if (!resp.ok) throw new Error(`Error downloading OneReward inpainted image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((res) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

/**
 * Edits an image using ByteDance Seedream v5 Lite (simple single-image variant).
 * Uploads the base image to fal.storage, then applies the prompt-based edit.
 * For multi-reference editing, use the existing editImageWithSeedream5() instead.
 */
export const editImageWithSeedream5Lite = async (
  baseImage: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  const imageUrl = await uploadToFalStorage(baseImage);
  if (onProgress) onProgress(25);

  const result = await fal.subscribe('fal-ai/bytedance/seedream/v5/lite/edit', {
    input: {
      prompt,
      image_urls: [imageUrl],
      num_images: 1,
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 25 + Math.random() * 55));
      }
    },
  }) as any;

  const r = unwrap(result);
  const imgUrl: string = r?.images?.[0]?.url ?? r?.image?.url;
  if (!imgUrl) throw new Error('Seedream 5 Lite Edit did not return any images.');

  if (onProgress) onProgress(90);
  const resp = await fetch(imgUrl);
  if (!resp.ok) throw new Error(`Error downloading Seedream 5 Lite edited image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((res) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (onProgress) onProgress(100);
  return [dataUrl];
};

// ─────────────────────────────────────────────────────────────────────────────
// Soul ID — LoRA Training via fal-ai/flux-lora-fast-training
// ─────────────────────────────────────────────────────────────────────────────

export interface LoRATrainingResult {
  loraUrl: string;        // FAL storage URL of the trained LoRA weights (.safetensors)
  triggerWord: string;    // The trigger word to use in prompts
}

/**
 * Trains a character-specific LoRA from face reference images.
 * Uploads images to FAL storage, submits training job, polls for completion.
 * Training takes ~10–25 minutes.
 *
 * @param imageBlobs  - Array of face reference Blobs (3–20 images recommended)
 * @param triggerWord - Short unique identifier for this character (e.g. "ELENA01")
 * @param onProgress  - Progress callback (0–100)
 * @param abortSignal - Optional abort signal
 */
export const trainLoRAForCharacter = async (
  imageBlobs: Blob[],
  triggerWord: string,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<LoRATrainingResult> => {
  if (imageBlobs.length === 0) throw new Error('Se necesitan al menos 1 imagen para entrenar.');

  if (onProgress) onProgress(5);

  // Upload all reference images to FAL storage
  const imageUrls: string[] = await Promise.all(
    imageBlobs.map(async (blob) => {
      const file = new File([blob], `ref-${crypto.randomUUID()}.jpg`, {
        type: blob.type || 'image/jpeg',
      });
      return uploadToFalStorage(file);
    })
  );

  if (abortSignal?.aborted) throw new Error('Training cancelled.');
  if (onProgress) onProgress(15);

  // Submit training job — fal-ai/flux-lora-fast-training
  const result: any = await fal.subscribe('fal-ai/flux-lora-fast-training', {
    input: {
      images_data_url: imageUrls as any,
      trigger_word: triggerWord,
      create_masks: true,
      steps: 1000,
    } as any,
    onQueueUpdate: (update: any) => {
      if (abortSignal?.aborted) return;
      if (update.status === 'IN_PROGRESS' && onProgress) {
        // Training is long — spread progress 15→90 over queue updates
        onProgress(Math.min(90, 15 + Math.random() * 70));
      }
    },
  });

  if (abortSignal?.aborted) throw new Error('Training cancelled.');

  const r = unwrap(result);
  const loraFile = r?.diffusers_lora_file;
  if (!loraFile?.url) throw new Error('Training completado pero no se obtuvo el archivo LoRA.');

  if (onProgress) onProgress(100);

  return { loraUrl: loraFile.url, triggerWord };
};

// ─────────────────────────────────────────────────────────────────────────────
// LoRA Inference — Generate images using a trained LoRA model
// Uses fal-ai/flux-lora-general with character-specific weights.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates images using a trained LoRA model for maximum character consistency.
 * The trigger word is injected at the start of the prompt to activate the LoRA identity.
 *
 * @param loraUrl      - FAL storage URL of the trained LoRA weights (.safetensors)
 * @param triggerWord  - Unique trigger word (e.g. "ELENA01") used during training
 * @param prompt       - Scene/pose description (trigger word is prepended automatically)
 * @param options      - Generation options
 * @param onProgress   - Progress callback (0–100)
 * @param abortSignal  - Optional abort signal
 */
export const generateWithLoRA = async (
  loraUrl: string,
  triggerWord: string,
  prompt: string,
  options: {
    imageSize?: string;
    numImages?: number;
    loraScale?: number;
    guidanceScale?: number;
    steps?: number;
  } = {},
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (!loraUrl) throw new Error('Se requiere URL del modelo LoRA entrenado.');
  if (onProgress) onProgress(10);

  const fullPrompt = `A photo of ${triggerWord}, ${prompt}`;

  const result: any = await fal.subscribe('fal-ai/flux-lora-general', {
    input: {
      prompt: fullPrompt,
      loras: [{ path: loraUrl, scale: options.loraScale ?? 0.85 }],
      image_size: options.imageSize || 'portrait_4_3',
      num_images: options.numImages || 1,
      guidance_scale: options.guidanceScale ?? 3.5,
      num_inference_steps: options.steps ?? 28,
      enable_safety_checker: false,
      output_format: 'jpeg',
    } as any,
    onQueueUpdate: (update: any) => {
      if (abortSignal?.aborted) return;
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(85, 10 + Math.random() * 70));
      }
    },
  });

  if (abortSignal?.aborted) throw new Error('Cancelado');

  const r = unwrap(result);
  const images = r?.images ?? [];
  if (images.length === 0) throw new Error('LoRA generation: no images returned.');

  // Convert FAL URLs to data URLs
  const dataUrls: string[] = await Promise.all(
    images.map(async (img: any) => {
      const url = img?.url;
      if (!url) return null;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    })
  );

  if (onProgress) onProgress(100);
  return dataUrls.filter((u): u is string => u !== null);
};

// ─────────────────────────────────────────────
// FLUX 2 Klein 9B Edit+LoRA — edit with custom LoRA weights
// Uses fal-ai/flux-2/klein/9b/edit/lora endpoint
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Z-Image Turbo — Alibaba Tongyi-MAI 6B · fal-ai/z-image/turbo
// Text-to-image · 8 steps max · $0.005/megapixel · uncensored natively
// No guidance_scale — turbo architecture. Prefers concise prompts (1-500 chars).
// Docs: https://fal.ai/models/fal-ai/z-image/turbo/api
// ─────────────────────────────────────────────
export const generateWithZImageTurbo = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  const character = params.characters[0];
  if (onProgress) onProgress(10);

  // Z-Image Turbo prompt strategy:
  // Concise and direct (1-300 chars ideal). Subject → outfit → setting → lighting → camera.
  // No FLUX-style "IDENTITY LOCKED" anchors — model is T2I only, no reference images.
  const parts: string[] = ['Ultra-photorealistic photograph.'];

  if (character?.characteristics) parts.push(character.characteristics + '.');
  if (character?.outfitDescription) parts.push(`Wearing: ${character.outfitDescription}.`);
  if (character?.pose) parts.push(character.pose + '.');
  if (character?.accessory) parts.push(`With: ${character.accessory}.`);
  if (params.scenario) parts.push(`Setting: ${params.scenario}.`);
  if (params.lighting) parts.push(`${params.lighting}.`);
  else parts.push('Soft directional studio light.');
  if (params.camera) parts.push(params.camera + '.');
  if (params.imageBoost) parts.push(params.imageBoost + '.');
  parts.push('Sharp detail, natural skin texture.');

  const prompt = parts.join(' ');
  const count = Math.min(params.numberOfImages ?? 1, 4);

  const result = await fal.subscribe(FalModel.ZImageTurbo, {
    input: {
      prompt,
      image_size: toFalImageSize(params.aspectRatio),
      num_inference_steps: Math.min(params.steps ?? 8, 8),
      num_images: count,
      enable_safety_checker: false,   // Uncensored
      acceleration: 'regular',
      ...(params.seed !== undefined && { seed: params.seed }),
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 20 + Math.random() * 65));
      }
    },
  }) as any;

  const r = unwrap(result);
  const images: Array<{ url: string }> = r?.images ?? [];
  if (images.length === 0) throw new Error('Z-Image Turbo did not return any images.');

  const results: string[] = [];
  for (const img of images) {
    if (img.url) {
      const resp = await fetch(img.url);
      if (!resp.ok) throw new Error(`Error downloading Z-Image Turbo image (${resp.status}).`);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
      results.push(dataUrl);
    }
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Z-Image Turbo Inpainting — fal-ai/z-image/turbo/inpaint
// IMPORTANT: uses `mask_image_url` (not `mask_url` like FLUX Pro).
// white pixels = area to regenerate, black pixels = area to preserve.
// Docs: https://fal.ai/models/fal-ai/z-image/turbo/inpaint/api
// ─────────────────────────────────────────────
export const inpaintWithZImageTurbo = async (
  imageFile: File,
  maskFile: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  const [imageUrl, maskUrl] = await Promise.all([
    uploadToFalStorage(imageFile),
    uploadToFalStorage(maskFile),
  ]);
  if (onProgress) onProgress(30);

  const result: any = await fal.subscribe('fal-ai/z-image/turbo/inpaint', {
    input: {
      image_url: imageUrl,
      mask_image_url: maskUrl,       // ← Z-Image uses mask_image_url, NOT mask_url
      prompt,
      num_inference_steps: 8,        // Max for turbo
      enable_safety_checker: false,  // Uncensored
      acceleration: 'regular',
      strength: 1,
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 35 + Math.random() * 50));
      }
    },
  });

  const r = unwrap(result);
  const outputUrl: string = r?.images?.[0]?.url || r?.image?.url;
  if (!outputUrl) throw new Error('Z-Image Inpaint: no output returned.');

  if (onProgress) onProgress(90);
  const resp = await fetch(outputUrl);
  if (!resp.ok) throw new Error(`Error downloading Inpaint image (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  if (onProgress) onProgress(100);
  return dataUrl;
};
