import { useState } from 'react'
import { useCharacterStore } from '../stores/characterStore'
import { useGalleryStore } from '../stores/galleryStore'

const engData = [
  { m:'Oct', v:62 },{ m:'Nov', v:71 },{ m:'Dec', v:68 },{ m:'Jan', v:85 },{ m:'Feb', v:92 },{ m:'Mar', v:87 },
]

const platforms = [
  { name:'Instagram', followers:'2.1M', growth:'+5.2%', eng:'7.8%', c:'var(--accent)', pct:48 },
  { name:'TikTok', followers:'1.8M', growth:'+12.1%', eng:'11.2%', c:'var(--magenta)', pct:35 },
  { name:'YouTube', followers:'340K', growth:'+3.8%', eng:'4.1%', c:'var(--rose)', pct:12 },
  { name:'Twitter/X', followers:'120K', growth:'+1.2%', eng:'2.3%', c:'var(--blue)',  pct:5 },
]

const topPosts = [
  { type:'Reel', desc:'GRWM Festival Look', likes:'245K', comments:'3.2K', shares:'12K', char:'Luna', c:'var(--accent)' },
  { type:'TikTok', desc:'Street Style Challenge', likes:'189K', comments:'5.1K', shares:'28K', char:'Luna', c:'var(--accent)' },
  { type:'Post', desc:'New Hair Color Reveal', likes:'156K', comments:'8.4K', shares:'4.2K', char:'Kai', c:'var(--blue)' },
  { type:'Story', desc:'Day in My Life - Tokio', likes:'98K', comments:'1.2K', shares:'2.1K', char:'Luna', c:'var(--accent)' },
  { type:'Reel', desc:'Outfit of the Week', likes:'87K', comments:'2.8K', shares:'3.5K', char:'Zara', c:'var(--rose)' },
]

const audience = [
  { l:'18-24', pct:42, c:'var(--accent)' },
  { l:'25-34', pct:31, c:'var(--magenta)' },
  { l:'35-44', pct:15, c:'var(--rose)' },
  { l:'45+', pct:12, c:'var(--blue)' },
]

const countries = [
  { flag:'\uD83C\uDDFA\uD83C\uDDF8', name:'United States', pct:'28%' },
  { flag:'\uD83C\uDDE7\uD83C\uDDF7', name:'Brazil', pct:'18%' },
  { flag:'\uD83C\uDDF2\uD83C\uDDFD', name:'Mexico', pct:'14%' },
  { flag:'\uD83C\uDDEA\uD83C\uDDF8', name:'Spain', pct:'11%' },
  { flag:'\uD83C\uDDE8\uD83C\uDDF1', name:'Chile', pct:'8%' },
  { flag:'\uD83C\uDDE6\uD83C\uDDF7', name:'Argentina', pct:'6%' },
]

const defaultCharPerf = [
  { name:'Luna Vex', followers:'2.4M', eng:'8.7%', posts:47, revenue:'$18.2K', c:'var(--accent)', trend:'+12%' },
  { name:'Kai Frost', followers:'1.8M', eng:'6.2%', posts:31, revenue:'$4.8K', c:'var(--blue)',  trend:'+5%' },
  { name:'Zara Phoenix', followers:'890K', eng:'11.3%', posts:14, revenue:'$1.5K', c:'var(--rose)', trend:'+28%' },
]

