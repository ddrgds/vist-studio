# Hero Shot + Session Variations — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 2-step decoupled workflow: Director page generates hero shots with enriched controls, Photo Session picks gallery photos as base and generates vibe-based variations with Grok Edit.

**Architecture:** Three new data files provide static options (director controls, enhancers, session presets). A new Director page combines character identity + outfit/pose refs + camera/lighting chips + enhancers to generate hero shots via `generateInfluencerImage`. The existing Photo Session page is modified to pick gallery photos as base and generate angle variations using per-vibe custom shots via Grok Edit. Gallery is the bridge — no shared state needed.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, existing Plasma Shift design system, `generateInfluencerImage` (Gemini), `generatePhotoSessionWithGrok` (fal.ai Grok Edit)

**Spec:** `docs/superpowers/specs/2026-03-12-hero-shot-session-workflow-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `data/directorOptions.ts` | **Create** | LIGHTING_OPTIONS, CAMERA_OPTIONS, POSE_OPTIONS, INSPIRATIONS arrays |
| `data/enhancers.ts` | **Create** | ENHANCERS array with label, icon, promptSnippet per enhancer |
| `data/sessionPresets.ts` | **Create** | PHOTO_SESSION_PRESETS with per-vibe shot descriptions, round-robin mixer function |
| `pages/Director.tsx` | **Create** | Full Director page with accordion sections, calls generateInfluencerImage, saves to gallery |
| `pages/PhotoSession.tsx` | **Modify** | Replace character picker with gallery picker, use vibe-based shots, Grok Edit |
| `components/Sidebar.tsx` | **Modify** | Add Director nav entry under CREATE section |
| `App.tsx` | **Modify** | Add Director route/page import |

**Files NOT modified:** `index.css`, `services/geminiService.ts`, `services/falService.ts`, `stores/galleryStore.ts`, `types.ts`

---

## Chunk 1: Data files

### Task 1: Create director options data file

**Files:**
- Create: `data/directorOptions.ts`

- [ ] **Step 1: Create the `data/` directory and file**

```typescript
// data/directorOptions.ts

export interface ChipOption {
  id: string;
  label: string;
  icon: string;
  value: string;  // Descriptive text injected into prompt
}

export interface Inspiration {
  id: string;
  emoji: string;
  label: string;
  scene: string;
}

// ── Pose presets ──────────────────────────────────────────
export const POSE_OPTIONS: ChipOption[] = [
  { id: 'standing',  label: 'Standing',  icon: '\uD83E\uDDCD', value: 'standing upright, confident posture, facing camera' },
  { id: 'sitting',   label: 'Sitting',   icon: '\uD83E\uDE91', value: 'seated, relaxed pose, comfortable position' },
  { id: 'walking',   label: 'Walking',   icon: '\uD83D\uDEB6', value: 'walking towards camera, natural movement, dynamic' },
  { id: 'crouching', label: 'Crouching', icon: '\uD83E\uDDCE', value: 'crouching down, low angle, dynamic crouch pose' },
  { id: 'back',      label: 'Back',      icon: '\u21A9\uFE0F', value: 'looking back over shoulder, three-quarter back view' },
  { id: 'leaning',   label: 'Leaning',   icon: '\uD83D\uDCD0', value: 'leaning against wall, casual relaxed pose' },
];

// ── Camera presets ────────────────────────────────────────
export const CAMERA_OPTIONS: ChipOption[] = [
  { id: 'portrait',  label: 'Portrait 85mm',  icon: '\uD83D\uDCF7', value: 'shot on 85mm lens, shallow depth of field, beautiful bokeh' },
  { id: 'wide',      label: 'Wide 24mm',      icon: '\uD83D\uDD2D', value: '24mm wide angle lens, dynamic perspective, immersive view' },
  { id: 'macro',     label: 'Macro',          icon: '\uD83D\uDD2C', value: 'macro photography, extreme close up, sharp microdetails' },
  { id: 'cinematic', label: 'Cinema',         icon: '\uD83C\uDFAC', value: 'anamorphic lens, cinematic aspect ratio, film look' },
  { id: 'polaroid',  label: 'Polaroid',       icon: '\uD83D\uDCF8', value: 'polaroid style, instant photo aesthetic, vintage colors' },
  { id: 'vintage',   label: 'Vintage 35mm',   icon: '\uD83C\uDF9E\uFE0F', value: 'vintage film camera look, 35mm film, subtle grain' },
];

