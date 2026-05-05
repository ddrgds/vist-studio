# Quitar Wan del producto — simplificar a NB2 → Grok

## Contexto
Wan via DashScope tiene moderación obligatoria server-side que rechaza vocabulario fashion/lifestyle común en español ("pecho", "lencería", "sensual"). El bypass via fal-ai/wan/v2.7/edit con `enable_safety_checker: false` no funciona porque fal es proxy de DashScope (confirmado empíricamente: el usuario probó "modelo 1 con outfit de la modelo 2 + upper body más pronunciado" → ok, pero "pecho" → rechazo).

Decisión: eliminar Wan completamente, dejar NB2 → Grok como única cadena.

## Plan

### Fase 1 — Quitar Wan del routing  ✅
- [x] 1.1 Mapear callers de Wan
- [x] 1.2 Simplificar `editImageWithAI()` en AIEditorV2.tsx → NB2 → Grok solamente
- [x] 1.3 Quitar engine toggle Wan/NB2 del Studio Hero y Session
- [x] 1.4 Limpiar UploadCharacter de Wan (cadena auto + opción manual)

### Fase 2 — Eliminar código muerto  ✅
- [x] 2.1 Borrar `services/dashscopeService.ts` (~250 líneas)
- [x] 2.2 Eliminar `editWithWan27Fal` y `generateWithWan27Fal` de falService.ts
- [x] 2.3 Limpiar `Wan27*` enums + costs de types.ts
- [x] 2.4 Limpiar Wan de toolEngines.ts (body sheets ahora solo NB2)
- [x] 2.5 Eliminar 3 funciones Wan de replicateService.ts (~257 líneas)
- [x] 2.6 Eliminar `toWanImageSize` y simplificar `cleanDescriptionForFal`

### Fase 3 — Actualizar UI engine selector  ✅
- [x] 3.1 Sacar `dashscope:wan27` del CHARACTER_ENGINES en UploadCharacter
- [x] 3.2 Quitar `dashscope:wan27` de ENGINE_METADATA en types.ts
- [x] 3.3 Quitar 2 toggles Wan/NB2 visuales en AIEditorV2 (desktop + mobile sheet)
- [x] 3.4 Quitar toggle Wan/NB2 en Studio Hero

### Fase 4 — Verificación  ✅
- [x] 4.1 `npx tsc --noEmit` — cero errores nuevos (todos los warnings son pre-existentes)
- [x] 4.2 `npm run build` — exitoso en 14.95s
- [ ] 4.3 Actualizar MEMORY.md (arquitectura simplificada)

## Review

### Archivos modificados (8)
- `pages/AIEditorV2.tsx` — `editImageWithAI` simplificado a NB2→Grok; quitado `editEngine`/`isStylizedChar` state, 2 toggles UI
- `pages/StudioV2.tsx` — Hero/Session pasan a NB2→Grok; quitado `heroEngine` state, toggle UI
- `pages/UploadCharacter.tsx` — `routeGeneration` auto: NB2→Grok directo (sin Wan intermedio); CHARACTER_ENGINES sin Wan
- `services/falService.ts` — eliminadas `editWithWan27Fal`, `generateWithWan27Fal`, `toWanImageSize`, switch cases Wan; `cleanDescriptionForFal` ya no acepta `'wan'`
- `services/replicateService.ts` — eliminadas `generateWithWan27`, `editWithWan27Pro`, `generateSessionWithWan27`, `wanSubmitAndPoll` (~257 líneas)
- `services/toolEngines.ts` — body sheets ya no usan Wan, todas las hojas usan NB2
- `services/dashscopeService.ts` — **eliminado completo**
- `types.ts` — eliminados `FalModel.Wan27Gen/ProGen/Edit/ProEdit`, `ReplicateModel.Wan27Image/ImagePro`, sus costs y entry de ENGINE_METADATA

### Líneas eliminadas
- `dashscopeService.ts`: 250+
- `falService.ts`: ~120 (2 funciones + helper + switch cases)
- `replicateService.ts`: 257 (3 funciones + helper)
- Total: **~625 líneas de código de Wan eliminadas**

### Verificado
- TypeScript compila sin errores nuevos (los warnings restantes son todos pre-existentes y están documentados en MEMORY.md)
- Build de producción exitoso
- Bundle sizes reducidos (falService -30kB, AIEditorV2 más liviano)

### Pendiente / siguiente sesión
- Smoke test manual del editor + studio + creator después del deploy
- Actualizar MEMORY.md
- Commit + deploy a Cloudflare Pages
