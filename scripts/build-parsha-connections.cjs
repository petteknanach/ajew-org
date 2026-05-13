#!/usr/bin/env node
/**
 * Build parsha-to-teaching connections index.
 * Scans all Breslov/Zohar/Musar reader JSON files for parsha references.
 * - Zohar: reads structured "parsha" field
 * - All others: scans Hebrew text for "פרשת {name}" patterns
 * Output: public/data/parsha-connections.json
 */
const fs = require('fs');
const path = require('path');

function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

// === All 54 parshas with Hebrew names and variants ===
const PARSHAS = [
  // Beraishis
  { slug: 'bereishit', en: 'Beraishis', he: 'בראשית', chumash: 'bereishit', ref: 'Genesis 1:1-6:8', book: 'bereishit', ch: [1,2,3,4,5,6] },
  { slug: 'noach', en: 'Noach', he: 'נח', chumash: 'bereishit', ref: 'Genesis 6:9-11:32', book: 'bereishit', ch: [6,7,8,9,10,11] },
  { slug: 'lech-lecha', en: 'Lech-Lecha', he: 'לך לך', alt: ['לך-לך'], chumash: 'bereishit', ref: 'Genesis 12:1-17:27', book: 'bereishit', ch: [12,13,14,15,16,17] },
  { slug: 'vayeira', en: 'Vayeira', he: 'וירא', chumash: 'bereishit', ref: 'Genesis 18:1-22:24', book: 'bereishit', ch: [18,19,20,21,22] },
  { slug: 'chayei-sarah', en: 'Chayai Sarah', he: 'חיי שרה', alt: ['חיי-שרה'], chumash: 'bereishit', ref: 'Genesis 23:1-25:18', book: 'bereishit', ch: [23,24,25] },
  { slug: 'toldot', en: 'Toldos', he: 'תולדות', alt: ['תולדת'], chumash: 'bereishit', ref: 'Genesis 25:19-28:9', book: 'bereishit', ch: [25,26,27,28] },
  { slug: 'vayeitzei', en: 'Vayaitzai', he: 'ויצא', chumash: 'bereishit', ref: 'Genesis 28:10-32:3', book: 'bereishit', ch: [28,29,30,31,32] },
  { slug: 'vayishlach', en: 'Vayishlach', he: 'וישלח', chumash: 'bereishit', ref: 'Genesis 32:4-36:43', book: 'bereishit', ch: [32,33,34,35,36] },
  { slug: 'vayeishev', en: 'Vayaishev', he: 'וישב', chumash: 'bereishit', ref: 'Genesis 37:1-40:23', book: 'bereishit', ch: [37,38,39,40] },
  { slug: 'mikeitz', en: 'Mikaitz', he: 'מקץ', chumash: 'bereishit', ref: 'Genesis 41:1-44:17', book: 'bereishit', ch: [41,42,43,44] },
  { slug: 'vayigash', en: 'Vayigash', he: 'ויגש', chumash: 'bereishit', ref: 'Genesis 44:18-47:27', book: 'bereishit', ch: [44,45,46,47] },
  { slug: 'vayechi', en: 'Vayechi', he: 'ויחי', chumash: 'bereishit', ref: 'Genesis 47:28-50:26', book: 'bereishit', ch: [47,48,49,50] },
  // Shemos
  { slug: 'shemot', en: 'Shemos', he: 'שמות', chumash: 'shemos', ref: 'Exodus 1:1-6:1', book: 'shemos', ch: [1,2,3,4,5,6] },
  { slug: 'vaeira', en: "Va'aira", he: 'וארא', chumash: 'shemos', ref: 'Exodus 6:2-9:35', book: 'shemos', ch: [6,7,8,9] },
  { slug: 'bo', en: 'Bo', he: 'בא', chumash: 'shemos', ref: 'Exodus 10:1-13:16', book: 'shemos', ch: [10,11,12,13] },
  { slug: 'beshalach', en: 'Beshalach', he: 'בשלח', chumash: 'shemos', ref: 'Exodus 13:17-17:16', book: 'shemos', ch: [13,14,15,16,17] },
  { slug: 'yitro', en: 'Yisro', he: 'יתרו', chumash: 'shemos', ref: 'Exodus 18:1-20:23', book: 'shemos', ch: [18,19,20] },
  { slug: 'mishpatim', en: 'Mishpatim', he: 'משפטים', chumash: 'shemos', ref: 'Exodus 21:1-24:18', book: 'shemos', ch: [21,22,23,24] },
  { slug: 'terumah', en: 'Terumah', he: 'תרומה', chumash: 'shemos', ref: 'Exodus 25:1-27:19', book: 'shemos', ch: [25,26,27] },
  { slug: 'tetzaveh', en: 'Tetzaveh', he: 'תצוה', chumash: 'shemos', ref: 'Exodus 27:20-30:10', book: 'shemos', ch: [27,28,29,30] },
  { slug: 'ki-tisa', en: 'Ki Sisa', he: 'כי תשא', alt: ['כי-תשא'], chumash: 'shemos', ref: 'Exodus 30:11-34:35', book: 'shemos', ch: [30,31,32,33,34] },
  { slug: 'vayakhel', en: 'Vayakhel', he: 'ויקהל', chumash: 'shemos', ref: 'Exodus 35:1-38:20', book: 'shemos', ch: [35,36,37,38] },
  { slug: 'pekudei', en: 'Pekudai', he: 'פקודי', alt: ['פקודי'], chumash: 'shemos', ref: 'Exodus 38:21-40:38', book: 'shemos', ch: [38,39,40] },
  // Vayikra
  { slug: 'vayikra', en: 'Vayikra', he: 'ויקרא', chumash: 'vayikra', ref: 'Leviticus 1:1-5:26', book: 'vayikra', ch: [1,2,3,4,5] },
  { slug: 'tzav', en: 'Tzav', he: 'צו', chumash: 'vayikra', ref: 'Leviticus 6:1-8:36', book: 'vayikra', ch: [6,7,8] },
  { slug: 'shemini', en: 'Shemini', he: 'שמיני', chumash: 'vayikra', ref: 'Leviticus 9:1-11:47', book: 'vayikra', ch: [9,10,11] },
  { slug: 'tazria', en: 'Tazria', he: 'תזריע', chumash: 'vayikra', ref: 'Leviticus 12:1-13:59', book: 'vayikra', ch: [12,13] },
  { slug: 'metzora', en: 'Metzora', he: 'מצורע', alt: ['מצרע'], chumash: 'vayikra', ref: 'Leviticus 14:1-15:33', book: 'vayikra', ch: [14,15] },
  { slug: 'acharei-mot', en: 'Acharai Mos', he: 'אחרי מות', alt: ['אחרי'], chumash: 'vayikra', ref: 'Leviticus 16:1-18:30', book: 'vayikra', ch: [16,17,18] },
  { slug: 'kedoshim', en: 'Kedoshim', he: 'קדושים', alt: ['קדשים'], chumash: 'vayikra', ref: 'Leviticus 19:1-20:27', book: 'vayikra', ch: [19,20] },
  { slug: 'emor', en: 'Emor', he: 'אמור', alt: ['אמר'], chumash: 'vayikra', ref: 'Leviticus 21:1-24:23', book: 'vayikra', ch: [21,22,23,24] },
  { slug: 'behar', en: 'Behar', he: 'בהר', chumash: 'vayikra', ref: 'Leviticus 25:1-26:2', book: 'vayikra', ch: [25,26] },
  { slug: 'bechukotai', en: 'Bechukosai', he: 'בחוקותי', alt: ['בחקותי', 'בחוקתי'], chumash: 'vayikra', ref: 'Leviticus 26:3-27:34', book: 'vayikra', ch: [26,27] },
  // Bamidbar
  { slug: 'bamidbar', en: 'Bamidbar', he: 'במדבר', chumash: 'bamidbar', ref: 'Numbers 1:1-4:20', book: 'bamidbar', ch: [1,2,3,4] },
  { slug: 'naso', en: 'Naso', he: 'נשא', alt: ['נשוא'], chumash: 'bamidbar', ref: 'Numbers 4:21-7:89', book: 'bamidbar', ch: [4,5,6,7] },
  { slug: 'behaalotcha', en: "Beha'aloscha", he: 'בהעלותך', alt: ['בהעלתך'], chumash: 'bamidbar', ref: 'Numbers 8:1-12:16', book: 'bamidbar', ch: [8,9,10,11,12] },
  { slug: 'shelach', en: 'Shelach', he: 'שלח', alt: ['שלח לך'], chumash: 'bamidbar', ref: 'Numbers 13:1-15:41', book: 'bamidbar', ch: [13,14,15] },
  { slug: 'korach', en: 'Korach', he: 'קרח', alt: ['קורח'], chumash: 'bamidbar', ref: 'Numbers 16:1-18:32', book: 'bamidbar', ch: [16,17,18] },
  { slug: 'chukat', en: 'Chukas', he: 'חקת', alt: ['חוקת'], chumash: 'bamidbar', ref: 'Numbers 19:1-22:1', book: 'bamidbar', ch: [19,20,21,22] },
  { slug: 'balak', en: 'Balak', he: 'בלק', chumash: 'bamidbar', ref: 'Numbers 22:2-25:9', book: 'bamidbar', ch: [22,23,24,25] },
  { slug: 'pinchas', en: 'Pinchas', he: 'פינחס', alt: ['פנחס'], chumash: 'bamidbar', ref: 'Numbers 25:10-30:1', book: 'bamidbar', ch: [25,26,27,28,29,30] },
  { slug: 'matot', en: 'Matos', he: 'מטות', chumash: 'bamidbar', ref: 'Numbers 30:2-32:42', book: 'bamidbar', ch: [30,31,32] },
  { slug: 'masei', en: 'Masai', he: 'מסעי', alt: ['מסעות'], chumash: 'bamidbar', ref: 'Numbers 33:1-36:13', book: 'bamidbar', ch: [33,34,35,36] },
  // Devarim
  { slug: 'devarim', en: 'Devarim', he: 'דברים', chumash: 'devarim', ref: 'Deut. 1:1-3:22', book: 'devarim', ch: [1,2,3] },
  { slug: 'vaetchanan', en: "Va'eschanan", he: 'ואתחנן', chumash: 'devarim', ref: 'Deut. 3:23-7:11', book: 'devarim', ch: [3,4,5,6,7] },
  { slug: 'eikev', en: 'Aikev', he: 'עקב', chumash: 'devarim', ref: 'Deut. 7:12-11:25', book: 'devarim', ch: [7,8,9,10,11] },
  { slug: 'reeh', en: "R'ai", he: 'ראה', chumash: 'devarim', ref: 'Deut. 11:26-16:17', book: 'devarim', ch: [11,12,13,14,15,16] },
  { slug: 'shoftim', en: 'Shoftim', he: 'שופטים', chumash: 'devarim', ref: 'Deut. 16:18-21:9', book: 'devarim', ch: [16,17,18,19,20,21] },
  { slug: 'ki-teitzei', en: 'Ki Saitzai', he: 'כי תצא', alt: ['כי-תצא', 'כי תצי'], chumash: 'devarim', ref: 'Deut. 21:10-25:19', book: 'devarim', ch: [21,22,23,24,25] },
  { slug: 'ki-tavo', en: 'Ki Savo', he: 'כי תבוא', alt: ['כי תבא', 'כי-תבוא', 'כי-תבא'], chumash: 'devarim', ref: 'Deut. 26:1-29:8', book: 'devarim', ch: [26,27,28,29] },
  { slug: 'nitzavim', en: 'Nitzavim', he: 'ניצבים', alt: ['נצבים'], chumash: 'devarim', ref: 'Deut. 29:9-30:20', book: 'devarim', ch: [29,30] },
  { slug: 'vayeilech', en: 'Vayailech', he: 'וילך', alt: ['וַיֵּלֶךְ'], chumash: 'devarim', ref: 'Deut. 31:1-31:30', book: 'devarim', ch: [31] },
  { slug: 'haazinu', en: "Ha'azinu", he: 'האזינו', chumash: 'devarim', ref: 'Deut. 32:1-32:52', book: 'devarim', ch: [32] },
  { slug: 'vezot-haberacha', en: "V'zos HaBracha", he: 'וזאת הברכה', alt: ['וזאת-הברכה', 'ברכה'], chumash: 'devarim', ref: 'Deut. 33:1-34:12', book: 'devarim', ch: [33,34] },
];

