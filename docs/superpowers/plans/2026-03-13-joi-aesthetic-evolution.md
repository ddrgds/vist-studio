# Joi Aesthetic Evolution + Prompt Engineering — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift VIST Studio's visual identity toward a deeper violet Blade Runner 2049 / Joi aesthetic, polish all button microinteractions, and rewrite every AI generation prompt with professional art direction language.

**Architecture:** Three independent workstreams — CSS design system evolution (index.css), button/interaction polish (index.css + page components), and prompt engineering (data files + page components). CSS changes are foundational and should go first.

**Tech Stack:** CSS custom properties, Tailwind CSS, React/TypeScript, existing Framer Motion

---

## Chunk 1: CSS Design System — Deep Violet Evolution

### Task 1: Shift Joi color variables to violet-dominant palette

**Files:**
- Modify: `index.css:1215-1243` (Joi CSS variables)

- [ ] **Step 1: Update Joi palette variables**

Replace the `:root` block at lines 1215-1243 with:

```css
:root {
  /* Joi palette — deep violet holographic */
  --joi-pink: #e879a8;
  --joi-pink-soft: rgba(232,121,168,0.12);
  --joi-pink-glow: rgba(232,121,168,0.25);
  --joi-magenta: #d048b0;
  --joi-magenta-soft: rgba(208,72,176,0.10);
  --joi-coral: #f06848;
  --joi-lavender: #c4b5f0;
  --joi-blue: #6878f0;
  --joi-cyan-warm: #60d0d0;

  /* NEW — violet primaries */
  --joi-violet: #8b5cf6;
  --joi-violet-deep: #6d28d9;
  --joi-violet-soft: rgba(139,92,246,0.12);
  --joi-violet-glow: rgba(139,92,246,0.35);

  /* NEW — warm accent (human warmth) */
  --joi-warm: #d4a574;

  /* Surfaces — deeper purple */
  --joi-bg-0: #06040e;
  --joi-bg-1: #0a0816;
  --joi-bg-2: rgba(14,10,24,0.75);
  --joi-bg-3: rgba(22,16,34,0.60);
  --joi-bg-glass: rgba(16,12,28,0.60);

  /* Borders — violet tint */
  --joi-border: rgba(139,92,246,0.06);
  --joi-border-h: rgba(139,92,246,0.18);
  --joi-border-glass: rgba(139,92,246,0.04);

  /* Text */
  --joi-text-1: #f0eaf4;
  --joi-text-2: #a898b8;
  --joi-text-3: #685880;
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build 2>&1 | head -20`
Expected: No CSS errors

- [ ] **Step 3: Commit**

```bash
git add index.css
git commit -m "style: shift Joi palette to deep violet primaries"
```

---

### Task 2: Update .joi-glass with deeper frosted glass + scan lines

**Files:**
- Modify: `index.css:1246-1278` (.joi-glass block)

- [ ] **Step 1: Update .joi-glass base**

Replace lines 1246-1278 with:

```css
.joi-glass {
  background: var(--joi-bg-glass);
  backdrop-filter: blur(28px) saturate(1.4);
  -webkit-backdrop-filter: blur(28px) saturate(1.4);
  border: 1px solid var(--joi-border-glass);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
}

.joi-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(139,92,246,0.015) 2px,
      rgba(139,92,246,0.015) 4px
    ),
    linear-gradient(
      135deg,
      rgba(139,92,246,0.03) 0%,
      transparent 40%,
      rgba(208,72,176,0.02) 70%,
      transparent 100%
    );
  pointer-events: none;
  z-index: 1;
}

.joi-glass:hover {
  border-color: var(--joi-border-h);
  box-shadow:
    0 8px 40px rgba(139,92,246,0.10),
    0 0 80px rgba(139,92,246,0.05),
    inset 0 1px rgba(255,255,255,0.04);
}
```

- [ ] **Step 2: Commit**

```bash
git add index.css
git commit -m "style: deepen .joi-glass with violet tint + holographic scan lines"
```

---

### Task 3: Update .joi-mesh with violet center glow

**Files:**
- Modify: `index.css:1281-1288` (.joi-mesh)

- [ ] **Step 1: Add violet center layer to .joi-mesh**

Replace lines 1281-1288 with:

```css
.joi-mesh {
  position: relative;
  background:
    radial-gradient(ellipse 40% 40% at 50% 40%, rgba(139,92,246,0.10) 0%, transparent 70%),
    radial-gradient(ellipse at 20% 30%, rgba(232,121,168,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 60%, rgba(208,72,176,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 85%, rgba(104,120,240,0.04) 0%, transparent 45%),
    radial-gradient(ellipse at 90% 15%, rgba(196,181,240,0.04) 0%, transparent 35%);
}
```

- [ ] **Step 2: Commit**

```bash
git add index.css
git commit -m "style: add violet center glow to .joi-mesh"
```

---

### Task 4: Update text glows, gradient text, and plasma-glow to violet

**Files:**
- Modify: `index.css:1291-1302` (.joi-glow)
- Modify: `index.css:1305-1322` (joi-hologram keyframes)
- Modify: `index.css:1325-1340` (joi-aura keyframes)
- Modify: `index.css:1343-1365` (.joi-border-glow)
- Modify: `index.css:1458-1465` (.joi-text-gradient)
- Modify: `index.css:183-187` (plasma-glow keyframes)

- [ ] **Step 1: Update .joi-glow text shadows to violet**

Replace lines 1291-1302:

```css
.joi-glow {
  text-shadow:
    0 0 10px rgba(139,92,246,0.35),
    0 0 30px rgba(139,92,246,0.15),
    0 0 60px rgba(139,92,246,0.08);
}

.joi-glow--subtle {
  text-shadow:
    0 0 8px rgba(139,92,246,0.2),
    0 0 20px rgba(139,92,246,0.08);
}
```

- [ ] **Step 2: Update joi-hologram keyframes to violet chromatic aberration**

Replace lines 1305-1322:

```css
@keyframes joi-hologram {
  0%, 100% {
    text-shadow:
      0 0 10px rgba(139,92,246,0.3),
      -1px 0 rgba(104,120,240,0.15),
      1px 0 rgba(232,121,168,0.15);
  }
  50% {
    text-shadow:
      0 0 15px rgba(139,92,246,0.4),
      -2px 0 rgba(104,120,240,0.2),
      2px 0 rgba(232,121,168,0.2);
  }
}

.joi-hologram:hover {
  animation: joi-hologram 2s ease-in-out infinite;
}
```

- [ ] **Step 3: Update joi-aura to violet pulsing**

Replace lines 1325-1340:

```css
@keyframes joi-aura {
  0%, 100% {
    box-shadow:
      0 4px 30px rgba(139,92,246,0.06),
      0 0 60px rgba(139,92,246,0.03);
  }
  50% {
    box-shadow:
      0 4px 40px rgba(139,92,246,0.12),
      0 0 80px rgba(139,92,246,0.06);
  }
}

.joi-aura {
  animation: joi-aura 4s ease-in-out infinite;
}
```

