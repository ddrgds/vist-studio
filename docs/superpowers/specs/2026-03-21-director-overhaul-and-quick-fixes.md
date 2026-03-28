# VIST Studio — Director Pipeline Overhaul & Quick Fixes
**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Two parallel workstreams:

- **Team A (Quick Fixes):** 4 independent bugs/features that can ship immediately
- **Team B (Director Pipeline):** Architectural overhaul of the ContentStudio generation pipeline

---

## Team A — Quick Fixes

### A1 · Gallery "Sin personaje" bug

**Problem:** Gallery items display "Sin personaje" for all 128 creations because `characterId` is not saved when `saveGalleryItem()` is called from ContentStudio and Director.

**Root cause:** `handleGenerate` in ContentStudio assembles `InfluencerParams` with a character reference but does not pass `characterId` into the `GalleryItem` when saving.

**Fix:**
1. Find every `saveGalleryItem()` call in `pages/ContentStudio.tsx` and `pages/Director.tsx`
2. Inject the currently selected character ID: `characterId: selectedCharId ?? undefined`
3. Verify `GalleryItem.characterId` is persisted to Supabase via `supabaseGenerationService`

**Success:** New generations show the character name; existing 128 items remain as-is (no backfill needed for MVP).

---

### A2 · Character reference photo selector

**Problem:** No way to mark which of a character's generated photos should be used as face references in the Director.

**Design:**

**Data model change — `SavedCharacter` (types.ts):**
```typescript
referencePhotoUrls?: string[]  // max 20, selected by user
```
Persist in `characterStore` and sync to Supabase `characters` table via `jsonb` column `reference_photo_urls`.

**UI — CharacterGallery "Fotos" tab:**
- Add **"Gestionar Referencias"** toggle button (top-right of tab)
- When active: each photo shows a circular checkbox overlay
- Selection counter: "X / 20 seleccionadas como referencia" (pink badge)
- Max 20 enforced: selecting 21st deselects oldest
- **"Guardar Referencias"** button persists to store + Supabase
- Photos already in `referencePhotoUrls` show pre-checked when mode opens

**Director integration:**
- When a character is selected in ContentStudio, auto-populate "Referencias de Rostro" with `character.referencePhotoUrls.slice(0, MODEL_MAX)`
- `MODEL_MAX` per engine: Seedream=5, Grok=3, PuLID=5, Gemini=10, Flux=1

---

### A3 · Engine selector dropdown (🔧) — Portal fix

**Problem:** The engine dropdown in AIEditor doesn't allow selecting options. Likely caused by a parent container with `overflow: hidden` creating a clipping stacking context that intercepts clicks even though the dropdown declares `z-50`.

**Fix:** Render the dropdown via `ReactDOM.createPortal(dropdown, document.body)` so it escapes any overflow-clipping parent. Position it absolutely using `getBoundingClientRect()` of the trigger button.

**Applies to:** All tool tabs in AIEditor that show the 🔧 engine selector.

**Scope:** `pages/AIEditor.tsx` — `showEngineModal` dropdown block only.

---

### A4 · Seedream v5 Lite — Safety checker off

**Problem:** Seedream calls in `services/toolEngines.ts` do not pass `enable_safety_checker: false`, which may cause rejections on fashion/skin content.

**Fix:** Add to every `fal.subscribe('fal-ai/bytedance/seedream/v5/lite/edit', ...)` input:
```typescript
enable_safety_checker: false,
```

**Files:** `services/toolEngines.ts` — `seedreamEdit()` function.

---

## Team B — Director Pipeline Overhaul

### B1 · Foundation (blocks B2 and B3)

#### B1a — Fix character reference passing

**Problem:** `getCharacterFiles()` in ContentStudio reads `char.modelImageBlobs` (Blob array), which is empty for AI-generated characters stored as URLs. The generation runs without any character identity.

**Fix:**
1. Add `getCharacterReferenceUrls()` helper: returns `character.referencePhotoUrls` if populated, otherwise falls back to last N gallery URLs where `galleryItem.characterId === char.id` (max 5)
2. Pass these URLs directly to the generation service instead of converting Blobs to Files
3. Each engine receives references in its native format:
   - Seedream/Grok: `image_urls: referenceUrls`
   - PuLID: `face_image_url: referenceUrls[0]`
   - Gemini: fetch URL → base64 inline
   - Flux Kontext: `image_url: referenceUrls[0]`
   - Flux Pro: `image_url: referenceUrls[0]` (via IP-Adapter if supported, else prompt only)

#### B1b — Prompt compiler for Director

**Problem:** Director uses flat string concatenation with no per-model optimization. Same prompt sent to Seedream, Grok, Gemini, etc.

**Fix:** Wire `compilePrompt()` (already in `services/toolEngines.ts`) into the Director generation path.

