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
    promptSnippet: 'luminous glossy skin with visible light reflections, dewy finish, radiant complexion',
  },
  {
    id: 'film-grain',
    label: 'Film Grain',
    icon: '\uD83C\uDF9E\uFE0F',
    promptSnippet: 'subtle 35mm analog film grain texture, organic noise, filmic look',
  },
  {
    id: '3d-rendered',
    label: '3D Rendered',
    icon: '\uD83D\uDC8E',
    promptSnippet: 'hyper-realistic 3D render, subsurface scattering on skin, perfectly smooth lighting, CGI quality',
  },
  {
    id: 'cinematic-grade',
    label: 'Cinematic Grade',
    icon: '\uD83C\uDFAC',
    promptSnippet: 'cinematic color grading, teal-orange split toning, movie-like depth, film color science',
  },
  {
    id: 'sharp-textures',
    label: 'Sharp Textures',
    icon: '\uD83D\uDD0D',
    promptSnippet: 'hyper-detailed textures, every fabric thread and skin pore visible, tack-sharp, micro-detail',
  },
  {
    id: 'rim-light',
    label: 'Rim Light',
    icon: '\uD83C\uDF1F',
    promptSnippet: 'strong rim/edge lighting separating subject from background, backlit halo, contour light',
  },
  {
    id: 'soft-glow',
    label: 'Soft Glow',
    icon: '\uD83D\uDCAB',
    promptSnippet: 'ethereal soft glow, dreamy halation, gentle light bloom around highlights, angelic radiance',
  },
  {
    id: 'high-contrast',
    label: 'High Contrast',
    icon: '\uD83D\uDDA4',
    promptSnippet: 'high contrast dramatic look, deep blacks, bright highlights, punchy tones, bold shadows',
  },
  {
    id: 'vivid-colors',
    label: 'Vivid Colors',
    icon: '\uD83C\uDF08',
    promptSnippet: 'ultra-vivid saturated colors, bold chromatic intensity, eye-popping palette, color-rich',
  },
  {
    id: 'shallow-dof',
    label: 'Shallow DOF',
    icon: '\uD83D\uDCF7',
    promptSnippet: 'extremely shallow depth of field, f/1.2 aperture bokeh, creamy background blur, subject isolation',
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    icon: '\uD83C\uDF1E',
    promptSnippet: 'warm golden hour sunlight, long soft shadows, amber tones, magic hour atmosphere',
  },
  {
    id: 'wet-look',
    label: 'Wet Look',
    icon: '\uD83D\uDCA7',
    promptSnippet: 'wet glistening skin, water droplets, rain-soaked hair, reflective wet surfaces',
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
