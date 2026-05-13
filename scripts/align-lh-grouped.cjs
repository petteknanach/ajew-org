#!/usr/bin/env node
/**
 * Correct LH English alignment.
 * 
 * Key insight: HTML files are split by section (e.g., "Halacha 5 Part A: §1-8"),
 * while Hebrew files contain the ENTIRE halacha. We need to:
 * 1. Group HTML files by their base halacha name
 * 2. Concatenate paragraphs in order
 * 3. Match to Hebrew file by total paragraph count
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

// Extract halacha name and part info from HTML title
function parseHTMLTitle(title) {
  // Patterns:
  // "Hilchos Tefillin – Halacha 5 (Part A: §1–8)" -> { name: "Tefillin", halacha: "5", part: "A" }
  // "Hilchos Bais HaK'nesses – Halacha 6A (§1–7)" -> { name: "Bais HaKneses", halacha: "6", part: "A" }
  // "Likutay Halachos — Hilchos Hashkamas HaBoker, Halachos 2–3" -> { name: "Hashkamas HaBoker", halacha: "2-3", part: null }
  
  let name = '', halacha = '', part = null;
  
  // Remove "Likutay Halachos –" prefix
  let t = title.replace(/^Likutay Halachos\s*[—–-]\s*/i, '');
  
  // Extract Hilchos name
  const hilchosMatch = t.match(/Hilchos\s+([A-Za-z\s']+?)(?:\s*[,-]|\s*$)/i);
  if (hilchosMatch) {
    name = hilchosMatch[1].trim();
  }
  
  // Extract halacha number
  const halachaMatch = t.match(/Halacha\s+(\d+[a-z]?)/i) || t.match(/Halachos\s+(\d+[a-z]?(?:\s*[–-]\s*\d+[a-z]?)?)/i);
  if (halachaMatch) {
    halacha = halachaMatch[1].trim();
  }
  
  // Extract part letter
  const partMatch = t.match(/Part\s+([A-Z])/i);
  if (partMatch) {
    part = partMatch[1].toUpperCase();
  } else if (/(\d)[a-z]\s*[-(]/i.test(t)) {
    // e.g., "6A" -> part A
    const letterMatch = t.match(/(\d)([a-z])\s*[-(]/i);
    if (letterMatch) part = letterMatch[2].toUpperCase();
  }
  
  return { name, halacha, part };
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

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? decodeHTML(titleMatch[1]).trim() : '';
}

// Load Hebrew index
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

// ---- MAIN ----
console.log('Loading Hebrew index...');
const hebrewIndex = loadHebrewIndex();

// Collect and group HTML files by halacha
console.log('\nScanning and grouping HTML files...');
const htmlGroups = {};  // "part/name/halacha" -> [{part, paragraphs, htmlPath}]

const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

let totalHTML = 0;

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of files) {
    totalHTML++;
    const htmlPath = path.join(volDir, hf);
    const title = extractTitle(htmlPath);
    const { name, halacha, part: partLetter } = parseHTMLTitle(title);
    
    if (!name || !halacha) continue;
    
    const paragraphs = extractParagraphs(htmlPath);
    if (paragraphs.length === 0) continue;
    
    // Group key: "name/halacha" (e.g., "Tefillin/5")
    const groupKey = `${part}/${name.toLowerCase()}/${halacha.toLowerCase()}`;
    
    if (!htmlGroups[groupKey]) htmlGroups[groupKey] = [];
    htmlGroups[groupKey].push({ partLetter, paragraphs, htmlPath, vol });
  }
}

console.log(`  ${totalHTML} HTML files`);
console.log(`  ${Object.keys(htmlGroups).length} halacha groups`);

// For each group, concatenate paragraphs in order
console.log('\nConcatenating HTML parts...');
const concatenatedHTML = [];

for (const [groupKey, files] of Object.entries(htmlGroups)) {
  // Sort by part letter (A, B, C...) or by filename
  files.sort((a, b) => {
    if (a.partLetter && b.partLetter) return a.partLetter.localeCompare(b.partLetter);
    return a.htmlPath.localeCompare(b.htmlPath);
  });
  
  const allParagraphs = [];
  for (const f of files) {
    allParagraphs.push(...f.paragraphs);
  }
  
  const [partStr, name, halacha] = groupKey.split('/');
  const part = parseInt(partStr);
  
  concatenatedHTML.push({
    groupKey,
    name,
    halacha,
    part,
    paragraphs: allParagraphs,
    fileCount: files.length,
    sources: files.map(f => `${path.basename(path.dirname(f.htmlPath))}/${path.basename(f.htmlPath)}`)
  });
}

console.log(`  ${concatenatedHTML.length} concatenated groups`);

// Now match by count
console.log('\nMatching by count...');
let totalMatched = 0;
let totalAligned = 0;
const matchLog = [];
const htmlMatched = new Set();

// Multi-pass: unique count matching with elimination
let lastMatched = -1;
let pass = 0;

while (lastMatched !== totalMatched) {
  lastMatched = totalMatched;
  pass++;
  let passMatched = 0;
  
  for (const html of concatenatedHTML) {
    if (htmlMatched.has(html.groupKey)) continue;
    
    const candidates = (hebrewIndex[html.part][html.paragraphs.length] || []).filter(h => !h.matched);
    
    if (candidates.length === 1) {
      const cand = candidates[0];
      cand.matched = true;
      htmlMatched.add(html.groupKey);
      
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
      matchLog.push({
        html: html.sources[0],
        hebrew: cand.title,
        paras: html.paragraphs.length,
        segs: enIdx,
        files: html.fileCount
      });
    }
  }
  
  console.log(`  Pass ${pass}: matched ${passMatched} (total: ${totalMatched})`);
}

// Results
const remaining = concatenatedHTML.filter(h => !htmlMatched.has(h.groupKey));
const remainingHebrew = Object.values(hebrewIndex)
  .flatMap(p => Object.values(p))
  .reduce((s, a) => s + a.filter(h => !h.matched).length, 0);

console.log(`\n=== RESULTS ===`);
console.log(`Matched: ${totalMatched} / ${concatenatedHTML.length} halacha groups`);
console.log(`Remaining groups: ${remaining.length}`);
console.log(`Remaining Hebrew: ${remainingHebrew}`);
console.log(`Total aligned segments: ${totalAligned}`);

// Show matched samples
console.log(`\nFirst 30 matches:`);
for (const m of matchLog.slice(0, 30)) {
  console.log(`  ${m.html} -> ${m.hebrew} (${m.paras}p/${m.segs}s, ${m.files} files)`);
}

// Show remaining
if (remaining.length > 0) {
  console.log(`\nRemaining unmatched (first 50):`);
  for (const r of remaining.slice(0, 50)) {
    const candidates = (hebrewIndex[r.part][r.paragraphs.length] || []).filter(h => !h.matched);
    console.log(`  ${r.groupKey}: ${r.paragraphs.length} paras, ${candidates.length} candidates [${r.sources[0]}]`);
  }
  if (remaining.length > 50) console.log(`  ... and ${remaining.length - 50} more`);
}

fs.writeFileSync('/root/ajew-org/scripts/alignment-match-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log(`\nMatch log saved.`);
