import { useState, useMemo, useEffect } from 'react'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { useCharacterStore } from '../stores/characterStore'
import { useToast } from '../contexts/ToastContext'
import { useNavigationStore } from '../stores/navigationStore'

const BASE_FILTERS = ['All','Relight','Face Swap','Try-On','360°','Background','Enhanced','Style Transfer','Inpaint']
const sortOpts = ['Recent','Oldest','Most Edited','Favorites']

function getItemCategory(item: GalleryItem): string {
  const model = (item.model || '').toLowerCase()
  const tags = item.tags || []
  if (model.includes('relight') || tags.includes('relight')) return 'Relight'
  if (model.includes('swap') || tags.includes('faceswap')) return 'Face Swap'
  if (model.includes('try') || model.includes('tryon') || tags.includes('tryon')) return 'Try-On'
  if (model.includes('360') || tags.includes('360')) return '360°'
  if (model.includes('background') || model.includes('bg') || tags.includes('background')) return 'Background'
  if (model.includes('enhance') || model.includes('skin') || tags.includes('enhance')) return 'Enhanced'
  if (model.includes('style') || tags.includes('style')) return 'Style Transfer'
  if (model.includes('inpaint') || tags.includes('inpaint')) return 'Inpaint'
  if (item.type === 'session') return 'Session'
  if (item.type === 'create') return 'Creation'
  return 'Other'
}

const FILTER_PRESETS: Record<string, { brightness: number, contrast: number, saturation: number, temperature: number }> = {
  'Warm': { brightness: 5, contrast: 0, saturation: 20, temperature: 30 },
  'B&W': { brightness: 0, contrast: 10, saturation: -100, temperature: 0 },
  'Vintage': { brightness: 5, contrast: -10, saturation: -20, temperature: 20 },
  'Cool': { brightness: 5, contrast: 0, saturation: -10, temperature: -30 },
  'Dramatic': { brightness: -5, contrast: 30, saturation: 10, temperature: 0 },
  'Fade': { brightness: 10, contrast: -10, saturation: -20, temperature: 0 },
}

function computeFilterCSS(v: { brightness: number, contrast: number, saturation: number, temperature: number }): string {
  const b = 1 + v.brightness / 100
  const c = 1 + v.contrast / 100
  const s = 1 + v.saturation / 100
  let css = `brightness(${b}) contrast(${c}) saturate(${s})`
  if (v.temperature > 0) {
    css += ` sepia(${v.temperature * 0.004}) hue-rotate(${v.temperature * 0.2}deg)`
  } else if (v.temperature < 0) {
    css += ` hue-rotate(${v.temperature * 0.2}deg)`
  }
  return css
}

const DEFAULT_FILTERS = { brightness: 0, contrast: 0, saturation: 0, temperature: 0 }

