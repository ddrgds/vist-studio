# Create Page Soul & Feature Recovery — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore all lost gallery features, add visual soul (cyan accent, depth, animations), and enhance Create page with inline tools, resizable gallery, scene photo reference, model comparison, and proper AI Edit flow.

**Architecture:** Upgrade CreatePage's inline gallery to match legacy GalleryGrid feature parity (hover actions, context menu, selection mode, compare slider, filter bar). Add visual depth via secondary cyan accent, surface gradients, micro-animations. New features: resizable gallery (drag handle), scene photo upload, battle mode comparison, inline AI Edit prompt overlay.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide icons

---

## 1. Gallery Feature Parity

### Problem
CreatePage gallery has only 3 hover actions (Download, Reuse, Upscale). Legacy GalleryGrid had 6 hover buttons + "More" menu with 12+ tools + selection mode + batch toolbar + filter bar + compare slider. Massive feature loss.

### Solution
Replace CreatePage's custom gallery rendering with full-featured gallery cards.

**On hover (6 colored action buttons):**
1. Download (emerald) — `onDownload`
2. AI Edit (blue) — opens prompt overlay (NOT filter editor)
3. Change Pose (violet) — `onChangePose`
4. Reuse params (purple) — `onReuse`
5. Upscale 4x (amber) — `onUpscale`
6. More "⋯" (gray) — context menu portal

**"More" context menu (MoreOptionsMenu pattern):**
- Face Swap, Virtual Try-On, Skin Enhancer, Relight, Inpainting
- Generate Caption, Remove Background, Copy to Clipboard
- Add to Storyboard, Share to Community, Edit Tags
- Compare with... (enters pick-second-image mode)

**Selection mode:**
- Ctrl+click or long-press to enter
- Batch toolbar: count, Clear, Compare (2 selected), Download all, Delete all
- Checkbox overlay on each image

**Filter bar:**
- Tabs: All / Images / Video / Favorites
- Sort: Newest / Oldest toggle
- Item count

**CompareSliderModal:**
- Import existing `components/CompareSliderModal.tsx`
- Triggered from "More" menu ("Compare with...") or batch toolbar (2 selected)

### Props additions needed in CreatePage
```typescript
// New props
onCaption: (item: GeneratedContent) => void;       // already exists
onSkinEnhance?: (item: GeneratedContent) => void;   // new
onRemoveBg?: (item: GeneratedContent) => void;       // new
onCopyToClipboard?: (item: GeneratedContent) => void; // new (can be internal)
onShare?: (item: GeneratedContent) => void;           // new
```

### Files to modify
- `components/CreatePage.tsx` — gallery section rewrite
- `App.tsx` — pass new props (onSkinEnhance, onShare, etc.)

---

## 2. AI Edit Fix

### Problem
"AI Edit" button calls `onEdit` → `gallery.setEditingItem()` → opens `ImageEditor` (filter/adjustment editor). Users expect prompt-based AI editing.

### Solution
- Keep `onEdit` for filter editor, relabel button to "Filters"
- Add new `onAiEdit` prop that opens a prompt overlay on the image
- AI Edit overlay: textarea + engine selector + "Apply" button
- Uses existing generation pipeline in edit mode (`useGeneration` edit flow)
- Overlay appears inline over the gallery image, not a separate modal

### Flow
1. User clicks "AI Edit" on hover → overlay appears on that image
2. User types instruction (e.g., "add sunglasses")
3. User picks engine (default: current)
4. Clicks "Apply" → triggers edit generation
5. Result appears as new gallery item

### Files to modify
- `components/CreatePage.tsx` — add AI Edit overlay component
- `App.tsx` — add `onAiEdit` prop wiring (or handle internally via `useGeneration`)

---

## 3. Scene Photo Reference

### Problem
Scene panel only accepts text. Users want to upload a scene reference photo.

### Solution
- Add image upload slot in Scene panel (below lighting/camera/pose, above textarea)
- Small thumbnail preview with X to remove
- Passed as scene reference to generation API via `form.setSceneReference(file)`

### Files to modify
- `components/CreatePage.tsx` — Scene panel section
- `contexts/FormContext.tsx` — add `sceneReference` / `setSceneReference` state
- `hooks/useGeneration.ts` — pass scene reference to API calls

---

## 4. Generate Button Redesign

### Problem
- Sparkles icon looks like Gemini's icon
- Lightning bolt credit badge invisible on orange gradient
- No visual feedback for "ready to generate" state

