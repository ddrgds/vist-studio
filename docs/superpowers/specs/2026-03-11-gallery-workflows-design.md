# Gallery Enhancements & Cross-Page Workflows — Design Spec

## Overview
Add cross-page navigation with data, gallery lightbox with client-side filters, functional download/delete, and expanded Photo Session scenario modes (presets, prompt, reference image).

## Files affected
- New: `stores/navigationStore.ts`
- Modified: `App.tsx`, `pages/Gallery.tsx`, `stores/galleryStore.ts`, `pages/PhotoSession.tsx`, `pages/AIEditor.tsx`, `pages/UploadCharacter.tsx`

Note: All file paths are relative to project root. The `src/` prefix in CLAUDE.md is stale — actual files live at `pages/`, `stores/`, etc.

---

## 1. Navigation Store

### Purpose
A Zustand store that acts as a bridge for passing data between pages during navigation.

### Interface
```typescript
import { Page } from '../App'  // Import the Page union type

interface NavigationStore {
  pendingImage: string | null
  pendingFile: File | null
  pendingSource: 'gallery' | 'character' | null
  pendingTarget: Page | null

  // Each method sets pending state. Caller must also call onNav() to switch page.
  navigateToEditor: (image: string, file?: File) => void
  navigateToSession: (image: string) => void
  navigateToUpload: (image: string) => void
  consume: () => void  // Target page calls after reading pending data
}
```

### Flow
1. Source page calls `navigateToEditor(url)` → sets pending state
2. Source page calls `onNav('editor')` → switches page (two-step pattern at every call site)
3. Target page mounts → reads `pendingImage` → loads it → calls `consume()`
4. Store resets to null
5. Safety: auto-`consume()` after 10 seconds if target page never reads

### App.tsx change
Pass `onNav` callback to ALL pages, not just Dashboard. The `onNav` prop type must match `App.tsx`'s `Page` union type:
```typescript
// Each page's props:
interface PageProps {
  onNav?: (page: Page) => void
}

const pages: Record<Page, JSX.Element> = {
  dashboard: <Dashboard onNav={handleNav} />,
  upload: <UploadCharacter onNav={handleNav} />,
  session: <PhotoSession onNav={handleNav} />,
  editor: <AIEditor onNav={handleNav} />,
  gallery: <Gallery onNav={handleNav} />,
  // ... all other pages
}
```

---

## 2. Gallery — Hover Actions

### Quick icons on hover
3 icons appear at bottom-right of each image card on hover:

| Icon | Color | Action |
|------|-------|--------|
| ✦ | `var(--accent)` | `navigateToEditor(url)` + `onNav('editor')` — editor's consume logic handles URL→File conversion |
| ↓ | `var(--text-2)` | Download image |
| ✕ | `#e05050` | Delete with undo toast |

### Download implementation
Fetch as blob first to handle both data URLs and remote CDN URLs:
```typescript
const handleDownload = async (url: string, filename: string) => {
  const res = await fetch(url)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
```

### Delete implementation
- Save item reference in temp variable
- Call `galleryStore.removeItem(id)`
- Show toast: "Image deleted" with "Undo" button
- Undo restores item via `galleryStore.addItems([savedItem])` (triggers re-persist to IndexedDB/Supabase)
- Toast auto-dismisses after 5 seconds

---

## 3. Gallery — Lightbox

### Trigger
Click on image → opens fullscreen modal with `lightboxIndex` state.

### Layout
Flexbox row: image area takes remaining space, sidebar is fixed 280px:
```
┌────────────────────────────────────────────────────┬──────────┐
│                                                    │ Actions  │
│              Image (flex-1, centered)               │──────────│
│           object-contain, max-h-[90vh]             │ Filters  │
│                                                    │ Sliders  │
│                                                    │ Save/Rst │
└────────────────────────────────────────────────────┴──────────┘
```
- **Backdrop**: `position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 50`
- **Content**: `display: flex; max-w-[95vw]; max-h-[90vh]; margin: auto`
- **Image area**: `flex: 1; min-w-0` with `<img>` using `object-contain w-full h-full`
- **Sidebar**: `w-[280px] shrink-0` with two zones
  - **Navigation actions** (top): Edit in AI Editor, New session, Create character
  - **Filters panel** (bottom, scrollable): presets + sliders
- **Close button (X)**: top-right corner of backdrop
- **Arrow navigation**: ← → to browse images. Escape closes. Arrows wrap around (last → first).

### State
```typescript
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
const [filterValues, setFilterValues] = useState({ brightness: 0, contrast: 0, saturation: 0, temperature: 0 })
const [activePreset, setActivePreset] = useState<string | null>(null)
```

---

## 4. Gallery — Client-Side Filters

### Presets (6)
| Name | CSS filter values |
|------|-------------------|
| Warm | brightness(1.05) saturate(1.2) sepia(0.15) |
| B&W | grayscale(1) contrast(1.1) |
| Vintage | sepia(0.3) contrast(0.9) brightness(1.05) saturate(0.8) |
| Cool | brightness(1.05) saturate(0.9) hue-rotate(15deg) |
| Dramatic | contrast(1.3) brightness(0.95) saturate(1.1) |
| Fade | contrast(0.9) brightness(1.1) saturate(0.8) opacity(0.95) |

