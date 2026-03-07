import { fal } from '@fal-ai/client';
import { InfluencerParams, FalModel, AspectRatio, PoseModificationParams } from '../types';

// ─────────────────────────────────────────────
// Config — API key is injected server-side by the /fal-api proxy.
// The fal SDK's requestMiddleware rewrites URLs to go through the proxy.
// ─────────────────────────────────────────────
fal.config({
  proxyUrl: '/fal-api',
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Convierte un File a base64 data URI para pasarlo a fal.ai.
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
 * Sube un File a fal.storage y devuelve la URL pública.
 * Necesario para pasar múltiples imágenes de referencia (PuLID SDXL).
 */
const uploadToFalStorage = async (file: File): Promise<string> => {
  return await fal.storage.upload(file);
};

/**
 * Mapea AspectRatio de la app al formato que acepta fal.ai.
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
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width <= maxWidth && img.height <= maxWidth) {
        resolve(file); // No necesita redimensionar
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
    img.onerror = reject;
  });
};

/**
 * Convierte una foto de pose en un esqueleto de OpenPose (DWPose).
 * Esto evita que el modelo copie la ropa o cara de la foto original.
 */
export const extractPoseSkeleton = async (file: File): Promise<File> => {
  // Redimensionar antes de subir reduce drásticamente el tiempo de upload y procesamiento
  const optimizedFile = await resizeImageForPose(file, 1024);
  const uploadedUrl = await uploadToFalStorage(optimizedFile);

  const result: any = await fal.subscribe("fal-ai/dwpose", {
    input: {
      image_url: uploadedUrl,
      draw_mode: "full-pose",
      // draw_mode: "full-pose" extrae cuerpo (body), cara (face) y manos (hands).
    },
  });

  const skeletonUrl = result.data?.image?.url || result.data?.images?.[0]?.url;
  if (!skeletonUrl) {
    throw new Error('No se pudo generar el esqueleto de la pose.');
  }

  // Descargar la imagen resultante y convertirla a File
  const resp = await fetch(skeletonUrl);
  const blob = await resp.blob();
  return new File([blob], `skeleton-${Date.now()}.png`, { type: blob.type || 'image/png' });
};

// ─────────────────────────────────────────────
// FLUX.2 Pro Edit — identidad multi-referencia, estado del arte (Nov 2025)
// Acepta hasta 9 fotos de referencia del personaje vía image_urls[]
// Backbone FLUX.2 de 32B parámetros — supera a FLUX PuLID y PuLID SDXL
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Mapea AspectRatio al formato aspect_ratio de Kontext Multi
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
    ? `the person with ${character.characteristics}`
    : 'the exact person shown in the reference images';

  let prompt = `Ultra-photorealistic fashion editorial photograph of ${subjectAnchor}. `;
  prompt += `IDENTITY LOCKED — preserve without alteration: exact facial bone structure, eye shape and color, nose shape, lip form, skin tone, skin texture, hair color and texture, overall face proportions. Do not idealize, smooth, blend, or reinterpret the face in any way. `;

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

  // Setting & lighting — place after subject to avoid bleed-through
  if (params.scenario) {
    prompt += `Setting: ${params.scenario}. `;
  }

  if (params.lighting) {
    prompt += `Lighting: ${params.lighting}. `;
  } else {
    prompt += `Lighting: soft directional studio light, slight rim highlight, natural skin tones. `;
  }

  // Camera & quality (FLUX Kontext is trained on DSLR-style data — use specific lens specs)
  if (params.imageBoost) {
    prompt += `Style: ${params.imageBoost}. `;
  } else {
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

  const images: Array<{ url: string }> = result.data?.images ?? [];
  if (images.length === 0) {
    throw new Error('Kontext Multi no devolvió ninguna imagen. Verifica tu API key y los parámetros.');
  }

  const results: string[] = [];
  for (const img of images) {
    if (img.url) {
      const resp = await fetch(img.url);
      if (!resp.ok) throw new Error(`Error al descargar imagen Kontext (${resp.status}).`);
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
// FLUX.2 Pro Edit — editor de imágenes multi-referencia
// Mantener para uso en el panel de edición
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

  if (character.characteristics) prompt += ` The person is described as: ${character.characteristics}.`;
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

    const imageUrl: string = result.data?.images?.[0]?.url;
    if (imageUrl) {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Error al descargar imagen FLUX.2 Pro (${resp.status}).`);
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
    throw new Error('Kontext Multi no devolvió ninguna imagen. Verifica tu API key.');
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
  // Order: subject description → style → composition → lighting → technical/camera
  // Optimal length: 30-100 words. Seedream responds strongly to specific lighting vocabulary.
  const seedreamSubject = character.characteristics
    ? `A model described as: ${character.characteristics}`
    : 'A model';

  let prompt = `Ultra-photorealistic editorial photograph. ${seedreamSubject}.`;

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
  } else {
    prompt += ` Lighting: soft directional studio light, slight rim highlight, natural skin tones.`;
  }

  if (params.imageBoost) {
    prompt += ` ${params.imageBoost}.`;
  }

  prompt += ' Shot on Sony A7R V, 85mm f/1.4. Sharp detail, visible skin texture, no artifacts.';
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

    const imageUrl: string = result.data?.images?.[0]?.url;
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

  if (results.length === 0) throw new Error('Seedream 4.5 no devolvió ninguna imagen.');
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Seedream 5.0 Lite — ByteDance, búsqueda web + razonamiento, 2K
// Text-to-image de nueva generación, sin referencia de cara
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
  // Same structure as 4.5: subject → style → composition → lighting → camera
  // Seedream responds strongly to specific lighting vocabulary.
  const seedreamSubject = character.characteristics
    ? `A model described as: ${character.characteristics}`
    : 'A model';

  let prompt = `Ultra-photorealistic editorial photograph. ${seedreamSubject}.`;

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
  } else {
    prompt += ` Lighting: soft directional studio light, slight rim highlight, natural skin tones.`;
  }

  if (params.imageBoost) {
    prompt += ` ${params.imageBoost}.`;
  }

  prompt += ' Shot on Sony A7R V, 85mm f/1.4. Sharp detail, visible skin texture, no artifacts.';
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

    const imageUrl: string = result.data?.images?.[0]?.url;
    if (!imageUrl) {
      // If no image URL, check for NSFW concepts
      if (result.data?.has_nsfw_concepts?.[0]) {
        throw new Error('Seedream 5.0 filtró el contenido. Prueba con un prompt más neutral.');
      }
      throw new Error('Seedream 5.0 no devolvió ninguna imagen.');
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

  if (results.length === 0) throw new Error('Seedream 5.0 no devolvió ninguna imagen.');
  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Leffa Pose Transfer — cambia pose por imagen de referencia
// Auto-extrae esqueleto DWPose para evitar filtrado de cara/ropa
// Preserva cara, ropa y piel del modelo original
// ─────────────────────────────────────────────
export const poseTransferWithLeffa = async (
  params: PoseModificationParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (!params.poseImages || params.poseImages.length === 0) {
    throw new Error('Leffa requiere al menos una imagen de referencia de pose.');
  }

  if (onProgress) onProgress(5);

  // Paso 1: Extraer esqueleto DWPose de la imagen de referencia
  // → evita que la cara/ropa del modelo de referencia "se filtre" al resultado
  let skeletonFile: File;
  try {
    skeletonFile = await extractPoseSkeleton(params.poseImages[0]);
    if (onProgress) onProgress(20);
  } catch {
    // Si falla la extracción de esqueleto, usar la imagen original como fallback
    console.warn('⚠️ No se pudo extraer esqueleto — usando imagen de referencia directamente');
    skeletonFile = params.poseImages[0];
    if (onProgress) onProgress(20);
  }

  // Paso 2: Subir persona e imagen de pose en paralelo
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

  const imageUrl: string = result.data?.image?.url || result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error('Leffa no devolvió ninguna imagen.');

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
// FLUX Kontext Pro — cambia pose por instrucción de texto
// Preserva cara, ropa y piel con solo texto descriptivo
// ─────────────────────────────────────────────
export const poseEditWithFluxKontext = async (
  params: PoseModificationParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (!params.pose) {
    throw new Error('FLUX Kontext requiere una descripción de texto de la pose.');
  }
  if (abortSignal?.aborted) throw new Error('Cancelado');

  if (onProgress) onProgress(10);
  const personUrl = await uploadToFalStorage(params.baseImage);
  if (onProgress) onProgress(25);

  // Prompt detallado como descripción afirmativa de la imagen (FLUX funciona mejor con captions, no instrucciones)
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

  if (result.data?.has_nsfw_concepts?.[0]) {
    throw new Error('FLUX Kontext filtró el contenido. Prueba con una instrucción más neutral o usa Gemini AI Edit.');
  }

  const imageUrl: string = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error('FLUX Kontext no devolvió ninguna imagen.');

  if (onProgress) onProgress(90);
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Error al descargar imagen de FLUX Kontext (${resp.status}).`);
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
// Router de pose editing fal.ai
// → Si hay sessionPoses: procesar cada pose por separado (batch)
// → Si hay imagen de referencia: Leffa Pose Transfer (con auto-esqueleto DWPose)
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
// AuraSR — upscaling 4× de alta calidad
// Ideal para ampliar imágenes de moda/retrato generadas
// ─────────────────────────────────────────────
export const upscaleWithAuraSR = async (
  imageDataUrl: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(10);

  // Si es data URL, convertir a File y subir a fal storage
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

  const resultUrl: string = result.data?.image?.url;
  if (!resultUrl) throw new Error('AuraSR no devolvió ninguna imagen.');

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
// FLUX Kontext Pro — edición de imagen por instrucción de texto (AI Edit mode)
// Versión genérica para el modo "Editar con IA"
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
    throw new Error('FLUX Kontext requiere una instrucción de edición.');
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

  if (result.data?.has_nsfw_concepts?.[0]) {
    throw new Error('FLUX Kontext filtró el contenido. Prueba con una instrucción más neutral o usa Gemini AI Edit.');
  }

  const resultUrl: string = result.data?.images?.[0]?.url;
  if (!resultUrl) throw new Error('FLUX Kontext no devolvió ninguna imagen.');

  if (onProgress) onProgress(92);
  const resp = await fetch(resultUrl);
  if (!resp.ok) throw new Error(`Error al descargar imagen de FLUX Kontext (${resp.status}).`);
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

  const outputUrl: string = result.data?.image?.url || result.data?.images?.[0]?.url;
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
      safety_tolerance: '6',
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 35 + Math.random() * 50));
      }
    },
  });

  if (result.data?.has_nsfw_concepts?.[0]) {
    throw new Error('FLUX Inpaint filtró el contenido. Prueba con una instrucción más neutral.');
  }

  const outputUrl: string = result.data?.images?.[0]?.url || result.data?.image?.url;
  if (!outputUrl) throw new Error('Inpaint: no output returned.');

  if (onProgress) onProgress(90);
  const resp = await fetch(outputUrl);
  if (!resp.ok) throw new Error(`Error al descargar imagen de Inpaint (${resp.status}).`);
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
// Seedream 5.0 Lite Edit — edición multimodal con hasta 10 imágenes
// Las imágenes se referencian en el prompt como "Figure 1", "Figure 2", etc.
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
    throw new Error('Seedream 5 Edit requiere una instrucción de edición.');
  }

  if (onProgress) onProgress(10);

  // Subir imagen base + referencias en paralelo (máx 10 total)
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

  const imageUrl: string = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error('Seedream 5 Edit no devolvió ninguna imagen.');

  if (onProgress) onProgress(92);
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Error al descargar imagen de Seedream 5 Edit (${resp.status}).`);
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
// FLUX.2 Pro Edit — AI editor con múltiples referencias
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
    throw new Error('FLUX.2 Pro Edit requiere una instrucción de edición.');
  }

  if (onProgress) onProgress(10);

  // La imagen base va primera; luego las referencias (máx 9 adicionales)
  const allImages = [baseImage, ...referenceImages.slice(0, 9)];
  const imageUrls = await Promise.all(allImages.map(f => uploadToFalStorage(f)));

  if (onProgress) onProgress(35);

  const result = await fal.subscribe(FalModel.Flux2Pro, {
    input: {
      prompt: instruction,
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

  const imageUrl: string = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error('FLUX.2 Pro Edit no devolvió ninguna imagen.');

  if (onProgress) onProgress(92);
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Error al descargar imagen de FLUX.2 Pro Edit (${resp.status}).`);
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
// Router principal — elige el modelo fal según configuración
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

  const endpoint = params.engine === VideoEngine.KlingPro
    ? 'fal-ai/kling-video/v1.5/pro/image-to-video'
    : 'fal-ai/kling-video/v1.5/standard/image-to-video';

  const result = await fal.subscribe(endpoint, {
    input: {
      prompt: params.prompt,
      image_url: imageUrl,
      aspect_ratio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
      ...(referenceVideoUrl && { reference_video_url: referenceVideoUrl })
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(90, 40 + Math.random() * 50));
      }
    },
  }) as any;

  const videoUrl: string = result.data?.video?.url || result.data?.url;
  if (!videoUrl) throw new Error(`${params.engine} no devolvió ningún video.`);

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
      // Opcional: enable_occlusion_prevention: false 
      // Si la foto tiene brazos/pelo enfrente de la cara se puede activar
      // y vale el doble. Aquí lo dejamos false por defecto.
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(90, 50 + Math.random() * 40));
      }
    },
  }) as any;

  // The output could be in image.url or directly in url
  const finalImageUrl: string = result.data?.image?.url || result.data?.url;
  if (!finalImageUrl) throw new Error('No se devolvió la imagen de Face Swap.');

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
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(15);

  // Must upload to fal.storage — model expects public URLs, not data URIs
  const imageUrl = await uploadToFalStorage(baseImage);
  if (onProgress) onProgress(35);

  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      prompt,
      image_urls: [imageUrl],
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

  const images: any[] = result.data?.images ?? [];
  const urls: string[] = images.map((img: any) => img.url).filter(Boolean);

  if (urls.length === 0) throw new Error('Grok Imagine Edit: no devolvió imagen. Verifica tu FAL_KEY de fal.ai.');

  // Convert to data URLs for persistence
  const dataUrls = await Promise.all(urls.map(async (url) => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Error al descargar imagen de Grok (${resp.status}).`);
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
  "front portrait, eye-level, subject looking straight at camera",
  "3/4 angle right, medium shot, looking slightly off-camera",
  "side profile, full body, clean lateral view",
  "3/4 back angle, looking over left shoulder at camera",
  "wide shot, full body at rule-of-thirds, rich background",
  "low angle, looking upward at subject, dynamic power perspective",
  "high angle, overhead, subject looking up into lens",
  "close-up, tight crop on face, very shallow depth of field",
];

export const generatePhotoSessionWithGrok = async (
  referenceImage: File,
  count: number,
  options: { angles?: string[] } = {},
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<{ url: string; poseIndex: number }[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(5);

  // Upload once — reuse URL for all shots
  const imageUrl = await uploadToFalStorage(referenceImage);
  if (onProgress) onProgress(15);

  const clampedCount = Math.max(2, Math.min(8, count));
  const anglePool = (options.angles?.length) ? options.angles : GROK_SESSION_ANGLES;
  const angles = Array.from({ length: clampedCount }, (_, i) => anglePool[i % anglePool.length]);

  const toDataUrl = async (url: string): Promise<string> => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Error al descargar imagen de Grok (${resp.status}).`);
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
    const prompt = `Photo session — shot ${i + 1} of ${clampedCount}. Preserve EXACTLY the same person, outfit, and scene from the reference image. Only the camera angle changes. Camera angle for this shot: ${angle}. Keep face, clothing, and background identical to the reference.`;

    const result = await fal.subscribe('xai/grok-imagine-image/edit', {
      input: { prompt, image_urls: [imageUrl], num_images: 1, output_format: 'jpeg' },
      onQueueUpdate: (update: any) => {
        if (update.status === 'IN_PROGRESS' && onProgress) {
          onProgress(Math.round(15 + ((i + 0.5) / clampedCount) * 80));
        }
      },
    }) as any;

    const imgUrl = result.data?.images?.[0]?.url;
    if (!imgUrl) throw new Error(`Shot ${i + 1}: Grok no devolvió imagen.`);

    results.push({ url: await toDataUrl(imgUrl), poseIndex: i });
    if (onProgress) onProgress(Math.round(15 + ((i + 1) / clampedCount) * 80));
  }

  if (results.length === 0) throw new Error('Grok Photo Session: no se generó ninguna imagen.');
  if (onProgress) onProgress(100);
  return results;
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

  const loraFile = result?.data?.diffusers_lora_file ?? result?.diffusers_lora_file;
  if (!loraFile?.url) throw new Error('Training completado pero no se obtuvo el archivo LoRA.');

  if (onProgress) onProgress(100);

  return { loraUrl: loraFile.url, triggerWord };
};

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

  const images: Array<{ url: string }> = result.data?.images ?? [];
  if (images.length === 0) throw new Error('Z-Image Turbo no devolvió imágenes.');

  const results: string[] = [];
  for (const img of images) {
    if (img.url) {
      const resp = await fetch(img.url);
      if (!resp.ok) throw new Error(`Error al descargar imagen Z-Image Turbo (${resp.status}).`);
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
      control_scale: 0.75,
      control_start: 0,
      control_end: 0.8,
    },
    onQueueUpdate: (update: any) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(88, 35 + Math.random() * 50));
      }
    },
  });

  const outputUrl: string = result.data?.images?.[0]?.url || result.data?.image?.url;
  if (!outputUrl) throw new Error('Z-Image Inpaint: no output returned.');

  if (onProgress) onProgress(90);
  const resp = await fetch(outputUrl);
  if (!resp.ok) throw new Error(`Error al descargar imagen de Inpaint (${resp.status}).`);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  if (onProgress) onProgress(100);
  return dataUrl;
};
