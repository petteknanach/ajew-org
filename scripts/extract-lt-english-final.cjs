#!/usr/bin/env node
/**
 * LT English extraction - FINAL version.
 * 
 * Properly handles multi-prayer files by:
 * 1. Parsing prayer-headings to extract Hebrew letter numbers
 * 2. Converting Hebrew letters to prayer numbers (א=1, ב=2, ..., לב=32, etc.)
 * 3. Splitting paragraphs by heading positions
 * 4. Assigning English paragraphs to correct JSON segments
 */

const fs = require('fs');
const path = require('path');

const LT1_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1';
const LT2_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2';
const LT_TEACHINGS_DIR = '/root/ajew-org/public/teachings/likutay-tefilos';
const PART1_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-1';
const PART2_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-2';

// Hebrew letter to number mapping
const hebNums = {};
(function() {
  const letters = ['','א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];
  // 1-9
  for (let i = 1; i <= 9; i++) hebNums[letters[i]] = i;
  // 10-19
  hebNums['י'] = 10; hebNums['יא'] = 11; hebNums['יב'] = 12; hebNums['יג'] = 13; hebNums['יד'] = 14;
  hebNums['טו'] = 15; hebNums['טז'] = 16; hebNums['יז'] = 17; hebNums['יח'] = 18; hebNums['יט'] = 19;
  // Tens: 20-90
  const tens = {2:'כ',3:'ל',4:'מ',5:'נ',6:'ס',7:'ע',8:'פ',9:'צ'};
  for (let t = 2; t <= 9; t++) {
    hebNums[tens[t]] = t * 10;
    for (let o = 1; o <= 9; o++) {
      hebNums[tens[t] + letters[o]] = t * 10 + o;
    }
  }
  // 100-199
  hebNums['ק'] = 100;
  for (let i = 1; i <= 99; i++) {
    const k = Object.keys(hebNums).find(k => hebNums[k] === i);
    if (k) hebNums['ק' + k] = 100 + i;
  }
  // 200+
  hebNums['ר'] = 200;
  for (let i = 1; i <= 20; i++) {
    const k = Object.keys(hebNums).find(k => hebNums[k] === i);
    if (k) hebNums['ר' + k] = 200 + i;
  }
})();

function hebToNum(heb) {
  // Remove geresh (׳) and gershayim (״) and sof pasuk (׃)
  const clean = heb.replace(/[׳״׃]/g, '').trim();
  return hebNums[clean] || null;
}

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
      .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&middot;/g, '·')
      .replace(/&#x05E1;&#x05D5;/g, 'סו').replace(/&#x05E1;&#x05D6;/g, 'סז')
      .replace(/&#x05E2;/g, 'ע');
    // Decode all HTML entities
    text = text.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 10) paragraphs.push(text);
  }
  return paragraphs;
}

function isDateMarker(he) {
  if (!he) return false;
  const t = he.trim();
  if (t.length > 60) return false;
  // Date markers are short Hebrew text with only letters, spaces, digits, geresh
  // Examples: "א לחודש", "ב תשרי", "יד כסלו", "א אדר"
  return /^[\u0590-\u05FF\s\d\u05F3]{1,30}$/.test(t);
}

function processHtmlFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  
  // Find all prayer-headings with their positions
  const headingRegex = /<div\s+class="prayer-heading">\s*Prayer\s+([^<]+)<\/div>/gi;
  const headings = [];
  let m;
  while ((m = headingRegex.exec(html)) !== null) {
    const label = m[1].trim();
    // Decode HTML entities
    const decoded = label
      .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)))
      .replace(/&middot;/g, '·');
    // Extract Hebrew letter(s) from the label
    // Format: "Eighty-One · פא" or "Thirty-Two · תְּפִלָּה לב׳"
    // The Hebrew letter may or may not have a geresh (׳)
    const hebMatch = decoded.match(/([\u0590-\u05FF]+)(?:׳|״)?\s*$/);
    if (hebMatch) {
      const num = hebToNum(hebMatch[1]);
      if (num) {
        headings.push({ num, pos: m.index });
      }
    }
  }
  
  if (headings.length === 0) return;
  
  // Find all paragraph positions
  const paraRegex = /<div\s+class="para">/gi;
  const paras = [];
  while ((m = paraRegex.exec(html)) !== null) {
    paras.push({ pos: m.index, html: html.substring(m.index, html.indexOf('</div>', m.index) + 6) });
  }
  
  // Assign paragraphs to headings
  const prayerParas = {};
  for (const p of paras) {
    // Find which heading this paragraph belongs to
    let headingIdx = 0;
    for (let h = 0; h < headings.length; h++) {
      if (p.pos >= headings[h].pos) headingIdx = h;
    }
    const num = headings[headingIdx].num;
    if (!prayerParas[num]) prayerParas[num] = [];
    // Extract English text from this paragraph
    const pHtml = p.html;
    let text = pHtml.replace(/<span[^>]*class="heb-btn"[^>]*>[^<]*<\/span>/gi, '');
    text = text.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
    text = text.replace(/<\/?(em|i|b|strong|br)\s*\/?>/gi, '');
    text = text.replace(/<[^>]+>/g, '');
    text = text
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&middot;/g, '·');
    text = text.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 10) prayerParas[num].push(text);
  }
  
  // Process each prayer
  for (const [numStr, paras] of Object.entries(prayerParas)) {
    const num = parseInt(numStr);
    if (paras.length === 0) continue;
    
    // Try both parts
    for (const partNum of [1, 2]) {
      const jsonPath = path.join(partNum === 1 ? PART1_DIR : PART2_DIR, `prayer-${num}.json`);
      if (!fs.existsSync(jsonPath)) continue;
      
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const segs = data.segments;
      if (!segs) continue;
      
      // Get content indices that need English (empty and not date markers)
      const needEnIdx = [];
      for (let i = 0; i < segs.length; i++) {
        if (!isDateMarker(segs[i].he) && !segs[i].en) needEnIdx.push(i);
      }
      if (needEnIdx.length === 0) continue;
      
      // Distribute available paragraphs across segments that need English
      if (paras.length >= needEnIdx.length) {
        // More paragraphs than needed segments
        const perSeg = Math.floor(paras.length / needEnIdx.length);
        const extra = paras.length % needEnIdx.length;
        let p = 0;
        for (let i = 0; i < needEnIdx.length; i++) {
          const count = perSeg + (i < extra ? 1 : 0);
          segs[needEnIdx[i]].en = paras.slice(p, p + count).join('\n\n');
          p += count;
        }
      } else {
        // Fewer paragraphs than needed segments - fill what we can
        for (let i = 0; i < paras.length; i++) {
          segs[needEnIdx[i]].en = paras[i];
        }
        // Remaining segments stay empty (will show blank, not "Translation not yet available")
      }
      
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    }
  }
}

function main() {
  console.log('=== LT English Extraction FINAL ===\n');
  
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
  let emptyContent = 0;
  
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
        } else {
          totalEmpty++;
          if (!isDateMarker(seg.he)) emptyContent++;
        }
      }
    }
  }
  
  console.log(`Total segments: ${totalSegs}`);
  console.log(`Filled: ${totalFilled}`);
  console.log(`Empty (date markers): ${totalEmpty - emptyContent}`);
  console.log(`Empty (real content): ${emptyContent}`);
}

main();
