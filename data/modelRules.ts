// data/modelRules.ts — Master Rules Dictionary by Model Family
// Each family has specific prompting psychology based on its decoder architecture.
// Flash Lite uses these rules to compile optimized prompts per target model.

export type ModelFamily =
  | 'FLUX'
  | 'GPT_IMAGE'
  | 'SEEDREAM_QWEN'
  | 'GEMINI_IMAGEN'
  | 'Z_IMAGE_TURBO'
  | 'IDEOGRAM'
  | 'RUNWAY_GROK'
  | 'EDIT_INPAINT'
  | 'SOUL_HIGGSFIELD'
  | 'PULID';

export interface ModelRule {
  family: ModelFamily;
  rule: string;
  realisticSuffix: string;
}

export const MODEL_RULES: Record<ModelFamily, ModelRule> = {
  FLUX: {
    family: 'FLUX',
    rule: 'Write a single continuous, fluid paragraph in English. DO NOT use comma-separated keyword lists. Describe the scene physically: specify the spatial location of limbs (e.g. "left hand resting on right thigh"). Be detailed about fabric textures, environment materials, and lighting direction.',
    realisticSuffix: 'Raw smartphone photo, 24mm lens, natural uneven skin texture, slight ISO grain, candid everyday photography.',
  },
  GPT_IMAGE: {
    family: 'GPT_IMAGE',
    rule: 'Write in natural descriptive language. You MUST counteract the perfection bias. Explicitly include: "amateur photography, harsh uneven lighting, bad framing, visible skin pores, unretouched, no studio lights". Avoid any words related to art, cinematography, or perfection.',
    realisticSuffix: 'amateur photography, harsh uneven lighting, bad framing, visible skin pores, unretouched, no studio lights.',
  },
  SEEDREAM_QWEN: {
    family: 'SEEDREAM_QWEN',
    rule: 'Structure in 3 clear sentences: 1. Subject and clothing. 2. Exact spatial pose. 3. Texture and light. FORBIDDEN words: "beautiful", "smooth", "perfect", "flawless", "stunning".',
    realisticSuffix: 'skin texture with blemishes, slight facial asymmetry, oily t-zone, harsh realistic lighting, amateur smartphone snapshot.',
  },
  GEMINI_IMAGEN: {
    family: 'GEMINI_IMAGEN',
    rule: 'Natural language. Describe the image as a casual photo uploaded to social media. Force physical optics terms to anchor realism.',
    realisticSuffix: 'smartphone camera sensor artifacts, blown out highlights, slight motion blur, candid unposed moment, everyday casual lighting.',
  },
  Z_IMAGE_TURBO: {
    family: 'Z_IMAGE_TURBO',
    rule: 'MAXIMUM BREVITY. Use only comma-separated English tags. Limit of 30 tokens. Strict order: [Subject], [Clothing], [Action/Pose], [Light], [Style]. Zero transition verbs. Zero background descriptions.',
    realisticSuffix: 'UGC smartphone photo.',
  },
  IDEOGRAM: {
    family: 'IDEOGRAM',
    rule: 'Clear natural language. If there is text in the image, put it in double quotes. Describe composition explicitly (e.g. "Subject centered in the foreground").',
    realisticSuffix: 'UGC aesthetic, raw unedited photo, natural lighting.',
  },
  RUNWAY_GROK: {
    family: 'RUNWAY_GROK',
    rule: 'Descriptive language focused on dynamism. To avoid the cinematic movie look, counteract with raw real-life terms.',
    realisticSuffix: 'shot on front-facing mobile camera, poor dynamic range, everyday candid lifestyle photo, natural unpolished lighting.',
  },
  EDIT_INPAINT: {
    family: 'EDIT_INPAINT',
    rule: 'PROMPT DELTA ONLY. Describe ONLY what must change or the specific region. Use short English commands (e.g. "change shirt to black cotton t-shirt", "make lighting warmer"). DO NOT describe the subject or the original background. DO NOT re-describe existing elements.',
    realisticSuffix: '',
  },
  SOUL_HIGGSFIELD: {
    family: 'SOUL_HIGGSFIELD',
    rule: 'Write a concise scene description focusing on the person\'s pose and environment. Higgsfield preserves identity automatically via its internal model. Focus on action, setting, and mood. Do not describe facial features — the model handles identity.',
    realisticSuffix: 'natural candid moment, everyday setting, casual smartphone aesthetic.',
  },
  PULID: {
    family: 'PULID',
    rule: 'Write a single descriptive paragraph. CRITICAL: DO NOT describe the face, skin tone, hair color, eye color, or any identity features — PuLID locks identity from the reference image automatically. Focus ONLY on: clothing, pose, environment, lighting, mood. Write as if the character is already known.',
    realisticSuffix: 'shot on smartphone, natural skin texture, candid lifestyle photo, available light.',
  },
};

