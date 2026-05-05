#!/usr/bin/env node
// Generate thumbnail images for each render style + substyle in Crear Personaje.
// Uses fal-ai/z-image/turbo (~$0.005/img) — cheapest model for static thumbnails.
//
// Run:  FAL_KEY=xxx node scripts/generate-style-thumbnails.mjs
// Or:   node scripts/generate-style-thumbnails.mjs   (reads .env.local)

import fs from 'fs'
import path from 'path'

// Load FAL_KEY from .env.local if not in env
let FAL_KEY = process.env.FAL_KEY
if (!FAL_KEY) {
  try {
    const env = fs.readFileSync('.env.local', 'utf-8')
    const m = env.match(/FAL_KEY=(.+)/)
    if (m) FAL_KEY = m[1].trim()
  } catch { /* ignore */ }
}
if (!FAL_KEY) {
  console.error('ERROR: FAL_KEY not set (env or .env.local)')
  process.exit(1)
}

const OUTPUT_DIR = path.resolve('public/style-previews')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// All render styles + their substyles. Each generates one thumbnail.
// Prompts are intentionally generic (single character portrait) to be representative.
const STYLES = [
  // Parents (6)
  { id: 'photorealistic', prompt: 'Editorial fashion portrait of a young woman with soft warm lighting, magazine cover quality, photorealistic studio photography, neutral grey backdrop' },
  { id: 'anime', prompt: 'High-end anime portrait of a young woman, cel-shaded, detailed expressive eyes with reflections, Production I.G quality, neutral background' },
  { id: '3d-render', prompt: '3D character render of a young woman, Pixar-style soft lighting, expressive features, modern animation, neutral grey background' },
  { id: 'illustration', prompt: 'Digital illustration portrait of a young woman, painterly concept art quality, expressive brushwork, neutral background' },
  { id: 'stylized', prompt: 'Stylized character portrait of a young woman, Spider-Verse and Arcane influence, bold graphic design, painterly texture, neutral backdrop' },
  { id: 'pixel-art', prompt: '16-bit pixel art portrait of a young woman, RPG character sprite, limited 32-color palette, expressive design, neutral background' },

  // Photorealistic substyles (6)
  { id: 'editorial', prompt: 'Vogue editorial fashion portrait of a young woman, magazine cover quality, dramatic studio lighting, high fashion aesthetic' },
  { id: 'cinematic', prompt: 'Cinematic film portrait of a young woman, anamorphic lens, Roger Deakins lighting, color graded film LUT, subtle film grain' },
  { id: 'ugc', prompt: 'iPhone selfie of a young woman at golden hour, authentic UGC aesthetic, slight motion blur, warm sunset light, candid' },
  { id: 'studio-beauty', prompt: 'Beauty studio portrait of a young woman, softbox and ringlight setup, flawless makeup, glossy highlights, beauty photography' },
  { id: 'documentary', prompt: 'Documentary photojournalism portrait of a young woman, 35mm film, available natural light, unposed candid moment' },
  { id: 'street', prompt: 'Street photography portrait of a young woman, high contrast, gritty urban environment, Daido Moriyama influence' },

  // Anime substyles (8)
  { id: 'shonen', prompt: 'Shonen action anime portrait of a young woman, bold dynamic linework, Demon Slayer / Jujutsu Kaisen aesthetic, intense expression' },
  { id: 'shojo', prompt: 'Shojo manga portrait of a young woman, soft pastel palette, sparkly eyes with floral motifs, Sailor Moon vibe' },
  { id: 'ghibli', prompt: 'Studio Ghibli watercolor portrait of a young woman, hand-painted aesthetic, soft warm palette, Mononoke / Spirited Away inspired' },
  { id: 'seinen', prompt: 'Seinen manga realism portrait of a young woman, detailed crosshatching, mature aesthetic, Vagabond / Berserk influence' },
  { id: 'cyberpunk-anime', prompt: 'Cyberpunk anime portrait of a young woman, neon city lights backdrop, Akira / Ghost in the Shell / Edgerunners influence' },
  { id: 'manga-bw', prompt: 'Black and white manga panel of a young woman, screentone shading, clean ink lineart, no color, comic book aesthetic' },
  { id: 'gacha', prompt: 'Genshin Impact / Honkai Star Rail style portrait of a young woman, vibrant cel-shading, jewel-tone palette' },
  { id: 'trigger', prompt: 'Studio Trigger anime portrait of a young woman, bold flat colors, Kill la Kill / Promare visual language' },

  // 3D Render substyles (6)
  { id: 'pixar', prompt: 'Pixar / Disney 3D animation portrait of a young woman, soft warm lighting, expressive features, Encanto / Toy Story style' },
  { id: 'spiderverse', prompt: 'Spider-Verse style portrait of a young woman, comic halftone shading on 3D, chromatic aberration, bold ink outlines' },
  { id: 'arcane', prompt: 'Arcane Netflix style portrait of a young woman, painted texture overlays on 3D, painterly brushstroke detail' },
  { id: 'unreal', prompt: 'Unreal Engine 5 Nanite render of a young woman, photorealistic AAA game character, MetaHuman quality' },
  { id: 'blender-stylized', prompt: 'Blender stylized 3D portrait of a young woman, light low-poly aesthetic, soft toon shader, indie game character' },
  { id: 'octane-hyper', prompt: 'Octane render hyperrealistic CGI portrait of a young woman, glossy hyper-detailed skin, advertising commercial quality' },

  // Illustration substyles (6)
  { id: 'watercolor', prompt: 'Watercolor portrait of a young woman, soft bleeding edges, paper texture, traditional watercolor wash' },
  { id: 'ink', prompt: 'Ink illustration portrait of a young woman, black and white, intricate crosshatching, brush ink linework, Inktober aesthetic' },
  { id: 'concept-art', prompt: 'AAA concept art portrait of a young woman, painterly brushwork, ArtStation quality, character design sheet' },
  { id: 'childrens-book', prompt: 'Children picture book illustration of a young woman, soft friendly aesthetic, warm palette, hand-painted style' },
  { id: 'editorial-illust', prompt: 'Editorial illustration portrait of a young woman, NYT / New Yorker aesthetic, simplified shapes, conceptual minimalist' },
  { id: 'comic', prompt: 'Comic book illustration portrait of a young woman, bold ink outlines, flat saturated colors, halftone dot shading' },

  // Stylized substyles (5)
  { id: 'spiderverse-styl', prompt: 'Spider-Verse stylized portrait of a young woman, comic halftone overlay, chromatic aberration, bold ink linework' },
  { id: 'arcane-styl', prompt: 'Arcane Netflix stylized portrait of a young woman, painterly textures, hand-painted brushstroke detail' },
  { id: 'klaus', prompt: 'Klaus / Mitchells stylized portrait of a young woman, hand-painted feel with 3D depth, warm ambient lighting' },
  { id: 'edgerunners', prompt: 'Cyberpunk Edgerunners stylized portrait of a young woman, neon glow accents, cel-shaded with bold outlines' },
  { id: 'soft-anime', prompt: 'Soft anime cel-shaded portrait of a young woman, bright pastel palette, gentle gradient lighting' },

  // Pixel Art substyles (4)
  { id: '8bit', prompt: '8-bit NES era pixel art portrait of a young woman, ultra limited 16-color palette, chunky pixels, retro arcade' },
  { id: '16bit', prompt: '16-bit SNES era pixel art portrait of a young woman, Chrono Trigger / Final Fantasy VI quality, expressive sprite' },
  { id: 'modern-pixel', prompt: 'Modern pixel art portrait of a young woman, Stardew Valley / Celeste aesthetic, expressive limited palette' },
  { id: 'hd-2d', prompt: 'HD-2D pixel art portrait of a young woman, Octopath Traveler style, dramatic lighting' },
]

