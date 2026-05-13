#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

// Check Orach Chaim 1: compare HTML file order with Hebrew file order
const oc1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1');
const htmlFiles = fs.readdirSync(oc1Dir).filter(f => f.endsWith('.html')).sort();

const idxFile = path.join(LH_BASE, 'part-1', 'index.json');
const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));

console.log('Orach Chaim 1: HTML files vs Hebrew files\n');

// Get HTML titles in order
const htmlTitles = [];
for (const hf of htmlFiles) {
  const content = fs.readFileSync(path.join(oc1Dir, hf), 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
  
  // Extract halacha name
  let name = '';
  const t = title.replace(/^Likutay Halachos\s*[—–-\s]+\s*/i, '');
  const nameMatch = t.match(/(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]|\s*$)/i);
  if (nameMatch) name = nameMatch[1].trim();
  
  // Extract halacha number
  let halacha = '';
  const hMatch = t.match(/Halacha[s]?\s+(\d+[a-z]?)/i);
  if (hMatch) halacha = hMatch[1];
  
  htmlTitles.push({ file: hf, name, halacha, title });
}

// Get Hebrew titles in order
const hebrewTitles = (idx.torahs || []).map(t => ({
  number: t.number,
  title: t.hebrewTitle || t.title || ''
}));

// Now let's see if there's a pattern
// The HTML files are numbered 010, 030, 040, ... and the Hebrew files are numbered 1, 2, 3, ...
// Let's see if the HTML file number / 30 ≈ Hebrew file number

console.log('Comparing order:');
console.log('\nHTML files (first 20):');
for (let i = 0; i < Math.min(20, htmlTitles.length); i++) {
  const h = htmlTitles[i];
  const numPrefix = parseInt(h.file) || 0;
  console.log(`  ${i}: ${h.file} -> ${h.name} ${h.halacha} (num=${numPrefix}, num/30=${(numPrefix/30).toFixed(1)})`);
}

console.log('\nHebrew files (first 20):');
for (let i = 0; i < Math.min(20, hebrewTitles.length); i++) {
  const h = hebrewTitles[i];
  console.log(`  ${i}: ${h.number}. ${h.title}`);
}

// Check: does HTML file 010 (Hakdamah/Hashkamas) correspond to Hebrew 1 (Hakdamah)?
// Does HTML file 030 (Hashkamas 2-3) correspond to Hebrew 2-3?
// Does HTML file 050 (Hashkamas 5) correspond to Hebrew 7 (Hashkamas Hei)?
// Wait, Hebrew 2 is Hashkamas Aleph, Hebrew 3 is Hashkamas Beis...

// Let me check the Hebrew index more carefully
console.log('\n\nHebrew index (all):');
for (const t of (idx.torahs || [])) {
  console.log(`  ${t.number}. ${t.hebrewTitle || t.title}`);
}
