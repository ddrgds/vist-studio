import { fal } from '@fal-ai/client';

// ─────────────────────────────────────────────
// Legacy single-light types (kept for compat)
// ─────────────────────────────────────────────

export interface RelightSettings {
  azimuth: number;          // 0–360°
  elevation: number;        // -90° to +90°
  intensity: number;        // 0.1–2.0
  colorTemperature: number; // 2000–9000 K
  shadowStrength: number;   // 0–1
  softness: number;         // 0–1
  spread: number;           // 0–1
}

// ─────────────────────────────────────────────
// Studio types
// ─────────────────────────────────────────────

export type LightType = 'key' | 'fill' | 'rim' | 'back' | 'spot' | 'area';

export const LIGHT_TYPE_ACCENT: Record<LightType, string> = {
  key:  '#f5d47a',
  fill: '#88bbff',
  rim:  '#e0f4ff',
  back: '#ffb380',
  spot: '#ffffff',
  area: '#c8e0ff',
};

export interface LightSource {
  id: string;
  type: LightType;
  label: string;
  enabled: boolean;
  azimuth: number;          // -180..+180 (0=front, 90=right, -90=left, ±180=back)
  elevation: number;        // -90..+90
  intensity: number;        // 0.1–2.0
  colorTemperature: number; // 2000–9000 K
  shadowStrength: number;   // 0–1
  softness: number;         // 0–1
  spread: number;           // 0–1
}

export interface GlobalParams {
  ambientLevel: number;   // 0–1
  contrastBoost: number;  // -1..+1
  saturation: number;     // 0–2
  filmGrain: number;      // 0–1
}

export const DEFAULT_GLOBAL: GlobalParams = {
  ambientLevel: 0.15,
  contrastBoost: 0.0,
  saturation: 1.0,
  filmGrain: 0.0,
};

export interface StudioSettings {
  lights: LightSource[];
  global: GlobalParams;
}

export interface StudioPreset {
  id: string;
  name: string;
  category: 'portrait' | 'cinematic' | 'stylized';
  description: string;
  icon: string;
  settings: StudioSettings;
}

// ─────────────────────────────────────────────
// Preset factory helpers
// ─────────────────────────────────────────────

const mkLight = (
  type: LightType,
  az: number, el: number,
  intensity: number,
  ct: number,
  shadow: number,
  softness: number,
  spread: number,
  label?: string,
): LightSource => ({
  id: crypto.randomUUID(),
  type,
  label: label ?? (type.charAt(0).toUpperCase() + type.slice(1)),
  enabled: true,
  azimuth: az,
  elevation: el,
  intensity,
  colorTemperature: ct,
  shadowStrength: shadow,
  softness,
  spread,
});

const noGlobal = (overrides?: Partial<GlobalParams>): GlobalParams => ({ ...DEFAULT_GLOBAL, ...overrides });

// ─────────────────────────────────────────────
// 12 Studio Presets
// ─────────────────────────────────────────────

