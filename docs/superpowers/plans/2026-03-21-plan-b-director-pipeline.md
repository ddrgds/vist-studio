# Plan B — Director Pipeline Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Director pipeline so that (1) AI-generated character references actually travel to the model, (2) prompts are compiled per-engine, (3) users can inject a prop/object, (4) the engine list is limited to models that accept image references, (5) pose refs route through ControlNet, and (6) outfit images route through virtual try-on.

**Architecture:** All changes live in `pages/Director.tsx`, `types.ts`, and two new service files (`controlNetService.ts`, `tryOnService.ts`). The Director already has `poseRef`/`outfitRef` states — B2/B3 wire them to new pipeline stages. B1 fixes the silent failure where `modelImageBlobs` is always empty for AI-generated characters.

**Tech Stack:** React 18, TypeScript, fal.ai SDK, Zustand, `compilePrompt()` from promptCompiler

---

## File Map

| File | Changes |
|------|---------|
| `pages/Director.tsx` | B1a: replace modelImageBlobs with referenceUrls helper; B1b: compilePrompt integration; B1c: object injection field UI; B2: ControlNet pre-pass; B3: Try-On post-pass |
| `types.ts` | B1d: update FEATURE_ENGINES['director'].keys; add PuLID + Flux-Pro to ENGINE_METADATA |
| `services/controlNetService.ts` | B2: new file, ControlNet wrapper |
| `services/tryOnService.ts` | B3: new file, virtual try-on wrapper |

---

## Task B1a — Fix Character Reference Passing

**Root cause:** `buildParams()` at Director.tsx:287 reads `selectedChar.modelImageBlobs` — which is always an empty array for AI-generated characters because those are stored as URLs, not Blobs. The generation runs with zero character identity.

**Fix:** Add `getCharacterReferenceUrls()` that returns URLs from `referencePhotoUrls` (set by Plan A / Task A2) or falls back to the last 5 gallery items belonging to the character. Then fetch those URLs as Files in `handleGenerate()` before calling `buildParams()`.

**Files:**
- Modify: `pages/Director.tsx:176-330`

- [ ] **Step 1: Import galleryStore and compilePrompt in Director**

At the top of `pages/Director.tsx`, add these imports (after the existing imports):

```typescript
import { useGalleryStore } from '../stores/galleryStore'
import { compilePrompt } from '../services/promptCompiler'
```

- [ ] **Step 2: Add galleryStore access inside the component**

In the `Director` component function (around line 135, after `const characters = useCharacterStore(s => s.characters)`), add:

```typescript
const galleryItems = useGalleryStore(s => s.items)
```

- [ ] **Step 3: Add `getCharacterReferenceUrls()` helper inside the component**

Place this right after the `galleryItems` declaration (before the `selectedChar` const):

```typescript
/** Returns up to 5 URLs to use as face references for a character.
 * Priority: character.referencePhotoUrls → last 5 gallery items for this character. */
const getCharacterReferenceUrls = (char: typeof selectedChar): string[] => {
  if (!char) return []
  if (char.referencePhotoUrls?.length) {
    return char.referencePhotoUrls.slice(0, 5)
  }
  // Fallback: last 5 gallery items that belong to this character
  const charItems = galleryItems
    .filter(item => item.characterId === char.id && item.url?.startsWith('http'))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
  return charItems.map(item => item.url)
}
```

- [ ] **Step 4: Add `fetchUrlsAsFiles()` helper (outside component, module-level)**

Add this utility function near the top of `Director.tsx` (before the component, after imports):

```typescript
/** Fetches image URLs and converts them to File objects for APIs that require File input. */
async function fetchUrlsAsFiles(urls: string[]): Promise<File[]> {
  const results: File[] = []
  await Promise.allSettled(
    urls.map(async (url, i) => {
      try {
        const response = await fetch(url)
        const blob = await response.blob()
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        results.push(new File([blob], `ref-${i}.${ext}`, { type: blob.type }))
      } catch (e) {
        console.warn(`Could not fetch reference URL ${i}:`, e)
      }
    })
  )
  return results
}
```

- [ ] **Step 5: Modify `buildParams()` to accept pre-fetched files**

