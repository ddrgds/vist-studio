

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

export enum VideoEngine {
  KlingStandard = 'kling-standard',
  KlingPro = 'kling-pro',
  RunwayGen3 = 'runway-gen3',
  LumaDreamMachine = 'luma-dream-machine',
}

export interface VideoParams {
  baseImage: File;
  prompt: string;
  dialogue: string;
  voiceFile?: File | null;
  resolution: VideoResolution;
  aspectRatio: AspectRatio;
  engine?: VideoEngine;
  referenceVideo?: File | null; // For Kling Motion Control
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
  Gemini = 'gemini',
  Fal = 'fal',
  Replicate = 'replicate',
  OpenAI = 'openai',
  Ideogram = 'ideogram',
  ModelsLab = 'modelslab',
}

export const AI_PROVIDER_LABELS: Record<AIProvider, { name: string; icon: string; description: string }> = {
  [AIProvider.Gemini]: { name: 'Gemini', icon: '✦', description: 'Multi-character, complex scenes' },
  [AIProvider.Fal]: { name: 'fal.ai', icon: '⚡', description: 'FLUX.1 Kontext — multi-reference identity · 2026' },
  [AIProvider.Replicate]: { name: 'Replicate', icon: '👗', description: 'FLUX.2 Max + Gen-4 Image + Virtual Try-On' },
  [AIProvider.OpenAI]: { name: 'GPT Image', icon: '🤖', description: 'GPT Image 1.5 — multimodal with reference' },
  [AIProvider.Ideogram]: { name: 'Ideogram', icon: '💡', description: 'Ideogram V3 — advanced typography and style' },
  [AIProvider.ModelsLab]: { name: 'ModelsLab', icon: '🔞', description: 'Uncensored NSFW — Lustify SDXL + 10K models' },
};

// Available models per provider
export enum FalModel {
  KontextMulti = 'fal-ai/flux-pro/kontext/multi',      // FLUX.1 Kontext — multi-ref identity gen · 2026
  KontextMaxMulti = 'fal-ai/flux-pro/kontext/max/multi',  // FLUX.1 Kontext Max — maximum quality · 2026
  Flux2Pro = 'fal-ai/flux-2-pro/edit',                    // FLUX.2 Pro Edit — multi-ref image editor
  Seedream45 = 'fal-ai/bytedance/seedream/v4.5/text-to-image',   // ByteDance — photorealism 4K
  Seedream50 = 'fal-ai/bytedance/seedream/v5/lite/text-to-image', // ByteDance — web search + reasoning
  ZImageTurbo = 'fal-ai/z-image/turbo',                  // Alibaba Tongyi-MAI 6B — uncensored, $0.005/mp · 2025
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
}

export enum OpenAIModel {
  GptImage15 = 'gpt-image-1.5',   // Latest, fastest GPT Image model
  GptImage1 = 'gpt-image-1',     // Original GPT Image model
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
};


export const IDEOGRAM_MODEL_LABELS: Record<IdeogramModel, { name: string; description: string }> = {
  [IdeogramModel.V3]: { name: 'V3', description: 'Latest model, character reference, best quality' },
  [IdeogramModel.V2A]: { name: 'V2A', description: 'Balanced, advanced typography' },
  [IdeogramModel.V2ATurbo]: { name: 'V2A Turbo', description: 'Fast and economical' },
};

export const VIDEO_ENGINE_LABELS: Record<VideoEngine, { name: string; icon: string; description: string }> = {
  [VideoEngine.KlingStandard]: { name: 'Kling 1.5 Standard', icon: '🎥', description: 'Fast, 5s. Supports Motion Control.' },
  [VideoEngine.KlingPro]: { name: 'Kling 1.5 Pro', icon: '🎬', description: 'High quality, 1080p. Supports Motion Control.' },
  [VideoEngine.RunwayGen3]: { name: 'Runway Gen-3', icon: '🏃', description: 'Exceptional frame consistency' },
  [VideoEngine.LumaDreamMachine]: { name: 'Luma', icon: '✨', description: 'Smooth and dynamic camera movements' },
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
export const CREDIT_COSTS: Record<string, number> = {
  // Gemini
  [GeminiImageModel.Flash]:      2,
  [GeminiImageModel.Flash2]:     2,
  [GeminiImageModel.Pro]:        10,
  [GeminiImageModel.Imagen4]:    8,
  [GeminiImageModel.Imagen4Ultra]: 20,
  [GeminiImageModel.Imagen4Fast]: 5,
  // FAL
  [FalModel.KontextMulti]:    10,
  [FalModel.KontextMaxMulti]: 15,
  [FalModel.Flux2Pro]:        10,
  [FalModel.Seedream45]:      8,
  [FalModel.Seedream50]:      8,
  [FalModel.ZImageTurbo]:     5,
  // Replicate
  [ReplicateModel.Flux2Max]:    12,
  [ReplicateModel.Gen4Image]:   15,
  [ReplicateModel.IDMVTON]:     15,
  [ReplicateModel.GrokImagine]: 10,
  // OpenAI
  [OpenAIModel.GptImage15]: 20,
  [OpenAIModel.GptImage1]:  15,
  // Ideogram
  [IdeogramModel.V3]:       15,
  [IdeogramModel.V2A]:      12,
  [IdeogramModel.V2ATurbo]: 10,
  // ModelsLab (NSFW)
  [ModelsLabModel.NsfwSdxl]:    8,
  [ModelsLabModel.LustifySdxl]: 8,
  [ModelsLabModel.WaiNsfw]:     8,
  [ModelsLabModel.FluxNsfw]:    8,
  // Video
  [VideoEngine.KlingStandard]:   80,
  [VideoEngine.KlingPro]:        100,
  [VideoEngine.RunwayGen3]:      100,
  [VideoEngine.LumaDreamMachine]: 80,
};

/** Credits for special operations (not covered by CREDIT_COSTS model map). */
export const OPERATION_CREDIT_COSTS = {
  faceSwap:      15,
  upscale:       8,
  relight:       10,
  virtualTryOn:  15,
  lipsync:       50,
  skinEnhancer:  8,
  inpaint:       8,
  photoSession:  10, // per shot
} as const;