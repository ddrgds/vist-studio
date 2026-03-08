import React, { useState, useEffect, useRef } from 'react';
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
    cta: 'Start Pro →', ctaStyle: 'coral',
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
    cta: 'Start Studio →', ctaStyle: 'white',
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
    cta: 'Start Brand →', ctaStyle: 'gold',
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

const CheckIcon: React.FC<{ dim?: boolean }> = ({ dim }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke={dim ? '#4A3A36' : '#FF5C35'} strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DashIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="#2A1F1C" strokeWidth="2.5" strokeLinecap="round"
    className="shrink-0 mt-0.5" aria-hidden>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: '#1A1210' }}>
      <button className="w-full flex items-center justify-between py-4 text-left gap-4"
        onClick={() => setOpen(p => !p)}>
        <span className="text-[13px] font-medium transition-colors"
          style={{ color: open ? '#fff' : '#B8A9A5' }}>{q}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="#4A3A36" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <p className="pb-4 text-[13px] leading-relaxed" style={{ color: '#6B5A56' }}>{a}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────
// PricingPage
// ─────────────────────────────────────────────

interface PricingPageProps {
  onNavigate?: (workspace: string) => void;
}

const CHECKOUT_INTENT_KEY = 'vist_checkout_intent';

const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
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
    <div className="min-h-full overflow-y-auto pb-16 lg:pb-0 custom-scrollbar" style={{ background: '#080605' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 pb-24">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-jet uppercase tracking-widest mb-4" style={{ color: '#FF5C35' }}>Pricing</p>
          <h1 className="text-[36px] sm:text-[44px] font-bold leading-tight mb-4" style={{ color: '#F5EDE8' }}>
            Simple,{' '}
            <span style={{ background: 'linear-gradient(135deg,#FF5C35,#FFB347)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              transparent
            </span>{' '}
            pricing
          </h1>
          <p className="text-[15px] max-w-md mx-auto mb-8" style={{ color: '#6B5A56' }}>
            Pay as you grow. Credits reset monthly. No surprises.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 px-1 py-1 rounded-full"
            style={{ background: '#0D0A0A', border: '1px solid #1A1210' }}>
            <button onClick={() => setAnnual(false)}
              className="px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={!annual ? { background: '#1A1210', color: '#F5EDE8' } : { color: '#4A3A36' }}>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={annual ? { background: '#1A1210', color: '#F5EDE8' } : { color: '#4A3A36' }}>
              Annual
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-jet font-bold"
                style={{ background: 'rgba(255,92,53,0.12)', color: '#FF5C35' }}>2 months free</span>
            </button>
          </div>
        </div>

        {/* ── Sign-up prompt for anonymous users ── */}
        {showSignUpPrompt && !user && (
          <div className="mb-6 px-5 py-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ background: 'rgba(255,92,53,0.06)', border: '1px solid rgba(255,92,53,0.2)' }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: '#F5EDE8' }}>
                Create a free account to subscribe
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6B5A56' }}>
                Sign up in seconds — you'll be redirected to checkout automatically.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('generate')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shrink-0 transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg,#FF5C35,#FFB347)' }}>
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
            const isPro  = plan.id === 'pro';
            const isBrand = plan.id === 'brand';

            return (
              <div key={plan.id} className="relative flex flex-col rounded-2xl p-5 transition-all"
                style={{
                  background: isPro ? 'rgba(255,92,53,0.04)' : isBrand ? 'rgba(255,179,71,0.04)' : '#0D0A0A',
                  border: isPro ? '1px solid rgba(255,92,53,0.25)' : isBrand ? '1px solid rgba(255,179,71,0.25)' : '1px solid #1A1210',
                }}>

                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold font-jet"
                    style={{ background: isBrand ? '#FFB347' : '#FF5C35', color: '#000' }}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-4">
                  <h2 className="text-[14px] font-bold mb-1" style={{ color: '#F5EDE8' }}>{plan.name}</h2>
                  <p className="text-[12px]" style={{ color: '#4A3A36' }}>{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-end gap-1.5">
                    <span className="text-[36px] font-bold leading-none" style={{ color: '#F5EDE8' }}>${price}</span>
                    {!isFree && (
                      <span className="text-[12px] pb-1.5" style={{ color: '#4A3A36' }}>
                        /mo{annual && <span className="ml-1 text-[10px]">billed annually</span>}
                      </span>
                    )}
                  </div>
                  {!isFree && annual && (
                    <p className="text-[11px] mt-1 font-jet" style={{ color: isBrand ? '#FFB347' : '#FF5C35' }}>
                      Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr
                    </p>
                  )}
                  {/* Credits badge */}
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-jet font-bold"
                    style={{ background: 'rgba(255,179,71,0.1)', color: '#FFB347', border: '1px solid rgba(255,179,71,0.2)' }}>
                    ⚡ {plan.credits}
                  </div>
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-[13px] font-semibold mb-5 text-center"
                    style={{ background: '#1A1210', color: '#6B5A56', border: '1px solid #2A1F1C' }}>
                    ✓ Current plan
                  </div>
                ) : isFree ? (
                  <button onClick={() => onNavigate?.('generate')}
                    className="w-full py-2.5 rounded-xl text-[13px] font-semibold mb-5 transition-all hover:scale-[1.02]"
                    style={{ background: 'transparent', color: '#6B5A56', border: '1px solid #1A1210' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#B8A9A5')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6B5A56')}>
                    {plan.cta}
                  </button>
                ) : (
                  <button onClick={() => handleCheckout(plan)}
                    disabled={checkoutLoading !== null}
                    className="w-full py-2.5 rounded-xl text-[13px] font-semibold mb-5 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
                    style={
                      plan.ctaStyle === 'coral'  ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', color: '#fff' } :
                      plan.ctaStyle === 'white'  ? { background: '#fff', color: '#000' } :
                      plan.ctaStyle === 'gold'   ? { background: 'linear-gradient(135deg,#FFB347,#FF8C42)', color: '#000' } :
                      { background: 'transparent', color: '#6B5A56', border: '1px solid #1A1210' }
                    }>
                    {checkoutLoading === plan.id
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting…</>
                      : plan.cta}
                  </button>
                )}

                {/* Limits */}
                <div className="rounded-xl p-3 mb-4 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1A1210' }}>
                  {plan.limits.map(l => (
                    <div key={l.label} className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: '#4A3A36' }}>{l.label}</span>
                      <span className="text-[11px] font-jet font-semibold"
                        style={{ color: l.value === '—' ? '#2A1F1C' : '#B8A9A5' }}>{l.value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-2">
                      <CheckIcon dim={isFree} />
                      <span className="text-[12px] leading-snug" style={{ color: '#6B5A56' }}>
                        {f.label}
                        {f.note && (
                          <span className="ml-1.5 text-[9px] font-jet px-1.5 py-0.5 rounded-full"
                            style={{ background: '#1A1210', color: '#4A3A36' }}>{f.note}</span>
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
        <div className="mb-20 rounded-2xl p-6" style={{ background: '#0D0A0A', border: '1px solid #1A1210' }}>
          <p className="text-[11px] font-jet uppercase tracking-widest mb-5 text-center" style={{ color: '#2A1F1C' }}>
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
                style={{ background: '#161110', border: '1px solid #1A1210' }}>
                <span className="text-[11px]" style={{ color: '#6B5A56' }}>{label}</span>
                <span className="text-[11px] font-jet font-bold" style={{ color: '#FFB347' }}>⚡{cost}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Credit Packs ── */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <p className="text-[11px] font-jet uppercase tracking-widest mb-3" style={{ color: '#FF5C35' }}>Need more?</p>
            <h2 className="text-[24px] sm:text-[28px] font-bold mb-2" style={{ color: '#F5EDE8' }}>Credit Packs</h2>
            <p className="text-[13px]" style={{ color: '#6B5A56' }}>
              One-time purchase. Never expires. Stacks with your plan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.credits} className="relative flex flex-col items-center rounded-2xl p-6 transition-all hover:scale-[1.02]"
                style={{
                  background: pack.badge ? 'rgba(255,92,53,0.04)' : '#0D0A0A',
                  border: pack.badge ? '1px solid rgba(255,92,53,0.25)' : '1px solid #1A1210',
                }}>
                {pack.badge && (
                  <div className="absolute -top-3 px-3 py-1 rounded-full text-[10px] font-bold font-jet"
                    style={{ background: '#FF5C35', color: '#000' }}>
                    {pack.badge}
                  </div>
                )}
                <div className="text-[32px] font-bold mb-1" style={{ color: '#F5EDE8' }}>
                  {pack.credits.toLocaleString()}
                </div>
                <div className="text-[11px] font-jet mb-3" style={{ color: '#FFB347' }}>⚡ credits</div>
                <div className="text-[24px] font-bold mb-1" style={{ color: '#F5EDE8' }}>${pack.price}</div>
                <div className="text-[11px] font-jet mb-5" style={{ color: '#4A3A36' }}>{pack.perCredit} / credit</div>
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
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#1A1210', color: '#B8A9A5', border: '1px solid #2A1F1C' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#251A17'; e.currentTarget.style.borderColor = 'rgba(255,92,53,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1A1210'; e.currentTarget.style.borderColor = '#2A1F1C'; }}
                >
                  {checkoutLoading === `pack-${pack.credits}`
                    ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting…</>
                    : `Buy ${pack.credits.toLocaleString()} credits`}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-jet uppercase tracking-widest mb-6 text-center" style={{ color: '#2A1F1C' }}>FAQ</p>
          {FAQ_ITEMS.map(item => <FaqItem key={item.q} {...item} />)}
        </div>

      </div>
    </div>
  );
};

export default PricingPage;
