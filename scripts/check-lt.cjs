#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check part 1
const idx1 = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-1/index.json','utf8'));
const files1 = fs.readdirSync('public/reader/likutay-tefilos/part-1/').filter(f => f.startsWith('prayer-') && f.endsWith('.json'));
const indexed1 = new Set(idx1.torahs.map(t => t.number));
const extra1 = files1.filter(f => !indexed1.has(parseInt(f.replace('prayer-', '').replace('.json', ''))));
const missing1 = [...indexed1].filter(n => !files1.includes(`prayer-${n}.json`));

console.log('=== Part 1 ===');
console.log('Indexed:', idx1.torahs.length, 'Files:', files1.length);
console.log('Extra files:', extra1.length, extra1.slice(0,5).join(', '));
console.log('Missing files:', missing1.length, missing1.slice(0,5).join(', '));

// Check a sample prayer file
const sample = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-1/prayer-1.json','utf8'));
console.log('\nSample prayer-1:');
console.log('  title:', sample.title);
console.log('  hebrewTitle:', sample.hebrewTitle);
console.log('  segments:', sample.segments.length);
const hasEn = sample.segments.some(s => s.en && s.en.trim().length > 0);
console.log('  hasEnglish:', hasEn);
if (sample.segments.length > 0) {
  console.log('  seg[0] he:', sample.segments[0].he.substring(0, 60));
  console.log('  seg[0] en:', sample.segments[0].en ? sample.segments[0].en.substring(0, 60) : 'NONE');
}

// Check part 2
const idx2 = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-2/index.json','utf8'));
const files2 = fs.readdirSync('public/reader/likutay-tefilos/part-2/').filter(f => f.startsWith('prayer-') && f.endsWith('.json'));
const indexed2 = new Set(idx2.torahs.map(t => t.number));
const extra2 = files2.filter(f => !indexed2.has(parseInt(f.replace('prayer-', '').replace('.json', ''))));
const missing2 = [...indexed2].filter(n => !files2.includes(`prayer-${n}.json`));

console.log('\n=== Part 2 ===');
console.log('Indexed:', idx2.torahs.length, 'Files:', files2.length);
console.log('Extra files:', extra2.length, extra2.slice(0,5).join(', '));
console.log('Missing files:', missing2.length, missing2.slice(0,5).join(', '));

// Check a sample prayer file from part 2
const sample2 = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-2/prayer-1.json','utf8'));
console.log('\nSample prayer-1 (part 2):');
console.log('  title:', sample2.title);
console.log('  hebrewTitle:', sample2.hebrewTitle);
console.log('  segments:', sample2.segments.length);
const hasEn2 = sample2.segments.some(s => s.en && s.en.trim().length > 0);
console.log('  hasEnglish:', hasEn2);
