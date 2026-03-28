# Unified Studio — Design Spec

**Date:** 2026-03-28
**Reference mockup:** `public/mockup_studio_light_v2.html`
**Replaces:** Director.tsx + PhotoSession.tsx + ContentStudio.tsx → single Studio.tsx

## Context

Director and PhotoSession are separate pages with overlapping purposes. Director handles single hero-shot creation with granular controls; PhotoSession handles batch generation with vibes/presets. This separation makes the app feel like a "technical control panel" and confuses new users. This spec unifies both into a single Studio page with progressive disclosure.

## Core Concept

One page, two phases. Phase 1 creates/selects a base image ("hero"). Phase 2 explodes that image into a contact sheet of 9 variations. Progressive disclosure keeps the interface simple for new users while preserving full control for advanced users.

---

## Phase 1: Composition (Hero Creation)

### Left Panel (360px, white glassmorphism card)

**Toggle:** `[Simple | Avanzado]` — top of panel

**Source tabs:** `[✨ Crear] [📷 Subir] [🖼 Galería]`
- **Crear:** generate hero from scratch (default)
- **Subir:** upload a photo → skip directly to Phase 2
- **Galería:** pick from gallery → skip directly to Phase 2

**Simple mode (default):**

1. **Protagonista** — horizontal avatar row from characterStore. Selected = black ring.
2. **Estilo Base (Quick Style)** — 5 pill buttons: Selfie / UGC / Lifestyle / Editorial / Night Out. Selected = black bg + white text. Clicking fills scenario/camera/lighting/pose values (same QUICK_STYLE_PRESETS data from current Director).
3. **Progressive disclosure links:**
   - `+ Añadir instrucción manual de escenario` → expands textarea pre-filled with Quick Style text
   - `+ Subir vestuario específico` → expands text input + image upload button
4. **CTA:** `⚡ Generar Hero · {cost}cr` — full-width black button

**Advanced mode (toggle):**

Reveals all Director accordion sections below the Simple fields:
- Pose (presets + custom + ControlNet image)
- Camera (8 presets + custom)
- Lighting (8 presets + custom)
- Enhancers (style enhancers + custom)
- Advanced (engine selector, resolution, aspect ratio, negative prompt, image boost)

These are the exact same accordions from current Director.tsx — no redesign needed.

### Center Canvas

**Empty state:** Dashed border, image icon, "Tu lienzo en blanco" in Instrument Serif italic.

**Generating state:** Spinner in CTA button. Flash overlay (white screen 0.6s) on completion.

**Filled state:** Hero image displayed at chosen aspect ratio. Floating action bar appears at bottom of image:
- `✏️ Editar` → opens AI Editor overlay
- `📸 Sesión` → transitions to Phase 2

**Below canvas:** Aspect ratio pills `3:4 | 1:1 | 4:3 | 9:16 | 16:9`

### Generation Flow (Phase 1)

Identical to current Director generation:
1. Validate character selected or face refs uploaded
2. Deduct credits
3. Fetch character reference URLs
4. Build InfluencerParams
5. Optional ControlNet pose conditioning (+5cr)
6. compilePrompt()
7. Route to engine (Auto/NB2 default)
8. Display result, set pipeline store hero shot

---

## Phase 2: Darkroom Contact Sheet

Activated by clicking `📸 Sesión` on hero, or directly when user uploads/selects a gallery image.

### Left Panel (transforms from Phase 1)

1. **Imagen base** — small thumbnail of hero/uploaded image + description snippet. Glassmorphism card with border.
2. **Dirección Creativa (Vibes)** — multi-select pills auto-suggested based on Quick Style used in Phase 1:
   - Selfie Quick Style → auto-selects Selfies + Lifestyle vibes
   - Editorial Quick Style → auto-selects Editorial + Retrato vibes
   - Night Out Quick Style → auto-selects Noche + Street Style vibes
   - etc.
   - Auto-selected pills show `auto` badge
   - User can toggle any vibe on/off. Deselecting a vibe shows recycle overlay on corresponding grid cells.
   - Available vibes: all 13 from current sessionPresets.ts (Selfies, GRWM, Stories, Editorial, Retrato, Street Style, Creador, Lifestyle, Fitness, Noche, Foto Dump, Cita, Piscina)
