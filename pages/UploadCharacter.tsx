import React, { useState, useRef, useEffect } from 'react'
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { generateInfluencerImage, enhancePrompt } from '../services/geminiService'
import { ImageSize, AspectRatio, ENGINE_METADATA } from '../types'
import type { InfluencerParams } from '../types'
import { useNavigationStore } from '../stores/navigationStore'
import { usePipelineStore } from '../stores/pipelineStore'
import { PipelineCTA } from '../components/PipelineCTA'
import {
  type ChipOption, HAIR_STYLES, HAIR_COLORS, SKIN_TONES, EYE_COLORS,
  FACE_SHAPES, BODY_TYPES, SKIN_TEXTURES, GENDERS, AGE_RANGES,
  PERSONALITY_TRAITS, FASHION_STYLES, ACCESSORIES, buildPromptFromChips,
} from '../data/characterChips'

// ─── Render styles ───────────────────────────────────────────────────
const renderStyles = [
  { id:'photorealistic', label:'Photorealistic', icon:'📷', desc:'Human-like, studio photography',
    prompt:'Ultra-photorealistic digital human, indistinguishable from photograph, shot on Phase One IQ4 150MP with Schneider 110mm f/2.8, natural skin with visible pores and subsurface blood flow, accurate eye moisture, individual hair strand rendering, physically-based material response,',
    scenario:'Professional photography studio with Profoto B10 key through 4ft octabox, V-flat fill, clean neutral background, shot on medium format digital, natural skin imperfections',
    bg:'linear-gradient(135deg, #f0b86020, #d4956b10)' },
  { id:'anime', label:'Anime / Manga', icon:'🎨', desc:'Japanese animation style',
    prompt:'Premium anime character, Production I.G / studio Bones quality, clean precise linework with variable stroke weight, cel-shaded with sophisticated shadow gradients, luminous multi-layered iris reflections, stylized proportions, dynamic hair strand groups,',
    scenario:'Anime background with atmospheric depth, soft painted sky, drawn in high-end anime style, NOT a photograph, NOT photorealistic, 2D illustration with volumetric lighting',
    bg:'linear-gradient(135deg, #e8749a15, #9a90c415)' },
  { id:'3d-render', label:'3D Render', icon:'🖥️', desc:'CGI, Pixar-like, game character',
    prompt:'AAA game-quality 3D character render, Unreal Engine 5 quality, high-poly sculpted mesh, PBR material workflow on all surfaces, subsurface scattering skin shader with detail maps, strand-based groomed hair, HDRI environment lighting with ray-traced AO,',
    scenario:'3D rendered environment with Lumen global illumination, cinematic depth of field with physically accurate bokeh, rendered in Octane/Unreal Engine 5',
    bg:'linear-gradient(135deg, #4858e015, #50d8a010)' },
  { id:'illustration', label:'Illustration', icon:'✍️', desc:'Digital art, concept art',
    prompt:'High-end digital character illustration, concept art portfolio quality, painterly technique blending precise linework with expressive color blocking, sophisticated light study with warm/cool shifts, character design clarity with strong silhouette,',
    scenario:'Fantasy concept art environment with atmospheric perspective, rich texture variation suggesting mixed media, art book presentation quality',
    bg:'linear-gradient(135deg, #f0b86015, #e8725c10)' },
  { id:'stylized', label:'Stylized', icon:'✨', desc:'Semi-realistic, Arcane / Spider-Verse',
    prompt:'Distinctive stylized character with exaggerated design language, Arcane/Spider-Verse quality, strong graphic silhouette with memorable proportions, bold shape language defining personality, limited palette with strategic accent pops,',
    scenario:'Stylized cinematic environment with dramatic moody lighting and color grading, cel-shaded with painterly details, NOT photorealistic, poster-quality composition',
    bg:'linear-gradient(135deg, #d048b015, #f0684815)' },
  { id:'pixel-art', label:'Pixel Art', icon:'🟨', desc:'Retro 8-bit / 16-bit',
    prompt:'Premium pixel art character sprite 64-128px base resolution, carefully placed individual pixels with intentional color choice, limited 32-color palette with strategic dithering, sub-pixel animation-ready, clear silhouette at small scale,',
    scenario:'Retro pixel art environment, 16-bit video game quality, Hyper Light Drifter visual sophistication, pixelated throughout, NOT smooth, NOT photorealistic',
    bg:'linear-gradient(135deg, #50d8a015, #4858e010)' },
]

// ─── Chip Selector component ────────────────────────────────────────
const ChipSelector = ({
  options, selected, onSelect, maxSelect = 1, color = 'var(--joi-pink)',
}: {
  options: ChipOption[]; selected: string[]; onSelect: (ids: string[]) => void;
  maxSelect?: number; color?: string;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map(chip => {
      const active = selected.includes(chip.id)
      return (
        <button key={chip.id} onClick={() => {
          if (maxSelect === 1) {
            onSelect([chip.id])
          } else {
            onSelect(active
              ? selected.filter(id => id !== chip.id)
              : selected.length < maxSelect ? [...selected, chip.id] : selected
            )
          }
        }}
          className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all flex items-center gap-1.5"
          style={{
            background: active ? `${color}12` : 'var(--joi-bg-3)',
            border: `1px solid ${active ? `${color}30` : 'rgba(255,255,255,.04)'}`,
            color: active ? color : 'var(--joi-text-2)',
            backdropFilter: 'blur(8px)',
          }}>
          <span className="text-sm">{chip.emoji}</span>
          {chip.label}
        </button>
      )
    })}
  </div>
)

