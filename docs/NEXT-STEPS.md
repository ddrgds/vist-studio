# VIST Studio — Next Steps (Post-MVP)

Funcionalidades planificadas para después del lanzamiento del MVP.

---

## Video Editor Integrado (Estilo CapCut)

**Prioridad: Alta — primera feature post-MVP**

Editor de video completo dentro de la app para que el usuario no necesite herramientas externas.

### Alcance
- Timeline multi-track (video, audio, texto, stickers)
- Trim / split / merge clips
- Transiciones entre clips (fade, slide, zoom)
- Texto/caption overlay con estilos y animaciones
- Stickers / emojis overlay
- Control de velocidad (slow-mo, fast forward)
- Filtros de color sobre video
- Keyframes de animación
- Chroma key (green screen)
- Picture-in-picture
- Audio mixing (música + voz)
- Auto-captions con timing sincronizado
- Librería de música libre de derechos

### Stack propuesto
- **Remotion** — composición de video como componentes React
- **Fabric.js** — canvas interactivo (drag text, resize stickers, posicionar overlays)
- **FFmpeg.wasm** — export final (codecs, rendering)
- **Web Audio API** — audio mixing y visualización

### UX
- Debe ser tan amigable como CapCut — potente por debajo, simple por arriba
- Templates pre-armados para diferentes formatos (reel, story, post)

---

## Pipeline Combinado: Motion Control + Lip Sync

**Prioridad: Alta**

Flujo automático que combina motion control y lip sync en un solo paso.

### Flujo
```
Usuario sube video (persona hablando + moviéndose)
    ↓
① Separar audio del video (Web Audio API o FFmpeg.wasm)
    ↓
② Motion Control: video (movimientos) + foto personaje → video del personaje
    ↓
③ Lip Sync: video del personaje + audio extraído → personaje moviéndose Y hablando
    ↓
Video final
```

### Variantes
- Usar audio original tal cual (el personaje "dubea" esa voz)
- Convertir a la voz del personaje con ElevenLabs voice cloning

### UI
- Toggle "Preservar audio del video original" en Motion Control
- Si activo → pipeline automático de 3 pasos

---

## Publicación Directa a Redes Sociales

**Prioridad: Media**

### Alcance
- Conectar cuentas de Instagram, TikTok, YouTube
- Publicar fotos y videos directo desde la app
- Calendario de contenido con scheduling
- Captions + hashtags pre-escritos
- Analytics básico de engagement (likes, views, reach)

### APIs necesarias
- Instagram Graph API (requiere Facebook Business account)
- TikTok Content Publishing API
- YouTube Data API v3

---

## Voice Cloning para Personajes

**Prioridad: Media**

- Crear una voz única por personaje usando ElevenLabs Voice Design o Voice Cloning
- La voz se guarda como parte del personaje (como el LoRA para la cara)
- Todos los lip syncs del personaje usan su voz automáticamente

---

## Features de Fase B (de plan anterior)

### Caption Generator
- Portar CaptionModal.tsx de la app anterior
- Generar captions para fotos usando IA
- Sugerir hashtags por plataforma

### A/B Comparator + Slider
- Portar ABComparator.tsx + CompareSliderModal.tsx
- Comparar 2 imágenes lado a lado con slider

### Storyboard View
- Portar StoryboardView.tsx
- Planificar secuencias de contenido visualmente

### Batch Outfit Mode
- Cambiar outfit en múltiples fotos a la vez
- Útil para crear "lookbooks" de un personaje

### Negative Prompt / Image Boost UI
- Control avanzado de prompts negativos
- Boost de calidad de imagen

### Custom Presets
- Guardar/cargar combinaciones de settings
- Compartir presets entre usuarios

### Inspiration Board
- Board estilo Pinterest con ideas de contenido
- Referencia visual para sesiones

### Reuse Parameters
- "Enviar al generador" desde cualquier imagen existente
- Copiar los parámetros de una generación exitosa

---

## Mejoras Técnicas

### Server-Side Image Cropping
- Crop inteligente por formato (aspect-aware framing)
- Detección de cara para centrar el crop

### Supabase Edge Functions
- Migrar de Cloudflare Workers a Edge Functions (largo plazo)
- Rate limiting, job queuing, provider switching sin redeploy

### Testing
- Vitest + React Testing Library para componentes
- Playwright E2E para flujos críticos

### Performance
- Virtualización de galería para 1000+ items
- Lazy loading agresivo de imágenes
- Service Worker para cache de assets

---

*Última actualización: 2026-03-19*
