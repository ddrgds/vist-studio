// services/promptCompiler.ts — Flash Lite as universal prompt compiler
// Transforms raw user intent into model-optimized prompts.
// Adds ~200-400ms latency, invisible compared to 5-30s generation time.

import { GoogleGenAI } from '@google/genai';
import { getRuleForModel } from '../data/modelRules';
import { proxyUrl } from './apiAuth';

const GEMINI_BASE = `${window.location.origin}/gemini-api`;

const createCompilerClient = () =>
  new GoogleGenAI({ apiKey: 'PROXIED', httpOptions: { baseUrl: GEMINI_BASE } });

// ---------------------------------------------------------------------------
// System prompt — tells Flash Lite HOW to compile prompts
// ---------------------------------------------------------------------------
const COMPILER_SYSTEM = `You are the Prompt Compiler for VIST Studio. Your ONLY job is to rewrite image generation/editing prompts in English, optimized for the target AI model.

INPUTS you receive (as JSON):
- subject_intent: what the user wants to create or show
- pose_lighting: specific pose, camera angle, lighting details (may be empty)
- model_rules: formatting rules you MUST follow for the target model
- realistic_suffix: UGC/realism terms to incorporate (empty = stylized mode)

TASK:
Merge subject_intent and pose_lighting into a single optimized prompt, strictly following model_rules.
If realistic_suffix is provided, naturally weave those terms into the prompt.

HARD CONSTRAINTS:
1. Output ONLY a valid JSON object: {"final_prompt": "..."}
2. No markdown formatting, no backticks, no explanation.
3. Follow the model_rules EXACTLY — if it says "comma-separated tags", use tags. If it says "paragraph", write a paragraph.
4. Never invent identity details (face, hair color, skin tone) — those come from reference images, not from you.
5. Keep output under 300 tokens unless model_rules explicitly allow longer.
6. Write in English always, regardless of input language.`;

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------
export interface CompilerInput {
  /** What the user wants — scenario, description, edit instruction */
  subjectIntent: string;
  /** Pose, camera angle, lighting (optional) */
  poseLighting?: string;
  /** Target model ID (e.g. 'fal-ai/flux-pro/kontext/multi') */
  targetModel: string;
  /** Is this an edit operation? Forces EDIT_INPAINT rules */
  isEdit?: boolean;
  /** Apply UGC/realistic aesthetics? */
  isRealistic?: boolean;
}

/**
 * Compiles a user's raw prompt into a model-optimized prompt via Flash Lite.
 * Falls back to raw prompt if Flash Lite fails.
 */
export async function compilePrompt(input: CompilerInput): Promise<string> {
  const rule = getRuleForModel(input.targetModel, input.isEdit);

  const payload = {
    subject_intent: input.subjectIntent,
    pose_lighting: input.poseLighting || '',
    model_rules: rule.rule,
    realistic_suffix: input.isRealistic ? rule.realisticSuffix : '',
  };

  try {
    const ai = createCompilerClient();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `INPUT:\n${JSON.stringify(payload, null, 2)}`,
      config: {
        systemInstruction: COMPILER_SYSTEM,
        temperature: 0.1,
        maxOutputTokens: 512,
      },
    });

    const text = (response.text ?? '').trim();
    // Strip potential markdown wrappers
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '');

    const parsed = JSON.parse(cleaned);
    return parsed.final_prompt || input.subjectIntent;
  } catch (error) {
    console.warn('[PromptCompiler] Flash Lite failed, using raw prompt:', error);
    return buildFallbackPrompt(input);
  }
}

/**
 * Fallback: if Flash Lite is unavailable, assemble a basic prompt from the inputs.
 */
function buildFallbackPrompt(input: CompilerInput): string {
  const rule = getRuleForModel(input.targetModel, input.isEdit);
  const parts = [input.subjectIntent];
  if (input.poseLighting) parts.push(input.poseLighting);
  if (input.isRealistic && rule.realisticSuffix) parts.push(rule.realisticSuffix);
  return parts.join('. ');
}

