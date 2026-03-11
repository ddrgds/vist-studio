# VIST Studio — Full Figma Redesign Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure VIST Studio from top-nav workspace model to sidebar-nav 5-page app matching Figma designs, with coral accent + professional aesthetic.

**Architecture:** Replace current unified CreatePage + DirectorStudio with 5 dedicated pages (Dashboard, Character Builder, Photo Session, Studio Editor, Gallery). Sidebar navigation replaces top navbar. Studio Editor uses vertical tool bar + contextual right panel pattern. Engine selector filtered by reference image compatibility.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons

---

## New App Structure

```
Sidebar Nav:
  Dashboard       → /              (welcome, stats, recent, quick tools)
  Create Character→ /create        (4-step wizard)
  Photo Session   → /session       (reference photo + style presets)
  Studio Editor   → /studio        (vertical tools + canvas + panels)
  Gallery         → /gallery       (characters + generated images)

Footer in sidebar:
  Plan badge + Upgrade button
  Profile avatar + settings
```

## Engine Reference Image Matrix

### Studio Editor (Generate mode — needs ref image support):
| Engine | Multi-Ref? | Max Refs | Credits |
|--------|-----------|----------|---------|
| Gemini NB2/Pro | Multimodal | ~5 | ⚡2 |
| FLUX Kontext | ✅ | 9 | ⚡10 |
| FLUX Kontext Max | ✅ | 9 | ⚡15 |
| FLUX.2 Pro | ✅ | 9 | ⚡10 |
| FLUX.2 Max | ✅ | 8 | ⚡12 |
| GPT Image 1.5 | Single | 1 | ⚡20 |
| GPT Image 1 | Single | 1 | ⚡15 |
| Ideogram V3 | ✅ | 4 | ⚡15 |

### Studio Editor (Edit mode — needs base image):
| Engine | Accepts Refs? | Credits |
|--------|--------------|---------|
| Gemini NB2/Pro | ✅ multimodal | ⚡2 |
| FLUX.2 Pro Edit | ✅ multi-ref | ⚡10 |
| Seedream 5 Edit | ✅ multi-ref | ⚡8 |
| GPT Image 1.5/1 | Text-only edit | ⚡20/15 |
| Grok Imagine Edit | Text-only edit | ⚡10 |
| ModelsLab | Img2Img | ⚡8 |

### Engine filtering rule for Studio:
- **If engine supports only 1 ref image**: Pose, Objects, Scene upload slots → disabled (blurred). Only Face ref works.
- **If engine supports multi-ref**: All upload slots active.
- **Edit mode**: Show ALL engines that accept a base image for editing.

---

## Phase 1: Sidebar Navigation + Routing (Task 1-2)

### Task 1: Create SidebarNav component

**Files:**
- Create: `components/SidebarNav.tsx`

**Design (from Figma, adapted to coral):**
- Fixed left sidebar, 240px wide, bg `#0D0A0A`, border-right `#1A1210`
- Top: Logo "VIST Studio" with lightning bolt icon (coral)
- Nav items: icon + label, vertical stack
  - Dashboard (LayoutDashboard icon)
  - Create Character (Sparkles icon)
  - Photo Session (Camera icon)
  - Studio Editor (PenTool icon)
  - Gallery (Images icon)
- Active state: coral left border + coral bg tint `rgba(255,92,53,0.1)` + white text
- Inactive: `#6B5A56` text, hover `#B8A9A5`
- Bottom section:
  - Plan badge: "PRO Plan" coral text + "3 generations left" + "Upgrade" coral button
  - Profile: avatar circle + name + "Pro Member" subtitle + settings gear + bell icon
- Collapse to icon-only on screens < 1200px (optional future)

**Props:**
```typescript
interface SidebarNavProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  credits: number;
  planName: string;
  userName: string;
}
type AppPage = 'dashboard' | 'create' | 'session' | 'studio' | 'gallery' | 'pricing' | 'profile';
```

### Task 2: Update App.tsx routing

**Files:**
- Modify: `App.tsx`

**Changes:**
1. Replace `AppWorkspace` type with `AppPage` type
2. Replace top navbar JSX with `<SidebarNav />` in a flex layout:
   ```
   <div className="flex h-screen">
     <SidebarNav ... />
     <main className="flex-1 overflow-auto">
       {renderPage()}
     </main>
   </div>
   ```
