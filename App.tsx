import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Contexts (kept from v1 — auth, profile, toast are truly global)
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { ToastProvider } from './contexts/ToastContext';

// Layout
import Sidebar from './layout/Sidebar';
import MobileNav from './layout/MobileNav';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Studio = lazy(() => import('./pages/Studio'));
const Gallery = lazy(() => import('./pages/Gallery'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));

// Auth guard
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Landing = lazy(() => import('./pages/Landing'));

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

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-0)' }}>
      <StoreHydrator />
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}

// Import at top level to avoid circular dependency
import { useAuth } from './contexts/AuthContext';
import { useCharacterStore } from './stores/characterStore';
import { useGalleryStore } from './stores/galleryStore';

/** Hydrates Zustand stores from IndexedDB / Supabase on mount */
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
