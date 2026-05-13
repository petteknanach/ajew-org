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

// Get sorted HTML files from a volume
function getHTMLFiles(vol) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  return fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
}

// Get Hebrew index for a part
function getHebrewIndex(part) {
  const idxFile = path.join(LH_BASE, `part-${part}`, 'index.json');
  if (!fs.existsSync(idxFile)) return [];
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  return idx.torahs || [];
}

// Count content segments in a Hebrew file
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

// Test the sequential matching hypothesis for Orach Chaim 1 (Part 1)
console.log('=== Testing sequential match: Orach Chaim 1 ===\n');

const htmlFiles = getHTMLFiles('Likutay Halachos - Orach Chaim - 1');
const hebrewIndex = getHebrewIndex(1);
const pdir = path.join(LH_BASE, 'part-1');

// Group HTML files by their halacha number (extracted from title or filename)
// and concatenate their paragraphs
const htmlByHalacha = [];

for (const hf of htmlFiles) {
  const htmlPath = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1', hf);
  const paragraphs = extractParagraphs(htmlPath);
  if (paragraphs.length === 0) continue;
  
  const content = fs.readFileSync(htmlPath, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
  
  // Extract halacha number from title
  // Format: "Hilchos Bircas HaShachar – Halacha 5 (Part A)"
  let halachaNum = null;
  let partLetter = null;
  const hMatch = title.match(/Halacha[s]?\s+(\d+)/i);
  if (hMatch) {
    halachaNum = parseInt(hMatch[1]);
    const pMatch = title.match(/Part\s+([A-Z])/i);
    if (pMatch) partLetter = pMatch[1];
  }
  
  htmlByHalacha.push({ hf, title, paragraphs, halachaNum, partLetter });
}

console.log('HTML files by halacha:');
for (const h of htmlByHalacha.slice(0, 30)) {
  console.log(`  ${h.hf}: halacha=${h.halachaNum} part=${h.partLetter} paras=${h.paragraphs.length}`);
  console.log(`    ${h.title.substring(0, 70)}`);
}

console.log('\n\nHebrew halachos (part 1):');
for (const t of hebrewIndex) {
  const filePath = path.join(pdir, `torah-${t.number}.json`);
  const count = countSegments(filePath);
  console.log(`  ${t.number}. ${t.hebrewTitle || t.title}: ${count} content segs`);
}
