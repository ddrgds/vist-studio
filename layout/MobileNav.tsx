import React, { useState, useRef, useEffect } from 'react';
import type { Page } from '../App';

const TABS: { id: Page; icon: string; label: string }[] = [
  { id: 'studio',     icon: '✦',  label: 'Studio' },
  { id: 'gallery',    icon: '▦',  label: 'Galería' },
  { id: 'create',     icon: '+',  label: 'Crear' },
  { id: 'characters', icon: '◉',  label: 'Personas' },
];

const MORE_ITEMS: { id: Page; icon: string; label: string }[] = [
  { id: 'video', icon: '▶', label: 'Video' },
  { id: 'pricing', icon: '◇', label: 'Precios' },
  { id: 'profile', icon: '⚙', label: 'Perfil' },
];

interface Props {
  page: Page;
  onNav: (p: Page) => void;
}

const MobileNav: React.FC<Props> = ({ page, onNav }) => {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
    };
    if (showMore) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  return (
    <div className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-sm"
      style={{
        background: 'rgba(8,7,13,0.94)',
        borderTop: '1px solid rgba(255,255,255,.05)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      <div className="flex w-full justify-around items-center py-2">
        {TABS.map(({ id, icon, label }) => {
          const isActive = page === id;
          const isPrimary = id === 'create';
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 relative"
              style={{
                color: isActive ? 'rgba(255,255,255,0.95)' : 'var(--joi-text-3)',
                background: isActive && !isPrimary ? 'rgba(255,255,255,0.06)' : 'transparent',
                ...(isPrimary ? {
                  background: 'linear-gradient(135deg, var(--joi-pink), var(--joi-violet))',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  color: 'white',
                  justifyContent: 'center',
                  marginTop: -8,
                  boxShadow: '0 4px 16px rgba(99,102,241,.35)',
                } : {}),
              }}
            >
              {isActive && !isPrimary && (
                <span style={{
                  position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 14, height: 2, borderRadius: 1,
                  background: 'rgba(255,255,255,0.5)',
                }} />
              )}
              <span className="text-xl leading-none">{icon}</span>
              {!isPrimary && <span className="text-[10px] font-medium">{label}</span>}
            </button>
          );
        })}

        {/* More button */}
        <div ref={moreRef} className="relative">
          {MORE_ITEMS.some(i => i.id === page) && (
            <span style={{
              position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)',
              width: 14, height: 2, borderRadius: 1,
              background: 'rgba(255,255,255,0.5)',
            }} />
          )}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150"
            style={{
              color: showMore || MORE_ITEMS.some(i => i.id === page) ? 'rgba(255,255,255,0.95)' : 'var(--joi-text-3)',
              background: MORE_ITEMS.some(i => i.id === page) ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
          >
            <span className="text-xl leading-none">⋯</span>
            <span className="text-[10px] font-medium">Más</span>
          </button>

          {showMore && (
            <div className="absolute bottom-full right-0 mb-2 rounded-xl shadow-2xl p-1.5 min-w-[160px] joi-glass">
              {MORE_ITEMS.map(({ id, icon, label }, idx) => (
                <button
                  key={id}
                  onClick={() => { onNav(id); setShowMore(false); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.03)] transition-all duration-150 w-full text-left"
                  style={{ color: 'var(--joi-text-2)', animationDelay: `${idx * 50}ms` }}
                >
                  <span className="text-base">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
