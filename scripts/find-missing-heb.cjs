#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// For parts 4, 5, 6 - check which Hebrew files have NO English
for (const part of [4, 5, 6]) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idx = JSON.parse(fs.readFileSync(path.join(pdir, 'index.json'), 'utf8'));
  
  console.log(`\n=== Part ${part}: Hebrew files WITHOUT English ===`);
  let missing = 0;
  for (const t of idx.torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const hasEn = data.segments && data.segments.some(s => s.en && s.en.trim().length > 0);
    if (!hasEn) {
      missing++;
      if (missing <= 10) {
        console.log(`  ${t.number}. ${t.hebrewTitle || t.title}`);
      }
    }
  }
  console.log(`  Total missing: ${missing}/${idx.torahs.length}`);
}
