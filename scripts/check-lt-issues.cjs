#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// 1. Check the special prayers page for the "curated by" text
const specialPage = '/root/ajew-org/src/pages/reader/likutay-tefilos/special.astro';
if (fs.existsSync(specialPage)) {
  const content = fs.readFileSync(specialPage, 'utf8');
  
  // Find and fix "curated by Rabbi Nachman" to "curated by Rabbi Nosson"
  if (content.includes('Rabbi Nachman') && !content.includes('Rabbi Nosson')) {
    console.log('Found "Rabbi Nachman" in special page - needs fix');
    console.log('Relevant lines:');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Rabbi Nachman')) {
        console.log(`  Line ${i+1}: ${lines[i].trim()}`);
      }
    }
  }
}

// 2. Check the LT index pages for topic translations
const ltDir = '/root/ajew-org/src/pages/reader/likutay-tefilos';
const indexFiles = fs.readdirSync(ltDir).filter(f => f.includes('index'));
console.log('\nLT index files:', indexFiles);

// 3. Check part 2 index for "Section" vs "Prayer" labeling
const part2Index = '/root/ajew-org/public/reader/likutay-tefilos/part-2/index.json';
if (fs.existsSync(part2Index)) {
  const idx = JSON.parse(fs.readFileSync(part2Index, 'utf8'));
  console.log('\nPart 2 index - first 5 entries:');
  for (const t of (idx.torahs || []).slice(0, 5)) {
    console.log(`  #${t.number}: ${t.title}`);
  }
}

// 4. Check part 1 index for comparison
const part1Index = '/root/ajew-org/public/reader/likutay-tefilos/part-1/index.json';
if (fs.existsSync(part1Index)) {
  const idx = JSON.parse(fs.readFileSync(part1Index, 'utf8'));
  console.log('\nPart 1 index - first 5 entries:');
  for (const t of (idx.torahs || []).slice(0, 5)) {
    console.log(`  #${t.number}: ${t.title}`);
  }
}

// 5. Check for "translation not yet available" in English content
console.log('\nChecking for "translation not yet available" in LT files...');
let foundTranslationNotAvailable = 0;
for (const part of [1, 2]) {
  const pdir = `/root/ajew-org/public/reader/likutay-tefilos/part-${part}`;
  const files = fs.readdirSync(pdir).filter(f => f.startsWith('prayer-') && f.endsWith('.json'));
  for (const f of files.slice(0, 10)) {
    const data = JSON.parse(fs.readFileSync(path.join(pdir, f), 'utf8'));
    for (const seg of (data.segments || [])) {
      if (seg.en && seg.en.includes('Translation not yet available')) {
        foundTranslationNotAvailable++;
        if (foundTranslationNotAvailable <= 3) {
          console.log(`  Found in part-${part}/${f} seg ${seg.index}`);
        }
      }
    }
  }
}
console.log(`Total segments with "Translation not yet available": ${foundTranslationNotAvailable}`);