// ── Lighting presets ──────────────────────────────────────
export const LIGHTING_OPTIONS: ChipOption[] = [
  { id: 'natural',  label: 'Natural',  icon: '\u2600\uFE0F', value: 'soft natural light, golden hour, sun-kissed' },
  { id: 'studio',   label: 'Studio',   icon: '\uD83D\uDCA1', value: 'professional studio lighting, softbox, rim light' },
  { id: 'golden',   label: 'Golden',   icon: '\uD83C\uDF05', value: 'golden hour light, warm tones, soft shadows' },
  { id: 'neon',     label: 'Neon',     icon: '\uD83C\uDF06', value: 'neon lighting, cyberpunk glow, vivid colors' },
  { id: 'dramatic', label: 'Dramatic', icon: '\uD83C\uDFAD', value: 'dramatic cinematic lighting, deep shadows' },
  { id: 'dark',     label: 'Dark',     icon: '\uD83C\uDF19', value: 'low key lighting, dark atmosphere, moody' },
];

// ── Inspiration scenes ────────────────────────────────────
export const INSPIRATIONS: Inspiration[] = [
  { id: 'neon-city',         emoji: '\uD83C\uDF06', label: 'Neon City',         scene: 'neon-lit city street at night, vibrant colors, urban atmosphere' },
  { id: 'tropical-beach',    emoji: '\uD83C\uDFDD\uFE0F', label: 'Tropical Beach',    scene: 'tropical beach with turquoise water, palm trees, golden sand' },
  { id: 'studio-white',      emoji: '\u2B1C',       label: 'Studio White',      scene: 'clean white photography studio, professional backdrop, even lighting' },
  { id: 'night-skyline',     emoji: '\uD83C\uDF03', label: 'Night Skyline',     scene: 'rooftop overlooking city skyline at night, twinkling lights' },
  { id: 'luxury-apartment',  emoji: '\uD83D\uDECB\uFE0F', label: 'Luxury Apt',       scene: 'luxury modern apartment interior, designer furniture, floor-to-ceiling windows' },
  { id: 'coffee-shop',       emoji: '\u2615',       label: 'Coffee Shop',       scene: 'cozy artisan coffee shop, warm wood tones, ambient cafe lighting' },
  { id: 'park-garden',       emoji: '\uD83C\uDF3F', label: 'Park Garden',       scene: 'lush green park garden, dappled sunlight through trees, floral surroundings' },
  { id: 'rooftop-sunset',    emoji: '\uD83C\uDF05', label: 'Rooftop Sunset',    scene: 'rooftop terrace at sunset, golden hour sky, panoramic view' },
  { id: 'gym',               emoji: '\uD83C\uDFCB\uFE0F', label: 'Gym',               scene: 'modern gym interior, weights and equipment, motivational atmosphere' },
  { id: 'art-gallery',       emoji: '\uD83D\uDDBC\uFE0F', label: 'Art Gallery',       scene: 'minimalist art gallery, white walls, spotlit artworks, elegant space' },
  { id: 'street-market',     emoji: '\uD83C\uDFEA', label: 'Street Market',     scene: 'bustling street market, colorful stalls, lively crowd atmosphere' },
  { id: 'desert-dunes',      emoji: '\uD83C\uDFDC\uFE0F', label: 'Desert Dunes',      scene: 'desert sand dunes at magic hour, orange and pink sky, vast landscape' },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | grep "directorOptions" | head -5`
Expected: No errors related to this file

- [ ] **Step 3: Commit**

```bash
git add data/directorOptions.ts
git commit -m "feat: add director options data (pose, camera, lighting, inspirations)"
```

---

### Task 2: Create enhancers data file

**Files:**
- Create: `data/enhancers.ts`

- [ ] **Step 1: Create the enhancers file**

```typescript
// data/enhancers.ts

export interface Enhancer {
  id: string;
  label: string;
  icon: string;
  promptSnippet: string;  // Injected verbatim into the generation prompt
}

export const ENHANCERS: Enhancer[] = [
  {
    id: 'glossy-skin',
    label: 'Glossy Skin',
    icon: '\u2728',
    promptSnippet: 'luminous glossy skin with visible light reflections, dewy finish, radiant complexion',
  },
  {
    id: 'film-grain',
    label: 'Film Grain',
    icon: '\uD83C\uDF9E\uFE0F',
    promptSnippet: 'subtle 35mm analog film grain texture, organic noise, filmic look',
  },
  {
    id: '3d-rendered',
    label: '3D Rendered',
    icon: '\uD83D\uDC8E',
    promptSnippet: 'hyper-realistic 3D render, subsurface scattering on skin, perfectly smooth lighting, CGI quality',
  },
  {
    id: 'cinematic-grade',
    label: 'Cinematic Grade',
    icon: '\uD83C\uDFAC',
    promptSnippet: 'cinematic color grading, teal-orange split toning, movie-like depth, film color science',
  },
  {
    id: 'sharp-textures',
    label: 'Sharp Textures',
    icon: '\uD83D\uDD0D',
    promptSnippet: 'hyper-detailed textures, every fabric thread and skin pore visible, tack-sharp, micro-detail',
  },
  {
    id: 'rim-light',
    label: 'Rim Light',
    icon: '\uD83C\uDF1F',
    promptSnippet: 'strong rim/edge lighting separating subject from background, backlit halo, contour light',
  },
  {
    id: 'soft-glow',
    label: 'Soft Glow',
    icon: '\uD83D\uDCAB',
    promptSnippet: 'ethereal soft glow, dreamy halation, gentle light bloom around highlights, angelic radiance',
  },
  {
    id: 'high-contrast',
    label: 'High Contrast',
    icon: '\uD83D\uDDA4',
    promptSnippet: 'high contrast dramatic look, deep blacks, bright highlights, punchy tones, bold shadows',
  },
  {
    id: 'vivid-colors',
    label: 'Vivid Colors',
    icon: '\uD83C\uDF08',
    promptSnippet: 'ultra-vivid saturated colors, bold chromatic intensity, eye-popping palette, color-rich',
  },
  {
    id: 'shallow-dof',
    label: 'Shallow DOF',
    icon: '\uD83D\uDCF7',
    promptSnippet: 'extremely shallow depth of field, f/1.2 aperture bokeh, creamy background blur, subject isolation',
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    icon: '\uD83C\uDF1E',
    promptSnippet: 'warm golden hour sunlight, long soft shadows, amber tones, magic hour atmosphere',
  },
  {
    id: 'wet-look',
    label: 'Wet Look',
    icon: '\uD83D\uDCA7',
    promptSnippet: 'wet glistening skin, water droplets, rain-soaked hair, reflective wet surfaces',
  },
];

/**
 * Given a set of selected enhancer IDs, returns the combined prompt string.
 * Custom text (if any) is appended at the end.
 */
export const buildEnhancerPrompt = (
  selectedIds: Set<string>,
  customText?: string
): string => {
  const snippets = ENHANCERS
    .filter(e => selectedIds.has(e.id))
    .map(e => e.promptSnippet);

  if (customText?.trim()) snippets.push(customText.trim());

  return snippets.length > 0 ? `ENHANCE: ${snippets.join('. ')}.` : '';
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | grep "enhancers" | head -5`
Expected: No errors related to this file

- [ ] **Step 3: Commit**

```bash
git add data/enhancers.ts
git commit -m "feat: add prompt enhancers data (glossy skin, film grain, 3D render, etc.)"
```

---

### Task 3: Create session presets data file

**Files:**
- Create: `data/sessionPresets.ts`

- [ ] **Step 1: Create the session presets with round-robin mixer**

```typescript
// data/sessionPresets.ts

export interface SessionPreset {
  id: string;
  icon: string;
  label: string;
  description: string;
  shots: string[];  // Pre-written shot descriptions with specific camera/composition
}

export const PHOTO_SESSION_PRESETS: SessionPreset[] = [
  {
    id: 'selfies',
    icon: '\uD83E\uDD33',
    label: 'Selfies',
    description: 'Close-up self-portrait, phone angles',
    shots: [
      'selfie angle, camera held slightly above eye level at arm\'s length, front-facing, natural warm smile, tight crop on face and upper shoulders',
      'eye-level selfie, camera at exact face height, playful expression, slight head tilt to one side, close crop',
      'mirror selfie, full body visible in reflection, arm extended toward camera, outfit showcase, confident casual stance',
      'low selfie angle, camera just below chin level, subject looking down into lens with a confident smirk, dramatic angle',
      'candid selfie, caught mid-laugh, slightly off-center framing, authentic and unposed',
    ],
  },
  {
    id: 'grwm',
    icon: '\uD83D\uDC84',
    label: 'GRWM',
    description: 'Get Ready With Me, beauty close-ups',
    shots: [
      'beauty close-up, extreme close on face, soft front lighting, looking directly into lens, skin texture and makeup detail fully visible, ring-light catch lights',
      'macro detail on eyes, upper face tightly cropped, eyeshadow blend and lash detail sharp, side-lit for texture',
      'macro detail on lips, extreme close-up, lip color and product texture clearly visible, slight 3/4 angle',
      'getting-ready candid, 3/4 angle slightly above, hand near hair or face mid-gesture, warm vanity or window light',
      'mirror shot, full face visible in vanity mirror, bedroom or bathroom context, backstage getting-ready atmosphere',
    ],
  },
  {
    id: 'stories',
    icon: '\uD83D\uDCF1',
    label: 'Stories',
    description: 'Vertical 9:16, casual talking-to-camera',
    shots: [
      'vertical 9:16 crop, bust shot, front-facing, talking-to-camera pose, expressive and direct, casual conversational energy',
      'vertical 9:16 crop, full body walking toward camera, dynamic movement, urban or indoor setting, candid lifestyle',
      'vertical, close crop face and shoulders, genuine mid-laugh, eyes crinkled, authentic caught-in-the-moment joy',
      'vertical, 3/4 angle, hands gesturing mid-sentence, storytelling energy, expressive body language',
      'vertical, looking away from camera then glancing back, over-the-shoulder candid, relaxed off-guard vibe',
    ],
  },
  {
    id: 'editorial',
    icon: '\uD83C\uDF9E\uFE0F',
    label: 'Editorial',
    description: 'High fashion, magazine quality',
    shots: [
      '3/4 angle, medium shot, chin slightly down, eyes slightly up, looking left of camera, magazine editorial quality, cinematic color',
      'side profile, 90-degree lateral view, full body, clean architectural negative space, elegant and sculptural composition',
      'wide environmental shot, full body, subject placed at rule-of-thirds left, rich storytelling background',
      'low angle, shooting upward, dynamic power stance, dramatic sky or ceiling context, high-fashion energy',
      'high contrast front portrait, 85mm, direct unwavering gaze, minimal background, stark editorial look',
    ],
  },
  {
    id: 'portrait',
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Portrait',
    description: 'Classic studio portraits, 85mm bokeh',
    shots: [
      'classic bust portrait, 85mm f/1.4, eye-level, direct warm gaze, creamy bokeh, timeless studio quality',
      '3/4 face turn, looking into middle distance past camera, contemplative mood, soft Rembrandt side lighting',
      'intimate extreme close-up, eyes filling most of frame, eyelashes and iris detail crisp, rest softly blurred',
      'back 3/4, head turned over left shoulder toward camera, nape of neck and jawline visible, mysterious and elegant',
      'profile silhouette, 90-degree side, jaw and neck line sculpted by hard side light, graphic and architectural',
    ],
  },
  {
    id: 'street',
    icon: '\uD83C\uDFD9\uFE0F',
    label: 'Street Style',
    description: 'Urban outdoor fashion, candid vibes',
    shots: [
      'full body candid, mid-stride walking, shot from 15ft with 85mm compression, city architecture blurred background',
      'low 3/4 angle, shooting from hip height, dynamic street energy, shallow depth of field, urban attitude',
      'side profile, leaning against brick wall or doorway, cross-armed or hands in pockets, cool effortless style',
      'wide establishing, subject small in frame at rule-of-thirds, rich urban environment and city life surrounding',
      'close-up candid, looking away from camera, natural unposed expression, street light quality, documentary feel',
    ],
  },
  {
    id: 'creator',
    icon: '\u2728',
    label: 'Creator',
    description: 'Influencer content, engaging energy',
    shots: [
      'front-facing talking, confident expressive pose, slightly above eye level, engaging direct eye contact, creator energy',
      'holding phone or product, looking at it then glancing at camera, lifestyle influencer framing, natural light',
      'genuine mid-laugh, 3/4 angle, eyes crinkled, teeth showing, authentic and relatable, candid joy',
      'looking upward and slightly right, slight smile, thinking-dreaming expression, aspirational creative mood',
      'back-of-shoulder looking back, candid documentary feel, subject unaware then noticing camera, intimate behind-the-scenes',
    ],
  },
  {
    id: 'lifestyle',
    icon: '\uD83C\uDF3F',
    label: 'Lifestyle',
    description: 'Everyday moments, warm natural light',
    shots: [
      'sitting at cafe table, 3/4 angle, hands wrapped around coffee cup, warm window light, cozy intimate atmosphere',
      'walking through park or tree-lined street, candid wide, natural dappled sunlight, relaxed everyday energy',
      'at home, sitting cross-legged on floor or couch, casual relaxed pose, soft interior light, comfortable and personal',
      'looking at phone or book, side angle, absorbed in moment, candid and unposed, lifestyle storytelling',
      'standing by window, side-lit by natural daylight, looking outside pensively, serene and peaceful mood',
    ],
  },
  {
    id: 'fitness',
    icon: '\uD83D\uDCAA',
    label: 'Fitness',
    description: 'Athletic action shots, gym energy',
    shots: [
      'action pose mid-movement, dynamic athletic stance, side angle, powerful and energetic, gym or outdoor setting',
      'low angle looking up, strong confident power stance, arms crossed or hands on hips, athletic authority',
      'stretching pose, full body side profile, flexibility and form on display, clean gym background',
      'post-workout candid, slightly above eye level, hands on hips, catching breath, authentic athletic grit',
      'close-up determination face, intense focus expression, sweat detail, athletic close crop on face and neck',
    ],
  },
  {
    id: 'nightout',
    icon: '\uD83C\uDF19',
    label: 'Night Out',
    description: 'Evening glamour, neon and nightlife',
    shots: [
      'soft glow front portrait, warm candlelight or bar lighting, relaxed confident expression, night atmosphere bokeh',
      'full body wide, dressed up, urban night backdrop, city lights blurred behind, elegant nightlife energy',
      'over-shoulder looking back, neon or ambient light rim, party energy, blurred movement in background',
      '3/4 angle close-medium shot, golden bar light, raised glass or drink, social celebratory mood',
      'side profile, dramatic nightclub or rooftop light, architectural silhouette, mysterious and cinematic',
    ],
  },
  {
    id: 'fotodump',
    icon: '\uD83D\uDCF7',
    label: 'Foto Dump',
    description: 'Candid mix, disposable camera feel',
    shots: [
      'ultra candid, slightly tilted frame, subject caught mid-movement, motion blur on edges, film grain texture, disposable camera aesthetic, raw and unfiltered',
      'extreme close-up detail — hands, shoes, jewelry, food, or object — macro, off-center composition, spontaneous and intimate',
      'wide shot, subject very small at edge of frame, environment dominates, documentary snapshot quality, slice-of-life moment',
      'selfie from exaggerated angle — too close, tilted, or from below — unfiltered casual expression, wide grin or deadpan face, authentic',
      'over-shoulder walking-away, subject in motion or looking back, spontaneous escape energy, candid street feel',
      'slightly soft-focus portrait, analog film grain, warm or faded color cast, vintage disposable camera feel, imperfect and nostalgic',
    ],
  },
  {
    id: 'datenight',
    icon: '\uD83C\uDF77',
    label: 'Date Night',
    description: 'Romantic, candlelight, intimate',
    shots: [
      'candlelight portrait, warm amber glow on face, soft shadows, intimate restaurant setting, romantic mood',
      'close-up over wine glass, slight smile, eyes reflecting candlelight, shallow depth of field, elegant',
      'full body walking arm-in-arm on city sidewalk at night, streetlights behind, romantic stroll atmosphere',
      '3/4 angle seated at table, leaning forward slightly, engaged and charming expression, date energy',
      'looking away pensively, side profile, ambient restaurant lighting, contemplative and beautiful, stolen moment',
    ],
  },
  {
    id: 'pool',
    icon: '\uD83C\uDFCA',
    label: 'Pool / Summer',
    description: 'Poolside, splash, golden wet skin',
    shots: [
      'poolside lounging, full body on sunbed, sunglasses, golden sunlight, relaxed summer luxury',
      'emerging from water, wet hair slicked back, water droplets on skin, bright natural light, refreshing splash',
      'sitting on pool edge, feet in water, looking over shoulder at camera, backlit by sun, summer glow',
      'cocktail in hand by the pool, 3/4 angle, sunhat, tropical vibes, vibrant colors, vacation energy',
      'underwater-feel close-up, face and shoulders, wet glistening skin, turquoise water reflections, ethereal summer',
    ],
  },
  {
    id: 'cozyhome',
    icon: '\uD83C\uDFE0',
    label: 'Cozy Home',
    description: 'Morning bed, couch, warm interior',
    shots: [
      'morning in bed, tangled in white sheets, soft window light, just waking up, peaceful and natural',
      'couch with blanket, legs tucked up, holding mug, warm interior tones, reading or watching, comfortable',
      'kitchen cooking, candid side angle, natural movement, warm overhead light, domestic and charming',
      'bathroom mirror, getting ready, half-dressed, authentic morning routine, steam and soft light',
      'reading nook by window, curled up with book, afternoon light, serene and focused, cozy corner',
    ],
  },
];

/**
 * Round-robin mixer: interleaves shots from multiple selected presets
 * so that each vibe gets equal representation.
 *
 * Example: Selfies[S1,S2,S3] + Editorial[E1,E2,E3] with count=4
 * Result:  [S1, E1, S2, E2]
 */
export const mixShots = (
  selectedPresetIds: Set<string>,
  maxCount: number
): string[] => {
  const selected = PHOTO_SESSION_PRESETS.filter(p => selectedPresetIds.has(p.id));
  if (selected.length === 0) return [];

  const result: string[] = [];
  const maxLen = Math.max(...selected.map(p => p.shots.length));

  for (let i = 0; i < maxLen && result.length < maxCount; i++) {
    for (const preset of selected) {
      if (i < preset.shots.length && result.length < maxCount) {
        result.push(preset.shots[i]);
      }
    }
  }

  return result;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | grep "sessionPresets" | head -5`
Expected: No errors related to this file

- [ ] **Step 3: Commit**

```bash
git add data/sessionPresets.ts
git commit -m "feat: add session presets data (14 vibes with custom shots + round-robin mixer)"
```

---

## Chunk 2: Director page

### Task 4: Create the Director page

**Files:**
- Create: `pages/Director.tsx`
- Modify: `components/Sidebar.tsx:12-18`
- Modify: `App.tsx` (add Director route)

This is the largest task. The Director page has a left panel with accordion sections and a center canvas area. It calls `generateInfluencerImage` with the full `InfluencerParams` and saves results to gallery.

- [ ] **Step 1: Create `pages/Director.tsx`**

The page structure follows the existing pattern: `gradient-mesh` → header → content.

**Left panel (360px):** Accordion sections for Identity, Outfit, Pose, Camera, Lighting, Scenario, Enhancers, Engine.

**Center area:** Canvas preview showing generated hero shot, with filmstrip at bottom for multiple results.

Key behaviors:
- Character selection from `useCharacterStore`
- Face reference slots (up to 3 images via file input)
- Outfit reference slot (optional image) — when uploaded, prompt says: `"[OUTFIT REFERENCE] Extract garment only from this image, apply to the character. Ignore the person in this photo."`
- Pose reference slot (optional image) OR chip selection
- Camera/Lighting: single-select chips from `directorOptions.ts` + custom text input
- Enhancers: multi-select chips from `enhancers.ts` + custom text
- Scenario: textarea + inspiration grid from `directorOptions.ts` + optional scene ref image
- Engine selector modal (reuse pattern from PhotoSession)
- Generate button calls `generateInfluencerImage` with assembled `InfluencerParams`
- Results saved to gallery via `useGalleryStore.getState().addItems()`

```typescript
// pages/Director.tsx — Key structure (abbreviated)
import React, { useState, useRef, useEffect } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { generateInfluencerImage } from '../services/geminiService'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { ImageSize, AspectRatio, ENGINE_METADATA, OPERATION_CREDIT_COSTS } from '../types'
import type { InfluencerParams } from '../types'
import { POSE_OPTIONS, CAMERA_OPTIONS, LIGHTING_OPTIONS, INSPIRATIONS } from '../data/directorOptions'
import { ENHANCERS, buildEnhancerPrompt } from '../data/enhancers'

export function Director({ onNav }: { onNav?: (page: string) => void }) {
  // ── Character ──
  const characters = useCharacterStore(s => s.characters)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)

  // ── Reference images ──
  const [faceRefs, setFaceRefs] = useState<File[]>([])        // Up to 3
  const [outfitRef, setOutfitRef] = useState<File | null>(null)
  const [poseRef, setPoseRef] = useState<File | null>(null)
  const [scenarioRef, setScenarioRef] = useState<File | null>(null)

  // ── Chip selections ──
  const [selectedPose, setSelectedPose] = useState<string>('')
  const [selectedCamera, setSelectedCamera] = useState<string>('portrait')
  const [selectedLighting, setSelectedLighting] = useState<string>('natural')
  const [customPose, setCustomPose] = useState('')
  const [customCamera, setCustomCamera] = useState('')
  const [customLighting, setCustomLighting] = useState('')

  // ── Scenario ──
  const [scenario, setScenario] = useState('')
  const [selectedInspiration, setSelectedInspiration] = useState<string | null>(null)

  // ── Enhancers ──
  const [selectedEnhancers, setSelectedEnhancers] = useState<Set<string>>(new Set())
  const [customEnhancer, setCustomEnhancer] = useState('')

  // ── Outfit description ──
  const [outfitDescription, setOutfitDescription] = useState('')

  // ── Engine & generation ──
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedResult, setSelectedResult] = useState(0)
  const [numberOfImages, setNumberOfImages] = useState(1)

  // ── Accordion state (persisted to localStorage) ──
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('vertex-director-sections')
      return s ? JSON.parse(s) : { identity: true, outfit: false, pose: false, camera: false, lighting: false, scenario: true, enhancers: false }
    } catch { return { identity: true, scenario: true } }
  })

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('vertex-director-sections', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const selectedChar = characters.find(c => c.id === selectedCharId)

  // Build InfluencerParams from all controls
  const buildParams = (): InfluencerParams => {
    const poseValue = customPose.trim() || POSE_OPTIONS.find(p => p.id === selectedPose)?.value || ''
    const cameraValue = customCamera.trim() || CAMERA_OPTIONS.find(c => c.id === selectedCamera)?.value || 'shot on 85mm lens, shallow depth of field'
    const lightingValue = customLighting.trim() || LIGHTING_OPTIONS.find(l => l.id === selectedLighting)?.value || 'soft natural light'
    const enhancerPrompt = buildEnhancerPrompt(selectedEnhancers, customEnhancer)

    // Build character params
    const modelImages: File[] = []
    // Add face refs from character store
    if (selectedChar && selectedChar.modelImageBlobs.length > 0) {
      selectedChar.modelImageBlobs.forEach((blob, i) => {
        modelImages.push(new File([blob], `face-ref-${i}.jpg`, { type: 'image/jpeg' }))
      })
    }
    // Add manually uploaded face refs
    faceRefs.forEach(f => modelImages.push(f))

    return {
      characters: [{
        id: selectedChar?.id || 'director-char',
        characteristics: selectedChar?.characteristics || '',
        outfitDescription: outfitRef
          ? '[OUTFIT FROM REFERENCE IMAGE] Extract garment only from the outfit reference, apply to character. Ignore person in outfit photo.'
          : (outfitDescription || selectedChar?.outfitDescription || ''),
        pose: poseValue,
        accessory: selectedChar?.accessory || '',
        modelImages,
        outfitImages: outfitRef ? [outfitRef] : [],
        poseImage: poseRef || undefined,
      }],
      scenario: `${scenario}. ${enhancerPrompt}`.trim(),
      scenarioImage: scenarioRef ? [scenarioRef] : undefined,
      lighting: lightingValue,
      camera: cameraValue,
      imageSize: ImageSize.Size2K,
      aspectRatio: AspectRatio.Portrait,
      numberOfImages,
    }
  }

  // handleGenerate — same pattern as PhotoSession
  // Deduct credits → call generateInfluencerImage → save to gallery
  // Full implementation follows the same credit/toast/gallery pattern
  // as pages/PhotoSession.tsx lines 152-265

  return (
    <div className="h-screen flex gradient-mesh">
      {/* Left Panel — 360px with accordion sections */}
      {/* Center Canvas — hero shot preview + filmstrip */}
      {/* Engine modal — reuse pattern from PhotoSession */}
    </div>
  )
}

