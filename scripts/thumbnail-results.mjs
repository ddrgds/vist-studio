// Quick thumbnail generator using node:canvas-free approach via pure JPEG resize.
// Uses sharp if available, otherwise falls back to no-op.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'comparison-output';
const THUMBS = 'comparison-output/thumbs';
import { mkdir } from 'node:fs/promises';
await mkdir(THUMBS, { recursive: true });

let sharp;
try { sharp = (await import('sharp')).default; }
catch { console.error('sharp not installed. Run: npm i -D sharp'); process.exit(1); }

const files = (await readdir(OUT)).filter(f => f.endsWith('-seedream.jpg'));
console.log(`Resizing ${files.length} Seedream files to 800px width...`);

for (const f of files) {
  const buf = await readFile(join(OUT, f));
  const out = await sharp(buf).resize({ width: 800 }).jpeg({ quality: 80 }).toBuffer();
  await writeFile(join(THUMBS, f), out);
  console.log(`  ${f}: ${(buf.length / 1024).toFixed(0)}KB → ${(out.length / 1024).toFixed(0)}KB`);
}
console.log('Done.');
