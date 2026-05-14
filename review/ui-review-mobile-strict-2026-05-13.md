# UI Review — Mobile-strict pass · 2026-05-13

Second audit, exclusively mobile-first. Different from the first audit (which was general UX). This one targets iPhone HIG, touch targets, safe areas, keyboard avoidance, iOS Safari quirks.

## Top 5 mobile-only quick wins (ship today)

1. **`100vh` → `100dvh`** in 5 files — fullscreen phases (CrearPersonaje :2132, Recast :1503, Reels :1114, VideoEdit :713,899, Imagina :1119). iOS Safari bug where 100vh ≠ actual viewport when address bar visible.

2. **`enterKeyHint` + `inputMode`** on ~7 inputs/textareas across CrearPersonaje (:923, :1446, :1030, :1459), Reimaginar (:1007), MobileEditor (:1557), VideoEdit (:566), Reels (:594). Better iOS keyboard label per action context.

3. **`<a href download>` broken on iOS WKWebView** — HeadshotPro :497-502, Reimaginar :812, SesionDeFotos :1134. Cross-origin URLs silently fail. Replace with `sharePhoto()` button using the existing pattern.

4. **Chip touch targets sub-44px** — cp-chip (:1812-1821), ss-char-chip (:1245), rm-tab (~32px). Hundreds of chips at ~32px. Fix: `min-height: 44px; display: inline-flex; align-items: center` on the chip CSS classes.

5. **Imagina back buttons 32×32px** — im-back (:936-944) + im-gallery-back (:1250-1257). 27% shortfall from HIG. Fix to 44×44.

## Structural

- **AppTopBar safe-area-top missing** — `components/apps/_shared/AppTopBar.tsx:64` has `padding: 14px 20px 10px` with no `env(safe-area-inset-top)`. Relies on parent shell positioning which is fragile. Fix: `padding-top: max(14px, env(safe-area-inset-top))`.

## Per-app touch target summary

| App | Sub-44 targets |
|---|---|
| MobileApp | 2 — m-avatar (40px), m-nav-item (~36px) |
| CrearPersonaje | Many cp-chip (~32px) |
| HeadshotPro | hp-canvas-btn (~30px), hp-char-x (20px) |
| Reimaginar | rm-tab (~32px) |
| SesionDeFotos | ss-char-chip (~38px), outfit chips |
| MobileEditor | me-back (~30px) |
| Recast | 0 confirmed |
| Reels | rl-tpl-card pending |
| VideoEdit | ve-ref-add likely under |
| Imagina | im-back, im-gallery-back (32px each) |

## Other findings worth shipping later

- **Keyboard avoidance on textareas** (VideoEdit, MobileEditor) — needs `visualViewport` listener to translate sheet up when keyboard rises. Real refactor; defer.
- **Long-press 180ms → 350ms** in MobileEditor (:1044-1065). Match iOS link-preview convention to reduce accidental compare-mode entry.
- **Horizontal scroll discoverability** — Reels template strip needs right-edge fade-mask hint.
- **Skeleton loaders** — VideoEdit gallery strip, generating phases, image-heavy views on slow networks.

## Suite-level patterns

- Bottom CTAs respect safe-area-bottom consistently ✅
- Top safe-area handled by parent shells (works but fragile) — should be self-contained in AppTopBar
- Native-feel score: 7/10 — haptics consistent, share works, but iOS download is broken and keyboard avoidance is missing
