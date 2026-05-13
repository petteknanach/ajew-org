#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

let total = 0, withEn = 0, withoutEn = 0;
const samples = [];

for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of idx.torahs.slice(0, 3)) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    total++;
    
    const enSegs = data.segments.filter(s => s.en && s.en.trim().length > 0);
    if (enSegs.length > 0) {
      withEn++;
      if (samples.length < 10) {
        samples.push(`P${part} #${t.number}: ${enSegs.length} EN segs, first: "${enSegs[0].en.substring(0, 60)}..."`);
      }
    } else {
      withoutEn++;
      samples.push(`P${part} #${t.number}: NO ENGLISH`);
    }
  }
}

console.log(`Sampled ${total} files: ${withEn} with English, ${withoutEn} without`);
console.log('\nSamples:');
for (const s of samples) console.log(`  ${s}`);
