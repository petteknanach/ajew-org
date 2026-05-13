#!/usr/bin/env node
const fs = require('fs');

// Check if Hebrew segments contain LM references
const data = JSON.parse(fs.readFileSync('/root/ajew-org/public/reader/likutay-halachos/part-1/torah-22.json', 'utf8'));
const segs = data.segments || [];

for (let i = 0; i < Math.min(5, segs.length); i++) {
  const he = (segs[i].he || segs[i].he_nikud || '').trim();
  console.log(`Seg ${i}: ${he.substring(0, 100)}`);
}
