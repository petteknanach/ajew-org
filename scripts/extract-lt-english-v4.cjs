#!/usr/bin/env node
/**
 * LT English extraction from HTML source files - v4.
 * 
 * Handles multi-prayer files by:
 * 1. Parsing filename to get prayer range (e.g., "prayers32_33_34" -> [32,33,34])
 * 2. Splitting HTML by prayer-heading divs
 * 3. Matching split sections to prayer numbers in order
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

function parseFilenamePrayers(filename) {
  const base = filename.replace('.html', '');
  
  // Pattern: prayersX_Y_Z -> [X, Y, Z]
  const pRange = base.match(/prayers(\d+)_(\d+)_(\d+)/);
  if (pRange) {
    return [parseInt(pRange[1]), parseInt(pRange[2]), parseInt(pRange[3])];
  }
  
  // Pattern: prayersX_Y -> range X to Y
  const pRange2 = base.match(/prayers(\d+)_(\d+)/);
  if (pRange2) {
    const start = parseInt(pRange2[1]);
    const end = parseInt(pRange2[2]);
    const result = [];
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  }
  
  // Pattern: prayerX -> [X]
  const pSingle = base.match(/prayer(\d+)/);
  if (pSingle) {
    return [parseInt(pSingle[1])];
  }
  
  // Pattern: _X_prayer or _X_Y_range
  // e.g., "likutay_tefilos_81_92.html" -> range 81-92
  // e.g., "likutay_tefilos_108_152_complete.html" -> range 108-152
  const pAlt = base.match(/_(\d+)_(\d+)(?:_complete|_range)?$/);
  if (pAlt) {
    const start = parseInt(pAlt[1]);
    const end = parseInt(pAlt[2]);
    if (end > start && end - start < 200) {
      const result = [];
      for (let i = start; i <= end; i++) result.push(i);
      return result;
    }
  }
  
  // Pattern: b2_prayersX_Y (part 2 files)
  const pB2 = base.match(/b2_prayers(\d+)_(\d+)/);
  if (pB2) {
    const start = parseInt(pB2[1]);
    const end = parseInt(pB2[2]);
    const result = [];
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  }
  
  return null;
}

function splitHtmlByPrayerHeadings(html) {
  // Split HTML into sections by prayer-heading divs
  const sections = [];
  const headingRegex = /<div\s+class="prayer-heading">/gi;
  
  let match;
  const positions = [];
  while ((match = headingRegex.exec(html)) !== null) {
    positions.push(match.index);
  }
  
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i < positions.length - 1 ? positions[i + 1] : html.length;
    sections.push(html.substring(start, end));
  }
  
  return sections;
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
      const prayers = parseFilenamePrayers(file);
      
      if (!prayers || prayers.length === 0) continue;
      
      const headingCount = (html.match(/class="prayer-heading"/g) || []).length;
      
      if (prayers.length === 1 && headingCount <= 1) {
        // Single prayer file
        if (!prayerMap.has(prayers[0])) {
          prayerMap.set(prayers[0], html);
        }
      } else {
        // Multi-prayer file - split by headings
        const sections = splitHtmlByPrayerHeadings(html);
        if (sections.length === prayers.length) {
          for (let i = 0; i < prayers.length; i++) {
            if (!prayerMap.has(prayers[i])) {
              prayerMap.set(prayers[i], sections[i]);
            }
          }
        } else {
          // Mismatch - try to assign what we have
          for (let i = 0; i < Math.min(sections.length, prayers.length); i++) {
            if (!prayerMap.has(prayers[i])) {
              prayerMap.set(prayers[i], sections[i]);
            }
          }
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
  
  for (const s of segs) s.en = '';
  
  const contentIdx = [];
  for (let i = 0; i < segs.length; i++) {
    if (!isDateMarker(segs[i].he)) contentIdx.push(i);
  }
  
  if (contentIdx.length === 0) return { ok: false, reason: 'no content' };
  
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
  return { ok: true, filled, total: segs.length, paras: paras.length };
}

function main() {
  console.log('=== LT English Extraction v4 ===\n');
  
  const htmlMap = buildPrayerMap();
  console.log(`HTML source covers ${htmlMap.size} prayers`);
  
  // Debug: show range
  const keys = [...htmlMap.keys()].sort((a,b) => a-b);
  if (keys.length > 0) console.log(`Range: ${keys[0]} to ${keys[keys.length-1]}`);
  console.log('');
  
  let processed = 0, filled = 0, skipped = 0;
  const missing = [];
  
  for (let num = 0; num <= 151; num++) {
    const html = htmlMap.get(num);
    if (!html) { skipped++; if (num !== 0) missing.push(`1:${num}`); continue; }
    if (num === 0) { skipped++; continue; } // skip hakdama for now
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
  
  // Show missing in groups
  if (missing.length > 0) {
    const groups = {};
    for (const m of missing) {
      const [part, rest] = m.split(':');
      if (!groups[part]) groups[part] = [];
      groups[part].push(rest);
    }
    for (const [part, items] of Object.entries(groups)) {
      console.log(`Part ${part} missing (${items.length}): ${items.slice(0,20).join(', ')}${items.length > 20 ? '...' : ''}`);
    }
  }
}

main();
