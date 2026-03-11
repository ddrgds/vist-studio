import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useSubscription } from '../hooks/useSubscription';

/* ── helpers ─────────────────────────────────── */

const GRADIENTS = [
  'linear-gradient(135deg, var(--accent), var(--magenta))',
  'linear-gradient(135deg, var(--blue), var(--mint))',
  'linear-gradient(135deg, var(--magenta), var(--accent))',
];

const ACTION_COLORS: Record<string, string> = {
  create: 'var(--accent)',
  edit: 'var(--magenta)',
  session: 'var(--blue)',
  video: 'var(--mint)',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Creaci\u00f3n',
  edit: 'Edici\u00f3n IA',
  session: 'Sesi\u00f3n de Fotos',
  video: 'Video',
};

/** Human-readable relative time */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

const QUICK_ACTIONS = [
  { icon: '\u2295', title: 'Subir Personaje', desc: 'Crear o importar', path: '/studio?tool=create', color: 'var(--accent)' },
  { icon: '\u25ce', title: 'Sesi\u00f3n de Fotos', desc: 'Escenarios y poses', path: '/studio?tool=session', color: 'var(--magenta)' },
  { icon: '\u2726', title: 'Editor IA', desc: 'Relight, swap, 360', path: '/studio', color: 'var(--blue)' },
  { icon: '\u27f2', title: 'Face Swap', desc: 'Cambiar rostros', path: '/studio?tool=faceswap', color: 'var(--accent)' },
  { icon: '\ud83d\udc57', title: 'Try-On Virtual', desc: 'Probar outfits', path: '/studio', color: 'var(--magenta)' },
  { icon: '\u25a6', title: 'Galer\u00eda', desc: 'Ver creaciones', path: '/gallery', color: 'var(--blue)' },
];

/* ── component ───────────────────────────────── */

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { characters } = useCharacterStore();
  const { items: galleryItems } = useGalleryStore();
  const sub = useSubscription();

  /* ── Stats computed from real stores ─────── */
  const stats = useMemo(() => {
    const byType = { create: 0, edit: 0, session: 0, video: 0 };
    for (const item of galleryItems) {
      if (item.type in byType) byType[item.type as keyof typeof byType]++;
    }
    return [
      { label: 'PERSONAJES', value: characters.length, color: 'var(--accent)' },
      { label: 'CREACIONES', value: byType.create, color: 'var(--magenta)' },
      { label: 'EDICIONES IA', value: byType.edit, color: 'var(--blue)' },
      { label: 'SESIONES', value: byType.session, color: 'var(--mint)' },
      { label: 'VIDEOS', value: byType.video, color: 'var(--rose)' },
    ];
  }, [galleryItems, characters.length]);

  /* ── Activity derived from recent gallery items ─── */
  const recentActivity = useMemo(() => {
    const charMap = new Map(characters.map(c => [c.id, c.name]));
    return galleryItems
      .slice(0, 8)
      .map(item => ({
        initial: (charMap.get(item.characterId ?? '') ?? item.type)?.[0]?.toUpperCase() ?? '\u2726',
        color: ACTION_COLORS[item.type] ?? 'var(--accent)',
        action: ACTION_LABELS[item.type] ?? item.type,
        char: charMap.get(item.characterId ?? '') ?? '',
        time: timeAgo(item.timestamp),
      }));
  }, [galleryItems, characters]);

  /* ── Character cards ─── */
  const displayChars = characters.slice(0, 3).map((c, i) => ({
    name: c.name,
    style: c.characteristics || c.accessory || '',
    emoji: '\u2726',
    status: 'active' as const,
    gradient: GRADIENTS[i % 3],
    uses: c.usageCount || 0,
    fotos: c.modelImageBlobs?.length || 0,
    created: timeAgo(c.createdAt),
  }));

  /* ── Empty state flag ─── */
  const isEmpty = characters.length === 0 && galleryItems.length === 0;

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
          {stats.map(s => (
            <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
              <div className="font-jet" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* -- Quick Actions -- */}
        <div className="mb-8">
          <div className="font-jet" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 16 }}>
            Acciones R\u00e1pidas
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

            {displayChars.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayChars.map((c, i) => (
                  <div
                    key={characters[i]?.id ?? i}
                    className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                    style={{ border: '1px solid var(--border)' }}
                    onClick={() => navigate(`/studio?character=${characters[i].id}`)}
                  >
                    {/* Gradient header */}
                    <div style={{ background: c.gradient, height: 120, position: 'relative' }}>
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        padding: '2px 8px', borderRadius: 6,
                        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                        background: 'rgba(80,216,160,0.2)',
                        color: 'var(--mint)',
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
                          { val: c.uses, lbl: 'Usos' },
                          { val: c.fotos, lbl: 'Fotos' },
                          { val: c.created, lbl: 'Creado' },
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
            ) : (
              /* Empty state */
              <div
                className="card flex flex-col items-center justify-center cursor-pointer"
                style={{ padding: '48px 24px', textAlign: 'center' }}
                onClick={() => navigate('/studio?tool=create')}
              >
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>{'\u2726'}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Crea tu primer personaje</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sube fotos o genera uno desde cero con IA</div>
              </div>
            )}
          </div>

          {/* -- Activity Feed -- */}
          <div>
            <div className="font-jet" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 16 }}>
              Actividad Reciente
            </div>
            <div className="flex flex-col gap-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((a, i) => (
                  <div key={i} className="card flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: a.color,
                    }}>{a.initial}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.action}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.char ? `${a.char} \u00b7 ` : ''}{a.time}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    Tu actividad aparecer\u00e1 aqu\u00ed
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
