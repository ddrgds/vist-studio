# Dashboard "Command Center" Redesign

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Dashboard from a generic dark admin panel into an immersive cyberpunk "Command Center" that feels like a creative director's workstation — not a SaaS dashboard.

**Architecture:** Single-file rewrite of `pages/Dashboard.tsx` using existing Netrunner CSS classes from `index.css`, existing stores (characterStore, galleryStore), and ProfileContext for user data. No new dependencies. No CSS changes needed — leverage existing `.nr-*` classes.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + existing Netrunner design system

---

## File Structure

- **Modify:** `pages/Dashboard.tsx` — Full rewrite of the component
- **Read-only references:**
  - `index.css` — Netrunner CSS classes (`.nr-heading`, `.nr-label`, `.nr-hud`, `.nr-card-wrap`, `.nr-glow--cyan`, `.nr-scanline-anim`, `.nr-typing`, `.nr-status`, `.nr-btn`, `.nr-btn-pulse`, `.nr-neon-border--cyan`, `.nr-feature-card`)
  - `contexts/ProfileContext.tsx` — `useProfile()` for displayName, creditsRemaining, subscriptionPlan
  - `stores/characterStore.ts` — `useCharacterStore()` for characters array
  - `stores/galleryStore.ts` — `useGalleryStore()` for gallery items
  - `App.tsx` — Page type definition, onNav prop interface

---

## Chunk 1: Dashboard Redesign

### Task 1: Hero Header — "Welcome Back, Commander"

**Files:**
- Modify: `pages/Dashboard.tsx:76-84`

**What changes:**
Replace the flat "VIST Studio / Command center" header with a personalized cinematic welcome + HUD status bar.

- [ ] **Step 1: Add ProfileContext import and hero header**

Replace the current header section with:
```tsx
import { useProfile } from '../contexts/ProfileContext'

// Inside component:
const { profile } = useProfile()
const displayName = profile?.displayName || 'Commander'
const credits = profile?.creditsRemaining ?? 0
const plan = profile?.subscriptionPlan || 'free'
```

