# Figma vs Implementation Gap Audit

**Date:** 2026-03-09
**Auditor:** Claude (automated visual audit)
**Scope:** Dashboard, Create Character, Studio Editor, Gallery

---

## 1. SIDEBAR NAVIGATION (SidebarNav.tsx)

### What Figma shows
- 4 nav items: Dashboard, Crear Personaje (Create Character), Studio Editor, Galeria (Gallery)
- NO "Photo Session" as a separate nav item
- Logo reads "Virtual Influencer / Studio AI"
- Purple accent color on active state (we use coral -- intentional deviation)
- Notification bell icon next to profile in footer
- Plan badge shows "3 generaciones restantes hoy" (generations remaining today)

### What is implemented
- 5 nav items: Dashboard, Create Character, **Photo Session**, Studio Editor, Gallery
- Logo reads "VIST Studio"
- Coral accent on active state (correct per design decision)
- No notification bell icon
- Plan badge shows credits remaining (not generations)

### Gaps

| # | Gap | Figma | Current | Priority |
|---|-----|-------|---------|----------|
| NAV-001 | Photo Session is a separate nav item not in Figma | Not present in sidebar | Separate nav item | P1 -- consider merging into Studio Editor as a tool, or removing from nav |
| NAV-002 | Missing notification bell icon | Bell icon in profile footer area | No bell icon | P2 |
| NAV-003 | Plan badge wording mismatch | "3 generaciones restantes hoy" (daily generation count) | "X credits remaining" | P2 -- keep credits (our model), but consider adding daily generation context |

---

## 2. DASHBOARD (DashboardPage.tsx)

### What Figma shows (175330.png, 175358.png)

**Hero section:**
- Badge "AI-Powered Studio" with sparkle icon
- Title "Bienvenido al Studio" (Welcome to the Studio)
- Subtitle text about creating virtual influencers
- Two CTA buttons side by side: "Nuevo Personaje IA / Genera con prompt" and "Abrir Studio / Edita tu influencer"
- Both buttons use purple gradient backgrounds (we use coral -- intentional)

**Stats cards (4 across):**
- Characters Created (icon: people, purple bg)
- Renders Generated (icon: lightning, orange bg)
- Avg Engagement with percentage (icon: trend, blue bg)
- Active Projects / Trained Models (icon: star, orange bg)
- Each card has a colored icon in a rounded pill/square, large number, label below

**Recent Projects section:**
- "Proyectos Recientes" header with "Ver todos ->" link
- 3 project cards in a horizontal row
- Each card: large thumbnail (aspect ~16:9), status badge top-right ("Activo", "En edicion"), character name, niche label, follower count, engagement %, "Editar ->" link
- A "+" card (Nuevo Personaje / Empieza con IA) with dashed border
- **Heart/favorite icon** on each card top-right area

**Studio Tools section:**
- "Herramientas del Studio" header
- 6 tool cards in a row: Editor de Poses, Face Swap, Relight, Camaras, Objetos, Escenarios
- Each has a colored emoji/icon and label

### What is implemented (DashboardPage.tsx)

**Hero:** Matches well -- badge, title, subtitle, two CTA buttons. Layout is correct.

**Stats cards:** 4 cards across, matching structure. Labels differ slightly (English vs Spanish -- expected).

**Recent Projects:** 3 cards shown, with thumbnail, status badge, name, description, usage count, date, and "Edit ->" link.

**Studio Tools:** 6 tool cards in a grid. Labels match the tools.

### Gaps