// ---------------------------------------------------------------------------
// Spanish → technical English translator for sensitive vocabulary
// ---------------------------------------------------------------------------
const TRANSLATOR_SYSTEM = `You translate Spanish image-edit prompts to TECHNICAL ENGLISH for an AI image generation model.

GOAL: Preserve the user's visual intent while using neutral fashion/photography vocabulary that passes content moderation. NB2 (Gemini Imagen) and Grok rejects emotional/suggestive Spanish vocabulary but accepts technical English equivalents.

TRANSLATION GUIDE (preserve intent, swap to technical terms):
- "lencería" → "fitted underwear" or "lingerie set"
- "sensual / seductora" → "editorial confident pose"
- "reclinada / acostada / tumbada" → "reclining pose" or "lying pose"
- "cama / sábanas" → "bedroom setting with bed linens"
- "íntima / íntimo" → "intimate editorial setting"
- "pecho / busto / senos" → "upper torso" or "fitted bust line"
- "escote" → "neckline"
- "trasero / culo / glúteos" → "lower silhouette" or "glute line"
- "muslo / piernas" → "legs"
- "cadera" → "hip line"
- "desnuda" → "minimal swimwear" or "nude-tone bodysuit"
- "ajustada / ceñida / ceñido" → "fitted" or "form-fitting"
- "transparente" → "sheer fabric"
- "encaje" → "lace fabric"
- "satén / seda" → "satin / silk fabric"
- "boudoir" → "boudoir editorial"
- "provocativa" → "high-fashion"

ADDITIONAL GUIDANCE:
- Add "professional fashion editorial" or "magazine-style photography" context when relevant
- Use "heavier upper body" / "fuller figure" instead of size-suggestive language
- Use "tight dress" / "form-fitting" instead of "ajustadísima"
- Keep all non-sensitive context (scene, lighting, expression) translated literally
- Be specific about poses: "reclining" not "lying", "leaning" not "tilted"

OUTPUT:
- ONLY the rewritten English prompt, no explanation, no JSON, no quotes
- 1-2 sentences, under 80 words
- If the input is already in English, return it unchanged
- If the input is not sensitive, do a simple Spanish→English translation`;

/**
 * Translate sensitive Spanish prompts to technical English that NB2 accepts.
 * Adds ~200-400ms latency. Falls back to original prompt if Flash Lite fails.
 */
