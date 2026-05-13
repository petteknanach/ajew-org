// Integrate ALL Hebrew names from Torat Emet file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Torat Emet file
const toratEmetPath = 'C:/Users/Pettek/Documents/yartzeit list from torat emet.txt';
console.log('Loading Torat Emet file from:', toratEmetPath);

const content = fs.readFileSync(toratEmetPath, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// Parse the file
const tzaddikim = [];
let currentMonth = '';
let currentDay = '';

// Hebrew numbers mapping
const hebrewToNumber = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16,
  'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20, 'כא': 21, 'כב': 22, 'כג': 23,
  'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30
};

// Hebrew month names mapping
const hebrewMonthToEnglish = {
  'תשרי': 'TISHREI',
  'חשון': 'CHESHVAN',
  'כסלו': 'KISLEV',
  'טבת': 'TEVET',
  'שבט': 'SHEVAT',
  'אדר': 'ADAR',
  'ניסן': 'NISAN',
  'אייר': 'IYAR',
  'סיון': 'SIVAN',
  'תמוז': 'TAMMUZ',
  'אב': 'AV',
  'אלול': 'ELUL'
};

// Function to process a tzaddik entry
function processTzaddikEntry(lineText) {
  if (!lineText || !currentMonth || !currentDay) return;
  
  // Parse the line
  const namePart = lineText.split(',')[0].trim();
  const notes = lineText.substring(lineText.indexOf(',') + 1).trim();
  
  // Extract year if present (Hebrew years)
  let year = null;
  const yearMatch = lineText.match(/תשל"ה|תשכ"ח|תשע"ב|תר"ם|תקפ"ו|תק"ע|תקע"ב|תקכ"ה|תקמ"ז|תקס"ו|תרמ"ג|תרפ"ח|תרצ"ב|תש"י|תשי"ז|תשכ"ז|תש"ם|תשמ"ו|תשנ"ד|תשע"ב/);
  
  if (yearMatch) {
    // Very rough conversion for filtering
    const hebrewYear = yearMatch[0];
    if (hebrewYear.includes('תשל') || hebrewYear.includes('תשמ') || hebrewYear.includes('תשנ') || hebrewYear.includes('תשע') || hebrewYear.includes('תשפ')) {
      year = 1900; // Contemporary
    } else if (hebrewYear.includes('תר')) {
      year = 1800; // 19th century
    } else if (hebrewYear.includes('תק')) {
      year = 1700; // 18th century
    }
  }
  
  // Convert Hebrew day to number
  const dayNumber = hebrewToNumber[currentDay] || currentDay;
  
  tzaddikim.push({
    name: namePart, // Hebrew name
    hebrew_name: namePart,
    yahrzeit_hebrew: `${currentDay} ${currentMonth}`,
    yahrzeit_month: currentMonth,
    yahrzeit_day: dayNumber.toString(),
    year_passed: year ? year.toString() : '',
    notes: notes,
    category: 'torat_emet',
    source: 'torat_emet',
    needs_review: true // All from Torat Emet need review
  });
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Skip empty lines and separators
  if (!line || line.includes('---')) continue;
  
  // Check for month header (Hebrew month names)
  if (hebrewMonthToEnglish[line]) {
    currentMonth = hebrewMonthToEnglish[line];
    currentDay = '';
    console.log('Found month:', line, '->', currentMonth);
    continue;
  }
  
  // Check for day marker: "א.", "ב.", etc. - might have entry on same line
  const dayMatch = line.match(/^([א-ת]+)\.\s*(.*)/);
  if (dayMatch) {
    currentDay = dayMatch[1];
    const afterDay = dayMatch[2].trim();
    
    // If there's text after the day marker, it's an entry
    if (afterDay) {
      processTzaddikEntry(afterDay);
    }
    continue;
  }
  
  // If we have a month and day, and this line is not empty, it's a tzaddik entry
  if (currentMonth && currentDay && line) {
    processTzaddikEntry(line);
  }
}

