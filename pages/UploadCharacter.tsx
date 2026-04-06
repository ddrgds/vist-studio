import React, { useState, useRef, useEffect } from 'react'
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { generateInfluencerImage, enhancePrompt, expandCharacterChips } from '../services/geminiService'
import { generateWithSoul } from '../services/higgsfieldService'
import { generateWithReplicate } from '../services/replicateService'
import { generateWithOpenAI } from '../services/openaiService'
import { generateWithFal, editImageWithGrokFal } from '../services/falService'
import { ImageSize, AspectRatio, ENGINE_METADATA, FEATURE_ENGINES, AIProvider, ReplicateModel, FalModel } from '../types'
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
  { id: 'fal:wan27-gen', label: 'Wan 2.7', desc: 'Realista, más barato', badge: 'Valor' },
  { id: 'fal:wan27pro-gen', label: 'Wan 2.7 Pro', desc: 'Ultra-realista, premium', badge: 'Realista' },
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

const renderStyles = [
  { id:'photorealistic', label:'Fotorrealista', icon:'📷', desc:'Aspecto humano, fotografía de estudio',
    prompt:'Ultra-photorealistic digital human, indistinguishable from photograph, shot on Phase One IQ4 150MP with Schneider 110mm f/2.8, natural skin with visible pores and subsurface blood flow, accurate eye moisture, individual hair strand rendering, physically-based material response,',
    scenario: CREATOR_BG,
    bg:'linear-gradient(135deg, #f0b86020, #d4956b10)' },
  { id:'anime', label:'Anime / Manga', icon:'🎨', desc:'Estilo de animación japonesa',
    prompt:'Premium anime character, Production I.G / studio Bones quality, clean precise linework with variable stroke weight, cel-shaded with sophisticated shadow gradients, luminous multi-layered iris reflections, stylized proportions, dynamic hair strand groups,',
    scenario: CREATOR_BG + ', drawn in high-end anime style',
    bg:'linear-gradient(135deg, #e8749a15, #9a90c415)' },
  { id:'3d-render', label:'Render 3D', icon:'🖥️', desc:'CGI, estilo Pixar, personaje de juego',
    prompt:'AAA game-quality 3D character render, Unreal Engine 5 quality, high-poly sculpted mesh, PBR material workflow on all surfaces, subsurface scattering skin shader with detail maps, strand-based groomed hair, HDRI environment lighting with ray-traced AO,',
    scenario: CREATOR_BG + ', rendered in Octane/Unreal Engine 5',
    bg:'linear-gradient(135deg, #4858e015, #50d8a010)' },
  { id:'illustration', label:'Ilustración', icon:'✍️', desc:'Arte digital, concept art',
    prompt:'High-end digital character illustration, concept art portfolio quality, painterly technique blending precise linework with expressive color blocking, sophisticated light study with warm/cool shifts, character design clarity with strong silhouette,',
    scenario: CREATOR_BG + ', art book presentation quality',
    bg:'linear-gradient(135deg, #f0b86015, #e8725c10)' },
  { id:'stylized', label:'Estilizado', icon:'✨', desc:'Semi-realista, Arcane / Spider-Verse',
    prompt:'Distinctive stylized character with exaggerated design language, Arcane/Spider-Verse quality, strong graphic silhouette with memorable proportions, bold shape language defining personality, limited palette with strategic accent pops,',
    scenario: CREATOR_BG + ', cel-shaded with painterly details',
    bg:'linear-gradient(135deg, #4f46e515, #f0684815)' },
  { id:'pixel-art', label:'Pixel Art', icon:'🟨', desc:'Retro 8-bit / 16-bit',
    suffix: '16-bit retro game quality, limited color palette, pixelated, NOT smooth, NOT photorealistic',
    prompt:'Pixel art character sprite, 64-128px base resolution, limited 32-color palette, intentional dithering, clear silhouette,',
    scenario: CREATOR_BG + ', pixelated throughout, retro game aesthetic',
    bg:'linear-gradient(135deg, #50d8a015, #4858e010)' },
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
  const [mode, setMode] = useState<'create' | 'import'>('create')
  const [step, setStep] = useState(0)

  // Step 0 — Base
  const [selRenderStyle, setSelRenderStyle] = useState(0)
  const [name, setName] = useState('')
  const [selGender, setSelGender] = useState<string | null>(null)
  const [selAge, setSelAge] = useState<string | null>(null)

  // Step 1 — Look
  const [activeTab, setActiveTab] = useState<'builder' | 'prompt'>('builder')
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

  // Build the full prompt for generation
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
  const costPerVariant = engineMeta?.creditCost ?? 2

  const routeGeneration = async (params: InfluencerParams): Promise<string[]> => {
    if (!engineMeta || selectedEngine === 'auto') {
      // NB2 fal.ai (safety 6) → Wan t2i → Grok fallback chain — all fal.ai
      try {
        return await generateWithFal(params, FalModel.NanoBanana2)
      } catch (nb2Err) {
        console.warn('NB2 fal creator failed, trying Wan:', nb2Err)
        try {
          return await generateWithFal(params, FalModel.Wan27Gen)
        } catch (wanErr) {
          console.warn('Wan creator failed, trying Grok:', wanErr)
          return generateWithFal(params, FalModel.GrokImagineGen)
        }
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
        imageSize: ImageSize.Size2K,
        aspectRatio: AspectRatio.Portrait,
        numberOfImages: 1,
        realistic: style.id === 'photorealistic',
        imageBoost: style.id !== 'photorealistic' ? style.prompt : undefined,
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

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F3F4F6' }}>
      <div className="px-4 md:px-8 pt-8 pb-2">
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          Crear Personaje
        </h1>
        <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: '#999' }}>Crea desde cero o importa imágenes de referencia</p>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 md:px-8 py-4">
        <div className="flex w-full md:w-auto md:inline-flex rounded-xl p-1" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
          {(['create', 'import'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setCharacterSaved(false) }}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: mode === m ? '#1A1A1A' : 'transparent',
                color: mode === m ? '#fff' : '#999',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
              }}>
              {m === 'create' ? '\u2295 Crear desde Cero' : '\u2191 Importar Imágenes'}
            </button>
          ))}
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
            <div className="p-8 text-center cursor-pointer transition-all mb-5 rounded-xl"
              style={{ background: 'white', border: `1px dashed ${dragOver ? '#1A1A1A' : 'rgba(0,0,0,0.15)'}`, borderRadius: 12 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}>
              <div className="text-4xl mb-3" style={{ color: '#1A1A1A' }}>{'\u2191'}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#111' }}>Sube 1-5 fotos claras de un rostro</div>
              <div className="text-[11px]" style={{ color: '#999' }}>JPG, PNG, WEBP · Resolución mín: 512×512px · Máx 10MB c/u</div>
              <div className="text-[11px] mt-2 px-3 py-1.5 rounded-xl inline-block"
                style={{ background: '#F3F4F6', color: '#1A1A1A' }}>
                o haz clic para seleccionar archivos
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
                  placeholder="Describe al personaje para mejor consistencia con AI..."
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors resize-none"
                  style={{ background: '#F9FAFB', borderColor: 'rgba(0,0,0,0.06)', color: '#111' }} />
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
            {/* Steps Navigation */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {steps.map((s, i) => (
                <button key={s} onClick={() => setStep(i)}
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
              ))}

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
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm relative"
                    style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', color: '#555' }}
                    title="Motor de Generación">
                    🔧
                    {selectedEngine !== 'auto' && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: '#1A1A1A' }} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Step 0: Base ───────────────────────────────────── */}
            {step === 0 && (
              <div className="p-6 space-y-5 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12 }}>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-3" style={{ color: '#555' }}>Estilo de Render</label>
                  <div className="grid grid-cols-3 gap-3">
                    {renderStyles.map((rs, i) => (
                      <button key={rs.id} onClick={() => setSelRenderStyle(i)}
                        className="p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                        style={{
                          background: selRenderStyle === i ? '#F9FAFB' : 'white',
                          border: `1.5px solid ${selRenderStyle === i ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}`,
                          boxShadow: selRenderStyle === i ? '0 0 0 1px #1A1A1A' : 'none',
                        }}>
                        <span className="text-xl block mb-1.5">{rs.icon}</span>
                        <div className="text-[12px] font-semibold" style={{ color: selRenderStyle === i ? '#1A1A1A' : '#555' }}>{rs.label}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: '#999' }}>{rs.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Nombre <span style={{ color: '#1A1A1A' }}>*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej.: Luna Vex"
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none focus:border-[rgba(0,0,0,.2)] transition-colors"
                    style={{ background: '#F9FAFB', borderColor: 'rgba(0,0,0,0.06)', color: '#111' }} />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Género <span style={{ color: '#1A1A1A' }}>*</span></label>
                  <ChipSelector options={GENDERS} selected={selGender ? [selGender] : []}
                    onSelect={ids => setSelGender(ids[0] || null)} />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Edad <span style={{ color: '#1A1A1A' }}>*</span></label>
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
                    /* ─── Builder Tab ─── */
                    <>
                      {/* ── Rasgos primarios (siempre visibles) ── */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Origen / Etnia</label>
                        <ChipSelector options={ETHNICITIES} selected={chipSelections.ethnicity}
                          onSelect={ids => updateChip('ethnicity', ids)} />
                      </div>
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
                        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Tono de Piel</label>
                        <ChipSelector options={SKIN_TONES} selected={chipSelections.skinTone}
                          onSelect={ids => updateChip('skinTone', ids)} />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Detalles de Piel <span className="text-[9px] font-normal normal-case tracking-normal" style={{ color: '#999' }}>(hasta 3)</span></label>
                        <ChipSelector options={SKIN_DETAILS} selected={chipSelections.skinDetails}
                          onSelect={ids => updateChip('skinDetails', ids)} maxSelect={3} />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#555' }}>Maquillaje</label>
                        <ChipSelector options={MAKEUP_STYLES} selected={chipSelections.makeup}
                          onSelect={ids => updateChip('makeup', ids)} />
                      </div>
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

                      {/* ── Ajustes detallados (colapsado por defecto) ── */}
                      <button
                        onClick={() => setShowAdvanced(v => !v)}
                        className="flex items-center gap-2 text-[11px] font-semibold w-full py-2.5 px-3 rounded-xl transition-all"
                        style={{ background: showAdvanced ? '#F3F4F6' : 'white', border: '1px solid rgba(0,0,0,0.06)', color: '#555' }}>
                        <span style={{ fontSize: '0.8rem' }}>⚙️</span>
                        <span>Ajustes Detallados</span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', transition: 'transform .2s', transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', color: '#999' }}>▼</span>
                      </button>

                      {showAdvanced && (
                        <div className="space-y-4 p-4 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.04)' }}>
                          {/* Proporciones */}
                          <div className="grid grid-cols-2 gap-3">
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
                              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Musculatura</label>
                              <ChipSelector options={MUSCULATURE} selected={chipSelections.musculature}
                                onSelect={ids => updateChip('musculature', ids)} />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Piernas</label>
                              <ChipSelector options={LEG_PROPORTIONS} selected={chipSelections.legs}
                                onSelect={ids => updateChip('legs', ids)} />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Vello Facial</label>
                            <ChipSelector options={FACIAL_HAIR} selected={chipSelections.facialHair}
                              onSelect={ids => updateChip('facialHair', ids)} />
                          </div>
                          {/* Faciales */}
                          <div className="pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Color de Ojos</label>
                            <ChipSelector options={EYE_COLORS} selected={chipSelections.eyeColor}
                              onSelect={ids => updateChip('eyeColor', ids)} />
                          </div>
                          <div className="mt-3">
                            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Forma de Ojos</label>
                            <ChipSelector options={EYE_SHAPES} selected={chipSelections.eyeShape}
                              onSelect={ids => updateChip('eyeShape', ids)} />
                          </div>
                          <div className="mt-3">
                            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Tipo de Nariz</label>
                            <ChipSelector options={NOSE_TYPES} selected={chipSelections.noseType}
                              onSelect={ids => updateChip('noseType', ids)} />
                          </div>
                          <div className="mt-3">
                            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Forma de Labios</label>
                            <ChipSelector options={LIP_SHAPES} selected={chipSelections.lipShape}
                              onSelect={ids => updateChip('lipShape', ids)} />
                          </div>
                          <div className="mt-3">
                            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Forma de Rostro</label>
                            <ChipSelector options={FACE_SHAPES} selected={chipSelections.faceShape}
                              onSelect={ids => updateChip('faceShape', ids)} />
                          </div>
                          <div className="mt-3">
                            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Mandíbula</label>
                            <ChipSelector options={JAWLINES} selected={chipSelections.jawline}
                              onSelect={ids => updateChip('jawline', ids)} />
                          </div>
                          <div className="mt-3">
                            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Cejas</label>
                            <ChipSelector options={EYEBROWS} selected={chipSelections.eyebrows}
                              onSelect={ids => updateChip('eyebrows', ids)} />
                          </div>
                          {!isPhotorealistic && (
                            <div className="mt-3">
                              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#555' }}>Textura de Piel</label>
                              <ChipSelector options={SKIN_TEXTURES} selected={chipSelections.skinTexture}
                                onSelect={ids => updateChip('skinTexture', ids)} />
                            </div>
                          )}
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
                              <img src={url} className="w-full h-full object-cover" alt={`Variant ${i + 1}`} />
                              {selectedVariant === i && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: '#1A1A1A', color: '#fff' }}>{'\u2713'}</div>
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

                    {/* ─── Character Sheet Builder (progressive) ─── */}
                    {(generationPhase === 'picking' || generationPhase === 'sheet') && selectedVariant !== null && !characterSaved && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#999' }}>
                          Hoja de Personaje (opcional)
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
                    <span className="text-[10px] hidden lg:inline" style={{ color: '#999' }}>
                      Falta: {missingFields.join(', ')}
                    </span>
                  )}
                  <button onClick={() => setStep(step + 1)}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold"
                    style={{ background: '#1A1A1A', color: 'white', opacity: !canAdvance(step) ? 0.4 : 1, cursor: !canAdvance(step) ? 'not-allowed' : 'pointer' }}
                    disabled={!canAdvance(step)}>
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
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#555' }}>Vista Previa</div>
                <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: '#F3F4F6', color: '#1A1A1A' }}>
                  {renderStyles[selRenderStyle]?.label.toUpperCase()}
                </span>
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
                  /* Silhouette placeholder */
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="relative">
                      {/* Head */}
                      <div className="w-16 h-20 mx-auto rounded-[45%] transition-all"
                        style={{ background: 'rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.06)' }} />
                    </div>
                    {/* Body silhouette */}
                    <div className="mt-1 flex flex-col items-center">
                      <div style={{ width: '10px', height: '6px', background: 'rgba(0,0,0,.03)', borderRadius: '0 0 4px 4px' }} />
                      <div className="rounded-t-2xl" style={{ width: '60px', height: '8px', background: 'rgba(0,0,0,.03)' }} />
                      <div style={{ width: '52px', height: '44px', background: 'rgba(0,0,0,.02)', borderRadius: '30%' }} />
                      <div className="flex gap-1 -mt-0.5">
                        <div style={{ width: '12px', height: '20px', background: 'rgba(0,0,0,.015)', borderRadius: '0 0 6px 6px' }} />
                        <div style={{ width: '12px', height: '20px', background: 'rgba(0,0,0,.015)', borderRadius: '0 0 6px 6px' }} />
                      </div>
                    </div>
                  </div>
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
