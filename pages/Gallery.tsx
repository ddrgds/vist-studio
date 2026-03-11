import { useState, useMemo } from 'react'
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore'
import { useCharacterStore } from '../stores/characterStore'

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

export function Gallery({ onNav }: { onNav?: (page: string) => void }) {
  const items = useGalleryStore(s => s.items)
  const characters = useCharacterStore(s => s.characters)
  const toggleFavorite = useGalleryStore(s => s.toggleFavorite)

  const [activeFilter, setActiveFilter] = useState('All')
  const [viewMode, setViewMode] = useState<'grid'|'masonry'>('grid')
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('Recent')

  // Build dynamic filters — add Sesión / Creación if items of those types exist
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

  // Stats derived from real data
  const stats = [
    { l:'Total Creations', v: filtered.length.toString(), c:'var(--accent)' },
    { l:'Face Swaps', v: items.filter(i => getItemCategory(i) === 'Face Swap').length.toString(), c:'var(--rose)' },
    { l:'Relights', v: items.filter(i => getItemCategory(i) === 'Relight').length.toString(), c:'var(--magenta)' },
    { l:'Try-Ons', v: items.filter(i => getItemCategory(i) === 'Try-On').length.toString(), c:'var(--mint)' },
  ]

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
                onClick={()=>toggleSelect(img.id)}
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
                        <button className="w-6 h-6 rounded-md flex items-center justify-center text-[10px]"
                          style={{ background:'rgba(255,255,255,.15)' }}>↓</button>
                        <button
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px]"
                          style={{ background: img.favorite ? 'rgba(240,104,72,.3)' : 'rgba(255,255,255,.15)' }}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(img.id) }}>
                          {img.favorite ? '★' : '☆'}
                        </button>
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
    </div>
  )
}

export default Gallery
