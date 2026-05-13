#!/usr/bin/env node
/**
 * Fix LH English-Hebrew pairing by re-extracting from HTML source.
 * 
 * For each Hebrew file that has English:
 * 1. Find the corresponding HTML file
 * 2. Extract all English paragraphs from the HTML
 * 3. Distribute them proportionally across Hebrew content segments
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"')
    .replace(/&#x27;/g, "'").replace(/&#x2014;/g, '—').replace(/&#x2013;/g, '–')
    .replace(/&#x2018;/g, "'").replace(/&#x2019;/g, "'")
    .replace(/&#x201C;/g, '"').replace(/&#x201D;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractParagraphsFromHTML(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(content)) !== null) {
    let text = decodeHTML(m[1]).replace(/<[^>]+>/g, '').trim();
    if (text.length >= 20) paragraphs.push(text);
  }
  return paragraphs;
}

// Map Hebrew file to HTML file
// We need to find which HTML file corresponds to which Hebrew entry
// Use the same matching logic as before

const volToPart = {
  'Likutay Halachos - Orach Chaim - 1': { part: 1, name: 'OC1' },
  'Likutay Halachos - Orach Chaim - 2': { part: 2, name: 'OC2' },
  'Likutay Halachos - Orach Chaim - 3': { part: 3, name: 'OC3' },
  'Likutay Halachos - Yoreh Daya - 1': { part: 4, name: 'YD1' },
  'Likutay Halachos - Yoreh Daya - 2': { part: 5, name: 'YD2' },
  'Likutay Halachos - Evven Hu-ezehr': { part: 6, name: 'EH' },
  'Likutay Halachos - Choshen Mishpat - 1': { part: 7, name: 'CM1' },
  'Likutay Halachos - Choshen Mishpat - 2': { part: 8, name: 'CM2' },
};

// Build HTML file list by part
const htmlByPart = {};
for (const [vol, info] of Object.entries(volToPart)) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  if (!fs.existsSync(volDir)) continue;
  htmlByPart[info.part] = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort((a, b) => {
    const na = parseInt(a.match(/^(\d+)/)?.[1] || '0');
    const nb = parseInt(b.match(/^(\d+)/)?.[1] || '0');
    return na !== nb ? na - nb : a.localeCompare(b);
  });
}

// Build Hebrew entries by part
const hebrewByPart = {};
for (let part = 1; part <= 8; part++) {
  hebrewByPart[part] = [];
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of idx.torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    hebrewByPart[part].push({
      title: t.hebrewTitle || t.title || '',
      number: t.number, filePath, segments: data.segments || [],
    });
  }
}

// For each part, match HTML files to Hebrew entries sequentially
// and re-extract English paragraphs with proper distribution
console.log('=== Re-extracting English from HTML with proper pairing ===\n');

let totalFixed = 0;

for (let part = 1; part <= 8; part++) {
  const htmlFiles = htmlByPart[part] || [];
  const hebList = hebrewByPart[part] || [];
  const volDir = path.join(TRANSLATIONS_BASE, Object.entries(volToPart).find(([v, i]) => i.part === part)?.[0] || '');
  
  if (!fs.existsSync(volDir)) continue;
  
  const minLen = Math.min(htmlFiles.length, hebList.length);
  let partFixed = 0;
  
  for (let i = 0; i < minLen; i++) {
    const heb = hebList[i];
    const htmlPath = path.join(volDir, htmlFiles[i]);
    
    // Extract English paragraphs from HTML
    const enParas = extractParagraphsFromHTML(htmlPath);
    if (enParas.length === 0) continue;
    
    // Count Hebrew content segments
    const heContentSegs = [];
    for (let s = 0; s < heb.segments.length; s++) {
      const he = (heb.segments[s].he || heb.segments[s].he_nikud || '').trim();
      if (he.length < 8) continue;
      if (/^אות\s/.test(he) && he.length < 10) continue;
      if (/^הלכה\s/.test(he) && he.length < 15) continue;
      heContentSegs.push(s);
    }
    
    if (heContentSegs.length === 0) continue;
    
    // Clear existing English
    for (const seg of heb.segments) seg.en = '';
    
    // Distribute English paragraphs proportionally
    if (enParas.length >= heContentSegs.length) {
      const ratio = enParas.length / heContentSegs.length;
      for (let s = 0; s < heContentSegs.length; s++) {
        const start = Math.round(s * ratio);
        const end = Math.round((s + 1) * ratio);
        heb.segments[heContentSegs[s]].en = enParas.slice(start, end).join('\n\n');
      }
    } else {
      const ratio = heContentSegs.length / enParas.length;
      for (let e = 0; e < enParas.length; e++) {
        const sStart = Math.round(e * ratio);
        const sEnd = Math.round((e + 1) * ratio);
        for (let s = sStart; s < sEnd && s < heContentSegs.length; s++) {
          heb.segments[heContentSegs[s]].en = enParas[e];
        }
      }
    }
    
    fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
    partFixed++;
  }
  
  console.log(`Part ${part}: ${partFixed} files re-processed`);
  totalFixed += partFixed;
}

console.log(`\nTotal files re-processed: ${totalFixed}`)

// Verify a sample
console.log('\n=== Verification ===');
const sampleFile = path.join(LH_BASE, 'part-1/torah-1.json');
const sample = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
console.log(`Part 1 Torah 1: ${sample.segments.length} segments`);
for (let i = 0; i < Math.min(2, sample.segments.length); i++) {
  const he = (sample.segments[i].he || sample.segments[i].he_nikud || '').trim();
  const en = (sample.segments[i].en || '').trim();
  const enParas = en.split(/\n\n+/).filter(p => p.trim().length >= 20);
  console.log(`  Seg ${i}: HE(${he.length} chars) → EN(${en.length} chars, ${enParas.length} paras)`);
  console.log(`    HE: "${he.substring(0, 50)}..."`);
  console.log(`    EN: "${en.substring(0, 50)}..."`);
}
