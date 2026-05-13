#!/usr/bin/env node
/**
 * Build a simple ordered list of HTML titles and Hebrew titles side by side.
 * This will reveal the mapping pattern.
 */
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

const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

const output = [];

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  const idxFile = path.join(LH_BASE, `part-${part}`, 'index.json');
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  const hebrewTorahs = idx.torahs || [];
  
  output.push(`\n${'='.repeat(100)}`);
  output.push(`VOLUME: ${vol} (Part ${part})`);
  output.push(`${'='.repeat(100)}`);
  
  // Build ordered list: group HTML files by halacha, then list alongside Hebrew
  // First, extract halacha info from each HTML file
  const htmlEntries = [];
  for (const hf of htmlFiles) {
    const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
    
    // Extract Hilchos name and Halacha number
    let name = '', halacha = '', partLetter = '';
    const t = title.replace(/^Likutay Halachos\s*[—–-\s]+\s*/i, '');
    const nameMatch = t.match(/(?:Hilchos|Laws\s+of)\s+([A-Za-z\s'_-]+?)(?:\s*[—–-]|\s*Halacha|\s*$)/i);
    if (nameMatch) name = nameMatch[1].trim();
    const hMatch = t.match(/Halacha[s]?\s+(\d+[a-z]?)/i);
    if (hMatch) halacha = hMatch[1];
    const pMatch = t.match(/Part\s+([A-Z])/i);
    if (pMatch) partLetter = pMatch[1];
    
    // Count paragraphs
    const paras = (content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []).length;
    
    htmlEntries.push({ hf, title, name, halacha, letter: partLetter, paras });
  }
  
  // Group consecutive HTML entries with the same base name+halacha
  const groups = [];
  let current = null;
  for (const e of htmlEntries) {
    const key = `${e.name.toLowerCase()}/${e.halacha}`;
    if (!current || current.key !== key) {
      if (current) groups.push(current);
      current = { key, name: e.name, halacha: e.halacha, entries: [e], totalParas: e.paras };
    } else {
      current.entries.push(e);
      current.totalParas += e.paras;
    }
  }
  if (current) groups.push(current);
  
  output.push(`\nHTML groups: ${groups.length} | Hebrew files: ${hebrewTorahs.length}\n`);
  
  // Now try to match: groups are in order, Hebrew files are in order
  // Some HTML groups may map to multiple Hebrew files (e.g., Tefillin 5 -> Tefillin Hei which is one Hebrew file)
  // But some HTML "halachos" might combine multiple Hebrew files
  
  // Let's just show them side by side and see
  const maxLen = Math.max(groups.length, hebrewTorahs.length);
  
  output.push(`${'HTML GROUP'.padEnd(50)} | ${'HEBREW'.padEnd(40)} | PARAS->SEGS`);
  output.push('-'.repeat(100));
  
  // We'll try matching by checking if the group name keywords appear in the Hebrew title
  // But since they're in different languages, we'll use ORDER as the primary matching key
  // with the assumption that the first HTML group maps to the first Hebrew file, etc.
  
  // Actually, let me just output both lists separately for manual inspection
  output.push('\nHTML GROUPS (in order):');
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const files = g.entries.map(e => e.hf).join(', ');
    output.push(`  ${i}: ${g.name} ${g.halacha} (${g.totalParas} paras, ${g.entries.length} files)`);
    output.push(`     Files: ${files}`);
  }
  
  output.push('\nHEBREW FILES (in order):');
  for (const t of hebrewTorahs) {
    output.push(`  ${t.number}. ${t.hebrewTitle || t.title}`);
  }
  
  // Now attempt sequential matching
  output.push('\n\nSEQUENTIAL MATCHING (HTML group i -> Hebrew file i):');
  const minLen = Math.min(groups.length, hebrewTorahs.length);
  for (let i = 0; i < minLen; i++) {
    const g = groups[i];
    const h = hebrewTorahs[i];
    const status = i < groups.length && i < hebrewTorahs.length ? 'OK' : 'MISMATCH';
    output.push(`  [${status}] HTML: ${g.name} ${g.halacha} (${g.totalParas}p) -> HEB: ${h.hebrewTitle || h.title}`);
  }
  
  if (groups.length !== hebrewTorahs.length) {
    output.push(`\n  *** COUNT MISMATCH: ${groups.length} HTML groups vs ${hebrewTorahs.length} Hebrew files ***`);
    if (groups.length > hebrewTorahs.length) {
      output.push('  Extra HTML groups:');
      for (let i = hebrewTorahs.length; i < groups.length; i++) {
        output.push(`    ${i}: ${groups[i].name} ${groups[i].halacha}`);
      }
    } else {
      output.push('  Extra Hebrew files:');
      for (let i = groups.length; i < hebrewTorahs.length; i++) {
        output.push(`    ${i}: ${hebrewTorahs[i].hebrewTitle || hebrewTorahs[i].title}`);
      }
    }
  }
}

fs.writeFileSync('/root/ajew-org/scripts/mapping-detailed.txt', output.join('\n'), 'utf8');
console.log('Detailed mapping written to scripts/mapping-detailed.txt');
