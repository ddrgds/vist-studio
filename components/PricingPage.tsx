import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../services/lemonSqueezyService';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Plan {
  id:           string;
  name:         string;
  monthlyPrice: number;
  annualPrice:  number;
  description:  string;
  badge?:       string;
  cta:          string;
  ctaStyle:     'ghost' | 'coral' | 'white' | 'gold';
  credits:      string;
  features:     { label: string; note?: string }[];
  limits:       { label: string; value: string }[];
  monthlyVariantId: string;
  annualVariantId:  string;
}

// ─────────────────────────────────────────────
// Variant IDs — public product identifiers, not secrets.
// ─────────────────────────────────────────────
// Resolution order per slot:
//   1. import.meta.env.VITE_LS_*_VARIANT_ID   ← preferred. Set these in Cloudflare
//      Pages → Settings → Environment variables (Production) and rebuild. Lets you
//      swap Lemon Squeezy variants ($19/$79/$199 etc.) without a code change.
//   2. fallback string below ← legacy IDs from $9.99/$29.99/$99.99 tier. Used only
//      so local dev still works when envs aren't set; checkout in prod must use
//      env-injected IDs.
const env = (import.meta as any).env ?? {};
// Fallback IDs match Lemon Squeezy production variants as of 2026-05-12.
// Env vars take precedence so you can swap stores/accounts without a code change.
const V = {
  miniMonthly:    env.VITE_LS_MINI_MONTHLY_VARIANT_ID    || '1050128',
  miniAnnual:     env.VITE_LS_MINI_ANNUAL_VARIANT_ID     || '1050120',
  proMonthly:     env.VITE_LS_PRO_MONTHLY_VARIANT_ID     || '872578',
  proAnnual:      env.VITE_LS_PRO_ANNUAL_VARIANT_ID      || '872643',
  studioMonthly:  env.VITE_LS_STUDIO_MONTHLY_VARIANT_ID  || '872647',
  studioAnnual:   env.VITE_LS_STUDIO_ANNUAL_VARIANT_ID   || '872654',
  brandMonthly:   env.VITE_LS_BRAND_MONTHLY_VARIANT_ID   || '872659',
  brandAnnual:    env.VITE_LS_BRAND_ANNUAL_VARIANT_ID    || '872660',
  credits200:     env.VITE_LS_CREDITS_200_VARIANT_ID     || '872662',
  credits750:     env.VITE_LS_CREDITS_750_VARIANT_ID     || '872664',
  credits3000:    env.VITE_LS_CREDITS_3000_VARIANT_ID    || '872667',
};

// ─────────────────────────────────────────────
// Plan data
// ─────────────────────────────────────────────