Change `buildParams()` signature to accept `charRefFiles`:

```typescript
const buildParams = (charRefFiles: File[] = []): InfluencerParams => {
  // ... existing code ...

  // Replace lines 286-291 (the modelImageBlobs block) with:
  const modelImages: File[] = [...charRefFiles]
  faceRefs.forEach(f => modelImages.push(f.file))

  // ... rest of buildParams unchanged ...
}
```

The old block to REPLACE (lines 286-292):
```typescript
const modelImages: File[] = []
if (selectedChar && selectedChar.modelImageBlobs.length > 0) {
  selectedChar.modelImageBlobs.forEach((blob, i) => {
    modelImages.push(new File([blob], `face-ref-${i}.jpg`, { type: 'image/jpeg' }))
  })
}
faceRefs.forEach(f => modelImages.push(f.file))
```

The NEW block:
```typescript
// charRefFiles are pre-fetched in handleGenerate (AI chars store URLs, not Blobs)
const modelImages: File[] = [...charRefFiles]
faceRefs.forEach(f => modelImages.push(f.file))
```

- [ ] **Step 6: Modify `handleGenerate()` to pre-fetch ref URLs**

At the beginning of `handleGenerate()` (after the `hasIdentity` check passes and before `buildParams()` is called), add:

```typescript
// Pre-fetch character reference URLs as Files
const refUrls = getCharacterReferenceUrls(selectedChar)
const charRefFiles = refUrls.length > 0 ? await fetchUrlsAsFiles(refUrls) : []

// Update buildParams call:
const params = buildParams(charRefFiles)
```

Find the existing `const params = buildParams()` call (around line 350) and replace with the above.

- [ ] **Step 7: Manual test**

1. Create a character using the AI generator (it will have a gallery URL, not modelImageBlobs)
2. Go to Director, select that character, set a scene, click Generar
3. Verify the generated image contains the character's face
4. Check network tab — should see URL fetch requests for the reference images

- [ ] **Step 8: Commit**

```bash
git add pages/Director.tsx
git commit -m "fix(B1a): usar referencePhotoUrls/gallery como refs del personaje en Director"
```

---

## Task B1b — Wire Prompt Compiler into Director

**Problem:** Director sends a flat string prompt to every engine. No per-model optimization. The `compilePrompt()` service (already used in toolEngines.ts) is not called.

**Fix:** After assembling the raw prompt parts in `handleGenerate()`, call `compilePrompt()` with the full intent + pose/lighting details. Apply the compiled result as the scenario for generation.

**Files:**
- Modify: `pages/Director.tsx` — `handleGenerate()` function

- [ ] **Step 1: Determine the target model string**

In `handleGenerate()`, before the `buildParams()` call, add logic to get the fal.ai model ID for compilation:

```typescript
/** Map our engine keys to model IDs used by compilePrompt */
const engineToModelId: Record<string, string> = {
  'fal:seedream50': 'fal-ai/bytedance/seedream/v5/lite',
  'replicate:grok': 'xai/grok-imagine-image',
  'fal:kontext-multi': 'fal-ai/flux-pro/kontext/multi',
  'fal:pulid': 'fal-ai/pulid/v2',
  'gemini:nb2': 'gemini-2.0-flash-exp',
  'fal:flux-pro': 'fal-ai/flux-pro',
}
const targetModelId = engineToModelId[selectedEngine] || 'fal-ai/bytedance/seedream/v5/lite'
```

- [ ] **Step 2: Assemble the raw prompt and compile it**

In `handleGenerate()`, after `const params = buildParams(charRefFiles)`, add:

```typescript
// Compile the scenario prompt through Flash Lite
const poseValue = buildParams(charRefFiles).characters[0].pose || ''
const lightingValue = buildParams(charRefFiles).lighting || ''
const cameraValue = buildParams(charRefFiles).camera || ''

const rawIntent = [
  params.scenario,
  outfitDescription && `Outfit: ${outfitDescription}`,
  objectText.trim() && `Holding/with: ${objectText.trim()}`,
].filter(Boolean).join('. ')

const poseLighting = [poseValue, cameraValue, lightingValue].filter(Boolean).join(', ')

const compiledScenario = await compilePrompt({
  subjectIntent: rawIntent,
  poseLighting: poseLighting || undefined,
  targetModel: targetModelId,
  isEdit: false,
  isRealistic: true,
}).catch(() => rawIntent) // fallback to raw if compiler fails

// Overwrite the scenario in params with the compiled version
params.scenario = compiledScenario
```

