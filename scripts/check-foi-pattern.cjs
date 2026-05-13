#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check the pattern in a FOI file
const filePath = '/root/ajew-org/public/reader/fires-of-israel/section-1.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(`Section 1: ${data.segments.length} segments`);
for (let i = 0; i < Math.min(10, data.segments.length); i++) {
  const seg = data.segments[i];
  const he = (seg.he || '').trim();
  const en = (seg.en || '').trim();
  console.log(`  [${i}] HE(${he.length}): "${he.substring(0, 40)}" | EN(${en.length}): "${en.substring(0, 40)}"`);
}
