const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const SRC = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books/030_BAVLI';
const DEST = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/public/texts/bavli';

// Tractate metadata: folder name -> { slug, he, en, order (seder) }
const tractates = [
  { dir: '01_MAS_BRACHOT', slug: 'brachot', he: 'ברכות', en: 'Brachot', seder: 'Zeraim', sederHe: 'זרעים' },
  { dir: '02_MAS_SHABAT', slug: 'shabbat', he: 'שבת', en: 'Shabbat', seder: 'Moed', sederHe: 'מועד' },
  { dir: '03_MAS_ERUVIN', slug: 'eruvin', he: 'עירובין', en: 'Eruvin', seder: 'Moed', sederHe: 'מועד' },
  { dir: '04_MAS_PSACHIM', slug: 'pesachim', he: 'פסחים', en: 'Pesachim', seder: 'Moed', sederHe: 'מועד' },
  { dir: '05_MAS_SHKALIM', slug: 'shekalim', he: 'שקלים', en: 'Shekalim', seder: 'Moed', sederHe: 'מועד' },
  { dir: '06_MAS_ROSH', slug: 'rosh-hashana', he: 'ראש השנה', en: 'Rosh Hashana', seder: 'Moed', sederHe: 'מועד' },
  { dir: '07_MAS_YOMA', slug: 'yoma', he: 'יומא', en: 'Yoma', seder: 'Moed', sederHe: 'מועד' },
  { dir: '08_MAS_SUCA', slug: 'sukkah', he: 'סוכה', en: 'Sukkah', seder: 'Moed', sederHe: 'מועד' },
  { dir: '09_MAS_BEITSA', slug: 'beitzah', he: 'ביצה', en: 'Beitzah', seder: 'Moed', sederHe: 'מועד' },
  { dir: '10_MAS_TAANIT', slug: 'taanit', he: 'תענית', en: 'Taanit', seder: 'Moed', sederHe: 'מועד' },
  { dir: '11_MAS_MEGILA', slug: 'megillah', he: 'מגילה', en: 'Megillah', seder: 'Moed', sederHe: 'מועד' },
  { dir: '12_MAS_MOED_KATAN', slug: 'moed-katan', he: 'מועד קטן', en: 'Moed Katan', seder: 'Moed', sederHe: 'מועד' },
  { dir: '13_MAS_HAGIGA', slug: 'chagigah', he: 'חגיגה', en: 'Chagigah', seder: 'Moed', sederHe: 'מועד' },
  { dir: '14_MAS_YEVAMOT', slug: 'yevamot', he: 'יבמות', en: 'Yevamot', seder: 'Nashim', sederHe: 'נשים' },
  { dir: '15_MAS_KTUBOT', slug: 'ketubot', he: 'כתובות', en: 'Ketubot', seder: 'Nashim', sederHe: 'נשים' },
  { dir: '16_MAS_NEDARIM', slug: 'nedarim', he: 'נדרים', en: 'Nedarim', seder: 'Nashim', sederHe: 'נשים' },
  { dir: '17_MAS_NAZIR', slug: 'nazir', he: 'נזיר', en: 'Nazir', seder: 'Nashim', sederHe: 'נשים' },
  { dir: '18_MAS_SOTA', slug: 'sotah', he: 'סוטה', en: 'Sotah', seder: 'Nashim', sederHe: 'נשים' },
  { dir: '19_MAS_GITIN', slug: 'gittin', he: 'גיטין', en: 'Gittin', seder: 'Nashim', sederHe: 'נשים' },
  { dir: '20_MAS_KIDUSHIN', slug: 'kiddushin', he: 'קידושין', en: 'Kiddushin', seder: 'Nashim', sederHe: 'נשים' },
  { dir: '21_MAS_KAMA', slug: 'bava-kamma', he: 'בבא קמא', en: 'Bava Kamma', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '22_MAS_METSIA', slug: 'bava-metzia', he: 'בבא מציעא', en: 'Bava Metzia', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '23_MAS_BATRA', slug: 'bava-batra', he: 'בבא בתרא', en: 'Bava Batra', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '24_MAS_SANHEDRIN', slug: 'sanhedrin', he: 'סנהדרין', en: 'Sanhedrin', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '25_MAS_MAKOT', slug: 'makkot', he: 'מכות', en: 'Makkot', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '26_MAS_SHVUOT', slug: 'shevuot', he: 'שבועות', en: 'Shevuot', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '27_MAS_AVODA_ZARA', slug: 'avodah-zarah', he: 'עבודה זרה', en: 'Avodah Zarah', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '28_MAS_HORAYOT', slug: 'horayot', he: 'הוריות', en: 'Horayot', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '29_MAS_EDUYOT', slug: 'eduyot', he: 'עדויות', en: 'Eduyot', seder: 'Nezikin', sederHe: 'נזיקין' },
  { dir: '30_MAS_ZEVACHIM', slug: 'zevachim', he: 'זבחים', en: 'Zevachim', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '31_MAS_MENACHOT', slug: 'menachot', he: 'מנחות', en: 'Menachot', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '32_MAS_CHULIN', slug: 'chullin', he: 'חולין', en: 'Chullin', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '33_MAS_BECHOROT', slug: 'bechorot', he: 'בכורות', en: 'Bechorot', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '34_MAS_ARACHIN', slug: 'arachin', he: 'ערכין', en: 'Arachin', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '35_MAS_TEMURA', slug: 'temurah', he: 'תמורה', en: 'Temurah', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '36_MAS_KRETOT', slug: 'keritot', he: 'כריתות', en: 'Keritot', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '37_MAS_MEILA', slug: 'meilah', he: 'מעילה', en: 'Meilah', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '38_MAS_TAMID', slug: 'tamid', he: 'תמיד', en: 'Tamid', seder: 'Kodshim', sederHe: 'קדשים' },
  { dir: '39_MAS_NIDA', slug: 'niddah', he: 'נדה', en: 'Niddah', seder: 'Tahorot', sederHe: 'טהרות' },
];

