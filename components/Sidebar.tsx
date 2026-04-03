import { useState } from 'react'
import { type Page } from '../App'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore } from '../stores/galleryStore'
import {
  Sparkles, Clapperboard, Images, Users,
  CreditCard, PanelLeftClose, PanelLeftOpen, Wand2, Film,
} from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

const navSections: { title?: string; items: { id: Page; label: string; Icon: LucideIcon; sub: string }[] }[] = [
  {
    title: 'CREAR',
    items: [
      { id: 'create', label: 'Crear Personaje', Icon: Sparkles, sub: 'Diseña un personaje AI' },
      { id: 'studio', label: 'Studio', Icon: Clapperboard, sub: 'Crear y sesión de fotos' },
      { id: 'video', label: 'Video y Reels', Icon: Film, sub: 'Movimiento · Lip sync' },
      { id: 'editor', label: 'Editor AI', Icon: Wand2, sub: 'Edita cualquier foto' },
    ],
  },
  {
    title: 'GESTIONAR',
    items: [
      { id: 'gallery', label: 'Galería', Icon: Images, sub: 'Todo el contenido' },
      { id: 'characters', label: 'Personajes', Icon: Users, sub: 'Tus personajes' },
    ],
  },
]

interface Props {
  page: Page
  onNav: (p: Page) => void
  collapsed: boolean
  onToggle: () => void
}

const PIPELINE_NUMBERS: Record<string, string> = {
  create: '①', studio: '②',
}

export function Sidebar({ page, onNav, collapsed, onToggle }: Props) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const characters = useCharacterStore(s => s.characters)
  const galleryItems = useGalleryStore(s => s.items)

  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
      localStorage.setItem('theme', 'light')
    }
  }

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'User'
  const initial = displayName[0]?.toUpperCase() || 'U'
  const planLabels: Record<string, string> = { starter: 'Starter', pro: 'Pro', studio: 'Studio', brand: 'Brand' }
  const planLabel = planLabels[profile?.subscriptionPlan || 'starter'] || 'Starter'
  const credits = profile?.creditsRemaining ?? 0

  // Pipeline progress hint
  const pipelineHint = (id: string): string | null => {
    if (collapsed) return null
    if (characters.length === 0 && id === 'create') return 'Empieza aquí'
    if (characters.length > 0 && galleryItems.length === 0 && id === 'studio') return 'Siguiente paso'
    return null
  }

  return (
    <aside
      role="navigation"
      aria-label="Navegación principal"
      className="h-screen flex-col shrink-0 transition-all duration-300 hidden lg:flex"
      style={{
        width: collapsed ? 68 : 230,
        background: '#FFFFFF',
        borderRight: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="joi-status" style={{ flexShrink: 0 }} />
        {!collapsed && (
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.08em',
              color: '#1A1A1A',
            }}>VIST</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.55rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase' as const,
              color: '#999999',
            }}>STUDIO</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto joi-scroll">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="px-3 pt-3 pb-1">
                {!collapsed ? (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6rem',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.2em',
                    fontWeight: 600,
                    color: '#999999',
                  }}>{section.title}</span>
                ) : (
                  <div className="w-5 h-px mx-auto" style={{ background: 'rgba(0,0,0,0.08)' }} />
                )}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(n => {
                const active = page === n.id
                const hint = pipelineHint(n.id)
                return (
                  <button
                    key={n.id}
                    onClick={() => onNav(n.id)}
                    aria-label={n.label}
                    aria-current={active ? 'page' : undefined}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative"
                    style={{
                      background: active ? '#F3F4F6' : 'transparent',
                      border: '1px solid transparent',
                    }}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2" style={{
                        width: '2px',
                        height: '16px',
                        background: '#1A1A1A',
                        borderRadius: '1px',
                      }} />
                    )}
                    <span className="shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center"
                      style={{ color: active ? '#1A1A1A' : '#999999' }}>
                      <n.Icon size={16} />
                    </span>
                    {!collapsed && (
                      <div className="text-left min-w-0 flex-1">
                        <div className="text-[12px] font-medium leading-tight truncate flex items-center gap-1.5"
                          style={{ color: active ? '#111111' : '#555555' }}>
                          {PIPELINE_NUMBERS[n.id] && (
                            <span className="text-[10px]" style={{ color: '#999999' }}>{PIPELINE_NUMBERS[n.id]}</span>
                          )}
                          {n.label}
                        </div>
                        <div className="text-[9px] truncate flex items-center gap-1.5" style={{ color: '#999999' }}>
                          {n.sub}
                          {hint && (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: '#F3F4F6', color: '#1A1A1A', border: '1px solid rgba(0,0,0,0.08)' }}>
                              {hint}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex items-center gap-2 px-3 py-2 rounded-xl w-full transition-all mb-1"
          style={{ color: '#999999', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="text-sm shrink-0">{isDark ? '☀️' : '🌙'}</span>
          {!collapsed && (
            <span className="text-xs">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
          )}
        </button>
        <div className="flex gap-1">
          <button onClick={() => onNav('pricing')} aria-label="Precios" className="flex-1 py-1.5 rounded-lg text-[11px] transition-colors"
            style={{ color: '#555555', background: '#F3F4F6' }}>
            {collapsed ? <CreditCard size={14} className="mx-auto" /> : 'Precios'}
          </button>
          <button onClick={onToggle} aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'} className="flex-1 py-1.5 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1"
            style={{ color: '#555555', background: '#F3F4F6' }}>
            {collapsed ? <PanelLeftOpen size={14} /> : <><PanelLeftClose size={14} /> Colapsar</>}
          </button>
        </div>
      </div>
      <button
        onClick={() => onNav('profile')}
        className="px-3 py-3 flex items-center gap-2 transition-colors"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
          style={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: '#1A1A1A',
          }}>{initial}</div>
        {!collapsed && (
          <div className="min-w-0 text-left">
            <div className="text-xs font-medium truncate" style={{ color: '#111111' }}>{displayName}</div>
            <div className="text-[10px] flex items-center gap-1" style={{ color: '#999999' }}>
              {planLabel} <span style={{ color: '#555555' }}>·</span> <span style={{ color: '#555555' }}>{credits.toLocaleString()}cr</span>
            </div>
          </div>
        )}
      </button>
    </aside>
  )
}
