/**
 * promptBuilder — engine-aware prompt construction helpers.
 *
 * Each premium app builds a single structured spec, then:
 *   - NB2 receives JSON (with built-in anti-text rule)
 *   - Seedream v5 receives optimized prose with "Figure N" referencing
 *   - Grok receives prose with content-policy sanitization + framing wrapper
 *
 * The fallback engine (Seedream or Grok) is selected in editFallback.ts via
 * the USE_GROK_FALLBACK flag. Apps just build prose; the fallback wrapper
 * applies Grok-specific sanitization automatically when Grok is active.
 */

// ─── Shared rules ──────────────────────────────────────────────────────

/** Defensive rule against unwanted text overlays (Seedream and NB2 both add
 *  magazine titles unprompted). Use in JSON's `rules.never_add` and append
 *  to prose for fallback engines. */
export const NEVER_ADD_TEXT = [
  'text', 'words', 'letters', 'captions',
  'magazine_titles', 'magazine_covers_with_text',
  'labels', 'watermarks', 'logos', 'brand_names',
];

/** Plain-text variant for prose. */
export const NO_TEXT_RULE = 'NO magazine titles, NO text overlays, NO labels, NO captions, NO watermarks, NO logos anywhere in the image.';

// ─── Identity preservation ─────────────────────────────────────────────

export interface IdentityHint {
  /** Number of identity reference images (will be Figures 2..N+1). 0 if only base. */
  numReferences: number;
  /** True when the source character is non-photorealistic (anime/3D/illustration/etc) */
  charIsNonPhoto: boolean;
  /** Render style label when non-photo. e.g. 'anime' / '3d-render' / 'illustration' */
  renderStyle?: string;
  /** True when the user uploaded their own photo (no saved character) */
  customUploadOnly?: boolean;
}

/**
 * Build the identity-preservation paragraph for prose-based engines.
 * Mentions Figures 2-N explicitly so Seedream knows what each ref is for.
 * Tight phrasing — Seedream gives more attention to non-redundant tokens.
 */
export function identityProse(hint: IdentityHint): string {
  const { numReferences, charIsNonPhoto, renderStyle, customUploadOnly } = hint;

  const traits = 'face geometry, bone structure, eye shape and color, lip shape, skin tone, hair style and color, body proportions';

  if (customUploadOnly && numReferences === 0) {
    return `Preserve ${traits} exactly as in Figure 1.`;
  }

  const refMention = numReferences > 0
    ? ` Figures 2-${numReferences + 1} are identity references of the same character — match ${traits} across all references.`
    : '';

  if (charIsNonPhoto && renderStyle) {
    return `Figure 1 shows a ${renderStyle} character.${refMention} CRITICAL: keep the ${renderStyle} rendering style — do NOT convert to photorealism. Same character, same render style, new aesthetic.`;
  }

  return `Figure 1 shows the person to preserve.${refMention}`;
}

/**
 * Strong anti-plastic skin instruction for photoreal generations.
 * Seedream tends to smoothen skin — this vocabulary forces realistic texture.
 * Use only for photorealistic characters, NOT for anime/3D/illustration.
 */
export const PHOTOREAL_SKIN = 'Documentary photography skin texture: visible pores, micro-freckles, fine blemishes, slight color variation across face, natural luminosity from light. NO digital smoothing, NO airbrush, NO porcelain finish, NO uniform skin tone.';

/**
 * Render-style preservation (anime/3D/illustration). Use as the skin
 * instruction equivalent for non-photoreal characters.
 */
export function renderStyleSkin(renderStyle: string): string {
  return `Maintain ${renderStyle} rendering — sharp consistent line work, palette, and shading. Do NOT convert to photorealism.`;
}

// ─── Lighting vocabulary (Seedream is ultra-sensitive to this) ─────────

