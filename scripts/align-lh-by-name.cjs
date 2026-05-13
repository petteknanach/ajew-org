#!/usr/bin/env node
/**
 * Match LH HTML translations to Hebrew files by halacha name.
 * The halachos are in Shulchan Aruch order in both the HTML files and the Hebrew index.
 * Strategy: extract the halacha name from each HTML title, then find the matching Hebrew entry.
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

const volToPart = {
  'Likutay Halachos - Orach Chaim - 1': 1,
  'Likutay Halos - Orach Chaim - 2': 2,
  'Likutay Halachos - Orach Chaim - 3': 3,
  'Likutay Halachos - Yoreh Daya - 1': 4,
  'Likutay Halachos - Yoreh Daya - 2': 5,
  'Likutay Halachos - Evven Hu-ezehr': 6,
  'Likutay Halachos - Choshen Mishpat - 1': 7,
  'Likutay Halachos - Choshen Mishpat - 2': 8,
};

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/halachos|halacha|hilchos|hilchos/g, '')
    .replace(/part|section|prayer|intro|complete|translation|improved|fixed/g, '')
    .replace(/one|two|three|four|five|six|seven|eight|nine|ten/g, '')
    .replace(/1|2|3|4|5|6|7|8|9|0/g, '')
    .trim();
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

// Build Hebrew index with normalized names
const hebrewByPart = {};
for (let part = 1; part <= 8; part++) {
  hebrewByPart[part] = [];
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  if (!fs.existsSync(idxFile)) continue;
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  
  for (const t of idx.torahs) {
    const filePath = path.join(pdir, `torah-${t.number}.json`);
    let segments = [];
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      segments = data.segments || [];
    } catch(e) {}
    
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
    
    const title = t.title || '';
    const hebrewTitle = t.hebrewTitle || '';
    
    hebrewByPart[part].push({
      title, hebrewTitle, number: t.number, filePath, segments, contentSegs,
      segCount: contentSegs.length,
      normTitle: normalizeName(title),
      normHebrew: normalizeName(hebrewTitle),
      baseHebName: hebrewTitle.replace(/\s+[א-ת]$/, '').trim()
    });
  }
}

// Build HTML file list with normalized names
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
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const rawTitle = titleMatch ? decodeHTML(titleMatch[1]) : '';
    
    // Clean title: remove "Likutay Halachos — Yoreh De'ah — " prefix
    let cleanTitle = rawTitle
      .replace(/^Likutay\s+Halachos\s*[—–-]\s*(?:Orach\s+Chaim|Yoreh\s+De[^-]*|Even\s+Ha-Ezer|Choshen\s+Mishpat|Evven\s+Hu-ezehr)\s*[—–-]\s*/i, '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\s*[—–-]\s*(?:Complete|Translation|Part.*|§.*)\s*$/i, '')
      .replace(/^\d+\s*/, '')
      .trim();
    
    const paras = extractParagraphs(content);
    const numMatch = hf.match(/^(\d+)/);
    const fileNum = numMatch ? parseInt(numMatch[1]) : 0;
    
    htmlByPart[part].push({
      hf, htmlPath, rawTitle, cleanTitle, paras, fileNum,
      normTitle: normalizeName(cleanTitle)
    });
  }
}

