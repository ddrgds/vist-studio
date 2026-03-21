# Pipeline Flow Redesign & Character Creator Simplification — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure VIST Studio around a 4-step creative pipeline with a simplified character creator, shared pipeline state, and flow CTAs — while keeping all engines available at every step.

**Architecture:** New `pipelineStore` (Zustand) connects 4 pipeline pages (Create → Director → Editor → Session). Character creator goes from 6 steps to 3 with dual Builder/Prompt tabs. Sidebar reordered to reflect pipeline flow. Existing `navigationStore` kept for point-to-point transfers.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, Vite. Existing Gemini/OpenAI/Fal/Higgsfield service layer unchanged.

**Spec:** `docs/superpowers/specs/2026-03-14-pipeline-flow-redesign.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `stores/pipelineStore.ts` | Pipeline state: active character, hero shot, edited hero, suggested next page |
| `data/characterChips.ts` | Chip definitions for Builder tab (hair, skin, eyes, body, etc.) |
| `components/PipelineCTA.tsx` | Reusable "next step" CTA button component |

### Modified files
| File | Changes |
|------|---------|
| `components/Sidebar.tsx` | Reorder to PIPELINE + MANAGE sections, hide stand-by pages |
| `stores/characterStore.ts` | Add `renderStyle`, `soulStyleId`, `personalityTraits` to SavedCharacter |
| `pages/UploadCharacter.tsx` | Full rewrite: 6 steps → 3 steps, Builder/Prompt tabs, iterative generation |
| `pages/Director.tsx` | Read pipelineStore on mount, auto-select character, add CTA, conditional button label |
| `pages/AIEditor.tsx` | Read pipelineStore on mount, auto-load hero shot, add "Save as Character" + CTA |
| `pages/PhotoSession.tsx` | Read pipelineStore on mount, auto-load edited hero, add CTA |

### Unchanged files
| File | Why |
|------|-----|
| `services/geminiService.ts` | Already has `enhancePrompt()` — we reuse it directly |
| `services/higgsfieldService.ts` | Already accepts `styleId` param |
| `data/soulStyles.ts` | Already complete with 100+ styles |
| `data/sessionPresets.ts` | Stays as-is for non-Soul engines |
| `stores/navigationStore.ts` | Kept for Gallery → Editor/Session point transfers |

---

## Chunk 1: Foundation (Pipeline Store + Sidebar + Character Store)

### Task 1: Create pipelineStore

**Files:**
- Create: `stores/pipelineStore.ts`

- [ ] **Step 1: Create the pipeline store**

```typescript
// stores/pipelineStore.ts
import { create } from 'zustand'
import type { Page } from '../App'

interface PipelineState {
  characterId: string | null
  heroShotUrl: string | null
  heroShotFile: File | null
  editedHeroUrl: string | null
  editedHeroFile: File | null
  lastEngine: string | null
  lastSoulStyleId: string | null
  suggestedNext: Page | null
}

interface PipelineActions {
  setCharacter: (id: string) => void
  setHeroShot: (url: string, file?: File) => void
  setEditedHero: (url: string, file?: File) => void
  setLastEngine: (engine: string, soulStyleId?: string) => void
  setSuggestedNext: (page: Page | null) => void
  clear: () => void
}

