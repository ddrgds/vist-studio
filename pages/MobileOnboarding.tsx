/**
 * MobileOnboarding — fullscreen swipeable wizard for first-time mobile users.
 *
 * 5 steps (matches desktop OnboardingWizard structure but native-feeling):
 *   0) Bienvenida + caso fundador
 *   1) Tu enfoque (editorial / lifestyle / sensual)
 *   2) Tu modelo (nombre + vibe inicial)
 *   3) Primera sesión (qué pasa después)
 *   4) Plan primer mes + Discord
 *
 * Final CTA writes prefill (name/vibe/focus) to pipelineStore so CrearPersonaje
 * picks it up on mount, then navigates to 'create'.
 *
 * Reuses localStorage keys from desktop wizard so completion state is shared.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Camera, Calendar, Rocket, X } from 'lucide-react';
import type { Page } from '../App';
import { usePipelineStore } from '../stores/pipelineStore';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/nativeService';

const STORAGE_KEY = 'vist_onboarding_step';
const COMPLETED_KEY = 'vist_onboarding_completed';

export function isMobileOnboardingCompleted(): boolean {
  try { return localStorage.getItem(COMPLETED_KEY) === 'true'; }
  catch { return false; }
}

export function markMobileOnboardingCompleted(): void {
  try { localStorage.setItem(COMPLETED_KEY, 'true'); } catch { /* ignore */ }
}

type Focus = 'editorial' | 'lifestyle' | 'sensual';

interface Props {
  onClose: () => void;
  /** Called with selected focus when wizard reaches final CTA. */
  onLaunch: (target: Page) => void;
}

const STEP_LABELS = ['Bienvenida', 'Tu enfoque', 'Tu modelo', 'Primera sesión', 'Cadencia'];

export default function MobileOnboarding({ onClose, onLaunch }: Props) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [name, setName] = useState('');

  const setOnboardingPrefill = usePipelineStore(s => s.setOnboardingPrefill);

  // Restore step from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const n = Number(saved);
        if (n >= 0 && n <= 4) setStep(n);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(step)); } catch { /* ignore */ }
  }, [step]);

  // Swipe handlers
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll, ignore
    if (Math.abs(dx) < 60) return;
    if (dx < 0 && step < 4) { hapticLight(); setStep(s => s + 1); }
    if (dx > 0 && step > 0) { hapticLight(); setStep(s => s - 1); }
  };

  const next = () => { hapticLight(); setStep(s => Math.min(4, s + 1)); };
  const back = () => { hapticLight(); setStep(s => Math.max(0, s - 1)); };
  const skip = () => { hapticLight(); markMobileOnboardingCompleted(); onClose(); };
  const finish = () => {
    hapticSuccess();
    markMobileOnboardingCompleted();
    setOnboardingPrefill({
      name: name.trim() || undefined,
      focus: focus ?? undefined,
    });
    onLaunch('create');
  };

  return (
    <div className="ob-shell" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{ONBOARDING_STYLES}</style>

      {/* Header — progress + skip */}
      <div className="ob-header">
        <div className="ob-step-label">
          Paso {step + 1} de 5 · {STEP_LABELS[step]}
        </div>
        <button className="ob-skip" onClick={skip} aria-label="Saltar onboarding">
          <X size={18} />
        </button>
      </div>
      <div className="ob-progress">
        {STEP_LABELS.map((_, i) => (
          <div key={i} className={`ob-dot ${i <= step ? 'is-on' : ''}`} />
        ))}
      </div>

      {/* Body — scrollable */}
      <div className="ob-body" key={step}>
        {step === 0 && <Step0 />}
        {step === 1 && <Step1 value={focus} onChange={(v) => { hapticMedium(); setFocus(v); }} />}
        {step === 2 && <Step2 name={name} onName={setName} />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}
      </div>

      {/* Footer — sticky nav */}
      <div className="ob-footer">
        <button className="ob-back" onClick={back} disabled={step === 0}>
          <ChevronLeft size={16} /> Atrás
        </button>
        {step < 4 ? (
          <button className="ob-next" onClick={next}>
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <button className="ob-finish" onClick={finish}>
            <Rocket size={14} /> Crear mi modelo
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Steps ───────────────────────────────────────

const Step0: React.FC = () => (
  <div className="ob-step">
    <div className="ob-eyebrow">Bienvenido</div>
    <h1 className="ob-title">
      Crea tu personaje y empieza a <em>construir su cuenta</em>.
    </h1>
    <p className="ob-sub">En 5 minutos vas a salir con:</p>
    <ul className="ob-list">
      <li><span className="ob-tick">✓</span> Tu modelo virtual lista para generar contenido</li>
      <li><span className="ob-tick">✓</span> Una hoja de ruta clara para sus primeras semanas</li>
      <li><span className="ob-tick">✓</span> Acceso al Discord para compartir resultados</li>
    </ul>
  </div>
);

const Step1: React.FC<{ value: Focus | null; onChange: (v: Focus) => void }> = ({ value, onChange }) => (
  <div className="ob-step">
    <div className="ob-eyebrow">Tu enfoque</div>
    <h1 className="ob-title">¿Qué tipo de modelo quieres construir?</h1>
    <p className="ob-sub">Define los presets y herramientas. Lo puedes cambiar después.</p>
    <div className="ob-focus-grid">
      {[
        { id: 'editorial' as Focus, emoji: '📷', title: 'Editorial', desc: 'IG limpio, fashion, lifestyle. Marketing y marcas.' },
        { id: 'lifestyle' as Focus, emoji: '🌴', title: 'Lifestyle', desc: 'Día a día, viajes, beach, urban — variado.' },
        { id: 'sensual'   as Focus, emoji: '🔥', title: 'Editorial Sensual', desc: 'Lencería, beach, boudoir. Modo Creator (+18).' },
      ].map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`ob-focus-card ${value === opt.id ? 'is-on' : ''}`}
        >
          <div className="ob-focus-emoji">{opt.emoji}</div>
          <div className="ob-focus-title">{opt.title}</div>
          <div className="ob-focus-desc">{opt.desc}</div>
        </button>
      ))}
    </div>
  </div>
);