// ---------------------------------------------------------------------------
// Model ID → Family mapping
// Edit models always route to EDIT_INPAINT regardless of base family.
// ---------------------------------------------------------------------------
const MODEL_FAMILY_MAP: Record<string, ModelFamily> = {
  // FLUX family — paragraphs, spatial descriptions, tolerates long prompts
  'fal-ai/flux-pro/kontext/multi':     'FLUX',
  'fal-ai/flux-pro/kontext/max-multi': 'FLUX',
  'fal-ai/flux-kontext-pro':           'FLUX',
  'fal-ai/flux-2-pro':                 'FLUX',
  'fal-ai/flux-pro':                   'FLUX',
  'fal-ai/reflow-flux-pro':            'FLUX',
  'fal-ai/flux-lora-general':          'FLUX',

  // Seedream/Qwen — 3-sentence structure, anti-Wanghong
  'fal-ai/bytedance/seedream/v4.5':                    'SEEDREAM_QWEN',
  'fal-ai/bytedance/seedream/v5':                      'SEEDREAM_QWEN',
  'fal-ai/bytedance/seedream/v5/lite':                 'SEEDREAM_QWEN',
  'fal-ai/bytedance/seedream/v5/lite/text-to-image':   'SEEDREAM_QWEN',
  'fal-ai/qwen-image-2/pro':                           'SEEDREAM_QWEN',

  // Gemini/Imagen — social media photo language, optics anchors
  'gemini-2.0-flash-exp':              'GEMINI_IMAGEN',
  'gemini-2.5-flash-image':            'GEMINI_IMAGEN',
  'gemini-3.1-flash-image-preview':    'GEMINI_IMAGEN',
  'gemini-3-pro-image-preview':        'GEMINI_IMAGEN',
  'imagen-4.0-generate-001':           'GEMINI_IMAGEN',
  'imagen-4.0-ultra-generate-001':     'GEMINI_IMAGEN',
  'imagen-4.0-fast-generate-001':      'GEMINI_IMAGEN',

  // Z-Image — ultra-short, 30 token limit
  'fal-ai/z-image/turbo':              'Z_IMAGE_TURBO',

  // Grok generation
  'xai/grok-imagine-image':            'RUNWAY_GROK',

  // Ideogram
  'ideogram-v3':                       'IDEOGRAM',
  'ideogram-v2a':                      'IDEOGRAM',

  // PuLID — identity-locked, never describe face
  'fal-ai/pulid/v2':                   'PULID',
  'fal-ai/pulid':                      'PULID',

  // Edit models → always EDIT_INPAINT rules
  'fal-ai/flux-2-pro/edit':                   'EDIT_INPAINT',
  'fal-ai/flux-pro/inpainting':               'EDIT_INPAINT',
  'xai/grok-imagine-image/edit':              'EDIT_INPAINT',
  'fal-ai/bytedance/seedream/v5/lite/edit':   'EDIT_INPAINT',
  'fal-ai/qwen-image-2/pro/edit':             'EDIT_INPAINT',

  // Higgsfield/Soul
  'higgsfield-soul':                   'SOUL_HIGGSFIELD',
};

/** Resolve model ID to its family. Defaults to FLUX rules if unknown. */
export function getModelFamily(modelId: string): ModelFamily {
  return MODEL_FAMILY_MAP[modelId] ?? 'FLUX';
}

/**
 * Get the prompting rule for a model.
 * If `isEdit` is true, always returns EDIT_INPAINT rules regardless of model.
 */
export function getRuleForModel(modelId: string, isEdit = false): ModelRule {
  if (isEdit) return MODEL_RULES.EDIT_INPAINT;
  const family = getModelFamily(modelId);
  return MODEL_RULES[family];
}
