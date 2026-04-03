import { useState, useEffect, useMemo, useRef } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore } from '../stores/galleryStore'
import { useToast } from '../contexts/ToastContext'
import type { GalleryItem } from '../stores/galleryStore'

const gradients = [
  'linear-gradient(135deg,#f06848,#4f46e5)',
  'linear-gradient(135deg,#4858e0,#50d8a0)',
  'linear-gradient(135deg,#4f46e5,#f06848)',
  'linear-gradient(135deg,#4858e0,#4f46e5)',
]
function getGradientForIndex(i: number) { return gradients[i % gradients.length] }

const detailTabs = ['Resumen','Fotos','Ediciones AI','Ajustes']

/** Generate a human-readable bio from character attributes (NOT the raw AI prompt) */
function buildReadableBio(c: { name: string; renderStyle?: string; personalityTraits?: string[]; outfitDescription?: string }): string {
  const parts: string[] = []
  if (c.renderStyle) parts.push(`${c.renderStyle} style`)
  if (c.personalityTraits?.length) parts.push(c.personalityTraits.slice(0, 4).join(', '))
  if (c.outfitDescription) parts.push(c.outfitDescription)
  if (parts.length === 0) return `${c.name} — un influencer virtual creado en VIST Studio.`
  return `${c.name} — ${parts.join('. ')}.`
}

