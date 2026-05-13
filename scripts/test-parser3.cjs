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
  
  // Normalize all dash types to a single character
  t = t.replace(/[—–−‐‑‒–]/g, ' - ');
  t = t.replace(/\s+/g, ' ').trim();
  
  // Skip volume-level files
  if (/^Likutay Halachos\s*-\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)/i.test(t)) {
    // But check if it has a Hilchos name after the volume reference
    if (!/Hilchos|Laws\s+of/i.test(t)) return null;
  }
  
  // Remove all prefixes: "Likutay Halachos - X - " where X is volume/section name
  // Keep removing prefixes until we get to the Hilchos/Laws name
  while (/^(?:Likutay Halachos|Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*-\s*/i.test(t)) {
    t = t.replace(/^(?:Likutay Halachos|Orach Chaim(?:\s*Vol\.?\s*\d+)?|Yoreh De(?:'ah|ah)?|Even Ha-Ezer|Choshen Mishpat(?:\s*[IV]+)?)\s*-\s*/i, '');
  }
  
  let name = '';
  
  // Pattern 1: "Hilchos X - Halacha(s) Y" or "Hilchos X, Halacha(s) Y"
  let m = t.match(/^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s*[,;-]\s*Halacha/i);
  if (m) { name = m[1].trim(); }
  
  // Pattern 2: "Hilchos X - Part Y"
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s*[,;-]\s*Part\s/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 3: "Hilchos X N" where N is a number
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s+\d/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 4: "Hilchos X" at end of string
  if (!name) {
    m = t.match(/^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)$/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 5: "X - Halacha Y" (no Hilchos prefix, e.g., "Masa U'Masan - Halacha 3")
  if (!name) {
    m = t.match(/^([A-Za-z\s'']+?)\s*[,;-]\s*Halacha/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 6: "X N" where N is a number, no Hilchos prefix (e.g., "Masa U'Masan 3")
  if (!name) {
    m = t.match(/^([A-Za-z\s'']+?)\s+\d/i);
    if (m) { name = m[1].trim(); }
  }
  
  // Pattern 7: "Laws of X (Y), Halachah Z" (e.g., "Laws of Chezkas Karka'os (Presumptive Ownership of Land), Ha")
  if (!name) {
    m = t.match(/^Laws\s+of\s+([A-Za-z\s'']+?)\s*\(/i);
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

let totalOk = 0, totalFail = 0;

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  let ok = 0, fail = 0;
  const failed = [];
  const samples = [];
  
  for (const hf of files) {
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const parsed = parseTitle(rawTitle);
    if (parsed) {
      ok++;
      if (samples.length < 3) samples.push(`${hf} -> "${parsed.name}"`);
    } else {
      fail++;
      if (failed.length < 2) failed.push({ hf, title: rawTitle.substring(0, 70) });
    }
  }
  
  totalOk += ok;
  totalFail += fail;
  console.log(`${vol}: ${ok} parsed, ${fail} failed`);
  for (const s of samples) console.log(`  ${s}`);
  for (const f of failed) console.log(`  FAIL: ${f.hf} -> "${f.title}"`);
}

console.log(`\nTotal: ${totalOk} parsed, ${totalFail} failed out of ${totalOk + totalFail}`);
