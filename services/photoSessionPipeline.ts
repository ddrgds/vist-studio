// services/photoSessionPipeline.ts
// Multi-tier photo session pipeline orchestrator.
// Composes existing services into a ComfyUI-inspired workflow:
//   Base Image → Generate Variations → Face Fix → Upscale
//
// The base image is the anchor for identity, outfit, and scene.
// Only the pose/angle changes across shots.

import { SessionPoseItem, AspectRatio } from '../types';
import { FACE_LOCK_PROMPT, OUTFIT_PRESERVE_PROMPT, FACE_CHECK_PROMPT } from '../data/sessionPresets';
import { generatePhotoSession } from './geminiService';
import {
  generatePhotoSessionWithGrok,
  generateWithKontextMulti,
  generateWithLoRA,
  generateWithKleinEditLoRA,
  poseTransferWithLeffa,
  extractPoseSkeleton,
  upscaleWithAuraSR,
} from './falService';
import { realisticSkin } from './toolEngines';
import { splitGrid } from './gridSplitter';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type SessionTier = 'basic' | 'standard' | 'premium';

export interface SessionPipelineConfig {
  tier: SessionTier;
  baseImage: File;                   // Photo base — anchor for identity + outfit + scene
  characterRefs?: Blob[];            // Additional character reference images
  loraUrl?: string;                  // For premium tier
  loraTriggerWord?: string;          // For premium tier
  poses: SessionPoseItem[];          // Individual poses (manual mode) or preset-generated
  realisticMode: boolean;
  renderStyle?: string;              // 'photorealistic' | 'anime' | '3d-render' | etc.
  gridMode: boolean;                 // Generate 2x2 grid → split client-side
  aspectRatio?: AspectRatio;
  scenario?: string;                 // Scene override
  lighting?: string;                 // Lighting override
  upscale?: boolean;                 // Run AuraSR upscale on results
  onProgress?: (step: string, percent: number) => void;
  abortSignal?: AbortSignal;
}

export interface SessionPipelineResult {
  images: string[];                  // Final processed image data URLs
  rawGridUrl?: string;               // Original grid before splitting (if grid mode)
  tier: SessionTier;
  creditsUsed: number;
}

export const SESSION_TIER_COSTS = {
  basic: 6,      // Imagen 4 Fast default
  standard: 14,  // Kontext Pro
  premium: 9,    // Klein Edit+LoRA
  // LoRA training cost: use CREDIT_COSTS['lora-training'] (571) as single source of truth
} as const;

// ─────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────

export const runSessionPipeline = async (
  config: SessionPipelineConfig,
): Promise<SessionPipelineResult> => {
  const { tier, onProgress } = config;

  switch (tier) {
    case 'basic':
      return runBasicTier(config);
    case 'standard':
      return runStandardTier(config);
    case 'premium':
      return runPremiumTier(config);
    default:
      throw new Error(`Unknown tier: ${tier}`);
  }
};

// ─────────────────────────────────────────────
// Tier 1: Basic (NB2 / Gemini)
// Uses generatePhotoSession with FACE LOCK constraints.
// Cheapest — good for quick drafts.
// ─────────────────────────────────────────────

