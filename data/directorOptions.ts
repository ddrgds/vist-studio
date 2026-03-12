// data/directorOptions.ts

export interface ChipOption {
  id: string;
  label: string;
  icon: string;
  value: string;  // Descriptive text injected into prompt
}

export interface Inspiration {
  id: string;
  emoji: string;
  label: string;
  scene: string;
}

// ── Pose presets ──────────────────────────────────────────
export const POSE_OPTIONS: ChipOption[] = [
  { id: 'standing',  label: 'Standing',  icon: '🧍', value: 'standing upright, confident posture, facing camera' },
  { id: 'sitting',   label: 'Sitting',   icon: '🪑', value: 'seated, relaxed pose, comfortable position' },
  { id: 'walking',   label: 'Walking',   icon: '🚶', value: 'walking towards camera, natural movement, dynamic' },
  { id: 'crouching', label: 'Crouching', icon: '🧎', value: 'crouching down, low angle, dynamic crouch pose' },
  { id: 'back',      label: 'Back',      icon: '↩️', value: 'looking back over shoulder, three-quarter back view' },
  { id: 'leaning',   label: 'Leaning',   icon: '📐', value: 'leaning against wall, casual relaxed pose' },
];

// ── Camera presets ────────────────────────────────────────
export const CAMERA_OPTIONS: ChipOption[] = [
  { id: 'portrait',  label: 'Portrait 85mm',  icon: '📷', value: 'shot on 85mm lens, shallow depth of field, beautiful bokeh' },
  { id: 'wide',      label: 'Wide 24mm',      icon: '🔭', value: '24mm wide angle lens, dynamic perspective, immersive view' },
  { id: 'macro',     label: 'Macro',          icon: '🔬', value: 'macro photography, extreme close up, sharp microdetails' },
  { id: 'cinematic', label: 'Cinema',         icon: '🎬', value: 'anamorphic lens, cinematic aspect ratio, film look' },
  { id: 'polaroid',  label: 'Polaroid',       icon: '📸', value: 'polaroid style, instant photo aesthetic, vintage colors' },
  { id: 'vintage',   label: 'Vintage 35mm',   icon: '🎞️', value: 'vintage film camera look, 35mm film, subtle grain' },
];

// ── Lighting presets ──────────────────────────────────────
export const LIGHTING_OPTIONS: ChipOption[] = [
  { id: 'natural',  label: 'Natural',  icon: '☀️', value: 'soft natural light, golden hour, sun-kissed' },
  { id: 'studio',   label: 'Studio',   icon: '💡', value: 'professional studio lighting, softbox, rim light' },
  { id: 'golden',   label: 'Golden',   icon: '🌅', value: 'golden hour light, warm tones, soft shadows' },
  { id: 'neon',     label: 'Neon',     icon: '🌆', value: 'neon lighting, cyberpunk glow, vivid colors' },
  { id: 'dramatic', label: 'Dramatic', icon: '🎭', value: 'dramatic cinematic lighting, deep shadows' },
  { id: 'dark',     label: 'Dark',     icon: '🌙', value: 'low key lighting, dark atmosphere, moody' },
];

// ── Inspiration scenes ────────────────────────────────────
export const INSPIRATIONS: Inspiration[] = [
  { id: 'neon-city',         emoji: '🌆', label: 'Neon City',         scene: 'neon-lit city street at night, vibrant colors, urban atmosphere' },
  { id: 'tropical-beach',    emoji: '🏝️', label: 'Tropical Beach',    scene: 'tropical beach with turquoise water, palm trees, golden sand' },
  { id: 'studio-white',      emoji: '⬜',       label: 'Studio White',      scene: 'clean white photography studio, professional backdrop, even lighting' },
  { id: 'night-skyline',     emoji: '🌃', label: 'Night Skyline',     scene: 'rooftop overlooking city skyline at night, twinkling lights' },
  { id: 'luxury-apartment',  emoji: '🛋️', label: 'Luxury Apt',       scene: 'luxury modern apartment interior, designer furniture, floor-to-ceiling windows' },
  { id: 'coffee-shop',       emoji: '☕',       label: 'Coffee Shop',       scene: 'cozy artisan coffee shop, warm wood tones, ambient cafe lighting' },
  { id: 'park-garden',       emoji: '🌿', label: 'Park Garden',       scene: 'lush green park garden, dappled sunlight through trees, floral surroundings' },
  { id: 'rooftop-sunset',    emoji: '🌅', label: 'Rooftop Sunset',    scene: 'rooftop terrace at sunset, golden hour sky, panoramic view' },
  { id: 'gym',               emoji: '🏋️', label: 'Gym',               scene: 'modern gym interior, weights and equipment, motivational atmosphere' },
  { id: 'art-gallery',       emoji: '🖼️', label: 'Art Gallery',       scene: 'minimalist art gallery, white walls, spotlit artworks, elegant space' },
  { id: 'street-market',     emoji: '🏪', label: 'Street Market',     scene: 'bustling street market, colorful stalls, lively crowd atmosphere' },
  { id: 'desert-dunes',      emoji: '🏜️', label: 'Desert Dunes',      scene: 'desert sand dunes at magic hour, orange and pink sky, vast landscape' },
];
