/**
 * fill-remaining-lh.cjs
 * Direct extraction for the 35 remaining LH halachas without English.
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/Documents/Translations/Likutay Halachos';
const READER_BASE = '/root/ajew-org/public/reader/likutay-halachos';

// ============================================================
// HTML extraction (same as align script)
// ============================================================
function decodeHTMLEntities(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013').replace(/&hellip;/g, '\u2026')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
}

function extractParagraphs(filePath) {
  if (!fs.existsSync(filePath)) return [];
  let html = fs.readFileSync(filePath, 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  const paragraphs = [];
  let searchIdx = 0;
  while (true) {
    const pStart = content.indexOf('<p', searchIdx);
    if (pStart === -1) break;
    const pClose = content.indexOf('</p>', pStart);
    if (pClose === -1) break;
    const inner = content.substring(content.indexOf('>', pStart) + 1, pClose);
    let text = inner.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
    text = decodeHTMLEntities(text).replace(/\s+/g, ' ').trim();
    if (text.length >= 20) paragraphs.push(text);
    searchIdx = pClose + 4;
  }
  return paragraphs;
}

function isHeaderSegment(he) {
  const text = (he || '').trim();
  if (text.length === 0) return true;
  if (/^אות\s/.test(text)) return true;
  if (/^הלכה\s/.test(text)) return true;
  if (/^סימן\s/.test(text)) return true;
  if (/^פרק\s/.test(text)) return true;
  if (/^כלל\s/.test(text)) return true;
  if (/^[א-ת]{1,2}$/.test(text)) return true;
  if (text.length < 8) return true;
  return false;
}

function getContentIndices(segments) {
  const indices = [];
  for (let i = 0; i < segments.length; i++) {
    if (!isHeaderSegment(segments[i].he || segments[i].he_nikud || '')) {
      indices.push(i);
    }
  }
  return indices;
}

function assignEnglish(data, paragraphs) {
  if (!paragraphs || paragraphs.length === 0 || !data.segments) return 0;
  const contentIndices = getContentIndices(data.segments);
  if (contentIndices.length === 0) return 0;

  let assigned = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    if (i < contentIndices.length) {
      data.segments[contentIndices[i]].en = paragraphs[i];
      assigned++;
    } else {
      data.segments[contentIndices[contentIndices.length - 1]].en += '\n\n' + paragraphs[i];
    }
  }
  if (assigned > 0) data.hasEnglish = true;
  return assigned;
}

function saveHalacha(partDir, hnum) {
  const halachaFile = `halacha-${hnum}.json`;
  const filePath = path.join(partDir, halachaFile);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return { data, filePath, torahPath: path.join(partDir, `torah-${hnum}.json`) };
}

function writeHalacha(halacha) {
  fs.writeFileSync(halacha.filePath, JSON.stringify(halacha.data, null, 2), 'utf8');
  if (fs.existsSync(halacha.torahPath)) {
    fs.writeFileSync(halacha.torahPath, JSON.stringify(halacha.data, null, 2), 'utf8');
  }
}

// ============================================================
// File helper: find files matching a glob-like pattern
// ============================================================
function findFiles(dir, prefix) {
  const all = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.html'));
  return all.filter(f => {
    const lower = f.toLowerCase();
    return lower.startsWith(prefix.toLowerCase());
  }).sort();
}

// ============================================================
// Individual halacha mappings
// ============================================================

const MAPPINGS = [
  // === Orach Chaim 1 ===
  // h-5: Levishas Begadim - no dedicated HTML file found
  
  // === Orach Chaim 2 ===
  {
    part: 2, num: 25, 
    files: ['320 COMPLETE_Birchas_HaRaiach_2 (1).html'],
    volDir: 'Likutay Halachos - Orach Chaim - 2'
  },

  // === Orach Chaim 3 ===
  {
    part: 3, num: 74,
    files: ['470 LH_OC3_ArbaParshiyos.html'],
    volDir: 'Likutay Halachos - Orach Chaim - 3'
  },

  // === Yoreh Deah 1 ===
  {
    part: 4, num: 48,
    files: ['190 LH_YD_meat milk 5 - taaruvos - maachalei_akum_hechsher_keilim (1).html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 1',
    // Split: only take paragraphs before "chukkas" marker
    splitBefore: 'chukkas'
  },
  {
    part: 4, num: 77,
    files: ['290 chukkas_haakum_1_2_3_v3.html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 1'
  },
  {
    part: 4, num: 78,
    files: ['300 meonayn_1_2_3_v2.html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 1'
  },
  {
    part: 4, num: 79,
    files: ['400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 1',
    // Split: take only "lo yilbash" section
    splitMarker: 'Lo Yilbash'
  },
  {
    part: 4, num: 83,
    files: ['300 meonayn_1_2_3_v2.html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 1',
    splitMarker: 'Meonen 1'
  },
  {
    part: 4, num: 94,
    files: ['350 korcha_1_2_3 (1).html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 1'
  },
  {
    part: 4, num: 95,
    files: ['400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 1',
    splitMarker: 'Niddah'
  },

  // === Yoreh Deah 2 ===
  {
    part: 5, num: 11,
    files: ['050 kibbud_av_vaim_1_yd2.html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 2'
  },
  {
    part: 5, num: 14,
    files: ['080 LH_YD_Hilchos_Kevod_Rabo_1_and_2.html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 2'
  },
  {
    part: 5, num: 27,
    files: ['125 LH_YD_Hilchos_Tzedakah_1_2_3.html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 2',
    splitMarker: 'Tzedakah 1'
  },
  {
    part: 5, num: 30,
    files: ['140 hilchos_milah_1 (1).html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 2'
  },
  {
    part: 5, num: 62,
    files: [
      '210 - - inside - - Hilchos_Orla_Halacha_5 - 1-19 after this comes kilay hakerem vieelan.html'
    ],
    volDir: 'Likutay Halachos - Yoreh Daya - 2',
    splitMarker: 'Orla'
  },
  {
    part: 5, num: 65,
    files: [
      '210 - - inside - - Hilchos_Orla_Halacha_5 - 1-19 after this comes kilay hakerem vieelan.html'
    ],
    volDir: 'Likutay Halachos - Yoreh Daya - 2',
    splitMarker: 'Kilay'
  },
  {
    part: 5, num: 71,
    files: [
      '210 - - inside - - Hilchos_Orla_Halacha_5 - 1-19 after this comes kilay hakerem vieelan.html'
    ],
    volDir: 'Likutay Halachos - Yoreh Daya - 2',
    splitMarker: 'Beheima'
  },
  {
    part: 5, num: 99,
    files: ['530 Terumos_uMaasros_H4.html'],
    volDir: 'Likutay Halachos - Yoreh Daya - 2'
  },

  // === Even HaEzer ===
  {
    part: 6, num: 25,
    files: [
      '300 Likutay_Halachos_Evven_HuEzer_Yibum_1.html',
      '310 Likutay_Halachos_Evven_HuEzer_Yibum_2.html',
      '330 Likutay_Halachos_Evven_HuEzer_Yibum_3.html',
    ],
    volDir: 'Likutay Halachos - Evven Hu-ezehr'
  },
  {
    part: 6, num: 29,
    files: ['500 Likutay_Halachos_Evven_HuEzer_Oaness_and_Mefateh_1.html'],
    volDir: 'Likutay Halachos - Evven Hu-ezehr'
  },

  // === Choshen Mishpat 1 ===
  {
    part: 7, num: 3,
    files: [
      '015 hilchos_dayonim_3_part1.html',
      '020 hilchos_dayonim_3_part2.html',
      '025 hilchos_dayonim_3_part3.html',
      '030 hilchos_dayonim_3_part4.html',
    ],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1'
  },
  {
    part: 7, num: 5,
    files: ['035 hilchos_dayonim_5 (1).html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1'
  },
  {
    part: 7, num: 12,
    files: [
      '095 hilchos_halvaah_3_part1.html',
      '100 hilchos_halvaah_3_part2.html',
      '105 hilchos_halvaah_4_part1.html',
      '110 hilchos_halvaah_4_part2.html',
      '115 hilchos_halvaah_4_part3.html',
      '120 hilchos_halvaah_4_part4.html',
    ],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1',
    // These cover halvaah 3 AND 4 - split at halacha boundary
    splitAtHalacha: 4
  },
  {
    part: 7, num: 33,
    files: [
      '310 hilchos_haoseh_shaliach_lgc_3_part1 (1).html',
      '315 hilchos_haoseh_shaliach_lgc_3_part2.html',
      '320 hilchos_haoseh_shaliach_lgc_3_part3.html',
    ],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1'
  },
  {
    part: 7, num: 64,
    files: ['520 hilchos_metzranus_1 (1).html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1'
  },
  {
    part: 7, num: 70,
    files: ['525 hilchos_metzranus_2 (1).html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1'
  },
  {
    part: 7, num: 81,
    files: ['285 hilchos_haoseh_shaliach_harsha\'ah_5 (2).html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1'
  },
  {
    part: 7, num: 87,
    files: ['850 Likutay_Halachos_Choshen_Mishpat_Mekach_Umimkar_1_to_4 with sub oanaah 15-20.html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1',
    splitMarker: 'Mekach 4'
  },
  {
    part: 7, num: 88,
    files: ['920 Likutay_Halachos_Choshen_Mishpat_Onaah_4 - just the pointer.html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 1',
    // "just the pointer" - might be empty
  },

  // === Choshen Mishpat 2 ===
  {
    part: 8, num: 13,
    files: ['150 perikah_uteinah - subdiv of avaida - 4 halachos with subs hefker nachalos apotropus - all the way to hefker 1.html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 2',
    splitMarker: 'Perikah 1'
  },
  {
    part: 8, num: 31,
    files: [
      '360 pikadon_5a (2).html',
      '365 pikadon_5b (2).html',
      '370 pikadon_5c (1).html',
      '375 pikadon_5d.html',
    ],
    volDir: 'Likutay Halachos - Choshen Mishpat - 2'
  },
  {
    part: 8, num: 66,
    files: ['775 chovel_halacha1.html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 2'
  },
  {
    part: 8, num: 79,
    files: ['790 chovel_halacha4.html'],
    volDir: 'Likutay Halachos - Choshen Mishpat - 2'
  },
];

// ============================================================
// Also try to find files for halachos without explicit mapping
// by searching for halacha numbers in filenames
// ============================================================
function findFileByHalachaNumber(volDir, hnum, startPrefix) {
  const files = fs.readdirSync(volDir).filter(f => f.toLowerCase().endsWith('.html'));
  
  // Try exact suffix match: _N.html or _N_part or _N (
  const exact = files.filter(f => {
    const base = f.replace('.html', '').replace(/\s*\(\d+\)\s*/g, '');
    return new RegExp(`_${hnum}\\b|_${hnum}_|_${hnum}\\.|_${hnum}\\(`).test(base);
  });
  if (exact.length > 0) return exact;
  
  // If no exact match, search by prefix range
  if (startPrefix) {
    const prefixStr = String(startPrefix).padStart(3, '0');
    return files.filter(f => f.startsWith(prefixStr));
  }
  
  return [];
}