### Solution
- Replace `Sparkles` → `Wand2` from Lucide (magic wand)
- Credit badge: white text on cyan pill (`#22D3EE` bg)
- Ready state: subtle pulsing glow animation (2s interval) when prompt is filled
- CSS keyframe: `generate-pulse` — box-shadow oscillates between 0.2 and 0.4 opacity

### Files to modify
- `components/CreatePage.tsx` — generate button section
- `index.css` — add `generate-pulse` keyframe

---

## 5. Resizable Gallery

### Problem
Gallery takes fixed space. Users want to control gallery vs prompt area ratio.

### Solution
- Horizontal drag handle between gallery and prompt bar
- `onMouseDown` → track delta → update flex ratio
- Min gallery height: 200px, max: viewport - 200px
- Persist ratio to localStorage key `vist_gallery_ratio`
- Visual: thin line with grab cursor, subtle glow on drag

### Files to modify
- `components/CreatePage.tsx` — layout restructure with drag handle

---

## 6. Model Comparison "Battle Mode"

### Problem
Users can't visually compare engines. No way to see same prompt across different models.

### Solution
- "Compare" button in prompt bar (next to Generate), icon: `GitCompare` from Lucide
- Click → popover with engine multi-select (checkboxes, pick 2-4)
- Hit "Battle" → fires all selected engines in parallel
- Results appear in a comparison grid (side-by-side cards with engine label + cost)
- Each result card has full hover actions (same as regular gallery)
- Results also added to gallery history individually
- Grid layout: 2 engines = 2 cols, 3 = 3 cols, 4 = 2x2

### Files to modify
- `components/CreatePage.tsx` — battle mode UI + state
- `hooks/useGeneration.ts` — support firing multiple engines in parallel (or call sequentially)

---

## 7. Visual Soul — Color System & Animations

### Color palette upgrade

| Role | Value | Usage |
|------|-------|-------|
| Primary accent | `#FF5C35` coral | CTAs, active nav, primary buttons |
| Secondary accent | `#22D3EE` cyan | Selected borders, success, badges, info |
| Amber | `#FFB347` | Credits, warnings, video badges |
| Surface base | `#0D0A0A` | Page background |
| Surface raised | `#0F0C0C` | Cards, panels |
| Surface gradient | `linear-gradient(180deg, #131010, #0D0A0A)` | Panel backgrounds |
| Hover tint | `rgba(34,211,238,0.04)` | Subtle cyan on hover |
| Border default | `#2A1F1C` | Card borders |
| Border hover | `rgba(34,211,238,0.2)` | Cyan border on hover |

### Depth & shadows
- Prompt bar: `box-shadow: 0 -4px 24px rgba(0,0,0,0.5)` + top border `rgba(255,255,255,0.06)`
- Gallery images hover: `box-shadow: 0 0 16px rgba(34,211,238,0.1)` (cyan glow)
- Settings popover: enhanced drop shadow
- Panels: gradient background (lighter at top)

### Micro-animations
- Generate button: `generate-pulse` glow when prompt filled
- Toggle pills: spring transition on expand (transform + opacity)
- Gallery images: staggered fade-in (50ms delay per image)
- Engine chip: brief shimmer on change
- Panel open/close: 200ms slide with ease-out
- Image hover: scale(1.02) + cyan glow transition 200ms

### Engine badge colors
- Featured: coral badge
- Pro: cyan badge
- NSFW: red badge
- Video: amber badge

### Files to modify
- `components/CreatePage.tsx` — all visual updates
- `index.css` — new keyframes (generate-pulse, shimmer, fade-in-stagger)

---

## Implementation Priority

1. **Gallery feature parity** (biggest impact — restores lost functionality)
2. **Visual soul** (color + depth + animations — addresses "soulless" feedback)
3. **AI Edit fix** (critical bug — wrong editor opens)
4. **Generate button** (quick win — icon + credit badge)
5. **Resizable gallery** (drag handle)
6. **Scene photo reference** (new feature)
7. **Battle mode comparison** (new feature)

---

## Non-goals (not in this sprint)
- Replacing GalleryGrid.tsx itself (it's used elsewhere, keep it)
- Changing the color palette globally (only CreatePage + prompt bar for now)
- Engine debugging (Seedream/Grok/FLUX not generating locally — separate investigation)
- Mobile-specific optimizations (desktop-first for this sprint)
