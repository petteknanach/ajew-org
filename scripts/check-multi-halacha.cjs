#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Check if HTML files contain multiple halachos
// Look at the largest files
const files = [
  '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos/Likutay Halachos - Yoreh Daya - 1/400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html',
  '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos/Likutay Halachos - Yoreh Daya - 2/210 Hilchos_Sefer_Torah_and_Mezuzah_Likutay_Halachos - fill in orla 5 and chala 26-33 in pidyon bichor 5 - replace pidyon bichor 2.html',
  '/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos/Lik Halachos - Yoreh Daya - 1/190 LH_YD_meat milk 5 - taaruvos - maachalei_akum_hechsher_keilim (1).html',
];

for (const f of files) {
  if (!fs.existsSync(f)) { console.log('NOT FOUND:', f); continue; }
  const content = fs.readFileSync(f, 'utf8');
  const title = content.match(/<title>(.*?)<\/title>/i);
  const paras = (content.match(/<p[^>]*>/gi) || []).length;
  
  // Check for h3 headers (which might indicate sub-sections)
  const h3 = content.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];
  
  console.log(`\n${path.basename(f)}:`);
  console.log(`  Title: ${title ? title[1].substring(0, 60) : 'N/A'}`);
  console.log(`  Paragraphs: ${paras}`);
  console.log(`  H3 headers: ${h3.length}`);
  for (const h of h3.slice(0, 5)) {
    console.log(`    ${h.replace(/<[^>]+>/g, '').trim().substring(0, 60)}`);
  }
  
  // Check if the file mentions multiple halacha numbers
  const halachaNums = [...new Set((content.match(/Halacha\s+(\d+)/gi) || []).map(m => m.replace(/Halacha\s+/i, '')))];
  if (halachaNums.length > 1) {
    console.log(`  Halacha numbers mentioned: ${halachaNums.join(', ')}`);
  }
}
