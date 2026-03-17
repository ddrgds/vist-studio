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

  // Build input based on engine version
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
    onQueueUpdate: (update) => {
      if (!onProgress) return;
      if (update.status === 'IN_QUEUE') {
        onProgress({ status: 'IN_QUEUE', queuePosition: (update as any).queue_position });
      } else if (update.status === 'IN_PROGRESS') {
        onProgress({
          status: 'IN_PROGRESS',
          logs: (update as any).logs?.map((l: any) => l.message) ?? [],
        });
      }
    },
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