3. **Photo count:** Subtle stepper `[◀ 9 ▶]` — range 4-12, default 9
4. **CTA:** `📸 Disparar Sesión · {sessionCost}cr` — cost is per single generation call (6cr basic), NOT per-photo, since it's one contact sheet image
5. **Link:** `← Volver al hero` — returns to Phase 1 with hero intact

### Center Canvas (Grid)

**Grid layout:** Adaptive based on photo count:
- 4 photos → 2×2
- 6 photos → 2×3
- 9 photos → 3×3 (default)
- 12 photos → 3×4

**Generation:** Single API call generating one contact sheet image containing all N variants. Client-side split using `gridSplitter.ts` (extend `splitGrid()` to support 3×3, 2×3, 3×4).

**Darkroom reveal animation:**
1. Flash overlay (white, 0.6s)
2. Staggered cell reveal — each cell appears 150ms after the previous
3. `slideDown` animation per cell

**Cell interactions:**
- Click to toggle selection. Selected cells get dark border (3px) + check badge (✓) top-right.
- Each cell shows vibe label (bottom-left): "Selfie 1", "Lifestyle 2", etc.
- Unselected vibes: corresponding cells show recycle overlay (semi-transparent bg + recycle icon)

**Bottom action bar** (floating, centered):
- Left: `{N} de {total} seleccionadas`
- Right: `[↻ Regenerar base]` ghost button + `[⬆ Upscale Seleccionadas · {cost}cr]` solid black button

### Generation Flow (Phase 2)

1. Build contact sheet prompt from selected vibes using `mixShots()` from sessionPresets.ts
2. For each cell position, generate a pose description from the selected vibes (round-robin distribution)
3. Compose prompt:
   ```
   A {rows}x{cols} contact sheet of {N} different photos of the SAME person from the Base Image.
   [Position descriptions per cell]
   {FACE_LOCK_PROMPT}
   {OUTFIT_PRESERVE_PROMPT}
   Same face, same outfit across all photos. Only pose and angle change.
   ```
4. Single generation call: `generatePhotoSession(baseImage, 1, contactSheetPrompt)`
5. Client-side split: `splitGrid(resultUrl, rows, cols)` → N individual images
6. Display in grid with staggered animation
7. User selects favorites → upscale selected with AuraSR
8. Only upscaled photos saved to galleryStore

### Vibe → Cell Mapping

When user changes vibes, the system:
1. Recalculates `mixShots(selectedVibes, photoCount)` — round-robin distribution
2. Cells whose vibe is no longer selected show recycle overlay (visual only — not removed until regenerate)
3. Clicking "Regenerar base" re-runs generation with updated vibes

### Auto-Vibe Detection

Map from Phase 1 Quick Style to Phase 2 default vibes:

| Quick Style | Auto-selected Vibes |
|---|---|
| Selfie | Selfies + Lifestyle |
| UGC | Selfies + Creador + Lifestyle |
| Lifestyle | Lifestyle + Street Style + Retrato |
| Editorial | Editorial + Retrato + Foto Dump |
| Night Out | Noche + Street Style + Selfies |

If no Quick Style was selected (user typed custom scenario), default to Selfies + Lifestyle.

---

## Navigation & Sidebar Changes

- **Studio** replaces both "Director" and "Carrusel" sidebar entries → single "Studio" entry
- Sidebar item: icon 📸, label "Studio", sublabel "Crear y sesión de fotos"
- `Page` type: add `'studio-new'` (temporary) or reuse `'studio'` which currently routes to ContentStudio
- Remove ContentStudio.tsx routing (Director is now embedded in Studio)
- PhotoSession.tsx becomes unused (can delete after Studio is stable)

---

## Technical Approach

### Evolve Director.tsx → Studio.tsx

Director.tsx already has ~70% of Phase 1 functionality. The plan:

1. **Create** `pages/Studio.tsx` as new file, extracting generation logic from Director.tsx. Keep Director.tsx temporarily until Studio is stable.
2. **Add** `phase` state: `'hero' | 'session'`
3. **Add** Simple mode: hide accordions, show Quick Style pills + progressive disclosure
4. **Add** source tabs: upload/gallery skip to Phase 2 directly
5. **Add** Phase 2 UI: grid, vibes selector, bottom bar, darkroom animations
6. **Reuse** `photoSessionPipeline.ts` → `runBasicTier()` for contact sheet generation
7. **Extend** `gridSplitter.ts` → support arbitrary rows×cols (currently only 2×2)
8. **Reuse** `sessionPresets.ts` → `mixShots()` for vibe distribution + all 13 preset data
9. **Add** auto-vibe detection mapping (Quick Style → vibes)
10. **Add** cell selection state + upscale flow

