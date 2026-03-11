/** AI Model adapter interfaces — every model implements this contract */

export type Resolution = '1K' | '2K' | '4K';

export type ModelCapability =
  | 'text-to-image'
  | 'image-edit'
  | 'pose'
  | 'face-swap'
  | 'photo-session'
  | 'face-360';

export interface GenerateParams {
  prompt: string;
  resolution: Resolution;
  aspectRatio?: string;
  count?: number;
  abortSignal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

export interface EditParams {
  image: File;
  instruction: string;
  resolution: Resolution;
  referencePhoto?: File;
  abortSignal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

export interface SessionParams {
  referenceImage: File;
  count: number;
  scenario: string;
  angles?: string[];
  resolution: Resolution;
  abortSignal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

export interface ModelResult {
  urls: string[];
}

export interface AIModelAdapter {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Provider key for proxy routing */
  provider: 'gemini' | 'fal' | 'openai' | 'replicate' | 'modelslab';
  /** What this model can do */
  capabilities: ModelCapability[];
  /** Base credit cost (before resolution multiplier) */
  baseCost: number;
  /** Whether this model supports reference photo uploads */
  supportsRefPhoto: boolean;
  /** Resolution multipliers */
  resolutionMultiplier: Record<Resolution, number>;
  /** Is this model locked behind age verification / plan? */
  locked?: boolean;
  lockReason?: string;

  /** Calculate effective credit cost for a given resolution */
  getCost(resolution: Resolution): number;

  /** Edit an existing image with an instruction */
  edit(params: EditParams): Promise<ModelResult>;

  /** Generate images from text */
  generate?(params: GenerateParams): Promise<ModelResult>;

  /** Run a multi-angle photo session */
  session?(params: SessionParams): Promise<ModelResult>;
}

/** Base class implementing shared logic */
export abstract class BaseModelAdapter implements AIModelAdapter {
  abstract id: string;
  abstract name: string;
  abstract provider: 'gemini' | 'fal' | 'openai' | 'replicate' | 'modelslab';
  abstract capabilities: ModelCapability[];
  abstract baseCost: number;
  abstract supportsRefPhoto: boolean;
  abstract resolutionMultiplier: Record<Resolution, number>;
  locked?: boolean;
  lockReason?: string;

  getCost(resolution: Resolution): number {
    return Math.ceil(this.baseCost * (this.resolutionMultiplier[resolution] ?? 1));
  }

  abstract edit(params: EditParams): Promise<ModelResult>;
  generate?(params: GenerateParams): Promise<ModelResult>;
  session?(params: SessionParams): Promise<ModelResult>;
}
