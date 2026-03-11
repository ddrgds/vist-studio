# VERTEX Studio Plasma Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform VIST Studio into VERTEX Studio with the exact plasma visual identity from the two HTML maquettes (landing + app dashboard).

**Architecture:** Replace the design system (colors, fonts, animations), create a new landing page for unauthenticated users, redesign the sidebar navigation and dashboard to match the Vertex HTML pixel-for-pixel. Existing services, contexts, stores, and API logic remain untouched.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 (inline @theme)

**Source HTML files:**
- Landing: `c:\Users\delri\Downloads\vertex-landing.html` (clean HTML, 1015 lines)
- App: `c:\Users\delri\Downloads\vertex-studio-plasma-wow.html` (bundled Parcel app)

---

## Task 1: Update Font Imports

**Files:**
- Modify: `index.html`

**Step 1: Replace Google Fonts link**

Change the font import from Space Grotesk + Inter to Instrument Serif + DM Sans (keep JetBrains Mono):

```html
<!-- Old -->
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">

<!-- New -->
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Step 2: Update page title and meta tags**

Replace all instances of "VIST Studio" with "VERTEX Studio" in the `<title>`, `<meta>` OG/Twitter tags, and `og:site_name`.

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (no TS changes)

**Step 4: Commit**

```bash
git add index.html
git commit -m "chore: update fonts to Instrument Serif + DM Sans, rebrand to VERTEX"
```

---

## Task 2: Rewrite CSS Design System

**Files:**
- Modify: `index.css` (full rewrite)

**Step 1: Replace the entire `index.css`**

The new CSS must include:
1. Tailwind import
2. New `@theme` block with Vertex colors + fonts
3. New `:root` CSS variables matching the bundled app exactly:
```css
:root {
  --bg-0: #08070c;
  --bg-1: #0e0c14;
  --bg-2: #15121c;
  --bg-3: #1e1a28;
  --bg-4: #262034;
  --accent: #f06848;
  --accent-dim: #c85438;
  --accent-hot: #ff8870;
  --magenta: #d048b0;
  --magenta-dim: #a83890;
  --blue: #4858e0;
  --blue-dim: #3444b8;
  --blue-light: #6878f0;
  --rose: #e060a0;
  --mint: #50d8a0;
  --gold: #e0b050;
  --slate: #7880a8;
  --text-1: #f0eaf0;
  --text-2: #9088a0;
  --text-3: #58506c;
  --border: rgba(240,234,240,0.06);
  --border-h: rgba(240,104,72,0.22);
}
```
4. Base styles (body with DM Sans, headings with Instrument Serif)
5. Noise overlay via `body::after` (SVG fractalNoise filter, opacity 0.018)
6. Plasma gradient scrollbar (accent → magenta → blue)
7. Selection highlight (#f0684840)
8. All animations from both HTML files:
   - `gradient-shift` (plasma text)
   - `btn-shine` (shimmer on buttons)
   - `fadeIn`, `fadeInScale` (reveal animations)
   - `pulse-soft`, `plasma-glow`, `float` (ambient effects)
   - `shimmer` (loading/ambient)
   - `border-rotate` (card glow)
   - `marquee` (landing page infinite scroll)
   - `reveal-up`, `reveal-scale` (landing hero)
   - `pulse-ring` (hero badge)
9. Custom component classes:
   - `.text-gradient` (plasma gradient text with animation)
   - `.gradient-mesh` (ambient background for dashboard)
   - `.card` (glass card with hover glow + mouse tracking)
   - `.btn-primary` (plasma gradient button with shimmer)
   - `.btn-ghost` (ghost/outline button)
   - `.glow-line` (accent→magenta→blue decorative line)
   - `.card-glow` (conic gradient border on hover)
   - `.stagger-children` (cascade reveal for lists)
   - `.anim-in`, `.anim-in-scale` (entrance animations)
   - `.plasma-glow`, `.float`, `.pulse-soft` (ambient)
   - `.badge` (JetBrains Mono small labels)
10. Input focus styles (coral glow ring)
11. Font utilities: `.font-display`, `.font-jet`, `.font-body`
12. Landing-page specific: `.hero`, `.hero-mesh`, `.orb`, `.hero-badge`, `.btn-plasma`, `.btn-outline`, `.marquee-wrap`, `.marquee-track`, `.marquee-item`, `.feature-card`, `.feature-icon`, `.showcase-*`, `.stats-band`, `.stat-item`, `.price-card`, `.footer-*`, `.section-header`, `.scroll-indicator`

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS (CSS compiles cleanly)

**Step 3: Commit**

```bash
git add index.css
git commit -m "feat: rewrite CSS design system to Vertex plasma identity"
```

---

## Task 3: Update Design Tokens

**Files:**
- Modify: `ui/tokens.ts`

**Step 1: Replace all token values**

```typescript
export const colors = {
  bg:          '#08070c',
  bgSurface:   '#0e0c14',
  bgElevated:  '#15121c',
  bgHover:     '#1e1a28',
  border:      'rgba(240,234,240,0.06)',
  borderHover: 'rgba(240,104,72,0.22)',
  accent:      '#f06848',
  accentDim:   'rgba(240,104,72,0.15)',
  accentHover: '#ff8870',
  magenta:     '#d048b0',
  blue:        '#4858e0',
  mint:        '#50d8a0',
  text:        '#f0eaf0',
  textSec:     '#9088a0',
  textMuted:   '#58506c',
  success:     '#50d8a0',
  warning:     '#e0b050',
  error:       '#f87171',
} as const;

