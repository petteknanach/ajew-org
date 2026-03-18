/**
 * Add English translations to Sipurey Maasiyos reader JSON files.
 *
 * Source: HebrewBreslovBooks/92_ספרים מתורגמים/סיפורי מעשיות באנגלית.txt
 * Target: public/reader/sipurey-maasiyos/story-{1..10}.json
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const ROOT = path.resolve(__dirname, '..');
const ENGLISH_FILE = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks/92_ספרים מתורגמים/סיפורי מעשיות באנגלית.txt';
const JSON_DIR = path.join(ROOT, 'public/reader/sipurey-maasiyos');

// ── Utility ──

function stripMarkup(text) {
  text = text.replace(/^&HiddenFromIndex=[^\n]*/m, '');
  text = text.replace(/\{\{\{\{/g, '').replace(/\}\}\}\}/g, '');
  text = text.replace(/\(\(\(/g, '').replace(/\)\)\)/g, '');
  text = text.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
  text = text.replace(/\{([^}]*)\}/g, '($1)');
  text = text.replace(/\[\[\[/g, '').replace(/\]\]\]/g, '');
  text = text.replace(/\[\[/g, '').replace(/\]\]/g, '');
  text = text.replace(/<big>/gi, '').replace(/<\/big>/gi, '');
  text = text.replace(/<small>/gi, '').replace(/<\/small>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<hr\s*\/?>/gi, '\n');
  text = text.replace(/<b[^>]*>/gi, '').replace(/<\/b>/gi, '');
  text = text.replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '');
  text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/_nbsp_/g, ' ');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

// ── Parse English file ──

const rawText = iconv.decode(fs.readFileSync(ENGLISH_FILE), 'win1255').replace(/^\uFEFF/, '');
const sections = {};

const parts = rawText.split(/^@\s*/m);
for (const part of parts) {
  const trimmed = part.trim();
  if (!trimmed) continue;
  const lines = trimmed.split(/\r?\n/);
  const title = lines[0].trim();

  // Get all content lines after the title
  const contentLines = lines.slice(1);
  const cleaned = stripMarkup(contentLines.join('\n'));
  // Split into paragraphs by newline (each line is a paragraph in this file)
  const paragraphs = cleaned.split(/\n/).filter(p => p.trim().length > 0);

  sections[title] = paragraphs;
}

console.log('Parsed English sections:');
for (const [key, val] of Object.entries(sections)) {
  console.log(`  ${key}: ${val.length} paragraphs`);
}

// ── Story number mapping ──
// Hebrew JSON file -> English Story number
// Based on titles in the Hebrew JSONs:
// story-1: מעשה א (Story 1)
// story-2: מעשה ב (Story 2)
// story-3: מעשה ג (Story 3)
// story-4: מעשה ד (Story 4)
// story-5: מעשה ט (Story 9)
// story-6: מעשה י (Story 10)
// story-7: מעשה יא (Story 11)
// story-8: מעשה יב (Story 12)
// story-9: מעשה יג - part A (Story 13)
// story-10: מעשה יג - part B (Story 13)

const storyMapping = {
  'story-1': { englishKey: 'Story 1' },
  'story-2': { englishKey: 'Story 2' },
  'story-3': { englishKey: 'Story 3' },
  'story-4': { englishKey: 'Story 4' },
  'story-5': { englishKey: 'Story 9' },
  'story-6': { englishKey: 'Story 10' },
  'story-7': { englishKey: 'Story 11' },
  'story-8': { englishKey: 'Story 12' },
  // story-9 and story-10 both map to Story 13 (split)
};

// ── Helper: distribute English paragraphs across Hebrew segments ──

function distributeParagraphs(englishParas, numSegments) {
  if (englishParas.length === 0) {
    return new Array(numSegments).fill('');
  }

  if (englishParas.length === numSegments) {
    // Perfect 1:1 match
    return englishParas.map(p => p.trim());
  }

  if (englishParas.length <= numSegments) {
    // Fewer English paragraphs than segments - assign one each, leave rest empty
    const result = new Array(numSegments).fill('');
    for (let i = 0; i < englishParas.length; i++) {
      result[i] = englishParas[i].trim();
    }
    return result;
  }

  // More English paragraphs than segments - distribute proportionally
  // Concatenate multiple English paragraphs into each segment
  const result = [];
  const parasPerSegment = englishParas.length / numSegments;

  for (let seg = 0; seg < numSegments; seg++) {
    const startIdx = Math.round(seg * parasPerSegment);
    const endIdx = Math.round((seg + 1) * parasPerSegment);
    const merged = englishParas.slice(startIdx, endIdx).map(p => p.trim()).join('\n');
    result.push(merged);
  }

  return result;
}

// ── Filter out title/header lines from English paragraphs ──
// English stories start with short title lines before the actual narrative