### Files to modify/create

| File | Action | What |
|---|---|---|
| `pages/Studio.tsx` | Create (or rename Director) | New unified page |
| `services/gridSplitter.ts` | Modify | Support 3×3, 2×3, 3×4 splits |
| `components/Sidebar.tsx` | Modify | Single "Studio" entry |
| `App.tsx` | Modify | Route `'studio'` → Studio.tsx |
| `stores/navigationStore.ts` | Modify | Update page type if needed |

### Files that become unused (delete after stable)

| File | Reason |
|---|---|
| `pages/PhotoSession.tsx` | Replaced by Studio Phase 2 |
| `pages/ContentStudio.tsx` | Replaced by Studio |
| `components/BatchOutfitModal.tsx` | May still be useful, evaluate |

### Files reused as-is (no changes)

| File | What it provides |
|---|---|
| `services/photoSessionPipeline.ts` | `runBasicTier()` for contact sheet generation |
| `data/sessionPresets.ts` | 13 vibes, `mixShots()`, FACE_LOCK, OUTFIT_PRESERVE prompts |
| `services/falService.ts` | All generation endpoints |
| `services/replicateService.ts` | Generation endpoints |
| `services/geminiService.ts` | NB2/Pro generation + prompt enhancement |
| `services/promptCompiler.ts` | Prompt compilation |
| `stores/pipelineStore.ts` | Hero shot / pipeline state |
| `stores/characterStore.ts` | Character data |
| `stores/galleryStore.ts` | Gallery save |
| `data/directorOptions.ts` | Pose/camera/lighting presets for Advanced mode |

---

## Design Tokens (from mockup)

Already matching current index.css:
- Background: `var(--bg-0)` = #F3F4F6
- Cards: `var(--bg-1)` = #FFFFFF with `backdrop-filter: blur(20px)`
- Accent: `var(--accent)` = #1A1A1A
- Text: `var(--text-1)` #111, `var(--text-2)` #555, `var(--text-3)` #999
- Border: `var(--border)` = rgba(0,0,0,0.06)
- Headings: `var(--font-display)` = Instrument Serif
- Body: `var(--font-body)` = DM Sans
- Mono: `var(--font-jet)` = JetBrains Mono
- CTA: solid black `var(--accent)` with white text
- Selected pills: `var(--accent)` bg + white text
- Shadow: `0 8px 32px rgba(0,0,0,0.03)`

---

## Credits

| Action | Cost |
|---|---|
| Generate hero (basic/NB2) | 6cr |
| Generate hero (other engines) | per ENGINE_METADATA |
| ControlNet pose conditioning | +5cr |
| Contact sheet (single image, basic) | 6cr (one generation call, regardless of cell count) |
| Upscale per photo (AuraSR) | 2cr |
| Prompt enhancement (Gemini) | 2cr |

Note: The contact sheet is a single generation call regardless of cell count, so the credit cost is per-call (6cr basic), NOT per-photo. This is a significant cost advantage over the current PhotoSession which charges per-photo.

---

## Verification Plan

1. **Phase 1 Simple mode:** Select character + Quick Style → generates hero. Verify image appears in canvas with action bar.
2. **Phase 1 Advanced mode:** Toggle to Advanced → all Director accordions appear. Generate with custom settings → same result flow.
3. **Phase 1 Upload/Gallery skip:** Upload image → Phase 2 activates directly. Same with gallery selection.
4. **Phase 2 Grid generation:** Click "Sesión" → vibes auto-populated → "Disparar Sesión" → flash + staggered reveal of 9 cells.
5. **Cell selection:** Click cells → check badge appears. Count updates in bottom bar.
6. **Vibe toggle:** Deselect a vibe → corresponding cells show recycle overlay.
7. **Upscale:** Select 3+ cells → click Upscale → AuraSR runs → only upscaled images appear in Gallery.
8. **Back navigation:** "Volver al hero" returns to Phase 1 with hero intact.
9. **Mobile:** Verify stacked layout works on mobile (left panel full width above canvas).
10. **Build:** `pnpm build` passes without TypeScript errors.
