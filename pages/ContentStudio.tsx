import React, { useState, lazy, Suspense } from 'react'
import type { Page } from '../App'
import { Camera, Film, Images } from 'lucide-react'

// Lazy load the existing pages as "modes"
const Director = lazy(() => import('./Director'))
const VideoStudio = lazy(() => import('./VideoStudio'))
const PhotoSession = lazy(() => import('./PhotoSession'))

type StudioMode = 'photo' | 'video' | 'session'

const MODES: { id: StudioMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'photo', label: 'Photo', icon: <Camera size={15} />, desc: 'Generate photos & scenes' },
  { id: 'session', label: 'Batch Shoot', icon: <Images size={15} />, desc: 'Multi-vibe photo session' },
  { id: 'video', label: 'Video & Reels', icon: <Film size={15} />, desc: 'Motion control · Lip sync · Animate' },
]

export default function ContentStudio({ onNav, onEditImage, onExportImage }: { onNav: (p: Page) => void; onEditImage?: (url: string) => void; onExportImage?: (url: string) => void }) {
  const [mode, setMode] = useState<StudioMode>('photo')

  return (
    <div className="flex flex-col h-full">
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

      {/* Content — renders the existing page component */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--joi-text-3)' }}>
            Loading...
          </div>
        }>
          {mode === 'photo' && <Director onNav={onNav} onEditImage={onEditImage} onExportImage={onExportImage} />}
          {mode === 'session' && <PhotoSession onNav={onNav} />}
          {mode === 'video' && <VideoStudio onNav={onNav} />}
        </Suspense>
      </div>

    </div>
  )
}
