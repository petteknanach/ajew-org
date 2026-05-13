#!/usr/bin/env node
/**
 * Extract English for remaining parsha teachings from HTML translation files.
 * For each teaching, finds the correct HTML file, locates the letter section,
 * and extracts the English paragraphs.
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/Documents/Translations/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';
const LM_BASE = '/root/ajew-org/public/reader/likutay-moharan';

function decodeHTMLEntities(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
}

function normalizeHe(text) {
  if (!text) return '';
  // Remove nikud
  text = text.replace(/[\u0591-\u05C7]/g, '');
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function findLHFile(halachaName) {
  // Search all LH parts for matching halacha
  for (let part = 1; part <= 8; part++) {
    const pdir = path.join(LH_BASE, `part-${part}`);
    const idxFile = path.join(pdir, 'index.json');
    if (!fs.existsSync(idxFile)) continue;
    const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    for (const t of (idx.torahs || [])) {
      const title = t.hebrewTitle || t.title || '';
      if (title.includes(halachaName) || halachaName.includes(title)) {
        return path.join(pdir, `torah-${t.number}.json`);
      }
    }
  }
  return null;
}

function findHTMLFile(halachaName) {
  // Search all HTML translation folders for matching halacha
  const folders = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
    const full = path.join(TRANSLATIONS_BASE, f);
    return fs.statSync(full).isDirectory();
  });
  
  for (const folder of folders) {
    const volDir = path.join(TRANSLATIONS_BASE, folder);
    const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
    
    for (const hf of htmlFiles) {
      const content = fs.readFileSync(path.join(volDir, hf), 'utf8');
      // Check if this file contains the halacha name in an h2 tag
      const h2Match = content.match(new RegExp(`<h2[^>]*>([^<]*${halachaName}[^<]*)</h2>`, 'i'));
      if (h2Match) {
        return path.join(volDir, hf);
      }
    }
  }
  return null;
}

function extractEnglishFromHTML(htmlFile, letter) {
  const content = fs.readFileSync(htmlFile, 'utf8');
  
  // Find the letter section in the HTML
  // Letters are marked as "אות X" in the HTML
  const letterPatterns = [
    `אות ${letter}`,
    `אות ${letter}'`,
    `אות ${letter}"`,
  ];
  
  // Find all paragraph tags with their positions
  const paragraphs = [];
  let searchIdx = 0;
  while (true) {
    const pStart = content.indexOf('<p', searchIdx);
    if (pStart === -1) break;
    const pClose = content.indexOf('</p>', pStart);
    if (pClose === -1) break;
    const inner = content.substring(content.indexOf('>', pStart) + 1, pClose);
    let text = inner.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
    text = decodeHTMLEntities(text).replace(/\s+/g, ' ').trim();
    if (text.length >= 20) paragraphs.push({ text, pos: pStart });
    searchIdx = pClose + 4;
  }
  
  // Find the letter marker position
  let letterPos = -1;
  let nextLetterPos = -1;
  
  for (const pattern of letterPatterns) {
    // Look for the pattern in h2, h3, or strong tags
    const patterns = [
      `<h2[^>]*>[^<]*${pattern}[^<]*</h2>`,
      `<h3[^>]*>[^<]*${pattern}[^<]*</h3>`,
      `<strong[^>]*>[^<]*${pattern}[^<]*</strong>`,
      `<b[^>]*>[^<]*${pattern}[^<]*</b>`,
      `>${pattern}<`,
      `>${pattern}`,
    ];
    
    for (const p of patterns) {
      const regex = new RegExp(p, 'i');
      const match = content.match(regex);
      if (match) {
        letterPos = match.index;
        break;
      }
    }
    if (letterPos >= 0) break;
  }
  
  if (letterPos < 0) {
    return null; // Letter not found
  }
  
  // Find the next letter position
  const nextLetterRegex = /אות\s+[א-ת]['"]?/g;
  let match;
  while ((match = nextLetterRegex.exec(content)) !== null) {
    if (match.index > letterPos) {
      nextLetterPos = match.index;
      break;
    }
  }
  
  // Extract paragraphs between letterPos and nextLetterPos
  const enParts = [];
  for (const p of paragraphs) {
    if (p.pos >= letterPos && (nextLetterPos < 0 || p.pos < nextLetterPos)) {
      enParts.push(p.text);
    }
  }
  
  return enParts.length > 0 ? enParts.join('\n') : null;
}

function extractEnglishFromLHFile(lhFile, letter) {
  if (!fs.existsSync(lhFile)) return null;
  const data = JSON.parse(fs.readFileSync(lhFile, 'utf8'));
  const segments = data.segments || [];
  
  // Find letter range
  let startIdx = -1;
  let endIdx = segments.length;
  
  for (let i = 0; i < segments.length; i++) {
    const he = (segments[i].he || '').trim();
    if (he === `אות ${letter}` || he.startsWith(`אות ${letter}`)) {
      startIdx = i;
    } else if (startIdx >= 0 && he.startsWith('אות ') && he.length <= 10) {
      endIdx = i;
      break;
    }
  }
  
  if (startIdx < 0) return null;
  
  // Collect English from content segments
  const enParts = [];
  for (let i = startIdx; i < endIdx; i++) {
    const en = (segments[i].en || '').trim();
    if (en) enParts.push(en);
  }
  
  return enParts.length > 0 ? enParts.join('\n') : null;
}

// Load teachings
const beharFile = '/root/ajew-org/public/data/behar-teachings.json';
const bechukosaiFile = '/root/ajew-org/public/data/bechukosai-teachings.json';

for (const fname of [beharFile, bechukosaiFile]) {
  const data = JSON.parse(fs.readFileSync(fname, 'utf8'));
  const shortName = path.basename(fname);
  console.log(`\n${shortName}:`);
  
  for (let i = 0; i < data.length; i++) {
    const t = data[i];
    if (t.en && t.en.trim()) continue; // Already has English
    
    const src = t.source || '';
    
    // Parse source
    const letterMatch = src.match(/אות\s+([א-ת]['"]?[א-ת]?)/);
    const letter = letterMatch ? letterMatch[1] : null;
    const halachaPart = letter ? src.substring(0, letterMatch.index).trim() : src;
    const halachaName = halachaPart.replace(/^לקוטי הלכות\s*-\s*/, '').replace(/^הלכות\s+/, '').replace(/\s*-\s*$/, '').trim();
    
    if (!letter || !halachaName) {
      console.log(`  T${i+1}: ✗ Can't parse: ${src}`);
      continue;
    }
    
    // Try HTML file first
    const htmlFile = findHTMLFile(halachaName);
    if (htmlFile) {
      const en = extractEnglishFromHTML(htmlFile, letter);
      if (en) {
        t.en = en;
        console.log(`  T${i+1}: ✓ HTML ${path.basename(htmlFile)} (${en.length} chars)`);
        continue;
      }
    }
    
    // Try LH file
    const lhFile = findLHFile(halachaName);
    if (lhFile) {
      const en = extractEnglishFromLHFile(lhFile, letter);
      if (en) {
        t.en = en;
        console.log(`  T${i+1}: ✓ LH ${path.basename(lhFile)} (${en.length} chars)`);
        continue;
      }
    }
    
    console.log(`  T${i+1}: ✗ Not found: ${halachaName} ${letter}`);
  }
  
  fs.writeFileSync(fname, JSON.stringify(data, null, 2), 'utf8');
  
  const hasEn = data.filter(t => t.en && t.en.trim()).length;
  console.log(`  Result: ${hasEn}/${data.length} have English`);
}
