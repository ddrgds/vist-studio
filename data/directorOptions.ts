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
  { id: 'standing',  label: 'Standing',  icon: '🧍', value: 'standing upright with confident posture, weight on one hip for natural S-curve, shoulders relaxed, chin slightly elevated, facing camera with direct presence' },
  { id: 'sitting',   label: 'Sitting',   icon: '🪑', value: 'seated in relaxed three-quarter pose, one leg crossed over the other, torso angled slightly off-camera-axis, hands resting naturally, elegant but comfortable' },
  { id: 'walking',   label: 'Walking',   icon: '🚶', value: 'mid-stride walking toward camera, natural arm swing captured at peak motion, dynamic weight shift between steps, confident gait with purpose' },
  { id: 'crouching', label: 'Crouching', icon: '🧎', value: 'crouching low with one knee down, dynamic compact pose, elbows resting on knee, intense eye contact from below eye level, urban street energy' },
  { id: 'back',      label: 'Back',      icon: '↩️', value: 'three-quarter back view with head turned over shoulder toward camera, nape of neck visible, mysterious over-the-shoulder glance, spine line visible' },
  { id: 'leaning',   label: 'Leaning',   icon: '📐', value: 'leaning against wall or surface with one shoulder, casual weight distribution, arms crossed or thumbs in pockets, effortless cool attitude' },
];

// ── Camera presets ────────────────────────────────────────
export const CAMERA_OPTIONS: ChipOption[] = [
  { id: 'portrait',  label: 'Portrait 85mm',  icon: '📷', value: 'shot on Canon RF 85mm f/1.2L at f/1.4, medium close-up bust framing, creamy circular bokeh with smooth falloff, compressed perspective flattering facial features, shallow depth of field' },
  { id: 'wide',      label: 'Wide 24mm',      icon: '🔭', value: 'shot on Sony 24mm f/1.4 GM, full-body environmental framing, wide-angle perspective with depth emphasis, subject placed at rule of thirds, deep depth of field showing context' },
  { id: 'macro',     label: 'Macro',          icon: '🔬', value: 'shot on Canon RF 100mm f/2.8L Macro, extreme close-up detail, razor-thin depth of field, emphasis on skin texture and micro-detail, soft diffused lighting' },
  { id: 'cinematic', label: 'Cinema',         icon: '🎬', value: 'shot on Arri Alexa Mini LF with Cooke Anamorphic 50mm T2.3, 2.39:1 widescreen, oval bokeh with horizontal lens flares, warm Cooke highlight rolloff, filmic halation' },
  { id: 'polaroid',  label: 'Polaroid',       icon: '📸', value: 'shot on Polaroid SX-70, instant film aesthetic, slightly washed-out warm colors, soft corner vignette, cyan shadows and warm highlights, dreamy soft focus quality' },
  { id: 'vintage',   label: 'Vintage 35mm',   icon: '🎞️', value: 'shot on Nikon FM2 with Nikkor 50mm f/1.4, Fuji Superia 400 film stock, organic analog grain, warm golden skin tones, natural vignette from vintage optics' },
  { id: 'drone',     label: 'Drone Overhead',  icon: '🛸', value: 'shot on DJI Mavic 3 Hasselblad, top-down 45-degree aerial perspective, environmental scale showing subject in context, deep depth of field, dramatic shadow casting' },
  { id: 'anamorphic', label: 'Anamorphic',    icon: '🎥', value: 'shot on Panavision C-Series Anamorphic 75mm T2.3, 2x anamorphic squeeze with oval bokeh, horizontal blue lens flares, extreme widescreen 2.76:1, cinema-quality depth' },
];

