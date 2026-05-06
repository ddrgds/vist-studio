-- ─────────────────────────────────────────────────────────────────
-- Migration 002: add content_mode to profiles
-- ─────────────────────────────────────────────────────────────────
-- Purpose: enable opt-in "Modo Creator" toggle for sensual editorial
-- presets (lingerie, boudoir, beach, etc). Standard mode is default,
-- Creator mode unlocks LATAM sensual presets after user confirms +18.
--
-- Apply via Supabase SQL editor or `supabase db push`.

-- 1. Add columns
alter table profiles
  add column if not exists content_mode text not null default 'standard'
    check (content_mode in ('standard', 'creator')),
  add column if not exists content_mode_confirmed_at timestamptz null;

-- 2. Index (optional — for analytics queries)
create index if not exists idx_profiles_content_mode on profiles(content_mode);

-- 3. Comment for docs
comment on column profiles.content_mode is
  'Content mode: standard (default, editorial) | creator (opt-in, sensual editorial / lingerie / boudoir). +18 confirmation required to switch to creator.';
comment on column profiles.content_mode_confirmed_at is
  'Timestamp when user confirmed +18 to enable creator mode. Used for compliance audit trail.';
