#!/usr/bin/env node
/**
 * Build browser-search-index.json from reader JSON files.
 * This is the client-side search index used by the search page.
 * 
 * RUN: node scripts/build-browser-search-index.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const READER_BASE = path.join(ROOT, 'public/reader');
const OUTPUT = path.join(ROOT, 'public/data/browser-search-index.json');

const MAX_CONTENT = 500;
const MAX_PREVIEW = 300;

function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function main() {
  console.log('Building browser search index...');

  const documents = [];
  const catalog = loadJSON(path.join(READER_BASE, 'catalog.json'));
  if (!catalog || !catalog.books) {
    console.error('No catalog.json found');
    process.exit(1);
  }

  let totalBooks = 0;

  for (const book of catalog.books) {
    let bookCount = 0;

    for (const part of book.parts) {
      // Find index
      let indexPath;
      if (book.parts.length === 1) {
        indexPath = path.join(READER_BASE, book.id, 'index.json');
        if (!fs.existsSync(indexPath)) {
          indexPath = path.join(READER_BASE, book.id, `part-${part.part}`, 'index.json');
        }
      } else {
        indexPath = path.join(READER_BASE, book.id, `part-${part.part}`, 'index.json');
        if (!fs.existsSync(indexPath)) {
          indexPath = path.join(READER_BASE, book.id, 'index.json');
        }
      }
      if (!fs.existsSync(indexPath)) continue;

      const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const partDir = path.dirname(indexPath);
      const entries = (idx.torahs || idx.items || []).filter(t => {
        if (book.parts.length > 1) return t.part === part.part;
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
        const segments = data.segments || [];

        // Extract text from segments
        let heText = '';
        let enText = '';
        for (const seg of segments) {
          // Handle layered segments (PNC) or flat segments (LM)
          if (seg.beginner) {
            heText += (seg.intermediate?.he || seg.scholarly?.he || '') + '\n\n';
            enText += (seg.beginner.en || seg.intermediate?.en || '') + '\n\n';
          } else {
            heText += (seg.he || '') + '\n\n';
            enText += (seg.en || '') + '\n\n';
          }
        }

        // Also check aligned_segments
        if (data.aligned_segments) {
          for (const seg of data.aligned_segments) {
            heText += (seg.he || '') + '\n\n';
            enText += (seg.en || '') + '\n\n';
          }
        }

        const searchHe = stripNikud(heText);
        const searchable = (searchHe + '\n' + enText).substring(0, MAX_CONTENT * 2);
        const torahNum = data.torah || data.displayNumber || num;

        documents.push({
          id: data.id || `${book.id}-${part.part}-${torahNum}`,
          url: entry.url || `/reader/${book.id}/${part.part}/${torahNum}`,
          book: book.id,
          bookName: book.title,
          title: data.title || entry.title || '',
          hebrewTitle: data.hebrewTitle || entry.hebrewTitle || '',
          part: part.part,
          torah: torahNum,
          displayNumber: data.displayNumber || entry.displayNumber || torahNum,
          themes: data.themes || [],
          wordCount: searchHe.split(/\s+/).length,
          content: heText.substring(0, MAX_PREVIEW),
          enContent: enText.substring(0, MAX_PREVIEW),
          searchable,
        });
        bookCount++;
      }

      // Also index intro/front matter files
      const allFiles = fs.readdirSync(path.dirname(indexPath)).filter(f => f.endsWith('.json'));
      const introFiles = allFiles.filter(f =>
        f !== 'index.json' &&
        !/^torah-\d+\.json$/.test(f) &&
        !/^tinyana-\d+\.json$/.test(f)
      );
      for (const f of introFiles) {
        try {
          const filePath = path.join(path.dirname(indexPath), f);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const slug = f.replace('.json', '');
          const segments = data.segments || [];
          let heText = '';
          let enText = '';
          for (const seg of segments) {
            if (seg.beginner) {
              heText += (seg.intermediate?.he || seg.scholarly?.he || '') + '\n\n';
              enText += (seg.beginner.en || seg.intermediate?.en || '') + '\n\n';
            } else {
              heText += (seg.he || '') + '\n\n';
              enText += (seg.en || '') + '\n\n';
            }
          }
          const searchHe = stripNikud(heText);
          const searchable = (searchHe + '\n' + enText).substring(0, MAX_CONTENT * 2);

          documents.push({
            id: data.id || `${book.id}-intro-${slug}`,
            url: `/reader/${book.id}/1/${slug}`,
            book: book.id,
            bookName: book.title,
            title: data.title || slug,
            hebrewTitle: data.hebrewTitle || '',
            part: 1,
            torah: slug,
            displayNumber: slug,
            themes: data.themes || [],
            wordCount: searchHe.split(/\s+/).length,
            content: heText.substring(0, MAX_PREVIEW),
            enContent: enText.substring(0, MAX_PREVIEW),
            searchable,
          });
          bookCount++;
        } catch (e) {}
      }
    }

    if (bookCount > 0) {
      console.log(`  ${book.title}: ${bookCount} items`);
      totalBooks++;
    }
  }

  const index = {
    version: 2,
    totalDocuments: documents.length,
    generated: new Date().toISOString(),
    documents,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(index), 'utf8');
  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${documents.length} documents from ${totalBooks} books`);
  console.log(`Output: ${OUTPUT} (${sizeMB} MB)`);
}

main();
