#!/usr/bin/env node
/**
 * Multi-pass LH English alignment - optimized.
 * Pre-computes all HTML data, then matches by unique count + elimination.
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

// Load Hebrew index: part -> count -> [files]
function loadHebrewIndex() {
  const byPartCount = {};
  for (let part = 1; part <= 8; part++) {
    byPartCount[part] = {};
    const pdir = path.join(LH_BASE, `part-${part}`);
    const idxFile = path.join(pdir, 'index.json');
    if (!fs.existsSync(idxFile)) continue;
    const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    
    for (const t of (idx.torahs || [])) {
      const title = t.hebrewTitle || t.title || '';
      const filePath = path.join(pdir, `torah-${t.number}.json`);
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
      
      if (!byPartCount[part][count]) byPartCount[part][count] = [];
      byPartCount[part][count].push({
        title, part, number: t.number, filePath,
        segCount: count, matched: false
      });
    }
  }
  return byPartCount;
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
    if (text.length >= 20 &&
        !/^Likutay Halachos$/i.test(text) &&
        !/^(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[–—-]?\s*Volume/i.test(text)) {
      paragraphs.push(text);
    }
  }
  return paragraphs;
}

// ---- MAIN ----
console.log('Loading Hebrew index...');
const hebrewIndex = loadHebrewIndex();
const totalHebrew = Object.values(hebrewIndex)
  .reduce((s, p) => s + Object.values(p).reduce((s2, a) => s2 + a.length, 0), 0);
console.log(`  ${totalHebrew} Hebrew files indexed`);

// Pre-compute all HTML data
console.log('\nScanning HTML files...');
const htmlData = [];
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of files) {
    const htmlPath = path.join(volDir, hf);
    const paragraphs = extractParagraphs(htmlPath);
    if (paragraphs.length > 0) {
      htmlData.push({ vol, hf, part, htmlPath, paragraphs, matched: false });
    }
  }
}
console.log(`  ${htmlData.length} HTML files with content`);

// Multi-pass matching
let totalMatched = 0;
let totalAligned = 0;
let pass = 0;
const matchLog = [];

while (true) {
  pass++;
  let passMatched = 0;
  
  for (const html of htmlData) {
    if (html.matched) continue;
    
    const candidates = (hebrewIndex[html.part][html.paragraphs.length] || []).filter(h => !h.matched);
    
    if (candidates.length === 1) {
      const cand = candidates[0];
      cand.matched = true;
      html.matched = true;
      
      const heData = JSON.parse(fs.readFileSync(cand.filePath, 'utf8'));
      const segments = heData.segments || [];
      
      let enIdx = 0;
      for (let i = 0; i < segments.length && enIdx < html.paragraphs.length; i++) {
        const he = (segments[i].he || segments[i].he_nikud || '').trim();
        if (he.length === 0) continue;
        if (/^אות\s/.test(he) && he.length < 10) continue;
        if (/^הלכה\s/.test(he) && he.length < 15) continue;
        if (/^סימן\s/.test(he) && he.length < 15) continue;
        if (he.length < 8) continue;
        
        segments[i].en = html.paragraphs[enIdx];
        enIdx++;
      }
      
      heData.hasEnglish = true;
      fs.writeFileSync(cand.filePath, JSON.stringify(heData, null, 2), 'utf8');
      
      totalMatched++;
      passMatched++;
      totalAligned += enIdx;
      matchLog.push({ html: `${path.basename(path.dirname(html.htmlPath))}/${html.hf}`, hebrew: cand.title, paras: html.paragraphs.length, segs: enIdx });
    }
  }
  
  console.log(`Pass ${pass}: matched ${passMatched} (total: ${totalMatched})`);
  if (passMatched === 0) break;
}

// Results
const remainingHTML = htmlData.filter(h => !h.matched);
const remainingHebrew = Object.values(hebrewIndex)
  .flatMap(p => Object.values(p))
  .reduce((s, a) => s + a.filter(h => !h.matched).length, 0);

console.log(`\n=== RESULTS ===`);
console.log(`Matched: ${totalMatched} / ${htmlData.length} HTML files`);
console.log(`Remaining HTML: ${remainingHTML.length}`);
console.log(`Remaining Hebrew: ${remainingHebrew}`);
console.log(`Total aligned segments: ${totalAligned}`);

// Show first 30 matched
console.log(`\nFirst 30 matches:`);
for (const m of matchLog.slice(0, 30)) {
  console.log(`  ${m.html} -> ${m.hebrew} (${m.paras}p/${m.segs}s)`);
}

// Show remaining unmatched HTML
if (remainingHTML.length > 0) {
  console.log(`\nUnmatched HTML files (first 50):`);
  for (const h of remainingHTML.slice(0, 50)) {
    const candidates = (hebrewIndex[h.part][h.paragraphs.length] || []).filter(x => !x.matched);
    console.log(`  ${path.basename(path.dirname(h.htmlPath))}/${h.hf}: ${h.paragraphs.length} paras, ${candidates.length} candidates`);
  }
  if (remainingHTML.length > 50) console.log(`  ... and ${remainingHTML.length - 50} more`);
}

// Save match log
fs.writeFileSync('/root/ajew-org/scripts/alignment-match-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log(`\nMatch log saved to scripts/alignment-match-log.json`);
