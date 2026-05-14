#!/usr/bin/env node
/**
 * Regen 16:9-native hero thumbs for the Editor IA + Editar Video wide cards
 * on MobileHome. Same issue create.jpg had: the original 3:4 thumbs crop
 * badly at the home card's 16:9 aspect.
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
const STYLE = 'Editorial fashion photograph, healthy skin with visible texture, IG editorial magazine aesthetic, no text, no logos, no watermarks';

const ITEMS = [
  {
    id: 'editor',
    prompt: `Horizontal beauty macro close-up of a young woman with long dark hair, glowing skin with subtle freckles and pores, eyelashes visible, dramatic warm side lighting in clay tones, eye + cheek area in sharp focus, editorial beauty magazine aesthetic, 16:9 landscape composition. ${STYLE}`,
  },
  {
    id: 'videoedit',
    prompt: `Horizontal side-by-side film color grade split: same scene of a young woman with long dark hair, left half graded in warm amber sunset tones, right half graded in cool teal night tones, vertical split line in the center, dramatic difference between halves, film stills aesthetic, 16:9 landscape. ${STYLE}`,
  },
];

const extractUrl = (v) => {
  if (typeof v === 'string') return v;
  if (typeof v?.url === 'function') return String(v.url());
  if (v instanceof URL) return v.toString();
  if (Array.isArray(v)) return extractUrl(v[0]);
  return String(v);
};

for (const item of ITEMS) {
  console.log(`Generating ${item.id}-wide.jpg…`);
  const t0 = Date.now();
  const output = await replicate.run('black-forest-labs/flux-2-pro', {
    input: {
      prompt: item.prompt,
      aspect_ratio: '16:9',
      resolution: '2 MP',
      safety_tolerance: 5,
      output_format: 'jpg',
      output_quality: 92,
    },
  });
  const url = extractUrl(output);
  if (!url?.startsWith('http')) throw new Error(`bad output url: ${url}`);

  const rawBuf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const compressed = await sharp(rawBuf)
    .resize({ width: 1280, height: 720, fit: 'cover' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  await writeFile(`public/app-thumbs/${item.id}-wide.jpg`, compressed);
  console.log(`  ✓ ${item.id}-wide.jpg saved (${(compressed.length / 1024).toFixed(0)} KB · ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