Note: avoid calling `buildParams()` three times — replace with one call and read values from the result. Use the snippet above as a guide and adapt to the actual variable layout.

- [ ] **Step 3: Add `objectText` state**

This is needed before it can be used in Step 2. Add near the other Director state declarations (around line 200, after `outfitDescription` state):

```typescript
const [objectText, setObjectText] = useState('')
```

- [ ] **Step 4: Verify compilePrompt is imported**

Confirm the import added in Task B1a Step 1 is in place:

```typescript
import { compilePrompt } from '../services/promptCompiler'
```

- [ ] **Step 5: Commit**

```bash
git add pages/Director.tsx
git commit -m "feat(B1b): integrar compilePrompt() en Director — prompts optimizados por motor"
```

---

## Task B1c — Object Injection Field

**Goal:** Add a "PROPS / OBJETOS" text input in the Director Escenario section so users can specify what the character is holding/carrying.

**Files:**
- Modify: `pages/Director.tsx` — Escenario accordion section

- [ ] **Step 1: Add `objectText` state (if not already done in B1b)**

```typescript
const [objectText, setObjectText] = useState('')
```

- [ ] **Step 2: Add the input in the Escenario accordion**

In the Escenario `AccordionSection` (around line 756), after the `scenario` textarea and its enhance button block, add:

```tsx
{/* Object / Prop injection */}
<div>
  <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--joi-text-2)' }}>
    Props / Objetos
    <span className="text-[9px] ml-1.5 font-mono" style={{ color: 'var(--joi-text-3)', opacity: 0.6 }}>opcional</span>
  </div>
  <input
    type="text"
    placeholder="ej: sosteniendo un iPhone, con una taza de café..."
    className="w-full px-3.5 py-2.5 rounded-xl text-[12px] border outline-none transition-colors"
    style={joiInputStyle(!!objectText)}
    value={objectText}
    onChange={e => setObjectText(e.target.value)}
  />
</div>
```

- [ ] **Step 3: Verify the value is used in the compiled prompt**

Confirm Task B1b Step 2 already includes:
```typescript
objectText.trim() && `Holding/with: ${objectText.trim()}`,
```

- [ ] **Step 4: Manual test**

1. Open Director → expand Escenario section
2. Fill in scenario + object text
3. Generate — verify the compiled prompt includes the object context
4. Check console for the compiled prompt value (add a `console.log('compiled:', compiledScenario)` temporarily)

- [ ] **Step 5: Commit**

```bash
git add pages/Director.tsx
git commit -m "feat(B1c): campo de props/objetos en Director — inyección al prompt compilado"
```

---

## Task B1d — Filter Director Engine List

**Goal:** Remove engines that can't accept image references from the Director selector. Add PuLID v2 and Flux Pro as new entries.

**Allowed engines:**
| Key | Model | Notes |
|-----|-------|-------|
| `gemini:nb2` | Gemini Flash 2 | Already exists |
| `replicate:grok` | Grok Imagine | Already exists |
| `fal:seedream50` | Seedream v5 Lite | Already exists |
| `fal:kontext-multi` | Flux Kontext Multi | Already exists |
| `fal:pulid` | PuLID v2 | NEW |
| `fal:flux-pro` | Flux Pro | NEW |

**Files:**
- Modify: `types.ts` — `ENGINE_METADATA` and `FEATURE_ENGINES`

- [ ] **Step 1: Add PuLID v2 to ENGINE_METADATA**

In `types.ts`, find the ENGINE_METADATA array (after the existing FAL entries around line 633) and add:

```typescript
{
  key: 'fal:pulid',
  userFriendlyName: 'PuLID v2',
  description: 'Face-locked photo-realistic ID',
  bestFor: 'Maximum face consistency, photorealistic identity',
  tags: ['face', 'quality', 'photorealism'],
  requiresFaceRef: true,
  estimatedTime: '~20s',
  creditCost: 12,
  provider: AIProvider.Fal,
  falModel: FalModel.PulidV2,  // add this enum value (Step 2)
},
```

