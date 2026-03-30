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

// Lazy load modals (they're heavy)
const RelightModal = lazy(() => import('../components/RelightModal'))
// FaceSwap and TryOn now work inline — modals removed
const InpaintingModal = lazy(() => import('../components/InpaintingModal'))
const SkinEnhancerModal = lazy(() => import('../components/SkinEnhancerModal'))
const ImageEditor = lazy(() => import('../components/ImageEditor'))

const tools = [
  // Primary tools (visible by default)
  { id:'freeai', label:'AI Edit', icon:'\u2728', desc:'Edita con cualquier instrucción en lenguaje natural' },
  { id:'reimagine', label:'Reimaginar', icon:'\u2726', desc:'Crea una foto nueva con 100+ estilos' },
  { id:'relight', label:'Reiluminar', icon:'\uD83D\uDCA1', desc:'Cambia la iluminación de cualquier foto' },
  { id:'faceswap', label:'Cambio de Rostro', icon:'\uD83C\uDFAD', desc:'Intercambia rostros entre imágenes' },
  { id:'tryon', label:'Try-On Virtual', icon:'\uD83D\uDC57', desc:'Prueba ropa y accesorios' },
  // bgswap removed — unified into composite/scene
  { id:'realskin', label:'Piel Realista', icon:'\uD83E\uDDF4', desc:'Agrega poros naturales, textura e imperfecciones' },
  // Secondary tools (behind "More" toggle)
  { id:'rotate360', label:'Ángulos 360\u00b0', icon:'\uD83D\uDD04', desc:'Genera vistas desde todos los ángulos' },
  { id:'composite', label:'Escena / Fondo', icon:'\uD83C\uDFAC', desc:'Cambia el fondo o coloca en otra escena' },
  { id:'enhance', label:'Mejorar', icon:'\u2728', desc:'Mejora la calidad y los detalles' },
  { id:'style', label:'Transferencia de Estilo', icon:'\uD83C\uDFA8', desc:'Aplica estilos artísticos' },
  { id:'inpaint', label:'Inpaint', icon:'\uD83D\uDD8C\uFE0F', desc:'Edita áreas específicas' },
  { id:'rembg', label:'Quitar Fondo', icon:'\u2702\uFE0F', desc:'Elimina el fondo al instante' },
  { id:'expand', label:'Expandir', icon:'\u2194\uFE0F', desc:'Expande la imagen más allá de sus bordes' },
]

// Relight presets — each has a light position on the sphere (azimuth/elevation in degrees) + color
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
  { n:'Rembrandt',    c:'#c8a060', prompt:'classic Rembrandt lighting pattern, key light from 45° creating triangle on shadow cheek, painterly quality' },
]

const relightDirections = [
  { id: 'left',   label: '← Izquierda', prompt: 'Light source from the left side' },
  { id: 'front',  label: '↑ Frontal',   prompt: 'Light source from the front, facing the subject' },
  { id: 'right',  label: 'Derecha →',   prompt: 'Light source from the right side' },
  { id: 'above',  label: '↓ Arriba',    prompt: 'Light source from directly above' },
  { id: 'behind', label: '↻ Contraluz', prompt: 'Backlight from behind the subject, rim lighting on edges' },
]

const relightIntensities = [
  { id: 'subtle',   label: 'Sutil',     prompt: 'Apply the lighting change subtly, as a gentle shift in mood' },
  { id: 'normal',   label: 'Normal',    prompt: 'Apply a clear, natural lighting change' },
  { id: 'dramatic', label: 'Dramático', prompt: 'Apply an extreme, highly dramatic lighting change with strong contrast' },
]

const angleViews = ['Front','Right 45°','Right 90°','Back Right','Back','Back Left','Left 90°','Left 45°']

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
const styleNames = styleTransfers.map(s => s.name)

const bgPresets = ['Studio','Nature','City','Interior','Abstract','Custom']

// Map AI Editor tool IDs → FEATURE_ENGINES keys
const TOOL_TO_FEATURE: Record<string, string> = {
  'freeai': 'relight',       // freeai uses same engines as relight (general editing)
  'relight': 'relight',
  'rotate360': 'angles',     // 360° character sheets — NB2 or Grok
  'faceswap': 'face-swap',
  'tryon': 'try-on',
  'bgswap': 'bg-swap',
  'composite': 'bg-swap',    // composite uses same engines as bg-swap
  'enhance': 'enhance',
  'style': 'style-transfer',
  'realskin': 'skin-enhancer',
  'inpaint': 'inpaint',
  'expand': 'expand',
}

// Convert a data URL or blob URL to a File object
async function urlToFile(url: string, filename = 'character.png'): Promise<File> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

/**
 * Route an edit instruction to the selected engine.
 * Falls back to Gemini (editImageWithAI) for 'auto' or unknown engines.
 */
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

  // Qwen Image 2 Pro (spatial reasoning, style & lighting edits)
  if (engineKey === 'fal:qwen-edit') {
    return editImageWithQwen(file, instruction, onProgress, abortSignal)
  }

  // FireRed v1.1 (portrait editing, try-on, makeup)
  if (engineKey === 'fal:firered-edit') {
    const refs = referenceImage ? [referenceImage] : []
    return editImageWithFireRed(file, instruction, refs, onProgress, abortSignal)
  }

  // OneReward (mask-based inpainting — requires a mask image)
  if (engineKey === 'fal:onereward') {
    if (!referenceImage) {
      throw new Error('OneReward requires a mask image. Use the Inpaint tool modal to paint a mask.')
    }
    return inpaintWithOneReward(file, referenceImage, instruction, onProgress, abortSignal)
  }

  // Seedream 5 Edit (intelligent editing, low hallucination)
  if (engineKey === 'fal:seedream5-edit') {
    return editImageWithSeedream5Lite(file, instruction, onProgress, abortSignal)
  }

  // FLUX Kontext
  if (engineKey === 'fal:kontext-multi' || eng?.falModel === 'fal-ai/flux-pro/kontext/multi') {
    return editImageWithFluxKontext(file, instruction, onProgress, undefined, abortSignal)
  }

  // Seedream 5.0 / 4.5 (creation models used for editing)
  if (engineKey.startsWith('fal:seedream')) {
    const refs = referenceImage ? [referenceImage] : []
    return editImageWithSeedream5(file, instruction, refs, onProgress, undefined, abortSignal)
  }

  // FLUX.2 Pro
  if (engineKey === 'fal:flux2pro') {
    const refs = referenceImage ? [referenceImage] : []
    return editImageWithFlux2Pro(file, instruction, refs, onProgress, undefined, abortSignal)
  }

  // Grok Imagine (edit mode)
  if (engineKey === 'replicate:grok') {
    const refs = referenceImage ? [referenceImage] : []
    return editImageWithGrokFal(file, instruction, onProgress, abortSignal, refs, bypassCompiler)
  }

  // Pruna P-Image-Edit (fast, no safety filter) — supports multi-image for try-on
  if (engineKey === 'replicate:pruna') {
    return editWithPruna(file, instruction, onProgress, abortSignal, referenceImage ?? null).then(r => [r])
  }

  // GPT Image
  if (eng?.provider === AIProvider.OpenAI) {
    return editImageWithGPT(file, instruction, onProgress, undefined, abortSignal)
  }

  // Gemini (default / auto / any gemini: key)
  return editImageWithAI(
    { baseImage: file, instruction, referenceImage: referenceImage ?? null, model: eng?.geminiModel },
    onProgress, abortSignal,
  )
}

