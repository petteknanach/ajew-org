#!/usr/bin/env node
/**
 * Extract all 14 Behar teachings from the docx, match to LH sources,
 * and create corrected JSON with Hebrew + English.
 * 
 * Usage: node extract-behar-teachings.cjs
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LH_DIR = path.join(__dirname, '..', 'public', 'reader', 'likutay-halachos');
const DOCX_PATH = '/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/Parsha/3 VaYikra/09 Bihar.docx';

// Read docx using python-docx via a helper
function readDocx() {
  const script = `
import json, sys
import docx
doc = docx.Document('${DOCX_PATH.replace(/'/g, "\\'")}')
paras = []
for i, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    if text:
        paras.append({'idx': i, 'text': text})
print(json.dumps(paras, ensure_ascii=False))
`;
  const tmpFile = '/tmp/read_docx.py';
  fs.writeFileSync(tmpFile, script);
  const result = execSync(`python3 ${tmpFile}`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  return JSON.parse(result.trim());
}

// Parse teachings from docx paragraphs
function parseTeachings(paragraphs) {
  const teachings = [];
  let current = null;
  
  for (const p of paragraphs) {
    const text = p.text;
    const idx = p.idx;
    
    // Skip title
    if (text === 'פרשת בהר') continue;
    
    // Check for verse reference: (ויקרא כ"ה, ה')
    const verseMatch = text.match(/^\(ויקרא\s+כ"ה[,\s]+([^)]+)\)$/);
    if (verseMatch) {
      if (current) teachings.push(current);
      current = { verseRef: text, verseNum: verseMatch[1].trim(), hebrew: [], source: '', sourceRaw: '' };
      continue;
    }
    
    // Check for source reference (standalone or embedded)
    const sourceMatch = text.match(/\(לקוטי (הלכות|מוהר"ן)[^)]+\)/);
    if (sourceMatch) {
      if (current) {
        // Check if this paragraph also has Hebrew text before the source
        const beforeSource = text.substring(0, text.indexOf('(לקוטי')).trim();
        if (beforeSource && current.hebrew.length === 0) {
          current.hebrew.push(beforeSource);
        }
        current.sourceRaw = sourceMatch[0];
        current.source = sourceMatch[1];
      }
      continue;
    }
    
    // Check for verse text (short line, no source)
    if (current && text.length < 100 && !text.includes('לקוטי')) {
      // This might be a verse text line
      current.hebrew.push(text);
      continue;
    }
    
    // Regular Hebrew text
    if (current) {
      current.hebrew.push(text);
    }
  }
  
  if (current) teachings.push(current);
  return teachings;
}

// Main
console.log('Reading docx...');
const paragraphs = readDocx();
console.log(`Total paragraphs: ${paragraphs.length}`);

const teachings = parseTeachings(paragraphs);
console.log(`Parsed teachings: ${teachings.length}`);

// Output for review
for (let i = 0; i < teachings.length; i++) {
  const t = teachings[i];
  console.log(`\n=== Teaching ${i+1} ===`);
  console.log(`Verse: ${t.verseRef}`);
  console.log(`Source: ${t.sourceRaw || '(none)'}`);
  console.log(`Hebrew: ${t.hebrew.join(' ').substring(0, 200)}...`);
}

// Save raw teachings
fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'data', 'behar-teachings-raw.json'),
  JSON.stringify(teachings, null, 2)
);
console.log('\nSaved to public/data/behar-teachings-raw.json');
