-- 004_character_voice.sql
-- Adds voice profile fields to characters table for ElevenLabs voice cloning.
--
-- voice_id            — ElevenLabs voice_id (UUID-style string returned by /v1/voices/add or premade)
-- voice_name          — Display name (e.g. "Mi voz", "Sofia Editorial", or library preset name)
-- voice_source        — 'cloned' (user recorded/uploaded) | 'library' (premade) | 'shared' (cloned from another user)
-- voice_preview_url   — short MP3 preview for the character page (premade voices have one; cloned voices we cache)
-- voice_created_at    — When the voice was assigned/cloned (for analytics + later cleanup)

alter table public.characters
  add column if not exists voice_id text,
  add column if not exists voice_name text,
  add column if not exists voice_source text check (voice_source in ('cloned','library','shared')),
  add column if not exists voice_preview_url text,
  add column if not exists voice_created_at timestamptz;

create index if not exists characters_voice_id_idx on public.characters (voice_id);

comment on column public.characters.voice_id is 'ElevenLabs voice_id assigned to this character (null = no voice yet)';
comment on column public.characters.voice_source is 'How the voice was added: cloned by user, picked from library, or shared from another char';
