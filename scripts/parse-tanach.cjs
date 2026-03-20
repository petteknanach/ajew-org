/**
 * parse-tanach.cjs
 * Parses Tanach books from the Books/ folder into reader JSON format.
 * Source files are Windows-1255 encoded with nikud.
 *
 * Usage: node scripts/parse-tanach.cjs
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const WORKSPACE = path.join(__dirname, '..');
const BOOKS_BASE = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books';
const READER_BASE = path.join(WORKSPACE, 'public', 'reader');

// Hebrew number to integer mapping for verse markers like {א}, {י}, {כה}
const HEBREW_NUMS = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16,
  'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20, 'כא': 21, 'כב': 22, 'כג': 23,
  'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
  'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36, 'לז': 37,
  'לח': 38, 'לט': 39, 'מ': 40, 'מא': 41, 'מב': 42, 'מג': 43, 'מד': 44,
  'מה': 45, 'מו': 46, 'מז': 47, 'מח': 48, 'מט': 49, 'נ': 50,
  'נא': 51, 'נב': 52, 'נג': 53, 'נד': 54, 'נה': 55, 'נו': 56, 'נז': 57,
  'נח': 58, 'נט': 59, 'ס': 60, 'סא': 61, 'סב': 62, 'סג': 63, 'סד': 64,
  'סה': 65, 'סו': 66, 'סז': 67, 'סח': 68, 'סט': 69, 'ע': 70,
  'עא': 71, 'עב': 72, 'עג': 73, 'עד': 74, 'עה': 75, 'עו': 76,
  'עז': 77, 'עח': 78, 'עט': 79, 'פ': 80, 'פא': 81, 'פב': 82,
  'פג': 83, 'פד': 84, 'פה': 85, 'פו': 86, 'פז': 87, 'פח': 88,
  'פט': 89, 'צ': 90, 'צא': 91, 'צב': 92, 'צג': 93, 'צד': 94,
  'צה': 95, 'צו': 96, 'צז': 97, 'צח': 98, 'צט': 99, 'ק': 100,
  'קא': 101, 'קב': 102, 'קג': 103, 'קד': 104, 'קה': 105, 'קו': 106,
  'קז': 107, 'קח': 108, 'קט': 109, 'קי': 110, 'קיא': 111, 'קיב': 112,
  'קיג': 113, 'קיד': 114, 'קטו': 115, 'קטז': 116, 'קיז': 117, 'קיח': 118,
  'קיט': 119, 'קכ': 120, 'קכא': 121, 'קכב': 122, 'קכג': 123, 'קכד': 124,
  'קכה': 125, 'קכו': 126, 'קכז': 127, 'קכח': 128, 'קכט': 129, 'קל': 130,
  'קלא': 131, 'קלב': 132, 'קלג': 133, 'קלד': 134, 'קלה': 135, 'קלו': 136,
  'קלז': 137, 'קלח': 138, 'קלט': 139, 'קמ': 140, 'קמא': 141, 'קמב': 142,
  'קמג': 143, 'קמד': 144, 'קמה': 145, 'קמו': 146, 'קמז': 147, 'קמח': 148,
  'קמט': 149, 'קנ': 150, 'קנא': 151, 'קנב': 152, 'קנג': 153, 'קנד': 154,
  'קנה': 155, 'קנו': 156, 'קנז': 157, 'קנח': 158, 'קנט': 159, 'קס': 160,
  'קסא': 161, 'קסב': 162, 'קסג': 163, 'קסד': 164, 'קסה': 165, 'קסו': 166,
  'קסא': 161, 'קסב': 162, 'קסג': 163, 'קסד': 164, 'קסה': 165, 'קסו': 166,
  'קסז': 167, 'קסח': 168, 'קסט': 169, 'קע': 170, 'קעא': 171, 'קעב': 172,
  'קעג': 173, 'קעד': 174, 'קעה': 175, 'קעו': 176,
};

// Hebrew number for chapter display
const NUM_TO_HEBREW = {};
for (const [k, v] of Object.entries(HEBREW_NUMS)) {
  NUM_TO_HEBREW[v] = k;
}

// Strip nikud (vowel marks) from Hebrew text
function stripNikud(text) {
  // Unicode range for Hebrew nikud: 0x0591-0x05C7 (cantillation + vowels + marks)
  return text.replace(/[\u0591-\u05C7]/g, '');
}

// Strip HTML tags from text
function stripHtml(text) {
  return text.replace(/<[^>]+>/g, '');
}

// Clean verse text: strip HTML, trim, remove trailing colon artifacts
function cleanVerseText(text) {
  let cleaned = stripHtml(text).trim();
  return cleaned;
}

// Book definitions - ALL 39 Tanach books
const BOOKS = [
  // === TORAH (5) ===
  {
    slug: 'tanach-bereishit',
    title: 'Genesis',
    hebrewTitle: 'בראשית',
    category: 'Torah',
    hebrewCategory: 'תורה',
    sourceFile: path.join(BOOKS_BASE, '001_TORA', '01_BERESHIT', 'a01_Genesis.txt'),
    expectedChapters: 50,
  },
  {
    slug: 'tanach-shemos',
    title: 'Exodus',
    hebrewTitle: 'שמות',
    category: 'Torah',
    hebrewCategory: 'תורה',
    sourceFile: path.join(BOOKS_BASE, '001_TORA', '02_SHEMOT', 'a02_Exodus.txt'),
    expectedChapters: 40,
  },
  {
    slug: 'tanach-vayikra',
    title: 'Leviticus',
    hebrewTitle: 'ויקרא',
    category: 'Torah',
    hebrewCategory: 'תורה',
    sourceFile: path.join(BOOKS_BASE, '001_TORA', '03_VAIKRA', 'a03_Leviticus.txt'),
    expectedChapters: 27,
  },
  {
    slug: 'tanach-bamidbar',
    title: 'Numbers',
    hebrewTitle: 'במדבר',
    category: 'Torah',
    hebrewCategory: 'תורה',
    sourceFile: path.join(BOOKS_BASE, '001_TORA', '04_BAMIDBAR', 'a04_Numbers.txt'),
    expectedChapters: 36,
  },
  {
    slug: 'tanach-devarim',
    title: 'Deuteronomy',
    hebrewTitle: 'דברים',
    category: 'Torah',
    hebrewCategory: 'תורה',
    sourceFile: path.join(BOOKS_BASE, '001_TORA', '05_DEVARIM', 'a05_Deuteronomy.txt'),
    expectedChapters: 34,
  },
  // === NEVI'IM - Earlier Prophets (6) ===
  {
    slug: 'tanach-yehoshua',
    title: 'Joshua',
    hebrewTitle: 'יהושע',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '06_YEHOSUA', 'a06_Joshua.txt'),
    expectedChapters: 24,
  },
  {
    slug: 'tanach-shoftim',
    title: 'Judges',
    hebrewTitle: 'שופטים',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '07_SHOFETIM', 'a07_Judges.txt'),
    expectedChapters: 21,
  },
  {
    slug: 'tanach-shmuel-a',
    title: 'Samuel 1',
    hebrewTitle: 'שמואל א',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '08_SHEMUEL_A', 'a08_Samuel_1.txt'),
    expectedChapters: 31,
  },
  {
    slug: 'tanach-shmuel-b',
    title: 'Samuel 2',
    hebrewTitle: 'שמואל ב',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '09_SHEMUEL_B', 'a09_Samuel_2.txt'),
    expectedChapters: 24,
  },
  {
    slug: 'tanach-melachim-a',
    title: 'Kings 1',
    hebrewTitle: 'מלכים א',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '10_MELACIM_A', 'a10_Kings_1.txt'),
    expectedChapters: 22,
  },
  {
    slug: 'tanach-melachim-b',
    title: 'Kings 2',
    hebrewTitle: 'מלכים ב',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '11_MELACIM_B', 'a11_Kings_2.txt'),
    expectedChapters: 25,
  },
  // === NEVI'IM - Latter Prophets (15) ===
  {
    slug: 'tanach-yeshayahu',
    title: 'Isaiah',
    hebrewTitle: 'ישעיהו',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '12_YISHAYA', 'a12_Isaiah.txt'),
    expectedChapters: 66,
  },
  {
    slug: 'tanach-yirmiyahu',
    title: 'Jeremiah',
    hebrewTitle: 'ירמיהו',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '13_YERMIYA', 'a13_Jeremiah.txt'),
    expectedChapters: 52,
  },
  {
    slug: 'tanach-yechezkel',
    title: 'Ezekiel',
    hebrewTitle: 'יחזקאל',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '14_YEHEZKEL', 'a14_Ezekiel.txt'),
    expectedChapters: 48,
  },
  {
    slug: 'tanach-hoshea',
    title: 'Hosea',
    hebrewTitle: 'הושע',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '15_HOSEA', 'a15_Hosea.txt'),
    expectedChapters: 14,
  },
  {
    slug: 'tanach-yoel',
    title: 'Joel',
    hebrewTitle: 'יואל',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '16_YOEL', 'a16_Joel.txt'),
    expectedChapters: 4,
  },
  {
    slug: 'tanach-amos',
    title: 'Amos',
    hebrewTitle: 'עמוס',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '17_AMOS', 'a17_Amos.txt'),
    expectedChapters: 9,
  },
  {
    slug: 'tanach-ovadya',
    title: 'Obadiah',
    hebrewTitle: 'עובדיה',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '18_OVADYA', 'a18_Obadiah.txt'),
    expectedChapters: 1,
  },
  {
    slug: 'tanach-yonah',
    title: 'Jonah',
    hebrewTitle: 'יונה',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '19_YONA', 'a19_Jonah.txt'),
    expectedChapters: 4,
  },
  {
    slug: 'tanach-michah',
    title: 'Micah',
    hebrewTitle: 'מיכה',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '20_MICHA', 'a20_Micah.txt'),
    expectedChapters: 7,
  },
  {
    slug: 'tanach-nachum',
    title: 'Nahum',
    hebrewTitle: 'נחום',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '21_NAHUM', 'a21_Nahum.txt'),
    expectedChapters: 3,
  },
  {
    slug: 'tanach-havakkuk',
    title: 'Habakkuk',
    hebrewTitle: 'חבקוק',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '22_HAVAKUK', 'a22_Habakkuk.txt'),
    expectedChapters: 3,
  },
  {
    slug: 'tanach-tzefanya',
    title: 'Zephaniah',
    hebrewTitle: 'צפניה',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '23_ZFANYA', 'a23_Zephaniah.txt'),
    expectedChapters: 3,
  },
  {
    slug: 'tanach-chaggai',
    title: 'Haggai',
    hebrewTitle: 'חגי',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '24_HAGAY', 'a24_Haggai.txt'),
    expectedChapters: 2,
  },
  {
    slug: 'tanach-zecharya',
    title: 'Zechariah',
    hebrewTitle: 'זכריה',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '25_ZECHARYA', 'a25_Zechariah.txt'),
    expectedChapters: 14,
  },
  {
    slug: 'tanach-malachi',
    title: 'Malachi',
    hebrewTitle: 'מלאכי',
    category: 'Nevi\'im',
    hebrewCategory: 'נביאים',
    sourceFile: path.join(BOOKS_BASE, '002_NAVI', '26_MALACHI', 'a26_Malachi.txt'),
    expectedChapters: 3,
  },
  // === KETUVIM (13) ===
  {
    slug: 'tanach-tehillim',
    title: 'Psalms',
    hebrewTitle: 'תהלים',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '27_TEHILIM', 'a27_Psalms.txt'),
    expectedChapters: 150,
  },
  {
    slug: 'tanach-mishlei',
    title: 'Proverbs',
    hebrewTitle: 'משלי',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '28_MISHLEI', 'a28_Proverbs.txt'),
    expectedChapters: 31,
  },
  {
    slug: 'tanach-iyov',
    title: 'Job',
    hebrewTitle: 'איוב',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '29_IYOV', 'a29_Job.txt'),
    expectedChapters: 42,
  },
  {
    slug: 'tanach-shir-hashirim',
    title: 'Song of Songs',
    hebrewTitle: 'שיר השירים',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '30_SHIR_HASHIRIM', 'a30_Song_of_Songs.txt'),
    expectedChapters: 8,
  },
  {
    slug: 'tanach-rus',
    title: 'Ruth',
    hebrewTitle: 'רות',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '31_RUTH', 'a31_Ruth.txt'),
    expectedChapters: 4,
  },
  {
    slug: 'tanach-eicha',
    title: 'Lamentations',
    hebrewTitle: 'איכה',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '32_EICHA', 'a32_Lamentations.txt'),
    expectedChapters: 5,
  },
  {
    slug: 'tanach-koheles',
    title: 'Ecclesiastes',
    hebrewTitle: 'קהלת',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '33_KOHELET', 'a33_Ecclesiastes.txt'),
    expectedChapters: 12,
  },
  {
    slug: 'tanach-esther',
    title: 'Esther',
    hebrewTitle: 'אסתר',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '34_ESTER', 'a34_Esther.txt'),
    expectedChapters: 10,
  },
  {
    slug: 'tanach-daniel',
    title: 'Daniel',
    hebrewTitle: 'דניאל',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '35_DANIEL', 'a35_Daniel.txt'),
    expectedChapters: 12,
  },
  {
    slug: 'tanach-ezra',
    title: 'Ezra',
    hebrewTitle: 'עזרא',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '36_EZRA', 'a36_Ezra.txt'),
    expectedChapters: 10,
  },
  {
    slug: 'tanach-nechemia',
    title: 'Nehemiah',
    hebrewTitle: 'נחמיה',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '37_NECHEMYA', 'a37_Nehemiah.txt'),
    expectedChapters: 13,
  },
  {
    slug: 'tanach-divrei-hayamim-a',
    title: 'Chronicles 1',
    hebrewTitle: 'דברי הימים א',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '38_DIVRE_A', 'a38_Chronicles_1.txt'),
    expectedChapters: 29,
  },
  {
    slug: 'tanach-divrei-hayamim-b',
    title: 'Chronicles 2',
    hebrewTitle: 'דברי הימים ב',
    category: 'Ketuvim',
    hebrewCategory: 'כתובים',
    sourceFile: path.join(BOOKS_BASE, '003_KTUVIM', '39_DIVRE_B', 'a39_Chronicles_2.txt'),
    expectedChapters: 36,
  },
];

function parseBook(bookDef) {
  const buf = fs.readFileSync(bookDef.sourceFile);
  const text = iconv.decode(buf, 'cp1255');
  const lines = text.split(/\r?\n/);

  const chapters = [];
  let currentChapter = null;
  let currentVerseLines = [];
  let currentVerseNum = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip metadata header, book title, parsha markers, empty lines
    if (trimmed.startsWith('&') || trimmed.startsWith('$') || trimmed.startsWith('^') || trimmed === '') {
      continue;
    }

    // Chapter marker: ~ חבקוק פרק-א
    if (trimmed.startsWith('~ ')) {
      // Save previous verse if any
      if (currentChapter && currentVerseLines.length > 0) {
        const verseText = cleanVerseText(currentVerseLines.join(' '));
        if (verseText) {
          currentChapter.verses.push({
            num: currentVerseNum,
            text: verseText,
          });
        }
      }
      currentVerseLines = [];
      currentVerseNum = 0;

      currentChapter = {
        rawTitle: trimmed.substring(2).trim(),
        verses: [],
      };
      chapters.push(currentChapter);
      continue;
    }

    // Verse number marker: ! {א}
    if (trimmed.startsWith('! ')) {
      // Save previous verse
      if (currentChapter && currentVerseLines.length > 0) {
        const verseText = cleanVerseText(currentVerseLines.join(' '));
        if (verseText) {
          currentChapter.verses.push({
            num: currentVerseNum,
            text: verseText,
          });
        }
      }
      currentVerseLines = [];

      // Parse verse number from {א}
      const match = trimmed.match(/\{([^}]+)\}/);
      if (match) {
        const hebNum = match[1].trim();
        currentVerseNum = HEBREW_NUMS[hebNum] || 0;
        if (!currentVerseNum) {
          console.warn(`  Warning: Unknown Hebrew number "${hebNum}" in ${bookDef.slug}`);
          // Try to increment from last verse
          currentVerseNum = (currentChapter ? (currentChapter.verses.length + 1) : 1);
        }
      }
      continue;
    }

    // Regular text line - accumulate for current verse
    if (currentChapter && currentVerseNum > 0) {
      currentVerseLines.push(trimmed);
    }
  }

  // Save last verse
  if (currentChapter && currentVerseLines.length > 0) {
    const verseText = cleanVerseText(currentVerseLines.join(' '));
    if (verseText) {
      currentChapter.verses.push({
        num: currentVerseNum,
        text: verseText,
      });
    }
  }

  return chapters;
}

function generateJson(bookDef, chapters) {
  const bookDir = path.join(READER_BASE, bookDef.slug, 'part-1');
  fs.mkdirSync(bookDir, { recursive: true });

  const totalChapters = chapters.length;
  const indexItems = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const chapterNum = i + 1;
    const hebrewNum = NUM_TO_HEBREW[chapterNum] || String(chapterNum);

    const prevUrl = chapterNum > 1
      ? `/reader/${bookDef.slug}/part-1/${chapterNum - 1}`
      : null;
    const nextUrl = chapterNum < totalChapters
      ? `/reader/${bookDef.slug}/part-1/${chapterNum + 1}`
      : null;

    const segments = chapter.verses.map(v => ({
      index: v.num,
      he: stripNikud(v.text),
      he_nikud: v.text,
      en: '',
    }));

    const json = {
      id: `${bookDef.slug}-${chapterNum}`,
      title: `${bookDef.title} Chapter ${chapterNum}`,
      hebrewTitle: `${bookDef.hebrewTitle} פרק ${hebrewNum}`,
      displayNumber: String(chapterNum),
      segments,
      navigation: {
        prevUrl,
        nextUrl,
      },
    };

    const filePath = path.join(bookDir, `torah-${chapterNum}.json`);
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');

    indexItems.push({
      number: chapterNum,
      displayNumber: String(chapterNum),
      title: `${bookDef.title} Chapter ${chapterNum}`,
      hebrewTitle: `${bookDef.hebrewTitle} פרק ${hebrewNum}`,
      url: `/reader/${bookDef.slug}/1/${chapterNum}`,
    });
  }

  // Write index.json
  const indexJson = {
    bookId: bookDef.slug,
    title: `Tanach - ${bookDef.title}`,
    hebrewTitle: `תנ"ך - ${bookDef.hebrewTitle}`,
    totalItems: totalChapters,
    itemType: 'chapter',
    items: indexItems,
  };

  fs.writeFileSync(
    path.join(bookDir, 'index.json'),
    JSON.stringify(indexJson, null, 2),
    'utf8'
  );

  return totalChapters;
}

function generateAstroRoute(bookDef, totalChapters) {
  const routeDir = path.join(WORKSPACE, 'src', 'pages', 'reader', bookDef.slug, '[part]');
  fs.mkdirSync(routeDir, { recursive: true });

  const content = `---
import Layout from '../../../../layouts/Layout.astro';
import '../../../../styles/reader.css';
import fs from 'node:fs';
import path from 'node:path';

export function getStaticPaths() {
  const paths = [];
  for (let torah = 1; torah <= ${totalChapters}; torah++) {
    paths.push({ params: { part: '1', torah: String(torah) } });
  }
  return paths;
}

const { part, torah } = Astro.params;
const partNum = parseInt(part);
const torahNum = parseInt(torah);

let torahData = null;
let error = null;

try {
  const filePath = path.join(process.cwd(), \`public/reader/${bookDef.slug}/part-\${partNum}/torah-\${torahNum}.json\`);
  const raw = fs.readFileSync(filePath, 'utf8');
  torahData = JSON.parse(raw);
} catch (e) {
  error = \`Chapter \${torahNum} not found\`;
}

if (!torahData && !error) error = 'Content not available';

const bookName = 'Tanach - ${bookDef.title}';
const bookHebrew = 'תנ"ך - ${bookDef.hebrewTitle}';

const pageTitle = torahData
  ? \`\${torahData.hebrewTitle || torahData.title} - Tanach\`
  : 'Chapter Not Found';
const pageDesc = torahData
  ? \`Read \${torahData.title} from Tanach with nikud\`
  : '';

const structuredData = torahData ? JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": \`\${torahData.title} - Tanach\`,
  "alternativeHeadline": torahData.hebrewTitle || '',
  "author": { "@type": "Organization", "name": "Tanach" },
  "publisher": { "@type": "Organization", "name": "ajew.org" },
  "inLanguage": ["he"],
  "isPartOf": { "@type": "Book", "name": "Tanach - ${bookDef.title}" },
  "url": \`https://ajew.org/reader/${bookDef.slug}/\${partNum}/\${torahNum}\`
}) : '';
---

<Layout title={pageTitle} description={pageDesc}>
  {torahData && structuredData && (
    <script type="application/ld+json" set:html={structuredData} slot="head" />
  )}
  {error ? (
    <div style="text-align: center; padding: 80px 20px;">
      <h1>{error}</h1>
      <p><a href="/reader">Back to Reader</a></p>
    </div>
  ) : (
    <div
      class="reader-container"
      data-torah-id={torahData.id}
      data-torah-title={\`\${torahData.title} - Tanach\`}
    >
      <div class="reader-progress"></div>

      <div class="reader-breadcrumb">
        <a href="/reader">Reader</a>
        <span>&rsaquo;</span>
        <a href="/reader">${bookDef.title}</a>
        <span>&rsaquo;</span>
        {torahData.hebrewTitle || torahData.title}
      </div>

      <div class="reader-toolbar">
        <div class="reader-toolbar-group">
          <button class="reader-btn" data-mode="hebrew">Hebrew</button>
          <button class="reader-btn" data-mode="english">English</button>
          <button class="reader-btn" data-mode="both">Both</button>
        </div>
        <div class="reader-toolbar-group">
          <button class="reader-btn" id="btn-nikud">Nikud</button>
        </div>
        <div class="reader-toolbar-group">
          <span style="font-size:0.7em; font-family: 'Open Sans', sans-serif; color: var(--reader-text-secondary);">A</span>
          <input type="range" id="font-size-slider" class="font-size-slider" min="12" max="32" value="18" />
          <span style="font-size:0.9em; font-family: 'Open Sans', sans-serif; color: var(--reader-text-secondary);">A</span>
        </div>
        <div class="reader-toolbar-group">
          <button class="reader-btn reader-btn-icon" data-theme-btn="day">Day</button>
          <button class="reader-btn reader-btn-icon" data-theme-btn="sepia">Sepia</button>
          <button class="reader-btn reader-btn-icon" data-theme-btn="night">Night</button>
        </div>
        <div class="reader-toolbar-group">
          <button class="reader-btn reader-btn-icon" id="btn-listen" onclick="toggleSpeaking()">Listen</button>
          <button class="reader-btn reader-btn-icon" id="btn-search">Search</button>
          <button class="reader-btn reader-btn-icon" id="btn-bookmark">Bookmark</button>
          <button class="reader-btn reader-btn-icon" id="btn-fullscreen">Fullscreen</button>
        </div>
      </div>

      <div class="reader-search-bar">
        <input type="text" placeholder="Search in this chapter..." dir="auto" />
        <span class="search-info"></span>
        <button class="reader-btn search-close">Close</button>
      </div>

      <button class="reader-toc-toggle" title="Table of Contents">&#9776;</button>
      <div class="reader-toc">
        <button class="reader-toc-close">&times;</button>
        <h3>Verses</h3>
        <ul class="reader-toc-list">
          {torahData.segments.map((seg, i) => (
            <li><a href={\`#seg-\${seg.index}\`} data-index={String(seg.index)}>{seg.index}</a></li>
          ))}
        </ul>
      </div>

      <div class="reader-header">
        {torahData.hebrewTitle && <div class="hebrew-title">{torahData.hebrewTitle}</div>}
        <h1>{torahData.title}</h1>
        <p style="color: var(--reader-text-secondary); font-size: 0.9em; font-family: 'Open Sans', sans-serif;">
          {bookHebrew} / {bookName}
        </p>
      </div>

      <div class="reader-nav">
        {torahData.navigation.prevUrl ? (
          <a href={torahData.navigation.prevUrl} data-dir="prev">&larr; Previous</a>
        ) : <span class="disabled">&larr; Previous</span>}
        <a href="/reader">All Books</a>
        {torahData.navigation.nextUrl ? (
          <a href={torahData.navigation.nextUrl} data-dir="next">Next &rarr;</a>
        ) : <span class="disabled">Next &rarr;</span>}
      </div>

      <div class="reader-content mode-hebrew">
        {torahData.segments.map((seg) => (
          <div class="reader-segment-pair" id={\`seg-\${seg.index}\`}>
            <div class="reader-segment segment-he" data-index={String(seg.index)}>
              <span class="segment-number">{seg.index}</span>
              <p data-nikud={seg.he_nikud || seg.he}>{seg.he_nikud || seg.he}</p>
            </div>
            <div class={\`reader-segment segment-en \${!seg.en ? 'empty-translation' : ''}\`} data-index={String(seg.index)}>
              <span class="segment-number">{seg.index}</span>
              <p>{seg.en || 'Translation not yet available'}</p>
            </div>
          </div>
        ))}
      </div>

      <div class="reader-nav">
        {torahData.navigation.prevUrl ? (
          <a href={torahData.navigation.prevUrl} data-dir="prev">&larr; Previous</a>
        ) : <span class="disabled">&larr; Previous</span>}
        <a href="/reader">All Books</a>
        {torahData.navigation.nextUrl ? (
          <a href={torahData.navigation.nextUrl} data-dir="next">Next &rarr;</a>
        ) : <span class="disabled">Next &rarr;</span>}
      </div>

      <div class="reader-shortcuts-overlay">
        <div class="reader-shortcuts-panel">
          <h2>Keyboard Shortcuts</h2>
          <div class="shortcut-row"><span>Hebrew mode</span><span class="shortcut-key">H</span></div>
          <div class="shortcut-row"><span>English mode</span><span class="shortcut-key">E</span></div>
          <div class="shortcut-row"><span>Both columns</span><span class="shortcut-key">B</span></div>
          <div class="shortcut-row"><span>Toggle nikud</span><span class="shortcut-key">N</span></div>
          <div class="shortcut-row"><span>Fullscreen</span><span class="shortcut-key">F</span></div>
          <div class="shortcut-row"><span>Search in text</span><span class="shortcut-key">Ctrl+F</span></div>
          <div class="shortcut-row"><span>Save bookmark</span><span class="shortcut-key">S</span></div>
          <div class="shortcut-row"><span>Previous/Next</span><span class="shortcut-key">&larr; &rarr;</span></div>
          <div class="shortcut-row"><span>Show shortcuts</span><span class="shortcut-key">?</span></div>
          <br />
          <button class="reader-btn" onclick="this.closest('.reader-shortcuts-overlay').classList.remove('open')">Close</button>
        </div>
      </div>

      <script src="/reader-script.js" is:inline></script>
    </div>
  )}
</Layout>
`;

  fs.writeFileSync(path.join(routeDir, '[torah].astro'), content, 'utf8');
}

function updateCatalog(results) {
  const catalogPath = path.join(READER_BASE, 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  for (const { bookDef, totalChapters } of results) {
    // Check if already exists
    if (catalog.books.find(b => b.id === bookDef.slug)) {
      console.log(`  Catalog: ${bookDef.slug} already exists, skipping`);
      continue;
    }

    catalog.books.push({
      id: bookDef.slug,
      title: `Tanach - ${bookDef.title}`,
      hebrewTitle: `תנ"ך - ${bookDef.hebrewTitle}`,
      author: `Tanach (${bookDef.category})`,
      hebrewAuthor: `תנ"ך (${bookDef.hebrewCategory})`,
      parts: [
        {
          part: 1,
          title: 'Chapters',
          hebrewTitle: 'פרקים',
          totalTorahs: totalChapters,
          indexUrl: `/reader/${bookDef.slug}/part-1/index.json`,
        },
      ],
    });
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`\nCatalog updated with ${results.length} Tanach books`);
}

// Main
console.log('=== Parsing Tanach Books ===\n');

const results = [];
let totalVerses = 0;
let totalPages = 0;

for (const bookDef of BOOKS) {
  console.log(`Processing: ${bookDef.title} (${bookDef.hebrewTitle})`);
  console.log(`  Source: ${bookDef.sourceFile}`);

  if (!fs.existsSync(bookDef.sourceFile)) {
    console.error(`  ERROR: Source file not found!`);
    continue;
  }

  const chapters = parseBook(bookDef);
  console.log(`  Parsed: ${chapters.length} chapters`);

  if (chapters.length !== bookDef.expectedChapters) {
    console.warn(`  WARNING: Expected ${bookDef.expectedChapters} chapters, got ${chapters.length}`);
  }

  // Count verses
  let bookVerses = 0;
  for (const ch of chapters) {
    bookVerses += ch.verses.length;
  }
  console.log(`  Verses: ${bookVerses}`);
  totalVerses += bookVerses;

  const totalChapters = generateJson(bookDef, chapters);
  totalPages += totalChapters;
  console.log(`  Generated: ${totalChapters} JSON files in public/reader/${bookDef.slug}/part-1/`);

  generateAstroRoute(bookDef, totalChapters);
  console.log(`  Generated: Astro route at src/pages/reader/${bookDef.slug}/[part]/[torah].astro`);

  results.push({ bookDef, totalChapters });
  console.log('');
}

updateCatalog(results);

console.log(`\n=== Summary ===`);
console.log(`Books parsed: ${results.length}`);
console.log(`Total chapters/pages: ${totalPages}`);
console.log(`Total verses: ${totalVerses}`);
console.log(`Output: public/reader/tanach-*/part-1/torah-*.json`);
console.log(`Routes: src/pages/reader/tanach-*/[part]/[torah].astro`);