export const fonts = {
  display: "'Instrument Serif', serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'JetBrains Mono', monospace",
} as const;
```

**Step 2: Search all consumers**

Run: `grep -rn "colors\." --include="*.tsx" --include="*.ts" src/ components/ pages/ layout/ ui/ contexts/`

Fix any references to removed token keys (e.g., `colors.surface` → `colors.bgSurface`, `colors.textFaint` → `colors.textMuted`).

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add ui/tokens.ts
git commit -m "feat: update design tokens to Vertex plasma palette"
```

---

## Task 4: Create Landing Page

**Files:**
- Create: `pages/Landing.tsx`

**Step 1: Create the full landing page component**

This is a direct React + Tailwind translation of `vertex-landing.html`. It MUST match the HTML exactly. Sections in order:

1. **Fixed Nav** — blur backdrop, logo mark "V" with gradient bg, "VERTEX" / "AI STUDIO" text, nav links (Features/Product/Pricing as anchor scrolls), "Comenzar Gratis" CTA button that calls `onAuth()`
2. **Hero** — `.hero` full-height section with `.hero-mesh` radial gradients, 3 floating `.orb` blurred circles, `.hero-badge` with pulse ring, `<h1>` with plasma gradient text, subtitle paragraph, two CTA buttons (plasma + outline)
3. **Scroll Indicator** — animated line + "SCROLL" text
4. **Marquee** — infinite horizontal scroll with feature labels (Photo Sessions, AI Face Swap, Relight Engine, 360° Angles, Virtual Try-On, Style Transfer, Universe Builder, Pose Reference) — duplicated for seamless loop
5. **Features** — section header with plasma gradient text, 3x3 grid of `.feature-card` with colored icons, title, description
6. **Showcase** — split layout: left = mock UI screen (sidebar + stats + chart + cards), right = text with section label, serif heading, description, feature list with colored dots
7. **Stats Band** — 4 stats in row (10K+, 2.4M, 50K+, 99.2%) with gradient numbers
8. **Pricing** — section header, 3-column grid but using **4 real plans** (Starter $0, Pro $19, Studio $49, Brand $149). Pro card gets `.featured` treatment. Lemon Squeezy integration not needed here — just visual. CTAs navigate to `/pricing` inside the app.
9. **Final CTA** — radial glow background, serif heading with plasma text, CTA button
10. **Footer** — glow line, logo + description, 3-column links (Producto, Empresa, Legal), bottom bar with copyright + "CRAFTED WITH ✦ AI"

**Props interface:**
```typescript
interface LandingProps {
  onAuth: () => void; // Opens auth modal
}
```

All CSS classes come from `index.css` (Task 2). Use Tailwind utility classes for layout/spacing, custom classes for effects.

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/Landing.tsx
git commit -m "feat: create VERTEX landing page with full plasma design"
```

---

## Task 5: Integrate Landing Page + Auth Modal

**Files:**
- Modify: `App.tsx`
- Modify: `components/AuthScreen.tsx` (adapt to work as modal)

**Step 1: Modify App.tsx**

- Import `Landing` (lazy)
- When `!user`: show `<Landing onAuth={() => setShowAuth(true)} />` instead of `<AuthScreen />`
- Add state: `const [showAuth, setShowAuth] = useState(false)`
- Render auth modal overlay when `showAuth` is true:
```tsx
{showAuth && (
  <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center"
       onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}>
    <Suspense fallback={null}>
      <AuthScreen onClose={() => setShowAuth(false)} />
    </Suspense>
  </div>
)}
```
- Update loading screen to use new `--bg-0` color
- Update the auth gate layout `colors.bg` references to use new token values

**Step 2: Modify AuthScreen**

- Add `onClose?: () => void` prop
- Wrap the existing form in a card-styled container (rounded-2xl, bg-[var(--bg-2)], border, max-w-md)
- Add close X button that calls `onClose?.()` when in modal mode
- When auth succeeds, call `onClose?.()` (the auth state change will trigger the app to show the dashboard)
- Keep ALL existing auth logic (signIn, signUp, forgot password) untouched

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add App.tsx components/AuthScreen.tsx
git commit -m "feat: landing page for unauthenticated users, auth as modal"
```

