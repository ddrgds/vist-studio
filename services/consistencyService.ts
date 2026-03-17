import { fal } from '@fal-ai/client';

// ─────────────────────────────────────────────
// Consistency Service — Face-Consistent Character Generation
//
// Uses PuLID/InstantID on fal.ai to generate images that maintain
// the same face across different scenes, outfits, and poses.
// No custom ComfyUI deployment needed — these are hosted models.
// ─────────────────────────────────────────────

fal.config({ proxyUrl: '/fal-api' });

const unwrap = (result: any): any => result?.data ?? result ?? {};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ConsistencyEngine =
  | 'flux-pulid'       // Best quality, FLUX-based, 1 reference
  | 'pulid-multi'      // Fastest, supports 4 reference images
  | 'instantid'        // Style presets + ControlNet support
  | 'flux-subject';    // Subject preservation across scenes

export interface ConsistencyParams {
  engine: ConsistencyEngine;
  referenceUrls: string[];    // 1-4 face reference image URLs
  prompt: string;
  negativePrompt?: string;
  format?: string;            // 'portrait_4_3', 'square_hd', 'landscape_4_3', etc.
  idWeight?: number;          // 0-1, how strongly to preserve face (default: 0.85)
  style?: string;             // For InstantID: 'Headshot', 'Film Noir', 'Neon', etc.
  steps?: number;
  guidanceScale?: number;
  seed?: number;
}

export interface ConsistencyResult {
  imageUrl: string;
  seed: number;
  engine: ConsistencyEngine;
}

// ─────────────────────────────────────────────
// Format mapping
// ─────────────────────────────────────────────

const FORMAT_MAP: Record<string, string> = {
  '1:1': 'square_hd',
  '3:4': 'portrait_4_3',
  '4:3': 'landscape_4_3',
  '9:16': 'portrait_16_9',
  '16:9': 'landscape_16_9',
};

// ─────────────────────────────────────────────
// FLUX PuLID — Best quality, single reference
// ─────────────────────────────────────────────

async function generateFluxPulid(params: ConsistencyParams): Promise<ConsistencyResult> {
  const result = await fal.subscribe('fal-ai/flux-pulid', {
    input: {
      prompt: params.prompt,
      reference_image_url: params.referenceUrls[0],
      image_size: FORMAT_MAP[params.format ?? '3:4'] || 'portrait_4_3',
      id_weight: params.idWeight ?? 0.85,
      num_inference_steps: params.steps ?? 20,
      guidance_scale: params.guidanceScale ?? 4,
      true_cfg: 1,
      max_sequence_length: '256',
      negative_prompt: params.negativePrompt || 'bad quality, worst quality, text, watermark, deformed face',
      enable_safety_checker: false,
      ...(params.seed ? { seed: params.seed } : {}),
    },
    timeout: 120000,
  });

  const data = unwrap(result);
  return {
    imageUrl: data.images?.[0]?.url,
    seed: data.seed ?? 0,
    engine: 'flux-pulid',
  };
}

// ─────────────────────────────────────────────
// PuLID Multi — Supports 4 reference images, fastest
// ─────────────────────────────────────────────

async function generatePulidMulti(params: ConsistencyParams): Promise<ConsistencyResult> {
  const referenceImages = params.referenceUrls.slice(0, 4).map(url => ({ image_url: url }));

  const result = await fal.subscribe('fal-ai/pulid', {
    input: {
      prompt: params.prompt,
      reference_images: referenceImages,
      image_size: FORMAT_MAP[params.format ?? '3:4'] || 'portrait_4_3',
      id_scale: (params.idWeight ?? 0.85) * 5, // PuLID uses 0-5 scale
      mode: 'fidelity',
      num_inference_steps: params.steps ?? 4,
      guidance_scale: params.guidanceScale ?? 1.2,
      negative_prompt: params.negativePrompt || 'bad quality, worst quality, text, watermark, deformed face',
      enable_safety_checker: false,
      ...(params.seed ? { seed: params.seed } : {}),
    },
    timeout: 60000,
  });

  const data = unwrap(result);
  return {
    imageUrl: data.images?.[0]?.url,
    seed: data.seed ?? 0,
    engine: 'pulid-multi',
  };
}

