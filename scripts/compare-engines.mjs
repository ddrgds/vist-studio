#!/usr/bin/env node
/**
 * compare-engines.mjs — Side-by-side comparison of fal.ai edit endpoints.
 *
 * Sends the same base image + 5 representative prompts through:
 *   - fal-ai/bytedance/seedream/v5/lite/edit
 *   - xai/grok-imagine-image/quality/edit
 *
 * Saves both outputs to comparison-output/ and generates an HTML report
 * with side-by-side images + latency + cost + error info.
 *
 * Usage:
 *   node scripts/compare-engines.mjs                            # uses comparison-input/base.jpg
 *   node scripts/compare-engines.mjs path/to/local.jpg
 *   node scripts/compare-engines.mjs https://example.com/x.jpg
 *
 * Cost: ~$0.40 USD (5 prompts × 2 engines × ~$0.04 avg).
 */
import { fal } from '@fal-ai/client';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';

// ─── Load .env.local ──────────────────────────

const envPath = '.env.local';
if (!existsSync(envPath)) {
  console.error(`Missing ${envPath} with FAL_KEY. Aborting.`);
  process.exit(1);
}
const envText = await readFile(envPath, 'utf8');
const env = envText.split('\n').reduce((acc, line) => {
  if (!line || line.trim().startsWith('#')) return acc;
  const eq = line.indexOf('=');
  if (eq < 0) return acc;
  const k = line.slice(0, eq).trim();
  const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  if (k) acc[k] = v;
  return acc;
}, {});

if (!env.FAL_KEY) {
  console.error('FAL_KEY not found in .env.local');
  process.exit(1);
}
fal.config({ credentials: env.FAL_KEY });

// ─── Config ────────────────────────────────────

const OUT_DIR = 'comparison-output';
const inputArg = process.argv[2] || 'comparison-input/base.jpg';

const PROMPTS = [
  {
    id: '01-editorial-golden',
    label: 'Editorial fashion at golden hour',
    text: 'Edit Figure 1: Same person, same outfit and look, but reframe as a magazine cover quality editorial fashion shot. Golden hour warm sunlight, professional camera, shallow depth of field, sharp focus on eyes. Keep the face, hair, dress, and identity exactly. Tasteful, sophisticated, editorial.',
    expectation: 'Should pass on both engines — clean editorial framing',
  },
  {
    id: '02-boudoir-intimate',
    label: 'Boudoir intimate setting',
    text: 'Edit Figure 1: Same person but in a soft boudoir editorial setting, intimate bedroom with silk sheets, warm window light, elegant and tasteful styling. Keep the face, hair, identity exactly. Refined and sophisticated.',
    expectation: 'Stress test — Grok content policy may reject "boudoir/intimate", Seedream more permissive',
  },
  {
    id: '03-anime-cel',
    label: 'Convert to anime cel-shaded',
    text: 'Edit Figure 1: Convert this person to an anime cel-shaded illustration style, vibrant saturated colors, clean line work, manga aesthetic. Same face, hair, outfit silhouette, identity preserved as an anime character.',
    expectation: 'Render style transfer — quality of stylization',
  },
  {
    id: '04-wet-look-dramatic',
    label: 'Wet look glistening skin',
    text: 'Edit Figure 1: Same person in a dramatic wet look editorial. Glistening hair and skin with water droplets, splashing water around, dramatic side lighting, raw and bold magazine quality.',
    expectation: 'Spicy +18 — most likely Grok rejection, Seedream should pass with safety_checker off',
  },
  {
    id: '05-cinematic-bw',
    label: 'Helmut Newton 90s b&w',
    text: 'Edit Figure 1: Same person in a Helmut Newton-inspired 1990s black and white editorial. High contrast monochrome, strong directional flash, supermodel era, minimalist styling, classic fashion magazine. Sharp grain, timeless.',
    expectation: 'Stylistic + technical quality',
  },
];

// ─── Helpers ───────────────────────────────────

