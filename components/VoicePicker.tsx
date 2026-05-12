/**
 * VoicePicker — mobile-native voice assignment for a character.
 *
 *   3 entry points (atelier mood, all in one bottom sheet):
 *     1. Library    — 12 curated ElevenLabs premade voices, tap to preview + assign (free).
 *     2. Record     — record 30s of your own voice, clone via ElevenLabs (50 cr).
 *     3. Upload     — drop in an existing MP3/M4A/WAV sample (≥10s), clone via ElevenLabs.
 *
 *   The component is presentational: it doesn't decide HOW the resulting voice
 *   is persisted. The caller passes onChange and writes to character store /
 *   Supabase as it sees fit.
 *
 *   On clone we charge VOICE_CLONE_COST_CREDITS via the parent (caller
 *   handles deduction); we just request the clone.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Mic, Upload, Library, Play, Pause, Check, X, RotateCcw, Volume2, Lock,
} from 'lucide-react';
import {
  cloneVoice, generateSpeech, type ElevenLabsVoice,
} from '../services/elevenLabsService';
import {
  VOICE_LIBRARY, VOICE_SAMPLE_TEXT_ES, VOICE_CLONE_COST_CREDITS,
  type VoiceLibraryEntry,
} from '../data/voiceLibrary';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../services/nativeService';

export interface VoiceAssignment {
  voiceId: string;
  voiceName: string;
  voiceSource: 'cloned' | 'library' | 'shared';
  voicePreviewUrl?: string;
}

interface Props {
  characterName: string;
  /** Currently assigned voice — used to highlight the active row */
  current?: VoiceAssignment | null;
  /** User's available credits — used to gate the clone CTA */
  credits: number;
  /** Called after a successful pick / clone. Caller persists to character store. */
  onChange: (voice: VoiceAssignment | null) => void;
  /** Called when user wants to remove the voice (returns to library) */
  onClear?: () => void;
  /** Toast / error reporter from caller */
  onError?: (msg: string) => void;
  /** Toast / info reporter from caller */
  onInfo?: (msg: string) => void;
  /** Called BEFORE we hit ElevenLabs clone API — should deduct credits and
   *  return true if OK to continue. Returns false on insufficient credits. */
  onChargeClone: (cost: number) => Promise<boolean>;
  /** If clone fails after charging, restore credits via this callback */
  onRefund: (cost: number) => void;
}

type Mode = 'main' | 'library' | 'record' | 'upload' | 'cloning';
type RecordState = 'idle' | 'recording' | 'recorded' | 'preview';

const MIN_RECORD_SEC = 10;
const MAX_RECORD_SEC = 60;
const TARGET_RECORD_SEC = 30;

const SAMPLE_SCRIPT_ES = `Hola, soy ${'{NAME}'}. Tengo una voz, una historia, y un mundo entero por contar. Te voy a hablar de quién soy, de lo que me importa, de lo que sueño. Quedate conmigo, porque esto recién empieza.`;

