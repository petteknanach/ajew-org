#!/usr/bin/env node
/**
 * LH alignment using halacha name matching.
 * 
 * For each unique halacha base name (e.g., "Tefillin"):
 * 1. Find all HTML files with that name
 * 2. Find all Hebrew files with that name
 * 3. Match them (HTML paragraphs -> Hebrew segments)
 * 
 * The key insight: within each part, the unique halacha names appear in the same order.
 * E.g., if HTML has [Hakdamah, Hashkamas, Netilas Yadayim, Tzitzis, Tefillin, ...]
 * and Hebrew has [Hakdamah, Hashkamas, Netilas Yadayim, Tzitzis, Tefillin, ...]
 * then we can match by name.
 * 
 * But since the names are in different languages, we use POSITION as the matching key.
 * The first unique HTML name = the first unique Hebrew name, etc.
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
  if (/^Likutay Halachos\s*[—–-]\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)/i.test(t)) return null;
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
  
  if (!name) return null;
  return { name, halacha };
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

// Build HTML index: list of { part, name, halacha, paragraphs, sources }
function buildHTMLIndex() {
  const entries = [];
  
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
      const title = extractTitle(htmlPath);
      const parsed = parseHTMLTitle(title);
      
      if (!parsed) continue;
      
      const paragraphs = extractParagraphs(htmlPath);
      if (paragraphs.length === 0) continue;
      
      entries.push({
        vol, hf, part, htmlPath,
        name: parsed.name,
        halacha: parsed.halacha,
        paragraphs,
        title
      });
    }
  }
  
  return entries;
}

// Build Hebrew index
function buildHebrewIndex() {
  const entries = [];
  
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
      
      entries.push({
        title,
        part,
        number: t.number,
        filePath,
        segments,
        contentSegs,
        segCount: contentSegs.length
      });
    }
  }
  
  return entries;
}

// Get unique base names from HTML entries (in order of first appearance)
function getUniqueNames(entries) {
  const names = [];
  const seen = new Set();
  
  for (const e of entries) {
    const baseName = e.name.toLowerCase();
    if (!seen.has(baseName)) {
      seen.add(baseName);
      names.push({ name: e.name, baseName });
    }
  }
  
  return names;
}

// Get unique base names from Hebrew entries (in order of first appearance)
function getUniqueHebrewNames(entries) {
  const names = [];
  const seen = new Set();
  
  for (const e of entries) {
    // Extract base name (remove letter suffix like א, ב, ג)
    const baseName = e.title.replace(/\s+[א-ת]$/, '').trim();
    if (!seen.has(baseName)) {
      seen.add(baseName);
      names.push({ name: e.title, baseName });
    }
  }
  
  return names;
}

// ---- MAIN ----
console.log('Building HTML index...');
const htmlEntries = buildHTMLIndex();
console.log(`  ${htmlEntries.length} HTML entries`);

console.log('\nBuilding Hebrew index...');
const hebrewEntries = buildHebrewIndex();
console.log(`  ${hebrewEntries.length} Hebrew entries`);

// Get unique names per part
console.log('\n=== Unique halacha names per part ===\n');

for (let part = 1; part <= 8; part++) {
  const htmlPart = htmlEntries.filter(e => e.part === part);
  const hebPart = hebrewEntries.filter(e => e.part === part);
  
  const htmlNames = getUniqueNames(htmlPart);
  const hebNames = getUniqueHebrewNames(hebPart);
  
  console.log(`Part ${part}: ${htmlNames.length} HTML names, ${hebNames.length} Hebrew names`);
  
  // Show side by side
  const maxLen = Math.max(htmlNames.length, hebNames.length);
  for (let i = 0; i < Math.min(10, maxLen); i++) {
    const html = htmlNames[i] ? htmlNames[i].name : '';
    const heb = hebNames[i] ? hebNames[i].baseName : '';
    console.log(`  ${i}: ${html.padEnd(30)} | ${heb}`);
  }
  if (maxLen > 10) console.log(`  ... and ${maxLen - 10} more`);
  console.log();
}
