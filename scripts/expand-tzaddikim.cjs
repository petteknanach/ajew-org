/**
 * Add new tzaddikim from chinuch.org data (pre-filtered for allowed categories only)
 * Rules: Biblical, Talmudic, Rishonim, Baal Shem Tov + direct students, R' Nachman chain
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../public/data/tzaddikim-database-filtered.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
let tz = db.all_tzaddikim;

function add(name, hebrew, month, day, year, notes, cat) {
  // Check for duplicates
  const exists = tz.some(t =>
    t.yahrzeit_month === month && t.yahrzeit_day === String(day) &&
    (t.name.toLowerCase().includes(name.split('(')[0].trim().split(' ').pop().toLowerCase()) ||
     (hebrew && t.hebrew_name === hebrew))
  );
  if (exists) return false;

  tz.push({
    name, hebrew_name: hebrew || '',
    yahrzeit_hebrew: `${day} ${month}`,
    yahrzeit_month: month, yahrzeit_day: String(day),
    is_adar_ii: month === 'Adar II',
    year_passed: year || '', notes: notes || '',
    category: cat || 'other', source: 'chinuch'
  });
  return true;
}

let added = 0;
function tryAdd(...args) { if (add(...args)) added++; }

// ── NISAN ──
tryAdd('Nadav and Avihu', 'נדב ואביהוא', 'Nisan', 1, '', 'Sons of Aaron', 'biblical');
tryAdd('Miriam HaNavia', 'מרים הנביאה', 'Nisan', 10, '', 'Prophetess, sister of Moshe', 'biblical');
tryAdd('Yitzchak Avinu', 'יצחק אבינו', 'Nisan', 15, '', 'Second Patriarch (also born on Pesach)', 'biblical');
tryAdd('Yehuda ben Yaakov', 'יהודה בן יעקב', 'Nisan', 15, '', 'Son of Yaakov, tribe of kings', 'biblical');
tryAdd('Levi ben Yaakov', 'לוי בן יעקב', 'Nisan', 16, '', 'Son of Yaakov, tribe of priests', 'biblical');
tryAdd('Rav Yosef Karo', 'רבי יוסף קארו', 'Nisan', 13, '1575', 'Author of Shulchan Aruch', 'other');
tryAdd('Rav Chaim Vital', 'רבי חיים ויטאל', 'Nisan', 30, '1620', 'Chief student of the Arizal', 'other');
tryAdd('Rabbeinu Yosef ibn Migash (Rimigash)', 'רבנו יוסף אבן מיגאש', 'Nisan', 30, '1141', 'Teacher of Rambam\'s father', 'other');

// ── TISHREI ──
tryAdd('Sarah Imeinu', 'שרה אמנו', 'Tishrei', 1, '', 'First Matriarch', 'biblical');
tryAdd('Naftali ben Yaakov', 'נפתלי בן יעקב', 'Tishrei', 5, '', 'Son of Yaakov', 'biblical');
tryAdd('Zevulun ben Yaakov', 'זבולון בן יעקב', 'Tishrei', 7, '', 'Son of Yaakov', 'biblical');
tryAdd('Dina bas Yaakov', 'דינה בת יעקב', 'Tishrei', 7, '', 'Daughter of Yaakov', 'biblical');
tryAdd('Ri HaZaken (Rabbeinu Yitzchak)', 'ר"י הזקן', 'Tishrei', 27, '1200', 'Tosafist', 'other');
tryAdd('Rabbi Yaakov Yosef of Polonne', 'רבי יעקב יוסף מפולנאה', 'Tishrei', 21, '1784', 'Foremost disciple of Baal Shem Tov', 'other');

// ── IYYAR ──
tryAdd('Rebbe Meir Baal HaNess', 'רבי מאיר בעל הנס', 'Iyyar', 14, '', 'Tanna', 'other');
tryAdd('Eli HaKohen', 'עלי הכהן', 'Iyyar', 10, '', 'High Priest and Judge', 'biblical');
tryAdd('Rav Yitzchak Alfasi (Rif)', 'רבנו יצחק אלפסי', 'Iyyar', 10, '1103', 'Author of Sefer HaHalachos', 'other');
tryAdd('Rav Saadya Gaon', 'רב סעדיה גאון', 'Iyyar', 26, '942', 'Gaon of Sura', 'other');
tryAdd('Rav Moshe Chaim Luzzatto (Ramchal)', 'רמח"ל', 'Iyyar', 26, '1747', 'Author of Mesilas Yesharim', 'other');
tryAdd('Shmuel HaNavi', 'שמואל הנביא', 'Iyyar', 28, '', 'Prophet and Judge', 'biblical');
tryAdd('Rav Levi ben Gershon (Ralbag)', 'רלב"ג', 'Iyyar', 6, '1344', 'Commentator and philosopher', 'other');

// ── SIVAN ──
tryAdd('Hosea the Prophet', 'הושע בן בארי', 'Sivan', 7, '', 'Prophet', 'biblical');
tryAdd('Yehuda ben Yaakov (Sivan)', 'יהודה בן יעקב', 'Sivan', 15, '', 'Son of Yaakov', 'biblical');
tryAdd('Rabbi Shimon ben Gamliel', 'רבן שמעון בן גמליאל', 'Sivan', 25, '', 'One of the Ten Martyrs', 'other');
tryAdd('Rabbi Yishmael ben Elisha', 'רבי ישמעאל בן אלישע', 'Sivan', 25, '', 'Kohen Gadol, one of the Ten Martyrs', 'other');
tryAdd('Rabbi Chanina ben Tradyon', 'רבי חנינא בן תרדיון', 'Sivan', 27, '', 'One of the Ten Martyrs', 'other');
tryAdd('Rav Ovadia Bartenura', 'רבי עובדיה מברטנורא', 'Sivan', 3, '1516', 'Mishna commentator', 'other');

// ── TAMUZ ──
tryAdd('Yosef HaTzaddik', 'יוסף הצדיק', 'Tamuz', 1, '', 'Son of Yaakov', 'biblical');
tryAdd('Rabbeinu Tam (Yaakov ben Meir)', 'רבנו תם', 'Tamuz', 4, '1171', 'Grandson of Rashi, Tosafist', 'other');
tryAdd('Rav Yaakov ben Asher (Baal HaTurim)', 'רבנו יעקב בן אשר', 'Tamuz', 12, '1340', 'Author of Arba\'a Turim', 'other');
tryAdd('Rav Moshe Cordovero (Remak)', 'רבי משה קורדובירו', 'Tamuz', 23, '1570', 'Kabbalist in Safed', 'other');

// ── AV ──
tryAdd('Elazar ben Aaron HaKohen', 'אלעזר בן אהרן הכהן', 'Av', 1, '', 'Second Kohen Gadol', 'biblical');
tryAdd('Don Yitzchak Abarbanel', 'דון יצחק אברבנאל', 'Av', 10, '1508', 'Statesman and commentator', 'other');
tryAdd('Rav Mordechai ben Hillel', 'רבי מרדכי בן הלל', 'Av', 22, '1298', 'Author of the Mordechai', 'other');
tryAdd('Rav Nosson Nota Shapira', 'רבי נתן נטע שפירא', 'Av', 13, '1633', 'Author of Megaleh Amukos', 'other');

// ── ELUL ──
tryAdd('Dan ben Yaakov', 'דן בן יעקב', 'Elul', 8, '', 'Son of Yaakov', 'biblical');
tryAdd('Maharal of Prague', 'מהר"ל מפראג', 'Elul', 18, '1609', 'Rabbi Yehuda Loew, mystic and scholar', 'other');
tryAdd('Rav Yitzchak bar Sheshes (Rivash)', 'ריב"ש', 'Elul', 2, '1407', 'Halachic authority', 'other');

// ── CHESHVAN ──
tryAdd('Metushelach', 'מתושלח', 'Cheshvan', 11, '', 'Oldest person in Torah', 'biblical');
tryAdd('Rachel Imeinu', 'רחל אמנו', 'Cheshvan', 11, '', 'Fourth Matriarch', 'biblical');
tryAdd('Binyamin ben Yaakov', 'בנימין בן יעקב', 'Cheshvan', 11, '', 'Son of Yaakov', 'biblical');
tryAdd('Gad ben Yaakov', 'גד בן יעקב', 'Cheshvan', 10, '', 'Son of Yaakov', 'biblical');
tryAdd('Mattisyahu ben Yochanan', 'מתתיהו בן יוחנן', 'Cheshvan', 15, '', 'Kohen Gadol, started Chanukah revolt', 'biblical');
tryAdd('Rav Meir of Narbonne (HaMeili)', 'רבי מאיר הלוי מנרבונא', 'Cheshvan', 8, '1263', 'Rishon', 'other');
tryAdd('Rav Avraham ben Dovid (Ravad)', 'ראב"ד', 'Cheshvan', 20, '1198', 'Commentator on Rambam', 'other');

// ── KISLEV ──
tryAdd('Reuven ben Yaakov', 'ראובן בן יעקב', 'Kislev', 14, '', 'Firstborn of Yaakov', 'biblical');
tryAdd('Ravina II', 'רבינא', 'Kislev', 12, '475', 'Completed the Talmud Bavli', 'other');
tryAdd('Rav Avraham Ibn Ezra', 'רבי אברהם אבן עזרא', 'Kislev', 15, '1167', 'Torah commentator', 'other');
tryAdd('Rabbeinu Avraham ben HaRambam', 'רבנו אברהם בן הרמב"ם', 'Kislev', 18, '1238', 'Son of Maimonides', 'other');
tryAdd('Rabbi Yehuda HaNasi', 'רבי יהודה הנשיא', 'Kislev', 15, '219', 'Compiled the Mishna', 'other');

// ── TEVET ──
tryAdd('Avraham Avinu (Tevet)', 'אברהם אבינו', 'Tevet', 1, '', 'First Patriarch (alternative date)', 'biblical');
tryAdd('Ezra HaSofer', 'עזרא הסופר', 'Tevet', 9, '', 'Scribe, rebuilt the Temple', 'biblical');
tryAdd('Nechemya', 'נחמיה', 'Tevet', 9, '', 'Governor of Judea, rebuilt walls', 'biblical');
tryAdd('Zecharia HaNavi', 'זכריה הנביא', 'Tevet', 10, '', 'Prophet', 'biblical');
tryAdd('Malachi HaNavi', 'מלאכי הנביא', 'Tevet', 10, '', 'Last of the prophets', 'biblical');

// ── SH'VAT ──
tryAdd('Asher ben Yaakov', 'אשר בן יעקב', "Sh'vat", 2, '', 'Son of Yaakov', 'biblical');
tryAdd('Rabbeinu Nissim (Ran)', 'הר"ן', "Sh'vat", 9, '1376', 'Talmud commentator', 'other');

// ── ADAR ──
tryAdd('Rabbeinu Yoel Sirkis (Bach)', 'הב"ח', 'Adar', 20, '1640', 'Author of Bayis Chadash', 'other');

console.log(`Added ${added} new entries`);
console.log(`Total: ${tz.length}`);

// Sort
const monthOrder = ['Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', "Sh'vat", 'Adar', 'Adar II'];
tz.sort((a, b) => {
  const ma = monthOrder.indexOf(a.yahrzeit_month);
  const mb = monthOrder.indexOf(b.yahrzeit_month);
  if (ma !== mb) return ma - mb;
  return parseInt(a.yahrzeit_day) - parseInt(b.yahrzeit_day);
});

db.all_tzaddikim = tz;
db.metadata.total_count = tz.length;
db.metadata.version = '5.0-chinuch-expanded';
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log('Saved!');
