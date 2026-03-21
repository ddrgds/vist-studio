# VIST Studio — Pipeline Flow Redesign & Character Creator Simplification

## Goal

Restructure VIST Studio around a 4-step creative pipeline (Create Character → Director → Editor → Photo Session), simplify the character creator from 6 steps to 3 with dual Builder/Prompt input, add iterative generation with consistency photos, introduce shared pipeline state between pages, and keep all engines available at every step (Soul is one option, not the only one).

## Scope

### In scope
1. Sidebar reorder to reflect pipeline flow
2. Character Creator: 6 steps → 3 steps with Builder/Prompt tabs
3. Iterative generation: variants → pick favorite → generate consistency shots (max 5)
4. Pipeline state store connecting pages (character → hero shot → edited → session)
5. CTA flow buttons at the end of each pipeline step
6. Flexible entry points (Editor direct, Director as converter)
7. "Save as character" from Editor
8. Prompt enhancement with Claude (optional, 2cr)

### Out of scope
- Universe Builder, Content Calendar, Analytics (stand by)
- Visual thumbnails for Builder chips (phase 2 — start with emoji + label)
- Soul ID training (requires 20+ photos, separate feature)
- Changes to AI Editor tool set (Relight, Face Swap, etc. stay as-is)

### Stand by pages
- Universe Builder
- Content Calendar
- Analytics

These are hidden from sidebar but code remains intact for future reactivation.
Their `Page` union type values (`'universe' | 'content' | 'analytics'`) remain in `App.tsx` for backward compatibility.

### File paths
All paths in this spec are relative to project root (no `src/` prefix). Example: `components/Sidebar.tsx` means `<project-root>/components/Sidebar.tsx`.

### Default page
After this redesign, the default page remains `'dashboard'` in `App.tsx`. The pipeline CTAs guide the creative flow, but Dashboard stays as the landing page for returning users who want an overview.

---

## Section 1: Sidebar & Navigation

### New sidebar order

```
─── PIPELINE (creative flow) ───
1. Create Character    ✏️  "Create / Import"
2. Director            🎬  "Hero Shot"
3. AI Editor           🪄  "Relight · Swap · Enhance"
4. Photo Session       📸  "Photo Shoot"

─── MANAGE ───
5. Dashboard           📊  "Overview"
6. Gallery             🖼️  "Creations"
7. Characters          👥  "Collection"

─── HIDDEN ───
Universe, Content Calendar, Analytics
(removed from sidebar, pages remain in codebase)
```

### Flow CTAs

Each pipeline page shows a contextual "next step" button after its primary action completes:

| Page | Trigger | CTA |
|------|---------|-----|
| Create Character | Character saved | "Create Hero Shot in Director →" |
| Director | Image generated | "Perfect it in Editor →" |
| AI Editor | Edit completed | "Start Photo Session →" |
| Photo Session | Session generated | "View in Gallery →" |

CTAs are suggestions, not mandatory. User can navigate freely via sidebar. CTAs use `pipelineStore` to pass context to the next page.

### Sidebar section title
Rename the current "CREATE" section to "PIPELINE" to reflect the sequential flow concept.

### CTA label strategy
Each pipeline page hardcodes its own CTA label and target. No dynamic lookup needed — the CTA is part of the page's JSX, shown conditionally after generation completes. `pipelineStore.suggestedNext` is used only for programmatic navigation, not label rendering.

### Files to modify
- `components/Sidebar.tsx` — reorder nav items, rename "CREATE" to "PIPELINE", hide stand-by pages
- `App.tsx` — keep lazy imports for stand-by pages (future reactivation), no other changes
- Each pipeline page — add CTA section at bottom/after generation

---

## Section 2: Character Creator Redesign

### Current state (6 steps)
1. Render Style
2. Identity (name, gender, age)
3. Face (shape, skin tone, skin texture, eye color, 6 facial sliders)
4. Body (type, 5 body sliders)
5. Personality (traits)
6. Fashion (styles, accessories)

### New state (3 steps)

#### Step A — Base (Render Style + Identity)

Combines current steps 1 and 2. No structural change, just merged into one view.

- **Render Style**: 6 visual cards (Photorealistic, Anime, 3D Render, Illustration, Stylized, Pixel Art) — kept as-is
- **Name**: text input
- **Gender**: chip selector (Female, Male, Non-Binary, Androgynous)
- **Age**: chip selector (18-22, 23-27, 28-32, etc.)

