#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? decodeHTML(titleMatch[1]) : '';
}

// For Part 4, show ALL HTML files with their titles and try to match to Hebrew
const volDir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Yoreh Daya - 1');
const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
const idx = JSON.parse(fs.readFileSync(path.join(LH_BASE, 'part-4/index.json'), 'utf8'));

console.log('=== Part 4 HTML files and their likely Hebrew matches ===\n');

for (const hf of htmlFiles) {
  const title = extractTitle(path.join(volDir, hf));
  
  // Try to find matching Hebrew entry by looking for similar names
  // Extract key terms from HTML title
  const titleLower = title.toLowerCase();
  
  // Find best matching Hebrew entry
  let bestMatch = null;
  let bestScore = 0;
  
  for (const t of idx.torahs) {
    const hebTitle = (t.hebrewTitle || t.title || '').toLowerCase();
    const tTitle = (t.title || '').toLowerCase();
    
    // Simple matching: check if key words appear
    let score = 0;
    
    // Extract English keywords from HTML title
    const words = titleLower.split(/\s+/).filter(w => w.length > 3);
    
    // Check if the Hebrew title number matches
    const numMatch = title.match(/(\d+)/);
    if (numMatch) {
      const htmlNum = parseInt(numMatch[1]);
      if (t.number === htmlNum) score += 10;
    }
    
    // Check word overlap
    for (const word of words) {
      if (hebTitle.includes(word) || tTitle.includes(word)) {
        score += 3;
      }
    }
    
    // Check for specific halacha name patterns
    const namePatterns = [
      /shechitah|שחיטה/i, /traifos|טריפות/i, /matanos|מתנות/i,
      /aiver|אבר/i, /basar|בשר/i, /chailev|חלב/i, /dam|דם/i,
      /melichah|מליחה/i, /simanim|סימנים/i, /eggs|ביצים/i,
      /yayin|יין/i, /nesech|נסך/i, /avodas|עבודת/i, /elilim|אלילים/i,
      /ribbis|ריבית/i, /chukkas|חקות/i, /meonayn|מעונאין/i,
      /korcha|קרחה/i, /giluach|גילוח/i
    ];
    
    for (const pattern of namePatterns) {
      if (pattern.test(title) && pattern.test(hebTitle)) {
        score += 5;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = t;
    }
  }
  
  const matchStr = bestMatch 
    ? `#${bestMatch.number} ${bestMatch.hebrewTitle || bestMatch.title} (score: ${bestScore})`
    : '(no match)';
  
  console.log(`${hf}:`);
  console.log(`  Title: ${title.substring(0, 70)}`);
  console.log(`  Match: ${matchStr}`);
}