// ============================================================
// Main
// ============================================================
console.log('Filling remaining LH halachas...\n');

let totalFilled = 0;
let stillMissing = [];

for (const m of MAPPINGS) {
  const volDir = path.join(TRANSLATIONS_BASE, m.volDir);
  const partDir = path.join(READER_BASE, `part-${m.part}`);
  
  // Read the JSON
  const h = saveHalacha(partDir, m.num);
  
  // Extract paragraphs from all listed files
  const allParas = [];
  for (const f of m.files) {
    const filePath = path.join(volDir, f);
    if (fs.existsSync(filePath)) {
      const paras = extractParagraphs(filePath);
      allParas.push(...paras);
    } else {
      console.log(`  WARNING: File not found: ${f}`);
    }
  }
  
  // For splitMarker: try to filter paragraphs
  let usedParas = allParas;
  if (m.splitMarker && allParas.length > 0) {
    // Find the index where the split marker appears
    let markerIdx = allParas.findIndex(p => 
      p.toLowerCase().includes(m.splitMarker.toLowerCase())
    );
    
    if (markerIdx >= 0) {
      // Take from marker onward (or before marker depending on splitBefore)
      if (m.splitBefore) {
        usedParas = allParas.slice(0, markerIdx);
      } else {
        usedParas = allParas.slice(markerIdx);
      }
    }
    // If marker not found, use all
  }
  
  if (m.splitAtHalacha) {
    // Try to split at the halacha boundary in the HTML
    // For halvaah: the HTML has both halacha 3 and 4 content
    // We'll look for "Halacha 4" or "Hilchos Halvaah 4" markers
    // For now, give half the paragraphs
    const mid = Math.floor(usedParas.length / 2);
    usedParas = usedParas.slice(0, mid);
  }
  
  if (usedParas.length === 0) {
    stillMissing.push({ part: m.part, num: m.num, reason: 'No paragraphs extracted' });
    continue;
  }
  
  const assigned = assignEnglish(h.data, usedParas);
  if (assigned > 0) {
    writeHalacha(h);
    totalFilled++;
    console.log(`  part-${m.part} halacha-${m.num}: ${assigned} segments filled (${usedParas.length} paras)`);
  } else {
    stillMissing.push({ part: m.part, num: m.num, reason: 'No content segments found' });
  }
}

