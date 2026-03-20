/**
 * Fix Ebay HaNachal / Alim LiTrufa mix-up:
 * 1. Remove incorrect English translations from Alim LiTrufa JSONs
 * 2. Parse Ebay HaNachal (Avi HaNachal) as a new book from HebrewBreslovBooks TXT files
 * 3. Add English translations from "Blossoms of the Stream" to matching Ebay HaNachal letters
 * 4. Update catalog.json
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks';
const OUTPUT_BASE = path.join(ROOT, 'public/reader');

// ── Utility functions (same as parse-new-books.cjs) ──────────

function readWin1255(filePath) {
  const raw = fs.readFileSync(filePath);
  return iconv.decode(raw, 'win1255').replace(/^\uFEFF/, '');
}

function stripMarkup(text) {
  text = text.replace(/^&HiddenFromIndex=.*$/m, '');
  text = text.replace(/\{\{\{\{/g, '');
  text = text.replace(/\}\}\}\}/g, '');
  text = text.replace(/\(\(\(/g, '');
  text = text.replace(/\)\)\)/g, '');
  text = text.replace(/\(\(/g, '(');
  text = text.replace(/\)\)/g, ')');
  text = text.replace(/\{([^}]*)\}/g, '($1)');
  text = text.replace(/\[\[\[/g, '');
  text = text.replace(/\]\]\]/g, '');
  text = text.replace(/\[\[/g, '');
  text = text.replace(/\]\]/g, '');
  text = text.replace(/<big>/gi, '');
  text = text.replace(/<\/big>/gi, '');
  text = text.replace(/<small>/gi, '');
  text = text.replace(/<\/small>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n');
  text = text.replace(/<HR\s*\/?>/gi, '\n');
  text = text.replace(/<b[^>]*>/gi, '');
  text = text.replace(/<\/b>/gi, '');
  text = text.replace(/<span[^>]*>/gi, '');
  text = text.replace(/<\/span>/gi, '');
  text = text.replace(/<div[^>]*>/gi, '');
  text = text.replace(/<\/div>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/_nbsp_/g, ' ');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function splitByAtMarkers(text) {
  text = text.replace(/^&HiddenFromIndex=[^\n]*\n?/m, '');
  text = text.replace(/^\$[^\n]*\n?/m, '');
  // Also remove # title lines
  text = text.replace(/^#[^\n]*\n?/m, '');

  const parts = text.split(/^@\s*/m);
  const sections = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const lines = trimmed.split(/\r?\n/);
    const title = lines[0].trim();
    if (!title) continue;
    if (title.startsWith('&') || title.startsWith('#')) continue;
    if (/^\*+$/.test(title)) continue;
    if (!/[\u0590-\u05FF]/.test(title)) continue;

    const content = lines.slice(1).join('\n').trim();
    if (!content) continue;

    sections.push({ title, content });
  }

  return sections;
}

function splitIntoParagraphs(content) {
  let paras = content.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paras.length < 5 && paras.some(p => p.length > 1000)) {
    paras = content.split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  const expanded = [];
  for (const p of paras) {
    if (p.includes('~')) {
      const subParts = p.split(/^~\s*/m)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      expanded.push(...subParts);
    } else {
      expanded.push(p);
    }
  }

  return expanded.filter(p => p.length > 2);
}

// ── Step 1: Remove English from Alim LiTrufa ─────────────────

