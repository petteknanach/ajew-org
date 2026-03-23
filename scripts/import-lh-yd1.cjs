/**
 * Import LH Yoreh Deah 1 (Part 4) translations - halachos 83-102
 * Source: HTML files in Translations/Likutay Halachos/Likutay Halachos - Yoreh Daya - 1/
 */
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'likutay-halachos', 'part-4');
const SRC_DIR = 'C:/Users/Pettek/Documents/Translations/Likutay Halachos/Likutay Halachos - Yoreh Daya - 1';

function extractEnglishParagraphs(html) {
  // Split by closing paragraph/div/heading tags
  const parts = html.split(/<\/p>|<\/div>|<\/h[1-6]>/).map(p => {
    return p
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "\u2019")
      .replace(/&lsquo;/g, "\u2018")
      .replace(/&rdquo;/g, "\u201D")
      .replace(/&ldquo;/g, "\u201C")
      .replace(/&mdash;/g, "\u2014")
      .replace(/&ndash;/g, "\u2013")
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }).filter(p => p.length > 10);

  // Keep only English paragraphs (more Latin chars than Hebrew)
  return parts.filter(p => {
    const en = (p.match(/[a-zA-Z]/g) || []).length;
    const he = (p.match(/[\u0590-\u05FF]/g) || []).length;
    return en > he;
  });
}

function splitByHalacha(html) {
  // Split by halacha markers: <!-- HALACHA --> or <div class="halacha-title">
  const sections = {};
  const halachaRegex = /(?:<!-- *=+ *HALACHA\s+(\d+)\s*=+ *-->|<div class="halacha-title">Halacha\s+(\d+)<\/div>)/gi;
  let match;
  const splits = [];

  while ((match = halachaRegex.exec(html)) !== null) {
    const num = parseInt(match[1] || match[2]);
    splits.push({ num, idx: match.index });
  }

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].idx;
    const end = i + 1 < splits.length ? splits[i + 1].idx : html.length;
    sections[splits[i].num] = html.substring(start, end);
  }

  return sections;
}

function splitBySections(halachaHtml) {
  // Split by section markers: <div class="sec-header"><span class="sec-badge">§ N</span>
  const sectionRegex = /<div class="sec-header">.*?<\/div>/gi;
  let match;
  const splits = [{ idx: 0 }]; // Start from beginning (includes intro)

  while ((match = sectionRegex.exec(halachaHtml)) !== null) {
    splits.push({ idx: match.index });
  }

  const sections = [];
  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].idx;
    const end = i + 1 < splits.length ? splits[i + 1].idx : halachaHtml.length;
    sections.push(halachaHtml.substring(start, end));
  }
  return sections;
}

