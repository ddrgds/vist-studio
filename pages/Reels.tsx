/**
 * Reels — Image-to-Video reel composer (Seedance 2.0 via fal.ai).
 *
 *   Concept: the user picks a character, then a specific photo of that
 *   character (an outfit/look). They describe what should happen ("baila
 *   sensualmente moviendo las caderas") and Seedance animates it into a
 *   vertical 9:16 short clip with synced audio. Perfect for IG/TikTok
 *   reels.
 *
 *   Phases:
 *     1. pick-character        — choose saved character or upload portrait
 *     2. pick-character-photo  — choose which photo (outfit/look) to animate
 *     3. configure             — prompt + duration + resolution
 *     4. generating            — fullscreen loader, queue + log tail
 *     5. result                — vertical video player + share / save / regen
 *
 * Mood: Sand + Rosé — warm light palette consistent with the rest of the
 * VIST mobile app suite (Headshot, Reimaginar, Sesión, Recast, Imagina),
 * differentiated by a coral/rosé accent vs the clay accents in the other apps.
 *
 * Cost: Seedance 2.0
 *   - 480p · 5s  ≈  60 cr
 *   - 720p · 5s  ≈ 100 cr  (default)
 *   - 1080p · 5s ≈ 170 cr
 * Scales linearly with duration.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Upload, Play, Pause, Share2,
  RefreshCw, ChevronRight, ArrowLeft, User, Wand2, Clock,
} from 'lucide-react';
import type { Page } from '../App';
import { useGalleryStore } from '../stores/galleryStore';
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, sharePhoto } from '../services/nativeService';
import { AppTopBar, urlToFile, type AppMood } from '../components/apps/_shared';
import { generateImageToVideo, type VideoProgress } from '../services/falVideoService';
import { VideoEngine } from '../types';

// Seedance 2.0 only accepts JPEG / PNG / WebP. Some character photos come
// back from the CDN as octet-stream, or are HEIC/AVIF/GIF — those would
// trigger the "imagen no válida" error. This normalizes anything the browser
// can decode to JPEG with matching .jpg extension, and caps at 2048px on the
// longer edge so we don't blow Seedance's 30MB limit on Hi-DPI exports.
async function ensureValidImageFile(file: File): Promise<File> {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_EDGE = 2048;
  const MAX_BYTES = 25 * 1024 * 1024;

  // Fast path: already a valid format AND within size limit AND filename matches.
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const extMatch =
    (file.type === 'image/jpeg' && (ext === 'jpg' || ext === 'jpeg')) ||
    (file.type === 'image/png'  && ext === 'png') ||
    (file.type === 'image/webp' && ext === 'webp');
  if (ALLOWED.includes(file.type) && extMatch && file.size <= MAX_BYTES) {
    return file;
  }

  // Re-encode via canvas. Works for HEIC on iOS Safari, AVIF, GIF first frame,
  // octet-stream, and anything else the browser can decode as an image.
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error('Formato de imagen no soportado por el navegador');
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
  if (!blob) throw new Error('No se pudo recodificar la imagen');
  const safeName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], safeName, { type: 'image/jpeg' });
}

const REELS_MOOD: AppMood = {
  bg0:        '#F5EBDB',
  bgCard:     '#FFFCF5',
  paper:      '#F4DEC8',
  ink0:       '#1F1A14',
  ink1:       '#3D332A',
  ink2:       '#6F5E4C',
  ink3:       '#A8957D',
  line:       'rgba(31,26,20,0.10)',
  accent:     '#D85478',
  accentDeep: '#A8385A',
  gold:       '#E8A04C',
};

interface Props {
  onNav: (p: Page) => void;
}

type Phase = 'pick-character' | 'pick-character-photo' | 'configure' | 'generating' | 'result';
type Resolution = '480p' | '720p' | '1080p';
type Duration = '4' | '5' | '8';

// Cost in credits. Base for 5s; linear scaling per second.
// Aligned with CREDIT_COSTS[Seedance2] = 86 (5s at 720p).
const COST_PER_SEC: Record<Resolution, number> = {
  '480p':  12,   // ~$0.04/s
  '720p':  20,   // ~$0.06/s (default)
  '1080p': 34,   // ~$0.10/s
};

export default function Reels({ onNav }: Props) {
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const addItems = useGalleryStore(s => s.addItems);
  const characters = useCharacterStore(s => s.characters);
  const toast = useToast();

  const credits = profile?.creditsRemaining ?? 0;

  // ─── Phase ──────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('pick-character');

  // Character
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(null);
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);

  // Config
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [duration, setDuration] = useState<Duration>('5');

  // Generation
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Video playback
  const resultVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Hidden file inputs
  const charImgInputRef = useRef<HTMLInputElement>(null);

  // Gallery items for this character (memo source for photo picker)
  const galleryItems = useGalleryStore(s => s.items);

  // Selected character object
  const selectedCharacter: SavedCharacter | null =
    characters.find(c => c.id === characterId) ?? null;

  // Photos available for the picked character
  const characterPhotos = React.useMemo(() => {
    if (!selectedCharacter) return [];
    const urls = new Set<string>();
    const out: { url: string; kind: 'portrait' | 'ref' | 'gallery' }[] = [];
    if (selectedCharacter.thumbnail) {
      urls.add(selectedCharacter.thumbnail);
      out.push({ url: selectedCharacter.thumbnail, kind: 'portrait' });
    }
    (selectedCharacter.referencePhotoUrls || []).forEach(u => {
      if (u && !urls.has(u)) { urls.add(u); out.push({ url: u, kind: 'ref' }); }
    });
    galleryItems
      .filter(item => item.type === 'image' && item.characterId === selectedCharacter.id)
      .slice(0, 24)
      .forEach(item => {
        if (item.url && !urls.has(item.url)) { urls.add(item.url); out.push({ url: item.url, kind: 'gallery' }); }
      });
    return out;
  }, [selectedCharacter, galleryItems]);

  // ─── Compute cost ────────────────────────────────
  const cost = Math.round(parseInt(duration, 10) * COST_PER_SEC[resolution]);

  // ─── Character pickers ──────────────────────────
  const pickCharacter = (c: SavedCharacter) => {
    hapticLight();
    setCharacterId(c.id);
    setCharacterImageFile(null);
    setCharacterImageUrl(null);
    setPhase('pick-character-photo');
  };

  const pickCharacterPhoto = async (url: string) => {
    if (!selectedCharacter) {
      toast.error('Personaje no encontrado');
      return;
    }
    try {
      hapticLight();
      // Seedance 2.0 validates by MIME type — JPEG/PNG/WebP only. urlToFile
      // names the file 'character.png' by default which can mislead the
      // uploader. We name it generically and normalize the type below.
      const rawFile = await urlToFile(url, `reel-character-${selectedCharacter.id.slice(0, 8)}.jpg`);
      const file = await ensureValidImageFile(rawFile);
      setCharacterImageFile(file);
      setCharacterImageUrl(url);
      setPhase('configure');
    } catch (err: any) {
      console.error('[Reels] photo load error:', err);
      toast.error(`No se pudo cargar la foto: ${String(err?.message ?? err).slice(0, 80)}`);
    }
  };

  const handleCharImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    e.target.value = '';
    if (!raw) return;
    if (raw.size > 25 * 1024 * 1024) {
      toast.error('Máximo 25 MB');
      return;
    }
    try {
      const file = await ensureValidImageFile(raw);
      const reader = new FileReader();
      reader.onload = () => {
        setCharacterId(null);
        setCharacterImageFile(file);
        setCharacterImageUrl(reader.result as string);
        hapticLight();
        setPhase('configure');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('[Reels] upload error:', err);
      toast.error(`Imagen inválida: ${String(err?.message ?? err).slice(0, 80)}`);
    }
  };

  // ─── Generate ────────────────────────────────────
  const handleGenerate = async () => {
    if (!characterImageFile) {
      toast.error('Falta foto del personaje');
      return;
    }
    const finalPrompt = prompt.trim() || 'natural cinematic movement';
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
      const result = await generateImageToVideo(
        {
          mode: 'image-to-video',
          baseImage: characterImageFile,
          prompt: finalPrompt,
          engine: VideoEngine.Seedance2,
          duration: duration === '8' ? '10' : duration as '5',
          aspectRatio: '9:16',
          resolution,
        },
        prog => setProgress(prog),
      );

      if (!result.videoUrl) throw new Error('Seedance no devolvió URL del video');

      setResultUrl(result.videoUrl);
      setPhase('result');
      hapticSuccess();
      toast.success('Reel listo');

      addItems([{
        id: crypto.randomUUID(),
        url: result.videoUrl,
        type: 'video',
        model: 'seedance-2.0',
        timestamp: Date.now(),
        prompt: `Reel · ${selectedCharacter?.name ?? 'custom'} · ${duration}s · ${resolution} · ${finalPrompt.slice(0, 60)}`,
        characterId: characterId ?? undefined,
      }]);
    } catch (err: any) {
      // Surface the real fal error body when present — fal wraps validation
      // errors in err.body.detail rather than err.message.
      const body = err?.body ?? err?.response?.body;
      const detail = body?.detail || body?.message || err?.message || String(err);
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      if (msg.toLowerCase().includes('abort')) {
        toast.info('Generación cancelada');
      } else {
        console.error('[Reels] generation error:', err, 'body:', body);
        toast.error(`No se pudo generar: ${msg.slice(0, 120)}`);
        hapticError();
      }
      restoreCredits(cost);
      setPhase('configure');
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
    setCharacterId(null);
    setCharacterImageFile(null);
    setCharacterImageUrl(null);
    setPrompt('');
    setResolution('720p');
    setDuration('5');
    setResultUrl(null);
    setPhase('pick-character');
    hapticLight();
  };

  // ─── Result actions ─────────────────────────────
  const togglePlay = () => {
    const v = resultVideoRef.current;
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
        filename: `vist-reel-${Date.now()}.mp4`,
        title: 'Mi reel',
        text: 'Hecho con VIST',
      });
      if (!ok) {
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `vist-reel-${Date.now()}.mp4`;
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
    setPhase('configure');
    hapticLight();
  };

  // ═══════════════════════════════════════════════
  // PHASE 1 — pick character
  // ═══════════════════════════════════════════════
  if (phase === 'pick-character') {
    return (
      <div className="rl-shell">
        <style>{RL_STYLES}</style>
        <AppTopBar
          mood={REELS_MOOD}
          title="Reels · Neón"
          credits={credits}
          onBack={() => onNav('home' as Page)}
        />

        <section className="rl-hero">
          <div className="rl-hero-eyebrow">Image · to · Video</div>
          <h1 className="rl-hero-title">
            Una foto.<br />
            <em>Un reel</em> de 5 segundos.
          </h1>
          <p className="rl-hero-sub">
            Elegí un look de tu personaje, describí qué hace, y Seedance 2.0 lo convierte en un clip vertical con audio. Listo para subir a IG o TikTok.
          </p>
        </section>

        <section className="rl-section">
          <div className="rl-section-head">
            <span className="rl-eyebrow">Paso 1 · Tu personaje</span>
            <small>Quién aparece en el reel</small>
          </div>

          {characters.length === 0 ? (
            <div className="rl-empty-chars">
              <div className="rl-empty-chars-icon"><User size={22} /></div>
              <strong>Sin personajes todavía</strong>
              <small>Necesitas al menos uno para hacer un reel.</small>
              <button
                className="rl-empty-cta"
                onClick={() => { hapticLight(); onNav('create'); }}
              >
                Crear personaje
              </button>
              <button
                className="rl-empty-alt"
                onClick={() => { hapticLight(); charImgInputRef.current?.click(); }}
              >
                <Upload size={12} />
                O subir foto directamente
              </button>
            </div>
          ) : (
            <div className="rl-char-grid">
              {characters.map(c => (
                <button
                  key={c.id}
                  className="rl-char-card"
                  onClick={() => pickCharacter(c)}
                >
                  <div
                    className="rl-char-thumb"
                    style={c.thumbnail ? { backgroundImage: `url(${c.thumbnail})` } : undefined}
                  >
                    {!c.thumbnail && <User size={20} />}
                  </div>
                  <strong>{c.name}</strong>
                  <small>{c.renderStyle || 'Personaje'}</small>
                </button>
              ))}
              <button
                className="rl-char-card rl-char-upload"
                onClick={() => { hapticLight(); charImgInputRef.current?.click(); }}
              >
                <div className="rl-char-thumb"><Upload size={20} /></div>
                <strong>Subir foto</strong>
                <small>Sin guardar personaje</small>
              </button>
            </div>
          )}
        </section>

        <input
          ref={charImgInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCharImgUpload}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 2 — pick character photo
  // ═══════════════════════════════════════════════
  if (phase === 'pick-character-photo' && selectedCharacter) {
    return (
      <div className="rl-shell">
        <style>{RL_STYLES}</style>
        <AppTopBar
          mood={REELS_MOOD}
          title="Reels · Neón"
          credits={credits}
          onBack={() => setPhase('pick-character')}
        />

        <section className="rl-section">
          <div className="rl-section-head">
            <span className="rl-eyebrow">Paso 2 · El look</span>
            <small>{selectedCharacter.name} · elegí qué foto animar</small>
          </div>

          {characterPhotos.length === 0 ? (
            <div className="rl-empty-chars">
              <div className="rl-empty-chars-icon"><Sparkles size={22} /></div>
              <strong>Sin fotos guardadas</strong>
              <small>Generá fotos del personaje primero, o subí una.</small>
              <button
                className="rl-empty-alt"
                onClick={() => { hapticLight(); charImgInputRef.current?.click(); }}
              >
                <Upload size={12} />
                Subir foto
              </button>
            </div>
          ) : (
            <div className="rl-photo-grid">
              {characterPhotos.map((p, i) => (
                <button
                  key={`${p.url}-${i}`}
                  className="rl-photo-card"
                  onClick={() => pickCharacterPhoto(p.url)}
                >
                  <img src={p.url} alt={`Foto ${i + 1}`} loading="lazy" />
                  {p.kind === 'portrait' && <span className="rl-photo-tag">Portada</span>}
                  {p.kind === 'ref' && <span className="rl-photo-tag">Referencia</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        <input
          ref={charImgInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCharImgUpload}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 3 — configure
  // ═══════════════════════════════════════════════
  if (phase === 'configure' && characterImageUrl) {
    return (
      <div className="rl-shell">
        <style>{RL_STYLES}</style>
        <AppTopBar
          mood={REELS_MOOD}
          title="Reels · Neón"
          credits={credits}
          onBack={() => { resetAll(); }}
        />

        {/* Image preview */}
        <section className="rl-preview-stage">
          <img className="rl-preview-img" src={characterImageUrl} alt="Personaje" />
          <button className="rl-preview-swap" onClick={() => { hapticLight(); resetAll(); }}>
            <RefreshCw size={11} />
            Cambiar
          </button>
        </section>

        <section className="rl-section">
          <div className="rl-section-head">
            <span className="rl-eyebrow">Paso 3 · La acción</span>
            <small>Describí qué pasa en el reel</small>
          </div>

          <textarea
            className="rl-prompt"
            placeholder="Ej: camina hacia la cámara con confianza, mueve el pelo, sonríe sutil"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            maxLength={400}
          />

          <div className="rl-config-row">
            <div className="rl-config-label">Duración</div>
            <div className="rl-pills">
              {(['4', '5', '8'] as Duration[]).map(d => (
                <button
                  key={d}
                  className={`rl-pill ${duration === d ? 'rl-pill-on' : ''}`}
                  onClick={() => { hapticLight(); setDuration(d); }}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div className="rl-config-row">
            <div className="rl-config-label">Resolución</div>
            <div className="rl-pills">
              {(['480p', '720p', '1080p'] as Resolution[]).map(r => (
                <button
                  key={r}
                  className={`rl-pill ${resolution === r ? 'rl-pill-on' : ''}`}
                  onClick={() => { hapticLight(); setResolution(r); }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="rl-cta-bar">
          <div className="rl-cta-cost">
            <strong>{cost} cr</strong>
            <small>{duration}s · {resolution} · 9:16</small>
          </div>
          <button
            className="rl-cta-go"
            onClick={handleGenerate}
            disabled={credits < cost}
          >
            <Wand2 size={14} />
            Generar reel
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 4 — generating
  // ═══════════════════════════════════════════════
  if (phase === 'generating') {
    return (
      <div className="rl-shell">
        <style>{RL_STYLES}</style>
        <div className="rl-gen-shell">
          <div className="rl-gen-orb">
            <Sparkles size={28} />
          </div>
          <h2 className="rl-gen-title">Animando tu personaje</h2>
          <p className="rl-gen-sub">
            {progress?.status === 'IN_QUEUE'
              ? `En cola${progress.queuePosition ? ` · posición ${progress.queuePosition}` : ''}…`
              : 'Seedance 2.0 está renderizando…'}
          </p>

          {progress?.logs && progress.logs.length > 0 && (
            <div className="rl-gen-logs">
              {progress.logs.slice(-3).map((log, i) => (
                <small key={i}>{log}</small>
              ))}
            </div>
          )}

          <button className="rl-gen-cancel" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 5 — result
  // ═══════════════════════════════════════════════
  if (phase === 'result' && resultUrl) {
    return (
      <div className="rl-shell">
        <style>{RL_STYLES}</style>
        <AppTopBar
          mood={REELS_MOOD}
          title="Reels · Neón"
          credits={credits}
          onBack={resetAll}
        />

        <section className="rl-result-stage">
          <video
            ref={resultVideoRef}
            className="rl-result-video"
            src={resultUrl}
            autoPlay
            loop
            playsInline
            onClick={togglePlay}
          />
          <button className="rl-play-overlay" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </section>

        <div className="rl-result-actions">
          <button className="rl-action" onClick={shareResult}>
            <Share2 size={14} />
            Compartir
          </button>
          <button className="rl-action rl-action-ghost" onClick={regenerate}>
            <RefreshCw size={14} />
            Otra vez
          </button>
        </div>

        <div className="rl-result-newcta">
          <button onClick={resetAll}>
            <ArrowLeft size={12} />
            Nuevo reel
          </button>
        </div>
      </div>
    );
  }

  // Fallback (should never hit)
  return null;
}

// ═══════════════════════════════════════════════
// Styles — Neon Reels mood
// ═══════════════════════════════════════════════
const RL_STYLES = `
.rl-shell {
  min-height: 100vh;
  background: ${REELS_MOOD.bg0};
  background-image:
    radial-gradient(80% 60% at 50% 0%, rgba(216,84,120,0.10), transparent 70%),
    radial-gradient(60% 40% at 50% 100%, rgba(232,160,76,0.08), transparent 70%);
  color: ${REELS_MOOD.ink0};
  padding-bottom: 120px;
  font-family: 'DM Sans', system-ui, sans-serif;
}
.rl-hero {
  padding: 24px 22px 12px;
  text-align: left;
}
.rl-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${REELS_MOOD.accent};
  margin-bottom: 14px;
}
.rl-hero-title {
  font-family: 'Instrument Serif', 'DM Serif Display', serif;
  font-size: 38px;
  line-height: 1.04;
  font-weight: 400;
  margin: 0 0 14px;
  letter-spacing: -0.01em;
  color: ${REELS_MOOD.ink0};
}
.rl-hero-title em {
  font-style: italic;
  background: linear-gradient(135deg, ${REELS_MOOD.accent}, ${REELS_MOOD.gold});
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.rl-hero-sub {
  font-size: 14px;
  line-height: 1.55;
  color: ${REELS_MOOD.ink1};
  margin: 0;
  max-width: 420px;
}
.rl-section {
  padding: 18px 22px 0;
}
.rl-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
}
.rl-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${REELS_MOOD.gold};
}
.rl-section-head small {
  font-size: 11px;
  color: ${REELS_MOOD.ink2};
}
.rl-empty-chars {
  background: ${REELS_MOOD.bgCard};
  border: 1px solid ${REELS_MOOD.line};
  border-radius: 16px;
  padding: 26px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.rl-empty-chars-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${REELS_MOOD.paper};
  display: grid;
  place-items: center;
  color: ${REELS_MOOD.accent};
  margin-bottom: 6px;
}
.rl-empty-chars strong {
  font-size: 15px;
  color: ${REELS_MOOD.ink0};
}
.rl-empty-chars small {
  font-size: 12px;
  color: ${REELS_MOOD.ink2};
  margin-bottom: 12px;
}
.rl-empty-cta {
  margin-top: 4px;
  background: linear-gradient(135deg, ${REELS_MOOD.accent}, ${REELS_MOOD.accentDeep});
  color: white;
  border: none;
  padding: 11px 22px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.rl-empty-alt {
  background: transparent;
  border: 1px solid ${REELS_MOOD.line};
  color: ${REELS_MOOD.ink1};
  padding: 9px 14px;
  border-radius: 100px;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.rl-char-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.rl-char-card {
  background: ${REELS_MOOD.bgCard};
  border: 1px solid ${REELS_MOOD.line};
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.2s;
  text-align: left;
}
.rl-char-card:active { transform: scale(0.97); }
.rl-char-card:hover { border-color: ${REELS_MOOD.accent}; }
.rl-char-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  background-color: ${REELS_MOOD.paper};
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  margin-bottom: 6px;
  display: grid;
  place-items: center;
  color: ${REELS_MOOD.ink3};
}
.rl-char-card strong { font-size: 14px; color: ${REELS_MOOD.ink0}; }
.rl-char-card small { font-size: 11px; color: ${REELS_MOOD.ink2}; }
.rl-char-upload {
  border-style: dashed;
  border-color: ${REELS_MOOD.line};
}
.rl-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.rl-photo-card {
  position: relative;
  aspect-ratio: 3 / 4;
  background: ${REELS_MOOD.bgCard};
  border: 1px solid ${REELS_MOOD.line};
  border-radius: 12px;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  transition: transform 0.15s;
}
.rl-photo-card:active { transform: scale(0.96); }
.rl-photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.rl-photo-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  color: white;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.05em;
  padding: 3px 7px;
  border-radius: 6px;
  text-transform: uppercase;
}
.rl-preview-stage {
  position: relative;
  margin: 16px 22px 0;
  aspect-ratio: 9 / 16;
  max-height: 56vh;
  background: ${REELS_MOOD.bgCard};
  border: 1px solid ${REELS_MOOD.line};
  border-radius: 18px;
  overflow: hidden;
}
.rl-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.rl-preview-swap {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  color: white;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.rl-prompt {
  width: 100%;
  background: ${REELS_MOOD.bgCard};
  border: 1px solid ${REELS_MOOD.line};
  color: ${REELS_MOOD.ink0};
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  outline: none;
  line-height: 1.5;
}
.rl-prompt::placeholder { color: ${REELS_MOOD.ink3}; }
.rl-prompt:focus { border-color: ${REELS_MOOD.accent}; }
.rl-config-row {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.rl-config-label {
  font-size: 13px;
  color: ${REELS_MOOD.ink1};
  font-weight: 500;
}
.rl-pills {
  display: inline-flex;
  background: ${REELS_MOOD.bgCard};
  border: 1px solid ${REELS_MOOD.line};
  border-radius: 100px;
  padding: 3px;
  gap: 2px;
}
.rl-pill {
  background: transparent;
  color: ${REELS_MOOD.ink2};
  border: none;
  padding: 7px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
}
.rl-pill-on {
  background: linear-gradient(135deg, ${REELS_MOOD.accent}, ${REELS_MOOD.accentDeep});
  color: white;
}
.rl-cta-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px 22px calc(14px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, transparent, ${REELS_MOOD.bg0} 30%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 10;
}
.rl-cta-cost {
  display: flex;
  flex-direction: column;
}
.rl-cta-cost strong {
  font-size: 18px;
  font-family: 'JetBrains Mono', monospace;
  color: ${REELS_MOOD.ink0};
}
.rl-cta-cost small {
  font-size: 10px;
  color: ${REELS_MOOD.ink2};
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.04em;
}
.rl-cta-go {
  flex: 1;
  max-width: 220px;
  background: linear-gradient(135deg, ${REELS_MOOD.accent}, ${REELS_MOOD.gold});
  color: white;
  border: none;
  padding: 14px 22px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  box-shadow: 0 6px 20px rgba(216,84,120,0.22);
}
.rl-cta-go:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}
.rl-gen-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
}
.rl-gen-orb {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${REELS_MOOD.accent}, ${REELS_MOOD.gold});
  display: grid;
  place-items: center;
  color: white;
  margin-bottom: 24px;
  animation: rl-pulse 2s ease-in-out infinite;
  box-shadow: 0 8px 30px rgba(216,84,120,0.25);
}
@keyframes rl-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.rl-gen-title {
  font-family: 'Instrument Serif', serif;
  font-size: 26px;
  font-weight: 400;
  margin: 0 0 8px;
  color: ${REELS_MOOD.ink0};
}
.rl-gen-sub {
  font-size: 13px;
  color: ${REELS_MOOD.ink2};
  margin: 0 0 24px;
  font-family: 'JetBrains Mono', monospace;
}
.rl-gen-logs {
  background: ${REELS_MOOD.bgCard};
  border: 1px solid ${REELS_MOOD.line};
  border-radius: 10px;
  padding: 10px 14px;
  margin: 0 0 24px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.rl-gen-logs small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: ${REELS_MOOD.ink2};
  text-align: left;
}
.rl-gen-cancel {
  background: transparent;
  border: 1px solid ${REELS_MOOD.line};
  color: ${REELS_MOOD.ink2};
  padding: 10px 22px;
  border-radius: 100px;
  font-size: 12px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.rl-result-stage {
  margin: 16px 22px 0;
  position: relative;
  aspect-ratio: 9 / 16;
  max-height: 62vh;
  background: ${REELS_MOOD.paper};
  border: 1px solid ${REELS_MOOD.line};
  border-radius: 18px;
  overflow: hidden;
}
.rl-result-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.rl-play-overlay {
  position: absolute;
  inset: 0;
  background: transparent;
  border: none;
  display: grid;
  place-items: center;
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}
.rl-play-overlay:hover { opacity: 1; }
.rl-result-actions {
  margin: 18px 22px 0;
  display: flex;
  gap: 10px;
}
.rl-action {
  flex: 1;
  background: linear-gradient(135deg, ${REELS_MOOD.accent}, ${REELS_MOOD.accentDeep});
  color: white;
  border: none;
  padding: 12px 18px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.rl-action-ghost {
  background: transparent;
  border: 1px solid ${REELS_MOOD.line};
  color: ${REELS_MOOD.ink1};
}
.rl-result-newcta {
  margin: 16px 22px 0;
  text-align: center;
}
.rl-result-newcta button {
  background: transparent;
  border: none;
  color: ${REELS_MOOD.ink3};
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em;
}
`;