export const STUDIO_PRESETS: StudioPreset[] = [
  // ── Portrait ──────────────────────────────
  {
    id: 'rembrandt', name: 'Rembrandt', category: 'portrait', icon: '🎨',
    description: 'Classic triangle shadow under eye',
    settings: {
      global: noGlobal(),
      lights: [
        mkLight('key',  -45, 55, 1.3, 4200, 0.75, 0.3, 0.25, 'Key'),
        mkLight('fill',  60, 15, 0.4, 5000, 0.1,  0.8, 0.7,  'Fill'),
      ],
    },
  },
  {
    id: 'beauty', name: 'Beauty Dish', category: 'portrait', icon: '✨',
    description: 'High-key frontal glamour lighting',
    settings: {
      global: noGlobal({ ambientLevel: 0.25 }),
      lights: [
        mkLight('key',  -25, 58, 1.1, 5500, 0.25, 0.7, 0.65, 'Key'),
        mkLight('fill',  50, 22, 0.6, 5500, 0.05, 0.95, 0.9,  'Fill'),
        mkLight('rim', 160, 35, 0.8, 6000, 0.0,  0.4, 0.3,   'Rim'),
      ],
    },
  },
  {
    id: 'paramount', name: 'Paramount', category: 'portrait', icon: '🦋',
    description: 'Overhead frontal — butterfly shadow',
    settings: {
      global: noGlobal(),
      lights: [
        mkLight('key',  -10, 72, 1.2, 5000, 0.55, 0.5, 0.45, 'Key'),
        mkLight('fill',  45, 18, 0.35,5200, 0.05, 0.9, 0.85, 'Fill'),
      ],
    },
  },
  {
    id: 'split', name: 'Split Light', category: 'portrait', icon: '◑',
    description: 'Hard side lighting, half face in shadow',
    settings: {
      global: noGlobal({ ambientLevel: 0.05 }),
      lights: [
        mkLight('key',  90, 25, 1.4, 4800, 0.88, 0.15, 0.1, 'Key'),
      ],
    },
  },

  // ── Cinematic ─────────────────────────────
  {
    id: 'golden_hour', name: 'Golden Hour', category: 'cinematic', icon: '🌅',
    description: 'Warm side key + cool backrim',
    settings: {
      global: noGlobal({ saturation: 1.3, contrastBoost: 0.1 }),
      lights: [
        mkLight('key',  -30, 12, 1.3, 2900, 0.55, 0.45, 0.4,  'Sun'),
        mkLight('rim',  150, 22, 0.9, 7200, 0.1,  0.2,  0.15, 'Sky Rim'),
        mkLight('fill',  30, 45, 0.3, 4500, 0.0,  0.9,  0.85, 'Sky Fill'),
      ],
    },
  },
  {
    id: 'neon_night', name: 'Neon Night', category: 'cinematic', icon: '🌆',
    description: 'Purple/magenta neon with cool back light',
    settings: {
      global: noGlobal({ ambientLevel: 0.05, saturation: 1.4 }),
      lights: [
        mkLight('key',  -60, 20, 1.1, 8800, 0.65, 0.3, 0.25, 'Neon'),
        mkLight('rim',  120, 30, 1.0, 5500, 0.0,  0.2, 0.15, 'Cool Rim'),
        mkLight('fill',  30, 10, 0.3, 3200, 0.0,  0.8, 0.7,  'Warm Fill'),
      ],
    },
  },
  {
    id: 'moonlight', name: 'Moonlight', category: 'cinematic', icon: '🌙',
    description: 'Very cool overhead key, deep dramatic shadows',
    settings: {
      global: noGlobal({ ambientLevel: 0.05, saturation: 0.6 }),
      lights: [
        mkLight('key',  -20, 65, 0.9, 8500, 0.8,  0.35, 0.3,  'Moon'),
        mkLight('fill',  50, 10, 0.2, 7800, 0.0,  0.7,  0.65, 'Sky'),
      ],
    },
  },
  {
    id: 'film_noir', name: 'Film Noir', category: 'cinematic', icon: '🎭',
    description: 'Single harsh overhead spotlight, venetian blinds feel',
    settings: {
      global: noGlobal({ ambientLevel: 0.02, contrastBoost: 0.3, saturation: 0.5 }),
      lights: [
        mkLight('spot',   0, 82, 1.6, 5200, 0.92, 0.08, 0.05, 'Spotlight'),
      ],
    },
  },

  // ── Stylized ──────────────────────────────
  {
    id: 'ice_blue', name: 'Ice Blue', category: 'stylized', icon: '🧊',
    description: 'Cool cyan key and deep blue rim',
    settings: {
      global: noGlobal({ saturation: 1.2 }),
      lights: [
        mkLight('key',  -30, 45, 1.2, 8000, 0.5,  0.45, 0.4,  'Ice Key'),
        mkLight('rim',  150, 25, 0.9, 9000, 0.0,  0.25, 0.2,  'Blue Rim'),
        mkLight('fill',  30, 30, 0.3, 7500, 0.0,  0.8,  0.75, 'Fill'),
      ],
    },
  },
  {
    id: 'amber_glow', name: 'Amber Glow', category: 'stylized', icon: '🍯',
    description: 'Warm amber key, orange-tinted fill',
    settings: {
      global: noGlobal({ saturation: 1.25, contrastBoost: 0.05 }),
      lights: [
        mkLight('key',  -40, 50, 1.3, 2600, 0.5,  0.4,  0.35, 'Amber Key'),
        mkLight('fill',  40, 20, 0.45,3200, 0.05, 0.85, 0.8,  'Warm Fill'),
        mkLight('rim', -150, 28, 0.7, 4000, 0.0,  0.3,  0.25, 'Rim'),
      ],
    },
  },
  {
    id: 'duo_tone', name: 'Duo-Tone', category: 'stylized', icon: '🎨',
    description: 'Warm/cool complementary split from opposite sides',
    settings: {
      global: noGlobal({ saturation: 1.3 }),
      lights: [
        mkLight('key',  -80, 25, 1.1, 2800, 0.6,  0.3, 0.25, 'Warm Side'),
        mkLight('fill',  80, 25, 0.85,8200, 0.1,  0.3, 0.25, 'Cool Side'),
        mkLight('back',   0, 50, 0.4, 5500, 0.0,  0.5, 0.45, 'Back Fill'),
      ],
    },
  },
  {
    id: 'sunbeam', name: 'Sunbeam', category: 'stylized', icon: '☀️',
    description: 'God-ray from high side, hazy warm atmosphere',
    settings: {
      global: noGlobal({ ambientLevel: 0.2, saturation: 1.15, filmGrain: 0.15 }),
      lights: [
        mkLight('key', -60, 68, 1.5, 3400, 0.6,  0.25, 0.2, 'Sun Ray'),
        mkLight('fill', 20, 35, 0.4, 4500, 0.0,  0.9,  0.85,'Haze'),
      ],
    },
  },
];