| # | Gap | Figma | Current | Priority |
|---|-----|-------|---------|----------|
| DASH-001 | Recent project cards missing social metrics | Each card shows followers (2.4M), engagement (8.2%), and "Editar ->" | Cards show usage count and date, no followers/engagement | P1 -- important for the "influencer management" positioning |
| DASH-002 | Recent project cards missing niche label | Cards show niche below name (e.g. "Influencer de Moda", "Tech & Gaming") | Cards show truncated characteristics text | P1 |
| DASH-003 | Recent project cards missing heart/favorite icon | Heart icon in top-right corner of each card | No favorite functionality | P2 |
| DASH-004 | Missing "New Character" CTA card in recent projects grid | A dashed-border card "Nuevo Personaje / Empieza con IA" appears as 4th item | Not present -- only 3 recent character cards shown | P1 |
| DASH-005 | Card thumbnail aspect ratio differs | Figma uses ~16:9 aspect for thumbnails (landscape) | Implementation uses 4:3 aspect | P2 |
| DASH-006 | Stats card -- 4th stat label mismatch | Figma shows "Proyectos Activos" (Active Projects) as 4th stat | Implementation shows "Trained Models" count | P2 -- consider changing to "Active Projects" for broader appeal |
| DASH-007 | Stats card icons use colored circle backgrounds | Figma icons have vivid colored rounded-square backgrounds (purple, orange, blue, orange) | Implementation has subtle tinted backgrounds (`${color}15`) | P2 -- Figma backgrounds are more saturated and prominent |
| DASH-008 | CTA buttons style difference | Figma: both buttons have solid purple gradient fills, second button is slightly different shade | Implementation: first button has coral gradient, second has ghost/outline style | P1 -- the "Open Studio" button should be more visually prominent (currently too subtle) |

---

## 3. CREATE CHARACTER (CharacterBuilderPage.tsx)

### What Figma shows (175516-175750.png)

**Layout:**
- Left panel (~40% width): wizard form with scrollable content
- Right panel (~60% width): Preview area with character placeholder, "Regenerar" button, and 3 example thumbnails at bottom
- Divider line between panels

**Step indicator (breadcrumb):**
- Horizontal breadcrumb: Estilo > Apariencia > Personalidad > (Niche icon)
- Completed steps show green checkmark + green text
- Current step has a pill/badge background (purple in Figma)
- Future steps are dimmed

**Step 1 - Style:**
- Character Name input field
- Visual Style grid: 2 columns, 6 cards (Realista, Anime, 3D CGI, Cartoon, Cyberpunk, Fantasia)
- Each card: icon, name, description
- Selected card has purple border (we use coral -- intentional)
- "Siguiente >" (Next) button at bottom, full width, purple gradient

**Step 2 - Appearance:**
- Age slider with value display ("Edad: 24 anos")
- Ethnicity chips (Latina, Asiatica, Europea, Africana, Arabe, Mixta)
- Hair Color chips
- Eye Color chips
- Body Type chips
- Selected chips: purple solid background with white text
- "Siguiente >" and "< Anterior" buttons

**Step 3 - Personality:**
- Personality chips in 2-column grid (Sofisticada, Juvenil, Misteriosa, Alegre, Rebelde, Elegante)
- Selected: purple background, white text
- "Descripcion adicional (opcional)" textarea
- Next + Previous buttons

**Step 4 - Niche:**
- Full-width list buttons: Moda & Lifestyle, Fitness & Salud, Tech & Gaming, Beauty & Makeup, Travel & Luxe, Musica & Arte
- Selected: purple background with checkmark
- "Generar con IA" (Generate with AI) button at bottom

**Preview panel (right side):**
- Header: "Mi Influencer -- Preview" with subtitle "realistic . Moda & Lifestyle"
- "Regenerar" button top-right
- Large dashed circle placeholder with person icon
- Text: "Configura tu personaje / Completa los pasos y presiona Generar"
- 3 small example character thumbnails below placeholder
- Summary chips below (style, ethnicity, etc.) -- matches implementation

### What is implemented (CharacterBuilderPage.tsx)

Layout is a close match: left wizard panel, right preview panel. Step indicator, all 4 steps, chip selections, and preview summary chips are all present.

### Gaps