- [ ] **Step 2: Add `PulidV2` and `FluxPro` to `FalModel` enum**

In `types.ts`, find the `FalModel` enum and add:

```typescript
PulidV2 = 'fal-ai/pulid/v2',
FluxPro = 'fal-ai/flux-pro',
```

- [ ] **Step 3: Add Flux Pro to ENGINE_METADATA**

```typescript
{
  key: 'fal:flux-pro',
  userFriendlyName: 'FLUX Pro',
  description: 'State-of-the-art image generation',
  bestFor: 'High-fidelity reference-guided generation',
  tags: ['quality', 'photorealism'],
  requiresFaceRef: true,
  estimatedTime: '~15s',
  creditCost: 10,
  provider: AIProvider.Fal,
  falModel: FalModel.FluxPro,
},
```

- [ ] **Step 4: Update FEATURE_ENGINES['director']**

In `types.ts`, replace the current director keys:

```typescript
'director': {
  default: 'gemini:nb2',
  keys: ['gemini:nb2', 'replicate:grok', 'fal:seedream50', 'fal:kontext-multi', 'fal:pulid', 'fal:flux-pro'],
},
```

(Removes: `gemini:pro`, `gemini:imagen4`, `openai:gpt15`, `openai:gpt-mini`, `fal:seedream45`, `fal:zimage-turbo`, `higgsfield:soul`)

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Fix any type errors (usually `FalModel.PulidV2` not recognized in `generateWithFal` switch).

In `services/falService.ts`, find the switch that routes `FalModel` values and add cases:

```typescript
case FalModel.PulidV2:
  // PuLID: uses face_image_url from first reference
  return runPuLID(params, progressCb, signal)

case FalModel.FluxPro:
  // Flux Pro: uses image_url from first reference
  return runFluxPro(params, progressCb, signal)
```

You will need to add `runPuLID()` and `runFluxPro()` stubs to `falService.ts`:

```typescript
async function runPuLID(params: InfluencerParams, progressCb?: ProgressCallback, signal?: AbortSignal): Promise<string[]> {
  const faceRefs = params.characters[0]?.modelImages || []
  const faceUrl = faceRefs.length > 0 ? await uploadToFalStorage(faceRefs[0]) : undefined
  const result = await fal.subscribe('fal-ai/pulid/v2', {
    input: {
      face_image_url: faceUrl,
      prompt: params.scenario || 'professional photo',
      num_images: params.numberOfImages || 1,
    },
    timeout: 120000,
  }) as any
  const data = result?.data ?? result ?? {}
  return (data.images || []).map((img: any) => img.url || img)
}

async function runFluxPro(params: InfluencerParams, progressCb?: ProgressCallback, signal?: AbortSignal): Promise<string[]> {
  const faceRefs = params.characters[0]?.modelImages || []
  const refUrl = faceRefs.length > 0 ? await uploadToFalStorage(faceRefs[0]) : undefined
  const result = await fal.subscribe('fal-ai/flux-pro', {
    input: {
      image_url: refUrl,
      prompt: params.scenario || 'professional photo',
      num_images: params.numberOfImages || 1,
    },
    timeout: 120000,
  }) as any
  const data = result?.data ?? result ?? {}
  return (data.images || []).map((img: any) => img.url || img)
}
```

- [ ] **Step 6: Manual test**

1. Open Director — verify engine selector shows only: Auto, Nano Banana 2, Grok Imagine, Seedream 5.0, FLUX Kontext, PuLID v2, FLUX Pro
2. Select PuLID v2 — verify it appears selected
3. Select Grok Imagine — verify it appears selected

- [ ] **Step 7: Commit**

```bash
git add types.ts services/falService.ts
git commit -m "feat(B1d): filtrar motores Director — solo motores con soporte de referencia de imagen"
```

---

## Task B2 — ControlNet for Pose Reference

**Goal:** When a user uploads a pose reference image, run it through ControlNet (openpose) before the main generation. The ControlNet output provides structural conditioning.

