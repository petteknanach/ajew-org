#!/usr/bin/env node
/**
 * Fix LH English-Hebrew paragraph pairing.
 * 
 * The problem: English text from HTML files was being dumped as one big block
 * into each Hebrew segment. We need to split the English proportionally
 * to match the number of Hebrew content segments.
 * 
 * For each Hebrew file:
 * 1. Count Hebrew content segments (he > 8 chars, not letter markers)
 * 2. Count English paragraphs from the HTML source
 * 3. Distribute English paragraphs across Hebrew segments proportionally
 */
const fs = require('fs');
const path = require('path');

const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"')
    .replace(/&#x27;/g, "'").replace(/&#x2014;/g, '—').replace(/&#x2013;/g, '–')
    .replace(/&#x2018;/g, "'").replace(/&#x2019;/g, "'")
    .replace(/&#x201C;/g, '"').replace(/&#x201D;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractCleanParagraphs(text) {
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(text)) !== null) {
    let t = decodeHTML(m[1]).replace(/<[^>]+>/g, '').trim();
    if (t.length >= 20) paragraphs.push(t);
  }
  return paragraphs;
}

let totalFixed = 0;
let totalFiles = 0;

for (let part = 1; part <= 8; part++) {
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  let partFixed = 0;
  
  for (const t of idx.torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    if (!fs.existsSync(filePath)) continue;
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    
    // Count Hebrew content segments
    const heContentSegs = [];
    for (let i = 0; i < segments.length; i++) {
      const he = (segments[i].he || segments[i].he_nikud || '').trim();
      if (he.length < 8) continue;
      if (/^אות\s/.test(he) && he.length < 10) continue;
      if (/^הלכה\s/.test(he) && he.length < 15) continue;
      heContentSegs.push(i);
    }
    
    if (heContentSegs.length === 0) continue;
    
    // Check if English needs fixing
    // Get all English text currently assigned
    let allEnText = '';
    for (const seg of segments) {
      if (seg.en) allEnText += seg.en + '\n\n';
    }
    
    if (!allEnText.trim()) continue; // No English to fix
    
    // Count English paragraphs
    const enParas = extractCleanParagraphs(allEnText);
    
    if (enParas.length === 0) continue;
    
    // Check if the pairing is wrong (English text is too long for the number of segments)
    // If we have 20 Hebrew segments but 30 English paragraphs, we need to redistribute
    // If we have 2 Hebrew segments but 31 English paragraphs, we need to redistribute
    
    const needsRedistribution = enParas.length !== heContentSegs.length;
    
    if (!needsRedistribution) continue;
    
    // Redistribute English paragraphs across Hebrew segments proportionally
    for (const seg of segments) seg.en = '';
    
    if (enParas.length >= heContentSegs.length) {
      // More English paragraphs than Hebrew segments - distribute evenly
      const ratio = enParas.length / heContentSegs.length;
      for (let s = 0; s < heContentSegs.length; s++) {
        const start = Math.round(s * ratio);
        const end = Math.round((s + 1) * ratio);
        const enText = enParas.slice(start, end).join('\n\n');
        segments[heContentSegs[s]].en = enText;
      }
    } else {
      // Fewer English paragraphs than Hebrew segments - assign one per segment
      const ratio = heContentSegs.length / enParas.length;
      for (let e = 0; e < enParas.length; e++) {
        const sStart = Math.round(e * ratio);
        const sEnd = Math.round((e + 1) * ratio);
        for (let s = sStart; s < sEnd && s < heContentSegs.length; s++) {
          segments[heContentSegs[s]].en = enParas[e];
        }
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    totalFixed++;
    partFixed++;
  }
  
  if (partFixed > 0) console.log(`Part ${part}: ${partFixed} files fixed`);
}

console.log(`\nTotal files fixed: ${totalFixed}`);
