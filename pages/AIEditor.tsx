import { useState, useRef, lazy, Suspense } from 'react'
import { useGalleryStore } from '../stores/galleryStore'
import { useCharacterStore } from '../stores/characterStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { editImageWithAI } from '../services/geminiService'
import { editImageWithFluxKontext } from '../services/falService'
import { ENGINE_METADATA } from '../types'

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
  { id:'enhance', label:'Enhance', icon:'\u2728', desc:'Improve quality and details' },
  { id:'style', label:'Style Transfer', icon:'\uD83C\uDFA8', desc:'Apply artistic styles' },
  { id:'inpaint', label:'Inpaint', icon:'\uD83D\uDD8C\uFE0F', desc:'Edit specific areas' },
]

const relightPresets = [
  { n:'Golden Hour', c:'#f0b860' },{ n:'Blue Hour', c:'#6ba3d9' },{ n:'Studio', c:'#e8e4dc' },
  { n:'Neon Coral', c:'#e8725c' },{ n:'Dramatic', c:'#d4603e' },{ n:'Moonlight', c:'#9a90c4' },
  { n:'Sunset', c:'#d9826a' },{ n:'Cool White', c:'#b8c9d9' },
]

const angleViews = ['0\u00b0','30\u00b0','60\u00b0','90\u00b0','120\u00b0','150\u00b0','180\u00b0','210\u00b0','240\u00b0','270\u00b0','300\u00b0','330\u00b0']

const styleNames = ['Anime','Oil Painting','Watercolor','Pop Art','Sketch','Pixel Art','Vintage Film','Cyberpunk']

const bgPresets = ['Studio','Nature','City','Interior','Abstract','Custom']

// Convert a data URL or blob URL to a File object
async function urlToFile(url: string, filename = 'character.png'): Promise<File> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/png' })
}

