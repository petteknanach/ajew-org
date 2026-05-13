#!/usr/bin/env node
const fs = require('fs');

// Check a sample file to see how English is distributed
const data = JSON.parse(fs.readFileSync('/root/ajew-org/public/reader/likutay-halachos/part-1/torah-22.json', 'utf8'));
const segs = data.segments || [];

console.log(`Total segments: ${segs.length}`);
let contentSegs = 0;
let enSegs = 0;
for (const seg of segs) {
  const he = (seg.he || seg.he_nikud || '').trim();
  const en = (seg.en || '').trim();
  if (he.length >= 8) contentSegs++;
  if (en.length > 0) enSegs++;
}
console.log(`Content segments: ${contentSegs}`);
console.log(`Segments with English: ${enSegs}`);

// Show first 5 segments with content
console.log('\nFirst 5 content segments:');
let shown = 0;
for (let i = 0; i < segs.length && shown < 5; i++) {
  const he = (segs[i].he || segs[i].he_nikud || '').trim();
  const en = (segs[i].en || '').trim();
  if (he.length >= 8) {
    shown++;
    console.log(`\nSegment ${i}:`);
    console.log(`  HE: ${he.substring(0, 80)}...`);
    console.log(`  EN: ${en.substring(0, 80)}...`);
  }
}
