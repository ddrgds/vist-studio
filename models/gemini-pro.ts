import { BaseModelAdapter, type EditParams, type ModelResult, type Resolution, type ModelCapability } from './types';
import { editImageWithAI, modifyInfluencerPose } from '../services/geminiService';
import { GeminiImageModel } from '../types';

export class GeminiProAdapter extends BaseModelAdapter {
  id = 'gemini-pro';
  name = 'Gemini Pro';
  provider = 'gemini' as const;
  capabilities: ModelCapability[] = ['text-to-image', 'image-edit', 'pose'];
  baseCost = 5;
  supportsRefPhoto = false;
  resolutionMultiplier: Record<Resolution, number> = { '1K': 1, '2K': 1.5, '4K': 2.5 };

  async edit(params: EditParams): Promise<ModelResult> {
    const urls = await editImageWithAI({
      baseImage: params.image,
      instruction: params.instruction,
      model: GeminiImageModel.Pro,
    });
    return { urls };
  }
}
