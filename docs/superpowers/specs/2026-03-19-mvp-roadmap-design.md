# VIST Studio — MVP Roadmap Design Spec

## Vision

Platform where anyone without technical knowledge can create a virtual influencer and produce social-media-ready content (photos and videos) without leaving the app.

**Strategic objective:** "Plataforma para crear influencers virtuales que sea simple y no necesite de conocimiento tecnico ni herramientas fuera de esta."

**Two first-class flows:**

```
FLOW A: "From scratch"                  FLOW B: "Bring your own"
───────────────────────                  ────────────────────────
Create character (chips/prompt)          Upload photo or describe idea
    ↓                                        ↓
Approve variants                         Go direct to Content Studio
    ↓                                        ↓
Character sheet (face, body)             Generate content (photo/video)
    ↓                                        ↓
Content Studio                           Edit with AI tools
    ↓                                        ↓
Generate photos / videos                 Export for social media
    ↓
Edit with AI tools
    ↓
Export for social media
```

**Video scope (MVP):** 3 separate modes (Motion Control, Lip Sync, Image-to-Video). No timeline editor — that's post-MVP (see `docs/NEXT-STEPS.md`).

**Export scope (MVP):** Optimized download per format. Direct social posting is post-MVP.

---

## What Already Works (85%)

| Area | Status | Detail |
|------|--------|--------|
| Character creation | DONE | 6 render styles, chips, character sheet, variants, Soul 2.0 |
| Director (photo gen) | DONE | Scene/outfit/pose/camera/lighting, 9+ engines |
| Photo Session batch | DONE | 14 presets, tiers, pipeline, grid mode |
| 11 AI edit tools | DONE | Relight, face swap, scene, outfit, skin, style, angles, inpaint, enhance, try-on, AI edit |
| Basic editor (no AI) | DONE | Crop 4 ratios, filters, adjustments, undo/redo |
| Video (3 modes) | DONE | Motion control, lip sync, img2vid via Kling |
| Gallery | DONE | Filters, favorites, lightbox, zoom/pan |
| Export 7 formats | DONE | IG Post/Story, TikTok, YT, Twitter, Square, Original |
| Auth + Credits | DONE | Supabase auth, atomic credits, 4 plans |
| Background removal | DONE | From Gallery and AIEditor |

---

## What Needs Building (15%)

### 1. Cloudflare Workers Proxy

**Problem:** API keys exposed in frontend via Vite dev proxies.

**Solution:** Cloudflare Worker as API gateway.

```
Frontend                    Cloudflare Worker                AI Providers
────────                    ──────────────────               ────────────
POST /api/ai/generate  →    Validate Supabase auth token →   Gemini API
                            Verify credits available     →   FAL API
                            Inject API key               →   Replicate API
                            Forward request              →   OpenAI API
                      ←     Return response              ←   xAI API
```

**What changes:**
- API keys live as Cloudflare Worker secrets (not in frontend)
- Frontend sends requests to `/api/ai/*` with Supabase auth token
- Worker validates auth before forwarding
- Each service (`geminiService.ts`, `falService.ts`, etc.) changes URL base only

**What doesn't change:**
- Service logic stays the same
- Worker does transparent proxy — no response processing

**Technical details:**
- **CORS:** Worker returns `Access-Control-Allow-Origin` for the app domain (vist-studio.pages.dev + localhost dev)
- **FAL SDK proxy:** Must replicate `x-fal-target-url` header routing (see `vite.config.ts` lines 82-96). The FAL client SDK sends headers that the Worker must forward.
- **Storage uploads bypass Worker:** `fal.storage.upload()` goes direct to FAL storage — no API key needed, no Worker routing. Only inference calls go through Worker.
- **Long-running ops (LoRA, video):** FAL uses `fal.subscribe()` which polls via HTTP GET. Worker handles these polling requests same as POST — auth + forward.
- **Error handling:** Worker passes through provider errors as-is (status code + body). No retry. Frontend handles retries.
- **Rate limiting:** Per-user rate limit (100 req/min) enforced at Worker level via Cloudflare KV.

**Files:**
- **Create:** `workers/ai-proxy/` — Worker with provider routing, CORS, rate limiting
- **Modify:** Each service changes base URL from `/gemini-api/...` to `/api/ai/gemini/...`

