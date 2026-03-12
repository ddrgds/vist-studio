# VIST Netrunner Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current generic AI-looking landing page with a Cyberpunk 2077-inspired "Netrunner OS" landing that establishes VIST's unique identity as the creator's digital universe.

**Architecture:** Phase 1 updates the CSS foundation (variables, card system, buttons, scrollbar) without breaking existing pages. Phase 2 rewrites Landing.tsx with the new identity using Framer Motion for scroll animations and typing effects. Existing pages continue working with old classes until a future migration phase.

**Tech Stack:** React 19 + TypeScript + Tailwind v4 + Vite + Framer Motion (new) + Lucide React (existing)

**Spec:** `docs/superpowers/specs/2026-03-12-vist-netrunner-identity-redesign.md`

---

## Chunk 1: CSS Foundation & Dependencies

### Task 1: Install Framer Motion

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install framer-motion**

Run: `pnpm add framer-motion`
Expected: Package added to dependencies

- [ ] **Step 2: Verify import works**

Run: `pnpm dev` — confirm no build errors

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add framer-motion for scroll animations"
```

---

### Task 2: Add Netrunner CSS Variables & Tokens

**Files:**
- Modify: `index.css` (add new variables alongside existing ones, don't remove old yet)

- [ ] **Step 1: Add new Netrunner color variables to `:root`**

Add these AFTER the existing variables block (keep old variables intact for existing pages):

```css
/* ===== NETRUNNER IDENTITY SYSTEM ===== */
:root {
  /* Netrunner Backgrounds (deeper, bluer blacks) */
  --nr-bg-0: #06060a;
  --nr-bg-1: #0a0a12;
  --nr-bg-2: #0e0d15;
  --nr-bg-3: #141320;
  --nr-bg-4: #1a1828;

  /* Netrunner Accent Roles */
  --cyan: #00ffc8;
  --cyan-dim: rgba(0, 255, 200, 0.15);
  --cyan-glow: rgba(0, 255, 200, 0.25);

  /* Netrunner Text */
  --nr-text-1: #f0eaf0;
  --nr-text-2: #706880;
  --nr-text-3: #585068;

  /* Netrunner Borders */
  --nr-border: rgba(255,255,255,0.04);
  --nr-border-coral: rgba(240,104,72,0.15);
  --nr-border-cyan: rgba(0,255,200,0.12);
}
```

- [ ] **Step 2: Add Rajdhani font import to `index.html`**

Add to the existing Google Fonts link in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Add Rajdhani to Tailwind @theme**

In `index.css`, inside the existing `@theme` block, add:

```css
--font-heading: 'Rajdhani', 'DM Sans', sans-serif;
```

- [ ] **Step 4: Verify dev server still works**

Run: `pnpm dev` — no errors, existing pages render correctly

- [ ] **Step 5: Commit**

```bash
git add index.css index.html
git commit -m "feat: add Netrunner CSS tokens and Rajdhani font"
```

---

### Task 3: Add Netrunner Component Classes

**Files:**
- Modify: `index.css`

- [ ] **Step 1: Add chamfered card classes**

Add AFTER existing `.card` class (don't modify it):

```css
/* ===== NETRUNNER COMPONENTS ===== */

/* Chamfered card wrapper — provides border via padding trick */
.nr-card-wrap {
  clip-path: polygon(14px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 14px);
  padding: 1px;
  background: var(--nr-border);
  position: relative;
  transition: background 150ms ease;
}
.nr-card-wrap:hover {
  background: var(--nr-border-coral);
}
.nr-card-wrap::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: 20px;
  height: 2px;
  background: var(--accent);
  transform: rotate(45deg);
  transform-origin: top left;
  opacity: 0.6;
  z-index: 2;
}

/* Inner card */
.nr-card {
  clip-path: polygon(14px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 14px);
  background: var(--nr-bg-2);
  padding: 1.25rem;
}

/* System variant — cyan accent */
.nr-card-wrap--sys::before {
  background: var(--cyan);
}
.nr-card-wrap--sys:hover {
  background: var(--nr-border-cyan);
}

