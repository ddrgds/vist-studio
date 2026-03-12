import React, { useState, useRef, useEffect } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { generateInfluencerImage } from '../services/geminiService'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { ImageSize, AspectRatio, ENGINE_METADATA, OPERATION_CREDIT_COSTS } from '../types'
import type { InfluencerParams } from '../types'
import { POSE_OPTIONS, CAMERA_OPTIONS, LIGHTING_OPTIONS, INSPIRATIONS } from '../data/directorOptions'
import type { ChipOption } from '../data/directorOptions'
import { ENHANCERS, buildEnhancerPrompt } from '../data/enhancers'

// ─── Accordion Section ─────────────────────────────────
const AccordionSection: React.FC<{
  title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode
}> = ({ title, isOpen, onToggle, children }) => (
  <div style={{ borderBottom: '1px solid var(--border)' }}>
    <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center justify-between"
      style={{ color: 'var(--text-2)' }}>
      <span className="text-[9px] font-mono uppercase tracking-wider">{title}</span>
      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{isOpen ? '\u25B2' : '\u25BC'}</span>
    </button>
    {isOpen && <div className="px-4 pb-3">{children}</div>}
  </div>
)

// ─── Option Chip ────────────────────────────────────────
const OptionChip: React.FC<{
  option: ChipOption; selected: boolean; onClick: () => void
}> = ({ option, selected, onClick }) => (
  <button onClick={onClick}
    className="px-2.5 py-1.5 rounded-xl text-[10px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
    style={{
      background: selected ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
      border: `1px solid ${selected ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
      color: selected ? 'var(--accent)' : 'var(--text-2)',
    }}>
    <span>{option.icon}</span>{option.label}
  </button>
)

// ─── Enhancer Chip ──────────────────────────────────────
const EnhancerChip: React.FC<{
  enhancer: { id: string; label: string; icon: string }; selected: boolean; onClick: () => void
}> = ({ enhancer, selected, onClick }) => (
  <button onClick={onClick}
    className="px-2.5 py-1.5 rounded-xl text-[10px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
    style={{
      background: selected ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
      border: `1px solid ${selected ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
      color: selected ? 'var(--accent)' : 'var(--text-2)',
    }}>
    <span>{enhancer.icon}</span>{enhancer.label}
  </button>
)

// ─── Image Upload Slot ──────────────────────────────────
const ImageSlot: React.FC<{
  label: string; file: File | null; preview: string | null;
  onUpload: (file: File) => void; onRemove: () => void
}> = ({ label, file, preview, onUpload, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
      {preview ? (
        <div className="relative w-16 h-16 rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(240,104,72,.2)' }}>
          <img src={preview} className="w-full h-full object-cover" alt="" />
          <button onClick={onRemove}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
            style={{ background: 'rgba(0,0,0,.7)', color: 'var(--text-1)' }}>{'\u2715'}</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all hover:border-[var(--border-h)]"
          style={{ background: 'var(--bg-3)', border: '1px dashed var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--accent)' }}>{'\u2191'}</span>
          <span className="text-[8px] mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</span>
        </button>
      )}
    </div>
  )
}

export function Director({ onNav }: { onNav?: (page: string) => void }) {
  // ── Character ──
  const characters = useCharacterStore(s => s.characters)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [characteristics, setCharacteristics] = useState('')

  useEffect(() => {
    if (characters.length > 0 && !selectedCharId) {
      setSelectedCharId(characters[0].id)
    }
  }, [characters, selectedCharId])

  const selectedChar = characters.find(c => c.id === selectedCharId)

  // Sync characteristics textarea when character changes
  useEffect(() => {
    if (selectedChar) {
      setCharacteristics(selectedChar.characteristics || '')
    }
  }, [selectedChar?.id])

  // ── Reference images ──
  const [faceRefs, setFaceRefs] = useState<{ file: File; preview: string }[]>([])
  const [outfitRef, setOutfitRef] = useState<{ file: File; preview: string } | null>(null)
  const [poseRef, setPoseRef] = useState<{ file: File; preview: string } | null>(null)
  const [scenarioRef, setScenarioRef] = useState<{ file: File; preview: string } | null>(null)
  const faceInputRef = useRef<HTMLInputElement>(null)

  // ── Chip selections ──
  const [selectedPose, setSelectedPose] = useState<string>('')
  const [selectedCamera, setSelectedCamera] = useState<string>('portrait')
  const [selectedLighting, setSelectedLighting] = useState<string>('natural')
  const [customPose, setCustomPose] = useState('')
  const [customCamera, setCustomCamera] = useState('')
  const [customLighting, setCustomLighting] = useState('')

  // ── Scenario ──
  const [scenario, setScenario] = useState('')

  // ── Outfit ──
  const [outfitDescription, setOutfitDescription] = useState('')

  // ── Enhancers ──
  const [selectedEnhancers, setSelectedEnhancers] = useState<Set<string>>(new Set())
  const [customEnhancer, setCustomEnhancer] = useState('')

  // ── Engine & generation ──
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [selectedResolution, setSelectedResolution] = useState('2k')
  const [showEngineModal, setShowEngineModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedResult, setSelectedResult] = useState(0)
  const [numberOfImages, setNumberOfImages] = useState(1)
  const abortRef = useRef<AbortController | null>(null)

  // Credits & toast
  const { decrementCredits, restoreCredits } = useProfile()
  const toast = useToast()

  // ── Accordion state (persisted to localStorage) ──
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('vertex-director-sections')
      return s ? JSON.parse(s) : { identity: true, outfit: false, pose: false, camera: false, lighting: false, scenario: true, enhancers: false }
    } catch { return { identity: true, scenario: true } }
  })

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('vertex-director-sections', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const toggleEnhancer = (id: string) => {
    setSelectedEnhancers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleFaceRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && faceRefs.length < 3) {
      setFaceRefs(prev => [...prev, { file, preview: URL.createObjectURL(file) }])
    }
    e.target.value = ''
  }

  // ── Build params ──
  const buildParams = (): InfluencerParams => {
    const poseValue = customPose.trim() || POSE_OPTIONS.find(p => p.id === selectedPose)?.value || ''
    const cameraValue = customCamera.trim() || CAMERA_OPTIONS.find(c => c.id === selectedCamera)?.value || 'shot on 85mm lens, shallow depth of field'
    const lightingValue = customLighting.trim() || LIGHTING_OPTIONS.find(l => l.id === selectedLighting)?.value || 'soft natural light'
    const enhancerPrompt = buildEnhancerPrompt(selectedEnhancers, customEnhancer)

    // Build model images: character store blobs + manually uploaded face refs
    const modelImages: File[] = []
    if (selectedChar && selectedChar.modelImageBlobs.length > 0) {
      selectedChar.modelImageBlobs.forEach((blob, i) => {
        modelImages.push(new File([blob], `face-ref-${i}.jpg`, { type: 'image/jpeg' }))
      })
    }
    faceRefs.forEach(f => modelImages.push(f.file))

    const scenarioText = [scenario, enhancerPrompt].filter(Boolean).join('. ').trim()

    // Resolve engine model
    let model = undefined as any
    if (selectedEngine !== 'auto') {
      const eng = ENGINE_METADATA.find(e => e.key === selectedEngine)
      if (eng) model = eng.geminiModel
    }

    // Resolve image size from resolution picker
    const imageSizeMap: Record<string, ImageSize> = { '1k': ImageSize.Size1K, '2k': ImageSize.Size2K, '4k': ImageSize.Size4K }
    const imageSize = imageSizeMap[selectedResolution] || ImageSize.Size2K

    return {
      characters: [{
        id: selectedChar?.id || 'director-char',
        characteristics: characteristics || selectedChar?.characteristics || '',
        outfitDescription: outfitRef
          ? '[OUTFIT FROM REFERENCE IMAGE] Extract garment only from the outfit reference, apply to character. Ignore person in outfit photo.'
          : (outfitDescription || selectedChar?.outfitDescription || ''),
        pose: poseValue,
        accessory: selectedChar?.accessory || '',
        modelImages,
        outfitImages: outfitRef ? [outfitRef.file] : [],
        poseImage: poseRef ? poseRef.file : undefined,
      }],
      scenario: scenarioText || 'professional photo shoot',
      scenarioImage: scenarioRef ? [scenarioRef.file] : undefined,
      lighting: lightingValue,
      camera: cameraValue,
      imageSize,
      aspectRatio: AspectRatio.Portrait,
      numberOfImages,
      model,
    }
  }

  // ── Generate ──
  const handleGenerate = async () => {
    // Validate — need either a character or face refs
    const hasIdentity = selectedChar || faceRefs.length > 0
    if (!hasIdentity) {
      toast.error('Select a character or upload face references')
      return
    }

    const costPerShot = OPERATION_CREDIT_COSTS.photoSession
    const totalCost = numberOfImages * costPerShot

    const ok = await decrementCredits(totalCost)
    if (!ok) { toast.error('Insufficient credits'); return }

    setGenerating(true)
    setProgress(0)
    abortRef.current = new AbortController()

    try {
      const params = buildParams()
      const results = await generateInfluencerImage(params, (p) => setProgress(p), abortRef.current.signal)

      setGeneratedImages(results)
      setSelectedResult(0)

      // Determine engine label
      let engineLabel = 'gemini-nb2'
      if (selectedEngine !== 'auto') {
        const eng = ENGINE_METADATA.find(e => e.key === selectedEngine)
        if (eng) engineLabel = eng.userFriendlyName
      }

      // Save to gallery
      const items: GalleryItem[] = results.map((url) => ({
        id: crypto.randomUUID(),
        url,
        prompt: scenario || 'Director hero shot',
        model: engineLabel,
        timestamp: Date.now(),
        type: 'create' as const,
        characterId: selectedChar?.id,
        tags: ['director', 'hero-shot'],
      }))

      useGalleryStore.getState().addItems(items)
      if (selectedChar) useCharacterStore.getState().incrementUsage(selectedChar.id)
      toast.success(`${results.length} hero shot${results.length > 1 ? 's' : ''} generated`)

    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        restoreCredits(totalCost)
        toast.error('Error generating hero shot')
        console.error(err)
      }
    } finally {
      setGenerating(false)
      setProgress(0)
    }
  }

  const costPerShot = OPERATION_CREDIT_COSTS.photoSession
  const activeEngineLabel = selectedEngine === 'auto' ? 'Auto' : (ENGINE_METADATA.find(e => e.key === selectedEngine)?.userFriendlyName || selectedEngine)

  return (
    <div className="h-screen flex gradient-mesh">
      {/* Hidden file input for face refs */}
      <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={handleFaceRefUpload} />

      {/* ── Left Panel ── */}
      <div className="w-[360px] shrink-0 flex flex-col" style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border)' }}>
        <div className="px-5 h-14 flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>
            {'\u2726'} <span className="text-gradient">Director</span>
          </h2>
        </div>

        {/* Scrollable accordion sections */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

          {/* ── IDENTITY ── */}
          <AccordionSection title="Identity" isOpen={!!openSections.identity} onToggle={() => toggleSection('identity')}>
            <div className="space-y-3">
              {/* Character chips */}
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>Character</div>
                <div className="flex gap-1.5 flex-wrap">
                  {characters.length === 0 ? (
                    <div className="text-[11px] py-2" style={{ color: 'var(--text-3)' }}>No characters created</div>
                  ) : (
                    characters.slice(0, 6).map(c => (
                      <button key={c.id} onClick={() => setSelectedCharId(c.id)}
                        className="px-2.5 py-1.5 rounded-xl text-[10px] font-medium flex items-center gap-1.5 transition-all"
                        style={{
                          background: selectedCharId === c.id ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                          border: `1px solid ${selectedCharId === c.id ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                          color: selectedCharId === c.id ? 'var(--accent)' : 'var(--text-2)',
                        }}>
                        {c.thumbnail ? (
                          <img src={c.thumbnail} className="w-4 h-4 rounded-full object-cover" alt="" />
                        ) : (
                          <span className="text-[10px]">{c.name[0]}</span>
                        )}
                        {c.name.split(' ')[0]}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Face reference slots */}
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
                  Face refs <span style={{ opacity: 0.5 }}>({faceRefs.length}/3)</span>
                </div>
                <div className="flex gap-2">
                  {faceRefs.map((ref, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(240,104,72,.2)' }}>
                      <img src={ref.preview} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => { URL.revokeObjectURL(ref.preview); setFaceRefs(prev => prev.filter((_, j) => j !== i)) }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                        style={{ background: 'rgba(0,0,0,.7)', color: 'var(--text-1)' }}>{'\u2715'}</button>
                    </div>
                  ))}
                  {faceRefs.length < 3 && (
                    <button onClick={() => faceInputRef.current?.click()}
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all hover:border-[var(--border-h)]"
                      style={{ background: 'var(--bg-3)', border: '1px dashed var(--border)' }}>
                      <span className="text-xs" style={{ color: 'var(--accent)' }}>{'\u2191'}</span>
                      <span className="text-[7px] mt-0.5" style={{ color: 'var(--text-3)' }}>Face</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Characteristics textarea */}
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Characteristics</div>
                <textarea
                  rows={2}
                  placeholder="e.g. Freckles, green eyes, wavy auburn hair..."
                  className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none transition-colors"
                  style={{ background: 'var(--bg-3)', borderColor: characteristics ? 'rgba(240,104,72,.2)' : 'var(--border)', color: 'var(--text-1)' }}
                  value={characteristics}
                  onChange={e => setCharacteristics(e.target.value)}
                />
              </div>
            </div>
          </AccordionSection>

          {/* ── OUTFIT ── */}
          <AccordionSection title="Outfit" isOpen={!!openSections.outfit} onToggle={() => toggleSection('outfit')}>
            <div className="space-y-3">
              <div className="flex gap-2 items-start">
                <ImageSlot
                  label="Outfit"
                  file={outfitRef?.file || null}
                  preview={outfitRef?.preview || null}
                  onUpload={f => setOutfitRef({ file: f, preview: URL.createObjectURL(f) })}
                  onRemove={() => { if (outfitRef) URL.revokeObjectURL(outfitRef.preview); setOutfitRef(null) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
                    {outfitRef ? 'Outfit from image' : 'Description'}
                  </div>
                  {outfitRef ? (
                    <div className="text-[10px] p-2 rounded-lg" style={{ background: 'rgba(240,104,72,.05)', color: 'var(--text-2)', border: '1px solid rgba(240,104,72,.1)' }}>
                      AI will extract garment from image and apply to character
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      placeholder="e.g. Black leather jacket, white t-shirt..."
                      className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none transition-colors"
                      style={{ background: 'var(--bg-3)', borderColor: outfitDescription ? 'rgba(240,104,72,.2)' : 'var(--border)', color: 'var(--text-1)' }}
                      value={outfitDescription}
                      onChange={e => setOutfitDescription(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* ── POSE ── */}
          <AccordionSection title="Pose" isOpen={!!openSections.pose} onToggle={() => toggleSection('pose')}>
            <div className="space-y-3">
              <div className="flex gap-2 items-start">
                <ImageSlot
                  label="Pose"
                  file={poseRef?.file || null}
                  preview={poseRef?.preview || null}
                  onUpload={f => setPoseRef({ file: f, preview: URL.createObjectURL(f) })}
                  onRemove={() => { if (poseRef) URL.revokeObjectURL(poseRef.preview); setPoseRef(null) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1.5 flex-wrap">
                    {POSE_OPTIONS.map(p => (
                      <OptionChip key={p.id} option={p} selected={selectedPose === p.id && !customPose} onClick={() => { setSelectedPose(p.id); setCustomPose('') }} />
                    ))}
                  </div>
                </div>
              </div>
              <input type="text" placeholder="Or describe a custom pose..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none transition-colors"
                style={{ background: 'var(--bg-3)', borderColor: customPose ? 'rgba(240,104,72,.2)' : 'var(--border)', color: 'var(--text-1)' }}
                value={customPose}
                onChange={e => setCustomPose(e.target.value)} />
            </div>
          </AccordionSection>

          {/* ── CAMERA ── */}
          <AccordionSection title="Camera" isOpen={!!openSections.camera} onToggle={() => toggleSection('camera')}>
            <div className="space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {CAMERA_OPTIONS.map(c => (
                  <OptionChip key={c.id} option={c} selected={selectedCamera === c.id && !customCamera} onClick={() => { setSelectedCamera(c.id); setCustomCamera('') }} />
                ))}
              </div>
              <input type="text" placeholder="Or describe custom camera..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none transition-colors"
                style={{ background: 'var(--bg-3)', borderColor: customCamera ? 'rgba(240,104,72,.2)' : 'var(--border)', color: 'var(--text-1)' }}
                value={customCamera}
                onChange={e => setCustomCamera(e.target.value)} />
            </div>
          </AccordionSection>

          {/* ── LIGHTING ── */}
          <AccordionSection title="Lighting" isOpen={!!openSections.lighting} onToggle={() => toggleSection('lighting')}>
            <div className="space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {LIGHTING_OPTIONS.map(l => (
                  <OptionChip key={l.id} option={l} selected={selectedLighting === l.id && !customLighting} onClick={() => { setSelectedLighting(l.id); setCustomLighting('') }} />
                ))}
              </div>
              <input type="text" placeholder="Or describe custom lighting..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none transition-colors"
                style={{ background: 'var(--bg-3)', borderColor: customLighting ? 'rgba(240,104,72,.2)' : 'var(--border)', color: 'var(--text-1)' }}
                value={customLighting}
                onChange={e => setCustomLighting(e.target.value)} />
            </div>
          </AccordionSection>

          {/* ── SCENARIO ── */}
          <AccordionSection title="Scenario" isOpen={!!openSections.scenario} onToggle={() => toggleSection('scenario')}>
            <div className="space-y-3">
              <textarea
                rows={3}
                placeholder="Describe the scene, environment, mood..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none transition-colors"
                style={{ background: 'var(--bg-3)', borderColor: scenario ? 'rgba(240,104,72,.2)' : 'var(--border)', color: 'var(--text-1)' }}
                value={scenario}
                onChange={e => setScenario(e.target.value)}
              />

              {/* Inspirations grid */}
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>Inspirations</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {INSPIRATIONS.map(ins => (
                    <button key={ins.id} onClick={() => setScenario(ins.scene)}
                      className="px-2 py-1.5 rounded-xl text-[9px] font-medium flex items-center gap-1 transition-all whitespace-nowrap overflow-hidden"
                      style={{
                        background: scenario === ins.scene ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                        border: `1px solid ${scenario === ins.scene ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                        color: scenario === ins.scene ? 'var(--accent)' : 'var(--text-2)',
                      }}>
                      <span>{ins.emoji}</span>
                      <span className="truncate">{ins.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scene reference image */}
              <div className="flex items-center gap-2">
                <ImageSlot
                  label="Scene"
                  file={scenarioRef?.file || null}
                  preview={scenarioRef?.preview || null}
                  onUpload={f => setScenarioRef({ file: f, preview: URL.createObjectURL(f) })}
                  onRemove={() => { if (scenarioRef) URL.revokeObjectURL(scenarioRef.preview); setScenarioRef(null) }}
                />
                <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>Scene reference (optional)</span>
              </div>
            </div>
          </AccordionSection>

          {/* ── ENHANCERS ── */}
          <AccordionSection title={`Enhancers${selectedEnhancers.size > 0 ? ` (${selectedEnhancers.size})` : ''}`} isOpen={!!openSections.enhancers} onToggle={() => toggleSection('enhancers')}>
            <div className="space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {ENHANCERS.map(e => (
                  <EnhancerChip key={e.id} enhancer={e} selected={selectedEnhancers.has(e.id)} onClick={() => toggleEnhancer(e.id)} />
                ))}
              </div>
              <input type="text" placeholder="Custom enhancer text..."
                className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none transition-colors"
                style={{ background: 'var(--bg-3)', borderColor: customEnhancer ? 'rgba(240,104,72,.2)' : 'var(--border)', color: 'var(--text-1)' }}
                value={customEnhancer}
                onChange={e => setCustomEnhancer(e.target.value)} />
            </div>
          </AccordionSection>
        </div>

        {/* ── Bottom fixed area: number of images + generate + engine ── */}
        <div className="px-4 py-3 shrink-0 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Images</div>
              <button onClick={() => setShowEngineModal(!showEngineModal)}
                className="px-2 py-0.5 rounded-lg text-[9px] font-mono transition-all"
                style={{
                  background: selectedEngine !== 'auto' ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                  border: `1px solid ${selectedEngine !== 'auto' ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                  color: selectedEngine !== 'auto' ? 'var(--accent)' : 'var(--text-3)',
                }}>
                {'\uD83D\uDD27'} {activeEngineLabel}
              </button>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setNumberOfImages(n)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: numberOfImages === n ? 'rgba(240,104,72,.12)' : 'var(--bg-3)',
                    border: `1px solid ${numberOfImages === n ? 'rgba(240,104,72,.25)' : 'var(--border)'}`,
                    color: numberOfImages === n ? 'var(--accent)' : 'var(--text-3)',
                  }}>{n}</button>
              ))}
            </div>
            <div className="mt-1.5 flex items-center justify-end">
              <span className="badge text-[9px] shrink-0" style={{ background: 'rgba(240,104,72,.08)', color: 'var(--accent)', border: '1px solid rgba(240,104,72,.15)' }}>
                {numberOfImages * costPerShot} credits
              </span>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating || (!selectedChar && faceRefs.length === 0)}
            className="btn-primary w-full py-3 text-sm"
            style={{ opacity: (generating || (!selectedChar && faceRefs.length === 0)) ? 0.5 : 1 }}>
            {generating ? `\u27F3 Generating... ${Math.round(progress)}%` : `\u2726 Generate Hero Shot`}
          </button>
        </div>
      </div>

      {/* ── Center Canvas ── */}
      <div className="flex-1 flex flex-col">
        <div className="h-11 flex items-center px-4 gap-1.5 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
            {'\u2726'} Director
          </span>
          <div className="flex-1" />
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
            {activeEngineLabel} {'\u00b7'} {numberOfImages} image{numberOfImages > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-[520px] h-[520px] rounded-3xl relative overflow-hidden"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>

            {generatedImages.length > 0 ? (
              <img src={generatedImages[selectedResult]} className="w-full h-full object-cover" alt="Generated hero shot" />
            ) : (
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(135deg, rgba(240,104,72,.06) 0%, var(--bg-2) 50%, rgba(208,72,176,.04) 100%)'
              }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center pulse-soft"
                      style={{ background: 'rgba(240,104,72,.1)', border: '1px solid rgba(240,104,72,.2)' }}>
                      <span className="text-xl">{'\u2726'}</span>
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Configure and generate your hero shot</p>
                  </div>
                </div>
              </div>
            )}

            {/* Badges overlay */}
            {scenario && (
              <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono backdrop-blur-sm"
                  style={{ background: 'rgba(0,0,0,.4)', color: 'var(--text-1)' }}>
                  {scenario.length > 40 ? scenario.slice(0, 40) + '...' : scenario}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom filmstrip */}
        <div className="h-20 flex items-center px-5 gap-2.5 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          <span className="text-[9px] font-mono shrink-0 mr-1" style={{ color: 'var(--text-3)' }}>SHOTS</span>
          {generatedImages.length > 0 ? (
            generatedImages.map((url, i) => (
              <div key={i} onClick={() => setSelectedResult(i)}
                className="w-12 h-12 rounded-xl shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                style={{ border: `2px solid ${selectedResult === i ? 'var(--accent)' : 'var(--border)'}` }}>
                <img src={url} className="w-full h-full object-cover" alt="" />
              </div>
            ))
          ) : (
            Array.from({ length: numberOfImages }, (_, i) => (
              <div key={i} className="w-12 h-12 rounded-xl shrink-0 shimmer"
                style={{ border: '1px solid var(--border)' }} />
            ))
          )}
        </div>
      </div>

      {/* ── Engine selector modal ── */}
      {showEngineModal && <>
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowEngineModal(false)} />
        <div className="fixed z-50 w-[340px] max-h-[90vh] flex flex-col rounded-2xl backdrop-blur-xl"
          style={{ top: '50%', left: 'calc(50% + 110px)', transform: 'translate(-50%,-50%)', background: 'rgba(14,12,20,.95)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
          <div className="overflow-y-auto p-3 pb-2 space-y-1 flex-1 min-h-0">
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-3)' }}>Engine</div>

            <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
              style={{
                background: selectedEngine === 'auto' ? 'rgba(240,104,72,.08)' : 'transparent',
                border: `1px solid ${selectedEngine === 'auto' ? 'rgba(240,104,72,.2)' : 'transparent'}`,
              }}>
              <span className="text-base">{'\u2728'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? 'var(--accent)' : 'var(--text-1)' }}>Auto</div>
                <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>Best engine automatically</div>
              </div>
            </button>

            <div className="h-px my-1" style={{ background: 'var(--border)' }} />

            {ENGINE_METADATA.map(eng => (
              <button key={eng.key} onClick={() => { setSelectedEngine(eng.key); setShowEngineModal(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                style={{
                  background: selectedEngine === eng.key ? 'rgba(240,104,72,.08)' : 'transparent',
                  border: `1px solid ${selectedEngine === eng.key ? 'rgba(240,104,72,.2)' : 'transparent'}`,
                }}>
                <span className="text-sm" style={{ color: 'var(--text-3)' }}>{'\u2699'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? 'var(--accent)' : 'var(--text-1)' }}>{eng.userFriendlyName}</div>
                  <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>{eng.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] font-mono" style={{ color: 'var(--accent)' }}>{eng.creditCost}cr</div>
                  <div className="text-[8px] font-mono" style={{ color: 'var(--text-3)' }}>{eng.estimatedTime}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-3)' }}>Resolution</div>
            <div className="flex gap-2">
              {[
                { id: '1k', label: '1K', desc: '1024px' },
                { id: '2k', label: '2K', desc: '2048px' },
                { id: '4k', label: '4K', desc: '4096px' },
              ].map(r => (
                <button key={r.id}
                  onClick={() => setSelectedResolution(r.id)}
                  className="flex-1 px-3 py-2 rounded-lg text-center transition-all"
                  style={{
                    background: selectedResolution === r.id ? 'rgba(240,104,72,.08)' : 'var(--bg-3)',
                    border: `1px solid ${selectedResolution === r.id ? 'rgba(240,104,72,.25)' : 'var(--border)'}`,
                  }}>
                  <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? 'var(--accent)' : 'var(--text-1)' }}>{r.label}</div>
                  <div className="text-[8px] font-mono" style={{ color: 'var(--text-3)' }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}

export default Director
