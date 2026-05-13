#!/usr/bin/env node
/**
 * generate-headshot-creator-thumbs.mjs — Custom thumbs for the 6 Headshot Pro
 * styles + the 4 Crear Personaje render-style previews.
 *
 *   Photorealistic ones → Wan 2.7 Image Pro Replicate (cheaper).
 *   Stylized ones (anime, 3d, illustration) → Flux 2 Pro Replicate (handles
 *     non-photo aesthetics better than Wan).
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

const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN });
const STYLE_TAIL = 'no text, no logos, no watermarks, no captions';

// ─── Headshot Pro (6 styles) — Wan 2.7, photorealistic ────────────────────
const HEADSHOT = [
  { id: 'editorial', prompt: `Magazine cover quality editorial portrait of a young woman with long dark hair, high fashion editorial styling, sharp focus on eyes, dramatic professional lighting, warm cream background, Vogue-grade aesthetic, ${STYLE_TAIL}` },
  { id: 'corporate', prompt: `Professional corporate headshot of a young woman with long dark hair, neutral charcoal blazer, clean grey-cream studio backdrop, soft three-point lighting, LinkedIn executive-grade quality, confident expression, ${STYLE_TAIL}` },
  { id: 'casual',    prompt: `Natural daylight casual portrait of a young woman with long dark hair, soft window light from left, relaxed warm smile, neutral linen top, cream background, candid editorial mood, ${STYLE_TAIL}` },
  { id: 'cinematic', prompt: `Cinematic film-still portrait of a young woman with long dark hair, dramatic warm side lighting with deep clay shadows, subtle film grain, moody atmospheric, anamorphic look, editorial cinema aesthetic, ${STYLE_TAIL}` },
  { id: 'beauty',    prompt: `Macro beauty close-up of a young woman's face, glowing healthy skin with subtle freckles and visible pores, soft beauty lighting in warm tones, sharp focus on eyes, editorial beauty magazine aesthetic, ${STYLE_TAIL}` },
  { id: 'bw',        prompt: `Timeless black and white editorial portrait of a young woman with long dark hair, high contrast monochrome, dramatic side lighting, classic silver gelatin aesthetic, sharp focus on eyes, fine art photography, ${STYLE_TAIL}` },
];

// ─── Crear Personaje (4 render styles) — mixed engines ────────────────────
const CREATOR = [
  // Photoreal → Wan
  { id: 'photorealistic', engine: 'wan',  prompt: `DSLR-quality photorealistic portrait of a young woman with long dark hair, sharp natural detail, soft window light, neutral cream background, lifelike skin texture, editorial fashion photography, ${STYLE_TAIL}` },
  // Anime → Flux 2 Pro (better at stylized)
  { id: 'anime',          engine: 'flux', prompt: `Anime manhwa style portrait of a young woman with long dark flowing hair, large expressive eyes, soft cel-shading, vibrant colors, Korean manhwa illustration aesthetic, clean linework, stylized 2D anime art, ${STYLE_TAIL}` },
  // 3D Render → Flux 2 Pro
  { id: '3d-render',      engine: 'flux', prompt: `Pixar-quality 3D rendered character portrait of a young woman with long dark hair, soft subsurface scattering skin, large stylized eyes, smooth cinematic 3D lighting, CGI feature-film aesthetic, octane render quality, ${STYLE_TAIL}` },
  // Illustration → Flux 2 Pro
  { id: 'illustration',   engine: 'flux', prompt: `Hand-drawn watercolor illustration portrait of a young woman with long dark hair, soft painterly brushstrokes, warm pastel palette, contemporary fashion illustration aesthetic, paper texture visible, artistic editorial illustration, ${STYLE_TAIL}` },
];

await mkdir('public/app-thumbs/headshot-styles', { recursive: true });
await mkdir('public/app-thumbs/creator-styles',  { recursive: true });

const extractUrl = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v?.url === 'function') return String(v.url());
  if (v instanceof URL) return v.toString();
  if (Array.isArray(v)) return extractUrl(v[0]);
  return String(v);
};

async function genWan(item) {
  const output = await replicate.run('wan-video/wan-2.7-image-pro', {
    input: { prompt: item.prompt, size: '2K', num_outputs: 1, thinking_mode: true },
  });
  return extractUrl(output);
}

async function genFlux(item) {
  const output = await replicate.run('black-forest-labs/flux-2-pro', {
    input: {
      prompt: item.prompt,
      aspect_ratio: '3:4',
      resolution: '2 MP',
      safety_tolerance: 5,
      output_format: 'jpg',
      output_quality: 92,
    },
  });
  return extractUrl(output);
}

async function one(item, kind, engine) {
  const start = Date.now();
  try {
    const url = engine === 'flux' ? await genFlux(item) : await genWan(item);
    if (!url || !url.startsWith('http')) throw new Error(`bad output url: ${url}`);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const dest = join(`public/app-thumbs/${kind}-styles`, `${item.id}.jpg`);
    await writeFile(dest, buf);
    console.log(`  ✓ ${kind}/${item.id.padEnd(16)} (${engine}) ${(buf.length / 1024).toFixed(0)} KB · ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error(`  ✗ ${kind}/${item.id.padEnd(16)} — ${err?.message ?? err}`);
  }
}

async function runBatched(items, kind, defaultEngine) {
  // Batches of 4 to stay below the 5-burst Replicate limit
  for (let i = 0; i < items.length; i += 4) {
    const batch = items.slice(i, i + 4);
    await Promise.all(batch.map(it => one(it, kind, it.engine || defaultEngine)));
    if (i + 4 < items.length) await new Promise(r => setTimeout(r, 10000));
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  6 Headshot + 4 Crear Personaje · Wan + Flux 2 Pro`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const t0 = Date.now();
await runBatched(HEADSHOT, 'headshot', 'wan');
console.log('--- pause 8s ---');
await new Promise(r => setTimeout(r, 8000));
await runBatched(CREATOR, 'creator', 'wan');

console.log(`\n✅ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
