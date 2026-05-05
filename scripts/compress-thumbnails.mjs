#!/usr/bin/env node
// Compress style preview thumbnails: 1024px → 400px webp/jpg, ~80KB each.
// Run: node scripts/compress-thumbnails.mjs

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const DIR = path.resolve('public/style-previews')
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jpg') && !f.endsWith('.bak.jpg'))

console.log(`Compressing ${files.length} thumbnails in ${DIR}\n`)

let totalBefore = 0, totalAfter = 0
for (const file of files) {
  const fullPath = path.join(DIR, file)
  const beforeSize = fs.statSync(fullPath).size
  totalBefore += beforeSize

  // Backup original to .orig (only if not exists)
  const origPath = fullPath.replace('.jpg', '.orig.jpg')
  if (!fs.existsSync(origPath)) {
    fs.copyFileSync(fullPath, origPath)
  }

  // Compress: resize to 400px wide, jpeg quality 75
  const buf = await sharp(origPath)
    .resize(400, null, { fit: 'cover', withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer()

  fs.writeFileSync(fullPath, buf)

  const afterSize = buf.length
  totalAfter += afterSize

  console.log(`${file}: ${(beforeSize/1024).toFixed(0)}KB → ${(afterSize/1024).toFixed(0)}KB`)
}

console.log(`\nTotal: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB`)
console.log(`Reduction: ${((1 - totalAfter/totalBefore) * 100).toFixed(0)}%`)

// Cleanup orig backups (keep them on disk but exclude from git via gitignore)
const gitignorePath = path.join(DIR, '.gitignore')
fs.writeFileSync(gitignorePath, '*.orig.jpg\n', { flag: 'w' })
console.log(`\nWrote ${gitignorePath} to exclude .orig.jpg backups.`)
