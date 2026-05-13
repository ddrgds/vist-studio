/**
 * editFallback — single entry point for the post-NB2 fallback in premium apps.
 *
 * Strategy: NB2 is primary (multi-ref, safety_tolerance:6). When NB2 rejects
 * or returns empty, we fall back to ONE of:
 *   - Wan 2.7 Image Pro (Replicate)  — DEFAULT 2026-05-09. Multi-ref up to 9,
 *                                      2K output, passes spicy AND preserves
 *                                      identity literally on real characters.
 *   - Seedream v5 Lite Edit (fal.ai) — multi-ref + cheaper, but tones down spicy
 *                                      interpretation slightly. Good triple fallback.
 *   - Grok Imagine quality/edit       — single image, content policy tighter,
 *                                      auto-rewriter via Gemini Flash Lite.
 *
 * To swap engines: change `FALLBACK_ENGINE` below and redeploy. All three
 * implementations stay in tree so we can revert quickly.
 */

import { editImageWithSeedream5, editImageWithGrokFal, editWithFlux2Klein, editWithFlux2ProUrl, editWithFlux2Max, buildFlux2NativePrompt, type Flux2NativeSpec } from './falService';
import { editWithWan27Pro, editWithFlux2ProReplicate, editWithFlux2MaxReplicate } from './replicateService';
import { adaptPromptForFlux2Safe } from './fluxPromptAdapter';
import { normalizeForBothEnginesSafe } from './aiPromptAdapter';

/**
 * Pick which engine handles the post-NB2 fallback. Bench history:
 *   - 'flux2-pro-rep' → Flux 2 Pro Edit via REPLICATE (DEFAULT 2026-05-12)
 *                       kkkk-bench validated: 9.5/10 identity + matte fabric +
 *                       cutouts pass content filter where fal rejects.
 *                       ~25-30s, ~$0.06 (vs fal Pro $0.10). All non-spicy +
 *                       most spicy passes with safety_tolerance: 5.
 *   - 'flux2-pro'    → Flux 2 Pro Edit via fal (third fallback when Replicate down)
 *   - 'flux2-klein'  → Flux 2 Klein 9B Edit via fal (Express tier, ~$0.05, 4-10s)
 *   - 'wan'          → Wan 2.7 Image Pro Replicate (legacy, DashScope moderation)
 *   - 'seedream'     → Seedream v5 Lite (last resort, accepts everything)
 *   - 'grok'         → Grok Quality (tight policy, kept for non-spicy)
 */
export type FallbackEngine = 'flux2-pro-rep' | 'flux2-klein' | 'flux2-pro' | 'wan' | 'seedream' | 'grok';
// Switched to flux2-pro-rep 2026-05-12 — Replicate Pro/Max permissive moderation +
// Haiku prompt adapter combined produce IG-grade outputs consistently. fal Pro
// kept as third-tier fallback when Replicate has outages.
export const FALLBACK_ENGINE: FallbackEngine = 'flux2-pro-rep';

export interface EditFallbackParams {
  baseImage: File;
  /** Flat-prose instruction (works for all engines). */
  flatInstruction: string;
  /** Identity reference images. Klein/Pro: 9 max. Wan: 8 max. Seedream: 9 max. Grok: ignored. */
  referenceImages?: File[];
  onProgress?: (percent: number) => void;
  abortSignal?: AbortSignal;
  /** Aspect ratio passed through to engines that accept it (Klein/Pro). */
  aspectRatio?: string;
  /** Premium tier — overrides default to Flux 2 Pro for higher ref-context fidelity. */
  tier?: 'standard' | 'premium';
  /**
   * Optional Flux-native spec. When provided AND the routed engine is a Flux 2
   * variant (Klein / Pro / Max), we BUILD a BFL-format prompt from this spec
   * instead of converting `flatInstruction`. Improves identity + style adherence.
   * When absent, falls back to `flatInstruction` + heuristic `formatPromptForFlux2`.
   */
  flux2Spec?: Flux2NativeSpec;
  /**
   * Optional character anchor (characteristics) to feed into the Haiku
   * normalizer for sanitization. When provided, the same anchor key is used
   * upstream by editWithNB2Fal — cache hit makes the second Haiku call free.
   */
  characterAnchor?: string;
}

/**
 * Reference discipline guard — same logic as falService.editWithNB2Fal.
 * When refs exist AND the instruction does NOT request outfit/face/scene
 * changes, models majority-vote the refs over the base. This clause forces
 * the model to keep Figure 1's outfit/scene/pose authoritative.
 *
 * Centralized here so both NB2 (via falService) and the Wan/Seedream/Grok
 * fallbacks share the exact same discipline. Fix from 2026-05-12 audit.
 */
function applyRefDiscipline(instruction: string, refCount: number): string {
  if (refCount === 0) return instruction;
  const wantsOutfitChange = /\b(outfit|garment|clothing|tryon|try-on|wear|wardrobe|prenda|ropa)\b/i.test(instruction);
  const wantsFaceChange = /\b(face\s*swap|faceswap|swap.*face|reemplaz.*rostro|cambio de rostro)\b/i.test(instruction);
  const wantsSceneChange = /\b(scene|background|fondo|escenario|location|composite)\b/i.test(instruction);
  if (wantsOutfitChange || wantsFaceChange || wantsSceneChange) return instruction;
  return `${instruction} REFERENCE DISCIPLINE: Figure 1 is the AUTHORITATIVE source of outfit, pose, scene, lighting, and composition — keep all of those EXACTLY as they appear in Figure 1. Figures 2+ are IDENTITY-ONLY (face geometry, skin texture, body proportions). Do NOT copy the outfit, pose, background, or composition from the references into the output.`;
}

