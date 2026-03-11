import { BaseModelAdapter, type EditParams, type SessionParams, type ModelResult, type Resolution, type ModelCapability } from './types';
import { editImageWithGrokFal, generatePhotoSessionWithGrok } from '../services/falService';

export class GrokAdapter extends BaseModelAdapter {
  id = 'grok';
  name = 'Grok';
  provider = 'fal' as const;
  capabilities: ModelCapability[] = ['image-edit', 'photo-session'];
  baseCost = 12;
  supportsRefPhoto = false;
  resolutionMultiplier: Record<Resolution, number> = { '1K': 1, '2K': 1, '4K': 1 };

  async edit(params: EditParams): Promise<ModelResult> {
    const urls = await editImageWithGrokFal(
      params.image,
      params.instruction,
      params.onProgress,
      params.abortSignal,
    );
    return { urls };
  }

  async session(params: SessionParams): Promise<ModelResult> {
    const results = await generatePhotoSessionWithGrok(
      params.referenceImage,
      params.count,
      { scenario: params.scenario, angles: params.angles },
      params.onProgress,
      params.abortSignal,
    );
    return { urls: results.map(r => r.url) };
  }
}
