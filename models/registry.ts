import type { AIModelAdapter } from './types';
import { GeminiNB2Adapter } from './gemini-nb2';
import { GeminiProAdapter } from './gemini-pro';
import { FluxKontextAdapter } from './flux-kontext';
import { GrokAdapter } from './grok';
import { GPTImageAdapter } from './gpt-image';
import { NsfwModelsLabAdapter } from './nsfw-modelslab';

/** All registered AI models — add a new model = add one line here */
const models: AIModelAdapter[] = [
  new GeminiNB2Adapter(),
  new GeminiProAdapter(),
  new FluxKontextAdapter(),
  new GrokAdapter(),
  new GPTImageAdapter(),
  new NsfwModelsLabAdapter(),
];

/** Map for O(1) lookup */
const registry = new Map<string, AIModelAdapter>(
  models.map(m => [m.id, m])
);

/** Get a model adapter by ID */
export function getModel(id: string): AIModelAdapter {
  const model = registry.get(id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  return model;
}

/** Get all registered models */
export function getAllModels(): AIModelAdapter[] {
  return models;
}

/** Get models that have a specific capability */
export function getModelsWithCapability(cap: string): AIModelAdapter[] {
  return models.filter(m => m.capabilities.includes(cap as any));
}

/** Default model ID */
export const DEFAULT_MODEL_ID = 'gemini-nb2';