- [ ] **Step 4: Update .joi-border-glow to violet spectrum**

Replace lines 1343-1365:

```css
.joi-border-glow {
  position: relative;
}
.joi-border-glow::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(139,92,246,0.15),
    rgba(232,121,168,0.10),
    rgba(104,120,240,0.08),
    rgba(196,181,240,0.06)
  );
  z-index: -1;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.4s;
}
.joi-border-glow:hover::after {
  opacity: 1;
}
```

- [ ] **Step 5: Update .joi-text-gradient to violet→pink→lavender**

Replace lines 1458-1465:

```css
.joi-text-gradient {
  background: linear-gradient(135deg, var(--joi-violet), var(--joi-pink), var(--joi-lavender));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease-in-out infinite;
}
```

- [ ] **Step 6: Update plasma-glow keyframes to violet cycle**

Replace lines 183-187:

```css
@keyframes plasma-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.15), 0 0 60px rgba(139,92,246,0.05); }
  33% { box-shadow: 0 0 20px rgba(232,121,168,0.15), 0 0 60px rgba(232,121,168,0.05); }
  66% { box-shadow: 0 0 20px rgba(104,120,240,0.15), 0 0 60px rgba(104,120,240,0.05); }
}
```

- [ ] **Step 7: Commit**

```bash
git add index.css
git commit -m "style: shift all glows, gradients, and auras to violet spectrum"
```

---

### Task 5: Update film grain opacity + joi-breathe + joi-divider + scrollbar

**Files:**
- Modify: `index.css:99-109` (body::after film grain)
- Modify: `index.css:1485-1500` (joi-breathe)
- Modify: `index.css:1503-1506` (joi-divider)
- Modify: `index.css:1509-1521` (joi-status-pulse)
- Modify: `index.css:1524-1530` (joi-scroll)

- [ ] **Step 1: Increase film grain opacity**

At line 106, change `opacity: 0.018;` to `opacity: 0.028;`

- [ ] **Step 2: Update joi-breathe to violet**

Replace lines 1485-1500:

```css
@keyframes joi-breathe {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(139,92,246,0.08),
      0 0 60px rgba(139,92,246,0.04);
  }
  50% {
    box-shadow:
      0 0 30px rgba(139,92,246,0.16),
      0 0 80px rgba(139,92,246,0.08);
  }
}

.joi-breathe {
  animation: joi-breathe 3s ease-in-out infinite;
}
```

- [ ] **Step 3: Update joi-divider to violet spectrum**

Replace lines 1503-1506:

```css
.joi-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139,92,246,0.15), rgba(232,121,168,0.10), rgba(104,120,240,0.08), transparent);
}
```

- [ ] **Step 4: Update joi-status-pulse to violet**

Replace lines 1509-1521:

```css
@keyframes joi-status-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px var(--joi-violet); }
  50% { opacity: 0.5; box-shadow: 0 0 8px var(--joi-violet); }
}

.joi-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  background: var(--joi-violet);
  animation: joi-status-pulse 2.5s ease-in-out infinite;
}
```

- [ ] **Step 5: Update scrollbar to violet gradient**

Replace lines 1524-1530:

```css
.joi-scroll::-webkit-scrollbar { width: 4px; }
.joi-scroll::-webkit-scrollbar-track { background: transparent; }
.joi-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--joi-violet), var(--joi-pink));
  border-radius: 2px;
  opacity: 0.4;
}
```

- [ ] **Step 6: Commit**

```bash
git add index.css
git commit -m "style: update grain, breathe, divider, status, scrollbar to violet"
```

---

## Chunk 2: Button & Interaction Polish

### Task 6: Upgrade button microinteractions

**Files:**
- Modify: `index.css:1377-1455` (all button classes)

- [ ] **Step 1: Upgrade .joi-btn with violet hover + active states**

Replace lines 1377-1411:

```css
.joi-btn {
  background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(208,72,176,0.10));
  border: 1px solid rgba(139,92,246,0.15);
  color: var(--joi-text-1);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.82rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.65rem 1.6rem;
  border-radius: 10px;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.joi-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%);
  background-size: 250% 100%;
  animation: shimmer 4s ease-in-out infinite;
}

.joi-btn:hover {
  background: linear-gradient(135deg, rgba(139,92,246,0.22), rgba(208,72,176,0.15));
  border-color: rgba(139,92,246,0.3);
  box-shadow:
    0 4px 24px rgba(139,92,246,0.18),
    0 0 40px rgba(139,92,246,0.08);
  transform: translateY(-1px) scale(1.01);
}

.joi-btn:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 2px 8px rgba(139,92,246,0.12);
  transition-duration: 0.1s;
}
```

- [ ] **Step 2: Upgrade .joi-btn-solid with violet gradient + pulse ring**

Replace lines 1413-1434:

```css
.joi-btn-solid {
  background: linear-gradient(135deg, var(--joi-violet), var(--joi-pink));
  border: none;
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.82rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.7rem 1.8rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 20px var(--joi-violet-glow);
  position: relative;
  overflow: hidden;
}

.joi-btn-solid::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
}

.joi-btn-solid:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 8px 32px var(--joi-violet-glow),
    0 0 50px rgba(139,92,246,0.12);
}

.joi-btn-solid:active {
  transform: translateY(0) scale(0.97);
  box-shadow: 0 2px 8px var(--joi-violet-glow);
  transition-duration: 0.1s;
}

@keyframes pulse-ring-violet {
  0% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
  100% { box-shadow: 0 0 0 20px rgba(139,92,246,0); }
}
```

- [ ] **Step 3: Upgrade .joi-btn-ghost with violet hover**

Replace lines 1436-1455:

```css
.joi-btn-ghost {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.06);
  color: var(--joi-text-2);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.6rem 1.4rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.joi-btn-ghost:hover {
  border-color: rgba(139,92,246,0.25);
  color: var(--joi-lavender);
  background: rgba(139,92,246,0.06);
}

.joi-btn-ghost:active {
  background: rgba(139,92,246,0.12);
  transition-duration: 0.1s;
}
```

- [ ] **Step 4: Commit**

```bash
git add index.css
git commit -m "style: upgrade all button microinteractions with violet glow + active states"
```

---

### Task 7: Add page transition blur effect + selection color update

**Files:**
- Modify: `index.css:112` (::selection)
- Modify: `index.css:153-161` (fadeIn + fadeInScale keyframes)

- [ ] **Step 1: Update text selection to violet**

At line 112, change:
```css
::selection { background: rgba(240,104,72,0.25); color: #fff; }
```
to:
```css
::selection { background: rgba(139,92,246,0.30); color: #fff; }
```

- [ ] **Step 2: Update fadeIn with subtle blur for hologram materializing**

Replace lines 153-161:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); filter: blur(2px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.96) translateY(6px); filter: blur(2px); }
  to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}
