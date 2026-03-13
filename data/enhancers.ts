// data/enhancers.ts

export interface Enhancer {
  id: string;
  label: string;
  icon: string;
  promptSnippet: string;  // Injected verbatim into the generation prompt
}

export const ENHANCERS: Enhancer[] = [
  {
    id: 'glossy-skin',
    label: 'Glossy Skin',
    icon: '\u2728',
    promptSnippet: 'luminous dewy skin with micro-specular highlights, light catching moisture on cheekbones and cupid\'s bow, makeup-artist-quality highlighting balm, visible pore texture under the sheen',
  },
  {
    id: 'film-grain',
    label: 'Film Grain',
    icon: '\uD83C\uDF9E\uFE0F',
    promptSnippet: 'Kodak Vision3 500T grain structure at native ISO, organic silver halide grain clusters, subtle halation bloom on highlights, slight color crossover in shadows toward teal-cyan, analog warmth',
  },
  {
    id: '3d-rendered',
    label: '3D Rendered',
    icon: '\uD83D\uDC8E',
    promptSnippet: 'Unreal Engine 5 Nanite-quality geometry, Lumen global illumination with ray-traced reflections, PBR material response on all surfaces, subsurface scattering on skin, strand-based hair',
  },
  {
    id: 'cinematic-grade',
    label: 'Cinematic Grade',
    icon: '\uD83C\uDFAC',
    promptSnippet: 'Hollywood DI color grading, teal-and-orange complementary palette, crushed blacks with lifted shadow detail, desaturated midtones with punchy highlights, FilmConvert Nitrate texture',
  },
  {
    id: 'sharp-textures',
    label: 'Sharp Textures',
    icon: '\uD83D\uDD0D',
    promptSnippet: 'micro-contrast enhancement revealing fabric weave, skin pores, hair strand definition, 8K-resolution texture detail throughout, clarity-boosted without haloing, tactile surface quality',
  },
  {
    id: 'rim-light',
    label: 'Rim Light',
    icon: '\uD83C\uDF1F',
    promptSnippet: 'dedicated backlight creating bright edge separation on hair and shoulders, 1-stop overexposed rim with natural falloff, slight flare bloom where rim meets lens axis, halo separation',
  },
  {
    id: 'soft-glow',
    label: 'Soft Glow',
    icon: '\uD83D\uDCAB',
    promptSnippet: 'Pro-Mist 1/4 filter effect creating dreamy highlight diffusion, blooming light sources, romantic soft-focus while maintaining core sharpness, warm ethereal atmosphere, skin-smoothing diffusion',
  },
  {
    id: 'high-contrast',
    label: 'High Contrast',
    icon: '\uD83D\uDDA4',
    promptSnippet: 'aggressive contrast curve with deep true blacks and bright clean whites, dramatic tonal separation, minimal midtone transition, graphic poster-quality light and shadow, punchy saturated color',
  },
  {
    id: 'vivid-colors',
    label: 'Vivid Colors',
    icon: '\uD83C\uDF08',
    promptSnippet: 'Fujifilm Velvia 50 saturation, hyper-vivid color rendering pushing tones 30% beyond reality, rich jewel-tone shadows, electric highlight colors, maximum hue separation',
  },
  {
    id: 'shallow-dof',
    label: 'Shallow DOF',
    icon: '\uD83D\uDCF7',
    promptSnippet: 'shot at f/1.2 maximum aperture, ultra-thin focal plane on eyes only, everything beyond 15cm dissolves into creamy bokeh, distinct bokeh circles from background lights, smooth focus gradient',
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    icon: '\uD83C\uDF1E',
    promptSnippet: 'magic hour warmth bathing scene in amber-gold light, long shadows, warm rim light on hair creating golden halo, sky gradient from peach horizon to deep blue, nostalgic film color, low sun lens flare',
  },
  {
    id: 'wet-look',
    label: 'Wet Look',
    icon: '\uD83D\uDCA7',
    promptSnippet: 'rain-soaked aesthetic with water droplets on skin and clothing, wet hair with defined clinging strands, glistening surface reflections, water beads catching light as specular points, puddle reflections',
  },
];

/**
 * Given a set of selected enhancer IDs, returns the combined prompt string.
 * Custom text (if any) is appended at the end.
 */
export const buildEnhancerPrompt = (
  selectedIds: Set<string>,
  customText?: string
): string => {
  const snippets = ENHANCERS
    .filter(e => selectedIds.has(e.id))
    .map(e => e.promptSnippet);

  if (customText?.trim()) snippets.push(customText.trim());

  return snippets.length > 0 ? `ENHANCE: ${snippets.join('. ')}.` : '';
};
