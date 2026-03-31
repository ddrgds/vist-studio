import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { ToastProvider } from './contexts/ToastContext';

// Sidebar — reference design
import { Sidebar } from './components/Sidebar';

// Layout
import MobileNav from './layout/MobileNav';

// ── Core pages (3-step flow: Create → Content → Gallery) ──
const CreatePersona = lazy(() => import('./pages/UploadCharacter'));
const ContentStudio = lazy(() => import('./pages/ContentStudio'));
const Gallery = lazy(() => import('./pages/Gallery'));
const CharacterGallery = lazy(() => import('./pages/CharacterGallery'));

// ── Auth ──
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Landing = lazy(() => import('./pages/Landing'));

// ── Extra ──
const PricingPage = lazy(() => import('./components/PricingPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AIEditor = lazy(() => import('./pages/AIEditorV2'));
const ExportModal = lazy(() => import('./features/export/ExportModal'));
const PhotoSession = lazy(() => import('./pages/PhotoSession'));
const VideoStudio = lazy(() => import('./pages/VideoStudio'));
const StudioV2 = lazy(() => import('./pages/StudioV2').then(m => ({ default: m.StudioV2 })));

export type Page = 'create' | 'studio' | 'editor' | 'gallery' | 'characters' | 'pricing' | 'profile' | 'carousel' | 'video';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <ToastProvider>
            <AppLayout />
          </ToastProvider>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppLayout() {
  const { user, authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (authLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--joi-bg-0)',
        color: 'var(--joi-text-3)',
        fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Suspense fallback={
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--joi-bg-0)', color: 'var(--joi-text-3)', fontSize: 14 }}>
            Loading...
          </div>
        }>
          <Landing onAuth={() => setShowAuth(true)} />
        </Suspense>
        {showAuth && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(8,7,12,0.8)', backdropFilter: 'blur(12px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
          >
            <Suspense fallback={null}>
              <AuthScreen onClose={() => setShowAuth(false)} />
            </Suspense>
          </div>
        )}
      </>
    );
  }

  return <AuthenticatedApp />;
}

/** Main app shell — VIST Studio */
function AuthenticatedApp() {
  const [page, setPage] = useState<Page>('studio');
  const [collapsed, setCollapsed] = useState(false);

  // Theme initialization — reads saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [])
  const [transitioning, setTransitioning] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Global editor overlay — can be opened from ANY page
  const [editorOpen, setEditorOpen] = useState(false);
  const openEditor = useCallback((imageUrl: string) => {
    usePipelineStore.getState().setHeroShot(imageUrl);
    setEditorOpen(true);
  }, []);
  const closeEditor = useCallback(() => setEditorOpen(false), []);

  // Global export modal — can be opened from ANY page
  const [exportImageUrl, setExportImageUrl] = useState<string | null>(null);
  const openExport = useCallback((url: string) => setExportImageUrl(url), []);
  const closeExport = useCallback(() => setExportImageUrl(null), []);

  const handleNav = useCallback((p: Page) => {
    if (p === page) return;
    setTransitioning(true);
    setTimeout(() => {
      setPage(p);
      setTransitioning(false);
      if (mainRef.current) mainRef.current.scrollTop = 0;
    }, 150);
  }, [page]);


  const pages: Record<Page, JSX.Element> = {
    create: <CreatePersona onNav={handleNav} />,
    studio: <StudioV2 onNav={handleNav} onEditImage={openEditor} onExportImage={openExport} />,
    editor: <AIEditor onNav={handleNav} />,
    gallery: <Gallery onNav={handleNav} onEditImage={openEditor} onExportImage={openExport} />,
    characters: <CharacterGallery onNav={handleNav} />,
    pricing: <PricingPage />,
    profile: <ProfilePage />,
    carousel: <PhotoSession onNav={handleNav} />,
    video: <VideoStudio onNav={handleNav} />,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--joi-bg-0)' }}>
      <StoreHydrator />

      <Sidebar page={page} onNav={handleNav} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative pb-16 lg:pb-0"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: 'opacity .15s ease',
        }}
      >
        <Suspense fallback={
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--joi-text-3)',
          }}>
            Loading...
          </div>
        }>
          {pages[page]}
        </Suspense>
      </main>

      <MobileNav page={page} onNav={handleNav} />

      {/* Global Export Modal — accessible from any page */}
      {exportImageUrl && (
        <Suspense fallback={null}>
          <ExportModal imageUrl={exportImageUrl} onClose={closeExport} />
        </Suspense>
      )}

      {/* Global AI Editor Overlay — accessible from any page */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-0)' }}>
          <div className="shrink-0 flex items-center justify-between px-5 py-2.5"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>AI Editor</span>
            <button onClick={closeEditor}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-3)' }}>
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="h-full flex items-center justify-center" style={{ color: 'var(--joi-text-3)' }}>Loading Editor...</div>
            }>
              <AIEditor onNav={handleNav} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

// Imports at bottom to avoid circular deps
import { useAuth } from './contexts/AuthContext';
import { useCharacterStore } from './stores/characterStore';
import { useGalleryStore } from './stores/galleryStore';
import { usePipelineStore } from './stores/pipelineStore';

function StoreHydrator() {
  const { user } = useAuth();
  const hydrateCharacters = useCharacterStore(s => s.hydrate);
  const hydrateGallery = useGalleryStore(s => s.hydrate);

  useEffect(() => {
    const userId = user?.id;
    hydrateCharacters(userId);
    hydrateGallery(userId);
  }, [user?.id, hydrateCharacters, hydrateGallery]);

  return null;
}

export default App;