// ── Lighting presets ──────────────────────────────────────
export const LIGHTING_OPTIONS: ChipOption[] = [
  { id: 'natural',  label: 'Natural',  icon: '☀️', value: 'natural window light from camera-left at 90 degrees, soft diffused quality through sheer curtains, warm 5600K, gentle 3:1 fill from white wall bounce, soft shadow edges' },
  { id: 'studio',   label: 'Studio',   icon: '💡', value: 'professional three-point setup: Profoto B10 key through 4ft octabox at 45 degrees, V-flat white bounce fill at 2:1 ratio, hair light with 10-degree grid, clean 5500K neutral' },
  { id: 'golden',   label: 'Golden',   icon: '🌅', value: 'golden hour at 15 minutes before sunset, warm 3200K directional light at 15-degree elevation, Fresnel rim highlights on hair, atmospheric haze diffusion, shadows shift toward cool blue' },
  { id: 'neon',     label: 'Neon',     icon: '🌆', value: 'mixed neon lighting: magenta neon key from left, cyan LED accent from right creating bi-color split, wet surface reflections multiplying light sources, volumetric atmosphere' },
  { id: 'dramatic', label: 'Dramatic', icon: '🎭', value: 'single hard key light from 60 degrees camera-left at 30 degrees above, Chiaroscuro pattern, deep shadows on 70% of face, 8:1 contrast ratio, Rembrandt triangle' },
  { id: 'dark',     label: 'Dark',     icon: '🌙', value: 'ultra-low-key single practical light at close range, majority of frame in deep shadow, tungsten 2800K warm glow on lit areas, absolute black shadows, atmospheric noir mood' },
  { id: 'bladerunner', label: 'Blade Runner', icon: '🔮', value: 'cyberpunk night: mixed sodium vapor amber with LED cyan/magenta, volumetric fog, wet asphalt reflecting neon as elongated streaks, purple-violet atmospheric haze, backlit silhouette' },
  { id: 'holographic', label: 'Holographic', icon: '✨', value: 'ethereal violet-purple key light emanating from subject as if self-luminous, holographic glow rim light on all edges, purple-lavender cast on surfaces, skin emits subtle light, no traditional shadow' },
];

// ── Inspiration scenes ────────────────────────────────────
export const INSPIRATIONS: Inspiration[] = [
  { id: 'neon-city',         emoji: '🌆', label: 'Neon City',         scene: 'rain-slicked cyberpunk city street at night, neon signs reflecting in puddles as elongated color streaks, volumetric fog catching colored light beams, towering buildings with holographic advertisements, Blade Runner atmosphere' },
  { id: 'tropical-beach',    emoji: '🏝️', label: 'Tropical Beach',    scene: 'pristine tropical beach with crystal turquoise water, white sand catching golden hour light, coconut palms creating dappled shadow patterns, gentle waves with sun glitter, warm humid atmosphere' },
  { id: 'studio-white',      emoji: '⬜', label: 'Studio White',      scene: 'infinite white cyclorama studio, seamless background curving from wall to floor, professional beauty lighting creating clean shadows, minimalist void focusing entirely on subject' },
  { id: 'night-skyline',     emoji: '🌃', label: 'Night Skyline',     scene: 'rooftop terrace overlooking dense city skyline at night, thousands of building lights creating bokeh carpet below, cool night air atmosphere, urban penthouse luxury' },
  { id: 'luxury-apartment',  emoji: '🛋️', label: 'Luxury Apt',       scene: 'luxury modern penthouse interior with designer furniture, floor-to-ceiling windows revealing city night view, warm ambient accent lighting, marble and wood surfaces, editorial interior design' },
  { id: 'coffee-shop',       emoji: '☕', label: 'Coffee Shop',       scene: 'artisan specialty coffee shop with exposed brick walls, warm Edison bulb lighting, rich wood countertops with steam rising from cups, cozy intimate atmosphere, lifestyle environment' },
  { id: 'park-garden',       emoji: '🌿', label: 'Park Garden',       scene: 'lush botanical garden with dappled sunlight filtering through mature tree canopy, wildflowers and ferns creating layered depth, golden-green color palette, serene natural atmosphere' },
  { id: 'rooftop-sunset',    emoji: '🌅', label: 'Rooftop Sunset',    scene: 'rooftop terrace during golden hour with panoramic sky gradient from warm peach at horizon through coral to deep blue above, city in silhouette below, magic hour warmth' },
  { id: 'gym',               emoji: '🏋️', label: 'Gym',               scene: 'modern industrial gym with exposed concrete and steel, dramatic overhead lighting creating pools of light between equipment, motivational raw energy, urban athletic space' },
  { id: 'art-gallery',       emoji: '🖼️', label: 'Art Gallery',       scene: 'minimalist contemporary art gallery with white walls and polished concrete floors, carefully spotlit artworks creating pools of warm light, elegant negative space, cultural sophistication' },
  { id: 'street-market',     emoji: '🏪', label: 'Street Market',     scene: 'vibrant night street market with hanging lanterns and neon food stall signs, steam rising from cooking, colorful awnings and crowds creating lively depth, documentary atmosphere' },
  { id: 'desert-dunes',      emoji: '🏜️', label: 'Desert Dunes',      scene: 'vast desert sand dunes at magic hour with orange-pink gradient sky, sharp shadow lines along dune ridges creating graphic patterns, ancient solitude, epic cinematic scale' },
];
