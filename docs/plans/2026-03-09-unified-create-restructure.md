# Unified "Create" + Navigation Restructure — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge Freestyle and Director into a single "Create" experience with progressive disclosure, reduce navigation from 6 to 4 items (Home, Create, Library, Tools), and move Storyboard into Library as a tab.

**Architecture:** The current app has two separate generation flows (GeneratorPage for text-to-image, DirectorStudio for character-consistent generation) that confuse users. We unify them into a single "Create" page built on GeneratorPage's centered prompt bar with optional toggle pills (Face, Outfit, Scene) that reveal Director's capabilities progressively. DirectorStudio becomes a set of panel components imported by the new CreatePage. The router, navigation, and URL scheme all simplify accordingly.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, existing FormContext/GalleryContext

---

## Phase Overview

| Phase | What | Files | Risk |
|-------|------|-------|------|
| 1 | Navigation 6→4 + route remapping | App.tsx | Low — cosmetic, no logic changes |
| 2 | Storyboard → Library tab | CharactersPage.tsx | Low — just add a tab |
| 3 | Tools as dedicated page | New: ToolsPage.tsx, App.tsx | Low — extract from ExplorePage |
| 4 | Unified CreatePage | New: CreatePage.tsx, App.tsx | High — core product change |
| 5 | Cleanup + QA | Remove dead code, verify all routes | Medium |

---

## Task 1: Navigation Restructure (App.tsx)

**Files:**
- Modify: `App.tsx` — workspace type, PATH_TO_WORKSPACE, nav arrays, mobile nav, page meta

**Step 1: Update AppWorkspace type and route map**

Change the workspace type from 7 items to 5:

```typescript
// Line ~85
type AppWorkspace = "home" | "create" | "characters" | "tools" | "pricing" | "profile";
```

Update PATH_TO_WORKSPACE:
```typescript
const PATH_TO_WORKSPACE: Record<string, AppWorkspace> = {
  '/': 'home', '/home': 'home', '/explore': 'home',
  '/create': 'create', '/generate': 'create', '/director': 'create',
  '/characters': 'characters', '/library': 'characters',
  '/storyboard': 'characters',  // redirect to library
  '/tools': 'tools',
  '/pricing': 'pricing', '/profile': 'profile',
  '/login': 'create', '/register': 'create',
};
```

Update setActiveWorkspace path mapping:
```typescript
const setActiveWorkspace = React.useCallback((ws: AppWorkspace) => {
  _setActiveWorkspace(ws);
  const wsPath = ws === 'home' ? '/' : `/${ws}`;
  if (window.location.pathname !== wsPath) {
    window.history.pushState({}, '', wsPath);
  }
}, []);
```

**Step 2: Update desktop navigation (4 main items)**

```typescript
// Line ~1016 — replace the nav array
{(["home", "create", "characters", "tools"] as const).map((ws) => {
  const TAB_LABELS: Record<string, string> = {
    home: "Home", create: "Create", characters: "Library", tools: "Tools",
  };
  const TAB_TIPS: Record<string, string> = {
    home: "Home & inspiration",
    create: "Generate images & video",
    characters: "Characters & gallery",
    tools: "Try-On, Face Swap & more",
  };
  // ... rest stays the same
```