async function submitJob(prompt) {
  const submitRes = await fetch('https://queue.fal.run/fal-ai/z-image/turbo', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  })
  if (!submitRes.ok) {
    throw new Error(`Submit failed (${submitRes.status}): ${await submitRes.text()}`)
  }
  const data = await submitRes.json()
  return data.response_url // includes the correct path
}

async function pollJob(responseUrl) {
  const start = Date.now()
  while (Date.now() - start < 90_000) {
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch(responseUrl, {
      headers: { 'Authorization': `Key ${FAL_KEY}` },
    })
    if (!res.ok) {
      const status = res.status
      // 400 means still processing
      if (status === 400) continue
      throw new Error(`Poll failed (${status}): ${await res.text()}`)
    }
    const data = await res.json()
    if (data.images?.[0]?.url) return data.images[0].url
  }
  throw new Error('Timeout waiting for job')
}

async function downloadImage(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
}

async function generateOne(style) {
  const dest = path.join(OUTPUT_DIR, `${style.id}.jpg`)
  if (fs.existsSync(dest)) {
    const sz = fs.statSync(dest).size
    if (sz > 1000) {
      console.log(`SKIP ${style.id} (already exists, ${(sz/1024).toFixed(1)} KB)`)
      return
    }
  }
  console.log(`→ ${style.id} ...`)
  const reqId = await submitJob(style.prompt)
  const imgUrl = await pollJob(reqId)
  await downloadImage(imgUrl, dest)
  const sz = fs.statSync(dest).size
  console.log(`✓ ${style.id} → ${(sz/1024).toFixed(1)} KB`)
}

async function main() {
  console.log(`Generating ${STYLES.length} thumbnails to ${OUTPUT_DIR}`)
  console.log(`Using fal-ai/z-image/turbo (~$0.005/img → ~$${(STYLES.length * 0.005).toFixed(2)} total)\n`)

  // Limit concurrency to 5 — fal queue handles the rest
  const queue = [...STYLES]
  const inflight = new Set()
  const limit = 5
  const errors = []

  async function runOne(style) {
    try { await generateOne(style) }
    catch (e) {
      console.error(`✗ ${style.id}: ${e.message}`)
      errors.push({ id: style.id, error: e.message })
    }
  }

  while (queue.length > 0 || inflight.size > 0) {
    while (inflight.size < limit && queue.length > 0) {
      const style = queue.shift()
      const p = runOne(style).finally(() => inflight.delete(p))
      inflight.add(p)
    }
    if (inflight.size > 0) await Promise.race(inflight)
  }

  console.log(`\nDone. ${STYLES.length - errors.length}/${STYLES.length} succeeded.`)
  if (errors.length > 0) {
    console.log('Errors:', errors)
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
