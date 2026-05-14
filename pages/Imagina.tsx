/**
 * Imagina — "Take a photo you love, get N variations of it"
 *
 *   Phases:
 *     1. pick-source     — gallery or upload
 *     2. analyzing       — Gemini Vision extracts outfit + location + lighting
 *     3. configure       — user picks poses + interactions + count
 *     4. generating      — batch via NB2, source as Figure 1 + character refs
 *     5. result          — grid of N variations
 *
 *   Mood: Sand Atelier (cream + warm clay) — same family as Reimaginar/Personajes.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Image as ImageIcon, Sparkles, ChevronRight, X, Check, RefreshCw,
  Wand2, Loader, Share2, ArrowLeft,
} from 'lucide-react';
import type { Page } from '../App';
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore';
import { useCharacterStore } from '../stores/characterStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import {
  hapticLight, hapticMedium, hapticSuccess, hapticError, sharePhoto,
} from '../services/nativeService';
import { AppTopBar, urlToFile, type AppMood } from '../components/apps/_shared';

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

type Phase = 'pick-source' | 'analyzing' | 'configure' | 'generating' | 'result';

// ── Pose + interaction options for batch variation ──
const POSE_PRESETS = [
  { id: 'standing',     emoji: '🧍',  label: 'De pie',          prompt: 'standing confidently, hand on hip, looking at camera' },
  { id: 'sitting',      emoji: '🪑',  label: 'Sentada',         prompt: 'sitting elegantly on edge of bed or chair, legs crossed, relaxed' },
  { id: 'lying',        emoji: '🛏️',  label: 'Acostada',        prompt: 'lying down on her side on the bed, propped on elbow, soft gaze' },
  { id: 'over-shoulder', emoji: '👀', label: 'Mirada hombro',   prompt: 'looking back over shoulder, soft gaze toward camera, three-quarter rear angle' },
  { id: 'mirror-pose',  emoji: '🪞',  label: 'Selfie espejo',   prompt: 'mirror selfie with iPhone Pro, casual posture, free hand on hip' },
  { id: 'kneeling',     emoji: '🦵',  label: 'Arrodillada',     prompt: 'kneeling on bed or floor, hand on thigh, intimate angle' },
  { id: 'leaning',      emoji: '🚪',  label: 'Apoyada',         prompt: 'leaning against wall or doorframe, one leg crossed, casual' },
  { id: 'walking',      emoji: '🚶',  label: 'Caminando',       prompt: 'mid-stride walking forward, dynamic motion captured' },
];

const INTERACTION_PRESETS = [
  { id: 'hands-hair',   emoji: '💁',  label: 'Tocándose pelo',  prompt: 'one hand running through hair, natural gesture' },
  { id: 'phone',        emoji: '📱',  label: 'Con celular',     prompt: 'holding phone in one hand, casual social media moment' },
  { id: 'coffee',       emoji: '☕',  label: 'Café/Bebida',     prompt: 'holding a mug or glass with both hands close to chest' },
  { id: 'laughing',     emoji: '😄',  label: 'Riendo',          prompt: 'mid-laugh, natural genuine expression, eyes slightly closed' },
  { id: 'thinking',     emoji: '🤔',  label: 'Pensativa',       prompt: 'finger touching lip, gaze off-camera, contemplative expression' },
  { id: 'biting-lip',   emoji: '😏',  label: 'Mordiendo labio', prompt: 'subtle lip bite, confident sultry expression' },
  { id: 'arms-up',      emoji: '🙌',  label: 'Manos arriba',    prompt: 'arms raised gracefully above head, stretching gesture' },
  { id: 'looking-up',   emoji: '🌤️',  label: 'Mirando arriba',  prompt: 'chin slightly up, eyes looking off into the distance, ethereal mood' },
];

type Count = 1 | 3 | 6 | 9;
const COST_BY_COUNT: Record<Count, number> = {
  1: 6,
  3: 14,
  6: 22,
  9: 32,
};

export default function Imagina({ onNav }: Props) {
  const galleryItems = useGalleryStore(s => s.items);
  const addItems = useGalleryStore(s => s.addItems);
  const characters = useCharacterStore(s => s.characters);
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  const credits = profile?.creditsRemaining ?? 0;

  // ─── Phase / state ────────────────────────────────
  const [phase, setPhase] = useState<Phase>('pick-source');
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceCharacterId, setSourceCharacterId] = useState<string | null>(null);
  const [extractedDesc, setExtractedDesc] = useState<string>('');
  const [selectedPoses, setSelectedPoses] = useState<Set<string>>(new Set(['standing', 'sitting', 'over-shoulder']));
  const [selectedInteractions, setSelectedInteractions] = useState<Set<string>>(new Set(['hands-hair']));
  const [count, setCount] = useState<Count>(3);
  const [results, setResults] = useState<Array<{ url: string | null; status: 'pending' | 'generating' | 'done' | 'failed' }>>([]);
  // Ref mirror of results — needed because handleGenerate captures `results`
  // from closure at render time, missing updates from concurrent setResults calls.
  const resultsRef = useRef<Array<{ url: string | null; status: 'pending' | 'generating' | 'done' | 'failed' }>>([]);
  // Selection state for the result phase — user picks which variations to save.
  // Default: all selected. Empty Set means "save all" semantics in this UX.
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  // Track which results were already saved to gallery so user can't double-save.
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cost = COST_BY_COUNT[count];
  const linkedCharacter = sourceCharacterId ? characters.find(c => c.id === sourceCharacterId) : null;

  // ─── Analyzing phase: show cancel button after 5s + bail after 30s ──
  useEffect(() => {
    if (phase !== 'analyzing') { setShowCancel(false); return; }
    const tCancel = setTimeout(() => setShowCancel(true), 5000);
    const tTimeout = setTimeout(() => {
      // Bail to configure phase with fallback description
      toast.info('Análisis muy lento, continuando sin contexto');
      setExtractedDesc('');
      setPhase('configure');
    }, 30000);
    return () => { clearTimeout(tCancel); clearTimeout(tTimeout); };
  }, [phase]);

  // Filter: only image items, no sheets, has URL
  const pickableItems = useMemo(
    () => galleryItems
      .filter(i => i.url && typeof i.url === 'string' && i.type !== 'video' && !i.tags?.includes('sheet'))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    [galleryItems],
  );

  // Date-grouped sections (mirrors MobileEditor's gallery picker for consistency)
  const groupedPickable = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const today = now - day;
    const yesterday = now - 2 * day;
    const week = now - 7 * day;
    const month = now - 30 * day;
    const groups: { label: string; items: GalleryItem[] }[] = [
      { label: 'Hoy', items: [] },
      { label: 'Ayer', items: [] },
      { label: 'Esta semana', items: [] },
      { label: 'Este mes', items: [] },
      { label: 'Anteriores', items: [] },
    ];
    for (const it of pickableItems) {
      const ts = it.timestamp || 0;
      if (ts > today) groups[0].items.push(it);
      else if (ts > yesterday) groups[1].items.push(it);
      else if (ts > week) groups[2].items.push(it);
      else if (ts > month) groups[3].items.push(it);
      else groups[4].items.push(it);
    }
    return groups.filter(g => g.items.length > 0);
  }, [pickableItems]);

  // ─── Source selection ────────────────────────────
  const pickFromGallery = async (item: GalleryItem) => {
    if (pickingId) return;
    try {
      hapticLight();
      setPickingId(item.id);
      const file = await urlToFile(item.url, `imagina-source-${item.id.slice(0, 8)}.jpg`);
      setSourceUrl(item.url);
      setSourceFile(file);
      setSourceCharacterId(item.characterId ?? null);
      setShowGalleryPicker(false);
      // Auto-advance to analyze
      runAnalyze(file);
    } catch {
      toast.error('No se pudo cargar la foto');
    } finally {
      setPickingId(null);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); e.target.value = ''; return; }
    if (file.size > 12 * 1024 * 1024) { toast.error('Máximo 12 MB'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      setSourceUrl(reader.result as string);
      setSourceFile(file);
      setSourceCharacterId(null);
      hapticLight();
      runAnalyze(file);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── Gemini Vision analyze ───────────────────────
  const runAnalyze = async (file: File) => {
    setPhase('analyzing');
    try {
      // Quick prompt to Gemini Flash via the existing geminiService
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: 'placeholder', httpOptions: { baseUrl: '/gemini-api' } });

      // Convert file to base64 inline part
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const mime = file.type || 'image/jpeg';

      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: base64, mimeType: mime } },
            { text: `Analyze this photo and extract:
1. OUTFIT — detailed description of what the subject is wearing (fabric, color, style, fit)
2. LOCATION — where the photo is taken (indoor/outdoor, specific environment details)
3. LIGHTING — lighting type, direction, color temperature, mood
4. AESTHETIC — overall mood/vibe of the photo

Return as a single paragraph in technical English prose, ~150 words. NO bullet points, NO headers. Just dense descriptive text that can be used as a prompt to recreate the same scene with different poses.` },
          ],
        }],
        config: { temperature: 0.2, maxOutputTokens: 400 },
      });
      const text = (res.text ?? '').trim();
      if (!text) throw new Error('Vision returned empty');
      setExtractedDesc(text);
      setPhase('configure');
    } catch (err: any) {
      // Fallback: generic description that still preserves the source visually
      console.warn('Imagina vision failed:', err);
      setExtractedDesc('preserve outfit, location, lighting, and overall aesthetic of Figure 1 exactly');
      setPhase('configure');
    }
  };

  // ─── Toggle pose / interaction sets ──────────────
  const togglePose = (id: string) => {
    hapticLight();
    setSelectedPoses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleInteraction = (id: string) => {
    hapticLight();
    setSelectedInteractions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── Generate batch ──────────────────────────────
  const handleGenerate = async () => {
    if (!sourceFile) return;
    if (selectedPoses.size === 0) {
      toast.error('Elige al menos una pose');
      return;
    }
    if (credits < cost) {
      toast.error(`Te faltan ${cost - credits} créditos`);
      return;
    }

    const ok = await decrementCredits(cost);
    if (!ok) { toast.error('No se pudieron descontar los créditos'); return; }

    abortRef.current = new AbortController();
    setPhase('generating');
    const initial = Array.from({ length: count }, () => ({ url: null, status: 'pending' as const }));
    setResults(initial);
    resultsRef.current = initial;
    // Pre-select all slots; user can deselect in result phase before saving
    setSavedIdx(new Set(Array.from({ length: count }, (_, i) => i)));
    setSavedToGallery(false);
    hapticMedium();

    // Build per-slot variation specs
    const poseList = Array.from(selectedPoses).map(id => POSE_PRESETS.find(p => p.id === id)!).filter(Boolean);
    const interList = Array.from(selectedInteractions).map(id => INTERACTION_PRESETS.find(p => p.id === id)!).filter(Boolean);

    // Lazy-load deps
    const { editWithNB2Fal } = await import('../services/falService');
    const { editFallback } = await import('../services/editFallback');

    // Character refs (if known)
    const charRefs: File[] = [];
    if (linkedCharacter) {
      const refUrls = [
        ...(linkedCharacter.referencePhotoUrls ?? []),
        ...(linkedCharacter.modelImageUrls ?? []),
      ].filter(u => u && u.startsWith('http')).slice(0, 3);
      for (let i = 0; i < refUrls.length; i++) {
        try {
          charRefs.push(await urlToFile(refUrls[i], `char-ref-${i}.png`));
        } catch { /* skip bad ref */ }
      }
    }

    // Concurrency-limited
    const CONCURRENCY = 2;
    let nextIdx = 0;
    let active = 0;
    let doneAll: ((v: void) => void) | null = null;
    const done = new Promise<void>(r => { doneAll = r; });

    const startNext = () => {
      while (active < CONCURRENCY && nextIdx < count) {
        const idx = nextIdx++;
        active++;
        const pose = poseList[idx % poseList.length];
        const inter = interList[idx % interList.length] ?? null;
        generateOne(idx, pose.prompt, inter?.prompt ?? '', charRefs, editWithNB2Fal, editFallback)
          .finally(() => {
            active--;
            if (nextIdx < count) startNext();
            else if (active === 0 && doneAll) doneAll();
          });
      }
    };
    startNext();
    await done;

    // Read from ref (handleGenerate closure can't see latest setResults updates)
    const successCount = resultsRef.current.filter(r => r.status === 'done' && r.url).length;
    if (successCount === 0) {
      toast.error('No se pudo generar ninguna variación');
      restoreCredits(cost);
      setPhase('result');
      return;
    }
    // Pre-select only successful slots for the save action
    const successSlots = new Set<number>();
    resultsRef.current.forEach((r, i) => { if (r.status === 'done' && r.url) successSlots.add(i); });
    setSavedIdx(successSlots);
    hapticSuccess();
    setPhase('result');
  };

  // Manual commit — user picks which variations to save to gallery
  const commitToGallery = async () => {
    if (savedToGallery) return; // double-save guard
    const urls = resultsRef.current
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => savedIdx.has(i) && r.status === 'done' && r.url)
      .map(({ r }) => r.url!);
    if (urls.length === 0) {
      toast.error('Selecciona al menos una variación para guardar');
      return;
    }
    // Apply @VIST watermark for free-tier users — premium plans get clean outputs.
    const { watermarkIfFreeTier } = await import('../services/watermarkService');
    const stamped = await Promise.all(
      urls.map(url => watermarkIfFreeTier(url, profile?.subscriptionPlan, profile?.subscriptionStatus)),
    );
    addItems(stamped.map(url => ({
      id: crypto.randomUUID(),
      url,
      type: 'edit' as const,
      model: 'imagina-nb2',
      timestamp: Date.now(),
      prompt: `Imagina · variación`,
      characterId: sourceCharacterId ?? undefined,
    })));
    setSavedToGallery(true);
    hapticSuccess();
    toast.success(`${urls.length} foto${urls.length === 1 ? '' : 's'} guardada${urls.length === 1 ? '' : 's'} en Galería`);
  };

  const toggleSlot = (idx: number) => {
    hapticLight();
    setSavedIdx(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const generateOne = async (
    idx: number,
    posePrompt: string,
    interactionPrompt: string,
    charRefs: File[],
    editNB2: any,
    editFb: any,
  ) => {
    setResults(prev => {
      const next = prev.map((s, i) => i === idx ? { ...s, status: 'generating' as const } : s);
      resultsRef.current = next;
      return next;
    });

    const spec = {
      task: 'IMAGINA — Generate a NEW photograph that preserves the scene/outfit/lighting of Figure 1 but with a different pose and interaction',
      source: {
        type: 'image-conditioned variation',
        base: 'Figure 1 — the source photo to vary',
        ...(charRefs.length > 0 ? {
          identity_refs: `Figures 2-${1 + charRefs.length} — character identity references`,
        } : {}),
      },
      scene_to_preserve: extractedDesc,
      variation: {
        new_pose: posePrompt,
        new_interaction: interactionPrompt || '(natural relaxed)',
        must_change: ['pose', 'body posture', 'gesture', 'camera angle slightly'],
        must_preserve: ['outfit', 'location', 'lighting', 'identity', 'overall aesthetic', 'color palette'],
      },
      rules: {
        consistency: 'Subject identity, outfit, and environment must match Figure 1 exactly.',
        composition: 'Recompose the framing slightly to accommodate the new pose, but keep the same location.',
        never_add: ['text overlays', 'watermarks', 'commercial logos'],
      },
    };
    const instruction = `IMAGINA VARIATION:\n${JSON.stringify(spec, null, 2)}`;

    try {
      const r = await editNB2(
        sourceFile!,
        instruction,
        charRefs,
        undefined,
        { resolution: '2K' },
        abortRef.current?.signal,
      );
      if (r && r.length > 0) {
        setResults(prev => {
          const next = prev.map((s, i) => i === idx ? { url: r[0], status: 'done' as const } : s);
          resultsRef.current = next;
          return next;
        });
        return;
      }
      throw new Error('NB2 empty');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setResults(prev => {
        const next = prev.map((s, i) => i === idx ? { ...s, status: 'failed' as const } : s);
        resultsRef.current = next;
        return next;
      });
        return;
      }
      // Fallback to Seedream/Grok via editFallback
      try {
        const flatInstruction = `Edit Figure 1: Generate a NEW photo preserving outfit, location, lighting, and identity from Figure 1. NEW POSE: ${posePrompt}. ${interactionPrompt ? `NEW INTERACTION: ${interactionPrompt}.` : ''} Scene context: ${extractedDesc} Keep outfit, location, lighting, and identity EXACTLY the same. Only change pose and gesture. NO text, NO watermarks.`;
        const r = await editFb({
          baseImage: sourceFile!,
          flatInstruction,
          referenceImages: charRefs,
          abortSignal: abortRef.current?.signal,
        });
        if (r && r.length > 0) {
          setResults(prev => {
          const next = prev.map((s, i) => i === idx ? { url: r[0], status: 'done' as const } : s);
          resultsRef.current = next;
          return next;
        });
          return;
        }
      } catch { /* fall through */ }
      setResults(prev => {
        const next = prev.map((s, i) => i === idx ? { ...s, status: 'failed' as const } : s);
        resultsRef.current = next;
        return next;
      });
    }
  };

  const restartFlow = () => {
    setSourceUrl(null);
    setSourceFile(null);
    setSourceCharacterId(null);
    setExtractedDesc('');
    setResults([]);
    setPhase('pick-source');
    hapticLight();
  };

  // ════════════════════════════════════════════════
  // PHASE 1 — pick source
  // ════════════════════════════════════════════════
  if (phase === 'pick-source') {
    return (
      <div className="im-shell">
        <style>{IM_STYLES}</style>
        <AppTopBar mood={ATELIER_MOOD} title="Imagina · Atelier" credits={credits} onBack={() => onNav('studio' as Page)} />

        <section className="im-hero">
          <div className="im-hero-eyebrow">Variaciones de una foto</div>
          <h1 className="im-hero-title">
            Una foto que <em>amas</em>.<br />
            Variaciones <em>infinitas</em>.
          </h1>
          <p className="im-hero-sub">
            Sube o elige una foto. La IA mantiene outfit, lugar y luz exactos — solo cambia
            la pose y el momento. Perfecto para feedear tu contenido sin perder identidad.
          </p>
        </section>

        <section className="im-section">
          <div className="im-pick-cards">
            <button className="im-pick-card im-pick-primary" onClick={() => { hapticLight(); uploadInputRef.current?.click(); }}>
              <div className="im-pick-icon"><Upload size={22} /></div>
              <div className="im-pick-info">
                <strong>Subir foto</strong>
                <small>Cámara o galería del teléfono</small>
              </div>
              <ChevronRight size={16} className="im-pick-arrow" />
            </button>

            <button
              className="im-pick-card"
              onClick={() => { hapticLight(); setShowGalleryPicker(true); }}
              disabled={pickableItems.length === 0}
            >
              <div className="im-pick-icon"><ImageIcon size={22} /></div>
              <div className="im-pick-info">
                <strong>Desde Galería</strong>
                <small>{pickableItems.length > 0 ? `${pickableItems.length} fotos disponibles` : 'Sin fotos aún'}</small>
              </div>
              <ChevronRight size={16} className="im-pick-arrow" />
            </button>
          </div>
        </section>

        <input ref={uploadInputRef} type="file" accept="image/*" hidden onChange={handleUpload} />

        {/* Gallery picker — fullscreen, date-grouped (same pattern as Editor IA) */}
        {showGalleryPicker && (
          <div className="im-gallery-overlay" role="dialog" aria-modal="true">
            <div className="im-gallery-topbar">
              <button
                className="im-gallery-back"
                onClick={() => { hapticLight(); setShowGalleryPicker(false); }}
                aria-label="Volver"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="im-gallery-title">Elige una foto</div>
              <div style={{ width: 32 }} />
            </div>
            {pickableItems.length === 0 ? (
              <div className="im-gallery-empty">
                <p>Aún no tienes fotos en la galería.</p>
              </div>
            ) : (
              <div className="im-gallery-wrap">
                {groupedPickable.map(group => (
                  <section key={group.label} className="im-gallery-section">
                    <h3 className="im-gallery-section-title">
                      {group.label} <span>· {group.items.length}</span>
                    </h3>
                    <div className="im-gallery-grid">
                      {group.items.map(item => (
                        <button
                          key={item.id}
                          className={`im-gallery-cell ${pickingId === item.id ? 'is-loading' : ''}`}
                          onClick={() => pickFromGallery(item)}
                          disabled={!!pickingId}
                        >
                          <img
                            src={item.url}
                            alt=""
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.25'; }}
                          />
                          {pickingId === item.id && (
                            <div className="im-gallery-cell-loading">
                              <Loader size={18} className="im-spin" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // PHASE 2 — analyzing
  // ════════════════════════════════════════════════
  if (phase === 'analyzing') {
    return (
      <div className="im-shell">
        <style>{IM_STYLES}</style>
        <div className="im-gen-bg" style={sourceUrl ? { backgroundImage: `url(${sourceUrl})` } : undefined}>
          <div className="im-gen-overlay" />
        </div>
        <div className="im-gen-content">
          <div className="im-gen-pulse"><Wand2 size={26} /></div>
          <h2>Analizando la foto</h2>
          <p>Gemini Vision extrae outfit, locación y luz...</p>
          <div className="im-gen-bars"><span /><span /><span /><span /><span /></div>
          {showCancel && (
            <button className="im-cancel-btn" onClick={() => { hapticLight(); setPhase('pick-source'); }}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // PHASE 3 — configure
  // ════════════════════════════════════════════════
  if (phase === 'configure' && sourceUrl) {
    const isAffordable = credits >= cost;
    return (
      <div className="im-shell">
        <style>{IM_STYLES}</style>

        <div className="im-top">
          <button className="im-back" onClick={() => { hapticLight(); restartFlow(); }}><ArrowLeft size={16} /></button>
          <span className="im-title">Imagina · Variaciones</span>
          <span className="im-credits">{credits.toLocaleString()}</span>
        </div>

        {/* Source preview */}
        <section className="im-preview">
          <img src={sourceUrl} alt="Source" />
          <div className="im-preview-overlay">
            <span className="im-preview-tag">Fuente</span>
          </div>
        </section>

        {/* Extracted description preview */}
        {extractedDesc && (
          <section className="im-section">
            <div className="im-extracted">
              <small className="im-extracted-label">Escena detectada</small>
              <p>{extractedDesc}</p>
            </div>
          </section>
        )}

        {/* Pose multi-select */}
        <section className="im-section">
          <div className="im-field-head">
            <span className="im-eyebrow">Poses</span>
            <small>{selectedPoses.size} seleccionadas</small>
          </div>
          <div className="im-chip-grid">
            {POSE_PRESETS.map(p => (
              <button
                key={p.id}
                className={`im-chip ${selectedPoses.has(p.id) ? 'is-on' : ''}`}
                onClick={() => togglePose(p.id)}
              >
                <span className="im-chip-emoji">{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Interaction multi-select */}
        <section className="im-section">
          <div className="im-field-head">
            <span className="im-eyebrow">Interacciones</span>
            <small>{selectedInteractions.size} seleccionadas</small>
          </div>
          <div className="im-chip-grid">
            {INTERACTION_PRESETS.map(p => (
              <button
                key={p.id}
                className={`im-chip ${selectedInteractions.has(p.id) ? 'is-on' : ''}`}
                onClick={() => toggleInteraction(p.id)}
              >
                <span className="im-chip-emoji">{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Count */}
        <section className="im-section">
          <div className="im-field-head">
            <span className="im-eyebrow">Cantidad</span>
            <small>{cost} créditos</small>
          </div>
          <div className="im-count-row">
            {([1, 3, 6, 9] as Count[]).map(n => (
              <button
                key={n}
                className={`im-count-pill ${count === n ? 'is-on' : ''}`}
                onClick={() => { hapticLight(); setCount(n); }}
              >
                <div className="im-count-num">{n}</div>
                <small>{COST_BY_COUNT[n]}cr</small>
              </button>
            ))}
          </div>
        </section>

        <div className="im-spacer" />

        <div className="im-cta-bar">
          <button className="im-cta" disabled={!isAffordable} onClick={handleGenerate}>
            <Sparkles size={16} />
            {isAffordable ? `Generar ${count} variaciones · ${cost} cr` : `Faltan ${cost - credits} cr`}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // PHASE 4 — generating
  // ════════════════════════════════════════════════
  if (phase === 'generating') {
    return (
      <div className="im-shell">
        <style>{IM_STYLES}</style>
        <div className="im-top">
          <span className="im-title">Generando · {results.filter(r => r.status === 'done').length}/{count}</span>
        </div>
        <div className="im-result-grid">
          {results.map((r, i) => (
            <div key={i} className={`im-result-slot is-${r.status}`}>
              {r.status === 'done' && r.url
                ? <img src={r.url} alt="" />
                : r.status === 'failed'
                  ? <div className="im-slot-fail"><X size={14} /></div>
                  : <div className="im-slot-loader"><Loader size={16} className="im-spin" /></div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // PHASE 5 — result
  // ════════════════════════════════════════════════
  if (phase === 'result') {
    const successCount = results.filter(r => r.status === 'done').length;
    const selectedCount = savedIdx.size;
    return (
      <div className="im-shell">
        <style>{IM_STYLES}</style>
        <AppTopBar mood={ATELIER_MOOD} title="Imagina · Resultados" credits={credits} onBack={() => onNav('studio' as Page)} />

        <section className="im-section">
          <div className="im-field-head">
            <span className="im-eyebrow">
              {savedToGallery
                ? `${selectedCount} guardadas en Galería ✓`
                : `${successCount}/${count} listas · tap para elegir cuáles guardar`}
            </span>
          </div>
          <div className="im-result-grid">
            {results.map((r, i) => {
              const isSelected = savedIdx.has(i);
              const isDone = r.status === 'done' && r.url;
              return (
                <button
                  key={i}
                  type="button"
                  className={`im-result-slot is-${r.status} ${isSelected ? 'is-selected' : ''} ${savedToGallery ? 'is-locked' : ''}`}
                  onClick={() => { if (isDone && !savedToGallery) toggleSlot(i); }}
                  disabled={!isDone || savedToGallery}
                  aria-pressed={isSelected}
                  aria-label={`Variación ${i + 1} — ${isSelected ? 'seleccionada' : 'no seleccionada'}`}
                >
                  {isDone
                    ? <img src={r.url!} alt="" />
                    : <div className="im-slot-fail"><X size={14} /></div>}
                  {isDone && (
                    <span className="im-slot-check">
                      {isSelected ? <Check size={14} strokeWidth={3} /> : null}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="im-cta-bar">
          <button className="im-cta im-cta-secondary" onClick={restartFlow}>
            <RefreshCw size={14} />
            Otra foto
          </button>
          {!savedToGallery && successCount > 0 && (
            <button
              className="im-cta im-cta-primary"
              onClick={commitToGallery}
              disabled={selectedCount === 0}
            >
              <Check size={14} />
              Guardar {selectedCount} de {successCount}
            </button>
          )}
          {savedToGallery && (
            <button className="im-cta im-cta-primary is-done" disabled>
              <Check size={14} />
              Guardado en Galería
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Styles ──────────────────────────────────────────

const IM_STYLES = `
.im-shell {
  --im-bg: #F5EBDB;
  --im-bg-card: #FFFCF5;
  --im-paper: #F8EFDD;
  --im-ink-0: #1F1A14;
  --im-ink-1: #3D332A;
  --im-ink-2: #6F5E4C;
  --im-ink-3: #A8957D;
  --im-line: rgba(31, 26, 20, 0.10);
  --im-accent: #C9785C;
  --im-gold: #D4A85F;
  --im-ease: cubic-bezier(0.32, 0.72, 0, 1);

  min-height: 100%;
  background: var(--im-bg);
  color: var(--im-ink-0);
  font-family: 'DM Sans', sans-serif;
  padding-bottom: 110px;
  position: relative;
}

/* Hero */
.im-shell .im-hero { padding: 14px 20px 0; }
.im-shell .im-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--im-ink-3);
  margin-bottom: 6px;
}
.im-shell .im-hero-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 36px; line-height: 0.96;
  letter-spacing: -0.02em;
  font-weight: 400;
  color: var(--im-ink-0);
  margin: 0;
}
.im-shell .im-hero-title em { font-style: italic; color: var(--im-accent); }
.im-shell .im-hero-sub {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--im-ink-2);
  line-height: 1.55;
  max-width: 340px;
}

/* Sections */
.im-shell .im-section { padding: 22px 20px 0; }
.im-shell .im-field-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
  margin-bottom: 10px;
}
.im-shell .im-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--im-ink-3);
}
.im-shell .im-field-head small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--im-ink-3);
}

/* Pick cards */
.im-shell .im-pick-cards { display: flex; flex-direction: column; gap: 10px; }
.im-shell .im-pick-card {
  display: flex; align-items: center; gap: 14px;
  background: var(--im-bg-card);
  border: 1px solid var(--im-line);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s var(--im-ease);
}
.im-shell .im-pick-card:active { transform: scale(0.98); }
.im-shell .im-pick-card:disabled { opacity: 0.5; cursor: not-allowed; }
.im-shell .im-pick-primary {
  background: var(--im-ink-0);
  color: var(--im-bg-card);
  border-color: var(--im-ink-0);
}
.im-shell .im-pick-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--im-paper);
  color: var(--im-accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.im-shell .im-pick-primary .im-pick-icon { background: rgba(255, 252, 245, 0.12); color: var(--im-gold); }
.im-shell .im-pick-info { flex: 1; min-width: 0; }
.im-shell .im-pick-info strong { display: block; font-size: 14px; margin-bottom: 2px; }
.im-shell .im-pick-info small { font-size: 11px; color: var(--im-ink-3); }
.im-shell .im-pick-primary .im-pick-info small { color: rgba(255, 252, 245, 0.6); }
.im-shell .im-pick-arrow { color: var(--im-ink-3); flex-shrink: 0; }
.im-shell .im-pick-primary .im-pick-arrow { color: rgba(255, 252, 245, 0.4); }

/* Top bar (compact for config phase) */
.im-shell .im-top {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top)) 16px 10px;
  background: linear-gradient(180deg, var(--im-bg) 80%, transparent);
  backdrop-filter: blur(8px);
}
.im-shell .im-back {
  width: 44px; height: 44px;
  min-width: 44px; min-height: 44px;
  border-radius: 50%;
  background: var(--im-bg-card);
  border: 1px solid var(--im-line);
  color: var(--im-ink-1);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.im-shell .im-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--im-ink-2);
}
.im-shell .im-credits {
  padding: 5px 10px;
  background: var(--im-bg-card);
  border: 1px solid var(--im-line);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--im-ink-0);
  font-weight: 500;
}

/* Source preview */
.im-shell .im-preview {
  margin: 10px 20px 0;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  aspect-ratio: 3/4;
  max-height: 50vh;
}
.im-shell .im-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.im-shell .im-preview-overlay { position: absolute; top: 10px; left: 10px; }
.im-shell .im-preview-tag {
  padding: 4px 10px;
  background: rgba(20, 16, 14, 0.7);
  backdrop-filter: blur(6px);
  border-radius: 999px;
  color: var(--im-bg-card);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* Extracted description */
.im-shell .im-extract {
  padding: 13px 14px;
  background: var(--im-bg-card);
  border: 1px solid var(--im-line);
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--im-ink-1);
  max-height: 140px;
  overflow-y: auto;
}
.im-shell .im-extracted {
  background: var(--im-bg-card); border: 1px solid var(--im-line);
  border-radius: 10px; padding: 10px 12px; margin-bottom: 12px;
}
.im-shell .im-extracted-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--im-ink-3); display: block; margin-bottom: 4px;
}
.im-shell .im-extracted p { font-size: 13px; color: var(--im-ink-1); line-height: 1.4; margin: 0; }

/* Pose / interaction chips */
.im-shell .im-chip-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.im-shell .im-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: var(--im-bg-card);
  border: 1px solid var(--im-line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--im-ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s var(--im-ease);
}
.im-shell .im-chip.is-on {
  background: var(--im-ink-0);
  border-color: var(--im-ink-0);
  color: var(--im-bg-card);
}
.im-shell .im-chip-emoji { font-size: 14px; line-height: 1; }

/* Count pills */
.im-shell .im-count-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.im-shell .im-count-pill {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 11px 6px;
  background: var(--im-bg-card);
  border: 1px solid var(--im-line);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.im-shell .im-count-pill.is-on { background: var(--im-ink-0); border-color: var(--im-ink-0); color: var(--im-bg-card); }
.im-shell .im-count-num {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 400;
  line-height: 1;
}
.im-shell .im-count-pill small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--im-ink-3);
}
.im-shell .im-count-pill.is-on small { color: rgba(255, 252, 245, 0.55); }

.im-shell .im-spacer { height: 32px; }

/* CTA bar */
.im-shell .im-cta-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 12px 20px max(16px, env(safe-area-inset-bottom));
  background: rgba(245, 235, 219, 0.94);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--im-line);
  display: flex; gap: 8px;
  z-index: 20;
}
.im-shell .im-cta {
  flex: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px;
  background: var(--im-ink-0);
  color: var(--im-bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14px; font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.im-shell .im-cta:disabled { background: var(--im-ink-3); cursor: not-allowed; }
.im-shell .im-cta-secondary {
  background: var(--im-bg-card);
  color: var(--im-ink-1);
  border: 1px solid var(--im-line);
}
.im-shell .im-cta-primary {
  background: var(--im-ink-0);
  color: var(--im-bg-card);
}
.im-shell .im-cta-primary.is-done {
  background: var(--im-gold);
  color: var(--im-ink-0);
}

/* Generating overlay */
.im-shell .im-gen-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  filter: blur(28px) brightness(0.55);
  transform: scale(1.1);
}
.im-shell .im-gen-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(14,11,8,0.4) 0%, rgba(14,11,8,0.85) 60%);
}
.im-shell .im-gen-content {
  position: relative;
  z-index: 2;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 100dvh;
  padding: 40px 30px;
  color: #FFFCF5;
  text-align: center;
}
.im-shell .im-gen-pulse {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: var(--im-accent);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 24px;
  animation: im-pulse 2s ease-in-out infinite;
}
.im-shell .im-gen-content h2 {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 400;
  margin: 0 0 8px;
}
.im-shell .im-gen-content p {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 252, 245, 0.6);
  margin: 0 0 28px;
}
.im-shell .im-gen-bars {
  display: flex; gap: 4px;
}
.im-shell .im-gen-bars span {
  width: 4px; height: 32px;
  background: var(--im-accent);
  border-radius: 2px;
  animation: im-bar 1.4s ease-in-out infinite;
}
.im-shell .im-gen-bars span:nth-child(2) { animation-delay: 0.15s; background: var(--im-gold); }
.im-shell .im-gen-bars span:nth-child(3) { animation-delay: 0.3s; }
.im-shell .im-gen-bars span:nth-child(4) { animation-delay: 0.45s; background: var(--im-gold); }
.im-shell .im-gen-bars span:nth-child(5) { animation-delay: 0.6s; }
.im-shell .im-cancel-btn {
  margin-top: 28px;
  padding: 10px 24px;
  background: transparent;
  color: rgba(255, 252, 245, 0.85);
  border: 1px solid rgba(255, 252, 245, 0.25);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.im-shell .im-cancel-btn:active { opacity: 0.6; }

/* Result grid */
.im-shell .im-result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 8px 20px 0;
}
.im-shell .im-result-slot {
  aspect-ratio: 3/4;
  border-radius: 12px;
  overflow: hidden;
  background: var(--im-paper);
  border: 2px solid var(--im-line);
  position: relative;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.18s var(--im-ease), transform 0.1s ease;
}
.im-shell .im-result-slot:active:not(:disabled) { transform: scale(0.97); }
.im-shell .im-result-slot:disabled { cursor: default; opacity: 0.55; }
.im-shell .im-result-slot.is-selected { border-color: var(--im-gold); }
.im-shell .im-result-slot.is-selected img { filter: brightness(1.02) saturate(1.05); }
.im-shell .im-result-slot.is-locked { cursor: default; }
.im-shell .im-result-slot img { width: 100%; height: 100%; object-fit: cover; }
.im-shell .im-slot-check {
  position: absolute;
  top: 8px; right: 8px;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: rgba(252, 248, 240, 0.85);
  backdrop-filter: blur(6px);
  border: 1.5px solid var(--im-line);
  display: flex; align-items: center; justify-content: center;
  color: transparent;
  transition: background 0.18s var(--im-ease), color 0.18s var(--im-ease), border-color 0.18s var(--im-ease);
}
.im-shell .im-result-slot.is-selected .im-slot-check {
  background: var(--im-gold);
  border-color: var(--im-gold);
  color: var(--im-ink-0);
}
.im-shell .im-slot-loader,
.im-shell .im-slot-fail {
  display: flex; align-items: center; justify-content: center;
  height: 100%;
  color: var(--im-ink-3);
}
.im-shell .im-slot-fail { color: #B86060; }
.im-shell .im-spin { animation: im-spin 1s linear infinite; }
@keyframes im-spin { to { transform: rotate(360deg); } }
@keyframes im-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
}
@keyframes im-bar {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

/* Gallery picker — fullscreen, date-grouped (same DNA as Editor IA) */
.im-shell .im-gallery-overlay {
  position: fixed; inset: 0;
  background: var(--im-bg-0);
  z-index: 100;
  display: flex; flex-direction: column;
  padding-top: env(safe-area-inset-top);
}
.im-shell .im-gallery-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--im-line);
  background: var(--im-bg-card);
}
.im-shell .im-gallery-back {
  width: 44px; height: 44px;
  min-width: 44px; min-height: 44px;
  border-radius: 50%;
  background: var(--im-paper);
  border: 1px solid var(--im-line);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--im-ink-0);
}
.im-shell .im-gallery-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 20px;
  color: var(--im-ink-0);
}
.im-shell .im-gallery-empty {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  color: var(--im-ink-3);
  font-size: 14px;
  padding: 40px 20px;
  text-align: center;
}
.im-shell .im-gallery-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px max(20px, env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}
.im-shell .im-gallery-section { margin-bottom: 18px; }
.im-shell .im-gallery-section-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--im-ink-2);
  margin: 0 4px 8px;
  display: flex; align-items: baseline; gap: 6px;
}
.im-shell .im-gallery-section-title span {
  font-weight: 400;
  color: var(--im-ink-3);
}
.im-shell .im-gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.im-shell .im-gallery-cell {
  position: relative;
  aspect-ratio: 1;
  background: var(--im-paper);
  border: none;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s ease;
}
.im-shell .im-gallery-cell:active { transform: scale(0.96); }
.im-shell .im-gallery-cell img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: opacity 0.2s ease;
}
.im-shell .im-gallery-cell.is-loading img { opacity: 0.45; filter: blur(1px); }
.im-shell .im-gallery-cell-loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--im-accent);
}
.im-shell .im-gallery-cell:disabled { opacity: 0.55; cursor: default; }
`;
