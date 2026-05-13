#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check all prayer files for issues
const part1Dir = 'public/reader/likutay-tefilos/part-1';
const part2Dir = 'public/reader/likutay-tefilos/part-2';
const idx1 = JSON.parse(fs.readFileSync(path.join(part1Dir, 'index.json'), 'utf8'));
const idx2 = JSON.parse(fs.readFileSync(path.join(part2Dir, 'index.json'), 'utf8'));

function checkPart(idx, partDir, partNum) {
  const issues = [];
  
  for (const t of idx.torahs) {
    const filePath = path.join(partDir, `prayer-${t.number}.json`);
    
    // Check file exists
    if (!fs.existsSync(filePath)) {
      issues.push(`MISSING: prayer-${t.number}.json`);
      continue;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Check navigation links
      if (data.navigation) {
        const nav = data.navigation;
        if (t.number > 1 && !nav.prevUrl) {
          issues.push(`PRAYER ${t.number}: missing prevUrl`);
        }
        if (t.number < idx.torahs.length && !nav.nextUrl) {
          issues.push(`PRAYER ${t.number}: missing nextUrl`);
        }
        
        // Check URL format
        if (nav.prevUrl && !nav.prevUrl.includes(`/reader/likutay-tefilos/`)) {
          issues.push(`PRAYER ${t.number}: bad prevUrl: ${nav.prevUrl}`);
        }
        if (nav.nextUrl && !nav.nextUrl.includes(`/reader/likutay-tefilos/`)) {
          issues.push(`PRAYER ${t.number}: bad nextUrl: ${nav.nextUrl}`);
        }
      }
      
      // Check for empty content
      const contentSegs = data.segments.filter(s => s.he && s.he.trim().length > 10);
      if (contentSegs.length === 0) {
        issues.push(`PRAYER ${t.number}: EMPTY (no content segments)`);
      }
      
      // Check for missing English
      const enSegs = data.segments.filter(s => s.en && s.en.trim().length > 10);
      if (contentSegs.length > 0 && enSegs.length === 0) {
        issues.push(`PRAYER ${t.number}: no English (${contentSegs.length} HE segments)`);
      }
      
    } catch (e) {
      issues.push(`PRAYER ${t.number}: ERROR reading file: ${e.message}`);
    }
  }
  
  return issues;
}

console.log('=== Part 1 Issues ===');
const issues1 = checkPart(idx1, part1Dir, 1);
for (const i of issues1) console.log(`  ${i}`);
console.log(`Total: ${issues1.length} issues`);

console.log('\n=== Part 2 Issues ===');
const issues2 = checkPart(idx2, part2Dir, 2);
for (const i of issues2) console.log(`  ${i}`);
console.log(`Total: ${issues2.length} issues`);
