#!/usr/bin/env node
/**
 * Smart LH alignment using HTML headers + process of elimination.
 * 
 * Strategy:
 * 1. Parse HTML files to extract their section structure and paragraph count
 * 2. For each HTML file, find the Hebrew file with the same part + closest segment count
 * 3. Use process of elimination: once a match is made, remove that Hebrew file from the pool
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

function getContentSegments(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segments = data.segments || [];
  const contentSegs = [];
  for (const seg of segments) {
    const he = (seg.he || seg.he_nikud || '').trim();
    if (he.length === 0) continue;
    if (/^אות\s/.test(he) && he.length < 10) continue;
    if (/^הלכה\s/.test(he) && he.length < 15) continue;
    if (/^סימן\s/.test(he) && he.length < 15) continue;
    if (he.length < 8) continue;
    contentSegs.push(he);
  }
  return contentSegs;
}

function extractHTMLData(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract title
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1]).trim() : '';
  
  // Extract H1
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const h1 = h1Match ? decodeHTML(h1Match[1].replace(/<[^>]+>/g, '')).trim() : '';
  
  // Extract section headers (§N)
  const sections = [];
  const sRegex = /<h[23][^>]*>.*?§(\d+[a-z]?).*?<\/h[23]>/gi;
  let m;
  while ((m = sRegex.exec(content)) !== null) {
    sections.push(m[1]);
  }
  
  // Extract paragraphs
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
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
  
  return { title, h1, sections, paragraphs };
}

// Build Hebrew index by part
const hebrewByPart = {};
for (let part = 1; part <= 8; part++) {
  hebrewByPart[part] = [];
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of (idx.torahs || [])) {
    const title = t.hebrewTitle || t.title || '';
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const contentSegs = getContentSegments(filePath);
    
    hebrewByPart[part].push({
      title,
      part,
      number: t.number,
      filePath,
      segCount: contentSegs.length,
      matched: false
    });
  }
}

// Process HTML files
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

let totalHTML = 0;
let matched = 0;
let multiCandidates = 0;
let noCandidates = 0;
let totalAligned = 0;
const matchLog = [];

const htmlFiles = [];
for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  for (const hf of files) {
    htmlFiles.push({ vol, volDir, hf, part });
  }
}

// First pass: match unique count candidates
for (const { vol, volDir, hf, part } of htmlFiles) {
  totalHTML++;
  const htmlPath = path.join(volDir, hf);
  const { title, h1, sections, paragraphs } = extractHTMLData(htmlPath);
  
  if (paragraphs.length === 0) continue;
  
  // Find unmatched Hebrew files in this part with exactly this paragraph count
  const candidates = hebrewByPart[part].filter(h => !h.matched && h.segCount === paragraphs.length);
  
  if (candidates.length === 1) {
    const cand = candidates[0];
    cand.matched = true;
    
    // Load and align
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
    matchLog.push({ html: hf, hebrew: cand.title, paras: paragraphs.length, segs: enIdx, method: 'unique' });
  } else if (candidates.length > 1) {
    multiCandidates++;
  } else {
    noCandidates++;
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Total HTML files: ${totalHTML}`);
console.log(`Matched (unique count): ${matched}`);
console.log(`Multiple candidates: ${multiCandidates}`);
console.log(`No candidates: ${noCandidates}`);
console.log(`Total aligned segments: ${totalAligned}`);

// Show matched samples
console.log(`\nFirst 20 matches:`);
for (const m of matchLog.slice(0, 20)) {
  console.log(`  ${m.html} -> ${m.hebrew} (${m.paras} paras, ${m.segs} segs)`);
}
