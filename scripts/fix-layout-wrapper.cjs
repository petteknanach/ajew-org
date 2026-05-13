#!/usr/bin/env node
/**
 * Fix Astro pages that have a dead `import Layout` at the end of the file
 * instead of properly wrapping content in <Layout>.
 *
 * Pattern detected:
 *   --- (frontmatter with pageTitle/pageDescription) ---
 *   <style>...</style>
 *   <section>...</section>
 *   ---
 *   import Layout from '...Layout.astro';
 *
 * Fix:
 *   --- import Layout; pageTitle; pageDescription ---
 *   <Layout title={pageTitle} description={pageDescription}>
 *     ...content...
 *   </Layout>
 */
const fs = require('fs');
const path = require('path');

const PAGES_DIR = 'src/pages';
let fixed = 0;
let skipped = 0;

function findBrokenPages(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip reader directory (too many files, different pattern)
      if (entry.name === 'reader' || entry.name === 'api') continue;
      files.push(...findBrokenPages(fullPath));
    } else if (entry.name.endsWith('.astro')) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixPage(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if it has the broken pattern: ends with ---\nimport Layout...
  const lines = content.split('\n');
  const lastLines = lines.slice(-5).join('\n');

  if (!lastLines.includes('import Layout')) return false;
  if (content.includes('<Layout')) return false; // Already has Layout wrapper

  // Find the Layout import line at the end
  let layoutImportIdx = -1;
  let layoutPath = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].match(/^import Layout from/)) {
      layoutImportIdx = i;
      const match = lines[i].match(/from ['"]([^'"]+)['"]/);
      if (match) layoutPath = match[1];
      break;
    }
  }

  if (layoutImportIdx === -1) return false;

  // Find the --- before the import (the broken second frontmatter)
  let secondFmStart = -1;
  for (let i = layoutImportIdx - 1; i >= 0; i--) {
    if (lines[i].trim() === '---') {
      secondFmStart = i;
      break;
    }
  }

  if (secondFmStart === -1) return false;

  // Extract the first frontmatter
  let firstFmEnd = -1;
  if (lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        firstFmEnd = i;
        break;
      }
    }
  }

  if (firstFmEnd === -1) return false;

  // Get frontmatter variables
  const fmContent = lines.slice(1, firstFmEnd).join('\n');

  // Extract pageTitle and pageDescription
  const titleMatch = fmContent.match(/const pageTitle\s*=\s*["']([^"']+)["']/);
  const descMatch = fmContent.match(/const pageDescription\s*=\s*["']([^"']+)["']/);

  const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.astro').replace(/-/g, ' ');
  const desc = descMatch ? descMatch[1] : '';

  // Get the HTML content between end of first frontmatter and start of second frontmatter
  const htmlContent = lines.slice(firstFmEnd + 1, secondFmStart).join('\n').trim();

  // Build the fixed file
  const newFm = [
    '---',
    `import Layout from '${layoutPath}';`,
    ...lines.slice(1, firstFmEnd),
    '---'
  ].join('\n');

  const titleProp = titleMatch ? '{pageTitle}' : `"${title}"`;
  const descProp = descMatch ? '{pageDescription}' : (desc ? `"${desc}"` : '"Breslov teachings and Torah study on ajew.org"');

  const newContent = `${newFm}\n\n<Layout title=${titleProp} description=${descProp}>\n${htmlContent}\n</Layout>\n`;

  fs.writeFileSync(filePath, newContent);
  return true;
}

const allPages = findBrokenPages(PAGES_DIR);
console.log(`Found ${allPages.length} .astro files to check`);

for (const page of allPages) {
  try {
    if (fixPage(page)) {
      fixed++;
      if (fixed <= 20) console.log(`  Fixed: ${page}`);
    } else {
      skipped++;
    }
  } catch (e) {
    console.log(`  Error: ${page}: ${e.message}`);
  }
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped (already OK or different pattern)`);
