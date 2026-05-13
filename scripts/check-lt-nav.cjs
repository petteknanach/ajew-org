#!/usr/bin/env node
const fs = require('fs');

// Check navigation in prayer files
const p1 = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-1/prayer-1.json','utf8'));
console.log('Prayer 1 navigation:', JSON.stringify(p1.navigation, null, 2));

const p2 = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-1/prayer-2.json','utf8'));
console.log('Prayer 2 navigation:', JSON.stringify(p2.navigation, null, 2));

// Check index.json structure
const idx = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-1/index.json','utf8'));
console.log('\nIndex structure:');
console.log('  parts:', idx.parts?.length);
console.log('  torahs:', idx.torahs?.length);
console.log('  first torah:', JSON.stringify(idx.torahs[0]));
console.log('  last torah:', JSON.stringify(idx.torahs[idx.torahs.length-1]));

// Check if index has the right URL format
console.log('\nSample torah URLs from index:');
for (const t of idx.torahs.slice(0, 5)) {
  console.log(`  ${t.number}: ${t.title} -> /reader/likutay-tefilos/1/${t.number}`);
}
