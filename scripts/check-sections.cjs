#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check the structure of a multi-halacha HTML file
const f = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos/Likutay Halachos - Yoreh Daya - 1/400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html';
const content = fs.readFileSync(f, 'utf8');

// Extract all h3 headers with their content
const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
let m;
const sections = [];
while ((m = h3Regex.exec(content)) !== null) {
  const headerText = m[1].replace(/<[^>]+>/g, '').trim();
  // Get the content after this h3 until the next h3 or end
  const afterH3 = content.substring(m.index + m[0].length);
  const nextH3 = afterH3.search(/<h3/i);
  const sectionContent = nextH3 > 0 ? afterH3.substring(0, nextH3) : afterH3;
  const paras = (sectionContent.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [])
    .map(p => p.replace(/<[^>]+>/g, '').trim())
    .filter(t => t.length >= 20);
  
  sections.push({ header: headerText.substring(0, 60), paras: paras.length });
}

console.log('Sections in giluach file:');
for (const s of sections) {
  console.log(`  [${s.paras} paras] ${s.header}`);
}

// Now check: does each section correspond to a specific halacha number?
// Look for patterns like "Halacha 1", "Halacha 2" in the headers
console.log('\nHalacha number patterns in headers:');
for (const s of sections) {
  const numMatch = s.header.match(/Halacha\s+(\d+)/i);
  if (numMatch) console.log(`  Halacha ${numMatch[1]}: ${s.header}`);
}
