import React from 'react';

interface LandingProps {
  onAuth: () => void;
}

const marqueeItems = [
  { icon: '◎', label: 'Photo Sessions' },
  { icon: '✦', label: 'AI Face Swap' },
  { icon: '💡', label: 'Relight Engine' },
  { icon: '🔄', label: '360° Angles' },
  { icon: '👗', label: 'Virtual Try-On' },
  { icon: '🎨', label: 'Style Transfer' },
  { icon: '✧', label: 'Universe Builder' },
  { icon: '📐', label: 'Pose Reference' },
];

const features = [
  { icon: '⊕', title: 'Character DNA', desc: 'Crea personajes únicos con rasgos faciales, estilos y personalidades generadas por IA.', bg: 'rgba(240,104,72,0.1)' },
  { icon: '◎', title: 'Sesiones de Fotos', desc: 'Genera sesiones de fotos completas con múltiples ángulos, poses y escenarios.', bg: 'rgba(208,72,176,0.1)' },
  { icon: '💡', title: 'Relight Engine', desc: 'Cambia la iluminación de cualquier imagen con IA. Estudio, golden hour, neon y más.', bg: 'rgba(72,88,224,0.1)' },
  { icon: '🔄', title: '360° Angles', desc: 'Visualiza tu personaje desde cualquier ángulo con rotación completa impulsada por IA.', bg: 'rgba(240,104,72,0.1)' },
  { icon: '🎭', title: 'Face Swap', desc: 'Intercambia rostros entre personajes manteniendo la identidad y expresiones naturales.', bg: 'rgba(208,72,176,0.1)' },
  { icon: '👗', title: 'Try-On Virtual', desc: 'Prueba cualquier prenda en tus personajes con probador virtual impulsado por IA.', bg: 'rgba(72,88,224,0.1)' },
  { icon: '✧', title: 'Universe Builder', desc: 'Construye universos completos con lore, escenarios y narrativas consistentes.', bg: 'rgba(240,104,72,0.1)' },
  { icon: '▣', title: 'Content Calendar', desc: 'Planifica y programa contenido automatizado para todas tus plataformas sociales.', bg: 'rgba(208,72,176,0.1)' },
  { icon: '◇', title: 'Analytics Hub', desc: 'Métricas en tiempo real de engagement, crecimiento y rendimiento de contenido.', bg: 'rgba(72,88,224,0.1)' },
];

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mes',
    features: ['50 créditos/mes', '3 personajes', 'Galería básica', 'Community support'],
    cta: 'Comenzar Gratis',
    featured: false,
    btnClass: 'btn-outline',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mes',
    features: ['500 créditos/mes', '25 personajes', 'Todas las herramientas', 'Priority support'],
    cta: 'Elegir Pro',
    featured: true,
    btnClass: 'btn-plasma',
  },
  {
    name: 'Studio',
    price: '$49',
    period: '/mes',
    features: ['1,500 créditos/mes', 'Personajes ilimitados', 'API access', 'Analytics completo'],
    cta: 'Elegir Studio',
    featured: false,
    btnClass: 'btn-outline',
  },
  {
    name: 'Brand',
    price: '$149',
    period: '/mes',
    features: ['8,000 créditos/mes', 'Todo en Studio', 'Team collaboration', 'White-label', 'Dedicated support'],
    cta: 'Contactar Ventas',
    featured: false,
    btnClass: 'btn-outline',
  },
];

