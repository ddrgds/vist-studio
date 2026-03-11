# Gallery Enhancements & Cross-Page Workflows — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cross-page navigation, gallery lightbox with client-side filters, download/delete, and expanded Photo Session scenarios.

**Architecture:** A new `navigationStore` bridges pages with pending data. Gallery gets lightbox + filters + action buttons. Photo Session's scenario section gains Prompt and Reference tabs. All client-side, no new dependencies.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, CSS Filters, Canvas API

**Spec:** `docs/superpowers/specs/2026-03-11-gallery-workflows-design.md`

---

## Chunk 1: Navigation Store + App.tsx Wiring

### Task 1: Create navigationStore

**Files:**
- Create: `stores/navigationStore.ts`

- [ ] **Step 1: Create the store file**

```typescript
import { create } from 'zustand'
import type { Page } from '../App'

interface NavigationState {
  pendingImage: string | null
  pendingFile: File | null
  pendingSource: 'gallery' | 'character' | null
  pendingTarget: Page | null
  _timeoutId: ReturnType<typeof setTimeout> | null

  navigateToEditor: (image: string, file?: File) => void
  navigateToSession: (image: string) => void
  navigateToUpload: (image: string) => void
  consume: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  pendingImage: null,
  pendingFile: null,
  pendingSource: null,
  pendingTarget: null,
  _timeoutId: null,

  navigateToEditor: (image, file) => {
    const prev = get()._timeoutId
    if (prev) clearTimeout(prev)
    const tid = setTimeout(() => get().consume(), 10000)
    set({ pendingImage: image, pendingFile: file ?? null, pendingSource: 'gallery', pendingTarget: 'editor', _timeoutId: tid })
  },

  navigateToSession: (image) => {
    const prev = get()._timeoutId
    if (prev) clearTimeout(prev)
    const tid = setTimeout(() => get().consume(), 10000)
    set({ pendingImage: image, pendingFile: null, pendingSource: 'gallery', pendingTarget: 'session', _timeoutId: tid })
  },

  navigateToUpload: (image) => {
    const prev = get()._timeoutId
    if (prev) clearTimeout(prev)
    const tid = setTimeout(() => get().consume(), 10000)
    set({ pendingImage: image, pendingFile: null, pendingSource: 'gallery', pendingTarget: 'upload', _timeoutId: tid })
  },

  consume: () => {
    const tid = get()._timeoutId
    if (tid) clearTimeout(tid)
    set({ pendingImage: null, pendingFile: null, pendingSource: null, pendingTarget: null, _timeoutId: null })
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add stores/navigationStore.ts
git commit -m "feat: add navigation store for cross-page data passing"
```

---

### Task 2: Wire onNav to all pages in App.tsx

**Files:**
- Modify: `App.tsx:127-139` (pages record)

- [ ] **Step 1: Update the pages record to pass onNav to all pages**

In `App.tsx`, change lines 127–139 from:
```typescript
const pages: Record<Page, JSX.Element> = {
  dashboard: <Dashboard onNav={handleNav} />,
  upload: <UploadCharacter />,
  session: <PhotoSession />,
  editor: <AIEditor />,
  gallery: <Gallery />,
  characters: <CharacterGallery />,
  universe: <UniverseBuilder />,
  content: <ContentCalendar />,
  analytics: <Analytics />,
  pricing: <PricingPage />,
  profile: <ProfilePage />,
};
```

To:
```typescript
const pages: Record<Page, JSX.Element> = {
  dashboard: <Dashboard onNav={handleNav} />,
  upload: <UploadCharacter onNav={handleNav} />,
  session: <PhotoSession onNav={handleNav} />,
  editor: <AIEditor onNav={handleNav} />,
  gallery: <Gallery onNav={handleNav} />,
  characters: <CharacterGallery />,
  universe: <UniverseBuilder />,
  content: <ContentCalendar />,
  analytics: <Analytics />,
  pricing: <PricingPage />,
  profile: <ProfilePage />,
};
```

