#!/usr/bin/env node
/**
 * Build a mapping from Hebrew halacha names to English HTML files
 * by searching HTML content for Hebrew text that matches the Hebrew index.
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Get all Hebrew halacha names
const hebrewNames = {};
for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  for (const t of (idx.torahs || [])) {
    const title = t.hebrewTitle || t.title || '';
    if (title) {
      hebrewNames[title] = path.join(pdir, `torah-${t.number}.json`);
    }
  }
}

console.log(`Total Hebrew halachos: ${Object.keys(hebrewNames).length}`);

// Scan all HTML files and check which Hebrew names they contain
const htmlToHebrew = {};  // htmlPath -> hebrewName
const hebrewToHtml = {};  // hebrewName -> htmlPath

const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  const full = path.join(TRANSLATIONS_BASE, f);
  return fs.statSync(full).isDirectory();
});

let scanned = 0;
let matched = 0;

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of htmlFiles) {
    scanned++;
    const htmlPath = path.join(volDir, hf);
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    // Check each Hebrew name (prioritize longer/more specific names)
    let bestMatch = null;
    let bestMatchLen = 0;
    
    for (const heName of Object.keys(hebrewNames)) {
      if (heName.length < 3) continue;  // Skip very short names
      if (content.includes(heName)) {
        if (heName.length > bestMatchLen) {
          bestMatch = heName;
          bestMatchLen = heName.length;
        }
      }
    }
    
    if (bestMatch) {
      matched++;
      hebrewToHtml[bestMatch] = htmlPath;
      
      if (matched <= 20) {
        console.log(`  ${matched}. ${bestMatch} -> ${path.join(vol, hf)}`);
      }
    }
  }
}

console.log(`\nScanned: ${scanned} HTML files`);
console.log(`Matched: ${matched} HTML files to Hebrew halachos`);
console.log(`Unmatched Hebrew halachos: ${Object.keys(hebrewNames).length - matched}`);

// Save the mapping
fs.writeFileSync('/root/ajew-org/scripts/hebrew-to-html-mapping.json', 
  JSON.stringify(hebrewToHtml, null, 2), 'utf8');
console.log('\nMapping saved to scripts/hebrew-to-html-mapping.json');
