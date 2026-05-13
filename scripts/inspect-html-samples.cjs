#!/usr/bin/env node
/**
 * Quick check: see what structure HTML files have that could help match.
 * Look for section numbers, halacha numbers, or other identifiers.
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&#x27;/g, "'").replace(/&#x2014;/g, '—').replace(/&#x2013;/g, '–')
    .replace(/&#x2018;/g, "'").replace(/&#x2019;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

// Check a few HTML files from different volumes
const samples = [
  'Likutay Halachos - Orach Chaim - 1/940 bais_haknnesses_1.html',
  'Likutay Halachos - Orach Chaim - 1/945 bais_haknnesses_2.html',
  'Likutay Halachos - Orach Chaim - 1/984 bais_haknnesses_6a.html',
  'Likutay Halachos - Choshen Mishpat - 1/690 hilchos_shluchim_5.html',
  'Likutay Halachos - Yoreh Daya - 1/240 ribbis_1.html',
];

for (const s of samples) {
  const full = path.join(TRANSLATIONS_BASE, s);
  if (!fs.existsSync(full)) {
    console.log(`NOT FOUND: ${s}`);
    continue;
  }
  
  const content = fs.readFileSync(full, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  
  // Get all headers
  const headers = [];
  const hRegex = /<h[123][^>]*>(.*?)<\/h[123]>/gi;
  let m;
  while ((m = hRegex.exec(content)) !== null) {
    headers.push(decodeHTML(m[1].replace(/<[^>]+>/g, '')).trim());
  }
  
  // Count paragraphs
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pCount = 0;
  while ((m = pRegex.exec(content)) !== null) {
    let text = m[1].replace(/<[^>]+>/g, '');
    text = decodeHTML(text).trim();
    if (text.length >= 20) pCount++;
  }
  
  console.log(`\n${path.basename(s)}:`);
  console.log(`  Title: ${titleMatch ? titleMatch[1] : 'N/A'}`);
  console.log(`  H1: ${h1Match ? h1Match[1].replace(/<[^>]+>/g, '') : 'N/A'}`);
  console.log(`  Headers: ${headers.length}`);
  headers.slice(0, 5).forEach(h => console.log(`    - ${h.substring(0, 60)}`));
  console.log(`  Paragraphs: ${pCount}`);
  
  // Show first paragraph
  const firstP = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (firstP) {
    let text = firstP[1].replace(/<[^>]+>/g, '');
    text = decodeHTML(text).trim();
    console.log(`  First para: ${text.substring(0, 100)}`);
  }
}