**Pipeline:** poseRef uploaded → upload to fal.storage → run ControlNet → use result as structural guide alongside main prompt.

**Credit cost:** +5cr when pose ref is used.

**Files:**
- Create: `services/controlNetService.ts`
- Modify: `pages/Director.tsx` — `handleGenerate()`

- [ ] **Step 1: Create `services/controlNetService.ts`**

```typescript
// services/controlNetService.ts
// ControlNet wrapper — extracts pose skeleton from a reference image
// for use as structural conditioning in Director generation.

import { fal } from '@fal-ai/client'

fal.config({ proxyUrl: '/fal-api' })

const unwrap = (result: any): any => result?.data ?? result ?? {}

/**
 * Runs ControlNet (openpose) on a reference image.
 * Returns a URL to the conditioned output that can be used as a structural guide.
 */
export async function runControlNet(poseImageUrl: string, prompt: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/controlnet-union-sdxl', {
    input: {
      image_url: poseImageUrl,
      prompt,
      control_type: 'openpose',
      controlnet_conditioning_scale: 0.8,
      num_inference_steps: 25,
      guidance_scale: 7.5,
      num_images: 1,
    },
    timeout: 90000,
  }) as any

  const data = unwrap(result)
  const url = data.images?.[0]?.url || data.image?.url

  if (!url) throw new Error('ControlNet returned no image')
  return url
}
```

- [ ] **Step 2: Import controlNetService in Director**

In `pages/Director.tsx`, add to the imports:

```typescript
import { runControlNet } from '../services/controlNetService'
```

- [ ] **Step 3: Add ControlNet to handleGenerate pipeline**

In `handleGenerate()`, after the credit deduction and before the `buildParams(charRefFiles)` call, add the ControlNet stage:

```typescript
// ── Stage 0: ControlNet pose conditioning (optional) ──
let controlNetImageUrl: string | undefined
if (poseRef) {
  const poseCost = 5
  const okPose = await decrementCredits(poseCost)
  if (!okPose) {
    toast.error('Créditos insuficientes para la referencia de pose (+5cr)')
    restoreCredits(totalCost)
    return
  }
  toast.info('Procesando referencia de pose...')
  try {
    // Upload pose image to fal.storage
    const poseUploadUrl = await fal.storage.upload(poseRef.file)
    controlNetImageUrl = await runControlNet(poseUploadUrl, rawIntent || scenario)
  } catch (e) {
    // Non-fatal: log and continue without ControlNet conditioning
    console.warn('ControlNet failed, continuing without pose conditioning:', e)
    toast.warning('Referencia de pose no disponible, generando sin conditioning')
    restoreCredits(poseCost)
  }
}
```

Note: `fal` must be imported directly in Director for storage upload. Add to imports:
```typescript
import { fal } from '@fal-ai/client'
```

- [ ] **Step 4: Pass controlNetImageUrl to generation params**

After the ControlNet stage (Step 3), when building params, pass the controlNet result as the scenario image:

```typescript
const params = buildParams(charRefFiles)
if (controlNetImageUrl) {
  // Use ControlNet output as structural conditioning via scenarioImage
  // This is a hint to the generation model about the desired pose structure
  params.scenario = `${params.scenario} [POSE_CONDITIONING_IMAGE: ${controlNetImageUrl}]`
  // Alternatively if the service supports it natively:
  // params.scenarioImage = [await urlToFile(controlNetImageUrl)]
}
```

Note: For Gemini NB2, the simplest integration is to pass the ControlNet URL inline in the prompt or as a scenarioImage file. Check how `generateInfluencerImage` uses `scenarioImage` in `geminiService.ts` and adapt accordingly.

- [ ] **Step 5: Show "+5cr" badge in the UI when pose ref is active**

In the Pose section of Director (around line 698), after the `ImageSlot`, add a credit badge when poseRef is set:

```tsx
{poseRef && (
  <div className="flex items-center gap-1 mt-1">
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md"
      style={{ background: 'rgba(255,107,157,.08)', color: 'var(--joi-pink)', border: '1px solid rgba(255,107,157,.12)' }}>
      +5cr · ControlNet
    </span>
    <span className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>conditioning de pose</span>
  </div>
)}
```