// Double parshas - map combined names to both slugs
const DOUBLE_PARSHAS = [
  { combined: ['ויקהל פקודי', 'ויקהל-פקודי'], slugs: ['vayakhel', 'pekudei'] },
  { combined: ['תזריע מצורע', 'תזריע-מצורע'], slugs: ['tazria', 'metzora'] },
  { combined: ['אחרי מות קדושים', 'אחרי-קדושים', 'אחרי קדושים'], slugs: ['acharei-mot', 'kedoshim'] },
  { combined: ['בהר בחוקותי', 'בהר-בחוקותי', 'בהר בחקותי'], slugs: ['behar', 'bechukotai'] },
  { combined: ['חקת בלק', 'חוקת-בלק', 'חוקת בלק'], slugs: ['chukat', 'balak'] },
  { combined: ['מטות מסעי', 'מטות-מסעי'], slugs: ['matot', 'masei'] },
  { combined: ['ניצבים וילך', 'נצבים-וילך', 'נצבים וילך'], slugs: ['nitzavim', 'vayeilech'] },
];

// Special parshas to SKIP (not weekly portions)
const SKIP_NAMES = ['שקלים', 'זכור', 'פרה', 'החודש', 'הקרבנות', 'העקדה', 'המן', 'הנסכים'];

// Books to EXCLUDE (non-Breslov)
const EXCLUDE_PREFIXES = ['tanach-', 'talmud-bavli-', 'mishna-', 'rambam-'];

