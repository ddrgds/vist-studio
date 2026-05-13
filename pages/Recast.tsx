/**
 * Recast — Character replacement in video (Wan 2.2 Animate Replace via fal.ai).
 *
 *   Concept: the user records (or uploads) a video of themselves moving, talking,
 *   or posing with their phone. The AI replaces the person in the video with
 *   their chosen virtual character, keeping the original background, camera
 *   movement, lighting, gestures, and timing exactly. Voice stays from source.
 *
 *   This is the killer feature for AI-influencer operators: their face + body
 *   becomes "infinite content" — every video they record is a video of their
 *   character. Same model used by Higgsfield Recast.
 *
 *   Phases:
 *     1. pick-source-video — record (camera) or upload (gallery)
 *     2. pick-character    — pick from saved characters or upload portrait
 *     3. configure         — resolution 480p / 720p
 *     4. generating        — fullscreen loader, queue + log tail
 *     5. result            — video player + share / save / regenerate
 *
 * Mood: Clay Reels (cream + deep clay).
 *
 * Cost: Wan 2.2 Animate Replace
 *   - 480p · $0.04/s · 12 cr/s  (a 5s clip = 60 cr)
 *   - 720p · $0.08/s · 23 cr/s  (a 5s clip = 115 cr)
 * Cap input duration at 10s to keep cost predictable.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Film, Upload, Video, Play, Pause, Share2,
  RefreshCw, ChevronRight, X, ArrowLeft, User, Camera,
  Sparkles, Crown, Clock,
} from 'lucide-react';
import type { Page } from '../App';
import { useGalleryStore } from '../stores/galleryStore';
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, sharePhoto } from '../services/nativeService';
import { AppTopBar, urlToFile, ensureValidImageFile, type AppMood } from '../components/apps/_shared';
import { recastVideo, type VideoProgress } from '../services/falVideoService';
import { useColorScheme } from '../hooks/useColorScheme';

const LIGHT_MOOD: AppMood = {
  bg0: '#F5E8D4',
  bgCard: '#FFFAEC',
  paper: '#F3DEB5',
  ink0: '#1F1A14',
  ink1: '#3D332A',
  ink2: '#6F5E4C',
  ink3: '#A8957D',
  line: 'rgba(31, 26, 20, 0.10)',
  accent: '#B0542D',
  accentDeep: '#8E3C20',
  gold: '#E8A04C',
};

// Matches the @media (prefers-color-scheme: dark) overrides on .rc-shell.
// Passed to <AppTopBar> when the OS is in dark mode so the topbar's inline
// CSS variables stay in sync with the rest of the page.
const DARK_MOOD: AppMood = {
  bg0: '#161210',
  bgCard: '#1F1A14',
  paper: '#2A2218',
  ink0: '#FAF0DC',
  ink1: '#E0D2BD',
  ink2: '#B0997C',
  ink3: '#806A56',
  line: 'rgba(255,250,236,0.10)',
  accent: '#D67A50',
  accentDeep: '#B0542D',
  gold: '#E8A04C',
};

interface Props {
  onNav: (p: Page) => void;
}

type Phase = 'pick-video' | 'pick-character' | 'pick-character-photo' | 'configure' | 'generating' | 'result';
type Resolution = '480p' | '720p';

const MAX_DURATION_S = 10;
const MAX_VIDEO_MB = 80;

// Cost per second — Kling 3 Pro Motion Control (DEFAULT 2026-05-13).
// fal price: ~$0.20/s per Kling pricing. With ~65% margin = ~58 cr/s.
// Resolution toggle is currently vestigial since Kling 3 motion-control
// doesn't expose a resolution param — same cost both buckets for now.
// When we add an Express (Wan VACE) tier toggle, restore differential pricing.
const COST_PER_SEC: Record<Resolution, number> = {
  '480p': 58,
  '720p': 58,
};

export default function Recast({ onNav }: Props) {
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const galleryItems = useGalleryStore(s => s.items);
  const addItems = useGalleryStore(s => s.addItems);
  const characters = useCharacterStore(s => s.characters);
  const toast = useToast();

  const scheme = useColorScheme();
  const MOOD = scheme === 'dark' ? DARK_MOOD : LIGHT_MOOD;

  const credits = profile?.creditsRemaining ?? 0;

  // ─── Phase / source ──────────────────────────────
  const [phase, setPhase] = useState<Phase>('pick-video');

  // Source video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Character
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(null);
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);

  // Config
  const [resolution, setResolution] = useState<Resolution>('480p');

  // Generation
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Video preview / result playback
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const resultVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Hidden file inputs
  const recordInputRef = useRef<HTMLInputElement>(null);   // capture="user" → camera
  const uploadInputRef = useRef<HTMLInputElement>(null);   // no capture → library
  const charImgInputRef = useRef<HTMLInputElement>(null);

  // Selected character object (memoized)
  const selectedCharacter: SavedCharacter | null =
    characters.find(c => c.id === characterId) ?? null;

  // ─── Compute cost based on duration + resolution ──
  const billableSeconds = Math.max(1, Math.ceil(videoDuration));
  const cost = billableSeconds * COST_PER_SEC[resolution];

  // ─── Video upload / record handler ───────────────
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Solo videos (MP4, MOV)');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Máximo ${MAX_VIDEO_MB} MB`);
      e.target.value = '';
      return;
    }

    // Read metadata to get duration
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
        toast.error(`Máximo ${MAX_DURATION_S}s. Tu video dura ${Math.round(dur)}s. Recórtalo antes de subirlo.`);
        URL.revokeObjectURL(url);
        return;
      }
      setVideoFile(file);
      setVideoUrl(url);
      setVideoDuration(dur);
      hapticLight();
      // Auto-advance to character picker
      setTimeout(() => setPhase('pick-character'), 200);
    };
    v.onerror = () => {
      toast.error('Video corrupto o formato no soportado');
      URL.revokeObjectURL(url);
    };

    e.target.value = '';
  };

  // ─── Character pickers ──────────────────────────
  // Step 2A — choose which character. Then advance to pick-character-photo
  // so the user can choose a specific outfit/look from that character's gallery.
  const pickCharacter = (c: SavedCharacter) => {
    hapticLight();
    setCharacterId(c.id);
    setCharacterImageFile(null);
    setCharacterImageUrl(null);
    setPhase('pick-character-photo');
  };

  // Step 2B — choose which specific photo of the character (= which outfit/look).
  // The user can pick the saved portada, any active reference photo, or any
  // gallery photo assigned to this character (these are the outfit variations
  // they generated previously).
  const pickCharacterPhoto = async (url: string) => {
    if (!selectedCharacter) {
      toast.error('Personaje no encontrado');
      return;
    }
    try {
      hapticLight();
      // Normalize before sending to Kling 3 — same fix as Reels/Seedance.
      // HEIC + octet-stream + oversize images get re-encoded as JPEG.
      const raw = await urlToFile(url, `recast-character-${selectedCharacter.id.slice(0, 8)}.jpg`);
      const file = await ensureValidImageFile(raw);
      setCharacterImageFile(file);
      setCharacterImageUrl(url);
      setPhase('configure');
    } catch (err: any) {
      console.error('[Recast] photo load error:', err);
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
    let file: File;
    try {
      file = await ensureValidImageFile(raw);
    } catch (err: any) {
      console.error('[Recast] upload error:', err);
      toast.error(`Imagen inválida: ${String(err?.message ?? err).slice(0, 80)}`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCharacterId(null);
      setCharacterImageFile(file);
      setCharacterImageUrl(reader.result as string);
      hapticLight();
      setPhase('configure');
    };
    reader.readAsDataURL(file);
  };

  // ─── Generate ────────────────────────────────────
  const handleGenerate = async () => {
    if (!videoFile || !characterImageFile) {
      toast.error('Falta video o personaje');
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
      // Default engine: Kling 3 Pro Motion (better identity, sharper output).
      // Wan 2.2 stays available as Express tier when we expose a toggle.
      const result = await recastVideo(
        {
          sourceVideo: videoFile,
          characterImage: characterImageFile,
          engine: 'kling3',
          characterOrientation: 'video',
          resolution,
          abortSignal: abortRef.current.signal,
        },
        prog => setProgress(prog),
      );

      if (!result.videoUrl) throw new Error('No se devolvió URL del video');

      setResultUrl(result.videoUrl);
      setPhase('result');
      hapticSuccess();
      toast.success('Recast listo');

      addItems([{
        id: crypto.randomUUID(),
        url: result.videoUrl,
        type: 'video',
        model: 'kling-v3-motion-control',
        timestamp: Date.now(),
        prompt: `Recast · ${selectedCharacter?.name ?? 'custom'} · ${resolution}`,
        characterId: characterId ?? undefined,
      }]);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes('abort')) {
        toast.info('Generación cancelada');
      } else {
        console.error('Recast generation error:', err);
        toast.error(`No se pudo generar: ${msg.slice(0, 90)}`);
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
    if (videoUrl?.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setVideoDuration(0);
    setCharacterId(null);
    setCharacterImageFile(null);
    setCharacterImageUrl(null);
    setResolution('480p');
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
        filename: `vist-recast-${Date.now()}.mp4`,
        title: 'Mi recast',
        text: 'Hecho con VIST',
      });
      if (!ok) {
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `vist-recast-${Date.now()}.mp4`;
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

  // Cleanup blob URL on unmount
  useEffect(() => () => {
    if (videoUrl?.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  // ═══════════════════════════════════════════════
  // PHASE 1 — pick source video
  // ═══════════════════════════════════════════════
  if (phase === 'pick-video') {
    return (
      <div className="rc-shell">
        <style>{RC_STYLES}</style>
        <AppTopBar
          mood={MOOD}
          title="Recast · Clay"
          credits={credits}
          onBack={() => onNav('home' as Page)}
        />

        <section className="rc-hero">
          <div className="rc-hero-eyebrow">Character · swap</div>
          <h1 className="rc-hero-title">
            Grábate tú.<br />
            <em>Aparece</em> tu modelo.
          </h1>
          <p className="rc-hero-sub">
            Grabas un video con tu cara y tu cuerpo. Tu personaje virtual hereda el movimiento, en el mismo escenario, con la misma luz. Audio y voz se mantienen del video original.
          </p>
        </section>

        <section className="rc-section">
          <div className="rc-section-head">
            <span className="rc-eyebrow">Paso 1 · Tu video</span>
            <small>Máx {MAX_DURATION_S}s · MP4 / MOV</small>
          </div>

          <div className="rc-pick-cards">
            <button
              className="rc-pick-card rc-pick-primary"
              onClick={() => { hapticLight(); recordInputRef.current?.click(); }}
            >
              <div className="rc-pick-icon"><Camera size={22} /></div>
              <div className="rc-pick-info">
                <strong>Grabar ahora</strong>
                <small>Selfie video con tu cámara frontal</small>
              </div>
              <ChevronRight size={16} className="rc-pick-arrow" />
            </button>

            <button
              className="rc-pick-card"
              onClick={() => { hapticLight(); uploadInputRef.current?.click(); }}
            >
              <div className="rc-pick-icon"><Upload size={22} /></div>
              <div className="rc-pick-info">
                <strong>Subir desde galería</strong>
                <small>Cualquier video de tu teléfono</small>
              </div>
              <ChevronRight size={16} className="rc-pick-arrow" />
            </button>
          </div>
        </section>

        <section className="rc-section">
          <div className="rc-tips">
            <div className="rc-tip">
              <span className="rc-tip-num">01</span>
              <div>
                <strong>Bien iluminado</strong>
                <small>La luz del original se traslada al personaje</small>
              </div>
            </div>
            <div className="rc-tip">
              <span className="rc-tip-num">02</span>
              <div>
                <strong>Cara visible</strong>
                <small>Cuanto más se vea tu cara/cuerpo, mejor el swap</small>
              </div>
            </div>
            <div className="rc-tip">
              <span className="rc-tip-num">03</span>
              <div>
                <strong>Movimientos naturales</strong>
                <small>Gestos lentos quedan mejor que acción rápida</small>
              </div>
            </div>
          </div>
        </section>

        <input
          ref={recordInputRef}
          type="file"
          accept="video/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={handleVideoSelect}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleVideoSelect}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 2 — pick character
  // ═══════════════════════════════════════════════
  if (phase === 'pick-character' && videoUrl) {
    return (
      <div className="rc-shell">
        <style>{RC_STYLES}</style>
        <AppTopBar
          mood={MOOD}
          title="Recast · Clay"
          credits={credits}
          onBack={() => onNav('home' as Page)}
        />

        {/* Source video preview */}
        <section className="rc-preview-stage">
          <video
            ref={previewVideoRef}
            className="rc-preview-video"
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            onClick={() => togglePlay('preview')}
          />
          <button className="rc-preview-swap" onClick={() => { hapticLight(); resetAll(); }}>
            <RefreshCw size={11} />
            Cambiar video
          </button>
          <div className="rc-preview-badge">
            <Clock size={10} />
            {videoDuration.toFixed(1)}s
          </div>
        </section>

        <section className="rc-section">
          <div className="rc-section-head">
            <span className="rc-eyebrow">Paso 2 · Tu personaje</span>
            <small>Quien aparecerá en el video final</small>
          </div>

          {characters.length === 0 ? (
            <div className="rc-empty-chars">
              <div className="rc-empty-chars-icon"><User size={22} /></div>
              <strong>Sin personajes todavía</strong>
              <small>Necesitas al menos uno para hacer Recast.</small>
              <button
                className="rc-empty-cta"
                onClick={() => { hapticLight(); onNav('create'); }}
              >
                Crear personaje
              </button>
            </div>
          ) : (
            <div className="rc-char-grid">
              {characters.map(c => {
                const cover = c.thumbnail || c.referencePhotoUrls?.[0] || c.modelImageUrls?.[0];
                if (!cover) return null;
                return (
                  <button
                    key={c.id}
                    className="rc-char-card"
                    onClick={() => pickCharacter(c)}
                  >
                    <div className="rc-char-img" style={{ backgroundImage: `url(${cover})` }} />
                    <div className="rc-char-name">{c.name}</div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            className="rc-char-upload"
            onClick={() => { hapticLight(); charImgInputRef.current?.click(); }}
          >
            <Upload size={14} />
            <span>O subir una foto del personaje</span>
          </button>

          <input
            ref={charImgInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCharImgUpload}
          />
        </section>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 2B — pick specific photo (outfit / look) for this character
  // ═══════════════════════════════════════════════
  if (phase === 'pick-character-photo' && selectedCharacter && videoUrl) {
    // Build ordered, deduped photo list for this character:
    //   1. Portada (thumbnail)
    //   2. Active reference photos (the curated main look)
    //   3. Gallery photos assigned to this character (the outfit variations)
    //   4. Inactive model images (from initial creation)
    const seen = new Set<string>();
    const photos: { url: string; label: string }[] = [];

    const push = (url: string | undefined, label: string) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      photos.push({ url, label });
    };

    push(selectedCharacter.thumbnail, 'Portada');
    (selectedCharacter.referencePhotoUrls || []).forEach(u => push(u, 'Referencia'));

    // Gallery items assigned to this character with an outfit variation
    galleryItems
      .filter(g => g.characterId === selectedCharacter.id && !g.tags?.includes('sheet'))
      .filter(g => g.type !== 'video')
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach(g => push(g.url, 'Galería'));

    (selectedCharacter.modelImageUrls || []).forEach(u => push(u, 'Modelo'));

    return (
      <div className="rc-shell">
        <style>{RC_STYLES}</style>

        <div className="rc-config-topbar">
          <button className="rc-back-btn" onClick={() => { hapticLight(); setPhase('pick-character'); setCharacterId(null); }} aria-label="Atrás">
            <ArrowLeft size={16} />
          </button>
          <span className="rc-config-title">
            <span className="rc-config-dot" />
            Paso 3 · Look
          </span>
          <div className="rc-config-credits">
            <span className="rc-config-dot rc-config-dot-gold" />
            {credits.toLocaleString()}
          </div>
        </div>

        <section className="rc-hero">
          <div className="rc-hero-eyebrow">{selectedCharacter.name}</div>
          <h1 className="rc-hero-title">
            ¿Qué <em>look</em><br />
            uso para el swap?
          </h1>
          <p className="rc-hero-sub">
            Cada foto trae su outfit, su pelo y su pose. El video final hereda lo que elijas aquí.
          </p>
        </section>

        {/* Primary actions — upload from phone first (like editor pick-source) */}
        <section className="rc-section">
          <div className="rc-pick-cards">
            <button
              className="rc-pick-card rc-pick-primary"
              onClick={() => { hapticMedium(); charImgInputRef.current?.click(); }}
            >
              <div className="rc-pick-icon"><Upload size={22} /></div>
              <div className="rc-pick-info">
                <strong>Subir una foto</strong>
                <small>Cámara o galería del teléfono · cualquier look</small>
              </div>
              <ChevronRight size={16} className="rc-pick-arrow" />
            </button>
          </div>

          <input
            ref={charImgInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCharImgUpload}
          />
        </section>

        {/* Saved photos of this character */}
        <section className="rc-section">
          <div className="rc-section-head">
            <span className="rc-eyebrow">
              {photos.length === 0 ? 'Sin fotos guardadas' : `O elige de ${selectedCharacter.name}`}
            </span>
            {photos.length > 0 && <small>{photos.length} foto{photos.length === 1 ? '' : 's'}</small>}
          </div>

          {photos.length === 0 ? (
            <div className="rc-empty-chars">
              <div className="rc-empty-chars-icon"><User size={22} /></div>
              <strong>Sin fotos guardadas todavía</strong>
              <small>Sube una arriba, o genera fotos del personaje en Headshot Pro.</small>
              <button
                className="rc-empty-cta"
                onClick={() => { hapticLight(); onNav('headshot' as Page); }}
              >
                Crear primera foto
              </button>
            </div>
          ) : (
            <div className="rc-photo-grid">
              {photos.map((p, i) => (
                <button
                  key={`${p.url}-${i}`}
                  className="rc-photo-tile"
                  onClick={() => pickCharacterPhoto(p.url)}
                >
                  <img src={p.url} alt="" loading="lazy" />
                  {i === 0 && <span className="rc-photo-pin">★</span>}
                  <span className="rc-photo-label">{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // PHASE 3 — configure + generate
  // ═══════════════════════════════════════════════
  if (phase === 'configure' && videoUrl && characterImageUrl) {
    const isAffordable = credits >= cost;
    return (
      <div className="rc-shell">
        <style>{RC_STYLES}</style>

        <div className="rc-config-topbar">
          <button
            className="rc-back-btn"
            onClick={() => {
              hapticLight();
              // Back to photo picker if we know which character, else to character picker
              setPhase(selectedCharacter ? 'pick-character-photo' : 'pick-character');
            }}
            aria-label="Atrás"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="rc-config-title">
            <span className="rc-config-dot" />
            Recast · Configuración
          </span>
          <div className="rc-config-credits">
            <span className="rc-config-dot rc-config-dot-gold" />
            {credits.toLocaleString()}
          </div>
        </div>

        {/* Stacked preview: source video + character image */}
        <section className="rc-stack">
          <div className="rc-stack-video">
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="rc-stack-label">Video original</div>
          </div>
          <div className="rc-stack-arrow">
            <Sparkles size={18} />
            <small>Recast</small>
          </div>
          <div className="rc-stack-char">
            <img src={characterImageUrl} alt="Personaje" />
            <div className="rc-stack-label">
              {selectedCharacter?.name ?? 'Personaje'}
            </div>
          </div>
        </section>

        {/* Resolution */}
        <section className="rc-section">
          <div className="rc-section-head">
            <span className="rc-eyebrow">Calidad</span>
          </div>
          <div className="rc-tier-row">
            <button
              className={`rc-tier ${resolution === '480p' ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setResolution('480p'); }}
            >
              <div className="rc-tier-name">Estándar</div>
              <div className="rc-tier-sub">480p · ideal para reels</div>
              <div className="rc-tier-cost">{billableSeconds * COST_PER_SEC['480p']} cr</div>
            </button>
            <button
              className={`rc-tier ${resolution === '720p' ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setResolution('720p'); }}
            >
              <div className="rc-tier-name rc-tier-pro">
                <Crown size={11} />
                HD
              </div>
              <div className="rc-tier-sub">720p · más nitidez</div>
              <div className="rc-tier-cost">{billableSeconds * COST_PER_SEC['720p']} cr</div>
            </button>
          </div>
        </section>

        {/* Cost breakdown */}
        <section className="rc-section">
          <div className="rc-cost-box">
            <div className="rc-cost-row">
              <span>Duración</span>
              <span>{videoDuration.toFixed(1)}s</span>
            </div>
            <div className="rc-cost-row">
              <span>Tarifa</span>
              <span>{COST_PER_SEC[resolution]} cr/s · {resolution}</span>
            </div>
            <div className="rc-cost-divider" />
            <div className="rc-cost-row rc-cost-total">
              <span>Total</span>
              <strong>{cost} cr</strong>
            </div>
          </div>
        </section>

        <div className="rc-spacer" />

        {/* Sticky CTA */}
        <div className="rc-cta-bar">
          <button
            className="rc-cta-btn"
            disabled={!isAffordable}
            onClick={handleGenerate}
          >
            <Film size={16} />
            {isAffordable ? `Generar Recast · ${cost} cr` : `Faltan ${cost - credits} cr`}
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
      <div className="rc-shell">
        <style>{RC_STYLES}</style>

        <div className="rc-gen-bg" style={characterImageUrl ? { backgroundImage: `url(${characterImageUrl})` } : undefined}>
          <div className="rc-gen-overlay" />
        </div>

        <div className="rc-gen-content">
          <div className="rc-gen-pulse">
            <Film size={28} />
          </div>
          <h2 className="rc-gen-title">Reemplazando<br />tu personaje</h2>
          <p className="rc-gen-sub">
            {progress?.status === 'IN_QUEUE'
              ? `En cola${progress.queuePosition != null ? ` · puesto #${progress.queuePosition}` : ''}`
              : progress?.status === 'IN_PROGRESS'
                ? 'Procesando frames con Wan Animate...'
                : 'Preparando...'}
          </p>
          <div className="rc-gen-bars">
            <span /><span /><span /><span /><span />
          </div>
          <p className="rc-gen-tip">
            Wan 2.2 Animate Replace · ~2-4 minutos para videos de 5-10s. Podés cerrar y volver.
          </p>
          <button className="rc-gen-cancel" onClick={handleCancel}>
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
      <div className="rc-shell rc-shell-dark">
        <style>{RC_STYLES}</style>
        <AppTopBar
          mood={MOOD}
          title="Recast · Clay"
          credits={credits}
          onBack={() => onNav('home' as Page)}
        />

        <div className="rc-result-stage">
          <video
            ref={resultVideoRef}
            className="rc-result-video"
            src={resultUrl}
            autoPlay
            loop
            playsInline
            controls={false}
            onClick={() => togglePlay('result')}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <button className="rc-result-play" onClick={() => togglePlay('result')} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          </button>
        </div>

        <div className="rc-result-actions">
          <button className="rc-result-btn" onClick={shareResult}>
            <Share2 size={16} />
            Compartir
          </button>
          <button className="rc-result-btn rc-result-btn-primary" onClick={regenerate}>
            <Sparkles size={16} />
            Otra toma
          </button>
          <button className="rc-result-btn" onClick={resetAll}>
            <RefreshCw size={16} />
            Nuevo
          </button>
        </div>

        <div className="rc-result-info">
          <span className="rc-result-badge">
            <Video size={11} />
            Wan Animate · {resolution} · {videoDuration.toFixed(1)}s
          </span>
          <span className="rc-result-saved">Guardado en Galería</span>
        </div>
      </div>
    );
  }

  // Fallback — should not reach
  return null;
}

// ─── Styles ──────────────────────────────────────────

const RC_STYLES = `
.rc-shell {
  --rc-bg-0: #F5E8D4;
  --rc-bg-card: #FFFAEC;
  --rc-paper: #F3DEB5;
  --rc-ink-0: #1F1A14;
  --rc-ink-1: #3D332A;
  --rc-ink-2: #6F5E4C;
  --rc-ink-3: #A8957D;
  --rc-line: rgba(31, 26, 20, 0.10);
  --rc-accent: #B0542D;
  --rc-accent-deep: #8E3C20;
  --rc-gold: #E8A04C;
  --rc-ease: cubic-bezier(0.32, 0.72, 0, 1);

  min-height: 100%;
  background: var(--rc-bg-0);
  color: var(--rc-ink-0);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 110px;
  background-image:
    radial-gradient(circle at 24% 8%, rgba(31,26,20,0.022) 1px, transparent 1px),
    radial-gradient(circle at 78% 60%, rgba(31,26,20,0.018) 1px, transparent 1px);
  background-size: 30px 30px, 48px 48px;
  position: relative;
}
.rc-shell-dark {
  background: #0E0B08;
  color: #FFFAEC;
}

/* Auto dark mode — follow OS preference. The light .rc-shell-dark class
 * above stays for explicit phases (generating overlay) that want dark
 * regardless of theme. */
@media (prefers-color-scheme: dark) {
  .rc-shell {
    --rc-bg-0: #161210;
    --rc-bg-card: #1F1A14;
    --rc-paper: #2A2218;
    --rc-ink-0: #FAF0DC;
    --rc-ink-1: #E0D2BD;
    --rc-ink-2: #B0997C;
    --rc-ink-3: #806A56;
    --rc-line: rgba(255,250,236,0.10);
    --rc-accent: #D67A50;
    --rc-accent-deep: #B0542D;
    --rc-gold: #E8A04C;
  }
}

/* Hero */
.rc-shell .rc-hero { padding: 14px 20px 0; }
.rc-shell .rc-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--rc-ink-3);
  margin-bottom: 6px;
}
.rc-shell .rc-hero-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 36px; line-height: 0.96;
  letter-spacing: -0.02em;
  font-weight: 400;
  color: var(--rc-ink-0);
  margin: 0;
}
.rc-shell .rc-hero-title em { font-style: italic; color: var(--rc-accent); }
.rc-shell .rc-hero-sub {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--rc-ink-2);
  line-height: 1.55;
  max-width: 340px;
}

/* Sections */
.rc-shell .rc-section { padding: 22px 20px 0; }
.rc-shell .rc-section-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
  margin-bottom: 10px;
}
.rc-shell .rc-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--rc-ink-3);
}
.rc-shell .rc-section-head small {
  font-size: 11px;
  color: var(--rc-ink-3);
}

/* Pick cards */
.rc-shell .rc-pick-cards {
  display: flex; flex-direction: column;
  gap: 10px;
}
.rc-shell .rc-pick-card {
  display: flex; align-items: center; gap: 14px;
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-line);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s var(--rc-ease);
}
.rc-shell .rc-pick-card:active { transform: scale(0.98); }
.rc-shell .rc-pick-card:disabled { opacity: 0.5; cursor: not-allowed; }
.rc-shell .rc-pick-primary {
  background: var(--rc-ink-0);
  color: var(--rc-bg-card);
  border-color: var(--rc-ink-0);
}
.rc-shell .rc-pick-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--rc-paper);
  color: var(--rc-accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.rc-shell .rc-pick-primary .rc-pick-icon {
  background: rgba(255, 250, 236, 0.12);
  color: var(--rc-gold);
}
.rc-shell .rc-pick-info { flex: 1; min-width: 0; }
.rc-shell .rc-pick-info strong {
  display: block;
  font-size: 14px;
  margin-bottom: 2px;
}
.rc-shell .rc-pick-info small {
  font-size: 11px;
  color: var(--rc-ink-3);
}
.rc-shell .rc-pick-primary .rc-pick-info small {
  color: rgba(255, 250, 236, 0.6);
}
.rc-shell .rc-pick-arrow {
  color: var(--rc-ink-3);
  flex-shrink: 0;
}
.rc-shell .rc-pick-primary .rc-pick-arrow {
  color: rgba(255, 250, 236, 0.4);
}

/* Tips */
.rc-shell .rc-tips {
  display: flex; flex-direction: column;
  gap: 12px;
}
.rc-shell .rc-tip {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px;
  background: rgba(255, 252, 245, 0.4);
  border-radius: 12px;
  border: 1px dashed var(--rc-line);
}
.rc-shell .rc-tip-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--rc-accent);
  flex-shrink: 0;
}
.rc-shell .rc-tip strong {
  display: block;
  font-size: 13px;
  color: var(--rc-ink-0);
  margin-bottom: 2px;
}
.rc-shell .rc-tip small {
  font-size: 11px;
  color: var(--rc-ink-2);
}

/* Preview stage (phase 2) */
.rc-shell .rc-preview-stage {
  position: relative;
  margin: 14px 20px 0;
  border-radius: 18px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 9/16;
  max-height: 55vh;
}
.rc-shell .rc-preview-video {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  cursor: pointer;
}
.rc-shell .rc-preview-swap {
  position: absolute; top: 10px; left: 10px;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 10px;
  background: rgba(255, 250, 236, 0.92);
  border: none;
  border-radius: 999px;
  color: var(--rc-ink-0);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.rc-shell .rc-preview-badge {
  position: absolute; top: 10px; right: 10px;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px;
  background: rgba(20, 16, 14, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 999px;
  color: rgba(255, 250, 236, 0.95);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
}

/* Character grid (phase 2) */
.rc-shell .rc-char-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.rc-shell .rc-char-card {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s var(--rc-ease);
}
.rc-shell .rc-char-card:active { transform: scale(0.95); }
.rc-shell .rc-char-img {
  width: 100%;
  aspect-ratio: 3/4;
  background-size: cover; background-position: center;
  border-radius: 14px;
  border: 1.5px solid var(--rc-line);
  margin-bottom: 6px;
}
.rc-shell .rc-char-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--rc-ink-1);
  padding: 0 4px;
}
.rc-shell .rc-char-upload {
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px;
  background: transparent;
  border: 1px dashed var(--rc-line);
  border-radius: 12px;
  color: var(--rc-ink-2);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.rc-shell .rc-char-upload:active { background: var(--rc-paper); }

/* Photo grid (phase 2B — pick which look/outfit) */
.rc-shell .rc-photo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}
.rc-shell .rc-photo-tile {
  position: relative;
  aspect-ratio: 3/4;
  background: var(--rc-paper);
  border: 1.5px solid var(--rc-line);
  border-radius: 12px;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  transition: transform 0.2s var(--rc-ease), border-color 0.2s var(--rc-ease);
}
.rc-shell .rc-photo-tile:active {
  transform: scale(0.96);
  border-color: var(--rc-accent);
}
.rc-shell .rc-photo-tile img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.rc-shell .rc-photo-pin {
  position: absolute;
  top: 6px; left: 6px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--rc-gold);
  color: var(--rc-ink-0);
  font-size: 10px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
}
.rc-shell .rc-photo-label {
  position: absolute;
  bottom: 4px; left: 4px; right: 4px;
  padding: 2px 6px;
  background: rgba(20, 16, 14, 0.72);
  backdrop-filter: blur(6px);
  border-radius: 5px;
  color: rgba(255, 250, 236, 0.92);
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
}

/* Empty chars */
.rc-shell .rc-empty-chars {
  text-align: center;
  padding: 40px 20px;
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-line);
  border-radius: 16px;
  margin-bottom: 14px;
}
.rc-shell .rc-empty-chars-icon {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--rc-paper);
  color: var(--rc-accent);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
}
.rc-shell .rc-empty-chars strong {
  display: block;
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 400;
  color: var(--rc-ink-0);
  margin-bottom: 4px;
}
.rc-shell .rc-empty-chars small {
  display: block;
  font-size: 12px;
  color: var(--rc-ink-2);
  margin-bottom: 14px;
}
.rc-shell .rc-empty-cta {
  padding: 9px 18px;
  background: var(--rc-ink-0);
  color: var(--rc-bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* Config top bar (phase 3) */
.rc-shell .rc-config-topbar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top)) 16px 10px;
  background: linear-gradient(180deg, var(--rc-bg-0) 0%, var(--rc-bg-0) 80%, transparent 100%);
  backdrop-filter: blur(8px);
}
.rc-shell .rc-back-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-line);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--rc-ink-1);
  -webkit-tap-highlight-color: transparent;
}
.rc-shell .rc-config-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rc-ink-2);
  display: flex; align-items: center; gap: 8px;
}
.rc-shell .rc-config-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--rc-accent);
}
.rc-shell .rc-config-credits {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 11px;
  background: var(--rc-bg-card);
  border-radius: 999px;
  border: 1px solid var(--rc-line);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--rc-ink-0);
  font-weight: 500;
}
.rc-shell .rc-config-dot-gold {
  background: var(--rc-gold);
  width: 5px; height: 5px;
}

/* Stack (phase 3) — source video + char image side by side */
.rc-shell .rc-stack {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 20px 20px 4px;
}
.rc-shell .rc-stack-video,
.rc-shell .rc-stack-char {
  flex: 1;
  position: relative;
  aspect-ratio: 3/4;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  border: 1px solid var(--rc-line);
  max-width: 40%;
}
.rc-shell .rc-stack-video video,
.rc-shell .rc-stack-char img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.rc-shell .rc-stack-arrow {
  display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  color: var(--rc-accent);
  flex-shrink: 0;
}
.rc-shell .rc-stack-arrow small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rc-accent-deep);
}
.rc-shell .rc-stack-label {
  position: absolute;
  bottom: 4px; left: 4px; right: 4px;
  padding: 3px 8px;
  background: rgba(20, 16, 14, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  color: rgba(255, 250, 236, 0.95);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
}

/* Tier row */
.rc-shell .rc-tier-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.rc-shell .rc-tier {
  padding: 13px;
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-line);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s var(--rc-ease);
}
.rc-shell .rc-tier.is-active {
  background: linear-gradient(180deg, var(--rc-bg-card) 0%, #F8EBC8 100%);
  border-color: var(--rc-accent);
}
.rc-shell .rc-tier-name {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 13px; font-weight: 600;
  color: var(--rc-ink-0);
}
.rc-shell .rc-tier-name.rc-tier-pro { color: var(--rc-accent-deep); }
.rc-shell .rc-tier-sub {
  font-size: 10px;
  color: var(--rc-ink-3);
  margin-top: 2px;
}
.rc-shell .rc-tier-cost {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--rc-ink-0);
  margin-top: 8px;
}

/* Cost box */
.rc-shell .rc-cost-box {
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-line);
  border-radius: 14px;
  padding: 14px 16px;
}
.rc-shell .rc-cost-row {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px;
  color: var(--rc-ink-1);
  padding: 4px 0;
}
.rc-shell .rc-cost-row span:first-child { color: var(--rc-ink-2); }
.rc-shell .rc-cost-row.rc-cost-total { font-size: 14px; }
.rc-shell .rc-cost-row.rc-cost-total strong {
  font-size: 18px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--rc-ink-0);
}
.rc-shell .rc-cost-divider {
  height: 1px;
  background: var(--rc-line);
  margin: 6px 0;
}

.rc-shell .rc-spacer { height: 24px; }

/* Sticky CTA */
.rc-shell .rc-cta-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex; align-items: center;
  padding: 12px 20px max(16px, env(safe-area-inset-bottom));
  background: rgba(245, 232, 212, 0.94);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--rc-line);
  z-index: 20;
}
.rc-shell .rc-cta-btn {
  flex: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px;
  background: var(--rc-ink-0);
  color: var(--rc-bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14px; font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s var(--rc-ease);
}
.rc-shell .rc-cta-btn:active { transform: scale(0.98); }
.rc-shell .rc-cta-btn:disabled {
  background: var(--rc-ink-3);
  cursor: not-allowed;
  transform: none;
}

/* Generating */
.rc-shell .rc-gen-bg {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(28px) brightness(0.6);
  transform: scale(1.1);
}
.rc-shell .rc-gen-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(14,11,8,0.4) 0%, rgba(14,11,8,0.85) 60%);
}
.rc-shell .rc-gen-content {
  position: relative;
  z-index: 2;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 100vh;
  padding: 40px 30px;
  color: #FFFAEC;
  text-align: center;
}
.rc-shell .rc-gen-pulse {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: var(--rc-accent);
  display: flex; align-items: center; justify-content: center;
  color: #FFFAEC;
  margin-bottom: 28px;
  animation: rc-pulse 2s ease-in-out infinite;
  box-shadow: 0 0 60px rgba(176, 84, 45, 0.5);
}
.rc-shell .rc-gen-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 400;
  margin: 0 0 6px;
  line-height: 1.1;
}
.rc-shell .rc-gen-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 250, 236, 0.65);
  margin: 12px 0 28px;
}
.rc-shell .rc-gen-bars {
  display: flex; gap: 4px;
  margin-bottom: 28px;
}
.rc-shell .rc-gen-bars span {
  width: 4px; height: 32px;
  background: var(--rc-accent);
  border-radius: 2px;
  animation: rc-bar 1.4s ease-in-out infinite;
}
.rc-shell .rc-gen-bars span:nth-child(2) { animation-delay: 0.15s; background: var(--rc-gold); }
.rc-shell .rc-gen-bars span:nth-child(3) { animation-delay: 0.3s; background: var(--rc-accent); }
.rc-shell .rc-gen-bars span:nth-child(4) { animation-delay: 0.45s; background: var(--rc-gold); }
.rc-shell .rc-gen-bars span:nth-child(5) { animation-delay: 0.6s; background: var(--rc-accent); }
.rc-shell .rc-gen-tip {
  font-size: 12px;
  color: rgba(255, 250, 236, 0.5);
  max-width: 280px;
  margin: 0 0 24px;
  line-height: 1.55;
}
.rc-shell .rc-gen-cancel {
  padding: 9px 18px;
  background: transparent;
  color: rgba(255, 250, 236, 0.85);
  border: 1px solid rgba(255, 250, 236, 0.25);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
@keyframes rc-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.95; }
}
@keyframes rc-bar {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

/* Result */
.rc-shell-dark .rc-result-stage {
  position: relative;
  margin: 0 16px;
  border-radius: 18px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 9/16;
  max-height: 70vh;
}
.rc-shell-dark .rc-result-video {
  width: 100%; height: 100%;
  object-fit: contain;
  display: block;
  cursor: pointer;
}
.rc-shell-dark .rc-result-play {
  position: absolute; bottom: 14px; right: 14px;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 250, 236, 0.15);
  color: rgba(255, 250, 236, 0.95);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.rc-shell-dark .rc-result-actions {
  display: flex; gap: 8px;
  padding: 18px 16px 8px;
}
.rc-shell-dark .rc-result-btn {
  flex: 1;
  display: inline-flex; flex-direction: column;
  align-items: center; gap: 5px;
  padding: 12px 6px;
  background: rgba(255, 250, 236, 0.06);
  border: 1px solid rgba(255, 250, 236, 0.12);
  border-radius: 12px;
  color: rgba(255, 250, 236, 0.9);
  font-family: inherit;
  font-size: 11px; font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.rc-shell-dark .rc-result-btn-primary {
  background: var(--rc-accent);
  border-color: var(--rc-accent);
  color: #FFFAEC;
}
.rc-shell-dark .rc-result-info {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px;
}
.rc-shell-dark .rc-result-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  background: rgba(255, 250, 236, 0.08);
  border: 1px solid rgba(255, 250, 236, 0.15);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 250, 236, 0.85);
}
.rc-shell-dark .rc-result-saved {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 250, 236, 0.5);
}
`;