Only the 5 pages involved in navigation flows get `onNav`. Others stay unchanged.

- [ ] **Step 2: Add onNav prop to each affected page component**

Each of these pages needs to accept `onNav` in its props. Add near the top of each component:

**`pages/Gallery.tsx`** — change function signature:
```typescript
export function Gallery({ onNav }: { onNav?: (page: Page) => void }) {
```
Add import: `import type { Page } from '../App'`

**`pages/AIEditor.tsx`** — change function signature:
```typescript
export function AIEditor({ onNav }: { onNav?: (page: Page) => void }) {
```
Add import: `import type { Page } from '../App'`

**`pages/PhotoSession.tsx`** — change function signature:
```typescript
export function PhotoSession({ onNav }: { onNav?: (page: Page) => void }) {
```
Add import: `import type { Page } from '../App'`

**`pages/UploadCharacter.tsx`** — change function signature:
```typescript
export function UploadCharacter({ onNav }: { onNav?: (page: Page) => void }) {
```
Add import: `import type { Page } from '../App'`

- [ ] **Step 3: Verify dev server compiles without errors**

Run: `pnpm dev` — check terminal for TypeScript errors. All pages should still render.

- [ ] **Step 4: Commit**

```bash
git add App.tsx pages/Gallery.tsx pages/AIEditor.tsx pages/PhotoSession.tsx pages/UploadCharacter.tsx
git commit -m "feat: wire onNav prop to Gallery, AIEditor, PhotoSession, UploadCharacter"
```

---

## Chunk 2: Gallery — Download, Delete, Hover Actions

### Task 3: Fix download button + add delete button

**Files:**
- Modify: `pages/Gallery.tsx:169-189` (hover action buttons)

- [ ] **Step 1: Add download handler function**

Inside `Gallery` component, add before the return:
```typescript
const handleDownload = async (e: React.MouseEvent, url: string, id: string) => {
  e.stopPropagation()
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vertex-${id.slice(0,8)}.png`
    a.click()
    URL.revokeObjectURL(a.href)
    addToast('Image downloaded', 'success')
  } catch {
    addToast('Download failed', 'error')
  }
}
```

Note: `addToast` comes from existing `useToast()` import (check Gallery.tsx imports — if not imported, add `const { addToast } = useToast()` and import `useToast` from `'../contexts/ToastContext'`).

- [ ] **Step 2: Add delete handler function**

```typescript
const handleDelete = (e: React.MouseEvent, item: GalleryItem) => {
  e.stopPropagation()
  removeItem(item.id)
  addToast('Image deleted', 'info', {
    action: { label: 'Undo', onClick: () => addItems([item]) }
  })
}
```

Note: Check if the toast system supports an `action` prop. If not, use a simpler approach:
```typescript
const handleDelete = (e: React.MouseEvent, item: GalleryItem) => {
  e.stopPropagation()
  removeItem(item.id)
  addToast('Image deleted', 'info')
}
```

- [ ] **Step 3: Update the hover overlay buttons**

Find the existing hover overlay section (around lines 169–189). Replace the non-functional download button and add delete + editor buttons. The new hover overlay should have 3 icons:

```tsx
{/* Hover action icons — bottom-right */}
<div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
    onClick={(e) => {
      e.stopPropagation()
      navigateToEditor(img.url)
      onNav?.('editor')
    }}
    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all hover:scale-110"
    style={{ background: 'rgba(240,104,72,.25)', color: 'var(--accent)' }}
    title="Edit in AI Editor">✦</button>
  <button
    onClick={(e) => handleDownload(e, img.url, img.id)}
    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all hover:scale-110"
    style={{ background: 'rgba(255,255,255,.15)', color: 'var(--text-2)' }}
    title="Download">↓</button>
  <button
    onClick={(e) => handleDelete(e, img)}
    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all hover:scale-110"
    style={{ background: 'rgba(255,60,60,.15)', color: '#e05050' }}
    title="Delete">✕</button>
