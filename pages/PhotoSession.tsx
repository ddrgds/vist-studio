import React, { useState, useEffect, useRef } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { useNavigationStore } from '../stores/navigationStore'
import { generatePhotoSession, generateInfluencerImage } from '../services/geminiService'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { ImageSize, AspectRatio, ENGINE_METADATA, OPERATION_CREDIT_COSTS } from '../types'
import type { InfluencerParams } from '../types'

const scenarios = [
  { name:'White Studio', icon:'\uD83C\uDFDB\uFE0F', d:'Professional, clean' },
  { name:'Urban Street', icon:'\uD83C\uDF03', d:'Neon, graffiti' },
  { name:'Tropical Beach', icon:'\uD83C\uDFD6\uFE0F', d:'Sand, sunset' },
  { name:'Parisian Caf\u00e9', icon:'\u2615', d:'Vintage, flowers' },
  { name:'Rooftop NYC', icon:'\uD83C\uDFD9\uFE0F', d:'Skyline, golden hour' },
  { name:'Mystic Forest', icon:'\uD83C\uDF32', d:'Fog, natural' },
  { name:'Night Club', icon:'\uD83E\uDEA9', d:'LED, smoke' },
  { name:'Desert', icon:'\uD83C\uDFDC\uFE0F', d:'Dunes, epic' },
  { name:'Tokyo Night', icon:'\uD83D\uDDFC', d:'Rain, neon' },
  { name:'Art Gallery', icon:'\uD83C\uDFA8', d:'Minimalist' },
  { name:'Mansion', icon:'\uD83C\uDFF0', d:'Marble, luxury' },
  { name:'Festival', icon:'\uD83C\uDFAA', d:'Confetti, lights' },
]

const poses = ['Standing casual','Sitting','Walking','Reclining','Fashion pose','Arms crossed','Looking back','Power pose','Jumping','Leaning on wall','In motion','Meditating']
const angles = [{n:'Front',i:'\u2B24'},{n:'3/4 Right',i:'\u25D1'},{n:'3/4 Left',i:'\u25D0'},{n:'Profile',i:'\u25D7'},{n:'Top-down',i:'\u2299'},{n:'Low angle',i:'\u25B2'},{n:'High angle',i:'\u25BC'},{n:'Dutch',i:'\u25C7'}]
const lighting = [{n:'Golden Hour',c:'#f0b860'},{n:'Blue Hour',c:'#6ba3d9'},{n:'Studio Ring',c:'#e8e4dc'},{n:'Neon Coral',c:'#e8725c'},{n:'Dramatic',c:'#d4603e'},{n:'Moonlight',c:'#9a90c4'}]
const expressions = ['Neutral','Subtle Smile','Wide Smile','Serious','Mysterious','Surprised','Flirty','Thoughtful','Confident','Laughing']

const sessionPresets = [
  { name: 'Instagram Feed', icon: '\uD83D\uDCF8', scene: 0, pose: 5, light: 2, expr: 1 },
  { name: 'GRWM', icon: '\uD83D\uDC84', scene: 3, pose: 1, light: 0, expr: 8 },
  { name: 'Night Out', icon: '\uD83C\uDF19', scene: 6, pose: 0, light: 3, expr: 4 },
  { name: 'Gym / Fitness', icon: '\uD83D\uDCAA', scene: 0, pose: 7, light: 4, expr: 3 },
  { name: 'Beach Vibes', icon: '\uD83C\uDFD6\uFE0F', scene: 2, pose: 2, light: 0, expr: 2 },
  { name: 'Street Style', icon: '\uD83D\uDD25', scene: 1, pose: 9, light: 1, expr: 8 },
  { name: 'Editorial', icon: '\u2728', scene: 9, pose: 4, light: 2, expr: 0 },
  { name: 'Cozy Caf\u00e9', icon: '\u2615', scene: 3, pose: 1, light: 0, expr: 7 },
]

