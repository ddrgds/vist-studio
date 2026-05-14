#!/usr/bin/env node
/**
 * Regen a 16:9-native hero thumb for the Crear Modelo wide card on MobileHome.
 * The existing /app-thumbs/create.jpg is a 2x2 comp-card portrait grid
 * (correct for the in-app use), but cropping to 16:9 cuts the faces.
 */
import Replicate from 'replicate';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const env = (await readFile('.env.local', 'utf8')).split('\n').reduce((a, l) => {
  const eq = l.indexOf('=');
  if (eq < 0 || l.startsWith('#')) return a;
  a[l.slice(0, eq).trim()] = l.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  return a;
}, {});

const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN });

const prompt = `Editorial horizontal composition: a young woman with long dark hair, four close-up portrait crops arranged in a single horizontal row — front-facing eye-contact, three-quarter view, side profile, looking back over shoulder. Same identity across all four. Warm cream studio backdrop, soft window lighting, casting agency comp-card aesthetic, 16:9 landscape ratio. Editorial fashion photograph, healthy skin with visible texture, IG editorial magazine aesthetic, no text, no logos, no watermarks.`;

console.log('Generating create-wide.jpg via Flux 2 Pro (16:9)...');
const t0 = Date.now();
const output = await replicate.run('black-forest-labs/flux-2-pro', {
  input: {
    prompt,
    aspect_ratio: '16:9',
    resolution: '2 MP',
    safety_tolerance: 5,
    output_format: 'jpg',
    output_quality: 92,
  },
});

const extractUrl = (v) => {
  if (typeof v === 'string') return v;
  if (typeof v?.url === 'function') return String(v.url());
  if (v instanceof URL) return v.toString();
  if (Array.isArray(v)) return extractUrl(v[0]);
  return String(v);
};
const url = extractUrl(output);
if (!url?.startsWith('http')) throw new Error(`bad output url: ${url}`);

const rawBuf = Buffer.from(await (await fetch(url)).arrayBuffer());
// Compress to ~80 KB for fast cold-load on mobile
const compressed = await sharp(rawBuf)
  .resize({ width: 1280, height: 720, fit: 'cover' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toBuffer();
await writeFile('public/app-thumbs/create-wide.jpg', compressed);

console.log(`✓ create-wide.jpg saved (${(compressed.length / 1024).toFixed(0)} KB · ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
