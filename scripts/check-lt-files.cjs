#!/usr/bin/env node
const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-2/index.json','utf8'));
const indexed = new Set(idx.torahs.map(t => t.number));
const files = fs.readdirSync('public/reader/likutay-tefilos/part-2/').filter(f => f.startsWith('prayer-'));
const extra = files.filter(f => {
  const num = parseInt(f.replace('prayer-', '').replace('.json', ''));
  return !indexed.has(num);
});
console.log('Indexed prayers:', indexed.size);
console.log('Total files:', files.length);
console.log('Extra files:', extra.length);
console.log('First 10 extra:', extra.slice(0, 10).join(', '));

// Also check part 1
const idx1 = JSON.parse(fs.readFileSync('public/reader/likely-tefilos/part-1/index.json','utf8'));
