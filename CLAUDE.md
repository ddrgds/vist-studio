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
| 1 | 🔴 CRITICAL | `decrement_credits` RPC missing in Supabase | ✅ FIXED — RPC created  |
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
| 15 | 🔴 CRITICAL | "Director" button in Generate routes to /influencer instead of /director | ✅ FIXED — setActiveWorkspace("director") |
| 16 | 🟡 MEDIUM | "Variaciones" and "galeria" Spanish strings in UI/downloads | ✅ FIXED — translated to English |
| 17 | 🟡 MEDIUM | Hero counter contrast < 2:1 WCAG fail (#4A3A36 on dark) | ✅ FIXED — color raised to #8B7A76 |
| 18 | 🟡 MEDIUM | "See examples" scrolls to personal gallery, not examples | ✅ FIXED — scrolls to Community Feed |
| 19 | 🟡 MEDIUM | Generate without face reference wastes credits silently | ✅ FIXED — confirmation modal in Director |
| 20 | 🟢 MINOR | "Start Free" no feedback for logged-in users | ✅ FIXED — shows "Start Creating" when authenticated |
| 21 | 🟢 MINOR | 6+ icon-only buttons missing aria-label | ✅ FIXED — aria-labels on nav/sidebar/menu buttons |

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
npm run build          # Vite production build (main chunk ~758KB after code splitting + legacy removal)
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
- [x] Code splitting — React.lazy for 6 workspaces + 12 modals/components + manualChunks for vendors → main chunk 1,422→758KB (-47%)

### 🔧 QA Audit Fixes
- [x] Bug #15 (P0): "Director" button in Generate routed to /influencer — fixed to /director
- [x] Bug #16 (P2): "Variaciones" → "Variations", "galeria" → "gallery", Spanish comment in geminiService
- [x] Bug #17 (P5): Hero counter contrast raised from #4A3A36 to #8B7A76 (WCAG improvement)
- [x] Bug #18 (P4): "See examples" now scrolls to Community Feed (not personal gallery)
- [x] Bug #19 (P3): Face reference validation in Director — shows warning modal before spending credits
- [x] Bug #20 (P4): "Start Free" → "Start Creating" for authenticated users
- [x] Bug #21 (P5): aria-labels added to 6 nav/sidebar/menu icon-only buttons
- [x] LOGIC-002 (P1): Removed legacy create/video/influencer workspace (~2,760 lines dead code from App.tsx)
- [x] SEO-001 (P5): Nav `<button>` → `<a href>` for crawleable links
- [x] SEO-002 (P5): Dynamic `<title>` + meta description per workspace, OG tags + Twitter Card in index.html
- [x] I18N-002 (P5): Download filenames "influencer-" → "vist-" across App.tsx + DetailModal
# VIST Studio — Auditoría de Producto & Guía de Correcciones
## Proyecto
VIST Studio es un AI Influencer Studio que genera imágenes y videos fotorrealistas de personajes virtuales usando 10+ motores de IA (FLUX Kontext, Gemini Flash, GPT Image 1.5, Ideogram V3, Kling AI, Runway Gen-3, NB2, Seedream 4.5/5.0, Grok). Desplegado en Cloudflare Pages.
## URL de producción
https://vist-studio.pages.dev
## Competidor principal de referencia
Higgsfield.ai — estándar de UI/UX al que aspiramos: estética oscura premium, micro-interacciones fluidas, flujos de 2-3 clics, social proof con community feed, previews animados.
## Arquitectura de rutas
| Ruta | Título | Función |
|------|--------|---------|
| `/` | Explore (Homepage) | Landing con hero, feature cards, creaciones del usuario, stats, how it works, pricing, CTA final |
| `/generate` | Freestyle Generator | Generación rápida de imágenes con prompt libre. Barra inferior con input + settings gear + botón Generate |
| `/director` | Director Studio | Herramienta principal. Sidebar izquierda (Identity, Engine, Costume, Pose, Library). Tabs superiores: Create, Poses, AI Edit, Photo Session. Sidebar derecha (Lighting, Camera, Format, Scene). Gallery central |
| `/characters` | Library (Your Cast) | Biblioteca de personajes guardados. Tabs: Characters / Images |
| `/storyboard` | Storyboard | Planificador de contenido. Frames con drag-to-reorder, Export Grid, Clear |
| `/pricing` | Plans & Pricing | 4 tiers: Starter (Free), Pro ($19), Studio ($49), Brand ($149) |
## Navegación
- **Desktop navbar (top):** VIST Studio logo → Explore (/) → Freestyle (/generate) → Director (/director) → Library (/characters) → Storyboard (/storyboard) → Pricing (/pricing) → Credits badge → Upgrade → Profile dropdown
- **Mobile bottom bar:** Explore → Freestyle → Director → Library → Board (truncado de Storyboard)
- Cada link del navbar tiene un subtitle tooltip: Explore="Home & overview", Freestyle="Freestyle generation", Director="Character studio", Library="Character library", Storyboard="Content planner", Pricing="Plans & features"
## Director Studio — Sub-modos (tabs)
1. **Create** → Sidebar: Identity (3 face slots), Engine selector con toggle, Costume (outfit ref + text), Pose, Library (personajes guardados). Right panel: Lighting (Natural/Studio/Golden/Neon/Dramatic/Dark), Camera (Portrait/Wide/Macro/Cinema/Polaroid/Vintage), Format (3:4/1:1/4:3/16:9/9:16), Resolution (1K/2K/4K), Scene, Variations. CTA: "Direct →"
2. **Poses** → Base image loaded, Engine selector (Gemini/fal.ai/FLUX.2/GPT/Grok), Session Poses con pose descriptions. CTA: "Apply Poses →"
3. **AI Edit** → Engine chips (Gemini/GPT/FLUX/FLUX.2/Seedream/Grok/Face Swap/NSFW Edit), Instruction textarea, Reference image optional. CTA: "Apply Edit →"
4. **Photo Session** → 11 style presets (Selfies/GRWM/Stories/Editorial/Portrait/Street Style/Creator/Lifestyle/Fitness/Night Out/Foto Dump), Photos to shoot counter, Engine selector (NB2/Grok). CTA: "Shoot Session →"
---
## BUGS CONFIRMADOS — Prioridad P0 (Críticos)
### BUG-001: Tarjeta "Video Generation" redirige a /generate en vez de /director
**Dónde:** Homepage, sección "Everything you need", tercera tarjeta de 4
**Qué pasa:** La tarjeta "Video Generation — Kling AI & Runway Gen-3" tiene un onClick/href que navega a `/generate` (Freestyle Generator). El usuario espera una herramienta de video pero llega al generador de imágenes.
**Fix:** Cambiar la redirección de la tarjeta "Video Generation" a `/director`. Si se puede, añadir un query param como `/director?tab=video` para abrir directamente un futuro tab de video. Si no existe tab de video, redirigir a `/director` como default. Buscar el array/objeto de feature cards en el componente del homepage y corregir la entrada correspondiente a "Video Generation".
### BUG-002: Race condition — Sección "YOUR CREATIONS" vs "COMMUNITY" alterna en cada refresh
**Dónde:** Homepage, sección debajo de las feature cards
**Qué pasa:** Al cargar la página, a veces muestra "YOUR CREATIONS" (29 images in your studio) con la galería del usuario, y otras veces muestra "COMMUNITY — See what others are creating" con un spinner infinito. El render depende de si el auth state se resolvió a tiempo.
**Fix:** El componente debe esperar a que el estado de autenticación se resuelva antes de decidir qué renderizar. Mientras el auth está pendiente, mostrar un skeleton/placeholder (no un spinner). La lógica debe ser: si auth pendiente → skeleton; si autenticado → YOUR CREATIONS; si no autenticado → COMMUNITY. Buscar el componente condicional en la homepage y envolver con un check de loading state del auth.
### BUG-003: Freestyle Generator (/generate) — Pantalla vacía sin onboarding
**Dónde:** `/generate` — toda la página
**Qué pasa:** La página muestra solo un icono de imagen roto (placeholder) y el texto "Describe what you want to create" sobre un fondo completamente negro. No hay sugerencias, templates, ejemplos, ni guía. Esto causa "blank canvas paralysis".
**Fix:** Crear un empty state para cuando no hay imágenes generadas. Debe incluir:
1. Un título de bienvenida sutil (ej: "What will you create?")
2. Un grid o fila de 6-8 prompt suggestion chips clicables. Ejemplos:
   - "Editorial fashion shoot, golden hour lighting"
   - "Street style portrait, Tokyo neon nights"
   - "Luxury brand campaign, minimalist studio"
   - "Athletic wear, outdoor mountain scenery"
   - "Vintage film aesthetic, European café"
   - "Fantasy character, dramatic cinematic lighting"
   - "Casual chic, rooftop sunset city skyline"
   - "Swimwear editorial, tropical beach paradise"
3. Al hacer click en un chip, debe copiar el texto al textarea del prompt (el input ref "Describe your image...")
4. Opcionalmente: mostrar 3-4 thumbnails de ejemplo debajo con el prompt que los generó
5. El empty state debe desaparecer una vez el usuario genere su primera imagen (el gallery se llena)
---
## BUGS CONFIRMADOS — Prioridad P1 (Altos)
### BUG-004: Mobile bottom nav — Label "Board" truncado
**Dónde:** Bottom navigation bar (nav móvil/contextual), último item
**Qué pasa:** El label dice "Board" en vez de "Storyboard". Es ambiguo y pierde significado.
**Fix:** Cambiar el label de "Board" a "Storyboard". Si el espacio no permite el texto completo, usar "Story" como alternativa. Verificar que no haya overflow. Buscar el componente de bottom navigation y corregir el label del último item.
### BUG-005: Mobile bottom nav — Falta enlace a Pricing
**Dónde:** Bottom navigation bar
**Qué pasa:** La nav mobile tiene 5 items (Explore, Freestyle, Director, Library, Board) pero no incluye Pricing. Pricing es un flujo de monetización crítico que no debe ser inaccesible en mobile.
**Fix:** Evaluar si Pricing debe añadirse como sexto item en la bottom nav, o si debe ser accesible desde el dropdown del perfil de usuario. Recomendación: añadirlo al menú de perfil como "Plans & billing" (que ya existe como botón pero solo en el dropdown del desktop).
### BUG-006: Feature cards del homepage sin hover states significativos
**Dónde:** Homepage, sección "Everything you need", las 4 tarjetas
**Qué pasa:** Las tarjetas (Freestyle, Director Studio, Video Generation, Storyboard) tienen hover state mínimo. No comunican interactividad.
**Fix:** Añadir a cada tarjeta:
- `transition-all duration-200 ease-out`
- `hover:scale-[1.02]`
- `hover:border-orange-500/40` (border glow sutil)
- `hover:shadow-lg hover:shadow-orange-500/10`
- Cursor pointer si no lo tiene ya
### BUG-007: Photo Session presets sin previews ni descripciones
**Dónde:** Director → tab "Photo Session", sidebar izquierda, los 11 botones de estilo
**Qué pasa:** Los presets (Selfies, GRWM, Stories, Editorial, etc.) solo muestran un emoji/icono y nombre. No hay tooltip ni preview que explique qué genera cada estilo.
**Fix:** Añadir un tooltip on hover a cada preset con una descripción de 1 línea. Ejemplos:
- Selfies: "Close-up self-portrait, natural lighting, phone camera feel"
- GRWM: "Get Ready With Me — mirror shots, getting dressed sequence"
- Editorial: "High fashion magazine spread, professional studio lighting"
- Street Style: "Urban outdoor fashion, candid city vibes"
Si es posible, mostrar un thumbnail de ejemplo en el tooltip.
---
## MEJORAS DE UI — Prioridad P2 (Elevación visual)
### UI-001: Section headers — Cambiar monospaced por sans-serif
**Dónde:** Homepage — todos los section headers: "EVERYTHING YOU NEED", "YOUR CREATIONS", "COMMUNITY", "HOW IT WORKS", "PRICING"
**Qué pasa:** Usan una fuente monospaced/uppercase que crea efecto "developer tool" en vez de "professional creative suite".
**Fix:** Cambiar estos headers a la misma font-family sans-serif del resto del UI. Mantener uppercase. Aplicar: `font-family: inherit` (o la sans-serif del proyecto), `font-weight: 600`, `letter-spacing: 0.05em`, `text-transform: uppercase`. Color: mantener el orange-500 actual.
### UI-002: Introducir segundo accent color
**Dónde:** Global — sistema de colores
**Qué pasa:** Todo el UI usa exclusivamente naranja (#f97316 / orange-500) como único accent color sobre negro. Esto es monótono comparado con Higgsfield que usa lime/chartreuse como secondary.
**Fix:** Añadir un color de acento secundario para estados de éxito, badges "new", y elementos secundarios. Sugerencia: `emerald-400` (#34d399) o `cyan-400` (#22d3ee). Usar para: badges de "NEW" en engines, estados de éxito ("Base image loaded"), y como hover color alternativo en elementos secundarios. No reemplazar el naranja principal — solo complementarlo.
### UI-003: Storyboard — Rediseño como timeline visual
**Dónde:** `/storyboard`
**Qué pasa:** Actualmente es solo un canvas con frames apilados verticalmente, "Export Grid" y "Clear". No hay timeline, no hay indicadores de secuencia narrativa.
**Fix:** Rediseñar como timeline horizontal:
- Barra de timeline en la parte inferior con thumbnails de cada frame
- Drag-and-drop entre posiciones
- Indicador de frame número, tipo (image/video), y duración estimada para video
- Botón "+" entre frames para insertar nuevos
- Mantener Export Grid y añadir "Export Video" (compilación)
- Zona de preview ampliado al hacer click en un frame
### UI-004: Community feed con social proof
**Dónde:** Homepage, sección "COMMUNITY"
**Qué pasa:** Muestra un spinner infinito y nunca carga contenido de comunidad.
**Fix:** Si el endpoint de community existe, corregir la carga de datos. Si no existe, implementar un feed tipo grid (estilo Pinterest) con:
- Thumbnails de creaciones populares de otros usuarios
- Contador de likes o "remixes"
- Botón "Use this style" que copia los parámetros de generación al Director
- Filtros por estilo: Editorial, Street, Fantasy, Lifestyle, etc.
Si no hay backend para esto aún, mostrar un estado vacío elegante con "Community gallery coming soon" en vez del spinner infinito.
---
## Reglas de estilo para todos los cambios
- Dark theme: background `#0a0a0a` o equivalente Tailwind `bg-zinc-950`
- Primary accent: `orange-500` (#f97316)
- Text principal: `zinc-100` o `gray-100`
- Text secundario: `zinc-400` o `gray-400`
- Border cards: `zinc-800` con hover `orange-500/40`
- Radius: `rounded-xl` para cards, `rounded-lg` para botones, `rounded-full` para chips/badges
- Transiciones: `duration-200 ease-out` para todos los hover states
- No usar fuentes monospaced en headers de sección
- Mantener consistencia con Tailwind CSS classes existentes en el proyecto