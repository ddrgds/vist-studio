/**
 * safetyService — client-side wrapper around the /safety-check Cloudflare Function.
 *
 * Strategy: classify the OUTPUT of generation post-hoc. If the score crosses the
 * mode threshold, the output is rejected and credits are refunded by the caller.
 *
 * Modes:
 *   - 'standard' threshold 0.30 → blocks anything sensual (default)
 *   - 'creator'  threshold 0.70 → allows lingerie/boudoir, blocks topless/explicit
 *
 * Fail-open philosophy: if the classifier is unavailable, we ALLOW the image.
 * This avoids punishing legitimate users for service outages. Track failures
 * server-side for monitoring.
 */

export type ContentMode = 'standard' | 'creator'

export interface SafetyResult {
  allowed: boolean
  score: number
  /** safe | sensual | topless | explicit | unknown */
  label: 'safe' | 'sensual' | 'topless' | 'explicit' | 'unknown'
  threshold: number
  mode: ContentMode
  error?: string
}

/**
 * Check if an image (by URL) is safe to display under the given content mode.
 * Returns immediately if classifier fails (fail-open).
 *
 * Typical latency: 1-3s.
 */
export async function checkImageSafety(
  imageUrl: string,
  mode: ContentMode = 'standard',
): Promise<SafetyResult> {
  try {
    const res = await fetch('/safety-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, mode }),
    })
    if (!res.ok) {
      // Fail open
      return { allowed: true, score: 0, label: 'unknown', threshold: 0, mode, error: `http_${res.status}` }
    }
    return await res.json() as SafetyResult
  } catch (e) {
    return { allowed: true, score: 0, label: 'unknown', threshold: 0, mode, error: String(e) }
  }
}

/**
 * Batch check — useful for character sheets or multi-variant generations.
 * Returns array same length as input. Failures don't block other items.
 */
export async function checkImagesBatch(
  imageUrls: string[],
  mode: ContentMode = 'standard',
): Promise<SafetyResult[]> {
  return Promise.all(imageUrls.map(url => checkImageSafety(url, mode)))
}
