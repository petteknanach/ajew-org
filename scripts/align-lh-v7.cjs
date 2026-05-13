#!/usr/bin/env node
/**
 * LH English alignment v7 - match by Hebrew content in HTML.
 * Since HTML files are translations of Hebrew text, the Hebrew halacha name
 * should appear in the HTML content. We search for each Hebrew title in each HTML file.
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'").replace(/&&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractParagraphs(content) {
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(content)) !== null) {
    let text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text.length >= 20) paragraphs.push(text);
  }
  return paragraphs;
}

const volToPart = {
  'Likutay Halachos - Orach Chaim - 1': 1,
  'Likutay Halachos - Orach Chaim - 2': 2,
  'Likutay Halachos - Orach Chaim - 3': 3,
  'Likutay Halachos - Yoreh Daya - 1': 4,
  'Likutay Halachos - Yoreh Daya - 2': 5,
  'Likutay Halachos - Evven Hu-ezehr': 6,
  'Likutay Halachos - Choshen Mishpat - 1': 7,
  'Likutay Halachos - Choshen Mishpat - 2': 8,
};

// Build HTML entries by part - store full content for searching
const htmlByPart = {};
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  if (!htmlByPart[part]) htmlByPart[part] = [];
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  
  for (const hf of files) {
    const htmlPath = path.join(volDir, hf);
    const content = fs.readFileSync(htmlPath, 'utf8');
    const paras = extractParagraphs(content);
    if (paras.length === 0) continue;
    
    // Extract just the Hebrew text from the HTML (between Hebrew tags or in the body)
    const hebrewInHTML = [];
    // Look for Hebrew text segments
    const hebRegex = /[\u0590-\u05FF]{3,}/g;
    let m;
    while ((m = hebRegex.exec(content)) !== null) {
      hebrewInHTML.push(m[0]);
    }
    
    htmlByPart[part].push({ hf, htmlPath, content, paras, hebrewWords: hebrewInHTML });
  }
}

// Build Hebrew entries by part
const hebrewByPart = {};
for (let part = 1; part <= 8; part++) {
  hebrewByPart[part] = [];
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of idx.torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    if (!fs.existsSync(filePath)) continue;
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    
    // Check if already has English
    const alreadyHasEn = segments.some(s => s.en && s.en.trim().length > 0);
    
    // Clear old English (we'll reassign)
    for (const seg of segments) seg.en = '';
    
    const contentSegs = [];
    for (let i = 0; i < segments.length; i++) {
      const he = (segments[i].he || segments[i].he_nikud || '').trim();
      if (he.length === 0) continue;
      if (/^אות\s/.test(he) && he.length < 10) continue;
      if (/^הלכה\s/.test(he) && he.length < 15) continue;
      if (/^סימן\s/.test(he) && he.length < 15) continue;
      if (he.length < 8) continue;
      contentSegs.push(i);
    }
    
    const hebrewTitle = t.hebrewTitle || t.title || '';
    
    hebrewByPart[part].push({
      title: t.title || '',
      hebrewTitle,
      number: t.number,
      filePath, segments, contentSegs,
      segCount: contentSegs.length,
      alreadyHasEn
    });
  }
}

// Match: for each Hebrew file, find HTML file that contains the Hebrew title text
console.log('=== Matching by Hebrew content in HTML ===\n');
let totalMatched = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const htmlList = htmlByPart[part] || [];
  const hebList = hebrewByPart[part] || [];
  const usedHtml = new Set();
  
  let partMatched = 0;
  
  for (const heb of hebList) {
    let bestHtml = -1;
    let bestScore = 0;
    
    for (let h = 0; h < htmlList.length; h++) {
      if (usedHtml.has(h)) continue;
      
      const html = htmlList[h];
      let score = 0;
      
      // Check if the Hebrew title (or parts of it) appears in the HTML content
      const hebTitle = heb.hebrewTitle;
      
      // Full title match
      if (html.content.includes(hebTitle)) {
        score = 100;
      } else {
        // Partial match: check if key Hebrew words appear
        const hebWords = hebTitle.split(/\s+/).filter(w => w.length >= 3);
        let matchedWords = 0;
        for (const w of hebWords) {
          if (html.content.includes(w)) matchedWords++;
        }
        if (hebWords.length > 0) {
          score = (matchedWords / hebWords.length) * 80;
        }
      }
      
      // Also check if Hebrew words from the HTML match the Hebrew title
      if (score < 50) {
        for (const word of html.hebrewWords) {
          if (hebTitle.includes(word) && word.length >= 3) {
            score = Math.max(score, 60);
            break;
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestHtml = h;
      }
    }
    
    if (bestHtml >= 0 && bestScore >= 50) {
      const html = htmlList[bestHtml];
      usedHtml.add(bestHtml);
      
      for (const seg of heb.segments) seg.en = '';
      
      if (html.paras.length > 0 && heb.segCount > 0) {
        if (html.paras.length >= heb.segCount) {
          const ratio = html.paras.length / heb.segCount;
          for (let s = 0; s < heb.segCount; s++) {
            const start = Math.round(s * ratio);
            const end = Math.round((s + 1) * ratio);
            heb.segments[heb.contentSegs[s]].en = html.paras.slice(start, end).join('\n\n');
          }
        } else {
          const ratio = heb.segCount / html.paras.length;
          for (let e = 0; e < html.paras.length; e++) {
            const sStart = Math.round(e * ratio);
            const sEnd = Math.round((e + 1) * ratio);
            for (let s = sStart; s < sEnd && s < heb.segCount; s++) {
              heb.segments[heb.contentSegs[s]].en = html.paras[e];
            }
          }
        }
        
        fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
        totalMatched++;
        partMatched++;
        
        matchLog.push({
          part,
          hebrew: `#${heb.number} ${heb.hebrewTitle}`,
          html: html.hf,
          score: Math.round(bestScore)
        });
      }
    }
  }
  
  console.log(`Part ${part}: ${partMatched} newly matched`);
}

// Count coverage
let filesWithEn = 0, totalHeb = 0;
for (let part = 1; part <= 8; part++) {
  for (const heb of hebrewByPart[part] || []) {
    totalHeb++;
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) filesWithEn++;
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Newly matched: ${totalMatched}`);
console.log(`Coverage: ${filesWithEn}/${totalHeb} (${(filesWithEn/totalHeb*100).toFixed(1)}%)`);

for (let part = 1; part <= 8; part++) {
  const hebs = hebrewByPart[part] || [];
  let withEn = 0;
  for (const h of hebs) {
    if (h.segments.some(s => s.en && s.en.trim().length > 0)) withEn++;
  }
  console.log(`  Part ${part}: ${withEn}/${hebs.length}`);
}

// Show unmatched for parts 4, 5, 6
for (const part of [4, 5, 6]) {
  const unmatched = hebrewByPart[part]?.filter(h => !h.segments.some(s => s.en && s.en.trim().length > 0));
  console.log(`\nPart ${part} unmatched (${unmatched?.length || 0}):`);
  for (const h of (unmatched || []).slice(0, 20)) {
    console.log(`  #${h.number} ${h.hebrewTitle}`);
  }
  if ((unmatched?.length || 0) > 20) console.log(`  ... and ${(unmatched?.length || 0) - 20} more`);
}

fs.writeFileSync('/root/ajew-org/scripts/align-v7-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log('\nMatch log saved.');
