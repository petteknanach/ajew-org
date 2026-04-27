/**
 * Add English to Likutay Halachos from HTML translation files.
 * Maps translation filenames (English transliterations) to Hebrew reader sections.
 *
 * Translation volumes → Reader parts:
 *   OC1 → Part 1, OC2 → Part 2, OC3 → Part 3
 *   YD1 → Part 4, YD2 → Part 5
 *   EH → Part 6
 *   CM1 → Part 7, CM2 → Part 8
 */
const fs = require('fs');
const path = require('path');

const TRANS_BASE = 'C:/Users/Pettek/Documents/Translations/Likutay Halachos';
const READER_BASE = path.join(__dirname, '../public/reader/likutay-halachos');

// Volume mapping: translation folder → reader part number
const VOLUMES = [
  { folder: 'Likutay Halachos - Orach Chaim - 1', part: 1 },
  { folder: 'Likutay Halachos - Orach Chaim - 2', part: 2 },
  { folder: 'Likutay Halachos - Orach Chaim - 3', part: 3 },
  { folder: 'Likutay Halachos - Yoreh Daya - 1', part: 4 },
  { folder: 'Likutay Halachos - Yoreh Daya - 2', part: 5 },
  { folder: 'Likutay Halachos - Evven Hu-ezehr', part: 6 },
  { folder: 'Likutay Halachos - Choshen Mishpat - 1', part: 7 },
  { folder: 'Likutay Halachos - Choshen Mishpat - 2', part: 8 },
];

// Transliteration to Hebrew keyword mapping for matching
const TRANSLITERATIONS = {
  'hakdama': 'הקדמה',
  'hashkamas': 'השכמת',
  'hashkama': 'השכמת',
  'levisha': 'לבישת',
  'netilas': 'נטילת',
  'nitteylas': 'נטילת',
  'netilat': 'נטילת',
  'yadayim': 'ידים',
  'tzitzis': 'ציצית',
  'tzitzit': 'ציצית',
  'tefillin': 'תפילין',
  'teffilin': 'תפילין',
  'birchos': 'ברכות',
  'brochos': 'ברכות',
  'brachos': 'ברכות',
  'birkas': 'ברכת',
  'birkat': 'ברכת',
  'hashachar': 'השחר',
  'pesukay': 'פסוקי',
  'pesukei': 'פסוקי',
  'krias': 'קריאת',
  'kriat': 'קריאת',
  'shma': 'שמע',
  'shema': 'שמע',
  'tefila': 'תפלה',
  'tefilah': 'תפלה',
  'mincha': 'מנחה',
  'maariv': 'מעריב',
  'masa': 'משא',
  'masan': 'משא',
  'umasan': 'ומתן',
  'seuda': 'סעודה',
  'seudah': 'סעודה',
  'lseuda': 'לסעודה',
  'lseudah': 'לסעודה',
  'shabbos': 'שבת',
  'shabbat': 'שבת',
  'techumin': 'תחומין',
  'eruv': 'עירוב',
  'eruvay': 'עירובי',
  'rosh': 'ראש',
  'chodesh': 'חודש',
  'chanuka': 'חנוכה',
  'chanukah': 'חנוכה',
  'purim': 'פורים',
  'pesach': 'פסח',
  'megila': 'מגילה',
  'megillah': 'מגילה',
  'taanit': 'תענית',
  'taanis': 'תענית',
  'shechita': 'שחיטה',
  'shechitah': 'שחיטה',
  'traifos': 'טריפות',
  'treifos': 'טריפות',
  'basar': 'בשר',
  'bchalav': 'בחלב',
  'chalav': 'חלב',
  'melicha': 'מליחה',
  'dam': 'דם',
  'beitza': 'ביצה',
  'gid': 'גיד',
  'hanashe': 'הנשה',
  'tolaim': 'תולעים',
  'orlah': 'ערלה',
  'kilai': 'כלאי',
  'chadash': 'חדש',
  'chala': 'חלה',
  'challah': 'חלה',
  'nedarim': 'נדרים',
  'shevuos': 'שבועות',
  'kivod': 'כבוד',
  'rabo': 'רבו',
  'melamdim': 'מלמדים',
  'tzeduka': 'צדקה',
  'tzedakah': 'צדקה',
  'maachalos': 'מאכלות',
  'asuros': 'אסורות',
  'pirya': 'פריה',
  'virivya': 'ורביה',
  'ishus': 'אישות',
  'kesuvos': 'כתובות',
  'kesubos': 'כתובות',
  'gittin': 'גיטין',
  'gitin': 'גיטין',
  'dayonim': 'דיינים',
  'dayyanim': 'דיינים',
  'aidus': 'עדות',
  'edus': 'עדות',
  'halvaah': 'הלוואה',
  'halvaa': 'הלוואה',
  'pikadon': 'פקדון',
  'sechirus': 'שכירות',
  'shluhin': 'שלוחין',
  'arev': 'ערב',
  'toan': 'טוען',
  'gneiva': 'גניבה',
  'gezeila': 'גזילה',
  'nizkei': 'נזקי',
  'chovel': 'חובל',
  'matanah': 'מתנה',
  'matana': 'מתנה',
  'yerusha': 'ירושה',
  'apotropos': 'אפוטרופוס',
  'nachalos': 'נחלות',
};

