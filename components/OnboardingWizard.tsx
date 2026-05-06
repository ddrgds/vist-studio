import React, { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, Camera, Calendar, Rocket, Heart } from 'lucide-react'

/**
 * OnboardingWizard — 5-step guided flow for first-time users.
 *
 * Goal: convert "I just signed up" → "I have a clear plan and made my first model".
 * Drop-off prevention: each step has a clear next action and skipable.
 *
 * Progress stored in localStorage (vist_onboarding_step / vist_onboarding_completed).
 * Migration to profile DB can come later — localStorage is fine for MVP.
 *
 * Steps:
 *   0) Bienvenida + caso real del fundador (1,700+ followers)
 *   1) Tu wedge (qué tipo de modelo crear: editorial / lifestyle / sensual)
 *   2) Configura tu primera modelo (nombre + vibe LATAM)
 *   3) Tu primera sesión (qué generar)
 *   4) Plan primer mes + Discord + lanzamiento
 */

type StepId = 0 | 1 | 2 | 3 | 4

interface OnboardingWizardProps {
  open: boolean
  onClose: () => void
  /** Called when user clicks final CTA — typically navigates to Crear Personaje */
  onLaunch: () => void
  /** Optional: override starting step */
  initialStep?: StepId
}

const STEPS: { id: StepId; label: string }[] = [
  { id: 0, label: 'Bienvenida' },
  { id: 1, label: 'Tu enfoque' },
  { id: 2, label: 'Tu modelo' },
  { id: 3, label: 'Primera sesión' },
  { id: 4, label: 'Lanza' },
]

const STORAGE_KEY = 'vist_onboarding_step'
const COMPLETED_KEY = 'vist_onboarding_completed'

export function isOnboardingCompleted(): boolean {
  try { return localStorage.getItem(COMPLETED_KEY) === 'true' }
  catch { return false }
}

