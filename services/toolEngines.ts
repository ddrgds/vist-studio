import { fal } from '@fal-ai/client';
import { readFileSync } from 'fs';

// ─────────────────────────────────────────────
// Tool Engine Service — Best model per editing tool
// Decided after A/B testing 8 models × 8 tools (2026-03-17)
// ─────────────────────────────────────────────

fal.config({ proxyUrl: '/fal-api' });

const unwrap = (result: any): any => result?.data ?? result ?? {};

// ─── Types ───────────────────────────────────

export type ToolId =
  | 'relight'
  | 'scene'        // bg swap / scene change
  | 'outfit'
  | 'face-swap'
  | 'realistic-skin'
  | 'style-transfer'
  | 'upscale'
  | 'angles';

export interface ToolResult {
  url: string;
  engine: string;
}

// ─── Grok Edit (default for 6/8 tools) ──────

async function grokEdit(imageUrl: string, prompt: string): Promise<string> {
  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      image_urls: [imageUrl],
      prompt,
      num_images: 1,
      output_format: 'jpeg',
    },
    timeout: 120000,
  }) as any;
  const data = unwrap(result);
  return data.images?.[0]?.url || data.image?.url;
}

// ─── Grok Edit with 2 images (face swap) ────

async function grokEditMulti(imageUrls: string[], prompt: string): Promise<string> {
  const result = await fal.subscribe('xai/grok-imagine-image/edit', {
    input: {
      image_urls: imageUrls,
      prompt,
      num_images: 1,
      output_format: 'jpeg',
    },
    timeout: 120000,
  }) as any;
  const data = unwrap(result);
  return data.images?.[0]?.url || data.image?.url;
}

// ─── Upload helper ───────────────────────────

export async function uploadToFal(file: File): Promise<string> {
  return await fal.storage.upload(file);
}

// ═════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// ═════════════════════════════════════════════

/** Relight — change lighting on existing image */
export async function relight(
  imageUrl: string,
  lightingDescription: string,
): Promise<ToolResult> {
  const prompt = `Same photo same woman but with ${lightingDescription}. Keep face, pose, outfit, and composition identical.`;
  const url = await grokEdit(imageUrl, prompt);
  return { url, engine: 'grok' };
}

/** Scene / BG Swap — change background/location */
export async function changeScene(
  imageUrl: string,
  sceneDescription: string,
): Promise<ToolResult> {
  const prompt = `Same woman same pose same outfit but ${sceneDescription}. Keep the person exactly the same.`;
  const url = await grokEdit(imageUrl, prompt);
  return { url, engine: 'grok' };
}

/** Outfit Change — change clothing */
export async function changeOutfit(
  imageUrl: string,
  outfitDescription: string,
): Promise<ToolResult> {
  const prompt = `Same woman same face same pose same background but wearing ${outfitDescription}. Keep face and background identical.`;
  const url = await grokEdit(imageUrl, prompt);
  return { url, engine: 'grok' };
}

/** Face Swap — replace face with another person's face */
export async function faceSwap(
  baseImageUrl: string,
  faceSourceUrl: string,
): Promise<ToolResult> {
  const prompt = 'Replace the face of the person in the first image with the face of the person from the second image. Keep everything else the same — body, outfit, background, pose. Adapt hair color and skin tone to match the new face naturally.';
  const url = await grokEditMulti([baseImageUrl, faceSourceUrl], prompt);
  return { url, engine: 'grok' };
}

/** Realistic Skin — add natural skin texture */
export async function realisticSkin(
  imageUrl: string,
): Promise<ToolResult> {
  const prompt = 'Enhance this photo to be more photorealistic. Add natural skin texture with visible pores, slight imperfections, natural lighting on skin. Keep the person, pose, outfit, and background exactly the same. Do not change the composition.';
  const url = await grokEdit(imageUrl, prompt);
  return { url, engine: 'grok' };
}