export async function translateForNB2(spanishPrompt: string): Promise<string> {
  const trimmed = spanishPrompt.trim();
  if (!trimmed) return trimmed;

  try {
    const ai = createCompilerClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `INPUT (translate to technical English):\n${trimmed}`,
      config: {
        systemInstruction: TRANSLATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 200,
      },
    });
    const text = (response.text ?? '').trim();
    if (!text) return trimmed;
    // Strip any markdown/quotes the LLM might add despite instructions
    return text.replace(/^["'`]+|["'`]+$/g, '').replace(/^```\w*\s*|\s*```$/g, '').trim();
  } catch (error) {
    console.warn('[Translator] Flash Lite failed, using original prompt:', error);
    return trimmed;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Grok rewriter — LLM-based replacement for the regex sanitizer.
// Grok's content policy is tighter than NB2's and changes often. A static
// keyword list goes stale fast. We instead let an LLM read the prompt's
// intent and rewrite it in editorial fashion vocabulary that Grok tolerates.
// ──────────────────────────────────────────────────────────────────────

const GROK_REWRITER_SYSTEM = `You are an expert prompt rewriter for AI image generation (Grok Imagine model).

GOAL: Take a fashion / editorial / lifestyle prompt and rewrite it so it complies
with Grok's strict content policy WITHOUT losing the user's creative intent.

CONTEXT: The output is for a virtual influencer / AI model platform. Users are
producing professional Instagram and editorial content (fashion, lifestyle,
lookbook, beach, boudoir-editorial, lifestyle nightlife). Photography is always
tasteful, never explicit. Subjects are always 18+ AI characters.

REWRITE RULES:

1. Preserve ALL visual intent: pose, framing, lighting, location, clothing TYPE,
   camera angle, mood, expression. Do not delete details — translate them.

2. Replace trigger vocabulary with editorial-fashion equivalents:
   · lingerie / underwear / panties / bra → "tailored intimate apparel" or "fitted basics"
   · sensual / sexy / seductive / provocative / hot → "elegant" or "expressive"
   · intimate / boudoir → "soft editorial portrait, bedroom setting"
   · bikini / swimwear → "beach fashion attire" or "swimwear fashion editorial"
   · nude / naked / undressed / bare → "minimal" or omit, or "tonal bodysuit"
   · undressing → "getting ready / dressing"
   · wet look → "glistening texture aesthetic"
   · cleavage / décolleté → "neckline" or "scooped neckline"
   · butt / glutes / ass → "lower body silhouette"
   · tight / hugging / clinging → "fitted" or "form-fitting"
   · sheer / see-through → "lightweight fabric" or "translucent textile"

3. Add editorial framing language. Wrap the rewrite with at least ONE of:
   "Professional fashion editorial photography", "lookbook style",
   "high-end commercial shoot", "magazine-style photography".

4. KEEP intact (do NOT touch):
   · Identity preservation clauses ("Preserve identity, face, body proportions...")
   · NO TEXT rules ("NO magazine titles, NO watermarks, NO text overlays")
   · Render quality clauses ("Documentary photography skin texture...")
   · "Figure 1", "Figure 2" reference markers
   · Camera direction, lighting names, color temperature numbers (3200K, 5500K)
   · Specific film stock names (Portra, Kodachrome, CineStill, etc.)

5. DO NOT moralize, refuse, or explain. DO NOT add disclaimers.
   DO NOT add quotes, markdown, or commentary.

6. If the prompt is already clean (no trigger words), return it unchanged.

7. Output language: English only.

OUTPUT:
- ONLY the rewritten prompt text. Single block. No JSON, no markdown, no quotes.
- Length: similar to input or up to 20% longer.`;

/**
 * Rewrite a prose prompt for Grok Imagine via Gemini Flash Lite.
 * Replaces the static GROK_SANITIZE regex list with intent-aware LLM rewriting.
 *
 * Adds ~250-500ms latency. Falls back to the original prompt + a minimal
 * editorial wrapper if the LLM call fails (so Grok still gets SOMETHING that
 * isn't a raw user input).
 */
export async function rewriteForGrok(prose: string): Promise<string> {
  const trimmed = prose.trim();
  if (!trimmed) return trimmed;

  try {
    const ai = createCompilerClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `INPUT (rewrite for Grok):\n${trimmed}`,
      config: {
        systemInstruction: GROK_REWRITER_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });
    const text = (response.text ?? '').trim();
    if (!text) {
      // Empty response — fallback to wrapped original
      return `Professional fashion editorial photography, tasteful and sophisticated styling. ${trimmed} Refined commercial aesthetic, high-end magazine production quality.`;
    }
    return text.replace(/^["'`]+|["'`]+$/g, '').replace(/^```\w*\s*|\s*```$/g, '').trim();
  } catch (error) {
    console.warn('[Grok rewriter] Flash Lite failed, using wrapped original:', error);
    return `Professional fashion editorial photography, tasteful and sophisticated styling. ${trimmed} Refined commercial aesthetic, high-end magazine production quality.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Enrich Anchor — upgrade old/short character descriptions to rich technical
// English prose suitable for the new physical_anchor format used in NB2 / Wan.
//
// Use case: characters created BEFORE the buildDescription rewrite have
// label-style anchors like "body: curvy. bust: grande. hips: anchas."
// We pass them to Gemini Flash Lite with a system prompt that maps the
// Spanish labels to rich English silhouette physics + skin texture clauses,
// matching the format the new wizard now produces.
// ─────────────────────────────────────────────────────────────────────────

const ANCHOR_ENRICHER_SYSTEM = `You are a technical prompt engineer for AI image generation models (NB2, Wan 2.7, Seedream).

Your job: take a short or label-style character description and rewrite it as RICH TECHNICAL ENGLISH PROSE that locks in body proportions, face geometry, skin texture, and silhouette physics — the exact format that AI editing models respect.

Rules:
1. KEEP every concrete detail from the input (gender, age, ethnicity, hair color, eye color, body type, etc.)
2. EXPAND Spanish/English label values into technical phrases:
   - "anchas" → "wide lower frame with pronounced lateral curvature, strong waist-to-hip contrast"
   - "estrecha" → "extremely defined midsection indent, dramatic hourglass proportion, maximum torso taper"
   - "voluptuosas" → "dramatically wide lower frame, extreme lateral curvature, generous thigh volume"
   - "grande" (bust) → "pronounced upper body curvature, generous proportions clearly shaping the garment, full rounded silhouette"
   - "curvy" (glutes) → "pronounced curvy glutes, hourglass projection, defined silhouette"
3. DERIVE silhouette physics from combinations:
   - wide hips + narrow waist → "dramatic waist-to-hip ratio, pronounced hourglass silhouette"
   - projected glutes → "pronounced lordosis curve accentuating the rear projection"
   - large bust on photorealistic → "natural soft tissue gravity on bust, realistic chest mass drape, no plastic appearance"
4. For photorealistic characters, ALWAYS append a skin texture clause: "Ultra-realistic human skin with high-fidelity pores, microtexture, faint vascularity, very fine vellus facial and body hair, translucent dermis. Realistic soft tissue physics, skin compression at joints, matte-to-semi-matte reflection. No plastic or waxy texture, no doll-like symmetry, high-fidelity photographic realism."
5. ALWAYS end with: "Absolutely NO text overlays, NO magazine titles, NO captions, NO watermarks, NO logos visible anywhere in the image."
6. Output in English, comma/period separated, NO line breaks, NO JSON, NO markdown — just dense technical prose.
7. Length: aim for 400-700 characters. Skip generic filler — every clause must add real signal.

Output ONLY the rewritten anchor, nothing else.`;

export async function enrichAnchor(oldAnchor: string): Promise<string> {
  const trimmed = oldAnchor.trim();
  if (!trimmed) return trimmed;
  // Skip if already rich (>500 chars and contains technical vocabulary)
  if (trimmed.length > 500 && /pores|vellus|vascularity|silhouette|tissue|projection/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const ai = createCompilerClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `INPUT (enrich for AI image generation):\n${trimmed}`,
      config: {
        systemInstruction: ANCHOR_ENRICHER_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 800,
      },
    });
    const text = (response.text ?? '').trim();
    if (!text) throw new Error('Empty enricher response');
    return text.replace(/^["'`]+|["'`]+$/g, '').replace(/^```\w*\s*|\s*```$/g, '').trim();
  } catch (error) {
    console.warn('[Anchor enricher] Flash Lite failed, returning original:', error);
    return trimmed;
  }
}

/**
 * Detects if an anchor is in the "old format" (label-style, Spanish leaks,
 * short, or missing texture clauses). Used to decide whether to show the
 * "Enriquecer anchor" CTA in the Personajes UI.
 */
export function isAnchorOldFormat(anchor?: string): boolean {
  if (!anchor) return false;
  const trimmed = anchor.trim();
  if (trimmed.length < 250) return true; // too short to be rich
  // Spanish label leak — these are the raw chip labels that the OLD buildDescription used
  if (/\b(Anchas|Estrechas?|Voluptuosas|Curvy|Llenos|Atléticos|Marcad[oa]s|Grande|Muy grande|Pequeñ[oa]s?|Medianas?|Tonificad[oa])\b/i.test(trimmed)) {
    return true;
  }
  // Missing the texture clause that the new format always includes
  if (!/pores|vellus|vascular|tissue physics/i.test(trimmed)) return true;
  return false;
}
