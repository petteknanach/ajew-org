#!/usr/bin/env node
/**
 * LT English extraction - FINAL correct version.
 * 
 * Key insight: Each HTML <div class="para"> contains:
 *   - English text in <p>
 *   - Hebrew text in <div class="heb-text">
 * 
 * The JSON has M segments, the HTML has N paragraphs (N <= M).
 * Each HTML paragraph's Hebrew text corresponds to one or more JSON segments.
 * 
 * Strategy: For each JSON content segment, find the HTML paragraph whose Hebrew
 * best matches it (by prefix), and assign that paragraph's English.
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
      let en = stripHtml(enMatch[1]);
      // Remove heb-btn text (e.g. "עברית ▾")
      en = en.replace(/^[\u0590-\u05FF\s▾]+/, '').trim();
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

function normalize(s) {
  return s.replace(/\s+/g, '').trim();
}

function processFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const allParas = extractPairedParagraphs(html);
  if (allParas.length === 0) return;
  
  const base = path.basename(filePath, '.html');
  
  // Determine which prayers are in this file
  let prayerNums = [];
  
  // Single prayer: "prayer15", "15_prayer15", "15.html"
  let m = base.match(/prayer(\d+)/i);
  if (m) prayerNums = [parseInt(m[1])];
  
  if (!prayerNums.length) {
    m = base.match(/_(\d+)_prayer/i);
    if (m) prayerNums = [parseInt(m[1])];
  }
  
  if (!prayerNums.length) {
    m = base.match(/(\d+)\.html$/);
    if (m) prayerNums = [parseInt(m[1])];
  }
  
  // Multi-prayer: split by headings
  if (!prayerNums.length) {
    // Find all heading positions
    const headingRegex = /<div\s+class="prayer-heading">\s*Prayer\s+/gi;
    const headings = [];
    while ((m = headingRegex.exec(html)) !== null) headings.push(m.index);
    
    // Find all para positions
    const paraRegex = /<div\s+class="para">\s*<p>/gi;
    const paraPositions = [];
    while ((m = paraRegex.exec(html)) !== null) paraPositions.push(m.index);
    
    // Get prayer numbers from filename range
    m = base.match(/prayers?(\d+)_(\d+)_(\d+)/i);
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
    
    // Split paragraphs by heading
    if (prayerNums.length > 1 && headings.length > 0) {
      for (let p = 0; p < prayerNums.length; p++) {
        const start = headings[p] || 0;
        const end = headings[p + 1] || html.length;
        const indices = [];
        for (let i = 0; i < paraPositions.length; i++) {
          if (paraPositions[i] >= start && paraPositions[i] < end) indices.push(i);
        }
        const prs = indices.map(i => allParas[i]).filter(Boolean);
        if (prs.length > 0) applyToPrayer(prayerNums[p], prs);
      }
      return;
    }
  }
  
  if (prayerNums.length === 1) {
    applyToPrayer(prayerNums[0], allParas);
  }
}

function applyToPrayer(prayerNum, pairs) {
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
    
    // For each JSON content segment, find the best matching HTML paragraph
    // by checking if the JSON Hebrew is a prefix of the HTML Hebrew
    for (let i = 0; i < segs.length; i++) {
      if (isDateMarker(segs[i].he)) continue;
      
      const jsonHe = normalize(segs[i].he);
      if (jsonHe.length < 5) continue;
      
      // Find the HTML paragraph whose Hebrew starts with the same text
      let bestPara = null;
      let bestScore = 0;
      
      for (const pair of pairs) {
        const htmlHe = normalize(pair.he);
        if (htmlHe.length < 5) continue;
        
        // Check if JSON Hebrew is a prefix of HTML Hebrew
        if (htmlHe.startsWith(jsonHe.substring(0, Math.min(30, jsonHe.length)))) {
          // Score by how much of the HTML Hebrew is covered
          const coverage = jsonHe.length / htmlHe.length;
          const score = 1.0 + coverage;
          if (score > bestScore) {
            bestScore = score;
            bestPara = pair;
          }
        }
      }
      
      if (bestPara) {
        segs[i].en = bestPara.en;
      }
    }
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  }
}

function main() {
  console.log('=== LT English Extraction (Final) ===\n');
  
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
