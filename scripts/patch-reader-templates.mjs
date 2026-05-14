/**
 * Patch all reader templates to add GitHub raw CDN fallback.
 * Run BEFORE astro build: node scripts/patch-reader-templates.mjs
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

let patched = 0;
let skipped = 0;

for (const fullPath of templates) {
  const relPath = path.relative(ROOT, fullPath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Skip if already has the new pattern (filePath before try, and raw.githubusercontent.com)
  const hasNewPattern = content.includes('raw.githubusercontent.com') && 
    content.match(/\nconst filePath = .*?\n\ntry \{/s);
  if (hasNewPattern) {
    console.log(`  SKIP (already patched): ${relPath}`);
    skipped++;
    continue;
  }

  // Extract the book directory name from the path
  const bookMatch = relPath.match(/reader\/([^/]+)\//);
  const bookDir = bookMatch ? bookMatch[1] : 'content';

  // Find the try block with filePath and readFileSync
  const tryMatch = content.match(/(try \{\s*\n\s*)(const filePath = path\.join\(process\.cwd\(\), `([^`]+)`\);\s*\n\s*)(const raw = fs\.readFileSync\(filePath, 'utf8'\);)/);
  if (!tryMatch) {
    console.log(`  NO try match: ${relPath}`);
    continue;
  }

  // Find the catch block
  const catchMatch = content.match(/} catch \(e\) \{\s*\n\s*(error = `[^`]+`;)/);
  if (!catchMatch) {
    console.log(`  NO catch: ${relPath}`);
    continue;
  }

  // Get the relative path pattern from the filePath template literal
  const filePathPattern = tryMatch[3]; // The template string part

  // Build the new code
  const newTrySection = `${filePathPattern}\n\ntry {\n  const raw = fs.readFileSync(filePath, 'utf8');`;
  content = content.replace(tryMatch[0], newTrySection);

  const oldCatch = `} catch (e) {\n  ${catchMatch[1]}`;
  const newCatch = `} catch (e) {
  // Fallback: fetch from GitHub raw CDN during build
  try {
    const url = \`https://raw.githubusercontent.com/petteknanach/ajew-org/main/\${filePath.replace(process.cwd() + '/', '')}\`;
    const resp = await fetch(url);
    if (resp.ok) {
      torahData = await resp.json();
    } else {
      error = \`${bookDir} \${torah} not found\`;
    }
  } catch (e2) {
    error = \`${bookDir} \${torah} not found\`;
  }
}`;

  content = content.replace(oldCatch, newCatch);
  fs.writeFileSync(fullPath, content, 'utf8');
  patched++;
  console.log(`  PATCHED: ${relPath}`);
}

console.log(`Patched ${patched}, skipped ${skipped}`);