#### Step B — Look (Builder + Prompt tabs)

Two tabs sharing the same internal prompt state. Inspired by Higgsfield's dual Builder/Prompt approach.

**Tab "Builder"** — Visual chip selectors by category:

| Category | Options (emoji + label chips) |
|----------|-------------------------------|
| Hair Style | Long, Wavy, Curly, Pixie, Bob, Braids, Afro, Buzz Cut, Bald, Mohawk, Ponytail, etc. |
| Hair Color | Black, Brown, Blonde, Red, Auburn, White, Pink, Blue, Purple, Silver, etc. |
| Skin Tone | Light, Medium, Dark, Olive, Porcelain, Golden, Emerald, Lavender, etc. |
| Eye Color | Blue, Green, Brown, Hazel, Black, Red, Gold, Heterochromia, etc. |
| Face Shape | Oval, Angular, Round, Heart, Square, Diamond |
| Body Type | Slim, Athletic, Curvy, Muscular, Petite, Tall |
| Skin Texture | Human, Scales, Metallic, Crystal, Ethereal, Fur (only if render style ≠ photorealistic) |

Each chip click updates the shared internal prompt. Chips are phase C (emoji + label now, thumbnails later).

**Tab "Prompt"** — Free textarea:

```
┌────────────────────────────────────────────┐
│ Describe your character...                 │
│                                            │
│ Ex: "Athletic woman, short red hair,       │
│ heterochromatic eyes (green + blue),       │
│ freckles across the nose, confident look"  │
└────────────────────────────────────────────┘
[ ] Enhance prompt with AI (2cr)
```

- If user already selected chips in Builder, the auto-generated text appears as editable base
- Synchronization is **one-directional only**: Builder → Prompt. Editing the Prompt textarea does NOT update Builder chip selections (too complex, unreliable NLP parsing). User can switch tabs freely — Builder always reflects chip state, Prompt always reflects text state.
- Prompt enhancement calls Claude API to optimize for the selected engine

**Reference photos (always visible, below tabs):**

```
[+ Upload photos for better consistency]
"3-5 photos recommended for identity consistency"
```

- Optional at creation time
- If provided, these become the character's `modelImageBlobs`
- If not provided, the iterative generation step (after Step C) creates them

#### Step C — Style & Personality

- **Fashion Style**: multi-select chips, max 2 (Streetwear, High Fashion, Y2K, Gothic, Gorpcore, Coquette, etc.)
- **Soul Style**: optional, shown when Soul is the selected engine. Category-tabbed grid of 100+ Soul Styles (reuses existing `SOUL_STYLES` data)
- **Personality**: multi-select chips, max 3 (Bold, Mysterious, Playful, Intellectual, Fierce, Gentle, etc.)
- **Accessories**: multi-select chips (Sunglasses, Jewelry, Piercings, Tattoos, etc.)

### Iterative Generation (after Step C)

Flow:
1. User clicks "Generate Character" (Xcr based on engine)
2. System generates **3 variants**
3. User picks favorite(s)
4. Optional: "Generate variants for consistency?" → generates 2 more variations of the chosen one (Xcr)
5. Result: 1-5 reference photos saved as `modelImageBlobs`
6. User clicks "Save Character"
7. CTA: "Create Hero Shot in Director →"

Max 5 reference photos per character.

**Credit formula:** Each variant costs the selected engine's standard credit rate. Initial generation of 3 variants = 3x engine cost. Consistency variants = engine cost per variant. Example: Soul (6cr) → 3 variants = 18cr, then 2 consistency = 12cr → total 30cr. Gemini Flash (2cr) → 3 variants = 6cr, then 2 consistency = 4cr → total 10cr. Consistency variants use the same engine as the initial generation.

**Error handling:** If variant generation partially fails (e.g., 2 of 3 succeed), show the successful results with a "Retry failed" button. Credits are only deducted for successful generations (restore credits for failed ones via `restoreCredits()`).

### What gets saved to SavedCharacter

**Important:** `SavedCharacter` is defined in `stores/characterStore.ts` (canonical source). Update it there and ensure all consumers (`characterStorageService.ts`, `supabaseCharacterService.ts`) see the new optional fields.

