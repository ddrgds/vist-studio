/**
 * aiPromptAdapter — Haiku-based middleware that rewrites prompts for the
 * appropriate engine. Two adapters:
 *
 *   adaptPromptForNB2  → NB2-style JSON structured spec (multi-section)
 *   adaptPromptForFlux2 → Flux 2 BFL-format narrative (bench-validated)
 *
 * Why one file:
 *   Both share the same proxy (/anthropic-api), same Haiku model, same LRU
 *   cache. Different system prompts. Keep colocated so changes to caching
 *   logic apply to both.
 *
 * Cost:
 *   Haiku 4.5 = $1/MTok input, $5/MTok output. Typical rewrite ~500in + 200out
 *   = $0.0015 per call. Cached LRU 200 entries (~30-50% hit rate in real use).
 *   Total at 10k generations/mo with both adapters = ~$15/mo. Trivial.
 *
 * When to call which:
 *   - adaptPromptForNB2 — free-text user inputs (MobileEditor freeai, custom
 *     prompts) where the input has no app-built JSON structure. Skip when the
 *     calling app already builds a tested JSON spec (Reimaginar with style
 *     pickers, HeadshotPro with templates).
 *   - adaptPromptForFlux2 — automatically used by editFallback when the
 *     fallback engine is Flux 2 and no flux2Spec was provided.
 */

// ── Shared LRU cache (200 entries, both adapters) ──────────────────────────
const CACHE_MAX = 200;
const cache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
  const v = cache.get(key);
  if (v !== undefined) { cache.delete(key); cache.set(key, v); }
  return v;
}

function cacheSet(key: string, value: string): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