const Step2: React.FC<{
  name: string;
  onName: (v: string) => void;
}> = ({ name, onName }) => (
  <div className="ob-step">
    <div className="ob-eyebrow">Tu modelo</div>
    <h1 className="ob-title">Empezá por un nombre</h1>
    <p className="ob-sub">Lo demás (rostro, pelo, ropa, look) lo definís en Crear Personaje. Acá solo necesitamos cómo se llama.</p>

    <label className="ob-field-label">Nombre</label>
    <input
      className="ob-input"
      value={name}
      onChange={e => onName(e.target.value)}
      placeholder="Ej: María, Sofía, Camila..."
      autoCapitalize="words"
      autoCorrect="off"
      autoFocus
    />
    <p className="ob-hint">No te encariñes con el primero. Vas a iterar varios — es parte del proceso.</p>
  </div>
);

const Step3: React.FC = () => (
  <div className="ob-step">
    <div className="ob-step-icon">
      <Camera size={22} />
    </div>
    <div className="ob-eyebrow">Primera sesión</div>
    <h1 className="ob-title">Qué pasa después</h1>
    <p className="ob-sub">En el siguiente paso vamos a Crear Personaje:</p>
    <ol className="ob-numbered">
      <li>
        <span className="ob-num">1</span>
        <div><strong>Diseña su look</strong> · rostro, pelo, ojos, ropa</div>
      </li>
      <li>
        <span className="ob-num">2</span>
        <div><strong>Genera 1, 2 o 4 variantes</strong> · escoges la mejor (4–12 cr)</div>
      </li>
      <li>
        <span className="ob-num">3</span>
        <div><strong>Hoja de personaje</strong> · ángulos faciales y de cuerpo (consistencia futura)</div>
      </li>
      <li>
        <span className="ob-num">4</span>
        <div><strong>Studio</strong> · genera fotos editoriales con tu nueva modelo</div>
      </li>
    </ol>
    <div className="ob-tip">
      💡 <strong>Tip:</strong> tienes 50 créditos gratis. Suficientes para tu primera modelo + sesión inicial. Renovamos 25 cr cada lunes.
    </div>
  </div>
);