Remove TAB_BADGES (no more "New" badge on Director — it's gone).

**Step 3: Update mobile bottom nav (4 items)**

```typescript
// Line ~1183 — replace mobile nav array
{([
  { ws: 'home' as const,       icon: <HomeIcon />,    label: 'Home' },
  { ws: 'create' as const,     icon: <SparklesIcon />, label: 'Create' },
  { ws: 'characters' as const, icon: <UsersIcon />,   label: 'Library' },
  { ws: 'tools' as const,      icon: <WrenchIcon />,  label: 'Tools' },
]).map(({ ws, icon, label }) => {
```

Pricing moves to profile dropdown only. Mobile nav goes from 6→4.

**Step 4: Update PAGE_META**

```typescript
const PAGE_META: Record<AppWorkspace, { title: string; description: string }> = {
  home:       { title: 'VIST Studio — AI Character & Image Generator', description: '...' },
  create:     { title: 'Create — VIST Studio', description: 'Generate AI images and videos with 10+ engines. Prompt-first with optional face, outfit, and scene control.' },
  characters: { title: 'Library — VIST Studio', description: 'Manage AI characters, browse images, and plan storyboards.' },
  tools:      { title: 'AI Tools — VIST Studio', description: 'Try-On, Face Swap, Relight, Upscale, and more AI tools.' },
  pricing:    { title: 'Plans & Pricing — VIST Studio', description: '...' },
  profile:    { title: 'Profile — VIST Studio', description: '...' },
};
```

**Step 5: Update workspace router**

Replace the 7 workspace conditional blocks with 6 (removing separate generate/director):
- `home` → renders ExplorePage (renamed from explore)
- `create` → renders CreatePage (new unified component — Phase 4)
- `characters` → renders CharactersPage (with Storyboard tab — Phase 2)
- `tools` → renders ToolsPage (new — Phase 3)
- `pricing` → PricingPage
- `profile` → ProfilePage

**TEMPORARY for this task:** `create` still renders GeneratorPage until Phase 4.

**Step 6: Update PUBLIC_WORKSPACES**

```typescript
const PUBLIC_WORKSPACES: AppWorkspace[] = ['home', 'pricing'];
```

**Step 7: Update all internal navigation references**

Search for `setActiveWorkspace("explore")` → `setActiveWorkspace("home")`
Search for `setActiveWorkspace("generate")` → `setActiveWorkspace("create")`
Search for `setActiveWorkspace("director")` → `setActiveWorkspace("create")`
Search for `setActiveWorkspace("storyboard")` → `setActiveWorkspace("characters")`

Also update `handleExploreNavigate` to map old workspace names.

**Step 8: Verify and commit**

Run: `npx tsc --noEmit && npm run build`
Expected: Zero errors, successful build

```bash
git add App.tsx
git commit -m "feat: restructure navigation 6→4 (Home, Create, Library, Tools)"
```

---

## Task 2: Storyboard → Library Tab (CharactersPage.tsx)

**Files:**
- Modify: `CharactersPage.tsx` — add 'storyboard' to LibraryTab, render StoryboardView
- Modify: `App.tsx` — remove storyboard workspace block, pass storyboardIds to CharactersPage

**Step 1: Add storyboard tab to CharactersPage**

```typescript
// CharactersPage.tsx ~line 381
type LibraryTab = 'characters' | 'images' | 'storyboard';

// ~line 476 — add tab entry
{ key: 'storyboard' as LibraryTab, label: 'Storyboard', icon: LayoutGrid, count: storyboardCount },
```

**Step 2: Render StoryboardView inside the tab**

```typescript
// After the images tab block (~line 590)
{activeTab === 'storyboard' && (
  <div className="flex-1 overflow-y-auto p-6">
    {storyboardCount > 0 ? (
      <StoryboardView />
    ) : (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-zinc-500 text-sm mb-4">Add images from Create to build your storyboard</p>
        <button onClick={() => onNavigate?.('create')} className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #FF5C35, #FFB347)' }}>
          Start Creating
        </button>
      </div>
    )}
  </div>
)}
```

**Step 3: Add props for storyboard count and navigation**

```typescript
interface CharactersPageProps {
  onLoadCharacter: (char: SavedCharacter) => void;
  onNewCharacter?: () => void;
  onNavigate?: (ws: string) => void;  // NEW
  storyboardCount?: number;           // NEW
}
```

**Step 4: Update App.tsx to pass new props and remove storyboard workspace block**

Remove the entire `{activeWorkspace === "storyboard" && ...}` block.
Add props to CharactersPage:
```typescript
<CharactersPage
  onLoadCharacter={handleLoadCharacterInDirector}
  onNewCharacter={() => setActiveWorkspace("create")}
  onNavigate={(ws) => setActiveWorkspace(ws as AppWorkspace)}
  storyboardCount={gallery.storyboardIds.length}
/>
```

**Step 5: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add CharactersPage.tsx App.tsx
git commit -m "feat: move Storyboard into Library as third tab"
```

---

## Task 3: Tools as Dedicated Page (ToolsPage.tsx)

**Files:**
- Create: `components/ToolsPage.tsx` — extract tool cards from ExplorePage
- Modify: `App.tsx` — add tools workspace rendering
- Modify: `ExplorePage.tsx` — remove AI Tools section (optional, can keep as preview)

**Step 1: Create ToolsPage.tsx**

Extract the 7 AI tool cards (Try-On, Face Swap, Relight, Skin Enhancer, Inpainting, Upscale, Pose Change) from ExplorePage into a dedicated page. Each card is a button that opens the corresponding modal.

```typescript
interface ToolsPageProps {
  onTryOn: () => void;
  onFaceSwap: () => void;
  onRelight: () => void;
  onSkinEnhance: () => void;
  onInpaint: () => void;
  onUpscale: () => void;
  onPoseChange: () => void;
}
```

Layout: grid of tool cards, each with:
- Icon + Name
- 1-line description ("Upload a photo → get a try-on result")
- Credit cost badge
- "Try it" button

**Step 2: Add to App.tsx workspace router**

```typescript
{activeWorkspace === "tools" && (
  <div className="absolute inset-0 z-0 overflow-hidden">
    <ToolsPage
      onTryOn={() => setTryOnItem(placeholderItem)}
      onFaceSwap={() => setFaceSwapItem(placeholderItem)}
      ... etc
    />
  </div>
)}
```

Note: Tools need a source image. The ToolsPage should let users upload an image first, then apply the tool. Each tool card opens with its own upload step.

**Step 3: Verify and commit**

```bash
git add components/ToolsPage.tsx App.tsx
git commit -m "feat: add dedicated Tools page with 7 AI tools"
```

---

## Task 4: Unified CreatePage (THE CORE CHANGE)

**Files:**
- Create: `components/CreatePage.tsx` — unified generation page
- Modify: `App.tsx` — swap GeneratorPage/DirectorStudio for CreatePage
- Keep: `components/GeneratorPage.tsx` and `components/DirectorStudio.tsx` as reference (delete in Phase 5)

**Step 1: Design the CreatePage layout**

```
┌─────────────────────────────────────────────┐
│                                             │
│         [Gallery of results]                │
│         (masonry grid, from GalleryContext)  │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Prompt Bar (centered, max-w-2xl) ─────┐│
│  │ "Describe what you want to create..."   ││
│  │                                         ││
│  │ 📷 @2ref  👔 Streetwear  🎬 Studio     ││
│  │                        [Generate ⚡2]   ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Auto ⚡2] [3:4] [1:1] [4:3] [⚙]         │
└─────────────────────────────────────────────┘
```

**The 4 toggle pills (inside prompt bar, bottom row):**

1. **📷 Face** — toggle. Off by default. Click → expands a mini-panel ABOVE the prompt bar:
   - 3 face upload slots (from DirectorStudio's Identity section)
   - When face is uploaded: pill shows `📷 @2 ref` in orange
   - Auto-selects FLUX Kontext if Auto mode is on

2. **👔 Outfit** — toggle. Off by default. Click → expands mini-panel:
   - Outfit image upload + text description (from DirectorStudio's Costume section)
   - When set: pill shows `👔 Streetwear` in orange

3. **🎬 Scene** — toggle. Off by default. Click → expands mini-panel:
   - Lighting presets (6 options from Director)
   - Camera presets (6 options from Director)
   - Scene text description
   - When set: pill shows `🎬 Studio` in orange

4. **⚡ Engine** — already exists as the engine chip below prompt bar

**Step 2: Build CreatePage component structure**

```typescript
// components/CreatePage.tsx
const CreatePage: React.FC<CreatePageProps> = (props) => {
  const form = useForm();
  const gallery = useGallery();

  // Panel visibility state
  const [showFacePanel, setShowFacePanel] = useState(false);
  const [showOutfitPanel, setShowOutfitPanel] = useState(false);
  const [showScenePanel, setShowScenePanel] = useState(false);

  // Derived state for pill labels
  const char0 = form.characters[0];
  const hasFace = (char0?.modelImages?.length ?? 0) > 0;
  const hasOutfit = !!(char0?.outfitDescription?.trim()) || (char0?.outfitImages?.length ?? 0) > 0;
  const hasScene = !!form.lighting || !!form.camera || !!form.scenario?.trim();

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0D0A0A' }}>
      {/* Gallery area */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty state with prompt suggestions (from GeneratorPage) */}
        {/* OR masonry grid of results */}
      </div>

      {/* Expandable panels (above prompt bar) */}
      {showFacePanel && <FacePanel />}
      {showOutfitPanel && <OutfitPanel />}
      {showScenePanel && <ScenePanel />}

      {/* Centered prompt bar */}
      <div className="flex-none px-4 py-3" style={{ background: 'linear-gradient(...)' }}>
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Prompt input container */}
          <div className="relative rounded-2xl" style={{ ... }}>
            <div className="px-4 pt-3 pb-2">
              <AutocompleteInput ... />
            </div>

            {/* Bottom row: pills + generate button */}
            <div className="flex items-center gap-2 px-3 pb-3">
              <TogglePill active={hasFace} icon="📷" label={hasFace ? `@${char0.modelImages.length} ref` : 'Face'}
                onClick={() => setShowFacePanel(!showFacePanel)} />
              <TogglePill active={hasOutfit} icon="👔" label={hasOutfit ? 'Outfit' : 'Outfit'}
                onClick={() => setShowOutfitPanel(!showOutfitPanel)} />
              <TogglePill active={hasScene} icon="🎬" label={hasScene ? 'Scene' : 'Scene'}
                onClick={() => setShowScenePanel(!showScenePanel)} />

              <div className="flex-1" />
              <GenerateButton ... />
            </div>
          </div>

          {/* Controls row: engine chip + aspect ratio + settings */}
          <div className="flex items-center gap-1.5 justify-center">
            <EngineChip />
            <AspectRatioPills />
            <SettingsGear />
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Step 3: Extract panel components from DirectorStudio**

