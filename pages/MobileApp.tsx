/**
 * MobileApp — Native shell for Capacitor (iOS / Android).
 *
 * Renders ONLY the premium app suite (Headshot Pro, Reimaginar, etc.) plus
 * a minimal home + galería + personajes. The full desktop sidebar / Studio /
 * Editor IA stay on web.
 *
 * Detection: Capacitor.isNativePlatform() OR ?mobile=1 in URL (for browser testing).
 */
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Aperture, Home, Images, User, Sparkles, Wand2, Lock } from 'lucide-react';
import type { Page } from '../App';
import { useCharacterStore } from '../stores/characterStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useProfile } from '../contexts/ProfileContext';
import { hapticLight } from '../services/nativeService';

const HeadshotPro = lazy(() => import('./HeadshotPro'));
const Reimaginar = lazy(() => import('./Reimaginar'));
const SesionDeFotos = lazy(() => import('./SesionDeFotos'));
const CrearPersonaje = lazy(() => import('./CrearPersonaje'));
const Personajes = lazy(() => import('./Personajes'));
const MobileEditor = lazy(() => import('./MobileEditor'));
const MobileGallery = lazy(() => import('./MobileGallery'));
const MobileProfile = lazy(() => import('./MobileProfile'));
const Recast = lazy(() => import('./Recast'));
const Reels = lazy(() => import('./Reels'));
const VideoEdit = lazy(() => import('./VideoEdit'));
const Imagina = lazy(() => import('./Imagina'));
const MobileOnboarding = lazy(() => import('./MobileOnboarding'));
const PricingPage = lazy(() => import('../components/PricingPage'));

type MobilePage = 'home' | 'headshot' | 'reimaginar' | 'sesion' | 'editor' | 'recast' | 'reels' | 'videoedit' | 'imagina' | 'create' | 'gallery' | 'characters' | 'profile' | 'pricing';

interface AppEntry {
  id: MobilePage | 'soon';
  name: string;
  tagline: string;
  cost: string;
  bg: string;
  accent: string;
  isLive: boolean;
  isNew?: boolean;
  comingSoon?: string;
}

// Custom-generated thumbnails (Flux 2 Pro, 2026-05-13) live in
// public/app-thumbs/. They replace the generic Unsplash stock photos and
// communicate each app's function in a unified warm cream/clay palette.
const APPS: AppEntry[] = [
  {
    id: 'headshot', name: 'Headshot Pro', tagline: 'Retratos profesionales',
    cost: '10 cr · 30s',
    bg: '/app-thumbs/headshot.jpg',
    accent: '#C9785C', isLive: true, isNew: true,
  },
  {
    id: 'reimaginar', name: 'Reimaginar', tagline: '500+ estéticas',
    cost: '10 cr · 20s',
    bg: '/app-thumbs/reimaginar.jpg',
    accent: '#8B4566', isLive: true, isNew: true,
  },
  {
    id: 'sesion', name: 'Sesión de Fotos', tagline: 'Multi-foto coherente',
    cost: '16-40 cr · 4-12 fotos',
    bg: '/app-thumbs/sesion.jpg',
    accent: '#B0772D', isLive: true, isNew: true,
  },
  {
    id: 'editor', name: 'Editor IA', tagline: 'Reluz, estilo, piel, AI Edit',
    cost: '6-13 cr · por edición',
    bg: '/app-thumbs/editor.jpg',
    accent: '#C9785C', isLive: true, isNew: true,
  },
  {
    id: 'recast', name: 'Recast', tagline: 'Grábate tú, aparece tu modelo',
    cost: '60-230 cr · 5-10s',
    bg: '/app-thumbs/recast.jpg',
    accent: '#B0542D', isLive: true, isNew: true,
  },
  {
    id: 'reels', name: 'Reels', tagline: 'Una foto → reel vertical 1080p',
    cost: '145-290 cr · 5-10s',
    bg: '/app-thumbs/reels.jpg',
    accent: '#D85478', isLive: true, isNew: true,
  },
  {
    id: 'videoedit', name: 'Editar Video', tagline: 'Cambia fondo, outfit, color en un video',
    cost: '145 cr · 3-60s',
    bg: '/app-thumbs/videoedit.jpg',
    accent: '#9C6D2A', isLive: true, isNew: true,
  },
  {
    id: 'imagina', name: 'Imagina', tagline: 'Variaciones de una foto que amas',
    cost: '6-32 cr · 1-9 fotos',
    bg: '/app-thumbs/imagina.jpg',
    accent: '#C9785C', isLive: true, isNew: true,
  },
];

