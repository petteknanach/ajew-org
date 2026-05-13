#!/usr/bin/env node
const fs = require('fs');

// Check a sample file from Part 1 (should be well-matched)
const data = JSON.parse(fs.readFileSync('/root/ajew-org/public/reader/likutay-halachos/part-1/torah-22.json', 'utf8'));
console.log(`Torah 22 (${data.hebrewTitle || data.title}): ${data.segments.length} segments`);

let withEn = 0;
for (const seg of data.segments) {
  if (seg.en && seg.en.trim().length > 0) withEn++;
}
console.log(`Segments with English: ${withEn}`);

// Show first 3 content segments
let shown = 0;
for (let i = 0; i < data.segments.length && shown < 3; i++) {
  const he = (data.segments[i].he || data.segments[i].he_nikud || '').trim();
  const en = (data.segments[i].en || '').trim();
  if (he.length >= 8) {
    shown++;
    console.log(`\nSegment ${i}:`);
    console.log(`  HE: ${he.substring(0, 100)}`);
    console.log(`  EN: ${en.substring(0, 100)}`);
  }
}

// Check a Part 4 file (some should have English now)
const data4 = JSON.parse(fs.readFileSync('/root/ajew-org/public/reader/likutay-halachos/part-4/torah-1.json', 'utf8'));
console.log(`\n\nPart 4 Torah 1 (${data4.hebrewTitle || data4.title}): ${data4.segments.length} segments`);
withEn = 0;
for (const seg of data4.segments) {
  if (seg.en && seg.en.trim().length > 0) withEn++;
}
console.log(`Segments with English: ${withEn}`);
