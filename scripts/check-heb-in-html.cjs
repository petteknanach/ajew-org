#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

// Check a few HTML files for Hebrew content
const samples = [
  'Likutay Halachos - Orach Chaim - 1/160 tefillin_5a.html',
  'Likutay Halachos - Orach Chaim - 1/090 tzitzis_1.html',
  'Likutay Halachos - Choshen Mishpat - 1/005 hilchos_dayonim_1.html',
];

for (const s of samples) {
  const full = path.join(TRANSLATIONS_BASE, s);
  const content = fs.readFileSync(full, 'utf8');
  
  // Find Hebrew text in the body
  const hebrewMatches = content.match(/[\u0590-\u05FF]{3,}/g) || [];
  const unique = [...new Set(hebrewMatches)].slice(0, 15);
  
  console.log(`\n${s}:`);
  console.log(`  Hebrew words: ${unique.join(', ')}`);
  
  // Also check h1/h2 headers for Hebrew
  const headerMatches = content.match(/<h[123][^>]*>(.*?)<\/h[123]>/gi) || [];
  for (const h of headerMatches.slice(0, 3)) {
    const text = h.replace(/<[^>]+>/g, '').trim();
    console.log(`  Header: ${text.substring(0, 60)}`);
  }
}
