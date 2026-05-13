/**
 * CrearPersonaje — Mobile character creator with two paths.
 *
 *   A) Crear con IA  — form (with collapsible detailed appearance sections)
 *      → generate 4 reference photos → PREVIEW step → user approves/regenerates
 *      → save character.
 *
 *   B) Subir fotos    — user uploads existing photos (no AI generation).
 *      Photos go to reference_photo_urls.
 *
 * Mood: Atelier (cream + terracotta + clay)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  RefreshCw, Sparkles, Upload, X, Wand2, Camera,
  ChevronDown, Check, ChevronRight, ChevronLeft,
} from 'lucide-react';
import type { Page } from '../App';
import { useCharacterStore } from '../stores/characterStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, takePhoto, isNativePlatform } from '../services/nativeService';
import {
  AppTopBar, AppHero, AppFloatingCTA, type AppMood,
} from '../components/apps/_shared';
import {
  GENDERS, AGE_RANGES, ETHNICITIES,
  HAIR_STYLES, HAIR_COLORS,
  SKIN_TONES, SKIN_TEXTURES, SKIN_DETAILS, MAKEUP_STYLES,
  EYE_COLORS, EYE_SHAPES,
  NOSE_TYPES, LIP_SHAPES, FACE_SHAPES, JAWLINES, EYEBROWS,
  BODY_TYPES, HEIGHTS, MUSCULATURE,
  BUST_SIZES, WAIST_SIZES, HIP_SIZES, LEG_PROPORTIONS,
  FASHION_STYLES, ACCESSORIES, COLOR_PALETTES,
} from '../data/characterChips';

// Glutes options — characterChips doesn't export a dedicated array, so we
// keep it inline here. Mapped to prompt phrases that NB2 / Seedream understand.
const GLUTES_OPTIONS: { label: string; prompt: string }[] = [
  { label: 'Pequeños',  prompt: 'small modest glutes, minimal projection' },
  { label: 'Medianos',  prompt: 'medium proportional glutes, balanced lower body' },
  { label: 'Llenos',    prompt: 'full rounded glutes, defined curve' },
  { label: 'Atléticos', prompt: 'athletic firm glutes, toned curvature, dancer / fitness build' },
  { label: 'Curvy',     prompt: 'pronounced curvy glutes, hourglass projection, defined silhouette' },
];
import { SOUL_STYLES, type SoulStyle } from '../data/soulStyles';
import type { SavedCharacter } from '../stores/characterStore';
import { usePipelineStore } from '../stores/pipelineStore';

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

type Mode = 'select' | 'ai-form' | 'ai-preview' | 'upload';
type Engine = 'nb2' | 'grok' | 'seedream';

const ENGINES: { id: Engine; name: string; tagline: string; bestFor: string }[] = [
  { id: 'nb2',      name: 'NB2',      tagline: 'Default · estructurado',     bestFor: 'Fotorrealismo + control fino' },
  { id: 'grok',     name: 'Grok',     tagline: 'Permisivo · creativo',       bestFor: 'Anime, ilustración, vibes' },
  { id: 'seedream', name: 'Seedream', tagline: 'Lighting + multi-output',    bestFor: 'Editorial, luces específicas' },
];

const RENDER_STYLES = [
  { id: 'photorealistic', name: 'Fotorrealista', meta: 'DSLR quality',     img: '/app-thumbs/creator-styles/photorealistic.jpg' },
  { id: 'anime',          name: 'Anime / Manhwa', meta: '2D · Stylized',   img: '/app-thumbs/creator-styles/anime.jpg' },
  { id: '3d-render',      name: '3D Render',     meta: 'Pixar · CGI feel', img: '/app-thumbs/creator-styles/3d-render.jpg' },
  { id: 'illustration',   name: 'Ilustración',   meta: 'Hand-drawn',       img: '/app-thumbs/creator-styles/illustration.jpg' },
];

const PERSONALITY = [
  'Misteriosa', 'Confiada', 'Soñadora', 'Fierce',
  'Soft', 'Bold', 'Editorial', 'Casual',
];

// Variant count tiers — bulk discount on 4 (3 cr/photo) vs single (4 cr/photo)
const VARIANT_OPTIONS: { count: 1 | 2 | 4; cost: number; label: string; tagline: string }[] = [
  { count: 1, cost: 4,  label: 'Solo 1', tagline: 'Test rápido' },
  { count: 2, cost: 7,  label: '2 variantes', tagline: 'Comparar' },
  { count: 4, cost: 12, label: '4 variantes', tagline: 'Full set' },
];

const COST_FULL_SHEET = 18; // additional cost for face + body + expressions sheets

// Curated subset of SOUL_STYLES — only the most useful for character creation
// (vibe/aesthetic, not pose/action). User can filter for more in apps later.
const PRESET_SOUL_IDS = [
  '1cb4b936-77bf-4f9a-9039-f3d349a4cdbe',          // Realistic
  'ff1ad8a2-94e7-4e70-a12f-e992ca9a0d36',          // Quiet Luxury
  'aesthetic-editorial-chic',                       // Editorial Chic
  '710f9073-f580-48dc-b5c3-9bbc7cbb7f37',          // 90s Editorial
  '99de6fc5-1177-49b9-b2e9-19e17d95bcaf',          // Tokyo Streetstyle
  'aesthetic-coastal-minimal',                      // Coastal Minimalist
  '0fe8ad66-ff61-411f-9186-b392e140b18c',          // Foggy Morning
  'custom-mood-golden',                             // Golden Hour
];

// ─── Helpers ────────────────────────────────────

async function urlToBlob(url: string): Promise<Blob> {
  if (url.startsWith('data:')) {
    const res = await fetch(url);
    return await res.blob();
  }
  const res = await fetch(url);
  return await res.blob();
}

interface CharSpec {
  gender?: string;
  age?: string;
  ethnicity?: string;
  renderStyle: string;
  // Face
  faceShape?: string;
  noseType?: string;
  lipShape?: string;
  jawline?: string;
  eyebrow?: string;
  eyeShape?: string;
  // Hair
  hairStyle?: string;
  hairColor?: string;
  // Skin
  skinTone?: string;
  skinTexture?: string;
  skinDetail?: string;
  makeup?: string;
  // Eyes
  eyeColor?: string;
  // Body
  bodyType: string[];
  height?: string;
  musculature?: string;
  bust?: string;
  waist?: string;
  hips?: string;
  glutes?: string;
  legs?: string;
  // Vibe
  personality: string[];
  // Look
  fashionStyle?: string;
  accessories: string[];
  soulStyleId?: string;
  colorPalette?: string;  // brand signature palette
  // Free direction
  freePrompt: string;
  // Shot type — how the base reference photos look (editorial / casual / etc)
  shotType?: ShotTypeId;
}

// ─── Shot Types — how the wizard's base photos are framed/lit/dressed ───

type ShotTypeId = 'editorial' | 'mirror-selfie' | 'beach-editorial' | 'studio-cover' | 'lifestyle-candid';

interface ShotTypeDef {
  id: ShotTypeId;
  label: string;
  emoji: string;
  hint: string;
  shotPrompt: string;
}

const SHOT_TYPES: ShotTypeDef[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    emoji: '📸',
    hint: 'Default — referencia limpia para luego editar',
    shotPrompt:
      'Editorial character reference portrait. Front-facing, full upper body composition with hands and waist visible to show body proportions. Clean neutral studio backdrop. Even soft daylight, soft falloff. Sharp focus on the eyes. 85mm lens, shallow depth of field. Professional photography, documentary realism. Subject wears a well-fitted neutral outfit (cream knit top, fitted denim or simple skirt) that shows body proportions clearly without distracting from identity.',
  },
  {
    id: 'mirror-selfie',
    label: 'Mirror Selfie',
    emoji: '🪞',
    hint: 'Casual cuarto, iPhone visible, LED rim, vibe IG',
    shotPrompt:
      'iPhone front camera mirror selfie in a softly lit bedroom. Subject stands holding a recent iPhone Pro (3-camera array visible) in one hand pointing at a full-length wall mirror. Bedroom background with unmade white bed, light curtains, ambient mess. Warm tungsten + soft pink-purple LED Govee strip rim light on the back wall (gradient pink to purple to teal). iPhone-camera photography aesthetic: very slight HDR, mid-contrast, natural skin tones, casual social-media composition, NOT editorial. Outfit: minimal — fitted crop top + bikini bottoms, or sports bra + boy shorts, bare midriff fully visible.',
  },
  {
    id: 'beach-editorial',
    label: 'Beach Editorial',
    emoji: '🏖️',
    hint: 'Playa golden hour, agua, bikini editorial',
    shotPrompt:
      'Beach editorial photograph. Subject emerging from the ocean at golden hour, wet skin glistening with water droplets, hair slightly wet and tousled. Sunset side lighting, warm rim, magazine editorial photography. Outfit: minimal high-cut white bikini or string bikini. Bold confident pose, looking at camera or off-frame. 85mm lens, shallow depth, sand and ocean softly out of focus. NO commercial logos visible.',
  },
  {
    id: 'studio-cover',
    label: 'Studio Cover',
    emoji: '✨',
    hint: 'Magazine cover, gradient backdrop, beauty light',
    shotPrompt:
      'Studio magazine cover photograph. Subject against a smooth gradient backdrop (cream-to-mauve or warm peach). Beauty dish key light from above-front, gentle fill, subtle hair rim. Outfit: high fashion piece (silk slip dress, fitted blazer, structured bodysuit) that emphasizes the body silhouette. Confident editorial pose. 105mm lens, shallow depth, refined commercial finish.',
  },
  {
    id: 'lifestyle-candid',
    label: 'Lifestyle Candid',
    emoji: '☀️',
    hint: 'Café, calle, ropa casual de día',
    shotPrompt:
      'Lifestyle candid photograph in a real-world location (sunlit café, city street, sunny rooftop). Natural daylight, environmental context softly out of focus behind. Subject in casual everyday outfit (well-fitted denim jeans + cropped tee, or sundress, or athleisure set). Relaxed natural pose mid-motion or sitting. Documentary photography style, not posed.',
  },
];

/**
 * Resolves a Spanish chip LABEL → English technical promptText.
 * Falls back to the label itself if no chip matches (so manual entries survive).
 */
function chipPrompt(opts: { label?: string; chips: { label: string; promptText: string }[] }): string | undefined {
  if (!opts.label) return undefined;
  const hit = opts.chips.find(c => c.label === opts.label);
  return hit?.promptText || opts.label;
}