</div>
```

Make sure the image card wrapper has `group` class for the `group-hover` to work. Add `className="group relative ..."` to the card container if not already present.

Also add the import at top:
```typescript
import { useNavigationStore } from '../stores/navigationStore'
```
And inside the component:
```typescript
const { navigateToEditor, navigateToSession, navigateToUpload } = useNavigationStore()
```

- [ ] **Step 4: Remove the old non-functional download button if it exists separately**

The old download button (line ~178) should be replaced by the new one in the hover overlay. If the favorite button (★/☆) is still wanted, keep it in the overlay too — add it between download and delete.

- [ ] **Step 5: Verify visually**

Open Gallery in browser. Hover over an image:
- ✦ button should appear (accent color)
- ↓ button should appear (gray)
- ✕ button should appear (red)
- Click ↓ → file downloads
- Click ✕ → image disappears, toast shows

- [ ] **Step 6: Commit**

```bash
git add pages/Gallery.tsx
git commit -m "feat: functional download, delete with undo, and editor shortcut in gallery"
```

---

## Chunk 3: Gallery — Lightbox

### Task 4: Add lightbox modal to Gallery

**Files:**
- Modify: `pages/Gallery.tsx`

- [ ] **Step 1: Add lightbox state**

Inside Gallery component, add state:
```typescript
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
```

- [ ] **Step 2: Wire image click to open lightbox**

Change the image card's `onClick` from toggling selection to opening lightbox. The current `onClick` (around line 143) toggles selection — change it:

```typescript
onClick={() => setLightboxIndex(idx)}
```

Where `idx` is the index in the filtered items array. If multi-select is still needed, use a modifier key: `onClick={(e) => e.shiftKey ? toggleSelection(img.id) : setLightboxIndex(idx)}`.

- [ ] **Step 3: Add lightbox component (inline, bottom of Gallery return)**

Add before the closing `</div>` of the Gallery component, a new lightbox modal:

```tsx
{lightboxIndex !== null && (() => {
  const item = filteredItems[lightboxIndex]
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={() => setLightboxIndex(null)}>

      {/* Close button */}
      <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-lg z-10"
        style={{ background: 'rgba(255,255,255,.1)', color: 'var(--text-2)' }}
        onClick={() => setLightboxIndex(null)}>✕</button>

      {/* Arrow left */}
      <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-lg z-10"
        style={{ background: 'rgba(255,255,255,.08)', color: 'var(--text-2)' }}
        onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : filteredItems.length - 1) }}>‹</button>

      {/* Arrow right */}
      <button className="absolute right-[300px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-lg z-10"
        style={{ background: 'rgba(255,255,255,.08)', color: 'var(--text-2)' }}
        onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex < filteredItems.length - 1 ? lightboxIndex + 1 : 0) }}>›</button>

      {/* Content area */}
      <div className="flex max-w-[95vw] max-h-[90vh] gap-0" onClick={(e) => e.stopPropagation()}>

        {/* Image */}
        <div className="flex-1 min-w-0 flex items-center justify-center p-4">
          <img src={item.url} alt="" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
        </div>

        {/* Sidebar */}
        <div className="w-[280px] shrink-0 flex flex-col gap-3 p-4 overflow-y-auto"
          style={{ background: 'rgba(14,12,20,.8)', borderLeft: '1px solid var(--border)' }}>

          {/* Navigation actions */}
          <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Actions</div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { navigateToEditor(item.url); onNav?.('editor') }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(240,104,72,.08)', border: '1px solid rgba(240,104,72,.15)', color: 'var(--accent)' }}>
              ✦ Edit in AI Editor
            </button>
            <button onClick={() => { navigateToSession(item.url); onNav?.('session') }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(208,72,176,.08)', border: '1px solid rgba(208,72,176,.15)', color: 'var(--magenta)' }}>
              ◎ New Photo Session
            </button>
            <button onClick={() => { navigateToUpload(item.url); onNav?.('upload') }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(72,88,224,.08)', border: '1px solid rgba(72,88,224,.15)', color: 'var(--blue)' }}>
              ⊕ Create Character
            </button>
          </div>

          <div className="glow-line my-1" />

          {/* Quick actions */}
          <div className="flex gap-2">
            <button onClick={() => handleDownload({ stopPropagation: () => {} } as any, item.url, item.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px]"
              style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
              ↓ Download
            </button>
            <button onClick={() => { handleDelete({ stopPropagation: () => {} } as any, item); setLightboxIndex(null) }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px]"
              style={{ background: 'rgba(255,60,60,.08)', color: '#e05050' }}>
              ✕ Delete
            </button>
          </div>

          <div className="glow-line my-1" />

          {/* Filters section — placeholder, implemented in Task 5 */}
          <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Filters</div>
          <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>Coming soon...</div>
        </div>
      </div>
    </div>
  )
})()}
```

- [ ] **Step 4: Add keyboard navigation**

Add a `useEffect` for keyboard events:
```typescript
useEffect(() => {
  if (lightboxIndex === null) return
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setLightboxIndex(null)
    if (e.key === 'ArrowRight') setLightboxIndex(prev => prev !== null ? (prev < filteredItems.length - 1 ? prev + 1 : 0) : null)
    if (e.key === 'ArrowLeft') setLightboxIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : filteredItems.length - 1) : null)
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [lightboxIndex, filteredItems.length])
```

- [ ] **Step 5: Verify visually**

- Click image → lightbox opens with image centered + sidebar
- Arrow keys / arrow buttons → navigate between images
- Escape / click backdrop → closes
- Action buttons visible in sidebar (Editor, Session, Character, Download, Delete)

- [ ] **Step 6: Commit**

```bash
git add pages/Gallery.tsx
git commit -m "feat: add gallery lightbox with sidebar actions and keyboard navigation"
```

---

## Chunk 4: Gallery — Client-Side Filters

### Task 5: Add filter presets and sliders to lightbox sidebar

**Files:**
- Modify: `pages/Gallery.tsx` (lightbox sidebar — replace "Coming soon" placeholder)
- Modify: `stores/galleryStore.ts` (add `updateItem` method)

- [ ] **Step 1: Add filter state**

Inside Gallery component:
```typescript
const [filterValues, setFilterValues] = useState({ brightness: 0, contrast: 0, saturation: 0, temperature: 0 })
const [activePreset, setActivePreset] = useState<string | null>(null)
```

- [ ] **Step 2: Add filter presets and CSS computation**

Above the Gallery component or inside it:
```typescript
const FILTER_PRESETS: Record<string, { brightness: number, contrast: number, saturation: number, temperature: number }> = {
  'Warm': { brightness: 5, contrast: 0, saturation: 20, temperature: 30 },
  'B&W': { brightness: 0, contrast: 10, saturation: -100, temperature: 0 },
  'Vintage': { brightness: 5, contrast: -10, saturation: -20, temperature: 20 },
  'Cool': { brightness: 5, contrast: 0, saturation: -10, temperature: -30 },
  'Dramatic': { brightness: -5, contrast: 30, saturation: 10, temperature: 0 },
  'Fade': { brightness: 10, contrast: -10, saturation: -20, temperature: 0 },
}

