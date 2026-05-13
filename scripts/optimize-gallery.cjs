#!/usr/bin/env node
/**
 * Optimize gallery images - resize and compress large images
 * Uses sharp library directly
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Installing sharp...');
  require('child_process').execSync('npm install sharp --save-dev', { stdio: 'inherit' });
  sharp = require('sharp');
}

const DIRS = [
  'public/images/nanach',
  'public/images/events',
  'public/images/saba',
  'public/images/rabbi-nachman',
  'public/images/tomb-uman'
];

const MAX_WIDTH = 1600;
const QUALITY = 80;
const SIZE_THRESHOLD = 300 * 1024; // 300KB

async function optimizeImage(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size < SIZE_THRESHOLD) return 0;

  const sizeBefore = stat.size;
  const ext = path.extname(filePath).toLowerCase();
  const tmpPath = filePath + '.tmp';

  try {
    const img = sharp(filePath);
    const meta = await img.metadata();

    let pipeline = sharp(filePath);

    // Only resize if wider than MAX_WIDTH
    if (meta.width && meta.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true });
    }

    if (ext === '.png') {
      pipeline = pipeline.png({ quality: QUALITY, compressionLevel: 9 });
    } else {
      pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true });
    }

    await pipeline.toFile(tmpPath);

    const sizeAfter = fs.statSync(tmpPath).size;
    const saved = sizeBefore - sizeAfter;

    if (saved > 1024) { // Only keep if saved at least 1KB
      fs.renameSync(tmpPath, filePath);
      const pct = ((saved / sizeBefore) * 100).toFixed(0);
      const name = path.basename(filePath);
      console.log(`  ✅ ${name.substring(0,50)}: ${(sizeBefore/1024).toFixed(0)}KB → ${(sizeAfter/1024).toFixed(0)}KB (-${pct}%)`);
      return saved;
    } else {
      fs.unlinkSync(tmpPath);
      return 0;
    }
  } catch (e) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    console.log(`  ❌ ${path.basename(filePath).substring(0,40)}: ${e.message.substring(0, 50)}`);
    return 0;
  }
}

async function main() {
  let totalSaved = 0;
  let optimized = 0;

  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    const bigFiles = files.filter(f => fs.statSync(path.join(dir, f)).size > SIZE_THRESHOLD);
    console.log(`\n📁 ${dir} (${bigFiles.length}/${files.length} images > 300KB)`);

    for (const file of bigFiles) {
      const saved = await optimizeImage(path.join(dir, file));
      if (saved > 0) {
        totalSaved += saved;
        optimized++;
      }
    }
  }

  console.log(`\n📊 Total: ${optimized} images optimized, ${(totalSaved/1024/1024).toFixed(1)}MB saved`);
}

main().catch(console.error);
