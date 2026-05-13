/**
 * Fix English-Hebrew alignment in Likutay Moharan reader JSON files.
 *
 * Strategy:
 * 1. Collect all English text from the file
 * 2. For each Hebrew segment, find matching content in the English
 * 3. Split English at matched boundaries and assign to correct segments
 *
 * Uses Hebrew-to-English keyword anchors to find split points.
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'public', 'reader', 'likutay-moharan');

// Hebrew-to-English phrase mappings for finding split points
const HE_EN_ANCHORS = [
  // Common structural phrases
  ['וְזֶה פֵּרוּשׁ', 'this interpretation'],
  ['וְזֶה שֶׁאָמְרוּ חֲכָמֵינוּ', 'this that our sages'],
  ['וְזֶה שֶׁאָמַר', 'this that said'],
  ['וְזֶה בְּחִינַת', 'this aspect of'],
  ['הַיְנוּ', 'that is'],
  ['כִּי הִנֵּה', 'because behold'],
  ['וְהִנֵּה', 'and behold'],
  ['אִי אֶפְשָׁר', 'impossible'],
  ['וְעִקַּר', 'and main'],
  ['כְּשֶׁ', 'when'],
  ['וְעַכְשָׁו', 'and now'],
  ['וְלָבוֹא', 'and to come'],
  ['רַבָּה בַּר בַּר חָנָה', 'Rabba bar bar Chana'],
  ['רַבָּה בַּר בַּר חָנָה', 'Rabba bar bar Hana'],
  ['רשב"ם', 'Rashbam'],
  ['אוּרְזִילָא', 'urzila'],
  ['פֵּרוּשׁ רַשְׁבַּ', 'Rashbam'],
  ['בְּלוּעֵי דְּקרַח', 'swallowed of Korach'],
  ['תִּקְעוּ', 'blow'],
  ['נֵר חֲנֻכָּה', 'Chanukah'],
];

// Ois number to Hebrew letter mapping
const OIS_MAP = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16,
  'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20, 'כא': 21, 'כב': 22, 'כג': 23,
  'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30
};

function isOisMarker(he) {
  const trimmed = (he || '').trim().replace(/[.\s]/g, '');
  return OIS_MAP.hasOwnProperty(trimmed) || trimmed === 'רשב"ם' || trimmed.length <= 2 && /^[\u0590-\u05FF]+$/.test(trimmed);
}

function extractKeywords(he) {
  // Extract meaningful phrases from Hebrew to search in English
  const keywords = [];

  // Look for verse references
  const verseMatch = he.match(/\(([^)]+)\)/);
  if (verseMatch) keywords.push(verseMatch[1]);

  // Look for Talmud/Midrash references
  const refs = he.match(/(סנהדרין|שבת|ערובין|נדרים|בבא מציעא|תענית|ערכין|סוכה|יומא|פסחים|אבות|זוהר|מדרש|בראשית רבה|תהלים|משלי|ישעיה|ירמיה|דניאל|שמות|ויקרא|במדבר|דברים|יחזקאל|זכריה|שיר השירים|צפניה)/);
  if (refs) keywords.push(refs[1]);

  return keywords;
}

function findBestSplitPoint(enText, heSegment, startFrom) {
  const he = heSegment.he_nikud || heSegment.he || '';

  // Try to find content-matching phrases
  for (const [hePat, enPat] of HE_EN_ANCHORS) {
    if (he.includes(hePat.replace(/[\u0591-\u05C7]/g, ''))) {
      // Search for English equivalent after startFrom
      const idx = enText.toLowerCase().indexOf(enPat.toLowerCase(), startFrom);
      if (idx > startFrom) {
        // Find sentence boundary before this match
        let splitAt = idx;
        // Look back for period, newline, or sentence end
        for (let j = idx - 1; j > Math.max(startFrom, idx - 100); j--) {
          if (enText[j] === '.' || enText[j] === '\n') {
            splitAt = j + 1;
            break;
          }
        }
        return splitAt;
      }
    }
  }

  // Fallback: look for specific Hebrew words in English transliteration
  const heClean = he.replace(/[\u0591-\u05C7]/g, '');

  // Check for Rabba bar bar Chana
  if (heClean.includes('רבה בר בר חנה')) {
    const idx = enText.toLowerCase().indexOf('rabba bar', startFrom);
    if (idx > startFrom) return findSentenceStart(enText, idx);
  }

  // Check for Rashbam
  if (heClean.includes('רשב') || heClean.includes('פרוש רשב')) {
    const idx = enText.toLowerCase().indexOf('rashbam', startFrom);
    if (idx > startFrom) return findSentenceStart(enText, idx);
  }

  // Check for urzila
  if (heClean.includes('אורזילא')) {
    const idx = enText.toLowerCase().indexOf('urzila', startFrom);
    if (idx > startFrom) return findSentenceStart(enText, idx);
  }

  return -1;
}

function findSentenceStart(text, pos) {
  // Find the start of the sentence containing pos
  for (let i = pos - 1; i > Math.max(0, pos - 200); i--) {
    if (text[i] === '.' || text[i] === '\n') {
      return i + 1;
    }
  }
  return pos;
}

function fixTorah(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segs = data.segments;

  // Collect all English text
  let allEnglish = '';
  const enParts = [];
  segs.forEach((s, i) => {
    if (s.en && s.en.trim()) {
      enParts.push({ index: i, text: s.en, start: allEnglish.length });
      allEnglish += s.en + '\n';
    }
  });

  if (enParts.length === 0) {
    console.log('  No English text found, skipping');
    return false;
  }

  const totalEn = allEnglish.length;
  const contentSegs = segs.filter(s => {
    const he = (s.he_nikud || s.he || '').trim();
    return he.length > 3; // Skip pure ois markers
  });

  console.log(`  Total English: ${totalEn} chars, ${segs.length} segments, ${contentSegs.length} content segments`);
  console.log(`  English in ${enParts.length} segments, ${segs.filter(s => !(s.en||'').trim()).length} empty`);

  // Strategy: use content matching to find split points
  // First, identify ois-marker-only segments (they get no English)
  const assignments = new Array(segs.length).fill(null);
  let cursor = 0; // Position in allEnglish

  for (let i = 0; i < segs.length; i++) {
    const he = (segs[i].he_nikud || segs[i].he || '').trim();

    // Skip ois markers (single letter segments like א, ב, ג or רשב"ם)
    if (he.length <= 6 && isOisMarker(he)) {
      assignments[i] = ''; // No English for ois markers
      continue;
    }

    // For content segments, try to find the matching English
    if (he.length > 3) {
      const splitPoint = findBestSplitPoint(allEnglish, segs[i], cursor);
      if (splitPoint > cursor) {
        // Assign everything from cursor to splitPoint to PREVIOUS content segment
        // And mark this segment's start
        assignments[i] = { start: splitPoint };
      } else {
        assignments[i] = { start: cursor }; // Start from current position
      }
    }
  }

  // Now do a proper forward pass: distribute English proportionally within sections
  // Group segments by ois sections
  const sections = [];
  let currentSection = [];

  for (let i = 0; i < segs.length; i++) {
    const he = (segs[i].he_nikud || segs[i].he || '').trim();
    const isOis = he.length <= 6 && isOisMarker(he);

    if (isOis && currentSection.length > 0) {
      sections.push([...currentSection]);
      currentSection = [];
    }

    if (!isOis && he.length > 0) {
      currentSection.push(i);
    }
  }
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  // Now distribute English across sections using content matching
  let enCursor = 0;
  const newEn = new Array(segs.length).fill('');

  // Simple proportional distribution within content groups
  // First, find major anchor points to divide the text into sections
  const anchorPoints = [0]; // Start of text

  for (let si = 1; si < sections.length; si++) {
    const firstSegIdx = sections[si][0];
    const he = segs[firstSegIdx].he_nikud || segs[firstSegIdx].he || '';
    const split = findBestSplitPoint(allEnglish, segs[firstSegIdx], anchorPoints[anchorPoints.length - 1] + 50);
    if (split > anchorPoints[anchorPoints.length - 1]) {
      anchorPoints.push(split);
    } else {
      // Proportional fallback
      const proportion = si / sections.length;
      anchorPoints.push(Math.floor(totalEn * proportion));
    }
  }
  anchorPoints.push(totalEn);

  // Within each section, distribute proportionally by Hebrew length
  for (let si = 0; si < sections.length; si++) {
    const segIndices = sections[si];
    const sectionStart = anchorPoints[si];
    const sectionEnd = anchorPoints[si + 1];
    const sectionEn = allEnglish.substring(sectionStart, sectionEnd).trim();

    if (segIndices.length === 1) {
      newEn[segIndices[0]] = sectionEn;
    } else {
      // Distribute by Hebrew length
      const totalHe = segIndices.reduce((sum, idx) => {
        return sum + (segs[idx].he_nikud || segs[idx].he || '').length;
      }, 0);

      let pos = 0;
      for (let j = 0; j < segIndices.length; j++) {
        const idx = segIndices[j];
        const heLen = (segs[idx].he_nikud || segs[idx].he || '').length;
        const proportion = heLen / totalHe;

        if (j === segIndices.length - 1) {
          // Last segment gets remaining text
          newEn[idx] = sectionEn.substring(pos).trim();
        } else {
          const targetEnd = pos + Math.floor(sectionEn.length * proportion);
          // Find sentence boundary near target
          let splitAt = targetEnd;
          // Search forward for sentence boundary
          for (let k = targetEnd; k < Math.min(targetEnd + 200, sectionEn.length); k++) {
            if (sectionEn[k] === '.' || sectionEn[k] === '\n') {
              splitAt = k + 1;
              break;
            }
          }
          // Search backward if nothing found forward
          if (splitAt === targetEnd) {
            for (let k = targetEnd; k > Math.max(targetEnd - 200, pos); k--) {
              if (sectionEn[k] === '.' || sectionEn[k] === '\n') {
                splitAt = k + 1;
                break;
              }
            }
          }
          newEn[idx] = sectionEn.substring(pos, splitAt).trim();
          pos = splitAt;
        }
      }
    }
  }

  // Apply the new English assignments
  let changed = 0;
  for (let i = 0; i < segs.length; i++) {
    const oldEn = (segs[i].en || '').trim();
    const newEnText = newEn[i] || '';
    if (oldEn !== newEnText.trim()) {
      segs[i].en = newEnText;
      changed++;
    }
  }

  // Verify: total English should be preserved
  const newTotal = segs.reduce((sum, s) => sum + (s.en || '').length, 0);
  const oldTotal = allEnglish.trim().length;

  console.log(`  Changed ${changed} segments`);
  console.log(`  English chars: ${oldTotal} → ${newTotal} (diff: ${newTotal - oldTotal})`);

  // Show distribution
  segs.forEach((s, i) => {
    const en = (s.en || '').length;
    const he = (s.he_nikud || s.he || '').length;
    const marker = en === 0 && he > 10 ? ' ⚠️EMPTY' : '';
    const crammedMark = en > 3000 ? ' 📦CRAMMED' : '';
    if (marker || crammedMark || en > 0) {
      console.log(`    Seg${i}: en=${en} he=${he}${marker}${crammedMark}`);
    }
  });

  // Write back
  data.segments = segs;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  ✅ Written: ${filePath}`);
  return true;
}

// Process all bad torahs
const BAD_TORAHS = [
  'part-1/torah-4', 'part-1/torah-6', 'part-1/torah-7', 'part-1/torah-8',
  'part-1/torah-10', 'part-1/torah-13', 'part-1/torah-14', 'part-1/torah-15',
  'part-1/torah-17', 'part-1/torah-33', 'part-1/torah-35', 'part-1/torah-60',
  'part-1/torah-61', 'part-1/torah-212', 'part-2/torah-4'
];

console.log('=== Fixing LM Alignment ===\n');

for (const torah of BAD_TORAHS) {
  const filePath = path.join(BASE, torah + '.json');
  console.log(`\nProcessing ${torah}...`);
  try {
    fixTorah(filePath);
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }
}

console.log('\n=== Done ===');
