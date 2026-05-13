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
const phoneImages = ['/landing/s1.png', '/landing/s2.png', '/landing/s3.png', '/landing/s4.png', '/landing/s5.png', '/landing/s6.png', '/landing/s7.png'];
const igPhoneImages = ['/landing/phone1.png', '/landing/phone2.png', '/landing/phone3.png', '/landing/phone4.png'];

/* ── Showcase images (reuse from phone + more) ─────────────── */
const showcaseImages = [
  { src: '/landing/7.png', name: '@luna_virtual', time: '15s' },
  { src: '/landing/8.png', name: '@vex.ai', time: '12s' },
  { src: '/landing/9.png', name: '@nova.x', time: '18s' },
];

/* ════════════════════════════════════════════════════════════
   Landing — V2 Design (Stitch reference)
   ════════════════════════════════════════════════════════════ */
export default function Landing({ onAuth }: LandingProps) {
  // phoneIdx for the IG mockup section (hero carousel manages its own state)
  const [phoneIdx, setPhoneIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhoneIdx(i => (i + 1) % igPhoneImages.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text1, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 5vw, 80px)', height: '64px',
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
          <nav className="hidden md:flex" style={{ gap: '36px' }}>
            {[{ label: 'Caso real', href: '#case-study' }, { label: 'Cómo funciona', href: '#how-it-works' }, { label: 'Precios', href: '#pricing-teaser' }].map(l => (
              <a key={l.label} href={l.href} style={{
                fontSize: '14px', fontWeight: 500, color: C.text3,
                textDecoration: 'none', transition: 'color 150ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = C.pink)}
                onMouseLeave={e => (e.currentTarget.style.color = C.text3)}
              >{l.label}</a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onAuth} className="hidden sm:block" style={{
              background: 'transparent', color: '#111111',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: '999px', padding: '0 16px', height: '36px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
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
            CONSTRUYE TU PRIMER<br />
            <span style={{ color: '#111111' }}>MODELO VIRTUAL DE IA</span>
          </>
        }
        subtitle="Sin cámara, sin equipo, sin experiencia técnica. La herramienta + el playbook + la comunidad para crear tu negocio AI influencer en español."
        images={phoneImages.map((src, i) => ({ src, alt: `Modelo virtual ${i + 1}` }))}
        onCtaClick={onAuth}
        ctaLabel="Empezar gratis"
        style={{ minHeight: 'auto', paddingTop: '100px', paddingBottom: '40px' }}
      />

      {/* ── Case Study Strip (founder proof) ─────────────── */}
      <section style={{ padding: '0 clamp(16px, 5vw, 80px) clamp(20px, 4vw, 40px)', maxWidth: '1100px', margin: '0 auto' }}>
        <Reveal>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 20px)',
            padding: '14px 20px', borderRadius: '999px',
            background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
            justifyContent: 'center', flexWrap: 'wrap' as const,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
              color: C.text3, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            }}>Caso real del fundador</span>
            <span style={{ color: C.text2, fontSize: '14px' }}>
              <strong style={{ color: C.text1 }}>1,700+ seguidores</strong> en una cuenta de IG construida 100% con VIST.
            </span>
            <a href="#case-study" style={{
              fontSize: '13px', color: C.pink, fontWeight: 600,
              textDecoration: 'none',
            }}>Ver el caso →</a>
          </div>
        </Reveal>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section id="features" style={{ padding: 'clamp(40px, 8vw, 100px) clamp(16px, 5vw, 80px)', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Tres cosas, no veintisiete
            </h2>
            <p style={{ color: C.n400, fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
              No es una caja de herramientas. Es el stack completo para arrancar tu negocio de modelo virtual.
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {[
            { icon: '🧬', title: 'Crea tu modelo desde cero', desc: 'Diseña su rostro, cuerpo y estilo en minutos. Genera fotos consistentes con la misma identidad cada vez. Editorial, lifestyle, sensual editorial.' },
            { icon: '📖', title: 'El playbook incluido', desc: 'Cómo configurar IG/TikTok, qué postear las primeras 4 semanas, cómo crecer hasta el primer ingreso. Paso a paso, en español.' },
            { icon: '👥', title: 'Comunidad de operadores', desc: 'Discord activo de gente construyendo lo mismo. Ves casos reales, preguntas, te validas. Esto no se hace solo.' },
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
        padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 80px)', maxWidth: '1200px', margin: '0 auto',
        display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 'clamp(24px, 4vw, 60px)',
      }}>
        {/* Left — Character Image */}
        <Reveal>
          <div style={{
            width: 'clamp(280px, 40vw, 400px)', flexShrink: 0, borderRadius: '24px', overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}>
            <img src="/landing/10.png" alt="AI influencer" style={{
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
              <span style={{ color: C.pink }}>El negocio sí lo es.</span>
            </h2>
            <p style={{ color: C.n400, fontSize: '17px', lineHeight: 1.7, marginBottom: '32px', maxWidth: '440px' }}>
              Tu modelo virtual postea, crece audiencia, y monetiza en IG, TikTok u OF. Sin tu cara, sin equipo, sin alquilar locación. Cero costos de producción, control total del personaje.
            </p>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '⚡', stat: '5 min', label: 'Para crear tu primera modelo' },
              { icon: '🎯', stat: '100%', label: 'Consistencia de rostro entre fotos' },
              { icon: '🌎', stat: 'Español', label: 'Plataforma 100% en español, soporte en tu zona horaria, comunidad LATAM activa' },
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
      <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 80px)', maxWidth: '1200px', margin: '0 auto' }}>
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
                  <img src="/landing/10.png" alt="" style={{
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
                {igPhoneImages.map((src, i) => (
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

      {/* ── Case Study ────────────────────────────────────── */}
      <section id="case-study" style={{ padding: 'clamp(40px, 8vw, 100px) clamp(16px, 5vw, 80px)', maxWidth: '1100px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{
              display: 'inline-block', padding: '6px 14px', borderRadius: '999px',
              background: 'rgba(0,0,0,0.06)', fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: C.text2, marginBottom: '16px',
            }}>Caso de estudio · Fundador</span>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '16px' }}>
              Yo construí mi modelo IA. Lo documenté.
            </h2>
            <p style={{ color: C.n400, fontSize: '17px', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
              No es teoría. Tengo una cuenta de IG con <strong style={{ color: C.text1 }}>1,700+ seguidores reales</strong> construida 100% con esta misma herramienta. Te muestro el proceso completo.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div style={{
            position: 'relative',
            aspectRatio: '16/9',
            borderRadius: '20px',
            overflow: 'hidden',
            background: '#111',
            boxShadow: '0 30px 80px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.08)',
            cursor: 'pointer',
          }} onClick={onAuth}>
            {/* Video poster — replace with actual case study cover */}
            <img src="/landing/10.png" alt="Case study video preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.5))',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '24px solid #111',
                  borderTop: '14px solid transparent',
                  borderBottom: '14px solid transparent',
                  marginLeft: '6px',
                }} />
              </div>
            </div>
            <div style={{
              position: 'absolute', bottom: '20px', left: '20px', right: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              flexWrap: 'wrap' as const, gap: '12px',
            }}>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>VIST CASE STUDY · 5 MIN</div>
                <div style={{ fontSize: '20px', color: '#fff', fontWeight: 700 }}>De cero a 1,700+ seguidores: cómo lo hice</div>
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: "'JetBrains Mono', monospace" }}>VIDEO PRÓXIMAMENTE</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── How it Works ──────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 80px)', maxWidth: '800px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 700, marginBottom: '8px' }}>De cero a tu primer post</h2>
            <p style={{ color: C.n400, fontSize: '16px' }}>Tres pasos. Cero código. Cero cámara.</p>
          </div>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { num: '1', title: 'Define tu modelo', desc: "Nombre, look, estilo. Elige una estética (editorial, beach, cosmopolitan, street, coastal) o construye desde cero. La IA genera la primera sesión de fotos consistente.", icon: '🧬' },
            { num: '2', title: 'Genera contenido', desc: 'Sesiones de fotos, reels, try-on, lifestyle. Misma identidad cada vez. Modo Standard editorial o Modo Creator con presets sensuales (opt-in +18).', icon: '📸' },
            { num: '3', title: 'Lanza y monetiza', desc: 'El playbook te guía: cómo configurar IG/TikTok/OF, qué postear las primeras 4 semanas, cómo crecer. Comunidad Discord para consultas.', icon: '🚀' },
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
      <section id="showcase" style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 80px)', maxWidth: '1200px', margin: '0 auto' }}>
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

      {/* ── Pricing Teaser ────────────────────────────────── */}
      <section id="pricing-teaser" style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 80px)', maxWidth: '1100px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Empieza gratis. Escala cuando funcione.
            </h2>
            <p style={{ color: C.n400, fontSize: '16px', maxWidth: '560px', margin: '0 auto' }}>
              Free para validar. Mini para probar con compromiso bajo. Side Project si te lo tomas en serio. Negocio cuando empieces a vender.
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {[
            { tier: 'Free', price: '$0', sub: 'para siempre', desc: '50 cr al registro · 25 cr/sem · 1 modelo · Modo Standard · Discord', cta: 'Empezar gratis', highlight: false },
            { tier: 'Mini', price: '$5', sub: 'al mes', desc: '250 cr/mes · 1 modelo · Modo Standard · sin watermark · 2K · cancela cuando quieras', cta: 'Suscribirme', highlight: false },
            { tier: 'Side Project', price: '$19', sub: 'al mes', desc: '800 cr/mes · 1 modelo · Standard + Creator · sin watermark · 2K · todas las estéticas', cta: 'Suscribirme', highlight: true },
            { tier: 'Negocio', price: '$79', sub: 'al mes', desc: '4,000 cr/mes · 3 modelos · Reels HD · voces LATAM · playbook completo · priority queue', cta: 'Suscribirme', highlight: false },
            { tier: 'Pro', price: '$199', sub: 'al mes', desc: '12,000 cr/mes · 10 modelos · multi-personaje · 1:1 setup · affiliate dashboard', cta: 'Suscribirme', highlight: false },
          ].map((p, i) => (
            <Reveal key={p.tier} delay={i * 0.08}>
              <div style={{
                padding: '24px', borderRadius: '16px',
                background: p.highlight ? '#111111' : '#FFFFFF',
                color: p.highlight ? '#FFFFFF' : C.text1,
                border: `1px solid ${p.highlight ? '#111' : 'rgba(0,0,0,0.08)'}`,
                position: 'relative',
                boxShadow: p.highlight ? '0 12px 40px rgba(0,0,0,0.15)' : 'none',
                display: 'flex', flexDirection: 'column', gap: '12px',
                minHeight: '240px',
              }}>
                {p.highlight && (
                  <span style={{
                    position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                    background: '#FFFFFF', color: '#111111',
                    padding: '4px 12px', borderRadius: '999px',
                    fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    border: '1px solid rgba(0,0,0,0.12)',
                  }}>Recomendado</span>
                )}
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, opacity: 0.6 }}>{p.tier}</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em', marginTop: '4px' }}>
                    {p.price}<span style={{ fontSize: '13px', fontWeight: 400, opacity: 0.6, marginLeft: '6px' }}>{p.sub}</span>
                  </div>
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.5, opacity: 0.85, flex: 1 }}>{p.desc}</p>
                <button onClick={onAuth} style={{
                  background: p.highlight ? '#FFFFFF' : '#111111', color: p.highlight ? '#111' : '#FFF',
                  border: 'none', borderRadius: '999px', padding: '10px 20px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                }}>{p.cta}</button>
              </div>
            </Reveal>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '12px', color: C.text3 }}>
            Pagos en USD vía Lemon Squeezy · Mercado Pago próximamente para LATAM (PIX, OXXO, tarjeta local)
          </p>
        </div>
      </section>

      {/* ── FAQ Legal mini ────────────────────────────────── */}
      <section style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 5vw, 80px)', maxWidth: '900px', margin: '0 auto' }}>
        <Reveal>
          <div style={{
            padding: 'clamp(24px, 4vw, 36px)', borderRadius: '20px',
            background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {[
                { q: '¿Es legal?', a: 'Sí. Modelos virtuales generados por IA son contenido legítimo cuando se etiquetan como tales. Nuestros términos exigen disclosure "@AI" en perfiles públicos. Lo que NO permitimos: deepfakes de personas reales, menores de edad, contenido explícito.' },
                { q: '¿Qué nivel de contenido permite?', a: 'Modo Standard: editorial limpio. Modo Creator (opt-in +18): editorial sensual, lencería, beach, boudoir. Línea dura: nada de topless, desnudo o explícito. Sistema de safety check automático.' },
                { q: '¿Cómo monetizo?', a: 'IG/TikTok con engagement orgánico, OnlyFans/Fansly para teaser content (no explicit), marcas (sponsored), tu propia tienda. El playbook te guía mes a mes.' },
                { q: '¿Compite con creators reales?', a: 'No. Es una alternativa para quien no quiere o no puede poner su cara. Mercado distinto, ético si se etiqueta como IA.' },
              ].map(item => (
                <div key={item.q}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: C.text1 }}>{item.q}</h4>
                  <p style={{ fontSize: '13px', color: C.text2, lineHeight: 1.55 }}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) clamp(16px, 5vw, 80px)', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '50%', height: '100%', borderRadius: '50%',
          background: 'rgba(0,0,0,0.02)', filter: 'blur(120px)', pointerEvents: 'none',
        }} />
        <Reveal>
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, marginBottom: '20px', position: 'relative', zIndex: 1, lineHeight: 1.05 }}>
            ¿Listo para construir<br />tu primera modelo?
          </h2>
          <p style={{ fontSize: '20px', color: C.n400, marginBottom: '40px', maxWidth: '640px', margin: '0 auto 40px', position: 'relative', zIndex: 1 }}>
            50 créditos gratis al registro. Sin tarjeta. Sin compromiso. Suficiente para crear tu primera modelo y ver si esto es para ti.
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
              Empezar gratis →
            </button>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(0,0,0,0.08)', padding: '40px clamp(16px, 5vw, 80px)', marginTop: '40px',
        color: C.n400, fontSize: '13px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap' as const, gap: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>© 2026 VIST Studio · Hecho en LATAM 🌎</div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' as const }}>
            <a href="#" style={{ color: C.text2, textDecoration: 'none' }}>Términos</a>
            <a href="#" style={{ color: C.text2, textDecoration: 'none' }}>Privacidad</a>
            <a href="#" style={{ color: C.text2, textDecoration: 'none' }}>Discord</a>
            <a href="mailto:hola@vist.studio" style={{ color: C.text2, textDecoration: 'none' }}>Contacto</a>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '16px auto 0', fontSize: '11px', color: C.text3, textAlign: 'center' }}>
          Todos los modelos en VIST son generados por IA. No representan personas reales.
        </div>
      </footer>
    </div>
  );
}
