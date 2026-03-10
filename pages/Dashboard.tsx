import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useSubscription } from '../hooks/useSubscription';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { characters } = useCharacterStore();
  const { items: galleryItems } = useGalleryStore();
  const sub = useSubscription();

  // Demo data for characters when empty
  const DEMO_CHARACTERS = [
    { name: 'Luna Vex', style: 'Cyberpunk \u00b7 Streetwear', emoji: '\ud83c\udf19', status: 'active', gradient: 'linear-gradient(135deg, var(--accent), var(--magenta))', followers: '2.4M', engage: '8.7%', fotos: '342' },
    { name: 'Kai Frost', style: 'Minimalist \u00b7 High Fashion', emoji: '\u2744\ufe0f', status: 'active', gradient: 'linear-gradient(135deg, var(--blue), var(--mint))', followers: '1.8M', engage: '6.2%', fotos: '218' },
    { name: 'Zara Phoenix', style: 'Bohemian \u00b7 Travel', emoji: '\ud83d\udd25', status: 'draft', gradient: 'linear-gradient(135deg, var(--magenta), var(--accent))', followers: '890K', engage: '11.3%', fotos: '87' },
  ];

  const DEMO_ACTIVITY = [
    { initial: 'L', color: 'var(--accent)', action: 'Face Swap', char: 'Luna', time: '2h ago' },
    { initial: 'K', color: 'var(--magenta)', action: 'Relight', char: 'Kai', time: '5h ago' },
    { initial: 'L', color: 'var(--blue)', action: '360\u00b0 Render', char: 'Luna', time: '1d ago' },
    { initial: 'Z', color: 'var(--mint)', action: 'Try-On', char: 'Zara', time: '1d ago' },
    { initial: 'L', color: 'var(--accent)', action: 'Background Swap', char: 'Luna', time: '2d ago' },
  ];

  const QUICK_ACTIONS = [
    { icon: '\u2295', title: 'Subir Personaje', desc: 'Crear o importar', path: '/studio?tool=create', color: 'var(--accent)' },
    { icon: '\u25ce', title: 'Sesi\u00f3n de Fotos', desc: 'Escenarios y poses', path: '/studio?tool=session', color: 'var(--magenta)' },
    { icon: '\u2726', title: 'Editor IA', desc: 'Relight, swap, 360', path: '/studio', color: 'var(--blue)' },
    { icon: '\u27f2', title: 'Face Swap', desc: 'Cambiar rostros', path: '/studio?tool=faceswap', color: 'var(--accent)' },
    { icon: '\ud83d\udc57', title: 'Try-On Virtual', desc: 'Probar outfits', path: '/studio', color: 'var(--magenta)' },
    { icon: '\u25a6', title: 'Galer\u00eda', desc: 'Ver creaciones', path: '/gallery', color: 'var(--blue)' },
  ];

  const STATS = [
    { label: 'PERSONAJES', value: characters.length || 3, color: 'var(--accent)' },
    { label: 'FOTOS EDITADAS', value: galleryItems.length || '1,247', color: 'var(--magenta)' },
    { label: 'FACE SWAPS', value: '89', color: 'var(--blue)' },
    { label: 'SESIONES', value: '34', color: 'var(--slate)' },
    { label: 'RENDERS 360\u00b0', value: '12', color: 'var(--blue-light)' },
  ];

  const displayChars = characters.length > 0
    ? characters.slice(0, 3).map((c, i) => ({
        name: c.name,
        style: c.characteristics || c.accessory || '',
        emoji: '\u2726',
        status: 'active',
        gradient: DEMO_CHARACTERS[i % 3].gradient,
        followers: `${c.usageCount || 0}`,
        engage: '-',
        fotos: `${c.modelImageBlobs?.length || 0}`,
      }))
    : DEMO_CHARACTERS;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar gradient-mesh" style={{ background: 'var(--bg-0)' }}>
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 lg:px-10">

        {/* -- Header -- */}
        <div className="mb-8">
          <h1 style={{ fontSize: 36, lineHeight: 1.1 }}>
            <span style={{ fontFamily: "'Instrument Serif', serif" }}>Vertex </span>
            <span className="text-gradient" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>Studio</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginTop: 8 }}>
            El templo de los personajes virtuales editados con IA
          </p>
        </div>

        {/* -- Stats Row -- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {STATS.map(s => (
            <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
              <div className="font-jet" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* -- Quick Actions -- */}
        <div className="mb-8">
          <div className="font-jet" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 16 }}>
            Acciones Rápidas
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.title}
                onClick={() => navigate(a.path)}
                className="card text-left cursor-pointer"
                style={{ padding: '20px 16px' }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, marginBottom: 12,
                }}>{a.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* -- Bottom Section: Characters + Activity -- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* -- Characters -- */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="font-jet" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                Tus Personajes
              </div>
              <button
                onClick={() => navigate('/gallery')}
                style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                Ver todos &rarr;
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayChars.map((c, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{ border: '1px solid var(--border)' }}
                  onClick={() => characters[i] ? navigate(`/studio?character=${characters[i].id}`) : navigate('/studio?tool=create')}
                >
                  {/* Gradient header */}
                  <div style={{ background: c.gradient, height: 120, position: 'relative' }}>
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      padding: '2px 8px', borderRadius: 6,
                      fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                      background: c.status === 'active' ? 'rgba(80,216,160,0.2)' : 'rgba(224,176,80,0.2)',
                      color: c.status === 'active' ? 'var(--mint)' : 'var(--gold)',
                    }}>{c.status}</div>
                    <div style={{
                      position: 'absolute', bottom: -16, left: 16,
                      width: 40, height: 40, borderRadius: 12,
                      background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, border: '2px solid var(--bg-0)',
                    }}>{c.emoji}</div>
                  </div>
                  {/* Card body */}
                  <div style={{ background: 'var(--bg-2)', padding: '24px 16px 16px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Instrument Serif', serif" }}>{c.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{c.style}</p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                      {[
                        { val: c.followers, lbl: 'Followers' },
                        { val: c.engage, lbl: 'Engage' },
                        { val: c.fotos, lbl: 'Fotos' },
                      ].map(s => (
                        <div key={s.lbl} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{s.val}</div>
                          <div className="font-jet" style={{ fontSize: 8, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* -- Activity Feed -- */}
          <div>
            <div className="font-jet" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 16 }}>
              Actividad Reciente
            </div>
            <div className="flex flex-col gap-2">
              {DEMO_ACTIVITY.map((a, i) => (
                <div key={i} className="card flex items-center gap-3" style={{ padding: '12px 16px' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: a.color,
                  }}>{a.initial}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.char} &middot; {a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
