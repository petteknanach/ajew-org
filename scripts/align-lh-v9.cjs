#!/usr/bin/env node
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

function extractParagraphs(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(content)) !== null) {
    let text = decodeHTML(m[1]).replace(/<[^>]+>/g, '').trim();
    if (text.length >= 20) paragraphs.push(text);
  }
  return paragraphs;
}

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const m = content.match(/<title>(.*?)<\/title>/i);
  return m ? decodeHTML(m[1]) : '';
}

// Extract halachas from HTML file based on h3 sections
function extractHalachasFromHTML(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const sections = [];
  
  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let m;
  
  while ((m = h3Regex.exec(content)) !== null) {
    const headerText = decodeHTML(m[1].replace(/<[^>]+>/g, '')).trim();
    const afterH3 = content.substring(m.index + m[0].length);
    const nextH3Pos = afterH3.search(/<h3/i);
    const sectionContent = nextH3Pos > 0 ? afterH3.substring(0, nextH3Pos) : afterH3;
    
    const paras = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm;
    while ((pm = pRegex.exec(sectionContent)) !== null) {
      let text = decodeHTML(pm[1]).replace(/<[^>]+>/g, '').trim();
      if (text.length >= 20) paras.push(text);
    }
    
    if (paras.length > 0 && headerText.length > 0) {
      sections.push({ header: headerText, paras });
    }
  }
  
  // If no h3 sections, treat whole file as one
  if (sections.length === 0) {
    const paras = extractParagraphs(htmlPath);
    if (paras.length > 0) {
      const title = extractTitle(htmlPath);
      sections.push({ header: title, paras });
    }
  }
  
  return sections;
}

// English to Hebrew name mapping
const engToHeb = {
  'hakdamah': 'הקדמה',
  'hashkamas': 'השכמת',
  'shechitah': 'שחיטה',
  'traifos': 'טריפות',
  'matanos': 'מתנות',
  'aiver': 'אבר',
  'basar': 'בשר',
  'chailev': 'חלב',
  'chelev': 'חלב',
  'dam': 'דם',
  'melichah': 'מליחה',
  'simanei': 'סימני',
  'simanim': 'סימני',
  'dagim': 'דגים',
  'tolaim': 'תולעים',
  'beitzim': 'ביצים',
  'eggs': 'ביצים',
  'taaruvos': 'תערובות',
  'maachalai': 'מאכלי',
  'akum': 'עכו',
  'hechsher': 'הכשר',
  'noasain': 'נותן',
  'yayin': 'יין',
  'nesech': 'נסך',
  'klei': 'כלי',
  'avodas': 'עבודת',
  'elilim': 'אלילים',
  'ribbis': 'רבית',
  'chukkas': 'חוקות',
  'meonayn': 'מעונן',
  'nachash': 'נחש',
  'korcha': 'קרחה',
  'giluach': 'גילוח',
  'niddah': 'נדה',
  'mikvaos': 'מקוואות',
  'nedarim': 'נדרים',
  'shevuos': 'שבועות',
  'kibud': 'כיבוד',
  'kevod': 'כבוד',
  'melamdim': 'מלמדים',
  'tzedakah': 'צדקה',
  'talmud': 'תלמוד',
  'milah': 'מילה',
  'avadim': 'עבדים',
  'geirim': 'גרים',
  'orla': 'ערלה',
  'kilayim': 'כלאים',
  'pidyon': 'פדיון',
  'bechor': 'בכור',
  'peter': 'פטר',
  'chalah': 'חלה',
  'terumos': 'תרומות',
  'reishis': 'ראשית',
  'hagez': 'הגז',
  'pirya': 'פריה',
  'vrivya': 'רביה',
  'ishus': 'אישות',
  'gitin': 'גיטין',
  'yibum': 'יבום',
  'sotah': 'סוטה',
  'kidushin': 'קידושין',
  'oness': 'עונס',
  'kesuvos': 'כתובות',
  'dayonim': 'דיינים',
  'eidus': 'עדות',
  'halvaah': 'הלוואה',
  'toain': 'טוען',
  'gviyas': 'גביית',
  'metzranus': 'מצרנות',
  'shutfin': 'שותפין',
  'shomrim': 'שומרים',
  'schirus': 'שכירות',
  'shomer': 'שומר',
  'sochair': 'שוכר',
  'genavah': 'גניבה',
  'gezelah': 'גזילה',
  'onaah': 'אונאה',
  'mechirah': 'מכירה',
  'matanah': 'מתנה',
  'aveidah': 'אבידה',
  'apitropos': 'אפטרופוס',
  'pikadon': 'פקדון',
  'umnin': 'אומנין',
  'sheilah': 'שאלה',
  'choveil': 'חובל',
  'lo yilbash': 'לא ילבש',
  'netilas': 'נטילת',
  'tzitzis': 'ציצית',
  'tefillin': 'תפילין',
  'bircas': 'ברכת',
  'krias': 'קריאת',
  'nesias': 'נשיאת',
  'beis': 'בית',
  'masa': 'משא',
  'seudah': 'סעודה',
  'shabbos': 'שבת',
  'eruvei': 'עירובי',
  'rosh': 'ראש',
  'pesach': 'פסח',
  'sfiras': 'ספירת',
  'chol': 'חול',
  'tisha': 'תשעה',
};

