#!/usr/bin/env node
/**
 * FINAL LH alignment v3 - simple sequential 1:1 matching.
 * Within each part, sort HTML files by filename and Hebrew files by number.
 * Match them 1:1. This works because both are in the same order (by halacha).
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

function extractParagraphs(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(content)) !== null) {
    let text = m[1].replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = decodeHTML(text).replace(/\s+/g, ' ').trim();
    if (text.length >= 20 &&
        !/^Likutay Halachos$/i.test(text) &&
        !/^(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)/i.test(text)) {
      paragraphs.push(text);
    }
  }
  return paragraphs;
}

// Build HTML entries by part, sorted by filename
const htmlByPart = {};
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  if (!htmlByPart[part]) htmlByPart[part] = [];
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  for (const hf of files) {
    const htmlPath = path.join(volDir, hf);
    const paragraphs = extractParagraphs(htmlPath);
    if (paragraphs.length === 0) continue;
    htmlByPart[part].push({ hf, htmlPath, paragraphs });
  }
}

// Build Hebrew entries by part, sorted by number
const hebrewByPart = {};
for (let part = 1; part <= 8; part++) {
  hebrewByPart[part] = [];
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of (idx.torahs || [])) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    
    // Clear old English
    for (const seg of segments) seg.en = '';
    
    const contentSegs = [];
    for (let i = 0; i < segments.length; i++) {
      const he = (segments[i].he || segments[i].he_nikud || '').trim();
      if (he.length === 0) continue;
      if (/^אות\s/.test(he) && he.length < 10) continue;
      if (/^הלכה\s/.test(he) && he.length < 15) continue;
      if (/^סימן\s/.test(he) && he.length < 15) continue;
      if (he.length < 8) continue;
      contentSegs.push(i);
    }
    
    hebrewByPart[part].push({
      title: t.hebrewTitle || t.title || '',
      number: t.number,
      filePath, segments, contentSegs, segCount: contentSegs.length
    });
  }
}

// Match 1:1 sequentially within each part
console.log('=== MATCHING (sequential 1:1) ===\n');
let totalMatched = 0;
let totalAligned = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const htmlList = htmlByPart[part] || [];
  const hebList = hebrewByPart[part] || [];
  
  const minLen = Math.min(htmlList.length, hebList.length);
  
  console.log(`Part ${part}: ${htmlList.length} HTML, ${hebList.length} Hebrew → matching ${minLen}`);
  
  for (let i = 0; i < minLen; i++) {
    const html = htmlList[i];
    const heb = hebList[i];
    
    // Clear and assign English
    for (const seg of heb.segments) seg.en = '';
    
    const enParas = html.paragraphs;
    const segCount = heb.contentSegs.length;
    
    if (segCount === 0) continue;
    
    if (enParas.length >= segCount) {
      const ratio = enParas.length / segCount;
      for (let s = 0; s < segCount; s++) {
        const start = Math.round(s * ratio);
        const end = Math.round((s + 1) * ratio);
        heb.segments[heb.contentSegs[s]].en = enParas.slice(start, end).join('\n\n');
      }
    } else {
      const ratio = segCount / enParas.length;
      for (let e = 0; e < enParas.length; e++) {
        const sStart = Math.round(e * ratio);
        const sEnd = Math.round((e + 1) * ratio);
        for (let s = sStart; s < sEnd && s < segCount; s++) {
          heb.segments[heb.contentSegs[s]].en = enParas[e];
        }
      }
    }
    
    fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
    totalMatched++;
    totalAligned += segCount;
    
    matchLog.push({
      part,
      hebrew: heb.title,
      html: html.hf,
      paras: enParas.length,
      segs: segCount
    });
  }
  
  if (htmlList.length > hebList.length) {
    console.log(`  Skipped ${htmlList.length - hebList.length} extra HTML files`);
  } else if (hebList.length > htmlList.length) {
    console.log(`  ${hebList.length - htmlList.length} Hebrew files without English`);
  }
}

// Count coverage
let filesWithEn = 0, totalHebFiles = 0;
for (let part = 1; part <= 8; part++) {
  for (const heb of hebrewByPart[part] || []) {
    totalHebFiles++;
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) filesWithEn++;
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Matched: ${totalMatched} Hebrew files`);
console.log(`Coverage: ${filesWithEn}/${totalHebFiles} (${(filesWithEn/totalHebFiles*100).toFixed(1)}%)`);

// Per-part
for (let part = 1; part <= 8; part++) {
  const hebs = hebrewByPart[part] || [];
  let withEn = 0;
  for (const h of hebs) {
    if (h.segments.some(s => s.en && s.en.trim().length > 0)) withEn++;
  }
  console.log(`  Part ${part}: ${withEn}/${hebs.length}`);
}

// Show first 5 matches per part
console.log('\nSample matches per part:');
for (let part = 1; part <= 8; part++) {
  const partMatches = matchLog.filter(m => m.part === part);
  console.log(`\n  Part ${part}:`);
  for (const m of partMatches.slice(0, 5)) {
    console.log(`    ${m.html} → ${m.hebrew} (${m.paras}p/${m.segs}s)`);
  }
}

fs.writeFileSync('/root/ajew-org/scripts/alignment-v3-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log('\nMatch log saved.');