export const usePipelineStore = create<PipelineState & PipelineActions>((set) => ({
  characterId: null,
  heroShotUrl: null,
  heroShotFile: null,
  editedHeroUrl: null,
  editedHeroFile: null,
  lastEngine: null,
  lastSoulStyleId: null,
  suggestedNext: null,

  setCharacter: (id) => set({ characterId: id, heroShotUrl: null, heroShotFile: null, editedHeroUrl: null, editedHeroFile: null, suggestedNext: 'director' }),
  setHeroShot: (url, file) => set({ heroShotUrl: url, heroShotFile: file ?? null, suggestedNext: 'editor' }),
  setEditedHero: (url, file) => set({ editedHeroUrl: url, editedHeroFile: file ?? null, suggestedNext: 'session' }),
  setLastEngine: (engine, soulStyleId) => set({ lastEngine: engine, lastSoulStyleId: soulStyleId ?? null }),
  setSuggestedNext: (page) => set({ suggestedNext: page }),
  clear: () => set({ characterId: null, heroShotUrl: null, heroShotFile: null, editedHeroUrl: null, editedHeroFile: null, lastEngine: null, lastSoulStyleId: null, suggestedNext: null }),
}))
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep pipelineStore`
Expected: No errors from pipelineStore.ts

- [ ] **Step 3: Commit**

```bash
git add stores/pipelineStore.ts
git commit -m "feat: add pipelineStore for cross-page pipeline state"
```

---

### Task 2: Update SavedCharacter interface

**Files:**
- Modify: `stores/characterStore.ts`

- [ ] **Step 1: Add new optional fields to SavedCharacter**

Add these fields at the end of the `SavedCharacter` interface:

```typescript
  // New fields for pipeline redesign
  renderStyle?: string           // 'photorealistic' | 'anime' | '3d-render' | 'illustration' | 'stylized' | 'pixel-art'
  soulStyleId?: string           // UUID if Soul Style was chosen
  personalityTraits?: string[]   // e.g. ['bold', 'mysterious', 'playful']
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep characterStore`
Expected: No new errors (fields are optional, so existing code is unaffected)

- [ ] **Step 3: Commit**

```bash
git add stores/characterStore.ts
git commit -m "feat: add renderStyle, soulStyleId, personalityTraits to SavedCharacter"
```

---

### Task 3: Reorder Sidebar

**Files:**
- Modify: `components/Sidebar.tsx`

- [ ] **Step 1: Reorder navSections to reflect pipeline flow**

Replace the `navSections` array with:

```typescript
const navSections: { title?: string; items: { id: Page; label: string; Icon: typeof LayoutDashboard; sub: string }[] }[] = [
  {
    title: 'PIPELINE',
    items: [
      { id: 'upload', label: 'Create Character', Icon: Upload, sub: 'Create / Import' },
      { id: 'director', label: 'Director', Icon: Clapperboard, sub: 'Hero Shot' },
      { id: 'editor', label: 'AI Editor', Icon: Wand2, sub: 'Relight · Swap · Enhance' },
      { id: 'session', label: 'Photo Session', Icon: Camera, sub: 'Photo Shoot' },
    ],
  },
  {
    title: 'MANAGE',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, sub: 'Overview' },
      { id: 'gallery', label: 'Gallery', Icon: Images, sub: 'Creations' },
      { id: 'characters', label: 'Characters', Icon: Users, sub: 'Collection' },
    ],
  },
]
```

This removes Universe, Content Calendar, and Analytics from the sidebar. Their page code remains in `App.tsx` for future reactivation.

- [ ] **Step 2: Verify sidebar renders correctly**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds. Then run dev server and visually confirm:
- PIPELINE section shows: Create Character → Director → AI Editor → Photo Session
- MANAGE section shows: Dashboard, Gallery, Characters
- No Universe/Calendar/Analytics visible

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat: reorder sidebar — PIPELINE flow + MANAGE sections, hide stand-by pages"
```

---

### Task 4: Create PipelineCTA component

**Files:**
- Create: `components/PipelineCTA.tsx`

- [ ] **Step 1: Create the reusable CTA component**

```tsx
// components/PipelineCTA.tsx
import React from 'react'
import type { Page } from '../App'

interface PipelineCTAProps {
  label: string
  targetPage: Page
  onNav: (page: Page) => void
  icon?: string
}

export function PipelineCTA({ label, targetPage, onNav, icon }: PipelineCTAProps) {
  return (
    <button
      onClick={() => onNav(targetPage)}
      className="w-full mt-4 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all group"
      style={{
        background: 'linear-gradient(135deg, rgba(240,104,72,.1), rgba(208,72,176,.1))',
        border: '1px solid rgba(240,104,72,.2)',
      }}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span className="text-[12px] font-medium" style={{ color: 'var(--joi-pink)' }}>
        {label}
      </span>
      <span className="text-[14px] ml-1 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--joi-pink)' }}>
        →
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep PipelineCTA`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/PipelineCTA.tsx
git commit -m "feat: add PipelineCTA reusable component for pipeline flow navigation"
```

---

## Chunk 2: Character Creator Rewrite

### Task 5: Create characterChips data file

**Files:**
- Create: `data/characterChips.ts`

- [ ] **Step 1: Create chip definitions**

Extract the hardcoded arrays from `pages/UploadCharacter.tsx` into a structured data file:

```typescript
// data/characterChips.ts

export interface ChipOption {
  id: string
  label: string
  emoji: string
  promptText: string  // Appended to prompt when selected
}

export interface ChipCategory {
  id: string
  label: string
  options: ChipOption[]
  maxSelect?: number  // undefined = single select
}

export const HAIR_STYLES: ChipOption[] = [
  { id: 'long-straight', label: 'Long Straight', emoji: '💇', promptText: 'long straight hair' },
  { id: 'wavy', label: 'Wavy', emoji: '🌊', promptText: 'wavy hair' },
  { id: 'curly', label: 'Curly', emoji: '➰', promptText: 'curly hair' },
  { id: 'pixie', label: 'Pixie', emoji: '✂️', promptText: 'pixie cut' },
  { id: 'bob', label: 'Bob', emoji: '💁', promptText: 'bob haircut' },
  { id: 'braids', label: 'Braids', emoji: '🎀', promptText: 'braided hair' },
  { id: 'afro', label: 'Afro', emoji: '🌀', promptText: 'afro hairstyle' },
  { id: 'buzz', label: 'Buzz Cut', emoji: '💈', promptText: 'buzz cut' },
  { id: 'bald', label: 'Bald', emoji: '🌕', promptText: 'bald head' },
  { id: 'mohawk', label: 'Mohawk', emoji: '🦅', promptText: 'mohawk hairstyle' },
  { id: 'ponytail', label: 'Ponytail', emoji: '🎗️', promptText: 'ponytail' },
  { id: 'space-buns', label: 'Space Buns', emoji: '🪐', promptText: 'space buns hairstyle' },
  { id: 'dreadlocks', label: 'Dreadlocks', emoji: '🦁', promptText: 'dreadlocks' },
  { id: 'undercut', label: 'Undercut', emoji: '💎', promptText: 'undercut hairstyle' },
  { id: 'twin-tails', label: 'Twin Tails', emoji: '🎀', promptText: 'twin tails' },
  { id: 'shaggy', label: 'Shaggy', emoji: '🐕', promptText: 'shaggy layered hair' },
]

