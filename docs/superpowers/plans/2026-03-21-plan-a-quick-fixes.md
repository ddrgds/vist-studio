# Plan A — Quick Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 independent bugs: gallery character linking, character reference photo selector, engine dropdown z-index, and Seedream safety checker.

**Architecture:** All fixes are isolated to existing files. No new services needed. Tasks A1 and A3/A4 are fully independent and can run in parallel. A2 depends on nothing but blocks Plan B Task B1.

**Tech Stack:** React 18, TypeScript, Zustand, Supabase, fal.ai, ReactDOM.createPortal

---

## File Map

| File | Changes |
|------|---------|
| `stores/galleryStore.ts` | A1: add `characterId` to `toGeneratedContent()` and `fromGeneratedContent()` |
| `services/supabaseService.ts` | A1: add `character_id` to `gallery_items` upsert + load |
| `stores/characterStore.ts` | A2: add `referencePhotoUrls?: string[]` to `SavedCharacter` |
| `services/supabaseCharacterService.ts` | A2: persist/load `referencePhotoUrls` |
| `pages/CharacterGallery.tsx` | A2: reference selector UI in "Fotos" tab |
| `pages/ContentStudio.tsx` | A2: auto-populate face refs from character |
| `pages/AIEditor.tsx` | A3: Portal for engine dropdown |
| `services/toolEngines.ts` | A4: `enable_safety_checker: false` in seedreamEdit |

---

## Task A1 — Fix "Sin personaje" in Gallery

**Root cause:** `toGeneratedContent()` drops `characterId` on conversion. `saveGalleryItem()` doesn't persist `character_id` to DB. `fromGeneratedContent()` doesn't restore it on load.

**Files:**
- Modify: `stores/galleryStore.ts:51-84`
- Modify: `services/supabaseService.ts:85-101, 103-130`

- [ ] **Step 1: Add `characterId` to `toGeneratedContent()`**

In `stores/galleryStore.ts`, find `toGeneratedContent()` (around line 51) and add the field:

```typescript
const toGeneratedContent = (item: GalleryItem): GeneratedContent => ({
  id: item.id,
  url: item.url,
  params: (item.params ?? {}) as GeneratedContent['params'],
  timestamp: item.timestamp,
  type: item.type === 'session' ? 'create' : item.type,
  favorite: item.favorite,
  tags: item.tags,
  source: item.source,
  aiProvider: item.aiProvider,
  falModel: item.falModel,
  replicateModel: item.replicateModel,
  openaiModel: item.openaiModel,
  ideogramModel: item.ideogramModel,
  characterId: item.characterId,   // ← ADD THIS LINE
});
```

- [ ] **Step 2: Add `characterId` to `GeneratedContent` type**

In `types.ts`, find the `GeneratedContent` interface and add:

```typescript
characterId?: string;   // ← add after ideogramModel
```

- [ ] **Step 3: Restore `characterId` in `fromGeneratedContent()`**

In `stores/galleryStore.ts`, find `fromGeneratedContent()` (around line 70) and add:

```typescript
const fromGeneratedContent = (gc: GeneratedContent): GalleryItem => ({
  // ... existing fields ...
  characterId: gc.characterId,   // ← ADD THIS LINE
});
```

- [ ] **Step 4: Persist `character_id` in `saveGalleryItem()`**

In `services/supabaseService.ts`, find the `supabase.from('gallery_items').upsert({...})` call (around line 85) and add `character_id`:

```typescript
const { error } = await supabase.from('gallery_items').upsert({
  id: item.id,
  user_id: userId,
  url: publicUrl,
  type: item.type === 'video' ? 'video' : 'image',
  generation_type: item.type,
  params: serializeParams(item.params),
  timestamp: item.timestamp,
  source: item.source ?? 'director',
  character_id: item.characterId ?? null,   // ← ADD THIS LINE
});
```

- [ ] **Step 5: Check if `gallery_items` DB table has `character_id` column**