Hero JSX:
```tsx
{/* Hero Header */}
<div className="px-8 pt-8 pb-6">
  <div className="flex items-start justify-between">
    <div>
      <p className="nr-label" style={{ color: 'var(--cyan)', letterSpacing: '0.2em' }}>
        SYS.AUTH_ACCEPTED // {new Date().toLocaleDateString('en', { year: '2-digit', month: '2-digit', day: '2-digit' })}
      </p>
      <h1 className="nr-heading nr-glow" style={{ fontSize: '2rem', marginTop: '0.5rem' }}>
        WELCOME BACK, <span style={{ color: 'var(--cyan)' }}>{displayName.toUpperCase()}</span>
      </h1>
      <p className="nr-label nr-typing" style={{ color: 'var(--nr-text-2)', marginTop: '0.25rem' }}>
        System Status: ONLINE // Grid connection stable.
      </p>
    </div>
    {/* HUD Status Badges */}
    <div className="flex gap-3 items-center">
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'var(--nr-bg-2)', border: '1px solid var(--nr-border-cyan)', borderRadius: '4px' }}>
        <span className="nr-status nr-status--online" />
        <span className="font-jet text-[11px]" style={{ color: 'var(--cyan)' }}>{credits} CR</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'var(--nr-bg-2)', border: '1px solid var(--nr-border)', borderRadius: '4px' }}>
        <span className="font-jet text-[10px] uppercase" style={{ color: 'var(--nr-text-2)' }}>{plan}</span>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify in browser — header shows username, credits, plan badge**

---

### Task 2: Stats Row — HUD Terminal Readouts

**Files:**
- Modify: `pages/Dashboard.tsx` — stats section

**What changes:**
Replace flat identical stat cards with terminal-style readouts. Each has a colored left accent bar, large monospace number, and a subtle label. 4 stats max (not 5), more impactful.

- [ ] **Step 1: Redesign stats to 4 HUD readouts**

```tsx
const statsData = [
  { l: 'CHARACTERS', v: characters.length, c: 'var(--accent)' },
  { l: 'CREATIONS', v: galleryItems.filter(i => i.type === 'create' || i.type === 'session').length, c: 'var(--cyan)' },
  { l: 'AI EDITS', v: galleryItems.filter(i => i.type === 'edit').length, c: 'var(--magenta)' },
  { l: 'CREDITS', v: credits, c: 'var(--mint)' },
]
```

```tsx
{/* Stats — Terminal Readouts */}
<div className="px-8 pb-4 grid grid-cols-4 gap-3 stagger-children">
  {statsData.map(s => (
    <div key={s.l} className="flex items-stretch gap-0 nr-neon-border"
      style={{ background: 'var(--nr-bg-2)', border: '1px solid var(--nr-border)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ width: '3px', background: s.c, flexShrink: 0 }} />
      <div className="px-4 py-3 flex-1">
        <div className="nr-label" style={{ fontSize: '9px' }}>{s.l}</div>
        <div className="font-jet font-bold" style={{ fontSize: '1.75rem', color: s.c, lineHeight: 1.1, marginTop: '4px' }}>
          {typeof s.v === 'number' ? s.v.toLocaleString() : s.v}
        </div>
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 2: Verify — 4 stats with colored left bars, big mono numbers**

---

### Task 3: Quick Actions — Mission Cards

**Files:**
- Modify: `pages/Dashboard.tsx` — quick actions section

**What changes:**
Reduce from 6 identical small cards to 4 larger "mission cards" with more visual impact. Each has a glowing icon area, bold label, and description.

- [ ] **Step 1: Redesign to 4 mission-style action cards**

```tsx
const quickActions = [
  { l: 'Create Character', Icon: Upload, p: 'upload' as Page, desc: 'Design from scratch or import references', color: 'var(--accent)' },
  { l: 'Direct Scene', Icon: Camera, p: 'director' as Page, desc: 'AI hero shot generation with full control', color: 'var(--cyan)' },
  { l: 'Photo Session', Icon: Wand2, p: 'session' as Page, desc: 'Automated photo shoots with presets', color: 'var(--magenta)' },
  { l: 'AI Editor', Icon: Repeat, p: 'editor' as Page, desc: 'Relight, face swap, try-on, 360°', color: 'var(--blue-light, #6878f0)' },
]
```

```tsx
{/* Quick Actions — Mission Cards */}
<div className="px-8 py-4">
  <div className="nr-label" style={{ marginBottom: '0.75rem' }}>QUICK ACTIONS</div>
  <div className="grid grid-cols-4 gap-3 stagger-children">
    {quickActions.map(a => (
      <button
        key={a.l}
        onClick={() => onNav(a.p)}
        className="group text-left cursor-pointer nr-neon-border"
        style={{
          background: 'var(--nr-bg-2)',
          border: '1px solid var(--nr-border)',
          borderRadius: '6px',
          padding: '1.25rem',
          transition: 'all 0.2s',
        }}
      >
        <div className="w-10 h-10 flex items-center justify-center rounded mb-3"
          style={{ background: `color-mix(in srgb, ${a.color} 12%, transparent)` }}>
          <a.Icon size={20} style={{ color: a.color }} />
        </div>
        <div className="font-heading text-sm font-bold" style={{ color: 'var(--nr-text-1)' }}>{a.l}</div>
        <div className="text-[11px] mt-1" style={{ color: 'var(--nr-text-3)' }}>{a.desc}</div>
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Verify — 4 cards with icon glow areas, hover neon border**

---

### Task 4: Character Spotlight — Featured Character Large

**Files:**
- Modify: `pages/Dashboard.tsx` — characters section

**What changes:**
Instead of 3 equal cards, show one FEATURED character large (with big photo and action buttons) and remaining as a compact horizontal list. If no characters, show a dramatic "create your first" CTA.

- [ ] **Step 1: Rewrite character section as spotlight layout**

Featured character (first/most used) gets ~60% width with large thumbnail, name, stats, and "Direct Scene" + "Photo Session" action buttons. Remaining characters appear as small avatars in a row.

The empty state shows a centered CTA: "Your universe awaits — create your first character" with a pulsing Create button.

```tsx
{/* Character Spotlight + Activity */}
<div className="px-8 py-4 flex gap-5">
  <div className="flex-1">
    <div className="flex justify-between items-center mb-3">
      <div className="nr-label">YOUR CHARACTERS</div>
      {characters.length > 0 && (
        <button onClick={() => onNav('characters')} className="font-jet text-[10px]" style={{ color: 'var(--accent)' }}>VIEW ALL →</button>
      )}
    </div>
    {characters.length === 0 ? (
      /* Empty state */
      <div className="flex flex-col items-center justify-center py-16 nr-hud"
        style={{ background: 'var(--nr-bg-2)', border: '1px solid var(--nr-border)', borderRadius: '6px' }}>
        <div className="w-16 h-16 flex items-center justify-center rounded-full mb-4"
          style={{ background: 'rgba(0,255,200,0.06)', border: '1px solid var(--nr-border-cyan)' }}>
          <Upload size={24} style={{ color: 'var(--cyan)' }} />
        </div>
        <p className="nr-heading" style={{ fontSize: '1rem', color: 'var(--nr-text-1)' }}>Your universe awaits</p>
        <p className="text-[12px] mt-1 mb-4" style={{ color: 'var(--nr-text-3)' }}>Create your first character to start generating</p>
        <button onClick={() => onNav('upload')} className="nr-btn nr-btn-pulse">Create Character</button>
      </div>
    ) : (
      <div className="flex gap-4">
        {/* Featured character — large */}
        {(() => {
          const feat = [...characters].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0]
          const photosCount = galleryItems.filter(i => i.characterId === feat.id).length
          return (
            <div className="flex-1 nr-hud nr-neon-border--cyan overflow-hidden"
              style={{ background: 'var(--nr-bg-2)', border: '1px solid var(--nr-border)', borderRadius: '6px' }}>
              <div className="h-48 relative" style={{
                background: feat.thumbnail ? `url(${feat.thumbnail}) center/cover` : 'var(--nr-bg-3)',
              }}>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--nr-bg-2) 0%, transparent 60%)' }} />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="nr-heading" style={{ fontSize: '1.25rem' }}>{feat.name}</h3>
                  <p className="font-jet text-[10px] mt-1" style={{ color: 'var(--nr-text-2)' }}>
                    {feat.usageCount || 0} uses · {photosCount} photos · {feat.characteristics || 'No style set'}
                  </p>
                </div>
              </div>
              <div className="px-4 py-3 flex gap-2">
                <button onClick={() => onNav('director')} className="nr-btn-ghost flex-1 text-[11px] py-2">Direct Scene</button>
                <button onClick={() => onNav('session')} className="nr-btn-ghost flex-1 text-[11px] py-2">Photo Session</button>
              </div>
            </div>
          )
        })()}

        {/* Other characters — compact vertical list */}
        {characters.length > 1 && (
          <div className="w-[200px] space-y-2 max-h-[280px] overflow-y-auto nr-scroll">
            {characters.slice(1, 6).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2 cursor-pointer nr-neon-border"
                onClick={() => onNav('characters')}
                style={{ background: 'var(--nr-bg-2)', border: '1px solid var(--nr-border)', borderRadius: '4px' }}>
                <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0"
                  style={{ background: 'var(--nr-bg-3)' }}>
                  {c.thumbnail
                    ? <img src={c.thumbnail} alt={c.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: 'var(--nr-text-2)' }}>{c.name[0]}</div>
                  }
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate" style={{ color: 'var(--nr-text-1)' }}>{c.name}</div>
                  <div className="font-jet text-[9px]" style={{ color: 'var(--nr-text-3)' }}>{c.usageCount || 0} uses</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>

  {/* Activity Log — Terminal Style (Task 5) */}
</div>
```

- [ ] **Step 2: Verify — featured character is large with photo, others compact on right**

---

### Task 5: Activity Log — Terminal Style

**Files:**
- Modify: `pages/Dashboard.tsx` — activity section

**What changes:**
Replace card-in-card activity items with a terminal log aesthetic. Monospace text, cyan timestamps, single-line entries with colored dots.

- [ ] **Step 1: Rewrite activity as terminal log**

```tsx
{/* Activity Log — Terminal */}
<div className="w-[280px] shrink-0">
  <div className="nr-label" style={{ marginBottom: '0.75rem' }}>ACTIVITY LOG</div>
  <div className="nr-scanline-anim p-3" style={{
    background: 'var(--nr-bg-1)',
    border: '1px solid var(--nr-border)',
    borderRadius: '6px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
  }}>
    <div className="flex items-center gap-2 pb-2 mb-2" style={{ borderBottom: '1px solid var(--nr-border)' }}>
      <span className="nr-status nr-status--online" />
      <span style={{ color: 'var(--cyan)' }}>~/vist/activity.log</span>
    </div>
    {recentActivity.length === 0 ? (
      <div className="py-4 text-center" style={{ color: 'var(--nr-text-3)' }}>
        <span style={{ color: 'var(--nr-text-3)' }}>$ no entries yet_</span>
      </div>
    ) : (
      <div className="space-y-1.5">
        {recentActivity.map((e, i) => (
          <div key={i} className="flex items-start gap-2" style={{ lineHeight: 1.4 }}>
            <span style={{ color: e.color, flexShrink: 0 }}>●</span>
            <span style={{ color: 'var(--nr-text-2)' }}>
              <span style={{ color: 'var(--cyan)' }}>[{e.time}]</span>{' '}
              {e.type}{' '}
              <span style={{ color: 'var(--nr-text-3)' }}>— {e.char}</span>
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 2: Verify — terminal-style log with cyan timestamps and colored dots**

---

### Task 6: Gallery Filmstrip + Final Assembly

**Files:**
- Modify: `pages/Dashboard.tsx` — add filmstrip at bottom, assemble all sections

**What changes:**
Add a horizontal strip of recent gallery thumbnails at the bottom. Then verify the full page flow looks cohesive.

- [ ] **Step 1: Add recent gallery filmstrip**

```tsx
{/* Recent Gallery — Filmstrip */}
{galleryItems.length > 0 && (
  <div className="px-8 py-4">
    <div className="flex justify-between items-center mb-3">
      <div className="nr-label">RECENT RENDERS</div>
      <button onClick={() => onNav('gallery')} className="font-jet text-[10px]" style={{ color: 'var(--accent)' }}>OPEN GALLERY →</button>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-2 nr-scroll">
      {galleryItems.slice(0, 12).map(item => (
        <div key={item.id} className="w-20 h-20 flex-shrink-0 rounded overflow-hidden cursor-pointer nr-neon-border"
          onClick={() => onNav('gallery')}
          style={{ border: '1px solid var(--nr-border)' }}>
          <img src={item.url || item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Full assembly — put all sections together in correct order:**
1. Hero Header (Task 1)
2. Stats Row (Task 2)
3. Separator line
4. Quick Actions (Task 3)
5. Character Spotlight + Activity Log side by side (Task 4 + 5)
6. Gallery Filmstrip (Task 6)

- [ ] **Step 3: Run dev server, navigate to Dashboard, verify:**
- Username shows in header
- Credits and plan badge display
- 4 stats with colored left bars
- 4 mission cards with hover glow
- Featured character large, others compact
- Terminal-style activity log
- Gallery filmstrip at bottom
- All animations work (stagger, hover, scanlines)
- No TypeScript errors

- [ ] **Step 4: Commit**
```bash
git add pages/Dashboard.tsx
git commit -m "feat: redesign Dashboard as cyberpunk Command Center with HUD elements"
```
