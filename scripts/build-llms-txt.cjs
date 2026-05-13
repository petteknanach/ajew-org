/**
 * Generate llms-full.txt and llms.txt for AI crawlers (Grokipedia, GPTBot, etc.)
 * llms.txt — index/table of contents
 * llms-full.txt — full bilingual content for AI ingestion
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const READER_BASE = path.join(ROOT, 'public/reader');
const OUTPUT_DIR = path.join(ROOT, 'public');
const LLMS_TXT = path.join(OUTPUT_DIR, 'llms.txt');
const LLMS_FULL = path.join(OUTPUT_DIR, 'llms-full.txt');

function main() {
  console.log('Generating llms.txt for AI crawlers...\n');

  const catalogPath = path.join(READER_BASE, 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  let tocEntries = [];
  let fullEntries = [];
  let totalChars = 0;
  const MAX_FULL_CHARS = 800;  // chars per entry in full file

  for (const book of catalog.books) {
    const bookDir = path.join(READER_BASE, book.id);
    if (!fs.existsSync(bookDir)) continue;

    for (const part of book.parts) {
      let indexPath = path.join(bookDir, `part-${part.part}`, 'index.json');
      if (!fs.existsSync(indexPath)) indexPath = path.join(bookDir, 'index.json');
      if (!fs.existsSync(indexPath)) continue;

      let partCatalog;
      try {
        partCatalog = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      } catch (e) { continue; }

      const entries = partCatalog.torahs || partCatalog.items || [];
      const partDir = path.dirname(indexPath);

      for (const entry of entries) {
        const num = entry.number || entry.torah;
        let filePath = path.join(partDir, `torah-${num}.json`);
        if (!fs.existsSync(filePath)) {
          const jsonFiles = fs.readdirSync(partDir).filter(f => f.endsWith(`-${num}.json`) && f !== 'index.json');
          if (jsonFiles.length === 0) continue;
          filePath = path.join(partDir, jsonFiles[0]);
        }
        if (!fs.existsSync(filePath)) continue;

        let data;
        try {
          data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) { continue; }

        const url = entry.url || `/reader/${book.id}/${part.part}/${num}`;
        const title = data.title || entry.title || '';
        const heTitle = data.hebrewTitle || entry.hebrewTitle || '';
        const bookName = book.title;

        // Build content
        const segments = data.segments || [];
        const heText = segments.map(s => s.he || '').filter(Boolean).join('\n');
        const enText = segments.map(s => s.en || '').filter(Boolean).join('\n');

        // TOC entry (short)
        const tocLine = `- [${bookName}] ${title}${heTitle ? ' / ' + heTitle : ''} — ${url}`;
        tocEntries.push(tocLine);

        // Full entry
        let fullContent = '';
        fullContent += `# ${title}\n`;
        if (heTitle) fullContent += `## ${heTitle}\n`;
        fullContent += `- Book: ${bookName}\n`;
        fullContent += `- URL: https://ajew.org${url}\n\n`;

        if (enText) {
          fullContent += `## English\n\n${enText.substring(0, MAX_FULL_CHARS)}\n\n`;
        }
        if (heText) {
          fullContent += `## Hebrew\n\n${heText.substring(0, MAX_FULL_CHARS)}\n\n`;
        }
        fullContent += `---\n\n`;

        fullEntries.push(fullContent);
        totalChars += fullContent.length;
      }

      console.log(`  ${book.title} part ${part.part}: ${entries.length} entries`);
    }
  }

  // Write llms.txt (TOC)
  const llmsTxt = `# ajew.org — Jewish Torah Library\n\n` +
    `> 240+ sacred Jewish texts in Hebrew and English. Breslov teachings, Talmud, Zohar, Tanach, Mishna, Rambam, and more.\n\n` +
    `## Table of Contents\n\n` +
    tocEntries.join('\n') +
    `\n\n## Optional\n\n` +
    `- [llms-full.txt](https://ajew.org/llms-full.txt): Full bilingual content for AI ingestion\n` +
    `- [Sitemap](https://ajew.org/sitemap-index.xml): Full URL listing\n` +
    `- [Search Index](https://ajew.org/data/search-index-v2.json): Bilingual search metadata\n`;

  fs.writeFileSync(LLMS_TXT, llmsTxt, 'utf8');
  const tocSize = (fs.statSync(LLMS_TXT).size / 1024).toFixed(0);
  console.log(`\nllms.txt: ${tocEntries.length} entries, ${tocSize} KB`);

  // Write llms-full.txt
  const header = `# ajew.org — Complete Torah Library\n\n` +
    `> Full bilingual content for AI ingestion. ${tocEntries.length} documents.\n` +
    `> Generated: ${new Date().toISOString()}\n\n` +
    `---\n\n`;

  fs.writeFileSync(LLMS_FULL, header + fullEntries.join(''), 'utf8');
  const fullSize = (fs.statSync(LLMS_FULL).size / 1024 / 1024).toFixed(1);
  console.log(`llms-full.txt: ${fullEntries.length} entries, ${fullSize} MB`);
  console.log(`Output: ${LLMS_FULL}`);
}

main();
