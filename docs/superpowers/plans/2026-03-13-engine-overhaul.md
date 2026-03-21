# Engine Overhaul — Per-Feature Model Selection

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add new AI models (Qwen Edit, FireRed, OneReward, Seedream 5 Edit, GPT Image Mini), set optimal defaults per feature, and show only relevant engines per functionality.

**Architecture:** Add new model enums + FAL service functions. Each feature (Director, Photo Session, AI Editor tools) gets its own filtered engine list with a smart default. The `resolveAutoEngine()` function is updated for Director context-aware selection.

**Tech Stack:** React + TypeScript, @fal-ai/client SDK, existing proxy at /fal-api

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `types.ts` | Model enums, costs, metadata | Modify — add 5 new models |
| `services/falService.ts` | FAL API call functions | Modify — add 4 new edit functions |
| `pages/PhotoSession.tsx` | Photo session UI | Modify — add Seedream 5 Edit option |
| `pages/AIEditor.tsx` | AI editing tools | Modify — per-tool engine selector with defaults |
| `pages/Director.tsx` | Director/creation page | Modify — filter creation-only engines, update Auto |

---

## Task 1: Add new models to types.ts

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Add new FalModel entries**

```typescript
// Add to FalModel enum:
QwenEdit = 'fal-ai/qwen-image-2/pro/edit',
FireRedEdit = 'fal-ai/firered-image-edit-v1.1',
OneReward = 'fal-ai/onereward',
Seedream5Edit = 'fal-ai/bytedance/seedream/v5/lite/edit',
```

- [ ] **Step 2: Add GPT Image Mini to OpenAIModel**

```typescript
GptImageMini = 'gpt-image-1-mini',
```

- [ ] **Step 3: Add credit costs**

```typescript
[FalModel.QwenEdit]: 12,
[FalModel.FireRedEdit]: 8,
[FalModel.OneReward]: 8,
[FalModel.Seedream5Edit]: 8,
[OpenAIModel.GptImageMini]: 5,
```

- [ ] **Step 4: Add FAL_MODEL_LABELS**

```typescript
[FalModel.QwenEdit]: { name: 'Qwen Image 2 Pro', description: 'Alibaba — spatial reasoning, style & light editing' },
[FalModel.FireRedEdit]: { name: 'FireRed v1.1', description: 'Portrait editing, try-on, makeup · 2026' },
[FalModel.OneReward]: { name: 'OneReward', description: 'Mask-based inpainting & outpainting · FLUX Fill' },
[FalModel.Seedream5Edit]: { name: 'Seedream 5 Edit', description: 'ByteDance — intelligent editing, low hallucination' },
```

- [ ] **Step 5: Add OpenAI label**

```typescript
[OpenAIModel.GptImageMini]: { name: 'GPT Image Mini', description: 'Ultra-fast, cheapest OpenAI generation' },
```

- [ ] **Step 6: Add ENGINE_METADATA entries for new models**

Add entries for: QwenEdit, FireRedEdit, OneReward, Seedream5Edit, GPT Image Mini.

- [ ] **Step 7: Update resolveAutoEngine()**

```typescript
// Updated logic:
// 1. Text/logo → GPT Image 1.5
// 2. Has face ref → Gemini NB2 (fast default with ref support)
// 3. No special needs → Gemini NB2
```

- [ ] **Step 8: Add per-feature engine mapping type**

```typescript
export type FeatureType =
  | 'director' | 'photo-session'
  | 'relight' | 'style-transfer' | 'bg-swap'
  | 'face-swap' | 'try-on' | 'inpaint'
  | 'enhance' | 'skin-enhancer';

export const FEATURE_ENGINE_DEFAULTS: Record<FeatureType, string> = {
  'director': 'gemini:nb2',
  'photo-session': 'grok',
  'relight': 'fal:qwen-edit',
  'style-transfer': 'fal:qwen-edit',
  'bg-swap': 'fal:flux-kontext',
  'face-swap': 'fal:face-swap',
  'try-on': 'fal:firered-edit',
  'inpaint': 'fal:onereward',
  'enhance': 'fal:aura-sr',
  'skin-enhancer': 'fal:firered-edit',
};

export const FEATURE_ENGINES: Record<FeatureType, string[]> = {
  'director': ['gemini:nb2','gemini:pro','gemini:imagen4','gemini:imagen4fast','openai:gpt15','openai:gpt-mini','fal:seedream50','fal:seedream45','replicate:grok','fal:kontext-multi','fal:kontext-max','ideogram:v3','fal:zimage-turbo'],
  'photo-session': ['grok','gemini','fal:seedream5-edit'],
  'relight': ['fal:qwen-edit','gemini','fal:flux-kontext'],
  'style-transfer': ['fal:qwen-edit','gemini','openai:gpt15'],
  'bg-swap': ['fal:flux-kontext','fal:qwen-edit','gemini'],
  'face-swap': ['fal:face-swap','fal:firered-edit'],
  'try-on': ['fal:firered-edit','replicate:idm-vton'],
  'inpaint': ['fal:onereward','fal:flux-inpaint','fal:zimage-inpaint'],
  'enhance': ['fal:aura-sr'],
  'skin-enhancer': ['fal:firered-edit','gemini'],
};
```

