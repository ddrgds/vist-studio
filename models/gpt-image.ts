import { BaseModelAdapter, type EditParams, type ModelResult, type Resolution, type ModelCapability } from './types';
import { editImageWithGPT } from '../services/openaiService';

export class GPTImageAdapter extends BaseModelAdapter {
  id = 'gpt-image';
  name = 'GPT Image 1.5';
  provider = 'openai' as const;
  capabilities: ModelCapability[] = ['text-to-image', 'image-edit'];
  baseCost = 20;
  supportsRefPhoto = true;
  resolutionMultiplier: Record<Resolution, number> = { '1K': 1, '2K': 1.5, '4K': 2 };

  async edit(params: EditParams): Promise<ModelResult> {
    const urls = await editImageWithGPT(
      params.image,
      params.instruction,
      params.onProgress,
      undefined,
      params.abortSignal,
    );
    return { urls };
  }
}
