import React, { useState, useRef, useEffect } from 'react'
import { LayoutGrid, Sparkles, PenTool, Wand2, MoreHorizontal, Users, Play, CreditCard, Settings } from 'lucide-react'
import type { Page } from '../App'

const TABS: { id: Page; icon: React.ElementType; label: string }[] = [
  { id: 'gallery',  icon: LayoutGrid, label: 'Galeria' },
  { id: 'studio',   icon: Sparkles,   label: 'Studio' },
  { id: 'editor',   icon: PenTool,    label: 'Editor' },
  { id: 'create',   icon: Wand2,      label: 'Crear' },
]

const MORE_ITEMS: { id: Page; icon: React.ElementType; label: string }[] = [
  { id: 'characters', icon: Users,      label: 'Personas' },
  { id: 'video',      icon: Play,       label: 'Video' },
  { id: 'pricing',    icon: CreditCard, label: 'Precios' },
  { id: 'profile',    icon: Settings,   label: 'Perfil' },
]

interface Props {
  page: Page
  onNav: (p: Page) => void
}

const MobileNav: React.FC<Props> = ({ page, onNav }) => {
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false)
    }
    if (showMore) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMore])

  // Measure label width for underline animation
  useEffect(() => {
    const activeTabIdx = TABS.findIndex(t => t.id === page)
    if (activeTabIdx >= 0 && labelRefs.current[activeTabIdx]) {
      const w = labelRefs.current[activeTabIdx]!.offsetWidth
      itemRefs.current[activeTabIdx]?.style.setProperty('--line-w', `${w}px`)
    }
  }, [page])

  const isMoreActive = MORE_ITEMS.some(i => i.id === page)

  return (
    <nav role="navigation" aria-label="Navegación móvil" className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      <div className="flex w-full justify-around items-end px-1 pt-1.5 pb-1">
        {TABS.map(({ id, icon: Icon, label }, idx) => {
          const isActive = page === id
          return (
            <button
              key={id}
              ref={el => (itemRefs.current[idx] = el)}
              onClick={() => onNav(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center gap-0.5 relative transition-all duration-200"
              style={{
                '--line-w': '0px',
                color: isActive ? '#1A1A1A' : '#999',
                minWidth: 56,
                padding: '6px 4px 4px',
              } as React.CSSProperties}
            >
              {/* Bounce icon */}
              <span style={{
                display: 'flex',
                animation: isActive ? 'navBounce 0.5s ease' : 'none',
                transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'transform 0.2s',
              }}>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
              </span>

              {/* Label */}
              <span
                ref={el => (labelRefs.current[idx] = el)}
                className="text-[10px] font-medium transition-all duration-200"
                style={{
                  opacity: isActive ? 1 : 0.7,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {label}
              </span>

              {/* Active underline */}
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: isActive ? 'var(--line-w)' : 0,
                height: 2,
                borderRadius: 1,
                background: '#1A1A1A',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </button>
          )
        })}

        {/* More button */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            aria-label="Más opciones"
            aria-expanded={showMore}
            className="flex flex-col items-center gap-0.5 transition-all duration-200"
            style={{
              color: isMoreActive || showMore ? '#1A1A1A' : '#999',
              minWidth: 56,
              padding: '6px 4px 4px',
            }}
          >
            <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.2 : 1.6} />
            <span className="text-[10px]" style={{ fontWeight: isMoreActive ? 600 : 400, opacity: isMoreActive ? 1 : 0.7 }}>Mas</span>
            {isMoreActive && (
              <span style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: 20, height: 2, borderRadius: 1, background: '#1A1A1A',
              }} />
            )}
          </button>

          {showMore && (
            <div role="menu" aria-label="Más opciones" className="absolute bottom-full right-0 mb-2 rounded-2xl overflow-hidden min-w-[180px]"
              style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.06)',
              }}>
              {MORE_ITEMS.map(({ id, icon: Icon, label }, idx) => (
                <button
                  key={id}
                  role="menuitem"
                  aria-label={label}
                  onClick={() => { onNav(id); setShowMore(false) }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left transition-all duration-150"
                  style={{
                    color: page === id ? '#1A1A1A' : '#555',
                    fontWeight: page === id ? 600 : 400,
                    background: page === id ? 'rgba(0,0,0,0.04)' : 'transparent',
                    fontSize: '0.85rem',
                    borderBottom: idx < MORE_ITEMS.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  }}
                >
                  <Icon size={18} strokeWidth={1.6} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default MobileNav
