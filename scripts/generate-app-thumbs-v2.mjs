#!/usr/bin/env node
/**
 * generate-app-thumbs-v2.mjs — Regen Reimaginar (4-up aesthetic grid)
 * + add Crear Personaje (character reference sheet).
 */
import Replicate from 'replicate';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const env = (await readFile('.env.local', 'utf8')).split('\n').reduce((a, l) => {
  const eq = l.indexOf('=');
  if (eq < 0 || l.startsWith('#')) return a;
  a[l.slice(0, eq).trim()] = l.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  return a;
}, {});

const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN });
const STYLE = 'Editorial fashion photograph, healthy skin with visible texture, IG editorial magazine aesthetic, no text, no logos, no watermarks, no captions';

const APPS = [
  {
    id: 'reimaginar',
    prompt: `Editorial four-panel mood-board grid in 2x2 layout: four portrait variations of the same young woman with long dark hair — top-left in minimalist beige cashmere with soft cream lighting, top-right at beach golden hour in flowing white swimwear, bottom-left in cyberpunk neon styling with violet and pink highlights, bottom-right in moody gothic with deep mauve and burgundy tones. Identity unmistakably the same across all four panels, equal-size grid, magazine moodboard composition. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'create',
    prompt: `Editorial character reference comp card of a young woman with long dark hair, 2x2 grid of identical-identity portraits at four different angles: top-left front-facing eye-contact, top-right three-quarter angle looking off-camera, bottom-left side profile silhouette, bottom-right over-the-shoulder back angle. Cream studio backdrop, identical soft window lighting across all four panels, casting agency comp-card aesthetic, consistent skin tone and styling. ${STYLE}, 3:4 vertical.`,
  },
];

async function one(app) {
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
    const dest = join('public/app-thumbs', `${app.id}.jpg`);
    await writeFile(dest, buf);
    console.log(`  ✓ ${app.id.padEnd(12)} ${(buf.length / 1024).toFixed(0)} KB · ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error(`  ✗ ${app.id.padEnd(12)} — ${err?.message ?? err}`);
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Regen Reimaginar v2 + new Crear Personaje');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Sequential to dodge the rate limit
for (let i = 0; i < APPS.length; i++) {
  await one(APPS[i]);
  if (i < APPS.length - 1) await new Promise(r => setTimeout(r, 8000));
}
