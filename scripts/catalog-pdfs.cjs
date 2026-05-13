/**
 * Catalog the Breslov PDF library for curation.
 *
 * Scans the PDF folder and generates a catalog with:
 * - File info (name, size, type)
 * - Duplicate detection (similar names)
 * - Categorization by author/topic
 * - Recommendations (keep, compress, remove, review)
 *
 * Output: public/data/pdf-catalog.json
 */

const fs = require('fs');
const path = require('path');

const PDF_DIR = path.join(process.env.USERPROFILE || '', 'Documents/Claude Desktop projects/ChatExport_2026-03-10/Breslov books dl from telegram sifray breslov');
const OUTPUT = path.join(__dirname, '../public/data/pdf-catalog.json');

// Category rules based on filename patterns
const CATEGORIES = [
  { pattern: /ליקוטי מוהר|ליקו.*מ|לקוטי מוהר|LikuteiMoharan/i, cat: 'likutay-moharan', author: 'R\' Nachman' },
  { pattern: /קיצור ליקו/i, cat: 'kitzur-lm', author: 'R\' Nosson' },
  { pattern: /סיפור.*מעשי|סיפו.*מ/i, cat: 'sipurey-maasiyos', author: 'R\' Nachman' },
  { pattern: /ספר המ[די]ות/i, cat: 'sefer-hamidos', author: 'R\' Nachman' },
  { pattern: /ליקוטי הלכ|לקוטי.הלכ/i, cat: 'likutay-halachos', author: 'R\' Nosson' },
  { pattern: /ליקוטי תפי?ל/i, cat: 'likutay-tefilos', author: 'R\' Nosson' },
  { pattern: /ליקוטי עצו/i, cat: 'likutay-eitzos', author: 'R\' Nosson' },
  { pattern: /שיחות הר/i, cat: 'sichos-haran', author: 'R\' Nosson' },
  { pattern: /שבחי הר/i, cat: 'shivchay-haran', author: 'R\' Nosson' },
  { pattern: /חיי מוהר/i, cat: 'chayey-moharan', author: 'R\' Nosson' },
  { pattern: /עלים לתרופ|אלים/i, cat: 'alim-litrufa', author: 'R\' Nosson' },
  { pattern: /ימי מוהרנ/i, cat: 'yemei-moharnat', author: 'R\' Nosson' },
  { pattern: /ימי התלאו/i, cat: 'yemei-hatlaos', author: 'R\' Nosson' },
  { pattern: /אב.*הנחל|אבי הנחל/i, cat: 'ebay-hanachal', author: 'R\' Yisroel Ber Odesser' },
  { pattern: /השתפכות|משיבת נפש/i, cat: 'hashtatfchus', author: 'R\' Alter Tepliker' },
  { pattern: /פרפראות/i, cat: 'parparos', author: 'R\' Nachman of Tcheryn' },
  { pattern: /כוכבי אור/i, cat: 'kokhvei-or', author: 'R\' Avraham b\'r Nachman' },
  { pattern: /תיקון הכללי|תיקון חצות/i, cat: 'tikun', author: 'General' },
  { pattern: /קנאת ה/i, cat: 'kinas-hashem', author: 'R\' Nosson' },
  { pattern: /זמרת הארץ/i, cat: 'zimras-haaretz', author: 'R\' Nachman of Tcheryn' },
  { pattern: /נחת השולחן/i, cat: 'nachas-hashulchan', author: 'R\' Nachman of Tcheryn' },
  { pattern: /אוצר היראה/i, cat: 'otzar-hayirah', author: 'R\' Nosson' },
  { pattern: /קארדונ|קרדונ|kardoner/i, cat: 'karduner', author: 'R\' Yisroel Karduner' },
  { pattern: /שיחות.*אנשין|שמואל מאיר/i, cat: 'anshein', author: 'R\' Shmuel Meir Anshein' },
  { pattern: /ליברמנ/i, cat: 'liebermantz', author: 'R\' Liebermantz' },
  { pattern: /ר' בירך|רובינזון|רובינשטיין/i, cat: 'students', author: 'Students' },
  { pattern: /ר' אייזיק|בוקרסט/i, cat: 'students', author: 'Students' },
  { pattern: /ר' פנחס|טבריה/i, cat: 'students', author: 'Students' },
  { pattern: /שיר ידידו/i, cat: 'poems', author: 'Various' },
  { pattern: /אור זורח/i, cat: 'or-zoreach', author: 'Various' },
  { pattern: /עין זוכר/i, cat: 'ein-zocher', author: 'Various' },
  { pattern: /טעם זקנים/i, cat: 'taam-zkeinim', author: 'Various' },
  { pattern: /סידור|תפלות הבוקר/i, cat: 'siddur', author: 'General' },
  { pattern: /ימי שמואל/i, cat: 'yemei-shmuel', author: 'R\' Shmuel Horowitz' },
  { pattern: /פתק|petek/i, cat: 'petek', author: 'Saba' },
  { pattern: /גנזי אבא/i, cat: 'ginzei-abba', author: 'R\' Yisroel Ber Odesser' },
  { pattern: /שיחות.*קדושות|שיחות נפלאות/i, cat: 'collected-talks', author: 'Various' },
  { pattern: /אולפן חד/i, cat: 'ulpan', author: 'Various' },
  { pattern: /השמטות חיי/i, cat: 'chayey-moharan-supplements', author: 'R\' Nosson' },
  { pattern: /חלוקי הנחל/i, cat: 'chalukei-hanachal', author: 'Saba' },
  { pattern: /יעלת חן/i, cat: 'yalas-chen', author: 'Various' },
  { pattern: /קונטרס/i, cat: 'kuntres', author: 'Various' },
];

function categorize(filename) {
  for (const rule of CATEGORIES) {
    if (rule.pattern.test(filename)) {
      return { cat: rule.cat, author: rule.author };
    }
  }
  return { cat: 'uncategorized', author: 'Unknown' };
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

function normalizeForDupeCheck(name) {
  // Strip common suffixes, edition numbers, ajew marker, file extension
  return name
    .replace(/\.(pdf|doc|docx|rtf|djvu|zip|rar|txt|jpg|jpeg|png)$/i, '')
    .replace(/ ajew$/i, '')
    .replace(/ ?\+ ?חיפוש/g, '')
    .replace(/ ?- ?condense/gi, '')
    .replace(/[''״]/g, "'")
    .replace(/[_\- ]+/g, ' ')
    .replace(/\s*\(\d+\)\s*/g, '') // Remove (1), (2) etc.
    .replace(/\s*(תר[א-ת]+|תק[א-ת]+|תש[א-ת]+)\s*/g, ' ') // Remove year codes loosely
    .replace(/\s*(ח[''׳]?[אב]|חלק [אב])\s*/g, ' ') // Remove part markers
    .trim()
    .toLowerCase();
}

function main() {
  console.log('Cataloging PDF library...\n');

  if (!fs.existsSync(PDF_DIR)) {
    console.error('PDF directory not found:', PDF_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(PDF_DIR);
  const entries = [];
  let totalSize = 0;

  for (const file of files) {
    const fullPath = path.join(PDF_DIR, file);
    let stat;
    try { stat = fs.statSync(fullPath); } catch { continue; }

    if (stat.isDirectory()) {
      entries.push({
        name: file,
        type: 'directory',
        size: 0,
        sizeHuman: '-',
        category: 'skip',
        author: '-',
        action: 'review',
        reason: 'Directory - check contents'
      });
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    const size = stat.size;
    totalSize += size;

    const { cat, author } = categorize(file);

    let action = 'keep';
    let reason = '';

    // Non-PDF files
    if (ext !== '.pdf') {
      if (['.zip', '.rar'].includes(ext)) {
        action = 'review';
        reason = 'Archive - may contain useful PDFs';
      } else if (['.doc', '.docx', '.rtf', '.odt'].includes(ext)) {
        action = 'skip';
        reason = 'Already have these texts in reader (parsed from HebrewBreslovBooks)';
      } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        action = 'remove';
        reason = 'Image file, not a book';
      } else if (['.djvu'].includes(ext)) {
        action = 'review';
        reason = 'DJVU format - may need conversion';
      } else if (ext === '.txt') {
        action = 'skip';
        reason = 'Text file - likely already parsed';
      } else {
        action = 'review';
        reason = 'Unknown format';
      }
    }

    // Oversized PDFs (>200MB) - likely high-res scans
    if (ext === '.pdf' && size > 200 * 1024 * 1024) {
      action = 'compress';
      reason = `Large file (${formatSize(size)}) - likely high-res scan, could be compressed`;
    }

    // Very large (>500MB)
    if (size > 500 * 1024 * 1024) {
      action = 'compress';
      reason = `Very large (${formatSize(size)}) - needs compression before hosting`;
    }

    entries.push({
      name: file,
      type: ext.replace('.', ''),
      size,
      sizeHuman: formatSize(size),
      category: cat,
      author,
      action,
      reason
    });
  }

  // Find duplicates based on normalized names
  const normalized = {};
  for (const entry of entries) {
    const norm = normalizeForDupeCheck(entry.name);
    if (!normalized[norm]) normalized[norm] = [];
    normalized[norm].push(entry.name);
  }

  const dupeGroups = Object.entries(normalized)
    .filter(([, files]) => files.length > 1)
    .map(([key, files]) => ({ normalized: key, files }));

  // Mark duplicates
  for (const group of dupeGroups) {
    // Keep the largest PDF, mark others as duplicates
    const groupEntries = group.files
      .map(name => entries.find(e => e.name === name))
      .filter(Boolean)
      .sort((a, b) => b.size - a.size);

    for (let i = 1; i < groupEntries.length; i++) {
      if (groupEntries[i].action === 'keep') {
        groupEntries[i].action = 'duplicate';
        groupEntries[i].reason = `Duplicate of "${groupEntries[0].name}"`;
      }
    }
  }

  // Stats
  const stats = {
    totalFiles: entries.length,
    totalSize: formatSize(totalSize),
    byAction: {},
    byCategory: {},
    byAuthor: {},
    duplicateGroups: dupeGroups.length
  };

  for (const e of entries) {
    stats.byAction[e.action] = (stats.byAction[e.action] || 0) + 1;
    stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
    stats.byAuthor[e.author] = (stats.byAuthor[e.author] || 0) + 1;
  }

  const catalog = { stats, duplicateGroups: dupeGroups, entries };

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT, JSON.stringify(catalog, null, 2), 'utf8');

  // Print summary
  console.log('=== PDF Library Catalog ===');
  console.log(`Total files: ${stats.totalFiles}`);
  console.log(`Total size: ${stats.totalSize}`);
  console.log(`Duplicate groups: ${stats.duplicateGroups}`);
  console.log('\nActions:');
  Object.entries(stats.byAction).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nCategories:');
  Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nAuthors:');
  Object.entries(stats.byAuthor).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  if (dupeGroups.length > 0) {
    console.log('\nDuplicate groups:');
    dupeGroups.forEach(g => console.log(`  "${g.normalized}": ${g.files.join(' | ')}`));
  }

  console.log('\nFiles needing compression (>200MB):');
  entries.filter(e => e.action === 'compress').forEach(e => console.log(`  ${e.sizeHuman} - ${e.name}`));

  console.log('\nFiles to remove:');
  entries.filter(e => e.action === 'remove').forEach(e => console.log(`  ${e.name} (${e.reason})`));

  console.log(`\nCatalog written to: ${OUTPUT}`);
}

main();