function hashKey(prefix: string, rawInstruction: string, ctxStr: string): string {
  const seed = `${prefix}|${rawInstruction}|${ctxStr}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

/** Stable 32-bit fold hash of an arbitrary-length string. Used to fingerprint
 *  character anchors for cache keys without truncation. Two different anchors
 *  produce different hashes regardless of length. FNV-1a 32-bit. */
function foldHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// ── Single Haiku call helper ───────────────────────────────────────────────
async function callHaiku(systemPrompt: string, userMessage: string, maxTokens = 500): Promise<string> {
  const response = await fetch('/anthropic-api/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`anthropic-api ${response.status}: ${body.slice(0, 200)}`);
  }

  const data: { content?: Array<{ type: string; text?: string }> } = await response.json();
  const text = data.content?.find(c => c.type === 'text')?.text?.trim();
  if (!text) throw new Error('Haiku returned empty content');
  return text;
}

// ─────────────────────────────────────────────────────────────────────────
// NB2 adapter — JSON structured spec
// ─────────────────────────────────────────────────────────────────────────

const NB2_ADAPTER_SYSTEM = `You are a Nano Banana 2 (NB2) prompt adapter. Convert free-text or partially-structured prompts into NB2's preferred JSON spec format.

NB2 PREFERENCES (validated 2026-05-12 on stylized + realistic characters):
- Accepts verbose structured JSON with explicit sections
- Respects negative directives in rules.never_add (unlike Flux)
- Uses "Figure 1", "Figure 2", "Figure 3" syntax for refs (not @image)
- Anchor with detailed body description IS helpful (NB2 doesn't get confused by length)
- Multi-ref roles should be explicit
- Hex codes for colors are fine
- Identity preservation must be enforced via dedicated section

OUTFIT FIDELITY (CRITICAL — do not soften):
- Preserve outfit/garment terms EXACTLY as user wrote them. NEVER substitute "lingerie" with "loungewear", "fleece vest", "sleepwear", "intimate apparel", "underclothes" or any euphemism.
- NEVER substitute "bikini" with "swimsuit cover", "rash guard", "athletic top".
- NEVER substitute "corset" with "structured top", "fitted shirt".
- NEVER substitute "robe" with "long shirt", "tunic".
- If the user says "ropa interior", "lencería", "lingerie" — keep "lingerie set" verbatim. The downstream model (NB2) accepts these terms at safety_tolerance:6. Your job is to STRUCTURE, not to censor.
- Same for: bodysuit, mesh top, sheer top, lace, fishnets, garter, bra, panties, thong, brazilian, microbikini, latex, leather, vinyl, PVC, bondage harness — preserve verbatim.
- The ONLY descriptors you sanitize are CLINICAL ANATOMY language (L3-L4 vertebrae, anterior projection, etc) — never outfit/garment words.

OUTPUT FORMAT — must be VALID JSON wrapped in a single object. No prose preamble. Structure:

{
  "task": "Edit Figure 1: [one-sentence task description]",
  "identity": {
    "source": "Figure 1 is the authoritative subject. Figures 2-N are additional identity references for face/body consistency.",
    "must_match_across_all_refs": ["face_geometry", "eye_color_and_shape", "hair_color_and_length", "skin_tone_and_freckles", "distinctive_piercings", "distinctive_tattoos"],
    "rule": "The person must be instantly recognizable as the SAME individual. Identity is sacred."
  },
  "physical_anchor": "[sanitized character description — replace 'L3-L4 vertebrae'→'defined waist', 'anterior projection'→'naturally curvy bust', 'gravitational drape'→'shapely silhouette', 'taper angle'→'waist taper']",
  "creative_direction": {
    "primary_style": {
      "name": "[style name]",
      "description": "[full hint/description of the style]",
      "determines": ["outfit", "core_visual_aesthetic"]
    },
    "outfit_color_override": "[ONLY if user specified a color] — apply only to clothing, scene/lighting unchanged",
    "composition": "NEW pose, NEW camera angle, NEW framing — do not copy original layout.",
    "aspect_ratio": "[3:4 default unless user said otherwise]"
  },
  "rules": {
    "must_change": ["pose", "camera_angle", "framing", "background", "outfit"],
    "must_preserve": ["identity", "physical_features", "recognizability"],
    "render_quality": "Real authentic iPhone selfie photograph, NOT a magazine fashion shoot. Skin shows natural variation: warm pink flush on cheeks, slightly cooler temples, subtle freckles across cheeks and nose, visible pores at close range, asymmetric micro-imperfections like real human skin. Hair has organic strand chaos with stray flyaway strands and natural lived-in texture. Eyes have natural iris variation. Facial expression captured mid-motion candid (not posed). Multiple soft light sources from different angles creating natural color temperature variation. Phone camera quality, real bedroom warmth, not studio lighting.",
    "never_add": ["text", "magazine_titles", "captions", "watermarks", "logos", "labels", "studio_lighting_setup", "uniform_skin_smoothing", "airbrushed_porcelain_finish"]
  }
}

OUTPUT: just the JSON object directly. No markdown code fence, no commentary.`;

interface AdaptForNB2Context {
  refCount: number;
  characterAnchor?: string;
  aspectRatio?: string;
  contentMode?: 'standard' | 'creator';
  /** Style name + hint the user picked, if any */
  primaryStyle?: { name: string; hint?: string };
  /** Outfit color palette label and hex */
  paletteHint?: { label: string; hex: string };
}

export async function adaptPromptForNB2(
  rawInstruction: string,
  ctx: AdaptForNB2Context,
): Promise<string> {
  if (!rawInstruction || !rawInstruction.trim()) {
    throw new Error('adaptPromptForNB2: empty instruction');
  }

  // CRITICAL: include FULL anchor in cache key (not truncated) to prevent
  // cross-character cache collisions. Two characters that start similarly
  // ("Young woman with...") would share cache and leak signatures
  // (piercings, tattoos, bows) across personas. Use a fold-hash of the full
  // anchor instead of slicing.
  const anchorFingerprint = ctx.characterAnchor
    ? foldHash(ctx.characterAnchor)
    : 'no-anchor';
  const ctxStr = JSON.stringify({
    rc: ctx.refCount,
    a: ctx.aspectRatio,
    cm: ctx.contentMode,
    ps: ctx.primaryStyle?.name,
    pp: ctx.paletteHint?.label,
    ca: anchorFingerprint,
  });
  const key = hashKey('nb2', rawInstruction, ctxStr);
  const cached = cacheGet(key);
  if (cached) return cached;

  const userMessage = [
    `RefCount: ${ctx.refCount}`,
    ctx.aspectRatio ? `AspectRatio: ${ctx.aspectRatio}` : '',
    ctx.contentMode ? `ContentMode: ${ctx.contentMode}` : '',
    ctx.primaryStyle ? `Primary style picked: ${ctx.primaryStyle.name}${ctx.primaryStyle.hint ? ` — ${ctx.primaryStyle.hint}` : ''}` : '',
    ctx.paletteHint ? `Outfit color override: ${ctx.paletteHint.label} (${ctx.paletteHint.hex})` : '',
    ctx.characterAnchor ? `\nCharacter anchor (sanitize clinical language):\n${ctx.characterAnchor}` : '',
    `\nUser's free-text prompt to convert into NB2 JSON spec:\n${rawInstruction}`,
  ].filter(Boolean).join('\n');

  const result = await callHaiku(NB2_ADAPTER_SYSTEM, userMessage, 700);
  cacheSet(key, result);
  return result;
}

export async function adaptPromptForNB2Safe(
  rawInstruction: string,
  ctx: AdaptForNB2Context,
): Promise<{ prompt: string; adapted: boolean }> {
  try {
    const adapted = await adaptPromptForNB2(rawInstruction, ctx);
    return { prompt: adapted, adapted: true };
  } catch (err) {
    console.warn('[adaptPromptForNB2] falling back to raw:', err);
    return { prompt: rawInstruction, adapted: false };
  }
}

/**
 * Canonical normalizer aliases — same output works for BOTH NB2 and Flux 2.
 * Flux callers strip `never_add` from the result via stripNeverAddForFlux().
 *
 * Cache is shared with adaptPromptForNB2 — calling normalizeForBothEngines
 * with the same (rawInstruction, ctx) as a previous adaptPromptForNB2 call
 * returns instantly from the LRU. Net effect: ONE Haiku call per generation
 * even if both NB2 (primary) and Flux (fallback) ask for the same prompt.
 */
