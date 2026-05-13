#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check how LH JSON files store their data
const f = '/root/ajew-org/public/reader/likutay-halachos/part-1/torah-55.json';
const data = JSON.parse(fs.readFileSync(f, 'utf8'));
const segs = data.segments || [];

console.log(`Total segments: ${segs.length}`);
console.log(`\nFirst 10 segments:`);
for (let i = 0; i < Math.min(10, segs.length); i++) {
  const s = segs[i];
  const he = (s.he || s.he_nikud || '').trim();
  const en = (s.en || '').trim();
  console.log(`\nSegment ${i}:`);
  console.log(`  keys: ${Object.keys(s).join(', ')}`);
  console.log(`  he: ${he.substring(0, 80)}`);
  if (en) console.log(`  en: ${en.substring(0, 80)}`);
  if (s.source) console.log(`  source: ${JSON.stringify(s.source).substring(0, 100)}`);
  if (s.lm_ref) console.log(`  lm_ref: ${JSON.stringify(s.lm_ref).substring(0, 100)}`);
}