3. Update URL mapping:
   - `/` → dashboard
   - `/create` → create
   - `/session` → session
   - `/studio`, `/director`, `/generate` → studio
   - `/gallery`, `/characters`, `/library` → gallery
   - `/pricing` → pricing
   - `/profile` → profile
4. Update `pushState` calls
5. Remove old mobile bottom nav
6. Keep all modal state + handlers (they don't change)
7. Lazy-load new page components

---

## Phase 2: Dashboard Page (Task 3)

### Task 3: Create DashboardPage component

**Files:**
- Create: `components/DashboardPage.tsx`

**Design (from Figma screenshot 1-2, adapted):**

**Section 1: Hero**
- Badge: "✦ AI-Powered Studio" (coral pill)
- Title: "Welcome to the Studio" (Space Grotesk, 2xl, white)
- Subtitle: "Create, edit and manage your virtual influencers..." (muted text)
- Two CTA buttons (coral gradient):
  - "New AI Character" → navigate to /create (Sparkles icon)
  - "Open Studio" → navigate to /studio (Play icon)

**Section 2: Stats cards (4 across)**
- Characters Created (Users icon, coral bg circle)
- Renders Generated (Zap icon, amber bg circle)
- Avg Engagement (TrendingUp icon, cyan bg circle)
- Active Projects (Star icon, orange bg circle)
- Each card: dark surface `#0F0C0C`, border `#1A1210`, number large, label small

**Section 3: Recent Projects**
- Header: "Recent Projects" + "View all →" link
- 3 character cards: thumbnail + name + niche + "Active"/"Editing" badge + "Edit →" button
- Stats under each: followers, engagement %

**Section 4: Studio Tools (quick launch)**
- Header: "Studio Tools"
- 6 tool cards in a row: Pose Editor, Face Swap, Relight, Camera, Objects, Scenes
- Each: icon + label, dark card, hover coral border

**Data sources:**
- Character count: `useCharacterLibrary().characters.length`
- Render count: `useGallery().generatedHistory.length`
- Recent projects: `useCharacterLibrary().characters.slice(0, 3)`

---

## Phase 3: Character Builder (Task 4-5)

### Task 4: Create CharacterBuilderPage component — Wizard structure

**Files:**
- Create: `components/CharacterBuilderPage.tsx`

**Design (from Figma screenshots 3-8):**

**Layout:** Two-column. Left: wizard steps (scrollable). Right: live preview panel.

**Step progress bar (top of left column):**
- Breadcrumb: ✓ Style → ✓ Appearance → Personality → Niche
- Active step: coral pill with icon. Completed: green checkmark. Upcoming: muted

**Step 1: Style**
- "Name your character" text field (placeholder: "E.g. Luna, Nova, Kai...")
- "Visual Style" — 6 cards in 2x3 grid:
  - Realistic (⭐ icon, "Ultra realistic, almost human")
  - Anime ("Japanese anime/manga style")
  - 3D CGI ("High quality 3D rendering")
  - Cartoon ("Stylized illustration")
  - Cyberpunk ("Futuristic neon aesthetic")
  - Fantasy ("Magical and fantastical")
- Selected card: coral border + coral bg tint
- Button: "Next >" (coral gradient, full width)

**Step 2: Appearance**
- Age slider (18-40, default 24)
- Ethnicity chips: Latina, Asian, European, African, Arab, Mixed
- Hair color chips: Black, Brown, Blonde, Red, Pink, Blue, White, Gradient
- Eye color chips: Brown, Green, Blue, Gray, Hazel, Violet
- Body type chips: Slim, Athletic, Curvy, Natural, Muscular
- Selected chip: coral bg + white text. Unselected: dark bg `#1A1210` border
- Buttons: "Next >" + "< Previous"

**Step 3: Personality**
- Personality chips: Sophisticated, Youthful, Mysterious, Cheerful, Rebellious, Elegant
- "Additional description" textarea (placeholder: "Describe specific traits...")
- Buttons: "Next >" + "< Previous"

**Step 4: Niche**
- Content niche list (full-width items, selectable):
  - Moda & Lifestyle, Fitness & Health, Tech & Gaming, Beauty & Makeup, Travel & Luxe, Music & Art
- Selected: coral left border + coral bg tint + checkmark
- Button: "✦ Generate with AI" (coral gradient) + "< Previous"

**Right panel (live preview):**
- Header: "My Influencer — Preview" + "↻ Regenerate" button
- Large circle placeholder (dashed border) when no image
- Text: "Configure your character" / "Complete the steps and press Generate"
- 3 small example thumbnails below
- After generation: shows generated character image

**State management:**
```typescript
interface CharacterBuilderState {
  step: 1 | 2 | 3 | 4;
  name: string;
  style: 'realistic' | 'anime' | '3dcgi' | 'cartoon' | 'cyberpunk' | 'fantasy';
  age: number;
  ethnicity: string;
  hairColor: string;
  eyeColor: string;
  bodyType: string;
  personality: string[];
  description: string;
  niche: string;
  previewUrl: string | null;
}
```

**On "Generate":**
- Compose characteristics string from all selections
- Call generation with `form.setCharacteristics(composed)` + appropriate prompt
- Use Gemini Flash for fast preview (⚡2 credits)
- Result appears in preview panel

### Task 5: Wire CharacterBuilderPage to App.tsx

**Files:**
- Modify: `App.tsx`

**Changes:**
- Add lazy import for CharacterBuilderPage
- Pass `onGenerate`, `onNavigateToStudio` props
- After character generation, offer "Open in Studio Editor" CTA
- Save generated character to CharacterLibrary automatically

---

## Phase 4: Photo Session Page (Task 6)

### Task 6: Create PhotoSessionPage component

**Files:**
- Create: `components/PhotoSessionPage.tsx`

**Design:**
A dedicated page for the session workflow (previously a sub-mode of Director).

**Layout:** Two-column. Left: controls. Right: results grid.

**Left panel:**
- "Photo Session" header
- Reference image upload (drag + drop, or select from Gallery)
- Style presets grid (from existing PHOTO_SESSION_PRESETS):
  - Selfies, GRWM, Stories, Editorial, Portrait, Street Style, Creator, Lifestyle, Fitness, Night Out, Photo Dump
  - Each preset: icon + name + tooltip description
  - Selected: coral border
- Photos to generate: stepper (1-8)
- Engine selector (only engines supporting edit mode with reference):
  - NB2 (⚡2), Grok (⚡10)
- "Shoot Session →" CTA button (coral gradient)

**Right panel:**
- Results grid (generated photos)
- Each photo: hover actions (Download, Reuse, Upscale)
- Empty state: "Upload a reference photo and choose a style to start"

**Reuse from DirectorStudio:** PHOTO_SESSION_PRESETS, PRESET_TOOLTIPS arrays.

---

## Phase 5: Studio Editor (Task 7-11) — The Big One

### Task 7: Create StudioEditorPage — Layout shell

**Files:**
- Create: `components/StudioEditorPage.tsx`

**Layout (from Figma screenshots 9-15):**
```
┌──────────────────────────────────────────────────────────┐
│ Top Bar: [avatar] Character Name ▾ | ←→↺ | 🔍 100% | SD [HD] 4K | Preview | Share | Export │
├────┬─────────────────────────────────┬───────────────────┤
│Tool│                                 │  Context Panel    │
│Bar │       Canvas (center)           │  (right, ~300px)  │
│60px│       Character image           │  Changes per tool │
│    │                                 │                   │
├────┴─────────────────────────────────┴───────────────────┤
│ Engine Selector Bar (bottom)                              │
└──────────────────────────────────────────────────────────┘
```

**Top bar:**
- Character avatar + name dropdown (switch between saved characters)
- Undo/Redo/Reset buttons
- Zoom controls (🔍- 100% +)
- Resolution toggle: SD / HD / 4K (current: HD highlighted)
- Preview / Share / Export buttons (coral "Export" CTA)

**Vertical tool bar (left, 60px):**
- 6 tool icons stacked vertically:
  1. Pose (Body icon) — predefined poses + manual angle sliders
  2. Face Swap (Users icon) — reference upload + face library + blend slider
  3. Relight (Sun icon) — light direction pad + ambient presets + sliders
  4. Camera (Camera icon) — lens presets + angle chips + FOV/DOF sliders
  5. Objects (Box icon) — search + categories + object grid
  6. Scenes (Mountain icon) — library/generate/upload tabs + scene thumbnails
- Active tool: coral bg circle + coral text
- Inactive: muted icon + label below

**Canvas (center):**
- Large character image with dark bg (`#0D0A0A`)
- Rounded corners on image container
- Status bar at bottom: avatar + character name + style + "● Ready" badge

**Engine selector bar (bottom, full width):**
- Horizontal row of engine chips
- Only shows engines compatible with current mode + reference images
- Each chip: engine name + ⚡credit cost
- Active chip: coral border
- When engine changes, tool upload fields update (blur if incompatible)

### Task 8: Studio Editor — Right panel for Pose tool

**Files:**
- Modify: `components/StudioEditorPage.tsx`

**Pose panel (right side):**

**Tab bar:** Library | Prompt | Upload

**Library tab:**
- "PREDEFINED POSES" header
- 6 pose cards in 2x3 grid: Standing, Sitting, Walking, Posing, Running, Leaning
- Each: icon + label, selected has coral border
- "MANUAL ADJUSTMENT" section:
  - Sliders: Head (0°), Shoulders (0°), Arms (45°), Hips (10°), Legs (0°)
  - Each slider: label + value + range input (coral track)

**Prompt tab:**
- Textarea: "Describe the pose you want..."
- Example prompts as suggestion chips

**Upload tab:**
- Drag-drop zone for pose reference image
- Thumbnail preview when uploaded

**Apply button:** "Apply Pose" (coral gradient)

### Task 9: Studio Editor — Right panels for Face Swap, Relight, Camera

**Files:**
- Modify: `components/StudioEditorPage.tsx`

**Face Swap panel:**
- Tab bar: Library | Prompt | Upload
- Library: "FACE LIBRARY" grid with saved character faces (Sofia, Luna, Nova, Kai...)
- Upload: "UPLOAD REFERENCE" drag-drop zone (JPG, PNG, max 10MB)
- "Blend intensity" slider (0-100%, default 85%)
- "Preserve expression" toggle
- "Adjust lighting" toggle
- Button: "Apply Face Swap" (coral)

**Relight panel:**
- Tab bar: Presets | Prompt | Upload
- Presets: Light direction XY pad (draggable circle showing position)
  - "AMBIENTS" grid: Golden Hour, Studio, Neon, Sunset, Moon, Cinematic (colored circles)
- Sliders: Intensity (75%), Temperature (5500K), Shadows (40%), Ambient light (20%)
- Button: "Apply Relight" (coral)

**Camera panel:**
- Tab bar: Lenses | Prompt | Upload
- Lenses: 6 preset cards (2x3):
  - Portrait 85mm f/1.8, Wide angle 24mm f/2.8, Close-up 50mm f/1.4
  - Cinematic 35mm f/2.0, Fisheye 12mm f/5.6, Tele 200mm f/4.0
- "ANGLE" chips: Eye level, Low, High, Bird's eye, Worm's eye
- Sliders: FOV (50°), Depth of field (3.5f), Bokeh intensity (60%), Tilt (0°), Roll (0°)
- Guide grid toggle: Off / 3x3 / 2x2
- Button: "Apply Camera" (coral)

### Task 10: Studio Editor — Right panels for Objects, Scenes

**Files:**
- Modify: `components/StudioEditorPage.tsx`

**Objects panel:**
- Tab bar: Library | Prompt | Upload
- Library: Search bar + category filters (All, Accessories, Clothing, Electronics)
  - Object grid: "OBJECTS (12)" — cards with icon + name
  - Examples: Chanel Bag, Sunglasses, Hat, Necklace, Gucci Dress, Louboutin Shoes
- Prompt: Textarea "Describe the object..."
- Upload: Drag-drop for object reference image
- Button: "Add N objects" (coral/green)

**Scenes panel:**
- Tab bar: Library | Generate AI | Upload
- Library: Search + category filters (All, Urban, Nature, Studio)
  - Scene thumbnail grid: Ciudad Neon (Urban), Tropical Beach (Nature), White Studio, Night Skyline, Lux Apartment, Dark Abstract
  - Each: thumbnail with overlaid name + category tag
- Generate AI: Textarea to describe scene + generate button
- Upload: Drag-drop for custom scene image
- "Character integration" slider (0-100%, default 80%)
- Button: "Apply Scene" (coral)

### Task 11: Studio Editor — Engine selector bar + compatibility logic

**Files:**
- Modify: `components/StudioEditorPage.tsx`
- Modify: `types.ts` (add engine capability flags)

**Engine bar (bottom of studio):**
- Horizontal scrollable row
- Each engine chip: icon + name + ⚡cost
- Active: coral border + coral text
- "✦ AI" badge on each tool panel header (indicating AI-powered)

**Compatibility logic:**
```typescript
interface EngineCapability {
  supportsRefGen: boolean;      // Can generate with reference images
  maxRefGen: number;            // Max refs for generation (0=none)
  supportsEdit: boolean;        // Can edit with base image
  supportsMultiSlot: boolean;   // Can handle pose+object+scene simultaneously
}

// When engine changes:
// - If maxRefGen === 1: disable Pose upload, Objects upload, Scene upload (blur them)
//   Only face reference works
// - If maxRefGen >= 3: all upload slots active
// - For edit tools (Face Swap, Relight): always available if engine supportsEdit
```

**Add to types.ts ENGINE_METADATA:**
```typescript
supportsRefGen: boolean;
maxRefsGen: number;
supportsEdit: boolean;
```

---

## Phase 6: Gallery Page (Task 12)

### Task 12: Create GalleryPage component

**Files:**
- Create: `components/GalleryPage.tsx`

**Design (from Figma screenshots 16-17):**

**Header:**
- "Character Gallery" title + "6 characters · 2 favorites" subtitle
- "+ New Character" button (coral, top-right)

**Search + filters:**
- Search bar: "Search characters..."
- Filter tabs: All, Active, Editing, Draft (coral active tab)
- Sort dropdown: "Most recent" ▾

**Featured character card (optional, if one is "featured"):**
- Large horizontal card: thumbnail left + name + niche + stats (followers, engagement, views)
- Badges: "⭐ Featured" (coral) + "Active" (green)

**Character grid:**
- Cards: large thumbnail + overlay (name, niche at top)
- Bottom: followers stat + engagement % + heart count
- Tags: "Fashion", "Luxury", etc.
- Hover: heart icon + "..." menu
- "New character" empty card: dashed border + "+" + "Generate with AI"

**Data source:** `useCharacterLibrary().characters` + `useGallery().generatedHistory`

---

## Phase 7: Integration + Cleanup (Task 13-14)

### Task 13: Wire all pages in App.tsx

**Files:**
- Modify: `App.tsx`

**Changes:**
1. Add lazy imports for all new pages
2. Update renderPage() switch to render correct page per AppPage
3. Pass all callback handlers (onGenerate, onDownload, onReuse, etc.)
4. Keep all modal wiring (TryOnModal, FaceSwapModal, etc.)
5. Remove old components from rendering (CreatePage, DirectorStudio, ExplorePage)
6. Update mobile layout (sidebar collapses to bottom nav on mobile)

### Task 14: Remove deprecated components + cleanup

**Files:**
- Archive/remove: `components/CreatePage.tsx` (replaced by CharacterBuilder + StudioEditor)
- Archive/remove: `components/DirectorStudio.tsx` (replaced by StudioEditor)
- Archive/remove: `components/ExplorePage.tsx` (replaced by Dashboard)
- Keep: All services, contexts, hooks, modals, types

---

## Implementation Priority

1. **Task 1-2:** Sidebar nav + routing (foundation — everything else depends on this)
2. **Task 7:** Studio Editor shell (the core workspace)
3. **Task 8-10:** Studio Editor tool panels (the main value)
4. **Task 11:** Engine selector + compatibility (critical UX)
5. **Task 3:** Dashboard (landing page)
6. **Task 4-5:** Character Builder (wizard)
7. **Task 6:** Photo Session
8. **Task 12:** Gallery
9. **Task 13-14:** Integration + cleanup

---

## Non-goals (not in this sprint)

- Mobile-optimized sidebar (icon-only collapse)
- Real-time character preview generation in builder
- Undo/redo history in Studio Editor
- Video generation tools in Studio Editor
- Community features in Gallery
- i18n / localization beyond English