/* Feature card for landing — no chamfer, subtle glow */
.nr-feature-card {
  background: var(--nr-bg-2);
  border: 1px solid var(--nr-border);
  border-radius: 8px;
  padding: 1.5rem;
  transition: border-color 200ms, box-shadow 200ms;
}
.nr-feature-card:hover {
  border-color: var(--nr-border-coral);
  box-shadow: 0 0 30px rgba(240,104,72,0.06);
}
```

- [ ] **Step 2: Add Netrunner button classes**

```css
/* Netrunner primary button — coral solid, parallelogram clip */
.nr-btn {
  background: var(--accent);
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: none;
  padding: 0.7rem 2rem;
  clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
  cursor: pointer;
  transition: background 150ms, box-shadow 200ms;
}
.nr-btn:hover {
  background: #f87858;
  box-shadow: 0 0 25px rgba(240,104,72,0.3);
}

/* Ghost button — cyan system response */
.nr-btn-ghost {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--nr-text-2);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.65rem 1.8rem;
  cursor: pointer;
  transition: border-color 150ms, color 150ms;
}
.nr-btn-ghost:hover {
  border-color: rgba(0,255,200,0.2);
  color: var(--cyan);
}
```

- [ ] **Step 3: Add scanline and texture utilities**

```css
/* Scanline overlay — use on system/preview areas only */
.nr-scanlines {
  position: relative;
}
.nr-scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 200, 0.012) 2px,
    rgba(0, 255, 200, 0.012) 4px
  );
  pointer-events: none;
  z-index: 1;
}

/* Scan line loading animation (replaces shimmer) */
@keyframes nr-scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
.nr-loading {
  position: relative;
  overflow: hidden;
}
.nr-loading::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 40%,
    rgba(0,255,200,0.06) 50%,
    transparent 60%
  );
  animation: nr-scan 2s ease-in-out infinite;
}

/* Netrunner scrollbar */
.nr-scroll::-webkit-scrollbar { width: 6px; }
.nr-scroll::-webkit-scrollbar-track { background: var(--nr-bg-0); }
.nr-scroll::-webkit-scrollbar-thumb {
  background: rgba(240,104,72,0.25);
  border-radius: 3px;
}
.nr-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(240,104,72,0.4);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .nr-loading::after { animation: none; }
}
```

- [ ] **Step 4: Add Netrunner typography utilities**

```css
/* Heading style — Rajdhani geometric */
.nr-heading {
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--nr-text-1);
}

/* System label — small uppercase, for status/data */
.nr-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--nr-text-3);
}

/* Cyan data display */
.nr-data {
  font-family: 'JetBrains Mono', monospace;
  color: var(--cyan);
}

/* Coral accent text */
.nr-accent {
  color: var(--accent);
}
```

- [ ] **Step 5: Verify nothing broke**

Run: `pnpm dev` — check existing Dashboard, Gallery, Editor pages still render

- [ ] **Step 6: Commit**

```bash
git add index.css
git commit -m "feat: add Netrunner component classes (cards, buttons, scanlines, typography)"
```

---

## Chunk 2: Landing Page — Structure & Hero

### Task 4: Read Current Landing Page

**Files:**
- Read: `pages/Landing.tsx`

- [ ] **Step 1: Read and understand current Landing.tsx**

Read the full file to understand:
- Current sections and their order
- How auth modal is triggered (the `onAuth` prop or similar)
- Any navigation callbacks
- Current Spanish copy
- How it integrates with App.tsx

Document the interface: what props does Landing receive? What callbacks must it support?

---

### Task 5: Rewrite Landing Page — Hero Section

**Files:**
- Modify: `pages/Landing.tsx`

- [ ] **Step 1: Create the new Landing component shell**

Replace the entire Landing.tsx with the new Netrunner version. Start with imports and the hero section only:

```tsx
import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// Keep the same props interface as current Landing
interface LandingProps {
  onAuth?: () => void;
  onNav?: (page: string) => void;
}

// Typing effect hook
function useTypingEffect(text: string, speed = 50, delay = 500) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return { displayed, done };
}

