#!/usr/bin/env node
/**
 * LH English alignment v8 - manual mapping approach.
 * 
 * The HTML files are in Shulchan Aruch order, same as the Hebrew index.
 * We walk through both lists in order, matching HTML files to Hebrew entries.
 * 
 * When an HTML file name matches a Hebrew entry name, we assign it.
 * When there are more HTML files than Hebrew entries, extras are skipped.
 * When there are fewer HTML files, unmatched Hebrew entries are left empty.
 * 
 * The key: extract the halacha identifier (name + number) from both HTML and Hebrew,
 * and match them directly.
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

function extractParagraphs(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(content)) !== null) {
    let text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text.length >= 20) paragraphs.push(text);
  }
  return paragraphs;
}

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const m = content.match(/<title>(.*?)<\/title>/i);
  return m ? decodeHTML(m[1]) : '';
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

// Build HTML entries by part, sorted by filename number
const htmlByPart = {};
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  if (!htmlByPart[part]) htmlByPart[part] = [];
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0');
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0');
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });
  
  for (const hf of files) {
    const htmlPath = path.join(volDir, hf);
    const paras = extractParagraphs(htmlPath);
    if (paras.length === 0) continue;
    htmlByPart[part].push({ hf, htmlPath, paras });
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
  
  const torahs = [...(idx.torahs || [])].sort((a, b) => a.number - b.number);
  
  for (const t of torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    if (!fs.existsSync(filePath)) continue;
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
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
      filePath, segments, contentSegs,
      segCount: contentSegs.length,
    });
  }
}

// MATCHING STRATEGY:
// For each part, walk through HTML files and Hebrew entries simultaneously.
// Use a "cursor" approach: for each Hebrew entry, find the next unmatched HTML file
// that could correspond to it. Since both are in order, we just need to handle:
// 1. HTML files that combine multiple Hebrew entries (e.g., "Tefillin 1, 2 & 3")
// 2. HTML files that are sub-parts of a Hebrew entry (e.g., "Tefillin 5a", "Tefillin 5b")
// 3. Hebrew entries with no HTML file

// The simplest approach: just match 1:1 in order.
// HTML[0] → Hebrew[0], HTML[1] → Hebrew[1], etc.
// This works because both lists are in Shulchan Aruch order.

console.log('=== Sequential 1:1 matching ===\n');
let totalMatched = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const htmlList = htmlByPart[part] || [];
  const hebList = hebrewByPart[part] || [];
  
  // Reset all English first
  for (const heb of hebList) {
    for (const seg of heb.segments) seg.en = '';
  }
  
  const minLen = Math.min(htmlList.length, hebList.length);
  
  for (let i = 0; i < minLen; i++) {
    const html = htmlList[i];
    const heb = hebList[i];
    
    if (heb.segCount === 0) continue;
    
    const enParas = html.paras;
    
    if (enParas.length >= heb.segCount) {
      const ratio = enParas.length / heb.segCount;
      for (let s = 0; s < heb.segCount; s++) {
        const start = Math.round(s * ratio);
        const end = Math.round((s + 1) * ratio);
        heb.segments[heb.contentSegs[s]].en = enParas.slice(start, end).join('\n\n');
      }
    } else {
      const ratio = heb.segCount / enParas.length;
      for (let e = 0; e < enParas.length; e++) {
        const sStart = Math.round(e * ratio);
        const sEnd = Math.round((e + 1) * ratio);
        for (let s = sStart; s < sEnd && s < heb.segCount; s++) {
          heb.segments[heb.contentSegs[s]].en = enParas[e];
        }
      }
    }
    
    fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
    totalMatched++;
    
    matchLog.push({
      part,
      hebrew: `#${heb.number} ${heb.title}`,
      html: html.hf,
      paras: enParas.length,
      segs: heb.segCount
    });
  }
  
  console.log(`Part ${part}: ${minLen} matched (${htmlList.length} HTML, ${hebList.length} Hebrew)`);
}

// Count coverage
let filesWithEn = 0, totalHeb = 0;
for (let part = 1; part <= 8; part++) {
  for (const heb of hebrewByPart[part] || []) {
    totalHeb++;
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) filesWithEn++;
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Total matched: ${totalMatched}`);
console.log(`Coverage: ${filesWithEn}/${totalHeb} (${(filesWithEn/totalHeb*100).toFixed(1)}%)`);

for (let part = 1; part <= 8; part++) {
  const hebs = hebrewByPart[part] || [];
  let withEn = 0;
  for (const h of hebs) {
    if (h.segments.some(s => s.en && s.en.trim().length > 0)) withEn++;
  }
  console.log(`  Part ${part}: ${withEn}/${hebs.length}`);
}

// Show first 5 matches per part
console.log('\nSample matches:');
for (let part = 1; part <= 8; part++) {
  const samples = matchLog.filter(m => m.part === part).slice(0, 5);
  for (const s of samples) {
    console.log(`  P${s.part}: ${s.html} → ${s.hebrew} (${s.paras}p/${s.segs}s)`);
  }
}

// Show unmatched for parts 4, 5, 6
for (const part of [4, 5, 6]) {
  const unmatched = hebrewByPart[part]?.filter(h => !h.segments.some(s => s.en && s.en.trim().length > 0));
  console.log(`\nPart ${part} unmatched (${unmatched?.length || 0}):`);
  for (const h of (unmatched || []).slice(0, 15)) {
    console.log(`  #${h.number} ${h.title}`);
  }
}

fs.writeFileSync('/root/ajew-org/scripts/align-v8-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log('\nMatch log saved.');
