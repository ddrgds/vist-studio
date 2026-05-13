#!/usr/bin/env node
/**
 * generate-app-thumbs.mjs — Custom thumbnails for the 8 mobile-suite apps.
 *
 * Replaces the generic Unsplash photos with editorial-grade visuals that
 * communicate what each app actually does, in a unified palette that
 * matches the warm cream/clay mobile shell.
 *
 * Engine: Flux 2 Pro via Replicate (text-to-image, 3:4 aspect, 2 MP).
 * Cost: ~$0.04 per image × 8 = ~$0.32 total. One-time.
 *
 * Output: public/app-thumbs/{appId}.jpg
 *
 * Usage:  node scripts/generate-app-thumbs.mjs
 */
import Replicate from 'replicate';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const env = (await readFile('.env.local', 'utf8')).split('\n').reduce((a, l) => {
  const eq = l.indexOf('=');
  if (eq < 0 || l.startsWith('#')) return a;
  a[l.slice(0, eq).trim()] = l.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  return a;
}, {});

if (!env.REPLICATE_API_TOKEN) { console.error('Need REPLICATE_API_TOKEN in .env.local'); process.exit(1); }

const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN });
const OUT_DIR = 'public/app-thumbs';

// Shared style anchor for cohesion across all 8 thumbs.
const STYLE = 'Editorial fashion photograph, healthy skin with visible texture, IG editorial magazine aesthetic, no text, no logos, no watermarks, no captions';

// Per-app: composition + accent tone hint matching the in-app accent color.
const APPS = [
  {
    id: 'headshot',
    accent: '#C9785C',
    prompt: `Editorial close-up portrait of a young woman with long dark hair, looking confidently at the camera, soft window light from left, neutral cream studio backdrop, warm clay tones, classic Vogue magazine cover composition, sharp focus on eyes. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'reimaginar',
    accent: '#8B4566',
    prompt: `Editorial fashion image split vertically: left half shows a young woman with long dark hair in minimalist cream beige outfit, right half shows the same woman transformed into moody mauve gothic styling, color story transformation, warm sand backdrop, soft cinematic lighting. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'sesion',
    accent: '#B0772D',
    prompt: `Contact sheet layout of four editorial polaroid frames showing the same young woman with long dark hair in different poses, soft cream loungewear, warm tan studio lighting, film grain texture, vintage magazine feel, four images arranged in a grid. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'editor',
    accent: '#C9785C',
    prompt: `Macro beauty close-up of a young woman's face mid-edit, glowing healthy skin with subtle freckles and pores, dramatic warm side lighting in clay tones, editorial beauty magazine aesthetic, sharp focus on eye and cheek, eyelashes visible. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'recast',
    accent: '#B0542D',
    prompt: `Cinematic motion blur frame of a young woman with long dark hair dancing gracefully, deep clay and rust tones, dramatic warm side lighting, motion blur on hands and flowing hair, 24fps cinema film still aesthetic, golden hour ambient warmth. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'reels',
    accent: '#D85478',
    prompt: `Vertical phone selfie composition: a young woman with long dark hair in soft rosé pink loungewear taking a mirror selfie with a smartphone, warm bedroom lighting, peach and cream tones, casual IG TikTok moment, candid composition. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'videoedit',
    accent: '#9C6D2A',
    prompt: `Side-by-side vertical split: same scene of a young woman with long dark hair, left half graded in warm amber sunset tones, right half graded in cool teal night tones, color grading comparison, film stills aesthetic, dramatic difference between halves. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'imagina',
    accent: '#C9785C',
    prompt: `Editorial three-frame vertical grid layout: same young woman with long dark hair in three different poses and three different outfits, warm cream and clay palette, magazine-style triptych, consistent soft lighting across all three frames. ${STYLE}, 3:4 vertical.`,
  },
];

await mkdir(OUT_DIR, { recursive: true });

async function generateOne(app) {
  const start = Date.now();
  try {
    const output = await replicate.run('black-forest-labs/flux-2-pro', {
      input: {
        prompt: app.prompt,
        aspect_ratio: '3:4',
        resolution: '2 MP',
        safety_tolerance: 5,
        output_format: 'jpg',
        output_quality: 92,
      },
    });
    // Output can be a string URL, a FileOutput, or an array containing one.
    const extractUrl = (v) => {
      if (!v) return null;
      if (typeof v === 'string') return v;
      if (typeof v?.url === 'function') return String(v.url());
      if (v instanceof URL) return v.toString();
      if (Array.isArray(v)) return extractUrl(v[0]);
      return String(v);
    };
    const url = extractUrl(output);
    if (!url || !url.startsWith('http')) throw new Error(`bad output url: ${url}`);

    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const dest = join(OUT_DIR, `${app.id}.jpg`);
    await writeFile(dest, buf);
    const ms = Date.now() - start;
    console.log(`  ✓ ${app.id.padEnd(12)} ${(buf.length / 1024).toFixed(0)} KB · ${(ms / 1000).toFixed(1)}s`);
    return { ok: true, id: app.id, path: dest, bytes: buf.length, ms };
  } catch (err) {
    const ms = Date.now() - start;
    console.error(`  ✗ ${app.id.padEnd(12)} ${(ms / 1000).toFixed(1)}s — ${err?.message ?? err}`);
    return { ok: false, id: app.id, error: String(err?.message ?? err) };
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Generating ${APPS.length} app thumbnails via Flux 2 Pro Replicate`);
console.log(`  Output: ${OUT_DIR}/`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const t0 = Date.now();
const results = await Promise.all(APPS.map(generateOne));
const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
const ok = results.filter(r => r.ok).length;

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Done in ${totalSec}s · ${ok}/${APPS.length} ok`);
console.log(`📂 ${OUT_DIR}/`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
