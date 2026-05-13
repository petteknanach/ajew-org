// Show filtered tzaddikim list for review
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filteredDbPath = path.join(__dirname, 'public', 'data', 'tzaddikim-database-filtered.json');
const data = JSON.parse(fs.readFileSync(filteredDbPath, 'utf8'));

console.log('=== FILTERED TZADDIKIM LIST (73 total) ===');
console.log('Rules: Biblical, Talmudic, Rishonim, Baal Shem Tov & disciples, Rabbi Nachman & disciples only');
console.log('================================================================================\n');

// Group by category
const byCategory = {};
data.all_tzaddikim.forEach(t => {
  const cat = t.category || 'other';
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(t);
});

// Display by category
Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length).forEach(([category, tzaddikim]) => {
  console.log(`\n${category.toUpperCase()} (${tzaddikim.length}):`);
  console.log('='.repeat(50));
  
  tzaddikim.sort((a, b) => {
    // Sort by Hebrew month/day for easier review
    const monthOrder = {
      'TISHREI': 1, 'CHESHVAN': 2, 'KISLEV': 3, 'TEVET': 4, 'SHEVAT': 5,
      'ADAR': 6, 'ADAR II': 6.5, 'NISAN': 7, 'IYAR': 8, 'SIVAN': 9,
      'TAMMUZ': 10, 'AV': 11, 'ELUL': 12
    };
    const aMonth = tzaddikim.yahrzeit_month ? (monthOrder[tzaddikim.yahrzeit_month.toUpperCase()] || 99) : 99;
    const bMonth = tzaddikim.yahrzeit_month ? (monthOrder[tzaddikim.yahrzeit_month.toUpperCase()] || 99) : 99;
    if (aMonth !== bMonth) return aMonth - bMonth;
    return (parseInt(a.yahrzeit_day) || 0) - (parseInt(b.yahrzeit_day) || 0);
  }).forEach(t => {
    const dateStr = t.yahrzeit_hebrew ? `[${t.yahrzeit_hebrew}]` : '';
    const yearStr = t.year_passed ? `(${t.year_passed})` : '';
    const sourceStr = t.source ? `{${t.source}}` : '';
    console.log(`• ${t.name} ${t.hebrew_name ? `- ${t.hebrew_name}` : ''} ${dateStr} ${yearStr} ${sourceStr}`);
    if (t.notes) {
      console.log(`  Notes: ${t.notes}`);
    }
  });
});

console.log('\n================================================================================');
console.log('SUMMARY:');
console.log(`Total tzaddikim in filtered database: ${data.all_tzaddikim.length}`);
console.log('Filter rules applied: Biblical, Talmudic, Rishonim, Baal Shem Tov & disciples, Rabbi Nachman & disciples only');
console.log('\nNOTES:');
console.log('1. Obadiah the Prophet added with note about his one-chapter book');
console.log('2. R. Gershon Kitover (25 Adar) included as brother-in-law of Baal Shem Tov');
console.log('3. All contemporary rabbis filtered out');
console.log('4. System uses Hebcal API for accurate Hebrew dates');
console.log('5. Yahrzeit banner shows "day before" (yesterday) and "day of" (today)');