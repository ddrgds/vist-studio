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

// ── Core pages ──
const CreatePersona = lazy(() => import('./pages/UploadCharacter'));
const Gallery = lazy(() => import('./pages/Gallery'));
const CharacterGallery = lazy(() => import('./pages/CharacterGallery'));
const StudioV2 = lazy(() => import('./pages/StudioV2').then(m => ({ default: m.StudioV2 })));
const AIEditor = lazy(() => import('./pages/AIEditorV2'));

// ── Auth ──
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Landing = lazy(() => import('./pages/Landing'));

// ── Extra ──
const PricingPage = lazy(() => import('./components/PricingPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const ExportModal = lazy(() => import('./features/export/ExportModal'));
const VideoStudio = lazy(() => import('./pages/VideoStudio'));

export type Page = 'create' | 'studio' | 'editor' | 'gallery' | 'characters' | 'pricing' | 'profile' | 'video';

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
            role="dialog"
            aria-modal="true"
            aria-label="Iniciar sesión"
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
    video: <VideoStudio onNav={handleNav} />,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--joi-bg-0)' }}>
      <StoreHydrator />

      <Sidebar page={page} onNav={handleNav} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <main
        ref={mainRef}
        role="main"
        aria-label="Contenido principal"
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
          {/* Keep main pages mounted to preserve state */}
          {(['studio', 'editor', 'gallery', 'create'] as Page[]).map(p => (
            <div key={p} style={{ display: page === p ? 'contents' : 'none' }}>
              {pages[p]}
            </div>
          ))}
          {/* Lazy pages — mount only when active */}
          {!['studio', 'editor', 'gallery', 'create'].includes(page) && pages[page]}
        </Suspense>
      </main>

      <MobileNav page={page} onNav={handleNav} />

      {/* Credit balance badge — always visible on mobile */}
      <CreditBadge onNav={handleNav} />

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

function CreditBadge({ onNav }: { onNav: (p: Page) => void }) {
  const { profile } = useProfile();
  const credits = profile?.creditsRemaining ?? 0;
  const isLow = credits < 20;
  return (
    <button
      onClick={() => onNav('pricing')}
      className="fixed top-3 right-3 lg:hidden z-[55] flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
      style={{
        background: isLow ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isLow ? 'rgba(248,113,113,0.3)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        color: isLow ? '#DC2626' : '#1A1A1A',
      }}
      title="Créditos disponibles"
    >
      <span style={{ fontSize: '0.7rem' }}>✦</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{credits}</span>
      <span style={{ fontSize: '0.6rem', color: isLow ? '#DC2626' : '#999' }}>cr</span>
    </button>
  );
}

import { useProfile } from './contexts/ProfileContext';

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