// NOTE: Plan IDs (starter/mini/pro/studio/brand) are kept for backend compatibility
// with the SubscriptionPlan enum in DB and existing Lemon Squeezy webhooks.
// Display name + price match the wedge "AI operator LATAM" wedge (locked 2026-05-05).
// Variant IDs point to live LS variants at the correct prices ($5/$19/$79/$199).
const PLANS: Plan[] = [
  {
    id: 'starter', name: 'Free · Explora', monthlyPrice: 0, annualPrice: 0,
    description: 'Crea tu primera modelo y prueba el flujo completo, sin tarjeta.',
    cta: 'Empezar gratis', ctaStyle: 'ghost',
    credits: '50 cr al registro + 25 cr/semana',
    monthlyVariantId: '', annualVariantId: '',
    limits: [
      { label: 'Créditos',         value: '~150 / mes' },
      { label: 'Modelos',          value: '1' },
      { label: 'Modo Creator',     value: '✗' },
    ],
    features: [
      { label: '50 créditos al registrarte' },
      { label: '+25 créditos cada lunes' },
      { label: '1 modelo virtual' },
      { label: 'Modo Standard solo (editorial)' },
      { label: 'Watermark @VIST en outputs' },
      { label: 'Discord de la comunidad' },
    ],
  },
  {
    id: 'mini', name: 'Mini', monthlyPrice: 5, annualPrice: 4,
    description: 'Prueba el flujo completo sin compromiso. Cancela cuando quieras.',
    cta: 'Suscribirme', ctaStyle: 'ghost',
    credits: '250 créditos / mes',
    monthlyVariantId: V.miniMonthly,
    annualVariantId:  V.miniAnnual,
    limits: [
      { label: 'Créditos / mes',   value: '250' },
      { label: 'Modelos',          value: '1' },
      { label: 'Modo Creator',     value: '✗' },
      { label: 'Resolución máx.',  value: '2K' },
    ],
    features: [
      { label: '250 créditos mensuales (~38 fotos)' },
      { label: '1 modelo virtual' },
      { label: 'Modo Standard (editorial)' },
      { label: 'Sin watermark · 2K resolution' },
      { label: 'Discord de la comunidad' },
      { label: 'Cancela cuando quieras' },
    ],
  },
  {
    id: 'pro', name: 'Side Project', monthlyPrice: 19, annualPrice: 15,
    description: 'Si te lo tomas en serio. Tu primer modelo activo en redes con consistencia.',
    badge: 'Recomendado',
    cta: 'Suscribirme', ctaStyle: 'coral',
    credits: '800 créditos / mes',
    monthlyVariantId: V.proMonthly,
    annualVariantId:  V.proAnnual,
    limits: [
      { label: 'Créditos / mes',   value: '800' },
      { label: 'Modelos',          value: '1' },
      { label: 'Modo Creator',     value: '✓' },
      { label: 'Resolución máx.',  value: '2K' },
    ],
    features: [
      { label: '800 créditos mensuales (~120 fotos)' },
      { label: '1 modelo virtual' },
      { label: 'Modo Standard + Modo Creator (+18)' },
      { label: 'Sin watermark · 2K resolution' },
      { label: 'Presets LATAM culturales + sensuales' },
      { label: 'Discord prioritario' },
    ],
  },
  {
    id: 'studio', name: 'Negocio', monthlyPrice: 79, annualPrice: 65,
    description: 'Para operadores serios. Múltiples modelos, reels HD, voz LATAM.',
    cta: 'Suscribirme', ctaStyle: 'white',
    credits: '4,000 créditos / mes',
    monthlyVariantId: V.studioMonthly,
    annualVariantId:  V.studioAnnual,
    limits: [
      { label: 'Créditos / mes',   value: '4,000' },
      { label: 'Modelos',          value: '3' },
      { label: 'Reels HD',         value: '✓' },
      { label: 'Resolución máx.',  value: '4K' },
    ],
    features: [
      { label: '4,000 créditos mensuales (~615 fotos · 46 reels)' },
      { label: '3 modelos virtuales' },
      { label: 'Reels HD (Kling Pro)' },
      { label: 'Voces ElevenLabs en español (acentos variados)' },
      { label: 'Playbook completo de monetización' },
      { label: 'Cola prioritaria' },
    ],
  },
  {
    id: 'brand', name: 'Pro · Agency', monthlyPrice: 199, annualPrice: 165,
    description: 'Si manejas un portfolio de modelos. Multi-personaje, affiliate, soporte 1:1.',
    cta: 'Suscribirme', ctaStyle: 'gold',
    credits: '12,000 créditos / mes',
    monthlyVariantId: V.brandMonthly,
    annualVariantId:  V.brandAnnual,
    limits: [
      { label: 'Créditos / mes',   value: '12,000' },
      { label: 'Modelos',          value: '10' },
      { label: 'Affiliate',        value: '✓' },
      { label: 'Resolución máx.',  value: '4K' },
    ],
    features: [
      { label: '12,000 créditos mensuales (~1,850 fotos · 140 reels)' },
      { label: '10 modelos virtuales' },
      { label: 'Multi-personaje switcher' },
      { label: '1:1 setup call con el equipo' },
      { label: 'Affiliate dashboard (30% comisión)' },
      { label: 'Acceso anticipado a nuevas features' },
    ],
  },
];

