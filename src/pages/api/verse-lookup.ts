export const prerender = false;

/**
 * Verse Lookup API - Quick reference for Tanach, Talmud, and other sources
 * Proxies requests to the Sefaria API for instant verse/passage lookup.
 *
 * Usage: /api/verse-lookup?ref=Genesis.1.1
 *        /api/verse-lookup?ref=Psalms.119.1
 *        /api/verse-lookup?ref=Berakhot.5a
 *        /api/verse-lookup?ref=תהלים+קיט+א
 */

// Common Hebrew book name mappings to Sefaria refs
const HEBREW_TO_SEFARIA: Record<string, string> = {
  // Torah
  'בראשית': 'Genesis',
  'שמות': 'Exodus',
  'ויקרא': 'Leviticus',
  'במדבר': 'Numbers',
  'דברים': 'Deuteronomy',
  // Nevi'im
  'יהושע': 'Joshua',
  'שופטים': 'Judges',
  'שמואל': 'I Samuel',
  'שמואל א': 'I Samuel',
  'שמואל ב': 'II Samuel',
  'מלכים': 'I Kings',
  'מלכים א': 'I Kings',
  'מלכים ב': 'II Kings',
  'ישעיהו': 'Isaiah',
  'ישעיה': 'Isaiah',
  'ירמיהו': 'Jeremiah',
  'ירמיה': 'Jeremiah',
  'יחזקאל': 'Ezekiel',
  'הושע': 'Hosea',
  'יואל': 'Joel',
  'עמוס': 'Amos',
  'עובדיה': 'Obadiah',
  'יונה': 'Jonah',
  'מיכה': 'Micah',
  'נחום': 'Nahum',
  'חבקוק': 'Habakkuk',
  'צפניה': 'Zephaniah',
  'חגי': 'Haggai',
  'זכריה': 'Zechariah',
  'מלאכי': 'Malachi',
  // Ketuvim
  'תהלים': 'Psalms',
  'תהילים': 'Psalms',
  'משלי': 'Proverbs',
  'איוב': 'Job',
  'שיר השירים': 'Song of Songs',
  'רות': 'Ruth',
  'איכה': 'Lamentations',
  'קהלת': 'Ecclesiastes',
  'אסתר': 'Esther',
  'דניאל': 'Daniel',
  'עזרא': 'Ezra',
  'נחמיה': 'Nehemiah',
  'דברי הימים': 'I Chronicles',
  'דברי הימים א': 'I Chronicles',
  'דברי הימים ב': 'II Chronicles',
  // Talmud Bavli (common tractates)
  'ברכות': 'Berakhot',
  'שבת': 'Shabbat',
  'ערובין': 'Eruvin',
  'עירובין': 'Eruvin',
  'פסחים': 'Pesachim',
  'ביצה': 'Beitzah',
  'ראש השנה': 'Rosh Hashanah',
  'תענית': 'Taanit',
  'מגילה': 'Megillah',
  'סוכה': 'Sukkah',
  'חגיגה': 'Chagigah',
  'יבמות': 'Yevamot',
  'כתובות': 'Ketubot',
  'נדרים': 'Nedarim',
  'נזיר': 'Nazir',
  'סוטה': 'Sotah',
  'גיטין': 'Gittin',
  'קידושין': 'Kiddushin',
  'בבא קמא': 'Bava Kamma',
  'בבא מציעא': 'Bava Metzia',
  'בבא בתרא': 'Bava Batra',
  'סנהדרין': 'Sanhedrin',
  'מכות': 'Makkot',
  'שבועות': 'Shevuot',
  'עבודה זרה': 'Avodah Zarah',
  'הוריות': 'Horayot',
  'זבחים': 'Zevachim',
  'מנחות': 'Menachot',
  'חולין': 'Chullin',
  'בכורות': 'Bekhorot',
  'ערכין': 'Arakhin',
  'נדה': 'Niddah',
  // Midrash
  'בראשית רבה': 'Bereishit Rabbah',
  'ויקרא רבה': 'Vayikra Rabbah',
  // Zohar
  'זהר': 'Zohar',
};

// Hebrew number parsing for chapter/verse
const HEB_NUMS: Record<string, number> = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
  'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
  'ך': 20, 'ם': 40, 'ן': 50, 'ף': 80, 'ץ': 90,
};

