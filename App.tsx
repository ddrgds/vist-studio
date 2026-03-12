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

// Lazy-loaded pages (reference 9-page architecture)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Director = lazy(() => import('./pages/Director'));
const UploadCharacter = lazy(() => import('./pages/UploadCharacter'));
const PhotoSession = lazy(() => import('./pages/PhotoSession'));
const AIEditor = lazy(() => import('./pages/AIEditor'));
const Gallery = lazy(() => import('./pages/Gallery'));
const CharacterGallery = lazy(() => import('./pages/CharacterGallery'));
const UniverseBuilder = lazy(() => import('./pages/UniverseBuilder'));
const ContentCalendar = lazy(() => import('./pages/ContentCalendar'));
const Analytics = lazy(() => import('./pages/Analytics'));

// Auth
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Landing = lazy(() => import('./pages/Landing'));

// Extra pages
const PricingPage = lazy(() => import('./components/PricingPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));

export type Page = 'dashboard' | 'director' | 'upload' | 'session' | 'editor' | 'gallery' | 'characters' | 'universe' | 'content' | 'analytics' | 'pricing' | 'profile';

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
        background: 'var(--bg-0)',
        color: 'var(--text-3)',
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
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', color: 'var(--text-3)', fontSize: 14 }}>
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

/** Main app shell — matches vertex-studio-source/src/App.tsx */
function AuthenticatedApp() {
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [transitioning, setTransitioning] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const handleNav = useCallback((p: Page) => {
    if (p === page) return;
    setTransitioning(true);
    setTimeout(() => {
      setPage(p);
      setTransitioning(false);
      if (mainRef.current) mainRef.current.scrollTop = 0;
    }, 150);
  }, [page]);

  // Cursor glow + card hover effect
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const pages: Record<Page, JSX.Element> = {
    dashboard: <Dashboard onNav={handleNav} />,
    director: <Director onNav={handleNav} />,
    upload: <UploadCharacter onNav={handleNav} />,
    session: <PhotoSession onNav={handleNav} />,
    editor: <AIEditor onNav={handleNav} />,
    gallery: <Gallery onNav={handleNav} />,
    characters: <CharacterGallery />,
    universe: <UniverseBuilder />,
    content: <ContentCalendar />,
    analytics: <Analytics />,
    pricing: <PricingPage />,
    profile: <ProfilePage />,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-0)' }}>
      <StoreHydrator />

      {/* Ambient cursor glow */}
      <div
        className="cursor-glow"
        style={{ left: mousePos.x, top: mousePos.y, opacity: 0.8 }}
      />

      <Sidebar page={page} onNav={handleNav} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateY(6px)' : 'translateY(0)',
          transition: 'opacity .15s ease, transform .15s ease',
        }}
      >
        <Suspense fallback={
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
          }}>
            Loading...
          </div>
        }>
          {pages[page]}
        </Suspense>
      </main>

      <MobileNav />
    </div>
  );
}

// Imports at bottom to avoid circular deps
import { useAuth } from './contexts/AuthContext';
import { useCharacterStore } from './stores/characterStore';
import { useGalleryStore } from './stores/galleryStore';

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
