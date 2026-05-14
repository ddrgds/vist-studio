/**
 * Sesión de Fotos — Premium app suite, app #3
 *
 * Mood: Proof sheet / contact sheet (warm sand + copper + charcoal grid frame)
 * Multi-output: 4 / 6 / 9 / 12 photos with same character, scenario, outfit
 * but varied poses. Shown as a contact sheet with keep/reject marks.
 *
 * Pricing: 4=16cr, 6=22cr, 9=32cr, 12=40cr (bulk discount)
 * Generation: parallel-batched (3 at a time) to avoid rate limits.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, Sparkles, Check, X,
  Download, Share2, Upload, Camera,
} from 'lucide-react';
import type { Page } from '../App';
import { AppTopBar, type AppMood } from '../components/apps/_shared';
import { useCharacterStore } from '../stores/characterStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, sharePhoto, takePhoto, isNativePlatform } from '../services/nativeService';
import { identityProse, NO_TEXT_RULE, NEVER_ADD_TEXT, lightingPhrase, PHOTOREAL_SKIN, renderStyleSkin } from '../services/promptBuilder';

// ─── Types ─────────────────────────────────────

interface Props {
  onNav: (p: Page) => void;
}

type AspectRatio = '3:4' | '1:1' | '4:3' | '9:16' | '16:9';
type PhotoCount = 1 | 4 | 6 | 9 | 12;

// Light mood — mirrors the --bg-0/--ink/--copper palette used by .ss-shell below.
const LIGHT_MOOD: AppMood = {
  bg0: '#EFE5D2',
  bgCard: '#FDF7E8',
  paper: '#F2E8D2',
  ink0: '#1A1410',
  ink1: '#2E2A24',
  ink2: '#5E5447',
  ink3: '#998E7C',
  line: 'rgba(26, 20, 16, 0.10)',
  accent: '#B0772D',
  accentDeep: '#855317',
  gold: '#C9A76A',
};

interface ScenarioPreset {
  id: string;
  name: string;
  meta: string;        // "Interior · día"
  description: string; // Full prompt for AI
  img: string;
}

interface PosePreset {
  id: string;
  name: string;
  description: string;
  img: string;
}

const SCENARIOS: ScenarioPreset[] = [
  { id: 'loft',   name: 'Loft Brooklyn',  meta: 'Interior · día',     description: 'minimalist Brooklyn loft interior, exposed brick wall, large windows with natural daylight, wood floors, plants', img: '/app-thumbs/sesion-scenes/loft.jpg' },
  { id: 'hotel',  name: 'Hotel boutique', meta: 'Suite · ventana',    description: 'boutique hotel suite, elegant linen sheets, large window with diffused warm light, neutral interior', img: '/app-thumbs/sesion-scenes/hotel.jpg' },
  { id: 'beach',  name: 'Playa tropical', meta: 'Exterior · sunset',  description: 'tropical beach at golden hour, soft warm sunset light, turquoise ocean, sand, palm trees in background', img: '/app-thumbs/sesion-scenes/beach.jpg' },
  { id: 'cafe',   name: 'Café parisino',  meta: 'Interior · noche',   description: 'parisian cafe interior at night, warm tungsten lighting, marble bar, coffee cups, intimate atmosphere', img: '/app-thumbs/sesion-scenes/cafe.jpg' },
  { id: 'studio', name: 'Estudio editorial', meta: 'Set · backdrop',  description: 'professional photography studio, seamless paper backdrop, controlled studio lighting, editorial setup', img: '/app-thumbs/sesion-scenes/studio.jpg' },
  { id: 'street', name: 'Street urbana',  meta: 'Exterior · día',     description: 'urban street setting, modern city architecture, soft overcast light, contemporary backdrop', img: '/app-thumbs/sesion-scenes/street.jpg' },
  { id: 'rooftop',name: 'Rooftop sunset', meta: 'Exterior · sunset',  description: 'rooftop terrace at golden hour, city skyline in background, warm sunset light, contemporary outdoor setting', img: '/app-thumbs/sesion-scenes/rooftop.jpg' },
];

type OutfitCat = 'editorial' | 'casual' | 'sensual' | 'sport' | 'fantasy';

const OUTFITS: { id: string; name: string; emoji: string; cat: OutfitCat; description: string }[] = [
  // ── Editorial / minimalista ──
  { id: 'slip-dress',   name: 'Slip dress',       emoji: '⌬', cat: 'editorial', description: 'silk slip dress, midi length, elegant minimal styling' },
  { id: 'oversized',    name: 'Camisa oversized', emoji: '▷', cat: 'casual',    description: 'oversized button-down shirt, slightly open, casual sophisticated styling' },
  { id: 'trench',       name: 'Trench coat',      emoji: '▽', cat: 'editorial', description: 'classic trench coat, belted at waist, timeless tailored styling' },
  { id: 'tailored-suit', name: 'Suit sastre',     emoji: '◫', cat: 'editorial', description: 'tailored two-piece suit, structured blazer, wide-leg trousers, power dressing' },
  { id: 'maxi-dress',   name: 'Maxi dress',       emoji: '✦', cat: 'editorial', description: 'flowy maxi dress, ankle length, soft silhouette, romantic editorial' },
  { id: 'leather-jacket',name: 'Leather jacket',  emoji: '◣', cat: 'editorial', description: 'cropped leather biker jacket over fitted top, edgy editorial styling' },
  // ── Casual / lifestyle ──
  { id: 'sweater',      name: 'Knit oversized',   emoji: '◇', cat: 'casual',    description: 'oversized chunky knit sweater, cozy lifestyle vibe' },
  { id: 'denim-casual', name: 'Denim look',       emoji: '▥', cat: 'casual',    description: 'fitted denim jeans with crop top, classic casual lifestyle' },
  { id: 'tank-shorts',  name: 'Tank + shorts',    emoji: '▭', cat: 'casual',    description: 'ribbed tank top with high-waisted denim shorts, relaxed casual styling' },
  { id: 'graphic-tee',  name: 'Graphic tee',      emoji: '✣', cat: 'casual',    description: 'fitted graphic vintage tee with high-waisted bottoms, streetwear styling' },
  { id: 'crop-cardi',   name: 'Cardigan crop',    emoji: '◈', cat: 'casual',    description: 'cropped knit cardigan with bralette underneath, soft layered styling' },
  // ── Sensual editorial (gateado por Modo Creator en otro flow) ──
  { id: 'lingerie',     name: 'Lingerie set',     emoji: '◐', cat: 'sensual',   description: 'matching lingerie set, refined and tasteful boudoir styling' },
  { id: 'robe',         name: 'Robe',             emoji: '▲', cat: 'sensual',   description: 'satin robe loosely tied, loungewear elegance' },
  { id: 'bikini',       name: 'Bikini',           emoji: '◑', cat: 'sensual',   description: 'minimal triangle bikini, beach styling' },
  { id: 'bodysuit',     name: 'Bodysuit',         emoji: '▢', cat: 'sensual',   description: 'fitted bodysuit, sleek minimal silhouette' },
  { id: 'mesh-top',     name: 'Mesh layer',       emoji: '◍', cat: 'sensual',   description: 'sheer mesh long-sleeve over bralette and high-waisted bottoms, club editorial' },
  { id: 'corset-top',   name: 'Corset top',       emoji: '◬', cat: 'sensual',   description: 'structured corset top with wide-leg trousers, editorial party styling' },
  // ── Sport ──
  { id: 'activewear',   name: 'Activewear',       emoji: '▸', cat: 'sport',     description: 'athletic sports bra with matching leggings, performance fit, lifestyle athleisure' },
  { id: 'yoga-set',     name: 'Yoga set',         emoji: '◊', cat: 'sport',     description: 'fitted yoga top and high-waist leggings in matching tone, soft athletic styling' },
  { id: 'tennis',       name: 'Tennis look',      emoji: '◔', cat: 'sport',     description: 'pleated tennis skirt with fitted polo or crop top, retro sport-luxe styling' },
  // ── Fantasy ──
  { id: 'cyber-goddess',name: 'Cyber goddess',    emoji: '◭', cat: 'fantasy',   description: 'futuristic metallic bodysuit with iridescent panels, cyber editorial mood' },
  { id: 'mermaid',      name: 'Mermaid ethereal', emoji: '⏃', cat: 'fantasy',   description: 'flowy iridescent gown with scale-textured detailing, ethereal underwater mood' },
];

// Outfit color palette — when selected, the prompt is enriched so the outfit
// reads in those exact tones. Empty by default = let the chip description decide.
type OutfitPalette = { id: string; label: string; swatches: string[]; promptText: string };
const OUTFIT_PALETTES: OutfitPalette[] = [
  { id: 'neutral',   label: 'Neutros',     swatches: ['#F2EBDD', '#D4B998', '#A78866', '#5A4734', '#1F1812'],
    promptText: 'outfit in neutral palette: warm cream, sand, camel, soft brown tones' },
  { id: 'mono-black', label: 'Negro total', swatches: ['#000000', '#1A1A1A', '#2E2A2A', '#1F1A14'],
    promptText: 'outfit in monochromatic black palette, sleek and elevated' },
  { id: 'mono-white', label: 'Blanco total', swatches: ['#FFFFFF', '#F8F4EF', '#EDE6D9', '#D9CFBC'],
    promptText: 'outfit in monochromatic white palette: pure white, cream, eggshell tones' },
  { id: 'earthy',    label: 'Tierras',     swatches: ['#8E5640', '#C9785C', '#D9A878', '#6B4E32'],
    promptText: 'outfit in earthy palette: terracotta, sienna, warm clay, burnt sienna tones' },
  { id: 'oceanic',   label: 'Oceánicos',   swatches: ['#1E3A5F', '#4A6B8A', '#7FA9C9', '#C7DCE9'],
    promptText: 'outfit in oceanic blue palette: navy, slate blue, sky, pale aqua tones' },
  { id: 'rose-blush',label: 'Rosados',     swatches: ['#F4D6CC', '#E8A89A', '#C7806E', '#8E4F40'],
    promptText: 'outfit in rose-blush palette: dusty pink, blush, mauve, terracotta-rose tones' },
  { id: 'forest',    label: 'Bosque',      swatches: ['#1F3D2E', '#3D6B4E', '#6B8E5C', '#A8B891'],
    promptText: 'outfit in forest palette: deep emerald, sage, olive, moss tones' },
  { id: 'sunset',    label: 'Atardecer',   swatches: ['#E85A4F', '#F4A261', '#E9C46A', '#D88C5A'],
    promptText: 'outfit in sunset palette: coral, golden amber, sand, peach tones' },
  { id: 'pastel-dream',label: 'Pasteles',  swatches: ['#F7C7D8', '#C7E4F2', '#E2D6F4', '#F2E8C9'],
    promptText: 'outfit in pastel dream palette: soft baby pink, sky pastel, lavender, butter yellow tones' },
  { id: 'cyber',     label: 'Cyber',       swatches: ['#FF00C8', '#00E0FF', '#7B00FF', '#0A0014'],
    promptText: 'outfit in cyber palette: neon magenta, cyan, electric purple over deep black, futuristic mood' },
];

const POSES: PosePreset[] = [
  { id: 'sitting',     name: 'Sentada',           description: 'sitting elegantly, relaxed posture',                                  img: '/app-thumbs/sesion-poses/sitting.jpg' },
  { id: 'lying',       name: 'Acostada',          description: 'lying down on her side, relaxed pose',                                img: '/app-thumbs/sesion-poses/lying.jpg' },
  { id: 'standing',    name: 'De pie',            description: 'standing confident, hand on hip',                                     img: '/app-thumbs/sesion-poses/standing.jpg' },
  { id: 'mirror',      name: 'Espejo',            description: 'mirror selfie pose, candid moment',                                   img: '/app-thumbs/sesion-poses/mirror.jpg' },
  { id: 'looking-away',name: 'Mirada lejos',      description: 'looking away from camera, profile angle, contemplative',              img: '/app-thumbs/sesion-poses/looking-away.jpg' },
  { id: 'window',      name: 'Apoyo ventana',     description: 'leaning against window, natural light from side, dreamy mood',        img: '/app-thumbs/sesion-poses/window.jpg' },
  { id: 'walking',     name: 'Caminando',         description: 'walking forward, motion captured, dynamic',                           img: '/app-thumbs/sesion-poses/walking.jpg' },
  { id: 'reclining',   name: 'Reclinada',         description: 'reclining elegantly, head tilted back, languid pose',                 img: '/app-thumbs/sesion-poses/reclining.jpg' },
  { id: 'over-shoulder',name: 'Mirada hombro',    description: 'looking back over shoulder, soft gaze at camera',                     img: '/app-thumbs/sesion-poses/over-shoulder.jpg' },
  { id: 'hands-hair',  name: 'Manos cabello',     description: 'hands running through hair, natural candid gesture',                  img: '/app-thumbs/sesion-poses/hands-hair.jpg' },
];

const LIGHTING = [
  { id: 'natural',  name: 'Luz natural',  description: 'natural daylight, soft and even' },
  { id: 'golden',   name: 'Golden hour',  description: 'warm golden hour sunlight, long shadows, amber glow' },
  { id: 'studio',   name: 'Estudio',      description: 'professional studio lighting, controlled key + fill' },
  { id: 'night',    name: 'Nocturna',     description: 'moody night lighting, low warm ambient, intimate' },
];

const COST_BY_COUNT: Record<PhotoCount, number> = {
  1:  6,   // single shot — no bulk discount, full NB2 1K price
  4:  16,
  6:  22,
  9:  32,
  12: 40,
};

const CONCURRENCY = 3; // generate up to 3 in parallel

interface PhotoSlot {
  url: string | null;
  status: 'pending' | 'generating' | 'done' | 'failed' | 'rejected' | 'kept';
  poseUsed?: string;
  error?: string;
}

// ─── Helpers ────────────────────────────────────

async function urlToFile(url: string, filename = 'character.png'): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

// ─── Component ─────────────────────────────────

export default function SesionDeFotos({ onNav }: Props) {
  const characters = useCharacterStore(s => s.characters);
  const incrementUsage = useCharacterStore(s => s.incrementUsage);
  const addItems = useGalleryStore(s => s.addItems);
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  // ─── State ───
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [customBaseFile, setCustomBaseFile] = useState<File | null>(null);
  const [customBaseUrl, setCustomBaseUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  const [photoCount, setPhotoCount] = useState<PhotoCount>(6);
  const [selectedScenario, setSelectedScenario] = useState<string>('hotel');
  const [selectedOutfits, setSelectedOutfits] = useState<Set<string>>(new Set(['slip-dress']));
  // Outfit color palette — optional. When set, enriches the outfit prompt with
  // specific color guidance so multi-outfit sessions stay visually consistent.
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  // Filter chip categoría
  const [outfitCatFilter, setOutfitCatFilter] = useState<OutfitCat | 'all'>('all');
  const [selectedPoses, setSelectedPoses] = useState<Set<string>>(new Set(['sitting', 'mirror', 'looking-away', 'window']));
  const [selectedLighting, setSelectedLighting] = useState<string>('natural');
  const [generating, setGenerating] = useState(false);
  const [slots, setSlots] = useState<PhotoSlot[]>([]);
  // Mirror of slots that always reflects the latest value synchronously.
  // React's setSlots updater runs lazily, so reading from `slots` (closure)
  // or via pass-through setSlots is unreliable inside async flows. The ref
  // is bumped alongside every setSlots call via setSlotsRef() below.
  const slotsRef = useRef<PhotoSlot[]>([]);
  const setSlotsRef = (updater: (prev: PhotoSlot[]) => PhotoSlot[]) => {
    setSlots(prev => {
      const next = updater(prev);
      slotsRef.current = next;
      return next;
    });
  };
  const [openLightboxIdx, setOpenLightboxIdx] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Optional reference uploads — override the corresponding preset ───
  // When a user attaches one, it passes to the model as Figure 2/3/4 (multi-ref)
  // and overrides the chip-based scenario/outfit/pose for that aspect.
  const [outfitRefFile, setOutfitRefFile] = useState<File | null>(null);
  const [outfitRefUrl, setOutfitRefUrl] = useState<string | null>(null);
  const [sceneRefFile, setSceneRefFile] = useState<File | null>(null);
  const [sceneRefUrl, setSceneRefUrl] = useState<string | null>(null);
  const [poseRefFile, setPoseRefFile] = useState<File | null>(null);
  const [poseRefUrl, setPoseRefUrl] = useState<string | null>(null);
  const outfitInputRef = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const poseInputRef = useRef<HTMLInputElement>(null);

  const handleRefUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setUrl: (u: string | null) => void,
    label: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(`${label}: solo imágenes`); e.target.value = ''; return; }
    if (file.size > 12 * 1024 * 1024) { toast.error(`${label}: máximo 12 MB`); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      setUrl(reader.result as string);
      setFile(file);
      hapticLight();
      toast.success(`${label} cargada`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Default to first character
  useEffect(() => {
    if (!selectedCharId && !customBaseFile && characters.length > 0) {
      setSelectedCharId(characters[0].id);
    }
  }, [characters, selectedCharId, customBaseFile]);

  const selectedChar = useMemo(
    () => characters.find(c => c.id === selectedCharId) ?? null,
    [characters, selectedCharId],
  );

  const credits = profile?.creditsRemaining ?? 0;
  const cost = COST_BY_COUNT[photoCount];
  const canAfford = credits >= cost;

  const completedCount = slots.filter(s => s.status === 'done' || s.status === 'kept').length;
  const generatingCount = slots.filter(s => s.status === 'generating').length;
  const failedCount = slots.filter(s => s.status === 'failed').length;
  const rejectedCount = slots.filter(s => s.status === 'rejected').length;
  const keptCount = slots.filter(s => s.status === 'kept').length;

  const overallProgress = slots.length > 0
    ? Math.round((completedCount / slots.length) * 100)
    : 0;

  // ─── Toggle multi-select chips ───
  const toggleOutfit = (id: string) => {
    hapticLight();
    setSelectedOutfits(prev => {
      const next = new Set(prev);
      // Allow deselecting ALL chips — useful when user provides an outfit
      // photo reference and wants ONLY that ref to drive wardrobe (avoiding
      // chip text descriptions that NB2 may reject for being too explicit).
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePose = (id: string) => {
    hapticLight();
    setSelectedPoses(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ─── Upload ───
  const handleUploadClick = async () => {
    hapticLight();
    if (await isNativePlatform()) {
      const photo = await takePhoto({ source: 'prompt', quality: 90 });
      if (photo) {
        setCustomBaseFile(photo.file);
        setCustomBaseUrl(photo.dataUrl);
        setSelectedCharId(null);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error('Máximo 12 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomBaseUrl(reader.result as string);
      setCustomBaseFile(file);
      setSelectedCharId(null);
      hapticLight();
    };
    reader.readAsDataURL(file);
  };

  const clearCustomBase = () => {
    hapticLight();
    setCustomBaseFile(null);
    setCustomBaseUrl(null);
    if (characters.length > 0) setSelectedCharId(characters[0].id);
  };

  // ─── Single-photo generation ───
  const generateOnePhoto = async (
    baseFile: File,
    refFiles: File[],
    poseDesc: string,
    poseName: string,
    outfitDesc: string,
    scenarioDesc: string,
    lightingDesc: string,
    isPhotoreal: boolean,
    renderStyle: string,
    abortSignal: AbortSignal,
    figureMap?: { outfit?: number; scene?: number; pose?: number },
  ): Promise<string | null> => {
    const charRenderTag = isPhotoreal ? 'photorealistic' : renderStyle;

    const spec: any = {
      task: isPhotoreal
        ? 'PHOTO SESSION — Generate one shot of a coherent multi-photo session, varying only the pose'
        : `PHOTO SESSION (${charRenderTag}) — Generate one shot of a coherent ${charRenderTag} session, varying only the pose`,
      identity: {
        source: 'Reference Images',
        render_style: charRenderTag,
        preserve: [
          'face_features', 'bone_structure', 'eye_shape', 'eye_color',
          'lip_shape', 'jaw_line', 'skin_tone',
          'hair_style', 'hair_color', 'body_proportions',
          ...(isPhotoreal ? [] : [`${charRenderTag}_rendering_style`]),
        ],
        rule: isPhotoreal
          ? 'Same person across all session shots. Identity is sacred.'
          : `Same ${charRenderTag} character. DO NOT convert to photorealism.`,
      },
      session: {
        scenario: figureMap?.scene
          ? `${scenarioDesc}. PRIMARY scene reference: Figure ${figureMap.scene} (use this image as the literal background/environment)`
          : scenarioDesc,
        outfit: figureMap?.outfit
          ? `${outfitDesc}. PRIMARY outfit reference: Figure ${figureMap.outfit} (the subject MUST wear the exact garment shown in this image — match fabric, color, fit, details)`
          : outfitDesc,
        lighting: lightingDesc,
        pose: figureMap?.pose
          ? `${poseDesc}. PRIMARY pose reference: Figure ${figureMap.pose} (the subject MUST match the body posture and gesture shown in this image)`
          : poseDesc,
        framing: 'medium shot to half body, varies subtly per pose',
      },
      rules: {
        must_change: ['pose', 'camera_angle', 'composition'],
        must_preserve: ['scenario', 'outfit', 'lighting', 'identity', 'render_style'],
        render_quality: isPhotoreal
          ? PHOTOREAL_SKIN
          : `Sharp ${charRenderTag} rendering, consistent line work and palette`,
        never_add: [...NEVER_ADD_TEXT, 'props not in scenario'],
      },
      aspect_ratio: aspectRatio,
    };

    const instruction = `PHOTO SESSION SHOT (${poseName}):\n${JSON.stringify(spec, null, 2)}`;

    try {
      const { editWithNB2Fal } = await import('../services/falService');
      const { editFallback } = await import('../services/editFallback');

      try {
        const r = await editWithNB2Fal(
          baseFile,
          instruction,
          refFiles,
          undefined,
          {
            resolution: '2K',
            // Sesion already builds a curated JSON spec (outfit + scenario +
            // lighting + pose) with the character anchor pre-sanitized via
            // promptBuilder. Skip Haiku normalization to preserve the exact
            // outfit terms (e.g. "lingerie set" must stay as-is — Haiku has
            // been observed silently softening intimate-apparel descriptors).
            skipNormalize: true,
            characterAnchor: selectedChar?.characteristics,
          },
          abortSignal,
        );
        if (r && r.length > 0) return r[0];
        throw new Error('NB2 empty');
      } catch (nb2Err: any) {
        if (nb2Err?.name === 'AbortError') throw nb2Err;
        // Fallback prose optimized for Seedream (Grok auto-sanitized in editFallback).
        const skinFlat = isPhotoreal ? PHOTOREAL_SKIN : renderStyleSkin(charRenderTag);
        const idProse = identityProse({
          numReferences: refFiles.length,
          charIsNonPhoto: !isPhotoreal,
          renderStyle: !isPhotoreal ? renderStyle : undefined,
        });
        const flat = `Edit Figure 1: Generate a photo session shot of this ${isPhotoreal ? 'person' : `${charRenderTag} character`}. ${idProse} Scene: ${scenarioDesc}. Outfit: ${outfitDesc}. Pose: ${poseDesc} (${poseName}). Lighting: ${lightingPhrase(undefined, lightingDesc)}. Change only: pose, camera angle. Keep scenario, outfit, identity. ${skinFlat} Aspect ratio: ${aspectRatio}. ${NO_TEXT_RULE}`;
        const r = await editFallback({
          baseImage: baseFile,
          flatInstruction: flat,
          referenceImages: refFiles,
          abortSignal,
        });
        return r && r.length > 0 ? r[0] : null;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      console.warn('Session photo failed:', err?.message);
      return null;
    }
  };

  // ─── Generate full session ───
  const handleGenerate = async () => {
    if (!selectedChar && !customBaseFile) {
      toast.error('Selecciona un personaje o sube una foto');
      hapticError();
      return;
    }
    if (selectedPoses.size === 0) {
      toast.error('Elige al menos una pose');
      hapticError();
      return;
    }
    // Outfit chips are optional WHEN the user supplies an outfit photo ref —
    // the ref alone drives wardrobe and chip descriptions would override it.
    // Require at least one of (chip selected OR outfit ref uploaded).
    if (selectedOutfits.size === 0 && !outfitRefFile) {
      toast.error('Elige un outfit o sube una foto de referencia de outfit');
      hapticError();
      return;
    }
    if (generating) return;
    if (!canAfford) {
      toast.error(`Necesitas ${cost} créditos. Tienes ${credits}.`);
      hapticError();
      onNav('pricing');
      return;
    }
    hapticMedium();

    const refUrls = selectedChar ? [
      ...(selectedChar.referencePhotoUrls ?? []),
      ...(selectedChar.modelImageUrls ?? []),
    ].filter(u => typeof u === 'string' && u.startsWith('http')).slice(0, 4) : [];

    if (refUrls.length === 0 && !customBaseFile) {
      toast.error('Este personaje no tiene fotos de referencia. Sube una foto o genera una en Studio.');
      return;
    }

    const ok = await decrementCredits(cost);
    if (!ok) { toast.error('Créditos insuficientes'); return; }

    setGenerating(true);
    abortRef.current = new AbortController();
    const abortSignal = abortRef.current.signal;

    // Initialize slots — seed the ref alongside state so async readers stay in sync.
    const initialSlots = Array.from({ length: photoCount }, () => ({ url: null, status: 'pending' as const }));
    slotsRef.current = initialSlots;
    setSlots(initialSlots);

    // Build base file + reference files
    let baseFile: File;
    let refFiles: File[];
    if (customBaseFile) {
      baseFile = customBaseFile;
      refFiles = refUrls.length > 0
        ? await Promise.all(refUrls.slice(0, 3).map((url, i) => urlToFile(url, `session-ref-${i}.png`)))
        : [];
    } else {
      baseFile = await urlToFile(refUrls[0], 'session-base.png');
      refFiles = await Promise.all(refUrls.slice(1).map((url, i) => urlToFile(url, `session-ref-${i}.png`)));
    }

    // Track which Figure index is which uploaded reference (for spec mapping)
    // Character refs come first, then optional uploads in fixed order: outfit, scene, pose.
    // NB2 supports up to 14 refs. We cap character refs to leave room.
    const figureMap: { outfit?: number; scene?: number; pose?: number } = {};
    if (outfitRefFile) { refFiles.push(outfitRefFile); figureMap.outfit = refFiles.length + 1; }  // +1 because Figure 1 is base
    if (sceneRefFile)  { refFiles.push(sceneRefFile);  figureMap.scene  = refFiles.length + 1; }
    if (poseRefFile)   { refFiles.push(poseRefFile);   figureMap.pose   = refFiles.length + 1; }

    // Build pose distribution: cycle through selected poses to fill N slots
    const poseList = Array.from(selectedPoses).map(id => POSES.find(p => p.id === id)!).filter(Boolean);
    const outfitList = Array.from(selectedOutfits).map(id => OUTFITS.find(o => o.id === id)!).filter(Boolean);
    const scenario = SCENARIOS.find(s => s.id === selectedScenario)!;
    const lighting = LIGHTING.find(l => l.id === selectedLighting)!;
    const paletteClause = selectedPalette
      ? OUTFIT_PALETTES.find(p => p.id === selectedPalette)?.promptText ?? ''
      : '';

    const isPhotoreal = !selectedChar?.renderStyle || selectedChar.renderStyle.toLowerCase() === 'photorealistic';
    const renderStyle = (selectedChar?.renderStyle || 'photorealistic').toLowerCase();

    // Per-photo specs. When no chip is selected, we fall back to a neutral
    // placeholder description and rely on the uploaded outfit reference image
    // (figureMap.outfit) to drive wardrobe. The placeholder avoids contradicting
    // the photo ref the way explicit chip text would.
    const outfitFallback = {
      id: 'ref-only',
      name: 'Outfit referencia',
      cat: 'editorial' as OutfitCat,
      description: 'wear the exact outfit shown in the outfit reference image — match fabric, color, cut, and styling literally',
      emoji: '◇',
    };
    const photoSpecs = Array.from({ length: photoCount }, (_, i) => {
      const pose = poseList[i % poseList.length];
      const outfit = outfitList.length > 0 ? outfitList[i % outfitList.length] : outfitFallback;
      // Append palette to outfit description if user chose one
      const outfitDescWithPalette = paletteClause
        ? `${outfit.description}. ${paletteClause}`
        : outfit.description;
      return { index: i, pose, outfit: { ...outfit, description: outfitDescWithPalette } };
    });

    // Concurrency-limited execution
    let nextIdx = 0;
    let activeWorkers = 0;
    let resolvedAll: ((v: void) => void) | null = null;

    const allDone = new Promise<void>(resolve => { resolvedAll = resolve; });

    const startNext = () => {
      if (abortSignal.aborted) {
        // Mark any remaining pending slots as failed so UI reflects cancel
        setSlotsRef(prev => prev.map(s => s.status === 'pending' ? { ...s, status: 'failed', error: 'Cancelado' } : s));
        if (activeWorkers === 0 && resolvedAll) resolvedAll();
        return;
      }
      while (activeWorkers < CONCURRENCY && nextIdx < photoSpecs.length) {
        const spec = photoSpecs[nextIdx++];
        activeWorkers++;
        setSlotsRef(prev => prev.map((s, i) => i === spec.index ? { ...s, status: 'generating' } : s));

        generateOnePhoto(
          baseFile, refFiles,
          spec.pose.description, spec.pose.name,
          spec.outfit.description,
          scenario.description,
          lighting.description,
          isPhotoreal, renderStyle,
          abortSignal,
          figureMap,
        )
          .then(url => {
            setSlotsRef(prev => prev.map((s, i) => i === spec.index
              ? (url ? { ...s, url, status: 'done', poseUsed: spec.pose.name } : { ...s, status: 'failed', error: 'No se pudo generar' })
              : s));
          })
          .catch(err => {
            if (err?.name === 'AbortError') {
              setSlotsRef(prev => prev.map((s, i) => i === spec.index ? { ...s, status: 'failed', error: 'Cancelado' } : s));
            } else {
              setSlotsRef(prev => prev.map((s, i) => i === spec.index ? { ...s, status: 'failed', error: String(err?.message || err).slice(0, 60) } : s));
            }
          })
          .finally(() => {
            activeWorkers--;
            // Resolve when (a) all done normally, OR (b) aborted and no more in-flight
            const allConsumed = nextIdx >= photoSpecs.length;
            if ((abortSignal.aborted || allConsumed) && activeWorkers === 0) {
              if (resolvedAll) resolvedAll();
            } else if (!abortSignal.aborted) {
              startNext();
            }
          });
      }
    };

    startNext();
    await allDone;

    setGenerating(false);

    // Read final slots from the ref — `slots` from closure or pass-through
    // setSlots are stale here because React batches state updates.
    const finalSlots = slotsRef.current;

    const failed = finalSlots.filter(s => s.status === 'failed').length;
    if (failed > 0) {
      const refundPerPhoto = cost / photoCount;
      restoreCredits(Math.round(refundPerPhoto * failed));
      toast.info(`${failed} foto${failed > 1 ? 's' : ''} falló. Créditos parciales restaurados.`);
    }

    // Save successful photos to gallery — watermark free-tier outputs.
    const successful = finalSlots.filter(s => s.status === 'done' && s.url);
    if (successful.length > 0) {
      const { watermarkIfFreeTier } = await import('../services/watermarkService');
      const stamped = await Promise.all(
        successful.map(s => watermarkIfFreeTier(s.url!, profile?.subscriptionPlan, profile?.subscriptionStatus)),
      );
      addItems(stamped.map((url, i) => ({
        id: crypto.randomUUID(),
        url,
        prompt: `Sesión · ${scenario.name} · ${outfitList.map(o => o.name).join(' / ')}`,
        model: 'nb2-sesion',
        timestamp: Date.now() + i,
        // 'session' makes MobileGallery's "Sesiones" filter pick these up.
        // Storage layer remaps session → create internally — safe both sides.
        type: 'session' as const,
        characterId: selectedChar?.id ?? undefined,
        tags: ['sesion-de-fotos', selectedScenario, ...(customBaseFile ? ['custom-upload'] : [])],
        // 'director' is one of the two valid enum values ('generate' | 'director').
        // Previously cast 'sesion-de-fotos' as any here, which silently failed the
        // DB CHECK constraint on cloud save — photos lived only in IndexedDB
        // until refresh, then disappeared on reload.
        source: 'director' as const,
      })));
      if (selectedChar) incrementUsage(selectedChar.id);
      hapticSuccess();
      // User feedback (2026-05-14): "no queda claro cuándo se guardan las fotos".
      // Photos save automatically into the Gallery on success — surface that
      // explicitly so the user trusts the flow.
      toast.success(`${successful.length} foto${successful.length === 1 ? '' : 's'} en Galería`);
    } else {
      hapticError();
    }

    abortRef.current = null;
  };

  const handleCancel = () => {
    hapticLight();
    abortRef.current?.abort();
    toast.info('Cancelando sesión…');
  };

  // ─── Mark photos keep / reject ───
  const markKeep = (idx: number) => {
    hapticLight();
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, status: s.status === 'kept' ? 'done' : 'kept' } : s));
  };

  const markReject = (idx: number) => {
    hapticLight();
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, status: s.status === 'rejected' ? 'done' : 'rejected' } : s));
  };

  // ─── Share single photo from grid ───
  const handleShareSlot = async (idx: number) => {
    const slot = slots[idx];
    if (!slot.url) return;
    hapticLight();
    const ok = await sharePhoto({
      url: slot.url,
      title: 'VIST · Sesión de Fotos',
      text: `Sesión #${idx + 1} · ${slot.poseUsed || ''}`,
      filename: `vist-sesion-${idx + 1}.jpg`,
    });
    if (!ok) {
      const a = document.createElement('a');
      a.href = slot.url;
      a.download = `vist-sesion-${idx + 1}.jpg`;
      a.click();
    }
  };

  // ─── Empty state ───
  if (characters.length === 0 && !customBaseFile) {
    return (
      <div className="ss-shell">
        <style>{SESION_STYLES}</style>
        <AppTopBar
          mood={LIGHT_MOOD}
          title="Sesión · Fotos"
          credits={credits}
          onBack={() => onNav('studio')}
        />
        <div className="ss-empty">
          <div className="ss-empty-icon"><Camera size={28} /></div>
          <h2 className="ss-empty-title">Empieza con una <em>foto</em></h2>
          <p className="ss-empty-sub">Sube una foto o crea un personaje para tirarle una sesión de 4 a 12 fotos coherentes.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="ss-empty-cta" onClick={handleUploadClick}>
              <Upload size={14} /> Subir foto
            </button>
            <button className="ss-empty-cta" style={{ background: 'transparent', color: 'var(--ink-1)', border: '1px solid var(--line)', boxShadow: 'none' }} onClick={() => onNav('create')}>
              <Sparkles size={14} /> Crear personaje
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        </div>
      </div>
    );
  }

  // ─── Main ───
  const sessionStarted = slots.length > 0;

  return (
    <div className="ss-shell">
      <style>{SESION_STYLES}</style>

      {/* Top bar */}
      <AppTopBar
        mood={LIGHT_MOOD}
        title="Sesión · Fotos"
        credits={credits}
        onBack={() => onNav('studio')}
      />

      {/* Hero */}
      <section className="ss-hero">
        <div className="ss-hero-eyebrow">App #03 · Sesión coherente</div>
        <h1 className="ss-hero-title">
          {photoCount} tomas,<br /><em>una historia.</em>
        </h1>
      </section>

      {/* Character chip + upload */}
      <div className="ss-char-row">
        {customBaseFile && customBaseUrl ? (
          <div className="ss-char-chip is-active ss-char-upload">
            <span className="ss-char-thumb" style={{ backgroundImage: `url(${customBaseUrl})` }} />
            <span className="ss-char-name">Mi foto</span>
            <button className="ss-char-x" onClick={clearCustomBase} aria-label="Quitar">
              <X size={11} />
            </button>
          </div>
        ) : (
          <button className="ss-char-chip ss-char-upload-btn" onClick={handleUploadClick}>
            <span className="ss-char-thumb ss-char-thumb-upload"><Upload size={13} /></span>
            <span className="ss-char-name">Subir foto</span>
          </button>
        )}
        {characters.map(c => (
          <button
            key={c.id}
            className={`ss-char-chip ${selectedCharId === c.id && !customBaseFile ? 'is-active' : ''}`}
            onClick={() => {
              hapticLight();
              setCustomBaseFile(null);
              setCustomBaseUrl(null);
              setSelectedCharId(c.id);
            }}
          >
            <span className="ss-char-thumb" style={{ backgroundImage: c.thumbnail ? `url(${c.thumbnail})` : undefined }} />
            <span className="ss-char-name">{c.name}</span>
          </button>
        ))}
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      </div>

      {/* Contact sheet (proof) — show only when session started */}
      {sessionStarted && (
        <section className="ss-proof-section">
          <div className="ss-proof-card">
            <div className="ss-proof-header">
              <div className="ss-proof-title-block">
                <div className="ss-proof-title">Tus <em>fotos</em></div>
                <div className="ss-proof-meta">
                  {completedCount} listas · {keptCount > 0 ? `${keptCount} keeper · ` : ''}
                  {rejectedCount > 0 ? `${rejectedCount} reject · ` : ''}
                  {photoCount} total
                </div>
              </div>
              {generating && (
                <button className="ss-proof-cancel" onClick={handleCancel}>
                  <X size={12} /> Cancelar
                </button>
              )}
            </div>

            {/* Overall progress bar */}
            <div className="ss-progress">
              <div className="ss-progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>

            {/* Grid */}
            <div className={`ss-proof-grid ss-cols-${photoCount === 4 ? '2' : '3'}`}>
              {slots.map((s, i) => (
                <div
                  key={i}
                  className={`ss-proof-frame is-${s.status}`}
                  onClick={() => s.url && setOpenLightboxIdx(i)}
                >
                  {s.url && (
                    <img
                      src={s.url}
                      alt={`Toma ${i + 1}`}
                      className={`ss-proof-img ${s.status === 'rejected' ? 'is-faded' : ''} ss-fade-in`}
                    />
                  )}
                  {s.status === 'pending' && (
                    <div className="ss-proof-placeholder">
                      <span className="ss-proof-num">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                  )}
                  {s.status === 'generating' && (
                    <div className="ss-proof-loading">
                      <div className="ss-proof-spinner" />
                      <span className="ss-proof-num">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                  )}
                  {s.status === 'failed' && (
                    <div className="ss-proof-failed">
                      <X size={16} />
                      <span className="ss-proof-num">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                  )}
                  {s.url && (
                    <span className="ss-proof-num is-overlay">{String(i + 1).padStart(2, '0')}</span>
                  )}
                  {s.status === 'rejected' && <div className="ss-proof-x" />}
                  {s.status === 'kept' && (
                    <span className="ss-proof-keep-mark">
                      <Check size={11} />
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer stats */}
            {!generating && completedCount > 0 && (
              <div className="ss-proof-footer">
                <div className="ss-proof-stats">
                  <span className="ss-stat"><span className="ss-stat-dot is-keep" />{keptCount} keep</span>
                  <span className="ss-stat"><span className="ss-stat-dot is-reject" />{rejectedCount} reject</span>
                  <span className="ss-stat"><span className="ss-stat-dot is-pending" />{completedCount - keptCount - rejectedCount} pending</span>
                </div>
                {/* Make auto-save behavior explicit. The keep/reject marks are
                 *  just session curation; every successful photo is already
                 *  saved to the Gallery the moment it generates. */}
                <span className="ss-proof-tip">Guardadas en Galería · Tap para abrir</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Director — Aspect ratio */}
      <section className="ss-director">
        <div className="ss-section-head">
          <span className="ss-eyebrow">Dirección · 01</span>
          <h2 className="ss-section-title"><em>Formato</em></h2>
        </div>
        <div className="ss-aspect-strip">
          {(['3:4', '1:1', '4:3', '9:16', '16:9'] as AspectRatio[]).map(ar => {
            const dim = ar === '3:4' ? { w: 14, h: 18 } : ar === '1:1' ? { w: 16, h: 16 } : ar === '4:3' ? { w: 18, h: 14 } : ar === '9:16' ? { w: 11, h: 18 } : { w: 18, h: 10 };
            return (
              <button
                key={ar}
                className={`ss-aspect-pill ${aspectRatio === ar ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setAspectRatio(ar); }}
              >
                <span className="ss-aspect-shape" style={{ width: dim.w, height: dim.h }} />
                <span className="ss-aspect-label">{ar}</span>
              </button>
            );
          })}
        </div>

        {/* Photo count */}
        <div className="ss-field">
          <div className="ss-field-head">
            <span className="ss-field-name"><span className="ss-field-num">02</span>Cantidad</span>
            <span className="ss-field-hint">{cost} créditos</span>
          </div>
          <div className="ss-count-row">
            {([1, 4, 6, 9, 12] as PhotoCount[]).map(n => (
              <button
                key={n}
                className={`ss-count-pill ${photoCount === n ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setPhotoCount(n); }}
              >
                <div className="ss-count-num">{n}</div>
                <span className="ss-count-label">{COST_BY_COUNT[n]}cr</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div className="ss-field">
          <div className="ss-field-head">
            <span className="ss-field-name"><span className="ss-field-num">03</span>Escenario</span>
            <span className="ss-field-hint">{SCENARIOS.length} disponibles</span>
          </div>
          <div className="ss-cards-row">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                className={`ss-scn-card ${selectedScenario === s.id ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setSelectedScenario(s.id); }}
              >
                <div className="ss-scn-img" style={{ backgroundImage: `url(${s.img})` }} />
                <div className="ss-scn-info">
                  <div className="ss-scn-name">{s.name}</div>
                  <div className="ss-scn-meta">{s.meta}</div>
                </div>
                {selectedScenario === s.id && (
                  <div className="ss-scn-check">
                    <Check size={11} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Outfit */}
        <div className="ss-field">
          <div className="ss-field-head">
            <span className="ss-field-name"><span className="ss-field-num">04</span>Outfit</span>
            <span className="ss-field-hint">
              {selectedOutfits.size === 0
                ? (outfitRefFile ? 'Usa solo la foto de referencia' : 'Opcional · o sube foto ref')
                : `${selectedOutfits.size} elegido${selectedOutfits.size === 1 ? '' : 's'}`}
            </span>
          </div>

          {/* Categoría filter */}
          <div className="ss-outfit-cats">
            {(['all', 'editorial', 'casual', 'sensual', 'sport', 'fantasy'] as const).map(c => (
              <button
                key={c}
                type="button"
                className={`ss-cat-pill ${outfitCatFilter === c ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setOutfitCatFilter(c); }}
              >
                {c === 'all' ? 'Todos' : c === 'editorial' ? 'Editorial' : c === 'casual' ? 'Casual' : c === 'sensual' ? 'Sensual' : c === 'sport' ? 'Sport' : 'Fantasy'}
              </button>
            ))}
          </div>

          <div className="ss-chips-row">
            {OUTFITS.filter(o => outfitCatFilter === 'all' || o.cat === outfitCatFilter).map(o => (
              <button
                key={o.id}
                className={`ss-chip ${selectedOutfits.has(o.id) ? 'is-active' : ''}`}
                onClick={() => toggleOutfit(o.id)}
              >
                <span className="ss-chip-icon">{o.emoji}</span>{o.name}
              </button>
            ))}
          </div>

          {/* Palette of outfit colors — keeps wardrobe consistent across photos */}
          <div className="ss-palette-head">
            <span className="ss-palette-title">Paleta de outfit</span>
            <span className="ss-palette-sub">Opcional · mantiene colores consistentes</span>
          </div>
          <div className="ss-palette-row">
            <button
              type="button"
              className={`ss-palette-tile is-none ${selectedPalette === null ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setSelectedPalette(null); }}
              aria-label="Sin paleta específica"
            >
              <span className="ss-palette-x">×</span>
              <span className="ss-palette-label">Libre</span>
            </button>
            {OUTFIT_PALETTES.map(p => (
              <button
                key={p.id}
                type="button"
                className={`ss-palette-tile ${selectedPalette === p.id ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setSelectedPalette(p.id === selectedPalette ? null : p.id); }}
                aria-label={p.label}
              >
                <div className="ss-palette-swatches">
                  {p.swatches.map((sw, i) => (
                    <span key={i} className="ss-palette-sw" style={{ background: sw }} />
                  ))}
                </div>
                <span className="ss-palette-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pose */}
        <div className="ss-field">
          <div className="ss-field-head">
            <span className="ss-field-name"><span className="ss-field-num">05</span>Poses</span>
            <span className="ss-field-hint">Multi · {selectedPoses.size} elegidas</span>
          </div>
          <div className="ss-pose-grid">
            {POSES.map(p => (
              <button
                key={p.id}
                className={`ss-pose-tile ${selectedPoses.has(p.id) ? 'is-active' : ''}`}
                onClick={() => togglePose(p.id)}
              >
                <div className="ss-pose-img" style={{ backgroundImage: `url(${p.img})` }} />
                <span className="ss-pose-label">{p.name}</span>
                {selectedPoses.has(p.id) && (
                  <div className="ss-pose-check">
                    <Check size={9} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lighting */}
        <div className="ss-field">
          <div className="ss-field-head">
            <span className="ss-field-name"><span className="ss-field-num">06</span>Iluminación</span>
          </div>
          <div className="ss-light-row">
            {LIGHTING.map(l => (
              <button
                key={l.id}
                className={`ss-light-cell ${selectedLighting === l.id ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setSelectedLighting(l.id); }}
              >
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Referencias opcionales — outfit / escenario / pose desde foto.
            Cuando se sube una imagen, sobreescribe el preset de chips de esa fase. */}
        <div className="ss-field">
          <div className="ss-field-head">
            <span className="ss-field-name"><span className="ss-field-num">07</span>Referencias (opcional)</span>
            <span className="ss-field-hint">Sube una foto y se usa como ref absoluta</span>
          </div>
          <div className="ss-ref-row">
            {/* Outfit */}
            <input ref={outfitInputRef} type="file" accept="image/*" hidden
                   onChange={e => handleRefUpload(e, setOutfitRefFile, setOutfitRefUrl, 'Outfit')} />
            {outfitRefUrl ? (
              <div className="ss-ref-card">
                <img src={outfitRefUrl} alt="Outfit" />
                <span className="ss-ref-label">Outfit</span>
                <button className="ss-ref-clear" onClick={() => { setOutfitRefFile(null); setOutfitRefUrl(null); hapticLight(); }}>
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button className="ss-ref-slot" onClick={() => { hapticLight(); outfitInputRef.current?.click(); }}>
                <span className="ss-ref-emoji">👗</span>
                <strong>Outfit</strong>
                <small>Foto de la prenda</small>
              </button>
            )}

            {/* Escenario */}
            <input ref={sceneInputRef} type="file" accept="image/*" hidden
                   onChange={e => handleRefUpload(e, setSceneRefFile, setSceneRefUrl, 'Escenario')} />
            {sceneRefUrl ? (
              <div className="ss-ref-card">
                <img src={sceneRefUrl} alt="Escenario" />
                <span className="ss-ref-label">Escenario</span>
                <button className="ss-ref-clear" onClick={() => { setSceneRefFile(null); setSceneRefUrl(null); hapticLight(); }}>
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button className="ss-ref-slot" onClick={() => { hapticLight(); sceneInputRef.current?.click(); }}>
                <span className="ss-ref-emoji">🌅</span>
                <strong>Escenario</strong>
                <small>Foto del lugar</small>
              </button>
            )}

            {/* Pose */}
            <input ref={poseInputRef} type="file" accept="image/*" hidden
                   onChange={e => handleRefUpload(e, setPoseRefFile, setPoseRefUrl, 'Pose')} />
            {poseRefUrl ? (
              <div className="ss-ref-card">
                <img src={poseRefUrl} alt="Pose" />
                <span className="ss-ref-label">Pose</span>
                <button className="ss-ref-clear" onClick={() => { setPoseRefFile(null); setPoseRefUrl(null); hapticLight(); }}>
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button className="ss-ref-slot" onClick={() => { hapticLight(); poseInputRef.current?.click(); }}>
                <span className="ss-ref-emoji">🧍</span>
                <strong>Pose</strong>
                <small>Foto de referencia</small>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox for individual photo */}
      {openLightboxIdx !== null && slots[openLightboxIdx]?.url && (
        <div className="ss-lightbox" onClick={() => setOpenLightboxIdx(null)}>
          <img src={slots[openLightboxIdx]!.url!} alt="Lightbox" className="ss-lightbox-img" />
          <div className="ss-lightbox-actions" onClick={e => e.stopPropagation()}>
            <button
              className={`ss-lb-btn ${slots[openLightboxIdx]?.status === 'kept' ? 'is-active' : ''}`}
              onClick={() => markKeep(openLightboxIdx)}
            >
              <Check size={14} /> Keep
            </button>
            <button
              className={`ss-lb-btn ${slots[openLightboxIdx]?.status === 'rejected' ? 'is-active' : ''}`}
              onClick={() => markReject(openLightboxIdx)}
            >
              <X size={14} /> Reject
            </button>
            <button className="ss-lb-btn" onClick={() => handleShareSlot(openLightboxIdx)}>
              <Share2 size={14} /> Compartir
            </button>
            {/* Routes through handleShareSlot (which uses sharePhoto) so iOS
                lands the file in Photos. <a download> silently fails on iOS
                WKWebView for cross-origin URLs. */}
            <button className="ss-lb-btn" onClick={() => handleShareSlot(openLightboxIdx)}>
              <Download size={14} /> Bajar
            </button>
          </div>
          <button className="ss-lightbox-close" onClick={() => setOpenLightboxIdx(null)} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Floating CTA */}
      <div className="ss-cta-wrap">
        <div className="ss-cta-row">
          <button
            className="ss-cta-secondary"
            onClick={() => { setSlots([]); }}
            aria-label="Reset"
            disabled={generating}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="ss-cta-primary"
            onClick={handleGenerate}
            disabled={generating || !canAfford}
          >
            <span className="ss-cta-cost">{cost} cr · {photoCount} fotos</span>
            <span className="ss-cta-label">
              {generating
                ? `${completedCount}/${photoCount}…`
                : sessionStarted ? 'Otra sesión' : 'Generar sesión'}
            </span>
            <span className="ss-cta-arrow">
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

const SESION_STYLES = `
.ss-shell {
  --bg-0: #EFE5D2;
  --bg-1: #F7EFDD;
  --bg-card: #FDF7E8;
  --paper: #F2E8D2;
  --frame: #1A1410;
  --ink-0: #1A1410;
  --ink-1: #2E2A24;
  --ink-2: #5E5447;
  --ink-3: #998E7C;
  --line: rgba(26, 20, 16, 0.10);
  --line-soft: rgba(26, 20, 16, 0.05);
  --copper: #B0772D;
  --copper-deep: #855317;
  --gold: #C9A76A;
  --rust: #8E4A2C;
  --reject: #B9544A;
  --ease: cubic-bezier(0.32, 0.72, 0, 1);

  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-0);
  color: var(--ink-0);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-bottom: calc(150px + env(safe-area-inset-bottom));
  background-image:
    radial-gradient(circle at 25% 15%, rgba(26,20,16,0.04) 1px, transparent 1px),
    radial-gradient(circle at 75% 70%, rgba(26,20,16,0.025) 1px, transparent 1px);
  background-size: 26px 26px, 42px 42px;
  position: relative;
}

/* Top bar — provided by AppTopBar shared component */

/* Hero */
.ss-shell .ss-hero { padding: 6px 20px 0; }
.ss-shell .ss-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-3);
  margin-bottom: 8px;
}
.ss-shell .ss-hero-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 40px; line-height: 0.95;
  letter-spacing: -0.02em; color: var(--ink-0);
  font-weight: 400;
}
.ss-shell .ss-hero-title em { font-style: italic; color: var(--copper); }

/* Char row */
.ss-shell .ss-char-row {
  display: flex; gap: 8px;
  margin: 18px 20px 0;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
  /* Right-edge fade so users discover more characters off-screen. */
  mask-image: linear-gradient(to right, black calc(100% - 32px), transparent);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 32px), transparent);
}
.ss-shell .ss-char-row::-webkit-scrollbar { display: none; }
.ss-shell .ss-char-chip {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 6px;
  min-height: 44px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.3s var(--ease);
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-char-chip:active { transform: scale(0.96); }
.ss-shell .ss-char-chip.is-active { background: var(--ink-0); border-color: var(--ink-0); }
.ss-shell .ss-char-chip.is-active .ss-char-name { color: var(--bg-card); }
.ss-shell .ss-char-thumb {
  width: 26px; height: 26px;
  border-radius: 50%;
  background-color: var(--paper);
  background-size: cover; background-position: center;
  flex-shrink: 0;
}
.ss-shell .ss-char-name { font-size: 12px; font-weight: 500; color: var(--ink-1); }
.ss-shell .ss-char-upload-btn { border-style: dashed !important; border-color: var(--copper) !important; color: var(--copper-deep); }
.ss-shell .ss-char-upload-btn .ss-char-name { color: var(--copper-deep); font-weight: 600; }
.ss-shell .ss-char-thumb-upload {
  background-color: var(--paper) !important;
  display: flex; align-items: center; justify-content: center;
  color: var(--copper);
}
.ss-shell .ss-char-upload { position: relative; padding-right: 32px; }
.ss-shell .ss-char-x {
  position: absolute; right: 6px; top: 50%;
  transform: translateY(-50%);
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none;
  color: var(--bg-card);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}

/* Proof sheet */
.ss-shell .ss-proof-section { padding: 20px 20px 0; }
.ss-shell .ss-proof-card {
  padding: 18px 16px 14px;
  background: var(--bg-card);
  border-radius: 18px;
  border: 1px solid var(--line);
  position: relative;
  box-shadow: 0 16px 32px -16px rgba(26, 20, 16, 0.18);
}
.ss-shell .ss-proof-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.ss-shell .ss-proof-title-block { display: flex; flex-direction: column; gap: 2px; }
.ss-shell .ss-proof-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px; letter-spacing: -0.01em;
}
.ss-shell .ss-proof-title em { font-style: italic; }
.ss-shell .ss-proof-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--copper-deep);
}
.ss-shell .ss-proof-cancel {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px;
  background: transparent;
  border: 1px solid var(--reject);
  color: var(--reject);
  border-radius: 999px;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

.ss-shell .ss-progress {
  height: 3px;
  background: var(--paper);
  border-radius: 2px;
  margin-bottom: 12px;
  overflow: hidden;
}
.ss-shell .ss-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--copper) 0%, var(--copper-deep) 100%);
  transition: width 0.4s var(--ease);
}

.ss-shell .ss-proof-grid {
  display: grid;
  gap: 6px;
  background: var(--frame);
  padding: 6px;
  border-radius: 10px;
}
.ss-shell .ss-proof-grid.ss-cols-2 { grid-template-columns: repeat(2, 1fr); }
.ss-shell .ss-proof-grid.ss-cols-3 { grid-template-columns: repeat(3, 1fr); }

.ss-shell .ss-proof-frame {
  position: relative;
  aspect-ratio: 4/5;
  background: #2E2A24;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-proof-frame:active { transform: scale(0.96); }
.ss-shell .ss-proof-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
}
.ss-shell .ss-fade-in {
  animation: ss-img-fade-in 380ms var(--ease) both;
}
@keyframes ss-img-fade-in {
  from { opacity: 0; transform: scale(1.04); filter: blur(4px); }
  to   { opacity: 1; transform: scale(1); filter: blur(0); }
}
.ss-shell .ss-proof-img.is-faded {
  filter: grayscale(0.85) brightness(0.55);
}
.ss-shell .ss-proof-frame.is-rejected::after {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1.5px solid rgba(185, 84, 74, 0.7);
  border-radius: 2px;
  background:
    linear-gradient(45deg, transparent 49%, rgba(185, 84, 74, 0.7) 49%, rgba(185, 84, 74, 0.7) 51%, transparent 51%),
    linear-gradient(-45deg, transparent 49%, rgba(185, 84, 74, 0.7) 49%, rgba(185, 84, 74, 0.7) 51%, transparent 51%);
  z-index: 2;
}
.ss-shell .ss-proof-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em;
  color: rgba(253, 247, 232, 0.5);
}
.ss-shell .ss-proof-num.is-overlay {
  position: absolute;
  top: 4px; left: 4px;
  z-index: 3;
  background: rgba(26, 20, 16, 0.65);
  backdrop-filter: blur(4px);
  color: rgba(253, 247, 232, 0.92);
  font-size: 8px;
  padding: 2px 5px;
  border-radius: 3px;
}
.ss-shell .ss-proof-keep-mark {
  position: absolute;
  top: 4px; right: 4px;
  z-index: 3;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--copper);
  display: flex; align-items: center; justify-content: center;
  color: var(--bg-card);
}
.ss-shell .ss-proof-placeholder, .ss-shell .ss-proof-loading, .ss-shell .ss-proof-failed {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px;
}
.ss-shell .ss-proof-failed { color: var(--reject); }
.ss-shell .ss-proof-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(253, 247, 232, 0.15);
  border-top-color: var(--copper);
  border-radius: 50%;
  animation: ss-spin 0.8s linear infinite;
}
@keyframes ss-spin {
  to { transform: rotate(360deg); }
}

.ss-shell .ss-proof-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px dashed var(--line);
  font-size: 10px;
  color: var(--ink-3);
}
.ss-shell .ss-proof-stats { display: flex; gap: 12px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.12em; text-transform: uppercase; }
.ss-shell .ss-stat { display: inline-flex; align-items: center; gap: 4px; }
.ss-shell .ss-stat-dot { width: 6px; height: 6px; border-radius: 50%; }
.ss-shell .ss-stat-dot.is-keep { background: var(--copper); }
.ss-shell .ss-stat-dot.is-reject { background: var(--reject); opacity: 0.7; }
.ss-shell .ss-stat-dot.is-pending { background: var(--ink-3); }
.ss-shell .ss-proof-tip { font-style: italic; font-size: 9px; }

/* Director */
.ss-shell .ss-director { padding: 26px 20px 0; }
.ss-shell .ss-section-head {
  display: flex; flex-direction: column;
  margin-bottom: 14px;
}
.ss-shell .ss-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--copper-deep);
}
.ss-shell .ss-section-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 26px; letter-spacing: -0.02em;
  color: var(--ink-0); font-weight: 400;
  margin: 4px 0 0; line-height: 1;
}
.ss-shell .ss-section-title em { font-style: italic; }