function updateJsonFile(hNum, englishParagraphs) {
  const jsonPath = path.join(READER_DIR, `halacha-${hNum}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.log(`  WARNING: ${jsonPath} not found`);
    return false;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Check if already has English
  const hasExisting = data.segments.some(s => s.en && s.en.trim().length > 10);
  if (hasExisting) {
    console.log(`  halacha-${hNum}: already has English, skipping`);
    return false;
  }

  // The segments structure: first segment might be "אות א" header, rest are content
  // For single-content halachos, combine all English into one content paragraph
  let enIdx = 0;
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i];
    // Skip header segments
    if (/^אות\s+[א-ת]$/.test(seg.he.trim()) && seg.he.trim().length < 10) {
      continue;
    }
    if (enIdx < englishParagraphs.length) {
      // If we have fewer English paragraphs than content segments, combine remaining
      if (data.segments.length - i <= englishParagraphs.length - enIdx) {
        seg.en = englishParagraphs[enIdx];
        enIdx++;
      } else {
        // Combine all remaining English into this segment
        seg.en = englishParagraphs.slice(enIdx).join('\n\n');
        enIdx = englishParagraphs.length;
      }
    }
  }

  data.hasEnglish = true;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  return true;
}

// Process the source files
const fileMapping = [
  {
    file: '300 meonayn_1_2_3_v2.html',
    // Halacha 1 in the file = reader halacha 83
    // Halacha 2 = 84, Halacha 3 = 85
    halachaMap: { 1: 83, 2: 84, 3: 85 }
  },
  {
    file: '350 korcha_1_2_3 (1).html',
    halachaMap: { 1: 86, 2: 87, 3: 88 }
  },
  {
    file: '400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html',
    // This large file contains giluch halachos 1-5, lo yilbash 1-3, nida 1-2, mikvaos
    // Need to check the actual halacha titles to map correctly
    // reader 89=גילוח א, 90=גילוח ב, 91=גילוח ג, 92=גילוח ד, 93=לא ילבש גבר, 94=קרחה ושריטה, 95=נדה ומקוואות
    // reader 96=גילוח ה, 97=נדה, 98=לא ילבש גבר א, 99=לא ילבש ב, 100=לא ילבש ג, 101=לא ילבש ב, 102=מקוואות א
    multiHalacha: true
  }
];

let updated = 0;

for (const entry of fileMapping) {
  const filePath = path.join(SRC_DIR, entry.file);
  if (!fs.existsSync(filePath)) {
    console.log(`WARNING: File not found: ${entry.file}`);
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  console.log(`\nProcessing: ${entry.file}`);

  if (entry.halachaMap) {
    // Split HTML by halacha markers
    const halachaSections = splitByHalacha(html);
    console.log(`  Found ${Object.keys(halachaSections).length} halacha sections`);

    for (const [fileHNum, readerHNum] of Object.entries(entry.halachaMap)) {
      const sectionHtml = halachaSections[parseInt(fileHNum)];
      if (!sectionHtml) {
        console.log(`  WARNING: Halacha ${fileHNum} not found in file`);
        continue;
      }

      // Split by § sections within this halacha
      const sectionParts = splitBySections(sectionHtml);

      // Read the JSON to understand segment structure
      const jsonPath = path.join(READER_DIR, `halacha-${readerHNum}.json`);
      if (!fs.existsSync(jsonPath)) continue;
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Count content segments (skip "אות X" headers)
      const contentSegs = data.segments.filter(s => !/^אות\s+[א-ת]$/.test(s.he.trim()));

      // Extract English from each section part
      const allEnglish = [];
      for (const part of sectionParts) {
        const paragraphs = extractEnglishParagraphs(part);
        if (paragraphs.length > 0) {
          // Combine all paragraphs from this section into one
          allEnglish.push(paragraphs.join('\n\n'));
        }
      }

      console.log(`  Halacha ${fileHNum} -> reader ${readerHNum}: ${allEnglish.length} sections, ${contentSegs.length} content segments`);

      // Assign: if we have intro + sections matching the segments, do 1:1
      // Otherwise combine appropriately
      let enIdx = 0;
      for (let i = 0; i < data.segments.length; i++) {
        const seg = data.segments[i];
        if (/^אות\s+[א-ת]$/.test(seg.he.trim())) continue;

        if (enIdx < allEnglish.length) {
          seg.en = allEnglish[enIdx];
          enIdx++;
        } else if (allEnglish.length > 0) {
          // No more sections - this can happen if segment count doesn't match
          break;
        }
      }

      // If we had all English in one blob and multiple segments, assign it all to first content seg
      if (allEnglish.length === 1 && contentSegs.length === 1) {
        // Already handled
      } else if (allEnglish.length === 0) {
        console.log(`  WARNING: No English extracted for halacha ${readerHNum}`);
        continue;
      }

      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      console.log(`  Updated halacha-${readerHNum}.json`);
      updated++;
    }
  } else if (entry.multiHalacha) {
    // Large file with multiple halachos - split by whatever markers exist
    const halachaSections = splitByHalacha(html);
    console.log(`  Found halacha sections:`, Object.keys(halachaSections).join(', '));

    // For the giluach file, we need to figure out the mapping
    // Let's read each reader JSON title and match to the file sections
    // reader 89-102 are the missing ones
    for (let hNum = 89; hNum <= 102; hNum++) {
      const jsonPath = path.join(READER_DIR, `halacha-${hNum}.json`);
      if (!fs.existsSync(jsonPath)) continue;
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Check if already has English
      const hasExisting = data.segments.some(s => s.en && s.en.trim().length > 10);
      if (hasExisting) {
        console.log(`  halacha-${hNum} (${data.title}): already has English`);
        continue;
      }

      console.log(`  Looking for translation for halacha-${hNum}: ${data.title}`);
    }

    // The file has numbered halachas - let's extract them all and distribute
    // Actually, let me check what sections exist
    // We need to use the entire HTML content and split it intelligently

    // Try splitting by any heading/title patterns
    const allEnglish = extractEnglishParagraphs(html);
    console.log(`  Total English paragraphs in file: ${allEnglish.length}`);

    // For now, read all the segment counts
    let totalSegs = 0;
    const halachaInfos = [];
    for (let hNum = 89; hNum <= 102; hNum++) {
      const jsonPath = path.join(READER_DIR, `halacha-${hNum}.json`);
      if (!fs.existsSync(jsonPath)) continue;
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const hasExisting = data.segments.some(s => s.en && s.en.trim().length > 10);
      if (hasExisting) continue;

      const contentSegs = data.segments.filter(s => !/^אות\s+[א-ת]$/.test(s.he.trim()));
      halachaInfos.push({ hNum, data, contentCount: contentSegs.length });
      totalSegs += contentSegs.length;
    }

    console.log(`  Total content segments for halachas 89-102: ${totalSegs}`);
    console.log(`  English paragraphs available: ${allEnglish.length}`);

    // Distribute proportionally
    let enIdx = 0;
    for (const info of halachaInfos) {
      const share = Math.max(1, Math.round((info.contentCount / totalSegs) * allEnglish.length));
      const sectionEnglish = allEnglish.slice(enIdx, enIdx + share);
      enIdx += share;

      if (sectionEnglish.length === 0) continue;

      let segEnIdx = 0;
      for (let i = 0; i < info.data.segments.length; i++) {
        const seg = info.data.segments[i];
        if (/^אות\s+[א-ת]$/.test(seg.he.trim())) continue;

        if (segEnIdx < sectionEnglish.length) {
          seg.en = sectionEnglish[segEnIdx];
          segEnIdx++;
        } else if (sectionEnglish.length > 0) {
          // Combine remaining into last content segment
          const lastContentIdx = info.data.segments.findLastIndex(s => !/^אות\s+[א-ת]$/.test(s.he.trim()));
          if (lastContentIdx >= 0 && !info.data.segments[lastContentIdx].en) {
            info.data.segments[lastContentIdx].en = sectionEnglish.slice(segEnIdx).join('\n\n');
          }
          break;
        }
      }

      info.data.hasEnglish = true;
      const jsonPath = path.join(READER_DIR, `halacha-${info.hNum}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(info.data, null, 2));
      console.log(`  Updated halacha-${info.hNum}.json (${info.data.title})`);
      updated++;
    }
  }
}

// Update the index file
const indexPath = path.join(READER_DIR, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
let indexUpdated = 0;
for (const item of index.torahs) {
  const jsonPath = path.join(READER_DIR, `halacha-${item.number}.json`);
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (data.hasEnglish && !item.hasEnglish) {
      item.hasEnglish = true;
      indexUpdated++;
    }
  }
}
if (indexUpdated > 0) {
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\nUpdated index.json: ${indexUpdated} entries marked hasEnglish`);
}

console.log(`\nTotal files updated: ${updated}`);