function parseHebrewNum(str: string): number | null {
  str = str.trim().replace(/['"״׳]/g, '');
  if (!str) return null;
  if (str === 'טו') return 15;
  if (str === 'טז') return 16;
  let total = 0;
  for (const ch of str) {
    if (HEB_NUMS[ch] !== undefined) total += HEB_NUMS[ch];
    else return null;
  }
  return total > 0 ? total : null;
}

function normalizeRef(input: string): string {
  let ref = input.trim();

  // Try to match Hebrew book name
  for (const [heb, eng] of Object.entries(HEBREW_TO_SEFARIA)) {
    if (ref.startsWith(heb)) {
      const rest = ref.substring(heb.length).trim();
      // Parse remaining as chapter:verse (could be Hebrew letters or numbers)
      const parts = rest.split(/[\s,:.\-]+/).filter(Boolean);

      if (parts.length === 0) {
        ref = eng + '.1';
      } else {
        const nums = parts.map(p => {
          const n = parseHebrewNum(p);
          return n !== null ? String(n) : p;
        });
        ref = eng + '.' + nums.join('.');
      }
      break;
    }
  }

  // Handle Talmud page references like "5a", "32b"
  ref = ref.replace(/\s+/g, '.');

  return ref;
}

// Sefaria name -> local slug mapping for Tanach
const SEFARIA_TO_LOCAL: Record<string, string> = {
  'Genesis': 'genesis', 'Exodus': 'exodus', 'Leviticus': 'leviticus',
  'Numbers': 'numbers', 'Deuteronomy': 'deuteronomy',
  'Joshua': 'joshua', 'Judges': 'judges',
  'I Samuel': 'i-samuel', 'II Samuel': 'ii-samuel',
  'I Kings': 'i-kings', 'II Kings': 'ii-kings',
  'Isaiah': 'isaiah', 'Jeremiah': 'jeremiah', 'Ezekiel': 'ezekiel',
  'Hosea': 'hosea', 'Joel': 'joel', 'Amos': 'amos', 'Obadiah': 'obadiah',
  'Jonah': 'jonah', 'Micah': 'micah', 'Nahum': 'nahum',
  'Habakkuk': 'habakkuk', 'Zephaniah': 'zephaniah',
  'Haggai': 'haggai', 'Zechariah': 'zechariah', 'Malachi': 'malachi',
  'Psalms': 'psalms', 'Proverbs': 'proverbs', 'Job': 'job',
  'Song of Songs': 'song-of-songs', 'Ruth': 'ruth',
  'Lamentations': 'lamentations', 'Ecclesiastes': 'ecclesiastes',
  'Esther': 'esther', 'Daniel': 'daniel', 'Ezra': 'ezra',
  'Nehemiah': 'nehemiah', 'I Chronicles': 'i-chronicles', 'II Chronicles': 'ii-chronicles',
};

// Hebrew name -> local slug for direct Hebrew lookup
const HEBREW_TO_LOCAL: Record<string, string> = {};
for (const [heb, eng] of Object.entries(HEBREW_TO_SEFARIA)) {
  const slug = SEFARIA_TO_LOCAL[eng];
  if (slug) HEBREW_TO_LOCAL[heb] = slug;
}

import fs from 'node:fs';
import path from 'node:path';

// Talmud tractate slug mapping
const TALMUD_TO_LOCAL: Record<string, string> = {
  'Berakhot': 'berakhot', 'Shabbat': 'shabbat', 'Eruvin': 'eruvin',
  'Pesachim': 'pesachim', 'Rosh Hashanah': 'rosh-hashanah', 'Yoma': 'yoma',
  'Sukkah': 'sukkah', 'Beitzah': 'beitzah', 'Taanit': 'taanit',
  'Megillah': 'megillah', 'Moed Katan': 'moed-katan', 'Chagigah': 'chagigah',
  'Yevamot': 'yevamot', 'Ketubot': 'ketubot', 'Nedarim': 'nedarim',
  'Nazir': 'nazir', 'Sotah': 'sotah', 'Gittin': 'gittin', 'Kiddushin': 'kiddushin',
  'Bava Kamma': 'bava-kamma', 'Bava Metzia': 'bava-metzia', 'Bava Batra': 'bava-batra',
  'Sanhedrin': 'sanhedrin', 'Makkot': 'makkot', 'Shevuot': 'shevuot',
  'Avodah Zarah': 'avodah-zarah', 'Horayot': 'horayot',
  'Zevachim': 'zevachim', 'Menachot': 'menachot', 'Chullin': 'chullin',
  'Bekhorot': 'bekhorot', 'Arakhin': 'arakhin', 'Temurah': 'temurah',
  'Keritot': 'keritot', 'Meilah': 'meilah', 'Niddah': 'niddah', 'Tamid': 'tamid',
};

function tryLocalLookup(sefariaRef: string): any | null {
  const parts = sefariaRef.split('.');
  if (parts.length < 2) return null;

  const bookName = parts[0];

  // Try Talmud first (e.g., "Berakhot.5a")
  const talmudSlug = TALMUD_TO_LOCAL[bookName];
  if (talmudSlug) {
    const daf = parts[1].toLowerCase(); // e.g., "5a"
    const filePath = path.join(process.cwd(), 'public', 'texts', 'bavli', talmudSlug, `${daf}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const dafNum = parseInt(daf);
      const amud = daf.endsWith('a') ? 'a' : 'b';
      const nextDaf = amud === 'a' ? `${dafNum}b` : `${dafNum + 1}a`;
      const prevDaf = amud === 'b' ? `${dafNum}a` : (dafNum > 2 ? `${dafNum - 1}b` : null);

      return {
        ref: `${bookName}.${daf}`,
        heRef: `${data.tractateHe} דף ${daf}`,
        book: bookName,
        he: data.he,
        en: '',
        categories: ['Talmud'],
        next: nextDaf ? `${bookName}.${nextDaf}` : null,
        prev: prevDaf ? `${bookName}.${prevDaf}` : null,
        sefariaUrl: `https://www.sefaria.org/${bookName}.${daf}`,
        source: 'local'
      };
    } catch (e) { return null; }
  }

  // Try Tanach (e.g., "Genesis.1.1")
  const chapter = parseInt(parts[1]);
  const verse = parts.length >= 3 ? parseInt(parts[2]) : null;
  if (!chapter || isNaN(chapter)) return null;

  const slug = SEFARIA_TO_LOCAL[bookName];
  if (!slug) return null;

  const filePath = path.join(process.cwd(), 'public', 'texts', 'tanach', slug, `${chapter}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let heText: string;
    let heRef: string;

    if (verse && !isNaN(verse)) {
      const v = data.verses.find((v: any) => v.num === verse);
      if (!v) return null;
      heText = v.he;
      heRef = `${data.bookHe} ${chapter}:${verse}`;
    } else {
      heText = data.verses.map((v: any) => `(${v.num}) ${v.he}`).join(' ');
      heRef = `${data.bookHe} ${chapter}`;
    }

    return {
      ref: verse ? `${bookName}.${chapter}.${verse}` : `${bookName}.${chapter}`,
      heRef,
      book: bookName,
      he: heText,
      en: '',
      categories: ['Tanakh'],
      next: `${bookName}.${chapter + 1}`,
      prev: chapter > 1 ? `${bookName}.${chapter - 1}` : null,
      sefariaUrl: `https://www.sefaria.org/${bookName}.${chapter}${verse ? '.' + verse : ''}`,
      source: 'local'
    };
  } catch (e) {
    return null;
  }
}