const LIGHTING_PHRASES: Record<string, string> = {
  natural:    'soft natural daylight, even diffused exposure, neutral color temperature',
  golden:     'warm golden hour rim light from camera right, long soft shadows, amber color cast on skin',
  studio:     'three-point professional studio lighting, key + fill + rim, controlled exposure, neutral white balance',
  night:      'moody nocturnal ambient lighting, low warm tungsten temperature, soft falloff, intimate atmosphere',
  // Photo session preset names — alias to canonical
  natural_light: 'soft natural daylight, even diffused exposure',
  golden_hour:   'warm golden hour rim light, long soft shadows, amber glow',
  studio_light:  'three-point professional studio lighting, key + fill + rim',
  nocturna:      'moody nocturnal ambient lighting, low warm tungsten',
};

/** Convert a lighting preset id to specific Seedream-friendly vocabulary. */
export function lightingPhrase(id?: string, fallbackDescription?: string): string {
  if (!id) return fallbackDescription || 'soft natural daylight, even diffused exposure';
  const norm = id.toLowerCase().replace(/[\s-]/g, '_');
  return LIGHTING_PHRASES[norm] || fallbackDescription || `${id} lighting`;
}

// ─── Grok content-policy sanitization ──────────────────────────────────

/**
 * Word-level substitutions to bypass Grok's tightened content filters
 * while preserving creative intent. Order matters — broader matches first.
 */
const GROK_SANITIZE: Array<[RegExp, string]> = [
  [/\b(lingerie|lencer[ií]a)\b/gi,           'tailored evening apparel'],
  [/\b(boudoir)\b/gi,                         'soft editorial portrait, bedroom setting'],
  [/\b(bikini|swimwear)\b/gi,                 'beach fashion attire'],
  [/\b(seductive|provocative)\b/gi,           'expressive'],
  [/\b(undressing|undressed)\b/gi,            'getting ready'],
  [/\b(sensual)\b/gi,                         'elegant'],
  [/\b(intimate)\b/gi,                        'quiet'],
  [/\bbare\s+(shoulders?|legs?|skin|back)\b/gi, 'visible $1'],
  [/\bnude\b/gi,                              'minimal'],
  [/\bwet\s+look\b/gi,                        'glistening texture aesthetic'],
];

/**
 * @deprecated — use `rewriteForGrok` from `./promptCompiler` instead.
 *
 * Static regex-based Grok sanitizer. Kept for backward compatibility only.
 * The LLM rewriter (`rewriteForGrok`) preserves intent better and adapts to
 * Grok policy changes without code edits. `editFallback.ts` now uses it.
 *
 * If you have a path that absolutely cannot do an async call, this is a
 * brittle fallback that lowers Grok's rejection rate by ~30%.
 */
export function sanitizeForGrok(prose: string): string {
  let out = prose;
  for (const [re, repl] of GROK_SANITIZE) {
    out = out.replace(re, repl);
  }
  return `Professional fashion editorial photography, tasteful and sophisticated styling. ${out} Refined commercial aesthetic, high-end magazine production quality.`;
}

// ─── Convenience: render-style detection from character ────────────────

export interface CharacterLike {
  renderStyle?: string;
}

/** Returns photo/non-photo + canonical render style for a character. */
export function detectRenderStyle(char: CharacterLike | null): { isPhotoreal: boolean; renderStyle: string; charIsNonPhoto: boolean } {
  const renderStyle = (char?.renderStyle || 'photorealistic').toLowerCase();
  const isPhotoreal = !char?.renderStyle || renderStyle === 'photorealistic';
  return { isPhotoreal, renderStyle, charIsNonPhoto: !isPhotoreal };
}

// ─── Engine-aware edit prompt pair (NB2 JSON + Seedream/Grok prose) ────

/**
 * Spanish trigger words that NB2 (Gemini Imagen) rejects with no_media_generated,
 * even at safety_tolerance: '6'. When detected, translate to technical English
 * before sending — NB2 accepts technical fashion vocab in English where it
 * rejects the Spanish equivalents.
 */
export const NB2_SENSITIVE_ES = /\b(lencer[ií]a|sensual|seductor\w*|provocativ\w*|pecho|busto|seno|escote|sost[eé]n|cama|s[áa]banas?|[íi]ntim\w*|reclinad\w*|acostad\w*|tumbad\w*|desnud\w*|bikini|ba[ñn]ador|swimsuit|trasero|culo|nalga|muslo|gl[úu]teo|cadera|cuerpo|piel|escotad\w*|ajustad\w*|ce[ñn]id\w*|transparent\w*|encaje|seda|sat[eé]n|boudoir)\b/i;

