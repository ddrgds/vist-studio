# Create Page Soul & Feature Recovery — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore all lost gallery features from legacy GalleryGrid, add visual soul (cyan accent, depth, animations), fix AI Edit, redesign Generate button, add resizable gallery, scene photo upload, and battle mode comparison.

**Architecture:** Upgrade CreatePage's inline gallery to match GalleryGrid's full feature set (hover actions, context menu, selection mode, filter bar, compare slider). Add visual depth via secondary cyan accent `#22D3EE`, surface gradients, micro-animations. New features: resizable gallery drag handle, scene photo upload, multi-engine battle mode.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons

---

## Task 1: Add Cyan Design Tokens + New Keyframes to index.css

**Files:**
- Modify: `index.css` (lines 8-70 tokens section, lines 230+ keyframes section)

**Step 1: Add cyan tokens to CSS custom properties**

In `index.css`, after the existing `--color-amber-brand: #FFB347` token, add:

```css
--color-cyan-accent: #22D3EE;
--color-cyan-hover: #06B6D4;
--color-cyan-dim: rgba(34, 211, 238, 0.15);
--color-cyan-glow: rgba(34, 211, 238, 0.1);
--color-cyan-tint: rgba(34, 211, 238, 0.04);
```

**Step 2: Add new keyframes after existing `prompt-shake`**

```css
@keyframes generate-pulse {
  0%, 100% { box-shadow: 0 2px 12px rgba(255,92,53,0.3); }
  50% { box-shadow: 0 2px 20px rgba(255,92,53,0.5), 0 0 30px rgba(255,92,53,0.15); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.generate-ready {
  animation: generate-pulse 2s ease-in-out infinite;
}

.fade-in-stagger {
  animation: fade-in-up 0.3s ease-out both;
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 4: Commit**

```bash
git add index.css
git commit -m "feat: add cyan design tokens and new animation keyframes"
```

---

## Task 2: Gallery Hover Actions — Full Feature Parity

**Files:**
- Modify: `components/CreatePage.tsx` (lines 312-323 MiniAction, lines 649-698 gallery grid)

**Step 1: Add new imports at top of CreatePage.tsx**

Add to existing Lucide imports (line 2):
```typescript
import { Wand2, MoreVertical, Pencil, Move, GitCompareArrows } from 'lucide-react';
```

Add new import:
```typescript
import CompareSliderModal from './CompareSliderModal';
```

**Step 2: Add new state variables** (after line 490 `lightboxItem`)

```typescript
const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
const [moreMenuRect, setMoreMenuRect] = useState<DOMRect | null>(null);
const [compareMode, setCompareMode] = useState<GeneratedContent | null>(null);
const [compareItems, setCompareItems] = useState<[GeneratedContent, GeneratedContent] | null>(null);
```

**Step 3: Add MoreOptionsMenu component** (after MiniAction component, ~line 323)

Create a `CreateMoreMenu` component inside CreatePage.tsx that renders via `createPortal`:

```typescript
const CreateMoreMenu: React.FC<{
  item: GeneratedContent;
  anchorRect: DOMRect;
  onClose: () => void;
}> = ({ item, anchorRect, onClose }) => {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const MENU_WIDTH = 200;
  let top = anchorRect.bottom + 4;
  let left = anchorRect.right - MENU_WIDTH;
  if (left < 8) left = 8;
  if (top + 400 > window.innerHeight) top = anchorRect.top - 400;

  const actions = [
    ...(item.type !== 'video' ? [
      { icon: '🎭', label: 'Face Swap', action: () => onFaceSwap(item) },
      { icon: '👗', label: 'Virtual Try-On', action: () => onTryOn?.(item) },
      { icon: '✨', label: 'Skin Enhancer', action: () => onSkinEnhance?.(item) },
      { icon: '☀️', label: 'Relight', action: () => onRelight?.(item) },
      { icon: '🎨', label: 'Inpainting', action: () => onInpaint(item) },
      { icon: '✍️', label: 'Generate Caption', action: () => onCaption(item) },
      { icon: '📋', label: 'Copy to Clipboard', action: () => handleCopyToClipboard(item) },
    ] : []),
    { icon: '🎬', label: 'Add to Storyboard', action: () => onAddToStoryboard(item) },
    ...(item.type !== 'video' ? [
      { icon: '⚔️', label: 'Compare with...', action: () => setCompareMode(item) },
    ] : []),
  ];

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top, left, zIndex: 9999, width: MENU_WIDTH }}
      className="rounded-xl shadow-2xl overflow-hidden"
      style2={{ background: '#111010', border: '1px solid #2A1F1C' }}
    >
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); a.action(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors text-left"
          style={{ color: '#D4C8C4' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.06)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#D4C8C4'; }}
        >
          <span className="text-sm shrink-0">{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>,
    document.body
  );
};
```

**Step 4: Replace gallery hover overlay** (lines 683-694)

Replace the 3 MiniAction buttons with 6 action buttons + More menu:

```typescript
{/* Hover actions — full feature parity */}
{hoveredItem === item.id && (
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent hidden lg:flex flex-col justify-end p-2">
    <div className="flex gap-1.5 justify-end flex-wrap">
      {/* Download */}
      <button onClick={(e) => { e.stopPropagation(); onDownload(item); }} aria-label="Download"
        className="p-1.5 rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ background: 'rgba(16,185,129,0.85)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.85)'; }}>
        <Download className="w-3.5 h-3.5" />
      </button>
      {/* AI Edit */}
      {item.type !== 'video' && (
        <button onClick={(e) => { e.stopPropagation(); setAiEditTarget(item); }} aria-label="AI Edit"
          className="p-1.5 rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(59,130,246,0.85)' }}>
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {/* Change Pose */}
      {item.type !== 'video' && onChangePose && (
        <button onClick={(e) => { e.stopPropagation(); onChangePose(item); }} aria-label="Change pose"
          className="p-1.5 rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(139,92,246,0.85)' }}>
          <Move className="w-3.5 h-3.5" />
        </button>
      )}
      {/* Reuse */}
      <button onClick={(e) => { e.stopPropagation(); onReuse(item); }} aria-label="Reuse parameters"
        className="p-1.5 rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ background: 'rgba(168,85,247,0.85)' }}>
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
      {/* Upscale */}
      {item.type !== 'video' && (
        <button onClick={(e) => { e.stopPropagation(); onUpscale(item); }} aria-label="Upscale 4×"
          className="p-1.5 rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(217,119,6,0.85)' }}>
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}
      {/* More ⋯ */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMoreMenu(item.id);
          setMoreMenuRect((e.currentTarget as HTMLElement).getBoundingClientRect());
        }}
        aria-label="More options"
        className="p-1.5 rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ background: 'rgba(82,82,91,0.85)' }}>
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
    </div>
    {/* Compare mode indicator */}
    {compareMode && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded"
        onClick={(e) => { e.stopPropagation(); setCompareItems([compareMode, item]); setCompareMode(null); }}>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: '#22D3EE', color: '#000' }}>
          Click to compare
        </span>
      </div>
    )}
  </div>
)}

