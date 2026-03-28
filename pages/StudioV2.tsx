import React, { useState, useRef, useEffect } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { usePipelineStore } from '../stores/pipelineStore'
import { generateInfluencerImage, enhancePrompt, generatePhotoSession } from '../services/geminiService'
import { generatePhotoSessionWithGrok } from '../services/falService'
import { generateWithSoul } from '../services/higgsfieldService'
import { generateWithReplicate } from '../services/replicateService'
import { generateWithOpenAI } from '../services/openaiService'
import { generateWithFal } from '../services/falService'
import { compilePrompt } from '../services/promptCompiler'
import { fal } from '@fal-ai/client'
import { runControlNet } from '../services/controlNetService'
// gridSplitter no longer used — session generates individual photos
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import { ImageSize, AspectRatio, ENGINE_METADATA, CREDIT_COSTS, AIProvider } from '../types'
import type { InfluencerParams } from '../types'
import { POSE_OPTIONS, CAMERA_OPTIONS, LIGHTING_OPTIONS } from '../data/directorOptions'
import type { ChipOption } from '../data/directorOptions'
import { ENHANCERS, buildEnhancerPrompt } from '../data/enhancers'
import { PHOTO_SESSION_PRESETS, mixShots, FACE_LOCK_PROMPT, OUTFIT_PRESERVE_PROMPT, FACE_CHECK_PROMPT } from '../data/sessionPresets'

// ─── Constants ────────────────────────────────────────────
const IMAGE_BOOST_KEYWORDS = 'masterpiece, best quality, highly detailed, sharp focus, 8k uhd'

const QUICK_STYLE_PRESETS = [
  { id: 'selfie', emoji: '🤳', label: 'Selfie', desc: 'Close-up natural', scenario: 'selfie style photo, natural casual lighting, close-up portrait, authentic candid feel', camera: 'portrait', lighting: 'natural', pose: 'standing' },
  { id: 'ugc', emoji: '📦', label: 'UGC', desc: 'Auténtico casual', scenario: 'UGC content creator style, casual home setting, natural daylight, authentic unfiltered look, no heavy makeup, relatable lifestyle', camera: 'portrait', lighting: 'natural', pose: 'leaning' },
  { id: 'lifestyle', emoji: '🌿', label: 'Lifestyle', desc: 'Exterior golden hour', scenario: 'casual lifestyle outdoor photo, relaxed daytime mood, candid street or park energy', camera: 'wide', lighting: 'golden', pose: 'walking' },
  { id: 'editorial', emoji: '✨', label: 'Editorial', desc: 'Studio profesional', scenario: 'editorial fashion shoot, clean studio background, professional quality, high fashion energy', camera: 'portrait', lighting: 'studio', pose: 'standing' },
  { id: 'night-out', emoji: '🌆', label: 'Night Out', desc: 'Ciudad de noche', scenario: 'night out in the city, vibrant nightlife atmosphere, city lights bokeh background, going out vibe', camera: 'portrait', lighting: 'neon', pose: 'leaning' },
]

const QUICK_STYLE_TO_VIBES: Record<string, string[]> = {
  'selfie': ['selfies', 'lifestyle'],
  'ugc': ['selfies', 'creator', 'lifestyle'],
  'lifestyle': ['lifestyle', 'street', 'portrait'],
  'editorial': ['editorial', 'portrait', 'fotodump'],
  'night-out': ['nightout', 'street', 'selfies'],
}
const DEFAULT_VIBES = ['selfies', 'lifestyle']

const GRID_DIMS: Record<number, { rows: number; cols: number }> = {
  4: { rows: 2, cols: 2 }, 6: { rows: 2, cols: 3 }, 9: { rows: 3, cols: 3 }, 12: { rows: 3, cols: 4 },
}

const CANVAS_SIZES: Record<string, { w: number; h: number }> = {
  [AspectRatio.Portrait]: { w: 390, h: 520 }, [AspectRatio.Square]: { w: 520, h: 520 },
  [AspectRatio.Landscape]: { w: 520, h: 390 }, [AspectRatio.Wide]: { w: 520, h: 293 }, [AspectRatio.Tall]: { w: 295, h: 520 },
}

const RENDER_STYLE_BOOSTS: Record<string, string> = {
  'anime': 'Premium anime-style illustration, cel-shaded, NOT photorealistic',
  '3d-render': 'AAA game-quality 3D CGI render, Unreal Engine 5, NOT a photograph',
  'illustration': 'High-end digital character illustration, NOT photorealistic',
  'stylized': 'Stylized character render, Arcane/Spider-Verse aesthetic, NOT photorealistic',
  'pixel-art': 'Premium pixel art, 16-bit video game aesthetic, NOT photorealistic',
}

const DIRECTOR_REF_MAX: Record<string, number> = {
  'fal:seedream50': 5, 'replicate:grok': 3, 'fal:pulid': 5, 'gemini:nb2': 10, 'fal:kontext-multi': 1, 'fal:flux-pro': 1,
}

// ─── Helpers ──────────────────────────────────────────────
async function fetchUrlsAsFiles(urls: string[]): Promise<File[]> {
  const files: File[] = []
  await Promise.allSettled(urls.map(async (url, i) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      files.push(new File([blob], `char-ref-${i}.${blob.type.includes('png') ? 'png' : 'jpg'}`, { type: blob.type }))
    } catch { /* skip failed fetches */ }
  }))
  return files
}

function detectCharStyle(chars: string, renderStyle?: string): { isRealistic: boolean; styleBoost?: string } {
  if (renderStyle && renderStyle !== 'photorealistic') {
    return { isRealistic: false, styleBoost: RENDER_STYLE_BOOSTS[renderStyle] || 'Stylized non-photorealistic character illustration' }
  }
  if (!chars) return { isRealistic: true }
  const c = chars.toLowerCase()
  if (c.includes('anime') || c.includes('cel-shaded')) return { isRealistic: false, styleBoost: RENDER_STYLE_BOOSTS['anime'] }
  if (c.includes('3d character') || c.includes('unreal engine')) return { isRealistic: false, styleBoost: RENDER_STYLE_BOOSTS['3d-render'] }
  return { isRealistic: true }
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#F9FAFB', border: '1px solid var(--border)', borderRadius: 12,
  padding: '10px 14px', fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif",
  color: 'var(--text-1)', resize: 'none', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase',
  letterSpacing: '0.05em', display: 'block', marginBottom: 8,
}

