# VIST — Netrunner Identity Redesign

## Vision

VIST deja de ser "otra app de IA con glassmorphism" y se convierte en un **sistema operativo de otro mundo** — el universo digital personal donde el creador da vida a sus personajes virtuales. Inspirado en Cyberpunk 2077, pero con identidad propia a través del sistema dual de color coral (creador) + cyan (sistema).

## Design Principles

1. **Intención > Decoración** — Cada efecto visual tiene un propósito. Nada es ornamental.
2. **Dual Voice** — Coral = el creador actuando. Cyan = el sistema respondiendo. Esto es el alma de la identidad.
3. **Textura > Transparencia** — Superficies opacas con textura (noise, scanlines, grain) en vez de blur genérico.
4. **Jerarquía por contraste** — No todos los elementos son iguales. Los importantes brillan, los secundarios se mutan.
5. **Peso > Ligereza** — Las interacciones se sienten sólidas, con feedback inmediato. No flotantes.

---

## 1. Color System

### CSS Variables
```css
:root {
  --accent: #f06848;   /* Coral — Creator Action */
  --cyan: #00ffc8;     /* Cyan — System Response */
  --magenta: #d048b0;  /* Magenta — Premium/Special */
  --mint: #40d890;     /* Success */
  --danger: #e04848;   /* Danger */
}
```

### Primary Roles
| Role | Color | Variable | Hex | Uso |
|------|-------|----------|-----|-----|
| Creator Action | Coral | `--accent` | `#f06848` | Botones CTA, selección activa, el usuario interactuando |
| System Response | Cyan | `--cyan` | `#00ffc8` | Status, feedback, datos, confirmaciones, indicadores |
| Premium/Special | Magenta | `--magenta` | `#d048b0` | Badges premium, warnings, momentos especiales (uso mínimo) |
| Success | Mint | `--mint` | `#40d890` | Confirmaciones positivas, completado |
| Danger | Red | `--danger` | `#e04848` | Errores, destrucción, alertas críticas |

### Background Layers
| Layer | Hex | Uso |
|-------|-----|-----|
| bg-0 (void) | `#06060a` | Fondo base — casi negro con tinte azul |
| bg-1 (surface) | `#0a0a12` | Sidebar, paneles principales |
| bg-2 (card) | `#0e0d15` | Cards, contenedores |
| bg-3 (elevated) | `#141320` | Elementos elevados, dropdowns |
| bg-4 (hover) | `#1a1828` | Hover states |

### Text Hierarchy
| Level | Hex | Uso |
|-------|-----|-----|
| text-1 | `#f0eaf0` | Texto principal, headings |
| text-2 | `#706880` | Texto secundario, descriptions |
| text-3 | `#585068` | Labels muted, placeholders (WCAG AA 3:1+ on bg-2) |

### Border System
| State | Value |
|-------|-------|
| Default | `rgba(255,255,255,0.04)` |
| Hover | `rgba(240,104,72,0.15)` (coral tint) |
| Active/Focus | `rgba(0,255,200,0.2)` (cyan tint) |
| System | `rgba(0,255,200,0.08)` (cyan subtle) |

### Regla de Color
- **Nunca** usar gradiente tricolor en un solo elemento
- Coral y cyan **no** aparecen juntos en el mismo componente (excepto en el logo/brand)
- El magenta se usa máximo 2-3 veces por página
- El 90% de la UI es neutral (grises oscuros). El color es quirúrgico.

---

## 2. Typography

### Font Stack
| Role | Font | Weight | Uso |
|------|------|--------|-----|
| Brand/Headings | Rajdhani | 600, 700 | H1, H2, brand name, sección titles |
| Body | DM Sans | 400, 500 | Párrafos, descripciones, UI labels |
| Data/System | JetBrains Mono | 400, 500 | Stats, credits, status, código, timestamps |

### Decisión: Por qué Rajdhani
- Geométrica, angular, con personalidad — no es la serif genérica que toda IA usa
- Se siente como tipografía de un HUD futurista sin ser ilegible
- Funciona en uppercase con tracking y en sentence case
- Es el opuesto de Playfair Display (que grita "template AI elegante")

### Scale
```
text-xs:   0.7rem   — micro labels, status badges
text-sm:   0.8rem   — secondary info, sublabels
text-base: 0.9rem   — body text, descriptions
text-lg:   1.1rem   — section headings, card titles
text-xl:   1.4rem   — page titles
text-2xl:  2rem     — hero/landing headings
text-3xl:  3rem     — landing hero principal
```

---

## 3. Component System

### Cards — Chamfered Panels
Adiós glassmorphism. Las cards son **paneles opacos** con esquinas cortadas (chamfered).

**Implementation: wrapper + inner pattern** (clip-path clips borders, so we use a wrapper).

