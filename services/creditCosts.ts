/**
 * Centralized credit costs for the mobile-suite apps.
 *
 * Previously scattered as magic numbers across each page (COST = 10,
 * COST_PER_SEC = 17, etc), which meant pricing changes required edits
 * in 10+ files. These constants are the single source of truth — import
 * from here in each app instead of redefining.
 *
 * Pricing model: every value is approximately ceil(API_cost / (0.35 × $0.010))
 * where 0.35 is the margin coefficient. See CREDIT_COSTS in types.ts for
 * the engine-level mapping; this file holds the user-visible per-app costs.
 */

// ─── Image apps ─────────────────────────────────────────────────────────────
/** Headshot Pro — single editorial portrait. */
export const COST_HEADSHOT = 10;
/** Reimaginar — aesthetic restyle, base tier. */
export const COST_REIMAGINAR = 10;
/** Reimaginar — Hero Pro upgrade adds Flux 2 Max replicate. */
export const COST_REIMAGINAR_PREMIUM_EXTRA = 15;
/** Imagina — single variation. */
export const COST_IMAGINA_PER_VARIATION = 6;
/** Sesión de Fotos — flat per generated photo (4-12 in a session). */
export const COST_SESION_PER_PHOTO = 4;
/** Crear Personaje — full sheet generation (face + body + expressions). */
export const COST_FULL_SHEET = 18;
/** Crear Personaje — refine sheet (regen one panel). */
export const COST_REFINE_SHEET = 4;
/** Editor IA — most edit tools cost this (Relight, Skin, Style, etc). */
export const COST_EDITOR_SIMPLE = 6;
/** Editor IA — heavier tools (Try-On, Product, Expand, AI Edit, Angles 360°). */
export const COST_EDITOR_HEAVY = 14;

// ─── Video apps ─────────────────────────────────────────────────────────────
/** Recast (Kling 3 Pro Motion Control) — credits per second of source video. */
export const COST_RECAST_PER_SEC = 58;
/** Reels (Happy Horse i2v 1080p) — credits per second of output. */
export const COST_REELS_PER_SEC = 29;
/** Editar Video (Happy Horse video-edit 1080p) — flat per call regardless of length. */
export const COST_VIDEOEDIT = 145;