// ─── Sub-components ───────────────────────────────────────

const FlashOverlay: React.FC<{ active: boolean }> = ({ active }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 9999, opacity: 0, pointerEvents: 'none', animation: active ? 'studioFlash 0.6s ease-out' : 'none' }} />
)

const AccordionSection: React.FC<{
  title: string; icon: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode
}> = ({ title, icon, isOpen, onToggle, children }) => (
  <div style={{ borderBottom: '1px solid var(--border)' }}>
    <button onClick={onToggle} className="w-full px-5 py-3.5 flex items-center gap-2.5" style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
      <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>{icon}</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-3)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
    </button>
    <div style={{ maxHeight: isOpen ? 800 : 0, opacity: isOpen ? 1 : 0, overflow: 'hidden', transition: 'max-height .3s ease, opacity .2s ease', pointerEvents: isOpen ? 'auto' : 'none' }}>
      <div style={{ padding: '0 20px 20px' }}>{children}</div>
    </div>
  </div>
)

const Chip: React.FC<{ label: string; icon?: string; active: boolean; onClick: () => void }> = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '8px 14px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap',
    background: active ? 'var(--accent)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    color: active ? 'white' : 'var(--text-2)', transition: 'all 0.2s',
  }}>
    {icon && <span>{icon}</span>}{label}
  </button>
)

const ASPECT_RATIO_CSS: Record<string, string> = {
  [AspectRatio.Portrait]: '3/4', [AspectRatio.Square]: '1/1', [AspectRatio.Landscape]: '4/3',
  [AspectRatio.Wide]: '16/9', [AspectRatio.Tall]: '9/16',
}

