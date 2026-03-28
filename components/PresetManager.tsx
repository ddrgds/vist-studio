import React, { useState, useRef, useEffect } from 'react'
import { usePresetStore, type CustomPreset } from '../stores/presetStore'

interface PresetManagerProps {
  currentSettings: Partial<CustomPreset>;
  onLoad: (preset: CustomPreset) => void;
}

export function PresetManager({ currentSettings, onLoad }: PresetManagerProps) {
  const { presets, savePreset, deletePreset, loadPreset } = usePresetStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [presetName, setPresetName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus input when saving
  useEffect(() => {
    if (saving) nameInputRef.current?.focus()
  }, [saving])

  const handleSave = () => {
    const trimmed = presetName.trim()
    if (!trimmed) return
    savePreset({ ...currentSettings, name: trimmed })
    setPresetName('')
    setSaving(false)
  }

  const handleLoad = (id: string) => {
    const preset = loadPreset(id)
    if (preset) {
      onLoad(preset)
      setDropdownOpen(false)
    }
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deletePreset(id)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Dropdown of saved presets */}
      <div ref={dropdownRef} className="relative flex-1 min-w-0">
        <button
          onClick={() => { setDropdownOpen(!dropdownOpen); setSaving(false) }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all truncate"
          style={{
            background: 'rgba(255,255,255,.02)',
            border: '1px solid rgba(255,255,255,.06)',
            color: 'var(--joi-text-2)',
          }}
        >
          <span style={{ opacity: 0.5, fontSize: 12 }}>{'\uD83D\uDCC1'}</span>
          <span className="truncate flex-1 text-left">
            {presets.length > 0 ? `Presets (${presets.length})` : 'Sin presets guardados'}
          </span>
          <span className="text-[9px] shrink-0" style={{
            color: 'var(--joi-text-3)',
            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .15s',
          }}>{'\u25BC'}</span>
        </button>

        {dropdownOpen && presets.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto"
            style={{
              background: 'rgba(14,12,20,.97)',
              border: '1px solid rgba(255,255,255,.08)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 12px 40px rgba(0,0,0,.5)',
            }}>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => handleLoad(p.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[.04] group"
                style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}
              >
                <span className="text-[11px] font-medium flex-1 truncate" style={{ color: 'var(--joi-text-1)' }}>
                  {p.name}
                </span>
                <span className="text-[9px] font-mono shrink-0" style={{ color: 'var(--joi-text-3)' }}>
                  {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <button
                  onClick={(e) => handleDelete(e, p.id)}
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  style={{ background: 'rgba(255,80,80,.1)', color: '#FF5050' }}
                >
                  {'\u2715'}
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Save / Save inline input */}
      {saving ? (
        <div className="flex items-center gap-1.5">
          <input
            ref={nameInputRef}
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false) }}
            placeholder="Nombre del preset..."
            className="w-[120px] px-2.5 py-1.5 rounded-lg text-[11px] outline-none"
            style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(99,102,241,.2)',
              color: 'var(--joi-text-1)',
            }}
          />
          <button
            onClick={handleSave}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              background: presetName.trim() ? 'rgba(99,102,241,.15)' : 'rgba(255,255,255,.03)',
              border: `1px solid ${presetName.trim() ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.06)'}`,
              color: presetName.trim() ? 'var(--joi-pink)' : 'var(--joi-text-3)',
              cursor: presetName.trim() ? 'pointer' : 'default',
            }}
          >
            {'\u2713'}
          </button>
          <button
            onClick={() => { setSaving(false); setPresetName('') }}
            className="px-2 py-1.5 rounded-lg text-[10px] transition-all"
            style={{
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.06)',
              color: 'var(--joi-text-3)',
            }}
          >
            {'\u2715'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSaving(true)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all shrink-0 flex items-center gap-1.5"
          style={{
            background: 'rgba(99,102,241,.08)',
            border: '1px solid rgba(99,102,241,.18)',
            color: 'var(--joi-pink)',
          }}
        >
          <span style={{ fontSize: 11 }}>{'\uD83D\uDCBE'}</span> Guardar
        </button>
      )}
    </div>
  )
}

export default PresetManager
