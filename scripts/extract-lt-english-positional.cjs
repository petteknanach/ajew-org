#!/usr/bin/env node
/**
 * LT English extraction - POSITIONAL matching.
 * 
 * The HTML paragraphs and JSON content segments are in the same order.
 * We just need to skip date markers in the JSON and match 1:1 by position.
 * 
 * For prayers where HTML has fewer paragraphs than JSON segments,
 * the remaining JSON segments get no English (they're sub-sections without
 * separate translation in the HTML).
 */

const fs = require('fs');
const path = require('path');

const LT1_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1';
const LT2_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2';
const LT_TEACHINGS_DIR = '/root/ajew-org/public/teachings/likutay-tefilos';
const PART1_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-1';
const PART2_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-2';

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)))
    .replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, ''));
}

function extractEnglishParagraphs(html) {
  const paragraphs = [];
  const paraRegex = /<div\s+class="para">\s*<p>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = paraRegex.exec(html)) !== null) {
    const en = stripHtml(match[1]);
    if (en.length > 10) paragraphs.push(en);
  }
  return paragraphs;
}

function isDateMarker(he) {
  if (!he) return false;
  const t = he.trim();
  if (t.length > 60) return false;
  return /^[\u0590-\u05FF\s\d\u05F3]{1,30}$/.test(t);
}

function getPrayerNumFromFilename(filename) {
  const base = filename.replace('.html', '');
  // "prayer15" -> 15
  let m = base.match(/prayer(\d+)/i);
  if (m) return parseInt(m[1]);
  // "15_prayer15" -> 15
  m = base.match(/_(\d+)_prayer/i);
  if (m) return parseInt(m[1]);
  // "15.html" -> 15
  m = base.match(/^(\d+)\.html$/);
  if (m) return parseInt(m[1]);
  // "108_152_complete" -> range, return null
  m = base.match(/(\d+)_(\d+)/);
  if (m) return null; // multi-prayer file
  return null;
}

function getPrayerRangeFromFilename(filename) {
  const base = filename.replace('.html', '');
  // "prayers32_33_34" -> [32,33,34]
  let m = base.match(/prayers?(\d+)_(\d+)_(\d+)/i);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  // "prayers1_3" -> [1,2,3]
  m = base.match(/prayers?(\d+)_(\d+)/i);
  if (m) {
    const start = parseInt(m[1]), end = parseInt(m[2]);
    if (end > start && end - start < 200) {
      const range = [];
      for (let i = start; i <= end; i++) range.push(i);
      return range;
    }
  }
  // "b2_prayers1_3" -> [1,2,3]
  m = base.match(/b2_prayers?(\d+)_(\d+)/i);
  if (m) {
    const start = parseInt(m[1]), end = parseInt(m[2]);
    const range = [];
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }
  // "81_92" or "108_152_complete" -> range
  m = base.match(/_(\d+)_(\d+)(?:_complete|_range)?$/);
  if (m) {
    const start = parseInt(m[1]), end = parseInt(m[2]);
    if (end > start && end - start < 200) {
      const range = [];
      for (let i = start; i <= end; i++) range.push(i);
      return range;
    }
  }
  return null;
}

function processFile(filePath) {
  const filename = path.basename(filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const allParas = extractEnglishParagraphs(html);
  
  if (allParas.length === 0) return;
  
  // Check if this is a multi-prayer file
  const range = getPrayerRangeFromFilename(filename);
  const singleNum = getPrayerNumFromFilename(filename);
  
  if (range && range.length > 1) {
    // Split paragraphs by heading positions
    const headingRegex = /<div\s+class="prayer-heading">\s*Prayer\s+/gi;
    const headings = [];
    let m;
    while ((m = headingRegex.exec(html)) !== null) {
      headings.push(m.index);
    }
    
    // Split paragraphs by heading positions
    const paraRegex = /<div\s+class="para">\s*<p>/gi;
    const paraPositions = [];
    while ((m = paraRegex.exec(html)) !== null) {
      paraPositions.push(m.index);
    }
    
    for (let p = 0; p < range.length; p++) {
      const prayerNum = range[p];
      const startPos = headings[p] || 0;
      const endPos = headings[p + 1] || html.length;
      
      // Get paragraphs between this heading and the next
      const prayerParas = [];
      for (let i = 0; i < paraPositions.length; i++) {
        if (paraPositions[i] >= startPos && paraPositions[i] < endPos) {
          prayerParas.push(allParas[i]);
        }
      }
      
      if (prayerParas.length > 0) {
        applyToPrayer(prayerNum, prayerParas);
      }
    }
  } else if (singleNum) {
    applyToPrayer(singleNum, allParas);
  }
}

function applyToPrayer(prayerNum, paragraphs) {
  for (const partNum of [1, 2]) {
    const jsonPath = path.join(partNum === 1 ? PART1_DIR : PART2_DIR, `prayer-${prayerNum}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const segs = data.segments;
    if (!segs) continue;
    
    // Get content segment indices (skip date markers)
    const contentIndices = [];
    for (let i = 0; i < segs.length; i++) {
      if (!isDateMarker(segs[i].he)) contentIndices.push(i);
    }
    
    // Clear existing English for content segments
    for (const idx of contentIndices) {
      segs[idx].en = '';
    }
    
    // Assign English paragraphs to content segments by position
    // If more paragraphs than segments, combine extras into last segment
    // If more segments than paragraphs, leave extras empty
    for (let i = 0; i < paragraphs.length; i++) {
      if (i < contentIndices.length) {
        segs[contentIndices[i]].en = paragraphs[i];
      } else {
        // Extra paragraphs - append to last content segment
        const lastIdx = contentIndices[contentIndices.length - 1];
        segs[lastIdx].en += '\n\n' + paragraphs[i];
      }
    }
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  }
}

function main() {
  console.log('=== LT English Extraction (Positional) ===\n');
  
  const dirs = [LT1_DIR, LT2_DIR, LT_TEACHINGS_DIR];
  let filesProcessed = 0;
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
    for (const file of files) {
      processFile(path.join(dir, file));
      filesProcessed++;
    }
  }
  
  console.log(`Processed ${filesProcessed} HTML files\n`);
  
  // Count results
  let totalEmpty = 0, totalFilled = 0, totalSegs = 0;
  
  for (const part of [1, 2]) {
    const dir = part === 1 ? PART1_DIR : PART2_DIR;
    for (let num = (part === 1 ? 1 : 1); num <= (part === 1 ? 151 : 59); num++) {
      const p = path.join(dir, `prayer-${num}.json`);
      if (!fs.existsSync(p)) continue;
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const seg of data.segments) {
        totalSegs++;
        if (seg.en && seg.en.trim()) {
          totalFilled++;
        } else if (!isDateMarker(seg.he)) {
          totalEmpty++;
        }
      }
    }
  }
  
  console.log(`Total segments: ${totalSegs}`);
  console.log(`Filled: ${totalFilled}`);
  console.log(`Empty (content): ${totalEmpty}`);
}

main();