export default function Landing({ onAuth }: LandingProps) {
  const { displayed: heroText, done: heroDone } = useTypingEffect(
    'Tu universo digital. Tus personajes. Tu imperio.', 40, 800
  );

  return (
    <div className="min-h-screen nr-scroll" style={{ background: 'var(--nr-bg-0)' }}>

      {/* ===== NAV ===== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(6,6,10,0.85)',
        borderBottom: '1px solid var(--nr-border)',
        padding: '0.8rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '1.2rem',
          color: 'var(--accent)',
          letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <div style={{
            width: 8, height: 8,
            background: 'var(--accent)',
            borderRadius: '2px',
            boxShadow: '0 0 8px rgba(240,104,72,0.5)',
          }} />
          VIST
        </div>
        <button className="nr-btn" onClick={onAuth} style={{ fontSize: '0.75rem', padding: '0.5rem 1.5rem' }}>
          ENTER
        </button>
      </nav>

      {/* ===== HERO ===== */}
      <section className="nr-scanlines" style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '6rem 2rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Geometric grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(240,104,72,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,104,72,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }} />

        {/* System status badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem',
            border: '1px solid var(--nr-border-cyan)',
            borderRadius: '2px',
            marginBottom: '2rem',
          }}
        >
          <div style={{
            width: 6, height: 6,
            background: 'var(--cyan)',
            borderRadius: '50%',
            boxShadow: '0 0 6px var(--cyan)',
          }} />
          <span className="nr-label" style={{ color: 'var(--cyan)', letterSpacing: '0.15em' }}>
            SYSTEM ONLINE
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="nr-heading"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span style={{ color: 'var(--accent)' }}>VIST</span>
          <span style={{ color: 'var(--nr-text-1)', fontWeight: 500 }}> STUDIO</span>
        </motion.h1>

        {/* Typing subtitle */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          color: 'var(--nr-text-2)',
          minHeight: '1.5em',
          position: 'relative',
          zIndex: 2,
        }}>
          {heroText}
          {!heroDone && (
            <span style={{
              display: 'inline-block',
              width: '2px', height: '1.1em',
              background: 'var(--cyan)',
              marginLeft: '2px',
              verticalAlign: 'text-bottom',
              animation: 'blink 1s step-end infinite',
            }} />
          )}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: heroDone ? 1 : 0, y: heroDone ? 0 : 20 }}
          transition={{ duration: 0.4 }}
          style={{ marginTop: '3rem', display: 'flex', gap: '1rem', zIndex: 2 }}
        >
          <button className="nr-btn" onClick={onAuth} style={{ fontSize: '0.9rem', padding: '0.8rem 2.5rem' }}>
            ENTER THE SYSTEM
          </button>
          <button className="nr-btn-ghost" style={{ fontSize: '0.9rem', padding: '0.75rem 2rem' }}>
            EXPLORE
          </button>
        </motion.div>

        {/* Bottom fade */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
          background: `linear-gradient(transparent, var(--nr-bg-0))`,
          zIndex: 3,
        }} />
      </section>

      {/* Remaining sections will be added in subsequent tasks */}

    </div>
  );
}
```

- [ ] **Step 2: Add blink keyframe to index.css**

```css
@keyframes blink {
  50% { opacity: 0; }
}
```

- [ ] **Step 3: Run dev server and verify hero renders**

Run: `pnpm dev`
Expected: Landing shows with typing effect, geometric grid, scanlines, coral VIST title, CTA buttons appear after typing completes

- [ ] **Step 4: Commit**

```bash
git add pages/Landing.tsx index.css
git commit -m "feat: rewrite landing hero with Netrunner identity and typing effect"
```

---

### Task 6: Landing Page — Features Section

**Files:**
- Modify: `pages/Landing.tsx`

- [ ] **Step 1: Add features data and section after hero**

Add inside the Landing component, after the hero `</section>`:

```tsx
{/* ===== FEATURES ===== */}
<section style={{
  padding: '6rem 2rem',
  maxWidth: '1100px',
  margin: '0 auto',
}}>
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.4 }}
  >
    <span className="nr-label" style={{ color: 'var(--cyan)' }}>CAPABILITIES</span>
    <h2 className="nr-heading" style={{
      fontSize: '2rem', marginTop: '0.5rem', marginBottom: '3rem',
    }}>
      Todo lo que necesitas.{' '}
      <span style={{ color: 'var(--nr-text-3)', fontWeight: 500 }}>Nada que no.</span>
    </h2>
  </motion.div>

  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
  }}>
    {[
      {
        icon: '⬡', label: 'DIRECTOR',
        title: 'Dirige la escena',
        desc: 'Controla pose, cámara, iluminación y outfit. Tú diriges, la IA ejecuta.',
        accent: 'var(--accent)',
      },
      {
        icon: '◈', label: 'AI EDITOR',
        title: 'Edición con 8 herramientas',
        desc: 'Relight, face swap, try-on, background, enhance, style transfer, inpaint.',
        accent: 'var(--cyan)',
      },
      {
        icon: '▣', label: 'GALLERY',
        title: 'Tu colección, organizada',
        desc: 'Todas tus creaciones en un solo lugar. Filtra, exporta, comparte.',
        accent: 'var(--magenta)',
      },
      {
        icon: '◎', label: 'PHOTO SESSION',
        title: 'Sesiones automáticas',
        desc: 'Elige un vibe, selecciona presets. Genera series completas en un click.',
        accent: 'var(--accent)',
      },
    ].map((feat, i) => (
      <motion.div
        key={feat.label}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ delay: i * 0.08, duration: 0.35 }}
        className="nr-feature-card"
        style={{ cursor: 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.2rem', color: feat.accent }}>{feat.icon}</span>
          <span className="nr-label" style={{ color: feat.accent }}>{feat.label}</span>
        </div>
        <h3 className="nr-heading" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
          {feat.title}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--nr-text-2)', lineHeight: 1.6 }}>
          {feat.desc}
        </p>
      </motion.div>
    ))}
  </div>
