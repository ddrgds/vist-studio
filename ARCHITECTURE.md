# VIST Studio — Architecture v2

> "Create. Edit. Post." — The CapCut of AI Influencers.

## Vision

VIST Studio is a focused AI content creation platform for virtual influencers.
Unlike competitor platforms with 11+ navigation sections and 30+ tools,
VIST has **3 steps**: Create your persona, generate content, export for social media.

---

## 1. Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 19 + TypeScript + Vite | Already in place, proven |
| **Styling** | Tailwind CSS v4 | Already in place |
| **State** | Zustand (stores/) | Already in place, lightweight |
| **Routing** | Internal page state (no React Router needed for SPA) | Simpler than router for 3-page app |
| **Backend** | Supabase (Auth, DB, Storage, Edge Functions) | Already integrated for auth |
| **AI Proxy** | Supabase Edge Functions (Deno) | Replaces Vite dev proxy for prod |
| **Payments** | Lemon Squeezy → Supabase webhook | Lightweight, creator-friendly |
| **Deploy** | Cloudflare Pages | Already configured |
| **CDN/Storage** | Supabase Storage + fal.storage | Generated images/videos |

---

## 2. Application Architecture

### 2.1 Page Structure — 3 Steps

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (simplified)                               │
│                                                     │
│  CREATE                                             │
│    ① Create Persona     ← Character creation        │
│    ② Content Studio     ← Generate photos/videos    │
│                                                     │
│  MANAGE                                             │
│    Gallery              ← All content + export      │
│    Characters           ← Your personas             │
│                                                     │
│  ─────────                                          │
│  Pricing                                            │
│  Profile                                            │
└─────────────────────────────────────────────────────┘
```

**Page mapping (refactor, not rewrite):**

| New Page | Source | What changes |
|----------|--------|-------------|
| **Create Persona** | UploadCharacter.tsx | Simplified, Soul 2.0 primary, 1→approve→2 flow |
| **Content Studio** | Director.tsx + VideoStudio.tsx merged | Unified: select persona → generate photo OR video → inline actions (Edit, Relight, Angles, Make Reel) |
| **Gallery** | Gallery.tsx | Add export presets (IG Post, IG Story, TikTok, YT Thumb) |
| **Characters** | CharacterGallery.tsx | Unchanged |
| **AI Editor** | AIEditor.tsx | Opens as modal/overlay from Content Studio, not a separate page |

**Removed pages:** Dashboard (merge into Content Studio welcome state), UniverseBuilder, ContentCalendar, Analytics, PhotoSession (merge into Content Studio).

### 2.2 Content Studio — The Core Experience

This is where the user spends 90% of their time. It combines what was Director + Photo Session + Video Studio into one unified workspace.

```
┌─ Content Studio ─────────────────────────────────────┐
│                                                      │
│  [Character: Luna ▼]  [Format: 9:16 ▼]  [Engine ▼]  │
│                                                      │
│  ┌─ LEFT: Controls ──┐  ┌─ RIGHT: Canvas ─────────┐ │
│  │                    │  │                          │ │
│  │  Mode: [Photo]     │  │   Generated image/video  │ │
│  │        [Video]     │  │                          │ │
│  │        [Reel]      │  │   ┌──────────────────┐   │ │
│  │                    │  │   │  Click actions:   │   │ │
│  │  Scene / Prompt    │  │   │  ✨ Edit          │   │ │
│  │  Pose / Style      │  │   │  🔄 Angles       │   │ │
│  │  Lighting          │  │   │  💡 Relight      │   │ │
│  │                    │  │   │  🎬 Make Reel    │   │ │
│  │  [Generate]        │  │   │  ⬆️ Upscale      │   │ │
│  │                    │  │   │  📥 Export        │   │ │
│  └────────────────────┘  │   └──────────────────┘   │ │
│                          └──────────────────────────┘ │
│                                                      │
│  ┌─ Filmstrip (history) ─────────────────────────┐   │
│  │  [img1] [img2] [img3] [vid1] [img4] ...       │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Key UX principle:** Every generated image has **inline actions** — no need to navigate to a separate page. Click "Edit" opens the AI Editor as an overlay. Click "Make Reel" generates a video from that image. Click "Export" shows format presets.

---

## 3. Directriz 1 — AI Adapter Pattern

### Problem
Current code calls AI providers directly from the frontend via Vite dev proxies.
This is fragile, exposes API routing logic to the client, and makes provider
changes require frontend deploys.