```typescript
interface SavedCharacter {
  // Existing fields
  id: string
  name: string
  thumbnail: string              // Best variant chosen
  modelImageBlobs: Blob[]        // 1-5 consistency reference photos
  outfitBlob: Blob | null
  outfitDescription: string      // From Fashion selections
  characteristics: string        // From Builder chips OR Prompt textarea
  accessory: string
  createdAt: number
  updatedAt: number
  usageCount: number
  loraUrl?: string
  loraTrainingStatus?: 'idle' | 'training' | 'ready' | 'failed'
  loraTrainedAt?: number

  // New fields
  renderStyle?: string           // 'photorealistic' | 'anime' | '3d-render' | etc.
  soulStyleId?: string           // UUID if Soul Style was chosen
  personalityTraits?: string[]   // ['bold', 'mysterious', 'playful']
}
```

### Import mode

Import mode (upload existing images) stays as-is but simplified:
- Upload 1+ images
- Enter name
- Optionally describe style/characteristics
- Save → creates character with uploaded images as `modelImageBlobs`
- No wizard steps needed

### Files to create/modify
- `pages/UploadCharacter.tsx` — full rewrite of step system (6 → 3), add Builder/Prompt tabs, iterative generation
- `data/characterChips.ts` — new file with chip definitions extracted from current hardcoded arrays. Type structure:
  ```typescript
  interface ChipOption {
    id: string
    label: string
    emoji: string
    promptText: string  // What gets appended to prompt when selected
  }
  interface ChipCategory {
    id: string
    label: string
    options: ChipOption[]
    maxSelect?: number  // undefined = single select
  }
  ```
- `services/promptEnhancer.ts` — new file for prompt enhancement (uses existing Gemini/OpenAI proxies)
- `stores/characterStore.ts` — add `renderStyle`, `soulStyleId`, `personalityTraits` to SavedCharacter interface

---

## Section 3: Pipeline State Store

### New store: `pipelineStore`

Replaces `navigationStore` for pipeline flow. `navigationStore` is kept for point-to-point transfers (Gallery → Editor).

```typescript
// stores/pipelineStore.ts
interface PipelineState {
  // Active character in pipeline
  characterId: string | null

  // Image progressing through pipeline
  heroShotUrl: string | null
  heroShotFile: File | null
  editedHeroUrl: string | null
  editedHeroFile: File | null

  // Context
  lastEngine: string | null
  lastSoulStyleId: string | null

  // Navigation hint
  suggestedNext: Page | null
}

interface PipelineActions {
  setCharacter: (id: string) => void
  setHeroShot: (url: string, file?: File) => void
  setEditedHero: (url: string, file?: File) => void
  setSuggestedNext: (page: Page | null) => void
  clear: () => void
}
```

### Data flow between pages

```
Create Character
  → characterStore.addCharacter(char)
  → pipelineStore.setCharacter(char.id)
  → pipelineStore.setSuggestedNext('director')

Director
  → reads pipelineStore.characterId
  → auto-selects character, loads modelImageBlobs as face refs
  → generates hero shot
  → pipelineStore.setHeroShot(resultUrl, resultFile)
  → pipelineStore.setSuggestedNext('editor')

AI Editor
  → reads pipelineStore.heroShotUrl
  → auto-loads as canvas base image
  → user edits
  → pipelineStore.setEditedHero(resultUrl, resultFile)
  → pipelineStore.setSuggestedNext('session')

Photo Session
  → reads pipelineStore.editedHeroUrl ?? pipelineStore.heroShotUrl
  → auto-loads as subject/reference image
  → generates session
  → pipelineStore.setSuggestedNext('gallery')
```

