/**
 * Personajes — Mobile character roster + lookbook-style detail page.
 *
 *   Roster: magazine-style 2-col cards, filterable by render style.
 *   Detail: hero + refs gallery (active/inactive curation) + universo + stats
 *           + quick launch to apps + filtered gallery feed of this character.
 *
 * Mood: Atelier (cream + terracotta + clay) — same family as CrearPersonaje
 * since Personajes is the home for everything you create there.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, Sparkles, Aperture, Wand, Camera, Images,
  Check, Plus, Trash2, Calendar, Activity, MoreVertical, Edit2,
  Volume2, ChevronRight, X, Loader, Zap,
} from 'lucide-react';
import VoicePicker, { type VoiceAssignment } from '../components/VoicePicker';
import { generateSpeech } from '../services/elevenLabsService';
import { VOICE_SAMPLE_TEXT_ES } from '../data/voiceLibrary';
import { enrichAnchor, isAnchorOldFormat } from '../services/promptCompiler';
import type { Page } from '../App';
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore';
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../services/nativeService';
import { AppTopBar, AppEmptyState, type AppMood } from '../components/apps/_shared';

const ATELIER_MOOD: AppMood = {
  bg0: '#F5EBDB',
  bgCard: '#FFFCF5',
  paper: '#F8EFDD',
  ink0: '#1F1A14',
  ink1: '#3D332A',
  ink2: '#6F5E4C',
  ink3: '#A8957D',
  line: 'rgba(31, 26, 20, 0.10)',
  accent: '#C9785C',
  accentDeep: '#8E5640',
  gold: '#D4A85F',
};

interface Props {
  onNav: (p: Page) => void;
}

type FilterId = 'all' | 'photorealistic' | 'anime' | '3d-render' | 'illustration' | 'recent';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',            label: 'Todos' },
  { id: 'recent',         label: 'Recientes' },
  { id: 'photorealistic', label: 'Foto' },
  { id: 'anime',          label: 'Anime' },
  { id: '3d-render',      label: '3D' },
  { id: 'illustration',   label: 'Ilustración' },
];

const RENDER_STYLE_LABELS: Record<string, string> = {
  photorealistic: 'Fotorealista',
  anime: 'Anime',
  '3d-render': '3D',
  illustration: 'Ilustración',
  stylized: 'Estilizado',
  'pixel-art': 'Pixel art',
};

// ─── Helpers ────────────────────────────────────

function getAllCharacterPhotos(c: SavedCharacter): string[] {
  // Combine cloud URLs and local blob previews into one ordered array.
  // Active refs first (the ones apps actually read), then any extras.
  const refs = (c.referencePhotoUrls ?? []).filter(u => typeof u === 'string' && u.length > 0);
  const models = (c.modelImageUrls ?? []).filter(u => typeof u === 'string' && u.length > 0);
  // Inactive = in modelImageUrls but NOT in referencePhotoUrls
  const refsSet = new Set(refs);
  const inactive = models.filter(u => !refsSet.has(u));
  return [...refs, ...inactive];
}

function characterMeta(c: SavedCharacter): string {
  // Extract gender / age / ethnicity from characteristics for display.
  // characteristics is a comma-joined English bio. Best-effort parse.
  const chars = c.characteristics || '';
  const parts: string[] = [];
  // Try to find gender (Femenino / Masculino / Non-binary)
  const genderMatch = chars.match(/^(Femenino|Masculino|Non-binary|Mujer|Hombre|Female|Male)/i);
  if (genderMatch) parts.push(genderMatch[1].slice(0, 1).toUpperCase());
  // Find age "X años"
  const ageMatch = chars.match(/(\d{1,2})\s+años/);
  if (ageMatch) parts.push(`${ageMatch[1]}`);
  // Render style
  if (c.renderStyle) parts.push(RENDER_STYLE_LABELS[c.renderStyle] || c.renderStyle);
  return parts.filter(Boolean).join(' · ');
}

// ─── Component ─────────────────────────────────

export default function Personajes({ onNav }: Props) {
  const characters = useCharacterStore(s => s.characters);
  const updateCharacter = useCharacterStore(s => s.updateCharacter);
  const removeCharacter = useCharacterStore(s => s.removeCharacter);
  const galleryItems = useGalleryStore(s => s.items);
  const { profile } = useProfile();
  const toast = useToast();

  const [view, setView] = useState<'roster' | 'detail'>('roster');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');

  const credits = profile?.creditsRemaining ?? 0;

  const selectedChar = useMemo(
    () => characters.find(c => c.id === selectedCharId) ?? null,
    [characters, selectedCharId],
  );

  // ─── Filtered roster ───
  const filteredCharacters = useMemo(() => {
    if (filter === 'all') return characters;
    if (filter === 'recent') {
      // Last 7 days, sorted by createdAt desc
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return characters.filter(c => (c.createdAt || 0) > weekAgo);
    }
    return characters.filter(c => (c.renderStyle || 'photorealistic') === filter);
  }, [characters, filter]);

  // ─── Detail view actions ───
  const openDetail = (id: string) => {
    hapticLight();
    setSelectedCharId(id);
    setView('detail');
  };

  const closeDetail = () => {
    hapticLight();
    setView('roster');
    setSelectedCharId(null);
  };

  // ─── EMPTY ROSTER ───
  if (characters.length === 0) {
    return (
      <div className="ch-shell">
        <style>{PERSONAJES_STYLES}</style>
        <AppTopBar mood={ATELIER_MOOD} title="Personajes · Atelier" credits={credits} onBack={() => onNav('studio')} />
        <AppEmptyState
          mood={ATELIER_MOOD}
          icon={<Aperture size={28} />}
          title={<>Tu roster está <em>vacío</em></>}
          sub="Crea tu primer personaje desde cero o sube fotos de uno que ya tienes."
          ctas={[
            { label: 'Crear personaje', icon: <Sparkles size={14} />, onClick: () => onNav('create'), variant: 'primary' },
          ]}
        />
      </div>
    );
  }

  // ─── DETAIL VIEW ───
  if (view === 'detail' && selectedChar) {
    return (
      <PersonajeDetail
        character={selectedChar}
        galleryItems={galleryItems.filter(g => g.characterId === selectedChar.id)}
        onBack={closeDetail}
        onNav={onNav}
        onUpdateCharacter={updateCharacter}
        onRemoveCharacter={(id) => {
          removeCharacter(id);
          closeDetail();
        }}
        credits={credits}
      />
    );
  }

  // ─── ROSTER VIEW ───
  return (
    <div className="ch-shell">
      <style>{PERSONAJES_STYLES}</style>

      <AppTopBar
        mood={ATELIER_MOOD}
        title="Personajes · Atelier"
        credits={credits}
        onBack={() => onNav('studio')}
      />

      {/* Hero */}
      <section className="ch-hero">
        <div className="ch-hero-eyebrow">Tu roster · {characters.length} {characters.length === 1 ? 'modelo' : 'modelos'}</div>
        <h1 className="ch-hero-title">
          Tu <em>atelier</em> de <br />personajes.
        </h1>
      </section>

      {/* Filter pills */}
      <div className="ch-filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`ch-filter ${filter === f.id ? 'is-active' : ''}`}
            onClick={() => { hapticLight(); setFilter(f.id); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Roster grid 2-col */}
      <section className="ch-roster">
        {filteredCharacters.length === 0 ? (
          <div className="ch-empty-filter">
            <p>No hay personajes con este filtro</p>
            <button className="ch-empty-btn" onClick={() => { hapticLight(); setFilter('all'); }}>Ver todos</button>
          </div>
        ) : (
          <div className="ch-grid">
            {filteredCharacters.map(c => {
              const photos = getAllCharacterPhotos(c);
              const cover = c.thumbnail || photos[0] || '';
              const meta = characterMeta(c);
              return (
                <button key={c.id} className="ch-card" onClick={() => openDetail(c.id)}>
                  <div
                    className="ch-card-img"
                    style={cover ? { backgroundImage: `url(${cover})` } : undefined}
                  />
                  <div className="ch-card-overlay">
                    <div className="ch-card-name">{c.name}</div>
                    {meta && <div className="ch-card-meta">{meta}</div>}
                    {c.usageCount > 0 && (
                      <div className="ch-card-stat">
                        <Activity size={9} />
                        {c.usageCount} {c.usageCount === 1 ? 'sesión' : 'sesiones'}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating + Crear */}
      <button
        className="ch-fab"
        onClick={() => { hapticMedium(); onNav('create'); }}
        aria-label="Crear personaje"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}

// ─── Detail page ────────────────────────────────

interface DetailProps {
  character: SavedCharacter;
  galleryItems: GalleryItem[];
  onBack: () => void;
  onNav: (p: Page) => void;
  onUpdateCharacter: (id: string, updates: Partial<SavedCharacter>) => void;
  onRemoveCharacter: (id: string) => void;
  credits: number;
}

function PersonajeDetail({ character: c, galleryItems, onBack, onNav, onUpdateCharacter, onRemoveCharacter, credits }: DetailProps) {
  const toast = useToast();

  // All photos = active refs + inactive (from modelImageUrls not in references)
  const activeRefs = useMemo(() => (c.referencePhotoUrls ?? []).filter(u => u && u.length > 0), [c.referencePhotoUrls]);
  const allModelImages = useMemo(() => (c.modelImageUrls ?? []).filter(u => u && u.length > 0), [c.modelImageUrls]);
  const refsSet = useMemo(() => new Set(activeRefs), [activeRefs]);
  const inactiveRefs = useMemo(() => allModelImages.filter(u => !refsSet.has(u)), [allModelImages, refsSet]);

  const cover = c.thumbnail || activeRefs[0] || allModelImages[0] || '';

  // ─── Lightbox ───
  const [lightbox, setLightbox] = useState<{ url: string; isActive: boolean } | null>(null);

  // ─── Confirm-delete state ───
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  // ─── Physical anchor editor (character.characteristics) ───
  // The text that gets injected as physical_anchor in EVERY generation prompt.
  // User can refine here to lock in proportions/skin/face details that refs miss.
  const [editingAnchor, setEditingAnchor] = useState(false);
  const [anchorDraft, setAnchorDraft] = useState('');
  const [enrichingAnchor, setEnrichingAnchor] = useState(false);

  const anchorIsOld = isAnchorOldFormat(c.characteristics);

  const handleEnrichAnchor = async () => {
    if (!c.characteristics?.trim()) {
      toast.error('No hay anchor para enriquecer. Editá manualmente primero.');
      return;
    }
    hapticMedium();
    setEnrichingAnchor(true);
    try {
      const enriched = await enrichAnchor(c.characteristics);
      if (enriched === c.characteristics) {
        toast.info('No se pudo enriquecer. Probá editar manualmente.');
        return;
      }
      onUpdateCharacter(c.id, { characteristics: enriched });
      toast.success('Anchor enriquecido ✓');
      hapticSuccess();
    } catch (err: any) {
      toast.error(`Falló: ${String(err?.message || err).slice(0, 80)}`);
      hapticError();
    } finally {
      setEnrichingAnchor(false);
    }
  };
  const [voicePreviewLoading, setVoicePreviewLoading] = useState(false);
  const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice state derived from character — null when no voice assigned yet
  const currentVoice: VoiceAssignment | null = c.voiceId
    ? {
        voiceId: c.voiceId,
        voiceName: c.voiceName ?? 'Sin nombre',
        voiceSource: c.voiceSource ?? 'cloned',
        voicePreviewUrl: c.voicePreviewUrl,
      }
    : null;

  const { decrementCredits, restoreCredits } = useProfile();

  // ─── Voice preview — generate a short sample and play it ───
  const playCurrentVoicePreview = async () => {
    if (!c.voiceId) return;
    // Stop existing preview
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current = null;
    }
    setVoicePreviewLoading(true);
    try {
      hapticLight();
      const { url } = await generateSpeech({
        text: VOICE_SAMPLE_TEXT_ES,
        voiceId: c.voiceId,
        modelId: 'eleven_multilingual_v2',
      });
      const audio = new Audio(url);
      voicePreviewAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        voicePreviewAudioRef.current = null;
      };
      await audio.play();
    } catch (err: any) {
      hapticError();
      toast.error(`Preview falló: ${String(err?.message || err).slice(0, 80)}`);
    } finally {
      setVoicePreviewLoading(false);
    }
  };

  // ─── Voice handlers — pass through to character store ───
  const handleVoiceChange = (voice: VoiceAssignment | null) => {
    if (!voice) {
      onUpdateCharacter(c.id, {
        voiceId: undefined,
        voiceName: undefined,
        voiceSource: undefined,
        voicePreviewUrl: undefined,
        voiceCreatedAt: undefined,
      });
      return;
    }
    onUpdateCharacter(c.id, {
      voiceId: voice.voiceId,
      voiceName: voice.voiceName,
      voiceSource: voice.voiceSource,
      voicePreviewUrl: voice.voicePreviewUrl,
      voiceCreatedAt: Date.now(),
    });
    toast.success(voice.voiceSource === 'cloned' ? 'Voz clonada ✓' : 'Voz asignada ✓');
  };

  // ─── Toggle ref active/inactive ───
  const toggleRef = (url: string) => {
    hapticLight();
    const isActive = refsSet.has(url);
    let newRefs: string[];
    if (isActive) {
      // Remove from active — but don't allow zero
      if (activeRefs.length <= 1) {
        toast.error('Al menos 1 referencia debe quedar activa');
        return;
      }
      newRefs = activeRefs.filter(u => u !== url);
    } else {
      // Add to top of active list
      newRefs = [url, ...activeRefs];
    }
    onUpdateCharacter(c.id, { referencePhotoUrls: newRefs });
  };

  // ─── Add gallery photo as reference ───
  const addGalleryAsRef = (url: string) => {
    hapticMedium();
    if (refsSet.has(url)) {
      toast.info('Ya está como referencia activa');
      return;
    }
    // Push to refs AND ensure it's in modelImageUrls
    const newRefs = [...activeRefs, url];
    const newModels = allModelImages.includes(url) ? allModelImages : [...allModelImages, url];
    onUpdateCharacter(c.id, {
      referencePhotoUrls: newRefs,
      modelImageUrls: newModels,
    });
    toast.success('Foto agregada como referencia');
  };

  // ─── Promote to thumbnail (move to position 0 of active refs + set thumbnail) ───
  const setAsCover = (url: string) => {
    hapticMedium();
    const newRefs = [url, ...activeRefs.filter(u => u !== url)];
    onUpdateCharacter(c.id, {
      referencePhotoUrls: newRefs,
      thumbnail: url,
    });
    toast.success('Portada actualizada');
  };

  // ─── Delete character ───
  const handleDelete = () => {
    hapticError();
    onRemoveCharacter(c.id);
    toast.success(`"${c.name}" eliminado`);
  };

  // ─── Open in app with this character pre-selected ───
  const openInApp = (page: Page) => {
    hapticLight();
    // Note: each app reads selectedCharId from its own state. For real
    // pre-selection we'd need a global "intended character" — for v1 the
    // user just picks the character chip in the app's character row.
    onNav(page);
  };

  return (
    <div className="ch-shell">
      <style>{PERSONAJES_STYLES}</style>

      {/* Top bar with back + delete menu */}
      <div className="ch-detail-topbar">
        <button className="ch-detail-back" onClick={onBack} aria-label="Volver">
          <ChevronLeft size={18} />
        </button>
        <span className="ch-detail-name">{c.name}</span>
        <button className="ch-detail-menu" onClick={() => { hapticLight(); setShowDeleteConfirm(true); }} aria-label="Más">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Hero zone */}
      <div className="ch-hero-zone">
        <div className="ch-hero-img" style={cover ? { backgroundImage: `url(${cover})` } : undefined} />
        <div className="ch-hero-fade" />
        <div className="ch-hero-content">
          <div className="ch-hero-meta">{characterMeta(c)}</div>
          <h1 className="ch-hero-name">{c.name}</h1>
        </div>
      </div>

      {/* Quick launch apps */}
      <section className="ch-section">
        <div className="ch-quick-grid">
          <button className="ch-quick-tile" onClick={() => openInApp('headshot')}>
            <Aperture size={18} />
            <span>Headshot Pro</span>
          </button>
          <button className="ch-quick-tile" onClick={() => openInApp('reimaginar')}>
            <Wand size={18} />
            <span>Reimaginar</span>
          </button>
          <button className="ch-quick-tile" onClick={() => openInApp('sesion')}>
            <Camera size={18} />
            <span>Sesión Fotos</span>
          </button>
          <button className="ch-quick-tile" onClick={() => onNav('gallery')}>
            <Images size={18} />
            <span>Galería</span>
          </button>
        </div>
      </section>

      {/* Active references */}
      <section className="ch-section">
        <div className="ch-field-head">
          <span className="ch-field-name">Referencias activas</span>
          <span className="ch-field-hint">{activeRefs.length} en uso · primera = portada</span>
        </div>
        {activeRefs.length === 0 ? (
          <div className="ch-empty-refs">Sin referencias activas — activá al menos 1 abajo.</div>
        ) : (
          <div className="ch-refs-grid">
            {activeRefs.map((url, i) => (
              <div key={url + i} className="ch-ref-tile is-active">
                <button
                  className="ch-ref-img-btn"
                  onClick={() => setLightbox({ url, isActive: true })}
                >
                  <img src={url} alt={`Ref ${i + 1}`} />
                </button>
                {i === 0 && <div className="ch-ref-badge">Portada</div>}
                <button className="ch-ref-toggle is-on" onClick={() => toggleRef(url)} title="Desactivar">
                  <Check size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Inactive references (extras) */}
      {inactiveRefs.length > 0 && (
        <section className="ch-section">
          <div className="ch-field-head">
            <span className="ch-field-name">Otras fotos del personaje</span>
            <span className="ch-field-hint">{inactiveRefs.length} guardadas · tap + para activar</span>
          </div>
          <div className="ch-refs-grid">
            {inactiveRefs.map((url, i) => (
              <div key={url + i} className="ch-ref-tile">
                <button
                  className="ch-ref-img-btn"
                  onClick={() => setLightbox({ url, isActive: false })}
                >
                  <img src={url} alt={`Foto ${i + 1}`} className="is-dim" />
                </button>
                <button className="ch-ref-toggle" onClick={() => toggleRef(url)} title="Activar">
                  <Plus size={11} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Universo (bio) */}
      <section className="ch-section">
        <div className="ch-field-head">
          <span className="ch-field-name">Universo</span>
        </div>
        <div className="ch-universo">
          {c.personalityTraits && c.personalityTraits.length > 0 && (
            <div className="ch-uni-row">
              <span className="ch-uni-label">Vibe</span>
              <div className="ch-uni-chips">
                {c.personalityTraits.map(t => (
                  <span key={t} className="ch-uni-chip">{t}</span>
                ))}
              </div>
            </div>
          )}
          {c.renderStyle && (
            <div className="ch-uni-row">
              <span className="ch-uni-label">Render</span>
              <span className="ch-uni-value">{RENDER_STYLE_LABELS[c.renderStyle] || c.renderStyle}</span>
            </div>
          )}
          {c.accessory && (
            <div className="ch-uni-row">
              <span className="ch-uni-label">Accesorios</span>
              <span className="ch-uni-value">{c.accessory}</span>
            </div>
          )}
          {c.characteristics && (
            <div className="ch-uni-bio">
              {c.characteristics.length > 280
                ? c.characteristics.slice(0, 280) + '…'
                : c.characteristics}
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="ch-section">
        <div className="ch-stats-grid">
          <div className="ch-stat">
            <span className="ch-stat-num">{c.usageCount || 0}</span>
            <span className="ch-stat-label">Sesiones</span>
          </div>
          <div className="ch-stat">
            <span className="ch-stat-num">{galleryItems.length}</span>
            <span className="ch-stat-label">Fotos generadas</span>
          </div>
          <div className="ch-stat">
            <span className="ch-stat-num">{activeRefs.length + inactiveRefs.length}</span>
            <span className="ch-stat-label">Refs guardadas</span>
          </div>
        </div>
        {c.createdAt && (
          <div className="ch-meta-row">
            <Calendar size={11} />
            <span>Creado {new Date(c.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        )}
      </section>

      {/* Anchor físico — la descripción que se inyecta en TODOS los prompts */}
      <section className="ch-section">
        <div className="ch-field-head">
          <span className="ch-field-name">Anchor físico</span>
          <span className="ch-field-hint">
            Texto que se inyecta en TODOS los prompts (Reimaginar, Editor, Studio).
            Cuanto más específico, más consistente queda tu personaje.
          </span>
        </div>

        {/* Old-format banner — only shows when the anchor was created with the
            old buildDescription (label-only, no texture clauses). Click to
            auto-upgrade via Gemini Flash Lite. */}
        {anchorIsOld && !editingAnchor && (
          <button
            className="ch-anchor-banner"
            onClick={handleEnrichAnchor}
            disabled={enrichingAnchor}
          >
            <div className="ch-anchor-banner-icon">
              {enrichingAnchor ? <Loader size={14} className="ch-spin" /> : <Zap size={14} />}
            </div>
            <div className="ch-anchor-banner-text">
              <strong>{enrichingAnchor ? 'Enriqueciendo…' : 'Anchor en formato viejo'}</strong>
              <small>
                {enrichingAnchor
                  ? 'Gemini está expandiendo a prosa técnica…'
                  : 'Tap para enriquecer con texturas, proporciones y física real'}
              </small>
            </div>
            {!enrichingAnchor && <ChevronRight size={14} className="ch-anchor-banner-arrow" />}
          </button>
        )}

        {editingAnchor ? (
          <div className="ch-anchor-edit">
            <textarea
              className="ch-anchor-textarea"
              value={anchorDraft}
              onChange={e => setAnchorDraft(e.target.value)}
              rows={8}
              placeholder="Ej: Sculpted hourglass figure, deep waist-to-hip ratio, prominent full heavy bust, ultra-realistic skin with visible pores and vellus hair..."
              autoFocus
            />
            <div className="ch-anchor-actions">
              <button
                className="ch-anchor-cancel"
                onClick={() => { hapticLight(); setEditingAnchor(false); }}
              >
                Cancelar
              </button>
              <button
                className="ch-anchor-save"
                onClick={() => {
                  hapticSuccess();
                  onUpdateCharacter(c.id, { characteristics: anchorDraft.trim() });
                  toast.success('Anchor actualizado');
                  setEditingAnchor(false);
                }}
              >
                Guardar
              </button>
            </div>
            <div className="ch-anchor-tip">
              <strong>Tip:</strong> incluí proporciones (waist-to-hip ratio, bust volume,
              glúteo projection), textura de piel (pores, vellus hair, undertone) y
              geometría de cara (jaw, lips, nose, eye shape). Sé técnico y preciso.
            </div>
          </div>
        ) : (
          <div className="ch-anchor-display">
            <div className="ch-anchor-text">
              {c.characteristics?.trim() || (
                <em className="ch-anchor-empty">Sin descripción física. Tap "Editar" para escribir una.</em>
              )}
            </div>
            <button
              className="ch-anchor-edit-btn"
              onClick={() => {
                hapticLight();
                setAnchorDraft(c.characteristics || '');
                setEditingAnchor(true);
              }}
            >
              <Edit2 size={11} />
              Editar
            </button>
          </div>
        )}
      </section>

      {/* Voz del personaje */}
      <section className="ch-section">
        <div className="ch-field-head">
          <span className="ch-field-name">Voz</span>
          <span className="ch-field-hint">
            {currentVoice
              ? 'La voz que usa el personaje para hablar'
              : 'Asigná una voz para Recast y futuras features'}
          </span>
        </div>

        {currentVoice ? (
          <div className="ch-voice-card">
            <button
              className="ch-voice-play"
              onClick={playCurrentVoicePreview}
              disabled={voicePreviewLoading}
              aria-label="Reproducir muestra"
            >
              <Volume2 size={16} />
            </button>
            <div className="ch-voice-info">
              <strong>{currentVoice.voiceName}</strong>
              <small>
                {currentVoice.voiceSource === 'cloned'
                  ? 'Voz clonada de tu grabación'
                  : currentVoice.voiceSource === 'library'
                    ? 'Voz de la biblioteca'
                    : 'Voz compartida'}
              </small>
            </div>
            <button
              className="ch-voice-edit"
              onClick={() => { hapticLight(); setShowVoicePicker(true); }}
            >
              Cambiar
            </button>
          </div>
        ) : (
          <button
            className="ch-voice-empty"
            onClick={() => { hapticLight(); setShowVoicePicker(true); }}
          >
            <div className="ch-voice-empty-icon"><Volume2 size={18} /></div>
            <div className="ch-voice-empty-info">
              <strong>Sin voz</strong>
              <small>Tap para asignar una</small>
            </div>
            <ChevronRight size={14} />
          </button>
        )}
      </section>

      {/* Galería filtrada — fotos generadas con este personaje */}
      {galleryItems.length > 0 && (
        <section className="ch-section">
          <div className="ch-field-head">
            <span className="ch-field-name">Galería de {c.name}</span>
            <span className="ch-field-hint">{galleryItems.length} fotos · tap para usar como ref</span>
          </div>
          <div className="ch-gallery-grid">
            {galleryItems.slice(0, 24).map(g => (
              <div key={g.id} className="ch-gallery-tile">
                <button
                  className="ch-gallery-img-btn"
                  onClick={() => setLightbox({ url: g.url, isActive: refsSet.has(g.url) })}
                >
                  <img src={g.url} alt={g.prompt} />
                </button>
                {refsSet.has(g.url) ? (
                  <div className="ch-gallery-badge">Ref</div>
                ) : (
                  <button
                    className="ch-gallery-add"
                    onClick={() => addGalleryAsRef(g.url)}
                    title="Agregar como referencia"
                  >
                    <Plus size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {galleryItems.length > 24 && (
            <div className="ch-gallery-more">
              <button className="ch-action-ghost" onClick={() => onNav('gallery')}>
                Ver todas ({galleryItems.length}) en Galería →
              </button>
            </div>
          )}
        </section>
      )}

      {/* Avanzado */}
      <section className="ch-section">
        <button className="ch-toggle-btn" onClick={() => { hapticLight(); setShowAdvanced(v => !v); }}>
          <Edit2 size={14} />
          <span>Acciones avanzadas</span>
        </button>
        {showAdvanced && (
          <div className="ch-advanced">
            <button className="ch-advanced-btn" onClick={() => onNav('create')}>
              <Plus size={14} />
              <span>Crear otro personaje</span>
            </button>
            <button className="ch-advanced-btn cp-danger" onClick={() => { hapticError(); setShowDeleteConfirm(true); }}>
              <Trash2 size={14} />
              <span>Eliminar este personaje</span>
            </button>
          </div>
        )}
      </section>

      <div className="ch-bottom-pad" />

      {/* Voice picker modal — bottom sheet */}
      {showVoicePicker && (
        <div className="ch-voice-modal" onClick={() => setShowVoicePicker(false)}>
          <div className="ch-voice-sheet" onClick={e => e.stopPropagation()}>
            <div className="ch-voice-sheet-handle" />
            <div className="ch-voice-sheet-head">
              <h3>Voz de {c.name}</h3>
              <button
                className="ch-voice-sheet-close"
                onClick={() => setShowVoicePicker(false)}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="ch-voice-sheet-body">
              <VoicePicker
                characterName={c.name}
                current={currentVoice}
                credits={credits}
                onChange={handleVoiceChange}
                onClear={() => handleVoiceChange(null)}
                onError={(m) => toast.error(m)}
                onInfo={(m) => toast.info(m)}
                onChargeClone={async (cost) => await decrementCredits(cost)}
                onRefund={(cost) => restoreCredits(cost)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="ch-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt="Vista" className="ch-lightbox-img" />
          <div className="ch-lightbox-actions" onClick={e => e.stopPropagation()}>
            {lightbox.isActive ? (
              <>
                <button className="ch-lb-btn" onClick={() => { setAsCover(lightbox.url); setLightbox(null); }}>
                  <Aperture size={13} /> Hacer portada
                </button>
                <button className="ch-lb-btn" onClick={() => { toggleRef(lightbox.url); setLightbox(null); }}>
                  Desactivar
                </button>
              </>
            ) : (
              <button className="ch-lb-btn is-on" onClick={() => {
                if (allModelImages.includes(lightbox.url)) {
                  toggleRef(lightbox.url);
                } else {
                  addGalleryAsRef(lightbox.url);
                }
                setLightbox(null);
              }}>
                <Plus size={13} /> Activar como ref
              </button>
            )}
            <button className="ch-lb-btn" onClick={() => setLightbox(null)}>Cerrar</button>
          </div>
          <button className="ch-lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="ch-modal" onClick={() => setShowDeleteConfirm(false)}>
          <div className="ch-modal-card" onClick={e => e.stopPropagation()}>
            <h3>¿Eliminar a {c.name}?</h3>
            <p>Las {activeRefs.length + inactiveRefs.length} referencias se borran. Las fotos en Galería quedan.</p>
            <div className="ch-modal-actions">
              <button className="ch-action-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              <button className="ch-modal-danger" onClick={() => { setShowDeleteConfirm(false); handleDelete(); }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────

const PERSONAJES_STYLES = `
.ch-shell {
  --bg-0: #F5EBDB;
  --bg-card: #FFFCF5;
  --paper: #F8EFDD;
  --ink-0: #1F1A14;
  --ink-1: #3D332A;
  --ink-2: #6F5E4C;
  --ink-3: #A8957D;
  --line: rgba(31, 26, 20, 0.10);
  --accent: #C9785C;
  --accent-deep: #8E5640;
  --gold: #D4A85F;
  --reject: #B9544A;
  --ease: cubic-bezier(0.32, 0.72, 0, 1);

  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-0);
  color: var(--ink-0);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-bottom: calc(120px + env(safe-area-inset-bottom));
  position: relative;
  background-image:
    radial-gradient(circle at 20% 10%, rgba(31,26,20,0.025) 1px, transparent 1px),
    radial-gradient(circle at 80% 60%, rgba(31,26,20,0.02) 1px, transparent 1px);
  background-size: 28px 28px, 44px 44px;
}

/* Hero (roster) */
.ch-shell .ch-hero { padding: 6px 20px 0; }
.ch-shell .ch-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-3);
  margin-bottom: 8px;
}
.ch-shell .ch-hero-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 40px; line-height: 0.95;
  letter-spacing: -0.02em; color: var(--ink-0);
  font-weight: 400; margin: 0;
}
.ch-shell .ch-hero-title em { font-style: italic; color: var(--accent); }

/* Filter pills */
.ch-shell .ch-filters {
  display: flex; gap: 6px;
  margin: 22px 20px 0;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.ch-shell .ch-filters::-webkit-scrollbar { display: none; }
.ch-shell .ch-filter {
  flex-shrink: 0;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 12px; font-weight: 500;
  color: var(--ink-2);
  cursor: pointer; font-family: inherit;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-filter:active { transform: scale(0.95); }
.ch-shell .ch-filter.is-active {
  background: var(--ink-0); border-color: var(--ink-0); color: var(--bg-card);
}

/* Roster grid */
.ch-shell .ch-roster { padding: 16px 20px 0; }
.ch-shell .ch-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.ch-shell .ch-card {
  position: relative;
  aspect-ratio: 3/4;
  border-radius: 14px;
  overflow: hidden;
  background: #2A1F18;
  cursor: pointer;
  border: none;
  padding: 0;
  font-family: inherit;
  text-align: left;
  transition: transform 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-card:active { transform: scale(0.97); }
.ch-shell .ch-card-img {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
}
.ch-shell .ch-card::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%);
}
.ch-shell .ch-card-overlay {
  position: absolute;
  bottom: 12px; left: 14px; right: 14px;
  z-index: 2;
  color: #FFFCF5;
}
.ch-shell .ch-card-name {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px;
  font-style: italic;
  letter-spacing: -0.01em;
  line-height: 1;
}
.ch-shell .ch-card-meta {
  margin-top: 4px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.8;
}
.ch-shell .ch-card-stat {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 8px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(212, 168, 95, 1);
}

.ch-shell .ch-empty-filter {
  text-align: center;
  padding: 40px 20px;
  color: var(--ink-3);
  font-size: 13px;
}
.ch-shell .ch-empty-btn {
  margin-top: 12px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  color: var(--ink-1);
  cursor: pointer;
}

/* Floating + */
.ch-shell .ch-fab {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom));
  right: 20px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);
  color: #FFFCF5;
  border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 24px -8px rgba(142, 86, 64, 0.6);
  transition: transform 0.3s var(--ease);
  z-index: 30;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-fab:active { transform: scale(0.94); }

/* ────── DETAIL VIEW ────── */

.ch-shell .ch-detail-topbar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 10px;
  background: linear-gradient(180deg, var(--bg-0) 0%, var(--bg-0) 80%, transparent 100%);
  backdrop-filter: blur(8px);
}
.ch-shell .ch-detail-back, .ch-shell .ch-detail-menu {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-1); cursor: pointer;
  transition: transform 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-detail-back:active, .ch-shell .ch-detail-menu:active { transform: scale(0.92); }
.ch-shell .ch-detail-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink-2);
}

/* Hero zone (detail) */
.ch-shell .ch-hero-zone {
  position: relative;
  margin: 0 20px 0;
  border-radius: 18px;
  overflow: hidden;
  aspect-ratio: 4/5;
  background: var(--paper);
  box-shadow: 0 16px 32px -16px rgba(31, 26, 20, 0.18);
}
.ch-shell .ch-hero-img {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
}
.ch-shell .ch-hero-fade {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(20, 16, 14, 0.85) 100%);
}
.ch-shell .ch-hero-content {
  position: absolute;
  bottom: 24px; left: 22px; right: 22px;
  z-index: 2;
  color: #FFFCF5;
}
.ch-shell .ch-hero-meta {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.78;
  margin-bottom: 6px;
}
.ch-shell .ch-hero-name {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 48px; line-height: 0.95;
  font-style: italic;
  letter-spacing: -0.02em;
  margin: 0;
}

/* Sections */
.ch-shell .ch-section { padding: 22px 20px 0; }
.ch-shell .ch-field-head {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 10px;
}
.ch-shell .ch-field-name {
  font-size: 12px; font-weight: 600;
  color: var(--ink-1);
}
.ch-shell .ch-field-hint {
  font-size: 11px; color: var(--ink-3); font-style: italic;
}

/* Quick launch grid */
.ch-shell .ch-quick-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
}
.ch-shell .ch-quick-tile {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 14px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer; font-family: inherit;
  font-size: 13px; font-weight: 600;
  color: var(--ink-0);
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-quick-tile:active {
  transform: scale(0.97);
  border-color: var(--accent);
  color: var(--accent-deep);
}
.ch-shell .ch-quick-tile svg { color: var(--accent); flex-shrink: 0; }

/* Refs grid */
.ch-shell .ch-refs-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.ch-shell .ch-ref-tile {
  position: relative;
  aspect-ratio: 3/4;
  border-radius: 12px;
  overflow: hidden;
  background: var(--paper);
}
.ch-shell .ch-ref-tile.is-active { box-shadow: 0 0 0 2px var(--accent); }
.ch-shell .ch-ref-img-btn {
  display: block; width: 100%; height: 100%;
  background: transparent; border: none; padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-ref-img-btn img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform 0.2s var(--ease);
}
.ch-shell .ch-ref-img-btn img.is-dim { opacity: 0.6; filter: grayscale(0.3); }
.ch-shell .ch-ref-img-btn:active img { transform: scale(0.99); }
.ch-shell .ch-ref-badge {
  position: absolute; top: 6px; left: 6px;
  z-index: 2;
  padding: 3px 7px;
  background: var(--accent);
  color: #FFFCF5;
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; letter-spacing: 0.16em;
  text-transform: uppercase;
}
.ch-shell .ch-ref-toggle {
  position: absolute;
  bottom: 6px; right: 6px;
  z-index: 2;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.94);
  backdrop-filter: blur(8px);
  border: 1.5px solid var(--ink-2);
  color: var(--ink-1);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s var(--ease);
}
.ch-shell .ch-ref-toggle:active { transform: scale(0.92); }
.ch-shell .ch-ref-toggle.is-on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg-card);
}
.ch-shell .ch-empty-refs {
  padding: 16px;
  background: rgba(185, 84, 74, 0.08);
  border: 1px dashed var(--reject);
  border-radius: 10px;
  font-size: 12px;
  color: var(--reject);
  text-align: center;
}

/* Universo */
.ch-shell .ch-universo {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  display: flex; flex-direction: column;
  gap: 10px;
}
.ch-shell .ch-uni-row {
  display: flex; align-items: center; gap: 10px;
}
.ch-shell .ch-uni-label {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  width: 70px;
}
.ch-shell .ch-uni-value {
  font-size: 13px;
  color: var(--ink-1);
}
.ch-shell .ch-uni-chips {
  display: flex; flex-wrap: wrap; gap: 4px;
}
.ch-shell .ch-uni-chip {
  padding: 4px 10px;
  background: var(--paper);
  border-radius: 999px;
  font-size: 11px;
  color: var(--ink-1);
  font-weight: 500;
}
.ch-shell .ch-uni-bio {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
  color: var(--ink-2);
  line-height: 1.55;
  font-style: italic;
}

/* Stats */
.ch-shell .ch-stats-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.ch-shell .ch-stat {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 10px;
  text-align: center;
  display: flex; flex-direction: column; gap: 2px;
}
.ch-shell .ch-stat-num {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-style: italic;
  font-size: 26px;
  color: var(--ink-0);
  line-height: 1;
}
.ch-shell .ch-stat-label {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.ch-shell .ch-meta-row {
  display: flex; align-items: center; gap: 6px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--ink-3);
}

/* Gallery */
.ch-shell .ch-gallery-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
}
.ch-shell .ch-gallery-tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  background: var(--paper);
}
.ch-shell .ch-gallery-img-btn {
  display: block; width: 100%; height: 100%;
  background: transparent; border: none; padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-gallery-img-btn img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}
.ch-shell .ch-gallery-add {
  position: absolute;
  bottom: 4px; right: 4px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.94);
  backdrop-filter: blur(6px);
  border: 1.5px solid var(--accent);
  color: var(--accent-deep);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-gallery-add:active { transform: scale(0.9); }
.ch-shell .ch-gallery-badge {
  position: absolute;
  bottom: 4px; right: 4px;
  padding: 3px 7px;
  background: var(--accent);
  color: #FFFCF5;
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; letter-spacing: 0.14em;
  text-transform: uppercase;
}
.ch-shell .ch-gallery-more {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.ch-shell .ch-action-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 500;
  color: var(--ink-1);
  cursor: pointer;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-action-ghost:active { transform: scale(0.96); border-color: var(--accent); }

/* Toggle button */
.ch-shell .ch-toggle-btn {
  display: flex; align-items: center; gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  font-family: inherit;
  font-size: 13px; font-weight: 500;
  color: var(--ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-advanced {
  margin-top: 8px;
  display: flex; flex-direction: column; gap: 6px;
}
.ch-shell .ch-advanced-btn {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-family: inherit;
  font-size: 13px; font-weight: 500;
  color: var(--ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-advanced-btn:active { transform: scale(0.98); }
.ch-shell .ch-advanced-btn.cp-danger {
  color: var(--reject);
  border-color: rgba(185, 84, 74, 0.3);
}

.ch-shell .ch-bottom-pad { height: 40px; }

/* Anchor old-format upgrade banner */
.ch-shell .ch-anchor-banner {
  width: 100%;
  display: flex; align-items: center; gap: 12px;
  padding: 11px 13px;
  background: linear-gradient(180deg, var(--ch-bg-card) 0%, #FBF3E0 100%);
  border: 1.5px solid var(--ch-accent);
  border-radius: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s ease;
}
.ch-shell .ch-anchor-banner:active { transform: scale(0.99); }
.ch-shell .ch-anchor-banner:disabled { opacity: 0.7; cursor: default; }
.ch-shell .ch-anchor-banner-icon {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--ch-accent);
  color: var(--ch-bg-card);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ch-shell .ch-anchor-banner-text { flex: 1; min-width: 0; line-height: 1.3; }
.ch-shell .ch-anchor-banner-text strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ch-accent-deep);
}
.ch-shell .ch-anchor-banner-text small {
  display: block;
  font-size: 11px;
  color: var(--ch-ink-2);
  margin-top: 1px;
}
.ch-shell .ch-anchor-banner-arrow {
  color: var(--ch-accent);
  flex-shrink: 0;
}
.ch-shell .ch-spin {
  animation: ch-spin 1s linear infinite;
}
@keyframes ch-spin {
  to { transform: rotate(360deg); }
}

/* Physical Anchor display + editor */
.ch-shell .ch-anchor-display {
  background: var(--ch-bg-card);
  border: 1px solid var(--ch-line);
  border-radius: 14px;
  padding: 13px 14px;
  position: relative;
}
.ch-shell .ch-anchor-text {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  line-height: 1.55;
  color: var(--ch-ink-1);
  white-space: pre-wrap;
  padding-right: 70px;
}
.ch-shell .ch-anchor-empty {
  color: var(--ch-ink-3);
  font-style: italic;
}
.ch-shell .ch-anchor-edit-btn {
  position: absolute;
  top: 11px;
  right: 11px;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px;
  background: var(--ch-paper);
  border: 1px solid var(--ch-line);
  color: var(--ch-ink-1);
  border-radius: 999px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-anchor-edit-btn:active { transform: scale(0.95); }

.ch-shell .ch-anchor-edit {
  background: var(--ch-bg-card);
  border: 1.5px solid var(--ch-accent);
  border-radius: 14px;
  padding: 12px;
}
.ch-shell .ch-anchor-textarea {
  width: 100%;
  background: var(--ch-paper);
  border: 1px solid var(--ch-line);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  line-height: 1.55;
  color: var(--ch-ink-0);
  resize: vertical;
  outline: none;
}
.ch-shell .ch-anchor-textarea:focus { border-color: var(--ch-accent); }
.ch-shell .ch-anchor-actions {
  display: flex; gap: 8px;
  margin-top: 10px;
}
.ch-shell .ch-anchor-cancel,
.ch-shell .ch-anchor-save {
  flex: 1;
  padding: 10px;
  border-radius: 999px;
  border: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-anchor-cancel {
  background: var(--ch-paper);
  color: var(--ch-ink-1);
  border: 1px solid var(--ch-line);
}
.ch-shell .ch-anchor-save {
  background: var(--ch-ink-0);
  color: var(--ch-bg-card);
}
.ch-shell .ch-anchor-tip {
  margin-top: 10px;
  padding: 9px 11px;
  background: rgba(248, 239, 221, 0.55);
  border-radius: 9px;
  font-size: 11px;
  color: var(--ch-ink-2);
  line-height: 1.5;
}
.ch-shell .ch-anchor-tip strong {
  color: var(--ch-ink-0);
  font-weight: 600;
}

/* Voice card / empty */
.ch-shell .ch-voice-card {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 13px;
  background: linear-gradient(180deg, var(--ch-bg-card) 0%, #FBF3E0 100%);
  border: 1.5px solid var(--ch-accent);
  border-radius: 14px;
}
.ch-shell .ch-voice-play {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--ch-paper);
  border: 1px solid var(--ch-line);
  color: var(--ch-accent);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-voice-play:active { transform: scale(0.93); }
.ch-shell .ch-voice-play:disabled { opacity: 0.5; }
.ch-shell .ch-voice-info {
  flex: 1; min-width: 0; line-height: 1.25;
}
.ch-shell .ch-voice-info strong {
  display: block;
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 16px;
  font-weight: 400;
  color: var(--ch-ink-0);
  letter-spacing: -0.01em;
}
.ch-shell .ch-voice-info small {
  display: block;
  font-size: 11px;
  color: var(--ch-ink-2);
  margin-top: 1px;
}
.ch-shell .ch-voice-edit {
  padding: 7px 13px;
  background: var(--ch-ink-0);
  color: var(--ch-bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.ch-shell .ch-voice-empty {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 13px;
  background: var(--ch-bg-card);
  border: 1.5px dashed var(--ch-line);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--ch-ink-1);
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.2s ease;
}
.ch-shell .ch-voice-empty:active { border-color: var(--ch-accent); }
.ch-shell .ch-voice-empty-icon {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--ch-paper);
  color: var(--ch-accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ch-shell .ch-voice-empty-info { flex: 1; min-width: 0; line-height: 1.25; }
.ch-shell .ch-voice-empty-info strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ch-ink-0);
}
.ch-shell .ch-voice-empty-info small {
  display: block;
  font-size: 11px;
  color: var(--ch-ink-2);
  margin-top: 1px;
}

/* Voice modal — bottom sheet */
.ch-shell .ch-voice-modal {
  position: fixed; inset: 0;
  background: rgba(20, 16, 14, 0.55);
  backdrop-filter: blur(8px);
  z-index: 200;
  display: flex; align-items: flex-end;
  animation: ch-fade-in 0.2s ease;
}
.ch-shell .ch-voice-sheet {
  width: 100%;
  max-height: 92vh;
  background: var(--ch-bg-card);
  border-radius: 24px 24px 0 0;
  padding: 12px 18px max(20px, env(safe-area-inset-bottom));
  animation: ch-slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.ch-shell .ch-voice-sheet-handle {
  width: 36px; height: 4px;
  margin: 0 auto 14px;
  background: var(--ch-line);
  border-radius: 999px;
  flex-shrink: 0;
}
.ch-shell .ch-voice-sheet-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2px 14px;
  flex-shrink: 0;
}
.ch-shell .ch-voice-sheet-head h3 {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 400;
  margin: 0;
  color: var(--ch-ink-0);
}
.ch-shell .ch-voice-sheet-close {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--ch-paper);
  border: 1px solid var(--ch-line);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--ch-ink-1);
}
.ch-shell .ch-voice-sheet-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@keyframes ch-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ch-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Lightbox */
.ch-shell .ch-lightbox {
  position: fixed; inset: 0;
  background: rgba(20, 16, 14, 0.96);
  backdrop-filter: blur(10px);
  z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: ch-lb-fade 200ms ease-out;
}
@keyframes ch-lb-fade { from { opacity: 0; } to { opacity: 1; } }
.ch-shell .ch-lightbox-img {
  max-width: 100%; max-height: 70vh;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}
.ch-shell .ch-lightbox-actions {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; flex-wrap: wrap;
  justify-content: center;
}
.ch-shell .ch-lb-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 252, 245, 0.94);
  backdrop-filter: blur(8px);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 600;
  color: var(--ink-0);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ch-shell .ch-lb-btn:active { transform: scale(0.96); }
.ch-shell .ch-lb-btn.is-on {
  background: var(--accent); color: #FFFCF5;
}
.ch-shell .ch-lightbox-close {
  position: fixed;
  top: max(20px, env(safe-area-inset-top));
  right: 20px;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.16);
  backdrop-filter: blur(8px);
  border: none;
  color: #FFFCF5;
  font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* Modal (delete confirm) */
.ch-shell .ch-modal {
  position: fixed; inset: 0;
  background: rgba(20, 16, 14, 0.7);
  backdrop-filter: blur(8px);
  z-index: 110;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.ch-shell .ch-modal-card {
  width: 100%;
  max-width: 320px;
  background: var(--bg-card);
  border-radius: 18px;
  padding: 22px;
  text-align: center;
}
.ch-shell .ch-modal-card h3 {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px;
  margin: 0 0 8px;
  color: var(--ink-0);
}
.ch-shell .ch-modal-card p {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.5;
}
.ch-shell .ch-modal-actions {
  display: flex; gap: 8px; justify-content: center;
}
.ch-shell .ch-modal-danger {
  padding: 9px 18px;
  background: var(--reject);
  color: #FFFCF5;
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
}
`;