| # | Gap | Figma | Current | Priority |
|---|-----|-------|---------|----------|
| CREATE-001 | Preview panel missing example thumbnails | 3 small character example thumbnails shown below the placeholder circle | No example thumbnails -- only summary chips shown | P1 -- these thumbnails help users understand what they'll get |
| CREATE-002 | Selected chip style differs | Figma: selected chips have solid purple (or coral in our case) background with WHITE text | Implementation: selected chips have semi-transparent coral background with coral text | P1 -- Figma's solid-fill approach has better visual contrast and clarity |
| CREATE-003 | Step indicator 4th step icon not visible | Figma shows a small target/crosshair icon for step 4 (Niche) in the breadcrumb | Implementation shows all 4 step labels but 4th may get cut off at certain widths | P2 |
| CREATE-004 | "Next" button gradient differs | Figma: purple/pink gradient, very saturated, full-width | Implementation: coral gradient, full-width -- matches our color system (OK) but may need bolder shadow | P2 |
| CREATE-005 | Preview header "Regenerar" button styling | Figma: outlined button with refresh icon, clearly positioned top-right | Implementation: has the button but styling is subtle (ghost button) | P2 |
| CREATE-006 | Age slider track color | Figma: blue/cyan gradient on the filled portion of the slider | Implementation: browser default accent-color coral | P2 |
| CREATE-007 | Left panel max-width constraint | Figma: left panel takes ~40% of space with clear vertical divider | Implementation: `max-w-[640px]` which may be wider than intended on large screens | P2 |

---

## 4. STUDIO EDITOR (NOT YET BUILT -- Full Figma Documentation)

The Studio Editor is the most complex page and is currently only a placeholder (renders CreatePage). This section fully documents the Figma design.

### Overall Layout (175807-180026.png)

**Three-column layout:**
1. **Left:** Sidebar nav (same as all pages) -- ~240px
2. **Center:** Canvas area with loaded character image -- flexible width
3. **Right:** Tool-specific properties panel -- ~280px

**Top toolbar (horizontal, above canvas):**
- Character selector dropdown: avatar + "Luna AI" + chevron
- Undo/Redo buttons (arrows)
- Zoom controls: magnifier icons + "100%" label
- Reset rotation button
- Layer controls (2 stacked squares icon)
- Resolution selector pills: "HI | SD | **HD** | 4K" (HD is default/active with filled background)
- Three action buttons right-aligned: "Preview" | "Compartir" (Share) | "Exportar" (Export, primary purple/coral CTA)

**Left tool strip (vertical, between sidebar and canvas):**
- 6 tool icons stacked vertically, each with icon + label below:
  1. Pose (person standing icon)
  2. Face Swap (two-people icon)
  3. Relight (sparkle/sun icon)
  4. Camera (camera icon)
  5. Objects (3D cube icon)
  6. Scenes (landscape icon)
- Active tool has highlighted background + label text
- Fullscreen toggle button (expand arrows) above the tool strip

**Canvas area (center):**
- Large character image displayed centered
- Dark background
- Image has subtle rounded border

**Bottom status bar (center, overlaid on canvas bottom):**
- Character avatar + "Luna AI" | "Realista" | green dot + "Listo" (Ready)
- Pill-shaped, semi-transparent dark background

### Tool Panel Details

#### 4a. Pose Tool (175807.png)

**Right panel header:** "Pose" with "AI" badge top-right

**PREDEFINED POSES section:**
- 6 pose buttons in 2 rows of 3:
  - Row 1: De pie (Standing), Sentada (Sitting), Caminando (Walking)
  - Row 2: Posando (Posing -- selected, purple bg), Corriendo (Running), Recostada (Leaning)
- Each button: icon + label, grid layout

**MANUAL ADJUSTMENT section:**
- 5 body part sliders, each with label + degree value:
  - Cabeza (Head): 0 deg
  - Hombros (Shoulders): 0 deg
  - Brazos (Arms): 45 deg
  - Cadera (Hips): 10 deg
  - Piernas (Legs): 0 deg
- Each has a horizontal slider with purple accent

**OPTIONS section** (partially visible at bottom)

#### 4b. Face Swap Tool (175850.png)

**Right panel header:** "Face Swap" with "AI" badge

