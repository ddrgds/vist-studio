import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { generateInfluencerImage, enhancePrompt } from '../services/geminiService'
import { generateWithSoul } from '../services/higgsfieldService'
import { generateWithReplicate } from '../services/replicateService'
import { generateWithOpenAI } from '../services/openaiService'
import { generateWithFal } from '../services/falService'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { ImageSize, AspectRatio, ENGINE_METADATA, CREDIT_COSTS, FEATURE_ENGINES, AIProvider } from '../types'
import type { InfluencerParams } from '../types'
import { POSE_OPTIONS, CAMERA_OPTIONS, LIGHTING_OPTIONS, INSPIRATIONS } from '../data/directorOptions'
import type { ChipOption } from '../data/directorOptions'
import { ENHANCERS, buildEnhancerPrompt } from '../data/enhancers'
import { usePipelineStore } from '../stores/pipelineStore'
import { PipelineCTA } from '../components/PipelineCTA'
import { PresetManager } from '../components/PresetManager'
import type { CustomPreset } from '../stores/presetStore'

// ─── Accordion Section (Joi style) ─────────────────────
const AccordionSection: React.FC<{
  title: string; icon: string; isOpen: boolean; onToggle: () => void; badge?: string; children: React.ReactNode
}> = ({ title, icon, isOpen, onToggle, badge, children }) => (
  <div style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
    <button onClick={onToggle} className="w-full px-5 py-3.5 flex items-center gap-2.5 group transition-colors"
      style={{ color: 'var(--joi-text-2)' }}>
      <span className="text-sm" style={{ opacity: 0.5 }}>{icon}</span>
      <span className="text-xs font-medium tracking-wide uppercase" style={{ letterSpacing: '0.08em' }}>{title}</span>
      {badge && (
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{
          background: 'rgba(255,107,157,.08)',
          color: 'var(--joi-pink)',
          border: '1px solid rgba(255,107,157,.12)',
        }}>{badge}</span>
      )}
      <span className="ml-auto text-[10px] transition-transform" style={{
        color: 'var(--joi-text-3)',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      }}>{'\u25BC'}</span>
    </button>
    <div className="overflow-hidden transition-all" style={{
      maxHeight: isOpen ? '800px' : '0',
      opacity: isOpen ? 1 : 0,
      transition: 'max-height .3s ease, opacity .2s ease',
    }}>
      <div className="px-5 pb-5">{children}</div>
    </div>
  </div>
)

// ─── Option Chip (holographic) ──────────────────────────
const OptionChip: React.FC<{
  option: ChipOption; selected: boolean; onClick: () => void
}> = ({ option, selected, onClick }) => (
  <button onClick={onClick}
    className="px-3.5 py-2.5 rounded-xl text-[12px] font-medium flex items-center gap-2 transition-all whitespace-nowrap"
    style={{
      background: selected ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.02)',
      border: `1px solid ${selected ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.06)'}`,
      color: selected ? 'var(--joi-pink)' : 'var(--joi-text-2)',
      backdropFilter: 'blur(8px)',
      boxShadow: selected ? '0 0 16px rgba(255,107,157,.08), inset 0 1px 0 rgba(255,107,157,.06)' : 'none',
    }}>
    <span className="text-sm">{option.icon}</span>{option.label}
  </button>
)

// ─── Enhancer Chip ──────────────────────────────────────
const EnhancerChip: React.FC<{
  enhancer: { id: string; label: string; icon: string }; selected: boolean; onClick: () => void
}> = ({ enhancer, selected, onClick }) => (
  <button onClick={onClick}
    className="px-3 py-2 rounded-xl text-[11px] font-medium flex items-center gap-2 transition-all whitespace-nowrap"
    style={{
      background: selected ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.02)',
      border: `1px solid ${selected ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.06)'}`,
      color: selected ? 'var(--joi-pink)' : 'var(--joi-text-2)',
      backdropFilter: 'blur(8px)',
      boxShadow: selected ? '0 0 16px rgba(255,107,157,.08), inset 0 1px 0 rgba(255,107,157,.06)' : 'none',
    }}>
    <span className="text-sm">{enhancer.icon}</span>{enhancer.label}
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
        <div className="relative w-20 h-20 rounded-xl overflow-hidden group"
          style={{ border: '1px solid rgba(255,107,157,.25)', boxShadow: '0 0 16px rgba(255,107,157,.1)' }}>
          <img src={preview} className="w-full h-full object-cover" alt="" />
          <button onClick={onRemove}
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,.8)', color: 'var(--joi-text-1)' }}>{'\u2715'}</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:border-[rgba(255,107,157,.15)]"
          style={{
            background: 'rgba(255,255,255,.02)',
            border: '1px dashed rgba(255,255,255,.08)',
            backdropFilter: 'blur(8px)',
          }}>
          <span className="text-base" style={{ color: 'var(--joi-pink)', opacity: 0.6 }}>{'\u2191'}</span>
          <span className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>{label}</span>
        </button>
      )}
    </div>
  )
}

// Input style helper
const joiInputStyle = (hasValue: boolean) => ({
  background: 'var(--joi-bg-2)',
  borderColor: hasValue ? 'rgba(255,107,157,.15)' : 'rgba(255,255,255,.04)',
  color: 'var(--joi-text-1)',
  backdropFilter: 'blur(8px)',
})

