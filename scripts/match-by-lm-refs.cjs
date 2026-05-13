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
    .replace(/&rsquo;/g, "'").replace(/&x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractLMRefs(text) {
  const refs = new Set();
  // Match patterns like "LM I:181", "Likutay Moharan I:181", "LM II:12", etc.
  const regex = /(?:LM|Likutay\s+Moharan)\s+([IVX]+):(\d+)/gi;
  let m;
  while ((m = regex.exec(text)) !== null) {
    refs.add(`${m[1]}:${m[2]}`);
  }
  return refs;
}

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? decodeHTML(titleMatch[1]) : '';
}

// Build HTML index with LM refs for parts 4, 5, 6
const volToPart = {
  'Likutay Halachos - Yoreh Daya - 1': 4,
  'Likutay Halachos - Yoreh Daya - 2': 5,
  'Likutay Halachos - Evven Hu-ezehr': 6,
};

const htmlByPart = {};
const volumes = fs.readdirSync(TRANSLATIONS_BASE).filter(f => fs.statSync(path.join(TRANSLATIONS_BASE, f)).isDirectory());

for (const vol of volumes) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const part = volToPart[vol];
  if (!part) continue;
  if (!htmlByPart[part]) htmlByPart[part] = [];
  
  const files = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort();
  
  for (const hf of files) {
    const htmlPath = path.join(volDir, hf);
    const content = fs.readFileSync(htmlPath, 'utf8');
    const title = extractTitle(htmlPath);
    const refs = extractLMRefs(content);
    
    // Count paragraphs
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let paras = 0;
    let m;
    while ((m = pRegex.exec(content)) !== null) {
      let text = m[1].replace(/<[^>]+>/g, '').trim();
      if (text.length >= 20) paras++;
    }
    
    htmlByPart[part].push({ hf, htmlPath, title: title.substring(0, 60), refs, paras, content });
  }
}

// Build Hebrew index with LM refs for parts 4, 5, 6
const hebrewByPart = {};
for (const part of [4, 5, 6]) {
  hebrewByPart[part] = [];
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of idx.torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const segments = data.segments || [];
    
    let allText = '';
    for (const seg of segments) {
      allText += ' ' + (seg.he || '') + ' ' + (seg.he_nikud || '');
    }
    const refs = extractLMRefs(allText);
    
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
      segCount: contentSegs.length,
      refs,
      hasEn: data.segments.some(s => s.en && s.en.trim().length > 0)
    });
  }
}

// Now match: for each Hebrew file, find the HTML file with the most shared LM refs
console.log('=== Matching by LM references ===\n');

let totalMatched = 0;
const matchLog = [];

for (const part of [4, 5, 6]) {
  const htmlList = htmlByPart[part] || [];
  const hebList = hebrewByPart[part] || [];
  
  console.log(`Part ${part}: ${htmlList.length} HTML, ${hebList.length} Hebrew`);
  
  // For each Hebrew file, find best HTML match
  const usedHtml = new Set();
  
  for (const heb of hebList) {
    if (heb.hasEn) continue; // Already has English
    
    let bestHtml = null;
    let bestScore = 0;
    
    for (let h = 0; h < htmlList.length; h++) {
      if (usedHtml.has(h)) continue;
      
      const html = htmlList[h];
      
      // Score by shared LM refs
      let score = 0;
      for (const ref of heb.refs) {
        if (html.refs.has(ref)) score += 10;
      }
      
      // Bonus for similar paragraph count
      if (heb.segCount > 0 && html.paras > 0) {
        const ratio = Math.min(html.paras, heb.segCount) / Math.max(html.paras, heb.segCount);
        score += ratio * 3;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestHtml = h;
      }
    }
    
    if (bestHtml !== null && bestScore > 0) {
      const html = htmlList[bestHtml];
      usedHtml.add(bestHtml);
      
      // Assign English
      for (const seg of heb.segments) seg.en = '';
      
      const enParas = html.content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
      const cleanParas = [];
      for (const p of enParas) {
        let text = p.replace(/<[^>]+>/g, '').trim();
        if (text.length >= 20) cleanParas.push(text);
      }
      
      if (cleanParas.length > 0 && heb.segCount > 0) {
        if (cleanParas.length >= heb.segCount) {
          const ratio = cleanParas.length / heb.segCount;
          for (let s = 0; s < heb.segCount; s++) {
            const start = Math.round(s * ratio);
            const end = Math.round((s + 1) * ratio);
            heb.segments[heb.contentSegs[s]].en = cleanParas.slice(start, end).join('\n\n');
          }
        } else {
          const ratio = heb.segCount / cleanParas.length;
          for (let e = 0; e < cleanParas.length; e++) {
            const sStart = Math.round(e * ratio);
            const sEnd = Math.round((e + 1) * ratio);
            for (let s = sStart; s < sEnd && s < heb.segCount; s++) {
              heb.segments[heb.contentSegs[s]].en = cleanParas[e];
            }
          }
        }
        
        fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
        totalMatched++;
        
        matchLog.push({
          part,
          hebrew: `${heb.number}. ${heb.title}`,
          html: html.hf,
          score: bestScore,
          sharedRefs: [...heb.refs].filter(r => html.refs.has(r)).length
        });
      }
    }
  }
}

console.log(`\nNewly matched: ${totalMatched} files`);
console.log('\nMatches:');
for (const m of matchLog) {
  console.log(`  P${m.part}: ${m.html} → ${m.hebrew} (score: ${m.score}, shared refs: ${m.sharedRefs})`);
}
