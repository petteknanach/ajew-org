#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Search for FOI and OH source files on the Windows drive
const searchDirs = [
  '/mnt/c/Users/Pettek',
  '/mnt/d',
];

const results = { foi: [], oh: [] };

function searchDir(dir, depth = 0) {
  if (depth > 4) return; // Limit search depth
  
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch(e) { return; }
  
  for (const entry of entries) {
    const full = path.join(dir, entry);
    
    // Check if it's a relevant file
    const lower = entry.toLowerCase();
    
    // FOI source files
    if ((lower.includes('fires') || lower.includes('אשי')) && 
        (lower.endsWith('.docx') || lower.endsWith('.txt') || lower.endsWith('.pdf') || lower.endsWith('.doc'))) {
      results.foi.push(full);
    }
    
    // OH source files  
    if ((lower.includes('otzar') || lower.includes('אוצר')) && 
        (lower.endsWith('.docx') || lower.endsWith('.txt') || lower.endsWith('.pdf') || lower.endsWith('.doc'))) {
      results.oh.push(full);
    }
    
    // Recurse into directories
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== '.git') {
        searchDir(full, depth + 1);
      }
    } catch(e) {}
  }
}

for (const dir of searchDirs) {
  if (fs.existsSync(dir)) {
    console.log(`Searching ${dir}...`);
    searchDir(dir);
  }
}

console.log('\n=== FOI Source Files ===');
for (const f of results.foi) console.log(`  ${f}`);

console.log('\n=== OH Source Files ===');
for (const f of results.oh) console.log(`  ${f}`);

if (results.foi.length === 0) console.log('\nNo FOI source files found!');
if (results.oh.length === 0) console.log('No OH source files found!');
