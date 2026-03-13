import React, { useState, useEffect, useRef } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { useNavigationStore } from '../stores/navigationStore'
import { generatePhotoSession, generateInfluencerImage } from '../services/geminiService'
import { generatePhotoSessionWithGrok } from '../services/falService'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { ImageSize, AspectRatio, ENGINE_METADATA, OPERATION_CREDIT_COSTS } from '../types'
import type { InfluencerParams } from '../types'
import { PHOTO_SESSION_PRESETS, mixShots } from '../data/sessionPresets'

// ─── Scene presets (used as optional override) ──────────
const scenes = [
  { id: 'studio',   label: 'White Studio',   icon: '\uD83C\uDFDB\uFE0F' },
  { id: 'street',   label: 'Urban Street',   icon: '\uD83C\uDF03' },
  { id: 'beach',    label: 'Tropical Beach',  icon: '\uD83C\uDFD6\uFE0F' },
  { id: 'cafe',     label: 'Parisian Caf\u00e9',   icon: '\u2615' },
  { id: 'rooftop',  label: 'Rooftop NYC',     icon: '\uD83C\uDFD9\uFE0F' },
  { id: 'forest',   label: 'Mystic Forest',   icon: '\uD83C\uDF32' },
  { id: 'club',     label: 'Night Club',      icon: '\uD83E\uDEA9' },
  { id: 'desert',   label: 'Desert',          icon: '\uD83C\uDFDC\uFE0F' },
  { id: 'tokyo',    label: 'Tokyo Night',     icon: '\uD83D\uDDFC' },
  { id: 'gallery',  label: 'Art Gallery',     icon: '\uD83C\uDFA8' },
  { id: 'mansion',  label: 'Mansion',         icon: '\uD83C\uDFF0' },
  { id: 'bedroom',  label: 'Cozy Bedroom',    icon: '\uD83D\uDECF\uFE0F' },
  { id: 'gym',      label: 'Gym',             icon: '\uD83C\uDFCB\uFE0F' },
  { id: 'pool',     label: 'Pool Party',      icon: '\uD83C\uDFCA' },
]