### Solution: Supabase Edge Functions as AI Gateway

```
Frontend                    Backend                         AI Providers
────────                    ───────                         ────────────

React App  ──POST──▶  /functions/v1/ai/generate  ──▶  Gemini
                      /functions/v1/ai/edit           fal.ai (FLUX, Kling)
                      /functions/v1/ai/video          Replicate
                      /functions/v1/ai/tts            OpenAI
                                                      Higgsfield (Soul)
                      ┌─────────────────────┐         ElevenLabs
                      │  AI Gateway Logic:  │
                      │  - Route by engine  │
                      │  - Validate credits │
                      │  - Log generation   │
                      │  - Rate limit       │
                      │  - Queue long jobs  │
                      └─────────────────────┘
```

### Frontend Contract

The frontend calls ONE endpoint shape. It never knows which provider is used.

```typescript
// services/aiGateway.ts — the ONLY file that talks to AI

interface GenerateRequest {
  type: 'image' | 'video' | 'edit' | 'tts' | 'lipsync';
  engine?: string;          // optional — server can auto-select
  persona_id: string;       // which character
  prompt: string;
  format: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  resolution?: '1k' | '2k' | '4k';
  // Type-specific params
  reference_video_url?: string;  // for motion control
  audio_url?: string;            // for lipsync
  instruction?: string;          // for edits
  base_image_url?: string;       // for edits, img2vid
}

interface GenerateResponse {
  id: string;
  status: 'completed' | 'queued' | 'processing';
  result_url?: string;
  poll_url?: string;          // for async jobs (video)
  credits_used: number;
  engine_used: string;        // what actually ran
}

// Usage:
const result = await aiGateway.generate({
  type: 'image',
  persona_id: 'abc-123',
  prompt: 'Street style photo in Tokyo',
  format: '3:4',
});
```

### Backend Adapter (Supabase Edge Function)

```typescript
// supabase/functions/ai-generate/index.ts

import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

// Provider adapters — each normalizes input/output
import { geminiAdapter } from './adapters/gemini.ts'
import { falAdapter } from './adapters/fal.ts'
import { higgsfieldAdapter } from './adapters/higgsfield.ts'
import { openaiAdapter } from './adapters/openai.ts'
import { replicateAdapter } from './adapters/replicate.ts'

const ADAPTERS: Record<string, AIAdapter> = {
  'gemini:*':      geminiAdapter,
  'fal:*':         falAdapter,
  'higgsfield:*':  higgsfieldAdapter,
  'openai:*':      openaiAdapter,
  'replicate:*':   replicateAdapter,
}

serve(async (req) => {
  const supabase = createClient(/* ... */)
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('Authorization')?.replace('Bearer ', '')
  )
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body: GenerateRequest = await req.json()

  // 1. Check credits
  const { data: profile } = await supabase
    .from('users')
    .select('credits_remaining')
    .eq('id', user.id)
    .single()

  const cost = calculateCost(body.engine, body.type)
  if (profile.credits_remaining < cost) {
    return Response.json({ error: 'Insufficient credits' }, { status: 402 })
  }

  // 2. Route to adapter
  const adapter = resolveAdapter(body.engine, body.type)
  const result = await adapter.generate(body)

  // 3. Deduct credits + log generation
  await supabase.rpc('deduct_credits', { user_id: user.id, amount: cost })
  await supabase.from('generations').insert({
    user_id: user.id,
    persona_id: body.persona_id,
    type: body.type,
    engine: result.engine_used,
    result_url: result.result_url,
    credits_used: cost,
    prompt: body.prompt,
  })

  return Response.json(result)
})
```

### Migration Path (from current code)

The current services (falService.ts, geminiService.ts, etc.) become the
**adapter implementations** on the backend. The frontend services get replaced
by a single `aiGateway.ts`. This can be done incrementally:

1. Phase 1: Keep Vite proxies working, add Edge Functions in parallel
2. Phase 2: Frontend calls Edge Functions, Vite proxies become fallback
3. Phase 3: Remove Vite proxies, all traffic through Edge Functions

---

## 4. Directriz 2 — AI Editor State Management

### Problem
The AI Editor handles canvas layers, undo/redo history, and large image blobs.
This must not block the main thread or cause memory leaks.

### Solution: Zustand + Immer + Blob Management

