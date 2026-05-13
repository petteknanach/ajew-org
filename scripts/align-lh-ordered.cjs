#!/usr/bin/env node
/**
 * Final working LH alignment.
 * 
 * Match HTML groups to Hebrew files by ORDER within each part.
 * Both are sorted by halacha name, so positional matching works.
 * 
 * For each match:
 * 1. Concatenate HTML paragraphs from all files in the group
 * 2. Distribute proportionally to Hebrew content segments
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

function parseHTMLTitle(title) {
  let t = title;
  
  // Skip volume-level files
  if (/^Likutay Halachos\s*[—–-]\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)/i.test(t)) {
    return null;
  }
  
  // Remove prefix
  t = t.replace(/^Likutay Halachos\s*[—–-\s]+\s*/i, '');
  t = t.replace(/^(?:Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[—–-]\s*/i, '');
  
  let name = '';
  const namePatterns = [
    /Hilchos\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]|\s*Halacha|\s*$)/i,
    /Laws\s+of\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]|\s*[,(]|\s*$)/i,
  ];
  for (const p of namePatterns) {
    const m = t.match(p);
    if (m) { name = m[1].trim(); break; }
  }
  
  let halacha = '';
  const wordNums = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
  const hMatch = t.match(/Halacha[s]?\s+(\d+[a-z]?)/i);
  if (hMatch) {
    halacha = hMatch[1];
  } else {
    const wMatch = t.match(/Halacha[s]?\s+(\w+)/i);
    if (wMatch) {
      const word = wMatch[1].toLowerCase();
      halacha = wordNums[word] || word;
    }
  }
  
  let partLetter = '';
  const pMatch = t.match(/Part\s+([A-Z])/i);
  if (pMatch) partLetter = pMatch[1];
  
  if (!name) return null;
  return { name, halacha, partLetter };
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
        !/^(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[–—-]?\s*Volume/i(text)) {
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

// Build HTML groups by part
function buildHTMLGroups() {
  const byPart = {};
  
  const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
    return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
  });
  
  for (const vol of volumes) {
    const volDir = path.join(TRANSLATIONS_BASE, vol);
    const part = volToPart[vol];
    if (!part) continue;
    
    if (!byPart[part]) byPart[part] = {};
    
    const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
    
    for (const hf of files) {
      const htmlPath = path.join(volDir, hf);
      const title = extractTitle(htmlPath);
      const parsed = parseHTMLTitle(title);
      
      if (!parsed) continue;
      
      const paragraphs = extractParagraphs(htmlPath);
      if (paragraphs.length === 0) continue;
      
      // Group key: normalized name + halacha number
      const key = `${parsed.name.toLowerCase()}/${parsed.halacha}`;
      
      if (!byPart[part][key]) {
        byPart[part][key] = {
          name: parsed.name,
          halacha: parsed.halacha,
          paragraphs: [],
          sources: [],
          partLetters: []
        };
      }
      
      byPart[part][key].paragraphs.push(...paragraphs);
      byPart[part][key].sources.push(hf);
      if (parsed.partLetter) byPart[part][key].partLetters.push(parsed.partLetter);
    }
  }
  
  // Convert to sorted arrays
  const result = {};
  for (const [part, groups] of Object.entries(byPart)) {
    result[part] = Object.values(groups).sort((a, b) => {
      // Sort by name, then by halacha number
      const nameCmp = a.name.localeCompare(b.name);
      if (nameCmp !== 0) return nameCmp;
      return parseInt(a.halacha) - parseInt(b.halacha);
    });
  }
  
  return result;
}

// Build Hebrew index
function buildHebrewIndex() {
  const byPart = {};
  
  for (let part = 1; part <= 8; part++) {
    byPart[part] = [];
    const pdir = path.join(LH_BASE, `part-${part}`);
    const idxFile = path.join(pdir, 'index.json');
    if (!fs.existsSync(idxFile)) continue;
    const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    
    for (const t of (idx.torahs || [])) {
      const title = t.hebrewTitle || t.title || '';
      const filePath = path.join(pdir, `torah-${t.number}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const segments = data.segments || [];
      
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
      
      byPart[part].push({
        title,
        number: t.number,
        filePath,
        segments,
        contentSegs,
        segCount: contentSegs.length
      });
    }
  }
  
  return byPart;
}

// ---- MAIN ----
console.log('Building HTML groups...');
const htmlGroups = buildHTMLGroups();

console.log('Building Hebrew index...');
const hebrewIndex = buildHebrewIndex();

// Show counts
for (let part = 1; part <= 8; part++) {
  const hg = htmlGroups[part] || [];
  const hi = hebrewIndex[part] || [];
  console.log(`Part ${part}: ${hg.length} HTML groups, ${hi.length} Hebrew files`);
}

// Match by order within each part
console.log('\nMatching and aligning...');

let totalMatched = 0;
let totalAligned = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const hg = htmlGroups[part] || [];
  const hi = hebrewIndex[part] || [];
  
  const minLen = Math.min(hg.length, hi.length);
  
  for (let i = 0; i < minLen; i++) {
    const htmlGroup = hg[i];
    const hebFile = hi[i];
    
    // Clear old English
    for (const seg of hebFile.segments) {
      seg.en = '';
    }
    
    // Distribute English paragraphs proportionally
    const enParas = htmlGroup.paragraphs;
    const segCount = hebFile.contentSegs.length;
    
    if (segCount === 0) continue;
    
    if (enParas.length >= segCount) {
      // More English than segments - distribute evenly
      const ratio = enParas.length / segCount;
      for (let s = 0; s < segCount; s++) {
        const start = Math.round(s * ratio);
        const end = Math.round((s + 1) * ratio);
        hebFile.segments[hebFile.contentSegs[s]].en = enParas.slice(start, end).join('\n\n');
      }
    } else {
      // Fewer English than segments
      const ratio = segCount / enParas.length;
      for (let e = 0; e < enParas.length; e++) {
        const start = Math.round(e * ratio);
        const end = Math.round((e + 1) * ratio);
        for (let s = start; s < end && s < segCount; s++) {
          hebFile.segments[hebFile.contentSegs[s]].en = enParas[e];
        }
      }
    }
    
    hebFile.hasEnglish = true;
    fs.writeFileSync(hebFile.filePath, JSON.stringify(hebFile, null, 2), 'utf8');
    
    totalMatched++;
    totalAligned += segCount;
    
    matchLog.push({
      part,
      html: `${htmlGroup.name} ${htmlGroup.halacha}`,
      hebrew: hebFile.title,
      htmlParas: enParas.length,
      hebSegs: segCount,
      htmlFiles: htmlGroup.sources.length
    });
  }
  
  if (hg.length !== hi.length) {
    console.log(`  Part ${part}: WARNING - ${hg.length} HTML groups vs ${hi.length} Hebrew files`);
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Matched: ${totalMatched} Hebrew files`);
console.log(`Total aligned segments: ${totalAligned}`);

// Show matches
console.log(`\nAll matches:`);
for (const m of matchLog) {
  console.log(`  Part ${m.part}: ${m.html} -> ${m.hebrew} (${m.htmlParas}p/${m.hebSegs}s, ${m.htmlFiles} files)`);
}

fs.writeFileSync('/root/ajew-org/scripts/alignment-match-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log(`\nMatch log saved.`);
