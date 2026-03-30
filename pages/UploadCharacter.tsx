import React, { useState, useRef, useEffect } from 'react'
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { generateInfluencerImage, enhancePrompt } from '../services/geminiService'
import { generateWithSoul } from '../services/higgsfieldService'
import { generateWithReplicate } from '../services/replicateService'
import { generateWithOpenAI } from '../services/openaiService'
import { generateWithFal } from '../services/falService'
import { ImageSize, AspectRatio, ENGINE_METADATA, FEATURE_ENGINES, AIProvider } from '../types'
import type { InfluencerParams } from '../types'
import { useNavigationStore } from '../stores/navigationStore'
import { usePipelineStore } from '../stores/pipelineStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { PipelineCTA } from '../components/PipelineCTA'
import {
  type ChipOption, ETHNICITIES, HAIR_STYLES, HAIR_COLORS, SKIN_TONES, EYE_COLORS,
  EYE_SHAPES, NOSE_TYPES, LIP_SHAPES, FACE_SHAPES, JAWLINES, EYEBROWS,
  BODY_TYPES, HEIGHTS, BUST_SIZES, HIP_SIZES, MUSCULATURE, FACIAL_HAIR, SKIN_TEXTURES, GENDERS, AGE_RANGES,
  PERSONALITY_TRAITS, FASHION_STYLES, ACCESSORIES, buildPromptFromChips,
} from '../data/characterChips'
import { SOUL_STYLES, SOUL_STYLES_CURATED, SOUL_STYLE_CATEGORIES, type SoulStyleCategory } from '../data/soulStyles'
import { generateCharacterSheet, enhanceSheetWithGrok, type SheetType } from '../services/toolEngines'

// ─── Character creation engine presets (Soul 2.0 prominent) ──────────
const CHARACTER_ENGINES = [
  { id: 'gemini:nb2', label: 'Nano Banana 2', desc: 'Rápido, gratis, buena consistencia', badge: 'Recomendado' },
  { id: 'fal:seedream50', label: 'Seedream 5.0', desc: 'Alta calidad, multi-referencia', badge: null },
  { id: 'replicate:grok', label: 'Grok Imagine', desc: 'Creativo, buena adherencia al prompt', badge: null },
  { id: 'gemini:pro', label: 'NB Pro', desc: 'Máxima calidad Gemini', badge: null },
] as const;

// ─── Render styles ───────────────────────────────────────────────────
const renderStyles = [
  { id:'photorealistic', label:'Fotorrealista', icon:'📷', desc:'Aspecto humano, fotografía de estudio',
    prompt:'Ultra-photorealistic digital human, indistinguishable from photograph, shot on Phase One IQ4 150MP with Schneider 110mm f/2.8, natural skin with visible pores and subsurface blood flow, accurate eye moisture, individual hair strand rendering, physically-based material response,',
    scenario:'Professional photography studio with Profoto B10 key through 4ft octabox, V-flat fill, clean neutral background, shot on medium format digital, natural skin imperfections',
    bg:'linear-gradient(135deg, #f0b86020, #d4956b10)' },
  { id:'anime', label:'Anime / Manga', icon:'🎨', desc:'Estilo de animación japonesa',
    prompt:'Premium anime character, Production I.G / studio Bones quality, clean precise linework with variable stroke weight, cel-shaded with sophisticated shadow gradients, luminous multi-layered iris reflections, stylized proportions, dynamic hair strand groups,',
    scenario:'Anime background with atmospheric depth, soft painted sky, drawn in high-end anime style, NOT a photograph, NOT photorealistic, 2D illustration with volumetric lighting',
    bg:'linear-gradient(135deg, #e8749a15, #9a90c415)' },
  { id:'3d-render', label:'Render 3D', icon:'🖥️', desc:'CGI, estilo Pixar, personaje de juego',
    prompt:'AAA game-quality 3D character render, Unreal Engine 5 quality, high-poly sculpted mesh, PBR material workflow on all surfaces, subsurface scattering skin shader with detail maps, strand-based groomed hair, HDRI environment lighting with ray-traced AO,',
    scenario:'3D rendered environment with Lumen global illumination, cinematic depth of field with physically accurate bokeh, rendered in Octane/Unreal Engine 5',
    bg:'linear-gradient(135deg, #4858e015, #50d8a010)' },
  { id:'illustration', label:'Ilustración', icon:'✍️', desc:'Arte digital, concept art',
    prompt:'High-end digital character illustration, concept art portfolio quality, painterly technique blending precise linework with expressive color blocking, sophisticated light study with warm/cool shifts, character design clarity with strong silhouette,',
    scenario:'Fantasy concept art environment with atmospheric perspective, rich texture variation suggesting mixed media, art book presentation quality',
    bg:'linear-gradient(135deg, #f0b86015, #e8725c10)' },
  { id:'stylized', label:'Estilizado', icon:'✨', desc:'Semi-realista, Arcane / Spider-Verse',
    prompt:'Distinctive stylized character with exaggerated design language, Arcane/Spider-Verse quality, strong graphic silhouette with memorable proportions, bold shape language defining personality, limited palette with strategic accent pops,',
    scenario:'Stylized cinematic environment with dramatic moody lighting and color grading, cel-shaded with painterly details, NOT photorealistic, poster-quality composition',
    bg:'linear-gradient(135deg, #4f46e515, #f0684815)' },
  { id:'pixel-art', label:'Pixel Art', icon:'🟨', desc:'Retro 8-bit / 16-bit',
    prompt:'Premium pixel art character sprite 64-128px base resolution, carefully placed individual pixels with intentional color choice, limited 32-color palette with strategic dithering, sub-pixel animation-ready, clear silhouette at small scale,',
    scenario:'Retro pixel art environment, 16-bit video game quality, Hyper Light Drifter visual sophistication, pixelated throughout, NOT smooth, NOT photorealistic',
    bg:'linear-gradient(135deg, #50d8a015, #4858e010)' },
]

