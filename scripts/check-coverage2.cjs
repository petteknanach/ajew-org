#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Count files with/without English per part
for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  let total = 0, withEn = 0, withoutEn = 0;
  const missing = [];
  
  for (const t of (idx.torahs || [])) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    total++;
    
    let hasEn = false;
    for (const seg of segments) {
      if (seg.en && seg.en.trim().length > 0) { hasEn = true; break; }
    }
    if (hasEn) withEn++;
    else {
      withoutEn++;
      if (missing.length < 5) missing.push(t.hebrewTitle || t.title);
    }
  }
  
  console.log(`Part ${part}: ${withEn}/${total} with English, ${withoutEn} missing`);
  if (missing.length > 0) {
    console.log(`  Missing: ${missing.join(', ')}`);
    if (withoutEn > 5) console.log(`  ... and ${withoutEn - 5} more`);
  }
}
