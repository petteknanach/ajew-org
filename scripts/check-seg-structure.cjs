#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Check the structure of Hebrew files - how many segments per file
for (const part of [1, 4, 7]) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idx = JSON.parse(fs.readFileSync(path.join(pdir, 'index.json'), 'utf8'));
  
  console.log(`\n=== Part ${part} ===`);
  for (const t of idx.torahs.slice(0, 5)) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Count content segments (hebrew > 8 chars, not just letter markers)
    const contentSegs = data.segments.filter(s => {
      const he = (s.he || s.he_nikud || '').trim();
      if (he.length < 8) return false;
      if (/^אות\s/.test(he) && he.length < 10) return false;
      if (/^הלכה\s/.test(he) && he.length < 15) return false;
      return true;
    });
    
    // Check how many have English
    const enSegs = data.segments.filter(s => s.en && s.en.trim().length > 0);
    
    console.log(`  #${t.number} ${t.hebrewTitle}: ${data.segments.length} total segs, ${contentSegs.length} content, ${enSegs.length} with EN`);
    
    // Show first few segments
    for (let i = 0; i < Math.min(3, data.segments.length); i++) {
      const he = (data.segments[i].he || data.segments[i].he_nikud || '').trim();
      const en = (data.segments[i].en || '').trim();
      console.log(`    [${i}] HE(${he.length}): "${he.substring(0, 40)}..." EN(${en.length}): "${en.substring(0, 40)}..."`);
    }
  }
}
