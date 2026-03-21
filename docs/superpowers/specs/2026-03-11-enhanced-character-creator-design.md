# Enhanced Character Creator — Design Spec

## Overview
Enhance the UploadCharacter "Create from Scratch" flow with: a new Render Style step, expanded non-human appearance options, a post-generation save/discard flow with image lightbox, and an improved live preview.

## File: `pages/UploadCharacter.tsx`

---

## 1. New Step 0 — Render Style

Insert as the first step. Steps become: `['Render Style', 'Identity', 'Face', 'Body', 'Personality', 'Fashion']` (6 total).

### Render style options (grid of 6 cards):
| ID | Label | Description | Prompt prefix |
|----|-------|-------------|---------------|
| `photorealistic` | Photorealistic | Human-like, studio photography | `Photorealistic photograph of` |
| `anime` | Anime / Manga | Japanese animation style | `Anime style illustration of` |
| `3d-render` | 3D Render | CGI, Pixar-like, game character | `3D rendered CGI character,` |
| `illustration` | Illustration | Digital art, concept art | `Digital illustration of` |
| `stylized` | Stylized | Semi-realistic, Arcane/Spider-Verse | `Stylized semi-realistic art of` |
| `pixel-art` | Pixel Art | Retro 8-bit/16-bit | `Pixel art style character,` |

### State
- `selRenderStyle` — index into render styles array, default `0`

### UI
- 3-column grid of selectable cards, each with an emoji icon, title, and description line.
- Uses existing `card` class styling with active border highlight (accent color).

---

## 2. Expanded Face Options (Step 2, previously Step 1)

### Skin Tones
Keep existing 6 human tones. Add labeled row "Fantasy / Non-Human":
- Porcelain White `#F5F0EB`
- Metallic Silver `#C0C0C0`
- Pale Blue `#A8C8E8`
- Emerald Green `#50C878`
- Lavender `#B8A0D0`
- Obsidian Black `#1A1A2E`
- Golden `#D4A847`
- Custom (color picker input)

### Eye Colors
Keep existing 6 natural. Add "Fantasy" row:
- Red `#CC2020`
- Gold `#D4A017`
- White/Silver `#E0DFE0`
- Pink `#E8749A`
- Heterochromia (split circle: blue + gold)
- Glowing Cyan `#00E5FF`

### Hair Colors
Keep existing 8 natural. Add "Unnatural" row:
- Neon Pink `#FF69B4`
- Electric Blue `#00BFFF`
- White `#F0F0F0`
- Mint Green `#98FFB3`
- Purple `#9B59B6`
- Silver `#C4C4CC`
- Fire Red `#FF3300`

### State changes
- `selSkin` range increases to accommodate 14 options (6 human + 8 fantasy). Custom uses separate `customSkinColor` state.
- `selEyes` range increases to 12 (6 + 6).
- `selHairC` range increases to 15 (8 + 7).

### Prompt impact
Non-human colors produce descriptive text: "metallic silver skin", "glowing cyan eyes", "neon pink hair".

---

## 3. Post-Generation Save/Discard

### Current behavior (remove)
`handleGenerate` currently calls `addCharacter` immediately on success.

### New behavior
1. `handleGenerate` stores result in temp state only:
   - `generatedImage: string | null` (already exists)
   - `pendingCharacter: SavedCharacter | null` (new) — the full character object ready to save
2. Preview panel shows post-generation UI when `generatedImage` is set:
   - Image has `cursor-pointer` + hover overlay text "Click to enlarge"
   - Below image: 3 buttons:
     - **Save Character** (`btn-primary`) — calls `addCharacter(pendingCharacter)`, shows success toast, resets form
     - **Discard** (`btn-ghost`) — clears `generatedImage` and `pendingCharacter`, returns to form
     - **Regenerate** (`btn-ghost`, accent text) — calls `handleGenerate` again (costs credits)
3. **Lightbox modal**: clicking the generated image opens a fullscreen overlay:
   - Dark backdrop `rgba(0,0,0,0.92)`, click to close
   - Image centered, `max-w-[90vw] max-h-[90vh] object-contain`
   - Close button (X) top-right corner
   - State: `showLightbox: boolean`

---

## 4. Enhanced Live Preview

### Render style badge
Top-right corner of preview area. Shows selected render style label in a small badge with gradient background matching the plasma theme.

### Body silhouette
Below the geometric face, replace the current simple torso with body-type-responsive shapes:
- Ectomorph/Slim: narrow rectangle
- Mesomorph/Athletic: wider shoulders, V-taper
- Endomorph/Curvy: wider midsection, hourglass
- All using CSS shapes with the selected skin tone color.

### Accessory icons
Below the character silhouette, a row of small text icons for each selected accessory.

### Style-tinted background
The preview card background shifts with render style:
- Photorealistic: warm neutral gradient
- Anime: soft pink/purple gradient
- 3D Render: cool metallic blue gradient
- Illustration: warm golden gradient
- Stylized: neon purple/orange gradient
- Pixel Art: dark with grid pattern overlay

---

## 5. Prompt Engineering

The prompt sent to `generateInfluencerImage` wraps all characteristics with the render style:

```
`${renderStylePrefix} ${characteristics}. ${outfitDescription}. Accessories: ${accessories}.`
```

The `scenario` field stays "Professional studio, clean white background" for consistency.

---

## Non-goals
- No AI-powered live preview (too expensive per click)
- No new dependencies or libraries
- No changes to stores, services, or other pages
