#!/usr/bin/env node
/**
 * FINAL LH English alignment v2 - production version.
 * Uses improved title parser (608/609 parsed).
 * Groups by consecutive same name, matches positionally within each part.
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

function parseTitle(title) {
  let t = decodeHTML(title);
  t = t.replace(/[—–−‐‑‒–]/g, ' - ');
  t = t.replace(/\s+/g, ' ').trim();
  
  if (/^Likutay Halachos\s*-\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*-\s*(Volume|Vol\.)\s*\d+\s*$/i.test(t)) {
    return null;
  }
  
  let prevT = '';
  while (t !== prevT) {
    prevT = t;
    t = t.replace(/^(?:Likutay Halachos|Orach Chaim(?:\s*(?:Vol\.?\s*\d+|II|III|IV)?)?|Yoreh De(?:'ah|ah)?(?:\s*II)?|Even Ha-Ezer|Choshen Mishpat(?:\s*[IVX]+)?|Evven Hu?Ezer)\s*[:\s-]+\s*/i, '');
  }
  
  t = t.replace(/\s*\[[^\]]*\]\s*/g, ' ');
  t = t.replace(/\s*\([^)]*\)\s*/g, ' ');
  t = t.replace(/\s*-\s*COMPLETE\s*$/i, '');
  t = t.replace(/\s*COMPLETE\s*Translation\s*$/i, '');
  t = t.replace(/\s*§+\s*\d+[-\d]*\s*/g, ' ');
  t = t.replace(/\s*\(cont\.\)\s*/i, '');
  t = t.replace(/\s*and\s+Other\s+Specific\s+Blessings\s*$/i, '');
  t = t.replace(/\s+/g, ' ').trim();
  
  let name = '';
  let m;
  const N = "[A-Za-z\\s''&]+?";
  
  const patterns = [
    new RegExp(`^(?:Hilchos|Laws\\s+of)\\s+(${N})\\s*[,;-]\\s*Halacha`, 'i'),
    new RegExp(`^(?:Hilchos|Laws\\s+of)\\s+(${N})\\s*[,;-]\\s*Part\\s`, 'i'),
    new RegExp(`^(?:Hilchos|Laws\\s+of)\\s+(${N})\\s+\\d`, 'i'),
    new RegExp(`^(?:Hilchos|Laws\\s+of)\\s+(${N})$`, 'i'),
    new RegExp(`^(${N})\\s*[,;-]\\s*Halacha`, 'i'),
    new RegExp(`^(${N})\\s+\\d`, 'i'),
    new RegExp(`^(${N})\\s*[,;-]\\s*Part\\s`, 'i'),
    new RegExp(`^([A-Za-z\\s''&]+?H)\\s*\\d`, 'i'),
    new RegExp(`^(${N})\\s*:`, 'i'),
    new RegExp(`^(${N})\\s*&`, 'i'),
    new RegExp(`^(${N})(?:\\s*[-,;]|\\s+\\d|$)`, 'i'),
  ];
  
  for (const p of patterns) {
    m = t.match(p);
    if (m && m[1].trim().length >= 2) { name = m[1].trim(); break; }
  }
  
  if (!name || name.length < 2) return null;
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

function buildHTMLEntries() {
  const byPart = {};
  const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());
  
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
      
      byPart[part].push({ hf, htmlPath, part, name: parsed.name, paragraphs });
    }
  }
  return byPart;
}

function buildHebrewEntries() {
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
      
      // Read fresh data (without old English)
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const segments = data.segments || [];
      
      // Clear old English
      for (const seg of segments) {
        seg.en = '';
      }
      
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
      
      const baseName = title.replace(/\s+[א-ת]$/, '').trim();
      
      byPart[part].push({
        title, baseName, number: t.number, filePath, segments, contentSegs,
        segCount: contentSegs.length
      });
    }
  }
  return byPart;
}

function groupByName(entries, getName, getParas) {
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

function alignEnglish(heb, enParas) {
  const segCount = heb.contentSegs.length;
  if (segCount === 0) return;
  
  for (const seg of heb.segments) seg.en = '';
  
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
}

// ---- MAIN ----
console.log('Building HTML entries...');
const htmlByPart = buildHTMLEntries();

console.log('Building Hebrew entries (clearing old English)...');
const hebrewByPart = buildHebrewEntries();

console.log('\nCounts per part:');
for (let part = 1; part <= 8; part++) {
  const h = htmlByPart[part] || [];
  const b = hebrewByPart[part] || [];
  console.log(`  Part ${part}: ${h.length} HTML files, ${b.length} Hebrew files`);
}

console.log('\n=== ALIGNING ===\n');
let totalMatched = 0;
let totalAligned = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const htmlEntries = htmlByPart[part] || [];
  const hebEntries = hebrewByPart[part] || [];
  
  const htmlGroups = groupByName(htmlEntries, e => e.name.toLowerCase(), e => e.paragraphs);
  const hebGroups = groupByName(hebEntries, e => e.baseName, e => []);
  
  console.log(`Part ${part}: ${htmlGroups.length} HTML groups, ${hebGroups.length} Hebrew groups`);
  
  const minLen = Math.min(htmlGroups.length, hebGroups.length);
  
  for (let i = 0; i < minLen; i++) {
    const hg = htmlGroups[i];
    const hebg = hebGroups[i];
    
    for (const heb of hebg.entries) {
      alignEnglish(heb, hg.paragraphs);
      fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
      totalMatched++;
      totalAligned += heb.segCount;
    }
    
    matchLog.push({
      part, htmlName: hg.name, hebrewName: hebg.name,
      htmlFiles: hg.entries.length, hebFiles: hebg.entries.length,
      paras: hg.paragraphs.length,
      segs: hebg.entries.reduce((s, e) => s + e.segCount, 0)
    });
  }
  
  if (htmlGroups.length !== hebGroups.length) {
    const maxLen = Math.max(htmlGroups.length, hebGroups.length);
    for (let i = minLen; i < Math.min(minLen + 3, maxLen); i++) {
      const html = htmlGroups[i] ? htmlGroups[i].name : '(none)';
      const heb = hebGroups[i] ? hebGroups[i].name : '(none)';
      console.log(`  Unmatched ${i}: HTML="${html}" | HEB="${heb}"`);
    }
  }
}

// Count actual coverage
let filesWithEn = 0, totalHebFiles = 0;
for (let part = 1; part <= 8; part++) {
  const hebEntries = hebrewByPart[part] || [];
  for (const heb of hebEntries) {
    totalHebFiles++;
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) filesWithEn++;
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Matched: ${totalMatched} Hebrew files`);
console.log(`Coverage: ${filesWithEn}/${totalHebFiles} files with English (${(filesWithEn/totalHebFiles*100).toFixed(1)}%)`);
console.log(`Total aligned segments: ${totalAligned}`);

console.log(`\nGroup matches:`);
for (const m of matchLog) {
  console.log(`  P${m.part}: "${m.htmlName}" -> "${m.hebrewName}" (${m.htmlFiles}f, ${m.paras}p/${m.segs}s)`);
}

fs.writeFileSync('/root/ajew-org/scripts/alignment-match-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log('\nMatch log saved.');
