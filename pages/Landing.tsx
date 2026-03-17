import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeroCarousel } from '../components/ui/feature-carousel';

interface LandingProps {
  onAuth: () => void;
}

/* ── Reveal wrapper ───────────────────────────────────────── */
const Reveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);

/* ── Colors ────────────────────────────────────────────────── */
const C = {
  bg: '#08070C',
  n900: '#151214',
  n800: '#1F1A1E',
  n700: '#342C31',
  n400: '#A09299',
  pink: '#FF6B9D',
  text1: '#f1f5f9',
  text2: '#cbd5e1',
  text3: '#94a3b8',
};

/* ── Phone carousel images ─────────────────────────────────── */
const phoneImages = ['/phone/1.png', '/phone/2.png', '/phone/3.png', '/phone/4.png', '/phone/5.png'];

/* ── Showcase images (reuse from phone + more) ─────────────── */
const showcaseImages = [
  { src: '/phone/1.png', name: '@luna_virtual', time: '15s' },
  { src: '/phone/4.png', name: '@vex.ai', time: '12s' },
  { src: '/phone/3.png', name: '@nova.x', time: '18s' },
];

/* ════════════════════════════════════════════════════════════
   Landing — V2 Design (Stitch reference)
   ════════════════════════════════════════════════════════════ */
