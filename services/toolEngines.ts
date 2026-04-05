import { fal } from '@fal-ai/client';
import { editImageWithAI } from './geminiService';
import { compilePrompt } from './promptCompiler';

// ─────────────────────────────────────────────
// Tool Engine Service — Best model per editing tool
// Decided after A/B testing 8 models × 8 tools (2026-03-17)
// Prompt templates optimized per engine (2026-03-17)
// ─────────────────────────────────────────────

fal.config({ proxyUrl: '/fal-api' });

const unwrap = (result: any): any => result?.data ?? result ?? {};

// ─── Types ───────────────────────────────────

export type ToolId =
  | 'relight'
  | 'scene'
  | 'outfit'
  | 'face-swap'
  | 'realistic-skin'
  | 'style-transfer'
  | 'upscale'
  | 'angles'
  | 'ai-edit';

export type EngineId = 'grok' | 'kontext' | 'seedream' | 'qwen' | 'aura-sr' | 'nb2' | 'nb-pro' | 'pruna' | 'recraft';

export interface ToolResult {
  url: string;
  engine: EngineId;
}

// ─── Default engine per tool (from A/B testing) ──

export const TOOL_ENGINE_DEFAULTS: Record<ToolId, EngineId> = {
  'relight': 'nb2',            // NB2 best for precise lighting, fallback seedream
  'scene': 'kontext',         // Kontext designed for background swap while preserving subject
  'outfit': 'seedream',       // Multi-ref changes clothes without altering face
  'face-swap': 'seedream',    // Multi-ref = more face context
  'realistic-skin': 'grok',   // Fine-grained skin texture edit
  'style-transfer': 'seedream', // Preserves identity better with refs
  'upscale': 'aura-sr',
  'angles': 'nb2',
  'ai-edit': 'grok',          // General purpose — Grok is more instruction-following
};

// ═════════════════════════════════════════════
// PROMPT TEMPLATES — per tool × engine
// Each engine expects a different prompt style
// ═════════════════════════════════════════════

type PromptBuilder = (input: string) => string;

