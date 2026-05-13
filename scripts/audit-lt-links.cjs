#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Audit ALL LT links
const part1Dir = 'public/reader/likutay-tefilos/part-1';
const part2Dir = 'public/reader/likutay-tefilos/part-2';
const idx1 = JSON.parse(fs.readFileSync(path.join(part1Dir, 'index.json'), 'utf8'));
const idx2 = JSON.parse(fs.readFileSync(path.join(part2Dir, 'index.json'), 'utf8'));

let issues = [];

function auditPart(idx, partDir, partNum) {
  for (const t of idx.torahs) {
    const filePath = path.join(partDir, `prayer-${t.number}.json`);
    if (!fs.existsSync(filePath)) {
      issues.push(`P${partNum} #${t.number}: FILE MISSING`);
      continue;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Check navigation
    const nav = data.navigation;
    if (!nav) {
      issues.push(`P${partNum} #${t.number}: NO NAVIGATION`);
      continue;
    }
    
    // Check prevUrl
    if (t.number > 1) {
      if (!nav.prevUrl) {
        issues.push(`P${partNum} #${t.number}: MISSING prevUrl`);
      } else if (!nav.prevUrl.match(/^\/reader\/likutay-tefilos\/\d+\/\d+$/)) {
        issues.push(`P${partNum} #${t.number}: BAD prevUrl: ${nav.prevUrl}`);
      }
    }
    
    // Check nextUrl
    if (t.number < idx.torahs.length) {
      if (!nav.nextUrl) {
        issues.push(`P${partNum} #${t.number}: MISSING nextUrl`);
      } else if (!nav.nextUrl.match(/^\/reader\/likutay-tefilos\/\d+\/\d+$/)) {
        issues.push(`P${partNum} #${t.number}: BAD nextUrl: ${nav.nextUrl}`);
      }
    }
    
    // Check URL format
    if (nav.prevUrl && !nav.prevUrl.startsWith('/reader/likutay-tefilos/')) {
      issues.push(`P${partNum} #${t.number}: WRONG prevUrl FORMAT: ${nav.prevUrl}`);
    }
    if (nav.nextUrl && !nav.nextUrl.startsWith('/reader/likutay-tefilos/')) {
      issues.push(`P${partNum} #${t.number}: WRONG nextUrl FORMAT: ${nav.nextUrl}`);
    }
    
    // Check for empty content
    const contentSegs = data.segments.filter(s => s.he && s.he.trim().length > 10);
    if (contentSegs.length === 0) {
      issues.push(`P${partNum} #${t.number}: EMPTY CONTENT`);
    }
    
    // Check for missing English
    const enSegs = data.segments.filter(s => s.en && s.en.trim().length > 10);
    if (contentSegs.length > 0 && enSegs.length === 0) {
      // This is OK - some prayers may not have English yet
    }
  }
  
  // Check index URLs
  for (const t of idx.torahs) {
    const expectedUrl = `/reader/likutay-tefilos/${partNum}/${t.number}`;
    if (t.url && t.url !== expectedUrl) {
      issues.push(`P${partNum} #${t.number}: INDEX URL MISMATCH: ${t.url} vs ${expectedUrl}`);
    }
  }
}

auditPart(idx1, part1Dir, 1);
auditPart(idx2, part2Dir, 2);

console.log(`=== LT Link Audit: ${issues.length} issues ===\n`);
for (const issue of issues) {
  console.log(`  ${issue}`);
}

if (issues.length === 0) {
  console.log('  All links look correct!');
}
