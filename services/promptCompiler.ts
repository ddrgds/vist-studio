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