**UPLOAD REFERENCE IMAGE section:**
- Dashed-border upload area with upload icon
- Text: "Arrastra o haz clic" (Drag or click)
- Subtext: "JPG, PNG - Max 10MB"

**FACE LIBRARY section:**
- 4 character face thumbnails in a row: Sofia, Luna, Nova, Kai
- Each thumbnail is circular with name below

**Blend Intensity slider:** "Intensidad de mezcla" -- 85%

**Toggle switches:**
- "Preservar expresion" (Preserve expression): ON
- "Ajustar iluminacion" (Adjust lighting): ON

**CTA button:** "Aplicar Face Swap" (Apply Face Swap) -- full-width purple

#### 4c. Relight Tool (175909.png)

**Right panel header:** "Relight" with "AI" badge

**LIGHT DIRECTION section:**
- Interactive 2D pad/canvas (dark area with a golden circle/dot)
- Position indicator: "X:50% Y:30%"
- User can drag the light source position

**AMBIENTS section:**
- 6 ambient preset buttons in 2 rows of 3:
  - Row 1: Golden Hour (orange dot), Studio (white dot), Neon (purple dot)
  - Row 2: Atardecer/Sunset (red dot), Luna/Moon (blue dot), Cinematico (gray-blue dot)
- Each button: colored circle + label

**Sliders:**
- Intensidad (Intensity): 75% -- orange accent
- Temperatura (K) (Temperature): 5500K -- blue accent
- Sombras (Shadows): 40% -- gray accent
- Luz ambiental (Ambient light): 20% (partially visible)

#### 4d. Camera Tool (175928.png, 175946.png)

**Right panel header:** "Camera" with "AI" badge

**LENSES section:**
- 6 lens preset buttons in 2 rows of 3:
  - Row 1: Retrato/Portrait (85mm f/1.8 -- selected, cyan border), Gran angular/Wide (24mm f/2.8)
  - Row 2: Primer plano/Close-up (50mm f/1.4), Cinematico/Cinematic (35mm f/2.0)
  - Row 3: Ojo de pez/Fisheye (12mm f/5.6), Tele (200mm f/4.0)
- Each button: icon + name + focal length info

**ANGLE section:**
- 5 angle chips: Nivel ojo (Eye level -- selected, orange), Bajo (Low), Elevado (High), Picado (High angle), Contrapicado (Low angle)

**Sliders:**
- Campo de vision (FOV): 50 deg -- blue accent
- Profundidad de campo (Depth of field): 3.5f -- blue accent
- Intensidad bokeh (Bokeh intensity): 60% -- purple accent
- Inclinacion/Tilt: 0 deg -- blue accent
- Rotacion/Roll: 0 deg -- purple accent

**Guide grid:** "Cuadricula guia" -- Off | 3x3 | 2x2

**CTA button:** "Aplicar Camera" (Apply Camera) -- full-width purple

#### 4e. Objects Tool (180006.png)

**Right panel header:** "Objetos" (Objects) with "AI" badge

**Search bar:** "Buscar objetos..." (Search objects)

**Category filter tabs:** Todos (All -- selected, orange), Accesorios, Ropa, Electronica
- Horizontal scrollbar below tabs

**OBJECTS (12) grid:**
- 3 columns of object cards, each with:
  - Icon/thumbnail
  - Object name
  - "+" button to add
- Items shown: Bolso Chanel (Chanel bag), Gafas de sol (Sunglasses), Sombrero (Hat), Collar (Necklace), Vestido Gucci (Gucci dress), Zapatos Louboutin (Louboutin shoes)
- More items below (scrollable)

**CTA button:** "Anadir 0 objetos" (Add 0 objects) -- full-width green/teal

#### 4f. Scenes Tool (180026.png)

**Right panel header:** "Escenas" (Scenes) with "AI" badge

**Top tabs:** Biblioteca (Library -- selected, orange), Generar IA (AI Generate), Subir (Upload)

**Search bar:** "Buscar escena..." (Search scene)