export function PhotoSession({ onNav }: { onNav?: (page: string) => void }) {
  const [tab, setTab] = useState<'scenario'|'pose'|'light'|'expression'>('scenario')
  const [selScene, setSelScene] = useState(0)
  const [selPose, setSelPose] = useState(0)
  const [selAngle, setSelAngle] = useState(0)
  const [selLight, setSelLight] = useState(0)
  const [selExpr, setSelExpr] = useState(4)
  const [sceneMode, setSceneMode] = useState<'preset'|'reference'|'prompt'>('preset')
  const [poseMode, setPoseMode] = useState<'preset'|'upload'>('preset')
  const [shotCount, setShotCount] = useState(4)
  const [activePreset, setActivePreset] = useState<number | null>(null)
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [selectedResolution, setSelectedResolution] = useState('1k')
  const [showEngineModal, setShowEngineModal] = useState(false)

  // Real character data
  const characters = useCharacterStore(s => s.characters)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)

  useEffect(() => {
    if (characters.length > 0 && !selectedCharId) {
      setSelectedCharId(characters[0].id)
    }
  }, [characters, selectedCharId])

  const selectedChar = characters.find(c => c.id === selectedCharId)

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedResult, setSelectedResult] = useState<number>(0)
  const abortRef = useRef<AbortController | null>(null)

  // Upload refs
  const scenarioInputRef = useRef<HTMLInputElement>(null)
  const poseInputRef = useRef<HTMLInputElement>(null)
  const [scenarioRefImages, setScenarioRefImages] = useState<{ file: File; preview: string }[]>([])
  const [poseRefImages, setPoseRefImages] = useState<{ file: File; preview: string }[]>([])

  // Custom scenario prompt
  const [scenarioPrompt, setScenarioPrompt] = useState('')

  // Credits & toast
  const { decrementCredits, restoreCredits } = useProfile()
  const toast = useToast()
  const galleryItems = useGalleryStore(s => s.items)
  const { pendingImage, pendingTarget, consume: consumeNav } = useNavigationStore()

  // Consume pending navigation (e.g. from Gallery → Session)
  useEffect(() => {
    if (pendingTarget === 'session' && pendingImage) {
      setSceneMode('reference')
      setTab('scenario')
      setScenarioRefImages([])
      // Create a file from the pending image and add as scenario ref
      fetch(pendingImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'gallery-ref.png', { type: blob.type || 'image/png' })
          setScenarioRefImages([{ file, preview: pendingImage }])
        })
        .catch(() => {})
      consumeNav()
    }
  }, [pendingTarget, pendingImage])

  const handleScenarioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return
    const files: File[] = []
    for (let i = 0; i < fileList.length; i++) files.push(fileList[i])
    const newRefs = files.slice(0, 3 - scenarioRefImages.length).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
    }))
    setScenarioRefImages(prev => [...prev, ...newRefs].slice(0, 3))
    e.target.value = ''
  }

  const handlePoseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return
    const files: File[] = []
    for (let i = 0; i < fileList.length; i++) files.push(fileList[i])
    const newRefs = files.slice(0, 3 - poseRefImages.length).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
    }))
    setPoseRefImages(prev => [...prev, ...newRefs].slice(0, 3))
    e.target.value = ''
  }

  const handleGenerate = async () => {
    if (!selectedChar) { toast.error('Select a character'); return }

    const costPerShot = OPERATION_CREDIT_COSTS.photoSession
    const totalCost = shotCount * costPerShot

    const ok = await decrementCredits(totalCost)
    if (!ok) { toast.error('Insufficient credits'); return }

    setGenerating(true)
    setProgress(0)
    abortRef.current = new AbortController()

    try {
      if (selectedChar.modelImageBlobs.length > 0) {
        const refFile = new File([selectedChar.modelImageBlobs[0]], 'reference.jpg', { type: 'image/jpeg' })

        const results = await generatePhotoSession(
          refFile,
          shotCount,
          {
            scenario: sceneMode === 'prompt' && scenarioPrompt.trim()
              ? scenarioPrompt.trim()
              : sceneMode === 'reference' && scenarioRefImages.length > 0
                ? 'Place the character in the exact same location/setting shown in the reference image. Match the lighting, colors and atmosphere.'
                : scenarios[selScene].name,
            lighting: lighting[selLight].n,
            angles: [angles[selAngle].n],
          },
          (p) => setProgress(p),
          abortRef.current.signal
        )

        const urls = results.map(r => r.url)
        setGeneratedImages(urls)
        setSelectedResult(0)

        const galleryItems: GalleryItem[] = urls.map((url) => ({
          id: crypto.randomUUID(),
          url,
          prompt: `${scenarios[selScene].name}, ${poses[selPose]}, ${lighting[selLight].n}`,
          model: 'gemini-photo-session',
          timestamp: Date.now(),
          type: 'session' as const,
          characterId: selectedChar.id,
          tags: ['photo-session', scenarios[selScene].name.toLowerCase()],
        }))

        useGalleryStore.getState().addItems(galleryItems)
        toast.success(`${urls.length} photos generated`)

      } else {
        const params: InfluencerParams = {
          characters: [{
            id: selectedChar.id,
            characteristics: selectedChar.characteristics || selectedChar.name,
            outfitDescription: selectedChar.outfitDescription || '',
            pose: poses[selPose],
            accessory: selectedChar.accessory || '',
          }],
          scenario: sceneMode === 'prompt' && scenarioPrompt.trim()
            ? scenarioPrompt.trim()
            : sceneMode === 'reference' && scenarioRefImages.length > 0
              ? 'Place the character in the exact same location/setting shown in the reference image. Match the lighting, colors and atmosphere.'
              : scenarios[selScene].name + ' \u2014 ' + scenarios[selScene].d,
          lighting: lighting[selLight].n,
          camera: angles[selAngle].n,
          imageSize: ImageSize.Size2K,
          aspectRatio: AspectRatio.Portrait,
          numberOfImages: shotCount,
          scenarioImage: scenarioRefImages.length > 0 ? scenarioRefImages.map(r => r.file) : undefined,
        }

        const results = await generateInfluencerImage(params, (p) => setProgress(p), abortRef.current.signal)
        setGeneratedImages(results)
        setSelectedResult(0)

        const galleryItems: GalleryItem[] = results.map((url) => ({
          id: crypto.randomUUID(),
          url,
          prompt: `${scenarios[selScene].name}, ${poses[selPose]}, ${lighting[selLight].n}`,
          model: 'gemini-nb2',
          timestamp: Date.now(),
          type: 'session' as const,
          characterId: selectedChar.id,
          tags: ['photo-session'],
        }))

        useGalleryStore.getState().addItems(galleryItems)
        toast.success(`${results.length} photos generated`)
      }

      useCharacterStore.getState().incrementUsage(selectedChar.id)

    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        restoreCredits(totalCost)
        toast.error('Error generating session')
        console.error(err)
      }
    } finally {
      setGenerating(false)
      setProgress(0)
    }
  }

  const applyPreset = (idx: number) => {
    const p = sessionPresets[idx]
    setSelScene(p.scene)
    setSelPose(p.pose)
    setSelLight(p.light)
    setSelExpr(p.expr)
    setActivePreset(idx)
  }

  const clearPreset = () => setActivePreset(null)

  const costPerShot = OPERATION_CREDIT_COSTS.photoSession

  const tabs = [
    { id:'scenario' as const, l:'Scenario', i:'\uD83C\uDF0D' },
    { id:'pose' as const, l:'Pose & Angle', i:'\uD83D\uDCD0' },
    { id:'light' as const, l:'Lighting', i:'\uD83D\uDCA1' },
    { id:'expression' as const, l:'Expression', i:'\uD83D\uDE0F' },
  ]

  return (
    <div className="h-screen flex gradient-mesh">
      {/* Left Panel */}
      <div className="w-[360px] shrink-0 flex flex-col" style={{ background:'var(--bg-1)', borderRight:'1px solid var(--border)' }}>
        <div className="px-5 h-14 flex items-center shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <h2 className="text-base font-bold" style={{ color:'var(--text-1)' }}>Photo <span className="text-gradient">Session</span></h2>
        </div>

        {/* Character selector */}
        <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Character</div>
          <div className="flex gap-2 items-center">
            {characters.length === 0 ? (
              <div className="text-[11px] py-2 flex-1" style={{ color:'var(--text-3)' }}>No characters created</div>
            ) : (
              characters.slice(0, 4).map(c => (
                <button key={c.id} onClick={() => setSelectedCharId(c.id)}
                  className="flex-1 py-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    background: selectedCharId === c.id ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                    border: `1px solid ${selectedCharId === c.id ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                    color: selectedCharId === c.id ? 'var(--accent)' : 'var(--text-2)',
                  }}>
                  {c.thumbnail ? (
                    <img src={c.thumbnail} className="w-5 h-5 rounded-full object-cover" alt="" />
                  ) : (
                    <span>{c.name[0]}</span>
                  )}
                  {c.name.split(' ')[0]}
                </button>
              ))
            )}
            {/* Engine selector wrench */}
            <div className="relative shrink-0">
              <button onClick={() => setShowEngineModal(!showEngineModal)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{
                  background: selectedEngine !== 'auto' ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                  border: `1px solid ${selectedEngine !== 'auto' ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                  color: selectedEngine !== 'auto' ? 'var(--accent)' : 'var(--text-3)',
                }}>
                {'\uD83D\uDD27'}
              </button>

              {/* Engine modal rendered at top level below */}
            </div>
          </div>
        </div>

        {/* Session Presets */}
        <div className="px-4 py-2.5 shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Quick Pack</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
            {sessionPresets.map((p, i) => (
              <button key={p.name} onClick={() => applyPreset(i)}
                className="shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
                style={{
                  background: activePreset === i ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                  border: `1px solid ${activePreset === i ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                  color: activePreset === i ? 'var(--accent)' : 'var(--text-2)',
                }}>
                <span>{p.icon}</span>{p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom:'1px solid var(--border)' }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="flex-1 py-2.5 text-[10px] font-medium relative transition-all"
              style={{ color: tab===t.id ? 'var(--accent)' : 'var(--text-3)' }}>
              <span className="block text-sm mb-0.5">{t.i}</span>{t.l}
              {tab===t.id && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background:'var(--accent)' }} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'scenario' && <>
            <div className="flex gap-1.5 p-1 rounded-xl" style={{ background:'var(--bg-3)' }}>
              {([
                { id: 'preset' as const, label: '◎ Presets' },
                { id: 'prompt' as const, label: '✎ Prompt' },
                { id: 'reference' as const, label: '↑ Reference' },
              ]).map(m=>(
                <button key={m.id} onClick={()=>setSceneMode(m.id)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: sceneMode===m.id ? 'rgba(240,104,72,.1)' : 'transparent', color: sceneMode===m.id ? 'var(--accent)' : 'var(--text-3)' }}>
                  {m.label}
                </button>
              ))}
            </div>

            {sceneMode === 'preset' && (
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map((s,i) => (
                  <button key={s.name} onClick={()=>{setSelScene(i);clearPreset()}}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: selScene===i ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                      border: `1px solid ${selScene===i ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                    }}>
                    <span className="text-lg">{s.icon}</span>
                    <div className="text-[11px] font-medium mt-1" style={{ color: selScene===i ? 'var(--accent)' : 'var(--text-2)' }}>{s.name}</div>
                    <div className="text-[9px]" style={{ color:'var(--text-3)' }}>{s.d}</div>
                  </button>
                ))}
              </div>
            )}

            {sceneMode === 'reference' && (
              <div className="space-y-3">
                {/* Upload drop zone */}
                <input ref={scenarioInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScenarioUpload} />
                <div className="rounded-xl p-4 text-center cursor-pointer transition-all hover:border-[var(--border-h)]"
                  style={{ background:'var(--bg-3)', border:'1px dashed var(--border)' }}
                  onClick={() => scenarioInputRef.current?.click()}>
                  {scenarioRefImages.length > 0 ? (
                    <img src={scenarioRefImages[0].preview} className="w-full h-20 object-cover rounded-lg" alt="" />
                  ) : (
                    <>
                      <div className="text-lg mb-1" style={{ color:'var(--accent)' }}>{'\u2191'}</div>
                      <div className="text-[10px]" style={{ color:'var(--text-2)' }}>Upload scenario image</div>
                    </>
                  )}
                </div>

                {/* From gallery */}
                {galleryItems.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color:'var(--text-3)' }}>From gallery</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {galleryItems.slice(0, 8).map(g => (
                        <button key={g.id} onClick={() => {
                          fetch(g.url).then(r => r.blob()).then(b => {
                            const file = new File([b], 'gallery-ref.png', { type: b.type || 'image/png' })
                            setScenarioRefImages([{ file, preview: g.url }])
                          })
                        }}
                          className="w-11 h-11 rounded-lg overflow-hidden transition-all hover:scale-105"
                          style={{ border: scenarioRefImages[0]?.preview === g.url ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
                          <img src={g.url} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* From characters */}
                {characters.filter(c => c.thumbnail).length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color:'var(--text-3)' }}>From characters</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {characters.filter(c => c.thumbnail).map(c => (
                        <button key={c.id} onClick={() => {
                          fetch(c.thumbnail).then(r => r.blob()).then(b => {
                            const file = new File([b], `${c.name}-ref.png`, { type: b.type || 'image/png' })
                            setScenarioRefImages([{ file, preview: c.thumbnail }])
                          })
                        }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] transition-all"
                          style={{
                            background: scenarioRefImages[0]?.preview === c.thumbnail ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                            border: `1px solid ${scenarioRefImages[0]?.preview === c.thumbnail ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                            color: scenarioRefImages[0]?.preview === c.thumbnail ? 'var(--accent)' : 'var(--text-2)',
                          }}>
                          <img src={c.thumbnail} className="w-5 h-5 rounded-full object-cover" alt="" />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {sceneMode === 'prompt' && (
              <div className="space-y-2">
                <textarea rows={4} placeholder="Describe the scenario in detail... E.g.: Terrace overlooking the Mediterranean sea, pink sunset, tropical plants..."
                  className="w-full px-3 py-3 rounded-xl text-xs border outline-none resize-none transition-colors"
                  style={{ background:'var(--bg-3)', borderColor:'var(--border)', color:'var(--text-1)' }}
                  value={scenarioPrompt}
                  onChange={e => setScenarioPrompt(e.target.value)} />
                <div className="flex gap-1.5 flex-wrap">
                  {['Café in Paris', 'Neon city at night', 'Enchanted forest', 'Rooftop sunset', 'Underwater', 'Space station'].map(q => (
                    <button key={q} onClick={() => setScenarioPrompt(q)}
                      className="px-2 py-1 rounded-md text-[9px] transition-all hover:scale-105"
                      style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
          </>}

          {tab === 'pose' && <>
            <div className="flex gap-1.5 p-1 rounded-xl" style={{ background:'var(--bg-3)' }}>
              {(['preset','upload'] as const).map(m=>(
                <button key={m} onClick={()=>setPoseMode(m)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{ background: poseMode===m ? 'var(--bg-4)' : 'transparent', color: poseMode===m ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {m==='preset' ? '\u25CE Presets' : '\u2191 Upload Reference'}
                </button>
              ))}
            </div>

            {poseMode === 'preset' ? <>
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Pose</div>
              <div className="grid grid-cols-2 gap-1.5">
                {poses.map((p,i) => (
                  <button key={p} onClick={()=>{setSelPose(i);clearPreset()}}
                    className="px-3 py-2 rounded-xl text-[11px] transition-all"
                    style={{
                      background: selPose===i ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                      border: `1px solid ${selPose===i ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                      color: selPose===i ? 'var(--accent)' : 'var(--text-2)',
                    }}>{p}</button>
                ))}
              </div>
              <div className="text-[9px] font-mono uppercase tracking-wider mt-2" style={{ color:'var(--text-3)' }}>Camera Angle</div>
              <div className="grid grid-cols-4 gap-1.5">
                {angles.map((a,i) => (
                  <button key={a.n} onClick={()=>{setSelAngle(i);clearPreset()}}
                    className="py-2.5 rounded-xl text-center transition-all"
                    style={{
                      background: selAngle===i ? 'rgba(208,72,176,.08)' : 'var(--bg-3)',
                      border: `1px solid ${selAngle===i ? 'rgba(208,72,176,.2)' : 'var(--border)'}`,
                    }}>
                    <span className="text-base block" style={{ color: selAngle===i ? 'var(--blue)' : 'var(--text-3)' }}>{a.i}</span>
                    <span className="text-[8px] block mt-0.5" style={{ color: selAngle===i ? 'var(--blue)' : 'var(--text-3)' }}>{a.n}</span>
                  </button>
                ))}
              </div>
            </> : (
              <div className="space-y-3">
                <input ref={poseInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePoseUpload} />
                <div className="rounded-xl p-6 text-center cursor-pointer transition-all hover:border-[var(--border-h)]"
                  style={{ background:'var(--bg-3)', border:'1px dashed var(--border)' }}
                  onClick={() => poseInputRef.current?.click()}>
                  <div className="text-2xl mb-2" style={{ color:'var(--blue)' }}>{'\u2191'}</div>
                  <div className="text-[11px]" style={{ color:'var(--text-2)' }}>Upload a pose photo as reference</div>
                  <div className="text-[9px] mt-1" style={{ color:'var(--text-3)' }}>Your character will replicate the photo pose</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0,1,2].map(i => (
                    <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden"
                      style={{ background:'var(--bg-3)', border:'1px solid var(--border)' }}>
                      {poseRefImages[i] ? (
                        <img src={poseRefImages[i].preview} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full shimmer" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}

          {tab === 'light' && (
            <div className="space-y-4">
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Lighting Preset</div>
              <div className="grid grid-cols-3 gap-2">
                {lighting.map((l,i) => (
                  <button key={l.n} onClick={()=>{setSelLight(i);clearPreset()}}
                    className="py-3 rounded-xl text-center transition-all"
                    style={{
                      background: selLight===i ? `${l.c}12` : 'var(--bg-3)',
                      border: `1px solid ${selLight===i ? `${l.c}40` : 'var(--border)'}`,
                    }}>
                    <div className="w-5 h-5 rounded-full mx-auto mb-1.5" style={{ background:l.c, boxShadow:`0 0 10px ${l.c}50` }} />
                    <span className="text-[9px]" style={{ color: selLight===i ? l.c : 'var(--text-3)' }}>{l.n}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-3 mt-2">
                {['Intensity','Direction','Shadows','Temperature','Ambient'].map(s => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="text-[10px] w-24 shrink-0" style={{ color:'var(--text-2)' }}>{s}</span>
                    <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'expression' && (
            <div className="space-y-4">
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Facial Expression</div>
              <div className="grid grid-cols-2 gap-1.5">
                {expressions.map((e,i) => (
                  <button key={e} onClick={()=>{setSelExpr(i);clearPreset()}}
                    className="px-3 py-2 rounded-xl text-[11px] transition-all"
                    style={{
                      background: selExpr===i ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                      border: `1px solid ${selExpr===i ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                      color: selExpr===i ? 'var(--accent)' : 'var(--text-2)',
                    }}>{e}</button>
                ))}
              </div>
              <div className="space-y-3 mt-2">
                <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--text-3)' }}>Fine Tuning</div>
                {['Smile Intensity','Eye Opening','Brow Elevation','Gaze Direction','Head Turn'].map(s => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="text-[10px] w-32 shrink-0" style={{ color:'var(--text-2)' }}>{s}</span>
                    <input type="range" min={0} max={100} defaultValue={50} className="flex-1 slider-t" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 shrink-0 space-y-3" style={{ borderTop:'1px solid var(--border)' }}>
          {/* Image count selector */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--text-3)' }}>Number of Photos</div>
            <div className="flex gap-1.5">
              {[1,2,3,4,5,6,7,8].map(n => (
                <button key={n} onClick={() => setShotCount(n)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: shotCount === n ? 'rgba(240,104,72,.12)' : 'var(--bg-3)',
                    border: `1px solid ${shotCount === n ? 'rgba(240,104,72,.25)' : 'var(--border)'}`,
                    color: shotCount === n ? 'var(--accent)' : 'var(--text-3)',
                  }}>{n}</button>
              ))}
            </div>
            <div className="mt-1.5 flex justify-end">
              <span className="badge text-[9px]" style={{ background:'rgba(240,104,72,.08)', color:'var(--accent)', border:'1px solid rgba(240,104,72,.15)' }}>
                {shotCount * costPerShot} credits
              </span>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating || !selectedChar}
            className="btn-primary w-full py-3 text-sm"
            style={{ opacity: (!selectedChar || generating) ? 0.5 : 1 }}>
            {generating ? `\u27F3 Generating... ${Math.round(progress)}%` : '\u2726 Generate Photo Session'}
          </button>
        </div>
      </div>

      {/* Center Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="h-11 flex items-center px-4 gap-1.5 shrink-0" style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-1)' }}>
          {['\u21BA','\u21BB','\uD83D\uDD0D','\u2702','\u27F2 Variations','\uD83D\uDCBE'].map(t => (
            <button key={t} className="px-2.5 py-1 rounded-md text-[11px] transition-colors hover:bg-white/5" style={{ color:'var(--text-2)' }}>{t}</button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] font-mono" style={{ color:'var(--text-3)' }}>1024 {'\u00d7'} 1024</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-[520px] h-[520px] rounded-3xl relative overflow-hidden"
            style={{ background:'var(--bg-2)', border:'1px solid var(--border)' }}>

            {generatedImages.length > 0 ? (
              <img src={generatedImages[selectedResult]} className="w-full h-full object-cover" alt="Generated" />
            ) : (
              <div className="absolute inset-0" style={{
                background:`linear-gradient(135deg, ${lighting[selLight].c}15 0%, var(--bg-2) 60%, ${lighting[selLight].c}08 100%)`
              }}>
                <div className="absolute inset-0 flex items-center justify-center opacity-15"><span className="text-[100px]">{scenarios[selScene].icon}</span></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                  <div className="w-36 h-64 rounded-t-full opacity-15" style={{ background:`linear-gradient(180deg,${lighting[selLight].c}30, var(--bg-3))` }} />
                </div>
              </div>
            )}

            <div className="absolute top-3 left-3 right-3 flex justify-between">
              <div className="px-2.5 py-1 rounded-md text-[10px] font-mono backdrop-blur-sm"
                style={{ background:'rgba(0,0,0,.4)', color:'var(--text-1)' }}>{scenarios[selScene].name}</div>
              <div className="px-2.5 py-1 rounded-md text-[10px] font-mono backdrop-blur-sm"
                style={{ background:'rgba(0,0,0,.4)', color:lighting[selLight].c }}>{lighting[selLight].n}</div>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 justify-center">
              {[poses[selPose], angles[selAngle].n, expressions[selExpr]].map((t,i)=>(
                <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-mono backdrop-blur-sm"
                  style={{ background:'rgba(0,0,0,.4)', color: i===0?'var(--accent)':i===1?'var(--blue)':'var(--rose)' }}>{t}</span>
              ))}
            </div>

            {generatedImages.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center pulse-soft"
                    style={{ background:'rgba(240,104,72,.1)', border:'1px solid rgba(240,104,72,.2)' }}>
                    <span className="text-xl">{'\u25CE'}</span>
                  </div>
                  <p className="text-[11px]" style={{ color:'var(--text-3)' }}>Configure and generate</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-20 flex items-center px-5 gap-2.5 shrink-0" style={{ borderTop:'1px solid var(--border)', background:'var(--bg-1)' }}>
          <span className="text-[9px] font-mono shrink-0 mr-1" style={{ color:'var(--text-3)' }}>RECENT</span>
          {generatedImages.length > 0 ? (
            generatedImages.map((url, i) => (
              <div key={i} onClick={() => setSelectedResult(i)}
                className="w-12 h-12 rounded-xl shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                style={{ border: `2px solid ${selectedResult === i ? 'var(--accent)' : 'var(--border)'}` }}>
                <img src={url} className="w-full h-full object-cover" alt="" />
              </div>
            ))
          ) : (
            [1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="w-12 h-12 rounded-xl shrink-0 cursor-pointer hover:scale-105 transition-transform shimmer"
                style={{ border:'1px solid var(--border)' }} />
            ))
          )}
        </div>
      </div>
      {/* Engine selector modal — rendered at top level for correct positioning */}
      {showEngineModal && <>
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowEngineModal(false)} />
        <div className="fixed z-50 w-[340px] max-h-[90vh] flex flex-col rounded-2xl backdrop-blur-xl"
          style={{ top:'50%', left:'calc(50% + 110px)', transform:'translate(-50%,-50%)', background:'rgba(14,12,20,.95)', border:'1px solid var(--border)', boxShadow:'0 20px 60px rgba(0,0,0,.6)', overflow:'hidden' }}>
          {/* Scrollable engine list */}
          <div className="overflow-y-auto p-3 pb-2 space-y-1 flex-1 min-h-0">
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2 px-1" style={{ color:'var(--text-3)' }}>Engine</div>

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
                <span className="text-sm" style={{ color:'var(--text-3)' }}>⚙</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? 'var(--accent)' : 'var(--text-1)' }}>{eng.userFriendlyName}</div>
                  <div className="text-[9px]" style={{ color:'var(--text-3)' }}>{eng.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] font-mono" style={{ color:'var(--accent)' }}>{eng.creditCost}cr</div>
                  <div className="text-[8px] font-mono" style={{ color:'var(--text-3)' }}>{eng.estimatedTime}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Sticky resolution footer */}
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

export default PhotoSession