const PROMPTS: Partial<Record<ToolId, Partial<Record<EngineId, PromptBuilder>>>> = {
  relight: {
    grok: (input) => `Change ONLY the lighting to ${input}. Keep the subject, outfit, pose, background, and scene completely identical. Only modify light color, direction, shadows, and highlights — nothing else.`,
    kontext: (input) => `Change the lighting to ${input} while keeping the subject, outfit, background, and scene completely identical. Only lighting changes.`,
    seedream: (input) => `Apply new lighting: ${input}. Do not change the person, outfit, pose, background, or environment in any way. Only lighting and shadows may change.`,
    qwen: (input) => `Change ONLY the lighting to ${input}. Keep the same person, pose, outfit, hair, background, and scene unchanged. Only modify light color, direction, and shadows.`,
    nb2: (input) => `Change ONLY the lighting to: ${input}. Do not alter the subject's face, body, pose, outfit, hair, background, or scene. Only modify light direction, color temperature, shadows, and highlights.`,
  },

  scene: {
    grok: (input) => `Change ONLY the background/setting to ${input}. The person must stay identical: same face, body, pose, outfit, and hair. Only the environment behind them changes.`,
    kontext: (input) => `Replace the background with ${input} while keeping the person, their face, pose, outfit, and hair 100% identical. Only the environment changes.`,
    seedream: (input) => `Change the background to ${input}. Keep the person, their face, clothing, pose, and hair completely unchanged. Only the environment changes.`,
    qwen: (input) => `Replace ONLY the background with ${input}. Keep the same person, face, pose, outfit, and hair exactly as they are. Do not change anything about the person.`,
    nb2: (input) => `Replace ONLY the background/environment with: ${input}. Keep the subject's face, body, pose, outfit, and hair completely identical. Blend lighting naturally with the new scene.`,
  },

  outfit: {
    grok: (input) => `Change the clothing to ${input}, keeping the face and background identical.`,
    kontext: (input) => `Change the outfit to ${input} while maintaining the same person, face, and background.`,
    seedream: (input) => `Dress the person in ${input}. Keep the face, pose, and background unchanged.`,
    qwen: (input) => `Change the clothing to ${input}. Keep the same person, face, pose, hair, and background.`,
    nb2: (input) => `Change ONLY the clothing/outfit to: ${input}. Keep the subject's face, skin, hair, body pose, and background completely identical. The new outfit must fit the body naturally and match the scene lighting.`,
  },

  'face-swap': {
    grok: (_) => 'Replace the face in the first image with the face from the second image. Keep everything else the same. Blend the new face naturally with the lighting and skin tone.',
    kontext: (_) => 'Swap the face from the second image onto the person in the first image while keeping the body, outfit, pose, and background identical.',
    seedream: (_) => 'Replace the face of the person with the face from the reference image. Match skin tone and lighting. Keep body, outfit, and background unchanged.',
    qwen: (_) => 'Replace the face in the first image with the face from the second image. Keep body, outfit, pose, and background exactly the same. Blend naturally.',
    nb2: (_) => 'Replace the face of the subject with the face from the Reference image. Transfer bone structure, eye shape, eye color, nose, lips, jaw, and skin tone. Keep the original hair style, body, pose, outfit, and background unchanged. Match lighting direction and color temperature on the new face.',
  },

  'realistic-skin': {
    grok: (_) => 'Add realistic skin detail: visible pores, micro-imperfections, and natural skin texture. Keep the subject and composition identical.',
    kontext: (_) => 'Add photorealistic skin texture with visible pores and natural imperfections while keeping everything else identical.',
    seedream: (_) => 'Enhance skin realism: add visible pores, subtle imperfections, natural skin shine. Do not change the person, pose, or background.',
    qwen: (_) => 'Make the skin more photorealistic with visible pores, micro-imperfections, and natural texture. Keep everything else the same.',
    nb2: (_) => 'Enhance skin realism ONLY: add visible pores, micro-imperfections, natural skin shine, and subtle subsurface scattering. Do not alter the face shape, features, expression, hair, outfit, pose, or background. The goal is photorealistic skin texture, not beauty retouching.',
  },

  'style-transfer': {
    grok: (input) => `Render this as ${input}, maintaining the subject's likeness and composition.`,
    kontext: (input) => `Transform this image into ${input} while preserving the subject's likeness and composition.`,
    seedream: (input) => `Apply artistic style: ${input}. Maintain the subject's identity and composition.`,
    qwen: (input) => `Transform this photo into ${input}. Keep the same person and composition.`,
    nb2: (input) => `Transform the visual style to: ${input}. The subject's identity, pose, and composition must remain recognizable. Apply the artistic style to the entire image uniformly.`,
  },

  'ai-edit': {
    grok: (input) => `${input}, keeping the subject's identity.`,
    kontext: (input) => `${input} while maintaining the subject's identity.`,
    seedream: (input) => `${input}. Keep the subject's identity unchanged.`,
    qwen: (input) => `${input}. Preserve the subject's identity and face.`,
    nb2: (input) => `${input}`,
  },
};

/** Get the optimized prompt for a tool × engine combination */
export function getPrompt(tool: ToolId, engine: EngineId, input: string): string {
  const enginePrompts = PROMPTS[tool];
  if (!enginePrompts) return input;
  const builder = enginePrompts[engine] || enginePrompts['grok'];
  if (!builder) return input;
  return builder(input);
}

// ═════════════════════════════════════════════
// ENGINE ADAPTERS — each engine has different API
// ═════════════════════════════════════════════

