// services/dashscopeService.ts — DashScope (Alibaba) Wan 2.7 direct API
// Replaces Wan via fal.ai: native 2K, up to 9 refs, custom pixel sizes.

import { fal } from '@fal-ai/client';
import { AspectRatio } from '../types';

const DASHSCOPE_BASE = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashscope-api`;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Upload a File to fal.storage (reuse existing infra) to get an HTTP URL for DashScope */
const uploadImage = async (file: File): Promise<string> => {
  return await fal.storage.upload(file);
};

/** Convert aspect ratio + resolution to DashScope size param */
const toDashScopeSize = (aspectRatio?: AspectRatio, resolution?: '1K' | '2K'): string => {
  if (!aspectRatio || !resolution || resolution === '1K') return '1K';
  if (resolution === '2K') {
    // Custom pixel sizes for 2K with specific aspect ratios
    const sizes: Record<string, string> = {
      [AspectRatio.Square]:    '2048*2048',
      [AspectRatio.Portrait]:  '1536*2048',
      [AspectRatio.Landscape]: '2048*1536',
      [AspectRatio.Wide]:      '2048*1152',
      [AspectRatio.Tall]:      '1152*2048',
    };
    return sizes[aspectRatio] ?? '2K';
  }
  return resolution;
};

/** Poll a DashScope task until completion */
const pollTask = async (
  taskId: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  const checkUrl = `${DASHSCOPE_BASE}/tasks/${taskId}`;
  let status = 'PENDING';
  let attempts = 0;
  const maxAttempts = 20; // 60s max (3s × 20)

  while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'CANCELLED') {
    if (abortSignal?.aborted) throw new Error('Cancelado');
    if (attempts >= maxAttempts) throw new Error('DashScope timeout — task still running');

    await new Promise(r => setTimeout(r, 3000));
    attempts++;

    if (onProgress) {
      // Progress: 30% (upload) + 70% (generation) spread across polls
      onProgress(Math.min(95, 30 + (attempts / maxAttempts) * 65));
    }

    const res = await fetch(checkUrl, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error(`DashScope poll failed: HTTP ${res.status}`);

    const data = await res.json();
    status = data?.output?.task_status;

    if (status === 'SUCCEEDED') {
      const choices = data?.output?.choices ?? [];
      const urls: string[] = [];
      for (const choice of choices) {
        const content = choice?.message?.content ?? [];
        for (const item of content) {
          if (item?.type === 'image' && item?.image) urls.push(item.image);
        }
      }
      if (urls.length === 0) throw new Error('DashScope returned no images');
      return urls;
    }

    if (status === 'FAILED') {
      const code = data?.output?.code ?? '';
      const message = data?.output?.message ?? 'Unknown error';
      throw new Error(`DashScope failed: ${code} — ${message}`);
    }
  }

  throw new Error(`DashScope task ended with status: ${status}`);
};

// ─────────────────────────────────────────────
// Image Editing — replaces editWithWan27Fal
// ─────────────────────────────────────────────

export const editWithWanDirect = async (
  baseImage: File,
  instruction: string,
  referenceImages: File[] = [],
  onProgress?: (percent: number) => void,
  options?: { aspectRatio?: AspectRatio; resolution?: '1K' | '2K'; seed?: number },
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(5);

  // Upload all images to get HTTP URLs
  const allFiles = [baseImage, ...referenceImages.slice(0, 8)]; // max 9 total
  const imageUrls = await Promise.all(allFiles.map(f => uploadImage(f)));
  if (onProgress) onProgress(25);

  // Build messages content: images first, then text instruction
  const content: Array<{ image: string } | { text: string }> = [];
  for (const url of imageUrls) {
    content.push({ image: url });
  }
  content.push({ text: instruction });

  const size = toDashScopeSize(options?.aspectRatio, options?.resolution);

  const payload = {
    model: 'wan2.7-image',
    input: {
      messages: [{ role: 'user', content }],
    },
    parameters: {
      size,
      n: 1,
      watermark: false,
      ...(options?.seed !== undefined && { seed: options.seed }),
    },
  };

  if (onProgress) onProgress(30);

  // Submit async task
  const submitUrl = `${DASHSCOPE_BASE}/services/aigc/image-generation/generation`;
  const res = await fetch(submitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: abortSignal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('DashScope response:', res.status, errText);
    const err = (() => { try { return JSON.parse(errText); } catch { return {}; } })();
    throw new Error(`DashScope failed: ${err?.error || err?.message || errText.slice(0, 200) || res.status}`);
  }

  const result = await res.json();
  const taskId = result?.output?.task_id;
  if (!taskId) throw new Error('DashScope did not return task_id');

  // Poll until completion
  const urls = await pollTask(taskId, onProgress, abortSignal);
  if (onProgress) onProgress(100);
  return urls;
};

// ─────────────────────────────────────────────
// Text-to-Image — replaces generateWithWan27Fal
// ─────────────────────────────────────────────

export const generateWithWanDirect = async (
  prompt: string,
  options?: { aspectRatio?: AspectRatio; resolution?: '1K' | '2K'; n?: number; seed?: number },
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> => {
  if (abortSignal?.aborted) throw new Error('Cancelado');
  if (onProgress) onProgress(5);

  const size = toDashScopeSize(options?.aspectRatio, options?.resolution);

  const payload = {
    model: 'wan2.7-image',
    input: {
      messages: [{ role: 'user', content: [{ text: prompt }] }],
    },
    parameters: {
      size,
      n: options?.n ?? 1,
      watermark: false,
      ...(options?.seed !== undefined && { seed: options.seed }),
    },
  };

  if (onProgress) onProgress(15);

  const submitUrl = `${DASHSCOPE_BASE}/services/aigc/image-generation/generation`;
  const res = await fetch(submitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: abortSignal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('DashScope response:', res.status, errText);
    const err = (() => { try { return JSON.parse(errText); } catch { return {}; } })();
    throw new Error(`DashScope failed: ${err?.error || err?.message || errText.slice(0, 200) || res.status}`);
  }

  const result = await res.json();
  const taskId = result?.output?.task_id;
  if (!taskId) throw new Error('DashScope did not return task_id');

  const urls = await pollTask(taskId, onProgress, abortSignal);
  if (onProgress) onProgress(100);
  return urls;
};
