# CLAUDE.md — VIST Studio

## ⚡ Context Recovery (MANDATORY — READ FIRST)

When starting a new session, do this in order:

1. Read this file completely
2. Read memory files at `~/.claude/projects/C--Users-delri-OneDrive-Desktop-app-VMST-vist/memory/`
3. Run `git log --oneline -20` to see latest changes
4. Check the ## Current Sprint section at the bottom of this file
5. If unclear what to work on, ask the user before touching any code

After EVERY significant change:
- Update ## Current Sprint — mark tasks done, add blockers found
- Update ## Known Bugs — mark fixed bugs as ✅
- Update ## Known Pitfalls — if you discovered a new one

---

## 🚫 Development Discipline (NON-NEGOTIABLE)

- **Read before modifying** — read full context of what you're changing, including all callers and consumers
- **Search all consumers** — before changing any function, endpoint, auth mechanism, or data format, grep everywhere it's used. Change ALL of them together
- **One change at a time** — make it, verify it, then move on. Don't bundle unrelated changes
- **Don't break what works** — understand WHY something works before touching it. Existing code may have non-obvious reasons
- **Verify after changes** — re-read modified files to confirm the change is correct and doesn't introduce syntax errors or type mismatches
- **Never hardcode API keys** — all API keys are proxied server-side via Cloudflare Pages Functions. Keys are NEVER in the client bundle. See ## API Proxy Architecture below.
- **Ask before touching payments** — Lemon Squeezy integration is fragile, don't refactor without explicit approval
- **Validate SQL** — test that parameterized queries don't have type ambiguity
- **Check internal calls** — endpoints that call other endpoints must propagate auth correctly

---

## 🏗 Project Overview

