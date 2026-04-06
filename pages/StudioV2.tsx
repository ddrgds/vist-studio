import React, { useState, useRef, useEffect } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { usePipelineStore } from '../stores/pipelineStore'
import { enhancePrompt } from '../services/geminiService'
import { generatePhotoSessionWithGrok, generateWithNB2Fal, editWithNB2Fal } from '../services/falService'
import { generateWithSoul } from '../services/higgsfieldService'
import { generateWithReplicate } from '../services/replicateService'
import { generateWithOpenAI } from '../services/openaiService'
import { generateWithFal } from '../services/falService'
import { compilePrompt } from '../services/promptCompiler'
import { fal } from '@fal-ai/client'
import { runControlNet } from '../services/controlNetService'
// gridSplitter no longer used — session generates individual photos
import { useProfile } from '../contexts/ProfileContext'
import { useNavigationStore } from '../stores/navigationStore'
import { useToast } from '../contexts/ToastContext'
import { ImageSize, AspectRatio, ENGINE_METADATA, CREDIT_COSTS, AIProvider, ReplicateModel } from '../types'
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
  const [isSimpleMode, setIsSimpleMode] = useState(false)

  const characters = useCharacterStore(s => s.characters)
  const galleryItems = useGalleryStore(s => s.items)
  const pipelineCharId = usePipelineStore(s => s.characterId)
  const pipelineHeroUrl = usePipelineStore(s => s.heroShotUrl)
  const pipelineSetHeroShot = usePipelineStore(s => s.setHeroShot)
  const { decrementCredits, restoreCredits, profile } = useProfile()
  const userCredits = profile?.creditsRemaining ?? 0
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

  // Restore hero from pipeline store on mount (persists across page changes)
  useEffect(() => { if (pipelineHeroUrl && !heroImage) setHeroImage(pipelineHeroUrl) }, [])

  // Consume pending image from gallery selection mode
  const { pendingImage: navPendingImage, pendingTarget: navPendingTarget, consume: consumeNav } = useNavigationStore()
  useEffect(() => {
    if (navPendingTarget === 'studio' && navPendingImage) {
      setHeroImage(navPendingImage)
      setSourceTab('crear')
      consumeNav()
    }
  }, [navPendingTarget, navPendingImage])

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
    // Capture character ID at start to prevent race condition if user switches during generation
    const charIdAtStart = selectedChar?.id
    const cost = CREDIT_COSTS['grok-edit']
    const ok = await decrementCredits(cost)
    if (!ok) { toast.error('Créditos insuficientes'); return }
    setGeneratingHero(true); setHeroProgress(0); abortHeroRef.current = new AbortController()
    let poseCreditsDeducted = false

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
        if (okPose) {
          poseCreditsDeducted = true
          try { const u = await fal.storage.upload(poseRef.file); const c = await runControlNet(u, params.scenario || ''); if (c) params.scenario = `${params.scenario} [POSE_REF: ${c}]` } catch { restoreCredits(5); poseCreditsDeducted = false }
        }
      }

      let results: string[]
      if (eng?.provider === AIProvider.Higgsfield) results = await generateWithSoul(params, p => setHeroProgress(p), abortHeroRef.current.signal)
      else if (eng?.provider === AIProvider.Replicate) results = await generateWithReplicate(params, eng.replicateModel, p => setHeroProgress(p), abortHeroRef.current.signal)
      else if (eng?.provider === AIProvider.OpenAI) results = await generateWithOpenAI(params, eng.openaiModel, p => setHeroProgress(p), abortHeroRef.current.signal)
      else if (eng?.provider === AIProvider.Fal) results = await generateWithFal(params, eng.falModel, p => setHeroProgress(p), abortHeroRef.current.signal)
      else {
        // Default: NB2 → Wan Edit → Grok fallback chain
        try {
          results = await generateWithNB2Fal(params, p => setHeroProgress(p), abortHeroRef.current.signal)
          if (!results || results.length === 0) throw new Error('NB2 returned empty')
        } catch (nb2Err) {
          console.warn('NB2 hero failed, trying Wan Edit:', nb2Err)
          try {
            // Use character's approved photo as base → Wan Edit transforms it into the hero scene
            const charRefUrls = getCharacterReferenceUrls()
            if (charRefUrls.length > 0) {
              const { editWithWan27Fal } = await import('../services/falService')
              const refRes = await fetch(charRefUrls[0])
              const refBlob = await refRes.blob()
              const refFile = new File([refBlob], 'char-ref.jpg', { type: refBlob.type || 'image/jpeg' })
              const heroInstruction = `Transform this person into a new photo: ${params.scenario || 'professional photo'}. ${params.characters[0]?.pose || ''}. Keep the exact same face and body. ${params.characters[0]?.outfitDescription ? `Wearing: ${params.characters[0].outfitDescription}` : ''}`
              results = await editWithWan27Fal(refFile, heroInstruction, [], p => setHeroProgress(p), undefined, abortHeroRef.current.signal)
              if (!results || results.length === 0) throw new Error('Wan Edit returned empty')
            } else {
              throw new Error('No character refs for Wan Edit')
            }
          } catch (wanErr) {
            console.warn('Wan Edit hero failed, trying Grok:', wanErr)
            const { generateWithGrokFal } = await import('../services/falService')
            results = await generateWithGrokFal(params, p => setHeroProgress(p), abortHeroRef.current.signal)
          }
        }
      }

      if (results.length > 0) {
        triggerFlash(); setHeroImage(results[0]); pipelineSetHeroShot(results[0])
        useGalleryStore.getState().addItems(results.map(url => ({ id: crypto.randomUUID(), url, prompt: scenario || 'Studio hero shot', model: eng?.userFriendlyName || 'gemini-nb2', timestamp: Date.now(), type: 'create' as const, characterId: charIdAtStart, tags: ['studio', 'hero-shot'], source: 'director' as const })))
        if (charIdAtStart) useCharacterStore.getState().incrementUsage(charIdAtStart)
        toast.success('Hero shot generado')
      } else {
        restoreCredits(cost + (poseCreditsDeducted ? 5 : 0))
        toast.error('Generación fallida — intenta de nuevo')
      }
    } catch (err: any) {
      restoreCredits(cost + (poseCreditsDeducted ? 5 : 0))
      if (err?.name !== 'AbortError') { toast.error(`Error: ${(err?.message || '').slice(0, 120)}`); console.error(err) }
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
    reader.onload = () => { setHeroImage(reader.result as string) }
    reader.readAsDataURL(file); e.target.value = ''
  }

  // Gallery select — sets hero image without jumping to session
  const handleGallerySelect = (url: string) => {
    setHeroImage(url)
    setSourceTab('crear') // go back to create tab
  }

  // Fullscreen preview
  const [galleryFullscreen, setGalleryFullscreen] = useState<string | null>(null)

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

    // Load character identity refs for better consistency across session photos
    const identityRefs = await fetchUrlsAsFiles(getCharacterReferenceUrls())

    let successCount = 0; let failCount = 0

    // Generate each photo individually: NB2 fal.ai → Wan Edit → Grok
    const generateShot = async (pose: string, idx: number) => {
      if (abortSessionRef.current?.signal.aborted) return
      try {
        const sessionInstruction = `Create a new photo of this exact person. Pose: ${pose}. Scene: ${sceneContext}. Keep face and body identity identical. ${charStyleInfo.isRealistic ? 'Natural skin with visible pores.' : 'Style-consistent render.'}`
        const allRefs = identityRefs.length > 0 ? identityRefs : []
        const results = await editWithNB2Fal(heroFile, sessionInstruction, allRefs, undefined, undefined, abortSessionRef.current!.signal)

        if (results.length > 0 && results[0]) {
          setGridCells(prev => { const n = [...prev]; n[idx] = results[0]; return n })
          setRevealedCells(prev => new Set([...prev, idx]))
          successCount++
        } else { failCount++ }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        if (abortSessionRef.current?.signal.aborted) return // check before fallback
        // Fallback: Wan Edit (realistic identity preservation) → Grok
        try {
          const { editWithWan27Fal } = await import('../services/falService')
          const sessionInstruction = `Create a new photo of this exact person with: ${pose}. Scene: ${sceneContext}. Keep face and body identity identical. ${charStyleInfo.isRealistic ? 'Natural skin with visible pores.' : 'Style-consistent render.'}`
          const wanRes = await editWithWan27Fal(heroFile, sessionInstruction, identityRefs, (p) => setSessionProgress(Math.round((idx / photoCount) * 100 + p * (1 / photoCount))))
          if (wanRes.length > 0 && wanRes[0]) {
            setGridCells(prev => { const n = [...prev]; n[idx] = wanRes[0]; return n })
            setRevealedCells(prev => new Set([...prev, idx]))
            successCount++
          } else { throw new Error('Wan Edit returned empty') }
        } catch (wanErr: any) {
          if ((wanErr as any)?.name === 'AbortError') return
          console.warn('Wan Edit session failed, trying Grok:', wanErr)
          try {
            const grokRes = await generatePhotoSessionWithGrok(heroFile, 1, {
              scenario: sceneContext, realistic: charStyleInfo.isRealistic, angles: [pose],
            }, undefined, abortSessionRef.current!.signal)
            if (grokRes.length > 0 && grokRes[0].url) {
              setGridCells(prev => { const n = [...prev]; n[idx] = grokRes[0].url; return n })
              setRevealedCells(prev => new Set([...prev, idx]))
              successCount++
            } else { failCount++ }
          } catch (grokErr: any) {
            if ((grokErr as any)?.name === 'AbortError') return
            failCount++
          }
        }
      }
      setSessionProgress(Math.round(((successCount + failCount) / photoCount) * 100))
    }

    // Run with concurrency of 3
    const items = poses.map((pose, idx) => ({ pose, idx }))
    for (let i = 0; i < items.length; i += 3) {
      const batch = items.slice(i, i + 3)
      await Promise.all(batch.map(({ pose, idx }) => generateShot(pose, idx)))
      if (abortSessionRef.current?.signal.aborted) break // stop launching new batches
    }

    // Restore credits for non-successful shots (failed + aborted)
    const unresolved = photoCount - successCount
    if (unresolved > 0) restoreCredits(unresolved * costPerShot)
    triggerFlash(); setGeneratingSession(false); setSessionProgress(0)
    if (successCount > 0) toast.success(`${successCount} foto${successCount > 1 ? 's' : ''} generada${successCount > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} fallaron)` : ''}`)
    else toast.error('No se generaron fotos')
  }

  // Save selected photos to gallery — use selectedCharId (stable) instead of selectedChar (derived, can change)
  const handleSaveSelected = () => {
    if (selectedCells.size === 0) return
    const items: GalleryItem[] = Array.from(selectedCells).filter(idx => gridCells[idx]).map((idx, i) => ({
      id: crypto.randomUUID(), url: gridCells[idx], prompt: `Session: ${scenario || 'Studio'} · ${cellVibeMap[idx] || 'Photo'}`,
      model: 'gemini-nb2', timestamp: Date.now() + i, type: 'create' as const,
      characterId: selectedCharId ?? undefined, tags: ['studio', 'session', `vibe:${cellVibeMap[idx]}`], source: 'director' as const,
    }))
    useGalleryStore.getState().addItems(items)
    toast.success(`${items.length} foto${items.length > 1 ? 's' : ''} guardada${items.length > 1 ? 's' : ''} en galería`)
  }

  // Lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  // Mobile bottom sheet
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false)

  const handleVibeToggle = (id: string) => { setSelectedVibes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  const canvasSize = CANVAS_SIZES[selectedAspectRatio] ?? CANVAS_SIZES[AspectRatio.Portrait]

  // ─── Shared UI pieces ─────────────────────────────────
  const phaseToggle = (
    <div style={{ display: 'flex', background: 'var(--bg-0)', borderRadius: 14, padding: 4, border: '1px solid var(--border)' }}>
      <button className="pill-btn" onClick={() => setPhase('hero')} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', textAlign: 'center', border: 'none', background: phase === 'hero' ? 'var(--accent)' : 'transparent', color: phase === 'hero' ? 'white' : 'var(--text-3)', transition: 'all 0.2s' }}>⚡ Crear Hero</button>
      <button className="pill-btn" onClick={() => { if (heroImage) handleSessionTransition(); else toast.error('Genera un hero primero') }} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', textAlign: 'center', border: 'none', background: phase === 'session' ? 'var(--accent)' : 'transparent', color: phase === 'session' ? 'white' : 'var(--text-3)', transition: 'all 0.2s' }}>📸 Sesión de Fotos</button>
    </div>
  )

  // State for grouped advanced config accordion
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)

  const heroControlsContent = (compact = false) => (
    <>
      {/* Source tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[{ key: 'crear' as const, label: '✨ Crear' }, { key: 'subir' as const, label: '📷 Subir' }, { key: 'galeria' as const, label: '🖼 Galería' }].map(t => (
          <button key={t.key} className="pill-btn" onClick={() => { setSourceTab(t.key); if (t.key === 'subir') uploadInputRef.current?.click(); if (t.key === 'galeria') { useNavigationStore.getState().openGalleryForSelection('studio'); onNav?.('gallery') } }}
            style={{ padding: compact ? '5px 10px' : '7px 14px', borderRadius: 20, fontSize: compact ? '0.75rem' : '0.78rem', cursor: 'pointer', border: `1px solid ${sourceTab === t.key ? 'var(--accent)' : 'var(--border)'}`, background: sourceTab === t.key ? 'var(--accent)' : 'white', color: sourceTab === t.key ? 'white' : 'var(--text-2)', transition: 'all 0.15s' }}>{t.label}</button>
        ))}
      </div>

      {/* Character row — improved active state */}
      <div>
        <span style={labelStyle}>Protagonista</span>
        <div style={{ display: 'flex', gap: compact ? 8 : 10, overflowX: 'auto', paddingBottom: 4 }}>
          {characters.map(c => {
            const isSelected = selectedCharId === c.id
            const size = compact ? 40 : 50
            const avatarSrc = c.thumbnail || c.modelImageUrls?.[0] || c.referencePhotoUrls?.[0]
            return (
              <div key={c.id} onClick={() => handleSelectCharacter(c.id)} style={{ width: size, height: size, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, border: isSelected ? '3px solid var(--accent)' : '2px solid transparent', opacity: selectedCharId && !isSelected ? 0.45 : 1, transition: 'all 0.2s', overflow: 'hidden', boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 5px var(--accent)' : 'none' }}>
                {avatarSrc ? <img src={avatarSrc} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? '0.7rem' : '0.9rem', fontWeight: 600, color: 'var(--text-2)' }}>{c.name?.[0] || '?'}</div>}
              </div>
            )
          })}
          {characters.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Sin personajes</span>}
        </div>
      </div>

      {/* Quick Styles */}
      <div>
        <span style={labelStyle}>Estilo Rápido</span>
        <div style={{ display: 'flex', gap: compact ? 6 : 8, flexWrap: compact ? 'nowrap' : 'wrap', overflowX: compact ? 'auto' : undefined, paddingBottom: compact ? 4 : 0 }}>
          {QUICK_STYLE_PRESETS.map(p => (
            <button key={p.id} className="pill-btn" onClick={() => applyQuickStyle(p)} style={{ padding: compact ? '6px 12px' : '8px 16px', borderRadius: 20, fontSize: compact ? '0.75rem' : '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${activeQuickStyle === p.id ? 'var(--accent)' : 'var(--border)'}`, background: activeQuickStyle === p.id ? 'var(--accent)' : 'white', color: activeQuickStyle === p.id ? 'white' : 'var(--text-2)', transition: 'all 0.15s' }}>{p.emoji} {p.label}</button>
          ))}
        </div>
      </div>

      {/* Outfit — improved upload card */}
      <div>
        <span style={labelStyle}>Ropa</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea value={outfitDescription} onChange={e => setOutfitDescription(e.target.value)} rows={2} placeholder="Describe la ropa..." style={{ ...inputStyle, flex: 1 }} />
          {outfitRef ? (
            <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
              <img src={outfitRef.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => setOutfitRef(null)} style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: 'white', border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ) : (
            <label style={{ width: 56, height: 56, borderRadius: 10, background: '#F3F4F6', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 2, transition: 'all 0.15s' }}>
              <span style={{ fontSize: 16, color: 'var(--text-2)' }}>+</span>
              <span style={{ fontSize: 8, color: 'var(--text-3)', fontWeight: 500 }}>Referencia</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setOutfitRef({ file: f, preview: URL.createObjectURL(f) }); if (e.target) e.target.value = '' }} />
            </label>
          )}
        </div>
      </div>

      {/* Grouped Advanced Configuration — single accordion */}
      <AccordionSection title="Configuración Avanzada" icon="⚙️" isOpen={showAdvancedConfig} onToggle={() => setShowAdvancedConfig(p => !p)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Scenario */}
          <div>
            <span style={labelStyle}>Escenario</span>
            <textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={2} placeholder="Describe el escenario..." style={inputStyle} />
            <div style={{ marginTop: 8 }}>
              {scenarioRef ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={scenarioRef.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setScenarioRef(null)} style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: 'white', border: 'none', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Referencia de escenario</span>
                </div>
              ) : (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#F3F4F6', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-2)' }}>
                  + Añadir referencia visual
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setScenarioRef({ file: f, preview: URL.createObjectURL(f) }); if (e.target) e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>
          {/* Pose */}
          <div>
            <span style={labelStyle}>Pose</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{POSE_OPTIONS.map(o => <Chip key={o.id} label={o.label} icon={o.icon} active={selectedPose === o.id} onClick={() => setSelectedPose(selectedPose === o.id ? '' : o.id)} />)}</div>
            <div style={{ marginTop: 8 }}><RefSlot label="Pose ControlNet" iconLabel="🧍 Pose" ref_={poseRef} onUpload={f => setPoseRef({ file: f, preview: URL.createObjectURL(f) })} onRemove={() => setPoseRef(null)} badge="+5cr" /></div>
          </div>
          {/* Camera */}
          <div>
            <span style={labelStyle}>Cámara</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{CAMERA_OPTIONS.map(o => <Chip key={o.id} label={o.label} icon={o.icon} active={selectedCamera === o.id} onClick={() => setSelectedCamera(o.id)} />)}</div>
          </div>
          {/* Lighting */}
          <div>
            <span style={labelStyle}>Iluminación</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{LIGHTING_OPTIONS.map(o => <Chip key={o.id} label={o.label} icon={o.icon} active={selectedLighting === o.id} onClick={() => setSelectedLighting(o.id)} />)}</div>
          </div>
          {/* Enhancers */}
          <div>
            <span style={labelStyle}>Enhancers</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ENHANCERS.map(e => <Chip key={e.id} label={e.label} icon={e.icon} active={selectedEnhancers.has(e.id)} onClick={() => setSelectedEnhancers(prev => { const n = new Set(prev); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n })} />)}</div>
          </div>
          {/* Negative + boost */}
          <div>
            <span style={labelStyle}>Avanzado</span>
            <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} rows={2} placeholder="Negative prompt..." style={inputStyle} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-2)', cursor: 'pointer', marginTop: 8 }}>
              <input type="checkbox" checked={imageBoostOn} onChange={e => setImageBoostOn(e.target.checked)} /> Image Boost
            </label>
          </div>
        </div>
      </AccordionSection>
    </>
  )

  const sessionControlsContent = () => (
    <>
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
        <span style={labelStyle}>Dirección Creativa <span style={{ fontSize: '0.55rem', fontFamily: "'JetBrains Mono', monospace", background: '#eee', padding: '1px 4px', borderRadius: 3, textTransform: 'none', letterSpacing: 0 }}>auto</span></span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PHOTO_SESSION_PRESETS.map(p => (
            <button key={p.id} className="pill-btn" onClick={() => handleVibeToggle(p.id)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${selectedVibes.has(p.id) ? 'var(--accent)' : 'var(--border)'}`, background: selectedVibes.has(p.id) ? 'var(--accent)' : 'white', color: selectedVibes.has(p.id) ? 'white' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}>
              {p.icon} {p.label}
              {autoVibes.has(p.id) && <span style={{ fontSize: '0.55rem', fontFamily: "'JetBrains Mono', monospace", background: selectedVibes.has(p.id) ? 'rgba(255,255,255,0.2)' : '#eee', padding: '1px 4px', borderRadius: 3 }}>auto</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Photo count */}
      <div>
        <span style={labelStyle}>Fotos</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setPhotoCount(p => Math.max(4, p - 3) as any)} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-3)' }}>◀</button>
          <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{photoCount}</span>
          <button onClick={() => setPhotoCount(p => Math.min(12, p + 3) as any)} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-3)' }}>▶</button>
        </div>
      </div>

      {/* Resolution + Format */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <span style={labelStyle}>Resolución</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['1k', '2k', '4k'] as const).map(r => (
              <button key={r} className="pill-btn" onClick={() => setSessionResolution(r)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', border: `1px solid ${sessionResolution === r ? 'var(--accent)' : 'var(--border)'}`, background: sessionResolution === r ? 'var(--accent)' : 'transparent', color: sessionResolution === r ? 'white' : 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.2s' }}>{r.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div>
          <span style={labelStyle}>Formato</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ ar: AspectRatio.Portrait, label: 'Publicación' }, { ar: AspectRatio.Tall, label: 'Historia' }, { ar: AspectRatio.Square, label: '□' }].map(({ ar, label }) => (
              <button key={ar} className="pill-btn" onClick={() => setSessionAspectRatio(ar)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.7rem', cursor: 'pointer', border: `1px solid ${sessionAspectRatio === ar ? 'var(--accent)' : 'var(--border)'}`, background: sessionAspectRatio === ar ? 'var(--accent)' : 'transparent', color: sessionAspectRatio === ar ? 'white' : 'var(--text-2)', transition: 'all 0.2s' }}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  const canvasContent = () => (
    <>
      <div style={{ width: canvasSize.w, height: canvasSize.h, maxWidth: '90vw', borderRadius: 16, position: 'relative', overflow: 'hidden', boxShadow: heroImage ? '0 8px 32px rgba(0,0,0,0.04)' : 'none', background: heroImage ? undefined : 'var(--bg-0)', border: heroImage ? 'none' : '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s ease' }}>
        {!heroImage && !generatingHero && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-3)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: '1.2rem', color: '#999', fontStyle: 'italic' }}>Tu lienzo en blanco</span>
          </div>
        )}
        {generatingHero && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Generando... {Math.round(heroProgress)}%</span>
          </div>
        )}
        {heroImage && (
          <>
            <img src={heroImage} onClick={() => setGalleryFullscreen(heroImage)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} title="Clic para ampliar" />
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: 6, display: 'flex', gap: 6, border: '1px solid rgba(0,0,0,0.04)' }}>
              <button onClick={() => onEditImage?.(heroImage)} style={{ padding: '8px 16px', borderRadius: 14, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--text-1)' }}>✏️ Editar</button>
              <button onClick={handleSessionTransition} style={{ padding: '8px 16px', borderRadius: 14, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'var(--accent)', color: 'white' }}>📸 Sesión</button>
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 20, fontSize: '0.75rem' }}>
        {Object.values(AspectRatio).map(ar => (
          <span key={ar} onClick={() => setSelectedAspectRatio(ar)} style={{ cursor: 'pointer', color: selectedAspectRatio === ar ? 'var(--text-1)' : 'var(--text-3)', fontWeight: selectedAspectRatio === ar ? 600 : 400, transition: 'all 0.15s' }}>
            {ar === AspectRatio.Portrait ? 'Publicación' : ar === AspectRatio.Square ? 'Cuadrado' : ar === AspectRatio.Landscape ? 'Portada' : ar === AspectRatio.Wide ? 'Banner' : 'Historia / Reel'}
          </span>
        ))}
      </div>
    </>
  )

  const sessionGridContent = () => (
    <>
      {gridCells.length === 0 && !generatingSession && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-3)', flex: 1, justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: '1.2rem', fontStyle: 'italic' }}>Haz clic en "Disparar" para generar</span>
        </div>
      )}
      {generatingSession && gridCells.filter(Boolean).length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Revelando... {Math.round(sessionProgress)}%</span>
        </div>
      )}
      {gridCells.length > 0 && (
        <div style={{ width: '100%', maxWidth: 600, display: 'grid', gridTemplateColumns: `repeat(${(GRID_DIMS[photoCount] || GRID_DIMS[9]).cols}, 1fr)`, gap: 8 }}>
          {Array.from({ length: photoCount }).map((_, idx) => {
            const vibeLabel = cellVibeMap[idx] || 'Photo'
            const vibePreset = PHOTO_SESSION_PRESETS.find(p => p.label === vibeLabel)
            const isRecycled = vibePreset ? !selectedVibes.has(vibePreset.id) : false
            return <GridCell key={idx} imageUrl={gridCells[idx] || null} vibeLabel={vibeLabel} isSelected={selectedCells.has(idx)} isRevealed={revealedCells.has(idx)} isRecycled={isRecycled} onClick={() => gridCells[idx] && setSelectedCells(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })} onExpand={() => setLightboxIdx(idx)} delay={idx * 150} aspectRatio={ASPECT_RATIO_CSS[sessionAspectRatio] || '3/4'} />
          })}
        </div>
      )}
    </>
  )

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <>
      <FlashOverlay active={flashActive} />
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadSource} />
      <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && faceRefs.length < 3) setFaceRefs(prev => [...prev, { file: f, preview: URL.createObjectURL(f) }]); e.target.value = '' }} />

      {/* ═══════ DESKTOP ═══════ */}
      <div className="hidden lg:flex h-full" style={{ background: 'var(--bg-0)' }}>

        {/* ── LEFT PANEL ── */}
        <div className="w-[400px] shrink-0 flex flex-col h-full" style={{ background: 'white', borderRight: '1px solid var(--border)' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {phaseToggle}
            {phase === 'hero' && (
              <div style={{ display: 'flex', background: 'var(--bg-0)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
                <button className="pill-btn" onClick={() => setIsSimpleMode(true)} style={{ flex: 1, padding: '6px 12px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: isSimpleMode ? 'var(--accent)' : 'transparent', color: isSimpleMode ? 'white' : 'var(--text-3)', transition: 'all 0.2s' }}>Simple</button>
                <button className="pill-btn" onClick={() => setIsSimpleMode(false)} style={{ flex: 1, padding: '6px 12px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: !isSimpleMode ? 'var(--accent)' : 'transparent', color: !isSimpleMode ? 'white' : 'var(--text-3)', transition: 'all 0.2s' }}>Avanzado</button>
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {phase === 'hero' ? heroControlsContent() : sessionControlsContent()}
          </div>

          {/* Footer CTA */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
            {phase === 'hero' ? (
              <button onClick={handleHeroGenerate} disabled={generatingHero} style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: 14, borderRadius: 12, fontSize: '0.9rem', fontWeight: 500, cursor: generatingHero ? 'wait' : 'pointer', opacity: generatingHero ? 0.6 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                {generatingHero ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Generando... {Math.round(heroProgress)}%</> : <>⚡ Generar Imagen <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', opacity: 0.7 }}>· {CREDIT_COSTS['grok-edit']}cr</span></>}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={handleSessionGenerate} disabled={generatingSession} style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: 14, borderRadius: 12, fontSize: '0.9rem', fontWeight: 500, cursor: generatingSession ? 'wait' : 'pointer', opacity: generatingSession ? 0.6 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  {generatingSession ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Revelando... {Math.round(sessionProgress)}%</> : <>📸 Disparar {photoCount} Fotos <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', opacity: 0.7 }}>· {photoCount * CREDIT_COSTS['grok-edit']}cr</span></>}
                </button>
                <button onClick={() => setPhase('hero')} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--text-3)', cursor: 'pointer', textAlign: 'center' }}>← Volver al hero</button>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Canvas / Grid ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-y-auto" style={{ padding: 24, gap: 20 }}>
          {phase === 'hero' ? canvasContent() : (
            <>
              {sessionGridContent()}
              {/* Bottom bar */}
              {gridCells.length > 0 && (
                <div style={{ position: 'sticky', bottom: 20, width: '100%', maxWidth: 600, background: 'white', borderRadius: 16, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.08)', border: '1px solid var(--border)', zIndex: 20, marginTop: 16 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>{selectedCells.size} de {gridCells.filter(Boolean).length} seleccionadas</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSessionGenerate} disabled={generatingSession} style={{ background: 'white', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: 10, cursor: generatingSession ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: 'var(--text-2)', opacity: generatingSession ? 0.5 : 1 }}>↻ Regenerar</button>
                    <button onClick={handleSaveSelected} disabled={selectedCells.size === 0} style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: selectedCells.size === 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500, opacity: selectedCells.size === 0 ? 0.5 : 1 }}>💾 Guardar {selectedCells.size > 0 ? selectedCells.size : ''} en Galería</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════ MOBILE ═══════ */}

      {/* Mobile Phase 1: Hero */}
      {phase === 'hero' && (
        <div className="flex lg:hidden flex-col" style={{ height: '100dvh', background: 'var(--bg-0)' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Studio</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="pill-btn" onClick={() => setPhase('hero')} style={{ padding: '4px 10px', borderRadius: 16, fontSize: '0.7rem', cursor: 'pointer', border: `1px solid ${phase === 'hero' ? 'var(--accent)' : 'var(--border)'}`, background: phase === 'hero' ? 'var(--accent)' : 'white', color: phase === 'hero' ? 'white' : 'var(--text-3)' }}>Hero</button>
              <button className="pill-btn" onClick={() => { if (heroImage) handleSessionTransition(); else toast.error('Genera un hero primero') }} style={{ padding: '4px 10px', borderRadius: 16, fontSize: '0.7rem', cursor: 'pointer', border: `1px solid var(--border)`, background: 'white', color: 'var(--text-3)' }}>Sesión</button>
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EAEBEE', position: 'relative', overflow: 'hidden' }}>
            {!heroImage && !generatingHero && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-3)', textAlign: 'center', padding: 40 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: '1.1rem', color: '#999', fontStyle: 'italic' }}>Tu lienzo en blanco</span>
              </div>
            )}
            {generatingHero && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Generando... {Math.round(heroProgress)}%</span>
              </div>
            )}
            {heroImage && (
              <>
                <img src={heroImage} onClick={() => setGalleryFullscreen(heroImage)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: 6, display: 'flex', gap: 6, border: '1px solid rgba(0,0,0,0.04)' }}>
                  <button onClick={() => onEditImage?.(heroImage)} style={{ padding: '8px 16px', borderRadius: 14, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--text-1)' }}>✏️ Editar</button>
                  <button onClick={handleSessionTransition} style={{ padding: '8px 16px', borderRadius: 14, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'var(--accent)', color: 'white' }}>📸 Sesión</button>
                </div>
              </>
            )}
          </div>

          {/* Bottom sheet — scrollable controls + sticky CTA above tab bar */}
          <div style={{ background: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -8px 32px rgba(0,0,0,0.06)', overflow: 'hidden', maxHeight: mobileSheetExpanded ? '70vh' : 'none', transition: 'max-height 0.3s ease', flexShrink: 0, display: 'flex', flexDirection: 'column', marginBottom: 64 }}>
            {/* Drag bar */}
            <div onClick={() => setMobileSheetExpanded(p => !p)} style={{ width: 36, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '8px auto', cursor: 'grab', flexShrink: 0 }} />
            {/* Collapsed: show avatar + prompt preview + CTA without scroll */}
            {!mobileSheetExpanded && (
              <div style={{ padding: '4px 20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Mini protagonist + style summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(selectedChar?.thumbnail || selectedChar?.modelImageUrls?.[0] || selectedChar?.referencePhotoUrls?.[0]) && <img src={selectedChar.thumbnail || selectedChar.modelImageUrls?.[0] || selectedChar.referencePhotoUrls?.[0]} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />}
                  <span style={{ fontSize: '0.75rem', color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedChar?.name || 'Sin personaje'}{activeQuickStyle ? ` · ${QUICK_STYLE_PRESETS.find(p => p.id === activeQuickStyle)?.label || ''}` : ''}
                  </span>
                  <button onClick={() => setMobileSheetExpanded(true)} style={{ fontSize: '0.7rem', color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>Opciones ↑</button>
                </div>
                {/* CTA always visible */}
                <button onClick={handleHeroGenerate} disabled={generatingHero} style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: 14, borderRadius: 12, fontSize: '0.9rem', fontWeight: 600, cursor: generatingHero ? 'wait' : 'pointer', opacity: generatingHero ? 0.6 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  {generatingHero ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Generando... {Math.round(heroProgress)}%</> : <>⚡ Generar Imagen <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', opacity: 0.7 }}>· {CREDIT_COSTS['grok-edit']}cr</span></>}
                </button>
              </div>
            )}
            {/* Expanded: full controls + sticky CTA */}
            {mobileSheetExpanded && (
              <>
                <div style={{ padding: '8px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {heroControlsContent(true)}
                </div>
                <div style={{ padding: '10px 20px', paddingBottom: 12, borderTop: '1px solid var(--border)', background: 'white', flexShrink: 0 }}>
                  <button onClick={handleHeroGenerate} disabled={generatingHero} style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none', padding: 14, borderRadius: 12, fontSize: '0.9rem', fontWeight: 600, cursor: generatingHero ? 'wait' : 'pointer', opacity: generatingHero ? 0.6 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                    {generatingHero ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Generando... {Math.round(heroProgress)}%</> : <>⚡ Generar Imagen <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', opacity: 0.7 }}>· {CREDIT_COSTS['grok-edit']}cr</span></>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Phase 2: Session */}
      {phase === 'session' && (
        <div className="flex lg:hidden flex-col" style={{ height: '100dvh', background: 'var(--bg-0)' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={() => setPhase('hero')} style={{ background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-2)' }}>← Hero</button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sesión de Fotos</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-3)' }}>{selectedCells.size}/{gridCells.filter(Boolean).length} ✓</span>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {gridCells.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
                {/* Vibes */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                  {PHOTO_SESSION_PRESETS.slice(0, 6).map(p => (
                    <button key={p.id} className="pill-btn" onClick={() => handleVibeToggle(p.id)} style={{ padding: '4px 10px', borderRadius: 16, fontSize: '0.7rem', cursor: 'pointer', border: `1px solid ${selectedVibes.has(p.id) ? 'var(--accent)' : 'var(--border)'}`, background: selectedVibes.has(p.id) ? 'var(--accent)' : 'white', color: selectedVibes.has(p.id) ? 'white' : 'var(--text-2)' }}>{p.icon} {p.label}</button>
                  ))}
                </div>
                {/* Photo count stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fotos</span>
                  <button onClick={() => setPhotoCount(p => Math.max(4, p - 3) as any)} style={{ width: 32, height: 32, borderRadius: 8, background: 'white', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{photoCount}</span>
                  <button onClick={() => setPhotoCount(p => Math.min(12, p + 3) as any)} style={{ width: 32, height: 32, borderRadius: 8, background: 'white', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
                {!generatingSession ? (
                  <button onClick={handleSessionGenerate} style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: 28, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>📸 Disparar {photoCount} Fotos <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', opacity: 0.7 }}>· {photoCount * CREDIT_COSTS['grok-edit']}cr</span></button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Revelando... {Math.round(sessionProgress)}%</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 8px 16px', width: '100%' }}>
                {Array.from({ length: photoCount }).map((_, idx) => {
                  const vibeLabel = cellVibeMap[idx] || 'Photo'
                  const vibePreset = PHOTO_SESSION_PRESETS.find(p => p.label === vibeLabel)
                  const isRecycled = vibePreset ? !selectedVibes.has(vibePreset.id) : false
                  return <GridCell key={idx} imageUrl={gridCells[idx] || null} vibeLabel={vibeLabel} isSelected={selectedCells.has(idx)} isRevealed={revealedCells.has(idx)} isRecycled={isRecycled} onClick={() => gridCells[idx] && setSelectedCells(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })} onExpand={() => setLightboxIdx(idx)} delay={idx * 150} aspectRatio={ASPECT_RATIO_CSS[sessionAspectRatio] || '3/4'} />
                })}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          {gridCells.length > 0 && (
            <div style={{ padding: '12px 16px', background: 'white', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={handleSessionGenerate} disabled={generatingSession} style={{ flex: 1, background: 'white', border: '1px solid var(--border)', padding: 12, borderRadius: 12, cursor: generatingSession ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: 'var(--text-2)', opacity: generatingSession ? 0.5 : 1 }}>↻ Regenerar</button>
              <button onClick={handleSaveSelected} disabled={selectedCells.size === 0} style={{ flex: 2, background: 'var(--accent)', color: 'white', border: 'none', padding: 12, borderRadius: 12, cursor: selectedCells.size === 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: selectedCells.size === 0 ? 0.5 : 1 }}>💾 Guardar {selectedCells.size > 0 ? selectedCells.size : ''}</button>
            </div>
          )}
        </div>
      )}

      {/* ═══════ OVERLAYS (shared) ═══════ */}

      {/* Lightbox */}
      {lightboxIdx !== null && gridCells[lightboxIdx] && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setLightboxIdx(null)}>
          <button onClick={() => setLightboxIdx(null)} style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>✕</button>
          {lightboxIdx > 0 && gridCells[lightboxIdx - 1] && <button onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1) }} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>◀</button>}
          {lightboxIdx < gridCells.length - 1 && gridCells[lightboxIdx + 1] && <button onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1) }} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>▶</button>}
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

      {/* Fullscreen preview */}
      {galleryFullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setGalleryFullscreen(null)}>
          <button onClick={() => setGalleryFullscreen(null)} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>✕</button>
          <img src={galleryFullscreen} style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </>
  )
}