function fixAlimLiTrufa() {
  console.log('\n=== Step 1: Removing incorrect English from Alim LiTrufa ===');
  let fixedCount = 0;

  // Check all 6 parts
  for (let part = 1; part <= 6; part++) {
    const partDir = path.join(OUTPUT_BASE, 'alim-litrufa', `part-${part}`);
    if (!fs.existsSync(partDir)) continue;

    const files = fs.readdirSync(partDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    for (const file of files) {
      const filePath = path.join(partDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      let hadEnglish = false;
      for (const seg of data.segments) {
        if (seg.en && seg.en.trim()) {
          seg.en = '';
          hadEnglish = true;
        }
      }

      if (hadEnglish) {
        data.hasEnglish = false;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        fixedCount++;
      }
    }
  }

  console.log(`  Cleaned English from ${fixedCount} Alim LiTrufa files`);
  return fixedCount;
}

// ── Step 2: Parse Ebay HaNachal ───────────────────────────────

function parseEbayHaNachal() {
  console.log('\n=== Step 2: Parsing Ebay HaNachal (Avi HaNachal) ===');

  const sourceFiles = [
    path.join(BOOKS_DIR, '6_ספרים של תלמידים ועוד', '9_ספרי רבי ישראל דב אודסר', '01_אבי הנחל חלק א.txt'),
    path.join(BOOKS_DIR, '6_ספרים של תלמידים ועוד', '9_ספרי רבי ישראל דב אודסר', '02_אבי הנחל חלק ב.txt'),
  ];

  const bookId = 'ebay-hanachal';
  const outputBase = path.join(OUTPUT_BASE, bookId);

  // Clean up old files first
  if (fs.existsSync(outputBase)) {
    for (const sub of fs.readdirSync(outputBase)) {
      const subPath = path.join(outputBase, sub);
      if (fs.statSync(subPath).isDirectory()) {
        for (const f of fs.readdirSync(subPath)) {
          fs.unlinkSync(path.join(subPath, f));
        }
      }
    }
    console.log('  Cleaned old Ebay HaNachal files');
  }

  const allParts = [];

  for (let p = 0; p < sourceFiles.length; p++) {
    const partNum = p + 1;
    const text = readWin1255(sourceFiles[p]);
    let sections = splitByAtMarkers(text);

    // Filter out part headers like "חלק א'" or "חֵלֶק א'" that aren't actual letters
    // Strip nikud for comparison
    sections = sections.filter(s => {
      const t = s.title.replace(/[\u0591-\u05C7]/g, '').trim();
      // Skip if it's just a part header
      if (/^חלק\s/.test(t)) return false;
      return true;
    });

    console.log(`  Part ${partNum}: ${sections.length} letters`);

    const partDir = path.join(outputBase, `part-${partNum}`);
    fs.mkdirSync(partDir, { recursive: true });

    const catalog = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const seqNum = i + 1;
      const paragraphs = splitIntoParagraphs(stripMarkup(sec.content));

      const segments = paragraphs.map((para, idx) => ({
        index: idx + 1,
        he: para,
        en: ''
      }));

      const readerData = {
        id: `eh-${partNum}-${seqNum}`,
        book: bookId,
        part: partNum,
        torah: seqNum,
        displayNumber: seqNum,
        title: sec.title,
        hebrewTitle: sec.title,
        keyVerse: '',
        keyVerseTranslation: '',
        keyVerseRef: '',
        themes: [],
        keywords: [],
        simanim: [],
        segments,
        totalParagraphs: segments.length,
        hasEnglish: false,
        navigation: {
          prev: seqNum > 1 ? `eh-${partNum}-${seqNum - 1}` : null,
          next: seqNum < sections.length ? `eh-${partNum}-${seqNum + 1}` : null,
          prevUrl: seqNum > 1 ? `/reader/${bookId}/${partNum}/${seqNum - 1}` : null,
          nextUrl: seqNum < sections.length ? `/reader/${bookId}/${partNum}/${seqNum + 1}` : null
        }
      };

      const fileName = `letter-${seqNum}.json`;
      fs.writeFileSync(path.join(partDir, fileName), JSON.stringify(readerData, null, 2), 'utf8');

      catalog.push({
        number: seqNum,
        displayNumber: seqNum,
        title: sec.title,
        hebrewTitle: sec.title,
        themes: [],
        paragraphs: segments.length,
        hasEnglish: false,
        url: `/reader/${bookId}/${partNum}/${seqNum}`
      });
    }

    // Write part index
    const indexData = {
      book: bookId,
      part: partNum,
      title: `Ebay HaNachal - Part ${partNum}`,
      hebrewTitle: `אבי הנחל - חלק ${partNum === 1 ? 'א' : 'ב'}`,
      author: "Rabbi Yisroel Dov Odesser (Saba)",
      hebrewAuthor: 'רבי ישראל דב אודסר (הסבא)',
      totalTorahs: catalog.length,
      torahs: catalog
    };
    fs.writeFileSync(path.join(partDir, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');

    allParts.push({ partNum, count: catalog.length, catalog });
  }

  const total = allParts.reduce((s, p) => s + p.count, 0);
  console.log(`  Total: ${total} letters across ${allParts.length} parts`);

  return { allParts, total };
}

// ── Step 3: Add English translations ──────────────────────────

function addEnglishTranslations() {
  console.log('\n=== Step 3: Adding English translations from Blossoms of the Stream ===');

  // Try multiple possible locations for the translation files
  const possibleDirs = [
    'C:/Users/nanach/Documents/Translations/Blossoms of the Spring',
    'C:/Users/Pettek/Documents/Translations/Blossoms of the Spring',
  ];

  let translationsDir = null;
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      translationsDir = dir;
      break;
    }
  }

  if (!translationsDir) {
    console.log('  WARNING: Translations directory not found, skipping English');
    return 0;
  }

  // The English translations are for the ORIGINAL letter numbering in Ebay HaNachal
  // Files are named like "Letter 10.docx", "Letter 1 copied from blog.docx", etc.
  const files = fs.readdirSync(translationsDir).filter(f =>
    f.match(/^Letter\s+\d+/i) && f.endsWith('.docx')
  );
  // Deduplicate: if "Letter N - later" exists, prefer it over "Letter N copied from blog"
  // Otherwise use whichever version we find
  const letterMap = new Map(); // letterNum -> filename
  for (const f of files) {
    const m = f.match(/^Letter\s+(\d+)/i);
    if (!m) continue;
    const num = parseInt(m[1]);
    const existing = letterMap.get(num);
    if (!existing || f.includes('later')) {
      letterMap.set(num, f);
    }
  }

  console.log(`  Found ${letterMap.size} unique letter translations in ${translationsDir}`);

  let matchCount = 0;

  for (const [letterNum, file] of letterMap) {

    // Read the DOCX
    const docxPath = path.join(translationsDir, file);
    let englishText = '';
    try {
      // Use AdmZip to extract DOCX content
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(docxPath);
      const docXml = zip.readAsText('word/document.xml');

      // Extract text from XML
      englishText = docXml
        .replace(/<w:br[^>]*\/>/gi, '\n')
        .replace(/<w:p[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Remove lines that are just "Ebay Hanachal" or similar headers
      const lines = englishText.split('\n').filter(l => {
        const trimmed = l.trim().toLowerCase();
        if (!trimmed) return false;
        if (trimmed === 'ebay hanachal') return false;
        if (trimmed === 'avi hanachal') return false;
        if (/^letter\s+\d+$/i.test(trimmed)) return false;
        return true;
      });
      englishText = lines.join('\n').trim();
    } catch (e) {
      console.log(`  WARNING: Could not read ${file}: ${e.message}`);
      continue;
    }

    if (!englishText) continue;

    // The translation files correspond to Ebay HaNachal Part 1 letters
    // Letter numbers in the translations match the sequential order in Part 1
    const jsonPath = path.join(OUTPUT_BASE, 'ebay-hanachal', 'part-1', `letter-${letterNum}.json`);
    if (!fs.existsSync(jsonPath)) {
      // Try part 2 if letter number is > part 1 count
      const jsonPath2 = path.join(OUTPUT_BASE, 'ebay-hanachal', 'part-2', `letter-${letterNum}.json`);
      if (fs.existsSync(jsonPath2)) {
        addEnglishToFile(jsonPath2, englishText);
        matchCount++;
      } else {
        console.log(`  No matching JSON for Letter ${letterNum}`);
      }
      continue;
    }

    addEnglishToFile(jsonPath, englishText);
    matchCount++;
  }

  console.log(`  Matched ${matchCount} English translations to Ebay HaNachal letters`);
  return matchCount;
}

function addEnglishToFile(jsonPath, englishText) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const englishParagraphs = englishText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

  // Distribute English across segments
  const segCount = data.segments.length;
  const enCount = englishParagraphs.length;

  if (enCount <= segCount) {
    // Assign one English paragraph per segment, starting from the top
    for (let i = 0; i < enCount; i++) {
      data.segments[i].en = englishParagraphs[i];
    }
  } else {
    // More English paragraphs than segments - combine extras into last segments
    const parasPerSeg = Math.ceil(enCount / segCount);
    for (let i = 0; i < segCount; i++) {
      const start = i * parasPerSeg;
      const end = Math.min(start + parasPerSeg, enCount);
      data.segments[i].en = englishParagraphs.slice(start, end).join('\n\n');
    }
  }

  data.hasEnglish = true;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
}

// ── Step 4: Update catalog.json ───────────────────────────────

function updateCatalog(ebayData) {
  console.log('\n=== Step 4: Updating catalog.json ===');

  const catalogPath = path.join(OUTPUT_BASE, 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const newBook = {
    id: 'ebay-hanachal',
    title: 'Ebay HaNachal - Blossoms of the Stream',
    hebrewTitle: 'אבי הנחל',
    author: "Rabbi Yisroel Dov Odesser (Saba)",
    hebrewAuthor: 'רבי ישראל דב אודסר (הסבא)',
    parts: ebayData.allParts.map(p => ({
      part: p.partNum,
      title: `Part ${p.partNum}`,
      hebrewTitle: `חלק ${p.partNum === 1 ? 'א' : 'ב'}`,
      totalTorahs: p.count,
      indexUrl: `/reader/ebay-hanachal/part-${p.partNum}/index.json`
    }))
  };

  // Remove if exists, then add
  catalog.books = catalog.books.filter(b => b.id !== 'ebay-hanachal');
  catalog.books.push(newBook);

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log('  Catalog updated with Ebay HaNachal');
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  console.log('=== Fixing Ebay HaNachal / Alim LiTrufa Mix-up ===\n');

  // Step 1: Remove bad English from Alim LiTrufa
  const cleaned = fixAlimLiTrufa();

  // Step 2: Parse Ebay HaNachal
  const ebayData = parseEbayHaNachal();

  // Step 3: Add English translations
  const matched = addEnglishTranslations();

  // Step 4: Update catalog
  updateCatalog(ebayData);

  // Summary
  console.log('\n========================================');
  console.log('FIX COMPLETE!');
  console.log('========================================');
  console.log(`Alim LiTrufa: removed English from ${cleaned} files`);
  console.log(`Ebay HaNachal: ${ebayData.total} letters (${ebayData.allParts.map(p => `Part ${p.partNum}: ${p.count}`).join(', ')})`);
  console.log(`English translations: ${matched} letters matched`);
  console.log('\nNext: Run generate-routes to create the Astro route file');
}

main();
