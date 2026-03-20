/**
 * Build a lightweight search index from the reader JSON files.
 * Instead of the 249MB monster, this creates a ~5MB optimized index
 * with nikud-stripped content for fast Hebrew searching.
 *
 * Output: public/data/search-index-v2.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const READER_BASE = path.join(ROOT, 'public/reader');
const READER_DIR = path.join(READER_BASE, 'likutay-moharan');
const OUTPUT = path.join(ROOT, 'public/data/search-index-v2.json');

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

  // Process Part 1 and Part 2
  for (const partNum of [1, 2]) {
    const partDir = path.join(READER_DIR, `part-${partNum}`);
    const indexPath = path.join(partDir, 'index.json');

    if (!fs.existsSync(indexPath)) {
      console.log(`  Skipping part ${partNum} - no index.json`);
      continue;
    }

    const catalog = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

    for (const entry of catalog.torahs) {
      const torahPath = path.join(partDir, `torah-${entry.number}.json`);
      if (!fs.existsSync(torahPath)) continue;

      const torah = JSON.parse(fs.readFileSync(torahPath, 'utf8'));

      // Combine all paragraph text into one searchable string
      const fullText = torah.segments
        .map(s => s.he || '')
        .filter(t => t.length > 0)
        .join('\n\n');

      // Also get English text if available
      const englishText = torah.segments
        .map(s => s.en || '')
        .filter(t => t.length > 0)
        .join('\n\n');

      // Create searchable content (nikud-stripped for Hebrew matching)
      const searchableHebrew = stripNikud(fullText);

      // Append citation data as searchable text
      const citationData = citationsIndex[torah.id];
      let citationText = '';
      let citedBooks = [];
      if (citationData) {
        citedBooks = citationData.citedBooks || [];
        // Add both Hebrew and English source names to searchable content
        citationText = citationData.citations.map(c =>
          `${c.ref} ${c.bookEn} ${c.bookHeb}`
        ).join(' ');
      }

      documents.push({
        id: torah.id,
        part: partNum,
        torah: torah.torah,
        displayNumber: torah.displayNumber || torah.torah,
        title: torah.title,
        hebrewTitle: torah.hebrewTitle || '',
        themes: torah.themes || [],
        citedBooks,
        url: `/reader/likutay-moharan/${partNum}/${torah.torah}`,
        wordCount: searchableHebrew.split(/\s+/).length,
        // Store the actual searchable content + citation references
        content: searchableHebrew + (citationText ? '\n' + citationText : ''),
        // Store first 200 chars as preview (with nikud for display)
        preview: fullText.substring(0, 200).replace(/\n/g, ' '),
        hasEnglish: englishText.length > 0,
        englishContent: englishText ? englishText.substring(0, 500) : ''
      });
    }

    console.log(`  Part ${partNum}: ${catalog.torahs.length} torahs indexed`);
  }

  // Index ALL other books dynamically from catalog.json
  const catalogPath = path.join(READER_BASE, 'catalog.json');
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    for (const book of catalog.books) {
      if (book.id === 'likutay-moharan') continue; // already indexed above
      const bookDir = path.join(READER_BASE, book.id);
      if (!fs.existsSync(bookDir)) continue;

      let bookCount = 0;
      for (const part of book.parts) {
        // Find the index.json for this part
        let indexPath;
        if (book.parts.length === 1) {
          indexPath = path.join(bookDir, 'index.json');
          if (!fs.existsSync(indexPath)) indexPath = path.join(bookDir, `part-${part.part}`, 'index.json');
        } else {
          indexPath = path.join(bookDir, `part-${part.part}`, 'index.json');
        }
        if (!fs.existsSync(indexPath)) continue;

        const partCatalog = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const partDir = path.dirname(indexPath);

        // Support both old format (torahs) and new format (items)
        const entries = partCatalog.torahs || partCatalog.items || [];
        for (const entry of entries) {
          const num = entry.number || entry.torah;
          // Find the actual JSON file for this entry - try multiple patterns
          let filePath = path.join(partDir, `torah-${num}.json`);
          if (!fs.existsSync(filePath)) {
            const jsonFiles = fs.readdirSync(partDir).filter(f => f.endsWith(`-${num}.json`) && f !== 'index.json');
            if (jsonFiles.length === 0) continue;
            filePath = path.join(partDir, jsonFiles[0]);
          }
          if (!fs.existsSync(filePath)) continue;

          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const fullText = data.segments.map(s => s.he || '').filter(t => t.length > 0).join('\n\n');
          const searchableHebrew = stripNikud(fullText);
          const torahNum = data.torah || data.displayNumber || num;

          documents.push({
            id: data.id,
            part: part.part,
            torah: torahNum,
            displayNumber: data.displayNumber || torahNum,
            title: data.title,
            hebrewTitle: data.hebrewTitle || '',
            themes: data.themes || [],
            url: entry.url || `/reader/${book.id}/${part.part}/${torahNum}`,
            wordCount: searchableHebrew.split(/\s+/).length,
            content: searchableHebrew,
            preview: fullText.substring(0, 200).replace(/\n/g, ' '),
            hasEnglish: false,
            englishContent: '',
            bookName: book.title
          });
          bookCount++;
        }
      }
      if (bookCount > 0) console.log(`  ${book.title}: ${bookCount} items indexed`);
    }
  }

  // Also index other content from the old search index if available
  const oldIndexPath = path.join(ROOT, 'public/data/search-metadata.json');
  if (fs.existsSync(oldIndexPath)) {
    try {
      const oldMeta = JSON.parse(fs.readFileSync(oldIndexPath, 'utf8'));
      // Add any non-LM documents from old metadata
      if (oldMeta.documents) {
        let extraCount = 0;
        for (const doc of Object.values(oldMeta.documents)) {
          const d = doc;
          // Skip if already in our index (LM torahs)
          if (d.id && d.id.startsWith('torah_')) continue;
          if (d.id && d.id.startsWith('lm-')) continue;

          documents.push({
            id: d.id || `extra-${extraCount}`,
            part: 0,
            torah: 0,
            displayNumber: 0,
            title: d.title || d.englishTitle || 'Unknown',
            hebrewTitle: '',
            themes: [],
            url: d.path || '#',
            wordCount: d.wordCount || 0,
            content: stripNikud(d.content || '').substring(0, 2000), // Limit content size
            preview: (d.content || '').substring(0, 200),
            hasEnglish: false,
            englishContent: ''
          });
          extraCount++;
        }
        if (extraCount > 0) {
          console.log(`  Extra documents from old index: ${extraCount}`);
        }
      }
    } catch (e) {
      console.log('  Could not load old metadata (OK)');
    }
  }

  // Build the output
  const index = {
    version: 2,
    generated: new Date().toISOString(),
    totalDocuments: documents.length,
    documents
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(index), 'utf8');

  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${documents.length} documents indexed`);
  console.log(`Output: ${OUTPUT} (${sizeMB} MB)`);
}

main();
