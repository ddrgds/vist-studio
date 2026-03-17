-- PART 1: Alter characters table + create new tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS reference_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS seed_prompt TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS render_style TEXT DEFAULT 'realistic';
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS lora_url TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS lora_status TEXT DEFAULT 'none';
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS generation_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.generations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id    TEXT REFERENCES public.characters(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('image', 'video', 'edit', 'lipsync')),
  result_url      TEXT NOT NULL,
  thumbnail_url   TEXT,
  prompt          TEXT,
  engine          TEXT,
  format          TEXT,
  resolution      TEXT,
  params_json     JSONB DEFAULT '{}',
  credits_used    INTEGER NOT NULL DEFAULT 0,
  favorite        BOOLEAN NOT NULL DEFAULT FALSE,
  tags            TEXT[] DEFAULT '{}',
  exported_to     TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_user ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_character ON public.generations(character_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON public.generations(type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON public.generations(created_at DESC);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  generation_id   UUID REFERENCES public.generations(id) ON DELETE SET NULL,
  balance_after   INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON public.credit_transactions(user_id);
