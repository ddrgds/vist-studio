/**
 * MobileEditor — native AI editor with bottom-sheet tools.
 *
 *   Canvas-first: image fills viewport, controls live in a draggable bottom sheet.
 *   Tools v1 (single-input transforms): AI Edit, Reiluminar, Estilo, Piel,
 *   Retoque, Quitar Fondo. Multi-ref tools (Try-On, Face Swap, Inpaint, 360°)
 *   stay desktop-only for now — they need richer UX.
 *
 *   Source flow: pick from Galería → enter editor with that image as canvas.
 *   Or upload from camera/photos. No standalone Editor entry from Home — it
 *   always starts with an image (Reimaginar/Headshot are for prompt-only flows).
 *
 * Mood: ATELIER (cream + terracotta) — same family as the rest of the suite.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, Sparkles, Sun, Palette, Wand2, Aperture, Scissors,
  Image as ImageIcon, Camera, ChevronUp, ArrowUp, Loader, Download, X, RotateCcw,
  Sliders, Film, Shirt, Users, Layers, Repeat, Maximize2, Plus, Package, Paperclip,
} from 'lucide-react';
import type { Page } from '../App';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore';
import { useCharacterStore } from '../stores/characterStore';
import { usePipelineStore } from '../stores/pipelineStore';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../services/nativeService';
import type { AppMood } from '../components/apps/_shared';
import { urlToFile, useAppUpload, HeroProSwitch, HERO_PRO_EXTRA_COST } from '../components/apps/_shared';

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

// ─── Tools registry ────────────────────────────────

type ToolId =
  | 'freeai' | 'relight' | 'style' | 'realskin' | 'enhance' | 'rembg'
  | 'tryon' | 'faceswap' | 'composite' | 'rotate360' | 'expand' | 'product';

interface ToolDef {
  id: ToolId;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  cost: number;
  desc: string;
}

const TOOLS: ToolDef[] = [
  { id: 'freeai',    label: 'AI Edit',    icon: Sparkles,  cost: 13, desc: 'Edita con cualquier instrucción' },
  { id: 'relight',   label: 'Reluz',      icon: Sun,       cost: 6,  desc: 'Cambia la iluminación' },
  { id: 'style',     label: 'Estilo',     icon: Palette,   cost: 6,  desc: 'Estilo artístico' },
  { id: 'realskin',  label: 'Piel real',  icon: Wand2,     cost: 6,  desc: 'Poros y textura natural' },
  { id: 'enhance',   label: 'Retoque',    icon: Aperture,  cost: 6,  desc: 'Suavizado editorial' },
  { id: 'tryon',     label: 'Try-On',     icon: Shirt,     cost: 14, desc: 'Pruébate ropa o accesorios' },
  { id: 'product',   label: 'Producto',   icon: Package,   cost: 14, desc: 'Sostén o usa un producto en mano' },
  { id: 'faceswap',  label: 'Cambio de rostro', icon: Users, cost: 6, desc: 'Intercambia el rostro' },
  { id: 'composite', label: 'Escena',     icon: Layers,    cost: 6,  desc: 'Cambia el fondo/escenario' },
  { id: 'rotate360', label: 'Ángulos',    icon: Repeat,    cost: 19, desc: 'Rota la cámara 360°' },
  { id: 'expand',    label: 'Expandir',   icon: Maximize2, cost: 14, desc: 'Extiende los bordes' },
  { id: 'rembg',     label: 'Sin fondo',  icon: Scissors,  cost: 6,  desc: 'Quita el fondo' },
];

// ─── Tool-specific presets ─────────────────────────

const RELIGHT_PRESETS = [
  { id: 'golden',    label: 'Golden Hour', prompt: 'golden hour warm sunset lighting, warm 3200K, long soft shadows, golden rim highlights' },
  { id: 'studio',    label: 'Studio',      prompt: 'professional studio lighting, beauty dish key, neutral 5500K, clean even illumination' },
  { id: 'neon',      label: 'Neón',        prompt: 'neon colored lighting, vivid color cast on skin, urban night atmosphere' },
  { id: 'dramatic',  label: 'Dramático',   prompt: 'dramatic chiaroscuro lighting, high contrast, deep shadows, single hard key light' },
  { id: 'moonlight', label: 'Luna',        prompt: 'soft moonlight, blue-silver cast, gentle shadows, nocturnal atmosphere' },
  { id: 'overcast',  label: 'Nublado',     prompt: 'overcast daylight, perfectly diffused shadowless illumination, neutral color' },
];

const RELIGHT_DIRS = [
  { id: 'left',   label: 'Izq',     prompt: 'Light from the left side' },
  { id: 'front',  label: 'Frontal', prompt: 'Light from the front' },
  { id: 'right',  label: 'Der',     prompt: 'Light from the right side' },
  { id: 'behind', label: 'Atrás',   prompt: 'Backlight from behind, rim lighting' },
];

const STYLE_PRESETS = [
  { id: 'anime',     label: 'Anime',      prompt: 'high-quality anime illustration: clean cel-shaded coloring, precise linework, large expressive eyes, vibrant palette' },
  { id: 'oil',       label: 'Óleo',       prompt: 'classical oil painting: visible impasto brushwork, Renaissance color mixing, warm Rembrandt lighting, canvas texture' },
  { id: 'watercolor',label: 'Acuarela',   prompt: 'delicate watercolor painting: transparent wash layers, wet-on-wet bleeding, soft color blooms' },
  { id: 'sketch',    label: 'Lápiz',      prompt: 'detailed pencil sketch: graphite on textured paper, varied line weight, cross-hatching for shadow' },
  { id: 'popart',    label: 'Pop Art',    prompt: 'bold Pop Art: flat graphic colors with Ben-Day dots, strong black outlines, Warhol/Lichtenstein aesthetic' },
  { id: 'vintage',   label: 'Vintage',    prompt: 'vintage 1970s film: Kodachrome saturated reds, heavy organic grain, slight fading, warm amber cast' },
  { id: 'cyberpunk', label: 'Cyberpunk',  prompt: 'cyberpunk digital art: neon-lit, holographic UI, teal-magenta split, chrome accents' },
  { id: 'pixel',     label: 'Pixel',      prompt: 'pixel art: 128px scale, limited 32-color palette, intentional dithering, retro game aesthetic' },
];

// 360° camera angles — single direction per generation.
const ROTATE_DIRECTIONS = [
  { id: 'left45',   label: 'Izq 45°',  prompt: 'Rotate camera to 45 degrees from the left side. Subject seen at three-quarter left view.' },
  { id: 'left90',   label: 'Izq 90°',  prompt: 'Rotate camera to 90 degrees from the left side. Subject seen in full profile from the left.' },
  { id: 'right45',  label: 'Der 45°',  prompt: 'Rotate camera to 45 degrees from the right side. Subject seen at three-quarter right view.' },
  { id: 'right90',  label: 'Der 90°',  prompt: 'Rotate camera to 90 degrees from the right side. Subject seen in full profile from the right.' },
  { id: 'back',     label: 'Atrás',    prompt: 'Rotate camera fully behind the subject. Show the back of the subject from camera position.' },
  { id: 'low',      label: 'Picado bajo', prompt: 'Move camera angle lower, looking up at the subject. Heroic low-angle perspective.' },
  { id: 'high',     label: 'Picado alto', prompt: 'Move camera angle higher, looking down at the subject. Editorial high-angle perspective.' },
  { id: 'closer',   label: 'Más cerca',   prompt: 'Move camera closer to the subject. Tighter framing, more intimate composition.' },
];

// Scene/composite presets — preset scenarios for background change.
const SCENE_PRESETS = [
  { id: 'studio',     label: 'Estudio',    prompt: 'professional studio backdrop, neutral seamless paper, soft even lighting' },
  { id: 'beach',      label: 'Playa',      prompt: 'tropical beach at golden hour, ocean waves softly out of focus, warm sand, sunset light' },
  { id: 'urban',      label: 'Urbano',     prompt: 'modern urban street at dusk, neon signs softly out of focus, wet asphalt reflections' },
  { id: 'nature',     label: 'Naturaleza', prompt: 'lush green forest with dappled sunlight filtering through leaves, natural earth tones' },
  { id: 'rooftop',    label: 'Rooftop',    prompt: 'rooftop overlooking a city skyline at blue hour, distant lights softly out of focus' },
  { id: 'minimal',    label: 'Minimal',    prompt: 'clean minimalist interior, off-white walls, single window with soft daylight, architectural shadows' },
  { id: 'cafe',       label: 'Café',       prompt: 'cozy modern café interior, warm tungsten lighting, blurred patrons in background, intimate atmosphere' },
  { id: 'nightclub',  label: 'Nightlife',  prompt: 'upscale nightclub with neon and strobing colored lights, blurred crowd, party atmosphere' },
];

// Expand directions — outpaint with replicate Bria.
const EXPAND_DIRECTIONS = [
  { id: 'all',   label: 'Todos lados' },
  { id: 'up',    label: 'Arriba' },
  { id: 'down',  label: 'Abajo' },
  { id: 'left',  label: 'Izquierda' },
  { id: 'right', label: 'Derecha' },
] as const;

const EXPAND_PIXELS = [
  { id: 256,  label: 'Pequeño · 256px' },
  { id: 512,  label: 'Medio · 512px' },
  { id: 1024, label: 'Grande · 1024px' },
] as const;

// Retoque (enhance) — granular intensity prompts.
// Slider 0..100 → suave / editorial / glossy. Each level dials up
// the polish + dials down what stays "raw".
function buildEnhancePrompt(intensity: number): string {
  if (intensity < 34) {
    // Suave — light cleanup, mostly natural
    return 'LIGHT skin cleanup (overrides preservation rule for skin only): Gently soften the most obvious blemishes and stray hairs. Keep natural skin texture, pores, and variation visible. Subtle brightening of eyes and teeth ONLY if they look dull. Preserve identity, expression, makeup, hair, outfit, pose, background, and lighting exactly.';
  }
  if (intensity < 67) {
    // Editorial — balanced magazine retouch (current default)
    return 'Editorial magazine retouching on skin only: smooth skin tone evenly, remove blemishes and stray hairs, refine pores while keeping natural texture, brighten eyes subtly, whiten teeth subtly. Preserve identity, expression, makeup, hair, outfit, pose, background, and lighting exactly as in the source.';
  }
  // Glossy — heavy polish, magazine cover finish
  return 'HIGH-GLOSS magazine cover retouching on skin only: smooth skin to flawless even tone, fully remove all blemishes, stray hairs, and dark circles, soften pores to a polished finish, noticeably brighten and whiten eyes, whiten teeth visibly, add subtle highlight on cheekbones and nose bridge. Preserve identity, expression, makeup, hair color, outfit, pose, background, and lighting exactly as in the source.';
}

function enhanceLabel(intensity: number): string {
  if (intensity < 34) return 'Suave';
  if (intensity < 67) return 'Editorial';
  return 'Glossy';
}

// Piel real — granular intensity prompts
// Slider value 0..100 → maps to 3 levels: sutil / natural / intenso.
// Each level dials up the skin-detail vocabulary and dials down smoothing.
function buildRealSkinPrompt(intensity: number): string {
  // Level 1 — Sutil: hint of texture, looks polished but not plastic
  if (intensity < 34) {
    return 'SKIN RETOUCH (overrides preservation rule for skin): Add subtle, lightly visible natural skin texture — fine pores, very light variation in skin tone, soft natural light reflection. Keep skin looking polished and clean but NOT plastic or airbrushed. Identity, outfit, pose, background, lighting unchanged.';
  }
  // Level 2 — Natural: documentary, balanced (default)
  if (intensity < 67) {
    return 'SKIN RETOUCH (overrides preservation rule for skin): Add detailed natural skin texture — clearly visible pores, micro-freckles, slight color variation across face, natural luminosity. Documentary quality, not over-processed. NO digital smoothing, NO airbrush. Keep identity, outfit, pose, background, lighting exactly the same.';
  }
  // Level 3 — Intenso: raw, magazine close-up, every detail
  return 'SKIN RETOUCH (overrides preservation rule for skin): Add HEAVILY detailed natural skin texture — large visible pores, prominent micro-freckles, fine blemishes, peach fuzz, subtle redness around nose and cheeks, asymmetric color variation, natural sebum sheen on T-zone. Raw documentary close-up quality. AGGRESSIVELY remove any digital smoothing, airbrush, or porcelain finish. Identity, outfit, pose, background, lighting exactly the same.';
}

function realSkinLabel(intensity: number): string {
  if (intensity < 34) return 'Sutil';
  if (intensity < 67) return 'Natural';
  return 'Intenso';
}

// ─── Modo Básico — CSS filter presets (free, client-side canvas) ────
// Each entry maps to a CSS `filter:` string. Sliders multiply on top.

interface BasicFilter {
  id: string;
  label: string;
  /** Base CSS filter string applied to the image. Sliders adjust on top. */
  base: string;
}

