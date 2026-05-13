#!/usr/bin/env node
/**
 * Final approach: Match HTML to Hebrew by process of elimination using ALL available signals.
 * 
 * Signals (in priority order):
 * 1. LM reference matching (already done - 57 matched)
 * 2. Paragraph count matching within part (unique counts)
 * 3. Section count matching (§ markers in HTML vs אות markers in Hebrew)
 * 4. Positional matching (fallback)
 * 
 * After pass 1 (LM refs), use process of elimination for remaining files.
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

function extractAllText(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  let text = content.replace(/<[^>]+>/g, ' ');
  text = decodeHTML(text).replace(/\s+/g, ' ').trim();
  return text;
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

function extractRefs(text) {
  const refs = new Set();
  const lmRegex = /Likutay\s+Moharan\s+([IV]+):(\d+)/gi;
  let m;
  while ((m = lmRegex.exec(text)) !== null) {
    refs.add(`LM:${m[1]}:${m[2]}`);
  }
  const shortRegex = /LM\s+([IV]+):(\d+)/gi;
  while ((m = shortRegex.exec(text)) !== null) {
    refs.add(`LM:${m[1]}:${m[2]}`);
  }
  return refs;
}

function countSections(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const sections = content.match(/<h[23][^>]*>.*?§\d+.*?<\/h[23]>/gi) || [];
  return sections.length;
}

// Build comprehensive HTML index
console.log('=== Building HTML index ===\n');
const htmlFiles = [];

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
    const text = extractAllText(htmlPath);
    const refs = extractRefs(text);
    const paragraphs = extractParagraphs(htmlPath);
    const sections = countSections(htmlPath);
    
    if (paragraphs.length === 0) continue;
    
    htmlFiles.push({
      vol, hf, part, htmlPath,
      paragraphs, refs, sections,
      text: text.substring(0, 500), // first 500 chars for content matching
      matched: false
    });
  }
}

console.log(`${htmlFiles.length} HTML files`);

// Build Hebrew index
console.log('\n=== Building Hebrew index ===\n');
const hebrewFiles = [];

for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of (idx.torahs || [])) {
    const title = t.hebrewTitle || t.title || '';
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    
    let allText = '';
    let oisCount = 0;
    const contentSegs = [];
    
    for (let i = 0; i < segments.length; i++) {
      const he = (segments[i].he || segments[i].he_nikud || '').trim();
      allText += ' ' + he;
      if (he.length === 0) continue;
      if (/^אות\s/.test(he) && he.length < 10) { oisCount++; continue; }
      if (/^הלכה\s/.test(he) && he.length < 15) continue;
      if (/^סימן\s/.test(he) && he.length < 15) continue;
      if (he.length < 8) continue;
      contentSegs.push(i);
    }
    
    const refs = extractRefs(allText);
    
    hebrewFiles.push({
      title,
      part,
      number: t.number,
      filePath,
      segments,
      contentSegs,
      segCount: contentSegs.length,
      oisCount,
      refs,
      matched: false
    });
  }
}

console.log(`${hebrewFiles.length} Hebrew files`);

// === PASS 1: Match by LM references ===
console.log('\n=== PASS 1: LM Reference matching ===\n');

// Index HTML by part -> refs
const htmlByPartRefs = {};
for (const hf of htmlFiles) {
  if (hf.refs.size === 0) continue;
  if (!htmlByPartRefs[hf.part]) htmlByPartRefs[hf.part] = {};
  for (const ref of hf.refs) {
    if (!htmlByPartRefs[hf.part][ref]) htmlByPartRefs[hf.part][ref] = [];
    htmlByPartRefs[hf.part][ref].push(hf);
  }
}

let totalMatched = 0;
let totalAligned = 0;
const matchLog = [];

for (const heb of hebrewFiles) {
  if (heb.matched || heb.refs.size === 0) continue;
  
  const candidates = {};
  for (const ref of heb.refs) {
    const htmlMatches = htmlByPartRefs[heb.part]?.[ref] || [];
    for (const html of htmlMatches) {
      if (html.matched) continue;
      if (!candidates[html.htmlPath]) candidates[html.htmlPath] = { html, score: 0 };
      candidates[html.htmlPath].score++;
    }
  }
  
  const sorted = Object.values(candidates).sort((a, b) => b.score - a.score);
  
  if (sorted.length > 0 && sorted[0].score >= 2) {
    const best = sorted[0];
    best.html.matched = true;
    heb.matched = true;
    
    alignEnglish(heb, best.html);
    
    totalMatched++;
    totalAligned += heb.segCount;
    matchLog.push({ method: 'LM-ref', part: heb.part, html: best.html.hf, hebrew: heb.title, paras: best.html.paragraphs.length, segs: heb.segCount, refs: best.score });
  }
}

console.log(`Pass 1: ${totalMatched} matched`);

// === PASS 2: Match by unique (part + paragraph count) ===
console.log('\n=== PASS 2: Paragraph count matching ===\n');

let pass2Matched = 0;
let lastPass2 = -1;

while (lastPass2 !== pass2Matched) {
  lastPass2 = pass2Matched;
  
  for (const heb of hebrewFiles) {
    if (heb.matched) continue;
    
    const candidates = htmlFiles.filter(h => !h.matched && h.part === heb.part && h.paragraphs.length === heb.segCount);
    
    if (candidates.length === 1) {
      const html = candidates[0];
      html.matched = true;
      heb.matched = true;
      
      alignEnglish(heb, html);
      
      totalMatched++;
      totalAligned += heb.segCount;
      pass2Matched++;
      matchLog.push({ method: 'count', part: heb.part, html: html.hf, hebrew: heb.title, paras: html.paragraphs.length, segs: heb.segCount, refs: 0 });
    }
  }
}

console.log(`Pass 2: ${pass2Matched} matched (total: ${totalMatched})`);

// === PASS 3: Positional matching for remaining ===
console.log('\n=== PASS 3: Positional matching ===\n');

// For each part, match remaining HTML to Hebrew by order
let pass3Matched = 0;

for (let part = 1; part <= 8; part++) {
  const remainingHTML = htmlFiles.filter(h => !h.matched && h.part === part).sort((a, b) => a.hf.localeCompare(b.hf));
  const remainingHeb = hebrewFiles.filter(h => !h.matched && h.part === part);
  
  const minLen = Math.min(remainingHTML.length, remainingHeb.length);
  
  for (let i = 0; i < minLen; i++) {
    const html = remainingHTML[i];
    const heb = remainingHeb[i];
    
    html.matched = true;
    heb.matched = true;
    
    alignEnglish(heb, html);
    
    totalMatched++;
    totalAligned += heb.segCount;
    pass3Matched++;
    matchLog.push({ method: 'position', part, html: html.hf, hebrew: heb.title, paras: html.paragraphs.length, segs: heb.segCount, refs: 0 });
  }
  
  if (remainingHTML.length !== remainingHeb.length) {
    console.log(`  Part ${part}: ${remainingHTML.length} HTML vs ${remainingHeb.length} Hebrew (matched ${minLen})`);
  }
}

console.log(`Pass 3: ${pass3Matched} matched (total: ${totalMatched})`);

// === RESULTS ===
const unmatched = hebrewFiles.filter(h => !h.matched).length;

console.log(`\n=== FINAL RESULTS ===`);
console.log(`Total matched: ${totalMatched} / ${hebrewFiles.length} Hebrew files`);
console.log(`Unmatched: ${unmatched}`);
console.log(`Total aligned segments: ${totalAligned}`);

// Show method breakdown
const byMethod = {};
for (const m of matchLog) {
  if (!byMethod[m.method]) byMethod[m.method] = 0;
  byMethod[m.method]++;
}
console.log('\nBy method:');
for (const [method, count] of Object.entries(byMethod)) {
  console.log(`  ${method}: ${count}`);
}

// Show some matches
console.log('\nFirst 20 matches:');
for (const m of matchLog.slice(0, 20)) {
  console.log(`  [${m.method}] Part ${m.part}: ${m.html} -> ${m.hebrew} (${m.paras}p/${m.segs}s, ${m.refs} refs)`);
}

fs.writeFileSync('/root/ajew-org/scripts/alignment-match-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log('\nMatch log saved.');

// Helper function
function alignEnglish(heb, html) {
  for (const seg of heb.segments) {
    seg.en = '';
  }
  
  const enParas = html.paragraphs;
  const segCount = heb.contentSegs.length;
  
  if (segCount === 0) return;
  
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
      const start = Math.round(e * ratio);
      const end = Math.round((e + 1) * ratio);
      for (let s = start; s < end && s < segCount; s++) {
        heb.segments[heb.contentSegs[s]].en = enParas[e];
      }
    }
  }
  
  fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
}