const Step4: React.FC = () => (
  <div className="ob-step">
    <div className="ob-step-icon">
      <Calendar size={22} />
    </div>
    <div className="ob-eyebrow">Cadencia</div>
    <h1 className="ob-title">Postear seguido importa más que postear perfecto</h1>
    <p className="ob-sub">Una sugerencia honesta de ritmo para las primeras semanas. Vos ajustás lo que funcione:</p>
    <div className="ob-plan">
      {[
        { week: 'Sem 1', action: 'Crear modelo + abrir cuentas (IG/TikTok) + 4-5 fotos de presentación' },
        { week: 'Sem 2', action: 'Sumar reels cortos + variar escenarios + responder DMs' },
        { week: 'Sem 3', action: 'Mezclar formatos: mirror selfie, GRWM, lifestyle, fotos de "día a día"' },
        { week: 'Sem 4', action: 'Mirar qué tipo de post pegó más y doblar apuestas ahí' },
      ].map(({ week, action }) => (
        <div key={week} className="ob-plan-row">
          <span className="ob-plan-week">{week}</span>
          <span className="ob-plan-action">{action}</span>
        </div>
      ))}
    </div>
    <p className="ob-disclaimer">
      No prometemos seguidores ni dinero. Es una herramienta de generación, no garantía de audiencia.
    </p>
    <div className="ob-discord">
      <div className="ob-discord-label">Comunidad</div>
      <div className="ob-discord-title">No estás solo experimentando.</div>
      <div className="ob-discord-sub">
        Discord (link en tu perfil): gente probando lo mismo, comparando prompts, mostrando qué funciona y qué no. Vos también compartí lo tuyo.
      </div>
    </div>
  </div>
);

// ─── Styles ───────────────────────────────────────

