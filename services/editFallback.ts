/**
 * editFallback — single entry point for the post-NB2 fallback in premium apps.
 *
 * Strategy: NB2 is primary (multi-ref, safety_tolerance:6). When NB2 rejects
 * or returns empty, we fall back to ONE of:
 *   - Seedream v5 Lite Edit  (default, multi-ref preserved, safety off)
 *   - Grok Imagine quality/edit  (single image, more expensive)
 *
 * To swap which fallback we use, flip USE_GROK_FALLBACK below. No UI toggle —
 * this is a code-level decision so we can A/B test without exposing engine
 * choice to users.
 */

import { editImageWithSeedream5, editImageWithGrokFal } from './falService';
import { sanitizeForGrok } from './promptBuilder';

/**
 * Toggle between fallback engines.
 *   false → Seedream v5 Lite Edit (recommended: multi-ref + permissive)
 *   true  → Grok Imagine quality/edit (legacy fallback, single image only)
 *
 * Change this value and redeploy to switch. Keep both engines in tree so we
 * can revert quickly if one starts misbehaving.
 */
export const USE_GROK_FALLBACK = false;

export interface EditFallbackParams {
  baseImage: File;
  /** Flat-prose instruction (works for both Seedream + Grok). */
  flatInstruction: string;
  /** Identity reference images. Seedream uses up to 9; Grok ignores them. */
  referenceImages?: File[];
  onProgress?: (percent: number) => void;
  abortSignal?: AbortSignal;
}

/**
 * Run the configured fallback engine and return result image data URLs.
 * Throws AbortError if cancelled, otherwise the underlying engine error.
 */
export async function editFallback(p: EditFallbackParams): Promise<string[]> {
  if (USE_GROK_FALLBACK) {
    // Auto-apply Grok content-policy sanitization + editorial framing wrapper.
    // Apps don't need to think about this — they pass clean prose, we adjust.
    return editImageWithGrokFal(
      p.baseImage,
      sanitizeForGrok(p.flatInstruction),
      p.onProgress,
      p.abortSignal,
      p.referenceImages,
      true, // bypassCompiler — already optimized prose
    );
  }

  // Seedream gets the prose unchanged — it's already optimized for it.
  return editImageWithSeedream5(
    p.baseImage,
    p.flatInstruction,
    p.referenceImages || [],
    p.onProgress,
    undefined, // default guidance
    p.abortSignal,
  );
}

/** Friendly engine name for logs / future telemetry. */
export const FALLBACK_ENGINE_NAME = USE_GROK_FALLBACK ? 'grok-imagine-quality' : 'seedream-v5-lite';