/** Style Transfer — apply artistic style */
export async function styleTransfer(
  imageUrl: string,
  styleDescription: string,
): Promise<ToolResult> {
  const prompt = `Transform this photo into ${styleDescription}. Keep the same person and composition.`;
  const url = await grokEdit(imageUrl, prompt);
  return { url, engine: 'grok' };
}

/** Upscale — increase resolution */
export async function upscale(
  imageUrl: string,
  factor: number = 2,
): Promise<ToolResult> {
  const result = await fal.subscribe('fal-ai/aura-sr', {
    input: {
      image_url: imageUrl,
      upscaling_factor: factor,
    },
    timeout: 120000,
  }) as any;
  const data = unwrap(result);
  const url = data.images?.[0]?.url || data.image?.url;
  return { url, engine: 'aura-sr' };
}

/** Angles/360 — generate character sheet with multiple views */
export async function generateAngles(
  imageUrl: string,
  mode: 'face' | 'body' | 'expressions',
  quality: 'standard' | 'ultra' = 'standard',
): Promise<ToolResult> {
  const prompts: Record<string, string> = {
    face: 'A 360 turnaround view of the subject, Close up shot of face in 4 different angles on a 2x2 grid. Top-left: front view. Top-right: right profile. Bottom-left: left profile. Bottom-right: three-quarter view. All white background. High resolution, sharp detail.',
    body: 'A 360 turnaround full body view of the subject in 4 different angles side by side. Front view, half turn, side profile, back view. Full-body shots, all white background. High resolution, sharp detail.',
    expressions: 'An expression sheet of the subject showing 9 different facial expressions in a 3x3 grid. Happy smile, Crying/sad, Surprised, Angry, Laughing, Serious, Flirty/wink, Disgusted, Peaceful/eyes closed. Close-up headshots, all white background. Same person in every frame.',
  };

  // Step 1: NB2 generates the sheet
  // This calls Gemini via the proxy — handled by geminiService in the app
  // For now, return the prompt so the caller can route to Gemini
  // In production, this would call the Gemini API directly

  if (quality === 'ultra') {
    // NB2 generates → Grok enhances
    // The caller should: 1) call Gemini with the prompt, 2) pass result to grokEdit
    return {
      url: '', // placeholder — caller handles the 2-step flow
      engine: 'nb2+grok',
    };
  }

  return {
    url: '', // placeholder — caller routes to Gemini
    engine: 'nb2',
  };
}

// ─── Angle prompts (exported for use by caller) ─

export const ANGLE_PROMPTS = {
  face: 'A 360 turnaround view of the subject, Close up shot of face in 4 different angles on a 2x2 grid. Top-left: front view. Top-right: right profile. Bottom-left: left profile. Bottom-right: three-quarter view. All white background. High resolution, sharp detail.',
  body: 'A 360 turnaround full body view of the subject in 4 different angles side by side. Front view, half turn, side profile, back view. Full-body shots, all white background. High resolution, sharp detail.',
  expressions: 'An expression sheet of the subject showing 9 different facial expressions in a 3x3 grid. Happy smile, Crying/sad, Surprised, Angry, Laughing, Serious, Flirty/wink, Disgusted, Peaceful/eyes closed. Close-up headshots, all white background. Same person in every frame.',
};

export const ANGLE_GROK_ENHANCE_PROMPTS = {
  face: 'Enhance this character reference sheet to be more photorealistic. Add natural skin texture, visible pores, realistic lighting. Keep all 4 angles and the same person. Do not change layout.',
  expressions: 'Enhance this expression sheet to be more photorealistic. More natural skin, expressive eyes, realistic detail. Keep all expressions and the same person. Do not change layout.',
};

// ─── Style presets ───────────────────────────