const BASIC_FILTERS: BasicFilter[] = [
  { id: 'none',    label: 'Original',  base: '' },
  { id: 'bw',      label: 'B/N',       base: 'grayscale(1) contrast(1.05)' },
  { id: 'sepia',   label: 'Sepia',     base: 'sepia(0.65) contrast(1.05) brightness(1.02)' },
  { id: 'vintage', label: 'Vintage',   base: 'sepia(0.30) saturate(0.85) contrast(1.10) hue-rotate(-10deg)' },
  { id: 'cool',    label: 'Frío',      base: 'saturate(1.15) contrast(1.05) hue-rotate(10deg) brightness(1.02)' },
  { id: 'warm',    label: 'Cálido',    base: 'saturate(1.20) contrast(1.05) hue-rotate(-12deg) brightness(1.04)' },
  { id: 'fade',    label: 'Fade',      base: 'contrast(0.85) brightness(1.10) saturate(0.90)' },
  { id: 'mono',    label: 'Mono',      base: 'grayscale(1) contrast(1.20) brightness(0.95)' },
];

// ─── Modo Efectos — film/camera presets via NB2 (6 cr each) ──────────

interface EffectPreset {
  id: string;
  label: string;
  cat: 'film' | 'cam' | 'fx';
  emoji: string;
  prompt: string;
}

const EFFECT_PRESETS: EffectPreset[] = [
  { id: 'portra',     label: 'Portra 400',    cat: 'film', emoji: '🎞️', prompt: 'Apply Kodak Portra 400 film emulation: warm skin tones, slightly muted greens, gentle pastel color palette, fine organic grain texture, soft highlight roll-off, nostalgic analog feel. Preserve identity, pose, expression, outfit, composition exactly.' },
  { id: 'superia',    label: 'Fuji Superia',  cat: 'film', emoji: '🌸', prompt: 'Apply Fujifilm Superia 400 look: vivid saturated greens and blues, slightly cool shadows, punchy contrast, visible fine grain, Japanese film aesthetic. Preserve identity, pose, expression, outfit, composition exactly.' },
  { id: 'cinestill',  label: 'CineStill 800T',cat: 'film', emoji: '🌃', prompt: 'Apply CineStill 800T tungsten film look: heavy orange halation around highlights, teal-orange color split, cinematic night photography feel, strong visible grain, red glow on bright areas. Preserve identity, pose, expression, outfit, composition exactly.' },
  { id: 'kodachrome', label: 'Kodachrome',    cat: 'film', emoji: '🌅', prompt: 'Apply vintage Kodachrome film look: extremely saturated warm reds and yellows, deep rich shadows, high contrast, 1960s-70s photography aesthetic. Preserve identity, pose, expression, outfit, composition exactly.' },
  { id: 'trix',       label: 'B/N Tri-X',     cat: 'film', emoji: '🖤', prompt: 'Convert to Kodak Tri-X 400 black and white film: high contrast, deep blacks, visible coarse grain, dramatic tonal range, classic street photography look. Preserve identity, pose, expression, outfit, composition exactly.' },
  { id: 'ektar',      label: 'Ektar 100',     cat: 'film', emoji: '🔴', prompt: 'Apply Kodak Ektar 100 film: extremely saturated vivid colors especially reds and blues, ultra-fine grain, very sharp, high contrast, landscape photography look. Preserve identity, pose, expression, outfit, composition exactly.' },
  { id: 'disposable', label: 'Desechable',    cat: 'cam',  emoji: '🔦', prompt: 'Apply disposable camera look: strong direct flash on subject, heavy vignette, oversaturated colors, random warm light leak on one edge, cheap lens softness on edges, party photography vibe, date stamp in corner. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'polaroid',   label: 'Polaroid',      cat: 'cam',  emoji: '🖼️', prompt: 'Apply Polaroid instant film look: slightly faded washed colors, warm tint, soft vignette, overexposed highlights, add a white Polaroid border frame around the entire image. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'lomo',       label: 'Lomo LC-A',     cat: 'cam',  emoji: '🔮', prompt: 'Apply Lomography LC-A camera look: extreme color saturation, heavy dark vignette in all corners, high contrast, slight color shift toward warm tones, tunnel vision effect, experimental analog feel. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'halfframe',  label: 'Half Frame',    cat: 'cam',  emoji: '📐', prompt: 'Apply half-frame camera look: warm sepia-toned color grade, light leak bleeding from the left edge in warm orange, fine grain texture, slightly soft focus, intimate vintage diary photography feel. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'bloom',      label: 'Bloom',         cat: 'fx',   emoji: '✨', prompt: 'Add a dreamy soft bloom/glow effect: soft diffused highlights that glow and bleed into surrounding areas, slight overexposure, ethereal atmosphere, like shooting through a pro-mist filter, maintain subject sharpness. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'vhs',        label: 'VHS Retro',     cat: 'fx',   emoji: '📼', prompt: 'Apply VHS tape recording look: horizontal scan lines, slight RGB color separation, tracking distortion artifacts, slightly blurry, washed out desaturated colors, 1990s home video aesthetic. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'infrared',   label: 'Infrarrojo',    cat: 'fx',   emoji: '🔴', prompt: 'Apply infrared film photography look: vegetation and foliage turns bright white or pink, sky becomes very dark, surreal false-color palette, dreamlike otherworldly quality. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'xpro',       label: 'Cross Process', cat: 'fx',   emoji: '🧪', prompt: 'Apply cross-processed film look: extreme unnatural color shifts with heavy cyan and magenta tints, increased contrast, experimental colors, like developing slide film in negative chemicals. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'goldenfx',   label: 'Golden Hour',   cat: 'fx',   emoji: '🌤️', prompt: 'Apply golden hour warm sunlight effect: warm amber-gold directional light from the side, long soft shadows, warm skin tones, golden rim highlights on hair, sunset magic hour atmosphere. Preserve identity, pose, expression, outfit, composition.' },
  { id: 'noir',       label: 'Film Noir',     cat: 'fx',   emoji: '🕵️', prompt: 'Convert to dramatic film noir: extreme high contrast black and white, deep inky blacks, harsh single-source directional shadows, theatrical chiaroscuro lighting, 1940s detective movie aesthetic. Preserve identity, pose, expression, outfit, composition.' },
];

const EFFECT_CATS: { id: 'all' | 'film' | 'cam' | 'fx'; label: string }[] = [
  { id: 'all',  label: 'Todos' },
  { id: 'film', label: 'Películas' },
  { id: 'cam',  label: 'Cámaras' },
  { id: 'fx',   label: 'Efectos' },
];

const EFFECT_COST = 6;

// ─── Component ─────────────────────────────────────

interface Props {
  onNav: (p: Page) => void;
  /** Optional: image to start editing (passed via pipelineStore or selection) */
  initialImageUrl?: string;
}

type Mode = 'pick-source' | 'gallery-pick' | 'editing';