**Category filter tabs:** Todos (All -- selected, orange), Urbano, Naturaleza, Studio
- Horizontal scrollbar

**Scene cards grid (2 columns):**
- Each card: thumbnail image with overlay text (name + category)
- Scenes shown: Ciudad Neon (Neon City / Urbano), Playa Tropical (Tropical Beach / Naturaleza), Studio Blanco (White Studio / Studio), Skyline Nocturno (Night Skyline / Urbano), Apartamento Lux (Luxury Apartment / Interior), Abstracto Oscuro (Dark Abstract / Abstracto)

**Slider:** "Integracion del personaje" (Character integration): 80% -- orange accent

**CTA button:** "Aplicar Escena" (Apply Scene) -- full-width orange/coral

### Studio Editor Implementation Gaps

| # | Gap | Description | Priority |
|---|-----|-------------|----------|
| STUDIO-001 | Entire Studio Editor page needs to be built | Currently renders CreatePage as placeholder. Needs full 3-column layout: tool strip, canvas, properties panel | P0 -- critical |
| STUDIO-002 | Top toolbar not implemented | Character selector, undo/redo, zoom, resolution pills (SD/HD/4K), Preview/Share/Export buttons | P0 |
| STUDIO-003 | Left tool strip not implemented | Vertical strip with 6 tool icons (Pose, Face Swap, Relight, Camera, Objects, Scenes) | P0 |
| STUDIO-004 | Canvas area not implemented | Central image display area with character loaded, fullscreen toggle, bottom status bar | P0 |
| STUDIO-005 | Pose tool panel not implemented | Predefined poses grid (6 poses), manual body part adjustment sliders (5 sliders: head, shoulders, arms, hips, legs) | P0 |
| STUDIO-006 | Face Swap tool panel not implemented | Upload area, face library thumbnails (4 characters), blend intensity slider, preserve expression toggle, adjust lighting toggle | P0 |
| STUDIO-007 | Relight tool panel not implemented | Light direction 2D pad, 6 ambient presets, intensity/temperature/shadows/ambient sliders | P0 |
| STUDIO-008 | Camera tool panel not implemented | 6 lens presets with focal length info, 5 angle options, FOV/DOF/bokeh/tilt/roll sliders, guide grid selector | P0 |
| STUDIO-009 | Objects tool panel not implemented | Search bar, category filters, scrollable object grid with icons/names/add buttons, count CTA | P1 |
| STUDIO-010 | Scenes tool panel not implemented | Library/AI Generate/Upload tabs, search, category filters, scene thumbnail grid, character integration slider | P1 |
| STUDIO-011 | Bottom status bar not implemented | Character avatar + name + style + ready status pill at bottom of canvas | P1 |
| STUDIO-012 | Character selector dropdown not implemented | Top bar dropdown showing current character with avatar | P1 |

---

## 5. GALLERY (CharactersPage.tsx)

### What Figma shows (180052.png, 180109.png)

**Page header:**
- Title: "Galeria de Personajes" (Character Gallery)
- Subtitle: "6 personajes . 2 favoritos"
- Top-right CTA: "+ Nuevo Personaje" (New Character) button, purple/coral solid

**Search + filter bar:**
- Wide search input: "Buscar personajes..." (Search characters)
- Filter pills right of search: Todos (All -- selected, purple), Activo, En edicion, Borrador (Draft)
- Sort dropdown far right: "Mas recientes" (Most recent) with filter icon

**Featured character banner:**
- Full-width highlighted card for featured character
- Left: large character thumbnail
- Right: badges ("Destacado" star badge + "Activo" status badge), character name "Luna AI", niche "Realista . Moda & Lifestyle"
- Metrics: followers (2.4M), engagement (8.2%), views (18.2K)
- Subtle border/background differentiation

**Character card grid (5 columns):**
- Each card is tall (portrait aspect ~2:3 or 3:4)
- Overlay at bottom: character name + niche label
- Below image: followers count, engagement %, heart/likes count
- Category tags at very bottom: small pills (e.g. "Moda", "Lujo", "Gaming", "Tech")
- Status badge top-left: "Activo" (green), "Borrador" (purple)
- Heart icon + three-dots menu top-right
- The "+" new character card with dashed border is inline in the grid

