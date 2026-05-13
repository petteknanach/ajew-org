#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
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
  
  return name ? { name } : null;
}

const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

let totalFiles = 0;
let parsed = 0;
let failed = 0;
const failedTitles = [];

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of files) {
    totalFiles++;
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
    const parsedTitle = parseHTMLTitle(title);
    
    if (parsedTitle) {
      parsed++;
    } else {
      failed++;
      if (failedTitles.length < 30) {
        failedTitles.push({ vol, hf, title });
      }
    }
  }
}

console.log(`Total: ${totalFiles}, Parsed: ${parsed}, Failed: ${failed}`);
console.log('\nFailed titles (first 30):');
for (const f of failedTitles) {
  console.log(`  ${path.join(f.vol, f.hf)}: "${f.title.substring(0, 80)}"`);
}
