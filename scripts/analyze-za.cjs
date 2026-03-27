const fs = require('fs');
const path = '/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/zimras-haaretz/';

// Section 2
const d2 = JSON.parse(fs.readFileSync(path + 'section-2.json', 'utf8'));
console.log('Section 2: segments=' + d2.segments.length);
d2.segments.forEach(s => {
  if ((s.he || '').match(/^סימן/)) {
    console.log('SIMAN seg ' + s.index + ': ' + s.he.substring(0, 80));
  }
});

console.log('\n--- Section 3 ---');
const d3 = JSON.parse(fs.readFileSync(path + 'section-3.json', 'utf8'));
console.log('Section 3: segments=' + d3.segments.length);
d3.segments.forEach(s => {
  if ((s.he || '').match(/^סימן|^לקוטי תנינא|^תנינא|^סיפורים|^שיחות|^פרפראות/)) {
    console.log('HEADING seg ' + s.index + ': ' + s.he.substring(0, 80));
  }
});
