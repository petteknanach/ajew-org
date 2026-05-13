// Parse Torat Emet yahrzeit list with strict filtering rules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the Torat Emet file
const toratEmetPath = path.join('C:', 'Users', 'Pettek', 'Documents', 'yartzeit list from torat emet.txt');
console.log('Loading Torat Emet file from:', toratEmetPath);

const content = fs.readFileSync(toratEmetPath, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// Parse the file
const tzaddikim = [];
let currentMonth = '';
let currentDay = '';

// Known cutoff years for filtering
const BAAL_SHEM_TOV_YEAR = 1760; // Baal Shem Tov passed away
const RABBI_NACHMAN_YEAR = 1810; // Rabbi Nachman passed away
const CUTOFF_YEAR = 1900; // Rough cutoff for "contemporary" - we'll be stricter

// Lists of approved post-BST figures (needs your approval)
const APPROVED_POST_BST = [
  'בעל שם טוב', 'Baal Shem Tov', 'רבי ישראל בעל שם טוב',
  'רבי דוב בער', 'המגיד ממזריטש',
  'רבי יעקב יוסף', 'רבי יעקב יוסף מפולנאה',
  'רבי פנחס', 'רבי פנחס מקוריץ',
  'רבי לוי יצחק', 'רבי לוי יצחק מברדיטשוב',
  'רבי נחמן', 'רבי נחמן מברסלב', 'Rebbe Nachman of Breslov',
  'רבי נתן', 'רבי נתן שטרנהרץ', 'Reb Noson of Breslov',
  'רבי זושא', 'רבי זושא מאניפולי',
  'רבי אלימלך', 'רבי אלימלך מליזנסק',
  'רבי מנחם מנדל', 'רבי מנחם מנדל מוויטבסק'
];

function isApproved(name, hebrewName, year) {
  const lowerName = name.toLowerCase();
  const lowerHebrew = (hebrewName || '').toLowerCase();
  
  // Check if it's in approved list
  for (const approved of APPROVED_POST_BST) {
    if (lowerName.includes(approved.toLowerCase()) || lowerHebrew.includes(approved.toLowerCase())) {
      return true;
    }
  }
  
  // Check if it's before Baal Shem Tov (pre-1760)
  if (year && year < BAAL_SHEM_TOV_YEAR) {
    return true;
  }
  
  // Biblical and Talmudic figures (no year or very early)
  if (!year || year < 500) {
    return true;
  }
  
  // Rishonim (medieval commentators, roughly 1000-1500)
  if (year >= 1000 && year <= 1500) {
    return true;
  }
  
  return false;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Skip empty lines
  if (!line) continue;
  
  // Check for month header (Hebrew month names)
  const monthMatch = line.match(/^([א-ת]+)$/);
  if (monthMatch && line.length < 10) { // Short Hebrew text likely a month
    currentMonth = line;
    currentDay = '';
    console.log('Found month:', currentMonth);
    continue;
  }
  
  // Check for day marker: "א.", "ב.", etc. or just Hebrew number followed by dot
  const dayMatch = line.match(/^([א-ת]+)\./);
  if (dayMatch) {
    currentDay = dayMatch[1];
    // Convert Hebrew letter to number
    const hebrewNumbers = {
      'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
      'י': 10, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16,
      'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20, 'כא': 21, 'כב': 22, 'כג': 23,
      'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30
    };
    const dayNumber = hebrewNumbers[currentDay] || currentDay;
    continue;
  }
  
  // If we have a month and day, this is likely a tzaddik entry
  if (currentMonth && currentDay && line.includes(',')) {
    // Parse the line: "רבי משה גאגין, אביו של הרב אג"ן" or "שרה אמנו ע"ה, מערת המכפלה בחברון"
    const parts = line.split(',');
    if (parts.length >= 1) {
      const namePart = parts[0].trim();
      const notes = parts.slice(1).join(',').trim();
      
      // Extract year if present (Hebrew years like תר"ם, תש"א, etc.)
      let year = null;
      let yearMatch = notes.match(/ת[א-ת]"([א-ת])/); // Simplified Hebrew year pattern
      if (!yearMatch) {
        yearMatch = namePart.match(/ת[א-ת]"([א-ת])/);
      }
      
      // Try to extract Gregorian year from notes
      const gregorianMatch = notes.match(/תשל"ה|תשכ"ח|תשע"ב|תר"ם|תקפ"ו|תק"ע|תקע"ב/);
      if (gregorianMatch) {
        // Very rough conversion - in reality need proper Hebrew-to-Gregorian conversion
        // For now, we'll use this to filter out contemporary
        const hebrewYear = gregorianMatch[0];
        // If it's a recent Hebrew year (like תשל"ה = 1975), it's contemporary
        if (hebrewYear.includes('תשל') || hebrewYear.includes('תשמ') || hebrewYear.includes('תשנ') || hebrewYear.includes('תשע') || hebrewYear.includes('תשפ')) {
          year = 1900; // Mark as contemporary
        } else if (hebrewYear.includes('תר')) {
          year = 1800; // 19th century
        } else if (hebrewYear.includes('תק')) {
          year = 1700; // 18th century
        }
      }
      
      // Determine if this should be included based on guidelines
      const hebrewName = namePart;
      const englishName = namePart; // We'll need translation, but for now use Hebrew
      
      if (isApproved(englishName, hebrewName, year)) {
        tzaddikim.push({
          name: englishName,
          hebrew_name: hebrewName,
          yahrzeit_hebrew: `${currentDay} ${currentMonth}`,
          yahrzeit_month: currentMonth,
          yahrzeit_day: currentDay,
          year_passed: year ? year.toString() : '',
          notes: notes,
          category: 'torat_emet',
          source: 'torat_emet',
          approved: true
        });
      } else {
        console.log('Filtered out (contemporary):', hebrewName, 'year:', year);
      }
    }
  }
}

console.log(`Found ${tzaddikim.length} tzaddikim from Torat Emet (after filtering)`);

// Load existing database
const existingDbPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database.json');
const existingDb = JSON.parse(fs.readFileSync(existingDbPath, 'utf8'));

// Merge (prioritize Torat Emet for overlapping entries)
const existingNames = new Set(existingDb.all_tzaddikim.map(t => t.hebrew_name || t.name));
const mergedTzaddikim = [...existingDb.all_tzaddikim];

for (const tzaddik of tzaddikim) {
  if (!existingNames.has(tzaddik.hebrew_name) && !existingNames.has(tzaddik.name)) {
    mergedTzaddikim.push(tzaddik);
  }
}

console.log(`Total after merge: ${mergedTzaddikim.length}`);

// Update database
existingDb.all_tzaddikim = mergedTzaddikim;
existingDb.metadata.torat_emet_included = true;
existingDb.metadata.torat_emet_count = tzaddikim.length;
existingDb.metadata.filtered_by_rules = true;
existingDb.metadata.rules = 'Biblical+Talmudic+Rishonim+BaalShemTov+disciples+RabbiNachman+disciples only';

fs.writeFileSync(existingDbPath, JSON.stringify(existingDb, null, 2), 'utf8');
console.log(`Updated database at: ${existingDbPath}`);

// Also create a filtered version with only approved tzaddikim
const approvedTzaddikim = mergedTzaddikim.filter(t => {
  // Keep all from Torat Emet (already filtered)
  if (t.source === 'torat_emet') return true;
  
  // Filter existing ones by same rules
  return isApproved(t.name, t.hebrew_name, t.year_passed ? parseInt(t.year_passed) : null);
});

const filteredDb = {
  all_tzaddikim: approvedTzaddikim,
  metadata: {
    total_count: approvedTzaddikim.length,
    sources: ['editable', 'chinuch.org', 'torat_emet_filtered'],
    filtered: true,
    filter_rules: 'Biblical+Talmudic+Rishonim+BaalShemTov+disciples+RabbiNachman+disciples only',
    generated_at: new Date().toISOString(),
    version: '3.0'
  }
};

const filteredPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database-filtered.json');
fs.writeFileSync(filteredPath, JSON.stringify(filteredDb, null, 2), 'utf8');
console.log(`Filtered database (approved only): ${filteredPath}`);
console.log(`Approved tzaddikim count: ${approvedTzaddikim.length}`);