#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check Otzar Hayirah part 1 structure
const p1Dir = '/root/ajew-org/public/reader/otzar-hayirah/part-1';
const idx = JSON.parse(fs.readFileSync(path.join(p1Dir, 'index.json'), 'utf8'));

console.log('=== Otzar Hayirah Part 1 ===');
console.log('Total entries:', idx.torahs?.length);
console.log('First 5 entries:');
for (const t of (idx.torahs || []).slice(0, 5)) {
  console.log(`  #${t.number}: ${t.title} (${t.hebrewTitle})`);
}

// Check a sample data file
const sampleFile = path.join(p1Dir, 'torah-1.json');
if (fs.existsSync(sampleFile)) {
  const data = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
  console.log(`\nSample file (torah-1.json):`);
  console.log(`  Segments: ${data.segments?.length}`);
  console.log(`  First seg HE: ${data.segments?.[0]?.he?.substring(0, 60)}`);
  console.log(`  First seg EN: ${data.segments?.[0]?.en?.substring(0, 60)}`);
}

// Check how many files exist
const files = fs.readdirSync(p1Dir);
console.log(`\nFiles in part-1: ${files.length}`);
console.log('Data files:', files.filter(f => f.startsWith('torah-')).length);

// Check Fires of Israel
const foiDir = '/root/ajew-org/public/reader/fires-of-israel';
const foiIdx = JSON.parse(fs.readFileSync(path.join(foiDir, 'index.json'), 'utf8'));

console.log('\n=== Fires of Israel ===');
console.log('Total entries:', foiIdx.torahs?.length);
console.log('First 5 entries:');
for (const t of (foiIdx.torahs || []).slice(0, 5)) {
  console.log(`  #${t.number}: ${t.title?.substring(0, 50)}`);
}

// Check a sample FOI file
const foiSample = path.join(foiDir, 'section-1.json');
if (fs.existsSync(foiSample)) {
  const data = JSON.parse(fs.readFileSync(foiSample, 'utf8'));
  console.log(`\nSample file (section-1.json):`);
  console.log(`  Segments: ${data.segments?.length}`);
  if (data.segments?.length > 0) {
    console.log(`  First seg HE: ${data.segments[0].he?.substring(0, 60)}`);
    console.log(`  First seg EN: ${data.segments[0].en?.substring(0, 60)}`);
  }
}

// Check how many FOI files exist
const foiFiles = fs.readdirSync(foiDir);
console.log(`\nFiles in FOI: ${foiFiles.length}`);
console.log('Data files:', foiFiles.filter(f => f.startsWith('section-')).length);
