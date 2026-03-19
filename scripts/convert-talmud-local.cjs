/**
 * Convert Talmud Bavli from Books/ folder (CP1255) to UTF-8 JSON
 * Output: public/texts/bavli/{tractate}/{daf}{amud}.json
 * e.g., public/texts/bavli/berakhot/2a.json
 */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const BOOKS_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books/030_BAVLI';
const OUTPUT_DIR = path.join(__dirname, '../public/texts/bavli');

const TRACTATES = [
  { folder: '01_MAS_BRACHOT', file: '01_Bav BRAHOT_L1.txt', slug: 'berakhot', he: 'ברכות' },
  { folder: '02_MAS_SHABAT', file: '02_Bav SHABAT_L1.txt', slug: 'shabbat', he: 'שבת' },
  { folder: '03_MAS_ERUVIN', file: '03_Bav ERUVIN_L1.txt', slug: 'eruvin', he: 'עירובין' },
  { folder: '04_MAS_PSACHIM', file: '04_Bav PSAHIM_L1.txt', slug: 'pesachim', he: 'פסחים' },
  { folder: '06_MAS_ROSH', file: 'Bav ROSH HASHANA_L1.txt', slug: 'rosh-hashanah', he: 'ראש השנה' },
  { folder: '07_MAS_YOMA', file: '07_Bav YOMA_L1.txt', slug: 'yoma', he: 'יומא' },
  { folder: '08_MAS_SUCA', file: '08_Bav SUCA_L1.txt', slug: 'sukkah', he: 'סוכה' },
  { folder: '09_MAS_BEITSA', file: '09_Bav BEITSA_L1.txt', slug: 'beitzah', he: 'ביצה' },
  { folder: '10_MAS_TAANIT', file: '10_Bav TAANIT_L1.txt', slug: 'taanit', he: 'תענית' },
  { folder: '11_MAS_MEGILA', file: '11_Bav MEGILA_L1.txt', slug: 'megillah', he: 'מגילה' },
  { folder: '12_MAS_MOED_KATAN', file: '12_Bav MOED KATAN_L1.txt', slug: 'moed-katan', he: 'מועד קטן' },
  { folder: '13_MAS_HAGIGA', file: 'Bav HAGIGA_L1.txt', slug: 'chagigah', he: 'חגיגה' },
  { folder: '14_MAS_YEVAMOT', file: '14_Bav YEVAMOT_L1.txt', slug: 'yevamot', he: 'יבמות' },
  { folder: '15_MAS_KTUBOT', file: '15_Bav KTUBOT_L1.txt', slug: 'ketubot', he: 'כתובות' },
  { folder: '16_MAS_NEDARIM', file: '16_Bav NEDARIM_L1.txt', slug: 'nedarim', he: 'נדרים' },
  { folder: '17_MAS_NAZIR', file: '17_Bav NAZIR_L1.txt', slug: 'nazir', he: 'נזיר' },
  { folder: '18_MAS_SOTA', file: '18_Bav SOTA_L1.txt', slug: 'sotah', he: 'סוטה' },
  { folder: '19_MAS_GITIN', file: '19_Bav GITIN_L1.txt', slug: 'gittin', he: 'גיטין' },
  { folder: '20_MAS_KIDUSHIN', file: '20_Bav KIDUSHIN_L1.txt', slug: 'kiddushin', he: 'קידושין' },
  { folder: '21_MAS_KAMA', file: 'Bav BABA KAMA_L1.txt', slug: 'bava-kamma', he: 'בבא קמא' },
  { folder: '22_MAS_METSIA', file: '22_Bav BABA METSIA_L1.txt', slug: 'bava-metzia', he: 'בבא מציעא' },
  { folder: '23_MAS_BATRA', file: '23_Bav BABA BATRA_L1.txt', slug: 'bava-batra', he: 'בבא בתרא' },
  { folder: '24_MAS_SANHEDRIN', file: 'Bav SANHEDRIN_L1.txt', slug: 'sanhedrin', he: 'סנהדרין' },
  { folder: '25_MAS_MAKOT', file: 'Bav MAKOT_L1.txt', slug: 'makkot', he: 'מכות' },
  { folder: '26_MAS_SHVUOT', file: 'Bav SHVUOT_L1.txt', slug: 'shevuot', he: 'שבועות' },
  { folder: '27_MAS_AVODA_ZARA', file: 'Bav AVODA ZARA_L1.txt', slug: 'avodah-zarah', he: 'עבודה זרה' },
  { folder: '28_MAS_HORAYOT', file: 'Bav HORAYOT_L1.txt', slug: 'horayot', he: 'הוריות' },
  { folder: '30_MAS_ZEVACHIM', file: 'Bav ZVAHIM_L1.txt', slug: 'zevachim', he: 'זבחים' },
  { folder: '31_MAS_MENACHOT', file: 'Bav MENAHOT_L1.txt', slug: 'menachot', he: 'מנחות' },
  { folder: '32_MAS_CHULIN', file: 'Bav HULIN_L1.txt', slug: 'chullin', he: 'חולין' },
  { folder: '33_MAS_BECHOROT', file: 'Bav BECHOROT_L1.txt', slug: 'bekhorot', he: 'בכורות' },
  { folder: '34_MAS_ARACHIN', file: 'Bav ARACHIN_L1.txt', slug: 'arakhin', he: 'ערכין' },
  { folder: '35_MAS_TEMURA', file: 'Bav TMURA_L1.txt', slug: 'temurah', he: 'תמורה' },
  { folder: '36_MAS_KRETOT', file: 'Bav KRETOT_L1.txt', slug: 'keritot', he: 'כריתות' },
  { folder: '37_MAS_MEILA', file: 'Bav MEIILA_L1.txt', slug: 'meilah', he: 'מעילה' },
  { folder: '38_MAS_TAMID', file: 'BAV TAMID_L1.txt', slug: 'tamid', he: 'תמיד' },
  { folder: '39_MAS_NIDA', file: 'Bav Nida_L1.txt', slug: 'niddah', he: 'נדה' },
];

