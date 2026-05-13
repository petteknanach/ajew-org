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
  
  // Skip pure volume-level files (no halacha name)
  if (/^Likutay Halachos\s*-\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*-\s*(Volume|Vol\.)\s*\d+\s*$/i.test(t)) {
    return null;
  }
  
  // Remove "Likutay Halachos - X - " prefixes (including "Orach Chaim II:", "Yoreh Deah II:", etc.)
  let prevT = '';
  while (t !== prevT) {
    prevT = t;
    t = t.replace(/^(?:Likutay Halachos|Orach Chaim(?:\s*(?:Vol\.?\s*\d+|II|III|IV)?)?|Yoreh De(?:'ah|ah)?(?:\s*II)?|Even Ha-Ezer|Choshen Mishpat(?:\s*[IVX]+)?|Evven Hu?Ezer)\s*[:\s-]+\s*/i, '');
  }
  
  // Remove parenthetical English translations: " (Worms)", " (Beitzim)", " (Laws of Robbery)"
  t = t.replace(/\s*\([^)]*\)\s*/g, ' ');
  
  // Remove "COMPLETE" suffix
  t = t.replace(/\s*-\s*COMPLETE\s*$/i, '');
  t = t.replace(/\s*COMPLETE\s*Translation\s*$/i, '');
  
  // Remove section markers like "§1", "§§1-6", "§§9-10"
  t = t.replace(/\s*§+\s*\d+[-\d]*\s*/g, ' ');
  
  // Remove "cont." suffix
  t = t.replace(/\s*\(cont\.\)\s*/i, '');
  
  t = t.replace(/\s+/g, ' ').trim();
  
  let name = '';
  let m;
  
  const patterns = [
    // "Hilchos X - Halacha(s) Y" or "Hilchos X, Halacha(s) Y"
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s*[,;-]\s*Halacha/i,
    // "Hilchos X - Part Y"
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s*[,;-]\s*Part\s/i,
    // "Hilchos X N" where N is a number
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s+\d/i,
    // "Hilchos X" at end of string
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)$/i,
    // "X - Halacha Y" (no Hilchos prefix)
    /^([A-Za-z\s'']+?)\s*[,;-]\s*Halacha/i,
    // "X N" where N is a number, no Hilchos prefix
    /^([A-Za-z\s'']+?)\s+\d/i,
    // "Laws of X (Y)" - but we already removed parens, so just "Laws of X"
    /^Laws\s+of\s+([A-Za-z\s'']+?)$/i,
    // "X - Part Y" (no Hilchos prefix)
    /^([A-Za-z\s'']+?)\s*[,;-]\s*Part\s/i,
    // "X: Subtitle" - take just X
    /^([A-Za-z\s'']+?)\s*:/i,
    // Fallback: just a name at the start
    /^([A-Za-z\s'']+?)(?:\s*[-,;]|\s+\d|$)/i,
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
    } else {
      totalFail++;
      if (!failedByPart[part]) failedByPart[part] = [];
      failedByPart[part].push({ hf, rawTitle: decodeHTML(rawTitle) });
    }
  }
}

console.log(`Total: ${totalOk} parsed, ${totalFail} failed out of ${totalOk + totalFail}`);

for (const [part, files] of Object.entries(failedByPart).sort((a,b) => a[0]-b[0])) {
  console.log(`\nPart ${part}: ${files.length} still failing`);
  for (const f of files) {
    console.log(`  ${f.hf}: "${f.rawTitle.substring(0, 80)}"`);
  }
}