</section>
```

- [ ] **Step 2: Verify features section renders with scroll animation**

Run: `pnpm dev` — scroll down from hero, features should fade in staggered

- [ ] **Step 3: Commit**

```bash
git add pages/Landing.tsx
git commit -m "feat: add features section with scroll-reveal animations"
```

---

### Task 7: Landing Page — Preview/Demo Section

**Files:**
- Modify: `pages/Landing.tsx`

- [ ] **Step 1: Add preview section after features**

This section shows a mock dashboard inside a chamfered frame with scanlines:

```tsx
{/* ===== PREVIEW ===== */}
<section style={{
  padding: '4rem 2rem 6rem',
  maxWidth: '1000px',
  margin: '0 auto',
}}>
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.5 }}
    className="nr-scanlines"
    style={{
      background: 'var(--nr-bg-1)',
      border: '1px solid var(--nr-border)',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    {/* Terminal header bar */}
    <div style={{
      padding: '0.6rem 1rem',
      borderBottom: '1px solid var(--nr-border)',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', opacity: 0.7 }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', opacity: 0.4 }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--nr-text-3)', opacity: 0.3 }} />
      <span className="nr-label" style={{ marginLeft: '0.5rem', color: 'var(--nr-text-3)' }}>
        VIST.SYS — DASHBOARD
      </span>
    </div>

    {/* Mock dashboard content */}
    <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
      {[
        { label: 'CHARACTERS', val: '12', sub: '+3 this week', accent: 'var(--accent)' },
        { label: 'RENDERS', val: '847', sub: '14.2h GPU time', accent: 'var(--cyan)' },
        { label: 'CREDITS', val: '2,450', sub: '~23/day burn', accent: 'var(--cyan)' },
      ].map(stat => (
        <div key={stat.label} className="nr-card-wrap nr-card-wrap--sys">
          <div className="nr-card" style={{ padding: '1rem' }}>
            <div className="nr-label">{stat.label}</div>
            <div className="nr-heading" style={{ fontSize: '1.5rem', color: stat.accent, marginTop: '0.25rem' }}>
              {stat.val}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--mint)', fontFamily: "'JetBrains Mono', monospace", marginTop: '0.2rem' }}>
              {stat.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
</section>
```

- [ ] **Step 2: Verify preview section renders**

Run: `pnpm dev` — should see a dashboard mock inside a terminal-style frame

- [ ] **Step 3: Commit**

```bash
git add pages/Landing.tsx
git commit -m "feat: add dashboard preview section with chamfered stat cards"
```

---

### Task 8: Landing Page — CTA Final & Footer

**Files:**
- Modify: `pages/Landing.tsx`

- [ ] **Step 1: Add final CTA section**

```tsx
{/* ===== CTA FINAL ===== */}
<section style={{
  padding: '6rem 2rem',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
}}>
  {/* Ambient coral glow — left side only */}
  <div style={{
    position: 'absolute', left: '-10%', top: '50%', transform: 'translateY(-50%)',
    width: '400px', height: '400px',
    background: 'radial-gradient(circle, rgba(240,104,72,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  }} />

  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
  >
    <span className="nr-label" style={{ color: 'var(--cyan)' }}>READY?</span>
    <h2 className="nr-heading" style={{
      fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
      marginTop: '0.5rem', marginBottom: '1rem',
    }}>
      Construye tu universo
    </h2>
    <p style={{
      color: 'var(--nr-text-2)', fontSize: '1rem',
      maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.6,
    }}>
      Crea personajes, dirige sesiones, edita con IA. Todo en un solo espacio.
    </p>
    <button className="nr-btn" onClick={onAuth} style={{ fontSize: '0.9rem', padding: '0.8rem 3rem' }}>
      START BUILDING
    </button>
  </motion.div>

  {/* System stats */}
  <motion.div
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ delay: 0.3 }}
    style={{
      display: 'flex', justifyContent: 'center', gap: '3rem',
      marginTop: '4rem',
    }}
  >
    {[
      { val: '12,000+', label: 'CHARACTERS CREATED' },
      { val: '89,000+', label: 'IMAGES GENERATED' },
      { val: '4.9/5', label: 'CREATOR RATING' },
    ].map(s => (
      <div key={s.label} style={{ textAlign: 'center' }}>
        <div className="nr-data" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{s.val}</div>
        <div className="nr-label" style={{ marginTop: '0.3rem' }}>{s.label}</div>
      </div>
    ))}
  </motion.div>
</section>
```

- [ ] **Step 2: Add footer**

```tsx
{/* ===== FOOTER ===== */}
<footer style={{
  padding: '2rem',
  borderTop: '1px solid var(--nr-border)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  maxWidth: '1100px', margin: '0 auto',
}}>
  <div style={{
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    fontSize: '0.9rem',
    color: 'var(--accent)',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
  }}>
    <div style={{
      width: 6, height: 6,
      background: 'var(--accent)',
      borderRadius: '2px',
      boxShadow: '0 0 6px rgba(240,104,72,0.4)',
    }} />
    VIST
  </div>
  <div style={{ display: 'flex', gap: '2rem' }}>
    {['Pricing', 'Docs', 'Community', 'Contact'].map(link => (
      <a key={link} href="#" style={{
        color: 'var(--nr-text-3)',
        fontSize: '0.8rem',
        textDecoration: 'none',
        transition: 'color 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--nr-text-2)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--nr-text-3)')}
      >
        {link}
      </a>
    ))}
  </div>
  <span className="nr-label">2026 VIST STUDIO</span>
</footer>
```

- [ ] **Step 3: Verify full landing page flow**

Run: `pnpm dev`
Expected: Full scroll experience — Nav → Hero (typing + grid + scanlines) → Features (scroll reveal) → Preview (dashboard mock) → CTA → Footer

- [ ] **Step 4: Commit**

```bash
git add pages/Landing.tsx
git commit -m "feat: add CTA final section and footer to Netrunner landing"
```

---

## Chunk 3: Polish & Responsive

### Task 9: Mobile Responsive

**Files:**
- Modify: `pages/Landing.tsx`

- [ ] **Step 1: Add responsive styles**

Wrap features grid and stats in responsive-aware styles:

- Features grid: `minmax(300px, 1fr)` already handles mobile (1 col on small screens)
- Preview stat grid: Add `@media (max-width: 640px)` → single column
- CTA stats row: Stack vertically on mobile
- Nav: Reduce padding on mobile
- Hero title: `clamp()` already handles sizing

Add inline responsive checks where needed, or add a small CSS block to index.css:

```css
@media (max-width: 640px) {
  .nr-preview-stats {
    grid-template-columns: 1fr !important;
  }
  .nr-cta-stats {
    flex-direction: column !important;
    gap: 1.5rem !important;
  }
}
```

Apply these class names to the relevant elements in Landing.tsx.

- [ ] **Step 2: Test at 375px, 768px, 1440px widths**

Run: `pnpm dev` — use browser devtools responsive mode
Expected: Landing looks good at all breakpoints

- [ ] **Step 3: Commit**

```bash
git add pages/Landing.tsx index.css
git commit -m "feat: add responsive styles for Netrunner landing"
```

---

### Task 10: Final Verification & Cleanup

**Files:**
- Check: All modified files

- [ ] **Step 1: Full visual check**

Run: `pnpm dev`

Verify:
- [ ] Landing hero: typing effect works, grid visible, scanlines subtle
- [ ] Landing features: scroll reveal works, stagger is fast (not sluggish)
- [ ] Landing preview: chamfered cards render correctly, accent lines visible
- [ ] Landing CTA: coral glow subtle, stats in cyan
- [ ] Landing footer: clean, minimal
- [ ] Login still works (onAuth callback triggers auth modal)
- [ ] After login, app pages still render with OLD styles (not broken)
- [ ] No console errors

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: No build errors, no TS errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: VIST Netrunner identity — landing page redesign complete"
```
