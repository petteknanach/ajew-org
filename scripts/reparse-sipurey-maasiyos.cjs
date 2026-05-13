/**
 * Re-parse Sipurey Maasiyos into 13 individual story files.
 *
 * The Hebrew source has stories 4-8 combined in one @ section.
 * This script splits them properly and aligns English + nikud text.
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'reader', 'sipurey-maasiyos');

const HE_FILE = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks/1_ספרי רבי נחמן/04_ספורי מעשיות.txt';
const EN_FILE = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks/92_ספרים מתורגמים/סיפורי מעשיות באנגלית.txt';
const NIKUD_FILE = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks/1_ספרי רבי נחמן/05_ספורי מעשיות מנוקד.txt';

// Hebrew letter numbers
const HE_NUMBERS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג'];

// Story subtitles from the source
const STORY_SUBTITLES = {
  1: 'מאבדת בת מלך',
  2: 'ממלך וקיסר',
  3: 'מעשה מחגר',
  4: 'ממלך שגזר שמד',
  5: 'מעשה מבן מלך',
  6: 'מעשה ממלך ענו',
  7: 'מעשה מזבוב ועכביש',
  8: 'מעשה מרב ובן יחיד',
  9: 'מעשה מחכם ותם',
  10: 'מעשה מבערגיר ועני',
  11: 'מבן מלך ובן שפחה שנתחלפו',
  12: 'מעשה מבעל תפלה',
  13: 'מעשה מהשבעה קבצנים'
};

function readWin1255(filePath) {
  return iconv.decode(fs.readFileSync(filePath), 'win1255');
}

function stripMarkup(text) {
  text = text.replace(/^&HiddenFromIndex=[^\n]*/m, '');
  text = text.replace(/\{\{\{\{/g, '').replace(/\}\}\}\}/g, '');
  text = text.replace(/\(\(\(/g, '').replace(/\)\)\)/g, '');
  text = text.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
  text = text.replace(/\{([^}]*)\}/g, '($1)');
  text = text.replace(/\[\[\[/g, '').replace(/\]\]\]/g, '');
  text = text.replace(/\[\[/g, '').replace(/\]\]/g, '');
  text = text.replace(/<big>/gi, '').replace(/<\/big>/gi, '');
  text = text.replace(/<small>/gi, '').replace(/<\/small>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<hr\s*\/?>/gi, '\n');
  text = text.replace(/<b[^>]*>/gi, '').replace(/<\/b>/gi, '');
  text = text.replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '');
  text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/_nbsp_/g, ' ');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

function textToParagraphs(text) {
  const cleaned = stripMarkup(text);
  // Split on double newlines first
  let paragraphs = cleaned.split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(p => p.length > 0);
  // If only one paragraph but very long, try single newlines
  if (paragraphs.length <= 1 && cleaned.length > 500) {
    paragraphs = cleaned.split(/\n/).map(p => p.trim()).filter(p => p.length > 0);
  }
  return paragraphs;
}

function textToParagraphsEn(text) {
  const cleaned = stripMarkup(text);
  // English text: each line is typically its own paragraph
  let paragraphs = cleaned.split(/\n/).map(p => p.trim()).filter(p => p.length > 0);
  return paragraphs;
}