{/* Render More Menu */}
{showMoreMenu === item.id && moreMenuRect && (
  <CreateMoreMenu
    item={item}
    anchorRect={moreMenuRect}
    onClose={() => { setShowMoreMenu(null); setMoreMenuRect(null); }}
  />
)}
```

**Step 5: Add CompareSliderModal render** (after lightbox, before prompt bar)

```typescript
{compareItems && (
  <CompareSliderModal
    itemA={compareItems[0]}
    itemB={compareItems[1]}
    onClose={() => setCompareItems(null)}
  />
)}
```

**Step 6: Add handleCopyToClipboard utility function** (inside component)

```typescript
const handleCopyToClipboard = async (item: GeneratedContent) => {
  try {
    const response = await fetch(item.url);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  } catch { /* silent fail */ }
};
```

**Step 7: Verify build**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 8: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: gallery hover actions — 6 buttons + More menu + Compare slider"
```

---

## Task 3: Add New Props to CreatePage + Wire in App.tsx

**Files:**
- Modify: `components/CreatePage.tsx` (props interface, ~line 32)
- Modify: `App.tsx` (CreatePage render, ~line 1235)

**Step 1: Update CreatePageProps interface**

Add these new props:

```typescript
interface CreatePageProps {
  // ... existing props ...
  onSkinEnhance?: (item: GeneratedContent) => void;  // NEW
}
```