const CREDIT_PACKS = [
  { credits: 200,   price: 3,  perCredit: '1.5¢', variantId: V.credits200 },
  { credits: 750,   price: 10, perCredit: '1.33¢', variantId: V.credits750 },
  { credits: 3000,  price: 30, perCredit: '1.0¢', badge: 'Mejor valor', variantId: V.credits3000 },
];

const FAQ_ITEMS = [
  { q: '¿Qué incluye el plan gratis?', a: '50 créditos al registrarte (suficientes para crear tu primera modelo + ~10 fotos), más 25 créditos automáticos cada lunes. 1 modelo. Modo Standard. Watermark "@VIST" en los outputs. Acceso al Discord. Sin tarjeta de crédito.' },
  { q: '¿Cuántas fotos puedo generar?', a: 'Una foto cuesta entre 6-13 créditos según calidad. Free ≈ 11 fotos/mes. Mini ≈ 38 fotos/mes. Side Project ≈ 120 fotos/mes. Negocio ≈ 615 fotos/mes. Pro Agency ≈ 1,850 fotos/mes.' },
  { q: '¿Y los reels?', a: 'Reels son más caros (~86-143 créditos). Free no incluye reels HD. Side Project ≈ 9 reels/mes. Negocio ≈ 46 reels HD/mes. Pro Agency ≈ 140 reels HD/mes.' },
  { q: '¿Qué es Modo Creator?', a: 'Toggle opt-in (+18) que desbloquea presets sensuales editoriales: lencería, beach Brazilian, boudoir LATAM, mirror selfie. Línea dura: NO topless, NO desnudo, NO contenido explícito. Sistema de safety automático rechaza outputs que crucen la línea.' },
  { q: '¿Cómo monetizo mi modelo?', a: 'IG/TikTok orgánico (engagement → marcas), OnlyFans/Fansly para teaser content (no explícito), tu propia tienda. El playbook (incluido en Negocio y Pro) te guía mes a mes con metas claras.' },
  { q: '¿Es legal?', a: 'Sí. Modelos virtuales generados por IA son contenido legítimo cuando se etiquetan como tales. Nuestros ToS exigen disclosure "@AI" en perfiles públicos. NO permitimos: deepfakes de personas reales, menores, contenido explícito.' },
  { q: '¿Pago en mi moneda local?', a: 'Pronto. Lemon Squeezy soporta USD globalmente. Estamos integrando Mercado Pago para MXN/COP/ARS/PEN/BRL/CLP con métodos locales (PIX, OXXO, transferencia).' },
  { q: '¿Puedo cambiar de plan?', a: 'Sí — mejora o baja de plan cuando quieras. Las mejoras aplican de inmediato; las bajas se aplican en el siguiente ciclo de cobro. Cancela en cualquier momento.' },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: 'rgba(255,255,255,.04)' }}>
      <button className="w-full flex items-center justify-between py-4 text-left gap-4"
        onClick={() => setOpen(p => !p)}>
        <span className="text-[13px] font-medium transition-colors"
          style={{ color: open ? 'var(--joi-text-1)' : 'var(--joi-text-2)' }}>{q}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="var(--joi-text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <p className="pb-4 text-[13px] leading-relaxed" style={{ color: 'var(--joi-text-2)' }}>{a}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────
// PricingPage
// ─────────────────────────────────────────────

