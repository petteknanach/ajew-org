#!/usr/bin/env node
/**
 * Improve meta descriptions on all reader route files.
 * Makes descriptions more SEO-friendly by including book name,
 * content snippet extraction at runtime, and "read online free" keywords.
 */

const fs = require('fs');
const path = require('path');

const readerDir = path.join(__dirname, '..', 'src', 'pages', 'reader');

function findRouteFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === '[torah].astro') {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findRouteFiles(readerDir);
console.log(`Found ${files.length} route files`);

let modified = 0;
let skipped = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(readerDir, file);
  const bookSlug = relPath.split(path.sep)[0];

  // Extract book name from isPartOf or from pageTitle
  let bookName = bookSlug;
  const isPartOfMatch = content.match(/"isPartOf":\s*\{[^}]*"name":\s*"([^"]+)"/);
  if (isPartOfMatch) {
    bookName = isPartOfMatch[1];
  }

  // Find the pageDesc block
  const descMatch = content.match(/const pageDesc = torahData\s*\n\s*\?\s*`[^`]*`\s*\n\s*:\s*'';/);
  if (!descMatch) {
    console.log(`  SKIP (no pageDesc pattern): ${bookSlug}`);
    skipped++;
    continue;
  }

  // Check if already improved (contains "Read online" or "snippet")
  if (descMatch[0].includes('snippet') || descMatch[0].includes('Read online')) {
    skipped++;
    continue;
  }

  // Build improved description
  // The description will dynamically extract first English segment as a snippet
  const newDesc = `const pageDesc = torahData
  ? (() => {
    const snippet = (torahData.segments?.find(s => s.en)?.en || '').replace(/<[^>]+>/g, '').slice(0, 120);
    return \`Read \${torahData.title} from ${bookName.replace(/`/g, "\\`")} online free. \${snippet ? snippet + '...' : 'Hebrew text with English translation on ajew.org.'}\`;
  })()
  : '';`;

  content = content.replace(descMatch[0], newDesc);
  fs.writeFileSync(file, content, 'utf8');
  modified++;
}

console.log(`\nDone! Modified: ${modified}, Skipped: ${skipped}`);