// --- Parse Hebrew stories ---
function parseHebrewStories() {
  const text = readWin1255(HE_FILE);
  const sections = text.split(/^@/m);
  // sections[0] = header, sections[1-9] = the 9 @ sections

  const stories = [];

  // Section 1 = Story 1
  stories.push({ num: 1, raw: sections[1] });
  // Section 2 = Story 2
  stories.push({ num: 2, raw: sections[2] });
  // Section 3 = Story 3
  stories.push({ num: 3, raw: sections[3] });

  // Section 4 = Stories 4, 5, 6, 7, 8 combined
  const sec4 = sections[4];
  // Split by "מעשה ה", "מעשה ו", "מעשה ז", "מעשה ח" lines
  // The section starts with story 4 content, then the markers start new stories
  // Find all marker positions - match "מעשה X -" or "מעשה X " where X is a single letter
  // \b doesn't work with Hebrew, so match the pattern: מעשה + space + single letter + space + dash
  const lines = sec4.split('\n');
  const markerIndices = [];
  const storyMarkerRe = /^מעשה\s+(ה|ו|ז|ח)\s*[-–]/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (storyMarkerRe.test(line)) {
      markerIndices.push(i);
    }
  }

  // Story 4: from beginning to first marker
  stories.push({ num: 4, raw: lines.slice(0, markerIndices[0]).join('\n') });
  // Stories 5-8: between markers
  for (let i = 0; i < markerIndices.length; i++) {
    const start = markerIndices[i];
    const end = i < markerIndices.length - 1 ? markerIndices[i + 1] : lines.length;
    stories.push({ num: 5 + i, raw: lines.slice(start, end).join('\n') });
  }

  // Section 5 = Story 9
  stories.push({ num: 9, raw: sections[5] });
  // Section 6 = Story 10
  stories.push({ num: 10, raw: sections[6] });
  // Section 7 = Story 11
  stories.push({ num: 11, raw: sections[7] });
  // Section 8 = Story 12
  stories.push({ num: 12, raw: sections[8] });
  // Section 9 = Story 13
  stories.push({ num: 13, raw: sections[9] });

  // Convert to paragraphs
  for (const story of stories) {
    // Remove the title line (first non-empty line that starts with מעשה or a letter)
    let rawText = story.raw;
    // Remove title line
    const titleLine = rawText.trim().split('\n')[0];
    story.titleLine = titleLine.replace(/\r/g, '').trim();
    story.paragraphs = textToParagraphs(rawText);
    // Remove the title from paragraphs if it appears as first paragraph
    if (story.paragraphs.length > 0) {
      const firstPara = story.paragraphs[0];
      const cleanTitle = stripMarkup(story.titleLine);
      if (firstPara === cleanTitle || firstPara.startsWith(cleanTitle)) {
        // If the title IS the first paragraph alone, remove it
        if (firstPara === cleanTitle) {
          story.paragraphs.shift();
        }
        // If title is part of the first paragraph, keep it (story text starts on same line)
      }
    }
  }

  console.log('Hebrew stories parsed:');
  for (const s of stories) {
    console.log(`  Story ${s.num}: "${s.titleLine?.substring(0, 50)}" - ${s.paragraphs.length} paragraphs`);
  }

  return stories;
}

// --- Parse English stories ---
function parseEnglishStories() {
  const text = readWin1255(EN_FILE);
  const sections = text.split(/^@/m);
  // sections[0] = header
  // sections[1] = Salutation, sections[2] = Foreword
  // sections[3-15] = Story 1-13

  const stories = [];
  for (let i = 3; i <= 15; i++) {
    const storyNum = i - 2;
    const raw = sections[i] || '';
    // Split into lines, trim each, filter empties
    let lines = raw.split(/\r?\n/).map(l => l.trim());
    // Remove header lines: "Story N", "of"/"Of", English title
    // First non-empty line should be "Story N"
    while (lines.length > 0 && lines[0] === '') lines.shift();
    if (lines.length > 0 && lines[0].match(/^Story\s+\d+/i)) lines.shift();
    while (lines.length > 0 && lines[0] === '') lines.shift();
    // "of" / "Of" line
    if (lines.length > 0 && lines[0].match(/^[Oo]f$/)) lines.shift();
    while (lines.length > 0 && lines[0] === '') lines.shift();
    // English title line (non-empty, not starting with typical story text patterns)
    if (lines.length > 0) lines.shift(); // remove title
    while (lines.length > 0 && lines[0] === '') lines.shift();
    // Remove parenthetical subtitle/date lines like "(The Loss of a King's Daughter)" or "(Summer of 5567)"
    while (lines.length > 0 && lines[0].match(/^\(.*\)$/)) lines.shift();
    while (lines.length > 0 && lines[0] === '') lines.shift();
    // Remove "--- ... ---" lines
    while (lines.length > 0 && lines[0].match(/^---.*---$/)) lines.shift();
    while (lines.length > 0 && lines[0] === '') lines.shift();

    const paragraphs = textToParagraphsEn(lines.join('\n'));
    stories.push({ num: storyNum, paragraphs });
  }

  console.log('\nEnglish stories parsed:');
  for (const s of stories) {
    console.log(`  Story ${s.num}: ${s.paragraphs.length} paragraphs`);
  }

  return stories;
}

