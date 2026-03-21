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
import { ENGINE_METADATA, FEATURE_ENGINES, AIProvider, AspectRatio } from '../types'
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
  { id:'reimagine', label:'Reimaginar', icon:'\u2726', desc:'Reimagina con Soul 2.0 — variaciones de calidad editorial' },
  { id:'relight', label:'Reiluminar', icon:'\uD83D\uDCA1', desc:'Cambia la iluminación de cualquier foto' },
  { id:'faceswap', label:'Cambio de Rostro', icon:'\uD83C\uDFAD', desc:'Intercambia rostros entre imágenes' },
  { id:'tryon', label:'Try-On Virtual', icon:'\uD83D\uDC57', desc:'Prueba ropa y accesorios' },
  { id:'bgswap', label:'Fondo', icon:'\uD83D\uDDBC\uFE0F', desc:'Cambia o genera fondos' },
  { id:'realskin', label:'Piel Realista', icon:'\uD83E\uDDF4', desc:'Agrega poros naturales, textura e imperfecciones' },
  // Secondary tools (behind "More" toggle)
  { id:'rotate360', label:'Ángulos 360\u00b0', icon:'\uD83D\uDD04', desc:'Genera vistas desde todos los ángulos' },
  { id:'composite', label:'Escena', icon:'\uD83C\uDFAC', desc:'Coloca al personaje en cualquier escena' },
  { id:'enhance', label:'Mejorar', icon:'\u2728', desc:'Mejora la calidad y los detalles' },
  { id:'style', label:'Transferencia de Estilo', icon:'\uD83C\uDFA8', desc:'Aplica estilos artísticos' },
  { id:'inpaint', label:'Inpaint', icon:'\uD83D\uDD8C\uFE0F', desc:'Edita áreas específicas' },
  { id:'rembg', label:'Quitar Fondo', icon:'\u2702\uFE0F', desc:'Elimina el fondo al instante' },
  { id:'expand', label:'Expandir', icon:'\u2194\uFE0F', desc:'Expande la imagen más allá de sus bordes' },
]