// ─────────────────────────────────────────────
// Prompt helpers
// ─────────────────────────────────────────────

// Direction description — compact, directional
function dirDesc(az: number, el: number): string {
  const a = ((az % 360) + 360) % 360;
  let h: string;
  if (a < 30 || a >= 330)  h = 'front';
  else if (a < 75)          h = 'front-right';
  else if (a < 105)         h = 'right side';
  else if (a < 150)         h = 'back-right';
  else if (a < 210)         h = 'back';
  else if (a < 255)         h = 'back-left';
  else if (a < 285)         h = 'left side';
  else                       h = 'front-left';

  if (el < -10) return `below, ${h}`;
  const v = el >= 65 ? 'overhead' : el >= 40 ? 'high angle' : el >= 20 ? 'mid angle' : 'low angle';
  return `${h} at ${v}`;
}

function ctShort(ct: number): string {
  if (ct < 3000) return 'warm amber';
  if (ct < 4000) return 'warm golden';
  if (ct < 5800) return 'neutral white';
  if (ct < 7500) return 'cool blue-white';
  return 'cold deep blue';
}

function softShort(soft: number, spread: number): string {
  const avg = (soft + spread) / 2;
  if (avg < 0.25) return 'hard specular';
  if (avg < 0.55) return 'semi-soft';
  return 'large soft';
}

// Always included — covers the full range so every slider position matters
function shadowFull(s: number): string {
  if (s < 0.15) return 'virtually shadowless flat lighting';
  if (s < 0.35) return 'soft gentle shadows';
  if (s < 0.55) return 'moderate natural shadows';
  if (s < 0.75) return 'strong defined shadows';
  return 'deep dramatic shadows with rich blacks';
}

// ─────────────────────────────────────────────
// Studio prompt builder
//
// Research-backed template (BFL official + community):
//   [Action verb] + [what to change + how] + [what to preserve]
//
// Rules:
//  • Use "Change the lighting to" — NOT "Relight" or "Transform"
//  • List EVERY preserved element explicitly
//  • Keep under ~200 tokens — long prompts get truncated (512 token limit)
//  • No JSON — FLUX Kontext is natural language only
// ─────────────────────────────────────────────

// Preservation clause — always append verbatim
const PRESERVE =
  'Preserve the person\'s face, facial features, eye color, expression, hairstyle, ' +
  'skin tone, and clothing exactly. Keep the background composition, camera angle, ' +
  'framing, and perspective unchanged.';

