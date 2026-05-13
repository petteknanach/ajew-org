#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

let totalFiles = 0;
let filesWithEn = 0;
let totalEnChars = 0;
let totalHeChars = 0;

for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  let partFiles = 0;
  let partWithEn = 0;
  
  for (const t of (idx.torahs || [])) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    
    partFiles++;
    let hasEn = false;
    for (const seg of segments) {
      const he = (seg.he || seg.he_nikud || '').trim();
      const en = (seg.en || '').trim();
      if (he.length > 0) totalHeChars += he.length;
      if (en.length > 0) {
        totalEnChars += en.length;
        hasEn = true;
      }
    }
    if (hasEn) partWithEn++;
  }
  
  totalFiles += partFiles;
  filesWithEn += partWithEn;
  console.log(`Part ${part}: ${partWithEn}/${partFiles} files with English`);
}

console.log(`\nTotal: ${filesWithEn}/${totalFiles} files with English (${(filesWithEn/totalFiles*100).toFixed(1)}%)`);
console.log(`Total Hebrew chars: ${totalHeChars.toLocaleString()}`);
console.log(`Total English chars: ${totalEnChars.toLocaleString()}`);
console.log(`En/He ratio: ${(totalEnChars/totalHeChars*100).toFixed(1)}%`);