export const HAIR_COLORS: ChipOption[] = [
  { id: 'black', label: 'Black', emoji: '⬛', promptText: 'black hair' },
  { id: 'brown', label: 'Brown', emoji: '🟫', promptText: 'brown hair' },
  { id: 'blonde', label: 'Blonde', emoji: '🟡', promptText: 'blonde hair' },
  { id: 'red', label: 'Red', emoji: '🔴', promptText: 'red hair' },
  { id: 'auburn', label: 'Auburn', emoji: '🍂', promptText: 'auburn hair' },
  { id: 'white', label: 'White', emoji: '⬜', promptText: 'white hair' },
  { id: 'gray', label: 'Gray/Silver', emoji: '🩶', promptText: 'silver gray hair' },
  { id: 'pink', label: 'Pink', emoji: '🩷', promptText: 'pink hair' },
  { id: 'blue', label: 'Blue', emoji: '🔵', promptText: 'blue hair' },
  { id: 'purple', label: 'Purple', emoji: '🟣', promptText: 'purple hair' },
  { id: 'green', label: 'Green', emoji: '🟢', promptText: 'green hair' },
  { id: 'neon-pink', label: 'Neon Pink', emoji: '💗', promptText: 'neon pink hair' },
  { id: 'fire-red', label: 'Fire Red', emoji: '🔥', promptText: 'bright fire red hair' },
]

export const SKIN_TONES: ChipOption[] = [
  { id: 'light', label: 'Light', emoji: '🏻', promptText: 'light skin tone' },
  { id: 'medium', label: 'Medium', emoji: '🏽', promptText: 'medium skin tone' },
  { id: 'dark', label: 'Dark', emoji: '🏿', promptText: 'dark skin tone' },
  { id: 'olive', label: 'Olive', emoji: '🫒', promptText: 'olive skin tone' },
  { id: 'tan', label: 'Tan', emoji: '🏖️', promptText: 'tan skin' },
  { id: 'porcelain', label: 'Porcelain', emoji: '🤍', promptText: 'porcelain pale skin' },
  { id: 'golden', label: 'Golden', emoji: '✨', promptText: 'golden skin tone' },
  { id: 'emerald', label: 'Emerald', emoji: '💚', promptText: 'emerald green fantasy skin' },
  { id: 'lavender', label: 'Lavender', emoji: '💜', promptText: 'lavender purple fantasy skin' },
  { id: 'obsidian', label: 'Obsidian', emoji: '🖤', promptText: 'obsidian dark fantasy skin' },
  { id: 'silver', label: 'Silver', emoji: '🩶', promptText: 'metallic silver skin' },
]

export const EYE_COLORS: ChipOption[] = [
  { id: 'blue', label: 'Blue', emoji: '🔵', promptText: 'blue eyes' },
  { id: 'green', label: 'Green', emoji: '🟢', promptText: 'green eyes' },
  { id: 'brown', label: 'Brown', emoji: '🟤', promptText: 'brown eyes' },
  { id: 'hazel', label: 'Hazel', emoji: '🫒', promptText: 'hazel eyes' },
  { id: 'black', label: 'Black', emoji: '⚫', promptText: 'deep black eyes' },
  { id: 'amber', label: 'Amber', emoji: '🟠', promptText: 'amber golden eyes' },
  { id: 'red', label: 'Red', emoji: '🔴', promptText: 'red glowing eyes' },
  { id: 'gold', label: 'Gold', emoji: '🥇', promptText: 'gold glowing eyes' },
  { id: 'silver', label: 'Silver', emoji: '🩶', promptText: 'silver metallic eyes' },
  { id: 'heterochromia', label: 'Heterochromia', emoji: '🎭', promptText: 'heterochromatic eyes, one blue one green' },
  { id: 'cyan', label: 'Cyan', emoji: '🩵', promptText: 'cyan glowing eyes' },
  { id: 'pink', label: 'Pink', emoji: '🩷', promptText: 'pink glowing eyes' },
]

export const FACE_SHAPES: ChipOption[] = [
  { id: 'oval', label: 'Oval', emoji: '🥚', promptText: 'oval face shape' },
  { id: 'angular', label: 'Angular', emoji: '💎', promptText: 'angular sharp face shape' },
  { id: 'round', label: 'Round', emoji: '🟠', promptText: 'round soft face shape' },
  { id: 'heart', label: 'Heart', emoji: '💜', promptText: 'heart-shaped face' },
  { id: 'square', label: 'Square', emoji: '🟦', promptText: 'square jawline face' },
  { id: 'diamond', label: 'Diamond', emoji: '♦️', promptText: 'diamond face shape, prominent cheekbones' },
]

