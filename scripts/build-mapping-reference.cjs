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

// Get all HTML titles grouped by volume
const htmlTitles = {};
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  htmlTitles[vol] = [];
  for (const hf of files) {
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
    htmlTitles[vol].push({ file: hf, title });
  }
}

// Get all Hebrew titles grouped by part
const hebrewTitles = {};
for (let part = 1; part <= 8; part++) {
  const idxFile = path.join(LH_BASE, `part-${part}`, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  hebrewTitles[part] = (idx.torahs || []).map(t => ({
    number: t.number,
    title: t.hebrewTitle || t.title || ''
  }));
}

// Output as a mapping file
const output = [];

for (const [vol, part] of Object.entries(volToPart)) {
  const htmls = htmlTitles[vol] || [];
  const hebrews = hebrewTitles[part] || [];
  
  output.push(`\n${'='.repeat(80)}`);
  output.push(`VOLUME: ${vol} (Part ${part})`);
  output.push(`${'='.repeat(80)}`);
  output.push(`\nHTML FILES (${htmls.length}):`);
  for (const h of htmls) {
    output.push(`  ${h.file}: ${h.title}`);
  }
  output.push(`\nHEBREW FILES (${hebrews.length}):`);
  for (const h of hebrews) {
    output.push(`  ${h.number}. ${h.title}`);
  }
}

fs.writeFileSync('/root/ajew-org/scripts/mapping-reference.txt', output.join('\n'), 'utf8');
console.log('Mapping reference written to scripts/mapping-reference.txt');

// Also output a compact version for manual mapping
const compact = [];
for (const [vol, part] of Object.entries(volToPart)) {
  const htmls = htmlTitles[vol] || [];
  compact.push(`\n--- ${vol} (Part ${part}) ---`);
  
  // Extract unique halacha names from HTML titles
  const halachaNames = new Set();
  for (const h of htmls) {
    const t = h.title.replace(/^Likutay Halachos\s*[—–-\s]+\s*/i, '');
    const nameMatch = t.match(/(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]|\s*$)/i);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      const hMatch = t.match(/Halacha[s]?\s+(\d+[a-z]?)/i);
      const halacha = hMatch ? hMatch[1] : '?';
      halachaNames.add(`${name} / Halacha ${halacha}`);
    }
  }
  
  for (const name of [...halachaNames].sort()) {
    compact.push(`  HTML: ${name}`);
  }
  
  const hebrews = hebrewTitles[part] || [];
  compact.push('  ---');
  for (const h of hebrews) {
    compact.push(`  HEB: ${h.number}. ${h.title}`);
  }
}

fs.writeFileSync('/root/ajew-org/scripts/mapping-compact.txt', compact.join('\n'), 'utf8');
console.log('Compact mapping written to scripts/mapping-compact.txt');