/* Aspect strip */
.ss-shell .ss-aspect-strip {
  display: flex;
  gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 6px;
}
.ss-shell .ss-aspect-pill {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  padding: 10px 4px 8px;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  color: var(--ink-2);
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-aspect-pill:active { transform: scale(0.94); }
.ss-shell .ss-aspect-pill.is-active { background: var(--ink-0); color: var(--bg-card); }
.ss-shell .ss-aspect-shape {
  border: 1.4px solid currentColor;
  opacity: 0.85;
  border-radius: 1px;
}
.ss-shell .ss-aspect-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.1em;
  font-weight: 600;
}

/* Field */
.ss-shell .ss-field { margin-top: 22px; }
.ss-shell .ss-field-head {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 10px;
}
.ss-shell .ss-field-name {
  font-size: 12px; font-weight: 600;
  color: var(--ink-1);
  display: flex; align-items: center; gap: 8px;
}
.ss-shell .ss-field-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; color: var(--copper-deep);
  font-weight: 500;
}
.ss-shell .ss-field-hint { font-size: 11px; color: var(--ink-3); }

/* Count selector */
.ss-shell .ss-count-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 6px;
}
.ss-shell .ss-count-pill {
  padding: 12px 6px;
  text-align: center;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s var(--ease);
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--ink-1);
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-count-pill.is-active { background: var(--ink-0); color: var(--bg-card); }
.ss-shell .ss-count-pill .ss-count-num {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-style: italic;
  font-size: 22px; line-height: 1;
}
.ss-shell .ss-count-pill .ss-count-label {
  display: block;
  margin-top: 2px;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
  opacity: 0.7;
}

