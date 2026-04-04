

export enum ImageSize {
  Size1K = '1K',
  Size2K = '2K',
  Size4K = '4K',
}

export enum GeminiImageModel {
  Flash = 'gemini-2.5-flash-image',
  Flash2 = 'gemini-3.1-flash-image-preview',   // Nano Banana 2 — latest, fast + economical
  Pro = 'gemini-3-pro-image-preview',
  Imagen4 = 'imagen-4.0-generate-001',
  Imagen4Ultra = 'imagen-4.0-ultra-generate-001',
  Imagen4Fast = 'imagen-4.0-fast-generate-001',
}

// Which models use the Imagen 4 API (ai.models.generateImages) vs Gemini API
export const IMAGEN4_MODELS = new Set<GeminiImageModel>([
  GeminiImageModel.Imagen4,
  GeminiImageModel.Imagen4Ultra,
  GeminiImageModel.Imagen4Fast,
]);

export const GEMINI_IMAGE_MODEL_LABELS: Record<GeminiImageModel, string> = {
  [GeminiImageModel.Flash]: '⚡ Flash — Fast and efficient',
  [GeminiImageModel.Flash2]: '🍌 NB2 — Nano Banana 2 · Economical',
  [GeminiImageModel.Pro]: '🔬 Pro — Maximum quality',
  [GeminiImageModel.Imagen4]: '🎨 Imagen 4 — Ultra photorealistic',
  [GeminiImageModel.Imagen4Ultra]: '✨ Imagen 4 Ultra — Maximum fidelity',
  [GeminiImageModel.Imagen4Fast]: '🚀 Imagen 4 Fast — Blazing fast',
};

export enum AspectRatio {
  Square = '1:1',
  Portrait = '3:4',
  Landscape = '4:3',
  Wide = '16:9',
  Tall = '9:16',
}

export enum VideoResolution {
  Res720p = '720p',
  Res1080p = '1080p',
}

export interface CharacterParams {
  id: string;
  modelImages?: File[];
  outfitImages?: File[];
  outfitDescription?: string; // Text-only outfit description for non-Gemini providers
  characteristics?: string;
  pose?: string;
  poseImage?: File | null;
  accessory?: string;
  accessoryImages?: File[];
  usePoseAsOutfit?: boolean;
}

export interface InfluencerParams {
  characters: CharacterParams[];
  scenario: string;
  scenarioImage?: File[];
  lighting: string;
  camera?: string;
  negativePrompt?: string;
  imageBoost?: string;
  imageSize: ImageSize;
  aspectRatio: AspectRatio;
  numberOfImages?: number;
  steps?: number;
  cfg?: number;
  guidanceScale?: number;
  strength?: number;
  seed?: number;
  model?: GeminiImageModel;
  /** false = character is stylized (anime/3D/illustration/etc.) — service functions skip the realistic prefix */
  realistic?: boolean;
}

export interface SessionPoseItem {
  id: string;
  text: string;
  images: File[];
  accessory?: string;
  accessoryImages?: File[];
}

export interface PoseModificationParams {
  baseImage: File;
  pose: string;
  poseImages?: File[];
  accessory?: string;
  accessoryImages?: File[];
  sessionPoses?: SessionPoseItem[];
  usePoseAsOutfit?: boolean;
  imageSize: ImageSize;
  aspectRatio: AspectRatio;
  numberOfImages?: number;
  model?: GeminiImageModel;
  guidanceScale?: number;
  strength?: number;
  seed?: number;
}

// ─── Video Engines ──────────────────────────────────────────────────────────
export enum VideoEngine {
  // Image-to-Video
  Kling26Standard = 'kling-2.6-standard',
  Kling26Pro = 'kling-2.6-pro',
  Kling3Pro = 'kling-3.0-pro',
  // Motion Control
  Kling26MotionStandard = 'kling-2.6-motion-standard',
  Kling26MotionPro = 'kling-2.6-motion-pro',
  Kling3MotionPro = 'kling-3.0-motion-pro',
  // Wan Replace (preserves original scene)
  WanReplace = 'wan-2.2-replace',
  // Lip Sync / Avatar
  KlingAvatarStandard = 'kling-avatar-v2-standard',
  KlingAvatarPro = 'kling-avatar-v2-pro',
}

export type VideoMode = 'image-to-video' | 'motion-control' | 'lip-sync';

export interface VideoParams {
  mode: VideoMode;
  baseImage: File;
  prompt: string;
  engine: VideoEngine;
  // Image-to-Video
  duration?: '5' | '10';
  endImage?: File | null;
  // Motion Control
  referenceVideo?: File | null;
  characterOrientation?: 'image' | 'video';
  // Lip Sync
  audioFile?: File | null;        // Pre-recorded audio or ElevenLabs output
  ttsText?: string;               // Text for ElevenLabs TTS
  ttsVoiceId?: string;            // ElevenLabs voice ID
}

export interface LipSyncParams {
  characterImage: File;
  audioFile: File;               // MP3/WAV from ElevenLabs or uploaded
  prompt?: string;
  engine: VideoEngine;           // KlingAvatarStandard or KlingAvatarPro
}

export interface AIEditParams {
  baseImage: File;
  instruction: string;
  referenceImage?: File | null;
  model?: GeminiImageModel;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  guidanceScale?: number;
  strength?: number;
  seed?: number;
}

export interface GeneratedContent {
  id: string;
  url: string;
  params: InfluencerParams | PoseModificationParams | VideoParams | AIEditParams;
  timestamp: number;
  type: 'create' | 'edit' | 'video';
  favorite?: boolean;
  tags?: string[];
  /** Which workspace produced this item */
  source?: 'generate' | 'director';
  // Model/provider used — for restoring in "Reuse settings"
  aiProvider?: AIProvider;
  falModel?: FalModel;
  replicateModel?: ReplicateModel;
  openaiModel?: OpenAIModel;
  ideogramModel?: IdeogramModel;
  higgsfieldModel?: HiggsfieldModel;
  characterId?: string;
  /** Workflow status — persisted to Supabase as workflow_status */
  workflowStatus?: 'borrador' | 'editado' | 'aprobado' | 'publicado';
}