function extractHTML(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    // Strip HTML tags, keep paragraph breaks
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) { return null; }
}

function filterEnglish(text) {
  return text.split('\n').map(l => l.trim()).filter(l => {
    if (l.length < 5) return false;
    const heb = (l.match(/[\u0590-\u05FF]/g) || []).length;
    const total = l.replace(/\s/g, '').length;
    if (total > 0 && heb / total > 0.5) return false;
    if (/^\d+$/.test(l)) return false;
    return true;
  });
}

function applyEnglish(jsonPath, englishParas) {
  if (!fs.existsSync(jsonPath) || englishParas.length === 0) return false;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const segCount = data.segments.length;
  const enCount = englishParas.length;

  if (enCount <= segCount) {
    for (let i = 0; i < enCount; i++) data.segments[i].en = englishParas[i];
  } else {
    const ratio = enCount / segCount;
    for (let i = 0; i < segCount; i++) {
      const s = Math.floor(i * ratio), e = Math.floor((i + 1) * ratio);
      data.segments[i].en = englishParas.slice(s, e).join('\n\n');
    }
  }
  data.hasEnglish = true;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  return true;
}

// Extract halacha name and number from filename
function parseFilename(filename) {
  const lower = filename.toLowerCase().replace(/\.html$/, '').replace(/^\d+\s*/, '');

  // Try to extract topic name and number
  // Patterns like "hashkamas1", "dayonim_3_part2", "shabbos_5", "Matanah_2"
  let topic = null;
  let halachaNum = null;

  // Try common patterns
  for (const [eng, heb] of Object.entries(TRANSLITERATIONS)) {
    if (lower.includes(eng.toLowerCase())) {
      topic = heb;
      // Try to find a number after the topic
      const afterTopic = lower.split(eng.toLowerCase()).pop();
      const numMatch = afterTopic.match(/[\s_]*(\d+)/);
      if (numMatch) halachaNum = parseInt(numMatch[1]);
      break;
    }
  }

  return { topic, halachaNum, raw: lower };
}

// Find best matching reader halacha for a given topic + number within a part
function findMatch(partDir, topic, halachaNum) {
  const files = fs.readdirSync(partDir).filter(f => f.startsWith('halacha-') && f.endsWith('.json'));
  const matches = [];

  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(partDir, f), 'utf8'));
    const title = data.hebrewTitle || '';

    if (topic && title.includes(topic)) {
      // Check if the number matches
      const hebrewNums = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10 };
      const lastChar = title.trim().slice(-1);
      const titleNum = hebrewNums[lastChar] || 0;

      if (halachaNum && titleNum === halachaNum) {
        return { file: f, title, exact: true };
      }
      matches.push({ file: f, title, titleNum });
    }
  }

  // If we have matches but no exact number match, try the first one
  if (matches.length > 0 && halachaNum) {
    // Sort by titleNum and find closest
    const sorted = matches.sort((a, b) => Math.abs(a.titleNum - halachaNum) - Math.abs(b.titleNum - halachaNum));
    return { file: sorted[0].file, title: sorted[0].title, exact: false };
  }

  if (matches.length === 1) {
    return { file: matches[0].file, title: matches[0].title, exact: true };
  }

  return null;
}