export async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const rawRef = url.searchParams.get('ref') || '';

    if (!rawRef.trim()) {
      return new Response(JSON.stringify({ error: 'No reference provided. Try: Genesis.1.1 or תהלים קיט א' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const sefariaRef = normalizeRef(rawRef);

    // Try local lookup first (Tanach only)
    const localResult = tryLocalLookup(sefariaRef);
    if (localResult) {
      return new Response(JSON.stringify(localResult), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Fallback to Sefaria API for Talmud, Midrash, etc.
    const sefariaUrl = `https://www.sefaria.org/api/texts/${encodeURIComponent(sefariaRef)}?context=0&pad=0`;
    const res = await fetch(sefariaUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({
        error: `Could not find "${rawRef}" (tried: ${sefariaRef})`,
        suggestion: 'Try formats like: Genesis.1.1, תהלים קיט, Berakhot.5a'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await res.json();

    const result = {
      ref: data.ref || sefariaRef,
      heRef: data.heRef || '',
      book: data.book || '',
      he: Array.isArray(data.he) ? data.he.join(' ') : (data.he || ''),
      en: Array.isArray(data.text) ? data.text.join(' ') : (data.text || ''),
      categories: data.categories || [],
      next: data.next || null,
      prev: data.prev || null,
      sefariaUrl: `https://www.sefaria.org/${encodeURIComponent(data.ref || sefariaRef)}`,
      source: 'sefaria'
    };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