---

### 2. New Model Integrations (9 models)

#### Generation engines (text-to-image)

| Model | Endpoint | Role | Replaces |
|-------|----------|------|----------|
| Imagen 4 Fast | `imagen-4.0-fast-generate-001` | Default cheap generation | — |
| Imagen 4 Standard | `imagen-4.0-generate-001` | Quality generation | — |
| Imagen 4 Ultra | `imagen-4.0-ultra-generate-001` | Max quality generation | — |
| Soul 2.0 | `higgsfield:soul` | Character creation (fashion-grade) | Already exists |
| FLUX 2 Pro | Replicate `black-forest-labs/flux-2-pro` | Alternative generation | — |
| FLUX 2 Klein 4B | Replicate `black-forest-labs/flux-2-klein-4b` | Draft/preview mode | — |

#### Editing engines (image-to-image)

| Model | Endpoint | Role | Replaces |
|-------|----------|------|----------|
| FLUX Kontext Pro | `fal-ai/flux-kontext-pro` | Tier Standard — identity lock | FLUX Kontext Multi (`fal-ai/flux-pro/kontext/multi`) |
| FLUX 2 Klein 9B Edit+LoRA | `fal-ai/flux-2/klein/9b/edit/lora` | Tier Premium — edit with LoRA | `generateWithLoRA()` |
| P-Image-Edit (Pruna) | Replicate `prunaai/p-image-edit` | Edit engine option (3rd choice) | — |
| Recraft Crisp Upscale | Replicate `recraft-ai/recraft-crisp-upscale` | Better upscaler | AuraSR |
| Bria Expand | Replicate `bria/expand-image` | Outpaint tool (new capability) | — |

#### Edit engine selection (3 options per tool)

Every editing tool (Relight, Scene, Outfit, Face Swap, etc.) offers 3 engine choices:

```
Engine: [Grok ▾]  [NB Pro]  [Pruna]
```

Default: Grok (proven). Fallback chain: Grok → NB Pro → Pruna.

**Fallback triggers:** HTTP 5xx, content policy rejection, or timeout (>30s). Failed attempts do NOT charge credits — credits are only deducted on successful result. Fallback is silent (user sees "Trying alternative engine..." in progress).

**Deprecated edit engines:** Existing Kontext, Seedream, and Qwen edit engines in `toolEngines.ts` are kept but hidden from the UI dropdown. They remain available programmatically (e.g., Seedream5Edit for PhotoSession) but the user-facing tool selector shows only Grok / NB Pro / Pruna.

#### Character creation engines

The character creation flow (UploadCharacter) should prominently offer:
- **Soul 2.0** — fashion-grade realism, excellent for influencer characters
- **NB2** — current default, good all-around
- **Imagen 4 Standard** — photorealistic, cheap
- **NB Pro** — maximum quality

#### Photo Session tiers updated

```
Tier Basic:    NB2 / Imagen 4 (generation only)           → 6-19 cr
Tier Standard: FLUX Kontext Pro (multi-ref identity lock)  → 14 cr
Tier Premium:  FLUX 2 Klein 9B Edit+LoRA                   → 9 cr + LoRA
```

Premium tier with Klein 9B Edit+LoRA: edits the base photo WITH the LoRA loaded. Cheaper and better consistency than generating from scratch.

#### Files to modify

- `falService.ts` — add `generateWithKontextPro()`, `generateWithKleinEditLoRA()`
- `replicateService.ts` — add `upscaleWithRecraft()`, `expandWithBria()`, `generateWithFlux2Pro()`, `generateWithFlux2Klein()`, `editWithPruna()`
- `toolEngines.ts` — add NB Pro and Pruna as engine options per tool
- `types.ts` — add new model enums, update `CREDIT_COSTS`
- `photoSessionPipeline.ts` — update tier routing
- `AIEditor.tsx` — add "Expand" tool
- `Director.tsx` / `ContentStudio.tsx` — add new engines to selector
- `UploadCharacter.tsx` — add Soul 2.0 as prominent engine option

---

### 3. LoRA Training UI

**Problem:** `trainLoRAForCharacter()` exists in `falService.ts` but has no UI.

**Flow:**

