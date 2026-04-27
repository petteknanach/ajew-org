import fs from 'fs';
let content = fs.readFileSync('src/components/AdvancedSearchOptions.astro', 'utf8');

// The faulty replacement was: content = content.replace(/document\.getElementById\('selectBreslovOnly'\)[\s\S]*?\}\);/, '');
// We will restore the original file and do it right this time.
