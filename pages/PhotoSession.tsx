import React, { useState, useEffect, useRef } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { useNavigationStore } from '../stores/navigationStore'
import { generatePhotoSession, generateInfluencerImage } from '../services/geminiService'
import { generatePhotoSessionWithGrok, editImageWithSeedream5Lite, extractPoseSkeleton } from '../services/falService'
import { editWithSoulReference } from '../services/higgsfieldService'
import { VIBE_TO_SOUL_STYLE, SOUL_STYLES, SOUL_STYLES_CURATED, SOUL_STYLE_CATEGORIES, type SoulStyleCategory } from '../data/soulStyles'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { ImageSize, AspectRatio, ENGINE_METADATA, CREDIT_COSTS } from '../types'
import type { InfluencerParams, SessionPoseItem } from '../types'
import { PHOTO_SESSION_PRESETS, mixShots, REALISM_PREFIX } from '../data/sessionPresets'
import { usePipelineStore } from '../stores/pipelineStore'
import { PipelineCTA } from '../components/PipelineCTA'
import { PresetManager } from '../components/PresetManager'
import type { CustomPreset } from '../stores/presetStore'
import { runSessionPipeline, SESSION_TIER_COSTS, type SessionTier, type SessionPipelineConfig } from '../services/photoSessionPipeline'
// Grid splitting (splitGrid, GRID_2x2_PROMPT_TEMPLATE) is handled internally by photoSessionPipeline
// Import available if needed for direct use: import { splitGrid, GRID_2x2_PROMPT_TEMPLATE } from '../services/gridSplitter'

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
  const [selectedSoulStyle, setSelectedSoulStyle] = useState<string>(SOUL_STYLES[0].id)
  const [soulStyleCategory, setSoulStyleCategory] = useState<SoulStyleCategory | 'all'>('all')
  const [showAllStyles, setShowAllStyles] = useState(false)
  const [shotCount, setShotCount] = useState(4)
  const [selectedEngine, setSelectedEngine] = useState<string>('grok')
  const [selectedResolution, setSelectedResolution] = useState('1k')
  const [showEngineModal, setShowEngineModal] = useState(false)
  const [realisticMode, setRealisticMode] = useState(true)

  // Pipeline tier & mode
  const [selectedTier, setSelectedTier] = useState<SessionTier>('basic')
  const [poseMode, setPoseMode] = useState<'presets' | 'manual'>('presets')
  const [gridMode, setGridMode] = useState(false)
  const [upscaleMode, setUpscaleMode] = useState(false)
  const [progressStep, setProgressStep] = useState('')

  // Manual pose cards
  const [manualPoses, setManualPoses] = useState<SessionPoseItem[]>([
    { id: crypto.randomUUID(), text: '', images: [] },
  ])
  const poseFileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  // Track which pose cards have skeleton-extracted images (by pose id)
  const [skeletonPoseIds, setSkeletonPoseIds] = useState<Set<string>>(new Set())
  // Track which poses are currently extracting skeletons
  const [extractingSkeletonIds, setExtractingSkeletonIds] = useState<Set<string>>(new Set())

  const addManualPose = () => {
    if (manualPoses.length >= 8) return
    setManualPoses(prev => [...prev, { id: crypto.randomUUID(), text: '', images: [] }])
  }
  const removeManualPose = (id: string) => {
    if (manualPoses.length <= 1) return
    setManualPoses(prev => prev.filter(p => p.id !== id))
    setSkeletonPoseIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }
  const updateManualPose = (id: string, update: Partial<SessionPoseItem>) => {
    setManualPoses(prev => prev.map(p => p.id === id ? { ...p, ...update } : p))
    // If images are cleared, remove skeleton flag
    if (update.images && update.images.length === 0) {
      setSkeletonPoseIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  const handleExtractSkeleton = async (poseId: string, imageFile: File) => {
    setExtractingSkeletonIds(prev => new Set(prev).add(poseId))
    try {
      const skeletonFile = await extractPoseSkeleton(imageFile)
      updateManualPose(poseId, { images: [skeletonFile] })
      setSkeletonPoseIds(prev => new Set(prev).add(poseId))
      toast.success('Skeleton extracted')
    } catch {
      toast.error('Could not extract skeleton')
    } finally {
      setExtractingSkeletonIds(prev => { const next = new Set(prev); next.delete(poseId); return next })
    }
  }

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

  // ── Advanced: Negative Prompt & Image Boost ──
  const [negativePrompt, setNegativePrompt] = useState('')
  const [imageBoostOn, setImageBoostOn] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const IMAGE_BOOST_KEYWORDS = 'masterpiece, best quality, highly detailed, sharp focus, 8k uhd'

  // ── Reuse Parameters (from Gallery) ──
  const reuseParams = useGalleryStore(s => s.reuseParams)
  const setReuseParams = useGalleryStore(s => s.setReuseParams)

  useEffect(() => {
    if (reuseParams && reuseParams.target === 'session') {
      if (reuseParams.negativePrompt) { setNegativePrompt(reuseParams.negativePrompt); setAdvancedOpen(true) }
      if (reuseParams.imageBoost) { setImageBoostOn(true); setAdvancedOpen(true) }
      if (reuseParams.characterId) {
        const match = characters.find(c => c.id === reuseParams.characterId)
        if (match) setSelectedCharId(match.id)
      }
      setReuseParams(null)
    }
  }, [reuseParams])

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

  // Auto-load from pipeline (edited hero or hero shot)
  const pipelineEditedUrl = usePipelineStore(s => s.editedHeroUrl)
  const pipelineHeroUrl = usePipelineStore(s => s.heroShotUrl)
  const pipelineSuggestedNext = usePipelineStore(s => s.suggestedNext)

  useEffect(() => {
    const pipelineUrl = pipelineEditedUrl ?? pipelineHeroUrl
    if (pipelineUrl && !pendingImage && !uploadedSubject && !selectedGalleryItem) {
      setSourceMode('upload')
      fetch(pipelineUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'pipeline-subject.png', { type: blob.type || 'image/png' })
          setUploadedSubject({ file, preview: pipelineUrl })
        })
        .catch(() => {})
    }
  }, [pipelineEditedUrl, pipelineHeroUrl])

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

  // Pipeline-based generation (tier-aware)
  const handlePipelineGenerate = async () => {
    const hasGalleryBase = sourceMode === 'gallery' && selectedGalleryItem
    const hasUploadBase = sourceMode === 'upload' && uploadedSubject

    if (!hasGalleryBase && !hasUploadBase) {
      toast.error(sourceMode === 'gallery' ? 'Select a photo from gallery' : 'Upload a photo')
      return
    }

    if (effectivePoses.length === 0) {
      toast.error(poseMode === 'presets' ? 'Select at least one vibe' : 'Add at least one pose')
      return
    }

    const poseCount = gridMode ? 4 : effectivePoses.length
    const totalCost = poseCount * costPerShot
    const ok = await decrementCredits(totalCost)
    if (!ok) { toast.error('Insufficient credits'); return }

    setGenerating(true)
    setProgress(0)
    setProgressStep('Preparing...')
    abortRef.current = new AbortController()

    try {
      // Build base image file
      let baseFile: File
      if (hasGalleryBase) {
        const resp = await fetch(selectedGalleryItem!.url)
        const blob = await resp.blob()
        baseFile = new File([blob], 'base.png', { type: blob.type || 'image/png' })
      } else {
        baseFile = uploadedSubject!.file
      }

      // Build pipeline config
      const config: SessionPipelineConfig = {
        tier: selectedTier,
        baseImage: baseFile,
        poses: gridMode ? effectivePoses.slice(0, 4) : effectivePoses,
        realisticMode,
        gridMode: gridMode && effectivePoses.length >= 4,
        scenario: sceneOverride || undefined,
        upscale: upscaleMode,
        aspectRatio: AspectRatio.Portrait,
        loraUrl: selectedChar?.loraUrl,
        loraTriggerWord: selectedChar?.name || 'subject',
        onProgress: (step, pct) => { setProgressStep(step); setProgress(pct) },
        abortSignal: abortRef.current.signal,
      }

      const result = await runSessionPipeline(config)

      setGeneratedImages(result.images)
      setSelectedResult(0)

      const tierLabel = `${selectedTier}-pipeline`
      const items: GalleryItem[] = result.images.map((url) => ({
        id: crypto.randomUUID(),
        url,
        prompt: `${sceneOverride || 'Base photo'} · ${selectedPresetLabels.join(' + ')}`,
        model: tierLabel,
        timestamp: Date.now(),
        type: 'session' as const,
        characterId: selectedGalleryItem?.characterId || undefined,
        tags: ['photo-session', selectedTier, ...selectedPresetLabels.map(l => l.toLowerCase())],
      }))

      useGalleryStore.getState().addItems(items)
      toast.success(`${result.images.length} photos generated (${selectedTier})`)

    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        restoreCredits(totalCost)
        toast.error(err?.message || 'Error generating session')
        console.error(err)
      }
    } finally {
      setGenerating(false)
      setProgress(0)
      setProgressStep('')
    }
  }

  const handleGenerate = async () => {
    // Route to pipeline for gallery/upload sources when using tiers
    const hasGalleryBase = sourceMode === 'gallery' && selectedGalleryItem
    const hasUploadBase = sourceMode === 'upload' && uploadedSubject
    if ((hasGalleryBase || hasUploadBase) && selectedEngine !== 'higgsfield:soul' && selectedEngine !== 'seedream5-edit') {
      return handlePipelineGenerate()
    }

    // Legacy path for character mode and special engines
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
    const legacyCostPerShot = CREDIT_COSTS['grok-edit']
    const totalCost = effectiveShotCount * legacyCostPerShot

    const ok = await decrementCredits(totalCost)
    if (!ok) { toast.error('Insufficient credits'); return }

    setGenerating(true)
    setProgress(0)
    abortRef.current = new AbortController()

    const selectedPresetLabels = PHOTO_SESSION_PRESETS
      .filter(p => selectedPresets.has(p.id))
      .map(p => p.label)

    const realismPfx = realisticMode ? REALISM_PREFIX : ''

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

        const engineLabel = selectedEngine === 'higgsfield:soul' ? 'soul-session' : selectedEngine === 'seedream5-edit' ? 'seedream5-session' : selectedEngine !== 'gemini' ? 'grok-session' : 'gemini-photo-session'

        let results: { url: string; poseIndex: number }[]

        if (selectedEngine === 'higgsfield:soul') {
          // Soul Reference: one call per shot with selected Soul Style
          results = []
          const scenePart = sceneOverride ? `Scene: ${sceneOverride}.` : ''
          for (let i = 0; i < mixedShots.length; i++) {
            const angle = mixedShots[i]
            const prompt = `${realismPfx} ${angle}. ${scenePart} Same person, same outfit.`
            const urls = await editWithSoulReference(
              refFile,
              prompt,
              AspectRatio.Portrait,
              (p) => setProgress(((i + p / 100) / mixedShots.length) * 100),
              abortRef.current!.signal,
              selectedSoulStyle
            )
            if (urls.length > 0) {
              results.push({ url: urls[0], poseIndex: i })
            }
          }
        } else if (selectedEngine === 'seedream5-edit') {
          // Seedream 5 Edit: one call per shot
          results = []
          const scenePart = sceneOverride ? `Scene: ${sceneOverride}.` : ''
          for (let i = 0; i < mixedShots.length; i++) {
            const angle = mixedShots[i]
            const prompt = `${realismPfx} Edit this photo. Creative direction: ${angle}. ${scenePart} Keep the same person and outfit, vary the pose naturally.`
            const urls = await editImageWithSeedream5Lite(
              refFile,
              prompt,
              (p) => setProgress(((i + p / 100) / mixedShots.length) * 100),
              abortRef.current!.signal
            )
            if (urls.length > 0) {
              results.push({ url: urls[0], poseIndex: i })
            }
          }
        } else if (selectedEngine === 'gemini') {
          results = await generatePhotoSession(
            refFile,
            mixedShots.length,
            {
              scenario: `${realismPfx} ${sceneOverride || 'Same type of location as the reference photo'}`,
              lighting: 'natural, varied per shot',
              negativePrompt: negativePrompt.trim() || undefined,
              imageBoost: imageBoostOn ? IMAGE_BOOST_KEYWORDS : undefined,
            },
            (p) => setProgress(p),
            abortRef.current.signal
          )
        } else {
          // Grok (default)
          results = await generatePhotoSessionWithGrok(
            refFile,
            mixedShots.length,
            {
              scenario: `${realismPfx} ${sceneOverride || ''}`.trim(),
              angles: mixedShots,
              negativePrompt: negativePrompt.trim() || undefined,
              imageBoost: imageBoostOn ? IMAGE_BOOST_KEYWORDS : undefined,
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
          characterId: selectedGalleryItem?.characterId || undefined,
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

        const sessionPrompt = sceneOverride || 'natural indoor setting'
        const fullPrompt = `${realismPfx} ${sessionPrompt}. ${mixedShots.length > 0 ? '' : PHOTO_SESSION_PRESETS.filter(p => selectedPresets.has(p.id)).map(p => p.description).join('. ') + '.'}`

        if (refFile) {
          const engineLabel = selectedEngine === 'higgsfield:soul' ? 'soul-session' : selectedEngine === 'seedream5-edit' ? 'seedream5-session' : selectedEngine !== 'gemini' ? 'grok-session' : 'gemini-photo-session'

          let results: { url: string; poseIndex: number }[]

          if (selectedEngine === 'higgsfield:soul') {
            // Soul Reference: one call per shot with selected Soul Style
            results = []
            const angles = mixedShots.length > 0 ? mixedShots : Array.from({ length: shotCount }, (_, i) => `Shot ${i + 1}`)
            for (let i = 0; i < angles.length; i++) {
              const angle = angles[i]
              const prompt = `${angle}. ${fullPrompt} Same person, same outfit.`
              const urls = await editWithSoulReference(
                refFile,
                prompt,
                AspectRatio.Portrait,
                (p) => setProgress(((i + p / 100) / angles.length) * 100),
                abortRef.current!.signal,
                selectedSoulStyle
              )
              if (urls.length > 0) {
                results.push({ url: urls[0], poseIndex: i })
              }
            }
          } else if (selectedEngine === 'seedream5-edit') {
            // Seedream 5 Edit: one call per shot
            results = []
            const angles = mixedShots.length > 0 ? mixedShots : Array.from({ length: shotCount }, (_, i) => `Shot ${i + 1}`)
            for (let i = 0; i < angles.length; i++) {
              const angle = angles[i]
              const prompt = `${realismPfx} Edit this photo. Creative direction: ${angle}. ${fullPrompt} Keep the same person and outfit, vary the pose naturally.`
              const urls = await editImageWithSeedream5Lite(
                refFile,
                prompt,
                (p) => setProgress(((i + p / 100) / angles.length) * 100),
                abortRef.current!.signal
              )
              if (urls.length > 0) {
                results.push({ url: urls[0], poseIndex: i })
              }
            }
          } else if (selectedEngine === 'gemini') {
            results = await generatePhotoSession(
              refFile,
              shotCount,
              {
                scenario: fullPrompt,
                lighting: 'natural, varied per shot',
                angles: mixedShots.length > 0 ? mixedShots : undefined,
                negativePrompt: negativePrompt.trim() || undefined,
                imageBoost: imageBoostOn ? IMAGE_BOOST_KEYWORDS : undefined,
              },
              (p) => setProgress(p),
              abortRef.current.signal
            )
          } else {
            // Grok (default)
            results = await generatePhotoSessionWithGrok(
              refFile,
              shotCount,
              {
                scenario: fullPrompt,
                angles: mixedShots.length > 0 ? mixedShots : undefined,
                negativePrompt: negativePrompt.trim() || undefined,
                imageBoost: imageBoostOn ? IMAGE_BOOST_KEYWORDS : undefined,
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

  const costPerShot = SESSION_TIER_COSTS[selectedTier]
  const selectedPresetLabels = PHOTO_SESSION_PRESETS.filter(p => selectedPresets.has(p.id)).map(p => p.label)
  const activeSceneLabel = sceneOverride || 'No override'
  const activeSceneIcon = customScene.trim() ? '\uD83D\uDCCD' : (selectedScene ? (scenes.find(s => s.id === selectedScene)?.icon || '') : '')

  // Effective poses for generation
  const effectivePoses: SessionPoseItem[] = poseMode === 'manual'
    ? manualPoses.filter(p => p.text.trim() || p.images.length > 0)
    : mixedShots.map((text, i) => ({ id: `preset-${i}`, text, images: [] }))

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
    <div className="h-full flex" style={{ background: 'var(--joi-bg-0)' }}>
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

        {/* Preset Manager */}
        <div className="px-4 py-2.5 shrink-0" style={{ borderBottom:'1px solid var(--joi-border)' }}>
          <PresetManager
            currentSettings={{
              prompt: customScene,
              vibes: Array.from(selectedPresets),
              engine: selectedEngine,
              realisticMode,
              gridMode,
            }}
            onLoad={(preset: CustomPreset) => {
              if (preset.prompt !== undefined) setCustomScene(preset.prompt)
              if (preset.vibes) setSelectedPresets(new Set(preset.vibes))
              if (preset.engine !== undefined) setSelectedEngine(preset.engine)
              if (preset.realisticMode !== undefined) setRealisticMode(preset.realisticMode)
              if (preset.gridMode !== undefined) setGridMode(preset.gridMode)
            }}
          />
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

          {/* Tier Selector */}
          <div>
            <div className="joi-label mb-2">Quality Tier</div>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                {
                  tier: 'basic' as SessionTier,
                  label: 'Basic',
                  engine: 'Gemini Flash (NB2)',
                  benefit: 'Fast & affordable',
                  icon: '\u26A1',
                  cost: SESSION_TIER_COSTS.basic,
                  accentColor: 'rgba(255,107,157',
                },
                {
                  tier: 'standard' as SessionTier,
                  label: 'Standard',
                  engine: 'FLUX Kontext Pro',
                  benefit: 'Best quality',
                  icon: '\u2B50',
                  cost: SESSION_TIER_COSTS.standard,
                  recommended: true,
                  accentColor: 'rgba(167,139,250',
                },
                {
                  tier: 'premium' as SessionTier,
                  label: 'Premium',
                  engine: 'Klein Edit LoRA',
                  benefit: 'Your trained model',
                  icon: '\uD83D\uDC51',
                  cost: SESSION_TIER_COSTS.premium,
                  accentColor: 'rgba(255,199,95',
                },
                {
                  tier: 'soul' as SessionTier,
                  label: 'Soul 2.0',
                  engine: 'Higgsfield Soul',
                  benefit: 'Fashion-grade realism',
                  icon: '\u2726',
                  cost: SESSION_TIER_COSTS.soul,
                  accentColor: 'rgba(255,107,157',
                },
              ]).map(t => {
                const active = selectedTier === t.tier
                const disabled = t.tier === 'premium' && !selectedChar?.loraUrl
                const ac = t.accentColor
                return (
                  <button key={t.tier} onClick={() => !disabled && setSelectedTier(t.tier)}
                    className="p-2.5 rounded-lg text-center transition-all relative"
                    style={{
                      background: active ? `${ac},.1)` : 'var(--joi-bg-3)',
                      border: `1px solid ${active ? `${ac},.3)` : 'var(--joi-border)'}`,
                      opacity: disabled ? 0.35 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}>
                    {t.recommended && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0 rounded-full text-[7px] font-bold uppercase tracking-wider whitespace-nowrap"
                        style={{ background: `${ac},.9)`, color: '#0E0C14' }}>
                        Recommended
                      </span>
                    )}
                    <span className="text-lg block mt-0.5">{t.icon}</span>
                    <div className="text-[10px] font-semibold mt-1" style={{ color: active ? `${ac},.9)` : 'var(--joi-text-1)' }}>{t.label}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: active ? `${ac},.7)` : 'var(--joi-text-3)' }}>{t.benefit}</div>
                    <div className="text-[7px] mt-0.5 truncate" style={{ color:'var(--joi-text-3)' }}>{t.engine}</div>
                    <div className="text-[9px] font-mono font-bold mt-1" style={{ color: active ? `${ac},.9)` : 'var(--joi-text-3)' }}>~{t.cost}cr/img</div>
                    {disabled && (
                      <div className="text-[7px] mt-0.5 font-medium" style={{ color:'var(--joi-pink)' }}>Train LoRA first</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pose Mode Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="joi-label">Poses</div>
              <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background:'var(--joi-bg-3)' }}>
                <button onClick={() => setPoseMode('presets')}
                  className="px-2.5 py-1 rounded-md text-[9px] font-medium transition-all"
                  style={{
                    background: poseMode === 'presets' ? 'rgba(255,107,157,.08)' : 'transparent',
                    color: poseMode === 'presets' ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                  }}>
                  Presets
                </button>
                <button onClick={() => setPoseMode('manual')}
                  className="px-2.5 py-1 rounded-md text-[9px] font-medium transition-all"
                  style={{
                    background: poseMode === 'manual' ? 'rgba(167,139,250,.08)' : 'transparent',
                    color: poseMode === 'manual' ? 'var(--joi-violet)' : 'var(--joi-text-3)',
                  }}>
                  Manual
                </button>
              </div>
            </div>

            {poseMode === 'manual' && (
              <div className="space-y-2">
                <div className="text-[9px] px-1 mb-1" style={{ color:'var(--joi-text-3)' }}>
                  {manualPoses.length}/8 pose cards — describe each pose or upload a reference image
                </div>
                {manualPoses.map((pose, idx) => {
                  const isSkeleton = skeletonPoseIds.has(pose.id)
                  const isExtracting = extractingSkeletonIds.has(pose.id)
                  return (
                  <div key={pose.id} className="p-2.5 rounded-lg relative" style={{ background:'var(--joi-bg-3)', border: `1px solid ${isSkeleton ? 'rgba(167,139,250,.25)' : 'var(--joi-border)'}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-mono" style={{ color:'var(--joi-text-3)' }}>#{idx + 1}</span>
                      {isSkeleton && (
                        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background:'rgba(167,139,250,.1)', color:'var(--joi-violet)', border:'1px solid rgba(167,139,250,.2)' }}>
                          Skeleton
                        </span>
                      )}
                      {manualPoses.length > 1 && (
                        <button onClick={() => removeManualPose(pose.id)}
                          className="ml-auto w-5 h-5 rounded flex items-center justify-center text-[10px] hover:bg-white/5 transition-colors"
                          style={{ color:'var(--joi-text-3)' }}>{'\u2715'}</button>
                      )}
                    </div>
                    <input type="text" placeholder="e.g. looking over shoulder, slight smile"
                      className="w-full px-2.5 py-1.5 rounded-lg text-[11px] border outline-none mb-1.5"
                      style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)' }}
                      value={pose.text}
                      onChange={e => updateManualPose(pose.id, { text: e.target.value })} />
                    <div className="flex gap-1.5">
                      {/* Pose reference image */}
                      {pose.images.length > 0 ? (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0"
                          style={{ border: `1px solid ${isSkeleton ? 'rgba(167,139,250,.4)' : 'rgba(167,139,250,.3)'}` }}>
                          <img src={URL.createObjectURL(pose.images[0])} className="w-full h-full object-cover" alt="" />
                          {isExtracting && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background:'rgba(0,0,0,.6)' }}>
                              <span className="text-[10px] animate-spin">{'\u27F3'}</span>
                            </div>
                          )}
                          <button onClick={() => updateManualPose(pose.id, { images: [] })}
                            className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center text-[8px] bg-black/70 text-white rounded-bl">{'\u2715'}</button>
                        </div>
                      ) : (
                        <button onClick={() => poseFileRefs.current[pose.id]?.click()}
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-[9px] shrink-0"
                          style={{ background:'var(--joi-bg-2)', border:'1px dashed rgba(255,255,255,.06)', color:'var(--joi-text-3)' }}
                          title="Upload pose reference image">
                          {'\uD83D\uDCF7'}
                        </button>
                      )}
                      <input ref={el => { poseFileRefs.current[pose.id] = el }} type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            updateManualPose(pose.id, { images: [file] })
                            // Clear skeleton flag when a new image is uploaded
                            setSkeletonPoseIds(prev => { const next = new Set(prev); next.delete(pose.id); return next })
                          }
                          e.target.value = ''
                        }} />
                      {/* Extract Skeleton button — only visible when an image is uploaded */}
                      {pose.images.length > 0 && !isSkeleton && (
                        <button
                          onClick={() => handleExtractSkeleton(pose.id, pose.images[0])}
                          disabled={isExtracting}
                          className="px-2 py-1 rounded-lg text-[9px] transition-all self-center"
                          style={{
                            background: isExtracting ? 'rgba(167,139,250,.04)' : 'rgba(167,139,250,.08)',
                            border:'1px solid rgba(167,139,250,.15)',
                            color:'var(--joi-violet)',
                            opacity: isExtracting ? 0.6 : 1,
                          }}
                          title="Extracts only the posture so it won't copy clothes or face from this photo">
                          {isExtracting ? '\u27F3' : '\uD83E\uDDB4'} {isExtracting ? 'Extracting...' : 'Extract Skeleton'}
                        </button>
                      )}
                      {/* Accessory */}
                      <input type="text" placeholder="Accessory..."
                        className="flex-1 min-w-0 px-2 py-1 rounded-lg text-[9px] border outline-none"
                        style={{ background:'var(--joi-bg-2)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)' }}
                        value={pose.accessory || ''}
                        onChange={e => updateManualPose(pose.id, { accessory: e.target.value })} />
                    </div>
                  </div>
                  )
                })}
                {manualPoses.length < 8 && (
                  <button onClick={addManualPose}
                    className="w-full py-2 rounded-lg text-[10px] font-medium transition-all"
                    style={{ background:'rgba(167,139,250,.06)', border:'1px dashed rgba(167,139,250,.15)', color:'var(--joi-violet)' }}>
                    + Add Pose ({manualPoses.length}/8)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Grid + Upscale + Realistic Toggles */}
          <div className="flex gap-2">
            <button onClick={() => setGridMode(!gridMode)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium transition-all"
              title="Generates 1 image as a 2x2 grid, then splits into 4 individual images"
              style={{
                background: gridMode ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                border: `1px solid ${gridMode ? 'rgba(255,107,157,.2)' : 'var(--joi-border)'}`,
                color: gridMode ? 'var(--joi-pink)' : 'var(--joi-text-2)',
              }}>
              <span>{gridMode ? '\u2611' : '\u2610'}</span> Grid (4-in-1)
            </button>
            <button onClick={() => setUpscaleMode(!upscaleMode)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium transition-all"
              title="Upscale all results with AuraSR after generation"
              style={{
                background: upscaleMode ? 'rgba(167,139,250,.08)' : 'var(--joi-bg-3)',
                border: `1px solid ${upscaleMode ? 'rgba(167,139,250,.2)' : 'var(--joi-border)'}`,
                color: upscaleMode ? 'var(--joi-violet)' : 'var(--joi-text-2)',
              }}>
              <span>{upscaleMode ? '\u2611' : '\u2610'}</span> Upscale
            </button>
            <button onClick={() => setRealisticMode(!realisticMode)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium transition-all"
              title="Apply iPhone-style realism prefix to prompts"
              style={{
                background: realisticMode ? 'rgba(80,216,160,.08)' : 'var(--joi-bg-3)',
                border: `1px solid ${realisticMode ? 'rgba(80,216,160,.2)' : 'var(--joi-border)'}`,
                color: realisticMode ? '#50d8a0' : 'var(--joi-text-2)',
              }}>
              <span>{realisticMode ? '\u2611' : '\u2610'}</span> Realistic
            </button>
          </div>

          {/* Grid mode helper text */}
          {gridMode && (
            <div className="text-[9px] px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,107,157,.04)', border: '1px solid rgba(255,107,157,.08)', color: 'var(--joi-text-3)' }}>
              Grid mode generates a single 2x2 image with 4 poses, then splits it into individual photos. Best with 4 poses.
            </div>
          )}

          {/* Scene Override (optional) */}
          <div>
            <div className="joi-label mb-1">
              Scene Override
            </div>
            <div className="text-[9px] mb-2" style={{ color:'var(--joi-text-3)' }}>
              Replaces the default background of your selected vibe
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

          {/* Vibes — Session Presets OR Soul Styles (only in presets mode) */}
          {poseMode === 'presets' && <div>
            <div className="flex items-center justify-between mb-2">
              <div className="joi-label">{selectedEngine === 'higgsfield:soul' ? 'Soul Style' : 'Pick your vibes'}</div>
              {selectedEngine !== 'higgsfield:soul' && (
                <div className="text-[9px] font-mono" style={{ color:'var(--joi-pink)' }}>
                  {selectedPresets.size} selected
                </div>
              )}
            </div>
            {selectedPresets.size > 1 && selectedEngine !== 'higgsfield:soul' && (
              <div className="text-[9px] mb-2 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,107,157,.04)', color: 'var(--joi-text-3)', border: '1px solid rgba(255,107,157,.08)' }}>
                Each vibe generates its own set of photos — shots are mixed across vibes
              </div>
            )}

            {selectedEngine === 'higgsfield:soul' ? (
              <>
                {/* Category filter tabs */}
                <div className="flex gap-1 mb-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
                  {[{ key: 'all' as const, label: 'All', icon: '✦' }, ...Object.entries(SOUL_STYLE_CATEGORIES).map(([k, v]) => ({ key: k as SoulStyleCategory, label: v.label, icon: v.icon }))].map(cat => (
                    <button key={cat.key} onClick={() => setSoulStyleCategory(cat.key)}
                      className="px-2 py-1 rounded-md text-[9px] font-medium whitespace-nowrap transition-all flex items-center gap-1"
                      style={{
                        background: soulStyleCategory === cat.key ? 'rgba(255,107,157,.12)' : 'var(--joi-bg-3)',
                        border: `1px solid ${soulStyleCategory === cat.key ? 'rgba(255,107,157,.3)' : 'transparent'}`,
                        color: soulStyleCategory === cat.key ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                      }}>
                      <span className="text-[10px]">{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>

                {/* Soul Styles grid — single select */}
                <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto pr-1" style={{ scrollbarWidth:'thin' }}>
                  {(showAllStyles ? SOUL_STYLES : SOUL_STYLES_CURATED)
                    .filter(s => soulStyleCategory === 'all' || s.category === soulStyleCategory)
                    .map(s => {
                      const active = selectedSoulStyle === s.id
                      return (
                        <button key={s.id} onClick={() => setSelectedSoulStyle(s.id)}
                          className="p-2 rounded-lg text-center transition-all relative"
                          style={{
                            background: active ? 'rgba(255,107,157,.1)' : 'var(--joi-bg-3)',
                            border: `1px solid ${active ? 'rgba(255,107,157,.3)' : 'var(--joi-border)'}`,
                            boxShadow: active ? '0 0 12px rgba(255,107,157,.08)' : 'none',
                          }}>
                          {s.featured && <span className="absolute top-0.5 right-0.5 text-[7px]" title="Featured">⭐</span>}
                          <span className="text-lg block">{s.icon}</span>
                          <div className="text-[9px] font-medium mt-0.5 line-clamp-1" style={{ color: active ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{s.name}</div>
                        </button>
                      )
                    })}
                </div>
                <button onClick={() => setShowAllStyles(!showAllStyles)}
                  className="w-full mt-1.5 py-1 rounded-md text-[9px] font-medium transition-all"
                  style={{ color: 'var(--joi-text-3)', background: 'rgba(255,255,255,.02)' }}>
                  {showAllStyles ? 'Show curated' : `Show all ${SOUL_STYLES.length} styles`}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                {[
                  { cat: 'Social', ids: ['selfies', 'grwm', 'stories', 'fotodump'] },
                  { cat: 'Fashion', ids: ['editorial', 'portrait', 'street'] },
                  { cat: 'Lifestyle', ids: ['creator', 'lifestyle', 'cozyhome'] },
                  { cat: 'Night / Outdoor', ids: ['nightout', 'datenight', 'pool', 'fitness'] },
                ].map(group => (
                  <div key={group.cat}>
                    <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5 px-1" style={{ color: 'var(--joi-text-3)' }}>{group.cat}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {PHOTO_SESSION_PRESETS.filter(p => group.ids.includes(p.id)).map(p => {
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
                ))}
              </div>
            )}
          </div>}

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

        {/* ── ADVANCED: Negative Prompt & Image Boost ── */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
          <button onClick={() => setAdvancedOpen(prev => !prev)}
            className="w-full px-4 py-2.5 flex items-center gap-2 group transition-colors"
            style={{ color: 'var(--joi-text-2)' }}>
            <span className="text-sm" style={{ opacity: 0.5 }}>{'\u2699'}</span>
            <span className="text-[10px] font-medium tracking-wide uppercase" style={{ letterSpacing: '0.08em' }}>Advanced</span>
            {(negativePrompt.trim() || imageBoostOn) && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--joi-pink)' }} />
            )}
            <span className="ml-auto text-[9px] transition-transform" style={{
              color: 'var(--joi-text-3)',
              transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>{'\u25BC'}</span>
          </button>
          <div className="overflow-hidden transition-all" style={{
            maxHeight: advancedOpen ? '350px' : '0',
            opacity: advancedOpen ? 1 : 0,
            transition: 'max-height .3s ease, opacity .2s ease',
          }}>
            <div className="px-4 pb-4 space-y-3">
              {/* Image Boost toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--joi-text-2)' }}>Image Boost</div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--joi-text-3)' }}>Appends quality keywords</div>
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
                  className="w-full px-3 py-2 rounded-xl text-[11px] border outline-none resize-none transition-colors"
                  style={{
                    background: 'var(--joi-bg-2)',
                    borderColor: negativePrompt ? 'rgba(255,107,157,.15)' : 'rgba(255,255,255,.04)',
                    color: 'var(--joi-text-1)',
                    backdropFilter: 'blur(8px)',
                  }}
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                />
              </div>
            </div>
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
                {poseMode === 'presets'
                  ? `${mixedShots.length} shots · ${selectedPresetLabels.join(' + ')}`
                  : `${effectivePoses.length} pose${effectivePoses.length !== 1 ? 's' : ''} (manual)${effectivePoses.some(p => p.images.length > 0) ? ' · ref imgs' : ''}`
                }
              </div>
              <span className="badge text-[9px] shrink-0" style={{ background:'rgba(255,107,157,.08)', color:'var(--joi-pink)', border:'1px solid rgba(255,107,157,.15)' }}>
                {(gridMode ? 4 : effectivePoses.length) * costPerShot} cr · {selectedTier}
              </span>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={!canGenerate}
            className={`joi-btn-solid w-full py-3 text-sm ${!generating && canGenerate ? 'joi-breathe' : ''}`}
            style={{ opacity: !canGenerate ? 0.5 : 1 }}>
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">{'\u27F3'}</span>
                <span>{progressStep || 'Generating...'}</span>
                <span className="font-mono text-[10px] opacity-80">{Math.round(progress)}%</span>
              </span>
            ) : (
              `\u2726 Shoot ${gridMode ? 4 : effectivePoses.length} Photos · ${selectedTier}`
            )}
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
                  {selectedEngine === 'higgsfield:soul' ? (
                    <span className="text-[48px]">{SOUL_STYLES.find(s => s.id === selectedSoulStyle)?.icon ?? '🌟'}</span>
                  ) : (
                    PHOTO_SESSION_PRESETS.filter(p => selectedPresets.has(p.id)).map(p => (
                      <span key={p.id} className="text-[48px]">{p.icon}</span>
                    ))
                  )}
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
              {selectedEngine === 'higgsfield:soul' ? (() => {
                const style = SOUL_STYLES.find(s => s.id === selectedSoulStyle)
                return style ? (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono backdrop-blur-sm"
                    style={{ background:'rgba(0,0,0,.4)', color:'var(--joi-pink)' }}>
                    {style.icon} {style.name}
                  </span>
                ) : null
              })() : (
                PHOTO_SESSION_PRESETS.filter(p => selectedPresets.has(p.id)).map(p => (
                  <span key={p.id} className="px-2 py-0.5 rounded-md text-[9px] font-mono backdrop-blur-sm"
                    style={{ background:'rgba(0,0,0,.4)', color:'var(--joi-pink)' }}>
                    {p.icon} {p.label}
                  </span>
                ))
              )}
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
          {generatedImages.length > 0 && onNav && (
            <div className="ml-auto shrink-0 w-48">
              <PipelineCTA label="View in Gallery" targetPage="gallery" onNav={onNav} icon="🖼️" />
            </div>
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

            {/* Only show edit-capable engines for Photo Session */}
            {[
              { key: 'grok', label: 'Grok Imagine', desc: 'xAI creative edit — best for sessions', icon: '\u26A1', cost: '1cr', time: '~4s' },
              { key: 'gemini', label: 'Gemini Edit', desc: 'Google AI image editing', icon: '\u2728', cost: '1cr', time: '~8s' },
              { key: 'seedream5-edit', label: 'Seedream 5 Edit', desc: 'ByteDance intelligent editing, low hallucination', icon: '\uD83E\uDDE0', cost: '8cr', time: '~12s' },
              { key: 'higgsfield:soul', label: 'Soul 2.0', desc: 'Fashion-grade editorial realism · Higgsfield', icon: '\uD83C\uDF1F', cost: '6cr', time: '~15s' },
            ].map(eng => (
              <button key={eng.key} onClick={() => { setSelectedEngine(eng.key); setShowEngineModal(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all"
                style={{
                  background: selectedEngine === eng.key ? 'rgba(255,107,157,.08)' : 'transparent',
                  border: `1px solid ${selectedEngine === eng.key ? 'rgba(255,107,157,.2)' : 'transparent'}`,
                }}>
                <span className="text-base">{eng.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: selectedEngine === eng.key ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{eng.label}</div>
                  <div className="text-[9px]" style={{ color:'var(--joi-text-3)' }}>{eng.desc}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] font-mono" style={{ color:'var(--joi-pink)' }}>{eng.cost}</div>
                  <div className="text-[8px] font-mono" style={{ color:'var(--joi-text-3)' }}>{eng.time}</div>
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
