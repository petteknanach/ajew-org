#!/usr/bin/env node
/**
 * LT English extraction from HTML source files - v2.
 * 
 * Properly handles multi-prayer HTML files by splitting them into individual prayers.
 */

const fs = require('fs');
const path = require('path');

// Source directories (WSL paths)
const LT1_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1';
const LT2_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2';
const LT_TEACHINGS_DIR = '/root/ajew-org/public/teachings/likutay-tefilos';

// Target JSON directories
const PART1_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-1';
const PART2_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-2';

function extractEnglishParagraphsFromHtml(html) {
  const paragraphs = [];
  
  // Find all <div class="para"> blocks with <p> tags
  const paraRegex = /<div\s+class="para">\s*<p>([\s\S]*?)<\/p>/gi;
  let match;
  
  while ((match = paraRegex.exec(html)) !== null) {
    let text = match[1];
    
    // Remove the heb-btn span (the "עברית ▾" toggle button)
    text = text.replace(/<span[^>]*class="heb-btn"[^>]*>[^<]*<\/span>/gi, '');
    
    // Remove span tags but keep their content
    text = text.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
    
    // Remove em/i/b tags but keep content
    text = text.replace(/<\/?(em|i|b|strong|br)\s*\/?>/gi, '');
    
    // Remove any remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
      .replace(/&middot;/g, '·');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    if (text.length > 10) {
      paragraphs.push(text);
    }
  }
  
  return paragraphs;
}

function splitMultiPrayerHtml(html) {
  // Split HTML into individual prayers
  // Each prayer starts with a masthead: <div id="masthead">...Prayer N...</div>
  
  const prayers = new Map(); // prayerNum -> html segment
  
  // Find all prayer headers in mastheads
  // Pattern: <div id=" masthead">...Prayer N...</div> or <div id="masthead">...Prayer N...</div>
  const mastheadRegex = /<div\s+id="masthead">\s*<div[^>]*>[^<]*<\/div>\s*<h1>([^<]*)<\/h1>/gi;
  
  const mastheads = [];
  let match;
  while ((match = mastheadRegex.exec(html)) !== null) {
    const h1 = match[1];
    // Extract prayer number from h1 text like "Prayer Thirty · תְּפִלָּה ל׳" or "Prayer 30"
    const numMatch = h1.match(/Prayer\s+(\d+)/i);
    if (numMatch) {
      mastheads.push({ num: parseInt(numMatch[1]), idx: match.index });
    }
  }
  
  // If no mastheads found with this pattern, try simpler h1 search
  if (mastheads.length === 0) {
    const simpleH1 = /<h1>[^<]*[Pp]rayer\s+(\d+)[^<]*<\/h1>/gi;
    while ((match = simpleH1.exec(html)) !== null) {
      mastheads.push({ num: parseInt(match[1]), idx: match.index });
    }
  }
  
  // Split by masthead positions
  for (let i = 0; i < mastheads.length; i++) {
    const start = mastheads[i].idx;
    const end = i < mastheads.length - 1 ? mastheads[i + 1].idx : html.length;
    const prayerHtml = html.substring(start, end);
    prayers.set(mastheads[i].num, prayerHtml);
  }
  
  return prayers;
}

function buildHtmlPrayerMap() {
  // Build a map: prayerNum -> html content (just that prayer)
  const prayerMap = new Map();
  
  const dirs = [
    { dir: LT1_DIR, part: 1 },
    { dir: LT2_DIR, part: 2 },
    { dir: LT_TEACHINGS_DIR, part: 1 },
  ];
  
  for (const { dir } of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // Check if this is a multi-prayer file
      const prayerCount = (html.match(/<div\s+id="masthead">/g) || []).length;
      
      if (prayerCount > 1) {
        // Multi-prayer file - split it
        const split = splitMultiPrayerHtml(html);
        for (const [num, ph] of split) {
          if (!prayerMap.has(num)) {
            prayerMap.set(num, ph);
          }
        }
      } else {
        // Single prayer file - extract prayer number from filename
        const numMatch = file.match(/prayer(?:s?)_?(\d+)/i) || file.match(/prayer(\d+)/i) || file.match(/_(\d+)_prayer/i);
        if (numMatch) {
          const num = parseInt(numMatch[1]);
          if (!prayerMap.has(num)) {
            prayerMap.set(num, html);
          }
        }
      }
    }
  }
  
  return prayerMap;
}