// ─── Chip Selector component ────────────────────────────────────────
const ChipSelector = ({
  options, selected, onSelect, maxSelect = 1, color = 'var(--joi-pink)',
}: {
  options: ChipOption[]; selected: string[]; onSelect: (ids: string[]) => void;
  maxSelect?: number; color?: string;
}) => (
  <div className="flex flex-wrap gap-2">
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
          className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all flex items-center gap-1.5"
          style={{
            background: active ? `${color}12` : 'var(--joi-bg-3)',
            border: `1px solid ${active ? `${color}30` : 'rgba(255,255,255,.04)'}`,
            color: active ? color : 'var(--joi-text-2)',
            backdropFilter: 'blur(8px)',
          }}>
          {chip.color
            ? <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: chip.color, border: '1px solid rgba(255,255,255,.25)', flexShrink: 0 }} />
            : <span className="text-sm">{chip.emoji}</span>
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
    bodyType: [], height: [], bust: [], hips: [], musculature: [], facialHair: [], skinTexture: [],
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [promptText, setPromptText] = useState('')
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
      return generateInfluencerImage(params, () => {})
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
    const fullPrompt = isSoul ? buildSoulPrompt() : buildFullPrompt()

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
        scenario: isSoul ? 'Professional editorial fashion photography studio, clean elegant neutral background' : style.scenario,
        lighting: isSoul ? 'Natural soft studio lighting' : (style.id === 'anime' ? 'Flat anime lighting, cel-shaded' : style.id === 'pixel-art' ? 'Flat pixel art lighting' : 'Soft studio lighting'),
        imageSize: ImageSize.Size2K,
        aspectRatio: AspectRatio.Portrait,
        numberOfImages: 1,
        realistic: style.id === 'photorealistic',
        imageBoost: style.id !== 'photorealistic' ? style.prompt : undefined,
        negativePrompt: 'brand names, branded products, Coca-Cola, corporate logos, product placement, holding random objects, holding drinks, holding food, holding phone',
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
      const url = await generateCharacterSheet(variants[selectedVariant], type)
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
    <div className="min-h-screen joi-mesh">
      <div className="px-4 md:px-8 pt-8 pb-2">
        <h1 className="joi-heading joi-glow text-2xl font-bold">
          <span style={{ color: 'var(--joi-pink)' }}>Crear</span>{' '}
          <span style={{ color: 'var(--joi-text-1)' }}>Personaje</span>
        </h1>
        <p className="joi-label mt-1" style={{ color: 'var(--joi-cyan-warm)' }}>Crea desde cero o importa imágenes de referencia</p>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 md:px-8 py-4">
        <div className="flex w-full md:w-auto md:inline-flex rounded-xl p-1" style={{ background: 'var(--joi-bg-2)', backdropFilter: 'blur(8px)' }}>
          {(['create', 'import'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setCharacterSaved(false) }}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: mode === m ? 'var(--joi-bg-3)' : 'transparent',
                color: mode === m ? 'var(--joi-text-1)' : 'var(--joi-text-3)',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
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
            <div className="p-8 text-center cursor-pointer transition-all mb-5 rounded-xl joi-glass"
              style={{ border: '1px dashed var(--joi-border)', borderColor: dragOver ? 'var(--joi-pink)' : undefined }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}>
              <div className="text-4xl mb-3" style={{ color: 'var(--joi-pink)' }}>{'\u2191'}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--joi-text-1)' }}>Sube 1-5 fotos claras de un rostro</div>
              <div className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>JPG, PNG, WEBP · Resolución mín: 512×512px · Máx 10MB c/u</div>
              <div className="text-[11px] mt-2 px-3 py-1.5 rounded-xl inline-block"
                style={{ background: 'rgba(99,102,241,.1)', color: 'var(--joi-pink)' }}>
                o haz clic para seleccionar archivos
              </div>
            </div>

            {/* Uploaded preview grid */}
            {importFiles.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--joi-text-3)' }}>
                  Subidas ({importFiles.length}/20)
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {importFiles.map((f, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative group"
                      style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border-h)' }}>
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
            <div className="p-5 space-y-4 rounded-xl joi-glass">
              <div>
                <label className="joi-label block mb-1.5">Nombre</label>
                <input value={importName} onChange={e => setImportName(e.target.value)} placeholder="Nombre del personaje"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors"
                  style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)' }} />
              </div>
              <div>
                <label className="joi-label block mb-1.5">Descripción (opcional)</label>
                <textarea value={importBio} onChange={e => setImportBio(e.target.value)} rows={3}
                  placeholder="Describe al personaje para mejor consistencia con AI..."
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors resize-none"
                  style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)' }} />
              </div>
              <button onClick={handleImport} disabled={generating}
                className={`joi-btn-solid w-full py-3 text-sm${!generating ? ' joi-breathe' : ''}`}>
                {generating ? '\u21BB Importando...' : '\u2726 Importar Personaje'}
              </button>
              {characterSaved && onNav && (
                <PipelineCTA label="Crear Foto Principal en Director" targetPage="studio" onNav={onNav} icon="\u{1F3AC}" />
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="hidden md:block md:w-[300px] shrink-0">
            <div className="p-5 sticky top-8 rounded-xl joi-glass">
              <div className="joi-label text-center mb-3">Vista Previa</div>
              <div className="aspect-[3/4] rounded-xl overflow-hidden" style={{ background: 'var(--joi-bg-3)', border: '1px solid rgba(255,255,255,.04)' }}>
                {importFiles.length > 0 ? (
                  <img src={URL.createObjectURL(importFiles[0])} className="w-full h-full object-cover" alt="Vista previa" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2" style={{ color: 'var(--joi-text-3)' }}>{'\u25C8'}</div>
                      <div className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>Sube imágenes para<br />generar vista previa</div>
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
        <div className="px-4 md:px-8 pb-20 md:pb-8 flex flex-col md:flex-row gap-6">
          <div className="flex-1 max-w-2xl">
            {/* Steps Navigation */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {steps.map((s, i) => (
                <button key={s} onClick={() => setStep(i)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all shrink-0"
                  style={{
                    background: step === i ? 'rgba(99,102,241,.08)' : 'transparent',
                    color: step === i ? 'var(--joi-pink)' : step > i ? 'var(--joi-magenta)' : 'var(--joi-text-3)',
                    border: step === i ? '1px solid rgba(99,102,241,.2)' : '1px solid transparent',
                  }}>
                  <span className="rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: step >= i ? (step === i ? 'var(--joi-pink)' : 'var(--joi-magenta)') : 'var(--joi-bg-3)',
                      color: step >= i ? '#fff' : 'var(--joi-text-3)',
                      width: 18, height: 18,
                    }}>
                    {step > i ? '\u2713' : i + 1}
                  </span>
                  {s}
                </button>
              ))}

              {/* Engine wrench button */}
              <div className="relative shrink-0 ml-auto">
                <button onClick={() => setShowEngineModal(v => !v)}
                  className="joi-btn-ghost w-8 h-8 rounded-xl flex items-center justify-center text-sm relative"
                  title="Motor de Generación">
                  🔧
                  {selectedEngine !== 'auto' && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--joi-pink)' }} />
                  )}
                </button>
              </div>
            </div>

            {/* ─── Step 0: Base ───────────────────────────────────── */}
            {step === 0 && (
              <div className="p-6 space-y-5 rounded-xl joi-glass">
                <div>
                  <label className="joi-label block mb-3">Estilo de Render</label>
                  <div className="grid grid-cols-3 gap-3">
                    {renderStyles.map((rs, i) => (
                      <button key={rs.id} onClick={() => setSelRenderStyle(i)}
                        className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] joi-border-glow"
                        style={{
                          background: selRenderStyle === i ? rs.bg : 'var(--joi-bg-3)',
                          border: `1.5px solid ${selRenderStyle === i ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.04)'}`,
                          boxShadow: selRenderStyle === i ? '0 0 20px rgba(99,102,241,.08)' : 'none',
                          backdropFilter: 'blur(8px)',
                        }}>
                        <span className="text-xl block mb-1.5">{rs.icon}</span>
                        <div className="text-[12px] font-semibold" style={{ color: selRenderStyle === i ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{rs.label}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: 'var(--joi-text-3)' }}>{rs.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="joi-label block mb-1.5">Nombre <span style={{ color: 'var(--joi-pink)' }}>*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej.: Luna Vex"
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none focus:border-[rgba(99,102,241,.4)] transition-colors"
                    style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)', backdropFilter: 'blur(8px)' }} />
                </div>

                <div>
                  <label className="joi-label block mb-2">Género <span style={{ color: 'var(--joi-pink)' }}>*</span></label>
                  <ChipSelector options={GENDERS} selected={selGender ? [selGender] : []}
                    onSelect={ids => setSelGender(ids[0] || null)} />
                </div>

                <div>
                  <label className="joi-label block mb-2">Edad <span style={{ color: 'var(--joi-pink)' }}>*</span></label>
                  <ChipSelector options={AGE_RANGES} selected={selAge ? [selAge] : []}
                    onSelect={ids => setSelAge(ids[0] || null)} color="var(--joi-magenta)" />
                </div>
              </div>
            )}

            {/* ─── Step 1: Look ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Builder / Prompt tabs */}
                <div className="inline-flex rounded-xl p-1" style={{ background: 'var(--joi-bg-2)', backdropFilter: 'blur(8px)' }}>
                  {(['builder', 'prompt'] as const).map(tab => (
                    <button key={tab} onClick={() => handleTabSwitch(tab)}
                      className="px-4 py-1.5 rounded-xl text-[12px] font-medium transition-all capitalize"
                      style={{
                        background: activeTab === tab ? 'var(--joi-bg-3)' : 'transparent',
                        color: activeTab === tab ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                        boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
                      }}>
                      {tab === 'builder' ? '\u{1F9E9} Constructor' : '\u270D\uFE0F Prompt'}
                    </button>
                  ))}
                </div>

                <div className="p-6 space-y-5 rounded-xl joi-glass">
                  {activeTab === 'builder' ? (
                    /* ─── Builder Tab ─── */
                    <>
                      {/* ── Básico ── */}
                      <div>
                        <label className="joi-label block mb-2">Origen / Etnia</label>
                        <ChipSelector options={ETHNICITIES} selected={chipSelections.ethnicity}
                          onSelect={ids => updateChip('ethnicity', ids)} />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Estilo de Cabello</label>
                        <ChipSelector options={HAIR_STYLES} selected={chipSelections.hairStyle}
                          onSelect={ids => updateChip('hairStyle', ids)} />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Color de Cabello</label>
                        <ChipSelector options={HAIR_COLORS} selected={chipSelections.hairColor}
                          onSelect={ids => updateChip('hairColor', ids)} color="var(--joi-magenta)" />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Tono de Piel</label>
                        <ChipSelector options={SKIN_TONES} selected={chipSelections.skinTone}
                          onSelect={ids => updateChip('skinTone', ids)} color="var(--joi-blue)" />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Tipo de Cuerpo</label>
                        <ChipSelector options={BODY_TYPES} selected={chipSelections.bodyType}
                          onSelect={ids => updateChip('bodyType', ids)} color="var(--joi-blue)" />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Altura</label>
                        <ChipSelector options={HEIGHTS} selected={chipSelections.height}
                          onSelect={ids => updateChip('height', ids)} />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Busto / Pecho</label>
                        <ChipSelector options={BUST_SIZES} selected={chipSelections.bust}
                          onSelect={ids => updateChip('bust', ids)} />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Cadera / Glúteos</label>
                        <ChipSelector options={HIP_SIZES} selected={chipSelections.hips}
                          onSelect={ids => updateChip('hips', ids)} />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Musculatura</label>
                        <ChipSelector options={MUSCULATURE} selected={chipSelections.musculature}
                          onSelect={ids => updateChip('musculature', ids)} />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Vello Facial</label>
                        <ChipSelector options={FACIAL_HAIR} selected={chipSelections.facialHair}
                          onSelect={ids => updateChip('facialHair', ids)} />
                      </div>

                      {/* ── Detalles faciales (avanzado) ── */}
                      <button
                        onClick={() => setShowAdvanced(v => !v)}
                        className="flex items-center gap-2 text-[11px] font-medium w-full py-1"
                        style={{ color: 'var(--joi-text-3)' }}>
                        <span style={{ display: 'inline-block', transition: 'transform .2s', transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                        {showAdvanced ? 'Ocultar detalles faciales' : 'Más detalles faciales →'}
                      </button>

                      {showAdvanced && (
                        <div className="space-y-5 pl-3 border-l-2" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                          <div>
                            <label className="joi-label block mb-2">Color de Ojos</label>
                            <ChipSelector options={EYE_COLORS} selected={chipSelections.eyeColor}
                              onSelect={ids => updateChip('eyeColor', ids)} color="var(--joi-magenta)" />
                          </div>
                          <div>
                            <label className="joi-label block mb-2">Forma de Ojos</label>
                            <ChipSelector options={EYE_SHAPES} selected={chipSelections.eyeShape}
                              onSelect={ids => updateChip('eyeShape', ids)} />
                          </div>
                          <div>
                            <label className="joi-label block mb-2">Tipo de Nariz</label>
                            <ChipSelector options={NOSE_TYPES} selected={chipSelections.noseType}
                              onSelect={ids => updateChip('noseType', ids)} color="var(--joi-magenta)" />
                          </div>
                          <div>
                            <label className="joi-label block mb-2">Forma de Labios</label>
                            <ChipSelector options={LIP_SHAPES} selected={chipSelections.lipShape}
                              onSelect={ids => updateChip('lipShape', ids)} color="var(--joi-pink)" />
                          </div>
                          <div>
                            <label className="joi-label block mb-2">Forma de Rostro</label>
                            <ChipSelector options={FACE_SHAPES} selected={chipSelections.faceShape}
                              onSelect={ids => updateChip('faceShape', ids)} />
                          </div>
                          <div>
                            <label className="joi-label block mb-2">Mandíbula</label>
                            <ChipSelector options={JAWLINES} selected={chipSelections.jawline}
                              onSelect={ids => updateChip('jawline', ids)} color="var(--joi-blue)" />
                          </div>
                          <div>
                            <label className="joi-label block mb-2">Cejas</label>
                            <ChipSelector options={EYEBROWS} selected={chipSelections.eyebrows}
                              onSelect={ids => updateChip('eyebrows', ids)} />
                          </div>
                          {!isPhotorealistic && (
                            <div>
                              <label className="joi-label block mb-2">Textura de Piel</label>
                              <ChipSelector options={SKIN_TEXTURES} selected={chipSelections.skinTexture}
                                onSelect={ids => updateChip('skinTexture', ids)} color="var(--joi-magenta)" />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* ─── Prompt Tab ─── */
                    <div>
                      <label className="joi-label block mb-2">Describe tu personaje</label>
                      <textarea
                        value={promptText}
                        onChange={e => setPromptText(e.target.value)}
                        rows={8}
                        placeholder={"Describe la apariencia de tu personaje en detalle.\n\nEjemplo: Una mujer de 25 años con cabello castaño ondulado, ojos verdes, pecas ligeras y una sonrisa cálida. Complexión atlética, usando una camisa de lino casual."}
                        className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-colors resize-none"
                        style={{
                          background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)',
                          color: 'var(--joi-text-1)', backdropFilter: 'blur(8px)',
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
                              style={{ background: 'rgba(99,102,241,.06)', color: 'var(--joi-pink)', border: '1px solid rgba(99,102,241,.12)' }}>
                              {ex.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
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
                            background: enhancing ? 'var(--joi-bg-3)' : 'rgba(99,102,241,.08)',
                            border: '1px solid rgba(99,102,241,.15)',
                            color: 'var(--joi-pink)',
                            opacity: (!promptText.trim() || enhancing) ? 0.4 : 1,
                          }}>
                          {enhancing ? '...' : '✨ Mejorar (2cr)'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reference photos — always visible */}
                <div className="p-5 rounded-xl joi-glass">
                  <div className="flex items-center justify-between mb-3">
                    <label className="joi-label">Fotos de Referencia (opcional)</label>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{referenceFiles.length}/5</span>
                  </div>
                  <div className="text-[10px] mb-3" style={{ color: 'var(--joi-text-3)' }}>Sube fotos para mejor consistencia</div>
                  <input ref={refInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleRefSelect} />
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.03] relative group"
                        onClick={() => { if (i >= referenceFiles.length) refInputRef.current?.click() }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={i >= referenceFiles.length ? handleRefDrop : undefined}
                        style={{
                          background: i < referenceFiles.length ? 'var(--joi-bg-3)' : 'var(--joi-bg-2)',
                          border: `1px solid ${i < referenceFiles.length ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
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
                            <span className="text-lg" style={{ color: 'var(--joi-text-3)' }}>+</span>
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
                <div className="p-6 space-y-5 rounded-xl joi-glass">
                  <div>
                    <label className="joi-label block mb-1">Estilo de Moda <span style={{ color: 'var(--joi-text-3)', fontWeight: 400 }}>(máx 2)</span></label>
                    <div className="mt-2">
                      <ChipSelector options={FASHION_STYLES} selected={selFashion}
                        onSelect={setSelFashion} maxSelect={2} color="var(--joi-magenta)" />
                    </div>
                  </div>

                  <div>
                    <label className="joi-label block mb-1">Personalidad <span style={{ color: 'var(--joi-text-3)', fontWeight: 400 }}>(máx 3)</span></label>
                    <div className="mt-2">
                      <ChipSelector options={PERSONALITY_TRAITS} selected={selPersonality}
                        onSelect={setSelPersonality} maxSelect={3} />
                    </div>
                  </div>

                  <div>
                    <label className="joi-label block mb-2">Accesorios <span style={{ color: 'var(--joi-text-3)', fontWeight: 400 }}>(máx 6)</span></label>
                    <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5 mt-3" style={{ color: 'var(--joi-text-3)' }}>Cotidianos</div>
                    <ChipSelector options={ACCESSORIES.filter(a => ['sunglasses','piercings','tattoos','jewelry','hat','scarf','watch','choker'].includes(a.id))} selected={selAccessories}
                      onSelect={setSelAccessories} maxSelect={6} color="var(--joi-blue)" />
                    <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5 mt-3" style={{ color: 'var(--joi-text-3)' }}>Fantasía</div>
                    <ChipSelector options={ACCESSORIES.filter(a => ['crown','mask','wings','horns','elf-ears','tail'].includes(a.id))} selected={selAccessories}
                      onSelect={setSelAccessories} maxSelect={6} color="var(--joi-blue)" />
                  </div>
                </div>

                {/* ─── Generation Zone ────────────────────────────── */}
                {generationPhase !== 'idle' && (
                  <div className="p-5 rounded-xl joi-glass space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="joi-label">Variantes Generadas</div>
                      {!characterSaved && !generating && (
                        <button onClick={resetGeneration}
                          className="text-[10px] px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                          style={{ color: 'var(--joi-text-3)', background: 'var(--joi-bg-3)', border: '1px solid rgba(255,255,255,.06)' }}>
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
                                border: selectedVariant === i ? '2px solid var(--joi-pink)' : '1px solid rgba(255,255,255,.04)',
                                boxShadow: selectedVariant === i ? '0 0 20px rgba(99,102,241,.15)' : 'none',
                              }}>
                              <img src={url} className="w-full h-full object-cover" alt={`Variant ${i + 1}`} />
                              {selectedVariant === i && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: 'var(--joi-pink)', color: '#fff' }}>{'\u2713'}</div>
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
                        <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--joi-text-3)' }}>
                          Hoja de Personaje (opcional)
                        </div>

                        {/* Step 1: Face Angles */}
                        {!sheetResults.face ? (
                          <button
                            onClick={() => handleGenerateSheet('face')}
                            disabled={sheetGenerating !== null}
                            className="w-full p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                            style={{
                              background: 'rgba(99,102,241,.04)',
                              border: '1px solid rgba(99,102,241,.10)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[12px] font-medium" style={{ color: 'var(--joi-text-1)' }}>
                                  {sheetGenerating === 'face' ? '\u21BB Generando...' : '\u{1F9D1} Ángulos de Rostro (4 vistas)'}
                                </div>
                                <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
                                  Frontal · Perfil derecho · Perfil izquierdo · Tres cuartos
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: 'rgba(99,102,241,.08)', color: 'var(--joi-pink)' }}>
                                {SHEET_CREDIT_COST}cr
                              </span>
                            </div>
                            {sheetGenerating === 'face' && (
                              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--joi-bg-3)' }}>
                                <div className="h-full rounded-full shimmer" style={{ width: '60%', background: 'linear-gradient(90deg, var(--joi-pink), var(--joi-magenta))' }} />
                              </div>
                            )}
                          </button>
                        ) : (
                          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,.10)' }}>
                            <img src={sheetResults.faceUltra || sheetResults.face} className="w-full object-contain" alt="Ángulos de rostro" />
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(99,102,241,.04)' }}>
                              <span className="text-[10px] font-mono" style={{ color: 'var(--joi-text-3)' }}>
                                {sheetResults.faceUltra ? '\u2728 Ultra Mejorado' : 'Ángulos de Rostro'}
                              </span>
                              {!sheetResults.faceUltra && (
                                <button
                                  onClick={() => handleUltraEnhance('face')}
                                  disabled={sheetGenerating !== null}
                                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg transition-colors hover:opacity-80"
                                  style={{ background: 'rgba(129,140,248,.12)', color: 'var(--joi-violet)', border: '1px solid rgba(129,140,248,.15)' }}
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
                              background: 'rgba(129,140,248,.04)',
                              border: '1px solid rgba(129,140,248,.10)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[12px] font-medium" style={{ color: 'var(--joi-text-1)' }}>
                                  {sheetGenerating === 'body' ? '\u21BB Generando...' : '\u{1F9CD} Ángulos de Cuerpo (4 vistas)'}
                                </div>
                                <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
                                  Frontal · Media vuelta · Perfil lateral · Espalda
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: 'rgba(129,140,248,.08)', color: 'var(--joi-violet)' }}>
                                {SHEET_CREDIT_COST}cr
                              </span>
                            </div>
                            {sheetGenerating === 'body' && (
                              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--joi-bg-3)' }}>
                                <div className="h-full rounded-full shimmer" style={{ width: '60%', background: 'linear-gradient(90deg, var(--joi-violet), var(--joi-pink))' }} />
                              </div>
                            )}
                          </button>
                        )}
                        {sheetResults.body && (
                          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(129,140,248,.10)' }}>
                            <img src={sheetResults.body} className="w-full object-contain" alt="Ángulos de cuerpo" />
                            <div className="px-3 py-2" style={{ background: 'rgba(129,140,248,.04)' }}>
                              <span className="text-[10px] font-mono" style={{ color: 'var(--joi-text-3)' }}>Ángulos de Cuerpo</span>
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
                              background: 'rgba(99,102,241,.04)',
                              border: '1px solid rgba(99,102,241,.10)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[12px] font-medium" style={{ color: 'var(--joi-text-1)' }}>
                                  {sheetGenerating === 'expressions' ? '\u21BB Generando...' : '\u{1F3AD} Expresiones (9 rostros)'}
                                </div>
                                <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
                                  Feliz · Triste · Sorprendido · Enojado · Riendo · Serio · Coqueto · Disgustado · Tranquilo
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: 'rgba(99,102,241,.08)', color: 'var(--joi-pink)' }}>
                                {SHEET_CREDIT_COST}cr
                              </span>
                            </div>
                            {sheetGenerating === 'expressions' && (
                              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--joi-bg-3)' }}>
                                <div className="h-full rounded-full shimmer" style={{ width: '60%', background: 'linear-gradient(90deg, var(--joi-pink), var(--joi-magenta))' }} />
                              </div>
                            )}
                          </button>
                        )}
                        {sheetResults.expressions && (
                          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,.10)' }}>
                            <img src={sheetResults.expressionsUltra || sheetResults.expressions} className="w-full object-contain" alt="Expresiones" />
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(99,102,241,.04)' }}>
                              <span className="text-[10px] font-mono" style={{ color: 'var(--joi-text-3)' }}>
                                {sheetResults.expressionsUltra ? '\u2728 Ultra Mejorado' : 'Expresiones'}
                              </span>
                              {!sheetResults.expressionsUltra && (
                                <button
                                  onClick={() => handleUltraEnhance('expressions')}
                                  disabled={sheetGenerating !== null}
                                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg transition-colors hover:opacity-80"
                                  style={{ background: 'rgba(129,140,248,.12)', color: 'var(--joi-violet)', border: '1px solid rgba(129,140,248,.15)' }}
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
                            className="joi-btn-solid w-full py-3 text-sm joi-breathe">
                            {'\u2726'} Guardar Personaje
                          </button>
                        )}
                      </div>
                    )}

                    {characterSaved && onNav && (
                      <div className="space-y-2">
                        <div className="text-center text-[12px] font-medium" style={{ color: 'var(--joi-mint, var(--joi-pink))' }}>
                          {'\u2713'} Personaje guardado!
                        </div>
                        <PipelineCTA label="Crear Foto Principal en Director" targetPage="studio" onNav={onNav} icon="\u{1F3AC}" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Navigation Buttons ────────────────────────────── */}
            <div className="flex justify-between mt-5">
              <button onClick={() => setStep(Math.max(0, step - 1))}
                className="joi-btn-ghost px-5 py-2.5 text-sm"
                style={{ opacity: step === 0 ? .3 : 1 }} disabled={step === 0}>
                {'\u2190'} Atrás
              </button>
              {step < 2 ? (
                <div className="flex items-center gap-3">
                  {missingFields.length > 0 && (
                    <span className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
                      Falta: {missingFields.join(', ')}
                    </span>
                  )}
                  <button onClick={() => setStep(step + 1)}
                    className="joi-btn-solid px-6 py-2.5 text-sm"
                    disabled={!canAdvance(step)}>
                    Siguiente {'\u2192'}
                  </button>
                </div>
              ) : (
                generationPhase === 'idle' && (
                  <button onClick={handleGenerate}
                    className={`joi-btn-solid px-6 py-2.5 text-sm${!generating ? ' joi-breathe' : ''}`}
                    disabled={generating}>
                    {generating ? '\u21BB Generando...' : `\u2726 Generar Personaje (3 variantes, ${costPerVariant * 3}cr)`}
                  </button>
                )
              )}
            </div>
          </div>

          {/* ─── Right: Preview Panel ──────────────────────────── */}
          <div className="w-full md:w-[320px] shrink-0">
            <div className="p-5 sticky top-8 rounded-xl joi-glass">
              <div className="flex items-center justify-between mb-3">
                <div className="joi-label">Vista Previa</div>
                <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,.15), rgba(79,70,229,.15))', color: 'var(--joi-pink)' }}>
                  {renderStyles[selRenderStyle]?.label.toUpperCase()}
                </span>
              </div>

              <div className="aspect-[3/4] rounded-xl overflow-hidden relative"
                style={{
                  background: selectedVariant !== null ? 'var(--joi-bg-2)' : renderStyles[selRenderStyle]?.bg || 'var(--joi-bg-2)',
                  border: '1px solid rgba(255,255,255,.04)',
                }}>
                {selectedVariant !== null && variants[selectedVariant] ? (
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
                        style={{ background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.12)' }} />
                    </div>
                    {/* Body silhouette */}
                    <div className="mt-1 flex flex-col items-center">
                      <div style={{ width: '10px', height: '6px', background: 'rgba(99,102,241,.06)', borderRadius: '0 0 4px 4px' }} />
                      <div className="rounded-t-2xl" style={{ width: '60px', height: '8px', background: 'rgba(99,102,241,.06)' }} />
                      <div style={{ width: '52px', height: '44px', background: 'rgba(99,102,241,.04)', borderRadius: '30%' }} />
                      <div className="flex gap-1 -mt-0.5">
                        <div style={{ width: '12px', height: '20px', background: 'rgba(99,102,241,.03)', borderRadius: '0 0 6px 6px' }} />
                        <div style={{ width: '12px', height: '20px', background: 'rgba(99,102,241,.03)', borderRadius: '0 0 6px 6px' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.7))' }}>
                  <div className="text-sm font-bold text-white">{name || 'Sin nombre'}</div>
                  <div className="text-[9px] font-mono" style={{ color: 'var(--joi-pink)' }}>
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
                  return chip ? <span key={id} className="badge" style={{ background: 'rgba(99,102,241,.1)', color: 'var(--joi-pink)' }}>{chip.label}</span> : null
                })}
                {selFashion.map(id => {
                  const chip = FASHION_STYLES.find(c => c.id === id)
                  return chip ? <span key={id} className="badge" style={{ background: 'rgba(79,70,229,.1)', color: 'var(--joi-magenta)' }}>{chip.label}</span> : null
                })}
              </div>

              {/* Generation loading indicator */}
              {generating && (
                <div className="mt-3 text-center">
                  <div className="text-[11px] font-medium" style={{ color: 'var(--joi-pink)' }}>
                    {'\u21BB'} Generando{generationPhase === 'sheet' ? ' hoja de personaje' : ' variantes'}...
                  </div>
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--joi-bg-3)' }}>
                    <div className="h-full rounded-full shimmer" style={{ width: '60%', background: 'linear-gradient(90deg, var(--joi-pink), var(--joi-magenta))' }} />
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
              background: 'var(--joi-bg-glass)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,.04)',
              boxShadow: '0 20px 60px rgba(0,0,0,.6)',
              overflow: 'hidden',
            }}>
            <div className="overflow-y-auto p-4 pb-2 space-y-1 flex-1 min-h-0 joi-scroll">
              <div className="joi-label mb-2 px-1">Motor de Generación</div>

              <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                style={{
                  background: selectedEngine === 'auto' ? 'rgba(99,102,241,.08)' : 'transparent',
                  border: `1px solid ${selectedEngine === 'auto' ? 'rgba(99,102,241,.2)' : 'transparent'}`,
                }}>
                <span className="text-base">{'\u2728'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>Auto</div>
                  <div className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>Mejor motor automáticamente</div>
                </div>
              </button>

              <div className="h-px my-1 joi-divider" />

              {/* Recommended engines for character creation */}
              <div className="joi-label mb-1 mt-2 px-1 text-[9px]" style={{ color: 'var(--joi-text-3)' }}>Mejor para Personajes</div>
              {CHARACTER_ENGINES.map(ce => {
                const meta = ENGINE_METADATA.find(e => e.key === ce.id);
                return (
                  <button key={ce.id}
                    onClick={() => { setSelectedEngine(ce.id); setShowEngineModal(false) }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: selectedEngine === ce.id ? 'rgba(99,102,241,.10)' : 'rgba(255,255,255,.02)',
                      border: `1px solid ${selectedEngine === ce.id ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.04)'}`,
                    }}>
                    <span className="text-sm" style={{ color: ce.badge ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>
                      {ce.badge ? '\u2B50' : '\u2699'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium" style={{ color: selectedEngine === ce.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{ce.label}</span>
                        {ce.badge && (
                          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{
                            background: 'rgba(99,102,241,.15)',
                            color: 'var(--joi-pink)',
                            border: '1px solid rgba(99,102,241,.2)',
                          }}>{ce.badge}</span>
                        )}
                      </div>
                      <div className="text-[8px]" style={{ color: 'var(--joi-text-3)' }}>{ce.desc}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[9px] font-mono" style={{ color: 'var(--joi-pink)' }}>{meta?.creditCost ?? '?'}cr</div>
                      <div className="text-[8px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{meta?.estimatedTime ?? ''}</div>
                    </div>
                  </button>
                );
              })}

            </div>

            <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
              <div className="joi-label mb-2 px-1">Resolución</div>
              <div className="flex gap-2">
                {[
                  { id: '1k', label: '1K', desc: '1024px' },
                  { id: '2k', label: '2K', desc: '2048px' },
                  { id: '4k', label: '4K', desc: '4096px' },
                ].map(r => (
                  <button key={r.id} onClick={() => setSelectedResolution(r.id)}
                    className="flex-1 px-3 py-2 rounded-xl text-center transition-all"
                    style={{
                      background: selectedResolution === r.id ? 'rgba(99,102,241,.08)' : 'var(--joi-bg-3)',
                      border: `1px solid ${selectedResolution === r.id ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.04)'}`,
                      backdropFilter: 'blur(8px)',
                    }}>
                    <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{r.label}</div>
                    <div className="text-[8px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{r.desc}</div>
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
