// ─────────────────────────────────────────────
// Aesthetic Presets — 2026-05-07
//
// Originally created as "LATAM Cultural Presets" in 2026-05-05 sprint, but
// renamed to neutral aesthetic categories on 2026-05-07 to avoid
// stereotyping. The wedge is LATAM-as-MARKET (Spanish-speaking users,
// LATAM payments, Spanish community), NOT LATAM-as-LOOK.
//
// File kept for backward compatibility — canonical source for these presets
// is data/soulStyles.ts (entries with id: aesthetic-* and sensual-*).
//
// Two buckets:
//   1) standard  — visible in Modo Standard (default).
//                  Universal aesthetic categories (editorial, beach, urban).
//   2) sensual   — visible only in Modo Creator (opt-in +18).
//                  Editorial sensual: lingerie, beach editorial, boudoir.
//                  Hard line enforced server-side via /safety-check:
//                  no topless, no nudity, no explicit content.
// ─────────────────────────────────────────────

import type { SoulStyle } from './soulStyles'

export type AestheticMode = 'standard' | 'sensual'

export interface AestheticPreset extends SoulStyle {
  mode: AestheticMode
}

// Backward-compat alias
export type LatamMode = AestheticMode
export type LatamPreset = AestheticPreset

// ─── Standard aesthetics (Modo Standard) ───────────────────────────
export const STANDARD_AESTHETIC_PRESETS: AestheticPreset[] = [
  {
    id: 'aesthetic-editorial-chic',
    name: 'Editorial Chic',
    category: 'aesthetic', icon: '🌹', featured: true, mode: 'standard',
    hint: 'polished editorial fashion shoot, contemporary tailored fashion, warm honey tones, urban backdrop, golden afternoon light, confident expression',
  },
  {
    id: 'aesthetic-beach-tropical',
    name: 'Beach Tropical',
    category: 'aesthetic', icon: '🌴', featured: true, mode: 'standard',
    hint: 'tropical coastal vibe, breezy linen and cotton, sun-kissed glow, beach-side or palm tree backdrop, vibrant warm colors, salty hair and sea breeze',
  },
  {
    id: 'aesthetic-urban-cosmopolitan',
    name: 'Urban Cosmopolitan',
    category: 'aesthetic', icon: '🏙️', featured: true, mode: 'standard',
    hint: 'metropolitan style, sleek tailored fashion, neutral palette with statement accessory, modernist architecture backdrop, sophisticated cosmopolitan energy',
  },
  {
    id: 'aesthetic-street-editorial',
    name: 'Street Editorial',
    category: 'aesthetic', icon: '🌃', featured: true, mode: 'standard',
    hint: 'contemporary street style, mix of streetwear and refined detail, warm earthy palette with bold accent, urban cafe or rooftop backdrop, golden hour light',
  },
  {
    id: 'aesthetic-coastal-minimal',
    name: 'Coastal Minimalist',
    category: 'aesthetic', icon: '🪶', featured: true, mode: 'standard',
    hint: 'coastal minimalist style, soft beige and ivory palette, refined understated elegance, ocean cliff or seaside backdrop, diffused coastal light',
  },
]

// ─── Sensual aesthetics (Modo Creator only — +18) ─────────────────
export const SENSUAL_AESTHETIC_PRESETS: AestheticPreset[] = [
  {
    id: 'sensual-lenceria-editorial',
    name: 'Lencería Editorial',
    category: 'spicy', icon: '🌹', featured: true, mode: 'sensual',
    hint: 'editorial lingerie photoshoot in the style of high-end fashion magazines, tasteful boudoir aesthetic, soft golden window light, satin and lace fabrics, elegant feminine pose, magazine cover quality, sophisticated and refined',
  },
  {
    id: 'sensual-beach-editorial',
    name: 'Beach Editorial',
    category: 'spicy', icon: '🏖️', featured: true, mode: 'sensual',
    hint: 'editorial beach photoshoot, sun-kissed skin, tropical bikini fashion, vibrant ocean backdrop, golden afternoon light, confident playful pose, magazine quality',
  },
  {
    id: 'sensual-boudoir',
    name: 'Boudoir',
    category: 'spicy', icon: '🕯️', featured: true, mode: 'sensual',
    hint: 'intimate boudoir photography, soft warm bedroom light through sheer curtains, silk robe and elegant lingerie, romantic and feminine, painterly shadows, vintage editorial mood, refined sensual aesthetic',
  },
  {
    id: 'sensual-mirror-selfie',
    name: 'Mirror Selfie Sensual',
    category: 'spicy', icon: '📱', featured: true, mode: 'sensual',
    hint: 'mirror selfie aesthetic with phone visible, casual sensual pose in bathroom or bedroom, lingerie or activewear, natural soft light, authentic Instagram-style framing, confident expression, modern influencer vibe',
  },
  {
    id: 'sensual-transparencia',
    name: 'Transparencia Editorial',
    category: 'spicy', icon: '🥂', featured: true, mode: 'sensual',
    hint: 'high fashion editorial with sheer fabric and tasteful transparency, designer dress with sophisticated layering, dramatic studio lighting, elegant pose, runway-quality styling, sensual but refined editorial aesthetic',
  },
]

// Backward-compat exports (some refs still use LATAM_* names)
export const LATAM_CULTURAL_PRESETS = STANDARD_AESTHETIC_PRESETS
export const LATAM_SENSUAL_PRESETS = SENSUAL_AESTHETIC_PRESETS

export const ALL_AESTHETIC_PRESETS: AestheticPreset[] = [
  ...STANDARD_AESTHETIC_PRESETS,
  ...SENSUAL_AESTHETIC_PRESETS,
]
export const ALL_LATAM_PRESETS = ALL_AESTHETIC_PRESETS

/**
 * Filter aesthetic presets by user's content mode.
 * Standard users only see standard presets.
 * Creator users see both standard + sensual.
 */
export function getAestheticPresetsForMode(mode: 'standard' | 'creator'): AestheticPreset[] {
  if (mode === 'creator') return ALL_AESTHETIC_PRESETS
  return STANDARD_AESTHETIC_PRESETS
}
export const getLatamPresetsForMode = getAestheticPresetsForMode
