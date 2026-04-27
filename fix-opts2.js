import fs from 'fs';
let content = fs.readFileSync('src/components/AdvancedSearchOptions.astro', 'utf8');

content = content.replace(/\\}\\);\\s*\\}\\);\\s*\\/\\/ Apply advanced options/, '});\n\n  // Apply advanced options');

fs.writeFileSync('src/components/AdvancedSearchOptions.astro', content);