export const STYLE_PRESETS = [
  { id: 'oil-painting', label: 'Oil Painting', prompt: 'a beautiful oil painting style with painterly brushstrokes and rich colors' },
  { id: 'watercolor', label: 'Watercolor', prompt: 'a delicate watercolor painting with soft washes and transparent layers' },
  { id: 'anime', label: 'Anime', prompt: 'high quality anime illustration style, clean lines, vibrant colors' },
  { id: 'comic', label: 'Comic Book', prompt: 'a comic book illustration with bold outlines, halftone dots, and vivid colors' },
  { id: 'pixel-art', label: 'Pixel Art', prompt: 'detailed pixel art style with limited color palette' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'cyberpunk aesthetic with neon lights, holographic effects, and futuristic elements' },
  { id: 'film-noir', label: 'Film Noir', prompt: 'a dramatic black and white film noir photograph with high contrast shadows' },
  { id: 'pop-art', label: 'Pop Art', prompt: 'Andy Warhol inspired pop art with bold colors and screen print effect' },
  { id: 'renaissance', label: 'Renaissance', prompt: 'a classical Renaissance painting style with chiaroscuro lighting' },
  { id: 'sketch', label: 'Pencil Sketch', prompt: 'a detailed pencil sketch drawing with cross-hatching and shading' },
] as const;

// ─── Relight presets ─────────────────────────

export const RELIGHT_PRESETS = [
  { id: 'golden-hour', label: 'Golden Hour', prompt: 'warm golden hour sunset lighting from the left, soft orange glow on skin, dramatic cinematic shadows' },
  { id: 'blue-hour', label: 'Blue Hour', prompt: 'cool blue hour twilight lighting, soft blue ambient glow, moody atmosphere' },
  { id: 'studio', label: 'Studio Light', prompt: 'professional studio lighting with softbox, clean even illumination, subtle shadows' },
  { id: 'neon', label: 'Neon Glow', prompt: 'colorful neon lighting from multiple sources — pink, blue, and purple neon glow on skin' },
  { id: 'natural', label: 'Natural Window', prompt: 'soft natural window lighting from the side, gentle shadows, bright and airy feel' },
  { id: 'dramatic', label: 'Dramatic', prompt: 'dramatic Rembrandt lighting with strong side light and deep shadows, moody' },
  { id: 'ring-light', label: 'Ring Light', prompt: 'beauty ring light creating even front illumination with circular catchlights in eyes' },
  { id: 'candle', label: 'Candlelight', prompt: 'warm candlelight illumination, soft flickering warm tones, intimate atmosphere' },
] as const;

// ─── Scene presets ───────────────────────────

export const SCENE_PRESETS = [
  { id: 'tokyo', label: 'Tokyo Night', prompt: 'standing on a busy Tokyo street at night with neon signs, rain-wet pavement, and colorful reflections' },
  { id: 'paris-cafe', label: 'Paris Café', prompt: 'sitting in a cozy Parisian café with warm ambient lighting, vintage posters on walls, coffee on table' },
  { id: 'beach-sunset', label: 'Beach Sunset', prompt: 'standing on a tropical beach at sunset, golden sky, gentle waves, palm trees silhouette' },
  { id: 'nyc-rooftop', label: 'NYC Rooftop', prompt: 'on a rooftop in Manhattan with the city skyline at dusk, warm ambient lights' },
  { id: 'gym', label: 'Gym', prompt: 'in a modern gym with equipment, mirrors, and motivational atmosphere' },
  { id: 'pool', label: 'Pool Party', prompt: 'by a luxury swimming pool with turquoise water, lounge chairs, tropical vibes' },
  { id: 'forest', label: 'Forest', prompt: 'in a lush green forest with dappled sunlight filtering through the trees' },
  { id: 'studio-white', label: 'White Studio', prompt: 'in a clean white photography studio with professional lighting' },
  { id: 'nightclub', label: 'Nightclub', prompt: 'in a nightclub with colorful laser lights, smoke machine atmosphere, dance floor' },
  { id: 'library', label: 'Library', prompt: 'in an elegant old library with wooden bookshelves, warm reading lamp, leather chairs' },
] as const;