export const BODY_TYPES: ChipOption[] = [
  { id: 'slim', label: 'Slim', emoji: '🧍', promptText: 'slim body type' },
  { id: 'athletic', label: 'Athletic', emoji: '🏃', promptText: 'athletic toned body' },
  { id: 'curvy', label: 'Curvy', emoji: '💃', promptText: 'curvy body type' },
  { id: 'muscular', label: 'Muscular', emoji: '💪', promptText: 'muscular body build' },
  { id: 'petite', label: 'Petite', emoji: '🌸', promptText: 'petite small frame' },
  { id: 'tall', label: 'Tall', emoji: '📏', promptText: 'tall body frame' },
]

export const SKIN_TEXTURES: ChipOption[] = [
  { id: 'human', label: 'Human', emoji: '🧑', promptText: 'natural human skin texture with visible pores' },
  { id: 'scales', label: 'Scales', emoji: '🐉', promptText: 'iridescent reptilian scales' },
  { id: 'metallic', label: 'Metallic', emoji: '🤖', promptText: 'brushed chrome and titanium skin panels' },
  { id: 'crystal', label: 'Crystal', emoji: '💎', promptText: 'translucent crystalline skin with refraction' },
  { id: 'ethereal', label: 'Ethereal', emoji: '👻', promptText: 'translucent ethereal form with internal light' },
  { id: 'fur', label: 'Fur', emoji: '🐺', promptText: 'dense soft fur with individual strand rendering' },
  { id: 'bark', label: 'Bark', emoji: '🌳', promptText: 'living bark texture with deep fissures' },
  { id: 'stone', label: 'Stone', emoji: '🪨', promptText: 'volcanic basalt and granite surface' },
]

export const GENDERS: ChipOption[] = [
  { id: 'female', label: 'Female', emoji: '♀️', promptText: 'female' },
  { id: 'male', label: 'Male', emoji: '♂️', promptText: 'male' },
  { id: 'non-binary', label: 'Non-Binary', emoji: '⚧️', promptText: 'non-binary androgynous' },
  { id: 'androgynous', label: 'Androgynous', emoji: '✦', promptText: 'androgynous appearance' },
]

export const AGE_RANGES: ChipOption[] = [
  { id: '18-22', label: '18-22', emoji: '🌱', promptText: '18-22 years old, young adult' },
  { id: '23-27', label: '23-27', emoji: '🌿', promptText: '23-27 years old' },
  { id: '28-32', label: '28-32', emoji: '🌳', promptText: '28-32 years old' },
  { id: '33-37', label: '33-37', emoji: '🍂', promptText: '33-37 years old' },
  { id: '38-45', label: '38-45', emoji: '🏔️', promptText: '38-45 years old, mature' },
  { id: '46-55', label: '46-55', emoji: '🌊', promptText: '46-55 years old, distinguished' },
  { id: 'ageless', label: 'Ageless', emoji: '♾️', promptText: 'ageless, timeless appearance' },
]

