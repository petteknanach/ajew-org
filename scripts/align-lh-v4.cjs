#!/usr/bin/env node
/**
 * LH English alignment - match by sequential order within each part.
 * The HTML translations are in the SAME ORDER as the Hebrew halachos (Shulchan Aruch order).
 * We just walk through both lists and match them 1:1.
 * When there are more HTML files than Hebrew files (OC1, OC3, CM1, CM2, CM8), skip extras.
 * When there are fewer HTML files than Hebrew files (YD1, YD2, EH), some Hebrew files won't get English.
 */
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

function decodeHTML(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractParagraphs(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
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

// Build HTML entries by part, sorted by filename (which is in Shulchan Aruch order)
const htmlByPart = {};
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  if (!htmlByPart[part]) htmlByPart[part] = [];
  
  // Sort by filename number prefix to get the correct order
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0');
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0');
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });
  
  for (const hf of files) {
    const htmlPath = path.join(volDir, hf);
    const paras = extractParagraphs(htmlPath);
    if (paras.length === 0) continue;
    
    htmlByPart[part].push({ hf, htmlPath, paras });
  }
}

// Build Hebrew entries by part, sorted by number (Shulchan Aruch order)
const hebrewByPart = {};
for (let part = 1; part <= 8; part++) {
  hebrewByPart[part] = [];
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  // Sort by number to ensure correct order
  const torahs = [...(idx.torahs || [])].sort((a, b) => a.number - b.number);
  
  for (const t of torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    if (!fs.existsSync(filePath)) continue;
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    
    // Clear old English
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
    
    hebrewByPart[part].push({
      title: t.hebrewTitle || t.title || '',
      number: t.number,
      filePath, segments, contentSegs,
      segCount: contentSegs.length
    });
  }
}

// Match sequentially: HTML[i] → Hebrew[i]
console.log('=== Sequential matching ===\n');
let totalMatched = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const htmlList = htmlByPart[part] || [];
  const hebList = hebrewByPart[part] || [];
  const minLen = Math.min(htmlList.length, hebList.length);
  
  console.log(`Part ${part}: ${htmlList.length} HTML, ${hebList.length} Hebrew → ${minLen} matches`);
  
  for (let i = 0; i < minLen; i++) {
    const html = htmlList[i];
    const heb = hebList[i];
    
    for (const seg of heb.segments) seg.en = '';
    
    const enParas = html.paras;
    const segCount = heb.segCount;
    
    if (segCount === 0) continue;
    
    if (enParas.length >= segCount) {
      const ratio = enParas.length / segCount;
      for (let s = 0; s < segCount; s++) {
        const start = Math.round(s * ratio);
        const end = Math.round((s + 1) * ratio);
        heb.segments[heb.contentSegs[s]].en = enParas.slice(start, end).join('\n\n');
      }
    } else {
      const ratio = segCount / enParas.length;
      for (let e = 0; e < enParas.length; e++) {
        const sStart = Math.round(e * ratio);
        const sEnd = Math.round((e + 1) * ratio);
        for (let s = sStart; s < sEnd && s < segCount; s++) {
          heb.segments[heb.contentSegs[s]].en = enParas[e];
        }
      }
    }
    
    fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
    totalMatched++;
    
    matchLog.push({
      part,
      hebrew: `#${heb.number} ${heb.title}`,
      html: html.hf,
      paras: enParas.length,
      segs: segCount
    });
  }
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
console.log(`Total matched: ${totalMatched}`);
console.log(`Coverage: ${filesWithEn}/${totalHeb} (${(filesWithEn/totalHeb*100).toFixed(1)}%)`);

// Per-part
for (let part = 1; part <= 8; part++) {
  const hebs = hebrewByPart[part] || [];
  let withEn = 0;
  for (const h of hebs) {
    if (h.segments.some(s => s.en && s.en.trim().length > 0)) withEn++;
  }
  const htmlCount = htmlByPart[part]?.length || 0;
  console.log(`  Part ${part}: ${withEn}/${hebs.length} (${htmlCount} HTML files)`);
}

// Show first 3 matches per part
console.log('\nSample matches:');
for (let part = 1; part <= 8; part++) {
  const samples = matchLog.filter(m => m.part === part).slice(0, 3);
  for (const s of samples) {
    console.log(`  P${s.part}: ${s.html} → ${s.hebrew} (${s.paras}p/${s.segs}s)`);
  }
}

fs.writeFileSync('/root/ajew-org/scripts/align-v4-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log('\nMatch log saved.');
