/**
 * Build a search index from the reader JSON files.
 * Produces a bilingual Hebrew/English metadata index for search, autocomplete,
 * and discovery across all books.
 *
 * RUN LOCALLY when content changes: node scripts/build-search-index-v2.cjs
 * Commit the output (public/data/search-index-v2.json) — do NOT run on Vercel.
 *
 * Output: public/data/search-index-v2.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const READER_BASE = path.join(ROOT, 'public/reader');
const READER_DIR = path.join(READER_BASE, 'likutay-moharan');
const OUTPUT = path.join(ROOT, 'public/data/search-index-v2.json');

// Max chars stored per field — balanced for quality vs file size
const MAX_CONTENT    = 500;  // nikud-stripped Hebrew + English search text
const MAX_PREVIEW    = 300;  // display preview (with nikud)
const MAX_EN_PREVIEW = 300;  // English preview

function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

function main() {
  console.log('Building search index v2...\n');

  const documents = [];

  // Load citations index if available
  let citationsIndex = {};
  const citationsPath = path.join(ROOT, 'public/data/citations-index.json');
  if (fs.existsSync(citationsPath)) {
    try {
      const cData = JSON.parse(fs.readFileSync(citationsPath, 'utf8'));
      citationsIndex = cData.torahs || {};
      console.log(`  Loaded citations for ${Object.keys(citationsIndex).length} torahs`);
    } catch (e) { /* skip */ }
  }

  // ── Likutay Moharan (Parts 1 & 2) ────────────────────────────────────────
  for (const partNum of [1, 2]) {
    const partDir = path.join(READER_DIR, `part-${partNum}`);
    const indexPath = path.join(partDir, 'index.json');
    if (!fs.existsSync(indexPath)) { console.log(`  Skipping LM part ${partNum} - no index.json`); continue; }

    const catalog = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

    for (const entry of catalog.torahs) {
      const torahPath = path.join(partDir, `torah-${entry.number}.json`);
      if (!fs.existsSync(torahPath)) continue;

      const torah = JSON.parse(fs.readFileSync(torahPath, 'utf8'));
      const heText = torah.segments.map(s => s.he || '').filter(Boolean).join('\n\n');
      const enText = torah.segments.map(s => s.en || '').filter(Boolean).join('\n\n');
      const searchHe = stripNikud(heText);

      const citationData = citationsIndex[torah.id];
      const citedBooks = citationData ? (citationData.citedBooks || []) : [];
      const citationSnippet = citationData
        ? citationData.citations.map(c => `${c.ref} ${c.bookEn} ${c.bookHeb}`).join(' ')
        : '';

      documents.push({
        id: torah.id,
        book: 'likutay-moharan',
        bookName: 'Likutay Moharan',
        part: partNum,
        torah: torah.torah,
        displayNumber: torah.displayNumber || torah.torah,
        title: torah.title,
        hebrewTitle: torah.hebrewTitle || '',
        themes: torah.themes || [],
        citedBooks,
        url: `/reader/likutay-moharan/${partNum}/${torah.torah}`,
        wordCount: searchHe.split(/\s+/).length,
        content: (searchHe + (citationSnippet ? '\n' + citationSnippet : '')).substring(0, MAX_CONTENT),
        enContent: enText.substring(0, MAX_CONTENT),
        preview: heText.substring(0, MAX_PREVIEW).replace(/\n/g, ' '),
        hasEnglish: enText.length > 0,
        englishPreview: enText.substring(0, MAX_EN_PREVIEW),
      });
    }

    console.log(`  Likutay Moharan Part ${partNum}: ${catalog.torahs.length} torahs indexed`);
  }

  // ── All other books from catalog.json ─────────────────────────────────────
  const catalogPath = path.join(READER_BASE, 'catalog.json');
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    for (const book of catalog.books) {
      if (book.id === 'likutay-moharan') continue; // already done above
      const bookDir = path.join(READER_BASE, book.id);
      if (!fs.existsSync(bookDir)) continue;

      let bookCount = 0;
      for (const part of book.parts) {
        // Resolve the index.json for this part
        let indexPath;
        if (book.parts.length === 1) {
          indexPath = path.join(bookDir, `part-${part.part}`, 'index.json');
          if (!fs.existsSync(indexPath)) {
            indexPath = path.join(bookDir, 'index.json');
            if (fs.existsSync(indexPath)) {
              const checkRoot = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
              if (!checkRoot.torahs && !checkRoot.items && checkRoot.parts && checkRoot.parts[0] && checkRoot.parts[0].indexPath) {
                indexPath = path.join(bookDir, checkRoot.parts[0].indexPath);
              }
            }
          }
        } else {
          indexPath = path.join(bookDir, `part-${part.part}`, 'index.json');
          if (!fs.existsSync(indexPath)) indexPath = path.join(bookDir, `volume-${part.part}`, 'index.json');
          // Fallback for flat-file books (PNC, etc.) where all data is in book root index
          if (!fs.existsSync(indexPath)) {
            indexPath = path.join(bookDir, 'index.json');
          }
        }
        if (!fs.existsSync(indexPath)) continue;

        const partCatalog = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const partDir = path.dirname(indexPath);
        const entries = (partCatalog.torahs || partCatalog.items || []).filter(t => {
          // Filter by part for books with shared index (PNC, etc.)
          if (book.parts.length > 1) {
            return t.part === part.part;
          }
          return true;
        });

        for (const entry of entries) {
          const num = entry.number || entry.torah;
          let filePath = path.join(partDir, `torah-${num}.json`);
          if (!fs.existsSync(filePath)) {
            const jsonFiles = fs.readdirSync(partDir).filter(f => f.endsWith(`-${num}.json`) && f !== 'index.json');
            if (jsonFiles.length === 0) continue;
            filePath = path.join(partDir, jsonFiles[0]);
          }
          if (!fs.existsSync(filePath)) continue;

          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const heText = data.segments.map(s => s.he || '').filter(Boolean).join('\n\n');
          const enText = data.segments.map(s => s.en || '').filter(Boolean).join('\n\n');
          const searchHe = stripNikud(heText);
          const torahNum = data.torah || data.displayNumber || num;

          documents.push({
            id: data.id || `${book.id}-${part.part}-${torahNum}`,
            book: book.id,
            bookName: book.title,
            part: part.part,
            torah: torahNum,
            displayNumber: data.displayNumber || torahNum,
            title: data.title,
            hebrewTitle: data.hebrewTitle || '',
            themes: data.themes || [],
            url: entry.url || `/reader/${book.id}/${part.part}/${torahNum}`,
            wordCount: searchHe.split(/\s+/).length,
            content: searchHe.substring(0, MAX_CONTENT),
            enContent: enText.substring(0, MAX_CONTENT),
            preview: heText.substring(0, MAX_PREVIEW).replace(/\n/g, ' '),
            hasEnglish: enText.length > 0,
            englishPreview: enText.substring(0, MAX_EN_PREVIEW),
          });
          bookCount++;
        }
      }
      if (bookCount > 0) console.log(`  ${book.title}: ${bookCount} items indexed`);
    }
  }

  // ── Write output ───────────────────────────────────────────────────────────
  const index = {
    version: 4,
    generated: new Date().toISOString(),
    totalDocuments: documents.length,
    note: 'Bilingual search index — run scripts/build-search-index-v2.cjs locally to regenerate',
    documents,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(index), 'utf8');

  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${documents.length} documents indexed`);
  console.log(`Output: ${OUTPUT} (${sizeMB} MB)`);
}

main();
