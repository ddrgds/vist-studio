import { BaseModelAdapter, type EditParams, type GenerateParams, type SessionParams, type ModelResult, type Resolution, type ModelCapability } from './types';
import { editImageWithAI, modifyInfluencerPose, generatePhotoSession } from '../services/geminiService';
import { GeminiImageModel, ImageSize, AspectRatio } from '../types';

export class GeminiNB2Adapter extends BaseModelAdapter {
  id = 'gemini-nb2';
  name = 'Gemini NB2';
  provider = 'gemini' as const;
  capabilities: ModelCapability[] = ['text-to-image', 'image-edit', 'pose', 'face-swap', 'photo-session', 'face-360'];
  baseCost = 2;
  supportsRefPhoto = false;
  resolutionMultiplier: Record<Resolution, number> = { '1K': 1, '2K': 1.5, '4K': 2.5 };

  async edit(params: EditParams): Promise<ModelResult> {
    const urls = await editImageWithAI({
      baseImage: params.image,
      instruction: params.instruction,
      model: GeminiImageModel.Flash2,
    });
    return { urls };
  }

  async generate(params: GenerateParams): Promise<ModelResult> {
    // Uses the same edit path with Gemini for text-to-image
    const urls = await editImageWithAI({
      baseImage: new File([], 'empty'),
      instruction: params.prompt,
      model: GeminiImageModel.Flash2,
    });
    return { urls };
  }

  async session(params: SessionParams): Promise<ModelResult> {
    const results = await generatePhotoSession(
      params.referenceImage,
      params.count,
      { scenario: params.scenario, lighting: 'natural cinematic', angles: params.angles },
      params.onProgress,
      params.abortSignal,
    );
    return { urls: results.map(r => r.url).filter(Boolean) as string[] };
  }
}