const CHECKOUT_INTENT_KEY = 'vist_checkout_intent';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const { profile } = useProfile();
  const { user } = useAuth();
  const { plan: currentPlan } = useSubscription();
  const autoCheckoutDone = useRef(false);

  // Auto-checkout: if the user just logged in and had a pending intent
  useEffect(() => {
    if (!user || autoCheckoutDone.current) return;
    autoCheckoutDone.current = true;
    const raw = sessionStorage.getItem(CHECKOUT_INTENT_KEY);
    if (!raw) return;
    sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
    try {
      const intent = JSON.parse(raw) as { variantId: string; planId: string };
      if (intent.variantId) {
        setCheckoutLoading(intent.planId);
        createCheckoutSession(intent.variantId)
          .then(url => { window.location.href = url; })
          .catch(err => {
            setCheckoutError(err instanceof Error ? err.message : 'Error en el pago.');
            setCheckoutLoading(null);
          });
      }
    } catch { /* ignore bad data */ }
  }, [user]);

  const startCheckout = async (variantId: string, planId: string) => {
    setCheckoutLoading(planId);
    setCheckoutError(null);
    try {
      const url = await createCheckoutSession(variantId);
      window.location.href = url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Error en el pago. Inténtalo de nuevo.');
      setCheckoutLoading(null);
    }
  };

  const handleCheckout = async (plan: Plan) => {
    const variantId = annual ? plan.annualVariantId : plan.monthlyVariantId;
    if (!variantId) {
      setCheckoutError('Variant ID not configured. Set VITE_LS_*_VARIANT_ID in .env.local');
      return;
    }

    if (!user) {
      // Save intent so we can auto-checkout after login
      sessionStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify({ variantId, planId: plan.id }));
      setShowSignUpPrompt(true);
      return;
    }

    await startCheckout(variantId, plan.id);
  };

  return (
    <div className="min-h-full overflow-y-auto pb-16 lg:pb-0 custom-scrollbar" style={{ background: 'var(--joi-bg-0)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 pb-24">

        {/* ── Header ── */}
        <div className="section-header">
          <div className="section-label">Planes</div>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, lineHeight: 1.1, marginBottom: 16 }}>
            Empieza gratis.<br/>
            <span style={{ fontStyle: 'italic' }}>Escala sin límites.</span>
          </h2>
          <p className="text-[15px] max-w-md mx-auto mb-8" style={{ color: 'var(--joi-text-2)' }}>
            Paga a medida que creces. Los créditos se reinician cada mes. Sin sorpresas.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 px-1 py-1 rounded-full"
            style={{ background: 'var(--joi-bg-3)', border: '1px solid rgba(255,255,255,.04)' }}>
            <button onClick={() => setAnnual(false)}
              className="px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={!annual
                ? { background: 'var(--joi-pink)', color: '#fff' }
                : { background: 'transparent', color: 'var(--joi-text-3)' }
              }>
              Mensual
            </button>
            <button onClick={() => setAnnual(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={annual
                ? { background: 'var(--joi-pink)', color: '#fff' }
                : { background: 'transparent', color: 'var(--joi-text-3)' }
              }>
              Anual
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-jet font-bold"
                style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--joi-pink)' }}>2 meses gratis</span>
            </button>
          </div>
        </div>

        {/* ── Annual savings banner ── */}
        {annual && (
          <div
            className="mb-8 px-5 py-3.5 rounded-2xl flex items-center justify-center gap-3 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(79,70,229,0.04) 100%)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            <span className="text-[13px] font-medium" style={{ color: 'var(--joi-text-2)' }}>
              La facturación anual te ahorra hasta
            </span>
            <span
              className="text-[14px] font-bold font-jet px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--joi-pink)' }}
            >
              ${(PLANS[3].monthlyPrice - PLANS[3].annualPrice) * 12}/año
            </span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--joi-text-2)' }}>
              en el plan Brand
            </span>
          </div>
        )}

        {/* ── Sign-up prompt for anonymous users ── */}
        {showSignUpPrompt && !user && (
          <div className="mb-6 px-5 py-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--joi-text-1)' }}>
                Crea una cuenta gratis para suscribirte
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--joi-text-2)' }}>
                Regístrate en segundos — serás redirigido al pago automáticamente.
              </p>
            </div>
            <button
              onClick={() => navigate('/studio')}
              className="btn-primary px-5 py-2.5 text-sm font-bold shrink-0">
              Registrarse gratis
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {checkoutError && (
          <div className="mb-6 px-4 py-3 rounded-xl text-[13px] text-center"
            style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff8a8a' }}>
            {checkoutError}
          </div>
        )}

        {/* ── Plan cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-20">
          {PLANS.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            const isCurrent = currentPlan === plan.id || (currentPlan === 'starter' && plan.id === 'starter');
            const isFree = plan.id === 'starter';
            const isFeatured = plan.badge === 'Más Popular';

            return (
              <div key={plan.id}
                className={`price-card flex flex-col${isFeatured ? ' featured' : ''}`}>

                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold font-jet"
                    style={{ background: isFeatured ? 'linear-gradient(135deg, var(--joi-pink), var(--magenta))' : 'var(--gold)', color: '#000' }}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-jet text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--joi-text-3)' }}>{plan.name}</h3>
                  <p className="text-[13px]" style={{ color: 'var(--joi-text-2)' }}>{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-end gap-1.5">
                    <span className="font-display text-[42px] leading-none" style={{ color: 'var(--joi-text-1)' }}>${price}</span>
                    {!isFree && (
                      <span className="text-base font-body pb-1.5" style={{ color: 'var(--joi-text-3)' }}>
                        /mes{annual && <span className="ml-1 text-[10px]">facturado anualmente</span>}
                      </span>
                    )}
                  </div>
                  {!isFree && annual && (
                    <p className="text-[11px] mt-1 font-jet" style={{ color: 'var(--joi-pink)' }}>
                      Ahorra ${(plan.monthlyPrice - plan.annualPrice) * 12}/año
                    </p>
                  )}
                  {/* Credits badge */}
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-jet font-bold"
                    style={{ background: 'rgba(224,176,80,0.1)', color: 'var(--gold)', border: '1px solid rgba(224,176,80,0.2)' }}>
                    {plan.credits}
                  </div>
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full py-3 rounded-xl text-[13px] font-semibold mb-5 text-center"
                    style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-3)', border: '1px solid rgba(255,255,255,.04)' }}>
                    Plan actual
                  </div>
                ) : isFree ? (
                  <button onClick={() => navigate('/studio')}
                    className="btn-ghost px-4 py-3 w-full justify-center text-[13px] font-semibold mb-5">
                    {plan.cta}
                  </button>
                ) : isFeatured ? (
                  <button onClick={() => handleCheckout(plan)}
                    disabled={checkoutLoading !== null}
                    className="btn-primary px-4 py-3 w-full justify-center text-[13px] font-semibold mb-5 disabled:opacity-60">
                    {checkoutLoading === plan.id
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirigiendo...</>
                      : plan.cta}
                  </button>
                ) : (
                  <button onClick={() => handleCheckout(plan)}
                    disabled={checkoutLoading !== null}
                    className="btn-ghost px-4 py-3 w-full justify-center text-[13px] font-semibold mb-5 disabled:opacity-60">
                    {checkoutLoading === plan.id
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirigiendo...</>
                      : plan.cta}
                  </button>
                )}

                {/* Limits */}
                <div className="rounded-xl p-3 mb-4 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                  {plan.limits.map(l => (
                    <div key={l.label} className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>{l.label}</span>
                      <span className="text-[11px] font-jet font-semibold"
                        style={{ color: l.value === '—' ? 'var(--joi-bg-3)' : 'var(--joi-text-2)' }}>{l.value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 text-[13px]" style={{ color: 'var(--joi-pink)' }}>&#8594;</span>
                      <span className="text-[13px] leading-snug" style={{ color: 'var(--joi-text-2)' }}>
                        {f.label}
                        {f.note && (
                          <span className="ml-1.5 text-[9px] font-jet px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-3)' }}>{f.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* ── Credit cost reference ── */}
        <div className="mb-20 rounded-2xl p-6" style={{ background: 'var(--joi-bg-1)', border: '1px solid rgba(255,255,255,.04)' }}>
          <p className="text-[11px] font-jet uppercase tracking-widest mb-5 text-center" style={{ color: 'var(--joi-text-3)' }}>
            Costo en créditos por acción
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Gemini Flash',   cost: 2  },
              { label: 'FLUX Kontext',   cost: 10 },
              { label: 'FLUX Max',       cost: 12 },
              { label: 'GPT Image 1.5',  cost: 20 },
              { label: 'Ideogram V3',    cost: 15 },
              { label: 'Seedream',       cost: 8  },
              { label: 'Imagen 4 Ultra', cost: 20 },
              { label: 'Face Swap',      cost: 15 },
              { label: 'Upscale 4x',     cost: 8  },
              { label: 'Kling Video',    cost: 80 },
            ].map(({ label, cost }) => (
              <div key={label} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
                <span className="text-[11px]" style={{ color: 'var(--joi-text-2)' }}>{label}</span>
                <span className="text-[11px] font-jet font-bold" style={{ color: 'var(--gold)' }}>{cost}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Credit Packs ── */}
        <div className="mb-20">
          <div className="section-header" style={{ marginBottom: 32 }}>
            <div className="section-label">¿Necesitas más?</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, lineHeight: 1.2, marginBottom: 8 }}>
              Paquetes de Créditos
            </h2>
            <p className="text-[13px]" style={{ color: 'var(--joi-text-2)' }}>
              Compra única. Nunca expiran. Se suman a tu plan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {CREDIT_PACKS.map((pack) => {
              const isBestValue = !!pack.badge;
              return (
                <div key={pack.credits}
                  className={`price-card flex flex-col items-center${isBestValue ? ' featured' : ''}`}
                  style={{ textAlign: 'center' }}>
                  {pack.badge && (
                    <div className="absolute -top-3 px-3 py-1 rounded-full text-[10px] font-bold font-jet"
                      style={{ background: 'linear-gradient(135deg, var(--joi-pink), var(--magenta))', color: '#000' }}>
                      {pack.badge}
                    </div>
                  )}
                  <div className="font-display text-[32px] mb-1" style={{ color: 'var(--joi-text-1)' }}>
                    {pack.credits.toLocaleString('en-US')}
                  </div>
                  <div className="text-[11px] font-jet mb-3" style={{ color: 'var(--gold)' }}>créditos</div>
                  <div className="font-display text-[24px] mb-1" style={{ color: 'var(--joi-text-1)' }}>${pack.price}</div>
                  <div className="text-[11px] font-jet mb-5" style={{ color: 'var(--joi-text-3)' }}>{pack.perCredit} / crédito</div>
                  <button
                    onClick={async () => {
                      if (!pack.variantId) { setCheckoutError('Credit pack variant ID not configured.'); return; }
                      if (!user) {
                        sessionStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify({ variantId: pack.variantId, planId: `pack-${pack.credits}` }));
                        setShowSignUpPrompt(true);
                        return;
                      }
                      await startCheckout(pack.variantId, `pack-${pack.credits}`);
                    }}
                    disabled={checkoutLoading !== null}
                    className={`${isBestValue ? 'btn-primary' : 'btn-ghost'} px-4 py-3 w-full justify-center text-[13px] font-semibold disabled:opacity-60`}
                  >
                    {checkoutLoading === `pack-${pack.credits}`
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirigiendo...</>
                      : `Comprar ${pack.credits.toLocaleString('en-US')} créditos`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-jet uppercase tracking-widest mb-6 text-center" style={{ color: 'var(--joi-text-3)' }}>Preguntas Frecuentes</p>
          {FAQ_ITEMS.map(item => <FaqItem key={item.q} {...item} />)}
        </div>

      </div>
    </div>
  );
};

export default PricingPage;
