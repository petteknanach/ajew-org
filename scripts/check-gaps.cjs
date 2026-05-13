#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos';
const LH_BASE = '/root/ajew-org/public/reader/likutay-halachos';

const volToPart = {
  'Likutay Halachos - Yoreh Daya - 1': 4,
  'Likutay Halachos - Yoreh Daya - 2': 5,
  'Likutay Halachos - Evven Hu-ezehr': 6,
};

for (const [vol, part] of Object.entries(volToPart)) {
  const volDir = path.join(TRANSLATIONS_BASE, vol);
  const htmlFiles = fs.existsSync(volDir) ? fs.readdirSync(volDir).filter(f => f.endsWith('.html')) : [];
  
  const pdir = path.join(LH_BASE, `part-${part}`);
  const idxFile = path.join(pdir, 'index.json');
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
  const hebFiles = idx.torahs || [];
  
  console.log(`Part ${part} (${vol}): ${htmlFiles.length} HTML files, ${hebFiles.length} Hebrew files`);
  console.log(`  Gap: ${hebFiles.length - htmlFiles.length} Hebrew files without HTML translations`);
}