// Now match: for each Hebrew file, find the HTML file with the best name match
console.log('=== Matching by name ===\n');
let totalMatched = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const htmlList = htmlByPart[part] || [];
  const hebList = hebrewByPart[part] || [];
  const usedHtml = new Set();
  
  console.log(`Part ${part}: ${htmlList.length} HTML, ${hebList.length} Hebrew`);
  
  for (const heb of hebList) {
    // Check if already has English
    const hasEn = heb.segments.some(s => s.en && s.en.trim().length > 0);
    if (hasEn) continue;
    
    let bestHtml = -1;
    let bestScore = 0;
    
    for (let h = 0; h < htmlList.length; h++) {
      if (usedHtml.has(h)) continue;
      
      const html = htmlList[h];
      let score = 0;
      
      // Extract the base halacha name from the Hebrew entry
      // e.g., "בשר שנתעלם מן העין ג" → base is "בשר שנתעלם מן העין"
      // The HTML filename contains the English name
      
      // Try matching by extracting key terms
      const hebBase = heb.baseHebName;
      const engEquivalent = getEnglishEquivalent(hebBase);
      
      if (engEquivalent) {
        const htmlLower = html.cleanTitle.toLowerCase();
        const engLower = engEquivalent.toLowerCase();
        
        // Check if the English equivalent appears in the HTML title
        if (htmlLower.includes(engLower)) {
          score = 100;
        } else {
          // Check word overlap
          const engWords = engLower.split(/\s+/).filter(w => w.length > 3);
          let matchedWords = 0;
          for (const w of engWords) {
            if (htmlLower.includes(w)) matchedWords++;
          }
          if (engWords.length > 0) {
            score = (matchedWords / engWords.length) * 50;
          }
        }
      }
      
      // Also try matching by the English title from the Hebrew entry
      const hebEngTitle = heb.title.toLowerCase();
      const htmlLower = html.cleanTitle.toLowerCase();
      
      // Direct word overlap between Hebrew's English title and HTML title
      const engWords = hebEngTitle.split(/\s+/).filter(w => w.length > 3 && !/^(part|section|halacha|hilchos)$/i.test(w));
      let matchedWords = 0;
      for (const w of engWords) {
        if (htmlLower.includes(w)) matchedWords++;
      }
      if (engWords.length > 0) {
        const overlapScore = (matchedWords / engWords.length) * 80;
        if (overlapScore > score) score = overlapScore;
      }
      
      // Bonus for file number proximity (files in the same area of the volume)
      // Hebrew files are numbered 1-N, HTML files have number prefixes
      // This is a weak signal but can help break ties
      
      if (score > bestScore) {
        bestScore = score;
        bestHtml = h;
      }
    }
    
    if (bestHtml >= 0 && bestScore > 20) {
      const html = htmlList[bestHtml];
      usedHtml.add(bestHtml);
      
      // Assign English
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
        
        matchLog.push({
          part,
          hebrew: `${heb.number}. ${heb.baseHebName}`,
          html: html.hf,
          htmlTitle: html.cleanTitle.substring(0, 40),
          score: Math.round(bestScore)
        });
      }
    }
  }
}

console.log(`\nNewly matched: ${totalMatched}`);

// Show matches for parts 4, 5, 6
for (const part of [4, 5, 6]) {
  console.log(`\nPart ${part} matches:`);
  for (const m of matchLog.filter(m => m.part === part)) {
    console.log(`  ${m.html} → ${m.hebrew} (score: ${m.score})`);
    console.log(`    HTML title: ${m.htmlTitle}`);
  }
}

// Count total coverage
let filesWithEn = 0, totalHeb = 0;
for (let part = 1; part <= 8; part++) {
  for (const heb of hebrewByPart[part] || []) {
    totalHeb++;
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) filesWithEn++;
  }
}
console.log(`\nTotal coverage: ${filesWithEn}/${totalHeb} (${(filesWithEn/totalHeb*100).toFixed(1)}%)`);

