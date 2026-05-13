// Create filtered database according to Simcha's rules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load existing database
const dbPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log(`Total tzaddikim in database: ${db.all_tzaddikim.length}`);

// Filtering rules:
// 1. Biblical figures (until ~400 CE)
// 2. Talmudic sages (until ~500 CE)  
// 3. Rishonim (medieval, until ~1500 CE)
// 4. Baal Shem Tov (d. 1760) and his direct disciples
// 5. Rabbi Nachman of Breslov (d. 1810) and his direct disciples
// 6. Anyone else needs approval

// Helper function to check if a tzaddik should be included
function shouldInclude(tzaddik) {
  const name = tzaddik.name || '';
  const hebrewName = tzaddik.hebrew_name || '';
  const year = tzaddik.year_passed ? parseInt(tzaddik.year_passed) : null;
  const notes = tzaddik.notes || '';
  const lowerName = name.toLowerCase();
  const lowerHebrew = hebrewName.toLowerCase();
  const lowerNotes = notes.toLowerCase();
  
  // List of explicitly approved names (Baal Shem Tov and disciples, Rabbi Nachman and disciples)
  const approvedNames = [
    // Baal Shem Tov and family
    'baal shem tov', 'בעל שם טוב', 'רבי ישראל בעל שם טוב',
    'r. gershon kitover', 'רבי גרשון מקיטוב', 'גרשון קיטובר',
    
    // Baal Shem Tov's disciples
    'maggid of mezritch', 'מגיד ממזריטש', 'רבי דוב בער',
    'rebbe nachman of horodenka', 'רבי נחמן מהורודנקה',
    'r. yaakov yosef', 'רבי יעקב יוסף', 'jacob joseph of polonne',
    'r. pinchas', 'רבי פנחס', 'pinchas of koretz',
    'r. levi yitzchak', 'רבי לוי יצחק', 'levi yitzchak of berdichev',
    'r. zusha', 'רבי זושא', 'zusha of anipoli',
    'r. elimelech', 'רבי אלימלך', 'elimelech of lizhensk',
    'r. menachem mendel', 'רבי מנחם מנדל', 'menachem mendel of vitebsk',
    
    // Rabbi Nachman and disciples
    'rebbe nachman', 'רבי נחמן', 'נחמן מברסלב',
    'reb noson', 'רבי נתן', 'נתן שטרנהרץ',
    'r. nussun', 'רבי ניסן', 'nussun of bretslev',
    
    // Other early Breslov
    'r. avraham sternhartz', 'רבי אברהם שטרנהרץ',
    'r. shmuel horowitz', 'רבי שמואל הורביץ',
    
    // Biblical figures (partial list)
    'adam', 'noah', 'abraham', 'isaac', 'jacob', 'moses', 'aaron', 'david', 'solomon',
    'adam', 'נח', 'אברהם', 'יצחק', 'יעקב', 'משה', 'אהרון', 'דוד', 'שלמה',
    
    // Prophets
    'obadiah', 'עובדיה', 'elijah', 'אליהו', 'elisha', 'אלישע', 'jeremiah', 'ירמיהו',
    'ezekiel', 'יחזקאל', 'isaiah', 'ישעיהו',
    
    // Talmudic
    'hillel', 'שמאי', 'akiva', 'עקיבא', 'shimon bar yochai', 'שמעון בר יוחאי',
    
    // Rishonim
    'rashi', 'רש"י', 'rambam', 'רמב"ם', 'ramban', 'רמב"ן', 'tosafot', 'תוספות'
  ];
  
  // Check if name matches approved list
  for (const approved of approvedNames) {
    if (lowerName.includes(approved) || lowerHebrew.includes(approved)) {
      return true;
    }
  }
  
  // Check by year
  if (year) {
    // Biblical/Talmudic (before 500 CE)
    if (year < 500) return true;
    
    // Rishonim (500-1500 CE)
    if (year >= 500 && year <= 1500) return true;
    
    // Baal Shem Tov era (1700-1760)
    if (year >= 1700 && year <= 1760) {
      // Only include if connected to Baal Shem Tov
      if (lowerName.includes('baal shem') || lowerName.includes('בעל שם') ||
          lowerHebrew.includes('בעל שם') || lowerNotes.includes('בעל שם')) {
        return true;
      }
    }
    
    // Rabbi Nachman era (1770-1810)
    if (year >= 1770 && year <= 1810) {
      // Only include if connected to Rabbi Nachman
      if (lowerName.includes('nachman') || lowerName.includes('נחמן') ||
          lowerHebrew.includes('נחמן') || lowerNotes.includes('נחמן')) {
        return true;
      }
    }
    
    // Early Breslov (until ~1850)
    if (year > 1810 && year <= 1850) {
      // Only include if connected to Breslov
      if (lowerName.includes('breslov') || lowerName.includes('ברסלב') ||
          lowerHebrew.includes('ברסלב') || lowerNotes.includes('ברסלב') ||
          lowerName.includes('sternhartz') || lowerHebrew.includes('שטרנהרץ')) {
        return true;
      }
    }
  }
  
  // If no year but has "הנביא" (the prophet) or "אבינו" (our father) - likely biblical
  if (lowerHebrew.includes('הנביא') || lowerHebrew.includes('אבינו') || lowerHebrew.includes('אמנו')) {
    return true;
  }
  
  // Default: exclude (needs approval)
  return false;
}

// Apply filter
const filteredTzaddikim = db.all_tzaddikim.filter(shouldInclude);

console.log(`After filtering: ${filteredTzaddikim.length} tzaddikim`);
console.log(`Filtered out: ${db.all_tzaddikim.length - filteredTzaddikim.length} tzaddikim`);

// Create filtered database
const filteredDb = {
  all_tzaddikim: filteredTzaddikim,
  metadata: {
    total_count: filteredTzaddikim.length,
    sources: db.metadata?.sources || [],
    filtered: true,
    filter_date: new Date().toISOString(),
    filter_rules: 'Biblical+Talmudic+Rishonim+BaalShemTov+disciples+RabbiNachman+disciples only',
    original_count: db.all_tzaddikim.length,
    version: '3.0-filtered'
  }
};

// Save filtered database
const filteredPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database-filtered.json');
fs.writeFileSync(filteredPath, JSON.stringify(filteredDb, null, 2), 'utf8');
console.log(`Filtered database saved to: ${filteredPath}`);

// Also create a "needs approval" list
const needsApproval = db.all_tzaddikim.filter(t => !shouldInclude(t));
console.log(`\nTzaddikim needing approval (${needsApproval.length}):`);
needsApproval.slice(0, 20).forEach(t => {
  console.log(`- ${t.name} ${t.hebrew_name ? `(${t.hebrew_name})` : ''} ${t.year_passed ? `[${t.year_passed}]` : ''}`);
});
if (needsApproval.length > 20) {
  console.log(`... and ${needsApproval.length - 20} more`);
}

// Update the main database metadata to indicate filtering was applied
db.metadata = db.metadata || {};
db.metadata.filtered_version_available = true;
db.metadata.filtered_count = filteredTzaddikim.length;
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`\nMain database updated with metadata`);