function main() {
  let totalUpdated = 0;
  let totalFiles = 0;
  let totalSkipped = 0;

  for (const vol of VOLUMES) {
    const transDir = path.join(TRANS_BASE, vol.folder);
    const partDir = path.join(READER_BASE, `part-${vol.part}`);

    if (!fs.existsSync(transDir) || !fs.existsSync(partDir)) {
      console.log(`Skipping ${vol.folder}: directory not found`);
      continue;
    }

    const htmlFiles = fs.readdirSync(transDir).filter(f => f.endsWith('.html'));
    console.log(`\n=== Part ${vol.part}: ${vol.folder} (${htmlFiles.length} HTML files) ===`);

    // Build index of all reader halachos for this part
    const readerFiles = fs.readdirSync(partDir).filter(f => f.startsWith('halacha-'));
    const readerIndex = {};
    for (const f of readerFiles) {
      const d = JSON.parse(fs.readFileSync(path.join(partDir, f), 'utf8'));
      const num = parseInt(f.match(/halacha-(\d+)/)[1]);
      readerIndex[num] = { file: f, title: d.hebrewTitle };
    }

    let volUpdated = 0;

    // Sort HTML files by their numeric prefix
    htmlFiles.sort((a, b) => {
      const na = parseInt(a.match(/^(\d+)/)?.[1] || '999');
      const nb = parseInt(b.match(/^(\d+)/)?.[1] || '999');
      return na - nb;
    });

    // Strategy: process files in order and try to match sequentially
    // Many files cover multiple halachos or parts of halachos
    let currentReaderIdx = 1;

    for (const htmlFile of htmlFiles) {
      totalFiles++;
      const text = extractHTML(path.join(transDir, htmlFile));
      if (!text) { totalSkipped++; continue; }

      const englishParas = filterEnglish(text);
      if (englishParas.length < 2) { totalSkipped++; continue; }

      const parsed = parseFilename(htmlFile);

      // Try to find a match
      let matched = false;

      if (parsed.topic) {
        const match = findMatch(partDir, parsed.topic, parsed.halachaNum);
        if (match) {
          const jsonPath = path.join(partDir, match.file);
          if (applyEnglish(jsonPath, englishParas)) {
            volUpdated++;
            totalUpdated++;
            matched = true;
          }
        }
      }

      // If no topic match, try sequential assignment
      if (!matched) {
        // Try current index
        if (readerIndex[currentReaderIdx]) {
          const jsonPath = path.join(partDir, readerIndex[currentReaderIdx].file);
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          if (!data.hasEnglish) {
            if (applyEnglish(jsonPath, englishParas)) {
              volUpdated++;
              totalUpdated++;
              matched = true;
              currentReaderIdx++;
            }
          } else {
            currentReaderIdx++;
          }
        }
      }

      if (!matched) totalSkipped++;
    }

    // Update index.json
    const indexPath = path.join(partDir, 'index.json');
    if (fs.existsSync(indexPath)) {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      for (const torah of index.torahs) {
        const jp = path.join(partDir, `halacha-${torah.number}.json`);
        if (fs.existsSync(jp)) {
          torah.hasEnglish = JSON.parse(fs.readFileSync(jp, 'utf8')).hasEnglish;
        }
      }
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    }

    console.log(`  Updated: ${volUpdated} halachos`);
  }

  console.log(`\n========================================`);
  console.log(`TOTAL: ${totalUpdated} halachos with English`);
  console.log(`Files processed: ${totalFiles}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`========================================`);
}

main();
