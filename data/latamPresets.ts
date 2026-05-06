// ─────────────────────────────────────────────
// LATAM Cultural + Sensual Presets — 2026-05-05
//
// Two buckets:
//   1) cultural   — visible in Modo Standard (default).
//                   Differentiated by region/culture, not by skin.
//   2) sensual    — visible only in Modo Creator (opt-in +18).
//                   Editorial sensual: lingerie, beach, boudoir.
//                   Hard line enforced server-side via /safety-check:
//                   no topless, no nudity, no explicit content.
//
// Spanish-neutral vocabulary on prompts to minimize moderation
// rejection by NB2/Gemini (which can flag literal Spanish terms).
// ─────────────────────────────────────────────

import type { SoulStyle } from './soulStyles'

export type LatamMode = 'cultural' | 'sensual'

export interface LatamPreset extends SoulStyle {
  mode: LatamMode
  /** ISO-3166 country code(s) this preset is themed around */
  country?: string[]
}

// ─── Cultural (Modo Standard) ──────────────────────────────────────
// Identity-driven, not skin-driven. Each one feels native to a region.
export const LATAM_CULTURAL_PRESETS: LatamPreset[] = [
  {
    id: 'latam-paisa',
    name: 'Paisa Chic',
    category: 'aesthetic',
    icon: '🌹',
    featured: true,
    mode: 'cultural',
    country: ['CO'],
    hint: 'modern Medellín paisa style, polished feminine elegance, fitted contemporary fashion, warm honey tones, urban Colombian backdrop, golden afternoon light, confident expression',
  },
  {
    id: 'latam-costena',
    name: 'Costeña Caribe',
    category: 'aesthetic',
    icon: '🌴',
    featured: true,
    mode: 'cultural',
    country: ['CO', 'VE'],
    hint: 'Caribbean coastal vibe, breezy linen and cotton, sun-kissed glow, beach-side or palm tree backdrop, vibrant tropical colors, salty hair and sea breeze, joyful relaxed energy',
  },
  {
    id: 'latam-paulista',
    name: 'Paulista Editorial',
    category: 'aesthetic',
    icon: '🇧🇷',
    featured: true,
    mode: 'cultural',
    country: ['BR'],
    hint: 'São Paulo metropolitan style, sleek tailored fashion, neutral palette with statement accessory, modernist architecture backdrop, sophisticated cosmopolitan energy, editorial Brazilian aesthetic',
  },
  {
    id: 'latam-chilanga',
    name: 'Chilanga Mood',
    category: 'aesthetic',
    icon: '🌵',
    featured: true,
    mode: 'cultural',
    country: ['MX'],
    hint: 'Mexico City contemporary style, mix of streetwear and refined detail, warm earthy palette with bold accent, Roma/Condesa cafe or rooftop backdrop, golden hour CDMX light, effortless cool',
  },
  {
    id: 'latam-limena',
    name: 'Limeña Moderna',
    category: 'aesthetic',
    icon: '🪶',
    featured: true,
    mode: 'cultural',
    country: ['PE'],
    hint: 'modern Lima Pacific coast style, soft beige and ivory palette with andean accent detail, refined understated elegance, Miraflores ocean cliff or Barranco art district backdrop, diffused coastal light',
  },
]

// ─── Sensual (Modo Creator only — +18) ─────────────────────────────
// Editorial sensual aesthetics. Hard line: lingerie / beach / boudoir,
// nothing topless, nothing explicit. Output classified server-side.
export const LATAM_SENSUAL_PRESETS: LatamPreset[] = [
  {
    id: 'latam-lenceria-editorial',
    name: 'Lencería Editorial',
    category: 'spicy',
    icon: '🌹',
    featured: true,
    mode: 'sensual',
    hint: 'editorial lingerie photoshoot in the style of high-end fashion magazines, tasteful boudoir aesthetic, soft golden window light, satin and lace fabrics, elegant feminine pose, magazine cover quality, sophisticated and refined',
  },
  {
    id: 'latam-beach-brazilian',
    name: 'Beach Brazilian',
    category: 'spicy',
    icon: '🏖️',
    featured: true,
    mode: 'sensual',
    country: ['BR'],
    hint: 'Brazilian beach editorial, sun-kissed skin, tropical bikini fashion, vibrant ocean backdrop, golden afternoon light, confident playful pose, Ipanema or Copacabana vibe, glossy magazine aesthetic',
  },
  {
    id: 'latam-boudoir',
    name: 'Boudoir LATAM',
    category: 'spicy',
    icon: '🕯️',
    featured: true,
    mode: 'sensual',
    hint: 'intimate boudoir photography, soft warm bedroom light through sheer curtains, silk robe and elegant lingerie, romantic and feminine, painterly shadows, vintage editorial mood, refined sensual aesthetic',
  },
  {
    id: 'latam-mirror-selfie',
    name: 'Mirror Selfie Sensual',
    category: 'spicy',
    icon: '📱',
    featured: true,
    mode: 'sensual',
    hint: 'mirror selfie aesthetic with phone visible, casual sensual pose in bathroom or bedroom, lingerie or activewear, natural soft light, authentic Instagram-style framing, confident expression, modern Latin influencer vibe',
  },
  {
    id: 'latam-transparencia',
    name: 'Transparencia Editorial',
    category: 'spicy',
    icon: '🥂',
    featured: true,
    mode: 'sensual',
    hint: 'high fashion editorial with sheer fabric and tasteful transparency, designer dress with sophisticated layering, dramatic studio lighting, elegant pose, runway-quality styling, sensual but refined editorial aesthetic',
  },
]

export const ALL_LATAM_PRESETS: LatamPreset[] = [
  ...LATAM_CULTURAL_PRESETS,
  ...LATAM_SENSUAL_PRESETS,
]

/**
 * Filter LATAM presets by user's content mode.
 * Standard users only see cultural presets.
 * Creator users see both cultural + sensual.
 */
export function getLatamPresetsForMode(mode: 'standard' | 'creator'): LatamPreset[] {
  if (mode === 'creator') return ALL_LATAM_PRESETS
  return LATAM_CULTURAL_PRESETS
}