- **Product:** AI Influencer Studio — Generate (freestyle) + Director (branded)
- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS (dark theme)
- **Location:** `C:\Users\delri\OneDrive\Desktop\app_VMST\vist\`
- **Deploy:** https://vist-studio.pages.dev (Cloudflare Pages)
- **Auth + DB:** Supabase (project ID: xygcnamxfjhvhqmpkkyj)
- **Payments:** Lemon Squeezy
- **Storage:** IndexedDB (binary/Blob data) + Supabase (sync — future)

---

## 🎨 Visual Identity (DO NOT CHANGE WITHOUT ASKING)

```
Background:  #0D0A0A
Accent:      #FF5C35  (coral — primary CTA, highlights, active states)
Text:        #FFFFFF / rgba(255,255,255,0.6) / rgba(255,255,255,0.25)
Fonts:       Space Grotesk (display) + Inter (body)
```

Rules:
- No glassmorphism, no backdrop-blur
- No purple gradients or generic AI aesthetics
- No Inter/Roboto/Arial as primary display font
- Dark theme only — never add a light mode without explicit approval
- Buttons: coral background (#FF5C35) for primary actions, dark pill for secondary

---

## 🗺 Navigation

```
VIST Studio | Explore | Generate | Director | Characters | Storyboard
```

| Tab | Component | Purpose |
|---|---|---|
| explore | `ExplorePage.tsx` | Home / landing after login |
| generate | `GeneratorPage.tsx` | Freestyle: model-centric, fast, no character required |
| director | `DirectorStudio.tsx` | Branded: character + outfit + scene, consistent identity |
| characters | `CharactersPage.tsx` | Character library hub + Soul ID training |
| storyboard | `StoryboardView.tsx` | Sequence / content planner |

---

## 📁 Key Files

| File | Role |
|---|---|
| `App.tsx` | Workspace router, all top-level handlers, modal state |
| `types.ts` | All enums and interfaces — source of truth for types |
| `contexts/FormContext.tsx` | All form state (characters, scenario, lighting, provider, etc.) |
| `contexts/GalleryContext.tsx` | Generated content history |
| `contexts/ProfileContext.tsx` | Credits system: `decrementCredits()` / `restoreCredits()` |
| `contexts/AuthContext.tsx` | Auth state with resilient `getSession()` |
| `contexts/CharacterLibraryContext.tsx` | Persistent character library (CRUD + Soul ID training) |
| `hooks/useGeneration.ts` | Central generation orchestrator — all providers go through here |
| `services/storageService.ts` | IndexedDB open/migrate — owns `onupgradeneeded` exclusively |
| `services/characterStorageService.ts` | IndexedDB CRUD for `characters` store |
| `services/supabaseProfileService.ts` | Profile CRUD + credit decrement/restore via RPC |
| `services/geminiService.ts` | Gemini + Imagen 4 generation (via `/gemini-api` proxy) |
| `services/falService.ts` | FLUX Kontext, Seedream, LoRA training, video (via `/fal-api` proxy) |
| `services/replicateService.ts` | FLUX.2 Max, Gen-4 Image, Virtual Try-On (via `/replicate-api` proxy) |
| `services/openaiService.ts` | GPT Image 1.5 / 1.0 (via `/openai-api` proxy) |
| `services/ideogramService.ts` | Ideogram V3 / V2A (via `/ideogram-api` proxy) |
| `services/modelsLabService.ts` | ModelsLab NSFW (via `/modelslab-api` proxy) |

---

## 🔐 API Proxy Architecture

All API keys are proxied server-side — **never baked into the client JS bundle**.

| Proxy Route | Target | Auth Method | Function File |
|---|---|---|---|
| `/gemini-api/*` | `generativelanguage.googleapis.com` | `?key=` query param | `functions/gemini-api/[[path]].ts` |
| `/fal-api/*` | `queue.fal.run` | `Authorization: Key` header | `functions/fal-api/[[path]].ts` |
| `/replicate-api/*` | `api.replicate.com` | `Authorization: Token` header | `functions/replicate-api/[[path]].ts` |
| `/openai-api/*` | `api.openai.com` | `Authorization: Bearer` header | `functions/openai-api/[[path]].ts` |
| `/ideogram-api/*` | `api.ideogram.ai` | `Api-Key` header | `functions/ideogram-api/[[path]].ts` |
| `/modelslab-api/*` | `modelslab.com/api` | `key` in JSON body | `functions/modelslab-api/[[path]].ts` |

**Cloudflare env vars (already configured in production):**
`GEMINI_API_KEY`, `FAL_KEY`, `REPLICATE_API_TOKEN`, `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `MODELSLAB_API_KEY`

**Dev mode:** Vite proxy in `vite.config.ts` reads keys from `.env` and injects them the same way.

**SDK configuration:**
- Gemini: `createGeminiClient()` helper with `httpOptions.baseUrl: '/gemini-api'`
- FAL: `fal.config({ proxyUrl: '/fal-api' })`
- ModelsLab: `BASE = '/modelslab-api/v6'`, proxy injects `key` into JSON body
- ApiKeyGuard: passes through in normal deployment, only blocks in Google AI Studio

---

## 💾 Data Model — SavedCharacter

```typescript
interface SavedCharacter {
  id: string;
  name: string;
  thumbnail: string;            // base64 data URL of first modelImage
  modelImageBlobs: Blob[];      // File[] stored natively in IndexedDB
  outfitBlob: Blob | null;
  outfitDescription: string;
  characteristics: string;
  accessory: string;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  loraUrl?: string;             // FAL storage URL of trained LoRA weights
  loraTrainingStatus?: 'idle' | 'training' | 'ready' | 'failed';
  loraTrainedAt?: number;
}
```

---

## 🗄 IndexedDB Schema

- **DB name:** `VirtualInfluencerStudioDB`
- **Current version:** `3`
- **Migration owner:** `services/storageService.ts` — ONE place only, never split
- **Stores:** `generations`, `inspirations`, `characters`
- **Rule:** Other services open the DB at v3 WITHOUT their own `onupgradeneeded`

---

## 🗄 Supabase Schema

**Tables:**
- `profiles` — user profile, subscription, credits
- `webhook_events` — idempotency for Lemon Squeezy webhooks (`event_id TEXT PRIMARY KEY`)

**RPC Functions (already created):**
- `decrement_credits(p_user_id uuid, p_amount bigint)` → returns new balance, raises on insufficient
- `restore_credits(p_user_id uuid, p_amount bigint)` → adds credits back

---

## 💰 Credits System

All generation/edit operations deduct credits before the API call and restore on failure.

**Enforced in:**
- `hooks/useGeneration.ts` — main generation flow (create, edit, video)
- `components/TryOnModal.tsx` — 15 credits (virtualTryOn)
- `components/FaceSwapModal.tsx` — 15 credits (faceSwap)
- `components/RelightModal.tsx` — 10 credits (relight, AI mode only)
- `components/SkinEnhancerModal.tsx` — 8 credits (skinEnhancer)
- `components/InpaintingModal.tsx` — 8 credits (inpaint)

**Pattern:** `decrementCredits(cost)` → API call → on catch: `restoreCredits(cost)`

---

## 🤖 AI Providers & Engines

| Provider | Models | Credits | API cost/img |
|---|---|---|---|
| Gemini | Flash, NB2, Pro, Imagen4, Imagen4Ultra, Imagen4Fast | ⚡2 | $0.039 |
| FAL | KontextMulti, KontextMaxMulti, Flux2Pro | ⚡10 | $0.040 |
| FAL | Seedream45, Seedream50 | ⚡8 | $0.030 |
| Replicate | Flux2Max | ⚡12 | $0.055 |
| Replicate | IDMVTON (virtual try-on) | ⚡15 | — |
| OpenAI | GptImage15, GptImage1 | ⚡20 | $0.080 |
| Ideogram | V3, V2A, V2ATurbo | ⚡15 | $0.080 |
| Video | KlingStandard, KlingPro, RunwayGen3, LumaDreamMachine | ⚡80 | $1.20 |

**⚠ Important:** Gemini Flash was intentionally lowered from ⚡5 → ⚡2
to improve perceived value vs Higgsfield. Do NOT revert this.

---

## 💳 Plans & Pricing

| Plan | Price | Credits/mo | Target |
|---|---|---|---|
| Starter | $0 | 50 | Acquisition |
| Pro | $19 | 500 | Creators |
| Studio | $49 | 1,500 | Power users |
| Brand | $149 | 8,000 | Agencies |

**Lemon Squeezy Variant IDs — do not change:**
```
Pro Monthly:    1374166  |  Pro Annual:    1374257
Studio Monthly: 1374262  |  Studio Annual: 1374271
Brand Monthly:  1374277  |  Brand Annual:  1374280
Credits 200:    1374283  |  Credits 750:   1374287
Credits 3000:   1374291  |  Store ID:      308321
```

---

## 🐛 Known Bugs

| # | Severity | Description | Status |
|---|---|---|---|
| 1 | 🔴 CRITICAL | `decrement_credits` RPC missing in Supabase | ✅ FIXED — RPC created |
| 2 | 🔴 CRITICAL | ProtectedRoute redirects before `getSession()` resolves | ✅ FIXED — `.catch()/.finally()` added to AuthContext |
| 3 | 🟡 MEDIUM | `/pricing` inside AuthGuard — anonymous users get redirected silently | ✅ FIXED — pricing in PUBLIC_WORKSPACES |
| 4 | 🟡 MEDIUM | Hero images reference private Supabase Storage bucket — render black | ✅ FIXED — static assets in /public/demo/ |
| 5 | 🟡 MEDIUM | 4+ Supabase queries fire simultaneously on every route change | ✅ FIXED — stable user ref, parallel load, deduplicated sync |
| 6 | 🟢 MINOR | "Start Free" button on landing has no onClick handler | ✅ VERIFIED — already works |
| 7 | 🔴 CRITICAL | 5 modals called APIs without deducting credits | ✅ FIXED — all modals enforce credits |
| 8 | 🔴 CRITICAL | API keys (Gemini, FAL, ModelsLab) baked into client bundle | ✅ FIXED — server-side proxies |
| 9 | 🔴 CRITICAL | Webhook: no error handling on DB updates | ✅ FIXED — returns 500 on failure |
| 10 | 🔴 CRITICAL | Webhook: no idempotency | ✅ FIXED — webhook_events table |
| 11 | 🟡 MEDIUM | Webhook: silently ignores missing user_id | ✅ FIXED — returns 400 |
| 12 | 🟡 MEDIUM | Webhook: empty variant map if env vars missing | ✅ FIXED — filters + logs |
| 13 | 🟡 MEDIUM | `restoreCreditsInDb` fallback overwrites balance | ✅ FIXED — reads current + adds |
| 14 | 🟡 MEDIUM | Video engine not passed in params (Kling routing bug) | ✅ FIXED — engine included in VideoParams |

### Deferred (lower priority)
- Memory leaks: inspiration blob URLs, DetailModal (BUGs #14, #21 from audit)
- `as any` cleanup in falService (BUG #19)
- N+1 gallery save (BUG #17)
- Photo session credit undercharge (BUG #9)
- Cloud sync retry logic (BUG #15)
- Image compression (tech debt)
- `.env.example` creation (BUG #22)

---

## ⚠️ Known Pitfalls

- **Circular context dependency:** `CharacterLibraryContext` must NOT import
  `FormContext`. Pass `updateCharacter` as a callback argument at the call site.

- **IndexedDB Blob storage:** `File extends Blob` — store File arrays directly
  as Blob arrays. Recreate File from Blob on load with
  `new File([blob], name, { type })`. No conversion needed.

- **FAL type casting:** `fal.subscribe` input types may be stricter than the
  actual API. Cast with `as any` where the SDK types lag the API spec.

- **DB version guard:** Always wrap new store creation in
  `!db.objectStoreNames.contains(storeName)` to keep migrations safe.

- **Auth race condition:** Never redirect in ProtectedRoute before
  `getSession()` resolves. Always wait for `authChecked` state.

- **Lemon Squeezy webhooks:** Always verify signature with
  `LEMONSQUEEZY_WEBHOOK_SECRET`. Never process `order_created` without it.
  Webhook now has idempotency — check `webhook_events` table.

- **Supabase RLS:** Test queries with both anon key and service key.
  Silent 0-row results often mean RLS policy is blocking, not an empty table.

- **Generate → gallery_items:** Images generated in Generate are currently
  only in local state — they are NOT saved to gallery_items. This is a known
  gap. When fixing, add `source: 'generate'` column to gallery_items.

- **API key proxies:** Never add API keys back to `vite.config.ts` `define` block.
  The `ApiKeyGuard` component no longer checks for `process.env.API_KEY` —
  it defaults to `setHasKey(true)` since keys are proxied.

- **ModelsLab proxy:** The proxy injects the real API key into the JSON body,
  replacing the `'PROXIED'` placeholder. Don't remove the placeholder `key` field.

---

## 🏆 Competitive Context

**Main competitor:** Higgsfield AI (higgsfield.ai)

**VIST advantages to protect — do not weaken these:**
- Director: face + outfit + scene in one flow (more integrated than Higgsfield Soul ID)
- Virtual Try-On (Higgsfield doesn't have this)
- NSFW engine (Studio+ plan)
- Storyboard / content planner
- Brand tier price ($149 vs Higgsfield $249)

**Gaps to close (prioritized):**
1. ~~Library doesn't show generated images — only characters~~ ✅ Images tab added
2. ~~No community/explore feed for organic discovery~~ ✅ Community feed + share action added

---

## 🔨 Build Commands

```bash
npm run build          # Vite production build (main chunk ~856KB after code splitting)
npx tsc --noEmit       # Must return zero errors before every commit
```

---

## 📋 Current Sprint

**Last updated:** 2026-03-07
**Focus:** Security & reliability hardening (complete), next: UX polish

### ✅ Done (this sprint)
- [x] Bug #1: `decrement_credits` + `restore_credits` RPC created in Supabase
- [x] Bug #2: Auth resilience — `.catch()/.finally()` on `getSession()`
- [x] Bug #7: Credits bypass — all 5 modals (TryOn, FaceSwap, Relight, SkinEnhancer, Inpaint) enforce credits
- [x] Bug #8: API keys moved server-side — 3 new proxy functions (gemini, fal, modelslab)
- [x] Bugs #9-12: Webhook reliability — error handling, idempotency, missing user_id, variant map validation
- [x] Bug #13: `restoreCreditsInDb` fallback reads current balance before adding
- [x] Bug #14: Video engine included in VideoParams (Kling routing fix)
- [x] Generate: masonry grid gallery (Freestyle redesign)
- [x] Generate: bottom bar collapsed to single row
- [x] Gemini Flash: ⚡2 credit cost confirmed across all pages (types, GeneratorPage, PricingPage, DirectorStudio)
- [x] i18n: Spanish→English in PricingPage plans, GalleryGrid, DetailModal
- [x] Login/Register redirect: `/login` and `/register` mapped in PATH_TO_WORKSPACE
- [x] Bottom bar: Generate button shows ⚡ prefix on credit cost

### 🟡 Open (next up)
- [x] Bug #3: `/pricing` already in PUBLIC_WORKSPACES — verified working
- [x] Bug #4: Hero images moved to `/public/demo/` (6 static JPGs, no external dependency)
- [x] Bug #6: "Start Free" button already has onClick → navigates to generate workspace
- [x] Library: add [Images] tab showing all gallery_items (Characters | Images tabs with search/filter)
- [x] gallery_items: add `source TEXT DEFAULT 'director'` column (code done, SQL pending user execution)
- [x] Generate: save generated images to gallery_items with source='generate' (already implemented in useGeneration.ts)

### 🧊 Deferred (backlog) — all resolved
- [x] Memory leaks — blob URL revocation added (inspiration, history, falService, PoseAssistant, DirectorStudio BlobImg)
- [~] `as any` in falService — won't fix: SDK types lag API spec (see Known Pitfalls), custom types would be fragile
- [x] N+1 gallery save — parallelized with Promise.allSettled, failed items fallback to IndexedDB
- [x] Photo session credit undercharge — now charges photoSession (10) × photoSessionCount
- [x] Cloud sync retry — background sync uploads local-only items to Supabase on login
- [x] Image compression — WebP (q=0.82) before Supabase Storage upload, skips if result is larger
- [x] `.env.example` created with all env vars documented

### 🚀 Growth & UX (new sprint)
- [x] Bug #5: Supabase query storm — stable user ref, parallel load, deduplicated sync
- [x] Community feed — `community_shares` table + CommunityFeed component + "Share to Community" in gallery menu
- [x] Pricing CTA for anónimos — sign-up prompt + sessionStorage checkout intent + auto-checkout after login
- [x] Library Images lightbox — click-to-preview with download, source badge, provider info
- [x] Onboarding welcome modal — 3-slide tour (Freestyle, Director, Library), shown once on first login
- [x] Code splitting — React.lazy for 6 workspaces + 12 modals/components + manualChunks for vendors → main chunk 1,422→856KB (-40%)