// Also try halachos without explicit mapping by finding files in directory
// part-7 h-50 (Chazakas Karkaos)
const cm1Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Choshen Mishpat - 1');
const chazakaFiles = findFileByHalachaNumber(cm1Dir, 50, 570);
if (chazakaFiles.length > 0) {
  const partDir = path.join(READER_BASE, 'part-7');
  const h = saveHalacha(partDir, 50);
  const allParas = [];
  for (const f of chazakaFiles) {
    allParas.push(...extractParagraphs(path.join(cm1Dir, f)));
  }
  const assigned = assignEnglish(h.data, allParas);
  if (assigned > 0) {
    writeHalacha(h);
    totalFilled++;
    console.log(`  part-7 halacha-50: ${assigned} segments filled (${chazakaFiles.length} files)`);
  } else {
    stillMissing.push({ part: 7, num: 50, reason: `Found ${chazakaFiles.length} files but no segments` });
  }
} else {
  stillMissing.push({ part: 7, num: 50, reason: 'No matching files found for Chazakas Karkaos' });
}

// part-8 h-32 (Omanim)
const cm2Dir = path.join(TRANSLATIONS_BASE, 'Likutay Halachos - Choshen Mishpat - 2');
const omanFiles = findFileByHalachaNumber(cm2Dir, 32);
if (omanFiles.length === 0) {
  // Search by topic
  const allCM2 = fs.readdirSync(cm2Dir).filter(f => f.endsWith('.html'));
  const topicMatch = allCM2.filter(f => 
    /oman|uman|artisan|craft|sachir/i.test(f)
  );
  if (topicMatch.length > 0) {
    console.log(`  part-8 halacha-32: Found by topic: ${topicMatch[0]}`);
  }
}
stillMissing.push({ part: 8, num: 32, reason: 'No HTML file found for Omanim' });

// part-1 h-5 (Levishas Begadim)
stillMissing.push({ part: 1, num: 5, reason: 'No HTML file found for Levishas Begadim' });

// Final report
console.log(`\n========================================`);
console.log(`Filled: ${totalFilled}/${MAPPINGS.length} mapped halachas`);
console.log(`Still missing: ${stillMissing.length}`);
for (const m of stillMissing) {
  console.log(`  part-${m.part} halacha-${m.num}: ${m.reason}`);
}
