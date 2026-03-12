# Hero Shot + Session Variations — Design Spec

## Problem

The current Photo Session generates multiple photos directly from a character's face reference. This produces poor results:

- **Gemini** copies the reference background pixel-for-pixel regardless of prompt
- **Grok** produces better angle variations but starts from a generic headshot, so the scene/lighting/outfit context is weak
- The Director (Create page) lacks the granular controls (pose ref, camera, lighting chips, enhancers) that the old DirectorStudio had

## Solution: 2-Step Decoupled Workflow

### Step 1 — Director generates a Hero Shot

The Director page gets enriched controls (from old DirectorStudio) so users can precisely configure:

- **Character identity** (face reference images)
- **Outfit** (reference image — AI extracts garment only; if omitted, keeps character's existing outfit)
- **Pose** (reference image or chip presets)
- **Camera** (chip presets: Portrait 85mm, Wide 24mm, Cinema, Polaroid, Vintage, Macro)
- **Lighting** (chip presets: Natural, Studio, Golden, Neon, Dramatic, Dark)
- **Scenario** (text + inspiration grid + optional scene reference image)
- **Enhancers** (toggleable chips that inject aesthetic modifiers into the prompt)
- **Engine** (Auto, Gemini, FLUX, GPT, Grok, etc.)

Result: one high-quality "hero shot" saved to Gallery.

### Step 2 — Photo Session generates variations from Gallery photo

The user picks any Gallery photo as the base, selects vibes (with pre-written shot descriptions per style), and Grok Edit generates N angle/composition variations.

Gallery is the bridge — no shared state needed between Director and Session.

---

## Architecture

```
DIRECTOR (Create page)              GALLERY                 PHOTO SESSION
─────────────────────               ───────                 ─────────────
Character + Outfit ref              Hero shot               Pick photo from
+ Pose ref + Camera                 stored here             gallery as base
+ Lighting + Scenario               with all
+ Enhancers + Engine                metadata                Select vibes
        ↓                                                   (multi-select)
[generateInfluencerImage]
        ↓                                                   Grok Edit × N
   Hero Shot → Gallery ✓                                    with per-vibe
                                                            custom shots
                                                                ↓
                                                           Variations → Gallery ✓
```

### Files affected

| File | Change |
|------|--------|
| `data/directorOptions.ts` | **New** — LIGHTING_OPTIONS, CAMERA_OPTIONS, POSE_OPTIONS, INSPIRATIONS |
| `data/enhancers.ts` | **New** — Enhancer definitions with prompt snippets |
| `data/sessionPresets.ts` | **New** — PHOTO_SESSION_PRESETS with per-vibe shots |
| `pages/PhotoSession.tsx` | **Modify** — Gallery picker as source, vibe-based shots, round-robin mix |
| Director/Create page | **Modify** — Add accordion sections for pose/camera/lighting/enhancers/outfit |
| `services/falService.ts` | **Minor** — Adjust Grok session prompt if needed |

### Files NOT affected

- `index.css` — No design system changes
- `services/geminiService.ts` — `generateInfluencerImage` already handles all the params
- `stores/galleryStore.ts` — Already supports all needed operations
- `types.ts` — `InfluencerParams` already has all fields needed

---

## Director Controls — Detail

### Accordion sections (collapsible, state persisted to localStorage)

#### 1. Identity (open by default)
- Chips for saved characters (from characterStore)
- Up to 3 face reference image slots (drag & drop)
- Characteristics textarea

#### 2. Outfit
- Image slot for outfit reference (optional)
- When uploaded: prompt includes `"Extract garment from reference, apply to character. Ignore the person in the outfit image."`
- When empty: character keeps their existing outfit from face reference
- Outfit description textarea

#### 3. Pose
- Image slot for pose reference (optional)
- Chip presets: Standing, Sitting, Walking, Crouching, Leaning, Back
- Each chip has a descriptive value (e.g., Standing = "standing upright, confident posture, facing camera")
- Custom pose text input

#### 4. Camera
- Chip presets: Portrait 85mm, Wide 24mm, Macro, Cinema, Polaroid, Vintage 35mm
- Each chip maps to a descriptive value
- Custom camera text input

#### 5. Lighting
- Chip presets: Natural, Studio, Golden, Neon, Dramatic, Dark
- Each chip maps to a descriptive value
- Custom lighting text input

#### 6. Scenario
- Textarea for scene description
- Inspiration grid (quick-pick buttons that populate the textarea)
- Optional scene reference image slot

#### 7. Enhancers (prompt potentiators)
- Multi-select toggleable chips
- Each adds a specific instruction to the prompt

| Enhancer | Prompt injection |
|----------|-----------------|
| Glossy Skin | `"luminous glossy skin with visible light reflections, dewy finish"` |
| Film Grain | `"subtle 35mm analog film grain texture, organic noise"` |
| 3D Rendered | `"hyper-realistic 3D render, subsurface scattering on skin, perfectly smooth lighting"` |
| Cinematic Grade | `"cinematic color grading, teal-orange split toning, movie-like depth"` |
| Sharp Textures | `"hyper-detailed textures, every fabric thread and skin pore visible, tack-sharp"` |
| Rim Light | `"strong rim/edge lighting separating subject from background, backlit halo"` |
| Soft Glow | `"ethereal soft glow, dreamy halation, gentle light bloom around highlights"` |
| High Contrast | `"high contrast dramatic look, deep blacks, bright highlights, punchy tones"` |
| Vivid Colors | `"ultra-vivid saturated colors, bold chromatic intensity, eye-popping palette"` |
| Shallow DOF | `"extremely shallow depth of field, f/1.2 bokeh, creamy background blur"` |
| Custom | Text input for user-defined enhancer |

#### 8. Engine
- Same engine selector modal as current (AUTO, Gemini NB2, Pro, Imagen4, FLUX, GPT, Grok, etc.)

---

## Photo Session — Detail

### Source selection (replaces character picker)

Two modes:
- **Gallery** (default): Grid of recent gallery photos. Click to select as base.
- **Upload**: Drop zone for direct photo upload (existing behavior preserved).

### Vibe presets with custom shots

Each vibe has 5-6 pre-written shot descriptions with specific camera angles, compositions, and energy:

| Vibe | # Shots | Style |
|------|---------|-------|
| Selfies | 5 | Phone angles, mirror, low angle |
| GRWM | 5 | Macro beauty, vanity, getting ready |
| Stories | 5 | Vertical 9:16, candid, talking to camera |
| Editorial | 5 | Magazine quality, profiles, wide env |
| Portrait | 5 | Classic bust, Rembrandt, silhouette |
| Street Style | 5 | Urban candid, hip angle, wall lean |
| Creator | 5 | Influencer energy, product shots |
| Lifestyle | 5 | Café, park, home, window |
| Fitness | 5 | Action, power stance, post-workout |
| Night Out | 5 | Bar glow, neon rim, dressed up |
| Foto Dump | 6 | Disposable camera, macro detail, raw |
| Date Night | 5 | Candlelight, wine, intimate |
| Pool / Summer | 5 | Poolside, splash, golden wet skin |
| Cozy Home | 5 | Morning bed, couch, kitchen, bath |

### Shot mixing — Round-robin

When multiple vibes are selected, shots are interleaved (not concatenated) so each vibe gets equal representation:

```
Selfies:  [S1, S2, S3, S4, S5]
Editorial:[E1, E2, E3, E4, E5]
shotCount = 6

Round-robin → [S1, E1, S2, E2, S3, E3] → 6 shots, 3 per vibe
```

### Grok Edit prompt per shot

```
"Photo session — shot {i} of {N}.
Preserve EXACTLY the same person and outfit from the reference image.
{shot description from vibe preset}.
{scene override if provided}.
Keep face, clothing identical to reference."
```

### Error handling

- Grok fails on one shot → skip, continue with remaining, restore partial credits
- Base image < 512px → warning before generating
- No base selected → generate button disabled

---

## Design System Compliance

All UI follows the existing Plasma Shift design system:

- Colors: CSS variables only (`var(--accent)`, `var(--magenta)`, `var(--blue)`, `var(--bg-*)`, `var(--text-*)`)
- Cards: glassmorphism with `backdrop-filter blur`, `.card` class
- Titles: Playfair Display `.font-serif` + `.text-gradient`
- Chips/badges: JetBrains Mono `.font-mono`
- Accordions: `var(--bg-3)` background, `var(--border)` borders
- Buttons: `.btn-primary` gradient, `.btn-ghost` for secondary
- Animations: `.anim-in`, `.stagger-children`, `.shimmer`
- Page pattern: `gradient-mesh` → header → content
- No external UI libraries

---

## Out of scope

- Video generation from hero shots
- AI-powered auto-enhancement of session results
- Batch processing multiple characters in one session
- Social media posting integration