const runBasicTier = async (config: SessionPipelineConfig): Promise<SessionPipelineResult> => {
  const { baseImage, poses, realisticMode, renderStyle, gridMode, scenario, lighting, aspectRatio, upscale, onProgress, abortSignal } = config;

  const shouldApplyRealism = realisticMode && (!renderStyle || renderStyle === 'photorealistic');

  // Build angle descriptions from poses
  const angles = poses.map(p => p.text || 'natural varied pose');

  onProgress?.('Generando fotos...', 10);

  if (gridMode && poses.length === 4) {
    // Grid mode: ask Gemini to generate a 2x2 grid in one call
    const gridPrompt = `A 2x2 grid of 4 different photos of the SAME person from the Base Image.
Top-left: ${angles[0]}. Top-right: ${angles[1]}. Bottom-left: ${angles[2]}. Bottom-right: ${angles[3]}.
${FACE_LOCK_PROMPT}
${OUTFIT_PRESERVE_PROMPT}
SAME face, SAME outfit, SAME location across all 4 photos. Only the pose/angle changes.
${scenario ? `SCENE: ${scenario}` : ''}
${FACE_CHECK_PROMPT}`;

    const results = await generatePhotoSession(baseImage, 1, {
      scenario: gridPrompt,
      lighting,
      aspectRatio: '1:1', // Grid needs square
      realistic: shouldApplyRealism,
      angles: [gridPrompt],
    }, (p) => onProgress?.('Generando grid...', 10 + p * 0.6), abortSignal);

    if (results.length === 0) throw new Error('No se generó el grid.');

    const rawGridUrl = results[0].url;
    onProgress?.('Dividiendo grid...', 70);

    const splitImages = await splitGrid(rawGridUrl, 2, 2);

    // Optional upscale
    let finalImages = splitImages;
    if (upscale) {
      onProgress?.('Upscaling...', 80);
      finalImages = await Promise.all(splitImages.map(img => upscaleWithAuraSR(img)));
    }

    onProgress?.('Listo', 100);
    return { images: finalImages, rawGridUrl, tier: 'basic', creditsUsed: SESSION_TIER_COSTS.basic * 4 };
  }

  // Standard mode: one shot per pose
  const results = await generatePhotoSession(baseImage, poses.length, {
    scenario, lighting, aspectRatio: aspectRatio === AspectRatio.Portrait ? '3:4' : undefined,
    realistic: shouldApplyRealism,
    angles,
  }, (p) => onProgress?.('Generando fotos...', 10 + p * 0.7), abortSignal);

  let finalImages = results.map(r => r.url);

  if (upscale) {
    onProgress?.('Upscaling...', 85);
    finalImages = await Promise.all(finalImages.map(img => upscaleWithAuraSR(img)));
  }

  onProgress?.('Listo', 100);
  return { images: finalImages, tier: 'basic', creditsUsed: SESSION_TIER_COSTS.basic * finalImages.length };
};

// ─────────────────────────────────────────────
// Tier 2: Standard (FLUX Kontext Multi)
// Multi-reference generation for better consistency.
// Routes: image pose → Leffa, text pose → Kontext.
// ─────────────────────────────────────────────

const runStandardTier = async (config: SessionPipelineConfig): Promise<SessionPipelineResult> => {
  const { baseImage, characterRefs, poses, realisticMode, renderStyle, scenario, lighting, upscale, onProgress, abortSignal } = config;

  const shouldApplyRealism = realisticMode && (!renderStyle || renderStyle === 'photorealistic');
  const images: string[] = [];

  for (let i = 0; i < poses.length; i++) {
    if (abortSignal?.aborted) throw new Error('Cancelado');
    const pose = poses[i];
    const poseProgress = (step: string, pct: number) => {
      const overall = Math.round((i / poses.length + pct / 100 / poses.length) * 90) + 5;
      onProgress?.(step, overall);
    };

    if (pose.images.length > 0) {
      // Pose has reference image → use Leffa for skeleton-based pose transfer
      poseProgress('Extrayendo esqueleto...', 10);
      let poseFile = pose.images[0];
      try {
        poseFile = await extractPoseSkeleton(pose.images[0]);
      } catch {
        console.warn('Skeleton extraction failed, using raw pose image');
      }

      poseProgress('Transfiriendo pose...', 30);
      const poseResults = await poseTransferWithLeffa({
        baseImage,
        pose: pose.text || '',
        poseImages: [poseFile],
        accessory: pose.accessory,
        accessoryImages: pose.accessoryImages || [],
        sessionPoses: [],
        usePoseAsOutfit: false,
        imageSize: '1024x1024',
        aspectRatio: '3:4',
        numberOfImages: 1,
        guidanceScale: 3.5,
      } as any, (p) => poseProgress('Generando...', 30 + p * 0.5), abortSignal);

      if (poseResults.length > 0) images.push(poseResults[0]);
    } else {
      // Text-only pose → use Kontext Pro for better consistency
      poseProgress('Generando variación...', 20);
      const { generateWithKontextPro } = await import('./falService');
      const results = await generateWithKontextPro({
        characters: [{ modelImages: [baseImage, ...(characterRefs || [])] }],
        scenario: scenario || undefined,
        pose: pose.text || 'natural varied pose',
        lighting: lighting || undefined,
        numberOfImages: 1,
        guidanceScale: 3.5,
      } as any, (p) => poseProgress('Generando...', 20 + p * 0.6), abortSignal);
      if (results.length > 0) images.push(results[0]);
    }
  }

  if (images.length === 0) throw new Error('No se generaron imágenes.');

  // Optional upscale
  let finalImages = images;
  if (upscale) {
    onProgress?.('Upscaling...', 92);
    finalImages = await Promise.all(images.map(img => upscaleWithAuraSR(img)));
  }

  onProgress?.('Listo', 100);
  return { images: finalImages, tier: 'standard', creditsUsed: SESSION_TIER_COSTS.standard * finalImages.length };
};