**Step 2: Wire onSkinEnhance in App.tsx**

In the CreatePage render block (~line 1250), add:

```typescript
onSkinEnhance={(item) => setSkinEnhanceItem(item)}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add components/CreatePage.tsx App.tsx
git commit -m "feat: wire SkinEnhancer prop from App.tsx to CreatePage"
```

---

## Task 4: AI Edit Prompt Overlay (Fix onEdit → Filters vs AI Edit)

**Files:**
- Modify: `components/CreatePage.tsx` (new overlay component + state, lightbox actions)

**Step 1: Add AI Edit state**

```typescript
const [aiEditTarget, setAiEditTarget] = useState<GeneratedContent | null>(null);
const [aiEditPrompt, setAiEditPrompt] = useState('');
```

**Step 2: Create AiEditOverlay component** (inside CreatePage, after CreateMoreMenu)

```typescript
const AiEditOverlay: React.FC<{
  item: GeneratedContent;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const handleApply = () => {
    if (!aiEditPrompt.trim()) return;
    // Set up edit mode in form context
    form.setBaseImageForEdit(null); // Will use item.url
    form.setActiveMode('edit');
    form.setEditSubMode('ai');
    // Set the prompt as the edit instruction
    form.setCharacteristic(0, 'outfitDescription', aiEditPrompt);
    onClose();
    setAiEditPrompt('');
    // Trigger generation
    onGenerate();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#0F0C0C', border: '1px solid #2A1F1C' }} onClick={e => e.stopPropagation()}>
        {/* Preview */}
        <div className="p-4">
          <img src={item.url} alt="" className="w-full max-h-64 object-contain rounded-xl" />
        </div>
        {/* Prompt */}
        <div className="px-4 pb-4">
          <label className="text-[10px] font-jet uppercase tracking-wider mb-2 block" style={{ color: '#22D3EE' }}>Edit instruction</label>
          <textarea
            value={aiEditPrompt}
            onChange={e => setAiEditPrompt(e.target.value)}
            placeholder="e.g. Add sunglasses, change background to beach..."
            className="w-full h-20 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none"
            style={{ background: '#1A1210', border: '1px solid #2A1F1C', color: '#E8DDD9' }}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-medium" style={{ background: '#1A1210', color: '#6B5A56', border: '1px solid #2A1F1C' }}>Cancel</button>
            <button onClick={handleApply} className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #22D3EE, #06B6D4)' }}>
              Apply Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Step 3: Render the overlay** (before CompareSliderModal)

```typescript
{aiEditTarget && (
  <AiEditOverlay item={aiEditTarget} onClose={() => { setAiEditTarget(null); setAiEditPrompt(''); }} />
)}
```

**Step 4: Fix lightbox "AI Edit" button** (in lightbox action bar)

Change the "AI Edit" button in the lightbox from:
```typescript
onEdit?.(lightboxItem)  // Opens filter editor
```
To:
```typescript
setAiEditTarget(lightboxItem); setLightboxItem(null);  // Opens AI Edit overlay
```

And relabel the old "Edit" button to "Filters" keeping its `onEdit` call.

**Step 5: Verify build**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: AI Edit prompt overlay — fix onEdit routing to proper AI editing"
```

---

## Task 5: Generate Button Redesign

**Files:**
- Modify: `components/CreatePage.tsx` (lines 1072-1095 generate button)

**Step 1: Replace Sparkles with Wand2**

Change the generate button icon from `<Sparkles className="w-3.5 h-3.5" />` to `<Wand2 className="w-3.5 h-3.5" />`.

**Step 2: Redesign credit badge**

Change from:
```typescript
<span className="text-[10px] font-jet opacity-80">⚡{genCreditCost}</span>
```
To:
```typescript
<span className="text-[9px] font-jet font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#22D3EE', color: '#000' }}>⚡{genCreditCost}</span>
```

**Step 3: Add pulse glow when prompt is filled**

Change the button className to conditionally include `generate-ready`:

```typescript
className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97] flex-none text-white ${!promptIsEmpty && !isGenerating ? 'generate-ready' : ''}`}
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: generate button — Wand2 icon, cyan credit badge, pulse glow"
```

---

## Task 6: Visual Soul — Colors, Depth, Animations

**Files:**
- Modify: `components/CreatePage.tsx` (multiple sections)

**Step 1: Engine badge colors by category**

Replace the engine badge (lines 668-681) with colored variants:

```typescript
{item.aiProvider && (() => {
  const badgeMap: Record<string, { label: string; bg: string; color: string }> = {
    [AIProvider.Auto]: { label: 'Auto', bg: 'rgba(34,211,238,0.2)', color: '#22D3EE' },
    [AIProvider.Gemini]: { label: 'Fast', bg: 'rgba(255,92,53,0.2)', color: '#FF5C35' },
    [AIProvider.Fal]: { label: 'Identity', bg: 'rgba(34,211,238,0.2)', color: '#22D3EE' },
    [AIProvider.Replicate]: { label: 'Creative', bg: 'rgba(168,85,247,0.2)', color: '#A855F7' },
    [AIProvider.OpenAI]: { label: 'Detail', bg: 'rgba(34,211,238,0.2)', color: '#22D3EE' },
    [AIProvider.Ideogram]: { label: 'Typography', bg: 'rgba(255,179,71,0.2)', color: '#FFB347' },
    [AIProvider.ModelsLab]: { label: 'NSFW', bg: 'rgba(239,68,68,0.2)', color: '#EF4444' },
  };
  const badge = badgeMap[item.aiProvider];
  if (!badge) return null;
  return (
    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[7px] font-jet font-bold"
      style={{ background: badge.bg, color: badge.color }}>
      {badge.label}
    </div>
  );
})()}
```

**Step 2: Gallery image hover glow**

Add to the masonry grid image wrapper (line 654):
```typescript
style={{
  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  ...(hoveredItem === item.id ? { boxShadow: '0 0 16px rgba(34,211,238,0.12)', transform: 'scale(1.01)' } : {})
}}
```

**Step 3: Prompt bar depth**

Add to the prompt bar container (the outermost div of the bottom section):
```typescript
style={{
  background: 'linear-gradient(180deg, rgba(13,10,10,0) 0%, #0D0A0A 20%)',
  boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
  borderTop: '1px solid rgba(255,255,255,0.04)'
}}
```

**Step 4: Panel gradient backgrounds**

For each expandable panel (Face/Outfit/Scene), change the background from flat to gradient:
```typescript
style={{ background: 'linear-gradient(180deg, #131010, #0D0A0A)', borderTop: '1px solid rgba(34,211,238,0.06)' }}
```

**Step 5: Staggered fade-in for gallery images**

Add to each gallery item wrapper:
```typescript
className="... fade-in-stagger"
style={{ animationDelay: `${index * 50}ms` }}
```

Limit stagger to first 20 items to avoid excessive delays.

**Step 6: Verify build**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: visual soul — cyan badges, hover glow, depth shadows, stagger animations"
```

---

## Task 7: Gallery Filter Bar

**Files:**
- Modify: `components/CreatePage.tsx` (above masonry grid)

**Step 1: Add filter state**

```typescript
const [filterType, setFilterType] = useState<'all' | 'images' | 'video' | 'favorites'>('all');
const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
```

**Step 2: Add filter logic**

```typescript
const filteredItems = React.useMemo(() => {
  let items = displayItems;
  if (filterType === 'images') items = items.filter(i => i.type !== 'video');
  if (filterType === 'video') items = items.filter(i => i.type === 'video');
  if (filterType === 'favorites') items = items.filter(i => i.isFavorite);
  if (sortOrder === 'oldest') items = [...items].reverse();
  return items;
}, [displayItems, filterType, sortOrder]);
```

**Step 3: Add filter bar JSX** (before masonry grid, after timeline strip)

