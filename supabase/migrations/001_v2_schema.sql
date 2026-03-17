-- ══════════════════════════════════════════════════════════
-- VIST Studio v2 — Schema Migration
--
-- Existing tables (NOT touched):
--   profiles        — user profiles + subscription + credits
--   characters      — character data + storage URLs
--   webhook_events  — Lemon Squeezy idempotency
--
-- New tables:
--   generations           — every AI output (image/video)
--   credit_transactions   — credit audit log
--
-- New columns on existing tables:
--   characters.reference_urls   — array of face reference URLs for ComfyUI
--   characters.seed_prompt      — master prompt for consistency
--   characters.render_style     — realistic, anime, 3d, etc.
--   characters.lora_url         — trained LoRA weights
--   characters.lora_status      — training status
--
-- Run via: supabase db push
-- Or manually in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════
-- 1. ALTER characters — add new columns for v2
-- ══════════════════════════════════════════════════════════

-- Reference URLs for face consistency (ComfyUI PuLID)
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS reference_urls TEXT[] DEFAULT '{}';

-- Seed prompt — the master prompt that defines this persona
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS seed_prompt TEXT;

-- Render style
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS render_style TEXT DEFAULT 'realistic';

-- LoRA training
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS lora_url TEXT;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS lora_status TEXT DEFAULT 'none'
  CHECK (lora_status IS NULL OR lora_status IN ('none', 'training', 'ready', 'failed'));

-- Generation counter
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS generation_count INTEGER NOT NULL DEFAULT 0;

-- ══════════════════════════════════════════════════════════
-- 2. generations — every AI output
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.generations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id    UUID REFERENCES public.characters(id) ON DELETE SET NULL,

  -- Content
  type            TEXT NOT NULL CHECK (type IN ('image', 'video', 'edit', 'lipsync')),
  result_url      TEXT NOT NULL,
  thumbnail_url   TEXT,

  -- Generation params
  prompt          TEXT,
  engine          TEXT,                -- e.g. 'gemini:nb2', 'fal:kontext-multi', 'comfyui:pulid-flux'
  format          TEXT,                -- '1:1', '3:4', '9:16', etc.
  resolution      TEXT,                -- '1k', '2k', '4k'
  params_json     JSONB DEFAULT '{}',  -- full params for "Reuse settings"

  -- Social
  credits_used    INTEGER NOT NULL DEFAULT 0,
  favorite        BOOLEAN NOT NULL DEFAULT FALSE,
  tags            TEXT[] DEFAULT '{}',
  exported_to     TEXT[] DEFAULT '{}', -- ['instagram', 'tiktok', ...]

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_user ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_character ON public.generations(character_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON public.generations(type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON public.generations(created_at DESC);

-- ══════════════════════════════════════════════════════════
-- 3. credit_transactions — audit log
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  amount          INTEGER NOT NULL,    -- positive = add, negative = deduct
  reason          TEXT NOT NULL,        -- 'generation', 'monthly_reset', 'purchase', 'refund'
  generation_id   UUID REFERENCES public.generations(id) ON DELETE SET NULL,
  balance_after   INTEGER NOT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON public.credit_transactions(user_id);

-- ══════════════════════════════════════════════════════════
-- 4. Atomic credit functions
-- ══════════════════════════════════════════════════════════

-- Deduct credits atomically (prevents race conditions)
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
  UPDATE public.profiles
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

-- Add credits (purchases, monthly reset, refunds)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'purchase'
)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET credits_remaining = credits_remaining + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_balance;

  INSERT INTO public.credit_transactions (user_id, amount, reason, balance_after)
  VALUES (p_user_id, p_amount, p_reason, v_balance);

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment generation count on character
CREATE OR REPLACE FUNCTION public.increment_generation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.character_id IS NOT NULL THEN
    UPDATE public.characters
    SET generation_count = generation_count + 1
    WHERE id = NEW.character_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_generation_created
  AFTER INSERT ON public.generations
  FOR EACH ROW EXECUTE FUNCTION public.increment_generation_count();

-- ══════════════════════════════════════════════════════════
-- 5. Row Level Security
-- ══════════════════════════════════════════════════════════

-- generations: CRUD own only
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Generations: own only" ON public.generations
  FOR ALL USING (auth.uid() = user_id);

-- credit_transactions: read own only
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credits: read own" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- characters: ensure RLS is enabled (may already be)
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Only create policy if it doesn't exist (avoid error on re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'characters' AND policyname = 'Characters: own only'
  ) THEN
    CREATE POLICY "Characters: own only" ON public.characters
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
