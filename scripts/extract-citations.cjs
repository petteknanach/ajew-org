/**
 * Extract all source citations from Likutay Moharan texts.
 * Scans all 408 torah JSON files, extracts parenthetical Hebrew citations,
 * parses book names and chapter/verse/page numbers, and outputs a citation index.
 *
 * Output: public/data/citations-index.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LM_BASE = path.join(ROOT, 'public/reader/likutay-moharan');
const OUTPUT = path.join(ROOT, 'public/data/citations-index.json');

// Hebrew book name → English name + type
const BOOK_MAP = {
  // Torah
  'בראשית': { en: 'Genesis', type: 'tanach' },
  'שמות': { en: 'Exodus', type: 'tanach' },
  'ויקרא': { en: 'Leviticus', type: 'tanach' },
  'במדבר': { en: 'Numbers', type: 'tanach' },
  'דברים': { en: 'Deuteronomy', type: 'tanach' },
  // Neviim
  'יהושע': { en: 'Joshua', type: 'tanach' },
  'שופטים': { en: 'Judges', type: 'tanach' },
  'שמואל': { en: 'Samuel', type: 'tanach' },
  'שמואל א': { en: 'I Samuel', type: 'tanach' },
  'שמואל ב': { en: 'II Samuel', type: 'tanach' },
  'מלכים': { en: 'Kings', type: 'tanach' },
  'מלכים א': { en: 'I Kings', type: 'tanach' },
  'מלכים ב': { en: 'II Kings', type: 'tanach' },
  'ישעיהו': { en: 'Isaiah', type: 'tanach' },
  'ישעיה': { en: 'Isaiah', type: 'tanach' },
  'ירמיהו': { en: 'Jeremiah', type: 'tanach' },
  'ירמיה': { en: 'Jeremiah', type: 'tanach' },
  'יחזקאל': { en: 'Ezekiel', type: 'tanach' },
  'הושע': { en: 'Hosea', type: 'tanach' },
  'יואל': { en: 'Joel', type: 'tanach' },
  'עמוס': { en: 'Amos', type: 'tanach' },
  'עובדיה': { en: 'Obadiah', type: 'tanach' },
  'יונה': { en: 'Jonah', type: 'tanach' },
  'מיכה': { en: 'Micah', type: 'tanach' },
  'נחום': { en: 'Nahum', type: 'tanach' },
  'חבקוק': { en: 'Habakkuk', type: 'tanach' },
  'צפניה': { en: 'Zephaniah', type: 'tanach' },
  'חגי': { en: 'Haggai', type: 'tanach' },
  'זכריה': { en: 'Zechariah', type: 'tanach' },
  'מלאכי': { en: 'Malachi', type: 'tanach' },
  // Ketuvim
  'תהלים': { en: 'Psalms', type: 'tanach' },
  'תהילים': { en: 'Psalms', type: 'tanach' },
  'משלי': { en: 'Proverbs', type: 'tanach' },
  'איוב': { en: 'Job', type: 'tanach' },
  'שיר השירים': { en: 'Song of Songs', type: 'tanach' },
  'רות': { en: 'Ruth', type: 'tanach' },
  'איכה': { en: 'Lamentations', type: 'tanach' },
  'קהלת': { en: 'Ecclesiastes', type: 'tanach' },
  'אסתר': { en: 'Esther', type: 'tanach' },
  'דניאל': { en: 'Daniel', type: 'tanach' },
  'עזרא': { en: 'Ezra', type: 'tanach' },
  'נחמיה': { en: 'Nehemiah', type: 'tanach' },
  'דברי הימים': { en: 'Chronicles', type: 'tanach' },
  'דברי הימים א': { en: 'I Chronicles', type: 'tanach' },
  'דברי הימים ב': { en: 'II Chronicles', type: 'tanach' },
  // Talmud Bavli
  'ברכות': { en: 'Berakhot', type: 'talmud' },
  'שבת': { en: 'Shabbat', type: 'talmud' },
  'ערובין': { en: 'Eruvin', type: 'talmud' },
  'עירובין': { en: 'Eruvin', type: 'talmud' },
  'פסחים': { en: 'Pesachim', type: 'talmud' },
  'ביצה': { en: 'Beitzah', type: 'talmud' },
  'ראש השנה': { en: 'Rosh Hashanah', type: 'talmud' },
  'תענית': { en: 'Taanit', type: 'talmud' },
  'מגילה': { en: 'Megillah', type: 'talmud' },
  'סוכה': { en: 'Sukkah', type: 'talmud' },
  'חגיגה': { en: 'Chagigah', type: 'talmud' },
  'יבמות': { en: 'Yevamot', type: 'talmud' },
  'כתובות': { en: 'Ketubot', type: 'talmud' },
  'נדרים': { en: 'Nedarim', type: 'talmud' },
  'נזיר': { en: 'Nazir', type: 'talmud' },
  'סוטה': { en: 'Sotah', type: 'talmud' },
  'גיטין': { en: 'Gittin', type: 'talmud' },
  'קידושין': { en: 'Kiddushin', type: 'talmud' },
  'בבא קמא': { en: 'Bava Kamma', type: 'talmud' },
  'בבא מציעא': { en: 'Bava Metzia', type: 'talmud' },
  'בבא בתרא': { en: 'Bava Batra', type: 'talmud' },
  'סנהדרין': { en: 'Sanhedrin', type: 'talmud' },
  'מכות': { en: 'Makkot', type: 'talmud' },
  'שבועות': { en: 'Shevuot', type: 'talmud' },
  'עבודה זרה': { en: 'Avodah Zarah', type: 'talmud' },
  'הוריות': { en: 'Horayot', type: 'talmud' },
  'זבחים': { en: 'Zevachim', type: 'talmud' },
  'מנחות': { en: 'Menachot', type: 'talmud' },
  'חולין': { en: 'Chullin', type: 'talmud' },
  'בכורות': { en: 'Bekhorot', type: 'talmud' },
  'ערכין': { en: 'Arakhin', type: 'talmud' },
  'נדה': { en: 'Niddah', type: 'talmud' },
  'אבות': { en: 'Pirkei Avot', type: 'talmud' },
  'תמיד': { en: 'Tamid', type: 'talmud' },
  'מידות': { en: 'Middot', type: 'talmud' },
  'כלים': { en: 'Kelim', type: 'talmud' },
  'יומא': { en: 'Yoma', type: 'talmud' },
  'מועד קטן': { en: 'Moed Katan', type: 'talmud' },
  'כריתות': { en: 'Keritot', type: 'talmud' },
  'מעילה': { en: 'Meilah', type: 'talmud' },
  // Midrash
  'בראשית רבה': { en: 'Bereishit Rabbah', type: 'midrash' },
  'שמות רבה': { en: 'Shemot Rabbah', type: 'midrash' },
  'ויקרא רבה': { en: 'Vayikra Rabbah', type: 'midrash' },
  'במדבר רבה': { en: 'Bamidbar Rabbah', type: 'midrash' },
  'דברים רבה': { en: 'Devarim Rabbah', type: 'midrash' },
  'שיר השירים רבה': { en: 'Shir HaShirim Rabbah', type: 'midrash' },
  'קהלת רבה': { en: 'Kohelet Rabbah', type: 'midrash' },
  'איכה רבה': { en: 'Eikhah Rabbah', type: 'midrash' },
  'תנחומא': { en: 'Tanchuma', type: 'midrash' },
  'ילקוט שמעוני': { en: 'Yalkut Shimoni', type: 'midrash' },
  'מדרש': { en: 'Midrash', type: 'midrash' },
  'ספרי': { en: 'Sifrei', type: 'midrash' },
  'מכילתא': { en: 'Mekhilta', type: 'midrash' },
  // Zohar & Kabbalah
  'זהר': { en: 'Zohar', type: 'zohar' },
  'זוהר': { en: 'Zohar', type: 'zohar' },
  'תקונים': { en: 'Tikkunei Zohar', type: 'zohar' },
  'תיקונים': { en: 'Tikkunei Zohar', type: 'zohar' },
  'תקון': { en: 'Tikkun', type: 'zohar' },
  'תיקון': { en: 'Tikkun', type: 'zohar' },
  'עץ חיים': { en: 'Etz Chaim', type: 'zohar' },
  'פרי עץ חיים': { en: 'Pri Etz Chaim', type: 'zohar' },
  // Halacha
  'רמב"ם': { en: 'Rambam', type: 'halacha' },
  'שולחן ערוך': { en: 'Shulchan Arukh', type: 'halacha' },
};

// Sort book names by length (longest first) to match multi-word names before single-word
const SORTED_BOOKS = Object.keys(BOOK_MAP).sort((a, b) => b.length - a.length);

// Extract citations from text
function extractCitations(text) {
  const citations = [];
  // Match parenthetical references: (book_name reference)
  // Hebrew text in parens that starts with a known book name
  const parenRegex = /\(([^)]{3,80})\)/g;
  let match;

  while ((match = parenRegex.exec(text)) !== null) {
    const inner = match[1].trim();

    // Skip common non-citation patterns
    if (inner.startsWith('שם') || inner.startsWith('וכו') || inner.startsWith('עיין')) continue;
    if (inner.length < 3) continue;

    // Try to match a known book name
    for (const bookHeb of SORTED_BOOKS) {
      if (inner.startsWith(bookHeb)) {
        const rest = inner.substring(bookHeb.length).trim();
        const bookInfo = BOOK_MAP[bookHeb];

        citations.push({
          raw: match[0],
          ref: inner,
          bookHeb,
          bookEn: bookInfo.en,
          type: bookInfo.type,
          detail: rest || '',
          position: match.index
        });
        break;
      }
    }
  }

  return citations;
}

function main() {
  console.log('Extracting citations from Likutay Moharan...\n');

  const index = {};
  const bookStats = {};
  const typeStats = { tanach: 0, talmud: 0, zohar: 0, midrash: 0, halacha: 0 };
  let totalCitations = 0;

  for (const partNum of [1, 2]) {
    const partDir = path.join(LM_BASE, `part-${partNum}`);
    const indexFile = path.join(partDir, 'index.json');
    if (!fs.existsSync(indexFile)) continue;

    const catalog = JSON.parse(fs.readFileSync(indexFile, 'utf8'));

    for (const entry of catalog.torahs) {
      const torahFile = path.join(partDir, `torah-${entry.number}.json`);
      if (!fs.existsSync(torahFile)) continue;

      const torah = JSON.parse(fs.readFileSync(torahFile, 'utf8'));
      const fullText = torah.segments.map(s => s.he || '').join(' ');

      const citations = extractCitations(fullText);

      if (citations.length > 0) {
        // Deduplicate by bookEn + detail
        const seen = new Set();
        const unique = [];
        for (const c of citations) {
          const key = c.bookEn + ':' + c.detail;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push({
              ref: c.ref,
              bookHeb: c.bookHeb,
              bookEn: c.bookEn,
              type: c.type,
              detail: c.detail
            });
          }
        }

        const citedBooks = [...new Set(unique.map(c => c.bookEn))];

        index[torah.id] = {
          torahNum: torah.displayNumber || torah.torah,
          part: partNum,
          title: torah.title,
          url: `/reader/likutay-moharan/${partNum}/${torah.torah}`,
          citations: unique,
          totalCitations: unique.length,
          citedBooks
        };

        totalCitations += unique.length;

        for (const c of unique) {
          bookStats[c.bookEn] = (bookStats[c.bookEn] || 0) + 1;
          typeStats[c.type] = (typeStats[c.type] || 0) + 1;
        }
      }
    }

    console.log(`Part ${partNum}: processed ${catalog.torahs.length} torahs`);
  }

  // Build reverse index: book → list of torahs that cite it
  const reverseIndex = {};
  for (const [torahId, data] of Object.entries(index)) {
    for (const book of data.citedBooks) {
      if (!reverseIndex[book]) reverseIndex[book] = [];
      reverseIndex[book].push({
        id: torahId,
        part: data.part,
        torahNum: data.torahNum,
        title: data.title,
        url: data.url
      });
    }
  }

  // Sort book stats by citation count
  const sortedBooks = Object.entries(bookStats)
    .sort(([, a], [, b]) => b - a)
    .map(([book, count]) => ({ book, count }));

  const output = {
    generated: new Date().toISOString(),
    stats: {
      totalTorahsWithCitations: Object.keys(index).length,
      totalCitations,
      byType: typeStats,
      topBooks: sortedBooks.slice(0, 30)
    },
    torahs: index,
    reverseIndex
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');

  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);

  console.log(`\n========================================`);
  console.log(`CITATION EXTRACTION COMPLETE`);
  console.log(`========================================`);
  console.log(`Torahs with citations: ${Object.keys(index).length}`);
  console.log(`Total unique citations: ${totalCitations}`);
  console.log(`\nBy type:`);
  console.log(`  Tanach: ${typeStats.tanach}`);
  console.log(`  Talmud: ${typeStats.talmud}`);
  console.log(`  Zohar/Kabbalah: ${typeStats.zohar}`);
  console.log(`  Midrash: ${typeStats.midrash}`);
  console.log(`  Halacha: ${typeStats.halacha}`);
  console.log(`\nTop 10 most cited books:`);
  sortedBooks.slice(0, 10).forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.book}: ${b.count} citations`);
  });
  console.log(`\nOutput: ${OUTPUT} (${sizeMB} MB)`);
}

main();
