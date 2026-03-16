import { type Page } from '../App'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { useProfile } from '../contexts/ProfileContext'
import { Upload, Camera, Wand2, Repeat, Sparkles, ArrowRight } from 'lucide-react'

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function typeColor(type: GalleryItem['type']): string {
  switch (type) {
    case 'edit': return 'var(--joi-coral)'
    case 'session': return 'var(--joi-pink)'
    case 'create': return 'var(--joi-magenta)'
    case 'video': return 'var(--joi-lavender)'
    default: return 'var(--joi-text-2)'
  }
}

interface Props { onNav: (p: Page) => void }

export function Dashboard({ onNav }: Props) {
  const characters = useCharacterStore(s => s.characters)
  const galleryItems = useGalleryStore(s => s.items)
  const { profile } = useProfile()

  const displayName = profile?.displayName || 'Creator'
  const credits = profile?.creditsRemaining ?? 0
  const plan = profile?.subscriptionPlan || 'free'

  const statsData = [
    { l: 'Characters', v: characters.length, color: 'var(--joi-pink)' },
    { l: 'Creations', v: galleryItems.filter(i => i.type === 'create' || i.type === 'session').length, color: 'var(--joi-magenta)' },
    { l: 'AI Edits', v: galleryItems.filter(i => i.type === 'edit').length, color: 'var(--joi-coral)' },
    { l: 'Credits', v: credits, color: 'var(--joi-lavender)' },
  ]

  const quickActions = [
    { n: '①', l: 'Create Character', Icon: Upload, p: 'upload' as Page, desc: 'Design your virtual influencer', gradient: 'linear-gradient(135deg, rgba(255,107,157,0.12), rgba(208,72,176,0.06))' },
    { n: '②', l: 'Direct Scene', Icon: Camera, p: 'director' as Page, desc: 'Create a hero shot', gradient: 'linear-gradient(135deg, rgba(208,72,176,0.12), rgba(104,120,240,0.06))' },
    { n: '③', l: 'AI Editor', Icon: Repeat, p: 'editor' as Page, desc: 'Edit and enhance images', gradient: 'linear-gradient(135deg, rgba(104,120,240,0.12), rgba(184,160,232,0.06))' },
    { n: '④', l: 'Photo Session', Icon: Wand2, p: 'session' as Page, desc: 'Generate themed photo sets', gradient: 'linear-gradient(135deg, rgba(184,160,232,0.12), rgba(255,107,157,0.06))' },
  ]

  // ── Onboarding: shown when user has zero content ──
  const isNewUser = characters.length === 0 && galleryItems.length === 0

  if (isNewUser) {
    return (
      <div className="min-h-screen joi-mesh flex items-center justify-center" style={{ background: 'var(--joi-bg-0)' }}>
        <div className="joi-orb" style={{ width: 400, height: 400, background: 'rgba(255,107,157,0.04)', top: '-5%', right: '10%' }} />
        <div className="joi-orb" style={{ width: 300, height: 300, background: 'rgba(208,72,176,0.035)', bottom: '10%', left: '5%' }} />

        <div className="relative max-w-lg w-full text-center px-6">
          <p className="font-jet text-[10px] tracking-[0.18em] mb-3" style={{ color: 'var(--joi-text-3)' }}>
            WELCOME TO VIST STUDIO
          </p>
          <h1 style={{ fontSize: '2.2rem', lineHeight: 1.15 }}>
            <span className="joi-heading" style={{ fontWeight: 400 }}>Create your first </span>
            <span className="joi-heading joi-glow joi-text-gradient" style={{ fontWeight: 700 }}>
              virtual influencer
            </span>
          </h1>
          <p className="text-sm mt-3 mb-8" style={{ color: 'var(--joi-text-2)' }}>
            Design a character, direct a scene, and edit with AI — all in one place.
          </p>

          {/* Pipeline steps */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {[
              { n: '1', l: 'Create Character', icon: '⊕' },
              { n: '2', l: 'Direct a Scene', icon: '◎' },
              { n: '3', l: 'Edit with AI', icon: '✦' },
              { n: '4', l: 'Photo Session', icon: '◎' },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm"
                    style={{
                      background: i === 0 ? 'rgba(255,107,157,.12)' : 'rgba(255,255,255,.03)',
                      border: `1px solid ${i === 0 ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.06)'}`,
                      color: i === 0 ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                    }}>
                    {step.icon}
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: i === 0 ? 'var(--joi-text-1)' : 'var(--joi-text-3)' }}>
                    {step.l}
                  </span>
                </div>
                {i < 3 && <div className="w-6 h-px mt-[-18px]" style={{ background: 'rgba(255,255,255,.08)' }} />}
              </div>
            ))}
          </div>

          <button onClick={() => onNav('upload')}
            className="joi-btn-solid px-8 py-3.5 text-sm font-medium joi-breathe"
            style={{ boxShadow: '0 4px 30px rgba(255,107,157,.25), 0 0 50px rgba(208,72,176,.1)' }}>
            ⊕ Create Your First Character
          </button>

          <p className="text-[11px] mt-4" style={{ color: 'var(--joi-text-3)' }}>
            {credits} credits available · {plan} plan
          </p>
        </div>
      </div>
    )
  }

  // ── Computed data for active users ──
  // Only show activity entries that are linked to a character
  const recentActivity = [...galleryItems]
    .filter(item => item.characterId && characters.some(c => c.id === item.characterId))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6)
    .map(item => {
      const char = characters.find(c => c.id === item.characterId)!
      const label = item.type === 'edit' ? 'AI Edit'
        : item.type === 'session' ? 'Session'
        : item.type === 'create' ? 'Creation'
        : item.type === 'video' ? 'Video' : 'Other'
      return { label, char: char.name, time: getTimeAgo(item.timestamp), color: typeColor(item.type) }
    })

  const featuredChar = characters.length > 0
    ? [...characters].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0]
    : null
  const otherChars = characters.filter(c => c.id !== featuredChar?.id).slice(0, 4)

  return (
    <div className="min-h-screen joi-mesh" style={{ background: 'var(--joi-bg-0)' }}>

      {/* ═══ Floating Holographic Orbs (atmospheric depth) ═══ */}
      <div className="joi-orb" style={{ width: 400, height: 400, background: 'rgba(255,107,157,0.04)', top: '-5%', right: '10%' }} />
      <div className="joi-orb" style={{ width: 300, height: 300, background: 'rgba(208,72,176,0.035)', bottom: '10%', left: '5%' }} />
      <div className="joi-orb" style={{ width: 200, height: 200, background: 'rgba(104,120,240,0.03)', top: '40%', right: '30%' }} />

      {/* ═══ Hero Header ═══ */}
      <div className="relative px-8 pt-10 pb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-jet text-[10px] tracking-[0.18em] mb-2" style={{ color: 'var(--joi-text-3)' }}>
              {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: '2.4rem', lineHeight: 1.1 }}>
              <span className="joi-heading" style={{ fontWeight: 400 }}>Welcome back, </span>
              <span className="joi-heading joi-glow joi-text-gradient" style={{ fontWeight: 700 }}>
                {displayName}
              </span>
            </h1>
            <p className="text-[13px] mt-2" style={{ color: 'var(--joi-text-2)' }}>
              Your digital universe is ready.
            </p>
          </div>

          {/* Credits + Plan pills */}
          <div className="flex gap-3 items-center pb-1">
            <div className="joi-glass flex items-center gap-2 px-4 py-2"
              style={{ borderRadius: '10px' }}>
              <Sparkles size={13} style={{ color: 'var(--joi-pink)' }} />
              <span className="font-jet text-[12px] font-bold" style={{ color: 'var(--joi-pink)' }}>{credits}</span>
              <span className="font-jet text-[10px]" style={{ color: 'var(--joi-text-3)' }}>credits</span>
            </div>
            <div className="joi-glass flex items-center px-3 py-2" style={{ borderRadius: '10px' }}>
              <span className="font-jet text-[10px] uppercase tracking-wider" style={{ color: 'var(--joi-text-3)' }}>
                {plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Pro' : plan === 'studio' ? 'Studio' : plan === 'brand' ? 'Brand' : plan}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Stats Row or Onboarding Banner ═══ */}
      {(() => {
        const hasHeroShots = galleryItems.some(i => i.type === 'create' || i.type === 'session')
        const hasEdits = galleryItems.some(i => i.type === 'edit')
        const pipelineComplete = characters.length > 0 && hasHeroShots && hasEdits

        if (pipelineComplete) {
          return (
            <div className="px-8 pb-6 grid grid-cols-4 gap-4 stagger-children">
              {statsData.map(s => (
                <div key={s.l} className="joi-glass joi-border-glow" style={{ padding: '1.25rem 1.5rem', borderRadius: '14px' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="joi-label" style={{ marginBottom: '6px' }}>{s.l}</div>
                      <div className="font-jet font-bold" style={{ fontSize: '1.8rem', color: s.color, lineHeight: 1 }}>
                        {s.v.toLocaleString()}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: `color-mix(in srgb, ${s.color} 8%, transparent)` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }

        // Onboarding banner — show next pipeline step
        const nextStep = characters.length === 0
          ? { n: '①', label: 'Create your first character', page: 'upload' as Page, cta: 'Create Character' }
          : !hasHeroShots
          ? { n: '②', label: `Create a hero shot for ${featuredChar?.name || 'your character'}`, page: 'director' as Page, cta: 'Go to Director' }
          : !hasEdits
          ? { n: '③', label: 'Edit an image with AI tools', page: 'editor' as Page, cta: 'Open AI Editor' }
          : { n: '④', label: 'Run a themed photo session', page: 'session' as Page, cta: 'Start Photo Session' }

        return (
          <div className="px-8 pb-6">
            <div className="joi-glass joi-border-glow flex items-center gap-4 px-6 py-4" style={{ borderRadius: '14px', border: '1px solid rgba(255,107,157,.1)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,107,157,.08)', border: '1px solid rgba(255,107,157,.15)' }}>
                <span className="text-sm" style={{ color: 'var(--joi-pink)' }}>{nextStep.n}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: 'var(--joi-text-3)' }}>Next step</div>
                <div className="text-[13px] font-medium" style={{ color: 'var(--joi-text-1)' }}>{nextStep.label}</div>
              </div>
              <button onClick={() => onNav(nextStep.page)} className="joi-btn-solid px-5 py-2 text-[11px] shrink-0">
                {nextStep.cta} →
              </button>
            </div>
          </div>
        )
      })()}

      {/* ═══ Holographic Divider ═══ */}
      <div className="joi-divider mx-8" />

      {/* ═══ Quick Actions ═══ */}
      <div className="px-8 py-6">
        <div className="joi-label" style={{ marginBottom: '1rem' }}>Quick Actions</div>
        <div className="grid grid-cols-4 gap-4 stagger-children">
          {quickActions.map(a => (
            <button
              key={a.l}
              onClick={() => onNav(a.p)}
              className="group text-left cursor-pointer joi-glass joi-border-glow"
              style={{
                padding: '1.5rem',
                borderRadius: '14px',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              <div className="w-11 h-11 flex items-center justify-center rounded-xl mb-3"
                style={{ background: a.gradient, transition: 'all 0.3s' }}>
                <a.Icon size={20} className="group-hover:scale-110 transition-transform" style={{ color: 'var(--joi-pink)' }} />
              </div>
              <div className="joi-heading text-[0.85rem] mb-1">
                <span className="text-[10px] mr-1" style={{ color: 'var(--joi-pink)', opacity: 0.6 }}>{a.n}</span>
                {a.l}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: 'var(--joi-text-3)' }}>{a.desc}</div>
              <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-jet text-[9px] uppercase tracking-wider" style={{ color: 'var(--joi-pink)' }}>Open</span>
                <ArrowRight size={10} style={{ color: 'var(--joi-pink)' }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Character Spotlight + Activity ═══ */}
      <div className="px-8 py-4 flex gap-5">
        {/* Characters */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <div className="joi-label">Your Characters</div>
            {characters.length > 0 && (
              <button onClick={() => onNav('characters')} className="font-jet text-[10px] flex items-center gap-1 group"
                style={{ color: 'var(--joi-pink)' }}>
                View All <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          {characters.length === 0 ? (
            <div className="joi-glass joi-breathe flex flex-col items-center justify-center py-16"
              style={{ borderRadius: '16px' }}>
              <div className="w-16 h-16 flex items-center justify-center rounded-full mb-5"
                style={{ background: 'rgba(255,107,157,0.06)', border: '1px solid rgba(255,107,157,0.1)' }}>
                <Upload size={24} style={{ color: 'var(--joi-pink)' }} />
              </div>
              <p className="joi-heading" style={{ fontSize: '1.1rem' }}>Your universe awaits</p>
              <p className="text-[12px] mt-1.5 mb-5" style={{ color: 'var(--joi-text-3)' }}>
                Create your first character to start generating
              </p>
              <button onClick={() => onNav('upload')} className="joi-btn-solid">Create Character</button>
            </div>
          ) : (
            <div className="flex gap-4">
              {/* Featured character — holographic spotlight */}
              {featuredChar && (() => {
                const photosCount = galleryItems.filter(i => i.characterId === featuredChar.id).length
                return (
                  <div className="flex-1 joi-glass joi-breathe overflow-hidden" style={{ borderRadius: '16px' }}>
                    <div className="h-56 relative" style={{
                      background: featuredChar.thumbnail ? `url(${featuredChar.thumbnail}) center/cover` : 'var(--joi-bg-1)',
                    }}>
                      {/* Holographic gradient overlay */}
                      <div className="absolute inset-0" style={{
                        background: 'linear-gradient(to top, var(--joi-bg-0) 0%, rgba(8,7,13,0.5) 40%, rgba(255,107,157,0.04) 100%)',
                      }} />
                      <div className="absolute bottom-5 left-5 right-5">
                        <h3 className="joi-heading joi-glow--subtle" style={{ fontSize: '1.4rem' }}>{featuredChar.name}</h3>
                        <p className="font-jet text-[10px] mt-1.5" style={{ color: 'var(--joi-text-2)' }}>
                          {featuredChar.usageCount || 0} uses · {photosCount} photos
                        </p>
                        {(featuredChar.renderStyle || featuredChar.personalityTraits?.length) && (
                          <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--joi-text-3)', maxWidth: '300px' }}>
                            {[featuredChar.renderStyle, ...(featuredChar.personalityTraits || []).slice(0, 3)].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="px-5 py-3 flex gap-3">
                      <button onClick={() => onNav('director')} className="joi-btn-ghost flex-1 text-[11px] py-2">Direct Scene</button>
                      <button onClick={() => onNav('session')} className="joi-btn-ghost flex-1 text-[11px] py-2">Photo Session</button>
                    </div>
                  </div>
                )
              })()}

              {/* Other characters — frosted list */}
              {otherChars.length > 0 && (
                <div className="w-[210px] space-y-2.5 max-h-[320px] overflow-y-auto joi-scroll">
                  {otherChars.map(c => (
                    <div key={c.id}
                      className="flex items-center gap-3 p-2.5 cursor-pointer joi-glass joi-border-glow"
                      onClick={() => onNav('characters')}
                      style={{ borderRadius: '12px' }}>
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ background: 'var(--joi-bg-1)' }}>
                        {c.thumbnail
                          ? <img src={c.thumbnail} alt={c.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                              style={{ color: 'var(--joi-text-2)', background: 'linear-gradient(135deg, rgba(255,107,157,0.08), rgba(208,72,176,0.05))' }}>
                              {c.name[0]}
                            </div>
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--joi-text-1)' }}>{c.name}</div>
                        <div className="font-jet text-[9px]" style={{ color: 'var(--joi-text-3)' }}>{c.usageCount || 0} uses</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity Feed — Holographic */}
        <div className="w-[280px] shrink-0">
          <div className="joi-label" style={{ marginBottom: '1rem' }}>Recent Activity</div>
          <div className="joi-glass p-4" style={{ borderRadius: '14px' }}>
            {recentActivity.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-xl mb-2">◎</div>
                <p className="text-[11px] mb-3" style={{ color: 'var(--joi-text-3)' }}>No activity yet</p>
                <button onClick={() => onNav('director')}
                  className="joi-btn-solid px-4 py-2 text-[10px]">
                  Start your first hero shoot →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((e, i) => (
                  <div key={i} className="flex items-start gap-3" style={{ opacity: 1 - i * 0.08 }}>
                    <div className="mt-1.5 flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: e.color, boxShadow: `0 0 6px ${e.color}` }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium" style={{ color: e.color }}>{e.label}</span>
                        <span className="font-jet text-[9px]" style={{ color: 'var(--joi-text-3)' }}>{e.time}</span>
                      </div>
                      <div className="text-[10px] truncate" style={{ color: 'var(--joi-text-2)' }}>{e.char}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Recent Gallery — Holographic Strip ═══ */}
      {galleryItems.length > 0 && (
        <div className="px-8 py-5 pb-10">
          <div className="flex justify-between items-center mb-4">
            <div className="joi-label">Recent Renders</div>
            <button onClick={() => onNav('gallery')}
              className="font-jet text-[10px] flex items-center gap-1 group"
              style={{ color: 'var(--joi-pink)' }}>
              Open Gallery <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 joi-scroll">
            {galleryItems.slice(0, 12).map(item => (
              <div key={item.id}
                className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer joi-border-glow"
                onClick={() => onNav('gallery')}
                style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy"
                  style={{ transition: 'transform 0.3s' }}
                  onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
