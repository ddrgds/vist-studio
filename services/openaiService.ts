import { InfluencerParams, OpenAIModel, AspectRatio } from '../types';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
// API key is injected server-side by the Vite proxy (vite.config.ts)
const BASE_URL = '/openai-api/v1/images';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Devuelve solo la parte base64 sin el prefijo data:...;base64,
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Mapea AspectRatio al tamaño de imagen que acepta OpenAI.
 */
const toOpenAISize = (ratio: AspectRatio): '1024x1024' | '1024x1536' | '1536x1024' => {
  switch (ratio) {
    case AspectRatio.Tall:
    case AspectRatio.Portrait:
      return '1024x1536';
    case AspectRatio.Wide:
    case AspectRatio.Landscape:
      return '1536x1024';
    default:
      return '1024x1024';
  }
};

/**
 * Convierte base64 a data URL para consistencia con el resto de la app.
 */
const b64ToDataUrl = (b64: string, mimeType = 'image/png'): string =>
  `data:${mimeType};base64,${b64}`;

// ─────────────────────────────────────────────
// Construcción del prompt
// ─────────────────────────────────────────────
// ── GPT Image 1.5 prompt structure (research-backed 2026 best practices):
// 6-part structure: subject → action/pose → environment → style → lighting → technical details
// Key: think like a creative director — name the lens for bokeh, specify eye focus, emotional vibe.
const buildPrompt = (params: InfluencerParams): string => {
  const character = params.characters[0];

  // Subject anchor — identity markers first (WisdomAI GPT Image 1.5 guide 2026)
  const subject = character.characteristics
    ? `a model described as: ${character.characteristics}`
    : 'a model';

  let prompt = `Ultra-photorealistic fashion editorial photograph of ${subject}.`;

  if (character.outfitDescription) {
    prompt += ` Wearing: ${character.outfitDescription}.`;
  } else if (character.outfitImages && character.outfitImages.length > 0) {
    prompt += ` Wearing a high-fashion, impeccably styled editorial outfit from the reference.`;
  }

  // Pose + emotional vibe (2026 trend: "emotional vibe-coding")
  if (character.pose) {
    prompt += ` ${character.pose}.`;
  } else {
    prompt += ` Natural, confident editorial stance — weight slightly shifted, relaxed shoulders, direct gaze with presence.`;
  }

  if (character.accessory) {
    prompt += ` Holding: ${character.accessory}.`;
  }

  if (params.scenario) {
    prompt += ` Setting: ${params.scenario}.`;
  }

  // Lighting — specific vocabulary (eWeek GPT Image prompting guide 2026)
  if (params.lighting) {
    prompt += ` Lighting: ${params.lighting}.`;
  } else {
    prompt += ` Lighting: soft north-facing window light, gentle diffusion, warm skin tones.`;
  }

  if (params.imageBoost) {
    prompt += ` ${params.imageBoost}.`;
  }

  // Technical — name the lens for realistic bokeh (GPT Image 1.5 best practice)
  prompt += ' Shot on Sony A7R V, 85mm f/1.4 portrait lens, shallow depth of field, sharp focus on eyes, natural skin texture with pores, realistic hair strands, no AI artifacts, no plastic skin.';

  return prompt;
};

// ─────────────────────────────────────────────
// Generación de texto (sin imágenes de referencia)
// POST /v1/images/generations
// ─────────────────────────────────────────────
const generateFromText = async (
  params: InfluencerParams,
  model: OpenAIModel,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const prompt = buildPrompt(params);
  const count = params.numberOfImages || 1;
  const size = toOpenAISize(params.aspectRatio);

  if (onProgress) onProgress(20);

  const body = {
    model,
    prompt,
    n: count,
    size,
    quality: 'high',
    output_format: 'png',
  };

  const response = await fetch(`${BASE_URL}/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error ${response.status}: ${(err as any)?.error?.message || response.statusText}`);
  }

  const data = await response.json() as { data: { b64_json?: string; url?: string }[] };
  if (onProgress) onProgress(90);

  const results: string[] = [];
  for (const img of data.data) {
    if (img.b64_json) {
      results.push(b64ToDataUrl(img.b64_json, 'image/png'));
    }
  }

  return results;
};

