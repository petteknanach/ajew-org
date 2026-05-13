#!/usr/bin/env node
/**
 * LT English extraction - TRULY FINAL version.
 * 
 * Properly extracts paired English-Hebrew paragraphs from HTML.
 * Matches each HTML Hebrew to JSON segment by content.
 * Assigns English to ALL matching JSON segments.
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
  
  // Find all para blocks by tracking div nesting depth
  let searchIdx = 0;
  while (true) {
    const paraStart = html.indexOf('<div class="para">', searchIdx);
    if (paraStart < 0) break;
    
    // Find the matching closing </div> by tracking nesting
    let depth = 1;
    let pos = paraStart + 18; // length of '<div class="para">'
    while (depth > 0 && pos < html.length) {
      const nextOpen = html.indexOf('<div', pos);
      const nextClose = html.indexOf('</div>', pos);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) {
          // Found the matching close
          const block = html.substring(paraStart + 18, nextClose);
          
          // Extract English from <p>
          const enMatch = block.match(/<p>([\s\S]*?)<\/p>/);
          // Extract Hebrew from heb-text div
          const heMatch = block.match(/<div\s+class="heb-text"[^>]*>([\s\S]*?)<\/div>/);
          
          if (enMatch) {
            let en = stripHtml(enMatch[1]);
            // Remove heb-btn text
            en = en.replace(/^[\u0590-\u05FF\s▾]+/, '').trim();
            const he = heMatch ? stripHtml(heMatch[1]) : '';
            if (en.length > 10) pairs.push({ en, he });
          }
          
          searchIdx = nextClose + 6;
          break;
        }
        pos = nextClose + 6;
      }
    }
    if (depth > 0) searchIdx = pos; // avoid infinite loop
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
  
  // Determine prayer number(s)
  let prayerNums = [];
  let m;
  
  m = base.match(/prayer(\d+)/i);
  if (m) prayerNums = [parseInt(m[1])];
  
  if (!prayerNums.length) {
    m = base.match(/_(\d+)_prayer/i) || base.match(/(\d+)\.html$/);
    if (m) prayerNums = [parseInt(m[1])];
  }
  
  // Multi-prayer files
  if (!prayerNums.length) {
    m = base.match(/prayers?(\d+)_(\d+)_(\d+)/i);
    if (m) prayerNums = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  }
  if (!prayerNums.length) {
    m = base.match(/prayers?(\d+)_(\d+)/i) || base.match(/b2_prayers?(\d+)_(\d+)/i);
    if (m) {
      for (let i = parseInt(m[1]); i <= parseInt(m[2]); i++) prayerNums.push(i);
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
  
  if (prayerNums.length === 0) return;
  
  // For multi-prayer files, split paragraphs by heading positions
  if (prayerNums.length > 1) {
    const headingRegex = /<div\s+class="prayer-heading">\s*Prayer\s+/gi;
    const headings = [];
    while ((m = headingRegex.exec(html)) !== null) headings.push(m.index);
    
    // Find para start positions
    const paraPositions = [];
    let searchIdx = 0;
    while (true) {
      const idx = html.indexOf('<div class="para">', searchIdx);
      if (idx < 0) break;
      paraPositions.push(idx);
      searchIdx = idx + 18;
    }
    
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
  } else {
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
        const prefixLen = Math.min(40, jsonHe.length, htmlHe.length);
        if (prefixLen < 10) continue;
        
        if (htmlHe.substring(0, prefixLen) === jsonHe.substring(0, prefixLen)) {
          const score = 1.0 + (jsonHe.length / 1000);
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
  console.log('=== LT English Extraction (Truly Final) ===\n');
  
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
