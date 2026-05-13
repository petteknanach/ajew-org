/**
 * Parse Sefer Hamidos (Book of Traits) into reader-ready JSON.
 * The text uses @ markers for topics and ~ markers for numbered entries.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT = path.join(ROOT, 'src/content/lm-complete/volume-1/03_ספר המידות.txt');
const OUTPUT_DIR = path.join(ROOT, 'public/reader/sefer-hamidos');

function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

function main() {
  console.log('Parsing Sefer Hamidos...\n');

  let text = fs.readFileSync(INPUT, 'utf8').replace(/^\uFEFF/, '');

  // Split by @ markers (topics)
  const sections = text.split(/^@\s*/m);
  const topics = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n');
    const topicName = lines[0].trim();
    if (!topicName) continue;

    // Parse entries (~ markers)
    const content = lines.slice(1).join('\n');
    const entryParts = content.split(/^~\s*/m);
    const entries = [];

    for (const part of entryParts) {
      const entry = part.trim();
      if (!entry) continue;
      entries.push(entry);
    }

    if (entries.length > 0) {
      topics.push({
        topic: topicName,
        topicPlain: stripNikud(topicName),
        entries
      });
    }
  }

  console.log(`Found ${topics.length} topics\n`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const catalog = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const seqNum = i + 1;

    // Build segments (each entry is a segment)
    const segments = topic.entries.map((entry, idx) => ({
      index: idx + 1,
      he: entry,
      en: ''
    }));

    const readerData = {
      id: `sh-${seqNum}`,
      book: 'sefer-hamidos',
      part: 1,
      torah: seqNum,
      displayNumber: seqNum,
      title: topic.topicPlain,
      hebrewTitle: topic.topic,
      keyVerse: '',
      keyVerseTranslation: '',
      keyVerseRef: '',
      themes: [topic.topicPlain],
      keywords: [],
      simanim: [],
      segments,
      totalParagraphs: segments.length,
      hasEnglish: false,
      navigation: {
        prev: seqNum > 1 ? `sh-${seqNum - 1}` : null,
        next: seqNum < topics.length ? `sh-${seqNum + 1}` : null,
        prevUrl: seqNum > 1 ? `/reader/sefer-hamidos/1/${seqNum - 1}` : null,
        nextUrl: seqNum < topics.length ? `/reader/sefer-hamidos/1/${seqNum + 1}` : null
      }
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `topic-${seqNum}.json`),
      JSON.stringify(readerData, null, 2), 'utf8'
    );

    catalog.push({
      number: seqNum,
      displayNumber: seqNum,
      title: topic.topicPlain,
      hebrewTitle: topic.topic,
      themes: [topic.topicPlain],
      paragraphs: segments.length,
      hasEnglish: false,
      url: `/reader/sefer-hamidos/1/${seqNum}`
    });

    console.log(`  ${seqNum}. ${topic.topic} (${topic.topicPlain}) - ${segments.length} entries`);
  }

  // Write index
  const indexData = {
    book: 'sefer-hamidos',
    part: 1,
    title: 'Sefer Hamidos - The Book of Traits',
    hebrewTitle: '\u05E1\u05E4\u05E8 \u05D4\u05DE\u05D9\u05D3\u05D5\u05EA',
    author: 'Rabbi Nachman of Breslov',
    hebrewAuthor: '\u05E8\u05D1\u05D9 \u05E0\u05D7\u05DE\u05DF \u05DE\u05D1\u05E8\u05E1\u05DC\u05D1',
    totalTorahs: catalog.length,
    torahs: catalog
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');

  // Update the top-level catalog
  const catalogPath = path.join(ROOT, 'public/reader/catalog.json');
  let mainCatalog = { books: [] };
  if (fs.existsSync(catalogPath)) {
    mainCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }

  // Add or update Sefer Hamidos entry
  const existingIdx = mainCatalog.books.findIndex(b => b.id === 'sefer-hamidos');
  const shEntry = {
    id: 'sefer-hamidos',
    title: 'Sefer Hamidos',
    hebrewTitle: '\u05E1\u05E4\u05E8 \u05D4\u05DE\u05D9\u05D3\u05D5\u05EA',
    author: 'Rabbi Nachman of Breslov',
    hebrewAuthor: '\u05E8\u05D1\u05D9 \u05E0\u05D7\u05DE\u05DF \u05DE\u05D1\u05E8\u05E1\u05DC\u05D1',
    parts: [{
      part: 1, title: 'Topics A-Z',
      hebrewTitle: '\u05E2\u05E8\u05DB\u05D9\u05DD \u05D0-\u05EA',
      totalTorahs: catalog.length,
      indexUrl: '/reader/sefer-hamidos/index.json'
    }]
  };

  if (existingIdx >= 0) mainCatalog.books[existingIdx] = shEntry;
  else mainCatalog.books.push(shEntry);

  fs.writeFileSync(catalogPath, JSON.stringify(mainCatalog, null, 2), 'utf8');

  console.log(`\nDone! ${catalog.length} topics generated`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();