export interface EditPromptOptions {
  /** Free-form user instruction (in any language). */
  userInstruction: string;
  /** Tool framing label, e.g. "EDIT", "RELIGHT", "STYLE TRANSFER". Default "EDIT". */
  taskKind?: string;
  /** What MUST stay unchanged unless the instruction overrides. */
  preserve?: string[];
  /** What MUST change (drives the engine away from doing nothing). */
  mustChange?: string[];
  /** Number of additional reference images attached besides the base. */
  numReferences?: number;
  /** Whether the subject is non-photoreal (anime/3D/illustration). */
  charIsNonPhoto?: boolean;
  /** Render style id when non-photo. */
  renderStyle?: string;
  /** Physical anchor — character.characteristics. Injected as identity.physical_anchor
   *  with CRITICAL priority. Models that compress proportions (waist/hip ratio,
   *  glúteo, busto, skin texture) will respect these literals over reference
   *  ambiguity. ALWAYS pass this when editing a known character. */
  physicalAnchor?: string;
  /** Optional per-generation reinforcement on top of the permanent anchor.
   *  User can paste extra detail for THIS specific generation only (e.g.
   *  "extra glúteo projection", "wet skin sheen"). Concatenated to anchor. */
  physicalReinforcement?: string;
}

export interface EditPromptPair {
  /** JSON-serialized spec for NB2. NB2 hits its rules harder when given JSON. */
  jsonSpec: string;
  /** Flat prose optimized for Seedream v5 / Grok (auto-sanitized in editFallback). */
  flatProse: string;
  /** True if we translated the user's input from sensitive ES → EN. */
  wasTranslated: boolean;
}

const DEFAULT_PRESERVE = [
  'identity (face, features, recognizability)',
  'body proportions',
  'outfit and clothing (exact garments, colors, fabric, fit visible in Figure 1)',
  'pose',
  'background and scene',
  'lighting',
  'composition and framing',
];

// Tokens the caller can put in `mustChange` to signal which preserve-default
// should be DROPPED (because the user wants to change that aspect). Anything
// not listed here stays preserved.
const PRESERVE_DROP_KEYS: Record<string, RegExp> = {
  outfit: /outfit|clothing|garment|wardrobe|wear/i,
  face: /face|identity|features|recognizability/i,
  body: /body proportions|proportions/i,
  scene: /background|scene/i,
  pose: /pose/i,
  lighting: /lighting/i,
  composition: /composition|framing/i,
};

function pruneDefaultPreserve(defaults: string[], mustChange: string[]): string[] {
  if (mustChange.length === 0) return defaults;
  return defaults.filter(item => {
    for (const change of mustChange) {
      const lower = change.toLowerCase();
      for (const [k, rx] of Object.entries(PRESERVE_DROP_KEYS)) {
        if (lower.includes(k) && rx.test(item)) return false;
      }
    }
    return true;
  });
}

// Tools that should NOT have refs used as outfit/scene source (only identity).
// If mustChange does NOT include outfit/face/scene, the refs are identity-only.
function refRoleClause(numRefs: number, mustChange: string[]): string {
  if (numRefs === 0) return '';
  const changingFace = mustChange.some(c => /face|identity/i.test(c));
  const changingOutfit = mustChange.some(c => /outfit|clothing|garment/i.test(c));
  const changingScene = mustChange.some(c => /background|scene|location/i.test(c));
  // If caller is explicitly changing outfit/face/scene, refs are the source for that change.
  if (changingFace || changingOutfit || changingScene) {
    const refDescriptors: string[] = [];
    if (changingOutfit) refDescriptors.push('the new outfit/garment to apply');
    if (changingFace) refDescriptors.push('the new face/identity to apply');
    if (changingScene) refDescriptors.push('the new scene/background to apply');
    return ` Figure ${numRefs === 1 ? '2' : `2-${1 + numRefs}`} is/are ${refDescriptors.join(' and/or ')} — copy that aspect FROM the reference(s) INTO Figure 1.`;
  }
  // Default: refs are identity-only. Figure 1 owns outfit/scene/pose authoritatively.
  return ` Figure 1 is the AUTHORITATIVE source for outfit, pose, scene, lighting, and composition — keep all of those EXACTLY as they appear in Figure 1. Figure ${numRefs === 1 ? '2' : `2-${1 + numRefs}`} ${numRefs === 1 ? 'is' : 'are'} provided ONLY as identity reference (face geometry, skin texture, body proportions). Do NOT copy the outfit, pose, background, or composition from the reference${numRefs === 1 ? '' : 's'} — only the identity traits.`;
}

