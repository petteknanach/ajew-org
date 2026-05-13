#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check Otzar Hayirah current state
const ohDir = '/root/ajew-org/public/reader/otzar-hayirah';
const catalog = JSON.parse(fs.readFileSync('/root/ajew-org/public/reader/catalog.json', 'utf8'));
const ohBook = catalog.books.find(b => b.id === 'otzar-hayirah');

console.log('=== Otzar Hayirah ===');
console.log('Catalog entry:', JSON.stringify(ohBook, null, 2));

if (fs.existsSync(ohDir)) {
  const idxFile = path.join(ohDir, 'index.json');
  if (fs.existsSync(idxFile)) {
    const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    console.log('\nIndex:', JSON.stringify(idx, null, 2).substring(0, 500));
  }
  
  // List files
  const files = fs.readdirSync(ohDir);
  console.log(`\nTotal files: ${files.length}`);
  console.log('First 10:', files.slice(0, 10).join(', '));
} else {
  console.log('Directory does not exist!');
}

// Also check Fires of Israel
const foiDir = '/root/ajew-org/public/reader/fires-of-israel';
const foiBook = catalog.books.find(b => b.id === 'fires-of-israel');

console.log('\n=== Fires of Israel ===');
console.log('Catalog entry:', JSON.stringify(foiBook, null, 2));

if (fs.existsSync(foiDir)) {
  const idxFile = path.join(foiDir, 'index.json');
  if (fs.existsSync(idxFile)) {
    const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    console.log('\nIndex:', JSON.stringify(idx, null, 2).substring(0, 500));
  }
  
  const files = fs.readdirSync(foiDir);
  console.log(`\nTotal files: ${files.length}`);
  console.log('First 10:', files.slice(0, 10).join(', '));
} else {
  console.log('Directory does not exist!');
}