### Sliders (4)
| Slider | Range | CSS mapping |
|--------|-------|-------------|
| Brightness | -100 to +100 | `brightness(0.5)` to `brightness(1.5)`, default `brightness(1)` |
| Contrast | -100 to +100 | `contrast(0.5)` to `contrast(1.5)`, default `contrast(1)` |
| Saturation | -100 to +100 | `saturate(0)` to `saturate(2)`, default `saturate(1)` |
| Temperature | -100 to +100 | Warm (+): `sepia(val*0.004) hue-rotate(val*0.2deg)`. Cool (-): `hue-rotate(val*0.2deg)` no sepia. |

Sharpness dropped — not achievable via CSS filters alone, and 4 sliders is cleaner.

### Apply to image
CSS `filter` property on the `<img>` element inside lightbox. Real-time preview as sliders move.

### Save
To handle cross-origin images (fal.ai, replicate CDNs etc.):
1. Fetch image as blob via `fetch(url)` → `URL.createObjectURL(blob)`
2. Create `new Image()` with the blob URL (avoids CORS canvas tainting)
3. Draw to `<canvas>` with `ctx.filter = computedFilterString`
4. Export via `canvas.toDataURL('image/jpeg', 0.92)` (JPEG to keep size reasonable)
5. Persist: call `galleryStore.updateItem(id, { url: newDataUrl })` which follows the existing `toggleFavorite` persistence pattern (update in-memory → persist to IndexedDB → persist to Supabase)

### Reset
All sliders to 0, activePreset to null.

### No credits — 100% client-side CSS/Canvas.

---

## 5. Photo Session — Expanded Scenarios

### Tab structure
The existing `sceneMode` state (`'preset' | 'upload' | 'prompt'`) is renamed/expanded to 3 tabs inside the SCENARIO section:

| Tab label | State value | Status |
|-----------|-------------|--------|
| Presets | `'preset'` | Existing — no changes |
| Prompt | `'prompt'` | New |
| Reference | `'reference'` | Replaces existing `'upload'` mode, enhanced |

**Tab "Presets"** — existing grid of scenario cards (Beach, City, Studio, etc.). No changes.

**Tab "Prompt"** — new:
- `<textarea>` for free-form scenario description
- Quick chips: "Café in Paris", "Neon city at night", "Enchanted forest", "Rooftop sunset", "Underwater", "Space station"
- Text injected as scenario in generation prompt

**Tab "Reference"** — replaces old upload mode, enhanced with 3 sources:
- Drop zone for uploading a new scenario image
- "From gallery" section: last 8 images from galleryStore as clickable thumbnails
- "From character" section: character thumbnails from characterStore (only shown for characters where `thumbnail` is non-empty; characters without thumbnails are skipped)
- Selected image sent as visual reference in generation prompt

### State
```typescript
const [scenarioMode, setScenarioMode] = useState<'preset' | 'prompt' | 'reference'>('preset')
const [scenarioPrompt, setScenarioPrompt] = useState('')
const [scenarioRefImage, setScenarioRefImage] = useState<string | null>(null)
const [scenarioRefFile, setScenarioRefFile] = useState<File | null>(null)
```

### Prompt engineering
- **Preset**: existing behavior, scenario text from preset data
- **Prompt**: user text injected directly as scenario description
- **Reference**: image attached to API call + prompt: `"Place the character in the exact same location/setting shown in the reference image. Match the lighting, colors and atmosphere."`

### Consuming navigation
On mount, check `navigationStore`:
- If `pendingTarget === 'session'` → set `scenarioMode` to `'reference'`, load `pendingImage` into `scenarioRefImage`, convert to File for `scenarioRefFile`, call `consume()`

---

## 6. Consuming Navigation in Other Pages

### AI Editor
On mount via `useEffect`: if `pendingTarget === 'editor'` → set `inputImage` from `pendingImage` + convert URL to File via fetch→blob→File for `inputFile` (same `urlToFile` helper already exists in AIEditor.tsx) → `consume()`

### Upload Character
On mount via `useEffect`: if `pendingTarget === 'upload'` → switch to import mode, convert `pendingImage` to File and preload into `importFiles` → `consume()`

---

## 7. galleryStore Update

Add `updateItem` method following the existing persistence pattern (same as `toggleFavorite`):
```typescript
updateItem: (id: string, updates: Partial<GalleryItem>) => {
  // 1. Update in-memory state
  set(state => ({
    items: state.items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  }))
  // 2. Persist to IndexedDB via updateHistoryItem
  // 3. Persist to Supabase via updateGalleryItem (if user is authenticated)
}
```

Note: When saving filtered images, the `url` field changes from a CDN URL to a data URL (JPEG, ~100-500KB). This is acceptable for IndexedDB. For Supabase, if the URL was originally a remote CDN link, the filtered version should be uploaded to Supabase Storage and the URL updated to the new storage path.

---

## Non-goals
- No canvas-based manual compositing (drag & drop positioning)
- No AI-powered filters (all client-side CSS/Canvas)
- No new dependencies or libraries
- No changes to index.css design system
- No backend/API changes (except galleryStore persistence for filtered images)