function getEnglishEquivalent(hebBase) {
  // Map Hebrew base names to English equivalents
  const map = {
    'הקדמה': 'hakdamah',
    'שחיטה': 'shechitah',
    'טריפות': 'traifos',
    'מתנות כהונה': 'matanos kehunah',
    'אבר מן החי': 'aiver min hachai',
    'בשר שנתעלם מן העין': 'basar shenisaleim',
    'חלב ודם': 'chailev vadam',
    'דם': 'dam',
    'מליחה': 'melichah',
    'סימני בהמה וחיה': 'simanei behemah',
    'דברים היוצאים מן החי': 'dvarim hayotzim',
    'סימני עוף טהור': 'simanim oif tahor',
    'דגים': 'dagim',
    'תולעים': 'tolaim worms',
    'ביצים': 'eggs beitzim',
    'בשר בחלב': 'basar bachalav',
    'טהרות': 'taharos',
    'הכשר כלים': 'hechsher keilim',
    'נותן טעם לפגם': 'noasain taam lifgam',
    'יין נסך': 'yayin nesech',
    'כלי היין': 'klei hayayin',
    'עבודת אלילים': 'avodas elilim',
    'רבית': 'ribbis',
    'חוקות העכו"ם': 'chukkas haakum',
    'מעונן ומנחש': 'meonayn unachash',
    'קרחה וכתובת קעקע': 'korcha uketovet kaaka',
    'גילוח': 'giluach shaving',
    'נדה': 'niddah',
    'מקוואות': 'mikvaos',
    'נדרים ושבועות': 'nedarim veshevuos',
    'כיבוד אב ואם': 'kibud av vaem',
    'כבוד רבו ות"ח': 'kevod rav',
    'מלמדים': 'melamdim',
    'צדקה': 'tzedakah',
    'מילה': 'milah',
    'עבדים': 'avadim',
    'גרים': 'geirim',
    'ערלה': 'orla',
    'כלאים': 'kilayim',
    'בכור בהמה טהורה': 'bechor behemah tehorah',
    'פדיון בכור': 'pidyon bechor',
    'פדיון פטר חמור': 'pidyon peter chamor',
    'חלה': 'chalah',
    'תרומות ומעשרות': 'terumos umaasros',
    'ראשית הגז': 'reishis hagez',
    'נידוי וחרם': 'nidui verem',
    'צרעת': 'tzaraas',
    'נגעים': 'nega im',
    'מצורע': 'metzora',
    'טומאת מת': 'tumet met',
    'פריה וריביה והלכות אישות': 'pirya vrivya veishus',
    'אישות': 'ishus',
    'כתובות וגיטין': 'kesuvos vegitin',
    'גיטין': 'gitin',
    'יבום וחליצה': 'yibum vechalitzah',
    'יבום': 'yibum',
    'סוטה': 'sotah',
    'קידושין': 'kidushin',
    'עונס ומפתה': 'oness umefateh',
    'אונאה': 'onaah',
    'מכירה': 'mechirah',
    'שלוחין': 'shluchin',
    'שותפין': 'shutfin',
    'חבירות וקבלנות': 'chavirus vkablanus',
    'דיינים': 'dayonim',
    'עדות': 'eidus',
    'הלוואה': 'halvaah',
    'טוען ונטען': 'toain vnitaan',
    'גביית מלוה': 'gviyas milveh',
    'גביות חוב מהיתומים': 'gviavos chov miyesomim',
    'גביית חוב מהלקוחות': 'gviachov malkuchos',
    'כח והרשאה': 'koach veharshaah',
    'שליחות והרשאה': 'shlihus veharshaah',
    'ערב': 'arev',
    'חזקת מטלטלין': 'chezkas metaltelin',
    'חזקת קרקעות': 'chezkas karkaos',
    'נזקי שכנים': 'nizkei shekenim',
    'שותפים בקרקע': 'shitpakim bakarka',
    'מצרנות': 'metzranus',
    'העושה שליח לגבות חובו': 'haoseh shaliach ligvos chovo',
    'מתנה': 'matanah',
    'אבידה ומציאה': 'aveidah umetziah',
    'פריקה וטעינה': 'prika vetiena',
    'הפקר ונכסי הגר': 'hefker vnikshay hager',
    'נחלות': 'nachalos',
    'אפטרופוס': 'apitropos',
    'פקדון וד\' שומרים': 'pikadon veshomrim',
    'אומנין': 'umnin',
    'שכירות פועלים': 'schirus poalim',
    'חכירות וקבלנות': 'chakirus vkablanus',
    'שומר שכר': 'shomer sachar',
    'שוכר': 'sochair',
    'שאלה': 'sheilah',
    'גניבה': 'genavah',
    'גזילה': 'gezelah',
    'חובל בחבירו': 'choveil bachaveiro',
    'מאבד ממון חבירו ומוסר': 'maaved mamon chaveiro umasur',
    'נזקי ממון': 'nizkei mamon',
  };
  
  return map[hebBase] || '';
}
