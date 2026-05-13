#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

for (const vol of ['Likutay Halachos - Yoreh Daya - 1', 'Likutay Halachos - Yoreh Daya - 2', 'Likutay Halachos - Evven Hu-ezehr']) {
  const volDir = path.join(base, vol);
  if (!fs.existsSync(volDir)) { console.log('NOT FOUND:', vol); continue; }
  
  const allFiles = fs.readdirSync(volDir);
  const htmlFiles = allFiles.filter(f => f.endsWith('.html'));
  const otherFiles = allFiles.filter(f => !f.endsWith('.html'));
  
  console.log(`\n=== ${vol} ===`);
  console.log(`Total: ${allFiles.length}, HTML: ${htmlFiles.length}, Other: ${otherFiles.length}`);
  
  if (otherFiles.length > 0) {
    console.log('Other files:');
    for (const f of otherFiles) console.log(`  ${f}`);
  }
  
  console.log('HTML files:');
  for (const f of htmlFiles.sort()) {
    console.log(`  ${f}`);
  }
}