export function buildStudioPrompt(settings: StudioSettings): string {
  const active = settings.lights.filter(l => l.enabled);

  if (active.length === 0) {
    return `Change the lighting to soft flat neutral studio light. ${PRESERVE}`;
  }

  const key  = active.find(l => l.type === 'key')  ?? active[0];
  const fill = active.find(l => l.type === 'fill' || l.type === 'area');
  const rim  = active.find(l => l.type === 'rim'  || l.type === 'back');

  // Key light — the main descriptor
  const keySoft  = softShort(key.softness, key.spread);
  const keyCt    = ctShort(key.colorTemperature);
  const keyDir   = dirDesc(key.azimuth, key.elevation);
  const shadow   = shadowFull(key.shadowStrength);  // always included

  const lightParts: string[] = [`${keyCt} ${keySoft} key light from the ${keyDir}, ${shadow}`];

  if (fill) {
    lightParts.push(`${ctShort(fill.colorTemperature)} fill light softening shadows`);
  }
  if (rim) {
    const rimSide = Math.abs(rim.azimuth) > 90 ? 'from behind' : 'from the side';
    lightParts.push(`${ctShort(rim.colorTemperature)} rim light ${rimSide}`);
  }

  // Global color modifiers — only extreme values to keep prompt short
  if (settings.global.saturation > 1.35)      lightParts.push('vivid saturated color grading');
  else if (settings.global.saturation < 0.55) lightParts.push('desaturated near-monochromatic look');
  if (settings.global.contrastBoost > 0.3)    lightParts.push('high overall contrast');
  if (settings.global.ambientLevel < 0.05)    lightParts.push('very dark ambient');

  return `Change the lighting to ${lightParts.join(', ')}. ${PRESERVE}`;
}

// ─────────────────────────────────────────────
// Legacy prompt builder
// ─────────────────────────────────────────────

export function buildRelightPrompt(s: RelightSettings): string {
  const legacySettings: StudioSettings = {
    global: DEFAULT_GLOBAL,
    lights: [{
      id: 'legacy',
      type: 'key',
      label: 'Key',
      enabled: true,
      azimuth: s.azimuth > 180 ? s.azimuth - 360 : s.azimuth,
      elevation: s.elevation,
      intensity: s.intensity,
      colorTemperature: s.colorTemperature,
      shadowStrength: s.shadowStrength,
      softness: s.softness,
      spread: s.spread,
    }],
  };
  return buildStudioPrompt(legacySettings);
}

// ─────────────────────────────────────────────
// Upload helper
// ─────────────────────────────────────────────

const uploadToFalStorage = (file: File): Promise<string> =>
  fal.storage.upload(file);

const fetchDataUrl = async (imgUrl: string): Promise<string> => {
  const resp = await fetch(imgUrl);
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ─────────────────────────────────────────────
// Studio relight
// ─────────────────────────────────────────────

export const relightWithStudio = async (
  imageFile: File,
  settings: StudioSettings,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string> => {
  if (onProgress) onProgress(5);

  const imageUrl = await uploadToFalStorage(imageFile);
  if (abortSignal?.aborted) throw new Error('Cancelled');
  if (onProgress) onProgress(20);

  const prompt = buildStudioPrompt(settings);

  const result: any = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      prompt,
      image_url: imageUrl,
      guidance_scale: 4,        // 3.5 default; 4 = slight precision boost without over-constraining
      num_inference_steps: 40,  // 40 recommended for faces + lighting edits
      output_format: 'jpeg',
    } as any,
    onQueueUpdate: (update: any) => {
      if (abortSignal?.aborted) return;
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(90, 20 + (update.logs?.length ?? 0) * 4));
      }
    },
  });

  if (abortSignal?.aborted) throw new Error('Cancelled');
  if (onProgress) onProgress(95);

  const imgUrl = result?.data?.images?.[0]?.url ?? result?.images?.[0]?.url;
  if (!imgUrl) throw new Error('Relight service returned no image.');

  return fetchDataUrl(imgUrl);
};

// ─────────────────────────────────────────────
// Legacy single-light relight (kept for compat)
// ─────────────────────────────────────────────

export const relightImage = async (
  imageFile: File,
  settings: RelightSettings,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
): Promise<string> => {
  if (onProgress) onProgress(5);

  const imageUrl = await uploadToFalStorage(imageFile);
  if (abortSignal?.aborted) throw new Error('Cancelled');
  if (onProgress) onProgress(20);

  const prompt = buildRelightPrompt(settings);

  const result: any = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      prompt,
      image_url: imageUrl,
      guidance_scale: 6,
      num_inference_steps: 35,
      output_format: 'jpeg',
    } as any,
    onQueueUpdate: (update: any) => {
      if (abortSignal?.aborted) return;
      if (update.status === 'IN_PROGRESS' && onProgress) {
        onProgress(Math.min(90, 20 + (update.logs?.length ?? 0) * 4));
      }
    },
  });

  if (abortSignal?.aborted) throw new Error('Cancelled');
  if (onProgress) onProgress(95);

  const imgUrl = result?.data?.images?.[0]?.url ?? result?.images?.[0]?.url;
  if (!imgUrl) throw new Error('Relight service returned no image.');

  return fetchDataUrl(imgUrl);
};
