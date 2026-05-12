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

import { editImageWithSeedream5, editImageWithGrokFal } from './falService';
import { editWithWan27Pro } from './replicateService';

/**
 * Pick which engine handles the post-NB2 fallback. Bench-validated 2026-05-09:
 *   - 'wan'      → Wan 2.7 Image Pro Replicate (winner: identity + spicy literal)
 *   - 'seedream' → Seedream v5 Lite (cheaper, tones down spicy)
 *   - 'grok'     → Grok Quality (tighter policy, needs LLM rewriter)
 */
export type FallbackEngine = 'wan' | 'seedream' | 'grok';
export const FALLBACK_ENGINE: FallbackEngine = 'wan';

export interface EditFallbackParams {
  baseImage: File;
  /** Flat-prose instruction (works for both Seedream + Grok). */
  flatInstruction: string;
  /** Identity reference images. Wan: 8 max. Seedream: 9 max. Grok: ignored. */
  referenceImages?: File[];
  onProgress?: (percent: number) => void;
  abortSignal?: AbortSignal;
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
  FALLBACK_ENGINE === 'wan'      ? 'wan-2.7-image-pro'
  : FALLBACK_ENGINE === 'grok'   ? 'grok-imagine-quality'
  : 'seedream-v5-lite';

/** @deprecated — kept for backward compatibility with old import paths. */
export const USE_GROK_FALLBACK = (FALLBACK_ENGINE as FallbackEngine) === 'grok';