```
CharacterGallery → character detail panel
    ↓
"Train LoRA" button (requires 5+ reference photos)
    ↓
Confirmation: "Costs 570 cr, takes ~15 min"
    ↓
Status on character: idle → training → ready → failed
    ↓
When ready: "LoRA ✓" badge on character
    ↓
In PhotoSession/Director: if character has LoRA →
    Premium tier uses Klein 9B Edit+LoRA automatically
```

**No complex polling:** FAL returns a `request_id`. Store it. When user returns, check status. If complete → save `loraUrl` on character.

**Files:**
- `CharacterGallery.tsx` — "Train LoRA" button + status indicator
- `characterStore.ts` — `trainLoRA(characterId)` action
- `photoSessionPipeline.ts` — if `character.loraUrl` exists, Premium tier uses Klein 9B Edit+LoRA

---

### 4. Smart Export

**Problem:** Current export downloads original image without adapting to selected format.

**Solution:** Canvas crop + resize before download.

```
User selects format (IG Post 4:5)
    ↓
Canvas calculates centered crop (simple center-crop, not face detection)
    ↓
Resize to exact format dimensions
    ↓
Download optimized file
```

**MVP approach:** Simple center-crop. No face detection — that adds complexity and API cost for marginal benefit. Most AI-generated influencer photos are already centered on the subject. Face-aware cropping can be added post-MVP.

**Files:**
- **Create:** `utils/smartExport.ts` — `exportForFormat(imageUrl, format) → Blob`
- **Modify:** Export Modal in `App.tsx` to use this function

---

### 5. Outpaint / Expand Tool (Bria)

**Problem:** No way to expand an image beyond its borders. Useful for converting portrait → landscape without losing content.

**Files:**
- `replicateService.ts` — add `expandWithBria()`
- `AIEditor.tsx` — add "Expand" tool with direction controls (up, down, left, right, all)

---

### 6. Polish "Bring Your Own" Flow

**Problem:** Upload flow exists but is secondary. For MVP it needs to be first-class.

**What's missing:**
- **Clear entry point:** Prominent "Upload photo / Start with idea" button in Content Studio
- **No character required:** Director should work without a selected character when user uploads a photo — the uploaded photo IS the character
- **Quick edit path:** Uploaded photo → show editing tools immediately without generation step

**Files:**
- `ContentStudio.tsx` — allow Director access without selected character when photo uploaded
- `Director.tsx` — if uploaded photo + no character, skip character selection, show tools directly

---

### 7. Pricing Update

#### Plans (monthly credits, no daily expiry)

| Plan | Price/mo | Credits/mo | Per credit |
|------|----------|------------|------------|
| Starter | Free | 150 | — |
| Pro | $9.99 | 1,000 | $0.010 |
| Studio | $29.99 | 4,000 | $0.0075 |
| Brand | $99.99 | 15,000 | $0.0067 |

#### Credit packs (never expire)

| Pack | Price | Per credit |
|------|-------|------------|
| 200 cr | $3 | 1.5¢ |
| 800 cr | $10 | 1.25¢ |
| 3,000 cr | $30 | 1.0¢ |

#### Credits per operation (targeting 65% margin at Pro rate)

Formula: `credits = API_cost / (0.35 × $0.010)`

**Generation (text-to-image):**

| Engine | API Cost | 1K | 2K | 4K |
|--------|----------|-----|------|------|
| Imagen 4 Fast | $0.02 | 6 | 6 | 6 |
| Imagen 4 Standard | $0.04 | 12 | 12 | 12 |
| Imagen 4 Ultra | $0.06 | 17 | 17 | 17 |
| FLUX 2 Klein 4B | $0.015 | 4 | 4 | — |
| Grok Imagine | $0.02 | 6 | 6 | — |
| Soul 2.0 | ~$0.05 | 14 | — | — |
| FLUX 2 Pro | $0.04 | 12 | 12 | — |
| Gemini 2.5 Flash (legacy, kept for compat) | $0.039 | 11 | — | — |
| NB2 | $0.067-0.151 | 19 | 29 | 43 |
| NB Pro | $0.134-0.24 | — | 38 | 69 |

**Editing (image-to-image):**

