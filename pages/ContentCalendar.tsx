import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useCharacterStore } from '../stores/characterStore'

const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const defaultPosts = [
  { day:3, time:'10:00', platform:'IG', type:'Reel', char:'Luna', c:'var(--accent)' },
  { day:5, time:'14:00', platform:'TT', type:'Video', char:'Luna', c:'var(--accent)' },
  { day:8, time:'09:00', platform:'IG', type:'Story', char:'Kai', c:'var(--blue)' },
  { day:10, time:'18:00', platform:'YT', type:'Short', char:'Luna', c:'var(--accent)' },
  { day:12, time:'12:00', platform:'IG', type:'Post', char:'Zara', c:'var(--rose)' },
  { day:15, time:'20:00', platform:'TT', type:'Live', char:'Kai', c:'var(--blue)' },
  { day:17, time:'11:00', platform:'IG', type:'Carrusel', char:'Luna', c:'var(--accent)' },
  { day:19, time:'16:00', platform:'IG', type:'Reel', char:'Zara', c:'var(--rose)' },
  { day:22, time:'10:00', platform:'YT', type:'Video', char:'Luna', c:'var(--accent)' },
  { day:24, time:'19:00', platform:'TT', type:'Collab', char:'Kai', c:'var(--blue)' },
  { day:26, time:'11:00', platform:'IG', type:'Story', char:'Luna', c:'var(--accent)' },
  { day:29, time:'15:00', platform:'IG', type:'Reel', char:'Zara', c:'var(--rose)' },
]

const defaultIdeas = [
  { idea:'Behind the scenes of the shoot', platform:'IG Stories', tag:'trending' },
  { idea:'GRWM for fashion event', platform:'TikTok', tag:'scheduled' },
  { idea:'Outfit check in the city', platform:'IG Reels', tag:'draft' },
  { idea:'Q&A with followers', platform:'IG Live', tag:'idea' },
  { idea:'Day in the life of Luna', platform:'YouTube', tag:'draft' },
  { idea:'Reacting to trends', platform:'TikTok', tag:'trending' },
]

const tagColors: Record<string,{bg:string,fg:string}> = {
  trending: { bg:'rgba(240,104,72,.1)', fg:'var(--accent)' },
  scheduled: { bg:'rgba(80,216,160,.1)', fg:'var(--mint)' },
  draft: { bg:'rgba(208,72,176,.1)', fg:'var(--magenta)' },
  idea: { bg:'rgba(122,139,165,.1)', fg:'var(--blue)' },
}

