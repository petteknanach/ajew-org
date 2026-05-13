#!/usr/bin/env node
/**
 * FINAL LH English alignment.
 * 
 * Strategy:
 * 1. Parse HTML titles to extract base halacha name (very permissive)
 * 2. Group consecutive HTML files with same base name
 * 3. Get unique Hebrew base names (strip letter suffix)
 * 4. Match HTML groups to Hebrew groups by ORDER of first appearance
 * 5. Distribute English paragraphs proportionally
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

// Very permissive title parser
function parseTitle(title) {
  let t = decodeHTML(title);
  
  // Skip volume-level files
  if (/^Likutay Halachos\s*[—–-]\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[—–-]?\s*(Volume|$)/i.test(t)) {
    return null;
  }
  
  // Remove all prefixes
  t = t.replace(/^Likutay Halachos\s*[—–-\s]+\s*/i, '');
  t = t.replace(/^(?:Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[—–-]\s*/i, '');
  
  // Extract name: everything before "Halacha", "Part", "§", "(", or end
  let name = '';
  const patterns = [
    // "Hilchos X — Halacha Y" (Orach Chaim format)
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]\s*Halacha|\s+Halacha)/i,
    // "Hilchos X 1" or "Hilchos X — Part 1" (Choshen Mishpat format)
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]\s*Part|\s+\d)/i,
    // "Hilchos X" at end of string
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)$/i,
    // "X — Halacha Y" format
    /^([A-Za-z\s'_-]+?)\s*[—–-]\s*Halacha/i,
  ];
  
  for (const p of patterns) {
    const m = t.match(p);
    if (m) {
      name = m[1].trim();
      break;
    }
  }
  
  if (!name || name.length < 2) return null;
  
  // Normalize: remove possessives, normalize spaces
  name = name.replace(/['']s\b/g, '').replace(/\s+/g, ' ').trim();
  
  return { name };
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
        !/^(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)/i.test(text)) {
      paragraphs.push(text);
    }
  }
  return paragraphs;
}

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
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
    
    if (!byPart[part]) byPart[part] = [];
    
    const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
    
    for (const hf of files) {
      const htmlPath = path.join(volDir, hf);
      const title = extractTitle(htmlPath);
      const parsed = parseTitle(title);
      
      if (!parsed) continue;
      
      const paragraphs = extractParagraphs(htmlPath);
      if (paragraphs.length === 0) continue;
      
      byPart[part].push({
        hf, htmlPath, part,
        name: parsed.name,
        paragraphs
      });
    }
  }
  
  return byPart;
}

// Build Hebrew groups by part
function buildHebrewGroups() {
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
      
      // Base name: remove trailing Hebrew letter (א, ב, ג, etc.)
      const baseName = title.replace(/\s+[א-ת]$/, '').trim();
      
      byPart[part].push({
        title,
        baseName,
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

// Group consecutive entries with same base name
function groupConsecutive(entries, getName, getParas) {
  const groups = [];
  let current = null;
  
  for (const e of entries) {
    const name = getName(e);
    if (!current || current.name !== name) {
      if (current) groups.push(current);
      current = { name, entries: [e], paragraphs: [...getParas(e)] };
    } else {
      current.entries.push(e);
      current.paragraphs.push(...getParas(e));
    }
  }
  if (current) groups.push(current);
  
  return groups;
}

// ---- MAIN ----
console.log('Building HTML index...');
const htmlByPart = buildHTMLGroups();

console.log('Building Hebrew index...');
const hebrewByPart = buildHebrewGroups();

// Show counts
console.log('\nFile counts per part:');
for (let part = 1; part <= 8; part++) {
  const htmlCount = htmlByPart[part]?.length || 0;
  const hebCount = hebrewByPart[part]?.length || 0;
  console.log(`  Part ${part}: ${htmlCount} HTML files, ${hebCount} Hebrew files`);
}

// Match and align
console.log('\n=== ALIGNING ===\n');

let totalMatched = 0;
let totalAligned = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const htmlEntries = htmlByPart[part] || [];
  const hebEntries = hebrewByPart[part] || [];
  
  // Group HTML entries by consecutive same name
  const htmlGroups = groupConsecutive(htmlEntries, e => e.name.toLowerCase(), e => e.paragraphs);
  
  // Group Hebrew entries by consecutive same base name (Hebrew entries don't have paragraphs, use empty array)
  const hebGroups = groupConsecutive(hebEntries, e => e.baseName, e => []);
  
  console.log(`Part ${part}: ${htmlGroups.length} HTML groups, ${hebGroups.length} Hebrew groups`);
  
  // Match by order of first appearance
  const minLen = Math.min(htmlGroups.length, hebGroups.length);
  
  for (let i = 0; i < minLen; i++) {
    const hg = htmlGroups[i];
    const hebg = hebGroups[i];
    
    // Assign English from HTML group to all Hebrew entries in the group
    for (const heb of hebg.entries) {
      // Clear old English
      for (const seg of heb.segments) {
        seg.en = '';
      }
      
      const enParas = hg.paragraphs;
      const segCount = heb.contentSegs.length;
      
      if (segCount === 0) continue;
      
      // Distribute proportionally
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
          const startS = Math.round(e * ratio);
          const endS = Math.round((e + 1) * ratio);
          for (let s = startS; s < endS && s < segCount; s++) {
            heb.segments[heb.contentSegs[s]].en = enParas[e];
          }
        }
      }
      
      fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
      
      totalMatched++;
      totalAligned += segCount;
    }
    
    matchLog.push({
      part,
      htmlName: hg.name,
      hebrewName: hebg.name,
      htmlFiles: hg.entries.length,
      hebFiles: hebg.entries.length,
      paras: hg.paragraphs.length,
      segs: hebg.entries.reduce((s, e) => s + e.segCount, 0)
    });
  }
  
  if (htmlGroups.length !== hebGroups.length) {
    console.log(`  WARNING: group count mismatch! Showing unmatched:`);
    const maxLen = Math.max(htmlGroups.length, hebGroups.length);
    for (let i = minLen; i < Math.min(minLen + 5, maxLen); i++) {
      const html = htmlGroups[i] ? htmlGroups[i].name : '(none)';
      const heb = hebGroups[i] ? hebGroups[i].name : '(none)';
      console.log(`    ${i}: HTML="${html}" | HEB="${heb}"`);
    }
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Matched: ${totalMatched} Hebrew files with English`);
console.log(`Total aligned segments: ${totalAligned}`);

// Show matches
console.log(`\nMatches by group:`);
for (const m of matchLog) {
  console.log(`  Part ${m.part}: ${m.htmlName} -> ${m.hebrewName} (${m.htmlFiles} HTML files, ${m.hebFiles} Heb files, ${m.paras}p/${m.segs}s)`);
}

fs.writeFileSync('/root/ajew-org/scripts/alignment-match-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