export function CharacterGallery({ onNav }: { onNav?: (page: string) => void }) {
  const [selectedChar, setSelectedChar] = useState<number | null>(null)
  const [detailTab, setDetailTab] = useState('Resumen')

  const storeCharacters = useCharacterStore(s => s.characters)
  const isLoadingChars = useCharacterStore(s => s.isLoading)
  const trainLoRA = useCharacterStore(s => s.trainLoRA)
  const updateCharacter = useCharacterStore(s => s.updateCharacter)
  const removeCharacter = useCharacterStore(s => s.removeCharacter)
  const galleryItems = useGalleryStore(s => s.items)
  const toast = useToast()

  const [refSelectMode, setRefSelectMode] = useState(false)
  const [pendingRefs, setPendingRefs] = useState<string[]>([])

  // Photo context menu
  const [contextMenu, setContextMenu] = useState<{ item: GalleryItem; x: number; y: number } | null>(null)
  const [reassignTarget, setReassignTarget] = useState<GalleryItem | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const removeGalleryItem = useGalleryStore(s => s.removeItem)
  const updateGalleryItem = useGalleryStore(s => s.updateItem)

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  const handleDownloadPhoto = async (item: GalleryItem) => {
    setContextMenu(null)
    try {
      const res = await fetch(item.url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `vist-${item.id.slice(0, 8)}.jpg`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { toast.error('Error al descargar') }
  }

  const handleDeletePhoto = (item: GalleryItem) => {
    setContextMenu(null)
    if (!confirm('¿Eliminar esta foto? No se puede deshacer.')) return
    removeGalleryItem(item.id)
    toast.success('Foto eliminada')
  }

  const handleReassign = (item: GalleryItem) => {
    setContextMenu(null)
    setReassignTarget(item)
  }

  const confirmReassign = (targetCharId: string) => {
    if (!reassignTarget) return
    updateGalleryItem(reassignTarget.id, { characterId: targetCharId })
    const targetChar = storeCharacters.find(c => c.id === targetCharId)
    toast.success(`Foto reasignada a ${targetChar?.name || 'otro personaje'}`)
    setReassignTarget(null)
  }

  const characters = useMemo(() => storeCharacters.map((c, idx) => {
    const charItems = galleryItems.filter(i => i.characterId === c.id)
    const editCount = charItems.filter(i => i.type === 'edit').length
    return {
      id: c.id,
      name: c.name,
      handle: `@${c.name.toLowerCase().replace(/\s+/g, '')}`,
      style: [c.renderStyle, ...(c.personalityTraits || []).slice(0, 2)].filter(Boolean).join(' · ') || 'Sin descripción',
      bio: buildReadableBio(c),
      rawPrompt: c.characteristics || '',
      usageCount: c.usageCount || 0,
      photos: charItems.length,
      edits: editCount,
      gradient: getGradientForIndex(idx),
      avatar: c.thumbnail ? null : c.name[0],
      thumbnailUrl: c.thumbnail || null,
      created: new Date(c.createdAt).toLocaleDateString('es', { month:'short', year:'numeric' }),
    }
  }), [storeCharacters, galleryItems])

  // Bounds check when characters change
  useEffect(() => {
    if (selectedChar !== null && selectedChar >= storeCharacters.length) {
      setSelectedChar(null)
    }
  }, [storeCharacters, selectedChar])

  // Reset ref select mode when switching characters
  useEffect(() => {
    setRefSelectMode(false)
    setPendingRefs([])
  }, [selectedChar])

  const totalPhotos = characters.reduce((sum, c) => sum + c.photos, 0)
  const totalEdits = characters.reduce((sum, c) => sum + c.edits, 0)
  const totalUses = characters.reduce((sum, c) => sum + c.usageCount, 0)

  // Gallery items for the selected character
  const selectedCharId = selectedChar !== null ? characters[selectedChar]?.id : null
  const charGalleryItems = selectedCharId ? galleryItems.filter(i => i.characterId === selectedCharId) : []
  const charPhotoItems = charGalleryItems.filter(i => i.type === 'create' || i.type === 'session')
  const charEditItems = charGalleryItems.filter(i => i.type === 'edit')

  if (isLoadingChars) {
    return (
      <div className="min-h-screen joi-mesh" style={{ background: 'var(--joi-bg-0)' }}>
        <div className="px-8 pt-8 pb-2">
          <div className="h-7 w-48 rounded-lg animate-pulse mb-2" style={{ background: 'rgba(255,255,255,.05)' }} />
          <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'rgba(255,255,255,.03)' }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-8 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse"
              style={{ height: 200, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.04)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (storeCharacters.length === 0) {
    return (
      <div className="min-h-screen joi-mesh flex items-center justify-center" style={{ background: 'var(--joi-bg-0)' }}>
        <div className="joi-glass px-10 py-12 text-center max-w-md rounded-2xl" style={{ border: '1px solid rgba(255,255,255,.04)' }}>
          <div className="text-3xl mb-4">✦</div>
          <h2 className="joi-heading text-lg mb-2">Aún no hay personajes</h2>
          <p className="text-[12px] mb-6" style={{ color:'var(--joi-text-3)' }}>
            Los personajes son tus influencers virtuales. Crea uno para empezar a generar contenido.
          </p>
          <button onClick={() => onNav?.('create')}
            className="joi-btn-solid px-6 py-2.5 text-sm joi-breathe">
            ⊕ Crear Tu Primer Personaje
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--joi-bg-0)' }}>
      <div className="px-4 md:px-8 pt-8 pb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            <span style={{ color: 'var(--joi-pink)' }}>Galería de</span> <span style={{ color: 'var(--joi-text-1)' }}>Personajes</span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--joi-text-3)' }}>Tu colección de influencers virtuales</p>
        </div>
        <button className="btn-primary px-5 py-2.5 text-sm">⊕ Nuevo Personaje</button>
      </div>

      {/* Stats */}
      <div className="px-4 md:px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { l:'Personajes', v:String(characters.length), c:'var(--accent)' },
          { l:'Usos Totales', v:String(totalUses), c:'var(--mint)' },
          { l:'Fotos', v:String(totalPhotos), c:'var(--rose)' },
          { l:'Ediciones AI', v:String(totalEdits), c:'var(--magenta)' },
        ].map(s=>(
          <div key={s.l} className="px-4 py-3 rounded-md" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--joi-text-3)' }}>{s.l}</div>
            <div className="text-lg font-bold mt-0.5" style={{ color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="px-4 md:px-8 pb-20 md:pb-8 flex gap-6">
        {/* Character Cards — hidden on mobile when detail is open */}
        <div className={`${selectedChar !== null ? 'hidden md:block md:w-[360px] md:shrink-0' : 'w-full'} space-y-3 transition-all`}>
          {characters.map((c, i) => (
            <div
              key={c.id}
              onClick={() => { setSelectedChar(i); setDetailTab('Resumen'); }}
              className={`overflow-hidden cursor-pointer transition-all rounded-md joi-glass`}
              style={{
                background: 'var(--joi-bg-2)',
                border: `1px solid ${selectedChar===i ? 'rgba(240,104,72,.25)' : 'rgba(255,255,255,.04)'}`,
                boxShadow: selectedChar===i ? '0 0 25px rgba(240,104,72,.08)' : undefined,
              }}
            >
              <div className="flex">
                <div className="w-24 shrink-0 relative" style={{ background: c.gradient }}>
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">{c.avatar}</div>
                  )}
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color:'var(--joi-text-1)' }}>{c.name}</h3>
                      <span className="text-[10px] font-mono" style={{ color:'var(--accent)' }}>{c.handle}</span>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-md"
                      style={{
                        background: 'rgba(99,102,241,.06)',
                        color: 'var(--joi-text-3)',
                        border: '1px solid rgba(255,255,255,.06)',
                      }}>{c.photos} fotos</span>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color:'var(--joi-text-3)' }}>{c.style}</p>
                  {selectedChar === null && (
                    <div className="flex gap-4 mt-3 pt-3" style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
                      {[
                        { l:'Usos', v:c.usageCount },
                        { l:'Fotos', v:c.photos },
                        { l:'Ediciones AI', v:c.edits },
                        { l:'Creado', v:c.created },
                      ].map(s=>(
                        <div key={s.l}>
                          <div className="text-xs font-bold" style={{ color:'var(--joi-text-1)' }}>{s.v}</div>
                          <div className="text-[8px] font-mono" style={{ color:'var(--joi-text-3)' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {selectedChar !== null && characters[selectedChar] && (
          <div className="flex-1 min-w-0 anim-in">
            {/* Mobile back button */}
            <button className="md:hidden mb-3 flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg w-full"
              style={{ color: 'var(--joi-text-2)', background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}
              onClick={() => setSelectedChar(null)}>
              ← Volver a Personajes
            </button>
          <div className="anim-in">
            <div className="overflow-hidden rounded-md" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
              <div className="h-40 relative" style={{ background: characters[selectedChar].gradient }}>
                {characters[selectedChar].thumbnailUrl && (
                  <img src={characters[selectedChar].thumbnailUrl!} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <div className="absolute inset-0" style={{ background:'radial-gradient(circle at 30% 40%, rgba(255,255,255,.1) 0%, transparent 60%)' }} />
                <button onClick={()=>setSelectedChar(null)} className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
                  style={{ background:'rgba(0,0,0,.3)', color:'#fff' }}>✕</button>
                <div className="absolute bottom-4 left-5 flex items-end gap-3">
                  <div className="w-16 h-16 rounded-md flex items-center justify-center text-3xl overflow-hidden"
                    style={{ background:'var(--joi-bg-2)', border:'3px solid var(--joi-bg-2)', boxShadow:'0 4px 16px rgba(0,0,0,.3)' }}>
                    {characters[selectedChar].thumbnailUrl ? (
                      <img src={characters[selectedChar].thumbnailUrl!} className="w-full h-full object-cover" />
                    ) : (
                      characters[selectedChar].avatar
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{characters[selectedChar].name}</h2>
                    <span className="text-[11px] font-mono" style={{ color:'rgba(255,255,255,.7)' }}>{characters[selectedChar].handle}</span>
                  </div>
                </div>
              </div>

              <div className="flex px-5 gap-1" style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                {detailTabs.map(t=>(
                  <button key={t} onClick={()=>setDetailTab(t)}
                    className="px-3 py-2.5 text-[11px] font-medium relative transition-all"
                    style={{ color: detailTab===t ? 'var(--accent)' : 'var(--joi-text-3)' }}>
                    {t}
                    {detailTab===t && <div className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full" style={{ background:'var(--accent)' }} />}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {detailTab === 'Resumen' && (
                  <div className="space-y-5">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color:'var(--joi-text-3)' }}>Biografía</div>
                      <p className="text-sm" style={{ color:'var(--joi-text-2)' }}>{characters[selectedChar].bio}</p>
                    </div>

                    {/* Model / consistency images */}
                    {(() => {
                      const sc = storeCharacters[selectedChar]
                      const urls = sc?.modelImageUrls ?? []
                      if (urls.length === 0) return null
                      return (
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--joi-text-3)' }}>
                            Imágenes de Consistencia IA
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {urls.map((url, i) => (
                              <div key={i} className="aspect-square rounded-lg overflow-hidden relative"
                                style={{ border: `1px solid ${i === 0 ? 'rgba(255,107,157,.35)' : 'rgba(255,255,255,.06)'}` }}>
                                <img src={url} className="w-full h-full object-cover" />
                                {i === 0 && (
                                  <div className="absolute bottom-0 inset-x-0 text-[7px] text-center py-0.5 font-mono"
                                    style={{ background: 'rgba(0,0,0,.65)', color: 'var(--joi-pink)' }}>
                                    principal
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] mt-1.5" style={{ color:'var(--joi-text-3)' }}>
                            Estas imágenes se pasan automáticamente como referencia al generar contenido.
                          </p>
                        </div>
                      )
                    })()}

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { l:'Usos', v:characters[selectedChar].usageCount, c:'var(--accent)' },
                        { l:'Fotos', v:characters[selectedChar].photos, c:'var(--magenta)' },
                        { l:'Ediciones AI', v:characters[selectedChar].edits, c:'var(--rose)' },
                        { l:'Creado', v:characters[selectedChar].created, c:'var(--blue)' },
                      ].map(s=>(
                        <div key={s.l} className="p-3 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                          <div className="text-lg font-bold" style={{ color:s.c }}>{s.v}</div>
                          <div className="text-[9px] font-mono" style={{ color:'var(--joi-text-3)' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--joi-text-3)' }}>
                        Últimas Creaciones
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {charGalleryItems.length > 0
                          ? charGalleryItems.slice(0, 10).map(item => (
                              <div key={item.id} className="aspect-square rounded-lg overflow-hidden" style={{ border:'1px solid rgba(255,255,255,.04)' }}>
                                <img src={item.url} className="w-full h-full object-cover" />
                              </div>
                            ))
                          : [1,2,3,4,5,6,7,8,9,10].map(i => (
                              <div key={i} className="aspect-square rounded-lg shimmer" style={{ border:'1px solid rgba(255,255,255,.04)' }} />
                            ))
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--joi-text-3)' }}>
                        Ediciones por Tipo
                      </div>
                      <div className="space-y-1.5">
                        {(() => {
                          const editTypes = [
                            { l:'Reiluminar', tag:'relight', c:'var(--accent)' },
                            { l:'Cambio de Rostro', tag:'faceswap', c:'var(--rose)' },
                            { l:'Try-On', tag:'tryon', c:'var(--magenta)' },
                            { l:'360°', tag:'360', c:'var(--blue)' },
                            { l:'Fondo', tag:'background', c:'var(--mint)' },
                          ]
                          const counts = editTypes.map(t => ({
                            ...t,
                            v: charEditItems.filter(i => (i.model || '').toLowerCase().includes(t.tag) || (i.tags || []).includes(t.tag)).length,
                          }))
                          const maxVal = Math.max(...counts.map(c => c.v), 1)
                          return counts.map(b => ({ ...b, max: maxVal }))
                        })().map(b=>(
                          <div key={b.l} className="flex items-center gap-2">
                            <span className="text-[10px] w-20 shrink-0" style={{ color:'var(--joi-text-2)' }}>{b.l}</span>
                            <div className="flex-1 h-2 rounded-full" style={{ background:'var(--joi-bg-3)' }}>
                              <div className="h-full rounded-full" style={{ width:`${(b.v/b.max)*100}%`, background:b.c }} />
                            </div>
                            <span className="text-[10px] font-mono w-6 text-right" style={{ color:b.c }}>{b.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-primary flex-1 py-2.5 text-sm">Nueva Sesión</button>
                      <button className="btn-ghost flex-1 py-2.5 text-sm">Editar con AI</button>
                    </div>

                    {/* LoRA Training */}
                    <div className="mt-4">
                      {(() => {
                        const sc = storeCharacters[selectedChar]
                        if (!sc) return null
                        if (sc.loraTrainingStatus === 'ready') {
                          return (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                              style={{ background: 'rgba(80,216,160,0.1)', border: '1px solid rgba(80,216,160,0.15)' }}>
                              <span className="text-sm" style={{ color: '#50d8a0' }}>&#10003;</span>
                              <span className="text-[12px] font-medium" style={{ color: 'var(--joi-text-2)' }}>LoRA entrenado</span>
                              {sc.loraTrainedAt && (
                                <span className="ml-auto text-[9px] font-mono" style={{ color: 'var(--joi-text-3)' }}>
                                  {new Date(sc.loraTrainedAt).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          )
                        }
                        if (sc.loraTrainingStatus === 'training') {
                          return (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                              style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.15)' }}>
                              <span className="inline-block w-3.5 h-3.5 border-2 border-[#818CF8]/30 border-t-[#818CF8] rounded-full animate-spin" />
                              <span className="text-[12px] font-medium" style={{ color: 'var(--joi-text-2)' }}>Entrenando LoRA (~15 min)...</span>
                            </div>
                          )
                        }
                        if (sc.loraTrainingStatus === 'failed') {
                          return (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                              style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.15)' }}>
                              <span className="text-sm" style={{ color: '#ff6b6b' }}>!</span>
                              <span className="text-[12px] font-medium" style={{ color: 'var(--joi-text-2)' }}>Entrenamiento fallido</span>
                              <button
                                onClick={async () => {
                                  try { await trainLoRA(sc.id); toast.success('Entrenamiento LoRA reiniciado') }
                                  catch (e: any) { toast.error(e.message || 'Entrenamiento fallido') }
                                }}
                                className="ml-auto text-[10px] font-medium px-2 py-1 rounded-md"
                                style={{ background: 'rgba(129,140,248,0.15)', color: '#818CF8' }}>
                                Reintentar
                              </button>
                            </div>
                          )
                        }
                        // idle / no status
                        const photoCount = sc.modelImageBlobs?.length || sc.modelImageUrls?.length || 0
                        return (
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Entrenar LoRA para ${sc.name}? Cuesta 571 créditos y tarda ~15 minutos.`)) return
                              try {
                                await trainLoRA(sc.id)
                                toast.success('Entrenamiento LoRA iniciado')
                              } catch (e: any) {
                                toast.error(e.message || 'Entrenamiento fallido')
                              }
                            }}
                            disabled={photoCount < 5}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-all"
                            style={{
                              background: photoCount < 5 ? 'rgba(255,255,255,0.03)' : 'rgba(129,140,248,0.15)',
                              color: photoCount < 5 ? 'var(--joi-text-3)' : '#818CF8',
                              border: `1px solid ${photoCount < 5 ? 'rgba(255,255,255,0.04)' : 'rgba(129,140,248,0.25)'}`,
                              cursor: photoCount < 5 ? 'not-allowed' : 'pointer',
                            }}>
                            Entrenar LoRA{photoCount < 5 ? ` (faltan ${5 - photoCount} fotos más)` : ' (571 créditos)'}
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                )}
                {detailTab === 'Fotos' && (
                  <div>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>
                        {charPhotoItems.length} fotos
                      </span>
                      {!refSelectMode ? (
                        <button
                          onClick={() => {
                            const sc = selectedChar !== null ? storeCharacters[selectedChar] : null
                            setPendingRefs(sc?.referencePhotoUrls ?? [])
                            setRefSelectMode(true)
                          }}
                          className="text-[11px] px-3 py-1 rounded-lg transition-colors"
                          style={{
                            background: 'rgba(99,102,241,0.08)',
                            color: 'var(--joi-pink)',
                            border: '1px solid rgba(99,102,241,0.15)',
                          }}
                        >
                          Gestionar Referencias
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono" style={{ color: 'var(--joi-text-3)' }}>
                            {pendingRefs.length}/20
                          </span>
                          <button
                            onClick={() => setRefSelectMode(false)}
                            className="text-[10px] px-2 py-1 rounded"
                            style={{ color: 'var(--joi-text-3)' }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => {
                              const sc = selectedChar !== null ? storeCharacters[selectedChar] : null
                              if (!sc) return
                              updateCharacter(sc.id, { referencePhotoUrls: pendingRefs })
                              setRefSelectMode(false)
                              toast.success(`${pendingRefs.length} referencias guardadas`)
                            }}
                            className="text-[11px] px-3 py-1 rounded-lg font-medium"
                            style={{ background: 'var(--joi-pink)', color: '#fff' }}
                          >
                            Guardar
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Photo grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {charPhotoItems.length > 0
                        ? charPhotoItems.map(item => {
                            const sc = selectedChar !== null ? storeCharacters[selectedChar] : null
                            const isRef = refSelectMode
                              ? pendingRefs.includes(item.url)
                              : sc?.referencePhotoUrls?.includes(item.url) ?? false
                            return (
                              <div
                                key={item.id}
                                className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform group"
                                style={{ border: `1px solid ${isRef && refSelectMode ? 'rgba(99,102,241,.35)' : 'rgba(255,255,255,.04)'}` }}
                                onClick={() => {
                                  if (!refSelectMode) return
                                  if (isRef) {
                                    setPendingRefs(prev => prev.filter(u => u !== item.url))
                                  } else if (pendingRefs.length < 20) {
                                    setPendingRefs(prev => [...prev, item.url])
                                  }
                                }}
                                onContextMenu={(e) => {
                                  if (refSelectMode) return
                                  e.preventDefault()
                                  setContextMenu({ item, x: e.clientX, y: e.clientY })
                                }}
                              >
                                <img src={item.url} className="w-full h-full object-cover" />
                                {/* 3-dot button on hover (non-select mode) */}
                                {!refSelectMode && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      setContextMenu({ item, x: rect.right, y: rect.bottom })
                                    }}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 12 }}
                                  >
                                    &#x22EE;
                                  </button>
                                )}
                                {/* Pink overlay when selected in select mode */}
                                {refSelectMode && (
                                  <div
                                    className="absolute inset-0 transition-colors"
                                    style={{ background: isRef ? 'rgba(99,102,241,0.25)' : 'transparent' }}
                                  />
                                )}
                                {/* Checkbox badge in select mode */}
                                {refSelectMode && (
                                  <div
                                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                    style={{
                                      background: isRef ? 'var(--joi-pink)' : 'rgba(0,0,0,0.5)',
                                      border: '2px solid white',
                                      color: 'white',
                                    }}
                                  >
                                    {isRef ? '✓' : ''}
                                  </div>
                                )}
                                {/* Pink dot badge when not in select mode but photo is a reference */}
                                {!refSelectMode && isRef && (
                                  <div
                                    className="absolute top-1 left-1 w-2 h-2 rounded-full"
                                    style={{ background: 'var(--joi-pink)' }}
                                  />
                                )}
                              </div>
                            )
                          })
                        : Array.from({length:16},(_,i)=>(
                            <div key={i} className="aspect-[3/4] rounded-lg shimmer cursor-pointer hover:scale-[1.03] transition-transform"
                              style={{ border:'1px solid rgba(255,255,255,.04)' }} />
                          ))
                      }
                    </div>
                  </div>
                )}
                {detailTab === 'Ediciones AI' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>
                        {charEditItems.length} ediciones
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {charEditItems.length > 0
                        ? charEditItems.map(item => (
                            <div
                              key={item.id}
                              className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform group"
                              style={{ border: '1px solid rgba(255,255,255,.04)' }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                setContextMenu({ item, x: e.clientX, y: e.clientY })
                              }}
                            >
                              <img src={item.url} className="w-full h-full object-cover" />
                              {/* 3-dot button on hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setContextMenu({ item, x: rect.right, y: rect.bottom })
                                }}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 12 }}
                              >
                                &#x22EE;
                              </button>
                              {/* Tool label */}
                              <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-[8px] font-mono truncate"
                                style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)' }}>
                                {item.model || 'AI Edit'}
                              </div>
                            </div>
                          ))
                        : Array.from({ length: 8 }, (_, i) => (
                            <div key={i} className="aspect-[3/4] rounded-lg shimmer"
                              style={{ border: '1px solid rgba(255,255,255,.04)' }} />
                          ))
                      }
                    </div>
                  </div>
                )}
                {detailTab === 'Ajustes' && selectedChar !== null && (() => {
                  const sc = storeCharacters[selectedChar as number]
                  if (!sc) return null
                  const RENDER_STYLES = [
                    { id: 'photorealistic', label: 'Fotorrealista', icon: '📷' },
                    { id: 'anime',          label: 'Anime',         icon: '🎌' },
                    { id: '3d-render',      label: '3D Render',     icon: '🎮' },
                    { id: 'illustration',   label: 'Ilustración',   icon: '🎨' },
                    { id: 'stylized',       label: 'Estilizado',    icon: '✦' },
                    { id: 'pixel-art',      label: 'Pixel Art',     icon: '🕹️' },
                  ]
                  return (
                    <div className="space-y-5">
                      {/* Name */}
                      <div>
                        <label className="text-[10px] font-mono uppercase block mb-1.5" style={{ color: 'var(--joi-text-3)' }}>Nombre</label>
                        <input
                          key={sc.id + '-name'}
                          defaultValue={sc.name}
                          onBlur={e => {
                            const val = e.currentTarget.value.trim()
                            if (val && val !== sc.name) updateCharacter(sc.id, { name: val })
                          }}
                          className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                          style={{ background: 'var(--joi-bg-3)', borderColor: 'rgba(255,255,255,.06)', color: 'var(--joi-text-1)' }}
                        />
                      </div>

                      {/* Render Style */}
                      <div>
                        <label className="text-[10px] font-mono uppercase block mb-2" style={{ color: 'var(--joi-text-3)' }}>
                          Estilo de Render
                          <span className="ml-1.5 normal-case" style={{ color: 'var(--joi-text-3)', opacity: 0.6 }}>— usado por el Director para mantener el estilo del personaje</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {RENDER_STYLES.map(rs => {
                            const active = (sc.renderStyle ?? 'photorealistic') === rs.id
                            return (
                              <button key={rs.id}
                                onClick={() => updateCharacter(sc.id, { renderStyle: rs.id })}
                                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                                style={{
                                  background: active ? 'rgba(240,104,72,.12)' : 'var(--joi-bg-3)',
                                  border: `1px solid ${active ? 'rgba(240,104,72,.35)' : 'rgba(255,255,255,.05)'}`,
                                  color: active ? 'var(--accent)' : 'var(--joi-text-2)',
                                }}>
                                <span>{rs.icon}</span>
                                <span>{rs.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Raw prompt (read-only) */}
                      {sc.characteristics && (
                        <details className="group">
                          <summary className="text-[10px] font-mono uppercase cursor-pointer flex items-center gap-1.5 py-1" style={{ color: 'var(--joi-text-3)' }}>
                            <span className="text-[9px] transition-transform group-open:rotate-90">▶</span>
                            Prompt técnico
                          </summary>
                          <textarea readOnly rows={4} value={sc.characteristics}
                            className="w-full mt-2 px-3 py-2 rounded-lg text-[10px] border outline-none resize-none font-mono"
                            style={{ background: 'var(--joi-bg-3)', borderColor: 'rgba(255,255,255,.04)', color: 'var(--joi-text-3)' }} />
                        </details>
                      )}

                      {/* Danger zone — delete */}
                      <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar "${sc.name}"? Esta acción no se puede deshacer.`)) {
                              removeCharacter(sc.id)
                              setSelectedChar(null)
                            }
                          }}
                          className="w-full py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                          style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.25)', color: '#f87171' }}>
                          Eliminar personaje
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* ─── Context Menu (floating) ─── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] rounded-xl overflow-hidden shadow-xl"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 160),
            left: Math.min(contextMenu.x, window.innerWidth - 180),
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.08)',
            minWidth: 170,
          }}
        >
          <button
            onClick={() => handleDownloadPhoto(contextMenu.item)}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-gray-50"
            style={{ color: '#333' }}
          >
            <span style={{ fontSize: 14 }}>&#x2913;</span>
            Descargar
          </button>
          <button
            onClick={() => handleReassign(contextMenu.item)}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-gray-50"
            style={{ color: '#333', borderTop: '1px solid rgba(0,0,0,0.05)' }}
          >
            <span style={{ fontSize: 14 }}>&#x21C4;</span>
            Reasignar personaje
          </button>
          <button
            onClick={() => handleDeletePhoto(contextMenu.item)}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-red-50"
            style={{ color: '#DC2626', borderTop: '1px solid rgba(0,0,0,0.05)' }}
          >
            <span style={{ fontSize: 14 }}>&#x2717;</span>
            Eliminar
          </button>
        </div>
      )}

      {/* ─── Reassign Modal ─── */}
      {reassignTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setReassignTarget(null) }}
        >
          <div className="rounded-2xl overflow-hidden max-w-sm w-full mx-4" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#111' }}>Reasignar foto</h3>
              <p className="text-xs mt-1" style={{ color: '#999' }}>Elige el personaje al que pertenece esta foto</p>
            </div>
            <div className="p-3 max-h-[300px] overflow-y-auto space-y-1">
              {storeCharacters.map(c => {
                const isCurrent = c.id === reassignTarget.characterId
                return (
                  <button
                    key={c.id}
                    disabled={isCurrent}
                    onClick={() => confirmReassign(c.id)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors"
                    style={{
                      background: isCurrent ? 'rgba(0,0,0,0.04)' : 'transparent',
                      opacity: isCurrent ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0" style={{ background: '#F3F4F6' }}>
                      {c.thumbnail ? (
                        <img src={c.thumbnail} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: '#999' }}>
                          {c.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: '#111' }}>{c.name}</div>
                      {isCurrent && <span className="text-[10px]" style={{ color: '#999' }}>Actual</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => setReassignTarget(null)}
                className="w-full py-2 rounded-lg text-xs font-medium"
                style={{ background: '#F3F4F6', color: '#555' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CharacterGallery