console.log(`\nFound ${tzaddikim.length} tzaddikim from Torat Emet`);

// Load existing filtered database
const filteredDbPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database-filtered.json');
const filteredDb = JSON.parse(fs.readFileSync(filteredDbPath, 'utf8'));

// Create a combined database with ALL Torat Emet names (for review)
const combinedTzaddikim = [...filteredDb.all_tzaddikim];

// Add Torat Emet tzaddikim that aren't already in our list
const existingNames = new Set(filteredDb.all_tzaddikim.map(t => t.hebrew_name || t.name));

let addedCount = 0;
for (const tzaddik of tzaddikim) {
  if (!existingNames.has(tzaddik.hebrew_name)) {
    combinedTzaddikim.push(tzaddik);
    existingNames.add(tzaddik.hebrew_name);
    addedCount++;
  }
}

console.log(`Added ${addedCount} new tzaddikim from Torat Emet`);
console.log(`Total in combined database: ${combinedTzaddikim.length}`);

// Save combined database for review
const combinedDb = {
  all_tzaddikim: combinedTzaddikim,
  metadata: {
    total_count: combinedTzaddikim.length,
    sources: [...(filteredDb.metadata?.sources || []), 'torat_emet_all'],
    combined: true,
    torat_emet_count: tzaddikim.length,
    filtered_count: filteredDb.all_tzaddikim.length,
    generated_at: new Date().toISOString(),
    version: '4.0-combined'
  }
};

const combinedPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-combined-review.json');
fs.writeFileSync(combinedPath, JSON.stringify(combinedDb, null, 2), 'utf8');
console.log(`Combined database saved to: ${combinedPath}`);

// Now extract "later day" names (post-1800 or contemporary) for review
console.log('\n=== EXTRACTING LATER-DAY NAMES FOR REVIEW ===');

const laterDayTzaddikim = tzaddikim.filter(t => {
  if (!t.year_passed) return false;
  const year = parseInt(t.year_passed);
  return year >= 1800; // 19th century and later
});

console.log(`Later-day tzaddikim (post-1800): ${laterDayTzaddikim.length}`);

// Group by approximate century for review
const byCentury = {
  '1800s': [],
  '1900s': [],
  '2000s': []
};

laterDayTzaddikim.forEach(t => {
  const year = parseInt(t.year_passed);
  if (year >= 2000) {
    byCentury['2000s'].push(t);
  } else if (year >= 1900) {
    byCentury['1900s'].push(t);
  } else if (year >= 1800) {
    byCentury['1800s'].push(t);
  }
});

// Save later-day list for review
const laterDayList = [];
Object.entries(byCentury).forEach(([century, tzaddikim]) => {
  if (tzaddikim.length > 0) {
    laterDayList.push(`\n=== ${century} (${tzaddikim.length}) ===`);
    tzaddikim.forEach(t => {
      laterDayList.push(`${t.name} - ${t.yahrzeit_hebrew} ${t.year_passed ? `(${t.year_passed})` : ''} - ${t.notes || ''}`);
    });
  }
});

const laterDayPath = path.join(__dirname, '..', 'public', 'data', 'later-day-tzaddikim.txt');
fs.writeFileSync(laterDayPath, laterDayList.join('\n'), 'utf8');
console.log(`Later-day tzaddikim list saved to: ${laterDayPath}`);

// Also create a simple count by month
const byMonth = {};
tzaddikim.forEach(t => {
  const month = t.yahrzeit_month;
  byMonth[month] = (byMonth[month] || 0) + 1;
});

console.log('\n=== TORAT EMET STATISTICS ===');
console.log(`Total tzaddikim: ${tzaddikim.length}`);
console.log(`Later-day (post-1800): ${laterDayTzaddikim.length}`);
console.log('\nBy month:');
Object.entries(byMonth).sort().forEach(([month, count]) => {
  console.log(`  ${month}: ${count}`);
});