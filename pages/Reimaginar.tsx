/**
 * Reimaginar — Premium app suite, app #2
 *
 * Mood: Sensual editorial (cream + dusty rose + champagne)
 * Single character + multi-style selection (1 primary + 0-N accents)
 * Generates a NEW photograph of the same person in a different aesthetic.
 *
 * Reuses the JSON spec pattern from AIEditorV2 reimagine tool (refactor #40).
 * Spicy styles gated behind profile.contentMode === 'creator' (+18).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, Sparkles, Aperture, Download,
  Edit3, Share2, Search, Lock, X, ChevronDown, Wand2, Upload,
} from 'lucide-react';
import type { Page } from '../App';
import { useCharacterStore } from '../stores/characterStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError, sharePhoto, takePhoto, isNativePlatform } from '../services/nativeService';
import { SOUL_STYLES, SOUL_STYLE_CATEGORIES, type SoulStyle, type SoulStyleCategory } from '../data/soulStyles';
import { identityProse, NO_TEXT_RULE, NEVER_ADD_TEXT, PHOTOREAL_SKIN, renderStyleSkin, withPhysicalAnchor, sanitizeAnchor } from '../services/promptBuilder';
import { urlToFile } from '../components/apps/_shared/urlToFile';
import { AppTopBar, AppLightbox, type AppMood } from '../components/apps/_shared';

// Mood: editorial cream + dusty rose + champagne — matches existing palette
const LIGHT_MOOD: AppMood = {
  bg0: '#F4EDE0',
  bgCard: '#FFFCF5',
  paper: '#F2E5D0',
  ink0: '#1F1A14',
  ink1: '#3D332A',
  ink2: '#6F5E4C',
  ink3: '#A8957D',
  line: 'rgba(31, 26, 20, 0.10)',
  accent: '#8B4566',
  accentDeep: '#6B3450',
  gold: '#D4A85F',
};

// ─── Types ─────────────────────────────────────

interface Props {
  onNav: (p: Page) => void;
}

// Mobile category tabs — one tab per SOUL_STYLES category that has content,
// in a logical user order. Scrolls horizontally — no overflow concern.
type TabId =
  | 'featured' | 'all'
  | 'fashion' | 'aesthetic' | 'pose' | 'selfie' | 'expression'
  | 'photo' | 'mood' | 'lifestyle' | 'lugar' | 'era' | 'profession' | 'experimental'
  | 'spicy';

const TABS: { id: TabId; label: string; sourceCategories: SoulStyleCategory[] }[] = [
  { id: 'featured',     label: 'Destacados',  sourceCategories: [] },
  { id: 'all',          label: 'Todos',       sourceCategories: [] },
  { id: 'fashion',      label: 'Moda',        sourceCategories: ['fashion'] },
  { id: 'aesthetic',    label: 'Estética',    sourceCategories: ['aesthetic'] },
  { id: 'pose',         label: 'Pose',        sourceCategories: ['pose'] },
  { id: 'selfie',       label: 'Selfie',      sourceCategories: ['selfie'] },
  { id: 'expression',   label: 'Expresión',   sourceCategories: ['expression'] },
  { id: 'photo',        label: 'Foto',        sourceCategories: ['photo', 'social', 'content'] },
  { id: 'mood',         label: 'Mood',        sourceCategories: ['mood', 'concept'] },
  { id: 'lifestyle',    label: 'Lifestyle',   sourceCategories: ['lifestyle'] },
  { id: 'lugar',        label: 'Lugar',       sourceCategories: ['place', 'location'] },
  { id: 'era',          label: 'Época',       sourceCategories: ['era'] },
  { id: 'profession',   label: 'Profesión',   sourceCategories: ['profession'] },
  { id: 'experimental', label: 'Experimental',sourceCategories: ['experimental'] },
  { id: 'spicy',        label: 'Sensual+18',  sourceCategories: ['spicy'] },
];

const COST = 10;
const PREMIUM_EXTRA = 15;   // +15cr when Premium tier toggle is active
const MAX_SELECTED = 4; // 1 primary + up to 3 accents

// Color palette options for the outfit. Selecting any of these (other than
// 'auto') injects an explicit color override into the prompt JSON, telling the
// engine to apply this palette to the wardrobe regardless of the soul style's
// native colors. Background/lighting stay driven by the style/accent.
type PaletteId =
  | 'auto' | 'black' | 'white' | 'red' | 'burgundy' | 'pink'
  | 'pastel' | 'earth' | 'olive' | 'navy' | 'jewel' | 'metallic' | 'neon';

// Hex codes are intentional — Flux 2 docs state that "#FF0000" outperforms
// "red" for color precision. NB2 also accepts hex. Grok ignores them but
// keeps the color word fallback. Format: "<color words> (hex: #XXXXXX)".
const PALETTES: { id: PaletteId; label: string; swatch: string; prompt: string }[] = [
  { id: 'auto',     label: 'Auto',     swatch: 'linear-gradient(135deg,#FF6B9D,#A78BFA,#4FACFE)', prompt: '' },
  { id: 'black',    label: 'Negro',    swatch: '#111111',  prompt: 'all-black wardrobe, monochrome black clothing (hex: #0A0A0A)' },
  { id: 'white',    label: 'Blanco',   swatch: '#FFFFFF',  prompt: 'white and cream clothing, ivory tones (hex: #F5F0E6 cream, #FFFFFF white)' },
  { id: 'red',      label: 'Rojo',     swatch: '#C42E2E',  prompt: 'rich red clothing, scarlet wardrobe (hex: #C42E2E scarlet)' },
  { id: 'burgundy', label: 'Burdeos',  swatch: '#5B1A1A',  prompt: 'burgundy and oxblood clothing, deep wine red (hex: #5B1A1A burgundy)' },
  { id: 'pink',     label: 'Rosa',     swatch: '#F5A8C5',  prompt: 'soft pink clothing, blush rose, muted dusty pink (hex: #F5A8C5 blush)' },
  { id: 'pastel',   label: 'Pastel',   swatch: 'linear-gradient(135deg,#FBC7D9,#C9D6FF)', prompt: 'pastel clothing, soft baby pink + lavender + mint + powder blue (hex: #FBC7D9 baby pink, #C9D6FF lavender, #C3E8D0 mint)' },
  { id: 'earth',    label: 'Tierra',   swatch: 'linear-gradient(135deg,#B89674,#7A5A3F)', prompt: 'earth-toned clothing, camel + beige + warm browns + terracotta (hex: #B89674 camel, #7A5A3F brown, #C97B5C terracotta)' },
  { id: 'olive',    label: 'Oliva',    swatch: '#6B7A3A',  prompt: 'olive or sage green clothing, deep forest green wardrobe (hex: #6B7A3A olive, #4A5C28 forest)' },
  { id: 'navy',     label: 'Azul',     swatch: '#1F2A5C',  prompt: 'navy blue clothing, deep ocean blue, indigo (hex: #1F2A5C navy, #2C3E70 indigo)' },
  { id: 'jewel',    label: 'Joya',     swatch: 'linear-gradient(135deg,#1E6F50,#7A1F4D,#1F3F8E)', prompt: 'jewel-tone clothing, saturated emerald + sapphire + ruby (hex: #1E6F50 emerald, #1F3F8E sapphire, #7A1F4D ruby)' },
  { id: 'metallic', label: 'Metálico', swatch: 'linear-gradient(135deg,#C0C0C0,#FFD37A)', prompt: 'metallic clothing, silver + gold + chrome reflective fabrics (hex: #C0C0C0 silver, #FFD37A gold, #E5E4E2 chrome)' },
  { id: 'neon',     label: 'Neón',     swatch: 'linear-gradient(135deg,#FF00C8,#00F0FF)', prompt: 'neon clothing, electric pink + acid green + cyan, vivid saturated (hex: #FF00C8 electric pink, #00F0FF cyan, #B5FF00 acid green)' },
];

// Mobile-curated featured pool — gender-balanced mix of unisex / masculine /
// feminine styles. Overrides the global `featured: true` flag (which skews
// female because it serves multiple legacy use cases). Order matters: shown
// in this exact sequence in the destacados row.
const MOBILE_FEATURED_IDS = [
  '811de7ab-7aaf-4a6b-b352-cdea6c34c8f1',          // Movie (cinematic, unisex)
  'ff1ad8a2-94e7-4e70-a12f-e992ca9a0d36',          // Quiet Luxury (unisex)
  '84c23cef-7eda-4f8f-9931-e3e6af8192d9',          // Burgundy Suit (masc)
  '99de6fc5-1177-49b9-b2e9-19e17d95bcaf',          // Tokyo Streetstyle (unisex)
  'aesthetic-editorial-chic',                       // Editorial Chic
  '90df2935-3ded-477f-8253-1d67dd939cbe',          // Bike Mafia (masc)
  '0fe8ad66-ff61-411f-9186-b392e140b18c',          // Foggy Morning (unisex)
  'custom-mood-golden',                             // Golden Hour (unisex)
  '710f9073-f580-48dc-b5c3-9bbc7cbb7f37',          // 90s Editorial (unisex)
  '96758335-d1d1-42b7-9c21-5ac38c433485',          // Gorpcore (masc/outdoor)
  'aesthetic-coastal-minimal',                      // Coastal Minimalist (unisex)
  'custom-life-coffee',                             // Coffee Shop (unisex)
];

// ─── Helpers ────────────────────────────────────
// urlToFile imported from shared (LRU-cached)

function styleEmoji(s: SoulStyle): string {
  return s.icon || SOUL_STYLE_CATEGORIES[s.category]?.icon || '✨';
}

// ─── Component ─────────────────────────────────

export default function Reimaginar({ onNav }: Props) {
  const characters = useCharacterStore(s => s.characters);
  const incrementUsage = useCharacterStore(s => s.incrementUsage);
  const addItems = useGalleryStore(s => s.addItems);
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  // ─── State ───
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [customBaseFile, setCustomBaseFile] = useState<File | null>(null);
  const [customBaseUrl, setCustomBaseUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('featured');
  const [search, setSearch] = useState('');
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]); // ordered, [0]=primary
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  // Lightbox state — tap any result image or history thumb to view fullscreen.
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Aspect ratio — 3:4 default (IG feed vertical) but user can pick reels (9:16),
  // square (1:1), landscape (4:3), or banner (16:9) for different content surfaces.
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '4:3' | '9:16' | '16:9'>('3:4');
  // Premium tier — when on, routes to Flux 2 Pro Edit (better ref-context awareness,
  // captures styling details like piercings/accessories/hair-bows from the refs).
  // Costs +15cr. Identity already perfect on standard Klein, premium is for hero
  // shots where every detail of the character aesthetic must come through.
  const [premiumTier, setPremiumTier] = useState<boolean>(false);
  // Color palette override for the outfit. 'auto' lets the chosen soul style
  // dictate its native colors (e.g. Goth Romántico → black). Any other value
  // injects an outfit_color_override into the JSON spec that the engine treats
  // as authoritative for the wardrobe (background/lighting untouched).
  const [paletteId, setPaletteId] = useState<PaletteId>('auto');
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCreatorMode = profile?.contentMode === 'creator';
  const credits = profile?.creditsRemaining ?? 0;
  const totalCost = COST + (premiumTier ? PREMIUM_EXTRA : 0);
  const canAfford = credits >= totalCost;

  // Default-select first character
  useEffect(() => {
    if (!selectedCharId && !customBaseFile && characters.length > 0) {
      setSelectedCharId(characters[0].id);
    }
  }, [characters, selectedCharId, customBaseFile]);

  // ─── Upload handler ───
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
    if (!file.type.startsWith('image/')) {
      toast.error('Solo imágenes (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Máximo 12 MB');
      return;
    }
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

  const selectedChar = useMemo(
    () => characters.find(c => c.id === selectedCharId) ?? null,
    [characters, selectedCharId],
  );

  // ─── Style filtering ───
  const visibleStyles = useMemo(() => {
    let pool = SOUL_STYLES;

    // Gate spicy unless creator mode
    if (!isCreatorMode) {
      pool = pool.filter(s => s.category !== 'spicy');
    }

    // Tab filter
    if (activeTab === 'featured') {
      pool = pool.filter(s => s.featured);
    } else if (activeTab === 'spicy') {
      pool = pool.filter(s => s.category === 'spicy');
    } else if (activeTab !== 'all') {
      const tab = TABS.find(t => t.id === activeTab);
      if (tab) pool = pool.filter(s => tab.sourceCategories.includes(s.category));
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      pool = pool.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.hint || '').toLowerCase().includes(q),
      );
    }

    return pool;
  }, [activeTab, search, isCreatorMode]);

  const featuredStyles = useMemo(() => {
    // Use curated mobile list (gender-balanced) — order preserved
    const byId = new Map(SOUL_STYLES.map(s => [s.id, s] as const));
    return MOBILE_FEATURED_IDS
      .map(id => byId.get(id))
      .filter((s): s is SoulStyle => Boolean(s));
  }, []);

  const selectedStyles = useMemo(
    () => selectedStyleIds.map(id => SOUL_STYLES.find(s => s.id === id)).filter(Boolean) as SoulStyle[],
    [selectedStyleIds],
  );

  // ─── Toggle style selection (multi-select up to MAX_SELECTED) ───
  const toggleStyle = (s: SoulStyle) => {
    hapticLight();

    // Spicy + standard mode → block + suggest creator
    if (s.category === 'spicy' && !isCreatorMode) {
      toast.info('Esta estética requiere Modo Creator (+18). Tap tu avatar arriba → Perfil → activar.');
      return;
    }

    setSelectedStyleIds(prev => {
      if (prev.includes(s.id)) {
        return prev.filter(id => id !== s.id);
      }
      if (prev.length >= MAX_SELECTED) {
        toast.info(`Máximo ${MAX_SELECTED} estilos`);
        return prev;
      }
      return [...prev, s.id];
    });
  };

  // ─── Generate ───
  const handleGenerate = async () => {
    if (!selectedChar && !customBaseFile) {
      toast.error('Selecciona un personaje o sube una foto');
      hapticError();
      return;
    }
    if (selectedStyleIds.length === 0 && !customPrompt.trim()) {
      toast.error('Elige al menos un estilo o escribe una dirección custom');
      hapticError();
      return;
    }
    if (generating) return;
    if (!canAfford) {
      toast.error(`Necesitas ${totalCost} créditos. Tienes ${credits}.`);
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
      toast.error('Este personaje no tiene fotos de referencia. Genera al menos una foto canon en Studio o sube una foto.');
      return;
    }

    const ok = await decrementCredits(totalCost);
    if (!ok) {
      toast.error('Créditos insuficientes');
      return;
    }

    setGenerating(true);
    setProgress(5);
    abortRef.current = new AbortController();

    try {
      // Build JSON spec (same pattern as AIEditorV2 refactor #40)
      const primaryStyle = selectedStyles[0];
      const accentStyles = selectedStyles.slice(1);
      const customDirection = customPrompt.trim();

      // Stylized vs photo detection — TWO sources:
      // 1. Character's native renderStyle (anime/3D/illustration → must be preserved)
      // 2. Selected styles that imply non-photo rendering (concept, glitch, cyanotype...)
      const charRenderStyle = (selectedChar?.renderStyle || 'photorealistic').toLowerCase();
      const charIsNonPhoto = !!selectedChar?.renderStyle && charRenderStyle !== 'photorealistic';

      const nonPhotoCategories = new Set(['concept', 'experimental']);
      const nonPhotoKeywords = /anime|pixel|cartoon|3d render|illustration|comic|manga|cel.shad|stylized|vaporwave|glitch|cyanotype|lenticular/i;
      const stylesImplyNonPhoto = selectedStyles.some(s =>
        nonPhotoCategories.has(s.category as any) ||
        nonPhotoKeywords.test(s.hint || '') ||
        nonPhotoKeywords.test(s.name),
      );

      const isStylized = charIsNonPhoto || stylesImplyNonPhoto;

      const styleNames = selectedStyles.map(s => s.name).join(' + ') || 'editorial';
      const skinRule = charIsNonPhoto
        ? `Maintain authentic ${charRenderStyle} rendering — do NOT convert to photorealism. The character stays in ${charRenderStyle} style with the new ${styleNames} aesthetic applied to outfit, setting, and mood.`
        : isStylized
          ? `Render quality consistent with the ${styleNames} style. Sharp details, no AI artifacts.`
          : `${PHOTOREAL_SKIN} Documentary editorial realism, NEVER porcelain or CGI-looking.`;

      const reimagineSpec: any = {
        task: charIsNonPhoto
          ? `REIMAGINE (${charRenderStyle}) — Generate a NEW image of the SAME ${charRenderStyle} character in a different aesthetic, preserving the ${charRenderStyle} rendering style`
          : 'REIMAGINE — Generate a NEW photograph of the SAME person in a different aesthetic',
        identity: {
          source: 'Reference Images (these define WHO the character is)',
          render_style: charIsNonPhoto ? charRenderStyle : 'photorealistic',
          preserve: [
            'face_features', 'bone_structure', 'eye_shape', 'eye_color',
            'lip_shape', 'jaw_line', 'skin_tone',
            'hair_style', 'hair_color', 'hair_length',
            'body_proportions', 'build', 'height',
            'distinguishing_features (tattoos, scars, moles)',
            ...(charIsNonPhoto ? [`${charRenderStyle}_rendering_style (DO NOT convert to photorealism)`] : []),
          ],
          rule: charIsNonPhoto
            ? `The character must stay in ${charRenderStyle} rendering style — do NOT convert to photorealism. Same character, same render style, new aesthetic.`
            : 'The person must be instantly recognizable as the SAME individual. Identity is sacred.',
        },
        creative_direction: {
          ...(customDirection ? { custom_user_direction: customDirection } : {}),
          primary_style: primaryStyle ? {
            name: primaryStyle.name,
            description: primaryStyle.hint || primaryStyle.name,
            determines: ['outfit/wardrobe', 'core_visual_aesthetic', 'overall_look'],
          } : {
            name: 'editorial fashion',
            description: customDirection || 'professional editorial fashion shoot',
            determines: ['outfit', 'aesthetic'],
          },
          ...(accentStyles.length > 0 ? {
            accent_styles: accentStyles.map(s => ({
              name: s.name,
              description: s.hint || s.name,
              contributes: ['setting/environment', 'lighting/mood', 'atmosphere'],
            })),
            blend_rule: 'Primary style dominates the OUTFIT and CORE LOOK. Accent styles ONLY contribute setting, environment, lighting, and mood. Do NOT generate a hybrid outfit — the wardrobe must come purely from primary style.',
          } : {}),
          ...(paletteId !== 'auto' ? (() => {
            const palette = PALETTES.find(p => p.id === paletteId);
            return palette ? {
              outfit_color_override: {
                palette: palette.label,
                description: palette.prompt,
                rule: 'This color palette is AUTHORITATIVE for the outfit/wardrobe. It OVERRIDES the default colors of the primary style. Apply ONLY to the clothing — do not change the background, scene, or lighting which stay driven by the style.',
              },
            } : {};
          })() : {}),
          composition: 'NEW pose, NEW camera angle, NEW framing — do not copy the original photo layout.',
          aspect_ratio: aspectRatio,
        },
        rules: {
          must_change: ['pose', 'camera_angle', 'framing', 'background', 'outfit'],
          must_preserve: ['identity', 'physical_features', 'recognizability'],
          render_quality: skinRule,
          never_add: NEVER_ADD_TEXT,
        },
      };

      // Inject physical anchor from character.characteristics (the permanent
      // body/face/skin description set during creation). This is CRITICAL —
      // references alone lose proportions like waist-to-hip, glúteo, busto,
      // skin texture across creative reimagines. Anchor restores fidelity.
      const anchoredSpec = withPhysicalAnchor(reimagineSpec, {
        characteristics: selectedChar?.characteristics,
      });

      const jsonInstruction = `REIMAGINE SPECIFICATION:\n${JSON.stringify(anchoredSpec, null, 2)}`;

      // Build base + refs (custom upload takes priority as base, char refs become identity refs)
      let baseFile: File;
      let refFiles: File[];
      if (customBaseFile) {
        baseFile = customBaseFile;
        refFiles = refUrls.length > 0
          ? await Promise.all(refUrls.slice(0, 3).map((url, i) => urlToFile(url, `reimagine-ref-${i}.png`)))
          : [];
      } else {
        baseFile = await urlToFile(refUrls[0], 'reimagine-base.png');
        refFiles = await Promise.all(
          refUrls.slice(1).map((url, i) => urlToFile(url, `reimagine-ref-${i}.png`)),
        );
      }

      setProgress(15);

      const { editWithNB2Fal, editWithNbProFal } = await import('../services/falService');
      const { editFallback } = await import('../services/editFallback');

      let resultUrls: string[] = [];

      try {
        // Premium tier: NB Pro (higher quality, +15cr cost). Default: NB2.
        const primaryEdit = premiumTier ? editWithNbProFal : editWithNB2Fal;
        resultUrls = await primaryEdit(
          baseFile,
          jsonInstruction,
          refFiles,
          p => setProgress(Math.min(85, 15 + Math.round(p * 0.7))),
          {
            resolution: '2K',
            aspectRatio,
            // Pass character anchor + ID so the Haiku normalizer cache keys
            // by character (prevents kkkk's piercings/bows leaking into
            // other personas via cache collision on similar anchor prefixes).
            characterAnchor: selectedChar?.characteristics,
            // The JSON spec already contains the anchor; Reimaginar built it
            // with withPhysicalAnchor. Skip the normalizer here — the app
            // already sanitized + structured the spec correctly for this
            // template-driven path.
            skipNormalize: true,
          },
          abortRef.current.signal,
        );
        if (!resultUrls || resultUrls.length === 0) throw new Error(premiumTier ? 'NB Pro empty' : 'NB2 empty');
      } catch (nb2Err: any) {
        if (nb2Err?.name === 'AbortError') throw nb2Err;
        console.warn('NB2 rejected, using fallback:', nb2Err?.message);
        toast.info('Reintentando con motor alternativo…');

        // Flat prose optimized for Seedream (Grok auto-sanitized in editFallback).
        // Targets 50-80 word sweet spot. Uses identityProse helper for "Figure N" mention.
        const skinFlat = charIsNonPhoto
          ? renderStyleSkin(charRenderStyle)
          : isStylized
            ? `Render in authentic ${styleNames} style with sharp details.`
            : PHOTOREAL_SKIN;
        const primaryDesc = primaryStyle?.hint || primaryStyle?.name || customDirection || 'editorial fashion';
        const accentText = accentStyles.length > 0
          ? ` Setting and lighting elements from: ${accentStyles.map(s => s.name).join(', ')}. Outfit and core look come from the primary style only.`
          : '';
        const customText = customDirection ? ` User direction: ${customDirection}.` : '';

        const taskVerb = charIsNonPhoto ? `Generate a NEW ${charRenderStyle} image` : 'Generate a NEW photograph';
        const idProse = identityProse({
          numReferences: refFiles.length,
          charIsNonPhoto,
          renderStyle: charIsNonPhoto ? charRenderStyle : undefined,
          customUploadOnly: !!customBaseFile && refFiles.length === 0,
        });
        // Inject physical anchor for the flat-prose fallback engines too.
        // sanitizeAnchor strips multi-engine bloat (FLAT/WAN/GROK + JSON spec)
        // — without it Wan rejects in ~3s when characteristics is the old
        // multi-engine format (>3000 chars contradictory descriptions).
        const cleanAnchor = sanitizeAnchor(selectedChar?.characteristics ?? '');
        const anchorText = cleanAnchor
          ? ` The subject is described as: ${cleanAnchor}. These physical traits are absolute and override any reference ambiguity.`
          : '';
        const paletteText = paletteId !== 'auto'
          ? (() => {
              const p = PALETTES.find(x => x.id === paletteId);
              return p ? ` OUTFIT COLOR (override style defaults): ${p.prompt}. Apply ONLY to clothing — keep scene and lighting from the style.` : '';
            })()
          : '';
        const flatInstruction = `Edit Figure 1: ${taskVerb} of this same character in a different aesthetic. ${idProse}${anchorText} PRIMARY STYLE: ${primaryStyle?.name || 'editorial'} — ${primaryDesc}.${accentText}${customText}${paletteText} CHANGE: pose, camera angle, framing, background, outfit. ${skinFlat} ${NO_TEXT_RULE}`;

        // Flux 2 native spec. Format validated by kkkk-bench 2026-05-09:
        //   - subject: full anchor (the preservation list keeps Flux from
        //     interpreting it as scene description)
        //   - style: CONCRETE NARRATIVE of primary style only — NOT a list of
        //     accent names. Accents contribute to context separately.
        //   - context: blended setting/lighting from accents (max 2 to avoid
        //     contradictory scenes like boudoir+shower+selfie at once)
        //   - outfitColor: palette hex injection
        //   - technical: photoreal vs stylized cue (triggers GROK_SKIN_ADDENDUM)
        const paletteForFlux = paletteId !== 'auto'
          ? PALETTES.find(p => p.id === paletteId)?.prompt
          : undefined;
        // Pick at most 2 accent hints, blend them into a single contextual phrase
        // instead of dumping all 3 — Flux concat'd hints from boudoir+wet+selfie
        // produced incoherent scenes in earlier bench.
        const topAccentHints = accentStyles
          .slice(0, 2)
          .map(s => s.hint || s.name)
          .filter(Boolean);
        const blendedContext = topAccentHints.length > 0
          ? `Setting and lighting: ${topAccentHints.join('. Additionally, ')}.`
          : '';
        const flux2Spec = {
          refCount: refFiles.length,
          // Anchor is the kkkk-style verbose physical description. The
          // preservation list in the prompt builder anchors it to identity.
          subject: cleanAnchor || `young woman, distinctive identity from references`,
          action: '',
          // PRIMARY STYLE: concrete narrative from the primary style's HINT
          // (which is already a scene description), not the style name +
          // accent name concatenation that caused incoherent outputs.
          style: primaryStyle?.hint || primaryStyle?.name || customDirection || 'editorial fashion photograph',
          context: blendedContext,
          outfitColor: paletteForFlux,
          technical: charIsNonPhoto
            ? `${charRenderStyle} rendering style — do not convert to photorealism`
            : 'editorial magazine quality, 35mm film, shallow depth of field',
        };

        resultUrls = await editFallback({
          baseImage: baseFile,
          flatInstruction,
          referenceImages: refFiles,
          onProgress: p => setProgress(Math.min(85, 15 + Math.round(p * 0.7))),
          abortSignal: abortRef.current.signal,
          aspectRatio,
          tier: premiumTier ? 'premium' : 'standard',
          flux2Spec,
        });
        if (!resultUrls || resultUrls.length === 0) throw new Error('Ambos motores fallaron');
      }

      setProgress(90);

      // Safety check
      try {
        const { checkImageSafety } = await import('../services/safetyService');
        const mode = isCreatorMode ? 'creator' : 'standard';
        const safety = await checkImageSafety(resultUrls[0], mode);
        if (!safety.allowed && !safety.error) {
          restoreCredits(totalCost);
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
      const promptDesc = selectedStyles.length > 0
        ? `Reimaginar · ${selectedStyles.map(s => s.name).join(' + ')}`
        : `Reimaginar · ${customDirection.slice(0, 60)}`;

      addItems([{
        id: crypto.randomUUID(),
        url,
        prompt: promptDesc + (customBaseFile ? ' · upload propio' : ''),
        model: 'nb2-reimaginar',
        timestamp: Date.now(),
        type: 'edit' as const,
        characterId: selectedChar?.id ?? undefined,
        tags: ['reimaginar', ...selectedStyles.map(s => s.category), ...(customBaseFile ? ['custom-upload'] : [])],
        source: 'reimaginar' as any,
      }]);

      if (selectedChar) incrementUsage(selectedChar.id);
      setResultUrl(url);
      setHistory(prev => [url, ...prev].slice(0, 4));
      toast.success('Reimaginar listo');
      hapticSuccess();
    } catch (err: any) {
      restoreCredits(totalCost);
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

  const handleCancel = () => abortRef.current?.abort();

  const handleShare = async () => {
    if (!resultUrl) return;
    hapticLight();
    const ok = await sharePhoto({
      url: resultUrl,
      title: 'VIST · Reimaginar',
      text: `Hecho con VIST · ${selectedStyles.map(s => s.name).join(' + ') || 'Reimaginar'}`,
      filename: `vist-reimaginar-${Date.now()}.jpg`,
    });
    if (!ok) {
      const a = document.createElement('a');
      a.href = resultUrl;
      a.download = `vist-reimaginar-${Date.now()}.jpg`;
      a.click();
    }
  };

  // ─── Empty state ───
  if (characters.length === 0 && !customBaseFile) {
    return (
      <div className="rm-shell">
        <style>{REIMAGINAR_STYLES}</style>
        <AppTopBar
          mood={LIGHT_MOOD}
          title="Reimaginar"
          credits={credits}
          onBack={() => onNav('studio')}
        />
        <div className="rm-empty">
          <div className="rm-empty-icon"><Wand2 size={28} /></div>
          <h2 className="rm-empty-title">Empieza con una <em>foto</em></h2>
          <p className="rm-empty-sub">Sube una foto o crea un personaje para reimaginarlo en 500+ estéticas.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="rm-empty-cta" onClick={handleUploadClick}>
              <Upload size={14} /> Subir foto
            </button>
            <button className="rm-empty-cta" style={{ background: 'transparent', color: 'var(--ink-1)', border: '1px solid var(--line)', boxShadow: 'none' }} onClick={() => onNav('create')}>
              <Sparkles size={14} /> Crear personaje
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        </div>
      </div>
    );
  }

  // ─── Main ───
  return (
    <div className="rm-shell">
      <style>{REIMAGINAR_STYLES}</style>

      {/* Top bar */}
      <AppTopBar
        mood={LIGHT_MOOD}
        title="Reimaginar"
        credits={credits}
        onBack={() => onNav('studio')}
        rightSlot={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className={`rm-hero-switch ${premiumTier ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setPremiumTier(!premiumTier); }}
              disabled={generating}
              title={`Hero Pro · +${PREMIUM_EXTRA}cr`}
              aria-label={`Hero Pro ${premiumTier ? 'activado' : 'desactivado'}`}
            >
              <span className="rm-hero-switch-label">Hero</span>
              <span className="rm-hero-switch-track"><span className="rm-hero-switch-thumb" /></span>
            </button>
            <span className="rm-credits">
              <span className="rm-credits-dot" />{credits}
            </span>
          </div>
        }
      />

      {/* Hero */}
      <section className="rm-hero">
        <div className="rm-hero-eyebrow">App #02 · Estética editorial</div>
        <h1 className="rm-hero-title">
          Mismo personaje,<br /><em>otro mundo.</em>
        </h1>
        <p className="rm-hero-sub">
          {SOUL_STYLES.length}+ estéticas. De cinematográfico a Tokyo street, de quiet luxury a Y2K.
        </p>
      </section>

      {/* Character chip row + upload */}
      <div className="rm-char-row">
        {customBaseFile && customBaseUrl ? (
          <div className="rm-char-chip is-active rm-char-upload">
            <span
              className="rm-char-thumb"
              style={{ backgroundImage: `url(${customBaseUrl})` }}
            />
            <span className="rm-char-name">Mi foto</span>
            <button
              className="rm-char-x"
              onClick={clearCustomBase}
              aria-label="Quitar mi foto"
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <button
            className="rm-char-chip rm-char-upload-btn"
            onClick={handleUploadClick}
          >
            <span className="rm-char-thumb rm-char-thumb-upload">
              <Upload size={13} />
            </span>
            <span className="rm-char-name">Subir foto</span>
          </button>
        )}
        {characters.map(c => (
          <button
            key={c.id}
            className={`rm-char-chip ${selectedCharId === c.id && !customBaseFile ? 'is-active' : ''}`}
            onClick={() => {
              hapticLight();
              setCustomBaseFile(null);
              setCustomBaseUrl(null);
              setSelectedCharId(c.id);
            }}
          >
            <span
              className="rm-char-thumb"
              style={c.thumbnail ? { backgroundImage: `url(${c.thumbnail})` } : undefined}
            />
            <span className="rm-char-name">{c.name}</span>
          </button>
        ))}
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      </div>

      {/* Result canvas */}
      <div className="rm-canvas">
        {generating ? (
          <div className="rm-canvas-loading">
            <div className="rm-loader-ring">
              <div className="rm-loader-fill" style={{ height: `${progress}%` }} />
            </div>
            <div className="rm-loader-pct">{progress}%</div>
            <div className="rm-loader-label">
              {progress < 20 ? 'Preparando referencias' :
               progress < 50 ? 'Aplicando estética' :
               progress < 80 ? 'Componiendo' :
               progress < 95 ? 'Refinando detalles' :
               'Finalizando'}
            </div>
            <button className="rm-cancel-btn" onClick={handleCancel}>Cancelar</button>
          </div>
        ) : resultUrl ? (
          <>
            <img
              key={resultUrl}
              src={resultUrl}
              alt="Reimaginar resultado"
              className="rm-canvas-img rm-fade-in"
              onClick={() => { hapticLight(); setLightbox(resultUrl); }}
              style={{ cursor: 'zoom-in' }}
            />
            <div className="rm-canvas-actions">
              <button className="rm-canvas-btn" onClick={() => { hapticLight(); onNav('editor'); }}>
                <Edit3 size={14} /> Editar
              </button>
              {/* Routes through sharePhoto so iOS lands the file in Photos.
                  <a download> silently fails on iOS WKWebView for cross-origin URLs. */}
              <button className="rm-canvas-btn" onClick={handleShare}>
                <Download size={14} /> Bajar
              </button>
              <button className="rm-canvas-btn rm-canvas-btn-prim" onClick={handleShare}>
                <Share2 size={14} /> Compartir
              </button>
            </div>
          </>
        ) : (
          <div className="rm-canvas-empty">
            <div className="rm-canvas-empty-frame">
              <Wand2 size={32} />
            </div>
            <p>Tu reimagen aparecerá aquí</p>
          </div>
        )}
      </div>

      {/* History strip — tap any thumb to view fullscreen. The active result
       *  also reads as fullscreen-ready; switching results uses the swap
       *  flow inside the lightbox (not yet exposed) or by long-press (todo).
       *  For now: tap = expand, matching user expectation. */}
      {history.length > 0 && (
        <div className="rm-history">
          {history.map((url, i) => (
            <button
              key={url + i}
              className={`rm-history-thumb ${url === resultUrl ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setLightbox(url); }}
              style={{ backgroundImage: `url(${url})` }}
              aria-label={`Resultado ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Search */}
      <div className="rm-search-wrap">
        <Search size={14} className="rm-search-icon" />
        <input
          className="rm-search-input"
          type="search"
          placeholder="Buscar estilo (boudoir, Y2K, dark academia...)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          enterKeyHint="search"
          inputMode="search"
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            className="rm-search-clear"
            onClick={() => { setSearch(''); hapticLight(); }}
            aria-label="Limpiar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="rm-tabs">
        {TABS.map(t => {
          const isSpicy = t.id === 'spicy';
          if (isSpicy && !isCreatorMode) {
            return (
              <button
                key={t.id}
                className="rm-tab is-locked"
                onClick={() => toast.info('Activa Modo Creator (+18) en Perfil — tap tu avatar arriba')}
              >
                <Lock size={11} />
                {t.label}
              </button>
            );
          }
          return (
            <button
              key={t.id}
              className={`rm-tab ${activeTab === t.id ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setActiveTab(t.id); }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Featured (only on featured tab) */}
      {activeTab === 'featured' && featuredStyles.length > 0 && (
        <section className="rm-section">
          <div className="rm-section-head">
            <span className="rm-eyebrow">Destacados editoriales</span>
            <h3 className="rm-section-title">Lo más <em>editorial</em></h3>
          </div>
          <div className="rm-featured-row">
            {featuredStyles.map(s => {
              const isSelected = selectedStyleIds.includes(s.id);
              const isPrimary = isSelected && selectedStyleIds[0] === s.id;
              return (
                <button
                  key={s.id}
                  className={`rm-featured-card ${isSelected ? 'is-active' : ''}`}
                  onClick={() => toggleStyle(s)}
                >
                  {isPrimary && <span className="rm-primary-pill">PRIMARY</span>}
                  <div className="rm-featured-emoji">{styleEmoji(s)}</div>
                  <div className="rm-featured-name">{s.name}</div>
                  <div className="rm-featured-meta">{SOUL_STYLE_CATEGORIES[s.category]?.label || s.category}</div>
                  {isSelected && (
                    <div className="rm-featured-check">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFCF5" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Style grid */}
      <section className="rm-section">
        <div className="rm-section-head">
          <span className="rm-eyebrow">{visibleStyles.length} estilos</span>
          <h3 className="rm-section-title">{TABS.find(t => t.id === activeTab)?.label}</h3>
        </div>

        {visibleStyles.length === 0 ? (
          <div className="rm-empty-search">
            <p>No encontramos estilos con "{search}"</p>
          </div>
        ) : (
          <div className="rm-style-grid">
            {visibleStyles.map(s => {
              const isSelected = selectedStyleIds.includes(s.id);
              const isPrimary = isSelected && selectedStyleIds[0] === s.id;
              const isLocked = s.category === 'spicy' && !isCreatorMode;
              return (
                <button
                  key={s.id}
                  className={`rm-style-tile ${isSelected ? 'is-active' : ''} ${isLocked ? 'is-locked' : ''}`}
                  onClick={() => toggleStyle(s)}
                  disabled={isLocked}
                >
                  {isPrimary && <span className="rm-primary-pill">PRIMARY</span>}
                  {isLocked && (
                    <div className="rm-style-lock">
                      <Lock size={10} />
                    </div>
                  )}
                  <div className="rm-style-emoji">{styleEmoji(s)}</div>
                  <div className="rm-style-name">{s.name}</div>
                  {s.featured && <div className="rm-style-fav">★</div>}
                  {isSelected && (
                    <div className="rm-style-check">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFCF5" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Custom prompt accordion */}
      <section className="rm-section rm-custom-section">
        <button
          className="rm-custom-toggle"
          onClick={() => {
            hapticLight();
            setShowCustom(v => {
              const next = !v;
              // When opening, scroll the textarea into view above the
              // sticky palette/aspect strips (~260px of overlap area).
              if (next) {
                setTimeout(() => {
                  document.querySelector('.rm-custom-box')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }, 50);
              }
              return next;
            });
          }}
        >
          <Wand2 size={14} />
          <span>Dirección custom</span>
          <ChevronDown size={14} className={showCustom ? 'rm-rotate' : ''} />
        </button>
        {showCustom && (
          <div className="rm-custom-box">
            <textarea
              className="rm-custom-textarea"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Ej: nadando en una piscina infinity con sunset rosa, mood Wes Anderson..."
              rows={3}
              maxLength={400}
              enterKeyHint="send"
              inputMode="text"
            />
            <div className="rm-custom-meta">
              {customPrompt.length} / 400 · Combina con estilos seleccionados
            </div>
          </div>
        )}
      </section>

      {/* Selected tray (sticky above CTA) */}
      {selectedStyles.length > 0 && (
        <div className="rm-tray">
          <div className="rm-tray-label">
            {selectedStyles.length === 1 ? '1 estilo' : `${selectedStyles.length} estilos`}
            {selectedStyles.length > 1 && <span className="rm-tray-hint"> · 1 primary + {selectedStyles.length - 1} accent</span>}
          </div>
          <div className="rm-tray-pills">
            {selectedStyles.map((s, i) => (
              <span key={s.id} className={`rm-tray-pill ${i === 0 ? 'is-primary' : ''}`}>
                {i === 0 && <span className="rm-tray-pill-tag">P</span>}
                <span>{s.name}</span>
                <button
                  className="rm-tray-pill-x"
                  onClick={() => { hapticLight(); setSelectedStyleIds(prev => prev.filter(id => id !== s.id)); }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Palette strip — overrides the outfit color of the chosen style. */}
      <div className="rm-palette-strip" role="radiogroup" aria-label="Paleta de la ropa">
        {PALETTES.map(p => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={paletteId === p.id}
            className={`rm-palette-pill ${paletteId === p.id ? 'is-active' : ''}`}
            onClick={() => { hapticLight(); setPaletteId(p.id); }}
            disabled={generating}
            title={p.label}
          >
            <span className="rm-palette-swatch" style={{ background: p.swatch }} />
            <span className="rm-palette-label">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Aspect ratio strip — feed (3:4) / square (1:1) / reels (9:16) / banner (16:9) */}
      <div className="rm-aspect-strip" role="radiogroup" aria-label="Formato de salida">
        {(['3:4', '1:1', '4:3', '9:16', '16:9'] as const).map(ar => {
          const dim = ar === '3:4' ? { w: 14, h: 18 } : ar === '1:1' ? { w: 16, h: 16 } : ar === '4:3' ? { w: 18, h: 14 } : ar === '9:16' ? { w: 11, h: 18 } : { w: 18, h: 10 };
          return (
            <button
              key={ar}
              type="button"
              role="radio"
              aria-checked={aspectRatio === ar}
              className={`rm-aspect-pill ${aspectRatio === ar ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setAspectRatio(ar); }}
              disabled={generating}
            >
              <span className="rm-aspect-shape" style={{ width: dim.w, height: dim.h }} />
              <span className="rm-aspect-label">{ar}</span>
            </button>
          );
        })}
      </div>

      {/* Floating CTA */}
      <div className="rm-cta-wrap">
        <div className="rm-cta-row">
          <button
            className="rm-cta-secondary"
            onClick={() => { setSelectedStyleIds([]); setCustomPrompt(''); setResultUrl(null); setHistory([]); }}
            aria-label="Reset"
            disabled={generating}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="rm-cta-primary"
            onClick={handleGenerate}
            disabled={generating || !canAfford || (selectedStyleIds.length === 0 && !customPrompt.trim())}
          >
            <span className="rm-cta-cost">{totalCost} cr</span>
            <span className="rm-cta-label">{generating ? 'Generando…' : resultUrl ? 'Otra reimagen' : (premiumTier ? 'Reimaginar Premium' : 'Reimaginar')}</span>
            <span className="rm-cta-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <AppLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

// ─── Styles ────────────────────────────────────

const REIMAGINAR_STYLES = `
.rm-shell {
  --bg-0: #F4EDE0;
  --bg-1: #FAF6EE;
  --bg-card: #FFFCF5;
  --paper: #F2E5D0;
  --ink-0: #1F1A14;
  --ink-1: #3D332A;
  --ink-2: #6F5E4C;
  --ink-3: #A8957D;
  --line: rgba(31, 26, 20, 0.10);
  --line-soft: rgba(31, 26, 20, 0.05);
  --rose: #8B4566;
  --rose-deep: #6B3450;
  --champagne: #C9985A;
  --gold: #D4A85F;
  --ease: cubic-bezier(0.32, 0.72, 0, 1);

  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-0);
  color: var(--ink-0);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  /* Leave room for the stack of sticky elements:
     - CTA wrap (~64px) + aspect strip (~38px) + palette strip (~44px) + tray (~80px when shown)
     - Plus margin so the last accordion ("Dirección custom") clears the palette top. */
  padding-bottom: calc(260px + env(safe-area-inset-bottom));
  background-image:
    radial-gradient(circle at 20% 10%, rgba(31,26,20,0.025) 1px, transparent 1px),
    radial-gradient(circle at 80% 60%, rgba(31,26,20,0.02) 1px, transparent 1px);
  background-size: 28px 28px, 44px 44px;
  position: relative;
}

/* Top bar — migrated to shared AppTopBar. Credits pill kept (still used in rightSlot). */
.rm-shell .rm-credits {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 11px;
  background: var(--bg-card);
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--ink-0); font-weight: 500;
}
.rm-shell .rm-credits-dot { width: 5px; height: 5px; background: var(--champagne); border-radius: 50%; }

/* Hero */
.rm-shell .rm-hero { padding: 6px 20px 0; }
.rm-shell .rm-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-3);
  margin-bottom: 8px;
}
.rm-shell .rm-hero-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 40px; line-height: 0.95;
  letter-spacing: -0.02em; color: var(--ink-0);
  font-weight: 400;
}
.rm-shell .rm-hero-title em { font-style: italic; color: var(--rose); }
.rm-shell .rm-hero-sub {
  margin-top: 12px; font-size: 13px; line-height: 1.55;
  color: var(--ink-2); max-width: 320px;
}

/* Char chip row */
.rm-shell .rm-char-row {
  display: flex; gap: 8px;
  margin: 18px 20px 0;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.rm-shell .rm-char-row::-webkit-scrollbar { display: none; }
.rm-shell .rm-char-chip {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 6px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.3s var(--ease);
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.rm-shell .rm-char-chip:active { transform: scale(0.96); }
.rm-shell .rm-char-chip.is-active {
  background: var(--ink-0);
  border-color: var(--ink-0);
}
.rm-shell .rm-char-chip.is-active .rm-char-name { color: var(--bg-card); }
.rm-shell .rm-char-thumb {
  width: 26px; height: 26px;
  border-radius: 50%;
  background-color: var(--paper);
  background-size: cover; background-position: center;
  flex-shrink: 0;
}
.rm-shell .rm-char-name {
  font-size: 12px; font-weight: 500; color: var(--ink-1);
}
.rm-shell .rm-char-upload-btn {
  border-style: dashed !important;
  border-color: var(--rose) !important;
  color: var(--rose-deep);
}
.rm-shell .rm-char-upload-btn .rm-char-name { color: var(--rose-deep); font-weight: 600; }
.rm-shell .rm-char-thumb-upload {
  background-color: var(--paper) !important;
  display: flex; align-items: center; justify-content: center;
  color: var(--rose);
}
.rm-shell .rm-char-upload {
  position: relative;
  padding-right: 32px;
}
.rm-shell .rm-char-x {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none;
  color: var(--bg-card);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-family: inherit;
}

/* Canvas */
.rm-shell .rm-canvas {
  margin: 18px 20px 0;
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--line);
  aspect-ratio: 4/5;
  box-shadow: 0 16px 32px -16px rgba(31, 26, 20, 0.18);
  display: flex; align-items: center; justify-content: center;
}
.rm-shell .rm-canvas-img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}
.rm-shell .rm-fade-in {
  animation: rm-img-fade-in 380ms var(--ease) both;
}
@keyframes rm-img-fade-in {
  from { opacity: 0; transform: scale(1.04); filter: blur(4px); }
  to   { opacity: 1; transform: scale(1); filter: blur(0); }
}
.rm-shell .rm-canvas-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px;
  color: var(--ink-3);
  font-size: 13px; text-align: center;
}
.rm-shell .rm-canvas-empty-frame {
  width: 88px; height: 88px;
  border-radius: 50%;
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
  color: var(--rose);
  border: 1.5px dashed var(--line);
}
.rm-shell .rm-canvas-loading {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px;
}
.rm-shell .rm-loader-ring {
  width: 88px; height: 88px;
  border-radius: 50%;
  background: var(--paper);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
}
.rm-shell .rm-loader-fill {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(180deg, var(--rose) 0%, var(--rose-deep) 100%);
  transition: height 0.4s var(--ease);
}
.rm-shell .rm-loader-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px; font-weight: 600;
  color: var(--rose-deep);
}
.rm-shell .rm-loader-label { font-size: 12px; color: var(--ink-2); }
.rm-shell .rm-cancel-btn {
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
.rm-shell .rm-canvas-actions {
  position: absolute;
  bottom: 12px; left: 12px; right: 12px;
  display: flex; gap: 6px;
  justify-content: center;
}
.rm-shell .rm-canvas-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 252, 245, 0.94);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 11px; font-weight: 500;
  color: var(--ink-0); text-decoration: none;
  cursor: pointer; font-family: inherit;
  transition: all 0.3s var(--ease);
}
.rm-shell .rm-canvas-btn:active { transform: scale(0.96); }
.rm-shell .rm-canvas-btn-prim {
  background: var(--ink-0);
  color: var(--bg-card);
  border-color: var(--ink-0);
}

/* History */
.rm-shell .rm-history {
  display: flex; gap: 6px;
  margin: 10px 20px 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.rm-shell .rm-history::-webkit-scrollbar { display: none; }
.rm-shell .rm-history-thumb {
  flex-shrink: 0;
  width: 56px; height: 56px;
  border-radius: 10px;
  background-size: cover; background-position: center;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.3s var(--ease);
}
.rm-shell .rm-history-thumb:active { transform: scale(0.94); }
.rm-shell .rm-history-thumb.is-active { border-color: var(--rose); }

/* Search */
.rm-shell .rm-search-wrap {
  margin: 22px 20px 12px;
  position: relative;
  display: flex; align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 0 12px;
}
.rm-shell .rm-search-icon {
  color: var(--ink-3);
  flex-shrink: 0;
}
.rm-shell .rm-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 12px;
  padding-right: 32px;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink-0);
}
.rm-shell .rm-search-input::placeholder { color: var(--ink-3); }
.rm-search-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: transparent; border: none; padding: 4px; cursor: pointer;
  color: var(--ink-3); display: inline-flex; align-items: center; justify-content: center;
}
.rm-search-clear:active { transform: translateY(-50%) scale(0.9); }

/* Tabs (sticky) */
.rm-shell .rm-tabs {
  display: flex; gap: 6px;
  padding: 0 20px;
  margin-bottom: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  position: sticky;
  top: 60px;
  z-index: 20;
  background: var(--bg-0);
  padding-top: 4px;
  padding-bottom: 8px;
}
.rm-shell .rm-tabs::-webkit-scrollbar { display: none; }
.rm-shell .rm-tab {
  flex-shrink: 0;
  padding: 8px 14px;
  min-height: 44px;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 12px; font-weight: 500;
  color: var(--ink-2);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s var(--ease);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  -webkit-tap-highlight-color: transparent;
}
.rm-shell .rm-tab:active { transform: scale(0.95); }
.rm-shell .rm-tab.is-active {
  background: var(--ink-0);
  border-color: var(--ink-0);
  color: var(--bg-card);
}
.rm-shell .rm-tab.is-locked {
  opacity: 0.55;
  background: var(--paper);
}

/* Section */
.rm-shell .rm-section { padding: 18px 20px 0; }
.rm-shell .rm-section-head { margin-bottom: 14px; }
.rm-shell .rm-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-3);
}
.rm-shell .rm-section-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px; letter-spacing: -0.01em;
  color: var(--ink-0); font-weight: 400;
  margin: 4px 0 0; line-height: 1;
}
.rm-shell .rm-section-title em { font-style: italic; }

/* Featured row */
.rm-shell .rm-featured-row {
  display: flex; gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -20px;
  padding: 4px 20px 4px;
  scroll-snap-type: x mandatory;
}
.rm-shell .rm-featured-row::-webkit-scrollbar { display: none; }
.rm-shell .rm-featured-card {
  flex-shrink: 0;
  width: 130px;
  height: 160px;
  position: relative;
  background: var(--bg-card);
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px 14px;
  text-align: left;
  scroll-snap-align: start;
  transition: all 0.3s var(--ease);
  overflow: hidden;
}
.rm-shell .rm-featured-card::before {
  content: '';
  position: absolute;
  top: -30px; right: -30px;
  width: 80px; height: 80px;
  border-radius: 50%;
  background: var(--rose);
  opacity: 0.08;
  filter: blur(20px);
  transition: opacity 0.3s var(--ease);
}
.rm-shell .rm-featured-card:active { transform: scale(0.96); }
.rm-shell .rm-featured-card.is-active {
  border-color: var(--rose);
}
.rm-shell .rm-featured-card.is-active::before { opacity: 0.18; }
.rm-shell .rm-featured-emoji {
  font-size: 26px;
  margin-bottom: auto;
}
.rm-shell .rm-featured-name {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px;
  font-style: italic;
  letter-spacing: -0.01em;
  color: var(--ink-0);
  line-height: 1.05;
}
.rm-shell .rm-featured-meta {
  margin-top: 4px;
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.rm-shell .rm-featured-check {
  position: absolute;
  top: 10px; right: 10px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--rose);
  display: flex; align-items: center; justify-content: center;
}

/* Style grid 3-col */
.rm-shell .rm-style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.rm-shell .rm-style-tile {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg-card);
  border: 1.5px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 6px;
  font-family: inherit;
  transition: all 0.3s var(--ease);
}
.rm-shell .rm-style-tile:not(:disabled):active { transform: scale(0.94); }
.rm-shell .rm-style-tile.is-active {
  border-color: var(--rose);
  background: var(--paper);
}
.rm-shell .rm-style-tile.is-locked {
  opacity: 0.55;
  cursor: not-allowed;
}
.rm-shell .rm-style-emoji {
  font-size: 22px;
  line-height: 1;
}
.rm-shell .rm-style-name {
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-1);
  text-align: center;
  line-height: 1.2;
  padding: 0 2px;
  word-break: break-word;
  hyphens: auto;
}
.rm-shell .rm-style-tile.is-active .rm-style-name { color: var(--rose-deep); font-weight: 600; }
.rm-shell .rm-style-fav {
  position: absolute;
  top: 4px; left: 6px;
  font-size: 8px;
  color: var(--champagne);
}
.rm-shell .rm-style-lock {
  position: absolute;
  top: 4px; right: 4px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: rgba(31, 26, 20, 0.65);
  color: var(--bg-card);
  display: flex; align-items: center; justify-content: center;
}
.rm-shell .rm-style-check {
  position: absolute;
  top: 4px; right: 4px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--rose);
  display: flex; align-items: center; justify-content: center;
}
.rm-primary-pill {
  position: absolute; top: 8px; left: 8px;
  background: var(--rose); color: white;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; letter-spacing: 0.14em;
  padding: 3px 7px; border-radius: 4px;
  z-index: 2;
}

.rm-shell .rm-empty-search {
  text-align: center;
  padding: 30px 20px;
  color: var(--ink-3);
  font-size: 13px;
}

/* Custom prompt */
.rm-shell .rm-custom-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  width: 100%;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-1);
  cursor: pointer;
  transition: border-color 0.3s var(--ease);
}
.rm-shell .rm-custom-toggle:active { border-color: var(--rose); }
.rm-shell .rm-custom-toggle span:nth-of-type(1) { flex: 1; text-align: left; }
.rm-shell .rm-custom-toggle .rm-rotate { transform: rotate(180deg); }
.rm-shell .rm-custom-toggle svg:last-child { transition: transform 0.3s var(--ease); }
.rm-shell .rm-custom-box {
  margin-top: 8px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
}
.rm-shell .rm-custom-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink-0);
  line-height: 1.5;
}
.rm-shell .rm-custom-textarea::placeholder { color: var(--ink-3); }
.rm-shell .rm-custom-meta {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--ink-3);
}

/* Selected tray (above CTA) */
.rm-shell .rm-tray {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 24px);
  max-width: 456px;
  z-index: 41;
  background: rgba(255, 252, 245, 0.96);
  backdrop-filter: blur(12px);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px -8px rgba(31, 26, 20, 0.2);
}
.rm-shell .rm-tray-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--rose-deep);
  margin-bottom: 6px;
}
.rm-shell .rm-tray-hint { color: var(--ink-3); text-transform: none; letter-spacing: 0.05em; }
.rm-shell .rm-tray-pills {
  display: flex; flex-wrap: nowrap; gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 2px;
}
.rm-shell .rm-tray-pills::-webkit-scrollbar { display: none; }
.rm-shell .rm-tray-pill { flex-shrink: 0; }
.rm-shell .rm-tray-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 4px 4px 9px;
  background: var(--paper);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-1);
}
.rm-shell .rm-tray-pill.is-primary {
  background: var(--ink-0);
  color: var(--bg-card);
}
.rm-shell .rm-tray-pill-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  background: var(--rose);
  color: var(--bg-card);
  padding: 1px 4px;
  border-radius: 4px;
  letter-spacing: 0.1em;
}
.rm-shell .rm-tray-pill-x {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: rgba(0,0,0,0.08);
  border: none;
  display: flex; align-items: center; justify-content: center;
  color: inherit;
  cursor: pointer;
}
.rm-shell .rm-tray-pill.is-primary .rm-tray-pill-x { background: rgba(255,255,255,0.18); }

/* Palette strip — horizontal scrollable row of color swatches.
   Sits ABOVE aspect strip. Sticky-fixed near bottom but below aspect. */
.rm-shell .rm-palette-strip {
  position: fixed;
  left: 50%; transform: translateX(-50%);
  bottom: calc(190px + env(safe-area-inset-bottom));
  width: calc(100% - 24px);
  max-width: 456px;
  display: flex; gap: 6px;
  padding: 6px 8px;
  background: rgba(252, 248, 240, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--line);
  border-radius: 999px;
  z-index: 41;
  box-shadow: 0 4px 14px rgba(31, 26, 20, 0.08);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.rm-shell .rm-palette-strip::-webkit-scrollbar { display: none; }
.rm-shell .rm-palette-pill {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px 3px 4px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-1);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.rm-shell .rm-palette-pill:active { transform: scale(0.94); }
.rm-shell .rm-palette-pill.is-active {
  background: var(--ink-0);
  color: var(--bg-card);
}
.rm-shell .rm-palette-pill:disabled { opacity: 0.4; cursor: not-allowed; }
.rm-shell .rm-palette-swatch {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(31, 26, 20, 0.18);
  flex-shrink: 0;
}
.rm-shell .rm-palette-pill.is-active .rm-palette-swatch {
  border-color: var(--bg-card);
}
.rm-shell .rm-palette-label { white-space: nowrap; }

/* Aspect ratio strip (formato salida) — sits above premium + CTA */
.rm-shell .rm-aspect-strip {
  position: fixed;
  left: 50%; transform: translateX(-50%);
  bottom: calc(148px + env(safe-area-inset-bottom));
  width: calc(100% - 24px);
  max-width: 456px;
  display: flex; gap: 4px;
  justify-content: center;
  padding: 4px;
  background: rgba(252, 248, 240, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--line);
  border-radius: 999px;
  z-index: 41;
  box-shadow: 0 4px 14px rgba(31, 26, 20, 0.08);
}
.rm-shell .rm-aspect-pill {
  flex: 1;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  height: 26px;
  padding: 0 5px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--ink-2);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.rm-shell .rm-aspect-pill:active { transform: scale(0.94); }
.rm-shell .rm-aspect-pill.is-active { background: var(--ink-0); color: var(--bg-card); }
.rm-shell .rm-aspect-pill:disabled { opacity: 0.4; cursor: not-allowed; }
.rm-shell .rm-aspect-shape {
  display: inline-block;
  background: currentColor;
  border-radius: 1.5px;
  opacity: 0.7;
}
.rm-shell .rm-aspect-label { font-size: 9px; }

/* Hero Pro switch in topbar — tiny iOS-style toggle next to credits */
.rm-shell .rm-hero-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 9px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s var(--ease);
  -webkit-tap-highlight-color: transparent;
}
.rm-shell .rm-hero-switch:active { transform: scale(0.96); }
.rm-shell .rm-hero-switch:disabled { opacity: 0.45; cursor: not-allowed; }
.rm-shell .rm-hero-switch.is-active {
  background: rgba(212, 168, 95, 0.12);
  border-color: var(--gold);
}
.rm-shell .rm-hero-switch-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--ink-2);
  text-transform: uppercase;
  transition: color 0.2s var(--ease);
}
.rm-shell .rm-hero-switch.is-active .rm-hero-switch-label { color: var(--gold); }
.rm-shell .rm-hero-switch-track {
  width: 22px; height: 13px;
  border-radius: 999px;
  background: var(--line);
  position: relative;
  transition: background 0.2s var(--ease);
  flex-shrink: 0;
}
.rm-shell .rm-hero-switch.is-active .rm-hero-switch-track { background: var(--gold); }
.rm-shell .rm-hero-switch-thumb {
  position: absolute;
  top: 1px; left: 1px;
  width: 11px; height: 11px;
  border-radius: 50%;
  background: var(--bg-card);
  transition: transform 0.2s var(--ease);
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.rm-shell .rm-hero-switch.is-active .rm-hero-switch-thumb {
  transform: translateX(9px);
}

/* Floating CTA */
.rm-shell .rm-cta-wrap {
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
.rm-shell .rm-cta-row {
  display: flex; gap: 10px;
  pointer-events: auto;
}
.rm-shell .rm-cta-secondary {
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
.rm-shell .rm-cta-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
.rm-shell .rm-cta-secondary:not(:disabled):active {
  transform: scale(0.94);
  border-color: var(--rose);
  color: var(--rose-deep);
}
.rm-shell .rm-cta-primary {
  flex: 1;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--rose) 0%, var(--rose-deep) 100%);
  color: #FFFCF5;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px; font-weight: 600;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s var(--ease);
  box-shadow: 0 10px 24px -8px rgba(107, 52, 80, 0.55);
}
.rm-shell .rm-cta-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}
.rm-shell .rm-cta-primary:not(:disabled):active { transform: scale(0.98); }
.rm-shell .rm-cta-primary::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: rm-shimmer 3s var(--ease) infinite;
}
.rm-shell .rm-cta-primary:disabled::before { animation: none; }
@keyframes rm-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.rm-shell .rm-cta-cost {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.18em;
  opacity: 0.78; text-transform: uppercase;
}
.rm-shell .rm-cta-label {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px; font-style: italic;
}
.rm-shell .rm-cta-arrow {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.18);
  display: flex; align-items: center; justify-content: center;
}

/* Empty state */
.rm-shell .rm-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 60px 32px;
  gap: 14px;
}
.rm-shell .rm-empty-icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1.5px dashed var(--line);
  display: flex; align-items: center; justify-content: center;
  color: var(--rose);
  margin-bottom: 4px;
}
.rm-shell .rm-empty-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 28px; line-height: 1.05;
  color: var(--ink-0); font-weight: 400;
  margin: 0;
}
.rm-shell .rm-empty-title em { font-style: italic; color: var(--rose); }
.rm-shell .rm-empty-sub {
  font-size: 13px; color: var(--ink-2);
  max-width: 280px; line-height: 1.5;
  margin: 0;
}
.rm-shell .rm-empty-cta {
  margin-top: 8px;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  background: linear-gradient(135deg, var(--rose) 0%, var(--rose-deep) 100%);
  color: #FFFCF5;
  border: none;
  border-radius: 999px;
  font-size: 13px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 8px 18px -8px rgba(107, 52, 80, 0.5);
}

/* Aperture icon import alias for compat */
`;
// (Re-declared icon alias kept to avoid TS unused warning in JSX block above)
void Aperture;
