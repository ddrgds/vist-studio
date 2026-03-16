import { useState, useEffect } from 'react'
import { useCharacterStore } from '../stores/characterStore'

const categories = [
  { id:'lore', name:'Lore & History', icon:'\uD83D\uDCDC', items:['Character origin','Family and relationships','Key moments','Traumas and overcoming','Achievements','Secrets','Dreams and goals','Life philosophy'] },
  { id:'world', name:'World & Spaces', icon:'\uD83C\uDF0D', items:['City they live in','Apartment/House','Workplace','Favorite caf\u00e9','Secret spots','Vacations','Gym/Studio','Regular restaurant'] },
  { id:'social', name:'Social Circle', icon:'\uD83D\uDC65', items:['Best friend','Romantic interest','Rival','Mentor','Roommate','Pet','Online community','Collaborators'] },
  { id:'brand', name:'Personal Brand', icon:'\u2728', items:['Main niche','Associated brands','Content type','Brand values','Eslogan/Catchphrase','Merchandise','Podcast/Show','Social causes'] },
  { id:'daily', name:'Daily Life', icon:'\u2600\uFE0F', items:['Morning routine','Favorite food','Main hobby','Music taste','Shows/Movies','Books','Sports','Side project'] },
]

const defaultTimeline = [
  { date:'Jan 2025', event:'First viral post', type:'milestone', c:'var(--accent)' },
  { date:'Mar 2025', event:'Fashion brand collab', type:'brand', c:'var(--magenta)' },
  { date:'May 2025', event:'Drama with @rival_account', type:'drama', c:'var(--rose)' },
  { date:'Jul 2025', event:'Merch launch', type:'brand', c:'var(--mint)' },
  { date:'Sep 2025', event:'Trip to Tokyo - story arc', type:'story', c:'var(--magenta)' },
  { date:'Nov 2025', event:'Real identity reveal', type:'drama', c:'var(--accent)' },
  { date:'Jan 2026', event:'1M followers milestone', type:'milestone', c:'var(--blue)' },
  { date:'Mar 2026', event:'Podcast launch', type:'brand', c:'var(--rose)' },
]

const defaultFilledItems: Record<string, string> = {
  'Character origin': 'Born in the underground scene of Shibuya, Tokyo. Daughter of a Japanese street artist and a Chilean fashion designer.',
  'Best friend': 'Maya \u2014 known online as @mayaglitch. They met on a digital art forum at age 16.',
}

const hardcodedChars = [
  { n:'Luna Vex', e:'\uD83C\uDF19', id:'luna-vex' },
  { n:'Kai Frost', e:'\u2744\uFE0F', id:'kai-frost' },
  { n:'Zara Phoenix', e:'\uD83D\uDD25', id:'zara-phoenix' },
]

