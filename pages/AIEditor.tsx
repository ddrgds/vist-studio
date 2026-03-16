import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { useGalleryStore } from '../stores/galleryStore'
import { useCharacterStore } from '../stores/characterStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { editImageWithAI } from '../services/geminiService'
import { editImageWithFluxKontext, editImageWithSeedream5, editImageWithFlux2Pro, editImageWithGrokFal, editImageWithQwen, editImageWithFireRed, inpaintWithOneReward, editImageWithSeedream5Lite } from '../services/falService'
import { editImageWithGPT } from '../services/openaiService'
import { ENGINE_METADATA, FEATURE_ENGINES, AIProvider } from '../types'
import { useNavigationStore } from '../stores/navigationStore'
import { usePipelineStore } from '../stores/pipelineStore'
import { PipelineCTA } from '../components/PipelineCTA'

// Lazy load modals (they're heavy)
const RelightModal = lazy(() => import('../components/RelightModal'))
const FaceSwapModal = lazy(() => import('../components/FaceSwapModal'))
const TryOnModal = lazy(() => import('../components/TryOnModal'))
const InpaintingModal = lazy(() => import('../components/InpaintingModal'))
const SkinEnhancerModal = lazy(() => import('../components/SkinEnhancerModal'))

const tools = [
  { id:'freeai', label:'Free AI', icon:'\u2728', desc:'Edit with AI using any instruction' },
  { id:'relight', label:'Relight', icon:'\uD83D\uDCA1', desc:'Change lighting on any photo' },
  { id:'rotate360', label:'360\u00b0 Angles', icon:'\uD83D\uDD04', desc:'Generate views from all angles' },
  { id:'faceswap', label:'Face Swap', icon:'\uD83C\uDFAD', desc:'Swap faces between images' },
  { id:'tryon', label:'Try-On Virtual', icon:'\uD83D\uDC57', desc:'Try on clothes and accessories' },
  { id:'bgswap', label:'Background', icon:'\uD83D\uDDBC\uFE0F', desc:'Change or generate backgrounds' },
  { id:'composite', label:'Scene', icon:'\uD83C\uDFAC', desc:'Place character in any scene' },
  { id:'enhance', label:'Enhance', icon:'\u2728', desc:'Improve quality and details' },
  { id:'style', label:'Style Transfer', icon:'\uD83C\uDFA8', desc:'Apply artistic styles' },
  { id:'inpaint', label:'Inpaint', icon:'\uD83D\uDD8C\uFE0F', desc:'Edit specific areas' },
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
  'rotate360': 'relight',    // 360° uses same general editing engines
  'faceswap': 'face-swap',
  'tryon': 'try-on',
  'bgswap': 'bg-swap',
  'composite': 'bg-swap',    // composite uses same engines as bg-swap
  'enhance': 'enhance',
  'style': 'style-transfer',
  'inpaint': 'inpaint',
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
    return editImageWithGrokFal(file, instruction, onProgress, abortSignal)
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
  const [sel360, setSel360] = useState(0)
  const [selStyle, setSelStyle] = useState(0)
  const [selBg, setSelBg] = useState(0)
  const [bgMode, setBgMode] = useState<'Preset'|'Upload'|'Prompt'>('Preset')
  const [freePrompt, setFreePrompt] = useState('')

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

  // Functional state
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [inputFile, setInputFile] = useState<File | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [editHistory, setEditHistory] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { decrementCredits, restoreCredits } = useProfile()

  // Visible cost for the Apply button
  const displayCost = (() => {
    const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
    if (eng) return eng.creditCost
    return activeTool === 'rotate360' || activeTool === 'composite' ? 10 : 8
  })()
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

  const handleApply = async () => {
    if (!inputImage) { toast.error('Upload an image first'); return }

    // For tools with modals, open the modal instead (these use URL, not File)
    if (['faceswap', 'tryon', 'inpaint', 'enhance'].includes(activeTool)) {
      setActiveModal(activeTool)
      return
    }

    // Free AI needs a prompt
    if (activeTool === 'freeai' && !freePrompt.trim()) {
      toast.error('Write an instruction first')
      return
    }

    // Composite needs a scene reference or prompt
    if (activeTool === 'composite') {
      if (!sceneImage && !scenePrompt.trim()) {
        toast.error('Upload a scene image or describe the scene')
        return
      }
    }

    // Non-modal tools need a File object for the API
    if (!inputFile) {
      toast.error('Upload an image first')
      return
    }

    // For tools without modals, process directly
    setProcessing(true)
    setProgress(0)

    // Resolve engine and cost — use engine's credit cost when a specific engine is selected
    const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
    const baseCost = activeTool === 'rotate360' ? 10 : activeTool === 'composite' ? 10 : 8
    const cost = eng ? eng.creditCost : baseCost
    const ok = await decrementCredits(cost)
    if (!ok) { toast.error('Insufficient credits'); setProcessing(false); return }

    // Resolve engine label for gallery
    const engineLabel = eng?.userFriendlyName || (selectedEngine === 'auto' ? 'Auto' : selectedEngine)

    try {
      let resultUrls: string[] = []

      if (activeTool === 'freeai') {
        resultUrls = await routeEdit(selectedEngine, inputFile, freePrompt.trim(), (p) => setProgress(p))
      } else if (activeTool === 'relight') {
        const preset = relightPresets[selPreset]
        const instruction = `Change the lighting to: ${preset.prompt}. Only modify lighting, shadows, and color temperature.`
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
        }])
        toast.success('Edit applied')
      }
    } catch (err) {
      restoreCredits(cost)
      toast.error('Error processing')
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
    }])
    setActiveModal(null)
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--joi-bg-0)' }}>
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
        {tools.map(t => (
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
      </div>

      {/* Tool Panel */}
      <div className="w-[300px] shrink-0 flex flex-col joi-scroll" style={{ background:'var(--joi-bg-1)', borderRight:'1px solid rgba(255,255,255,.04)', backdropFilter:'blur(16px)' }}>
        <div className="px-4 h-14 flex items-center shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
          <h2 className="text-sm font-bold" style={{ color:'var(--joi-text-1)' }}>
            {tools.find(t=>t.id===activeTool)?.icon} {tools.find(t=>t.id===activeTool)?.label}
          </h2>
          <div className="ml-auto">
            <button onClick={() => setShowEngineModal(v => !v)}
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 joi-scroll">
          <div>
            <div className="joi-label mb-2">Input Image</div>
            <div className="relative aspect-[4/3] rounded-xl cursor-pointer transition-all overflow-hidden"
              style={{ background:'var(--joi-bg-3)', border:'1px dashed rgba(255,255,255,.04)', backdropFilter:'blur(8px)' }}
              onClick={() => fileInputRef.current?.click()}>
              {inputImage ? (
                <img src={inputImage} className="w-full h-full object-cover rounded-xl" alt="" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-xl mb-1" style={{ color:'var(--joi-pink)' }}>{'\u2191'}</span>
                  <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>Upload image</span>
                  <span className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>or drag here</span>
                </div>
              )}
            </div>
          </div>

          {/* Character selector */}
          {characters.length > 0 && (
            <div>
              <div className="joi-label mb-2">Or use character</div>
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
              <div className="joi-label mb-2">Edit Instruction</div>
              <textarea
                rows={4}
                value={freePrompt}
                onChange={e => setFreePrompt(e.target.value)}
                placeholder="Describe how you want to edit this image...&#10;&#10;Examples:&#10;• Make it look like sunset&#10;• Add sunglasses&#10;• Change hair to blonde&#10;• Remove background objects"
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

          {activeTool === 'relight' && <>
            {/* Light sphere visualization */}
            <div>
              <div className="joi-label mb-3">Light Position</div>
              <div className="relative w-44 h-44 mx-auto mb-3">
                {/* Sphere background */}
                <div className="absolute inset-0 rounded-full" style={{
                  background: 'radial-gradient(circle at 40% 35%, var(--joi-bg-3) 0%, var(--joi-bg-2) 70%, var(--joi-bg-1) 100%)',
                  border: '1px solid rgba(255,255,255,.04)',
                }} />
                {/* Cross guides */}
                <div className="absolute left-1/2 top-2 bottom-2 w-px" style={{ background:'rgba(255,255,255,.04)' }} />
                <div className="absolute top-1/2 left-2 right-2 h-px" style={{ background:'rgba(255,255,255,.04)' }} />
                {/* Ellipse equator */}
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[60%] rounded-[50%]" style={{ border:'1px solid rgba(255,255,255,.04)' }} />

                {/* Light position dot */}
                {(() => {
                  const p = relightPresets[selPreset]
                  const azRad = (p.az * Math.PI) / 180
                  const elRad = (p.el * Math.PI) / 180
                  const x = 50 + Math.sin(azRad) * Math.cos(elRad) * 38
                  const y = 50 - Math.sin(elRad) * 38
                  return (
                    <div className="absolute w-5 h-5 rounded-full transition-all duration-500"
                      style={{
                        left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
                        background: p.c,
                        boxShadow: `0 0 20px ${p.c}80, 0 0 40px ${p.c}30`,
                      }} />
                  )
                })()}

                {/* Center face icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg opacity-30">{'\uD83D\uDDE3\uFE0F'}</span>
                </div>
              </div>
            </div>

            {/* Preset grid */}
            <div>
              <div className="joi-label mb-2">Presets</div>
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
          </>}

          {activeTool === 'rotate360' && <>
            <div>
              <div className="joi-label mb-3">Camera Angle</div>
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
              Select an angle, then hit Apply to generate that view
            </div>
          </>}

          {activeTool === 'faceswap' && <>
            <div>
              <div className="joi-label mb-2">Target Face</div>
              <div className="aspect-[4/3] rounded-xl cursor-pointer"
                style={{ background:'var(--joi-bg-3)', border:'1px dashed rgba(255,255,255,.04)' }}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-xl mb-1">{'\uD83C\uDFAD'}</span>
                  <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>Upload target face</span>
                </div>
              </div>
            </div>
            <div className="joi-label">Or select character</div>
            <div className="flex gap-2">
              {['Luna \uD83C\uDF19','Kai \u2744\uFE0F','Zara \uD83D\uDD25'].map(c=>(
                <button key={c} className="flex-1 py-2 rounded-lg text-[10px] transition-all"
                  style={{ background:'var(--joi-bg-3)', border:'1px solid rgba(255,255,255,.04)', color:'var(--joi-text-2)' }}>{c}</button>
              ))}
            </div>
            <div className="space-y-3 mt-2">
              {['Blending','Skin Match','Expression Match','Lighting Match'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-28 shrink-0" style={{ color:'var(--joi-text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={70} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
          </>}

          {activeTool === 'tryon' && <>
            <div>
              <div className="joi-label mb-2">Garment / Accessory</div>
              <div className="aspect-[4/3] rounded-xl cursor-pointer"
                style={{ background:'var(--joi-bg-3)', border:'1px dashed rgba(255,255,255,.04)' }}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-xl mb-1">{'\uD83D\uDC57'}</span>
                  <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>Upload garment photo</span>
                </div>
              </div>
            </div>
            <div className="joi-label">Category</div>
            <div className="grid grid-cols-3 gap-1.5">
              {['Top','Bottom','Dress','Jacket','Shoes','Accessory'].map(c=>(
                <button key={c} className="py-2 rounded-lg text-[10px] transition-all"
                  style={{ background:'var(--joi-bg-3)', border:'1px solid rgba(255,255,255,.04)', color:'var(--joi-text-2)' }}>{c}</button>
              ))}
            </div>
            <div className="space-y-3 mt-2">
              {['Fit','Draping','Color Match','Texture'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0" style={{ color:'var(--joi-text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
          </>}

          {activeTool === 'bgswap' && <>
            <div className="joi-label mb-2">New Background</div>
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
            <div className="joi-label mb-2">Scene Source</div>
            <div className="flex gap-1 p-0.5 rounded-xl mb-3" style={{ background:'var(--joi-bg-3)' }}>
              {(['upload','gallery','prompt'] as const).map(m=>(
                <button key={m} onClick={() => setSceneSource(m)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium capitalize"
                  style={{ background: sceneSource === m ? 'var(--joi-bg-2)' : 'transparent', color: sceneSource === m ? 'var(--joi-text-1)' : 'var(--joi-text-3)' }}>{m === 'upload' ? 'Upload' : m === 'gallery' ? 'Gallery' : 'Describe'}</button>
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
                    Change
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[4/3] rounded-xl cursor-pointer transition-all overflow-hidden"
                  style={{ background:'var(--joi-bg-3)', border:'1px dashed rgba(255,255,255,.04)' }}
                  onClick={() => sceneInputRef.current?.click()}>
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <span className="text-xl mb-1" style={{ color:'var(--joi-pink)' }}>{'\uD83C\uDFAC'}</span>
                    <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>Upload scene image</span>
                    <span className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>or drag here</span>
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
                placeholder="Describe the scene where you want to place the character...&#10;&#10;E.g.: Terrace overlooking the Mediterranean, pink sunset, tropical plants"
                className="w-full px-3 py-2.5 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)', backdropFilter:'blur(8px)' }}
              />
            )}

            {/* Quick scene chips (visible on all modes) */}
            <div className="joi-label mt-3 mb-1.5">Quick scenes</div>
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
                <div className="joi-label mb-1.5">Additional instructions (optional)</div>
                <textarea
                  rows={2}
                  value={scenePrompt}
                  onChange={e => setScenePrompt(e.target.value)}
                  placeholder="E.g.: Make it look like golden hour, add rain..."
                  className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none"
                  style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)', backdropFilter:'blur(8px)' }}
                />
              </div>
            )}

            {/* Characters as scene source */}
            {characters.length > 0 && (
              <div className="mt-3">
                <div className="joi-label mb-1.5">Or use character scene</div>
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

          {activeTool === 'enhance' && <>
            <div className="space-y-3">
              <div className="joi-label">Enhancements</div>
              {['Resolution (upscale)','Sharpness','Noise Reduction','Face Detail','Hair Detail','Skin Detail','Color Correction'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-32 shrink-0" style={{ color:'var(--joi-text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
            <div className="mt-3 joi-label">Upscale</div>
            <div className="flex gap-2 mt-1.5">
              {['2x','4x','8x'].map(x=>(
                <button key={x} className="flex-1 py-2 rounded-lg text-sm font-mono font-bold"
                  style={{ background:'var(--joi-bg-3)', border:'1px solid rgba(255,255,255,.04)', color:'var(--joi-text-2)' }}>{x}</button>
              ))}
            </div>
          </>}

          {activeTool === 'style' && <>
            <div className="joi-label mb-2">Styles</div>
            <div className="grid grid-cols-2 gap-2">
              {styleNames.map((s,i)=>(
                <button key={s} onClick={() => setSelStyle(i)}
                  className="py-3 rounded-lg text-[11px]"
                  style={{ background: selStyle === i ? 'rgba(255,107,157,.1)' : 'var(--joi-bg-3)', border: `1px solid ${selStyle === i ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`, color: selStyle === i ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{s}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] w-20 shrink-0" style={{ color:'var(--joi-text-2)' }}>Intensity</span>
              <input type="range" min={0} max={100} defaultValue={75} className="flex-1 slider-t" />
            </div>
          </>}

          {activeTool === 'inpaint' && <>
            <div className="joi-label mb-2">Paint Tools</div>
            <div className="grid grid-cols-2 gap-2">
              {['Free Brush','Auto Select','Remove Object','Add Object'].map(t=>(
                <button key={t} className="py-2.5 rounded-lg text-[11px]"
                  style={{ background:'var(--joi-bg-3)', border:'1px solid rgba(255,255,255,.04)', color:'var(--joi-text-2)' }}>{t}</button>
              ))}
            </div>
            <div className="space-y-3 mt-3">
              {['Brush Size','Smoothing','Feather'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0" style={{ color:'var(--joi-text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="joi-label mb-1.5">Zone prompt</div>
              <textarea rows={2} placeholder="Describe what you want in the selected area..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)', backdropFilter:'blur(8px)' }} />
            </div>
          </>}
        </div>

        <div className="px-4 py-3 shrink-0" style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <button onClick={handleApply} disabled={processing || !inputImage}
            className={`joi-btn-solid w-full py-2.5 text-sm ${!processing && inputImage ? 'joi-breathe' : ''}`}
            style={{ opacity: (!inputImage || processing) ? 0.5 : 1 }}>
            {processing ? `\u27F3 Processing... ${Math.round(progress)}%` : `\u2726 Apply ${tools.find(t=>t.id===activeTool)?.label} (${displayCost}cr)`}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col joi-mesh">
        <div className="h-11 flex items-center px-4 gap-1.5 shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,.04)', background:'var(--joi-bg-glass)' }}>
          {['\u21BA','\u21BB','Before/After','Zoom In','Zoom Out','Export'].map(t=>(
            <button key={t} className="px-2.5 py-1 rounded-lg text-[11px] hover:bg-white/5 transition-colors" style={{ color:'var(--joi-text-2)' }}>{t}</button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] font-mono" style={{ color:'var(--joi-text-3)' }}>Zoom: 100%</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 gap-6">
          <div className="text-center">
            <div className="joi-label mb-2">Original</div>
            <div className="w-[340px] h-[420px] rounded-xl flex items-center justify-center overflow-hidden joi-glass"
              style={{ border:'1px solid rgba(255,255,255,.04)' }}>
              {inputImage ? (
                <img src={inputImage} className="w-full h-full object-cover rounded-xl" alt="Original" />
              ) : (
                <div className="text-center">
                  <span className="text-3xl block mb-2" style={{ color:'var(--joi-text-3)' }}>{'\u2191'}</span>
                  <span className="text-[11px]" style={{ color:'var(--joi-text-3)' }}>Upload an image</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-2xl" style={{ color:'var(--joi-pink)' }}>{'\u2192'}</div>

          <div className="text-center">
            <div className="joi-label mb-2" style={{ color:'var(--joi-pink)' }}>AI Result</div>
            <div className="w-[340px] h-[420px] rounded-xl flex items-center justify-center overflow-hidden joi-glass joi-border-glow"
              style={{ border:'1px solid rgba(255,255,255,.04)', boxShadow:'0 0 30px rgba(255,107,157,.06)' }}>
              {resultImage ? (
                <img src={resultImage} className="w-full h-full object-cover rounded-xl" alt="Result" />
              ) : (
                <div className="text-center">
                  <span className="text-2xl block mb-2 joi-breathe">{'\u2726'}</span>
                  <span className="text-[11px]" style={{ color:'var(--joi-text-3)' }}>Result will appear here</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-20 flex items-center px-5 gap-2 shrink-0" style={{ borderTop:'1px solid rgba(255,255,255,.04)', background:'var(--joi-bg-glass)' }}>
          <span className="text-[9px] font-mono shrink-0 mr-1" style={{ color:'var(--joi-text-3)' }}>HISTORY</span>
          {editHistory.length > 0 ? (
            editHistory.slice(0, 10).map((url, i) => (
              <div key={i} onClick={() => { setResultImage(url) }}
                className="w-12 h-12 rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                style={{ border:'1px solid rgba(255,255,255,.04)' }}>
                <img src={url} className="w-full h-full object-cover" alt="" />
              </div>
            ))
          ) : (
            [1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className="w-12 h-12 rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform shimmer"
                style={{ border:'1px solid rgba(255,255,255,.04)' }} />
            ))
          )}
          {resultImage && onNav && (
            <div className="ml-auto shrink-0 w-56">
              <PipelineCTA label="Start Photo Session" targetPage="session" onNav={onNav} icon="📸" />
            </div>
          )}
        </div>
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
        {activeModal === 'faceswap' && inputImage && (
          <FaceSwapModal
            targetItem={{ id: 'editor-input', url: inputImage, type: 'edit' }}
            onClose={() => setActiveModal(null)}
            onSave={handleModalSave('faceswap', 'face swap')}
          />
        )}
        {activeModal === 'tryon' && inputImage && (
          <TryOnModal
            targetItem={{ id: 'editor-input', url: inputImage }}
            onClose={() => setActiveModal(null)}
            onSave={handleModalSave('tryon', 'try-on')}
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

      {/* Engine selector modal */}
      {showEngineModal && <>
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowEngineModal(false)} />
        <div className="fixed z-50 w-[340px] max-h-[90vh] rounded-xl joi-glass"
          style={{ display:'flex', flexDirection:'column', top:'50%', left:'calc(50% + 110px)', transform:'translate(-50%,-50%)', background:'var(--joi-bg-glass)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,.04)', boxShadow:'0 20px 60px rgba(0,0,0,.6), 0 0 40px rgba(255,107,157,.05)', overflow:'hidden' }}>
          <div className="overflow-y-auto p-3 pb-2 space-y-1 flex-1 min-h-0 joi-scroll">
            <div className="joi-label mb-2 px-1">Generation Engine</div>

            {(() => {
              const featureKey = TOOL_TO_FEATURE[activeTool]
              const featureDef = featureKey ? FEATURE_ENGINES[featureKey] : null
              const allowedKeys = featureDef ? featureDef.keys : null
              const filteredEngines = allowedKeys
                ? ENGINE_METADATA.filter(e => allowedKeys.includes(e.key))
                : ENGINE_METADATA

              return <>
                {!allowedKeys && (
                  <>
                    <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all"
                      style={{
                        background: selectedEngine === 'auto' ? 'rgba(255,107,157,.08)' : 'transparent',
                        border: `1px solid ${selectedEngine === 'auto' ? 'rgba(255,107,157,.2)' : 'transparent'}`,
                      }}>
                      <span className="text-base">{'\u2728'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>Auto</div>
                        <div className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>Best engine automatically</div>
                      </div>
                    </button>
                    <div className="joi-divider my-1" />
                  </>
                )}

                {filteredEngines.map(eng => (
                  <button key={eng.key} onClick={() => { setSelectedEngine(eng.key); setShowEngineModal(false) }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all"
                    style={{
                      background: selectedEngine === eng.key ? 'rgba(255,107,157,.08)' : 'transparent',
                      border: `1px solid ${selectedEngine === eng.key ? 'rgba(255,107,157,.2)' : 'transparent'}`,
                    }}>
                    <span className="text-sm" style={{ color:'var(--joi-text-3)' }}>{'\u2699'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{eng.userFriendlyName}</div>
                      <div className="text-[8px]" style={{ color:'var(--joi-text-3)' }}>{eng.description}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[9px] font-mono" style={{ color:'var(--joi-pink)' }}>{eng.creditCost}cr</div>
                      <div className="text-[8px] font-mono" style={{ color:'var(--joi-text-3)' }}>{eng.estimatedTime}</div>
                    </div>
                  </button>
                ))}
              </>
            })()}
          </div>

          <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
            <div className="joi-label mb-2 px-1">Resolution</div>
            <div className="flex gap-2">
              {[
                { id:'1k', label:'1K', desc:'1024px' },
                { id:'2k', label:'2K', desc:'2048px' },
                { id:'4k', label:'4K', desc:'4096px' },
              ].map(r => (
                <button key={r.id}
                  onClick={() => setSelectedResolution(r.id)}
                  className="flex-1 px-3 py-2 rounded-lg text-center transition-all"
                  style={{
                    background: selectedResolution === r.id ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                    border: `1px solid ${selectedResolution === r.id ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.04)'}`,
                  }}>
                  <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{r.label}</div>
                  <div className="text-[8px] font-mono" style={{ color:'var(--joi-text-3)' }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}

export default AIEditor
