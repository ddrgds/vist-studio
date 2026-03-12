import { type Page } from '../App'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'

const navSections: { title?: string; items: { id: Page; label: string; icon: string; sub: string }[] }[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '\u2B21', sub: 'Overview' },
    ]
  },
  {
    title: 'CREATE',
    items: [
      { id: 'director', label: 'Director', icon: '\u2726', sub: 'Hero Shot' },
      { id: 'upload', label: 'Upload Character', icon: '\u2295', sub: 'Create / Import' },
      { id: 'session', label: 'Photo Session', icon: '\u25CE', sub: 'Photo Shoot' },
      { id: 'editor', label: 'AI Editor', icon: '\u2736', sub: 'Relight \u00b7 360 \u00b7 Swap' },
      { id: 'universe', label: 'Universe', icon: '\u2727', sub: 'World Building' },
    ]
  },
  {
    title: 'MANAGE',
    items: [
      { id: 'gallery', label: 'Gallery', icon: '\u25A6', sub: 'Creations' },
      { id: 'characters', label: 'Characters', icon: '\u25C8', sub: 'Collection' },
      { id: 'content', label: 'Content', icon: '\u25A3', sub: 'Calendar' },
      { id: 'analytics', label: 'Analytics', icon: '\u25C7', sub: 'Metrics' },
    ]
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

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const initial = displayName[0]?.toUpperCase() || 'U'
  const planLabel = profile?.plan === 'pro' ? 'Pro Plan' : profile?.plan === 'premium' ? 'Premium' : 'Free Plan'

  return (
    <aside
      className="h-screen flex-col shrink-0 transition-all duration-300 hidden md:flex"
      style={{
        width: collapsed ? 68 : 230,
        background: 'var(--bg-1)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 plasma-glow"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--magenta), var(--blue))' }}
        >
          V
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-1)' }}>VERTEX</div>
            <div className="text-[9px] font-mono tracking-[.25em] uppercase" style={{ color: 'var(--text-3)' }}>ai studio</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="px-3 pt-3 pb-1">
                {!collapsed ? (
                  <span className="text-[9px] font-mono uppercase tracking-[.2em] font-semibold" style={{ color: 'var(--text-3)' }}>{section.title}</span>
                ) : (
                  <div className="w-5 mx-auto border-t" style={{ borderColor: 'var(--border)' }} />
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group relative"
                    style={{
                      background: active ? 'rgba(240,104,72,0.08)' : 'transparent',
                      border: active ? '1px solid rgba(240,104,72,0.15)' : '1px solid transparent',
                    }}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full" style={{ background: 'var(--accent)' }} />
                    )}
                    <span
                      className="text-[14px] shrink-0 transition-transform group-hover:scale-110"
                      style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }}
                    >
                      {n.icon}
                    </span>
                    {!collapsed && (
                      <div className="text-left min-w-0">
                        <div className="text-[12px] font-medium leading-tight truncate"
                          style={{ color: active ? 'var(--text-1)' : 'var(--text-2)' }}>{n.label}</div>
                        <div className="text-[9px] truncate" style={{ color: 'var(--text-3)' }}>{n.sub}</div>
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
      <div className="px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-1">
          <button onClick={() => onNav('pricing')} className="flex-1 py-1.5 rounded-lg text-[11px] transition-colors"
            style={{ color: 'var(--text-3)', background: 'var(--bg-2)' }}>
            {collapsed ? '$' : 'Pricing'}
          </button>
          <button onClick={onToggle} className="flex-1 py-1.5 rounded-lg text-[11px] transition-colors"
            style={{ color: 'var(--text-3)', background: 'var(--bg-2)' }}>
            {collapsed ? '\u203A' : '\u2039 Collapse'}
          </button>
        </div>
      </div>
      <button
        onClick={() => onNav('profile')}
        className="px-3 py-3 flex items-center gap-2 transition-colors hover:bg-white/[0.02]"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--magenta))' }}>{initial}</div>
        {!collapsed && (
          <div className="min-w-0 text-left">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>{displayName}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{planLabel}</div>
          </div>
        )}
      </button>
    </aside>
  )
}
