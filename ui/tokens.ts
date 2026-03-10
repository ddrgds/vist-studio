/** Design tokens — single source of truth for all visual constants */

export const colors = {
  bg:          '#08070c',
  bgSurface:   '#0e0c14',
  bgElevated:  '#15121c',
  bgHover:     '#1e1a28',
  border:      'rgba(240,234,240,0.06)',
  borderHover: 'rgba(240,104,72,0.22)',
  accent:      '#f06848',
  accentDim:   'rgba(240,104,72,0.15)',
  accentHover: '#ff8870',
  magenta:     '#d048b0',
  blue:        '#4858e0',
  mint:        '#50d8a0',
  gold:        '#e0b050',
  text:        '#f0eaf0',
  textSec:     '#9088a0',
  textMuted:   '#58506c',
  success:     '#50d8a0',
  warning:     '#e0b050',
  error:       '#f87171',
} as const;

export const fonts = {
  display: "'Instrument Serif', serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'JetBrains Mono', monospace",
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export type Colors = typeof colors;
export type ColorKey = keyof Colors;
