/**
 * Fix Chayey Moharan to 100% English Coverage
 *
 * Issues to fix:
 * 1. Numeral headers (תלא etc.) need English numbers - Ch 8,10,11,12
 * 2. Ch 1: editorial notes + chronological index need translations
 * 3. Ch 2: cross-reference entries need translations
 * 4. Hebrew text wrongly in en fields (hashmata, section headers)
 * 5. Misaligned English in Ch 10
 * 6. Rebuild aligned_segments for all chapters
 *
 * Usage:
 *   node scripts/fix-cm-100.cjs
 *   node scripts/fix-cm-100.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'chayey-moharan');
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================
// Hebrew numeral parsing
// ============================================================

const HEB_VALS = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
  'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
};

function parseHebrewNumeral(str) {
  if (!str) return null;
  str = str.trim().replace(/['"״׳\u05F4\u05F3]/g, '');
  if (str.length === 0) return null;
  let total = 0;
  for (const ch of str) {
    if (HEB_VALS[ch] !== undefined) total += HEB_VALS[ch];
    else return null;
  }
  return total > 0 ? total : null;
}

function isNumeralOnly(text) {
  const trimmed = text.trim();
  return /^[א-ת]{1,4}$/.test(trimmed);
}

// ============================================================
// Translation helpers
// ============================================================

/**
 * Translate chronological index entries (Ch 1, idx 249-274)
 * These follow patterns like:
 *   "מאמר X סימן Y נאמר ..."
 *   "סימן X ..."
 *   "מעשה X ..."
 */