```typescript
// stores/editorStore.ts

interface EditorLayer {
  id: string;
  type: 'image' | 'mask' | 'overlay';
  blobUrl: string;        // Object URL — revoked on layer delete
  opacity: number;
  visible: boolean;
  transform: { x: number; y: number; scale: number; rotation: number };
}

interface EditorState {
  // Layers
  layers: EditorLayer[];
  activeLayerId: string | null;

  // History (undo/redo)
  history: EditorLayer[][];    // stack of layer snapshots
  historyIndex: number;
  maxHistory: number;          // cap at 30 to limit memory

  // Active tool
  activeTool: 'relight' | 'inpaint' | 'faceswap' | 'tryon' | 'bgswap' |
              'enhance' | 'style' | 'angles' | null;
  toolParams: Record<string, any>;

  // Actions
  addLayer: (blob: Blob, type: EditorLayer['type']) => string;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<EditorLayer>) => void;
  setActiveTool: (tool: EditorState['activeTool']) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Cleanup
  dispose: () => void;        // revoke ALL blob URLs
}
```

### Memory Management Rules

1. **Blob URLs are revoked** when a layer is deleted or the editor closes
2. **History is capped** at 30 entries — oldest entries are evicted and their blobs revoked
3. **Large operations** (generate, enhance) show a loading state and use `requestIdleCallback` for non-critical updates
4. **The editor store is NOT persisted** — it lives only while the editor overlay is open
5. **Generated results** are saved to Supabase Storage, not kept as blobs in memory

### Editor as Overlay (not a page)

```tsx
// In Content Studio:
const [editorImage, setEditorImage] = useState<string | null>(null);

// When user clicks "Edit" on a generated image:
<button onClick={() => setEditorImage(imageUrl)}>Edit</button>

{editorImage && (
  <EditorOverlay
    imageUrl={editorImage}
    onClose={() => setEditorImage(null)}
    onSave={(resultUrl) => {
      addToGallery(resultUrl);
      setEditorImage(null);
    }}
  />
)}
```

---

## 5. Directriz 3 — Supabase Schema

### 5.1 SQL Schema

