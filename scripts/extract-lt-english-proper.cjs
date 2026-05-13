#!/usr/bin/env node
/**
 * LT English extraction - PROPER version.
 * 
 * For each HTML file:
 * 1. Extract paired English-Hebrew paragraphs
 * 2. For each pair, find the matching JSON segment by Hebrew text comparison
 * 3. Assign English to the correct segment
 * 
 * This ensures proper 1:1 pairing of English with Hebrew.
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
  // Find all para blocks
  const paraRegex = /<div\s+class="para">([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = paraRegex.exec(html)) !== null) {
    const block = match[1];
    // Extract English from <p>
    const enMatch = block.match(/<p>([\s\S]*?)<\/p>/);
    // Extract Hebrew from heb-text div
    const heMatch = block.match(/<div\s+class="heb-text"[^>]*>([\s\S]*?)<\/div>/);
    if (enMatch) {
      const en = stripHtml(enMatch[1]);
      const he = heMatch ? stripHtml(heMatch[1]) : '';
      if (en.length > 10) {
        pairs.push({ en, he });
      }
    }
  }
  return pairs;
}

function hebrewSimilarity(a, b) {
  if (!a || !b) return 0;
  // Normalize: remove spaces and compare
  const na = a.replace(/\s+/g, '').trim();
  const nb = b.replace(/\s+/g, '').trim();
  // Exact match
  if (na === nb) return 1.0;
  // Check if one starts with the other (for partial matches)
  const minLen = Math.min(na.length, nb.length);
  if (minLen < 10) return 0;
  const prefixLen = Math.min(30, minLen);
  if (na.substring(0, prefixLen) === nb.substring(0, prefixLen)) return 0.95;
  // Count matching characters from start
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (na[i] === nb[i]) matches++;
    else break;
  }
  return matches / minLen;
}

function isDateMarker(he) {
  if (!he) return false;
  const t = he.trim();
  if (t.length > 60) return false;
  return /^[\u0590-\u05FF\s\d\u05F3]{1,30}$/.test(t);
}

function processHtmlFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const pairs = extractPairedParagraphs(html);
  
  if (pairs.length === 0) return;
  
  // Determine prayer number from filename
  const base = path.basename(filePath, '.html');
  const numMatch = base.match(/prayer[s_]*(\d+)/i) || base.match(/_(\d+)_prayer/i) || base.match(/(\d+)\.html$/);
  if (!numMatch) return;
  const prayerNum = parseInt(numMatch[1]);
  
  // Try both parts
  for (const partNum of [1, 2]) {
    const jsonPath = path.join(partNum === 1 ? PART1_DIR : PART2_DIR, `prayer-${prayerNum}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const segs = data.segments;
    if (!segs) continue;
    
    // Clear existing English for content segments
    for (const seg of segs) {
      if (!isDateMarker(seg.he)) {
        seg.en = '';
      }
    }
    
    // For each HTML pair, find the best matching JSON segment
    for (const pair of pairs) {
      let bestIdx = -1;
      let bestScore = 0;
      
      for (let i = 0; i < segs.length; i++) {
        if (isDateMarker(segs[i].he)) continue;
        const score = hebrewSimilarity(pair.he, segs[i].he);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      
      if (bestIdx >= 0 && bestScore > 0.5) {
        segs[bestIdx].en = pair.en;
      }
    }
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  }
}

function main() {
  console.log('=== LT English Extraction (Proper Pairing) ===\n');
  
  const dirs = [LT1_DIR, LT2_DIR, LT_TEACHINGS_DIR];
  let filesProcessed = 0;
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
    for (const file of files) {
      processHtmlFile(path.join(dir, file));
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
