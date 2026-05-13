/**
 * Enrich Likutay Moharan torahs with metadata:
 * - Extract key verse from Hebrew text (first quoted verse)
 * - Extract English title from translation
 * - Assign themes based on concept keywords found in text
 * - Generate hebrewTitle from the key verse
 */
const fs = require('fs');
const path = require('path');

const LM_DIR = path.resolve(__dirname, '..', 'public', 'reader', 'likutay-moharan');

// Concept keywords for theme detection
const THEMES = {
  'Torah': ['תורה', 'לימוד', 'תלמוד'],
  'Prayer': ['תפילה', 'תפלה', 'התפלל', 'מתפלל'],
  'Faith': ['אמונה', 'מאמין', 'להאמין'],
  'Truth': ['אמת', 'האמת'],
  'Joy': ['שמחה', 'שמח', 'לשמוח'],
  'Repentance': ['תשובה', 'חוזר בתשובה'],
  'Tzaddik': ['צדיק', 'הצדיק', 'צדיקים'],
  'Charity': ['צדקה', 'נותן צדקה'],
  'Peace': ['שלום', 'השלום'],
  'Knowledge': ['דעת', 'הדעת', 'מוחין'],
  'Holiness': ['קדושה', 'קדוש'],
  'Shabbat': ['שבת', 'השבת'],
  'Judgment': ['דין', 'משפט', 'דינים'],
  'Kindness': ['חסד', 'חסדים'],
  'Honor': ['כבוד', 'הכבוד'],
  'Humility': ['ענוה', 'עניו', 'ענוותן'],
  'Speech': ['דיבור', 'הדבור', 'מדבר'],
  'Hitbodedut': ['התבודדות', 'מתבודד'],
  'Mashiach': ['משיח', 'המשיח', 'גאולה'],
  'Eretz Yisrael': ['ארץ ישראל', 'ארץ-ישראל'],
  'Fear of God': ['יראה', 'יראת', 'ירא'],
  'Love': ['אהבה', 'אוהב'],
  'Desire': ['רצון', 'תאוה', 'תאוות'],
  'Evil Inclination': ['יצר הרע', 'היצר'],
  'Soul': ['נשמה', 'נפש', 'הנשמה'],
  'Melody': ['ניגון', 'נגינה', 'שיר', 'זמרה'],
  'World to Come': ['עולם הבא', 'לעתיד'],
  'Healing': ['רפואה', 'רופא', 'תרופה'],
  'Memory': ['זכרון', 'זוכר', 'זכירה'],
  'Eating': ['אכילה', 'אוכל', 'מאכל', 'סעודה'],
  'Dreams': ['חלום', 'חלומות'],
  'Rosh Hashana': ['ראש השנה', 'ראש-השנה'],
  'Tefillin': ['תפילין', 'תפלין'],
  'Mikva': ['מקוה', 'מקוה', 'טבילה'],
  'Simplicity': ['פשיטות', 'תמימות', 'פשוט'],
  'Trust': ['בטחון', 'ביטחון', 'בוטח'],
  'Controversy': ['מחלוקת', 'חולקים'],
  'Pride': ['גאוה', 'גאות', 'מתגאה'],
  'Despair': ['יאוש', 'מתייאש', 'ייאוש'],
  'Rectification': ['תיקון', 'תקון', 'מתקן'],
  'Good Points': ['נקודות טובות', 'נקודה טובה'],
  'Enthusiasm': ['התפעלות', 'התלהבות'],
  'Clinging to God': ['דבקות', 'דביקות', 'דבוק'],
  'Suffering': ['יסורים', 'ייסורים', 'צער'],
  'Marriage': ['שידוך', 'שידוכים', 'זיווג', 'חתונה'],
  'Children': ['בנים', 'ילדים', 'פריה ורביה'],
  'Livelihood': ['פרנסה', 'ממון', 'עשירות'],
  'Wisdom': ['חכמה', 'החכמה'],
  'Sleep': ['שינה', 'ישן', 'שנת'],
};

/**
 * Extract key verse from Hebrew text.
 * LM torahs typically start with a verse in quotes or parentheses.
 */
