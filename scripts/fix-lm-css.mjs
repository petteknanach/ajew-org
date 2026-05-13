/**
 * Fix CSS rendering issue in LM Volume 1 pages
 */

import fs from 'fs';
import path from 'path';

const DIR = './src/pages/teachings';

function fixPage(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  
  if (!content.includes('Likutay Moharan Volume 1')) {
    return false;
  }
  
  // The problematic pattern: <p>Likutay Moharan X:X ... CSS definitions ... </p>
  // We need to find this and replace with just <p>Likutay Moharan X:X</p>
  // But there might be whitespace/newlines
  
  // First, find all matches and replace them
  // The pattern spans from "Likutay Moharan X:X" to "</p>" after .explanation
  content = content.replace(
    /<p>Likutay Moharan (\d+:\d+)[\s\S]*?\.explanation[\s\S]*?<\/p>/g,
    '<p>Likutay Moharan $1</p>'
  );
  
  // Also remove any duplicate entries like <p>    Likutay Moharan X:X</p> that follow
  // This removes the duplicate "Likutay Moharan X:X" that appears after the CSS block
  content = content.replace(
    /<\/p>\s*<p>\s*Likutay Moharan \d+:\d+\s*<\/p>/g,
    '</p>'
  );
  
  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Fixed: ${path.basename(filepath)}`);
    return true;
  }
  return false;
}

const files = fs.readdirSync(DIR);
let count = 0;
for (const file of files) {
  if (file.startsWith('likutay-moharan-volume-1-torah-') && file.endsWith('.astro')) {
    if (fixPage(path.join(DIR, file))) {
      count++;
    }
  }
}

console.log(`\nTotal files fixed: ${count}`);
