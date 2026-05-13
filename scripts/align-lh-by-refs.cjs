#!/usr/bin/env node
/**
 * Final LH English alignment using CONTENT-BASED matching.
 * 
 * For each Hebrew file:
 * 1. Get the first content segment's Hebrew text
 * 2. Search all HTML files in the same part for that text (or a portion of it)
 * 3. If found, that's our match
 * 
 * This is reliable because the HTML is a translation of the Hebrew.
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

// Get the first meaningful Hebrew segment text
function getFirstHebrewText(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segments = data.segments || [];
  
  for (const seg of segments) {
    const he = (seg.he || seg.he_nikud || '').trim();
    if (he.length === 0) continue;
    if (/^אות\s/.test(he) && he.length < 10) continue;
    if (/^הלכה\s/.test(he) && he.length < 15) continue;
    if (/^סימן\s/.test(he) && he.length < 15) continue;
    if (he.length < 8) continue;
    return he;
  }
  return null;
}

// Check if any English word from the Hebrew text appears in the HTML
// Actually, since it's a translation, the HTML will have English words
// that correspond to the Hebrew. We can't match Hebrew characters in English text.
// 
// Instead, let's use the REFERENCE citations in the HTML (LM I:XXX etc.)
// and check if the Hebrew file has the same references.

// Better approach: use the HTML filename to extract the halacha name,
// then use a mapping table to find the Hebrew file.

// ACTUALLY - the simplest approach: just use the LM references!
// The HTML files contain references like "LM I:8" in their text.
// The Hebrew files also contain these references in their text.
// We can match by finding common LM references.

function extractRefs(text) {
  const refs = new Set();
  // LM references
  const lmRegex = /Likutay\s+Moharan\s+([IV]+):(\d+)/gi;
  let m;
  while ((m = lmRegex.exec(text)) !== null) {
    refs.add(`LM:${m[1]}:${m[2]}`);
  }
  // Also try short form
  const shortRegex = /LM\s+([IV]+):(\d+)/gi;
  while ((m = shortRegex.exec(text)) !== null) {
    refs.add(`LM:${m[1]}:${m[2]}`);
  }
  return refs;
}

// Build HTML index with refs
console.log('Building HTML index with LM references...');
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
    
    if (paragraphs.length === 0) continue;
    
    htmlFiles.push({
      vol, hf, part, htmlPath,
      paragraphs,
      refs,
      refCount: refs.size
    });
  }
}

console.log(`  ${htmlFiles.length} HTML files`);

// Build Hebrew index with refs
console.log('Building Hebrew index with LM references...');
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
    
    // Extract all text and refs
    let allText = '';
    for (const seg of segments) {
      allText += ' ' + (seg.he || '') + ' ' + (seg.he_nikud || '') + ' ' + (seg.en || '');
    }
    const refs = extractRefs(allText);
    
    // Get content segments
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
    
    hebrewFiles.push({
      title,
      part,
      number: t.number,
      filePath,
      segments,
      contentSegs,
      segCount: contentSegs.length,
      refs,
      refCount: refs.size
    });
  }
}

console.log(`  ${hebrewFiles.length} Hebrew files`);

// Match by shared LM references
console.log('\nMatching by LM references...');

// Build HTML index by part -> refs -> files
const htmlByPartRefs = {};
for (const hf of htmlFiles) {
  if (!htmlByPartRefs[hf.part]) htmlByPartRefs[hf.part] = {};
  for (const ref of hf.refs) {
    if (!htmlByPartRefs[hf.part][ref]) htmlByPartRefs[hf.part][ref] = [];
    htmlByPartRefs[hf.part][ref].push(hf);
  }
}

let totalMatched = 0;
let totalAligned = 0;
const matchLog = [];
const usedHTML = new Set();

for (const heb of hebrewFiles) {
  if (heb.refCount === 0) continue;
  
  // Find HTML files that share LM refs with this Hebrew file
  const candidateScores = {};
  
  for (const ref of heb.refs) {
    const htmlMatches = htmlByPartRefs[heb.part]?.[ref] || [];
    for (const html of htmlMatches) {
      if (usedHTML.has(html.htmlPath)) continue;
      if (!candidateScores[html.htmlPath]) {
        candidateScores[html.htmlPath] = { html, score: 0, sharedRefs: [] };
      }
      candidateScores[html.htmlPath].score++;
      candidateScores[html.htmlPath].sharedRefs.push(ref);
    }
  }
  
  // Find best candidate
  const candidates = Object.values(candidateScores).sort((a, b) => b.score - a.score);
  
  if (candidates.length > 0 && candidates[0].score >= 2) {
    const best = candidates[0];
    usedHTML.add(best.html.htmlPath);
    
    // Align
    for (const seg of heb.segments) {
      seg.en = '';
    }
    
    const enParas = best.html.paragraphs;
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
        const start = Math.round(e * ratio);
        const end = Math.round((e + 1) * ratio);
        for (let s = start; s < end && s < segCount; s++) {
          heb.segments[heb.contentSegs[s]].en = enParas[e];
        }
      }
    }
    
    fs.writeFileSync(heb.filePath, JSON.stringify({ ...heb, hasEnglish: true }, null, 2), 'utf8');
    
    totalMatched++;
    totalAligned += segCount;
    
    matchLog.push({
      part: heb.part,
      html: `${path.basename(path.dirname(best.html.htmlPath))}/${best.html.hf}`,
      hebrew: heb.title,
      htmlParas: enParas.length,
      hebSegs: segCount,
      sharedRefs: best.score
    });
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Matched: ${totalMatched} Hebrew files`);
console.log(`Total aligned segments: ${totalAligned}`);

// Show matches
console.log(`\nMatches (first 30):`);
for (const m of matchLog.slice(0, 30)) {
  console.log(`  Part ${m.part}: ${m.html} -> ${m.hebrew} (${m.htmlParas}p/${m.hebSegs}s, ${m.sharedRefs} refs)`);
}

// Show unmatched count
const unmatched = hebrewFiles.filter(h => !matchLog.find(m => m.hebrew === h.title && m.part === h.part));
console.log(`\nUnmatched Hebrew files: ${unmatched.length}`);