export function PhotoSession({ onNav }: { onNav?: (page: string) => void }) {
  // Scene override (optional)
  const [selectedScene, setSelectedScene] = useState('')
  const [customScene, setCustomScene] = useState('')

  // Selected vibes / presets (multi-select)
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set(['selfies']))
  const [shotCount, setShotCount] = useState(4)
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [selectedResolution, setSelectedResolution] = useState('1k')
  const [showEngineModal, setShowEngineModal] = useState(false)

  // Reference image (optional — for scene reference)
  const [refImage, setRefImage] = useState<{ file: File; preview: string } | null>(null)
  const refInputRef = useRef<HTMLInputElement>(null)

  // Subject source: gallery (default), upload, or character (fallback)
  const [sourceMode, setSourceMode] = useState<'gallery' | 'upload' | 'character'>('gallery')
  const [uploadedSubject, setUploadedSubject] = useState<{ file: File; preview: string } | null>(null)
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryItem | null>(null)
  const subjectInputRef = useRef<HTMLInputElement>(null)

  // Real character data (fallback mode)
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

  // Credits & toast
  const { decrementCredits, restoreCredits } = useProfile()
  const toast = useToast()
  const galleryItems = useGalleryStore(s => s.items)
  const recentPhotos = galleryItems.slice(0, 12)
  const { pendingImage, pendingTarget, consume: consumeNav } = useNavigationStore()

  // Consume pending navigation (e.g. from Gallery → Session)
  useEffect(() => {
    if (pendingTarget === 'session' && pendingImage) {
      // Gallery → Session: use the image as the subject
      setSourceMode('gallery')
      // Find matching gallery item or create a pseudo-selection
      const match = galleryItems.find(g => g.url === pendingImage)
      if (match) {
        setSelectedGalleryItem(match)
      } else {
        // Fallback: switch to upload mode with the pending image
        setSourceMode('upload')
        fetch(pendingImage)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'gallery-subject.png', { type: blob.type || 'image/png' })
            setUploadedSubject({ file, preview: pendingImage })
          })
          .catch(() => {})
      }
      consumeNav()
    }
  }, [pendingTarget, pendingImage])

  const handleSubjectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedSubject({ file, preview: URL.createObjectURL(file) })
      setSourceMode('upload')
    }
    e.target.value = ''
  }

  const togglePreset = (id: string) => {
    setSelectedPresets(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id) // Keep at least one
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setRefImage({ file, preview: URL.createObjectURL(file) })
    }
    e.target.value = ''
  }

  // Compute mixed shots from selected presets
  const mixedShots = mixShots(selectedPresets, shotCount)

  // Scene override text (empty string means no override)
  const sceneOverride = customScene.trim() || (selectedScene ? (scenes.find(s => s.id === selectedScene)?.label || '') : '')

  const handleGenerate = async () => {
    // Determine base image source
    const hasGalleryBase = sourceMode === 'gallery' && selectedGalleryItem
    const hasUploadBase = sourceMode === 'upload' && uploadedSubject
    const hasCharacter = sourceMode === 'character' && selectedChar

    if (!hasGalleryBase && !hasUploadBase && !hasCharacter) {
      if (sourceMode === 'gallery') toast.error('Select a photo from gallery')
      else if (sourceMode === 'upload') toast.error('Upload a photo')
      else toast.error('Select a character')
      return
    }

    if (mixedShots.length === 0 && (hasGalleryBase || hasUploadBase)) {
      toast.error('Select at least one vibe')
      return
    }

    const effectiveShotCount = (hasGalleryBase || hasUploadBase) ? mixedShots.length : shotCount
    const costPerShot = OPERATION_CREDIT_COSTS.photoSession
    const totalCost = effectiveShotCount * costPerShot

    const ok = await decrementCredits(totalCost)
    if (!ok) { toast.error('Insufficient credits'); return }

    setGenerating(true)
    setProgress(0)
    abortRef.current = new AbortController()

    const selectedPresetLabels = PHOTO_SESSION_PRESETS
      .filter(p => selectedPresets.has(p.id))
      .map(p => p.label)

    try {
      if (hasGalleryBase || hasUploadBase) {
        // ── Gallery / Upload mode: Grok Edit with per-vibe shots ──
        let refFile: File

        if (hasGalleryBase) {
          const resp = await fetch(selectedGalleryItem!.url)
          const blob = await resp.blob()
          refFile = new File([blob], 'gallery-base.png', { type: blob.type || 'image/png' })
        } else {
          refFile = uploadedSubject!.file
        }

        const useGrok = selectedEngine === 'auto' || selectedEngine === 'grok' || selectedEngine.includes('grok')
        const engineLabel = useGrok ? 'grok-session' : 'gemini-photo-session'

        let results: { url: string; poseIndex: number }[]

        if (useGrok) {
          results = await generatePhotoSessionWithGrok(
            refFile,
            mixedShots.length,
            {
              scenario: sceneOverride || undefined,
              angles: mixedShots,
            },
            (p) => setProgress(p),
            abortRef.current.signal
          )
        } else {
          results = await generatePhotoSession(
            refFile,
            mixedShots.length,
            {
              scenario: sceneOverride || 'Same type of location as the reference photo',
              lighting: 'natural, varied per shot',
            },
            (p) => setProgress(p),
            abortRef.current.signal
          )
        }

        const urls = results.map(r => r.url)
        setGeneratedImages(urls)
        setSelectedResult(0)

        const items: GalleryItem[] = urls.map((url) => ({
          id: crypto.randomUUID(),
          url,
          prompt: `${sceneOverride || 'Base photo'} \u00b7 ${selectedPresetLabels.join(' + ')}`,
          model: engineLabel,
          timestamp: Date.now(),
          type: 'session' as const,
          tags: ['photo-session', ...selectedPresetLabels.map(l => l.toLowerCase())],
        }))

        useGalleryStore.getState().addItems(items)
        toast.success(`${urls.length} photos generated`)

      } else if (hasCharacter) {
        // ── Character mode (fallback): existing Gemini-based generation ──
        let refFile: File | null = null

        if (selectedChar!.modelImageBlobs.length > 0) {
          refFile = new File([selectedChar!.modelImageBlobs[0]], 'reference.jpg', { type: 'image/jpeg' })
        }

        const sessionPrompt = sceneOverride || 'professional photo studio'
        const vibeDescriptions = PHOTO_SESSION_PRESETS
          .filter(p => selectedPresets.has(p.id))
          .map(p => p.description)
          .join('. ')
        const fullPrompt = `${sessionPrompt}. VIBE: ${vibeDescriptions}.`

        if (refFile) {
          const useGrok = selectedEngine === 'auto' || selectedEngine === 'grok' || selectedEngine.includes('grok')
          const engineLabel = useGrok ? 'grok-session' : 'gemini-photo-session'

          let results: { url: string; poseIndex: number }[]

          if (useGrok) {
            results = await generatePhotoSessionWithGrok(
              refFile,
              shotCount,
              { scenario: fullPrompt, angles: mixedShots.length > 0 ? mixedShots : undefined },
              (p) => setProgress(p),
              abortRef.current.signal
            )
          } else {
            results = await generatePhotoSession(
              refFile,
              shotCount,
              {
                scenario: fullPrompt,
                lighting: 'natural, varied per shot',
              },
              (p) => setProgress(p),
              abortRef.current.signal
            )
          }

          const urls = results.map(r => r.url)
          setGeneratedImages(urls)
          setSelectedResult(0)

          const items: GalleryItem[] = urls.map((url) => ({
            id: crypto.randomUUID(),
            url,
            prompt: `${sessionPrompt} \u00b7 ${selectedPresetLabels.join(' + ')}`,
            model: engineLabel,
            timestamp: Date.now(),
            type: 'session' as const,
            characterId: selectedChar!.id,
            tags: ['photo-session', ...selectedPresetLabels.map(l => l.toLowerCase())],
          }))

          useGalleryStore.getState().addItems(items)
          toast.success(`${urls.length} photos generated`)

        } else {
          // No reference image — text-only generation via Gemini
          const params: InfluencerParams = {
            characters: [{
              id: selectedChar!.id,
              characteristics: selectedChar!.characteristics || selectedChar!.name,
              outfitDescription: selectedChar!.outfitDescription || '',
              pose: 'varied natural poses',
              accessory: selectedChar!.accessory || '',
            }],
            scenario: fullPrompt,
            lighting: 'natural, varied per shot',
            camera: 'varied angles',
            imageSize: ImageSize.Size2K,
            aspectRatio: AspectRatio.Portrait,
            numberOfImages: shotCount,
            scenarioImage: refImage ? [refImage.file] : undefined,
          }

          const results = await generateInfluencerImage(params, (p) => setProgress(p), abortRef.current.signal)
          setGeneratedImages(results)
          setSelectedResult(0)

          const items: GalleryItem[] = results.map((url) => ({
            id: crypto.randomUUID(),
            url,
            prompt: `${sessionPrompt} \u00b7 ${selectedPresetLabels.join(' + ')}`,
            model: 'gemini-nb2',
            timestamp: Date.now(),
            type: 'session' as const,
            characterId: selectedChar!.id,
            tags: ['photo-session', ...selectedPresetLabels.map(l => l.toLowerCase())],
          }))

          useGalleryStore.getState().addItems(items)
          toast.success(`${results.length} photos generated`)
        }

        useCharacterStore.getState().incrementUsage(selectedChar!.id)
      }

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

  const costPerShot = OPERATION_CREDIT_COSTS.photoSession
  const selectedPresetLabels = PHOTO_SESSION_PRESETS.filter(p => selectedPresets.has(p.id)).map(p => p.label)
  const activeSceneLabel = sceneOverride || 'No override'
  const activeSceneIcon = customScene.trim() ? '\uD83D\uDCCD' : (selectedScene ? (scenes.find(s => s.id === selectedScene)?.icon || '') : '')

  // Determine if generate button should be disabled
  const canGenerate = (() => {
    if (generating) return false
    if (sourceMode === 'gallery' && !selectedGalleryItem) return false
    if (sourceMode === 'upload' && !uploadedSubject) return false
    if (sourceMode === 'character' && !selectedChar) return false
    return true
  })()

  // Base image preview for canvas
  const baseImagePreview = (() => {
    if (sourceMode === 'gallery' && selectedGalleryItem) return selectedGalleryItem.url
    if (sourceMode === 'upload' && uploadedSubject) return uploadedSubject.preview
    if (sourceMode === 'character' && selectedChar?.thumbnail) return selectedChar.thumbnail
    return null
  })()

  return (
    <div className="h-screen flex" style={{ background: 'var(--joi-bg-0)' }}>
      {/* Hidden file inputs */}
      <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
      <input ref={subjectInputRef} type="file" accept="image/*" className="hidden" onChange={handleSubjectUpload} />

      {/* Left Panel */}
      <div className="w-[360px] shrink-0 flex flex-col" style={{ background:'var(--joi-bg-1)', borderRight:'1px solid var(--joi-border)' }}>
        <div className="px-5 h-14 flex items-center shrink-0" style={{ borderBottom:'1px solid var(--joi-border)' }}>
          <h1 className="joi-heading joi-glow" style={{ fontSize: '1.75rem' }}>
            <span style={{ color: 'var(--joi-pink)' }}>Photo</span>{' '}
            <span style={{ color: 'var(--joi-text-1)' }}>Session</span>
          </h1>
        </div>

        {/* Source selector — gallery / upload / character */}
        <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--joi-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="joi-label">Source</div>
            <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background:'var(--joi-bg-3)' }}>
              {(['gallery', 'upload', 'character'] as const).map(mode => (
                <button key={mode} onClick={() => setSourceMode(mode)}
                  className="px-2 py-0.5 rounded-md text-[9px] transition-all"
                  style={{
                    background: sourceMode === mode ? 'rgba(255,107,157,.08)' : 'transparent',
                    color: sourceMode === mode ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                  }}>
                  {mode === 'gallery' ? 'Gallery' : mode === 'upload' ? 'Upload' : 'Character'}
                </button>
              ))}
            </div>
          </div>

          {sourceMode === 'gallery' ? (
            /* Gallery picker mode */
            <div>
              {recentPhotos.length === 0 ? (
                <div className="text-[11px] py-3 text-center" style={{ color:'var(--joi-text-3)' }}>
                  No gallery photos yet. Generate some in Director first.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto joi-scroll" style={{ scrollbarWidth:'thin' }}>
                    {recentPhotos.map(g => (
                      <button key={g.id} onClick={() => setSelectedGalleryItem(g)}
                        className="aspect-square rounded-lg overflow-hidden transition-all hover:scale-105"
                        style={{
                          border: `2px solid ${selectedGalleryItem?.id === g.id ? 'var(--joi-pink)' : 'var(--joi-border)'}`,
                        }}>
                        <img src={g.url} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                  {selectedGalleryItem && (
                    <div className="flex items-center gap-2 mt-2">
                      <img src={selectedGalleryItem.url} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate" style={{ color:'var(--joi-text-1)' }}>Base photo selected</div>
                        <div className="text-[9px] truncate" style={{ color:'var(--joi-text-3)' }}>
                          {selectedGalleryItem.model || 'Gallery photo'}
                        </div>
                      </div>
                      <button onClick={() => setSelectedGalleryItem(null)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0"
                        style={{ background:'var(--joi-bg-3)', color:'var(--joi-text-3)' }}>{'\u2715'}</button>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1" />
                {/* Engine selector */}
                <button onClick={() => setShowEngineModal(!showEngineModal)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105 shrink-0"
                  style={{
                    background: selectedEngine !== 'auto' ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                    border: `1px solid ${selectedEngine !== 'auto' ? 'rgba(255,107,157,.2)' : 'var(--joi-border)'}`,
                    color: selectedEngine !== 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                  }}>
                  {'\uD83D\uDD27'}
                </button>
              </div>
            </div>
          ) : sourceMode === 'upload' ? (
            /* Photo upload mode */
            <div className="flex gap-2 items-center">
              {uploadedSubject ? (
                <div className="flex items-center gap-2 flex-1">
                  <img src={uploadedSubject.preview} className="w-10 h-10 rounded-lg object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color:'var(--joi-text-1)' }}>Photo uploaded</div>
                    <button onClick={() => subjectInputRef.current?.click()}
                      className="text-[9px]" style={{ color:'var(--joi-pink)' }}>Change</button>
                  </div>
                  <button onClick={() => setUploadedSubject(null)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0"
                    style={{ background:'var(--joi-bg-3)', color:'var(--joi-text-3)' }}>{'\u2715'}</button>
                </div>
              ) : (
                <button onClick={() => subjectInputRef.current?.click()}
                  className="flex-1 py-3 rounded-xl text-center transition-all"
                  style={{ background:'var(--joi-bg-2)', border:'1px dashed rgba(255,255,255,.04)', backdropFilter:'blur(8px)' }}>
                  <span className="text-sm block mb-0.5" style={{ color:'var(--joi-pink)' }}>{'\u2191'}</span>
                  <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>Upload a photo</span>
                </button>
              )}
              {/* Engine selector */}
              <button onClick={() => setShowEngineModal(!showEngineModal)}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105 shrink-0"
                style={{
                  background: selectedEngine !== 'auto' ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                  border: `1px solid ${selectedEngine !== 'auto' ? 'rgba(255,107,157,.2)' : 'var(--joi-border)'}`,
                  color: selectedEngine !== 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                }}>
                {'\uD83D\uDD27'}
              </button>
            </div>
          ) : (
            /* Character mode (fallback) */
            <div className="flex gap-2 items-center">
              {characters.length === 0 ? (
                <div className="text-[11px] py-2 flex-1" style={{ color:'var(--joi-text-3)' }}>No characters created</div>
              ) : (
                characters.slice(0, 4).map(c => (
                  <button key={c.id} onClick={() => setSelectedCharId(c.id)}
                    className="flex-1 py-2 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all"
                    style={{
                      background: selectedCharId === c.id ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                      border: `1px solid ${selectedCharId === c.id ? 'rgba(255,107,157,.2)' : 'var(--joi-border)'}`,
                      color: selectedCharId === c.id ? 'var(--joi-pink)' : 'var(--joi-text-2)',
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
              {/* Engine selector */}
              <button onClick={() => setShowEngineModal(!showEngineModal)}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105 shrink-0"
                style={{
                  background: selectedEngine !== 'auto' ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                  border: `1px solid ${selectedEngine !== 'auto' ? 'rgba(255,107,157,.2)' : 'var(--joi-border)'}`,
                  color: selectedEngine !== 'auto' ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                }}>
                {'\uD83D\uDD27'}
              </button>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 joi-scroll">

          {/* Scene Override (optional) */}
          <div>
            <div className="joi-label mb-1">
              Scene Override
            </div>
            <div className="text-[8px] mb-2" style={{ color:'var(--joi-text-3)', opacity: 0.6 }}>
              Optional — base photo already has a scene
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5" style={{ scrollbarWidth:'none' }}>
              {scenes.map(s => (
                <button key={s.id} onClick={() => { setSelectedScene(selectedScene === s.id ? '' : s.id); setCustomScene('') }}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
                  style={{
                    background: selectedScene === s.id && !customScene ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                    border: `1px solid ${selectedScene === s.id && !customScene ? 'rgba(255,107,157,.2)' : 'var(--joi-border)'}`,
                    color: selectedScene === s.id && !customScene ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                  }}>
                  <span>{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Or describe a custom scene override..."
              className="w-full mt-2 px-3 py-2 rounded-xl text-[11px] border outline-none transition-colors"
              style={{
                background: 'var(--joi-bg-2)',
                borderColor: customScene ? 'rgba(255,107,157,.2)' : 'rgba(255,255,255,.04)',
                color: 'var(--joi-text-1)',
                backdropFilter: 'blur(8px)',
              }}
              value={customScene}
              onChange={e => setCustomScene(e.target.value)} />
          </div>

          {/* Vibes — Session Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="joi-label">Pick your vibes</div>
              <div className="text-[9px] font-mono" style={{ color:'var(--joi-pink)' }}>
                {selectedPresets.size} selected
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PHOTO_SESSION_PRESETS.map(p => {
                const active = selectedPresets.has(p.id)
                return (
                  <button key={p.id} onClick={() => togglePreset(p.id)}
                    className="p-3 rounded-lg text-left transition-all group"
                    style={{
                      background: active ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                      border: `1px solid ${active ? 'rgba(255,107,157,.25)' : 'var(--joi-border)'}`,
                    }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{p.icon}</span>
                      {active && (
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] ml-auto"
                          style={{ background:'var(--joi-pink)', color:'#fff' }}>{'\u2713'}</span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium" style={{ color: active ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{p.label}</div>
                    <div className="text-[8px] mt-0.5 line-clamp-1" style={{ color:'var(--joi-text-3)' }}>{p.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reference image (optional) */}
          <div>
            <div className="joi-label mb-2">
              Reference <span style={{ opacity: 0.5 }}>(optional)</span>
            </div>

            {refImage ? (
              <div className="relative aspect-video rounded-lg overflow-hidden"
                style={{ border:'1px solid rgba(255,107,157,.2)' }}>
                <img src={refImage.preview} className="w-full h-full object-cover" alt="" />
                <button onClick={() => setRefImage(null)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  style={{ background:'rgba(0,0,0,.7)', color:'var(--joi-text-1)' }}>{'\u2715'}</button>
                <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] backdrop-blur-sm"
                  style={{ background:'rgba(0,0,0,.5)', color:'var(--joi-text-1)' }}>Look reference</div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => refInputRef.current?.click()}
                  className="flex-1 py-3 rounded-xl text-center transition-all"
                  style={{ background:'var(--joi-bg-2)', border:'1px dashed rgba(255,255,255,.04)', backdropFilter:'blur(8px)' }}>
                  <span className="text-sm block mb-0.5" style={{ color:'var(--joi-pink)' }}>{'\u2191'}</span>
                  <span className="text-[10px]" style={{ color:'var(--joi-text-2)' }}>Upload</span>
                </button>

                {galleryItems.length > 0 && (
                  <div className="flex gap-1.5 items-center overflow-x-auto" style={{ scrollbarWidth:'none' }}>
                    {galleryItems.slice(0, 5).map(g => (
                      <button key={g.id} onClick={() => {
                        fetch(g.url).then(r => r.blob()).then(b => {
                          const file = new File([b], 'gallery-ref.png', { type: b.type || 'image/png' })
                          setRefImage({ file, preview: g.url })
                        })
                      }}
                        className="w-11 h-11 rounded-lg overflow-hidden shrink-0 transition-all hover:scale-105"
                        style={{ border:'1px solid var(--joi-border)' }}>
                        <img src={g.url} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: shot count + generate */}
        <div className="px-4 py-3 shrink-0 space-y-3" style={{ borderTop:'1px solid var(--joi-border)' }}>
          <div>
            <div className="joi-label mb-2">Photos</div>
            <div className="flex gap-1.5">
              {[1,2,3,4,5,6,7,8].map(n => (
                <button key={n} onClick={() => setShotCount(n)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: shotCount === n ? 'rgba(255,107,157,.12)' : 'var(--joi-bg-3)',
                    border: `1px solid ${shotCount === n ? 'rgba(255,107,157,.25)' : 'var(--joi-border)'}`,
                    color: shotCount === n ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                  }}>{n}</button>
              ))}
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <div className="text-[9px] truncate pr-2" style={{ color:'var(--joi-text-3)' }}>
                {mixedShots.length} shots {'\u00b7'} {selectedPresetLabels.join(' + ')}
              </div>
              <span className="badge text-[9px] shrink-0" style={{ background:'rgba(255,107,157,.08)', color:'var(--joi-pink)', border:'1px solid rgba(255,107,157,.15)' }}>
                {shotCount * costPerShot} credits
              </span>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={!canGenerate}
            className={`joi-btn-solid w-full py-3 text-sm ${!generating && canGenerate ? 'joi-breathe' : ''}`}
            style={{ opacity: !canGenerate ? 0.5 : 1 }}>
            {generating ? `\u27F3 Generating... ${Math.round(progress)}%` : `\u2726 Shoot ${shotCount} Photos`}
          </button>
        </div>
      </div>

      {/* Center Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="h-11 flex items-center px-4 gap-1.5 shrink-0" style={{ borderBottom:'1px solid var(--joi-border)', background:'var(--joi-bg-1)' }}>
          {['\u21BA','\u21BB','\uD83D\uDD0D','\u27F2 Variations','\uD83D\uDCBE'].map(t => (
            <button key={t} className="px-2.5 py-1 rounded-md text-[11px] transition-colors hover:bg-white/5" style={{ color:'var(--joi-text-2)' }}>{t}</button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] font-mono" style={{ color:'var(--joi-text-3)' }}>
            {activeSceneIcon} {sceneOverride || 'Base photo'} {'\u00b7'} {selectedPresetLabels.join(' + ')}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 joi-mesh">
          <div className="w-[520px] h-[520px] rounded-lg relative overflow-hidden joi-glass"
            style={{ border:'1px solid var(--joi-border-glass)' }}>

            {generatedImages.length > 0 ? (
              <img src={generatedImages[selectedResult]} className="w-full h-full object-cover" alt="Generated" />
            ) : baseImagePreview ? (
              <div className="absolute inset-0">
                <img src={baseImagePreview} className="w-full h-full object-cover opacity-30" alt="Base preview" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-md mx-auto mb-2 flex items-center justify-center joi-breathe"
                      style={{ background:'rgba(255,107,157,.1)', border:'1px solid rgba(255,107,157,.2)' }}>
                      <span className="text-xl">{'\uD83D\uDCF8'}</span>
                    </div>
                    <p className="text-[11px]" style={{ color:'var(--joi-text-2)' }}>Base photo ready — pick vibes and shoot</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0" style={{
                background:'linear-gradient(135deg, rgba(255,107,157,.06) 0%, var(--joi-bg-2) 50%, rgba(200,130,255,.04) 100%)'
              }}>
                {/* Floating vibe icons */}
                <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-20">
                  {PHOTO_SESSION_PRESETS.filter(p => selectedPresets.has(p.id)).map(p => (
                    <span key={p.id} className="text-[48px]">{p.icon}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Scene + vibes badges */}
            <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
              {sceneOverride && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono backdrop-blur-sm"
                  style={{ background:'rgba(0,0,0,.4)', color:'var(--joi-text-1)' }}>
                  {activeSceneIcon} {sceneOverride}
                </span>
              )}
              {PHOTO_SESSION_PRESETS.filter(p => selectedPresets.has(p.id)).map(p => (
                <span key={p.id} className="px-2 py-0.5 rounded-md text-[9px] font-mono backdrop-blur-sm"
                  style={{ background:'rgba(0,0,0,.4)', color:'var(--joi-pink)' }}>
                  {p.icon} {p.label}
                </span>
              ))}
            </div>

            {generatedImages.length === 0 && !baseImagePreview && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-md mx-auto mb-2 flex items-center justify-center joi-breathe"
                    style={{ background:'rgba(255,107,157,.1)', border:'1px solid rgba(255,107,157,.2)' }}>
                    <span className="text-xl">{'\uD83D\uDCF8'}</span>
                  </div>
                  <p className="text-[11px]" style={{ color:'var(--joi-text-3)' }}>Pick a base photo and vibes, then shoot</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom filmstrip */}
        <div className="h-20 flex items-center px-5 gap-2.5 shrink-0" style={{ borderTop:'1px solid var(--joi-border)', background:'var(--joi-bg-1)' }}>
          <span className="text-[9px] font-mono shrink-0 mr-1" style={{ color:'var(--joi-text-3)' }}>SHOTS</span>
          {generatedImages.length > 0 ? (
            generatedImages.map((url, i) => (
              <div key={i} onClick={() => setSelectedResult(i)}
                className="w-12 h-12 rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                style={{ border: `2px solid ${selectedResult === i ? 'var(--joi-pink)' : 'var(--joi-border)'}` }}>
                <img src={url} className="w-full h-full object-cover" alt="" />
              </div>
            ))
          ) : (
            Array.from({ length: shotCount }, (_, i) => (
              <div key={i} className="w-12 h-12 rounded-lg shrink-0 shimmer"
                style={{ border:'1px solid var(--joi-border)' }} />
            ))
          )}
        </div>
      </div>

      {/* Engine selector modal */}
      {showEngineModal && <>
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowEngineModal(false)} />
        <div className="fixed z-50 w-[340px] max-h-[90vh] flex flex-col rounded-xl backdrop-blur-xl"
          style={{ top:'50%', left:'calc(50% + 110px)', transform:'translate(-50%,-50%)', background:'var(--joi-bg-glass)', border:'1px solid var(--joi-border-glass)', boxShadow:'0 20px 60px rgba(0,0,0,.6)', overflow:'hidden' }}>
          <div className="overflow-y-auto p-3 pb-2 space-y-1 flex-1 min-h-0 joi-scroll">
            <div className="joi-label mb-2 px-1">Engine</div>

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

            {ENGINE_METADATA.map(eng => (
              <button key={eng.key} onClick={() => { setSelectedEngine(eng.key); setShowEngineModal(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all"
                style={{
                  background: selectedEngine === eng.key ? 'rgba(255,107,157,.08)' : 'transparent',
                  border: `1px solid ${selectedEngine === eng.key ? 'rgba(255,107,157,.2)' : 'transparent'}`,
                }}>
                <span className="text-sm" style={{ color:'var(--joi-text-3)' }}>{'\u2699'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{eng.userFriendlyName}</div>
                  <div className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>{eng.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] font-mono" style={{ color:'var(--joi-pink)' }}>{eng.creditCost}cr</div>
                  <div className="text-[8px] font-mono" style={{ color:'var(--joi-text-3)' }}>{eng.estimatedTime}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop:'1px solid var(--joi-border)' }}>
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
                    border: `1px solid ${selectedResolution === r.id ? 'rgba(255,107,157,.25)' : 'var(--joi-border)'}`,
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

export default PhotoSession
