#!/usr/bin/env node
const fs = require('fs');

// Check if Hebrew segments contain LM references
const f = '/root/ajew-org/public/reader/likutay-halachos/part-1/torah-55.json';
const data = JSON.parse(fs.readFileSync(f, 'utf8'));
const segs = data.segments || [];

// Look for LM references in Hebrew text
const lmRegex = /לקוטי מורן\s*[א-ת]+[:\s]*(\d+)/g;
let found = 0;
for (const s of segs) {
  const he = s.he || s.he_nikud || '';
  if (he.includes('לקוטי מורן') || he.includes('LM')) {
    found++;
    if (found <= 5) {
      console.log(`Found LM ref: ${he.substring(0, 100)}`);
    }
  }
}
console.log(`\nTotal segments with LM refs in Hebrew: ${found}`);

// Also check the en field for LM refs
let enFound = 0;
for (const s of segs) {
  const en = s.en || '';
  if (en.includes('LM') || en.includes('Likutay Moharan')) {
    enFound++;
    if (enFound <= 5) {
      console.log(`Found LM ref in EN: ${en.substring(0, 100)}`);
    }
  }
}
console.log(`Total segments with LM refs in English: ${enFound}`);