/** Grok edit via fal.ai — image_urls array */
export async function grokEdit(imageUrl: string, prompt: string): Promise<string> {
  // Compile through Flash Lite (EDIT_INPAINT rules: delta only)
  const compiled = await compilePrompt({
    subjectIntent: prompt,
    targetModel: 'xai/grok-imagine-image/edit',
    isEdit: true,
  });
  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      image_urls: [imageUrl],
      prompt: compiled,
      num_images: 1,
      output_format: 'jpeg',
    },
    timeout: 120000,
  }) as any;
  const data = unwrap(result);
  return data.images?.[0]?.url || data.image?.url;
}

/** Grok edit with multiple images (face swap) */
async function grokEditMulti(imageUrls: string[], prompt: string): Promise<string> {
  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      image_urls: imageUrls,
      prompt,
      num_images: 1,
      output_format: 'jpeg',
    },
    timeout: 120000,
  }) as any;
  const data = unwrap(result);
  return data.images?.[0]?.url || data.image?.url;
}

/** Flux Kontext edit — single image_url */
async function kontextEdit(imageUrl: string, prompt: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      image_url: imageUrl,
      prompt,
    },
    timeout: 120000,
  }) as any;
  const data = unwrap(result);
  return data.images?.[0]?.url || data.image?.url;
}

/** Seedream v5 Lite edit — image_urls array, multi-ref capable */
async function seedreamEdit(imageUrl: string, prompt: string): Promise<string> {
  const compiled = await compilePrompt({
    subjectIntent: prompt,
    targetModel: 'fal-ai/bytedance/seedream/v5/lite/edit',
    isEdit: true,
  });
  const result = await fal.subscribe('fal-ai/bytedance/seedream/v5/lite/edit', {
    input: {
      image_urls: [imageUrl],
      prompt: compiled,
      num_images: 1,
      enable_safety_checker: false,
    },
    timeout: 120000,
  }) as any;
  const data = unwrap(result);
  return data.images?.[0]?.url || data.image?.url;
}

/** Qwen edit — image_urls array */
async function qwenEdit(imageUrl: string, prompt: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/qwen-image-2/pro/edit', {
    input: {
      image_urls: [imageUrl],
      prompt,
    },
    timeout: 120000,
  }) as any;
  const data = unwrap(result);
  return data.images?.[0]?.url || data.image?.url;
}

/** NB2 (Gemini) edit — URL→File bridge, then structured prompt via editImageWithAI */
async function nb2Edit(imageUrl: string, prompt: string, options?: { imageSize?: string; aspectRatio?: string }): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const ext = blob.type.split('/')[1] || 'jpeg';
  const file = new File([blob], `input.${ext}`, { type: blob.type });

  const results = await editImageWithAI({
    baseImage: file, instruction: prompt,
    ...(options?.imageSize && { imageSize: options.imageSize as any }),
    ...(options?.aspectRatio && { aspectRatio: options.aspectRatio as any }),
  });
  if (!results || results.length === 0) throw new Error('NB2 returned no images');
  return results[0];
}

/** NB Pro (Gemini Pro) edit — higher quality than NB2, uses GeminiImageModel.Pro */
export async function nbProEdit(imageUrl: string, prompt: string): Promise<string> {
  // Dynamic import to avoid circular dependency
  const { editImageWithAI } = await import('./geminiService');
  const { GeminiImageModel } = await import('../types');
  type AIEditParams = import('../types').AIEditParams;

  // Fetch the image URL and convert to File (same pattern as nb2Edit)
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const file = new File([blob], 'input.png', { type: blob.type });

  const params: AIEditParams = {
    baseImage: file,
    instruction: prompt,
    model: GeminiImageModel.Pro,  // Use NB Pro instead of default NB2
  };

  const results = await editImageWithAI(params);
  if (!results.length) throw new Error('NB Pro edit returned no results');
  return results[0];
}

/** Pruna P-Image-Edit — fallback edit engine via Replicate */
export async function prunaEdit(imageUrl: string, prompt: string): Promise<string> {
  const { editWithPruna } = await import('./replicateService');
  return editWithPruna(imageUrl, prompt);
}

