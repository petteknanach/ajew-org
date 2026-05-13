#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Check a file with many segments
const filePath = path.join(LH_BASE, 'part-1/torah-2.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(`Part 1 Torah 2: ${data.segments.length} segments`);

let totalHe = 0, totalEn = 0;
for (let i = 0; i < data.segments.length; i++) {
  const he = (data.segments[i].he || data.segments[i].he_nikud || '').trim();
  const en = (data.segments[i].en || '').trim();
  
  if (he.length >= 8 && !(/^אות\s/.test(he) && he.length < 10)) {
    totalHe += he.length;
    totalEn += en.length;
    const enParas = en.split(/\n\n+/).filter(p => p.trim().length >= 20);
    console.log(`  Seg ${i}: HE(${he.length}) EN(${en.length}, ${enParas.length} paras) - "${he.substring(0, 30)}..."`);
  }
}
console.log(`\nTotal HE: ${totalHe}, Total EN: ${totalEn}, Ratio: ${(totalEn/totalHe).toFixed(2)}`);
