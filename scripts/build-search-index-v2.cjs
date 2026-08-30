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

  // ── Chayey Moharan — canonical complete directory ────────────────────────
  // The first 59 simanim are preserved in seven early section files; 60–615
  // have one canonical JSON file and public route per siman. Other root files
  // (chapter 8–12 and part-* bundles) duplicate those later simanim and must not
  // create duplicate search results.
  const chayeyDir = path.join(READER_BASE, 'chayey-moharan');
  let chayeyCount = 0;
  if (fs.existsSync(chayeyDir)) {
    let chayeyIndex = {};
    try { chayeyIndex = JSON.parse(fs.readFileSync(path.join(chayeyDir, 'index.json'), 'utf8')); } catch (e) {}
    const earlySections = chayeyIndex.earlySections || [];

    const addChayeyDocument = (data, url, fallbackTitle, fallbackHebrewTitle, displayNumber) => {
      const segments = Array.isArray(data.segments) ? data.segments : [];
      const heText = segments.map(s => s.he_nikud || s.he || '').filter(Boolean).join('\n\n') || String(data.hashmata_he || '');
      const enText = segments.map(s => s.en || '').filter(Boolean).join('\n\n') || [data.hashmata_en, data.note].filter(Boolean).join('\n\n');
      if (!heText && !enText) return;
      const searchHe = stripNikud(heText);
      documents.push({
        id: `chayey-moharan-${String(data.id || displayNumber)}`,
        book: 'chayey-moharan',
        bookName: 'Chayay Moharan — The Life of Our Leader Rabbi Nachman',
        part: 1,
        torah: displayNumber,
        displayNumber,
        title: fallbackTitle || data.title || `Siman ${displayNumber}`,
        hebrewTitle: fallbackHebrewTitle || data.hebrewTitle || '',
        themes: data.themes || [],
        citedBooks: [],
        url,
        wordCount: searchHe.split(/\s+/).filter(Boolean).length,
        content: searchHe.substring(0, MAX_CONTENT),
        enContent: enText.substring(0, MAX_CONTENT),
        preview: heText.substring(0, MAX_PREVIEW).replace(/\n/g, ' '),
        hasEnglish: enText.length > 0,
        englishPreview: enText.substring(0, MAX_EN_PREVIEW),
      });
      chayeyCount++;
    };

    for (let chapter = 1; chapter <= 7; chapter++) {
      const filePath = path.join(chayeyDir, `chapter-${chapter}.json`);
      if (!fs.existsSync(filePath)) continue;
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const section = earlySections[chapter - 1] || [];
      addChayeyDocument(data, `/reader/chayey-moharan/1/${chapter}`, section[0], section[1], `Section ${chapter}`);
    }

    for (let siman = 60; siman <= 615; siman++) {
      const filePath = path.join(chayeyDir, 'simanim', `siman-${siman}.json`);
      if (!fs.existsSync(filePath)) continue;
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const sectionTitle = data.section ? ` — ${data.section}` : '';
      addChayeyDocument(data, `/reader/chayey-moharan/siman/${siman}`, `Siman ${siman}${sectionTitle}`, data.hebrewTitle, siman);
    }
    const specialPages = [
      ['intro', 'Introduction', 'הקדמה'],
      ['hashmatos-toc', 'Hashmatos — Omissions', 'השמטות'],
      ['hashmata-162', 'Hashmata 162 (Locked)', 'השמטה קס״ב'],
      ['maftechos', 'Maftechos — Index', 'מפתחות'],
    ];
    for (const [slug, title, hebrewTitle] of specialPages) {
      const filePath = path.join(chayeyDir, `${slug}.json`);
      if (!fs.existsSync(filePath)) continue;
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      addChayeyDocument(data, `/reader/chayey-moharan/1/${slug}`, title, data.hebrewTitle || data.label || hebrewTitle, slug);
    }
    console.log(`  Chayay Moharan: ${chayeyCount} canonical sections/simanim indexed`);
  }

  // ── All other books from catalog.json ─────────────────────────────────────
  const catalogPath = path.join(READER_BASE, 'catalog.json');
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    for (const book of catalog.books) {
      if (book.id === 'likutay-moharan' || book.id === 'chayey-moharan') continue; // already done above
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
        const sharedRootIndex = partDir === bookDir;
        const entries = (partCatalog.torahs || partCatalog.items || []).filter(t => {
          // Filter only a shared root catalog. Per-part catalogs commonly omit
          // an entry-level part field because the containing directory is the
          // authoritative part identity.
          if (book.parts.length > 1 && sharedRootIndex) {
            return t.part === part.part;
          }
          return true;
        });

        for (const entry of entries) {
          const num = entry.number || entry.torah;
          let filePath = book.id === 'likutay-halachos'
            ? path.join(partDir, `halacha-${num}.json`)
            : path.join(partDir, `torah-${num}.json`);
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
            url: book.id === 'likutay-halachos'
              ? `/reader/likutay-halachos/${part.part}/${torahNum}`
              : (entry.url || `/reader/${book.id}/${part.part}/${torahNum}`),
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

      // For PNC: also index intro/front matter files (non-torah, non-tinyana JSON files)
      if (book.id === 'pettek-nanach-commentary' && fs.existsSync(bookDir)) {
        const allFiles = fs.readdirSync(bookDir).filter(f => f.endsWith('.json'));
        const introFiles = allFiles.filter(f =>
          f !== 'index.json' &&
          !/^torah-\d+\.json$/.test(f) &&
          !/^tinyana-\d+\.json$/.test(f)
        );
        for (const f of introFiles) {
          try {
            const filePath = path.join(bookDir, f);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const slug = f.replace('.json', '');
            const heText = (data.segments || []).map(s => {
              // Handle layered segments
              if (s.beginner) return s.beginner.he || '';
              if (s.intermediate) return s.intermediate.he || '';
              return s.he || '';
            }).filter(Boolean).join('\n\n');
            const enText = (data.segments || []).map(s => {
              if (s.beginner) return s.beginner.en || '';
              if (s.intermediate) return s.intermediate.en || '';
              return s.en || '';
            }).filter(Boolean).join('\n\n');
            const searchHe = stripNikud(heText);

            documents.push({
              id: data.id || `${book.id}-intro-${slug}`,
              book: book.id,
              bookName: book.title,
              part: 1,
              torah: slug,
              displayNumber: slug,
              title: data.title || slug,
              hebrewTitle: data.hebrewTitle || '',
              themes: data.themes || [],
              url: `/reader/${book.id}/1/${slug}`,
              wordCount: searchHe.split(/\s+/).length,
              content: searchHe.substring(0, MAX_CONTENT),
              enContent: enText.substring(0, MAX_CONTENT),
              preview: heText.substring(0, MAX_PREVIEW).replace(/\n/g, ' '),
              hasEnglish: enText.length > 0,
              englishPreview: enText.substring(0, MAX_EN_PREVIEW),
            });
            bookCount++;
          } catch (e) {}
        }
        if (introFiles.length > 0) console.log(`  ${book.title} intro: ${introFiles.length} sections indexed`);
      }
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
