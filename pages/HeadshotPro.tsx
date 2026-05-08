/**
 * Headshot Pro — Premium app suite, app #1
 *
 * Mood: Atelier (cream + terracotta + clay)
 * Single input (active character) → single output (professional portrait)
 * Cost: 10 credits per generation
 *
 * Design lives at /public/mockup_headshot_pro_mobile_v2.html
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, RefreshCw, Sparkles, Aperture, Download, Edit3, Share2 } from 'lucide-react';
import type { Page } from '../App';
import { useCharacterStore } from '../stores/characterStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, sharePhoto } from '../services/nativeService';

// ─── Types ─────────────────────────────────────

interface Props {
  onNav: (p: Page) => void;
}

type StyleId = 'editorial' | 'corporate' | 'casual' | 'cinematic' | 'beauty' | 'bw';
type BackdropId = 'studio' | 'office' | 'outdoor' | 'abstract';
type ExpressionId = 'neutral' | 'smile' | 'confident' | 'soft';

const STYLE_PRESETS: { id: StyleId; name: string; tagline: string; img: string }[] = [
  { id: 'editorial', name: 'Editorial', tagline: 'Magazine cover', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=85' },
  { id: 'corporate', name: 'Corporativo', tagline: 'LinkedIn pro', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=85' },
  { id: 'casual', name: 'Casual', tagline: 'Natural light', img: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=85' },
  { id: 'cinematic', name: 'Cinematográfico', tagline: 'Drama + grain', img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=85' },
  { id: 'beauty', name: 'Beauty', tagline: 'Skin first', img: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=85' },
  { id: 'bw', name: 'Blanco y negro', tagline: 'Timeless mono', img: 'https://images.unsplash.com/photo-1542140372-de3a3f87a9a4?w=400&q=85' },
];

const STYLE_PROMPTS: Record<StyleId, string> = {
  editorial: 'magazine cover quality, high fashion editorial portrait, sharp focus on eyes, dramatic professional lighting',
  corporate: 'professional corporate headshot, LinkedIn-quality, soft key light + fill, clean and approachable',
  casual: 'natural daylight portrait, candid feel, soft window light, relaxed expression',
  cinematic: 'cinematic portrait, anamorphic lens feel, subtle film grain, dramatic side lighting, shallow depth of field',
  beauty: 'beauty close-up portrait, flawless skin retouch, ring light + soft fill, clean catchlights in eyes',
  bw: 'classic black and white portrait, high contrast monochrome, fine grain, timeless studio feel',
};

const BACKDROPS: { id: BackdropId; name: string; emoji: string }[] = [
  { id: 'studio', name: 'Estudio', emoji: '◐' },
  { id: 'office', name: 'Oficina', emoji: '◧' },
  { id: 'outdoor', name: 'Exterior', emoji: '◔' },
  { id: 'abstract', name: 'Abstracto', emoji: '◇' },
];

const BACKDROP_PROMPTS: Record<BackdropId, string> = {
  studio: 'seamless paper studio backdrop, soft neutral gray, professional studio environment',
  office: 'modern blurred office interior, defocused background with subtle warm tones',
  outdoor: 'natural outdoor setting, soft bokeh greenery, golden hour ambient light',
  abstract: 'minimalist abstract backdrop, soft gradient lighting, editorial fashion magazine feel',
};

const EXPRESSIONS: { id: ExpressionId; name: string }[] = [
  { id: 'neutral', name: 'Neutral' },
  { id: 'smile', name: 'Sonrisa' },
  { id: 'confident', name: 'Segura' },
  { id: 'soft', name: 'Suave' },
];

const EXPRESSION_PROMPTS: Record<ExpressionId, string> = {
  neutral: 'neutral composed expression, mouth closed',
  smile: 'warm subtle smile, genuine and approachable',
  confident: 'confident assertive expression, slight chin lift, direct eye contact',
  soft: 'soft gentle expression, relaxed eyes, calm presence',
};

const COST = 10;

// ─── Helper: URL → File ────────────────────────

async function urlToFile(url: string, filename = 'character.png'): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

// ─── Component ─────────────────────────────────

export default function HeadshotPro({ onNav }: Props) {
  const characters = useCharacterStore(s => s.characters);
  const incrementUsage = useCharacterStore(s => s.incrementUsage);
  const addItems = useGalleryStore(s => s.addItems);
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  // ─── State ───
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleId>('editorial');
  const [selectedBackdrop, setSelectedBackdrop] = useState<BackdropId>('studio');
  const [selectedExpressions, setSelectedExpressions] = useState<Set<ExpressionId>>(new Set(['neutral']));
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Default to first character if none selected
  useEffect(() => {
    if (!selectedCharId && characters.length > 0) {
      setSelectedCharId(characters[0].id);
    }
  }, [characters, selectedCharId]);

  const selectedChar = useMemo(
    () => characters.find(c => c.id === selectedCharId) ?? null,
    [characters, selectedCharId],
  );

  const credits = profile?.creditsRemaining ?? 0;
  const canAfford = credits >= COST;

  // ─── Toggle expression chip ───
  const toggleExpression = (id: ExpressionId) => {
    hapticLight();
    setSelectedExpressions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least one
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ─── Native share ───
  const handleShare = async () => {
    if (!resultUrl) return;
    hapticLight();
    const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle);
    const ok = await sharePhoto({
      url: resultUrl,
      title: 'VIST · Headshot',
      text: `Hecho con VIST · ${stylePreset?.name || 'Headshot Pro'}`,
      filename: `vist-headshot-${Date.now()}.jpg`,
    });
    if (!ok) {
      // Fallback: trigger download
      const a = document.createElement('a');
      a.href = resultUrl;
      a.download = `vist-headshot-${Date.now()}.jpg`;
      a.click();
      toast.info('Descarga iniciada — no hay compartir nativo en este navegador');
    }
  };

  // ─── Generate ───
  const handleGenerate = async () => {
    if (!selectedChar) {
      toast.error('Selecciona un personaje primero');
      hapticError();
      return;
    }
    if (generating) return;
    if (!canAfford) {
      toast.error(`Necesitas ${COST} créditos. Tienes ${credits}.`);
      hapticError();
      onNav('pricing');
      return;
    }
    hapticMedium(); // tactile confirmation that primary CTA fired

    // Reference URLs from character (face + body refs from creation)
    const refUrls = [
      ...(selectedChar.referencePhotoUrls ?? []),
      ...(selectedChar.modelImageUrls ?? []),
    ].filter(u => typeof u === 'string' && u.startsWith('http')).slice(0, 4);

    if (refUrls.length === 0) {
      toast.error('Este personaje no tiene fotos de referencia. Genera al menos una foto canon en Studio.');
      return;
    }

    // Atomic credit deduction
    const ok = await decrementCredits(COST);
    if (!ok) {
      toast.error('Créditos insuficientes');
      return;
    }

    setGenerating(true);
    setProgress(5);
    abortRef.current = new AbortController();

    let resultUrls: string[] = [];

    try {
      // Build instruction JSON for NB2
      const expressions = Array.from(selectedExpressions).map(id => EXPRESSION_PROMPTS[id]).join(', ');
      const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle)!;
      const backdropPreset = BACKDROPS.find(b => b.id === selectedBackdrop)!;

      const instructionSpec = {
        task: 'PROFESSIONAL HEADSHOT — Generate a high-end professional portrait of the person in the reference images.',
        style: {
          name: stylePreset.name,
          description: STYLE_PROMPTS[selectedStyle],
        },
        backdrop: {
          name: backdropPreset.name,
          description: BACKDROP_PROMPTS[selectedBackdrop],
        },
        framing: 'head and shoulders, centered composition, eyes at upper third, looking directly at camera unless soft expression suggests otherwise',
        expression: expressions,
        lighting: 'professional photography lighting, key + fill, soft catchlights in eyes, no harsh shadows on face',
        camera: '85mm portrait lens, f/2.0, shallow depth of field, sharp focus on eyes',
        identity: {
          preserve: ['face features', 'bone structure', 'eye shape and color', 'hair color and texture', 'skin tone', 'distinguishing marks'],
          rule: 'The person must be instantly recognizable as the same individual in the reference images.',
        },
        rules: {
          must_change: ['lighting setup', 'backdrop', 'pose subtly', 'expression as specified'],
          must_preserve: ['identity', 'natural skin texture (no plastic/airbrush look)', 'realistic proportions'],
          render_quality: '8k quality, magazine print resolution, professional retouching only',
          never_add: ['text', 'watermarks', 'logos', 'props not requested'],
        },
      };

      const instruction = JSON.stringify(instructionSpec);

      // Convert first ref to File for NB2 base, rest as references
      const baseFile = await urlToFile(refUrls[0], 'headshot-base.png');
      const refFiles = await Promise.all(
        refUrls.slice(1).map((url, i) => urlToFile(url, `headshot-ref-${i}.png`)),
      );

      setProgress(15);

      // Try NB2 first, fall back to Grok if rejected
      const { editWithNB2Fal, editImageWithGrokFal } = await import('../services/falService');

      try {
        resultUrls = await editWithNB2Fal(
          baseFile,
          instruction,
          refFiles,
          p => setProgress(Math.min(85, 15 + Math.round(p * 0.7))),
          { resolution: '2K' },
          abortRef.current.signal,
        );
        if (!resultUrls || resultUrls.length === 0) throw new Error('NB2 returned empty');
      } catch (nb2Err: any) {
        if (nb2Err?.name === 'AbortError') throw nb2Err;
        console.warn('NB2 rejected, falling back to Grok:', nb2Err?.message);
        toast.info('Reintentando con motor alternativo…');
        resultUrls = await editImageWithGrokFal(
          baseFile,
          instruction,
          p => setProgress(Math.min(85, 15 + Math.round(p * 0.7))),
          abortRef.current.signal,
          refFiles,
        );
        if (!resultUrls || resultUrls.length === 0) throw new Error('Ambos motores fallaron');
      }

      setProgress(90);

      // Safety check (creator mode permite más, standard menos)
      try {
        const { checkImageSafety } = await import('../services/safetyService');
        const mode = profile?.contentMode === 'creator' ? 'creator' : 'standard';
        const safety = await checkImageSafety(resultUrls[0], mode);
        if (!safety.allowed && !safety.error) {
          restoreCredits(COST);
          toast.error('Imagen bloqueada por moderación. Tus créditos se restauraron.');
          setGenerating(false);
          setProgress(0);
          return;
        }
      } catch { /* fail-open */ }

      // Watermark for free tier
      try {
        const { watermarkIfFreeTier } = await import('../services/watermarkService');
        resultUrls[0] = await watermarkIfFreeTier(
          resultUrls[0],
          profile?.subscriptionPlan,
          profile?.subscriptionStatus,
        );
      } catch { /* fail-open */ }

      setProgress(100);

      // Save to gallery
      const url = resultUrls[0];
      addItems([{
        id: crypto.randomUUID(),
        url,
        prompt: `Headshot Pro · ${stylePreset.name} · ${backdropPreset.name}`,
        model: 'nb2-headshot-pro',
        timestamp: Date.now(),
        type: 'create' as const,
        characterId: selectedChar.id,
        tags: ['headshot-pro', selectedStyle, selectedBackdrop],
        source: 'headshot-pro' as any,
      }]);

      incrementUsage(selectedChar.id);
      setResultUrl(url);
      setHistory(prev => [url, ...prev].slice(0, 4));
      toast.success('Headshot generado');
      hapticSuccess();
    } catch (err: any) {
      restoreCredits(COST);
      if (err?.name !== 'AbortError') {
        const msg = String(err?.message || err);
        const isModeration = /ValidationError|content_policy|no_media_generated|safety/i.test(msg);
        toast.error(isModeration
          ? 'Esta combinación fue rechazada. Tus créditos se restauraron — prueba otro estilo.'
          : `Error: ${msg.slice(0, 120)}`);
        hapticError();
        console.error(err);
      }
    } finally {
      setGenerating(false);
      setProgress(0);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  // ─── Empty state — no characters ───
  if (characters.length === 0) {
    return (
      <div className="hp-shell">
        <style>{HEADSHOT_STYLES}</style>
        <div className="hp-topbar">
          <button className="hp-back" onClick={() => onNav('studio')} aria-label="Volver">
            <ChevronLeft size={18} />
          </button>
          <span className="hp-title-mono">
            <span className="hp-title-dot" /> Headshot · Pro
          </span>
          <span className="hp-credits">
            <span className="hp-credits-dot" />{credits}
          </span>
        </div>
        <div className="hp-empty">
          <div className="hp-empty-icon"><Aperture size={28} /></div>
          <h2 className="hp-empty-title">Necesitas un <em>personaje</em> primero</h2>
          <p className="hp-empty-sub">Crea tu modelo virtual antes de tirarle un headshot profesional.</p>
          <button className="hp-empty-cta" onClick={() => onNav('create')}>
            <Sparkles size={14} /> Crear personaje
          </button>
        </div>
      </div>
    );
  }

  // ─── Main ───
  return (
    <div className="hp-shell">
      <style>{HEADSHOT_STYLES}</style>

      {/* Top bar */}
      <div className="hp-topbar">
        <button className="hp-back" onClick={() => onNav('studio')} aria-label="Volver">
          <ChevronLeft size={18} />
        </button>
        <span className="hp-title-mono">
          <span className="hp-title-dot" /> Headshot · Pro
        </span>
        <span className="hp-credits">
          <span className="hp-credits-dot" />{credits}
        </span>
      </div>

      {/* Hero */}
      <section className="hp-hero">
        <div className="hp-hero-eyebrow">App premium · Foundation</div>
        <h1 className="hp-hero-title">
          Retrato profesional,<br /><em>en 30 segundos.</em>
        </h1>
        <p className="hp-hero-sub">
          Editorial, corporativo, beauty. Tu personaje, retocado como portada de revista.
        </p>
      </section>

      {/* Character chip */}
      <div className="hp-char-row">
        {characters.map(c => (
          <button
            key={c.id}
            className={`hp-char-chip ${selectedCharId === c.id ? 'is-active' : ''}`}
            onClick={() => { hapticLight(); setSelectedCharId(c.id); }}
          >
            <span
              className="hp-char-thumb"
              style={{ backgroundImage: c.thumbnail ? `url(${c.thumbnail})` : undefined }}
            />
            <span className="hp-char-name">{c.name}</span>
          </button>
        ))}
      </div>

      {/* Result canvas */}
      <div className="hp-canvas">
        {generating ? (
          <div className="hp-canvas-loading">
            <div className="hp-loader-ring">
              <div className="hp-loader-fill" style={{ height: `${progress}%` }} />
            </div>
            <div className="hp-loader-pct">{progress}%</div>
            <div className="hp-loader-label">Componiendo retrato</div>
            <button className="hp-cancel-btn" onClick={handleCancel}>Cancelar</button>
          </div>
        ) : resultUrl ? (
          <>
            <img src={resultUrl} alt="Headshot generado" className="hp-canvas-img" />
            <div className="hp-canvas-actions">
              <button className="hp-canvas-btn" onClick={() => { hapticLight(); onNav('editor'); }}>
                <Edit3 size={14} /> Editar
              </button>
              <a
                href={resultUrl}
                download={`headshot-${Date.now()}.png`}
                className="hp-canvas-btn"
                onClick={() => hapticLight()}
              >
                <Download size={14} /> Bajar
              </a>
              <button className="hp-canvas-btn hp-canvas-btn-prim" onClick={handleShare}>
                <Share2 size={14} /> Compartir
              </button>
            </div>
          </>
        ) : (
          <div className="hp-canvas-empty">
            <div className="hp-canvas-empty-frame">
              <Aperture size={32} />
            </div>
            <p>Tu retrato aparecerá aquí</p>
          </div>
        )}
      </div>

      {/* History strip */}
      {history.length > 0 && (
        <div className="hp-history">
          {history.map((url, i) => (
            <button
              key={url + i}
              className={`hp-history-thumb ${url === resultUrl ? 'is-active' : ''}`}
              onClick={() => setResultUrl(url)}
              style={{ backgroundImage: `url(${url})` }}
              aria-label={`Resultado ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Style presets */}
      <section className="hp-section">
        <div className="hp-section-head">
          <span className="hp-field-num">01</span>
          <h3 className="hp-section-title">Estilo de <em>retrato</em></h3>
        </div>
        <div className="hp-style-grid">
          {STYLE_PRESETS.map(s => (
            <button
              key={s.id}
              className={`hp-style-card ${selectedStyle === s.id ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setSelectedStyle(s.id); }}
            >
              <div className="hp-style-img" style={{ backgroundImage: `url(${s.img})` }} />
              <div className="hp-style-overlay">
                <div className="hp-style-name">{s.name}</div>
                <div className="hp-style-meta">{s.tagline}</div>
              </div>
              {selectedStyle === s.id && (
                <div className="hp-style-check">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFCF5" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Backdrop */}
      <section className="hp-section">
        <div className="hp-section-head">
          <span className="hp-field-num">02</span>
          <h3 className="hp-section-title"><em>Fondo</em></h3>
        </div>
        <div className="hp-chip-row">
          {BACKDROPS.map(b => (
            <button
              key={b.id}
              className={`hp-chip ${selectedBackdrop === b.id ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setSelectedBackdrop(b.id); }}
            >
              <span className="hp-chip-icon">{b.emoji}</span>
              {b.name}
            </button>
          ))}
        </div>
      </section>

      {/* Expression */}
      <section className="hp-section">
        <div className="hp-section-head">
          <span className="hp-field-num">03</span>
          <h3 className="hp-section-title"><em>Expresión</em></h3>
          <span className="hp-section-hint">Multi-select</span>
        </div>
        <div className="hp-chip-row">
          {EXPRESSIONS.map(e => (
            <button
              key={e.id}
              className={`hp-chip ${selectedExpressions.has(e.id) ? 'is-active' : ''}`}
              onClick={() => toggleExpression(e.id)}
            >
              {e.name}
            </button>
          ))}
        </div>
      </section>

      {/* Floating CTA */}
      <div className="hp-cta-wrap">
        <div className="hp-cta-row">
          <button
            className="hp-cta-secondary"
            onClick={() => { setResultUrl(null); setHistory([]); }}
            aria-label="Reset"
            disabled={generating}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="hp-cta-primary"
            onClick={handleGenerate}
            disabled={generating || !canAfford}
          >
            <span className="hp-cta-cost">{COST} cr · 1 retrato</span>
            <span className="hp-cta-label">{generating ? 'Generando…' : resultUrl ? 'Generar otro' : 'Generar retrato'}</span>
            <span className="hp-cta-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────

const HEADSHOT_STYLES = `
.hp-shell {
  --bg-0: #F4EDE0;
  --bg-1: #FAF6EE;
  --bg-card: #FFFCF5;
  --paper: #F2E8D2;
  --ink-0: #1F1A14;
  --ink-1: #3D332A;
  --ink-2: #6F5E4C;
  --ink-3: #A8957D;
  --line: rgba(31, 26, 20, 0.10);
  --line-soft: rgba(31, 26, 20, 0.05);
  --accent: #C9785C;
  --accent-deep: #8E5640;
  --gold: #D4A85F;
  --ease: cubic-bezier(0.32, 0.72, 0, 1);

  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-0);
  color: var(--ink-0);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 110px;
  background-image:
    radial-gradient(circle at 20% 10%, rgba(31,26,20,0.025) 1px, transparent 1px),
    radial-gradient(circle at 80% 60%, rgba(31,26,20,0.02) 1px, transparent 1px);
  background-size: 28px 28px, 44px 44px;
  position: relative;
}

/* Top bar */
.hp-shell .hp-topbar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 10px;
  background: linear-gradient(180deg, var(--bg-0) 0%, var(--bg-0) 80%, transparent 100%);
  backdrop-filter: blur(8px);
}
.hp-shell .hp-back {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--ink-1);
  transition: transform 0.3s var(--ease);
}
.hp-shell .hp-back:active { transform: scale(0.92); }
.hp-shell .hp-title-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-2);
  display: flex; align-items: center; gap: 8px;
}
.hp-shell .hp-title-dot {
  width: 6px; height: 6px;
  background: var(--accent);
  border-radius: 50%;
}
.hp-shell .hp-credits {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 11px;
  background: var(--bg-card);
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--ink-0); font-weight: 500;
}
.hp-shell .hp-credits-dot { width: 5px; height: 5px; background: var(--gold); border-radius: 50%; }

/* Hero */
.hp-shell .hp-hero { padding: 6px 20px 0; }
.hp-shell .hp-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-3);
  margin-bottom: 8px;
}
.hp-shell .hp-hero-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 40px; line-height: 0.95;
  letter-spacing: -0.02em; color: var(--ink-0);
  font-weight: 400;
}
.hp-shell .hp-hero-title em { font-style: italic; color: var(--accent); }
.hp-shell .hp-hero-sub {
  margin-top: 12px; font-size: 13px; line-height: 1.55;
  color: var(--ink-2); max-width: 320px;
}

/* Character chip row */
.hp-shell .hp-char-row {
  display: flex; gap: 8px;
  margin: 18px 20px 0;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.hp-shell .hp-char-row::-webkit-scrollbar { display: none; }
.hp-shell .hp-char-chip {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 6px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.3s var(--ease);
  font-family: inherit;
}
.hp-shell .hp-char-chip.is-active {
  background: var(--ink-0);
  border-color: var(--ink-0);
}
.hp-shell .hp-char-chip.is-active .hp-char-name { color: var(--bg-card); }
.hp-shell .hp-char-thumb {
  width: 26px; height: 26px;
  border-radius: 50%;
  background-color: var(--paper);
  background-size: cover; background-position: center;
  flex-shrink: 0;
}
.hp-shell .hp-char-name {
  font-size: 12px; font-weight: 500;
  color: var(--ink-1);
}

/* Canvas */
.hp-shell .hp-canvas {
  margin: 18px 20px 0;
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--line);
  aspect-ratio: 4/5;
  box-shadow: 0 16px 32px -16px rgba(31, 26, 20, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hp-shell .hp-canvas-img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.hp-shell .hp-canvas-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px;
  color: var(--ink-3);
  font-size: 13px;
  text-align: center;
}
.hp-shell .hp-canvas-empty-frame {
  width: 88px; height: 88px;
  border-radius: 50%;
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  border: 1.5px dashed var(--line);
}
.hp-shell .hp-canvas-loading {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px;
}
.hp-shell .hp-loader-ring {
  width: 88px; height: 88px;
  border-radius: 50%;
  background: var(--paper);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
}
.hp-shell .hp-loader-fill {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%);
  transition: height 0.4s var(--ease);
}
.hp-shell .hp-loader-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px; font-weight: 600;
  color: var(--accent-deep);
}
.hp-shell .hp-loader-label {
  font-size: 12px; color: var(--ink-2);
}
.hp-shell .hp-cancel-btn {
  margin-top: 4px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 11px;
  color: var(--ink-2);
  cursor: pointer;
  font-family: inherit;
}
.hp-shell .hp-canvas-actions {
  position: absolute;
  bottom: 12px; left: 12px; right: 12px;
  display: flex; gap: 6px;
  justify-content: center;
}
.hp-shell .hp-canvas-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 252, 245, 0.94);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 11px; font-weight: 500;
  color: var(--ink-0); text-decoration: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s var(--ease);
}
.hp-shell .hp-canvas-btn:active { transform: scale(0.96); }
.hp-shell .hp-canvas-btn-prim {
  background: var(--ink-0);
  color: var(--bg-card);
  border-color: var(--ink-0);
}

/* History */
.hp-shell .hp-history {
  display: flex; gap: 6px;
  margin: 10px 20px 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.hp-shell .hp-history::-webkit-scrollbar { display: none; }
.hp-shell .hp-history-thumb {
  flex-shrink: 0;
  width: 56px; height: 56px;
  border-radius: 10px;
  background-size: cover; background-position: center;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.3s var(--ease);
}
.hp-shell .hp-history-thumb:active { transform: scale(0.94); }
.hp-shell .hp-history-thumb.is-active { border-color: var(--accent); }

/* Section */
.hp-shell .hp-section { padding: 24px 20px 0; }
.hp-shell .hp-section-head {
  display: flex; align-items: baseline; gap: 10px;
  margin-bottom: 12px;
}
.hp-shell .hp-field-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; color: var(--accent-deep);
  font-weight: 500; letter-spacing: 0.1em;
}
.hp-shell .hp-section-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px; line-height: 1;
  letter-spacing: -0.01em; color: var(--ink-0);
  font-weight: 400; margin: 0;
}
.hp-shell .hp-section-title em { font-style: italic; }
.hp-shell .hp-section-hint {
  font-size: 11px; color: var(--ink-3);
  font-style: italic;
  margin-left: auto;
}

