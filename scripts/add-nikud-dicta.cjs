/**
 * Add nikud to Hebrew text using Dicta Nakdan API
 *
 * Uses the Dicta Nakdan API with "rabbinic" genre for best results
 * on Torah/Breslov texts. Processes all reader JSON files that lack
 * he_nikud fields.
 *
 * API endpoint: https://nakdan-u1-0.loadbalancer.dicta.org.il/api
 * Max ~4000 chars per request (site limit is 5000 but safer to chunk smaller)
 *
 * Usage:
 *   node scripts/add-nikud-dicta.cjs                    # process all books without nikud
 *   node scripts/add-nikud-dicta.cjs sefer-hamidos       # process specific book
 *   node scripts/add-nikud-dicta.cjs --dry-run           # preview without saving
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const API_URL = 'https://nakdan-u1-0.loadbalancer.dicta.org.il/api';
const CHUNK_SIZE = 3500; // chars per API request (safe under 5000 limit)
const DELAY_MS = 1500;   // delay between API calls (increased to avoid 503 rate limiting)

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const targetBook = args.find(a => !a.startsWith('--'));

// Strip existing nikud from text (to send clean text to API)
function stripNikud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

// Call Dicta Nakdan API
async function callNakdan(text) {
  const body = {
    task: 'nakdan',
    data: text,
    genre: 'rabbinic',
    addmorph: true,
    keepmetagim: true,
    keepqq: false,
    nodageshdefmem: false,
    patachma: false,
    useTokenization: true,
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const items = data.data || data;

  // Extract nikud'd text from response
  let result = '';
  for (const item of items) {
    if (item.sep) {
      // Separator (space, newline, punctuation)
      result += item.str || item.nakdan?.word || '';
    } else if (item.nakdan) {
      const best = item.nakdan.options?.[0];
      if (best) {
        // Remove the | pipe separator that Dicta adds for prefixes
        result += best.w.replace(/\|/g, '');
      } else {
        result += item.str || item.nakdan.word || '';
      }
    } else {
      result += item.str || '';
    }
  }

  return result;
}

// Add nikud to a single text, chunking if needed
async function addNikud(text) {
  if (!text || text.length < 3) return text;

  const clean = stripNikud(text);
  if (clean.length <= CHUNK_SIZE) {
    return await callNakdan(clean);
  }

  // Split into chunks at sentence/clause boundaries
  const chunks = [];
  let remaining = clean;
  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }
    // Find a good split point (period, comma, colon, etc.)
    let splitAt = CHUNK_SIZE;
    for (let i = CHUNK_SIZE; i > CHUNK_SIZE * 0.7; i--) {
      if ('.,:;。'.includes(remaining[i]) || remaining[i] === ' ') {
        splitAt = i + 1;
        break;
      }
    }
    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt);
  }

  // Process each chunk
  const results = [];
  for (const chunk of chunks) {
    results.push(await callNakdan(chunk));
    if (chunks.length > 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  return results.join('');
}

// Find all book directories
function findBooks() {
  const books = [];
  const entries = fs.readdirSync(READER_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const bookDir = path.join(READER_DIR, entry.name);

    // Check for part-N subdirectories (most books)
    const subDirs = fs.readdirSync(bookDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('part-'));

    if (subDirs.length > 0) {
      for (const sub of subDirs) {
        const partDir = path.join(bookDir, sub.name);
        const files = fs.readdirSync(partDir)
          .filter(f => f.endsWith('.json') && !f.includes('index'));

        if (files.length === 0) continue;

        // Check if already has nikud by sampling first file
        const sample = JSON.parse(fs.readFileSync(path.join(partDir, files[0]), 'utf8'));
        const hasNikud = sample.segments?.some(s => s.he_nikud);

        if (!hasNikud) {
          const totalSegs = files.reduce((sum, f) => {
            const d = JSON.parse(fs.readFileSync(path.join(partDir, f), 'utf8'));
            return sum + (d.segments?.length || 0);
          }, 0);

          books.push({
            name: entry.name,
            part: sub.name,
            dir: partDir,
            files,
            segments: totalSegs,
          });
        }
      }
    }
  }

  return books.sort((a, b) => a.segments - b.segments); // smallest first
}

async function processBook(bookInfo) {
  const { dir, files, name, part } = bookInfo;
  let processed = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    for (const seg of data.segments || []) {
      if (!seg.he || seg.he.length < 3) continue;
      if (seg.he_nikud) continue; // already has nikud

      try {
        const nikud = await addNikud(seg.he);
        if (nikud && nikud.length > 0) {
          seg.he_nikud = nikud;
          modified = true;
          processed++;
        }
        await new Promise(r => setTimeout(r, DELAY_MS));
      } catch (err) {
        errors++;
        if (errors <= 3) {
          console.error(`  Error on ${file} seg ${seg.index}: ${err.message}`);
        }
        // Wait longer on error (rate limited)
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    if (modified && !DRY_RUN) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    if (processed % 20 === 0 && processed > 0) {
      process.stdout.write(`  ${processed} segments...`);
    }
  }

  return { processed, errors };
}

async function main() {
  console.log('=== Dicta Nakdan Nikud Enrichment ===');
  if (DRY_RUN) console.log('*** DRY RUN - no files will be modified ***');

  const books = findBooks();

  if (targetBook) {
    const filtered = books.filter(b =>
      b.name === targetBook ||
      b.name.includes(targetBook) ||
      `${b.name}/${b.part}` === targetBook ||
      `${b.name}/${b.part}`.includes(targetBook)
    );
    if (filtered.length === 0) {
      console.log(`No books found matching "${targetBook}"`);
      console.log('Available books without nikud:');
      for (const b of books) {
        console.log(`  ${b.name}/${b.part} (${b.segments} segments)`);
      }
      return;
    }
    books.length = 0;
    books.push(...filtered);
  }

  console.log(`\nFound ${books.length} book parts without nikud:`);
  let totalSegs = 0;
  for (const b of books) {
    console.log(`  ${b.name}/${b.part}: ${b.segments} segments, ${b.files.length} files`);
    totalSegs += b.segments;
  }
  console.log(`Total segments to process: ${totalSegs}`);
  console.log(`Estimated time: ~${Math.ceil(totalSegs * DELAY_MS / 60000)} minutes\n`);

  let grandTotal = 0;
  let grandErrors = 0;

  for (const book of books) {
    console.log(`\nProcessing: ${book.name}/${book.part} (${book.segments} segments)`);
    const { processed, errors } = await processBook(book);
    grandTotal += processed;
    grandErrors += errors;
    console.log(`  Done: ${processed} segments nikud'd, ${errors} errors`);
  }

  console.log('\n=== COMPLETE ===');
  console.log(`Total processed: ${grandTotal}`);
  console.log(`Total errors: ${grandErrors}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