function extractKeyVerse(heText) {
  // Pattern 1: Text in quotes at the start
  // "ואלה המשפטים אשר תשים לפניהם" (שמות כ"א)
  const quoteMatch = heText.match(/^[("]*([^"()]{5,80})[")]\s*\(?([^)]{3,30})\)?/);
  if (quoteMatch) {
    return { verse: quoteMatch[1].trim(), ref: quoteMatch[2].trim() };
  }

  // Pattern 2: Verse followed by reference in parens
  // הנה הצדיקים... (תהלים כ"ב)
  const parenMatch = heText.match(/^(.{5,80}?)\s*\(([א-ת]{2,20}\s+[א-ת"']{1,10}[^)]*)\)/);
  if (parenMatch && !parenMatch[1].includes('לשון רבנו')) {
    return { verse: parenMatch[1].trim(), ref: parenMatch[2].trim() };
  }

  // Pattern 3: After "לשון רבנו" header, find the actual verse (non-recursive)
  if (heText.startsWith('לשון רבנו') || heText.startsWith('(לשון רבנו')) {
    const afterHeader = heText.replace(/^[(\s]*לשון רבנו[^:]*:\s*/, '');
    if (afterHeader !== heText && afterHeader.length > 5) {
      // Try patterns 1 and 2 on the remaining text
      const q = afterHeader.match(/^[("]*([^"()]{5,80})[")]\s*\(?([^)]{3,30})\)?/);
      if (q) return { verse: q[1].trim(), ref: q[2].trim() };
      const p = afterHeader.match(/^(.{5,80}?)\s*\(([א-ת]{2,20}\s+[א-ת"']{1,10}[^)]*)\)/);
      if (p) return { verse: p[1].trim(), ref: p[2].trim() };
      const s = afterHeader.match(/^(.{10,80}?)[.,:;]/);
      if (s) return { verse: s[1].trim(), ref: '' };
      return { verse: afterHeader.substring(0, 60).trim(), ref: '' };
    }
  }

  // Pattern 4: Just take the first sentence-like chunk
  const firstSentence = heText.match(/^(.{10,80}?)[.,:;]/);
  if (firstSentence) {
    return { verse: firstSentence[1].trim(), ref: '' };
  }

  return { verse: heText.substring(0, 60).trim(), ref: '' };
}

/**
 * Extract English title from translation text.
 */
function extractEnglishTitle(enText, torahNum) {
  if (!enText) return `Torah ${torahNum}`;

  // Common patterns in the English translations:
  // "10 - And these are the judgments"
  // "Likutey Moharan Volume 1: Torah 50\n\n\"Rescue my soul...\""
  // "200 - The Reason That the Tzadikim..."

  // Pattern 1: "N - Title" format
  const dashTitle = enText.match(/^\d+\s*[-–—]\s*(.{5,80}?)[\n.]/);
  if (dashTitle) return cleanTitle(dashTitle[1]);

  // Pattern 2: After "Torah N\n\n" find a quoted verse or title
  const afterTorahHeader = enText.replace(/^Likut[ae]y?\s*Moharan[^:]*:\s*Torah\s*\d+\s*/i, '');
  const afterNewlines = afterTorahHeader.replace(/^\s*\n+\s*/, '');

  // Look for quoted verse
  const quoteTitle = afterNewlines.match(/^["""](.{5,80}?)["""]/);
  if (quoteTitle) return cleanTitle(quoteTitle[1]);

  // Look for capitalized title
  const capTitle = afterNewlines.match(/^([A-Z][^.\n]{5,80}?)[\n.]/);
  if (capTitle) return cleanTitle(capTitle[1]);

  // Pattern 3: Just use first meaningful line
  const lines = enText.split('\n').filter(l => l.trim().length > 5);
  for (const line of lines) {
    const clean = line.trim();
    // Skip header lines
    if (clean.match(/^Likut|^\d+[a-z]?\)|^Torah \d+$|^\[In the/i)) continue;
    return cleanTitle(clean.substring(0, 80));
  }

  return `Torah ${torahNum}`;
}

function cleanTitle(title) {
  return title
    .replace(/["""\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/etc\.?$/, '')
    .replace(/\.\.\.$/, '')
    .trim();
}

/**
 * Detect themes from the full Hebrew text of a torah.
 */
function detectThemes(segments) {
  const fullText = segments.map(s => s.he || '').join(' ');
  const textLen = fullText.length;
  // For short texts, lower threshold to 1; for long texts keep at 2
  const minCount = textLen < 500 ? 1 : 2;
  const found = [];

  for (const [theme, keywords] of Object.entries(THEMES)) {
    for (const kw of keywords) {
      if (fullText.includes(kw)) {
        const count = (fullText.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (count >= minCount) {
          found.push({ theme, count });
          break;
        }
      }
    }
  }

  // Also check English text for themes if Hebrew didn't yield enough
  if (found.length < 2) {
    const fullEn = segments.map(s => s.en || '').join(' ').toLowerCase();
    const EN_THEMES = {
      'Torah': ['torah', 'learning', 'study'],
      'Prayer': ['prayer', 'praying', 'tefilah'],
      'Faith': ['faith', 'emunah', 'believe'],
      'Truth': ['truth', 'emet'],
      'Joy': ['joy', 'happiness', 'simcha', 'rejoice'],
      'Repentance': ['repentance', 'teshuvah', 'return'],
      'Tzaddik': ['tzaddik', 'righteous'],
      'Charity': ['charity', 'tzedakah'],
      'Peace': ['peace', 'shalom'],
      'Knowledge': ['knowledge', 'da\'at', 'mind', 'intellect'],
      'Holiness': ['holiness', 'kedushah', 'holy'],
      'Judgment': ['judgment', 'din', 'justice'],
      'Kindness': ['kindness', 'chesed', 'mercy'],
      'Honor': ['honor', 'kavod', 'glory'],
      'Humility': ['humility', 'humble', 'anava'],
      'Speech': ['speech', 'words', 'speaking'],
      'Hitbodedut': ['hitbodedut', 'meditation', 'seclusion'],
      'Mashiach': ['mashiach', 'messiah', 'redemption'],
      'Eretz Yisrael': ['eretz yisrael', 'land of israel'],
      'Fear of God': ['fear of god', 'awe', 'yirah'],
      'Healing': ['healing', 'cure', 'medicine'],
      'Controversy': ['controversy', 'dispute', 'machloket'],
      'Suffering': ['suffering', 'pain', 'affliction'],
    };
    for (const [theme, keywords] of Object.entries(EN_THEMES)) {
      if (found.some(f => f.theme === theme)) continue;
      for (const kw of keywords) {
        const count = (fullEn.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
        if (count >= 2) {
          found.push({ theme, count });
          break;
        }
      }
    }
  }

  // Sort by count and take top 5
  found.sort((a, b) => b.count - a.count);
  return found.slice(0, 5).map(f => f.theme);
}

async function main() {
  let enriched = 0;
  let skipped = 0;

  for (const partNum of [1, 2]) {
    const partDir = path.join(LM_DIR, `part-${partNum}`);
    const files = fs.readdirSync(partDir).filter(f => f.startsWith('torah-') && f.endsWith('.json'));

    console.log(`\n=== Part ${partNum} (${files.length} torahs) ===`);

    for (const file of files) {
      const filePath = path.join(partDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const torahNum = data.torah || parseInt(file.match(/\d+/)?.[0]);

      // Check what's missing
      const hasTitle = data.title && data.title !== `Torah ${torahNum}`;
      const hasHeTitle = !!data.hebrewTitle;
      const hasThemes = data.themes?.length > 0;

      // Skip only if everything is already filled
      if (hasTitle && hasHeTitle && hasThemes) {
        skipped++;
        continue;
      }

      const firstHe = data.segments[0]?.he || '';
      const firstEn = data.segments[0]?.en || '';
      const allEn = data.segments.map(s => s.en || '').join('\n');

      // Extract key verse
      const { verse, ref } = extractKeyVerse(firstHe);

      // Generate title
      const enTitle = extractEnglishTitle(allEn || firstEn, torahNum);

      // Hebrew title = key verse (cleaned)
      const heTitle = verse.replace(/[""'"()\[\]]/g, '').trim().substring(0, 50);

      // Detect themes
      const themes = detectThemes(data.segments);

      // Update
      let changed = false;

      if (!data.hebrewTitle || data.hebrewTitle === '') {
        data.hebrewTitle = heTitle;
        changed = true;
      }
      if (data.title === `Torah ${torahNum}` || !data.title) {
        data.title = enTitle || `Torah ${torahNum}`;
        changed = true;
      }
      if (!data.keyVerse) {
        data.keyVerse = verse;
        data.keyVerseRef = ref;
        changed = true;
      }
      if (!data.themes || data.themes.length === 0) {
        if (themes.length > 0) {
          data.themes = themes;
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        enriched++;
        if (enriched <= 10 || enriched % 50 === 0) {
          console.log(`  ${partNum}:${torahNum} "${data.hebrewTitle}" - ${data.title} [${themes.join(', ')}]`);
        }
      }
    }
  }

  console.log(`\n===========================`);
  console.log(`Enriched: ${enriched} torahs`);
  console.log(`Skipped (already had metadata): ${skipped} torahs`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
