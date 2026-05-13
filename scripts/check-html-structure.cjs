#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check the HTML structure of a sample file to understand paragraph pairing
const htmlPath = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos/Likutay Halachos - Orach Chaim - 1/010 LH_OC1_Complete_Hakdamah_Hashkamas1.html';
const content = fs.readFileSync(htmlPath, 'utf8');

// Extract title
const title = content.match(/<title>(.*?)<\/title>/i);
console.log('Title:', title ? title[1] : 'N/A');

// Extract all paragraphs with their context
const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
let m;
let pIdx = 0;
const paras = [];

while ((m = pRegex.exec(content)) !== null) {
  let text = m[1].replace(/<[^>]+>/g, '').trim();
  if (text.length < 20) continue;
  
  // Get context: what header/section this paragraph is under
  const before = content.substring(0, m.index);
  const lastH3 = before.lastIndexOf('<h3');
  const lastH2 = before.lastIndexOf('<h2');
  const lastHeader = Math.max(lastH3, lastH2);
  let sectionHeader = '';
  if (lastHeader >= 0) {
    const headerMatch = content.substring(lastHeader).match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
    if (headerMatch) sectionHeader = headerMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 40);
  }
  
  paras.push({ idx: pIdx, text: text.substring(0, 60), section: sectionHeader });
  pIdx++;
}

console.log(`\nTotal paragraphs: ${paras.length}`);
console.log('\nFirst 10 paragraphs:');
for (const p of paras.slice(0, 10)) {
  console.log(`  [${p.idx}] ${p.text}...`);
  if (p.section) console.log(`       Section: ${p.section}`);
}

// Now check the corresponding Hebrew file
const hebPath = '/root/ajew-org/public/reader/likutay-halachos/part-1/torah-1.json';
const hebData = JSON.parse(fs.readFileSync(hebPath, 'utf8'));
console.log(`\nHebrew file: ${hebData.segments.length} segments`);
console.log('First 5 Hebrew segments:');
for (let i = 0; i < Math.min(5, hebData.segments.length); i++) {
  const he = (hebData.segments[i].he || hebData.segments[i].he_nikud || '').trim();
  const en = (hebData.segments[i].en || '').trim();
  console.log(`  [${i}] HE: "${he.substring(0, 50)}..."`);
  console.log(`       EN: "${en.substring(0, 50)}..."`);
}
