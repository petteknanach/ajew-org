#!/usr/bin/env node
/**
 * Match HTML to Hebrew using LM (Likutay Moharan) references as anchors.
 * 
 * Strategy:
 * 1. For each HTML file, extract all LM references
 * 2. For each Hebrew file, extract all LM references from its segments
 * 3. Match based on shared LM references
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

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

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractLMRefs(text) {
  const refs = new Set();
  const regex = /(?:LM|Likutay Moharan)\s*([IV]+):(\d+)/gi;
  let m;
  while ((m = regex.exec(text)) !== null) {
    refs.add(`${m[1]}:${m[2]}`);
  }
  return refs;
}

// Step 1: Index Hebrew files by their LM references
console.log('Step 1: Indexing Hebrew files by LM references...');
const hebrewByLM = {};  // "I:56" -> [{title, part, filePath}]

for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of (idx.torahs || [])) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    
    // Extract LM references from all text fields
    const allText = segments.map(s => `${s.he || ''} ${s.he_nikud || ''} ${s.en || ''}`).join(' ');
    const lmRefs = extractLMRefs(allText);
    
    for (const ref of lmRefs) {
      if (!hebrewByLM[ref]) hebrewByLM[ref] = [];
      hebrewByLM[ref].push({
        title: t.hebrewTitle || t.title || '',
        part,
        number: t.number,
        filePath
      });
    }
  }
}

const uniqueRefs = Object.keys(hebrewByLM).length;
const totalHebrewLM = Object.values(hebrewByLM).reduce((s, a) => s + a.length, 0);
console.log(`  Found ${uniqueRefs} unique LM refs across ${totalHe Hebrew LM} Hebrew files`);

// Step 2: Process HTML files and match by LM refs
console.log('\nStep 2: Processing HTML files...');
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

let totalHTML = 0;
let matched = 0;
let totalAligned = 0;

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of htmlFiles) {
    totalHTML++;
    const htmlPath = path.join(volDir, hf);
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract LM refs from HTML
    const htmlLMRefs = extractLMRefs(content);
    
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
    
    // Find Hebrew files that share LM refs
    const candidateScores = {};  // filePath -> score
    
    for (const ref of htmlLMRefs) {
      const hebrewMatches = hebrewByLM[ref] || [];
      for (const hm of hebrewMatches) {
        if (!candidateScores[hm.filePath]) {
          candidateScores[hm.filePath] = { ...hm, score: 0 };
        }
        candidateScores[hm.filePath].score++;
      }
    }
    
    // Find best match
    const candidates = Object.values(candidateScores).sort((a, b) => b.score - a.score);
    
    if (candidates.length > 0 && candidates[0].score >= 2) {
      // At least 2 shared LM refs - strong match
      const best = candidates[0];
      
      const heData = JSON.parse(fs.readFileSync(best.filePath, 'utf8'));
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
      fs.writeFileSync(best.filePath, JSON.stringify(heData, null, 2), 'utf8');
      
      matched++;
      totalAligned += enIdx;
    }
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Total HTML files: ${totalHTML}`);
console.log(`Matched (via LM refs): ${matched}`);
console.log(`Total aligned segments: ${totalAligned}`);