```sql
-- ══════════════════════════════════════════════
-- VIST Studio — Database Schema v2
-- Supabase (PostgreSQL 15+)
-- ══════════════════════════════════════════════

-- ── Extensions ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════
-- 1. USERS (extends Supabase auth.users)
-- ══════════════════════════════════════════════
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  bio             TEXT,

  -- Subscription
  subscription_plan   TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'creator', 'pro', 'studio')),
  subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'cancelled', 'past_due')),
  lemon_customer_id   TEXT,          -- Lemon Squeezy customer ID
  lemon_subscription_id TEXT,        -- Lemon Squeezy subscription ID

  -- Credits
  credits_remaining  INTEGER NOT NULL DEFAULT 50,  -- free tier starts with 50
  credits_monthly    INTEGER NOT NULL DEFAULT 50,   -- reset amount per billing cycle
  credits_reset_at   TIMESTAMPTZ,                   -- next reset date

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 2. VIRTUAL PERSONAS (AI Characters)
-- ══════════════════════════════════════════════
CREATE TABLE public.virtual_personas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Identity
  name            TEXT NOT NULL,
  thumbnail_url   TEXT,                -- primary face image URL

  -- AI Consistency Data
  seed_prompt     TEXT,                -- the master prompt that defines this persona
  render_style    TEXT DEFAULT 'realistic',  -- realistic, anime, 3d-render, etc.
  characteristics TEXT,                -- physical features, personality
  fashion_style   TEXT,                -- default outfit description

  -- Reference Images (for face consistency)
  reference_urls  TEXT[] DEFAULT '{}', -- array of Supabase Storage URLs

  -- Soul ID / LoRA (if trained)
  lora_url        TEXT,                -- trained LoRA weights URL
  lora_status     TEXT DEFAULT 'none'
    CHECK (lora_status IN ('none', 'training', 'ready', 'failed')),
  soul_style_id   TEXT,                -- Higgsfield Soul style UUID

  -- Stats
  generation_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_personas_user ON public.virtual_personas(user_id);

-- ══════════════════════════════════════════════
-- 3. GENERATIONS (every AI output)
-- ══════════════════════════════════════════════
CREATE TABLE public.generations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  persona_id      UUID REFERENCES public.virtual_personas(id) ON DELETE SET NULL,

  -- Content
  type            TEXT NOT NULL CHECK (type IN ('image', 'video', 'edit', 'lipsync')),
  result_url      TEXT NOT NULL,       -- Supabase Storage URL
  thumbnail_url   TEXT,                -- auto-generated thumbnail for videos

  -- Generation params (for "Reuse settings")
  prompt          TEXT,
  engine          TEXT,                -- e.g. 'gemini:nb2', 'fal:kontext-multi'
  format          TEXT,                -- '1:1', '3:4', '9:16', etc.
  resolution      TEXT,                -- '1k', '2k', '4k'
  params_json     JSONB DEFAULT '{}',  -- full params for reproducibility

  -- Social
  credits_used    INTEGER NOT NULL DEFAULT 0,
  favorite        BOOLEAN NOT NULL DEFAULT FALSE,
  tags            TEXT[] DEFAULT '{}',

  -- Export tracking
  exported_to     TEXT[] DEFAULT '{}', -- ['instagram', 'tiktok', ...]

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generations_user ON public.generations(user_id);
CREATE INDEX idx_generations_persona ON public.generations(persona_id);
CREATE INDEX idx_generations_type ON public.generations(type);
CREATE INDEX idx_generations_created ON public.generations(created_at DESC);

-- ══════════════════════════════════════════════
-- 4. CREDIT TRANSACTIONS (audit log)
-- ══════════════════════════════════════════════
CREATE TABLE public.credit_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  amount          INTEGER NOT NULL,    -- positive = add, negative = deduct
  reason          TEXT NOT NULL,        -- 'generation', 'monthly_reset', 'purchase', 'refund'
  generation_id   UUID REFERENCES public.generations(id) ON DELETE SET NULL,

  balance_after   INTEGER NOT NULL,    -- snapshot of credits after this transaction

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id);

-- ══════════════════════════════════════════════
-- 5. HELPER FUNCTIONS
-- ══════════════════════════════════════════════

-- Atomic credit deduction (prevents race conditions)
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'generation',
  p_generation_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.users
  SET credits_remaining = credits_remaining - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
    AND credits_remaining >= p_amount
  RETURNING credits_remaining INTO v_balance;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, generation_id, balance_after)
  VALUES (p_user_id, -p_amount, p_reason, p_generation_id, v_balance);

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add credits (for purchases, monthly reset, refunds)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'purchase'
)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.users
  SET credits_remaining = credits_remaining + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_balance;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (p_user_id, p_amount, p_reason, v_balance);

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own profile
CREATE POLICY "Users: own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Personas: CRUD own personas only
CREATE POLICY "Personas: own only" ON public.virtual_personas
  FOR ALL USING (auth.uid() = user_id);

-- Generations: CRUD own generations only
CREATE POLICY "Generations: own only" ON public.generations
  FOR ALL USING (auth.uid() = user_id);

-- Credit transactions: read own only
CREATE POLICY "Credits: read own" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypass (for Edge Functions / webhooks)
-- Edge Functions use the service_role key which bypasses RLS automatically.
```

### 5.2 Lemon Squeezy Webhook Handler

```typescript
// supabase/functions/webhook-lemonsqueezy/index.ts

serve(async (req) => {
  // Verify webhook signature
  const signature = req.headers.get('X-Signature');
  // ... HMAC verification ...

  const event = await req.json();
  const supabase = createServiceClient(); // service_role bypasses RLS

  switch (event.meta.event_name) {
    case 'subscription_created':
    case 'subscription_updated': {
      const plan = mapVariantToPlan(event.data.attributes.variant_id);
      const credits = PLAN_CREDITS[plan];
      await supabase.from('users').update({
        subscription_plan: plan,
        subscription_status: 'active',
        lemon_customer_id: event.data.attributes.customer_id,
        lemon_subscription_id: event.data.id,
        credits_monthly: credits,
      }).eq('email', event.data.attributes.user_email);
      break;
    }
    case 'subscription_payment_success': {
      // Monthly credit reset
      const user = await findUserByLemonId(event.data.attributes.customer_id);
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: user.credits_monthly,
        p_reason: 'monthly_reset',
      });
      break;
    }
    case 'subscription_cancelled': {
      await supabase.from('users').update({
        subscription_status: 'cancelled',
      }).eq('lemon_subscription_id', event.data.id);
      break;
    }
  }

  return new Response('OK', { status: 200 });
});
```

---

## 6. Folder Structure

