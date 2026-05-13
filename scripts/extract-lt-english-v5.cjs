#!/usr/bin/env node
/**
 * LT English extraction - v5.
 * 
 * For each HTML file, extract all English paragraphs and assign to JSON segments.
 * Handles multi-prayer files by matching paragraph count to segment count.
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

function isDateMarker(he) {
  if (!he) return false;
  const t = he.trim();
  if (t.length > 60) return false;
  // Hebrew-only short text = date marker
  if (t.length < 30 && /^[\u0590-\u05FF\s\d]+$/.test(t)) return true;
  return false;
}

// Build map of HTML files to prayer numbers
function buildFileMap() {
  const fileMap = []; // [{path, prayers: [num, ...]}]
  const dirs = [LT1_DIR, LT2_DIR, LT_TEACHINGS_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const base = file.replace('.html', '');
      
      let prayers = [];
      
      // Try various patterns
      // "prayers32_33_34" -> [32,33,34]
      let m = base.match(/prayers?(\d+)_(\d+)_(\d+)/);
      if (m) { prayers = [+m[1], +m[2], +m[3]]; }
      
      // "prayers1_3" -> [1,2,3]
      if (!prayers.length) {
        m = base.match(/prayers?(\d+)_(\d+)/);
        if (m) { for (let i = +m[1]; i <= +m[2]; i++) prayers.push(i); }
      }
      
      // "prayer30" -> [30]
      if (!prayers.length) {
        m = base.match(/prayer[s_]*(\d+)/);
        if (m) { prayers = [+m[1]]; }
      }
      
      // "81_92" or "108_152_complete" -> range
      if (!prayers.length) {
        m = base.match(/_(\d+)_(\d+)(?:_complete)?$/);
        if (m && +m[2] > +m[1] && +m[2] - +m[1] < 200) {
          for (let i = +m[1]; i <= +m[2]; i++) prayers.push(i);
        }
      }
      
      // "b2_prayers1_3" -> [1,2,3]
      if (!prayers.length) {
        m = base.match(/b2_prayers?(\d+)_(\d+)/);
        if (m) { for (let i = +m[1]; i <= +m[2]; i++) prayers.push(i); }
      }
      
      if (prayers.length > 0) {
        fileMap.push({ path: filePath, prayers });
      }
    }
  }
  
  return fileMap;
}

function processFile(fileInfo) {
  const html = fs.readFileSync(fileInfo.path, 'utf8');
  const allParas = extractEnglishParagraphs(html);
  
  if (allParas.length === 0) return;
  
  // For each prayer in this file, extract its portion of paragraphs
  // Strategy: count prayer-heading divs to split paragraphs
  const headingPositions = [];
  const headingRegex = /<div\s+class="prayer-heading">/gi;
  let m;
  while ((m = headingRegex.exec(html)) !== null) {
    headingPositions.push(m.index);
  }
  
  // If multiple prayers in file, split paragraphs by heading positions
  const prayerParas = {};
  
  if (headingPositions.length <= 1) {
    // Single prayer - all paragraphs belong to the first prayer
    // But we need to figure out which prayer number this is
    // Use the file map
    if (fileInfo.prayers.length === 1) {
      prayerParas[fileInfo.prayers[0]] = allParas;
    }
  } else {
    // Multiple prayers - split paragraphs by heading positions
    // Map each paragraph to a heading based on its position in the HTML
    const paraPositions = [];
    const paraRegex = /<div\s+class="para">/gi;
    while ((m = paraRegex.exec(html)) !== null) {
      paraPositions.push(m.index);
    }
    
    // Assign each paragraph to the nearest heading
    for (let i = 0; i < paraPositions.length; i++) {
      const pPos = paraPositions[i];
      // Find which heading this paragraph belongs to
      let headingIdx = 0;
      for (let h = 0; h < headingPositions.length; h++) {
        if (pPos >= headingPositions[h]) headingIdx = h;
      }
      const prayerNum = fileInfo.prayers[headingIdx];
      if (!prayerParas[prayerNum]) prayerParas[prayerNum] = [];
      prayerParas[prayerNum].push(allParas[i]);
    }
  }
  
  // Now process each prayer
  for (const [prayerNum, paras] of Object.entries(prayerParas)) {
    const num = parseInt(prayerNum);
    const part = num <= 151 ? 1 : 2; // part 1 = prayers 1-151, part 2 = prayers 1-59
    // Actually, part is determined by which directory the JSON is in
    // Part 1 JSONs are in part-1/, part 2 in part-2/
    
    // Try both parts
    for (const partNum of [1, 2]) {
      const jsonPath = path.join(partNum === 1 ? PART1_DIR : PART2_DIR, `prayer-${num}.json`);
      if (!fs.existsSync(jsonPath)) continue;
      
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const segs = data.segments;
      if (!segs) continue;
      
      // Get content segment indices
      const contentIdx = [];
      for (let i = 0; i < segs.length; i++) {
        if (!isDateMarker(segs[i].he)) contentIdx.push(i);
      }
      
      if (contentIdx.length === 0) continue;
      
      // Clear existing English
      for (const s of segs) s.en = '';
      
      // Assign paragraphs
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
          segs[last].en = segs[last].en ? segs[last].en + '\n\n' + paras.slice(p).join('\n\n') : paras.slice(p).join('\n\n');
        }
      }
      
      const filled = segs.filter(s => s.en && s.en.trim()).length;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    }
  }
}

function main() {
  console.log('=== LT English Extraction v5 ===\n');
  
  const fileMap = buildFileMap();
  console.log(`Found ${fileMap.length} HTML files`);
  
  let totalPrayers = 0;
  for (const f of fileMap) totalPrayers += f.prayers.length;
  console.log(`Covering ${totalPrayers} prayers\n`);
  
  for (const fileInfo of fileMap) {
    processFile(fileInfo);
  }
  
  // Count results
  let totalEmpty = 0, totalFilled = 0, totalSegs = 0;
  for (const part of [1, 2]) {
    const dir = part === 1 ? PART1_DIR : PART2_DIR;
    for (let num = (part === 1 ? 0 : 1); num <= (part === 1 ? 151 : 59); num++) {
      const p = path.join(dir, `prayer-${num}.json`);
      if (!fs.existsSync(p)) continue;
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const seg of data.segments) {
        totalSegs++;
        if (seg.en && seg.en.trim()) totalFilled++;
        else totalEmpty++;
      }
    }
  }
  
  console.log(`\nTotal segments: ${totalSegs}`);
  console.log(`Filled: ${totalFilled}`);
  console.log(`Empty: ${totalEmpty}`);
}

main();
