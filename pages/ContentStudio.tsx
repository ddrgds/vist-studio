import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react'
import type { Page } from '../App'
import { Camera, Film, Images, Sparkles, Upload, ChevronDown, Check, X, ImagePlus } from 'lucide-react'
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { useToast } from '../contexts/ToastContext'
import { generateInfluencerImage } from '../services/geminiService'
import {
  changeScene, changeOutfit, relight, faceSwap, realisticSkin,
  styleTransfer, upscale, generateAngles, aiEdit, grokEdit, uploadToFal,
  SCENE_PRESETS, RELIGHT_PRESETS, STYLE_PRESETS,
  ANGLE_PROMPTS, ANGLE_GROK_ENHANCE_PROMPTS,
  type ToolResult,
} from '../services/toolEngines'
import { ImageSize, AspectRatio, GeminiImageModel } from '../types'
import type { InfluencerParams, CharacterParams } from '../types'

// Lazy load sub-modes
const Director = lazy(() => import('./Director'))
const VideoStudio = lazy(() => import('./VideoStudio'))
const PhotoSession = lazy(() => import('./PhotoSession'))

// ─── Types ──────────────────────────────────────────────

type StudioMode = 'photo' | 'video' | 'session'
type Phase = 'create' | 'edit'

interface FilmstripItem {
  url: string
  label: string
  tool: string
}

type EditToolId = 'scene' | 'outfit' | 'relight' | 'face-swap' | 'realistic-skin' | 'style-transfer' | 'upscale' | 'angles' | 'ai-edit'
type CameraOption = 'portrait' | 'full-body' | 'close-up' | 'wide'
type AngleMode = 'face' | 'body' | 'expressions'
type AngleQuality = 'standard' | 'ultra'

const EDIT_TOOLS: { id: EditToolId; icon: string; label: string }[] = [
  { id: 'scene', icon: '\u{1F303}', label: 'Scene' },
  { id: 'outfit', icon: '\u{1F457}', label: 'Outfit' },
  { id: 'relight', icon: '\u{1F4A1}', label: 'Relight' },
  { id: 'face-swap', icon: '\u{1F504}', label: 'Face Swap' },
  { id: 'realistic-skin', icon: '\u{1F9F4}', label: 'Skin' },
  { id: 'style-transfer', icon: '\u{1F3A8}', label: 'Style' },
  { id: 'upscale', icon: '\u2B06\uFE0F', label: 'Upscale' },
  { id: 'angles', icon: '\u{1F4D0}', label: 'Angles' },
  { id: 'ai-edit', icon: '\u270F\uFE0F', label: 'AI Edit' },
]

const CAMERA_OPTIONS: { id: CameraOption; label: string; prompt: string }[] = [
  { id: 'portrait', label: 'Portrait', prompt: 'upper body portrait shot, waist up' },
  { id: 'full-body', label: 'Full Body', prompt: 'full body shot from head to toes' },
  { id: 'close-up', label: 'Close-up', prompt: 'close-up face shot, head and shoulders' },
  { id: 'wide', label: 'Wide', prompt: 'wide angle environmental shot showing full surroundings' },
]

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: AspectRatio.Square, label: '1:1' },
  { value: AspectRatio.Portrait, label: '3:4' },
  { value: AspectRatio.Landscape, label: '4:3' },
  { value: AspectRatio.Tall, label: '9:16' },
  { value: AspectRatio.Wide, label: '16:9' },
]

// ─── Shared UI Components ───────────────────────────────

const panelStyle: React.CSSProperties = {
  background: 'rgba(14,12,20,.85)',
  backdropFilter: 'blur(24px)',
  borderRight: '1px solid rgba(255,255,255,.04)',
}

const cardBg: React.CSSProperties = {
  background: 'rgba(255,255,255,.02)',
  border: '1px solid rgba(255,255,255,.06)',
  backdropFilter: 'blur(8px)',
}

const selectedCardBg: React.CSSProperties = {
  background: 'rgba(255,107,157,.10)',
  border: '1px solid rgba(255,107,157,.25)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 0 16px rgba(255,107,157,.08)',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.08)',
  color: 'var(--joi-text-1)',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  outline: 'none',
  width: '100%',
  transition: 'border-color .15s',
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-medium uppercase tracking-wider block mb-2"
    style={{ color: 'var(--joi-text-3)', letterSpacing: '0.08em' }}>
    {children}
  </label>
)

