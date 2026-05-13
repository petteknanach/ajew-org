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

// Improved title parser that handles all formats
function parseHTMLTitle(title) {
  let t = title;
  
  // Remove "Likutay Halachos — Volume X" prefix (these are volume-level files)
  if (/^Likutay Halachos\s*[—–-]\s*(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)/i.test(t)) {
    return null; // Volume-level file, not a halacha translation
  }
  
  // Remove "Likutay Halachos —" prefix
  t = t.replace(/^Likutay Halachos\s*[—–-\s]+\s*/i, '');
  
  // Also remove "Likutay Halachos — Choshen Mishpat — " prefix
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
  
  // Extract halacha number (including word forms like "One", "Two")
  let halacha = '';
  const wordNums = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
  
  const hMatch = t.match(/Halacha[s]?\s+(\d+[a-z]?)/i);
  if (hMatch) {
    halacha = hMatch[1];
  } else {
    // Try word form
    const wMatch = t.match(/Halacha[s]?\s+(\w+)/i);
    if (wMatch) {
      const word = wMatch[1].toLowerCase();
      halacha = wordNums[word] || word;
    }
  }
  
  // Extract part letter
  let partLetter = '';
  const pMatch = t.match(/Part\s+([A-Z])/i);
  if (pMatch) partLetter = pMatch[1];
  
  if (!name) return null;
  
  return { name, halacha, partLetter };
}

// Build comprehensive HTML index
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

const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

const htmlEntries = [];

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of files) {
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
    const parsed = parseHTMLTitle(title);
    
    if (!parsed) continue;
    
    // Count paragraphs
    const paras = (content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []).length;
    
    htmlEntries.push({
      vol, hf, part, title,
      name: parsed.name,
      halacha: parsed.halacha,
      partLetter: parsed.partLetter,
      paras
    });
  }
}

// Group by (part, normalized name, halacha)
const groups = {};
for (const e of htmlEntries) {
  const key = `${e.part}/${e.name.toLowerCase()}/${e.halacha}`;
  if (!groups[key]) groups[key] = { ...e, entries: [], totalParas: 0 };
  groups[key].entries.push(e);
  groups[key].totalParas += e.paras;
}

// Get Hebrew index
const hebrewByPart = {};
for (let part = 1; part <= 8; part++) {
  hebrewByPart[part] = [];
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  for (const t of (idx.torahs || [])) {
    hebrewByPart[part].push({
      number: t.number,
      title: t.hebrewTitle || t.title || ''
    });
  }
}

// Build output: for each HTML group, show the Hebrew files in the same part
const output = [];
const allGroups = Object.values(groups).sort((a, b) => a.part - b.part || a.hf.localeCompare(b.hf));

for (const g of allGroups) {
  const hebrews = hebrewByPart[g.part] || [];
  output.push(`\nHTML: ${g.name} ${g.halacha} (Part ${g.part}, ${g.totalParas} paras, ${g.entries.length} files)`);
  output.push(`  Files: ${g.entries.map(e => e.hf).join(', ')}`);
  output.push(`  Hebrew files in part ${g.part}: ${hebrews.length}`);
  
  // Show first 5 Hebrew files as reference
  for (const h of hebrews.slice(0, 5)) {
    output.push(`    ${h.number}. ${h.title}`);
  }
  if (hebrews.length > 5) {
    output.push(`    ... and ${hebrews.length - 5} more`);
  }
}

fs.writeFileSync('/root/ajew-org/scripts/html-groups.txt', output.join('\n'), 'utf8');
console.log(`Written ${allGroups.length} HTML groups to scripts/html-groups.txt`);

// Also output a simple CSV for manual mapping
const csv = ['part,html_name,halacha,paras,files,suggested_hebrew'];
for (const g of allGroups) {
  csv.push(`${g.part},"${g.name}",${g.halacha},${g.totalParas},${g.entries.length},""`);
}
fs.writeFileSync('/root/ajew-org/scripts/html-groups.csv', csv.join('\n'), 'utf8');
console.log('CSV written to scripts/html-groups.csv');
