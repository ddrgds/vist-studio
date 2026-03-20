// services/promptCompiler.ts — Flash Lite as universal prompt compiler
// Transforms raw user intent into model-optimized prompts.
// Adds ~200-400ms latency, invisible compared to 5-30s generation time.

import { GoogleGenAI } from '@google/genai';
import { getRuleForModel } from '../data/modelRules';
import { proxyUrl } from './apiAuth';

const GEMINI_BASE = import.meta.env.PROD
  ? proxyUrl('gemini', '')
  : `${window.location.origin}/gemini-api`;

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
      contents: `${COMPILER_SYSTEM}\n\nINPUT:\n${JSON.stringify(payload, null, 2)}`,
      config: {
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
