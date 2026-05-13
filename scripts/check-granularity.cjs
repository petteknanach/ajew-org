#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Check how many segments a typical Hebrew file has vs the HTML files for the same halacha
// E.g., בית הכנסת ו has 150 segments in Hebrew
// But the HTML files for בית הכנסת are split: 6a(12), 6b(13), 6c(16), 6d(20) + 1(8), 2(9), 3(13), 4(22), 5a(19), 5b(14), 5c(13), 5d(21), 5e(18), 5f(13)
// Total HTML paragraphs: ~201

// So the Hebrew files contain WHOLE halachot, while the HTML files split them into sections!
// The HTML sections need to be CONCATENATED before matching.

// Let me verify by looking at the index for part 1
const idxFile = path.join(LH_BASE, 'part-1', 'index.json');
const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));

console.log('Part 1 Hebrew halachot:');
for (const t of (idx.torahs || [])) {
  const filePath = path.join(LH_BASE, 'part-1', `torah-${t.number}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segments = data.segments || [];
  
  // Count content segments
  let count = 0;
  for (const seg of segments) {
    const he = (seg.he || seg.he_nikud || '').trim();
    if (he.length === 0) continue;
    if (/^אות\s/.test(he) && he.length < 10) continue;
    if (/^הלכה\s/.test(he) && he.length < 15) continue;
    if (/^סימן\s/.test(he) && he.length < 15) continue;
    if (he.length < 8) continue;
    count++;
  }
  
  console.log(`  ${t.hebrewTitle || t.title}: ${count} content segments, ${segments.length} total segments`);
}

// Now check what the corresponding HTML files look like
const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

// For Orach Chaim 1, the HTML files seem to be ordered sequentially
// Let's see the titles
const oc1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1');
const htmlFiles = fs.readdirSync(oc1Dir).filter(f => f.endsWith('.html')).sort();

console.log('\n\nOrach Chaim 1 HTML files (showing halacha structure):');
for (const hf of htmlFiles.slice(0, 30)) {
  const content = fs.readFileSync(path.join(oc1Dir, hf), 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&mdash;/g, '—').replace(/&amp;/g, '&') : '';
  
  // Count paragraphs
  const paras = (content.match(/<p[^>]*>/gi) || []).length;
  
  // Show section markers
  const sections = content.match(/§\d+/gi) || [];
  
  console.log(`  ${hf}: "${title.substring(0, 60)}" (${paras} paras, ${sections.length} sections)`);
}