// Author grouping for display order
const AUTHOR_ORDER = {
  'Rabbi Nachman of Breslov': 1,
  'Rabbi Nosson of Breslov': 2,
  'Rabbi Nachman of Tcheryn': 3,
  'Rabbi Avraham bar Nachman': 4,
  'Rabbi Alter of Teplik': 5,
  'Levi Yitzchak Bender': 6,
  'Rabbi Shimshon Barsky': 7,
  'Rabbi Nosson bar Yehuda': 8,
  'Rabbi Yisroel Dov Odesser (Saba)': 9,
  'Breslov Students': 10,
  'Various': 11,
};

// ============================================================

const readerDir = path.join(process.cwd(), 'public', 'reader');
const catalog = JSON.parse(fs.readFileSync(path.join(readerDir, 'catalog.json'), 'utf8'));

// Build lookup: parsha slug by Hebrew name (stripped of nikud)
const parshaByHe = {};
for (const p of PARSHAS) {
  const stripped = stripNikud(p.he);
  parshaByHe[stripped] = p.slug;
  if (p.alt) {
    for (const a of p.alt) parshaByHe[stripNikud(a)] = p.slug;
  }
}

// Build search patterns for each parsha
// We look for: פרשת X, בפרשת X, לפרשת X, דפרשת X, פ' X
function buildParshaRegex() {
  const allNames = [];
  for (const p of PARSHAS) {
    allNames.push(stripNikud(p.he));
    if (p.alt) {
      for (const a of p.alt) allNames.push(stripNikud(a));
    }
  }
  // Sort longer names first to match "לך לך" before "לך"
  allNames.sort((a, b) => b.length - a.length);
  const namesPattern = allNames.join('|');
  // Match: פרשת/בפרשת/לפרשת/דפרשת/מפרשת + space + parsha name
  // Also: פ' + parsha name
  return new RegExp(`(?:(?:[בלדמ]?פרשת|פ')\\s*)(${namesPattern})`, 'g');
}