export default function Landing({ onAuth }: LandingProps) {
  // phoneIdx for the IG mockup section (hero carousel manages its own state)
  const [phoneIdx, setPhoneIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhoneIdx(i => (i + 1) % phoneImages.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text1, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 80px', height: '64px',
        background: 'rgba(8,7,12,0.8)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.n700}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '24px', height: '24px', color: C.pink }}>
            <svg fill="currentColor" viewBox="0 0 48 48"><path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" /></svg>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>VIST Studio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          <nav style={{ display: 'flex', gap: '36px' }}>
            {['Features', 'How it Works', 'Showcase'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s/g, '-')}`} style={{
                fontSize: '14px', fontWeight: 500, color: C.text3,
                textDecoration: 'none', transition: 'color 150ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = C.pink)}
                onMouseLeave={e => (e.currentTarget.style.color = C.text3)}
              >{l}</a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onAuth} style={{
              background: C.n800, color: C.text1, border: 'none',
              borderRadius: '999px', padding: '0 24px', height: '40px',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              transition: 'background 150ms',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = C.n700)}
              onMouseLeave={e => (e.currentTarget.style.background = C.n800)}
            >Log In</button>
            <button onClick={onAuth} style={{
              background: C.pink, color: C.bg, border: 'none',
              borderRadius: '999px', padding: '0 24px', height: '40px',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 0 15px rgba(255,107,157,0.4)',
              transition: 'box-shadow 150ms',
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 25px rgba(255,107,157,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 15px rgba(255,107,157,0.4)')}
            >Get Started</button>
          </div>
        </div>
      </header>

      {/* ── Hero — 3D Carousel ────────────────────────────── */}
      <HeroCarousel
        title={
          <>
            CREATE CONTENT THAT<br />
            <span style={{
              backgroundImage: 'linear-gradient(90deg, #FF6B9D, #A78BFA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>STOPS THE SCROLL</span>
          </>
        }
        subtitle="VIST Studio: The ultimate AI social media content platform for virtual influencers. Generate hyper-realistic posts, reels, and stories in seconds."
        images={phoneImages.map((src, i) => ({ src, alt: `AI influencer ${i + 1}` }))}
        onCtaClick={onAuth}
        ctaLabel="Start Creating Now"
        style={{ minHeight: 'auto', paddingTop: '100px', paddingBottom: '40px' }}
      />

      {/* ── Features ──────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Why VIST Studio?
            </h2>
            <p style={{ color: C.n400, fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
              Unlock the power of AI-driven content creation tailored specifically for virtual influencer personas.
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { icon: '💡', title: 'Endless Creativity', desc: 'Generate unlimited concepts, aesthetics, and campaign ideas that perfectly match your virtual influencer\'s unique persona.' },
            { icon: '📸', title: 'Hyper-Realistic Gen', desc: 'Our cutting-edge AI models generate hyper-realistic photos and short-form videos that look indistinguishable from real life.' },
            { icon: '🚀', title: 'Seamless Posting', desc: 'Schedule, caption, and post directly to Instagram, TikTok, and X with one click from our integrated social media dashboard.' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.1}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                padding: '32px', borderRadius: '16px',
                background: 'rgba(31,26,30,0.4)', backdropFilter: 'blur(12px)',
                border: `1px solid ${C.n700}`,
                transition: 'border-color 300ms, box-shadow 300ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,107,157,0.3)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255,107,157,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.n700; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  position: 'absolute', top: '-32px', right: '-32px', width: '128px', height: '128px',
                  background: 'rgba(255,107,157,0.1)', borderRadius: '50%', filter: 'blur(24px)',
                }} />
                <div style={{
                  width: '56px', height: '56px', borderRadius: '12px',
                  background: 'rgba(255,107,157,0.1)', color: C.pink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', marginBottom: '16px', position: 'relative', zIndex: 1,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', position: 'relative', zIndex: 1 }}>{f.title}</h3>
                <p style={{ color: C.n400, fontSize: '15px', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Split Section — Character + Value Props ─────────── */}
      <section style={{
        padding: '80px 80px', maxWidth: '1200px', margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: '60px',
      }}>
        {/* Left — Character Image */}
        <Reveal>
          <div style={{
            width: '400px', flexShrink: 0, borderRadius: '24px', overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.4), 0 0 60px rgba(255,107,157,0.08)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <img src="/phone/hero-split.png" alt="AI influencer" style={{
              width: '100%', display: 'block',
            }} />
          </div>
        </Reveal>

        {/* Right — Value props */}
        <div style={{ flex: 1 }}>
          <Reveal delay={0.1}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900,
              letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '20px',
            }}>
              She's not real.<br />
              <span style={{ color: C.pink }}>Her engagement is.</span>
            </h2>
            <p style={{ color: C.n400, fontSize: '17px', lineHeight: 1.7, marginBottom: '32px', maxWidth: '440px' }}>
              Create AI characters that post like real influencers. Same aesthetics, same engagement — zero production costs.
            </p>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '📸', stat: '50K+', label: 'Photos generated by creators' },
              { icon: '🎬', stat: '4K+', label: 'Videos & reels produced' },
              { icon: '⚡', stat: '<15s', label: 'Average generation time' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={0.15 + i * 0.08}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px', borderRadius: '14px',
                  background: 'rgba(31,26,30,0.4)',
                  border: `1px solid ${C.n700}`,
                  transition: 'border-color 200ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,107,157,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.n700)}
                >
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <div>
                    <span style={{
                      fontSize: '20px', fontWeight: 800, color: C.pink,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{item.stat}</span>
                    <span style={{ fontSize: '14px', color: C.n400, marginLeft: '10px' }}>{item.label}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instagram Phone Mockup ────────────────────────── */}
      <section style={{ padding: '80px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Content that looks <span style={{ color: C.pink }}>real</span>
            </h2>
            <p style={{ color: C.n400, fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Every post is indistinguishable from a real influencer's feed.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {/* Phone frame */}
            <div style={{
              width: '340px', borderRadius: '40px',
              border: '4px solid rgba(255,255,255,0.08)',
              background: '#111', padding: '14px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 100px rgba(255,107,157,0.12)',
            }}>
              {/* Notch */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '2px 10px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.4)',
              }}>
                <span>9:41</span>
                <div style={{ width: '80px', height: '24px', borderRadius: '12px', background: '#000' }} />
                <span style={{ fontSize: '10px' }}>●●●</span>
              </div>

              {/* IG Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
                  padding: '2px',
                }}>
                  <img src="/phone/2.png" alt="" style={{
                    width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
                    border: '2px solid #111',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.text1 }}>vist_character</div>
                  <div style={{ fontSize: '10px', color: C.n400 }}>Miami, Florida</div>
                </div>
                <span style={{ color: C.n400, fontSize: '16px', letterSpacing: '2px' }}>•••</span>
              </div>

              {/* Post Image — carousel */}
              <div style={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden', background: C.n800 }}>
                {phoneImages.map((src, i) => (
                  <img key={i} src={src} alt="" style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover',
                    opacity: i === phoneIdx ? 1 : 0,
                    transition: 'opacity 0.6s ease',
                  }} />
                ))}
                {/* Carousel dots */}
                <div style={{
                  position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: '5px',
                }}>
                  {phoneImages.map((_, i) => (
                    <div key={i} style={{
                      width: i === phoneIdx ? '18px' : '5px', height: '5px', borderRadius: '3px',
                      background: i === phoneIdx ? C.pink : 'rgba(255,255,255,0.3)',
                      transition: 'all 0.3s ease',
                    }} />
                  ))}
                </div>
              </div>

              {/* IG Actions */}
              <div style={{ padding: '12px 10px' }}>
                <div style={{ display: 'flex', gap: '14px', marginBottom: '8px', fontSize: '20px' }}>
                  <span>♡</span><span>💬</span><span>↗</span>
                  <span style={{ marginLeft: 'auto' }}>☆</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text1, marginBottom: '4px' }}>24,847 likes</div>
                <div style={{ fontSize: '12px', color: C.text2, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: C.text1 }}>vist_character</span>{' '}
                  Golden hour hits different ✨ New collection dropping soon 🔥
                </div>
                <div style={{ fontSize: '10px', color: C.n400, marginTop: '6px' }}>View all 342 comments</div>
                <div style={{ fontSize: '10px', color: C.n400, marginTop: '2px' }}>2 HOURS AGO</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── How it Works ──────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '80px 80px', maxWidth: '800px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 700, marginBottom: '8px' }}>How it Works</h2>
            <p style={{ color: C.n400, fontSize: '16px' }}>Three simple steps to viral content.</p>
          </div>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { num: '1', title: 'Create', desc: "Define your influencer's style, location, and prompt. Upload reference images or use our preset aesthetics.", icon: '✏️' },
            { num: '2', title: 'Generate', desc: 'Let our advanced AI work its magic. Review multiple variations, upscale, and fine-tune details until it\'s perfect.', icon: '✨' },
            { num: '3', title: 'Post', desc: 'Generate engaging captions automatically and schedule your content directly to your connected social channels.', icon: '📤' },
          ].map((s, i) => (
            <Reveal key={s.num} delay={i * 0.1}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: C.n800, border: `2px solid ${C.pink}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.pink, fontSize: '20px', flexShrink: 0,
                  }}>{s.icon}</div>
                  {i < 2 && (
                    <div style={{
                      width: '2px', height: '64px',
                      background: `linear-gradient(to bottom, ${C.pink}, ${C.n700})`,
                    }} />
                  )}
                </div>
                <div style={{ paddingTop: '8px', paddingBottom: i < 2 ? '24px' : '0' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{s.num}. {s.title}</h3>
                  <p style={{ color: C.n400, fontSize: '17px', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Showcase ──────────────────────────────────────── */}
      <section id="showcase" style={{ padding: '80px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 700, marginBottom: '8px' }}>Showcase</h2>
              <p style={{ color: C.n400 }}>AI Influencers built with VIST</p>
            </div>
            <button onClick={onAuth} style={{
              background: 'transparent', border: 'none', color: C.pink,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}>View Gallery →</button>
          </div>
        </Reveal>

        <div style={{ columnCount: 3, columnGap: '20px' }}>
          {showcaseImages.map((img, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div style={{
                breakInside: 'avoid', borderRadius: '16px', overflow: 'hidden',
                position: 'relative', marginBottom: '20px', cursor: 'pointer',
              }}
                onClick={onAuth}
              >
                <img src={img.src} alt="" style={{
                  width: '100%', display: 'block',
                  aspectRatio: i === 1 ? '1/1' : i === 0 ? '3/4' : '4/5',
                  objectFit: 'cover',
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(8,7,12,0.9), transparent 50%, transparent)',
                  opacity: 0, transition: 'opacity 300ms',
                  display: 'flex', alignItems: 'flex-end', padding: '24px',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '18px' }}>{img.name}</p>
                    <p style={{ fontSize: '13px', color: C.text3 }}>Generated in {img.time}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section style={{ padding: '120px 80px', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '50%', height: '100%', borderRadius: '50%',
          background: 'rgba(255,107,157,0.05)', filter: 'blur(120px)', pointerEvents: 'none',
        }} />
        <Reveal>
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, marginBottom: '20px', position: 'relative', zIndex: 1 }}>
            Ready to build your empire?
          </h2>
          <p style={{ fontSize: '20px', color: C.n400, marginBottom: '40px', maxWidth: '640px', margin: '0 auto 40px', position: 'relative', zIndex: 1 }}>
            Join thousands of creators building the next generation of social media influencers with VIST Studio.
          </p>
          <div style={{ position: 'relative', zIndex: 1, display: 'inline-block' }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: C.pink, filter: 'blur(20px)', opacity: 0.4, borderRadius: '999px',
            }} />
            <button onClick={onAuth} style={{
              position: 'relative', background: C.pink, color: C.bg, border: 'none',
              borderRadius: '999px', padding: '0 48px', height: '64px',
              fontSize: '20px', fontWeight: 700, cursor: 'pointer',
              transition: 'transform 300ms',
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Get Started for Free
            </button>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${C.n800}`, padding: '40px 0', marginTop: '40px',
        textAlign: 'center', color: C.n400, fontSize: '14px',
      }}>
        © 2026 VIST Studio. All rights reserved.
      </footer>
    </div>
  );
}