// Relight presets — each has a light position on the sphere (azimuth/elevation in degrees) + color
const relightPresets = [
  { n:'Golden Hour',  c:'#f0b860', az: -60, el: 15,  prompt:'golden hour at 15 minutes before sunset, warm 3200K color temperature, long shadows at 15° elevation, Fresnel rim highlights on hair and shoulders, atmospheric haze diffusion, warm fill from ground bounce' },
  { n:'Blue Hour',    c:'#6ba3d9', az: 0,   el: 30,  prompt:'civil twilight blue hour, cool 7500K ambient, no direct sun, diffused omnidirectional quality, deep blue sky reflecting on upward surfaces, warm artificial lights becoming prominent, contemplative mood' },
  { n:'Studio',       c:'#e8e4dc', az: 0,   el: 45,  prompt:'professional beauty dish key light 45° camera-left, V-flat fill, 5500K neutral, hair light from above-behind with 10° grid, 3:1 ratio, catchlights at 10 o\'clock position' },
  { n:'Neon Coral',   c:'#e8725c', az: 90,  el: 0,   prompt:'neon sign illumination in warm coral, hard colored light from right creating vivid color cast on skin, deep complementary teal shadows, wet surface reflections, urban night atmosphere' },
  { n:'Dramatic',     c:'#d4603e', az: -45, el: 60,  prompt:'single hard key at 60° camera-left, Chiaroscuro lighting, 8:1 contrast ratio, minimal fill allowing true black shadows, Rembrandt triangle on shadow cheek, theatrical intensity' },
  { n:'Moonlight',    c:'#9a90c4', az: 30,  el: 70,  prompt:'full moonlight at 4100K with blue-silver cast, very soft diffused quality, low intensity, gentle shadows with no hard edges, nocturnal atmosphere, cool silver tone on all surfaces' },
  { n:'Sunset',       c:'#d9826a', az: -90, el: 10,  prompt:'late sunset warm amber-gold directional light at 10° elevation, extreme warm 2800K, long dramatic shadows, golden halo rim on hair, sky gradient peach to violet, nostalgic warmth' },
  { n:'Cool White',   c:'#b8c9d9', az: 0,   el: 50,  prompt:'overcast daylight at 6500K, perfectly diffused shadowless illumination, neutral color rendering, even exposure across subject, clinical clean quality, fashion lookbook lighting' },
  { n:'Ring Light',   c:'#f0e8e0', az: 0,   el: 0,   prompt:'LED ring light on camera axis creating circular catchlights in both eyes, flat front-fill with minimal shadow, beauty-influencer aesthetic, even face illumination, warm 4500K' },
  { n:'Rembrandt',    c:'#c8a060', az: -40, el: 35,  prompt:'classic Rembrandt pattern, key 45° high creating illuminated triangle on shadow-side cheek below eye, nose shadow connecting to cheek shadow, painterly classical quality, 4:1 ratio' },
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
    return editImageWithGrokFal(file, instruction, onProgress, abortSignal, refs)
  }

  // Pruna P-Image-Edit (fast, no safety filter)
  if (engineKey === 'replicate:pruna') {
    return editWithPruna(file, instruction, onProgress, abortSignal).then(r => [r])
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
  const [relightAz, setRelightAz] = useState(relightPresets[0].az)
  const [relightEl, setRelightEl] = useState(relightPresets[0].el)
  const relightSphereRef = useRef<HTMLDivElement>(null)
  const relightDragRef = useRef(false)
  const [sel360, setSel360] = useState(0)
  const [selStyle, setSelStyle] = useState(0)
  const [selBg, setSelBg] = useState(0)
  const [bgMode, setBgMode] = useState<'Preset'|'Upload'|'Prompt'>('Preset')
  const [freePrompt, setFreePrompt] = useState('')
  const [reimaginePrompt, setReimaginePrompt] = useState('')

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

  const { decrementCredits, restoreCredits } = useProfile()

  // Visible cost for the Apply button (shared with handleApply logic)
  const displayCost = useMemo(() => {
    if (activeTool === 'reimagine') return 14 // Soul 2.0 fixed cost
    const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
    if (eng) return eng.creditCost
    return activeTool === 'rotate360' || activeTool === 'composite' ? 10 : 8
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

  // Consume pending navigation (e.g. from Gallery → Editor)
  useEffect(() => {
    if (pendingTarget === 'editor' && pendingImage) {
      setInputImage(pendingImage)
      setResultImage(null)
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

  useEffect(() => {
    if (pipelineHeroUrl && !inputImage && !pendingImage) {
      setInputImage(pipelineHeroUrl)
      setResultImage(null)
      urlToFile(pipelineHeroUrl, 'pipeline-hero.png')
        .then(file => setInputFile(file))
        .catch(() => setInputFile(null))
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
    if (activeTool === 'reimagine' && !reimaginePrompt.trim()) {
      toast.error('Describe cómo reimaginar esta imagen')
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
      toast.error('Sube una imagen primero')
      return
    }

    // For tools without modals, process directly
    setProcessing(true)
    setProgress(0)

    // Resolve engine and cost — use engine's credit cost when a specific engine is selected
    const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
    const baseCost = activeTool === 'reimagine' ? 14 : activeTool === 'rotate360' ? 10 : activeTool === 'composite' ? 10 : 8
    const cost = activeTool === 'reimagine' ? 14 : eng ? eng.creditCost : baseCost
    const ok = await decrementCredits(cost)
    if (!ok) { toast.error('Créditos insuficientes'); setProcessing(false); return }

    // Resolve engine label for gallery
    const engineLabel = eng?.userFriendlyName || (selectedEngine === 'auto' ? 'Auto' : selectedEngine)

    try {
      let resultUrls: string[] = []

      if (activeTool === 'freeai') {
        resultUrls = await routeEdit(selectedEngine, inputFile, freePrompt.trim(), (p) => setProgress(p))
      } else if (activeTool === 'relight') {
        const preset = relightPresets[selPreset]
        const dirHint = `Light source at azimuth ${relightAz}° (${relightAz < -45 ? 'left' : relightAz > 45 ? 'right' : 'front'}), elevation ${relightEl}° (${relightEl > 50 ? 'above' : relightEl < -10 ? 'below' : 'eye-level'}).`
        const instruction = `Change the lighting to: ${preset.prompt}. ${dirHint} Only modify lighting, shadows, and color temperature.`
        resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p))
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
        const instruction = `Create a new photograph of this person as seen from a ${view.toLowerCase()} camera angle. The camera has physically moved around the subject. Keep the exact same person, clothing, hairstyle, and body proportions. The environment is the same location but viewed from a different position: ${envHint}. Do NOT paste the same background — render it from the new camera perspective.`
        resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p))
      } else if (activeTool === 'bgswap') {
        const bgName = bgPresets[selBg]
        const instruction = `Remove the background and replace it with a ${bgName.toLowerCase()} background. Match the lighting direction and color temperature of the new background to the subject's existing lighting so the composition looks natural and seamless`
        resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p))
      } else if (activeTool === 'composite') {
        let compositeInstruction: string
        if (sceneImage && scenePrompt.trim()) {
          compositeInstruction = `Place this person into the scene shown in the reference image. Additional instructions: ${scenePrompt.trim()}. Keep the person's face, body, outfit, and pose identical. Match the scene's lighting direction, color temperature, and shadow angles onto the person. Adjust color grading so the person looks naturally photographed in that location.`
        } else if (sceneImage) {
          compositeInstruction = `Place this person into the exact scene/location shown in the reference image. Keep the person's face, body, outfit, and pose identical. Match the scene's lighting direction, color temperature, and shadow angles onto the person. Adjust color grading so the person looks naturally photographed in that location.`
        } else {
          compositeInstruction = `Place this person into the following scene: ${scenePrompt.trim()}. Keep the person's face, body, outfit, and pose identical. Create lighting, shadows, and color grading consistent with the described scene so the person looks naturally photographed there.`
        }
        resultUrls = await routeEdit(selectedEngine, inputFile, compositeInstruction, (p) => setProgress(p), undefined, sceneFile)
      } else if (activeTool === 'style') {
        const style = styleTransfers[selStyle]
        const instruction = `STYLE TRANSFER (overrides preservation rule): Transform the entire image into ${style.name} style. ${style.prompt}. The person's face must remain recognizable (same identity, pose, expression) but the visual rendering of EVERYTHING should change to match this aesthetic. Apply strongly and consistently.`
        resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p))
      } else if (activeTool === 'realskin') {
        const instruction = 'Add realistic skin detail: visible pores, micro-imperfections, natural skin shine, and subtle subsurface scattering. Do not alter the face shape, features, expression, hair, outfit, pose, or background. The goal is photorealistic skin texture, not beauty retouching.'
        resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p))
      } else if (activeTool === 'faceswap' && faceSwapFile) {
        if (selectedEngine === 'gemini:nb2' || selectedEngine === 'auto') {
          const dataUrl = await faceSwapWithGemini(inputFile, faceSwapFile, (p) => setProgress(p))
          resultUrls = [dataUrl]
        } else {
          const instruction = `Swap the face: replace the face of the person in the first image with the face from the second image. Keep the original person's hair, body, pose, clothing, and background exactly the same. Only change the facial features to match the reference face.`
          resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p), undefined, faceSwapFile)
        }
      } else if (activeTool === 'tryon' && garmentFile) {
        const instruction = `Dress this person in the EXACT outfit shown in the reference image. Reproduce every detail of the clothing: fabric, pattern, color, fit, accessories. Keep the person's face, hairstyle, body proportions, pose, and background completely unchanged. Only replace their clothing with what is shown in the reference.`
        resultUrls = await routeEdit(selectedEngine, inputFile, instruction, (p) => setProgress(p), undefined, garmentFile)
      } else if (activeTool === 'expand') {
        const { expandWithBria } = await import('../services/replicateService')
        const expandedUrl = await expandWithBria(inputImage, expandDirection as 'up' | 'down' | 'left' | 'right' | 'all', expandPixels, (p: number) => setProgress(p))
        resultUrls = [expandedUrl]
      } else if (activeTool === 'rembg') {
        const bgRemovedUrl = await removeBackground(inputImage, (p) => setProgress(p))
        resultUrls = [bgRemovedUrl]
      } else if (activeTool === 'reimagine') {
        const soulResults = await editWithSoulReference(
          inputFile!,
          reimaginePrompt.trim(),
          AspectRatio.Square,
          (p) => setProgress(p),
        )
        resultUrls = soulResults
      }

      if (resultUrls.length > 0) {
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
    <div className="h-full flex" style={{ background: 'var(--joi-bg-0)' }}>
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
      <div className="w-[70px] shrink-0 flex flex-col items-center py-4 gap-1" style={{ background:'var(--joi-bg-1)', borderRight:'1px solid rgba(255,255,255,.04)' }}>
        {(showAllTools ? tools : tools.slice(0, 6)).map(t => (
          <button key={t.id} onClick={()=>setActiveTool(t.id)}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all group relative joi-border-glow`}
            style={{
              background: activeTool===t.id ? 'rgba(255,107,157,.08)' : 'transparent',
              border: `1px solid ${activeTool===t.id ? 'rgba(255,107,157,.2)' : 'transparent'}`,
            }}>
            <span className="text-base">{t.icon}</span>
            <span className="text-[7px] mt-0.5 font-medium" style={{ color: activeTool===t.id ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>
              {t.label.split(' ')[0]}
            </span>
            <div className="absolute left-full ml-2 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ background:'var(--joi-bg-3)', color:'var(--joi-text-1)', border:'1px solid rgba(255,255,255,.04)', backdropFilter:'blur(12px)' }}>
              {t.desc}
            </div>
          </button>
        ))}
        <button onClick={() => { setShowAllTools(v => { const next = !v; try { localStorage.setItem('vist-editor-all-tools', String(next)) } catch {} return next }) }}
          className="w-12 h-8 rounded-xl flex items-center justify-center transition-all mt-1"
          style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--joi-text-3)' }}
          title={showAllTools ? 'Mostrar menos herramientas' : 'Mostrar más herramientas'}>
          <span className="text-[9px] font-medium">{showAllTools ? '▲ Menos' : '▼ Más'}</span>
        </button>
        <div className="w-10 h-px my-1" style={{ background: 'rgba(255,255,255,.06)' }} />
        <button onClick={() => inputImage && setShowBasicEditor(true)}
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all group relative"
          style={{
            background: showBasicEditor ? 'rgba(167,139,250,.08)' : 'transparent',
            border: `1px solid ${showBasicEditor ? 'rgba(167,139,250,.2)' : 'transparent'}`,
            opacity: inputImage ? 1 : 0.3,
          }}
          title="Editor Básico — recorte, filtros, ajustes (sin AI)">
          <span className="text-base">{'\u270F\uFE0F'}</span>
          <span className="text-[7px] mt-0.5 font-medium" style={{ color: showBasicEditor ? 'var(--joi-violet)' : 'var(--joi-text-3)' }}>
            Básico
          </span>
        </button>
      </div>

      {/* Tool Panel */}
      <div className="w-[300px] shrink-0 flex flex-col joi-scroll" style={{ background:'var(--joi-bg-1)', borderRight:'1px solid rgba(255,255,255,.04)', backdropFilter:'blur(16px)' }}>
        <div className="px-4 h-14 flex items-center shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
          <h2 className="text-sm font-bold" style={{ color:'var(--joi-text-1)' }}>
            {tools.find(t=>t.id===activeTool)?.icon} {tools.find(t=>t.id===activeTool)?.label}
          </h2>
          <div className="ml-auto relative">
            {(() => {
              if (activeTool === 'reimagine') return null // Soul 2.0 fixed engine
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
                background: selectedEngine !== 'auto' ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                border: `1px solid ${selectedEngine !== 'auto' ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`,
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
                    background: 'rgba(14,12,22,.96)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,.06)',
                    boxShadow: '0 20px 60px rgba(0,0,0,.6), 0 0 40px rgba(255,107,157,.05)',
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
                            style={{ background: selectedEngine === 'auto' ? 'rgba(255,107,157,.08)' : 'transparent', border: `1px solid ${selectedEngine === 'auto' ? 'rgba(255,107,157,.2)' : 'transparent'}` }}>
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
                            style={{ background: selectedEngine === eng.key ? 'rgba(255,107,157,.08)' : 'transparent', border: `1px solid ${selectedEngine === eng.key ? 'rgba(255,107,157,.2)' : 'transparent'}` }}>
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
                          style={{ background: selectedResolution === r.id ? 'rgba(255,107,157,.08)' : 'rgba(255,255,255,.02)', border: `1px solid ${selectedResolution === r.id ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}` }}>
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

          {/* Character selector */}
          {characters.length > 0 && (
            <div>
              <div className="joi-label mb-2">O usa un personaje</div>
              <div className="flex gap-1.5 flex-wrap">
                {characters.map(ch => (
                  <button key={ch.id}
                    onClick={async () => {
                      if (ch.thumbnail) {
                        setInputImage(ch.thumbnail)
                        setResultImage(null)
                        try {
                          const file = await urlToFile(ch.thumbnail, `${ch.name}.png`)
                          setInputFile(file)
                        } catch { setInputFile(null) }
                      }
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] transition-all"
                    style={{ background: inputImage === ch.thumbnail ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)', border: `1px solid ${inputImage === ch.thumbnail ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`, color: inputImage === ch.thumbnail ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>
                    {ch.thumbnail && <img src={ch.thumbnail} className="w-5 h-5 rounded-full object-cover" alt="" />}
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                  style={{ background: freePrompt === q ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)', border: `1px solid ${freePrompt === q ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`, color: freePrompt === q ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>{q}</button>
              ))}
            </div>
          </>}

          {activeTool === 'reimagine' && <>
            <div>
              <div className="joi-label mb-2">Dirección de Reimaginación</div>
              <textarea
                rows={3}
                value={reimaginePrompt}
                onChange={e => setReimaginePrompt(e.target.value)}
                placeholder="Describe la versión reimaginada...&#10;&#10;Ej.: portada de revista editorial, playa al atardecer, retrato cyberpunk neón"
                className="w-full px-3 py-2.5 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)', backdropFilter:'blur(8px)' }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['Editorial magazine cover','Golden hour beach','Studio fashion portrait','Cyberpunk neon','Vintage film aesthetic','Luxury lifestyle'].map(q => (
                <button key={q} onClick={() => setReimaginePrompt(q)}
                  className="px-2.5 py-1 rounded-lg text-[9px] transition-all"
                  style={{ background: reimaginePrompt === q ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)', border: `1px solid ${reimaginePrompt === q ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`, color: reimaginePrompt === q ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>{q}</button>
              ))}
            </div>
            <div className="rounded-xl p-3 mt-1" style={{ background: 'rgba(255,107,157,.04)', border: '1px solid rgba(255,107,157,.1)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{'\u2726'}</span>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--joi-pink)' }}>Soul 2.0</span>
              </div>
              <p className="text-[9px] leading-relaxed" style={{ color: 'var(--joi-text-3)' }}>
                Reimaginación AI de calidad editorial. Mantiene la identidad mientras transforma el estilo, escenario y atmósfera de tu imagen con resultados de nivel profesional.
              </p>
            </div>
          </>}

          {activeTool === 'relight' && <>
            {/* Light sphere visualization — draggable */}
            <div>
              <div className="joi-label mb-3">Posición de Luz <span className="text-[9px] font-normal" style={{ color: 'var(--joi-text-3)' }}>arrastra para mover</span></div>
              <div
                ref={relightSphereRef}
                className="relative w-44 h-44 mx-auto mb-3 cursor-crosshair touch-none select-none"
                onPointerDown={(e) => {
                  relightDragRef.current = true
                  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
                  const rect = relightSphereRef.current?.getBoundingClientRect()
                  if (!rect) return
                  const nx = ((e.clientX - rect.left) / rect.width - 0.5) / 0.38
                  const ny = (0.5 - (e.clientY - rect.top) / rect.height) / 0.38
                  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
                  setRelightAz(Math.round(Math.asin(clamp(nx)) * 180 / Math.PI))
                  setRelightEl(Math.round(Math.asin(clamp(ny)) * 180 / Math.PI))
                }}
                onPointerMove={(e) => {
                  if (!relightDragRef.current) return
                  const rect = relightSphereRef.current?.getBoundingClientRect()
                  if (!rect) return
                  const nx = ((e.clientX - rect.left) / rect.width - 0.5) / 0.38
                  const ny = (0.5 - (e.clientY - rect.top) / rect.height) / 0.38
                  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
                  setRelightAz(Math.round(Math.asin(clamp(nx)) * 180 / Math.PI))
                  setRelightEl(Math.round(Math.asin(clamp(ny)) * 180 / Math.PI))
                }}
                onPointerUp={() => { relightDragRef.current = false }}
                onPointerLeave={() => { relightDragRef.current = false }}
              >
                {/* Sphere background */}
                <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                  background: 'radial-gradient(circle at 40% 35%, var(--joi-bg-3) 0%, var(--joi-bg-2) 70%, var(--joi-bg-1) 100%)',
                  border: '1px solid rgba(255,255,255,.04)',
                }} />
                {/* Cross guides */}
                <div className="absolute left-1/2 top-2 bottom-2 w-px pointer-events-none" style={{ background:'rgba(255,255,255,.04)' }} />
                <div className="absolute top-1/2 left-2 right-2 h-px pointer-events-none" style={{ background:'rgba(255,255,255,.04)' }} />
                {/* Ellipse equator */}
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[60%] rounded-[50%] pointer-events-none" style={{ border:'1px solid rgba(255,255,255,.04)' }} />

                {/* Light position dot — from custom az/el */}
                {(() => {
                  const p = relightPresets[selPreset]
                  const azRad = (relightAz * Math.PI) / 180
                  const elRad = (relightEl * Math.PI) / 180
                  const x = 50 + Math.sin(azRad) * Math.cos(elRad) * 38
                  const y = 50 - Math.sin(elRad) * 38
                  return (
                    <div className="absolute w-5 h-5 rounded-full pointer-events-none"
                      style={{
                        left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
                        background: p.c,
                        boxShadow: `0 0 20px ${p.c}80, 0 0 40px ${p.c}30`,
                        transition: relightDragRef.current ? 'none' : 'all 0.5s',
                      }} />
                  )
                })()}

                {/* Center face icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-lg opacity-30">{'\uD83D\uDDE3\uFE0F'}</span>
                </div>
              </div>
              {/* Readout */}
              <div className="flex justify-center gap-4 text-[9px] font-mono" style={{ color: 'var(--joi-text-3)' }}>
                <span>AZ <span style={{ color: 'var(--joi-text-2)' }}>{relightAz > 0 ? '+' : ''}{relightAz}°</span></span>
                <span>EL <span style={{ color: 'var(--joi-text-2)' }}>{relightEl}°</span></span>
              </div>
            </div>

            {/* Preset grid */}
            <div>
              <div className="joi-label mb-2">Presets de Iluminación</div>
              <div className="grid grid-cols-2 gap-1.5">
                {relightPresets.map((p, i) => (
                  <button key={p.n} onClick={() => { setSelPreset(i); setRelightAz(p.az); setRelightEl(p.el) }}
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
          </>}

          {activeTool === 'rotate360' && <>
            <div>
              <div className="joi-label mb-3">Ángulo de Cámara</div>
              {/* Top-down orbit visualization */}
              <div className="relative w-44 h-44 mx-auto mb-3">
                {/* Orbit ring */}
                <div className="absolute inset-2 rounded-full" style={{ border:'1px solid rgba(255,255,255,.04)' }} />
                {/* Direction lines */}
                <div className="absolute left-1/2 top-1 bottom-1 w-px" style={{ background:'rgba(255,255,255,.04)' }} />
                <div className="absolute top-1/2 left-1 right-1 h-px" style={{ background:'rgba(255,255,255,.04)' }} />

                {/* Angle buttons around the circle */}
                {angleViews.map((a, i) => {
                  const angle = (i * 45) * (Math.PI / 180) - Math.PI / 2
                  const x = 50 + 40 * Math.cos(angle)
                  const y = 50 + 40 * Math.sin(angle)
                  return (
                    <button key={a} onClick={() => setSel360(i)}
                      className="absolute w-8 h-8 rounded-full flex items-center justify-center text-[7px] font-mono transition-all"
                      style={{
                        left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
                        background: sel360 === i ? 'var(--joi-pink)' : 'var(--joi-bg-3)',
                        color: sel360 === i ? '#fff' : 'var(--joi-text-3)',
                        border: `1px solid ${sel360 === i ? 'var(--joi-pink)' : 'rgba(255,255,255,.04)'}`,
                        boxShadow: sel360 === i ? '0 0 12px rgba(255,107,157,.3)' : 'none',
                      }}>{a.replace('°', '')}</button>
                  )
                })}

                {/* Center person icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:'var(--joi-bg-3)', border:'1px solid rgba(255,255,255,.04)' }}>
                    <span className="text-xs opacity-50">{'\uD83E\uDDCD'}</span>
                  </div>
                </div>
              </div>

              <div className="text-center text-[11px] font-mono mb-3" style={{ color:'var(--joi-pink)' }}>
                {angleViews[sel360]}
              </div>
            </div>

            {/* Quick select all for full 360 */}
            <div className="text-[9px] text-center" style={{ color:'var(--joi-text-3)' }}>
              Selecciona un ángulo y presiona Aplicar para generar esa vista
            </div>
          </>}

          {activeTool === 'faceswap' && <>
            <div>
              <div className="joi-label mb-2">Rostro de Origen</div>
              <div className="aspect-square rounded-xl cursor-pointer overflow-hidden transition-all"
                onClick={() => faceSwapInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) { setFaceSwapFile(f); setFaceSwapPreview(URL.createObjectURL(f)) } }}
                onDragOver={(e) => e.preventDefault()}
                style={{ background:'var(--joi-bg-3)', border: faceSwapPreview ? '1px solid rgba(255,107,157,.3)' : '1px dashed rgba(255,255,255,.08)' }}>
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
                style={{ background:'var(--joi-bg-3)', border: garmentPreview ? '1px solid rgba(167,139,250,.3)' : '1px dashed rgba(255,255,255,.08)' }}>
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

          {activeTool === 'bgswap' && <>
            <div className="joi-label mb-2">Nuevo Fondo</div>
            <div className="flex gap-1 p-0.5 rounded-xl mb-3" style={{ background:'var(--joi-bg-3)' }}>
              {(['Preset','Upload','Prompt'] as const).map(m=>(
                <button key={m} onClick={() => setBgMode(m)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium"
                  style={{ background: bgMode === m ? 'var(--joi-bg-2)' : 'transparent', color: bgMode === m ? 'var(--joi-text-1)' : 'var(--joi-text-3)' }}>{m}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {bgPresets.map((b,i)=>(
                <button key={b} onClick={() => setSelBg(i)}
                  className="py-3 rounded-lg text-[11px]"
                  style={{ background: selBg === i ? 'rgba(255,107,157,.1)' : 'var(--joi-bg-3)', border: `1px solid ${selBg === i ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`, color: selBg === i ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{b}</button>
              ))}
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
                  style={{ background:'var(--joi-bg-3)', border:'1px dashed rgba(255,107,157,.3)' }}>
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
                <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto joi-scroll">
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
                  <div className="mt-2 rounded-lg overflow-hidden" style={{ border:'1px solid rgba(255,107,157,.2)' }}>
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
              {['Tokyo neon streets','Café in Paris','Beach sunset','NYC rooftop','Enchanted forest','Space station'].map(q => (
                <button key={q} onClick={() => { setSceneSource('prompt'); setScenePrompt(q) }}
                  className="px-2.5 py-1 rounded-lg text-[9px] transition-all"
                  style={{ background: scenePrompt === q ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)', border: `1px solid ${scenePrompt === q ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`, color: scenePrompt === q ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>{q}</button>
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
                      style={{ background: sceneImage === ch.thumbnail ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)', border: `1px solid ${sceneImage === ch.thumbnail ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`, color: sceneImage === ch.thumbnail ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>
                      <img src={ch.thumbnail} className="w-5 h-5 rounded-full object-cover" alt="" />
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>}

          {activeTool === 'realskin' && <>
            <div className="joi-label mb-2">Piel Realista</div>
            <p className="text-[10px] mb-3" style={{ color:'var(--joi-text-3)', lineHeight: 1.5 }}>
              Agrega textura de piel fotorrealista — poros visibles, micro-imperfecciones, brillo natural.
              No altera la forma del rostro, rasgos ni expresión.
            </p>
            <div className="text-[10px] space-y-2 mb-3" style={{ color:'var(--joi-text-2)' }}>
              <div className="flex items-center gap-2"><span>Poros</span><div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(255,107,157,.1), rgba(255,107,157,.5))' }} /></div>
              <div className="flex items-center gap-2"><span>Imperfecciones</span><div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(167,139,250,.1), rgba(167,139,250,.5))' }} /></div>
              <div className="flex items-center gap-2"><span>Subsuperficial</span><div className="flex-1 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,.05), rgba(255,255,255,.2))' }} /></div>
            </div>
            <p className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>
              Un solo clic — presiona Aplicar para procesar
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
            <div className="joi-label mb-2">Estilos</div>
            <div className="grid grid-cols-2 gap-2">
              {styleNames.map((s,i)=>(
                <button key={s} onClick={() => setSelStyle(i)}
                  className="py-3 rounded-lg text-[11px]"
                  style={{ background: selStyle === i ? 'rgba(255,107,157,.1)' : 'var(--joi-bg-3)', border: `1px solid ${selStyle === i ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`, color: selStyle === i ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{s}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] w-20 shrink-0" style={{ color:'var(--joi-text-2)' }}>Intensidad</span>
              <input type="range" min={0} max={100} defaultValue={75} className="flex-1 slider-t" />
            </div>
          </>}

          {activeTool === 'inpaint' && <>
            <div className="joi-label mb-2">Herramientas de Pintura</div>
            <div className="grid grid-cols-2 gap-2">
              {['Pincel Libre','Selección Auto','Quitar Objeto','Agregar Objeto'].map(t=>(
                <button key={t} className="py-2.5 rounded-lg text-[11px]"
                  style={{ background:'var(--joi-bg-3)', border:'1px solid rgba(255,255,255,.04)', color:'var(--joi-text-2)' }}>{t}</button>
              ))}
            </div>
            <div className="space-y-3 mt-3">
              {['Tamaño de Pincel','Suavizado','Difuminado'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0" style={{ color:'var(--joi-text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="joi-label mb-1.5">Prompt de zona</div>
              <textarea rows={2} placeholder="Describe lo que quieres en el área seleccionada..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)', backdropFilter:'blur(8px)' }} />
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
                        background: expandDirection === dir ? 'rgba(167,139,250,0.15)' : 'var(--joi-bg-3)',
                        border: `1px solid ${expandDirection === dir ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,.04)'}`,
                        color: expandDirection === dir ? '#A78BFA' : 'var(--joi-text-2)',
                        boxShadow: expandDirection === dir ? '0 0 12px rgba(167,139,250,.1)' : 'none',
                      }}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="joi-label mb-2">
                  Pixels: <span className="font-mono" style={{ color: '#A78BFA' }}>{expandPixels}px</span>
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
        <div className="h-11 flex items-center px-4 gap-1.5 shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,.04)', background:'var(--joi-bg-glass)' }}>
          <button title="Deshacer" className="px-2.5 py-1 rounded-lg text-[11px] hover:bg-white/5 transition-colors" style={{ color:'var(--joi-text-2)' }}>{'\u21BA'}</button>
          <button title="Rehacer" className="px-2.5 py-1 rounded-lg text-[11px] hover:bg-white/5 transition-colors" style={{ color:'var(--joi-text-2)' }}>{'\u21BB'}</button>
          <button title="Comparar antes y después" onClick={() => { setCompareMode(!compareMode); setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }) }}
            className="px-2.5 py-1 rounded-lg text-[11px] transition-colors"
            style={{ color: compareMode ? 'var(--joi-pink)' : 'var(--joi-text-2)', background: compareMode ? 'rgba(255,107,157,.1)' : 'transparent' }}>Antes/Después</button>
          <button title="Acercar" onClick={() => { setCanvasZoom(z => Math.min(z + 0.25, 5)); setCanvasPan({ x: 0, y: 0 }) }}
            className="px-2.5 py-1 rounded-lg text-[11px] hover:bg-white/5 transition-colors" style={{ color:'var(--joi-text-2)' }}>Acercar</button>
          <button title="Alejar" onClick={() => { const nz = Math.max(canvasZoom - 0.25, 0.5); setCanvasZoom(nz); if (nz <= 1) setCanvasPan({ x: 0, y: 0 }) }}
            className="px-2.5 py-1 rounded-lg text-[11px] hover:bg-white/5 transition-colors" style={{ color:'var(--joi-text-2)' }}>Alejar</button>
          {canvasZoom !== 1 && <button title="Restablecer zoom" onClick={() => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }) }}
            className="px-2.5 py-1 rounded-lg text-[11px] hover:bg-white/5 transition-colors" style={{ color:'var(--joi-pink)' }}>Restablecer</button>}
          <button title="Exportar imagen" className="px-2.5 py-1 rounded-lg text-[11px] hover:bg-white/5 transition-colors" style={{ color:'var(--joi-text-2)' }}>Exportar</button>
          <div className="flex-1" />
          <span className="text-[10px] font-mono" style={{ color:'var(--joi-text-3)' }}>Zoom: {Math.round(canvasZoom * 100)}%</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 gap-6"
          onWheel={(e) => { if (!inputImage) return; e.preventDefault(); const delta = e.deltaY > 0 ? -0.15 : 0.15; setCanvasZoom(z => { const nz = Math.max(0.5, Math.min(5, z + delta)); if (nz <= 1) setCanvasPan({ x: 0, y: 0 }); return nz }) }}
          onPointerDown={(e) => { if (canvasZoom <= 1 || !inputImage) return; setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY, panX: canvasPan.x, panY: canvasPan.y }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }}
          onPointerMove={(e) => { if (!isPanning) return; setCanvasPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) }) }}
          onPointerUp={() => setIsPanning(false)}
          style={{ cursor: canvasZoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        >
          {!inputImage ? (
            /* ── Empty canvas: tool showcase ── */
            <div className="max-w-[640px] w-full text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(255,107,157,.06)', border: '1px solid rgba(255,107,157,.1)' }}>
                <span className="text-2xl" style={{ color:'var(--joi-pink)', opacity: 0.6 }}>{'\u2191'}</span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color:'var(--joi-text-1)' }}>Sube una imagen para empezar a editar</p>
              <p className="text-[11px] mb-6" style={{ color:'var(--joi-text-3)' }}>O selecciona desde tu galería o personajes</p>

              <div className="joi-label mb-3" style={{ textAlign: 'left' }}>Lo que puedes hacer</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { tool: 'relight', icon: '\uD83D\uDCA1', label: 'Reiluminar', desc: 'Cambia dirección, color y atmósfera de la luz' },
                  { tool: 'faceswap', icon: '\uD83C\uDFAD', label: 'Cambio de Rostro', desc: 'Intercambia rostros entre dos imágenes' },
                  { tool: 'bgswap', icon: '\uD83D\uDDBC\uFE0F', label: 'Fondo', desc: 'Reemplaza o genera nuevos fondos' },
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
          <div className="flex gap-1 rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,.06)' }}>
            <div className="relative" style={{ transform: `scale(${canvasZoom}) translate(${canvasPan.x / canvasZoom}px, ${canvasPan.y / canvasZoom}px)`, transition: isPanning ? 'none' : 'transform 0.15s ease' }}>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono z-10" style={{ background:'rgba(0,0,0,.6)', color:'var(--joi-text-2)' }}>ANTES</div>
              <img src={inputImage} className="max-h-[70vh] object-contain select-none" draggable={false} alt="Before" />
            </div>
            <div className="w-px shrink-0" style={{ background:'var(--joi-pink)' }} />
            <div className="relative" style={{ transform: `scale(${canvasZoom}) translate(${canvasPan.x / canvasZoom}px, ${canvasPan.y / canvasZoom}px)`, transition: isPanning ? 'none' : 'transform 0.15s ease' }}>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono z-10" style={{ background:'rgba(255,107,157,.3)', color:'white' }}>DESPUÉS</div>
              <img src={resultImage} className="max-h-[70vh] object-contain select-none" draggable={false} alt="After" />
            </div>
          </div>
          ) : (
          <>
          <div className="text-center" style={{ transform: `scale(${canvasZoom}) translate(${canvasPan.x / canvasZoom}px, ${canvasPan.y / canvasZoom}px)`, transition: isPanning ? 'none' : 'transform 0.15s ease' }}>
            <div className="joi-label mb-2">Original</div>
            <div className="w-[340px] h-[420px] rounded-xl flex items-center justify-center overflow-hidden joi-glass"
              style={{ border:'1px solid rgba(255,255,255,.04)' }}>
              <img src={inputImage} className="w-full h-full object-cover rounded-xl select-none" draggable={false} alt="Original" />
            </div>
          </div>

          <div className="text-2xl" style={{ color:'var(--joi-pink)' }}>{'\u2192'}</div>

          <div className="text-center" style={{ transform: `scale(${canvasZoom}) translate(${canvasPan.x / canvasZoom}px, ${canvasPan.y / canvasZoom}px)`, transition: isPanning ? 'none' : 'transform 0.15s ease' }}>
            <div className="joi-label mb-2" style={{ color:'var(--joi-pink)' }}>Resultado AI</div>
            <div className="w-[340px] h-[420px] rounded-xl flex items-center justify-center overflow-hidden joi-glass joi-border-glow"
              style={{ border:'1px solid rgba(255,255,255,.04)', boxShadow:'0 0 30px rgba(255,107,157,.06)' }}>
              {resultImage ? (
                <img src={resultImage} className="w-full h-full object-cover rounded-xl select-none" draggable={false} alt="Result" />
              ) : (
                <div className="text-center">
                  <span className="text-2xl block mb-2 joi-breathe">{'\u2726'}</span>
                  <span className="text-[11px]" style={{ color:'var(--joi-text-3)' }}>El resultado aparecerá aquí</span>
                </div>
              )}
            </div>
          </div>
          </>
          )
          )}
        </div>

        {(editHistory.length > 0 || resultImage) && <div className="h-20 flex items-center px-5 gap-2 shrink-0" style={{ borderTop:'1px solid rgba(255,255,255,.04)', background:'var(--joi-bg-glass)' }}>
          <span className="text-[9px] font-mono shrink-0 mr-1" style={{ color:'var(--joi-text-3)' }}>HISTORIAL</span>
          {editHistory.slice(0, 10).map((url, i) => (
            <div key={i} onClick={() => { setResultImage(url) }}
              className="w-12 h-12 rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
              style={{ border:'1px solid rgba(255,255,255,.04)' }}>
              <img src={url} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
          {resultImage && onNav && (
            <div className="ml-auto shrink-0 w-56">
              <PipelineCTA label="Iniciar Sesión de Fotos" targetPage="session" onNav={onNav} icon="📸" />
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
              addItems([{ url: editedDataUrl, type: 'edit', model: 'basic-editor', tags: ['edited'] }])
              toast.addToast('Imagen editada guardada', 'success')
            }}
            onClose={() => setShowBasicEditor(false)}
          />
        </Suspense>
      )}

    </div>
  )
}

export default AIEditor