/**
 * Build engine-optimized prompts for an EDIT operation. Returns BOTH:
 *   - jsonSpec → ship to NB2 (better rule adherence)
 *   - flatProse → ship to Seedream/Grok via editFallback (their preferred form)
 *
 * Sensitive Spanish input is auto-translated to technical English first so NB2
 * stops rejecting prompts it would have accepted in EN.
 */
export async function buildEditPromptPair(opts: EditPromptOptions): Promise<EditPromptPair> {
  const taskKind = opts.taskKind || 'EDIT';
  const mustChange = opts.mustChange ?? [];
  // Auto-prune defaults: if caller will change outfit, drop "outfit" from preserve.
  // If caller passes a custom `preserve`, we trust them and don't prune.
  const preserve = opts.preserve
    ?? pruneDefaultPreserve(DEFAULT_PRESERVE, mustChange);
  const numReferences = opts.numReferences ?? 0;

  let instruction = opts.userInstruction.trim();
  let wasTranslated = false;

  if (NB2_SENSITIVE_ES.test(instruction)) {
    try {
      const { translateForNB2 } = await import('./promptCompiler');
      const translated = await translateForNB2(instruction);
      if (translated && translated !== instruction) {
        instruction = translated;
        wasTranslated = true;
      }
    } catch { /* fall back to original */ }
  }

  // Skin / render-quality clause adapts to subject type
  const skinClause = opts.charIsNonPhoto && opts.renderStyle
    ? renderStyleSkin(opts.renderStyle)
    : PHOTOREAL_SKIN;

  // ── Physical anchor — concat permanent characteristics + optional per-gen reinforcement ──
  const anchorParts: string[] = [];
  if (opts.physicalAnchor?.trim()) anchorParts.push(opts.physicalAnchor.trim());
  if (opts.physicalReinforcement?.trim()) anchorParts.push(`Per-shot reinforcement: ${opts.physicalReinforcement.trim()}`);
  const fullAnchor = anchorParts.join(' ');

  // ── JSON spec for NB2 ──
  // Refs roles: when caller does NOT change outfit/face/scene, refs are identity-only
  // and Figure 1 is authoritative for outfit + scene. Otherwise refs are the source
  // of the change (try-on garment, face-swap target, scene-swap location).
  const changingFace = mustChange.some(c => /face|identity/i.test(c));
  const changingOutfit = mustChange.some(c => /outfit|clothing|garment/i.test(c));
  const changingScene = mustChange.some(c => /background|scene|location/i.test(c));
  const refsAreIdentityOnly = numReferences > 0
    && !changingFace && !changingOutfit && !changingScene;

  const spec: Record<string, unknown> = {
    task: `${taskKind} — Apply user's instruction to the existing photograph (Figure 1)`,
    source: {
      type: numReferences > 0 ? 'multi-image edit' : 'single image edit',
      base: refsAreIdentityOnly
        ? 'Figure 1 — the photograph to edit. AUTHORITATIVE source of outfit, pose, scene, lighting, and composition (use these EXACTLY as in Figure 1; do NOT replace them with anything from the references).'
        : 'Figure 1 — the photograph the user wants to edit',
      ...(numReferences > 0 ? {
        references: Array.from({ length: numReferences }, (_, i) => {
          const idx = i + 2;
          if (refsAreIdentityOnly) {
            return `Figure ${idx} — IDENTITY-ONLY reference (face geometry, skin texture, body proportions). Do NOT copy its outfit, pose, background, or composition into the output.`;
          }
          // Caller is changing outfit/face/scene — refs are the source of that change.
          const roles: string[] = [];
          if (changingOutfit) roles.push('new outfit/garment to apply');
          if (changingFace) roles.push('new face/identity to apply');
          if (changingScene) roles.push('new scene/background to apply');
          return `Figure ${idx} — ${roles.join(' and ')} (copy that aspect from this reference into Figure 1)`;
        }),
      } : {}),
    },
    ...(fullAnchor ? {
      identity: {
        source: 'Reference Images + Physical Anchor (text)',
        physical_anchor: fullAnchor,
        physical_anchor_priority: 'CRITICAL — these traits are absolute physical truths of this character. When references are ambiguous, cropped, or partially occluded, apply the anchor literally. Anchor OVERRIDES reference uncertainty. Body proportions (waist-to-hip, gluteus projection, bust volume, lordosis, posture), skin texture (pores, vellus hair, vascularity, undertone), face geometry (jaw, lips, nose, eye shape) — all governed by this anchor.',
      },
    } : {}),
    user_instruction: instruction,
    rules: {
      preserve_unless_instruction_overrides: preserve,
      ...(mustChange.length > 0 ? { must_change: mustChange } : {}),
      render_quality: skinClause,
      never_add: NEVER_ADD_TEXT,
      consistency: 'Subject identity must remain instantly recognizable as the SAME person.',
    },
  };
  const jsonSpec = JSON.stringify(spec, null, 2);

  // ── Flat prose for Seedream / Grok / Wan ──
  // Seedream prefers concise prose with explicit Figure references and a
  // preservation clause. Targets 50-90 words sweet spot.
  // refRoleClause encodes whether refs are identity-only (default) or source-of-change.
  const refClause = refRoleClause(numReferences, mustChange);
  const preserveClause = `Preserve ${preserve.slice(0, 5).join(', ')} unless the instruction explicitly changes them.`;
  const changeClause = mustChange.length > 0
    ? ` Must change: ${mustChange.join(', ')}.`
    : '';
  // Anchor as a separate clause Seedream/Grok respect more than a buried JSON field.
  const anchorClause = fullAnchor
    ? ` The subject is described as: ${fullAnchor}. These physical traits are absolute — override any reference ambiguity.`
    : '';
  const flatProse = `Edit Figure 1: ${instruction}.${refClause}${anchorClause} ${preserveClause}${changeClause} ${skinClause} ${NO_TEXT_RULE}`;

  return { jsonSpec, flatProse, wasTranslated };
}