- **FacePanel**: Extract the Identity section (3 face slots + "Add details" toggle with CharacteristicsInput). Compact horizontal layout that slides down above prompt bar.
- **OutfitPanel**: Extract Costume section (outfit image upload + text description).
- **ScenePanel**: Extract Lighting grid + Camera grid + Scene textarea. Compact 2-column layout.

Each panel: `max-w-2xl mx-auto`, appears between gallery and prompt bar with slide-down animation.

**Step 4: Migrate gallery rendering from GeneratorPage**

Copy the masonry grid, session/history tabs, lightbox, hover actions, and empty state from GeneratorPage. The gallery logic is identical — it reads from `gallery.generatedHistory`.

**Step 5: Migrate Director-specific features**

The Director has additional modes (Poses, AI Edit, Photo Session) beyond Create. These become accessible via the settings gear → "Advanced" section, or as action buttons on generated images (Edit, Change Pose). They don't need dedicated tabs in the unified view.

- **AI Edit**: accessible via image hover → "Edit" button (opens the edit flow)
- **Pose Change**: accessible via image hover → "Change Pose" button
- **Photo Session**: accessible via settings gear → "Photo Session" option

**Step 6: Wire up in App.tsx**

```typescript
const CreatePage = lazy(() => import("./components/CreatePage"));

// In workspace router:
{activeWorkspace === "create" && (
  <CreatePage
    isGenerating={isGenerating}
    progress={progress}
    onGenerate={handleGenerate}
    onStopGeneration={stopGeneration}
    onDownload={handleDownload}
    onReuse={handleReuse}
    onUpscale={handleUpscale}
    onEdit={(item) => gallery.setEditingItem(item)}
    onChangePose={handleChangePose}
    onCaption={(item) => setCaptionItem(item)}
    onFaceSwap={(item) => setFaceSwapItem(item)}
    onTryOn={(item) => setTryOnItem(item)}
    onRelight={(item) => setRelightItem(item)}
    onInpaint={(item) => setInpaintItem(item)}
    onAddToStoryboard={handleAddToStoryboard}
  />
)}
```