const PresetGrid: React.FC<{
  presets: readonly { id: string; label: string; prompt: string }[]
  selected: string | null
  onSelect: (id: string, prompt: string) => void
}> = ({ presets, selected, onSelect }) => (
  <div className="grid grid-cols-2 gap-1.5">
    {presets.map(p => (
      <button key={p.id} onClick={() => onSelect(p.id, p.prompt)}
        className="px-2.5 py-2 rounded-lg text-[11px] font-medium text-left transition-all"
        style={selected === p.id ? selectedCardBg : cardBg}>
        <span style={{ color: selected === p.id ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{p.label}</span>
      </button>
    ))}
  </div>
)

const BigButton: React.FC<{
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}> = ({ onClick, disabled, loading, children }) => (
  <button onClick={onClick} disabled={disabled || loading}
    className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
    style={{
      background: disabled ? 'rgba(255,255,255,.04)' : 'linear-gradient(135deg, rgba(255,107,157,.85), rgba(200,80,200,.7))',
      color: disabled ? 'var(--joi-text-3)' : '#fff',
      border: disabled ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(255,107,157,.3)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1,
      boxShadow: disabled ? 'none' : '0 4px 24px rgba(255,107,157,.15)',
    }}>
    {loading ? (
      <>
        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Generating...
      </>
    ) : children}
  </button>
)

// ─── Character Selector Dropdown ────────────────────────

const CharacterSelector: React.FC<{
  characters: SavedCharacter[]
  selectedId: string | null
  onSelect: (id: string) => void
}> = ({ characters, selectedId, onSelect }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = characters.find(c => c.id === selectedId)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (characters.length === 0) {
    return (
      <div className="px-3 py-2.5 rounded-lg text-[12px]" style={{ ...cardBg, color: 'var(--joi-text-3)' }}>
        No characters yet. Create one first.
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all"
        style={{ ...cardBg, color: 'var(--joi-text-1)' }}>
        {selected ? (
          <>
            <img src={selected.thumbnail} alt="" className="w-7 h-7 rounded-full object-cover"
              style={{ border: '1.5px solid rgba(255,107,157,.3)' }} />
            <span className="text-[12px] font-medium flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-[12px] flex-1" style={{ color: 'var(--joi-text-3)' }}>Select character...</span>
        )}
        <ChevronDown size={13} style={{ color: 'var(--joi-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 max-h-[240px] overflow-y-auto"
          style={{ background: 'rgba(14,12,20,.97)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(24px)', boxShadow: '0 12px 40px rgba(0,0,0,.5)' }}>
          {characters.map(c => (
            <button key={c.id} onClick={() => { onSelect(c.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/[.04]"
              style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
              <img src={c.thumbnail} alt="" className="w-7 h-7 rounded-full object-cover"
                style={{ border: selectedId === c.id ? '1.5px solid var(--joi-pink)' : '1.5px solid rgba(255,255,255,.1)' }} />
              <span className="text-[12px] font-medium flex-1 truncate"
                style={{ color: selectedId === c.id ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>
                {c.name}
              </span>
              {selectedId === c.id && <Check size={13} style={{ color: 'var(--joi-pink)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Filmstrip ──────────────────────────────────────────

const Filmstrip: React.FC<{
  items: FilmstripItem[]
  activeIndex: number
  onSelect: (index: number) => void
}> = ({ items, activeIndex, onSelect }) => {
  if (items.length === 0) return null
  return (
    <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 overflow-x-auto"
      style={{ borderTop: '1px solid rgba(255,255,255,.04)', background: 'rgba(14,12,20,.6)' }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>{'\u2192'}</span>}
          <button onClick={() => onSelect(i)}
            className="shrink-0 flex flex-col items-center gap-1 transition-all group"
            style={{ opacity: activeIndex === i ? 1 : 0.55 }}>
            <div className="w-12 h-12 rounded-lg overflow-hidden"
              style={{
                border: activeIndex === i ? '2px solid var(--joi-pink)' : '2px solid rgba(255,255,255,.08)',
                boxShadow: activeIndex === i ? '0 0 12px rgba(255,107,157,.2)' : 'none',
              }}>
              <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
            </div>
            <span className="text-[9px] font-medium"
              style={{ color: activeIndex === i ? 'var(--joi-pink)' : 'var(--joi-text-3)' }}>
              {item.label}
            </span>
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// PHASE 1 — CREATE PANEL
// ═════════════════════════════════════════════════════════

const CreatePanel: React.FC<{
  characters: SavedCharacter[]
  selectedCharId: string | null
  onSelectChar: (id: string) => void
  onGenerate: (params: {
    scene: string
    outfit: string
    pose: string
    camera: CameraOption
    lighting: string
    aspectRatio: AspectRatio
  }) => void
  generating: boolean
}> = ({ characters, selectedCharId, onSelectChar, onGenerate, generating }) => {
  const [scenePreset, setScenePreset] = useState<string | null>(null)
  const [sceneCustom, setSceneCustom] = useState('')
  const [outfit, setOutfit] = useState('')
  const [pose, setPose] = useState('')
  const [camera, setCamera] = useState<CameraOption>('portrait')
  const [lightPreset, setLightPreset] = useState<string | null>('studio')
  const [lightCustom, setLightCustom] = useState('professional studio lighting with softbox, clean even illumination, subtle shadows')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Portrait)

  const scenePrompt = sceneCustom || SCENE_PRESETS.find(s => s.id === scenePreset)?.prompt || ''
  const lightingPrompt = lightCustom || RELIGHT_PRESETS.find(l => l.id === lightPreset)?.prompt || ''

  const handleSceneSelect = (id: string, prompt: string) => {
    setScenePreset(id)
    setSceneCustom('')
  }

  const handleLightSelect = (id: string, prompt: string) => {
    setLightPreset(id)
    setLightCustom(prompt)
  }

  const canGenerate = !!selectedCharId && (!!scenePrompt || !!outfit || !!pose)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
        {/* Character */}
        <div>
          <Label>Character</Label>
          <CharacterSelector characters={characters} selectedId={selectedCharId} onSelect={onSelectChar} />
        </div>

        {/* Scene */}
        <div>
          <Label>Scene</Label>
          <PresetGrid presets={SCENE_PRESETS} selected={scenePreset} onSelect={handleSceneSelect} />
          <input type="text" placeholder="Or describe a custom scene..."
            value={sceneCustom}
            onChange={e => { setSceneCustom(e.target.value); if (e.target.value) setScenePreset(null) }}
            className="mt-2"
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,107,157,.35)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
          />
        </div>

        {/* Outfit */}
        <div>
          <Label>Outfit</Label>
          <input type="text" placeholder="e.g. elegant black evening dress, red sneakers..."
            value={outfit} onChange={e => setOutfit(e.target.value)}
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,107,157,.35)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
          />
        </div>

        {/* Pose */}
        <div>
          <Label>Pose</Label>
          <input type="text" placeholder="e.g. sitting on a chair, arms crossed, walking..."
            value={pose} onChange={e => setPose(e.target.value)}
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,107,157,.35)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
          />
        </div>

        {/* Camera */}
        <div>
          <Label>Camera</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {CAMERA_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setCamera(opt.id)}
                className="px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all"
                style={camera === opt.id ? selectedCardBg : cardBg}>
                <span style={{ color: camera === opt.id ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lighting */}
        <div>
          <Label>Lighting</Label>
          <PresetGrid presets={RELIGHT_PRESETS} selected={lightPreset} onSelect={handleLightSelect} />
        </div>

        {/* Aspect Ratio */}
        <div>
          <Label>Format</Label>
          <div className="flex gap-1.5">
            {ASPECT_RATIOS.map(ar => (
              <button key={ar.value} onClick={() => setAspectRatio(ar.value)}
                className="flex-1 px-2 py-2 rounded-lg text-[11px] font-mono font-medium transition-all text-center"
                style={aspectRatio === ar.value ? selectedCardBg : cardBg}>
                <span style={{ color: aspectRatio === ar.value ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{ar.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="shrink-0 px-4 py-3 pb-20 lg:pb-3" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
        <BigButton onClick={() => onGenerate({ scene: scenePrompt, outfit, pose, camera, lighting: lightingPrompt, aspectRatio })}
          disabled={!canGenerate} loading={generating}>
          <Sparkles size={15} />
          Generate Scene
        </BigButton>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// PHASE 2 — EDIT PANEL
// ═════════════════════════════════════════════════════════

const EditPanel: React.FC<{
  activeTool: EditToolId | null
  onSelectTool: (tool: EditToolId) => void
  onApply: (tool: EditToolId, input: string, extra?: any) => void
  generating: boolean
}> = ({ activeTool, onSelectTool, onApply, generating }) => {
  const [toolInput, setToolInput] = useState('')
  const [presetId, setPresetId] = useState<string | null>(null)
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [angleMode, setAngleMode] = useState<AngleMode>('face')
  const [angleQuality, setAngleQuality] = useState<AngleQuality>('standard')
  const faceInputRef = useRef<HTMLInputElement>(null)

  // Reset input when switching tools
  useEffect(() => {
    setToolInput('')
    setPresetId(null)
    setFaceFile(null)
  }, [activeTool])

  const handlePresetSelect = (id: string, prompt: string) => {
    setPresetId(id)
    setToolInput(prompt)
  }

  const handleApply = () => {
    if (!activeTool) return
    if (activeTool === 'face-swap') {
      onApply(activeTool, '', { faceFile })
    } else if (activeTool === 'angles') {
      onApply(activeTool, '', { angleMode, angleQuality })
    } else {
      onApply(activeTool, toolInput)
    }
  }

  const renderToolInput = () => {
    if (!activeTool) return (
      <div className="flex items-center justify-center h-24 text-[11px]" style={{ color: 'var(--joi-text-3)' }}>
        Select a tool to begin editing
      </div>
    )

    switch (activeTool) {
      case 'scene':
        return (
          <div className="space-y-2">
            <PresetGrid presets={SCENE_PRESETS} selected={presetId} onSelect={handlePresetSelect} />
            <input type="text" placeholder="Or describe a custom scene..."
              value={presetId ? '' : toolInput}
              onChange={e => { setToolInput(e.target.value); setPresetId(null) }}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,107,157,.35)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
            />
          </div>
        )

      case 'relight':
        return (
          <div className="space-y-2">
            <PresetGrid presets={RELIGHT_PRESETS} selected={presetId} onSelect={handlePresetSelect} />
            <input type="text" placeholder="Or describe custom lighting..."
              value={presetId ? '' : toolInput}
              onChange={e => { setToolInput(e.target.value); setPresetId(null) }}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,107,157,.35)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
            />
          </div>
        )

      case 'style-transfer':
        return (
          <div className="space-y-2">
            <PresetGrid presets={STYLE_PRESETS} selected={presetId} onSelect={handlePresetSelect} />
            <input type="text" placeholder="Or describe a custom style..."
              value={presetId ? '' : toolInput}
              onChange={e => { setToolInput(e.target.value); setPresetId(null) }}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,107,157,.35)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
            />
          </div>
        )

      case 'outfit':
      case 'ai-edit':
        return (
          <div className="space-y-2">
            <input type="text"
              placeholder={activeTool === 'outfit' ? 'Describe the outfit...' : 'Describe the edit...'}
              value={toolInput} onChange={e => setToolInput(e.target.value)}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,107,157,.35)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
              onKeyDown={e => { if (e.key === 'Enter' && toolInput.trim()) handleApply() }}
            />
          </div>
        )

      case 'face-swap':
        return (
          <div className="space-y-2">
            <input type="file" accept="image/*" ref={faceInputRef} className="hidden"
              onChange={e => { if (e.target.files?.[0]) setFaceFile(e.target.files[0]) }} />
            <button onClick={() => faceInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-[12px] font-medium transition-all"
              style={cardBg}>
              <Upload size={14} style={{ color: 'var(--joi-pink)' }} />
              <span style={{ color: faceFile ? 'var(--joi-text-1)' : 'var(--joi-text-3)' }}>
                {faceFile ? faceFile.name : 'Upload source face image'}
              </span>
            </button>
            {faceFile && (
              <div className="flex items-center gap-2">
                <img src={URL.createObjectURL(faceFile)} alt="face" className="w-10 h-10 rounded-lg object-cover" />
                <button onClick={() => setFaceFile(null)}
                  className="p-1 rounded-md hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--joi-text-3)' }}>
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )

      case 'realistic-skin':
      case 'upscale':
        return (
          <div className="text-[11px] py-2" style={{ color: 'var(--joi-text-3)' }}>
            {activeTool === 'realistic-skin'
              ? 'Adds natural skin texture, pores, and subtle imperfections for a more photorealistic result.'
              : 'Increases image resolution by 2x using AI upscaling.'}
          </div>
        )

      case 'angles':
        return (
          <div className="space-y-3">
            <div>
              <Label>Mode</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['face', 'body', 'expressions'] as AngleMode[]).map(m => (
                  <button key={m} onClick={() => setAngleMode(m)}
                    className="px-2 py-2 rounded-lg text-[11px] font-medium capitalize transition-all text-center"
                    style={angleMode === m ? selectedCardBg : cardBg}>
                    <span style={{ color: angleMode === m ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{m}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Quality</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['standard', 'ultra'] as AngleQuality[]).map(q => (
                  <button key={q} onClick={() => setAngleQuality(q)}
                    className="px-2 py-2 rounded-lg text-[11px] font-medium capitalize transition-all text-center"
                    style={angleQuality === q ? selectedCardBg : cardBg}>
                    <span style={{ color: angleQuality === q ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canApply = () => {
    if (!activeTool || generating) return false
    switch (activeTool) {
      case 'scene': return !!(toolInput.trim() || presetId)
      case 'relight': return !!(presetId || toolInput.trim())
      case 'style-transfer': return !!(presetId || toolInput.trim())
      case 'outfit': return !!toolInput.trim()
      case 'ai-edit': return !!toolInput.trim()
      case 'face-swap': return !!faceFile
      case 'realistic-skin':
      case 'upscale':
      case 'angles':
        return true
      default: return false
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tool Grid */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <Label>Tools</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {EDIT_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => onSelectTool(tool.id)}
              className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-center transition-all"
              style={activeTool === tool.id ? selectedCardBg : cardBg}>
              <span className="text-base">{tool.icon}</span>
              <span className="text-[10px] font-medium"
                style={{ color: activeTool === tool.id ? 'var(--joi-pink)' : 'var(--joi-text-2)' }}>
                {tool.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool-specific Input */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
        {activeTool && (
          <div className="mb-2">
            <Label>{EDIT_TOOLS.find(t => t.id === activeTool)?.label}</Label>
          </div>
        )}
        {renderToolInput()}
      </div>

      {/* Apply Button */}
      {activeTool && (
        <div className="shrink-0 px-4 py-3 pb-20 lg:pb-3" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
          <BigButton onClick={handleApply} disabled={!canApply()} loading={generating}>
            Apply {EDIT_TOOLS.find(t => t.id === activeTool)?.label}
          </BigButton>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// MAIN CONTENT STUDIO
// ═════════════════════════════════════════════════════════

const MODES: { id: StudioMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'photo', label: 'Photo', icon: <Camera size={15} />, desc: 'Generate photos & scenes' },
  { id: 'session', label: 'Batch Shoot', icon: <Images size={15} />, desc: 'Multi-vibe photo session' },
  { id: 'video', label: 'Video & Reels', icon: <Film size={15} />, desc: 'Motion control \u00B7 Lip sync \u00B7 Animate' },
]

export default function ContentStudio({ onNav, onEditImage, onExportImage }: {
  onNav: (p: Page) => void
  onEditImage?: (url: string) => void
  onExportImage?: (url: string) => void
}) {
  const [mode, setMode] = useState<StudioMode>('photo')

  // ── Phase state ──
  const [phase, setPhase] = useState<Phase>('create')
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [filmstrip, setFilmstrip] = useState<FilmstripItem[]>([])
  const [filmstripIndex, setFilmstripIndex] = useState(0)
  const [activeTool, setActiveTool] = useState<EditToolId | null>(null)
  const [generating, setGenerating] = useState(false)

  // "Bring Your Own" upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Stores
  const characters = useCharacterStore(s => s.characters)
  const addGalleryItems = useGalleryStore(s => s.addItems)
  const toast = useToast()

  // Handle uploaded photo for "bring your own" flow
  const handleBYOUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setUploadedImageUrl(url)
      setCurrentImageUrl(url)
      setFilmstrip([{ url, label: 'Upload', tool: 'upload' }])
      setFilmstripIndex(0)
      setPhase('edit')
    }
    reader.readAsDataURL(file)
    if (e.target) e.target.value = ''
  }, [])

  // ── Phase transitions ──
  useEffect(() => {
    if (currentImageUrl) {
      setPhase('edit')
    }
  }, [currentImageUrl])

  // When character changes, reset everything
  const handleSelectChar = useCallback((id: string) => {
    if (id !== selectedCharId) {
      setSelectedCharId(id)
      setCurrentImageUrl(null)
      setFilmstrip([])
      setFilmstripIndex(0)
      setActiveTool(null)
      setPhase('create')
    }
  }, [selectedCharId])

  // ── Filmstrip navigation ──
  const handleFilmstripSelect = useCallback((index: number) => {
    setFilmstripIndex(index)
    setCurrentImageUrl(filmstrip[index]?.url ?? null)
  }, [filmstrip])

  // ── Helper: get character blobs as File[] ──
  const getCharacterFiles = useCallback((): File[] => {
    const char = characters.find(c => c.id === selectedCharId)
    if (!char || !char.modelImageBlobs?.length) return []
    return char.modelImageBlobs.map((blob, i) =>
      new File([blob], `model-${i}.jpg`, { type: 'image/jpeg' })
    )
  }, [characters, selectedCharId])

  // ═══════════════════════════════════════════════
  // PHASE 1: Generate Scene
  // ═══════════════════════════════════════════════

  const handleGenerate = useCallback(async (params: {
    scene: string; outfit: string; pose: string; camera: CameraOption; lighting: string; aspectRatio: AspectRatio
  }) => {
    const char = characters.find(c => c.id === selectedCharId)
    if (!char) { toast.error('Select a character first'); return }

    setGenerating(true)

    const modelFiles = getCharacterFiles()
    const cameraPrompt = CAMERA_OPTIONS.find(c => c.id === params.camera)?.prompt ?? ''

    // Build prompt
    const promptParts = [
      'A photorealistic high-quality photo of a person.',
      params.scene && `Scene: ${params.scene}.`,
      params.outfit && `Wearing: ${params.outfit}.`,
      params.pose && `Pose: ${params.pose}.`,
      cameraPrompt && `Shot type: ${cameraPrompt}.`,
      params.lighting && `Lighting: ${params.lighting}.`,
      char.characteristics && `Person description: ${char.characteristics}.`,
    ].filter(Boolean).join(' ')

    // Build InfluencerParams
    const inflParams: InfluencerParams = {
      characters: [{
        id: char.id,
        modelImages: modelFiles,
        outfitDescription: params.outfit || char.outfitDescription || undefined,
        characteristics: char.characteristics || undefined,
        pose: params.pose || undefined,
        accessory: char.accessory || undefined,
      }],
      scenario: [params.scene, cameraPrompt, params.pose].filter(Boolean).join('. '),
      lighting: params.lighting,
      camera: cameraPrompt,
      imageSize: ImageSize.Size2K,
      aspectRatio: params.aspectRatio,
      numberOfImages: 1,
      model: GeminiImageModel.Flash2, // NB2 first
    }

    try {
      // Step 1: Try Gemini NB2
      const urls = await generateInfluencerImage(inflParams, undefined, undefined)
      if (urls && urls.length > 0 && urls[0]) {
        const imageUrl = urls[0]
        setCurrentImageUrl(imageUrl)
        setFilmstrip([{ url: imageUrl, label: 'Original', tool: 'generate' }])
        setFilmstripIndex(0)
        toast.success('Scene generated successfully')
        setGenerating(false)
        return
      }
      throw new Error('No image returned')
    } catch (err: any) {
      console.warn('Gemini NB2 failed, falling back to Grok...', err?.message)
      toast.info('Gemini blocked this prompt. Trying Grok...')

      // Step 2: Fallback to Grok via changeScene with a placeholder
      // We need an existing image to edit — for the fallback, generate text-to-image via Grok
      try {
        // Upload character reference to fal for Grok
        if (modelFiles.length === 0) {
          throw new Error('No character reference images available')
        }
        const refUrl = await uploadToFal(modelFiles[0])
        const result = await changeScene(refUrl, promptParts)
        if (result.url) {
          setCurrentImageUrl(result.url)
          setFilmstrip([{ url: result.url, label: 'Original', tool: 'generate' }])
          setFilmstripIndex(0)
          toast.success('Generated with Grok (fallback)')
        } else {
          throw new Error('Grok returned no image')
        }
      } catch (fallbackErr: any) {
        console.error('Grok fallback also failed:', fallbackErr)
        toast.error(`Generation failed: ${fallbackErr?.message || 'Unknown error'}`)
      }
    } finally {
      setGenerating(false)
    }
  }, [characters, selectedCharId, getCharacterFiles, toast])

  // ═══════════════════════════════════════════════
  // PHASE 2: Apply Edit Tool
  // ═══════════════════════════════════════════════

  const handleApplyTool = useCallback(async (tool: EditToolId, input: string, extra?: any) => {
    if (!currentImageUrl) return
    setGenerating(true)

    try {
      let result: ToolResult | null = null
      let label = EDIT_TOOLS.find(t => t.id === tool)?.label ?? tool

      switch (tool) {
        case 'scene':
          result = await changeScene(currentImageUrl, input)
          break
        case 'outfit':
          result = await changeOutfit(currentImageUrl, input)
          break
        case 'relight':
          result = await relight(currentImageUrl, input)
          break
        case 'face-swap': {
          if (!extra?.faceFile) { toast.error('Upload a face image first'); setGenerating(false); return }
          const faceUrl = await uploadToFal(extra.faceFile)
          result = await faceSwap(currentImageUrl, faceUrl)
          break
        }
        case 'realistic-skin':
          result = await realisticSkin(currentImageUrl)
          break
        case 'style-transfer':
          result = await styleTransfer(currentImageUrl, input)
          break
        case 'upscale':
          result = await upscale(currentImageUrl)
          break
        case 'angles': {
          const aMode: AngleMode = extra?.angleMode ?? 'face'
          const aQuality: AngleQuality = extra?.angleQuality ?? 'standard'
          label = `Angles (${aMode})`

          // For angles, we need to call Gemini with the angle prompt + character reference
          const modelFiles = getCharacterFiles()
          const anglePrompt = ANGLE_PROMPTS[aMode]

          const inflParams: InfluencerParams = {
            characters: [{
              id: selectedCharId || 'temp',
              modelImages: modelFiles,
            }],
            scenario: anglePrompt,
            lighting: 'clean professional studio lighting',
            imageSize: ImageSize.Size2K,
            aspectRatio: AspectRatio.Square,
            numberOfImages: 1,
            model: GeminiImageModel.Flash2,
          }

          try {
            const urls = await generateInfluencerImage(inflParams)
            if (urls?.[0]) {
              let finalUrl = urls[0]
              // If ultra quality, enhance with Grok
              if (aQuality === 'ultra' && ANGLE_GROK_ENHANCE_PROMPTS[aMode as keyof typeof ANGLE_GROK_ENHANCE_PROMPTS]) {
                const enhancePrompt = ANGLE_GROK_ENHANCE_PROMPTS[aMode as keyof typeof ANGLE_GROK_ENHANCE_PROMPTS]
                const enhancedUrl = await grokEdit(finalUrl, enhancePrompt)
                if (enhancedUrl) finalUrl = enhancedUrl
              }
              result = { url: finalUrl, engine: aQuality === 'ultra' ? 'nb2+grok' : 'nb2' }
            } else {
              throw new Error('No angle sheet generated')
            }
          } catch (angleErr) {
            console.error('Angle generation failed:', angleErr)
            toast.error('Angle generation failed')
            setGenerating(false)
            return
          }
          break
        }
        case 'ai-edit': {
          // Free prompt edit — sends user's exact intent to Grok
          result = await aiEdit(currentImageUrl, input)
          label = 'AI Edit'
          break
        }
      }

      if (result?.url) {
        setCurrentImageUrl(result.url)
        const newFilmstrip = [...filmstrip.slice(0, filmstripIndex + 1), { url: result.url, label, tool }]
        setFilmstrip(newFilmstrip)
        setFilmstripIndex(newFilmstrip.length - 1)
        toast.success(`${label} applied`)
      } else {
        toast.error('Tool returned no result')
      }
    } catch (err: any) {
      console.error(`Tool ${tool} failed:`, err)
      toast.error(`${tool} failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }, [currentImageUrl, filmstrip, filmstripIndex, getCharacterFiles, selectedCharId, toast])

  // ── Save to Gallery ──
  const handleSaveToGallery = useCallback(() => {
    if (!currentImageUrl) return
    const item: GalleryItem = {
      id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: currentImageUrl,
      prompt: filmstrip.map(f => f.label).join(' > '),
      model: 'content-studio',
      timestamp: Date.now(),
      type: 'create',
      characterId: selectedCharId || undefined,
    }
    addGalleryItems([item])
    toast.success('Saved to Gallery')
  }, [currentImageUrl, filmstrip, selectedCharId, addGalleryItems, toast])

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* Hidden upload input for "bring your own" flow */}
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleBYOUpload} />

      {/* Mode switcher bar */}
      <div className="shrink-0 flex items-center gap-2 px-5 py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,.03)', background: 'var(--joi-bg-1)' }}>
        <span className="text-xs font-semibold mr-2" style={{ color: 'var(--joi-text-3)' }}>MODE</span>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,.02)' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all"
              style={{
                background: mode === m.id ? 'rgba(255,107,157,.10)' : 'transparent',
                color: mode === m.id ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                border: mode === m.id ? '1px solid rgba(255,107,157,.18)' : '1px solid transparent',
              }}>
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] ml-2" style={{ color: 'var(--joi-text-3)' }}>
          {MODES.find(m => m.id === mode)?.desc}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--joi-text-3)' }}>
            Loading...
          </div>
        }>
          {mode === 'photo' && (
            phase === 'create' ? (
              /* PHASE 1: Director — full screen, all its features */
              <div className="flex flex-col h-full">
                {/* "Bring your own" upload banner */}
                {!selectedCharId && characters.length === 0 && (
                  <div className="shrink-0 mx-5 mt-4 mb-2 p-4 rounded-xl flex items-center gap-4"
                    style={{
                      background: 'rgba(167,139,250,0.05)',
                      border: '1px dashed rgba(167,139,250,0.3)',
                    }}>
                    <ImagePlus size={22} style={{ color: '#A78BFA', opacity: 0.7, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium" style={{ color: 'var(--joi-text-1)' }}>
                        No character? No problem.
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--joi-text-3)' }}>
                        Upload a photo and start editing directly with AI tools.
                      </p>
                    </div>
                    <label className="shrink-0 cursor-pointer px-4 py-2 rounded-lg text-[12px] font-semibold transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
                        color: 'white',
                        boxShadow: '0 4px 16px rgba(255,107,157,.2)',
                      }}>
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleBYOUpload} />
                    </label>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <Director
                    onNav={onNav}
                    onEditImage={(url: string) => {
                      // Capture the generated image and transition to edit phase
                      setCurrentImageUrl(url)
                      setFilmstrip([{ url, label: 'Original', tool: 'generate' }])
                      setFilmstripIndex(0)
                      setPhase('edit')
                    }}
                    onExportImage={onExportImage}
                  />
                </div>
              </div>
            ) : (
            /* PHASE 2: Edit tools + image viewer */
            <div className="flex flex-col h-full">
              <div className="flex flex-1 overflow-hidden">
                {/* LEFT PANEL — Edit Tools */}
                <div className="shrink-0 w-[320px] flex flex-col overflow-hidden" style={panelStyle}>
                  <EditPanel
                    activeTool={activeTool}
                    onSelectTool={setActiveTool}
                    onApply={handleApplyTool}
                    generating={generating}
                  />
                </div>

                {/* RIGHT PANEL — Image Viewer */}
                <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--joi-bg-0)' }}>
                  <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
                    {currentImageUrl && (
                      <div className="relative max-w-full max-h-full flex items-center justify-center">
                        <img
                          src={currentImageUrl}
                          alt="Generated"
                          className="max-w-full max-h-full object-contain rounded-xl"
                          style={{
                            boxShadow: '0 8px 40px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04)',
                          }}
                        />
                        {generating && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                            style={{ background: 'rgba(8,7,12,.6)', backdropFilter: 'blur(4px)' }}>
                            <div className="flex flex-col items-center gap-3">
                              <span className="inline-block w-8 h-8 border-2 border-white/20 border-t-[var(--joi-pink)] rounded-full animate-spin" />
                              <span className="text-xs font-medium" style={{ color: 'var(--joi-text-2)' }}>Processing...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  {currentImageUrl && !generating && (
                    <div className="shrink-0 flex items-center justify-center gap-3 px-5 py-3"
                      style={{ borderTop: '1px solid rgba(255,255,255,.04)', background: 'rgba(14,12,20,.5)' }}>
                      <button onClick={handleSaveToGallery}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all hover:bg-white/[.06]"
                        style={cardBg}>
                        <span style={{ color: 'var(--joi-text-2)' }}>Save to Gallery</span>
                      </button>
                      {onExportImage && (
                        <button onClick={() => onExportImage(currentImageUrl)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all hover:bg-white/[.06]"
                          style={cardBg}>
                          <span style={{ color: 'var(--joi-text-2)' }}>Export</span>
                        </button>
                      )}
                      {onEditImage && (
                        <button onClick={() => onEditImage(currentImageUrl)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all hover:bg-white/[.06]"
                          style={cardBg}>
                          <span style={{ color: 'var(--joi-text-2)' }}>Open in Editor</span>
                        </button>
                      )}
                      <button onClick={() => { setPhase('create'); setCurrentImageUrl(null); setFilmstrip([]); setFilmstripIndex(0); setActiveTool(null) }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all hover:bg-white/[.06]"
                        style={cardBg}>
                        <span style={{ color: 'var(--joi-text-3)' }}>New Scene</span>
                      </button>
                    </div>
                  )}

                  {/* Filmstrip */}
                  <Filmstrip items={filmstrip} activeIndex={filmstripIndex} onSelect={handleFilmstripSelect} />
                </div>
              </div>
            </div>
            )
          )}
          {mode === 'session' && <PhotoSession onNav={onNav} />}
          {mode === 'video' && <VideoStudio onNav={onNav} />}
        </Suspense>
      </div>
    </div>
  )
}
