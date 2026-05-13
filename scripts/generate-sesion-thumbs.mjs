#!/usr/bin/env node
/**
 * generate-sesion-thumbs.mjs — 17 thumbnails for Sesión de Fotos.
 *
 *   7 scenario thumbs (locations) → public/app-thumbs/sesion-scenes/{id}.jpg
 *   10 pose thumbs (model in pose) → public/app-thumbs/sesion-poses/{id}.jpg
 *
 * Engine: Wan 2.7 Image Pro via Replicate (cheaper than Flux 2 Pro).
 * Cost: ~$0.03 per image × 17 = ~$0.51 total.
 *
 * Batches of 4 with 10s pause between batches to dodge the 5-burst rate
 * limit when account credit is low (~5 burst / 60 per min).
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

const STYLE = 'editorial fashion photography, warm cream palette, soft natural lighting, magazine-grade, high quality, photorealistic, no text, no logos, no watermarks';

const SCENARIOS = [
  { id: 'loft',    prompt: `Minimalist Brooklyn loft interior, exposed red brick wall, large factory-style windows with natural daylight pouring in, polished wood floor, scattered green plants, contemporary fashion editorial location, no people, ${STYLE}` },
  { id: 'hotel',   prompt: `Boutique hotel suite interior, elegant unmade linen sheets in cream tones, large window with warm diffused morning light, neutral interior design, intimate editorial atmosphere, no people, ${STYLE}` },
  { id: 'beach',   prompt: `Tropical beach at golden hour, soft warm sunset light, turquoise calm ocean, white sand, palm trees silhouetted in background, dreamy editorial location, no people, ${STYLE}` },
  { id: 'cafe',    prompt: `Parisian cafe interior at night, warm tungsten lighting, polished marble bar, coffee cups and saucers, intimate atmospheric scene, no people, ${STYLE}` },
  { id: 'studio',  prompt: `Professional photography studio with seamless cream paper backdrop, controlled softbox lighting, clean editorial setup, light stand visible at edge, no people, ${STYLE}` },
  { id: 'street',  prompt: `Urban European street at midday, modern architecture, soft overcast diffuse light, contemporary day exterior, cobblestone or asphalt, no people, ${STYLE}` },
  { id: 'rooftop', prompt: `Rooftop terrace at golden hour, city skyline silhouetted in the background, warm sunset light bathing the scene, contemporary outdoor setting with planters, no people, ${STYLE}` },
];

const POSES = [
  { id: 'sitting',      prompt: `Young woman with long dark hair sitting elegantly on a wooden stool, relaxed posture, hands resting naturally, neutral cream backdrop, soft editorial side lighting, ${STYLE}` },
  { id: 'lying',        prompt: `Young woman with long dark hair lying on her side on a soft cream-colored surface, relaxed pose, eyes gazing toward camera, soft window light, ${STYLE}` },
  { id: 'standing',     prompt: `Young woman with long dark hair standing confidently with one hand on her hip, full body shot, neutral cream backdrop, soft directional editorial light, ${STYLE}` },
  { id: 'mirror',       prompt: `Young woman with long dark hair taking a mirror selfie holding a smartphone, candid moment, soft warm bedroom light, cream tones, ${STYLE}` },
  { id: 'looking-away', prompt: `Young woman with long dark hair in three-quarter profile, looking away from camera off to the side, contemplative mood, soft side window light, cream backdrop, ${STYLE}` },
  { id: 'window',       prompt: `Young woman with long dark hair leaning against a tall window frame, soft natural backlight from the window behind her, dreamy editorial mood, ${STYLE}` },
  { id: 'walking',      prompt: `Young woman with long dark hair walking toward the camera with subtle motion captured in her step and hair, dynamic editorial pose, neutral cream backdrop, ${STYLE}` },
  { id: 'reclining',    prompt: `Young woman with long dark hair reclining elegantly on her side with her head tilted back slightly, languid editorial pose, soft window light, ${STYLE}` },
  { id: 'over-shoulder',prompt: `Young woman with long dark hair looking back over her shoulder directly at the camera, soft gaze, cream backdrop, editorial portrait, ${STYLE}` },
  { id: 'hands-hair',   prompt: `Young woman with long dark hair running both hands gently through her hair, natural candid gesture, cream backdrop, soft editorial lighting, ${STYLE}` },
];

await mkdir('public/app-thumbs/sesion-scenes', { recursive: true });
await mkdir('public/app-thumbs/sesion-poses', { recursive: true });

async function one(item, kind) {
  const start = Date.now();
  try {
    const output = await replicate.run('wan-video/wan-2.7-image-pro', {
      input: {
        prompt: item.prompt,
        size: '2K',
        num_outputs: 1,
        thinking_mode: true,
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
    const dest = join(`public/app-thumbs/sesion-${kind}`, `${item.id}.jpg`);
    await writeFile(dest, buf);
    console.log(`  ✓ ${kind}/${item.id.padEnd(14)} ${(buf.length / 1024).toFixed(0)} KB · ${((Date.now() - start) / 1000).toFixed(1)}s`);
    return { ok: true };
  } catch (err) {
    console.error(`  ✗ ${kind}/${item.id.padEnd(14)} — ${err?.message ?? err}`);
    return { ok: false };
  }
}

async function runBatched(items, kind) {
  // Batches of 4 to stay under the 5-burst Replicate rate limit
  for (let i = 0; i < items.length; i += 4) {
    const batch = items.slice(i, i + 4);
    await Promise.all(batch.map(it => one(it, kind)));
    if (i + 4 < items.length) {
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  ${SCENARIOS.length} scenarios + ${POSES.length} poses · Wan 2.7 Image Pro`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const t0 = Date.now();
await runBatched(SCENARIOS, 'scenes');
console.log('--- pause 8s between groups ---');
await new Promise(r => setTimeout(r, 8000));
await runBatched(POSES, 'poses');

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