export interface AIStudioClient {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

export interface Preset {
  id: string;
  name: string;
  icon: string;
  data: {
    characteristics?: string;
    lighting?: string;
    scenario?: string;
    camera?: string;
  }
}

export interface CustomPreset {
  id: string;
  name: string;
  thumbnail?: string; // base64 data URL — preview of first model image
  data: Partial<InfluencerParams & CharacterParams & { outfitDescription: string }>;
}

// Engine for "AI Edit" mode
export enum AIEditEngine {
  Gemini = 'gemini',
  FluxKontext = 'flux-kontext',
  Seedream5Edit = 'seedream5-edit',
  Flux2ProEdit = 'flux2-pro-edit',
  FaceSwapFal = 'faceswap-fal',
  GPTImageEdit = 'gpt-image-edit',
  GrokImagine = 'grok-imagine',
  ModelsLabImg2Img = 'modelslab-img2img',
}

export interface InspirationImage {
  id: string;
  name: string;
  blob: Blob;
  url?: string;
}

export interface SavedCharacter {
  id: string;
  name: string;
  thumbnail: string;           // base64 data URL of first modelImage (for chip display)
  modelImageBlobs: Blob[];     // File extends Blob — stored natively in IndexedDB
  outfitBlob: Blob | null;     // outfitImages[0]
  outfitDescription: string;
  characteristics: string;
  accessory: string;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  // poseImage intentionally excluded — it's session-specific, not character identity
  // Soul ID — LoRA training
  loraUrl?: string;            // FAL storage URL of trained LoRA weights
  loraTrainingStatus?: 'idle' | 'training' | 'ready' | 'failed';
  loraTrainedAt?: number;
  // Reference photos — user-curated face refs (max 20) used in Director
  referencePhotoUrls?: string[];
  // Cloud URLs for model images — populated when loaded from Supabase (no blob download)
  modelImageUrls?: string[];
  // Pipeline redesign fields
  renderStyle?: string;
  soulStyleId?: string;
  personalityTraits?: string[];
}

export interface BatchOutfitItem {
  id: string;
  outfitImages: File[];
  outfitText: string;
}

// ─────────────────────────────────────────────
// Multi-provider AI engine
// ─────────────────────────────────────────────

export enum AIProvider {
  Auto = 'auto',
  Gemini = 'gemini',
  Fal = 'fal',
  Replicate = 'replicate',
  OpenAI = 'openai',
  Ideogram = 'ideogram',
  ModelsLab = 'modelslab',
  Higgsfield = 'higgsfield',
}

export const AI_PROVIDER_LABELS: Record<AIProvider, { name: string; icon: string; description: string }> = {
  [AIProvider.Auto]: { name: 'Auto', icon: '✨', description: 'Best engine selected automatically based on your inputs' },
  [AIProvider.Gemini]: { name: 'Gemini', icon: '✦', description: 'Multi-character, complex scenes' },
  [AIProvider.Fal]: { name: 'fal.ai', icon: '⚡', description: 'FLUX.1 Kontext — multi-reference identity · 2026' },
  [AIProvider.Replicate]: { name: 'Replicate', icon: '👗', description: 'FLUX.2 Max + Gen-4 Image + Virtual Try-On' },
  [AIProvider.OpenAI]: { name: 'GPT Image', icon: '🤖', description: 'GPT Image 1.5 — multimodal with reference' },
  [AIProvider.Ideogram]: { name: 'Ideogram', icon: '💡', description: 'Ideogram V3 — advanced typography and style' },
  [AIProvider.ModelsLab]: { name: 'ModelsLab', icon: '🔞', description: 'Uncensored NSFW — Lustify SDXL + 10K models' },
  [AIProvider.Higgsfield]: { name: 'Higgsfield', icon: '🌟', description: 'Soul 2.0 — fashion-grade, editorial realism' },
};

// Available models per provider
export enum FalModel {
  // ── Creation (text-to-image) ──
  KontextMulti = 'fal-ai/flux-pro/kontext/multi',      // FLUX.1 Kontext — multi-ref identity gen · 2026
  KontextMaxMulti = 'fal-ai/flux-pro/kontext/max/multi',  // FLUX.1 Kontext Max — maximum quality · 2026
  Flux2Pro = 'fal-ai/flux-2-pro/edit',                    // FLUX.2 Pro Edit — multi-ref image editor
  Flux2ProGen = 'fal-ai/flux-2-pro',                      // FLUX.2 Pro — text-to-image, JSON prompts, safety_tolerance
  Wan27ProGen = 'fal-ai/wan/v2.7/pro/text-to-image',       // Wan 2.7 Pro — text-to-image via fal.ai
  Wan27Edit = 'fal-ai/wan/v2.7/edit',                      // Wan 2.7 — image editing, natural language
  Wan27ProEdit = 'fal-ai/wan/v2.7/pro/edit',               // Wan 2.7 Pro — premium image editing
  GrokImagineGen = 'xai/grok-imagine-image',               // Grok Imagine — text-to-image via fal.ai, permissive
  Seedream45 = 'fal-ai/bytedance/seedream/v4.5/text-to-image',   // ByteDance — photorealism 4K
  Seedream50 = 'fal-ai/bytedance/seedream/v5/lite/text-to-image', // ByteDance — web search + reasoning
  ZImageTurbo = 'fal-ai/z-image/turbo',                  // Alibaba Tongyi-MAI 6B — uncensored, $0.005/mp · 2025
  // ── Identity-locked generation ──
  PulidV2 = 'fal-ai/pulid/v2',                           // PuLID v2 — face-locked photo-realistic identity
  FluxPro = 'fal-ai/flux-pro',                            // FLUX Pro — state-of-the-art, reference-guided
  // ── Editing (image-to-image) ──
  QwenEdit = 'fal-ai/qwen-image-2/pro/edit',             // Alibaba Qwen — spatial reasoning, style & light
  FireRedEdit = 'fal-ai/firered-image-edit-v1.1',        // FireRed — portrait editing, try-on, makeup
  OneReward = 'fal-ai/onereward',                         // OneReward — mask-based inpainting (FLUX Fill fine-tune)
  Seedream5Edit = 'fal-ai/bytedance/seedream/v5/lite/edit', // ByteDance — intelligent editing, low hallucination
  // ── MVP new models ──
  KontextPro = 'fal-ai/flux-kontext-pro',                // FLUX Kontext Pro — single-ref identity editing · 2026
  KleinEditLoRA = 'fal-ai/flux-2/klein/9b/edit/lora',    // FLUX 2 Klein 9B Edit+LoRA — edit with custom LoRA · 2026
}

// Models displayed in the generation panel
export const FAL_GENERATION_MODELS: FalModel[] = [
  FalModel.KontextMulti,
  FalModel.KontextMaxMulti,
  FalModel.Flux2Pro,
  FalModel.Seedream45,
  FalModel.Seedream50,
];

// Engine for pose editor
export enum PoseEngine {
  Gemini = 'gemini',               // Default — multimodal, text + image
  FalAI = 'fal',                   // Leffa (ref image) or FLUX Kontext Pro (text)
  Flux2ProEdit = 'flux2-pro-edit', // FLUX.2 Pro Edit — multi-reference · fal.ai
  GPTImageEdit = 'gpt-image-edit', // GPT Image 1 — text instruction · OpenAI
  GrokImagine = 'grok-imagine',    // Grok Imagine — xAI Aurora, ~4s, image + text · 2026
}

export enum ReplicateModel {
  Flux2Max = 'black-forest-labs/flux-2-max',          // FLUX.2 [max] — maximum fidelity, up to 8 refs · Jan 2026
  Gen4Image = 'runwayml/gen4-image',                  // Runway Gen-4 — char + location consistency · Jul 2025
  IDMVTON = 'cuuupid/idm-vton',                       // Virtual try-on ⚠️ licencia no-comercial (CC BY-NC-SA 4.0)
  GrokImagine = 'xai/grok-imagine-image',             // Grok Imagine — xAI SOTA, ~4s/img, 13 aspect ratios · 2026
  // ── MVP new models ──
  RecraftCrispUpscale = 'recraft-ai/recraft-crisp-upscale',  // Recraft Crisp Upscale — clarity-preserving · 2026
  BriaExpand = 'bria/expand-image',                          // Bria Expand — outpaint/expand borders · 2026
  Flux2Pro = 'black-forest-labs/flux-2-pro',                 // FLUX 2 Pro — generation (Replicate variant)
  Flux2Klein4B = 'black-forest-labs/flux-2-klein-4b',        // FLUX 2 Klein 4B — fast, economical · 2026
  PrunaImageEdit = 'prunaai/p-image-edit',                   // Pruna P-Image-Edit — fallback edit engine · 2026
  Wan27Image = 'wan-video/wan-2.7-image',                    // Wan 2.7 — text-to-image + editing, 9 refs, 2K · 2026
  Wan27ImagePro = 'wan-video/wan-2.7-image-pro',             // Wan 2.7 Pro — 4K, thinking mode, 12 coherent outputs · 2026
}

export enum OpenAIModel {
  GptImage15 = 'gpt-image-1.5',   // Latest, fastest GPT Image model
  GptImage1 = 'gpt-image-1',     // Original GPT Image model
  GptImageMini = 'gpt-image-1-mini', // Ultra-fast, cheapest — drafts & bulk
}


export enum IdeogramModel {
  V3 = 'V_3',         // Ideogram 3.0 — latest, supports character reference
  V2A = 'V_2A',        // Ideogram 2A
  V2ATurbo = 'V_2A_TURBO',  // Ideogram 2A Turbo — fast
}

export const FAL_MODEL_LABELS: Record<FalModel, { name: string; description: string }> = {
  [FalModel.KontextMulti]: { name: 'Kontext Multi', description: 'FLUX.1 — multi-ref identity, fast · 2026' },
  [FalModel.KontextMaxMulti]: { name: 'Kontext Max Multi', description: 'FLUX.1 — multi-ref identity, max quality · 2026' },
  [FalModel.Flux2Pro]: { name: 'FLUX.2 Pro Edit', description: 'Multi-ref · 2D→3D · scenarios · Nov 2025' },
  [FalModel.Seedream45]: { name: 'Seedream 4.5', description: 'ByteDance — exceptional photorealism, 4K' },
  [FalModel.Seedream50]: { name: 'Seedream 5.0', description: 'ByteDance — web search + reasoning, 2K' },
  [FalModel.ZImageTurbo]: { name: 'Z-Image Turbo', description: 'Alibaba — uncensored · 8 steps · $0.005/mp' },
  [FalModel.PulidV2]: { name: 'PuLID v2', description: 'Face-locked photo-realistic identity generation' },
  [FalModel.FluxPro]: { name: 'FLUX Pro', description: 'State-of-the-art reference-guided generation' },
  [FalModel.QwenEdit]: { name: 'Qwen Image 2 Pro', description: 'Alibaba — spatial reasoning, style & light editing' },
  [FalModel.FireRedEdit]: { name: 'FireRed v1.1', description: 'Portrait editing, try-on, makeup · 2026' },
  [FalModel.OneReward]: { name: 'OneReward', description: 'Mask-based inpainting & outpainting · FLUX Fill' },
  [FalModel.Seedream5Edit]: { name: 'Seedream 5 Edit', description: 'ByteDance — intelligent editing, low hallucination' },
  [FalModel.KontextPro]: { name: 'Kontext Pro', description: 'FLUX Kontext Pro — single-ref identity editing · 2026' },
  [FalModel.KleinEditLoRA]: { name: 'Klein Edit+LoRA', description: 'FLUX 2 Klein 9B — edit with custom LoRA · 2026' },
};

export const POSE_ENGINE_LABELS: Record<PoseEngine, { name: string; icon: string; description: string }> = {
  [PoseEngine.Gemini]: { name: 'Gemini', icon: '✦', description: 'Multimodal — text and reference image' },
  [PoseEngine.FalAI]: { name: 'fal.ai', icon: '⚡', description: 'Leffa (with image) · FLUX Kontext (text)' },
  [PoseEngine.Flux2ProEdit]: { name: 'FLUX.2', icon: '🔥', description: 'FLUX.2 Pro Edit — multi-reference pose · fal.ai' },
  [PoseEngine.GPTImageEdit]: { name: 'GPT', icon: '🤖', description: 'GPT Image 1 — text instruction editing' },
  [PoseEngine.GrokImagine]: { name: 'Grok', icon: '𝕏', description: 'Grok Imagine — xAI Aurora · fast · ~4s · 2026' },
};

export const REPLICATE_MODEL_LABELS: Record<ReplicateModel, { name: string; description: string }> = {
  [ReplicateModel.Flux2Max]: { name: 'FLUX.2 [max]', description: 'Maximum fidelity · up to 8 refs · Jan 2026' },
  [ReplicateModel.Gen4Image]: { name: 'Gen-4 Image', description: 'Runway — char + location · Jul 2025' },
  [ReplicateModel.IDMVTON]: { name: 'Virtual Try-On', description: 'Clothing try-on ⚠️ non-commercial' },
  [ReplicateModel.GrokImagine]: { name: 'Grok Imagine', description: 'xAI SOTA · ~4s · 13 aspect ratios · 2026' },
  [ReplicateModel.RecraftCrispUpscale]: { name: 'Recraft Crisp', description: 'Clarity-preserving upscale · 2026' },
  [ReplicateModel.BriaExpand]: { name: 'Bria Expand', description: 'Outpaint / expand borders · 2026' },
  [ReplicateModel.Flux2Pro]: { name: 'FLUX 2 Pro', description: 'FLUX 2 Pro generation · Replicate · 2026' },
  [ReplicateModel.Flux2Klein4B]: { name: 'FLUX 2 Klein 4B', description: 'Fast, economical generation · 2026' },
  [ReplicateModel.PrunaImageEdit]: { name: 'P-Image Edit', description: 'Pruna — rápido, económico, sin filtros · 2026' },
};

// ─── ModelsLab ────────────────────────────────────────────────────────────────
// NSFW-specialized models. safety_checker: 'no' is always sent.
// model_id values are ModelsLab community IDs (modelslab.com/models/<id>)
export enum ModelsLabModel {
  NsfwSdxl     = 'nsfw-sdxl',      // General NSFW SDXL · confirmed on ModelsLab
  LustifySdxl  = 'lustify-sdxl',   // Lustify SDXL — photoreal, women-focused
  WaiNsfw      = 'wai-nsfw-illustrious-sdxl', // WAI — illustrious SDXL NSFW
  FluxNsfw     = 'flux-nsfw',       // FLUX Dev NSFW fine-tune
}

export const MODELSLAB_MODEL_LABELS: Record<ModelsLabModel, { name: string; description: string }> = {
  [ModelsLabModel.NsfwSdxl]:    { name: 'NSFW SDXL',     description: 'General purpose NSFW · photoreal · SDXL' },
  [ModelsLabModel.LustifySdxl]: { name: 'Lustify SDXL',  description: 'Photoreal NSFW · explicit scenes · SDXL' },
  [ModelsLabModel.WaiNsfw]:     { name: 'WAI Illustrious', description: 'Illustrated / anime NSFW · SDXL · high quality' },
  [ModelsLabModel.FluxNsfw]:    { name: 'FLUX NSFW',      description: 'FLUX Dev fine-tuned for adult content' },
};

export const OPENAI_MODEL_LABELS: Record<OpenAIModel, { name: string; description: string }> = {
  [OpenAIModel.GptImage15]: { name: 'GPT Image 1.5', description: 'Faster, accepts reference images' },
  [OpenAIModel.GptImage1]: { name: 'GPT Image 1', description: 'Original, high fidelity, accepts references' },
  [OpenAIModel.GptImageMini]: { name: 'GPT Image Mini', description: 'Ultra-fast, cheapest — drafts & bulk' },
};


export const IDEOGRAM_MODEL_LABELS: Record<IdeogramModel, { name: string; description: string }> = {
  [IdeogramModel.V3]: { name: 'V3', description: 'Latest model, character reference, best quality' },
  [IdeogramModel.V2A]: { name: 'V2A', description: 'Balanced, advanced typography' },
  [IdeogramModel.V2ATurbo]: { name: 'V2A Turbo', description: 'Fast and economical' },
};

// ─── Higgsfield ──────────────────────────────────────────────────────────────
export enum HiggsfieldModel {
  SoulStandard = 'higgsfield-ai/soul/standard',  // Soul 2.0 — fashion-grade editorial realism
}

export const HIGGSFIELD_MODEL_LABELS: Record<HiggsfieldModel, { name: string; description: string }> = {
  [HiggsfieldModel.SoulStandard]: { name: 'Soul 2.0', description: 'Fashion-grade realism, editorial aesthetics · 2026' },
};

export const VIDEO_ENGINE_LABELS: Record<VideoEngine, { name: string; icon: string; description: string; mode: VideoMode }> = {
  // Image-to-Video
  [VideoEngine.Kling26Standard]: { name: 'Kling 2.6', icon: '🎥', description: 'Fast, 5-10s clips', mode: 'image-to-video' },
  [VideoEngine.Kling26Pro]: { name: 'Kling 2.6 Pro', icon: '🎬', description: 'High quality, 1080p, native audio', mode: 'image-to-video' },
  [VideoEngine.Kling3Pro]: { name: 'Kling 3.0 Pro', icon: '✨', description: 'Best quality, cinematic, native audio', mode: 'image-to-video' },
  // Motion Control
  [VideoEngine.Kling26MotionStandard]: { name: 'Kling 2.6 Motion', icon: '🕺', description: 'Transfer movements, up to 30s', mode: 'motion-control' },
  [VideoEngine.Kling26MotionPro]: { name: 'Kling 2.6 Motion Pro', icon: '💃', description: 'High quality motion transfer', mode: 'motion-control' },
  [VideoEngine.Kling3MotionPro]: { name: 'Kling 3.0 Motion Pro', icon: '🌟', description: 'Best motion fidelity, 150+ frames', mode: 'motion-control' },
  [VideoEngine.WanReplace]: { name: 'Wan Replace', icon: '🔄', description: 'Replace performer, keep original scene', mode: 'motion-control' },
  // Lip Sync
  [VideoEngine.KlingAvatarStandard]: { name: 'Kling Avatar', icon: '🗣️', description: 'Talking head, multilingual', mode: 'lip-sync' },
  [VideoEngine.KlingAvatarPro]: { name: 'Kling Avatar Pro', icon: '🎙️', description: 'Best lip sync quality, 1080p', mode: 'lip-sync' },
};

// ─────────────────────────────────────────────
// Subscription plans
// ─────────────────────────────────────────────

export type SubscriptionPlan = 'starter' | 'pro' | 'studio' | 'brand';
export type SubscriptionStatus = 'free' | 'active' | 'cancelled';

// ─────────────────────────────────────────────
// Credit costs per action
// ─────────────────────────────────────────────

/** Credits deducted per image/video generation or edit operation. */
// ─────────────────────────────────────────────
// Unified Credit Costs — 65% gross margin target
// All values = ceil(API_cost / (0.35 × $0.010))
// ─────────────────────────────────────────────
export const CREDIT_COSTS: Record<string, number> = {
  // ── Generation — text-to-image (1K base, see RESOLUTION_CREDIT_MULTIPLIER for 2K/4K) ──
  [GeminiImageModel.Imagen4Fast]: 6,
  [GeminiImageModel.Imagen4]:     12,
  [GeminiImageModel.Imagen4Ultra]: 17,
  [GeminiImageModel.Flash2]:      19,   // NB2 at 1K
  [GeminiImageModel.Pro]:         38,   // NB Pro at 2K
  [GeminiImageModel.Flash]:       11,   // Gemini 2.5 Flash (legacy)
  // FAL — generation + editing
  [FalModel.KontextPro]:       14,
  [FalModel.KleinEditLoRA]:    9,
  [FalModel.KontextMulti]:     14,
  [FalModel.KontextMaxMulti]:  15,
  [FalModel.Flux2Pro]:         12,   // FAL variant (edit endpoint)
  [FalModel.Flux2ProGen]:      10,
  [FalModel.Wan27ProGen]:      12,
  [FalModel.Wan27Edit]:        8,
  [FalModel.Wan27ProEdit]:     12,
  [FalModel.GrokImagineGen]:   8,
  [FalModel.Seedream45]:       8,
  [FalModel.Seedream50]:       8,
  [FalModel.ZImageTurbo]:      8,
  [FalModel.PulidV2]:          12,   // PuLID v2 — face-locked generation
  [FalModel.FluxPro]:          10,   // FLUX Pro — reference-guided generation
  [FalModel.QwenEdit]:         12,
  [FalModel.FireRedEdit]:      8,
  [FalModel.OneReward]:        8,
  [FalModel.Seedream5Edit]:    8,
  // Replicate
  [ReplicateModel.Flux2Max]:           12,
  [ReplicateModel.Gen4Image]:          15,
  [ReplicateModel.IDMVTON]:            15,
  [ReplicateModel.GrokImagine]:        10,
  [ReplicateModel.Flux2Pro]:           12,   // Replicate variant (generation)
  [ReplicateModel.Flux2Klein4B]:       4,
  [ReplicateModel.PrunaImageEdit]:     9,
  [ReplicateModel.RecraftCrispUpscale]: 9,
  [ReplicateModel.BriaExpand]:         14,
  [ReplicateModel.Wan27Image]:         8,
  [ReplicateModel.Wan27ImagePro]:      12,
  // OpenAI
  [OpenAIModel.GptImage15]:   20,
  [OpenAIModel.GptImage1]:    15,
  [OpenAIModel.GptImageMini]: 5,
  // Ideogram
  [IdeogramModel.V3]:       15,
  [IdeogramModel.V2A]:      12,
  [IdeogramModel.V2ATurbo]: 10,
  // ModelsLab (NSFW)
  [ModelsLabModel.NsfwSdxl]:    8,
  [ModelsLabModel.LustifySdxl]: 8,
  [ModelsLabModel.WaiNsfw]:     8,
  [ModelsLabModel.FluxNsfw]:    8,
  // Higgsfield
  [HiggsfieldModel.SoulStandard]: 14,
  // ── Editing — tool-based (flat cost, resolution-independent) ──
  'grok-edit':       6,
  'pruna-edit':      9,
  'relight':         6,
  'scene':           6,
  'outfit':          6,
  'face-swap':       6,
  'realistic-skin':  6,
  'style-transfer':  6,
  'inpaint':         6,
  'bg-removal':      6,
  'try-on':          14,
  'angles-standard': 19,
  'angles-ultra':    26,
  'upscale-recraft': 9,
  'upscale-aura':    3,
  'expand':          14,
  // ── Video — Image-to-Video ──
  [VideoEngine.Kling26Standard]:       86,
  [VideoEngine.Kling26Pro]:           143,
  [VideoEngine.Kling3Pro]:            286,
  // Video — Motion Control
  [VideoEngine.Kling26MotionStandard]: 86,
  [VideoEngine.Kling26MotionPro]:     143,
  [VideoEngine.Kling3MotionPro]:      286,
  [VideoEngine.WanReplace]:            57,
  // Video — Lip Sync / Avatar
  [VideoEngine.KlingAvatarStandard]:   71,
  [VideoEngine.KlingAvatarPro]:       143,
  // ── Special ──
  'lora-training': 571,
};

// Resolution multipliers for Gemini models (base cost × multiplier)
export const RESOLUTION_CREDIT_MULTIPLIER: Record<string, Record<string, number>> = {
  [GeminiImageModel.Flash2]: { '1K': 1, '2K': 1.53, '4K': 2.26 },  // 19 → 29 → 43
  [GeminiImageModel.Pro]:    { '2K': 1, '4K': 1.82 },               // 38 → 69
};

// ─────────────────────────────────────────────
// Engine metadata — user-facing names, benefits, requirements
// ─────────────────────────────────────────────

export type EngineTag = 'fast' | 'quality' | 'face' | 'text' | 'artistic' | 'nsfw' | 'photorealism' | 'economical' | 'video';

export interface EngineMetadata {
  /** Unique key: "provider:model" */
  key: string;
  /** User-friendly name shown in UI (outcome, not model) */
  userFriendlyName: string;
  /** One-line benefit description */
  description: string;
  /** Short "good for" hint shown in engine selector dropdown */
  bestFor: string;
  /** Searchable/filterable tags */
  tags: EngineTag[];
  /** Whether this engine requires a face reference photo */
  requiresFaceRef: boolean;
  /** Human-readable estimated generation time */
  estimatedTime: string;
  /** Credits per image */
  creditCost: number;
  /** Provider + sub-model for programmatic selection */
  provider: AIProvider;
  geminiModel?: GeminiImageModel;
  falModel?: FalModel;
  replicateModel?: ReplicateModel;
  openaiModel?: OpenAIModel;
  ideogramModel?: IdeogramModel;
  modelsLabModel?: ModelsLabModel;
  higgsfieldModel?: HiggsfieldModel;
}

/**
 * Comprehensive metadata for every generation engine.
 * Keyed as "provider:model" for unique lookup.
 * Used by auto-selection and the frontend engine selector (Task #14).
 */
export const ENGINE_METADATA: EngineMetadata[] = [
  // ── Gemini ──
  {
    key: 'gemini:nb2',
    userFriendlyName: 'Nano Banana 2',
    description: 'Pro quality at Flash speed',
    bestFor: 'Fast edits, lighting, backgrounds',
    tags: ['fast', 'quality', 'economical'],
    requiresFaceRef: false,
    estimatedTime: '~5s',
    creditCost: CREDIT_COSTS[GeminiImageModel.Flash2],
    provider: AIProvider.Gemini,
    geminiModel: GeminiImageModel.Flash2,
  },
  {
    key: 'gemini:pro',
    userFriendlyName: 'Nano Banana Pro',
    description: "Google's flagship generation",
    bestFor: 'Complex scenes, highest detail',
    tags: ['quality'],
    requiresFaceRef: false,
    estimatedTime: '~15s',
    creditCost: CREDIT_COSTS[GeminiImageModel.Pro],
    provider: AIProvider.Gemini,
    geminiModel: GeminiImageModel.Pro,
  },
  {
    key: 'gemini:imagen4',
    userFriendlyName: 'Imagen 4',
    description: "Google's photorealistic diffusion",
    bestFor: 'Photorealistic portraits, product shots',
    tags: ['quality', 'photorealism'],
    requiresFaceRef: false,
    estimatedTime: '~10s',
    creditCost: CREDIT_COSTS[GeminiImageModel.Imagen4],
    provider: AIProvider.Gemini,
    geminiModel: GeminiImageModel.Imagen4,
  },
  // ── FAL ──
  {
    key: 'fal:seedream50',
    userFriendlyName: 'Seedream 5.0',
    description: 'Intelligent visual reasoning',
    bestFor: 'Smart scene composition, reasoning',
    tags: ['photorealism', 'quality'],
    requiresFaceRef: false,
    estimatedTime: '~12s',
    creditCost: CREDIT_COSTS[FalModel.Seedream50],
    provider: AIProvider.Fal,
    falModel: FalModel.Seedream50,
  },
  {
    key: 'fal:seedream45',
    userFriendlyName: 'Seedream 4.5',
    description: 'ByteDance next-gen 4K',
    bestFor: 'Ultra-high resolution, 4K output',
    tags: ['photorealism', 'quality'],
    requiresFaceRef: false,
    estimatedTime: '~10s',
    creditCost: CREDIT_COSTS[FalModel.Seedream45],
    provider: AIProvider.Fal,
    falModel: FalModel.Seedream45,
  },
  // ── OpenAI ──
  {
    key: 'openai:gpt15',
    userFriendlyName: 'GPT Image 1.5',
    description: 'True-color precision rendering',
    bestFor: 'Text in images, logos, typography',
    tags: ['text', 'quality'],
    requiresFaceRef: false,
    estimatedTime: '~15s',
    creditCost: CREDIT_COSTS[OpenAIModel.GptImage15],
    provider: AIProvider.OpenAI,
    openaiModel: OpenAIModel.GptImage15,
  },
  // ── FAL (FLUX) ──
  {
    key: 'fal:kontext-multi',
    userFriendlyName: 'FLUX Kontext',
    description: 'Face-consistent identity',
    bestFor: 'Face consistency across shots',
    tags: ['face', 'quality'],
    requiresFaceRef: true,
    estimatedTime: '~12s',
    creditCost: CREDIT_COSTS[FalModel.KontextMulti],
    provider: AIProvider.Fal,
    falModel: FalModel.KontextMulti,
  },
  {
    key: 'fal:flux2pro',
    userFriendlyName: 'FLUX.2 Pro',
    description: 'Speed-optimized detail',
    bestFor: 'Multi-reference edits, 2D→3D',
    tags: ['face', 'quality'],
    requiresFaceRef: true,
    estimatedTime: '~15s',
    creditCost: CREDIT_COSTS[FalModel.Flux2Pro],
    provider: AIProvider.Fal,
    falModel: FalModel.Flux2Pro,
  },
  {
    key: 'fal:zimage-turbo',
    userFriendlyName: 'Z-Image',
    description: 'Instant lifelike portraits',
    bestFor: 'Quick drafts, instant previews',
    tags: ['fast', 'photorealism'],
    requiresFaceRef: false,
    estimatedTime: '~3s',
    creditCost: CREDIT_COSTS[FalModel.ZImageTurbo],
    provider: AIProvider.Fal,
    falModel: FalModel.ZImageTurbo,
  },
  {
    key: 'fal:pulid',
    userFriendlyName: 'PuLID v2',
    description: 'Face-locked photo-realistic ID',
    bestFor: 'Identidad facial, fotos de referencia',
    tags: ['face', 'quality', 'photorealism'],
    requiresFaceRef: true,
    estimatedTime: '~20s',
    creditCost: CREDIT_COSTS[FalModel.PulidV2],
    provider: AIProvider.Fal,
    falModel: FalModel.PulidV2,
  },
  {
    key: 'fal:flux-pro',
    userFriendlyName: 'FLUX Pro',
    description: 'State-of-the-art image generation',
    bestFor: 'Generación guiada por referencia',
    tags: ['quality', 'photorealism'],
    requiresFaceRef: true,
    estimatedTime: '~15s',
    creditCost: CREDIT_COSTS[FalModel.FluxPro],
    provider: AIProvider.Fal,
    falModel: FalModel.FluxPro,
  },
  // ── Replicate ──
  {
    key: 'fal:flux2pro-gen',
    userFriendlyName: 'FLUX.2 Pro',
    description: 'Black Forest Labs, JSON prompts, fast',
    bestFor: 'Photorealism, follows instructions, JSON structured',
    tags: ['photorealism', 'fast', 'quality'],
    requiresFaceRef: false,
    estimatedTime: '~8s',
    creditCost: CREDIT_COSTS[FalModel.Flux2ProGen],
    provider: AIProvider.Fal,
    falModel: FalModel.Flux2ProGen,
  },
  {
    key: 'fal:turbo',
    userFriendlyName: 'Turbo Draft',
    description: 'Ultra-rápido ~0.3s, $0.005/MP, draft',
    bestFor: 'Previews rápidos, iterar ideas',
    tags: ['fast', 'cheap'],
    requiresFaceRef: false,
    estimatedTime: '~0.3s',
    creditCost: CREDIT_COSTS[FalModel.ZImageTurbo],
    provider: AIProvider.Fal,
    falModel: FalModel.ZImageTurbo,
  },
  {
    key: 'fal:kontext-pro',
    userFriendlyName: 'Kontext Pro',
    description: 'Consistencia de personaje, refs de identidad',
    bestFor: 'Mantener identidad sin LoRA, variaciones',
    tags: ['consistency', 'identity', 'quality'],
    requiresFaceRef: false,
    estimatedTime: '~8s',
    creditCost: CREDIT_COSTS[FalModel.KontextPro],
    provider: AIProvider.Fal,
    falModel: FalModel.KontextPro,
  },
  {
    key: 'fal:grok-gen',
    userFriendlyName: 'Grok Imagine',
    description: 'xAI via fal.ai, permissive, aesthetic',
    bestFor: 'Bold creative portraits, no content filters',
    tags: ['artistic', 'permissive', 'fast'],
    requiresFaceRef: false,
    estimatedTime: '~5s',
    creditCost: CREDIT_COSTS[FalModel.GrokImagineGen],
    provider: AIProvider.Fal,
    falModel: FalModel.GrokImagineGen,
  },
  {
    key: 'fal:wan27pro-gen',
    userFriendlyName: 'Wan 2.7 Pro',
    description: 'Alibaba via fal.ai, very realistic',
    bestFor: 'Photorealistic character creation',
    tags: ['photorealism', 'quality'],
    requiresFaceRef: false,
    estimatedTime: '~15s',
    creditCost: CREDIT_COSTS[FalModel.Wan27ProGen],
    provider: AIProvider.Fal,
    falModel: FalModel.Wan27ProGen,
  },
  {
    key: 'replicate:grok',
    userFriendlyName: 'Grok Imagine',
    description: 'xAI creative interpretation',
    bestFor: 'Style transfers, artistic effects',
    tags: ['fast', 'artistic'],
    requiresFaceRef: false,
    estimatedTime: '~4s',
    creditCost: CREDIT_COSTS[ReplicateModel.GrokImagine],
    provider: AIProvider.Replicate,
    replicateModel: ReplicateModel.GrokImagine,
  },
  {
    key: 'replicate:pruna',
    userFriendlyName: 'P-Image Edit',
    description: 'Rápido, económico, sin filtros',
    bestFor: 'Ediciones rápidas, moda, piel',
    tags: ['fast', 'economical'],
    requiresFaceRef: false,
    estimatedTime: '~5s',
    creditCost: CREDIT_COSTS[ReplicateModel.PrunaImageEdit],
    provider: AIProvider.Replicate,
    replicateModel: ReplicateModel.PrunaImageEdit,
  },
  // ── Higgsfield ──
  {
    key: 'higgsfield:soul',
    userFriendlyName: 'Soul 2.0',
    description: 'Fashion-grade editorial realism',
    bestFor: 'Fashion shoots, editorial looks',
    tags: ['photorealism', 'quality'],
    requiresFaceRef: false,
    estimatedTime: '~15s',
    creditCost: CREDIT_COSTS[HiggsfieldModel.SoulStandard],
    provider: AIProvider.Higgsfield,
    higgsfieldModel: HiggsfieldModel.SoulStandard,
  },
  // ── OpenAI (additional) ──
  {
    key: 'openai:gpt-mini',
    userFriendlyName: 'GPT Image Mini',
    description: 'Ultra-fast drafts at lowest cost',
    bestFor: 'Bulk drafts, quick iterations',
    tags: ['fast', 'economical'],
    requiresFaceRef: false,
    estimatedTime: '~3s',
    creditCost: CREDIT_COSTS[OpenAIModel.GptImageMini],
    provider: AIProvider.OpenAI,
    openaiModel: OpenAIModel.GptImageMini,
  },
  // ── FAL Edit-only models ──
  {
    key: 'fal:qwen-edit',
    userFriendlyName: 'Qwen Image 2 Pro',
    description: 'Spatial reasoning, style & lighting edits',
    bestFor: 'Precise edits, text in images',
    tags: ['quality'],
    requiresFaceRef: false,
    estimatedTime: '~15s',
    creditCost: CREDIT_COSTS[FalModel.QwenEdit],
    provider: AIProvider.Fal,
    falModel: FalModel.QwenEdit,
  },
  {
    key: 'fal:firered-edit',
    userFriendlyName: 'FireRed v1.1',
    description: 'Portrait editing, try-on, makeup',
    bestFor: 'Makeup, try-on, face retouching',
    tags: ['quality', 'face'],
    requiresFaceRef: false,
    estimatedTime: '~10s',
    creditCost: CREDIT_COSTS[FalModel.FireRedEdit],
    provider: AIProvider.Fal,
    falModel: FalModel.FireRedEdit,
  },
  {
    key: 'fal:onereward',
    userFriendlyName: 'OneReward',
    description: 'Precise mask-based inpainting',
    bestFor: 'Inpainting, removing objects',
    tags: ['quality'],
    requiresFaceRef: false,
    estimatedTime: '~8s',
    creditCost: CREDIT_COSTS[FalModel.OneReward],
    provider: AIProvider.Fal,
    falModel: FalModel.OneReward,
  },
  {
    key: 'fal:seedream5-edit',
    userFriendlyName: 'Seedream 5 Edit',
    description: 'Intelligent editing, low hallucination',
    bestFor: 'Faithful edits, minimal artifacts',
    tags: ['quality'],
    requiresFaceRef: false,
    estimatedTime: '~12s',
    creditCost: CREDIT_COSTS[FalModel.Seedream5Edit],
    provider: AIProvider.Fal,
    falModel: FalModel.Seedream5Edit,
  },
];

/**
 * Resolve the best engine automatically based on generation context.
 * Called when the user has engine set to 'auto' (Director / creation).
 *
 * Priority:
 * 1. Prompt mentions text/lettering/typography → GPT Image 1.5
 * 2. Has face reference → Gemini NB2 (handles refs well, fast & free)
 * 3. No special needs → Gemini NB2
 *
 * Manual selection always overrides auto.
 */
export function resolveAutoEngine(context: {
  hasFaceRef: boolean;
  prompt: string;
}): { provider: AIProvider; geminiModel?: GeminiImageModel; falModel?: FalModel; openaiModel?: OpenAIModel } {
  const lowerPrompt = context.prompt.toLowerCase();

  // Text rendering needs → GPT Image 1.5 (only model that does text well)
  const textKeywords = ['text', 'lettering', 'typography', 'logo', 'sign', 'label', 'caption', 'headline', 'poster', 'banner', 'written', 'writing', 'words'];
  if (textKeywords.some(kw => lowerPrompt.includes(kw))) {
    return { provider: AIProvider.OpenAI, openaiModel: OpenAIModel.GptImage15 };
  }

  // Default (with or without refs): Nano Banana 2 — fast, free, handles references
  return { provider: AIProvider.Gemini, geminiModel: GeminiImageModel.Flash2 };
}

// ─────────────────────────────────────────────
// Per-feature engine filtering
// ─────────────────────────────────────────────

/** Which ENGINE_METADATA keys are available for each feature. */
export const FEATURE_ENGINES: Record<string, { default: string; keys: string[] }> = {
  // ── Creation ──
  'director': {
    default: 'gemini:nb2',
    keys: ['gemini:nb2', 'replicate:grok', 'fal:seedream50', 'fal:kontext-multi', 'fal:pulid', 'fal:flux-pro'],
  },
  // ── Editing (aligned with benchmarking 2026-03-17) ──
  'photo-session': {
    default: 'replicate:grok',
    keys: ['replicate:grok', 'gemini:nb2', 'fal:seedream5-edit', 'replicate:pruna'],
  },
  'relight': {
    default: 'replicate:grok',
    keys: ['replicate:grok', 'gemini:nb2', 'fal:flux2pro', 'replicate:pruna'],
  },
  'style-transfer': {
    default: 'replicate:grok',
    keys: ['replicate:grok', 'fal:qwen-edit', 'replicate:pruna'],
  },
  'bg-swap': {
    default: 'replicate:grok',
    keys: ['replicate:grok', 'fal:kontext-multi', 'fal:seedream5-edit', 'replicate:pruna'],
  },
  'face-swap': {
    default: 'gemini:nb2',
    keys: ['gemini:nb2', 'replicate:grok', 'replicate:pruna'],
  },
  'try-on': {
    default: 'replicate:grok',
    keys: ['replicate:grok', 'gemini:nb2', 'gemini:pro', 'replicate:pruna'],
  },
  'inpaint': {
    default: 'fal:onereward',
    keys: ['fal:onereward'],
  },
  'enhance': {
    default: 'fal:aura-sr',
    keys: ['fal:aura-sr'],
  },
  'skin-enhancer': {
    default: 'replicate:grok',
    keys: ['replicate:grok', 'fal:firered-edit', 'replicate:pruna', 'gemini:nb2'],
  },
  'angles': {
    default: 'gemini:nb2',
    keys: ['gemini:nb2', 'replicate:grok'],
  },
  // ── Video ──
  'video:image-to-video': {
    default: VideoEngine.Kling26Pro,
    keys: [VideoEngine.Kling26Standard, VideoEngine.Kling26Pro, VideoEngine.Kling3Pro],
  },
  'video:motion-control': {
    default: VideoEngine.Kling26MotionPro,
    keys: [VideoEngine.Kling26MotionStandard, VideoEngine.Kling26MotionPro, VideoEngine.Kling3MotionPro, VideoEngine.WanReplace],
  },
  'video:lip-sync': {
    default: VideoEngine.KlingAvatarPro,
    keys: [VideoEngine.KlingAvatarStandard, VideoEngine.KlingAvatarPro],
  },
};