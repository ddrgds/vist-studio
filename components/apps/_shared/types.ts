/**
 * Shared types for VIST premium app suite (Headshot Pro, Reimaginar, Sesión, etc).
 *
 * Each app has its OWN mood (palette, voice, distinguishing visual). The shared
 * components accept the mood as explicit props — they don't read from CSS vars
 * or global state. This keeps each component self-contained and testable.
 */

export interface AppMood {
  /** Background base, typically a warm cream */
  bg0: string;
  /** Card / chip background, typically slightly lighter than bg0 */
  bgCard: string;
  /** Paper / disabled background */
  paper: string;
  /** Text primary */
  ink0: string;
  /** Text secondary */
  ink1: string;
  /** Text muted */
  ink2: string;
  /** Text faint */
  ink3: string;
  /** Subtle border line */
  line: string;
  /** Accent color (terracotta, rose, copper, etc) */
  accent: string;
  /** Accent darker — used for gradients and hover */
  accentDeep: string;
  /** Gold/champagne secondary — used for the credits dot */
  gold: string;
}

/** Standard easing curve used across all apps. */
export const APP_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