export function Gallery({ onNav }: { onNav?: (page: string) => void }) {
  const items = useGalleryStore(s => s.items)
  const characters = useCharacterStore(s => s.characters)
  const toggleFavorite = useGalleryStore(s => s.toggleFavorite)
  const removeItem = useGalleryStore(s => s.removeItem)
  const addItems = useGalleryStore(s => s.addItems)
  const updateItem = useGalleryStore(s => s.updateItem)
  const { addToast } = useToast()
  const { navigateToEditor, navigateToSession, navigateToUpload } = useNavigationStore()

  const [activeFilter, setActiveFilter] = useState('All')
  const [viewMode, setViewMode] = useState<'grid'|'masonry'>('grid')
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('Recent')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [filterValues, setFilterValues] = useState({ ...DEFAULT_FILTERS })
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // Build dynamic filters
  const filters = useMemo(() => {
    const extra: string[] = []
    if (items.some(i => getItemCategory(i) === 'Session')) extra.push('Session')
    if (items.some(i => getItemCategory(i) === 'Creation')) extra.push('Creation')
    return [...BASE_FILTERS, ...extra]
  }, [items])

  const filtered = activeFilter === 'All' ? items : items.filter(i => getItemCategory(i) === activeFilter)

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'Recent') return b.timestamp - a.timestamp
      if (sortBy === 'Oldest') return a.timestamp - b.timestamp
      if (sortBy === 'Favorites') return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)
      return 0
    })
  }, [filtered, sortBy])

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  const stats = [
    { l:'Total Creations', v: filtered.length.toString(), c:'var(--accent)' },
    { l:'Face Swaps', v: items.filter(i => getItemCategory(i) === 'Face Swap').length.toString(), c:'var(--rose)' },
    { l:'Relights', v: items.filter(i => getItemCategory(i) === 'Relight').length.toString(), c:'var(--magenta)' },
    { l:'Try-Ons', v: items.filter(i => getItemCategory(i) === 'Try-On').length.toString(), c:'var(--mint)' },
  ]

  // --- Handlers ---

  const handleDownload = async (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation()
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `vertex-${id.slice(0,8)}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      addToast('Image downloaded', 'success')
    } catch {
      addToast('Download failed', 'error')
    }
  }

  const handleDelete = (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation()
    removeItem(item.id)
    addToast('Image deleted', 'info')
  }

  const handleSaveFilter = async (item: GalleryItem) => {
    const filterCSS = computeFilterCSS(filterValues)
    if (filterCSS === computeFilterCSS(DEFAULT_FILTERS)) {
      addToast('No filters applied', 'info')
      return
    }
    try {
      const res = await fetch(item.url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)

      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = blobUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.filter = filterCSS
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(blobUrl)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      updateItem(item.id, { url: dataUrl })
      setFilterValues({ ...DEFAULT_FILTERS })
      setActivePreset(null)
      addToast('Filters saved', 'success')
    } catch {
      addToast('Failed to save filters', 'error')
    }
  }

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => prev !== null ? (prev < sorted.length - 1 ? prev + 1 : 0) : null)
        setFilterValues({ ...DEFAULT_FILTERS }); setActivePreset(null)
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : sorted.length - 1) : null)
        setFilterValues({ ...DEFAULT_FILTERS }); setActivePreset(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, sorted.length])

  return (
    <div className="min-h-screen gradient-mesh">
      <div className="px-8 pt-8 pb-2 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif" style={{ color:'var(--text-1)' }}>
            Gallery of <span className="text-gradient">Creations</span>
          </h1>
          <p className="text-sm mt-1" style={{ color:'var(--text-2)' }}>All your AI-edited images in one place</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="text-[11px] font-mono px-3 py-1.5 rounded-lg" style={{ background:'rgba(240,104,72,.1)', color:'var(--accent)' }}>
              {selected.length} selected
            </span>
          )}
          <div className="flex p-0.5 rounded-lg" style={{ background:'var(--bg-2)' }}>
            {(['grid','masonry'] as const).map(m=>(
              <button key={m} onClick={()=>setViewMode(m)}
                className="px-2.5 py-1 rounded-md text-[11px] transition-all"
                style={{ background: viewMode===m ? 'var(--bg-4)' : 'transparent', color: viewMode===m ? 'var(--text-1)' : 'var(--text-3)' }}>
                {m==='grid' ? '⊞' : '⊟'}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
            style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-2)' }}>
            {sortOpts.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-8 py-3 flex gap-1.5 overflow-x-auto">
        {filters.map(f => (
          <button key={f} onClick={()=>setActiveFilter(f)}
            className="px-3.5 py-1.5 rounded-full text-[11px] font-medium shrink-0 transition-all"
            style={{
              background: activeFilter===f ? 'rgba(240,104,72,.1)' : 'var(--bg-2)',
              border: `1px solid ${activeFilter===f ? 'rgba(240,104,72,.25)' : 'var(--border)'}`,
              color: activeFilter===f ? 'var(--accent)' : 'var(--text-2)',
            }}>{f}</button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="px-8 py-2 flex gap-4">
        {stats.map(s=>(
          <div key={s.l} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background:s.c }} />
            <span className="text-[10px]" style={{ color:'var(--text-3)' }}>{s.l}:</span>
            <span className="text-[11px] font-mono font-bold" style={{ color:s.c }}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="px-8 pb-8 flex items-center justify-center" style={{ minHeight: '40vh' }}>
          <div className="card px-8 py-10 text-center" style={{ maxWidth: '420px' }}>
            <p className="text-sm" style={{ color:'var(--text-2)' }}>
              No creations yet. Use the AI Editor or Photo Session to get started.
            </p>
          </div>
        </div>
      ) : (
        /* Image Grid */
        <div className={`px-8 pb-8 ${viewMode==='grid' ? 'grid grid-cols-6 gap-3' : 'columns-5 gap-3 space-y-3'}`}>
          {sorted.map((img, idx) => {
            const charName = characters.find(c => c.id === img.characterId)?.name || 'No character'
            const category = getItemCategory(img)
            const dateStr = new Date(img.timestamp).toLocaleDateString('en', { day:'numeric', month:'short' })
            const colorMap: Record<number, string> = { 0:'var(--accent)', 1:'var(--blue)', 2:'var(--rose)' }
            const fallbackColor = colorMap[idx % 3] || 'var(--accent)'

            return (
              <div
                key={img.id}
                onClick={() => { setLightboxIndex(idx); setFilterValues({ ...DEFAULT_FILTERS }); setActivePreset(null) }}
                className={`group cursor-pointer rounded-2xl overflow-hidden relative transition-all hover:scale-[1.02] ${viewMode==='masonry' ? 'break-inside-avoid' : ''}`}
                style={{
                  border: `2px solid ${selected.includes(img.id) ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: selected.includes(img.id) ? '0 0 20px rgba(240,104,72,.15)' : 'none',
                }}
              >
                <div
                  className={viewMode==='grid' ? 'aspect-square' : ''}
                  style={{
                    background: img.url ? undefined : `linear-gradient(${90 + idx * 15}deg, ${fallbackColor}18, var(--bg-2))`,
                    minHeight: viewMode==='masonry' ? `${140 + (idx%4)*40}px` : undefined,
                  }}
                >
                  {img.url ? (
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <div className="text-center">
                        <span className="text-2xl block mb-1 opacity-30">{charName[0]}</span>
                        <span className="text-[9px] font-mono opacity-40" style={{ color:'var(--text-1)' }}>{category}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
                  <div className="w-full p-2.5 translate-y-full group-hover:translate-y-0 transition-transform">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-semibold text-white">{charName}</div>
                        <div className="text-[8px] font-mono text-white/60">{category} · {dateStr}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); navigateToEditor(img.url); onNav?.('editor') }}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all hover:scale-110"
                          style={{ background: 'rgba(240,104,72,.25)', color: 'var(--accent)' }}
                          title="Edit in AI Editor">✦</button>
                        <button onClick={(e) => handleDownload(e, img.url, img.id)}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all hover:scale-110"
                          style={{ background:'rgba(255,255,255,.15)', color: 'var(--text-2)' }}
                          title="Download">↓</button>
                        <button
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all hover:scale-110"
                          style={{ background: img.favorite ? 'rgba(240,104,72,.3)' : 'rgba(255,255,255,.15)' }}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(img.id) }}
                          title="Favorite">
                          {img.favorite ? '★' : '☆'}
                        </button>
                        <button onClick={(e) => handleDelete(e, img)}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all hover:scale-110"
                          style={{ background: 'rgba(255,60,60,.2)', color: '#e05050' }}
                          title="Delete">✕</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Select indicator */}
                {selected.includes(img.id) && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                    style={{ background:'var(--accent)' }}>✓</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Lightbox ─── */}
      {lightboxIndex !== null && (() => {
        const item = sorted[lightboxIndex]
        if (!item) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.92)' }}
            onClick={() => setLightboxIndex(null)}>

            {/* Close */}
            <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-lg z-10 transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,.1)', color: 'var(--text-2)' }}
              onClick={() => setLightboxIndex(null)}>✕</button>

            {/* Arrow left */}
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,.08)', color: 'var(--text-2)' }}
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : sorted.length - 1); setFilterValues({ ...DEFAULT_FILTERS }); setActivePreset(null) }}>‹</button>

            {/* Arrow right */}
            <button className="absolute right-[300px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,.08)', color: 'var(--text-2)' }}
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex < sorted.length - 1 ? lightboxIndex + 1 : 0); setFilterValues({ ...DEFAULT_FILTERS }); setActivePreset(null) }}>›</button>

            {/* Content */}
            <div className="flex max-w-[95vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

              {/* Image */}
              <div className="flex-1 min-w-0 flex items-center justify-center p-4">
                <img src={item.url} alt=""
                  className="max-w-full max-h-[85vh] object-contain rounded-xl"
                  style={{ filter: computeFilterCSS(filterValues) }} />
              </div>

              {/* Sidebar */}
              <div className="w-[280px] shrink-0 flex flex-col gap-3 p-4 overflow-y-auto"
                style={{ background: 'rgba(14,12,20,.85)', borderLeft: '1px solid var(--border)' }}>

                {/* Navigation actions */}
                <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Actions</div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => { navigateToEditor(item.url); onNav?.('editor') }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(240,104,72,.08)', border: '1px solid rgba(240,104,72,.15)', color: 'var(--accent)' }}>
                    ✦ Edit in AI Editor
                  </button>
                  <button onClick={() => { navigateToSession(item.url); onNav?.('session') }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(208,72,176,.08)', border: '1px solid rgba(208,72,176,.15)', color: 'var(--magenta)' }}>
                    ◎ New Photo Session
                  </button>
                  <button onClick={() => { navigateToUpload(item.url); onNav?.('upload') }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(72,88,224,.08)', border: '1px solid rgba(72,88,224,.15)', color: 'var(--blue)' }}>
                    ⊕ Create Character
                  </button>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2">
                  <button onClick={(e) => handleDownload(e, item.url, item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] transition-all hover:scale-[1.02]"
                    style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
                    ↓ Download
                  </button>
                  <button onClick={(e) => { handleDelete(e, item); setLightboxIndex(null) }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(255,60,60,.08)', color: '#e05050' }}>
                    ✕ Delete
                  </button>
                </div>

                <div className="glow-line my-1" />

                {/* Filter Presets */}
                <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Presets</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.keys(FILTER_PRESETS).map(name => (
                    <button key={name} onClick={() => { setActivePreset(name); setFilterValues(FILTER_PRESETS[name]) }}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                      style={{
                        background: activePreset === name ? 'rgba(240,104,72,.1)' : 'var(--bg-3)',
                        border: `1px solid ${activePreset === name ? 'rgba(240,104,72,.2)' : 'var(--border)'}`,
                        color: activePreset === name ? 'var(--accent)' : 'var(--text-2)',
                      }}>{name}</button>
                  ))}
                </div>

                {/* Sliders */}
                <div className="text-[9px] font-mono uppercase tracking-wider mt-1" style={{ color: 'var(--text-3)' }}>Adjust</div>
                {(['brightness', 'contrast', 'saturation', 'temperature'] as const).map(key => (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] capitalize" style={{ color: 'var(--text-3)' }}>{key}</span>
                      <span className="text-[9px] font-mono" style={{ color: filterValues[key] !== 0 ? 'var(--accent)' : 'var(--text-3)' }}>
                        {filterValues[key] > 0 ? '+' : ''}{filterValues[key]}
                      </span>
                    </div>
                    <input type="range" min={-100} max={100} value={filterValues[key]}
                      className="slider-t w-full"
                      onChange={e => {
                        setActivePreset(null)
                        setFilterValues(prev => ({ ...prev, [key]: parseInt(e.target.value) }))
                      }} />
                  </div>
                ))}

                {/* Reset / Save */}
                <div className="flex gap-2 mt-1">
                  <button onClick={() => { setFilterValues({ ...DEFAULT_FILTERS }); setActivePreset(null) }}
                    className="flex-1 px-3 py-2 rounded-lg text-[10px] transition-all"
                    style={{ background: 'rgba(240,104,72,.08)', border: '1px solid rgba(240,104,72,.15)', color: 'var(--accent)' }}>
                    Reset
                  </button>
                  <button onClick={() => handleSaveFilter(item)}
                    className="flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--magenta))', color: 'white' }}>
                    Save
                  </button>
                </div>

                {/* Image info */}
                <div className="glow-line my-1" />
                <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Info</div>
                <div className="text-[10px] space-y-1" style={{ color: 'var(--text-2)' }}>
                  <div>Category: {getItemCategory(item)}</div>
                  {item.model && <div>Model: {item.model}</div>}
                  <div>Date: {new Date(item.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default Gallery
