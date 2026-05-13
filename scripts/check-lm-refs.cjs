#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

// Check if HTML files contain LM references like "LM I:181" that could serve as anchors
function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

const volDir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1');
const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));

console.log('Checking for LM references and structure in first 10 files:\n');

for (let i = 0; i < Math.min(10, files.length); i++) {
  const f = path.join(volDir, files[i]);
  const content = fs.readFileSync(f, 'utf8');
  
  // Find LM references
  const lmRefs = content.match(/(?:LM|Likutay Moharan)\s*[IV]+:\s*\d+/gi) || [];
  
  // § sections
  const sections = content.match(/§\d+[a-z]?/gi) || [];
  
  // Paragraph count
  const paras = (content.match(/<p[^>]*>/gi) || []).length;
  
  // Check for any Hebrew
  const hebrew = content.match(/[\u0590-\u05FF]{3,}/g) || [];
  
  console.log(`${files[i]}:`);
  console.log(`  LM refs: ${lmRefs.slice(0, 5).join(', ')}`);
  console.log(`  Sections: ${sections.length} [${sections.slice(0, 8).join(', ')}]`);
  console.log(`  Paragraphs: ${paras}`);
  if (hebrew.length > 0) console.log(`  Hebrew: ${hebrew.slice(0, 5).join(', ')}`);
  
  // Look at the h1 title for halacha number
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    const title = decodeHTML(titleMatch[1]);
    // Extract halacha number
    const halachaMatch = title.match(/Halacha\s+(\d+[a-z]?)/i);
    if (halachaMatch) console.log(`  Halacha #: ${halachaMatch[1]}`);
  }
  console.log();
}