// ─────────────────────────────────────────────
// InstantID — Style presets + ControlNet
// ─────────────────────────────────────────────

const INSTANTID_STYLES = [
  'Headshot', 'Film Noir', 'Neon', 'Watercolor', 'Comic Book',
  'Digital Art', 'Fantasy', 'Line Art', 'Lowpoly', 'Origami',
] as const;

async function generateInstantId(params: ConsistencyParams): Promise<ConsistencyResult> {
  const result = await fal.subscribe('fal-ai/instantid', {
    input: {
      face_image_url: params.referenceUrls[0],
      prompt: params.prompt,
      style: params.style || 'Headshot',
      ip_adapter_scale: params.idWeight ?? 0.7,
      identity_controlnet_conditioning_scale: 0.7,
      enhance_face_region: true,
      enable_lcm: true,
      num_inference_steps: params.steps ?? 5,
      guidance_scale: params.guidanceScale ?? 1.5,
      negative_prompt: params.negativePrompt || 'bad quality, worst quality, text, watermark',
      enable_safety_checker: false,
      ...(params.seed ? { seed: params.seed } : {}),
    },
    timeout: 60000,
  });

  const data = unwrap(result);
  return {
    imageUrl: data.image?.url || data.images?.[0]?.url,
    seed: data.seed ?? 0,
    engine: 'instantid',
  };
}

// ─────────────────────────────────────────────
// FLUX Subject — Preserve subject in different scenes
// ─────────────────────────────────────────────

async function generateFluxSubject(params: ConsistencyParams): Promise<ConsistencyResult> {
  const result = await fal.subscribe('fal-ai/flux-subject', {
    input: {
      prompt: params.prompt,
      image_url: params.referenceUrls[0],
      image_size: FORMAT_MAP[params.format ?? '3:4'] || 'portrait_4_3',
      num_inference_steps: params.steps ?? 8,
      guidance_scale: params.guidanceScale ?? 3.5,
      ...(params.seed ? { seed: params.seed } : {}),
    },
    timeout: 120000,
  });

  const data = unwrap(result);
  return {
    imageUrl: data.images?.[0]?.url,
    seed: data.seed ?? 0,
    engine: 'flux-subject',
  };
}

// ─────────────────────────────────────────────
// Main entry point — routes to correct engine
// ─────────────────────────────────────────────

export async function generateConsistent(params: ConsistencyParams): Promise<ConsistencyResult> {
  if (!params.referenceUrls || params.referenceUrls.length === 0) {
    throw new Error('At least 1 reference image URL required for consistent generation');
  }

  switch (params.engine) {
    case 'flux-pulid':
      return generateFluxPulid(params);
    case 'pulid-multi':
      return generatePulidMulti(params);
    case 'instantid':
      return generateInstantId(params);
    case 'flux-subject':
      return generateFluxSubject(params);
    default:
      // Default: use flux-pulid for 1 ref, pulid-multi for 2+
      if (params.referenceUrls.length >= 2) {
        return generatePulidMulti(params);
      }
      return generateFluxPulid(params);
  }
}

// ─────────────────────────────────────────────
// Auto-select best engine based on context
// ─────────────────────────────────────────────

export function autoSelectEngine(opts: {
  referenceCount: number;
  needsSpeed?: boolean;
  needsStyle?: boolean;
  style?: string;
}): ConsistencyEngine {
  // Has style preset → InstantID
  if (opts.needsStyle && opts.style) return 'instantid';
  // Multiple references → PuLID Multi (best consistency with 4 refs)
  if (opts.referenceCount >= 2) return 'pulid-multi';
  // Speed priority → PuLID Multi (4 steps vs 20)
  if (opts.needsSpeed) return 'pulid-multi';
  // Default → FLUX PuLID (best quality)
  return 'flux-pulid';
}

// ─────────────────────────────────────────────
// Export style list for UI
// ─────────────────────────────────────────────

export { INSTANTID_STYLES };
