// ─────────────────────────────────────────────
// ElevenLabs TTS Service
// All calls go through /elevenlabs-api proxy to keep API key server-side
// ─────────────────────────────────────────────

const PROXY_BASE = '/elevenlabs-api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: 'premade' | 'cloned' | 'generated' | 'professional';
  preview_url: string;
  labels?: Record<string, string>;
}

export interface TTSParams {
  text: string;
  voiceId: string;
  modelId?: string;
  outputFormat?: string;
}

// ─────────────────────────────────────────────
// Text-to-Speech → returns audio Blob + object URL
// ─────────────────────────────────────────────

export async function generateSpeech(params: TTSParams): Promise<{ blob: Blob; url: string; file: File }> {
  const res = await fetch(`${PROXY_BASE}/v1/text-to-speech/${params.voiceId}?output_format=${params.outputFormat ?? 'mp3_44100_128'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: params.text,
      model_id: params.modelId ?? 'eleven_multilingual_v2',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const file = new File([blob], 'speech.mp3', { type: 'audio/mpeg' });

  return { blob, url, file };
}

// ─────────────────────────────────────────────
// List voices
// ─────────────────────────────────────────────

export async function listVoices(opts?: {
  category?: 'premade' | 'cloned';
  search?: string;
}): Promise<ElevenLabsVoice[]> {
  const params = new URLSearchParams();
  if (opts?.category) params.set('category', opts.category);
  if (opts?.search) params.set('search', opts.search);
  params.set('page_size', '50');

  const res = await fetch(`${PROXY_BASE}/v2/voices?${params}`);
  if (!res.ok) throw new Error(`List voices failed: ${res.status}`);

  const data = await res.json();
  return data.voices ?? [];
}

// ─────────────────────────────────────────────
// Clone a voice from audio samples
// ─────────────────────────────────────────────

export async function cloneVoice(params: {
  name: string;
  files: File[];
  description?: string;
}): Promise<{ voice_id: string }> {
  const formData = new FormData();
  formData.append('name', params.name);
  params.files.forEach(f => formData.append('files', f));
  if (params.description) formData.append('description', params.description);

  const res = await fetch(`${PROXY_BASE}/v1/voices/add`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`Voice clone failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────
// Preview a voice (play sample audio)
// ─────────────────────────────────────────────

export function playVoicePreview(previewUrl: string): HTMLAudioElement {
  const audio = new Audio(previewUrl);
  audio.play();
  return audio;
}