**Step 7: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add components/CreatePage.tsx App.tsx
git commit -m "feat: unified Create page with progressive disclosure pills"
```

---

## Task 5: Cleanup + Polish

**Files:**
- Modify: `App.tsx` — remove dead imports
- Modify: `ExplorePage.tsx` — update CTAs that reference "Freestyle" or "Director"
- Modify: `WelcomeModal.tsx` — update onboarding to reference "Create" instead of Freestyle/Director
- Verify: all `setActiveWorkspace("generate")` and `setActiveWorkspace("director")` calls replaced

**Step 1: Update ExplorePage CTAs**

- "Open Freestyle" → "Start Creating"
- "Open Director" → "Start Creating"
- Feature cards: merge "Freestyle" and "Director Studio" into single "Create" card
- Video Generation card → points to `/create` with video mode

**Step 2: Update WelcomeModal onboarding**

Simplify from 3 slides (Freestyle, Director, Library) to 2 slides (Create, Library/Tools).

**Step 3: Remove dead GeneratorPage/DirectorStudio workspace blocks**

Keep the component files for reference but remove their workspace conditionals from App.tsx.

**Step 4: Full QA audit**

Deploy and run Playwright QA:
- All 4 nav items work (Home, Create, Library, Tools)
- `/generate` and `/director` URLs redirect to `/create`
- `/storyboard` redirects to `/characters`
- Face/Outfit/Scene pills toggle correctly
- Generation works with and without face reference
- Mobile 4-tab nav works
- All tools accessible from Tools page

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: cleanup dead code, update CTAs and onboarding for unified Create"
```

---

## Migration Safety

| Old URL | New URL | Behavior |
|---------|---------|----------|
| `/` | `/` | Home (unchanged) |
| `/explore` | `/` | Redirects to Home |
| `/generate` | `/create` | Maps to Create |
| `/director` | `/create` | Maps to Create |
| `/characters` | `/characters` | Library (unchanged) |
| `/library` | `/characters` | Maps to Library |
| `/storyboard` | `/characters` | Maps to Library (storyboard tab) |
| `/pricing` | `/pricing` | Pricing (unchanged, via profile dropdown) |
| `/tools` | `/tools` | NEW — Tools page |

All old URLs continue to work via PATH_TO_WORKSPACE mapping. No broken links.

## What We're NOT Changing

- FormContext — all form state stays identical
- GalleryContext — gallery logic unchanged
- useGeneration hook — generation orchestrator untouched
- Credits system — no changes
- API proxies — no changes
- Backend services — no changes
- Types — no changes
