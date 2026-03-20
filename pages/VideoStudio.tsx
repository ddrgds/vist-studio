import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { useProfile } from '../contexts/ProfileContext'
import { useToast } from '../contexts/ToastContext'
import {
  VideoEngine, VideoMode, VIDEO_ENGINE_LABELS, CREDIT_COSTS,
  type VideoParams, type LipSyncParams, type SavedCharacter,
} from '../types'
import {
  generateImageToVideo, generateMotionControl, generateLipSync,
  type VideoProgress,
} from '../services/falVideoService'
import {
  generateSpeech, listVoices, playVoicePreview,
  type ElevenLabsVoice,
} from '../services/elevenLabsService'
import type { Page } from '../App'
import { Film, Clapperboard, Mic, Upload, Play, Square, ChevronDown, Sparkles, X, Volume2 } from 'lucide-react'

// ─── Mode tabs ──────────────────────────────────────────
const MODES: { id: VideoMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'motion-control', label: 'Movimiento', icon: <Clapperboard size={16} />, desc: 'Sube un video viral, tu personaje lo recrea' },
  { id: 'lip-sync', label: 'Lip Sync', icon: <Mic size={16} />, desc: 'Haz que tu personaje hable con cualquier voz' },
  { id: 'image-to-video', label: 'Imagen a Video', icon: <Film size={16} />, desc: 'Anima a tu personaje con un prompt' },
]

// ─── Engine selector per mode ──────────────────────────
function getEnginesForMode(mode: VideoMode): VideoEngine[] {
  const entries = Object.entries(VIDEO_ENGINE_LABELS) as [VideoEngine, typeof VIDEO_ENGINE_LABELS[VideoEngine]][]
  return entries.filter(([, meta]) => meta.mode === mode).map(([engine]) => engine)
}