/**
 * buildDescription — the PHYSICAL ANCHOR that ends up in character.characteristics.
 *
 * This is the text that gets injected into EVERY future generation (Reimaginar,
 * Editor, Studio) to lock in proportions, skin texture, face geometry. Quality
 * here = quality of every future render.
 *
 * Strategy:
 *   1. Compose rich technical English prose from the wizard's chip promptText
 *      (not just raw Spanish labels — that loses 90% of the signal).
 *   2. Add ALWAYS-ON realism clauses for photorealistic characters: skin texture
 *      (pores, vellus, vascularity, undertone), soft tissue physics, anti-CGI
 *      guards, NO text overlays.
 *   3. Derive silhouette physics from picks (waist-to-hip ratio strength,
 *      lordosis when glutes are projected, bust gravity when large bust).
 */
function buildDescription(s: CharSpec): string {
  const parts: string[] = [];
  const isPhoto = s.renderStyle === 'photorealistic';

  // ── Identity opener ──
  if (s.gender) parts.push(s.gender);
  if (s.age) parts.push(`${s.age} años`);
  if (s.ethnicity) parts.push(`${s.ethnicity} ethnicity`);
  parts.push(`${s.renderStyle} render style`);

  // ── Face geometry — use rich promptText, not labels ──
  const face: string[] = [];
  const faceShapePrompt = chipPrompt({ label: s.faceShape, chips: FACE_SHAPES });
  const nosePrompt = chipPrompt({ label: s.noseType, chips: NOSE_TYPES });
  const lipsPrompt = chipPrompt({ label: s.lipShape, chips: LIP_SHAPES });
  const jawPrompt = chipPrompt({ label: s.jawline, chips: JAWLINES });
  const eyebrowPrompt = chipPrompt({ label: s.eyebrow, chips: EYEBROWS });
  const eyeShapePrompt = chipPrompt({ label: s.eyeShape, chips: EYE_SHAPES });
  const eyeColorPrompt = chipPrompt({ label: s.eyeColor, chips: EYE_COLORS });
  if (faceShapePrompt) face.push(faceShapePrompt);
  if (nosePrompt) face.push(nosePrompt);
  if (lipsPrompt) face.push(lipsPrompt);
  if (jawPrompt) face.push(jawPrompt);
  if (eyebrowPrompt) face.push(eyebrowPrompt);
  if (eyeShapePrompt) face.push(eyeShapePrompt);
  if (eyeColorPrompt) face.push(eyeColorPrompt);
  if (face.length > 0) parts.push(face.join(', '));

  // ── Hair ──
  if (s.hairStyle && s.hairColor) parts.push(`${s.hairStyle} ${s.hairColor} hair`);
  else if (s.hairStyle) parts.push(`${s.hairStyle} hair`);
  else if (s.hairColor) parts.push(`${s.hairColor} hair`);

  // ── Skin tone + makeup ──
  const skin: string[] = [];
  if (s.skinTone) skin.push(`${s.skinTone} skin tone`);
  if (s.skinTexture) skin.push(s.skinTexture);
  if (s.skinDetail) skin.push(s.skinDetail);
  if (skin.length > 0) parts.push(skin.join(', '));
  if (s.makeup) parts.push(`makeup: ${s.makeup}`);

  // ── Body proportions — rich prompts from chip data ──
  if (s.bodyType.length > 0) {
    const bodyPrompts = s.bodyType
      .map(label => chipPrompt({ label, chips: BODY_TYPES }))
      .filter(Boolean);
    if (bodyPrompts.length > 0) parts.push(bodyPrompts.join(', '));
  }
  const heightPrompt = chipPrompt({ label: s.height, chips: HEIGHTS });
  const musclePrompt = chipPrompt({ label: s.musculature, chips: MUSCULATURE });
  const bustPrompt = chipPrompt({ label: s.bust, chips: BUST_SIZES });
  const waistPrompt = chipPrompt({ label: s.waist, chips: WAIST_SIZES });
  const hipsPrompt = chipPrompt({ label: s.hips, chips: HIP_SIZES });
  const glutesPrompt = chipPrompt({
    label: s.glutes,
    chips: GLUTES_OPTIONS.map(g => ({ label: g.label, promptText: g.prompt })),
  });
  const legsPrompt = chipPrompt({ label: s.legs, chips: LEG_PROPORTIONS });
  if (heightPrompt) parts.push(heightPrompt);
  if (musclePrompt) parts.push(musclePrompt);
  if (bustPrompt) parts.push(bustPrompt);
  if (waistPrompt) parts.push(waistPrompt);
  if (hipsPrompt) parts.push(hipsPrompt);
  if (glutesPrompt) parts.push(glutesPrompt);
  if (legsPrompt) parts.push(legsPrompt);

  // ── Render-quality baseline (ONLY for photoreal — render directive, NOT
  // about body/skin properties). Tells the model to render photographically,
  // not as CGI/doll. Says NOTHING about pores, vellus, bust gravity, etc.
  // Those come from the user's chip picks (SKIN_TEXTURE, BUST_SIZES, etc).
  if (isPhoto) {
    parts.push('High-fidelity photographic realism, no plastic CGI look, no doll-like waxy texture, no surreal smoothing or airbrush effect');
  }

  // Vibe
  if (s.personality.length > 0) parts.push(`vibe: ${s.personality.join(', ').toLowerCase()}`);

  // Look (style + accessories + soul preset + color palette)
  if (s.fashionStyle) {
    const fashionPrompt = chipPrompt({ label: s.fashionStyle, chips: FASHION_STYLES });
    parts.push(`fashion style: ${fashionPrompt || s.fashionStyle}`);
  }
  if (s.accessories.length > 0) parts.push(`accessories: ${s.accessories.join(', ').toLowerCase()}`);
  if (s.soulStyleId) {
    const soul = SOUL_STYLES.find(x => x.id === s.soulStyleId);
    if (soul) parts.push(`aesthetic preset: ${soul.name} (${soul.hint || soul.name})`);
  }
  // Brand signature color palette — governs outfits, lighting, props, makeup
  if (s.colorPalette) {
    const palPrompt = chipPrompt({ label: s.colorPalette, chips: COLOR_PALETTES });
    if (palPrompt) parts.push(palPrompt);
  }

  // Free
  if (s.freePrompt.trim()) parts.push(s.freePrompt.trim());

  // Anti-text-overlay guard — Wan 2.7 sometimes adds magazine titles when the
  // anchor describes editorial / fashion contexts. Reinforces NO text.
  parts.push('Absolutely NO text overlays, NO magazine titles, NO captions, NO watermarks, NO logos visible anywhere in the image');

  return parts.filter(Boolean).join('. ');
}

// ─── Component ─────────────────────────────────