/** Route to correct engine adapter */
async function runEngine(engine: EngineId, imageUrl: string, prompt: string): Promise<string> {
  switch (engine) {
    case 'grok': return grokEdit(imageUrl, prompt);
    case 'kontext': return kontextEdit(imageUrl, prompt);
    case 'seedream': return seedreamEdit(imageUrl, prompt);
    case 'qwen': return qwenEdit(imageUrl, prompt);
    case 'nb2': return nb2Edit(imageUrl, prompt);
    case 'nb-pro': return nbProEdit(imageUrl, prompt);
    case 'pruna': return prunaEdit(imageUrl, prompt);
    default: return grokEdit(imageUrl, prompt);
  }
}

// ─── Edit engine fallback chain ──────────────
// Fallback triggers: HTTP 5xx, content policy rejection, or timeout >30s.
// Failed attempts do NOT charge credits. Chain: Grok -> NB Pro -> Pruna.

const EDIT_FALLBACK_CHAIN: EngineId[] = ['nb2', 'seedream', 'grok', 'nb-pro', 'pruna'];

/** 30-second timeout wrapper -- works with any async function */
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
  options?: { imageSize?: string; aspectRatio?: string },
): Promise<ToolResult> {
  // Build ordered chain starting from preferred engine
  const chain = [preferredEngine, ...EDIT_FALLBACK_CHAIN.filter(e => e !== preferredEngine)];
  const getEnginePrompt = (engine: EngineId) =>
    PROMPTS[toolId]?.[engine]?.(prompt) || PROMPTS[toolId]?.grok?.(prompt) || prompt;

  for (const engine of chain) {
    try {
      let engineCall: Promise<string>;
      switch (engine) {
        case 'nb2': engineCall = nb2Edit(imageUrl, getEnginePrompt(engine), options); break;
        case 'seedream': engineCall = seedreamEdit(imageUrl, getEnginePrompt(engine)); break;
        case 'grok': engineCall = grokEdit(imageUrl, getEnginePrompt(engine)); break;
        case 'nb-pro': engineCall = nbProEdit(imageUrl, getEnginePrompt(engine)); break;
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

// ─── Upload helper ───────────────────────────

export async function uploadToFal(file: File): Promise<string> {
  return await fal.storage.upload(file);
}

// ═════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// Each accepts optional engine override
// ═════════════════════════════════════════════

/** Relight — change lighting on existing image */
export async function relight(
  imageUrl: string,
  lightingDescription: string,
  engine: EngineId = TOOL_ENGINE_DEFAULTS.relight,
): Promise<ToolResult> {
  const prompt = getPrompt('relight', engine, lightingDescription);
  const url = await runEngine(engine, imageUrl, prompt);
  return { url, engine };
}

/** Scene / BG Swap — change background/location */
export async function changeScene(
  imageUrl: string,
  sceneDescription: string,
  engine: EngineId = TOOL_ENGINE_DEFAULTS.scene,
): Promise<ToolResult> {
  const prompt = getPrompt('scene', engine, sceneDescription);
  const url = await runEngine(engine, imageUrl, prompt);
  return { url, engine };
}

/** Outfit Change — change clothing */
export async function changeOutfit(
  imageUrl: string,
  outfitDescription: string,
  engine: EngineId = TOOL_ENGINE_DEFAULTS.outfit,
): Promise<ToolResult> {
  const prompt = getPrompt('outfit', engine, outfitDescription);
  const url = await runEngine(engine, imageUrl, prompt);
  return { url, engine };
}

/** Face Swap — replace face with another person's face */
export async function faceSwap(
  baseImageUrl: string,
  faceSourceUrl: string,
  engine: EngineId = TOOL_ENGINE_DEFAULTS['face-swap'],
): Promise<ToolResult> {
  const prompt = getPrompt('face-swap', engine, '');

  // Grok: native multi-image support
  if (engine === 'grok') {
    const url = await grokEditMulti([baseImageUrl, faceSourceUrl], prompt);
    return { url, engine };
  }

  // NB2: uses editImageWithAI with referenceImage parameter
  if (engine === 'nb2') {
    const [baseResp, faceResp] = await Promise.all([fetch(baseImageUrl), fetch(faceSourceUrl)]);
    const [baseBlob, faceBlob] = await Promise.all([baseResp.blob(), faceResp.blob()]);
    const baseFile = new File([baseBlob], 'base.jpeg', { type: baseBlob.type });
    const faceFile = new File([faceBlob], 'face.jpeg', { type: faceBlob.type });
    const results = await editImageWithAI({ baseImage: baseFile, instruction: prompt, referenceImage: faceFile });
    if (!results || results.length === 0) throw new Error('NB2 face swap returned no images');
    return { url: results[0], engine: 'nb2' };
  }

  // Other engines: fall back to Grok for face swap (multi-image)
  const url = await grokEditMulti([baseImageUrl, faceSourceUrl], getPrompt('face-swap', 'grok', ''));
  return { url, engine: 'grok' };
}

/** Realistic Skin — add natural skin texture */
export async function realisticSkin(
  imageUrl: string,
  engine: EngineId = TOOL_ENGINE_DEFAULTS['realistic-skin'],
): Promise<ToolResult> {
  const prompt = getPrompt('realistic-skin', engine, '');
  const url = await runEngine(engine, imageUrl, prompt);
  return { url, engine };
}

/** Style Transfer — apply artistic style */
export async function styleTransfer(
  imageUrl: string,
  styleDescription: string,
  engine: EngineId = TOOL_ENGINE_DEFAULTS['style-transfer'],
): Promise<ToolResult> {
  const prompt = getPrompt('style-transfer', engine, styleDescription);
  const url = await runEngine(engine, imageUrl, prompt);
  return { url, engine };
}

/** Upscale — increase resolution (AuraSR only) */
export async function upscale(
  imageUrl: string,
  engine: 'recraft' | 'aura-sr' = 'aura-sr',
): Promise<ToolResult> {
  if (engine === 'aura-sr') {
    const result = await fal.subscribe('fal-ai/aura-sr', {
      input: {
        image_url: imageUrl,
        upscaling_factor: 2 as any,
      },
      timeout: 120000,
    }) as any;
    const data = unwrap(result);
    const url = data.images?.[0]?.url || data.image?.url;
    return { url, engine: 'aura-sr' };
  } else {
    const { upscaleWithRecraft } = await import('./replicateService');
    const url = await upscaleWithRecraft(imageUrl);
    return { url, engine: 'recraft' };
  }
}

/** AI Edit — free-form prompt edit */
export async function aiEdit(
  imageUrl: string,
  editDescription: string,
  engine: EngineId = TOOL_ENGINE_DEFAULTS['ai-edit'],
): Promise<ToolResult> {
  const prompt = getPrompt('ai-edit', engine, editDescription);
  const url = await runEngine(engine, imageUrl, prompt);
  return { url, engine };
}

/** Angles/360 — generate character sheet with multiple views */
export async function generateAngles(
  imageUrl: string,
  mode: 'face' | 'body' | 'expressions',
  quality: 'standard' | 'ultra' = 'standard',
): Promise<ToolResult> {
  // Angles always use NB2 (Gemini) for generation
  // The caller handles the actual Gemini API call
  if (quality === 'ultra') {
    return { url: '', engine: 'nb2' }; // caller does NB2 → Grok enhance
  }
  return { url: '', engine: 'nb2' }; // caller routes to Gemini
}

// ─── Angle prompts (exported for use by caller) ─

export const ANGLE_PROMPTS = {
  face: 'A 2x2 grid of 4 CLOSE-UP HEAD SHOTS ONLY of the subject from different angles. CROP: from shoulders up ONLY — do NOT show torso, arms, hands, or body. Top-left: front face looking at camera. Top-right: right profile (90° side view of face). Bottom-left: left profile (90° side view of face). Bottom-right: three-quarter view. All white background. Same person in every frame, same lighting, same distance. DO NOT add any text, labels, or captions. DO NOT show body below the shoulders.',
  body: 'A horizontal strip of 4 FULL BODY shots of the subject from head to toe in different angles, side by side. From left to right: front view facing camera, half turn (45° angle), side profile (90°), back view. Show the COMPLETE body from head to feet in every frame. The subject wears form-fitting neutral activewear (sports bra and bike shorts or tank top and leggings) to clearly show body proportions, silhouette, and musculature. All white background. Same person, same lighting. DO NOT add any text or labels.',
  expressions: 'An expression sheet of the subject showing 9 different facial expressions in a 3x3 grid. Row 1: genuine happy smile, tears streaming down face looking sad, mouth open wide eyes shocked. Row 2: furrowed brows clenched jaw furious, head thrown back belly laughing, stern deadpan no emotion. Row 3: one eye closed playful smirk, nose scrunched up lip curled in disgust, eyes gently closed serene peaceful. Close-up headshots only, all white background, same person in every frame. DO NOT add any text, labels, captions, or words anywhere on the image.',
};

export const ANGLE_GROK_ENHANCE_PROMPTS = {
  face: 'Enhance this character reference sheet to be more photorealistic. Add natural skin texture, visible pores, realistic lighting. Keep all 4 angles and the same person. Do not change layout.',
  expressions: 'Enhance this expression sheet to be more photorealistic. More natural skin, expressive eyes, realistic detail. Keep all expressions and the same person. Do not change layout.',
};

// ─── Character sheet pipeline ────────────────

export type SheetType = 'face' | 'body' | 'expressions';

/** Generate a character sheet grid using NB2 (Gemini) */
export async function generateCharacterSheet(
  approvedImageUrl: string,
  sheetType: SheetType,
  physicalTraits?: string,
): Promise<string> {
  let prompt = ANGLE_PROMPTS[sheetType];
  if (physicalTraits && sheetType === 'body') {
    prompt = `${prompt}\n\nCRITICAL — The subject's body MUST match these EXACT physical characteristics (do NOT deviate): ${physicalTraits}. These proportions are non-negotiable and must be clearly visible in every angle.`;
  }

  // Body sheets use Grok (no content filters → preserves body proportions accurately)
  // Face and expression sheets use NB2 (better at facial consistency)
  if (sheetType === 'body') {
    try {
      const { editImageWithGrokFal } = await import('./falService');
      const response = await fetch(approvedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'input.jpeg', { type: blob.type });
      const results = await editImageWithGrokFal(file, prompt);
      if (results.length > 0 && results[0]) return results[0];
    } catch (err) {
      console.warn('Grok body sheet failed, falling back to NB2:', err);
    }
  }

  return nb2Edit(approvedImageUrl, prompt);
}

/** Enhance a character sheet with Grok (ultra mode) */
export async function enhanceSheetWithGrok(
  sheetUrl: string,
  sheetType: 'face' | 'expressions',
): Promise<string> {
  // NB2 returns data URLs; Grok needs hosted URLs — upload first
  let url = sheetUrl;
  if (sheetUrl.startsWith('data:')) {
    const resp = await fetch(sheetUrl);
    const blob = await resp.blob();
    const file = new File([blob], `sheet-${sheetType}.png`, { type: blob.type });
    url = await uploadToFal(file);
  }
  const prompt = ANGLE_GROK_ENHANCE_PROMPTS[sheetType];
  return grokEdit(url, prompt);
}

// ─── Style presets ───────────────────────────

export const STYLE_PRESETS = [
  { id: 'oil-painting', label: 'Oil Painting', prompt: 'a beautiful oil painting style with painterly brushstrokes and rich colors' },
  { id: 'watercolor', label: 'Watercolor', prompt: 'a delicate watercolor painting with soft washes and transparent layers' },
  { id: 'anime', label: 'Anime', prompt: 'high quality anime illustration style, clean lines, vibrant colors' },
  { id: 'comic', label: 'Comic Book', prompt: 'a comic book illustration with bold outlines, halftone dots, and vivid colors' },
  { id: 'pixel-art', label: 'Pixel Art', prompt: 'detailed pixel art style with limited color palette' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'cyberpunk aesthetic with neon lights, holographic effects, and futuristic elements' },
  { id: 'film-noir', label: 'Film Noir', prompt: 'a dramatic black and white film noir photograph with high contrast shadows' },
  { id: 'pop-art', label: 'Pop Art', prompt: 'Andy Warhol inspired pop art with bold colors and screen print effect' },
  { id: 'renaissance', label: 'Renaissance', prompt: 'a classical Renaissance painting style with chiaroscuro lighting' },
  { id: 'sketch', label: 'Pencil Sketch', prompt: 'a detailed pencil sketch drawing with cross-hatching and shading' },
] as const;

// ─── Relight presets ─────────────────────────

export const RELIGHT_PRESETS = [
  { id: 'golden-hour', label: 'Golden Hour', prompt: 'warm golden hour sunset lighting from the left, soft orange glow on skin, dramatic cinematic shadows' },
  { id: 'blue-hour', label: 'Blue Hour', prompt: 'cool blue hour twilight lighting, soft blue ambient glow, moody atmosphere' },
  { id: 'studio', label: 'Studio Light', prompt: 'professional studio lighting with softbox, clean even illumination, subtle shadows' },
  { id: 'neon', label: 'Neon Glow', prompt: 'colorful neon lighting from multiple sources — pink, blue, and purple neon glow on skin' },
  { id: 'natural', label: 'Natural Window', prompt: 'soft natural window lighting from the side, gentle shadows, bright and airy feel' },
  { id: 'dramatic', label: 'Dramatic', prompt: 'dramatic Rembrandt lighting with strong side light and deep shadows, moody' },
  { id: 'ring-light', label: 'Ring Light', prompt: 'beauty ring light creating even front illumination with circular catchlights in eyes' },
  { id: 'candle', label: 'Candlelight', prompt: 'warm candlelight illumination, soft flickering warm tones, intimate atmosphere' },
] as const;

// ─── Scene presets ───────────────────────────

export const SCENE_PRESETS = [
  { id: 'tokyo', label: 'Tokyo Night', prompt: 'a busy Tokyo street at night with neon signs, rain-wet pavement, and colorful reflections' },
  { id: 'paris-cafe', label: 'Paris Café', prompt: 'a cozy Parisian café with warm ambient lighting, vintage posters on walls, coffee on table' },
  { id: 'beach-sunset', label: 'Beach Sunset', prompt: 'a tropical beach at sunset with golden sky, gentle waves, and palm tree silhouettes' },
  { id: 'nyc-rooftop', label: 'NYC Rooftop', prompt: 'a Manhattan rooftop with the city skyline at dusk and warm ambient lights' },
  { id: 'gym', label: 'Gym', prompt: 'a modern gym with equipment, mirrors, and motivational atmosphere' },
  { id: 'pool', label: 'Pool Party', prompt: 'a luxury poolside with turquoise water, lounge chairs, and tropical vibes' },
  { id: 'forest', label: 'Forest', prompt: 'a lush green forest with dappled sunlight filtering through the trees' },
  { id: 'studio-white', label: 'White Studio', prompt: 'a clean white photography studio with professional lighting' },
  { id: 'nightclub', label: 'Nightclub', prompt: 'a nightclub with colorful laser lights, smoke machine atmosphere, and a dance floor' },
  { id: 'library', label: 'Library', prompt: 'an elegant old library with wooden bookshelves, warm reading lamp, and leather chairs' },
] as const;