### What is implemented (CharactersPage.tsx)

- Header with "Library" label and "Your Cast" title
- Tabs: Characters | Images | Storyboard
- Search bar + filter chips (All, Soul ID, Untrained)
- Character grid with thumbnail, name, usage count, date
- Soul ID training badges
- Image tab with separate grid

### Gaps

| # | Gap | Figma | Current | Priority |
|---|-----|-------|---------|----------|
| GAL-001 | Missing featured/highlighted character banner | Large featured character card at top with metrics | No featured character section | P1 |
| GAL-002 | Character cards missing social metrics | Cards show followers, engagement %, likes/hearts | Cards show usage count and date only | P1 |
| GAL-003 | Character cards missing niche/category tags | Bottom of each card has colored tag pills (e.g. "Moda", "Gaming") | No category tags | P1 |
| GAL-004 | Character cards missing status badges | Status badges (Activo, En edicion, Borrador) top-left of card | Only Soul ID training status badge shown | P1 |
| GAL-005 | Filter categories differ | Figma: Todos, Activo, En edicion, Borrador | Current: All, Soul ID, Untrained | P1 -- Figma filters align better with character lifecycle |
| GAL-006 | Missing sort dropdown | "Mas recientes" sort dropdown with icon | No sort functionality | P2 |
| GAL-007 | Card overlay style differs | Figma: name and niche are overlaid on the image bottom with gradient | Current: name and info are in a separate section below the image | P1 -- overlay style looks more premium |
| GAL-008 | Missing heart/favorite + three-dots menu on cards | Top-right of each card has heart + "..." icons | Current has rename + delete on hover (different UX) | P2 |
| GAL-009 | Missing "Images" and "Storyboard" tabs in Figma | Figma only shows a character gallery -- no separate tabs | Current has 3 tabs: Characters, Images, Storyboard | P2 -- implementation has MORE features than Figma; keep them but ensure character tab matches Figma design |
| GAL-010 | Page title differs | Figma: "Galeria de Personajes" (Character Gallery) -- bold, large | Current: "Your Cast" with "Library" label above | P2 |
| GAL-011 | Subtitle with counts | Figma: "6 personajes . 2 favoritos" | Current: no subtitle count | P2 |
| GAL-012 | Grid column count | Figma: 5 columns with wider cards | Current: up to 6 columns (responsive) | P2 |
| GAL-013 | Card image aspect with overlay info | Figma: taller cards with info overlaid on bottom of image gradient | Current: shorter thumbnails (3:4) with separate info row below | P1 |

---

## 6. SUMMARY TABLE BY PRIORITY

### P0 -- Critical (Must Build)

| ID | Page | Description |
|----|------|-------------|
| STUDIO-001 | Studio Editor | Entire page needs to be built (3-column layout) |
| STUDIO-002 | Studio Editor | Top toolbar (character selector, undo/redo, zoom, resolution, export) |
| STUDIO-003 | Studio Editor | Left vertical tool strip (6 tools) |
| STUDIO-004 | Studio Editor | Canvas area with character display + status bar |
| STUDIO-005 | Studio Editor | Pose tool panel (6 presets + 5 manual sliders) |
| STUDIO-006 | Studio Editor | Face Swap tool panel (upload, face library, blend, toggles) |
| STUDIO-007 | Studio Editor | Relight tool panel (light pad, ambients, 4 sliders) |
| STUDIO-008 | Studio Editor | Camera tool panel (lenses, angles, 5 sliders, grid) |

### P1 -- Important (High Value)

