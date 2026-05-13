#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  return text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/&mdash;/g,'—').replace(/&ndash;/g,'–').replace(/&rsquo;/g,"'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const m = content.match(/<title>(.*?)<\/title>/i);
  return m ? decodeHTML(m[1]) : '';
}

// For parts 4, 5, 6: show ALL HTML titles and ALL Hebrew titles side by side
for (const part of [4, 5, 6]) {
  const volDir = path.join(TRANSLATIONS_BASE, {
    4: 'Likutay Halachos - Yoreh Daya - 1',
    5: 'Likutay Halachos - Yoreh Daya - 2',
    6: 'Likutay Halachos - Evven Hu-ezehr',
  }[part]);
  
  const idx = JSON.parse(fs.readFileSync(path.join(LH_BASE, `part-${part}/index.json`), 'utf8'));
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  console.log(`\n=== Part ${part} ===`);
  console.log(`Hebrew index: ${idx.torahs.length} entries`);
  console.log(`HTML files: ${htmlFiles.length} files`);
  
  // Show Hebrew entries
  console.log('\nHebrew index entries:');
  for (const t of idx.torahs) {
    console.log(`  #${t.number}: ${t.hebrewTitle || t.title}`);
  }
  
  // Show HTML files
  console.log('\nHTML files:');
  for (const hf of htmlFiles) {
    const title = extractTitle(path.join(volDir, hf));
    const clean = title.replace(/^Likutay\s+Halachos\s*[—–-]\s*(?:Yoreh\s+De[^-]*|Even\s+Ha-Ezer|Evven\s+Hu-ezehr)\s*[—–-]\s*/i, '').substring(0, 60);
    console.log(`  ${hf}: ${clean}`);
  }
}