// ─── Home ──────────────────────────────────────

function MobileHome({ onNav }: { onNav: (p: MobilePage) => void }) {
  const characters = useCharacterStore(s => s.characters);
  const { profile } = useProfile();
  const credits = profile?.creditsRemaining ?? 0;
  const displayName = profile?.displayName || 'Tú';
  const primary = characters[0];
  const isCreator = profile?.contentMode === 'creator';

  return (
    <div className="m-home">
      <div className="m-topbar">
        <button
          className="m-greet m-greet-btn"
          onClick={() => { hapticLight(); onNav('profile'); }}
          aria-label="Abrir perfil y configuración"
        >
          <div
            className="m-avatar"
            style={primary?.thumbnail ? { backgroundImage: `url(${primary.thumbnail})` } : undefined}
          >
            {isCreator && <span className="m-avatar-badge" title="Modo Creator activo">+18</span>}
          </div>
          <div className="m-greet-text">
            <small>Hola</small>
            <strong>{displayName}</strong>
          </div>
        </button>
        <div className="m-credits">
          <span className="m-credits-dot" />
          <span>{credits.toLocaleString()}</span>
        </div>
      </div>

      <section className="m-hero">
        <div className="m-hero-eyebrow">App de la semana</div>
        <h1 className="m-hero-title">Tu primer<br /><em>retrato pro.</em></h1>
        <p className="m-hero-sub">Editorial, corporativo, beauty. En 30 segundos.</p>
        <button className="m-hero-cta" onClick={() => onNav('headshot')}>
          <Aperture size={14} />
          Probar Headshot Pro
        </button>
      </section>

      {/* Foundation: Crear personaje — prominent when 0, compact when 1+ */}
      {characters.length === 0 ? (
        <section className="m-section">
          <div className="m-section-head">
            <span className="m-eyebrow">Empieza aquí</span>
            <h2 className="m-section-title">Construye tu <em>modelo</em></h2>
          </div>
          <button className="m-foundation" onClick={() => onNav('create')}>
            <div className="m-foundation-step">1</div>
            <div className="m-foundation-text">
              <strong>Crear Personaje</strong>
              <small>Tu modelo virtual desde cero · 5 minutos</small>
            </div>
            <Sparkles size={18} />
          </button>
        </section>
      ) : (
        <section className="m-section">
          <button className="m-create-quick" onClick={() => onNav('create')}>
            <span className="m-create-quick-icon"><Sparkles size={14} /></span>
            <span className="m-create-quick-text">
              Crear nuevo personaje
              <small>{characters.length} personaje{characters.length === 1 ? '' : 's'} guardado{characters.length === 1 ? '' : 's'}</small>
            </span>
            <span className="m-create-quick-arrow">→</span>
          </button>
        </section>
      )}

      {/* Apps grid */}
      <section className="m-section">
        <div className="m-section-head">
          <span className="m-eyebrow">Apps premium</span>
          <h2 className="m-section-title">Suite <em>VIST</em></h2>
        </div>

        <div className="m-apps-grid">
          {APPS.map((app, i) => (
            <button
              key={`${app.name}-${i}`}
              className={`m-app-card ${!app.isLive ? 'is-soon' : ''}`}
              disabled={!app.isLive}
              onClick={() => { if (app.isLive) { hapticLight(); onNav(app.id as MobilePage); } }}
              style={{ '--app-accent': app.accent } as React.CSSProperties}
            >
              <div className="m-app-bg" style={{ backgroundImage: `url(${app.bg})` }} />
              {app.isNew && <span className="m-app-new">Nuevo</span>}
              {app.comingSoon && (
                <span className="m-app-soon">
                  <Lock size={9} /> {app.comingSoon}
                </span>
              )}
              <div className="m-app-corner">
                <span className="m-app-dot" style={{ background: app.accent }} />
                <span>{app.name}</span>
              </div>
              <div className="m-app-content">
                <h3>{app.name.split(' ')[0]} <em>{app.name.split(' ').slice(1).join(' ') || '·'}</em></h3>
                <small>{app.tagline}</small>
                <div className="m-app-meta">{app.cost}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div style={{ height: 24 }} />
    </div>
  );
}

// ─── Bottom nav ────────────────────────────────

function MobileBottomNav({ active, onNav }: { active: MobilePage; onNav: (p: MobilePage) => void }) {
  const items: { id: MobilePage; label: string; Icon: typeof Home }[] = [
    { id: 'home', label: 'Inicio', Icon: Home },
    { id: 'headshot', label: 'Apps', Icon: Wand2 },
    { id: 'gallery', label: 'Galería', Icon: Images },
    { id: 'characters', label: 'Personajes', Icon: User },
  ];
  return (
    <nav className="m-bottom-nav">
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`m-nav-item ${active === id ? 'is-active' : ''}`}
          onClick={() => { if (active !== id) hapticLight(); onNav(id); }}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── App shell ─────────────────────────────────

export default function MobileApp({ onWebNav }: { onWebNav?: (p: Page) => void }) {
  const [page, setPage] = useState<MobilePage>('home');
  const [transitioning, setTransitioning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const characters = useCharacterStore(s => s.characters);
  const charactersLoading = useCharacterStore(s => s.isLoading);

  // Onboarding gate — only show for users who:
  //   1. Haven't completed/skipped it yet (localStorage flag), AND
  //   2. Have ZERO characters (account is genuinely empty)
  //
  // Wait for characterStore to finish hydrating from cloud/IndexedDB before
  // deciding — otherwise we'd flash onboarding to returning users for a moment.
  // If the user already has 1+ characters and never saw onboarding (cleared
  // localStorage, new device), auto-mark as completed so they don't see it.
  useEffect(() => {
    if (charactersLoading) return;

    let completed = false;
    try { completed = localStorage.getItem('vist_onboarding_completed') === 'true'; } catch { /* ignore */ }

    if (completed) return;

    if (characters.length > 0) {
      // Returning user without the localStorage flag (e.g. new device, cleared
      // storage). They already created characters elsewhere — don't pitch them.
      try { localStorage.setItem('vist_onboarding_completed', 'true'); } catch { /* ignore */ }
      return;
    }

    // True empty account — show after splash settles
    const t = setTimeout(() => setShowOnboarding(true), 400);
    return () => clearTimeout(t);
  }, [charactersLoading, characters.length]);

  // Initialize native UI bits on mount (status bar, splash hide, etc)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark }); // dark text on cream
        await StatusBar.setBackgroundColor({ color: '#F4EDE0' });

        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch (err) {
        if (!cancelled) console.warn('Native UI init failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Bridge: MobilePage 'create' / 'gallery' use existing web pages
  const navigateMobile = (p: MobilePage) => {
    if (p === page) return;
    setTransitioning(true);
    // 100ms fade-out, swap, 100ms fade-in
    setTimeout(() => {
      setPage(p);
      requestAnimationFrame(() => {
        setTransitioning(false);
      });
    }, 100);
  };

  // Handle nav from sub-apps (HeadshotPro, Reimaginar) — they call onNav with
  // web Page semantics ('studio', 'editor', etc). In mobile shell those routes
  // don't exist, so we route them back to home or to the closest mobile equivalent.
  const navigateFromSubApp = (p: Page) => {
    const map: Partial<Record<Page, MobilePage>> = {
      studio: 'home',         // back from app
      editor: 'editor',
      gallery: 'gallery',
      characters: 'characters',
      create: 'create',
      profile: 'profile',
      pricing: 'pricing',
      headshot: 'headshot',
      reimaginar: 'reimaginar',
      sesion: 'sesion',
      recast: 'recast',
      reels: 'reels',
      videoedit: 'videoedit',
      imagina: 'imagina',
    };
    const target = map[p] ?? 'home';
    navigateMobile(target);
    if (onWebNav && !map[p]) onWebNav(p); // fallback for any unmapped
  };

  // Sub-apps render the bottom nav themselves not — hide MobileBottomNav
  // when in a deep sub-app to avoid CTA collision.
  const showBottomNav = page === 'home' || page === 'characters';

  const renderActive = () => {
    switch (page) {
      case 'home':
        return <MobileHome onNav={navigateMobile} />;
      case 'headshot':
        return (
          <Suspense fallback={<MobileLoader />}>
            <HeadshotPro onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'reimaginar':
        return (
          <Suspense fallback={<MobileLoader />}>
            <Reimaginar onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'sesion':
        return (
          <Suspense fallback={<MobileLoader />}>
            <SesionDeFotos onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'editor':
        return (
          <Suspense fallback={<MobileLoader />}>
            <MobileEditor onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'recast':
        return (
          <Suspense fallback={<MobileLoader />}>
            <Recast onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'reels':
        return (
          <Suspense fallback={<MobileLoader />}>
            <Reels onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'videoedit':
        return (
          <Suspense fallback={<MobileLoader />}>
            <VideoEdit onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'imagina':
        return (
          <Suspense fallback={<MobileLoader />}>
            <Imagina onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'create':
        return (
          <Suspense fallback={<MobileLoader />}>
            <CrearPersonaje onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'gallery':
        return (
          <Suspense fallback={<MobileLoader />}>
            <MobileGallery onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'characters':
        return (
          <Suspense fallback={<MobileLoader />}>
            <Personajes onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<MobileLoader />}>
            <MobileProfile onNav={navigateFromSubApp} />
          </Suspense>
        );
      case 'pricing':
        // Reuses PricingPage (also used on desktop). Its grid collapses to
        // 1-column on narrow viewports, so it renders fine in the mobile shell.
        // A floating back button takes the user back to Profile.
        return (
          <div style={{ minHeight: '100vh', position: 'relative' }}>
            <button
              type="button"
              onClick={() => { hapticLight(); navigateMobile('profile'); }}
              style={{
                position: 'fixed',
                top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
                left: 12,
                zIndex: 100,
                background: 'rgba(255,252,245,0.92)',
                border: '1px solid rgba(31,26,20,0.10)',
                borderRadius: 999,
                padding: '7px 14px 7px 11px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                fontWeight: 500,
                color: '#1F1A14',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              ← Volver
            </button>
            <Suspense fallback={<MobileLoader />}>
              <PricingPage />
            </Suspense>
          </div>
        );
      default:
        return <MobileHome onNav={navigateMobile} />;
    }
  };

  return (
    <div className="m-shell">
      <style>{MOBILE_STYLES}</style>
      <div
        className="m-content"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 140ms ease-out',
        }}
      >
        {renderActive()}
      </div>
      {showBottomNav && !showOnboarding && <MobileBottomNav active={page} onNav={navigateMobile} />}

      {showOnboarding && (
        <Suspense fallback={null}>
          <MobileOnboarding
            onClose={() => setShowOnboarding(false)}
            onLaunch={(target) => {
              setShowOnboarding(false);
              navigateFromSubApp(target);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

function MobileLoader() {
  return (
    <div className="m-loader">
      <div className="m-loader-dot" />
      <div className="m-loader-dot" />
      <div className="m-loader-dot" />
    </div>
  );
}

// ─── Styles ────────────────────────────────────

const MOBILE_STYLES = `
.m-shell {
  --bg-0: #F4EDE0;
  --bg-card: #FFFCF5;
  --paper: #F2E8D2;
  --ink-0: #1F1A14;
  --ink-1: #3D332A;
  --ink-2: #6F5E4C;
  --ink-3: #A8957D;
  --line: rgba(31, 26, 20, 0.10);
  --gold: #D4A85F;
  --ease: cubic-bezier(0.32, 0.72, 0, 1);

  position: fixed; inset: 0;
  background: var(--bg-0);
  color: var(--ink-0);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.m-shell .m-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  overscroll-behavior-y: contain;
  padding-bottom: 0;
}

/* ── Home ── */
.m-shell .m-home {
  padding-bottom: 110px;
  background-image:
    radial-gradient(circle at 20% 10%, rgba(31,26,20,0.025) 1px, transparent 1px),
    radial-gradient(circle at 80% 60%, rgba(31,26,20,0.02) 1px, transparent 1px);
  background-size: 28px 28px, 44px 44px;
}
.m-shell .m-topbar {
  position: sticky; top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top)) 20px 12px;
  background: linear-gradient(180deg, var(--bg-0) 0%, var(--bg-0) 80%, transparent 100%);
  backdrop-filter: blur(8px);
}
.m-shell .m-greet { display: flex; align-items: center; gap: 12px; }
.m-shell .m-greet-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: opacity 0.3s var(--ease);
}
.m-shell .m-greet-btn:active { opacity: 0.7; }
.m-shell .m-avatar {
  position: relative;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--paper);
  background-size: cover; background-position: center;
  border: 2px solid var(--bg-card);
  box-shadow: 0 0 0 1px var(--line);
  flex-shrink: 0;
}
.m-shell .m-avatar-badge {
  position: absolute;
  bottom: -4px; right: -6px;
  background: #8B4566;
  color: #FFFCF5;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 5px;
  border-radius: 6px;
  border: 1.5px solid var(--bg-0);
  line-height: 1;
}

/* Profile page wrapper */
.m-shell .m-profile-wrap {
  background: var(--bg-0);
  min-height: 100%;
  padding-bottom: 100px;
}
.m-shell .m-profile-back {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 20px 10px;
  background: linear-gradient(180deg, var(--bg-0) 0%, var(--bg-0) 80%, transparent 100%);
  backdrop-filter: blur(8px);
  border: none;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink-1);
  cursor: pointer;
  width: 100%;
  text-align: left;
}
.m-shell .m-greet-text { display: flex; flex-direction: column; line-height: 1.1; }
.m-shell .m-greet-text small {
  font-size: 11px; color: var(--ink-3);
  letter-spacing: 0.05em; text-transform: uppercase;
}
.m-shell .m-greet-text strong {
  font-size: 14px; color: var(--ink-0);
  font-weight: 600; margin-top: 2px;
}
.m-shell .m-credits {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  background: var(--bg-card);
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: var(--ink-0);
}
.m-shell .m-credits-dot {
  width: 6px; height: 6px;
  background: var(--gold);
  border-radius: 50%;
}

.m-shell .m-hero {
  padding: 8px 20px 0;
}
.m-shell .m-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-3);
  margin-bottom: 8px;
}
.m-shell .m-hero-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 40px; line-height: 0.95;
  letter-spacing: -0.02em; color: var(--ink-0);
  font-weight: 400;
}
.m-shell .m-hero-title em { font-style: italic; color: #C9785C; }
.m-shell .m-hero-sub {
  margin-top: 12px; font-size: 13px;
  color: var(--ink-2); max-width: 320px;
  line-height: 1.5;
}
.m-shell .m-hero-cta {
  margin-top: 16px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 18px;
  background: var(--ink-0);
  color: var(--bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
}

.m-shell .m-section { padding: 30px 20px 0; }
.m-shell .m-section-head { margin-bottom: 14px; }
.m-shell .m-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-3);
}
.m-shell .m-section-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 26px; letter-spacing: -0.02em;
  color: var(--ink-0); font-weight: 400;
  margin: 4px 0 0;
  line-height: 1;
}
.m-shell .m-section-title em { font-style: italic; }

/* Foundation */
.m-shell .m-foundation {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 16px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  color: var(--ink-1);
  transition: transform 0.3s var(--ease);
}
.m-shell .m-foundation:active { transform: scale(0.98); }
.m-shell .m-foundation-step {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--ink-0);
  color: var(--bg-card);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px;
  flex-shrink: 0;
}
.m-shell .m-foundation-text { flex: 1; min-width: 0; }
.m-shell .m-foundation-text strong { display: block; font-size: 14px; color: var(--ink-0); }
.m-shell .m-foundation-text small { font-size: 11px; color: var(--ink-2); margin-top: 2px; display: block; }

/* Compact create button (when user already has characters) */
.m-shell .m-create-quick {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 13px 16px;
  background: var(--bg-card);
  border: 1.5px dashed var(--line);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.m-shell .m-create-quick:active { transform: scale(0.98); border-color: var(--ink-0); }
.m-shell .m-create-quick-icon {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-1);
  flex-shrink: 0;
}
.m-shell .m-create-quick-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.m-shell .m-create-quick-text small {
  font-size: 11px; color: var(--ink-3);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.08em;
  margin-top: 2px;
}
.m-shell .m-create-quick-text {
  font-size: 13px; font-weight: 600; color: var(--ink-1);
}
.m-shell .m-create-quick-arrow {
  color: var(--ink-3);
  font-size: 16px;
  flex-shrink: 0;
}

/* Apps grid */
.m-shell .m-apps-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.m-shell .m-app-card {
  position: relative;
  aspect-ratio: 3/4;
  border-radius: 16px;
  overflow: hidden;
  background: #2A1F18;
  cursor: pointer;
  transition: transform 0.3s var(--ease);
  border: none;
  padding: 0;
  font-family: inherit;
  text-align: left;
}
.m-shell .m-app-card:not(:disabled):active { transform: scale(0.97); }
.m-shell .m-app-card.is-soon { opacity: 0.7; cursor: not-allowed; }
.m-shell .m-app-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
}
.m-shell .m-app-card::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%);
}
.m-shell .m-app-corner {
  position: absolute;
  top: 12px; left: 12px;
  display: flex; align-items: center; gap: 6px;
  padding: 4px 9px;
  background: rgba(255, 252, 245, 0.92);
  backdrop-filter: blur(6px);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-0);
  z-index: 2;
}
.m-shell .m-app-dot { width: 5px; height: 5px; border-radius: 50%; }
.m-shell .m-app-new {
  position: absolute;
  top: 12px; right: 12px;
  z-index: 3;
  padding: 4px 9px;
  background: #C9785C;
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 0.18em;
  color: #FFFCF5;
  text-transform: uppercase;
}
.m-shell .m-app-soon {
  position: absolute;
  top: 12px; right: 12px;
  z-index: 3;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 9px;
  background: rgba(20, 16, 14, 0.7);
  backdrop-filter: blur(6px);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 0.16em;
  color: rgba(255, 252, 245, 0.92);
  text-transform: uppercase;
}
.m-shell .m-app-content {
  position: absolute;
  bottom: 14px; left: 14px; right: 14px;
  z-index: 2;
  color: #FFFCF5;
}
.m-shell .m-app-content h3 {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px; line-height: 0.95;
  letter-spacing: -0.01em;
  font-weight: 400;
  margin: 0;
}
.m-shell .m-app-content h3 em { font-style: italic; }
.m-shell .m-app-content small {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 252, 245, 0.78);
  font-weight: 500;
}
.m-shell .m-app-meta {
  margin-top: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: rgba(255, 252, 245, 0.6);
  text-transform: uppercase;
}

/* List pages */
.m-shell .m-list-page {
  padding: max(14px, env(safe-area-inset-top)) 20px 110px;
}
.m-shell .m-list-header {
  display: flex; align-items: center; justify-content: space-between;
  margin: 8px 0 20px;
}
.m-shell .m-list-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 400;
  margin: 0;
}
.m-shell .m-list-add {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: var(--ink-0);
  color: var(--bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
}
.m-shell .m-list-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--ink-2);
}
.m-shell .m-empty-cta {
  margin-top: 14px;
  padding: 11px 20px;
  background: var(--ink-0);
  color: var(--bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
}
.m-shell .m-char-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.m-shell .m-char-card {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  padding: 0;
}
.m-shell .m-char-thumb {
  aspect-ratio: 1;
  background: var(--paper);
  background-size: cover; background-position: center;
}
.m-shell .m-char-name {
  font-size: 13px; font-weight: 600;
  padding: 10px 12px 2px;
}
.m-shell .m-char-meta {
  font-size: 10px; color: var(--ink-3);
  padding: 0 12px 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── Bottom nav ── */
.m-shell .m-bottom-nav {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: rgba(250, 246, 238, 0.94);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--line);
  padding: 10px 12px max(20px, env(safe-area-inset-bottom));
  z-index: 30;
}
.m-shell .m-nav-item {
  display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 10px; font-weight: 500;
  color: var(--ink-3);
  cursor: pointer;
  padding: 4px;
  transition: color 0.3s var(--ease);
}
.m-shell .m-nav-item.is-active { color: var(--ink-0); }

/* ── Loader ── */
.m-shell .m-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60vh;
}
.m-shell .m-loader-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--ink-2);
  animation: m-pulse 1.4s ease-in-out infinite;
}
.m-shell .m-loader-dot:nth-child(2) { animation-delay: 0.2s; }
.m-shell .m-loader-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes m-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}
`;
