/**
 * Enrich tzaddikim database with death years for well-known figures.
 * Uses a curated map of known death years (Gregorian CE) matched by name patterns.
 * Only updates entries that have empty year_passed fields.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database.json');

// Known death years mapped to name-matching patterns.
// Each entry: [arrayOfPatterns, yearString, optionalNotes]
// Patterns match against both 'name' and 'hebrew_name' fields (case-insensitive).
// Year is Gregorian CE unless noted otherwise.
const KNOWN_YEARS = [
  // ===== BIBLICAL FIGURES (Hebrew calendar years from tradition) =====
  // For biblical figures we use traditional Hebrew year or approximate BCE
  [['Adam', 'אדם'], '930 AM', 'First man, died year 930 from creation per tradition'],
  [['Noah', 'נח'], '2006 AM', 'Died year 2006 from creation per tradition'],
  [['Abraham', 'אברהם'], '1813 BCE', 'Per traditional chronology ~1813 BCE'],
  [['Sarah', 'שרה'], '1676 BCE', 'Per traditional chronology'],
  [['Isaac', 'יצחק'], '1653 BCE', 'Second Patriarch'],
  [['Rebecca', 'רבקה'], '', ''], // uncertain date
  [['Jacob', 'יעקב'], '1505 BCE', 'Third Patriarch, per traditional chronology'],
  [['Joseph', 'יוסף'], '1445 BCE', 'Son of Jacob'],
  [['Rachel', 'רחל'], '1553 BCE', 'Matriarch'],
  [['Miriam', 'מרים'], '1274 BCE', 'Prophetess, sister of Moses'],
  [['Moses', 'משה רבינו', 'משה'], '1273 BCE', 'Lawgiver, 7 Adar'],
  [['Aaron', 'אהרון', 'אהרן'], '1273 BCE', 'First High Priest, 1 Av'],
  [['Joshua', 'יהושע בן נון', 'יהושע'], '1245 BCE', 'Successor of Moses'],
  [['Samuel', 'שמואל הנביא'], '878 BCE', 'Prophet'],
  [['King David', 'דוד המלך', 'Dovid Hamelech'], '837 BCE', 'Author of Psalms'],
  [['King Solomon', 'שלמה המלך'], '797 BCE', 'Built First Temple'],
  [['Isaiah', 'ישעיהו'], '~700 BCE', 'Prophet'],
  [['Jeremiah', 'ירמיהו'], '~570 BCE', 'Prophet'],
  [['Ezekiel', 'יחזקאל'], '~570 BCE', 'Prophet'],
  [['Elisha', 'אלישע'], '~840 BCE', 'Prophet, student of Elijah'],
  [['Obadiah', 'עובדיה'], '~580 BCE', 'Biblical prophet'],

  // ===== MISHNAIC / TALMUDIC PERIOD =====
  [['Hillel the Elder', 'הלל הזקן'], '~10 CE', 'Nasi, Golden Rule'],
  [['Shammai', 'שמאי'], '~30 CE', 'Zug with Hillel'],
  [['Rabban Gamliel the Elder', 'רבן גמליאל הזקן'], '~52 CE', 'Grandson of Hillel'],
  [['Rabbi Akiva', 'רבי עקיבא'], '~135 CE', 'Martyred by Romans'],
  [['Rabbi Shimon bar Yochai', 'רשב"י', 'רבי שמעון בר יוחאי'], '~160 CE', 'Author of Zohar, Lag BaOmer'],
  [['Rabbi Meir Baal HaNes', 'רבי מאיר בעל הנס', 'רבי מאיר'], '~170 CE', 'Tanna'],
  [['Rabbi Yehuda HaNasi', 'רבי יהודה הנשיא', 'רבי'], '~217 CE', 'Compiled Mishnah'],
  [['Rav (Abba Arikha)', 'רב'], '~247 CE', 'Founded Sura academy'],
  [['Shmuel (Amora)', 'שמואל'], '~254 CE', 'Astronomer, Amora in Nehardea'],
  [['Abaye', 'אביי'], '~339 CE', 'Amora, 4th generation'],
  [['Rava', 'רבא'], '~352 CE', 'Amora, 4th generation'],
  [['Rav Ashi', 'רב אשי'], '~427 CE', 'Compiled Babylonian Talmud'],
  [['Rav Yonasan ben Uziel', 'יונתן בן עוזיאל'], '~30 CE', 'Student of Hillel, Targum'],

  // ===== GEONIM =====
  [['Rav Saadia Gaon', 'רב סעדיה גאון', 'Saadiah'], '942', 'Gaon of Sura'],
  [['Rav Hai Gaon', 'רב האי גאון'], '1038', 'Last major Gaon'],
  [['Rav Sherira Gaon', 'רב שרירא גאון'], '1006', 'Gaon of Pumbedita'],

  // ===== RISHONIM =====
  [['Rashi', 'רש"י', 'רש״י'], '1105', 'Commentator par excellence'],
  [['Rabbeinu Tam', 'רבנו תם'], '1171', 'Grandson of Rashi, Tosafist'],
  [['Rambam', 'רמב"ם', 'Maimonides', 'רמב״ם'], '1204', 'Philosopher, Mishneh Torah'],
  [['Ramban', 'רמב"ן', 'Nachmanides', 'רמב״ן'], '1270', 'Commentator, Kabbalist'],
  [['Rabbeinu Yonah', 'רבנו יונה'], '1263', 'Shaarei Teshuvah'],
  [['Rabbeinu Asher', 'Rosh', 'הרא"ש', 'רבנו אשר'], '1327', 'Legalist'],
  [['Rashba', 'רשב"א'], '1310', 'Rabbi Shlomo ben Aderet'],
  [['Rosh', 'הרא"ש'], '1327', ''], // same as Rabbeinu Asher
  [['Rabbi Yosef Karo', 'רבי יוסף קארו', 'Beis Yosef'], '1575', 'Shulchan Aruch'],
  [['Rabbi Moshe Isserles', 'Rema', 'רבי משה איסרליש', 'הרמ"א'], '1572', 'Mappah on Shulchan Aruch'],
  [['Rav Ovadia Bartenura', 'Bartenura', 'ברטנורא'], '1516', 'Mishna commentary'],
  [['Malbim', 'מלבי"ם'], '1879', 'Biblical commentator'],

  // ===== KABBALISTS =====
  [['Ramak', 'רמ"ק', 'Rabbi Moshe Cordovero', 'רמ״ק'], '1570', 'Kabbalist, Pardes Rimonim'],
  [['Arizal', 'אריז"ל', 'Rabbi Isaac Luria', 'אריז״ל'], '1572', 'Lurianic Kabbalah'],
  [['Rabbi Chaim Vital', 'רבי חיים ויטאל'], '1620', 'Student of Arizal'],
  [['Rabbi Shalom Sharabi', 'Rashash', 'רבי שלום שרעבי'], '1777', 'Kabbalist'],

  // ===== EARLY ACHARONIM =====
  [['Maharal', 'מהר"ל', 'מהר״ל'], '1609', 'Prague, Golem'],
  [['Shach', 'ש"ך', 'Rabbi Shabtai HaKohen', 'ש״ך'], '1663', 'Commentary on Shulchan Aruch'],
  [['Taz', 'ט"ז', 'Rabbi David HaLevi', 'ט״ז'], '1667', 'Commentary on Shulchan Aruch'],
  [['Magen Avraham', 'מגן אברהם', 'Rabbi Avraham Gombiner'], '1683', 'Commentator'],
  [['Rabbi Shlomo Luria', 'Maharshal', 'מהרש"ל', 'רבי שלמה לוריא'], '1573', 'Yam Shel Shlomo'],
  [['Rav Shlomo Kluger'], '1869', 'Prolific author'],

  // ===== CHASSIDIC MASTERS =====
  [['Baal Shem Tov', 'בעל שם טוב', 'Besht'], '1760', 'Founder of Hasidism'],
  [['Maggid of Mezritch', 'המגיד ממזריטש', 'Rabbi Dov Ber'], '1772', 'Successor to Besht'],
  [['Rabbi Elimelech of Lizhensk', 'רבי אלימלך מליז\'נסק', 'Noam Elimelech'], '1787', 'Noam Elimelech'],
  [['Rabbi Nachum of Chernobyl', 'רבי נחום מצ\'רנוביל'], '1797', 'Meor Einayim'],
  [['Rabbi Pinchas of Koretz', 'רבי פנחס מקוריץ'], '1791', 'Student of Besht'],
  [['Rabbi Yaakov Yosef of Polonne', 'רבי יעקב יוסף מפולנאה'], '1782', 'Toldos Yaakov Yosef'],
  [['Rabbi Levi Yitzchak of Berdichev', 'רבי לוי יצחק מברדיצ\'ב', 'Kedushas Levi'], '1809', 'Kedushas Levi'],
  [['Rabbi Nachman of Horodenka', 'רבי נחמן מהורודנקה'], '1765', 'Grandfather of R Nachman'],
  [['Rabbi Zusha of Anipoli', 'רבי זושא מאניפולי'], '1800', 'Brother of R Elimelech'],
  [['Rabbi Schneur Zalman of Liadi', 'Alter Rebbe', 'רבי שניאור זלמן מלאדי', 'בעל התניא'], '1812', 'Tanya, founder of Chabad'],
  [['Rabbi Menachem Mendel of Kotzk', 'Kotzker Rebbe', 'קוצקר'], '1859', 'Kotzker Rebbe'],
  [['Rabbi Tzvi Elimelech of Dinov', 'דינוב', 'Bnei Yissachar'], '1841', 'Bnei Yissachar'],
  [['Chiddushei HaRim', 'Ger', 'Yitzchak Meir Alter'], '1866', 'First Gerrer Rebbe'],
  [['Sfas Emes', 'שפת אמת', 'Yehudah Aryeh Leib Alter'], '1905', 'Second Gerrer Rebbe'],
  [['Rabbi Yisrael of Ruzhin', 'רבי ישראל מרוז\'ין', 'Ruzhiner'], '1850', 'Ruzhiner dynasty'],
  [['Rabbi Chaim of Sanz', 'סאנז', 'Divrei Chaim'], '1876', 'Sanzer Rebbe'],
  [['Rabbi Yehoshua of Belz', 'בעלז'], '1894', 'First Belzer Rebbe'],

  // ===== BRESLOV =====
  [['Rebbe Nachman of Breslov', 'רבי נחמן מברסלב'], '1810', 'Founder of Breslov'],
  [['Reb Noson of Breslov', 'רבי נתן מברסלב', 'Reb Nosson'], '1844', 'Chief disciple'],
  [['Rabbi Nachman of Tulchin', 'רבי נחמן מטולטשין'], '1884', 'Breslov leader'],
  [['Rabbi Alter of Teplik', 'רבי אלטר מטעפליק'], '1919', 'Meshivas Nefesh'],
  [['Rabbi Avraham Chazan', 'רבי אברהם חזן'], '1917', 'Son of Reb Noson'],
  [['Rabbi Avraham Sternhartz', 'רבי אברהם שטרנהרץ'], '1955', 'Breslov leader in Jerusalem'],
  [['Saba Yisroel', 'הסבא ישראל בער אודעסר', 'Odesser'], '1994', 'Na Nach'],
  [['Rabbi Yisrael Karduner', 'רבי ישראל קרדונר'], '1919', 'Breslov in Eretz Yisrael'],
  [['Rabbi Shmuel Horowitz', 'רבי שמואל הורוויץ'], '1973', 'Breslov Jerusalem'],

  // ===== LITHUANIAN / MISNAGDIM =====
  [['Rabbi Eliyahu of Vilna', 'Vilna Gaon', 'Gra', 'רבי אליהו מווילנה', 'הגר"א'], '1797', 'Gaon of Vilna'],
  [['Rabbi Chaim of Volozhin', 'רבי חיים מוולוז\'ין', 'Nefesh HaChaim'], '1821', 'Nefesh HaChaim'],
  [['Rabbi Akiva Eiger', 'רבי עקיבא אייגר'], '1837', 'Halachic authority'],
  [['Rabbi Moshe Sofer', 'Chatam Sofer', 'רבי משה סופר', 'חתם סופר'], '1839', 'Chatam Sofer'],
  [['Chafetz Chaim', 'חפץ חיים', 'Rabbi Yisrael Meir Kagan', 'Kagan'], '1933', 'Mishnah Berurah'],
  [['Chazon Ish', 'חזון איש', 'Rabbi Avraham Yeshaya Karelitz'], '1953', 'Halachic authority'],
  [['Rabbi Moshe Feinstein', 'רבי משה פיינשטיין', 'Igros Moshe'], '1986', 'Posek HaDor'],
  [['Rav Yerucham Levovitz'], '1936', 'Mashgiach of Mir'],
  [['Steipler', 'Rav Yaakov Yisrael Kanievsky'], '1985', 'Kehillas Yaakov'],

  // ===== SEPHARDIC LEADERS =====
  [['Rabbi Chaim ibn Attar', 'Or HaChaim', 'רבי חיים בן עטר'], '1743', 'Or HaChaim HaKadosh'],
  [['Rabbi Chaim Yosef David Azulai', 'Chida', 'רבי חיים יוסף דוד אזולאי'], '1806', 'Chida'],
  [['Rabbi Yosef Chaim of Baghdad', 'Ben Ish Chai', 'רבי יוסף חיים מבגדאד'], '1909', 'Ben Ish Chai'],
  [['Rabbi Ovadia Yosef', 'רבי עובדיה יוסף', 'Ovadia'], '2013', 'Chief Rabbi, Shas'],

  // ===== CHABAD REBBES =====
  // Alter Rebbe already listed above (1812)
  [['Mitteler Rebbe', 'Rav Dov Ber Schneuri'], '1827', '2nd Chabad Rebbe'],
  [['Tzemach Tzedek', 'Rav Menachem Mendel Schneersohn'], '1866', '3rd Chabad Rebbe'],
  [['Rebbe Maharash', 'Rav Shmuel Schneersohn'], '1882', '4th Chabad Rebbe'],
  [['Rebbe Rashab', 'Rav Shalom Dovber Schneersohn'], '1920', '5th Chabad Rebbe'],
  [['Rebbe Rayatz', 'Rav Yosef Yitzchak Schneersohn', 'Frierdiker Rebbe'], '1950', '6th Chabad Rebbe'],
  [['Lubavitcher Rebbe', 'Rav Menachem Mendel Schneerson'], '1994', '7th Chabad Rebbe'],

  // ===== MORE CHASSIDIC REBBES =====
  [['Rav Yisrael Hager', 'Ahavas Yisrael'], '1936', 'Vizhnitzer Rebbe'],
  [['Rabbi Meir Eisenstadt', 'Maharam Eish', 'Panim Meiros'], '1744', 'Panim Meiros'],
  [['Rabbi Gershon Kitover', 'רבי גרשון קיטובר'], '1761', 'Brother-in-law of Besht'],

  // ===== MORE WELL-KNOWN FIGURES =====
  [['Rav Meir Yeudah Leibush', 'Malbim'], '1879', 'Malbim commentary'],
  [['Rabbeinu Asher', 'רבנו אשר', 'Rosh'], '1327', ''],
  [['Rabbeinu Yonah of Gerondi', 'רבנו יונה'], '1263', ''],

  // Additional well-known figures from the chinuch entries
  [['Rav Dovid Pardo', '1792'], '1792', 'Chasdei Dovid'],
  [['Rav Shlomo Luria', 'Maharshal'], '1573', ''],
  [['Rav Yitzchak Yaakov Weiss'], '1989', 'Minchas Yitzchak'],
  [['Rav Zelig Reuven Bengis'], '1953', 'Av Beis Din Yerushalayim'],

  // ===== MORE WELL-KNOWN ACHARONIM =====
  [['Pri Megadim', 'Rav Yosef Teomim'], '1792', 'Commentary on SA'],
  [['Pnei Yehoshua', 'Rav Yaakov Yehoshua Falk'], '1756', 'Talmud commentary'],
  [['Noda BiYehuda', 'Rav Yechezkel Landau'], '1793', 'Prague'],
  [['Rabbi Yaakov Reischer', 'רבי יעקב ריישאר'], '1733', 'Shvus Yaakov'],
  [['Rav Chaim Yaakov Safran', 'Kamorna'], '1929', 'Kamorna Admor'],
];

/**
 * Normalize a string for matching: lowercase, remove diacritics,
 * remove common prefixes, collapse whitespace
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/['"״"]/g, '')  // remove quotes
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if an entry matches a given pattern.
 * Uses strict matching to avoid false positives like "Rabbi Aharon of Breslov" matching biblical "Aaron".
 */
