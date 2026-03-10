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
// Variant IDs — replace with your real LS IDs
// ─────────────────────────────────────────────
// These are read from import.meta.env so they're baked in at build time
// and never need a server round-trip for the pricing page itself.

const V = {
  proMonthly:     import.meta.env.VITE_LS_PRO_MONTHLY_VARIANT_ID     ?? '',
  proAnnual:      import.meta.env.VITE_LS_PRO_ANNUAL_VARIANT_ID      ?? '',
  studioMonthly:  import.meta.env.VITE_LS_STUDIO_MONTHLY_VARIANT_ID  ?? '',
  studioAnnual:   import.meta.env.VITE_LS_STUDIO_ANNUAL_VARIANT_ID   ?? '',
  brandMonthly:   import.meta.env.VITE_LS_BRAND_MONTHLY_VARIANT_ID   ?? '',
  brandAnnual:    import.meta.env.VITE_LS_BRAND_ANNUAL_VARIANT_ID    ?? '',
  credits200:     import.meta.env.VITE_LS_CREDITS_200_VARIANT_ID     ?? '',
  credits750:     import.meta.env.VITE_LS_CREDITS_750_VARIANT_ID     ?? '',
  credits3000:    import.meta.env.VITE_LS_CREDITS_3000_VARIANT_ID    ?? '',
};

// ─────────────────────────────────────────────
// Plan data
// ─────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: 'starter', name: 'Starter', monthlyPrice: 0, annualPrice: 0,
    description: 'Explore the studio, no commitment.',
    cta: 'Get Started', ctaStyle: 'ghost',
    credits: '50 credits / mo',
    monthlyVariantId: '', annualVariantId: '',
    limits: [
      { label: 'Credits / mo',        value: '50' },
      { label: 'Characters saved',    value: '3' },
      { label: 'Image resolution',    value: 'Up to 1K' },
      { label: 'Video clips',         value: '—' },
    ],
    features: [
      { label: 'Director Studio' },
      { label: 'Generator (5 engines)' },
      { label: 'Gallery & downloads' },
    ],
  },
  {
    id: 'pro', name: 'Pro', monthlyPrice: 19, annualPrice: 16,
    description: 'For creators building their AI presence.',
    badge: 'Most popular',
    cta: 'Start Pro', ctaStyle: 'coral',
    credits: '500 credits / mo',
    monthlyVariantId: V.proMonthly,
    annualVariantId:  V.proAnnual,
    limits: [
      { label: 'Credits / mo',        value: '500' },
      { label: 'Characters saved',    value: '25' },
      { label: 'Image resolution',    value: 'Up to 2K' },
      { label: 'Video clips',         value: '20 / mo' },
    ],
    features: [
      { label: 'Everything in Starter' },
      { label: 'Priority generation' },
      { label: 'Virtual Try-On' },
      { label: 'Upscale & enhance' },
      { label: 'Storyboard export' },
      { label: 'Remove background' },
    ],
  },
  {
    id: 'studio', name: 'Studio', monthlyPrice: 49, annualPrice: 41,
    description: 'For agencies and power creators.',
    cta: 'Start Studio', ctaStyle: 'white',
    credits: '1,500 credits / mo',
    monthlyVariantId: V.studioMonthly,
    annualVariantId:  V.studioAnnual,
    limits: [
      { label: 'Credits / mo',        value: '1,500' },
      { label: 'Characters saved',    value: 'Unlimited' },
      { label: 'Image resolution',    value: 'Up to 4K' },
      { label: 'Video clips',         value: 'Unlimited' },
    ],
    features: [
      { label: 'Everything in Pro' },
      { label: 'Dedicated queue' },
      { label: 'NSFW engine access' },
      { label: 'API access', note: 'coming soon' },
      { label: 'Custom model fine-tuning', note: 'coming soon' },
      { label: 'Priority support' },
    ],
  },
  {
    id: 'brand', name: 'Brand', monthlyPrice: 149, annualPrice: 119,
    description: 'For brand teams and mass production.',
    badge: 'Enterprise',
    cta: 'Start Brand', ctaStyle: 'gold',
    credits: '8,000 credits / mo',
    monthlyVariantId: V.brandMonthly,
    annualVariantId:  V.brandAnnual,
    limits: [
      { label: 'Credits / mo',        value: '8,000' },
      { label: 'Characters saved',    value: 'Unlimited' },
      { label: 'Image resolution',    value: 'Up to 4K' },
      { label: 'Video clips',         value: 'Unlimited' },
    ],
    features: [
      { label: 'Everything in Studio' },
      { label: '8,000 monthly credits' },
      { label: 'Dedicated generation queue' },
      { label: 'Custom brand fine-tuning' },
      { label: 'Team seats', note: 'coming soon' },
      { label: 'SLA & dedicated support' },
    ],
  },
];

