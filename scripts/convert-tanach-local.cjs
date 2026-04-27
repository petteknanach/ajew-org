/**
 * Convert Tanach text files from Books/ folder (CP1255) to UTF-8 JSON
 * for local verse lookup, replacing the Sefaria API.
 *
 * Output: public/texts/tanach/{book}/{chapter}.json
 * Each file contains: { book, chapter, verses: [{ num, he }] }
 */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const BOOKS_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books';
const OUTPUT_DIR = path.join(__dirname, '../public/texts/tanach');

// Map of Tanach books: folder -> file prefix -> English slug -> Hebrew name
const TANACH_BOOKS = [
  // Torah
  { folder: '001_TORA/01_BERESHIT', file: 'a01_Genesis.txt', slug: 'genesis', he: 'בראשית' },
  { folder: '001_TORA/02_SHEMOT', file: 'a02_Exodus.txt', slug: 'exodus', he: 'שמות' },
  { folder: '001_TORA/03_VAIKRA', file: 'a03_Leviticus.txt', slug: 'leviticus', he: 'ויקרא' },
  { folder: '001_TORA/04_BAMIDBAR', file: 'a04_Numbers.txt', slug: 'numbers', he: 'במדבר' },
  { folder: '001_TORA/05_DEVARIM', file: 'a05_Deuteronomy.txt', slug: 'deuteronomy', he: 'דברים' },
  // Nevi'im (in subfolders)
  { folder: '002_NAVI/06_YEHOSUA', file: 'a06_Joshua.txt', slug: 'joshua', he: 'יהושע' },
  { folder: '002_NAVI/07_SHOFETIM', file: 'a07_Judges.txt', slug: 'judges', he: 'שופטים' },
  { folder: '002_NAVI/08_SHEMUEL_A', file: 'a08_Samuel_1.txt', slug: 'i-samuel', he: 'שמואל א' },
  { folder: '002_NAVI/09_SHEMUEL_B', file: 'a09_Samuel_2.txt', slug: 'ii-samuel', he: 'שמואל ב' },
  { folder: '002_NAVI/10_MELACIM_A', file: 'a10_Kings_1.txt', slug: 'i-kings', he: 'מלכים א' },
  { folder: '002_NAVI/11_MELACIM_B', file: 'a11_Kings_2.txt', slug: 'ii-kings', he: 'מלכים ב' },
  { folder: '002_NAVI/12_YISHAYA', file: 'a12_Isaiah.txt', slug: 'isaiah', he: 'ישעיהו' },
  { folder: '002_NAVI/13_YERMIYA', file: 'a13_Jeremiah.txt', slug: 'jeremiah', he: 'ירמיהו' },
  { folder: '002_NAVI/14_YEHEZKEL', file: 'a14_Ezekiel.txt', slug: 'ezekiel', he: 'יחזקאל' },
  { folder: '002_NAVI/15_HOSEA', file: 'a15_Hosea.txt', slug: 'hosea', he: 'הושע' },
  { folder: '002_NAVI/16_YOEL', file: 'a16_Joel.txt', slug: 'joel', he: 'יואל' },
  { folder: '002_NAVI/17_AMOS', file: 'a17_Amos.txt', slug: 'amos', he: 'עמוס' },
  { folder: '002_NAVI/18_OVADYA', file: 'a18_Obadiah.txt', slug: 'obadiah', he: 'עובדיה' },
  { folder: '002_NAVI/19_YONA', file: 'a19_Jonah.txt', slug: 'jonah', he: 'יונה' },
  { folder: '002_NAVI/20_MICHA', file: 'a20_Micah.txt', slug: 'micah', he: 'מיכה' },
  { folder: '002_NAVI/21_NAHUM', file: 'a21_Nahum.txt', slug: 'nahum', he: 'נחום' },
  { folder: '002_NAVI/22_HAVAKUK', file: 'a22_Habakkuk.txt', slug: 'habakkuk', he: 'חבקוק' },
  { folder: '002_NAVI/23_ZFANYA', file: 'a23_Zephaniah.txt', slug: 'zephaniah', he: 'צפניה' },
  { folder: '002_NAVI/24_HAGAY', file: 'a24_Haggai.txt', slug: 'haggai', he: 'חגי' },
  { folder: '002_NAVI/25_ZECHARYA', file: 'a25_Zechariah.txt', slug: 'zechariah', he: 'זכריה' },
  { folder: '002_NAVI/26_MALACHI', file: 'a26_Malachi.txt', slug: 'malachi', he: 'מלאכי' },
  // Ketuvim (in subfolders)
  { folder: '003_KTUVIM/27_TEHILIM', file: 'a27_Psalms.txt', slug: 'psalms', he: 'תהלים' },
  { folder: '003_KTUVIM/28_MISHLEI', file: 'a28_Proverbs.txt', slug: 'proverbs', he: 'משלי' },
  { folder: '003_KTUVIM/29_IYOV', file: 'a29_Job.txt', slug: 'job', he: 'איוב' },
  { folder: '003_KTUVIM/30_SHIR_HASHIRIM', file: 'a30_Song_of_Songs.txt', slug: 'song-of-songs', he: 'שיר השירים' },
  { folder: '003_KTUVIM/31_RUTH', file: 'a31_Ruth.txt', slug: 'ruth', he: 'רות' },
  { folder: '003_KTUVIM/32_EICHA', file: 'a32_Lamentations.txt', slug: 'lamentations', he: 'איכה' },
  { folder: '003_KTUVIM/33_KOHELET', file: 'a33_Ecclesiastes.txt', slug: 'ecclesiastes', he: 'קהלת' },
  { folder: '003_KTUVIM/34_ESTER', file: 'a34_Esther.txt', slug: 'esther', he: 'אסתר' },
  { folder: '003_KTUVIM/35_DANIEL', file: 'a35_Daniel.txt', slug: 'daniel', he: 'דניאל' },
  { folder: '003_KTUVIM/36_EZRA', file: 'a36_Ezra.txt', slug: 'ezra', he: 'עזרא' },
  { folder: '003_KTUVIM/37_NECHEMYA', file: 'a37_Nehemiah.txt', slug: 'nehemiah', he: 'נחמיה' },
  { folder: '003_KTUVIM/38_DIVRE_A', file: 'a38_Chronicles_1.txt', slug: 'i-chronicles', he: 'דברי הימים א' },
  { folder: '003_KTUVIM/39_DIVRE_B', file: 'a39_Chronicles_2.txt', slug: 'ii-chronicles', he: 'דברי הימים ב' },
];

