// Integrate all tzaddikim sources: editable file + chinuch.org data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load chinuch.org data
const chinuchPath = path.join(__dirname, '..', '..', 'chinuch_yahrzeits.json');
console.log('Looking for chinuch data at:', chinuchPath);
const chinuchData = JSON.parse(fs.readFileSync(chinuchPath, 'utf8'));

// Parse our editable file
function parseEditableFile() {
  const content = fs.readFileSync(path.join(__dirname, '..', '..', 'tzaddikim-yahrzeit-editable.txt'), 'utf8');
  const lines = content.split('\n');
  const tzaddikim = [];
  
  let currentMonth = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      // Check if it's a month header
      const monthMatch = trimmed.match(/#\s*(\w+)\s*\(/);
      if (monthMatch) {
        currentMonth = monthMatch[1];
      }
      continue;
    }
    
    // Parse tzaddik line: Name | Hebrew Name | Date | Year | Notes
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 3) {
      const name = parts[0];
      const hebrewName = parts[1] || '';
      const dateStr = parts[2];
      const year = parts[3] || '';
      const notes = parts[4] || '';
      
      // Parse date: "25 Adar" or "13 Adar II"
      let hebrewMonth = '';
      let hebrewDay = '';
      let isAdarII = false;
      
      const dateMatch = dateStr.match(/(\d+)\s+(\w+)(?:\s+(\w+))?/);
      if (dateMatch) {
        hebrewDay = dateMatch[1];
        hebrewMonth = dateMatch[2];
        if (dateMatch[3] === 'II') {
          isAdarII = true;
          hebrewMonth = 'Adar II';
        }
      } else if (currentMonth) {
        // Use current month from section header
        hebrewMonth = currentMonth;
        const dayMatch = dateStr.match(/(\d+)/);
        if (dayMatch) {
          hebrewDay = dayMatch[1];
        }
      }
      
      // Determine category
      let category = 'other';
      const lowerName = name.toLowerCase();
      const lowerNotes = notes.toLowerCase();
      
      if (lowerName.includes('adam') || lowerName.includes('noah') || lowerName.includes('abraham') || 
          lowerName.includes('isaac') || lowerName.includes('jacob') || lowerName.includes('moses') ||
          lowerName.includes('aaron') || lowerName.includes('david') || lowerName.includes('solomon')) {
        category = 'biblical';
      } else if (lowerName.includes('talmud') || lowerName.includes('amora') || lowerName.includes('tanna')) {
        category = 'talmudic';
      } else if (lowerName.includes('rishon') || lowerName.includes('medieval')) {
        category = 'rishonim';
      } else if (lowerName.includes('chassid') || lowerName.includes('chasid') || lowerName.includes('rebbe')) {
        category = 'chassidic';
      } else if (lowerName.includes('breslov') || lowerName.includes('nachman') || lowerName.includes('nathan') || 
                 lowerName.includes('noson') || lowerName.includes('saba')) {
        category = 'breslov';
      } else if (lowerName.includes('chabad') || lowerName.includes('lubavitch') || lowerName.includes('schneerson')) {
        category = 'chabad';
      } else if (lowerName.includes('sephard') || lowerName.includes('mizrachi') || lowerName.includes('yemen')) {
        category = 'sephardic';
      } else if (lowerName.includes('lithuanian') || lowerName.includes('yeshiva') || lowerName.includes('gaon')) {
        category = 'lithuanian';
      }
      
      tzaddikim.push({
        name,
        hebrew_name: hebrewName,
        yahrzeit_hebrew: dateStr,
        yahrzeit_month: hebrewMonth,
        yahrzeit_day: hebrewDay,
        is_adar_ii: isAdarII,
        year_passed: year,
        notes,
        category,
        source: 'editable'
      });
    }
  }
  
  return tzaddikim;
}