/* Cards row (scenarios) */
.ss-shell .ss-cards-row {
  display: flex; gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -20px;
  padding: 0 20px 4px;
  scroll-snap-type: x mandatory;
  /* Right-edge fade so users discover the row continues off-screen. */
  mask-image: linear-gradient(to right, black calc(100% - 32px), transparent);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 32px), transparent);
}
.ss-shell .ss-cards-row::-webkit-scrollbar { display: none; }
.ss-shell .ss-scn-card {
  flex-shrink: 0;
  width: 130px;
  scroll-snap-align: start;
  cursor: pointer;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 4/5;
  background: #2A1F18;
  border: 2px solid transparent;
  transition: transform 0.3s var(--ease);
  font-family: inherit;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-scn-card:active { transform: scale(0.96); }
.ss-shell .ss-scn-card.is-active { border-color: var(--copper); }
.ss-shell .ss-scn-img { position: absolute; inset: 0; background-size: cover; background-position: center; }
.ss-shell .ss-scn-card::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%);
}
.ss-shell .ss-scn-info {
  position: absolute;
  bottom: 10px; left: 10px; right: 10px;
  z-index: 2; color: #FDF7E8;
  text-align: left;
}
.ss-shell .ss-scn-name {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 14px; font-style: italic; line-height: 1;
}
.ss-shell .ss-scn-meta {
  margin-top: 4px;
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  opacity: 0.78;
  letter-spacing: 0.12em; text-transform: uppercase;
}
.ss-shell .ss-scn-check {
  position: absolute;
  top: 8px; right: 8px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--copper);
  display: flex; align-items: center; justify-content: center;
  color: var(--bg-card);
  z-index: 2;
}

