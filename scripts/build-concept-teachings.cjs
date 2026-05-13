#!/usr/bin/env node
/**
 * Build concept-to-teachings index.
 * For each concept, finds which specific teachings mention it
 * and stores the top results with book name, title, snippet, and URL.
 *
 * Adds `teachings` property to concept-graph.json
 */
const fs = require('fs');
const path = require('path');

const CONCEPTS = [
  { id: 'teshuva', he: 'תשובה' }, { id: 'simcha', he: 'שמחה' },
  { id: 'emuna', he: 'אמונה' }, { id: 'tefila', he: 'תפילה' },
  { id: 'tzaddik', he: 'צדיק' }, { id: 'hitbodedut', he: 'התבודדות' },
  { id: 'tikkun', he: 'תיקון' }, { id: 'neshama', he: 'נשמה' },
  { id: 'geula', he: 'גאולה' }, { id: 'mashiach', he: 'משיח' },
  { id: 'tzedaka', he: 'צדקה' }, { id: 'anava', he: 'ענווה' },
  { id: 'devekut', he: 'דביקות' }, { id: 'parnasa', he: 'פרנסה' },
  { id: 'refua', he: 'רפואה' }, { id: 'shira', he: 'שירה' },
  { id: 'bitachon', he: 'בטחון' }, { id: 'ahava', he: 'אהבה' },
  { id: 'yirah', he: 'יראה' }, { id: 'kedusha', he: 'קדושה' },
];

function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

const BOOK_NAMES = {
  'likutay-moharan': { he: 'ליקוטי מוהר"ן', en: 'Likutay Moharan' },
  'sefer-hamidos': { he: 'ספר המידות', en: 'Sefer HaMidos' },
  'sichos-haran': { he: 'שיחות הר"ן', en: 'Sichos HaRan' },
  'likutay-halachos': { he: 'ליקוטי הלכות', en: 'Likutay Halachos' },
  'likutay-tefilos': { he: 'ליקוטי תפילות', en: 'Likutay Tefilos' },
  'shivchay-haran': { he: 'שבחי הר"ן', en: 'Shivchay HaRan' },
  'kitzur-likutay-moharan': { he: 'קיצור ליקוטי מוהר"ן', en: 'Kitzur LM' },
  'hashtatfchus-hanefesh': { he: 'השתפכות הנפש', en: 'Hashtatfchus' },
  'meshivas-nefesh': { he: 'משיבת נפש', en: 'Meshivas Nefesh' },
  'parparos-lechochma': { he: 'פרפראות לחכמה', en: 'Parparos' },
  'likutay-eitzos': { he: 'ליקוטי עצות', en: 'Likutay Eitzos' },
  'chayey-moharan': { he: 'חיי מוהר"ן', en: 'Chayey Moharan' },
};

const teachings = {}; // conceptId -> [{book, bookEn, title, snippet, url, count}]

// Scan Breslov books
const readerDir = path.join(process.cwd(), 'public', 'reader');
const bookDirs = Object.keys(BOOK_NAMES);

let scanned = 0;
for (const bookId of bookDirs) {
  const bookPath = path.join(readerDir, bookId);
  if (!fs.existsSync(bookPath)) continue;

  function scanDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { scanDir(path.join(dir, entry.name)); continue; }
      if (!entry.name.endsWith('.json') || entry.name === 'index.json') continue;
      try {
        const filePath = path.join(dir, entry.name);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!data.segments || data.segments.length === 0) continue;

        const fullText = stripNikud(data.segments.map(s => s.he || '').join(' '));
        const relPath = filePath.replace(readerDir, '').replace(/\\/g, '/');
        const url = '/reader' + relPath.replace('.json', '').replace(/\/part-(\d+)\//, '/$1/');
        const bookName = BOOK_NAMES[bookId] || { he: bookId, en: bookId };
        const title = data.hebrewTitle || data.title || entry.name;
        const hasEnglish = data.segments.some(s => s.en && s.en.length > 20);

        for (const concept of CONCEPTS) {
          const count = (fullText.match(new RegExp(concept.he, 'g')) || []).length;
          if (count === 0) continue;

          if (!teachings[concept.id]) teachings[concept.id] = [];

          // Get snippet around first mention
          const idx = fullText.indexOf(concept.he);
          const start = Math.max(0, idx - 40);
          const end = Math.min(fullText.length, idx + concept.he.length + 60);
          const snippet = (start > 0 ? '...' : '') + fullText.substring(start, end) + (end < fullText.length ? '...' : '');

          teachings[concept.id].push({
            book: bookName.he,
            bookEn: bookName.en,
            title,
            snippet: snippet.substring(0, 120),
            url,
            count,
            hasEnglish,
          });
        }
        scanned++;
      } catch (e) { /* skip */ }
    }
  }
  scanDir(bookPath);
}

// Sort and limit: top 8 per concept by mention count
for (const id in teachings) {
  teachings[id].sort((a, b) => b.count - a.count);
  teachings[id] = teachings[id].slice(0, 8);
}

// Add to concept-graph.json
const graphPath = path.join(process.cwd(), 'public', 'data', 'concept-graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
graph.teachings = teachings;
fs.writeFileSync(graphPath, JSON.stringify(graph));

console.log(`Scanned ${scanned} files`);
console.log(`${Object.keys(teachings).length} concepts with teachings`);
const totalTeachings = Object.values(teachings).reduce((s, t) => s + t.length, 0);
console.log(`${totalTeachings} teaching entries total`);

// Show sample
console.log('\nSample - teshuva:');
(teachings.teshuva || []).slice(0, 3).forEach(t => {
  console.log(`  ${t.bookEn}: ${t.title} (${t.count} mentions)`);
});