function isDateMarker(he) {
  if (!he) return false;
  const trimmed = he.trim();
  if (trimmed.length > 60) return false;
  // Hebrew date markers: יד כסלו, טו כסלו, etc.
  if (/^[\u0590-\u05FF\s\d]{2,15}$/.test(trimmed)) return true;
  return false;
}

function processPrayer(prayerNum, partNum, html) {
  const englishParas = extractEnglishParagraphsFromHtml(html);
  
  if (englishParas.length === 0) {
    return { ok: false, reason: 'No English paragraphs' };
  }
  
  const jsonDir = partNum === 1 ? PART1_DIR : PART2_DIR;
  const jsonPath = path.join(jsonDir, `prayer-${prayerNum}.json`);
  
  if (!fs.existsSync(jsonPath)) {
    return { ok: false, reason: 'JSON not found' };
  }
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const segments = data.segments;
  
  // Identify content segments (skip date markers)
  const contentIndices = [];
  for (let i = 0; i < segments.length; i++) {
    if (!isDateMarker(segments[i].he)) {
      contentIndices.push(i);
    }
  }
  
  if (contentIndices.length === 0) {
    return { ok: false, reason: 'No content segments' };
  }
  
  // Clear existing English
  for (const seg of segments) {
    seg.en = '';
  }
  
  // Assign English to content segments
  if (englishParas.length <= contentIndices.length) {
    for (let i = 0; i < englishParas.length; i++) {
      segments[contentIndices[i]].en = englishParas[i];
    }
    // Remaining paras go to last content segment
    // (handled below)
  } else {
    // More paragraphs than segments - distribute
    const parasPerSeg = Math.ceil(englishParas.length / contentIndices.length);
    let paraIdx = 0;
    for (let i = 0; i < contentIndices.length; i++) {
      const endIdx = Math.min(paraIdx + parasPerSeg, englishParas.length);
      segments[contentIndices[i]].en = englishParas.slice(paraIdx, endIdx).join('\n\n');
      paraIdx = endIdx;
    }
    if (paraIdx < englishParas.length) {
      const lastIdx = contentIndices[contentIndices.length - 1];
      const extra = englishParas.slice(paraIdx).join('\n\n');
      segments[lastIdx].en = segments[lastIdx].en ? segments[lastIdx].en + '\n\n' + extra : extra;
    }
  }
  
  const filled = segments.filter(s => s.en && s.en.trim().length > 0).length;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  
  return { ok: true, filled, total: segments.length, paras: englishParas.length };
}

function main() {
  console.log('=== LT English Extraction v2 ===\n');
  
  const htmlMap = buildHtmlPrayerMap();
  console.log(`HTML source covers ${htmlMap.size} prayers\n`);
  
  let processed = 0, filled = 0, skipped = 0;
  const skipReasons = {};
  
  // Part 1: prayers 0-151
  for (let num = 0; num <= 151; num++) {
    const html = htmlMap.get(num);
    if (!html) { skipped++; skipReasons[num] = 'no HTML'; continue; }
    const r = processPrayer(num, 1, html);
    if (r.ok) { filled++; } else { skipped++; skipReasons[num] = r.reason; }
    processed++;
  }
  
  // Part 2: prayers 1-59
  for (let num = 1; num <= 59; num++) {
    const html = htmlMap.get(num);
    if (!html) { skipped++; skipReasons[`2:${num}`] = 'no HTML'; continue; }
    const r = processPrayer(num, 2, html);
    if (r.ok) { filled++; } else { skipped++; skipReasons[`2:${num}`] = r.reason; }
    processed++;
  }
  
  console.log(`\nFilled: ${filled}, Skipped: ${skipped}`);
  
  // Show which prayers are missing
  const missing = Object.entries(skipReasons).filter(([k,v]) => v === 'no HTML');
  if (missing.length > 0) {
    console.log(`\nMissing HTML for prayers: ${missing.map(m => m[0]).join(', ')}`);
  }
}

main();
