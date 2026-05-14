/**
 * Patch all reader templates to add GitHub raw CDN fallback.
 * Run this BEFORE astro build.
 * Usage: node scripts/patch-reader-templates.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Recursively find all [torah].astro files
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
  
  // Skip if already patched
  if (content.includes('raw.githubusercontent.com')) {
    console.log(`  SKIP (already patched): ${relPath}`);
    skipped++;
    continue;
  }
  
  // Pattern: "} catch (e) {\n  error = `"
  const oldPattern = '} catch (e) {\n  error = `';
  const idx = content.indexOf(oldPattern);
  
  if (idx === -1) {
    // Try with different whitespace
    const idx2 = content.indexOf('} catch (e) {');
    if (idx2 === -1) {
      console.log(`  NO MATCH: ${relPath}`);
      continue;
    }
    // Find the error line after catch
    const afterCatch = content.substring(idx2);
    const errorMatch = afterCatch.match(/} catch \(e\) \{\s*\n\s*(error = `[^`]+`;)/);
    if (errorMatch) {
      const oldBlock = '} catch (e) {\n  ' + errorMatch[1];
      const bookMatch = relPath.match(/reader\/([^/]+)\//);
      const bookName = bookMatch ? bookMatch[1] : 'content';
      const newBlock = `} catch (e) {
  // Fallback: fetch from GitHub raw CDN during build
  try {
    const url = \`https://raw.githubusercontent.com/petteknanach/ajew-org/main/\${filePath.replace(process.cwd() + '/', '')}\`;
    const resp = await fetch(url);
    if (resp.ok) {
      torahData = await resp.json();
    } else {
      error = \`${bookName} \${torah} not found\`;
    }
  } catch (e2) {
    error = \`${bookName} \${torah} not found\`;
  }
}`;
      content = content.replace(oldBlock, newBlock);
      fs.writeFileSync(fullPath, content, 'utf8');
      patched++;
      console.log(`  PATCHED: ${relPath}`);
    } else {
      console.log(`  NO ERROR MATCH: ${relPath}`);
    }
    continue;
  }
  
  // Extract the error message from the catch block
  const afterCatch = content.substring(idx);
  const errorMatch = afterCatch.match(/} catch \(e\) \{\s*\n\s*(error = `[^`]+`;)/);
  if (errorMatch) {
    const oldBlock = '} catch (e) {\n  ' + errorMatch[1];
    const bookMatch = relPath.match(/reader\/([^/]+)\//);
    const bookName = bookMatch ? bookMatch[1] : 'content';
    const newBlock = `} catch (e) {
  // Fallback: fetch from GitHub raw CDN during build
  try {
    const url = \`https://raw.githubusercontent.com/petteknanach/ajew-org/main/\${filePath.replace(process.cwd() + '/', '')}\`;
    const resp = await fetch(url);
    if (resp.ok) {
      torahData = await resp.json();
    } else {
      error = \`${bookName} \${torah} not found\`;
    }
  } catch (e2) {
    error = \`${bookName} \${torah} not found\`;
  }
}`;
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(fullPath, content, 'utf8');
    patched++;
    console.log(`  PATCHED: ${relPath}`);
  } else {
    console.log(`  NO ERROR MATCH: ${relPath}`);
  }
}

console.log(`Patched ${patched}, skipped ${skipped}`);
