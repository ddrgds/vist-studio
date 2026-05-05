# Post-launch bugs — auditoría 2026-05-05

## Bug 1 (P1) — NB2 422 ValidationError consistente
- [x] Capturar body exacto del 422 de NB2 fal.ai
- [ ] Identificar param inválido en payload
- [ ] Fix `generateWithNB2Fal` y/o `editWithNB2Fal`
- [ ] Verificar funciona end-to-end

## Bug 2 (P1) — Editor freeai falla con prompt sensible (NB2+Grok ambos)
- [ ] Capturar body del Grok ValidationError
- [ ] Probable: payload de Grok-fal mal armado para image-to-image edit
- [ ] Fix
- [ ] Verificar

## Bug 3 (P2) — Reimaginar botón Aplicar disabled
- [ ] Investigar `hasCharRefs` en pipelineStore vs character chip
- [ ] Fix handler de selección de chip (llamar `pipelineSetCharacter`)
- [ ] Verificar

## Bug 4 (P2) — Galería thumbnails grises + click no abre preview
- [ ] Investigar handler de click en `Gallery.tsx`
- [ ] Filtrar/ocultar items con imagen rota
- [ ] Fix

## Review
_(se llena al completar)_