const parshaRegex = buildParshaRegex();

// Also build double-parsha patterns
function buildDoubleParshaPatterns() {
  const patterns = [];
  for (const dp of DOUBLE_PARSHAS) {
    for (const name of dp.combined) {
      patterns.push({ pattern: stripNikud(name), slugs: dp.slugs });
    }
  }
  return patterns;
}
const doublePatterns = buildDoubleParshaPatterns();

// Initialize result
const result = {};
for (const p of PARSHAS) {
  result[p.slug] = {
    en: p.en,
    he: p.he,
    ref: p.ref,
    chumash: p.chumash,
    book: p.book,
    ch: p.ch,
    connections: [],
  };
}

// Filter books from catalog
function shouldInclude(bookId) {
  for (const prefix of EXCLUDE_PREFIXES) {
    if (bookId.startsWith(prefix)) return false;
  }
  return true;
}

const booksToScan = catalog.books.filter(b => shouldInclude(b.id));
console.log(`Scanning ${booksToScan.length} books (excluded Tanach/Talmud/Mishna/Rambam)`);

let totalFiles = 0;
let totalConnections = 0;

for (const book of booksToScan) {
  const bookPath = path.join(readerDir, book.id);
  if (!fs.existsSync(bookPath)) continue;

  const isZohar = book.id.startsWith('zohar-');

  function scanDir(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        scanDir(path.join(dir, entry.name));
        continue;
      }
      if (!entry.name.endsWith('.json') || entry.name === 'index.json') continue;
      // Skip special files
      if (entry.name === 'haskamos.json' || entry.name === 'intro.json') continue;

      try {
        const filePath = path.join(dir, entry.name);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!data.segments || data.segments.length === 0) continue;
        totalFiles++;

        const title = data.hebrewTitle || data.title || entry.name.replace('.json', '');
        const relPath = filePath.replace(readerDir, '').replace(/\\/g, '/');
        let url = '/reader' + relPath
          .replace('.json', '')
          .replace(/\/part-(\d+)\//, '/$1/')
          .replace(/\/volume-(\d+)\//, '/$1/')
          .replace(/\/(torah|halacha|section|topic|letter|prayer|sicha|story|chapter)-(\d+)$/, '/$2');
        // Flat books (no part-N dir) need /1/ inserted: /reader/book/5 -> /reader/book/1/5
        if (!relPath.includes('/part-') && !relPath.includes('/volume-') && /\/(\d+)$/.test(url)) {
          url = url.replace(/\/(\d+)$/, '/1/$1');
        }

        // Method 1: Zohar structured parsha field
        if (isZohar && data.parsha) {
          const parshaField = stripNikud(data.parsha.replace(/^פרשת\s*/, ''));
          const slug = parshaByHe[parshaField];
          if (slug && result[slug]) {
            result[slug].connections.push({
              bookId: book.id,
              bookTitle: book.title,
              bookHebrewTitle: book.hebrewTitle,
              author: book.author,
              title,
              url,
              source: 'parsha_field',
            });
            totalConnections++;
          }
          continue; // Zohar pages with parsha field: done
        }

        // Method 2: Text scanning
        const fullText = stripNikud(data.segments.map(s => s.he || '').join(' '));

        // Check for double parshas first
        for (const dp of doublePatterns) {
          const dpRegex = new RegExp(`(?:[בלדמ]?פרשת|פ')\\s*${dp.pattern.replace(/\s+/g, '\\s*')}`, 'g');
          if (dpRegex.test(fullText)) {
            for (const slug of dp.slugs) {
              if (!result[slug]) continue;
              // Extract snippet
              const idx = fullText.search(new RegExp(`(?:[בלדמ]?פרשת|פ')\\s*${dp.pattern.replace(/\s+/g, '\\s*')}`));
              const snippet = extractSnippet(fullText, idx, 150);
              result[slug].connections.push({
                bookId: book.id,
                bookTitle: book.title,
                bookHebrewTitle: book.hebrewTitle,
                author: book.author,
                title,
                url,
                snippet,
                source: 'text_scan',
              });
              totalConnections++;
            }
          }
        }

        // Check individual parshas
        parshaRegex.lastIndex = 0;
        const foundSlugs = new Set();
        let match;
        while ((match = parshaRegex.exec(fullText)) !== null) {
          const matchedName = match[1];
          // Skip special parshas
          if (SKIP_NAMES.some(s => matchedName.includes(s))) continue;

          const slug = parshaByHe[matchedName];
          if (!slug || !result[slug] || foundSlugs.has(slug)) continue;

          // Check it's not a double-parsha we already handled
          const isDouble = doublePatterns.some(dp => dp.slugs.includes(slug) &&
            dp.pattern.split(/\s+/).every(w => fullText.includes(w)));
          // Still add individual matches even if double was found
          foundSlugs.add(slug);

          const snippet = extractSnippet(fullText, match.index, 150);
          result[slug].connections.push({
            bookId: book.id,
            bookTitle: book.title,
            bookHebrewTitle: book.hebrewTitle,
            author: book.author,
            title,
            url,
            snippet,
            source: 'text_scan',
          });
          totalConnections++;
        }
      } catch (e) { /* skip bad files */ }
    }
  }

  scanDir(bookPath);
}

