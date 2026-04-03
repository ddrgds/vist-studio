import { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useGalleryStore } from '../stores/galleryStore'
import { useCharacterStore } from '../stores/characterStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { editImageWithAI, faceSwapWithGemini } from '../services/geminiService'
import { editImageWithFluxKontext, editImageWithSeedream5, editImageWithFlux2Pro, editImageWithGrokFal, editImageWithQwen, editImageWithFireRed, inpaintWithOneReward, editImageWithSeedream5Lite, removeBackground } from '../services/falService'
import { editImageWithGPT } from '../services/openaiService'
import { editWithSoulReference } from '../services/higgsfieldService'
import { editWithPruna } from '../services/replicateService'
import { ENGINE_METADATA, FEATURE_ENGINES, AIProvider, AspectRatio, CREDIT_COSTS } from '../types'
import { runEditWithFallback, generateCharacterSheet, enhanceSheetWithGrok, type SheetType } from '../services/toolEngines'
import { SOUL_STYLES, SOUL_STYLE_CATEGORIES, type SoulStyleCategory } from '../data/soulStyles'
import { useNavigationStore } from '../stores/navigationStore'
import { usePipelineStore } from '../stores/pipelineStore'
import { PipelineCTA } from '../components/PipelineCTA'
import { ImageComparison } from '../components/ui/image-comparison-slider'
// Dazz engine deferred to post-MVP — using AI prompts for now

// Lazy load modals (they're heavy)
const RelightModal = lazy(() => import('../components/RelightModal'))
const InpaintingModal = lazy(() => import('../components/InpaintingModal'))
const SkinEnhancerModal = lazy(() => import('../components/SkinEnhancerModal'))
const ImageEditor = lazy(() => import('../components/ImageEditor'))

// Primary tools — always visible in toolbar
const PRIMARY_TOOLS = [
  { id:'freeai', label:'AI Edit', icon:'\u2728', desc:'Edita con cualquier instruccion en lenguaje natural' },
  { id:'reimagine', label:'Reimaginar', icon:'\u2726', desc:'Crea una foto nueva con 100+ estilos', featured: true },
  { id:'dazz', label:'Efectos', icon:'\uD83C\uDFAC', desc:'Camaras analogicas, filtros de pelicula y efectos' },
  { id:'realskin', label:'Piel', icon:'\uD83E\uDDF4', desc:'Agrega poros naturales, textura e imperfecciones' },
]

// Secondary tools — shown in "Otros" expandable
const SECONDARY_TOOLS = [
  { id:'relight', label:'Reiluminar', icon:'\uD83D\uDCA1', desc:'Cambia la iluminacion de cualquier foto' },
  { id:'faceswap', label:'Cambio de Rostro', icon:'\uD83C\uDFAD', desc:'Intercambia rostros entre imagenes' },
  { id:'tryon', label:'Try-On Virtual', icon:'\uD83D\uDC57', desc:'Prueba ropa y accesorios' },
  { id:'rotate360', label:'Angulos 360\u00b0', icon:'\uD83D\uDD04', desc:'Genera vistas desde todos los angulos' },
  { id:'composite', label:'Escena / Fondo', icon:'\uD83C\uDFAC', desc:'Cambia el fondo o coloca en otra escena' },
  { id:'enhance', label:'Mejorar', icon:'\u2728', desc:'Mejora la calidad y los detalles' },
  { id:'style', label:'Transferencia de Estilo', icon:'\uD83C\uDFA8', desc:'Aplica estilos artisticos' },
  { id:'inpaint', label:'Inpaint', icon:'\uD83D\uDD8C\uFE0F', desc:'Edita areas especificas' },
  { id:'rembg', label:'Quitar Fondo', icon:'\u2702\uFE0F', desc:'Elimina el fondo al instante' },
  { id:'expand', label:'Expandir', icon:'\u2194\uFE0F', desc:'Expande la imagen mas alla de sus bordes' },
]

// Combined for logic that needs all tools
const tools = [...PRIMARY_TOOLS, ...SECONDARY_TOOLS]

const relightPresets = [
  { n:'Golden Hour',  c:'#f0b860', prompt:'golden hour warm sunset lighting, warm 3200K, long soft shadows, golden rim highlights on hair and shoulders' },
  { n:'Blue Hour',    c:'#6ba3d9', prompt:'blue hour twilight, cool 7500K ambient, no direct sun, diffused soft quality, contemplative mood' },
  { n:'Studio',       c:'#e8e4dc', prompt:'professional studio lighting, beauty dish key, neutral 5500K, clean even illumination, fashion photography' },
  { n:'Neon',         c:'#e8725c', prompt:'neon colored lighting, vivid color cast on skin, complementary shadows, urban night atmosphere' },
  { n:'Dramatic',     c:'#d4603e', prompt:'dramatic chiaroscuro lighting, high contrast, deep shadows, single hard key light, theatrical intensity' },
  { n:'Moonlight',    c:'#9a90c4', prompt:'soft moonlight, blue-silver cast, gentle shadows, nocturnal atmosphere, low intensity' },
  { n:'Sunset',       c:'#d9826a', prompt:'late sunset amber-gold directional light, extreme warm 2800K, long dramatic shadows, golden halo on hair' },
  { n:'Overcast',     c:'#b8c9d9', prompt:'overcast daylight, perfectly diffused shadowless illumination, neutral color, even exposure, clean quality' },
  { n:'Ring Light',   c:'#f0e8e0', prompt:'ring light on camera axis, circular catchlights in eyes, flat front-fill, beauty-influencer aesthetic' },
  { n:'Rembrandt',    c:'#c8a060', prompt:'classic Rembrandt lighting pattern, key light from 45 creating triangle on shadow cheek, painterly quality' },
]

const relightDirections = [
  { id: 'left',   label: 'Izquierda', prompt: 'Light source from the left side' },
  { id: 'front',  label: 'Frontal',   prompt: 'Light source from the front, facing the subject' },
  { id: 'right',  label: 'Derecha',   prompt: 'Light source from the right side' },
  { id: 'above',  label: 'Arriba',    prompt: 'Light source from directly above' },
  { id: 'behind', label: 'Contraluz', prompt: 'Backlight from behind the subject, rim lighting on edges' },
]

const relightIntensities = [
  { id: 'subtle',   label: 'Sutil',     prompt: 'Apply the lighting change subtly, as a gentle shift in mood' },
  { id: 'normal',   label: 'Normal',    prompt: 'Apply a clear, natural lighting change' },
  { id: 'dramatic', label: 'Dramatico', prompt: 'Apply an extreme, highly dramatic lighting change with strong contrast' },
]

const angleViews = ['Front','Right 45\u00b0','Right 90\u00b0','Back Right','Back','Back Left','Left 90\u00b0','Left 45\u00b0']

const styleTransfers = [
  { name: 'Anime', prompt: 'high-quality anime illustration: clean cel-shaded coloring, precise linework with variable weight, large expressive eyes with detailed iris reflections, stylized proportions, vibrant palette, studio Trigger quality' },
  { name: 'Oil Painting', prompt: 'classical oil painting: visible impasto brushwork with texture, Renaissance color mixing with glazing layers, warm Rembrandt lighting, canvas texture underneath, rich deep shadows with burnt umber undertones' },
  { name: 'Watercolor', prompt: 'delicate watercolor painting: transparent wash layers building form, wet-on-wet bleeding on edges, white paper showing through as highlights, granulation texture, soft color blooms, controlled dripping' },
  { name: 'Pop Art', prompt: 'bold Pop Art: flat graphic colors with Ben-Day dot patterns, strong black outlines, Warhol/Lichtenstein aesthetic, limited 4-6 saturated colors, halftone screening, comic-book drama' },
  { name: 'Sketch', prompt: 'detailed pencil sketch: graphite on textured paper, varied line weight from light construction to dark contour, cross-hatching for shadow, visible guide lines, white highlights where paper shows' },
  { name: 'Pixel Art', prompt: 'pixel art: visible pixel grid at 128px scale, limited 32-color palette with intentional dithering, each pixel hand-placed quality, clean readable silhouette, retro game aesthetic' },
  { name: 'Vintage Film', prompt: 'vintage 1970s film: Kodachrome color science with saturated reds, heavy organic grain, slight fading on edges, warm amber cast, soft focus from vintage optics, light leak artifacts' },
  { name: 'Cyberpunk', prompt: 'cyberpunk digital art: neon-lit futuristic aesthetic, holographic UI elements on skin, circuit-board textures, teal-magenta color split, chrome accents, glitch artifacts, rain-streaked Blade Runner 2049 palette' },
]

const bgPresets = ['Studio','Nature','City','Interior','Abstract','Custom']

const TOOL_TO_FEATURE: Record<string, string> = {
  'freeai': 'relight',
  'relight': 'relight',
  'rotate360': 'angles',
  'faceswap': 'face-swap',
  'tryon': 'try-on',
  'bgswap': 'bg-swap',
  'composite': 'bg-swap',
  'enhance': 'enhance',
  'style': 'style-transfer',
  'realskin': 'skin-enhancer',
  'inpaint': 'inpaint',
  'expand': 'expand',
  'dazz': 'relight',
}

async function urlToFile(url: string, filename = 'character.png'): Promise<File> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

const routeEdit = async (
  engineKey: string,
  file: File,
  instruction: string,
  onProgress?: (p: number) => void,
  abortSignal?: AbortSignal,
  referenceImage?: File | null,
  bypassCompiler?: boolean,
): Promise<string[]> => {
  const eng = ENGINE_METADATA.find(e => e.key === engineKey)
  if (engineKey === 'fal:qwen-edit') {
    return editImageWithQwen(file, instruction, onProgress, abortSignal)
  }
  if (engineKey === 'fal:firered-edit') {
    const refs = referenceImage ? [referenceImage] : []
    return editImageWithFireRed(file, instruction, refs, onProgress, abortSignal)
  }
  if (engineKey === 'fal:onereward') {
    if (!referenceImage) {
      throw new Error('OneReward requires a mask image. Use the Inpaint tool modal to paint a mask.')
    }
    return inpaintWithOneReward(file, referenceImage, instruction, onProgress, abortSignal)
  }
  if (engineKey === 'fal:seedream5-edit') {
    return editImageWithSeedream5Lite(file, instruction, onProgress, abortSignal)
  }
  if (engineKey === 'fal:kontext-multi' || eng?.falModel === 'fal-ai/flux-pro/kontext/multi') {
    return editImageWithFluxKontext(file, instruction, onProgress, undefined, abortSignal)
  }
  if (engineKey.startsWith('fal:seedream')) {
    const refs = referenceImage ? [referenceImage] : []
    return editImageWithSeedream5(file, instruction, refs, onProgress, undefined, abortSignal)
  }
  if (engineKey === 'fal:flux2pro') {
    const refs = referenceImage ? [referenceImage] : []
    return editImageWithFlux2Pro(file, instruction, refs, onProgress, undefined, abortSignal)
  }
  if (engineKey === 'replicate:grok') {
    const refs = referenceImage ? [referenceImage] : []
    return editImageWithGrokFal(file, instruction, onProgress, abortSignal, refs, bypassCompiler)
  }
  if (engineKey === 'replicate:pruna') {
    return editWithPruna(file, instruction, onProgress, abortSignal, referenceImage ?? null).then(r => [r])
  }
  if (eng?.provider === AIProvider.OpenAI) {
    return editImageWithGPT(file, instruction, onProgress, undefined, abortSignal)
  }
  return editImageWithAI(
    { baseImage: file, instruction, referenceImage: referenceImage ?? null, model: eng?.geminiModel },
    onProgress, abortSignal,
  )
}

/* ─────────────────────────────────────────────────────────────────
   AIEditorV2 — canvas-first layout with floating toolbar & bottom sheet
   ───────────────────────────────────────────────────────────────── */

