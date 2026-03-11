# Conectar páginas al backend — Plan consolidado

## Fase 1: Dashboard real ✅ COMPLETADO
- [x] Stats computados desde gallery items reales
- [x] Activity feed derivado de últimos gallery items
- [x] Character cards con datos reales
- [x] Empty states
- [x] Eliminado DashboardPage.tsx legacy

## Fase 2: Limpieza de código muerto ✅ COMPLETADO

### 2A: Componentes eliminados (31 archivos)
- [x] components/GeneratorPage.tsx
- [x] components/ExplorePage.tsx
- [x] components/ToolsPage.tsx
- [x] components/WelcomeModal.tsx
- [x] components/ApiKeyGuard.tsx
- [x] components/ABComparator.tsx
- [x] components/CustomPresets.tsx
- [x] components/ImageEditor.tsx
- [x] components/CaptionModal.tsx
- [x] components/DetailModal.tsx
- [x] components/ImageModal.tsx
- [x] components/EnhancedInput.tsx
- [x] components/ReferenceInput.tsx
- [x] components/CompareSliderModal.tsx
- [x] components/InspirationBoard.tsx
- [x] components/CommunityFeed.tsx
- [x] components/StoryboardView.tsx
- [x] components/SidebarNav.tsx
- [x] components/MobileNav.tsx
- [x] components/CreatePage.tsx (113KB)
- [x] components/DirectorStudio.tsx (135KB)
- [x] components/StudioEditorPage.tsx (76KB)
- [x] components/PhotoSessionPage.tsx (32KB)
- [x] components/CharacterBuilderPage.tsx (28KB)
- [x] components/CharactersPage.tsx (50KB)
- [x] components/Gallery/GalleryGrid.tsx + directorio
- [x] components/Assistant/PoseAssistantWidget.tsx + directorio

### 2B: Contextos y hooks legacy eliminados
- [x] contexts/FormContext.tsx → reemplazado por studioStore
- [x] contexts/GalleryContext.tsx → reemplazado por galleryStore
- [x] contexts/CharacterLibraryContext.tsx → reemplazado por characterStore
- [x] hooks/useGeneration.ts → código muerto, no importado

### 2C: Sidebar placeholders arreglados
- [x] Items placeholder (Universo, Contenido, Analytics) muestran opacity 40%, badge "SOON", cursor default, no navegan
- [x] Tooltip "Próximamente" en hover

## Review
- **31 archivos eliminados** (~700KB+ de código muerto)
- **TypeScript compila sin errores** después de toda la limpieza
- **Cero regresiones**: los 3 componentes activos en components/ (AuthScreen, PricingPage, ProfilePage) no fueron tocados
- **Sistema activo confirmado**: pages/ + features/studio/ + stores/ + services/
- **Sidebar limpio**: placeholders claramente marcados visualmente
- **Solo quedan en components/**: AuthScreen.tsx, PricingPage.tsx, ProfilePage.tsx, AutocompleteInput.tsx, CharacteristicsInput.tsx, ProgressBar.tsx, UploadZone.tsx, FaceSwapModal.tsx, InpaintingModal.tsx, RelightModal.tsx, SkinEnhancerModal.tsx, TryOnModal.tsx