---

## Task 6: Redesign Sidebar

**Files:**
- Modify: `layout/Sidebar.tsx`

**Step 1: Rewrite sidebar to match Vertex HTML exactly**

The sidebar from the bundled app has this exact structure:

```
[Logo: gradient square "V" + "VERTEX" / "ai studio"]
[Dashboard button — active state with accent bg]
─── CREAR ───
  Subir Personaje (Crear / Importar) → /studio?tool=create
  Sesión de Fotos (Photo Shoot) → /studio?tool=session
  Editor IA (Relight · 360 · Swap) → /studio
  Universo (World Building) → [placeholder or future]
─── GESTIONAR ───
  Galería (Creaciones) → /gallery
  Personajes (Colección) → /gallery?tab=characters
  Contenido (Calendario) → [placeholder]
  Analytics (Métricas) → [placeholder]
[‹ Colapsar button]
[User: avatar initial circle + name + plan badge]
```

Each nav item has:
- Unicode icon (⬡, ⊕, ◎, ✦, ✧, ▦, ◈, ▣, ◇)
- Title (bold)
- Subtitle (muted, smaller)

Active state: `bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]`
Hover: `bg-white/[0.03]`
Category labels: `font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-3)]`

Keep existing hooks: `useNavigate`, `useLocation`, `useProfile`, `useSubscription`, `useAuth`.

Collapse state: `useState<boolean>(false)` — when collapsed, show only icons (width shrinks from 240px to 64px).

User footer: show first initial in a circle with accent bg, name, and plan label from `useSubscription`.

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add layout/Sidebar.tsx
git commit -m "feat: redesign sidebar to VERTEX plasma with category groups"
```

---

## Task 7: Update Mobile Navigation

**Files:**
- Modify: `layout/MobileNav.tsx`

**Step 1: Update to new palette and items**

- Replace lucide icons with unicode characters matching sidebar
- Update color classes: `text-zinc-*` → `text-[var(--text-*)]`, backgrounds to new palette
- Add same nav items as sidebar (prioritize: Dashboard, Studio, Gallery, More)
- More dropdown: Pricing, Profile, Analytics
- Update border/bg colors to `--bg-0`, `--bg-1`, etc.

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add layout/MobileNav.tsx
git commit -m "feat: update mobile nav to VERTEX plasma palette"
```

---

## Task 8: Redesign Dashboard

**Files:**
- Modify: `pages/Dashboard.tsx`

**Step 1: Rewrite dashboard to match Vertex HTML exactly**

The dashboard from the bundled app has this structure:

```
[.gradient-mesh background]

Header:
  h1: "Vertex" (serif) + "Studio" (gradient text)
  p: "El templo de los personajes virtuales editados con IA"

Stats Row (5 cards):
  Personajes | Fotos Editadas | Face Swaps | Sesiones | Renders 360°
  Each: .card with mono label (uppercase) + large colored number
  Colors per stat: accent, magenta, blue, slate, blue-light

Section: "ACCIONES RÁPIDAS" (mono label)
  6 action cards in grid:
  ⊕ Subir Personaje (Crear o importar) → /studio?tool=create
  ◎ Sesión de Fotos (Escenarios y poses) → /studio?tool=session
  ✦ Editor IA (Relight, swap, 360) → /studio
  ⟲ Face Swap (Cambiar rostros) → /studio?tool=faceswap
  👗 Try-On Virtual (Probar outfits) → [opens try-on modal or studio tool]
  ▦ Galería (Ver creaciones) → /gallery

  Each card: .card with icon in colored circle (accent/magenta/blue bg at 15% opacity),
  title (bold), subtitle (text-2), hover with card glow

Section: "TUS PERSONAJES" + "Ver todos →" link
  3 character cards side by side:
  - Gradient background (coral→magenta, blue→mint, magenta→accent)
  - Status badge ("active" green / "draft" orange)
  - Emoji avatar in dark circle at bottom-left
  - Name (serif bold), subtitle (style tags)
  - 3 stats row: Followers, Engage, Fotos

  Wire to useCharacterStore() — use real characters if available,
  show placeholder/demo cards if empty.

Section: "ACTIVIDAD RECIENTE" (right column on desktop)
  Feed items:
  - Initial letter circle (colored per character)
  - Action name (Face Swap, Relight, 360° Render, Try-On, Background Swap)
  - Character name + time ago

  Wire to galleryStore or show demo data if empty.

Layout: On desktop, bottom section is 2-column (characters left 2/3, activity right 1/3)
```