export default function MobileEditor({ onNav }: Props) {
  const toast = useToast();
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const galleryItems = useGalleryStore(s => s.items);
  const characters = useCharacterStore(s => s.characters);
  const addItems = useGalleryStore(s => s.addItems);

  const credits = profile?.creditsRemaining ?? 0;

  // ── Source selection ─────────────────────────────
  const [mode, setMode] = useState<Mode>('pick-source');
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  // Character link — when the base image came from a gallery item that has a
  // characterId, we track it so the physical anchor (character.characteristics)
  // is injected automatically into every generation. User can detach via UI chip.
  const [linkedCharacterId, setLinkedCharacterId] = useState<string | null>(null);
  // Hero Pro tier — when on, routes to NB Pro primary + Flux 2 Max fallback (+15cr)
  const [premiumTier, setPremiumTier] = useState<boolean>(false);

  const upload = useAppUpload({
    onError: (msg) => toast.error(msg),
    onUpload: () => { /* handled in effect below */ },
  });

  // When a fresh upload lands, transition into editing
  useEffect(() => {
    if (upload.customBaseFile && upload.customBaseUrl) {
      setBaseFile(upload.customBaseFile);
      setBaseUrl(upload.customBaseUrl);
      setResultUrl(null);
      setMode('editing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.customBaseFile]);

  // Handoff from MobileGallery — pipelineStore.setHeroShot(url) sets heroShotUrl.
  // We consume it once on mount, load it as the base, and clear so a later
  // back+forth doesn't auto-reopen the same image.
  useEffect(() => {
    const { heroShotUrl, heroShotFile } = usePipelineStore.getState();
    if (!heroShotUrl) return;
    setBaseUrl(heroShotUrl);
    if (heroShotFile) setBaseFile(heroShotFile);
    setResultUrl(null);
    setMode('editing');
    // If the image is in the gallery and is tied to a character, link it so
    // the physical anchor (character.characteristics) is injected into prompts.
    const galleryHit = useGalleryStore.getState().items.find(i => i.url === heroShotUrl);
    if (galleryHit?.characterId) setLinkedCharacterId(galleryHit.characterId);
    // Clear so re-entering the editor without an explicit handoff goes to pick-source.
    usePipelineStore.setState({ heroShotUrl: null, heroShotFile: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Linked character — the one whose physical anchor will be injected into prompts
  const linkedCharacter = useMemo(
    () => (linkedCharacterId ? characters.find(c => c.id === linkedCharacterId) ?? null : null),
    [linkedCharacterId, characters],
  );

  // ── Top tab — editor mode ────────────────────────
  const [editorTab, setEditorTab] = useState<'basic' | 'effects' | 'ai'>('basic');

  // ── Modo Básico (free, client-side canvas) ───────
  const [basicFilterId, setBasicFilterId] = useState<string>('none');
  const [basicBrightness, setBasicBrightness] = useState(100); // %
  const [basicContrast, setBasicContrast] = useState(100);
  const [basicSaturation, setBasicSaturation] = useState(100);
  const [basicWarmth, setBasicWarmth] = useState(0); // -50..50, mapped to hue-rotate

  // ── Modo Efectos ──────────────────────────────────
  const [effectId, setEffectId] = useState<string>('portra');
  const [effectCat, setEffectCat] = useState<'all' | 'film' | 'cam' | 'fx'>('all');

  // ── Tool state (IA mode) ─────────────────────────
  const [activeTool, setActiveTool] = useState<ToolId>('freeai');

  // freeai
  const [freeaiText, setFreeaiText] = useState('');
  // relight
  const [relightPresetId, setRelightPresetId] = useState<string>('golden');
  const [relightDirId, setRelightDirId] = useState<string>('front');
  // style
  const [styleId, setStyleId] = useState<string>('anime');
  // realskin — intensity slider 0..100
  const [realskinIntensity, setRealskinIntensity] = useState<number>(50);
  // enhance — intensity slider 0..100
  const [enhanceIntensity, setEnhanceIntensity] = useState<number>(50);
  // freeai — optional context reference (any photo: location, mood, item)
  const [freeaiRefFile, setFreeaiRefFile] = useState<File | null>(null);
  const [freeaiRefUrl, setFreeaiRefUrl] = useState<string | null>(null);
  // tryon — garment reference image
  const [tryonRefFile, setTryonRefFile] = useState<File | null>(null);
  const [tryonRefUrl, setTryonRefUrl] = useState<string | null>(null);
  // product — product photo to hold/use
  const [productRefFile, setProductRefFile] = useState<File | null>(null);
  const [productRefUrl, setProductRefUrl] = useState<string | null>(null);
  // product usage style — held / wearing / using / drinking
  const [productUsage, setProductUsage] = useState<'hold' | 'wear' | 'use' | 'drink'>('hold');
  // faceswap — face reference image
  const [faceRefFile, setFaceRefFile] = useState<File | null>(null);
  const [faceRefUrl, setFaceRefUrl] = useState<string | null>(null);
  // composite/escena — preset OR custom uploaded scene
  const [scenePresetId, setScenePresetId] = useState<string>('studio');
  const [sceneRefFile, setSceneRefFile] = useState<File | null>(null);
  const [sceneRefUrl, setSceneRefUrl] = useState<string | null>(null);
  const [sceneMode, setSceneMode] = useState<'preset' | 'upload'>('preset');
  // rotate360 — direction
  const [rotateDirId, setRotateDirId] = useState<string>('left45');
  // expand — direction + amount
  const [expandDir, setExpandDir] = useState<typeof EXPAND_DIRECTIONS[number]['id']>('all');
  const [expandPixels, setExpandPixels] = useState<typeof EXPAND_PIXELS[number]['id']>(512);

  // Hidden file input refs for secondary uploads
  const freeaiRefInputRef = useRef<HTMLInputElement>(null);
  const tryonInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);

  function handleRefUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setUrl: (u: string | null) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo imágenes (JPG, PNG, WEBP)');
      e.target.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Máximo 12 MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUrl(reader.result as string);
      setFile(file);
      hapticLight();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const activeToolDef = TOOLS.find(t => t.id === activeTool)!;

  // ── Sheet (compact / expanded) ───────────────────
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // ── History (most-recent first; up to 5) ─────────
  // Stack of edits. Index 0 = most recent. The "current" edit is at index 0
  // when there's a result, or implicit baseUrl when stack is empty.
  const [history, setHistory] = useState<string[]>([]);

  // ── Generation ───────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const [comparing, setComparing] = useState(false); // long-press to show original

  // ── Source picker handlers ───────────────────────
  const [pickingId, setPickingId] = useState<string | null>(null);

  const pickFromGallery = async (item: GalleryItem) => {
    if (pickingId) return;
    hapticMedium();
    setPickingId(item.id);
    try {
      // Convert URL → File immediately. Catches CORS / expired signed URLs / 404s
      // here instead of failing later during generation.
      const file = await urlToFile(item.url, `gallery-${item.id}.png`);
      setBaseFile(file);
      setBaseUrl(item.url);
      setResultUrl(null);
      setMode('editing');
      // If this gallery item belongs to a character, link it so the physical
      // anchor (character.characteristics) gets injected into every prompt.
      setLinkedCharacterId(item.characterId ?? null);
    } catch (e: any) {
      console.error('Gallery pick failed:', e);
      hapticError();
      toast.error('Esa foto no se pudo cargar. Prueba otra o sube una desde tu teléfono.');
    } finally {
      setPickingId(null);
    }
  };

  // Filter gallery to only photo items (skip drafts/sheets, must have URL)
  const editableGallery = useMemo(
    () => galleryItems
      .filter(g => g.url && typeof g.url === 'string' && (!g.tags || !g.tags.includes('sheet')))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    [galleryItems],
  );

  // Group gallery items by date section for phone-gallery feel
  const grouped = useMemo(() => {
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
    for (const it of editableGallery) {
      const ts = it.timestamp || 0;
      if (ts > today) groups[0].items.push(it);
      else if (ts > yesterday) groups[1].items.push(it);
      else if (ts > week) groups[2].items.push(it);
      else if (ts > month) groups[3].items.push(it);
      else groups[4].items.push(it);
    }
    return groups.filter(g => g.items.length > 0);
  }, [editableGallery]);

  // ── Modo Básico — compose CSS filter from sliders + chosen preset ─
  function basicFilterCss(): string {
    const f = BASIC_FILTERS.find(x => x.id === basicFilterId)?.base || '';
    // warmth: -50..50 → hue-rotate -15..15deg
    const warmthDeg = (basicWarmth / 50) * -15;
    const slider = `brightness(${basicBrightness}%) contrast(${basicContrast}%) saturate(${basicSaturation}%) hue-rotate(${warmthDeg}deg)`;
    return f ? `${f} ${slider}` : slider;
  }

  function basicHasChanges(): boolean {
    return basicFilterId !== 'none'
      || basicBrightness !== 100
      || basicContrast !== 100
      || basicSaturation !== 100
      || basicWarmth !== 0;
  }

  function resetBasic() {
    setBasicFilterId('none');
    setBasicBrightness(100);
    setBasicContrast(100);
    setBasicSaturation(100);
    setBasicWarmth(0);
  }

  /**
   * Apply Modo Básico filters to the current base image via canvas. Free —
   * no API call, no credits. Returns the data URL of the rendered image.
   */
  async function applyBasicEdit(): Promise<string> {
    if (!baseUrl) throw new Error('No base image');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen base'));
      img.src = baseUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    // Apply CSS filter on the 2D context. Same syntax as the preview.
    (ctx as any).filter = basicFilterCss();
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  // ── Build prompt per tool ────────────────────────
  // Most tools use a single curated prose string for both NB2 + Seedream.
  // freeai is special: gets full JSON-for-NB2 + prose-for-Seedream treatment
  // via buildEditPromptPair (handles ES→EN translation + structure).
  function buildPrompt(): string | null {
    const def = activeToolDef;
    if (def.id === 'freeai') {
      // freeai is async-only via buildPromptPair below
      return freeaiText.trim() || null;
    }
    if (def.id === 'relight') {
      const p = RELIGHT_PRESETS.find(x => x.id === relightPresetId);
      const d = RELIGHT_DIRS.find(x => x.id === relightDirId);
      if (!p || !d) return null;
      return `LIGHTING REPLACEMENT (overrides preservation rule for lighting): ${d.prompt}. ${p.prompt}. Re-render shadows, highlights, color cast, and rim light to match. Keep identity, pose, expression, outfit, background composition unchanged — ONLY the lighting changes.`;
    }
    if (def.id === 'style') {
      const s = STYLE_PRESETS.find(x => x.id === styleId);
      if (!s) return null;
      return `STYLE TRANSFER (overrides preservation rule): Render this same subject, pose, composition in ${s.prompt}. The subject identity stays recognizable, but the entire image now adopts the new artistic style.`;
    }
    if (def.id === 'realskin') return buildRealSkinPrompt(realskinIntensity);
    if (def.id === 'enhance') return buildEnhancePrompt(enhanceIntensity);
    if (def.id === 'tryon') {
      return 'TRY-ON (overrides preservation rule for outfit): Replace the subject\'s outfit with the garment shown in Figure 2 (the reference image). Match the fit, fabric, color, and details of the reference garment realistically. Preserve identity, face, body proportions, pose, expression, hair, background, and lighting EXACTLY. Only the clothing changes.';
    }
    if (def.id === 'product') {
      const actionMap = {
        hold:  'naturally holding the product shown in Figure 2 with one hand',
        wear:  'wearing the product shown in Figure 2 (apply it to the appropriate body part)',
        use:   'using the product shown in Figure 2 in a natural editorial way',
        drink: 'holding the product shown in Figure 2 close to their face as if about to drink or eat from it',
      } as const;
      const action = actionMap[productUsage];
      return `PRODUCT PLACEMENT (overrides preservation rule for hands and arms): The subject in Figure 1 must appear ${action}. Match the product's exact color, branding, label, shape, scale, and material as shown in Figure 2. Render realistic finger contact, grip physics, contact shadows, and reflections. The hand and arm pose may change naturally to accommodate the product. Preserve identity, face, hair, body proportions, outfit, background, and lighting EXACTLY. The product must look photographed in the same scene as the subject.`;
    }
    if (def.id === 'faceswap') {
      return 'FACE SWAP (overrides preservation rule for face): Replace the subject\'s face with the face shown in Figure 2 (the reference image). Match the new face\'s features, skin tone, expression, and identity exactly. Keep the body, hair, outfit, pose, background, and lighting from the original Figure 1 unchanged.';
    }
    if (def.id === 'composite') {
      if (sceneMode === 'upload') {
        return 'SCENE REPLACEMENT (overrides preservation rule for background): Place the subject in the environment shown in Figure 2 (the reference scene). Match the lighting and color temperature of the new scene to integrate the subject naturally. Preserve identity, pose, expression, outfit, and body proportions exactly. Only the background and ambient lighting change.';
      }
      const s = SCENE_PRESETS.find(x => x.id === scenePresetId);
      if (!s) return null;
      return `SCENE REPLACEMENT (overrides preservation rule for background): Place the subject in this environment: ${s.prompt}. Match the lighting and color temperature naturally. Preserve identity, pose, expression, outfit, and body proportions exactly. Only the background and ambient lighting change.`;
    }
    if (def.id === 'rotate360') {
      const d = ROTATE_DIRECTIONS.find(x => x.id === rotateDirId);
      if (!d) return null;
      return `CAMERA ROTATION (overrides preservation rule for camera angle): ${d.prompt} Preserve subject identity, outfit, expression, hair, and the SAME location/background. Re-render the new viewpoint consistently with the original lighting.`;
    }
    if (def.id === 'expand') return null; // handled separately via Bria expand
    if (def.id === 'rembg') return null; // rembg is a separate service, no prompt
    return null;
  }

  /**
   * Returns the engine-specific prompt forms for the current tool.
   *   - nb2: what we ship to NB2 (JSON spec for freeai, flat prose otherwise)
   *   - fallback: what we ship to Seedream/Grok via editFallback (always prose)
   * For freeai we also auto-translate sensitive ES → EN so NB2 stops rejecting.
   */
  async function buildPromptPair(): Promise<{ nb2: string; fallback: string; translated: boolean } | null> {
    const def = activeToolDef;

    if (def.id === 'freeai') {
      const text = freeaiText.trim();
      if (!text) return null;
      const { buildEditPromptPair } = await import('../services/promptBuilder');
      const hasRef = !!freeaiRefFile;

      // Always build the mechanical pair as a safety net + flat fallback.
      const mechanicalPair = await buildEditPromptPair({
        userInstruction: hasRef
          ? `${text}\n\n(Figure 2 is a user-provided reference image — use it as visual context for the requested change.)`
          : text,
        taskKind: 'EDIT',
        preserve: [
          'identity (face, features, recognizability)',
          'body proportions',
          'background (unless instructed to change)',
          'lighting (unless instructed to change)',
          'composition (unless instructed to change)',
        ],
        numReferences: hasRef ? 1 : 0,
        physicalAnchor: linkedCharacter?.characteristics,
      });

      // Try Haiku adapter for a smarter NB2 JSON spec — it understands user
      // intent better than the mechanical builder (e.g. "playa" → tropical
      // beach + golden hour + bikini), sanitizes anchor anatomy, and applies
      // creative_direction intelligently. Falls back to the mechanical pair
      // silently if Haiku is down.
      try {
        const { adaptPromptForNB2Safe } = await import('../services/aiPromptAdapter');
        const { prompt: smartJson, adapted } = await adaptPromptForNB2Safe(text, {
          refCount: hasRef ? 1 : 0,
          characterAnchor: linkedCharacter?.characteristics,
          aspectRatio: '3:4',
          contentMode: profile?.contentMode,
        });
        if (adapted) {
          return { nb2: smartJson, fallback: mechanicalPair.flatProse, translated: mechanicalPair.wasTranslated };
        }
      } catch { /* fall through to mechanical */ }

      return { nb2: mechanicalPair.jsonSpec, fallback: mechanicalPair.flatProse, translated: mechanicalPair.wasTranslated };
    }

    // All other tools — curated English prose works for both engines.
    // We append the physical anchor inline so proportions/skin/face stay
    // consistent even when the user uses preset tools (relight, style, etc).
    // sanitizeAnchor strips multi-engine bloat from old-format characters —
    // without it the prompt can exceed Wan's limit and trigger a 3s reject.
    const flat = buildPrompt();
    if (!flat) return null;
    const { sanitizeAnchor } = await import('../services/promptBuilder');
    const anchor = sanitizeAnchor(linkedCharacter?.characteristics ?? '');
    const flatWithAnchor = anchor
      ? `${flat} The subject is described as: ${anchor}. These physical traits are absolute and override any reference ambiguity.`
      : flat;
    return { nb2: flatWithAnchor, fallback: flatWithAnchor, translated: false };
  }

  // ── Cost / label helpers per active tab ──────────
  function activeCost(): number {
    if (editorTab === 'basic') return 0;
    if (editorTab === 'effects') return EFFECT_COST;
    return activeToolDef.cost;
  }

  function activeLabel(): string {
    if (editorTab === 'basic') {
      const f = BASIC_FILTERS.find(x => x.id === basicFilterId);
      return basicHasChanges() ? `Aplicar · ${f?.label || 'Ajustes'}` : 'Sin cambios';
    }
    if (editorTab === 'effects') {
      const e = EFFECT_PRESETS.find(x => x.id === effectId);
      return e ? `Aplicar · ${e.label}` : 'Aplicar efecto';
    }
    return activeToolDef.label;
  }

  function activeDesc(): string {
    if (editorTab === 'basic') return 'Filtros y ajustes · gratis';
    if (editorTab === 'effects') return 'Presets film/cámara · IA';
    return activeToolDef.desc;
  }

  // ── Generate ─────────────────────────────────────
  async function runGenerate() {
    if (generating) return;
    if (!baseUrl) return toast.error('No hay imagen base');

    // ─── Modo Básico — client-side canvas, gratis, sin créditos ───
    if (editorTab === 'basic') {
      if (!basicHasChanges()) {
        toast.info('Ajusta un filtro o slider primero');
        return;
      }
      hapticMedium();
      setGenerating(true);
      setProgress(0);
      try {
        setProgress(40);
        const url = await applyBasicEdit();
        setProgress(95);
        setResultUrl(url);
        setHistory(prev => [url, ...prev].slice(0, 5));
        setSheetExpanded(false);
        // Save to gallery
        const filterLabel = BASIC_FILTERS.find(x => x.id === basicFilterId)?.label || 'Ajustes';
        addItems([{
          id: crypto.randomUUID(),
          url,
          prompt: `Editor Básico · ${filterLabel}`,
          model: 'canvas-css',
          timestamp: Date.now(),
          type: 'edit' as const,
          tags: ['editor', 'basic', basicFilterId],
          source: 'editor' as any,
        }]);
        hapticSuccess();
        toast.success('Aplicado');
      } catch (e: any) {
        console.error('Basic edit failed:', e);
        hapticError();
        toast.error(e?.message || 'No se pudo aplicar el filtro');
      } finally {
        setGenerating(false);
        setProgress(0);
      }
      return;
    }

    // ─── Modo Efectos — NB2 cascade with preset prompt, 6 cr ───
    if (editorTab === 'effects') {
      const eff = EFFECT_PRESETS.find(x => x.id === effectId);
      if (!eff) return toast.error('Elige un efecto primero');
      if (credits < EFFECT_COST) {
        toast.error(`Necesitas ${EFFECT_COST} créditos`);
        return;
      }
      // Continue with shared NB2 path below using eff.prompt
      hapticMedium();
      setGenerating(true);
      setProgress(0);
      abortRef.current = new AbortController();
      const ok = await decrementCredits(EFFECT_COST);
      if (!ok) { setGenerating(false); toast.error('No se pudieron reservar créditos'); return; }
      try {
        let file = baseFile;
        if (!file && baseUrl) {
          setProgress(8);
          file = await urlToFile(baseUrl, 'editor-base.png');
          setBaseFile(file);
        }
        if (!file) throw new Error('No base file');
        const { editWithNB2Fal, editWithNbProFal } = await import('../services/falService');
        const { editFallback } = await import('../services/editFallback');
        let resultUrls: string[] = [];
        try {
          // Premium tier on → NB Pro; off → NB2
          const primaryEdit = premiumTier ? editWithNbProFal : editWithNB2Fal;
          resultUrls = await primaryEdit(
            file, eff.prompt, [],
            p => setProgress(Math.min(80, 10 + Math.round(p * 0.7))),
            { resolution: '2K' },
            abortRef.current.signal,
          );
          if (!resultUrls || resultUrls.length === 0) throw new Error('Primary empty');
        } catch (nb2Err: any) {
          if (nb2Err?.name === 'AbortError') throw nb2Err;
          toast.info('Reintentando con motor alternativo…');
          resultUrls = await editFallback({
            baseImage: file,
            flatInstruction: eff.prompt,
            referenceImages: [],
            onProgress: p => setProgress(Math.min(85, 15 + Math.round(p * 0.7))),
            abortSignal: abortRef.current.signal,
            tier: premiumTier ? 'premium' : 'standard',
          });
          if (!resultUrls || resultUrls.length === 0) throw new Error('Ambos motores fallaron');
        }
        setProgress(92);
        try {
          const { watermarkIfFreeTier } = await import('../services/watermarkService');
          resultUrls[0] = await watermarkIfFreeTier(resultUrls[0], profile?.subscriptionPlan, profile?.subscriptionStatus);
        } catch { /* fail-open */ }
        const url = resultUrls[0];
        setProgress(100);
        setResultUrl(url);
        setHistory(prev => [url, ...prev].slice(0, 5));
        setSheetExpanded(false);
        addItems([{
          id: crypto.randomUUID(),
          url,
          prompt: `Editor Efecto · ${eff.label}`,
          model: 'nb2-effect',
          timestamp: Date.now(),
          type: 'edit' as const,
          tags: ['editor', 'effect', eff.id, eff.cat],
          source: 'editor' as any,
        }]);
        hapticSuccess();
        toast.success('Listo');
      } catch (e: any) {
        if (e?.name === 'AbortError' || /Cancelado/i.test(e?.message || '')) {
          toast.info('Generación cancelada');
        } else {
          console.error(e);
          hapticError();
          toast.error(e?.message || 'Error generando');
          try { await restoreCredits(EFFECT_COST); } catch { /* ignore */ }
        }
      } finally {
        setGenerating(false);
        setProgress(0);
        abortRef.current = null;
      }
      return;
    }

    // ─── Modo IA (default) — existing tool flow ───
    if (credits < activeToolDef.cost) {
      toast.error(`Necesitas ${activeToolDef.cost} créditos`);
      return;
    }

    // Per-tool ref validation
    if (activeToolDef.id === 'tryon' && !tryonRefFile) {
      toast.error('Sube una imagen de la prenda primero');
      return;
    }
    if (activeToolDef.id === 'product' && !productRefFile) {
      toast.error('Sube una foto del producto primero');
      return;
    }
    if (activeToolDef.id === 'faceswap' && !faceRefFile) {
      toast.error('Sube una imagen del rostro primero');
      return;
    }
    if (activeToolDef.id === 'composite' && sceneMode === 'upload' && !sceneRefFile) {
      toast.error('Sube una imagen de la escena o cambia a preset');
      return;
    }

    // Build engine-specific prompt forms (JSON for NB2, prose for fallback).
    // For freeai, this also translates sensitive ES → EN.
    const promptPair = await buildPromptPair();
    if (!promptPair && activeToolDef.id !== 'rembg' && activeToolDef.id !== 'expand') {
      toast.error('Completa los datos del tool primero');
      return;
    }
    if (promptPair?.translated) {
      toast.info('Traduciendo a inglés técnico para mejor calidad…');
    }

    hapticMedium();
    setGenerating(true);
    setProgress(0);
    abortRef.current = new AbortController();

    // Reserve credits
    const ok = await decrementCredits(activeToolDef.cost);
    if (!ok) {
      setGenerating(false);
      toast.error('No se pudieron reservar créditos');
      return;
    }

    try {
      // Lazy convert URL → File once
      let file = baseFile;
      if (!file && baseUrl) {
        setProgress(8);
        file = await urlToFile(baseUrl, 'editor-base.png');
        setBaseFile(file);
      }
      if (!file) throw new Error('No base file');

      let resultUrls: string[] = [];

      // Build per-tool reference array (multi-ref tools)
      const refs: File[] = [];
      if (activeToolDef.id === 'freeai' && freeaiRefFile) refs.push(freeaiRefFile);
      if (activeToolDef.id === 'tryon' && tryonRefFile) refs.push(tryonRefFile);
      if (activeToolDef.id === 'product' && productRefFile) refs.push(productRefFile);
      if (activeToolDef.id === 'faceswap' && faceRefFile) refs.push(faceRefFile);
      if (activeToolDef.id === 'composite' && sceneMode === 'upload' && sceneRefFile) refs.push(sceneRefFile);

      if (activeToolDef.id === 'rembg') {
        const { removeBackground } = await import('../services/falService');
        const out = await removeBackground(
          baseUrl,
          p => setProgress(Math.min(85, 10 + Math.round(p * 0.75))),
          abortRef.current.signal,
        );
        resultUrls = [out];
      } else if (activeToolDef.id === 'expand') {
        // Outpaint via Replicate Bria — single image, direction + pixels
        const { expandWithBria } = await import('../services/replicateService');
        const out = await expandWithBria(
          baseUrl,
          expandDir,
          expandPixels,
          p => setProgress(Math.min(85, 10 + Math.round(p * 0.75))),
          abortRef.current.signal,
        );
        resultUrls = [out];
      } else {
        // NB2/NB Pro first → fallback to Flux 2 Pro/Max via editFallback
        const { editWithNB2Fal, editWithNbProFal } = await import('../services/falService');
        const { editFallback } = await import('../services/editFallback');

        try {
          // Premium tier routes to NB Pro instead of NB2
          const primaryEdit = premiumTier ? editWithNbProFal : editWithNB2Fal;
          resultUrls = await primaryEdit(
            file,
            promptPair!.nb2,
            refs,
            p => setProgress(Math.min(80, 10 + Math.round(p * 0.7))),
            { resolution: '2K' },
            abortRef.current.signal,
          );
          if (!resultUrls || resultUrls.length === 0) throw new Error('Primary empty');
        } catch (nb2Err: any) {
          if (nb2Err?.name === 'AbortError') throw nb2Err;
          console.warn('Primary rejected, fallback:', nb2Err?.message);
          toast.info('Reintentando con motor alternativo…');
          resultUrls = await editFallback({
            baseImage: file,
            flatInstruction: promptPair!.fallback,
            referenceImages: refs,
            tier: premiumTier ? 'premium' : 'standard',
            onProgress: p => setProgress(Math.min(85, 15 + Math.round(p * 0.7))),
            abortSignal: abortRef.current.signal,
          });
          if (!resultUrls || resultUrls.length === 0) throw new Error('Ambos motores fallaron');
        }
      }

      setProgress(92);

      // Watermark for free tier
      try {
        const { watermarkIfFreeTier } = await import('../services/watermarkService');
        resultUrls[0] = await watermarkIfFreeTier(
          resultUrls[0],
          profile?.subscriptionPlan,
          profile?.subscriptionStatus,
        );
      } catch { /* fail-open */ }

      const url = resultUrls[0];
      setProgress(100);
      setResultUrl(url);
      // Push to history stack (most-recent first; cap at 5)
      setHistory(prev => [url, ...prev].slice(0, 5));
      // Auto-collapse sheet so user sees the result
      setSheetExpanded(false);

      // Save to gallery
      addItems([{
        id: crypto.randomUUID(),
        url,
        prompt: `Editor · ${activeToolDef.label}` + (activeToolDef.id === 'freeai' ? ` · ${freeaiText.slice(0, 60)}` : ''),
        model: 'mobile-editor',
        timestamp: Date.now(),
        type: 'edit' as const,
        tags: ['editor', activeToolDef.id],
        source: 'editor' as any,
      }]);

      hapticSuccess();
      toast.success('Listo');
    } catch (e: any) {
      if (e?.name === 'AbortError' || /Cancelado/i.test(e?.message || '')) {
        toast.info('Generación cancelada');
      } else {
        console.error(e);
        hapticError();
        toast.error(e?.message || 'Error generando');
        // restore credits on real failure
        try { await restoreCredits(activeToolDef.cost); } catch { /* ignore */ }
      }
    } finally {
      setGenerating(false);
      setProgress(0);
      abortRef.current = null;
    }
  }

  function cancelGenerate() {
    abortRef.current?.abort();
  }

  // ── Result actions ───────────────────────────────
  function continueEditing() {
    if (!resultUrl) return;
    hapticLight();
    // Use the result as the new base for the next edit
    setBaseUrl(resultUrl);
    setBaseFile(null); // re-convert on next gen
    setResultUrl(null);
  }

  function discardResult() {
    if (!resultUrl) return;
    hapticLight();
    // Drop current result back to the previous step
    setHistory(prev => prev.slice(1));
    const prev = history[1] ?? null;
    setResultUrl(prev); // null = back to baseUrl
  }

  function revertTo(idx: number) {
    // idx is position in history (0 = newest). Move that to top of stack
    // and treat as current result. baseUrl stays as the original starting
    // image so long-press compare still works.
    if (idx < 0 || idx >= history.length) return;
    hapticMedium();
    const target = history[idx];
    setResultUrl(target);
    setHistory(prev => [target, ...prev.filter((_, i) => i !== idx)].slice(0, 5));
  }

  async function downloadResult() {
    if (!resultUrl) return;
    hapticLight();
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vist-edit-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('No se pudo descargar');
    }
  }

  // ── Compare logic ────────────────────────────────
  // Two paths to comparing the original (baseUrl) vs the result (resultUrl):
  //   1) Long-press the canvas (~350ms) → hold to compare, release to exit.
  //   2) Tap the floating "Comparar" pill → toggles compare mode (sticky).
  // Both images are stacked in DOM, we just fade the result on/off → no
  // re-download, no flash, instant snap.
  const compareTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);
  function onCanvasPressStart() {
    if (!resultUrl) return;
    longPressedRef.current = false;
    if (compareTimerRef.current) window.clearTimeout(compareTimerRef.current);
    compareTimerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      hapticLight();
      setComparing(true);
    }, 350); // iOS link-preview convention is ~400ms — 350 feels responsive without misfiring during normal taps/scrolls.
  }
  function onCanvasPressEnd() {
    if (compareTimerRef.current) {
      window.clearTimeout(compareTimerRef.current);
      compareTimerRef.current = null;
    }
    // If long-press fired, releasing exits compare. If it didn't fire (short
    // tap), leave comparing state alone — the toggle pill controls that path.
    if (longPressedRef.current) {
      longPressedRef.current = false;
      setComparing(false);
    }
  }
  function toggleCompare() {
    if (!resultUrl) return;
    hapticLight();
    setComparing(c => !c);
  }

  // ─── Source pick screen ──────────────────────────
  if (mode === 'pick-source') {
    return (
      <div className="me-shell">
        <style>{EDITOR_STYLES}</style>
        <input ref={upload.fileInputRef} type="file" accept="image/*" hidden onChange={upload.handleFileChange} />

        <div className="me-topbar">
          <button className="me-back" onClick={() => onNav('home' as Page)} aria-label="Volver">
            <ChevronLeft size={18} />
          </button>
          <div className="me-title">Editor IA</div>
          <div className="me-credits">
            <span className="me-credits-dot" />
            {credits}
          </div>
        </div>

        <div className="me-pick-body">
          <div className="me-pick-eyebrow">Elige una foto</div>
          <h1 className="me-pick-title">¿Qué quieres <em>editar</em>?</h1>
          <p className="me-pick-sub">Una foto generada o una desde tu cámara/galería del teléfono.</p>

          {/* Shortcut: edit the most recent gallery item */}
          {editableGallery[0] && (
            <button
              className="me-pick-recent"
              onClick={() => pickFromGallery(editableGallery[0])}
              disabled={!!pickingId}
            >
              <div
                className="me-pick-recent-thumb"
                style={{ backgroundImage: `url(${editableGallery[0].url})` }}
              />
              <div className="me-pick-recent-text">
                <span className="me-pick-recent-eyebrow">Atajo</span>
                <strong>Editar la última</strong>
                <small>Tu foto más reciente</small>
              </div>
              {pickingId === editableGallery[0].id && <Loader size={16} className="me-spin" />}
            </button>
          )}

          <button className="me-pick-card me-pick-primary" onClick={() => { hapticMedium(); upload.openUploadPicker(); }}>
            <Camera size={22} />
            <div>
              <strong>Subir desde tu teléfono</strong>
              <small>Cámara o galería</small>
            </div>
          </button>

          <button className="me-pick-card" onClick={() => { hapticLight(); setMode('gallery-pick'); }}>
            <ImageIcon size={22} />
            <div>
              <strong>Elegir de mi galería</strong>
              <small>{editableGallery.length} foto{editableGallery.length === 1 ? '' : 's'} disponibles</small>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ─── Gallery pick screen ─────────────────────────
  if (mode === 'gallery-pick') {
    if (editableGallery.length === 0) {
      return (
        <div className="me-shell">
          <style>{EDITOR_STYLES}</style>
          <div className="me-topbar">
            <button className="me-back" onClick={() => setMode('pick-source')} aria-label="Volver">
              <ChevronLeft size={18} />
            </button>
            <div className="me-title">Galería</div>
            <div style={{ width: 32 }} />
          </div>
          <div className="me-empty">
            <p>Aún no tienes fotos en la galería.</p>
            <button className="me-empty-cta" onClick={() => onNav('headshot' as Page)}>Generar la primera</button>
          </div>
        </div>
      );
    }
    return (
      <div className="me-shell">
        <style>{EDITOR_STYLES}</style>
        <div className="me-topbar">
          <button className="me-back" onClick={() => setMode('pick-source')} aria-label="Volver">
            <ChevronLeft size={18} />
          </button>
          <div className="me-title">Elige una foto</div>
          <div style={{ width: 32 }} />
        </div>
        <div className="me-gallery-wrap">
          {grouped.map(group => (
            <section key={group.label} className="me-gallery-section">
              <h3 className="me-gallery-section-title">
                {group.label} <span>· {group.items.length}</span>
              </h3>
              <div className="me-gallery-grid">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    className={`me-gallery-cell ${pickingId === item.id ? 'is-loading' : ''}`}
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
                      <div className="me-gallery-cell-loading">
                        <Loader size={18} className="me-spin" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  // ─── Editing screen ──────────────────────────────
  const ActiveIcon = activeToolDef.icon;
  return (
    <div className={`me-shell me-shell-edit ${sheetExpanded ? 'is-sheet-up' : ''}`}>
      <style>{EDITOR_STYLES}</style>

      {/* Top bar (floating, transparent over canvas) */}
      <div className="me-topbar me-topbar-floating">
        <button
          className="me-back"
          onClick={() => {
            hapticLight();
            if (generating) cancelGenerate();
            setResultUrl(null);
            setHistory([]);
            setMode('pick-source');
            setBaseUrl(null);
            setBaseFile(null);
            setSheetExpanded(false);
          }}
          aria-label="Volver"
        >
          <ChevronLeft size={18} />
        </button>
        <HeroProSwitch
          active={premiumTier}
          disabled={generating}
          onChange={setPremiumTier}
          extraCost={HERO_PRO_EXTRA_COST}
          mood={{
            ...ATELIER_MOOD,
            ink2: 'rgba(245, 235, 219, 0.78)',
            line: 'rgba(245, 235, 219, 0.22)',
            bgCard: '#F5EBDB',
          }}
        />
        <div className="me-credits">
          <span className="me-credits-dot" />
          {credits}
        </div>
      </div>

      {/* Character anchor chip — shows when linked to a saved character.
          User can detach to edit free-hand if the anchor is hurting (rare). */}
      {linkedCharacter && (
        <div className="me-anchor-chip">
          <span className="me-anchor-dot" />
          <span className="me-anchor-text">
            Vinculado a <strong>{linkedCharacter.name}</strong>
          </span>
          <button
            className="me-anchor-detach"
            onClick={() => { hapticLight(); setLinkedCharacterId(null); }}
            aria-label="Desvincular"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Canvas — long-press to compare */}
      <div
        className="me-canvas"
        onTouchStart={onCanvasPressStart}
        onTouchEnd={onCanvasPressEnd}
        onTouchCancel={onCanvasPressEnd}
        onMouseDown={onCanvasPressStart}
        onMouseUp={onCanvasPressEnd}
        onMouseLeave={onCanvasPressEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Both images are stacked — toggling 'comparing' fades the result.
            This avoids re-downloading on every toggle and gives instant snap.
            Live preview: when on Básico tab + no result yet, apply CSS filter
            on the base image directly so user sees changes in real time. */}
        {baseUrl && (
          <img
            src={baseUrl}
            alt="original"
            className="me-img me-img-base"
            draggable={false}
            style={
              editorTab === 'basic' && !resultUrl && !comparing
                ? { filter: basicFilterCss() }
                : undefined
            }
          />
        )}
        {resultUrl && (
          <img
            src={resultUrl}
            alt="resultado"
            className={`me-img me-img-result ${comparing ? 'is-hidden' : ''}`}
            draggable={false}
          />
        )}

        {/* Compare segmented control — top-center, two clear options */}
        {resultUrl && !generating && (
          <div className="me-compare-seg" role="tablist" aria-label="Comparar versiones">
            <button
              role="tab"
              aria-selected={comparing}
              className={`me-compare-seg-btn ${comparing ? 'is-on' : ''}`}
              onClick={() => { hapticLight(); setComparing(true); }}
            >
              Antes
            </button>
            <button
              role="tab"
              aria-selected={!comparing}
              className={`me-compare-seg-btn ${!comparing ? 'is-on' : ''}`}
              onClick={() => { hapticLight(); setComparing(false); }}
            >
              Después
            </button>
          </div>
        )}

        {/* Result actions overlay (top-right) */}
        {resultUrl && !generating && (
          <div className="me-result-overlay">
            <button className="me-overlay-btn" onClick={discardResult} aria-label="Descartar resultado">
              <X size={16} />
            </button>
            <button className="me-overlay-btn" onClick={continueEditing} aria-label="Usar como base">
              <Sparkles size={14} />
            </button>
            <button className="me-overlay-btn" onClick={downloadResult} aria-label="Descargar">
              <Download size={14} />
            </button>
          </div>
        )}

        {/* Generating overlay */}
        {generating && (
          <div className="me-loading">
            <Loader size={28} className="me-spin" />
            <div className="me-loading-text">{progress}%</div>
            <div className="me-loading-tool">{activeToolDef.label}</div>
            <button className="me-loading-cancel" onClick={cancelGenerate}>Cancelar</button>
          </div>
        )}
      </div>

      {/* History strip — between canvas and sheet (only when 2+ entries) */}
      {history.length >= 2 && !generating && (
        <div className="me-history">
          <span className="me-history-label"><RotateCcw size={11} /> Versiones</span>
          {history.map((url, i) => (
            <button
              key={`${url}-${i}`}
              className={`me-history-thumb ${url === resultUrl ? 'is-current' : ''}`}
              onClick={() => revertTo(i)}
              aria-label={`Versión ${history.length - i}`}
            >
              <img src={url} alt="" />
              {url === resultUrl && <span className="me-history-dot" />}
            </button>
          ))}
        </div>
      )}

      {/* Bottom sheet — drag handle + compact row + expanded body */}
      <div className={`me-sheet ${sheetExpanded ? 'is-expanded' : ''}`}>
        <button
          className="me-sheet-handle"
          onClick={() => { hapticLight(); setSheetExpanded(s => !s); }}
          aria-label={sheetExpanded ? 'Cerrar herramientas' : 'Abrir herramientas'}
        >
          <span className="me-sheet-grip" />
        </button>

        {/* Compact row — always visible */}
        <div className="me-sheet-compact">
          <button
            className="me-sheet-tool"
            onClick={() => { hapticLight(); setSheetExpanded(s => !s); }}
            aria-label="Cambiar herramienta"
          >
            {editorTab === 'basic' && <Sliders size={18} />}
            {editorTab === 'effects' && <Film size={18} />}
            {editorTab === 'ai' && <ActiveIcon size={18} />}
            <div className="me-sheet-tool-text">
              <strong>{activeLabel()}</strong>
              <small>{activeCost() === 0 ? 'Gratis' : `${activeCost()} cr`} · {activeDesc()}</small>
            </div>
            <ChevronUp size={14} className={`me-sheet-chevron ${sheetExpanded ? 'is-flipped' : ''}`} />
          </button>
          <button
            className="me-sheet-go"
            onClick={runGenerate}
            disabled={
              generating
              || (editorTab === 'ai' && credits < activeToolDef.cost)
              || (editorTab === 'effects' && credits < EFFECT_COST)
              || (editorTab === 'ai' && activeTool === 'freeai' && !freeaiText.trim())
              || (editorTab === 'basic' && !basicHasChanges())
            }
            aria-label="Aplicar"
          >
            {generating ? <Loader size={18} className="me-spin" /> : <ArrowUp size={18} />}
          </button>
        </div>

        {/* Expanded body — top tabs + tab-specific controls */}
        {sheetExpanded && (
          <div className="me-sheet-body">
            {/* Top tabs: Básico / Efectos / IA */}
            <div className="me-tabs" role="tablist" aria-label="Modo de edición">
              {([
                { id: 'basic',   label: 'Básico',  hint: 'Gratis' },
                { id: 'effects', label: 'Efectos', hint: '6 cr' },
                { id: 'ai',      label: 'IA',      hint: '6-13 cr' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={editorTab === t.id}
                  className={`me-tab ${editorTab === t.id ? 'is-on' : ''}`}
                  onClick={() => { hapticLight(); setEditorTab(t.id); }}
                >
                  <span className="me-tab-label">{t.label}</span>
                  <span className="me-tab-hint">{t.hint}</span>
                </button>
              ))}
            </div>

            {/* ─── Modo Básico ─── */}
            {editorTab === 'basic' && (
              <>
                <label className="me-label">Filtro</label>
                <div className="me-filter-row">
                  {BASIC_FILTERS.map(f => {
                    const previewCss = f.id === 'none' ? 'none' : f.base;
                    return (
                      <button
                        key={f.id}
                        className={`me-filter-card ${basicFilterId === f.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setBasicFilterId(f.id); }}
                      >
                        <div className="me-filter-thumb">
                          {baseUrl && <img src={baseUrl} alt="" style={{ filter: previewCss }} draggable={false} />}
                        </div>
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="me-slider-row">
                  <label className="me-slider">
                    <span><Sun size={11} /> Brillo</span>
                    <input
                      type="range" min={70} max={140} step={1}
                      value={basicBrightness}
                      onChange={e => setBasicBrightness(Number(e.target.value))}
                    />
                    <em>{basicBrightness}%</em>
                  </label>
                  <label className="me-slider">
                    <span><Aperture size={11} /> Contraste</span>
                    <input
                      type="range" min={70} max={140} step={1}
                      value={basicContrast}
                      onChange={e => setBasicContrast(Number(e.target.value))}
                    />
                    <em>{basicContrast}%</em>
                  </label>
                  <label className="me-slider">
                    <span><Palette size={11} /> Saturación</span>
                    <input
                      type="range" min={0} max={180} step={1}
                      value={basicSaturation}
                      onChange={e => setBasicSaturation(Number(e.target.value))}
                    />
                    <em>{basicSaturation}%</em>
                  </label>
                  <label className="me-slider">
                    <span><Wand2 size={11} /> Calidez</span>
                    <input
                      type="range" min={-50} max={50} step={1}
                      value={basicWarmth}
                      onChange={e => setBasicWarmth(Number(e.target.value))}
                    />
                    <em>{basicWarmth > 0 ? `+${basicWarmth}` : basicWarmth}</em>
                  </label>
                </div>

                {basicHasChanges() && (
                  <button className="me-reset" onClick={() => { hapticLight(); resetBasic(); }}>
                    <RotateCcw size={12} /> Restablecer ajustes
                  </button>
                )}

                <p className="me-hint">100% local. No usa créditos. Aplica cuantas veces quieras y compara en el canvas.</p>
              </>
            )}

            {/* ─── Modo Efectos ─── */}
            {editorTab === 'effects' && (
              <>
                <div className="me-effect-cats">
                  {EFFECT_CATS.map(c => (
                    <button
                      key={c.id}
                      className={`me-effect-cat ${effectCat === c.id ? 'is-on' : ''}`}
                      onClick={() => { hapticLight(); setEffectCat(c.id); }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="me-effect-grid">
                  {EFFECT_PRESETS
                    .filter(e => effectCat === 'all' || e.cat === effectCat)
                    .map(e => (
                      <button
                        key={e.id}
                        className={`me-effect-card ${effectId === e.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setEffectId(e.id); }}
                      >
                        <span className="me-effect-emoji">{e.emoji}</span>
                        <span className="me-effect-label">{e.label}</span>
                      </button>
                    ))}
                </div>
                <p className="me-hint">Cada efecto re-renderiza la foto con NB2. {EFFECT_COST} cr por aplicación. Mantienen identidad y composición.</p>
              </>
            )}

            {/* ─── Modo IA ─── */}
            {editorTab === 'ai' && (<>
            {/* Tool grid (3-col) */}
            <div className="me-sheet-grid">
              {TOOLS.map(t => {
                const Icon = t.icon;
                const isActive = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    className={`me-sheet-tool-card ${isActive ? 'is-on' : ''}`}
                    onClick={() => { hapticLight(); setActiveTool(t.id); }}
                  >
                    <div className="me-sheet-tool-icon"><Icon size={20} /></div>
                    <span className="me-sheet-tool-label">{t.label}</span>
                    <span className="me-sheet-tool-cost">{t.cost} cr</span>
                  </button>
                );
              })}
            </div>

            {/* Per-tool controls */}
            <div className="me-sheet-controls">
              {activeTool === 'freeai' && (
                <>
                  <label className="me-label">Di qué quieres cambiar</label>
                  <textarea
                    className="me-textarea"
                    value={freeaiText}
                    onChange={e => setFreeaiText(e.target.value)}
                    placeholder="Ej: ponela en una playa al atardecer · cambiale el cabello a rubio · sumale lentes de sol..."
                    rows={4}
                    maxLength={300}
                    enterKeyHint="send"
                    inputMode="text"
                  />
                  <div className="me-textarea-counter">{freeaiText.length} / 300</div>
                  <input ref={freeaiRefInputRef} type="file" accept="image/*" hidden
                         onChange={e => handleRefUpload(e, setFreeaiRefFile, setFreeaiRefUrl)} />
                  {freeaiRefUrl ? (
                    <div className="me-ref-card" style={{ marginTop: 10 }}>
                      <img src={freeaiRefUrl} alt="referencia" />
                      <div className="me-ref-meta">
                        <strong>Referencia adjunta</strong>
                        <small>El modelo va a usarla como contexto visual</small>
                      </div>
                      <button className="me-ref-clear" onClick={() => { setFreeaiRefFile(null); setFreeaiRefUrl(null); hapticLight(); }} aria-label="Quitar">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="me-ref-upload me-ref-upload-thin"
                      onClick={() => { hapticLight(); freeaiRefInputRef.current?.click(); }}
                      style={{ marginTop: 10 }}
                    >
                      <Paperclip size={14} />
                      <div>
                        <strong>Adjuntar foto (opcional)</strong>
                        <small>Producto, locación, mood, lo que sea</small>
                      </div>
                    </button>
                  )}
                </>
              )}

              {activeTool === 'relight' && (
                <>
                  <label className="me-label">Estilo de luz</label>
                  <div className="me-chips">
                    {RELIGHT_PRESETS.map(p => (
                      <button
                        key={p.id}
                        className={`me-chip ${relightPresetId === p.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setRelightPresetId(p.id); }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <label className="me-label" style={{ marginTop: 10 }}>Dirección</label>
                  <div className="me-chips">
                    {RELIGHT_DIRS.map(d => (
                      <button
                        key={d.id}
                        className={`me-chip ${relightDirId === d.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setRelightDirId(d.id); }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeTool === 'style' && (
                <>
                  <label className="me-label">Estilo artístico</label>
                  <div className="me-chips">
                    {STYLE_PRESETS.map(s => (
                      <button
                        key={s.id}
                        className={`me-chip ${styleId === s.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setStyleId(s.id); }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeTool === 'realskin' && (
                <>
                  <div className="me-slider-row">
                    <label className="me-label">Intensidad de realismo</label>
                    <span className="me-slider-value">{realskinIntensity}%</span>
                  </div>
                  <div className="me-realskin">
                    <div className="me-realskin-row">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={realskinIntensity}
                        onChange={e => setRealskinIntensity(Number(e.target.value))}
                        className="me-realskin-range"
                      />
                      <span className="me-realskin-value">{realSkinLabel(realskinIntensity)}</span>
                    </div>
                    <div className="me-realskin-stops">
                      <button
                        className={realskinIntensity < 34 ? 'is-on' : ''}
                        onClick={() => { hapticLight(); setRealskinIntensity(20); }}
                      >Sutil</button>
                      <button
                        className={realskinIntensity >= 34 && realskinIntensity < 67 ? 'is-on' : ''}
                        onClick={() => { hapticLight(); setRealskinIntensity(50); }}
                      >Natural</button>
                      <button
                        className={realskinIntensity >= 67 ? 'is-on' : ''}
                        onClick={() => { hapticLight(); setRealskinIntensity(85); }}
                      >Intenso</button>
                    </div>
                  </div>
                  <p className="me-hint">
                    {realskinIntensity < 34 && 'Hint de poros sin perder el pulido. Ideal cuando solo quieres sacar el efecto plástico.'}
                    {realskinIntensity >= 34 && realskinIntensity < 67 && 'Documentary look balanceado: poros visibles, micro-pecas, variación natural. La opción más usada.'}
                    {realskinIntensity >= 67 && 'Close-up de revista: cada poro, peach fuzz, brillo natural en T-zone. Para retratos crudos.'}
                  </p>
                </>
              )}

              {activeTool === 'enhance' && (
                <>
                  <div className="me-slider-row">
                    <label className="me-label">Nivel de retoque</label>
                    <span className="me-slider-value">{enhanceIntensity}%</span>
                  </div>
                  <div className="me-realskin">
                    <div className="me-realskin-row">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={enhanceIntensity}
                        onChange={e => setEnhanceIntensity(Number(e.target.value))}
                        className="me-realskin-range"
                      />
                      <span className="me-realskin-value">{enhanceLabel(enhanceIntensity)}</span>
                    </div>
                    <div className="me-realskin-stops">
                      <button
                        className={enhanceIntensity < 34 ? 'is-on' : ''}
                        onClick={() => { hapticLight(); setEnhanceIntensity(20); }}
                      >Suave</button>
                      <button
                        className={enhanceIntensity >= 34 && enhanceIntensity < 67 ? 'is-on' : ''}
                        onClick={() => { hapticLight(); setEnhanceIntensity(50); }}
                      >Editorial</button>
                      <button
                        className={enhanceIntensity >= 67 ? 'is-on' : ''}
                        onClick={() => { hapticLight(); setEnhanceIntensity(85); }}
                      >Glossy</button>
                    </div>
                  </div>
                  <p className="me-hint">
                    {enhanceIntensity < 34 && 'Limpieza ligera: solo lo más obvio. Conserva textura natural y poros visibles.'}
                    {enhanceIntensity >= 34 && enhanceIntensity < 67 && 'Retoque editorial balanceado: piel uniforme, ojos vivos, sin perder naturalidad. Estilo revista de moda.'}
                    {enhanceIntensity >= 67 && 'Acabado high-gloss tipo portada: piel perfecta, ojos brillantes, dientes blancos. Para covers y campañas.'}
                  </p>
                </>
              )}

              {activeTool === 'tryon' && (
                <>
                  <input ref={tryonInputRef} type="file" accept="image/*" hidden
                         onChange={e => handleRefUpload(e, setTryonRefFile, setTryonRefUrl)} />
                  <label className="me-label">Prenda o accesorio</label>
                  {tryonRefUrl ? (
                    <div className="me-ref-card">
                      <img src={tryonRefUrl} alt="prenda" />
                      <div className="me-ref-meta">
                        <strong>Lista</strong>
                        <small>NB2 va a vestir al sujeto con esta prenda</small>
                      </div>
                      <button className="me-ref-clear" onClick={() => { setTryonRefFile(null); setTryonRefUrl(null); hapticLight(); }} aria-label="Quitar">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button className="me-ref-upload" onClick={() => { hapticLight(); tryonInputRef.current?.click(); }}>
                      <Plus size={18} />
                      <div>
                        <strong>Subir prenda</strong>
                        <small>JPG/PNG/WEBP — máx 12 MB</small>
                      </div>
                    </button>
                  )}
                  <p className="me-hint">Funciona mejor con la prenda fotografiada plana o sobre maniquí, fondo neutro.</p>
                </>
              )}

              {activeTool === 'product' && (
                <>
                  <input ref={productInputRef} type="file" accept="image/*" hidden
                         onChange={e => handleRefUpload(e, setProductRefFile, setProductRefUrl)} />
                  <label className="me-label">Cómo se usa</label>
                  <div className="me-chips">
                    {[
                      { id: 'hold',  label: 'Sostener' },
                      { id: 'drink', label: 'Tomar / Comer' },
                      { id: 'use',   label: 'Usar' },
                      { id: 'wear',  label: 'Llevar puesto' },
                    ].map(o => (
                      <button
                        key={o.id}
                        className={`me-chip ${productUsage === o.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setProductUsage(o.id as typeof productUsage); }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <label className="me-label" style={{ marginTop: 10 }}>Foto del producto</label>
                  {productRefUrl ? (
                    <div className="me-ref-card">
                      <img src={productRefUrl} alt="producto" />
                      <div className="me-ref-meta">
                        <strong>Lista</strong>
                        <small>El modelo va a {productUsage === 'hold' ? 'sostenerlo' : productUsage === 'drink' ? 'usarlo cerca de su cara' : productUsage === 'wear' ? 'llevarlo puesto' : 'usarlo'}</small>
                      </div>
                      <button className="me-ref-clear" onClick={() => { setProductRefFile(null); setProductRefUrl(null); hapticLight(); }} aria-label="Quitar">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button className="me-ref-upload" onClick={() => { hapticLight(); productInputRef.current?.click(); }}>
                      <Plus size={18} />
                      <div>
                        <strong>Subir producto</strong>
                        <small>Bebida, snack, gadget, marca · fondo neutro</small>
                      </div>
                    </button>
                  )}
                  <p className="me-hint">Funciona mejor con el producto fotografiado solo, sin gente, fondo limpio. La marca y la etiqueta se conservan.</p>
                </>
              )}

              {activeTool === 'faceswap' && (
                <>
                  <input ref={faceInputRef} type="file" accept="image/*" hidden
                         onChange={e => handleRefUpload(e, setFaceRefFile, setFaceRefUrl)} />
                  <label className="me-label">Rostro de referencia</label>
                  {faceRefUrl ? (
                    <div className="me-ref-card">
                      <img src={faceRefUrl} alt="rostro" />
                      <div className="me-ref-meta">
                        <strong>Lista</strong>
                        <small>El rostro de tu sujeto se va a reemplazar</small>
                      </div>
                      <button className="me-ref-clear" onClick={() => { setFaceRefFile(null); setFaceRefUrl(null); hapticLight(); }} aria-label="Quitar">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button className="me-ref-upload" onClick={() => { hapticLight(); faceInputRef.current?.click(); }}>
                      <Plus size={18} />
                      <div>
                        <strong>Subir rostro</strong>
                        <small>Foto frontal nítida funciona mejor</small>
                      </div>
                    </button>
                  )}
                  <p className="me-hint">Mantiene el cuerpo, ropa, pose y fondo originales. Solo cambia el rostro.</p>
                </>
              )}

              {activeTool === 'composite' && (
                <>
                  <input ref={sceneInputRef} type="file" accept="image/*" hidden
                         onChange={e => handleRefUpload(e, setSceneRefFile, setSceneRefUrl)} />
                  <div className="me-seg" role="tablist" aria-label="Modo escena">
                    <button
                      role="tab"
                      aria-selected={sceneMode === 'preset'}
                      className={`me-seg-btn ${sceneMode === 'preset' ? 'is-on' : ''}`}
                      onClick={() => { hapticLight(); setSceneMode('preset'); }}
                    >Preset</button>
                    <button
                      role="tab"
                      aria-selected={sceneMode === 'upload'}
                      className={`me-seg-btn ${sceneMode === 'upload' ? 'is-on' : ''}`}
                      onClick={() => { hapticLight(); setSceneMode('upload'); }}
                    >Subir foto</button>
                  </div>
                  {sceneMode === 'preset' ? (
                    <>
                      <label className="me-label">Escena</label>
                      <div className="me-chips">
                        {SCENE_PRESETS.map(s => (
                          <button
                            key={s.id}
                            className={`me-chip ${scenePresetId === s.id ? 'is-on' : ''}`}
                            onClick={() => { hapticLight(); setScenePresetId(s.id); }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    sceneRefUrl ? (
                      <div className="me-ref-card">
                        <img src={sceneRefUrl} alt="escena" />
                        <div className="me-ref-meta">
                          <strong>Lista</strong>
                          <small>El sujeto se integra en esta escena</small>
                        </div>
                        <button className="me-ref-clear" onClick={() => { setSceneRefFile(null); setSceneRefUrl(null); hapticLight(); }} aria-label="Quitar">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button className="me-ref-upload" onClick={() => { hapticLight(); sceneInputRef.current?.click(); }}>
                        <Plus size={18} />
                        <div>
                          <strong>Subir escena</strong>
                          <small>JPG/PNG/WEBP — máx 12 MB</small>
                        </div>
                      </button>
                    )
                  )}
                  <p className="me-hint">Cambia el fondo manteniendo identidad, pose y outfit.</p>
                </>
              )}

              {activeTool === 'rotate360' && (
                <>
                  <label className="me-label">Cambio de ángulo</label>
                  <div className="me-chips">
                    {ROTATE_DIRECTIONS.map(d => (
                      <button
                        key={d.id}
                        className={`me-chip ${rotateDirId === d.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setRotateDirId(d.id); }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="me-hint">Rota la cámara alrededor del sujeto. Mejor para personas o objetos centrales.</p>
                </>
              )}

              {activeTool === 'expand' && (
                <>
                  <label className="me-label">Dirección</label>
                  <div className="me-chips">
                    {EXPAND_DIRECTIONS.map(d => (
                      <button
                        key={d.id}
                        className={`me-chip ${expandDir === d.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setExpandDir(d.id); }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <label className="me-label" style={{ marginTop: 10 }}>Cantidad</label>
                  <div className="me-chips">
                    {EXPAND_PIXELS.map(p => (
                      <button
                        key={p.id}
                        className={`me-chip ${expandPixels === p.id ? 'is-on' : ''}`}
                        onClick={() => { hapticLight(); setExpandPixels(p.id); }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="me-hint">Extiende los bordes con outpainting. Útil para reformatear de cuadrado a 9:16 o sumar contexto.</p>
                </>
              )}

              {activeTool === 'rembg' && (
                <p className="me-hint">Quita el fondo y deja la silueta sobre transparente. Útil para subir a IG con fondo custom o exportar PNG.</p>
              )}

              {resultUrl && (
                <p className="me-tip-inline">
                  Tap "Antes / Después" arriba para comparar versiones.
                </p>
              )}
            </div>
            </>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────

const EDITOR_STYLES = `
.me-shell {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: ${ATELIER_MOOD.bg0};
  color: ${ATELIER_MOOD.ink0};
  font-family: 'DM Sans', -apple-system, system-ui, sans-serif;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}
.me-shell-edit { background: #0E0B07; color: #F5EBDB; }

.me-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  flex-shrink: 0;
}
.me-topbar-floating {
  position: absolute; top: env(safe-area-inset-top); left: 0; right: 0;
  z-index: 5;
  background: linear-gradient(180deg, rgba(14,11,7,0.55) 0%, rgba(14,11,7,0) 100%);
}
.me-back, .me-credits {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  padding: 12px 14px;
  min-height: 44px;
  border-radius: 999px;
  background: rgba(31,26,20,0.06);
  border: none;
  color: ${ATELIER_MOOD.ink1};
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px; font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.me-shell-edit .me-back, .me-shell-edit .me-credits {
  background: rgba(245,235,219,0.10);
  color: #F5EBDB;
  backdrop-filter: blur(12px);
}
.me-back:active { transform: scale(0.94); }
.me-credits-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: ${ATELIER_MOOD.gold};
}
.me-title {
  font-family: 'Instrument Serif', serif;
  font-size: 17px; color: ${ATELIER_MOOD.ink0};
}

/* Pick source screen */
.me-pick-body {
  flex: 1; min-height: 0;
  overflow-y: auto;
  padding: 14px 20px 24px;
  display: flex; flex-direction: column; gap: 12px;
}
.me-pick-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${ATELIER_MOOD.accent};
}
.me-pick-title {
  font-family: 'Instrument Serif', serif;
  font-size: 30px; line-height: 1.08;
  font-weight: 400; margin: 0;
  letter-spacing: -0.01em;
}
.me-pick-title em { font-style: italic; color: ${ATELIER_MOOD.accentDeep}; }
.me-pick-sub { font-size: 14px; color: ${ATELIER_MOOD.ink2}; line-height: 1.5; margin: 0 0 10px; }

.me-pick-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: ${ATELIER_MOOD.bgCard};
  border: 1.5px solid rgba(31,26,20,0.08);
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  color: ${ATELIER_MOOD.ink0};
  font-family: inherit;
  transition: transform 120ms ease;
}
.me-pick-card:active { transform: scale(0.985); }
.me-pick-card strong { display: block; font-size: 14.5px; font-weight: 600; }
.me-pick-card small { display: block; font-size: 12px; color: ${ATELIER_MOOD.ink2}; margin-top: 2px; }
.me-pick-card svg { color: ${ATELIER_MOOD.accent}; flex-shrink: 0; }
.me-pick-primary {
  background: linear-gradient(135deg, ${ATELIER_MOOD.accent} 0%, ${ATELIER_MOOD.accentDeep} 100%);
  border-color: transparent;
  color: #FFFCF5;
}
.me-pick-primary svg { color: #FFFCF5; }
.me-pick-primary small { color: rgba(255,252,245,0.78); }

/* Phone-gallery wrap */
.me-gallery-wrap {
  flex: 1; min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 0 24px;
}
.me-gallery-section { margin-bottom: 18px; }
.me-gallery-section-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${ATELIER_MOOD.ink2};
  font-weight: 500;
  margin: 0 0 6px;
  padding: 0 14px;
}
.me-gallery-section-title span {
  color: ${ATELIER_MOOD.ink3};
  font-weight: 400;
}
.me-gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}
.me-gallery-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  background: ${ATELIER_MOOD.paper};
  border: none;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
  transition: transform 120ms ease;
}
.me-gallery-cell:active { transform: scale(0.96); }
.me-gallery-cell img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 200ms ease;
}
.me-gallery-cell.is-loading img { opacity: 0.45; filter: blur(1px); }
.me-gallery-cell.is-loading { pointer-events: none; }
.me-gallery-cell-loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: ${ATELIER_MOOD.bgCard};
  background: rgba(31,26,20,0.45);
}
.me-gallery-cell:disabled:not(.is-loading) img { opacity: 0.55; }

.me-empty {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px;
  padding: 40px 20px;
  text-align: center;
}
.me-empty p { color: ${ATELIER_MOOD.ink2}; }
.me-empty-cta {
  padding: 11px 20px;
  border-radius: 12px;
  background: ${ATELIER_MOOD.ink0};
  color: ${ATELIER_MOOD.bg0};
  border: none;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

/* Character anchor chip — shown above canvas when editing a linked character's photo.
   Pushed below floating topbar (back ~32px + 12px*2 padding + safe-area) so it
   never overlaps the back button. */
.me-anchor-chip {
  position: relative;
  z-index: 4;
  display: inline-flex; align-items: center; gap: 8px;
  margin: calc(env(safe-area-inset-top) + 64px) 12px 0;
  padding: 6px 10px 6px 12px;
  background: rgba(201, 120, 92, 0.12);
  border: 1px solid rgba(201, 120, 92, 0.30);
  border-radius: 999px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  color: #F5EBDB;
  align-self: flex-start;
  -webkit-tap-highlight-color: transparent;
}
.me-anchor-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: ${ATELIER_MOOD.accent};
  flex-shrink: 0;
}
.me-anchor-text strong {
  font-weight: 600;
}
.me-anchor-detach {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: rgba(245, 235, 219, 0.10);
  border: none;
  color: rgba(245, 235, 219, 0.65);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  margin-left: 4px;
}
.me-anchor-detach:active { background: rgba(245, 235, 219, 0.20); }

/* Editing canvas */
.me-canvas {
  position: relative;
  flex: 1; min-height: 0;
  background: #0A0805;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  /* Block iOS long-press save dialog + text selection */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
.me-img {
  position: absolute;
  inset: 0;
  margin: auto;
  max-width: 100%; max-height: 100%;
  width: auto; height: auto;
  object-fit: contain;
  display: block;
  /* Image itself shouldn't capture pointer events — parent does */
  pointer-events: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  user-select: none;
}
.me-img-base { z-index: 1; }
.me-img-result {
  z-index: 2;
  opacity: 1;
  transition: opacity 140ms ease-out;
}
.me-img-result.is-hidden { opacity: 0; }
@keyframes meFadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Compare segmented control (top-center) — explicit two-state toggle */
.me-compare-seg {
  position: absolute;
  top: env(safe-area-inset-top);
  left: 50%;
  transform: translateX(-50%);
  margin-top: 56px;
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(14,11,7,0.78);
  border: 1px solid rgba(245,235,219,0.18);
  backdrop-filter: blur(10px);
  z-index: 4;
}
.me-compare-seg-btn {
  padding: 7px 18px;
  border-radius: 999px;
  background: transparent;
  border: none;
  color: rgba(245,235,219,0.62);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 180ms ease;
  min-width: 76px;
}
.me-compare-seg-btn:active { transform: scale(0.96); }
.me-compare-seg-btn.is-on {
  background: ${ATELIER_MOOD.accent};
  color: #FFFCF5;
  font-weight: 600;
}

/* Result actions overlay (top-right of canvas) */
.me-result-overlay {
  position: absolute;
  top: env(safe-area-inset-top);
  right: 12px;
  display: flex; flex-direction: column; gap: 8px;
  margin-top: 56px;
  z-index: 4;
}
.me-overlay-btn {
  width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(14,11,7,0.72);
  border: 1px solid rgba(245,235,219,0.18);
  color: #F5EBDB;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(10px);
  transition: transform 120ms ease;
}
.me-overlay-btn:active { transform: scale(0.92); }

.me-loading {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px;
  background: rgba(14,11,7,0.62);
  backdrop-filter: blur(14px);
  color: #F5EBDB;
  z-index: 6;
}
.me-spin { animation: meSpin 1s linear infinite; }
@keyframes meSpin { to { transform: rotate(360deg); } }
.me-loading-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px; letter-spacing: 0.04em;
}
.me-loading-tool {
  font-size: 12px;
  color: rgba(245,235,219,0.65);
}
.me-loading-cancel {
  margin-top: 12px;
  padding: 8px 16px;
  border-radius: 10px;
  background: rgba(245,235,219,0.12);
  border: 1px solid rgba(245,235,219,0.22);
  color: #F5EBDB;
  font-size: 12px; font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

/* History strip (between canvas + sheet) */
.me-history {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  background: #0A0805;
  border-top: 1px solid rgba(245,235,219,0.06);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  flex-shrink: 0;
}
.me-history::-webkit-scrollbar { display: none; }
.me-history-label {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(245,235,219,0.45);
  flex-shrink: 0;
  padding-right: 4px;
}
.me-history-thumb {
  position: relative;
  flex-shrink: 0;
  width: 44px; height: 44px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  background: ${ATELIER_MOOD.paper};
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
  transition: transform 120ms ease, border-color 120ms ease;
}
.me-history-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.me-history-thumb.is-current { border-color: ${ATELIER_MOOD.accent}; }
.me-history-thumb:active { transform: scale(0.92); }
.me-history-dot {
  position: absolute;
  top: 3px; right: 3px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: ${ATELIER_MOOD.accent};
  box-shadow: 0 0 0 1.5px #0A0805;
}

/* Bottom sheet — single surface for tools + controls + CTA */
.me-sheet {
  flex-shrink: 0;
  background: #14100B;
  border-top: 1px solid rgba(245,235,219,0.10);
  border-radius: 18px 18px 0 0;
  display: flex; flex-direction: column;
  max-height: 70vh;
  transition: max-height 240ms cubic-bezier(0.32, 0.72, 0, 1);
  overflow: hidden;
}
.me-sheet.is-expanded { max-height: 70vh; }
.me-sheet:not(.is-expanded) { max-height: 92px; }

.me-sheet-handle {
  display: flex; align-items: center; justify-content: center;
  height: 18px;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.me-sheet-grip {
  width: 38px; height: 4px; border-radius: 999px;
  background: rgba(245,235,219,0.22);
  transition: background 120ms ease;
}
.me-sheet-handle:active .me-sheet-grip { background: rgba(245,235,219,0.45); }

.me-sheet-compact {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 12px 12px;
  flex-shrink: 0;
}
.me-sheet-tool {
  flex: 1;
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(245,235,219,0.05);
  border: 1px solid rgba(245,235,219,0.08);
  color: #F5EBDB;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: background 120ms ease;
}
.me-sheet-tool:active { background: rgba(245,235,219,0.10); }
.me-sheet-tool > svg:first-child { color: ${ATELIER_MOOD.accent}; flex-shrink: 0; }
.me-sheet-tool-text { flex: 1; min-width: 0; }
.me-sheet-tool-text strong {
  display: block;
  font-size: 13.5px; font-weight: 600;
  color: #F5EBDB;
  line-height: 1.2;
}
.me-sheet-tool-text small {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.04em;
  color: rgba(245,235,219,0.55);
  margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.me-sheet-chevron {
  color: rgba(245,235,219,0.55);
  flex-shrink: 0;
  transition: transform 220ms ease;
}
.me-sheet-chevron.is-flipped { transform: rotate(180deg); }

.me-sheet-go {
  flex-shrink: 0;
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, ${ATELIER_MOOD.accent} 0%, ${ATELIER_MOOD.accentDeep} 100%);
  color: #FFFCF5;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 120ms ease;
  box-shadow: 0 4px 14px rgba(201,120,92,0.30);
}
.me-sheet-go:active { transform: scale(0.92); }
.me-sheet-go:disabled {
  background: rgba(245,235,219,0.10);
  color: rgba(245,235,219,0.30);
  box-shadow: none;
  cursor: not-allowed;
}

.me-sheet-body {
  flex: 1; min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0 14px 14px;
  display: flex; flex-direction: column; gap: 14px;
}

/* Top mode tabs (inside expanded sheet) */
.me-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  background: rgba(245,235,219,0.05);
  border-radius: 12px;
}
.me-tab {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 8px 6px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(245,235,219,0.55);
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 160ms ease;
}
.me-tab.is-on {
  background: ${ATELIER_MOOD.accent};
  color: #FFFCF5;
}
.me-tab-label { font-size: 13px; font-weight: 600; }
.me-tab-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.04em;
  opacity: 0.78;
}

/* Modo Básico — filter cards row */
.me-filter-row {
  display: flex; gap: 8px;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 6px 0;
}
.me-filter-row::-webkit-scrollbar { display: none; }
.me-filter-card {
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 4px 4px 6px;
  width: 64px;
  border-radius: 10px;
  background: transparent;
  border: 2px solid transparent;
  color: rgba(245,235,219,0.78);
  cursor: pointer;
  font-family: inherit;
  font-size: 11px; font-weight: 500;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 140ms ease;
}
.me-filter-card.is-on {
  border-color: ${ATELIER_MOOD.accent};
  color: #FFFCF5;
}
.me-filter-thumb {
  width: 56px; height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background: ${ATELIER_MOOD.paper};
}
.me-filter-thumb img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}

/* Modo Básico — sliders */
.me-slider-row {
  display: flex; flex-direction: column; gap: 12px;
  padding-top: 4px;
}
.me-slider {
  display: grid;
  grid-template-columns: 100px 1fr 42px;
  align-items: center;
  gap: 10px;
}
.me-slider > span {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12.5px;
  color: rgba(245,235,219,0.78);
}
.me-slider > span svg { color: ${ATELIER_MOOD.accent}; flex-shrink: 0; }
.me-slider input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  background: rgba(245,235,219,0.15);
  border-radius: 999px;
  outline: none;
  margin: 0;
}
.me-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: ${ATELIER_MOOD.accent};
  border: 2px solid #14100B;
  cursor: pointer;
}
.me-slider input[type="range"]::-moz-range-thumb {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: ${ATELIER_MOOD.accent};
  border: 2px solid #14100B;
  cursor: pointer;
}
.me-slider em {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(245,235,219,0.62);
  font-style: normal;
  text-align: right;
}

.me-reset {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(245,235,219,0.06);
  border: 1px solid rgba(245,235,219,0.10);
  color: rgba(245,235,219,0.78);
  font-size: 11.5px; font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  align-self: flex-start;
  -webkit-tap-highlight-color: transparent;
}
.me-reset:active { transform: scale(0.96); }

/* Piel real — intensity slider */
.me-realskin { display: flex; flex-direction: column; gap: 8px; }
.me-realskin-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center; gap: 10px;
}
.me-realskin-range {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: linear-gradient(90deg,
    rgba(245,235,219,0.18) 0%,
    ${ATELIER_MOOD.accent} 50%,
    ${ATELIER_MOOD.accentDeep} 100%
  );
  border-radius: 999px;
  outline: none;
  margin: 0;
}
.me-realskin-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: ${ATELIER_MOOD.accent};
  border: 3px solid #14100B;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(201,120,92,0.45);
}
.me-realskin-range::-moz-range-thumb {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: ${ATELIER_MOOD.accent};
  border: 3px solid #14100B;
  cursor: pointer;
}
.me-realskin-value {
  min-width: 60px;
  text-align: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${ATELIER_MOOD.accent};
  color: #FFFCF5;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.me-realskin-stops {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.me-realskin-stops button {
  padding: 7px 4px;
  border-radius: 8px;
  background: rgba(245,235,219,0.04);
  border: 1px solid rgba(245,235,219,0.08);
  color: rgba(245,235,219,0.62);
  font-size: 11.5px; font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 140ms ease;
}
.me-realskin-stops button.is-on {
  background: rgba(201,120,92,0.20);
  border-color: ${ATELIER_MOOD.accent};
  color: #FFFCF5;
}
.me-realskin-stops button:active { transform: scale(0.96); }

/* Ref upload (Try-On / Face Swap / Escena) */
.me-ref-upload {
  display: flex; align-items: center; gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(245,235,219,0.04);
  border: 1.5px dashed rgba(245,235,219,0.18);
  color: #F5EBDB;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 140ms ease;
}
.me-ref-upload:active { transform: scale(0.99); }
.me-ref-upload > svg { color: ${ATELIER_MOOD.accent}; flex-shrink: 0; }
.me-ref-upload strong { display: block; font-size: 13.5px; font-weight: 600; }
.me-ref-upload small { display: block; font-size: 11.5px; color: rgba(245,235,219,0.55); margin-top: 2px; }
.me-ref-upload-thin {
  padding: 10px 14px;
  background: transparent;
  border-style: dashed;
  border-width: 1px;
}
.me-ref-upload-thin > svg { color: rgba(245,235,219,0.55); }
.me-ref-upload-thin strong { font-size: 12.5px; }
.me-ref-upload-thin small { font-size: 10.5px; }

.me-ref-card {
  display: flex; align-items: center; gap: 12px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(245,235,219,0.05);
  border: 1.5px solid ${ATELIER_MOOD.accent};
}
.me-ref-card img {
  width: 56px; height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  background: #0A0805;
}
.me-ref-meta { flex: 1; min-width: 0; }
.me-ref-meta strong {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${ATELIER_MOOD.accent};
  font-weight: 600;
}
.me-ref-meta small { display: block; font-size: 12px; color: rgba(245,235,219,0.78); margin-top: 2px; }
.me-ref-clear {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(245,235,219,0.10);
  border: none;
  color: rgba(245,235,219,0.78);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.me-ref-clear:active { transform: scale(0.92); }

/* 2-segment toggle for Escena (Preset / Subir foto) */
.me-seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(245,235,219,0.06);
  border: 1px solid rgba(245,235,219,0.10);
  align-self: flex-start;
}
.me-seg-btn {
  padding: 6px 14px;
  border-radius: 999px;
  background: transparent;
  border: none;
  color: rgba(245,235,219,0.62);
  font-size: 11.5px; font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 140ms ease;
}
.me-seg-btn.is-on {
  background: ${ATELIER_MOOD.accent};
  color: #FFFCF5;
  font-weight: 600;
}

/* Modo Efectos — categorías + grid */
.me-effect-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
}
.me-effect-cat {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(245,235,219,0.06);
  border: 1px solid rgba(245,235,219,0.08);
  color: rgba(245,235,219,0.65);
  font-size: 12px; font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 140ms ease;
}
.me-effect-cat.is-on {
  background: ${ATELIER_MOOD.accent};
  border-color: ${ATELIER_MOOD.accent};
  color: #FFFCF5;
}
.me-effect-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.me-effect-card {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 11px;
  border-radius: 10px;
  background: rgba(245,235,219,0.04);
  border: 1.5px solid rgba(245,235,219,0.08);
  color: #F5EBDB;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 140ms ease;
}
.me-effect-card.is-on {
  background: rgba(201,120,92,0.18);
  border-color: ${ATELIER_MOOD.accent};
}
.me-effect-card:active { transform: scale(0.97); }
.me-effect-emoji { font-size: 16px; flex-shrink: 0; }
.me-effect-label { font-size: 12.5px; font-weight: 600; }

.me-sheet-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.me-sheet-tool-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
  padding: 12px 6px 10px;
  min-height: 60px;
  border-radius: 12px;
  background: rgba(245,235,219,0.04);
  border: 1.5px solid rgba(245,235,219,0.08);
  color: #F5EBDB;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 120ms ease;
}
.me-sheet-tool-card:active { transform: scale(0.96); }
.me-sheet-tool-card.is-on {
  background: rgba(201,120,92,0.18);
  border-color: ${ATELIER_MOOD.accent};
}
.me-sheet-tool-icon {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  color: ${ATELIER_MOOD.accent};
}
.me-sheet-tool-label {
  font-size: 12px; font-weight: 600;
  color: #F5EBDB;
}
.me-sheet-tool-cost {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: 0.04em;
  color: rgba(245,235,219,0.55);
}
.me-sheet-tool-card.is-on .me-sheet-tool-cost { color: rgba(245,235,219,0.78); }

/* Per-tool controls (inside expanded sheet) */
.me-sheet-controls {
  display: flex; flex-direction: column; gap: 8px;
  padding-top: 4px;
  border-top: 1px solid rgba(245,235,219,0.06);
}
.me-label {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(245,235,219,0.50);
  padding-top: 6px;
}
.me-slider-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
}
.me-slider-row .me-label { padding-top: 0; }
.me-slider-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; font-weight: 600;
  color: rgba(245,235,219,0.78);
  text-align: right;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.me-textarea {
  width: 100%;
  padding: 11px 13px;
  border-radius: 10px;
  background: rgba(245,235,219,0.06);
  border: 1.5px solid rgba(245,235,219,0.10);
  color: #F5EBDB;
  font-size: 14px; line-height: 1.45;
  font-family: inherit;
  resize: none;
  outline: none;
  -webkit-appearance: none;
  transition: border-color 120ms ease;
}
.me-textarea:focus { border-color: ${ATELIER_MOOD.accent}; }
.me-textarea::placeholder { color: rgba(245,235,219,0.35); }
.me-textarea-counter {
  align-self: flex-end;
  margin-top: -4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(245,235,219,0.45);
  font-variant-numeric: tabular-nums;
}

.me-chips {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.me-chip {
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(245,235,219,0.06);
  border: 1px solid rgba(245,235,219,0.10);
  color: rgba(245,235,219,0.78);
  font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: all 120ms ease;
}
.me-chip.is-on {
  background: ${ATELIER_MOOD.accent};
  border-color: ${ATELIER_MOOD.accent};
  color: #FFFCF5;
}
.me-chip:active { transform: scale(0.96); }

.me-hint {
  font-size: 12.5px; line-height: 1.5;
  color: rgba(245,235,219,0.62);
  margin: 0;
  font-style: italic;
}
.me-tip-inline {
  font-size: 11.5px;
  color: rgba(245,235,219,0.50);
  font-style: italic;
  margin: 0;
  padding-top: 4px;
}

/* Recent shortcut on pick screen */
.me-pick-recent {
  display: flex; align-items: center; gap: 12px;
  padding: 10px;
  border-radius: 16px;
  background: ${ATELIER_MOOD.bgCard};
  border: 1.5px solid ${ATELIER_MOOD.accent};
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  text-align: left;
  font-family: inherit;
  color: ${ATELIER_MOOD.ink0};
  transition: transform 120ms ease;
}
.me-pick-recent:active:not(:disabled) { transform: scale(0.985); }
.me-pick-recent:disabled { opacity: 0.65; }
.me-pick-recent-thumb {
  flex-shrink: 0;
  width: 56px; height: 56px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  background-color: ${ATELIER_MOOD.paper};
}
.me-pick-recent-text { flex: 1; min-width: 0; }
.me-pick-recent-eyebrow {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${ATELIER_MOOD.accent};
  margin-bottom: 1px;
}
.me-pick-recent strong { display: block; font-size: 14.5px; font-weight: 600; }
.me-pick-recent small { display: block; font-size: 12px; color: ${ATELIER_MOOD.ink2}; margin-top: 2px; }
`;
