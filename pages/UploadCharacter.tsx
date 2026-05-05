import React, { useState, useRef, useEffect } from 'react'
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { generateInfluencerImage, enhancePrompt, expandCharacterChips } from '../services/geminiService'
import { generateWithSoul } from '../services/higgsfieldService'
import { generateWithReplicate } from '../services/replicateService'
import { generateWithOpenAI } from '../services/openaiService'
import { generateWithFal, editImageWithGrokFal } from '../services/falService'
import { ImageSize, AspectRatio, ENGINE_METADATA, FEATURE_ENGINES, AIProvider, ReplicateModel, FalModel, CREDIT_COSTS } from '../types'
import type { InfluencerParams } from '../types'
import { useNavigationStore } from '../stores/navigationStore'
import { usePipelineStore } from '../stores/pipelineStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { PipelineCTA } from '../components/PipelineCTA'
import {
  type ChipOption, ETHNICITIES, HAIR_STYLES, HAIR_COLORS, SKIN_TONES, EYE_COLORS,
  EYE_SHAPES, NOSE_TYPES, LIP_SHAPES, FACE_SHAPES, JAWLINES, EYEBROWS,
  BODY_TYPES, HEIGHTS, BUST_SIZES, WAIST_SIZES, HIP_SIZES, MUSCULATURE, LEG_PROPORTIONS, FACIAL_HAIR, SKIN_DETAILS, MAKEUP_STYLES, SKIN_TEXTURES, GENDERS, AGE_RANGES,
  PERSONALITY_TRAITS, FASHION_STYLES, ACCESSORIES, buildPromptFromChips,
} from '../data/characterChips'
import { SOUL_STYLES, SOUL_STYLES_CURATED, SOUL_STYLE_CATEGORIES, type SoulStyleCategory } from '../data/soulStyles'
import { generateCharacterSheet, enhanceSheetWithGrok, type SheetType } from '../services/toolEngines'
import { LumaSpin } from '../components/ui/luma-spin'

// ─── Character creation engine presets (Soul 2.0 prominent) ──────────
const CHARACTER_ENGINES = [
  { id: 'fal:nb2', label: 'Nano Banana 2', desc: 'JSON structurado, safety 6', badge: 'Recomendado' },
  { id: 'fal:turbo', label: 'Turbo', desc: '~0.3s, orgánico, natural', badge: 'Rápido' },
  { id: 'fal:grok-gen', label: 'Grok Imagine', desc: 'Estético, bold, sin filtros', badge: 'Popular' },
] as const;

// ─── Dynamic setting inference from outfit ─────────────────────────
// Mundane, imperfect, lifestyle-grounded settings (NOT cinematic/editorial)
const OUTFIT_SETTINGS: Record<string, string> = {
  'bikini': 'sitting on a slightly faded beach towel, cluttered sand, harsh midday sun',
  'swimwear': 'standing by a public pool with chain-link fence in background, flat afternoon light',
  'beach': 'walking along a crowded ordinary beach, overcast sky, sandals in hand',
  'leather': 'waiting at a crosswalk on an overcast day, out of focus cars passing by',
  'punk': 'leaning against a bus stop with peeling posters, flat gray daylight',
  'grunge': 'sitting on concrete steps outside a corner store, slightly overexposed',
  'streetwear': 'walking through a busy ordinary sidewalk, blurred pedestrians behind',
  'business': 'stepping out of a regular office building, glass doors reflecting sky',
  'suit': 'standing on an ordinary downtown sidewalk waiting for an Uber, phone in hand',
  'formal': 'standing in a hotel hallway with patterned carpet, overhead fluorescent mixed with window light',
  'gala': 'getting out of a car at night, flash from a nearby phone, slightly blown highlights',
  'sporty': 'catching breath at an ordinary neighborhood park, slightly sweaty, morning light',
  'athleisure': 'ordering at a coffee counter, warm indoor light, slightly out of focus menu board behind',
  'cottagecore': 'sitting on a wooden porch with a chipped paint railing, dappled afternoon shade',
  'bohemian': 'browsing at a flea market stall, cluttered vintage items around, diffused overcast light',
  'cowboy': 'leaning on a dusty pickup truck at a gas station, harsh desert sun',
  'western': 'standing on a dirt road shoulder, flat dry landscape, squinting in bright sun',
  'kimono': 'walking through an ordinary residential street in Japan, vending machines visible, soft cloudy day',
  'lingerie': 'messy bedroom with clothes on a chair, unmade bed, natural window light',
  'casual': 'sitting at an outdoor plastic table at a taco stand, string lights overhead',
}
const FALLBACK_SETTINGS = [
  'leaning against a brick wall on an ordinary side street, flat overcast light',
  'sitting on a park bench with a takeout coffee, pigeons nearby, morning light',
  'waiting in line at a grocery store entrance, automatic doors half-open',
  'standing at a bus stop with a backpack, slightly bored expression, cloudy day',
  'walking through a parking lot toward a mall entrance, cart return in background',
  'sitting on apartment building front steps, neighbors door slightly ajar, afternoon shade',
]

function inferSetting(outfitDesc: string): string {
  const lower = outfitDesc.toLowerCase()
  for (const [keyword, setting] of Object.entries(OUTFIT_SETTINGS)) {
    if (lower.includes(keyword)) return setting
  }
  return FALLBACK_SETTINGS[Math.floor(Math.random() * FALLBACK_SETTINGS.length)]
}

// ─── Render styles ───────────────────────────────────────────────────
// Phase 1 (Creator) = reference sheet with neutral background.
const CREATOR_BG = 'Character reference sheet, centered composition, solid light grey background, clean flat studio lighting, no background elements, no props'

// Substyle suffix is appended to the parent style's prompt to specialize the look.
type Substyle = { id: string; label: string; icon: string; suffix: string; desc?: string }

// Helper: thumbnail URL for a style/substyle. Generated by scripts/generate-style-thumbnails.mjs
const styleThumb = (id: string) => `/style-previews/${id}.jpg`

const renderStyles: Array<{
  id: string; label: string; icon: string; desc: string;
  prompt: string; scenario: string; bg: string;
  suffix?: string;
  substyles?: Substyle[];
}> = [
  { id:'photorealistic', label:'Fotorrealista', icon:'📷', desc:'Aspecto humano, fotografía de estudio',
    prompt:'Ultra-photorealistic digital human, indistinguishable from photograph, shot on Phase One IQ4 150MP with Schneider 110mm f/2.8, natural skin with visible pores and subsurface blood flow, accurate eye moisture, individual hair strand rendering, physically-based material response,',
    scenario: CREATOR_BG,
    bg:'linear-gradient(135deg, #f0b86020, #d4956b10)',
    substyles: [
      { id:'editorial', label:'Editorial', icon:'📰', desc:'Vogue, Harper\'s Bazaar', suffix:'Vogue magazine cover quality, editorial high-fashion lighting, clean studio backdrop, pristine retouching aesthetic.' },
      { id:'cinematic', label:'Cinematic', icon:'🎬', desc:'Roger Deakins, anamorphic', suffix:'Cinematic film aesthetic, anamorphic lens flares, Roger Deakins lighting, color graded film LUT, subtle film grain.' },
      { id:'ugc', label:'UGC / iPhone', icon:'📱', desc:'Selfie, golden hour', suffix:'Authentic iPhone selfie aesthetic, slight motion blur, golden hour warm light, candid feel, social media ready.' },
      { id:'studio-beauty', label:'Studio Beauty', icon:'💄', desc:'Softbox, ringlight', suffix:'Beauty studio lighting with softbox and ringlight, flawless makeup, glossy highlights, editorial beauty photography.' },
      { id:'documentary', label:'Documentary', icon:'📸', desc:'35mm, candid', suffix:'Documentary photojournalism, 35mm film, available natural light, unposed candid moment, real environment.' },
      { id:'street', label:'Street', icon:'🏙️', desc:'Daido Moriyama, contrast', suffix:'Street photography, high contrast B&W or muted color, gritty urban environment, Daido Moriyama / Saul Leiter influence.' },
    ] },
  { id:'anime', label:'Anime / Manga', icon:'🎨', desc:'Estilo de animación japonesa',
    prompt:'Premium anime character, Production I.G / studio Bones quality, clean precise linework with variable stroke weight, cel-shaded with sophisticated shadow gradients, luminous multi-layered iris reflections, stylized proportions, dynamic hair strand groups,',
    scenario: CREATOR_BG + ', drawn in high-end anime style',
    bg:'linear-gradient(135deg, #e8749a15, #9a90c415)',
    substyles: [
      { id:'shonen', label:'Shonen Action', icon:'⚔️', desc:'Demon Slayer, JJK', suffix:'Shonen action anime, bold dynamic linework, dramatic shadows, Demon Slayer / Jujutsu Kaisen aesthetic, intense expressions.' },
      { id:'shojo', label:'Shojo Romance', icon:'🌸', desc:'Sailor Moon, Fruits Basket', suffix:'Shojo manga aesthetic, soft pastel palette, sparkly eyes with floral motifs, Sailor Moon / Fruits Basket vibe.' },
      { id:'ghibli', label:'Studio Ghibli', icon:'🍃', desc:'Mononoke, Chihiro', suffix:'Studio Ghibli watercolor aesthetic, hand-painted backgrounds, soft warm color palette, Mononoke / Spirited Away inspired.' },
      { id:'seinen', label:'Seinen Realista', icon:'🗡️', desc:'Vagabond, Berserk', suffix:'Seinen manga realism, detailed crosshatching shading, mature aesthetic, Vagabond / Berserk influence, painterly ink.' },
      { id:'cyberpunk-anime', label:'Cyberpunk Anime', icon:'🌆', desc:'Akira, GitS, Edgerunners', suffix:'Cyberpunk anime aesthetic, neon city lights, Akira / Ghost in the Shell / Edgerunners influence, holographic accents.' },
      { id:'manga-bw', label:'Manga B&N', icon:'📖', desc:'Sin color, ink panel', suffix:'Black and white manga panel, screentone shading, clean ink lineart, no color, comic book aesthetic.' },
      { id:'gacha', label:'Genshin / Gacha', icon:'⭐', desc:'Cel-shaded vibrante', suffix:'Genshin Impact / Honkai Star Rail aesthetic, vibrant cel-shading, jewel-tone palette, gacha character design.' },
      { id:'trigger', label:'Studio Trigger', icon:'⚡', desc:'Kill la Kill, Promare', suffix:'Studio Trigger aesthetic, bold flat colors, dynamic pose, Kill la Kill / Promare visual language, exaggerated expressions.' },
    ] },
  { id:'3d-render', label:'Render 3D', icon:'🖥️', desc:'CGI, estilo Pixar, personaje de juego',
    prompt:'AAA game-quality 3D character render, Unreal Engine 5 quality, high-poly sculpted mesh, PBR material workflow on all surfaces, subsurface scattering skin shader with detail maps, strand-based groomed hair, HDRI environment lighting with ray-traced AO,',
    scenario: CREATOR_BG + ', rendered in Octane/Unreal Engine 5',
    bg:'linear-gradient(135deg, #4858e015, #50d8a010)',
    substyles: [
      { id:'pixar', label:'Pixar / Disney', icon:'🎈', desc:'Toy Story, Encanto', suffix:'Pixar / Disney 3D animation aesthetic, soft warm lighting, expressive features, Encanto / Toy Story / Soul style.' },
      { id:'spiderverse', label:'Spider-Verse', icon:'🕸️', desc:'Comic + 3D híbrido', suffix:'Spider-Verse aesthetic, comic halftone shading layered over 3D, chromatic aberration, bold ink outlines, Mitchells / Spider-Verse hybrid look.' },
      { id:'arcane', label:'Arcane / Mitchells', icon:'🎨', desc:'Painterly + 3D', suffix:'Arcane Netflix aesthetic, painted texture overlays on 3D mesh, painterly brushstroke detail, Mitchells vs Machines influence.' },
      { id:'unreal', label:'Unreal Engine 5', icon:'🎮', desc:'AAA realista', suffix:'Unreal Engine 5 Nanite render, photorealistic AAA game character, MetaHuman quality, realistic skin shader.' },
      { id:'blender-stylized', label:'Blender Stylized', icon:'🟧', desc:'Low-poly aesthetic', suffix:'Blender stylized 3D, light low-poly aesthetic, soft toon shader, hand-crafted indie game character feel.' },
      { id:'octane-hyper', label:'Octane Hyper', icon:'💎', desc:'CGI ultra-realista', suffix:'Octane render hyperrealistic CGI, glossy hyper-detailed skin, ray-traced reflections, advertising commercial quality.' },
    ] },
  { id:'illustration', label:'Ilustración', icon:'✍️', desc:'Arte digital, concept art',
    prompt:'High-end digital character illustration, concept art portfolio quality, painterly technique blending precise linework with expressive color blocking, sophisticated light study with warm/cool shifts, character design clarity with strong silhouette,',
    scenario: CREATOR_BG + ', art book presentation quality',
    bg:'linear-gradient(135deg, #f0b86015, #e8725c10)',
    substyles: [
      { id:'watercolor', label:'Acuarela', icon:'🎨', desc:'Soft edges, painterly', suffix:'Watercolor illustration aesthetic, soft bleeding edges, paper texture, traditional watercolor wash technique.' },
      { id:'ink', label:'Tinta / Inktober', icon:'🖋️', desc:'B&N, hatching', suffix:'Ink illustration, black and white, intricate crosshatching, brush ink linework, Inktober challenge aesthetic.' },
      { id:'concept-art', label:'Concept Art', icon:'🏰', desc:'Painterly, ArtStation', suffix:'AAA concept art quality, painterly brushwork, ArtStation portfolio aesthetic, character design sheet style.' },
      { id:'childrens-book', label:'Cuento Infantil', icon:'📚', desc:'Soft, friendly', suffix:'Children\'s picture book illustration, soft friendly aesthetic, warm palette, hand-painted children\'s book style.' },
      { id:'editorial-illust', label:'Editorial Illustr.', icon:'📰', desc:'NYT, New Yorker', suffix:'Editorial illustration, NYT / New Yorker aesthetic, simplified shapes, conceptual minimalist style, limited palette.' },
      { id:'comic', label:'Comic / Cómic', icon:'💥', desc:'Bold ink + flat color', suffix:'Comic book illustration, bold ink outlines, flat saturated colors, halftone dot shading, Marvel / DC aesthetic.' },
    ] },
  { id:'stylized', label:'Estilizado', icon:'✨', desc:'Semi-realista, Arcane / Spider-Verse',
    prompt:'Distinctive stylized character with exaggerated design language, Arcane/Spider-Verse quality, strong graphic silhouette with memorable proportions, bold shape language defining personality, limited palette with strategic accent pops,',
    scenario: CREATOR_BG + ', cel-shaded with painterly details',
    bg:'linear-gradient(135deg, #4f46e515, #f0684815)',
    substyles: [
      { id:'spiderverse-styl', label:'Spider-Verse', icon:'🕷️', desc:'Halftone + chromatic', suffix:'Spider-Verse stylization, comic halftone overlay, chromatic aberration, bold ink linework, comic-style speed lines.' },
      { id:'arcane-styl', label:'Arcane', icon:'🔮', desc:'Painterly + 3D híbrido', suffix:'Arcane Netflix stylization, painterly textures over 3D base, hand-painted brushstroke detail.' },
      { id:'klaus', label:'Klaus / Mitchells', icon:'❄️', desc:'Hand-painted feel', suffix:'Klaus / Mitchells aesthetic, hand-painted feel with 3D depth, warm ambient lighting, illustrative texture.' },
      { id:'edgerunners', label:'Edgerunners', icon:'⚡', desc:'Neon + cel-shade', suffix:'Cyberpunk Edgerunners stylization, neon glow accents, cel-shaded with bold outlines, vibrant chromatic palette.' },
      { id:'soft-anime', label:'Soft Anime', icon:'☁️', desc:'Cel-shaded suave', suffix:'Soft anime cel-shading, bright pastel palette, gentle gradient lighting, Genshin / lighter cel-shade aesthetic.' },
    ] },
  { id:'pixel-art', label:'Pixel Art', icon:'🟨', desc:'Retro 8-bit / 16-bit',
    suffix: '16-bit retro game quality, limited color palette, pixelated, NOT smooth, NOT photorealistic',
    prompt:'Pixel art character sprite, 64-128px base resolution, limited 32-color palette, intentional dithering, clear silhouette,',
    scenario: CREATOR_BG + ', pixelated throughout, retro game aesthetic',
    bg:'linear-gradient(135deg, #50d8a015, #4858e010)',
    substyles: [
      { id:'8bit', label:'8-bit NES', icon:'🎮', desc:'NES era, paleta limitada', suffix:'8-bit NES era pixel art, ultra limited 16-color palette, chunky pixels, retro 1980s arcade aesthetic.' },
      { id:'16bit', label:'16-bit SNES', icon:'🕹️', desc:'FFVI, Chrono Trigger', suffix:'16-bit SNES era pixel art, Chrono Trigger / Final Fantasy VI quality, expressive sprites, rich palette.' },
      { id:'modern-pixel', label:'Modern Pixel', icon:'🌾', desc:'Stardew, Celeste', suffix:'Modern pixel art aesthetic, Stardew Valley / Celeste quality, expressive limited palette, smooth animation feel.' },
      { id:'hd-2d', label:'HD-2D', icon:'⭐', desc:'Octopath Traveler', suffix:'HD-2D aesthetic, Octopath Traveler style, pixel art characters with 3D environments and dramatic lighting.' },
    ] },
]

