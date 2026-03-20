import { useState, useEffect, useMemo } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore } from '../stores/galleryStore'
import { useToast } from '../contexts/ToastContext'

const gradients = [
  'linear-gradient(135deg,#f06848,#d048b0)',
  'linear-gradient(135deg,#4858e0,#50d8a0)',
  'linear-gradient(135deg,#d048b0,#f06848)',
  'linear-gradient(135deg,#4858e0,#d048b0)',
]
function getGradientForIndex(i: number) { return gradients[i % gradients.length] }

const detailTabs = ['Resumen','Fotos','Ediciones AI','Universo','Ajustes']

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
  const trainLoRA = useCharacterStore(s => s.trainLoRA)
  const galleryItems = useGalleryStore(s => s.items)
  const toast = useToast()

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

  const totalPhotos = characters.reduce((sum, c) => sum + c.photos, 0)
  const totalEdits = characters.reduce((sum, c) => sum + c.edits, 0)
  const totalUses = characters.reduce((sum, c) => sum + c.usageCount, 0)

  // Gallery items for the selected character
  const selectedCharId = selectedChar !== null ? characters[selectedChar]?.id : null
  const charGalleryItems = selectedCharId ? galleryItems.filter(i => i.characterId === selectedCharId) : []
  const charPhotoItems = charGalleryItems.filter(i => i.type === 'create' || i.type === 'session')
  const charEditItems = charGalleryItems.filter(i => i.type === 'edit')

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
      <div className="px-8 pt-8 pb-2 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span style={{ color: 'var(--joi-pink)' }}>Galería de</span> <span style={{ color: 'var(--joi-text-1)' }}>Personajes</span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--joi-text-3)' }}>Tu colección de influencers virtuales</p>
        </div>
        <button className="btn-primary px-5 py-2.5 text-sm">⊕ Nuevo Personaje</button>
      </div>

      {/* Stats */}
      <div className="px-8 py-4 flex gap-3">
        {[
          { l:'Personajes', v:String(characters.length), c:'var(--accent)' },
          { l:'Usos Totales', v:String(totalUses), c:'var(--mint)' },
          { l:'Fotos', v:String(totalPhotos), c:'var(--rose)' },
          { l:'Ediciones AI', v:String(totalEdits), c:'var(--magenta)' },
        ].map(s=>(
          <div key={s.l} className="px-4 py-3 flex-1 rounded-md" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--joi-text-3)' }}>{s.l}</div>
            <div className="text-lg font-bold mt-0.5" style={{ color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="px-8 pb-8 flex gap-6">
        {/* Character Cards */}
        <div className={`${selectedChar !== null ? 'w-[360px] shrink-0' : 'flex-1'} space-y-3 transition-all`}>
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
                        background: 'rgba(255,107,157,.06)',
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
          <div className="flex-1 anim-in">
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
                              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.15)' }}>
                              <span className="inline-block w-3.5 h-3.5 border-2 border-[#A78BFA]/30 border-t-[#A78BFA] rounded-full animate-spin" />
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
                                style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}>
                                Reintentar
                              </button>
                            </div>
                          )
                        }
                        // idle / no status
                        const photoCount = sc.modelImageBlobs?.length || 0
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
                              background: photoCount < 5 ? 'rgba(255,255,255,0.03)' : 'rgba(167,139,250,0.15)',
                              color: photoCount < 5 ? 'var(--joi-text-3)' : '#A78BFA',
                              border: `1px solid ${photoCount < 5 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.25)'}`,
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
                  <div className="grid grid-cols-4 gap-2">
                    {charPhotoItems.length > 0
                      ? charPhotoItems.map(item => (
                          <div key={item.id} className="aspect-[3/4] rounded-lg overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform"
                            style={{ border:'1px solid rgba(255,255,255,.04)' }}>
                            <img src={item.url} className="w-full h-full object-cover" />
                          </div>
                        ))
                      : Array.from({length:16},(_,i)=>(
                          <div key={i} className="aspect-[3/4] rounded-lg shimmer cursor-pointer hover:scale-[1.03] transition-transform"
                            style={{ border:'1px solid rgba(255,255,255,.04)' }} />
                        ))
                    }
                  </div>
                )}
                {detailTab === 'Ediciones AI' && (
                  <div className="space-y-3">
                    {charEditItems.length > 0
                      ? charEditItems.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                            <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden">
                              <img src={item.url} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <div className="text-[12px] font-medium" style={{ color:'var(--joi-text-1)' }}>{item.prompt || item.model || 'AI Edit'}</div>
                              <div className="text-[9px] font-mono" style={{ color:'var(--joi-text-3)' }}>
                                {new Date(item.timestamp).toLocaleDateString('es', { day:'numeric', month:'short' })}
                                {item.model ? ` · ${item.model}` : ''}
                              </div>
                            </div>
                            <button className="btn-ghost px-3 py-1 text-[10px]">Ver</button>
                          </div>
                        ))
                      : ['Relight Golden Hour','Face Swap con Kai','Try-On Vestido Negro','360° Studio','Background Tokio','Enhance 4x','Style Anime'].map((e,i)=>(
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                            <div className="w-12 h-12 rounded-lg shimmer shrink-0" />
                            <div className="flex-1">
                              <div className="text-[12px] font-medium" style={{ color:'var(--joi-text-1)' }}>{e}</div>
                              <div className="text-[9px] font-mono" style={{ color:'var(--joi-text-3)' }}>{Math.floor(Math.random()*28)+1} Mar · {['Relight','Face Swap','Try-On','360°','Background','Enhance','Style'][i]}</div>
                            </div>
                            <button className="btn-ghost px-3 py-1 text-[10px]">Ver</button>
                          </div>
                        ))
                    }
                  </div>
                )}
                {detailTab === 'Universo' && (
                  <div className="space-y-4">
                    {['Historia y Origen','Mundo y Espacios','Círculo Social','Marca Personal','Vida Diaria'].map((cat,i)=>(
                      <div key={cat} className="p-4 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[12px] font-semibold" style={{ color:'var(--joi-text-1)' }}>{cat}</span>
                          <span className="text-[10px] font-mono" style={{ color: i<2?'var(--accent)':'var(--magenta)' }}>{[45,30,50,20,25][i]}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background:'var(--joi-bg-1)' }}>
                          <div className="h-full rounded-full" style={{ width:`${[45,30,50,20,25][i]}%`, background: i<2?'var(--accent)':'var(--magenta)' }} />
                        </div>
                      </div>
                    ))}
                    <button className="btn-primary w-full py-2.5 text-sm">✦ Expandir Universo con AI</button>
                  </div>
                )}
                {detailTab === 'Ajustes' && (
                  <div className="space-y-4">
                    {['Nombre','Handle','Estilo','Biografía','Género','Edad','Paleta de Colores'].map(f=>(
                      <div key={f}>
                        <label className="text-[10px] font-mono uppercase block mb-1" style={{ color:'var(--joi-text-3)' }}>{f}</label>
                        <input defaultValue={f==='Nombre'?characters[selectedChar].name : f==='Handle'?characters[selectedChar].handle : f==='Estilo'?characters[selectedChar].style : ''}
                          className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                          style={{ background:'var(--joi-bg-3)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)' }} />
                      </div>
                    ))}
                    {characters[selectedChar].rawPrompt && (
                      <details className="group">
                        <summary className="text-[10px] font-mono uppercase cursor-pointer flex items-center gap-1.5 py-1" style={{ color:'var(--joi-text-3)' }}>
                          <span className="text-[9px] transition-transform group-open:rotate-90">▶</span>
                          Prompt técnico
                        </summary>
                        <textarea readOnly rows={4} value={characters[selectedChar].rawPrompt}
                          className="w-full mt-2 px-3 py-2 rounded-lg text-[10px] border outline-none resize-none font-mono"
                          style={{ background:'var(--joi-bg-3)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-3)' }} />
                      </details>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button className="btn-primary flex-1 py-2 text-sm">Guardar</button>
                      <button className="btn-ghost px-4 py-2 text-sm" style={{ color:'var(--rose)' }}>Archivar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CharacterGallery