| Operation | API Cost | 1K | 2K | 4K |
|-----------|----------|-----|------|------|
| Grok edit/relight/scene/outfit/swap/skin/style | $0.02 | 6 | 6 | 6 |
| Pruna edit | $0.03 | 9 | 9 | 9 |
| NB2 edit | $0.067-0.151 | 19 | 29 | 43 |
| NB Pro edit | $0.134-0.24 | — | 38 | 69 |
| FLUX Kontext Pro | $0.05 | 14 | 14 | — |
| Klein 9B Edit+LoRA | $0.03 | 9 | 9 | — |
| Upscale (Recraft Crisp) | $0.03 | 9 | — | — |
| Upscale (AuraSR — budget) | $0.01 | 3 | — | — |
| Expand (Bria) | $0.05 | 14 | — | — |
| Inpaint (OneReward) | $0.02 | 6 | 6 | — |
| Background Removal | $0.02 | 6 | — | — |
| Virtual Try-On (IDMVTON) | ~$0.05 | 14 | — | — |
| Angles/360 Standard (NB2) | $0.067 | 19 | — | — |
| Angles/360 Ultra (NB2+Grok) | ~$0.09 | 26 | — | — |

Note: AuraSR kept as budget upscale option (3 cr). Recraft Crisp becomes default upscaler (9 cr, better quality).

**Video:**

| Operation | API Cost | Credits |
|-----------|----------|---------|
| Kling 2.6 Standard (img2vid) | $0.30 | 86 |
| Kling 2.6 Pro (img2vid) | $0.50 | 143 |
| Kling 3.0 Pro (img2vid) | $1.00 | 286 |
| Motion Control Standard | $0.30 | 86 |
| Motion Control Pro | $0.50 | 143 |
| Kling 3.0 Motion Pro | $1.00 | 286 |
| Wan Replace | $0.20 | 57 |
| Lip Sync Standard | $0.25 | 71 |
| Lip Sync Pro | $0.50 | 143 |

**Special:**

| Operation | API Cost | Credits |
|-----------|----------|---------|
| LoRA Training | ~$2.00 | 571 |
| Photo Session Basic (per shot, Imagen 4 Fast) | $0.02 | 6 |
| Photo Session Basic (per shot, NB2 1K) | $0.067 | 19 |
| Photo Session Standard (per shot, Kontext Pro) | $0.05 | 14 |
| Photo Session Premium (per shot, Klein+LoRA) | $0.03 | 9 |

#### Pro user typical month (1,000 cr)

| Activity | Qty | Engine | Cr | API Cost |
|----------|-----|--------|-----|----------|
| Character photos | 10 | Imagen 4 Standard | 120 | $0.40 |
| Session photos | 15 | NB2 1K | 285 | $1.01 |
| Grok edits | 40 | Grok | 240 | $0.80 |
| Relights | 10 | Grok | 60 | $0.20 |
| Face swaps | 3 | Grok | 18 | $0.06 |
| Upscales | 5 | Recraft | 45 | $0.15 |
| Videos | 1 | Kling Standard | 86 | $0.30 |
| Misc edits | — | — | 96 | $0.30 |
| **Total** | | | **950 cr** | **$3.22** |

Revenue: $9.99 | Cost: $3.22 | **Margin: 68%**

**Note:** This is a COMPLETE pricing model replacement, not an incremental update. Both `CREDIT_COSTS` (keyed by model enum) and `OPERATION_CREDIT_COSTS` (keyed by operation type) in `types.ts` will be merged into a single unified `CREDIT_COSTS` map. New Lemon Squeezy variants needed for changed plan prices and the 800cr credit pack.

#### P&L with 100 subscribers

```
REVENUE
├─ 55 Starter  × $0       =          $0.00
├─ 28 Pro      × $9.99    =       $279.72
├─ 13 Studio   × $29.99   =       $389.87
├─ 4  Brand    × $99.99   =       $399.96
├─ Credit packs            =        $50.00
└─ Total                        $1,119.55

API COSTS
├─ 55 Starters × $0.30    =        $16.50
├─ 28 Pro      × $3.22    =        $90.16
├─ 13 Studio   × $9.80    =       $127.40
├─ 4  Brand    × $24.00   =        $96.00
└─ Total                         -$330.06

INFRASTRUCTURE
├─ Supabase Pro                     $25.00
├─ Cloudflare (Pages + Workers)      $5.00
├─ Domain                            $1.00
└─ Total                           -$31.00

═══════════════════════════════════════════════
MONTHLY GROSS PROFIT                 $758.49
GROSS MARGIN                           67.7%
ANNUAL PROJECTION                  $9,101.88
═══════════════════════════════════════════════
```

