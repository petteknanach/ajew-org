#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function parseTitle(title) {
  let t = decodeHTML(title);
  t = t.replace(/[—–−‐‑‒–]/g, ' - ');
  t = t.replace(/\s+/g, ' ').trim();
  if (/^Likutay Halachos\s*-\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*-\s*(Volume|Vol\.)/i.test(t)) return null;
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

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

// For each part, compare the ORDER of unique base names in HTML vs Hebrew
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

for (const [vol, part] of Object.entries(volToPart)) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  if (!fs.existsSync(volDir)) continue;
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  // Get HTML base names in order (first occurrence only)
  const htmlNames = [];
  const seenHtml = new Set();
  for (const hf of htmlFiles) {
    const title = extractTitle(path.join(volDir, hf));
    const parsed = parseTitle(title);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (!seenHtml.has(key)) {
      seenHtml.add(key);
      htmlNames.push(parsed.name);
    }
  }
  
  // Get Hebrew base names in order (first occurrence only)
  const hebNames = [];
  const seenHeb = new Set();
  for (const t of (idx.torahs || [])) {
    const title = t.hebrewTitle || t.title || '';
    const base = title.replace(/\s+[א-ת]$/, '').trim();
    if (!seenHeb.has(base)) {
      seenHeb.add(base);
      hebNames.push(base);
    }
  }
  
  console.log(`\n=== Part ${part} (${vol}) ===`);
  console.log(`HTML unique names: ${htmlNames.length}, Hebrew unique names: ${hebNames.length}`);
  
  // Show first 10 side by side
  const maxShow = Math.min(10, Math.max(htmlNames.length, hebNames.length));
  for (let i = 0; i < maxShow; i++) {
    const h = i < htmlNames.length ? htmlNames[i] : '(none)';
    const b = i < hebNames.length ? hebNames[i] : '(none)';
    console.log(`  ${i}: ${h.padEnd(35)} | ${b}`);
  }
  if (htmlNames.length > 10) console.log(`  ... (${htmlNames.length - 10} more HTML names)`);
  if (hebNames.length > 10) console.log(`  ... (${hebNames.length - 10} more Hebrew names)`);
}
