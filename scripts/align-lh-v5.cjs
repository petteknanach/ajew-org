#!/usr/bin/env node
/**
 * LH English alignment v5 - match by halacha name.
 * 
 * Strategy: For each Hebrew halacha, find the HTML file whose title
 * contains the English equivalent of the Hebrew halacha name.
 * 
 * The Hebrew index has entries like:
 *   #1 הקדמה (Hakdamah)
 *   #2 שחיטה א (Shechitah 1)
 *   #3 שחיטה ב (Shechitah 2)
 * 
 * The HTML files have titles like:
 *   "Shechitah 1", "Shechitah 2", etc.
 * 
 * We match by extracting the halacha name from both and finding the best fit.
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
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? decodeHTML(titleMatch[1]) : '';
}

// Comprehensive Hebrew → English name mapping
// Based on the Shulchan Aruch structure
const hebToEng = {
  // Orach Chaim
  'הקדמה': 'hakdamah',
  'השכמת הבוקר': 'hashkamas haboker',
  'הלכות לבישת בגדים': 'levishas begadim',
  'הלכות הנהגת בית הכסא': 'hinegas beis hakiseh',
  'נטילת ידים שחרית': 'netilas yadayim shacharis',
  'ציצית': 'tzitzis',
  'תפילין': 'tefillin',
  'ברכת השחר': 'bircas hashachar',
  'קריאת שמע': 'krias shema',
  'תפלה': 'tefillah',
  'נשיאת כפים': 'nesias kapayim',
  'קריאת התורה': 'krias hatorah',
  'בית הכנסת': 'beis haknesses',
  'משא ומתן': 'masa umasan',
  'נטילת ידים לסעודה': 'netilas yadayim liseudah',
  'סעודה': 'seudah',
  'ברכת המזון ומים אחרונים': 'bircas hamazon umayim acharonim',
  'ברכת הפרות': 'bircas hapairos',
  'ברכת הריח וברכת הודאה': 'bircas hareiach',
  'ברכת הודאה': 'bircas hodaah',
  'ברכות הראיה ושאר ברכות פרטיות': 'bircas hareiyah',
  'תפלת המנחה': 'tefilas haminchah',
  'תפלת ערבית': 'tefilas arvis',
  'שבת': 'shabbos',
  'עירובי תחומין': 'eruvei techumin',
  'ראש חדש': 'rosh chodesh',
  'הלכות פסח': 'hachos pesach',
  'פסח': 'pesach',
  'ענין ספירת העומר': 'sfiras haomer',
  'ענין שבועות': 'shavuos',
  'חג השבועות': 'chag hashavuos',
  'ענין שבת ויום טוב': 'shabbos vayom tov',
  'חול המועד': 'chol hamoed',
  'תשעה באב ושאר תעניות': 'tisha bav',
  'ראש השנה': 'rosh hashanah',
  'יום הכפורים': 'yom kippur',
  'סוכה': 'sukkah',
  'לולב ואתרוג': 'lulav veesrog',
  'הושענא רבה': 'hoshana rabbah',
  'חנוכה': 'chanukah',
  'ענין ד\' פרשיות': 'arba parshiyos',
  'פורים': 'purim',
  
  // Yoreh Deah
  'שחיטה': 'shechitah',
  'טריפות': 'traifos',
  'מתנות כהונה': 'matanos kehunah',
  'אבר מן החי': 'aiver min hachai',
  'בשר שנתעלם מן העין': 'basar shenisaleim min haayin',
  'חלב ודם': 'chailev vadam',
  'דם': 'dam',
  'מליחה': 'melichah',
  'סימני בהמה וחיה טהורה': 'simanei behemah',
  'דברים היוצאים מן החי': 'dvarim hayotzim',
  'סימני עוף טהור': 'simanim oif tahor',
  'דגים': 'dagim',
  'תולעים': 'tolaim',
  'ביצים': 'beitzim eggs',
  'בשר בחלב': 'basar bachalav',
  'מאכלי עכו"ם': 'maachalai akum',
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
  'שבועות': 'shevuos',
  'כיבוד אב ואם': 'kibud av vaem',
  'כבוד רבו ות"ח': 'kevod rav',
  'מלמדים': 'melamdim',
  'צדקה': 'tzedakah',
  'תלמוד תורה': 'talmud torah',
  'מילה': 'milah',
  'עבדים': 'avadim',
  'גרים': 'geirim',
  'ערלה': 'orla',
  'כלאים': 'kilayim',
  'פדיון בכור': 'pidyon bechor',
  'בכור בהמה טהורה': 'bechor behemah tehorah',
  'פדיון פטר חמור': 'pidyon peter chamor',
  'חלה': 'chalah',
  'תרומות ומעשרות': 'terumos umaasros',
  'ראשית הגז': 'reishis hagez',
  'נידוי וחרם': 'nidui verem',
  'צרעת': 'tzaraas',
  'נגעים': 'nega im',
  'מצורע': 'metzora',
  'טומאת מת': 'tumet met',
  
  // Even HaEzer
  'פריה ורביה והלכות אישות': 'pirya vrivya veishus',
  'אישות': 'ishus',
  'כתובות וגיטין': 'kesuvos vegitin',
  'גיטין': 'gitin',
  'יבום וחליצה': 'yibum vechalitzah',
  'יבום': 'yibum',
  'סוטה': 'sotah',
  'קידושין': 'kidushin',
  'עונס ומפתה': 'oness umefateh',
  
  // Choshen Mishpat
  'דיינים': 'dayonim',
  'עדות': 'eidus',
  'הלוואה': 'halvaah',
  'טוען ונטען': 'toain vnitaan',
  'גביית מלוה': 'gviyas milveh',
  'גביות חוב מהיתומים': 'gviavos chov miyesomim',
  'גביית חוב מהלקוחות והלכות אפותקי': 'gviachov malkuchos',
  'העושה שליח לגבות חובו': 'haoseh shaliach ligvos chovo',
  'כח והרשאה': 'koach veharshaah',
  'שליחות והרשאה': 'shlihus veharshaah',
  'ערב': 'arev',
  'חזקת מטלטלין': 'chezkas metaltelin',
  'חזקת קרקעות': 'chezkas karkaos',
  'נזקי שכנים': 'nizkei shekenim',
  'שותפים בקרקע': 'shitpakim bakarka',
  'חלוקת שותפות': 'chalukas shutafus',
  'מצרנות': 'metzranus',
  'שותפין': 'shutfin',
  'חלוקת שותפים': 'chalukas shutafim',
  'שלוחין': 'shluchin',
  'מכירה': 'mechirah',
  'אונאה': 'onaah',
  'מקח וממכר': 'mekach umemkar',
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
  'חובל בחבירו ושמירת הנפש': 'choveil bachaveiro veshmiras hanefesh',
  'מאבד ממון חבירו ומוסר': 'maaved mamon chaveiro umasur',
  'נזקי ממון': 'nizkei mamon',
};

function getEngName(hebTitle) {
  // Remove trailing Hebrew letter (א, ב, ג, etc.)
  const base = hebTitle.replace(/\s+[א-ת]$/, '').trim();
  
  // Direct lookup
  if (hebToEng[base]) return hebToEng[base];
  
  // Try without the letter suffix
  for (const [heb, eng] of Object.entries(hebToEng)) {
    if (base.startsWith(heb) || heb.startsWith(base)) {
      return eng;
    }
  }
  
  return null;
}

function normalizeForMatch(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/halachos|halacha|hilchos|laws?|of/g, '')
    .replace(/part|section|complete|translation|improved|fixed|v\d+/g, '')
    .replace(/one|two|three|four|five|six|seven|eight|nine|ten/g, '')
    .replace(/\d+/g, '')
    .trim();
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
    
    // Clean title
    let cleanTitle = rawTitle
      .replace(/^Likutay\s+Halachos\s*[—–-]\s*(?:Orach\s+Chaim(?:\s*Vol\.?\s*\d+)?|Yoreh\s+De[^-]*|Even\s+Ha-Ezer|Choshen\s+Mishpat(?:\s*[IVX]+)?|Evven\s+Hu-ezehr)\s*[—–-]\s*/i, '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\s*[—–-]\s*(?:Complete|Translation|Part.*|§.*|Intro.*)\s*$/i, '')
      .replace(/^\d+\s*/, '')
      .trim();
    
    htmlByPart[part].push({ hf, htmlPath, rawTitle, cleanTitle, paras, normTitle: normalizeForMatch(cleanTitle) });
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
    
    const hebrewTitle = t.hebrewTitle || t.title || '';
    const engName = getEngName(hebrewTitle);
    
    hebrewByPart[part].push({
      title: t.title || '',
      hebrewTitle,
      number: t.number,
      filePath, segments, contentSegs,
      segCount: contentSegs.length,
      engName,
      baseHeb: hebrewTitle.replace(/\s+[א-ת]$/, '').trim()
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
  
  console.log(`Part ${part}: ${htmlList.length} HTML, ${hebList.length} Hebrew`);
  
  for (const heb of hebList) {
    if (heb.segments.some(s => s.en && s.en.trim().length > 0)) continue;
    
    let bestHtml = -1;
    let bestScore = 0;
    
    for (let h = 0; h < htmlList.length; h++) {
      if (usedHtml.has(h)) continue;
      
      const html = htmlList[h];
      let score = 0;
      
      // Method 1: Direct English name match
      if (heb.engName) {
        const engLower = heb.engName.toLowerCase();
        const htmlLower = html.cleanTitle.toLowerCase();
        const htmlNorm = html.normTitle;
        const engNorm = normalizeForMatch(engLower);
        
        if (htmlLower.includes(engLower) || htmlNorm.includes(engNorm)) {
          score = 100;
        } else {
          // Word overlap
          const engWords = engLower.split(/\s+/).filter(w => w.length > 2);
          let matched = 0;
          for (const w of engWords) {
            if (htmlLower.includes(w)) matched++;
          }
          if (engWords.length > 0) score = (matched / engWords.length) * 80;
        }
      }
      
      // Method 2: Check if the Hebrew base name appears in the HTML content
      // (some HTML files contain the Hebrew name)
      if (score < 50) {
        try {
          const content = fs.readFileSync(html.htmlPath, 'utf8');
          if (content.includes(heb.baseHeb)) {
            score = Math.max(score, 90);
          }
        } catch(e) {}
      }
      
      // Method 3: Number matching (e.g., "Shechitah 1" → "שחיטה א")
      const htmlNumMatch = html.cleanTitle.match(/(\d+)/);
      const hebNumMatch = heb.title.match(/(\d+)/);
      if (htmlNumMatch && hebNumMatch && htmlNumMatch[1] === hebNumMatch[1]) {
        score = Math.max(score, 30); // Weak signal, only helps break ties
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
        
        matchLog.push({
          part,
          hebrew: `#${heb.number} ${heb.baseHeb}`,
          html: html.hf,
          htmlTitle: html.cleanTitle.substring(0, 40),
          score: Math.round(bestScore)
        });
      }
    }
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
  for (const h of hebs) {
    if (h.segments.some(s => s.en && s.en.trim().length > 0)) withEn++;
  }
  console.log(`  Part ${part}: ${withEn}/${hebs.length}`);
}

// Show unmatched Hebrew files for parts 4, 5, 6
for (const part of [4, 5, 6]) {
  const unmatched = hebrewByPart[part]?.filter(h => !h.segments.some(s => s.en && s.en.trim().length > 0));
  console.log(`\nPart ${part} unmatched (${unmatched?.length || 0}):`);
  for (const h of (unmatched || []).slice(0, 10)) {
    console.log(`  #${h.number} ${h.baseHeb} (eng: ${h.engName || 'N/A'})`);
  }
}

fs.writeFileSync('/root/ajew-org/scripts/align-v5-log.json', JSON.stringify(matchLog, null, 2), 'utf8');
console.log('\nMatch log saved.');