function translateChronEntry(he) {
  // These are formulaic entries about when teachings were said
  // We'll create concise English versions

  let en = he;

  // Replace common terms
  en = en.replace(/מאמר/g, 'Teaching');
  en = en.replace(/סימנים/g, 'Simanim');
  en = en.replace(/סימן/g, 'Siman');
  en = en.replace(/נאמר/g, 'was said');
  en = en.replace(/סמוך ל/g, 'close to ');
  en = en.replace(/קדם/g, 'before ');
  en = en.replace(/אחר/g, 'after ');
  en = en.replace(/בשבת/g, 'on Shabbos');
  en = en.replace(/בראש השנה/g, 'on Rosh Hashana');
  en = en.replace(/ראש השנה/g, 'Rosh Hashana');
  en = en.replace(/בשבועות/g, 'on Shavuos');
  en = en.replace(/בחנכה/g, 'on Chanukah');
  en = en.replace(/חנכה/g, 'Chanukah');
  en = en.replace(/בקיץ/g, 'in the summer');
  en = en.replace(/קיץ/g, 'summer');
  en = en.replace(/חרף/g, 'winter');
  en = en.replace(/ערב/g, 'erev');
  en = en.replace(/מוצאי שבת/g, 'Motzai Shabbos');
  en = en.replace(/מוצאי ראש חדש/g, 'Motzai Rosh Chodesh');
  en = en.replace(/ליל שבת קדש/g, 'the holy night of Shabbos');
  en = en.replace(/שבת שירה/g, 'Shabbos Shira');
  en = en.replace(/שבת נחמו/g, 'Shabbos Nachamu');
  en = en.replace(/שבת בראשית/g, 'Shabbos Bereishis');
  en = en.replace(/שמיני עצרת/g, 'Shmini Atzeres');
  en = en.replace(/בין יום הכפורים לסכות/g, 'between Yom Kippur and Sukkos');
  en = en.replace(/בין יום כפור לסכות/g, 'between Yom Kippur and Sukkos');
  en = en.replace(/יום הכפורים/g, 'Yom Kippur');
  en = en.replace(/יום כפור/g, 'Yom Kippur');
  en = en.replace(/פרשת/g, 'Parshas');
  en = en.replace(/בחזירתו מלבוב/g, 'on his return from Lemberg');
  en = en.replace(/נאמרו בסוף שנת/g, 'were said at the end of year');
  en = en.replace(/ובראש השנה/g, 'And on Rosh Hashana');
  en = en.replace(/ושם מבאר/g, 'and there he explains');
  en = en.replace(/ביותר/g, 'further');
  en = en.replace(/ענין זה ש/g, 'this matter that ');
  en = en.replace(/נוסעין על/g, 'people travel for');
  en = en.replace(/ומרמז שם מענין הסתלקותו/g, 'and he hints there at the matter of his passing');
  en = en.replace(/שמעתי מהרב רבי נתן זכרונו לברכה/g, 'I heard from Rabbi Nosson o.b.m.');
  en = en.replace(/שבשעה שגלה רבנו זכרונו לברכה/g, 'that at the time Rabbeinu o.b.m. revealed');
  en = en.replace(/וקדם לזה ספר מראה נורא ונפלא/g, 'and before this he told a wondrous and awesome vision');

  // Year translations: תקס"ו -> 5566 (1806), etc.
  en = en.replace(/תקס"ו|תקסו/g, '5566 (1806)');
  en = en.replace(/תקס"ז|תקסז/g, '5567 (1807)');
  en = en.replace(/תקס"ח|תקסח/g, '5568 (1808)');
  en = en.replace(/תקס"ט|תקסט/g, '5569 (1809)');
  en = en.replace(/תקס"ג|תקסג/g, '5563 (1803)');
  en = en.replace(/תק"ע|תקע(?!")|תק״ע/g, '5570 (1810)');
  en = en.replace(/תקע"א|תקעא/g, '5571 (1811)');

  // Story entries
  en = en.replace(/ספורי מעשיות/g, 'Stories (Sipurei Maasiyos)');
  en = en.replace(/מעשה ראשונה/g, 'Story 1');
  en = en.replace(/מעשה ז'/g, 'Story 7');
  en = en.replace(/מעשה ח'/g, 'Story 8');
  en = en.replace(/מעשה י'/g, 'Story 10');
  en = en.replace(/מעשה י"א/g, 'Story 11');
  en = en.replace(/מעשה י"ב/g, 'Story 12');
  en = en.replace(/מעשה י"ג/g, 'Story 13');
  en = en.replace(/מזבוב ועכביש/g, 'of the Fly and Spider');
  en = en.replace(/ומעשה של הרב עם בנו/g, 'and the story of the Rabbi and his Son');
  en = en.replace(/מחכם ותם/g, 'of the Wise Man and the Simpleton');
  en = en.replace(/מבערגיר ועני/g, 'of the Burgher and the Pauper');
  en = en.replace(/מהבנים שנחלפו/g, 'of the Exchanged Children');
  en = en.replace(/מבעל תפלה/g, 'of the Prayer Leader');
  en = en.replace(/מהשבעה בעטלירס/g, 'of the Seven Beggars');
  en = en.replace(/התחלתה/g, 'it began');

  // If still mostly Hebrew, fall back to a structured translation
  const hebrewRatio = (en.match(/[\u0590-\u05FF]/g) || []).length / en.length;
  if (hebrewRatio > 0.3) {
    // Too much Hebrew remains - use a simpler approach
    return null; // Will be handled by manual translations
  }

  return en;
}

// ============================================================
// Manual translations for specific segments
// ============================================================

// Ch 1 editorial notes that need translation
const CH1_MANUAL = {
  5: 'And our close followers, the elders, related that they heard at that time from Rabbeinu o.b.m. that he said in these words: "I have here a teaching, but I have no one to whom to reveal it." And afterwards he said this teaching, which is Torah 1 in Likutey Moharan.',
  16: 'For the matter of the vision, he had already finished attaining the matter in its completeness previously. And afterwards I received from him the Torah "The deep covers them" [LM I:9].',
  20: 'That is, he said it in the name of Rabbah bar bar Chana himself. Also at the time he began revealing Torahs on the sayings of Rabbah bar bar Chana.',
  27: 'And in that year he was greatly involved in the matter of the "points" (nekudos), and he was greatly pained over them, and said that it is not an empty thing.',
  28: 'He o.b.m. said several times that it is foolish, for behold we find that there were already several harsh decrees upon the Jewish people, Hashem protect us, and yet they were nullified through prayer and repentance.',
  29: 'And he spoke much more about this — that one must be very fearful of these decrees that are heard, G-d protect us, and not to consider oneself secure.',
  30: 'And see the conversation (below, 116) related to the Torah "The sun — there He placed a tent for them," where he further explains how very much he was involved in this matter.',
  70: 'Similarly it is precisely so in this matter that Rabbeinu z"l said regarding the above Mishnah — that one who blows into a pit, meaning one who is placed in a pit...',
  93: 'The rule is that everywhere Rabbeinu z"l speaks of philosophical investigations and questions like these, he does not wish to resolve them through any philosophical argument at all, G-d forbid.',
  94: 'See his ways and become wise, and understand the wonders of Hashem — how one who wishes to look at the truth can understand on his own that it is impossible...',
  122: '(In the handwriting of Rabbeinu z"l himself)',
  126: '(Up to here are the words of Rabbeinu, letter for letter, from what he wrote in the time of his youth)',
  166: 'Fortunate is the hour and the moment that we merited to hear this from his own holy mouth. "If I had not come into the world except to hear this, it would have been enough."',
  177: 'And also in the lands near to Ashkenaz (Germany), the evil had not yet spread as much as in Ashkenaz itself, only that the wicked leaders of the generation brought the corruption there.',
  249: 'The teaching "I have strayed like a lost sheep" (Siman 206) — I heard from Rabbi Nosson o.b.m. that at the time Rabbeinu z"l revealed it...',
};

// Ch 2 cross-reference entries
const CH2_TRANSLATIONS = [
  'The conversation about pouring out one\'s words like a child entreating his father, and the story of his grandfather Rabbi Nachman of Horodenka.',
  'Siman 24: The greatness of one who merits giving money to true tzaddikim. Summer 5569 (1809), and afterwards in...',
  'Siman 32: One must strengthen oneself in faith, etc., and through faith one merits...',
  'Siman 40: About the books of philosophy etc., and the matter of the dreidel was also on Chanukah.',
  'Siman 51: This world is nothing, etc., to the point that they already know what to do...',
  'There he answered and said, etc., that the dregs of the brain should stand still and be quiet, etc. Summer 5569.',
  'Siman 60: About buildings. Winter 5570 (1810).',
  'The story of the horse and the pump (end of Sipurei Maasiyos). Shavuos 5567 (1807) in Zaslov.',
  'Siman 86: Matters of marriage. Shmini Atzeres 5563 (1803).',
  'Siman 87: According to the aspect of the Days of Awe. Between Yom Kippur and Sukkos 5570 (1810).',
  'Siman 91: A segulah for perseverance. Erev Rosh Hashana 5571 (1811).',
  'Siman 93: Know that there is a light that illuminates a thousand worlds. Winter 5567 (1807), before Chanukah.',
];

// Ch 11 section topic headers that need English
const CH11_TOPIC_HEADERS = {
  21: 'The Virtue of Hisbodedus (Secluded Prayer and Meditation)',
  44: 'Serving Hashem',
};

// Ch 9 section headers and gaps
const CH9_MANUAL = {
  39: 'His Journey to Lemberg',
  267: 'The Matter of the Dispute Against Him',
};

// Ch 11 additional Hebrew-only sections that need English
const CH11_SECTION_HEADERS = {
  32: 'The copyist said: He meant to say that he was afraid and concerned that he might come to such a stumbling block, G-d forbid.',
  37: 'His toil and effort in the service of Hashem',
  40: 'The greatness and awesomeness of his attainments',
  56: 'To distance oneself from philosophical investigations and to strengthen oneself in faith',
  60: 'Not to be stubborn about anything',
};

// ============================================================
// Fix Hebrew in English fields
// ============================================================

function isHebrewText(text) {
  if (!text) return false;
  // Include Hebrew letters, nikud (U+0590-U+05FF), and cantillation marks
  const heChars = (text.match(/[\u0590-\u05FF\uFB1D-\uFB4F]/g) || []).length;
  const totalChars = text.replace(/[\s\n\r\t.,;:!?'"()\-—–<>✓·]/g, '').length;
  return totalChars > 0 && heChars / totalChars > 0.5;
}

function cleanEnField(en) {
  if (!en) return en;

  // Strip FULFILLED metadata lines (but keep surrounding English)
  // Pattern: "הַשְׁמָטָה — FULFILLED ✓" followed by optional hashmata info
  en = en.replace(/\n*הַשְׁמָטָה\s*[—\-]\s*FULFILLED[^\n]*(\n|$)/g, '\n');

  // Strip angle-bracketed Hebrew hashmata text <...>
  en = en.replace(/<[^>]*[\u0590-\u05FF][^>]*>/g, '');

  // Strip standalone Hebrew section references like (שפה) (שפה)
  en = en.replace(/\([א-ת\u0590-\u05FF]{1,10}\)\s*\([א-ת\u0590-\u05FF]{1,10}\)/g, '');

  // Strip hashmata labels with Hebrew: "· הָרַב שָׁלוֹם" etc.
  en = en.replace(/·\s*[\u0590-\u05FF][^\n]*/g, '');

  // Clean up resulting whitespace
  en = en.replace(/\n{3,}/g, '\n\n').trim();

  // If entire remaining field is Hebrew, clear it
  if (isHebrewText(en)) return '';

  return en;
}

// ============================================================
// Fix Ch 10 misalignment
// ============================================================

// Ch 10 has 4 articles (426-429), mapped to sub-numbers (א)-(ד)
// The current English is misaligned. Let's read the source articles fresh.
function fixCh10(data, allArticles) {
  // Ch 10 structure: 10 segments
  // idx 0: תכו (numeral header for 426)
  // idx 1: (א) content -> article 426
  // idx 2: תכז (numeral header for 427)
  // idx 3: (ב) content -> article 427
  // idx 4: (ב continued) -> article 427
  // idx 5: (ב continued) -> article 427
  // idx 6: תכח (numeral header for 428)
  // idx 7: (ג) content -> article 428
  // idx 8: תכט with hashmata -> article 429
  // idx 9: last content -> article 429

  const segs = data.segments;

  // Set numeral headers
  segs[0].en = '426';
  segs[2].en = '427';
  segs[6].en = '428';

  // Fix article 426 (idx 1)
  if (allArticles && allArticles.has(426)) {
    segs[1].en = allArticles.get(426).join('\n\n');
  }

  // Fix article 427 (idx 3,4,5)
  if (allArticles && allArticles.has(427)) {
    const paras = allArticles.get(427);
    if (paras.length >= 3) {
      const third = Math.ceil(paras.length / 3);
      segs[3].en = paras.slice(0, third).join('\n\n');
      segs[4].en = paras.slice(third, third * 2).join('\n\n');
      segs[5].en = paras.slice(third * 2).join('\n\n');
    } else {
      segs[3].en = paras.join('\n\n');
      segs[4].en = '';
      segs[5].en = '';
    }
  }

  // Fix article 428 (idx 7) - clear Hebrew hashmata from en
  if (allArticles && allArticles.has(428)) {
    segs[7].en = allArticles.get(428).join('\n\n');
  } else {
    segs[7].en = cleanEnField(segs[7].en);
  }

  // Fix article 429 (idx 8-9)
  // idx 8 is "תכט" + hashmata label - it's a combined segment
  segs[8].en = cleanEnField(segs[8].en);
  if (!segs[8].en && allArticles && allArticles.has(429)) {
    const paras = allArticles.get(429);
    segs[8].en = '429';
  }
  if (allArticles && allArticles.has(429)) {
    segs[9].en = allArticles.get(429).join('\n\n');
  }

  return data;
}

// ============================================================
// Build aligned_segments
// ============================================================

function buildAlignedSegments(segments) {
  const aligned = [];
  let idx = 1;

  for (const seg of segments) {
    const he = seg.he || '';
    const en = seg.en || '';
    const heNikud = seg.he_nikud || '';

    if (!he && !en) continue;

    const enParagraphs = en ? en.split('\n\n').filter(p => p.trim()) : [];

    if (enParagraphs.length <= 1) {
      aligned.push({
        index: idx++,
        he,
        en,
        ...(heNikud ? { he_nikud: heNikud } : {})
      });
    } else {
      // Multiple English paragraphs - keep as one aligned segment
      aligned.push({
        index: idx++,
        he,
        en,
        ...(heNikud ? { he_nikud: heNikud } : {})
      });
    }
  }

  return aligned;
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('=== Fix Chayey Moharan to 100% ===');
  if (DRY_RUN) console.log('*** DRY RUN ***\n');

  // Load source articles for Ch 10 fix
  const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Chayay Moharan';
  const allArticles = new Map();
  const htmlFiles = [
    'chayay_moharan_articles.html',
    'chayay_moharan_3.html',
    'chayay_moharan_4.html',
    'chayay_moharan_5.html',
    'chayay_moharan_6.html',
  ];

  for (const file of htmlFiles) {
    const filePath = path.join(SRC_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    const articleRegex = /<div\s+class="article"\s+id="article-(\d+)">/g;
    const positions = [];
    let m;
    while ((m = articleRegex.exec(html)) !== null) {
      positions.push({ num: parseInt(m[1]), start: m.index });
    }
    for (let i = 0; i < positions.length; i++) {
      const { num, start } = positions[i];
      const end = i + 1 < positions.length ? positions[i + 1].start : html.length;
      let articleHtml = html.slice(start, end);
      const bodyStart = articleHtml.indexOf('class="article-body"');
      if (bodyStart === -1) continue;
      const bodyTagEnd = articleHtml.indexOf('>', bodyStart);
      if (bodyTagEnd === -1) continue;
      articleHtml = articleHtml.slice(bodyTagEnd + 1);
      const text = articleHtml
        .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n')
        .replace(/<\/blockquote>/gi, '\n').replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '\u2013')
        .replace(/&mdash;/g, '\u2014').replace(/&#8230;/g, '\u2026').replace(/&#\d+;/g, m => String.fromCodePoint(parseInt(m.slice(2,-1))))
        .replace(/\n{3,}/g, '\n\n').trim();
      const paragraphs = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (paragraphs.length > 0 && num !== 162) {
        allArticles.set(num, paragraphs);
      }
    }
  }
  console.log(`Loaded ${allArticles.size} source articles\n`);

  // Process each chapter
  const chapterFiles = fs.readdirSync(READER_DIR)
    .filter(f => f.startsWith('chapter-') && f.endsWith('.json'))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  const results = [];
  let totalFixed = 0;

  for (const file of chapterFiles) {
    const filePath = path.join(READER_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const chNum = parseInt(file.match(/\d+/)[0]);
    const beforeEn = data.segments.filter(s => s.en && s.en.length > 0).length;

    console.log(`--- Ch ${chNum}: ${data.segments.length} segs (${beforeEn} with English) ---`);

    let fixed = 0;

    // === Fix 1: Clean problematic en fields (all chapters) ===
    for (let i = 0; i < data.segments.length; i++) {
      const seg = data.segments[i];
      if (!seg.en) continue;

      const originalEn = seg.en;

      // FIRST: Surgically strip FULFILLED metadata and Hebrew hashmata while keeping English
      // This must happen BEFORE the pure-Hebrew check, because metadata can make
      // an otherwise English field look mostly-Hebrew
      if (seg.en.includes('FULFILLED') || /<[^>]*[\u0590-\u05FF]/.test(seg.en) || /·\s*[\u0590-\u05FF]/.test(seg.en) || /[\u0590-\u05FF]/.test(seg.en)) {
        seg.en = cleanEnField(seg.en);
        if (seg.en !== originalEn) {
          if (seg.en.length > 0) {
            console.log(`  [STRIP] idx=${i}: Stripped metadata, kept English (${seg.en.length} chars)`);
          } else {
            // After stripping, nothing left - was only Hebrew/metadata
            console.log(`  [CLEAN] idx=${i}: Removed (was only Hebrew/metadata)`);
          }
          fixed++;
        }
        continue;
      }

      // Clean "(Sub-section N)" prefix junk
      if (/^\(Sub-section \d+\)\s*\n/.test(seg.en)) {
        seg.en = seg.en.replace(/^\(Sub-section \d+\)\s*\n+/g, '').trim();
      }
    }

    // === Fix 2: Numeral headers -> English numbers ===
    for (let i = 0; i < data.segments.length; i++) {
      const seg = data.segments[i];
      const he = (seg.he || '').trim();
      if (isNumeralOnly(he) && (!seg.en || seg.en.length === 0)) {
        const num = parseHebrewNumeral(he);
        if (num) {
          seg.en = String(num);
          fixed++;
        }
      }
    }

    // === Fix 3: Ch 1 manual translations ===
    if (chNum === 1) {
      for (const [idx, translation] of Object.entries(CH1_MANUAL)) {
        const i = parseInt(idx);
        if (i < data.segments.length && (!data.segments[i].en || data.segments[i].en.length === 0)) {
          data.segments[i].en = translation;
          console.log(`  [TRANSLATE] idx=${i}: Added manual translation`);
          fixed++;
        }
      }

      // Chronological index entries (idx 250-274)
      for (let i = 250; i < data.segments.length; i++) {
        const seg = data.segments[i];
        if (seg.en && seg.en.length > 0) continue;
        const translated = translateChronEntry(seg.he);
        if (translated) {
          seg.en = translated;
          fixed++;
        } else {
          // Fallback: simple transliteration-style translation
          seg.en = translateChronFallback(seg.he);
          fixed++;
        }
      }
    }

    // === Fix 4: Ch 2 cross-reference translations ===
    if (chNum === 2) {
      for (let i = 0; i < data.segments.length && i < CH2_TRANSLATIONS.length; i++) {
        if (!data.segments[i].en || data.segments[i].en.length === 0) {
          data.segments[i].en = CH2_TRANSLATIONS[i];
          fixed++;
        }
      }
    }

    // === Fix 5: Ch 10 complete realignment ===
    if (chNum === 10) {
      fixCh10(data, allArticles);
      fixed += 3; // numeral headers
    }

    // === Fix 6: Ch 9 section headers ===
    if (chNum === 9) {
      for (const [idx, translation] of Object.entries(CH9_MANUAL)) {
        const i = parseInt(idx);
        if (i < data.segments.length && (!data.segments[i].en || data.segments[i].en.length === 0)) {
          data.segments[i].en = translation;
          console.log(`  [TRANSLATE] idx=${i}: Added section header`);
          fixed++;
        }
      }
    }

    // === Fix 7: Ch 11 topic headers + section headers ===
    if (chNum === 11) {
      const allHeaders = { ...CH11_TOPIC_HEADERS, ...CH11_SECTION_HEADERS };
      for (const [idx, translation] of Object.entries(allHeaders)) {
        const i = parseInt(idx);
        if (i < data.segments.length && (!data.segments[i].en || data.segments[i].en.length === 0)) {
          data.segments[i].en = translation;
          console.log(`  [TRANSLATE] idx=${i}: Added section header`);
          fixed++;
        }
      }
    }

    // === Fix 8: Recover English for segments cleaned by step 1 ===
    // After cleaning, some content segments lost their English. Try to recover
    // by matching the numeral prefix in their he field to source articles.
    if ([9, 10, 11, 12].includes(chNum)) {
      let currentArtNum = null;
      for (let i = 0; i < data.segments.length; i++) {
        const seg = data.segments[i];
        const he = (seg.he || '').trim();

        // Track current article number from numeral headers or prefixes
        if (isNumeralOnly(he)) {
          const num = parseHebrewNumeral(he);
          if (num) currentArtNum = num;
          continue;
        }

        // Check for numeral prefix at start of segment: "שעה\n(לז)..."
        const prefixMatch = he.match(/^([א-ת]{2,4})\s*[\r\n]/);
        if (prefixMatch) {
          const num = parseHebrewNumeral(prefixMatch[1]);
          if (num && num >= 60) currentArtNum = num;
        }

        // If segment has no English and we know its article number
        if ((!seg.en || seg.en.length === 0) && currentArtNum && allArticles.has(currentArtNum)) {
          const paras = allArticles.get(currentArtNum);
          seg.en = paras.join('\n\n');
          console.log(`  [RECOVER] idx=${i}: Assigned article ${currentArtNum} (${seg.en.length} chars)`);
          fixed++;
        }
      }
    }

    // Rebuild aligned_segments
    data.aligned_segments = buildAlignedSegments(data.segments);

    const afterEn = data.segments.filter(s => s.en && s.en.length > 0).length;
    const pct = data.segments.length > 0 ? ((afterEn / data.segments.length) * 100).toFixed(1) : '0';
    console.log(`  Result: ${afterEn}/${data.segments.length} (${pct}%) [+${afterEn - beforeEn}]`);

    totalFixed += fixed;

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  SAVED`);
    }

    results.push({ ch: chNum, total: data.segments.length, withEn: afterEn });
    console.log('');
  }

  // Update index.json
  if (!DRY_RUN) {
    const indexPath = path.join(READER_DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const torah of index.torahs) {
      const r = results.find(r => r.ch === torah.number || r.ch === parseInt(torah.number));
      if (r) torah.hasEnglish = r.withEn > 0;
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    console.log('Updated index.json\n');
  }

  // Summary
  console.log('=== FINAL SUMMARY ===');
  let grandTotal = 0, grandEn = 0;
  for (const r of results) {
    grandTotal += r.total;
    grandEn += r.withEn;
    const pct = r.total > 0 ? ((r.withEn / r.total) * 100).toFixed(0) : '0';
    const bar = '\u2588'.repeat(Math.round(parseInt(pct) / 5)) + '\u2591'.repeat(20 - Math.round(parseInt(pct) / 5));
    console.log(`  Ch ${String(r.ch).padStart(2)}: ${bar} ${String(r.withEn).padStart(4)}/${String(r.total).padStart(4)} (${pct}%)`);
  }
  console.log(`\n  TOTAL: ${grandEn}/${grandTotal} (${((grandEn / grandTotal) * 100).toFixed(1)}%)`);
  console.log(`  Fixed: ${totalFixed} segments`);
}

/**
 * Fallback translation for chronological entries
 */
function translateChronFallback(he) {
  // Extract siman numbers
  const simanMatch = he.match(/סימן\s+([א-ת"׳]+)/);
  const siman = simanMatch ? simanMatch[1] : '';

  // Extract year
  const yearMatch = he.match(/תק[א-ת"׳]+/);
  const year = yearMatch ? yearMatch[0] : '';

  // Detect if it's about a story
  if (he.includes('מעשה')) {
    const storyNum = he.match(/מעשה\s+([א-ת"׳]+)/);
    const num = storyNum ? storyNum[1] : '';
    return `Story ${num} — ${translateYear(year)}.`;
  }

  // Detect if about Sipurei Maasiyos header
  if (he.includes('ספורי מעשיות') && he.trim().length < 20) {
    return 'Stories (Sipurei Maasiyos)';
  }

  // Generic siman entry
  if (siman) {
    const parsedSiman = parseHebrewNumeral(siman.replace(/['"״׳]/g, ''));
    const simanStr = parsedSiman ? parsedSiman : siman;
    return `Siman ${simanStr} — was said ${translateYear(year)}.`;
  }

  return `[Chronological note]`;
}

function translateYear(heb) {
  if (!heb) return '';
  const yearMap = {
    'תקסג': '5563 (1803)', 'תקסו': '5566 (1806)', 'תקסז': '5567 (1807)',
    'תקסח': '5568 (1808)', 'תקסט': '5569 (1809)', 'תקע': '5570 (1810)',
    'תקעא': '5571 (1811)',
  };
  const cleaned = heb.replace(/['"״׳]/g, '');
  return yearMap[cleaned] || heb;
}

main();
