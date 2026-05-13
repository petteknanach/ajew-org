#!/usr/bin/env node
/**
 * Comprehensive LH English alignment.
 * 
 * Strategy: The HTML translation files were created from the Hebrew text.
 * Each HTML file covers one or more halachot. The sections within the HTML
 * match the segments in the Hebrew JSON.
 * 
 * Matching approach:
 * 1. For each HTML file, extract the title and section headers
 * 2. Match to Hebrew halachos by comparing section count and content
 * 3. Extract English paragraphs and assign to Hebrew segments 1:1
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&#x27;/g, "'").replace(/&#x2014;/g, '—').replace(/&#x2013;/g, '–')
    .replace(/&#x2018;/g, "'").replace(/&#x2019;/g, "'")
    .replace(/&#x201C;/g, '"').replace(/&#x201D;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractFromHTML(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract title
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1]).trim() : '';
  
  // Extract h1 text
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const h1 = h1Match ? decodeHTML(h1Match[1].replace(/<[^>]+>/g, '')).trim() : '';
  
  // Extract all h2/h3 headers
  const headers = [];
  const headerRegex = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
  let m;
  while ((m = headerRegex.exec(content)) !== null) {
    headers.push(decodeHTML(m[1].replace(/<[^>]+>/g, '')).trim());
  }
  
  // Extract all paragraphs (excluding boilerplate)
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((m = pRegex.exec(content)) !== null) {
    let text = m[1].replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = decodeHTML(text).replace(/\s+/g, ' ').trim();
    if (text.length >= 20 && 
        !/^Likutay Halachos$/i.test(text) &&
        !/^(Orach Chaim|Yoreh De|Even HaEzer|Choshen Mishpat)\s*[–—-]?\s*Volume/i.test(text)) {
      paragraphs.push(text);
    }
  }
  
  return { title, h1, headers, paragraphs };
}

function getContentSegmentCount(jsonPath) {
  if (!fs.existsSync(jsonPath)) return 0;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const segments = data.segments || [];
  let count = 0;
  for (const seg of segments) {
    const he = (seg.he || seg.he_nikud || '').trim();
    if (he.length === 0) continue;
    if (/^אות\s/.test(he) && he.length < 10) continue;
    if (/^הלכה\s/.test(he) && he.length < 15) continue;
    if (/^סימן\s/.test(he) && he.length < 15) continue;
    if (he.length < 8) continue;
    count++;
  }
  return count;
}

// Build Hebrew index: map from normalized title to file path
const hebrewIndex = {};
for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  for (const t of (idx.torahs || [])) {
    const title = t.hebrewTitle || t.title || '';
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    hebrewIndex[title] = filePath;
    
    // Also index by simplified title (remove הלכות prefix)
    const simplified = title.replace(/^הלכות\s+/, '').replace(/^ליקוטי הלכות\s*[-–]\s*/, '');
    if (simplified !== title) {
      hebrewIndex[simplified] = filePath;
    }
  }
}

// Try to match HTML files to Hebrew halachos
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => {
  return fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory();
});

let totalHTML = 0;
let matched = 0;
let totalAligned = 0;

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of htmlFiles) {
    totalHTML++;
    const htmlPath = path.join(volDir, hf);
    const { title, h1, headers, paragraphs } = extractFromHTML(htmlPath);
    
    if (paragraphs.length === 0) continue;
    
    // Try to find matching Hebrew file
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [heTitle, hePath] of Object.entries(hebrewIndex)) {
      const heCount = getContentSegmentCount(hePath);
      
      // Score based on paragraph count match
      const countDiff = Math.abs(paragraphs.length - heCount);
      let score = 100 - countDiff;
      
      // Bonus if title appears in HTML
      if (title.includes(heTitle) || h1.includes(heTitle)) {
        score += 50;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = hePath;
      }
    }
    
    if (bestMatch && bestScore > 50) {
      matched++;
    }
  }
}

console.log(`Total HTML files: ${totalHTML}`);
console.log(`Matched: ${matched}`);