```
vist/
├── public/
│   ├── phone/                    # Landing page images
│   └── favicon.ico
│
├── src/                          # ← rename from root to src/ (clean start feel)
│   ├── index.tsx                 # Entry point
│   ├── App.tsx                   # Router: 3 pages + auth
│   ├── index.css                 # Design system (unified palette)
│   │
│   ├── pages/
│   │   ├── Landing.tsx           # Marketing page
│   │   ├── CreatePersona.tsx     # Step 1: Character creation
│   │   ├── ContentStudio.tsx     # Step 2: Generate photos/videos (merged Director+Video)
│   │   └── Gallery.tsx           # Step 3: All content + export
│   │
│   ├── features/
│   │   ├── editor/               # AI Editor (overlay, not page)
│   │   │   ├── EditorOverlay.tsx
│   │   │   ├── tools/
│   │   │   │   ├── RelightTool.tsx
│   │   │   │   ├── InpaintTool.tsx
│   │   │   │   ├── FaceSwapTool.tsx
│   │   │   │   ├── TryOnTool.tsx
│   │   │   │   ├── BgSwapTool.tsx
│   │   │   │   ├── EnhanceTool.tsx
│   │   │   │   └── AnglesTool.tsx
│   │   │   └── EditorCanvas.tsx
│   │   │
│   │   ├── export/               # Export for social media
│   │   │   ├── ExportModal.tsx
│   │   │   └── formatPresets.ts  # IG Post, IG Story, TikTok, YT, etc.
│   │   │
│   │   └── video/                # Video generation (inline in ContentStudio)
│   │       ├── MotionControl.tsx
│   │       ├── LipSync.tsx
│   │       └── ImageToVideo.tsx
│   │
│   ├── components/
│   │   ├── Sidebar.tsx           # Simplified nav (4 items)
│   │   ├── MobileNav.tsx
│   │   ├── AuthScreen.tsx
│   │   ├── PricingPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── ui/
│   │       ├── feature-carousel.tsx
│   │       └── ...shared components
│   │
│   ├── services/
│   │   ├── aiGateway.ts          # ★ SINGLE entry point for all AI calls
│   │   ├── supabaseClient.ts     # Supabase client init
│   │   └── storageService.ts     # Upload/download from Supabase Storage
│   │
│   ├── stores/
│   │   ├── personaStore.ts       # Characters (synced with Supabase)
│   │   ├── galleryStore.ts       # Generations (synced with Supabase)
│   │   ├── editorStore.ts        # Editor state (local only, not persisted)
│   │   └── profileStore.ts       # User profile + credits
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ToastContext.tsx
│   │
│   ├── lib/
│   │   ├── utils.ts              # cn() helper
│   │   └── constants.ts          # Credit costs, plan limits
│   │
│   └── types/
│       ├── ai.ts                 # GenerateRequest, GenerateResponse
│       ├── persona.ts            # VirtualPersona type
│       ├── generation.ts         # Generation type
│       └── subscription.ts       # Plan, credits types
│
├── supabase/
│   ├── functions/
│   │   ├── ai-generate/          # AI Gateway Edge Function
│   │   │   ├── index.ts
│   │   │   └── adapters/
│   │   │       ├── gemini.ts
│   │   │       ├── fal.ts
│   │   │       ├── higgsfield.ts
│   │   │       ├── openai.ts
│   │   │       └── replicate.ts
│   │   │
│   │   └── webhook-lemonsqueezy/ # Payment webhook
│   │       └── index.ts
│   │
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── ARCHITECTURE.md               # This file
├── CLAUDE.md                     # AI assistant instructions
├── vite.config.ts
├── tsconfig.json
├── package.json
└── tailwind.config.ts
```

---

## 7. Migration Plan (from current → v2)

This is NOT a rewrite. It is a reorganization.

### Phase 1: Structure (1-2 days)
- [ ] Create `src/` directory, move files from root
- [ ] Merge Director + VideoStudio → ContentStudio.tsx
- [ ] Move AIEditor to features/editor/EditorOverlay.tsx (opens as overlay)
- [ ] Remove dead pages (UniverseBuilder, ContentCalendar, Analytics, Dashboard)
- [ ] Simplify Sidebar to 4 items
- [ ] Update App.tsx Page type

### Phase 2: AI Gateway (2-3 days)
- [ ] Create `services/aiGateway.ts` with unified interface
- [ ] Create first Edge Function (ai-generate) with Gemini adapter
- [ ] Migrate one flow end-to-end (persona creation)
- [ ] Add remaining adapters (fal, higgsfield, openai, replicate)
- [ ] Remove Vite dev proxies one by one

### Phase 3: Database (1-2 days)
- [ ] Run SQL migration in Supabase
- [ ] Migrate personaStore to sync with `virtual_personas` table
- [ ] Migrate galleryStore to sync with `generations` table
- [ ] Remove IndexedDB/localStorage persistence
- [ ] Set up Lemon Squeezy webhook

