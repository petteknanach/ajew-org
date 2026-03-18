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

export async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const rawRef = url.searchParams.get('ref') || '';

    if (!rawRef.trim()) {
      return new Response(JSON.stringify({ error: 'No reference provided. Try: Genesis.1.1 or תהלים קיט א' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const sefariaRef = normalizeRef(rawRef);

    // Fetch from Sefaria API
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

    // Extract the key fields
    const result = {
      ref: data.ref || sefariaRef,
      heRef: data.heRef || '',
      book: data.book || '',
      he: Array.isArray(data.he) ? data.he.join(' ') : (data.he || ''),
      en: Array.isArray(data.text) ? data.text.join(' ') : (data.text || ''),
      categories: data.categories || [],
      next: data.next || null,
      prev: data.prev || null,
      sefariaUrl: `https://www.sefaria.org/${encodeURIComponent(data.ref || sefariaRef)}`
    };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400' // Cache for 24h
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
