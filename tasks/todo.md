# Integración UI Vertex Studio — vertex-studio-source → app real

## Contexto
La UI definitiva está en `vertex-studio-source/src/`.
La app actual tiene arquitectura diferente (Studio monolítico vs 9 páginas independientes).
Hay que reemplazar la UI actual con la de referencia y conectar la lógica existente.

## Lógica existente que se CONSERVA (no se toca):
- `contexts/AuthContext.tsx` — auth Supabase
- `contexts/ProfileContext.tsx` — perfil + créditos
- `contexts/ToastContext.tsx` — notificaciones
- `stores/characterStore.ts` — personajes (Zustand + IndexedDB + Supabase)
- `stores/galleryStore.ts` — galería (Zustand + IndexedDB + Supabase)
- `stores/studioStore.ts` — estado del studio
- `services/*` — gemini, fal, replicate, openai, ideogram, modelslab, supabase
- `hooks/useSubscription.ts` — suscripción
- `functions/*` — Cloudflare proxy functions
- `models/*` — model registry

## Plan de ejecución

### Fase 0: Infraestructura de diseño
- [ ] 0.1 Copiar `vertex-studio-source/src/index.css` → `src/index.css` (reemplazar)
- [ ] 0.2 Copiar `vertex-studio-source/src/components/Sidebar.tsx` → adaptar con auth/profile real
- [ ] 0.3 Actualizar `App.tsx` con routing de 9 páginas + cursor glow + transitions

### Fase 1: Páginas CREAR (copiar ref → conectar lógica)
- [ ] 1.1 Dashboard — copiar ref, conectar characterStore + galleryStore + profile
- [ ] 1.2 UploadCharacter — copiar ref, conectar characterStore.addCharacter
- [ ] 1.3 PhotoSession — copiar ref, conectar services de generación (gemini/fal)
- [ ] 1.4 AIEditor — copiar ref, conectar 8 herramientas IA a services existentes
- [ ] 1.5 UniverseBuilder — copiar ref (mock por ahora, no hay backend)

### Fase 2: Páginas GESTIONAR (copiar ref → conectar lógica)
- [ ] 2.1 Gallery — copiar ref, conectar galleryStore
- [ ] 2.2 CharacterGallery — copiar ref, conectar characterStore
- [ ] 2.3 ContentCalendar — copiar ref (mock por ahora)
- [ ] 2.4 Analytics — copiar ref (mock por ahora)

### Fase 3: Verificación
- [ ] 3.1 Build sin errores TypeScript
- [ ] 3.2 Cada página renderiza correctamente
- [ ] 3.3 Navegación funciona entre las 9 páginas
- [ ] 3.4 Auth flow funciona (landing → login → dashboard)
- [ ] 3.5 Deploy a Cloudflare Pages

## Review
_(se llena al completar)_