const GridCell: React.FC<{
  imageUrl: string | null; vibeLabel: string; isSelected: boolean; isRevealed: boolean
  isRecycled: boolean; onClick: () => void; onExpand: () => void; delay: number; aspectRatio?: string
}> = ({ imageUrl, vibeLabel, isSelected, isRevealed, isRecycled, onClick, onExpand, delay, aspectRatio = '3/4' }) => (
  <div style={{
    aspectRatio, borderRadius: 8, position: 'relative', overflow: 'hidden',
    background: '#F0F0F1',
    border: isSelected ? '3px solid var(--accent)' : '1px solid var(--border)',
    opacity: isRevealed ? 1 : 0.3, transform: isRevealed ? 'translateY(0)' : 'translateY(-8px)',
    transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, border 0.2s`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    {imageUrl && isRevealed && <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />}
    {/* Select toggle — click anywhere on the image */}
    <div onClick={onClick} style={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 2 }} />
    {isSelected && (
      <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, background: 'var(--accent)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', zIndex: 5 }}>✓</div>
    )}
    {/* Expand button — top left on hover */}
    {isRevealed && imageUrl && (
      <button onClick={e => { e.stopPropagation(); onExpand() }} style={{ position: 'absolute', top: 6, left: 6, width: 26, height: 26, background: 'rgba(255,255,255,0.85)', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', zIndex: 5, opacity: 0.6, transition: 'opacity 0.2s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>🔍</button>
    )}
    {isRevealed && (
      <div style={{ position: 'absolute', bottom: 6, left: 6, background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.9)', color: isSelected ? 'white' : 'var(--accent)', padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 500, zIndex: 5 }}>{vibeLabel}</div>
    )}
    {isRecycled && (
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(243,244,246,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
      </div>
    )}
  </div>
)

const RefSlot: React.FC<{
  label: string; iconLabel: string; ref_: { file: File; preview: string } | null
  onUpload: (file: File) => void; onRemove: () => void; badge?: string
}> = ({ label, iconLabel, ref_, onUpload, onRemove, badge }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    {ref_ ? (
      <div style={{ position: 'relative', width: 50, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
        <img src={ref_.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <button onClick={onRemove} style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: 'white', border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
    ) : (
      <label style={{ width: 50, height: 50, borderRadius: 8, border: '1px dashed #ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.2 }}>
        {iconLabel}<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); if (e.target) e.target.value = '' }} />
      </label>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{label}</span>
      {badge && ref_ && <span style={{ fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-2)', width: 'fit-content' }}>{badge}</span>}
    </div>
  </div>
)

// Extracts only pose/angle directions from vibe shots, stripping location and phone details
function extractPoseOnly(shotDescription: string): string {
  // Remove phone/iPhone mentions and location-specific details, keep pose/angle/framing
  return shotDescription
    .replace(/,?\s*(iPhone|phone|colored case|colored phone case)[^,]*/gi, '')
    .replace(/,?\s*(bathroom|bedroom|kitchen|gym|hotel|restaurant|cafe|mirror|marble|LED|vanity|counter|nightstand|bed|couch|hallway|window|pool|elevator)[^,]*/gi, '')
    .replace(/,?\s*(beauty products|towels|toiletries|pillows|blanket|flowers)[^,]*/gi, '')
    .replace(/,?\s*\b(behind|visible|in reflection|on counter)\b[^,]*/gi, '')
    .replace(/,{2,}/g, ',')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim()
}

// ─── Main Component ───────────────────────────────────────
export function StudioV2({ onNav, onEditImage, onExportImage }: {
  onNav?: (page: string) => void; onEditImage?: (url: string) => void; onExportImage?: (url: string) => void
}) {
  const [phase, setPhase] = useState<'hero' | 'session'>('hero')
  const [sourceTab, setSourceTab] = useState<'crear' | 'subir' | 'galeria'>('crear')
  const [isSimpleMode, setIsSimpleMode] = useState(true)

  const characters = useCharacterStore(s => s.characters)
  const galleryItems = useGalleryStore(s => s.items)
  const pipelineCharId = usePipelineStore(s => s.characterId)
  const pipelineSetHeroShot = usePipelineStore(s => s.setHeroShot)
  const { decrementCredits, restoreCredits } = useProfile()
  const toast = useToast()

  // Phase 1
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [characteristics, setCharacteristics] = useState('')
  const [faceRefs, setFaceRefs] = useState<{ file: File; preview: string }[]>([])
  const [charRefUrls, setCharRefUrls] = useState<string[]>([])
  const [outfitRef, setOutfitRef] = useState<{ file: File; preview: string } | null>(null)
  const [poseRef, setPoseRef] = useState<{ file: File; preview: string } | null>(null)
  const [scenarioRef, setScenarioRef] = useState<{ file: File; preview: string } | null>(null)
  const faceInputRef = useRef<HTMLInputElement>(null)
  const [selectedPose, setSelectedPose] = useState('')
  const [selectedCamera, setSelectedCamera] = useState('portrait')
  const [selectedLighting, setSelectedLighting] = useState('natural')
  const [customPose, setCustomPose] = useState('')
  const [customCamera, setCustomCamera] = useState('')
  const [customLighting, setCustomLighting] = useState('')
  const [scenario, setScenario] = useState('')
  const [outfitDescription, setOutfitDescription] = useState('')
  const [objectText, setObjectText] = useState('')
  const [selectedEnhancers, setSelectedEnhancers] = useState<Set<string>>(new Set())
  const [customEnhancer, setCustomEnhancer] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [imageBoostOn, setImageBoostOn] = useState(false)
  const [activeQuickStyle, setActiveQuickStyle] = useState<string | null>(null)
  const [showScenarioInput, setShowScenarioInput] = useState(false)
  const [showOutfitInput, setShowOutfitInput] = useState(false)
  const [selectedEngine, setSelectedEngine] = useState('auto')
  const [selectedResolution, setSelectedResolution] = useState('2k')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(AspectRatio.Portrait)
  const [generatingHero, setGeneratingHero] = useState(false)
  const [heroProgress, setHeroProgress] = useState(0)
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [flashActive, setFlashActive] = useState(false)
  const abortHeroRef = useRef<AbortController | null>(null)
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ pose: false, camera: false, lighting: false, enhancers: false, advanced: false })

  // Phase 2
  const [selectedVibes, setSelectedVibes] = useState<Set<string>>(new Set(DEFAULT_VIBES))
  const [autoVibes, setAutoVibes] = useState<Set<string>>(new Set())
  const [photoCount, setPhotoCount] = useState(9)
  const [generatingSession, setGeneratingSession] = useState(false)
  const [sessionProgress, setSessionProgress] = useState(0)
  const [gridCells, setGridCells] = useState<string[]>([])
  const [cellVibeMap, setCellVibeMap] = useState<string[]>([])
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set())
  const [revealedCells, setRevealedCells] = useState<Set<number>>(new Set())
  // upscalingCells removed — save replaces upscale
  const abortSessionRef = useRef<AbortController | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Character auto-select
  const selectedChar = characters.find(c => c.id === selectedCharId)
  useEffect(() => {
    if (pipelineCharId && characters.find(c => c.id === pipelineCharId)) setSelectedCharId(pipelineCharId)
    else if (characters.length > 0 && !selectedCharId) setSelectedCharId(characters[0].id)
  }, [characters, selectedCharId, pipelineCharId])
  useEffect(() => { if (selectedChar) setCharacteristics(selectedChar.characteristics || '') }, [selectedChar?.id])

  const handleSelectCharacter = (id: string) => {
    setSelectedCharId(id)
    const char = characters.find(c => c.id === id)
    const maxRefs = DIRECTOR_REF_MAX[selectedEngine] ?? 3
    setCharRefUrls(char?.referencePhotoUrls?.length ? char.referencePhotoUrls.slice(0, maxRefs) : (char?.modelImageUrls?.length ? [char.modelImageUrls[0]] : []))
  }

  const getCharacterReferenceUrls = (): string[] => {
    if (!selectedChar) return []
    if (selectedChar.referencePhotoUrls?.length) return selectedChar.referencePhotoUrls.slice(0, 5)
    const charItems = galleryItems.filter(item => item.characterId === selectedChar.id && typeof item.url === 'string' && item.url.startsWith('http')).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)
    if (charItems.length > 0) return charItems.map(i => i.url).filter(Boolean)
    if (selectedChar.modelImageUrls?.length) return [selectedChar.modelImageUrls[0]]
    return []
  }

  const applyQuickStyle = (preset: typeof QUICK_STYLE_PRESETS[0]) => {
    if (activeQuickStyle === preset.id) { setActiveQuickStyle(null); return }
    setActiveQuickStyle(preset.id)
    setScenario(preset.scenario); setSelectedCamera(preset.camera); setSelectedLighting(preset.lighting); setSelectedPose(preset.pose)
    setCustomCamera(''); setCustomLighting(''); setCustomPose('')
  }

  const triggerFlash = () => {
    setFlashActive(true)
    if (flashRef.current) clearTimeout(flashRef.current)
    flashRef.current = setTimeout(() => setFlashActive(false), 600)
  }

  // Build params (from Director)
  const buildParams = (charRefFiles: File[] = []): InfluencerParams => {
    const poseValue = customPose.trim() || POSE_OPTIONS.find(p => p.id === selectedPose)?.value || ''
    const cameraValue = customCamera.trim() || CAMERA_OPTIONS.find(c => c.id === selectedCamera)?.value || 'shot on 85mm lens, shallow depth of field'
    const lightingValue = customLighting.trim() || LIGHTING_OPTIONS.find(l => l.id === selectedLighting)?.value || 'soft natural light'
    const enhancerPrompt = buildEnhancerPrompt(selectedEnhancers, customEnhancer)
    const modelImages: File[] = [...charRefFiles]; faceRefs.forEach(f => modelImages.push(f.file))
    const scenarioText = [scenario, enhancerPrompt].filter(Boolean).join('. ').trim()
    const imageSizeMap: Record<string, ImageSize> = { '1k': ImageSize.Size1K, '2k': ImageSize.Size2K, '4k': ImageSize.Size4K }
    return {
      characters: [{ id: selectedChar?.id || 'studio-char', characteristics: characteristics || selectedChar?.characteristics || '', outfitDescription: outfitDescription || selectedChar?.outfitDescription || '', pose: poseValue, accessory: selectedChar?.accessory || '', modelImages, outfitImages: outfitRef ? [outfitRef.file] : [], poseImage: poseRef ? poseRef.file : undefined }],
      scenario: scenarioText || 'professional photo shoot', lighting: lightingValue, camera: cameraValue,
      negativePrompt: negativePrompt.trim() || undefined,
      imageBoost: imageBoostOn ? IMAGE_BOOST_KEYWORDS : detectCharStyle(characteristics || selectedChar?.characteristics || '', selectedChar?.renderStyle).styleBoost,
      realistic: imageBoostOn ? true : detectCharStyle(characteristics || selectedChar?.characteristics || '', selectedChar?.renderStyle).isRealistic,
      imageSize: imageSizeMap[selectedResolution] || ImageSize.Size2K, aspectRatio: selectedAspectRatio, numberOfImages: 1,
    }
  }

  // Generate Hero
  const handleHeroGenerate = async () => {
    if (!selectedChar && faceRefs.length === 0) { toast.error('Selecciona un personaje o sube fotos de referencia'); return }
    const cost = CREDIT_COSTS['grok-edit']
    const ok = await decrementCredits(cost)
    if (!ok) { toast.error('Créditos insuficientes'); return }
    setGeneratingHero(true); setHeroProgress(0); abortHeroRef.current = new AbortController()

    try {
      const charRefFiles = await fetchUrlsAsFiles(getCharacterReferenceUrls())
      const params = buildParams(charRefFiles)
      const eng = selectedEngine !== 'auto' ? ENGINE_METADATA.find(e => e.key === selectedEngine) : null
      const targetModelId = eng?.falModel ?? eng?.replicateModel ?? 'fal-ai/bytedance/seedream/v5/lite'
      const rawIntent = [params.scenario, outfitDescription ? `Outfit: ${outfitDescription}` : outfitRef ? 'Outfit from reference image' : null, objectText?.trim() && `With: ${objectText.trim()}`].filter(Boolean).join('. ')
      const charStyleInfo = detectCharStyle(params.characters[0]?.characteristics || '', selectedChar?.renderStyle)
      const compiledScenario = await compilePrompt({ subjectIntent: rawIntent, poseLighting: [params.characters[0]?.pose, params.camera, params.lighting].filter(Boolean).join(', ') || undefined, targetModel: targetModelId, isEdit: false, isRealistic: charStyleInfo.isRealistic }).catch(() => rawIntent)
      params.scenario = compiledScenario

      if (poseRef) {
        const okPose = await decrementCredits(5)
        if (okPose) { try { const u = await fal.storage.upload(poseRef.file); const c = await runControlNet(u, params.scenario || ''); if (c) params.scenario = `${params.scenario} [POSE_REF: ${c}]` } catch { restoreCredits(5) } }
      }

      let results: string[]
      if (eng?.provider === AIProvider.Higgsfield) results = await generateWithSoul(params, p => setHeroProgress(p), abortHeroRef.current.signal)
      else if (eng?.provider === AIProvider.Replicate) results = await generateWithReplicate(params, eng.replicateModel, p => setHeroProgress(p), abortHeroRef.current.signal)
      else if (eng?.provider === AIProvider.OpenAI) results = await generateWithOpenAI(params, eng.openaiModel, p => setHeroProgress(p), abortHeroRef.current.signal)
      else if (eng?.provider === AIProvider.Fal) results = await generateWithFal(params, eng.falModel, p => setHeroProgress(p), abortHeroRef.current.signal)
      else results = await generateInfluencerImage(params, p => setHeroProgress(p), abortHeroRef.current.signal)

      if (results.length > 0) {
        triggerFlash(); setHeroImage(results[0]); pipelineSetHeroShot(results[0])
        useGalleryStore.getState().addItems(results.map(url => ({ id: crypto.randomUUID(), url, prompt: scenario || 'Studio hero shot', model: eng?.userFriendlyName || 'gemini-nb2', timestamp: Date.now(), type: 'create' as const, characterId: selectedChar?.id, tags: ['studio', 'hero-shot'], source: 'director' as const })))
        if (selectedChar) useCharacterStore.getState().incrementUsage(selectedChar.id)
        toast.success('Hero shot generado')
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') { restoreCredits(cost + (poseRef ? 5 : 0)); toast.error('Error al generar'); console.error(err) }
    } finally { setGeneratingHero(false); setHeroProgress(0) }
  }

  // Session transition
  const handleSessionTransition = () => {
    const vibeIds = activeQuickStyle ? (QUICK_STYLE_TO_VIBES[activeQuickStyle] ?? DEFAULT_VIBES) : DEFAULT_VIBES
    const vibeSet = new Set(vibeIds); setSelectedVibes(vibeSet); setAutoVibes(vibeSet); setPhase('session')
  }

  const handleUploadSource = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setHeroImage(reader.result as string); setSelectedVibes(new Set(DEFAULT_VIBES)); setAutoVibes(new Set(DEFAULT_VIBES)); setPhase('session') }
    reader.readAsDataURL(file); e.target.value = ''
  }

  // Session output controls
  const [sessionResolution, setSessionResolution] = useState('2k')
  const [sessionAspectRatio, setSessionAspectRatio] = useState<AspectRatio>(AspectRatio.Portrait)

  // Generate session — individual photos, one call per shot
  const handleSessionGenerate = async () => {
    if (!heroImage) return
    const costPerShot = CREDIT_COSTS['grok-edit']
    const totalCost = photoCount * costPerShot
    const ok = await decrementCredits(totalCost)
    if (!ok) { toast.error(`Créditos insuficientes (${totalCost}cr necesarios)`); return }

    setGeneratingSession(true); setSessionProgress(0)
    setGridCells(Array(photoCount).fill('')); setSelectedCells(new Set()); setRevealedCells(new Set())
    abortSessionRef.current = new AbortController()

    const rawPoses = mixShots(selectedVibes, photoCount)
    const poses = rawPoses.map(p => extractPoseOnly(p))
    const selectedPresets = PHOTO_SESSION_PRESETS.filter(p => selectedVibes.has(p.id))
    const vibeLabels = Array.from({ length: photoCount }, (_, i) => selectedPresets[i % Math.max(selectedPresets.length, 1)]?.label ?? 'Photo')
    setCellVibeMap(vibeLabels)

    const charStyleInfo = detectCharStyle(characteristics || selectedChar?.characteristics || '', selectedChar?.renderStyle)
    const sceneContext = scenario || 'professional photo shoot'
    const arMap: Record<string, string> = {
      [AspectRatio.Portrait]: '3:4', [AspectRatio.Square]: '1:1', [AspectRatio.Landscape]: '4:3',
      [AspectRatio.Wide]: '16:9', [AspectRatio.Tall]: '9:16',
    }
    const imgSize = sessionResolution === '4k' ? '4K' : sessionResolution === '1k' ? '1K' : '2K'

    let heroFile: File
    try {
      const heroRes = await fetch(heroImage); const heroBlob = await heroRes.blob()
      heroFile = new File([heroBlob], 'hero.jpg', { type: heroBlob.type || 'image/jpeg' })
    } catch { restoreCredits(totalCost); toast.error('Error cargando imagen base'); setGeneratingSession(false); return }

    let successCount = 0; let failCount = 0

    // Generate each photo individually with concurrency limit
    const generateShot = async (pose: string, idx: number) => {
      if (abortSessionRef.current?.signal.aborted) return
      try {
        const results = await generatePhotoSession(heroFile, 1, {
          scenario: sceneContext, realistic: charStyleInfo.isRealistic,
          aspectRatio: arMap[sessionAspectRatio] || '3:4', imageSize: imgSize, angles: [pose],
        }, undefined, abortSessionRef.current!.signal)

        if (results.length > 0 && results[0].url) {
          setGridCells(prev => { const n = [...prev]; n[idx] = results[0].url; return n })
          setRevealedCells(prev => new Set([...prev, idx]))
          successCount++
        } else { failCount++ }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        // Fallback to Grok
        try {
          const grokRes = await generatePhotoSessionWithGrok(heroFile, 1, {
            scenario: sceneContext, realistic: charStyleInfo.isRealistic, angles: [pose],
          }, undefined, abortSessionRef.current!.signal)
          if (grokRes.length > 0 && grokRes[0].url) {
            setGridCells(prev => { const n = [...prev]; n[idx] = grokRes[0].url; return n })
            setRevealedCells(prev => new Set([...prev, idx]))
            successCount++
          } else { failCount++ }
        } catch { failCount++ }
      }
      setSessionProgress(Math.round(((successCount + failCount) / photoCount) * 100))
    }

    // Run with concurrency of 3
    const items = poses.map((pose, idx) => ({ pose, idx }))
    for (let i = 0; i < items.length; i += 3) {
      const batch = items.slice(i, i + 3)
      await Promise.all(batch.map(({ pose, idx }) => generateShot(pose, idx)))
    }

    if (failCount > 0) restoreCredits(failCount * costPerShot)
    triggerFlash(); setGeneratingSession(false); setSessionProgress(0)
    if (successCount > 0) toast.success(`${successCount} foto${successCount > 1 ? 's' : ''} generada${successCount > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} fallaron)` : ''}`)
    else toast.error('No se generaron fotos')
  }

  // Save selected photos to gallery
  const handleSaveSelected = () => {
    if (selectedCells.size === 0) return
    const items: GalleryItem[] = Array.from(selectedCells).filter(idx => gridCells[idx]).map(idx => ({
      id: crypto.randomUUID(), url: gridCells[idx], prompt: `Session: ${scenario || 'Studio'} · ${cellVibeMap[idx] || 'Photo'}`,
      model: 'gemini-nb2', timestamp: Date.now(), type: 'create' as const,
      characterId: selectedChar?.id, tags: ['studio', 'session', `vibe:${cellVibeMap[idx]}`], source: 'director' as const,
    }))
    useGalleryStore.getState().addItems(items)
    toast.success(`${items.length} foto${items.length > 1 ? 's' : ''} guardada${items.length > 1 ? 's' : ''} en galería`)
  }

  // Lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const handleVibeToggle = (id: string) => { setSelectedVibes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  const canvasSize = CANVAS_SIZES[selectedAspectRatio] ?? CANVAS_SIZES[AspectRatio.Portrait]

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row lg:h-full" style={{ background: 'var(--bg-0)' }}>
      <FlashOverlay active={flashActive} />
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadSource} />
      <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && faceRefs.length < 3) setFaceRefs(prev => [...prev, { file: f, preview: URL.createObjectURL(f) }]); e.target.value = '' }} />

      {/* ── LEFT PANEL ── */}
      <div className="w-full lg:w-[360px] shrink-0 flex flex-col lg:h-full overflow-y-auto" style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>

        {phase === 'hero' ? (
          <div className="flex flex-col h-full">
            <div className="p-6 flex flex-col gap-5">
              {/* Mode toggle */}
              <div style={{ display: 'flex', background: 'var(--bg-0)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
                {(['Simple', 'Avanzado'] as const).map(mode => (
                  <button key={mode} onClick={() => setIsSimpleMode(mode === 'Simple')} style={{ flex: 1, padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: (mode === 'Simple') === isSimpleMode ? 'var(--accent)' : 'transparent', color: (mode === 'Simple') === isSimpleMode ? 'white' : 'var(--text-2)', transition: 'all 0.2s' }}>{mode}</button>
                ))}
              </div>

              {/* Source tabs */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ key: 'crear' as const, label: '✨ Crear' }, { key: 'subir' as const, label: '📷 Subir' }, { key: 'galeria' as const, label: '🖼 Galería' }].map(t => (
                  <button key={t.key} onClick={() => { setSourceTab(t.key); if (t.key === 'subir') uploadInputRef.current?.click() }}
                    style={{ padding: '6px 12px', borderRadius: 16, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: `1px solid ${sourceTab === t.key ? 'transparent' : 'var(--border)'}`, background: sourceTab === t.key ? 'var(--bg-0)' : 'var(--bg-1)', color: sourceTab === t.key ? 'var(--text-1)' : 'var(--text-2)', transition: 'all 0.2s' }}>{t.label}</button>
                ))}
              </div>

              {/* Character row */}
              <div>
                <span style={labelStyle}>Protagonista</span>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                  {characters.map(c => (
                    <div key={c.id} onClick={() => handleSelectCharacter(c.id)} style={{ width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, border: selectedCharId === c.id ? '2px solid var(--accent)' : '2px solid transparent', padding: selectedCharId === c.id ? 2 : 0, transition: 'all 0.2s', overflow: 'hidden' }}>
                      {c.thumbnail ? (
                        <img src={c.thumbnail} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 600, color: 'var(--text-2)' }}>{c.name?.[0] || '?'}</div>
                      )}
                    </div>
                  ))}
                  {characters.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Sin personajes</span>}
                </div>
              </div>

              {/* Quick Style pills */}
              <div>
                <span style={labelStyle}>Estilo Base</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {QUICK_STYLE_PRESETS.map(p => (
                    <button key={p.id} onClick={() => applyQuickStyle(p)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer', border: `1px solid ${activeQuickStyle === p.id ? 'var(--accent)' : 'var(--border)'}`, background: activeQuickStyle === p.id ? 'var(--accent)' : 'white', color: activeQuickStyle === p.id ? 'white' : 'var(--text-2)', transition: 'all 0.2s' }}>{p.emoji} {p.label}</button>
                  ))}
                </div>
              </div>

              {/* Simple mode: progressive disclosure */}
              {isSimpleMode && (
                <>
                  {/* Scenario disclosure */}
                  <div>
                    <button onClick={() => setShowScenarioInput(p => !p)} style={{ fontSize: '0.75rem', color: 'var(--text-3)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>
                      {showScenarioInput ? '− Ocultar escenario' : '+ Añadir instrucción manual'}
                    </button>
                    {showScenarioInput && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={3} placeholder="Describe el escenario..." style={inputStyle} />
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {scenarioRef ? (
                            <div style={{ position: 'relative', width: 50, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                              <img src={scenarioRef.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button onClick={() => setScenarioRef(null)} style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: 'white', border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>
                          ) : (
                            <label style={{ width: 50, height: 50, borderRadius: 8, border: '1px dashed #ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>
                              📷 Ref<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setScenarioRef({ file: f, preview: URL.createObjectURL(f) }); if (e.target) e.target.value = '' }} />
                            </label>
                          )}
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Referencia visual de escenario</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Outfit disclosure */}
                  <div>
                    <button onClick={() => setShowOutfitInput(p => !p)} style={{ fontSize: '0.75rem', color: 'var(--text-3)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500 }}>
                      {showOutfitInput ? '− Ocultar vestuario' : '+ Subir vestuario específico'}
                    </button>
                    {showOutfitInput && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <textarea value={outfitDescription} onChange={e => setOutfitDescription(e.target.value)} rows={2} placeholder="Describe la ropa..." style={inputStyle} />
                        {outfitRef ? (
                          <div style={{ position: 'relative', width: 50, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                            <img src={outfitRef.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button onClick={() => setOutfitRef(null)} style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: 'white', border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                          </div>
                        ) : (
                          <label style={{ width: 50, height: 50, borderRadius: 8, border: '1px dashed #ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>
                            📷 Ref<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setOutfitRef({ file: f, preview: URL.createObjectURL(f) }); if (e.target) e.target.value = '' }} />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Pose reference (always visible in simple, just the upload) */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Referencia de pose (opcional)</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {poseRef ? (
                        <div style={{ position: 'relative', width: 50, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={poseRef.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => setPoseRef(null)} style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: 'white', border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      ) : (
                        <label style={{ width: 50, height: 50, borderRadius: 8, border: '1px dashed #ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>
                          🧍 Pose<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setPoseRef({ file: f, preview: URL.createObjectURL(f) }); if (e.target) e.target.value = '' }} />
                        </label>
                      )}
                      {poseRef && <span style={{ fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-2)' }}>+5cr ControlNet</span>}
                    </div>
                  </div>
                </>
              )}

              {/* Advanced mode: accordions */}
              {!isSimpleMode && (
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
                  {/* Face references */}
                  <div style={{ margin: '12px 0' }}>
                    <span style={labelStyle}>Referencias de rostro</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {faceRefs.map((ref, i) => (
                        <RefSlot key={i} label="" iconLabel="" ref_={ref} onUpload={() => {}} onRemove={() => setFaceRefs(prev => prev.filter((_, idx) => idx !== i))} />
                      ))}
                      {faceRefs.length < 3 && (
                        <label style={{ width: 50, height: 50, borderRadius: 8, border: '1px dashed #ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'var(--text-3)' }}>
                          + Cara<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFaceRefs(prev => [...prev, { file: f, preview: URL.createObjectURL(f) }]); if (e.target) e.target.value = '' }} />
                        </label>
                      )}
                    </div>
                    {charRefUrls.length > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: 4, display: 'block' }}>{charRefUrls.length} ref(s) del personaje auto-cargadas</span>}
                  </div>
                  {/* Scenario + ref */}
                  <div style={{ margin: '12px 0' }}>
                    <span style={labelStyle}>Escenario</span>
                    <textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={3} placeholder="Describe el escenario..." style={inputStyle} />
                    <div style={{ marginTop: 8 }}>
                      <RefSlot label="Referencia de escenario" iconLabel="📷 Ref" ref_={scenarioRef} onUpload={f => setScenarioRef({ file: f, preview: URL.createObjectURL(f) })} onRemove={() => setScenarioRef(null)} />
                    </div>
                  </div>
                  {/* Outfit + ref */}
                  <div style={{ marginBottom: 12 }}>
                    <span style={labelStyle}>Ropa</span>
                    <textarea value={outfitDescription} onChange={e => setOutfitDescription(e.target.value)} rows={2} placeholder="Describe la ropa..." style={inputStyle} />
                    <div style={{ marginTop: 8 }}>
                      <RefSlot label="Referencia de ropa" iconLabel="👗 Ref" ref_={outfitRef} onUpload={f => setOutfitRef({ file: f, preview: URL.createObjectURL(f) })} onRemove={() => setOutfitRef(null)} />
                    </div>
                  </div>
                  {/* Pose accordion + ref */}
                  <AccordionSection title="Pose" icon="🧍" isOpen={openSections.pose} onToggle={() => setOpenSections(p => ({ ...p, pose: !p.pose }))}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{POSE_OPTIONS.map(o => <Chip key={o.id} label={o.label} icon={o.icon} active={selectedPose === o.id} onClick={() => setSelectedPose(selectedPose === o.id ? '' : o.id)} />)}</div>
                    <div style={{ marginTop: 10 }}>
                      <RefSlot label="Referencia de pose (ControlNet)" iconLabel="🧍 Pose" ref_={poseRef} onUpload={f => setPoseRef({ file: f, preview: URL.createObjectURL(f) })} onRemove={() => setPoseRef(null)} badge="+5cr" />
                    </div>
                  </AccordionSection>
                  <AccordionSection title="Cámara" icon="📷" isOpen={openSections.camera} onToggle={() => setOpenSections(p => ({ ...p, camera: !p.camera }))}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{CAMERA_OPTIONS.map(o => <Chip key={o.id} label={o.label} icon={o.icon} active={selectedCamera === o.id} onClick={() => setSelectedCamera(o.id)} />)}</div>
                  </AccordionSection>
                  <AccordionSection title="Iluminación" icon="💡" isOpen={openSections.lighting} onToggle={() => setOpenSections(p => ({ ...p, lighting: !p.lighting }))}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{LIGHTING_OPTIONS.map(o => <Chip key={o.id} label={o.label} icon={o.icon} active={selectedLighting === o.id} onClick={() => setSelectedLighting(o.id)} />)}</div>
                  </AccordionSection>
                  <AccordionSection title="Enhancers" icon="✨" isOpen={openSections.enhancers} onToggle={() => setOpenSections(p => ({ ...p, enhancers: !p.enhancers }))}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{ENHANCERS.map(e => <Chip key={e.id} label={e.label} icon={e.icon} active={selectedEnhancers.has(e.id)} onClick={() => setSelectedEnhancers(prev => { const n = new Set(prev); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n })} />)}</div>
                  </AccordionSection>
                  <AccordionSection title="Avanzado" icon="⚙️" isOpen={openSections.advanced} onToggle={() => setOpenSections(p => ({ ...p, advanced: !p.advanced }))}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} rows={2} placeholder="Negative prompt..." style={inputStyle} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-2)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={imageBoostOn} onChange={e => setImageBoostOn(e.target.checked)} /> Image Boost
                      </label>
                    </div>
                  </AccordionSection>
                </div>
              )}
            </div>

            {/* CTA */}
            <div style={{ marginTop: 'auto', padding: '0 24px 24px' }}>
              <button onClick={handleHeroGenerate} disabled={generatingHero} style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: 16, borderRadius: 12, fontSize: '1rem', fontWeight: 500, cursor: generatingHero ? 'wait' : 'pointer', opacity: generatingHero ? 0.6 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                {generatingHero ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Generando... {heroProgress}%</> : <>⚡ Generar Hero <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>· {CREDIT_COSTS['grok-edit']}cr</span></>}
              </button>
            </div>
          </div>
        ) : (
          /* ── PHASE 2 PANEL ── */
          <div className="flex flex-col h-full">
            <div className="p-6 flex flex-col gap-5">
              {/* Hero thumbnail */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: 'var(--bg-0)', borderRadius: 12, border: '1px solid var(--border)' }}>
                {heroImage && <img src={heroImage} style={{ width: 48, height: 64, borderRadius: 6, objectFit: 'cover' }} />}
                <div>
                  <span style={{ ...labelStyle, marginBottom: 2 }}>Imagen base</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{scenario ? scenario.slice(0, 40) + '...' : 'Hero shot'}</span>
                </div>
              </div>

              {/* Vibes */}
              <div>
                <span style={labelStyle}>Dirección Creativa (Vibes)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PHOTO_SESSION_PRESETS.map(p => (
                    <button key={p.id} onClick={() => handleVibeToggle(p.id)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${selectedVibes.has(p.id) ? 'var(--accent)' : 'var(--border)'}`, background: selectedVibes.has(p.id) ? 'var(--accent)' : 'white', color: selectedVibes.has(p.id) ? 'white' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}>
                      {p.icon} {p.label}
                      {autoVibes.has(p.id) && <span style={{ fontSize: '0.55rem', fontFamily: "'JetBrains Mono', monospace", background: selectedVibes.has(p.id) ? 'rgba(255,255,255,0.2)' : '#eee', padding: '1px 4px', borderRadius: 3 }}>auto</span>}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 8 }}>Desmarca una vibra para opacar esas fotos.</p>
              </div>

              {/* Photo count */}
              <div>
                <span style={labelStyle}>Fotos</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setPhotoCount(p => Math.max(4, p - 3) as any)} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-3)' }}>◀</button>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{photoCount}</span>
                  <button onClick={() => setPhotoCount(p => Math.min(12, p + 3) as any)} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-3)' }}>▶</button>
                </div>
              </div>

              {/* Resolution */}
              <div>
                <span style={labelStyle}>Resolución</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['1k', '2k', '4k'] as const).map(r => (
                    <button key={r} onClick={() => setSessionResolution(r)} style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', border: `1px solid ${sessionResolution === r ? 'var(--accent)' : 'var(--border)'}`, background: sessionResolution === r ? 'var(--accent)' : 'transparent', color: sessionResolution === r ? 'white' : 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.2s' }}>{r.toUpperCase()}</button>
                  ))}
                </div>
              </div>

              {/* Aspect ratio */}
              <div>
                <span style={labelStyle}>Formato</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ ar: AspectRatio.Portrait, label: 'Publicación' }, { ar: AspectRatio.Square, label: 'Cuadrado' }, { ar: AspectRatio.Landscape, label: 'Portada' }, { ar: AspectRatio.Wide, label: 'Banner' }, { ar: AspectRatio.Tall, label: 'Historia / Reel' }].map(({ ar, label }) => (
                    <button key={ar} onClick={() => setSessionAspectRatio(ar)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${sessionAspectRatio === ar ? 'var(--accent)' : 'var(--border)'}`, background: sessionAspectRatio === ar ? 'var(--accent)' : 'transparent', color: sessionAspectRatio === ar ? 'white' : 'var(--text-2)', transition: 'all 0.2s' }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 'auto', padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={handleSessionGenerate} disabled={generatingSession} style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: 16, borderRadius: 12, fontSize: '1rem', fontWeight: 500, cursor: generatingSession ? 'wait' : 'pointer', opacity: generatingSession ? 0.6 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                {generatingSession ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Revelando... {sessionProgress}%</> : <>📸 Disparar {photoCount} Fotos <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>· {photoCount * CREDIT_COSTS['grok-edit']}cr</span></>}
              </button>
              <button onClick={() => setPhase('hero')} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--text-3)', cursor: 'pointer', textAlign: 'center' }}>← Volver al hero</button>
            </div>
          </div>
        )}
      </div>

      {/* ── CENTER CANVAS ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto" style={{ minHeight: '100vh' }}>
        {phase === 'hero' ? (
          <>
            <div style={{ width: canvasSize.w, height: canvasSize.h, maxWidth: '100%', borderRadius: 16, position: 'relative', overflow: 'hidden', boxShadow: heroImage ? '0 8px 32px rgba(0,0,0,0.03)' : 'none', background: heroImage ? undefined : 'var(--bg-0)', border: heroImage ? 'none' : '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s ease' }}>
              {!heroImage && !generatingHero && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-3)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: '1.2rem', color: '#999', fontStyle: 'italic' }}>Tu lienzo en blanco</span>
                </div>
              )}
              {generatingHero && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Generando... {heroProgress}%</span>
                </div>
              )}
              {heroImage && (
                <>
                  <img src={heroImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 24, background: 'white', borderRadius: 20, padding: 8, display: 'flex', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid var(--border)' }}>
                    <button onClick={() => onEditImage?.(heroImage)} style={{ padding: '8px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--text-1)' }}>✏️ Editar</button>
                    <button onClick={handleSessionTransition} style={{ padding: '8px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'var(--accent)', color: 'white' }}>📸 Sesión</button>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, fontSize: '0.75rem' }}>
              {Object.values(AspectRatio).map(ar => (
                <span key={ar} onClick={() => setSelectedAspectRatio(ar)} style={{ cursor: 'pointer', color: selectedAspectRatio === ar ? 'var(--text-1)' : 'var(--text-3)', fontWeight: selectedAspectRatio === ar ? 600 : 400 }}>
                  {ar === AspectRatio.Portrait ? 'Publicación' : ar === AspectRatio.Square ? 'Cuadrado' : ar === AspectRatio.Landscape ? 'Portada' : ar === AspectRatio.Wide ? 'Banner' : 'Historia / Reel'}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            {gridCells.length === 0 && !generatingSession && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-3)' }}>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: '1.2rem', fontStyle: 'italic' }}>Haz clic en "Disparar Sesión"</span>
              </div>
            )}
            {generatingSession && gridCells.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Revelando... {sessionProgress}%</span>
              </div>
            )}
            {(gridCells.length > 0 || (generatingSession && gridCells.length === 0)) && gridCells.length > 0 && (
              <div style={{ width: '100%', maxWidth: 600, display: 'grid', gridTemplateColumns: `repeat(${(GRID_DIMS[photoCount] || GRID_DIMS[9]).cols}, 1fr)`, gap: 8, marginBottom: 80 }}>
                {Array.from({ length: photoCount }).map((_, idx) => {
                  const vibeLabel = cellVibeMap[idx] || 'Photo'
                  const vibePreset = PHOTO_SESSION_PRESETS.find(p => p.label === vibeLabel)
                  const isRecycled = vibePreset ? !selectedVibes.has(vibePreset.id) : false
                  return <GridCell key={idx} imageUrl={gridCells[idx] || null} vibeLabel={vibeLabel} isSelected={selectedCells.has(idx)} isRevealed={revealedCells.has(idx)} isRecycled={isRecycled} onClick={() => gridCells[idx] && setSelectedCells(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })} onExpand={() => setLightboxIdx(idx)} delay={idx * 150} aspectRatio={ASPECT_RATIO_CSS[sessionAspectRatio] || '3/4'} />
                })}
              </div>
            )}
            {gridCells.length > 0 && (
              <div style={{ position: 'sticky', bottom: 24, width: 'calc(100% - 48px)', maxWidth: 600, background: 'white', borderRadius: 16, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.08)', border: '1px solid var(--border)', zIndex: 20 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-2)' }}>{selectedCells.size} de {gridCells.length} seleccionadas</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSessionGenerate} style={{ background: 'white', border: '1px solid #ccc', padding: 12, borderRadius: 12, cursor: 'pointer', fontSize: '0.85rem' }}>↻ Regenerar</button>
                  <button onClick={handleSaveSelected} disabled={selectedCells.size === 0} style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: '0.9rem', fontWeight: 500, cursor: selectedCells.size === 0 ? 'not-allowed' : 'pointer', opacity: selectedCells.size === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    💾 Guardar {selectedCells.size > 0 ? selectedCells.size : ''} en Galería
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── LIGHTBOX ── */}
      {lightboxIdx !== null && gridCells[lightboxIdx] && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setLightboxIdx(null)}>
          {/* Close */}
          <button onClick={() => setLightboxIdx(null)} style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>✕</button>

          {/* Prev */}
          {lightboxIdx > 0 && gridCells[lightboxIdx - 1] && (
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1) }} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>◀</button>
          )}

          {/* Next */}
          {lightboxIdx < gridCells.length - 1 && gridCells[lightboxIdx + 1] && (
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1) }} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>▶</button>
          )}

          {/* Image */}
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '85vw', maxHeight: '85vh', position: 'relative' }}>
            <img src={gridCells[lightboxIdx]} style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{cellVibeMap[lightboxIdx] || 'Photo'} · {lightboxIdx + 1}/{gridCells.filter(Boolean).length}</span>
              <button onClick={() => { setSelectedCells(prev => { const n = new Set(prev); n.has(lightboxIdx!) ? n.delete(lightboxIdx!) : n.add(lightboxIdx!); return n }) }} style={{ background: selectedCells.has(lightboxIdx) ? 'white' : 'rgba(255,255,255,0.15)', color: selectedCells.has(lightboxIdx) ? 'var(--accent)' : 'white', border: 'none', padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                {selectedCells.has(lightboxIdx) ? '✓ Seleccionada' : 'Seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
