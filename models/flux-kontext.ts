import { BaseModelAdapter, type EditParams, type ModelResult, type Resolution, type ModelCapability } from './types';
import { editImageWithFluxKontext } from '../services/falService';

export class FluxKontextAdapter extends BaseModelAdapter {
  id = 'flux-kontext';
  name = 'FLUX Kontext';
  provider = 'fal' as const;
  capabilities: ModelCapability[] = ['image-edit', 'pose'];
  baseCost = 10;
  supportsRefPhoto = true;
  resolutionMultiplier: Record<Resolution, number> = { '1K': 1, '2K': 1, '4K': 1 };

  async edit(params: EditParams): Promise<ModelResult> {
    const urls = await editImageWithFluxKontext(
      params.image,
      params.instruction,
      params.onProgress,
      undefined,
      params.abortSignal,
    );
    return { urls };
  }
}
