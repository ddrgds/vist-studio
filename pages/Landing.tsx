import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LandingProps {
  onAuth: () => void;
}

/* ── Typing hook ──────────────────────────────────────────── */
function useTypingEffect(text: string, speed = 50, delay = 500) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return { displayed, done };
}

/* ── Feature data ─────────────────────────────────────────── */
const features = [
  { icon: '\u2B21', title: 'DIRECTOR', desc: 'Dirige la escena', color: 'var(--accent)' },
  { icon: '\u25C8', title: 'AI EDITOR', desc: 'Edici\u00f3n con 8 herramientas', color: 'var(--cyan)' },
  { icon: '\u25A3', title: 'GALLERY', desc: 'Tu colecci\u00f3n, organizada', color: 'var(--magenta)' },
  { icon: '\u25CE', title: 'PHOTO SESSION', desc: 'Sesiones autom\u00e1ticas', color: 'var(--accent)' },
];

/* ── Stats data ───────────────────────────────────────────── */
const previewStats = [
  { label: 'CHARACTERS', value: '12', sub: '+3 this week', color: 'var(--accent)' },
  { label: 'RENDERS', value: '847', sub: '14.2h GPU time', color: 'var(--cyan)' },
  { label: 'CREDITS', value: '2,450', sub: '~23/day burn', color: 'var(--cyan)' },
];

const ctaStats = [
  '12,000+ CHARACTERS CREATED',
  '89,000+ IMAGES GENERATED',
  '4.9/5 CREATOR RATING',
];

/* ── Reveal wrapper ───────────────────────────────────────── */
const Reveal = ({
  children,
  delay = 0,
  y = 20,
  scale,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  scale?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y, ...(scale != null ? { scale } : {}) }}
    whileInView={{ opacity: 1, y: 0, ...(scale != null ? { scale: 1 } : {}) }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ delay, duration: 0.35, type: 'spring', stiffness: 400, damping: 30 }}
  >
    {children}
  </motion.div>
);

/* ════════════════════════════════════════════════════════════
   Landing — Netrunner OS
   ════════════════════════════════════════════════════════════ */
