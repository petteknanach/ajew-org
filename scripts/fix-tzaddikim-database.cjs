/**
 * Fix and expand the tzaddikim database:
 * 1. Normalize month names to match Hebcal API output
 * 2. Clean up entries with long descriptions as names
 * 3. Remove duplicates
 * 4. Add missing Breslov tzaddikim
 * 5. Add missing important figures
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../public/data/tzaddikim-database-filtered.json');

// Hebcal month name mapping (what Hebcal returns)
const MONTH_NORMALIZE = {
  "Nissan": "Nisan",
  "Iyar": "Iyyar",
  "Tammuz": "Tamuz",
  "Teves": "Tevet",
  "Shvat": "Sh'vat",
  "Shevat": "Sh'vat",
  "ELUL": "Elul",
  // These are already correct:
  "Nisan": "Nisan",
  "Iyyar": "Iyyar",
  "Sivan": "Sivan",
  "Tamuz": "Tamuz",
  "Av": "Av",
  "Elul": "Elul",
  "Tishrei": "Tishrei",
  "Cheshvan": "Cheshvan",
  "Kislev": "Kislev",
  "Tevet": "Tevet",
  "Sh'vat": "Sh'vat",
  "Adar": "Adar",
  "Adar II": "Adar II",
};

function normalizeMonth(m) {
  return MONTH_NORMALIZE[m] || m;
}

function makeTzaddik(name, hebrew_name, month, day, year, notes, category) {
  const normMonth = normalizeMonth(month);
  return {
    name,
    hebrew_name,
    yahrzeit_hebrew: `${day} ${normMonth}`,
    yahrzeit_month: normMonth,
    yahrzeit_day: String(day),
    is_adar_ii: normMonth === 'Adar II',
    year_passed: year || '',
    notes: notes || '',
    category: category || 'other',
    source: 'editable'
  };
}

function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  let tzaddikim = db.all_tzaddikim;

  console.log(`Original entries: ${tzaddikim.length}`);

  // Step 1: Normalize month names
  for (const tz of tzaddikim) {
    tz.yahrzeit_month = normalizeMonth(tz.yahrzeit_month);
    tz.yahrzeit_hebrew = `${tz.yahrzeit_day} ${tz.yahrzeit_month}`;
  }

  // Step 2: Clean up entries with long descriptions as names
  for (const tz of tzaddikim) {
    // If name is too long, truncate to first meaningful part
    if (tz.name.length > 80) {
      const parts = tz.name.split(',');
      tz.name = parts[0].trim();
      if (!tz.notes && parts.length > 1) {
        tz.notes = parts.slice(1).join(',').trim();
      }
    }
    // If hebrew_name equals the full English name, clear it
    if (tz.hebrew_name === tz.name || tz.hebrew_name.length > 60) {
      tz.hebrew_name = '';
    }
  }

  // Step 3: Remove duplicates (keep the one with more info)
  const seen = new Map();
  const deduped = [];
  for (const tz of tzaddikim) {
    const key = `${tz.yahrzeit_month}-${tz.yahrzeit_day}-${tz.name.split('(')[0].trim().toLowerCase()}`;
    if (seen.has(key)) {
      const existing = seen.get(key);
      // Keep the one with Hebrew name or more notes
      if (tz.hebrew_name && !existing.hebrew_name) {
        deduped[deduped.indexOf(existing)] = tz;
        seen.set(key, tz);
      }
    } else {
      seen.set(key, tz);
      deduped.push(tz);
    }
  }
  tzaddikim = deduped;
  console.log(`After dedup: ${tzaddikim.length}`);

  // Step 4: Remove entries with no day (can never match)
  tzaddikim = tzaddikim.filter(tz => tz.yahrzeit_day && tz.yahrzeit_day.trim() !== '');
  console.log(`After removing no-day entries: ${tzaddikim.length}`);

  // Step 5: Add missing important Breslov figures
  const newEntries = [
    // Breslov
    makeTzaddik('Rabbi Yisroel Ber Odesser (Saba)', 'רבי ישראל בער אודסר (הסבא)', 'Cheshvan', 18, '1994', 'Na Nach Nachma Nachman MeUman! Receiver of the Petek', 'breslov'),
    makeTzaddik('Rabbi Yisroel Karduner', 'רבי ישראל קרדונר', 'Kislev', 26, '1919', 'Teacher of Saba Yisroel, Breslov tzaddik of Tiberias', 'breslov'),
    makeTzaddik('Rabbi Moshe Breslover', 'רבי משה מברסלב', 'Tishrei', 24, '', 'Teacher of R\' Yisroel Karduner', 'breslov'),
    makeTzaddik('Rabbi Levi Yitzchak Bender', 'רבי לוי יצחק בנדר', 'Tamuz', 5, '1989', 'Breslov leader in Jerusalem', 'breslov'),
    makeTzaddik('Rabbi Shimshon Barsky', 'רבי שמשון ברסקי', 'Iyyar', 6, '1898', 'Breslov elder, student of R\' Nosson', 'breslov'),
    makeTzaddik('Rabbi Alter of Teplik', 'רבי אלתר מטפליק', 'Kislev', 13, '1919', 'Author of Meshivas Nefesh, Hashtatfchus HaNefesh', 'breslov'),
    makeTzaddik('Rabbi Avraham bar Nachman of Tulchin', 'רבי אברהם ב"ר נחמן מטולטשין', 'Cheshvan', 12, '1917', 'Author of Biur HaLikutim, Kokhvei Or', 'breslov'),
    makeTzaddik('Rabbi Nachman of Tcherin', 'רבי נחמן מטשערין', 'Adar', 8, '1894', 'Author of Parparos LeChochma, Likutay Eitzos', 'breslov'),

    // Chassidic masters
    makeTzaddik('Rabbi Schneur Zalman of Liadi (Alter Rebbe)', 'רבי שניאור זלמן מלאדי', 'Tevet', 24, '1812', 'Founder of Chabad, author of Tanya', 'chassidic'),
    makeTzaddik('Rabbi Menachem Mendel of Kotzk', 'רבי מנחם מנדל מקוצק', 'Sh\'vat', 22, '1859', 'Kotzker Rebbe', 'chassidic'),
    makeTzaddik('Rabbi Zusha of Anipoli', 'רבי זושא מאניפולי', 'Sh\'vat', 2, '1800', 'Disciple of Maggid of Mezritch', 'chassidic'),
    makeTzaddik('Rabbi Meir of Premishlan', 'רבי מאיר מפרמישלן', 'Iyyar', 29, '1850', 'Chassidic rebbe known for miracles', 'chassidic'),
    makeTzaddik('Rabbi Yisrael of Ruzhin', 'רבי ישראל מרוז\'ין', 'Cheshvan', 3, '1850', 'Ruzhiner Rebbe', 'chassidic'),

    // Key biblical/Talmudic
    makeTzaddik('Sarah', 'שרה', 'Cheshvan', 1, '', 'First Matriarch', 'biblical'),
    makeTzaddik('Rachel', 'רחל', 'Cheshvan', 11, '', 'Fourth Matriarch, buried near Bethlehem', 'biblical'),
    makeTzaddik('Samuel the Prophet', 'שמואל הנביא', 'Iyyar', 28, '', 'Prophet and judge', 'biblical'),
    makeTzaddik('Joshua', 'יהושע בן נון', 'Nisan', 26, '', 'Led Israel into the Land', 'biblical'),
    makeTzaddik('Rabbi Yehuda HaNasi', 'רבי יהודה הנשיא', 'Kislev', 15, '', 'Compiler of the Mishna', 'other'),
    makeTzaddik('Rabbi Shimon ben Gamliel', 'רבן שמעון בן גמליאל', 'Elul', 25, '', 'Nasi of the Sanhedrin, martyr', 'other'),
    makeTzaddik('Rabbeinu Yoel Sirkis (Bach)', 'רבנו יואל סירקיש', 'Adar', 20, '1640', 'Author of Bayis Chadash', 'other'),
    makeTzaddik('Ohr HaChaim (Rabbi Chaim ibn Attar)', 'אור החיים הקדוש', 'Tamuz', 15, '1743', 'Torah commentator, kabbalist', 'other'),
  ];

  // Only add entries that don't already exist
  for (const entry of newEntries) {
    const exists = tzaddikim.some(tz =>
      tz.yahrzeit_month === entry.yahrzeit_month &&
      tz.yahrzeit_day === entry.yahrzeit_day &&
      (tz.name.includes(entry.name.split('(')[0].trim().split(' ').pop()) ||
       tz.hebrew_name === entry.hebrew_name)
    );
    if (!exists) {
      tzaddikim.push(entry);
    } else {
      console.log(`  Skipped (exists): ${entry.name}`);
    }
  }

  // Sort by month order then day
  const monthOrder = ['Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul',
    'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', "Sh'vat", 'Adar', 'Adar II'];

  tzaddikim.sort((a, b) => {
    const ma = monthOrder.indexOf(a.yahrzeit_month);
    const mb = monthOrder.indexOf(b.yahrzeit_month);
    if (ma !== mb) return ma - mb;
    return parseInt(a.yahrzeit_day) - parseInt(b.yahrzeit_day);
  });

  // Write back
  db.all_tzaddikim = tzaddikim;
  db.metadata.total_count = tzaddikim.length;
  db.metadata.filter_date = new Date().toISOString();
  db.metadata.version = '4.0-expanded';

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

  console.log(`\nFinal entries: ${tzaddikim.length}`);

  // Count by month
  const byMonth = {};
  for (const tz of tzaddikim) {
    byMonth[tz.yahrzeit_month] = (byMonth[tz.yahrzeit_month] || 0) + 1;
  }
  console.log('By month:', JSON.stringify(byMonth));
}

main();