export default function VoicePicker({
  characterName,
  current,
  credits,
  onChange,
  onClear,
  onError,
  onInfo,
  onChargeClone,
  onRefund,
}: Props) {
  const [mode, setMode] = useState<Mode>('main');

  // ─── Library state ───
  const [libGender, setLibGender] = useState<'all' | 'female' | 'male'>('all');
  const [libRegion, setLibRegion] = useState<'all' | 'latam' | 'es' | 'us' | 'br'>('all');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Record state ───
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recordSecs, setRecordSecs] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<number | null>(null);

  // ─── Upload state ───
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // ─── Clean up resources on unmount ───
  useEffect(() => () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
  }, [recordedUrl, uploadedUrl]);

  // ─── Library preview ──────────────────────────────
  const togglePreview = async (entry: VoiceLibraryEntry) => {
    hapticLight();
    // Stop any currently playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewingId === entry.id) {
      setPreviewingId(null);
      return;
    }
    setPreviewingId(entry.id);

    try {
      // Generate a short sample via TTS — proxied through Cloudflare
      const { url } = await generateSpeech({
        text: VOICE_SAMPLE_TEXT_ES,
        voiceId: entry.id,
        modelId: 'eleven_multilingual_v2',
      });
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setPreviewingId(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      console.error('Preview failed:', err);
      onError?.('No se pudo reproducir la voz');
      setPreviewingId(null);
    }
  };

  const pickLibraryVoice = (entry: VoiceLibraryEntry) => {
    hapticSuccess();
    // Stop any preview audio
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingId(null);
    onChange({
      voiceId: entry.id,
      voiceName: entry.label,
      voiceSource: 'library',
    });
    setMode('main');
  };

  // ─── Filtered library ────────────────────────────
  const filteredLibrary = VOICE_LIBRARY.filter(v => {
    if (libGender !== 'all' && v.gender !== libGender) return false;
    if (libRegion !== 'all' && v.region !== libRegion) return false;
    return true;
  });

  // ─── Recording ───────────────────────────────────
  const startRecording = async () => {
    try {
      hapticMedium();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Prefer mp4 audio (most compatible cross-platform), fall back to webm
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setRecordState('recorded');
        // Stop the stream tracks (release mic LED)
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecordState('recording');
      setRecordSecs(0);

      // Tick the second counter
      recordTimerRef.current = window.setInterval(() => {
        setRecordSecs(s => {
          const next = s + 1;
          if (next >= MAX_RECORD_SEC) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      hapticError();
      onError?.(
        err?.name === 'NotAllowedError'
          ? 'Permitime usar el micrófono desde la configuración del sistema'
          : `No se pudo iniciar la grabación: ${String(err?.message || err).slice(0, 80)}`,
      );
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') {
      r.stop();
    }
    hapticLight();
  };

  const resetRecording = () => {
    hapticLight();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordSecs(0);
    setRecordState('idle');
  };

  // ─── Upload ──────────────────────────────────────
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      onError?.('Solo audio (MP3, M4A, WAV)');
      e.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onError?.('Máximo 20 MB');
      e.target.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedUrl(url);
    hapticLight();
    e.target.value = '';
  };

  // ─── Run clone (record or upload) ────────────────
  const runClone = async (sourceFile: File) => {
    if (credits < VOICE_CLONE_COST_CREDITS) {
      onError?.(`Necesitas ${VOICE_CLONE_COST_CREDITS} créditos para clonar`);
      return;
    }
    const ok = await onChargeClone(VOICE_CLONE_COST_CREDITS);
    if (!ok) {
      onError?.('No se pudieron descontar los créditos');
      return;
    }

    setMode('cloning');
    hapticMedium();
    onInfo?.('Clonando voz · 30-60s...');

    try {
      const result = await cloneVoice({
        name: `${characterName} · VIST`,
        files: [sourceFile],
        description: `Voice clone for ${characterName}, created via VIST mobile.`,
      });
      hapticSuccess();
      onInfo?.('Voz clonada ✓');
      onChange({
        voiceId: result.voice_id,
        voiceName: characterName,
        voiceSource: 'cloned',
      });
      setMode('main');
      // Clean state
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setUploadedFile(null);
      setUploadedUrl(null);
      setRecordState('idle');
    } catch (err: any) {
      hapticError();
      onError?.(`Clone falló: ${String(err?.message || err).slice(0, 100)}`);
      onRefund(VOICE_CLONE_COST_CREDITS);
      setMode(recordedBlob ? 'record' : 'upload');
    }
  };

  const cloneFromRecording = () => {
    if (!recordedBlob) return;
    if (recordSecs < MIN_RECORD_SEC) {
      onError?.(`Grabá al menos ${MIN_RECORD_SEC} segundos`);
      return;
    }
    const ext = recordedBlob.type.includes('mp4') ? 'm4a' : 'webm';
    const file = new File([recordedBlob], `voice-${Date.now()}.${ext}`, {
      type: recordedBlob.type,
    });
    runClone(file);
  };

  const cloneFromUpload = () => {
    if (!uploadedFile) return;
    runClone(uploadedFile);
  };

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════
  return (
    <div className="vp-root">
      <style>{VP_STYLES}</style>

      {/* MAIN — entry points */}
      {mode === 'main' && (
        <>
          {current ? (
            <div className="vp-current">
              <div className="vp-current-info">
                <span className="vp-current-eyebrow">Voz activa</span>
                <strong>{current.voiceName}</strong>
                <small>
                  {current.voiceSource === 'cloned'
                    ? 'Clonada de tu grabación'
                    : current.voiceSource === 'library'
                      ? 'Voz de la biblioteca'
                      : 'Compartida'}
                </small>
              </div>
              {onClear && (
                <button
                  className="vp-current-clear"
                  onClick={() => { hapticLight(); onClear(); }}
                  aria-label="Quitar voz"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="vp-empty">
              <Volume2 size={20} />
              <div>
                <strong>Sin voz asignada</strong>
                <small>Elige una abajo. Después puedes cambiarla.</small>
              </div>
            </div>
          )}

          <button
            className="vp-card vp-card-primary"
            onClick={() => { hapticLight(); setMode('library'); }}
          >
            <div className="vp-card-icon"><Library size={20} /></div>
            <div className="vp-card-info">
              <strong>Biblioteca curada</strong>
              <small>12 voces gratis · LATAM, US, BR, ES</small>
            </div>
            <span className="vp-card-tag">Gratis</span>
          </button>

          <button
            className="vp-card"
            onClick={() => { hapticLight(); setMode('record'); }}
          >
            <div className="vp-card-icon"><Mic size={20} /></div>
            <div className="vp-card-info">
              <strong>Grabar mi voz</strong>
              <small>30s leyendo un texto · clone instantáneo</small>
            </div>
            <span className="vp-card-tag vp-card-tag-paid">{VOICE_CLONE_COST_CREDITS} cr</span>
          </button>

          <button
            className="vp-card"
            onClick={() => { hapticLight(); setMode('upload'); }}
          >
            <div className="vp-card-icon"><Upload size={20} /></div>
            <div className="vp-card-info">
              <strong>Subir audio</strong>
              <small>MP3 / M4A / WAV · 10s mínimo</small>
            </div>
            <span className="vp-card-tag vp-card-tag-paid">{VOICE_CLONE_COST_CREDITS} cr</span>
          </button>
        </>
      )}

      {/* LIBRARY — preview + pick */}
      {mode === 'library' && (
        <>
          <div className="vp-subhead">
            <button
              className="vp-back"
              onClick={() => { hapticLight(); setMode('main'); }}
              aria-label="Atrás"
            >
              ← Atrás
            </button>
            <span>Biblioteca de voces</span>
          </div>

          <div className="vp-filters">
            <div className="vp-filter-row">
              {(['all', 'female', 'male'] as const).map(g => (
                <button
                  key={g}
                  className={`vp-chip ${libGender === g ? 'is-on' : ''}`}
                  onClick={() => { hapticLight(); setLibGender(g); }}
                >
                  {g === 'all' ? 'Todas' : g === 'female' ? 'Femenina' : 'Masculina'}
                </button>
              ))}
            </div>
            <div className="vp-filter-row">
              {(['all', 'latam', 'es', 'us', 'br'] as const).map(r => (
                <button
                  key={r}
                  className={`vp-chip vp-chip-sm ${libRegion === r ? 'is-on' : ''}`}
                  onClick={() => { hapticLight(); setLibRegion(r); }}
                >
                  {r === 'all' ? 'Todas regiones' : r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="vp-voice-list">
            {filteredLibrary.length === 0 ? (
              <div className="vp-empty-filter">Sin voces con esos filtros</div>
            ) : (
              filteredLibrary.map(v => (
                <div
                  key={v.id}
                  className={`vp-voice-row ${current?.voiceId === v.id ? 'is-active' : ''}`}
                >
                  <button
                    className="vp-voice-preview"
                    onClick={() => togglePreview(v)}
                    aria-label={previewingId === v.id ? 'Pausar' : 'Reproducir'}
                  >
                    {previewingId === v.id ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <div className="vp-voice-info">
                    <strong>
                      <span className="vp-voice-emoji">{v.emoji}</span>
                      {v.label}
                    </strong>
                    <small>{v.description}</small>
                  </div>
                  <button
                    className="vp-voice-pick"
                    onClick={() => pickLibraryVoice(v)}
                    disabled={current?.voiceId === v.id}
                  >
                    {current?.voiceId === v.id ? <Check size={14} /> : 'Elegir'}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* RECORD — record up to 60s and clone */}
      {mode === 'record' && (
        <>
          <div className="vp-subhead">
            <button
              className="vp-back"
              onClick={() => { hapticLight(); setMode('main'); resetRecording(); }}
              aria-label="Atrás"
            >
              ← Atrás
            </button>
            <span>Grabar voz</span>
          </div>

          <div className="vp-script">
            <span className="vp-script-eyebrow">Leé este texto</span>
            <p>{SAMPLE_SCRIPT_ES.replace('{NAME}', characterName)}</p>
            <small>Apuntá a {TARGET_RECORD_SEC} segundos. Mínimo {MIN_RECORD_SEC}, máximo {MAX_RECORD_SEC}.</small>
          </div>

          {/* Recording UI */}
          <div className="vp-record-stage">
            {recordState === 'idle' && (
              <button className="vp-rec-btn" onClick={startRecording}>
                <div className="vp-rec-dot" />
                <span>Empezar a grabar</span>
              </button>
            )}

            {recordState === 'recording' && (
              <>
                <div className="vp-rec-counter">
                  <div className="vp-rec-counter-pulse" />
                  <div className="vp-rec-counter-num">{recordSecs}s</div>
                </div>
                <div className="vp-rec-progress">
                  <div
                    className="vp-rec-progress-fill"
                    style={{ width: `${Math.min(100, (recordSecs / TARGET_RECORD_SEC) * 100)}%` }}
                  />
                </div>
                <button
                  className="vp-rec-stop"
                  onClick={stopRecording}
                  disabled={recordSecs < 3}
                >
                  Detener
                </button>
              </>
            )}

            {recordState === 'recorded' && recordedUrl && (
              <>
                <audio src={recordedUrl} controls className="vp-audio-preview" />
                <div className="vp-rec-actions">
                  <button className="vp-rec-redo" onClick={resetRecording}>
                    <RotateCcw size={14} />
                    Otra toma
                  </button>
                  <button
                    className="vp-rec-confirm"
                    onClick={cloneFromRecording}
                    disabled={credits < VOICE_CLONE_COST_CREDITS}
                  >
                    {credits >= VOICE_CLONE_COST_CREDITS
                      ? `Clonar · ${VOICE_CLONE_COST_CREDITS} cr`
                      : <><Lock size={12} /> {VOICE_CLONE_COST_CREDITS - credits} cr</>}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="vp-tips">
            <strong>Tips para mejor calidad</strong>
            <ul>
              <li>Lugar silencioso, sin eco</li>
              <li>Hablá natural, no actues</li>
              <li>Cerca del micrófono pero sin tocarlo</li>
              <li>Si tosés o te trabás, mejor empezar de nuevo</li>
            </ul>
          </div>
        </>
      )}

      {/* UPLOAD — drop in an existing audio file and clone */}
      {mode === 'upload' && (
        <>
          <div className="vp-subhead">
            <button
              className="vp-back"
              onClick={() => { hapticLight(); setMode('main'); }}
              aria-label="Atrás"
            >
              ← Atrás
            </button>
            <span>Subir audio</span>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />

          {!uploadedUrl ? (
            <button className="vp-upload-zone" onClick={() => uploadInputRef.current?.click()}>
              <Upload size={24} />
              <strong>Elegir archivo de audio</strong>
              <small>MP3, M4A, WAV · 10s mín · 20 MB máx</small>
            </button>
          ) : (
            <>
              <audio src={uploadedUrl} controls className="vp-audio-preview" />
              <div className="vp-rec-actions">
                <button
                  className="vp-rec-redo"
                  onClick={() => {
                    if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
                    setUploadedFile(null);
                    setUploadedUrl(null);
                    hapticLight();
                  }}
                >
                  <RotateCcw size={14} />
                  Cambiar
                </button>
                <button
                  className="vp-rec-confirm"
                  onClick={cloneFromUpload}
                  disabled={credits < VOICE_CLONE_COST_CREDITS}
                >
                  {credits >= VOICE_CLONE_COST_CREDITS
                    ? `Clonar · ${VOICE_CLONE_COST_CREDITS} cr`
                    : <><Lock size={12} /> {VOICE_CLONE_COST_CREDITS - credits} cr</>}
                </button>
              </div>
            </>
          )}

          <div className="vp-tips">
            <strong>Qué subir</strong>
            <ul>
              <li>Audio limpio (sin música ni voces de fondo)</li>
              <li>Una sola persona hablando</li>
              <li>10-60 segundos es el sweet spot</li>
              <li>Usá tu mejor sample: lo que subas va a sonar siempre así</li>
            </ul>
          </div>
        </>
      )}

      {/* CLONING — full-screen-ish loader */}
      {mode === 'cloning' && (
        <div className="vp-cloning">
          <div className="vp-cloning-pulse">
            <Mic size={26} />
          </div>
          <h3>Clonando voz</h3>
          <p>ElevenLabs procesa tu sample. 30-60 segundos.</p>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────

const VP_STYLES = `
.vp-root {
  --vp-bg: #FFFCF5;
  --vp-paper: #F8EFDD;
  --vp-line: rgba(31, 26, 20, 0.10);
  --vp-ink-0: #1F1A14;
  --vp-ink-1: #3D332A;
  --vp-ink-2: #6F5E4C;
  --vp-ink-3: #A8957D;
  --vp-accent: #C9785C;
  --vp-accent-deep: #8E5640;
  --vp-rose: #B86060;
  --vp-mint: #7DA66B;
  --vp-gold: #D4A85F;
  --vp-ease: cubic-bezier(0.32, 0.72, 0, 1);

  font-family: 'DM Sans', sans-serif;
  color: var(--vp-ink-1);
}

/* Active voice strip */
.vp-current {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 13px;
  background: linear-gradient(180deg, var(--vp-bg) 0%, #FBF3E0 100%);
  border: 1.5px solid var(--vp-accent);
  border-radius: 12px;
  margin-bottom: 12px;
}
.vp-current-info { flex: 1; min-width: 0; line-height: 1.25; }
.vp-current-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--vp-accent-deep);
  display: block;
  margin-bottom: 2px;
}
.vp-current-info strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-ink-0);
}
.vp-current-info small {
  display: block;
  font-size: 11px;
  color: var(--vp-ink-2);
  margin-top: 1px;
}
.vp-current-clear {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1px solid var(--vp-line);
  background: var(--vp-bg);
  color: var(--vp-ink-1);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.vp-empty {
  display: flex; align-items: center; gap: 12px;
  padding: 12px;
  background: var(--vp-paper);
  border-radius: 12px;
  border: 1px dashed var(--vp-line);
  color: var(--vp-ink-2);
  margin-bottom: 12px;
}
.vp-empty strong {
  display: block;
  font-size: 13px;
  color: var(--vp-ink-0);
}
.vp-empty small {
  display: block;
  font-size: 11px;
  margin-top: 1px;
}

/* Cards */
.vp-card {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 13px;
  background: var(--vp-bg);
  border: 1px solid var(--vp-line);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s var(--vp-ease);
  margin-bottom: 8px;
}
.vp-card:active { transform: scale(0.98); }
.vp-card-primary {
  background: var(--vp-ink-0);
  color: var(--vp-bg);
  border-color: var(--vp-ink-0);
}
.vp-card-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: var(--vp-paper);
  color: var(--vp-accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.vp-card-primary .vp-card-icon {
  background: rgba(255, 252, 245, 0.12);
  color: var(--vp-gold);
}
.vp-card-info { flex: 1; min-width: 0; line-height: 1.25; }
.vp-card-info strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
}
.vp-card-info small {
  display: block;
  font-size: 11px;
  color: var(--vp-ink-3);
  margin-top: 1px;
}
.vp-card-primary .vp-card-info small {
  color: rgba(255, 252, 245, 0.6);
}
.vp-card-tag {
  padding: 3px 9px;
  background: var(--vp-mint);
  color: var(--vp-bg);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.vp-card-tag-paid {
  background: var(--vp-paper);
  color: var(--vp-accent-deep);
  border: 1px solid var(--vp-line);
}
.vp-card-primary .vp-card-tag {
  background: var(--vp-gold);
  color: var(--vp-ink-0);
}

/* Sub-page header */
.vp-subhead {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--vp-ink-2);
}
.vp-back {
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 11px;
  color: var(--vp-accent-deep);
  cursor: pointer;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  -webkit-tap-highlight-color: transparent;
}

/* Library filters */
.vp-filters {
  display: flex; flex-direction: column; gap: 6px;
  margin-bottom: 14px;
}
.vp-filter-row {
  display: flex; gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.vp-filter-row::-webkit-scrollbar { display: none; }
.vp-chip {
  flex-shrink: 0;
  padding: 7px 13px;
  background: var(--vp-bg);
  border: 1px solid var(--vp-line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.vp-chip.is-on {
  background: var(--vp-ink-0);
  border-color: var(--vp-ink-0);
  color: var(--vp-bg);
}
.vp-chip-sm {
  font-size: 10px;
  padding: 6px 11px;
}

/* Voice rows */
.vp-voice-list { display: flex; flex-direction: column; gap: 6px; }
.vp-voice-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: var(--vp-bg);
  border: 1px solid var(--vp-line);
  border-radius: 12px;
}
.vp-voice-row.is-active {
  border-color: var(--vp-accent);
  background: linear-gradient(180deg, var(--vp-bg) 0%, #FBF3E0 100%);
}
.vp-voice-preview {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--vp-paper);
  border: 1px solid var(--vp-line);
  color: var(--vp-accent);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.vp-voice-preview:active { transform: scale(0.93); }
.vp-voice-info { flex: 1; min-width: 0; line-height: 1.25; }
.vp-voice-info strong {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-ink-0);
}
.vp-voice-info small {
  display: block;
  font-size: 11px;
  color: var(--vp-ink-2);
  margin-top: 1px;
}
.vp-voice-emoji {
  font-size: 14px;
}
.vp-voice-pick {
  padding: 7px 13px;
  background: var(--vp-ink-0);
  color: var(--vp-bg);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 11px; font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.vp-voice-pick:disabled {
  background: var(--vp-mint);
  cursor: default;
}
.vp-empty-filter {
  padding: 24px;
  text-align: center;
  color: var(--vp-ink-3);
  font-size: 12px;
}

/* Script box for recording */
.vp-script {
  background: var(--vp-paper);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 14px;
}
.vp-script-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--vp-ink-3);
}
.vp-script p {
  margin: 6px 0 8px;
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 16px;
  line-height: 1.45;
  color: var(--vp-ink-0);
}
.vp-script small {
  display: block;
  font-size: 10px;
  color: var(--vp-ink-2);
  font-family: 'JetBrains Mono', monospace;
}

/* Record stage */
.vp-record-stage {
  display: flex; flex-direction: column;
  align-items: center; gap: 14px;
  padding: 24px 14px;
  background: var(--vp-bg);
  border: 1px solid var(--vp-line);
  border-radius: 14px;
  margin-bottom: 14px;
}
.vp-rec-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 22px;
  background: var(--vp-ink-0);
  color: var(--vp-bg);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.vp-rec-dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--vp-rose);
}
.vp-rec-counter {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.vp-rec-counter-pulse {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--vp-rose);
  animation: vp-pulse 1.4s ease-in-out infinite;
}
.vp-rec-counter-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 30px;
  font-weight: 600;
  color: var(--vp-ink-0);
  line-height: 1;
}
.vp-rec-progress {
  width: 100%;
  height: 4px;
  background: var(--vp-paper);
  border-radius: 999px;
  overflow: hidden;
}
.vp-rec-progress-fill {
  height: 100%;
  background: var(--vp-accent);
  transition: width 0.3s linear;
}
.vp-rec-stop {
  padding: 9px 20px;
  background: transparent;
  border: 1px solid var(--vp-line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.vp-rec-stop:disabled { opacity: 0.4; }

.vp-audio-preview {
  width: 100%;
  height: 38px;
  margin-bottom: 12px;
}

.vp-rec-actions {
  display: flex; gap: 8px;
  width: 100%;
}
.vp-rec-redo,
.vp-rec-confirm {
  flex: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 11px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  border: none;
  -webkit-tap-highlight-color: transparent;
}
.vp-rec-redo {
  background: var(--vp-paper);
  color: var(--vp-ink-1);
  border: 1px solid var(--vp-line);
}
.vp-rec-confirm {
  background: var(--vp-ink-0);
  color: var(--vp-bg);
}
.vp-rec-confirm:disabled {
  background: var(--vp-ink-3);
  cursor: not-allowed;
}

/* Upload zone */
.vp-upload-zone {
  width: 100%;
  display: flex; flex-direction: column;
  align-items: center; gap: 6px;
  padding: 32px 16px;
  background: var(--vp-paper);
  border: 1.5px dashed var(--vp-line);
  border-radius: 14px;
  color: var(--vp-ink-1);
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  margin-bottom: 14px;
}
.vp-upload-zone:active { background: var(--vp-bg); }
.vp-upload-zone svg { color: var(--vp-accent); }
.vp-upload-zone strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-ink-0);
}
.vp-upload-zone small {
  font-size: 11px;
  color: var(--vp-ink-3);
}

/* Tips */
.vp-tips {
  padding: 12px 14px;
  background: rgba(248, 239, 221, 0.55);
  border-radius: 12px;
  border: 1px dashed var(--vp-line);
}
.vp-tips strong {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--vp-ink-3);
  margin-bottom: 6px;
}
.vp-tips ul {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 11px;
  color: var(--vp-ink-2);
  line-height: 1.55;
}
.vp-tips li { margin: 2px 0; }

/* Cloning loader */
.vp-cloning {
  text-align: center;
  padding: 36px 16px;
}
.vp-cloning-pulse {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--vp-accent);
  color: var(--vp-bg);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  animation: vp-pulse 2s ease-in-out infinite;
  box-shadow: 0 0 28px rgba(201, 120, 92, 0.4);
}
.vp-cloning h3 {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 400;
  color: var(--vp-ink-0);
  margin: 0 0 4px;
}
.vp-cloning p {
  font-size: 12px;
  color: var(--vp-ink-2);
  margin: 0;
}

@keyframes vp-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
}
`;
