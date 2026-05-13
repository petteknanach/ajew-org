#!/usr/bin/env node
/**
 * LT English extraction from HTML source files - v3.
 * 
 * Properly handles multi-prayer HTML files by splitting on prayer-heading divs.
 */

const fs = require('fs');
const path = require('path');

const LT1_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1';
const LT2_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2';
const LT_TEACHINGS_DIR = '/root/ajew-org/public/teachings/likutay-tefilos';
const PART1_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-1';
const PART2_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-2';

function extractEnglishParagraphs(html) {
  const paragraphs = [];
  const paraRegex = /<div\s+class="para">\s*<p>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = paraRegex.exec(html)) !== null) {
    let text = match[1];
    text = text.replace(/<span[^>]*class="heb-btn"[^>]*>[^<]*<\/span>/gi, '');
    text = text.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
    text = text.replace(/<\/?(em|i|b|strong|br)\s*\/?>/gi, '');
    text = text.replace(/<[^>]+>/g, '');
    text = text
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&middot;/g, '·');
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 10) paragraphs.push(text);
  }
  return paragraphs;
}

function splitMultiPrayerHtml(html) {
  const prayers = new Map();
  
  // Split on prayer-heading divs
  // Pattern: <div class="prayer-heading">Prayer N ...</div>
  const headingRegex = /<div\s+class="prayer-heading">\s*Prayer\s+([^<]+)<\/div>/gi;
  
  const headings = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const label = match[1].trim();
    // Extract number from labels like "Thirty-Two · תְּפִלָּה לב׳" or "32"
    const numMatch = label.match(/(\d+)/);
    if (numMatch) {
      headings.push({ num: parseInt(numMatch[1]), idx: match.index });
    }
  }
  
  // If no headings found, try h1 in masthead
  if (headings.length === 0) {
    const h1Regex = /<h1>[^<]*[Pp]rayer\s+(\d+)[^<]*<\/h1>/gi;
    while ((match = h1Regex.exec(html)) !== null) {
      headings.push({ num: parseInt(match[1]), idx: match.index });
    }
  }
  
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].idx;
    const end = i < headings.length - 1 ? headings[i + 1].idx : html.length;
    prayers.set(headings[i].num, html.substring(start, end));
  }
  
  return prayers;
}

function buildPrayerMap() {
  const prayerMap = new Map();
  const dirs = [LT1_DIR, LT2_DIR, LT_TEACHINGS_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // Count prayer headings
      const headingCount = (html.match(/class="prayer-heading"/g) || []).length;
      
      if (headingCount > 1) {
        // Multi-prayer file
        const split = splitMultiPrayerHtml(html);
        for (const [num, ph] of split) {
          if (!prayerMap.has(num)) prayerMap.set(num, ph);
        }
      } else if (headingCount === 1) {
        // Single prayer - extract number from filename
        const numMatch = file.match(/prayer[s_]*(\d+)/i) || file.match(/_(\d+)_prayer/i) || file.match(/(\d+)\.html$/);
        if (numMatch) {
          const num = parseInt(numMatch[1]);
          if (!prayerMap.has(num)) prayerMap.set(num, html);
        }
      }
    }
  }
  
  return prayerMap;
}

function isDateMarker(he) {
  if (!he) return false;
  const t = he.trim();
  if (t.length > 60) return false;
  return /^[\u0590-\u05FF\s\d]{2,15}$/.test(t);
}

function processPrayer(num, part, html) {
  const paras = extractEnglishParagraphs(html);
  if (paras.length === 0) return { ok: false, reason: 'no paras' };
  
  const jsonPath = path.join(part === 1 ? PART1_DIR : PART2_DIR, `prayer-${num}.json`);
  if (!fs.existsSync(jsonPath)) return { ok: false, reason: 'no JSON' };
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const segs = data.segs || data.segments;
  if (!segs) return { ok: false, reason: 'no segments' };
  
  // Clear existing English
  for (const s of segs) s.en = '';
  
  // Get content segment indices (skip date markers)
  const contentIdx = [];
  for (let i = 0; i < segs.length; i++) {
    if (!isDateMarker(segs[i].he)) contentIdx.push(i);
  }
  
  if (contentIdx.length === 0) return { ok: false, reason: 'no content segs' };
  
  // Assign paragraphs to content segments
  if (paras.length <= contentIdx.length) {
    for (let i = 0; i < paras.length; i++) {
      segs[contentIdx[i]].en = paras[i];
    }
  } else {
    const perSeg = Math.ceil(paras.length / contentIdx.length);
    let p = 0;
    for (let i = 0; i < contentIdx.length; i++) {
      const end = Math.min(p + perSeg, paras.length);
      segs[contentIdx[i]].en = paras.slice(p, end).join('\n\n');
      p = end;
    }
    if (p < paras.length) {
      const last = contentIdx[contentIdx.length - 1];
      segs[last].en += '\n\n' + paras.slice(p).join('\n\n');
    }
  }
  
  const filled = segs.filter(s => s.en && s.en.trim()).length;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  return { ok: true, filled, total: segs.length, paras: paras.length };
}

function main() {
  console.log('=== LT English Extraction v3 ===\n');
  
  const htmlMap = buildPrayerMap();
  console.log(`HTML source covers ${htmlMap.size} prayers\n`);
  
  let processed = 0, filled = 0, skipped = 0;
  const missing = [];
  
  for (let num = 0; num <= 151; num++) {
    const html = htmlMap.get(num);
    if (!html) { skipped++; missing.push(`1:${num}`); continue; }
    const r = processPrayer(num, 1, html);
    if (r.ok) { filled++; } else { skipped++; missing.push(`1:${num}(${r.reason})`); }
    processed++;
  }
  
  for (let num = 1; num <= 59; num++) {
    const html = htmlMap.get(num);
    if (!html) { skipped++; missing.push(`2:${num}`); continue; }
    const r = processPrayer(num, 2, html);
    if (r.ok) { filled++; } else { skipped++; missing.push(`2:${num}(${r.reason})`); }
    processed++;
  }
  
  console.log(`\nFilled: ${filled}, Skipped: ${skipped}`);
  if (missing.length > 0) {
    console.log(`Missing: ${missing.join(', ')}`);
  }
}

main();
