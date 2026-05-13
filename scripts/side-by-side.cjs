#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

// For Orach Chaim 1, list HTML files in directory order and Hebrew files in index order
const oc1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Orach Chaim - 1');
const htmlFiles = fs.readdirSync(oc1Dir).filter(f => f.endsWith('.html')).sort();

const idxFile = path.join(LH_BASE, 'part-1', 'index.json');
const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));

console.log('Orach Chaim 1: Directory order comparison\n');

// Get HTML titles
const htmlTitles = [];
for (const hf of htmlFiles) {
  const content = fs.readFileSync(path.join(oc1Dir, hf), 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1]) : '';
  htmlTitles.push({ hf, title });
}

// Get Hebrew titles
const hebrewTitles = (idx.torahs || []).map(t => ({
  number: t.number,
  title: t.hebrewTitle || t.title || ''
}));

// Show side by side
const maxLen = Math.max(htmlTitles.length, hebrewTitles.length);
console.log(`${'#'.padEnd(4)} | ${'HTML FILE'.padEnd(50)} | ${'HEBREW FILE'.padEnd(40)}`);
console.log('-'.repeat(100));

for (let i = 0; i < Math.min(30, maxLen); i++) {
  const html = htmlTitles[i];
  const heb = hebrewTitles[i];
  const htmlStr = html ? `${html.hf}: ${html.title.substring(0, 40)}` : '';
  const hebStr = heb ? `${heb.number}. ${heb.title}` : '';
  console.log(`${String(i).padEnd(4)} | ${htmlStr.padEnd(50)} | ${hebStr}`);
}

console.log(`\n... (${htmlTitles.length} HTML files, ${hebrewTitles.length} Hebrew files)`);
