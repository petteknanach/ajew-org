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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function countTextContent(text) {
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeHTML(text).replace(/\s+/g, ' ').trim();
  return text.length;
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
    if (text.length >= 20) paragraphs.push(text);
  }
  return paragraphs;
}

function countSegments(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segments = data.segments || [];
  let count = 0;
  let totalHebChars = 0;
  for (const seg of segments) {
    const he = (seg.he || seg.he_nikud || '').trim();
    if (he.length === 0) continue;
    if (/^אות\s/.test(he) && he.length < 10) continue;
    if (/^הלכה\s/.test(he) && he.length < 15) continue;
    if (/^סימן\s/.test(he) && he.length < 15) continue;
    if (he.length < 8) continue;
    count++;
    totalHebChars += he.length;
  }
  return { count, totalHebChars };
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

console.log('Volume comparison: HTML paragraphs vs Hebrew segments\n');

for (const [vol, part] of Object.entries(volToPart)) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  if (!fs.existsSync(volDir)) continue;
  
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  let totalHTMLParas = 0;
  let totalHTMLChars = 0;
  
  for (const hf of htmlFiles) {
    const paras = extractParagraphs(path.join(volDir, hf));
    totalHTMLParas += paras.length;
    for (const p of paras) totalHTMLChars += p.length;
  }
  
  // Count Hebrew segments
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  let totalHebSegs = 0;
  let totalHebChars = 0;
  let hebFileCount = 0;
  
  for (const t of (idx.torahs || [])) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const { count, totalHebChars: chars } = countSegments(filePath);
    totalHebSegs += count;
    totalHebChars += chars;
    hebFileCount++;
  }
  
  const ratio = totalHTMLParas > 0 ? (totalHebSegs / totalHTMLParas).toFixed(2) : 'N/A';
  console.log(`${vol}:`);
  console.log(`  HTML: ${htmlFiles.length} files, ${totalHTMLParas} paragraphs, ${totalHTMLChars} chars`);
  console.log(`  Hebrew: ${hebFileCount} files, ${totalHebSegs} segments, ${totalHebChars} chars`);
  console.log(`  Ratio (Heb segs / HTML paras): ${ratio}`);
  console.log();
}