```typescript
const compiled = await compilePrompt({
  subjectIntent: rawPrompt,     // assembled from outfit + pose + scene + lighting + camera
  targetModel: selectedEngine,
  isEdit: false,                // this is generation, not edit
});
```

Call this before dispatching to any engine.

#### B1c — Object injection field

**New field in ContentStudio UI:** Below the Escenario section, add:

```
PROPS / OBJETOS (opcional)
[ ej: holding an iPhone, carrying a coffee cup, wearing sunglasses ]
```

This value is appended to the compiled prompt as: `holding/with [object]`.

#### B1d — Filter Director engine list

Remove from Director's engine selector all models that cannot accept image references.

**Allowed engines in Director:**
| Engine ID | Model | Image ref support |
|-----------|-------|------------------|
| `seedream` | fal-ai/bytedance/seedream/v5/lite | multi-ref `image_urls[]` |
| `grok` | xai/grok-imagine-image | `image_urls[]` |
| `pulid` | fal-ai/pulid/v2 | `face_image_url` |
| `gemini` | gemini-2.0-flash | inline base64 |
| `flux-kontext` | fal-ai/flux-pro/kontext | `image_url` |
| `flux-pro` | fal-ai/flux-pro | `image_url` |

Add `pulid`, `flux-kontext`, `flux-pro` to `EngineId` type and `TOOL_ENGINE_DEFAULTS`.

---

### B2 · Pose via ControlNet

**Design:**

**New UI element in ContentStudio — POSE section:**
- Existing pose presets + text field remain
- Add optional **"Subir referencia de pose"** upload button (image)
- When image is uploaded: show thumbnail + "Usando como referencia de pose"

**Pipeline when pose reference is uploaded:**
1. Upload pose image to fal.ai ControlNet: `fal-ai/controlnet-union-sdxl` or `fal-ai/controlnet`
2. Pass: `{ control_image_url: poseRefUrl, control_type: 'openpose', prompt: compiled, ... }`
3. Use the ControlNet output as a structural guide — then run through the main engine for final quality pass
4. If no pose image: skip this stage entirely, pose travels in the compiled prompt only

**Credit cost:** +5cr when pose reference is used (ControlNet adds a call)

---

### B3 · Outfit Try-On Mode

**Design:**

**New UI element in ContentStudio — OUTFIT section:**
- Existing text description field remains
- Add toggle: **"Descripción"** / **"Subir imagen de ropa"**
- When image mode: file upload for garment image + thumbnail preview

**Pipeline when outfit image is uploaded:**
- After main generation (Stage 2), run the result through:
  `fal-ai/cat-vton` or `fal-ai/idm-vton` (virtual try-on)
  - Input: `{ human_image_url: stage2result, garment_image_url: outfitUrl }`
  - This replaces the outfit completely, ignoring whatever the character was wearing
- If no outfit image: outfit description travels in compiled prompt only

**Important:** Try-On stage runs AFTER main generation — it receives the character photo as input.

**Credit cost:** +10cr when outfit image is used (Try-On adds a call)

---

### B-Review · Integration & Testing

After B1 + B2 + B3 complete:

1. Run full pipeline: select character with `referencePhotoUrls` → set pose text + pose ref image → set outfit text + outfit image → add object → generate
2. Verify: compiled prompt includes all fields, character identity preserved, pose conditioned, outfit applied
3. Verify credits deducted correctly (base + ControlNet stage + Try-On stage)
4. Verify fallback: if ControlNet fails → generation continues without pose conditioning
5. Verify fallback: if Try-On fails → return main gen result with error toast

---

## Files Modified

### Team A
- `pages/ContentStudio.tsx` — A1 (characterId in save), A2 (auto-populate refs)
- `pages/CharacterGallery.tsx` — A2 (reference selector UI)
- `stores/characterStore.ts` — A2 (referencePhotoUrls field)
- `types.ts` — A2 (SavedCharacter.referencePhotoUrls)
- `pages/AIEditor.tsx` — A3 (Portal dropdown)
- `services/toolEngines.ts` — A4 (safety checker)

### Team B
- `pages/ContentStudio.tsx` — B1 (refs, compiler, object field, engine filter), B2 (pose UI), B3 (outfit UI)
- `services/aiGateway.ts` — B1 (route to per-engine ref format)
- `services/toolEngines.ts` — B1 (add pulid/flux-kontext/flux-pro engines)
- `types.ts` — B1 (EngineId union, new engine types)
- `services/controlNetService.ts` — B2 (new file, ControlNet wrapper)
- `services/tryOnService.ts` — B3 (new file, virtual try-on wrapper)

---

## Non-Goals (deferred)

- Backfilling existing 128 gallery items with character links
- LoRA training integration
- Video pipeline changes
- Storyboard integration