export function Analytics() {
  const [range, setRange] = useState('30d')
  const [charFilter, setCharFilter] = useState('all')

  const characters = useCharacterStore(s => s.characters)
  const galleryItems = useGalleryStore(s => s.items)

  const filteredGallery = charFilter === 'all'
    ? galleryItems
    : galleryItems.filter(i => {
        const char = characters.find(c => c.name === charFilter)
        return char ? i.characterId === char.id : true
      })

  const totalEdits = filteredGallery.filter(i => i.type === 'edit').length
  const totalSessions = filteredGallery.filter(i => i.type === 'session').length

  const kpis = [
    { l:'Characters', v: characters.length.toString(), d: characters.length > 0 ? `+${characters.length}` : '0', up: characters.length > 0 },
    { l:'Creations', v: filteredGallery.length.toString(), d: `+${filteredGallery.length}`, up: filteredGallery.length > 0 },
    { l:'AI Edits', v: totalEdits.toString(), d: `+${totalEdits}`, up: totalEdits > 0 },
    { l:'Sessions', v: totalSessions.toString(), d: `+${totalSessions}`, up: totalSessions > 0 },
    { l:'AI Edits', v:'347', d:'+45', up:true },
    { l:'Revenue Est.', v:'$24.5K', d:'+22%', up:true },
  ]

  const colorCycle = ['var(--accent)','var(--blue)','var(--rose)','var(--magenta)']

  const charPerf = characters.length > 0
    ? characters.map((c, i) => {
        const charItems = galleryItems.filter(g => g.characterId === c.id)
        const editCount = charItems.filter(g => g.type === 'edit').length
        return {
          name: c.name,
          followers: `${c.usageCount} uses`,
          eng: `${charItems.length} items`,
          posts: charItems.length,
          revenue: editCount > 0 ? `${editCount} edits` : '0',
          c: colorCycle[i % 4],
          trend: `+${charItems.length}`,
        }
      })
    : defaultCharPerf

  const charFilterOptions = ['all', ...characters.map(c => c.name)]

  const maxEng = Math.max(...engData.map(d=>d.v))

  return (
    <div className="min-h-screen" style={{ background: 'var(--joi-bg-0)' }}>
      <div className="px-8 pt-8 pb-2 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span style={{ color: 'var(--joi-pink)' }}>Analytics</span> <span style={{ color: 'var(--joi-text-1)' }}>Dashboard</span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--joi-text-3)' }}>Metrics and performance of your virtual influencers</p>
        </div>
        <div className="flex gap-4">
          <div className="flex gap-1.5">
            {charFilterOptions.map(f=>(
              <button key={f} onClick={()=>setCharFilter(f)}
                className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: charFilter===f ? 'rgba(240,104,72,.08)' : 'transparent',
                  border: `1px solid ${charFilter===f ? 'rgba(240,104,72,.2)' : 'rgba(255,255,255,.04)'}`,
                  color: charFilter===f ? 'var(--accent)' : 'var(--joi-text-3)',
                }}>{f==='all'?'All':f}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {['7d','30d','90d','1y'].map(r=>(
              <button key={r} onClick={()=>setRange(r)}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono transition-all"
                style={{
                  background: range===r ? 'rgba(208,72,176,.1)' : 'transparent',
                  color: range===r ? 'var(--magenta)' : 'var(--joi-text-3)',
                  border: `1px solid ${range===r ? 'rgba(208,72,176,.2)' : 'transparent'}`,
                }}>{r}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="px-8 py-4 grid grid-cols-6 gap-3">
        {kpis.map(k=>(
          <div key={k.l} className="p-4 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color:'var(--joi-text-3)' }}>{k.l}</div>
            <div className="text-xl font-bold mt-1" style={{ color:'var(--joi-text-1)' }}>{k.v}</div>
            <div className="text-[11px] mt-0.5" style={{ color: k.up ? 'var(--mint)' : 'var(--rose)' }}>\u2191 {k.d}</div>
          </div>
        ))}
      </div>

      <div className="px-8 grid grid-cols-3 gap-5 mb-5">
        {/* Engagement Chart */}
        <div className="col-span-2 p-5 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold" style={{ color:'var(--joi-text-1)' }}>Engagement Trend</h3>
            <span className="text-[10px] font-mono" style={{ color:'var(--joi-text-3)' }}>Last 6 months</span>
          </div>
          <div className="flex items-end gap-3 h-44">
            {engData.map((d,i)=>(
              <div key={d.m} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold" style={{ color:'var(--accent)' }}>{d.v}%</span>
                <div className="w-full rounded-t-lg transition-all relative overflow-hidden"
                  style={{
                    height:`${(d.v/maxEng)*130}px`,
                    background: `linear-gradient(180deg, var(--accent) 0%, var(--magenta) 100%)`,
                    opacity: 0.55 + (i*0.07),
                  }}>
                  <div className="absolute inset-0 opacity-20" style={{ background:'linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)' }} />
                </div>
                <span className="text-[10px] font-mono" style={{ color:'var(--joi-text-3)' }}>{d.m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div className="p-5 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color:'var(--joi-text-1)' }}>Audience by Age</h3>
          <div className="space-y-3">
            {audience.map(a=>(
              <div key={a.l}>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px]" style={{ color:'var(--joi-text-2)' }}>{a.l}</span>
                  <span className="text-[11px] font-mono font-bold" style={{ color:a.c }}>{a.pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background:'var(--joi-bg-3)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width:`${a.pct}%`, background:a.c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4" style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
            <h4 className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color:'var(--joi-text-3)' }}>Top Countries</h4>
            <div className="space-y-1.5">
              {countries.map(c=>(
                <div key={c.name} className="flex justify-between">
                  <span className="text-[11px]" style={{ color:'var(--joi-text-2)' }}>{c.flag} {c.name}</span>
                  <span className="text-[11px] font-mono" style={{ color:'var(--joi-text-1)' }}>{c.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 grid grid-cols-3 gap-5 mb-5">
        {/* Character Performance */}
        <div className="p-5 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color:'var(--joi-text-1)' }}>Performance by Character</h3>
          <div className="space-y-3">
            {charPerf.map(cp=>(
              <div key={cp.name} className="p-3 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                      style={{ background:`color-mix(in srgb, ${cp.c} 12%, transparent)`, color:cp.c }}>{cp.name[0]}</div>
                    <span className="text-[12px] font-semibold" style={{ color:'var(--joi-text-1)' }}>{cp.name}</span>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color:'var(--mint)' }}>{cp.trend}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[{l:'Followers',v:cp.followers},{l:'Eng',v:cp.eng},{l:'Posts',v:cp.posts},{l:'Rev',v:cp.revenue}].map(s=>(
                    <div key={s.l}>
                      <div className="text-[11px] font-bold" style={{ color:'var(--joi-text-1)' }}>{s.v}</div>
                      <div className="text-[8px] font-mono" style={{ color:'var(--joi-text-3)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="p-5 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color:'var(--joi-text-1)' }}>Platforms</h3>
          <div className="space-y-3">
            {platforms.map(p=>(
              <div key={p.name} className="p-3 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background:p.c }} />
                    <span className="text-[12px] font-semibold" style={{ color:'var(--joi-text-1)' }}>{p.name}</span>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color:'var(--mint)' }}>{p.growth}</span>
                </div>
                <div className="flex justify-between text-[10px] mb-1.5" style={{ color:'var(--joi-text-3)' }}>
                  <span>{p.followers}</span>
                  <span>Eng: {p.eng}</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background:'var(--joi-bg-0)' }}>
                  <div className="h-full rounded-full" style={{ width:`${p.pct}%`, background:p.c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-3 rounded-full overflow-hidden">
            {platforms.map(p=>(
              <div key={p.name} style={{ width:`${p.pct}%`, background:p.c }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {platforms.map(p=>(
              <span key={p.name} className="text-[8px] font-mono" style={{ color:p.c }}>{p.pct}%</span>
            ))}
          </div>
        </div>

        {/* Top Posts */}
        <div className="p-5 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color:'var(--joi-text-1)' }}>Top Posts</h3>
          <div className="space-y-2">
            {topPosts.map((post,i)=>(
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                <div className="text-base font-bold w-5 text-center font-mono" style={{ color:'var(--joi-text-3)' }}>{i+1}</div>
                <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{ background:`color-mix(in srgb, ${post.c} 12%, transparent)`, color:post.c }}>{post.char[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate" style={{ color:'var(--joi-text-1)' }}>{post.desc}</div>
                  <div className="text-[8px] font-mono mt-0.5" style={{ color:'var(--joi-text-3)' }}>
                    {post.type} \u00b7 \u2764 {post.likes} \u00b7 \uD83D\uDCAC {post.comments} \u00b7 \u2197 {post.shares}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="p-5 rounded-md joi-glass" style={{ background: 'var(--joi-bg-2)', border: '1px solid rgba(255,255,255,.04)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color:'var(--joi-text-1)' }}>Performance by Content Type</h3>
          <div className="grid grid-cols-7 gap-3">
            {[
              { type:'Reels', count:34, eng:'9.2%', c:'var(--accent)' },
              { type:'Stories', count:56, eng:'5.1%', c:'var(--magenta)' },
              { type:'Posts', count:12, eng:'4.8%', c:'var(--rose)' },
              { type:'TikToks', count:28, eng:'12.4%', c:'var(--accent)' },
              { type:'Shorts', count:8, eng:'7.3%', c:'var(--blue)' },
              { type:'Lives', count:4, eng:'15.1%', c:'var(--mint)' },
              { type:'Carousels', count:6, eng:'6.7%', c:'var(--magenta)' },
            ].map(t=>(
              <div key={t.type} className="text-center p-3 rounded-lg" style={{ background:'var(--joi-bg-3)' }}>
                <div className="text-lg font-bold" style={{ color:t.c }}>{t.count}</div>
                <div className="text-[11px] font-medium" style={{ color:'var(--joi-text-1)' }}>{t.type}</div>
                <div className="text-[9px] font-mono mt-0.5" style={{ color:'var(--joi-text-3)' }}>Eng: {t.eng}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