export function UniverseBuilder() {
  const characters = useCharacterStore(s => s.characters)
  const [selectedCharIdx, setSelectedCharIdx] = useState(0)

  // Derive storage keys from selected character
  const charId = characters.length > 0
    ? characters[selectedCharIdx]?.id ?? 'default'
    : hardcodedChars[selectedCharIdx]?.id ?? 'default'
  const itemsKey = `vist-universe-${charId}`
  const timelineKey = `vist-universe-timeline-${charId}`

  const [activeCat, setActiveCat] = useState('lore')
  const [expanded, setExpanded] = useState<string|null>(null)
  const [editingValue, setEditingValue] = useState('')

  const [filledItems, setFilledItems] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(itemsKey)
      return saved ? JSON.parse(saved) : { ...defaultFilledItems }
    } catch { return { ...defaultFilledItems } }
  })

  const [timelineEvents, setTimelineEvents] = useState<typeof defaultTimeline>(() => {
    try {
      const saved = localStorage.getItem(timelineKey)
      return saved ? JSON.parse(saved) : [...defaultTimeline]
    } catch { return [...defaultTimeline] }
  })

  // Persist filledItems to localStorage
  useEffect(() => {
    localStorage.setItem(itemsKey, JSON.stringify(filledItems))
  }, [filledItems, itemsKey])

  // Persist timeline to localStorage
  useEffect(() => {
    localStorage.setItem(timelineKey, JSON.stringify(timelineEvents))
  }, [timelineEvents, timelineKey])

  // When character changes, reload data from localStorage
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem(itemsKey)
      setFilledItems(savedItems ? JSON.parse(savedItems) : { ...defaultFilledItems })
    } catch { setFilledItems({ ...defaultFilledItems }) }
    try {
      const savedTimeline = localStorage.getItem(timelineKey)
      setTimelineEvents(savedTimeline ? JSON.parse(savedTimeline) : [...defaultTimeline])
    } catch { setTimelineEvents([...defaultTimeline]) }
    setExpanded(null)
  }, [charId, itemsKey, timelineKey])

  // Derive completion from real data
  const completionData: Record<string, number> = {}
  categories.forEach(cat => {
    const filled = cat.items.filter(item => !!filledItems[item]).length
    completionData[cat.id] = Math.round((filled / cat.items.length) * 100)
  })

  const currentCat = categories.find(c=>c.id===activeCat)!
  const totalCompletion = Math.round(Object.values(completionData).reduce((a,b)=>a+b,0) / Object.values(completionData).length)

  const handleExpand = (item: string) => {
    if (expanded === item) {
      setExpanded(null)
    } else {
      setExpanded(item)
      setEditingValue(filledItems[item] || '')
    }
  }

  const handleSave = (item: string, value: string) => {
    if (value.trim()) {
      setFilledItems(prev => ({ ...prev, [item]: value.trim() }))
    } else {
      setFilledItems(prev => {
        const next = { ...prev }
        delete next[item]
        return next
      })
    }
    setExpanded(null)
  }

  const handleAIGenerate = (item: string) => {
    const charName = characters.length > 0
      ? characters[selectedCharIdx]?.name
      : hardcodedChars[selectedCharIdx]?.n
    setEditingValue(`[AI Generated] Content for "${item}" for ${charName || 'the character'}. This text will be generated with AI in a future update.`)
  }

  const handleAddEvent = () => {
    const newEvent = {
      date: new Date().toLocaleDateString('en', { month:'short', year:'numeric' }),
      event: 'New event',
      type: 'milestone',
      c: 'var(--accent)',
    }
    setTimelineEvents(prev => [...prev, newEvent])
  }

  // Build character list for selector
  const charButtons = characters.length > 0
    ? characters.map((c, i) => ({ n: c.name, e: '\uD83D\uDC64', a: i === selectedCharIdx, idx: i }))
    : hardcodedChars.map((c, i) => ({ n: c.n, e: c.e, a: i === selectedCharIdx, idx: i }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--joi-bg-0)' }}>
      <div className="px-8 pt-8 pb-2">
        <h1 className="text-2xl font-bold">
          <span style={{ color: 'var(--joi-pink)' }}>Universe</span> <span style={{ color: 'var(--joi-text-1)' }}>Builder</span>
        </h1>
        <p className="mt-1" style={{ color: 'var(--joi-text-3)' }}>
          Build a complete world: history, relationships, brand, and lore
        </p>
      </div>

      <div className="px-8 py-3">
        <div className="flex gap-2">
          {charButtons.map(c=>(
            <button key={c.n} className="px-4 py-2 rounded-lg text-[12px] flex items-center gap-2 transition-all"
              onClick={() => setSelectedCharIdx(c.idx)}
              style={{
                background: c.a ? 'rgba(240,104,72,.08)' : 'var(--joi-bg-2)',
                border: `1px solid ${c.a ? 'rgba(240,104,72,.2)' : 'rgba(255,255,255,.04)'}`,
                color: c.a ? 'var(--accent)' : 'var(--joi-text-2)',
              }}>{c.e} {c.n}</button>
          ))}
        </div>
      </div>

      <div className="px-8 flex gap-6 pb-8">
        <div className="flex-1">
          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
            {categories.map(cat=>(
              <button key={cat.id} onClick={()=>setActiveCat(cat.id)}
                className="px-4 py-2 rounded-lg text-[12px] font-medium shrink-0 flex items-center gap-2 transition-all"
                style={{
                  background: activeCat===cat.id ? 'rgba(240,104,72,.08)' : 'var(--joi-bg-2)',
                  border: `1px solid ${activeCat===cat.id ? 'rgba(240,104,72,.2)' : 'rgba(255,255,255,.04)'}`,
                  color: activeCat===cat.id ? 'var(--accent)' : 'var(--joi-text-2)',
                }}>
                <span>{cat.icon}</span>{cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {currentCat.items.map(item=>{
              const isFilled = !!filledItems[item]
              const isExpanded = expanded === item
              return (
                <div key={item}
                  onClick={()=>handleExpand(item)}
                  className="p-4 cursor-pointer rounded-md joi-glass"
                  style={{ background: 'var(--joi-bg-2)', border: `1px solid ${isExpanded ? 'rgba(240,104,72,.2)' : 'rgba(255,255,255,.04)'}` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-[13px] font-semibold" style={{ color:'var(--joi-text-1)' }}>{item}</h3>
                    <span className="badge"
                      style={{
                        background: isFilled ? 'rgba(94,196,154,.1)' : 'rgba(240,104,72,.1)',
                        color: isFilled ? 'var(--mint)' : 'var(--accent)',
                      }}>
                      {isFilled ? 'Complete' : 'Pending'}
                    </span>
                  </div>
                  {isExpanded ? (
                    <div className="mt-3 space-y-3 anim-in">
                      <textarea
                        rows={4}
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                        placeholder={`Describe: ${item.toLowerCase()}...`}
                        className="w-full px-3 py-2.5 rounded-lg text-[12px] border outline-none resize-none transition-colors focus:border-[rgba(240,104,72,.3)]"
                        style={{ background:'var(--joi-bg-0)', borderColor:'rgba(255,255,255,.04)', color:'var(--joi-text-1)' }}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex gap-2">
                        <button onClick={e=>{e.stopPropagation(); handleAIGenerate(item)}} className="btn-primary px-3 py-1.5 text-[11px]">
                          \u2726 Generate with AI
                        </button>
                        <button onClick={e=>{e.stopPropagation(); handleSave(item, editingValue)}} className="btn-ghost px-3 py-1.5 text-[11px]">
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] line-clamp-2" style={{ color: isFilled ? 'var(--joi-text-2)' : 'var(--joi-text-3)' }}>
                      {filledItems[item] || 'Click to expand and define this aspect'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {activeCat === 'social' && (
            <div className="p-6 mb-6 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color:'var(--joi-text-1)' }}>Relationship Map</h3>
              <div className="relative h-56">
                <div className="absolute inset-0 rounded-full opacity-[0.03]" style={{ border:'1px solid var(--joi-text-3)', left:'15%', right:'15%', top:'5%', bottom:'5%' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center text-base font-bold z-10"
                  style={{ background:'linear-gradient(135deg, var(--accent), var(--magenta))', color:'#fff', boxShadow:'0 0 25px rgba(240,104,72,.2)' }}>LV</div>
                {[
                  { name:'Maya (BFF)', x:'18%', y:'22%', c:'var(--mint)' },
                  { name:'Alex (Love)', x:'78%', y:'18%', c:'var(--accent)' },
                  { name:'Zoe (Rival)', x:'82%', y:'72%', c:'var(--rose)' },
                  { name:'Mr. Chen', x:'14%', y:'76%', c:'var(--magenta)' },
                  { name:'Pixel (Pet)', x:'50%', y:'8%', c:'var(--blue)' },
                ].map(node=>(
                  <div key={node.name} className="absolute transition-transform hover:scale-110"
                    style={{ left:node.x, top:node.y, transform:'translate(-50%,-50%)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background:`color-mix(in srgb, ${node.c} 12%, transparent)`, border:`1px solid color-mix(in srgb, ${node.c} 25%, transparent)`, color:node.c }}>
                      {node.name[0]}
                    </div>
                    <div className="text-[8px] text-center mt-1 whitespace-nowrap" style={{ color:'var(--joi-text-3)' }}>{node.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-[290px] shrink-0">
          <div className="p-5 sticky top-8 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
            <h3 className="text-sm font-bold mb-1" style={{ color:'var(--joi-text-1)' }}>Story Timeline</h3>
            <p className="text-[10px] mb-4" style={{ color:'var(--joi-text-3)' }}>Character story arc</p>

            <div className="relative">
              <div className="absolute left-[6px] top-1 bottom-1 w-[2px]" style={{ background:'var(--joi-bg-3)' }} />
              {timelineEvents.map((ev,i)=>(
                <div key={i} className="flex gap-3 py-2 relative group cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 z-10 transition-transform group-hover:scale-125"
                    style={{ background:ev.c, boxShadow:`0 0 6px color-mix(in srgb, ${ev.c} 40%, transparent)` }} />
                  <div>
                    <div className="text-[10px] font-mono" style={{ color:ev.c }}>{ev.date}</div>
                    <div className="text-[12px]" style={{ color:'var(--joi-text-1)' }}>{ev.event}</div>
                    <span className="badge mt-0.5 inline-block"
                      style={{ background:`color-mix(in srgb, ${ev.c} 10%, transparent)`, color:ev.c }}>{ev.type}</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleAddEvent} className="w-full mt-3 py-2 rounded-lg text-[11px] font-medium transition-colors hover:border-[rgba(240,104,72,.2)]"
              style={{ border:'1px dashed rgba(255,255,255,.04)', color:'var(--joi-text-3)' }}>+ Add event</button>

            <div className="mt-6 pt-4" style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono uppercase" style={{ color:'var(--joi-text-3)' }}>Universe completion</span>
                <span className="text-sm font-bold" style={{ color:'var(--accent)' }}>{totalCompletion}%</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background:'var(--joi-bg-3)' }}>
                <div className="h-full rounded-full transition-all" style={{ width:`${totalCompletion}%`, background:'linear-gradient(90deg, var(--accent), var(--magenta))' }} />
              </div>
              <div className="grid grid-cols-5 gap-1 mt-3">
                {categories.map(cat=>(
                  <div key={cat.id} className="text-center cursor-pointer" onClick={()=>setActiveCat(cat.id)}>
                    <div className="text-sm">{cat.icon}</div>
                    <div className="text-[8px] font-mono" style={{ color: activeCat===cat.id ? 'var(--accent)' : 'var(--joi-text-3)' }}>
                      {completionData[cat.id]}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary w-full py-2.5 text-[12px] mt-4">\u2726 Auto-generate Universe with AI</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UniverseBuilder
