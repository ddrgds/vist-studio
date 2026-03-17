// ─────────────────────────────────────────────
// AI Gateway — Single entry point for all AI operations
//
// Phase 1: Wraps existing frontend services (direct API calls)
// Phase 2: Will call Supabase Edge Functions instead
// The frontend interface stays the same either way.
// ─────────────────────────────────────────────

import { generateInfluencerImage } from './geminiService';
import { generateWithFal } from './falService';
import { generateWithSoul } from './higgsfieldService';
import { generateWithReplicate } from './replicateService';
import { generateWithOpenAI } from './openaiService';
import { generateImageToVideo, generateMotionControl, generateLipSync } from './falVideoService';
import { generateSpeech } from './elevenLabsService';
import { generateConsistent, autoSelectEngine, type ConsistencyParams, type ConsistencyEngine } from './consistencyService';
import {
  AIProvider, ENGINE_METADATA,
  type InfluencerParams, type VideoParams, type LipSyncParams,
  type AspectRatio, type ImageSize
} from '../types';

// ─── Request/Response types ──────────────────

export interface AIRequest {
  type: 'create-persona' | 'content' | 'consistent' | 'edit' | 'video' | 'lipsync' | 'tts';

  // Common
  prompt: string;
  engine?: string;           // engine key from ENGINE_METADATA
  format?: AspectRatio;
  resolution?: ImageSize;

  // For content/create-persona
  params?: InfluencerParams;

  // For video
  videoParams?: VideoParams;

  // For lip sync
  lipSyncParams?: LipSyncParams;

  // For TTS
  ttsText?: string;
  ttsVoiceId?: string;

  // For consistent generation (face-locked)
  referenceUrls?: string[];          // persona's face reference URLs
  consistencyEngine?: ConsistencyEngine;
  idWeight?: number;                 // 0-1, face fidelity
  style?: string;                    // InstantID style preset

  // Progress callback
  onProgress?: (percent: number) => void;
}

export interface AIResponse {
  urls: string[];              // result image/video URLs
  engine_used: string;         // what engine actually ran
  credits_used: number;
}

// ─── Gateway ─────────────────────────────────

export async function aiGenerate(request: AIRequest): Promise<AIResponse> {
  const engineMeta = request.engine
    ? ENGINE_METADATA.find(e => e.key === request.engine)
    : null;

  switch (request.type) {
    case 'create-persona':
    case 'content': {
      if (!request.params) throw new Error('params required for image generation');

      // Route based on engine provider
      const provider = engineMeta?.provider || AIProvider.Gemini;
      let urls: string[];

      switch (provider) {
        case AIProvider.Higgsfield:
          urls = await generateWithSoul(request.params, request.onProgress || (() => {}));
          break;
        case AIProvider.Fal:
          urls = await generateWithFal(request.params, engineMeta?.falModel, request.onProgress || (() => {}));
          break;
        case AIProvider.Replicate:
          urls = await generateWithReplicate(request.params, engineMeta?.replicateModel, request.onProgress || (() => {}));
          break;
        case AIProvider.OpenAI:
          urls = await generateWithOpenAI(request.params, engineMeta?.openaiModel, request.onProgress || (() => {}));
          break;
        case AIProvider.Gemini:
        default:
          urls = await generateInfluencerImage(request.params, request.onProgress || (() => {}));
          break;
      }

      return {
        urls,
        engine_used: request.engine || 'gemini:auto',
        credits_used: engineMeta?.creditCost ?? 2,
      };
    }

    case 'consistent': {
      if (!request.referenceUrls?.length) throw new Error('referenceUrls required for consistent generation');

      const cEngine = request.consistencyEngine || autoSelectEngine({
        referenceCount: request.referenceUrls.length,
        needsStyle: !!request.style,
        style: request.style,
      });

      const result = await generateConsistent({
        engine: cEngine,
        referenceUrls: request.referenceUrls,
        prompt: request.prompt,
        format: request.format,
        idWeight: request.idWeight,
        style: request.style,
      });

      return {
        urls: [result.imageUrl],
        engine_used: `consistency:${result.engine}`,
        credits_used: 10, // ~$0.03-0.04 per image
      };
    }

    case 'video': {
      if (!request.videoParams) throw new Error('videoParams required');
      const mode = request.videoParams.mode;
      let result;

      if (mode === 'motion-control') {
        result = await generateMotionControl(request.videoParams, undefined);
      } else if (mode === 'lip-sync' && request.lipSyncParams) {
        result = await generateLipSync(request.lipSyncParams, undefined);
      } else {
        result = await generateImageToVideo(request.videoParams, undefined);
      }

      return {
        urls: [result.videoUrl],
        engine_used: request.videoParams.engine,
        credits_used: engineMeta?.creditCost ?? 80,
      };
    }

    case 'lipsync': {
      if (!request.lipSyncParams) throw new Error('lipSyncParams required');
      const result = await generateLipSync(request.lipSyncParams, undefined);
      return {
        urls: [result.videoUrl],
        engine_used: request.lipSyncParams.engine,
        credits_used: engineMeta?.creditCost ?? 50,
      };
    }

    case 'tts': {
      if (!request.ttsText || !request.ttsVoiceId) throw new Error('ttsText and ttsVoiceId required');
      const result = await generateSpeech({ text: request.ttsText, voiceId: request.ttsVoiceId });
      return {
        urls: [result.url],
        engine_used: 'elevenlabs',
        credits_used: 0, // TTS is free/included
      };
    }

    case 'edit': {
      // Edit operations stay as direct API calls for now
      // They'll be routed through adapters in Phase 2
      if (!request.params) throw new Error('params required for edit');
      const provider = engineMeta?.provider || AIProvider.Gemini;
      let urls: string[];

      switch (provider) {
        case AIProvider.Fal:
          urls = await generateWithFal(request.params, engineMeta?.falModel, request.onProgress || (() => {}));
          break;
        case AIProvider.Gemini:
        default:
          urls = await generateInfluencerImage(request.params, request.onProgress || (() => {}));
          break;
      }

      return {
        urls,
        engine_used: request.engine || 'gemini:auto',
        credits_used: engineMeta?.creditCost ?? 2,
      };
    }

    default:
      throw new Error(`Unknown request type: ${request.type}`);
  }
}

// ─── Convenience helpers ─────────────────────

export const ai = {
  /** Generate images for persona creation or content */
  generate: (request: Omit<AIRequest, 'type'> & { type?: 'create-persona' | 'content' }) =>
    aiGenerate({ type: 'content', ...request }),

  /** Generate video */
  video: (videoParams: VideoParams) =>
    aiGenerate({ type: 'video', prompt: '', videoParams }),

  /** Generate lip sync */
  lipSync: (lipSyncParams: LipSyncParams) =>
    aiGenerate({ type: 'lipsync', prompt: '', lipSyncParams }),

  /** Text to speech */
  tts: (text: string, voiceId: string) =>
    aiGenerate({ type: 'tts', prompt: '', ttsText: text, ttsVoiceId: voiceId }),

  /** Generate with face consistency (PuLID/InstantID) */
  consistent: (opts: {
    referenceUrls: string[];
    prompt: string;
    format?: AspectRatio;
    engine?: ConsistencyEngine;
    idWeight?: number;
    style?: string;
  }) => aiGenerate({
    type: 'consistent',
    prompt: opts.prompt,
    referenceUrls: opts.referenceUrls,
    format: opts.format,
    consistencyEngine: opts.engine,
    idWeight: opts.idWeight,
    style: opts.style,
  }),
};
