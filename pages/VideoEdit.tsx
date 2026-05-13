/**
 * VideoEdit — Modify an existing video via natural-language prompt.
 * Powered by Happy Horse video-edit (Alibaba) on fal.ai.
 *
 *   Concept: the user picks a video (from their gallery of past
 *   Reels/Recasts, uploads one, or records on the spot) and describes
 *   what to change — "cambia el fondo a una playa", "recolorea la
 *   lencería a roja", "agrega lluvia". Happy Horse re-renders the video
 *   keeping motion intact and applying the requested edit.
 *
 *   Optional: up to 5 reference images can be attached and referenced
 *   in the prompt as @Image1, @Image2, etc. ("cambia su outfit por
 *   @Image1").
 *
 *   Phases:
 *     1. pick-video    — record / upload / pick from gallery
 *     2. describe-edit — prompt + templates + optional refs
 *     3. generating    — fullscreen loader with queue + log tail
 *     4. result        — video player + share / save / regenerate
 *
 * Mood: warm sand + amber accent (consistent with the rest of the
 * mobile suite; amber differentiates from Recast clay and Reels rosé).
 *
 * Cost: Happy Horse video-edit ~$0.50 / clip at 1080p → 145 cr fixed.
 * Source video can be 3-60s, max 100 MB.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Upload, Camera, Play, Pause, Share2,
  RefreshCw, ChevronRight, ArrowLeft, Wand2, Sparkles, Plus, X, Image as ImageIcon,
} from 'lucide-react';
import type { Page } from '../App';
import { useGalleryStore } from '../stores/galleryStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, sharePhoto } from '../services/nativeService';
import { AppTopBar, urlToFile, ensureValidImageFile, type AppMood } from '../components/apps/_shared';
import { editVideoWithHappyHorse, type VideoProgress } from '../services/falVideoService';
import { useColorScheme } from '../hooks/useColorScheme';

const LIGHT_MOOD: AppMood = {
  bg0:        '#F5E8D4',
  bgCard:     '#FFFAEC',
  paper:      '#F3DEB5',
  ink0:       '#1F1A14',
  ink1:       '#3D332A',
  ink2:       '#6F5E4C',
  ink3:       '#A8957D',
  line:       'rgba(31,26,20,0.10)',
  accent:     '#9C6D2A',
  accentDeep: '#6B4A1C',
  gold:       '#E8A04C',
};

const DARK_MOOD: AppMood = {
  bg0:        '#181410',
  bgCard:     '#221C18',
  paper:      '#2C241F',
  ink0:       '#F8EFE5',
  ink1:       '#E0D0BD',
  ink2:       '#A0907A',
  ink3:       '#705F4F',
  line:       'rgba(255,239,229,0.10)',
  accent:     '#D9A458',
  accentDeep: '#A87930',
  gold:       '#E8B070',
};

interface Props {
  onNav: (p: Page) => void;
}

type Phase = 'pick-video' | 'describe-edit' | 'generating' | 'result';

const MAX_DURATION_S = 60;
const MAX_VIDEO_MB = 100;
const COST = 145;

interface EditTemplate {
  id: string;
  icon: string;
  label: string;
  prompt: string;
}

const TEMPLATES: EditTemplate[] = [
  { id: 'sunset-bg',    icon: '🌅', label: 'Fondo atardecer',
    prompt: 'reemplaza el fondo por una playa al atardecer con cielo dorado' },
  { id: 'neon-bg',      icon: '🌌', label: 'Iluminación neón',
    prompt: 'cambia la iluminación a neón cyberpunk con tonos rosa y violeta' },
  { id: 'studio-bg',    icon: '⚪', label: 'Estudio blanco',
    prompt: 'reemplaza el fondo por un fondo blanco infinito de estudio fotográfico' },
  { id: 'rain',         icon: '🌧️', label: 'Agregar lluvia',
    prompt: 'agrega lluvia suave cayendo y gotas en el aire, mantiene la atmósfera natural' },
  { id: 'red-lingerie', icon: '❤️', label: 'Outfit rojo',
    prompt: 'cambia el color del outfit a rojo intenso' },
  { id: 'black-lingerie', icon: '🖤', label: 'Outfit negro',
    prompt: 'cambia el color del outfit a negro mate' },
  { id: 'vhs-filter',   icon: '📼', label: 'Filtro VHS',
    prompt: 'aplica filtro VHS retro de los 90s con scanlines suaves y saturación reducida' },
  { id: 'film-grain',   icon: '🎞️', label: 'Grano de película',
    prompt: 'agrega grano de película 35mm y toque cinematográfico cálido' },
  { id: 'bw',           icon: '🎭', label: 'Blanco y negro',
    prompt: 'convierte a blanco y negro con alto contraste editorial' },
  { id: 'forest-bg',    icon: '🌲', label: 'Bosque misterioso',
    prompt: 'reemplaza el fondo por un bosque brumoso con luz natural filtrada' },
  { id: 'club',         icon: '💫', label: 'Discoteca',
    prompt: 'reemplaza el fondo por una discoteca con luces de colores y humo' },
  { id: 'lipstick-red', icon: '💋', label: 'Labios rojos',
    prompt: 'cambia el color de los labios a rojo intenso mate' },
];

export default function VideoEdit({ onNav }: Props) {
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const galleryItems = useGalleryStore(s => s.items);
  const addItems = useGalleryStore(s => s.addItems);
  const toast = useToast();

  const scheme = useColorScheme();
  const MOOD = scheme === 'dark' ? DARK_MOOD : LIGHT_MOOD;

  const credits = profile?.creditsRemaining ?? 0;

  // ─── Phase ──────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('pick-video');

  // Source video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Edit prompt + refs
  const [prompt, setPrompt] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);

  // Generation
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Video playback
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const resultVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Hidden file inputs
  const recordInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const refImgInputRef = useRef<HTMLInputElement>(null);

  // Past video generations from the gallery (Reels + Recast)
  const galleryVideos = React.useMemo(
    () => galleryItems.filter(item => item.type === 'video').slice(0, 20),
    [galleryItems],
  );

  // ─── Cost (fixed for Happy Horse) ────────────────
  const cost = COST;

  // ─── Pick template helper ────────────────────────
  const pickTemplate = (t: EditTemplate) => {
    hapticLight();
    setTemplateId(t.id);
    setPrompt(t.prompt);
  };

  // ─── Source video handlers ───────────────────────
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Solo videos (MP4, MOV)');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Máximo ${MAX_VIDEO_MB} MB`);
      return;
    }
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = url;
    v.onloadedmetadata = () => {
      const dur = v.duration;
      if (!isFinite(dur) || dur === 0) {
        toast.error('No se pudo leer el video');
        URL.revokeObjectURL(url);
        return;
      }
      if (dur > MAX_DURATION_S) {
        toast.error(`Máximo ${MAX_DURATION_S}s. Tu video dura ${Math.round(dur)}s.`);
        URL.revokeObjectURL(url);
        return;
      }
      setVideoFile(file);
      setVideoUrl(url);
      setVideoDuration(dur);
      hapticLight();
      setTimeout(() => setPhase('describe-edit'), 200);
    };
    v.onerror = () => {
      toast.error('Video corrupto o formato no soportado');
      URL.revokeObjectURL(url);
    };
  };

  const pickGalleryVideo = async (galleryUrl: string) => {
    try {
      hapticLight();
      const file = await urlToFile(galleryUrl, `gallery-video-${Date.now()}.mp4`);
      // Read duration
      const localUrl = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.src = localUrl;
      v.onloadedmetadata = () => {
        const dur = v.duration;
        if (!isFinite(dur) || dur === 0) {
          toast.error('No se pudo leer el video');
          URL.revokeObjectURL(localUrl);
          return;
        }
        setVideoFile(file);
        setVideoUrl(localUrl);
        setVideoDuration(dur);
        setPhase('describe-edit');
      };
      v.onerror = () => {
        toast.error('No se pudo cargar el video de la galería');
        URL.revokeObjectURL(localUrl);
      };
    } catch (err: any) {
      console.error('[VideoEdit] gallery pick error:', err);
      toast.error('No se pudo cargar el video');
    }
  };

  // ─── Reference image handlers ───────────────────
  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    e.target.value = '';
    if (!raw) return;
    if (refFiles.length >= 5) {
      toast.error('Máximo 5 referencias');
      return;
    }
    try {
      const file = await ensureValidImageFile(raw);
      const reader = new FileReader();
      reader.onload = () => {
        setRefFiles(prev => [...prev, file]);
        setRefPreviews(prev => [...prev, reader.result as string]);
        hapticLight();
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('[VideoEdit] ref upload error:', err);
      toast.error(`Imagen inválida: ${String(err?.message ?? err).slice(0, 80)}`);
    }
  };

  const removeRef = (idx: number) => {
    hapticLight();
    setRefFiles(prev => prev.filter((_, i) => i !== idx));
    setRefPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Generate ────────────────────────────────────
  const handleGenerate = async () => {
    if (!videoFile) {
      toast.error('Falta el video fuente');
      return;
    }
    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      toast.error('Escribe qué quieres cambiar');
      return;
    }
    if (credits < cost) {
      toast.error(`Te faltan ${cost - credits} créditos`);
      return;
    }

    const ok = await decrementCredits(cost);
    if (!ok) {
      toast.error('No se pudieron descontar los créditos');
      return;
    }

    abortRef.current = new AbortController();
    setProgress({ status: 'IN_QUEUE' });
    setPhase('generating');
    hapticMedium();

    try {
      const result = await editVideoWithHappyHorse(
        {
          sourceVideo: videoFile,
          prompt: finalPrompt,
          referenceImages: refFiles,
          resolution: '1080p',
          audioSetting: 'auto',
          enableSafetyChecker: false,
          abortSignal: abortRef.current.signal,
        },
        prog => setProgress(prog),
      );

      if (!result.videoUrl) throw new Error('Happy Horse no devolvió URL del video');

      setResultUrl(result.videoUrl);
      setPhase('result');
      hapticSuccess();
      toast.success('Edición lista');

      addItems([{
        id: crypto.randomUUID(),
        url: result.videoUrl,
        type: 'video',
        model: 'happy-horse-video-edit',
        timestamp: Date.now(),
        prompt: `Editar · ${finalPrompt.slice(0, 80)}`,
      }]);
    } catch (err: any) {
      const body = err?.body ?? err?.response?.body;
      const detail = body?.detail || body?.message || err?.message || String(err);
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      if (msg.toLowerCase().includes('abort')) {
        toast.info('Generación cancelada');
      } else {
        console.error('[VideoEdit] generation error:', err, 'body:', body);
        toast.error(`No se pudo editar: ${msg.slice(0, 120)}`);
        hapticError();
      }
      restoreCredits(cost);
      setPhase('describe-edit');
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      hapticLight();
    }
  };

  // ─── Reset / restart ────────────────────────────
  const resetAll = () => {
    if (videoUrl?.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setVideoDuration(0);
    setPrompt('');
    setTemplateId(null);
    setRefFiles([]);
    setRefPreviews([]);
    setResultUrl(null);
    setPhase('pick-video');
    hapticLight();
  };

  // ─── Result actions ─────────────────────────────
  const togglePlay = (target: 'preview' | 'result') => {
    const v = target === 'preview' ? previewVideoRef.current : resultVideoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
    hapticLight();
  };

  const shareResult = async () => {
    if (!resultUrl) return;
    hapticLight();
    try {
      const ok = await sharePhoto({
        url: resultUrl,
        filename: `vist-videoedit-${Date.now()}.mp4`,
        title: 'Mi edición',
        text: 'Hecho con VIST',
      });
      if (!ok) {
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `vist-videoedit-${Date.now()}.mp4`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.click();
      }
    } catch {
      toast.error('No se pudo compartir');
    }
  };

  const regenerate = () => {
    setResultUrl(null);
    setPhase('describe-edit');
    hapticLight();
  };

  useEffect(() => () => {
    if (videoUrl?.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  // ═══════════════════════════════════════════════
  // PHASE 1 — pick source video
  // ═══════════════════════════════════════════════
  if (phase === 'pick-video') {
    return (
      <div className="ve-shell">
        <style>{veStyles(MOOD)}</style>
        <AppTopBar
          mood={MOOD}
          title="Editar · Video"
          credits={credits}
          onBack={() => onNav('home' as Page)}
        />

        <section className="ve-hero">
          <div className="ve-hero-eyebrow">Video · edit</div>
          <h1 className="ve-hero-title">
            Cambia lo que sea<br />
            <em>de tu video</em>.
          </h1>
          <p className="ve-hero-sub">
            Recolorea, cambia fondos, ajusta el outfit, agrega efectos. Sube un video y describe qué quieres cambiar — la acción y el movimiento se mantienen.
          </p>
        </section>

        <section className="ve-section">
          <div className="ve-section-head">
            <span className="ve-eyebrow">Paso 1 · El video</span>
            <small>Máx {MAX_DURATION_S}s · MP4 / MOV</small>
          </div>

          <div className="ve-pick-cards">
            <button
              className="ve-pick-card ve-pick-primary"
              onClick={() => { hapticLight(); recordInputRef.current?.click(); }}
            >
              <div className="ve-pick-icon"><Camera size={22} /></div>
              <div className="ve-pick-info">
                <strong>Grabar ahora</strong>
                <small>Cámara frontal de tu teléfono</small>
              </div>
              <ChevronRight size={16} className="ve-pick-arrow" />
            </button>

            <button
              className="ve-pick-card"
              onClick={() => { hapticLight(); uploadInputRef.current?.click(); }}
            >
              <div className="ve-pick-icon"><Upload size={22} /></div>
              <div className="ve-pick-info">
                <strong>Subir desde galería</strong>
                <small>Cualquier video del teléfono</small>
              </div>
              <ChevronRight size={16} className="ve-pick-arrow" />
            </button>
          </div>
        </section>

        {galleryVideos.length > 0 && (
          <section className="ve-section">
            <div className="ve-section-head">
              <span className="ve-eyebrow">O elige uno tuyo</span>
              <small>De tus Reels y Recasts</small>
            </div>
            <div className="ve-gallery-strip">
              {galleryVideos.map(item => (
                <button
                  key={item.id}
                  className="ve-gallery-card"
                  onClick={() => pickGalleryVideo(item.url)}
                >
                  <video src={item.url} muted playsInline preload="metadata" />
                </button>
              ))}
            </div>
          </section>
        )}

        <input ref={recordInputRef} type="file" accept="video/*" capture="user" style={{ display: 'none' }} onChange={handleVideoSelect} />
        <input ref={uploadInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoSelect} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 2 — describe edit
  // ═══════════════════════════════════════════════
  if (phase === 'describe-edit' && videoUrl) {
    return (
      <div className="ve-shell">
        <style>{veStyles(MOOD)}</style>
        <AppTopBar
          mood={MOOD}
          title="Editar · Video"
          credits={credits}
          onBack={resetAll}
        />

        <section className="ve-preview-stage">
          <video
            ref={previewVideoRef}
            className="ve-preview-video"
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            onClick={() => togglePlay('preview')}
          />
          <button className="ve-preview-swap" onClick={() => { hapticLight(); resetAll(); }}>
            <RefreshCw size={11} />
            Cambiar
          </button>
        </section>

        <section className="ve-section">
          <div className="ve-section-head">
            <span className="ve-eyebrow">Paso 2 · La edición</span>
            <small>Toca un preset, o escribe el cambio</small>
          </div>

          <div className="ve-tpl-scroll">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                className={`ve-tpl-card ${templateId === t.id ? 've-tpl-on' : ''}`}
                onClick={() => pickTemplate(t)}
              >
                <span className="ve-tpl-icon">{t.icon}</span>
                <span className="ve-tpl-label">{t.label}</span>
              </button>
            ))}
          </div>

          <textarea
            className="ve-prompt"
            placeholder="Ej: cambia el fondo por una playa al atardecer, su outfit a rojo, agrega lluvia suave…"
            value={prompt}
            onChange={e => { setPrompt(e.target.value); setTemplateId(null); }}
            rows={3}
            maxLength={400}
          />

          <div className="ve-refs">
            <div className="ve-refs-head">
              <span>Referencias (opcional)</span>
              <small>Si subes fotos, úsalas en el prompt como @Image1, @Image2…</small>
            </div>
            <div className="ve-refs-row">
              {refPreviews.map((url, i) => (
                <div key={i} className="ve-ref-card">
                  <img src={url} alt={`ref-${i + 1}`} />
                  <span className="ve-ref-tag">@Image{i + 1}</span>
                  <button className="ve-ref-del" onClick={() => removeRef(i)} aria-label="Quitar">
                    <X size={11} />
                  </button>
                </div>
              ))}
              {refFiles.length < 5 && (
                <button
                  className="ve-ref-add"
                  onClick={() => { hapticLight(); refImgInputRef.current?.click(); }}
                >
                  <Plus size={16} />
                  <small>Agregar</small>
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="ve-cta-bar">
          <div className="ve-cta-cost">
            <strong>{cost} cr</strong>
            <small>1080p · audio auto</small>
          </div>
          <button
            className="ve-cta-go"
            onClick={handleGenerate}
            disabled={credits < cost || !prompt.trim()}
          >
            <Wand2 size={14} />
            Editar video
          </button>
        </div>

        <input ref={refImgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleRefUpload} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 3 — generating
  // ═══════════════════════════════════════════════
  if (phase === 'generating') {
    return (
      <div className="ve-shell">
        <style>{veStyles(MOOD)}</style>
        <div className="ve-gen-shell">
          <div className="ve-gen-orb">
            <Sparkles size={28} />
          </div>
          <h2 className="ve-gen-title">Editando tu video</h2>
          <p className="ve-gen-sub">
            {progress?.status === 'IN_QUEUE'
              ? `En cola${progress.queuePosition ? ` · posición ${progress.queuePosition}` : ''}…`
              : 'Happy Horse está procesando…'}
          </p>

          {progress?.logs && progress.logs.length > 0 && (
            <div className="ve-gen-logs">
              {progress.logs.slice(-3).map((log, i) => (
                <small key={i}>{log}</small>
              ))}
            </div>
          )}

          <button className="ve-gen-cancel" onClick={handleCancel}>Cancelar</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 4 — result
  // ═══════════════════════════════════════════════
  if (phase === 'result' && resultUrl) {
    return (
      <div className="ve-shell">
        <style>{veStyles(MOOD)}</style>
        <AppTopBar
          mood={MOOD}
          title="Editar · Video"
          credits={credits}
          onBack={resetAll}
        />

        <section className="ve-result-stage">
          <video
            ref={resultVideoRef}
            className="ve-result-video"
            src={resultUrl}
            autoPlay
            loop
            playsInline
            onClick={() => togglePlay('result')}
          />
          <button className="ve-play-overlay" onClick={() => togglePlay('result')} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </section>

        <div className="ve-result-actions">
          <button className="ve-action" onClick={shareResult}>
            <Share2 size={14} />
            Compartir
          </button>
          <button className="ve-action ve-action-ghost" onClick={regenerate}>
            <RefreshCw size={14} />
            Otra edición
          </button>
        </div>

        <div className="ve-result-newcta">
          <button onClick={resetAll}>
            <ArrowLeft size={12} />
            Nuevo video
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════
const veStyles = (m: AppMood) => `
.ve-shell {
  min-height: 100vh;
  background: ${m.bg0};
  background-image:
    radial-gradient(80% 60% at 50% 0%, rgba(156,109,42,0.10), transparent 70%),
    radial-gradient(60% 40% at 50% 100%, rgba(232,160,76,0.08), transparent 70%);
  color: ${m.ink0};
  padding-bottom: 120px;
  font-family: 'DM Sans', system-ui, sans-serif;
}
.ve-hero { padding: 24px 22px 12px; }
.ve-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${m.accent};
  margin-bottom: 14px;
}
.ve-hero-title {
  font-family: 'Instrument Serif', 'DM Serif Display', serif;
  font-size: 38px; line-height: 1.04; font-weight: 400;
  margin: 0 0 14px; letter-spacing: -0.01em; color: ${m.ink0};
}
.ve-hero-title em {
  font-style: italic;
  background: linear-gradient(135deg, ${m.accent}, ${m.gold});
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.ve-hero-sub {
  font-size: 14px; line-height: 1.55; color: ${m.ink1}; margin: 0; max-width: 420px;
}
.ve-section { padding: 18px 22px 0; }
.ve-section-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 14px; gap: 12px;
}
.ve-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${m.gold};
}
.ve-section-head small { font-size: 11px; color: ${m.ink2}; }
.ve-pick-cards { display: flex; flex-direction: column; gap: 10px; }
.ve-pick-card {
  background: ${m.bgCard}; border: 1px solid ${m.line}; border-radius: 16px;
  padding: 14px 16px; display: flex; align-items: center; gap: 14px;
  cursor: pointer; transition: transform 0.15s, border-color 0.2s;
  text-align: left;
}
.ve-pick-card:active { transform: scale(0.98); }
.ve-pick-card:hover { border-color: ${m.accent}; }
.ve-pick-primary { background: linear-gradient(135deg, ${m.accent}, ${m.accentDeep}); border-color: transparent; color: #FFFFFF; }
.ve-pick-primary .ve-pick-info strong,
.ve-pick-primary .ve-pick-info small { color: #FFFFFF; }
.ve-pick-primary .ve-pick-icon { background: rgba(255,255,255,0.18); color: #FFFFFF; }
.ve-pick-icon {
  width: 42px; height: 42px; border-radius: 12px;
  background: ${m.paper}; color: ${m.accent};
  display: grid; place-items: center; flex-shrink: 0;
}
.ve-pick-info { flex: 1; display: flex; flex-direction: column; }
.ve-pick-info strong { font-size: 14px; color: ${m.ink0}; }
.ve-pick-info small { font-size: 11px; color: ${m.ink2}; }
.ve-pick-arrow { color: ${m.ink3}; }
.ve-gallery-strip {
  display: flex; gap: 8px; overflow-x: auto; margin: 0 -22px;
  padding: 4px 22px 8px; scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch; scrollbar-width: none;
}
.ve-gallery-strip::-webkit-scrollbar { display: none; }
.ve-gallery-card {
  flex: 0 0 auto; scroll-snap-align: start;
  width: 90px; height: 120px;
  border: 1px solid ${m.line}; border-radius: 10px;
  overflow: hidden; cursor: pointer; padding: 0;
  background: ${m.paper};
  transition: transform 0.15s, border-color 0.2s;
}
.ve-gallery-card:active { transform: scale(0.96); }
.ve-gallery-card:hover { border-color: ${m.accent}; }
.ve-gallery-card video {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.ve-preview-stage {
  position: relative; margin: 16px 22px 0;
  aspect-ratio: 9 / 16; max-height: 50vh;
  background: ${m.paper}; border: 1px solid ${m.line};
  border-radius: 18px; overflow: hidden;
}
.ve-preview-video { width: 100%; height: 100%; object-fit: cover; display: block; }
.ve-preview-swap {
  position: absolute; top: 12px; right: 12px;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
  color: white; border: 1px solid rgba(255,255,255,0.1);
  padding: 6px 12px; border-radius: 100px;
  font-size: 11px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
}
.ve-tpl-scroll {
  display: flex; gap: 8px; overflow-x: auto;
  margin: 0 -22px 14px; padding: 4px 22px 8px;
  scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.ve-tpl-scroll::-webkit-scrollbar { display: none; }
.ve-tpl-card {
  flex: 0 0 auto; scroll-snap-align: start;
  background: ${m.bgCard}; border: 1.5px solid ${m.line};
  border-radius: 14px; padding: 11px 16px; cursor: pointer;
  transition: transform 0.15s, border-color 0.2s, background 0.2s;
  display: inline-flex; align-items: center; gap: 9px; white-space: nowrap;
}
.ve-tpl-card:active { transform: scale(0.97); }
.ve-tpl-icon { font-size: 18px; line-height: 1; }
.ve-tpl-label { font-size: 13px; color: ${m.ink1}; font-weight: 500; }
.ve-tpl-on { background: ${m.accent}; border-color: ${m.accent}; }
.ve-tpl-on .ve-tpl-label { color: #FFFFFF; }
.ve-prompt {
  width: 100%; background: ${m.bgCard}; border: 1px solid ${m.line};
  color: ${m.ink0}; border-radius: 14px;
  padding: 14px 16px; font-size: 15px; font-family: inherit;
  resize: none; outline: none; line-height: 1.5;
}
.ve-prompt::placeholder { color: ${m.ink3}; }
.ve-prompt:focus { border-color: ${m.accent}; }
.ve-refs { margin-top: 18px; }
.ve-refs-head {
  display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px;
}
.ve-refs-head span { font-size: 13px; color: ${m.ink1}; font-weight: 500; }
.ve-refs-head small { font-size: 11px; color: ${m.ink3}; }
.ve-refs-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ve-ref-card {
  position: relative; width: 70px; height: 90px;
  border-radius: 10px; overflow: hidden;
  border: 1px solid ${m.line};
}
.ve-ref-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ve-ref-tag {
  position: absolute; bottom: 4px; left: 4px;
  background: rgba(0,0,0,0.6); color: #FFFFFF;
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  padding: 2px 5px; border-radius: 4px;
}
.ve-ref-del {
  position: absolute; top: 4px; right: 4px;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(0,0,0,0.6); color: #FFFFFF; border: none;
  display: grid; place-items: center; cursor: pointer;
}
.ve-ref-add {
  width: 70px; height: 90px; border-radius: 10px;
  border: 1.5px dashed ${m.line}; background: ${m.bgCard};
  color: ${m.ink2}; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px;
}
.ve-ref-add small { font-size: 10px; }
.ve-cta-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 14px 22px calc(14px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, transparent, ${m.bg0} 30%);
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; z-index: 10;
}
.ve-cta-cost { display: flex; flex-direction: column; }
.ve-cta-cost strong { font-size: 18px; font-family: 'JetBrains Mono', monospace; color: ${m.ink0}; }
.ve-cta-cost small { font-size: 10px; color: ${m.ink2}; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em; }
.ve-cta-go {
  flex: 1; max-width: 220px;
  background: linear-gradient(135deg, ${m.accent}, ${m.gold});
  color: white; border: none; padding: 14px 22px;
  border-radius: 100px; font-size: 14px; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  box-shadow: 0 6px 20px rgba(156,109,42,0.22);
}
.ve-cta-go:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.ve-gen-shell {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 32px; text-align: center;
}
.ve-gen-orb {
  width: 88px; height: 88px; border-radius: 50%;
  background: linear-gradient(135deg, ${m.accent}, ${m.gold});
  display: grid; place-items: center; color: white; margin-bottom: 24px;
  animation: ve-pulse 2s ease-in-out infinite;
  box-shadow: 0 8px 30px rgba(156,109,42,0.25);
}
@keyframes ve-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.ve-gen-title {
  font-family: 'Instrument Serif', serif; font-size: 26px; font-weight: 400;
  margin: 0 0 8px; color: ${m.ink0};
}
.ve-gen-sub { font-size: 13px; color: ${m.ink2}; margin: 0 0 24px; font-family: 'JetBrains Mono', monospace; }
.ve-gen-logs {
  background: ${m.bgCard}; border: 1px solid ${m.line};
  border-radius: 10px; padding: 10px 14px; margin: 0 0 24px;
  max-width: 320px; display: flex; flex-direction: column; gap: 3px;
}
.ve-gen-logs small { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${m.ink2}; text-align: left; }
.ve-gen-cancel {
  background: transparent; border: 1px solid ${m.line};
  color: ${m.ink2}; padding: 10px 22px; border-radius: 100px;
  font-size: 12px; cursor: pointer; font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em; text-transform: uppercase;
}
.ve-result-stage {
  margin: 16px 22px 0; position: relative;
  aspect-ratio: 9 / 16; max-height: 62vh;
  background: ${m.paper}; border: 1px solid ${m.line};
  border-radius: 18px; overflow: hidden;
}
.ve-result-video { width: 100%; height: 100%; object-fit: cover; display: block; }
.ve-play-overlay {
  position: absolute; inset: 0; background: transparent; border: none;
  display: grid; place-items: center; color: rgba(255,255,255,0.85);
  cursor: pointer; opacity: 0; transition: opacity 0.2s;
}
.ve-play-overlay:hover { opacity: 1; }
.ve-result-actions { margin: 18px 22px 0; display: flex; gap: 10px; }
.ve-action {
  flex: 1; background: linear-gradient(135deg, ${m.accent}, ${m.accentDeep});
  color: white; border: none; padding: 12px 18px;
  border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.ve-action-ghost { background: transparent; border: 1px solid ${m.line}; color: ${m.ink1}; }
.ve-result-newcta { margin: 16px 22px 0; text-align: center; }
.ve-result-newcta button {
  background: transparent; border: none; color: ${m.ink3};
  font-size: 12px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;
}
`;