export function ContentCalendar() {
  const { addToast } = useToast()
  const storeChars = useCharacterStore(s => s.characters)

  const [selectedDay, setSelectedDay] = useState<number|null>(10)
  const [charFilter, setCharFilter] = useState('All')

  const [posts, setPosts] = useState(() => {
    try {
      const saved = localStorage.getItem('vist-calendar-posts')
      return saved ? JSON.parse(saved) : defaultPosts
    } catch { return defaultPosts }
  })

  const [ideaList, setIdeaList] = useState(() => {
    try {
      const saved = localStorage.getItem('vist-calendar-ideas')
      return saved ? JSON.parse(saved) : defaultIdeas
    } catch { return defaultIdeas }
  })

  useEffect(() => {
    localStorage.setItem('vist-calendar-posts', JSON.stringify(posts))
  }, [posts])

  useEffect(() => {
    localStorage.setItem('vist-calendar-ideas', JSON.stringify(ideaList))
  }, [ideaList])

  const filterNames = storeChars.length > 0
    ? ['All', ...storeChars.map(c => c.name)]
    : ['All','Luna','Kai','Zara']

  const filteredPosts = charFilter === 'All' ? posts : posts.filter((p: any) => p.char === charFilter)
  const postsForDay = (d: number) => filteredPosts.filter((p: any) => p.day === d)
  const selectedPosts = selectedDay ? postsForDay(selectedDay) : []

  const stats = [
    { l:'Posts this month', v: posts.length.toString(), c:'var(--accent)' },
    { l:'Scheduled', v: posts.filter((p: any) => p.day >= 10).length.toString(), c:'var(--mint)' },
    { l:'Completed', v: posts.filter((p: any) => p.day < 10).length.toString(), c:'var(--magenta)' },
  ]

  const handleAddPost = () => {
    const day = selectedDay || 10
    const newPost = {
      day,
      time: '12:00',
      platform: 'IG',
      type: 'Post',
      char: filterNames[1] || 'Luna',
      c: 'var(--accent)',
    }
    setPosts((prev: typeof defaultPosts) => [...prev, newPost])
    addToast(`Post scheduled for March ${day}`, 'success')
  }

  const handleRemovePost = (dayNum: number, index: number) => {
    setPosts((prev: typeof defaultPosts) => {
      const dayPosts = prev.filter((p: any) => p.day === dayNum)
      const otherPosts = prev.filter((p: any) => p.day !== dayNum)
      dayPosts.splice(index, 1)
      return [...otherPosts, ...dayPosts]
    })
    addToast('Post removed', 'info')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--joi-bg-0)' }}>
      <div className="px-8 pt-8 pb-2 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span style={{ color: 'var(--joi-pink)' }}>Content</span> <span style={{ color: 'var(--joi-text-1)' }}>Calendar</span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--joi-text-3)' }}>Plan content for all your characters</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost px-3 py-1.5 text-[12px]">&larr; Feb</button>
          <span className="text-sm font-bold font-mono" style={{ color:'var(--joi-text-1)' }}>March 2026</span>
          <button className="btn-ghost px-3 py-1.5 text-[12px]">Apr &rarr;</button>
        </div>
      </div>

      <div className="px-8 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          {filterNames.map((f)=>(
            <button key={f} className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all"
              onClick={() => setCharFilter(f)}
              style={{
                background: charFilter===f ? 'rgba(240,104,72,.08)' : 'var(--joi-bg-2)',
                border: `1px solid ${charFilter===f ? 'rgba(240,104,72,.2)' : 'rgba(255,255,255,.04)'}`,
                color: charFilter===f ? 'var(--accent)' : 'var(--joi-text-2)',
              }}>{f}</button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex gap-3 text-[10px]">
          {stats.map(s=>(
            <div key={s.l} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background:s.c }} />
              <span style={{ color:'var(--joi-text-3)' }}>{s.l}:</span>
              <span className="font-mono font-bold" style={{ color:s.c }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 flex gap-5 pb-8">
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {days.map(d=>(
              <div key={d} className="text-center py-1.5 text-[10px] font-mono uppercase tracking-wider" style={{ color:'var(--joi-text-3)' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({length:6},(_,i)=>(
              <div key={`e${i}`} className="h-[88px] rounded-lg" style={{ background:'var(--joi-bg-2)', opacity:.25 }} />
            ))}
            {Array.from({length:31},(_,i)=>i+1).map(day=>{
              const dp = postsForDay(day)
              const isToday = day === 10
              const isSel = selectedDay === day
              return (
                <div key={day} onClick={()=>setSelectedDay(day)}
                  className="h-[88px] rounded-lg p-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    background: isSel ? 'var(--joi-bg-3)' : 'var(--joi-bg-2)',
                    border: `1px solid ${isToday ? 'rgba(240,104,72,.35)' : isSel ? 'rgba(208,72,176,.2)' : 'rgba(255,255,255,.04)'}`,
                    boxShadow: isToday ? '0 0 12px rgba(240,104,72,.1)' : 'none',
                  }}>
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold" style={{ color: isToday ? 'var(--accent)' : 'var(--joi-text-1)' }}>{day}</span>
                    {isToday && <span className="badge" style={{ background:'rgba(240,104,72,.15)', color:'var(--accent)', fontSize:'7px', padding:'1px 4px' }}>TODAY</span>}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {dp.slice(0,2).map((p: any,pi: number)=>(
                      <div key={pi} className="flex items-center gap-1 px-1 py-0.5 rounded"
                        style={{ background:`color-mix(in srgb, ${p.c} 8%, transparent)` }}>
                        <div className="w-1 h-1 rounded-full" style={{ background:p.c }} />
                        <span className="text-[7px] font-mono truncate" style={{ color:p.c }}>{p.platform}·{p.type}</span>
                      </div>
                    ))}
                    {dp.length > 2 && <span className="text-[7px] font-mono pl-1" style={{ color:'var(--joi-text-3)' }}>+{dp.length-2} more</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="w-[280px] shrink-0 space-y-4">
          {selectedDay && (
            <div className="p-4 rounded-md" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold" style={{ color:'var(--joi-text-1)' }}>
                  March {selectedDay}
                  {selectedDay===10 && <span className="ml-2 badge" style={{ background:'rgba(240,104,72,.1)', color:'var(--accent)' }}>Today</span>}
                </h3>
                <span className="text-[10px] font-mono" style={{ color:'var(--joi-text-3)' }}>{selectedPosts.length} posts</span>
              </div>
              {selectedPosts.length > 0 ? (
                <div className="space-y-2">
                  {selectedPosts.map((p: any,i: number)=>(
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                        style={{ background:`color-mix(in srgb, ${p.c} 12%, transparent)`, color:p.c }}>{p.char[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate" style={{ color:'var(--joi-text-1)' }}>{p.type} — {p.char}</div>
                        <div className="text-[9px] font-mono" style={{ color:'var(--joi-text-3)' }}>{p.time} · {p.platform}</div>
                      </div>
                      <button onClick={() => handleRemovePost(selectedDay!, i)} className="btn-ghost px-2 py-1 text-[9px]">Remove</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-lg mb-1" style={{ color:'var(--joi-text-3)' }}>—</div>
                  <div className="text-[11px]" style={{ color:'var(--joi-text-3)' }}>No scheduled posts</div>
                </div>
              )}
            </div>
          )}

          <div className="p-4 rounded-md" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
            <h3 className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color:'var(--joi-text-3)' }}>Upcoming</h3>
            <div className="space-y-2">
              {filteredPosts.filter((p: any)=>p.day>=10).slice(0,5).map((p: any,i: number)=>(
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold"
                    style={{ background:`color-mix(in srgb, ${p.c} 12%, transparent)`, color:p.c }}>{p.char[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium truncate" style={{ color:'var(--joi-text-1)' }}>{p.type}</div>
                    <div className="text-[8px] font-mono" style={{ color:'var(--joi-text-3)' }}>D{p.day} · {p.time} · {p.platform}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-md" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-mono uppercase tracking-wider" style={{ color:'var(--joi-text-3)' }}>Content Ideas</h3>
              <button className="text-[10px] font-medium" style={{ color:'var(--accent)' }}>✦ Generate</button>
            </div>
            <div className="space-y-2">
              {ideaList.map((idea: any,i: number)=>(
                <div key={i} className="p-2.5 rounded-lg cursor-pointer transition-all hover:border-[rgba(240,104,72,.15)]"
                  style={{ background:'var(--joi-bg-3)', border:'1px solid rgba(255,255,255,.04)' }}>
                  <div className="text-[11px]" style={{ color:'var(--joi-text-1)' }}>{idea.idea}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono" style={{ color:'var(--joi-text-3)' }}>{idea.platform}</span>
                    <span className="badge" style={{ ...tagColors[idea.tag] && { background:tagColors[idea.tag].bg, color:tagColors[idea.tag].fg } }}>{idea.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleAddPost} className="btn-primary w-full py-2.5 text-[12px]">+ Schedule New Post</button>
        </div>
      </div>
    </div>
  )
}

export default ContentCalendar
