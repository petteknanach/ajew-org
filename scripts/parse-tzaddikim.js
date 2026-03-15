// Parse tzaddikim-yahrzeit-editable.txt and convert to JSON database
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseTzaddikimFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const tzaddikim = [];
  let currentMonth = '';
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim() === '' || line.trim().startsWith('#')) {
      // Check for month headers
      if (line.includes('TISHREI') || line.includes('CHESHVAN') || line.includes('KISLEV') || 
          line.includes('TEVET') || line.includes('SHEVAT') || line.includes('ADAR') ||
          line.includes('NISAN') || line.includes('IYAR') || line.includes('SIVAN') ||
          line.includes('TAMMUZ') || line.includes('AV') || line.includes('ELUL')) {
        currentMonth = line.split('(')[0].trim().toUpperCase();
      }
      continue;
    }
    
    // Parse pipe-separated format: Name | Hebrew Name | Yahrzeit | Year | Notes
    const parts = line.split('|').map(part => part.trim());
    
    if (parts.length >= 3) {
      const tzaddik = {
        name: parts[0],
        hebrew_name: parts[1] || '',
        yahrzeit_hebrew: parts[2] || '',
        yahrzeit_month: currentMonth,
        year_passed: parts[3] || null,
        notes: parts[4] || '',
        category: determineCategory(parts[0], parts[4] || ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      tzaddikim.push(tzaddik);
    }
  }
  
  return tzaddikim;
}

function determineCategory(name, notes) {
  const nameLower = name.toLowerCase();
  const notesLower = notes.toLowerCase();
  
  if (nameLower.includes('adam') || nameLower.includes('noah') || nameLower.includes('abraham') ||
      nameLower.includes('moses') || nameLower.includes('david') || nameLower.includes('solomon')) {
    return 'biblical';
  }
  
  if (nameLower.includes('hillel') || nameLower.includes('akiva') || nameLower.includes('shimon') ||
      nameLower.includes('meir') || nameLower.includes('yehuda') || nameLower.includes('rabbi akiva')) {
    return 'talmudic';
  }
  
  if (nameLower.includes('rashi') || nameLower.includes('rambam') || nameLower.includes('ramban') ||
      nameLower.includes('tosafot') || nameLower.includes('rishonim')) {
    return 'rishonim';
  }
  
  if (nameLower.includes('baal shem tov') || nameLower.includes('maggid') || 
      nameLower.includes('chassidic') || nameLower.includes('rebbe')) {
    return 'chassidic';
  }
  
  if (nameLower.includes('breslov') || nameLower.includes('nachman') || nameLower.includes('noson') ||
      nameLower.includes('chazan') || nameLower.includes('saba') || nameLower.includes('bender')) {
    return 'breslov';
  }
  
  if (nameLower.includes('lubavitch') || nameLower.includes('chabad') || nameLower.includes('schneerson')) {
    return 'chabad';
  }
  
  if (nameLower.includes('sephardic') || nameLower.includes('ben ish chai') || 
      nameLower.includes('ovadia') || nameLower.includes('baghdad')) {
    return 'sephardic';
  }
  
  if (nameLower.includes('lithuanian') || nameLower.includes('vilna') || nameLower.includes('gra') ||
      nameLower.includes('volozhin') || nameLower.includes('chafetz chaim') || nameLower.includes('chazon ish')) {
    return 'lithuanian';
  }
  
  return 'other';
}

function convertToDatabaseFormat(tzaddikim) {
  // Group by month for easier processing
  const byMonth = {};
  
  tzaddikim.forEach(tzaddik => {
    const month = tzaddik.yahrzeit_month || 'UNKNOWN';
    if (!byMonth[month]) {
      byMonth[month] = [];
    }
    byMonth[month].push(tzaddik);
  });
  
  return {
    metadata: {
      total_count: tzaddikim.length,
      last_updated: new Date().toISOString(),
      source_file: 'tzaddikim-yahrzeit-editable.txt'
    },
    by_month: byMonth,
    all_tzaddikim: tzaddikim
  };
}

// Main execution
const inputFile = path.join(__dirname, '../../tzaddikim-yahrzeit-editable.txt');
const outputFile = path.join(__dirname, '../public/data/tzaddikim-database.json');

try {
  console.log('Parsing tzaddikim file...');
  const tzaddikim = parseTzaddikimFile(inputFile);
  console.log(`Found ${tzaddikim.length} tzaddikim`);
  
  const database = convertToDatabaseFormat(tzaddikim);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write JSON database
  fs.writeFileSync(outputFile, JSON.stringify(database, null, 2));
  console.log(`Database written to: ${outputFile}`);
  
  // Also create a CSV version for easy import
  const csvFile = outputFile.replace('.json', '.csv');
  const csvHeader = 'name,hebrew_name,yahrzeit_hebrew,yahrzeit_month,year_passed,notes,category\n';
  const csvRows = tzaddikim.map(t => 
    `"${t.name}","${t.hebrew_name}","${t.yahrzeit_hebrew}","${t.yahrzeit_month}",${t.year_passed || ''},"${t.notes}","${t.category}"`
  ).join('\n');
  
  fs.writeFileSync(csvFile, csvHeader + csvRows);
  console.log(`CSV written to: ${csvFile}`);
  
  // Create summary statistics
  const categories = {};
  tzaddikim.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + 1;
  });
  
  console.log('\nCategory Statistics:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });
  
} catch (error) {
  console.error('Error parsing tzaddikim file:', error);
  process.exit(1);
}