export function AIEditorV2({ onNav }: { onNav?: (page: string) => void }) {
  // ── All state (identical to AIEditor) ──────────────────────────
  const [activeTool, setActiveTool] = useState('freeai')
  const [selPreset, setSelPreset] = useState(0)
  const [relightDir, setRelightDir] = useState('front')
  const [relightIntensity, setRelightIntensity] = useState('normal')
  const [sel360, setSel360] = useState(0)
  const [sheetGenerating, setSheetGenerating] = useState<SheetType | null>(null)
  const [sheetResult, setSheetResult] = useState<string | null>(null)
  const [editorCharFilter, setEditorCharFilter] = useState<string | null>(null)
  const [editorLightbox, setEditorLightbox] = useState<string | null>(null)
  const [editorResolution, setEditorResolution] = useState('2k')
  const [editorAspectRatio, setEditorAspectRatio] = useState<AspectRatio>(AspectRatio.Portrait)
  const [selStyle, setSelStyle] = useState(0)
  const [selBg, setSelBg] = useState(0)
  const [bgMode, setBgMode] = useState<'Preset'|'Upload'|'Prompt'>('Preset')
  const [freePrompt, setFreePrompt] = useState('')
  const [reimagineStyleIds, setReimagineStyleIds] = useState<Set<string>>(new Set())
  const [reimagineCategory, setReimagineCategory] = useState<SoulStyleCategory | 'all'>('all')
  const [reimagineSearch, setReimagineSearch] = useState('')
  const [showAllStyles, setShowAllStyles] = useState(false)

  // Efectos category filter
  const [dazzCategory, setDazzCategory] = useState('all')
  const [reimagineCustom, setReimagineCustom] = useState('')
  const [sceneImage, setSceneImage] = useState<string | null>(null)
  const [sceneFile, setSceneFile] = useState<File | null>(null)
  const [scenePrompt, setScenePrompt] = useState('')
  const [sceneSource, setSceneSource] = useState<'upload'|'gallery'|'prompt'>('upload')
  const sceneInputRef = useRef<HTMLInputElement>(null)
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  // selectedResolution removed — merged into editorResolution
  const [showEngineModal, setShowEngineModal] = useState(false)
  const engineButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [inputFile, setInputFile] = useState<File | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [editHistory, setEditHistory] = useState<string[]>([])
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const [compareMode, setCompareMode] = useState(false)
  const [faceSwapFile, setFaceSwapFile] = useState<File | null>(null)
  const [faceSwapPreview, setFaceSwapPreview] = useState<string | null>(null)
  const faceSwapInputRef = useRef<HTMLInputElement>(null)
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAllTools, setShowAllTools] = useState(() => {
    try { return localStorage.getItem('vist-editor-all-tools') === 'true' } catch { return false }
  })
  const [showBasicEditor, setShowBasicEditor] = useState(false)
  const [expandDirection, setExpandDirection] = useState<string>('all')
  const [expandPixels, setExpandPixels] = useState(256)
  const [skinPreset, setSkinPreset] = useState<'soft'|'natural'|'realistic'|'ultra'|'custom'>('natural')
  const [skinSliders, setSkinSliders] = useState({ pores: 50, veins: 20, tension: 40, imperfections: 30, sss: 50, hydration: 40 })
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // V2-specific: bottom sheet state for mobile
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)

  const { decrementCredits, restoreCredits } = useProfile()

  const displayCost = useMemo(() => {
    if (activeTool === 'reimagine') return 8
    const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
    if (eng) return eng.creditCost
    return activeTool === 'rotate360' ? 10 : 8
  }, [selectedEngine, activeTool])

  const toast = useToast()
  const addItems = useGalleryStore(s => s.addItems)
  const galleryItems = useGalleryStore(s => s.items)
  const characters = useCharacterStore(s => s.characters)
  const { pendingImage, pendingTarget, consume: consumeNav } = useNavigationStore()

  useEffect(() => {
    const featureKey = TOOL_TO_FEATURE[activeTool]
    const featureDef = featureKey ? FEATURE_ENGINES[featureKey] : null
    if (featureDef) {
      setSelectedEngine(featureDef.default)
    } else {
      setSelectedEngine('auto')
    }
  }, [activeTool])

  useEffect(() => {
    const el = canvasContainerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (!inputImage) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      setCanvasZoom(z => {
        const nz = Math.max(0.5, Math.min(5, z + delta))
        if (nz <= 1) setCanvasPan({ x: 0, y: 0 })
        return nz
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [inputImage])

  useEffect(() => {
    if (pendingTarget === 'editor' && pendingImage) {
      setInputImage(pendingImage)
      setResultImage(null)
      detectAndSetCharacter(pendingImage)
      urlToFile(pendingImage, 'from-gallery.png')
        .then(file => setInputFile(file))
        .catch(() => setInputFile(null))
      consumeNav()
    }
  }, [pendingTarget, pendingImage])

  const pipelineHeroUrl = usePipelineStore(s => s.heroShotUrl)
  const pipelineCharId = usePipelineStore(s => s.characterId)
  const pipelineSetEditedHero = usePipelineStore(s => s.setEditedHero)
  const pipelineSetCharacter = usePipelineStore(s => s.setCharacter)

  const detectAndSetCharacter = (imageUrl: string) => {
    const item = galleryItems.find(i => i.url === imageUrl && i.characterId)
    if (item?.characterId) pipelineSetCharacter(item.characterId)
  }

  const getCharRefFiles = async (): Promise<File[]> => {
    if (!pipelineCharId) return []
    const char = characters.find(c => c.id === pipelineCharId)
    if (!char) return []
    const urls = char.referencePhotoUrls?.slice(0, 4) || char.modelImageUrls?.slice(0, 4) || []
    if (urls.length === 0) return []
    const files: File[] = []
    await Promise.allSettled(urls.map(async (url, i) => {
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        files.push(new File([blob], `char-ref-${i}.jpg`, { type: blob.type || 'image/jpeg' }))
      } catch {}
    }))
    return files
  }

  useEffect(() => {
    if (pipelineHeroUrl && !inputImage && !pendingImage) {
      setInputImage(pipelineHeroUrl)
      setResultImage(null)
      detectAndSetCharacter(pipelineHeroUrl)
      setIsLoadingFile(true)
      urlToFile(pipelineHeroUrl, 'pipeline-hero.png')
        .then(file => setInputFile(file))
        .catch(() => { setInputFile(null); setInputImage(null) })
        .finally(() => setIsLoadingFile(false))
    }
  }, [pipelineHeroUrl])

  useEffect(() => {
    if (!showEngineModal) return
    const close = () => setShowEngineModal(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [showEngineModal])


  // ── handleApply — identical logic ──────────────────────────────
  const handleApply = async () => {
    if (!inputImage) { toast.error('Sube una imagen primero'); return }

    if (['inpaint', 'enhance'].includes(activeTool)) { setActiveModal(activeTool); return }
    if (activeTool === 'faceswap' && !faceSwapFile) { toast.error('Sube una foto del rostro de origen primero'); return }
    if (activeTool === 'tryon' && !garmentFile) { toast.error('Sube una referencia de outfit primero'); return }
    if (activeTool === 'freeai' && !freePrompt.trim()) { toast.error('Escribe una instruccion primero'); return }
    if (activeTool === 'reimagine' && reimagineStyleIds.size === 0 && !reimagineCustom.trim()) { return }
    if (activeTool === 'composite') {
      if (!sceneImage && !scenePrompt.trim()) { toast.error('Sube una imagen de escena o describe la escena'); return }
    }
    if (!inputFile && activeTool !== 'rembg') {
      if (isLoadingFile) { toast.info('Espera, cargando imagen...') } else { toast.error('Sube una imagen primero') }
      return
    }

    setProcessing(true)
    setProgress(0)

    const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
    const baseCost = activeTool === 'rotate360' ? 10 : 8
    const cost = eng ? eng.creditCost : baseCost
    const ok = await decrementCredits(cost)
    if (!ok) { toast.error('Creditos insuficientes'); setProcessing(false); return }

    const outputOpts = { imageSize: editorResolution === '4k' ? '4K' : editorResolution === '1k' ? '1K' : '2K', aspectRatio: editorAspectRatio }
    const engineLabel = eng?.userFriendlyName || (selectedEngine === 'auto' ? 'Auto' : selectedEngine)

    try {
      let resultUrls: string[] = []

      if (activeTool === 'freeai' || activeTool === 'dazz') {
        const charRefs = await getCharRefFiles()
        const instruction = freePrompt.trim()
        try {
          const results = await editImageWithAI({ baseImage: inputFile!, referenceImage: charRefs[0] ?? undefined, instruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio }, (p) => setProgress(p))
          if (!results || results.filter(Boolean).length === 0) throw new Error('NB2 returned empty')
          resultUrls = results
        } catch (nb2Err) {
          console.warn('NB2 freeai failed, trying Seedream:', nb2Err)
          try {
            resultUrls = await editImageWithSeedream5(inputFile!, instruction, charRefs, (p) => setProgress(p))
          } catch (sdErr) {
            console.warn('Seedream freeai failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile!, instruction, (p) => setProgress(p), undefined, charRefs)
          }
        }
      } else if (activeTool === 'relight') {
        const preset = relightPresets[selPreset]
        const dir = relightDirections.find(d => d.id === relightDir) || relightDirections[1]
        const intensity = relightIntensities.find(i => i.id === relightIntensity) || relightIntensities[1]
        const instruction = `${preset.prompt}. ${dir.prompt}. ${intensity.prompt}`
        const result = await runEditWithFallback(inputImage!, instruction, 'nb2', 'relight', outputOpts)
        resultUrls = [result.url]
      } else if (activeTool === 'rotate360') {
        const view = angleViews[sel360]
        const envHints: Record<string, string> = {
          'Front': 'centered background, eye-level perspective',
          'Right 45\u00b0': 'background shifts to show what was to the left of the original frame, slight parallax',
          'Right 90\u00b0': 'completely different background \u2014 perpendicular view of the space, only the side wall or environment visible',
          'Back Right': 'background now shows what was behind the camera in the original photo',
          'Back': 'full reverse view \u2014 we see the opposite side of the environment',
          'Back Left': 'background shows what was behind and to the right of the original camera',
          'Left 90\u00b0': 'completely different background \u2014 perpendicular view from the other side',
          'Left 45\u00b0': 'background shifts to show what was to the right of the original frame, slight parallax',
        }
        const envHint = envHints[view] || 'background changes naturally to match the new camera position'
        const instruction = `Create a new photograph of this person from a ${view.toLowerCase()} camera angle. The camera has moved around the subject. Keep exact same person, clothing, hairstyle, body. Background MUST change: ${envHint}. Render from the new camera perspective.`
        const result = await runEditWithFallback(inputImage!, instruction, 'nb2', 'angles', outputOpts)
        resultUrls = [result.url]
      } else if (activeTool === 'composite') {
        const sceneDesc = scenePrompt.trim()
        const hasSceneRef = !!sceneImage
        const sceneSpec = {
          task: 'SCENE CHANGE \u2014 Place person into new environment',
          image_1_BASE: { role: 'THE PERSON \u2014 subject to preserve completely', preserve: ['face', 'hair', 'skin', 'body', 'outfit', 'pose'], rule: 'Do NOT alter the person in any way' },
          ...(hasSceneRef ? { image_2_REFERENCE: { role: 'SCENE REFERENCE \u2014 the target environment', use: 'location, architecture, colors, atmosphere, lighting mood', ignore: 'Any people visible in the scene reference \u2014 they are NOT the subject' } } : {}),
          scene: { description: sceneDesc || (hasSceneRef ? 'Match the reference scene exactly' : 'professional studio'), integration: 'Match lighting direction, color temperature, shadows, and color grading so person looks naturally photographed in this location' },
        }
        const jsonSceneInstruction = `SCENE SPECIFICATION:\n${JSON.stringify(sceneSpec, null, 2)}`
        const flatSceneInstruction = hasSceneRef && sceneDesc
          ? `Place this person into the reference scene. Additional: ${sceneDesc}. Keep person identical. Match lighting and color grading.`
          : hasSceneRef
          ? `Place this person into the exact scene from the reference image. Keep person identical. Match lighting.`
          : `Change background/scene to: ${sceneDesc}. Keep person identical. Match lighting and color grading.`
        const charRefs = await getCharRefFiles()
        try {
          const results = await editImageWithAI({ baseImage: inputFile, referenceImage: sceneFile ?? charRefs[0] ?? undefined, instruction: jsonSceneInstruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio }, (p) => setProgress(p))
          if (!results || results.filter(Boolean).length === 0) throw new Error('NB2 returned empty')
          resultUrls = results
        } catch (nb2Err) {
          console.warn('NB2 scene failed, trying Seedream:', nb2Err)
          const allRefs = [...(sceneFile ? [sceneFile] : []), ...charRefs]
          try {
            resultUrls = await editImageWithSeedream5(inputFile!, flatSceneInstruction, allRefs, (p) => setProgress(p))
          } catch (sdErr) {
            console.warn('Seedream scene failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile!, flatSceneInstruction, (p) => setProgress(p), undefined, allRefs)
          }
        }
      } else if (activeTool === 'style') {
        const style = styleTransfers[selStyle]
        const instruction = `Transform the entire image into ${style.name} style. ${style.prompt}. The person's face must remain recognizable but the visual rendering should change to match this aesthetic. Use reference images ONLY for face and body proportions identity \u2014 IGNORE their clothing.`
        const charRefs = await getCharRefFiles()
        if (charRefs.length > 0) {
          try {
            const results = await editImageWithAI({ baseImage: inputFile!, referenceImage: charRefs[0], instruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio }, (p) => setProgress(p))
            if (!results || results.filter(Boolean).length === 0) throw new Error('NB2 returned empty')
            resultUrls = results
          } catch {
            resultUrls = await editImageWithSeedream5(inputFile!, instruction, charRefs, (p) => setProgress(p))
          }
        } else {
          const result = await runEditWithFallback(inputImage!, instruction, 'nb2', 'style-transfer', outputOpts)
          resultUrls = [result.url]
        }
      } else if (activeTool === 'realskin') {
        const SKIN_PRESET_INSTRUCTIONS: Record<string, string> = {
          soft: 'Add barely-visible, very subtle pores with zero imperfections, a smooth dewy skin texture, and gentle diffused subsurface scattering. The result should look beautifully retouched but still natural.',
          natural: 'Add natural skin texture: slightly visible pores, minimal micro-imperfections, soft subsurface scattering, natural shine. The skin should look naturally good, not heavily retouched.',
          realistic: 'Add realistic skin detail: visible pores, micro-imperfections, natural skin shine, and subtle subsurface scattering. The goal is photorealistic skin texture, not beauty retouching.',
          ultra: 'Add ultra-high-definition skin texture: highly detailed visible pores, skin microstructure, natural veins on temples and forehead, micro-imperfections including natural tone variations, subsurface scattering with color variation, translucency on thin skin areas, natural sebum and moisture.',
        }
        let skinInstruction: string
        if (skinPreset !== 'custom') {
          skinInstruction = SKIN_PRESET_INSTRUCTIONS[skinPreset]
        } else {
          const lvl = (v: number) => v < 25 ? 'barely visible' : v < 50 ? 'slightly visible' : v < 75 ? 'clearly visible' : 'highly detailed'
          const parts: string[] = []
          if (skinSliders.pores > 5) parts.push(`${lvl(skinSliders.pores)} pores`)
          if (skinSliders.veins > 5) parts.push(`${lvl(skinSliders.veins)} veins on temples and thin skin areas`)
          if (skinSliders.tension > 5) parts.push(`${lvl(skinSliders.tension)} skin surface microstructure and tension`)
          if (skinSliders.imperfections > 5) parts.push(`${lvl(skinSliders.imperfections)} natural micro-imperfections`)
          if (skinSliders.sss > 5) parts.push(`${lvl(skinSliders.sss)} subsurface scattering with translucent glow`)
          if (skinSliders.hydration > 5) parts.push(`${lvl(skinSliders.hydration)} natural moisture and skin shine`)
          skinInstruction = parts.length > 0 ? `Add the following skin details: ${parts.join(', ')}.` : 'Preserve the current skin texture as-is.'
        }
        const instruction = `${skinInstruction} Do not alter the face shape, features, expression, hair, outfit, pose, or background.`
        resultUrls = await routeEdit(selectedEngine, inputFile!, instruction, (p) => setProgress(p))
      } else if (activeTool === 'faceswap' && faceSwapFile) {
        const faceInstruction = `Replace the face of the person in the base image with the face from the reference image. Keep hair, body, pose, clothing, and background exactly the same. Only change facial features.`
        try {
          const dataUrl = await faceSwapWithGemini(inputFile!, faceSwapFile, (p) => setProgress(p))
          if (!dataUrl) throw new Error('NB2 face swap returned empty')
          resultUrls = [dataUrl]
        } catch (nb2Err) {
          console.warn('NB2 face swap failed, trying Seedream:', nb2Err)
          try {
            resultUrls = await editImageWithSeedream5(inputFile!, faceInstruction, [faceSwapFile], (p) => setProgress(p))
          } catch (sdErr) {
            console.warn('Seedream face swap failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile!, faceInstruction, (p) => setProgress(p), undefined, [faceSwapFile], true)
          }
        }
      } else if (activeTool === 'tryon' && garmentFile) {
        const tryonSpec = {
          task: 'VIRTUAL TRY-ON',
          image_1_BASE: { role: 'THE PERSON \u2014 this is the subject to keep', preserve: ['face', 'hair', 'skin_tone', 'body_shape', 'pose', 'background', 'lighting'], rule: 'Do NOT change ANYTHING about this person except their clothing' },
          image_2_REFERENCE: { role: 'GARMENT ONLY \u2014 extract the clothing item from this image', extract: 'clothing, fabric, pattern, color, texture, fit', ignore: 'COMPLETELY ignore the person/model wearing the garment \u2014 their face, body, skin, hair are IRRELEVANT' },
          output: 'The PERSON from Image 1 wearing the GARMENT from Image 2. Same face, same body, same pose, same background. Only the clothing changes.',
        }
        const tryonInstruction = `TRY-ON SPECIFICATION:\n${JSON.stringify(tryonSpec, null, 2)}`
        const tryonFlatInstruction = 'Replace ONLY the clothing. IMAGE 1 is the PERSON (keep everything). IMAGE 2 is the GARMENT ONLY (extract clothing, IGNORE the model wearing it). Same face, body, pose, background.'
        try {
          const results = await editImageWithAI({ baseImage: inputFile!, referenceImage: garmentFile, instruction: tryonInstruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio }, (p) => setProgress(p))
          if (!results || results.filter(Boolean).length === 0) throw new Error('NB2 returned empty')
          resultUrls = results
        } catch (nb2Err) {
          console.warn('NB2 try-on failed, trying Seedream:', nb2Err)
          try {
            resultUrls = await editImageWithSeedream5(inputFile!, tryonFlatInstruction, [garmentFile], (p) => setProgress(p))
          } catch (sdErr) {
            console.warn('Seedream try-on failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile!, tryonFlatInstruction, (p) => setProgress(p), undefined, [garmentFile], true)
          }
        }
      } else if (activeTool === 'expand') {
        const { expandWithBria } = await import('../services/replicateService')
        const expandedUrl = await expandWithBria(inputImage!, expandDirection as 'up' | 'down' | 'left' | 'right' | 'all', expandPixels, (p: number) => setProgress(p))
        resultUrls = [expandedUrl]
      } else if (activeTool === 'rembg') {
        const bgRemovedUrl = await removeBackground(inputImage!, (p) => setProgress(p))
        resultUrls = [bgRemovedUrl]
      } else if (activeTool === 'reimagine') {
        const selectedStyles = SOUL_STYLES.filter(s => reimagineStyleIds.has(s.id))
        const styleDescriptions = selectedStyles.map(s => s.hint || s.name)
        const direction = reimagineCustom.trim() || styleDescriptions.join('. Also: ') || 'editorial fashion'
        const reimagineSpec = {
          task: 'REIMAGINE \u2014 Create a completely NEW photo of this person',
          identity: { source: 'Base Image + Reference Images', preserve: ['face', 'bone_structure', 'eye_shape', 'skin_tone', 'body_proportions'], rule: 'Person must be instantly recognizable as the SAME individual' },
          creative_direction: { style: direction, composition: 'NEW pose, NEW angle, NEW framing \u2014 do NOT copy the original photo layout', outfit: `Clothing must match the ${selectedStyles.map(s => s.name).join(' + ') || 'requested'} aesthetic \u2014 IGNORE clothing from reference images`, environment: 'NEW setting and background matching the style direction', lighting: 'Match the mood and atmosphere of the style direction' },
          rules: { change_everything_except_identity: true, never_add: ['text', 'words', 'letters', 'labels', 'watermarks', 'brand names', 'logos'] },
        }
        const jsonInstruction = `REIMAGINE SPECIFICATION:\n${JSON.stringify(reimagineSpec, null, 2)}`
        const flatInstruction = `Reimagine this person in a completely new photo with ${direction} aesthetic. New pose, lighting, outfit, environment. Preserve face and body identity ONLY. Outfit matches the aesthetic, NOT reference images. NO text, watermarks, brand names.`
        const charRefs = await getCharRefFiles()
        try {
          const results = await editImageWithAI({ baseImage: inputFile!, referenceImage: charRefs[0] ?? undefined, instruction: jsonInstruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio }, (p) => setProgress(p))
          if (!results || results.filter(Boolean).length === 0) throw new Error('NB2 returned empty')
          resultUrls = results
        } catch (nb2Err) {
          console.warn('NB2 reimagine failed, trying Seedream:', nb2Err)
          try {
            const sdResults = await editImageWithSeedream5(inputFile!, flatInstruction, charRefs, (p) => setProgress(p))
            if (!sdResults || sdResults.filter(Boolean).length === 0) throw new Error('Seedream returned empty')
            resultUrls = sdResults
          } catch (sdErr) {
            console.warn('Seedream reimagine failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile!, flatInstruction, (p) => setProgress(p), undefined, charRefs)
          }
        }
      }

      const validUrls = resultUrls.filter(Boolean)
      if (validUrls.length > 0) {
        resultUrls = validUrls
        setResultImage(resultUrls[0])
        setEditHistory(prev => [resultUrls[0], ...prev].slice(0, 20))
        pipelineSetEditedHero(resultUrls[0])
        addItems([{ id: crypto.randomUUID(), url: resultUrls[0], prompt: `${activeTool} edit`, model: engineLabel, timestamp: Date.now(), type: 'edit', tags: [activeTool], characterId: pipelineCharId || undefined }])
        toast.success('Edicion aplicada')
      } else {
        restoreCredits(cost)
        toast.error('La herramienta no devolvio resultado')
      }
    } catch (err) {
      restoreCredits(cost)
      toast.error('Error al procesar')
      console.error(err)
    } finally {
      setProcessing(false)
      setProgress(0)
    }
  }

  const handleModalSave = (toolTag: string, promptLabel: string) => async (dataUrl: string) => {
    setResultImage(dataUrl)
    setEditHistory(prev => [dataUrl, ...prev].slice(0, 20))
    pipelineSetEditedHero(dataUrl)
    addItems([{ id: crypto.randomUUID(), url: dataUrl, prompt: promptLabel, model: toolTag, timestamp: Date.now(), type: 'edit', tags: [toolTag], characterId: pipelineCharId || undefined }])
    setActiveModal(null)
  }

  // ── Active tool info ────────────────────────────────────────────
  const currentTool = tools.find(t => t.id === activeTool) || tools[0]

  // ── Handle bottom sheet drag on mobile ──────────────────────────
  const handleDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
  }
  const handleDragMove = (e: React.TouchEvent) => {
    const diff = dragStartY.current - e.touches[0].clientY
    if (diff > 40 && !sheetExpanded) setSheetExpanded(true)
    if (diff < -40 && sheetExpanded) setSheetExpanded(false)
  }

  // ── Shared style tokens ─────────────────────────────────────────
  const pill = (active: boolean) => ({
    background: active ? '#1A1A1A' : '#FFFFFF',
    color: active ? '#FFFFFF' : '#555',
    border: `1px solid ${active ? '#1A1A1A' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500 as const,
    padding: '6px 14px',
    cursor: 'pointer' as const,
    transition: 'all .15s ease',
  })

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 8,
  }

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
  }

  // ── Tool-specific controls (shared between desktop right panel & mobile sheet) ──
  const renderToolControls = () => (
    <div className="space-y-4">
      {/* Free AI tool */}
      {activeTool === 'freeai' && <>
        <div>
          <div style={sectionLabel}>Instruccion</div>
          <textarea
            rows={3}
            value={freePrompt}
            onChange={e => setFreePrompt(e.target.value)}
            placeholder="Describe como quieres editar esta imagen..."
            className="w-full px-3 py-2.5 rounded-xl text-[12px] outline-none resize-none"
            style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: '#111' }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Hacerla cinematica','Fondo con blur suave','Iluminacion golden hour','Cambiar a blanco y negro','Agregar grano de pelicula','Mejorar detalles'].map(q => (
            <button key={q} onClick={() => setFreePrompt(q)} className="pill-btn" style={pill(freePrompt === q)}>{q}</button>
          ))}
        </div>
      </>}

      {/* Reimagine — optimized density */}
      {activeTool === 'reimagine' && <>
        <div>
          <input value={reimagineSearch} onChange={e => setReimagineSearch(e.target.value)}
            placeholder="Buscar estilo..."
            className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
            style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: '#111' }} />
        </div>
        {/* Categories — horizontal scroll carousel */}
        {!reimagineSearch.trim() && (
          <div className="relative">
            <div className="flex gap-1.5 overflow-x-auto pb-1 min-w-0" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
              <button onClick={() => setReimagineCategory('all')} className="pill-btn shrink-0 text-[11px] px-3 py-1.5 rounded-full transition-all" style={{ background: reimagineCategory === 'all' ? '#1A1A1A' : 'transparent', color: reimagineCategory === 'all' ? '#FFF' : '#777', fontWeight: reimagineCategory === 'all' ? 600 : 400 }}>Todos</button>
              {(Object.entries(SOUL_STYLE_CATEGORIES) as [SoulStyleCategory, { label: string; icon: string }][]).map(([key, cat]) => (
                <button key={key} onClick={() => setReimagineCategory(key)} className="pill-btn shrink-0 text-[11px] px-3 py-1.5 rounded-full transition-all whitespace-nowrap" style={{ background: reimagineCategory === key ? '#1A1A1A' : 'transparent', color: reimagineCategory === key ? '#FFF' : '#777', fontWeight: reimagineCategory === key ? 600 : 400 }}>{cat.icon} {cat.label}</button>
              ))}
            </div>
          </div>
        )}
        {/* Styles — filtered with show-more */}
        <div>
          {(() => {
            const q = reimagineSearch.trim().toLowerCase()
            const filtered = q
              ? SOUL_STYLES.filter(s => s.name.toLowerCase().includes(q) || s.category.includes(q))
              : reimagineCategory === 'all'
                ? SOUL_STYLES.filter(s => s.featured).concat(SOUL_STYLES.filter(s => !s.featured)).slice(0, showAllStyles ? 999 : 24)
                : SOUL_STYLES.filter(s => s.category === reimagineCategory)
            const totalCount = q ? filtered.length : reimagineCategory === 'all' ? SOUL_STYLES.length : SOUL_STYLES.filter(s => s.category === reimagineCategory).length
            return <>
              <div className="flex items-center justify-between">
                <span style={{ ...sectionLabel, marginBottom: 0 }}>{q ? `Resultados (${filtered.length})` : reimagineCategory === 'all' ? `Destacados` : `${totalCount} estilos`}</span>
                {!q && reimagineCategory === 'all' && !showAllStyles && <button onClick={() => setShowAllStyles(true)} className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>Ver todos ({SOUL_STYLES.length})</button>}
                {!q && reimagineCategory === 'all' && showAllStyles && <button onClick={() => setShowAllStyles(false)} className="text-[10px] font-medium" style={{ color: '#999' }}>Menos</button>}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 max-h-[200px] lg:max-h-[40vh] overflow-y-auto mt-1.5" style={{ scrollbarWidth: 'thin' }}>
                {filtered.map(style => (
                  <button key={style.id} onClick={() => { setReimagineStyleIds(prev => { const n = new Set(prev); n.has(style.id) ? n.delete(style.id) : n.add(style.id); return n }); setReimagineCustom('') }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all"
                    style={{ background: reimagineStyleIds.has(style.id) ? '#1A1A1A' : 'white', border: `1px solid ${reimagineStyleIds.has(style.id) ? '#1A1A1A' : 'rgba(0,0,0,0.08)'}`, color: reimagineStyleIds.has(style.id) ? '#FFF' : '#333', boxShadow: reimagineStyleIds.has(style.id) ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <span className="text-[12px]">{style.icon}</span>
                    <span className="text-[10px] truncate font-medium">{style.name}</span>
                    {reimagineStyleIds.has(style.id) && <span className="text-[9px] ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            </>
          })()}
        </div>
        {/* Selected summary */}
        {reimagineStyleIds.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-medium" style={{ color: '#1A1A1A' }}>
              {SOUL_STYLES.filter(s => reimagineStyleIds.has(s.id)).map(s => s.name).join(' + ')}
            </span>
            <button onClick={() => setReimagineStyleIds(new Set())} className="text-[10px] px-2 py-0.5 rounded-lg" style={{ color: '#999', background: '#F3F4F6' }}>✕</button>
          </div>
        )}
        {/* Custom direction */}
        <div>
          <div style={sectionLabel}>O describe tu direccion</div>
          <textarea rows={2} value={reimagineCustom}
            onChange={e => { setReimagineCustom(e.target.value); if (e.target.value.trim()) setReimagineStyleIds(new Set()) }}
            placeholder="Ej.: editorial de moda en Paris, sunset dreamy vibes..."
            className="w-full px-3 py-2 rounded-xl text-[12px] outline-none resize-none"
            style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: '#111' }} />
        </div>
      </>}

      {/* Relight */}
      {activeTool === 'relight' && <>
        <div>
          <div style={sectionLabel}>Tipo de Iluminacion</div>
          <div className="grid grid-cols-2 gap-1.5">
            {relightPresets.map((p, i) => (
              <button key={p.n} onClick={() => setSelPreset(i)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                style={{ background: selPreset === i ? `${p.c}18` : '#F8F8F8', border: `1px solid ${selPreset === i ? `${p.c}40` : 'rgba(0,0,0,0.06)'}` }}>
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: p.c, boxShadow: `0 0 8px ${p.c}50` }} />
                <span className="text-[11px]" style={{ color: selPreset === i ? p.c : '#555' }}>{p.n}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={sectionLabel}>Direccion</div>
          <div className="flex flex-wrap gap-1.5">
            {relightDirections.map(d => (
              <button key={d.id} onClick={() => setRelightDir(d.id)} className="pill-btn" style={pill(relightDir === d.id)}>{d.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={sectionLabel}>Intensidad</div>
          <div className="flex gap-1.5">
            {relightIntensities.map(i => (
              <button key={i.id} onClick={() => setRelightIntensity(i.id)} className="pill-btn flex-1 text-center" style={pill(relightIntensity === i.id)}>{i.label}</button>
            ))}
          </div>
        </div>
      </>}

      {/* 360 Angles */}
      {activeTool === 'rotate360' && <>
        <div>
          <div style={sectionLabel}>Angulo de Camara</div>
          <div className="grid grid-cols-2 gap-1.5">
            {angleViews.map((a, i) => (
              <button key={a} onClick={() => setSel360(i)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{ background: sel360 === i ? '#1A1A1A' : '#F8F8F8', border: `1px solid ${sel360 === i ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}`, color: sel360 === i ? '#FFF' : '#555' }}>
                <span className="text-sm">{['\uD83D\uDC64','\u2197\uFE0F','\u27A1\uFE0F','\u2198\uFE0F','\uD83D\uDD04','\u2199\uFE0F','\u2B05\uFE0F','\u2196\uFE0F'][i]}</span>
                <span className="text-[11px]">{a}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="text-[10px]" style={{ color: '#999' }}>
          Selecciona un angulo y presiona Aplicar.
        </div>
        {/* Character Sheets */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
          <div style={sectionLabel}>Hojas de Referencia</div>
          <div className="flex flex-col gap-1.5">
            {([
              { type: 'face' as SheetType, icon: '\uD83D\uDC64', label: 'Angulos de Rostro', desc: '4 vistas (frente, perfil, 3/4)' },
              { type: 'body' as SheetType, icon: '\uD83E\uDDCD', label: 'Angulos de Cuerpo', desc: '4 vistas completas' },
              { type: 'expressions' as SheetType, icon: '\uD83D\uDE0A', label: 'Expresiones', desc: '9 expresiones faciales' },
            ]).map(s => (
              <button key={s.type} disabled={sheetGenerating !== null || !inputImage}
                onClick={async () => {
                  if (!inputImage) return
                  const cost = CREDIT_COSTS['grok-edit']
                  const ok = await decrementCredits(cost)
                  if (!ok) { toast.error('Creditos insuficientes'); return }
                  setSheetGenerating(s.type); setSheetResult(null)
                  try {
                    const url = await generateCharacterSheet(inputImage, s.type)
                    setSheetResult(url)
                    toast.success(`${s.label} generado`)
                  } catch (err: any) {
                    restoreCredits(cost)
                    toast.error(`Error generando ${s.label.toLowerCase()}`)
                    console.error(err)
                  } finally { setSheetGenerating(null) }
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', opacity: sheetGenerating && sheetGenerating !== s.type ? 0.4 : 1 }}>
                <span className="text-sm">{sheetGenerating === s.type ? '\u23F3' : s.icon}</span>
                <div>
                  <div className="text-[11px] font-medium" style={{ color: '#111' }}>{s.label}</div>
                  <div className="text-[9px]" style={{ color: '#999' }}>{s.desc}</div>
                </div>
                <span className="ml-auto text-[10px] font-mono" style={{ color: '#999' }}>{CREDIT_COSTS['grok-edit']}cr</span>
              </button>
            ))}
          </div>
          {sheetResult && (
            <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <img src={sheetResult} className="w-full object-contain" alt="Sheet result" />
              <div className="flex gap-2 p-2" style={{ background: '#F8F8F8' }}>
                <button onClick={() => { if (sheetResult) { setInputImage(sheetResult); setSheetResult(null) } }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium" style={{ background: '#1A1A1A', color: '#FFF' }}>Usar como base</button>
                <a href={sheetResult} download={`sheet-${Date.now()}.png`}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-center" style={{ background: '#F3F4F6', color: '#555', border: '1px solid rgba(0,0,0,0.06)' }}>Descargar</a>
              </div>
            </div>
          )}
        </div>
      </>}

      {/* Face Swap */}
      {activeTool === 'faceswap' && <>
        <div>
          <div style={sectionLabel}>Rostro de Origen</div>
          <div className="aspect-square rounded-xl cursor-pointer overflow-hidden transition-all"
            onClick={() => faceSwapInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) { setFaceSwapFile(f); setFaceSwapPreview(URL.createObjectURL(f)) } }}
            onDragOver={(e) => e.preventDefault()}
            style={{ background: '#F8F8F8', border: faceSwapPreview ? '2px solid #1A1A1A' : '2px dashed rgba(0,0,0,0.12)' }}>
            {faceSwapPreview ? (
              <div className="relative w-full h-full group">
                <img src={faceSwapPreview} alt="Source face" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[12px] font-medium text-white">Cambiar Foto</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                <span className="text-2xl">{'\uD83C\uDFAD'}</span>
                <span className="text-[12px] font-medium" style={{ color: '#111' }}>Subir Rostro de Origen</span>
                <span className="text-[10px]" style={{ color: '#999' }}>Arrastra o haz clic</span>
              </div>
            )}
          </div>
          <input ref={faceSwapInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFaceSwapFile(f); setFaceSwapPreview(URL.createObjectURL(f)) } if (e.target) e.target.value = '' }} />
        </div>
        {faceSwapPreview && (
          <button onClick={() => { setFaceSwapFile(null); if (faceSwapPreview) URL.revokeObjectURL(faceSwapPreview); setFaceSwapPreview(null) }}
            className="text-[11px] py-1.5 px-3 rounded-xl transition-all" style={{ color: '#999', border: '1px solid rgba(0,0,0,0.08)' }}>Quitar rostro</button>
        )}
      </>}

      {/* Try-On */}
      {activeTool === 'tryon' && <>
        <div>
          <div style={sectionLabel}>Referencia de Outfit</div>
          <div className="aspect-square rounded-xl cursor-pointer overflow-hidden transition-all"
            onClick={() => garmentInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) { setGarmentFile(f); setGarmentPreview(URL.createObjectURL(f)) } }}
            onDragOver={(e) => e.preventDefault()}
            style={{ background: '#F8F8F8', border: garmentPreview ? '2px solid #1A1A1A' : '2px dashed rgba(0,0,0,0.12)' }}>
            {garmentPreview ? (
              <div className="relative w-full h-full group">
                <img src={garmentPreview} alt="Outfit" className="w-full h-full object-contain p-1" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[12px] font-medium text-white">Cambiar Foto</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                <span className="text-2xl">{'\uD83D\uDC57'}</span>
                <span className="text-[12px] font-medium" style={{ color: '#111' }}>Subir Outfit</span>
                <span className="text-[10px] text-center" style={{ color: '#999' }}>Persona con outfit o solo la prenda</span>
              </div>
            )}
          </div>
          <input ref={garmentInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setGarmentFile(f); setGarmentPreview(URL.createObjectURL(f)) } if (e.target) e.target.value = '' }} />
        </div>
        {garmentPreview && (
          <button onClick={() => { setGarmentFile(null); if (garmentPreview) URL.revokeObjectURL(garmentPreview); setGarmentPreview(null) }}
            className="text-[11px] py-1.5 px-3 rounded-xl transition-all" style={{ color: '#999', border: '1px solid rgba(0,0,0,0.08)' }}>Quitar outfit</button>
        )}
      </>}

      {/* Composite / Scene */}
      {activeTool === 'composite' && <>
        <div style={sectionLabel}>Origen de Escena</div>
        <div className="flex gap-1 p-0.5 rounded-xl mb-3" style={{ background: '#F3F4F6' }}>
          {(['upload','gallery','prompt'] as const).map(m => (
            <button key={m} onClick={() => setSceneSource(m)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-medium capitalize"
              style={{ background: sceneSource === m ? '#FFF' : 'transparent', color: sceneSource === m ? '#111' : '#999', boxShadow: sceneSource === m ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
              {m === 'upload' ? 'Subir' : m === 'gallery' ? 'Galeria' : 'Describir'}
            </button>
          ))}
        </div>
        {sceneSource === 'upload' && (
          sceneImage ? (
            <div className="aspect-[4/3] rounded-xl relative overflow-hidden" style={{ background: '#F8F8F8', border: '2px solid #1A1A1A' }}>
              <img src={sceneImage} className="w-full h-full object-cover rounded-xl" alt="Scene" />
              <button onClick={() => { setSceneImage(null); setSceneFile(null) }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] z-20" style={{ background: 'rgba(0,0,0,.7)', color: 'white' }}>{'\u2715'}</button>
              <div className="absolute bottom-1.5 right-1.5 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer z-20" style={{ background: 'rgba(0,0,0,.7)', color: 'white' }} onClick={() => sceneInputRef.current?.click()}>Cambiar</div>
            </div>
          ) : (
            <div className="relative aspect-[4/3] rounded-xl cursor-pointer transition-all overflow-hidden" style={{ background: '#F8F8F8', border: '2px dashed rgba(0,0,0,0.12)' }} onClick={() => sceneInputRef.current?.click()}>
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-xl mb-1">{'\uD83C\uDFAC'}</span>
                <span className="text-[11px]" style={{ color: '#555' }}>Subir imagen de escena</span>
                <span className="text-[10px]" style={{ color: '#999' }}>o arrastra aqui</span>
              </div>
            </div>
          )
        )}
        {sceneSource === 'gallery' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {galleryItems.slice(0, 12).map(item => (
                <button key={item.id} onClick={async () => {
                  setSceneImage(item.url)
                  try { const file = await urlToFile(item.url, 'scene-gallery.png'); setSceneFile(file) } catch { setSceneFile(null) }
                }}
                  className="aspect-square rounded-xl overflow-hidden transition-all"
                  style={{ border: `2px solid ${sceneImage === item.url ? '#1A1A1A' : 'transparent'}`, opacity: sceneImage === item.url ? 1 : 0.7 }}>
                  <img src={item.url} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
            {sceneImage && sceneSource === 'gallery' && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                <img src={sceneImage} className="w-full h-24 object-cover" alt="Selected scene" />
              </div>
            )}
          </div>
        )}
        {sceneSource === 'prompt' && (
          <textarea rows={3} value={scenePrompt} onChange={e => setScenePrompt(e.target.value)}
            placeholder="Describe la escena..."
            className="w-full px-3 py-2.5 rounded-xl text-[12px] outline-none resize-none"
            style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: '#111' }} />
        )}
        <div style={{ ...sectionLabel, marginTop: 12 }}>Escenas rapidas</div>
        <div className="flex gap-1.5 flex-wrap">
          {['Studio white background','Nature park','City street','Cozy interior','Tokyo neon streets','Cafe in Paris','Beach sunset','NYC rooftop','Enchanted forest','Space station'].map(q => (
            <button key={q} onClick={() => { setSceneSource('prompt'); setScenePrompt(q) }} className="pill-btn" style={pill(scenePrompt === q)}>{q}</button>
          ))}
        </div>
        {sceneSource !== 'prompt' && sceneImage && (
          <div className="mt-3">
            <div style={sectionLabel}>Instrucciones adicionales (opcional)</div>
            <textarea rows={2} value={scenePrompt} onChange={e => setScenePrompt(e.target.value)}
              placeholder="Ej.: Que parezca hora dorada..."
              className="w-full px-3 py-2 rounded-xl text-[12px] outline-none resize-none"
              style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: '#111' }} />
          </div>
        )}
        {characters.length > 0 && (
          <div className="mt-3">
            <div style={sectionLabel}>O usa la escena de un personaje</div>
            <div className="flex gap-1.5 flex-wrap">
              {characters.map(ch => ch.thumbnail && (
                <button key={ch.id} onClick={async () => {
                  setSceneImage(ch.thumbnail!)
                  try { const file = await urlToFile(ch.thumbnail!, `scene-${ch.name}.png`); setSceneFile(file) } catch { setSceneFile(null) }
                }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] transition-all"
                  style={{ background: sceneImage === ch.thumbnail ? '#1A1A1A' : '#F8F8F8', border: `1px solid ${sceneImage === ch.thumbnail ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}`, color: sceneImage === ch.thumbnail ? '#FFF' : '#555' }}>
                  <img src={ch.thumbnail} className="w-5 h-5 rounded-full object-cover" alt="" />
                  {ch.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </>}

      {/* Real Skin */}
      {activeTool === 'realskin' && <>
        <div style={sectionLabel}>Nivel de Realismo</div>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {([
            { id: 'soft' as const, label: 'Suave', desc: 'Piel lisa, sin imperfecciones' },
            { id: 'natural' as const, label: 'Natural', desc: 'Poros sutiles, textura leve' },
            { id: 'realistic' as const, label: 'Realista', desc: 'Poros visibles, imperfecciones' },
            { id: 'ultra' as const, label: 'Ultra HD', desc: 'Maximo detalle, venas, SSS' },
          ]).map(p => (
            <button key={p.id} onClick={() => setSkinPreset(p.id)}
              className="text-left px-2.5 py-2 rounded-xl transition-colors"
              style={{ background: skinPreset === p.id ? '#1A1A1A' : '#F8F8F8', border: `1px solid ${skinPreset === p.id ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}` }}>
              <div className="text-[11px] font-medium mb-0.5" style={{ color: skinPreset === p.id ? '#FFF' : '#111' }}>{p.label}</div>
              <div className="text-[9px]" style={{ color: skinPreset === p.id ? 'rgba(255,255,255,.6)' : '#999' }}>{p.desc}</div>
            </button>
          ))}
        </div>
        <button onClick={() => setSkinPreset('custom')} className="w-full py-2 rounded-xl text-[11px] mb-3 transition-colors"
          style={{ background: skinPreset === 'custom' ? '#1A1A1A' : '#F8F8F8', border: `1px solid ${skinPreset === 'custom' ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}`, color: skinPreset === 'custom' ? '#FFF' : '#555' }}>Personalizado</button>
        {skinPreset === 'custom' && (
          <div className="space-y-2.5 mb-3 p-2.5 rounded-xl" style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)' }}>
            {([
              { key: 'pores' as const, label: 'Poros' },
              { key: 'veins' as const, label: 'Venas' },
              { key: 'tension' as const, label: 'Textura / Tension' },
              { key: 'imperfections' as const, label: 'Imperfecciones' },
              { key: 'sss' as const, label: 'Sub-superficial (SSS)' },
              { key: 'hydration' as const, label: 'Hidratacion' },
            ]).map(s => (
              <div key={s.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px]" style={{ color: '#555' }}>{s.label}</span>
                  <span className="text-[10px] font-mono" style={{ color: '#999' }}>{skinSliders[s.key]}</span>
                </div>
                <input type="range" min={0} max={100} value={skinSliders[s.key]}
                  onChange={e => setSkinSliders(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                  className="w-full slider-t" />
              </div>
            ))}
          </div>
        )}
      </>}

      {/* Enhance */}
      {activeTool === 'enhance' && <>
        <div className="space-y-3">
          <div style={sectionLabel}>Mejoras</div>
          {['Resolucion (mejorar)','Nitidez','Reduccion de Ruido','Detalle Facial','Detalle de Cabello','Detalle de Piel','Correccion de Color'].map(s => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-[11px] w-32 shrink-0" style={{ color: '#555' }}>{s}</span>
              <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
            </div>
          ))}
        </div>
        <div style={{ ...sectionLabel, marginTop: 12 }}>Mejorar Resolucion</div>
        <div className="flex gap-2 mt-1.5">
          {['2x','4x','8x'].map(x => (
            <button key={x} className="flex-1 py-2 rounded-xl text-sm font-mono font-bold" style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: '#555' }}>{x}</button>
          ))}
        </div>
      </>}

      {/* Style Transfer */}
      {activeTool === 'style' && <>
        <div style={sectionLabel}>Estilo Artistico</div>
        <div className="grid grid-cols-2 gap-1.5">
          {styleTransfers.map((s, i) => (
            <button key={s.name} onClick={() => setSelStyle(i)}
              className="px-3 py-2.5 rounded-xl text-[11px] text-left transition-all"
              style={{ background: selStyle === i ? '#1A1A1A' : '#F8F8F8', border: `1px solid ${selStyle === i ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}`, color: selStyle === i ? '#FFF' : '#555' }}>{s.name}</button>
          ))}
        </div>
      </>}

      {/* Inpaint */}
      {activeTool === 'inpaint' && <>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="text-3xl">{'\uD83D\uDD8C\uFE0F'}</span>
          <div>
            <div className="text-[13px] font-medium" style={{ color: '#111' }}>Edicion por Zonas</div>
            <div className="text-[11px] mt-1" style={{ color: '#999' }}>Pinta sobre la zona que quieres cambiar.</div>
          </div>
          <div className="text-[10px] px-3 py-2 rounded-xl" style={{ background: '#F8F8F8', color: '#555', border: '1px solid rgba(0,0,0,0.06)' }}>
            Presiona <strong>Aplicar</strong> para abrir el editor
          </div>
        </div>
      </>}

      {/* Remove BG */}
      {activeTool === 'rembg' && <>
        <div style={sectionLabel}>Quitar Fondo</div>
        <p className="text-[11px] mb-3" style={{ color: '#555', lineHeight: 1.6 }}>
          Elimina el fondo al instante, dejando solo el sujeto sobre un lienzo transparente.
        </p>
        <div className="rounded-xl p-3" style={{ background: 'rgba(80,216,160,.06)', border: '1px solid rgba(80,216,160,.15)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{'\u2702\uFE0F'}</span>
            <span className="text-[12px] font-medium" style={{ color: '#2D9D6C' }}>Eliminacion con un clic</span>
          </div>
          <p className="text-[10px]" style={{ color: '#999' }}>Sin parametros necesarios. Presiona Aplicar.</p>
        </div>
      </>}

      {/* Expand */}
      {activeTool === 'expand' && <>
        <div>
          <div style={sectionLabel}>Direccion</div>
          <div className="grid grid-cols-3 gap-1.5">
            {['up', 'down', 'left', 'right', 'all'].map(dir => (
              <button key={dir} onClick={() => setExpandDirection(dir)} className="pill-btn capitalize text-center" style={pill(expandDirection === dir)}>{dir}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={sectionLabel}>Pixels: <span className="font-mono" style={{ color: '#1A1A1A' }}>{expandPixels}px</span></div>
          <input type="range" min={128} max={512} step={64} value={expandPixels}
            onChange={(e) => setExpandPixels(Number(e.target.value))} className="w-full slider-t" />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-mono" style={{ color: '#999' }}>128px</span>
            <span className="text-[9px] font-mono" style={{ color: '#999' }}>512px</span>
          </div>
        </div>
      </>}

      {/* Dazz Cam — local film presets with Canvas compositing */}
      {/* Efectos / Cámaras — AI-powered film presets via NB2 */}
      {activeTool === 'dazz' && <>
        {/* Category carousel */}
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}>
          {[{ id: 'all', label: 'Todos' }, { id: 'film', label: '🎞️ Películas' }, { id: 'cam', label: '📷 Cámaras' }, { id: 'fx', label: '✨ Efectos' }].map(c => (
            <button key={c.id} onClick={() => setDazzCategory(c.id)} className="pill-btn shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all" style={{ background: dazzCategory === c.id ? '#1A1A1A' : 'transparent', color: dazzCategory === c.id ? '#FFF' : '#777' }}>{c.label}</button>
          ))}
        </div>
        {/* Preset grid */}
        <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {(() => {
            const FX_PRESETS = [
              { id: 'portra', icon: '📷', label: 'Portra 400', cat: 'film', prompt: 'Apply Kodak Portra 400 film emulation: warm skin tones, slightly muted greens, gentle pastel color palette, fine organic grain texture, soft highlight roll-off, nostalgic analog feel' },
              { id: 'superia', icon: '🌸', label: 'Fuji Superia', cat: 'film', prompt: 'Apply Fujifilm Superia 400 look: vivid saturated greens and blues, slightly cool shadows, punchy contrast, visible fine grain, Japanese film aesthetic' },
              { id: 'cinestill', icon: '🌃', label: 'CineStill 800T', cat: 'film', prompt: 'Apply CineStill 800T tungsten film look: heavy orange halation around highlights, teal-orange color split, cinematic night photography feel, strong visible grain, red glow on bright areas' },
              { id: 'kodachrome', icon: '🌅', label: 'Kodachrome', cat: 'film', prompt: 'Apply vintage Kodachrome film look: extremely saturated warm reds and yellows, deep rich shadows, high contrast, 1960s-70s photography aesthetic' },
              { id: 'bw-trix', icon: '🖤', label: 'B/N Tri-X', cat: 'film', prompt: 'Convert to Kodak Tri-X 400 black and white film: high contrast, deep blacks, visible coarse grain, dramatic tonal range, classic street photography look' },
              { id: 'ektar', icon: '🔴', label: 'Ektar 100', cat: 'film', prompt: 'Apply Kodak Ektar 100 film: extremely saturated vivid colors especially reds and blues, ultra-fine grain, very sharp, high contrast, landscape photography look' },
              { id: 'disposable', icon: '🔦', label: 'Desechable', cat: 'cam', prompt: 'Apply disposable camera look: strong direct flash on subject, heavy vignette, oversaturated colors, random warm light leak on one edge, cheap lens softness on edges, party photography vibe, date stamp in corner' },
              { id: 'polaroid', icon: '🖼️', label: 'Polaroid', cat: 'cam', prompt: 'Apply Polaroid instant film look: slightly faded washed colors, warm tint, soft vignette, overexposed highlights, add a white Polaroid border frame around the entire image' },
              { id: 'lomo', icon: '🔮', label: 'Lomo LC-A', cat: 'cam', prompt: 'Apply Lomography LC-A camera look: extreme color saturation, heavy dark vignette in all corners, high contrast, slight color shift toward warm tones, tunnel vision effect, experimental analog feel' },
              { id: 'halfframe', icon: '📐', label: 'Half Frame', cat: 'cam', prompt: 'Apply half-frame camera look: warm sepia-toned color grade, light leak bleeding from the left edge in warm orange, fine grain texture, slightly soft focus, intimate vintage diary photography feel' },
              { id: 'bloom', icon: '✨', label: 'Bloom', cat: 'fx', prompt: 'Add a dreamy soft bloom/glow effect: soft diffused highlights that glow and bleed into surrounding areas, slight overexposure, ethereal atmosphere, like shooting through a pro-mist filter, maintain subject sharpness' },
              { id: 'vhs', icon: '📼', label: 'VHS Retro', cat: 'fx', prompt: 'Apply VHS tape recording look: horizontal scan lines, slight RGB color separation, tracking distortion artifacts, slightly blurry, washed out desaturated colors, 1990s home video aesthetic' },
              { id: 'infrared', icon: '🔴', label: 'Infrared', cat: 'fx', prompt: 'Apply infrared film photography look: vegetation and foliage turns bright white or pink, sky becomes very dark, surreal false-color palette, dreamlike otherworldly quality' },
              { id: 'xpro', icon: '🧪', label: 'Cross Process', cat: 'fx', prompt: 'Apply cross-processed film look: extreme unnatural color shifts with heavy cyan and magenta tints, increased contrast, experimental colors, like developing slide film in negative chemicals' },
              { id: 'golden', icon: '🌤️', label: 'Golden Hour', cat: 'fx', prompt: 'Apply golden hour warm sunlight effect: warm amber-gold directional light from the side, long soft shadows, warm skin tones, golden rim highlights on hair, sunset magic hour atmosphere' },
              { id: 'noir', icon: '🕵️', label: 'Film Noir', cat: 'fx', prompt: 'Convert to dramatic film noir: extreme high contrast black and white, deep inky blacks, harsh single-source directional shadows, theatrical chiaroscuro lighting, 1940s detective movie aesthetic' },
            ]
            const filtered = dazzCategory === 'all' ? FX_PRESETS : FX_PRESETS.filter(p => p.cat === dazzCategory)
            return filtered.map(preset => (
              <button key={preset.id} onClick={() => setFreePrompt(preset.prompt)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all"
                style={{ background: freePrompt === preset.prompt ? '#1A1A1A' : 'white', border: `1px solid ${freePrompt === preset.prompt ? '#1A1A1A' : 'rgba(0,0,0,0.08)'}`, color: freePrompt === preset.prompt ? '#FFF' : '#444', boxShadow: freePrompt === preset.prompt ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                <span className="text-[13px]">{preset.icon}</span>
                <span className="text-[10px] font-medium truncate">{preset.label}</span>
              </button>
            ))
          })()}
        </div>
        {/* Custom prompt */}
        <div>
          <div style={sectionLabel}>O describe tu efecto</div>
          <textarea rows={2} value={freePrompt} onChange={e => setFreePrompt(e.target.value)}
            placeholder="Ej.: look de pelicula de Wes Anderson con paleta pastel..."
            className="w-full px-3 py-2 rounded-xl text-[12px] outline-none resize-none"
            style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: '#111' }} />
        </div>
      </>}
    </div>
  )

  /* ═══════════════════════════════════════════════════════════════
     RENDER — New V2 Layout
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="h-full flex flex-col" style={{ background: '#F3F4F6', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setInputFile(file)
            const reader = new FileReader()
            reader.onload = () => setInputImage(reader.result as string)
            reader.readAsDataURL(file)
            setResultImage(null)
          }
          if (e.target) e.target.value = ''
        }}
      />
      <input ref={sceneInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setSceneFile(file)
            const reader = new FileReader()
            reader.onload = () => setSceneImage(reader.result as string)
            reader.readAsDataURL(file)
          }
          if (e.target) e.target.value = ''
        }}
      />

      {/* ── TOP BAR (desktop) ─────────────────────────────────── */}
      <div className="hidden lg:flex items-center h-12 px-5 gap-3 shrink-0" style={{ ...cardStyle, borderRadius: 0, borderBottom: '1px solid rgba(0,0,0,0.06)', boxShadow: 'none' }}>
        <span className="text-lg">{currentTool.icon}</span>
        <span className="text-[13px] font-semibold" style={{ color: '#111' }}>{currentTool.label}</span>
        <span className="text-[11px]" style={{ color: '#999' }}>{currentTool.desc}</span>
        <div className="flex-1" />
        {inputImage && <span className="text-[10px]" style={{ color: '#999' }}>Clic en imagen para ver en grande</span>}
      </div>

      {/* ── MAIN BODY ─────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* ── LEFT: Vertical toolbar (desktop) ───────────────── */}
        <div className="hidden lg:flex flex-col items-center w-[72px] shrink-0 py-3 gap-1 overflow-y-auto" style={{ ...cardStyle, borderRadius: 0, borderRight: '1px solid rgba(0,0,0,0.06)', boxShadow: 'none' }}>
          {/* Primary tools */}
          {PRIMARY_TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t.id)}
              className="w-[56px] h-[56px] rounded-2xl flex flex-col items-center justify-center transition-all shrink-0 relative"
              style={{
                background: activeTool === t.id ? '#1A1A1A' : ('featured' in t && t.featured) ? 'rgba(0,0,0,0.03)' : 'transparent',
                color: activeTool === t.id ? '#FFF' : '#555',
                border: ('featured' in t && t.featured && activeTool !== t.id) ? '1px solid rgba(0,0,0,0.1)' : 'none',
              }}
              title={t.label}>
              <span className="text-[16px] leading-none" style={{ filter: activeTool === t.id ? 'none' : 'grayscale(1) opacity(0.6)' }}>{t.icon}</span>
              <span className="text-[8px] mt-1 font-medium leading-tight text-center" style={{ color: activeTool === t.id ? '#FFF' : '#999' }}>
                {t.label.split(' ')[0]}
              </span>
            </button>
          ))}
          <div className="w-8 h-px my-1" style={{ background: 'rgba(0,0,0,0.06)' }} />
          {/* Secondary tools — expandable */}
          <button onClick={() => setShowAllTools(prev => !prev)}
            className="w-[56px] h-[40px] rounded-xl flex flex-col items-center justify-center transition-all shrink-0"
            style={{ background: showAllTools || SECONDARY_TOOLS.some(t => t.id === activeTool) ? 'rgba(0,0,0,0.05)' : 'transparent', color: '#777' }}
            title="Más herramientas">
            <span className="text-[14px]">⋯</span>
            <span className="text-[7px] font-medium" style={{ color: '#999' }}>Otros</span>
          </button>
          {showAllTools && SECONDARY_TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t.id)}
              className="w-[56px] h-[52px] rounded-2xl flex flex-col items-center justify-center transition-all shrink-0"
              style={{
                background: activeTool === t.id ? '#1A1A1A' : 'transparent',
                color: activeTool === t.id ? '#FFF' : '#555',
              }}
              title={t.label}>
              <span className="text-[14px] leading-none" style={{ filter: activeTool === t.id ? 'none' : 'grayscale(1) opacity(0.6)' }}>{t.icon}</span>
              <span className="text-[7px] mt-0.5 font-medium leading-tight text-center" style={{ color: activeTool === t.id ? '#FFF' : '#999' }}>
                {t.label.split(' ')[0]}
              </span>
            </button>
          ))}
          <div className="w-8 h-px my-1" style={{ background: 'rgba(0,0,0,0.06)' }} />
          <button onClick={() => inputImage && setShowBasicEditor(true)}
            className="w-[56px] h-[52px] rounded-2xl flex flex-col items-center justify-center transition-all shrink-0"
            style={{ background: showBasicEditor ? '#1A1A1A' : 'transparent', opacity: inputImage ? 1 : 0.3, color: showBasicEditor ? '#FFF' : '#555' }}
            title="Editor Basico">
            <span className="text-[14px] leading-none">{'\u270F\uFE0F'}</span>
            <span className="text-[7px] mt-0.5 font-medium" style={{ color: showBasicEditor ? '#FFF' : '#999' }}>Basico</span>
          </button>
        </div>

        {/* ── CENTER: Canvas area ─────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
          <div ref={canvasContainerRef} className="flex-1 flex flex-col items-center justify-start lg:justify-center pt-2 lg:pt-6 px-2 lg:px-6 pb-3 overflow-y-auto relative">
            {!inputImage ? (
              /* Empty state */
              <div className="max-w-[540px] w-full text-center px-4">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F8F8F8', border: '2px dashed rgba(0,0,0,0.12)' }}>
                  <span className="text-2xl" style={{ color: '#999' }}>{'\u2191'}</span>
                </div>
                <p className="text-[15px] font-semibold mb-1" style={{ color: '#111' }}>Sube una imagen para empezar a editar</p>
                <p className="text-[12px] mb-6" style={{ color: '#999' }}>O selecciona desde tu galeria o personajes</p>

                <div className="flex gap-2 justify-center mb-6">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 rounded-2xl text-[13px] font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: '#1A1A1A', color: '#FFF' }}>
                    Subir Imagen
                  </button>
                  <button onClick={() => { useNavigationStore.getState().openGalleryForSelection('editor'); onNav?.('gallery') }}
                    className="px-6 py-3 rounded-2xl text-[13px] font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: '#F8F8F8', color: '#555', border: '1px solid rgba(0,0,0,0.06)' }}>
                    Galeria
                  </button>
                </div>

                {/* Character selector (visible on all screens) */}
                {characters.length > 0 && (
                  <div className="text-left mb-4">
                    <div style={sectionLabel}>Personajes</div>
                    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                      {characters.map(ch => (
                        <button key={ch.id}
                          onClick={() => setEditorCharFilter(editorCharFilter === ch.id ? null : ch.id)}
                          className="flex flex-col items-center gap-1 shrink-0 transition-all"
                          style={{ opacity: editorCharFilter && editorCharFilter !== ch.id ? 0.4 : 1 }}>
                          <div className="w-12 h-12 rounded-full overflow-hidden" style={{ border: editorCharFilter === ch.id ? '2px solid #1A1A1A' : '2px solid transparent' }}>
                            {ch.thumbnail ? <img src={ch.thumbnail} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full rounded-full flex items-center justify-center text-[14px] font-semibold" style={{ background: '#E5E7EB', color: '#555' }}>{ch.name?.[0] || '?'}</div>}
                          </div>
                          <span className="text-[9px]" style={{ color: editorCharFilter === ch.id ? '#1A1A1A' : '#999' }}>{ch.name}</span>
                        </button>
                      ))}
                    </div>
                    {editorCharFilter && (
                      <div className="grid grid-cols-4 gap-1 mt-2 max-h-[120px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {galleryItems.filter(i => i.characterId === editorCharFilter && i.url && !i.tags?.includes('sheet')).slice(0, 12).map(item => (
                          <button key={item.id} onClick={async () => {
                            setInputImage(item.url); setResultImage(null)
                            if (editorCharFilter) pipelineSetCharacter(editorCharFilter)
                            try { setInputFile(await urlToFile(item.url, 'gallery.png')) } catch { setInputFile(null) }
                          }}
                            className="aspect-square rounded-lg overflow-hidden transition-all hover:opacity-80"
                            style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                            <img src={item.url} className="w-full h-full object-cover" alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap justify-center">
                  {PRIMARY_TOOLS.map(t => (
                    <button key={t.id} onClick={() => setActiveTool(t.id)}
                      className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all hover:scale-[1.02]"
                      style={{ background: ('featured' in t && t.featured) ? '#1A1A1A' : '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: ('featured' in t && t.featured) ? '#FFF' : '#555' }}>
                      <span className="mr-1">{t.icon}</span>{t.label}
                    </button>
                  ))}
                  <button onClick={() => setShowAllTools(p => !p)}
                    className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all hover:scale-[1.02]"
                    style={{ background: showAllTools ? '#1A1A1A' : '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: showAllTools ? '#FFF' : '#555' }}>
                    ⋯ Otros
                  </button>
                </div>
                {showAllTools && (
                  <div className="flex gap-2 flex-wrap justify-center mt-2">
                    {SECONDARY_TOOLS.map(t => (
                      <button key={t.id} onClick={() => setActiveTool(t.id)}
                        className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all hover:scale-[1.02]"
                        style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.06)', color: '#555' }}>
                        <span className="mr-1">{t.icon}</span>{t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Image canvas */
              <div className="relative flex flex-col items-center gap-3 w-full">
                {/* Clear image button */}
                <button onClick={() => { setInputImage(null); setInputFile(null); setResultImage(null) }}
                  className="absolute top-1 right-1 lg:top-0 lg:right-4 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: '0.75rem', cursor: 'pointer' }}>✕</button>

                {resultImage ? (
                  /* Result available — comparison slider */
                  <>
                    <div className="w-full lg:max-w-[min(520px,_42vw)] rounded-xl lg:rounded-2xl overflow-hidden"
                      style={{ ...cardStyle, height: 'min(55vh, 520px)', minHeight: 250 }}>
                      <ImageComparison
                        leftImage={inputImage}
                        rightImage={resultImage}
                        altLeft="Original"
                        altRight="Resultado"
                        className="w-full h-full rounded-2xl"
                      />
                    </div>
                    <button onClick={async () => {
                      setInputImage(resultImage); setResultImage(null); setCompareMode(false)
                      try { setInputFile(await urlToFile(resultImage!, 'result.png')) } catch { setInputFile(null) }
                      toast.success('Resultado cargado como nueva base')
                    }}
                      className="px-5 py-2.5 rounded-2xl text-[12px] font-semibold transition-all hover:scale-[1.02]"
                      style={{ background: '#1A1A1A', color: '#FFF' }}>
                      Seguir editando este resultado
                    </button>
                  </>
                ) : (
                  /* No result yet — show only input image large */
                  <div className="w-full lg:max-w-[min(520px,_42vw)] rounded-xl lg:rounded-2xl overflow-hidden cursor-pointer relative"
                    onClick={() => setEditorLightbox(inputImage)}
                    style={{ ...cardStyle }}>
                    <img src={inputImage} className="w-full object-contain select-none" draggable={false} alt="Input" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FLOATING TOOLBAR — mobile only ─────────────────── */}
          {inputImage && (
            <div className="flex lg:hidden absolute left-1/2 -translate-x-1/2 z-20 flex-col items-center gap-1.5" style={{ bottom: 132 }}>
              {/* Secondary tools popup */}
              {showAllTools && (
                <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-2xl overflow-x-auto max-w-[90vw]"
                  style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', scrollbarWidth: 'none', touchAction: 'pan-x' }}>
                  {SECONDARY_TOOLS.map(t => (
                    <button key={t.id} onClick={() => { setActiveTool(t.id); setShowAllTools(false) }}
                      className="w-[52px] py-1.5 rounded-xl flex flex-col items-center justify-center shrink-0 transition-all gap-0.5"
                      style={{ background: activeTool === t.id ? '#1A1A1A' : 'transparent', color: activeTool === t.id ? '#FFF' : '#333' }}>
                      <span className="text-[12px] leading-none" style={{ filter: activeTool === t.id ? 'none' : 'grayscale(1) opacity(0.7)' }}>{t.icon}</span>
                      <span className="text-[6px] leading-tight font-semibold" style={{ color: activeTool === t.id ? '#FFF' : '#666' }}>{t.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Primary toolbar */}
              <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                {PRIMARY_TOOLS.map(t => (
                  <button key={t.id} onClick={() => setActiveTool(t.id)}
                    className="w-[56px] py-1.5 rounded-xl flex flex-col items-center justify-center shrink-0 transition-all gap-0.5"
                    style={{
                      background: activeTool === t.id ? '#1A1A1A' : 'transparent',
                      color: activeTool === t.id ? '#FFF' : '#333',
                      border: ('featured' in t && t.featured && activeTool !== t.id) ? '1px solid rgba(0,0,0,0.12)' : '1px solid transparent',
                    }}>
                    <span className="text-[14px] leading-none" style={{ filter: activeTool === t.id ? 'none' : 'grayscale(1) opacity(0.7)' }}>{t.icon}</span>
                    <span className="text-[7px] leading-tight font-semibold" style={{ color: activeTool === t.id ? '#FFF' : '#666' }}>{t.label.split(' ')[0]}</span>
                  </button>
                ))}
                <button onClick={() => setShowAllTools(p => !p)}
                  className="w-[48px] py-1.5 rounded-xl flex flex-col items-center justify-center shrink-0 transition-all gap-0.5"
                  style={{ background: showAllTools || SECONDARY_TOOLS.some(t => t.id === activeTool) ? 'rgba(0,0,0,0.06)' : 'transparent', color: '#555' }}>
                  <span className="text-[13px] leading-none">⋯</span>
                  <span className="text-[7px] leading-tight font-semibold" style={{ color: '#888' }}>Otros</span>
                </button>
              </div>
            </div>
          )}

          {/* ── History filmstrip ──────────────────────────────── */}
          {(editHistory.length > 0 || resultImage) && (
            <div className="hidden lg:flex h-[72px] items-center px-5 gap-2 shrink-0" style={{ ...cardStyle, borderRadius: 0, borderTop: '1px solid rgba(0,0,0,0.06)', boxShadow: 'none' }}>
              <span className="text-[9px] font-mono shrink-0 mr-2" style={{ color: '#999', letterSpacing: '0.05em' }}>HISTORIAL</span>
              {editHistory.slice(0, 10).map((url, i) => (
                <div key={i} onClick={() => setResultImage(url)}
                  onDoubleClick={async () => { setInputImage(url); setResultImage(null); try { setInputFile(await urlToFile(url, 'history.png')) } catch { setInputFile(null) }; toast.success('Cargado como nueva base') }}
                  className="w-12 h-12 rounded-xl shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                  title="Clic: ver | Doble clic: usar como base"
                  style={{ border: resultImage === url ? '2px solid #1A1A1A' : '1px solid rgba(0,0,0,0.06)' }}>
                  <img src={url} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Control panel (desktop) ──────────────────── */}
        <div className="hidden lg:flex flex-col w-[380px] shrink-0" style={{ ...cardStyle, borderRadius: 0, borderLeft: '1px solid rgba(0,0,0,0.06)', boxShadow: 'none' }}>
          {/* Image source — compact when image loaded */}
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            {inputImage ? (
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 cursor-pointer" style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                  onClick={() => fileInputRef.current?.click()}>
                  <img src={inputImage} className="w-full h-full object-cover" alt="Input" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999' }}>Imagen</div>
                  <div className="flex gap-1.5 mt-1">
                    <button onClick={() => fileInputRef.current?.click()} className="pill-btn text-[10px] px-2.5 py-1 rounded-lg" style={{ background: '#F3F4F6', color: '#555', border: '1px solid rgba(0,0,0,0.06)' }}>Cambiar</button>
                    <button onClick={() => { useNavigationStore.getState().openGalleryForSelection('editor'); onNav?.('gallery') }} className="pill-btn text-[10px] px-2.5 py-1 rounded-lg" style={{ background: '#F3F4F6', color: '#555', border: '1px solid rgba(0,0,0,0.06)' }}>Galería</button>
                  </div>
                </div>
                {/* Inline character selector */}
                {characters.length > 0 && (
                  <div className="flex gap-1 shrink-0">
                    {characters.slice(0, 4).map(ch => (
                      <button key={ch.id}
                        onClick={() => setEditorCharFilter(editorCharFilter === ch.id ? null : ch.id)}
                        className="transition-all"
                        aria-label={ch.name}
                        style={{ opacity: editorCharFilter && editorCharFilter !== ch.id ? 0.35 : 1 }}>
                        <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: editorCharFilter === ch.id ? '2px solid #1A1A1A' : '1.5px solid rgba(0,0,0,0.08)' }}>
                          {(ch.thumbnail || ch.modelImageUrls?.[0]) && <img src={ch.thumbnail || ch.modelImageUrls?.[0]} className="w-full h-full object-cover" alt="" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div style={sectionLabel}>Imagen de Entrada</div>
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all"
                    style={{ background: '#1A1A1A', color: '#FFF' }}>
                    {'\u2191'} Subir
                  </button>
                  <button onClick={() => { useNavigationStore.getState().openGalleryForSelection('editor'); onNav?.('gallery') }}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all"
                    style={{ background: '#F8F8F8', color: '#555', border: '1px solid rgba(0,0,0,0.06)' }}>
                    Galeria
                  </button>
                </div>
                {/* Character grid for photo selection — only when no image loaded */}
                {characters.length > 0 && (
                  <div>
                    <div style={sectionLabel}>Personaje</div>
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                      {characters.map(ch => (
                        <button key={ch.id}
                          onClick={() => setEditorCharFilter(editorCharFilter === ch.id ? null : ch.id)}
                          className="flex flex-col items-center gap-1 shrink-0 transition-all"
                          style={{ opacity: editorCharFilter && editorCharFilter !== ch.id ? 0.4 : 1 }}>
                          <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: editorCharFilter === ch.id ? '2px solid #1A1A1A' : '2px solid transparent' }}>
                            {(ch.thumbnail || ch.modelImageUrls?.[0]) && <img src={ch.thumbnail || ch.modelImageUrls?.[0]} className="w-full h-full object-cover" alt="" />}
                          </div>
                          <span className="text-[9px]" style={{ color: editorCharFilter === ch.id ? '#1A1A1A' : '#999' }}>{ch.name}</span>
                        </button>
                      ))}
                    </div>
                    {editorCharFilter && (
                      <div className="grid grid-cols-4 gap-1 mt-2 max-h-[100px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {galleryItems.filter(i => i.characterId === editorCharFilter && i.url && !i.tags?.includes('sheet')).slice(0, 12).map(item => (
                          <button key={item.id} onClick={async () => {
                            setInputImage(item.url); setResultImage(null)
                            if (editorCharFilter) pipelineSetCharacter(editorCharFilter)
                            try { setInputFile(await urlToFile(item.url, 'gallery.png')) } catch { setInputFile(null) }
                          }}
                            className="aspect-square rounded-lg overflow-hidden transition-all hover:opacity-80"
                            style={{ border: inputImage === item.url ? '2px solid #1A1A1A' : '1px solid rgba(0,0,0,0.06)' }}>
                            <img src={item.url} className="w-full h-full object-cover" alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tool controls — takes all remaining space */}
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'thin' }}>
            {renderToolControls()}
          </div>

          {/* Output settings + Apply — compact single row */}
          <div className="px-4 py-2.5 shrink-0 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['1k', '2k', '4k'] as const).map(r => (
                  <button key={r} onClick={() => setEditorResolution(r)} style={pill(editorResolution === r)} className="pill-btn text-center text-[10px] px-2 py-1">{r.toUpperCase()}</button>
                ))}
              </div>
              <div className="w-px h-4" style={{ background: 'rgba(0,0,0,0.08)' }} />
              <div className="flex gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {[{ ar: AspectRatio.Portrait, label: 'Post' }, { ar: AspectRatio.Square, label: '1:1' }, { ar: AspectRatio.Landscape, label: '4:3' }, { ar: AspectRatio.Wide, label: '16:9' }, { ar: AspectRatio.Tall, label: '9:16' }].map(({ ar, label }) => (
                  <button key={ar} onClick={() => setEditorAspectRatio(ar)} className="pill-btn text-[10px] px-2 py-1 shrink-0" style={pill(editorAspectRatio === ar)}>{label}</button>
                ))}
              </div>
            </div>
            <button onClick={handleApply} disabled={processing || !inputImage}
              className="w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all"
              style={{ background: (!inputImage || processing) ? '#CCC' : '#1A1A1A', color: '#FFF', opacity: (!inputImage || processing) ? 0.6 : 1 }}>
              {processing ? `Procesando... ${Math.round(progress)}%` : `${currentTool.icon} Aplicar ${currentTool.label} (${displayCost}cr)`}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM SHEET ──────────────────────────────── */}
      <div className="flex lg:hidden flex-col fixed left-0 right-0 z-[60] transition-all duration-300"
        ref={sheetRef}
        style={{
          bottom: 64,
          maxHeight: sheetExpanded ? '65vh' : '64px',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.06)',
          borderRadius: '20px 20px 0 0',
        }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 cursor-grab"
          onTouchStart={handleDragStart} onTouchMove={handleDragMove}
          onClick={() => setSheetExpanded(!sheetExpanded)}>
          <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }} />
        </div>

        {/* Collapsed state */}
        {!sheetExpanded && (
          <div className="px-4 pb-3 flex gap-2 items-center">
            {activeTool === 'freeai' ? (
              <input
                value={freePrompt}
                onChange={e => setFreePrompt(e.target.value)}
                onClick={() => setSheetExpanded(true)}
                placeholder="Describe tu edicion..."
                className="flex-1 px-3 py-2 rounded-xl text-[12px] outline-none"
                style={{ background: '#F3F4F6', border: '1px solid rgba(0,0,0,0.06)', color: '#111' }}
              />
            ) : (
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
                onClick={() => setSheetExpanded(true)}
                style={{ background: '#F3F4F6', border: '1px solid rgba(0,0,0,0.06)' }}>
                <span className="text-[13px]">{currentTool.icon}</span>
                <span className="text-[12px]" style={{ color: '#555' }}>{currentTool.label}</span>
                <span className="text-[10px] ml-auto" style={{ color: '#999' }}>Toca para opciones</span>
              </div>
            )}
            <button onClick={handleApply} disabled={processing || !inputImage}
              className="px-5 py-2 rounded-xl text-[12px] font-semibold shrink-0"
              style={{ background: (!inputImage || processing) ? '#CCC' : '#1A1A1A', color: '#FFF' }}>
              {processing ? `${Math.round(progress)}%` : `${displayCost}cr`}
            </button>
          </div>
        )}

        {/* Expanded state — scrollable controls + sticky CTA */}
        {sheetExpanded && (
          <>
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4" style={{ scrollbarWidth: 'thin' }}>
              {renderToolControls()}
            </div>
            {/* Sticky CTA — always visible */}
            <div className="px-4 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: 'white' }}>
              <div className="flex gap-1.5 mb-2">
                {(['1k', '2k', '4k'] as const).map(r => (
                  <button key={r} onClick={() => setEditorResolution(r)} style={pill(editorResolution === r)} className="pill-btn flex-1 text-center">{r.toUpperCase()}</button>
                ))}
              </div>
              <button onClick={() => { handleApply(); setSheetExpanded(false) }} disabled={processing || !inputImage}
                className="w-full py-3 rounded-2xl text-[13px] font-semibold transition-all"
                style={{ background: (!inputImage || processing) ? '#CCC' : '#1A1A1A', color: '#FFF', opacity: (!inputImage || processing) ? 0.6 : 1 }}>
                {processing ? `Procesando... ${Math.round(progress)}%` : `${currentTool.icon} Aplicar ${currentTool.label} (${displayCost}cr)`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── MODALS (identical to AIEditor) ─────────────────────── */}
      <Suspense fallback={null}>
        {activeModal === 'relight' && inputImage && (
          <RelightModal
            targetItem={{ id: 'editor-input', url: inputImage, type: 'edit' }}
            onClose={() => setActiveModal(null)}
            onSave={handleModalSave('relight', 'relight')}
          />
        )}
        {activeModal === 'inpaint' && inputImage && (
          <InpaintingModal
            item={{ id: 'editor-input', url: inputImage }}
            onClose={() => setActiveModal(null)}
            onSave={handleModalSave('inpaint', 'inpaint')}
          />
        )}
        {activeModal === 'enhance' && inputImage && (
          <SkinEnhancerModal
            targetItem={{ id: 'editor-input', url: inputImage, type: 'edit' }}
            onClose={() => setActiveModal(null)}
            onSave={handleModalSave('enhance', 'enhance')}
          />
        )}
      </Suspense>

      {/* Basic Image Editor overlay */}
      {showBasicEditor && inputImage && (
        <Suspense fallback={null}>
          <ImageEditor
            imageUrl={inputImage}
            onSave={(editedDataUrl) => {
              setResultImage(editedDataUrl)
              setEditHistory(prev => [...prev, editedDataUrl])
              addItems([{ id: crypto.randomUUID(), url: editedDataUrl, type: 'edit', model: 'basic-editor', tags: ['edited'], timestamp: Date.now() }])
              toast.addToast('Imagen editada guardada', 'success')
            }}
            onClose={() => setShowBasicEditor(false)}
          />
        </Suspense>
      )}

      {/* Lightbox */}
      {editorLightbox && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setEditorLightbox(null)}>
          <button onClick={() => setEditorLightbox(null)} style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>{'\u2715'}</button>
          <img src={editorLightbox} onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} alt="" />
        </div>
      )}

      {/* Engine dropdown portal (same as AIEditor) */}
      {showEngineModal && dropdownPos && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setShowEngineModal(false)} />
          <div style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999, maxHeight: '60vh', display: 'flex', flexDirection: 'column', borderRadius: 14, background: '#FFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,.12)', overflow: 'hidden' }}>
            <div className="overflow-y-auto p-3 pb-2 space-y-1 flex-1 min-h-0" style={{ scrollbarWidth: 'thin' }}>
              <div style={sectionLabel}>Motor</div>
              {(() => {
                const featureKey = TOOL_TO_FEATURE[activeTool]
                const featureDef = featureKey ? FEATURE_ENGINES[featureKey] : null
                const allowedKeys = featureDef ? featureDef.keys : null
                const filteredEngines = allowedKeys ? ENGINE_METADATA.filter(e => allowedKeys.includes(e.key)) : ENGINE_METADATA
                return <>
                  {!allowedKeys && <>
                    <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                      style={{ background: selectedEngine === 'auto' ? '#1A1A1A' : 'transparent', border: `1px solid ${selectedEngine === 'auto' ? '#1A1A1A' : 'transparent'}` }}>
                      <span className="text-base">{'\u2728'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? '#FFF' : '#111' }}>Auto</div>
                        <div className="text-[9px]" style={{ color: selectedEngine === 'auto' ? 'rgba(255,255,255,.6)' : '#999' }}>Mejor motor automaticamente</div>
                      </div>
                    </button>
                    <div className="my-1" style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
                  </>}
                  {filteredEngines.map(eng => (
                    <button key={eng.key} onClick={() => { setSelectedEngine(eng.key); setShowEngineModal(false) }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                      style={{ background: selectedEngine === eng.key ? '#1A1A1A' : 'transparent', border: `1px solid ${selectedEngine === eng.key ? '#1A1A1A' : 'transparent'}` }}>
                      <span className="text-sm" style={{ color: '#999' }}>{'\u2699'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? '#FFF' : '#111' }}>{eng.userFriendlyName}</div>
                        <div className="text-[8px]" style={{ color: selectedEngine === eng.key ? 'rgba(255,255,255,.6)' : '#999' }}>{eng.description}</div>
                        {eng.bestFor && <div className="text-[7px] mt-0.5" style={{ color: selectedEngine === eng.key ? 'rgba(255,255,255,.5)' : '#999' }}>Bueno para: {eng.bestFor}</div>}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[9px] font-mono" style={{ color: selectedEngine === eng.key ? '#FFF' : '#111' }}>{eng.creditCost}cr</div>
                        <div className="text-[8px] font-mono" style={{ color: '#999' }}>{eng.estimatedTime}</div>
                      </div>
                    </button>
                  ))}
                </>
              })()}
            </div>
            <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={sectionLabel}>Resolucion</div>
              <div className="flex gap-2">
                {[{ id: '1k', label: '1K', desc: '1024px' }, { id: '2k', label: '2K', desc: '2048px' }, { id: '4k', label: '4K', desc: '4096px' }].map(r => (
                  <button key={r.id} onClick={() => setEditorResolution(r.id)}
                    className="flex-1 px-3 py-2 rounded-xl text-center transition-all"
                    style={{ background: editorResolution === r.id ? '#1A1A1A' : '#F8F8F8', border: `1px solid ${editorResolution === r.id ? '#1A1A1A' : 'rgba(0,0,0,0.06)'}` }}>
                    <div className="text-[11px] font-mono font-bold" style={{ color: editorResolution === r.id ? '#FFF' : '#111' }}>{r.label}</div>
                    <div className="text-[8px] font-mono" style={{ color: editorResolution === r.id ? 'rgba(255,255,255,.6)' : '#999' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default AIEditorV2
