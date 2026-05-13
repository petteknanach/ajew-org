#!/usr/bin/env node
/**
 * LH English alignment FINAL - two-pass approach.
 * Pass 1: Sequential 1:1 matching (handles simple 1:1 cases)
 * Pass 2: Parse multi-halacha HTML files to fill remaining gaps
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
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"')
    .replace(/&#x27;/g, "'").replace(/&#x2014;/g, '—').replace(/&#x2013;/g, '–')
    .replace(/&#x2018;/g, "'").replace(/&#x2019;/g, "'")
    .replace(/&#x201C;/g, '"').replace(/&#x201D;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractParagraphsFromContent(content) {
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(content)) !== null) {
    let text = decodeHTML(m[1]).replace(/<[^>]+>/g, '').trim();
    if (text.length >= 20) paragraphs.push(text);
  }
  return paragraphs;
}

function assignEnglish(heb, enParas) {
  if (heb.segCount === 0 || enParas.length === 0) return;
  
  for (const seg of heb.segments) seg.en = '';
  
  if (enParas.length >= heb.segCount) {
    const ratio = enParas.length / heb.segCount;
    for (let s = 0; s < heb.segCount; s++) {
      const start = Math.round(s * ratio);
      const end = Math.round((s + 1) * ratio);
      heb.segments[heb.contentSegs[s]].en = enParas.slice(start, end).join('\n\n');
    }
  } else {
    const ratio = heb.segCount / enParas.length;
    for (let e = 0; e < enParas.length; e++) {
      const sStart = Math.round(e * ratio);
      const sEnd = Math.round((e + 1) * ratio);
      for (let s = sStart; s < sEnd && s < heb.segCount; s++) {
        heb.segments[heb.contentSegs[s]].en = enParas[e];
      }
    }
  }
}

const engToHeb = {
  'hakdamah': 'הקדמה', 'hashkamas': 'השכמת', 'shechitah': 'שחיטה',
  'traifos': 'טריפות', 'matanos': 'מתנות', 'aiver': 'אבר',
  'basar': 'בשר', 'chailev': 'חלב', 'chelev': 'חלב', 'dam': 'דם',
  'melichah': 'מליחה', 'simanei': 'סימני', 'simanim': 'סימני',
  'dagim': 'דגים', 'tolaim': 'תולעים', 'beitzim': 'ביצים',
  'eggs': 'ביצים', 'taaruvos': 'תערובות', 'maachalai': 'מאכלי',
  'hechsher': 'הכשר', 'noasain': 'נותן', 'yayin': 'יין',
  'nesech': 'נסך', 'klei': 'כלי', 'avodas': 'עבודת', 'elilim': 'אלילים',
  'ribbis': 'רבית', 'chukkas': 'חוקות', 'meonayn': 'מעונן',
  'korcha': 'קרחה', 'giluach': 'גילוח', 'niddah': 'נדה',
  'mikvaos': 'מקוואות', 'nedarim': 'נדרים', 'shevuos': 'שבועות',
  'kibud': 'כיבוד', 'kevod': 'כבוד', 'melamdim': 'מלמדים',
  'tzedakah': 'צדקה', 'talmud': 'תלמוד', 'milah': 'מילה',
  'avadim': 'עבדים', 'geirim': 'גרים', 'orla': 'ערלה',
  'kilayim': 'כלאים', 'pidyon': 'פדיון', 'bechor': 'בכור',
  'peter': 'פטר', 'sefer torah': 'ספר תורה', 'chalah': 'חלה',
  'terumos': 'תרומות', 'reishis': 'ראשית', 'pirya': 'פריה',
  'ishus': 'אישות', 'gitin': 'גיטין', 'yibum': 'יבום',
  'sotah': 'סוטה', 'kidushin': 'קידושין', 'oness': 'עונס',
  'kesuvos': 'כתובות', 'dayonim': 'דיינים', 'eidus': 'עדות',
  'halvaah': 'הלוואה', 'toain': 'טוען', 'metzranus': 'מצרנות',
  'shutfin': 'שותפין', 'genavah': 'גניבה', 'gezelah': 'גזילה',
  'onaah': 'אונאה', 'matanah': 'מתנה', 'aveidah': 'אבידה',
  'apitropos': 'אפטרופוס', 'pikadon': 'פקדון', 'umnin': 'אומנין',
  'choveil': 'חובל', 'lo yilbash': 'לא ילבש', 'tzitzis': 'ציצית',
  'tefillin': 'תפילין', 'krias': 'קריאת', 'nesias': 'נשיאת',
  'beis': 'בית', 'masa umasan': 'משא ומתן', 'shabbos': 'שבת',
  'rosh chodesh': 'ראש חדש', 'pesach': 'פסח', 'purim': 'פורים',
};

function matchSection(header, hebTitle) {
  const h = header.toLowerCase();
  const heb = hebTitle.toLowerCase();
  
  const numMatch = h.match(/halacha\s+(\d+)/i);
  const sectionNum = numMatch ? parseInt(numMatch[1]) : 0;
  
  const hebLetterMatch = heb.match(/\s+([א-ת])$/);
  const hebLetters = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7 };
  const hebNum = hebLetterMatch ? hebLetters[hebLetterMatch[1]] || 0 : 0;
  
  for (const [eng, hebWord] of Object.entries(engToHeb)) {
    if (h.includes(eng) && heb.includes(hebWord)) {
      if (sectionNum > 0 && hebNum > 0) {
        return sectionNum === hebNum ? 100 : 40;
      }
      return 75;
    }
  }
  return 0;
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

// Load Hebrew entries (with existing English)
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
      number: t.number, filePath, segments, contentSegs, segCount: contentSegs.length,
    });
  }
}

// PASS 1: Sequential 1:1 matching
console.log('=== PASS 1: Sequential 1:1 matching ===\n');
let pass1Matched = 0;

for (const [vol, part] of Object.entries(volToPart)) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  if (!fs.existsSync(volDir)) continue;
  
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html')).sort((a, b) => {
    const na = parseInt(a.match(/^(\d+)/)?.[1] || '0');
    const nb = parseInt(b.match(/^(\d+)/)?.[1] || '0');
    return na !== nb ? na - nb : a.localeCompare(b);
  });
  
  const hebList = hebrewByPart[part] || [];
  const minLen = Math.min(htmlFiles.length, hebList.length);
  
  for (let i = 0; i < minLen; i++) {
    const heb = hebList[i];
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) continue;
    
    const htmlPath = path.join(volDir, htmlFiles[i]);
    const content = fs.readFileSync(htmlPath, 'utf8');
    const paras = extractParagraphsFromContent(content);
    
    if (paras.length > 0 && heb.segCount > 0) {
      assignEnglish(heb, paras);
      fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
      pass1Matched++;
    }
  }
  
  console.log(`Part ${part}: ${pass1Matched} matched so far`);
}

// PASS 2: Multi-halacha HTML parsing for remaining gaps
console.log('\n=== PASS 2: Multi-halacha HTML parsing ===\n');
let pass2Matched = 0;

for (const [vol, part] of Object.entries(volToPart)) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  if (!fs.existsSync(volDir)) continue;
  
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  const hebList = hebrewByPart[part] || [];
  
  for (const hf of htmlFiles) {
    const htmlPath = path.join(volDir, hf);
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract h3 sections
    const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    const sections = [];
    let m;
    
    while ((m = h3Regex.exec(content)) !== null) {
      const header = decodeHTML(m[1].replace(/<[^>]+>/g, '')).trim();
      const after = content.substring(m.index + m[0].length);
      const nextPos = after.search(/<h3/i);
      const sectionContent = nextPos > 0 ? after.substring(0, nextPos) : after;
      const paras = extractParagraphsFromContent(sectionContent);
      
      if (paras.length > 0 && header.length > 0) {
        sections.push({ header, paras });
      }
    }
    
    if (sections.length <= 1) continue; // Skip single-section files (already handled in pass 1)
    
    for (const section of sections) {
      let bestHeb = -1;
      let bestScore = 0;
      
      for (let h = 0; h < hebList.length; h++) {
        const heb = hebList[h];
        if (heb.segments.some(s => s.en && s.en.trim().length > 0)) continue;
        
        const score = matchSection(section.header, heb.title);
        if (score > bestScore) { bestScore = score; bestHeb = h; }
      }
      
      if (bestHeb >= 0 && bestScore >= 50) {
        const heb = hebList[bestHeb];
        assignEnglish(heb, section.paras);
        fs.writeFileSync(heb.filePath, JSON.stringify(heb, null, 2), 'utf8');
        pass2Matched++;
      }
    }
  }
  
  console.log(`Part ${part}: ${pass2Matched} additional matches from multi-halacha files`);
}

// Count coverage
let filesWithEn = 0, totalHeb = 0;
for (let part = 1; part <= 8; part++) {
  for (const heb of hebrewByPart[part] || []) {
    totalHeb++;
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) filesWithEn++;
  }
}

console.log(`\n=== FINAL RESULTS ===`);
console.log(`Pass 1 (sequential): ${pass1Matched}`);
console.log(`Pass 2 (multi-halacha): ${pass2Matched}`);
console.log(`Total coverage: ${filesWithEn}/${totalHeb} (${(filesWithEn/totalHeb*100).toFixed(1)}%)`);

for (let part = 1; part <= 8; part++) {
  const hebs = hebrewByPart[part] || [];
  let withEn = 0;
  for (const h of hebs) if (h.segments.some(s => s.en && s.en.trim().length > 0)) withEn++;
  console.log(`  Part ${part}: ${withEn}/${hebs.length}`);
}

// Unmatched for 4, 5, 6
for (const part of [4, 5, 6]) {
  const unmatched = hebrewByPart[part]?.filter(h => !h.segments.some(s => s.en && s.en.trim().length > 0));
  console.log(`\nPart ${part} unmatched (${unmatched?.length || 0}):`);
  for (const h of (unmatched || []).slice(0, 20)) {
    console.log(`  #${h.number} ${h.title}`);
  }
}
