/**
 * Create torah-N.json aliases for books that use different file prefixes.
 * The Na Nach mobile app requests torah-N.json for all books, but some books
 * use different prefixes (halacha, prayer, section). This script creates
 * symlink-like copies so both URLs work.
 *
 * Run during build: node scripts/create-app-aliases.cjs
 */
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');

const ALIASES = [
  { book: 'likutay-halachos', prefix: 'halacha', parts: 8 },
  { book: 'likutay-tefilos', prefix: 'prayer', parts: 2 },
  { book: 'siach-sarfei-kodesh', prefix: 'section', parts: 6 },
];

let totalCreated = 0;

for (const { book, prefix, parts } of ALIASES) {
  for (let p = 1; p <= parts; p++) {
    const dir = path.join(READER_DIR, book, `part-${p}`);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.startsWith(`${prefix}-`) && f.endsWith('.json'));
    let count = 0;

    for (const file of files) {
      const num = file.replace(`${prefix}-`, '').replace('.json', '');
      const aliasName = `torah-${num}.json`;
      const aliasPath = path.join(dir, aliasName);

      // Don't overwrite if torah-N.json already exists (e.g. for LM)
      if (!fs.existsSync(aliasPath)) {
        // Create a small redirect JSON or just copy
        fs.copyFileSync(path.join(dir, file), aliasPath);
        count++;
      }
    }

    if (count > 0) {
      console.log(`  ${book}/part-${p}: ${count} aliases created`);
      totalCreated += count;
    }
  }
}

console.log(`\nTotal: ${totalCreated} torah-N.json aliases created`);