// Hebrew number to Arabic number
const HEB_NUMS = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
  'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
  'ך': 20, 'ם': 40, 'ן': 50, 'ף': 80, 'ץ': 90,
};

function hebToNum(str) {
  str = str.trim().replace(/['"״׳]/g, '');
  if (str === 'טו') return 15;
  if (str === 'טז') return 16;
  let total = 0;
  for (const ch of str) {
    if (HEB_NUMS[ch] !== undefined) total += HEB_NUMS[ch];
    else return null;
  }
  return total > 0 ? total : null;
}

function cleanText(line) {
  // Remove HTML comment markers (OCR refs)
  line = line.replace(/<!--[^>]*-->/g, '');
  // Remove HTML tags but keep content
  line = line.replace(/<\/?[^>]+>/g, '');
  // Remove cosmetics/metadata lines
  if (line.startsWith('&') || line.startsWith('//')) return null;
  // Clean up extra whitespace
  line = line.replace(/\s+/g, ' ').trim();
  return line || null;
}

function parseTractate(filePath) {
  const buf = fs.readFileSync(filePath);
  const text = iconv.decode(buf, 'win1255');
  const lines = text.split(/\r?\n/);

  const dapim = []; // array of { daf: "ב א", amud: "a", text: "..." }
  let currentPerek = '';
  let currentDaf = null;
  let currentText = [];

  for (const rawLine of lines) {
    const cleaned = cleanText(rawLine);
    if (cleaned === null) continue;

    // Chapter marker
    if (rawLine.trim().startsWith('^')) {
      currentPerek = cleaned.replace(/^\^\s*/, '');
      continue;
    }

    // Book title
    if (rawLine.trim().startsWith('$')) continue;

    // Daf marker: ~ דף ב - א or ~ דף ב - ב
    const dafMatch = rawLine.match(/^~\s*דף\s+(.+?)\s*-\s*(א|ב)/);
    if (dafMatch) {
      // Save previous daf
      if (currentDaf && currentText.length > 0) {
        dapim.push({
          daf: currentDaf.daf,
          amud: currentDaf.amud,
          perek: currentDaf.perek,
          text: currentText.join('\n')
        });
      }
      currentDaf = {
        daf: dafMatch[1].trim(),
        amud: dafMatch[2] === 'א' ? 'a' : 'b',
        perek: currentPerek
      };
      currentText = [];
      continue;
    }

    // Section marker without daf
    if (rawLine.trim().startsWith('~')) continue;

    // Skip box markers
    if (/^BBOX\d/.test(rawLine.trim())) continue;

    // Regular text
    if (cleaned) {
      currentText.push(cleaned);
    }
  }

  // Save last daf
  if (currentDaf && currentText.length > 0) {
    dapim.push({
      daf: currentDaf.daf,
      amud: currentDaf.amud,
      perek: currentDaf.perek,
      text: currentText.join('\n')
    });
  }

  return dapim;
}

function main() {
  // Ensure output dir exists
  if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

  const catalog = { tractates: [] };
  let totalDapim = 0;

  for (const t of tractates) {
    const srcDir = path.join(SRC, t.dir);
    // Find L1 file
    const files = fs.readdirSync(srcDir);
    const l1File = files.find(f => f.endsWith('_L1.txt'));
    if (!l1File) {
      console.log(`⚠️  ${t.en}: No L1 file found, skipping`);
      continue;
    }

    const filePath = path.join(srcDir, l1File);
    const dapim = parseTractate(filePath);

    if (dapim.length === 0) {
      console.log(`⚠️  ${t.en}: No dapim parsed`);
      continue;
    }

    // Create tractate directory
    const tractateDir = path.join(DEST, t.slug);
    if (!fs.existsSync(tractateDir)) fs.mkdirSync(tractateDir, { recursive: true });

    // Write each daf as a JSON file (numeric filename like 2a.json)
    for (const daf of dapim) {
      const dafNum = hebToNum(daf.daf);
      const filename = dafNum ? `${dafNum}${daf.amud}.json` : `${daf.daf}-${daf.amud}.json`;
      fs.writeFileSync(
        path.join(tractateDir, filename),
        JSON.stringify({
          tractate: t.he,
          tractateEn: t.en,
          daf: daf.daf,
          dafNum: dafNum,
          amud: daf.amud,
          amudHe: daf.amud === 'a' ? 'א' : 'ב',
          perek: daf.perek,
          text: daf.text
        }, null, 2),
        'utf8'
      );
    }

    // Catalog entry
    const perakim = [...new Set(dapim.map(d => d.perek).filter(Boolean))];
    catalog.tractates.push({
      slug: t.slug,
      he: t.he,
      en: t.en,
      seder: t.seder,
      sederHe: t.sederHe,
      dapim: dapim.length,
      perakim: perakim.length,
      perakimList: perakim
    });

    totalDapim += dapim.length;
    console.log(`✅ ${t.en} (${t.he}): ${dapim.length} dapim, ${perakim.length} perakim`);
  }

  // Write catalog
  fs.writeFileSync(
    path.join(DEST, 'catalog.json'),
    JSON.stringify(catalog, null, 2),
    'utf8'
  );

  console.log(`\n📚 Total: ${catalog.tractates.length} tractates, ${totalDapim} dapim`);
}

main();