function matchSection(header, hebTitle) {
  const h = header.toLowerCase();
  const heb = hebTitle.toLowerCase();
  
  // Extract halacha number from header
  const numMatch = h.match(/halacha\s+(\d+)/i);
  const sectionNum = numMatch ? parseInt(numMatch[1]) : 0;
  
  // Extract Hebrew letter number
  const hebLetterMatch = heb.match(/\s+([א-ת])$/);
  const hebLetters = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9 };
  const hebNum = hebLetterMatch ? hebLetters[hebLetterMatch[1]] || 0 : 0;
  
  // Check each English→Hebrew mapping
  for (const [eng, hebWord] of Object.entries(engToHeb)) {
    if (h.includes(eng) && heb.includes(hebWord)) {
      if (sectionNum > 0 && hebNum > 0) {
        return sectionNum === hebNum ? 100 : 50;
      }
      return 80;
    }
  }
  
  // Check if Hebrew title words appear in header
  const hebWords = heb.split(/\s+/).filter(w => w.length >= 3);
  let matchedWords = 0;
  for (const w of hebWords) {
    if (h.includes(w.toLowerCase())) matchedWords++;
  }
  if (hebWords.length > 0 && matchedWords >= 2) {
    return 60;
  }
  
  return 0;
}

function assignEnglish(heb, enParas) {
  for (const seg of heb.segments) seg.en = '';
  if (heb.segCount === 0 || enParas.length === 0) return;
  
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

// Build Hebrew entries
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
      number: t.number, filePath, segments, contentSegs, segCount: contentSegs.length,
    });
  }
}

// Process HTML files
console.log('=== Processing multi-halacha HTML files ===\n');
let totalMatched = 0;
const matchLog = [];

for (const [vol, part] of Object.entries(volToPart)) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  if (!fs.existsSync(volDir)) continue;
  
  const htmlFiles = fs.readdirSync(volDir).filter(f => f.endsWith('.html'));
  const hebList = hebrewByPart[part] || [];
  
  console.log(`Part ${part}: ${htmlFiles.length} HTML files, ${hebList.length} Hebrew entries`);
  
  for (const hf of htmlFiles) {
    const htmlPath = path.join(volDir, hf);
    const sections = extractHalachasFromHTML(htmlPath);
    if (sections.length === 0) continue;
    
    let fileMatched = 0;
    
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
        totalMatched++;
        fileMatched++;
        matchLog.push({ part, hebrew: `#${heb.number} ${heb.title}`, html: hf, section: section.header.substring(0, 30), score: bestScore });
      }
    }
    
    if (fileMatched > 1) console.log(`  ${hf}: ${fileMatched} sections matched`);
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
console.log(`Newly matched: ${totalMatched}`);
console.log(`Coverage: ${filesWithEn}/${totalHeb} (${(filesWithEn/totalHeb*100).toFixed(1)}%)`);

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
  for (const h of (unmatched || []).slice(0, 15)) {
    console.log(`  #${h.number} ${h.title}`);
  }
}

fs.writeFileSync('/root/ajew-org/scripts/align-v9-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
