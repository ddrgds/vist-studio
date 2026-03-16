# VIST STUDIO — UX ROADMAP & CLAUDE CODE PLAYBOOK

## CONTEXTO DEL PROYECTO

VIST Studio es una plataforma de virtual influencers con AI image editing.
Stack: React 18 + TypeScript + Tailwind CSS + Vite.
Design system: Plasma Shift palette, Playfair Display / DM Sans, glassmorphism.
Este roadmap prioriza cambios UX por impacto en activación de usuarios nuevos.

---

## PRIORIDAD DE EJECUCIÓN

Ejecutar en este orden estricto. Cada fase es un bloque independiente.
NO avanzar a la siguiente fase sin completar y testear la anterior.

---

## FASE 0 — QUICK WINS (Sesión 1-2)
> Impacto alto, esfuerzo mínimo. Cambios de copy, visibilidad y limpieza.

### 0.1 Unificar branding
- Buscar todas las referencias a "VERTEX", "VERTEX Studio", "Vertex" en el codebase.
- Unificar todo a "VIST Studio" en: sidebar, title tag, meta tags, headers, footers.

### 0.2 Créditos visibles en todas las pantallas de trabajo
- Verificar que el componente de créditos sea visible en Director, AI Editor, Photo Session, Create Character.
- En cada acción que consume créditos, mostrar el costo ANTES de ejecutar:
  - Botón "Generate" → "Generate (20 credits)"

### 0.3 Limpiar jerga interna
- Recent Activity: reemplazar "Unlinked" por "No character" o eliminar el tag.
- Characters: reemplazar prompt técnico visible por resumen humanizado.
- Director: campo "Characteristics" debe mostrar resumen, no prompt raw.
- Gallery: vincular personaje si existe en metadata.

### 0.4 Eliminar métricas fantasma
- Characters: eliminar "Followers" de las stats del personaje.
- Characters: eliminar o simplificar el sistema de estados Draft/Active/Training.
- Gallery: investigar por qué creaciones aparecen con Face Swaps: 0, Relights: 0, etc.

### 0.5 Labels en iconos crípticos
- Gallery: action icons necesitan tooltips (AI Edit, Download, Favorites, Delete).
- AI Editor: iconos de canvas necesitan tooltips.
- Delete necesita confirmación modal.

---

## FASE 1 — EMPTY STATES & ONBOARDING (Sesión 3-5)
> El problema #1 del producto. Sin esto, ningún usuario nuevo se activa.

### 1.1 Dashboard — Empty State
- Si 0 personajes Y 0 creaciones → mostrar onboarding con pipeline visual ①②③.
- CTA "Create Your First Character" → navega a /create-character.
- Carousel de imágenes de ejemplo.

### 1.2 Gallery — Empty State
- "Your gallery is empty" + CTAs a Director y AI Editor.

### 1.3 Characters — Empty State
- "No characters yet" + CTA a Create Character.

### 1.4 Director — Canvas Empty State
- Grid de thumbnails de ejemplo con labels de estilo.

### 1.5 AI Editor — Canvas Empty State
- Ejemplo visual before/after + quick suggestions visibles en canvas.

---

## FASE 2 — REDUCIR FRICCIÓN EN FLUJOS CORE (Sesión 6-8)

### 2.1 Create Character — Defaults inteligentes
- Preseleccionar Render Style: "Photorealistic".
- Campos obligatorios con asterisco rojo.
- Botón "Next" deshabilitado hasta completar obligatorios.

### 2.2 Create Character — Preview dinámica
- Preview se actualiza con cada selección.
- Cada render style con imagen de ejemplo.

### 2.3 Director — Ocultar complejidad
- Modo Simple (default) vs Advanced (opt-in).
- Simple: Character + Pose + Scene + Generate.
- Advanced: Camera, Lighting, References, Characteristics.

### 2.4 AI Editor — Reducir herramientas visibles
- 5 principales visibles + "More Tools +" para las otras 5.
- Guardar preferencia en localStorage.

### 2.5 Photo Session — Organizar vibes
- Agrupar en categorías: Social, Fashion, Lifestyle, Night/Outdoor.
- Numbered steps: Choose base → Pick vibe → Shoot.

---

## FASE 3 — NAVEGACIÓN & PIPELINE VISUAL (Sesión 9-10)

### 3.1 Sidebar — Numerar el pipeline ①②③④
### 3.2 Sidebar — Indicador de progreso ("Start here", "Next step")
### 3.3 Dashboard — Quick Actions con orden del pipeline
### 3.4 Verificar contraste WCAG AA compliance

---

## FASE 4 — POLISH & GALLERY FIX (Sesión 11-12)

### 4.1 Gallery — Thumbnails y metadata mejorados
### 4.2 Gallery — Naming automático ("{Character} · {Tool} · {Setting}")
### 4.3 Gallery — Fix de tagging (toolUsed, characterId, editSettings)
### 4.4 Delete confirmation modal
### 4.5 Photo Session — Preview por vibe con tooltips

---

## CONVENCIONES

- Commits: `fix(ux): [fase].[punto] — descripción corta`
- Branch: `ux/roadmap-fase-N`
- Componentes nuevos: `src/components/ux/`
- Fase 0-1: solo UI, no backend
- Fase 2: imágenes placeholder en `public/examples/`
- Fase 4: cambios en modelo de datos