- [ ] **Step 9: Commit**

```bash
git add types.ts
git commit -m "feat: add new AI models + per-feature engine mapping"
```

---

## Task 2: Add FAL service functions for new models

**Files:**
- Modify: `services/falService.ts`

- [ ] **Step 1: Add editImageWithQwen()**

```typescript
export const editImageWithQwen = async (
  baseImage: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  // Upload to fal.storage
  // fal.subscribe('fal-ai/qwen-image-2/pro/edit', { input: { prompt, image_urls, guidance_scale: 4.5, num_inference_steps: 35 } })
  // Return data URLs
};
```

- [ ] **Step 2: Add editImageWithFireRed()**

```typescript
export const editImageWithFireRed = async (
  baseImage: File,
  prompt: string,
  referenceImages?: File[],
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  // Upload all images to fal.storage
  // fal.subscribe('fal-ai/firered-image-edit-v1.1', { input: { prompt, image_urls, guidance_scale: 4, num_inference_steps: 30 } })
  // Return data URLs
};
```

- [ ] **Step 3: Add inpaintWithOneReward()**

```typescript
export const inpaintWithOneReward = async (
  baseImage: File,
  maskImage: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  // Upload image + mask to fal.storage
  // fal.subscribe('fal-ai/onereward', { input: { prompt, image_url, mask_url, true_cfg: 4, num_inference_steps: 28 } })
  // Return data URLs
};
```

- [ ] **Step 4: Add editImageWithSeedream5()**

```typescript
export const editImageWithSeedream5 = async (
  baseImage: File,
  prompt: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  // Upload to fal.storage
  // fal.subscribe('fal-ai/bytedance/seedream/v5/lite/edit', { input: { prompt, image_urls } })
  // Return data URLs
};
```

- [ ] **Step 5: Commit**

```bash
git add services/falService.ts
git commit -m "feat: add Qwen Edit, FireRed, OneReward, Seedream 5 Edit service functions"
```

---

## Task 3: Update Photo Session engine selector

**Files:**
- Modify: `pages/PhotoSession.tsx`

- [ ] **Step 1: Add Seedream 5 Edit as third option**

Add to the engine list in the modal:
```typescript
{ key: 'seedream5-edit', label: 'Seedream 5 Edit', desc: 'ByteDance intelligent editing, low hallucination', icon: '🧠', cost: '8cr', time: '~12s' },
```

- [ ] **Step 2: Wire up Seedream 5 Edit to generation logic**

When `selectedEngine === 'seedream5-edit'`, call `editImageWithSeedream5()` with same pattern as Grok.

- [ ] **Step 3: Commit**

```bash
git add pages/PhotoSession.tsx
git commit -m "feat: add Seedream 5 Edit as Photo Session engine option"
```

---

## Task 4: Update AI Editor — per-tool engine selector

**Files:**
- Modify: `pages/AIEditor.tsx`

- [ ] **Step 1: Map each tool to its available engines and default**

Use FEATURE_ENGINE_DEFAULTS and FEATURE_ENGINES from types.ts. When user selects a tool (relight, style, bg, faceswap, tryon, inpaint, enhance, skin), show only the relevant engines.

- [ ] **Step 2: Wire new models to tool execution**

- Relight with Qwen → call `editImageWithQwen()`
- Try-On with FireRed → call `editImageWithFireRed()` with garment ref images
- Inpaint with OneReward → call `inpaintWithOneReward()` with mask
- Skin Enhancer with FireRed → call `editImageWithFireRed()` with beauty prompt

- [ ] **Step 3: Commit**

```bash
git add pages/AIEditor.tsx
git commit -m "feat: per-tool engine selector in AI Editor with new models"
```

---

## Task 5: Update Director — creation-only engines + Auto

**Files:**
- Modify: `pages/Director.tsx`

- [ ] **Step 1: Filter ENGINE_METADATA to creation-only models**

Exclude all edit-only models (QwenEdit, FireRedEdit, OneReward, Seedream5Edit) from Director's engine selector.

- [ ] **Step 2: Add GPT Image Mini to Director options**

- [ ] **Step 3: Update resolveAutoEngine() usage**

Ensure Director uses updated Auto logic:
- Text/logo → GPT Image 1.5
- Face refs → NB2
- Max quality → Imagen 4
- Draft → GPT Image Mini
- Default → NB2

- [ ] **Step 4: Commit**

```bash
git add pages/Director.tsx
git commit -m "feat: Director shows creation-only engines, updated Auto logic"
```

---

## Task 6: Build verification

- [ ] **Step 1: Run `npx vite build`** — must succeed with no errors
- [ ] **Step 2: Manual QA** — verify each page loads, engine selectors show correct options
- [ ] **Step 3: Final commit + push**

```bash
git push origin main
```
