/**
 * Move filePath declaration BEFORE the try block in all reader templates.
 * This is needed for the GitHub raw CDN fallback to work.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function findReaderTemplates(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findReaderTemplates(fullPath));
    } else if (entry.name === '[torah].astro') {
      results.push(fullPath);
    }
  }
  return results;
}

const readerDir = path.join(ROOT, 'src', 'pages', 'reader');
const templates = findReaderTemplates(readerDir);
console.log(`Found ${templates.length} reader templates`);

let fixed = 0;
let skipped = 0;

for (const fullPath of templates) {
  const relPath = path.relative(ROOT, fullPath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if filePath is already before try
  if (content.match(/\nconst filePath = .*?\n\ntry \{/s)) {
    console.log(`  SKIP (already correct): ${relPath}`);
    skipped++;
    continue;
  }

  // Pattern: try {\n  const filePath = ...;
  const match = content.match(/(try \{\s*\n\s*)(const filePath = path\.join\(process\.cwd\(\), `([^`]+)`\);)/);
  if (!match) {
    console.log(`  NO MATCH: ${relPath}`);
    continue;
  }

  const filePathLine = match[2];
  const newContent = content.replace(match[0], `${filePathLine}\n\ntry {`);
  fs.writeFileSync(fullPath, newContent, 'utf8');
  fixed++;
  console.log(`  FIXED: ${relPath}`);
}

console.log(`Fixed ${fixed}, skipped ${skipped}`);
