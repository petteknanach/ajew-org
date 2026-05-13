#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

// List all files in each volume
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const allFiles = fs.readdirSync(volDir);
  const nonHtml = allFiles.filter(f => !f.endsWith('.html'));
  
  if (nonHtml.length > 0) {
    console.log(`\n${vol}: ${nonHtml.length} non-HTML files`);
    for (const f of nonHtml.slice(0, 10)) {
      console.log(`  ${f}`);
    }
  }
  
  // Also check for any mapping/index files
  const indexFiles = allFiles.filter(f => 
    f.toLowerCase().includes('index') || 
    f.toLowerCase().includes('toc') ||
    f.toLowerCase().includes('mapping') ||
    f.endsWith('.json') ||
    f.endsWith('.txt') ||
    f.endsWith('.csv')
  );
  
  if (indexFiles.length > 0) {
    console.log(`  Index/mapping files: ${indexFiles.join(', ')}`);
  }
}