### Phase 4: Polish (1-2 days)
- [ ] Export modal with format presets
- [ ] Inline actions on generated images (Edit, Relight, Make Reel, Export)
- [ ] Landing page final pass
- [ ] Mobile responsive check

**Total estimated: 5-9 days of focused work, not weeks.**

---

## 9. ComfyUI Pipeline — Character Consistency Engine

### Problem
Individual API calls (fal.ai FLUX, Gemini, etc.) cannot guarantee face consistency
across generations. Each call is independent — the model "hopes" to recreate the same
face from a prompt, but results vary. This is the #1 quality issue for an AI influencer platform.

### Solution: ComfyUI as the Content Generation Engine

ComfyUI workflows run multiple models in a single pipeline with shared latent space.
Face identity is injected mathematically (PuLID/InstantID), not via prompt engineering.

### Two Creation Paths

**Path A: Create from Scratch (no photos)**
- User describes character via chips/prompt
- Engine: Gemini NB2 or Soul 2.0 (text-to-image)
- Generates 1 preview → user approves → 2 consistency variants
- Result: 3 reference photos saved to `virtual_personas.reference_urls`

**Path B: Upload Existing Photos**
- User uploads 1-5 photos of a character/person
- Engine: ComfyUI (PuLID extracts facial identity)
- Generates 1 test image to verify identity lock
- User approves → photos saved as references
- Result: uploaded photos saved to `virtual_personas.reference_urls`

### Content Generation (post-creation, both paths converge)

ALL content generation uses ComfyUI pipeline:

```
Input:
  - face_references: persona.reference_urls (3-5 images)
  - prompt: "Street style photo in Tokyo, golden hour"
  - outfit: "Black leather jacket, white tee" (text or image)
  - pose: "Walking, looking back" (text or ControlNet ref)
  - format: "9:16" (Story/Reel)

ComfyUI Workflow:
  PuLID Flux II ──→ locks facial identity from references
  ControlNet ────→ controls pose/body position
  IP-Adapter ───→ outfit/style transfer (if image ref provided)
  FLUX Dev ─────→ generates the image
  FaceDetailer ─→ refines facial details post-generation

Output:
  1 image with guaranteed face consistency
```

### What does NOT use ComfyUI

| Operation | Engine | Why not ComfyUI |
|-----------|--------|----------------|
| Relight | fal.ai Qwen Edit | Modifying existing image, no consistency needed |
| Inpaint | fal.ai OneReward | Same — editing pixels on existing image |
| Face Swap | fal.ai face-swap | Specialized model, works on existing image |
| Try-On | fal.ai FireRed | Same |
| BG Swap | fal.ai / Gemini | Same |
| Enhance/Upscale | fal.ai AuraSR | Same |
| Video | Kling via fal.ai | Specialized video models |
| Lip Sync | Kling Avatar | Specialized |
| TTS | ElevenLabs | Audio, not image |

### Deployment Options (in order of recommendation)

1. **fal.ai ComfyUI** — already using fal.ai, same billing, same SDK
2. **ViewComfy** — purpose-built, has PuLID+FLUX tutorials
3. **RunPod Serverless** — cheapest at scale but more engineering

### Adapter Integration

```typescript
// supabase/functions/ai-generate/adapters/comfyui.ts
const comfyuiAdapter: AIAdapter = {
  async generate(request) {
    // Upload face references to cloud storage
    // Submit ComfyUI workflow via API
    // Poll for completion
    // Return result URL
  }
}
```

The AI Gateway routes to ComfyUI for all `type: 'content'` requests,
and to Gemini/Soul for `type: 'create-persona'` requests.

### Cost Estimate

- ComfyUI generation: ~$0.03-0.05 per image (A100, 15-45s)
- vs current API calls: ~$0.03-0.10 per image (but inconsistent)
- Net: similar cost, dramatically better consistency

---

## 10. Principles

1. **3 steps, not 12.** If a feature doesn't fit in Create/Content/Gallery, it doesn't exist.
2. **One AI gateway.** Frontend never calls providers directly.
3. **Inline actions.** The user should never leave the Content Studio to edit/enhance/export.
4. **Social-first.** Every export option is named after a social platform, not a resolution.
5. **Credits are sacred.** Every deduction is atomic, logged, and auditable.
6. **The Editor is the moat.** Invest in canvas, layers, and tools. That's what Higgsfield can't do.
