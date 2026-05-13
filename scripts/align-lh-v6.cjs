#!/usr/bin/env node
/**
 * LH English alignment v6 - match by extracting halacha name+number from HTML titles.
 * For each HTML file, extract the halacha name and number, then find the matching Hebrew entry.
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

function extractTitle(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const m = content.match(/<title>(.*?)<\/title>/i);
  return m ? decodeHTML(m[1]) : '';
}

// Hebrew letter to number mapping
const hebLetters = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10 };

// English name extraction from HTML title
function extractHalachaInfo(htmlTitle) {
  // Remove volume prefix
  let clean = htmlTitle
    .replace(/^Likutay\s+Halachos\s*[—–-]\s*(?:Orach\s+Chaim(?:\s*Vol\.?\s*\d+)?|Yoreh\s+De[^-]*|Even\s+Ha-Ezer|Choshen\s+Mishpat(?:\s*[IVX]+)?|Evven\s+Hu-ezehr)\s*[—–-]\s*/i, '')
    .trim();
  
  // Extract number from end: "Shechitah 1" → name="Shechitah", num=1
  // Also handle "Shechitah Aleph" → num=1
  let name = clean;
  let num = 0;
  
  const numMatch = clean.match(/\s+(\d+)\s*$/);
  if (numMatch) {
    num = parseInt(numMatch[1]);
    name = clean.replace(/\s+\d+\s*$/, '').trim();
  }
  
  // Remove parenthetical descriptions
  name = name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  
  return { name: name.toLowerCase(), num, raw: clean };
}

// Map English halacha names to Hebrew patterns
function nameMatches(hebTitle, engName, engNum) {
  const hebBase = hebTitle.replace(/\s+[א-ת]$/, '').trim();
  const hebLetter = hebTitle.match(/\s+([א-ת])$/);
  const hebNum = hebLetter ? hebLetters[hebLetter[1]] : 0;
  
  // Direct name matching using common translations
  const translations = {
    'hakdamah': ['הקדמה'],
    'hashkamas haboker': ['השכמת הבוקר'],
    'shechitah': ['שחיטה'],
    'traifos': ['טריפות'],
    'matanos kehunah': ['מתנות כהונה'],
    'aiver min hachai': ['אבר מן החי'],
    'basar shenisaleim': ['בשר שנתעלם'],
    'chailev vadam': ['חלב ודם'],
    'chelev vadam': ['חלב ודם'],
    'dam': ['דם'],
    'melichah': ['מליחה'],
    'simanei behemah': ['סימני בהמה'],
    'simanim oif tahor': ['סימני עוף'],
    'simanim oif': ['סימני עוף'],
    'dagim': ['דגים'],
    'tolaim': ['תולעים'],
    'beitzim': ['ביצים'],
    'basar bachalav': ['בשר בחלב'],
    'taaruvos': ['תערובות'],
    'maachalai akum': ['מאכלי עכו'],
    'hechsher keilim': ['הכשר כלים'],
    'noasain taam lifgam': ['נותן טעם לפגם'],
    'yayin nesech': ['יין נסך'],
    'klei hayayin': ['כלי היין'],
    'avodas elilim': ['עבודת אלילים'],
    'ribbis': ['רבית'],
    'chukkas haakum': ['חוקות העכו'],
    'meonayn': ['מעונן'],
    'korcha': ['קרחה'],
    'giluach': ['גילוח'],
    'niddah': ['נדה'],
    'mikvaos': ['מקוואות'],
    'nedarim': ['נדרים'],
    'shevuos': ['שבועות'],
    'kibud av': ['כיבוד אב'],
    'kevod rav': ['כבוד רבו'],
    'melamdim': ['מלמדים'],
    'tzedakah': ['צדקה'],
    'talmud torah': ['תלמוד תורה'],
    'milah': ['מילה'],
    'avadim': ['עבדים'],
    'geirim': ['גרים'],
    'orla': ['ערלה'],
    'kilayim': ['כלאים'],
    'pidyon bechor': ['פדיון בכור'],
    'pidyon peter chamor': ['פדיון פטר חמור'],
    'chalah': ['חלה'],
    'terumos': ['תרומות'],
    'reishis hagez': ['ראשית הגז'],
    'pirya vrivya': ['פריה ורביה'],
    'ishus': ['אישות'],
    'gitin': ['גיטין'],
    'yibum': ['יבום'],
    'sotah': ['סוטה'],
    'kidushin': ['קידושין'],
    'oness': ['עונס'],
    'kesuvos': ['כתובות'],
    'dayonim': ['דיינים'],
    'eidus': ['עדות'],
    'halvaah': ['הלוואה'],
    'toain vnitaan': ['טוען ונטען'],
    'gviyas milveh': ['גביית מלוה'],
    'gviavos chov': ['גביות חוב'],
    'metzranus': ['מצרנות'],
    'shutfin': ['שותפין'],
    'shomrim': ['שומרים'],
    'schirus poalim': ['שכירות פועלים'],
    'shomer sachar': ['שומר שכר'],
    'sochair': ['שוכר'],
    'genavah': ['גניבה'],
    'gezelah': ['גזילה'],
    'onaah': ['אונאה'],
    'mechirah': ['מכירה'],
    'matanah': ['מתנה'],
    'aveidah': ['אבידה'],
    'apitropos': ['אפטרופוס'],
    'pikadon': ['פקדון'],
    'umnin': ['אומנין'],
    'sheilah': ['שאלה'],
    'choveil': ['חובל'],
    'lo yilbash': ['לא ילבש'],
    'tzaraas': ['צרעת'],
    'nega im': ['נגעים'],
    'metzora': ['מצורע'],
    'tumet met': ['טומאת מת'],
    'masa umasan': ['משא ומתן'],
    'netilas yadayim': ['נטילת ידים'],
    'tzitzis': ['ציצית'],
    'tefillin': ['תפילין'],
    'bircas hashachar': ['ברכת השחר'],
    'krias shema': ['קריאת שמע'],
    'tefillah': ['תפלה'],
    'nesias kapayim': ['נשיאת כפים'],
    'krias hatorah': ['קריאת התורה'],
    'beis haknesses': ['בית הכנסת'],
  };
  
  engName = engName.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  
  // Check direct translation
  for (const [eng, hebs] of Object.entries(translations)) {
    if (engName.includes(eng) || eng.includes(engName)) {
      for (const heb of hebs) {
        if (hebBase.includes(heb) || heb.includes(hebBase)) {
          // Check number match
          if (engNum > 0 && hebNum > 0) {
            return engNum === hebNum ? 100 : 30;
          }
          return 80;
        }
      }
    }
  }
  
  // Fallback: check if any English word appears in the Hebrew title (weak)
  const engWords = engName.split(/\s+/).filter(w => w.length > 3);
  for (const w of engWords) {
    // Check if the Hebrew title contains this English word (unlikely but possible)
    if (hebTitle.toLowerCase().includes(w)) return 20;
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

// Build HTML entries by part
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
    const rawTitle = extractTitle(htmlPath);
    const paras = extractParagraphs(htmlPath);
    if (paras.length === 0) continue;
    
    const info = extractHalachaInfo(rawTitle);
    htmlByPart[part].push({ hf, htmlPath, rawTitle, paras, info });
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
      title: t.title || '',
      hebrewTitle: t.hebrewTitle || '',
      number: t.number,
      filePath, segments, contentSegs,
      segCount: contentSegs.length,
    });
  }
}