function stripMarkup(text) {
  return text
    .replace(/<!--[^>]*-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/_nbsp_/g, ' ')
    .trim();
}

function hebrewNumToInt(h) {
  const vals = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
    'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100,
    'ר':200,'ש':300,'ת':400};
  let sum = 0;
  for (const c of h.replace(/[\u0591-\u05C7"'׳״]/g, '')) {
    if (vals[c]) sum += vals[c];
  }
  return sum;
}

function main() {
  console.log('Converting Talmud Bavli to local JSON...\n');
  let totalDafs = 0;
  const catalog = [];

  for (const tract of TRACTATES) {
    const filePath = path.join(BOOKS_DIR, tract.folder, tract.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${tract.file} not found`);
      continue;
    }

    const raw = fs.readFileSync(filePath);
    const text = iconv.decode(raw, 'cp1255');
    const lines = text.split(/\r?\n/);

    const dafs = {};
    let currentDaf = null;
    let currentText = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Daf marker: ~ דף ב - א or ~ דף ב - ב
      if (trimmed.startsWith('~')) {
        const dafMatch = trimmed.match(/דף\s+([א-ת]+)\s*-\s*([אב])/);
        if (dafMatch) {
          // Save previous daf
          if (currentDaf && currentText.trim()) {
            dafs[currentDaf] = stripMarkup(currentText);
          }
          const num = hebrewNumToInt(dafMatch[1]);
          const amud = dafMatch[2] === 'א' ? 'a' : 'b';
          currentDaf = `${num}${amud}`;
          currentText = '';
          continue;
        }
      }

      // Skip metadata lines
      if (trimmed.startsWith('&') || trimmed.startsWith('$') || trimmed.startsWith('^') ||
          trimmed.startsWith('#') || trimmed.startsWith('//') || !trimmed) continue;

      if (currentDaf) {
        currentText += ' ' + trimmed;
      }
    }

    // Save last daf
    if (currentDaf && currentText.trim()) {
      dafs[currentDaf] = stripMarkup(currentText);
    }

    // Write daf JSON files
    const tractDir = path.join(OUTPUT_DIR, tract.slug);
    fs.mkdirSync(tractDir, { recursive: true });

    const dafKeys = Object.keys(dafs).sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
      if (na !== nb) return na - nb;
      return a.endsWith('a') ? -1 : 1;
    });

    for (const daf of dafKeys) {
      fs.writeFileSync(
        path.join(tractDir, `${daf}.json`),
        JSON.stringify({ tractate: tract.slug, tractateHe: tract.he, daf, he: dafs[daf] }, null, 2),
        'utf8'
      );
    }

    totalDafs += dafKeys.length;
    catalog.push({ slug: tract.slug, he: tract.he, dafs: dafKeys.length });
    console.log(`  ${tract.he} (${tract.slug}): ${dafKeys.length} daf pages`);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'catalog.json'),
    JSON.stringify({ tractates: catalog, totalDafs }, null, 2), 'utf8');

  console.log(`\n=== DONE ===`);
  console.log(`Tractates: ${catalog.length}`);
  console.log(`Total daf pages: ${totalDafs}`);
}

main();