export function AIEditor({ onNav }: { onNav?: (page: string) => void }) {
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
  const [reimagineCustom, setReimagineCustom] = useState('')

  // Composite / Scene tool state
  const [sceneImage, setSceneImage] = useState<string | null>(null)
  const [sceneFile, setSceneFile] = useState<File | null>(null)
  const [scenePrompt, setScenePrompt] = useState('')
  const [sceneSource, setSceneSource] = useState<'upload'|'gallery'|'prompt'>('upload')
  const sceneInputRef = useRef<HTMLInputElement>(null)

  // Engine & resolution
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [selectedResolution, setSelectedResolution] = useState('1k')
  const [showEngineModal, setShowEngineModal] = useState(false)
  const engineButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // Functional state
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
  // Face swap inline state
  const [faceSwapFile, setFaceSwapFile] = useState<File | null>(null)
  const [faceSwapPreview, setFaceSwapPreview] = useState<string | null>(null)
  const faceSwapInputRef = useRef<HTMLInputElement>(null)
  // Try-on inline state
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAllTools, setShowAllTools] = useState(() => {
    try { return localStorage.getItem('vist-editor-all-tools') === 'true' } catch { return false }
  })
  const [showBasicEditor, setShowBasicEditor] = useState(false)
  // Expand tool state
  const [expandDirection, setExpandDirection] = useState<string>('all')
  const [expandPixels, setExpandPixels] = useState(256)

  // Skin enhancer state
  const [skinPreset, setSkinPreset] = useState<'soft'|'natural'|'realistic'|'ultra'|'custom'>('natural')
  const [skinSliders, setSkinSliders] = useState({ pores: 50, veins: 20, tension: 40, imperfections: 30, sss: 50, hydration: 40 })

  // Canvas container ref for non-passive wheel listener
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const { decrementCredits, restoreCredits } = useProfile()

  // Visible cost for the Apply button (shared with handleApply logic)
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

  // When the active tool changes, reset engine to the tool's default
  useEffect(() => {
    const featureKey = TOOL_TO_FEATURE[activeTool]
    const featureDef = featureKey ? FEATURE_ENGINES[featureKey] : null
    if (featureDef) {
      setSelectedEngine(featureDef.default)
    } else {
      setSelectedEngine('auto')
    }
  }, [activeTool])

  // Non-passive wheel listener for canvas zoom (passive listeners can't preventDefault)
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

  // Consume pending navigation (e.g. from Gallery → Editor)
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

  // Auto-load hero shot from pipeline
  const pipelineHeroUrl = usePipelineStore(s => s.heroShotUrl)
  const pipelineCharId = usePipelineStore(s => s.characterId)
  const pipelineSetEditedHero = usePipelineStore(s => s.setEditedHero)
  const pipelineSetCharacter = usePipelineStore(s => s.setCharacter)

  // Auto-detect character from image URL — when loading a gallery image, check if it belongs to a character
  const detectAndSetCharacter = (imageUrl: string) => {
    const item = galleryItems.find(i => i.url === imageUrl && i.characterId)
    if (item?.characterId) pipelineSetCharacter(item.characterId)
  }

  // Get character reference files for identity preservation
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

  // Close engine dropdown on scroll or resize
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

  const handleApply = async () => {
    if (!inputImage) { toast.error('Sube una imagen primero'); return }

    // For tools with modals, open the modal instead
    if (['inpaint', 'enhance'].includes(activeTool)) {
      setActiveModal(activeTool)
      return
    }

    // Face swap needs a source face
    if (activeTool === 'faceswap' && !faceSwapFile) {
      toast.error('Sube una foto del rostro de origen primero')
      return
    }

    // Try-on needs an outfit reference
    if (activeTool === 'tryon' && !garmentFile) {
      toast.error('Sube una referencia de outfit primero')
      return
    }

    // Free AI needs a prompt
    if (activeTool === 'freeai' && !freePrompt.trim()) {
      toast.error('Escribe una instrucción primero')
      return
    }

    // Reimagine needs a prompt
    if (activeTool === 'reimagine' && reimagineStyleIds.size === 0 && !reimagineCustom.trim()) {
      return
    }

    // Composite needs a scene reference or prompt
    if (activeTool === 'composite') {
      if (!sceneImage && !scenePrompt.trim()) {
        toast.error('Sube una imagen de escena o describe la escena')
        return
      }
    }

    // Non-modal tools need a File object for the API (except rembg which works on URLs)
    if (!inputFile && activeTool !== 'rembg') {
      if (isLoadingFile) {
        toast.info('Espera, cargando imagen...')
      } else {
        toast.error('Sube una imagen primero')
      }
      return
    }

    // For tools without modals, process directly
    setProcessing(true)
    setProgress(0)

    // Resolve engine and cost — use engine's credit cost when a specific engine is selected
    const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
    const baseCost = activeTool === 'rotate360' ? 10 : 8
    const cost = eng ? eng.creditCost : baseCost
    const ok = await decrementCredits(cost)
    if (!ok) { toast.error('Créditos insuficientes'); setProcessing(false); return }

    const outputOpts = { imageSize: editorResolution === '4k' ? '4K' : editorResolution === '1k' ? '1K' : '2K', aspectRatio: editorAspectRatio }

    // Resolve engine label for gallery
    const engineLabel = eng?.userFriendlyName || (selectedEngine === 'auto' ? 'Auto' : selectedEngine)

    try {
      let resultUrls: string[] = []

      if (activeTool === 'freeai') {
        // NB2 → Seedream → Grok with character refs for identity
        const charRefs = await getCharRefFiles()
        const instruction = freePrompt.trim()
        try {
          const results = await editImageWithAI({ baseImage: inputFile!, referenceImage: charRefs[0] ?? undefined, instruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio })
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
        // Fixed NB2 with fallback chain (nb2 → seedream → grok → nb-pro → pruna)
        const result = await runEditWithFallback(inputImage!, instruction, 'nb2', 'relight', outputOpts)
        resultUrls = [result.url]
      } else if (activeTool === 'rotate360') {
        const view = angleViews[sel360]
        const envHints: Record<string, string> = {
          'Front': 'centered background, eye-level perspective',
          'Right 45°': 'background shifts to show what was to the left of the original frame, slight parallax',
          'Right 90°': 'completely different background — perpendicular view of the space, only the side wall or environment visible',
          'Back Right': 'background now shows what was behind the camera in the original photo',
          'Back': 'full reverse view — we see the opposite side of the environment',
          'Back Left': 'background shows what was behind and to the right of the original camera',
          'Left 90°': 'completely different background — perpendicular view from the other side',
          'Left 45°': 'background shifts to show what was to the right of the original frame, slight parallax',
        }
        const envHint = envHints[view] || 'background changes naturally to match the new camera position'
        const instruction = `Create a new photograph of this person from a ${view.toLowerCase()} camera angle. The camera has moved around the subject. Keep exact same person, clothing, hairstyle, body. Background MUST change: ${envHint}. Render from the new camera perspective.`
        // Fixed NB2 with fallback chain
        const result = await runEditWithFallback(inputImage!, instruction, 'nb2', 'angles', outputOpts)
        resultUrls = [result.url]
      } else if (activeTool === 'composite') {
        let sceneInstruction: string
        if (sceneImage && scenePrompt.trim()) {
          sceneInstruction = `Place this person into the scene shown in the reference image. Additional: ${scenePrompt.trim()}. Keep person's face, body, outfit, pose identical. Match lighting, shadows, color grading to the scene.`
        } else if (sceneImage) {
          sceneInstruction = `Place this person into the exact scene/location shown in the reference image. Keep person's face, body, outfit, pose identical. Match lighting, shadows, color grading.`
        } else {
          sceneInstruction = `Change the background/scene to: ${scenePrompt.trim()}. Keep person's face, body, outfit, pose identical. Match lighting and color grading to the new scene.`
        }
        // NB2 → Seedream → Grok fallback (with scene reference + character identity refs)
        const charRefs = await getCharRefFiles()
        try {
          const results = await editImageWithAI({ baseImage: inputFile, referenceImage: sceneFile ?? charRefs[0] ?? undefined, instruction: sceneInstruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio })
          if (!results || results.filter(Boolean).length === 0) throw new Error('NB2 returned empty')
          resultUrls = results
        } catch (nb2Err) {
          console.warn('NB2 scene failed, trying Seedream:', nb2Err)
          const allRefs = [...(sceneFile ? [sceneFile] : []), ...charRefs]
          try {
            resultUrls = await editImageWithSeedream5(inputFile, sceneInstruction, allRefs, (p) => setProgress(p))
          } catch (sdErr) {
            console.warn('Seedream scene failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile, sceneInstruction, (p) => setProgress(p), undefined, allRefs)
          }
        }
      } else if (activeTool === 'style') {
        const style = styleTransfers[selStyle]
        const instruction = `Transform the entire image into ${style.name} style. ${style.prompt}. The person's face must remain recognizable but the visual rendering should change to match this aesthetic. Use reference images ONLY for face and body proportions identity — IGNORE their clothing.`
        // Pass character refs for identity, NB2 → Seedream → Grok fallback
        const charRefs = await getCharRefFiles()
        if (charRefs.length > 0) {
          try {
            const results = await editImageWithAI({ baseImage: inputFile!, referenceImage: charRefs[0], instruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio })
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
          skinInstruction = parts.length > 0
            ? `Add the following skin details: ${parts.join(', ')}.`
            : 'Preserve the current skin texture as-is.'
        }
        const instruction = `${skinInstruction} Do not alter the face shape, features, expression, hair, outfit, pose, or background.`
        resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p))
      } else if (activeTool === 'faceswap' && faceSwapFile) {
        // NB2 → Seedream → Grok (all support multi-image for face reference)
        const faceInstruction = `Replace the face of the person in the base image with the face from the reference image. Keep hair, body, pose, clothing, and background exactly the same. Only change facial features.`
        try {
          const dataUrl = await faceSwapWithGemini(inputFile, faceSwapFile, (p) => setProgress(p))
          if (!dataUrl) throw new Error('NB2 face swap returned empty')
          resultUrls = [dataUrl]
        } catch (nb2Err) {
          console.warn('NB2 face swap failed, trying Seedream:', nb2Err)
          try {
            resultUrls = await editImageWithSeedream5(inputFile, faceInstruction, [faceSwapFile], (p) => setProgress(p))
          } catch (sdErr) {
            console.warn('Seedream face swap failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile, faceInstruction, (p) => setProgress(p), undefined, [faceSwapFile], true)
          }
        }
      } else if (activeTool === 'tryon' && garmentFile) {
        // NB2 → Seedream → Grok (all support multi-image for garment reference)
        const tryonInstruction = `VIRTUAL TRY-ON: Replace ONLY the clothing on this person with the garment from the reference image. Keep the person's face, hair, skin, body, pose, and background 100% unchanged. Reproduce every fabric detail, pattern, color, and texture from the reference garment exactly.`
        try {
          const results = await editImageWithAI({ baseImage: inputFile, referenceImage: garmentFile, instruction: tryonInstruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio })
          if (!results || results.filter(Boolean).length === 0) throw new Error('NB2 returned empty')
          resultUrls = results
        } catch (nb2Err) {
          console.warn('NB2 try-on failed, trying Seedream:', nb2Err)
          try {
            resultUrls = await editImageWithSeedream5(inputFile, tryonInstruction, [garmentFile], (p) => setProgress(p))
          } catch (sdErr) {
            console.warn('Seedream try-on failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile, tryonInstruction, (p) => setProgress(p), undefined, [garmentFile], true)
          }
        }
      } else if (activeTool === 'expand') {
        const { expandWithBria } = await import('../services/replicateService')
        const expandedUrl = await expandWithBria(inputImage, expandDirection as 'up' | 'down' | 'left' | 'right' | 'all', expandPixels, (p: number) => setProgress(p))
        resultUrls = [expandedUrl]
      } else if (activeTool === 'rembg') {
        const bgRemovedUrl = await removeBackground(inputImage, (p) => setProgress(p))
        resultUrls = [bgRemovedUrl]
      } else if (activeTool === 'reimagine') {
        const selectedStyles = SOUL_STYLES.filter(s => reimagineStyleIds.has(s.id))
        const styleDescriptions = selectedStyles.map(s => s.hint || s.name)
        const direction = reimagineCustom.trim() || styleDescriptions.join('. Also: ') || 'editorial fashion'
        const instruction = `Reimagine this person in a completely new photo with ${direction} aesthetic. Create a NEW composition — new pose, new lighting, new outfit, new environment matching this style. Use reference images ONLY for face and body proportions identity — IGNORE their clothing, background, and pose. The outfit must match the aesthetic, NOT the reference images' outfit. DO NOT add any text, words, letters, labels, watermarks, or captions anywhere on the image.`
        // NB2 → Seedream → Grok (all pass character refs for identity)
        const charRefs = await getCharRefFiles()
        try {
          const results = await editImageWithAI({ baseImage: inputFile!, referenceImage: charRefs[0] ?? undefined, instruction, imageSize: outputOpts.imageSize as any, aspectRatio: outputOpts.aspectRatio })
          if (!results || results.filter(Boolean).length === 0) throw new Error('NB2 returned empty')
          resultUrls = results
        } catch (nb2Err) {
          console.warn('NB2 reimagine failed, trying Seedream:', nb2Err)
          try {
            const sdResults = await editImageWithSeedream5(inputFile!, instruction, charRefs, (p) => setProgress(p))
            if (!sdResults || sdResults.filter(Boolean).length === 0) throw new Error('Seedream returned empty')
            resultUrls = sdResults
          } catch (sdErr) {
            console.warn('Seedream reimagine failed, trying Grok:', sdErr)
            resultUrls = await editImageWithGrokFal(inputFile!, instruction, (p) => setProgress(p), undefined, charRefs)
          }
        }
      }

      const validUrls = resultUrls.filter(Boolean)
      if (validUrls.length > 0) {
        resultUrls = validUrls
        setResultImage(resultUrls[0])
        setEditHistory(prev => [resultUrls[0], ...prev].slice(0, 20))
        pipelineSetEditedHero(resultUrls[0])

        addItems([{
          id: crypto.randomUUID(),
          url: resultUrls[0],
          prompt: `${activeTool} edit`,
          model: engineLabel,
          timestamp: Date.now(),
          type: 'edit',
          tags: [activeTool],
          characterId: pipelineCharId || undefined,
        }])
        toast.success('Edición aplicada')
      } else {
        restoreCredits(cost)
        toast.error('La herramienta no devolvió resultado')
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
    addItems([{
      id: crypto.randomUUID(),
      url: dataUrl,
      prompt: promptLabel,
      model: toolTag,
      timestamp: Date.now(),
      type: 'edit',
      tags: [toolTag],
      characterId: pipelineCharId || undefined,
    }])
    setActiveModal(null)
  }

  return (
    <div className="h-full flex flex-col lg:flex-row" style={{ background: 'var(--joi-bg-0)' }}>
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

      {/* Tool sidebar */}
      <div className="w-[84px] shrink-0 flex flex-col items-center py-4 gap-1" style={{ background:'var(--joi-bg-1)', borderRight:'1px solid var(--joi-border)' }}>
        {(showAllTools ? tools : tools.slice(0, 6)).map(t => (
          <button key={t.id} onClick={()=>setActiveTool(t.id)}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all group relative`}
            style={{
              background: activeTool===t.id ? 'var(--joi-pink-soft)' : 'transparent',
              border: `1px solid ${activeTool===t.id ? 'var(--joi-border-h)' : 'transparent'}`,
            }}>
            <span className="text-lg">{t.icon}</span>
            <span className="text-[9px] mt-0.5 font-medium leading-tight text-center px-0.5" style={{ color: activeTool===t.id ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>
              {t.label.split(' ')[0]}
            </span>
            <div className="absolute left-full ml-2 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ background:'var(--joi-bg-3)', color:'var(--joi-text-1)', border:'1px solid var(--joi-border)' }}>
              {t.desc}
            </div>
          </button>
        ))}
        <button onClick={() => { setShowAllTools(v => { const next = !v; try { localStorage.setItem('vist-editor-all-tools', String(next)) } catch {} return next }) }}
          className="w-14 h-7 rounded-xl flex items-center justify-center transition-all mt-1"
          style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-3)' }}
          title={showAllTools ? 'Mostrar menos herramientas' : 'Mostrar más herramientas'}>
          <span className="text-[9px] font-medium">{showAllTools ? '▲ Menos' : '▼ Más'}</span>
        </button>
        <div className="w-12 h-px my-1" style={{ background: 'var(--joi-border)' }} />
        <button onClick={() => inputImage && setShowBasicEditor(true)}
          className="w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all group relative"
          style={{
            background: showBasicEditor ? 'var(--joi-pink-soft)' : 'transparent',
            border: `1px solid ${showBasicEditor ? 'var(--joi-border-h)' : 'transparent'}`,
            opacity: inputImage ? 1 : 0.3,
          }}
          title="Editor Básico — recorte, filtros, ajustes (sin AI)">
          <span className="text-lg">{'\u270F\uFE0F'}</span>
          <span className="text-[9px] mt-0.5 font-medium" style={{ color: showBasicEditor ? 'var(--joi-violet)' : 'var(--joi-text-3)' }}>
            Básico
          </span>
        </button>
      </div>

      {/* Tool Panel */}
      <div className="w-full lg:w-[300px] shrink-0 flex flex-col max-h-[40vh] lg:max-h-full overflow-y-auto joi-scroll" style={{ background:'var(--joi-bg-1)', borderRight:'1px solid var(--border)', backdropFilter:'blur(16px)' }}>
        <div className="px-4 h-14 flex items-center shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
          <h2 className="text-sm font-bold" style={{ color:'var(--joi-text-1)' }}>
            {tools.find(t=>t.id===activeTool)?.icon} {tools.find(t=>t.id===activeTool)?.label}
          </h2>
          <div className="ml-auto relative">
            {(() => {
              if (['reimagine','relight','rotate360','faceswap','tryon','composite','style','freeai'].includes(activeTool)) return null // fixed engine tools
              const fk = TOOL_TO_FEATURE[activeTool]
              const fd = fk ? FEATURE_ENGINES[fk] : null
              const hasMultiple = fd ? fd.keys.length > 1 : true
              if (!hasMultiple) return null
              return <button ref={engineButtonRef} onClick={() => {
                if (engineButtonRef.current) {
                  const rect = engineButtonRef.current.getBoundingClientRect()
                  setDropdownPos({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: Math.max(rect.width, 300),
                  })
                }
                setShowEngineModal(v => !v)
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all hover:scale-105 relative"
              style={{
                background: selectedEngine !== 'auto' ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)',
                border: `1px solid ${selectedEngine !== 'auto' ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                color: selectedEngine !== 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-3)',
              }}>
              {'\uD83D\uDD27'}
              {selectedEngine !== 'auto' && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background:'var(--joi-pink)' }} />
              )}
            </button>
            })()}
            {showEngineModal && dropdownPos && createPortal(
              <>
                {/* Backdrop — closes dropdown on outside click */}
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 9998 }}
                  onClick={() => setShowEngineModal(false)}
                />
                {/* Dropdown — portaled to document.body, escapes overflow:hidden */}
                <div
                  style={{
                    position: 'absolute',
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 9999,
                    maxHeight: '60vh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '0.75rem',
                    background: 'var(--joi-bg-glass)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid var(--joi-border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
                    overflow: 'hidden',
                  }}>
                  <div className="overflow-y-auto p-3 pb-2 space-y-1 flex-1 min-h-0 joi-scroll">
                    <div className="joi-label mb-2 px-1">Motor</div>
                    {(() => {
                      const featureKey = TOOL_TO_FEATURE[activeTool]
                      const featureDef = featureKey ? FEATURE_ENGINES[featureKey] : null
                      const allowedKeys = featureDef ? featureDef.keys : null
                      const filteredEngines = allowedKeys ? ENGINE_METADATA.filter(e => allowedKeys.includes(e.key)) : ENGINE_METADATA
                      return <>
                        {!allowedKeys && <>
                          <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all"
                            style={{ background: selectedEngine === 'auto' ? 'var(--joi-pink-soft)' : 'transparent', border: `1px solid ${selectedEngine === 'auto' ? 'var(--joi-border-h)' : 'transparent'}` }}>
                            <span className="text-base">{'\u2728'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>Auto</div>
                              <div className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>Mejor motor automáticamente</div>
                            </div>
                          </button>
                          <div className="joi-divider my-1" />
                        </>}
                        {filteredEngines.map(eng => (
                          <button key={eng.key} onClick={() => { setSelectedEngine(eng.key); setShowEngineModal(false) }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all"
                            style={{ background: selectedEngine === eng.key ? 'var(--joi-pink-soft)' : 'transparent', border: `1px solid ${selectedEngine === eng.key ? 'var(--joi-border-h)' : 'transparent'}` }}>
                            <span className="text-sm" style={{ color: 'var(--joi-text-3)' }}>{'\u2699'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{eng.userFriendlyName}</div>
                              <div className="text-[8px]" style={{ color: 'var(--joi-text-3)' }}>{eng.description}</div>
                              {eng.bestFor && <div className="text-[7px] mt-0.5" style={{ color: 'var(--joi-pink)', opacity: 0.7 }}>Bueno para: {eng.bestFor}</div>}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-[9px] font-mono" style={{ color: 'var(--joi-pink)' }}>{eng.creditCost}cr</div>
                              <div className="text-[8px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{eng.estimatedTime}</div>
                            </div>
                          </button>
                        ))}
                      </>
                    })()}
                  </div>
                  <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    <div className="joi-label mb-2 px-1">Resolución</div>
                    <div className="flex gap-2">
                      {[{ id: '1k', label: '1K', desc: '1024px' }, { id: '2k', label: '2K', desc: '2048px' }, { id: '4k', label: '4K', desc: '4096px' }].map(r => (
                        <button key={r.id} onClick={() => setSelectedResolution(r.id)}
                          className="flex-1 px-3 py-2 rounded-lg text-center transition-all"
                          style={{ background: selectedResolution === r.id ? 'var(--joi-pink-soft)' : 'rgba(255,255,255,.02)', border: `1px solid ${selectedResolution === r.id ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}` }}>
                          <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{r.label}</div>
                          <div className="text-[8px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 joi-scroll">
          <div>
            <div className="joi-label mb-2">Imagen de Entrada</div>
            <div className="relative aspect-[4/3] rounded-xl cursor-pointer transition-all overflow-hidden"
              style={{ background:'var(--joi-bg-3)', border:'1px dashed rgba(255,255,255,.04)', backdropFilter:'blur(8px)' }}
              onClick={() => fileInputRef.current?.click()}>
              {inputImage ? (
                <img src={inputImage} className="w-full h-full object-cover rounded-xl" alt="" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-xl mb-1" style={{ color:'var(--joi-pink)' }}>{'\u2191'}</span>
                  <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>Subir imagen</span>
                  <span className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>o arrastra aquí</span>
                </div>
              )}
            </div>
          </div>

          {/* Source: Character photos */}
          {characters.length > 0 && (
            <div>
              <div className="joi-label mb-2">Fotos de Personaje</div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {characters.map(ch => (
                  <button key={ch.id}
                    onClick={() => setEditorCharFilter(editorCharFilter === ch.id ? null : ch.id)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] transition-all"
                    style={{ background: editorCharFilter === ch.id ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)', border: `1px solid ${editorCharFilter === ch.id ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`, color: editorCharFilter === ch.id ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>
                    {ch.thumbnail && <img src={ch.thumbnail} className="w-5 h-5 rounded-full object-cover" alt="" />}
                    {ch.name}
                  </button>
                ))}
              </div>
              {editorCharFilter && (
                <div className="grid grid-cols-3 gap-1 max-h-[140px] overflow-y-auto joi-scroll rounded-lg">
                  {galleryItems.filter(i => i.characterId === editorCharFilter && i.url).slice(0, 12).map(item => (
                    <button key={item.id} onClick={async () => {
                      setInputImage(item.url); setResultImage(null)
                      if (editorCharFilter) pipelineSetCharacter(editorCharFilter)
                      try { setInputFile(await urlToFile(item.url, 'gallery.png')) } catch { setInputFile(null) }
                    }}
                      className="aspect-square rounded-lg overflow-hidden transition-all hover:opacity-80"
                      style={{ border: inputImage === item.url ? '2px solid var(--joi-pink)' : '1px solid rgba(255,255,255,.04)' }}>
                      <img src={item.url} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Source: Recent gallery */}
          <div>
            <div className="joi-label mb-2">Galería Reciente</div>
            <div className="grid grid-cols-3 gap-1 max-h-[140px] overflow-y-auto joi-scroll rounded-lg">
              {galleryItems.filter(i => i.url && !editorCharFilter).slice(0, 9).map(item => (
                <button key={item.id} onClick={async () => {
                  setInputImage(item.url); setResultImage(null)
                  detectAndSetCharacter(item.url)
                  try { setInputFile(await urlToFile(item.url, 'gallery.png')) } catch { setInputFile(null) }
                }}
                  className="aspect-square rounded-lg overflow-hidden transition-all hover:opacity-80"
                  style={{ border: inputImage === item.url ? '2px solid var(--joi-pink)' : '1px solid rgba(255,255,255,.04)' }}>
                  <img src={item.url} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          </div>

          {/* Output settings */}
          <div>
            <div className="joi-label mb-2">Salida</div>
            <div className="flex gap-1.5 mb-2">
              {(['1k', '2k', '4k'] as const).map(r => (
                <button key={r} onClick={() => setEditorResolution(r)}
                  className="flex-1 py-1.5 rounded-lg text-[9px] font-mono text-center transition-all"
                  style={{ background: editorResolution === r ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)', border: `1px solid ${editorResolution === r ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`, color: editorResolution === r ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>{r.toUpperCase()}</button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {[{ ar: AspectRatio.Portrait, label: 'Publicación' }, { ar: AspectRatio.Square, label: 'Cuadrado' }, { ar: AspectRatio.Landscape, label: 'Portada' }, { ar: AspectRatio.Wide, label: 'Banner' }, { ar: AspectRatio.Tall, label: 'Historia' }].map(({ ar, label }) => (
                <button key={ar} onClick={() => setEditorAspectRatio(ar)}
                  className="px-2 py-1 rounded-lg text-[9px] transition-all"
                  style={{ background: editorAspectRatio === ar ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)', border: `1px solid ${editorAspectRatio === ar ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`, color: editorAspectRatio === ar ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Free AI tool */}
          {activeTool === 'freeai' && <>
            <div>
              <div className="joi-label mb-2">Instrucción de Edición</div>
              <textarea
                rows={4}
                value={freePrompt}
                onChange={e => setFreePrompt(e.target.value)}
                placeholder="Describe cómo quieres editar esta imagen...&#10;&#10;Ejemplos:&#10;• Que parezca atardecer&#10;• Agregar lentes de sol&#10;• Cambiar cabello a rubio&#10;• Quitar objetos del fondo"
                className="w-full px-3 py-2.5 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)', backdropFilter:'blur(8px)' }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['Make cinematic','Add soft blur bg','Golden hour lighting','Change to b&w','Add film grain','Enhance details'].map(q => (
                <button key={q} onClick={() => setFreePrompt(q)}
                  className="px-2.5 py-1 rounded-lg text-[9px] transition-all"
                  style={{ background: freePrompt === q ? 'rgba(99,102,241,.08)' : 'var(--joi-bg-3)', border: `1px solid ${freePrompt === q ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.04)'}`, color: freePrompt === q ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>{q}</button>
              ))}
            </div>
          </>}

          {activeTool === 'reimagine' && <>
            {/* Search */}
            <div>
              <input value={reimagineSearch} onChange={e => setReimagineSearch(e.target.value)}
                placeholder="Buscar preset..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none"
                style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)' }} />
            </div>

            {/* Category filter */}
            {!reimagineSearch.trim() && (
            <div>
              <div className="joi-label mb-2">Categoría</div>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setReimagineCategory('all')}
                  className="px-2.5 py-1 rounded-lg text-[9px] transition-all"
                  style={{ background: reimagineCategory === 'all' ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)', border: `1px solid ${reimagineCategory === 'all' ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`, color: reimagineCategory === 'all' ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>Todos</button>
                {(Object.entries(SOUL_STYLE_CATEGORIES) as [SoulStyleCategory, { label: string; icon: string }][]).map(([key, cat]) => (
                  <button key={key} onClick={() => setReimagineCategory(key)}
                    className="px-2.5 py-1 rounded-lg text-[9px] transition-all"
                    style={{ background: reimagineCategory === key ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)', border: `1px solid ${reimagineCategory === key ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`, color: reimagineCategory === key ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>{cat.icon} {cat.label}</button>
                ))}
              </div>
            </div>
            )}

            {/* Style grid */}
            <div>
              {(() => {
                const q = reimagineSearch.trim().toLowerCase()
                const filtered = q
                  ? SOUL_STYLES.filter(s => s.name.toLowerCase().includes(q) || s.category.includes(q))
                  : SOUL_STYLES.filter(s => reimagineCategory === 'all' || s.category === reimagineCategory)
                return <>
              <div className="joi-label mb-2">{q ? `Resultados (${filtered.length})` : `Estilo (${filtered.length})`}</div>
              <div className="grid grid-cols-2 gap-1 max-h-[280px] overflow-y-auto joi-scroll">
                {filtered.map(style => (
                  <button key={style.id} onClick={() => { setReimagineStyleIds(prev => { const n = new Set(prev); n.has(style.id) ? n.delete(style.id) : n.add(style.id); return n }); setReimagineCustom('') }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all"
                    style={{
                      background: reimagineStyleIds.has(style.id) ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)',
                      border: `1px solid ${reimagineStyleIds.has(style.id) ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                      color: reimagineStyleIds.has(style.id) ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                    }}>
                    <span className="text-sm">{style.icon}</span>
                    <span className="text-[10px] truncate">{style.name}</span>
                    {style.featured && !reimagineStyleIds.has(style.id) && <span className="text-[7px] ml-auto" style={{ color: 'var(--joi-pink)' }}>★</span>}
                    {reimagineStyleIds.has(style.id) && <span className="text-[8px] ml-auto" style={{ color: 'var(--joi-pink)' }}>✓</span>}
                  </button>
                ))}
              </div>
              </>})()}
            </div>

            {/* Custom prompt */}
            <div>
            {/* Selected combination */}
            {reimagineStyleIds.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-mono" style={{ color: 'var(--joi-pink)' }}>
                  {SOUL_STYLES.filter(s => reimagineStyleIds.has(s.id)).map(s => s.name).join(' + ')}
                </span>
                <button onClick={() => setReimagineStyleIds(new Set())} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--joi-text-3)', background: 'var(--joi-bg-3)' }}>Limpiar</button>
              </div>
            )}

              <div className="joi-label mb-1.5">O describe tu dirección</div>
              <textarea rows={2} value={reimagineCustom}
                onChange={e => { setReimagineCustom(e.target.value); if (e.target.value.trim()) setReimagineStyleIds(new Set()) }}
                placeholder="Ej.: editorial de moda en París, sunset dreamy vibes..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)' }} />
            </div>
          </>}

          {activeTool === 'relight' && <>
            {/* Preset grid */}
            <div>
              <div className="joi-label mb-2">Tipo de Iluminación</div>
              <div className="grid grid-cols-2 gap-1.5">
                {relightPresets.map((p, i) => (
                  <button key={p.n} onClick={() => setSelPreset(i)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all"
                    style={{
                      background: selPreset === i ? `${p.c}12` : 'var(--joi-bg-3)',
                      border: `1px solid ${selPreset === i ? `${p.c}35` : 'rgba(255,255,255,.04)'}`,
                    }}>
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: p.c, boxShadow: `0 0 8px ${p.c}50` }} />
                    <span className="text-[10px]" style={{ color: selPreset === i ? p.c : 'var(--joi-text-2)' }}>{p.n}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Light direction */}
            <div>
              <div className="joi-label mb-2">Dirección</div>
              <div className="flex flex-wrap gap-1.5">
                {relightDirections.map(d => (
                  <button key={d.id} onClick={() => setRelightDir(d.id)}
                    className="px-3 py-1.5 rounded-lg text-[10px] transition-all"
                    style={{
                      background: relightDir === d.id ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)',
                      border: `1px solid ${relightDir === d.id ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                      color: relightDir === d.id ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                    }}>{d.label}</button>
                ))}
              </div>
            </div>

            {/* Intensity */}
            <div>
              <div className="joi-label mb-2">Intensidad</div>
              <div className="flex gap-1.5">
                {relightIntensities.map(i => (
                  <button key={i.id} onClick={() => setRelightIntensity(i.id)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-[10px] text-center transition-all"
                    style={{
                      background: relightIntensity === i.id ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)',
                      border: `1px solid ${relightIntensity === i.id ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                      color: relightIntensity === i.id ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                    }}>{i.label}</button>
                ))}
              </div>
            </div>
          </>}

          {activeTool === 'rotate360' && <>
            <div>
              <div className="joi-label mb-2">Ángulo de Cámara</div>
              <div className="grid grid-cols-2 gap-1.5">
                {angleViews.map((a, i) => (
                  <button key={a} onClick={() => setSel360(i)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      background: sel360 === i ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)',
                      border: `1px solid ${sel360 === i ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                      color: sel360 === i ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                    }}>
                    <span className="text-sm">{['👤','↗️','➡️','↘️','🔄','↙️','⬅️','↖️'][i]}</span>
                    <span className="text-[10px]">{a}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>
              Selecciona un ángulo y presiona Aplicar. La cámara se moverá alrededor del sujeto.
            </div>

            {/* Character Sheets */}
            <div style={{ borderTop: '1px solid var(--joi-border)', marginTop: 12, paddingTop: 12 }}>
              <div className="joi-label mb-2">Hojas de Referencia</div>
              <div className="flex flex-col gap-1.5">
                {([
                  { type: 'face' as SheetType, icon: '👤', label: 'Ángulos de Rostro', desc: '4 vistas (frente, perfil, ¾)' },
                  { type: 'body' as SheetType, icon: '🧍', label: 'Ángulos de Cuerpo', desc: '4 vistas completas' },
                  { type: 'expressions' as SheetType, icon: '😊', label: 'Expresiones', desc: '9 expresiones faciales' },
                ]).map(s => (
                  <button key={s.type} disabled={sheetGenerating !== null || !inputImage}
                    onClick={async () => {
                      if (!inputImage) return
                      const cost = CREDIT_COSTS['grok-edit']
                      const ok = await decrementCredits(cost)
                      if (!ok) { toast.error('Créditos insuficientes'); return }
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
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      background: 'var(--joi-bg-3)',
                      border: '1px solid rgba(255,255,255,.04)',
                      opacity: sheetGenerating && sheetGenerating !== s.type ? 0.4 : 1,
                    }}>
                    <span className="text-sm">{sheetGenerating === s.type ? '⏳' : s.icon}</span>
                    <div>
                      <div className="text-[10px] font-medium" style={{ color: 'var(--joi-text-1)' }}>{s.label}</div>
                      <div className="text-[8px]" style={{ color: 'var(--joi-text-3)' }}>{s.desc}</div>
                    </div>
                    <span className="ml-auto text-[9px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{CREDIT_COSTS['grok-edit']}cr</span>
                  </button>
                ))}
              </div>
              {sheetResult && (
                <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--joi-border)' }}>
                  <img src={sheetResult} className="w-full object-contain" alt="Sheet result" />
                  <div className="flex gap-2 p-2" style={{ background: 'var(--joi-bg-3)' }}>
                    <button onClick={() => { if (sheetResult) { setInputImage(sheetResult); setSheetResult(null) } }}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: 'var(--joi-pink-soft)', color: 'var(--joi-pink)', border: '1px solid var(--joi-border-h)' }}>
                      Usar como base
                    </button>
                    <a href={sheetResult} download={`sheet-${Date.now()}.png`}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-medium text-center" style={{ background: 'var(--joi-bg-2)', color: 'var(--joi-text-2)', border: '1px solid rgba(255,255,255,.04)' }}>
                      Descargar
                    </a>
                  </div>
                </div>
              )}
            </div>
          </>}

          {activeTool === 'faceswap' && <>
            <div>
              <div className="joi-label mb-2">Rostro de Origen</div>
              <div className="aspect-square rounded-xl cursor-pointer overflow-hidden transition-all"
                onClick={() => faceSwapInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) { setFaceSwapFile(f); setFaceSwapPreview(URL.createObjectURL(f)) } }}
                onDragOver={(e) => e.preventDefault()}
                style={{ background:'var(--joi-bg-3)', border: faceSwapPreview ? '1px solid rgba(99,102,241,.3)' : '1px dashed rgba(255,255,255,.08)' }}>
                {faceSwapPreview ? (
                  <div className="relative w-full h-full group">
                    <img src={faceSwapPreview} alt="Source face" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[11px] font-medium" style={{ color:'var(--joi-text-1)' }}>Cambiar Foto</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                    <span className="text-2xl">{'\uD83C\uDFAD'}</span>
                    <span className="text-[11px] font-medium" style={{ color:'var(--joi-text-1)' }}>Subir Rostro de Origen</span>
                    <span className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>Arrastra o haz clic — foto frontal clara</span>
                  </div>
                )}
              </div>
              <input ref={faceSwapInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFaceSwapFile(f); setFaceSwapPreview(URL.createObjectURL(f)) } e.target.value = '' }} />
            </div>
            {faceSwapPreview && (
              <button onClick={() => { setFaceSwapFile(null); if (faceSwapPreview) URL.revokeObjectURL(faceSwapPreview); setFaceSwapPreview(null) }}
                className="text-[10px] py-1.5 px-3 rounded-lg transition-all hover:bg-white/10"
                style={{ color:'var(--joi-text-3)', border:'1px solid rgba(255,255,255,.06)' }}>
                Quitar rostro de origen
              </button>
            )}
            <div className="text-[9px] mt-1" style={{ color:'var(--joi-text-3)' }}>
              Sube una foto del rostro y presiona Aplicar. El rostro de origen se colocará sobre la imagen base.
            </div>
          </>}

          {activeTool === 'tryon' && <>
            <div>
              <div className="joi-label mb-2">Referencia de Outfit</div>
              <div className="aspect-square rounded-xl cursor-pointer overflow-hidden transition-all"
                onClick={() => garmentInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) { setGarmentFile(f); setGarmentPreview(URL.createObjectURL(f)) } }}
                onDragOver={(e) => e.preventDefault()}
                style={{ background:'var(--joi-bg-3)', border: garmentPreview ? '1px solid rgba(129,140,248,.3)' : '1px dashed rgba(255,255,255,.08)' }}>
                {garmentPreview ? (
                  <div className="relative w-full h-full group">
                    <img src={garmentPreview} alt="Outfit" className="w-full h-full object-contain p-1" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[11px] font-medium" style={{ color:'var(--joi-text-1)' }}>Cambiar Foto</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                    <span className="text-2xl">{'\uD83D\uDC57'}</span>
                    <span className="text-[11px] font-medium" style={{ color:'var(--joi-text-1)' }}>Subir Outfit</span>
                    <span className="text-[9px] text-center" style={{ color:'var(--joi-text-3)' }}>Persona con outfit o solo la prenda</span>
                  </div>
                )}
              </div>
              <input ref={garmentInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setGarmentFile(f); setGarmentPreview(URL.createObjectURL(f)) } e.target.value = '' }} />
            </div>
            {garmentPreview && (
              <button onClick={() => { setGarmentFile(null); if (garmentPreview) URL.revokeObjectURL(garmentPreview); setGarmentPreview(null) }}
                className="text-[10px] py-1.5 px-3 rounded-lg transition-all hover:bg-white/10"
                style={{ color:'var(--joi-text-3)', border:'1px solid rgba(255,255,255,.06)' }}>
                Quitar outfit
              </button>
            )}
            <div className="text-[9px] mt-1" style={{ color:'var(--joi-text-3)' }}>
              Sube una foto de referencia del outfit y presiona Aplicar. La AI vestirá a tu personaje con esa ropa.
            </div>
          </>}

          {activeTool === 'composite' && <>
            <div className="joi-label mb-2">Origen de Escena</div>
            <div className="flex gap-1 p-0.5 rounded-xl mb-3" style={{ background:'var(--joi-bg-3)' }}>
              {(['upload','gallery','prompt'] as const).map(m=>(
                <button key={m} onClick={() => setSceneSource(m)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium capitalize"
                  style={{ background: sceneSource === m ? 'var(--joi-bg-2)' : 'transparent', color: sceneSource === m ? 'var(--joi-text-1)' : 'var(--joi-text-3)' }}>{m === 'upload' ? 'Subir' : m === 'gallery' ? 'Galería' : 'Describir'}</button>
              ))}
            </div>

            {sceneSource === 'upload' && (
              sceneImage ? (
                <div className="aspect-[4/3] rounded-xl relative overflow-hidden"
                  style={{ background:'var(--joi-bg-3)', border:'1px dashed rgba(99,102,241,.3)' }}>
                  <img src={sceneImage} className="w-full h-full object-cover rounded-xl" alt="Scene" />
                  <button onClick={() => { setSceneImage(null); setSceneFile(null) }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] z-20"
                    style={{ background:'rgba(0,0,0,.7)', color:'var(--joi-text-1)' }}>{'\u2715'}</button>
                  <div className="absolute bottom-1.5 right-1.5 px-2 py-1 rounded-lg text-[9px] cursor-pointer z-20"
                    style={{ background:'rgba(0,0,0,.7)', color:'var(--joi-text-1)' }}
                    onClick={() => sceneInputRef.current?.click()}>
                    Cambiar
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[4/3] rounded-xl cursor-pointer transition-all overflow-hidden"
                  style={{ background:'var(--joi-bg-3)', border:'1px dashed rgba(255,255,255,.04)' }}
                  onClick={() => sceneInputRef.current?.click()}>
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <span className="text-xl mb-1" style={{ color:'var(--joi-pink)' }}>{'\uD83C\uDFAC'}</span>
                    <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>Subir imagen de escena</span>
                    <span className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>o arrastra aquí</span>
                  </div>
                </div>
              )
            )}

            {sceneSource === 'gallery' && (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto joi-scroll">
                  {galleryItems.slice(0, 12).map(item => (
                    <button key={item.id} onClick={async () => {
                      setSceneImage(item.url)
                      try {
                        const file = await urlToFile(item.url, 'scene-gallery.png')
                        setSceneFile(file)
                      } catch { setSceneFile(null) }
                    }}
                      className="aspect-square rounded-lg overflow-hidden transition-all"
                      style={{ border: `2px solid ${sceneImage === item.url ? 'var(--joi-pink)' : 'transparent'}`, opacity: sceneImage === item.url ? 1 : 0.7 }}>
                      <img src={item.url} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
                {sceneImage && sceneSource === 'gallery' && (
                  <div className="mt-2 rounded-lg overflow-hidden" style={{ border:'1px solid rgba(99,102,241,.2)' }}>
                    <img src={sceneImage} className="w-full h-24 object-cover" alt="Selected scene" />
                  </div>
                )}
              </div>
            )}

            {sceneSource === 'prompt' && (
              <textarea
                rows={4}
                value={scenePrompt}
                onChange={e => setScenePrompt(e.target.value)}
                placeholder="Describe la escena donde quieres colocar al personaje...&#10;&#10;Ej.: Terraza con vista al mar, atardecer rosado, plantas tropicales"
                className="w-full px-3 py-2.5 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)', backdropFilter:'blur(8px)' }}
              />
            )}

            {/* Quick scene chips (visible on all modes) */}
            <div className="joi-label mt-3 mb-1.5">Escenas rápidas</div>
            <div className="flex gap-1.5 flex-wrap">
              {['Studio white background','Nature park','City street','Cozy interior','Tokyo neon streets','Café in Paris','Beach sunset','NYC rooftop','Enchanted forest','Space station'].map(q => (
                <button key={q} onClick={() => { setSceneSource('prompt'); setScenePrompt(q) }}
                  className="px-2.5 py-1 rounded-lg text-[9px] transition-all"
                  style={{ background: scenePrompt === q ? 'rgba(99,102,241,.08)' : 'var(--joi-bg-3)', border: `1px solid ${scenePrompt === q ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.04)'}`, color: scenePrompt === q ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>{q}</button>
              ))}
            </div>

            {/* Optional extra prompt when using upload/gallery */}
            {sceneSource !== 'prompt' && sceneImage && (
              <div className="mt-3">
                <div className="joi-label mb-1.5">Instrucciones adicionales (opcional)</div>
                <textarea
                  rows={2}
                  value={scenePrompt}
                  onChange={e => setScenePrompt(e.target.value)}
                  placeholder="Ej.: Que parezca hora dorada, agregar lluvia..."
                  className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none"
                  style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)', backdropFilter:'blur(8px)' }}
                />
              </div>
            )}

            {/* Characters as scene source */}
            {characters.length > 0 && (
              <div className="mt-3">
                <div className="joi-label mb-1.5">O usa la escena de un personaje</div>
                <div className="flex gap-1.5 flex-wrap">
                  {characters.map(ch => ch.thumbnail && (
                    <button key={ch.id} onClick={async () => {
                      setSceneImage(ch.thumbnail!)
                      try {
                        const file = await urlToFile(ch.thumbnail!, `scene-${ch.name}.png`)
                        setSceneFile(file)
                      } catch { setSceneFile(null) }
                    }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] transition-all"
                      style={{ background: sceneImage === ch.thumbnail ? 'rgba(99,102,241,.08)' : 'var(--joi-bg-3)', border: `1px solid ${sceneImage === ch.thumbnail ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.04)'}`, color: sceneImage === ch.thumbnail ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>
                      <img src={ch.thumbnail} className="w-5 h-5 rounded-full object-cover" alt="" />
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>}

          {activeTool === 'realskin' && <>
            <div className="joi-label mb-3">Nivel de Realismo</div>
            {/* Presets */}
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {([
                { id:'soft',      label:'Suave',    desc:'Piel lisa, sin imperfecciones' },
                { id:'natural',   label:'Natural',  desc:'Poros sutiles, textura leve' },
                { id:'realistic', label:'Realista', desc:'Poros visibles, imperfecciones' },
                { id:'ultra',     label:'Ultra HD', desc:'Máximo detalle, venas, SSS' },
              ] as const).map(p => (
                <button key={p.id} onClick={() => setSkinPreset(p.id)}
                  className="text-left px-2.5 py-2 rounded-lg transition-colors"
                  style={{
                    background: skinPreset === p.id ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)',
                    border: `1px solid ${skinPreset === p.id ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                  }}>
                  <div className="text-[11px] font-medium mb-0.5" style={{ color: skinPreset === p.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{p.label}</div>
                  <div className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>{p.desc}</div>
                </button>
              ))}
            </div>
            {/* Custom preset button */}
            <button onClick={() => setSkinPreset('custom')}
              className="w-full py-2 rounded-lg text-[11px] mb-3 transition-colors"
              style={{
                background: skinPreset === 'custom' ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)',
                border: `1px solid ${skinPreset === 'custom' ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                color: skinPreset === 'custom' ? 'var(--joi-pink)' : 'var(--joi-text-2)',
              }}>
              Personalizado
            </button>
            {/* Custom sliders */}
            {skinPreset === 'custom' && (
              <div className="space-y-2.5 mb-3 p-2.5 rounded-lg" style={{ background:'var(--joi-bg-2)', border:'1px solid rgba(255,255,255,.04)' }}>
                {([
                  { key:'pores',         label:'Poros' },
                  { key:'veins',         label:'Venas' },
                  { key:'tension',       label:'Textura / Tensión' },
                  { key:'imperfections', label:'Imperfecciones' },
                  { key:'sss',           label:'Sub-superficial (SSS)' },
                  { key:'hydration',     label:'Hidratación' },
                ] as const).map(s => (
                  <div key={s.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>{s.label}</span>
                      <span className="text-[10px] font-mono" style={{ color:'var(--joi-text-3)' }}>{skinSliders[s.key]}</span>
                    </div>
                    <input type="range" min={0} max={100} value={skinSliders[s.key]}
                      onChange={e => setSkinSliders(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                      className="w-full slider-t" />
                  </div>
                ))}
              </div>
            )}
            <p className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>
              No altera el rostro, rasgos, expresión ni fondo
            </p>
          </>}

          {activeTool === 'enhance' && <>
            <div className="space-y-3">
              <div className="joi-label">Mejoras</div>
              {['Resolución (mejorar)','Nitidez','Reducción de Ruido','Detalle Facial','Detalle de Cabello','Detalle de Piel','Corrección de Color'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-32 shrink-0" style={{ color:'var(--joi-text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
            <div className="mt-3 joi-label">Mejorar Resolución</div>
            <div className="flex gap-2 mt-1.5">
              {['2x','4x','8x'].map(x=>(
                <button key={x} className="flex-1 py-2 rounded-lg text-sm font-mono font-bold"
                  style={{ background:'var(--joi-bg-3)', border:'1px solid rgba(255,255,255,.04)', color:'var(--joi-text-2)' }}>{x}</button>
              ))}
            </div>
          </>}

          {activeTool === 'style' && <>
            <div className="joi-label mb-2">Estilo Artístico</div>
            <div className="grid grid-cols-2 gap-1.5">
              {styleTransfers.map((s,i)=>(
                <button key={s.name} onClick={() => setSelStyle(i)}
                  className="px-3 py-2.5 rounded-lg text-[10px] text-left transition-all"
                  style={{
                    background: selStyle === i ? 'var(--joi-pink-soft)' : 'var(--joi-bg-3)',
                    border: `1px solid ${selStyle === i ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                    color: selStyle === i ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                  }}>{s.name}</button>
              ))}
            </div>
            <div className="text-[9px] mt-2" style={{ color:'var(--joi-text-3)' }}>
              Transforma la imagen completa al estilo seleccionado manteniendo la identidad del rostro.
            </div>
          </>}

          {activeTool === 'inpaint' && <>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="text-3xl">🖌️</span>
              <div>
                <div className="text-[12px] font-medium" style={{ color: 'var(--joi-text-1)' }}>Edición por Zonas</div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--joi-text-3)' }}>
                  Pinta sobre la zona que quieres cambiar y describe qué quieres generar ahí.
                </div>
              </div>
              <div className="text-[9px] px-3 py-2 rounded-lg" style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-2)', border: '1px solid rgba(255,255,255,.04)' }}>
                Presiona <strong>Aplicar</strong> para abrir el editor de pintura
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <div className="joi-label">Motor</div>
              <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
                Z-Image Turbo (rápido) — se configura en el editor
              </div>
            </div>
          </>}

          {activeTool === 'rembg' && <>
            <div className="joi-label mb-2">Quitar Fondo</div>
            <p className="text-[10px] mb-3" style={{ color:'var(--joi-text-3)', lineHeight: 1.5 }}>
              Elimina el fondo de cualquier imagen al instante, dejando solo el sujeto sobre un lienzo transparente.
              Perfecto para fotos de producto, fotos de perfil o composiciones.
            </p>
            <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(80,216,160,.06)', border: '1px solid rgba(80,216,160,.12)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{'\u2702\uFE0F'}</span>
                <span className="text-[11px] font-medium" style={{ color: '#50d8a0' }}>Eliminación con un clic</span>
              </div>
              <p className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>
                Sin parámetros necesarios — presiona Aplicar para procesar. El resultado tendrá fondo transparente (PNG).
              </p>
            </div>
          </>}

          {activeTool === 'expand' && <>
            <div className="space-y-4">
              <div>
                <div className="joi-label mb-2">Dirección</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {['up', 'down', 'left', 'right', 'all'].map(dir => (
                    <button
                      key={dir}
                      onClick={() => setExpandDirection(dir)}
                      className="px-3 py-2.5 rounded-lg text-[11px] font-medium capitalize transition-all text-center"
                      style={{
                        background: expandDirection === dir ? 'rgba(129,140,248,0.15)' : 'var(--joi-bg-3)',
                        border: `1px solid ${expandDirection === dir ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,.04)'}`,
                        color: expandDirection === dir ? '#818CF8' : 'var(--joi-text-2)',
                        boxShadow: expandDirection === dir ? '0 0 12px rgba(129,140,248,.1)' : 'none',
                      }}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="joi-label mb-2">
                  Pixels: <span className="font-mono" style={{ color: '#818CF8' }}>{expandPixels}px</span>
                </div>
                <input
                  type="range"
                  min={128}
                  max={512}
                  step={64}
                  value={expandPixels}
                  onChange={(e) => setExpandPixels(Number(e.target.value))}
                  className="w-full slider-t"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono" style={{ color: 'var(--joi-text-3)' }}>128px</span>
                  <span className="text-[9px] font-mono" style={{ color: 'var(--joi-text-3)' }}>512px</span>
                </div>
              </div>

              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--joi-text-3)' }}>
                Expande el lienzo de la imagen más allá de sus bordes usando AI outpainting.
                El área nueva se genera para que coincida con el contenido existente de forma natural.
              </p>
            </div>
          </>}
        </div>

        <div className="px-4 py-3 pb-20 lg:pb-3 shrink-0" style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <button onClick={handleApply} disabled={processing || !inputImage}
            className={`joi-btn-solid w-full py-2.5 text-sm ${!processing && inputImage ? 'joi-breathe' : ''}`}
            style={{ opacity: (!inputImage || processing) ? 0.5 : 1 }}>
            {processing ? `\u27F3 Procesando... ${Math.round(progress)}%` : `\u2726 Aplicar ${tools.find(t=>t.id===activeTool)?.label} (${displayCost}cr)`}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col joi-mesh">
        <div className="h-11 flex items-center px-4 gap-1.5 shrink-0" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-1)' }}>
          {inputImage && resultImage && (
            <button title="Comparar antes y después" onClick={() => setCompareMode(!compareMode)}
              className="px-3 py-1.5 rounded-lg text-[11px] transition-colors"
              style={{ color: compareMode ? 'var(--accent)' : 'var(--text-2)', background: compareMode ? 'rgba(0,0,0,.05)' : 'transparent', border: compareMode ? '1px solid var(--border)' : '1px solid transparent' }}>Antes/Después</button>
          )}
          <div className="flex-1" />
          {inputImage && <span className="text-[10px]" style={{ color:'var(--text-3)' }}>Clic en imagen para ver en grande</span>}
        </div>

        <div ref={canvasContainerRef} className="flex-1 flex items-center justify-center p-6 gap-6"
        >
          {!inputImage ? (
            /* ── Empty canvas: tool showcase ── */
            <div className="max-w-[640px] w-full text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.1)' }}>
                <span className="text-2xl" style={{ color:'var(--joi-pink)', opacity: 0.6 }}>{'\u2191'}</span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color:'var(--joi-text-1)' }}>Sube una imagen para empezar a editar</p>
              <p className="text-[11px] mb-6" style={{ color:'var(--joi-text-3)' }}>O selecciona desde tu galería o personajes</p>

              <div className="joi-label mb-3" style={{ textAlign: 'left' }}>Lo que puedes hacer</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { tool: 'relight', icon: '\uD83D\uDCA1', label: 'Reiluminar', desc: 'Cambia dirección, color y atmósfera de la luz' },
                  { tool: 'faceswap', icon: '\uD83C\uDFAD', label: 'Cambio de Rostro', desc: 'Intercambia rostros entre dos imágenes' },
                  { tool: 'freeai', icon: '\u2728', label: 'AI Edit', desc: 'Describe cualquier edición en lenguaje natural' },
                ].map(ex => (
                  <button key={ex.tool} onClick={() => setActiveTool(ex.tool)}
                    className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] joi-glass joi-border-glow"
                    style={{ border: '1px solid rgba(255,255,255,.04)' }}>
                    <span className="text-lg block mb-1.5">{ex.icon}</span>
                    <div className="text-[12px] font-medium mb-0.5" style={{ color: 'var(--joi-text-1)' }}>{ex.label}</div>
                    <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>{ex.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
          /* ── Normal before/after canvas ── */
          compareMode && resultImage ? (
          /* ── Side-by-side compare mode ── */
          <div className="flex gap-1 rounded-xl overflow-hidden" style={{ border:'1px solid var(--border)' }}>
            <div className="relative cursor-pointer" onClick={() => setEditorLightbox(inputImage)}>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono z-10" style={{ background:'rgba(0,0,0,.6)', color:'white' }}>ANTES</div>
              <img src={inputImage} className="max-h-[65vh] max-w-[45vw] object-contain select-none" draggable={false} alt="Before" />
            </div>
            <div className="w-px shrink-0" style={{ background:'var(--accent)' }} />
            <div className="relative cursor-pointer" onClick={() => setEditorLightbox(resultImage)}>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono z-10" style={{ background:'var(--accent)', color:'white' }}>DESPUÉS</div>
              <img src={resultImage} className="max-h-[65vh] max-w-[45vw] object-contain select-none" draggable={false} alt="After" />
            </div>
          </div>
          ) : (
          <>
          <div className="text-center">
            <div className="joi-label mb-2">Original</div>
            <div className="w-[min(420px,_45vw)] h-[min(520px,_65vh)] rounded-xl flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => setEditorLightbox(inputImage)}
              style={{ background: 'var(--bg-0)', border:'1px solid var(--border)' }}>
              <img src={inputImage} className="w-full h-full object-contain rounded-xl select-none" draggable={false} alt="Original" />
            </div>
          </div>

          <div className="text-2xl" style={{ color:'var(--accent)' }}>{'\u2192'}</div>

          <div className="text-center">
            <div className="joi-label mb-2" style={{ color:'var(--accent)' }}>Resultado AI</div>
            <div className="w-[min(420px,_45vw)] h-[min(520px,_65vh)] rounded-xl flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => resultImage && setEditorLightbox(resultImage)}
              style={{ background: 'var(--bg-0)', border:'1px solid var(--border)' }}>
              {resultImage ? (
                <img src={resultImage} className="w-full h-full object-contain rounded-xl select-none" draggable={false} alt="Result" />
              ) : (
                <div className="text-center">
                  <span className="text-2xl block mb-2">{'\u2726'}</span>
                  <span className="text-[11px]" style={{ color:'var(--text-3)' }}>El resultado aparecerá aquí</span>
                </div>
              )}
            </div>
            {resultImage && (
              <button onClick={() => { setInputImage(resultImage); setResultImage(null); setInputFile(null); toast.success('Resultado cargado como nueva base') }}
                className="mt-2 px-4 py-2 rounded-lg text-[11px] font-medium transition-all"
                style={{ background: 'rgba(0,0,0,.04)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                Seguir editando este resultado →
              </button>
            )}
          </div>
          </>
          )
          )}
        </div>

        {(editHistory.length > 0 || resultImage) && <div className="h-20 flex items-center px-5 gap-2 shrink-0" style={{ borderTop:'1px solid rgba(255,255,255,.04)', background:'var(--joi-bg-glass)' }}>
          <span className="text-[9px] font-mono shrink-0 mr-1" style={{ color:'var(--joi-text-3)' }}>HISTORIAL</span>
          {editHistory.slice(0, 10).map((url, i) => (
            <div key={i} onClick={() => { setResultImage(url) }}
              onDoubleClick={() => { setInputImage(url); setResultImage(null); setInputFile(null); toast.success('Cargado como nueva base') }}
              className="w-12 h-12 rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
              title="Clic: ver · Doble clic: usar como base"
              style={{ border: resultImage === url ? '2px solid var(--joi-pink)' : '1px solid rgba(255,255,255,.04)' }}>
              <img src={url} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
          {resultImage && onNav && (
            <div className="ml-auto shrink-0 w-56">
              <PipelineCTA label="Iniciar Sesión de Fotos" targetPage="studio" onNav={onNav} icon="📸" />
            </div>
          )}
        </div>}
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        {activeModal === 'relight' && inputImage && (
          <RelightModal
            targetItem={{ id: 'editor-input', url: inputImage, type: 'edit' }}
            onClose={() => setActiveModal(null)}
            onSave={handleModalSave('relight', 'relight')}
          />
        )}
        {/* Face swap and try-on now work inline — no modals needed */}
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
          <button onClick={() => setEditorLightbox(null)} style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>✕</button>
          <img src={editorLightbox} onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  )
}

export default AIEditor
