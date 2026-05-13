#!/usr/bin/env node
/**
 * LT English extraction - HEBREW CONTENT matching.
 * 
 * For each HTML paragraph, we have both English and Hebrew text.
 * We match each HTML Hebrew to the best JSON segment by content similarity.
 * This handles cases where the JSON has more segments than HTML paragraphs
 * (by assigning the same English to multiple segments that share the same Hebrew opening).
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

function extractPairedParagraphs(html) {
  const pairs = [];
  const paraRegex = /<div\s+class="para">([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = paraRegex.exec(html)) !== null) {
    const block = match[1];
    const enMatch = block.match(/<p>([\s\S]*?)<\/p>/);
    const heMatch = block.match(/<div\s+class="heb-text"[^>]*>([\s\S]*?)<\/div>/);
    if (enMatch) {
      const en = stripHtml(enMatch[1]).replace(/^עברית ▾\s*/, ''); // Remove heb-btn text
      const he = heMatch ? stripHtml(heMatch[1]) : '';
      if (en.length > 10) pairs.push({ en, he });
    }
  }
  return pairs;
}

function isDateMarker(he) {
  if (!he) return false;
  const t = he.trim();
  if (t.length > 60) return false;
  return /^[\u0590-\u05FF\s\d\u05F3]{1,30}$/.test(t);
}

function normalizeHe(s) {
  return s.replace(/\s+/g, '').trim();
}

function findBestMatch(htmlHe, jsonSegs, usedIndices) {
  const normHtml = normalizeHe(htmlHe);
  let bestIdx = -1;
  let bestScore = 0;
  
  for (let i = 0; i < jsonSegs.length; i++) {
    if (usedIndices.has(i)) continue;
    if (isDateMarker(jsonSegs[i].he)) continue;
    
    const normJson = normalizeHe(jsonSegs[i].he);
    if (normJson.length < 5) continue;
    
    // Check if JSON segment starts with the same text as HTML
    const prefixLen = Math.min(40, normHtml.length, normJson.length);
    if (prefixLen < 10) continue;
    
    const htmlPrefix = normHtml.substring(0, prefixLen);
    const jsonPrefix = normJson.substring(0, prefixLen);
    
    if (htmlPrefix === jsonPrefix) {
      // Strong match - same opening
      const score = 1.0 + (normJson.length / 1000); // Prefer longer matches
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    } else if (normJson.startsWith(normHtml.substring(0, Math.min(20, normHtml.length)))) {
      // Partial match
      const score = 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
  }
  
  return { idx: bestIdx, score: bestScore };
}

function processFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const pairs = extractPairedParagraphs(html);
  if (pairs.length === 0) return;
  
  // Determine prayer number(s) from filename
  const base = path.basename(filePath, '.html');
  
  // Check for range patterns
  let prayerNums = [];
  let m = base.match(/prayers?(\d+)_(\d+)_(\d+)/i);
  if (m) prayerNums = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  
  if (!prayerNums.length) {
    m = base.match(/prayers?(\d+)_(\d+)/i) || base.match(/b2_prayers?(\d+)_(\d+)/i);
    if (m) {
      const start = parseInt(m[1]), end = parseInt(m[2]);
      for (let i = start; i <= end; i++) prayerNums.push(i);
    }
  }
  
  if (!prayerNums.length) {
    m = base.match(/_(\d+)_(\d+)(?:_complete|_range)?$/);
    if (m) {
      const start = parseInt(m[1]), end = parseInt(m[2]);
      if (end > start && end - start < 200) {
        for (let i = start; i <= end; i++) prayerNums.push(i);
      }
    }
  }
  
  if (!prayerNums.length) {
    m = base.match(/prayer[s_]*(\d+)/i) || base.match(/_(\d+)_prayer/i) || base.match(/(\d+)\.html$/);
    if (m) prayerNums = [parseInt(m[1])];
  }
  
  if (prayerNums.length === 0) return;
  
  // For multi-prayer files, split paragraphs by heading positions
  let prayerPairs = {}; // prayerNum -> pairs[]
  
  if (prayerNums.length > 1) {
    const headingRegex = /<div\s+class="prayer-heading">\s*Prayer\s+/gi;
    const headings = [];
    while ((m = headingRegex.exec(html)) !== null) headings.push(m.index);
    
    const paraRegex = /<div\s+class="para">\s*<p>/gi;
    const paraPositions = [];
    while ((m = paraRegex.exec(html)) !== null) paraPositions.push(m.index);
    
    for (let p = 0; p < prayerNums.length; p++) {
      const start = headings[p] || 0;
      const end = headings[p + 1] || html.length;
      const indices = [];
      for (let i = 0; i < paraPositions.length; i++) {
        if (paraPositions[i] >= start && paraPositions[i] < end) indices.push(i);
      }
      prayerPairs[prayerNums[p]] = indices.map(i => pairs[i]);
    }
  } else {
    prayerPairs[prayerNums[0]] = pairs;
  }
  
  // Process each prayer
  for (const [prayerNum, prs] of Object.entries(prayerPairs)) {
    if (prs.length === 0) continue;
    
    for (const partNum of [1, 2]) {
      const jsonPath = path.join(partNum === 1 ? PART1_DIR : PART2_DIR, `prayer-${prayerNum}.json`);
      if (!fs.existsSync(jsonPath)) continue;
      
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const segs = data.segments;
      if (!segs) continue;
      
      // Clear existing English for content segments
      for (const seg of segs) {
        if (!isDateMarker(seg.he)) seg.en = '';
      }
      
      // Track which JSON segments have been assigned
      const usedIndices = new Set();
      
      // First pass: match by Hebrew content
      for (const pair of prs) {
        if (!pair || !pair.he) continue;
        const { idx, score } = findBestMatch(pair.he, segs, usedIndices);
        if (idx >= 0 && score > 0.5) {
          segs[idx].en = pair.en;
          usedIndices.add(idx);
        }
      }
      
      // Second pass: for unmatched content segments, assign English from nearest matched segment
      // This handles cases where JSON has more segments than HTML paragraphs
      let lastMatchedIdx = -1;
      for (let i = 0; i < segs.length; i++) {
        if (isDateMarker(segs[i].he)) continue;
        if (usedIndices.has(i)) {
          lastMatchedIdx = i;
        } else if (lastMatchedIdx >= 0 && !segs[i].en) {
          // Assign English from the nearest matched segment
          // Find the closest matched segment (prefer preceding, then following)
          let closestIdx = lastMatchedIdx;
          let closestDist = i - lastMatchedIdx;
          
          // Check for a closer following matched segment
          for (let j = i + 1; j < segs.length; j++) {
            if (usedIndices.has(j) && !isDateMarker(segs[j].he)) {
              if (j - i < closestDist) {
                closestIdx = j;
                closestDist = j - i;
              }
              break;
            }
          }
          
          segs[i].en = segs[closestIdx].en;
        }
      }
      
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    }
  }
}

function main() {
  console.log('=== LT English Extraction (Hebrew Content Matching) ===\n');
  
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