function computeFilterCSS(v: typeof filterValues): string {
  const b = 1 + v.brightness / 100
  const c = 1 + v.contrast / 100
  const s = 1 + v.saturation / 100
  let css = `brightness(${b}) contrast(${c}) saturate(${s})`
  if (v.temperature > 0) {
    css += ` sepia(${v.temperature * 0.004}) hue-rotate(${v.temperature * 0.2}deg)`
  } else if (v.temperature < 0) {
    css += ` hue-rotate(${v.temperature * 0.2}deg)`
  }
  return css
}
```

- [ ] **Step 3: Apply CSS filter to lightbox image**

Update the `<img>` in the lightbox to apply the filter:
```tsx
<img src={item.url} alt=""
  className="max-w-full max-h-[85vh] object-contain rounded-xl"
  style={{ filter: computeFilterCSS(filterValues) }} />
```

- [ ] **Step 4: Replace the "Coming soon" placeholder in sidebar with filter UI**

```tsx
{/* Presets */}
<div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Presets</div>
<div className="grid grid-cols-3 gap-1.5">
  {Object.keys(FILTER_PRESETS).map(name => (
    <button key={name} onClick={() => {
      setActivePreset(name)
      setFilterValues(FILTER_PRESETS[name])
    }}
      className="px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
      style={{
        background: activePreset === name ? 'rgba(240,104,72,.1)' : 'var(--bg-3)',
        border: `1px solid ${activePreset === name ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
        color: activePreset === name ? 'var(--accent)' : 'var(--text-2)',
      }}>{name}</button>
  ))}
</div>

{/* Sliders */}
<div className="text-[9px] font-mono uppercase tracking-wider mt-2" style={{ color: 'var(--text-3)' }}>Adjust</div>
{(['brightness', 'contrast', 'saturation', 'temperature'] as const).map(key => (
  <div key={key}>
    <div className="flex justify-between mb-1">
      <span className="text-[9px] capitalize" style={{ color: 'var(--text-3)' }}>{key}</span>
      <span className="text-[9px] font-mono" style={{ color: filterValues[key] !== 0 ? 'var(--accent)' : 'var(--text-3)' }}>
        {filterValues[key] > 0 ? '+' : ''}{filterValues[key]}
      </span>
    </div>
    <input type="range" min={-100} max={100} value={filterValues[key]}
      className="slider-t w-full"
      onChange={e => {
        setActivePreset(null)
        setFilterValues(prev => ({ ...prev, [key]: parseInt(e.target.value) }))
      }} />
  </div>
))}

{/* Reset / Save */}
<div className="flex gap-2 mt-2">
  <button onClick={() => { setFilterValues({ brightness: 0, contrast: 0, saturation: 0, temperature: 0 }); setActivePreset(null) }}
    className="flex-1 px-3 py-2 rounded-lg text-[10px]"
    style={{ background: 'rgba(240,104,72,.08)', border: '1px solid rgba(240,104,72,.15)', color: 'var(--accent)' }}>
    Reset
  </button>
  <button onClick={() => handleSaveFilter(item)}
    className="flex-1 px-3 py-2 rounded-lg text-[10px] font-bold"
    style={{ background: 'linear-gradient(135deg, var(--accent), var(--magenta))', color: 'white' }}>
    Save
  </button>
</div>
```

- [ ] **Step 5: Add the handleSaveFilter function**

```typescript
const handleSaveFilter = async (item: GalleryItem) => {
  const filterCSS = computeFilterCSS(filterValues)
  if (filterCSS === 'brightness(1) contrast(1) saturate(1)') {
    addToast('No filters applied', 'info')
    return
  }
  try {
    // Fetch image as blob to avoid CORS tainting
    const res = await fetch(item.url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = blobUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.filter = filterCSS
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(blobUrl)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    updateItem(item.id, { url: dataUrl })
    setFilterValues({ brightness: 0, contrast: 0, saturation: 0, temperature: 0 })
    setActivePreset(null)
    addToast('Filters saved', 'success')
  } catch {
    addToast('Failed to save filters', 'error')
  }
}
```

- [ ] **Step 6: Add updateItem to galleryStore**

In `stores/galleryStore.ts`, add `updateItem` to the interface (around line 105, after `setItems`):
```typescript
updateItem: (id: string, updates: Partial<GalleryItem>) => void
```

Add implementation (after `setItems` implementation, around line 214):
```typescript
updateItem: (id, updates) => {
  set(state => ({
    items: state.items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  }))
  // Persist to IndexedDB
  const item = get().items.find(i => i.id === id)
  if (item) {
    updateHistoryItem(id, { ...item, ...updates }).catch(() => {})
  }
  // Persist to cloud if authenticated
  const userId = get()._userId
  if (userId && item) {
    updateGalleryItem(userId, id, updates).catch(() => {})
  }
},
```

Check that `updateHistoryItem` and `updateGalleryItem` are imported/available in the store file. They should already exist as helpers used by `toggleFavorite`.

Also add `updateItem` to the import in Gallery.tsx:
```typescript
const { items, removeItem, addItems, toggleFavorite, updateItem } = useGalleryStore()
```

- [ ] **Step 7: Reset filters when navigating between images**

In the keyboard navigation and arrow button handlers, reset filters when changing images:
```typescript
// Add to arrow handlers:
setFilterValues({ brightness: 0, contrast: 0, saturation: 0, temperature: 0 })
setActivePreset(null)
```

- [ ] **Step 8: Verify visually**

- Open lightbox → presets grid visible in sidebar
- Click "Warm" → image gets warm tint, preset highlighted
- Drag brightness slider → real-time preview
- Click "Save" → image updates in gallery
- Click "Reset" → sliders go to 0
- Navigate to next image → filters reset

- [ ] **Step 9: Commit**

```bash
git add pages/Gallery.tsx stores/galleryStore.ts
git commit -m "feat: add client-side filters with presets and sliders to gallery lightbox"
```

---

## Chunk 5: AI Editor + Upload Character — Consume Navigation

### Task 6: AI Editor consumes pending navigation

**Files:**
- Modify: `pages/AIEditor.tsx`

- [ ] **Step 1: Add useEffect to consume navigation on mount**

Import the navigation store:
```typescript
import { useNavigationStore } from '../stores/navigationStore'
```

Add inside AIEditor, after existing state declarations:
```typescript
const { pendingImage, pendingTarget, consume: consumeNav } = useNavigationStore()

useEffect(() => {
  if (pendingTarget === 'editor' && pendingImage) {
    setInputImage(pendingImage)
    setResultImage(null)
    // Convert URL to File
    urlToFile(pendingImage, 'from-gallery.png')
      .then(file => setInputFile(file))
      .catch(() => setInputFile(null))
    consumeNav()
  }
}, [pendingTarget, pendingImage])
```

Note: `urlToFile` already exists in AIEditor.tsx (added in the earlier bug fix).

- [ ] **Step 2: Verify**

From Gallery, click ✦ on an image → should navigate to AI Editor with that image loaded as input.

- [ ] **Step 3: Commit**

```bash
git add pages/AIEditor.tsx
git commit -m "feat: AI Editor consumes pending image from gallery navigation"
```

---

### Task 7: Upload Character consumes pending navigation

**Files:**
- Modify: `pages/UploadCharacter.tsx`

- [ ] **Step 1: Add useEffect to consume navigation on mount**

Import:
```typescript
import { useNavigationStore } from '../stores/navigationStore'
```

Add inside component:
```typescript
const { pendingImage, pendingTarget, consume: consumeNav } = useNavigationStore()

useEffect(() => {
  if (pendingTarget === 'upload' && pendingImage) {
    setMode('import')
    // Convert URL to File and add to importFiles
    fetch(pendingImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'from-gallery.png', { type: blob.type || 'image/png' })
        setImportFiles(prev => [...prev, file])
      })
      .catch(() => {})
    consumeNav()
  }
}, [pendingTarget, pendingImage])
```

Verify that `setMode` and `setImportFiles` state setters exist in UploadCharacter. `mode` should be the `'create' | 'import'` state.

- [ ] **Step 2: Verify**

From Gallery lightbox, click "⊕ Create Character" → should navigate to Upload Character in import mode with the image preloaded.

- [ ] **Step 3: Commit**

```bash
git add pages/UploadCharacter.tsx
git commit -m "feat: UploadCharacter consumes pending image from gallery navigation"
```

---

## Chunk 6: Photo Session — Expanded Scenarios + Consume Navigation

### Task 8: Expand Photo Session scenario tabs

**Files:**
- Modify: `pages/PhotoSession.tsx:317-376` (scenario section)

- [ ] **Step 1: Add new state for reference image**

Add alongside existing state:
```typescript
const [scenarioRefImage, setScenarioRefImage] = useState<string | null>(null)
const [scenarioRefFile, setScenarioRefFile] = useState<File | null>(null)
```

Import gallery store and navigation store:
```typescript
import { useGalleryStore } from '../stores/galleryStore'
import { useNavigationStore } from '../stores/navigationStore'
```

Add inside component:
```typescript
const galleryItems = useGalleryStore(s => s.items)
const { pendingImage, pendingTarget, consume: consumeNav } = useNavigationStore()
```

- [ ] **Step 2: Consume navigation on mount**

```typescript
useEffect(() => {
  if (pendingTarget === 'session' && pendingImage) {
    setSceneMode('reference')
    setScenarioRefImage(pendingImage)
    fetch(pendingImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'scenario-ref.png', { type: blob.type || 'image/png' })
        setScenarioRefFile(file)
      })
      .catch(() => {})
    consumeNav()
  }
}, [pendingTarget, pendingImage])
```

- [ ] **Step 3: Update sceneMode type**

Change existing `sceneMode` state (line 48):
```typescript
// From:
const [sceneMode, setSceneMode] = useState<'preset'|'upload'|'prompt'>('preset')
// To:
const [sceneMode, setSceneMode] = useState<'preset'|'reference'|'prompt'>('preset')
```

- [ ] **Step 4: Update mode selector buttons (lines 318-326)**

Replace the existing mode selector:
```tsx
<div className="flex gap-1.5 p-1 rounded-xl" style={{ background:'var(--bg-3)' }}>
  {([
    { id: 'preset' as const, label: '◎ Presets' },
    { id: 'prompt' as const, label: '✎ Prompt' },
    { id: 'reference' as const, label: '↑ Reference' },
  ]).map(m => (
    <button key={m.id} onClick={() => setSceneMode(m.id)}
      className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
      style={{
        background: sceneMode === m.id ? 'rgba(240,104,72,.1)' : 'transparent',
        color: sceneMode === m.id ? 'var(--accent)' : 'var(--text-3)',
      }}>{m.label}</button>
  ))}
</div>
```

- [ ] **Step 5: Update the content for each mode**

Keep existing Preset grid (lines 328-343) inside `{sceneMode === 'preset' && ...}`.

Replace the upload section (lines 345-367) with the new Reference tab:
```tsx
{sceneMode === 'reference' && (
  <div className="space-y-3">
    {/* Drop zone */}
    <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-[rgba(240,104,72,.3)]"
      style={{ borderColor: 'var(--border)' }}
      onClick={() => scenarioFileRef.current?.click()}>
      <input ref={scenarioFileRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) {
            setScenarioRefFile(file)
            const reader = new FileReader()
            reader.onload = () => setScenarioRefImage(reader.result as string)
            reader.readAsDataURL(file)
          }
        }} />
      {scenarioRefImage ? (
        <img src={scenarioRefImage} className="w-full h-24 object-cover rounded-lg" alt="" />
      ) : (
        <>
          <div className="text-lg" style={{ color: 'var(--text-3)' }}>↑</div>
          <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>Upload scenario image</div>
        </>
      )}
    </div>

    {/* From gallery */}
    {galleryItems.length > 0 && (
      <div>
        <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>From gallery</div>
        <div className="flex gap-1.5 flex-wrap">
          {galleryItems.slice(0, 8).map(g => (
            <button key={g.id} onClick={() => {
              setScenarioRefImage(g.url)
              fetch(g.url).then(r => r.blob()).then(b => setScenarioRefFile(new File([b], 'gallery-ref.png', { type: b.type })))
            }}
              className="w-12 h-12 rounded-lg overflow-hidden transition-all hover:scale-105"
              style={{ border: scenarioRefImage === g.url ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
              <img src={g.url} className="w-full h-full object-cover" alt="" />
            </button>
          ))}
        </div>
      </div>
    )}

    {/* From characters */}
    {characters.filter(c => c.thumbnail).length > 0 && (
      <div>
        <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>From characters</div>
        <div className="flex gap-1.5 flex-wrap">
          {characters.filter(c => c.thumbnail).map(c => (
            <button key={c.id} onClick={() => {
              setScenarioRefImage(c.thumbnail)
              fetch(c.thumbnail).then(r => r.blob()).then(b => setScenarioRefFile(new File([b], `${c.name}-ref.png`, { type: b.type })))
            }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] transition-all"
              style={{
                background: scenarioRefImage === c.thumbnail ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                border: `1px solid ${scenarioRefImage === c.thumbnail ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                color: scenarioRefImage === c.thumbnail ? 'var(--accent)' : 'var(--text-2)',
              }}>
              <img src={c.thumbnail} className="w-5 h-5 rounded-full object-cover" alt="" />
              {c.name}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

Update the prompt mode (lines 369-375) to be inside `{sceneMode === 'prompt' && ...}`. Add quick chips:
```tsx
{sceneMode === 'prompt' && (
  <div className="space-y-2">
    <textarea rows={3} value={scenarioPrompt} onChange={e => setScenarioPrompt(e.target.value)}
      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-[12px] resize-none"
      style={{ border: '1px solid var(--border)', color: 'var(--text-1)' }}
      placeholder="Describe the scenario... e.g. 'Cozy café in Paris at sunset'" />
    <div className="flex gap-1.5 flex-wrap">
      {['Café in Paris', 'Neon city at night', 'Enchanted forest', 'Rooftop sunset', 'Underwater', 'Space station'].map(q => (
        <button key={q} onClick={() => setScenarioPrompt(q)}
          className="px-2 py-1 rounded-md text-[9px] transition-all"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{q}</button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 6: Add scenarioFileRef**

At the top of the component with other refs:
```typescript
const scenarioFileRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 7: Update generation logic to use reference image**

Find the generation logic (around lines 135-137) where `scenario` is set. Update to handle the reference mode:

```typescript
// In the params object for generation:
scenario: sceneMode === 'prompt' && scenarioPrompt.trim()
  ? scenarioPrompt.trim()
  : sceneMode === 'reference' && scenarioRefImage
    ? 'Place the character in the exact same location/setting shown in the reference image. Match the lighting, colors and atmosphere.'
    : scenarios[selScene].name,
```

If the generation function supports a reference image parameter, pass `scenarioRefFile`. Check the signature of `generatePhotoSession` / `generateInfluencerImage` in `services/geminiService.ts` to see if it accepts a scenario reference image. If it does, pass it. If not, the text prompt will have to suffice for now (the reference image support can be wired later when the API supports it).

- [ ] **Step 8: Verify visually**

- Photo Session → 3 tabs visible (Presets, Prompt, Reference)
- Presets tab → same as before
- Prompt tab → textarea + quick chips
- Reference tab → drop zone + gallery thumbnails + character chips
- From Gallery lightbox → click "New Photo Session" → lands on Reference tab with image loaded

- [ ] **Step 9: Commit**

```bash
git add pages/PhotoSession.tsx
git commit -m "feat: expand Photo Session with prompt and reference scenario tabs"
```

---

## Final Verification

- [ ] **Full flow test: Gallery → AI Editor**
  1. Open Gallery, hover image → click ✦
  2. AI Editor opens with image preloaded as input

- [ ] **Full flow test: Gallery → Photo Session**
  1. Open Gallery, click image → lightbox opens
  2. Click "New Photo Session" in sidebar
  3. Photo Session opens on Reference tab with image loaded

- [ ] **Full flow test: Gallery → Upload Character**
  1. Open Gallery lightbox → click "Create Character"
  2. Upload Character opens in import mode with image

- [ ] **Full flow test: Download**
  1. Hover image → click ↓ → file downloads

- [ ] **Full flow test: Delete**
  1. Hover image → click ✕ → image removed, toast appears

- [ ] **Full flow test: Filters**
  1. Open lightbox → click "Warm" preset → image tinted
  2. Adjust brightness slider → real-time preview
  3. Click "Save" → image updated in gallery grid
  4. Navigate to next image → filters reset