export default function CrearPersonaje({ onNav }: Props) {
  const addCharacter = useCharacterStore(s => s.addCharacter);
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('select');

  // ─── Common ───
  const [name, setName] = useState('');
  const [renderStyle, setRenderStyle] = useState<string>('photorealistic');

  // ─── Path B ───
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Path A — form state ───
  const [gender, setGender] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [ethnicity, setEthnicity] = useState<string>('');
  // Face
  const [faceShape, setFaceShape] = useState<string>('');
  const [noseType, setNoseType] = useState<string>('');
  const [lipShape, setLipShape] = useState<string>('');
  const [jawline, setJawline] = useState<string>('');
  const [eyebrow, setEyebrow] = useState<string>('');
  const [eyeShape, setEyeShape] = useState<string>('');
  const [eyeColor, setEyeColor] = useState<string>('');
  // Hair
  const [hairStyle, setHairStyle] = useState<string>('');
  const [hairColor, setHairColor] = useState<string>('');
  // Skin
  const [skinTone, setSkinTone] = useState<string>('');
  const [skinTexture, setSkinTexture] = useState<string>('');
  const [skinDetail, setSkinDetail] = useState<string>('');
  const [makeup, setMakeup] = useState<string>('');
  // Body
  const [bodyType, setBodyType] = useState<string[]>([]);
  const [height, setHeight] = useState<string>('');
  const [musculature, setMusculature] = useState<string>('');
  const [bust, setBust] = useState<string>('');
  const [waist, setWaist] = useState<string>('');
  const [hips, setHips] = useState<string>('');
  const [glutes, setGlutes] = useState<string>('');
  const [legs, setLegs] = useState<string>('');
  // Vibe
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [freePrompt, setFreePrompt] = useState<string>('');
  // Shot type — how the wizard's base photos are framed/dressed/lit.
  // Default 'editorial' for clean ref shots that can be edited later.
  const [shotType, setShotType] = useState<ShotTypeId>('editorial');
  // Brand color palette — signature look across all future generations
  const [colorPalette, setColorPalette] = useState<string>('');
  const [showFreePrompt, setShowFreePrompt] = useState(false);
  // Look
  const [fashionStyle, setFashionStyle] = useState<string>('');
  const [accessories, setAccessories] = useState<string[]>([]);
  const [soulStyleId, setSoulStyleId] = useState<string>('');

  // Accordion state — which detailed sections are open
  const [openAccordion, setOpenAccordion] = useState<'face' | 'hair' | 'skin' | 'body' | 'look' | null>(null);

  // ─── Consume onboarding prefill on mount (one-shot) ───
  // If user just finished mobile onboarding, jump straight into ai-form with
  // their name seeded. Focus is currently informational only.
  useEffect(() => {
    const prefill = usePipelineStore.getState().onboardingPrefill;
    if (!prefill) return;
    if (prefill.name) setName(prefill.name);
    // Auto-skip mode select if onboarding indicated AI flow
    setMode('ai-form');
    // Clear so a back-out + return doesn't re-seed
    usePipelineStore.getState().setOnboardingPrefill(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Path A — full sheet pipeline state ───
  const [withFullSheet, setWithFullSheet] = useState(false);
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [sheetStep, setSheetStep] = useState<'face' | 'body' | 'expressions' | null>(null);
  // Once sheets are generated, they live here — user reviews before saving
  const [generatedSheets, setGeneratedSheets] = useState<{ type: 'face' | 'body' | 'expressions'; url: string }[]>([]);

  // ─── Lightbox state — tap a thumbnail to view full size ───
  const [lightbox, setLightbox] = useState<
    | { kind: 'preview'; url: string; idx: number }
    | { kind: 'sheet'; url: string; idx: number; label: string }
    | null
  >(null);

  // ─── Path A — engine selection ───
  const [engine, setEngine] = useState<Engine>('nb2');
  const [numVariants, setNumVariants] = useState<1 | 2 | 4>(4);
  const currentCost = VARIANT_OPTIONS.find(v => v.count === numVariants)?.cost ?? 12;

  // ─── Path A — generation + preview ───
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [showRefine, setShowRefine] = useState(false);
  // Saving state for the final `finalSave` flow — gives the CTA button a
  // disabled+spinner state while urls→blobs and addCharacter run, so users
  // don't double-tap or assume the app froze.
  const [saving, setSaving] = useState(false);

  const credits = profile?.creditsRemaining ?? 0;

  // ─── Toggle helpers ───
  const toggleInArray = (arr: string[], item: string, setter: (v: string[]) => void) => {
    hapticLight();
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const toggleAccordion = (key: 'face' | 'hair' | 'skin' | 'body' | 'look') => {
    hapticLight();
    setOpenAccordion(prev => prev === key ? null : key);
  };

  // ─── Path B handlers ───
  const handleSelectPhotos = async () => {
    hapticLight();
    if (await isNativePlatform()) {
      const photo = await takePhoto({ source: 'prompt', quality: 90 });
      if (photo) addUploadedFile(photo.file, photo.dataUrl);
    } else {
      fileInputRef.current?.click();
    }
  };

  const addUploadedFile = (file: File, dataUrl: string) => {
    setUploadedFiles(prev => prev.length >= 12 ? prev : [...prev, file]);
    setUploadedPreviews(prev => prev.length >= 12 ? prev : [...prev, dataUrl]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const slotsLeft = 12 - uploadedFiles.length;
    const toAdd = files.slice(0, slotsLeft).filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`"${f.name}" no es imagen`); return false; }
      if (f.size > 12 * 1024 * 1024) { toast.error(`"${f.name}" >12MB`); return false; }
      return true;
    });
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => addUploadedFile(file, reader.result as string);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeUploadedAt = (idx: number) => {
    hapticLight();
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
    setUploadedPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveFromPhotos = async () => {
    if (!name.trim()) { toast.error('Escribe un nombre'); hapticError(); return; }
    if (uploadedFiles.length < 1) { toast.error('Sube al menos 1 foto'); hapticError(); return; }
    hapticMedium();

    const blobs = await Promise.all(uploadedFiles.map(f => Promise.resolve(f as Blob)));
    const char: SavedCharacter = {
      id: crypto.randomUUID(),
      name: name.trim(),
      thumbnail: uploadedPreviews[0] || '',
      modelImageBlobs: blobs,
      outfitBlob: null,
      outfitDescription: '',
      characteristics: `Imported character. ${RENDER_STYLES.find(r => r.id === renderStyle)?.name || 'Photorealistic'} render style.`,
      accessory: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      renderStyle,
    };

    addCharacter(char);
    toast.success(`"${name}" creado desde fotos`);
    hapticSuccess();
    onNav('characters');
  };

  // ─── Build CharSpec from current form state ───
  const buildSpec = (): CharSpec => ({
    gender, age, ethnicity, renderStyle: RENDER_STYLES.find(r => r.id === renderStyle)?.name || 'photorealistic',
    faceShape, noseType, lipShape, jawline, eyebrow, eyeShape, eyeColor,
    hairStyle, hairColor,
    skinTone, skinTexture, skinDetail, makeup,
    bodyType, height, musculature,
    bust, waist, hips, glutes, legs,
    personality: personalityTraits,
    fashionStyle, accessories, soulStyleId,
    colorPalette,
    freePrompt,
    shotType,
  });

  // ─── Path A — Generate (called on initial gen + regenerate + refine) ───
  const generatePhotos = async (extraDirective?: string): Promise<string[]> => {
    const spec = buildSpec();
    let description = buildDescription(spec);
    if (extraDirective) description += `. ${extraDirective}`;

    const renderStyleLabel = RENDER_STYLES.find(r => r.id === renderStyle)?.name || 'Photorealistic';
    const isPhoto = renderStyle === 'photorealistic';

    // Wrapper structure (binding the anchor as ABSOLUTE PHYSICAL TRUTH):
    //   1. SUBJECT block — the full chip-driven description, prefixed so the
    //      model treats it as ground truth (not vibes).
    //   2. SHOT block — neutral framing/lighting/camera that doesn't compete
    //      with the subject description.
    //   3. RULES block — NO text guard + identity reinforcement.
    // Pick SHOT block from user-selected shot type (or editorial default)
    const shotDef = SHOT_TYPES.find(s => s.id === spec.shotType) ?? SHOT_TYPES[0];
    const shotBlock = isPhoto
      ? shotDef.shotPrompt
      : `Character reference portrait in ${renderStyleLabel} style. Front-facing, clean neutral background, consistent ${renderStyleLabel.toLowerCase()} rendering.`;

    const prompt = `SUBJECT (absolute physical truth — reproduce literally): ${description}.

SHOT: ${shotBlock}

RULES: The SUBJECT description above is non-negotiable — every body proportion, skin texture detail, and face geometry must be visibly reproduced in the image. NO text, NO labels, NO watermarks, NO magazine titles, NO commercial logos anywhere in the frame.`;

    const fal = await import('../services/falService');

    const params: any = {
      characters: [{ id: 'main', characteristics: description }],
      scenario: prompt,
      lighting: 'soft natural daylight',
      aspectRatio: '3:4',
      imageSize: '2K',
      numberOfImages: numVariants,
      realistic: isPhoto,
    };

    const onProgress = (p: number) => setProgress(Math.min(85, 15 + Math.round(p * 0.7)));
    const signal = abortRef.current?.signal;

    let results: string[] = [];
    if (engine === 'grok') {
      // Grok TTI is permissive — best for anime, illustration, edgy vibes
      results = await fal.generateWithGrokFal(params, onProgress, signal);
    } else if (engine === 'seedream') {
      // Seedream v5 Lite: 2K, lighting-aware, ByteDance permissive
      results = await fal.generateWithSeedream50(params, onProgress, signal);
    } else {
      // NB2 (default) — structured JSON spec, strong photorealism control
      results = await fal.generateWithNB2Fal(params, onProgress, signal);
    }

    if (!results || results.length === 0) throw new Error(`Generación falló con ${engine.toUpperCase()}`);
    return results;
  };

  const handleGenerateInitial = async () => {
    if (!name.trim()) { toast.error('Escribe un nombre'); hapticError(); return; }
    if (!gender) { toast.error('Elige un género'); hapticError(); return; }
    if (credits < currentCost) {
      toast.error(`Necesitas ${currentCost} créditos. Tienes ${credits}.`);
      hapticError(); onNav('pricing'); return;
    }
    hapticMedium();

    const ok = await decrementCredits(currentCost);
    if (!ok) { toast.error('Créditos insuficientes'); return; }

    setGenerating(true);
    setProgress(5);
    abortRef.current = new AbortController();

    try {
      const results = await generatePhotos();
      setProgress(100);
      setPreviewUrls(results.slice(0, numVariants));
      setSelectedPreviewIdx(0);
      setMode('ai-preview');
      hapticSuccess();
    } catch (err: any) {
      restoreCredits(currentCost);
      if (err?.name !== 'AbortError') {
        toast.error(`Error: ${String(err?.message || err).slice(0, 120)}`);
        hapticError();
      }
    } finally {
      setGenerating(false);
      setProgress(0);
      abortRef.current = null;
    }
  };

  const handleRegenerate = async () => {
    if (credits < currentCost) {
      toast.error(`Necesitas ${currentCost} créditos.`);
      hapticError(); onNav('pricing'); return;
    }
    hapticMedium();
    const ok = await decrementCredits(currentCost);
    if (!ok) return;
    setGenerating(true);
    setProgress(5);
    abortRef.current = new AbortController();
    try {
      const results = await generatePhotos();
      setProgress(100);
      setPreviewUrls(results.slice(0, numVariants));
      setSelectedPreviewIdx(0);
      hapticSuccess();
    } catch (err: any) {
      restoreCredits(currentCost);
      if (err?.name !== 'AbortError') {
        toast.error(`Error: ${String(err?.message || err).slice(0, 120)}`);
        hapticError();
      }
    } finally {
      setGenerating(false);
      setProgress(0);
      abortRef.current = null;
    }
  };

  const handleRefine = async () => {
    if (!refineText.trim()) { toast.error('Escribe qué cambiar'); return; }
    if (credits < currentCost) { toast.error(`Necesitas ${currentCost} créditos.`); return; }
    hapticMedium();
    const ok = await decrementCredits(currentCost);
    if (!ok) return;

    setRefining(true);
    setProgress(5);
    abortRef.current = new AbortController();
    try {
      const results = await generatePhotos(refineText);
      setProgress(100);
      setPreviewUrls(results.slice(0, numVariants));
      setSelectedPreviewIdx(0);
      setRefineText('');
      setShowRefine(false);
      toast.success('Refinado aplicado');
      hapticSuccess();
    } catch (err: any) {
      restoreCredits(currentCost);
      if (err?.name !== 'AbortError') {
        toast.error(`Error: ${String(err?.message || err).slice(0, 120)}`);
        hapticError();
      }
    } finally {
      setRefining(false);
      setProgress(0);
      abortRef.current = null;
    }
  };

  // ─── Approve handler — branches into save-now vs generate-sheets-first ───
  const handleApprove = async () => {
    if (previewUrls.length === 0) return;
    hapticMedium();

    if (withFullSheet) {
      // Run sheet pipeline first; user reviews sheets before final save.
      if (credits < COST_FULL_SHEET) {
        toast.error(`Necesitas ${COST_FULL_SHEET} créditos extra para ficha completa.`);
        hapticError();
        return;
      }
      const ok = await decrementCredits(COST_FULL_SHEET);
      if (!ok) return;

      const orderedUrls = [
        previewUrls[selectedPreviewIdx],
        ...previewUrls.filter((_, i) => i !== selectedPreviewIdx),
      ];

      setGeneratingSheet(true);
      const physicalTraits = buildSpec().bodyType.join(', ');
      const newSheets: { type: 'face' | 'body' | 'expressions'; url: string }[] = [];
      try {
        const { generateCharacterSheet } = await import('../services/toolEngines');
        const types: Array<'face' | 'body' | 'expressions'> = ['face', 'body', 'expressions'];
        for (const type of types) {
          setSheetStep(type);
          try {
            const url = await generateCharacterSheet(orderedUrls[0], type, physicalTraits);
            newSheets.push({ type, url });
          } catch (sheetErr: any) {
            console.warn(`Sheet ${type} failed:`, sheetErr?.message);
            restoreCredits(Math.round(COST_FULL_SHEET / 3));
            toast.info(`Ficha ${type} falló — continuando con las demás`);
          }
        }
        setGeneratedSheets(newSheets);
        if (newSheets.length > 0) {
          toast.success(`Ficha completa lista · revisa antes de guardar`);
          hapticSuccess();
        } else {
          toast.error('Ninguna sheet pudo generarse — guardando solo las 4 fotos');
        }
      } catch (err: any) {
        restoreCredits(COST_FULL_SHEET);
        toast.error(`Pipeline sheet falló: ${String(err?.message || err).slice(0, 100)}`);
      } finally {
        setGeneratingSheet(false);
        setSheetStep(null);
      }
      // Stay in preview mode — user now reviews sheets and taps "Guardar todas"
      return;
    }

    // No sheet pipeline — save directly with the 4 portraits
    await finalSave([]);
  };

  // ─── Final save — uses portraits + (optional) approved sheets ───
  const finalSave = async (sheetsToInclude: { type: 'face' | 'body' | 'expressions'; url: string }[]) => {
    if (saving) return; // guard against double-tap
    setSaving(true);
    try {
      const selectedPortrait = previewUrls[selectedPreviewIdx];
      const otherPortraits = previewUrls.filter((_, i) => i !== selectedPreviewIdx);

      // CRITICAL ordering for apps' slice(0, 4) ref selection:
      //   [0] thumbnail (user-selected portrait — visual cover)
      //   [1] face sheet      — best face identity ref (4 angles in one)
      //   [2] body sheet      — best body proportions ref (4 angles + activewear)
      //   [3] expressions     — best variation ref (9 expressions)
      //   [4-6] other portraits as extras
      // This guarantees apps reading first 4 refs get the densest identity info.
      const facesheet  = sheetsToInclude.find(s => s.type === 'face')?.url;
      const bodysheet  = sheetsToInclude.find(s => s.type === 'body')?.url;
      const exprsheet  = sheetsToInclude.find(s => s.type === 'expressions')?.url;

      const allUrls = [
        selectedPortrait,
        ...(facesheet ? [facesheet] : []),
        ...(bodysheet ? [bodysheet] : []),
        ...(exprsheet ? [exprsheet] : []),
        ...otherPortraits,
      ];

      const blobs = await Promise.all(allUrls.map(url => urlToBlob(url)));

      const description = buildDescription(buildSpec());
      const char: SavedCharacter = {
        id: crypto.randomUUID(),
        name: name.trim(),
        thumbnail: allUrls[0],
        modelImageBlobs: blobs,
        outfitBlob: null,
        outfitDescription: '',
        characteristics: description,
        accessory: accessories.join(', '),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        renderStyle,
        personalityTraits: personalityTraits.length > 0 ? personalityTraits : undefined,
        soulStyleId: soulStyleId || undefined,
      };

      addCharacter(char);
      toast.success(`"${name}" guardado · ${allUrls.length} referencias`);
      hapticSuccess();
      setTimeout(() => onNav('characters'), 600);
    } catch (err: any) {
      toast.error(`Error guardando: ${String(err?.message || err).slice(0, 100)}`);
      hapticError();
    } finally {
      setSaving(false);
    }
  };

  // Remove a single generated sheet (user didn't like it)
  const removeSheet = (idx: number) => {
    hapticLight();
    setGeneratedSheets(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDiscardPreview = () => {
    hapticLight();
    setPreviewUrls([]);
    setGeneratedSheets([]);
    setMode('ai-form');
  };

  const handleCancelGenerate = () => {
    abortRef.current?.abort();
  };

  // ─── RENDER: Mode selection ───
  if (mode === 'select') {
    return (
      <div className="cp-shell">
        <style>{CREAR_STYLES}</style>
        <AppTopBar mood={ATELIER_MOOD} title="Atelier · Crear" credits={credits} onBack={() => onNav('studio')} />
        <AppHero mood={ATELIER_MOOD}
          eyebrow="Foundation · 01"
          title={<>Construye<br />tu <em>modelo</em>.</>}
          sub="Define a tu personaje desde cero con IA, o sube fotos que ya tienes." />

        <div className="cp-mode-cards">
          <button className="cp-mode-card" onClick={() => { hapticLight(); setMode('ai-form'); }}>
            <div className="cp-mode-icon"><Wand2 size={22} /></div>
            <div className="cp-mode-text">
              <h3>Crear con <em>IA</em></h3>
              <p>Diseña rasgos detallados — generamos 4 fotos y eliges.</p>
            </div>
            <div className="cp-mode-meta">desde 4 cr</div>
            <ChevronRight size={18} className="cp-mode-arrow" />
          </button>

          <button className="cp-mode-card" onClick={() => { hapticLight(); setMode('upload'); }}>
            <div className="cp-mode-icon"><Upload size={22} /></div>
            <div className="cp-mode-text">
              <h3>Subir <em>fotos</em></h3>
              <p>¿Ya tienes a tu personaje? Sube 1-12 fotos suyas y queda listo.</p>
            </div>
            <div className="cp-mode-meta">Gratis</div>
            <ChevronRight size={18} className="cp-mode-arrow" />
          </button>
        </div>

        <div className="cp-tip">
          <Sparkles size={12} />
          <span>Si tienes una cuenta IG con un personaje creado con IA, súbelo en "Subir fotos".</span>
        </div>
      </div>
    );
  }

  // ─── RENDER: Path B (upload photos) ───
  if (mode === 'upload') {
    return (
      <div className="cp-shell">
        <style>{CREAR_STYLES}</style>
        <AppTopBar mood={ATELIER_MOOD} title="Subir · fotos" credits={credits} onBack={() => setMode('select')} />
        <AppHero mood={ATELIER_MOOD}
          eyebrow="Sin IA · Tus fotos = tu personaje"
          title={<>Sube <em>fotos</em>.</>}
          sub="1-12 fotos del mismo personaje. Las guardamos como referencias para todas las apps." />

        <section className="cp-section">
          <div className="cp-field-head">
            <span className="cp-field-name"><span className="cp-field-num">01</span>Fotos del personaje</span>
            <span className="cp-field-hint">{uploadedFiles.length} / 12</span>
          </div>
          <div className="cp-photo-grid">
            {uploadedPreviews.map((src, i) => (
              <div key={i} className="cp-photo-tile">
                <img src={src} alt={`Foto ${i + 1}`} />
                <button className="cp-photo-x" onClick={() => removeUploadedAt(i)}><X size={11} /></button>
              </div>
            ))}
            {uploadedFiles.length < 12 && (
              <button className="cp-photo-add" onClick={handleSelectPhotos}>
                <Camera size={20} /><span>Subir</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
        </section>

        <section className="cp-section">
          <div className="cp-field-head">
            <span className="cp-field-name"><span className="cp-field-num">02</span>Nombre</span>
          </div>
          <input className="cp-input" placeholder="Sofia, Luna, Diego…" value={name} onChange={e => setName(e.target.value)} maxLength={32} />
        </section>

        <section className="cp-section">
          <div className="cp-field-head">
            <span className="cp-field-name"><span className="cp-field-num">03</span>Estilo de render</span>
            <span className="cp-field-hint">Para que las apps lo traten correctamente</span>
          </div>
          <div className="cp-render-strip">
            {RENDER_STYLES.map(r => (
              <button key={r.id} className={`cp-chip ${renderStyle === r.id ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setRenderStyle(r.id); }}>{r.name}</button>
            ))}
          </div>
        </section>

        <AppFloatingCTA mood={ATELIER_MOOD}
          secondaryIcon={<RefreshCw size={16} />}
          secondaryAriaLabel="Reset"
          onSecondary={() => { setUploadedFiles([]); setUploadedPreviews([]); setName(''); }}
          primaryCost={`Gratis · ${uploadedFiles.length} foto${uploadedFiles.length === 1 ? '' : 's'}`}
          primaryLabel="Guardar personaje"
          onPrimary={handleSaveFromPhotos}
          primaryDisabled={uploadedFiles.length === 0 || !name.trim()} />
      </div>
    );
  }

  // ─── RENDER: AI Preview (after generation, before save) ───
  if (mode === 'ai-preview') {
    return (
      <div className="cp-shell">
        <style>{CREAR_STYLES}</style>
        <AppTopBar mood={ATELIER_MOOD} title="Preview · 4 referencias" credits={credits} onBack={handleDiscardPreview} />

        {(generating || refining) && (
          <div className="cp-gen-overlay">
            <div className="cp-loader-ring">
              <div className="cp-loader-fill" style={{ height: `${progress}%` }} />
            </div>
            <div className="cp-loader-pct">{progress}%</div>
            <div className="cp-loader-label">
              {refining ? 'Refinando' : 'Regenerando'} · {progress < 50 ? 'preparando' : progress < 80 ? 'componiendo' : 'finalizando'}
            </div>
            <button className="cp-cancel-btn" onClick={handleCancelGenerate}>Cancelar</button>
          </div>
        )}

        {generatingSheet && (
          <div className="cp-gen-overlay">
            <div className="cp-sheet-progress">
              <div className={`cp-sheet-step ${sheetStep === 'face' ? 'is-active' : sheetStep === 'body' || sheetStep === 'expressions' ? 'is-done' : ''}`}>
                <span className="cp-sheet-step-num">1</span>
                <span>Rostro</span>
              </div>
              <div className={`cp-sheet-step ${sheetStep === 'body' ? 'is-active' : sheetStep === 'expressions' ? 'is-done' : ''}`}>
                <span className="cp-sheet-step-num">2</span>
                <span>Cuerpo</span>
              </div>
              <div className={`cp-sheet-step ${sheetStep === 'expressions' ? 'is-active' : ''}`}>
                <span className="cp-sheet-step-num">3</span>
                <span>Expresiones</span>
              </div>
            </div>
            <div className="cp-loader-label">
              Componiendo ficha completa · {sheetStep === 'face' ? 'rostro' : sheetStep === 'body' ? 'cuerpo' : sheetStep === 'expressions' ? 'expresiones' : 'preparando'}
            </div>
          </div>
        )}

        <AppHero mood={ATELIER_MOOD}
          eyebrow={`${name} · ${RENDER_STYLES.find(r => r.id === renderStyle)?.name}`}
          title={<>¿Te gusta tu <em>modelo</em>?</>}
          sub="Tap una foto para usarla como portada. Regenera si no convencen." />

        {/* Preview grid 2x2 */}
        <section className="cp-section">
          <div className="cp-preview-grid">
            {previewUrls.map((url, i) => (
              <button
                key={url + i}
                className={`cp-preview-tile ${selectedPreviewIdx === i ? 'is-selected' : ''}`}
                onClick={() => { hapticLight(); setLightbox({ kind: 'preview', url, idx: i }); }}
              >
                <img src={url} alt={`Variante ${i + 1}`} />
                <span className="cp-preview-num">{String(i + 1).padStart(2, '0')}</span>
                {selectedPreviewIdx === i && (
                  <div className="cp-preview-check"><Check size={11} /></div>
                )}
              </button>
            ))}
          </div>
          <div className="cp-preview-info">
            <Sparkles size={11} />
            <span>Tap una foto para verla grande · la seleccionada será la portada</span>
          </div>
        </section>

        {/* Refine accordion */}
        <section className="cp-section">
          <button className="cp-toggle-btn" onClick={() => { hapticLight(); setShowRefine(v => !v); }}>
            <Wand2 size={14} />
            <span>Refinar con palabras{credits >= currentCost ? ` (${currentCost} cr)` : ''}</span>
            <ChevronDown size={14} className={showRefine ? 'cp-rotate' : ''} />
          </button>
          {showRefine && (
            <div className="cp-prompt-box">
              <textarea className="cp-textarea" value={refineText} onChange={e => setRefineText(e.target.value)}
                placeholder="Ej: ojos más almendrados, expresión más confiada, pelo un poco más oscuro..." rows={3} maxLength={240} />
              <div className="cp-refine-row">
                <span className="cp-prompt-meta">{refineText.length} / 240</span>
                <button className="cp-refine-btn" onClick={handleRefine} disabled={!refineText.trim() || refining}>
                  Aplicar refinamiento
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Full sheet toggle (or generated sheets gallery) */}
        {generatedSheets.length === 0 ? (
          <section className="cp-section">
            <button
              className={`cp-sheet-toggle ${withFullSheet ? 'is-on' : ''}`}
              onClick={() => { hapticLight(); setWithFullSheet(v => !v); }}
              disabled={generatingSheet}
            >
              <div className="cp-sheet-checkbox">
                {withFullSheet && <Check size={11} />}
              </div>
              <div className="cp-sheet-content">
                <strong>Ampliar ficha completa</strong>
                <small>Genera 3 hojas extra (rostro · cuerpo · expresiones) — máxima identidad en las apps. <strong>+{COST_FULL_SHEET} cr</strong></small>
              </div>
            </button>
          </section>
        ) : (
          <section className="cp-section">
            <div className="cp-field-head">
              <span className="cp-field-name">Ficha generada</span>
              <span className="cp-field-hint">{generatedSheets.length}/3 sheets · tap X para descartar</span>
            </div>
            <div className="cp-sheets-gallery">
              {generatedSheets.map((s, i) => {
                const label =
                  s.type === 'face' ? 'Rostro · 4 ángulos' :
                  s.type === 'body' ? 'Cuerpo · 4 ángulos' :
                  'Expresiones · 9 facial';
                return (
                  <div key={s.url + i} className="cp-sheet-item">
                    <div className="cp-sheet-label">{label}</div>
                    <div className="cp-sheet-img-wrap">
                      <button
                        className="cp-sheet-img-btn"
                        onClick={() => { hapticLight(); setLightbox({ kind: 'sheet', url: s.url, idx: i, label }); }}
                      >
                        <img src={s.url} alt={s.type} className="cp-sheet-img cp-fade-in" />
                      </button>
                      <button className="cp-sheet-x" onClick={() => removeSheet(i)} aria-label="Descartar">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Engine mini-selector for regenerate */}
        <section className="cp-section">
          <div className="cp-field-head">
            <span className="cp-field-name">Motor</span>
            <span className="cp-field-hint">Cámbialo si quieres probar otro estilo</span>
          </div>
          <div className="cp-engine-pills">
            {ENGINES.map(e => (
              <button
                key={e.id}
                className={`cp-engine-pill ${engine === e.id ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setEngine(e.id); }}
              >
                {e.name}
              </button>
            ))}
          </div>
        </section>

        {/* Action row */}
        <section className="cp-section">
          <div className="cp-preview-actions">
            <button className="cp-action-ghost" onClick={handleRegenerate} disabled={generating || refining || credits < currentCost}>
              <RefreshCw size={14} />
              Regenerar con {ENGINES.find(e => e.id === engine)?.name} ({currentCost} cr)
            </button>
          </div>
        </section>

        <AppFloatingCTA mood={ATELIER_MOOD}
          secondaryIcon={<X size={16} />}
          secondaryAriaLabel="Descartar"
          onSecondary={handleDiscardPreview}
          primaryCost={
            generatedSheets.length > 0
              ? `${4 + generatedSheets.length} referencias`
              : withFullSheet
                ? `${COST_FULL_SHEET} cr · ficha completa`
                : `Foto ${selectedPreviewIdx + 1} de portada`
          }
          primaryLabel={
            saving
              ? 'Guardando…'
              : generatedSheets.length > 0
                ? 'Guardar todo'
                : withFullSheet
                  ? 'Generar ficha + revisar'
                  : 'Aprobar y guardar'
          }
          onPrimary={generatedSheets.length > 0 ? () => finalSave(generatedSheets) : handleApprove}
          primaryDisabled={saving || generating || refining || generatingSheet || previewUrls.length === 0 || (withFullSheet && generatedSheets.length === 0 && credits < COST_FULL_SHEET)} />

        {/* Lightbox — fullscreen view of any tile */}
        {lightbox && (
          <div className="cp-lightbox" onClick={() => setLightbox(null)}>
            <img src={lightbox.url} alt="Vista completa" className="cp-lightbox-img" />
            <div className="cp-lightbox-actions" onClick={e => e.stopPropagation()}>
              {lightbox.kind === 'preview' ? (
                <>
                  <button
                    className={`cp-lb-btn ${selectedPreviewIdx === lightbox.idx ? 'is-on' : ''}`}
                    onClick={() => {
                      hapticLight();
                      setSelectedPreviewIdx(lightbox.idx);
                      setLightbox(null);
                    }}
                  >
                    <Check size={14} />
                    {selectedPreviewIdx === lightbox.idx ? 'Es la portada' : 'Usar como portada'}
                  </button>
                  <button className="cp-lb-btn" onClick={() => setLightbox(null)}>
                    Volver
                  </button>
                </>
              ) : (
                <>
                  <span className="cp-lb-label">{lightbox.label}</span>
                  <button
                    className="cp-lb-btn cp-lb-btn-danger"
                    onClick={() => { removeSheet(lightbox.idx); setLightbox(null); }}
                  >
                    <X size={14} /> Descartar
                  </button>
                  <button className="cp-lb-btn" onClick={() => setLightbox(null)}>
                    Volver
                  </button>
                </>
              )}
            </div>
            <button className="cp-lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: AI Form ───
  return (
    <div className="cp-shell">
      <style>{CREAR_STYLES}</style>
      <AppTopBar mood={ATELIER_MOOD} title="Crear · IA" credits={credits} onBack={() => setMode('select')} />

      {generating && (
        <div className="cp-gen-overlay">
          <div className="cp-loader-ring">
            <div className="cp-loader-fill" style={{ height: `${progress}%` }} />
          </div>
          <div className="cp-loader-pct">{progress}%</div>
          <div className="cp-loader-label">
            {ENGINES.find(e => e.id === engine)?.name} ·{' '}
            {progress < 20 ? 'Diseñando rasgos' : progress < 50 ? 'Generando referencias' : progress < 80 ? 'Componiendo ángulos' : progress < 95 ? 'Refinando detalles' : 'Casi listo'}
          </div>
          <button className="cp-cancel-btn" onClick={handleCancelGenerate}>Cancelar</button>
        </div>
      )}

      <AppHero mood={ATELIER_MOOD}
        eyebrow="Crear con IA"
        title={<>Diseña tu <em>modelo</em>.</>}
        sub="Mínimo: género + nombre. Expandí los desplegables para detalle. Vas a poder revisar antes de guardar." />

      {/* 01 Render style */}
      <section className="cp-section">
        <div className="cp-field-head">
          <span className="cp-field-name"><span className="cp-field-num">01</span>Estilo de render</span>
        </div>
        <div className="cp-render-grid">
          {RENDER_STYLES.map(r => (
            <button key={r.id} className={`cp-render-card ${renderStyle === r.id ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setRenderStyle(r.id); }}>
              <div className="cp-render-card-img" style={{ backgroundImage: `url(${r.img})` }} />
              <div className="cp-render-card-overlay">
                <div className="cp-render-card-name">{r.name}</div>
                <div className="cp-render-card-meta">{r.meta}</div>
              </div>
              {renderStyle === r.id && <div className="cp-render-card-check"><Check size={11} /></div>}
            </button>
          ))}
        </div>
      </section>

      {/* 02 Identity */}
      <section className="cp-section">
        <div className="cp-field-head">
          <span className="cp-field-name"><span className="cp-field-num">02</span>Identidad</span>
          <span className="cp-field-hint">Requerido</span>
        </div>
        <div className="cp-dropdown-wrap">
          <label>Género</label>
          <div className="cp-chips">
            {GENDERS.slice(0, 4).map(g => (
              <button key={g.id} className={`cp-chip ${gender === g.label ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setGender(g.label); }}>{g.label}</button>
            ))}
          </div>
        </div>
        <div className="cp-dropdown-wrap" style={{ marginTop: 12 }}>
          <label>Edad</label>
          <div className="cp-chips">
            {AGE_RANGES.slice(0, 6).map(a => (
              <button key={a.id} className={`cp-chip ${age === a.label ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setAge(a.label); }}>{a.label}</button>
            ))}
          </div>
        </div>
        <div className="cp-dropdown-wrap" style={{ marginTop: 12 }}>
          <label>Etnia / Origen</label>
          <div className="cp-chips">
            {ETHNICITIES.map(e => (
              <button key={e.id} className={`cp-chip ${ethnicity === e.label ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setEthnicity(ethnicity === e.label ? '' : e.label); }}>{e.label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* 03 Detailed appearance — accordions */}
      <section className="cp-section">
        <div className="cp-field-head">
          <span className="cp-field-name"><span className="cp-field-num">03</span>Rasgos detallados</span>
          <span className="cp-field-hint">Opcional · expande para precisar</span>
        </div>

        {/* Rostro accordion */}
        <Accordion title="Rostro" icon="◯" open={openAccordion === 'face'} onToggle={() => toggleAccordion('face')}>
          <SubField label="Forma de rostro">
            <Chips value={faceShape} onChange={setFaceShape} options={FACE_SHAPES.map(c => c.label)} />
          </SubField>
          <SubField label="Nariz">
            <Chips value={noseType} onChange={setNoseType} options={NOSE_TYPES.map(c => c.label)} />
          </SubField>
          <SubField label="Labios">
            <Chips value={lipShape} onChange={setLipShape} options={LIP_SHAPES.map(c => c.label)} />
          </SubField>
          <SubField label="Mandíbula">
            <Chips value={jawline} onChange={setJawline} options={JAWLINES.map(c => c.label)} />
          </SubField>
          <SubField label="Cejas">
            <Chips value={eyebrow} onChange={setEyebrow} options={EYEBROWS.map(c => c.label)} />
          </SubField>
          <SubField label="Forma de ojos">
            <Chips value={eyeShape} onChange={setEyeShape} options={EYE_SHAPES.map(c => c.label)} />
          </SubField>
          <SubField label="Color de ojos">
            <Chips value={eyeColor} onChange={setEyeColor} options={EYE_COLORS.map(c => c.label)} />
          </SubField>
        </Accordion>

        {/* Cabello accordion */}
        <Accordion title="Cabello" icon="〰" open={openAccordion === 'hair'} onToggle={() => toggleAccordion('hair')}>
          <SubField label="Estilo">
            <Chips value={hairStyle} onChange={setHairStyle} options={HAIR_STYLES.map(c => c.label)} />
          </SubField>
          <SubField label="Color">
            <Chips value={hairColor} onChange={setHairColor} options={HAIR_COLORS.map(c => c.label)} />
          </SubField>
        </Accordion>

        {/* Piel accordion */}
        <Accordion title="Piel" icon="✶" open={openAccordion === 'skin'} onToggle={() => toggleAccordion('skin')}>
          <SubField label="Tono">
            <Chips value={skinTone} onChange={setSkinTone} options={SKIN_TONES.map(c => c.label)} />
          </SubField>
          <SubField label="Textura">
            <Chips value={skinTexture} onChange={setSkinTexture} options={SKIN_TEXTURES.map(c => c.label)} />
          </SubField>
          <SubField label="Detalles">
            <Chips value={skinDetail} onChange={setSkinDetail} options={SKIN_DETAILS.map(c => c.label)} />
          </SubField>
          <SubField label="Maquillaje">
            <Chips value={makeup} onChange={setMakeup} options={MAKEUP_STYLES.map(c => c.label)} />
          </SubField>
        </Accordion>

        {/* Cuerpo accordion */}
        <Accordion title="Cuerpo" icon="▢" open={openAccordion === 'body'} onToggle={() => toggleAccordion('body')}>
          <SubField label="Constitución (multi)">
            <ChipsMulti value={bodyType} onToggle={(v) => toggleInArray(bodyType, v, setBodyType)} options={BODY_TYPES.map(c => c.label)} />
          </SubField>
          <SubField label="Altura">
            <Chips value={height} onChange={setHeight} options={HEIGHTS.map(c => c.label)} />
          </SubField>
          <SubField label="Musculatura">
            <Chips value={musculature} onChange={setMusculature} options={MUSCULATURE.map(c => c.label)} />
          </SubField>
          <SubField label="Busto">
            <Chips value={bust} onChange={setBust} options={BUST_SIZES.map(c => c.label)} />
          </SubField>
          <SubField label="Cintura">
            <Chips value={waist} onChange={setWaist} options={WAIST_SIZES.map(c => c.label)} />
          </SubField>
          <SubField label="Caderas">
            <Chips value={hips} onChange={setHips} options={HIP_SIZES.map(c => c.label)} />
          </SubField>
          <SubField label="Glúteos">
            <Chips value={glutes} onChange={setGlutes} options={GLUTES_OPTIONS.map(g => g.label)} />
          </SubField>
          <SubField label="Piernas">
            <Chips value={legs} onChange={setLegs} options={LEG_PROPORTIONS.map(c => c.label)} />
          </SubField>
        </Accordion>

        {/* Estilo / Look accordion */}
        <Accordion title="Estilo / Look" icon="✦" open={openAccordion === 'look'} onToggle={() => toggleAccordion('look')}>
          <SubField label="Estilo de moda">
            <Chips value={fashionStyle} onChange={setFashionStyle} options={FASHION_STYLES.map(c => c.label)} />
          </SubField>
          <SubField label="Accesorios (multi)">
            <ChipsMulti value={accessories} onToggle={(v) => toggleInArray(accessories, v, setAccessories)} options={ACCESSORIES.map(c => c.label)} />
          </SubField>
          <SubField label="Estética preset (Soul Style)">
            <div className="cp-soul-grid">
              {PRESET_SOUL_IDS.map(id => {
                const s = SOUL_STYLES.find(x => x.id === id);
                if (!s) return null;
                return (
                  <button
                    key={s.id}
                    className={`cp-soul-tile ${soulStyleId === s.id ? 'is-active' : ''}`}
                    onClick={() => { hapticLight(); setSoulStyleId(soulStyleId === s.id ? '' : s.id); }}
                  >
                    <span className="cp-soul-icon">{s.icon || '✨'}</span>
                    <span className="cp-soul-name">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </SubField>
        </Accordion>
      </section>

      {/* 04 Engine selector */}
      <section className="cp-section">
        <div className="cp-field-head">
          <span className="cp-field-name"><span className="cp-field-num">04</span>Motor de generación</span>
          <span className="cp-field-hint">{ENGINES.find(e => e.id === engine)?.bestFor}</span>
        </div>
        <div className="cp-engine-grid">
          {ENGINES.map(e => (
            <button
              key={e.id}
              className={`cp-engine-tile ${engine === e.id ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setEngine(e.id); }}
            >
              <div className="cp-engine-name">{e.name}</div>
              <div className="cp-engine-tagline">{e.tagline}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 05 Variant count */}
      <section className="cp-section">
        <div className="cp-field-head">
          <span className="cp-field-name"><span className="cp-field-num">05</span>Cantidad</span>
          <span className="cp-field-hint">Más variantes = más opciones, más costo</span>
        </div>
        <div className="cp-variant-grid">
          {VARIANT_OPTIONS.map(v => (
            <button
              key={v.count}
              className={`cp-variant-tile ${numVariants === v.count ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setNumVariants(v.count); }}
            >
              <div className="cp-variant-num">{v.count}</div>
              <div className="cp-variant-label">{v.label}</div>
              <div className="cp-variant-meta">{v.cost} cr · {v.tagline}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 06 Personalidad */}
      <section className="cp-section">
        <div className="cp-field-head">
          <span className="cp-field-name"><span className="cp-field-num">06</span>Personalidad / Vibe</span>
          <span className="cp-field-hint">Multi-select</span>
        </div>
        <div className="cp-chips">
          {PERSONALITY.map(p => (
            <button key={p} className={`cp-chip ${personalityTraits.includes(p) ? 'is-active' : ''}`}
              onClick={() => toggleInArray(personalityTraits, p, setPersonalityTraits)}>{p}</button>
          ))}
        </div>
      </section>

      {/* 07 Nombre */}
      <section className="cp-section">
        <div className="cp-field-head">
          <span className="cp-field-name"><span className="cp-field-num">07</span>Nombre</span>
          <span className="cp-field-hint">Requerido</span>
        </div>
        <input className="cp-input" placeholder="Sofia, Luna, Diego…" value={name} onChange={e => setName(e.target.value)} maxLength={32} />
      </section>

      {/* 08 Refuerzo opcional — texto técnico permanente que se inyecta en TODOS los prompts */}
      <section className="cp-section">
        <button className="cp-toggle-btn" onClick={() => { hapticLight(); setShowFreePrompt(v => !v); }}>
          <Wand2 size={14} />
          <span>Refuerzo permanente (opcional)</span>
          <ChevronDown size={14} className={showFreePrompt ? 'cp-rotate' : ''} />
        </button>
        {showFreePrompt && (
          <>
            <div className="cp-prompt-box">
              <textarea
                className="cp-textarea"
                value={freePrompt}
                onChange={e => setFreePrompt(e.target.value)}
                placeholder="Detalles técnicos que quieres que el modelo respete SIEMPRE (proporciones extra, texturas específicas, anti-features...)"
                rows={4}
                maxLength={500}
              />
              <div className="cp-prompt-meta">{freePrompt.length} / 500</div>
            </div>
            <div className="cp-shot-hint" style={{ marginTop: 8 }}>
              Texto que se concatena al anchor del personaje y se inyecta en cada generación (Studio, Reimaginar, Editor). Tap un ejemplo para agregarlo:
            </div>
            <div className="cp-reinforce-chips">
              {[
                'Deep vertical linea alba (ab crack), but NO horizontal six-pack blocks visible',
                'Natural soft tissue gravity on bust — no surgical or perky-fake projection',
                'Very fine vellus facial and body hair, translucent dermis',
                'Realistic skin compression at joints (wrists, knees, elbows)',
                'Matte-to-semi-matte skin reflection, no glossy plastic finish',
                'Tight taut midriff skin, defined oblique lines flanking abdomen',
                'Iris with subtle gold flecks and natural reflection in pupil',
                'Tatuaje pequeño en muñeca interna',
                'Asymmetric subtle smile, slight head tilt confidence',
                'Pronounced lordosis curve, defined rear projection from side view',
              ].map(ex => (
                <button
                  key={ex}
                  className="cp-reinforce-chip"
                  onClick={() => {
                    hapticLight();
                    const sep = freePrompt.trim().length > 0 ? '. ' : '';
                    const next = `${freePrompt.trim()}${sep}${ex}`.slice(0, 500);
                    setFreePrompt(next);
                  }}
                >
                  + {ex.length > 60 ? ex.slice(0, 57) + '…' : ex}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Brand color palette — firma visual del personaje en todas las generaciones */}
      <section className="cp-section">
        <div className="cp-section-head">
          <h3 className="cp-section-title">Paleta de colores (firma)</h3>
          <p className="cp-section-hint">
            Tonos que dominan outfits, luces ambiente, props, maquillaje. Define tu marca visual.
            Opcional pero recomendado para consistencia.
          </p>
        </div>
        <div className="cp-palette-grid">
          {COLOR_PALETTES.map(p => (
            <button
              key={p.id}
              className={`cp-palette-tile ${colorPalette === p.label ? 'is-on' : ''}`}
              onClick={() => { hapticLight(); setColorPalette(colorPalette === p.label ? '' : p.label); }}
            >
              <div className="cp-palette-swatches">
                {p.colors.map((c, i) => (
                  <span key={i} className="cp-palette-swatch" style={{ background: c }} />
                ))}
              </div>
              <strong>{p.label}</strong>
            </button>
          ))}
        </div>
      </section>

      {/* Shot Type — cómo se ven las fotos base que se generan al crear */}
      <section className="cp-section">
        <div className="cp-section-head">
          <h3 className="cp-section-title">Estética de la sesión base</h3>
          <p className="cp-section-hint">
            Cómo se ven las primeras fotos del personaje. Después puedes generar
            cualquier escenario desde Sesión de Fotos o el Editor.
          </p>
        </div>
        <div className="cp-shot-grid">
          {SHOT_TYPES.map(s => (
            <button
              key={s.id}
              className={`cp-shot-tile ${shotType === s.id ? 'is-on' : ''}`}
              onClick={() => { hapticLight(); setShotType(s.id); }}
            >
              <span className="cp-shot-emoji">{s.emoji}</span>
              <strong>{s.label}</strong>
              <small>{s.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <AppFloatingCTA mood={ATELIER_MOOD}
        secondaryIcon={<RefreshCw size={16} />}
        secondaryAriaLabel="Reset"
        onSecondary={() => {
          setName(''); setGender(''); setAge(''); setEthnicity('');
          setFaceShape(''); setNoseType(''); setLipShape(''); setJawline(''); setEyebrow(''); setEyeShape(''); setEyeColor('');
          setHairStyle(''); setHairColor('');
          setSkinTone(''); setSkinTexture(''); setSkinDetail(''); setMakeup('');
          setBodyType([]); setHeight(''); setMusculature('');
          setBust(''); setWaist(''); setHips(''); setGlutes(''); setLegs('');
          setPersonalityTraits([]); setFreePrompt(''); setShowFreePrompt(false);
          setShotType('editorial');
          setColorPalette('');
          setFashionStyle(''); setAccessories([]); setSoulStyleId('');
          setEngine('nb2'); setNumVariants(4);
          setOpenAccordion(null);
        }}
        secondaryDisabled={generating}
        primaryCost={`${currentCost} cr · ${numVariants} foto${numVariants === 1 ? '' : 's'}`}
        primaryLabel={generating ? 'Generando…' : 'Generar preview'}
        onPrimary={handleGenerateInitial}
        primaryDisabled={generating || credits < currentCost || !name.trim() || !gender} />
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────

interface AccordionProps {
  title: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Accordion({ title, icon, open, onToggle, children }: AccordionProps) {
  return (
    <div className={`cp-acc ${open ? 'is-open' : ''}`}>
      <button className="cp-acc-head" onClick={onToggle}>
        <span className="cp-acc-icon">{icon}</span>
        <span className="cp-acc-title">{title}</span>
        <ChevronDown size={14} className="cp-acc-chev" />
      </button>
      {open && <div className="cp-acc-body">{children}</div>}
    </div>
  );
}

function SubField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cp-sub">
      <label className="cp-sub-label">{label}</label>
      {children}
    </div>
  );
}

function Chips({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="cp-chips">
      {options.map(opt => (
        <button key={opt} className={`cp-chip ${value === opt ? 'is-active' : ''}`}
          onClick={() => { hapticLight(); onChange(value === opt ? '' : opt); }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function ChipsMulti({ value, onToggle, options }: { value: string[]; onToggle: (v: string) => void; options: string[] }) {
  return (
    <div className="cp-chips">
      {options.map(opt => (
        <button key={opt} className={`cp-chip ${value.includes(opt) ? 'is-active' : ''}`} onClick={() => onToggle(opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────

const CREAR_STYLES = `
.cp-shell {
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
    radial-gradient(circle at 20% 10%, rgba(31,26,20,0.025) 1px, transparent 1px),
    radial-gradient(circle at 80% 60%, rgba(31,26,20,0.02) 1px, transparent 1px);
  background-size: 28px 28px, 44px 44px;
  position: relative;
}

/* Mode select */
.cp-shell .cp-mode-cards { display: flex; flex-direction: column; gap: 10px; margin: 24px 20px 0; }
.cp-shell .cp-mode-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 16px;
  cursor: pointer; font-family: inherit; text-align: left;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-mode-card:active { transform: scale(0.98); }
.cp-shell .cp-mode-icon {
  flex-shrink: 0; width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
}
.cp-shell .cp-mode-text { flex: 1; min-width: 0; }
.cp-shell .cp-mode-text h3 {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 20px; line-height: 1; font-weight: 400;
  color: var(--ink-0); margin: 0; letter-spacing: -0.01em;
}
.cp-shell .cp-mode-text h3 em { font-style: italic; color: var(--accent); }
.cp-shell .cp-mode-text p { margin: 4px 0 0; font-size: 12px; color: var(--ink-2); line-height: 1.4; }
.cp-shell .cp-mode-meta {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.16em;
  color: var(--accent-deep);
  text-transform: uppercase; font-weight: 500;
}
.cp-shell .cp-mode-arrow { color: var(--ink-3); flex-shrink: 0; }
.cp-shell .cp-tip {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 12px 16px;
  margin: 18px 20px;
  background: var(--paper);
  border-radius: 12px;
  font-size: 12px;
  color: var(--ink-2); line-height: 1.4;
}
.cp-shell .cp-tip svg { color: var(--accent); flex-shrink: 0; margin-top: 2px; }

/* Sections */
.cp-shell .cp-section { padding: 24px 20px 0; }
.cp-shell .cp-field-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.cp-shell .cp-field-name { font-size: 12px; font-weight: 600; color: var(--ink-1); }
.cp-shell .cp-field-num {
  display: inline-block; margin-right: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; color: var(--accent-deep); font-weight: 500;
}
.cp-shell .cp-field-hint { font-size: 11px; color: var(--ink-3); font-style: italic; }

/* Render */
.cp-shell .cp-render-strip { display: flex; flex-wrap: wrap; gap: 6px; }
.cp-shell .cp-render-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.cp-shell .cp-render-card {
  position: relative; aspect-ratio: 4/5;
  border-radius: 14px; overflow: hidden;
  background: #2A1F18;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.3s var(--ease);
  font-family: inherit; padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-render-card:active { transform: scale(0.96); }
.cp-shell .cp-render-card.is-active { border-color: var(--accent); }
.cp-shell .cp-render-card-img { position: absolute; inset: 0; background-size: cover; background-position: center; }
.cp-shell .cp-render-card::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%);
}
.cp-shell .cp-render-card-overlay { position: absolute; bottom: 10px; left: 12px; right: 12px; z-index: 2; color: #FFFCF5; text-align: left; }
.cp-shell .cp-render-card-name { font-family: 'Instrument Serif', 'Playfair Display', serif; font-size: 16px; font-style: italic; line-height: 1; }
.cp-shell .cp-render-card-meta { margin-top: 2px; font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; opacity: 0.78; text-transform: uppercase; }
.cp-shell .cp-render-card-check {
  position: absolute; top: 10px; right: 10px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  color: var(--bg-card); z-index: 2;
}

/* Photo grid (Path B) */
.cp-shell .cp-photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cp-shell .cp-photo-tile { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--paper); }
.cp-shell .cp-photo-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cp-shell .cp-photo-x {
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  border: none;
  color: #FFFCF5;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.cp-shell .cp-photo-add {
  aspect-ratio: 1; border-radius: 12px;
  background: var(--paper);
  border: 1.5px dashed var(--accent);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px;
  color: var(--accent-deep);
  cursor: pointer; font-family: inherit;
  font-size: 11px; font-weight: 600;
  transition: transform 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-photo-add:active { transform: scale(0.95); }

/* Input */
.cp-shell .cp-input {
  width: 100%; padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-family: inherit; font-size: 14px;
  color: var(--ink-0); outline: none;
  transition: border-color 0.3s var(--ease);
}
.cp-shell .cp-input:focus { border-color: var(--accent); }
.cp-shell .cp-input::placeholder { color: var(--ink-3); }

/* Dropdown */
.cp-shell .cp-dropdown-wrap label {
  display: block; font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3); margin-bottom: 6px;
}

/* Chips */
.cp-shell .cp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cp-shell .cp-chip {
  padding: 7px 12px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 12px; font-weight: 500;
  color: var(--ink-1);
  cursor: pointer; font-family: inherit;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-chip:active { transform: scale(0.94); }
.cp-shell .cp-chip.is-active {
  background: var(--ink-0); border-color: var(--ink-0); color: var(--bg-card);
}

/* Accordion */
.cp-shell .cp-acc {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: border-color 0.3s var(--ease);
}
.cp-shell .cp-acc.is-open { border-color: var(--accent); }
.cp-shell .cp-acc-head {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-acc-head:active { background: var(--paper); }
.cp-shell .cp-acc-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent-deep);
  font-size: 14px; flex-shrink: 0;
}
.cp-shell .cp-acc-title {
  flex: 1; text-align: left;
  font-size: 13px; font-weight: 600;
  color: var(--ink-0);
}
.cp-shell .cp-acc.is-open .cp-acc-chev { transform: rotate(180deg); }
.cp-shell .cp-acc-chev { color: var(--ink-3); transition: transform 0.3s var(--ease); }
.cp-shell .cp-acc-body { padding: 4px 14px 14px; }

/* SubField inside accordion */
.cp-shell .cp-sub { padding: 10px 0; }
.cp-shell .cp-sub-label {
  display: block;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 6px;
}

/* Toggle button (free prompt / refine) */
.cp-shell .cp-toggle-btn {
  display: flex; align-items: center; gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  font-family: inherit; font-size: 13px; font-weight: 500;
  color: var(--ink-1); cursor: pointer;
  transition: border-color 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-toggle-btn:active { border-color: var(--accent); }
.cp-shell .cp-toggle-btn span:nth-of-type(1) { flex: 1; text-align: left; }
.cp-shell .cp-toggle-btn .cp-rotate { transform: rotate(180deg); }
.cp-shell .cp-toggle-btn svg:last-child { transition: transform 0.3s var(--ease); }
.cp-shell .cp-prompt-box {
  margin-top: 8px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
}
.cp-shell .cp-textarea {
  width: 100%; background: transparent; border: none; outline: none; resize: none;
  font-family: inherit; font-size: 13px; color: var(--ink-0); line-height: 1.5;
}
.cp-shell .cp-textarea::placeholder { color: var(--ink-3); }
.cp-shell .cp-prompt-meta {
  margin-top: 6px; padding-top: 6px;
  border-top: 1px dashed var(--line);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.1em; color: var(--ink-3);
}

/* Shot type — section header + 5-tile grid */
.cp-shell .cp-section-head { margin-bottom: 10px; }
.cp-shell .cp-section-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 400;
  margin: 0 0 4px;
  color: var(--ink-0);
}
.cp-shell .cp-section-hint {
  font-size: 11px;
  color: var(--ink-2);
  margin: 0;
  line-height: 1.4;
}
.cp-shell .cp-shot-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.cp-shell .cp-shot-tile {
  display: flex; flex-direction: column;
  align-items: flex-start; gap: 2px;
  padding: 12px 13px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s ease;
}
.cp-shell .cp-shot-tile.is-on {
  background: var(--ink-0);
  border-color: var(--ink-0);
  color: var(--bg-card);
}
.cp-shell .cp-shot-emoji {
  font-size: 18px;
  line-height: 1;
  margin-bottom: 4px;
}
.cp-shell .cp-shot-tile strong {
  font-size: 12px;
  font-weight: 600;
}
.cp-shell .cp-shot-tile small {
  font-size: 10px;
  color: var(--ink-3);
  line-height: 1.35;
}
.cp-shell .cp-shot-tile.is-on small {
  color: rgba(255, 252, 245, 0.6);
}

/* Reinforcement chips — click-to-append examples for the freePrompt textarea */
.cp-shell .cp-shot-hint {
  font-size: 11px;
  color: var(--ink-2);
  line-height: 1.45;
  margin-bottom: 8px;
}
.cp-shell .cp-reinforce-chips {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-top: 8px;
}
.cp-shell .cp-reinforce-chip {
  padding: 6px 11px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 11px;
  color: var(--ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  max-width: 100%;
  text-align: left;
  transition: background 0.15s ease;
}
.cp-shell .cp-reinforce-chip:active { background: var(--paper); }

/* Color palette grid — multi-swatch visual tiles */
.cp-shell .cp-palette-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.cp-shell .cp-palette-tile {
  display: flex; flex-direction: column;
  align-items: flex-start; gap: 8px;
  padding: 12px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.cp-shell .cp-palette-tile.is-on {
  background: var(--ink-0);
  border-color: var(--ink-0);
  color: var(--bg-card);
}
.cp-shell .cp-palette-tile:active { transform: scale(0.97); }
.cp-shell .cp-palette-swatches {
  display: flex;
  width: 100%;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--line);
}
.cp-shell .cp-palette-tile.is-on .cp-palette-swatches {
  box-shadow: 0 0 0 1px rgba(255, 252, 245, 0.15);
}
.cp-shell .cp-palette-swatch {
  flex: 1;
  display: block;
}
.cp-shell .cp-palette-tile strong {
  font-size: 12px;
  font-weight: 600;
}

/* Refine row */
.cp-shell .cp-refine-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 8px; padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.cp-shell .cp-refine-btn {
  padding: 7px 14px;
  background: var(--accent);
  color: #FFFCF5;
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 11px; font-weight: 600;
  cursor: pointer;
}
.cp-shell .cp-refine-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Preview grid */
.cp-shell .cp-preview-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.cp-shell .cp-preview-tile {
  position: relative;
  aspect-ratio: 3/4;
  border-radius: 14px;
  overflow: hidden;
  background: var(--paper);
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-preview-tile:active { transform: scale(0.97); }
.cp-shell .cp-preview-tile.is-selected { border-color: var(--accent); }
.cp-shell .cp-preview-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cp-shell .cp-preview-num {
  position: absolute; top: 6px; left: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; font-weight: 600; letter-spacing: 0.1em;
  color: rgba(253, 247, 232, 0.92);
  background: rgba(26, 20, 16, 0.65);
  backdrop-filter: blur(4px);
  padding: 2px 6px;
  border-radius: 4px;
}
.cp-shell .cp-preview-check {
  position: absolute; top: 6px; right: 6px;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  color: var(--bg-card);
}
.cp-shell .cp-preview-info {
  display: flex; gap: 6px; align-items: flex-start;
  padding: 10px 12px;
  margin-top: 12px;
  background: var(--paper);
  border-radius: 10px;
  font-size: 11px;
  color: var(--ink-2);
}
.cp-shell .cp-preview-info svg { color: var(--accent); flex-shrink: 0; margin-top: 1px; }

.cp-shell .cp-preview-actions {
  display: flex; justify-content: center;
}
.cp-shell .cp-action-ghost {
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
.cp-shell .cp-action-ghost:active { transform: scale(0.96); border-color: var(--accent); color: var(--accent-deep); }
.cp-shell .cp-action-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* Generation overlay */
.cp-shell .cp-gen-overlay {
  position: fixed;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px;
  height: 100vh;
  background: rgba(245, 235, 219, 0.96);
  backdrop-filter: blur(12px);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px;
  z-index: 50;
}
.cp-shell .cp-loader-ring {
  width: 96px; height: 96px;
  border-radius: 50%;
  background: var(--paper);
  position: relative; overflow: hidden;
  border: 1px solid var(--line);
}
.cp-shell .cp-loader-fill {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%);
  transition: height 0.4s var(--ease);
}
.cp-shell .cp-loader-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px; font-weight: 600;
  color: var(--accent-deep);
}
.cp-shell .cp-loader-label { font-size: 13px; color: var(--ink-2); }
.cp-shell .cp-cancel-btn {
  margin-top: 4px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 11px; color: var(--ink-2);
  cursor: pointer; font-family: inherit;
}

/* Soul style preset grid */
.cp-shell .cp-soul-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.cp-shell .cp-soul-tile {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-soul-tile:active { transform: scale(0.96); }
.cp-shell .cp-soul-tile.is-active {
  border-color: var(--accent);
  background: var(--paper);
}
.cp-shell .cp-soul-icon { font-size: 16px; flex-shrink: 0; }
.cp-shell .cp-soul-name {
  font-size: 12px; font-weight: 500;
  color: var(--ink-1);
  line-height: 1.2;
  text-align: left;
}
.cp-shell .cp-soul-tile.is-active .cp-soul-name {
  color: var(--accent-deep); font-weight: 600;
}

/* Full sheet toggle */
.cp-shell .cp-sheet-toggle {
  display: flex; align-items: flex-start; gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-sheet-toggle:active { transform: scale(0.98); }
.cp-shell .cp-sheet-toggle.is-on {
  border-color: var(--accent);
  background: var(--paper);
}
.cp-shell .cp-sheet-toggle:disabled { opacity: 0.5; cursor: not-allowed; }
.cp-shell .cp-sheet-checkbox {
  width: 20px; height: 20px;
  border-radius: 6px;
  border: 2px solid var(--line);
  background: var(--bg-card);
  display: flex; align-items: center; justify-content: center;
  color: #FFFCF5;
  flex-shrink: 0;
  margin-top: 1px;
}
.cp-shell .cp-sheet-toggle.is-on .cp-sheet-checkbox {
  background: var(--accent);
  border-color: var(--accent);
}
.cp-shell .cp-sheet-content { flex: 1; min-width: 0; }
.cp-shell .cp-sheet-content strong {
  display: block;
  font-size: 13px;
  color: var(--ink-0);
  font-weight: 600;
}
.cp-shell .cp-sheet-content small {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--ink-2);
  line-height: 1.4;
}
.cp-shell .cp-sheet-content small strong {
  display: inline;
  color: var(--accent-deep);
  font-size: 11px;
}

/* Sheets gallery (after generation, before save) */
.cp-shell .cp-sheets-gallery {
  display: flex; flex-direction: column; gap: 12px;
}
.cp-shell .cp-sheet-item {
  display: flex; flex-direction: column; gap: 6px;
}
.cp-shell .cp-sheet-label {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-deep);
  font-weight: 500;
}
.cp-shell .cp-sheet-img-wrap {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--paper);
  border: 1px solid var(--line);
}
.cp-shell .cp-sheet-img {
  width: 100%; height: auto;
  display: block;
  max-height: 320px;
  object-fit: cover;
}
.cp-shell .cp-fade-in {
  animation: cp-fade-in 380ms var(--ease) both;
}
@keyframes cp-fade-in {
  from { opacity: 0; transform: scale(1.02); filter: blur(2px); }
  to   { opacity: 1; transform: scale(1); filter: blur(0); }
}
.cp-shell .cp-sheet-x {
  position: absolute;
  top: 8px; right: 8px;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: rgba(20, 16, 14, 0.7);
  backdrop-filter: blur(6px);
  border: none;
  color: #FFFCF5;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: transform 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
  z-index: 2;
}
.cp-shell .cp-sheet-x:active { transform: scale(0.92); }
.cp-shell .cp-sheet-img-btn {
  display: block; width: 100%;
  background: transparent; border: none; padding: 0;
  cursor: pointer; font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-sheet-img-btn:active img { transform: scale(0.99); }
.cp-shell .cp-sheet-img-btn img { transition: transform 0.2s var(--ease); }

/* Lightbox — fullscreen view */
.cp-shell .cp-lightbox {
  position: fixed; inset: 0;
  background: rgba(20, 16, 14, 0.96);
  backdrop-filter: blur(10px);
  z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: cp-lb-fade 200ms ease-out;
}
@keyframes cp-lb-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.cp-shell .cp-lightbox-img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  animation: cp-lb-img-in 280ms var(--ease);
}
@keyframes cp-lb-img-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
.cp-shell .cp-lightbox-actions {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; flex-wrap: wrap;
  justify-content: center;
  max-width: calc(100% - 32px);
}
.cp-shell .cp-lb-btn {
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
  transition: transform 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-lb-btn:active { transform: scale(0.96); }
.cp-shell .cp-lb-btn.is-on {
  background: var(--accent);
  color: #FFFCF5;
}
.cp-shell .cp-lb-btn-danger {
  background: rgba(185, 84, 74, 0.95);
  color: #FFFCF5;
}
.cp-shell .cp-lb-label {
  display: inline-flex; align-items: center;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 252, 245, 0.92);
}
.cp-shell .cp-lightbox-close {
  position: fixed;
  top: max(20px, env(safe-area-inset-top));
  right: 20px;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.16);
  backdrop-filter: blur(8px);
  border: none;
  color: #FFFCF5;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-lightbox-close:active { transform: scale(0.92); }

/* Engine selector — main grid */
.cp-shell .cp-engine-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
}
.cp-shell .cp-engine-tile {
  display: flex; flex-direction: column; gap: 4px;
  padding: 12px 10px;
  background: var(--bg-card);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  cursor: pointer; font-family: inherit;
  text-align: center;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-engine-tile:active { transform: scale(0.96); }
.cp-shell .cp-engine-tile.is-active {
  border-color: var(--accent);
  background: var(--paper);
}
.cp-shell .cp-engine-name {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px; font-style: italic;
  letter-spacing: -0.01em;
  color: var(--ink-0);
  line-height: 1;
}
.cp-shell .cp-engine-tile.is-active .cp-engine-name { color: var(--accent-deep); }
.cp-shell .cp-engine-tagline {
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
  line-height: 1.3;
}

/* Variant count grid */
.cp-shell .cp-variant-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
}
.cp-shell .cp-variant-tile {
  display: flex; flex-direction: column; gap: 3px;
  padding: 12px 8px;
  background: var(--bg-card);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  cursor: pointer; font-family: inherit;
  text-align: center;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-variant-tile:active { transform: scale(0.96); }
.cp-shell .cp-variant-tile.is-active {
  border-color: var(--accent);
  background: var(--paper);
}
.cp-shell .cp-variant-num {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-style: italic;
  font-size: 26px;
  line-height: 1;
  color: var(--ink-0);
}
.cp-shell .cp-variant-tile.is-active .cp-variant-num { color: var(--accent-deep); }
.cp-shell .cp-variant-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-1);
}
.cp-shell .cp-variant-meta {
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* Engine pills (mini, in preview) */
.cp-shell .cp-engine-pills {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.cp-shell .cp-engine-pill {
  padding: 6px 14px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 500;
  color: var(--ink-1);
  cursor: pointer;
  transition: all 0.3s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.cp-shell .cp-engine-pill:active { transform: scale(0.94); }
.cp-shell .cp-engine-pill.is-active {
  background: var(--ink-0);
  border-color: var(--ink-0);
  color: var(--bg-card);
}

/* Sheet generation progress (3 steps) */
.cp-shell .cp-sheet-progress {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}
.cp-shell .cp-sheet-step {
  display: flex; flex-direction: column;
  align-items: center; gap: 6px;
  font-size: 11px;
  color: var(--ink-3);
  opacity: 0.4;
  transition: opacity 0.3s var(--ease);
}
.cp-shell .cp-sheet-step.is-active {
  opacity: 1; color: var(--accent-deep); font-weight: 600;
}
.cp-shell .cp-sheet-step.is-done { opacity: 0.7; color: var(--ink-2); }
.cp-shell .cp-sheet-step-num {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  background: var(--bg-card);
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600; font-size: 13px;
}
.cp-shell .cp-sheet-step.is-active .cp-sheet-step-num {
  border-color: var(--accent);
  background: var(--accent);
  color: #FFFCF5;
}
.cp-shell .cp-sheet-step.is-done .cp-sheet-step-num {
  border-color: var(--accent-deep);
  background: var(--accent-deep);
  color: #FFFCF5;
}
`;