const CREDIT_PACKS = [
  { credits: 200,   price: 5,  perCredit: '2.5¢', variantId: V.credits200 },
  { credits: 750,   price: 15, perCredit: '2.0¢', variantId: V.credits750 },
  { credits: 3000,  price: 50, perCredit: '1.7¢', badge: 'Best value', variantId: V.credits3000 },
];

const FAQ_ITEMS = [
  { q: 'What is a credit?', a: 'One credit = one generation step. Fast models like Gemini Flash cost 2 credits; premium models like GPT Image 1.5 cost 20. Video clips cost 80–100 credits each.' },
  { q: 'Do credits expire?', a: "Monthly plan credits reset on your billing date and don't roll over. Credit packs never expire — use them at your own pace." },
  { q: 'Can I stack packs on top of my plan?', a: 'Yes! Credit packs add on top of your monthly plan credits. They are consumed after your monthly credits run out.' },
  { q: 'Can I switch plans at any time?', a: 'Yes — upgrade or downgrade any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.' },
  { q: 'What is annual billing?', a: 'Annual billing locks in a discounted rate (≈2 months free) and is charged as a single payment at the start of each year.' },
  { q: 'Which AI engines are included?', a: 'All plans include Gemini, FLUX, GPT Image, Grok Imagine, and Ideogram. NSFW engine (ModelsLab) is Studio and Brand only.' },
  { q: 'Is there a free trial?', a: 'Pro and Studio include a 7-day free trial. No credit card required to start on Starter.' },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      <button className="w-full flex items-center justify-between py-4 text-left gap-4"
        onClick={() => setOpen(p => !p)}>
        <span className="text-[13px] font-medium transition-colors"
          style={{ color: open ? 'var(--text-1)' : 'var(--text-2)' }}>{q}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <p className="pb-4 text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{a}</p>}
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
            setCheckoutError(err instanceof Error ? err.message : 'Checkout failed.');
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
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
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
    <div className="min-h-full overflow-y-auto pb-16 lg:pb-0 gradient-mesh custom-scrollbar" style={{ background: 'var(--bg-0)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 pb-24">

        {/* ── Header ── */}
        <div className="section-header">
          <div className="section-label">Planes</div>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, lineHeight: 1.1, marginBottom: 16 }}>
            Empieza gratis.<br/>
            <span className="text-gradient" style={{ fontStyle: 'italic' }}>Escala sin limites.</span>
          </h2>
          <p className="text-[15px] max-w-md mx-auto mb-8" style={{ color: 'var(--text-2)' }}>
            Pay as you grow. Credits reset monthly. No surprises.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 px-1 py-1 rounded-full"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
            <button onClick={() => setAnnual(false)}
              className="px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={!annual
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'transparent', color: 'var(--text-3)' }
              }>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={annual
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'transparent', color: 'var(--text-3)' }
              }>
              Annual
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-jet font-bold"
                style={{ background: 'rgba(240,104,72,0.15)', color: 'var(--accent)' }}>2 months free</span>
            </button>
          </div>
        </div>

        {/* ── Annual savings banner ── */}
        {annual && (
          <div
            className="mb-8 px-5 py-3.5 rounded-2xl flex items-center justify-center gap-3 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(240,104,72,0.06) 0%, rgba(208,72,176,0.04) 100%)',
              border: '1px solid rgba(240,104,72,0.15)',
            }}
          >
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
              Annual billing saves you up to
            </span>
            <span
              className="text-[14px] font-bold font-jet px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(240,104,72,0.12)', color: 'var(--accent)' }}
            >
              ${(PLANS[3].monthlyPrice - PLANS[3].annualPrice) * 12}/yr
            </span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
              on the Brand plan
            </span>
          </div>
        )}

        {/* ── Sign-up prompt for anonymous users ── */}
        {showSignUpPrompt && !user && (
          <div className="mb-6 px-5 py-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ background: 'rgba(240,104,72,0.06)', border: '1px solid rgba(240,104,72,0.2)' }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                Create a free account to subscribe
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                Sign up in seconds -- you'll be redirected to checkout automatically.
              </p>
            </div>
            <button
              onClick={() => navigate('/studio')}
              className="btn-primary px-5 py-2.5 text-sm font-bold shrink-0">
              Sign up free
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {PLANS.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            const isCurrent = currentPlan === plan.id || (currentPlan === 'starter' && plan.id === 'starter');
            const isFree = plan.id === 'starter';
            const isFeatured = plan.badge === 'Most popular';

            return (
              <div key={plan.id}
                className={`price-card flex flex-col${isFeatured ? ' featured' : ''}`}>

                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold font-jet"
                    style={{ background: isFeatured ? 'linear-gradient(135deg, var(--accent), var(--magenta))' : 'var(--gold)', color: '#000' }}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-jet text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-3)' }}>{plan.name}</h3>
                  <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-end gap-1.5">
                    <span className="font-display text-[42px] leading-none" style={{ color: 'var(--text-1)' }}>${price}</span>
                    {!isFree && (
                      <span className="text-base font-body pb-1.5" style={{ color: 'var(--text-3)' }}>
                        /mes{annual && <span className="ml-1 text-[10px]">billed annually</span>}
                      </span>
                    )}
                  </div>
                  {!isFree && annual && (
                    <p className="text-[11px] mt-1 font-jet" style={{ color: 'var(--accent)' }}>
                      Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr
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
                    style={{ background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                    Current plan
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
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting...</>
                      : plan.cta}
                  </button>
                ) : (
                  <button onClick={() => handleCheckout(plan)}
                    disabled={checkoutLoading !== null}
                    className="btn-ghost px-4 py-3 w-full justify-center text-[13px] font-semibold mb-5 disabled:opacity-60">
                    {checkoutLoading === plan.id
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting...</>
                      : plan.cta}
                  </button>
                )}

                {/* Limits */}
                <div className="rounded-xl p-3 mb-4 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  {plan.limits.map(l => (
                    <div key={l.label} className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{l.label}</span>
                      <span className="text-[11px] font-jet font-semibold"
                        style={{ color: l.value === '—' ? 'var(--bg-4)' : 'var(--text-2)' }}>{l.value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 text-[13px]" style={{ color: 'var(--accent)' }}>&#8594;</span>
                      <span className="text-[13px] leading-snug" style={{ color: 'var(--text-2)' }}>
                        {f.label}
                        {f.note && (
                          <span className="ml-1.5 text-[9px] font-jet px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--bg-3)', color: 'var(--text-3)' }}>{f.note}</span>
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
        <div className="mb-20 rounded-2xl p-6" style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-jet uppercase tracking-widest mb-5 text-center" style={{ color: 'var(--text-3)' }}>
            Credit cost per action
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
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>{label}</span>
                <span className="text-[11px] font-jet font-bold" style={{ color: 'var(--gold)' }}>{cost}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Credit Packs ── */}
        <div className="mb-20">
          <div className="section-header" style={{ marginBottom: 32 }}>
            <div className="section-label">Need more?</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, lineHeight: 1.2, marginBottom: 8 }}>
              Credit Packs
            </h2>
            <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>
              One-time purchase. Never expires. Stacks with your plan.
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
                      style={{ background: 'linear-gradient(135deg, var(--accent), var(--magenta))', color: '#000' }}>
                      {pack.badge}
                    </div>
                  )}
                  <div className="font-display text-[32px] mb-1" style={{ color: 'var(--text-1)' }}>
                    {pack.credits.toLocaleString('en-US')}
                  </div>
                  <div className="text-[11px] font-jet mb-3" style={{ color: 'var(--gold)' }}>credits</div>
                  <div className="font-display text-[24px] mb-1" style={{ color: 'var(--text-1)' }}>${pack.price}</div>
                  <div className="text-[11px] font-jet mb-5" style={{ color: 'var(--text-3)' }}>{pack.perCredit} / credit</div>
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
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting...</>
                      : `Buy ${pack.credits.toLocaleString('en-US')} credits`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-jet uppercase tracking-widest mb-6 text-center" style={{ color: 'var(--text-3)' }}>FAQ</p>
          {FAQ_ITEMS.map(item => <FaqItem key={item.q} {...item} />)}
        </div>

      </div>
    </div>
  );
};

export default PricingPage;