```typescript
{displayItems.length > 0 && (
  <div className="sticky top-0 z-20 flex items-center gap-1.5 px-3 py-2" style={{ background: 'rgba(13,10,10,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A1F1C' }}>
    {(['all', 'images', 'video', 'favorites'] as const).map((type) => {
      const LABELS = { all: 'All', images: 'Images', video: 'Video', favorites: '★ Saved' };
      return (
        <button key={type} onClick={() => setFilterType(type)}
          className="text-[10px] px-2.5 py-1 rounded-full transition-all font-jet"
          style={filterType === type
            ? { background: '#FF5C35', color: '#fff' }
            : { background: 'transparent', color: '#6B5A56', border: '1px solid #2A1F1C' }
          }>
          {LABELS[type]}
        </button>
      );
    })}
    <div className="flex-1" />
    <button onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
      className="text-[10px] px-2.5 py-1 rounded-full font-jet transition-colors"
      style={{ color: '#6B5A56', border: '1px solid #2A1F1C' }}>
      {sortOrder === 'newest' ? '↓ Newest' : '↑ Oldest'}
    </button>
    <span className="text-[10px] font-jet tabular-nums" style={{ color: '#4A3A36' }}>
      {filteredItems.length}
    </span>
  </div>
)}
```

**Step 4: Update masonry grid to use `filteredItems`**

Replace `displayItems.map(...)` with `filteredItems.map(...)` in the masonry grid.

**Step 5: Verify build**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: gallery filter bar — All/Images/Video/Favorites + sort"
```

---

## Task 8: Resizable Gallery (Drag Handle)

**Files:**
- Modify: `components/CreatePage.tsx` (layout restructure)

**Step 1: Add resize state**

```typescript
const [galleryRatio, setGalleryRatio] = useState(() => {
  const saved = localStorage.getItem('vist_gallery_ratio');
  return saved ? parseFloat(saved) : 0.65; // 65% gallery, 35% prompt area
});
const [isDragging, setIsDragging] = useState(false);
const containerRef = useRef<HTMLDivElement>(null);
```

**Step 2: Add drag handlers**

```typescript
const handleDragStart = (e: React.MouseEvent) => {
  e.preventDefault();
  setIsDragging(true);
};

useEffect(() => {
  if (!isDragging) return;
  const handleMove = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const clamped = Math.min(0.85, Math.max(0.3, ratio));
    setGalleryRatio(clamped);
  };
  const handleUp = () => {
    setIsDragging(false);
    localStorage.setItem('vist_gallery_ratio', galleryRatio.toString());
  };
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleUp);
  return () => {
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleUp);
  };
}, [isDragging, galleryRatio]);
```

**Step 3: Restructure layout**

Wrap gallery + prompt area in a flex-col container with `ref={containerRef}`:

```typescript
<div ref={containerRef} className="flex flex-col h-full">
  {/* Gallery area */}
  <div className="overflow-y-auto" style={{ height: `${galleryRatio * 100}%` }}>
    {/* ... existing gallery content ... */}
  </div>

  {/* Drag handle */}
  <div
    className="h-1.5 cursor-row-resize flex items-center justify-center group shrink-0"
    style={{ background: isDragging ? 'rgba(34,211,238,0.15)' : 'transparent' }}
    onMouseDown={handleDragStart}
  >
    <div className="w-8 h-0.5 rounded-full transition-colors"
      style={{ background: isDragging ? '#22D3EE' : '#2A1F1C' }}
    />
  </div>

  {/* Panels + Prompt bar */}
  <div className="shrink-0" style={{ height: `${(1 - galleryRatio) * 100}%` }}>
    {/* ... existing panels + prompt bar ... */}
  </div>
</div>
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: resizable gallery with drag handle — persisted to localStorage"
```

---

## Task 9: Scene Photo Reference

**Files:**
- Modify: `components/CreatePage.tsx` (Scene panel section, ~lines 878-982)
- Check: `contexts/FormContext.tsx` (already has `scenarioImage: File[]`)

**Step 1: Verify FormContext has scenarioImage**

Read `contexts/FormContext.tsx` and confirm `scenarioImage` and `setScenarioImage` exist. They should already be there.

**Step 2: Add scene image upload to Scene panel**

After the Pose buttons grid and before the Scene Description textarea, add:

```typescript
{/* Scene reference image */}
<div className="mb-3">
  <div className="text-[9px] font-jet uppercase tracking-wider mb-1.5" style={{ color: '#6B5A56' }}>Scene reference</div>
  {form.scenarioImage && form.scenarioImage.length > 0 ? (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden group">
      <img src={URL.createObjectURL(form.scenarioImage[0])} alt="" className="w-full h-full object-cover" />
      <button
        onClick={() => form.setScenarioImage([])}
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  ) : (
    <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
      style={{ border: '1px dashed #2A1F1C', color: '#4A3A36' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#22D3EE'; (e.currentTarget as HTMLElement).style.color = '#22D3EE'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; (e.currentTarget as HTMLElement).style.color = '#4A3A36'; }}>
      <ImagePlus className="w-3.5 h-3.5" />
      <span className="text-[10px]">Add scene photo</span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) form.setScenarioImage([file]);
      }} />
    </label>
  )}