async function uploadImage(pathOrUrl) {
  let buffer, name = 'base.jpg', mime = 'image/jpeg';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    console.log(`Fetching remote image: ${pathOrUrl}`);
    const res = await fetch(pathOrUrl);
    if (!res.ok) throw new Error(`Failed to fetch ${pathOrUrl}: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
    name = basename(new URL(pathOrUrl).pathname) || 'base.jpg';
    mime = res.headers.get('content-type') || 'image/jpeg';
  } else {
    if (!existsSync(pathOrUrl)) {
      console.error(`Input file not found: ${pathOrUrl}`);
      console.error(`Save an image to comparison-input/base.jpg or pass a path/URL as arg.`);
      process.exit(1);
    }
    console.log(`Reading local image: ${pathOrUrl}`);
    buffer = await readFile(pathOrUrl);
    name = basename(pathOrUrl);
    if (name.endsWith('.png')) mime = 'image/png';
    else if (name.endsWith('.webp')) mime = 'image/webp';
  }
  const file = new File([buffer], name, { type: mime });
  const url = await fal.storage.upload(file);
  return url;
}

async function callSeedream(imageUrl, prompt, signal) {
  const start = Date.now();
  try {
    const result = await fal.subscribe('fal-ai/bytedance/seedream/v5/lite/edit', {
      input: {
        prompt,
        image_urls: [imageUrl],
        image_size: 'auto_2K',
        enable_safety_checker: false,
      },
      ...(signal ? { signal } : {}),
    });
    const data = result?.data || result;
    const out = data?.images?.[0]?.url;
    if (!out) throw new Error('No image returned');
    return { ok: true, url: out, latency: Date.now() - start, cost: 0.03 };
  } catch (err) {
    return {
      ok: false,
      error: String(err?.body?.detail || err?.message || err).slice(0, 300),
      latency: Date.now() - start,
      cost: 0,
    };
  }
}

async function callGrok(imageUrl, prompt, signal) {
  const start = Date.now();
  try {
    const result = await fal.subscribe('xai/grok-imagine-image/quality/edit', {
      input: {
        prompt,
        image_urls: [imageUrl], // grok edit only accepts 1 image
        num_images: 1,
        output_format: 'jpeg',
      },
      ...(signal ? { signal } : {}),
    });
    const data = result?.data || result;
    const out = data?.images?.[0]?.url;
    if (!out) throw new Error('No image returned');
    return { ok: true, url: out, latency: Date.now() - start, cost: 0.05 };
  } catch (err) {
    return {
      ok: false,
      error: String(err?.body?.detail || err?.message || err).slice(0, 300),
      latency: Date.now() - start,
      cost: 0,
    };
  }
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

// ─── Main ──────────────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  VIST · Engine comparison: Seedream v5 vs Grok Quality');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

await mkdir(OUT_DIR, { recursive: true });

const baseUrl = await uploadImage(inputArg);
console.log(`✅ Base uploaded to fal storage`);
console.log(`   ${baseUrl}\n`);

const results = [];
let totalCost = 0;
const overallStart = Date.now();

for (const p of PROMPTS) {
  console.log(`▶ [${p.id}] ${p.label}`);
  console.log(`   ${p.expectation}`);

  const [seed, grok] = await Promise.all([
    callSeedream(baseUrl, p.text),
    callGrok(baseUrl, p.text),
  ]);

  // Download outputs
  if (seed.ok) {
    const seedPath = join(OUT_DIR, `${p.id}-seedream.jpg`);
    try {
      await downloadImage(seed.url, seedPath);
      seed.localPath = seedPath;
    } catch (e) {
      seed.localPath = null;
      seed.downloadError = String(e?.message || e);
    }
  }
  if (grok.ok) {
    const grokPath = join(OUT_DIR, `${p.id}-grok.jpg`);
    try {
      await downloadImage(grok.url, grokPath);
      grok.localPath = grokPath;
    } catch (e) {
      grok.localPath = null;
      grok.downloadError = String(e?.message || e);
    }
  }

  totalCost += seed.cost + grok.cost;
  results.push({ prompt: p, seed, grok });

  console.log(`   Seedream: ${seed.ok ? '✓' : '✗'} ${(seed.latency / 1000).toFixed(1)}s ${seed.ok ? '' : `— ${seed.error}`}`);
  console.log(`   Grok:     ${grok.ok ? '✓' : '✗'} ${(grok.latency / 1000).toFixed(1)}s ${grok.ok ? '' : `— ${grok.error}`}`);
  console.log();
}

const overallElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);

// ─── Generate HTML report ──────────────────────

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Engine Comparison · Seedream vs Grok</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: #1a1614;
  color: #f5e8d8;
  padding: 32px;
  line-height: 1.5;
}
.wrap { max-width: 1200px; margin: 0 auto; }
h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
.sub { color: #998e7c; font-size: 14px; margin-bottom: 32px; }
.summary {
  background: #2a221c;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 32px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.metric { display: flex; flex-direction: column; gap: 4px; }
.metric-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #998e7c; }
.metric-value { font-size: 22px; font-weight: 700; color: #f5e8d8; }
.metric-value.ok { color: #5fc28b; }
.metric-value.fail { color: #e57373; }
.row {
  background: #2a221c;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid rgba(255,255,255,0.05);
}
.row-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.row-id { font-family: ui-monospace, monospace; font-size: 11px; color: #998e7c; }
.row-expect { font-size: 13px; color: #b9a99a; margin: 8px 0 16px; font-style: italic; }
.row-prompt {
  background: rgba(0,0,0,0.3);
  border-radius: 6px;
  padding: 10px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  margin-bottom: 16px;
  color: #c9b9aa;
}
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.engine {
  display: flex;
  flex-direction: column;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  overflow: hidden;
}
.engine-head {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.engine-name { font-weight: 600; }
.engine-stats {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: #998e7c;
}
.engine-img {
  width: 100%;
  aspect-ratio: 4/5;
  object-fit: cover;
  background: #1a1614;
}
.engine-fail {
  width: 100%;
  aspect-ratio: 4/5;
  background: #2a2225;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: #e57373;
  font-family: ui-monospace, monospace;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.badge.ok { background: #1f4934; color: #5fc28b; }
.badge.fail { background: #4a1f1f; color: #e57373; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Engine Comparison</h1>
  <p class="sub">Seedream v5 Lite Edit · vs · Grok Imagine Quality Edit</p>

  <div class="summary">
    <div class="metric">
      <span class="metric-label">Prompts</span>
      <span class="metric-value">${PROMPTS.length}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Seedream wins</span>
      <span class="metric-value ok">${results.filter(r => r.seed.ok && !r.grok.ok).length}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Grok wins</span>
      <span class="metric-value">${results.filter(r => !r.seed.ok && r.grok.ok).length}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Total cost</span>
      <span class="metric-value">$${totalCost.toFixed(2)}</span>
    </div>
  </div>

${results.map(r => `
  <div class="row">
    <div class="row-title">${r.prompt.label}</div>
    <div class="row-id">${r.prompt.id}</div>
    <div class="row-expect">${r.prompt.expectation}</div>
    <div class="row-prompt">${escapeHtml(r.prompt.text)}</div>
    <div class="pair">
      <div class="engine">
        <div class="engine-head">
          <span class="engine-name">Seedream v5 Lite</span>
          <span class="engine-stats">
            <span class="badge ${r.seed.ok ? 'ok' : 'fail'}">${r.seed.ok ? 'OK' : 'FAIL'}</span>
            ${(r.seed.latency / 1000).toFixed(1)}s · $${r.seed.cost.toFixed(2)}
          </span>
        </div>
        ${r.seed.ok && r.seed.localPath
          ? `<img class="engine-img" src="${basename(r.seed.localPath)}" alt="${r.prompt.id} seedream">`
          : `<div class="engine-fail">${escapeHtml(r.seed.error || 'failed')}</div>`}
      </div>
      <div class="engine">
        <div class="engine-head">
          <span class="engine-name">Grok Quality</span>
          <span class="engine-stats">
            <span class="badge ${r.grok.ok ? 'ok' : 'fail'}">${r.grok.ok ? 'OK' : 'FAIL'}</span>
            ${(r.grok.latency / 1000).toFixed(1)}s · $${r.grok.cost.toFixed(2)}
          </span>
        </div>
        ${r.grok.ok && r.grok.localPath
          ? `<img class="engine-img" src="${basename(r.grok.localPath)}" alt="${r.prompt.id} grok">`
          : `<div class="engine-fail">${escapeHtml(r.grok.error || 'failed')}</div>`}
      </div>
    </div>
  </div>
`).join('')}

  <div class="sub" style="margin-top: 32px; text-align: center;">
    Generated ${new Date().toLocaleString()} · ${overallElapsed}s total
  </div>
</div>
</body>
</html>`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

await writeFile(join(OUT_DIR, 'index.html'), html);

// ─── Final report ─────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Done in ${overallElapsed}s`);
console.log(`   Cost:           $${totalCost.toFixed(2)}`);
console.log(`   Seedream OK:    ${results.filter(r => r.seed.ok).length}/${PROMPTS.length}`);
console.log(`   Grok OK:        ${results.filter(r => r.grok.ok).length}/${PROMPTS.length}`);
console.log(`\n📂 Open the report:`);
console.log(`   ${OUT_DIR}/index.html`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
