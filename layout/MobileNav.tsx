import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/',        icon: '⬡',  label: 'Home' },
  { path: '/studio',  icon: '✦',  label: 'Studio' },
  { path: '/gallery', icon: '▦',  label: 'Gallery' },
];

const MORE_ITEMS = [
  { path: '/pricing', icon: '◇', label: 'Pricing' },
  { path: '/profile', icon: '⚙', label: 'Profile' },
];

const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    <div className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-0)]/95 backdrop-blur-sm border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex w-full justify-around items-center py-2">
        {TABS.map(({ path, icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={[
                'flex flex-col items-center gap-0.5 px-4 py-1.5 transition-all duration-150',
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-3)]',
              ].join(' ')}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}

        {/* More button */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className={[
              'flex flex-col items-center gap-0.5 px-4 py-1.5 transition-all duration-150',
              showMore ? 'text-[var(--accent)]' : 'text-[var(--text-3)]',
            ].join(' ')}
          >
            <span className="text-xl leading-none">⋯</span>
            <span className="text-[10px] font-medium">More</span>
          </button>

          {showMore && (
            <div className="absolute bottom-full right-4 mb-2 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl shadow-2xl p-1.5 min-w-[160px]">
              {MORE_ITEMS.map(({ path, icon, label }, idx) => (
                <button
                  key={path}
                  onClick={() => { navigate(path); setShowMore(false); }}
                  className="fade-in-stagger flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[var(--text-2)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-1)] transition-all duration-150 w-full text-left"
                  style={{ animationDelay: `${idx * 50}ms` }}
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