// Match by name
console.log('=== Matching by halacha name ===\n');
let totalMatched = 0;
const matchLog = [];

for (let part = 1; part <= 8; part++) {
  const htmlList = htmlByPart[part] || [];
  const hebList = hebrewByPart[part] || [];
  const usedHtml = new Set();
  
  let partMatched = 0;
  
  for (const heb of hebList) {
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) continue;
    
    let bestHtml = -1;
    let bestScore = 0;
    
    for (let h = 0; h < htmlList.length; h++) {
      if (usedHtml.has(h)) continue;
      
      const html = htmlList[h];
      const score = nameMatches(heb.hebrewTitle, html.info.name, html.info.num);
      
      if (score > bestScore) {
        bestScore = score;
        bestHtml = h;
      }
    }
    
    if (bestHtml >= 0 && bestScore >= 30) {
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
          htmlTitle: html.info.raw.substring(0, 40),
          score: bestScore
        });
      }
    }
  }
  
  console.log(`Part ${part}: ${partMatched} newly matched (${htmlList.length} HTML, ${hebList.length} Hebrew)`);
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

// Show unmatched for parts 4, 5, 6
for (const part of [4, 5, 6]) {
  const unmatched = hebrewByPart[part]?.filter(h => !h.segments.some(s => s.en && s.en.trim().length > 0));
  console.log(`\nPart ${part} unmatched (${unmatched?.length || 0}):`);
  for (const h of (unmatched || []).slice(0, 15)) {
    console.log(`  #${h.number} ${h.hebrewTitle}`);
  }
}
