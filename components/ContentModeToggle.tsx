import React, { useState } from 'react'
import { Sparkles, Lock, AlertTriangle } from 'lucide-react'
import { useProfile } from '../contexts/ProfileContext'

/**
 * ContentModeToggle — Modo Standard / Modo Creator switch.
 *
 * Standard: editorial limpio, ropa normal (default).
 * Creator: opt-in para presets sensuales (lencería editorial, beach, boudoir).
 *          Requiere confirmación explícita +18 antes de activarse.
 *          Línea dura: hasta lencería / implied nudity. Nada de topless/desnudo
 *          frontal/hardcore. Esto se enforza server-side con NSFW classifier.
 */
export const ContentModeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { profile, setContentMode } = useProfile()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!profile) return null
  const mode = profile.contentMode ?? 'standard'

  const handleEnable = async () => {
    setBusy(true)
    try { await setContentMode('creator') }
    finally {
      setBusy(false)
      setConfirming(false)
    }
  }
  const handleDisable = async () => {
    setBusy(true)
    try { await setContentMode('standard') }
    finally { setBusy(false) }
  }

  if (compact) {
    return (
      <button
        onClick={() => mode === 'creator' ? handleDisable() : setConfirming(true)}
        disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
        style={{
          background: mode === 'creator' ? '#1A1A1A' : '#F3F4F6',
          color: mode === 'creator' ? '#fff' : '#555',
          border: '1px solid rgba(0,0,0,0.08)',
        }}>
        {mode === 'creator' ? <Sparkles size={12} /> : <Lock size={12} />}
        {mode === 'creator' ? 'Modo Creator' : 'Modo Standard'}
      </button>
    )
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: '#999' }}>Modo de Contenido</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: mode === 'creator' ? '#1A1A1A' : '#F3F4F6', color: mode === 'creator' ? '#fff' : '#555' }}>
              {mode === 'creator' ? 'CREATOR · +18' : 'STANDARD'}
            </span>
          </div>
          <h3 className="text-[16px] font-semibold mb-1" style={{ color: '#1A1A1A' }}>
            {mode === 'creator' ? 'Modo Creator activado' : 'Modo Standard'}
          </h3>
          <p className="text-[13px] leading-relaxed" style={{ color: '#555' }}>
            {mode === 'creator'
              ? 'Tienes acceso a presets editoriales sensuales: lencería, beach, boudoir, mirror selfie. Línea dura aplicada server-side: nada de topless, desnudo o explícito.'
              : 'Editorial limpio, ropa normal, lifestyle. Sin contenido sensual.'}
          </p>
        </div>
      </div>

      {!confirming && (
        <button
          onClick={() => mode === 'creator' ? handleDisable() : setConfirming(true)}
          disabled={busy}
          className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
          style={{
            background: mode === 'creator' ? '#F3F4F6' : '#1A1A1A',
            color: mode === 'creator' ? '#1A1A1A' : '#fff',
            opacity: busy ? 0.6 : 1,
          }}>
          {busy ? '...' : mode === 'creator' ? 'Desactivar Modo Creator' : 'Activar Modo Creator'}
        </button>
      )}

      {confirming && (
        <div className="mt-3 rounded-xl p-4" style={{ background: '#FFF8E6', border: '1px solid #FFE08A' }}>
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: '#B5751B', flexShrink: 0, marginTop: 2 }} />
            <div className="text-[12px] leading-relaxed" style={{ color: '#5C3D0A' }}>
              <strong>Confirmas que tienes 18 años o más.</strong> El Modo Creator desbloquea presets editoriales sensuales (lencería, beach, boudoir).
              <span className="block mt-1.5" style={{ color: '#7A5A1F' }}>
                Línea dura: <strong>NO</strong> topless, <strong>NO</strong> desnudo frontal, <strong>NO</strong> contenido explícito. El sistema bloqueará automáticamente cualquier output que cruce esa línea.
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 px-4 py-2 rounded-xl text-[12px] font-medium"
              style={{ background: 'transparent', color: '#555', border: '1px solid rgba(0,0,0,0.12)' }}>
              Cancelar
            </button>
            <button
              onClick={handleEnable}
              disabled={busy}
              className="flex-1 px-4 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: '#1A1A1A', color: '#fff', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Activando...' : 'Confirmar +18 y activar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContentModeToggle
