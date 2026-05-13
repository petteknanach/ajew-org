#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

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

function parseTitle(title) {
  let t = decodeHTML(title);
  
  // Skip volume-level files
  if (/^Likutay Halachos\s*[—–-]\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[—–-]?\s*(Volume|$)/i.test(t)) {
    return null;
  }
  
  // Remove "Likutay Halachos — " prefix
  t = t.replace(/^Likutay Halachos\s*[—–-]\s*/i, '');
  
  // Remove "Choshen Mishpat — " prefix (for CM format)
  t = t.replace(/^(?:Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[—–-]\s*/i, '');
  
  let name = '';
  
  // Pattern 1: "Hilchos X — Halacha Y" or "Hilchos X, Halacha Y" or "Hilchos X, Halachos Y"
  let m = t.match(/^(?:Hilchos|Laws\s+of)\s+(.+?)\s*[,—–-]\s*Halacha/i);
  if (m) { name = m[1].trim(); }
  
  // Pattern 2: "Hilchos X — Part Y"
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+(.+?)\s*[,—–-]\s*Part\s/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 3: "Hilchos X N" where N is a number (Choshen Mishpat format: "Hilchos Dayonim 1")
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+(.+?)\s+\d/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 4: "Hilchos X" at end of string
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+(.+?)$/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 5: "X — Halacha Y" (no Hilchos prefix)
  if (!name) {
    m = t.match(/^(.+?)\s*[,—–-]\s*Halacha/i);
    if (m) { name = m[1].trim(); }
  }
  
  if (!name || name.length < 2) return null;
  
  // Clean up
  name = name.replace(/['']s\b/g, '').replace(/\s+/g, ' ').trim();
  
  return { name };
}

// Test on all Orach Chaim 1 files
const oc1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1');
const files = fs.readdirSync(oc1Dir).filter(f => f.endsWith('.html')).sort();

console.log('Orach Chaim 1 title parsing:\n');
let ok = 0, fail = 0;
for (const hf of files) {
  const content = fs.readFileSync(path.join(oc1Dir, hf), 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1] : '';
  const parsed = parseTitle(rawTitle);
  if (parsed) {
    ok++;
    if (ok <= 25) console.log(`  OK: ${hf} -> "${parsed.name}"`);
  } else {
    fail++;
    if (fail <= 10) console.log(`  FAIL: ${hf} -> "${rawTitle.substring(0, 70)}"`);
  }
}
console.log(`\nTotal: ${ok} parsed, ${fail} failed out of ${files.length}`);

// Test on Choshen Mishpat 1
const cm1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Choshen Mishpat - 1');
const cm1Files = fs.readdirSync(cm1Dir).filter(f => f.endsWith('.html')).sort();

console.log('\nChoshen Mishpat 1 title parsing:\n');
ok = 0; fail = 0;
for (const hf of cm1Files) {
  const content = fs.readFileSync(path.join(cm1Dir, hf), 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1] : '';
  const parsed = parseTitle(rawTitle);
  if (parsed) {
    ok++;
    if (ok <= 10) console.log(`  OK: ${hf} -> "${parsed.name}"`);
  } else {
    fail++;
    if (fail <= 5) console.log(`  FAIL: ${hf} -> "${rawTitle.substring(0, 70)}"`);
  }
}
console.log(`\nTotal: ${ok} parsed, ${fail} failed out of ${cm1Files.length}`);
