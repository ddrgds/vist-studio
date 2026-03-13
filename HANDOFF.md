# HANDOFF — VIST Studio Session Transfer

## 1. Project Overview

**What:** React 18 + TypeScript + Tailwind v4 + Vite frontend for a virtual influencer AI studio.
**Identity:** "Joi Holographic" — soft pink/magenta/lavender aesthetic inspired by Blade Runner 2049 Joi.
**Key refs:** `CLAUDE.md` (full architecture, design system, coding rules), `index.css` (Joi CSS layer + vars).

**Key directories:**
- `pages/` — 10 pages (Dashboard, Director, Landing, etc.)
- `components/` — Sidebar, AuthScreen, PricingPage, ProfilePage
- `components/ui/` — canvas-reveal-effect, flow-field-background, matrix-text
- `services/` — geminiService, supabaseService
- `stores/` — characterStore, galleryStore (Zustand)
- `contexts/` — AuthContext, ProfileContext, ToastContext

## 2. Current Status

**Completed this session (across 2 context windows):**
- Full visual identity migration: "Netrunner" (cyan/terminal HUD) → "Joi Holographic" (pink/magenta frosted glass) across **all 18 files** (pages, components, layout, ui)
- Zero `--nr-*` CSS var references remain (verified via grep)
- Landing page complete rewrite: narrative Stitch-inspired design with hero image, capabilities cards, world building environments, testimonials, CTA
- Integrated `CanvasRevealEffect` (Three.js WebGL dot matrix shader) into Landing hero as subtle atmospheric background layer
- Installed `three` + `@react-three/fiber` as deps
- Fixed shader bug (`googrand` → `rand`), TypeScript key errors in `.map()` Reveal wrappers
- **Build status:** TypeScript and Vite both pass clean (exit code 0)

**Uncommitted changes:** 21 files modified, ~2700 lines added. Nothing committed yet this session.

## 3. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Joi CSS vars (`--joi-pink`, `--joi-magenta`, etc.) layered in `index.css` | Non-destructive; old Plasma Shift vars still available |
| Landing hero: canvas effect at z:0 (35% opacity) + image at z:1 (`mix-blend-mode: screen` at 45% opacity) | Subtle dot matrix animation masks pixelation without removing the hero image |
| CanvasRevealEffect colors: `[255,107,157]` + `[208,72,176]` | Matches Joi pink/magenta palette |
| `Suspense` wrapping around `CanvasRevealEffect` | Three.js is heavy; graceful fallback if WebGL unavailable |
| Framer Motion `whileInView` for scroll reveals | Lightweight, already a dep, no new lib needed |
| Selected/active state pattern: `rgba(255,107,157,.08)` bg + `.2` border + pink text | Consistent across Sidebar, Dashboard, all pages |

## 4. Next Steps

**Priority 1 — Commit & ship:**
- [ ] Commit all 21 modified files + new `components/ui/canvas-reveal-effect.tsx`
- [ ] Add `components/ui/canvas-reveal-effect.tsx` to git tracking
- [ ] Consider adding `three` and `@react-three/fiber` to `.gitignore` notes or verify bundle size impact

**Priority 2 — Polish:**
- [ ] Test canvas effect on mobile (Three.js WebGL may need perf guard / `devicePixelRatio` cap)
- [ ] Verify Landing responsive breakpoints (nav collapses, grid stacks)
- [ ] Check `PricingPage.tsx` — was converted from Spanish to English; verify all copy is correct
- [ ] Clean up screenshot PNG files in repo root (~60 untracked `.png` files)

**Priority 3 — Features:**
- [ ] `pages/Analytics.tsx`, `CharacterGallery.tsx`, `UniverseBuilder.tsx`, `ContentCalendar.tsx` — newly created pages, verify full functionality
- [ ] Connect remaining mock data to real API endpoints (see CLAUDE.md §"Cómo conectar")
- [ ] Deferred bugs from memory: memory leaks, `as any` cleanup, N+1 gallery save, image compression

**Files to focus on:** `pages/Landing.tsx`, `components/ui/canvas-reveal-effect.tsx`, `index.css` (Joi layer starts ~line 400+)

## 5. Context Notes

- **Joi CSS identity** classes: `joi-glass`, `joi-mesh`, `joi-border-glow`, `joi-btn-solid`, `joi-btn-ghost` — always use these over raw Tailwind for themed surfaces
- **Trigger words:** user says "tenue" = subtle/low-opacity; "pixeleada" = pixelated image quality concern
- **Pruning candidates:** `.playwright-mcp/` screenshots, 60+ root PNG files, `vertex-studio-source/` directory — all untracked, safe to gitignore
- **Dev server:** runs on `http://localhost:3008`
- **User language:** communicates in Spanish, UI is English
