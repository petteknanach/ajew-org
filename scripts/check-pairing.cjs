#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Check how English is currently paired with Hebrew
for (const part of [1, 4, 7]) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idx = JSON.parse(fs.readFileSync(path.join(pdir, 'index.json'), 'utf8'));
  
  // Check first 3 files
  for (const t of idx.torahs.slice(0, 3)) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log(`\n=== Part ${part} Torah ${t.number} (${t.hebrewTitle || t.title}) ===`);
    console.log(`Total segments: ${data.segments.length}`);
    
    // Count content segments (hebrew > 8 chars)
    const heSegs = data.segments.filter(s => (s.he || s.he_nikud || '').trim().length >= 8);
    const enSegs = data.segments.filter(s => s.en && s.en.trim().length > 0);
    
    console.log(`Hebrew content segs: ${heSegs.length}`);
    console.log(`English content segs: ${enSegs.length}`);
    
    // Show first 3 segments
    for (let i = 0; i < Math.min(3, data.segments.length); i++) {
      const seg = data.segments[i];
      const he = (seg.he || seg.he_nikud || '').trim();
      const en = (seg.en || '').trim();
      console.log(`\n  Seg ${i}: HE="${he.substring(0, 50)}..." EN="${en.substring(0, 50)}..."`);
    }
  }
}