```css
/* Outer wrapper provides the chamfered shape */
.card-wrap {
  clip-path: polygon(12px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 12px);
  padding: 1px; /* acts as border width */
  background: rgba(255,255,255,0.04); /* border color */
  transition: background 150ms;
}
.card-wrap:hover {
  background: rgba(240,104,72,0.12);
}

/* Inner card — same clip-path, opaque background */
.card {
  clip-path: polygon(12px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 12px);
  background: var(--bg-2);
  padding: 1rem;
  position: relative;
}

/* Accent line — sits OUTSIDE the clip-path on the wrapper */
.card-wrap::before {
  content: '';
  position: absolute;
  top: -1px; left: -1px;
  width: 18px; height: 2px;
  background: var(--accent);
  transform: rotate(45deg);
  transform-origin: top left;
  opacity: 0.6;
  z-index: 1;
}
.card-wrap { position: relative; }

/* System card variant — cyan accent */
.card-wrap--system::before {
  background: var(--cyan);
}
.card-wrap--system:hover {
  background: rgba(0,255,200,0.12);
}
```

**Sin backdrop-filter. Sin radial-gradient mouse tracking. Sin translateY hover.**

### Cards — Variantes
- **Card default** (`.card-wrap`): Chamfered top-left, accent line coral
- **Card system** (`.card-wrap--system`): Chamfered top-left, accent line cyan (para stats, status)
- **Card feature**: Sin chamfer, border-radius 8px, borde completo, glow sutil en hover (para landing page)

### Buttons
```css
.btn-primary {
  background: var(--accent);   /* coral sólido, no gradient */
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: none;
  padding: 0.6rem 1.5rem;
  clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
}

.btn-primary:hover {
  background: #f87858;  /* lighter coral */
  box-shadow: 0 0 20px rgba(240,104,72,0.25);
}

.btn-ghost {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-2);
}

.btn-ghost:hover {
  border-color: rgba(0,255,200,0.15);
  color: var(--cyan);
}
```

### Sidebar
- Background: `var(--bg-1)` sólido, sin blur
- Brand: "VIST" en Rajdhani bold, con dot indicator (coral cuando online)
- Items: SVG icons geométricos (no emojis), label en DM Sans
- Active: left border accent (coral), background sutil `rgba(240,104,72,0.06)`
- Status indicators en cyan: "READY", "2 QUEUE", counts
- Sección dividers: línea fina `rgba(255,255,255,0.03)` con label uppercase en text-3

### Icons
**SVG geométricos** — líneas finas (stroke-width 1.5), monocolor, sin fill.
Estilo: Angular, minimal, consistente. Como wireframes de blueprint.

Iconos necesarios:
- Create (+), Session (circle), Editor (square/pen), Gallery (grid 2x2)
- Characters (user), Universe (globe), Calendar (calendar), Analytics (chart)
- Settings (gear), Upload (arrow-up), Download (arrow-down)

### Modals
- Background overlay: `rgba(6,6,10,0.85)` (casi opaco, no blur)
- Modal: `var(--bg-2)`, border `rgba(255,255,255,0.06)`, chamfered corners
- Header: Rajdhani uppercase con accent line debajo
- Close: SVG X en esquina, no botón estilizado
- **Posicionamiento con CSS Grid o Flexbox, NUNCA magic numbers como `calc(50% + 110px)`**

---

## 4. Textures & Effects

### Scanlines (signature effect)
```css
.scanlines::after {
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
}
```
Uso: Solo en el fondo del sidebar y en áreas de "sistema" (canvas del editor, preview). **No en todo.**

### Noise Texture
SVG noise al 2-3% opacidad sobre fondos — da textura sin ser visible conscientemente.

### Glow (restringido)
- **SOLO** en elementos interactivos activos (botón pressed, input focused)
- **SOLO** en el color de su rol (coral para acciones, cyan para feedback)
- **Nunca** glow ambient o cursor-following
- `box-shadow: 0 0 20px rgba(color, 0.2)` máximo

### Corner Accent Lines
Líneas diagonales finas en las esquinas cortadas de las cards. Dan la sensación de "panel de HUD" sin ser literal.

---

## 5. Animations

### Principio
Animaciones **rápidas, precisas, con propósito**. Como respuestas de un sistema — no decorativas.

### Entrance (reemplazo de stagger-children)
```jsx
// Framer Motion — entrada escalonada con spring rápido
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 } // 50ms, no 200ms
  }
}
const item = {
  hidden: { opacity: 0, x: -8 },  // desde izquierda, no desde abajo
  visible: {
    opacity: 1, x: 0,
    transition: { type: "spring", stiffness: 500, damping: 30 }
  }
}
```

### Hover
- Cards: Border color transition 150ms, NO translateY
- Buttons: Background lightens 150ms, glow appears 200ms
- Sidebar items: Background fade in 100ms

### Feedback
- Success: Cyan flash 300ms en el borde del elemento
- Error: Red pulse en el borde, shake 200ms
- Loading: Horizontal scan line que recorre el elemento (no shimmer genérico)

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
Framer Motion: use `useReducedMotion()` hook to skip entrance animations.