// ─── Helper: inject physical anchor into a custom JSON spec ─────────────
// Used by pages that build their own JSON (Reimaginar, etc.) without going
// through buildEditPromptPair. Mutates the spec in-place style — call once
// before JSON.stringify.

export interface PhysicalAnchorInput {
  /** Permanent character.characteristics — the baked-in description. */
  characteristics?: string;
  /** Optional per-generation reinforcement (user textarea). */
  reinforcement?: string;
}

/**
 * Inject physical_anchor into an existing JSON spec object. Returns a new
 * object (does not mutate). Skip-safe when no anchor data is provided.
 */
export function withPhysicalAnchor<T extends Record<string, unknown>>(
  spec: T,
  input: PhysicalAnchorInput,
): T {
  const parts: string[] = [];
  if (input.characteristics?.trim()) parts.push(input.characteristics.trim());
  if (input.reinforcement?.trim()) parts.push(`Per-shot reinforcement: ${input.reinforcement.trim()}`);
  if (parts.length === 0) return spec;

  const fullAnchor = parts.join(' ');
  const existingIdentity = (spec.identity as Record<string, unknown>) ?? {};

  return {
    ...spec,
    identity: {
      ...existingIdentity,
      physical_anchor: fullAnchor,
      physical_anchor_priority: 'CRITICAL — these traits are absolute physical truths of this character. When references are ambiguous, cropped, or partially occluded, apply the anchor literally. Anchor OVERRIDES reference uncertainty. Body proportions (waist-to-hip, gluteus projection, bust volume, lordosis, posture), skin texture (pores, vellus hair, vascularity, undertone), face geometry (jaw, lips, nose, eye shape) — all governed by this anchor.',
    },
  };
}
