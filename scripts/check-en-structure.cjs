#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Check the actual structure of English in a file
const filePath = path.join(LH_BASE, 'part-1/torah-1.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('Segments:', data.segments.length);
for (let i = 0; i < Math.min(3, data.segments.length); i++) {
  const seg = data.segments[i];
  const he = (seg.he || seg.he_nikud || '').trim();
  const en = (seg.en || '').trim();
  
  console.log(`\nSeg ${i}:`);
  console.log(`  HE length: ${he.length}`);
  console.log(`  EN length: ${en.length}`);
  console.log(`  EN type: ${typeof en}`);
  console.log(`  EN starts with: "${en.substring(0, 80)}"`);
  
  // Count how many paragraphs are in the English text
  const enParas = en.split(/\n\n+/).filter(p => p.trim().length >= 20);
  console.log(`  EN paragraphs (split by \\n\\n): ${enParas.length}`);
}