function extractSnippet(text, idx, len) {
  if (idx < 0) return '';
  const halfLen = Math.floor(len / 2);
  const start = Math.max(0, idx - halfLen);
  const end = Math.min(text.length, idx + halfLen);
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

// Sort connections by author order, then by book
for (const slug in result) {
  result[slug].connections.sort((a, b) => {
    const orderA = AUTHOR_ORDER[a.author] || 99;
    const orderB = AUTHOR_ORDER[b.author] || 99;
    if (orderA !== orderB) return orderA - orderB;
    if (a.bookId !== b.bookId) return a.bookId.localeCompare(b.bookId);
    return a.url.localeCompare(b.url);
  });
  result[slug].totalConnections = result[slug].connections.length;
}

// Write output
const outputDir = path.join(process.cwd(), 'public', 'data');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const output = {
  generatedAt: new Date().toISOString(),
  parshas: result,
};

const outputPath = path.join(outputDir, 'parsha-connections.json');
fs.writeFileSync(outputPath, JSON.stringify(output));

// Stats
console.log(`\nScanned ${totalFiles} files`);
console.log(`Found ${totalConnections} total connections`);
console.log('\nConnections per parsha:');
const sorted = Object.entries(result).sort((a, b) => b[1].totalConnections - a[1].totalConnections);
for (const [slug, data] of sorted.slice(0, 15)) {
  console.log(`  ${data.en} (${data.he}): ${data.totalConnections} connections`);
}
console.log(`  ...`);
const zeroParshas = sorted.filter(([_, d]) => d.totalConnections === 0);
if (zeroParshas.length > 0) {
  console.log(`\n${zeroParshas.length} parshas with 0 connections:`);
  for (const [slug, data] of zeroParshas) {
    console.log(`  ${data.en} (${data.he})`);
  }
}

const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`\nOutput: ${outputPath} (${fileSize} MB)`);
