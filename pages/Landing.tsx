import React from 'react';
import { motion } from 'framer-motion';
import { GradientDots } from '../components/ui/gradient-dots';

interface LandingProps {
  onAuth: () => void;
}

/* ── Reveal wrapper ───────────────────────────────────────── */
const Reveal = ({
  children,
  delay = 0,
  y = 30,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);

/* ── Data ─────────────────────────────────────────────────── */
const capabilities = [
  { icon: '◎', title: 'Director Studio', desc: 'Full scene control — pose, lighting, camera angle, outfit. You direct, AI renders.' },
  { icon: '✦', title: 'AI Editor', desc: '8 tools in one canvas: relight, face swap, try-on, background, enhance, style transfer, inpaint, 360°.' },
  { icon: '▦', title: 'Gallery', desc: 'Every creation saved, organized, and exportable. Your visual library grows with you.' },
  { icon: '◈', title: 'Photo Session', desc: 'Automated multi-shot sessions with preset vibes. One click, dozens of results.' },
];

const testimonials = [
  {
    quote: "VIST Studio hasn't just built an AI tool — they've sculpted a creative partner. Our virtual talent feels more present than most human creators.",
    name: 'ELARA VOX',
    role: 'Creative Lead, Neural Talent Co.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjA20cAT9HD6GjAPlHowkz8LdS4a013VHAKLLiNyYFhE1mkCWgt9I5PIfPUYoIiFDfHK_Gtx4JFVucdxylZiKFkm3jUqr6FlWaPUrTTi8RBshN-9u9GxZxQPs1sP4TPj2HbBi0C9JFtQvSHNYCWYmHlIBpyfrNpp4HYTUvLmpJ_VLJpHYop0ZhPl_6Ojz5B452uW46GHZEopbAkBfG86MTAQV0MarSZLaobg7OqQ4uNFfBGY_EbUleK9HEgoWKF7BCO8tMlmfMQBoV',
  },
  {
    quote: "The integration into our marketing workflow reduced production costs by 80% while increasing engagement tenfold. This is the future.",
    name: 'MARCUS KANE',
    role: 'Founder, Void Agency',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCirRYegSbbcxO5pwuyz8JKWwgI3hY29LYMjZf2AkY0Y59EK0VV59h2Wec6fQO1DKEGwEOt3VTBI2j_A-AOSbGQejfSxLtbkT-tWgeGSb4PWaKvzw7ep_C2dqUy7rpaoIqkhR2rRbWj3P29uxs569oPsSYyhBCITfNJNjyFY0XZVL7tZwoS5cgmsEZ68-RY-qtK1YjA7CR1TMfY-8tEa15mfnPWei36_EQcqcOfIehl97sGbvKfXknHzowSnhTVXlYEdF-4sktlqJG6',
  },
  {
    quote: "Transcending the uncanny valley was the goal. VIST Studio didn't just cross it — they built a palace on the other side.",
    name: 'SAYA-01',
    role: 'Virtual Entity, Global Connect',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQwT-E3Ui2Hpa8kpwynVwPbRp4dhJ12pImKkuP2JrMK0lZETw7w8Oz9ZWdU6w2UKfp3ZNHE0kn9xW1n4N7lCOmKNEB4XTyAS1gPi6LVvsN20PblDUm7rZ3KCfajh3xUbCZqOdLiAD3j7QnwbJnKlyhVbTXcXWomWRJekP5U97UNveRD-QzJn-_HoTC4KZwFgBngQG1ZxvbNxMsBXQMS1CnubeVwSz60vgfEvcg3VP-myVNMdIjKnIvPrPseCniwoY_ugGv2p5n_-B6',
  },
];

const environments = [
  {
    title: 'Neo-Tokyo',
    sub: 'Environment Simulation 01',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCi8byWsN_25zllahuauGqHkHvaT2uQNeRGAUXQMfDTp9OQ5o8EauArqSKFUOzQ7vBpdkgmbaixd4zcJtlyROnkJ06uoJSRQwaOmYIspzOsVlaVGlGhAomeyyIoYvVJhGG3UojQJDhJH6S1oluuvkXW4q2cpzgsVUBOLWl_Bif5AgtBJavreDNSrEP-a-tZQRUL0a4C1r_GPetsPRrXDFBirlY9vwaF1k7qqoKXASpCf-nYf3oqWwk1IB7FMvfcpceAfO2sk_NwJ9Pb',
  },
  {
    title: 'Cyber-Apartment',
    sub: 'Environment Simulation 02',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvvF0lM6mAyc1NTB02hhxiPB7c52QzYHTAcHEVUb5MS1qn5v98oiMVvySqG--TJ4DzYkjsImxMmH7Y_RKA65WvA75gMKQOseuBGatFb8ZW-i5DoQ5NQzcXF9A2v28rQHgnjvwKW0H55oxXdHbUFuZ9-m42-vlIZajH7PZibU7eG8DtjzbEGQwhHP6WSjv8kpgMsa-IMLhpJe1T-SHKdFj_Kqbavd_DtY1cGFep7QpCu6meC6mghoZ7NPr2YviIObGboh-NXZPhr-kJ',
  },
];

/* ════════════════════════════════════════════════════════════
   Landing — Joi Holographic / Narrative Style
   ════════════════════════════════════════════════════════════ */
export default function Landing({ onAuth }: LandingProps) {
  return (
    <div style={{ background: 'var(--joi-bg-0)', color: 'var(--joi-text-1)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Fixed Nav ─────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: '60px',
        background: 'rgba(10,8,16,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,107,157,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '3px',
            background: 'var(--joi-pink)',
            boxShadow: '0 0 12px rgba(255,107,157,0.5)',
          }} />
          <span style={{
            fontFamily: "'Instrument Serif', serif", fontWeight: 700,
            fontSize: '20px', letterSpacing: '0.08em', color: 'var(--joi-pink)',
            fontStyle: 'italic',
          }}>
            VIST
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#capabilities" style={{ fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: 'var(--joi-text-3)', textDecoration: 'none', letterSpacing: '0.06em', transition: 'color 150ms' }}>STUDIO</a>
          <a href="#worlds" style={{ fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: 'var(--joi-text-3)', textDecoration: 'none', letterSpacing: '0.06em', transition: 'color 150ms' }}>WORLDS</a>
          <a href="#voices" style={{ fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: 'var(--joi-text-3)', textDecoration: 'none', letterSpacing: '0.06em', transition: 'color 150ms' }}>VOICES</a>
          <button
            onClick={onAuth}
            style={{
              background: 'var(--joi-pink)', color: '#fff',
              border: 'none', borderRadius: '999px',
              padding: '8px 24px', fontSize: '11px', fontWeight: 800,
              letterSpacing: '0.2em', cursor: 'pointer',
              boxShadow: '0 0 20px rgba(255,107,157,0.3)',
              transition: 'transform 150ms, box-shadow 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255,107,157,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,107,157,0.3)'; }}
          >
            ENTER STUDIO
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Background image — 2048px upscaled via AuraSR */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: "url('/hero-2048.png')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.5,
        }} />

        {/* Gradient dots — subtle tech texture */}
        <GradientDots
          duration={25}
          colorCycleDuration={8}
          dotSize={1}
          spacing={18}
          style={{ zIndex: 1, opacity: 0.45 }}
        />

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to top, var(--joi-bg-0), transparent 50%, rgba(10,8,16,0.5))' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'radial-gradient(ellipse at 30% 50%, rgba(255,107,157,0.08), transparent 60%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', padding: '0 24px', maxWidth: '900px' }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              marginBottom: '32px', padding: '6px 18px',
              borderRadius: '999px',
              background: 'rgba(255,107,157,0.08)',
              border: '1px solid rgba(255,107,157,0.2)',
            }}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--joi-pink)', boxShadow: '0 0 8px var(--joi-pink)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.25em', color: 'var(--joi-pink)' }}>
              MIRROR PROTOCOL ACTIVE
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            style={{
              fontSize: 'clamp(3rem, 7vw, 5.5rem)',
              fontFamily: "'Instrument Serif', serif",
              fontWeight: 900, lineHeight: 0.95,
              letterSpacing: '-0.02em',
              marginBottom: '28px',
              textShadow: '2px 0 rgba(255,107,157,0.3), -2px 0 rgba(184,160,232,0.2)',
            }}
          >
            YOUR DIGITAL<br />
            <span style={{ color: 'var(--joi-pink)', fontStyle: 'italic' }}>ALTER EGO</span> AWAITS
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
              color: 'var(--joi-text-2)', lineHeight: 1.7,
              maxWidth: '600px', margin: '0 auto 40px',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Where human intuition meets holographic perfection. Your digital alter ego
            is ready to transcend the physical realm.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button
              onClick={onAuth}
              style={{
                background: 'var(--joi-pink)', color: '#fff', border: 'none',
                borderRadius: '12px', padding: '16px 40px',
                fontSize: '14px', fontWeight: 800, letterSpacing: '0.15em',
                cursor: 'pointer',
                boxShadow: '0 4px 30px rgba(255,107,157,0.3)',
                transition: 'transform 150ms, box-shadow 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 40px rgba(255,107,157,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 30px rgba(255,107,157,0.3)'; }}
            >
              REACH OUT
            </button>
            <button
              onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'transparent', color: 'var(--joi-text-2)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                padding: '16px 40px', fontSize: '14px', fontWeight: 700,
                letterSpacing: '0.15em', cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'border-color 150ms, color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,107,157,0.3)'; e.currentTarget.style.color = 'var(--joi-text-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--joi-text-2)'; }}
            >
              EXPLORE
            </button>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(transparent, var(--joi-bg-0))', zIndex: 3, pointerEvents: 'none' }} />
      </section>

      {/* ── Capabilities ──────────────────────────────────────── */}
      <section id="capabilities" style={{ padding: '120px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ height: '1px', width: '48px', background: 'var(--joi-pink)' }} />
            <span style={{ color: 'var(--joi-pink)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em' }}>
              CAPABILITIES
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
            fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700,
            marginBottom: '60px', lineHeight: 1.15,
          }}>
            Everything you need.{' '}
            <span style={{ color: 'var(--joi-text-3)' }}>Nothing you don't.</span>
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {capabilities.map((c, i) => (
            <div key={c.title}>
            <Reveal delay={i * 0.08}>
              <div
                className="joi-glass joi-border-glow"
                style={{ padding: '32px 28px', borderRadius: '16px', height: '100%' }}
              >
                <div style={{
                  fontSize: '28px', color: 'var(--joi-pink)',
                  marginBottom: '16px', lineHeight: 1,
                  textShadow: '0 0 20px rgba(255,107,157,0.3)',
                }}>
                  {c.icon}
                </div>
                <h3 style={{
                  fontSize: '14px', fontWeight: 800,
                  letterSpacing: '0.08em', marginBottom: '10px',
                  color: 'var(--joi-text-1)',
                }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--joi-text-2)', lineHeight: 1.6 }}>
                  {c.desc}
                </p>
              </div>
            </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ── Worlds / Environments ─────────────────────────────── */}
      <section id="worlds" style={{ padding: '80px 24px 120px', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ height: '1px', width: '48px', background: 'var(--joi-magenta)' }} />
            <span style={{ color: 'var(--joi-magenta)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em' }}>
              WORLD BUILDING
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
            fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700,
            marginBottom: '48px', lineHeight: 1.15,
          }}>
            Your characters live{' '}
            <span style={{ color: 'var(--joi-text-3)' }}>somewhere.</span>
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {environments.map((env, i) => (
            <div key={env.title}>
            <Reveal delay={i * 0.1}>
              <div style={{
                position: 'relative', borderRadius: '16px', overflow: 'hidden',
                aspectRatio: '16/9', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.04)',
                transition: 'transform 300ms, box-shadow 300ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(255,107,157,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <img
                  src={env.img}
                  alt={env.title}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: 'grayscale(30%)',
                    transition: 'filter 500ms, transform 500ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'grayscale(0%)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(30%)'; e.currentTarget.style.transform = 'scale(1)'; }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(10,8,16,0.85))' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,107,157,0.08)', mixBlendMode: 'overlay' }} />
                <div style={{ position: 'absolute', bottom: '24px', left: '24px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: 700 }}>{env.title}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--joi-text-3)', fontStyle: 'italic' }}>{env.sub}</p>
                </div>
              </div>
            </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────── */}
      <section
        id="voices"
        style={{
          padding: '120px 24px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,107,157,0.03) 100%)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Reveal>
            <h2 style={{
              textAlign: 'center',
              fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
              fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700,
              marginBottom: '64px', letterSpacing: '-0.01em',
            }}>
              VOICES FROM THE VOID
            </h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', alignItems: 'start' }}>
            {testimonials.map((t, i) => (
              <div key={t.name}>
              <Reveal delay={i * 0.1}>
                <div
                  style={{
                    background: 'rgba(255,107,157,0.03)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,107,157,0.1)',
                    borderRadius: '20px',
                    padding: '40px 32px',
                    position: 'relative',
                    marginTop: i === 1 ? '40px' : '0',
                    transition: 'border-color 300ms, box-shadow 300ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,107,157,0.25)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(255,107,157,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,107,157,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* Avatar */}
                  <div style={{
                    position: 'absolute', top: '-24px', left: '32px',
                    width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden',
                    border: '2px solid var(--joi-pink)',
                    boxShadow: '0 0 15px rgba(255,107,157,0.4)',
                  }}>
                    <img src={t.avatar} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <p style={{
                    fontSize: '14px', color: 'var(--joi-text-2)', fontStyle: 'italic',
                    lineHeight: 1.7, marginBottom: '24px',
                  }}>
                    "{t.quote}"
                  </p>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--joi-pink)', letterSpacing: '0.05em' }}>
                      {t.name}
                    </h4>
                    <p style={{ fontSize: '10px', letterSpacing: '0.12em', color: 'var(--joi-text-3)', marginTop: '2px' }}>
                      {t.role}
                    </p>
                  </div>
                </div>
              </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section style={{ padding: '120px 24px', textAlign: 'center', position: 'relative' }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '60%', height: '60%',
          background: 'radial-gradient(ellipse, rgba(255,107,157,0.06), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
          <Reveal>
            <h1 style={{
              fontSize: 'clamp(4rem, 10vw, 8rem)',
              fontFamily: "'Instrument Serif', serif", fontWeight: 900,
              fontStyle: 'italic', letterSpacing: '-0.03em',
              opacity: 0.06, lineHeight: 0.9, marginBottom: '48px',
              userSelect: 'none',
            }}>
              VIST STUDIO
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <button
              onClick={onAuth}
              style={{
                position: 'relative',
                background: 'var(--joi-pink)', color: '#fff', border: 'none',
                borderRadius: '14px', padding: '20px 52px',
                fontSize: '16px', fontWeight: 900, letterSpacing: '0.3em',
                cursor: 'pointer',
                boxShadow: '0 0 40px rgba(255,107,157,0.35)',
                transition: 'transform 150ms, box-shadow 150ms',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(255,107,157,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(255,107,157,0.35)'; }}
            >
              ENTER THE VOID
            </button>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,107,157,0.08)',
        padding: '40px 24px',
        maxWidth: '1200px', margin: '0 auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '2px',
              background: 'var(--joi-pink)',
              boxShadow: '0 0 8px rgba(255,107,157,0.4)',
            }} />
            <span style={{
              fontFamily: "'Instrument Serif', serif", fontWeight: 700,
              fontSize: '14px', letterSpacing: '0.06em',
              color: 'var(--joi-pink)', fontStyle: 'italic',
            }}>
              VIST
            </span>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            {['Pricing', 'Docs', 'Community', 'Twitter'].map(link => (
              <a
                key={link}
                href="#"
                style={{
                  fontSize: '11px', color: 'var(--joi-text-3)',
                  textDecoration: 'none', letterSpacing: '0.1em',
                  fontWeight: 500, transition: 'color 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--joi-pink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--joi-text-3)')}
              >
                {link}
              </a>
            ))}
          </div>

          <span style={{ fontSize: '10px', color: 'var(--joi-text-3)', letterSpacing: '0.1em' }}>
            © 2026 VIST STUDIO
          </span>
        </div>
      </footer>
    </div>
  );
}
