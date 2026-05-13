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
  
  if (/^Likutay Halachos\s*[—–-]\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[—–-]?\s*(Volume|$)/i.test(t)) {
    return null;
  }
  
  t = t.replace(/^Likutay Halachos\s*[—–-\s]+\s*/i, '');
  t = t.replace(/^(?:Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[—–-]\s*/i, '');
  
  let name = '';
  const patterns = [
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]\s*Halacha|\s+Halacha)/i,
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]\s*Part|\s+\d)/i,
    /^(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)$/i,
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
  name = name.replace(/['']s\b/g, '').replace(/\s+/g, ' ').trim();
  return { name };
}

// Test on Orach Chaim 1 files
const oc1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1');
const files = fs.readdirSync(oc1Dir).filter(f => f.endsWith('.html')).sort();

console.log('Orach Chaim 1 title parsing:\n');
for (const hf of files.slice(0, 20)) {
  const content = fs.readFileSync(path.join(oc1Dir, hf), 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1] : '';
  const parsed = parseTitle(rawTitle);
  console.log(`${hf}:`);
  console.log(`  Raw:    "${rawTitle.substring(0, 80)}"`);
  console.log(`  Parsed: ${parsed ? `"${parsed.name}"` : 'FAILED'}`);
  console.log();
}