### Rules
- Pipeline state persists until user clears it or starts a new character
- No timeout (unlike navigationStore's 10s)
- **No `zustand/persist`** — pipelineStore is ephemeral (in-memory only). `File` objects are not serializable. Pipeline state is lost on page refresh, which is acceptable since it's a convenience feature, not critical data. The actual images are saved in galleryStore.
- Every page works WITHOUT pipeline state (free entry, Brumi case)
- If pipeline state exists, pages auto-load from it (convenience)
- If no pipeline state, pages work exactly as they do today
- `navigationStore` kept for Gallery → Editor, Gallery → Session, and `navigateToUpload()` point transfers

### Files to create/modify
- `stores/pipelineStore.ts` — new Zustand store
- `pages/Director.tsx` — read pipelineStore on mount, auto-select character
- `pages/AIEditor.tsx` — read pipelineStore on mount, auto-load hero shot
- `pages/PhotoSession.tsx` — read pipelineStore on mount, auto-load edited hero
- `App.tsx` — add StoreHydrator for pipelineStore if needed

---

## Section 4: Engine Agnosticism & Soul Styles

### Principle

Every pipeline step keeps all its engines. Soul is one option, not the default. Engine choice depends on the character type (photorealistic → Soul, anime → Gemini/Fal, 2D→3D conversion → any).

### Director engines (no change)
- Auto (Gemini) — default
- Soul 2.0 (Higgsfield) — 6cr
- Flux (Replicate)
- DALL-E (OpenAI)
- Fal models

When Soul selected → Soul Style picker appears (category tabs + grid). Otherwise hidden.

### AI Editor (no change)
Each tool has its own model. No engine selector. No Soul integration here.

### Photo Session engines (no change)
- Grok Imagine — 1cr (default)
- Gemini Edit — 1cr
- Seedream 5 Edit — 8cr
- Soul 2.0 — 6cr

When Soul selected → vibes panel swaps to Soul Styles grid (already implemented). All other engines show standard vibes.

### Prompt Enhancement (new)

Available in:
- Character Creator (Step B, Prompt tab)
- Director (scenario field)

Implementation:
- Toggle checkbox: "Enhance with AI (2cr)"
- Uses existing `/gemini-api` proxy (Gemini Flash — already configured, no extra API cost)
- Fallback: `/openai-api` proxy (GPT-5 Nano) if Gemini fails
- **No new infrastructure needed** — both proxies already exist in Cloudflare
- Input: user prompt + engine name + character context (render style, traits)
- Output: optimized prompt — user can accept or discard
- Cost: 2 credits (VIST credits, not API cost — Gemini Flash is free tier)

### Files to create/modify
- `services/promptEnhancer.ts` — new: `enhancePrompt(prompt, engine, context) → string` using geminiService or openaiService
- `pages/UploadCharacter.tsx` — add enhancement toggle in Prompt tab
- `pages/Director.tsx` — add enhancement toggle in scenario section

---

## Section 5: Flexible Entry Points

### Entry 1 — Full pipeline (new character)
```
Create Character → Director → Editor → Session
```
Standard flow guided by CTAs and pipelineStore.

### Entry 2 — Editor direct (existing character, e.g. Brumi 2D→3D)
```
AI Editor (load image, convert/edit) → Save as character OR → Session
```

New feature in Editor: "Save as Character" button in action bar.
- Opens mini-modal: name input + optional extra photos
- Creates SavedCharacter with defaults:
  - `thumbnail`: edited image URL
  - `modelImageBlobs`: [edited image blob] + any extra photos uploaded
  - `characteristics`: '' (empty — user can edit later in Characters page)
  - `outfitDescription`: ''
  - `accessory`: ''
  - `renderStyle`: 'photorealistic' (default assumption)
  - `personalityTraits`: []
- Updates pipelineStore.characterId

### Entry 3 — Director as converter (2D refs → 3D output)
```
Director (upload 2D refs + prompt "convert to 3D") → Editor → Session
```

No functional changes needed. Director already supports face refs without a selected character. Only UX tweak: if no character selected but face refs uploaded, button says "Generate Image" instead of "Generate Hero Shot".

### navigationStore kept for
- Gallery → Editor (click "Edit" on image)
- Gallery → Session (click "Start Session" on image)
- Characters → Director (click "Hero Shot" on character card)

These are point transfers, not pipeline flows.

### Files to modify
- `pages/AIEditor.tsx` — add "Save as Character" button + mini-modal
- `pages/Director.tsx` — conditional button label
- `stores/characterStore.ts` — ensure addCharacter works from Editor context

---

## Migration & Backward Compatibility

- All existing characters in characterStore remain valid (new fields are optional)
- Gallery items unchanged
- Import mode simplified but functionally equivalent
- navigationStore kept alongside pipelineStore (no breaking change)
- Stand-by pages code stays in codebase, only sidebar visibility changes
- No database migrations needed (new fields are client-side optional)

## Implementation Order (suggested)

1. Pipeline store + sidebar reorder (foundation)
2. Character Creator rewrite (3 steps + Builder/Prompt + iterative generation)
3. Pipeline CTAs + auto-loading in Director/Editor/Session
4. Editor "Save as Character" feature
5. Prompt enhancement with Claude
6. Polish: conditional labels, empty states, transitions
