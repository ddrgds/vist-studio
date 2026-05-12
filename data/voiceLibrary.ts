/**
 * voiceLibrary — Curated ElevenLabs premade voices for VIST characters.
 *
 * 12 voices selected for the LATAM AI-influencer market:
 *   - 4 voces femeninas LATAM (joven editorial, casual, sensual cálida, autoritaria)
 *   - 4 voces masculinas LATAM (joven casual, autoritaria pro, deep editorial, surfero)
 *   - 4 voces internacionales (US Gen-Z, US autoritaria, BR portugués, español Madrid)
 *
 * Each entry maps to an ElevenLabs premade voice_id. Premade voices need no
 * cloning credit — they're free to use for TTS. Listed in the order presented
 * to the user (most-recommended first).
 *
 * IMPORTANT: All voice_id values below are the official ElevenLabs premade
 * voice IDs (stable across the API). Preview URLs are mp3 samples hosted on
 * ElevenLabs' CDN, safe to embed in our app via the elevenlabs-api proxy.
 *
 * To audit / update: `GET /v2/voices?category=premade` returns the canonical list.
 */

export interface VoiceLibraryEntry {
  /** ElevenLabs premade voice_id */
  id: string;
  /** Display name shown in UI */
  label: string;
  /** Short Spanish description of the vibe */
  description: string;
  /** Gender — for the filter chips */
  gender: 'female' | 'male' | 'nonbinary';
  /** Language origin / accent category */
  region: 'latam' | 'es' | 'us' | 'br';
  /** Emoji for the chip — short visual cue */
  emoji: string;
}

export const VOICE_LIBRARY: VoiceLibraryEntry[] = [
  // ── Femeninas LATAM ──
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sara Editorial',     description: 'Joven femenina, cálida, narrativa editorial', gender: 'female', region: 'latam', emoji: '🌸' },
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Camila Casual',      description: 'Femenina cercana, conversacional, día a día',  gender: 'female', region: 'latam', emoji: '☀️' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lila Suave',         description: 'Susurros suaves, sensual editorial',           gender: 'female', region: 'latam', emoji: '🌙' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Valentina Pro',      description: 'Autoritaria femenina, business / luxury',      gender: 'female', region: 'latam', emoji: '💎' },

  // ── Masculinas LATAM ──
  { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Diego Casual',       description: 'Joven masculino, energético, casual',          gender: 'male',   region: 'latam', emoji: '🌊' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Mateo Pro',          description: 'Masculina autoritaria, narración profesional', gender: 'male',   region: 'latam', emoji: '🎙️' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'Lucas Cinema',       description: 'Profunda masculina, voz cinematográfica',      gender: 'male',   region: 'latam', emoji: '🎬' },
  { id: 'IKne3meq5aSn9XLyUdCD', label: 'Santi Surfero',      description: 'Masculino cool, relajado, vibe playa',         gender: 'male',   region: 'latam', emoji: '🏄' },

  // ── Internacionales ──
  { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Ava Gen-Z',          description: 'US joven, energía TikTok, inglés casual',      gender: 'female', region: 'us',    emoji: '✨' },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda US',         description: 'US autoritaria femenina, brand voice',         gender: 'female', region: 'us',    emoji: '🗽' },
  { id: 'iP95p4xoKVk53GoZ742B', label: 'João BR',            description: 'Masculina brasileña, portugués cálido',        gender: 'male',   region: 'br',    emoji: '🇧🇷' },
  { id: 'pqHfZKP75CvOlQylNhV4', label: 'Lucia Madrid',       description: 'Femenina española, acento Madrid claro',       gender: 'female', region: 'es',    emoji: '🇪🇸' },
];

/** ElevenLabs sample text for previewing voices — same line for every voice
 *  so the user can compare them apples-to-apples. Spanish, 8-second range. */
export const VOICE_SAMPLE_TEXT_ES =
  'Hola, soy tu voz. Imaginá todo lo que podemos crear juntos. Este es solo el comienzo.';

export const VOICE_SAMPLE_TEXT_EN =
  'Hi, I\'m your voice. Imagine everything we can create together. This is only the beginning.';

/** Cost to clone a voice from a user-supplied audio sample (~30s).
 *  ElevenLabs Instant Voice Clone is free per voice (counts toward the
 *  account's voice slot limit — Pro: 30 voices, Studio: 160). We charge
 *  a one-time credit fee to fund the slot rotation + storage. */
export const VOICE_CLONE_COST_CREDITS = 50;