/* Outfit category filter pills */
.ss-shell .ss-outfit-cats {
  display: flex; gap: 5px; flex-wrap: wrap;
  margin-bottom: 8px;
}
.ss-shell .ss-cat-pill {
  padding: 5px 11px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  cursor: pointer;
  transition: all 0.2s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-cat-pill:active { transform: scale(0.94); }
.ss-shell .ss-cat-pill.is-active {
  background: var(--ink-0); border-color: var(--ink-0); color: var(--bg-card);
}

/* Chip multi-select (outfit) */
.ss-shell .ss-chips-row { display: flex; flex-wrap: wrap; gap: 6px; }
.ss-shell .ss-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 13px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 12px; font-weight: 500;
  color: var(--ink-1);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-chip:active { transform: scale(0.94); }
.ss-shell .ss-chip.is-active { background: var(--ink-0); border-color: var(--ink-0); color: var(--bg-card); }
.ss-shell .ss-chip-icon { font-size: 14px; line-height: 1; }

/* Outfit color palette */
.ss-shell .ss-palette-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-top: 14px; margin-bottom: 6px;
}
.ss-shell .ss-palette-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-1);
}
.ss-shell .ss-palette-sub {
  font-size: 10px;
  color: var(--ink-3);
}
.ss-shell .ss-palette-row {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.ss-shell .ss-palette-tile {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 5px 8px 6px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s var(--ease);
  -webkit-tap-highlight-color: transparent;
  min-width: 56px;
}
.ss-shell .ss-palette-tile:active { transform: scale(0.94); }
.ss-shell .ss-palette-tile.is-active {
  border-color: var(--ink-0);
  background: var(--ink-0);
}
.ss-shell .ss-palette-tile.is-active .ss-palette-label { color: var(--bg-card); }
.ss-shell .ss-palette-tile.is-active .ss-palette-x { color: var(--bg-card); }
.ss-shell .ss-palette-swatches {
  display: flex; gap: 1px;
  width: 44px; height: 14px;
  border-radius: 3px;
  overflow: hidden;
}
.ss-shell .ss-palette-sw {
  flex: 1;
  height: 100%;
}
.ss-shell .ss-palette-label {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  transition: color 0.2s var(--ease);
}
.ss-shell .ss-palette-tile.is-none {
  justify-content: center;
  min-width: 44px;
}
.ss-shell .ss-palette-x {
  font-size: 14px;
  height: 14px;
  line-height: 14px;
  color: var(--ink-2);
}

/* Pose grid */
.ss-shell .ss-pose-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.ss-shell .ss-pose-tile {
  position: relative;
  aspect-ratio: 4/5;
  background: var(--ink-0);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.3s var(--ease);
  font-family: inherit;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-pose-tile:active { transform: scale(0.94); }
.ss-shell .ss-pose-tile.is-active { border-color: var(--copper); }
.ss-shell .ss-pose-img { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.8; }
.ss-shell .ss-pose-tile::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.85) 100%);
}
.ss-shell .ss-pose-label {
  position: absolute;
  bottom: 4px; left: 4px;
  z-index: 2;
  color: #FDF7E8;
  font-size: 8px;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ss-shell .ss-pose-check {
  position: absolute;
  top: 4px; right: 4px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--copper);
  display: flex; align-items: center; justify-content: center;
  color: var(--bg-card);
  z-index: 2;
}

