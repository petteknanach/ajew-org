#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check the structure of an Otzar Hayirah file
const ohFile = '/root/ajew-org/public/reader/otzar-hayirah/part-1/torah-1.json';
const data = JSON.parse(fs.readFileSync(ohFile, 'utf8'));

console.log('=== Otzar Hayirah Torah 1 ===');
console.log('Title:', data.title);
console.log('HebrewTitle:', data.hebrewTitle);
console.log('Segments:', data.segments.length);

// Show all segments
for (let i = 0; i < Math.min(10, data.segments.length); i++) {
  const seg = data.segments[i];
  const he = (seg.he || seg.he_nikud || '').trim();
  const en = (seg.en || '').trim();
  console.log(`\n  Seg ${i}:`);
  console.log(`    HE: "${he.substring(0, 80)}"`);
  console.log(`    EN: "${en.substring(0, 80)}"`);
}

// Check if there are simanim (section markers)
console.log('\n=== Checking for simanim ===');
for (const seg of data.segments) {
  const he = (seg.he || seg.he_nikud || '').trim();
  if (/^סימן\s/.test(he)) {
    console.log(`  Siman found: "${he.substring(0, 60)}"`);
  }
}

// Check the index structure
const idx = JSON.parse(fs.readFileSync('/root/ajew-org/public/reader/otzar-hayirah/part-1/index.json', 'utf8'));
console.log('\n=== Index structure ===');
console.log('Keys:', Object.keys(idx));
if (idx.torahs) {
  console.log('First torah:', JSON.stringify(idx.torahs[0], null, 2));
}