- [ ] **Step 6: Manual test**

1. Open Director → Pose section → upload a pose reference image (a silhouette or model photo)
2. Verify "+5cr · ControlNet" badge appears
3. Click Generar — check toast shows "Procesando referencia de pose..."
4. Verify total credits deducted = base + 5
5. Verify the generated image respects the pose from the reference
6. Test fallback: disconnect network, upload pose ref → verify generation continues and shows warning toast

- [ ] **Step 7: Commit**

```bash
git add services/controlNetService.ts pages/Director.tsx
git commit -m "feat(B2): ControlNet para referencia de pose en Director — +5cr"
```

---

## Task B3 — Virtual Try-On for Outfit Image

**Goal:** When a user uploads an outfit reference image, run the generated result through virtual try-on (CAT-VTON) as a post-processing step.

**Pipeline:** main generation complete → if outfitRef uploaded → run try-on with `human_image_url=generatedUrl, garment_image_url=outfitRefUrl` → replace result with try-on output.

**Credit cost:** +10cr when outfit image is used.

**Files:**
- Create: `services/tryOnService.ts`
- Modify: `pages/Director.tsx` — `handleGenerate()`

- [ ] **Step 1: Create `services/tryOnService.ts`**

```typescript
// services/tryOnService.ts
// Virtual try-on wrapper — applies a garment image onto a generated character photo.
// Runs AFTER main generation as a post-processing step.

import { fal } from '@fal-ai/client'

fal.config({ proxyUrl: '/fal-api' })

const unwrap = (result: any): any => result?.data ?? result ?? {}

/**
 * Applies a garment onto a person photo using CAT-VTON.
 * @param humanImageUrl - URL of the generated character photo
 * @param garmentImageUrl - URL of the uploaded outfit reference
 * @returns URL of the try-on result
 */
export async function runTryOn(humanImageUrl: string, garmentImageUrl: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/cat-vton', {
    input: {
      human_image_url: humanImageUrl,
      garment_image_url: garmentImageUrl,
      cloth_type: 'overall',  // applies full outfit
      num_inference_steps: 30,
    },
    timeout: 120000,
  }) as any

  const data = unwrap(result)
  const url = data.images?.[0]?.url || data.image?.url || data.result_url

  if (!url) throw new Error('Try-on returned no image')
  return url
}
```

- [ ] **Step 2: Import tryOnService in Director**

```typescript
import { runTryOn } from '../services/tryOnService'
```

- [ ] **Step 3: Add Try-On credit deduction in handleGenerate**

In `handleGenerate()`, update the total cost calculation at the top to include try-on if outfitRef is present:

```typescript
const tryOnCost = outfitRef ? 10 : 0
const totalCost = (numberOfImages * costPerShot) + tryOnCost
```

- [ ] **Step 4: Add Try-On stage after main generation**

In `handleGenerate()`, after `setGeneratedImages(results)` and before `toast.success(...)`, add:

```typescript
// ── Stage 3: Virtual Try-On (if outfit image provided) ──
let finalResults = results
if (outfitRef && results.length > 0) {
  toast.info('Aplicando outfit (virtual try-on)...')
  try {
    const garmentUrl = await fal.storage.upload(outfitRef.file)
    const tryOnResults = await Promise.allSettled(
      results.map(url => runTryOn(url, garmentUrl))
    )
    finalResults = tryOnResults.map((r, i) =>
      r.status === 'fulfilled' ? r.value : results[i]  // fallback to original on failure
    )
    if (tryOnResults.some(r => r.status === 'rejected')) {
      toast.warning('Algunos try-ons fallaron — usando resultado de generación original')
    }
  } catch (e) {
    console.error('Try-on failed:', e)
    toast.error('Error en try-on — usando resultado de generación')
    // Restore try-on credits, keep base generation
    restoreCredits(tryOnCost)
  }
}

setGeneratedImages(finalResults)
setSelectedResult(0)
```

Also update the existing `setGeneratedImages(results)` call — it should now happen after try-on. Remove the existing `setGeneratedImages(results)` line and replace with the above block.

