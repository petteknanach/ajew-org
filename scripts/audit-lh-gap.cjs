#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// For each part, list all HTML files and check if the corresponding Hebrew file has English
function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

const volToPart = {
  'Likutay Halachos - Orach Chaim - 1': { part: 1, name: 'OC1' },
  'Likutay Halachos - Orach Chaim - 2': { part: 2, name: 'OC2' },
  'Likutay Halachos - Orach Chaim - 3': { part: 3, name: 'OC3' },
  'Likutay Halachos - Yoreh Daya - 1': { part: 4, name: 'YD1' },
  'Likutay Halachos - Yoreh Daya - 2': { part: 5, name: 'YD2' },
  'Likutay Halachos - Evven Hu-ezehr': { part: 6, name: 'EH' },
  'Likutay Halachos - Choshen Mishpat - 1': { part: 7, name: 'CM1' },
  'Likutay Halachos - Choshen Mishpat - 2': { part: 8, name: 'CM2' },
};

// Build list of all HTML files with their decoded titles
const htmlFiles = [];
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const partInfo = volToPart[vol];
  if (!partInfo) continue;
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of files) {
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
    
    // Check if this file has actual content
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let paras = 0;
    let m;
    while ((m = pRegex.exec(content)) !== null) {
      let text = m[1].replace(/<[^>]+>/g, '').trim();
      if (text.length >= 20) paras++;
    }
    
    htmlFiles.push({
      vol, hf, part: partInfo.part, partName: partInfo.name,
      title: title.substring(0, 80),
      paras
    });
  }
}

// For each part, show HTML count vs Hebrew count
console.log('=== HTML Files per Part ===');
for (let part = 1; part <= 8; part++) {
  const htmlInPart = htmlFiles.filter(f => f.part === part);
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  let hebCount = 0;
  try {
    const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    hebCount = idx.torahs.length;
  } catch(e) {}
  
  // Count how many Hebrew files actually have English
  let withEn = 0;
  if (fs.existsSync(pdir)) {
    const files = fs.readdirSync(pdir).filter(f => f.startsWith('torah-') && f.endsWith('.json'));
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(pdir, f), 'utf8'));
        if (data.segments && data.segments.some(s => s.en && s.en.trim().length > 0)) {
          withEn++;
        }
      } catch(e) {}
    }
  }
  
  console.log(`Part ${part}: ${htmlInPart.length} HTML files, ${hebCount} Hebrew files, ${withEn} with English`);
  console.log(`  Gap: ${hebCount - withEn} Hebrew files without English`);
}

// List HTML files for the problematic parts (4, 5, 6)
console.log('\n=== Part 4 (YD1) HTML Files ===');
for (const f of htmlFiles.filter(f => f.part === 4)) {
  console.log(`  ${f.hf}: "${f.title}" (${f.paras} paras)`);
}

console.log('\n=== Part 5 (YD2) HTML Files ===');
for (const f of htmlFiles.filter(f => f.part === 5)) {
  console.log(`  ${f.hf}: "${f.title}" (${f.paras} paras)`);
}

console.log('\n=== Part 6 (EH) HTML Files ===');
for (const f of htmlFiles.filter(f => f.part === 6)) {
  console.log(`  ${f.hf}: "${f.title}" (${f.paras} paras)`);
}