Keep existing store connections: `useCharacterStore`, `useSubscription`, `useNavigate`.

All colors use CSS variables (`var(--accent)`, `var(--magenta)`, etc.) and custom classes from index.css (`.card`, `.text-gradient`, `.gradient-mesh`, `.stagger-children`, `.glow-line`, etc.).

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/Dashboard.tsx
git commit -m "feat: redesign dashboard to VERTEX plasma with stats, actions, characters"
```

---

## Task 9: Update PricingPage

**Files:**
- Modify: `components/PricingPage.tsx`

**Step 1: Apply plasma visual treatment**

- Keep ALL existing plan data, Lemon Squeezy variant IDs, and checkout logic
- Update visual wrapper: use `.gradient-mesh` background
- Section header: serif font + plasma gradient text
- Cards: use `.card` class, featured card gets accent border + gradient top line
- Buttons: `.btn-primary` for featured plan, `.btn-ghost` for others
- Tier labels: `.badge` class with mono font
- Price: Instrument Serif large text
- Features list: `→` prefix like landing HTML
- Update all color references from zinc/coral to new CSS variables

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add components/PricingPage.tsx
git commit -m "feat: apply VERTEX plasma design to pricing page"
```

---

## Task 10: Update App.tsx Layout Colors

**Files:**
- Modify: `App.tsx`

**Step 1: Update remaining color references**

- Loading screen: `background: 'var(--bg-0)'`, `color: 'var(--text-3)'`
- Main layout div: `background: 'var(--bg-0)'`
- Suspense fallback: `color: 'var(--text-3)'`
- Remove `import { colors } from './ui/tokens'` if no longer needed (all inline styles use CSS vars)

**Step 2: Verify full build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: update App.tsx layout to VERTEX plasma colors"
```

---

## Task 11: Visual QA

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Check landing page (logged out)**

- Verify hero section, orbs, plasma text animation
- Verify marquee scrolls infinitely
- Verify features grid (9 cards)
- Verify showcase section with mock UI
- Verify stats band
- Verify pricing section (4 real plans)
- Verify CTA + footer
- Click "Comenzar Gratis" → auth modal opens
- Complete login → redirects to dashboard

**Step 3: Check dashboard (logged in)**

- Verify sidebar matches Vertex HTML exactly (CREAR/GESTIONAR groups)
- Verify dashboard stats, quick actions, character cards
- Verify activity feed
- Verify sidebar collapse works
- Navigate to all pages via sidebar
- Check mobile view at 375px width

**Step 4: Fix any visual discrepancies found**

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix: visual QA polish for VERTEX plasma redesign"
```

---

## Summary of ALL files changed

| # | File | Action |
|---|------|--------|
| 1 | `index.html` | Modify (fonts + meta) |
| 2 | `index.css` | Full rewrite (design system) |
| 3 | `ui/tokens.ts` | Modify (palette + fonts) |
| 4 | `pages/Landing.tsx` | **Create** (new landing page) |
| 5 | `App.tsx` | Modify (landing gate + auth modal + colors) |
| 6 | `components/AuthScreen.tsx` | Modify (modal support) |
| 7 | `layout/Sidebar.tsx` | Full rewrite (category groups) |
| 8 | `layout/MobileNav.tsx` | Modify (new palette + items) |
| 9 | `pages/Dashboard.tsx` | Full rewrite (stats + actions + characters) |
| 10 | `components/PricingPage.tsx` | Modify (plasma visual treatment) |

## What stays untouched
- All `/services/*.ts` files
- All `/contexts/*.ts` files
- All `/stores/*.ts` files
- All `/functions/**/*.ts` (Cloudflare)
- `types.ts`
- `pages/Studio.tsx`, `pages/Gallery.tsx`
- `components/ProfilePage.tsx`
- All studio tool components