Run in Supabase SQL editor or check migrations:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'gallery_items' AND column_name = 'character_id';
```

If column does not exist, run:
```sql
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES characters(id) ON DELETE SET NULL;
```

- [ ] **Step 6: Restore `character_id` on load**

In `services/supabaseService.ts`, find `loadGalleryItems()` (around line 103). Find where it maps DB rows to `GeneratedContent`. Add:

```typescript
characterId: row.character_id ?? undefined,
```

- [ ] **Step 7: Manual test**

1. Open app, select a character in ContentStudio, generate an image
2. Click "Guardar en Galería"
3. Navigate to Gallery
4. Verify the item shows the character name instead of "Sin personaje"

- [ ] **Step 8: Commit**

```bash
git add stores/galleryStore.ts services/supabaseService.ts types.ts
git commit -m "fix(A1): propagar characterId en gallery — fix Sin personaje"
```

---

## Task A2 — Character Reference Photo Selector

**Goal:** Allow users to mark up to 20 generated photos as "reference photos" for a character. Auto-populate Director's face refs when character is selected.

**Files:**
- Modify: `stores/characterStore.ts:15-34`
- Modify: `services/supabaseCharacterService.ts`
- Modify: `pages/CharacterGallery.tsx`
- Modify: `pages/ContentStudio.tsx`

### A2a — Data model

- [ ] **Step 1: Add `referencePhotoUrls` to `SavedCharacter`**

In `stores/characterStore.ts`, find the `SavedCharacter` interface and add:

```typescript
export interface SavedCharacter {
  // ... existing fields ...
  referencePhotoUrls?: string[]  // max 20, user-curated face references
}
```

- [ ] **Step 2: Add `updateCharacter` call for referencePhotoUrls**

`updateCharacter` already exists in the store. No changes needed — it accepts `Partial<SavedCharacter>`.

- [ ] **Step 3: Persist `referencePhotoUrls` to Supabase**

In `services/supabaseCharacterService.ts`, find the `updateCharacterInCloud()` function. Add `reference_photo_urls` to the update payload:

```typescript
reference_photo_urls: char.referencePhotoUrls ?? [],
```

Also in the load function (`loadCharactersFromCloud()`), map it back:
```typescript
referencePhotoUrls: row.reference_photo_urls ?? [],
```

- [ ] **Step 4: Check Supabase `characters` table has `reference_photo_urls` column**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'characters' AND column_name = 'reference_photo_urls';
```

If missing:
```sql
ALTER TABLE characters ADD COLUMN IF NOT EXISTS reference_photo_urls text[] DEFAULT '{}';
```

- [ ] **Step 5: Commit data model changes**

```bash
git add stores/characterStore.ts services/supabaseCharacterService.ts
git commit -m "feat(A2a): add referencePhotoUrls to SavedCharacter"
```

### A2b — CharacterGallery UI

- [ ] **Step 6: Add selection state to CharacterGallery**

In `pages/CharacterGallery.tsx`, inside the component that renders the detail panel, add local state near the top of the component:

```typescript
const [refSelectMode, setRefSelectMode] = useState(false)
const [pendingRefs, setPendingRefs] = useState<string[]>([])

// Initialize pendingRefs when entering select mode
const enterRefSelectMode = () => {
  setPendingRefs(selectedChar?.referencePhotoUrls ?? [])
  setRefSelectMode(true)
}
```

- [ ] **Step 7: Add "Gestionar Referencias" button to Fotos tab header**

In the "Fotos" tab section of CharacterGallery, add a button in the tab header row:

