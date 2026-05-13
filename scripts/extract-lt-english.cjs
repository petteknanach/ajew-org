#!/usr/bin/env node
/**
 * LT English extraction from HTML source files.
 * 
 * For each prayer, extracts English paragraphs from HTML and pairs them
 * with the corresponding Hebrew segments in the JSON files.
 * 
 * The HTML files have:
 *   <div class="para"><p>...English text...</p><div class="heb-text">...Hebrew...</div></div>
 * 
 * The JSON files have segments[].he (Hebrew) and segments[].en (English, often empty)
 * 
 * Strategy: Extract English paragraphs from HTML, clean HTML tags, and assign
 * to JSON segments by matching paragraph order (skipping date markers and headers).
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

function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractEnglishParagraphs(html) {
  const paragraphs = [];
  
  // Find all <div class="para"> blocks
  const paraRegex = /<div\s+class="para">\s*<p>([\s\S]*?)<\/p>/gi;
  let match;
  
  while ((match = paraRegex.exec(html)) !== null) {
    let text = match[1];
    
    // Remove the heb-btn span (the "עברית ▾" toggle button)
    text = text.replace(/<span[^>]*class="heb-btn"[^>]*>[^<]*<\/span>/gi, '');
    
    // Remove any other spans but keep their content
    text = text.replace(/<span[^>]*class="heb"[^>]*>(.*?)<\/span>/gi, '$1');
    text = text.replace(/<span[^>]*class="verse"[^>]*>(.*?)<\/span>/gi, '$1');
    text = text.replace(/<span[^>]*class="hashem"[^>]*>(.*?)<\/span>/gi, '$1');
    text = text.replace(/<span[^>]*class="def"[^>]*>(.*?)<\/span>/gi, '$1');
    text = text.replace(/<span[^>]*class="src"[^>]*>(.*?)<\/span>/gi, '$1');
    text = text.replace(/<span[^>]*class="emph"[^>]*>(.*?)<\/span>/gi, '$1');
    
    // Remove em tags but keep content
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
    
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

function loadHtmlForPrayer(prayerNum) {
  // Try all possible HTML file locations
  const dirs = [LT1_DIR, LT2_DIR, LT_TEACHINGS_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // Check if this file contains the prayer
      // Look for patterns like "Prayer 30", "prayer30", "prayer-30", etc.
      const nameLower = file.toLowerCase();
      
      // Extract prayer number range from filename
      // e.g., "likutay_tefilos_30_prayer30.html" -> prayer 30
      // e.g., "likutay_tefilos_32_33_34_prayers32_33_34.html" -> prayers 32,33,34
      // e.g., "likutay_tefilos_b2_prayers1_3.html" -> part 2, prayers 1-3
      
      // Check if prayerNum is in the file
      const content = html;
      
      // Look for the prayer number in the HTML content
      // Pattern: "Prayer Thirty", "Prayer 30", "prayer30", etc.
      const prayerPatterns = [
        new RegExp(`Prayer\\s+${prayerNum}\\b`, 'i'),
        new RegExp(`prayer${prayerNum}\\b`, 'i'),
        new RegExp(`prayer-${prayerNum}\\b`, 'i'),
        new RegExp(`prayer_${prayerNum}\\b`, 'i'),
        new RegExp(`#${prayerNum}\\b`),
      ];
      
      for (const pattern of prayerPatterns) {
        if (pattern.test(content)) {
          return content;
        }
      }
    }
  }
  
  return null;
}

function extractPrayerFromMultiFile(html, prayerNum) {
  // For files that contain multiple prayers, extract just the section for this prayer
  // Look for "Prayer N" header and extract until next "Prayer M" header
  
  const patterns = [
    new RegExp(`Prayer\\s+${prayerNum}\\b`, 'i'),
    new RegExp(`prayer${prayerNum}\\b`, 'i'),
  ];
  
  let startIdx = -1;
  for (const p of patterns) {
    const m = p.exec(html);
    if (m) {
      startIdx = m.index;
      break;
    }
  }
  
  if (startIdx === -1) return null;
  
  // Find the next prayer header
  const after = html.substring(startIdx + 5);
  const nextPrayer = /Prayer\s+\d+/i.exec(after);
  
  let endIdx = html.length;
  if (nextPrayer) {
    endIdx = startIdx + 5 + after.indexOf(nextPrayer[0]);
  }
  
  return html.substring(startIdx, endIdx);
}

function processPrayer(prayerNum, partNum, html) {
  // Extract just this prayer's section if multi-prayer file
  let prayerHtml = extractPrayerFromMultiFile(html, prayerNum);
  if (!prayerHtml) prayerHtml = html;
  
  const englishParas = extractEnglishParagraphs(prayerHtml);
  
  if (englishParas.length === 0) {
    console.log(`  Part ${partNum} Prayer ${prayerNum}: No English paragraphs found`);
    return false;
  }
  
  // Load JSON
  const jsonPath = path.join(partNum === 1 ? PART1_DIR : PART2_DIR, `prayer-${prayerNum}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.log(`  Part ${partNum} Prayer ${prayerNum}: JSON file not found`);
    return false;
  }
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const segments = data.segments;
  
  // Identify which segments are content (not date markers)
  // Date markers are short Hebrew text like "יד כסלו", "טו כסלו", etc.
  const contentSegments = segments.filter(seg => {
    const he = (seg.he || '').trim();
    // Skip if it's just a date marker (short, mostly Hebrew letters and numbers)
    if (he.length < 30 && /^[\u0590-\u05FF\s\d]+$/.test(he)) return false;
    // Skip if it's just a section label
    if (he.length < 20 && /^(טו|יז|יח|יט|כ|כא|כב|כג|כד|כה|כו|כז|כח|כט|ל|לא|לב|לג|לד|לה|לו|לז|לח|לט|מ|מא|מב|מג|מד|מה|מו|מז|מח|מט|נ|נא|נב|נג|נד|נה|נו|נז|נח|נט|ס|סא|סב|סג|סד|סה|סו|סז|סח|סט|ע|עא|עב|עג|עד|עה|עו|עז|עח|עט|פ|פא|פב|פג|פד|פה|פו|פז|פח|פט|צ|צא|צב|צג|צד|צה|צו|צז|צח|צט|ק|קא|קב|קג|קד|קה|קו|קז|קח|קט|קי|קיא|קיב|קיג|קיד|קטו|קטז|קיז|קיח|קיט|קכ|קכא|קכב|קכג|קכד|קכה|קכו|קכז|קכח|קכט|קל|קלא|קלב|קלג|קלד|קלה|קלו|קלז|קלח|קלט|קמ|קמא|קמב|קמג|קמד|קמה|קמו|קמז|קמח|קמט|קנ|קנא|קנב|קנג|קנד|קנה|קנו|קנז|קנח|קנט|קס|קסא|קסב|קסג|קסד|קסה|קסו|קסז|קסח|קסט|קע|קעא|קעב|קעג|קעד|קעה|קעו|קעז|קעח|קעט|קפ|קפא|קפב|קפג|קפד|קפה|קפו|קפז|קפח|קפט|קצ|קצא|קצב|קצג|קצד|קצה|קצו|קצז|קצח|קצט|קק|קקא|קקב|קקג|קקד|קקה|קקו|קקז|קקח|קקט|קר|קרא|קרב|קרג|קרד|קרה|קרו|קרז|קרח|קרט|קש|קשא|קשב|קשג|קשד|קשה|קשו|קשז|קשח|קשט|קת|קתא|קתב|קתג|קתד|קתה|קתו|קתז|קתח|קתט|ר|רא|רב|רג|רד|רה|רו|רז|רח|רט|רי|ריא|ריב|ריג|ריד|רטו|רטז|ריז|ריח|ריט|רכ|רכא|רכב|רכג|רכד|רכה|רכו|רכז|רכח|רכט|רל|רלא|רלב|רלג|רלד|רלה|רלו|רלז|רלח|רלט|רמ|רמא|רמב|רמג|רמד|רמה|רמו|רמז|רמח|רמט|רנ|רנא|רנב|רנג|רנד|רנה|רנו|רנז|רנח|רנט|רס|רסא|רסב|רסג|רסד|רסה|רסו|רסז|רסח|רסט|רע|רעא|רעב|רעג|רעד|רעה|רעו|רעז|רעח|רעט|רפ|רפא|רפב|רפג|רפד|רפה|רפו|רפז|רפח|רפט|רצ|רצא|רצב|רצג|רצד|רצה|רצו|רצז|רצח|רצט|רק|רקא|רקב|רקג|רקד|רקה|רקו|רקז|רקח|רקט|רר|ררא|ררב|ררג|ררד|ררה|ררו|ררז|ררח|ררט|רש|רשא|רשב|רשג|רשד|רשה|רשו|רשז|רשח|רשט|רת|רתא|רתב|רתג|רתד|רתה|רתו|רתז|רתח|רתט|ש|שא|שב|שג|שד|שה|שו|שז|שח|שט|שי|שיא|שיב|שיג|שיד|שטו|שטז|שיז|שיח|שיט|שכ|שכא|שכב|שכג|שכד|שכה|שכו|שכז|שכח|שכט|של|שלא|שלב|שלג|שלד|שלה|שלו|שלז|שלח|שלט|שמ|שמא|שמב|שמג|שמד|שמה|שמו|שמז|שמח|שמט|שנ|שנא|שנב|שנג|שנד|שנה|שנו|שנז|שנח|שנט|שס|שסא|שסב|שסג|שסד|שסה|שסו|שסז|שסח|שסט|שע|שעא|שעב|שעג|שעד|שעה|שעו|שעז|שעח|שעט|שפ|שפא|שפב|שפג|שפד|שפה|שפו|שפז|שפח|שפט|שצ|שצא|שצב|שצג|שצד|שצה|שצו|שצז|שצח|שצט|שק|שקא|שקב|שקג|שקד|שקה|שקו|שקז|שקח|שקט|שר|שרא|שרב|שרג|שרד|שרה|שרו|שרז|שרח|שרט|שש|ששא|ששב|ששג|ששד|ששה|ששו|ששז|ששח|ששט|שת|שתא|שתב|שתג|שתד|שתה|שתו|שתז|שתח|שתט|ת|תא|תב|תג|תד|תה|תו|תז|תח|תט|תי|תיא|תיב|תיג|תיד|תטו|תטז|תיז|תיח|תיט|תכ|תכא|תכב|תכג|תכד|תכה|תכו|תכז|תכח|תכט|תל|תלא|תלב|תלג|תלד|תלה|תלו|תלז|תלח|תלט|תמ|תמא|תמב|תמג|תמד|תמה|תמו|תמז|תמח|תמט|תנ|תנא|תנב|תנג|תנד|תנה|תנו|תנז|תנח|תנט|תס|תסא|תסב|תסג|תסד|תסה|תסו|תסז|תסח|תסט|תע|תעא|תעב|תעג|תעד|תעה|תעו|תעז|תעח|תעט|תפ|תפא|תפב|תפג|תפד|תפה|תפו|תפז|תפח|תפט|תצ|תצא|תצב|תצג|תצד|תצה|תצו|תצז|תצח|תצט|תק|תקא|תקב|תקג|תקד|תקה|תקו|תקז|תקח|תקט|תר|תרא|תרב|תרג|תרד|תרה|תרו|תרז|תרח|תרט|תש|תשא|תשב|תשג|תשד|תשה|תשו|תשז|תשח|תשט|תת|תתא|תתב|תתג|תתד|תתה|תתו|תתז|תתח|תתט)\s*$/.test(he)) return false;
    return true;
  });
  
  // Assign English paragraphs to content segments
  // If we have fewer paragraphs than segments, assign what we can
  // If we have more paragraphs than segments, combine extras into the last segment
  
  if (contentSegments.length === 0) {
    console.log(`  Part ${partNum} Prayer ${prayerNum}: No content segments found`);
    return false;
  }
  
  // Clear all existing English first
  for (const seg of segments) {
    seg.en = '';
  }
  
  if (englishParas.length <= contentSegments.length) {
    // Fewer paragraphs than segments - assign 1:1, skip date markers
    let paraIdx = 0;
    for (const seg of segments) {
      const he = (seg.he || '').trim();
      // Skip date markers
      if (he.length < 30 && /^[\u0590-\u05FF\s\d]+$/.test(he)) {
        seg.en = '';
        continue;
      }
      if (paraIdx < englishParas.length) {
        seg.en = englishParas[paraIdx];
        paraIdx++;
      }
    }
    // If there are remaining paragraphs, append to last segment
    if (paraIdx < englishParas.length) {
      const lastContent = contentSegments[contentSegments.length - 1];
      const extra = englishParas.slice(paraIdx).join('\n\n');
      lastContent.en = lastContent.en ? lastContent.en + '\n\n' + extra : extra;
    }
  } else {
    // More paragraphs than content segments - distribute evenly
    const parasPerSeg = Math.ceil(englishParas.length / contentSegments.length);
    let paraIdx = 0;
    for (const seg of contentSegments) {
      const endIdx = Math.min(paraIdx + parasPerSeg, englishParas.length);
      seg.en = englishParas.slice(paraIdx, endIdx).join('\n\n');
      paraIdx = endIdx;
    }
    // Remaining paragraphs go to last segment
    if (paraIdx < englishParas.length) {
      const lastContent = contentSegments[contentSegments.length - 1];
      const extra = englishParas.slice(paraIdx).join('\n\n');
      lastContent.en = lastContent.en ? lastContent.en + '\n\n' + extra : extra;
    }
  }
  
  // Count filled segments
  const filled = segments.filter(s => s.en && s.en.trim().length > 0).length;
  
  // Save
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`  Part ${partNum} Prayer ${prayerNum}: ${filled}/${segments.length} segments filled (${englishParas.length} paras)`);
  return true;
}

// Build a map of all HTML files and their prayer ranges
function buildHtmlFileMap() {
  const fileMap = []; // [{ path, part, prayers: [num1, num2, ...] }]
  
  const dirs = [
    { dir: LT1_DIR, part: 1 },
    { dir: LT2_DIR, part: 2 },
    { dir: LT_TEACHINGS_DIR, part: 1 },
  ];
  
  for (const { dir, part } of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // Extract prayer numbers from filename
      // e.g., "likutay_tefilos_30_prayer30.html" -> [30]
      // e.g., "likutay_tefilos_32_33_34_prayers32_33_34.html" -> [32, 33, 34]
      // e.g., "likutay_tefilos_b2_prayers1_3.html" -> [1, 2, 3]
      // e.g., "likutay_tefilos_108_152_complete.html" -> [108..152]
      
      const prayers = [];
      
      // Check for range pattern: "108_152" or "108-152"
      const rangeMatch = file.match(/(\d+)[_-](\d+)/);
      if (rangeMatch && file.includes('complete')) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        for (let i = start; i <= end; i++) prayers.push(i);
      } else {
        // Extract individual prayer numbers
        const numMatches = file.matchAll(/(?:prayer|prayers?)(\d+)/g);
        for (const m of numMatches) {
          prayers.push(parseInt(m[1]));
        }
        
        // Also check for patterns like "b2_prayers1_3" (part 2, prayers 1-3)
        const rangeMatch2 = file.match(/prayers(\d+)_(\d+)/);
        if (rangeMatch2) {
          prayers.length = 0; // Clear and use range
          const start = parseInt(rangeMatch2[1]);
          const end = parseInt(rangeMatch2[2]);
          for (let i = start; i <= end; i++) prayers.push(i);
        }
      }
      
      if (prayers.length > 0) {
        fileMap.push({ path: filePath, part, prayers, html });
      }
    }
  }
  
  return fileMap;
}

function main() {
  console.log('=== LT English Extraction ===\n');
  
  const htmlMap = buildHtmlFileMap();
  console.log(`Found ${htmlMap.length} HTML files`);
  
  // Build a lookup: prayerNum -> { part, html }
  const prayerLookup = new Map();
  for (const entry of htmlMap) {
    for (const prayerNum of entry.prayers) {
      prayerLookup.set(`${entry.part}:${prayerNum}`, entry);
    }
  }
  
  console.log(`Coverage: ${prayerLookup.size} prayer-part combinations\n`);
  
  let processed = 0;
  let filled = 0;
  let skipped = 0;
  
  // Process part 1 (prayers 0-151)
  for (let num = 0; num <= 151; num++) {
    const key = `1:${num}`;
    const entry = prayerLookup.get(key);
    if (!entry) {
      skipped++;
      continue;
    }
    if (processPrayer(num, 1, entry.html)) {
      filled++;
    }
    processed++;
  }
  
  // Process part 2 (prayers 1-59)
  for (let num = 1; num <= 59; num++) {
    const key = `2:${num}`;
    const entry = prayerLookup.get(key);
    if (!entry) {
      skipped++;
      continue;
    }
    if (processPrayer(num, 2, entry.html)) {
      filled++;
    }
    processed++;
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Filled: ${filled}`);
  console.log(`Skipped (no HTML): ${skipped}`);
}

main();