export const PERSONALITY_TRAITS: ChipOption[] = [
  { id: 'bold', label: 'Bold', emoji: '🔥', promptText: 'bold confident expression' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🎭', promptText: 'mysterious enigmatic gaze' },
  { id: 'playful', label: 'Playful', emoji: '😄', promptText: 'playful fun energy' },
  { id: 'intellectual', label: 'Intellectual', emoji: '🧠', promptText: 'intellectual thoughtful demeanor' },
  { id: 'fierce', label: 'Fierce', emoji: '🐆', promptText: 'fierce powerful presence' },
  { id: 'gentle', label: 'Gentle', emoji: '🕊️', promptText: 'gentle soft serene aura' },
  { id: 'rebel', label: 'Rebel', emoji: '⚡', promptText: 'rebellious defiant attitude' },
  { id: 'elegant', label: 'Elegant', emoji: '👑', promptText: 'elegant refined grace' },
  { id: 'adventurous', label: 'Adventurous', emoji: '🧭', promptText: 'adventurous daring spirit' },
  { id: 'charismatic', label: 'Charismatic', emoji: '✨', promptText: 'charismatic magnetic presence' },
  { id: 'stoic', label: 'Stoic', emoji: '🗿', promptText: 'stoic calm composed expression' },
  { id: 'dreamer', label: 'Dreamer', emoji: '☁️', promptText: 'dreamy ethereal gaze' },
]

export const FASHION_STYLES: ChipOption[] = [
  { id: 'streetwear', label: 'Streetwear', emoji: '👟', promptText: 'urban streetwear fashion' },
  { id: 'high-fashion', label: 'High Fashion', emoji: '👗', promptText: 'high fashion editorial outfit' },
  { id: 'bohemian', label: 'Bohemian', emoji: '🌻', promptText: 'bohemian free-spirited clothing' },
  { id: 'minimalist', label: 'Minimalist', emoji: '◻️', promptText: 'minimalist clean outfit' },
  { id: 'y2k', label: 'Y2K', emoji: '💿', promptText: 'Y2K fashion aesthetic' },
  { id: 'dark-academia', label: 'Dark Academia', emoji: '📚', promptText: 'dark academia scholarly outfit' },
  { id: 'cottagecore', label: 'Cottagecore', emoji: '🌾', promptText: 'cottagecore pastoral clothing' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🔮', promptText: 'cyberpunk futuristic outfit' },
  { id: 'old-money', label: 'Old Money', emoji: '💰', promptText: 'old money quiet luxury outfit' },
  { id: 'avant-garde', label: 'Avant-Garde', emoji: '🎨', promptText: 'avant-garde experimental fashion' },
  { id: 'athleisure', label: 'Athleisure', emoji: '🏋️', promptText: 'athleisure sporty outfit' },
  { id: 'gothic', label: 'Gothic', emoji: '🖤', promptText: 'gothic dark fashion' },
  { id: 'gorpcore', label: 'Gorpcore', emoji: '🏔️', promptText: 'gorpcore outdoor technical wear' },
  { id: 'coquette', label: 'Coquette', emoji: '🎀', promptText: 'coquette feminine bows and lace' },
  { id: 'grunge', label: 'Grunge', emoji: '🎸', promptText: 'grunge distressed layered clothing' },
  { id: 'techwear', label: 'Techwear', emoji: '⚙️', promptText: 'techwear functional futuristic gear' },
  { id: 'retro-70s', label: 'Retro 70s', emoji: '🕺', promptText: 'retro 70s vintage clothing' },
  { id: 'kawaii', label: 'Kawaii', emoji: '🍡', promptText: 'kawaii cute Japanese street fashion' },
  { id: 'western', label: 'Western', emoji: '🤠', promptText: 'western cowboy outfit' },
  { id: 'fantasy-armor', label: 'Fantasy Armor', emoji: '🛡️', promptText: 'fantasy armor ornate battle gear' },
  { id: 'sci-fi-suit', label: 'Sci-Fi Suit', emoji: '🚀', promptText: 'sci-fi futuristic suit' },
  { id: 'royal', label: 'Royal/Regal', emoji: '👑', promptText: 'royal regal clothing with crown' },
]

export const ACCESSORIES: ChipOption[] = [
  { id: 'sunglasses', label: 'Sunglasses', emoji: '🕶️', promptText: 'wearing sunglasses' },
  { id: 'piercings', label: 'Piercings', emoji: '💎', promptText: 'with piercings' },
  { id: 'tattoos', label: 'Tattoos', emoji: '🎨', promptText: 'with visible tattoos' },
  { id: 'jewelry', label: 'Jewelry', emoji: '💍', promptText: 'wearing elegant jewelry' },
  { id: 'hat', label: 'Hat', emoji: '🎩', promptText: 'wearing a hat' },
  { id: 'scarf', label: 'Scarf', emoji: '🧣', promptText: 'with a scarf' },
  { id: 'watch', label: 'Watch', emoji: '⌚', promptText: 'wearing a luxury watch' },
  { id: 'choker', label: 'Choker', emoji: '📿', promptText: 'wearing a choker necklace' },
  { id: 'crown', label: 'Crown/Tiara', emoji: '👑', promptText: 'wearing a crown or tiara' },
  { id: 'mask', label: 'Mask', emoji: '🎭', promptText: 'wearing a decorative mask' },
  { id: 'wings', label: 'Wings', emoji: '🪽', promptText: 'with ornate wings' },
  { id: 'horns', label: 'Horns', emoji: '🦌', promptText: 'with horns on head' },
  { id: 'elf-ears', label: 'Elf Ears', emoji: '🧝', promptText: 'with pointed elf ears' },
  { id: 'tail', label: 'Tail', emoji: '🦊', promptText: 'with a tail' },
]

/**
 * Build a prompt string from selected chips across all categories.
 * Each selected chip's promptText is concatenated.
 */
export function buildPromptFromChips(selections: Record<string, string[]>): string {
  const allChips: Record<string, ChipOption[]> = {
    hairStyle: HAIR_STYLES,
    hairColor: HAIR_COLORS,
    skinTone: SKIN_TONES,
    eyeColor: EYE_COLORS,
    faceShape: FACE_SHAPES,
    bodyType: BODY_TYPES,
    skinTexture: SKIN_TEXTURES,
    gender: GENDERS,
    age: AGE_RANGES,
    personality: PERSONALITY_TRAITS,
    fashion: FASHION_STYLES,
    accessories: ACCESSORIES,
  }

  const parts: string[] = []
  for (const [category, selectedIds] of Object.entries(selections)) {
    const chips = allChips[category]
    if (!chips) continue
    for (const id of selectedIds) {
      const chip = chips.find(c => c.id === id)
      if (chip) parts.push(chip.promptText)
    }
  }

  return parts.join(', ')
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep characterChips`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add data/characterChips.ts
git commit -m "feat: add characterChips data file with Builder chip definitions and prompt builder"
```

---

### Task 6: Rewrite UploadCharacter.tsx — 3-step wizard with Builder/Prompt tabs

**Files:**
- Modify: `pages/UploadCharacter.tsx` (full rewrite)

This is the largest task. The current file is ~1800 lines with a 6-step wizard. We rewrite it as a 3-step wizard with Builder/Prompt dual tabs.

- [ ] **Step 1: Rewrite the page**

The new page structure:

```
Mode: 'create' | 'import'

Create mode — 3 steps:
  Step 0: Base (Render Style + Name + Gender + Age)
  Step 1: Look (Builder tab | Prompt tab + Reference photos)
  Step 2: Style (Fashion + Soul Style + Personality + Accessories)

After Step 2: Iterative generation zone
  - Generate 3 variants
  - Pick favorite
  - Optional: generate 2 more consistency variants
  - Save character

Import mode (simplified):
  - Upload images
  - Name + optional description
  - Save
```

Key implementation details:

**State for Builder tab chips:**
```typescript
const [chipSelections, setChipSelections] = useState<Record<string, string[]>>({
  hairStyle: [],
  hairColor: [],
  skinTone: [],
  eyeColor: [],
  faceShape: [],
  bodyType: [],
  skinTexture: [],
})
```

**State for Prompt tab:**
```typescript
const [promptText, setPromptText] = useState('')
const [activeTab, setActiveTab] = useState<'builder' | 'prompt'>('builder')
```

**Sync: Builder → Prompt (one-directional):**
```typescript
// When user switches from Builder to Prompt tab, auto-fill with chip selections
useEffect(() => {
  if (activeTab === 'prompt' && !promptText) {
    setPromptText(buildPromptFromChips(chipSelections))
  }
}, [activeTab])
```

**Iterative generation state:**
```typescript
const [variants, setVariants] = useState<string[]>([])       // Generated variant URLs
const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
const [consistencyPhotos, setConsistencyPhotos] = useState<string[]>([]) // Extra variants of chosen
const [generationPhase, setGenerationPhase] = useState<'idle' | 'generating' | 'picking' | 'consistency' | 'done'>('idle')
```

**Generation flow:**
```typescript
const handleGenerateVariants = async () => {
  setGenerationPhase('generating')
  const prompt = activeTab === 'prompt' ? promptText : buildPromptFromChips(chipSelections)
  const renderStyle = renderStyles[selRenderStyle]
  const fullPrompt = `${renderStyle.prompt} ${genders[selGender].promptText} ${ages[selAge].promptText}. ${prompt}. ${renderStyle.scenario}`

  // Generate 3 variants
  const results: string[] = []
  for (let i = 0; i < 3; i++) {
    try {
      const ok = await decrementCredits(engineCost)
      if (!ok) break
      const urls = await generateImage(fullPrompt, ...)
      if (urls.length > 0) results.push(urls[0])
    } catch (err) {
      restoreCredits(engineCost)
      toast.error(`Variant ${i + 1} failed`)
    }
  }
  setVariants(results)
  setGenerationPhase(results.length > 0 ? 'picking' : 'idle')
}

const handleGenerateConsistency = async () => {
  setGenerationPhase('consistency')
  const baseVariant = variants[selectedVariant!]
  // Generate 2 more variations of the selected one
  const results: string[] = []
  for (let i = 0; i < 2; i++) {
    try {
      const ok = await decrementCredits(engineCost)
      if (!ok) break
      const urls = await generateImage(prompt + ' Same character, different angle/expression', ...)
      if (urls.length > 0) results.push(urls[0])
    } catch (err) {
      restoreCredits(engineCost)
    }
  }
  setConsistencyPhotos(results)
  setGenerationPhase('done')
}
```

**Save character:**
```typescript
const handleSave = async () => {
  const allPhotos = [variants[selectedVariant!], ...consistencyPhotos]
  const blobs = await Promise.all(allPhotos.map(async url => {
    const res = await fetch(url)
    return res.blob()
  }))

  const char: SavedCharacter = {
    id: crypto.randomUUID(),
    name,
    thumbnail: allPhotos[0],
    modelImageBlobs: blobs,
    outfitBlob: null,
    outfitDescription: buildPromptFromChips({ fashion: chipSelections.fashion || [] }),
    characteristics: activeTab === 'prompt' ? promptText : buildPromptFromChips(chipSelections),
    accessory: (chipSelections.accessories || []).join(', '),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    renderStyle: renderStyles[selRenderStyle].id,
    soulStyleId: selectedSoulStyle || undefined,
    personalityTraits: chipSelections.personality || [],
  }

  addCharacter(char)
  usePipelineStore.getState().setCharacter(char.id)
  toast.success(`${name} created!`)
}
```

**Note:** The full JSX for this page is ~800 lines. The implementer should:
1. Keep the existing render style cards (they work well)
2. Replace steps 2-6 with the 3 new steps
3. Keep the import mode but simplify it (drop the wizard, just name + upload + save)
4. Add PipelineCTA at the bottom after save

- [ ] **Step 2: Verify it builds**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add pages/UploadCharacter.tsx
git commit -m "feat: rewrite character creator — 3 steps with Builder/Prompt tabs + iterative generation"
```

---

## Chunk 3: Pipeline Integration (Director, Editor, Session)

### Task 7: Wire pipelineStore into Director

**Files:**
- Modify: `pages/Director.tsx`

- [ ] **Step 1: Add pipelineStore import and auto-select character**

At the top, add import:
```typescript
import { usePipelineStore } from '../stores/pipelineStore'
import { PipelineCTA } from '../components/PipelineCTA'
```

In the component body, add after existing state declarations:
```typescript
const pipelineCharId = usePipelineStore(s => s.characterId)
const setHeroShot = usePipelineStore(s => s.setHeroShot)

// Auto-select character from pipeline
useEffect(() => {
  if (pipelineCharId && characters.find(c => c.id === pipelineCharId)) {
    setSelectedCharId(pipelineCharId)
  }
}, [pipelineCharId, characters])
```

- [ ] **Step 2: Update handleGenerate to set pipeline hero shot**

After the successful generation block (where results are saved to gallery), add:
```typescript
// Update pipeline state with hero shot
if (results.length > 0) {
  setHeroShot(results[0])
}
```

- [ ] **Step 3: Add conditional button label**

Find the "Generate Hero Shot" button. Change its label:
```typescript
{(selectedChar || faceRefs.length > 0) ? 'Generate Hero Shot' : 'Generate Image'}
```

- [ ] **Step 4: Add PipelineCTA after generated results**

After the filmstrip/results area, add:
```tsx
{generatedImages.length > 0 && onNav && (
  <PipelineCTA
    label="Perfect it in Editor"
    targetPage="editor"
    onNav={onNav}
    icon="🪄"
  />
)}
```

- [ ] **Step 5: Verify and commit**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

```bash
git add pages/Director.tsx
git commit -m "feat: wire pipelineStore into Director — auto-select character, set hero shot, add CTA"
```

---

### Task 8: Wire pipelineStore into AI Editor

**Files:**
- Modify: `pages/AIEditor.tsx`

- [ ] **Step 1: Add pipelineStore import and auto-load hero shot**

Add imports:
```typescript
import { usePipelineStore } from '../stores/pipelineStore'
import { useCharacterStore } from '../stores/characterStore'
import { PipelineCTA } from '../components/PipelineCTA'
```

Add pipeline reading (alongside existing navigationStore reading):
```typescript
const pipelineHeroShot = usePipelineStore(s => s.heroShotUrl)
const setEditedHero = usePipelineStore(s => s.setEditedHero)

// Auto-load from pipeline (lower priority than navigationStore)
useEffect(() => {
  if (!pendingImage && pipelineHeroShot && !canvasImage) {
    // Load pipeline hero shot as canvas base
    setCanvasImage(pipelineHeroShot)
  }
}, [pipelineHeroShot])
```

- [ ] **Step 2: Update edit result to set pipeline edited hero**

After a successful edit operation (where the result image is set), add:
```typescript
setEditedHero(resultUrl)
```

- [ ] **Step 3: Add "Save as Character" button**

Add state for the mini-modal:
```typescript
const [showSaveCharModal, setShowSaveCharModal] = useState(false)
const [saveCharName, setSaveCharName] = useState('')
```

Add the button in the action bar (near existing action buttons):
```tsx
{canvasImage && (
  <button
    onClick={() => setShowSaveCharModal(true)}
    className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
    style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)' }}
  >
    💾 Save as Character
  </button>
)}
```

Add the modal JSX:
```tsx
{showSaveCharModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center"
    style={{ background: 'rgba(8,7,12,0.8)', backdropFilter: 'blur(12px)' }}
    onClick={(e) => { if (e.target === e.currentTarget) setShowSaveCharModal(false) }}>
    <div className="w-[340px] rounded-2xl p-5" style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)' }}>
      <h3 className="text-sm font-serif font-semibold mb-3" style={{ color: 'var(--joi-text-1)' }}>Save as Character</h3>
      <input
        type="text"
        placeholder="Character name..."
        value={saveCharName}
        onChange={e => setSaveCharName(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-[12px] mb-3 outline-none"
        style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-1)' }}
      />
      <div className="flex gap-2">
        <button onClick={() => setShowSaveCharModal(false)}
          className="flex-1 py-2 rounded-lg text-[11px]"
          style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-2)' }}>
          Cancel
        </button>
        <button onClick={async () => {
          if (!saveCharName.trim() || !canvasImage) return
          const res = await fetch(canvasImage)
          const blob = await res.blob()
          const char = {
            id: crypto.randomUUID(),
            name: saveCharName.trim(),
            thumbnail: canvasImage,
            modelImageBlobs: [blob],
            outfitBlob: null,
            outfitDescription: '',
            characteristics: '',
            accessory: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            usageCount: 0,
            renderStyle: 'photorealistic',
          }
          useCharacterStore.getState().addCharacter(char)
          usePipelineStore.getState().setCharacter(char.id)
          setShowSaveCharModal(false)
          setSaveCharName('')
          toast.success(`${char.name} saved!`)
        }}
          className="flex-1 py-2 rounded-lg text-[11px] font-medium"
          style={{ background: 'var(--joi-pink)', color: '#fff' }}>
          Save
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add PipelineCTA**

After the canvas/result area:
```tsx
{canvasImage && onNav && (
  <PipelineCTA
    label="Start Photo Session"
    targetPage="session"
    onNav={onNav}
    icon="📸"
  />
)}
```

- [ ] **Step 5: Verify and commit**

Run: `npx vite build 2>&1 | tail -5`

```bash
git add pages/AIEditor.tsx
git commit -m "feat: wire pipelineStore into Editor — auto-load hero shot, save as character, add CTA"
```

---

### Task 9: Wire pipelineStore into Photo Session

**Files:**
- Modify: `pages/PhotoSession.tsx`

- [ ] **Step 1: Add pipelineStore import and auto-load edited hero**

Add import:
```typescript
import { usePipelineStore } from '../stores/pipelineStore'
import { PipelineCTA } from '../components/PipelineCTA'
```

Add pipeline reading:
```typescript
const pipelineImage = usePipelineStore(s => s.editedHeroUrl) ?? usePipelineStore(s => s.heroShotUrl)

// Auto-load from pipeline as subject
useEffect(() => {
  if (pipelineImage && !uploadedSubject && !selectedGalleryItem) {
    fetch(pipelineImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'pipeline-hero.png', { type: blob.type || 'image/png' })
        setUploadedSubject({ file, preview: pipelineImage })
        setSourceMode('upload')
      })
  }
}, [pipelineImage])
```

- [ ] **Step 2: Add PipelineCTA after session results**

After the generated images grid:
```tsx
{generatedImages.length > 0 && onNav && (
  <PipelineCTA
    label="View in Gallery"
    targetPage="gallery"
    onNav={onNav}
    icon="🖼️"
  />
)}
```

- [ ] **Step 3: Verify and commit**

Run: `npx vite build 2>&1 | tail -5`

```bash
git add pages/PhotoSession.tsx
git commit -m "feat: wire pipelineStore into Photo Session — auto-load hero, add CTA"
```

---

## Chunk 4: Prompt Enhancement

### Task 10: Add prompt enhancement toggle to Character Creator and Director

**Files:**
- Modify: `pages/UploadCharacter.tsx` (add enhance toggle in Prompt tab)
- Modify: `pages/Director.tsx` (add enhance toggle in scenario section)

The `enhancePrompt()` function already exists in `services/geminiService.ts` (uses Gemini Flash). We just need to wire it into the UI.

- [ ] **Step 1: Add enhance toggle to Character Creator Prompt tab**

In the Prompt tab section of UploadCharacter.tsx, add below the textarea:

```tsx
import { enhancePrompt } from '../services/geminiService'

// State
const [enhancing, setEnhancing] = useState(false)

// In JSX, below the prompt textarea:
<div className="flex items-center gap-2 mt-2">
  <button
    onClick={async () => {
      if (!promptText.trim()) return
      const ok = await decrementCredits(2)
      if (!ok) { toast.error('Not enough credits'); return }
      setEnhancing(true)
      try {
        const enhanced = await enhancePrompt(promptText, 'character-creation')
        setPromptText(enhanced)
        toast.success('Prompt enhanced!')
      } catch {
        restoreCredits(2)
        toast.error('Enhancement failed')
      }
      setEnhancing(false)
    }}
    disabled={enhancing || !promptText.trim()}
    className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5"
    style={{
      background: enhancing ? 'var(--joi-bg-3)' : 'rgba(240,104,72,.08)',
      border: '1px solid rgba(240,104,72,.15)',
      color: 'var(--joi-pink)',
      opacity: (!promptText.trim() || enhancing) ? 0.5 : 1,
    }}
  >
    {enhancing ? '⏳ Enhancing...' : '✨ Enhance with AI (2cr)'}
  </button>
</div>
```

- [ ] **Step 2: Add enhance toggle to Director scenario field**

In Director.tsx, in the Scenario accordion section, add a similar button below the scenario textarea. Same pattern as above but with:
```typescript
const enhanced = await enhancePrompt(scenario, 'editorial-scene')
setScenario(enhanced)
```

- [ ] **Step 3: Verify and commit**

Run: `npx vite build 2>&1 | tail -5`

```bash
git add pages/UploadCharacter.tsx pages/Director.tsx
git commit -m "feat: add prompt enhancement toggle (Gemini Flash) to character creator and Director"
```

---

## Chunk 5: Polish

### Task 11: Final integration testing and cleanup

- [ ] **Step 1: Test full pipeline flow**

Manual test sequence:
1. Create a new character via 3-step wizard → verify it saves to characterStore
2. Click "Create Hero Shot in Director →" CTA → verify Director auto-selects the character
3. Generate hero shot → verify pipelineStore has heroShotUrl
4. Click "Perfect it in Editor →" → verify Editor auto-loads the hero shot
5. Edit the image → click "Start Photo Session →"
6. Verify Photo Session auto-loads the edited image as subject
7. Generate session → click "View in Gallery →"

- [ ] **Step 2: Test flexible entry points**

1. Go to Editor directly (no pipeline) → verify it works as before
2. Load an image in Editor → click "Save as Character" → verify character appears in Characters page
3. Go to Director without pipeline → upload face refs → verify "Generate Image" label (not "Hero Shot")

- [ ] **Step 3: Test engine agnosticism**

1. In Director, select Soul 2.0 → verify Soul Style picker appears
2. Switch to Gemini → verify Soul Style picker disappears
3. In Photo Session, select Soul → verify Soul Styles grid replaces vibes
4. Switch to Grok → verify standard vibes return

- [ ] **Step 4: Clean up unused code**

Remove from `pages/UploadCharacter.tsx`:
- Old slider state (`sliders`, `bodySliders`)
- Old step 3-6 JSX
- Unused color arrays (`skinTonesHuman`, `eyeColorsNatural`, etc.) — these are now in `data/characterChips.ts`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: pipeline flow redesign — complete integration with CTA flow, flexible entry points"
```
