const fs = require('fs');
const path = require('path');

const READER_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// For each torah file, rebuild aligned_segments from the now-correctly-aligned segments
let updated = 0;

for (let part = 1; part <= 8; part++) {
  const partDir = path.join(READER_BASE, `part-${part}`);
  if (!fs.existsSync(partDir)) continue;
  
  const files = fs.readdirSync(partDir).filter(f => f.startsWith('torah-'));
  
  for (const file of files) {
    const filePath = path.join(partDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (data.segments) {
      // Rebuild aligned_segments with proper he/en alignment
      data.aligned_segments = data.segments.map((seg, i) => ({
        index: seg.index || i,
        he: seg.he || '',
        en: seg.en || '',
        he_nikud: seg.he_nikud || seg.he || ''
      }));
      updated++;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
  }
}

console.log(`Updated aligned_segments in ${updated} files`);