// --- Parse Nikud stories ---
function parseNikudStories() {
  const text = readWin1255(NIKUD_FILE);
  const sections = text.split(/^@/m);
  // Nikud sections: 1-8 = stories 1-8, 9 = story 10, 10 = story 11, 11 = story 12, 12 = story 13
  // Story 9 is missing from nikud file
  // Section 6 has a stray "מעשה ז'" marker at the end - need to remove it

  const nikudMap = {}; // storyNum -> paragraphs

  // Stories 1-8 map directly to sections 1-8
  for (let i = 1; i <= 8; i++) {
    let raw = sections[i] || '';
    // Clean up stray markers from end of section 6
    if (i === 6) {
      // Remove the stray "מעשה ז'" line at the end
      const lines = raw.split('\n');
      const filtered = lines.filter(l => !l.trim().match(/^מעשה ז['׳]/));
      raw = filtered.join('\n');
    }
    const paragraphs = textToParagraphs(raw);
    // Remove title line
    if (paragraphs.length > 0 && paragraphs[0].match(/מעשה/)) {
      // Check if this is a title-only paragraph
      const cleanFirst = stripNikud(paragraphs[0]);
      if (cleanFirst.match(/^מעשה [א-ת]/)) {
        // Could be title only or title + content
        // If it's short (< 80 chars without nikud), it's probably just a title
        if (cleanFirst.length < 80) {
          paragraphs.shift();
        }
      }
    }
    nikudMap[i] = paragraphs;
  }

  // Story 9 is missing from nikud
  nikudMap[9] = [];

  // Sections 9-12 = stories 10-13
  for (let i = 9; i <= 12; i++) {
    const storyNum = i + 1; // section 9 -> story 10, etc.
    let raw = sections[i] || '';
    const paragraphs = textToParagraphs(raw);
    // Remove title line
    if (paragraphs.length > 0) {
      const cleanFirst = stripNikud(paragraphs[0]);
      if (cleanFirst.match(/^מעשה/) && cleanFirst.length < 80) {
        paragraphs.shift();
      }
    }
    nikudMap[storyNum] = paragraphs;
  }

  console.log('\nNikud stories parsed:');
  for (let i = 1; i <= 13; i++) {
    console.log(`  Story ${i}: ${nikudMap[i]?.length || 0} paragraphs${i === 9 ? ' (missing from nikud source)' : ''}`);
  }

  return nikudMap;
}

// --- Match nikud paragraphs to Hebrew paragraphs ---
function matchNikudToHebrew(heParagraphs, nikudParagraphs) {
  if (!nikudParagraphs || nikudParagraphs.length === 0) {
    return heParagraphs.map(() => '');
  }

  // For each Hebrew paragraph, find the best matching nikud paragraph
  const result = [];
  const usedNikud = new Set();

  for (const hePara of heParagraphs) {
    const heNorm = stripNikud(hePara).replace(/\s+/g, ' ').trim();
    let bestMatch = '';
    let bestScore = 0;
    let bestIdx = -1;

    for (let j = 0; j < nikudParagraphs.length; j++) {
      if (usedNikud.has(j)) continue;
      const nikNorm = stripNikud(nikudParagraphs[j]).replace(/\s+/g, ' ').trim();

      // Check if the first 30 chars match (normalized)
      const heStart = heNorm.substring(0, 30);
      const nikStart = nikNorm.substring(0, 30);

      if (heStart === nikStart) {
        bestMatch = nikudParagraphs[j];
        bestIdx = j;
        bestScore = 1;
        break;
      }

      // Fuzzy: check if first 15 chars match
      const heShort = heNorm.substring(0, 15);
      const nikShort = nikNorm.substring(0, 15);
      if (heShort === nikShort && bestScore < 0.5) {
        bestMatch = nikudParagraphs[j];
        bestIdx = j;
        bestScore = 0.5;
      }
    }

    if (bestIdx >= 0) {
      usedNikud.add(bestIdx);
    }
    result.push(bestMatch);
  }

  return result;
}

// --- Align English paragraphs to Hebrew segments ---
function alignEnglishToHebrew(heParagraphs, enParagraphs) {
  const M = heParagraphs.length;
  const N = enParagraphs.length;

  if (N === 0) return heParagraphs.map(() => '');
  if (N === M) return [...enParagraphs];

  const result = new Array(M).fill('');

  if (N < M) {
    // Fewer English than Hebrew - put English in first N segments
    for (let i = 0; i < N; i++) {
      result[i] = enParagraphs[i];
    }
  } else {
    // More English than Hebrew - distribute proportionally
    for (let i = 0; i < M; i++) {
      const startEn = Math.floor((i / M) * N);
      const endEn = Math.floor(((i + 1) / M) * N);
      const merged = enParagraphs.slice(startEn, endEn).join('\n\n');
      result[i] = merged;
    }
  }

  return result;
}

// --- Main ---
function main() {
  console.log('=== Re-parsing Sipurey Maasiyos ===\n');

  const heStories = parseHebrewStories();
  const enStories = parseEnglishStories();
  const nikudMap = parseNikudStories();

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Delete old files
  const oldFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('story-'));
  for (const f of oldFiles) {
    fs.unlinkSync(path.join(OUTPUT_DIR, f));
    console.log(`\nDeleted old file: ${f}`);
  }

  const indexTorahs = [];

  for (let i = 0; i < heStories.length; i++) {
    const story = heStories[i];
    const n = story.num;
    const enStory = enStories.find(s => s.num === n);
    const nikudParas = nikudMap[n] || [];

    // Align English
    const alignedEn = alignEnglishToHebrew(story.paragraphs, enStory?.paragraphs || []);

    // Match nikud
    const alignedNikud = matchNikudToHebrew(story.paragraphs, nikudParas);

    // Build segments
    const segments = story.paragraphs.map((he, idx) => ({
      index: idx + 1,
      he: he,
      en: alignedEn[idx] || '',
      he_nikud: alignedNikud[idx] || ''
    }));

    const hasEnglish = segments.some(s => s.en.length > 0);
    const hasNikud = segments.some(s => s.he_nikud.length > 0);

    const title = `מעשה ${HE_NUMBERS[n]} - ${STORY_SUBTITLES[n]}`;
    const hebrewTitle = `מעשה ${HE_NUMBERS[n]}`;

    // Navigation
    const prev = n > 1 ? { url: `/reader/sipurey-maasiyos/1/${n - 1}`, title: `מעשה ${HE_NUMBERS[n - 1]}` } : null;
    const next = n < 13 ? { url: `/reader/sipurey-maasiyos/1/${n + 1}`, title: `מעשה ${HE_NUMBERS[n + 1]}` } : null;

    const json = {
      id: `sm-${n}`,
      book: 'sipurey-maasiyos',
      part: 1,
      torah: n,
      displayNumber: n,
      title: title,
      hebrewTitle: hebrewTitle,
      segments: segments,
      totalParagraphs: segments.length,
      hasEnglish: hasEnglish,
      hasNikud: hasNikud,
      navigation: { prev, next }
    };

    const outFile = path.join(OUTPUT_DIR, `story-${n}.json`);
    fs.writeFileSync(outFile, JSON.stringify(json, null, 2), 'utf8');
    console.log(`\nWrote story-${n}.json: "${title}" - ${segments.length} segments, en=${hasEnglish}, nikud=${hasNikud}`);

    indexTorahs.push({
      number: n,
      displayNumber: n,
      title: title,
      hebrewTitle: hebrewTitle,
      themes: [],
      paragraphs: segments.length,
      hasEnglish: hasEnglish,
      url: `/reader/sipurey-maasiyos/1/${n}`
    });
  }

  // Write index.json
  const indexJson = {
    book: 'sipurey-maasiyos',
    part: 1,
    title: 'Sipurey Maasiyos - The Stories',
    hebrewTitle: 'סיפורי מעשיות',
    author: 'Rabbi Nachman of Breslov',
    hebrewAuthor: 'רבי נחמן מברסלב',
    totalTorahs: 13,
    torahs: indexTorahs
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');
  console.log(`\nWrote index.json with ${indexTorahs.length} stories`);

  console.log('\n=== Done! ===');
}

main();
