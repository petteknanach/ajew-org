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
  
  // Remove "Choshen Mishpat — " prefix
  t = t.replace(/^(?:Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[—–-]\s*/i, '');
  
  let name = '';
  
  // Pattern 1: "Hilchos X — Halacha Y" or "Hilchos X, Halacha(s) Y"
  // Name is only letters/spaces/apostrophes - stop at comma or dash before Halacha
  let m = t.match(/^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s*[,—–-]\s*Halacha/i);
  if (m) { name = m[1].trim(); }
  
  // Pattern 2: "Hilchos X — Part Y"
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s*[,—–-]\s*Part\s/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 3: "Hilchos X N" where N is a number (Choshen Mishpat format)
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s+\d/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 4: "Hilchos X" at end of string
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)$/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 5: "X — Halacha Y" (no Hilchos prefix)
  if (!name) {
    m = t.match(/^([A-Za-z\s'']+?)\s*[,—–-]\s*Halacha/i);
    if (m) { name = m[1].trim(); }
  }
  
  if (!name || name.length < 2) return null;
  
  // Clean up
  name = name.replace(/['']s\b/g, '').replace(/\s+/g, ' ').trim();
  
  return { name };
}

// Test on all volumes
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

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

let totalOk = 0, totalFail = 0;

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  let ok = 0, fail = 0;
  const failed = [];
  
  for (const hf of files) {
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const parsed = parseTitle(rawTitle);
    if (parsed) {
      ok++;
    } else {
      fail++;
      if (failed.length < 3) failed.push({ hf, title: rawTitle.substring(0, 60) });
    }
  }
  
  totalOk += ok;
  totalFail += fail;
  console.log(`${vol}: ${ok} parsed, ${fail} failed`);
  for (const f of failed) {
    console.log(`  FAIL: ${f.hf} -> "${f.title}"`);
  }
}

console.log(`\nTotal: ${totalOk} parsed, ${totalFail} failed`);