const Landing: React.FC<LandingProps> = ({ onAuth }) => {
  return (
    <div style={{ background: 'var(--bg-0)', color: 'var(--text-1)', minHeight: '100vh' }}>
      {/* ── Fixed Nav ──────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        height: '64px',
        background: 'rgba(6,5,10,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(240,234,240,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent), var(--magenta))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '16px',
            color: '#fff',
          }}>V</div>
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.05em' }}>VERTEX</span>
          <span className="font-jet" style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em' }}>AI STUDIO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#features" style={{ fontSize: '13px', color: 'var(--text-2)', textDecoration: 'none', transition: 'color 0.2s' }}>Features</a>
          <a href="#showcase" style={{ fontSize: '13px', color: 'var(--text-2)', textDecoration: 'none', transition: 'color 0.2s' }}>Product</a>
          <a href="#pricing" style={{ fontSize: '13px', color: 'var(--text-2)', textDecoration: 'none', transition: 'color 0.2s' }}>Pricing</a>
          <button className="btn-plasma" onClick={onAuth} style={{ padding: '10px 24px', fontSize: '13px' }}>Comenzar Gratis</button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-mesh" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="hero-badge animate-reveal">Plataforma de Influencers Virtuales #1</div>
          <h1 className="animate-reveal delay-1" style={{
            fontSize: 'clamp(56px,8vw,110px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            margin: '24px 0 20px',
          }}>
            Crea influencers<br /><span className="text-gradient">impulsados por IA</span>
          </h1>
          <p className="animate-reveal delay-2" style={{
            fontSize: '18px',
            color: 'var(--text-2)',
            maxWidth: '540px',
            lineHeight: 1.6,
            marginBottom: '36px',
          }}>
            El templo definitivo de los personajes virtuales. Genera, edita, relight, face swap, try-on y construye universos completos — todo con inteligencia artificial.
          </p>
          <div className="animate-reveal delay-3" style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'center' }}>
            <button className="btn-plasma" onClick={onAuth}>✦ Comenzar Gratis</button>
            <button className="btn-outline">Ver Demo ↗</button>
          </div>
        </div>
        <div className="scroll-indicator"><div className="scroll-line" />SCROLL</div>
      </section>

      {/* ── Marquee ────────────────────────────────────────────── */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <div className="marquee-item" key={i}>
              <span>{item.icon}</span> {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" style={{ padding: '120px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="section-header">
          <div className="section-label">Herramientas</div>
          <h2 className="font-display" style={{ fontSize: '48px', lineHeight: 1.1, marginBottom: '16px' }}>
            Todo lo que necesitas.<br /><span className="text-gradient">Nada que te sobre.</span>
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--text-2)', lineHeight: 1.6 }}>
            Cada herramienta diseñada para maximizar tu creatividad sin complejidad innecesaria.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '20px' }}>
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon" style={{ background: f.bg }}>{f.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Showcase ───────────────────────────────────────────── */}
      <section id="showcase" style={{ padding: '120px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          {/* Left: Mock UI */}
          <div className="showcase-screen">
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 30% 40%, rgba(240,104,72,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(208,72,176,0.04) 0%, transparent 50%)',
            }} />
            <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
              {/* Mock sidebar */}
              <div style={{
                width: '48px',
                borderRight: '1px solid rgba(240,234,240,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '16px',
                gap: '12px',
              }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--accent)' : 'var(--bg-4)',
                  }} />
                ))}
              </div>
              {/* Mock content */}
              <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Stats row */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['var(--accent)', 'var(--magenta)', 'var(--blue)'].map((color, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: '48px',
                      borderRadius: '10px',
                      background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                      border: '1px solid rgba(240,234,240,0.04)',
                    }} />
                  ))}
                </div>
                {/* Chart bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
                  {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: `${h}%`,
                      borderRadius: '4px 4px 0 0',
                      background: `linear-gradient(180deg, var(--accent), var(--magenta))`,
                      opacity: 0.3 + (h / 150),
                    }} />
                  ))}
                </div>
                {/* Gradient cards */}
                <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                  <div style={{
                    flex: 1,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(240,104,72,0.1), rgba(208,72,176,0.05))',
                    border: '1px solid rgba(240,234,240,0.04)',
                  }} />
                  <div style={{
                    flex: 1,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(208,72,176,0.1), rgba(72,88,224,0.05))',
                    border: '1px solid rgba(240,234,240,0.04)',
                  }} />
                </div>
              </div>
            </div>
          </div>
          {/* Right: Text */}
          <div>
            <div className="section-label" style={{ textAlign: 'left' }}>La Plataforma</div>
            <h2 className="font-display" style={{ fontSize: '44px', lineHeight: 1.1, marginBottom: '20px' }}>
              Un estudio completo<br />para <span className="text-gradient">creadores</span>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '32px' }}>
              Diseñado para creadores que necesitan resultados profesionales sin la complejidad de herramientas fragmentadas.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { color: 'var(--accent)', text: 'Generación de imágenes con 6+ motores de IA' },
                { color: 'var(--magenta)', text: 'Edición no destructiva con historial completo' },
                { color: 'var(--blue)', text: 'Exportación en alta resolución para cualquier plataforma' },
                { color: 'var(--mint)', text: 'Colaboración en equipo con roles y permisos' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '15px', color: 'var(--text-2)' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Band ─────────────────────────────────────────── */}
      <div className="stats-band">
        {[
          { num: '10K+', lbl: 'Creadores Activos' },
          { num: '2.4M', lbl: 'Imágenes Generadas' },
          { num: '50K+', lbl: 'Personajes Creados' },
          { num: '99.2%', lbl: 'Uptime' },
        ].map((s, i) => (
          <div className="stat-item" key={i}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '120px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="section-header">
          <div className="section-label">Planes</div>
          <h2 className="font-display" style={{ fontSize: '48px', lineHeight: 1.1, marginBottom: '16px' }}>
            Elige tu plan <span className="text-gradient">perfecto</span>
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--text-2)', lineHeight: 1.6 }}>
            Comienza gratis. Escala cuando estés listo.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '20px' }}>
          {plans.map((plan, i) => (
            <div className={`price-card${plan.featured ? ' featured' : ''}`} key={i}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 700, fontFamily: "'Instrument Serif', serif" }}>{plan.price}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>{plan.period}</span>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {plan.features.map((feat, j) => (
                  <li key={j} style={{ fontSize: '14px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--accent)', fontSize: '12px' }}>✦</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <button className={plan.btnClass} onClick={onAuth} style={{ width: '100%', justifyContent: 'center' }}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section style={{
        padding: '120px 40px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(240,104,72,0.08) 0%, transparent 60%)',
      }}>
        <h2 className="font-display" style={{ fontSize: '52px', lineHeight: 1.1, marginBottom: '20px' }}>
          Comienza a crear<br /><span className="text-gradient">tu universo</span>
        </h2>
        <p style={{ fontSize: '17px', color: 'var(--text-2)', maxWidth: '480px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          Únete a miles de creadores que ya están construyendo sus personajes virtuales con IA.
        </p>
        <button className="btn-plasma" onClick={onAuth}>✦ Comenzar Gratis</button>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ padding: '0 40px 40px' }}>
        <div className="footer-glow" />
        <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto', gap: '60px', flexWrap: 'wrap' }}>
          {/* Left */}
          <div style={{ maxWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent), var(--magenta))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                color: '#fff',
              }}>V</div>
              <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.05em' }}>VERTEX</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.7 }}>
              El estudio de IA definitivo para crear y gestionar influencers virtuales.
            </p>
          </div>
          {/* Right columns */}
          {[
            {
              title: 'Producto',
              links: ['Character Creator', 'Photo Studio', 'AI Editor', 'Universe Builder'],
            },
            {
              title: 'Empresa',
              links: ['About', 'Blog', 'Careers', 'Contact'],
            },
            {
              title: 'Legal',
              links: ['Privacy', 'Terms', 'Cookies'],
            },
          ].map((col, i) => (
            <div key={i}>
              <h4 style={{
                fontSize: '12px',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-2)',
                marginBottom: '16px',
                fontWeight: 600,
              }}>{col.title}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map((link, j) => (
                  <a key={j} href="#" style={{ fontSize: '13px', color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.2s' }}>
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '40px auto 0',
          paddingTop: '20px',
          borderTop: '1px solid rgba(240,234,240,0.04)',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
            © 2026 Vertex Studio
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
            CRAFTED WITH ✦ AI
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
