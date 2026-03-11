# VERTEX STUDIO — Guía de Integración para Claude Code

## Qué es este proyecto

Maqueta frontend completa de una plataforma de influencers virtuales con edición IA.
Stack: React 18 + TypeScript + Tailwind CSS + Vite.
Paleta: "Plasma Shift" (coral #f06848 → magenta #d048b0 → azul #4858e0).
Tipografía: Playfair Display (títulos) + DM Sans (body) + JetBrains Mono (mono/badges).

## Arquitectura de archivos

```
src/
├── App.tsx                    # Router principal + cursor glow + page transitions
├── main.tsx                   # Entry point
├── index.css                  # Sistema de diseño completo (variables, animaciones, componentes CSS)
├── components/
│   └── Sidebar.tsx            # Navegación lateral con 9 secciones en 2 grupos
└── pages/
    ├── Dashboard.tsx          # Overview con stats, quick actions, character cards
    ├── UploadCharacter.tsx    # Crear personaje desde cero O importar imágenes
    ├── PhotoSession.tsx       # Sesión de fotos: escenarios, poses, ángulos, iluminación
    ├── AIEditor.tsx           # 8 herramientas IA: relight, 360°, face swap, try-on, bg, enhance, style, inpaint
    ├── Gallery.tsx            # Galería de todas las creaciones/ediciones IA
    ├── CharacterGallery.tsx   # Colección de personajes con panel de detalle
    ├── UniverseBuilder.tsx    # World building: lore, relaciones, marca, timeline
    ├── ContentCalendar.tsx    # Calendario de contenido multi-personaje
    └── Analytics.tsx          # Métricas, engagement, revenue, audiencia
```

## Sistema de diseño (index.css)

### Variables CSS principales
```css
--bg-0: #08070c     /* Fondo base */
--bg-1: #0e0c14     /* Sidebar, paneles */
--bg-2: #15121c     /* Cards */
--bg-3: #1e1a28     /* Elevated elements */
--bg-4: #262034     /* Hover states */
--accent: #f06848   /* Coral — color primario */
--magenta: #d048b0  /* Magenta — color secundario */
--blue: #4858e0     /* Azul — color terciario */
--mint: #50d8a0     /* Success/positive */
--rose: #e060a0     /* Warning/attention */
--text-1: #f0eaf0   /* Texto principal */
--text-2: #9088a0   /* Texto secundario */
--text-3: #58506c   /* Texto muted/labels */
--border: rgba(240,234,240,0.06)
--border-h: rgba(240,104,72,0.22)   /* Border hover */
```

### Clases CSS reutilizables
- `.card` — Glassmorphism card con backdrop-blur y hover glow
- `.btn-primary` — Gradiente coral→magenta con shine animation
- `.btn-ghost` — Botón transparente con border
- `.badge` — Label pequeño en JetBrains Mono
- `.text-gradient` — Texto animado Playfair italic con gradiente plasma
- `.gradient-mesh` — Fondo con 3 radial-gradients tricolor
- `.font-serif` — Playfair Display
- `.font-mono` — JetBrains Mono
- `.shimmer` — Loading placeholder con destellos plasma
- `.plasma-glow` — Box-shadow que rota entre los 3 colores
- `.anim-in` — Fade in con translateY
- `.stagger-children` — Animación escalonada para hijos
- `.glow-line` — Separador con gradiente plasma
- `.slider-t` — Range input estilizado

### Efectos premium incluidos
- Film grain overlay (SVG noise al 2% opacidad)
- Cursor ambient glow (400px radial que sigue el mouse)
- Page transitions (fade 150ms al cambiar sección)
- Scrollbar plasma (gradiente vertical coral→magenta→azul)
- Card hover glow (radial-gradient sigue posición del mouse)
- Button shine (reflejo diagonal animado)
- Staggered animations (elementos entran uno a uno)
- Glassmorphism (backdrop-filter blur en cards)

## Cómo conectar a funcionalidad real

### 1. Estado global
Actualmente cada página maneja estado local con useState. Para conectar a un backend:

```typescript
// Recomendado: Zustand para estado global
// npm install zustand

// stores/characterStore.ts
import { create } from 'zustand'

interface Character {
  id: string
  name: string
  handle: string
  style: string
  avatar: string
  status: 'active' | 'draft' | 'concept'
  // ... todos los campos del character creator
}

interface CharacterStore {
  characters: Character[]
  selectedCharacter: Character | null
  fetchCharacters: () => Promise<void>
  createCharacter: (data: Partial<Character>) => Promise<void>
  // ...
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  characters: [],
  selectedCharacter: null,
  fetchCharacters: async () => {
    const res = await fetch('/api/characters')
    const data = await res.json()
    set({ characters: data })
  },
  createCharacter: async (data) => {
    const res = await fetch('/api/characters', { method: 'POST', body: JSON.stringify(data) })
    const char = await res.json()
    set(state => ({ characters: [...state.characters, char] }))
  },
}))
```

### 2. Upload de imágenes (UploadCharacter.tsx)
La zona de drop actualmente es visual. Para conectarla:

```typescript
// Agregar react-dropzone
// npm install react-dropzone

import { useDropzone } from 'react-dropzone'

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: { 'image/*': ['.png', '.jpg', '.webp'] },
  maxFiles: 20,
  maxSize: 10 * 1024 * 1024,
  onDrop: async (files) => {
    const formData = new FormData()
    files.forEach(f => formData.append('images', f))
    const res = await fetch('/api/characters/analyze', { method: 'POST', body: formData })
    // La API de IA extrae rostro, cuerpo, piel, cabello...
  }
})
```

### 3. Generación de fotos IA (PhotoSession.tsx)
Los botones "Generar Sesión" deben llamar a tu API de generación:

```typescript
const generatePhoto = async () => {
  setGenerating(true)
  const res = await fetch('/api/generate/photo', {
    method: 'POST',
    body: JSON.stringify({
      characterId: selectedCharacter.id,
      scenario: scenarios[selScene],
      pose: poses[selPose],
      angle: angles[selAngle],
      lighting: lighting[selLight],
      expression: expressions[selExpr],
      // Si hay referencia subida:
      scenarioRefImage: uploadedScenarioRef,
      poseRefImage: uploadedPoseRef,
    })
  })
  const { imageUrl } = await res.json()
  setGeneratedImage(imageUrl)
  setGenerating(false)
}
```

### 4. Editor IA (AIEditor.tsx)
Cada herramienta (relight, face swap, etc.) debe tener su endpoint:

```typescript
const API_ENDPOINTS = {
  relight: '/api/edit/relight',
  rotate360: '/api/edit/360',
  faceswap: '/api/edit/faceswap',
  tryon: '/api/edit/tryon',
  bgswap: '/api/edit/background',
  enhance: '/api/edit/enhance',
  style: '/api/edit/style-transfer',
  inpaint: '/api/edit/inpaint',
}

const applyEdit = async () => {
  const endpoint = API_ENDPOINTS[activeTool]
  const formData = new FormData()
  formData.append('image', inputImage)
  formData.append('params', JSON.stringify(toolParams))
  // Para face swap: formData.append('targetFace', faceImage)
  // Para try-on: formData.append('garment', garmentImage)
  const res = await fetch(endpoint, { method: 'POST', body: formData })
  const { resultUrl } = await res.json()
  setResultImage(resultUrl)
}
```

### 5. Galería (Gallery.tsx)
Reemplazar mockImages con datos reales:

```typescript
const { data: images, isLoading } = useQuery({
  queryKey: ['gallery', activeFilter],
  queryFn: () => fetch(`/api/gallery?type=${activeFilter}`).then(r => r.json()),
})
```

### 6. Canvas real para el editor
El canvas central actualmente es un placeholder. Para funcionalidad real:

```typescript
// Opción A: <canvas> con Fabric.js para manipulación
// npm install fabric

// Opción B: Simplemente mostrar <img> con el resultado
<img src={resultImage} className="w-full h-full object-contain" />

// Opción C: Comparador antes/después con slider
// npm install react-compare-slider
```

## Rutas de la landing a la app

La landing page (vertex-landing-final.html) es un archivo HTML estático separado.
Para integrar:

```
/ → Landing page (vertex-landing-final.html o convertir a React)
/app → Studio app (el React app actual)
/app/dashboard → Dashboard
/app/upload → Subir Personaje
/app/session → Sesión de Fotos
/app/editor → Editor IA
/app/gallery → Galería
/app/characters → Personajes
/app/universe → Universe Builder
/app/content → Content Calendar
/app/analytics → Analytics
```

Agregar React Router:
```typescript
// npm install react-router-dom
import { BrowserRouter, Routes, Route } from 'react-router-dom'
```

## Para correr el proyecto

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev

# Build producción
pnpm build
```

## Notas para Claude Code

1. **No tocar index.css** a menos que sea necesario — todo el sistema de diseño está ahí
2. **Usar las clases CSS** existentes (.card, .btn-primary, .badge, etc.) en vez de crear nuevas
3. **Los colores** deben usar variables CSS (var(--accent), var(--magenta), var(--blue))
4. **Cada página** es independiente — se puede refactorizar una sin romper las demás
5. **El Sidebar** maneja toda la navegación — agregar páginas nuevas ahí
6. **Los datos mock** están hardcodeados en cada página — reemplazar con API calls
7. **Las animaciones** (stagger-children, anim-in, shimmer) ya están listas para usar
8. **Mantener la consistencia** del tri-color plasma en todo nuevo componente

---

## Workflow & Reglas de Desarrollo

### Orquestación

- **Planificar antes de ejecutar**: Para cualquier tarea no trivial (3+ pasos o decisiones de arquitectura), escribir el plan primero en `tasks/todo.md` con items checkeables. Verificar el plan antes de empezar a implementar.
- **Si algo sale mal, PARAR y re-planificar** — no seguir empujando código roto.
- **Marcar progreso**: Ir marcando items como completados. Explicar cambios con resumen de alto nivel en cada paso.
- **Documentar resultados**: Agregar sección de review al final de `tasks/todo.md`.

### Verificación

- **Nunca marcar una tarea como completa sin probar que funciona**.
- Hacer diff entre el comportamiento anterior y los cambios cuando sea relevante.
- Preguntarse: "¿Un senior engineer aprobaría esto?"
- Correr tests, revisar logs, demostrar que funciona correctamente.
- Para cambios de UI: verificar que no se rompió el layout, hover states, y responsive.

### Calidad de Código

- **Simplicidad primero**: Cada cambio lo más simple posible. Impacto mínimo en código existente.
- **No ser lazy**: Encontrar root causes. Nada de fixes temporales. Estándares de senior developer.
- **Impacto mínimo**: Los cambios solo deben tocar lo necesario. Evitar introducir bugs.
- **Elegancia balanceada**: Para cambios no triviales, pausar y preguntar "¿hay una forma más elegante?" Pero no over-engineerear fixes simples y obvios.

### Lecciones Aprendidas

- Después de CUALQUIER corrección del usuario: actualizar `tasks/lessons.md` con el patrón del error.
- Escribir reglas que prevengan el mismo error en el futuro.
- Revisar lessons al inicio de cada sesión para el proyecto relevante.

### Bug Fixing

- Cuando se reporte un bug: resolverlo directamente. No pedir que le expliquen cómo.
- Apuntar a logs, errores, tests fallando — y después resolverlos.
- Cero context switching requerido del usuario.
- Ir a arreglar CI tests sin que te digan cómo.

### Task Management

```
tasks/
├── todo.md        # Plan actual con checkboxes
└── lessons.md     # Patrones de errores y reglas aprendidas
```

Formato de `tasks/todo.md`:
```markdown
# [Nombre de la tarea]

## Plan
- [ ] Paso 1: descripción
- [ ] Paso 2: descripción
- [x] Paso 3: completado

## Review
- Qué se cambió y por qué
- Qué se verificó
```

Formato de `tasks/lessons.md`:
```markdown
# Lessons Learned

## [Fecha] - [Contexto]
**Error**: Descripción del error
**Causa**: Por qué pasó
**Regla**: Qué hacer diferente la próxima vez
```

### Reglas específicas de este proyecto

- **Paleta Plasma Shift**: Siempre usar el sistema tricolor (accent/magenta/blue). Nunca introducir colores fuera de las variables CSS definidas en :root.
- **Glassmorphism**: Las cards usan backdrop-filter blur. No reemplazar con fondos sólidos.
- **Animaciones**: Usar las clases existentes (anim-in, stagger-children, shimmer, plasma-glow) antes de crear nuevas.
- **Tipografía**: Títulos en Playfair Display (.font-serif + .text-gradient), body en DM Sans, datos en JetBrains Mono (.font-mono).
- **Consistencia de pages**: Cada page sigue el patrón `gradient-mesh` → header con h1 `.font-serif` + `.text-gradient` → contenido. No romper este patrón.
- **Sidebar**: La navegación tiene 2 grupos (CREAR / GESTIONAR). Si agregas una página nueva, decidir en cuál grupo va.
- **Datos mock → API**: Al conectar una página, mantener la misma estructura de datos. Solo cambiar de dónde vienen, no la forma.
- **No instalar librerías de UI**: Ya tenemos Tailwind + clases custom. No agregar Material UI, Chakra, Ant Design, etc.

---

## Subagents & Agent Teams

### Subagents disponibles para este proyecto

Crear los siguientes archivos en `.claude/agents/` del proyecto:

#### UI Designer Agent
```markdown
<!-- .claude/agents/ui-designer.md -->
---
name: ui-designer
description: Reviews and implements UI components following the Vertex Plasma Shift design system
tools: Read, Write, Edit, Glob, Grep
---
You are a frontend UI specialist for Vertex Studio.

Design system rules you MUST follow:
- Palette: --accent (#f06848), --magenta (#d048b0), --blue (#4858e0)
- Cards: glassmorphism with backdrop-filter blur, .card class
- Titles: Playfair Display italic with .text-gradient (animated plasma)
- Body: DM Sans, mono: JetBrains Mono
- Animations: use existing classes (anim-in, stagger-children, shimmer, plasma-glow)
- Every page: gradient-mesh → h1 .font-serif .text-gradient → content
- Never use Material UI, Chakra, or any external UI library
- Never introduce colors outside CSS variables in :root
```

#### API Connector Agent
```markdown
<!-- .claude/agents/api-connector.md -->
---
name: api-connector
description: Connects mock UI pages to real API endpoints while preserving data structure
tools: Read, Write, Edit, Bash, Glob, Grep
---
You are a backend integration specialist for Vertex Studio.

Rules:
- Each page has hardcoded mock data. Replace with API calls.
- PRESERVE the exact same data structure — only change WHERE data comes from, not its shape.
- Use React Query (TanStack Query) for data fetching.
- Add loading states using the existing .shimmer class.
- Add error states that match the design system.
- Never modify index.css or the visual design.
- API endpoints follow the pattern: /api/{resource} (GET, POST, PUT, DELETE)
```

#### Test Agent
```markdown
<!-- .claude/agents/test-agent.md -->
---
name: test-agent
description: Writes and runs tests, checks for regressions, validates UI behavior
tools: Read, Bash, Glob, Grep
---
You are a QA specialist for Vertex Studio.

Focus areas:
- Component rendering tests with Vitest + React Testing Library
- Check that all 9 pages render without errors
- Verify navigation between pages works
- Validate that API connections return expected data shapes
- Check responsive behavior and hover states
- Report results as pass/fail summary, not verbose logs
```

#### Code Reviewer Agent
```markdown
<!-- .claude/agents/code-reviewer.md -->
---
name: code-reviewer
description: Reviews code changes for quality, consistency with design system, and potential issues
tools: Read, Grep, Glob
---
You are a senior code reviewer for Vertex Studio.

Review checklist:
- Uses CSS variables, not hardcoded colors
- Uses existing CSS classes (.card, .btn-primary, .badge, etc.)
- Follows page pattern (gradient-mesh → serif title → content)
- No unnecessary dependencies added
- TypeScript types are correct
- No console.logs left in code
- Animations use existing classes
- Data structures match the mock data shape
```

### Estrategia de Subagents

Usar subagents para mantener el context window limpio:

```bash
# Ejemplo: conectar la página Gallery a la API
"Use the api-connector agent to connect Gallery.tsx to the /api/gallery endpoint"

# Ejemplo: revisar cambios antes de commit
"Use the code-reviewer agent to check my changes in src/pages/"

# Ejemplo: crear un nuevo componente siguiendo el design system
"Use the ui-designer agent to create a NotificationPanel component"

# Ejemplo: correr tests después de cambios
"Use the test-agent to verify all pages still render correctly"
```

### Agent Teams para tareas grandes

Para refactors grandes o features que tocan múltiples archivos, usar Agent Teams.
Requiere Opus 4.6 y habilitar el flag experimental:

```json
// settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

#### Ejemplo: Conectar toda la app al backend

```markdown
Create a team to connect Vertex Studio frontend to the real backend API:

**Team Lead**: Coordinates the integration, manages shared state store (Zustand), handles routing.

**Teammate 1 — API Layer**: Creates the API client, types, and React Query hooks in src/api/. 
Endpoints: /api/characters, /api/photos, /api/edits, /api/gallery, /api/universe, /api/content, /api/analytics.

**Teammate 2 — Page Integration (CREAR)**: Connects UploadCharacter, PhotoSession, AIEditor, UniverseBuilder 
to the API hooks. Replaces mock data, adds loading/error states using .shimmer class.

**Teammate 3 — Page Integration (GESTIONAR)**: Connects Dashboard, Gallery, CharacterGallery, ContentCalendar, Analytics 
to the API hooks. Replaces mock data, adds loading/error states.

**Teammate 4 — Testing**: After each teammate completes a page, runs tests to verify rendering, 
navigation, and data flow. Reports issues back to the team.

Rules for all teammates:
- Read CLAUDE.md first
- Never modify index.css
- Use CSS variables for all colors
- Maintain the Plasma Shift design system
- Preserve existing animations and hover effects
```

#### Ejemplo: Agregar feature nueva (ej: Marketplace)

```markdown
Create a team to add a Marketplace section to Vertex Studio:

**Team Lead**: Designs the data model and page architecture. Updates Sidebar with new nav item.

**Teammate 1 — UI**: Creates src/pages/Marketplace.tsx following the design system.
Must use: gradient-mesh, font-serif titles, .card glassmorphism, stagger-children animations.

**Teammate 2 — Backend**: Creates API endpoint and React Query hooks for marketplace data.

**Teammate 3 — Review & Test**: Reviews both teammates' code against design system rules,
runs rendering tests, validates responsive behavior.
```

### Cuándo usar qué

| Tarea | Herramienta |
|-------|-------------|
| Conectar 1 página a API | Subagent (api-connector) |
| Review de código | Subagent (code-reviewer) |
| Nuevo componente UI | Subagent (ui-designer) |
| Correr tests | Subagent (test-agent) |
| Conectar TODAS las páginas al backend | Agent Team (3-4 teammates) |
| Feature nueva multi-archivo | Agent Team (2-3 teammates) |
| Refactor grande del design system | Agent Team (lead + 2 teammates) |
| Bug fix simple | Directo (sin subagent) |
| Cambio de copy/texto | Directo (sin subagent) |