export function AIEditor({ onNav }: { onNav?: (page: string) => void }) {
  const [activeTool, setActiveTool] = useState('freeai')
  const [selPreset, setSelPreset] = useState(0)
  const [sel360, setSel360] = useState(0)
  const [selStyle, setSelStyle] = useState(0)
  const [selBg, setSelBg] = useState(0)
  const [bgMode, setBgMode] = useState<'Preset'|'Upload'|'Prompt'>('Preset')
  const [freePrompt, setFreePrompt] = useState('')

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
  const toast = useToast()
  const addItems = useGalleryStore(s => s.addItems)
  const characters = useCharacterStore(s => s.characters)

  const handleApply = async () => {
    if (!inputImage) { toast.error('Upload an image first'); return }

    // For tools with modals, open the modal instead (these use URL, not File)
    if (['relight', 'faceswap', 'tryon', 'inpaint', 'enhance'].includes(activeTool)) {
      setActiveModal(activeTool)
      return
    }

    // Free AI needs a prompt
    if (activeTool === 'freeai' && !freePrompt.trim()) {
      toast.error('Write an instruction first')
      return
    }

    // Non-modal tools need a File object for the API
    if (!inputFile) {
      toast.error('Upload an image first')
      return
    }

    // For tools without modals, process directly
    setProcessing(true)
    setProgress(0)

    const cost = activeTool === 'freeai' ? 8 : activeTool === 'rotate360' ? 10 : 8
    const ok = await decrementCredits(cost)
    if (!ok) { toast.error('Insufficient credits'); setProcessing(false); return }

    try {
      let resultUrls: string[] = []

      if (activeTool === 'freeai') {
        const results = await editImageWithAI(
          { baseImage: inputFile, instruction: freePrompt.trim() },
          (p) => setProgress(p)
        )
        resultUrls = results
      } else if (activeTool === 'rotate360') {
        const angle = angleViews[sel360]
        const results = await editImageWithAI(
          { baseImage: inputFile, instruction: `Rotate the camera view to ${angle} angle. Keep the same person, outfit, and lighting. Only change the camera angle to ${angle}.` },
          (p) => setProgress(p)
        )
        resultUrls = results
      } else if (activeTool === 'bgswap') {
        const bgName = bgPresets[selBg]
        const results = await editImageWithFluxKontext(
          inputFile,
          `Remove the background and replace it with a clean ${bgName.toLowerCase()} background`,
          (p) => setProgress(p)
        )
        resultUrls = results
      } else if (activeTool === 'style') {
        const styleName = styleNames[selStyle]
        const results = await editImageWithAI(
          { baseImage: inputFile, instruction: `Transform this image into ${styleName} style. Keep the person's face and pose identical but apply a strong ${styleName} artistic style to the entire image.` },
          (p) => setProgress(p)
        )
        resultUrls = results
      }

      if (resultUrls.length > 0) {
        setResultImage(resultUrls[0])
        setEditHistory(prev => [resultUrls[0], ...prev].slice(0, 20))

        addItems([{
          id: crypto.randomUUID(),
          url: resultUrls[0],
          prompt: `${activeTool} edit`,
          model: activeTool === 'bgswap' ? 'flux-kontext' : 'gemini-nb2',
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
    <div className="h-screen flex gradient-mesh">
      {/* Hidden file input */}
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
        }}
      />

      {/* Tool sidebar */}
      <div className="w-[70px] shrink-0 flex flex-col items-center py-4 gap-1" style={{ background:'var(--bg-1)', borderRight:'1px solid var(--border)' }}>
        {tools.map(t => (
          <button key={t.id} onClick={()=>setActiveTool(t.id)}
            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all group relative"
            style={{
              background: activeTool===t.id ? 'rgba(240,104,72,.1)' : 'transparent',
              border: `1px solid ${activeTool===t.id ? 'rgba(240,104,72,.2)' : 'transparent'}`,
            }}>
            <span className="text-base">{t.icon}</span>
            <span className="text-[7px] mt-0.5 font-medium" style={{ color: activeTool===t.id ? 'var(--accent)' : 'var(--text-3)' }}>
              {t.label.split(' ')[0]}
            </span>
            <div className="absolute left-full ml-2 px-2 py-1 rounded-md text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ background:'var(--bg-4)', color:'var(--text-1)', border:'1px solid var(--border)' }}>
              {t.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Tool Panel */}
      <div className="w-[300px] shrink-0 flex flex-col" style={{ background:'var(--bg-1)', borderRight:'1px solid var(--border)' }}>
        <div className="px-4 h-14 flex items-center shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color:'var(--text-1)' }}>
            {tools.find(t=>t.id===activeTool)?.icon} {tools.find(t=>t.id===activeTool)?.label}
          </h2>
          <div className="ml-auto">
            <button onClick={() => setShowEngineModal(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105 relative"
              style={{
                background: selectedEngine !== 'auto' ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                border: `1px solid ${selectedEngine !== 'auto' ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                color: selectedEngine !== 'auto' ? 'var(--accent)' : 'var(--text-3)',
              }}>
              {'\uD83D\uDD27'}
              {selectedEngine !== 'auto' && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background:'var(--accent)' }} />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Input Image</div>
            <div className="aspect-[4/3] rounded-xl cursor-pointer transition-all hover:border-[var(--border-h)]"
              style={{ background:'var(--bg-3)', border:'1px dashed var(--border)' }}
              onClick={() => fileInputRef.current?.click()}>
              {inputImage ? (
                <img src={inputImage} className="w-full h-full object-cover rounded-xl" alt="" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-xl mb-1" style={{ color:'var(--accent)' }}>{'\u2191'}</span>
                  <span className="text-[10px]" style={{ color:'var(--text-2)' }}>Upload image</span>
                  <span className="text-[9px]" style={{ color:'var(--text-3)' }}>or drag here</span>
                </div>
              )}
            </div>
          </div>

          {/* Character selector */}
          {characters.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Or use character</div>
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
                    style={{ background: inputImage === ch.thumbnail ? 'rgba(240,104,72,.08)' : 'var(--bg-3)', border: `1px solid ${inputImage === ch.thumbnail ? 'rgba(240,104,72,.2)' : 'var(--border)'}`, color: inputImage === ch.thumbnail ? 'var(--accent)' : 'var(--text-2)' }}>
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
              <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Edit Instruction</div>
              <textarea
                rows={4}
                value={freePrompt}
                onChange={e => setFreePrompt(e.target.value)}
                placeholder="Describe how you want to edit this image...&#10;&#10;Examples:&#10;• Make it look like sunset&#10;• Add sunglasses&#10;• Change hair to blonde&#10;• Remove background objects"
                className="w-full px-3 py-2.5 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['Make cinematic','Add soft blur bg','Golden hour lighting','Change to b&w','Add film grain','Enhance details'].map(q => (
                <button key={q} onClick={() => setFreePrompt(q)}
                  className="px-2.5 py-1 rounded-lg text-[9px] transition-all"
                  style={{ background: freePrompt === q ? 'rgba(240,104,72,.08)' : 'var(--bg-3)', border: `1px solid ${freePrompt === q ? 'rgba(240,104,72,.2)' : 'var(--border)'}`, color: freePrompt === q ? 'var(--accent)' : 'var(--text-3)' }}>{q}</button>
              ))}
            </div>
          </>}

          {activeTool === 'relight' && <>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Light Presets</div>
              <div className="grid grid-cols-4 gap-1.5">
                {relightPresets.map((p,i) => (
                  <button key={p.n} onClick={()=>setSelPreset(i)}
                    className="py-2 rounded-lg text-center transition-all"
                    style={{
                      background: selPreset===i ? `${p.c}15` : 'var(--bg-3)',
                      border: `1px solid ${selPreset===i ? `${p.c}35` : 'var(--border)'}`,
                    }}>
                    <div className="w-4 h-4 rounded-full mx-auto" style={{ background:p.c, boxShadow:`0 0 6px ${p.c}40` }} />
                    <span className="text-[7px] block mt-1" style={{ color: selPreset===i ? p.c : 'var(--text-3)' }}>{p.n}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {['Intensity','Direction (\u00b0)','Shadows','Temperature','Ambient','Highlights'].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0" style={{ color:'var(--text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider mt-2" style={{ color:'var(--text-3)' }}>Or upload a light reference photo</div>
            <div className="h-20 rounded-xl cursor-pointer flex items-center justify-center"
              style={{ background:'var(--bg-3)', border:'1px dashed var(--border)' }}>
              <span className="text-[10px]" style={{ color:'var(--text-3)' }}>{'\u2191'} Lighting reference</span>
            </div>
          </>}

          {activeTool === 'rotate360' && <>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>360{'\u00b0'} View</div>
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 rounded-full" style={{ border:'2px solid var(--bg-3)' }} />
                {angleViews.map((a,i)=>{
                  const angle = (i * 30) * (Math.PI / 180) - Math.PI/2
                  const x = 50 + 42 * Math.cos(angle)
                  const y = 50 + 42 * Math.sin(angle)
                  return (
                    <button key={a} onClick={()=>setSel360(i)}
                      className="absolute w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-mono transition-all"
                      style={{
                        left:`${x}%`, top:`${y}%`, transform:'translate(-50%,-50%)',
                        background: sel360===i ? 'var(--accent)' : 'var(--bg-3)',
                        color: sel360===i ? '#fff' : 'var(--text-3)',
                        border: `1px solid ${sel360===i ? 'var(--accent)' : 'var(--border)'}`,
                      }}>{a}</button>
                  )
                })}
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono" style={{ color:'var(--text-2)' }}>
                  {angleViews[sel360]}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {['Elevation','Distance','Zoom','Fine Rotation'].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0" style={{ color:'var(--text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
            <button className="btn-primary w-full py-2 text-[11px] mt-2">Generate All Views</button>
          </>}

          {activeTool === 'faceswap' && <>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Target Face</div>
              <div className="aspect-[4/3] rounded-xl cursor-pointer"
                style={{ background:'var(--bg-3)', border:'1px dashed var(--border)' }}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-xl mb-1">{'\uD83C\uDFAD'}</span>
                  <span className="text-[10px]" style={{ color:'var(--text-2)' }}>Upload target face</span>
                </div>
              </div>
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Or select character</div>
            <div className="flex gap-2">
              {['Luna \uD83C\uDF19','Kai \u2744\uFE0F','Zara \uD83D\uDD25'].map(c=>(
                <button key={c} className="flex-1 py-2 rounded-xl text-[10px] transition-all"
                  style={{ background:'var(--bg-3)', border:'1px solid var(--border)', color:'var(--text-2)' }}>{c}</button>
              ))}
            </div>
            <div className="space-y-3 mt-2">
              {['Blending','Skin Match','Expression Match','Lighting Match'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-28 shrink-0" style={{ color:'var(--text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={70} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
          </>}

          {activeTool === 'tryon' && <>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Garment / Accessory</div>
              <div className="aspect-[4/3] rounded-xl cursor-pointer"
                style={{ background:'var(--bg-3)', border:'1px dashed var(--border)' }}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-xl mb-1">{'\uD83D\uDC57'}</span>
                  <span className="text-[10px]" style={{ color:'var(--text-2)' }}>Upload garment photo</span>
                </div>
              </div>
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Category</div>
            <div className="grid grid-cols-3 gap-1.5">
              {['Top','Bottom','Dress','Jacket','Shoes','Accessory'].map(c=>(
                <button key={c} className="py-2 rounded-xl text-[10px] transition-all"
                  style={{ background:'var(--bg-3)', border:'1px solid var(--border)', color:'var(--text-2)' }}>{c}</button>
              ))}
            </div>
            <div className="space-y-3 mt-2">
              {['Fit','Draping','Color Match','Texture'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0" style={{ color:'var(--text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
          </>}

          {activeTool === 'bgswap' && <>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>New Background</div>
            <div className="flex gap-1 p-0.5 rounded-lg mb-3" style={{ background:'var(--bg-3)' }}>
              {(['Preset','Upload','Prompt'] as const).map(m=>(
                <button key={m} onClick={() => setBgMode(m)}
                  className="flex-1 py-1.5 rounded-md text-[10px] font-medium"
                  style={{ background: bgMode === m ? 'var(--bg-4)' : 'transparent', color: bgMode === m ? 'var(--text-1)' : 'var(--text-3)' }}>{m}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {bgPresets.map((b,i)=>(
                <button key={b} onClick={() => setSelBg(i)}
                  className="py-3 rounded-xl text-[11px]"
                  style={{ background: selBg === i ? 'rgba(240,104,72,.1)' : 'var(--bg-3)', border: `1px solid ${selBg === i ? 'rgba(240,104,72,.2)' : 'var(--border)'}`, color: selBg === i ? 'var(--accent)' : 'var(--text-2)' }}>{b}</button>
              ))}
            </div>
          </>}

          {activeTool === 'enhance' && <>
            <div className="space-y-3">
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Enhancements</div>
              {['Resolution (upscale)','Sharpness','Noise Reduction','Face Detail','Hair Detail','Skin Detail','Color Correction'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-32 shrink-0" style={{ color:'var(--text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
            <div className="mt-3 text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Upscale</div>
            <div className="flex gap-2 mt-1.5">
              {['2x','4x','8x'].map(x=>(
                <button key={x} className="flex-1 py-2 rounded-xl text-sm font-mono font-bold"
                  style={{ background:'var(--bg-3)', border:'1px solid var(--border)', color:'var(--text-2)' }}>{x}</button>
              ))}
            </div>
          </>}

          {activeTool === 'style' && <>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Styles</div>
            <div className="grid grid-cols-2 gap-2">
              {styleNames.map((s,i)=>(
                <button key={s} onClick={() => setSelStyle(i)}
                  className="py-3 rounded-xl text-[11px]"
                  style={{ background: selStyle === i ? 'rgba(240,104,72,.1)' : 'var(--bg-3)', border: `1px solid ${selStyle === i ? 'rgba(240,104,72,.2)' : 'var(--border)'}`, color: selStyle === i ? 'var(--accent)' : 'var(--text-2)' }}>{s}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] w-20 shrink-0" style={{ color:'var(--text-2)' }}>Intensity</span>
              <input type="range" min={0} max={100} defaultValue={75} className="flex-1 slider-t" />
            </div>
          </>}

          {activeTool === 'inpaint' && <>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Paint Tools</div>
            <div className="grid grid-cols-2 gap-2">
              {['Free Brush','Auto Select','Remove Object','Add Object'].map(t=>(
                <button key={t} className="py-2.5 rounded-xl text-[11px]"
                  style={{ background:'var(--bg-3)', border:'1px solid var(--border)', color:'var(--text-2)' }}>{t}</button>
              ))}
            </div>
            <div className="space-y-3 mt-3">
              {['Brush Size','Smoothing','Feather'].map(s=>(
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0" style={{ color:'var(--text-2)' }}>{s}</span>
                  <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color:'var(--text-3)' }}>Zone prompt</div>
              <textarea rows={2} placeholder="Describe what you want in the selected area..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none"
                style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }} />
            </div>
          </>}
        </div>

        <div className="px-4 py-3 shrink-0" style={{ borderTop:'1px solid var(--border)' }}>
          <button onClick={handleApply} disabled={processing || !inputImage}
            className="btn-primary w-full py-2.5 text-sm"
            style={{ opacity: (!inputImage || processing) ? 0.5 : 1 }}>
            {processing ? `\u27F3 Processing... ${Math.round(progress)}%` : `\u2726 Apply ${tools.find(t=>t.id===activeTool)?.label}`}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="h-11 flex items-center px-4 gap-1.5 shrink-0" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-1)' }}>
          {['\u21BA','\u21BB','Before/After','Zoom In','Zoom Out','Export'].map(t=>(
            <button key={t} className="px-2.5 py-1 rounded-md text-[11px] hover:bg-white/5 transition-colors" style={{ color:'var(--text-2)' }}>{t}</button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] font-mono" style={{ color:'var(--text-3)' }}>Zoom: 100%</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 gap-6">
          <div className="text-center">
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Original</div>
            <div className="w-[340px] h-[420px] rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background:'var(--bg-2)', border:'1px solid var(--border)' }}>
              {inputImage ? (
                <img src={inputImage} className="w-full h-full object-cover rounded-2xl" alt="Original" />
              ) : (
                <div className="text-center">
                  <span className="text-3xl block mb-2" style={{ color:'var(--text-3)' }}>{'\u2191'}</span>
                  <span className="text-[11px]" style={{ color:'var(--text-3)' }}>Upload an image</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-2xl" style={{ color:'var(--accent)' }}>{'\u2192'}</div>

          <div className="text-center">
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--accent)' }}>AI Result</div>
            <div className="w-[340px] h-[420px] rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background:'var(--bg-2)', border:'1px solid var(--border)', boxShadow:'0 0 30px rgba(240,104,72,.06)' }}>
              {resultImage ? (
                <img src={resultImage} className="w-full h-full object-cover rounded-2xl" alt="Result" />
              ) : (
                <div className="text-center">
                  <span className="text-2xl block mb-2 pulse-soft">{'\u2726'}</span>
                  <span className="text-[11px]" style={{ color:'var(--text-3)' }}>Result will appear here</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-20 flex items-center px-5 gap-2 shrink-0" style={{ borderTop:'1px solid var(--border)', background:'var(--bg-1)' }}>
          <span className="text-[9px] font-mono shrink-0 mr-1" style={{ color:'var(--text-3)' }}>HISTORY</span>
          {editHistory.length > 0 ? (
            editHistory.slice(0, 10).map((url, i) => (
              <div key={i} onClick={() => { setResultImage(url) }}
                className="w-12 h-12 rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                style={{ border:'1px solid var(--border)' }}>
                <img src={url} className="w-full h-full object-cover" alt="" />
              </div>
            ))
          ) : (
            [1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className="w-12 h-12 rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform shimmer"
                style={{ border:'1px solid var(--border)' }} />
            ))
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
        <div className="fixed z-50 w-[340px] max-h-[90vh] rounded-2xl"
          style={{ display:'flex', flexDirection:'column', top:'50%', left:'calc(50% + 110px)', transform:'translate(-50%,-50%)', background:'rgba(14,12,20,.95)', backdropFilter:'blur(24px)', border:'1px solid var(--border)', boxShadow:'0 20px 60px rgba(0,0,0,.6)', overflow:'hidden' }}>
          <div className="overflow-y-auto p-3 pb-2 space-y-1 flex-1 min-h-0">
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2 px-1" style={{ color:'var(--text-3)' }}>Generation Engine</div>

            <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
              style={{
                background: selectedEngine === 'auto' ? 'rgba(240,104,72,.08)' : 'transparent',
                border: `1px solid ${selectedEngine === 'auto' ? 'rgba(240,104,72,.2)' : 'transparent'}`,
              }}>
              <span className="text-base">{'\u2728'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? 'var(--accent)' : 'var(--text-1)' }}>Auto</div>
                <div className="text-[9px]" style={{ color:'var(--text-3)' }}>Best engine automatically</div>
              </div>
            </button>

            <div className="h-px my-1" style={{ background:'var(--border)' }} />

            {ENGINE_METADATA.map(eng => (
              <button key={eng.key} onClick={() => { setSelectedEngine(eng.key); setShowEngineModal(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                style={{
                  background: selectedEngine === eng.key ? 'rgba(240,104,72,.08)' : 'transparent',
                  border: `1px solid ${selectedEngine === eng.key ? 'rgba(240,104,72,.2)' : 'transparent'}`,
                }}>
                <span className="text-sm" style={{ color:'var(--text-3)' }}>{'\u2699'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? 'var(--accent)' : 'var(--text-1)' }}>{eng.userFriendlyName}</div>
                  <div className="text-[8px]" style={{ color:'var(--text-3)' }}>{eng.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] font-mono" style={{ color:'var(--accent)' }}>{eng.creditCost}cr</div>
                  <div className="text-[8px] font-mono" style={{ color:'var(--text-3)' }}>{eng.estimatedTime}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop:'1px solid var(--border)' }}>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2 px-1" style={{ color:'var(--text-3)' }}>Resolution</div>
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
                    background: selectedResolution === r.id ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                    border: `1px solid ${selectedResolution === r.id ? 'rgba(240,104,72,.25)' : 'var(--border)'}`,
                  }}>
                  <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? 'var(--accent)' : 'var(--text-1)' }}>{r.label}</div>
                  <div className="text-[8px] font-mono" style={{ color:'var(--text-3)' }}>{r.desc}</div>
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
