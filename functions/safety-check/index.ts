// Cloudflare Pages Function — NSFW safety classifier proxy
// POST /safety-check  body: { imageUrl: string, mode: 'standard' | 'creator' }
// Returns: { allowed: boolean, score: number, label: string, threshold: number }
//
// Uses fal-ai/safety-checker (CLIP-based NSFW classifier).
// Threshold:
//   - standard mode: 0.30 (strict, blocks anything sensual)
//   - creator mode: 0.70 (allows lingerie/swimwear/boudoir, blocks topless/explicit)
//
// This is the "policy enforcement" layer. Output that exceeds threshold
// is rejected and credits should be refunded by the caller.

interface Env {
  FAL_KEY: string;
}

interface SafetyCheckRequest {
  imageUrl: string;
  mode?: 'standard' | 'creator';
}

interface SafetyCheckResponse {
  allowed: boolean;
  score: number;
  label: string;
  threshold: number;
  mode: 'standard' | 'creator';
}

const THRESHOLDS: Record<'standard' | 'creator', number> = {
  standard: 0.30,
  creator:  0.70,
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: SafetyCheckRequest;
  try {
    body = await request.json() as SafetyCheckRequest;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.imageUrl || typeof body.imageUrl !== 'string') {
    return json({ error: 'imageUrl required' }, 400);
  }

  const mode = body.mode === 'creator' ? 'creator' : 'standard';
  const threshold = THRESHOLDS[mode];

  // Call fal-ai/safety-checker — submits + polls in single async pattern
  try {
    const submitRes = await fetch('https://queue.fal.run/fal-ai/safety-checker', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: body.imageUrl }),
    });
    if (!submitRes.ok) {
      // Fail open: on classifier error, ALLOW the image (don't block legitimate users
      // because safety service is down). Log for monitoring.
      console.error('safety-check submit failed:', submitRes.status, await submitRes.text());
      return json({ allowed: true, score: 0, label: 'unknown', threshold, mode, error: 'classifier_unavailable' } as SafetyCheckResponse & { error: string });
    }
    const submitData = await submitRes.json() as { response_url?: string };
    if (!submitData.response_url) {
      return json({ allowed: true, score: 0, label: 'unknown', threshold, mode, error: 'no_response_url' } as SafetyCheckResponse & { error: string });
    }

    // Poll for result (max 8s — safety classifier is fast, ~1-2s typical)
    const start = Date.now();
    while (Date.now() - start < 8000) {
      await new Promise(r => setTimeout(r, 500));
      const r = await fetch(submitData.response_url, {
        headers: { 'Authorization': `Key ${env.FAL_KEY}` },
      });
      if (r.ok) {
        const data = await r.json() as { nsfw_probability?: number };
        const score = data.nsfw_probability ?? 0;
        const allowed = score < threshold;
        const label = score < 0.30 ? 'safe' : score < 0.70 ? 'sensual' : score < 0.85 ? 'topless' : 'explicit';
        return json({ allowed, score, label, threshold, mode } as SafetyCheckResponse);
      }
      if (r.status !== 400) { // 400 = still processing
        console.error('safety-check poll failed:', r.status);
        return json({ allowed: true, score: 0, label: 'unknown', threshold, mode, error: 'poll_failed' } as SafetyCheckResponse & { error: string });
      }
    }
    // Timeout — fail open
    return json({ allowed: true, score: 0, label: 'unknown', threshold, mode, error: 'timeout' } as SafetyCheckResponse & { error: string });
  } catch (e) {
    console.error('safety-check error:', e);
    return json({ allowed: true, score: 0, label: 'unknown', threshold, mode, error: String(e) } as SafetyCheckResponse & { error: string });
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
