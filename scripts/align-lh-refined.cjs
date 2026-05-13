#!/usr/bin/env node
/**
 * Refined LH alignment using volume-to-part mapping + count matching.
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
    .replace(/&#x27;/g, "'").replace(/&#x2014;/g, '—').replace(/&#x2013;/g, '–')
    .replace(/&#x2018;/g, "'").replace(/&#x2019;/g, "'")
    .replace(/&#x201C;/g, '"').replace(/&#x201D;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

// Volume folder to part mapping
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

// Index Hebrew files by part -> count -> [files]
const hebrewIndex = {};
for (let part = 1; part <= 8; part++) {
  hebrewIndex[part] = {};
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of (idx.torahs || [])) {
    const title = t.hebrewTitle || t.title || '';
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    
    // Count content segments
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
    
    if (!hebrewIndex[part][count]) hebrewIndex[part][count] = [];
    hebrewIndex[part][count].push({ title, part, number: t.number, filePath, segmentCount: count });
  }
}

// Process HTML files
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

let totalHTML = 0;
let matched = 0;
let totalAligned = 0;

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  const part = volToPart[vol];
  
  if (!part) continue;
  
  for (const hf of htmlFiles) {
    totalHTML++;
    const htmlPath = path.join(volDir, hf);
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract paragraphs
    const paragraphs = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = pRegex.exec(content)) !== null) {
      let text = m[1].replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/<[^>]+>/g, '');
      text = decodeHTML(text).replace(/\s+/g, ' ').trim();
      if (text.length >= 20 && 
          !/^Likutay Halachos$/i.test(text) &&
          !/^(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[–—-]?\s*Volume/i.test(text)) {
        paragraphs.push(text);
      }
    }
    
    if (paragraphs.length === 0) continue;
    
    // Find matching Hebrew file by part + count
    const candidates = hebrewIndex[part][paragraphs.length] || [];
    
    if (candidates.length === 1) {
      // Perfect match
      const cand = candidates[0];
      const heData = JSON.parse(fs.readFileSync(cand.filePath, 'utf8'));
      const segments = heData.segments || [];
      
      let enIdx = 0;
      for (let i = 0; i < segments.length && enIdx < paragraphs.length; i++) {
        const he = (segments[i].he || segments[i].he_nikud || '').trim();
        if (he.length === 0) continue;
        if (/^אות\s/.test(he) && he.length < 10) continue;
        if (/^הלכה\s/.test(he) && he.length < 15) continue;
        if (/^סימן\s/.test(he) && he.length < 15) continue;
        if (he.length < 8) continue;
        
        segments[i].en = paragraphs[enIdx];
        enIdx++;
      }
      
      heData.hasEnglish = true;
      fs.writeFileSync(cand.filePath, JSON.stringify(heData, null, 2), 'utf8');
      
      matched++;
      totalAligned += enIdx;
    }
    // Skip files with multiple candidates for now
  }
}

console.log(`Total HTML files: ${totalHTML}`);
console.log(`Matched (unique count in part): ${matched}`);
console.log(`Total aligned segments: ${totalAligned}`);