// ─── Main component ─────────────────────────────────────────────────
export function UploadCharacter({ onNav }: { onNav?: (page: string) => void }) {
  // Mode
  const [mode, setMode] = useState<'create' | 'import'>('create')
  const [step, setStep] = useState(0)

  // Step 0 — Base
  const [selRenderStyle, setSelRenderStyle] = useState(0)
  const [name, setName] = useState('')
  const [selGender, setSelGender] = useState<string | null>(null)
  const [selAge, setSelAge] = useState<string | null>(null)

  // Step 1 — Look
  const [activeTab, setActiveTab] = useState<'builder' | 'prompt'>('builder')
  const [chipSelections, setChipSelections] = useState<Record<string, string[]>>({
    hairStyle: [], hairColor: [], skinTone: [], eyeColor: [],
    faceShape: [], bodyType: [], skinTexture: [],
  })
  const [promptText, setPromptText] = useState('')
  const [enhancing, setEnhancing] = useState(false)
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])

  // Step 2 — Style
  const [selFashion, setSelFashion] = useState<string[]>([])
  const [selPersonality, setSelPersonality] = useState<string[]>([])
  const [selAccessories, setSelAccessories] = useState<string[]>([])

  // Generation
  const [variants, setVariants] = useState<string[]>([])
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [consistencyPhotos, setConsistencyPhotos] = useState<string[]>([])
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'generating' | 'picking' | 'consistency' | 'done'>('idle')
  const [generating, setGenerating] = useState(false)
  const [characterSaved, setCharacterSaved] = useState(false)

  // Engine
  const [selectedEngine, setSelectedEngine] = useState<string>('auto')
  const [selectedResolution, setSelectedResolution] = useState('1k')
  const [showEngineModal, setShowEngineModal] = useState(false)

  // Import mode
  const [importName, setImportName] = useState('')
  const [importBio, setImportBio] = useState('')
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)

  // Stores
  const addCharacter = useCharacterStore(s => s.addCharacter)
  const { decrementCredits, restoreCredits } = useProfile()
  const toast = useToast()
  const { pendingImage, pendingTarget, consume: consumeNav } = useNavigationStore()

  // Consume pending navigation (e.g. from Gallery -> Upload)
  useEffect(() => {
    if (pendingTarget === 'upload' && pendingImage) {
      setMode('import')
      fetch(pendingImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'from-gallery.png', { type: blob.type || 'image/png' })
          setImportFiles(prev => [...prev, file])
        })
        .catch(() => {})
      consumeNav()
    }
  }, [pendingTarget, pendingImage])

  // ─── Helpers ──────────────────────────────────────────────────────
  const updateChip = (category: string, ids: string[]) => {
    setChipSelections(prev => ({ ...prev, [category]: ids }))
  }

  const steps = ['Base', 'Look', 'Style & Personality']
  const isPhotorealistic = renderStyles[selRenderStyle]?.id === 'photorealistic'

  // Build the full prompt for generation
  const buildFullPrompt = (): string => {
    const style = renderStyles[selRenderStyle]
    const parts: string[] = [style.prompt]

    // Gender + Age
    const genderChip = GENDERS.find(g => g.id === selGender)
    const ageChip = AGE_RANGES.find(a => a.id === selAge)
    if (genderChip) parts.push(genderChip.promptText)
    if (ageChip) parts.push(ageChip.promptText)

    // Appearance: Builder chips or Prompt text
    if (activeTab === 'prompt' && promptText.trim()) {
      parts.push(promptText.trim())
    } else {
      const chipPrompt = buildPromptFromChips(chipSelections)
      if (chipPrompt) parts.push(chipPrompt)
    }

    // Fashion
    if (selFashion.length > 0) {
      const fashionPrompt = buildPromptFromChips({ fashion: selFashion })
      if (fashionPrompt) parts.push(fashionPrompt)
    }
    // Personality
    if (selPersonality.length > 0) {
      const personalityPrompt = buildPromptFromChips({ personality: selPersonality })
      if (personalityPrompt) parts.push(personalityPrompt)
    }
    // Accessories
    if (selAccessories.length > 0) {
      const accPrompt = buildPromptFromChips({ accessories: selAccessories })
      if (accPrompt) parts.push(accPrompt)
    }

    return parts.filter(Boolean).join(', ')
  }

  // ─── Generate variants ───────────────────────────────────────────
  const handleGenerate = async () => {
    if (!name.trim()) { toast.error('Enter a name for the character'); return }

    const cost = 2
    setGenerating(true)
    setGenerationPhase('generating')
    setVariants([])
    setSelectedVariant(null)
    setConsistencyPhotos([])
    setCharacterSaved(false)

    const style = renderStyles[selRenderStyle]
    const fullPrompt = buildFullPrompt()

    const results: string[] = []
    let failCount = 0

    // Generate 3 variants
    for (let i = 0; i < 3; i++) {
      const ok = await decrementCredits(cost)
      if (!ok) {
        toast.error('Insufficient credits')
        if (results.length === 0) {
          setGenerating(false)
          setGenerationPhase('idle')
          return
        }
        break
      }

      try {
        const params: InfluencerParams = {
          characters: [{
            id: crypto.randomUUID(),
            characteristics: fullPrompt,
            outfitDescription: selFashion.map(id => FASHION_STYLES.find(f => f.id === id)?.promptText || '').filter(Boolean).join(', '),
            pose: 'Standing casual, facing camera, portrait shot',
            accessory: selAccessories.map(id => ACCESSORIES.find(a => a.id === id)?.label || '').filter(Boolean).join(', '),
          }],
          scenario: style.scenario,
          lighting: style.id === 'anime' ? 'Flat anime lighting, cel-shaded' : style.id === 'pixel-art' ? 'Flat pixel art lighting' : 'Soft studio lighting',
          imageSize: ImageSize.Size2K,
          aspectRatio: AspectRatio.Portrait,
          numberOfImages: 1,
        }

        const genResults = await generateInfluencerImage(params, () => {})
        if (genResults.length > 0) {
          results.push(genResults[0])
          setVariants([...results])
        } else {
          failCount++
          restoreCredits(cost)
        }
      } catch {
        failCount++
        restoreCredits(cost)
      }
    }

    if (results.length > 0) {
      setVariants(results)
      setGenerationPhase('picking')
    } else {
      toast.error('All generation attempts failed')
      setGenerationPhase('idle')
    }

    if (failCount > 0 && results.length > 0) {
      toast.info(`${failCount} variant(s) failed — credits restored`)
    }

    setGenerating(false)
  }

  // ─── Generate consistency variants ───────────────────────────────
  const handleConsistency = async () => {
    if (selectedVariant === null) return
    const cost = 2
    setGenerating(true)
    setGenerationPhase('consistency')

    const style = renderStyles[selRenderStyle]
    const basePrompt = buildFullPrompt()
    const consistencyResults: string[] = []

    for (let i = 0; i < 2; i++) {
      const ok = await decrementCredits(cost)
      if (!ok) {
        toast.error('Insufficient credits')
        break
      }
      try {
        const params: InfluencerParams = {
          characters: [{
            id: crypto.randomUUID(),
            characteristics: `${basePrompt}, Same character, different angle and expression`,
            outfitDescription: selFashion.map(id => FASHION_STYLES.find(f => f.id === id)?.promptText || '').filter(Boolean).join(', '),
            pose: i === 0 ? 'Slight three-quarter turn, natural expression' : 'Looking over shoulder, candid pose',
            accessory: selAccessories.map(id => ACCESSORIES.find(a => a.id === id)?.label || '').filter(Boolean).join(', '),
          }],
          scenario: style.scenario,
          lighting: style.id === 'anime' ? 'Flat anime lighting, cel-shaded' : style.id === 'pixel-art' ? 'Flat pixel art lighting' : 'Soft studio lighting',
          imageSize: ImageSize.Size2K,
          aspectRatio: AspectRatio.Portrait,
          numberOfImages: 1,
        }
        const genResults = await generateInfluencerImage(params, () => {})
        if (genResults.length > 0) {
          consistencyResults.push(genResults[0])
          setConsistencyPhotos([...consistencyResults])
        } else {
          restoreCredits(cost)
        }
      } catch {
        restoreCredits(cost)
      }
    }

    setGenerationPhase(consistencyResults.length > 0 ? 'done' : 'picking')
    setGenerating(false)
  }

  // ─── Save character ──────────────────────────────────────────────
  const handleSave = async () => {
    if (selectedVariant === null) return
    const allPhotoUrls = [variants[selectedVariant], ...consistencyPhotos]
    try {
      const blobs = await Promise.all(allPhotoUrls.map(async url => {
        const res = await fetch(url)
        return res.blob()
      }))

      const allBlobs: Blob[] = [...blobs, ...referenceFiles.map(f => f as Blob)]

      const characteristics = activeTab === 'prompt' && promptText.trim()
        ? promptText.trim()
        : buildPromptFromChips(chipSelections)

      const char: SavedCharacter = {
        id: crypto.randomUUID(),
        name: name.trim(),
        thumbnail: allPhotoUrls[0],
        modelImageBlobs: allBlobs.slice(0, 5),
        outfitBlob: null,
        outfitDescription: selFashion.map(id => FASHION_STYLES.find(f => f.id === id)?.promptText || '').filter(Boolean).join(', '),
        characteristics,
        accessory: selAccessories.map(id => ACCESSORIES.find(a => a.id === id)?.label || '').filter(Boolean).join(', '),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        renderStyle: renderStyles[selRenderStyle].id,
        personalityTraits: selPersonality,
      }

      addCharacter(char)
      usePipelineStore.getState().setCharacter(char.id)
      toast.success(`${name} created!`)
      setCharacterSaved(true)
    } catch {
      toast.error('Error saving character')
    }
  }

  // ─── Import ──────────────────────────────────────────────────────
  const handleImport = async () => {
    if (importFiles.length === 0) { toast.error('Upload at least one image'); return }
    if (!importName.trim()) { toast.error('Enter a name'); return }

    setGenerating(true)
    try {
      const reader = new FileReader()
      const thumbnailDataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(importFiles[0])
      })

      const blobs: Blob[] = importFiles.map(f => f as Blob)
      const character: SavedCharacter = {
        id: crypto.randomUUID(),
        name: importName.trim(),
        thumbnail: thumbnailDataUrl,
        modelImageBlobs: blobs,
        outfitBlob: null,
        outfitDescription: '',
        characteristics: importBio,
        accessory: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      }

      addCharacter(character)
      usePipelineStore.getState().setCharacter(character.id)
      toast.success(`${importName} imported!`)
      setCharacterSaved(true)
      setImportFiles([])
      setImportName('')
      setImportBio('')
    } catch {
      toast.error('Error importing character')
    } finally {
      setGenerating(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 20)
    if (files.length > 0) setImportFiles(prev => [...prev, ...files].slice(0, 20))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 20)
    if (files.length > 0) setImportFiles(prev => [...prev, ...files].slice(0, 20))
    e.target.value = ''
  }

  const handleRefDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 5)
    if (files.length > 0) setReferenceFiles(prev => [...prev, ...files].slice(0, 5))
  }

  const handleRefSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/')).slice(0, 5)
    if (files.length > 0) setReferenceFiles(prev => [...prev, ...files].slice(0, 5))
    e.target.value = ''
  }

  // ─── Sync Builder -> Prompt (one-directional) ────────────────────
  const handleTabSwitch = (tab: 'builder' | 'prompt') => {
    if (tab === 'prompt' && !promptText.trim()) {
      const allSelections = {
        ...chipSelections,
        gender: selGender ? [selGender] : [],
        age: selAge ? [selAge] : [],
      }
      const generated = buildPromptFromChips(allSelections)
      if (generated) setPromptText(generated)
    }
    setActiveTab(tab)
  }

  // Can advance to next step?
  const canAdvance = (s: number) => {
    if (s === 0) return name.trim().length > 0
    return true
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen joi-mesh">
      <div className="px-8 pt-8 pb-2">
        <h1 className="joi-heading joi-glow text-2xl font-bold">
          <span style={{ color: 'var(--joi-pink)' }}>Create</span>{' '}
          <span style={{ color: 'var(--joi-text-1)' }}>Character</span>
        </h1>
        <p className="joi-label mt-1" style={{ color: 'var(--joi-cyan-warm)' }}>Build from scratch or import reference images</p>
      </div>

      {/* Mode Toggle */}
      <div className="px-8 py-4">
        <div className="inline-flex rounded-xl p-1" style={{ background: 'var(--joi-bg-2)', backdropFilter: 'blur(8px)' }}>
          {(['create', 'import'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setCharacterSaved(false) }}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: mode === m ? 'var(--joi-bg-3)' : 'transparent',
                color: mode === m ? 'var(--joi-text-1)' : 'var(--joi-text-3)',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
              }}>
              {m === 'create' ? '\u2295 Create from Scratch' : '\u2191 Import Images'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'import' ? (
        /* ═══════════════════════════════════════════════════════════
           IMPORT MODE — simplified: upload + name + description + save
           ═══════════════════════════════════════════════════════════ */
        <div className="px-8 pb-8 flex gap-6">
          <div className="flex-1">
            <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
            {/* Drop Zone */}
            <div className="p-8 text-center cursor-pointer transition-all mb-5 rounded-xl joi-glass"
              style={{ border: '1px dashed var(--joi-border)', borderColor: dragOver ? 'var(--joi-pink)' : undefined }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}>
              <div className="text-4xl mb-3" style={{ color: 'var(--joi-pink)' }}>{'\u2191'}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--joi-text-1)' }}>Drag images of your character</div>
              <div className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>PNG, JPG, WEBP · Up to 20 images · Max 10MB each</div>
              <div className="text-[11px] mt-2 px-3 py-1.5 rounded-xl inline-block"
                style={{ background: 'rgba(255,107,157,.1)', color: 'var(--joi-pink)' }}>
                or click to select files
              </div>
            </div>

            {/* Uploaded preview grid */}
            {importFiles.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--joi-text-3)' }}>
                  Uploaded ({importFiles.length}/20)
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {importFiles.map((f, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative group"
                      style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border-h)' }}>
                      <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt={f.name} />
                      <button onClick={(e) => { e.stopPropagation(); setImportFiles(prev => prev.filter((_, j) => j !== i)) }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,.6)', color: '#fff' }}>{'\u2715'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Name + Description */}
            <div className="p-5 space-y-4 rounded-xl joi-glass">
              <div>
                <label className="joi-label block mb-1.5">Name</label>
                <input value={importName} onChange={e => setImportName(e.target.value)} placeholder="Character name"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors"
                  style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)' }} />
              </div>
              <div>
                <label className="joi-label block mb-1.5">Description (optional)</label>
                <textarea value={importBio} onChange={e => setImportBio(e.target.value)} rows={3}
                  placeholder="Describe the character for better AI consistency..."
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors resize-none"
                  style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)' }} />
              </div>
              <button onClick={handleImport} disabled={generating}
                className={`joi-btn-solid w-full py-3 text-sm${!generating ? ' joi-breathe' : ''}`}>
                {generating ? '\u21BB Importing...' : '\u2726 Import Character'}
              </button>
              {characterSaved && onNav && (
                <PipelineCTA label="Create Hero Shot in Director" targetPage="director" onNav={onNav} icon="\u{1F3AC}" />
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="w-[300px] shrink-0">
            <div className="p-5 sticky top-8 rounded-xl joi-glass">
              <div className="joi-label text-center mb-3">Preview</div>
              <div className="aspect-[3/4] rounded-xl overflow-hidden" style={{ background: 'var(--joi-bg-3)', border: '1px solid rgba(255,255,255,.04)' }}>
                {importFiles.length > 0 ? (
                  <img src={URL.createObjectURL(importFiles[0])} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2" style={{ color: 'var(--joi-text-3)' }}>{'\u25C8'}</div>
                      <div className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>Upload images to<br />generate preview</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════
           CREATE MODE — 3 step wizard
           ═══════════════════════════════════════════════════════════ */
        <div className="px-8 pb-8 flex gap-6">
          <div className="flex-1 max-w-2xl">
            {/* Steps Navigation */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {steps.map((s, i) => (
                <button key={s} onClick={() => setStep(i)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all shrink-0"
                  style={{
                    background: step === i ? 'rgba(255,107,157,.08)' : 'transparent',
                    color: step === i ? 'var(--joi-pink)' : step > i ? 'var(--joi-magenta)' : 'var(--joi-text-3)',
                    border: step === i ? '1px solid rgba(255,107,157,.2)' : '1px solid transparent',
                  }}>
                  <span className="rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: step >= i ? (step === i ? 'var(--joi-pink)' : 'var(--joi-magenta)') : 'var(--joi-bg-3)',
                      color: step >= i ? '#fff' : 'var(--joi-text-3)',
                      width: 18, height: 18,
                    }}>
                    {step > i ? '\u2713' : i + 1}
                  </span>
                  {s}
                </button>
              ))}

              {/* Engine wrench button */}
              <div className="relative shrink-0 ml-auto">
                <button onClick={() => setShowEngineModal(v => !v)}
                  className="joi-btn-ghost w-8 h-8 rounded-xl flex items-center justify-center text-sm relative"
                  title="Generation Engine">
                  🔧
                  {selectedEngine !== 'auto' && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--joi-pink)' }} />
                  )}
                </button>
              </div>
            </div>

            {/* ─── Step 0: Base ───────────────────────────────────── */}
            {step === 0 && (
              <div className="p-6 space-y-5 rounded-xl joi-glass">
                <div>
                  <label className="joi-label block mb-3">Render Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {renderStyles.map((rs, i) => (
                      <button key={rs.id} onClick={() => setSelRenderStyle(i)}
                        className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] joi-border-glow"
                        style={{
                          background: selRenderStyle === i ? rs.bg : 'var(--joi-bg-3)',
                          border: `1.5px solid ${selRenderStyle === i ? 'rgba(255,107,157,.3)' : 'rgba(255,255,255,.04)'}`,
                          boxShadow: selRenderStyle === i ? '0 0 20px rgba(255,107,157,.08)' : 'none',
                          backdropFilter: 'blur(8px)',
                        }}>
                        <span className="text-xl block mb-1.5">{rs.icon}</span>
                        <div className="text-[12px] font-semibold" style={{ color: selRenderStyle === i ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{rs.label}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: 'var(--joi-text-3)' }}>{rs.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="joi-label block mb-1.5">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="E.g.: Luna Vex"
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none focus:border-[rgba(255,107,157,.4)] transition-colors"
                    style={{ background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-1)', backdropFilter: 'blur(8px)' }} />
                </div>

                <div>
                  <label className="joi-label block mb-2">Gender</label>
                  <ChipSelector options={GENDERS} selected={selGender ? [selGender] : []}
                    onSelect={ids => setSelGender(ids[0] || null)} />
                </div>

                <div>
                  <label className="joi-label block mb-2">Age</label>
                  <ChipSelector options={AGE_RANGES} selected={selAge ? [selAge] : []}
                    onSelect={ids => setSelAge(ids[0] || null)} color="var(--joi-magenta)" />
                </div>
              </div>
            )}

            {/* ─── Step 1: Look ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Builder / Prompt tabs */}
                <div className="inline-flex rounded-xl p-1" style={{ background: 'var(--joi-bg-2)', backdropFilter: 'blur(8px)' }}>
                  {(['builder', 'prompt'] as const).map(tab => (
                    <button key={tab} onClick={() => handleTabSwitch(tab)}
                      className="px-4 py-1.5 rounded-xl text-[12px] font-medium transition-all capitalize"
                      style={{
                        background: activeTab === tab ? 'var(--joi-bg-3)' : 'transparent',
                        color: activeTab === tab ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                        boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
                      }}>
                      {tab === 'builder' ? '\u{1F9E9} Builder' : '\u270D\uFE0F Prompt'}
                    </button>
                  ))}
                </div>

                <div className="p-6 space-y-5 rounded-xl joi-glass">
                  {activeTab === 'builder' ? (
                    /* ─── Builder Tab ─── */
                    <>
                      <div>
                        <label className="joi-label block mb-2">Hair Style</label>
                        <ChipSelector options={HAIR_STYLES} selected={chipSelections.hairStyle}
                          onSelect={ids => updateChip('hairStyle', ids)} />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Hair Color</label>
                        <ChipSelector options={HAIR_COLORS} selected={chipSelections.hairColor}
                          onSelect={ids => updateChip('hairColor', ids)} color="var(--joi-magenta)" />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Skin Tone</label>
                        <ChipSelector options={SKIN_TONES} selected={chipSelections.skinTone}
                          onSelect={ids => updateChip('skinTone', ids)} color="var(--joi-blue)" />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Eye Color</label>
                        <ChipSelector options={EYE_COLORS} selected={chipSelections.eyeColor}
                          onSelect={ids => updateChip('eyeColor', ids)} color="var(--joi-magenta)" />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Face Shape</label>
                        <ChipSelector options={FACE_SHAPES} selected={chipSelections.faceShape}
                          onSelect={ids => updateChip('faceShape', ids)} />
                      </div>
                      <div>
                        <label className="joi-label block mb-2">Body Type</label>
                        <ChipSelector options={BODY_TYPES} selected={chipSelections.bodyType}
                          onSelect={ids => updateChip('bodyType', ids)} color="var(--joi-blue)" />
                      </div>
                      {!isPhotorealistic && (
                        <div>
                          <label className="joi-label block mb-2">Skin Texture</label>
                          <ChipSelector options={SKIN_TEXTURES} selected={chipSelections.skinTexture}
                            onSelect={ids => updateChip('skinTexture', ids)} color="var(--joi-magenta)" />
                        </div>
                      )}
                    </>
                  ) : (
                    /* ─── Prompt Tab ─── */
                    <div>
                      <label className="joi-label block mb-2">Describe your character</label>
                      <textarea
                        value={promptText}
                        onChange={e => setPromptText(e.target.value)}
                        rows={8}
                        placeholder="Describe your character... Ex: Athletic woman, short red hair, heterochromatic eyes (green + blue), freckles, confident look"
                        className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-colors resize-none"
                        style={{
                          background: 'var(--joi-bg-2)', borderColor: 'rgba(255,255,255,.04)',
                          color: 'var(--joi-text-1)', backdropFilter: 'blur(8px)',
                        }} />
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
                          Tip: Be specific about physical features, expression, and style for best results.
                        </div>
                        <button
                          disabled={enhancing || !promptText.trim()}
                          onClick={async () => {
                            if (!promptText.trim()) return
                            const ok = await decrementCredits(2)
                            if (!ok) { toast.error('Insufficient credits (2cr)'); return }
                            setEnhancing(true)
                            try {
                              const enhanced = await enhancePrompt(promptText, renderStyles[selRenderStyle].id)
                              if (enhanced && enhanced !== promptText) {
                                setPromptText(enhanced)
                                toast.success('Prompt enhanced!')
                              } else {
                                restoreCredits(2)
                                toast.info('No enhancement needed')
                              }
                            } catch {
                              restoreCredits(2)
                              toast.error('Enhancement failed')
                            } finally {
                              setEnhancing(false)
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all shrink-0 ml-3"
                          style={{
                            background: enhancing ? 'var(--joi-bg-3)' : 'rgba(255,107,157,.08)',
                            border: '1px solid rgba(255,107,157,.15)',
                            color: 'var(--joi-pink)',
                            opacity: (!promptText.trim() || enhancing) ? 0.4 : 1,
                          }}>
                          {enhancing ? '...' : '✨ Enhance (2cr)'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reference photos — always visible */}
                <div className="p-5 rounded-xl joi-glass">
                  <div className="flex items-center justify-between mb-3">
                    <label className="joi-label">Reference Photos (optional)</label>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{referenceFiles.length}/5</span>
                  </div>
                  <div className="text-[10px] mb-3" style={{ color: 'var(--joi-text-3)' }}>Upload photos for better consistency</div>
                  <input ref={refInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleRefSelect} />
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.03] relative group"
                        onClick={() => { if (i >= referenceFiles.length) refInputRef.current?.click() }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={i >= referenceFiles.length ? handleRefDrop : undefined}
                        style={{
                          background: i < referenceFiles.length ? 'var(--joi-bg-3)' : 'var(--joi-bg-2)',
                          border: `1px solid ${i < referenceFiles.length ? 'var(--joi-border-h)' : 'rgba(255,255,255,.04)'}`,
                        }}>
                        {i < referenceFiles.length ? (
                          <>
                            <img src={URL.createObjectURL(referenceFiles[i])} className="w-full h-full object-cover" alt="" />
                            <button onClick={(e) => { e.stopPropagation(); setReferenceFiles(prev => prev.filter((_, j) => j !== i)) }}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: 'rgba(0,0,0,.6)', color: '#fff' }}>{'\u2715'}</button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-lg" style={{ color: 'var(--joi-text-3)' }}>+</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Style & Personality ───────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-6 space-y-5 rounded-xl joi-glass">
                  <div>
                    <label className="joi-label block mb-1">Fashion Style <span style={{ color: 'var(--joi-text-3)', fontWeight: 400 }}>(max 2)</span></label>
                    <div className="mt-2">
                      <ChipSelector options={FASHION_STYLES} selected={selFashion}
                        onSelect={setSelFashion} maxSelect={2} color="var(--joi-magenta)" />
                    </div>
                  </div>

                  <div>
                    <label className="joi-label block mb-1">Personality <span style={{ color: 'var(--joi-text-3)', fontWeight: 400 }}>(max 3)</span></label>
                    <div className="mt-2">
                      <ChipSelector options={PERSONALITY_TRAITS} selected={selPersonality}
                        onSelect={setSelPersonality} maxSelect={3} />
                    </div>
                  </div>

                  <div>
                    <label className="joi-label block mb-2">Accessories</label>
                    <ChipSelector options={ACCESSORIES} selected={selAccessories}
                      onSelect={setSelAccessories} maxSelect={6} color="var(--joi-blue)" />
                  </div>
                </div>

                {/* ─── Generation Zone ────────────────────────────── */}
                {generationPhase !== 'idle' && (
                  <div className="p-5 rounded-xl joi-glass space-y-4">
                    <div className="joi-label">Generated Variants</div>

                    {/* Variants grid */}
                    {variants.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {variants.map((url, i) => (
                          <button key={i} onClick={() => { setSelectedVariant(i); setGenerationPhase('picking') }}
                            className="aspect-[3/4] rounded-xl overflow-hidden transition-all hover:scale-[1.02] relative"
                            style={{
                              border: selectedVariant === i ? '2px solid var(--joi-pink)' : '1px solid rgba(255,255,255,.04)',
                              boxShadow: selectedVariant === i ? '0 0 20px rgba(255,107,157,.15)' : 'none',
                            }}>
                            <img src={url} className="w-full h-full object-cover" alt={`Variant ${i + 1}`} />
                            {selectedVariant === i && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ background: 'var(--joi-pink)', color: '#fff' }}>{'\u2713'}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Consistency photos */}
                    {consistencyPhotos.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--joi-text-3)' }}>
                          Consistency Variants
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {consistencyPhotos.map((url, i) => (
                            <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden"
                              style={{ border: '1px solid rgba(255,255,255,.04)' }}>
                              <img src={url} className="w-full h-full object-cover" alt={`Consistency ${i + 1}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {generationPhase === 'picking' && selectedVariant !== null && !characterSaved && (
                      <div className="space-y-2">
                        {consistencyPhotos.length === 0 && (
                          <button onClick={handleConsistency} disabled={generating}
                            className="joi-btn-ghost w-full py-2.5 text-[12px]"
                            style={{ color: 'var(--joi-magenta)' }}>
                            {generating ? '\u21BB Generating...' : '\u{1F504} Generate consistency variants? (2 credits each)'}
                          </button>
                        )}
                        <button onClick={handleSave}
                          className="joi-btn-solid w-full py-3 text-sm joi-breathe">
                          {'\u2726'} Save Character
                        </button>
                      </div>
                    )}

                    {(generationPhase === 'done' || generationPhase === 'consistency') && selectedVariant !== null && !characterSaved && !generating && (
                      <button onClick={handleSave}
                        className="joi-btn-solid w-full py-3 text-sm joi-breathe">
                        {'\u2726'} Save Character
                      </button>
                    )}

                    {characterSaved && onNav && (
                      <div className="space-y-2">
                        <div className="text-center text-[12px] font-medium" style={{ color: 'var(--joi-mint, var(--joi-pink))' }}>
                          {'\u2713'} Character saved!
                        </div>
                        <PipelineCTA label="Create Hero Shot in Director" targetPage="director" onNav={onNav} icon="\u{1F3AC}" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Navigation Buttons ────────────────────────────── */}
            <div className="flex justify-between mt-5">
              <button onClick={() => setStep(Math.max(0, step - 1))}
                className="joi-btn-ghost px-5 py-2.5 text-sm"
                style={{ opacity: step === 0 ? .3 : 1 }} disabled={step === 0}>
                {'\u2190'} Back
              </button>
              {step < 2 ? (
                <button onClick={() => setStep(step + 1)}
                  className="joi-btn-solid px-6 py-2.5 text-sm"
                  disabled={!canAdvance(step)}>
                  Next {'\u2192'}
                </button>
              ) : (
                generationPhase === 'idle' && (
                  <button onClick={handleGenerate}
                    className={`joi-btn-solid px-6 py-2.5 text-sm${!generating ? ' joi-breathe' : ''}`}
                    disabled={generating}>
                    {generating ? '\u21BB Generating...' : '\u2726 Generate Character (3 variants)'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* ─── Right: Preview Panel ──────────────────────────── */}
          <div className="w-[320px] shrink-0">
            <div className="p-5 sticky top-8 rounded-xl joi-glass">
              <div className="flex items-center justify-between mb-3">
                <div className="joi-label">Preview</div>
                <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(255,107,157,.15), rgba(208,72,176,.15))', color: 'var(--joi-pink)' }}>
                  {renderStyles[selRenderStyle]?.label.toUpperCase()}
                </span>
              </div>

              <div className="aspect-[3/4] rounded-xl overflow-hidden relative"
                style={{
                  background: selectedVariant !== null ? 'var(--joi-bg-2)' : renderStyles[selRenderStyle]?.bg || 'var(--joi-bg-2)',
                  border: '1px solid rgba(255,255,255,.04)',
                }}>
                {selectedVariant !== null && variants[selectedVariant] ? (
                  /* Show selected variant */
                  <img src={variants[selectedVariant]} className="w-full h-full object-cover" alt={name} />
                ) : variants.length > 0 ? (
                  /* Show first variant as preview */
                  <img src={variants[0]} className="w-full h-full object-cover" alt={name} style={{ opacity: 0.6 }} />
                ) : (
                  /* Silhouette placeholder */
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="relative">
                      {/* Head */}
                      <div className="w-16 h-20 mx-auto rounded-[45%] transition-all"
                        style={{ background: 'rgba(255,107,157,.08)', border: '1px solid rgba(255,107,157,.12)' }} />
                    </div>
                    {/* Body silhouette */}
                    <div className="mt-1 flex flex-col items-center">
                      <div style={{ width: '10px', height: '6px', background: 'rgba(255,107,157,.06)', borderRadius: '0 0 4px 4px' }} />
                      <div className="rounded-t-2xl" style={{ width: '60px', height: '8px', background: 'rgba(255,107,157,.06)' }} />
                      <div style={{ width: '52px', height: '44px', background: 'rgba(255,107,157,.04)', borderRadius: '30%' }} />
                      <div className="flex gap-1 -mt-0.5">
                        <div style={{ width: '12px', height: '20px', background: 'rgba(255,107,157,.03)', borderRadius: '0 0 6px 6px' }} />
                        <div style={{ width: '12px', height: '20px', background: 'rgba(255,107,157,.03)', borderRadius: '0 0 6px 6px' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.7))' }}>
                  <div className="text-sm font-bold text-white">{name || 'Unnamed'}</div>
                  <div className="text-[9px] font-mono" style={{ color: 'var(--joi-pink)' }}>
                    {[
                      GENDERS.find(g => g.id === selGender)?.label,
                      AGE_RANGES.find(a => a.id === selAge)?.label,
                    ].filter(Boolean).join(' · ') || 'Configure in Step 1'}
                  </div>
                </div>
              </div>

              {/* Chip summary below preview */}
              <div className="mt-3 flex flex-wrap gap-1 justify-center">
                {selPersonality.map(id => {
                  const chip = PERSONALITY_TRAITS.find(c => c.id === id)
                  return chip ? <span key={id} className="badge" style={{ background: 'rgba(255,107,157,.1)', color: 'var(--joi-pink)' }}>{chip.label}</span> : null
                })}
                {selFashion.map(id => {
                  const chip = FASHION_STYLES.find(c => c.id === id)
                  return chip ? <span key={id} className="badge" style={{ background: 'rgba(208,72,176,.1)', color: 'var(--joi-magenta)' }}>{chip.label}</span> : null
                })}
              </div>

              {/* Generation loading indicator */}
              {generating && (
                <div className="mt-3 text-center">
                  <div className="text-[11px] font-medium" style={{ color: 'var(--joi-pink)' }}>
                    {'\u21BB'} Generating{generationPhase === 'consistency' ? ' consistency variants' : ' variants'}...
                  </div>
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--joi-bg-3)' }}>
                    <div className="h-full rounded-full shimmer" style={{ width: '60%', background: 'linear-gradient(90deg, var(--joi-pink), var(--joi-magenta))' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Engine Modal ──────────────────────────────────────────── */}
      {showEngineModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowEngineModal(false)} />
          <div className="fixed z-50 w-[340px] max-h-[90vh] rounded-xl"
            style={{
              display: 'flex', flexDirection: 'column',
              top: '50%', left: 'calc(50% + 110px)', transform: 'translate(-50%, -50%)',
              background: 'var(--joi-bg-glass)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,.04)',
              boxShadow: '0 20px 60px rgba(0,0,0,.6)',
              overflow: 'hidden',
            }}>
            <div className="overflow-y-auto p-4 pb-2 space-y-1 flex-1 min-h-0 joi-scroll">
              <div className="joi-label mb-2 px-1">Generation Engine</div>

              <button onClick={() => { setSelectedEngine('auto'); setShowEngineModal(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
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

              <div className="h-px my-1 joi-divider" />

              {ENGINE_METADATA.map(engine => (
                <button key={engine.key}
                  onClick={() => { setSelectedEngine(engine.key); setShowEngineModal(false) }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all"
                  style={{
                    background: selectedEngine === engine.key ? 'rgba(255,107,157,.08)' : 'transparent',
                    border: `1px solid ${selectedEngine === engine.key ? 'rgba(255,107,157,.2)' : 'transparent'}`,
                  }}>
                  <span className="text-sm" style={{ color: 'var(--joi-text-3)' }}>{'\u2699'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium" style={{ color: selectedEngine === engine.key ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{engine.userFriendlyName}</div>
                    <div className="text-[8px]" style={{ color: 'var(--joi-text-3)' }}>{engine.description}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] font-mono" style={{ color: 'var(--joi-pink)' }}>{engine.creditCost}cr</div>
                    <div className="text-[8px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{engine.estimatedTime}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
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
                      background: selectedResolution === r.id ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                      border: `1px solid ${selectedResolution === r.id ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.04)'}`,
                      backdropFilter: 'blur(8px)',
                    }}>
                    <div className="text-[11px] font-mono font-bold" style={{ color: selectedResolution === r.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>{r.label}</div>
                    <div className="text-[8px] font-mono" style={{ color: 'var(--joi-text-3)' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default UploadCharacter
