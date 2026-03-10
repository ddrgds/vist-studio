import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  PenTool,
  Images,
  MoreHorizontal,
  Camera,
  CreditCard,
  Settings,
} from 'lucide-react';
import type { AppPage } from './SidebarNav';

interface MobileNavProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const PRIMARY_ITEMS: { page: AppPage; icon: React.ElementType; label: string }[] = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { page: 'create', icon: Sparkles, label: 'Create' },
  { page: 'studio', icon: PenTool, label: 'Studio' },
  { page: 'gallery', icon: Images, label: 'Gallery' },
];

const MORE_ITEMS: { page: AppPage; icon: React.ElementType; label: string }[] = [
  { page: 'session', icon: Camera, label: 'Photo Session' },
  { page: 'pricing', icon: CreditCard, label: 'Pricing' },
  { page: 'profile', icon: Settings, label: 'Profile' },
];

const MobileNav: React.FC<MobileNavProps> = ({ activePage, onNavigate }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close popup on outside tap
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [moreOpen]);

  const isMoreActive = MORE_ITEMS.some(i => i.page === activePage);

  return (
    <nav
      className="flex lg:hidden items-center justify-around fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: 56,
        background: '#0D0A0A',
        borderTop: '1px solid #1A1210',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {PRIMARY_ITEMS.map(({ page, icon: Icon, label }) => {
        const isActive = activePage === page;
        return (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 active:scale-95 transition-transform"
            style={{ color: isActive ? '#FF5C35' : '#6B5A56', height: '100%' }}
          >
            <Icon style={{ width: 20, height: 20 }} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
          </button>
        );
      })}

      {/* More button + popup */}
      <div ref={moreRef} className="relative flex-1 flex items-center justify-center" style={{ height: '100%' }}>
        <button
          onClick={() => setMoreOpen(prev => !prev)}
          className="flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
          style={{ color: isMoreActive ? '#FF5C35' : '#6B5A56', height: '100%', width: '100%' }}
        >
          <MoreHorizontal style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>More</span>
        </button>

        {moreOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              right: 4,
              background: '#141010',
              border: '1px solid #1A1210',
              borderRadius: 12,
              padding: '6px 0',
              minWidth: 180,
              boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
            }}
          >
            {MORE_ITEMS.map(({ page, icon: Icon, label }) => {
              const isActive = activePage === page;
              return (
                <button
                  key={page}
                  onClick={() => {
                    onNavigate(page);
                    setMoreOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                  style={{
                    color: isActive ? '#FF5C35' : '#B8A9A5',
                    background: isActive ? 'rgba(255,92,53,0.08)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export default MobileNav;
