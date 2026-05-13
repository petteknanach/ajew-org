#!/usr/bin/env node
/**
 * Add BreadcrumbList JSON-LD schema to all reader route files.
 * This adds breadcrumb structured data for better Google search results.
 */

const fs = require('fs');
const path = require('path');

const readerDir = path.join(__dirname, '..', 'src', 'pages', 'reader');

// Find all [torah].astro files
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

  // Skip if already has breadcrumb schema
  if (content.includes('BreadcrumbList')) {
    skipped++;
    continue;
  }

  // Extract the book slug from the path
  // e.g., .../reader/anava/[part]/[torah].astro -> anava
  const relPath = path.relative(readerDir, file);
  const bookSlug = relPath.split(path.sep)[0];

  // Extract book name from existing structured data
  // Look for isPartOf name or author name
  let bookName = bookSlug;
  const isPartOfMatch = content.match(/"isPartOf":\s*\{[^}]*"name":\s*"([^"]+)"/);
  if (isPartOfMatch) {
    bookName = isPartOfMatch[1];
  }

  // Find the --- closing fence (end of frontmatter) - it's the second ---
  // We need to add the breadcrumbData variable before the closing ---

  // Find the structuredData definition
  const structuredDataMatch = content.match(/const structuredData = [\s\S]*?\}\)\s*:\s*'';/);
  if (!structuredDataMatch) {
    console.log(`  SKIP (no structuredData): ${bookSlug}`);
    skipped++;
    continue;
  }

  // Build the breadcrumb variable to insert after structuredData
  // We need to figure out what URL variable is used
  const urlMatch = content.match(/"url":\s*`https:\/\/ajew\.org\/reader\/([^`]+)`/);
  let readerPath = bookSlug;
  if (urlMatch) {
    // Extract the path pattern, e.g., "anava/${partNum}/${torahNum}"
    readerPath = urlMatch[1];
  }

  const breadcrumbCode = `
const breadcrumbData = torahData ? JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Library", "item": "https://ajew.org/reader" },
    { "@type": "ListItem", "position": 2, "name": "${bookName.replace(/"/g, '\\"')}", "item": \`https://ajew.org/reader#${bookSlug}\` },
    { "@type": "ListItem", "position": 3, "name": torahData.hebrewTitle || torahData.title }
  ]
}) : '';`;

  // Insert breadcrumbData after the structuredData block
  const insertPoint = structuredDataMatch.index + structuredDataMatch[0].length;
  content = content.slice(0, insertPoint) + breadcrumbCode + content.slice(insertPoint);

  // Add the breadcrumb script tag after the existing structured data script tag
  const existingScriptTag = `{torahData && structuredData && (
    <script type="application/ld+json" set:html={structuredData} slot="head" />
  )}`;

  const replacementScriptTags = `{torahData && structuredData && (
    <script type="application/ld+json" set:html={structuredData} slot="head" />
  )}
  {torahData && breadcrumbData && (
    <script type="application/ld+json" set:html={breadcrumbData} slot="head" />
  )}`;

  if (content.includes(existingScriptTag)) {
    content = content.replace(existingScriptTag, replacementScriptTags);
  } else {
    // Try a more flexible match
    const scriptMatch = content.match(/\{torahData && structuredData && \(\s*\n\s*<script type="application\/ld\+json" set:html=\{structuredData\} slot="head" \/>\s*\n\s*\)\}/);
    if (scriptMatch) {
      content = content.replace(scriptMatch[0], scriptMatch[0] + `\n  {torahData && breadcrumbData && (\n    <script type="application/ld+json" set:html={breadcrumbData} slot="head" />\n  )}`);
    } else {
      console.log(`  SKIP (no script tag found): ${bookSlug}`);
      skipped++;
      continue;
    }
  }

  fs.writeFileSync(file, content, 'utf8');
  modified++;
}

console.log(`\nDone! Modified: ${modified}, Skipped: ${skipped}`);