// ─────────────────────────────────────────────
// Tier 3: Premium (FLUX + LoRA)
// Maximum consistency via trained LoRA weights.
// Post-process: realistic skin + upscale.
// ─────────────────────────────────────────────

const runPremiumTier = async (config: SessionPipelineConfig): Promise<SessionPipelineResult> => {
  const { baseImage, loraUrl, loraTriggerWord, poses, realisticMode, renderStyle, scenario, lighting, upscale, onProgress, abortSignal } = config;

  if (!loraUrl || !loraTriggerWord) {
    throw new Error('El tier Premium requiere un modelo LoRA entrenado. Entrena uno primero desde la página del personaje.');
  }

  const shouldApplyRealism = realisticMode && (!renderStyle || renderStyle === 'photorealistic');
  const images: string[] = [];

  // Upload base image once if available (for Klein Edit+LoRA)
  let baseImageUrl: string | null = null;
  if (baseImage) {
    try {
      const { uploadToFal } = await import('./toolEngines');
      baseImageUrl = await uploadToFal(baseImage);
    } catch {
      console.warn('Failed to upload base image for Klein Edit+LoRA, falling back to standard LoRA');
    }
  }

  for (let i = 0; i < poses.length; i++) {
    if (abortSignal?.aborted) throw new Error('Cancelado');
    const pose = poses[i];
    const poseProgress = (step: string, pct: number) => {
      const overall = Math.round((i / poses.length + pct / 100 / poses.length) * 70) + 5;
      onProgress?.(step, overall);
    };

    // Build prompt with pose + scene + realism
    const promptParts = [pose.text || 'natural confident pose'];
    if (scenario) promptParts.push(scenario);
    if (lighting) promptParts.push(lighting);
    if (shouldApplyRealism) {
      promptParts.push('Shot on iPhone 15 Pro, natural phone camera quality, real Instagram post aesthetic');
    }
    if (pose.accessory) promptParts.push(`holding or wearing: ${pose.accessory}`);
    const prompt = promptParts.join('. ') + '.';

    poseProgress('Generando con LoRA...', 20);

    let loraResults: string[];
    if (baseImageUrl) {
      // Klein Edit+LoRA — edit base image with LoRA for better consistency
      loraResults = await generateWithKleinEditLoRA(
        baseImageUrl, loraUrl, loraTriggerWord, prompt,
        { imageSize: 'portrait_4_3' },
        (p) => poseProgress('Generando...', 20 + p * 0.5),
        abortSignal,
      );
    } else {
      // Fallback to standard LoRA generation (text-to-image)
      loraResults = await generateWithLoRA(
        loraUrl, loraTriggerWord, prompt,
        { imageSize: 'portrait_4_3', numImages: 1 },
        (p) => poseProgress('Generando...', 20 + p * 0.5),
        abortSignal,
      );
    }

    if (loraResults.length > 0) images.push(loraResults[0]);
  }

  if (images.length === 0) throw new Error('No se generaron imágenes con LoRA.');

  // Post-processing: realistic skin enhancement
  onProgress?.('Mejorando piel...', 78);
  const enhanced: string[] = [];
  for (const img of images) {
    try {
      const result = await realisticSkin(img);
      enhanced.push(result.url);
    } catch {
      enhanced.push(img); // fallback to original if enhance fails
    }
  }

  // Optional upscale
  let finalImages = enhanced;
  if (upscale) {
    onProgress?.('Upscaling...', 92);
    finalImages = await Promise.all(enhanced.map(img => upscaleWithAuraSR(img)));
  }

  onProgress?.('Listo', 100);
  return { images: finalImages, tier: 'premium', creditsUsed: SESSION_TIER_COSTS.premium * finalImages.length };
};
