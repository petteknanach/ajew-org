#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check if HTML files contain multiple halachos
// Look at the largest YD1 HTML file
const volDir = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos/Likutay Halachos - Yoreh Daya - 1';

// Check the giluach file (258 paras - the largest)
const testFile = path.join(volDir, '400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html');
const content = fs.readFileSync(testFile, 'utf8');

// Check the title
const titleMatch = content.match(/<title>(.*?)<\/title>/i);
console.log('Title:', titleMatch ? titleMatch[1] : 'N/A');

// Check for section headers that might indicate multiple halachos
const h3Matches = content.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];
console.log('\nH3 headers:', h3Matches.length);
for (const h of h3Matches.slice(0, 10)) {
  console.log('  ' + h.replace(/<[^>]+>/g, '').trim().substring(0, 60));
}

// Check for h2 headers
const h2Matches = content.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
console.log('\nH2 headers:', h2Matches.length);
for (const h of h2Matches.slice(0, 10)) {
  console.log('  ' + h.replace(/<[^>]+>/g, '').trim().substring(0, 60));
}

// Check for § markers (section markers within a halacha)
const sectionMatches = content.match(/§\s*\d+/g) || [];
console.log('\n§ section markers:', sectionMatches.length);

// Count paragraphs
const paras = (content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []).length;
console.log('\nTotal paragraphs:', paras);

// Now check: does this file cover multiple halachos?
// Look for patterns like "Halacha 1", "Halacha 2", etc.
const halachaMatches = content.match(/Halacha\s+(\d+)/gi) || [];
console.log('\nHalacha references:', halachaMatches.slice(0, 10).join(', '));

// Check for "Siman" references
const simanMatches = content.match(/Siman\s+(\d+)/gi) || [];
console.log('Siman references:', simanMatches.slice(0, 10).join(', '));