function readCP1255(filePath) {
  const raw = fs.readFileSync(filePath);
  return iconv.decode(raw, 'cp1255').replace(/^\uFEFF/, '');
}

function stripMarkup(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/<!--[^>]*-->/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/_nbsp_/g, ' ')
    .trim();
}

function hebrewNumToInt(h) {
  const vals = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
    'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100,
    'ר':200,'ש':300,'ת':400};
  let sum = 0;
  for (const c of h.replace(/[\u0591-\u05C7"'׳״]/g, '')) {
    if (vals[c]) sum += vals[c];
  }
  return sum;
}

function main() {
  console.log('Converting Tanach to local JSON...\n');
  let totalChapters = 0;
  let totalVerses = 0;

  // Create catalog
  const catalog = [];

  for (const book of TANACH_BOOKS) {
    const filePath = path.join(BOOKS_DIR, book.folder, book.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${book.file} not found`);
      continue;
    }

    const text = readCP1255(filePath);
    const lines = text.split(/\r?\n/);

    // Parse into chapters and verses
    const chapters = {};
    let currentChapter = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Chapter marker: ~ בראשית פרק-א or ~ תהלים פרק-קיט
      if (trimmed.startsWith('~')) {
        const chapterMatch = trimmed.match(/פרק[\s-]*([א-ת]+)/);
        if (chapterMatch) {
          currentChapter = hebrewNumToInt(chapterMatch[1]);
          if (!chapters[currentChapter]) chapters[currentChapter] = [];
        }
        continue;
      }

      // Verse marker: ! {א} (verse text is on the NEXT line)
      if (trimmed.startsWith('!') && currentChapter > 0) {
        const verseMatch = trimmed.match(/!\s*\{([^}]+)\}/);
        if (verseMatch) {
          const verseNum = hebrewNumToInt(verseMatch[1]);
          if (verseNum > 0) {
            // The text after the marker on same line (if any)
            const sameLineText = trimmed.replace(/!\s*\{[^}]+\}\s*/, '').trim();
            chapters[currentChapter].push({ num: verseNum, he: sameLineText ? stripMarkup(sameLineText) : '' });
          }
        }
        continue;
      }

      // Text line (verse content) - append to current verse
      if (currentChapter > 0 && !trimmed.startsWith('$') && !trimmed.startsWith('^') &&
          !trimmed.startsWith('&') && !trimmed.startsWith('#') && trimmed.length > 2 &&
          !/^[\u0590-\u05FF]{1,3}$/.test(trimmed)) {
        const cleaned = stripMarkup(trimmed);
        if (cleaned && chapters[currentChapter] && chapters[currentChapter].length > 0) {
          const lastVerse = chapters[currentChapter][chapters[currentChapter].length - 1];
          if (lastVerse.he) lastVerse.he += ' ' + cleaned;
          else lastVerse.he = cleaned;
        }
      }
    }

    // Write chapter JSON files
    const bookDir = path.join(OUTPUT_DIR, book.slug);
    fs.mkdirSync(bookDir, { recursive: true });

    const chapterNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);
    let bookVerses = 0;

    for (const chNum of chapterNums) {
      const verses = chapters[chNum];
      if (verses.length === 0) continue;

      const chapterData = {
        book: book.slug,
        bookHe: book.he,
        chapter: chNum,
        verses,
      };

      fs.writeFileSync(
        path.join(bookDir, `${chNum}.json`),
        JSON.stringify(chapterData, null, 2),
        'utf8'
      );

      bookVerses += verses.length;
    }

    totalChapters += chapterNums.length;
    totalVerses += bookVerses;

    catalog.push({
      slug: book.slug,
      he: book.he,
      chapters: chapterNums.length,
      verses: bookVerses,
    });

    console.log(`  ${book.he} (${book.slug}): ${chapterNums.length} chapters, ${bookVerses} verses`);
  }

  // Write catalog
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'catalog.json'),
    JSON.stringify({ books: catalog, totalChapters, totalVerses }, null, 2),
    'utf8'
  );

  console.log(`\n=== DONE ===`);
  console.log(`Books: ${catalog.length}`);
  console.log(`Chapters: ${totalChapters}`);
  console.log(`Verses: ${totalVerses}`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();