| ID | Page | Description |
|----|------|-------------|
| NAV-001 | Sidebar | Photo Session nav item not in Figma -- consider removing/merging |
| DASH-001 | Dashboard | Recent project cards: add followers + engagement metrics |
| DASH-002 | Dashboard | Recent project cards: add niche label |
| DASH-004 | Dashboard | Add "New Character" CTA card in recent projects grid |
| DASH-008 | Dashboard | "Open Studio" button too subtle vs Figma's solid fill |
| CREATE-001 | Create Character | Preview panel: add example thumbnails below placeholder |
| CREATE-002 | Create Character | Selected chips: use solid coral bg + white text (not tinted bg + coral text) |
| STUDIO-009 | Studio Editor | Objects tool panel |
| STUDIO-010 | Studio Editor | Scenes tool panel |
| STUDIO-011 | Studio Editor | Bottom status bar on canvas |
| STUDIO-012 | Studio Editor | Character selector dropdown |
| GAL-001 | Gallery | Add featured character banner |
| GAL-002 | Gallery | Character cards: add social metrics (followers, engagement, likes) |
| GAL-003 | Gallery | Character cards: add niche/category tag pills |
| GAL-004 | Gallery | Character cards: add status badges (Active, Editing, Draft) |
| GAL-005 | Gallery | Align filter categories with Figma (All, Active, Editing, Draft) |
| GAL-007 | Gallery | Card overlay style: name/niche overlaid on image with gradient |
| GAL-013 | Gallery | Taller card aspect with info overlay instead of separate row |

### P2 -- Nice to Have

| ID | Page | Description |
|----|------|-------------|
| NAV-002 | Sidebar | Add notification bell icon |
| NAV-003 | Sidebar | Plan badge: consider showing daily generation count |
| DASH-003 | Dashboard | Heart/favorite icon on project cards |
| DASH-005 | Dashboard | Card thumbnail aspect ratio (16:9 vs 4:3) |
| DASH-006 | Dashboard | 4th stat: "Active Projects" vs "Trained Models" |
| DASH-007 | Dashboard | Stats card icon backgrounds more saturated |
| CREATE-003 | Create Character | Step indicator 4th icon visibility |
| CREATE-004 | Create Character | Next button shadow/depth |
| CREATE-005 | Create Character | Regenerate button styling |
| CREATE-006 | Create Character | Age slider track color |
| CREATE-007 | Create Character | Left panel max-width tuning |
| GAL-006 | Gallery | Add sort dropdown |
| GAL-008 | Gallery | Heart + three-dots menu on cards |
| GAL-009 | Gallery | Keep extra tabs (Images, Storyboard) but not in Figma |
| GAL-010 | Gallery | Page title alignment |
| GAL-011 | Gallery | Subtitle with character + favorite counts |
| GAL-012 | Gallery | Grid column count tuning |

---

## 7. RECOMMENDED IMPLEMENTATION ORDER

1. **Studio Editor** (STUDIO-001 through STUDIO-008) -- This is the largest gap and the core product feature. Build the shell layout first (3-column + tool strip + canvas), then implement tool panels one at a time.

2. **Gallery redesign** (GAL-001, GAL-002, GAL-003, GAL-004, GAL-005, GAL-007, GAL-013) -- The card redesign with overlaid info, metrics, and status badges will significantly elevate the page.

3. **Dashboard refinements** (DASH-001, DASH-002, DASH-004, DASH-008) -- Adding social metrics and the "new character" CTA card.

4. **Create Character polish** (CREATE-001, CREATE-002) -- Example thumbnails and chip styling.

5. **Nav cleanup** (NAV-001) -- Decide on Photo Session placement.

---

## 8. KEY DESIGN DECISIONS TO PRESERVE

These are intentional deviations from the Figma that should NOT be changed:

- **Color:** Coral (#FF5C35) accent instead of Figma's purple -- per design decision
- **Language:** English instead of Figma's Spanish -- per design decision
- **Background:** #0D0A0A instead of Figma's slightly different dark -- per design decision
- **Logo:** "VIST Studio" instead of "Virtual Influencer / Studio AI"
- **Extra tabs in Gallery:** Images + Storyboard tabs are additions beyond Figma -- keep them
- **Credits system:** "X credits remaining" instead of "X generations remaining" -- keep our credits model
