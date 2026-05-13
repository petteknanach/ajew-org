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

// Current parser from align-lh-final2.cjs
function parseTitle(title) {
  let t = decodeHTML(title);
  t = t.replace(/[—–−‐‑‒–]/g, ' - ');
  t = t.replace(/\s+/g, ' ').trim();
  
  if (/^Likutay Halachos\s*-\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*-\s*Volume\s*\d+\s*$/i.test(t)) {
    return null;
  }
  
  let prevT = '';
  while (t !== prevT) {
    prevT = t;
    t = t.replace(/^(?:Likutay Halachos|Orach Chaim(?:\s*Vol\.?\s*\d+)?|Yoreh De(?:'ah|ah)?|Even Ha-Ezer|Choshen Mishpat(?:\s*[IVX]+)?|Evven Ha-Ezer)\s*-\s*/i, '');
  }
  
  let name = '';
  let m;
  const patterns = [
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s*[,;-]\s*Halacha/i,
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s*[,;-]\s*Part\s/i,
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)\s+\d/i,
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'']+?)$/i,
    /^([A-Za-z\s'']+?)\s*[,;-]\s*Halacha/i,
    /^([A-Za-z\s'']+?)\s+\d/i,
    /^Laws\s+of\s+([A-Za-z\s'']+?)\s*\(/i,
    /^([A-Za-z\s'']+?)(?:\s*[-,;]|\s+\d|$)/i,
  ];
  for (const p of patterns) {
    m = t.match(p);
    if (m && m[1].trim().length >= 2) { name = m[1].trim(); break; }
  }
  if (!name || name.length < 2) return null;
  name = name.replace(/['']s\b/g, '').replace(/\s+/g, ' ').trim();
  return { name };
}

// Find all failing titles
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());

const failedByPart = {};

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  for (const hf of files) {
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const parsed = parseTitle(rawTitle);
    
    if (!parsed) {
      // Skip volume headers
      if (/Volume/i.test(rawTitle) && !/Hilchos|Laws/i.test(decodeHTML(rawTitle))) continue;
      
      const part = vol.includes('Orach Chaim - 1') ? 1
        : vol.includes('Orach Chaim - 2') ? 2
        : vol.includes('Orach Chaim - 3') ? 3
        : vol.includes('Yoreh Daya - 1') ? 4
        : vol.includes('Yoreh Daya - 2') ? 5
        : vol.includes('Evven') ? 6
        : vol.includes('Choshen Mishpat - 1') ? 7
        : vol.includes('Choshen Mishpat - 2') ? 8 : 0;
      
      if (!failedByPart[part]) failedByPart[part] = [];
      failedByPart[part].push({ vol, hf, rawTitle: decodeHTML(rawTitle) });
    }
  }
}

for (const [part, files] of Object.entries(failedByPart).sort((a,b) => a[0]-b[0])) {
  console.log(`\n=== Part ${part}: ${files.length} failed ===`);
  for (const f of files) {
    console.log(`  ${f.hf}: "${f.rawTitle.substring(0, 90)}"`);
  }
}
