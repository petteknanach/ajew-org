#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check Fires of Israel structure
const foiDir = '/root/ajew-org/public/reader/fires-of-israel';
const idx = JSON.parse(fs.readFileSync(path.join(foiDir, 'index.json'), 'utf8'));

console.log('=== Fires of Israel ===');
console.log('Total entries:', idx.torahs?.length);
console.log('Has English:', idx.hasEnglish);
console.log('Has Hebrew:', idx.hasHebrew);

// Check a sample file
const sampleFile = path.join(foiDir, 'section-1.json');
const data = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));

console.log('\nSample file (section-1.json):');
console.log('Title:', data.title);
console.log('Segments:', data.segments?.length);

for (let i = 0; i < Math.min(5, data.segments?.length || 0); i++) {
  const seg = data.segments[i];
  console.log(`\n  Seg ${i}:`);
  console.log(`    HE: "${(seg.he || '').trim().substring(0, 60)}"`);
  console.log(`    EN: "${(seg.en || '').trim().substring(0, 60)}"`);
}

// Check how many files have English
let withEn = 0, withoutEn = 0;
for (const t of (idx.torahs || [])) {
  const filePath = path.join(foiDir, `section-${t.number}.json`);
  if (!fs.existsSync(filePath)) continue;
  const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (d.segments?.some(s => s.en && s.en.trim().length > 0)) {
    withEn++;
  } else {
    withoutEn++;
  }
}

console.log(`\nFiles with English: ${withEn}/${idx.torahs?.length}`);
console.log(`Files without English: ${withoutEn}/${idx.torahs?.length}`);