- [ ] **Step 5: Show "+10cr · Try-On" badge in Outfit section**

In the Outfit `AccordionSection` (around line 660), after the `ImageSlot`, add:

```tsx
{outfitRef && (
  <div className="flex items-center gap-1 mt-1">
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md"
      style={{ background: 'rgba(255,107,157,.08)', color: 'var(--joi-pink)', border: '1px solid rgba(255,107,157,.12)' }}>
      +10cr · Try-On
    </span>
    <span className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>virtual try-on activo</span>
  </div>
)}
```

- [ ] **Step 6: Manual test**

1. Open Director → Outfit section → upload a garment/outfit image (isolated clothing item)
2. Verify "+10cr · Try-On" badge appears
3. Click Generar — after generation, check toast "Aplicando outfit (virtual try-on)..."
4. Verify the final result wears the garment from the uploaded image
5. Verify total credits = base cost + 10
6. Test fallback: provide an invalid garment URL → verify toast "Error en try-on" and base generation result is returned

- [ ] **Step 7: Commit**

```bash
git add services/tryOnService.ts pages/Director.tsx
git commit -m "feat(B3): virtual try-on para outfit image en Director — +10cr"
```

---

## Task B-Review — Integration & End-to-End Test

**Goal:** Verify the complete pipeline works end-to-end with all B1/B2/B3 changes active.

**Files:** No code changes — test only.

- [ ] **Step 1: Full pipeline test (happy path)**

Scenario to test:
1. Create/select a character that has `referencePhotoUrls` set (from Task A2)
2. In Director:
   - Select the character
   - Upload a pose reference image (Pose section)
   - Upload an outfit image (Outfit section)
   - Write a scenario: "on a rooftop in Tokyo at sunset"
   - Add an object: "holding a coffee cup"
   - Select engine: Seedream 5.0
   - Click Generar

Expected behavior:
- Credit deduction = costPerShot + 5 (ControlNet) + 10 (Try-On) = ~23cr
- Toast sequence: "Procesando referencia de pose..." → generation runs → "Aplicando outfit..."
- Final image: character has correct face (from refs), the pose matches reference structure, wears uploaded outfit, scene is Tokyo rooftop sunset, holding coffee
- Image saved to gallery with correct characterId

- [ ] **Step 2: Verify compiled prompt**

Add temporary `console.log('compiled:', compiledScenario)` in handleGenerate. Confirm:
- Prompt is in English
- Contains scene, outfit reference note, and "holding a coffee cup" / object injection
- Remove the console.log after verification

- [ ] **Step 3: Test credit fallbacks**

- Test with insufficient credits: verify error shown and no generation starts
- Test ControlNet failure: mock a 500 from ControlNet endpoint → generation should continue, warning toast shown
- Test Try-On failure: mock a 500 from CAT-VTON → returns base generation result, error toast shown

- [ ] **Step 4: Test engine filter**

Verify Director engine selector only shows 6 engines (Auto + 5 manual). Check that Gemini Pro, Imagen4, GPT Image, Soul, Z-Image are NOT in the list.

- [ ] **Step 5: Test fallback character ref**

1. Select a character that has NO `referencePhotoUrls` but HAS gallery items
2. Generate — verify character face appears in result (fallback to gallery items worked)
3. Select a character with NO `referencePhotoUrls` and NO gallery items
4. Generate — verify generation still runs (no crash), just without face refs

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
```

Zero TypeScript errors required.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat(B-review): pipeline Director completo — refs, compiler, props, ControlNet, Try-On"
```

---

## Final Verification Checklist

- [ ] Character face references travel from AI-generated characters to the model
- [ ] Prompts are compiled per-engine (log shows English, model-optimized output)
- [ ] Object/prop injection field appears in Escenario section and affects compiled prompt
- [ ] Director engine selector shows exactly 6 engines
- [ ] PuLID v2 and Flux Pro appear in the engine selector
- [ ] Pose reference triggers ControlNet (+5cr badge shows)
- [ ] Outfit image triggers virtual try-on after generation (+10cr badge shows)
- [ ] Credit fallbacks work (ControlNet failure = continue; Try-On failure = use base result)
- [ ] `npx tsc --noEmit` passes