### Scrollbar
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-0); }
::-webkit-scrollbar-thumb {
  background: rgba(240,104,72,0.25);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(240,104,72,0.4);
}
```
Single color (coral muted), no tricolor gradient.

### Page Transitions
Corte limpio con fade 100ms. Sin slide, sin scale. Como cambiar de canal en un sistema.

### Typing/Glitch (landing page only)
- Texto que se "escribe" con cursor parpadeante — solo para el hero de la landing
- Glitch sutil (RGB split 1-2px) en hover de elementos especiales — solo landing
- **No usar en la app interna** — ahí todo es limpio y preciso

---

## 6. Landing Page Design

### Concepto
La landing NO es una landing genérica de SaaS. Es la **puerta de entrada al universo**. El visitante debe sentir que está entrando a otro mundo.

### Estructura

#### Hero Section
- Fondo: Negro profundo con scanlines sutiles + noise
- Título principal en Rajdhani bold, 3rem+, con efecto typing/reveal
- "VIST" con glow coral sutil
- Subtítulo: "Tu universo digital. Tus personajes. Tu imperio." (o similar)
- CTA principal: Botón chamfered coral "ENTER THE SYSTEM"
- Background: Partículas/grid geométrico sutil que responde al mouse (no cursor glow, sino un efecto de campo que distorsiona ligeramente)

#### Demo/Preview Section
- Video o animación del dashboard en un frame chamfered
- Scanlines sobre el preview para dar sensación de "transmisión"

#### Features Section
- 3-4 features máximo (no 8)
- Cada feature en su propia card chamfered con icon SVG
- Color de accent cambia por feature (editor=cyan, session=coral, gallery=magenta)
- Animación: reveal on scroll con Framer Motion useScroll

#### Social Proof / Characters Section
- Grid de personajes generados (imágenes reales de la plataforma)
- Hover: info panel aparece desde abajo
- Título: "Worlds Already Built" o similar

#### CTA Final
- Background con gradient sutil (coral→transparente desde un lado)
- "Build Your Universe" con botón chamfered
- Stats del sistema en JetBrains Mono (cyan): "12,000+ characters created"

#### Footer
- Minimal, oscuro, links en text-3
- Brand "VIST" con dot indicator

### Componentes de 21st.dev a investigar
- [Hero sections](https://21st.dev/s/hero) — adaptar dark hero
- [Animated text](https://21st.dev/s/text) — typing/reveal effects
- [Animated components](https://21st.dev/s/animated) — scroll animations

### Stack de Landing
- React + Tailwind (ya tenemos)
- Framer Motion para scroll animations y entrances
- Google Stitch para prototipar variantes de secciones
- CSS custom para scanlines, chamfered corners, glows

---

## 7. What We Remove

| Actual | Reemplazo |
|--------|-----------|
| Glassmorphism universal (backdrop-filter blur) | Cards opacas con chamfered corners |
| Plasma gradient tricolor en todo | Color quirúrgico por rol (coral/cyan/magenta) |
| Cursor glow ambient 400px | Eliminado completamente |
| Unicode emoji icons (⊕, ◎, ✦) | SVG icons geométricos |
| Hover translateY(-1px) uniforme | Border transition, sin movimiento |
| Stagger animations 200ms decorativas | Spring 50ms con propósito |
| Playfair Display serif | Rajdhani geometric sans |
| `.text-gradient` animado en cada título | Color sólido, gradient solo en landing hero |
| Shimmer loading | Scan line horizontal loading |
| Button shine reflejo diagonal | Glow sutil en hover |
| Radial-gradient mouse tracking en cards | Eliminado |
| Copy genérico ("The home of AI-edited...") | Voz de marca: directa, sistema, creador |

---

## 8. What We Keep

- **Paleta base oscura** — refinada a más profunda y con más tinte azul
- **Film grain overlay** — ya lo teníamos, encaja perfecto con Netrunner
- **3 colores de acento** — pero con roles claros en vez de gradient
- **DM Sans para body** — funciona bien, se queda
- **JetBrains Mono para datos** — perfecto para estética de sistema
- **Sidebar navigation** — estructura se mantiene, estética cambia
- **Credit system visual** — se integra con cyan (sistema mostrando datos)

---

## 9. Scope & Phases

### Phase 1: Foundation (CSS + Components)
- Nuevo `index.css` con variables, cards, buttons, sidebar
- Icon system SVG
- Typography switch (Rajdhani)

### Phase 2: Landing Page
- Hero con typing effect + geometric background
- Features section con scroll animations
- CTA sections
- Footer

### Phase 3: App Pages Migration
- Dashboard → nuevo card system
- Sidebar → SVG icons + status indicators
- Remaining pages adaptadas una por una

### Phase 4: Polish
- Framer Motion page transitions
- Loading states (scan line)
- Micro-interactions refinadas
