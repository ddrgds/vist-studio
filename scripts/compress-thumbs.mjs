#!/usr/bin/env node
/**
 * compress-thumbs.mjs — Resize + recompress JPGs in any app-thumbs folder.
 *
 * Wan 2.7 at 2K produces 5-7 MB files which is overkill for card thumbs.
 * Targets ~150 KB by capping the longer edge at 800 px and re-encoding
 * as mozjpeg quality 82.
 *
 * Usage:
 *   node scripts/compress-thumbs.mjs <dir> [<dir> ...]
 *
 * Skips files already under SKIP_BELOW_KB so Flux 2 Pro outputs (which
 * are already optimized when generated at 2 MP) aren't re-encoded.
 */
import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIRS = process.argv.slice(2);
if (!DIRS.length) {
  console.error('usage: node scripts/compress-thumbs.mjs <dir> [<dir> ...]');
  process.exit(1);
}

const MAX_EDGE = 800;
const QUALITY = 82;
const SKIP_BELOW_KB = 250;

let totalIn = 0;
let totalOut = 0;
let touched = 0;
let skipped = 0;

for (const dir of DIRS) {
  const files = (await readdir(dir)).filter(f => f.endsWith('.jpg'));
  for (const f of files) {
    const path = join(dir, f);
    const inBytes = (await stat(path)).size;
    if (inBytes < SKIP_BELOW_KB * 1024) {
      skipped++;
      console.log(`  ${f.padEnd(22)} ${(inBytes / 1024).toFixed(0).padStart(5)} KB — skip (already small)`);
      continue;
    }
    totalIn += inBytes;
    const buf = await sharp(path)
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
    // Use fs.writeFile instead of sharp.toFile to avoid a Windows file-lock
    // race where sharp keeps the input handle open while trying to overwrite.
    await writeFile(path, buf);
    const outBytes = (await stat(path)).size;
    totalOut += outBytes;
    touched++;
    console.log(`  ${f.padEnd(22)} ${(inBytes / 1024).toFixed(0).padStart(5)} KB → ${(outBytes / 1024).toFixed(0).padStart(4)} KB`);
  }
}

if (touched > 0) {
  console.log(`\nCompressed: ${(totalIn / 1024 / 1024).toFixed(1)} MB → ${(totalOut / 1024 / 1024).toFixed(1)} MB (${touched} files)`);
}
if (skipped > 0) console.log(`Skipped: ${skipped} file(s) already under ${SKIP_BELOW_KB} KB`);
