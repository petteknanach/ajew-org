#!/usr/bin/env node
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
  
  // Normalize all dash types
  t = t.replace(/[—–−‐‑‒–]/g, ' - ');
  t = t.replace(/\s+/g, ' ').trim();
  
  // Skip pure volume-level files
  if (/^Likutay Halachos\s*-\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*-\s*(Volume|Vol\.)\s*\d+\s*$/i.test(t)) {
    return null;
  }
  
  // Remove "Likutay Halachos - X - " prefixes
  let prevT = '';
  while (t !== prevT) {
    prevT = t;
    t = t.replace(/^(?:Likutay Halachos|Orach Chaim(?:\s*(?:Vol\.?\s*\d+|II|III|IV)?)?|Yoreh De(?:'ah|ah)?(?:\s*II)?|Even Ha-Ezer|Choshen Mishpat(?:\s*[IVX]+)?|Evven Hu?Ezer)\s*[:\s-]+\s*/i, '');
  }
  
  // Remove square bracket English translations: [The Blessing of Thanksgiving], [Blessings of Seeing]
  t = t.replace(/\s*\[[^\]]*\]\s*/g, ' ');
  
  // Remove parenthetical English translations: (Worms), (Beitzim), (Laws of Robbery)
  t = t.replace(/\s*\([^)]*\)\s*/g, ' ');
  
  // Remove "COMPLETE" suffix
  t = t.replace(/\s*-\s*COMPLETE\s*$/i, '');
  t = t.replace(/\s*COMPLETE\s*Translation\s*$/i, '');
  
  // Remove section markers like "§1", "§§1-6"
  t = t.replace(/\s*§+\s*\d+[-\d]*\s*/g, ' ');
  
  // Remove "cont." suffix
  t = t.replace(/\s*\(cont\.\)\s*/i, '');
  
  // Remove "and Other Specific Blessings" type suffixes
  t = t.replace(/\s*and\s+Other\s+Specific\s+Blessings\s*$/i, '');
  
  t = t.replace(/\s+/g, ' ').trim();
  
  let name = '';
  let m;
  
  // Allow & and ' (apostrophe) in names
  const N = "[A-Za-z\\s''&]+?";
  
  const patterns = [
    // "Hilchos X - Halacha(s) Y"
    new RegExp(`^(?:Hilchos|Laws\\s+of)\\s+(${N})\\s*[,;-]\\s*Halacha`, 'i'),
    // "Hilchos X - Part Y"
    new RegExp(`^(?:Hilchos|Laws\\s+of)\\s+(${N})\\s*[,;-]\\s*Part\\s`, 'i'),
    // "Hilchos X N" where N is a number
    new RegExp(`^(?:Hilchos|Laws\\s+of)\\s+(${N})\\s+\\d`, 'i'),
    // "Hilchos X" at end of string
    new RegExp(`^(?:Hilchos|Laws\\s+of)\\s+(${N})$`, 'i'),
    // "X - Halacha Y" (no Hilchos prefix)
    new RegExp(`^(${N})\\s*[,;-]\\s*Halacha`, 'i'),
    // "X N" where N is a number
    new RegExp(`^(${N})\\s+\\d`, 'i'),
    // "X - Part Y"
    new RegExp(`^(${N})\\s*[,;-]\\s*Part\\s`, 'i'),
    // "X H3" pattern (Hebrew name with letter+number like "Terumos uMaasros H3")
    new RegExp(`^([A-Za-z\\s''&]+?H)\\s*\\d`, 'i'),
    // "X: Subtitle"
    new RegExp(`^(${N})\\s*:`, 'i'),
    // "X & Y" (e.g., "Birchas HaPairos & Birchas HaRayach")
    new RegExp(`^(${N})\\s*&`, 'i'),
    // Fallback: just a name
    new RegExp(`^(${N})(?:\\s*[-,;]|\\s+\\d|$)`, 'i'),
  ];
  
  for (const p of patterns) {
    m = t.match(p);
    if (m && m[1].trim().length >= 2) {
      name = m[1].trim();
      break;
    }
  }
  
  if (!name || name.length < 2) return null;
  
  // Clean up
  name = name.replace(/['']s\b/g, '').replace(/\s+/g, ' ').trim();
  
  return { name };
}

// Test on all volumes
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());

let totalOk = 0, totalFail = 0;
const failedByPart = {};
const sampleMatches = [];

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  for (const hf of files) {
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const parsed = parseTitle(rawTitle);
    
    if (parsed) {
      totalOk++;
      if (sampleMatches.length < 10 && /Birchas|Terumos|Raishis|Gezailah/i.test(hf)) {
        sampleMatches.push(`${hf} -> "${parsed.name}"`);
      }
    } else {
      totalFail++;
      if (!failedByPart[part]) failedByPart[part] = [];
      failedByPart[part].push({ hf, rawTitle: decodeHTML(rawTitle) });
    }
  }
}

console.log(`Total: ${totalOk} parsed, ${totalFail} failed out of ${totalOk + totalFail}`);
console.log('\nSample matches:');
for (const s of sampleMatches) console.log(`  ${s}`);

for (const [part, files] of Object.entries(failedByPart).sort((a,b) => a[0]-b[0])) {
  console.log(`\nPart ${part}: ${files.length} still failing`);
  for (const f of files) {
    console.log(`  ${f.hf}: "${f.rawTitle.substring(0, 80)}"`);
  }
}