export default Director
```

**Accordion section component** (reusable within Director):

```typescript
const AccordionSection: React.FC<{
  title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode
}> = ({ title, isOpen, onToggle, children }) => (
  <div style={{ borderBottom: '1px solid var(--border)' }}>
    <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center justify-between"
      style={{ color: 'var(--text-2)' }}>
      <span className="text-[9px] font-mono uppercase tracking-wider">{title}</span>
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{isOpen ? '\u25B2' : '\u25BC'}</span>
    </button>
    {isOpen && <div className="px-4 pb-3">{children}</div>}
  </div>
)
```

**Chip component** (inline, follows existing patterns):

```typescript
const OptionChip: React.FC<{
  option: ChipOption; selected: boolean; onClick: () => void
}> = ({ option, selected, onClick }) => (
  <button onClick={onClick}
    className="px-2.5 py-1.5 rounded-xl text-[10px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
    style={{
      background: selected ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
      border: `1px solid ${selected ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
      color: selected ? 'var(--accent)' : 'var(--text-2)',
    }}>
    <span>{option.icon}</span>{option.label}
  </button>
)
```

NOTE: The full Director.tsx implementation will be ~400-500 lines. The code above shows the structure, state management, and `buildParams` logic. The JSX follows the exact same patterns used in `pages/PhotoSession.tsx` (accordion sections, chip buttons, file upload slots, engine modal, generate button with credit display, center canvas with filmstrip).

- [ ] **Step 2: Add Director to Sidebar navigation**

In `components/Sidebar.tsx`, add Director as the first item under CREATE:

```typescript
// Current (line 13-18):
{
  title: 'CREATE',
  items: [
    { id: 'upload', label: 'Upload Character', icon: '\u2295', sub: 'Create / Import' },
    { id: 'session', label: 'Photo Session', icon: '\u25CE', sub: 'Photo Shoot' },
    ...
  ]
}

// Modified:
{
  title: 'CREATE',
  items: [
    { id: 'director', label: 'Director', icon: '\u2726', sub: 'Hero Shot' },
    { id: 'upload', label: 'Upload Character', icon: '\u2295', sub: 'Create / Import' },
    { id: 'session', label: 'Photo Session', icon: '\u25CE', sub: 'Photo Shoot' },
    ...
  ]
}
```

- [ ] **Step 3: Add Director route to App.tsx**

Add the page import and route case in the same pattern as other pages. Find where `Page` type is defined (likely in `App.tsx`) and add `'director'` to the union. Add the lazy import and render case.

- [ ] **Step 4: Verify the page renders**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add pages/Director.tsx components/Sidebar.tsx App.tsx
git commit -m "feat: add Director page with enriched controls (pose, camera, lighting, enhancers, outfit ref)"
```

---

## Chunk 3: Photo Session refactor

### Task 5: Refactor Photo Session to use gallery picker + vibe shots

**Files:**
- Modify: `pages/PhotoSession.tsx`

Key changes:
1. **Replace character picker with gallery photo picker** — grid of recent gallery photos as source
2. **Replace vibes array with `PHOTO_SESSION_PRESETS`** — richer shots from `data/sessionPresets.ts`
3. **Use `mixShots()` round-robin** — interleave shots from selected presets
4. **Keep Grok Edit as engine** — already wired from earlier work
5. **Auto-calculate shot count** based on selected vibes (capped at 8)
6. **Update Grok prompt** to use the per-vibe shot description

- [ ] **Step 1: Add imports for session presets**

```typescript
// Replace the inline vibes array with:
import { PHOTO_SESSION_PRESETS, mixShots } from '../data/sessionPresets'
```

- [ ] **Step 2: Replace source selector (character → gallery)**

Replace the `subjectMode` character/photo toggle with a gallery/upload toggle. In gallery mode, show a grid of recent gallery items (from `useGalleryStore`). User clicks to select one as base image.

```typescript
// New state
const [sourceMode, setSourceMode] = useState<'gallery' | 'upload'>('gallery')
const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryItem | null>(null)

// Gallery items for the picker
const galleryItems = useGalleryStore(s => s.items)
const recentPhotos = galleryItems.slice(0, 12)  // Show last 12

// Selected base image (either from gallery or upload)
const baseImageUrl = sourceMode === 'gallery'
  ? selectedGalleryItem?.url
  : uploadedSubject?.preview
```

- [ ] **Step 3: Replace vibes with session presets**

Replace the inline `vibes` array and grid with `PHOTO_SESSION_PRESETS`. Each preset shows icon, label, and description. Multi-select toggleable.

```typescript
const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set())

const togglePreset = (id: string) => {
  setSelectedPresets(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

// Auto-calculate shot count based on selected presets
const mixedShots = mixShots(selectedPresets, shotCount)
```

- [ ] **Step 4: Update handleGenerate to use mixed shots**

Instead of generating N photos with generic angles, pass each specific shot description to Grok:

```typescript
const handleGenerate = async () => {
  // Get base image file
  let baseFile: File
  if (sourceMode === 'gallery' && selectedGalleryItem) {
    const resp = await fetch(selectedGalleryItem.url)
    const blob = await resp.blob()
    baseFile = new File([blob], 'gallery-base.png', { type: blob.type || 'image/png' })
  } else if (uploadedSubject) {
    baseFile = uploadedSubject.file
  } else {
    toast.error('Select a base photo'); return
  }

  const shots = mixShots(selectedPresets, shotCount)
  if (shots.length === 0) { toast.error('Select at least one vibe'); return }

  // Credits
  const totalCost = shots.length * OPERATION_CREDIT_COSTS.photoSession
  const ok = await decrementCredits(totalCost)
  if (!ok) { toast.error('Insufficient credits'); return }

  setGenerating(true)
  setProgress(0)

  try {
    // Use Grok Edit with custom shots (pass shots as angles)
    const results = await generatePhotoSessionWithGrok(
      baseFile,
      shots.length,
      {
        scenario: sceneOverride || undefined,
        angles: shots,  // Each "angle" is actually a full shot description
      },
      (p) => setProgress(p),
      abortRef.current?.signal
    )

    // Save to gallery...
    // (same pattern as before, with model: 'grok-session')
  } catch (err: any) {
    // Error handling with credit restore...
  }
}
```

- [ ] **Step 5: Update the scene section to be "override" (optional)**

The scene section becomes optional — the base photo already has a scene baked in. Label it "Scene Override (optional)" so users know it's additive, not required.

- [ ] **Step 6: Keep character picker as fallback**

Keep the character selection as a third source mode for backwards compatibility. When character mode is selected, behavior is the same as before (use character's face ref to generate with Gemini).

- [ ] **Step 7: Verify build compiles**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add pages/PhotoSession.tsx
git commit -m "feat: refactor Photo Session to gallery-based source + per-vibe custom shots with round-robin mixer"
```

---

## Chunk 4: Integration test

### Task 6: End-to-end verification

- [ ] **Step 1: Verify Director page renders and navigates correctly**

Open the app, click Director in sidebar. Verify:
- Accordion sections expand/collapse
- Character chips load from characterStore
- Chip selections work (pose, camera, lighting)
- Enhancer toggles work
- Engine modal opens
- Generate button shows credit cost

- [ ] **Step 2: Verify Photo Session gallery picker works**

Navigate to Photo Session. Verify:
- Gallery mode shows recent photos
- Clicking a photo selects it as base
- Upload mode still works
- Vibe presets show with descriptions
- Multi-select toggles work
- Shot count auto-adjusts based on selections
- Generate button is disabled until base + vibes selected

- [ ] **Step 3: Verify full flow**

1. In Director: select character, set pose/camera/lighting, add enhancers → Generate
2. Hero shot appears in center canvas and saves to gallery
3. Navigate to Photo Session
4. Select the hero shot from gallery grid
5. Pick vibes (e.g., Selfies + Editorial)
6. Click Shoot → Grok generates variations with custom shots
7. Results appear in filmstrip and save to gallery

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete hero shot + session variations 2-step workflow"
```
