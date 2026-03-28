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
    { n: '①', l: 'Create Character', Icon: Upload, p: 'create' as Page, desc: 'Design your virtual influencer', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.06))' },
    { n: '②', l: 'Create Scene', Icon: Camera, p: 'studio' as Page, desc: 'Create a scene', gradient: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(104,120,240,0.06))' },
    { n: '③', l: 'AI Editor', Icon: Repeat, p: 'editor' as Page, desc: 'Edit and enhance images', gradient: 'linear-gradient(135deg, rgba(104,120,240,0.12), rgba(184,160,232,0.06))' },
    { n: '④', l: 'Photo Session', Icon: Wand2, p: 'studio' as Page, desc: 'Generate themed photo sets', gradient: 'linear-gradient(135deg, rgba(184,160,232,0.12), rgba(99,102,241,0.06))' },
  ]

  // ── Onboarding: shown when user has zero content ──
  const isNewUser = characters.length === 0 && galleryItems.length === 0

  if (isNewUser) {
    const sampleImages = [
      { src: '/samples/influencer-09f6a6a2-b616-4b4e-983c-f63bcde349af.png', tall: true },
      { src: '/samples/influencer-0b126b31-7b3e-410b-8dd4-c7cdb4c6efb9.png', tall: false },
      { src: '/samples/influencer-3a85b2fb-4766-4f0a-b4e3-14f6a417b78f.png', tall: false },
      { src: '/samples/influencer-40b0ba17-c13c-487a-9c9b-5621950c3d57.png', tall: true },
      { src: '/samples/influencer-4b651978-9594-4854-bfda-9be29257918e.png', tall: false },
      { src: '/samples/influencer-628020f2-51fa-4971-ad4f-c8005cf1a383.png', tall: false },
      { src: '/samples/influencer-6d7337fb-6421-42de-8e53-b27eac3a1213.png', tall: true },
      { src: '/samples/influencer-70d1c646-d330-4d3a-ae8a-e04dfdec7fc9.png', tall: false },
    ]

    const howItWorks = [
      { emoji: '🧑', step: 'Sube una foto', label: 'Crea tu personaje' },
      { emoji: '🎬', step: 'Configura la escena', label: 'Director' },
      { emoji: '✨', step: 'Genera y edita', label: 'Resultado final' },
    ]

    return (
      <div className="min-h-screen joi-mesh overflow-hidden" style={{ background: 'var(--joi-bg-0)' }}>
        {/* Atmospheric orbs */}
        <div className="joi-orb" style={{ width: 560, height: 560, background: 'rgba(99,102,241,0.05)', top: '-15%', right: '-5%' }} />
        <div className="joi-orb" style={{ width: 400, height: 400, background: 'rgba(129,140,248,0.04)', bottom: '5%', left: '-8%' }} />
        <div className="joi-orb" style={{ width: 250, height: 250, background: 'rgba(79,70,229,0.03)', top: '50%', left: '40%' }} />

        <div className="relative flex flex-col lg:flex-row min-h-screen">

          {/* ── Left: Headline + CTA ── */}
          <div className="flex flex-col justify-center px-6 lg:px-16 pt-12 pb-8 lg:py-20 lg:w-[48%] shrink-0">
            <p className="font-jet text-[10px] tracking-[0.2em] mb-5" style={{ color: 'var(--joi-text-3)' }}>
              VIST STUDIO · VIRTUAL INFLUENCER PLATFORM
            </p>

            <h1 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.6rem)', lineHeight: 1.12, maxWidth: '480px' }}>
              <span className="joi-heading" style={{ fontWeight: 400, display: 'block' }}>
                Crea influencers virtuales
              </span>
              <span className="joi-heading joi-glow joi-text-gradient" style={{ fontWeight: 700 }}>
                que nadie sabrá que son IA
              </span>
            </h1>

            <p className="mt-4 mb-8 text-[13px] leading-relaxed" style={{ color: 'var(--joi-text-2)', maxWidth: '400px' }}>
              Fotos de estudio profesionales, outfits personalizados y contenido UGC — todo generado con IA en segundos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <button
                onClick={() => onNav('create')}
                className="joi-btn-solid px-7 py-3.5 text-[13px] font-medium joi-breathe"
                style={{ boxShadow: '0 4px 32px rgba(99,102,241,.28), 0 0 60px rgba(79,70,229,.1)' }}
              >
                Crear mi primer personaje →
              </button>
            </div>

            <p className="text-[11px] mt-4" style={{ color: 'var(--joi-text-3)' }}>
              {credits} créditos disponibles · plan {plan === 'free' ? 'gratuito' : plan}
            </p>

            {/* How it works */}
            <div className="mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-jet text-[10px] tracking-[0.16em] mb-5" style={{ color: 'var(--joi-text-3)' }}>
                ¿CÓMO FUNCIONA?
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {howItWorks.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                      style={{
                        background: i === 0
                          ? 'rgba(99,102,241,.1)'
                          : i === 1
                          ? 'rgba(129,140,248,.1)'
                          : 'rgba(79,70,229,.1)',
                        border: `1px solid ${i === 0 ? 'rgba(99,102,241,.2)' : i === 1 ? 'rgba(129,140,248,.2)' : 'rgba(79,70,229,.2)'}`,
                      }}
                    >
                      {item.emoji}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium" style={{ color: 'var(--joi-text-1)' }}>{item.step}</div>
                      <div className="font-jet text-[10px]" style={{ color: 'var(--joi-text-3)' }}>{item.label}</div>
                    </div>
                    {i < 2 && (
                      <div className="hidden sm:flex items-center self-center mx-1" style={{ color: 'var(--joi-text-3)', fontSize: '10px', marginTop: '-2px' }}>→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Sample images grid ── */}
          <div className="flex-1 relative p-6 lg:p-8 overflow-hidden lg:min-h-screen">
            {/* Subtle vignette on left edge to blend with content side */}
            <div className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, var(--joi-bg-0), transparent)' }} />

            <div
              className="h-full"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gridTemplateRows: 'repeat(4, minmax(120px, 1fr))',
                gap: '10px',
                maxHeight: '80vh',
              }}
            >
              {sampleImages.map((img, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{
                    gridRow: img.tall ? 'span 2' : 'span 1',
                    background: 'var(--joi-bg-2)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseOver={e => {
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1.025)'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(99,102,241,.15)'
                  }}
                  onMouseOut={e => {
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                  }}
                >
                  <img
                    src={img.src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* "Generated with AI" badge */}
            <div
              className="absolute bottom-10 right-8 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(8,7,12,0.72)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--joi-pink)', boxShadow: '0 0 6px var(--joi-pink)' }} />
              <span className="font-jet text-[9px] tracking-wider" style={{ color: 'var(--joi-text-3)' }}>GENERADO CON IA</span>
            </div>
          </div>
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
      <div className="joi-orb" style={{ width: 400, height: 400, background: 'rgba(99,102,241,0.04)', top: '-5%', right: '10%' }} />
      <div className="joi-orb" style={{ width: 300, height: 300, background: 'rgba(79,70,229,0.035)', bottom: '10%', left: '5%' }} />
      <div className="joi-orb" style={{ width: 200, height: 200, background: 'rgba(104,120,240,0.03)', top: '40%', right: '30%' }} />

      {/* ═══ Hero Header ═══ */}
      <div className="relative px-4 lg:px-8 pt-10 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
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
              Your studio is ready.
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
        const hasContent = galleryItems.some(i => i.type === 'create' || i.type === 'session')
        const hasEdits = galleryItems.some(i => i.type === 'edit')
        const pipelineComplete = characters.length > 0 && hasContent && hasEdits

        if (pipelineComplete) {
          return (
            <div className="px-4 lg:px-8 pb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
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
                  {/* Credits explainer — only on the Credits card */}
                  {s.l === 'Credits' && credits > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2.5">
                      {[
                        { label: '6cr', desc: 'Foto' },
                        { label: '10cr', desc: 'Try-On' },
                        { label: '20cr', desc: 'Sesión' },
                      ].map(item => (
                        <span
                          key={item.label}
                          className="font-jet text-[9px] px-2 py-0.5 rounded-md"
                          style={{
                            background: 'rgba(255,255,255,.04)',
                            color: 'var(--joi-text-3)',
                            border: '1px solid rgba(255,255,255,.05)',
                          }}
                        >
                          <span style={{ color: 'var(--joi-pink)' }}>{item.label}</span>{' '}= {item.desc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }

        // Onboarding banner — show next pipeline step
        const nextStep = characters.length === 0
          ? { n: '①', label: 'Create your first character', page: 'create' as Page, cta: 'Create Character' }
          : !hasContent
          ? { n: '②', label: `Create a scene for ${featuredChar?.name || 'your character'}`, page: 'studio' as Page, cta: 'Go to Scene Studio' }
          : !hasEdits
          ? { n: '③', label: 'Edit an image with AI tools', page: 'editor' as Page, cta: 'Open AI Editor' }
          : { n: '④', label: 'Run a themed photo session', page: 'studio' as Page, cta: 'Start Photo Session' }

        return (
          <div className="px-4 lg:px-8 pb-6">
            <div className="joi-glass joi-border-glow flex flex-wrap items-center gap-4 px-4 lg:px-6 py-4" style={{ borderRadius: '14px', border: '1px solid rgba(99,102,241,.1)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.15)' }}>
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
      <div className="px-4 lg:px-8 py-6">
        <div className="joi-label" style={{ marginBottom: '1rem' }}>Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
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
      <div className="px-4 lg:px-8 py-4 flex flex-col lg:flex-row gap-5">
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
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' }}>
                <Upload size={24} style={{ color: 'var(--joi-pink)' }} />
              </div>
              <p className="joi-heading" style={{ fontSize: '1.1rem' }}>Start creating content</p>
              <p className="text-[12px] mt-1.5 mb-5" style={{ color: 'var(--joi-text-3)' }}>
                Create your first AI character to start posting
              </p>
              <button onClick={() => onNav('create')} className="joi-btn-solid">Create Character</button>
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
                        background: 'linear-gradient(to top, var(--joi-bg-0) 0%, rgba(8,7,13,0.5) 40%, rgba(99,102,241,0.04) 100%)',
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
                      <button onClick={() => onNav('studio')} className="joi-btn-solid flex-1 text-[11px] py-2">Create Scene</button>
                      <button onClick={() => onNav('studio')} className="joi-btn-ghost flex-1 text-[11px] py-2" style={{ borderColor: 'rgba(99,102,241,.3)', color: 'var(--joi-pink)' }}>Photo Session</button>
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
                              style={{ color: 'var(--joi-text-2)', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(79,70,229,0.05))' }}>
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
        <div className="w-full lg:w-[280px] lg:shrink-0">
          <div className="joi-label" style={{ marginBottom: '1rem' }}>Recent Activity</div>
          <div className="joi-glass p-4" style={{ borderRadius: '14px' }}>
            {recentActivity.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-xl mb-2">◎</div>
                <p className="text-[11px] mb-3" style={{ color: 'var(--joi-text-3)' }}>No activity yet</p>
                <button onClick={() => onNav('studio')}
                  className="joi-btn-solid px-4 py-2 text-[10px]">
                  Create your first post →
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
        <div className="px-4 lg:px-8 py-5 pb-10">
          <div className="flex justify-between items-center mb-4">
            <div className="joi-label">Recent Content</div>
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
