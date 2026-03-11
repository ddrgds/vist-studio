import { BaseModelAdapter, type EditParams, type ModelResult, type Resolution, type ModelCapability } from './types';

export class NsfwModelsLabAdapter extends BaseModelAdapter {
  id = 'nsfw-modelslab';
  name = 'NSFW Edit';
  provider = 'modelslab' as const;
  capabilities: ModelCapability[] = ['image-edit'];
  baseCost = 15;
  supportsRefPhoto = false;
  locked = true;
  lockReason = 'NSFW models require age verification and a Studio+ plan.';
  resolutionMultiplier: Record<Resolution, number> = { '1K': 1, '2K': 1, '4K': 1 };

  async edit(_params: EditParams): Promise<ModelResult> {
    throw new Error('NSFW model is locked. Enable via age verification + Studio+ plan.');
  }
}
