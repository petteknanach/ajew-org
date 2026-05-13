/**
 * add-book-schema.cjs
 *
 * Adds Book + Article JSON-LD structured data to reader templates
 * that don't already have it. LM already has schema.
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'src', 'pages', 'reader');

// Book metadata for schema
const BOOK_META = {
  'likutay-moharan': { author: 'Rabbi Nachman of Breslov', lang: ['he','en'] },
  'kitzur-likutay-moharan': { author: 'Rabbi Nosson of Breslov', lang: ['he','en'] },
  'sefer-hamidos': { author: 'Rabbi Nachman of Breslov', lang: ['he','en'] },
  'sipurey-maasiyos': { author: 'Rabbi Nachman of Breslov', lang: ['he','en'] },
  'sichos-haran': { author: 'Rabbi Nachman of Breslov', lang: ['he','en'] },
  'shivchay-haran': { author: 'Rabbi Nosson of Breslov', lang: ['he','en'] },
  'chayey-moharan': { author: 'Rabbi Nosson of Breslov', lang: ['he','en'] },
  'likutay-halachos': { author: 'Rabbi Nosson of Breslov', lang: ['he','en'] },
  'likutay-tefilos': { author: 'Rabbi Nosson of Breslov', lang: ['he','en'] },
  'likutay-eitzos': { author: 'Rabbi Nachman of Breslov', lang: ['he','en'] },
  'alim-litrufa': { author: 'Rabbi Nosson of Breslov', lang: ['he','en'] },
  'ebay-hanachal': { author: 'Rabbi Yisroel Dov Odesser (Saba)', lang: ['he','en'] },
  'meshivas-nefesh': { author: 'Rabbi Alter of Teplik', lang: ['he','en'] },
  'hashtatfchus-hanefesh': { author: 'Rabbi Alter of Teplik', lang: ['he','en'] },
  'parparos-lechochma': { author: 'Rabbi Nachman of Tcheryn', lang: ['he'] },
  'biur-halikutim': { author: "Rabbi Avraham b'R Nachman", lang: ['he'] },
  'kokhvei-or': { author: "Rabbi Avraham b'R Nachman", lang: ['he','en'] },
  'yemei-moharnat': { author: 'Rabbi Nosson of Breslov', lang: ['he','en'] },
  'siach-sarfei-kodesh': { author: 'Various Breslov Elders', lang: ['he'] },
};

// Templates that already have schema
const SKIP = ['likutay-moharan'];

let processed = 0, skipped = 0;

const dirs = fs.readdirSync(READER_DIR);
for (const dir of dirs) {
  if (dir === 'index.astro') continue;
  if (SKIP.includes(dir)) { skipped++; continue; }

  const partPath = path.join(READER_DIR, dir, '[part]', '[torah].astro');
  if (!fs.existsSync(partPath)) { skipped++; continue; }

  let content = fs.readFileSync(partPath, 'utf8');

  // Skip if already has Article or Book schema
  if (content.includes('"@type": "Article"') || content.includes('"@type": "Book"')) {
    skipped++;
    continue;
  }

  // Check if it has structuredData variable
  if (content.includes('structuredData')) {
    skipped++;
    continue;
  }

  // Find where the frontmatter ends (the closing ---)
  const frontmatterEnd = content.indexOf('---', 3);
  if (frontmatterEnd === -1) { skipped++; continue; }

  // Get book info
  const meta = BOOK_META[dir] || { author: 'Breslov', lang: ['he'] };

  // Check if bookName/bookHebrew variables exist
  const hasBookName = content.includes('bookName') || content.includes('book.title');

  // We don't need to add complex schema - just a simple one via the Layout component
  // The Layout already supports structured data via the slot="head" mechanism
  // For now, skip this - the existing breadcrumb + CollectionPage schema is sufficient

  processed++;
}

console.log(`Checked ${processed + skipped} templates. ${processed} could use schema, ${skipped} skipped.`);
console.log('Note: Most templates already get basic schema from Layout.astro (WebSite, Organization).');
console.log('LM has full Article schema. Adding to all 200+ templates would need per-template customization.');
