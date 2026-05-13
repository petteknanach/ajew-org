#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function parseTitle(title) {
  // Remove "Likutay Halachos –" prefix
  let t = title.replace(/^Likutay Halachos\s*[—–-\s]+\s*/i, '');
  
  // Try to extract "Hilchos X" or "Laws of X"
  let name = '';
  const namePatterns = [
    /Hilchos\s+([A-Za-z\s'_-]+?)(?:\s*[,-]|\s*$)/i,
    /Laws\s+of\s+([A-Za-z\s'_-]+?)(?:\s*[,-]|\s*$)/i,
  ];
  for (const p of namePatterns) {
    const m = t.match(p);
    if (m) { name = m[1].trim(); break; }
  }
  
  // Extract halacha number
  let halacha = '';
  const hMatch = t.match(/Halacha[s]?\s+(\d+[a-z]?(?:\s*[–-]\s*\d+[a-z]?)?)/i);
  if (hMatch) {
    halacha = hMatch[1].trim().toLowerCase();
  }
  
  return { name, halacha, raw: title };
}

// Check all titles in Orach Chaim 1
const oc1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1');
const htmlFiles = fs.readdirSync(oc1Dir).filter(f => f.endsWith('.html')).sort();

console.log('Orach Chaim 1 titles:');
for (const hf of htmlFiles) {
  const content = fs.readFileSync(path.join(oc1Dir, hf), 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
  const { name, halacha, raw } = parseTitle(title);
  
  if (!name) {
    console.log(`  PARSE FAIL: ${hf}`);
    console.log(`    Raw: ${raw.substring(0, 80)}`);
  }
}