```

- [ ] **Step 3: Commit**

```bash
git add index.css
git commit -m "style: add hologram-materializing blur to page transitions + violet selection"
```

---

## Chunk 3: Prompt Engineering — Director Data Files

### Task 8: Rewrite Director pose, camera, lighting options

**Files:**
- Modify: `data/directorOptions.ts:18-45` (POSE_OPTIONS, CAMERA_OPTIONS, LIGHTING_OPTIONS)

- [ ] **Step 1: Rewrite POSE_OPTIONS with art-directed descriptions**

Replace lines 18-25:

```typescript
export const POSE_OPTIONS: ChipOption[] = [
  { id: 'standing',  label: 'Standing',  icon: '🧍', value: 'standing upright with confident posture, weight on one hip for natural S-curve, shoulders relaxed, chin slightly elevated, facing camera with direct presence' },
  { id: 'sitting',   label: 'Sitting',   icon: '🪑', value: 'seated in relaxed three-quarter pose, one leg crossed over the other, torso angled slightly off-camera-axis, hands resting naturally, elegant but comfortable' },
  { id: 'walking',   label: 'Walking',   icon: '🚶', value: 'mid-stride walking toward camera, natural arm swing captured at peak motion, dynamic weight shift between steps, confident gait with purpose' },
  { id: 'crouching', label: 'Crouching', icon: '🧎', value: 'crouching low with one knee down, dynamic compact pose, elbows resting on knee, intense eye contact from below eye level, urban street energy' },
  { id: 'back',      label: 'Back',      icon: '↩️', value: 'three-quarter back view with head turned over shoulder toward camera, nape of neck visible, mysterious over-the-shoulder glance, spine line visible' },
  { id: 'leaning',   label: 'Leaning',   icon: '📐', value: 'leaning against wall or surface with one shoulder, casual weight distribution, arms crossed or thumbs in pockets, effortless cool attitude' },
];
```

- [ ] **Step 2: Rewrite CAMERA_OPTIONS with technical photography language**

Replace lines 28-35:

```typescript
export const CAMERA_OPTIONS: ChipOption[] = [
  { id: 'portrait',  label: 'Portrait 85mm',  icon: '📷', value: 'shot on Canon RF 85mm f/1.2L at f/1.4, medium close-up bust framing, creamy circular bokeh with smooth falloff, compressed perspective flattering facial features, shallow depth of field' },
  { id: 'wide',      label: 'Wide 24mm',      icon: '🔭', value: 'shot on Sony 24mm f/1.4 GM, full-body environmental framing, wide-angle perspective with depth emphasis, subject placed at rule of thirds, deep depth of field showing context' },
  { id: 'macro',     label: 'Macro',          icon: '🔬', value: 'shot on Canon RF 100mm f/2.8L Macro, extreme close-up detail, razor-thin depth of field, emphasis on skin texture and micro-detail, soft diffused lighting' },
  { id: 'cinematic', label: 'Cinema',         icon: '🎬', value: 'shot on Arri Alexa Mini LF with Cooke Anamorphic 50mm T2.3, 2.39:1 widescreen, oval bokeh with horizontal lens flares, warm Cooke highlight rolloff, filmic halation' },
  { id: 'polaroid',  label: 'Polaroid',       icon: '📸', value: 'shot on Polaroid SX-70, instant film aesthetic, slightly washed-out warm colors, soft corner vignette, cyan shadows and warm highlights, dreamy soft focus quality' },
  { id: 'vintage',   label: 'Vintage 35mm',   icon: '🎞️', value: 'shot on Nikon FM2 with Nikkor 50mm f/1.4, Fuji Superia 400 film stock, organic analog grain, warm golden skin tones, natural vignette from vintage optics' },
  { id: 'drone',     label: 'Drone Overhead',  icon: '🛸', value: 'shot on DJI Mavic 3 Hasselblad, top-down 45-degree aerial perspective, environmental scale showing subject in context, deep depth of field, dramatic shadow casting' },
  { id: 'anamorphic', label: 'Anamorphic',    icon: '🎥', value: 'shot on Panavision C-Series Anamorphic 75mm T2.3, 2x anamorphic squeeze with oval bokeh, horizontal blue lens flares, extreme widescreen 2.76:1, cinema-quality depth' },
];
```

- [ ] **Step 3: Rewrite LIGHTING_OPTIONS with physics-based descriptions**

Replace lines 38-45:

```typescript
export const LIGHTING_OPTIONS: ChipOption[] = [
  { id: 'natural',  label: 'Natural',  icon: '☀️', value: 'natural window light from camera-left at 90 degrees, soft diffused quality through sheer curtains, warm 5600K, gentle 3:1 fill from white wall bounce, soft shadow edges' },
  { id: 'studio',   label: 'Studio',   icon: '💡', value: 'professional three-point setup: Profoto B10 key through 4ft octabox at 45 degrees, V-flat white bounce fill at 2:1 ratio, hair light with 10-degree grid, clean 5500K neutral' },
  { id: 'golden',   label: 'Golden',   icon: '🌅', value: 'golden hour at 15 minutes before sunset, warm 3200K directional light at 15-degree elevation, Fresnel rim highlights on hair, atmospheric haze diffusion, shadows shift toward cool blue' },
  { id: 'neon',     label: 'Neon',     icon: '🌆', value: 'mixed neon lighting: magenta neon key from left, cyan LED accent from right creating bi-color split, wet surface reflections multiplying light sources, volumetric atmosphere' },
  { id: 'dramatic', label: 'Dramatic', icon: '🎭', value: 'single hard key light from 60 degrees camera-left at 30 degrees above, Chiaroscuro pattern, deep shadows on 70% of face, 8:1 contrast ratio, Rembrandt triangle' },
  { id: 'dark',     label: 'Dark',     icon: '🌙', value: 'ultra-low-key single practical light at close range, majority of frame in deep shadow, tungsten 2800K warm glow on lit areas, absolute black shadows, atmospheric noir mood' },
  { id: 'bladerunner', label: 'Blade Runner', icon: '🔮', value: 'cyberpunk night: mixed sodium vapor amber with LED cyan/magenta, volumetric fog, wet asphalt reflecting neon as elongated streaks, purple-violet atmospheric haze, backlit silhouette' },
  { id: 'holographic', label: 'Holographic', icon: '✨', value: 'ethereal violet-purple key light emanating from subject as if self-luminous, holographic glow rim light on all edges, purple-lavender cast on surfaces, skin emits subtle light, no traditional shadow' },
];
```

- [ ] **Step 4: Rewrite INSPIRATIONS with rich scene descriptions**

Replace lines 48-61:

```typescript
export const INSPIRATIONS: Inspiration[] = [
  { id: 'neon-city',         emoji: '🌆', label: 'Neon City',         scene: 'rain-slicked cyberpunk city street at night, neon signs reflecting in puddles as elongated color streaks, volumetric fog catching colored light beams, towering buildings with holographic advertisements, Blade Runner atmosphere' },
  { id: 'tropical-beach',    emoji: '🏝️', label: 'Tropical Beach',    scene: 'pristine tropical beach with crystal turquoise water, white sand catching golden hour light, coconut palms creating dappled shadow patterns, gentle waves with sun glitter, warm humid atmosphere' },
  { id: 'studio-white',      emoji: '⬜', label: 'Studio White',      scene: 'infinite white cyclorama studio, seamless background curving from wall to floor, professional beauty lighting creating clean shadows, minimalist void focusing entirely on subject' },
  { id: 'night-skyline',     emoji: '🌃', label: 'Night Skyline',     scene: 'rooftop terrace overlooking dense city skyline at night, thousands of building lights creating bokeh carpet below, cool night air atmosphere, urban penthouse luxury' },
  { id: 'luxury-apartment',  emoji: '🛋️', label: 'Luxury Apt',       scene: 'luxury modern penthouse interior with designer furniture, floor-to-ceiling windows revealing city night view, warm ambient accent lighting, marble and wood surfaces, editorial interior design' },
  { id: 'coffee-shop',       emoji: '☕', label: 'Coffee Shop',       scene: 'artisan specialty coffee shop with exposed brick walls, warm Edison bulb lighting, rich wood countertops with steam rising from cups, cozy intimate atmosphere, lifestyle environment' },
  { id: 'park-garden',       emoji: '🌿', label: 'Park Garden',       scene: 'lush botanical garden with dappled sunlight filtering through mature tree canopy, wildflowers and ferns creating layered depth, golden-green color palette, serene natural atmosphere' },
  { id: 'rooftop-sunset',    emoji: '🌅', label: 'Rooftop Sunset',    scene: 'rooftop terrace during golden hour with panoramic sky gradient from warm peach at horizon through coral to deep blue above, city in silhouette below, magic hour warmth' },
  { id: 'gym',               emoji: '🏋️', label: 'Gym',               scene: 'modern industrial gym with exposed concrete and steel, dramatic overhead lighting creating pools of light between equipment, motivational raw energy, urban athletic space' },
  { id: 'art-gallery',       emoji: '🖼️', label: 'Art Gallery',       scene: 'minimalist contemporary art gallery with white walls and polished concrete floors, carefully spotlit artworks creating pools of warm light, elegant negative space, cultural sophistication' },
  { id: 'street-market',     emoji: '🏪', label: 'Street Market',     scene: 'vibrant night street market with hanging lanterns and neon food stall signs, steam rising from cooking, colorful awnings and crowds creating lively depth, documentary atmosphere' },
  { id: 'desert-dunes',      emoji: '🏜️', label: 'Desert Dunes',      scene: 'vast desert sand dunes at magic hour with orange-pink gradient sky, sharp shadow lines along dune ridges creating graphic patterns, ancient solitude, epic cinematic scale' },
];
```

- [ ] **Step 5: Commit**

```bash
git add data/directorOptions.ts
git commit -m "feat: rewrite Director options with professional art direction prompts"
```

---

### Task 9: Rewrite enhancers with professional-grade prompt snippets

**Files:**
- Modify: `data/enhancers.ts:10-83` (ENHANCERS array)

- [ ] **Step 1: Replace all 12 enhancer promptSnippets**

Replace lines 10-83:

```typescript
export const ENHANCERS: Enhancer[] = [
  {
    id: 'glossy-skin',
    label: 'Glossy Skin',
    icon: '\u2728',
    promptSnippet: 'luminous dewy skin with micro-specular highlights, light catching moisture on cheekbones and cupid\'s bow, makeup-artist-quality highlighting balm, visible pore texture under the sheen',
  },
  {
    id: 'film-grain',
    label: 'Film Grain',
    icon: '\uD83C\uDF9E\uFE0F',
    promptSnippet: 'Kodak Vision3 500T grain structure at native ISO, organic silver halide grain clusters, subtle halation bloom on highlights, slight color crossover in shadows toward teal-cyan, analog warmth',
  },
  {
    id: '3d-rendered',
    label: '3D Rendered',
    icon: '\uD83D\uDC8E',
    promptSnippet: 'Unreal Engine 5 Nanite-quality geometry, Lumen global illumination with ray-traced reflections, PBR material response on all surfaces, subsurface scattering on skin, strand-based hair',
  },
  {
    id: 'cinematic-grade',
    label: 'Cinematic Grade',
    icon: '\uD83C\uDFAC',
    promptSnippet: 'Hollywood DI color grading, teal-and-orange complementary palette, crushed blacks with lifted shadow detail, desaturated midtones with punchy highlights, FilmConvert Nitrate texture',
  },
  {
    id: 'sharp-textures',
    label: 'Sharp Textures',
    icon: '\uD83D\uDD0D',
    promptSnippet: 'micro-contrast enhancement revealing fabric weave, skin pores, hair strand definition, 8K-resolution texture detail throughout, clarity-boosted without haloing, tactile surface quality',
  },
  {
    id: 'rim-light',
    label: 'Rim Light',
    icon: '\uD83C\uDF1F',
    promptSnippet: 'dedicated backlight creating bright edge separation on hair and shoulders, 1-stop overexposed rim with natural falloff, slight flare bloom where rim meets lens axis, halo separation',
  },
  {
    id: 'soft-glow',
    label: 'Soft Glow',
    icon: '\uD83D\uDCAB',
    promptSnippet: 'Pro-Mist 1/4 filter effect creating dreamy highlight diffusion, blooming light sources, romantic soft-focus while maintaining core sharpness, warm ethereal atmosphere, skin-smoothing diffusion',
  },
  {
    id: 'high-contrast',
    label: 'High Contrast',
    icon: '\uD83D\uDDA4',
    promptSnippet: 'aggressive contrast curve with deep true blacks and bright clean whites, dramatic tonal separation, minimal midtone transition, graphic poster-quality light and shadow, punchy saturated color',
  },
  {
    id: 'vivid-colors',
    label: 'Vivid Colors',
    icon: '\uD83C\uDF08',
    promptSnippet: 'Fujifilm Velvia 50 saturation, hyper-vivid color rendering pushing tones 30% beyond reality, rich jewel-tone shadows, electric highlight colors, maximum hue separation',
  },
  {
    id: 'shallow-dof',
    label: 'Shallow DOF',
    icon: '\uD83D\uDCF7',
    promptSnippet: 'shot at f/1.2 maximum aperture, ultra-thin focal plane on eyes only, everything beyond 15cm dissolves into creamy bokeh, distinct bokeh circles from background lights, smooth focus gradient',
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    icon: '\uD83C\uDF1E',
    promptSnippet: 'magic hour warmth bathing scene in amber-gold light, long shadows, warm rim light on hair creating golden halo, sky gradient from peach horizon to deep blue, nostalgic film color, low sun lens flare',
  },
  {
    id: 'wet-look',
    label: 'Wet Look',
    icon: '\uD83D\uDCA7',
    promptSnippet: 'rain-soaked aesthetic with water droplets on skin and clothing, wet hair with defined clinging strands, glistening surface reflections, water beads catching light as specular points, puddle reflections',
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add data/enhancers.ts
git commit -m "feat: rewrite all enhancer prompts with professional art direction language"
```

---

## Chunk 4: Prompt Engineering — Photo Session Presets

### Task 10: Rewrite Photo Session presets with professional shot descriptions

**Files:**
- Modify: `data/sessionPresets.ts:11-195` (PHOTO_SESSION_PRESETS array)

- [ ] **Step 1: Replace entire PHOTO_SESSION_PRESETS array**

Replace lines 11-195 with all 14 vibes rewritten with professional photography language. Each shot now includes specific lens, composition, lighting, and mood details:

```typescript
export const PHOTO_SESSION_PRESETS: SessionPreset[] = [
  {
    id: 'selfies',
    icon: '\uD83E\uDD33',
    label: 'Selfies',
    description: 'Close-up self-portrait, phone angles',
    shots: [
      'smartphone selfie at arm\'s length, 24mm wide-angle with subtle barrel distortion, ring light catchlights as circular reflections in eyes, natural skin texture, Instagram-ready 4:5 crop, natural warm smile',
      'eye-level selfie with phone at face height, flat perspective minimizing distortion, soft natural window light from left, relaxed genuine expression, portrait mode background blur, warm color temperature',
      'full-body mirror selfie in well-lit space, phone at chest height, flash creating specular on mirror, reflection showing full outfit and environment, casual authentic pose, visible phone in hand',
      'low-angle selfie from below chin level, 24mm looking upward, dramatic perspective emphasizing jaw and neck, sky or ceiling background, confident power energy, strong jawline definition',
      'candid mid-laugh selfie, motion blur on hair suggesting movement, genuine joy with crinkled eyes, slightly off-center framing, warm natural lighting, authentic unposed energy',
    ],
  },
  {
    id: 'grwm',
    icon: '\uD83D\uDC84',
    label: 'GRWM',
    description: 'Get Ready With Me, beauty close-ups',
    shots: [
      'beauty close-up with LED ring light creating circular catchlights, macro-quality skin detail, visible makeup texture on skin, bathroom vanity environment, warm 4000K lighting, content-creator setup',
      'extreme macro detail of eye area, individual lash definition, iris texture visible, eyeshadow blend and pigment, ring light reflection in pupil, skin texture at microscopic level',
      'extreme macro detail of lips, lip product texture and finish visible, cupid\'s bow definition, natural lip texture underneath product, soft studio lighting, beauty-campaign framing',
      'getting-ready candid in bathroom vanity, products on counter, one hand applying product, mirror reflection showing concentration, warm tungsten vanity bulb lighting, documentary style',
      'vanity mirror shot showing full beauty setup, ring light in mirror edge, products laid out, subject checking final look, selfie-through-mirror composition, warm ambient glow',
    ],
  },
  {
    id: 'stories',
    icon: '\uD83D\uDCF1',
    label: 'Stories',
    description: 'Vertical 9:16, casual talking-to-camera',
    shots: [
      'vertical 9:16 bust shot talking to camera, direct eye contact, shoulders-up framing, soft front lighting, bokeh background at f/2.8, mid-sentence animated expression, influencer story aesthetic',
      'vertical 9:16 full-body walking toward camera, low angle from hip height, confident stride with natural arm swing, urban background with motion blur, dynamic energy, full outfit visible',
      'vertical 9:16 genuine mid-laugh reaction, head tilted back slightly, eyes crinkled with joy, unposed energy, natural lighting, warm color grade, authentic moment, hair in motion',
      'vertical 9:16 three-quarter medium shot, hands gesturing expressively mid-explanation, passionate body language, soft background blur, ring light or window light, creator energy',
      'vertical 9:16 looking away then glancing back toward camera, over-shoulder angle, mysterious allure, hair falling across face, backlit with rim light, shallow depth of field, editorial vertical',
    ],
  },
  {
    id: 'editorial',
    icon: '\uD83C\uDF9E\uFE0F',
    label: 'Editorial',
    description: 'High fashion, magazine quality',
    shots: [
      'high-fashion editorial three-quarter angle, magazine cover quality, beauty dish key light, sharp eyes with intent gaze, sculptural pose with angular body lines, Vogue-caliber composition',
      'pure side profile at exact 90-degree angle, silhouette-quality edge definition, single dramatic key light from front on nose and lips, clean negative space, architectural pose',
      'wide environmental editorial full-body, model in dramatic location, fashion-forward pose with geometric angles, deep depth of field, fashion campaign style, magazine double-spread composition',
      'low-angle editorial from below eye level looking upward, power stance with wide shoulders, dramatic sky or architecture background, strong silhouette outline, authority and confidence',
      'high-contrast frontal portrait, dramatic single light creating bold shadows, piercing direct eye contact, symmetrical composition, editorial minimalism, fashion portrait with attitude',
    ],
  },
  {
    id: 'portrait',
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Portrait',
    description: 'Classic studio portraits, 85mm bokeh',
    shots: [
      'classic bust portrait on 85mm f/1.4 with smooth circular bokeh, Rembrandt or loop lighting, neutral expression with subtle inner life, clean studio background gradient, professional artistry',
      'three-quarter face turn with Rembrandt lighting triangle on shadow-side cheek, warm key through softbox, dark moody background, painterly quality suggesting Vermeer, dramatic yet intimate',
      'extreme close-up of eyes only, sharp catch-light detail with lighting reflection, iris color and texture at macro level, brow and lash definition, emotional depth through eyes alone',
      'back three-quarter view looking over shoulder toward camera, mysterious and alluring, backlit warm rim on shoulder and hair, face partially in shadow, noir quality, intrigue',
      'side profile silhouette against gradient background, rim light defining every facial contour, clean edge from forehead to chin, elegant neck line, fine-art portrait quality',
    ],
  },
  {
    id: 'street',
    icon: '\uD83C\uDFD9\uFE0F',
    label: 'Street Style',
    description: 'Urban outdoor fashion, candid vibes',
    shots: [
      'full-body street fashion on 70-200mm compression, mid-stride natural movement, urban background compressed into bokeh, outfit as hero element, golden hour lighting, fashion week energy',
      'low three-quarter angle from hip height, 35mm wide-angle, urban canyon with buildings framing subject, confident stance, converging architectural lines leading to subject',
      'side profile leaning against textured wall, shallow depth throwing wall out of focus, casual cool pose, one foot up, environmental portrait with urban texture, available light',
      'wide establishing shot with rule-of-thirds placement, urban environment as co-star, subject commanding but small in frame, deep depth of field, documentary style',
      'close-up candid street portrait, documentary style, natural unposed expression, available light creating authentic mood, slight motion blur, film grain texture, raw energy',
    ],
  },
  {
    id: 'creator',
    icon: '\u2728',
    label: 'Creator',
    description: 'Influencer content, engaging energy',
    shots: [
      'content creator talking to camera, confident expressive delivery, professional LED panel lighting, visible mic or camera rig, direct engagement eye contact, warm approachable energy, YouTube thumbnail composition',
      'product showcase holding item at chest height toward camera, clean background, soft even lighting on face and product, commercial quality, brand-partnership aesthetic, genuine enthusiasm',
      'genuine reaction mid-laugh, relatable authentic moment, slightly over-exposed bloom suggesting candid capture, warm color grade, lifestyle content quality, audience-connection energy',
      'aspirational upward gaze with soft dramatic lighting, dreaming-thinking expression, creative person aesthetic, bokeh background warm tones, editorial-meets-lifestyle, inspirational content',
      'over-the-shoulder content shot from behind, showing subject\'s view, hair and shoulder in soft foreground, behind-the-scenes moment, creator lifestyle documentation',
    ],
  },
  {
    id: 'lifestyle',
    icon: '\uD83C\uDF3F',
    label: 'Lifestyle',
    description: 'Everyday moments, warm natural light',
    shots: [
      'sitting at cafe table three-quarter angle, hands wrapped around coffee cup, warm window light casting soft directional glow, cozy intimate atmosphere, lifestyle storytelling',
      'walking through tree-lined street, candid wide with natural dappled sunlight filtering through leaves, relaxed everyday energy, warm green-gold color palette',
      'at home cross-legged on couch, casual relaxed pose with soft interior light, comfortable personal space, warm tungsten ambient, authentic domestic moment',
      'looking at phone or book, side angle absorbed in moment, candid unposed energy, available window light creating gentle contrast, lifestyle documentary style',
      'standing by window side-lit by natural daylight, looking outside pensively, serene peaceful mood, dramatic light-and-shadow on face, contemplative portrait',
    ],
  },
  {
    id: 'fitness',
    icon: '\uD83D\uDCAA',
    label: 'Fitness',
    description: 'Athletic action shots, gym energy',
    shots: [
      'mid-workout action freeze at peak exertion, sweat catching gym light, determined focused expression, equipment in background, dynamic athletic pose, high shutter speed frozen motion',
      'gym mirror selfie showing physique, overhead fluorescent top-down lighting, pump-enhanced definition, workout outfit, phone in hand, authentic fitness-influencer format',
      'post-workout portrait with dewy sweating skin, slightly out of breath, warm glowing complexion, gym towel as prop, natural exhaustion beauty, harsh gym lighting softened by moisture',
      'athletic action mid-jump or sprint, motion blur on limbs with sharp torso, outdoor or gym, dynamic diagonal composition, peak athleticism, sports photography energy',
      'yoga or stretching pose in serene setting, elongated body line, morning light through windows, calm focused expression, body-as-sculpture aesthetic, warm golden tones',
    ],
  },
  {
    id: 'nightout',
    icon: '\uD83C\uDF19',
    label: 'Night Out',
    description: 'Evening glamour, neon and nightlife',
    shots: [
      'club entrance with neon signage creating colored rim light, confident going-out pose, wet sidewalk reflections multiplying lights, warm skin under cool neon, nightlife energy',
      'dance floor with mixed colored LED lighting, motion blur on periphery, sharp face focus, sweat glistening under strobes, euphoric expression, strobe-frozen instant',
      'bar-side portrait with warm amber back-bar lighting, cocktail glass creating foreground bokeh, intimate low-light atmosphere, ISO grain adding authenticity, social moment',
      'flash photography straight-on in dark environment, harsh direct flash creating flat shadows behind, party snapshot aesthetic, authentic nightlife documentation',
      'leaving the club 3am street lighting, slightly disheveled authentic energy, taxi glow from side, mixed sodium and LED street light, tired-happy expression, light trails background',
    ],
  },
  {
    id: 'fotodump',
    icon: '\uD83D\uDCF7',
    label: 'Foto Dump',
    description: 'Candid mix, disposable camera feel',
    shots: [
      'ultra candid slightly tilted frame, caught mid-movement, motion blur on edges, film grain texture, disposable camera aesthetic, raw unfiltered, warm color cast from cheap flash',
      'extreme close-up detail — hands shoes jewelry or food — macro off-center composition, spontaneous intimate, shallow depth of field, natural light',
      'wide shot subject small at edge of frame, environment dominates, documentary snapshot quality, slice-of-life moment, deep depth of field, casual composition',
      'selfie from exaggerated angle too close or from below, unfiltered casual expression, wide grin or deadpan, authentic, wide-angle distortion, unflattering but charming',
      'over-shoulder walking-away shot, spontaneous escape energy, candid street feel, slight motion blur, warm afternoon light, nostalgic',
      'soft-focus portrait with analog film grain, warm or faded color cast, vintage disposable camera feel, imperfect and nostalgic, light leak on edge',
    ],
  },
  {
    id: 'datenight',
    icon: '\uD83C\uDF77',
    label: 'Date Night',
    description: 'Romantic, candlelight, intimate',
    shots: [
      'candlelight portrait with warm amber glow on face, soft flickering shadows, intimate restaurant setting with bokeh candles behind, romantic mood, shallow depth of field',
      'close-up over wine glass edge, slight smile, eyes reflecting candlelight catchlights, shallow depth isolating face from restaurant blur, elegant, warm tones',
      'full body walking arm-in-arm on city sidewalk at night, streetlights creating bokeh orbs behind, romantic stroll, warm from nearby storefronts, cinematic couple moment',
      'three-quarter seated at table leaning forward slightly, engaged charming expression, warm restaurant ambient, wine and plates in foreground bokeh, date energy',
      'looking away pensively side profile, ambient restaurant lighting creating soft contour, contemplative and beautiful, stolen moment, warm intimate atmosphere',
    ],
  },
  {
    id: 'pool',
    icon: '\uD83C\uDFCA',
    label: 'Pool / Summer',
    description: 'Poolside, splash, golden wet skin',
    shots: [
      'poolside lounging full body on sunbed, sunglasses, golden direct sunlight creating defined shadows, relaxed summer luxury, saturated warm colors, vacation editorial',
      'emerging from water with wet hair slicked back, water droplets catching sunlight on skin as bright specular points, bright natural light, refreshing splash energy',
      'sitting on pool edge feet in turquoise water, looking over shoulder at camera, backlit by afternoon sun creating golden rim, summer glow, water reflections on face',
      'cocktail in hand by pool three-quarter angle, sunhat, tropical resort vibes, vibrant saturated colors, vacation influencer energy, warm golden light',
      'face and shoulders close-up with wet glistening skin, turquoise water color reflections dancing on face, ethereal summer beauty, bright backlit, water bokeh',
    ],
  },
  {
    id: 'cozyhome',
    icon: '\uD83C\uDFE0',
    label: 'Cozy Home',
    description: 'Morning bed, couch, warm interior',
    shots: [
      'morning in bed tangled in white sheets, soft diffused window light, just waking up expression, peaceful and natural, warm golden morning tones, intimate bedroom atmosphere',
      'couch with blanket legs tucked up holding mug, warm interior tones from table lamp, reading or watching, comfortable domestic, soft side lighting, cozy evening',
      'kitchen cooking candid side angle, natural movement at counter, warm overhead pendant light, domestic charm, steam or flour in air catching light, lifestyle documentary',
      'bathroom mirror getting ready, half-dressed authentic morning routine, steam softening the air, warm vanity lighting, honest intimate moment, reflection composition',
      'reading nook by window curled up with book, afternoon golden light streaming in, serene focused expression, cozy corner with pillows and blankets, peaceful solitude',
    ],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add data/sessionPresets.ts
git commit -m "feat: rewrite all 14 Photo Session vibes with professional photography prompts"
```

---

## Chunk 5: Prompt Engineering — AI Editor & Upload Character

### Task 11: Rewrite AIEditor relight presets and style transfer prompts

**Files:**
- Modify: `pages/AIEditor.tsx:32-44` (relightPresets)
- Modify: `pages/AIEditor.tsx:48` (styleNames)
- Modify: `pages/AIEditor.tsx:238-241` (style transfer prompt template)

- [ ] **Step 1: Rewrite relightPresets with physics-based descriptions**

Replace lines 32-44:

```typescript
const relightPresets = [
  { n:'Golden Hour',  c:'#f0b860', az: -60, el: 15,  prompt:'golden hour at 15 minutes before sunset, warm 3200K color temperature, long shadows at 15° elevation, Fresnel rim highlights on hair and shoulders, atmospheric haze diffusion, warm fill from ground bounce' },
  { n:'Blue Hour',    c:'#6ba3d9', az: 0,   el: 30,  prompt:'civil twilight blue hour, cool 7500K ambient, no direct sun, diffused omnidirectional quality, deep blue sky reflecting on upward surfaces, warm artificial lights becoming prominent, contemplative mood' },
  { n:'Studio',       c:'#e8e4dc', az: 0,   el: 45,  prompt:'professional beauty dish key light 45° camera-left, V-flat fill, 5500K neutral, hair light from above-behind with 10° grid, 3:1 ratio, catchlights at 10 o\'clock position' },
  { n:'Neon Coral',   c:'#e8725c', az: 90,  el: 0,   prompt:'neon sign illumination in warm coral, hard colored light from right creating vivid color cast on skin, deep complementary teal shadows, wet surface reflections, urban night atmosphere' },
  { n:'Dramatic',     c:'#d4603e', az: -45, el: 60,  prompt:'single hard key at 60° camera-left, Chiaroscuro lighting, 8:1 contrast ratio, minimal fill allowing true black shadows, Rembrandt triangle on shadow cheek, theatrical intensity' },
  { n:'Moonlight',    c:'#9a90c4', az: 30,  el: 70,  prompt:'full moonlight at 4100K with blue-silver cast, very soft diffused quality, low intensity, gentle shadows with no hard edges, nocturnal atmosphere, cool silver tone on all surfaces' },
  { n:'Sunset',       c:'#d9826a', az: -90, el: 10,  prompt:'late sunset warm amber-gold directional light at 10° elevation, extreme warm 2800K, long dramatic shadows, golden halo rim on hair, sky gradient peach to violet, nostalgic warmth' },
  { n:'Cool White',   c:'#b8c9d9', az: 0,   el: 50,  prompt:'overcast daylight at 6500K, perfectly diffused shadowless illumination, neutral color rendering, even exposure across subject, clinical clean quality, fashion lookbook lighting' },
  { n:'Ring Light',   c:'#f0e8e0', az: 0,   el: 0,   prompt:'LED ring light on camera axis creating circular catchlights in both eyes, flat front-fill with minimal shadow, beauty-influencer aesthetic, even face illumination, warm 4500K' },
  { n:'Rembrandt',    c:'#c8a060', az: -40, el: 35,  prompt:'classic Rembrandt pattern, key 45° high creating illuminated triangle on shadow-side cheek below eye, nose shadow connecting to cheek shadow, painterly classical quality, 4:1 ratio' },
]
```

- [ ] **Step 2: Expand styleNames to include detailed prompts**

At line 48, replace the simple array with a richer structure. Add this above line 48:

```typescript
const styleTransfers = [
  { name: 'Anime', prompt: 'high-quality anime illustration: clean cel-shaded coloring, precise linework with variable weight, large expressive eyes with detailed iris reflections, stylized proportions, vibrant palette, studio Trigger quality' },
  { name: 'Oil Painting', prompt: 'classical oil painting: visible impasto brushwork with texture, Renaissance color mixing with glazing layers, warm Rembrandt lighting, canvas texture underneath, rich deep shadows with burnt umber undertones' },
  { name: 'Watercolor', prompt: 'delicate watercolor painting: transparent wash layers building form, wet-on-wet bleeding on edges, white paper showing through as highlights, granulation texture, soft color blooms, controlled dripping' },
  { name: 'Pop Art', prompt: 'bold Pop Art: flat graphic colors with Ben-Day dot patterns, strong black outlines, Warhol/Lichtenstein aesthetic, limited 4-6 saturated colors, halftone screening, comic-book drama' },
  { name: 'Sketch', prompt: 'detailed pencil sketch: graphite on textured paper, varied line weight from light construction to dark contour, cross-hatching for shadow, visible guide lines, white highlights where paper shows' },
  { name: 'Pixel Art', prompt: 'pixel art: visible pixel grid at 128px scale, limited 32-color palette with intentional dithering, each pixel hand-placed quality, clean readable silhouette, retro game aesthetic' },
  { name: 'Vintage Film', prompt: 'vintage 1970s film: Kodachrome color science with saturated reds, heavy organic grain, slight fading on edges, warm amber cast, soft focus from vintage optics, light leak artifacts' },
  { name: 'Cyberpunk', prompt: 'cyberpunk digital art: neon-lit futuristic aesthetic, holographic UI elements on skin, circuit-board textures, teal-magenta color split, chrome accents, glitch artifacts, rain-streaked Blade Runner 2049 palette' },
]
```

Then update the style transfer prompt builder at lines 238-241 to use the new detailed prompts:

```typescript
} else if (activeTool === 'style') {
  const style = styleTransfers[selStyle]
  const instruction = `STYLE TRANSFER (overrides preservation rule): Transform the entire image into ${style.name} style. ${style.prompt}. The person's face must remain recognizable (same identity, pose, expression) but the visual rendering of EVERYTHING should change to match this aesthetic. Apply strongly and consistently.`
  resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p))
}
```

Also keep the `styleNames` array for display purposes:

```typescript
const styleNames = styleTransfers.map(s => s.name)
```

- [ ] **Step 3: Commit**

```bash
git add pages/AIEditor.tsx
git commit -m "feat: rewrite AIEditor relight + style transfer with professional prompts"
```

---

### Task 12: Rewrite UploadCharacter render styles and skin textures

**Files:**
- Modify: `pages/UploadCharacter.tsx:11-36` (renderStyles)
- Modify: `pages/UploadCharacter.tsx:85-97` (skinTextures)

- [ ] **Step 1: Rewrite renderStyles with art-directed prompts**

Replace lines 11-36:

```typescript
const renderStyles = [
  { id:'photorealistic', label:'Photorealistic', icon:'📷', desc:'Human-like, studio photography',
    prompt:'Ultra-photorealistic digital human, indistinguishable from photograph, shot on Phase One IQ4 150MP with Schneider 110mm f/2.8, natural skin with visible pores and subsurface blood flow, accurate eye moisture, individual hair strand rendering, physically-based material response,',
    scenario:'Professional photography studio with Profoto B10 key through 4ft octabox, V-flat fill, clean neutral background, shot on medium format digital, natural skin imperfections',
    bg:'linear-gradient(135deg, #f0b86020, #d4956b10)' },
  { id:'anime', label:'Anime / Manga', icon:'🎨', desc:'Japanese animation style',
    prompt:'Premium anime character, Production I.G / studio Bones quality, clean precise linework with variable stroke weight, cel-shaded with sophisticated shadow gradients, luminous multi-layered iris reflections, stylized proportions, dynamic hair strand groups,',
    scenario:'Anime background with atmospheric depth, soft painted sky, drawn in high-end anime style, NOT a photograph, NOT photorealistic, 2D illustration with volumetric lighting',
    bg:'linear-gradient(135deg, #e8749a15, #9a90c415)' },
  { id:'3d-render', label:'3D Render', icon:'🖥️', desc:'CGI, Pixar-like, game character',
    prompt:'AAA game-quality 3D character render, Unreal Engine 5 quality, high-poly sculpted mesh, PBR material workflow on all surfaces, subsurface scattering skin shader with detail maps, strand-based groomed hair, HDRI environment lighting with ray-traced AO,',
    scenario:'3D rendered environment with Lumen global illumination, cinematic depth of field with physically accurate bokeh, rendered in Octane/Unreal Engine 5',
    bg:'linear-gradient(135deg, #4858e015, #50d8a010)' },
  { id:'illustration', label:'Illustration', icon:'✍️', desc:'Digital art, concept art',
    prompt:'High-end digital character illustration, concept art portfolio quality, painterly technique blending precise linework with expressive color blocking, sophisticated light study with warm/cool shifts, character design clarity with strong silhouette,',
    scenario:'Fantasy concept art environment with atmospheric perspective, rich texture variation suggesting mixed media, art book presentation quality',
    bg:'linear-gradient(135deg, #f0b86015, #e8725c10)' },
  { id:'stylized', label:'Stylized', icon:'✨', desc:'Semi-realistic, Arcane / Spider-Verse',
    prompt:'Distinctive stylized character with exaggerated design language, Arcane/Spider-Verse quality, strong graphic silhouette with memorable proportions, bold shape language defining personality, limited palette with strategic accent pops,',
    scenario:'Stylized cinematic environment with dramatic moody lighting and color grading, cel-shaded with painterly details, NOT photorealistic, poster-quality composition',
    bg:'linear-gradient(135deg, #d048b015, #f0684815)' },
  { id:'pixel-art', label:'Pixel Art', icon:'🟨', desc:'Retro 8-bit / 16-bit',
    prompt:'Premium pixel art character sprite 64-128px base resolution, carefully placed individual pixels with intentional color choice, limited 32-color palette with strategic dithering, sub-pixel animation-ready, clear silhouette at small scale,',
    scenario:'Retro pixel art environment, 16-bit video game quality, Hyper Light Drifter visual sophistication, pixelated throughout, NOT smooth, NOT photorealistic',
    bg:'linear-gradient(135deg, #50d8a015, #4858e010)' },
]
```

- [ ] **Step 2: Rewrite skinTextures with rich descriptive prompts**

Replace lines 85-97:

```typescript
const skinTextures = [
  { id:'human', label:'Human', desc:'Natural human skin', prompt:'natural human skin texture with visible pores, fine vellus hair, subsurface blood flow coloring, micro-wrinkles at expression lines' },
  { id:'scales', label:'Scales', desc:'Reptile / Dragon', prompt:'iridescent reptilian scales with subsurface light scattering, each scale individually defined with micro-specular highlights, color shifts from emerald to teal at viewing angle' },
  { id:'feathers', label:'Feathers', desc:'Avian / Bird', prompt:'layered plumage with iridescent sheen, each feather with visible barbs and rachis, soft down underneath, light catching individual filaments' },
  { id:'fur', label:'Fur', desc:'Beast / Animal', prompt:'dense soft fur with individual strand rendering, light penetrating outer guard hairs creating rim glow, color variation from root to tip, natural grooming patterns' },
  { id:'metallic', label:'Metallic', desc:'Robot / Android', prompt:'brushed chrome and titanium skin panels with precision-machined joints, anisotropic specular reflections, subtle LED indicators at seams, carbon-fiber accent surfaces' },
  { id:'crystal', label:'Crystal', desc:'Gem / Mineral', prompt:'translucent crystalline skin with internal refraction and caustic light patterns, faceted surfaces catching light as brilliant points, color dispersion at edges like a prism' },
  { id:'bark', label:'Bark', desc:'Tree / Wood', prompt:'living bark texture with deep fissures revealing bioluminescent inner wood, moss and lichen growing in crevices, growth rings visible at joints, ancient and organic' },
  { id:'ethereal', label:'Ethereal', desc:'Ghost / Spirit', prompt:'translucent ethereal form with visible internal light source, body fading to transparency at extremities, holographic shimmer, particles dissolving at edges, ghostly luminescence' },
  { id:'stone', label:'Stone', desc:'Golem / Rock', prompt:'volcanic basalt and granite surface with crystalline inclusions catching light, deep cracks revealing magma glow beneath, moss in weathered areas, ancient geological weight' },
  { id:'slime', label:'Slime', desc:'Gel / Ooze', prompt:'translucent gelatinous body with internal suspended particles, surface tension creating rounded reflective highlights, visible objects suspended within, bioluminescent core glow' },
]
```

- [ ] **Step 3: Commit**

```bash
git add pages/UploadCharacter.tsx
git commit -m "feat: rewrite UploadCharacter render styles + skin textures with art direction"
```

---

## Chunk 6: Final Polish & Verification

### Task 13: Verify build and visual check

- [ ] **Step 1: Run build**

Run: `pnpm build`
Expected: Clean build with no errors

- [ ] **Step 2: Run dev server and visual check**

Run: `pnpm dev`
Verify:
- Background is deeper violet (not blue-black)
- Glows are violet-dominant (not hot-pink)
- Buttons have active/click feedback (scale down on click)
- Text gradients cycle violet → pink → lavender
- Glass cards have subtle scan lines visible on close inspection
- Film grain is slightly more visible
- Page transitions include subtle blur-in effect

- [ ] **Step 3: Final commit and tag**

```bash
git add -A
git commit -m "feat: Joi aesthetic evolution — deep violet identity + prompt engineering rewrite

- Shifted palette from hot-pink to violet-dominant (Blade Runner 2049 Joi)
- Added holographic scan lines to glass surfaces
- Upgraded all button microinteractions (active states, pulse ring, breathing)
- Rewrote 100+ AI prompts with professional art direction language
- Added 2 new camera presets (Drone, Anamorphic)
- Added 2 new lighting presets (Blade Runner, Holographic)
- Enhanced all 14 Photo Session vibes with photography-grade descriptions
- Rewrote enhancers, render styles, skin textures, relight, style transfer"
```
