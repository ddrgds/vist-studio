import { type Page } from '../App'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import {
  LayoutDashboard, Clapperboard, Upload, Camera, Wand2,
  Globe, Images, Users, CalendarDays, BarChart3,
  CreditCard, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

const navSections: { title?: string; items: { id: Page; label: string; Icon: LucideIcon; sub: string }[] }[] = [
  {
    title: 'PIPELINE',
    items: [
      { id: 'upload', label: 'Create Character', Icon: Upload, sub: 'Create / Import' },
      { id: 'director', label: 'Director', Icon: Clapperboard, sub: 'Hero Shot' },
      { id: 'editor', label: 'AI Editor', Icon: Wand2, sub: 'Relight · Swap · Enhance' },
      { id: 'session', label: 'Photo Session', Icon: Camera, sub: 'Photo Shoot' },
    ],
  },
  {
    title: 'MANAGE',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, sub: 'Overview' },
      { id: 'gallery', label: 'Gallery', Icon: Images, sub: 'Creations' },
      { id: 'characters', label: 'Characters', Icon: Users, sub: 'Collection' },
    ],
  },
]

interface Props {
  page: Page
  onNav: (p: Page) => void
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ page, onNav, collapsed, onToggle }: Props) {
  const { user } = useAuth()
  const { profile } = useProfile()

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'User'
  const initial = displayName[0]?.toUpperCase() || 'U'
  const planLabel = profile?.subscriptionPlan === 'pro' ? 'Pro Plan' : profile?.subscriptionPlan === 'premium' ? 'Premium' : 'Free Plan'

  return (
    <aside
      className="h-screen flex-col shrink-0 transition-all duration-300 hidden md:flex"
      style={{
        width: collapsed ? 68 : 230,
        background: 'var(--joi-bg-1)',
        borderRight: '1px solid rgba(255,255,255,.03)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
        <div className="joi-status" style={{ flexShrink: 0 }} />
        {!collapsed && (
          <div>
            <div className="joi-glow--subtle" style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.08em',
              color: 'var(--joi-pink)',
            }}>VIST</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.55rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase' as const,
              color: 'var(--joi-text-3)',
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
                    color: 'var(--joi-text-3)',
                  }}>{section.title}</span>
                ) : (
                  <div className="w-5 h-px mx-auto" style={{ background: 'rgba(255,107,157,.15)' }} />
                )}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(n => {
                const active = page === n.id
                return (
                  <button
                    key={n.id}
                    onClick={() => onNav(n.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative"
                    style={{
                      background: active ? 'rgba(255,107,157,0.06)' : 'transparent',
                      border: active ? '1px solid rgba(255,107,157,0.10)' : '1px solid transparent',
                    }}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2" style={{
                        width: '2px',
                        height: '16px',
                        background: 'var(--joi-pink)',
                        borderRadius: '1px',
                        boxShadow: '0 0 8px rgba(255,107,157,0.4), 0 0 16px rgba(255,107,157,0.15)',
                      }} />
                    )}
                    <span className="shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center"
                      style={{ color: active ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>
                      <n.Icon size={16} />
                    </span>
                    {!collapsed && (
                      <div className="text-left min-w-0">
                        <div className="text-[12px] font-medium leading-tight truncate"
                          style={{ color: active ? 'var(--joi-text-1)' : 'var(--joi-text-2)' }}>{n.label}</div>
                        <div className="text-[9px] truncate" style={{ color: 'var(--joi-text-3)' }}>{n.sub}</div>
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
      <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,.03)' }}>
        <div className="flex gap-1">
          <button onClick={() => onNav('pricing')} className="flex-1 py-1.5 rounded-lg text-[11px] transition-colors"
            style={{ color: 'var(--joi-text-3)', background: 'var(--joi-bg-2)' }}>
            {collapsed ? <CreditCard size={14} className="mx-auto" /> : 'Pricing'}
          </button>
          <button onClick={onToggle} className="flex-1 py-1.5 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1"
            style={{ color: 'var(--joi-text-3)', background: 'var(--joi-bg-2)' }}>
            {collapsed ? <PanelLeftOpen size={14} /> : <><PanelLeftClose size={14} /> Collapse</>}
          </button>
        </div>
      </div>
      <button
        onClick={() => onNav('profile')}
        className="px-3 py-3 flex items-center gap-2 transition-colors hover:bg-white/[0.02]"
        style={{ borderTop: '1px solid rgba(255,255,255,.03)' }}
      >
        <div className="shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
          style={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--joi-pink), var(--joi-magenta))',
            boxShadow: '0 2px 8px rgba(255,107,157,.15)',
          }}>{initial}</div>
        {!collapsed && (
          <div className="min-w-0 text-left">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--joi-text-1)' }}>{displayName}</div>
            <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>{planLabel}</div>
          </div>
        )}
      </button>
    </aside>
  )
}
