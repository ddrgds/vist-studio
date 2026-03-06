# CLAUDE.md — VIST Studio

## Context Recovery (MANDATORY — READ FIRST)

When starting a new session or losing context, ALWAYS:

1. **Read `CLAUDE.md`** — Contains project rules, schema, systems documentation
2. **Read `DIAGNOSTIC_AND_PLAN.md`** — Contains the sprint plan, current progress, and what's next
3. **Check recent git log** — `git log --oneline -20` to see latest changes and where we left off

After EVERY significant change:

- **Update `DIAGNOSTIC_AND_PLAN.md`** — Mark tasks as DONE, add bugs found/fixed, update sprint status
- **Update `CLAUDE.md`** — If schema changed, new systems were added, new env vars needed, or new pitfalls discovered

This ensures continuity across sessions. Without this, work gets repeated or context is lost.

---

## Development Discipline (MANDATORY)

These rules are non-negotiable. Every change must follow them:

- **Read before modifying** — Always read the full context of what you're changing, including all callers and consumers
- **Search for all consumers** — Before changing any function, endpoint, auth mechanism, header, or data format, grep for every place that uses it. Change ALL of them together
- **Validate SQL queries** — Test that parameterized queries don't have type ambiguity
- **One change at a time** — Don't bundle unrelated changes. Make one logical change, verify it, then move to the next
- **Check internal calls** — Endpoints that call other endpoints internally must propagate auth correctly. When changing auth mechanisms, trace the FULL chain
- **Don't break what works** — If something is working in production, understand WHY it works before changing it. The existing implementation may have non-obvious reasons
- **Verify after changes** — After modifying code, re-read the modified file to confirm the change is correct and doesn't introduce syntax errors or type mismatches

---

## Project Overview

- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS (dark theme, zinc/black)
- **Location:** `/Users/diegodelrio/Documents/app_VMST/vist/`
- **Purpose:** Multi-AI-provider virtual influencer studio
- **Auth:** Supabase
- **Storage:** IndexedDB (binary/Blob data), Supabase (sync — future)

## Navigation (4 tabs)

```
VIST Studio  |  Explore  |  Generate  |  Director  |  Characters  |  Storyboard
```

| Workspace | Component | Purpose |
|---|---|---|
| `explore` | `ExplorePage.tsx` | Home/landing after login |
| `generate` | `GeneratorPage.tsx` | Module A: model-centric, fast |
| `director` | `DirectorStudio.tsx` | Module B: character/identity, premium |
| `characters` | `CharactersPage.tsx` | Character library hub + Soul ID training |
| `storyboard` | `StoryboardView.tsx` | Sequence builder |

## Key Files

| File | Role |
|---|---|
| `App.tsx` | Workspace router, all top-level handlers, modal state |
| `types.ts` | All enums and interfaces |
| `contexts/FormContext.tsx` | All form state (characters, scenario, lighting, provider, etc.) |
| `contexts/GalleryContext.tsx` | Generated content history |
| `contexts/CharacterLibraryContext.tsx` | Persistent character library (CRUD + Soul ID training) |
| `hooks/useGeneration.ts` | Central generation orchestrator |
| `services/storageService.ts` | IndexedDB open/migrate (owns `onupgradeneeded`) |
| `services/characterStorageService.ts` | IndexedDB CRUD for `characters` store |
| `services/geminiService.ts` | Gemini + Imagen 4 generation |
| `services/falService.ts` | FLUX Kontext, Seedream, LoRA training, video |
| `services/replicateService.ts` | FLUX.2 Max, Gen-4 Image, Virtual Try-On |
| `services/openaiService.ts` | GPT Image 1.5 / 1.0 |
| `services/ideogramService.ts` | Ideogram V3 / V2A |

## Data Model — `SavedCharacter`

```typescript
interface SavedCharacter {
  id: string;
  name: string;
  thumbnail: string;           // base64 data URL of first modelImage
  modelImageBlobs: Blob[];     // File[] stored natively in IndexedDB
  outfitBlob: Blob | null;
  outfitDescription: string;
  characteristics: string;
  accessory: string;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  loraUrl?: string;            // FAL storage URL of trained LoRA weights
  loraTrainingStatus?: 'idle' | 'training' | 'ready' | 'failed';
  loraTrainedAt?: number;
}
```

## IndexedDB Schema

- **DB name:** `VirtualInfluencerStudioDB`
- **Current version:** `3`
- **Migration owned by:** `services/storageService.ts` (`onupgradeneeded`)
- **Stores:** `generations`, `inspirations`, `characters`
- **Rule:** Other services open the DB at v3 WITHOUT their own `onupgradeneeded` — migration lives in one place only

## AI Providers & Models

| Provider | Key Models |
|---|---|
| Gemini | Flash, Flash2/NB2, Pro, Imagen4, Imagen4Ultra, Imagen4Fast |
| FAL | KontextMulti, KontextMaxMulti, Flux2Pro, Seedream45, Seedream50 |
| Replicate | Flux2Max, Gen4Image, IDMVTON (virtual try-on) |
| OpenAI | GptImage15, GptImage1 |
| Ideogram | V3, V2A, V2ATurbo |
| Video | KlingStandard, KlingPro, RunwayGen3, LumaDreamMachine |

## Form State Key Fields

```typescript
activeMode: 'create' | 'edit' | 'video'
characters[]: CharacterParams[]   // modelImages, outfitImages, characteristics, pose, ...
scenario, lighting, camera
aiProvider, geminiModel, falModel, replicateModel, openaiModel, ideogramModel
videoEngine, videoPrompt, videoImage
aspectRatio, imageSize, numberOfImages
cfg, steps, seed, negativePrompt, imageBoost
```

## Build

```bash
npm run build          # Vite production build — pre-existing 1.2MB chunk warning (expected)
npx tsc --noEmit       # Must return zero errors before committing
```

## Known Pitfalls

- **Circular context dependency:** `CharacterLibraryContext` must NOT import `FormContext`. Pass `updateCharacter` as a callback argument at the call site instead.
- **IndexedDB Blob storage:** `File extends Blob` — store File arrays directly as Blob arrays. Recreate File from Blob on load with `new File([blob], name, { type })`. No conversion needed.
- **FAL type casting:** `fal.subscribe` input types may be stricter than the actual API. Cast with `as any` where the SDK types lag the API spec.
- **DB version guard:** Always wrap new store creation in `!db.objectStoreNames.contains(storeName)` to keep migrations safe across incremental upgrades.