---

## Execution Order

```
1. Cloudflare Workers proxy  → workers/ai-proxy/ (new), service URL updates
2. New model integrations    → falService, replicateService, toolEngines, types
3. Pricing update            → types.ts, PricingPage.tsx, pipeline costs (after models exist)
4. LoRA Training UI          → CharacterGallery, characterStore
5. Smart Export              → utils/smartExport.ts (new), Export Modal
6. Outpaint tool             → replicateService, AIEditor
7. Polish "Bring Your Own"   → ContentStudio, Director
```

Note: Pricing update moved to step 3 (after model integrations) because new credit costs reference models that must exist first. Lemon Squeezy variant IDs for new plans/packs must be created before updating PricingPage.

## Critical Files

| File | Action | Purpose |
|------|--------|---------|
| `workers/ai-proxy/` | **Create** | Cloudflare Worker proxy |
| `utils/smartExport.ts` | **Create** | Canvas crop+resize per format |
| `services/falService.ts` | **Modify** | Kontext Pro, Klein Edit+LoRA |
| `services/replicateService.ts` | **Modify** | Recraft, Bria, FLUX 2 Pro/Klein, Pruna |
| `services/toolEngines.ts` | **Modify** | Add NB Pro + Pruna as edit engines |
| `services/photoSessionPipeline.ts` | **Modify** | Update tier routing + costs |
| `types.ts` | **Modify** | New enums, CREDIT_COSTS, OPERATION_CREDIT_COSTS |
| `components/PricingPage.tsx` | **Modify** | New plans + credit packs |
| `pages/AIEditor.tsx` | **Modify** | Add Expand tool |
| `pages/CharacterGallery.tsx` | **Modify** | LoRA training button + status |
| `pages/ContentStudio.tsx` | **Modify** | Allow no-character flow |
| `pages/Director.tsx` | **Modify** | No-character + new engines |
| `pages/UploadCharacter.tsx` | **Modify** | Soul 2.0 as engine option |
| `stores/characterStore.ts` | **Modify** | trainLoRA action |
| `App.tsx` | **Modify** | Smart export in Export Modal |

## Existing Functions to Reuse (do NOT recreate)

| Function | File |
|----------|------|
| `generatePhotoSession()` | geminiService.ts |
| `generateWithKontextMulti()` | falService.ts |
| `poseTransferWithLeffa()` | falService.ts |
| `extractPoseSkeleton()` | falService.ts |
| `trainLoRAForCharacter()` | falService.ts |
| `generateWithLoRA()` | falService.ts |
| `upscaleWithAuraSR()` | falService.ts |
| `realisticSkin()` | toolEngines.ts |
| `removeBackground()` | falService.ts |
| `generateWithSoul()` | higgsfieldService.ts |
| `grokEdit()` | falService.ts |
| `runSessionPipeline()` | photoSessionPipeline.ts |
| `splitGrid()` | gridSplitter.ts |
| `mixShots()` | sessionPresets.ts |

## Verification

1. **Cloudflare Worker:** Deploy → verify all AI calls route through worker → confirm no API keys in browser Network tab
2. **New models:** Generate with each new engine → verify output quality → confirm credit deduction
3. **Soul 2.0 character creation:** Create character with Soul 2.0 → verify fashion-grade quality
4. **Edit engines:** Use Grok/NB Pro/Pruna for same edit → verify all 3 work
5. **Kontext Pro:** Standard tier session → verify better identity lock than old Kontext Multi
6. **Klein Edit+LoRA:** Premium tier with trained LoRA → verify identity preservation
7. **LoRA Training:** Trigger from UI → verify status updates → use in generation
8. **Smart Export:** Select IG Story 9:16 on a 1:1 image → verify proper crop + resize
9. **Expand tool:** Expand portrait → landscape → verify clean outpainting
10. **"Bring your own" flow:** Upload photo → edit → export without creating character first
11. **Pricing:** Verify all credit costs match the 65% margin table
12. **Recraft upscale:** Compare vs AuraSR on same image → verify quality improvement

---

*Last updated: 2026-03-19*
