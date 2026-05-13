#!/usr/bin/env node
/**
 * Fix Fires of Israel data structure.
 * Current: alternating segments (HE, EN, HE, EN...)
 * Target: each segment has both HE and EN
 */
const fs = require('fs');
const path = require('path');

const foiDir = '/root/ajew-org/public/reader/fires-of-israel';
const idx = JSON.parse(fs.readFileSync(path.join(foiDir, 'index.json'), 'utf8'));

let fixed = 0;

for (const t of idx.torahs) {
  const filePath = path.join(foiDir, `section-${t.number}.json`);
  if (!fs.existsSync(filePath)) continue;
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segments = data.segments || [];
  
  // Check if we need to fix (alternating HE/EN pattern)
  const hasAlternatingPattern = segments.length > 1 && 
    segments.some(s => s.he && s.he.trim().length > 0 && (!s.en || s.en.trim().length === 0)) &&
    segments.some(s => s.en && s.en.trim().length > 0 && (!s.he || s.he.trim().length === 0));
  
  if (!hasAlternatingPattern) continue;
  
  // Pair segments: odd segments have HE, even segments have EN
  // Create new segments array where each segment has both HE and EN
  const newSegments = [];
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const he = (seg.he || '').trim();
    const en = (seg.en || '').trim();
    
    if (he.length > 0 && en.length > 0) {
      // Already paired
      newSegments.push({ ...seg, index: newSegments.length + 1 });
    } else if (he.length > 0) {
      // Hebrew only - look for matching English in next segment
      const nextSeg = segments[i + 1];
      const nextEn = nextSeg ? (nextSeg.en || '').trim() : '';
      
      if (nextEn.length > 0) {
        // Pair them
        newSegments.push({
          index: newSegments.length + 1,
          he,
          he_nikud: seg.he_nikud || he,
          en: nextEn,
        });
        i++; // Skip the next segment (already paired)
      } else {
        // No matching English
        newSegments.push({
          index: newSegments.length + 1,
          he,
          he_nikud: seg.he_nikud || he,
          en: '',
        });
      }
    } else if (en.length > 0) {
      // English only - look for matching Hebrew in previous (already handled)
      // If we get here, it's an orphan EN
      newSegments.push({
        index: newSegments.length + 1,
        he: '',
        en,
      });
    }
    // Skip empty segments
  }
  
  data.segments = newSegments;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  fixed++;
}

console.log(`Fixed ${fixed} FOI files`);

// Verify
const sampleFile = path.join(foiDir, 'section-1.json');
const sample = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
console.log(`\nSample (section-1): ${sample.segments.length} segments`);
for (let i = 0; i < Math.min(3, sample.segments.length); i++) {
  const seg = sample.segments[i];
  console.log(`  Seg ${i}: HE(${seg.he?.length || 0}) EN(${seg.en?.length || 0})`);
}
