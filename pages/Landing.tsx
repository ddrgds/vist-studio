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
  bg: '#FFFFFF',
  n900: '#F7F7F8',
  n800: '#F0F0F1',
  n700: '#E8E8EA',
  n400: '#999999',
  pink: '#111111',    // primary action — near black
  text1: '#111111',
  text2: '#555555',
  text3: '#888888',
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
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '24px', height: '24px', color: C.pink }}>
            <svg fill="currentColor" viewBox="0 0 48 48"><path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" /></svg>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>VIST Studio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          <nav style={{ display: 'flex', gap: '36px' }}>
            {[{ label: 'Funciones', href: '#features' }, { label: 'Cómo Funciona', href: '#how-it-works' }, { label: 'Galería', href: '#showcase' }].map(l => (
              <a key={l.label} href={l.href} style={{
                fontSize: '14px', fontWeight: 500, color: C.text3,
                textDecoration: 'none', transition: 'color 150ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = C.pink)}
                onMouseLeave={e => (e.currentTarget.style.color = C.text3)}
              >{l.label}</a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onAuth} style={{
              background: 'transparent', color: '#111111',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: '999px', padding: '0 24px', height: '40px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}>Iniciar Sesión</button>
            <button onClick={onAuth} style={{
              background: '#111111', color: '#FFFFFF', border: 'none',
              borderRadius: '999px', padding: '0 24px', height: '40px',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              transition: 'background 150ms',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#333333')}
              onMouseLeave={e => (e.currentTarget.style.background = '#111111')}
            >Comenzar</button>
          </div>
        </div>
      </header>

      {/* ── Hero — 3D Carousel ────────────────────────────── */}
      <HeroCarousel
        title={
          <>
            CREA CONTENIDO QUE<br />
            <span style={{ color: '#111111' }}>DETENGA EL SCROLL</span>
          </>
        }
        subtitle="VIST Studio: La plataforma definitiva de contenido con IA para influencers virtuales. Genera posts, reels y stories hiperrealistas en segundos."
        images={phoneImages.map((src, i) => ({ src, alt: `Influencer virtual ${i + 1}` }))}
        onCtaClick={onAuth}
        ctaLabel="Empieza a Crear"
        style={{ minHeight: 'auto', paddingTop: '100px', paddingBottom: '40px' }}
      />

      {/* ── Features ──────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              ¿Por qué VIST Studio?
            </h2>
            <p style={{ color: C.n400, fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
              Desbloquea el poder de la creación de contenido con IA, diseñada específicamente para influencers virtuales.
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { icon: '💡', title: 'Creatividad Sin Límites', desc: 'Genera conceptos, estéticas e ideas de campaña ilimitadas que encajan perfecto con la personalidad única de tu influencer virtual.' },
            { icon: '📸', title: 'Generación Hiperrealista', desc: 'Nuestros modelos de IA de última generación crean fotos y videos cortos hiperrealistas, imposibles de distinguir de la realidad.' },
            { icon: '🚀', title: 'Publicación Directa', desc: 'Programa, escribe captions y publica directo a Instagram, TikTok y X con un solo clic desde nuestro panel integrado.' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.1}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                padding: '32px', borderRadius: '16px',
                background: '#F7F7F8',
                border: '1px solid rgba(0,0,0,0.08)',
                transition: 'border-color 300ms, box-shadow 300ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  position: 'absolute', top: '-32px', right: '-32px', width: '128px', height: '128px',
                  background: 'rgba(0,0,0,0.04)', borderRadius: '50%', filter: 'blur(24px)',
                }} />
                <div style={{
                  width: '56px', height: '56px', borderRadius: '12px',
                  background: 'rgba(0,0,0,0.06)', color: C.pink,
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
            boxShadow: '0 30px 80px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.08)',
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
              Ella no es real.<br />
              <span style={{ color: C.pink }}>Su engagement sí lo es.</span>
            </h2>
            <p style={{ color: C.n400, fontSize: '17px', lineHeight: 1.7, marginBottom: '32px', maxWidth: '440px' }}>
              Crea personajes con IA que publican como influencers reales. Misma estética, mismo engagement — cero costos de producción.
            </p>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '📸', stat: '50K+', label: 'Fotos generadas por creadores' },
              { icon: '🎬', stat: '4K+', label: 'Videos y reels producidos' },
              { icon: '⚡', stat: '<15s', label: 'Tiempo promedio de generación' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={0.15 + i * 0.08}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px', borderRadius: '14px',
                  background: '#F7F7F8',
                  border: '1px solid rgba(0,0,0,0.08)',
                  transition: 'border-color 200ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)')}
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
              Contenido que se ve <span style={{ color: C.pink }}>real</span>
            </h2>
            <p style={{ color: C.n400, fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Cada post es imposible de distinguir del feed de un influencer real.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {/* Phone frame */}
            <div style={{
              width: '340px', borderRadius: '40px',
              border: '4px solid rgba(0,0,0,0.12)',
              background: '#111', padding: '14px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.15)',
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
                  background: 'linear-gradient(135deg, #333333, #666666)',
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
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text1, marginBottom: '4px' }}>24,847 me gusta</div>
                <div style={{ fontSize: '12px', color: C.text2, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: C.text1 }}>vist_character</span>{' '}
                  La golden hour pega diferente ✨ Nueva colección viene pronto 🔥
                </div>
                <div style={{ fontSize: '10px', color: C.n400, marginTop: '6px' }}>Ver los 342 comentarios</div>
                <div style={{ fontSize: '10px', color: C.n400, marginTop: '2px' }}>HACE 2 HORAS</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── How it Works ──────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '80px 80px', maxWidth: '800px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 700, marginBottom: '8px' }}>Cómo Funciona</h2>
            <p style={{ color: C.n400, fontSize: '16px' }}>Tres pasos simples para contenido viral.</p>
          </div>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { num: '1', title: 'Crear', desc: "Define el estilo, ubicación y prompt de tu influencer. Sube imágenes de referencia o usa nuestras estéticas prediseñadas.", icon: '✏️' },
            { num: '2', title: 'Generar', desc: 'Deja que nuestra IA avanzada haga su magia. Revisa múltiples variaciones, escala y ajusta los detalles hasta que quede perfecto.', icon: '✨' },
            { num: '3', title: 'Publicar', desc: 'Genera captions atractivos automáticamente y programa tu contenido directo a tus redes sociales conectadas.', icon: '📤' },
          ].map((s, i) => (
            <Reveal key={s.num} delay={i * 0.1}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: C.n800, border: `2px solid rgba(0,0,0,0.2)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.pink, fontSize: '20px', flexShrink: 0,
                  }}>{s.icon}</div>
                  {i < 2 && (
                    <div style={{
                      width: '2px', height: '64px',
                      background: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.06))`,
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
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 700, marginBottom: '8px' }}>Galería</h2>
              <p style={{ color: C.n400 }}>Influencers virtuales creados con VIST</p>
            </div>
            <button onClick={onAuth} style={{
              background: 'transparent', border: 'none', color: C.pink,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}>Ver Galería →</button>
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
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%, transparent)',
                  opacity: 0, transition: 'opacity 300ms',
                  display: 'flex', alignItems: 'flex-end', padding: '24px',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '18px' }}>{img.name}</p>
                    <p style={{ fontSize: '13px', color: C.text3 }}>Generado en {img.time}</p>
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
          background: 'rgba(0,0,0,0.02)', filter: 'blur(120px)', pointerEvents: 'none',
        }} />
        <Reveal>
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, marginBottom: '20px', position: 'relative', zIndex: 1 }}>
            ¿Lista para construir tu imperio?
          </h2>
          <p style={{ fontSize: '20px', color: C.n400, marginBottom: '40px', maxWidth: '640px', margin: '0 auto 40px', position: 'relative', zIndex: 1 }}>
            Únete a miles de creadores construyendo la próxima generación de influencers en redes sociales con VIST Studio.
          </p>
          <div style={{ position: 'relative', zIndex: 1, display: 'inline-block' }}>
            <button onClick={onAuth} style={{
              position: 'relative', background: '#111111', color: '#FFFFFF', border: 'none',
              borderRadius: '999px', padding: '0 48px', height: '64px',
              fontSize: '20px', fontWeight: 700, cursor: 'pointer',
              transition: 'background 150ms, transform 300ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#333333'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#111111'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Comenzar Gratis
            </button>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(0,0,0,0.08)', padding: '40px 0', marginTop: '40px',
        textAlign: 'center', color: C.n400, fontSize: '14px',
      }}>
        © 2026 VIST Studio. Todos los derechos reservados.
      </footer>
    </div>
  );
}