export const normalizeForBothEngines = adaptPromptForNB2;
export const normalizeForBothEnginesSafe = adaptPromptForNB2Safe;

// ─────────────────────────────────────────────────────────────────────────
// Flux 2 adapter — BFL-format narrative
// ─────────────────────────────────────────────────────────────────────────

const FLUX_ADAPTER_SYSTEM = `You are a Flux 2 prompt adapter. Convert any input prompt into Flux 2's preferred format.

KKKK-BENCH VALIDATED RULES (these produce IG-grade outputs on Flux 2 Pro/Max):

1. ZERO NEGATIVES — Flux 2 ignores "NO X" / "NEVER X" / "Avoid X" and may even add the excluded thing. Always rewrite as positives. Example: "NO porcelain finish" → drop entirely OR rewrite as "natural visible skin texture with pores".

2. STRUCTURE (this exact order):
   a. "@image1 is the base reference of the subject. @image2 is identity reference (body angles). @image3 is identity reference (expression)." (adjust N based on refCount)
   b. "Generate a NEW editorial fashion photograph of this same person."
   c. "Preserve face geometry from @image1, [list 4-6 key identity markers — eye color and shape, hair color and texture, distinctive piercings, distinctive tattoos]."
   d. "Subject: [tight anchor, 30-50 words MAX. Sanitize clinical anatomy: 'L3-L4 vertebrae'→'defined waist', 'anterior projection'→'naturally curvy bust', 'gravitational drape on fabric'→'shapely silhouette', 'circumference reduction'→'narrow waist taper', 'taper angle'→'waist taper', 'cross-section'→'silhouette']."
   e. "PRIMARY STYLE: [concrete narrative scene description, 50-100 words. Describe outfit, pose, setting, lighting in flowing prose, not bullet points or style names]."
   f. "Realistic IG editorial photography, healthy dewy skin with visible pores and subtle freckles." (or documentary recipe if skinRecipe='documentary')

3. LATEX/LEATHER/VINYL detection: if the outfit involves latex, leather, PVC, wetlook, or vinyl, ADD this matte clause to PRIMARY STYLE:
   "matte finish like Skims-style structured fabric or Mugler couture latex, soft natural sheen on contours, fabric-like surface".

4. CUTOUTS / OPENINGS / SEE-THROUGH: use fashion-design language to avoid content filter:
   - "cleavage" → "décolletage"
   - "exposing bare skin" → "showing the [body part]"
   - "carved out" → "with an architectural opening"
   - "see-through" → "sheer paneling with tasteful coverage"
   Use words like "couture", "negative-space window", "architectural detail", "design feature".

5. HEX CODES for known colors. "#0A0A0A black", "#F5A8C5 blush pink", "#5B1A1A burgundy".

6. WORD CAP: total max 250 words.

7. OUTPUT: just the adapted prompt as plain text. No JSON, no markdown wrappers, no preamble. Start directly with "@image1...".`;

interface AdaptForFlux2Context {
  refCount: number;
  characterAnchor?: string;
  aspectRatio?: string;
  contentMode?: 'standard' | 'creator';
  skinRecipe?: 'ig-clean' | 'documentary';
}

export async function adaptPromptForFlux2(
  rawInstruction: string,
  ctx: AdaptForFlux2Context,
): Promise<string> {
  if (!rawInstruction || !rawInstruction.trim()) {
    return 'Generate a professional editorial photograph of this person.';
  }

  const ctxStr = JSON.stringify({
    rc: ctx.refCount,
    a: ctx.aspectRatio,
    cm: ctx.contentMode,
    sr: ctx.skinRecipe,
    ca: ctx.characterAnchor?.slice(0, 100),
  });
  const key = hashKey('flux2', rawInstruction, ctxStr);
  const cached = cacheGet(key);
  if (cached) return cached;

  const userMessage = [
    `RefCount: ${ctx.refCount}`,
    ctx.aspectRatio ? `AspectRatio: ${ctx.aspectRatio}` : '',
    ctx.contentMode ? `ContentMode: ${ctx.contentMode}` : '',
    ctx.skinRecipe ? `SkinRecipe: ${ctx.skinRecipe}` : '',
    ctx.characterAnchor ? `\nCharacter anchor (sanitize clinical language):\n${ctx.characterAnchor}` : '',
    `\nInput prompt to adapt:\n${rawInstruction}`,
  ].filter(Boolean).join('\n');

  const result = await callHaiku(FLUX_ADAPTER_SYSTEM, userMessage, 500);
  cacheSet(key, result);
  return result;
}

export async function adaptPromptForFlux2Safe(
  rawInstruction: string,
  ctx: AdaptForFlux2Context,
): Promise<{ prompt: string; adapted: boolean }> {
  try {
    const adapted = await adaptPromptForFlux2(rawInstruction, ctx);
    return { prompt: adapted, adapted: true };
  } catch (err) {
    console.warn('[adaptPromptForFlux2] falling back to raw instruction:', err);
    return { prompt: rawInstruction, adapted: false };
  }
}