/* Light cells */
.ss-shell .ss-light-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.ss-shell .ss-light-cell {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 8px;
  cursor: pointer;
  transition: all 0.3s var(--ease);
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-1);
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-light-cell:active { transform: scale(0.94); }
.ss-shell .ss-light-cell.is-active { background: var(--ink-0); color: var(--bg-card); border-color: var(--ink-0); }

/* Reference uploads row (outfit / escenario / pose) */
.ss-shell .ss-ref-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ss-shell .ss-ref-slot {
  display: flex; flex-direction: column;
  align-items: flex-start; gap: 2px;
  padding: 12px 10px;
  background: var(--bg-card);
  border: 1.5px dashed var(--line);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.ss-shell .ss-ref-slot:active { transform: scale(0.96); border-color: var(--ink-0); }
.ss-shell .ss-ref-emoji { font-size: 20px; line-height: 1; margin-bottom: 4px; }
.ss-shell .ss-ref-slot strong { font-size: 12px; font-weight: 600; color: var(--ink-0); }
.ss-shell .ss-ref-slot small { font-size: 10px; color: var(--ink-3); }
.ss-shell .ss-ref-card {
  position: relative;
  aspect-ratio: 3/4;
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px solid var(--ink-0);
  background: var(--paper);
}
.ss-shell .ss-ref-card img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.ss-shell .ss-ref-label {
  position: absolute;
  top: 6px; left: 6px;
  padding: 3px 8px;
  background: rgba(20, 16, 14, 0.78);
  color: var(--bg-card);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.ss-shell .ss-ref-clear {
  position: absolute;
  top: 6px; right: 6px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(20, 16, 14, 0.75);
  border: none;
  color: var(--bg-card);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* Lightbox */
.ss-shell .ss-lightbox {
  position: fixed; inset: 0;
  background: rgba(20, 16, 14, 0.95);
  z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: ss-lb-fade 200ms ease-out;
}
@keyframes ss-lb-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.ss-shell .ss-lightbox-img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.6);
}
.ss-shell .ss-lightbox-actions {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px;
}
.ss-shell .ss-lb-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 10px 14px;
  background: rgba(253, 247, 232, 0.94);
  backdrop-filter: blur(8px);
  border: none;
  border-radius: 999px;
  font-size: 11px; font-weight: 600;
  color: var(--ink-0);
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-lb-btn:active { transform: scale(0.96); }
.ss-shell .ss-lb-btn.is-active { background: var(--copper); color: #FDF7E8; }
.ss-shell .ss-lightbox-close {
  position: fixed;
  top: max(20px, env(safe-area-inset-top));
  right: 20px;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(253, 247, 232, 0.16);
  backdrop-filter: blur(8px);
  border: none;
  color: #FDF7E8;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}

/* Floating CTA */
.ss-shell .ss-cta-wrap {
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
.ss-shell .ss-cta-row { display: flex; gap: 10px; pointer-events: auto; }
.ss-shell .ss-cta-secondary {
  width: 50px; height: 56px;
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-1);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-cta-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
.ss-shell .ss-cta-secondary:not(:disabled):active {
  transform: scale(0.94);
  border-color: var(--copper);
  color: var(--copper-deep);
}
.ss-shell .ss-cta-primary {
  flex: 1; height: 56px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--copper) 0%, var(--copper-deep) 100%);
  color: #FDF7E8;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px; font-weight: 600;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s var(--ease);
  box-shadow: 0 10px 24px -8px rgba(133, 83, 23, 0.55);
  -webkit-tap-highlight-color: transparent;
}
.ss-shell .ss-cta-primary:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
.ss-shell .ss-cta-primary:not(:disabled):active { transform: scale(0.98); }
.ss-shell .ss-cta-primary::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: ss-shimmer 3s var(--ease) infinite;
}
.ss-shell .ss-cta-primary:disabled::before { animation: none; }
@keyframes ss-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.ss-shell .ss-cta-cost {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.18em;
  opacity: 0.78; text-transform: uppercase;
}
.ss-shell .ss-cta-label {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px; font-style: italic;
}
.ss-shell .ss-cta-arrow {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(253, 247, 232, 0.18);
  display: flex; align-items: center; justify-content: center;
}

/* Empty state */
.ss-shell .ss-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 60px 32px;
  gap: 14px;
}
.ss-shell .ss-empty-icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1.5px dashed var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--copper);
  margin-bottom: 4px;
}
.ss-shell .ss-empty-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 28px; line-height: 1.05;
  color: var(--ink-0); font-weight: 400; margin: 0;
}
.ss-shell .ss-empty-title em { font-style: italic; color: var(--copper); }
.ss-shell .ss-empty-sub {
  font-size: 13px; color: var(--ink-2);
  max-width: 280px; line-height: 1.5; margin: 0;
}
.ss-shell .ss-empty-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  background: linear-gradient(135deg, var(--copper) 0%, var(--copper-deep) 100%);
  color: #FDF7E8;
  border: none;
  border-radius: 999px;
  font-size: 13px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 8px 18px -8px rgba(133, 83, 23, 0.5);
  -webkit-tap-highlight-color: transparent;
}

`;

