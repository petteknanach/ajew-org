#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Quick check: count files with English per part
for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idx = JSON.parse(fs.readFileSync(path.join(pdir, 'index.json'), 'utf8'));
  
  let total = 0, withEn = 0;
  for (const t of idx.torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    if (!fs.existsSync(filePath)) continue;
    total++;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.segments.some(s => s.en && s.en.trim().length > 0)) withEn++;
  }
  
  console.log(`Part ${part}: ${withEn}/${total} with English`);
}