function matchesPattern(entry, pattern) {
  const nameLower = normalize(entry.name);
  const hebrewLower = normalize(entry.hebrew_name);
  const patternLower = normalize(pattern);

  if (!patternLower) return false;

  // Exact match on full name
  if (nameLower === patternLower || hebrewLower === patternLower) return true;

  // For short patterns (< 8 chars), require the entry name to START with the pattern
  // or be an exact match. This prevents "אהרון" from matching "רבי אהרון מברסלב".
  if (patternLower.length < 8) {
    // Must be exact match or the full name must equal pattern with common prefixes stripped
    const prefixes = ['rabbi ', 'rav ', 'rebbe ', 'rabban ', 'king ', 'רבי ', 'רב ', 'רבן '];
    let nameStripped = nameLower;
    let hebrewStripped = hebrewLower;
    for (const p of prefixes) {
      if (nameStripped.startsWith(p)) nameStripped = nameStripped.substring(p.length);
      if (hebrewStripped.startsWith(p)) hebrewStripped = hebrewStripped.substring(p.length);
    }
    if (nameStripped === patternLower || hebrewStripped === patternLower) return true;
    return false;
  }

  // For entries with very long names (chinuch.org biographical entries), only allow exact/prefix matching
  // because their long descriptions often contain other rabbis' names as substrings
  if (nameLower.length > 80) return false;

  // For longer patterns (>= 8 chars), allow contains match but only if the name is reasonable length
  if (nameLower.includes(patternLower) || hebrewLower.includes(patternLower)) return true;

  return false;
}