function extractTextParagraphs(paragraphs) {
  // Find where the actual story text starts
  // Title lines are typically short (< 80 chars) and at the beginning
  // The actual story text starts with longer lines
  let startIdx = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const line = paragraphs[i].trim();
    // Skip very short lines at the beginning (titles, dates, etc.)
    if (line.length >= 80) {
      startIdx = i;
      break;
    }
    // Also start if we see narrative indicators even in shorter lines
    if (i > 0 && line.length >= 50 && (
      line.startsWith('He ') || line.startsWith('Once') || line.startsWith('There') ||
      line.startsWith('A ') || line.startsWith('The ') || line.startsWith('In ')
    )) {
      startIdx = i;
      break;
    }
  }

  // Return title lines and text paragraphs separately
  return {
    titleLines: paragraphs.slice(0, startIdx),
    textParas: paragraphs.slice(startIdx)
  };
}

// ── Process each story ──

// First handle stories 1-8 (simple mapping)
for (const [storyFile, mapping] of Object.entries(storyMapping)) {
  const jsonPath = path.join(JSON_DIR, `${storyFile}.json`);
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const englishParas = sections[mapping.englishKey];
  if (!englishParas) {
    console.log(`WARNING: No English found for ${storyFile} (${mapping.englishKey})`);
    continue;
  }

  const { titleLines, textParas } = extractTextParagraphs(englishParas);
  const numSegments = json.segments.length;

  console.log(`\n${storyFile} (${mapping.englishKey}):`);
  console.log(`  Hebrew segments: ${numSegments}`);
  console.log(`  English title lines: ${titleLines.length} (${titleLines.join(' | ')})`);
  console.log(`  English text paragraphs: ${textParas.length}`);

  // Distribute English paragraphs across Hebrew segments
  const distributed = distributeParagraphs(textParas, numSegments);

  // Update segments
  for (let i = 0; i < json.segments.length; i++) {
    json.segments[i].en = distributed[i];
  }

  // Set hasEnglish flag
  json.hasEnglish = true;

  // Write back
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
  console.log(`  Written ${storyFile}.json`);
}

// ── Handle Story 13 (split across story-9 and story-10) ──

const story13Paras = sections['Story 13'];
if (story13Paras) {
  const { titleLines, textParas } = extractTextParagraphs(story13Paras);

  const json9 = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'story-9.json'), 'utf8'));
  const json10 = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'story-10.json'), 'utf8'));

  const segs9 = json9.segments.length;
  const segs10 = json10.segments.length;
  const totalSegs = segs9 + segs10;

  console.log(`\nStory 13 (split across story-9 and story-10):`);
  console.log(`  English title lines: ${titleLines.length} (${titleLines.join(' | ')})`);
  console.log(`  English text paragraphs: ${textParas.length}`);
  console.log(`  Hebrew segments: story-9=${segs9}, story-10=${segs10}, total=${totalSegs}`);

  // Distribute across all segments combined, then split
  const allDistributed = distributeParagraphs(textParas, totalSegs);

  // Assign to story-9
  for (let i = 0; i < segs9; i++) {
    json9.segments[i].en = allDistributed[i];
  }
  json9.hasEnglish = true;
  fs.writeFileSync(path.join(JSON_DIR, 'story-9.json'), JSON.stringify(json9, null, 2), 'utf8');
  console.log(`  Written story-9.json`);

  // Assign to story-10
  for (let i = 0; i < segs10; i++) {
    json10.segments[i].en = allDistributed[segs9 + i];
  }
  json10.hasEnglish = true;
  fs.writeFileSync(path.join(JSON_DIR, 'story-10.json'), JSON.stringify(json10, null, 2), 'utf8');
  console.log(`  Written story-10.json`);
}

// ── Update index.json ──

const indexPath = path.join(JSON_DIR, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
for (const torah of index.torahs) {
  torah.hasEnglish = true;
}
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
console.log('\nUpdated index.json with hasEnglish: true');

// ── Also handle Salutation and Foreword ──
// Prepend Salutation and Foreword to story-1's first segment
const salutation = sections['Salutation'];
const foreword = sections['Foreword'];

if (salutation || foreword) {
  const json1 = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'story-1.json'), 'utf8'));

  // Build a prefix from salutation and foreword
  let prefix = '';
  if (salutation && salutation.length > 0) {
    prefix += '[SALUTATION]\n' + salutation.join('\n') + '\n\n';
  }
  if (foreword && foreword.length > 0) {
    prefix += '[FOREWORD]\n' + foreword.join('\n') + '\n\n';
  }

  // Prepend to the first segment's English
  json1.segments[0].en = prefix + (json1.segments[0].en || '');
  fs.writeFileSync(path.join(JSON_DIR, 'story-1.json'), JSON.stringify(json1, null, 2), 'utf8');
  console.log('Added Salutation and Foreword to story-1.json first segment');
}

console.log('\nDone! English translations added to all Sipurey Maasiyos JSON files.');