export default function Landing({ onAuth }: LandingProps) {
  const { displayed, done } = useTypingEffect(
    'Tu universo digital. Tus personajes. Tu imperio.',
    50,
    600,
  );

  return (
    <div
      style={{
        background: 'var(--nr-bg-0)',
        color: 'var(--nr-text-1)',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      {/* ── Fixed Nav ─────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          height: '56px',
          background: 'rgba(6,6,10,0.9)',
          borderBottom: '1px solid var(--nr-border)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: 'var(--accent)',
              boxShadow: '0 0 10px rgba(240,104,72,0.5)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '18px',
              letterSpacing: '0.06em',
              color: 'var(--accent)',
            }}
          >
            VIST
          </span>
        </div>

        {/* Enter */}
        <button className="nr-btn" onClick={onAuth} style={{ padding: '0.5rem 1.4rem', fontSize: '0.75rem' }}>
          ENTER
        </button>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section
        className="nr-scanlines"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
          padding: '0 24px',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(240,104,72,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(240,104,72,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* System status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--cyan)',
                boxShadow: '0 0 8px var(--cyan)',
              }}
            />
            <span className="nr-label" style={{ color: 'var(--cyan)' }}>
              SYSTEM ONLINE
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="nr-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              lineHeight: 1.1,
              marginBottom: '24px',
            }}
          >
            <span style={{ color: 'var(--accent)' }}>VIST</span>{' '}
            <span style={{ color: 'var(--nr-text-1)' }}>STUDIO</span>
          </motion.h1>

          {/* Typing subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(0.8rem, 1.5vw, 0.95rem)',
              color: 'var(--nr-text-2)',
              minHeight: '1.6em',
              marginBottom: '40px',
            }}
          >
            {displayed}
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '1em',
                background: 'var(--cyan)',
                marginLeft: '2px',
                verticalAlign: 'text-bottom',
                animation: 'blink 1s step-end infinite',
              }}
            />
          </motion.p>

          {/* CTAs — appear after typing */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={done ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.35, type: 'spring', stiffness: 400, damping: 30 }}
            style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button className="nr-btn" onClick={onAuth}>
              ENTER THE SYSTEM
            </button>
            <button className="nr-btn-ghost" onClick={onAuth}>
              EXPLORE
            </button>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            background: 'linear-gradient(transparent, var(--nr-bg-0))',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <Reveal>
          <span className="nr-label" style={{ color: 'var(--cyan)', display: 'block', marginBottom: '16px' }}>
            CAPABILITIES
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h2
            className="nr-heading"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '48px' }}
          >
            Todo lo que necesitas.{' '}
            <span style={{ color: 'var(--nr-text-3)' }}>Nada que no.</span>
          </h2>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="nr-feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <div
                style={{
                  fontSize: '1.5rem',
                  color: f.color,
                  marginBottom: '12px',
                  lineHeight: 1,
                }}
              >
                {f.icon}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '0.06em',
                  marginBottom: '6px',
                  color: 'var(--nr-text-1)',
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--nr-text-2)', lineHeight: 1.5 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Preview Section ───────────────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <Reveal scale={0.97}>
          <div
            className="nr-scanlines"
            style={{
              background: 'var(--nr-bg-1)',
              border: '1px solid var(--nr-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Terminal header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--nr-border)',
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cyan-dim)' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--nr-text-3)', opacity: 0.4 }} />
              <span
                className="nr-label"
                style={{ marginLeft: '8px', color: 'var(--nr-text-3)' }}
              >
                VIST.SYS — DASHBOARD
              </span>
            </div>

            {/* Stats inside */}
            <div
              className="nr-preview-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1px',
                background: 'var(--nr-border)',
                padding: '1px',
              }}
            >
              {previewStats.map((s) => (
                <div key={s.label} className="nr-card-wrap nr-card-wrap--sys" style={{ clipPath: 'none' }}>
                  <div className="nr-card" style={{ clipPath: 'none' }}>
                    <div className="nr-label" style={{ marginBottom: '8px', color: 'var(--nr-text-3)' }}>
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        color: s.color,
                        lineHeight: 1,
                        marginBottom: '4px',
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.65rem',
                        color: 'var(--nr-text-3)',
                      }}
                    >
                      {s.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── CTA Final ─────────────────────────────────────────── */}
      <section
        style={{
          padding: '120px 24px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Ambient coral glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            transform: 'translateY(-50%)',
            width: '50%',
            height: '60%',
            background: 'radial-gradient(ellipse at center left, rgba(240,104,72,0.06), transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
          <Reveal>
            <span className="nr-label" style={{ color: 'var(--cyan)', display: 'block', marginBottom: '16px' }}>
              READY?
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h2
              className="nr-heading"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '16px' }}
            >
              Construye tu universo
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p style={{ fontSize: '0.95rem', color: 'var(--nr-text-2)', lineHeight: 1.6, marginBottom: '32px' }}>
              Cada personaje que imaginas puede existir. Cada escena que ves en tu mente puede renderizarse.
              Entra al sistema y empieza a crear.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <button className="nr-btn" onClick={onAuth}>
              START BUILDING
            </button>
          </Reveal>

          <Reveal delay={0.2}>
            <div
              className="nr-cta-stats"
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '2.5rem',
                marginTop: '48px',
                flexWrap: 'wrap',
              }}
            >
              {ctaStats.map((s) => (
                <span key={s} className="nr-data" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  {s}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--nr-border)',
          padding: '32px 24px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                background: 'var(--accent)',
                boxShadow: '0 0 8px rgba(240,104,72,0.4)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '14px',
                letterSpacing: '0.06em',
                color: 'var(--accent)',
              }}
            >
              VIST
            </span>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '24px' }}>
            {['Pricing', 'Docs', 'Community', 'Contact'].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--nr-text-3)',
                  textDecoration: 'none',
                  transition: 'color 150ms',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.04em',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nr-text-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nr-text-3)')}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Year */}
          <span className="nr-label">2026 VIST STUDIO</span>
        </div>
      </footer>
    </div>
  );
}