export function Director({ onNav, onEditImage, onExportImage, uploadedImageUrl, initialPrompt }: { onNav?: (page: string) => void; onEditImage?: (url: string) => void; onExportImage?: (url: string) => void; uploadedImageUrl?: string | null; initialPrompt?: string | null }) {
  // ── Character ──
  const characters = useCharacterStore(s => s.characters)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [characteristics, setCharacteristics] = useState('')

  const pipelineCharId = usePipelineStore(s => s.characterId)
  const pipelineSetHeroShot = usePipelineStore(s => s.setHeroShot)

  useEffect(() => {
    // Auto-select from pipeline first, then fallback to first character
    if (pipelineCharId && characters.find(c => c.id === pipelineCharId)) {
      setSelectedCharId(pipelineCharId)
    } else if (characters.length > 0 && !selectedCharId) {
      setSelectedCharId(characters[0].id)
    }
  }, [characters, selectedCharId, pipelineCharId])

  const selectedChar = characters.find(c => c.id === selectedCharId)

  useEffect(() => {
    if (selectedChar) {
      setCharacteristics(selectedChar.characteristics || '')
    }
  }, [selectedChar?.id])

  // ── "Bring Your Own" upload state ──
  const [byoImageUrl, setByoImageUrl] = useState<string | null>(uploadedImageUrl || null)
  const byoInputRef = useRef<HTMLInputElement>(null)

  const handleByoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setByoImageUrl(reader.result as string)
    reader.readAsDataURL(file)
    if (e.target) e.target.value = ''
  }

  // If BYO image exists, skip generation and send to edit
  useEffect(() => {
    if (byoImageUrl && onEditImage) {
      onEditImage(byoImageUrl)
      setByoImageUrl(null) // consume it
    }
  }, [byoImageUrl, onEditImage])

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
  const [scenario, setScenario] = useState(initialPrompt || '')
  const [enhancingScenario, setEnhancingScenario] = useState(false)

  // Apply initialPrompt when it changes (from InspirationBoard)
  useEffect(() => {
    if (initialPrompt) setScenario(initialPrompt)
  }, [initialPrompt])

  // ── Outfit ──
  const [outfitDescription, setOutfitDescription] = useState('')

  // ── Enhancers ──
  const [selectedEnhancers, setSelectedEnhancers] = useState<Set<string>>(new Set())
  const [customEnhancer, setCustomEnhancer] = useState('')

  // ── Advanced: Negative Prompt & Image Boost ──
  const [negativePrompt, setNegativePrompt] = useState('')
  const [imageBoostOn, setImageBoostOn] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const IMAGE_BOOST_KEYWORDS = 'masterpiece, best quality, highly detailed, sharp focus, 8k uhd'

  // ── Reuse Parameters (from Gallery) ──
  const reuseParams = useGalleryStore(s => s.reuseParams)
  const setReuseParams = useGalleryStore(s => s.setReuseParams)

  useEffect(() => {
    if (reuseParams && reuseParams.target === 'director') {
      if (reuseParams.prompt) setScenario(reuseParams.prompt)
      if (reuseParams.negativePrompt) { setNegativePrompt(reuseParams.negativePrompt); setAdvancedOpen(true) }
      if (reuseParams.imageBoost) { setImageBoostOn(true); setAdvancedOpen(true) }
      if (reuseParams.characterId) {
        const match = characters.find(c => c.id === reuseParams.characterId)
        if (match) setSelectedCharId(match.id)
      }
      setReuseParams(null)
    }
  }, [reuseParams])

  // ── Engine & generation ──
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [selectedResolution, setSelectedResolution] = useState('2k')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(AspectRatio.Portrait)
  const [showEngineModal, setShowEngineModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedResult, setSelectedResult] = useState(0)
  const [numberOfImages, setNumberOfImages] = useState(1)
  const abortRef = useRef<AbortController | null>(null)
  // Camera/Lighting/Enhancers are always present but collapsed by default

  const { decrementCredits, restoreCredits } = useProfile()
  const toast = useToast()

  // ── Accordion state ──
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('vist-director-sections')
      return s ? JSON.parse(s) : { identity: true, outfit: false, pose: false, camera: false, lighting: false, scenario: true, enhancers: false }
    } catch { return { identity: true, scenario: true } }
  })

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('vist-director-sections', JSON.stringify(next)) } catch {}
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

    const modelImages: File[] = []
    if (selectedChar && selectedChar.modelImageBlobs.length > 0) {
      selectedChar.modelImageBlobs.forEach((blob, i) => {
        modelImages.push(new File([blob], `face-ref-${i}.jpg`, { type: 'image/jpeg' }))
      })
    }
    faceRefs.forEach(f => modelImages.push(f.file))

    const scenarioText = [scenario, enhancerPrompt].filter(Boolean).join('. ').trim()

    let model = undefined as any
    if (selectedEngine !== 'auto') {
      const eng = ENGINE_METADATA.find(e => e.key === selectedEngine)
      if (eng) model = eng.geminiModel
    }

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
      negativePrompt: negativePrompt.trim() || undefined,
      imageBoost: imageBoostOn ? IMAGE_BOOST_KEYWORDS : undefined,
      imageSize,
      aspectRatio: selectedAspectRatio,
      numberOfImages,
      model,
    }
  }

  // ── Generate ──
  const handleGenerate = async () => {
    const hasIdentity = selectedChar || faceRefs.length > 0
    if (!hasIdentity) {
      toast.error('Select a character or upload face references')
      return
    }

    const costPerShot = CREDIT_COSTS['grok-edit']
    const totalCost = numberOfImages * costPerShot

    const ok = await decrementCredits(totalCost)
    if (!ok) { toast.error('Insufficient credits'); return }

    setGenerating(true)
    setProgress(0)
    abortRef.current = new AbortController()

    try {
      const params = buildParams()
      const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null

      let results: string[]
      if (eng?.provider === AIProvider.Higgsfield) {
        results = await generateWithSoul(params, (p) => setProgress(p), abortRef.current.signal)
      } else if (eng?.provider === AIProvider.Replicate) {
        results = await generateWithReplicate(params, eng.replicateModel, (p) => setProgress(p), abortRef.current.signal)
      } else if (eng?.provider === AIProvider.OpenAI) {
        results = await generateWithOpenAI(params, eng.openaiModel, (p) => setProgress(p), abortRef.current.signal)
      } else if (eng?.provider === AIProvider.Fal) {
        results = await generateWithFal(params, eng.falModel, (p) => setProgress(p), abortRef.current.signal)
      } else {
        // Auto or Gemini
        results = await generateInfluencerImage(params, (p) => setProgress(p), abortRef.current.signal)
      }

      setGeneratedImages(results)
      setSelectedResult(0)

      let engineLabel = 'gemini-nb2'
      if (selectedEngine !== 'auto') {
        const eng = ENGINE_METADATA.find(e => e.key === selectedEngine)
        if (eng) engineLabel = eng.userFriendlyName
      }

      const items: GalleryItem[] = results.map((url) => ({
        id: crypto.randomUUID(),
        url,
        prompt: scenario || 'Director hero shot',
        model: engineLabel,
        timestamp: Date.now(),
        type: 'create' as const,
        characterId: selectedChar?.id,
        tags: ['director', 'hero-shot'],
        params: {
          characters: [{ id: selectedChar?.id || 'director-char', characteristics: characteristics || '' }],
          scenario: scenario || 'professional photo shoot',
          lighting: buildParams().lighting,
          camera: buildParams().camera,
          negativePrompt: negativePrompt.trim() || undefined,
          imageBoost: imageBoostOn ? IMAGE_BOOST_KEYWORDS : undefined,
          imageSize: buildParams().imageSize,
          aspectRatio: selectedAspectRatio,
          numberOfImages,
        } as any,
        source: 'director' as const,
      }))

      useGalleryStore.getState().addItems(items)
      if (selectedChar) useCharacterStore.getState().incrementUsage(selectedChar.id)
      if (results.length > 0) pipelineSetHeroShot(results[0])
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

  const costPerShot = CREDIT_COSTS['grok-edit']
  const activeEngineLabel = selectedEngine === 'auto' ? 'Auto' : (ENGINE_METADATA.find(e => e.key === selectedEngine)?.userFriendlyName || selectedEngine)

  return (
    <div className="h-full flex" style={{ background: 'var(--joi-bg-0)' }}>
      <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={handleFaceRefUpload} />

      {/* ── Left Panel — Frosted Glass ── */}
      <div className="w-[400px] shrink-0 flex flex-col" style={{
        background: 'var(--joi-bg-1)',
        borderRight: '1px solid rgba(255,255,255,.04)',
      }}>
        {/* Header */}
        <div className="px-6 h-16 flex items-center justify-between shrink-0" style={{
          borderBottom: '1px solid rgba(255,255,255,.04)',
        }}>
          <h1 className="joi-heading joi-glow--subtle" style={{ fontSize: '1.5rem' }}>
            <span className="joi-text-gradient">Director</span>
          </h1>
          <div className="relative">
            <button onClick={() => setShowEngineModal(!showEngineModal)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center gap-1.5 transition-all"
              style={{
                background: selectedEngine !== 'auto' ? 'rgba(255,107,157,.08)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${selectedEngine !== 'auto' ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.06)'}`,
                color: selectedEngine !== 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-3)',
              }}>
              <span className="text-xs">{'\u2699'}</span> {activeEngineLabel}
            </button>
            {showEngineModal && (
              <div className="absolute top-full right-0 mt-2 z-50 w-[340px] max-h-[70vh] flex flex-col rounded-2xl"
                style={{
                  background: 'rgba(14,12,22,.96)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,.06)',
                  boxShadow: '0 20px 80px rgba(0,0,0,.6), 0 0 40px rgba(255,107,157,.05)',
                  overflow: 'hidden',
                }}>
                <div className="overflow-y-auto p-4 pb-2 space-y-1 flex-1 min-h-0 joi-scroll">
                  <div className="joi-label mb-2 px-1">Engine</div>

                  <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: selectedEngine === 'auto' ? 'rgba(255,107,157,.08)' : 'transparent',
                      border: `1px solid ${selectedEngine === 'auto' ? 'rgba(255,107,157,.2)' : 'transparent'}`,
                    }}>
                    <span className="text-base">{'\u2728'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium" style={{ color: selectedEngine === 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>Auto</div>
                      <div className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>Best engine automatically</div>
                    </div>
                  </button>

                  <div className="joi-divider my-1" />

                  {ENGINE_METADATA.filter(eng => FEATURE_ENGINES['director'].keys.includes(eng.key)).map(eng => (
                    <button key={eng.key} onClick={() => { setSelectedEngine(eng.key); setShowEngineModal(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all"
                      style={{
                        background: selectedEngine === eng.key ? 'rgba(255,107,157,.08)' : 'transparent',
                        border: `1px solid ${selectedEngine === eng.key ? 'rgba(255,107,157,.2)' : 'transparent'}`,
                      }}>
                      <span className="text-base">{'\u2699'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{eng.userFriendlyName}</div>
                        <div className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>{eng.description}</div>
                        {eng.bestFor && <div className="text-[8px] mt-0.5" style={{ color: 'var(--joi-pink)', opacity: 0.7 }}>Good for: {eng.bestFor}</div>}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[9px] font-mono" style={{ color: 'var(--joi-pink)' }}>{eng.creditCost}cr</div>
                        <div className="text-[8px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{eng.estimatedTime}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                  <div className="joi-label mb-2 px-1">Format</div>
                  <div className="flex gap-1.5">
                    {[
                      { id: AspectRatio.Portrait, label: '3:4', icon: '▯', desc: 'Portrait' },
                      { id: AspectRatio.Square, label: '1:1', icon: '⬜', desc: 'Square' },
                      { id: AspectRatio.Landscape, label: '4:3', icon: '▭', desc: 'Landscape' },
                      { id: AspectRatio.Tall, label: '9:16', icon: '📱', desc: 'Story/Reel' },
                      { id: AspectRatio.Wide, label: '16:9', icon: '🖥️', desc: 'Widescreen' },
                    ].map(a => (
                      <button key={a.id} onClick={() => setSelectedAspectRatio(a.id)}
                        className="flex-1 px-2 py-2 rounded-xl text-center transition-all"
                        style={{
                          background: selectedAspectRatio === a.id ? 'rgba(255,107,157,.08)' : 'rgba(255,255,255,.02)',
                          border: `1px solid ${selectedAspectRatio === a.id ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`,
                        }}>
                        <div className="text-sm mb-0.5">{a.icon}</div>
                        <div className="text-[10px] font-mono font-bold" style={{ color: selectedAspectRatio === a.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{a.label}</div>
                        <div className="text-[7px]" style={{ color: 'var(--joi-text-3)' }}>{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                  <div className="joi-label mb-2 px-1">Resolution</div>
                  <div className="flex gap-2">
                    {[
                      { id: '1k', label: '1K', desc: '1024px' },
                      { id: '2k', label: '2K', desc: '2048px' },
                      { id: '4k', label: '4K', desc: '4096px' },
                    ].map(r => (
                      <button key={r.id} onClick={() => setSelectedResolution(r.id)}
                        className="flex-1 px-3 py-2 rounded-xl text-center transition-all"
                        style={{
                          background: selectedResolution === r.id ? 'rgba(255,107,157,.08)' : 'rgba(255,255,255,.02)',
                          border: `1px solid ${selectedResolution === r.id ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)'}`,
                        }}>
                        <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{r.label}</div>
                        <div className="text-[8px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preset Manager */}
        <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
          <PresetManager
            currentSettings={{
              prompt: scenario,
              aspectRatio: selectedAspectRatio,
              engine: selectedEngine,
            }}
            onLoad={(preset: CustomPreset) => {
              if (preset.prompt !== undefined) setScenario(preset.prompt)
              if (preset.aspectRatio !== undefined) setSelectedAspectRatio(preset.aspectRatio as any)
              if (preset.engine !== undefined) setSelectedEngine(preset.engine)
            }}
          />
        </div>

        {/* Scrollable accordion */}
        <div className="flex-1 overflow-y-auto joi-scroll">

          {/* ── IDENTITY ── */}
          <AccordionSection title="Identity" icon="👤" isOpen={!!openSections.identity} onToggle={() => toggleSection('identity')}>
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--joi-text-2)' }}>Character</div>
                <div className="flex gap-2 flex-wrap">
                  {characters.length === 0 ? (
                    <div className="space-y-2 w-full">
                      <div className="text-[12px] py-3 px-4 rounded-xl w-full text-center" style={{
                        color: 'var(--joi-text-3)',
                        background: 'rgba(255,255,255,.02)',
                        border: '1px dashed rgba(255,255,255,.06)',
                      }}>No characters yet — <span style={{ color: 'var(--joi-pink)', cursor: 'pointer' }} onClick={() => onNav?.('create')}>create one</span></div>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{
                        background: 'rgba(167,139,250,.05)',
                        border: '1px dashed rgba(167,139,250,.25)',
                      }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium" style={{ color: 'var(--joi-text-1)' }}>Or upload a photo</p>
                          <p className="text-[9px] mt-0.5" style={{ color: 'var(--joi-text-3)' }}>Skip to editing tools directly</p>
                        </div>
                        <label className="shrink-0 cursor-pointer px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{ background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)', color: 'white' }}>
                          Upload
                          <input ref={byoInputRef} type="file" accept="image/*" className="hidden" onChange={handleByoUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    characters.slice(0, 6).map(c => (
                      <button key={c.id} onClick={() => setSelectedCharId(c.id)}
                        className="px-3.5 py-2.5 rounded-xl text-[12px] font-medium flex items-center gap-2 transition-all"
                        style={{
                          background: selectedCharId === c.id ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.02)',
                          border: `1px solid ${selectedCharId === c.id ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.06)'}`,
                          color: selectedCharId === c.id ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                          boxShadow: selectedCharId === c.id ? '0 0 16px rgba(255,107,157,.08)' : 'none',
                        }}>
                        {c.thumbnail ? (
                          <img src={c.thumbnail} className="w-6 h-6 rounded-full object-cover" alt="" style={{
                            border: selectedCharId === c.id ? '1.5px solid rgba(255,107,157,.4)' : '1.5px solid rgba(255,255,255,.08)',
                          }} />
                        ) : (
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px]" style={{
                            background: selectedCharId === c.id ? 'rgba(255,107,157,.15)' : 'rgba(255,255,255,.06)',
                          }}>{c.name[0]}</span>
                        )}
                        {c.name.split(' ')[0]}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--joi-text-2)' }}>
                  Face References <span className="font-mono" style={{ opacity: 0.4 }}>({faceRefs.length}/3)</span>
                  <span title="Upload reference photos to maintain facial consistency across generations. Optional if you've selected a character above." className="cursor-help ml-1" style={{ opacity: 0.5 }}>ℹ️</span>
                </div>
                <div className="flex gap-2.5">
                  {faceRefs.map((ref, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden group"
                      style={{ border: '1px solid rgba(255,107,157,.25)', boxShadow: '0 0 12px rgba(255,107,157,.08)' }}>
                      <img src={ref.preview} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => { URL.revokeObjectURL(ref.preview); setFaceRefs(prev => prev.filter((_, j) => j !== i)) }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,.8)', color: 'var(--joi-text-1)' }}>{'\u2715'}</button>
                    </div>
                  ))}
                  {faceRefs.length < 3 && (
                    <button onClick={() => faceInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
                      style={{ background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)' }}>
                      <span className="text-sm" style={{ color: 'var(--joi-pink)', opacity: 0.6 }}>{'\u002B'}</span>
                      <span className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>Face</span>
                    </button>
                  )}
                </div>
              </div>

              <details className="group">
                <summary className="text-[11px] font-medium cursor-pointer flex items-center gap-1.5 py-1" style={{ color: 'var(--joi-text-3)' }}>
                  <span className="text-[9px] transition-transform group-open:rotate-90">▶</span>
                  Advanced: Edit prompt
                  {characteristics && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--joi-pink)' }} />}
                </summary>
                <textarea
                  rows={3}
                  placeholder="Technical prompt for the AI model. Auto-filled from character data."
                  className="w-full mt-2 px-3.5 py-2.5 rounded-xl text-[12px] border outline-none resize-none transition-colors"
                  style={joiInputStyle(!!characteristics)}
                  value={characteristics}
                  onChange={e => setCharacteristics(e.target.value)}
                />
              </details>
            </div>
          </AccordionSection>

          {/* ── OUTFIT ── */}
          <AccordionSection title="Outfit" icon="👔" isOpen={!!openSections.outfit} onToggle={() => toggleSection('outfit')}>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <ImageSlot
                  label="Outfit"
                  file={outfitRef?.file || null}
                  preview={outfitRef?.preview || null}
                  onUpload={f => setOutfitRef({ file: f, preview: URL.createObjectURL(f) })}
                  onRemove={() => { if (outfitRef) URL.revokeObjectURL(outfitRef.preview); setOutfitRef(null) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--joi-text-2)' }}>
                    {outfitRef ? 'Outfit from image' : 'Description'}
                  </div>
                  {outfitRef ? (
                    <div className="text-[11px] p-3 rounded-xl" style={{
                      background: 'rgba(255,107,157,.04)',
                      color: 'var(--joi-text-2)',
                      border: '1px solid rgba(255,107,157,.08)',
                    }}>
                      AI will extract garment from image and apply to character
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      placeholder="e.g. Black leather jacket, white t-shirt..."
                      className="w-full px-3.5 py-2.5 rounded-xl text-[12px] border outline-none resize-none transition-colors"
                      style={joiInputStyle(!!outfitDescription)}
                      value={outfitDescription}
                      onChange={e => setOutfitDescription(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* ── POSE ── */}
          <AccordionSection title="Pose" icon="🧍" isOpen={!!openSections.pose} onToggle={() => toggleSection('pose')}>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <ImageSlot
                  label="Pose"
                  file={poseRef?.file || null}
                  preview={poseRef?.preview || null}
                  onUpload={f => setPoseRef({ file: f, preview: URL.createObjectURL(f) })}
                  onRemove={() => { if (poseRef) URL.revokeObjectURL(poseRef.preview); setPoseRef(null) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 flex-wrap">
                    {POSE_OPTIONS.map(p => (
                      <OptionChip key={p.id} option={p} selected={selectedPose === p.id && !customPose} onClick={() => { setSelectedPose(p.id); setCustomPose('') }} />
                    ))}
                  </div>
                </div>
              </div>
              <input type="text" placeholder="Or describe a custom pose..."
                className="w-full px-3.5 py-2.5 rounded-xl text-[12px] border outline-none transition-colors"
                style={joiInputStyle(!!customPose)}
                value={customPose}
                onChange={e => setCustomPose(e.target.value)} />
            </div>
          </AccordionSection>

          {/* ── CAMERA ── (Advanced) */}
          <AccordionSection title="Camera" icon="📷" isOpen={!!openSections.camera} onToggle={() => toggleSection('camera')}>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {CAMERA_OPTIONS.map(c => (
                  <OptionChip key={c.id} option={c} selected={selectedCamera === c.id && !customCamera} onClick={() => { setSelectedCamera(c.id); setCustomCamera('') }} />
                ))}
              </div>
              <input type="text" placeholder="Or describe custom camera..."
                className="w-full px-3.5 py-2.5 rounded-xl text-[12px] border outline-none transition-colors"
                style={joiInputStyle(!!customCamera)}
                value={customCamera}
                onChange={e => setCustomCamera(e.target.value)} />
            </div>
          </AccordionSection>

          {/* ── LIGHTING ── (Advanced) */}
          <AccordionSection title="Lighting" icon="💡" isOpen={!!openSections.lighting} onToggle={() => toggleSection('lighting')}>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {LIGHTING_OPTIONS.map(l => (
                  <OptionChip key={l.id} option={l} selected={selectedLighting === l.id && !customLighting} onClick={() => { setSelectedLighting(l.id); setCustomLighting('') }} />
                ))}
              </div>
              <input type="text" placeholder="Or describe custom lighting..."
                className="w-full px-3.5 py-2.5 rounded-xl text-[12px] border outline-none transition-colors"
                style={joiInputStyle(!!customLighting)}
                value={customLighting}
                onChange={e => setCustomLighting(e.target.value)} />
            </div>
          </AccordionSection>

          {/* ── SCENARIO ── */}
          <AccordionSection title="Scenario" icon="🎬" isOpen={!!openSections.scenario} onToggle={() => toggleSection('scenario')}>
            <div className="space-y-4">
              <textarea
                rows={3}
                placeholder="Describe the scene, environment, mood..."
                className="w-full px-3.5 py-2.5 rounded-xl text-[12px] border outline-none resize-none transition-colors"
                style={joiInputStyle(!!scenario)}
                value={scenario}
                onChange={e => setScenario(e.target.value)}
              />
              {scenario.trim() && (
                <div className="flex justify-end mt-1">
                  <button
                    disabled={enhancingScenario}
                    onClick={async () => {
                      const ok = await decrementCredits(2)
                      if (!ok) { toast.error('Insufficient credits (2cr)'); return }
                      setEnhancingScenario(true)
                      try {
                        const enhanced = await enhancePrompt(scenario, 'scenario')
                        if (enhanced && enhanced !== scenario) {
                          setScenario(enhanced)
                          toast.success('Scenario enhanced!')
                        } else {
                          restoreCredits(2)
                          toast.info('No enhancement needed')
                        }
                      } catch {
                        restoreCredits(2)
                        toast.error('Enhancement failed')
                      } finally {
                        setEnhancingScenario(false)
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
                    style={{
                      background: 'rgba(255,107,157,.08)',
                      border: '1px solid rgba(255,107,157,.15)',
                      color: 'var(--joi-pink)',
                      opacity: enhancingScenario ? 0.4 : 1,
                    }}>
                    {enhancingScenario ? '...' : '✨ Enhance (2cr)'}
                  </button>
                </div>
              )}

              <div>
                <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--joi-text-2)' }}>Inspirations</div>
                <div className="grid grid-cols-2 gap-2">
                  {INSPIRATIONS.map(ins => (
                    <button key={ins.id} onClick={() => setScenario(ins.scene)}
                      className="px-3 py-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 transition-all text-left"
                      style={{
                        background: scenario === ins.scene ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.02)',
                        border: `1px solid ${scenario === ins.scene ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.06)'}`,
                        color: scenario === ins.scene ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                        boxShadow: scenario === ins.scene ? '0 0 12px rgba(255,107,157,.06)' : 'none',
                      }}>
                      <span className="text-base shrink-0">{ins.emoji}</span>
                      <span className="truncate">{ins.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ImageSlot
                  label="Scene"
                  file={scenarioRef?.file || null}
                  preview={scenarioRef?.preview || null}
                  onUpload={f => setScenarioRef({ file: f, preview: URL.createObjectURL(f) })}
                  onRemove={() => { if (scenarioRef) URL.revokeObjectURL(scenarioRef.preview); setScenarioRef(null) }}
                />
                <span className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>Scene reference (optional)</span>
              </div>
            </div>
          </AccordionSection>

          {/* ── ENHANCERS ── (Advanced) */}
          <AccordionSection title="Enhancers" icon="✨" badge={selectedEnhancers.size > 0 ? `${selectedEnhancers.size}` : undefined} isOpen={!!openSections.enhancers} onToggle={() => toggleSection('enhancers')}>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {ENHANCERS.map(e => (
                  <EnhancerChip key={e.id} enhancer={e} selected={selectedEnhancers.has(e.id)} onClick={() => toggleEnhancer(e.id)} />
                ))}
              </div>
              <input type="text" placeholder="Custom enhancer text..."
                className="w-full px-3.5 py-2.5 rounded-xl text-[12px] border outline-none transition-colors"
                style={joiInputStyle(!!customEnhancer)}
                value={customEnhancer}
                onChange={e => setCustomEnhancer(e.target.value)} />
            </div>
          </AccordionSection>

          {/* ── ADVANCED: Negative Prompt & Image Boost ── */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
            <button onClick={() => setAdvancedOpen(prev => !prev)}
              className="w-full px-5 py-3 flex items-center gap-2.5 group transition-colors"
              style={{ color: 'var(--joi-text-2)' }}>
              <span className="text-sm" style={{ opacity: 0.5 }}>{'\u2699'}</span>
              <span className="text-xs font-medium tracking-wide uppercase" style={{ letterSpacing: '0.08em' }}>Advanced</span>
              {(negativePrompt.trim() || imageBoostOn) && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--joi-pink)' }} />
              )}
              <span className="ml-auto text-[10px] transition-transform" style={{
                color: 'var(--joi-text-3)',
                transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>{'\u25BC'}</span>
            </button>
            <div className="overflow-hidden transition-all" style={{
              maxHeight: advancedOpen ? '400px' : '0',
              opacity: advancedOpen ? 1 : 0,
              transition: 'max-height .3s ease, opacity .2s ease',
            }}>
              <div className="px-5 pb-5 space-y-4">
                {/* Image Boost toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium" style={{ color: 'var(--joi-text-2)' }}>Image Boost</div>
                    <div className="text-[9px] mt-0.5" style={{ color: 'var(--joi-text-3)' }}>Appends quality keywords to prompt</div>
                  </div>
                  <button onClick={() => setImageBoostOn(prev => !prev)}
                    className="relative w-9 h-5 rounded-full transition-all"
                    style={{
                      background: imageBoostOn ? 'rgba(255,107,157,.35)' : 'rgba(255,255,255,.08)',
                      border: `1px solid ${imageBoostOn ? 'rgba(255,107,157,.4)' : 'rgba(255,255,255,.06)'}`,
                    }}>
                    <div className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all"
                      style={{
                        left: imageBoostOn ? '18px' : '2px',
                        background: imageBoostOn ? 'var(--joi-pink)' : 'rgba(255,255,255,.25)',
                        boxShadow: imageBoostOn ? '0 0 8px rgba(255,107,157,.4)' : 'none',
                      }} />
                  </button>
                </div>
                {imageBoostOn && (
                  <div className="text-[9px] font-mono px-3 py-1.5 rounded-lg" style={{
                    background: 'rgba(255,107,157,.04)',
                    border: '1px solid rgba(255,107,157,.08)',
                    color: 'var(--joi-text-3)',
                  }}>{IMAGE_BOOST_KEYWORDS}</div>
                )}

                {/* Negative Prompt */}
                <div>
                  <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--joi-text-2)' }}>Negative Prompt</div>
                  <textarea
                    rows={2}
                    placeholder="Things to avoid: blurry, low quality, extra fingers..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-[12px] border outline-none resize-none transition-colors"
                    style={joiInputStyle(!!negativePrompt)}
                    value={negativePrompt}
                    onChange={e => setNegativePrompt(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: images + generate ── */}
        <div className="px-5 py-4 pb-20 lg:pb-4 shrink-0 space-y-3" style={{
          borderTop: '1px solid rgba(255,255,255,.04)',
          background: 'linear-gradient(to top, var(--joi-bg-1), rgba(14,12,20,.95))',
        }}>
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-medium" style={{ color: 'var(--joi-text-2)' }}>Images</div>
            <div className="flex gap-1.5 flex-1">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setNumberOfImages(n)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: numberOfImages === n ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${numberOfImages === n ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.05)'}`,
                    color: numberOfImages === n ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                  }}>{n}</button>
              ))}
            </div>
            <span className="text-[10px] font-mono shrink-0 px-2 py-1 rounded-lg" style={{
              background: 'rgba(255,107,157,.06)',
              color: 'var(--joi-pink)',
              border: '1px solid rgba(255,107,157,.1)',
            }}>
              {numberOfImages * costPerShot}cr
            </span>
          </div>

          <button onClick={handleGenerate} disabled={generating || (!selectedChar && faceRefs.length === 0)}
            className="joi-btn-solid w-full py-3.5 text-sm font-medium tracking-wide"
            style={{
              opacity: (generating || (!selectedChar && faceRefs.length === 0)) ? 0.4 : 1,
              boxShadow: !(generating || (!selectedChar && faceRefs.length === 0))
                ? '0 4px 30px rgba(255,107,157,.25), 0 0 50px rgba(208,72,176,.1)'
                : 'none',
            }}>
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Generating... {Math.round(progress)}%
              </span>
            ) : (selectedChar || faceRefs.length > 0) ? `\u2726 Generate Hero Shot (${costPerShot * numberOfImages}cr)` : '\u2726 Generate Image'}
          </button>
        </div>
      </div>

      {/* ── Center Canvas ── */}
      <div className="flex-1 flex flex-col joi-mesh" style={{ background: 'var(--joi-bg-0)' }}>
        {/* Top bar */}
        <div className="h-11 flex items-center px-5 gap-1.5 shrink-0" style={{
          borderBottom: '1px solid rgba(255,255,255,.03)',
          background: 'var(--joi-bg-1)',
        }}>
          <span className="joi-label">
            {'\u2726'} Director
          </span>
          <div className="flex-1" />
          <span className="font-jet text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
            {activeEngineLabel} {'\u00b7'} {numberOfImages} image{numberOfImages > 1 ? 's' : ''}
          </span>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {/* Atmospheric orbs */}
          <div className="joi-orb" style={{ width: 300, height: 300, background: 'rgba(255,107,157,0.03)', top: '10%', right: '15%' }} />
          <div className="joi-orb" style={{ width: 200, height: 200, background: 'rgba(208,72,176,0.025)', bottom: '15%', left: '20%' }} />

          <div className="w-[520px] h-[520px] rounded-2xl relative overflow-hidden joi-glass"
            style={{
              boxShadow: generatedImages.length > 0
                ? '0 8px 60px rgba(255,107,157,.1), 0 0 100px rgba(208,72,176,.05)'
                : '0 4px 30px rgba(0,0,0,.3)',
            }}>

            {generatedImages.length > 0 ? (
              <>
                <img src={generatedImages[selectedResult]} className="w-full h-full object-cover" alt="Generated hero shot" />
                {/* Floating action bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full z-10"
                  style={{
                    background: 'rgba(8,7,12,.65)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,107,157,.15)',
                    boxShadow: '0 4px 24px rgba(0,0,0,.4)',
                  }}>
                  {onEditImage && (
                    <button onClick={() => onEditImage(generatedImages[selectedResult])}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:scale-[1.04]"
                      style={{
                        background: 'rgba(255,107,157,.12)',
                        color: 'var(--joi-pink)',
                        border: '1px solid rgba(255,107,157,.18)',
                      }}>
                      <span>✨</span> Edit
                    </button>
                  )}
                  {onNav && (
                    <button onClick={() => onNav('studio')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:scale-[1.04]"
                      style={{
                        background: 'rgba(208,72,176,.10)',
                        color: 'rgb(208,140,220)',
                        border: '1px solid rgba(208,72,176,.18)',
                      }}>
                      <span>🎬</span> Make Reel
                    </button>
                  )}
                  {onExportImage && (
                    <button onClick={() => onExportImage(generatedImages[selectedResult])}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:scale-[1.04]"
                      style={{
                        background: 'rgba(72,88,224,.10)',
                        color: 'rgb(140,160,240)',
                        border: '1px solid rgba(72,88,224,.18)',
                      }}>
                      <span>📥</span> Export
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(135deg, rgba(255,107,157,.04) 0%, var(--joi-bg-1) 50%, rgba(208,72,176,.03) 100%)'
              }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center joi-breathe"
                      style={{ background: 'rgba(255,107,157,.06)', border: '1px solid rgba(255,107,157,.1)' }}>
                      <span className="text-2xl" style={{ opacity: 0.6 }}>{'\u2726'}</span>
                    </div>
                    <p className="joi-heading text-[13px]" style={{ color: 'var(--joi-text-2)' }}>Your hero shot will appear here</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--joi-text-3)' }}>Select a character and configure your scene to get started</p>
                  </div>
                </div>
              </div>
            )}

            {scenario && (
              <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-[9px] font-mono backdrop-blur-xl"
                  style={{ background: 'rgba(0,0,0,.4)', color: 'var(--joi-text-1)', border: '1px solid rgba(255,255,255,.04)' }}>
                  {scenario.length > 40 ? scenario.slice(0, 40) + '...' : scenario}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom filmstrip */}
        <div className="h-20 flex items-center px-5 gap-3 shrink-0" style={{
          borderTop: '1px solid rgba(255,255,255,.03)',
          background: 'var(--joi-bg-1)',
        }}>
          <span className="joi-label shrink-0 mr-1">Shots</span>
          {generatedImages.length > 0 ? (
            generatedImages.map((url, i) => (
              <div key={i} onClick={() => setSelectedResult(i)}
                className="w-12 h-12 rounded-xl shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                style={{
                  border: `2px solid ${selectedResult === i ? 'var(--joi-pink)' : 'rgba(255,255,255,.04)'}`,
                  boxShadow: selectedResult === i ? '0 0 12px rgba(255,107,157,.15)' : 'none',
                }}>
                <img src={url} className="w-full h-full object-cover" alt="" />
              </div>
            ))
          ) : (
            Array.from({ length: numberOfImages }, (_, i) => (
              <div key={i} className="w-12 h-12 rounded-xl shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,107,157,.04), rgba(208,72,176,.02))',
                  border: '1px solid rgba(255,255,255,.04)',
                }} />
            ))
          )}
          {generatedImages.length > 0 && (onEditImage || onExportImage || onNav) && (
            <div className="ml-auto shrink-0 flex items-center gap-2">
              {onEditImage && (
                <button onClick={() => onEditImage(generatedImages[selectedResult])}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,107,157,.12), rgba(208,72,176,.08))',
                    border: '1px solid rgba(255,107,157,.18)',
                    color: 'var(--joi-pink)',
                  }}>
                  <span>✨</span> Edit
                </button>
              )}
              {onExportImage && (
                <button onClick={() => onExportImage(generatedImages[selectedResult])}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(72,88,224,.10), rgba(72,88,224,.06))',
                    border: '1px solid rgba(72,88,224,.18)',
                    color: 'rgb(140,160,240)',
                  }}>
                  <span>📥</span> Export
                </button>
              )}
            </div>
          )}
          {generatedImages.length > 0 && onNav && !onEditImage && !onExportImage && (
            <div className="ml-auto shrink-0 w-56">
              <PipelineCTA label="Perfect it in Editor" targetPage="editor" onNav={onNav} icon="🪄" />
            </div>
          )}
        </div>
      </div>

      {/* ── Click-outside handler for engine dropdown ── */}
      {/* Click-outside handler for engine dropdown */}
      {showEngineModal && <div className="fixed inset-0 z-30" onClick={() => setShowEngineModal(false)} />}
    </div>
  )
}

export default Director