// ─── Chip Selector component ────────────────────────────────────────
const ChipSelector = ({
  options, selected, onSelect, maxSelect = 1,
}: {
  options: ChipOption[]; selected: string[]; onSelect: (ids: string[]) => void;
  maxSelect?: number; color?: string;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(chip => {
      const active = selected.includes(chip.id)
      return (
        <button key={chip.id} onClick={() => {
          if (maxSelect === 1) {
            onSelect([chip.id])
          } else {
            onSelect(active
              ? selected.filter(id => id !== chip.id)
              : selected.length < maxSelect ? [...selected, chip.id] : selected
            )
          }
        }}
          className="px-3 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5"
          style={{
            background: active ? '#1A1A1A' : 'white',
            border: `1px solid ${active ? '#1A1A1A' : 'rgba(0,0,0,0.08)'}`,
            color: active ? '#FFF' : '#444',
            minHeight: 44,
          }}>
          {chip.color
            ? <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: chip.color, border: active ? '1px solid rgba(255,255,255,.5)' : '1px solid rgba(0,0,0,.1)', flexShrink: 0 }} />
            : <span className="text-[12px]">{chip.emoji}</span>
          }
          {chip.label}
        </button>
      )
    })}
  </div>
)

// ─── Main component ─────────────────────────────────────────────────
export function UploadCharacter({ onNav }: { onNav?: (page: string) => void }) {
  // Mode
  const [mode, setMode] = useState<'create' | 'import'>('import')
  const [step, setStep] = useState(0)

  // Step 0 — Base
  const [selRenderStyle, setSelRenderStyle] = useState(0)
  // Substyle id (e.g. 'editorial', 'shonen', 'spiderverse'). null = use parent style only.
  const [selSubstyle, setSelSubstyle] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [selGender, setSelGender] = useState<string | null>(null)
  const [selAge, setSelAge] = useState<string | null>(null)

  // Step 1 — Look
  const [activeTab, setActiveTab] = useState<'builder' | 'prompt'>('builder')
  // Step 2 internal sub-tabs to reduce scroll length
  const [appearanceTab, setAppearanceTab] = useState<'face' | 'hair' | 'skin' | 'body'>('face')
  // Substyle section is collapsed by default — opt-in for users who want fine control.
  // Auto-expands when user picks a substyle (e.g. via Quick Start template).
  const [substyleExpanded, setSubstyleExpanded] = useState(false)
  useEffect(() => { if (selSubstyle) setSubstyleExpanded(true) }, [selSubstyle])
  const [chipSelections, setChipSelections] = useState<Record<string, string[]>>({
    ethnicity: [], hairStyle: [], hairColor: [], skinTone: [], eyeColor: [],
    eyeShape: [], noseType: [], lipShape: [], faceShape: [], jawline: [], eyebrows: [],
    bodyType: [], height: [], bust: [], waist: [], hips: [], musculature: [], legs: [], facialHair: [], skinDetails: [], makeup: [], skinTexture: [],
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [promptText, setPromptText] = useState('')
  // Cache the expanded description so regenerations don't re-expand
  const [lockedExpansion, setLockedExpansion] = useState<string | null>(null)
  const [useEnhancer, setUseEnhancer] = useState(() => {
    try { return localStorage.getItem('vist-enhancer') !== 'off' } catch { return true }
  })
  const [enhancing, setEnhancing] = useState(false)
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])

  // Step 2 — Style
  const [selFashion, setSelFashion] = useState<string[]>([])
  const [selPersonality, setSelPersonality] = useState<string[]>([])
  const [selectedSoulStyle, setSelectedSoulStyle] = useState<string | null>(null)
  const [soulStyleCategory, setSoulStyleCategory] = useState<SoulStyleCategory | 'all'>('all')
  const [showAllStyles, setShowAllStyles] = useState(false)
  const [selAccessories, setSelAccessories] = useState<string[]>([])

  // Generation
  const [variants, setVariants] = useState<string[]>([])
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  // Refinement-with-words state — lets user tweak the generated portrait without regenerating
  const [refinePrompt, setRefinePrompt] = useState('')
  const [refining, setRefining] = useState(false)
  const [refineProgress, setRefineProgress] = useState(0)
  const [sheetResults, setSheetResults] = useState<{
    face: string | null; body: string | null; expressions: string | null;
    faceUltra: string | null; expressionsUltra: string | null;
  }>({ face: null, body: null, expressions: null, faceUltra: null, expressionsUltra: null })
  const [sheetGenerating, setSheetGenerating] = useState<string | null>(null)
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'generating' | 'picking' | 'sheet' | 'done'>('idle')
  const [generating, setGenerating] = useState(false)
  const [characterSaved, setCharacterSaved] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  // Engine
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [selectedResolution, setSelectedResolution] = useState('1k')
  const [showEngineModal, setShowEngineModal] = useState(false)

  // Import mode
  const [importName, setImportName] = useState('')
  const [importBio, setImportBio] = useState('')
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)

  // Stores
  const addCharacter = useCharacterStore(s => s.addCharacter)
  const { decrementCredits, restoreCredits } = useProfile()
  const toast = useToast()
  const { pendingImage, pendingTarget, consume: consumeNav } = useNavigationStore()

  // Consume pending navigation (e.g. from Gallery -> Upload)
  useEffect(() => {
    if (pendingTarget === 'create' && pendingImage) {
      setMode('import')
      fetch(pendingImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'from-gallery.png', { type: blob.type || 'image/png' })
          setImportFiles(prev => [...prev, file])
        })
        .catch(() => {})
      consumeNav()
    }
  }, [pendingTarget, pendingImage])

  // ─── Reset generation (discard result and start over) ────────────
  const resetGeneration = () => {
    setGenerationPhase('idle')
    setVariants([])
    setSelectedVariant(null)
    setSheetResults({ face: null, body: null, expressions: null, faceUltra: null, expressionsUltra: null })
    setCharacterSaved(false)
    setSheetGenerating(null)
    setLockedExpansion(null) // clear enhancer cache so next generation gets fresh expansion
  }

  const resetAll = () => {
    resetGeneration()
    setLockedExpansion(null)
    setName('')
    setStep(0)
    setSelGender(null)
    setSelAge(null)
    setSelRenderStyle(0)
    setSelSubstyle(null)
    setChipSelections({
      ethnicity: [], hairStyle: [], hairColor: [], skinTone: [], eyeColor: [],
      eyeShape: [], noseType: [], lipShape: [], faceShape: [], jawline: [], eyebrows: [],
      bodyType: [], height: [], bust: [], waist: [], hips: [], musculature: [], legs: [], facialHair: [], skinDetails: [], makeup: [], skinTexture: [],
    })
    setSelFashion([])
    setSelAccessories([])
    setSelPersonality([])
    setReferenceFiles([])
    setPromptText('')
    setSelectedSoulStyle(null)
    setSoulStyleCategory('all')
    setShowAllStyles(false)
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  const updateChip = (category: string, ids: string[]) => {
    setChipSelections(prev => ({ ...prev, [category]: ids }))
  }

  const steps = ['Base', 'Apariencia', 'Estilo y Personalidad']
  const isPhotorealistic = renderStyles[selRenderStyle]?.id === 'photorealistic'

  // Build the full prompt for generation.
  // NOTE: substyle suffix is NOT included here — it goes into params.imageBoost,
  // which feeds NB2's `aesthetic_context.art_style` JSON field (semantically correct
  // for style instructions). Including it here would duplicate it as a "physical trait"
  // in the structured prompt.
  const buildFullPrompt = (): string => {
    const style = renderStyles[selRenderStyle]
    const parts: string[] = [style.prompt]

    // Gender + Age
    const genderChip = GENDERS.find(g => g.id === selGender)
    const ageChip = AGE_RANGES.find(a => a.id === selAge)
    if (genderChip) parts.push(genderChip.promptText)
    if (ageChip) parts.push(ageChip.promptText)

    // Appearance: Builder chips or Prompt text
    if (activeTab === 'prompt' && promptText.trim()) {
      parts.push(promptText.trim())
    } else {
      const chipPrompt = buildPromptFromChips(chipSelections)
      if (chipPrompt) parts.push(chipPrompt)
    }

    // Fashion
    if (selFashion.length > 0) {
      const fashionPrompt = buildPromptFromChips({ fashion: selFashion })
      if (fashionPrompt) parts.push(fashionPrompt)
    }
    // Personality
    if (selPersonality.length > 0) {
      const personalityPrompt = buildPromptFromChips({ personality: selPersonality })
      if (personalityPrompt) parts.push(personalityPrompt)
    }
    // Accessories
    if (selAccessories.length > 0) {
      const accPrompt = buildPromptFromChips({ accessories: selAccessories })
      if (accPrompt) parts.push(accPrompt)
    }

    return parts.filter(Boolean).join(', ')
  }

  // Soul 2.0-friendly prompt — no camera/lens jargon, just natural character description
  const buildSoulPrompt = (): string => {
    const parts: string[] = []
    // Substyle suffix specializes the rendering aesthetic
    const style = renderStyles[selRenderStyle]
    const substyle = style?.substyles?.find(s => s.id === selSubstyle)
    if (substyle) parts.push(substyle.suffix)
    const genderChip = GENDERS.find(g => g.id === selGender)
    const ageChip = AGE_RANGES.find(a => a.id === selAge)
    if (genderChip) parts.push(genderChip.promptText)
    if (ageChip) parts.push(ageChip.promptText)
    if (activeTab === 'prompt' && promptText.trim()) {
      parts.push(promptText.trim())
    } else {
      const chipPrompt = buildPromptFromChips(chipSelections)
      if (chipPrompt) parts.push(chipPrompt)
    }
    return parts.filter(Boolean).join(', ')
  }

  // ─── Engine cost & routing ──────────────────────────────────────
  const engineMeta = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
  // Credit cost considers engine + resolution
  const baseCost = engineMeta?.creditCost ?? CREDIT_COSTS[FalModel.NanoBanana2] ?? 13
  const resMultiplier = selectedResolution === '4k' ? 2 : selectedResolution === '2k' ? 1.5 : 1
  const costPerVariant = Math.ceil(baseCost * resMultiplier)

  const routeGeneration = async (params: InfluencerParams): Promise<string[]> => {
    if (!engineMeta || selectedEngine === 'auto') {
      // Pure text-to-image NB2 → Grok cascade. Substyle suffix is already woven into
      // the prompt via buildFullPrompt() / buildSoulPrompt() — no image reference needed.
      try {
        return await generateWithFal(params, FalModel.NanoBanana2)
      } catch (nb2Err) {
        console.warn('NB2 fal creator failed, trying Grok:', nb2Err)
        return generateWithFal(params, FalModel.GrokImagineGen)
      }
    }
    if (engineMeta.provider === AIProvider.Higgsfield) {
      return generateWithSoul(params, () => {})
    }
    if (engineMeta.provider === AIProvider.Replicate) {
      return generateWithReplicate(params, engineMeta.replicateModel, () => {})
    }
    if (engineMeta.provider === AIProvider.OpenAI) {
      return generateWithOpenAI(params, engineMeta.openaiModel, () => {})
    }
    if (engineMeta.provider === AIProvider.Fal) {
      return generateWithFal(params, engineMeta.falModel, () => {})
    }
    return generateInfluencerImage(params, () => {})
  }

  // ─── Generate variants ───────────────────────────────────────────
  const handleGenerate = async () => {
    if (!name.trim()) { toast.error('Ingresa un nombre para el personaje'); return }

    const cost = costPerVariant
    setGenerating(true)
    setGenerationPhase('generating')
    setVariants([])
    setSelectedVariant(null)
    setSheetResults({ face: null, body: null, expressions: null, faceUltra: null, expressionsUltra: null })
    setSheetGenerating(null)
    setCharacterSaved(false)

    const style = renderStyles[selRenderStyle]
    const isSoul = engineMeta?.provider === AIProvider.Higgsfield
    let fullPrompt = isSoul ? buildSoulPrompt() : buildFullPrompt()

    // Expand generic chips into specific visual descriptors via Gemini Flash.
    // Passes render style so Flash adapts detail level (photorealistic=anatomy, anime=simple shapes).
    if (useEnhancer) {
      if (lockedExpansion && variants.length > 0) {
        fullPrompt = lockedExpansion
      } else {
        try {
          const outfitDesc = selFashion.map(id => FASHION_STYLES.find(f => f.id === id)?.promptText || '').filter(Boolean).join(', ')
          const accDesc = selAccessories.map(id => ACCESSORIES.find(a => a.id === id)?.label || '').filter(Boolean).join(', ')
          const expanded = await expandCharacterChips(fullPrompt, outfitDesc, accDesc, style.id)
          if (expanded && expanded.length > 20) {
            fullPrompt = expanded
            setLockedExpansion(expanded)
          }
        } catch { /* keep original if expansion fails */ }
      }
    }

    const results: string[] = []
    let failCount = 0

    // Generate 1 preview image
    const ok = await decrementCredits(cost)
    if (!ok) {
      toast.error('Créditos insuficientes')
      setGenerating(false)
      setGenerationPhase('idle')
      return
    }

    try {
      // imageBoost feeds into NB2's `aesthetic_context.art_style` JSON field, Grok's
      // "Style:" prefix, and other models' style anchor. ALWAYS include the parent
      // style prompt — NB2's default fallback is too generic for any non-default style.
      // For photorealistic with no substyle, the rich photoreal prompt (Phase One,
      // visible pores, subsurface scattering) is what makes the difference.
      const substyleObj = style.substyles?.find(s => s.id === selSubstyle)
      const composedBoost = substyleObj
        ? `${substyleObj.suffix} ${style.prompt}`
        : style.prompt

      const params: InfluencerParams = {
        characters: [{
          id: crypto.randomUUID(),
          characteristics: fullPrompt,
          outfitDescription: selFashion.map(id => FASHION_STYLES.find(f => f.id === id)?.promptText || '').filter(Boolean).join(', '),
          pose: 'Standing casual, facing camera, portrait shot',
          accessory: selAccessories.map(id => ACCESSORIES.find(a => a.id === id)?.label || '').filter(Boolean).join(', '),
        }],
        scenario: style.scenario, // All styles now use CREATOR_BG (neutral reference sheet)
        lighting: isSoul ? 'Natural soft studio lighting' : (style.id === 'anime' ? 'Flat anime lighting, cel-shaded' : style.id === 'pixel-art' ? 'Flat pixel art lighting' : 'Soft studio lighting'),
        imageSize: selectedResolution === '4k' ? ImageSize.Size4K : selectedResolution === '2k' ? ImageSize.Size2K : ImageSize.Size1K,
        aspectRatio: AspectRatio.Portrait,
        numberOfImages: 1,
        realistic: style.id === 'photorealistic',
        imageBoost: composedBoost,
        negativePrompt: [
          style.id === 'photorealistic' ? 'plastic skin, airbrushed skin, wax figure, CGI render, overly smooth face, doll-like, mannequin' : '',
          'brand names, branded products, Coca-Cola, corporate logos, product placement, holding random objects, holding drinks, holding food, holding phone',
        ].filter(Boolean).join(', '),
      }

      const genResults = await routeGeneration(params)
      if (genResults.length > 0) {
        setVariants([genResults[0]])
        setSelectedVariant(0)
        setGenerationPhase('picking')
      } else {
        restoreCredits(cost)
        toast.error('Generación fallida — intenta de nuevo')
        setGenerationPhase('idle')
      }
    } catch (err: any) {
      restoreCredits(cost)
      const msg = err?.message || err?.toString() || 'Error desconocido'
      toast.error(`Error: ${msg.slice(0, 120)}`)
      console.error('Character generation error:', err)
      setGenerationPhase('idle')
    }

    setGenerating(false)
  }

  // ─── Refine with words — quick edit of selected variant ────────
  const REFINE_CREDIT_COST = 10
  const handleRefineVariant = async () => {
    if (selectedVariant === null) return
    const prompt = refinePrompt.trim()
    if (!prompt) { toast.error('Escribe qué cambiar (ej: "ojos verdes", "cabello más corto")'); return }
    const ok = await decrementCredits(REFINE_CREDIT_COST)
    if (!ok) { toast.error('Créditos insuficientes'); return }
    setRefining(true); setRefineProgress(0)
    try {
      const url = variants[selectedVariant]
      const blob = await (await fetch(url)).blob()
      const baseFile = new File([blob], 'variant.png', { type: blob.type || 'image/png' })
      const { editImageWithGrokFal, editWithNB2Fal } = await import('../services/falService')
      let resultUrls: string[] = []
      try {
        resultUrls = await editWithNB2Fal(baseFile, prompt, [], p => setRefineProgress(p))
        if (!resultUrls.length) throw new Error('NB2 empty')
      } catch {
        resultUrls = await editImageWithGrokFal(baseFile, prompt, p => setRefineProgress(p))
      }
      if (resultUrls.length === 0) throw new Error('No se generó imagen')
      // Replace the variant in place
      setVariants(prev => prev.map((u, i) => i === selectedVariant ? resultUrls[0] : u))
      setRefinePrompt('')
      toast.success('Refinado aplicado')
    } catch (err: any) {
      restoreCredits(REFINE_CREDIT_COST)
      const msg = String(err?.message || err)
      if (/ValidationError|content_policy|no_media_generated/i.test(msg)) {
        toast.error('Combinación rechazada por moderación. Créditos restaurados.')
      } else {
        toast.error('Error al refinar — créditos restaurados')
      }
    } finally {
      setRefining(false); setRefineProgress(0)
    }
  }

  // ─── Character Sheet Pipeline (progressive) ────────────────────
  const SHEET_CREDIT_COST = 2
  const ULTRA_CREDIT_COST = 2

  const handleGenerateSheet = async (type: SheetType) => {
    if (selectedVariant === null) return
    const ok = await decrementCredits(SHEET_CREDIT_COST)
    if (!ok) { toast.error('Créditos insuficientes'); return }

    setSheetGenerating(type)
    setGenerationPhase('sheet')

    try {
      // Extract physical traits for body sheet accuracy
      const bodyChipMap: Record<string, ChipOption[]> = { bodyType: BODY_TYPES, height: HEIGHTS, bust: BUST_SIZES, waist: WAIST_SIZES, hips: HIP_SIZES, musculature: MUSCULATURE, legs: LEG_PROPORTIONS }
      const physicalTraits = Object.entries(bodyChipMap)
        .flatMap(([key, options]) => (chipSelections[key] || []).map(id => options.find(o => o.id === id)?.promptText).filter(Boolean))
        .join('. ')
      const url = await generateCharacterSheet(variants[selectedVariant], type, physicalTraits || undefined)
      setSheetResults(prev => ({ ...prev, [type]: url }))
    } catch {
      restoreCredits(SHEET_CREDIT_COST)
      toast.error(`Error al generar hoja de ${type}`)
    }

    setSheetGenerating(null)
  }

  const handleUltraEnhance = async (type: 'face' | 'expressions') => {
    const sourceUrl = sheetResults[type]
    if (!sourceUrl) return
    const ok = await decrementCredits(ULTRA_CREDIT_COST)
    if (!ok) { toast.error('Créditos insuficientes'); return }

    const ultraKey = `${type}Ultra` as const
    setSheetGenerating(ultraKey)

    try {
      const url = await enhanceSheetWithGrok(sourceUrl, type)
      setSheetResults(prev => ({ ...prev, [ultraKey]: url }))
    } catch {
      restoreCredits(ULTRA_CREDIT_COST)
      toast.error(`Error al mejorar hoja de ${type}`)
    }

    setSheetGenerating(null)
  }

  // ─── Save character ──────────────────────────────────────────────
  const handleSave = async () => {
    if (selectedVariant === null) return
    const sheetUrls = [
      sheetResults.faceUltra || sheetResults.face,
      sheetResults.body,
      sheetResults.expressionsUltra || sheetResults.expressions,
    ].filter(Boolean) as string[]
    const allPhotoUrls = [variants[selectedVariant], ...sheetUrls]

    // Fetch blobs fault-tolerantly: a failed sheet URL returns null and is
    // filtered out so the character save still proceeds with partial data.
    const modelImageBlobs = (await Promise.all(
      allPhotoUrls.map(async url => {
        try {
          const res = await fetch(url)
          return await res.blob()
        } catch {
          return null
        }
      })
    )).filter((b): b is Blob => b !== null)

    const allBlobs: Blob[] = [...modelImageBlobs, ...referenceFiles.map(f => f as Blob)]

    const characteristics = activeTab === 'prompt' && promptText.trim()
      ? promptText.trim()
      : buildPromptFromChips(chipSelections)

    // Photos from character creation become the default reference photos.
    const defaultRefs = allPhotoUrls.filter(Boolean)

    // Convert first blob to data URL for thumbnail (remote URLs expire)
    const thumbnailDataUrl = modelImageBlobs[0]
      ? await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(modelImageBlobs[0]) })
      : allPhotoUrls[0]

    const char: SavedCharacter = {
      id: crypto.randomUUID(),
      name: name.trim(),
      thumbnail: thumbnailDataUrl,
      modelImageBlobs: allBlobs.slice(0, 5),
      outfitBlob: null,
      outfitDescription: selFashion.map(id => FASHION_STYLES.find(f => f.id === id)?.promptText || '').filter(Boolean).join(', '),
      characteristics,
      accessory: selAccessories.map(id => ACCESSORIES.find(a => a.id === id)?.label || '').filter(Boolean).join(', '),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      renderStyle: renderStyles[selRenderStyle].id,
      soulStyleId: undefined,
      personalityTraits: selPersonality,
      referencePhotoUrls: defaultRefs,
      modelImageUrls: defaultRefs, // temporary URLs — replaced with permanent Supabase URLs after cloud upload
    }

    try {
      addCharacter(char)
      usePipelineStore.getState().setCharacter(char.id)

      // Save creation photos to gallery so they appear in the character's gallery
      const sheetLabels = ['Retrato', 'Ángulos de Rostro', 'Ángulos de Cuerpo', 'Expresiones']
      const galleryItems: GalleryItem[] = allPhotoUrls.map((url, i) => ({
        id: crypto.randomUUID(),
        url,
        prompt: `${name} — ${sheetLabels[i] || 'Referencia'}`,
        model: 'character-creator',
        timestamp: Date.now() + i, // offset to ensure sort order
        type: 'create' as const,
        characterId: char.id,
        tags: ['character-creation', i === 0 ? 'portrait' : 'sheet'],
        source: 'director' as const,
      }))
      useGalleryStore.getState().addItems(galleryItems)

      toast.success(`${name} creado!`)
      setCharacterSaved(true)
    } catch {
      // addCharacter threw — credits were already spent, notify the user so
      // they can retry. Credits are NOT automatically restored here because
      // the generation itself succeeded; only the local save failed.
      toast.error('Error al guardar personaje. Intenta de nuevo.')
    }
  }

  // ─── Import ──────────────────────────────────────────────────────
  const handleImport = async () => {
    if (importFiles.length === 0) { toast.error('Sube al menos una imagen'); return }
    if (!importName.trim()) { toast.error('Ingresa un nombre'); return }

    setGenerating(true)
    try {
      const reader = new FileReader()
      const thumbnailDataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(importFiles[0])
      })

      const blobs: Blob[] = importFiles.map(f => f as Blob)
      const character: SavedCharacter = {
        id: crypto.randomUUID(),
        name: importName.trim(),
        thumbnail: thumbnailDataUrl,
        modelImageBlobs: blobs,
        outfitBlob: null,
        outfitDescription: '',
        characteristics: importBio,
        accessory: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      }

      addCharacter(character)
      usePipelineStore.getState().setCharacter(character.id)
      toast.success(`${importName} importado!`)
      setCharacterSaved(true)
      setImportFiles([])
      setImportName('')
      setImportBio('')
    } catch {
      toast.error('Error al importar personaje')
    } finally {
      setGenerating(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 20)
    if (files.length > 0) setImportFiles(prev => [...prev, ...files].slice(0, 20))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 20)
    if (files.length > 0) setImportFiles(prev => [...prev, ...files].slice(0, 20))
    e.target.value = ''
  }

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 5)
    if (files.length > 0) setReferenceFiles(prev => [...prev, ...files].slice(0, 5))
  }

  const handleRefSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 5)
    if (files.length > 0) setReferenceFiles(prev => [...prev, ...files].slice(0, 5))
    e.target.value = ''
  }

  // ─── Sync Builder -> Prompt (one-directional) ────────────────────
  const handleTabSwitch = (tab: 'builder' | 'prompt') => {
    if (tab === 'prompt' && !promptText.trim()) {
      const allSelections = {
        ...chipSelections,
        gender: selGender ? [selGender] : [],
        age: selAge ? [selAge] : [],
      }
      const generated = buildPromptFromChips(allSelections)
      if (generated) setPromptText(generated)
    }
    setActiveTab(tab)
  }

  // Can advance to next step?
  const canAdvance = (s: number) => {
    if (s === 0) return name.trim().length > 0 && selGender !== null && selAge !== null
    return true
  }

  // Missing fields hint for Step 0
  const missingFields = step === 0
    ? [!name.trim() && 'Nombre', !selGender && 'Género', !selAge && 'Edad'].filter(Boolean)
    : []

  // Highlight required-but-empty fields when user tries to advance
  const [showValidation, setShowValidation] = useState(false)
  // Auto-clear validation when fields change
  useEffect(() => {
    if (showValidation && missingFields.length === 0) setShowValidation(false)
  }, [name, selGender, selAge, showValidation, missingFields.length])

  // Auto-save draft to localStorage (only when actively editing)
  useEffect(() => {
    if (!name.trim() && !selGender && !selAge) return // nothing to save
    const draft = { name, selRenderStyle, selSubstyle, selGender, selAge, step, ts: Date.now() }
    try { localStorage.setItem('vist-character-draft', JSON.stringify(draft)) } catch { /* quota */ }
  }, [name, selRenderStyle, selSubstyle, selGender, selAge, step])
  // Show "restore draft" banner if there's a recent draft and user hasn't started
  const [draftBanner, setDraftBanner] = useState<{ name: string; ts: number } | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vist-character-draft')
      if (!raw) return
      const draft = JSON.parse(raw)
      const ageMin = (Date.now() - draft.ts) / 60000
      if (draft.name && ageMin < 60 * 24 * 7 && !name.trim()) {
        setDraftBanner({ name: draft.name, ts: draft.ts })
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem('vist-character-draft')
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.name) setName(d.name)
      if (typeof d.selRenderStyle === 'number') setSelRenderStyle(d.selRenderStyle)
      if (d.selSubstyle) setSelSubstyle(d.selSubstyle)
      if (d.selGender) setSelGender(d.selGender)
      if (d.selAge) setSelAge(d.selAge)
      if (typeof d.step === 'number') setStep(d.step)
      setDraftBanner(null)
    } catch { /* ignore */ }
  }
  const discardDraft = () => {
    try { localStorage.removeItem('vist-character-draft') } catch { /* ignore */ }
    setDraftBanner(null)
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F3F4F6' }}>
      <div className="px-4 md:px-8 pt-8 pb-2">
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          Crear Personaje
        </h1>
        <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: '#999' }}>Crea desde cero o importa imágenes de referencia</p>
      </div>

      {/* Mode Toggle — Import is recommended (faster + better identity) */}
      <div className="px-4 md:px-8 py-4">
        <div className="flex w-full md:w-auto md:inline-flex rounded-xl p-1" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
          {(['import', 'create'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setCharacterSaved(false) }}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: mode === m ? '#1A1A1A' : 'transparent',
                color: mode === m ? '#fff' : '#999',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
              }}>
              {m === 'import' ? '\u2191 Importar Imágenes' : '\u2295 Crear desde Cero'}
              {m === 'import' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: mode === m ? 'rgba(255,255,255,0.2)' : '#FEF3C7', color: mode === m ? '#fff' : '#92400E' }}>
                  RECOMENDADO
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="text-[10px] mt-2" style={{ color: '#999' }}>
          {mode === 'import'
            ? '✨ Sube fotos del personaje real — la AI extrae rasgos automáticamente. Mejor identidad.'
            : '🎨 Diseña desde cero con estilo, género, edad, atributos. Más control creativo.'}
        </div>
      </div>

      {mode === 'import' ? (
        /* ═══════════════════════════════════════════════════════════
           IMPORT MODE — simplified: upload + name + description + save
           ═══════════════════════════════════════════════════════════ */
        <div className="px-4 md:px-8 pb-20 md:pb-8 flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
            {/* Drop Zone */}
            <div className="p-8 text-center cursor-pointer transition-all mb-3 rounded-xl"
              style={{ background: 'white', border: `1px dashed ${dragOver ? '#1A1A1A' : 'rgba(0,0,0,0.15)'}`, borderRadius: 12 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}>
              <div className="text-4xl mb-3" style={{ color: '#1A1A1A' }}>{'\u2191'}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#111' }}>Arrastra fotos del rostro aquí</div>
              <div className="text-[11px]" style={{ color: '#999' }}>JPG, PNG, WEBP · Mín: 512×512px · Máx 10MB c/u</div>
              <div className="text-[11px] mt-2 px-3 py-1.5 rounded-xl inline-block"
                style={{ background: '#F3F4F6', color: '#1A1A1A' }}>
                o haz clic para seleccionar
              </div>
            </div>

            {/* Tips for best results */}
            <div className="mb-5 p-3 rounded-xl flex gap-3" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <span className="text-base shrink-0">💡</span>
              <div className="text-[11px] leading-relaxed" style={{ color: '#92400E' }}>
                <span className="font-semibold">Para mejor resultado:</span> sube <span className="font-semibold">3-5 fotos</span> con el rostro bien visible, distintas expresiones, buena luz. Evita lentes oscuros, sombras fuertes o filtros pesados. Una foto frontal + 2 ¾ ángulos + 1-2 perfil dan los mejores resultados.
              </div>
            </div>

            {/* Uploaded preview grid */}
            {importFiles.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: '#999' }}>
                  Subidas ({importFiles.length}/20)
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {importFiles.map((f, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative group"
                      style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.08)' }}>
                      <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt={f.name} />
                      <button onClick={(e) => { e.stopPropagation(); setImportFiles(prev => prev.filter((_, j) => j !== i)) }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,.6)', color: '#fff' }}>{'\u2715'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Name + Description */}
            <div className="p-5 space-y-4 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Nombre</label>
                <input value={importName} onChange={e => setImportName(e.target.value)} placeholder="Nombre del personaje"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors"
                  style={{ background: '#F9FAFB', borderColor: 'rgba(0,0,0,0.06)', color: '#111' }} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Descripción (opcional)</label>
                <textarea value={importBio} onChange={e => setImportBio(e.target.value)} rows={3}
                  placeholder="ej: 'mujer joven asiática, cabello largo negro, ojos almendrados, complexión atlética' — ayuda a la AI a mantener consistencia entre generaciones"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors resize-none"
                  style={{ background: '#F9FAFB', borderColor: 'rgba(0,0,0,0.06)', color: '#111' }} />
                <div className="text-[10px] mt-1" style={{ color: '#999' }}>
                  Si la dejas vacía, la AI extrae los rasgos automáticamente desde las fotos.
                </div>
              </div>
              <button onClick={handleImport} disabled={generating}
                className="w-full py-3 text-sm font-semibold rounded-xl transition-all"
                style={{ background: '#1A1A1A', color: 'white', borderRadius: 12, opacity: generating ? 0.6 : 1 }}>
                {generating ? '\u21BB Importando...' : '\u2726 Importar Personaje'}
              </button>
              {characterSaved && onNav && (
                <PipelineCTA label="Crear Foto Principal en Director" targetPage="studio" onNav={onNav} icon="\u{1F3AC}" />
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="hidden md:block md:w-[300px] shrink-0">
            <div className="p-5 sticky top-8 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-center mb-3" style={{ color: '#555' }}>Vista Previa</div>
              <div className="aspect-[3/4] rounded-xl overflow-hidden" style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.06)' }}>
                {importFiles.length > 0 ? (
                  <img src={URL.createObjectURL(importFiles[0])} className="w-full h-full object-cover" alt="Vista previa" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2" style={{ color: '#999' }}>{'\u25C8'}</div>
                      <div className="text-[11px]" style={{ color: '#999' }}>Sube imágenes para<br />generar vista previa</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════
           CREATE MODE — 3 step wizard
           ═══════════════════════════════════════════════════════════ */
        <div className={`px-4 md:px-8 pb-20 md:pb-8 ${variants.length > 0 || generating ? 'flex flex-col md:flex-row gap-6' : 'max-w-3xl lg:max-w-5xl mx-auto lg:flex lg:gap-6'}`}>
          <div className="flex-1">
            {/* Steps Navigation — progress bar with steps */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#999' }}>Paso {step + 1} de {steps.length}</span>
                <span className="text-[10px] font-mono" style={{ color: '#1A1A1A', fontWeight: 600 }}>{Math.round(((step + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: '#E5E7EB' }}>
                <div className="h-full transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: '#1A1A1A' }} />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1">
              {steps.map((s, i) => {
                const stepHints = ['Estilo, género, edad, nombre', 'Cuerpo, cabello, piel, rostro', 'Moda, personalidad, accesorios']
                return (
                  <button key={s} onClick={() => setStep(i)}
                    title={stepHints[i]}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all shrink-0"
                    style={{
                      background: step === i ? 'rgba(26,26,26,.06)' : 'transparent',
                      color: step === i ? '#1A1A1A' : step > i ? '#555' : '#999',
                      border: step === i ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                    }}>
                    <span className="rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{
                        background: step >= i ? '#1A1A1A' : '#E5E7EB',
                        color: step >= i ? '#fff' : '#999',
                        width: 18, height: 18,
                      }}>
                      {step > i ? '\u2713' : i + 1}
                    </span>
                    {s}
                  </button>
                )
              })}

              {/* Enhancer toggle + Engine wrench */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <button
                  onClick={() => {
                    const next = !useEnhancer
                    setUseEnhancer(next)
                    setLockedExpansion(null)
                    setLockedSeed(null)
                    try { localStorage.setItem('vist-enhancer', next ? 'on' : 'off') } catch {}
                  }}
                  className="h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-[10px] font-medium transition-all"
                  style={{
                    background: useEnhancer ? '#1A1A1A' : 'white',
                    color: useEnhancer ? '#FFF' : '#999',
                    border: `1px solid ${useEnhancer ? '#1A1A1A' : 'rgba(0,0,0,0.08)'}`,
                  }}
                  title={useEnhancer ? 'Enhancer ON: Gemini expande los chips en descriptores únicos' : 'Enhancer OFF: chips pasan directo al motor'}>
                  ✦ AI
                </button>
                <div className="relative">
                  <button onClick={() => setShowEngineModal(v => !v)}
                    className="h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-[10px] font-medium relative"
                    style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', color: '#555' }}
                    title="Cambiar motor de generación (avanzado). Auto elige el mejor según el caso.">
                    ⚙️ Motor: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1A1A1A', fontWeight: 600 }}>{selectedEngine === 'auto' ? 'Auto' : selectedEngine.split(':').pop()?.toUpperCase()}</span>
                    {selectedEngine !== 'auto' && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: '#1A1A1A' }} />
                    )}
                  </button>
                </div>
              </div>
              </div>
            </div>

            {/* ─── Draft restore banner ──────────────────────────── */}
            {draftBanner && step === 0 && !name.trim() && (
              <div className="p-3 mb-4 rounded-xl flex items-center gap-3" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <span className="text-base">📝</span>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold" style={{ color: '#92400E' }}>Tienes un personaje en progreso</div>
                  <div className="text-[10px]" style={{ color: '#92400E', opacity: 0.7 }}>"{draftBanner.name}" — guardado hace {Math.round((Date.now() - draftBanner.ts) / 60000)}min</div>
                </div>
                <button onClick={restoreDraft} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: '#1A1A1A', color: '#fff', border: 'none', cursor: 'pointer' }}>Continuar</button>
                <button onClick={discardDraft} className="px-3 py-1.5 rounded-lg text-[11px]" style={{ background: 'transparent', color: '#92400E', border: '1px solid rgba(146,64,14,0.3)', cursor: 'pointer' }}>Descartar</button>
              </div>
            )}

            {/* ─── Quick Start templates — only at step 0 with no name yet ─── */}
            {step === 0 && !name.trim() && (
              <div className="p-5 mb-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #FAFAFA, #F3F4F6)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#555' }}>
                  ⚡ Empieza con una plantilla <span className="text-[10px] font-normal normal-case" style={{ color: '#999' }}>· o crea desde cero</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    { id:'influencer-fashion', label:'Influencer Fashion', icon:'👗', desc:'Mujer joven editorial', renderIdx:0, substyle:'editorial', gender:'female', age:'20s' },
                    { id:'streamer-gamer', label:'Streamer', icon:'🎮', desc:'3D Pixar casual', renderIdx:2, substyle:'pixar', gender:'female', age:'20s' },
                    { id:'anime-oc', label:'Anime OC', icon:'🌸', desc:'Personaje anime', renderIdx:1, substyle:'shojo', gender:'female', age:'20s' },
                    { id:'brand-mascot', label:'Mascota Marca', icon:'✨', desc:'Estilizado memorable', renderIdx:4, substyle:'soft-anime', gender:'female', age:'20s' },
                  ].map(t => (
                    <button key={t.id}
                      onClick={() => {
                        setSelRenderStyle(t.renderIdx)
                        setSelSubstyle(t.substyle)
                        setSelGender(t.gender)
                        setSelAge(t.age)
                      }}
                      className="p-3 rounded-xl text-left transition-all hover:scale-[1.02] hover:bg-white"
                      style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <span className="text-lg block mb-1">{t.icon}</span>
                      <div className="text-[11px] font-semibold" style={{ color: '#1A1A1A' }}>{t.label}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: '#999' }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Step 0: Base ───────────────────────────────────── */}
            {step === 0 && (
              <div className="p-6 space-y-5 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-3" style={{ color: '#555' }}>Estilo de Render</label>
                  <div className="grid grid-cols-3 gap-3">
                    {renderStyles.map((rs, i) => (
                      <button key={rs.id}
                        onClick={() => { setSelRenderStyle(i); setSelSubstyle(null) }}
                        className="rounded-xl text-left transition-all hover:scale-[1.02] overflow-hidden"
                        style={{
                          background: 'white',
                          border: `1.5px solid ${selRenderStyle === i ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}`,
                          boxShadow: selRenderStyle === i ? '0 0 0 1px #1A1A1A, 0 4px 16px rgba(0,0,0,0.06)' : 'none',
                        }}>
                        {/* Real thumbnail with gradient backdrop + emoji as fallback */}
                        <div className="aspect-[4/3] flex items-center justify-center relative overflow-hidden" style={{ background: rs.bg }}>
                          <img
                            src={styleThumb(rs.id)}
                            alt={rs.label}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const el = e.currentTarget
                              el.style.display = 'none'
                              const fb = el.nextElementSibling as HTMLElement | null
                              if (fb) fb.style.display = 'flex'
                            }}
                          />
                          <span className="absolute inset-0 hidden items-center justify-center text-4xl"
                            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}>{rs.icon}</span>
                          {selRenderStyle === i && (
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ background: '#1A1A1A', color: '#fff' }}>✓</span>
                          )}
                        </div>
                        {/* Label area */}
                        <div className="p-2.5">
                          <div className="text-[12px] font-semibold leading-tight" style={{ color: selRenderStyle === i ? '#1A1A1A' : '#555' }}>{rs.label}</div>
                          <div className="text-[9px] mt-0.5 leading-snug" style={{ color: '#999' }}>{rs.desc}</div>
                          {rs.substyles && (
                            <div className="text-[8px] mt-1 font-mono" style={{ color: '#1A1A1A', opacity: 0.5 }}>{rs.substyles.length} subestilos</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Substyles — appear when parent style is selected and has substyles */}
                {renderStyles[selRenderStyle]?.substyles && (
                  <div>
                    {/* Collapsible header */}
                    <button
                      onClick={() => setSubstyleExpanded(v => !v)}
                      className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-all hover:bg-[#FAFAFA]"
                      style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                      <div className="flex items-center gap-2 text-left">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#555' }}>
                          Subestilo
                        </span>
                        <span className="text-[10px] font-normal normal-case" style={{ color: '#999' }}>
                          · opcional · {renderStyles[selRenderStyle].substyles!.length} disponibles
                        </span>
                        {selSubstyle && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ml-1" style={{ background: '#1A1A1A', color: '#fff' }}>
                            {renderStyles[selRenderStyle].substyles!.find(s => s.id === selSubstyle)?.label.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selSubstyle && (
                          <span onClick={(e) => { e.stopPropagation(); setSelSubstyle(null) }}
                            className="text-[10px] underline" style={{ color: '#777' }}>
                            Quitar
                          </span>
                        )}
                        <span style={{ fontSize: '0.6rem', transition: 'transform .2s', transform: substyleExpanded ? 'rotate(180deg)' : 'rotate(0deg)', color: '#999' }}>▼</span>
                      </div>
                    </button>

                    {substyleExpanded && (
                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                      {renderStyles[selRenderStyle].substyles!.map(sub => {
                        const active = selSubstyle === sub.id
                        return (
                          <button key={sub.id}
                            onClick={() => setSelSubstyle(active ? null : sub.id)}
                            title={sub.desc}
                            className="rounded-lg overflow-hidden transition-all hover:scale-[1.03] text-left"
                            style={{
                              background: 'white',
                              border: `1.5px solid ${active ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}`,
                              boxShadow: active ? '0 0 0 1px #1A1A1A' : 'none',
                            }}>
                            <div className="aspect-square overflow-hidden relative" style={{ background: '#F3F4F6' }}>
                              <img
                                src={styleThumb(sub.id)}
                                alt={sub.label}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const el = e.currentTarget
                                  el.style.display = 'none'
                                  const fb = el.nextElementSibling as HTMLElement | null
                                  if (fb) fb.style.display = 'flex'
                                }}
                              />
                              <span className="absolute inset-0 hidden items-center justify-center text-2xl">{sub.icon}</span>
                              {active && (
                                <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                  style={{ background: '#1A1A1A', color: '#fff' }}>✓</span>
                              )}
                            </div>
                            <div className="px-1.5 py-1">
                              <div className="text-[10px] font-semibold leading-tight truncate" style={{ color: active ? '#1A1A1A' : '#555' }}>{sub.label}</div>
                              {sub.desc && (
                                <div className="text-[8px] mt-0.5 truncate" style={{ color: '#999' }}>{sub.desc}</div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    )}
                  </div>
                )}

                <div data-required-empty={showValidation && !name.trim() ? 'true' : undefined}>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Nombre <span style={{ color: '#1A1A1A' }}>*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej.: Luna Vex"
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none focus:border-[rgba(0,0,0,.2)] transition-colors"
                    style={{
                      background: '#F9FAFB',
                      borderColor: showValidation && !name.trim() ? '#DC2626' : 'rgba(0,0,0,0.06)',
                      color: '#111',
                      boxShadow: showValidation && !name.trim() ? '0 0 0 3px rgba(220,38,38,0.08)' : 'none',
                    }} />
                  {showValidation && !name.trim() && (
                    <div className="text-[10px] mt-1" style={{ color: '#DC2626' }}>El nombre es obligatorio</div>
                  )}
                </div>

                <div data-required-empty={showValidation && !selGender ? 'true' : undefined}
                  style={{ padding: showValidation && !selGender ? '8px' : 0, margin: showValidation && !selGender ? '-8px' : 0,
                           borderRadius: 8,
                           background: showValidation && !selGender ? 'rgba(220,38,38,0.04)' : 'transparent',
                           border: showValidation && !selGender ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
                           transition: 'all 0.15s' }}>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: showValidation && !selGender ? '#DC2626' : '#555' }}>Género <span style={{ color: '#1A1A1A' }}>*</span></label>
                  <ChipSelector options={GENDERS} selected={selGender ? [selGender] : []}
                    onSelect={ids => setSelGender(ids[0] || null)} />
                </div>

                <div data-required-empty={showValidation && !selAge ? 'true' : undefined}
                  style={{ padding: showValidation && !selAge ? '8px' : 0, margin: showValidation && !selAge ? '-8px' : 0,
                           borderRadius: 8,
                           background: showValidation && !selAge ? 'rgba(220,38,38,0.04)' : 'transparent',
                           border: showValidation && !selAge ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
                           transition: 'all 0.15s' }}>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: showValidation && !selAge ? '#DC2626' : '#555' }}>Edad <span style={{ color: '#1A1A1A' }}>*</span></label>
                  <ChipSelector options={AGE_RANGES} selected={selAge ? [selAge] : []}
                    onSelect={ids => setSelAge(ids[0] || null)} />
                </div>
              </div>
            )}

            {/* ─── Step 1: Look ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Builder / Prompt tabs */}
                <div className="inline-flex rounded-xl p-1" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {(['builder', 'prompt'] as const).map(tab => (
                    <button key={tab} onClick={() => handleTabSwitch(tab)}
                      className="px-4 py-1.5 rounded-xl text-[12px] font-medium transition-all capitalize"
                      style={{
                        background: activeTab === tab ? '#1A1A1A' : 'transparent',
                        color: activeTab === tab ? '#fff' : '#999',
                        boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
                      }}>
                      {tab === 'builder' ? '\u{1F9E9} Constructor' : '\u270D\uFE0F Prompt'}
                    </button>
                  ))}
                </div>

                <div className="p-6 space-y-5 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
                  {activeTab === 'builder' ? (
                    /* ─── Builder Tab — split into sub-tabs to reduce scroll ─── */
                    <>
                      {/* Sub-tab selector */}
                      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: '#F3F4F6', border: '1px solid rgba(0,0,0,0.04)' }}>
                        {([
                          { id:'face' as const, label:'Rostro', icon:'👤' },
                          { id:'hair' as const, label:'Cabello', icon:'💇' },
                          { id:'skin' as const, label:'Piel', icon:'🧴' },
                          { id:'body' as const, label:'Cuerpo', icon:'🏋️' },
                        ]).map(t => (
                          <button key={t.id} onClick={() => setAppearanceTab(t.id)}
                            className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1"
                            style={{
                              background: appearanceTab === t.id ? '#1A1A1A' : 'transparent',
                              color: appearanceTab === t.id ? '#fff' : '#777',
                              boxShadow: appearanceTab === t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                            }}>
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Tab: Rostro (Etnia + Maquillaje + ojos/nariz/labios/cara/mandíbula/cejas) */}
                      {appearanceTab === 'face' && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Origen / Etnia</label>
                            <ChipSelector options={ETHNICITIES} selected={chipSelections.ethnicity}
                              onSelect={ids => updateChip('ethnicity', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Maquillaje</label>
                            <ChipSelector options={MAKEUP_STYLES} selected={chipSelections.makeup}
                              onSelect={ids => updateChip('makeup', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Color de Ojos</label>
                            <ChipSelector options={EYE_COLORS} selected={chipSelections.eyeColor}
                              onSelect={ids => updateChip('eyeColor', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Forma de Ojos</label>
                            <ChipSelector options={EYE_SHAPES} selected={chipSelections.eyeShape}
                              onSelect={ids => updateChip('eyeShape', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Tipo de Nariz</label>
                            <ChipSelector options={NOSE_TYPES} selected={chipSelections.noseType}
                              onSelect={ids => updateChip('noseType', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Forma de Labios</label>
                            <ChipSelector options={LIP_SHAPES} selected={chipSelections.lipShape}
                              onSelect={ids => updateChip('lipShape', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Forma de Rostro</label>
                            <ChipSelector options={FACE_SHAPES} selected={chipSelections.faceShape}
                              onSelect={ids => updateChip('faceShape', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Mandíbula</label>
                            <ChipSelector options={JAWLINES} selected={chipSelections.jawline}
                              onSelect={ids => updateChip('jawline', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Cejas</label>
                            <ChipSelector options={EYEBROWS} selected={chipSelections.eyebrows}
                              onSelect={ids => updateChip('eyebrows', ids)} />
                          </div>
                        </div>
                      )}

                      {/* Tab: Cabello (estilo + color + vello facial) */}
                      {appearanceTab === 'hair' && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Estilo de Cabello</label>
                            <ChipSelector options={HAIR_STYLES} selected={chipSelections.hairStyle}
                              onSelect={ids => updateChip('hairStyle', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Color de Cabello</label>
                            <ChipSelector options={HAIR_COLORS} selected={chipSelections.hairColor}
                              onSelect={ids => updateChip('hairColor', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Vello Facial</label>
                            <ChipSelector options={FACIAL_HAIR} selected={chipSelections.facialHair}
                              onSelect={ids => updateChip('facialHair', ids)} />
                          </div>
                        </div>
                      )}

                      {/* Tab: Piel (tono + detalles + textura) */}
                      {appearanceTab === 'skin' && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Tono de Piel</label>
                            <ChipSelector options={SKIN_TONES} selected={chipSelections.skinTone}
                              onSelect={ids => updateChip('skinTone', ids)} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Detalles de Piel <span className="text-[9px] font-normal normal-case tracking-normal" style={{ color: '#999' }}>(hasta 3)</span></label>
                            <ChipSelector options={SKIN_DETAILS} selected={chipSelections.skinDetails}
                              onSelect={ids => updateChip('skinDetails', ids)} maxSelect={3} />
                          </div>
                          {!isPhotorealistic && (
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Textura de Piel</label>
                              <ChipSelector options={SKIN_TEXTURES} selected={chipSelections.skinTexture}
                                onSelect={ids => updateChip('skinTexture', ids)} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab: Cuerpo (tipo + altura + busto/cintura/cadera + musculatura + piernas) */}
                      {appearanceTab === 'body' && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Tipo de Cuerpo <span className="text-[9px] font-normal normal-case tracking-normal" style={{ color: '#999' }}>(hasta 3)</span></label>
                            <ChipSelector options={BODY_TYPES} selected={chipSelections.bodyType}
                              onSelect={ids => updateChip('bodyType', ids)} maxSelect={3} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Altura</label>
                            <ChipSelector options={HEIGHTS} selected={chipSelections.height}
                              onSelect={ids => updateChip('height', ids)} />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Busto</label>
                              <ChipSelector options={BUST_SIZES} selected={chipSelections.bust}
                                onSelect={ids => updateChip('bust', ids)} />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Cintura</label>
                              <ChipSelector options={WAIST_SIZES} selected={chipSelections.waist}
                                onSelect={ids => updateChip('waist', ids)} />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Cadera</label>
                              <ChipSelector options={HIP_SIZES} selected={chipSelections.hips}
                                onSelect={ids => updateChip('hips', ids)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Musculatura</label>
                              <ChipSelector options={MUSCULATURE} selected={chipSelections.musculature}
                                onSelect={ids => updateChip('musculature', ids)} />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Piernas</label>
                              <ChipSelector options={LEG_PROPORTIONS} selected={chipSelections.legs}
                                onSelect={ids => updateChip('legs', ids)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* ─── Prompt Tab ─── */
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Describe tu personaje</label>
                      <textarea
                        value={promptText}
                        onChange={e => setPromptText(e.target.value)}
                        rows={8}
                        placeholder={"Describe la apariencia de tu personaje en detalle.\n\nEjemplo: Una mujer de 25 años con cabello castaño ondulado, ojos verdes, pecas ligeras y una sonrisa cálida. Complexión atlética, usando una camisa de lino casual."}
                        className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-colors resize-none"
                        style={{
                          background: '#F9FAFB', borderColor: 'rgba(0,0,0,0.06)',
                          color: '#111',
                        }} />
                      {/* Quick examples */}
                      {!promptText && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {[
                            { label: 'Chica cyberpunk', text: 'A 22-year-old woman with short neon blue hair, cybernetic eye implants glowing cyan, sharp jawline, pale skin with holographic tattoos, wearing a cropped tech jacket.' },
                            { label: 'Caballero clásico', text: 'A 30-year-old man with slicked-back dark hair, strong brow, clean-shaven, warm brown eyes, athletic build, wearing a tailored navy suit with an open collar.' },
                            { label: 'Elfa fantástica', text: 'An ethereal elven woman with long silver hair, pointed ears, violet eyes with slit pupils, luminous pale skin, delicate features, wearing flowing white robes with gold accents.' },
                          ].map(ex => (
                            <button key={ex.label} onClick={() => setPromptText(ex.text)}
                              className="px-3 py-1.5 rounded-lg text-[10px] transition-all hover:scale-[1.02]"
                              style={{ background: '#F3F4F6', color: '#1A1A1A', border: '1px solid rgba(0,0,0,0.08)' }}>
                              {ex.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-[10px]" style={{ color: '#999' }}>
                          Tip: Sé específico con los rasgos físicos, expresión y estilo para mejores resultados.
                        </div>
                        <button
                          disabled={enhancing || !promptText.trim()}
                          onClick={async () => {
                            if (!promptText.trim()) return
                            const ok = await decrementCredits(2)
                            if (!ok) { toast.error('Créditos insuficientes (2cr)'); return }
                            setEnhancing(true)
                            try {
                              const enhanced = await enhancePrompt(promptText, renderStyles[selRenderStyle].id)
                              if (enhanced && enhanced !== promptText) {
                                setPromptText(enhanced)
                                toast.success('Prompt mejorado!')
                              } else {
                                restoreCredits(2)
                                toast.info('No necesita mejora')
                              }
                            } catch {
                              restoreCredits(2)
                              toast.error('Error al mejorar')
                            } finally {
                              setEnhancing(false)
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all shrink-0 ml-3"
                          style={{
                            background: enhancing ? '#F3F4F6' : '#F9FAFB',
                            border: '1px solid rgba(0,0,0,0.08)',
                            color: '#1A1A1A',
                            opacity: (!promptText.trim() || enhancing) ? 0.4 : 1,
                          }}>
                          {enhancing ? '...' : '✨ Mejorar (2cr)'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reference photos — always visible */}
                <div className="p-5 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#555' }}>Fotos de Referencia (opcional)</label>
                    <span className="text-[10px] font-mono" style={{ color: '#999' }}>{referenceFiles.length}/5</span>
                  </div>
                  <div className="text-[10px] mb-3" style={{ color: '#999' }}>Sube fotos para mejor consistencia</div>
                  <input ref={refInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleRefSelect} />
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.03] relative group"
                        onClick={() => { if (i >= referenceFiles.length) refInputRef.current?.click() }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={i >= referenceFiles.length ? handleRefDrop : undefined}
                        style={{
                          background: i < referenceFiles.length ? '#F9FAFB' : '#F3F4F6',
                          border: `1px solid ${i < referenceFiles.length ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.04)'}`,
                        }}>
                        {i < referenceFiles.length ? (
                          <>
                            <img src={URL.createObjectURL(referenceFiles[i])} className="w-full h-full object-cover" alt="" />
                            <button onClick={(e) => { e.stopPropagation(); setReferenceFiles(prev => prev.filter((_, j) => j !== i)) }}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: 'rgba(0,0,0,.6)', color: '#fff' }}>{'\u2715'}</button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-lg" style={{ color: '#999' }}>+</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Style & Personality ───────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-6 space-y-5 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#555' }}>Estilo de Moda <span style={{ color: '#999', fontWeight: 400 }}>(máx 2)</span></label>
                    <div className="mt-2">
                      <ChipSelector options={FASHION_STYLES} selected={selFashion}
                        onSelect={setSelFashion} maxSelect={2} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#555' }}>Personalidad <span style={{ color: '#999', fontWeight: 400 }}>(máx 3)</span></label>
                    <div className="mt-2">
                      <ChipSelector options={PERSONALITY_TRAITS} selected={selPersonality}
                        onSelect={setSelPersonality} maxSelect={3} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Accesorios <span style={{ color: '#999', fontWeight: 400 }}>(máx 6)</span></label>
                    <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5 mt-3" style={{ color: '#999' }}>Cotidianos</div>
                    <ChipSelector options={ACCESSORIES.filter(a => !a.promptText.includes('mystical') && !a.promptText.includes('wings') && !a.promptText.includes('horns') && !a.promptText.includes('fangs') && !a.promptText.includes('halo') && !a.promptText.includes('demon') && !a.promptText.includes('mermaid') && !a.promptText.includes('cyber') && !a.promptText.includes('crystal') && !a.promptText.includes('fire') && !a.promptText.includes('ice') && !a.promptText.includes('shadow') && !a.promptText.includes('butterfly') && !a.promptText.includes('antlers') && !a.promptText.includes('orbs') && !a.promptText.includes('mechanical') && !a.promptText.includes('elf'))} selected={selAccessories}
                      onSelect={setSelAccessories} maxSelect={8} />
                    <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5 mt-3" style={{ color: '#999' }}>Fantasía</div>
                    <ChipSelector options={ACCESSORIES.filter(a => a.promptText.includes('mystical') || a.promptText.includes('wings') || a.promptText.includes('horns') || a.promptText.includes('fangs') || a.promptText.includes('halo') || a.promptText.includes('demon') || a.promptText.includes('mermaid') || a.promptText.includes('cyber') || a.promptText.includes('crystal') || a.promptText.includes('fire') || a.promptText.includes('ice') || a.promptText.includes('shadow') || a.promptText.includes('butterfly') || a.promptText.includes('antlers') || a.promptText.includes('orbs') || a.promptText.includes('mechanical') || a.promptText.includes('elf'))} selected={selAccessories}
                      onSelect={setSelAccessories} maxSelect={8} />
                  </div>
                </div>

                {/* ─── Generation Zone ────────────────────────────── */}
                {generationPhase !== 'idle' && (
                  <div className="p-5 rounded-xl space-y-4" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#555' }}>Variantes Generadas</div>
                      {!characterSaved && !generating && (
                        <button onClick={resetGeneration}
                          className="text-[10px] px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                          style={{ color: '#999', background: '#F3F4F6', border: '1px solid rgba(0,0,0,0.06)' }}>
                          ✕ Descartar y empezar de nuevo
                        </button>
                      )}
                    </div>

                    {/* Variants grid */}
                    {variants.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {variants.map((url, i) => (
                          <div key={i} className="relative group">
                            <button onClick={() => { setSelectedVariant(i); setGenerationPhase('picking') }}
                              className="w-full aspect-[3/4] rounded-xl overflow-hidden transition-all hover:scale-[1.02] relative"
                              style={{
                                border: selectedVariant === i ? '2px solid #1A1A1A' : '1px solid rgba(0,0,0,0.06)',
                                boxShadow: selectedVariant === i ? '0 0 0 1px #1A1A1A' : 'none',
                              }}>
                              <img src={url} className="w-full h-full object-cover" alt={`Variant ${i + 1}`} style={{ opacity: refining && selectedVariant === i ? 0.4 : 1, transition: 'opacity 0.3s' }} />
                              {selectedVariant === i && !refining && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: '#1A1A1A', color: '#fff' }}>{'\u2713'}</div>
                              )}
                              {refining && selectedVariant === i && (
                                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono" style={{ color: '#1A1A1A' }}>
                                  Refinando... {Math.round(refineProgress)}%
                                </div>
                              )}
                            </button>
                            {/* Zoom button */}
                            <button onClick={() => setZoomedImage(url)}
                              className="absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 13 }}
                              title="Ver en grande">
                              ⤢
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Refine with words — when a variant is picked, allow text-based tweaks */}
                    {selectedVariant !== null && variants.length > 0 && !characterSaved && (
                      <div className="p-3 rounded-xl" style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: '#999' }}>
                          ✨ Refinar con palabras <span className="text-[9px] font-normal normal-case">· {REFINE_CREDIT_COST}cr por refinamiento</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={refinePrompt}
                            onChange={e => setRefinePrompt(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !refining && refinePrompt.trim()) handleRefineVariant() }}
                            placeholder="ej: ojos verdes, más pecas, cabello más corto..."
                            disabled={refining}
                            className="flex-1 px-3 py-2 rounded-lg text-[12px] outline-none"
                            style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', color: '#111' }}
                          />
                          <button
                            onClick={handleRefineVariant}
                            disabled={refining || !refinePrompt.trim()}
                            className="px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
                            style={{
                              background: (!refining && refinePrompt.trim()) ? '#1A1A1A' : '#CCC',
                              color: '#fff',
                              cursor: (refining || !refinePrompt.trim()) ? 'not-allowed' : 'pointer',
                            }}>
                            {refining ? '...' : '✨ Aplicar'}
                          </button>
                        </div>
                        <div className="text-[9px] mt-1.5" style={{ color: '#999' }}>
                          Edita la variante seleccionada sin regenerar todo. Mantiene el rostro y cambia solo lo que pidas.
                        </div>
                      </div>
                    )}

                    {/* ─── Character Sheet Builder (progressive) ─── */}
                    {(generationPhase === 'picking' || generationPhase === 'sheet') && selectedVariant !== null && !characterSaved && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-semibold" style={{ color: '#1A1A1A' }}>📑 Hoja de Personaje</div>
                            <div className="text-[10px]" style={{ color: '#999' }}>Mejor consistencia en futuras generaciones</div>
                          </div>
                          {!sheetResults.face && !sheetResults.body && !sheetResults.expressions && (
                            <button
                              onClick={async () => {
                                if (sheetGenerating) return
                                await handleGenerateSheet('face')
                                await handleGenerateSheet('body')
                                await handleGenerateSheet('expressions')
                              }}
                              disabled={sheetGenerating !== null}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                              style={{ background: '#1A1A1A', color: '#fff', border: 'none', cursor: sheetGenerating ? 'wait' : 'pointer', opacity: sheetGenerating ? 0.6 : 1 }}>
                              {sheetGenerating ? '⟳ Generando...' : `✨ Generar Todas`}
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", opacity: 0.7, fontSize: 10 }}>· {SHEET_CREDIT_COST * 3}cr</span>
                            </button>
                          )}
                        </div>

                        {/* Step 1: Face Angles */}
                        {!sheetResults.face ? (
                          <button
                            onClick={() => handleGenerateSheet('face')}
                            disabled={sheetGenerating !== null}
                            className="w-full p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                            style={{
                              background: 'rgba(0,0,0,.02)',
                              border: '1px solid rgba(0,0,0,.06)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[12px] font-medium" style={{ color: '#111' }}>
                                  {sheetGenerating === 'face' ? '\u21BB Generando...' : '\u{1F9D1} Ángulos de Rostro (4 vistas)'}
                                </div>
                                <div className="text-[10px]" style={{ color: '#999' }}>
                                  Frontal · Perfil derecho · Perfil izquierdo · Tres cuartos
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: '#F3F4F6', color: '#1A1A1A' }}>
                                {SHEET_CREDIT_COST}cr
                              </span>
                            </div>
                            {sheetGenerating === 'face' && (
                              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                                <div className="h-full rounded-full shimmer" style={{ width: '60%', background: '#1A1A1A' }} />
                              </div>
                            )}
                          </button>
                        ) : (
                          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,.06)' }}>
                            <img src={sheetResults.faceUltra || sheetResults.face} className="w-full object-contain" alt="Ángulos de rostro" />
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,.02)' }}>
                              <span className="text-[10px] font-mono" style={{ color: '#999' }}>
                                {sheetResults.faceUltra ? '\u2728 Ultra Mejorado' : 'Ángulos de Rostro'}
                              </span>
                              {!sheetResults.faceUltra && (
                                <button
                                  onClick={() => handleUltraEnhance('face')}
                                  disabled={sheetGenerating !== null}
                                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg transition-colors hover:opacity-80"
                                  style={{ background: '#F3F4F6', color: '#1A1A1A', border: '1px solid rgba(0,0,0,0.08)' }}
                                >
                                  {sheetGenerating === 'faceUltra' ? '\u21BB...' : `\u2728 Ultra +${ULTRA_CREDIT_COST}cr`}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Step 2: Body Angles (unlocked after face) */}
                        {sheetResults.face && !sheetResults.body && (
                          <button
                            onClick={() => handleGenerateSheet('body')}
                            disabled={sheetGenerating !== null}
                            className="w-full p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                            style={{
                              background: 'rgba(0,0,0,.02)',
                              border: '1px solid rgba(0,0,0,.06)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[12px] font-medium" style={{ color: '#111' }}>
                                  {sheetGenerating === 'body' ? '\u21BB Generando...' : '\u{1F9CD} Ángulos de Cuerpo (4 vistas)'}
                                </div>
                                <div className="text-[10px]" style={{ color: '#999' }}>
                                  Frontal · Media vuelta · Perfil lateral · Espalda
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: '#F3F4F6', color: '#1A1A1A' }}>
                                {SHEET_CREDIT_COST}cr
                              </span>
                            </div>
                            {sheetGenerating === 'body' && (
                              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                                <div className="h-full rounded-full shimmer" style={{ width: '60%', background: '#1A1A1A' }} />
                              </div>
                            )}
                          </button>
                        )}
                        {sheetResults.body && (
                          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,.06)' }}>
                            <img src={sheetResults.body} className="w-full object-contain" alt="Ángulos de cuerpo" />
                            <div className="px-3 py-2" style={{ background: 'rgba(0,0,0,.02)' }}>
                              <span className="text-[10px] font-mono" style={{ color: '#999' }}>Ángulos de Cuerpo</span>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Expressions (unlocked after body) */}
                        {sheetResults.body && !sheetResults.expressions && (
                          <button
                            onClick={() => handleGenerateSheet('expressions')}
                            disabled={sheetGenerating !== null}
                            className="w-full p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                            style={{
                              background: 'rgba(0,0,0,.02)',
                              border: '1px solid rgba(0,0,0,.06)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[12px] font-medium" style={{ color: '#111' }}>
                                  {sheetGenerating === 'expressions' ? '\u21BB Generando...' : '\u{1F3AD} Expresiones (9 rostros)'}
                                </div>
                                <div className="text-[10px]" style={{ color: '#999' }}>
                                  Feliz · Triste · Sorprendido · Enojado · Riendo · Serio · Coqueto · Disgustado · Tranquilo
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: '#F3F4F6', color: '#1A1A1A' }}>
                                {SHEET_CREDIT_COST}cr
                              </span>
                            </div>
                            {sheetGenerating === 'expressions' && (
                              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                                <div className="h-full rounded-full shimmer" style={{ width: '60%', background: '#1A1A1A' }} />
                              </div>
                            )}
                          </button>
                        )}
                        {sheetResults.expressions && (
                          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,.06)' }}>
                            <img src={sheetResults.expressionsUltra || sheetResults.expressions} className="w-full object-contain" alt="Expresiones" />
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,.02)' }}>
                              <span className="text-[10px] font-mono" style={{ color: '#999' }}>
                                {sheetResults.expressionsUltra ? '\u2728 Ultra Mejorado' : 'Expresiones'}
                              </span>
                              {!sheetResults.expressionsUltra && (
                                <button
                                  onClick={() => handleUltraEnhance('expressions')}
                                  disabled={sheetGenerating !== null}
                                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg transition-colors hover:opacity-80"
                                  style={{ background: '#F3F4F6', color: '#1A1A1A', border: '1px solid rgba(0,0,0,0.08)' }}
                                >
                                  {sheetGenerating === 'expressionsUltra' ? '\u21BB...' : `\u2728 Ultra +${ULTRA_CREDIT_COST}cr`}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Save — always available */}
                        {sheetGenerating === null && (
                          <button onClick={handleSave}
                            className="w-full py-3 text-sm font-semibold rounded-xl transition-all"
                            style={{ background: '#1A1A1A', color: 'white', borderRadius: 12 }}>
                            {'\u2726'} Guardar Personaje
                          </button>
                        )}
                      </div>
                    )}

                    {characterSaved && onNav && (
                      <div className="space-y-3">
                        <div className="text-center text-[12px] font-medium" style={{ color: '#1A1A1A' }}>
                          {'\u2713'} Personaje guardado!
                        </div>
                        <PipelineCTA label="Crear Foto Principal en Studio" targetPage="studio" onNav={onNav} icon="\u{1F3AC}" />
                        <button onClick={resetAll}
                          className="w-full py-2.5 rounded-xl text-[12px] font-medium transition-all"
                          style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', color: '#555' }}>
                          + Crear Nuevo Personaje
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Sticky Navigation Bar ────────────────────────── */}
            <div className="sticky bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-3 py-3 px-4 mt-4 -mx-4 lg:mx-0"
              style={{ background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)', paddingBottom: 'calc(12px + 64px)', marginBottom: -64 }}>
              <button onClick={() => setStep(Math.max(0, step - 1))}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', color: '#555', opacity: step === 0 ? 0.3 : 1, cursor: step === 0 ? 'default' : 'pointer' }} disabled={step === 0}>
                ← Atrás
              </button>
              {step < 2 ? (
                <div className="flex items-center gap-3">
                  {missingFields.length > 0 && (
                    <span className="text-[10px] hidden lg:inline" style={{ color: '#C2410C' }}>
                      Completa {missingFields.join(', ')} para continuar
                    </span>
                  )}
                  <button onClick={() => {
                      if (!canAdvance(step)) {
                        setShowValidation(true)
                        // scroll to first missing field for UX clarity
                        setTimeout(() => {
                          const firstMissing = document.querySelector('[data-required-empty="true"]') as HTMLElement | null
                          firstMissing?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }, 50)
                        return
                      }
                      setStep(step + 1)
                    }}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                    style={{ background: '#1A1A1A', color: 'white', opacity: !canAdvance(step) ? 0.7 : 1, cursor: 'pointer' }}>
                    Siguiente →
                  </button>
                </div>
              ) : (
                generationPhase === 'idle' && (
                  <button onClick={handleGenerate}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold"
                    style={{ background: '#1A1A1A', color: 'white', opacity: generating ? 0.5 : 1 }}
                    disabled={generating}>
                    {generating ? '⟳ Generando...' : `✦ Generar Personaje · ${costPerVariant * 3}cr`}
                  </button>
                )
              )}
            </div>
          </div>

          {/* ─── Right: Preview Panel — only shown when variants exist ── */}
          <div className={`w-full md:w-[320px] shrink-0 ${variants.length > 0 || generating ? '' : 'hidden lg:block'}`}>
            <div className="p-5 sticky top-8 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#555' }}>Vista Previa</div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: '#F3F4F6', color: '#1A1A1A' }}>
                    {renderStyles[selRenderStyle]?.label.toUpperCase()}
                  </span>
                  {selSubstyle && renderStyles[selRenderStyle]?.substyles?.find(s => s.id === selSubstyle) && (
                    <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: '#1A1A1A', color: '#fff' }}>
                      {renderStyles[selRenderStyle]?.substyles?.find(s => s.id === selSubstyle)?.label.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="aspect-[3/4] rounded-xl overflow-hidden relative"
                style={{
                  background: '#F9FAFB',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}>
                {generating ? (
                  /* Generating — show spinner */
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#F9FAFB' }}>
                    <LumaSpin label="Creando personaje..." />
                  </div>
                ) : selectedVariant !== null && variants[selectedVariant] ? (
                  /* Show selected variant */
                  <img src={variants[selectedVariant]} className="w-full h-full object-cover" alt={name} />
                ) : variants.length > 0 ? (
                  /* Show first variant as preview */
                  <img src={variants[0]} className="w-full h-full object-cover" alt={name} style={{ opacity: 0.6 }} />
                ) : (
                  /* Style teaser — show selected style/substyle thumbnail as preview, no overlay */
                  <>
                    <img
                      src={styleThumb(selSubstyle || renderStyles[selRenderStyle].id)}
                      alt="Style preview"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ opacity: 0.55, filter: 'saturate(0.8)' }}
                      onError={e => {
                        e.currentTarget.style.display = 'none'
                        const fb = e.currentTarget.nextElementSibling as HTMLElement | null
                        if (fb) fb.style.display = 'flex'
                      }}
                    />
                    {/* Fallback silhouette only if image fails to load (display: none by default) */}
                    <div className="absolute inset-0 flex-col items-center justify-center" style={{ display: 'none' }}>
                      <div className="w-16 h-20 mx-auto rounded-[45%]"
                        style={{ background: 'rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.06)' }} />
                    </div>
                    {/* Bottom badge — does not block the face */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[9px] font-mono px-2 py-0.5 rounded whitespace-nowrap"
                      style={{ color: '#fff', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                      Vista del estilo seleccionado
                    </div>
                  </>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.7))' }}>
                  <div className="text-sm font-bold text-white">{name || 'Sin nombre'}</div>
                  <div className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,.7)' }}>
                    {[
                      GENDERS.find(g => g.id === selGender)?.label,
                      AGE_RANGES.find(a => a.id === selAge)?.label,
                    ].filter(Boolean).join(' · ') || 'Configura en el Paso 1'}
                  </div>
                </div>
              </div>

              {/* Chip summary below preview */}
              <div className="mt-3 flex flex-wrap gap-1 justify-center">
                {selPersonality.map(id => {
                  const chip = PERSONALITY_TRAITS.find(c => c.id === id)
                  return chip ? <span key={id} className="badge" style={{ background: '#F3F4F6', color: '#1A1A1A' }}>{chip.label}</span> : null
                })}
                {selFashion.map(id => {
                  const chip = FASHION_STYLES.find(c => c.id === id)
                  return chip ? <span key={id} className="badge" style={{ background: '#F3F4F6', color: '#555' }}>{chip.label}</span> : null
                })}
              </div>

              {/* Generation loading indicator */}
              {generating && (
                <div className="mt-3 text-center">
                  <div className="text-[11px] font-medium" style={{ color: '#1A1A1A' }}>
                    {'\u21BB'} Generando{generationPhase === 'sheet' ? ' hoja de personaje' : ' variantes'}...
                  </div>
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                    <div className="h-full rounded-full shimmer" style={{ width: '60%', background: '#1A1A1A' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Engine Modal ──────────────────────────────────────────── */}
      {showEngineModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowEngineModal(false)} />
          <div className="fixed z-50 w-[340px] max-w-[calc(100vw-2rem)] max-h-[90vh] rounded-xl"
            style={{
              display: 'flex', flexDirection: 'column',
              top: '50%', left: 'calc(50% + 110px)', transform: 'translate(-50%, -50%)',
              background: 'white',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,.12)',
              overflow: 'hidden',
              borderRadius: 12,
            }}>
            <div className="overflow-y-auto p-4 pb-2 space-y-1 flex-1 min-h-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#555' }}>Motor de Generación</div>

              <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                style={{
                  background: selectedEngine === 'auto' ? '#F3F4F6' : 'transparent',
                  border: `1px solid ${selectedEngine === 'auto' ? 'rgba(0,0,0,0.1)' : 'transparent'}`,
                }}>
                <span className="text-base">{'\u2728'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? '#1A1A1A' : '#555' }}>Auto</div>
                  <div className="text-[9px]" style={{ color: '#999' }}>Mejor motor automáticamente</div>
                </div>
              </button>

              <div className="h-px my-1" style={{ background: 'rgba(0,0,0,0.06)' }} />

              {/* Recommended engines for character creation */}
              <div className="text-[9px] font-semibold uppercase tracking-wider mb-1 mt-2 px-1" style={{ color: '#999' }}>Mejor para Personajes</div>
              {CHARACTER_ENGINES.map(ce => {
                const meta = ENGINE_METADATA.find(e => e.key === ce.id);
                return (
                  <button key={ce.id}
                    onClick={() => { setSelectedEngine(ce.id); setShowEngineModal(false) }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: selectedEngine === ce.id ? '#F3F4F6' : 'transparent',
                      border: `1px solid ${selectedEngine === ce.id ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.04)'}`,
                    }}>
                    <span className="text-sm" style={{ color: ce.badge ? '#1A1A1A' : '#999' }}>
                      {ce.badge ? '\u2B50' : '\u2699'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium" style={{ color: selectedEngine === ce.id ? '#1A1A1A' : '#555' }}>{ce.label}</span>
                        {ce.badge && (
                          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{
                            background: '#F3F4F6',
                            color: '#1A1A1A',
                            border: '1px solid rgba(0,0,0,0.08)',
                          }}>{ce.badge}</span>
                        )}
                      </div>
                      <div className="text-[8px]" style={{ color: '#999' }}>{ce.desc}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[9px] font-mono" style={{ color: '#1A1A1A' }}>{meta?.creditCost ?? '?'}cr</div>
                      <div className="text-[8px] font-mono" style={{ color: '#999' }}>{meta?.estimatedTime ?? ''}</div>
                    </div>
                  </button>
                );
              })}

            </div>

            <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#555' }}>Resolución</div>
              <div className="flex gap-2">
                {[
                  { id: '1k', label: '1K', desc: '1024px' },
                  { id: '2k', label: '2K', desc: '2048px' },
                  { id: '4k', label: '4K', desc: '4096px' },
                ].map(r => (
                  <button key={r.id} onClick={() => setSelectedResolution(r.id)}
                    className="flex-1 px-3 py-2 rounded-xl text-center transition-all"
                    style={{
                      background: selectedResolution === r.id ? '#F3F4F6' : 'white',
                      border: `1px solid ${selectedResolution === r.id ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}`,
                    }}>
                    <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? '#1A1A1A' : '#555' }}>{r.label}</div>
                    <div className="text-[8px] font-mono" style={{ color: '#999' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Zoom lightbox ──────────────────────────────────────── */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(8px)' }}
          onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage}
            className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain"
            style={{ boxShadow: '0 0 80px rgba(0,0,0,.6)' }}
            onClick={e => e.stopPropagation()}
            alt="Vista ampliada" />
          <button onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'rgba(255,255,255,.1)', color: '#fff' }}>
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default UploadCharacter