// ─────────────────────────────────────────────
// Generación con imagen de referencia
// POST /v1/images/edits (multipart/form-data)
// ─────────────────────────────────────────────
const generateFromReference = async (
  params: InfluencerParams,
  model: OpenAIModel,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const character = params.characters[0];
  const prompt = buildPrompt(params);
  const count = params.numberOfImages || 1;
  const size = toOpenAISize(params.aspectRatio);

  if (onProgress) onProgress(15);

  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const formData = new FormData();
    formData.append('model', model);
    formData.append('prompt', prompt);
    formData.append('size', size);
    formData.append('quality', 'high');

    // Agrega la principal imagen de referencia (cara/cuerpo, outfit, pose o escenario)
    // El endpoint de OpenAI /v1/images/edits solo acepta un único archivo 'image'
    const allRefs: File[] = [
      ...(character.modelImages || []),
      ...(character.outfitImages || []),
      ...(character.poseImage ? [character.poseImage] : []),
      ...(params.scenarioImage || [])
    ];

    if (allRefs.length > 0) {
      // Usamos la primera imagen disponible (prioridad: modelo > outfit > pose > escenario)
      const mainImg = allRefs[0];
      formData.append('image', mainImg, mainImg.name);
    } else {
      throw new Error("Se requiere al menos una imagen de referencia para editar/generar con la API de OpenAI.");
    }

    if (onProgress) onProgress(20 + (i / count) * 60);

    const response = await fetch(`${BASE_URL}/edits`, {
      method: 'POST',
      body: formData,
      signal: abortSignal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI error ${response.status}: ${(err as any)?.error?.message || response.statusText}`);
    }

    const data = await response.json() as { data: { b64_json?: string }[] };
    if (data.data[0]?.b64_json) {
      results.push(b64ToDataUrl(data.data[0].b64_json, 'image/png'));
    }
  }

  return results;
};

// ─────────────────────────────────────────────
// Punto de entrada público
// ─────────────────────────────────────────────
export const generateWithOpenAI = async (
  params: InfluencerParams,
  model: OpenAIModel = OpenAIModel.GptImage15,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  // API key is injected server-side by the Vite proxy (vite.config.ts)
  if (onProgress) onProgress(5);

  const character = params.characters[0];
  const hasReference = (character.modelImages?.length ?? 0) > 0;

  let results: string[];
  if (hasReference) {
    results = await generateFromReference(params, model, onProgress, abortSignal);
  } else {
    results = await generateFromText(params, model, onProgress, abortSignal);
  }

  if (results.length === 0) {
    throw new Error('OpenAI no devolvió ninguna imagen. Verifica tu API key y los parámetros.');
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// Editor con GPT-image — AI editor
// POST /v1/images/edits (multipart/form-data)
// ─────────────────────────────────────────────
export const editImageWithGPT = async (
  baseImage: File,
  instruction: string,
  onProgress?: (percent: number) => void,
  options?: { aspectRatio?: AspectRatio; model?: string },
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (!instruction.trim()) {
    throw new Error('GPT Image Edit requiere una instrucción de edición.');
  }

  if (onProgress) onProgress(15);

  const size = toOpenAISize(options?.aspectRatio ?? AspectRatio.Square);
  const model = options?.model ?? 'gpt-image-1';

  const formData = new FormData();
  formData.append('model', model);
  formData.append('prompt', instruction);
  formData.append('size', size);
  formData.append('quality', 'high');
  formData.append('image', baseImage, baseImage.name);

  if (onProgress) onProgress(25);

  const response = await fetch(`${BASE_URL}/edits`, {
    method: 'POST',
    body: formData,
    signal: abortSignal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`GPT Image Edit error ${response.status}: ${(err as any)?.error?.message || response.statusText}`);
  }

  const data = await response.json() as { data: { b64_json?: string; url?: string }[] };
  if (onProgress) onProgress(90);

  const results: string[] = [];
  for (const img of data.data) {
    if (img.b64_json) {
      results.push(b64ToDataUrl(img.b64_json, 'image/png'));
    } else if (img.url) {
      // Fallback: fetch url and convert to data URL
      const resp = await fetch(img.url);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      results.push(dataUrl);
    }
  }

  if (results.length === 0) {
    throw new Error('GPT Image Edit no devolvió ninguna imagen. Verifica tu API key.');
  }

  if (onProgress) onProgress(100);
  return results;
};

// ─────────────────────────────────────────────
// ChatGPT Vision (gpt-4o) para Asistente de Poses
// ─────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageBase64?: string; // Sin el prefijo data:...;base64,
}

export const askOpenAIVision = async (messages: ChatMessage[]): Promise<string> => {
  const CHAT_URL = '/openai-api/v1/chat/completions';

  const formattedMessages = messages.map(msg => {
    if (msg.role !== 'user' || !msg.imageBase64) {
      return { role: msg.role, content: msg.content };
    }
    // Si es un user con imagen, armar el formato multi-modal de OpenAI
    return {
      role: msg.role,
      content: [
        { type: "text", text: msg.content },
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${msg.imageBase64}` }
        }
      ]
    };
  });

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "gpt-5-nano",
      messages: formattedMessages,
      response_format: { type: "text" },
      verbosity: "medium",
      reasoning_effort: "medium",
      store: false
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`GPT Vision error ${response.status}: ${(err as any)?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};