function main() {
  console.log('Reading tzaddikim database...');
  const rawData = fs.readFileSync(DB_PATH, 'utf8');
  const data = JSON.parse(rawData);
  const entries = data.all_tzaddikim;

  const totalBefore = entries.filter(e => e.year_passed && e.year_passed.trim() !== '').length;
  console.log(`Total entries: ${entries.length}`);
  console.log(`Entries with year_passed before: ${totalBefore}`);
  console.log(`Entries without year_passed: ${entries.length - totalBefore}`);
  console.log('');

  let enriched = 0;
  const enrichedNames = [];

  for (const entry of entries) {
    // Skip entries that already have a year
    if (entry.year_passed && entry.year_passed.trim() !== '') continue;

    // Try each known year entry
    for (const [patterns, year, _notes] of KNOWN_YEARS) {
      if (!year) continue; // skip entries with empty year

      let matched = false;
      for (const pattern of patterns) {
        if (matchesPattern(entry, pattern)) {
          matched = true;
          break;
        }
      }

      if (matched) {
        entry.year_passed = year;
        enriched++;
        enrichedNames.push(`  ${entry.name} (${entry.hebrew_name}) -> ${year}`);
        break; // only use first match
      }
    }
  }

  const totalAfter = entries.filter(e => e.year_passed && e.year_passed.trim() !== '').length;

  console.log(`Enriched ${enriched} entries with year data.`);
  console.log(`Entries with year_passed after: ${totalAfter}`);
  console.log('');

  if (enriched > 0) {
    console.log('Enriched entries:');
    enrichedNames.forEach(n => console.log(n));
    console.log('');

    // Write back
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log('Database updated successfully.');
  } else {
    console.log('No entries to enrich.');
  }
}

main();
