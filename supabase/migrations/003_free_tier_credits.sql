-- ─────────────────────────────────────────────────────────────────
-- Migration 003: Free tier weekly credit grant infrastructure
-- ─────────────────────────────────────────────────────────────────
-- Free tier: 50cr at signup + 25cr every Monday (auto-renewal).
-- This migration adds tracking columns + a function to grant the weekly
-- credits idempotently (so cron retries don't double-grant).
--
-- Apply via Supabase SQL editor or `supabase db push`.

-- 1. Track when last weekly grant was applied per user
alter table profiles
  add column if not exists last_weekly_grant_at timestamptz null;

-- 2. Grant function — atomic, idempotent
-- Returns the number of users actually granted (those whose last_grant was
-- before this Monday's start). Run weekly via cron.
create or replace function grant_weekly_free_credits(
  p_amount int default 25
) returns int
language plpgsql
security definer
as $$
declare
  v_monday_start timestamptz;
  v_granted int;
begin
  -- Compute start of current ISO week (Monday 00:00 UTC)
  v_monday_start := date_trunc('week', now());

  with updated as (
    update profiles
    set credits_remaining = credits_remaining + p_amount,
        last_weekly_grant_at = now(),
        updated_at = now()
    where subscription_status = 'free'
      and (last_weekly_grant_at is null or last_weekly_grant_at < v_monday_start)
    returning id
  )
  select count(*) into v_granted from updated;

  return v_granted;
end;
$$;

-- 3. Permissions
revoke all on function grant_weekly_free_credits(int) from public;
grant execute on function grant_weekly_free_credits(int) to service_role;

comment on function grant_weekly_free_credits(int) is
  'Grants weekly credits to free-tier users. Idempotent: skips users granted since current Monday. Run via Cloudflare Worker cron Monday 00:01 UTC.';

comment on column profiles.last_weekly_grant_at is
  'Timestamp of last weekly free-tier grant. Used by grant_weekly_free_credits() for idempotency.';