</div>
```

**Step 3: Add `ImagePlus` to imports**

```typescript
import { ..., ImagePlus } from 'lucide-react';
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: scene panel accepts photo reference — upload slot with preview"
```

---

## Task 10: Battle Mode — Multi-Engine Comparison

**Files:**
- Modify: `components/CreatePage.tsx` (prompt bar + new battle state + results grid)

**Step 1: Add battle mode state**

```typescript
const [battleMode, setBattleMode] = useState(false);
const [battleEngines, setBattleEngines] = useState<Set<string>>(new Set());
const [battleResults, setBattleResults] = useState<GeneratedContent[]>([]);
const [showBattleSelector, setShowBattleSelector] = useState(false);
```

**Step 2: Add "Compare" button in prompt bar** (next to Generate button)

```typescript
<button
  onClick={() => setShowBattleSelector(!showBattleSelector)}
  className="flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium transition-all"
  style={{
    background: battleMode ? 'rgba(34,211,238,0.15)' : 'transparent',
    border: `1px solid ${battleMode ? '#22D3EE' : '#2A1F1C'}`,
    color: battleMode ? '#22D3EE' : '#6B5A56'
  }}
>
  <GitCompareArrows className="w-3.5 h-3.5" />
  Battle
</button>
```

**Step 3: Add engine selector popover** (above the Compare button when `showBattleSelector`)

```typescript
{showBattleSelector && (
  <div className="absolute bottom-full mb-2 right-0 p-3 rounded-xl w-64" style={{ background: '#111010', border: '1px solid #2A1F1C', zIndex: 50 }}>
    <div className="text-[10px] font-jet uppercase tracking-wider mb-2" style={{ color: '#22D3EE' }}>
      Select 2-4 engines to compare
    </div>
    {ALL_MODELS.filter(m => m.section !== 'video').map(m => (
      <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
        style={{ color: battleEngines.has(m.id) ? '#22D3EE' : '#6B5A56' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.04)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
        <input type="checkbox" checked={battleEngines.has(m.id)}
          onChange={() => {
            const next = new Set(battleEngines);
            if (next.has(m.id)) next.delete(m.id);
            else if (next.size < 4) next.add(m.id);
            setBattleEngines(next);
          }}
          className="accent-cyan-400" />
        <span className="text-xs">{m.icon} {m.name}</span>
        <span className="text-[9px] ml-auto" style={{ color: '#FFB347' }}>⚡{m.creditCost}</span>
      </label>
    ))}
    <button
      onClick={() => {
        if (battleEngines.size >= 2) {
          setBattleMode(true);
          setShowBattleSelector(false);
          // Trigger generation for each engine
          // This will need integration with useGeneration to fire multiple times
        }
      }}
      disabled={battleEngines.size < 2}
      className="w-full mt-2 py-2 rounded-xl text-xs font-bold text-black disabled:opacity-40"
      style={{ background: '#22D3EE' }}>
      Battle ({battleEngines.size} engines)
    </button>
  </div>
)}
```

**Step 4: Add battle results grid** (rendered above normal gallery when battle results exist)

```typescript
{battleResults.length > 0 && (
  <div className="p-3 border-b" style={{ borderColor: '#2A1F1C' }}>
    <div className="flex items-center gap-2 mb-2">
      <GitCompareArrows className="w-4 h-4" style={{ color: '#22D3EE' }} />
      <span className="text-xs font-bold" style={{ color: '#22D3EE' }}>Battle Results</span>
      <button onClick={() => setBattleResults([])} className="ml-auto text-[10px]" style={{ color: '#4A3A36' }}>Clear</button>
    </div>
    <div className={`grid gap-2 ${battleResults.length === 2 ? 'grid-cols-2' : battleResults.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {battleResults.map(item => (
        <div key={item.id} className="relative rounded-xl overflow-hidden group">
          <img src={item.url} alt="" className="w-full" />
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <span className="text-[9px] font-jet font-bold" style={{ color: '#22D3EE' }}>
              {item.aiProvider}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

**Note:** The actual multi-engine generation firing needs integration with `useGeneration.ts`. For this task, the UI and state management are built. The generation hook can be called in sequence (one engine at a time) by temporarily switching the engine, calling `handleGenerate()`, and restoring. This integration is a follow-up step.

**Step 5: Verify build**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: battle mode UI — multi-engine comparison selector and results grid"
```

---

## Task 11: Selection Mode + Batch Toolbar

**Files:**
- Modify: `components/CreatePage.tsx`

**Step 1: Add selection state**

```typescript
const [isSelectionMode, setIsSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const toggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
};

const clearSelection = () => {
  setSelectedIds(new Set());
  setIsSelectionMode(false);
};
```

**Step 2: Add selection checkbox to each gallery card**

Inside the masonry grid item wrapper, add:

```typescript
{/* Selection checkbox */}
<div className={`absolute top-1 left-1 z-20 transition-all ${isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (!isSelectionMode) setIsSelectionMode(true);
      toggleSelect(item.id);
    }}
    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shadow-lg ${
      selectedIds.has(item.id) ? 'border-cyan-400' : 'bg-black/60 border-white/40 hover:bg-black/80'
    }`}
    style={selectedIds.has(item.id) ? { background: '#22D3EE', borderColor: '#22D3EE' } : {}}
  >
    {selectedIds.has(item.id) && <Check className="w-3 h-3 text-black" />}
  </button>
</div>
```

**Step 3: Add batch toolbar** (above filter bar, shown when isSelectionMode)

```typescript
{isSelectionMode && (
  <div className="sticky top-0 z-30 flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(13,10,10,0.95)', borderBottom: '1px solid #2A1F1C' }}>
    <span className="text-xs font-semibold text-white tabular-nums">{selectedIds.size} selected</span>
    <button onClick={clearSelection} className="text-[11px] underline underline-offset-2" style={{ color: '#6B5A56' }}>Clear</button>
    <div className="flex-1" />
    {selectedIds.size === 2 && (
      <button onClick={() => {
        const items = displayItems.filter(i => selectedIds.has(i.id));
        if (items.length === 2) setCompareItems([items[0], items[1]]);
      }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium"
        style={{ background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', color: '#22D3EE' }}>
        <GitCompareArrows className="w-3 h-3" /> Compare
      </button>
    )}
    <button onClick={() => {
      displayItems.filter(i => selectedIds.has(i.id)).forEach(i => onDownload(i));
      clearSelection();
    }}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium"
      style={{ background: '#1A1210', border: '1px solid #2A1F1C', color: '#D4C8C4' }}>
      <Download className="w-3 h-3" /> Download {selectedIds.size}
    </button>
  </div>
)}
```

**Step 4: Add `Check` to Lucide imports**

**Step 5: Verify build**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add components/CreatePage.tsx
git commit -m "feat: gallery selection mode with batch toolbar — compare, download"
```

---

## Task 12: Final Integration Test + Polish

**Step 1: Full build check**

```bash
npx tsc --noEmit && npm run build
```

Expected: Zero errors, build succeeds.

**Step 2: Visual review**

Start dev server (`npm run dev`) and test:
- [ ] Hover on gallery image shows 6 action buttons
- [ ] "More" button opens context menu with all tools
- [ ] AI Edit opens prompt overlay (not filter editor)
- [ ] Compare slider works (from More menu + batch toolbar)
- [ ] Generate button has Wand2 icon + cyan credit badge + pulse glow
- [ ] Gallery images have cyan hover glow
- [ ] Engine badges are colored by category
- [ ] Filter bar (All/Images/Video/Favorites) works
- [ ] Gallery resizes via drag handle
- [ ] Scene panel has photo upload slot
- [ ] Battle mode selector opens and shows engines
- [ ] Selection mode works (Ctrl+click → batch toolbar)
- [ ] Panels have gradient backgrounds
- [ ] Staggered fade-in on gallery images

**Step 3: Final commit**

```bash
git add -A
git commit -m "polish: final integration — visual soul + full gallery feature parity"
```