/* Style grid */
.hp-shell .hp-style-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.hp-shell .hp-style-card {
  position: relative;
  aspect-ratio: 4/5;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  background: #2A1F18;
  border: 2px solid transparent;
  transition: transform 0.3s var(--ease);
  font-family: inherit;
  padding: 0;
}
.hp-shell .hp-style-card:active { transform: scale(0.96); }
.hp-shell .hp-style-card.is-active { border-color: var(--accent); }
.hp-shell .hp-style-img {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
}
.hp-shell .hp-style-card::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.85) 100%);
}
.hp-shell .hp-style-overlay {
  position: absolute; left: 12px; right: 12px; bottom: 10px;
  z-index: 2;
  color: #FFFCF5;
  text-align: left;
}
.hp-shell .hp-style-name {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 16px; font-style: italic;
  letter-spacing: -0.01em;
}
.hp-shell .hp-style-meta {
  margin-top: 2px;
  font-size: 10px; opacity: 0.78;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hp-shell .hp-style-check {
  position: absolute;
  top: 10px; right: 10px;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  z-index: 2;
}

/* Chips */
.hp-shell .hp-chip-row {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.hp-shell .hp-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 12px; font-weight: 500;
  color: var(--ink-1);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s var(--ease);
}
.hp-shell .hp-chip.is-active {
  background: var(--ink-0);
  border-color: var(--ink-0);
  color: var(--bg-card);
}
.hp-shell .hp-chip-icon {
  font-size: 13px;
  line-height: 1;
}

/* CTA */
.hp-shell .hp-cta-wrap {
  position: fixed;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  padding: 14px 20px calc(20px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent 0%, var(--bg-0) 30%);
  z-index: 40;
  pointer-events: none;
}
.hp-shell .hp-cta-row {
  display: flex; gap: 10px;
  pointer-events: auto;
}
.hp-shell .hp-cta-secondary {
  width: 50px; height: 56px;
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-1);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s var(--ease);
}
.hp-shell .hp-cta-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
.hp-shell .hp-cta-secondary:not(:disabled):active {
  transform: scale(0.94);
  border-color: var(--accent);
  color: var(--accent-deep);
}
.hp-shell .hp-cta-primary {
  flex: 1;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);
  color: #FFFCF5;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px; font-weight: 600;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s var(--ease);
  box-shadow: 0 10px 24px -8px rgba(142, 86, 64, 0.5);
}
.hp-shell .hp-cta-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}
.hp-shell .hp-cta-primary:not(:disabled):active { transform: scale(0.98); }
.hp-shell .hp-cta-primary::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: hp-shimmer 3s var(--ease) infinite;
}
.hp-shell .hp-cta-primary:disabled::before { animation: none; }
@keyframes hp-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.hp-shell .hp-cta-cost {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.18em;
  opacity: 0.78; text-transform: uppercase;
}
.hp-shell .hp-cta-label {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px; font-style: italic;
}
.hp-shell .hp-cta-arrow {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.18);
  display: flex; align-items: center; justify-content: center;
}

/* Empty state */
.hp-shell .hp-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 60px 32px;
  gap: 14px;
}
.hp-shell .hp-empty-icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1.5px dashed var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  margin-bottom: 4px;
}
.hp-shell .hp-empty-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 28px; line-height: 1.05;
  color: var(--ink-0); font-weight: 400;
  margin: 0;
}
.hp-shell .hp-empty-title em { font-style: italic; color: var(--accent); }
.hp-shell .hp-empty-sub {
  font-size: 13px; color: var(--ink-2);
  max-width: 280px; line-height: 1.5;
  margin: 0;
}
.hp-shell .hp-empty-cta {
  margin-top: 8px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);
  color: #FFFCF5;
  border: none;
  border-radius: 999px;
  font-size: 13px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 8px 18px -8px rgba(142, 86, 64, 0.5);
}
`;
