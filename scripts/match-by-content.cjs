#!/usr/bin/env node
/**
 * Match HTML files to Hebrew halachos using filename patterns.
 * 
 * The HTML filenames contain English transliterations of the Hebrew halacha names.
 * We can match these to the Hebrew index by comparing the filename pattern.
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// Build Hebrew index with all titles
const hebrewFiles = [];
for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of (idx.torahs || [])) {
    const title = t.hebrewTitle || t.title || '';
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    hebrewFiles.push({ title, part, number: t.number, filePath });
  }
}

// Build a mapping from English keywords to Hebrew titles
// by scanning HTML file names
const volToPart = {
  'Likutay Halachos - Orach Chaim - 1': 1,
  'Likutay Halachos - Orach Chaim - 2': 2,
  'Likutay Halachos - Orach Chaim - 3': 3,
  'Likutay Halachos - Yoreh Daya - 1': 4,
  'Likutay Halachos - Yoreh Daya - 2': 5,
  'Likutay Halachos - Evven Hu-ezehr': 6,
  'Likutay Halachos - Choshen Mishpat - 1': 7,
  'Likutay Halachos - Choshen Mishpat - 2': 8,
};

// For each Hebrew file, try to find matching HTML file by scanning filenames
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

// Build HTML file index by volume
const htmlByVolume = {};
for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  htmlByVolume[vol] = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
}

// Try to match by checking if the Hebrew title appears in any HTML file content
// This is slow but accurate
console.log('Building content-based mapping...');

const hebrewToHTML = {};
let found = 0;

for (const hf of hebrewFiles) {
  // Get the volume for this Hebrew file
  const vol = Object.entries(volToPart).find(([v, p]) => p === hf.part);
  if (!vol) continue;
  
  const volDir = path.join(TRANSLATIONS_BASE, vol[0]);
  const htmlFiles = htmlByVolume[vol[0]] || [];
  
  // Check each HTML file in this volume
  for (const htmlFile of htmlFiles) {
    const htmlPath = path.join(volDir, htmlFile);
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    // Check if Hebrew title appears in HTML content
    if (content.includes(hf.title)) {
      hebrewToHTML[hf.title] = htmlPath;
      found++;
      break;
    }
  }
}

console.log(`Found ${found} matches by Hebrew title in HTML content`);
console.log(`Total Hebrew files: ${hebrewFiles.length}`);
console.log(`Unmatched: ${hebrewFiles.length - found}`);

// Save mapping
fs.writeFileSync('/root/ajew-org/scripts/hebrew-to-html-content.json', 
  JSON.stringify(hebrewToHTML, null, 2), 'utf8');