/**
 * Run the configured fallback engine and return result image URL(s).
 * Throws AbortError if cancelled, otherwise the underlying engine error.
 */
export async function editFallback(p: EditFallbackParams): Promise<string[]> {
  const refCount = p.referenceImages?.length ?? 0;
  const disciplinedInstruction = applyRefDiscipline(p.flatInstruction, refCount);

  // Build the prompt to send to Flux. Three paths in priority order:
  //   1. If caller passed a structured `flux2Spec` → use buildFlux2NativePrompt
  //      (deterministic, no Haiku call needed)
  //   2. Else → unified canonical normalizer (same Haiku call as NB2 primary
  //      via shared cache — second invocation is a free Map lookup). Strip
  //      `never_add` since Flux ignores negatives per BFL docs.
  //   3. Fallback to legacy Flux adapter if normalizer throws.
  const buildFluxInstruction = async (): Promise<string> => {
    if (p.flux2Spec) {
      return buildFlux2NativePrompt({ ...p.flux2Spec, refCount });
    }
    const { prompt: normalized, adapted } = await normalizeForBothEnginesSafe(
      p.flatInstruction,
      {
        refCount,
        characterAnchor: p.characterAnchor,
        aspectRatio: p.aspectRatio,
      },
    );
    if (adapted) {
      // Replicate's stripNeverAddForFlux runs inside the editWithFlux2* funcs,
      // so we can pass the normalized JSON through as-is.
      return normalized;
    }
    // Final degraded fallback: legacy Flux narrative adapter.
    const { prompt } = await adaptPromptForFlux2Safe(disciplinedInstruction, {
      refCount,
      characterAnchor: p.characterAnchor,
      aspectRatio: p.aspectRatio,
      skinRecipe: 'ig-clean',
    });
    return prompt;
  };

  // Premium tier override — pin Flux 2 Max via Replicate (HERO Pro).
  // kkkk-bench validated: 9.5/10 identity + creative bonus details.
  if (p.tier === 'premium') {
    const fluxPrompt = await buildFluxInstruction();
    return editWithFlux2MaxReplicate(
      p.baseImage,
      fluxPrompt,
      p.referenceImages || [],
      p.onProgress,
      { aspectRatio: p.aspectRatio },
      p.abortSignal,
    );
  }

  // Standard tier — uses configured FALLBACK_ENGINE.
  if (FALLBACK_ENGINE === 'flux2-pro-rep') {
    const fluxPrompt = await buildFluxInstruction();
    return editWithFlux2ProReplicate(
      p.baseImage,
      fluxPrompt,
      p.referenceImages || [],
      p.onProgress,
      { aspectRatio: p.aspectRatio },
      p.abortSignal,
    );
  }

  if (FALLBACK_ENGINE === 'flux2-klein') {
    const fluxPrompt = await buildFluxInstruction();
    return editWithFlux2Klein(
      p.baseImage,
      fluxPrompt,
      p.referenceImages || [],
      p.onProgress,
      { aspectRatio: p.aspectRatio },
      p.abortSignal,
    );
  }

  if (FALLBACK_ENGINE === 'flux2-pro') {
    const fluxPrompt = await buildFluxInstruction();
    return editWithFlux2ProUrl(
      p.baseImage,
      fluxPrompt,
      p.referenceImages || [],
      p.onProgress,
      { aspectRatio: p.aspectRatio },
      p.abortSignal,
    );
  }

  if (FALLBACK_ENGINE === 'wan') {
    // Wan 2.7 Pro Replicate — handles spicy + multi-ref + identity beautifully.
    // No prompt rewriting needed: Wan respects literal intent.
    return editWithWan27Pro(
      p.baseImage,
      disciplinedInstruction,
      p.referenceImages || [],
      p.onProgress,
      p.abortSignal,
    );
  }

  if (FALLBACK_ENGINE === 'grok') {
    // LLM-based content policy rewrite via Gemini Flash Lite. Adapts to
    // Grok's policy without hardcoded keyword lists. ~250-500ms extra.
    const { rewriteForGrok } = await import('./promptCompiler');
    const rewritten = await rewriteForGrok(disciplinedInstruction);
    return editImageWithGrokFal(
      p.baseImage,
      rewritten,
      p.onProgress,
      p.abortSignal,
      p.referenceImages,
      true, // bypassCompiler — already optimized prose
    );
  }

  // 'seedream' default fallback. Pass prose unchanged — already optimized.
  return editImageWithSeedream5(
    p.baseImage,
    disciplinedInstruction,
    p.referenceImages || [],
    p.onProgress,
    undefined,
    p.abortSignal,
  );
}

/** Friendly engine name for logs / future telemetry. */
export const FALLBACK_ENGINE_NAME =
  FALLBACK_ENGINE === 'flux2-pro-rep' ? 'flux-2-pro-replicate'
  : FALLBACK_ENGINE === 'flux2-klein' ? 'flux-2-klein-9b-edit'
  : FALLBACK_ENGINE === 'flux2-pro'   ? 'flux-2-pro-edit-fal'
  : FALLBACK_ENGINE === 'wan'         ? 'wan-2.7-image-pro'
  : FALLBACK_ENGINE === 'grok'        ? 'grok-imagine-quality'
  : 'seedream-v5-lite';

/** @deprecated — kept for backward compatibility with old import paths. */
export const USE_GROK_FALLBACK = (FALLBACK_ENGINE as FallbackEngine) === 'grok';
