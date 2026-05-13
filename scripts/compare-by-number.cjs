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

function extractParagraphs(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(content)) !== null) {
    let text = m[1].replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = decodeHTML(text).replace(/\s+/g, ' ').trim();
    if (text.length >= 20) paragraphs.push(text);
  }
  return paragraphs;
}

function countSegments(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segments = data.segments || [];
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
  return count;
}

// For Orach Chaim 1, check if HTML file number correlates with Hebrew torah number
const oc1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1');
const htmlFiles = fs.readdirSync(oc1Dir).filter(f => f.endsWith('.html')).sort();

// Get Hebrew index for part 1
const idxFile = path.join(LH_BASE, 'part-1', 'index.json');
const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));

console.log('HTML files vs Hebrew halachos for Orach Chaim 1\n');
console.log('HTML files (sorted):');

// Extract the number prefix from each HTML file and group by halacha
const htmlEntries = [];
for (const hf of htmlFiles) {
  const htmlPath = path.join(oc1Dir, hf);
  const paragraphs = extractParagraphs(htmlPath);
  
  const content = fs.readFileSync(htmlPath, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
  
  // Extract halacha number from title
  const hMatch = title.match(/Halacha[s]?\s+(\d+[a-z]?)/i);
  const halachaNum = hMatch ? hMatch[1] : null;
  
  htmlEntries.push({ hf, title, paragraphs: paragraphs.length, halachaNum });
}

// Group by halacha number and concatenate
const htmlByNum = {};
for (const e of htmlEntries) {
  if (!e.halachaNum) continue;
  if (!htmlByNum[e.halachaNum]) htmlByNum[e.halachaNum] = { paras: 0, files: [] };
  htmlByNum[e.halachaNum].paras += e.paragraphs;
  htmlByNum[e.halachaNum].files.push(e.hf);
}

console.log('\nGrouped HTML by halacha number:');
for (const [num, data] of Object.entries(htmlByNum)) {
  console.log(`  Halacha ${num}: ${data.paras} paras from ${data.files.length} files`);
  for (const f of data.files) console.log(`    ${f}`);
}

console.log('\n\nHebrew halachos:');
for (const t of (idx.torahs || [])) {
  const filePath = path.join(LH_BASE, 'part-1', `torah-${t.number}.json`);
  const segs = countSegments(filePath);
  console.log(`  ${t.number}. ${t.hebrewTitle}: ${segs} segs`);
}
