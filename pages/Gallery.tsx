import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { useGalleryStore, type GalleryItem, type ReuseParams } from '../stores/galleryStore'
import { useCharacterStore } from '../stores/characterStore'
import { useToast } from '../contexts/ToastContext'
import { useNavigationStore } from '../stores/navigationStore'
import { removeBackground } from '../services/falService'
import ABComparator from '../components/ABComparator'
import CompareSliderModal from '../components/CompareSliderModal'
import { StoryboardView } from '../components/StoryboardView'

const ImageEditor = lazy(() => import('../components/ImageEditor'))
const CaptionModal = lazy(() => import('../components/CaptionModal'))
const BatchOutfitModal = lazy(() => import('../components/BatchOutfitModal'))

const BASE_FILTERS = ['Todas','Reiluminar','Cambio de Rostro','Try-On','360°','Fondo','Mejorada','Transferencia de Estilo','Inpaint']
const sortOpts = ['Recientes','Más antiguas','Más editadas','Favoritos']

function getItemCategory(item: GalleryItem): string {
  const model = (item.model || '').toLowerCase()
  const tags = item.tags || []
  if (model.includes('relight') || tags.includes('relight')) return 'Reiluminar'
  if (model.includes('swap') || tags.includes('faceswap')) return 'Cambio de Rostro'
  if (model.includes('try') || model.includes('tryon') || tags.includes('tryon')) return 'Try-On'
  if (model.includes('360') || tags.includes('360')) return '360°'
  if (model.includes('background') || model.includes('bg') || tags.includes('background')) return 'Fondo'
  if (model.includes('enhance') || model.includes('skin') || tags.includes('enhance')) return 'Mejorada'
  if (model.includes('style') || tags.includes('style')) return 'Transferencia de Estilo'
  if (model.includes('inpaint') || tags.includes('inpaint')) return 'Inpaint'
  if (item.type === 'session') return 'Sesión'
  if (item.type === 'create') return 'Creación'
  return 'Otra'
}

