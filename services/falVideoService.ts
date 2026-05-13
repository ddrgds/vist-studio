import { fal } from '@fal-ai/client';
import { VideoEngine, VideoParams, LipSyncParams } from '../types';

// ─────────────────────────────────────────────
// fal.ai Video Service — Motion Control, Lip Sync, Image-to-Video
// Uses the same proxy as falService.ts (/fal-api)
// ─────────────────────────────────────────────

// Config is shared — already set in falService.ts, but safe to call again
fal.config({ proxyUrl: '/fal-api' });

// ─────────────────────────────────────────────
// Model ID mapping
// ─────────────────────────────────────────────

const VIDEO_MODEL_IDS: Record<string, string> = {
  // Image-to-Video
  [VideoEngine.Seedance2]: 'bytedance/seedance-2.0/image-to-video',
  [VideoEngine.Kling26Standard]: 'fal-ai/kling-video/v2.6/standard/image-to-video',
  [VideoEngine.Kling26Pro]: 'fal-ai/kling-video/v2.6/pro/image-to-video',
  [VideoEngine.Kling3Pro]: 'fal-ai/kling-video/v3/pro/image-to-video',
  // Motion Control
  [VideoEngine.Kling26MotionStandard]: 'fal-ai/kling-video/v2.6/standard/motion-control',
  [VideoEngine.Kling26MotionPro]: 'fal-ai/kling-video/v2.6/pro/motion-control',
  [VideoEngine.Kling3MotionPro]: 'fal-ai/kling-video/v3/pro/motion-control',
  [VideoEngine.WanReplace]: 'fal-ai/wan/v2.2-14b/animate/replace',
  // Lip Sync / Avatar
  [VideoEngine.KlingAvatarStandard]: 'fal-ai/kling-video/ai-avatar/v2/standard',
  [VideoEngine.KlingAvatarPro]: 'fal-ai/kling-video/ai-avatar/v2/pro',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const unwrap = (result: any): any => result?.data ?? result ?? {};

/** Upload a File to fal.storage and return the public URL. */
const uploadFile = async (file: File): Promise<string> => {
  return await fal.storage.upload(file);
};

export interface VideoProgress {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
  queuePosition?: number;
  logs?: string[];
}

export interface VideoResult {
  videoUrl: string;
  duration?: number;
}

// ─────────────────────────────────────────────
// Image-to-Video
// ─────────────────────────────────────────────

export async function generateImageToVideo(
  params: VideoParams,
  onProgress?: (progress: VideoProgress) => void,
): Promise<VideoResult> {
  const modelId = VIDEO_MODEL_IDS[params.engine];
  if (!modelId) throw new Error(`Unknown video engine: ${params.engine}`);

  const imageUrl = await uploadFile(params.baseImage);
  const endImageUrl = params.endImage ? await uploadFile(params.endImage) : undefined;

  // Seedance 2.0 uses a different input schema — image_url (not start_image_url),
  // explicit aspect_ratio + resolution, no negative_prompt, no shot_type.
  // Defaults tuned for reels: 9:16 vertical, 720p, 5s, audio on.
  if (params.engine === VideoEngine.Seedance2) {
    const seedanceInput: Record<string, any> = {
      image_url: imageUrl,
      prompt: params.prompt || 'Animate this character naturally',
      duration: params.duration || '5',
      aspect_ratio: params.aspectRatio || '9:16',
      resolution: params.resolution || '720p',
      generate_audio: true,
    };
    if (endImageUrl) seedanceInput.end_image_url = endImageUrl;

    const result = await fal.subscribe(modelId, {
      input: seedanceInput,
      timeout: 300000,
      onQueueUpdate: buildQueueHandler(onProgress),
    });
    const data = unwrap(result);
    return { videoUrl: data.video?.url, duration: data.duration };
  }

  // Kling family — original schema.
  const isV3 = params.engine === VideoEngine.Kling3Pro;
  const input: Record<string, any> = {
    start_image_url: imageUrl,
    prompt: params.prompt || 'Animate this character naturally',
    duration: params.duration || '5',
    negative_prompt: 'blur, distort, low quality',
    generate_audio: true,
  };

  if (endImageUrl) input.end_image_url = endImageUrl;
  if (isV3) input.shot_type = 'customize';

  const result = await fal.subscribe(modelId, {
    input,
    timeout: 300000, // 5 min
    onQueueUpdate: buildQueueHandler(onProgress),
  });

  const data = unwrap(result);
  return {
    videoUrl: data.video?.url,
    duration: data.duration,
  };
}

// ─────────────────────────────────────────────
// Motion Control
// ─────────────────────────────────────────────

export async function generateMotionControl(
  params: VideoParams,
  onProgress?: (progress: VideoProgress) => void,
): Promise<VideoResult> {
  if (!params.referenceVideo) throw new Error('Motion control requires a reference video');

  const modelId = VIDEO_MODEL_IDS[params.engine];
  if (!modelId) throw new Error(`Unknown motion engine: ${params.engine}`);

  const [imageUrl, videoUrl] = await Promise.all([
    uploadFile(params.baseImage),
    uploadFile(params.referenceVideo),
  ]);

  // Wan Replace has a different input schema
  if (params.engine === VideoEngine.WanReplace) {
    const result = await fal.subscribe(modelId, {
      input: {
        image_url: imageUrl,
        video_url: videoUrl,
        resolution: '720p',
        video_quality: 'high',
        num_inference_steps: 20,
      },
      timeout: 600000, // 10 min — Wan can be slow
      onQueueUpdate: buildQueueHandler(onProgress),
    });

    const data = unwrap(result);
    return { videoUrl: data.video?.url };
  }

  // Kling Motion Control (v2.6 / v3)
  const result = await fal.subscribe(modelId, {
    input: {
      image_url: imageUrl,
      video_url: videoUrl,
      prompt: params.prompt || '',
      character_orientation: params.characterOrientation || 'video',
      keep_original_sound: true,
    },
    timeout: 600000,
    onQueueUpdate: buildQueueHandler(onProgress),
  });

  const data = unwrap(result);
  return { videoUrl: data.video?.url };
}

// ─────────────────────────────────────────────
// Lip Sync (Kling Avatar)
// ─────────────────────────────────────────────

export async function generateLipSync(
  params: LipSyncParams,
  onProgress?: (progress: VideoProgress) => void,
): Promise<VideoResult> {
  const modelId = VIDEO_MODEL_IDS[params.engine];
  if (!modelId) throw new Error(`Unknown lip sync engine: ${params.engine}`);

  const [imageUrl, audioUrl] = await Promise.all([
    uploadFile(params.characterImage),
    uploadFile(params.audioFile),
  ]);

  const result = await fal.subscribe(modelId, {
    input: {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt: params.prompt || '.',
    },
    timeout: 600000,
    onQueueUpdate: buildQueueHandler(onProgress),
  });

  const data = unwrap(result);
  return {
    videoUrl: data.video?.url,
    duration: data.duration,
  };
}

// ─────────────────────────────────────────────
// Recast — character replacement in video.
// Two engines:
//   - 'kling3' (DEFAULT 2026-05-13) → Kling 3 Pro Motion Control. Better
//     identity preservation frame-to-frame, sharper output, more expensive.
//   - 'wan'    → Wan 2.2 Animate Replace. Cheaper Express tier, occasional
//     identity flicker on fast motion. Kept as fallback / budget option.
// Input video and character image both go to fal.storage; the model swaps
// the person in the video with the character while keeping background,
// lighting, and camera intact.
// ─────────────────────────────────────────────

export type RecastEngine = 'kling3' | 'wan';

export interface RecastParams {
  /** User-recorded video where the AI character will replace the person */
  sourceVideo: File;
  /** Character reference image (clean portrait or full body) */
  characterImage: File;
  /** Which engine to use. Defaults to 'kling3' for best identity preservation. */
  engine?: RecastEngine;
  /** Output resolution. Cost: 480p $0.04/s · 580p $0.06/s · 720p $0.08/s */
  resolution?: '480p' | '580p' | '720p';
  /** Optional prompt — Kling 3 only; refines motion intent. */
  prompt?: string;
  /** Character orientation — Kling 3 only. 'video' = follow source video. */
  characterOrientation?: 'image' | 'video';
  /** Wan-specific: quality preset (low / medium / high / maximum). */
  quality?: 'low' | 'medium' | 'high' | 'maximum';
  /** Wan-specific: 30% faster generation at slight quality cost. */
  useTurbo?: boolean;
  abortSignal?: AbortSignal;
}

/**
 * Recast — character replacement in a source video.
 * Dispatches to Kling 3 Pro Motion (default) or Wan 2.2 Animate Replace.
 */
export async function recastVideo(
  params: RecastParams,
  onProgress?: (progress: VideoProgress) => void,
): Promise<VideoResult> {
  const engine: RecastEngine = params.engine ?? 'kling3';
  const [videoUrl, imageUrl] = await Promise.all([
    uploadFile(params.sourceVideo),
    uploadFile(params.characterImage),
  ]);

  if (engine === 'kling3') {
    const result = await fal.subscribe('fal-ai/kling-video/v3/pro/motion-control', {
      input: {
        image_url: imageUrl,
        video_url: videoUrl,
        prompt: params.prompt ?? '',
        character_orientation: params.characterOrientation ?? 'video',
        keep_original_sound: true,
      },
      timeout: 600000,
      onQueueUpdate: buildQueueHandler(onProgress),
      ...(params.abortSignal ? { signal: params.abortSignal } : {}),
    });
    const data = unwrap(result);
    return { videoUrl: data.video?.url };
  }

  // Wan 2.2 Animate Replace — Express tier.
  const result = await fal.subscribe('fal-ai/wan/v2.2-14b/animate/replace', {
    input: {
      video_url: videoUrl,
      image_url: imageUrl,
      resolution: params.resolution ?? '480p',
      video_quality: params.quality ?? 'high',
      use_turbo: params.useTurbo ?? false,
      num_inference_steps: 20,
    },
    timeout: 600000,
    onQueueUpdate: buildQueueHandler(onProgress),
    ...(params.abortSignal ? { signal: params.abortSignal } : {}),
  });
  const data = unwrap(result);
  return { videoUrl: data.video?.url };
}

/** @deprecated — use recastVideo with engine: 'wan'. Kept for backward compat. */
export async function recastVideoWithWan(
  params: RecastParams,
  onProgress?: (progress: VideoProgress) => void,
): Promise<VideoResult> {
  return recastVideo({ ...params, engine: 'wan' }, onProgress);
}

// ─────────────────────────────────────────────
// Shared queue update handler
// ─────────────────────────────────────────────

function buildQueueHandler(onProgress?: (progress: VideoProgress) => void) {
  return (update: any) => {
    if (!onProgress) return;
    if (update.status === 'IN_QUEUE') {
      onProgress({ status: 'IN_QUEUE', queuePosition: update.queue_position });
    } else if (update.status === 'IN_PROGRESS') {
      onProgress({
        status: 'IN_PROGRESS',
        logs: update.logs?.map((l: any) => l.message) ?? [],
      });
    }
  };
}