```tsx
<div className="flex items-center justify-between mb-3">
  <span className="text-sm font-medium" style={{ color: 'var(--joi-text-2)' }}>
    {charPhotoItems.length} fotos
  </span>
  {!refSelectMode ? (
    <button
      onClick={enterRefSelectMode}
      className="text-xs px-3 py-1 rounded-lg transition-colors"
      style={{
        background: 'rgba(255,107,157,0.1)',
        color: 'var(--joi-pink)',
        border: '1px solid rgba(255,107,157,0.2)'
      }}
    >
      Gestionar Referencias
    </button>
  ) : (
    <div className="flex items-center gap-2">
      <span className="text-xs" style={{ color: 'var(--joi-text-3)' }}>
        {pendingRefs.length}/20 seleccionadas
      </span>
      <button
        onClick={() => setRefSelectMode(false)}
        className="text-xs px-2 py-1 rounded"
        style={{ color: 'var(--joi-text-3)' }}
      >
        Cancelar
      </button>
      <button
        onClick={async () => {
          updateCharacter(selectedChar.id, { referencePhotoUrls: pendingRefs })
          // Persist to cloud
          const updated = { ...selectedChar, referencePhotoUrls: pendingRefs }
          await updateCharacterInCloud(updated).catch(console.warn)
          setRefSelectMode(false)
          toast.success(`${pendingRefs.length} referencias guardadas`)
        }}
        className="text-xs px-3 py-1 rounded-lg font-medium"
        style={{ background: 'var(--joi-pink)', color: '#fff' }}
      >
        Guardar
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 8: Add checkbox overlay to each photo in Fotos tab**

Wrap each photo thumbnail with selection logic:

```tsx
{charPhotoItems.map((photo) => {
  const isSelected = pendingRefs.includes(photo.url)
  return (
    <div
      key={photo.id}
      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
      onClick={() => {
        if (!refSelectMode) { setPreviewImage(photo.url); return }
        if (isSelected) {
          setPendingRefs(prev => prev.filter(u => u !== photo.url))
        } else if (pendingRefs.length < 20) {
          setPendingRefs(prev => [...prev, photo.url])
        }
      }}
    >
      <img src={photo.url} className="w-full h-full object-cover" />
      {refSelectMode && (
        <div
          className="absolute inset-0 transition-colors"
          style={{ background: isSelected ? 'rgba(255,107,157,0.3)' : 'transparent' }}
        />
      )}
      {refSelectMode && (
        <div
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: isSelected ? 'var(--joi-pink)' : 'rgba(0,0,0,0.5)',
            border: '2px solid white',
            color: 'white'
          }}
        >
          {isSelected ? '✓' : ''}
        </div>
      )}
    </div>
  )
})}
```

- [ ] **Step 9: Show reference badge on photos already marked**

When NOT in select mode, show a small pink dot on photos that are in `selectedChar.referencePhotoUrls`:

```tsx
{!refSelectMode && selectedChar?.referencePhotoUrls?.includes(photo.url) && (
  <div
    className="absolute top-1 right-1 w-2 h-2 rounded-full"
    style={{ background: 'var(--joi-pink)' }}
  />
)}
```

- [ ] **Step 10: Commit CharacterGallery UI**

```bash
git add pages/CharacterGallery.tsx
git commit -m "feat(A2b): reference photo selector UI in CharacterGallery"
```

### A2c — Director auto-populate

- [ ] **Step 11: Model max per engine constant**

In `pages/ContentStudio.tsx`, near the top with other constants, add:

```typescript
/** Max face reference images accepted per engine */
const DIRECTOR_REF_MAX: Record<string, number> = {
  seedream: 5,
  grok: 3,
  pulid: 5,
  gemini: 10,
  'flux-kontext': 1,
  'flux-pro': 1,
}
```

- [ ] **Step 12: Auto-populate face refs when character is selected**

In `ContentStudio.tsx`, find where `selectedCharId` changes (the character selector onChange, around the character buttons). After selecting a character, populate the face references:

```typescript
const handleSelectCharacter = useCallback((charId: string) => {
  setSelectedCharId(charId)
  const char = characters.find(c => c.id === charId)
  if (char?.referencePhotoUrls?.length) {
    const maxRefs = DIRECTOR_REF_MAX[selectedEngine] ?? 3
    setFaceRefs(char.referencePhotoUrls.slice(0, maxRefs))
  }
}, [characters, selectedEngine])
```

Note: `setFaceRefs` is the existing state setter for face reference URLs. Find the actual name of this state variable in ContentStudio — it may be `uploadedFaceRefs`, `faceRefUrls`, or similar. Adapt accordingly.

- [ ] **Step 13: Manual test**

1. Go to CharacterGallery → select a character → Fotos tab → Gestionar Referencias
2. Select 3 photos → Guardar
3. Go to ContentStudio → select same character
4. Verify "Referencias de Rostro" auto-populates with those 3 photos

- [ ] **Step 14: Commit**

```bash
git add pages/ContentStudio.tsx
git commit -m "feat(A2c): auto-populate face refs in Director from character referencePhotoUrls"
```

---

## Task A3 — Engine Dropdown Portal Fix

**Root cause:** The `showEngineModal` dropdown in AIEditor is positioned `absolute` inside a container that likely has `overflow: hidden` or a CSS stacking context, clipping the dropdown or intercepting clicks.

**Fix:** Render the dropdown via `ReactDOM.createPortal` so it escapes the DOM hierarchy.

**Files:**
- Modify: `pages/AIEditor.tsx`

- [ ] **Step 1: Import createPortal**

At the top of `pages/AIEditor.tsx`, add:

```typescript
import { createPortal } from 'react-dom'
```

- [ ] **Step 2: Add ref to the trigger button**

Find the 🔧 engine selector button (around line 539). Add a ref:

```typescript
const engineBtnRef = useRef<HTMLButtonElement>(null)
```

Add `ref={engineBtnRef}` to the trigger button element.

- [ ] **Step 3: Add position state**

Add state to track dropdown position:

```typescript
const [engineDropdownPos, setEngineDropdownPos] = useState({ top: 0, right: 0 })
```

- [ ] **Step 4: Calculate position on open**

Update the button's onClick to calculate position before opening:

```typescript
onClick={() => {
  if (engineBtnRef.current) {
    const rect = engineBtnRef.current.getBoundingClientRect()
    setEngineDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    })
  }
  setShowEngineModal(v => !v)
}}
```

- [ ] **Step 5: Move dropdown to Portal**

Find the dropdown JSX (the `absolute top-full right-0 mt-2 z-50` div). Replace it with:

```tsx
{showEngineModal && createPortal(
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 z-[9998]"
      onClick={() => setShowEngineModal(false)}
    />
    {/* Dropdown */}
    <div
      className="fixed z-[9999] w-[300px] rounded-xl shadow-2xl overflow-hidden"
      style={{
        top: engineDropdownPos.top,
        right: engineDropdownPos.right,
        background: 'var(--joi-bg-2)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Keep all existing dropdown content exactly as-is */}
      {/* Engine options list, checkmarks, etc. */}
    </div>
  </>,
  document.body
)}
```

- [ ] **Step 6: Manual test**

1. Open AIEditor → select any tool that shows 🔧 button
2. Click 🔧 → verify dropdown appears
3. Click an engine option → verify it selects and dropdown closes
4. Verify this works for ALL tool tabs (Relight, Scene, Outfit, Face Swap, etc.)

- [ ] **Step 7: Commit**

```bash
git add pages/AIEditor.tsx
git commit -m "fix(A3): engine dropdown via createPortal — fix z-index clipping"
```

---

## Task A4 — Seedream Safety Checker Off

**Goal:** Add `enable_safety_checker: false` to all Seedream v5 Lite fal.ai calls.

**Files:**
- Modify: `services/toolEngines.ts` — `seedreamEdit()` function

- [ ] **Step 1: Find seedreamEdit and add safety checker param**

In `services/toolEngines.ts`, find the `seedreamEdit()` function (around line 178). Update the `fal.subscribe` input:

```typescript
const result = await fal.subscribe('fal-ai/bytedance/seedream/v5/lite/edit', {
  input: {
    image_urls: [imageUrl],
    prompt: compiled,
    num_images: 1,
    enable_safety_checker: false,   // ← ADD THIS
  },
  // ... rest unchanged
});
```

- [ ] **Step 2: Verify no other Seedream calls exist**

```bash
grep -rn "seedream" services/ --include="*.ts"
```

If any other Seedream calls exist, add `enable_safety_checker: false` to those too.

- [ ] **Step 3: Commit**

```bash
git add services/toolEngines.ts
git commit -m "fix(A4): Seedream enable_safety_checker=false — fix fashion content rejections"
```

---

## Final Verification

- [ ] Run `pnpm build` — verify no TypeScript errors
- [ ] Check that gallery shows character names for new saves
- [ ] Check that reference selector works in CharacterGallery
- [ ] Check that engine dropdown opens and is clickable in all AIEditor tool tabs
- [ ] Check that Seedream calls don't get rejected on fashion/skin content
