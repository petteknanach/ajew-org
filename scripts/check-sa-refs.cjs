#!/usr/bin/env node
const fs = require('fs');

// Check if Hebrew segments contain Shulchan Aruch references
const data = JSON.parse(fs.readFileSync('/root/ajew-org/public/reader/likutay-halachos/part-1/torah-55.json', 'utf8'));
const segs = data.segments || [];

let foundRefs = 0;
for (const seg of segs) {
  const he = (seg.he || seg.he_nikud || '').trim();
  // Look for Shulchan Aruch references like "סימן קנ"א" or "שלחן ערוך"
  if (/סימן\s+[\u0590-\u05FF"]+/.test(he) || /שלחן\s+ערוך/.test(he)) {
    foundRefs++;
    if (foundRefs <= 5) {
      console.log(`Found ref in segment: ${he.substring(0, 100)}`);
    }
  }
}
console.log(`Total segments with SA refs: ${foundRefs}`);

// Also check the first few segments for any structured content
console.log('\nFirst 10 segments:');
for (let i = 0; i < Math.min(10, segs.length); i++) {
  const he = (segs[i].he || segs[i].he_nikud || '').trim();
  console.log(`  ${i}: ${he.substring(0, 80)}`);
}