const ONBOARDING_STYLES = `
.ob-shell {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: #F5EBDB;
  color: #1F1A14;
  font-family: 'DM Sans', -apple-system, system-ui, sans-serif;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}

.ob-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 8px;
}
.ob-step-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8E5640;
  font-weight: 500;
}
.ob-skip {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: none;
  border-radius: 999px;
  color: #6F5E4C;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ob-skip:active { background: rgba(31,26,20,0.06); transform: scale(0.92); }

.ob-progress {
  display: flex; gap: 6px;
  padding: 0 20px 12px;
}
.ob-dot {
  flex: 1; height: 3px; border-radius: 999px;
  background: rgba(31,26,20,0.10);
  transition: background 200ms ease;
}
.ob-dot.is-on { background: #C9785C; }

.ob-body {
  flex: 1; min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 20px 20px;
  animation: obFadeIn 220ms ease-out;
}
@keyframes obFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ob-step { display: flex; flex-direction: column; gap: 14px; }

.ob-step-icon {
  width: 44px; height: 44px;
  border-radius: 14px;
  background: #FFFCF5;
  border: 1px solid rgba(31,26,20,0.08);
  display: flex; align-items: center; justify-content: center;
  color: #8E5640;
  margin-bottom: 4px;
}

.ob-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #C9785C;
  font-weight: 500;
}

.ob-title {
  font-family: 'Instrument Serif', 'Playfair Display', Georgia, serif;
  font-size: 32px; line-height: 1.08;
  font-weight: 400;
  color: #1F1A14;
  letter-spacing: -0.01em;
  margin: -2px 0 0;
}
.ob-title em {
  font-style: italic;
  color: #8E5640;
}

.ob-sub {
  font-size: 15px; line-height: 1.5;
  color: #6F5E4C;
  margin: 0;
}

.ob-list { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-direction: column; gap: 8px; }
.ob-list li { display: flex; gap: 10px; font-size: 14px; color: #3D332A; line-height: 1.4; }
.ob-tick { color: #C9785C; font-weight: 600; flex-shrink: 0; }

.ob-quote {
  display: flex; gap: 10px;
  padding: 14px;
  background: #FFFCF5;
  border: 1px solid rgba(31,26,20,0.08);
  border-radius: 14px;
  margin-top: 8px;
  font-size: 13px; line-height: 1.5;
  color: #3D332A;
}
.ob-quote strong { color: #1F1A14; }
.ob-quote-icon { color: #C9785C; flex-shrink: 0; margin-top: 3px; }

/* Step 1 — focus */
.ob-focus-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.ob-focus-card {
  text-align: left;
  padding: 14px 16px;
  border-radius: 16px;
  background: #FFFCF5;
  border: 1.5px solid rgba(31,26,20,0.08);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 180ms ease;
}
.ob-focus-card:active { transform: scale(0.985); }
.ob-focus-card.is-on {
  background: #1F1A14;
  border-color: #1F1A14;
  color: #F5EBDB;
}
.ob-focus-card.is-on .ob-focus-desc { color: rgba(245,235,219,0.78); }
.ob-focus-emoji { font-size: 22px; margin-bottom: 4px; }
.ob-focus-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; color: inherit; }
.ob-focus-desc { font-size: 12.5px; line-height: 1.45; color: #6F5E4C; }

/* Step 2 — model */
.ob-field-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #A8957D;
  font-weight: 500;
  display: block;
  margin: 8px 0 6px;
}
.ob-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  background: #FFFCF5;
  border: 1.5px solid rgba(31,26,20,0.08);
  font-size: 15px;
  font-family: inherit;
  color: #1F1A14;
  outline: none;
  -webkit-appearance: none;
  transition: border-color 150ms ease;
}
.ob-input:focus { border-color: #C9785C; }
.ob-input::placeholder { color: #A8957D; }

.ob-hint {
  font-size: 12.5px;
  line-height: 1.5;
  color: #8E5640;
  font-style: italic;
  margin: 8px 2px 0;
}

.ob-disclaimer {
  font-size: 11.5px;
  line-height: 1.5;
  color: #8E5640;
  margin: 4px 2px 8px;
  padding-left: 10px;
  border-left: 2px solid rgba(201,120,92,0.30);
}

/* Step 3 — first session */
.ob-numbered { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-direction: column; gap: 12px; }
.ob-numbered li { display: flex; gap: 12px; align-items: flex-start; font-size: 14px; line-height: 1.45; color: #3D332A; }
.ob-numbered strong { color: #1F1A14; }
.ob-num {
  flex-shrink: 0;
  width: 26px; height: 26px;
  border-radius: 8px;
  background: #C9785C;
  color: #FFFCF5;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; font-weight: 600;
}

.ob-tip {
  padding: 12px 14px;
  background: #FFF6E0;
  border: 1px solid rgba(212,168,95,0.30);
  border-radius: 12px;
  font-size: 12.5px; line-height: 1.5;
  color: #5C4513;
  margin-top: 4px;
}
.ob-tip strong { color: #4A3608; }

/* Step 4 — plan */
.ob-plan { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.ob-plan-row {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px;
  background: #FFFCF5;
  border-radius: 12px;
  border: 1px solid rgba(31,26,20,0.06);
}
.ob-plan-week {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 600;
  padding: 4px 8px;
  background: #1F1A14;
  color: #F5EBDB;
  border-radius: 6px;
  letter-spacing: 0.04em;
}
.ob-plan-action { font-size: 13px; line-height: 1.45; color: #3D332A; }

.ob-discord {
  margin-top: 12px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1F1A14 0%, #3D332A 100%);
  color: #F5EBDB;
}
.ob-discord-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.65;
  margin-bottom: 6px;
}
.ob-discord-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
.ob-discord-sub { font-size: 12.5px; line-height: 1.5; opacity: 0.82; }

/* Footer */
.ob-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px 14px;
  border-top: 1px solid rgba(31,26,20,0.08);
  background: #F8EFDD;
}

.ob-back {
  display: flex; align-items: center; gap: 4px;
  padding: 10px 14px;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: #6F5E4C;
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.ob-back:disabled { color: #C5B299; cursor: default; }
.ob-back:not(:disabled):active { transform: scale(0.97); }

.ob-next, .ob-finish {
  margin-left: auto;
  display: flex; align-items: center; gap: 6px;
  padding: 12px 18px;
  border-radius: 12px;
  background: #1F1A14;
  color: #F5EBDB;
  border: none;
  font-size: 14px; font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: transform 120ms ease;
}
.ob-next:active, .ob-finish:active { transform: scale(0.97); }
.ob-finish {
  background: linear-gradient(135deg, #C9785C 0%, #8E5640 100%);
}
`;
