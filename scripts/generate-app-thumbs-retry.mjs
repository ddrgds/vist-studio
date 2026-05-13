#!/usr/bin/env node
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

const RETRIES = [
  {
    id: 'editor',
    prompt: `Macro beauty close-up of a young woman's face mid-edit, glowing healthy skin with subtle freckles and pores, dramatic warm side lighting in clay tones, editorial beauty magazine aesthetic, sharp focus on eye and cheek, eyelashes visible. ${STYLE}, 3:4 vertical.`,
  },
  {
    id: 'imagina',
    prompt: `Editorial three-frame vertical grid layout: same young woman with long dark hair in three different poses and three different outfits, warm cream and clay palette, magazine-style triptych, consistent soft lighting across all three frames. ${STYLE}, 3:4 vertical.`,
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

// Sequential with delay to dodge rate limit
for (const app of RETRIES) {
  await one(app);
  if (RETRIES.indexOf(app) < RETRIES.length - 1) {
    await new Promise(r => setTimeout(r, 8000));
  }
}