// ─── Main Component ─────────────────────────────────────
export default function VideoStudio({ onNav }: { onNav: (p: Page) => void }) {
  // ── State ──
  const [mode, setMode] = useState<VideoMode>('motion-control')
  const [selectedEngine, setSelectedEngine] = useState<VideoEngine>(VideoEngine.Kling3MotionPro)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState<'5' | '10'>('5')
  const [characterOrientation, setCharacterOrientation] = useState<'video' | 'image'>('video')

  // Character
  const characters = useCharacterStore(s => s.characters)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const selectedChar = characters.find(c => c.id === selectedCharId) ?? null

  // File uploads
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null)
  const [referenceVideoPreview, setReferenceVideoPreview] = useState<string | null>(null)
  const [endImage, setEndImage] = useState<File | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const endImageRef = useRef<HTMLInputElement>(null)

  // Lip sync
  const [ttsText, setTtsText] = useState('')
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [generatingTTS, setGeneratingTTS] = useState(false)
  const audioInputRef = useRef<HTMLInputElement>(null)

  // Generation
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<VideoProgress | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { profile, decrementCredits, restoreCredits } = useProfile()
  const addGalleryItems = useGalleryStore(s => s.addItems)
  const toast = useToast()

  // ── Load voices on mount ──
  useEffect(() => {
    listVoices({ category: 'premade' }).then(setVoices).catch(() => {})
  }, [])

  // ── Update engine when mode changes ──
  useEffect(() => {
    const engines = getEnginesForMode(mode)
    if (engines.length > 0 && !engines.includes(selectedEngine)) {
      setSelectedEngine(engines[0])
    }
  }, [mode])

  // ── Auto-select first character ──
  useEffect(() => {
    if (!selectedCharId && characters.length > 0) {
      setSelectedCharId(characters[0].id)
    }
  }, [characters, selectedCharId])

  // ── Cleanup previews ──
  useEffect(() => {
    return () => {
      if (referenceVideoPreview) URL.revokeObjectURL(referenceVideoPreview)
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
    }
  }, [referenceVideoPreview, audioPreviewUrl])

  // ── Handlers ──
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (referenceVideoPreview) URL.revokeObjectURL(referenceVideoPreview)
    setReferenceVideo(file)
    setReferenceVideoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
    setAudioFile(file)
    setAudioPreviewUrl(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleGenerateTTS = async () => {
    if (!ttsText.trim() || !selectedVoiceId) return
    setGeneratingTTS(true)
    try {
      const result = await generateSpeech({ text: ttsText, voiceId: selectedVoiceId })
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
      setAudioFile(result.file)
      setAudioPreviewUrl(result.url)
      toast.success('Voz generada')
    } catch (err: any) {
      toast.error(err.message || 'Error en TTS')
    } finally {
      setGeneratingTTS(false)
    }
  }

  const creditCost = CREDIT_COSTS[selectedEngine] ?? 80

  const canGenerate = useCallback(() => {
    if (!selectedChar) return false
    if (generating) return false
    if (mode === 'motion-control' && !referenceVideo) return false
    if (mode === 'lip-sync' && !audioFile) return false
    return true
  }, [selectedChar, generating, mode, referenceVideo, audioFile])

  const handleGenerate = async () => {
    if (!canGenerate() || !selectedChar) return

    // Pre-deduct credits atomically
    const ok = await decrementCredits(creditCost)
    if (!ok) {
      toast.error(`Créditos insuficientes. Necesitas ${creditCost} créditos.`)
      return
    }

    setGenerating(true)
    setProgress(null)
    setResultUrl(null)
    setError(null)

    try {
      // Build character image File from stored blob
      const charBlob = selectedChar.modelImageBlobs[0]
      const charFile = new File([charBlob], 'character.png', { type: 'image/png' })

      let result: { videoUrl: string; duration?: number }

      if (mode === 'image-to-video') {
        result = await generateImageToVideo({
          mode,
          baseImage: charFile,
          prompt,
          engine: selectedEngine,
          duration,
          endImage,
        } as VideoParams, setProgress)
      } else if (mode === 'motion-control') {
        result = await generateMotionControl({
          mode,
          baseImage: charFile,
          prompt,
          engine: selectedEngine,
          referenceVideo,
          characterOrientation,
        } as VideoParams, setProgress)
      } else {
        // lip-sync
        result = await generateLipSync({
          characterImage: charFile,
          audioFile: audioFile!,
          prompt,
          engine: selectedEngine,
        } as LipSyncParams, setProgress)
      }

      if (!result.videoUrl) throw new Error('No video URL returned')

      setResultUrl(result.videoUrl)

      // Save to gallery
      addGalleryItems([{
        id: crypto.randomUUID(),
        url: result.videoUrl,
        type: 'video',
        source: 'video-studio' as any,
        characterId: selectedChar.id,
        prompt,
        model: selectedEngine,
        timestamp: Date.now(),
      }])

      toast.success('¡Video generado!')
    } catch (err: any) {
      restoreCredits(creditCost)
      setError(err.message || 'Error en la generación')
      toast.error(`Error al generar video: ${err.message || 'Error desconocido'}`)
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  // ── Render ──
  const availableEngines = getEnginesForMode(mode)

  return (
    <div className="flex h-full" style={{ color: 'var(--joi-text-1)' }}>
      {/* ═══ LEFT PANEL — Controls ═══ */}
      <div className="w-[380px] shrink-0 h-full overflow-y-auto border-r"
        style={{ background: 'var(--joi-bg-1)', borderColor: 'rgba(255,255,255,.03)' }}>

        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <Film size={20} style={{ color: 'var(--joi-pink)' }} />
            Video Studio
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--joi-text-3)' }}>
            Crea videos con tus personajes
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pb-4">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: mode === m.id ? 'rgba(255,107,157,.10)' : 'transparent',
                  color: mode === m.id ? 'var(--joi-pink)' : 'var(--joi-text-3)',
                  border: mode === m.id ? '1px solid rgba(255,107,157,.20)' : '1px solid transparent',
                }}>
                {m.icon}
                <span className="hidden lg:inline">{m.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-2 px-1" style={{ color: 'var(--joi-text-3)' }}>
            {MODES.find(m => m.id === mode)?.desc}
          </p>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.03)' }} />

        {/* Character Select */}
        <Section title="Personaje" icon="👤">
          {characters.length === 0 ? (
            <button onClick={() => onNav('create')}
              className="w-full py-3 rounded-xl text-xs font-medium transition-colors"
              style={{ background: 'rgba(255,107,157,.06)', color: 'var(--joi-pink)', border: '1px solid rgba(255,107,157,.15)' }}>
              Crea tu primer personaje
            </button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {characters.map(c => (
                <button key={c.id} onClick={() => setSelectedCharId(c.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: selectedCharId === c.id ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.02)',
                    border: `1px solid ${selectedCharId === c.id ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.06)'}`,
                    color: selectedCharId === c.id ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                  }}>
                  <img src={c.thumbnail} alt="" className="w-6 h-6 rounded-full object-cover" />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Mode-specific inputs */}
        {mode === 'motion-control' && (
          <>
            <Section title="Video de Referencia" icon="🎬">
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              {referenceVideo ? (
                <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,107,157,.25)' }}>
                  <video src={referenceVideoPreview!} className="w-full aspect-video object-cover" controls muted />
                  <button onClick={() => { setReferenceVideo(null); if (referenceVideoPreview) URL.revokeObjectURL(referenceVideoPreview); setReferenceVideoPreview(null) }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,.6)', color: 'white' }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => videoInputRef.current?.click()}
                  className="w-full py-8 rounded-xl flex flex-col items-center gap-2 transition-colors"
                  style={{ background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', color: 'var(--joi-text-3)' }}>
                  <Upload size={20} />
                  <span className="text-xs">Sube un video de referencia</span>
                  <span className="text-[10px]">TikTok, promo, baile — hasta 30s</span>
                </button>
              )}
            </Section>

            <Section title="Orientación del Personaje" icon="🧭">
              <div className="flex gap-2">
                {(['video', 'image'] as const).map(o => (
                  <button key={o} onClick={() => setCharacterOrientation(o)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: characterOrientation === o ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.02)',
                      border: `1px solid ${characterOrientation === o ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.06)'}`,
                      color: characterOrientation === o ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                    }}>
                    {o === 'video' ? 'Igualar pose del video (30s)' : 'Igualar pose de imagen (10s)'}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {mode === 'lip-sync' && (
          <>
            <Section title="Voz" icon="🎙️">
              {/* Voice selector */}
              <select
                value={selectedVoiceId ?? ''}
                onChange={e => setSelectedVoiceId(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-xl text-xs"
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.06)',
                  color: 'var(--joi-text-1)',
                }}>
                <option value="">Selecciona una voz...</option>
                {voices.map(v => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                ))}
              </select>

              {/* Preview voice */}
              {selectedVoiceId && (
                <button
                  onClick={() => {
                    const voice = voices.find(v => v.voice_id === selectedVoiceId)
                    if (voice?.preview_url) playVoicePreview(voice.preview_url)
                  }}
                  className="mt-2 flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--joi-pink)', background: 'rgba(255,107,157,.06)' }}>
                  <Volume2 size={12} /> Escuchar voz
                </button>
              )}
            </Section>

            <Section title="Guión" icon="📝">
              <textarea
                value={ttsText}
                onChange={e => setTtsText(e.target.value)}
                placeholder="Escribe lo que dirá tu personaje..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl text-xs resize-none"
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.06)',
                  color: 'var(--joi-text-1)',
                }} />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleGenerateTTS}
                  disabled={!ttsText.trim() || !selectedVoiceId || generatingTTS}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: 'rgba(255,107,157,.10)', color: 'var(--joi-pink)', border: '1px solid rgba(255,107,157,.20)' }}>
                  {generatingTTS ? (
                    <><span className="animate-spin">◌</span> Generando...</>
                  ) : (
                    <><Sparkles size={12} /> Generar Audio</>
                  )}
                </button>
              </div>
            </Section>

            <Section title="O Sube Audio" icon="📎">
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              {audioFile ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,107,157,.20)' }}>
                  <audio src={audioPreviewUrl!} controls className="flex-1 h-8" style={{ filter: 'hue-rotate(320deg)' }} />
                  <button onClick={() => { setAudioFile(null); if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null) }}>
                    <X size={14} style={{ color: 'var(--joi-text-3)' }} />
                  </button>
                </div>
              ) : (
                <button onClick={() => audioInputRef.current?.click()}
                  className="w-full py-4 rounded-xl flex flex-col items-center gap-1.5 transition-colors"
                  style={{ background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', color: 'var(--joi-text-3)' }}>
                  <Upload size={16} />
                  <span className="text-xs">Subir MP3 / WAV</span>
                </button>
              )}
            </Section>
          </>
        )}

        {mode === 'image-to-video' && (
          <Section title="Duración" icon="⏱️">
            <div className="flex gap-2">
              {(['5', '10'] as const).map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: duration === d ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.02)',
                    border: `1px solid ${duration === d ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.06)'}`,
                    color: duration === d ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                  }}>
                  {d}s
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Prompt (always visible) */}
        <Section title="Prompt" icon="✍️">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={
              mode === 'motion-control' ? 'Describe la escena/fondo (opcional)...'
                : mode === 'lip-sync' ? 'Contexto de la escena para el video hablando (opcional)...'
                : 'Describe la acción — "camina hacia adelante con confianza"...'
            }
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl text-xs resize-none"
            style={{
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.06)',
              color: 'var(--joi-text-1)',
            }} />
        </Section>

        {/* Engine selector */}
        <Section title="Motor" icon="⚙️">
          <div className="flex flex-col gap-1.5">
            {availableEngines.map(engine => {
              const meta = VIDEO_ENGINE_LABELS[engine]
              const cost = CREDIT_COSTS[engine] ?? 0
              return (
                <button key={engine} onClick={() => setSelectedEngine(engine)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: selectedEngine === engine ? 'rgba(255,107,157,.10)' : 'rgba(255,255,255,.02)',
                    border: `1px solid ${selectedEngine === engine ? 'rgba(255,107,157,.25)' : 'rgba(255,255,255,.04)'}`,
                  }}>
                  <span className="text-base">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: selectedEngine === engine ? 'var(--joi-pink)' : 'var(--joi-text-1)' }}>
                      {meta.name}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>{meta.description}</div>
                  </div>
                  <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--joi-text-3)' }}>
                    {cost}cr
                  </span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* Generate button */}
        <div className="px-5 py-4">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate()}
            className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, var(--joi-pink), var(--joi-lavender))',
              color: 'white',
              boxShadow: canGenerate() ? '0 0 24px rgba(255,107,157,.25)' : 'none',
            }}>
            {generating ? (
              <>
                <span className="animate-spin">◌</span>
                {progress?.status === 'IN_QUEUE' ? `En cola (#${progress.queuePosition ?? '?'})...` : 'Generando...'}
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generar Video — {creditCost} créditos
              </>
            )}
          </button>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Preview / Result ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ background: 'var(--joi-bg-0)' }}>
        {resultUrl ? (
          <div className="w-full max-w-2xl">
            <video
              src={resultUrl}
              controls
              autoPlay
              loop
              className="w-full rounded-2xl"
              style={{ boxShadow: '0 0 60px rgba(255,107,157,.15)', border: '1px solid rgba(255,255,255,.06)' }}
            />
            <div className="flex items-center justify-center gap-3 mt-4">
              <a href={resultUrl} download="video.mp4" target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,.04)', color: 'var(--joi-text-2)', border: '1px solid rgba(255,255,255,.06)' }}>
                Descargar
              </a>
              <button onClick={() => setResultUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: 'rgba(255,107,157,.08)', color: 'var(--joi-pink)', border: '1px solid rgba(255,107,157,.15)' }}>
                Nuevo Video
              </button>
            </div>
          </div>
        ) : generating ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,107,157,.08)', border: '1px solid rgba(255,107,157,.15)' }}>
              <Film size={24} className="animate-pulse" style={{ color: 'var(--joi-pink)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--joi-text-1)' }}>
                {progress?.status === 'IN_QUEUE'
                  ? `Esperando en cola (#${progress.queuePosition ?? '?'})...`
                  : 'Generando tu video...'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--joi-text-3)' }}>
                Esto usualmente toma 1-3 minutos
              </p>
            </div>
            {/* Progress logs */}
            {progress?.logs && progress.logs.length > 0 && (
              <div className="w-full max-w-sm mt-2 px-4 py-3 rounded-xl text-[10px] font-mono leading-relaxed"
                style={{ background: 'rgba(255,255,255,.02)', color: 'var(--joi-text-3)', maxHeight: 120, overflowY: 'auto' }}>
                {progress.logs.slice(-5).map((log, i) => <div key={i}>{log}</div>)}
              </div>
            )}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.15)' }}>
              <X size={20} style={{ color: '#ff5050' }} />
            </div>
            <p className="text-xs" style={{ color: '#ff5050' }}>{error}</p>
            <button onClick={() => setError(null)} className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>
              Cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
              {mode === 'motion-control' ? <Clapperboard size={28} style={{ color: 'var(--joi-text-3)' }} />
                : mode === 'lip-sync' ? <Mic size={28} style={{ color: 'var(--joi-text-3)' }} />
                : <Film size={28} style={{ color: 'var(--joi-text-3)' }} />}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--joi-text-2)' }}>
                {mode === 'motion-control' ? 'Sube un video y selecciona un personaje'
                  : mode === 'lip-sync' ? 'Escribe un guión o sube audio'
                  : 'Selecciona un personaje y describe la acción'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--joi-text-3)' }}>
                Tu video aparecerá aquí
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Reusable Section wrapper ───────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,.03)' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-sm" style={{ opacity: 0.5 }}>{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--joi-text-3)', letterSpacing: '0.08em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}