export function markOnboardingCompleted(): void {
  try { localStorage.setItem(COMPLETED_KEY, 'true') }
  catch { /* ignore */ }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(COMPLETED_KEY)
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ open, onClose, onLaunch, initialStep = 0 }) => {
  const [step, setStep] = useState<StepId>(initialStep)
  const [focus, setFocus] = useState<'editorial' | 'lifestyle' | 'sensual' | null>(null)
  const [vibe, setVibe] = useState<string | null>(null)
  const [modelName, setModelName] = useState('')

  // Restore step from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = Number(saved)
        if (parsed >= 0 && parsed <= 4) setStep(parsed as StepId)
      }
    } catch { /* ignore */ }
  }, [])

  // Persist step
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(step)) } catch { /* ignore */ }
  }, [step])

  if (!open) return null

  const next = () => setStep(s => (s < 4 ? (s + 1) as StepId : s))
  const back = () => setStep(s => (s > 0 ? (s - 1) as StepId : s))
  const skip = () => { markOnboardingCompleted(); onClose() }
  const finish = () => { markOnboardingCompleted(); onLaunch() }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-[720px] max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
        {/* Header — progress + close */}
        <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: '#999' }}>
              Paso {step + 1} de 5 · {STEPS[step].label}
            </span>
            <button onClick={skip} aria-label="Saltar onboarding"
              className="p-1.5 rounded-full transition-colors hover:bg-black/5">
              <X size={16} style={{ color: '#666' }} />
            </button>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {STEPS.map(s => (
              <div key={s.id} className="flex-1 h-1 rounded-full transition-all"
                style={{ background: s.id <= step ? '#1A1A1A' : 'rgba(0,0,0,0.08)' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          {step === 0 && (
            <Step0Welcome onNext={next} />
          )}
          {step === 1 && (
            <Step1Focus value={focus} onChange={setFocus} />
          )}
          {step === 2 && (
            <Step2Model name={modelName} vibe={vibe} onName={setModelName} onVibe={setVibe} />
          )}
          {step === 3 && (
            <Step3FirstSession />
          )}
          {step === 4 && (
            <Step4Launch />
          )}
        </div>

        {/* Footer — nav */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#FAFAFA' }}>
          <button onClick={back} disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
            style={{ color: step === 0 ? '#bbb' : '#555', cursor: step === 0 ? 'default' : 'pointer' }}>
            <ChevronLeft size={14} /> Atrás
          </button>

          <button onClick={skip} className="text-[12px]" style={{ color: '#999' }}>
            Saltar por ahora
          </button>

          {step < 4 ? (
            <button onClick={next}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-semibold"
              style={{ background: '#1A1A1A', color: '#fff' }}>
              Siguiente <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={finish}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-semibold"
              style={{ background: '#1A1A1A', color: '#fff' }}>
              <Rocket size={14} /> Crear mi modelo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Steps ─────────────────────────────────────────────────────────

const Step0Welcome: React.FC<{ onNext: () => void }> = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
        <Sparkles size={22} style={{ color: '#1A1A1A' }} />
      </div>
      <div>
        <h2 className="text-[22px] font-bold leading-tight" style={{ color: '#1A1A1A' }}>
          Bienvenido. Vamos a construir tu primer modelo virtual.
        </h2>
      </div>
    </div>
    <p className="text-[15px] leading-relaxed" style={{ color: '#555' }}>
      Te toma 5 minutos. Al final tendrás:
    </p>
    <ul className="space-y-2 text-[14px]" style={{ color: '#444' }}>
      <li className="flex gap-2"><span style={{ color: '#1A1A1A' }}>✓</span> Tu primera modelo lista para postear</li>
      <li className="flex gap-2"><span style={{ color: '#1A1A1A' }}>✓</span> Plan claro de qué hacer las primeras 4 semanas</li>
      <li className="flex gap-2"><span style={{ color: '#1A1A1A' }}>✓</span> Acceso al Discord de la comunidad</li>
    </ul>
    <div className="rounded-2xl p-4 mt-4" style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-start gap-3">
        <Heart size={16} style={{ color: '#1A1A1A', marginTop: 3, flexShrink: 0 }} />
        <div className="text-[13px] leading-relaxed" style={{ color: '#444' }}>
          <strong>Caso real del fundador:</strong> Tengo una cuenta de IG con <strong style={{ color: '#1A1A1A' }}>1,700+ seguidores</strong> construida 100% con esta misma herramienta. Si yo lo hice, tú también puedes.
        </div>
      </div>
    </div>
  </div>
)

const Step1Focus: React.FC<{
  value: 'editorial' | 'lifestyle' | 'sensual' | null
  onChange: (v: 'editorial' | 'lifestyle' | 'sensual') => void
}> = ({ value, onChange }) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-[22px] font-bold mb-2" style={{ color: '#1A1A1A' }}>¿Qué tipo de modelo quieres construir?</h2>
      <p className="text-[14px]" style={{ color: '#555' }}>Esto define los presets, herramientas y plan que te recomendamos. No es definitivo, lo puedes cambiar después.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[
        { id: 'editorial' as const, emoji: '📷', title: 'Editorial', desc: 'IG limpio, fashion, lifestyle, sin contenido sensual. Marketing y marcas.' },
        { id: 'lifestyle' as const, emoji: '🌴', title: 'Lifestyle LATAM', desc: 'Vibe regional (paisa, costeña, paulista...), día a día, viajes, fashion.' },
        { id: 'sensual' as const, emoji: '🔥', title: 'Editorial Sensual', desc: 'Lencería, beach, boudoir editorial. Para teaser de OF/Fansly. Modo Creator (+18).' },
      ].map(opt => (
        <button key={opt.id}
          onClick={() => onChange(opt.id)}
          className="text-left p-4 rounded-2xl border transition-all"
          style={{
            background: value === opt.id ? '#1A1A1A' : '#FFFFFF',
            color: value === opt.id ? '#FFFFFF' : '#1A1A1A',
            borderColor: value === opt.id ? '#1A1A1A' : 'rgba(0,0,0,0.08)',
          }}>
          <div className="text-[20px] mb-2">{opt.emoji}</div>
          <div className="text-[14px] font-bold mb-1">{opt.title}</div>
          <div className="text-[12px] leading-relaxed" style={{ opacity: 0.85 }}>{opt.desc}</div>
        </button>
      ))}
    </div>
  </div>
)

const Step2Model: React.FC<{
  name: string
  vibe: string | null
  onName: (v: string) => void
  onVibe: (v: string) => void
}> = ({ name, vibe, onName, onVibe }) => {
  const VIBES = [
    { id: 'paisa', label: 'Paisa Chic', emoji: '🌹' },
    { id: 'costena', label: 'Costeña', emoji: '🌴' },
    { id: 'paulista', label: 'Paulista', emoji: '🇧🇷' },
    { id: 'chilanga', label: 'Chilanga', emoji: '🌵' },
    { id: 'limena', label: 'Limeña', emoji: '🪶' },
    { id: 'free', label: 'Construyo desde cero', emoji: '✦' },
  ]
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold mb-2" style={{ color: '#1A1A1A' }}>Tu primera modelo</h2>
        <p className="text-[14px]" style={{ color: '#555' }}>Elige un nombre y una vibe inicial. Luego le defines look, ropa y estilo en Crear Personaje.</p>
      </div>
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wider mb-1.5 block" style={{ color: '#999' }}>Nombre</label>
        <input
          value={name}
          onChange={e => onName(e.target.value)}
          placeholder="Ej: Maria, Sofia, Camila..."
          className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none"
          style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.08)', color: '#1A1A1A' }} />
      </div>
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wider mb-2 block" style={{ color: '#999' }}>Vibe inicial</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {VIBES.map(v => (
            <button key={v.id}
              onClick={() => onVibe(v.id)}
              className="px-3 py-2.5 rounded-xl text-[13px] font-medium text-left transition-all"
              style={{
                background: vibe === v.id ? '#1A1A1A' : '#F8F8F8',
                color: vibe === v.id ? '#fff' : '#444',
                border: '1px solid rgba(0,0,0,0.06)',
              }}>
              <span className="mr-2">{v.emoji}</span> {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const Step3FirstSession: React.FC = () => (
  <div className="space-y-5">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
        <Camera size={22} style={{ color: '#1A1A1A' }} />
      </div>
      <h2 className="text-[22px] font-bold" style={{ color: '#1A1A1A' }}>Tu primera sesión</h2>
    </div>
    <p className="text-[14px]" style={{ color: '#555' }}>
      En el siguiente paso vamos a Crear Personaje, donde te llevaremos por:
    </p>
    <ol className="space-y-3 text-[14px]" style={{ color: '#444' }}>
      <li className="flex gap-3">
        <span className="font-mono font-bold w-6 flex-shrink-0" style={{ color: '#1A1A1A' }}>1.</span>
        <div><strong>Diseña su look</strong> · rostro, pelo, ojos, estilo de ropa</div>
      </li>
      <li className="flex gap-3">
        <span className="font-mono font-bold w-6 flex-shrink-0" style={{ color: '#1A1A1A' }}>2.</span>
        <div><strong>Genera 3 variantes</strong> · 39 créditos · escoges la que más te guste</div>
      </li>
      <li className="flex gap-3">
        <span className="font-mono font-bold w-6 flex-shrink-0" style={{ color: '#1A1A1A' }}>3.</span>
        <div><strong>Hoja de personaje</strong> · ángulos faciales y de cuerpo (consistencia futura)</div>
      </li>
      <li className="flex gap-3">
        <span className="font-mono font-bold w-6 flex-shrink-0" style={{ color: '#1A1A1A' }}>4.</span>
        <div><strong>Studio</strong> · genera fotos editoriales con tu nueva modelo</div>
      </li>
    </ol>
    <div className="rounded-xl p-3 text-[12px] leading-relaxed" style={{ background: '#FFFAEB', border: '1px solid #FDE68A', color: '#7C5C18' }}>
      💡 <strong>Tip:</strong> tienes 50 créditos gratis al registrarte. Suficientes para crear tu primera modelo con una sesión inicial. Después renovamos 25 cr cada lunes.
    </div>
  </div>
)

const Step4Launch: React.FC = () => (
  <div className="space-y-5">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
        <Calendar size={22} style={{ color: '#1A1A1A' }} />
      </div>
      <h2 className="text-[22px] font-bold" style={{ color: '#1A1A1A' }}>Plan primer mes (resumen)</h2>
    </div>
    <p className="text-[14px]" style={{ color: '#555' }}>
      No basta con generar fotos. Para que la audiencia llegue, hay que postear con cadencia. Esto es lo mínimo:
    </p>
    <div className="space-y-2.5">
      {[
        { week: 'Sem 1', action: 'Crear modelo + cuenta IG/TikTok + 5 fotos iniciales (presentación)' },
        { week: 'Sem 2', action: '3 reels (Studio Reels) + 4 fotos lifestyle + interactuar 30 cuentas/día' },
        { week: 'Sem 3', action: 'Primera colab con otra cuenta IA + variar contenido (mirror selfie, GRWM)' },
        { week: 'Sem 4', action: 'Si llegas a 1k followers: lanzar OF/Fansly con teaser content' },
      ].map(({ week, action }) => (
        <div key={week} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#F8F8F8' }}>
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded mt-0.5" style={{ background: '#1A1A1A', color: '#fff' }}>{week}</span>
          <span className="text-[13px] leading-relaxed" style={{ color: '#444' }}>{action}</span>
        </div>
      ))}
    </div>
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1A1A1A, #333)', color: '#fff' }}>
      <div className="text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ opacity: 0.7 }}>Comunidad Discord</div>
      <div className="text-[14px] font-semibold mb-2">No estás solo en esto.</div>
      <div className="text-[12px] leading-relaxed" style={{ opacity: 0.85 }}>
        Únete al Discord — gente construyendo lo mismo, casos reales, ayuda con prompts, primer cliente, primeros $100. Link en el sidebar después del onboarding.
      </div>
    </div>
  </div>
)

export default OnboardingWizard