// Extract tzaddikim from chinuch.org data
function extractChinuchTzaddikim() {
  const tzaddikim = [];
  
  console.log('Chinuch data type:', typeof chinuchData, 'Length:', chinuchData.length);
  
  // Debug: check first few items
  for (let i = 0; i < Math.min(5, chinuchData.length); i++) {
    console.log(`Item ${i}:`, chinuchData[i]?.name, 'day:', chinuchData[i]?.day, 'month:', chinuchData[i]?.month);
  }
  
  for (const item of chinuchData) {
    if (!item || !item.name || !item.day || !item.month) {
      // console.log('Skipping item:', item);
      continue;
    }
    
    const name = item.name;
    const hebrewName = item.hebrew_name || '';
    const day = item.day;
    const month = item.month;
    const yearInfo = item.year_info || '';
    const notes = item.notes || '';
    
    // Create yahrzeit string
    const yahrzeit = `${day} ${month}`;
    
    let hebrewMonth = month;
    let hebrewDay = day.toString();
    let isAdarII = false;
    
    // Check for Adar II
    if (hebrewMonth.includes('II') || hebrewMonth.includes('2')) {
      isAdarII = true;
      hebrewMonth = 'Adar II';
    }
    
    // Determine category (similar logic)
    let category = 'other';
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('adam') || lowerName.includes('noah') || lowerName.includes('abraham') || 
        lowerName.includes('isaac') || lowerName.includes('jacob') || lowerName.includes('moses') ||
        lowerName.includes('aaron') || lowerName.includes('david') || lowerName.includes('solomon')) {
      category = 'biblical';
    } else if (lowerName.includes('talmud') || lowerName.includes('amora') || lowerName.includes('tanna')) {
      category = 'talmudic';
    } else if (lowerName.includes('rishon') || lowerName.includes('medieval')) {
      category = 'rishonim';
    } else if (lowerName.includes('chassid') || lowerName.includes('chasid') || lowerName.includes('rebbe')) {
      category = 'chassidic';
    } else if (lowerName.includes('breslov') || lowerName.includes('nachman') || lowerName.includes('nathan') || 
               lowerName.includes('noson') || lowerName.includes('saba')) {
      category = 'breslov';
    } else if (lowerName.includes('chabad') || lowerName.includes('lubavitch') || lowerName.includes('schneerson')) {
      category = 'chabad';
    } else if (lowerName.includes('sephard') || lowerName.includes('mizrachi') || lowerName.includes('yemen')) {
      category = 'sephardic';
    } else if (lowerName.includes('lithuanian') || lowerName.includes('yeshiva') || lowerName.includes('gaon')) {
      category = 'lithuanian';
    }
    
    tzaddikim.push({
      name,
      hebrew_name: hebrewName,
      yahrzeit_hebrew: yahrzeit,
      yahrzeit_month: hebrewMonth,
      yahrzeit_day: hebrewDay,
      is_adar_ii: isAdarII,
      year_passed: '',
      notes,
      category,
      source: 'chinuch'
    });
  }
  
  return tzaddikim;
}

// Merge and deduplicate tzaddikim
function mergeTzaddikim(editableTzaddikim, chinuchTzaddikim) {
  const merged = [...editableTzaddikim];
  const nameSet = new Set(editableTzaddikim.map(t => t.name.toLowerCase()));
  
  // Add chinuch tzaddikim that aren't already in our list
  for (const tzaddik of chinuchTzaddikim) {
    const lowerName = tzaddik.name.toLowerCase();
    
    // Check if similar name already exists
    let exists = false;
    for (const existing of editableTzaddikim) {
      const existingLower = existing.name.toLowerCase();
      
      // Simple similarity check
      if (existingLower.includes(lowerName) || lowerName.includes(existingLower)) {
        exists = true;
        break;
      }
      
      // Check for key name matches
      const existingWords = existingLower.split(/\s+/);
      const newWords = lowerName.split(/\s+/);
      const commonWords = existingWords.filter(word => newWords.includes(word));
      if (commonWords.length >= 2) {
        exists = true;
        break;
      }
    }
    
    if (!exists && !nameSet.has(lowerName)) {
      merged.push(tzaddik);
      nameSet.add(lowerName);
    }
  }
  
  return merged;
}

// Main execution
console.log('Integrating all tzaddikim data...');

const editableTzaddikim = parseEditableFile();
console.log(`Found ${editableTzaddikim.length} tzaddikim from editable file`);

const chinuchTzaddikim = extractChinuchTzaddikim();
console.log(`Found ${chinuchTzaddikim.length} tzaddikim from chinuch.org`);

const allTzaddikim = mergeTzaddikim(editableTzaddikim, chinuchTzaddikim);
console.log(`Total unique tzaddikim: ${allTzaddikim.length}`);

// Create final database
const database = {
  all_tzaddikim: allTzaddikim,
  metadata: {
    total_count: allTzaddikim.length,
    sources: ['editable', 'chinuch.org'],
    generated_at: new Date().toISOString(),
    version: '2.0'
  }
};

// Write to file
const outputPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database-complete.json');
fs.writeFileSync(outputPath, JSON.stringify(database, null, 2), 'utf8');
console.log(`Database written to: ${outputPath}`);

// Also update the regular database file
const regularOutputPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database.json');
fs.writeFileSync(regularOutputPath, JSON.stringify(database, null, 2), 'utf8');
console.log(`Also updated: ${regularOutputPath}`);

// Generate statistics
const categories = {};
allTzaddikim.forEach(t => {
  categories[t.category] = (categories[t.category] || 0) + 1;
});

console.log('\nCategory Statistics:');
Object.entries(categories).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});