const FILTER_PRESETS: Record<string, { brightness: number, contrast: number, saturation: number, temperature: number }> = {
  'Cálido': { brightness: 5, contrast: 0, saturation: 20, temperature: 30 },
  'B&N': { brightness: 0, contrast: 10, saturation: -100, temperature: 0 },
  'Vintage': { brightness: 5, contrast: -10, saturation: -20, temperature: 20 },
  'Frío': { brightness: 5, contrast: 0, saturation: -10, temperature: -30 },
  'Dramático': { brightness: -5, contrast: 30, saturation: 10, temperature: 0 },
  'Desvanecido': { brightness: 10, contrast: -10, saturation: -20, temperature: 0 },
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

export function Gallery({ onNav, onEditImage, onExportImage }: { onNav?: (page: string) => void; onEditImage?: (url: string) => void; onExportImage?: (url: string) => void }) {
  const items = useGalleryStore(s => s.items)
  const characters = useCharacterStore(s => s.characters)
  const toggleFavorite = useGalleryStore(s => s.toggleFavorite)
  const removeItem = useGalleryStore(s => s.removeItem)
  const removeItems = useGalleryStore(s => s.removeItems)
  const addItems = useGalleryStore(s => s.addItems)
  const updateItem = useGalleryStore(s => s.updateItem)
  const addToStoryboard = useGalleryStore(s => s.addToStoryboard)
  const storyboardIds = useGalleryStore(s => s.storyboardIds)
  const setReuseParams = useGalleryStore(s => s.setReuseParams)
  const { addToast } = useToast()
  const { navigateToEditor, navigateToSession, navigateToUpload } = useNavigationStore()

  const [galleryTab, setGalleryTab] = useState<'gallery'|'storyboard'>('gallery')
  const [activeFilter, setActiveFilter] = useState('Todas')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid'|'masonry'>('grid')
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('Recientes')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lbZoom, setLbZoom] = useState(1)
  const [lbPan, setLbPan] = useState({ x: 0, y: 0 })
  const [lbPanning, setLbPanning] = useState(false)
  const lbPanStart = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const [filterValues, setFilterValues] = useState({ ...DEFAULT_FILTERS })
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [editorSrc, setEditorSrc] = useState<string | null>(null)
  const [editorItem, setEditorItem] = useState<GalleryItem | null>(null)
  const [removingBg, setRemovingBg] = useState(false)
  const [captionImage, setCaptionImage] = useState<string | null>(null)

  // Batch edit mode
  const [batchMode, setBatchMode] = useState(false)
  const [showBatchOutfit, setShowBatchOutfit] = useState(false)

  // Compare mode state
  const [compareFirst, setCompareFirst] = useState<GalleryItem | null>(null)
  const [compareItems, setCompareItems] = useState<[GalleryItem, GalleryItem] | null>(null)
  const [compareMode, setCompareMode] = useState<'ab' | 'slider' | null>(null)

  // Build dynamic filters
  const filters = useMemo(() => {
    const extra: string[] = []
    if (items.some(i => getItemCategory(i) === 'Sesión')) extra.push('Sesión')
    if (items.some(i => getItemCategory(i) === 'Creación')) extra.push('Creación')
    return [...BASE_FILTERS, ...extra]
  }, [items])

  const filtered = (activeFilter === 'Todas' ? items : items.filter(i => getItemCategory(i) === activeFilter))
    .filter(item => !statusFilter || item.workflowStatus === statusFilter)

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'Recientes') return b.timestamp - a.timestamp
      if (sortBy === 'Más antiguas') return a.timestamp - b.timestamp
      if (sortBy === 'Favoritos') return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)
      return 0
    })
  }, [filtered, sortBy])

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const i of items) {
      const cat = getItemCategory(i)
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    return counts
  }, [items])

  const stats = [
    { l:'Total', v: filtered.length, c:'var(--joi-pink)' },
    { l:'Cambios de Rostro', v: categoryCounts['Cambio de Rostro'] ?? 0, c:'var(--joi-coral)' },
    { l:'Reiluminaciones', v: categoryCounts['Reiluminar'] ?? 0, c:'var(--joi-magenta)' },
    { l:'Try-Ons', v: categoryCounts['Try-On'] ?? 0, c:'var(--joi-cyan-warm)' },
    { l:'Sesiones', v: categoryCounts['Sesión'] ?? 0, c:'var(--joi-lavender)' },
  ].filter(s => s.l === 'Total' || s.v > 0)

  // --- Handlers ---

  const handleDownload = async (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation()
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `vist-${id.slice(0,8)}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      addToast('Imagen descargada', 'success')
    } catch {
      addToast('Error al descargar', 'error')
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  const handleDelete = (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation()
    setDeleteConfirm(item.id)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      removeItem(deleteConfirm)
      addToast('Imagen eliminada', 'info')
      setDeleteConfirm(null)
      if (lightboxIndex !== null) setLightboxIndex(null)
    }
  }

  const confirmBulkDelete = () => {
    removeItems(selected)
    addToast(`${selected.length} imágenes eliminadas`, 'info')
    setSelected([])
    setBulkDeleteConfirm(false)
    setBatchMode(false)
  }

  const handleBulkDownload = useCallback(async () => {
    const selectedItems = items.filter(i => selected.includes(i.id))
    addToast(`Descargando ${selectedItems.length} imágenes…`, 'info')
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i]
      try {
        const res = await fetch(item.url)
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `vist-${item.id.slice(0, 8)}-${i + 1}.png`
        a.click()
        URL.revokeObjectURL(a.href)
        await new Promise(r => setTimeout(r, 300))
      } catch {
        console.warn('Error downloading item', item.id)
      }
    }
    addToast('Descarga completa', 'success')
  }, [items, selected, addToast])

  const handleSaveFilter = async (item: GalleryItem) => {
    const filterCSS = computeFilterCSS(filterValues)
    if (filterCSS === computeFilterCSS(DEFAULT_FILTERS)) {
      addToast('No hay filtros aplicados', 'info')
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
      addToast('Filtros guardados', 'success')
    } catch {
      addToast('Error al guardar filtros', 'error')
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
    <div className="min-h-screen joi-mesh">
      <div className="px-4 lg:px-8 pt-8 pb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="joi-heading joi-glow--subtle" style={{ fontSize: '1.75rem' }}>
            <span className="joi-text-gradient">Galería</span>{' '}
            <span style={{ color: 'var(--joi-text-1)' }}>de Creaciones</span>
          </h1>
          <p className="joi-label mt-1" style={{ color: 'var(--joi-lavender)' }}>Todas tus imágenes editadas con AI en un solo lugar</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Gallery / Storyboard tab toggle */}
          <div className="flex p-0.5 rounded-lg" style={{ background:'var(--joi-bg-2)', backdropFilter:'blur(8px)' }}>
            <button onClick={()=>setGalleryTab('gallery')}
              className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: galleryTab==='gallery' ? 'var(--joi-bg-3)' : 'transparent', color: galleryTab==='gallery' ? 'var(--joi-text-1)' : 'var(--joi-text-3)' }}>
              Galería
            </button>
            <button onClick={()=>setGalleryTab('storyboard')}
              className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5"
              style={{ background: galleryTab==='storyboard' ? 'var(--joi-bg-3)' : 'transparent', color: galleryTab==='storyboard' ? 'var(--joi-violet)' : 'var(--joi-text-3)' }}>
              Storyboard
              {storyboardIds.length > 0 && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(129,140,248,.15)', color: 'var(--joi-violet)' }}>
                  {storyboardIds.length}
                </span>
              )}
            </button>
          </div>
          {galleryTab === 'gallery' && (
            <button
              onClick={() => { setBatchMode(prev => !prev); if (batchMode) setSelected([]) }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{
                background: batchMode ? 'rgba(99,102,241,.12)' : 'rgba(255,255,255,.04)',
                border: `1px solid ${batchMode ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.04)'}`,
                color: batchMode ? 'var(--joi-pink)' : 'var(--joi-text-2)',
              }}>
              {batchMode ? 'Salir de Lote' : 'Editar en Lote'}
            </button>
          )}
          {galleryTab === 'gallery' && batchMode && (
            <button
              onClick={() => setSelected(selected.length === sorted.length ? [] : sorted.map(i => i.id))}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.06)',
                color: 'var(--joi-text-2)',
              }}>
              {selected.length === sorted.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          )}
          {galleryTab === 'gallery' && selected.length > 0 && (
            <>
              <span className="text-[11px] font-mono px-3 py-1.5 rounded-lg" style={{ background:'rgba(99,102,241,.08)', color:'var(--joi-pink)' }}>
                {selected.length} seleccionadas
              </span>
              <button
                onClick={handleBulkDownload}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 hover:scale-[1.02]"
                style={{
                  background: 'rgba(129,140,248,.10)',
                  border: '1px solid rgba(129,140,248,.18)',
                  color: 'var(--joi-violet)',
                }}>
                ↓ Descargar ({selected.length})
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 hover:scale-[1.02]"
                style={{
                  background: 'rgba(239,68,68,.08)',
                  border: '1px solid rgba(239,68,68,.16)',
                  color: '#f87171',
                }}>
                ✕ Eliminar ({selected.length})
              </button>
            </>
          )}
          {galleryTab === 'gallery' && (
            <>
              <div className="flex p-0.5 rounded-lg" style={{ background:'var(--joi-bg-2)', backdropFilter:'blur(8px)' }}>
                {(['grid','masonry'] as const).map(m=>(
                  <button key={m} onClick={()=>setViewMode(m)}
                    className="px-2.5 py-1 rounded-lg text-[11px] transition-all"
                    style={{ background: viewMode===m ? 'var(--joi-bg-3)' : 'transparent', color: viewMode===m ? 'var(--joi-text-1)' : 'var(--joi-text-3)' }}>
                    {m==='grid' ? '\u229e' : '\u229f'}
                  </button>
                ))}
              </div>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[11px] outline-none"
                style={{ background:'var(--joi-bg-2)', border:'1px solid rgba(255,255,255,.04)', color:'var(--joi-text-2)', backdropFilter:'blur(8px)' }}>
                {sortOpts.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Storyboard tab */}
      {galleryTab === 'storyboard' && (
        <div className="px-8 py-6 flex-1">
          <StoryboardView />
        </div>
      )}

      {/* Gallery tab content */}
      {galleryTab === 'gallery' && <>
      {/* Filter chips */}
      <div className="px-4 lg:px-8 py-3 flex gap-1.5 overflow-x-auto joi-scroll flex-nowrap">
        {filters.map(f => (
          <button key={f} onClick={()=>setActiveFilter(f)}
            className="px-3.5 py-1.5 rounded-lg text-[11px] font-medium shrink-0 transition-all"
            style={{
              background: activeFilter===f ? 'rgba(99,102,241,.08)' : 'var(--joi-bg-2)',
              border: `1px solid ${activeFilter===f ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.04)'}`,
              color: activeFilter===f ? 'var(--joi-pink)' : 'var(--joi-text-2)',
              backdropFilter: 'blur(8px)',
            }}>{f}</button>
        ))}
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 px-8 pb-2 flex-wrap">
        {([
          { id: null, label: 'Todos los estados' },
          { id: 'borrador', label: '📝 Borrador' },
          { id: 'editado', label: '✏️ Editado' },
          { id: 'aprobado', label: '✓ Aprobado' },
          { id: 'publicado', label: '↑ Publicado' },
        ] as const).map(s => (
          <button key={String(s.id)} onClick={() => setStatusFilter(s.id as string | null)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
            style={{
              background: statusFilter === s.id ? 'rgba(99,102,241,.1)' : 'rgba(255,255,255,.03)',
              border: `1px solid ${statusFilter === s.id ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.05)'}`,
              color: statusFilter === s.id ? 'var(--joi-pink)' : 'var(--joi-text-3)',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="px-8 py-2 flex gap-4">
        {stats.map(s=>(
          <div key={s.l} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full joi-breathe" style={{ background:s.c }} />
            <span className="text-[10px]" style={{ color:'var(--joi-text-3)' }}>{s.l}:</span>
            <span className="text-[11px] font-mono font-bold" style={{ color:s.c }}>{String(s.v)}</span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="px-8 pb-8 flex items-center justify-center" style={{ minHeight: '50vh' }}>
          <div className="joi-glass px-10 py-12 text-center rounded-2xl" style={{ maxWidth: '460px', border: '1px solid rgba(255,255,255,.04)' }}>
            <div className="text-3xl mb-4">✦</div>
            <h2 className="joi-heading text-lg mb-2">Tu galería está vacía</h2>
            <p className="text-[12px] mb-6" style={{ color:'var(--joi-text-3)' }}>
              ¡Empieza a crear! Dirige una toma o edita una imagen con herramientas AI.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => onNav?.('studio')} className="joi-btn-solid px-5 py-2.5 text-[12px]">
                ◎ Dirigir una Escena
              </button>
              <button onClick={() => onNav?.('studio')} className="joi-btn-ghost px-5 py-2.5 text-[12px]">
                ✦ Abrir Editor AI
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Image Grid */
        <div className={`px-4 lg:px-8 pb-8 ${viewMode==='grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3' : 'columns-2 sm:columns-3 lg:columns-5 gap-3 space-y-3'}`}>
          {sorted.map((img, idx) => {
            const charName = characters.find(c => c.id === img.characterId)?.name || 'Sin personaje'
            const category = getItemCategory(img)
            const dateStr = new Date(img.timestamp).toLocaleDateString('es', { day:'numeric', month:'short' })
            const colorMap: Record<number, string> = { 0:'var(--joi-pink)', 1:'var(--joi-lavender)', 2:'var(--joi-coral)' }
            const fallbackColor = colorMap[idx % 3] || 'var(--joi-pink)'

            return (
              <div
                key={img.id}
                onClick={() => {
                  if (batchMode) { toggleSelect(img.id) }
                  else { setEditorSrc(img.url); setEditorItem(img) }
                }}
                className={`group cursor-pointer rounded-xl overflow-hidden relative transition-all hover:scale-[1.02] joi-border-glow ${viewMode==='masonry' ? 'break-inside-avoid' : ''}`}
                style={{
                  border: `1px solid ${selected.includes(img.id) ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.04)'}`,
                  boxShadow: selected.includes(img.id) ? '0 0 20px rgba(99,102,241,.12)' : 'none',
                  background: 'var(--joi-bg-glass)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className={viewMode==='grid' ? 'aspect-square' : ''}
                  style={{
                    background: img.url ? undefined : `linear-gradient(${90 + idx * 15}deg, ${fallbackColor}18, var(--joi-bg-2))`,
                    minHeight: viewMode==='masonry' ? `${140 + (idx%4)*40}px` : undefined,
                  }}
                >
                  {img.url ? (
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <div className="text-center">
                        <span className="text-2xl block mb-1 opacity-30">{charName[0]}</span>
                        <span className="text-[9px] font-mono opacity-40" style={{ color:'var(--joi-text-1)' }}>{category}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Workflow status badge */}
                {img.workflowStatus && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full backdrop-blur-sm" style={{
                      background: img.workflowStatus === 'aprobado' ? 'rgba(80,216,160,.15)' :
                                  img.workflowStatus === 'publicado' ? 'rgba(80,160,255,.15)' :
                                  img.workflowStatus === 'editado' ? 'rgba(99,102,241,.12)' :
                                  'rgba(255,255,255,.08)',
                      color: img.workflowStatus === 'aprobado' ? '#50d8a0' :
                             img.workflowStatus === 'publicado' ? '#50a0ff' :
                             img.workflowStatus === 'editado' ? 'var(--joi-pink)' :
                             'var(--joi-text-3)',
                      border: `1px solid ${
                        img.workflowStatus === 'aprobado' ? 'rgba(80,216,160,.2)' :
                        img.workflowStatus === 'publicado' ? 'rgba(80,160,255,.2)' :
                        img.workflowStatus === 'editado' ? 'rgba(99,102,241,.2)' :
                        'rgba(255,255,255,.06)'
                      }`,
                    }}>
                      {({ borrador: 'Borrador', editado: 'Editado', aprobado: '✓ Aprobado', publicado: '↑ Publicado' } as const)[img.workflowStatus]}
                    </span>
                  </div>
                )}

                {/* Hover overlay — minimal, click opens editor */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-end pointer-events-none">
                  <div className="w-full p-2.5 translate-y-full group-hover:translate-y-0 transition-transform">
                    <div className="text-[10px] font-semibold text-white truncate">{charName}</div>
                    <div className="text-[8px] font-mono text-white/50">{category} · {dateStr}</div>
                  </div>
                </div>

                {/* Info bar */}
                <div className="px-2 py-1.5" style={{ background: 'var(--joi-bg-2)' }}>
                  <div className="text-[9px] font-medium truncate" style={{ color: 'var(--joi-text-2)' }}>
                    {charName} · {category}
                  </div>
                  <div className="text-[8px]" style={{ color: 'var(--joi-text-3)' }}>{dateStr}</div>
                </div>

                {/* Select indicator / batch checkbox */}
                {batchMode && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center text-[10px] transition-all"
                    style={{
                      background: selected.includes(img.id) ? 'var(--joi-pink)' : 'rgba(255,255,255,0.12)',
                      border: selected.includes(img.id) ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                    }}>
                    {selected.includes(img.id) ? '\u2713' : ''}
                  </div>
                )}
                {!batchMode && selected.includes(img.id) && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] text-white"
                    style={{ background:'var(--joi-pink)' }}>{'\u2713'}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Batch mode floating action bar */}
      {batchMode && selected.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{
            background: 'rgba(14,12,20,0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.08)',
          }}
        >
          <span className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
            {selected.length} seleccionadas
          </span>
          <button
            onClick={() => setShowBatchOutfit(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
            }}
          >
            {'\uD83D\uDC57'} Cambiar Ropa
          </button>
          <button
            onClick={() => { setSelected([]); setBatchMode(false) }}
            className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--joi-text-3)',
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      </>}
      {/* End gallery tab content */}


      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(8,7,12,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDeleteConfirm(null)}>
          <div className="joi-glass p-6 rounded-2xl max-w-xs text-center" onClick={e => e.stopPropagation()}
            style={{ border: '1px solid rgba(255,60,60,.15)' }}>
            <div className="text-2xl mb-3">🗑</div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--joi-text-1)' }}>¿Eliminar esta creación?</h3>
            <p className="text-[11px] mb-5" style={{ color: 'var(--joi-text-3)' }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="joi-btn-ghost flex-1 py-2 text-[11px]">Cancelar</button>
              <button onClick={confirmDelete}
                className="flex-1 py-2 rounded-xl text-[11px] font-medium transition-all"
                style={{ background: 'rgba(255,60,60,.15)', color: '#e05050', border: '1px solid rgba(255,60,60,.2)' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(8,7,12,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setBulkDeleteConfirm(false)}>
          <div className="joi-glass p-6 rounded-2xl max-w-xs text-center" onClick={e => e.stopPropagation()}
            style={{ border: '1px solid rgba(255,60,60,.15)' }}>
            <div className="text-2xl mb-3">🗑</div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--joi-text-1)' }}>¿Eliminar {selected.length} imágenes?</h3>
            <p className="text-[11px] mb-5" style={{ color: 'var(--joi-text-3)' }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setBulkDeleteConfirm(false)}
                className="joi-btn-ghost flex-1 py-2 text-[11px]">Cancelar</button>
              <button onClick={confirmBulkDelete}
                className="flex-1 py-2 rounded-xl text-[11px] font-medium transition-all"
                style={{ background: 'rgba(255,60,60,.15)', color: '#e05050', border: '1px solid rgba(255,60,60,.2)' }}>
                Eliminar todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Editor — opens on card click, with contextual actions in sidebar */}
      {editorSrc && (
        <Suspense fallback={null}>
          <ImageEditor
            imageUrl={editorSrc}
            onSave={(editedDataUrl) => {
              addItems([{ id: crypto.randomUUID(), url: editedDataUrl, type: 'edit', model: 'basic-editor', tags: ['edited'], timestamp: Date.now() }])
              addToast('Imagen editada guardada', 'success')
            }}
            onClose={() => { setEditorSrc(null); setEditorItem(null) }}
            actions={editorItem && <>
              <button
                onClick={() => {
                  const url = editorItem.url
                  setEditorSrc(null); setEditorItem(null)
                  if (onEditImage) onEditImage(url)
                  else { navigateToEditor(url); onNav?.('studio') }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-all hover:scale-[1.02]"
                style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-1)' }}>
                ✦ Editor IA
              </button>
              <button
                onClick={async () => {
                  const url = editorItem.url
                  setRemovingBg(true)
                  try {
                    const resultUrl = await removeBackground(url)
                    addItems([{ id: crypto.randomUUID(), url: resultUrl, type: 'edit', model: 'bg-removal', tags: ['background-removed'], timestamp: Date.now() }])
                    addToast('Fondo eliminado', 'success')
                  } catch {
                    addToast('Error al quitar fondo', 'error')
                  } finally {
                    setRemovingBg(false)
                  }
                }}
                disabled={removingBg}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(80,216,160,.08)', border: '1px solid rgba(80,216,160,.15)', color: '#50d8a0', opacity: removingBg ? 0.5 : 1 }}>
                {removingBg ? '⟳ Quitando fondo...' : '✂ Quitar Fondo'}
              </button>
              <button
                onClick={(e) => { handleDownload(e, editorItem.url, editorItem.id) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--joi-text-2)' }}>
                ↓ Descargar
              </button>
              <button
                onClick={(e) => { handleDelete(e, editorItem); setEditorSrc(null); setEditorItem(null) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,60,60,.06)', border: '1px solid rgba(255,60,60,.12)', color: '#f87171' }}>
                ✕ Eliminar
              </button>
              <div style={{ borderTop: '1px solid rgba(255,255,255,.04)', paddingTop: 8, marginTop: 4 }}>
                <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,.2)' }}>Estado</div>
                <div className="flex flex-col gap-1">
                  {(['borrador', 'editado', 'aprobado', 'publicado'] as const).map(status => {
                    const labels: Record<string, string> = { borrador: '📝 Borrador', editado: '✏️ Editado', aprobado: '✓ Aprobado', publicado: '↑ Publicado' }
                    const isActive = editorItem.workflowStatus === status
                    return (
                      <button
                        key={status}
                        onClick={() => updateItem(editorItem.id, { workflowStatus: status })}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all text-left"
                        style={{
                          background: isActive ? 'rgba(99,102,241,.1)' : 'rgba(255,255,255,.02)',
                          border: `1px solid ${isActive ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.05)'}`,
                          color: isActive ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                        }}
                      >
                        {labels[status]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>}
          />
        </Suspense>
      )}

      {/* Caption Generator modal */}
      {captionImage && (
        <Suspense fallback={null}>
          <CaptionModal
            imageUrl={captionImage}
            onClose={() => setCaptionImage(null)}
          />
        </Suspense>
      )}

      {/* Compare selection banner */}
      {compareFirst && !compareItems && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{
            background: 'rgba(14,12,20,0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(129,140,248,0.25)',
          }}
        >
          <img src={compareFirst.url} alt="" className="w-8 h-8 rounded-lg object-cover" style={{ border: '2px solid #818CF8' }} />
          <span className="text-[11px] text-white font-medium">Selecciona una segunda imagen para comparar</span>
          <button
            onClick={() => setCompareFirst(null)}
            className="px-3 py-1 rounded-lg text-[10px] font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--joi-text-2)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* A/B Comparator overlay */}
      {compareItems && compareMode === 'ab' && (
        <ABComparator
          itemA={compareItems[0]}
          itemB={compareItems[1]}
          onClose={() => { setCompareItems(null); setCompareMode(null) }}
        />
      )}

      {/* Compare Slider Modal overlay */}
      {compareItems && compareMode === 'slider' && (
        <CompareSliderModal
          itemA={compareItems[0]}
          itemB={compareItems[1]}
          onClose={() => { setCompareItems(null); setCompareMode(null) }}
        />
      )}

      {/* Compare mode switcher (shown when a comparison is active) */}
      {compareItems && compareMode && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1 rounded-xl shadow-2xl"
          style={{
            background: 'rgba(14,12,20,0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(129,140,248,0.2)',
          }}
        >
          <button
            onClick={() => setCompareMode('ab')}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: compareMode === 'ab' ? 'rgba(129,140,248,0.15)' : 'transparent',
              color: compareMode === 'ab' ? '#818CF8' : 'var(--joi-text-3)',
              border: compareMode === 'ab' ? '1px solid rgba(129,140,248,0.2)' : '1px solid transparent',
            }}
          >
            A/B Lado a Lado
          </button>
          <button
            onClick={() => setCompareMode('slider')}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: compareMode === 'slider' ? 'rgba(129,140,248,0.15)' : 'transparent',
              color: compareMode === 'slider' ? '#818CF8' : 'var(--joi-text-3)',
              border: compareMode === 'slider' ? '1px solid rgba(129,140,248,0.2)' : '1px solid transparent',
            }}
          >
            Deslizador
          </button>
        </div>
      )}

      {/* Batch Outfit Modal */}
      {showBatchOutfit && selected.length > 0 && (
        <Suspense fallback={null}>
          <BatchOutfitModal
            imageUrls={selected.map(id => items.find(i => i.id === id)?.url).filter(Boolean) as string[]}
            onClose={() => setShowBatchOutfit(false)}
            onComplete={() => {
              setShowBatchOutfit(false)
              setSelected([])
              setBatchMode(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

export default Gallery
