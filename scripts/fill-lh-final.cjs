/**
 * fill-lh-final.cjs
 * Final comprehensive fill of remaining LH English.
 * Handles:
 *  - <p> tags AND <div class="p"> elements
 *  - Does NOT filter out "אות" segments (they ARE content)
 *  - Precise file mapping per halacha
 */

const fs = require('fs');
const path = require('path');

const TRANS = '/mnt/c/Users/Pettek/Documents/Translations/Likutay Halachos';
const READER = '/root/ajew-org/public/reader/likutay-halachos';

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013').replace(/&hellip;/g, '\u2026')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function stripTags(inner) {
  return decodeEntities(inner.replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function extractParagraphs(filePath) {
  if (!fs.existsSync(filePath)) return [];
  let html = fs.readFileSync(filePath, 'utf8');
  const bm = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let content = bm ? bm[1] : html;
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  const paras = [];

  // Method 1: <p> tags (used in CM files)
  let idx = 0;
  while (true) {
    const s = content.indexOf('<p', idx);
    if (s === -1) break;
    const e = content.indexOf('</p>', s);
    if (e === -1) break;
    const inner = content.substring(content.indexOf('>', s) + 1, e);
    const text = stripTags(inner);
    if (text.length >= 20) paras.push(text);
    idx = e + 4;
  }

  if (paras.length >= 1) return paras;

  // Method 2: <div class="p"> (used in OC2 Birchas HaRaiach etc.)
  const divPRegex = /<div\s+class="p"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = divPRegex.exec(content)) !== null) {
    const text = stripTags(m[1]);
    if (text.length >= 20) paras.push(text);
  }

  if (paras.length >= 1) return paras;

  // Method 3: <div class="para">
  const divParaRegex = /<div\s+class="para"[^>]*>([\s\S]*?)<\/div>/gi;
  while ((m = divParaRegex.exec(content)) !== null) {
    const text = stripTags(m[1]);
    if (text.length >= 20) paras.push(text);
  }

  return paras;
}

// Check if segment is a real header (NOT content)
function isRealHeader(he) {
  const text = (he || '').trim();
  if (text.length === 0) return true;
  if (text.length < 8) return true;
  // True headers: standalone halacha/chapter markers
  if (/^הלכה\s+\d+\s*$/.test(text)) return true;
  if (/^סימן\s/.test(text)) return true;
  if (/^פרק\s/.test(text)) return true;
  if (/^כלל\s/.test(text)) return true;
  if (/^[א-ת]{1,2}$/.test(text)) return true;
  // "אות" segments ARE content — NOT headers!
  return false;
}

function getContentIndices(segments) {
  const indices = [];
  for (let i = 0; i < segments.length; i++) {
    if (!isRealHeader(segments[i].he || segments[i].he_nikud || '')) {
      indices.push(i);
    }
  }
  return indices;
}

function assignAndSave(part, num, paragraphs) {
  const fpath = path.join(READER, `part-${part}`, `halacha-${num}.json`);
  if (!fs.existsSync(fpath)) {
    console.log(`  SKIP: ${fpath} does not exist`);
    return 0;
  }
  const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  if (!data.segments || paragraphs.length === 0) return 0;

  const ci = getContentIndices(data.segments);
  if (ci.length === 0) return 0;

  let assigned = 0;
  for (let i = 0; i < Math.min(paragraphs.length, ci.length); i++) {
    data.segments[ci[i]].en = paragraphs[i];
    assigned++;
  }
  // If more paras than segments, append overflow to last
  if (paragraphs.length > ci.length) {
    const extra = paragraphs.slice(ci.length).join('\n\n');
    const lastIdx = ci[ci.length - 1];
    if (data.segments[lastIdx].en) {
      data.segments[lastIdx].en += '\n\n' + extra;
    } else {
      data.segments[lastIdx].en = extra;
    }
  }
  if (assigned > 0) data.hasEnglish = true;

  fs.writeFileSync(fpath, JSON.stringify(data, null, 2), 'utf8');
  const tpath = path.join(READER, `part-${part}`, `torah-${num}.json`);
  if (fs.existsSync(tpath)) {
    fs.writeFileSync(tpath, JSON.stringify(data, null, 2), 'utf8');
  }
  return assigned;
}

// ============================================================
// Mappings: part, num, volDir, files[]
// ============================================================
const mappings = [
  // OC1: Levishas Begadim — no HTML file found
  // OC2
  { p: 2, n: 25, v: 'Orach Chaim - 2', f: ['320 COMPLETE_Birchas_HaRaiach_2 (1).html'] },
  // OC3
  { p: 3, n: 74, v: 'Orach Chaim - 3', f: ['470 LH_OC3_ArbaParshiyos.html'] },
  // YD1
  { p: 4, n: 48, v: 'Yoreh Daya - 1', f: ['190 LH_YD_meat milk 5 - taaruvos - maachalei_akum_hechsher_keilim (1).html'] },
  { p: 4, n: 77, v: 'Yoreh Daya - 1', f: ['290 chukkas_haakum_1_2_3_v3.html'] },
  { p: 4, n: 78, v: 'Yoreh Daya - 1', f: ['300 meonayn_1_2_3_v2.html'] },
  { p: 4, n: 79, v: 'Yoreh Daya - 1', f: ['400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html'] },
  { p: 4, n: 83, v: 'Yoreh Daya - 1', f: ['300 meonayn_1_2_3_v2.html'] },
  { p: 4, n: 94, v: 'Yoreh Daya - 1', f: ['350 korcha_1_2_3 (1).html'] },
  { p: 4, n: 95, v: 'Yoreh Daya - 1', f: ['400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html'] },
  // YD2
  { p: 5, n: 11, v: 'Yoreh Daya - 2', f: ['050 kibbud_av_vaim_1_yd2.html'] },
  { p: 5, n: 14, v: 'Yoreh Daya - 2', f: ['080 LH_YD_Hilchos_Kevod_Rabo_1_and_2.html'] },
  { p: 5, n: 27, v: 'Yoreh Daya - 2', f: ['125 LH_YD_Hilchos_Tzedakah_1_2_3.html'] },
  { p: 5, n: 30, v: 'Yoreh Daya - 2', f: ['140 hilchos_milah_1 (1).html'] },
  { p: 5, n: 62, v: 'Yoreh Daya - 2', f: ['210 - - inside - - Hilchos_Orla_Halacha_5 - 1-19 after this comes kilay hakerem vieelan.html'] },
  { p: 5, n: 65, v: 'Yoreh Daya - 2', f: ['210 - - inside - - Hilchos_Orla_Halacha_5 - 1-19 after this comes kilay hakerem vieelan.html'] },
  { p: 5, n: 71, v: 'Yoreh Daya - 2', f: ['210 - - inside - - Hilchos_Orla_Halacha_5 - 1-19 after this comes kilay hakerem vieelan.html'] },
  { p: 5, n: 99, v: 'Yoreh Daya - 2', f: ['530 Terumos_uMaasros_H4.html'] },
  // EH
  { p: 6, n: 25, v: 'Evven Hu-ezehr', f: [
    '300 Likutay_Halachos_Evven_HuEzer_Yibum_1.html',
    '310 Likutay_Halachos_Evven_HuEzer_Yibum_2.html',
    '330 Likutay_Halachos_Evven_HuEzer_Yibum_3.html',
  ]},
  { p: 6, n: 29, v: 'Evven Hu-ezehr', f: ['500 Likutay_Halachos_Evven_HuEzer_Oaness_and_Mefateh_1.html'] },
  // CM1
  { p: 7, n: 3, v: 'Choshen Mishpat - 1', f: [
    '015 hilchos_dayonim_3_part1.html',
    '020 hilchos_dayonim_3_part2.html',
    '025 hilchos_dayonim_3_part3.html',
    '030 hilchos_dayonim_3_part4.html',
  ]},
  { p: 7, n: 5, v: 'Choshen Mishpat - 1', f: ['035 hilchos_dayonim_5 (1).html'] },
  { p: 7, n: 12, v: 'Choshen Mishpat - 1', f: [
    '095 hilchos_halvaah_3_part1.html',
    '100 hilchos_halvaah_3_part2.html',
  ]},
  { p: 7, n: 33, v: 'Choshen Mishpat - 1', f: [
    '310 hilchos_haoseh_shaliach_lgc_3_part1 (1).html',
    '315 hilchos_haoseh_shaliach_lgc_3_part2.html',
    '320 hilchos_haoseh_shaliach_lgc_3_part3.html',
  ]},
  { p: 7, n: 64, v: 'Choshen Mishpat - 1', f: ['520 hilchos_metzranus_1 (1).html'] },
  { p: 7, n: 70, v: 'Choshen Mishpat - 1', f: ['525 hilchos_metzranus_2 (1).html'] },
  { p: 7, n: 81, v: 'Choshen Mishpat - 1', f: ["285 hilchos_haoseh_shaliach_harsha'ah_5 (2).html"] },
  { p: 7, n: 87, v: 'Choshen Mishpat - 1', f: ['850 Likutay_Halachos_Choshen_Mishpat_Mekach_Umimkar_1_to_4 with sub oanaah 15-20.html'] },
  { p: 7, n: 88, v: 'Choshen Mishpat - 1', f: ['920 Likutay_Halachos_Choshen_Mishpat_Onaah_4 - just the pointer.html'] },
  // CM2
  { p: 8, n: 13, v: 'Choshen Mishpat - 2', f: ['150 perikah_uteinah - subdiv of avaida - 4 halachos with subs hefker nachalos apotropus - all the way to hefker 1.html'] },
  { p: 8, n: 31, v: 'Choshen Mishpat - 2', f: [
    '360 pikadon_5a (2).html',
    '365 pikadon_5b (2).html',
    '370 pikadon_5c (1).html',
    '375 pikadon_5d.html',
  ]},
  { p: 8, n: 66, v: 'Choshen Mishpat - 2', f: ['775 chovel_halacha1.html'] },
  { p: 8, n: 79, v: 'Choshen Mishpat - 2', f: ['790 chovel_halacha4.html'] },
];

// Also try to find chazakas karkaos (part-7 h-50)
// CM1 files: search for chazakas
const cm1Dir = path.join(TRANS, 'Likutay Halachos - Choshen Mishpat - 1');
const cm1Files = fs.readdirSync(cm1Dir).filter(f => f.endsWith('.html'));
const chazakaFiles = cm1Files.filter(f => /chazak/i.test(f));
if (chazakaFiles.length > 0) {
  console.log(`Found chazaka files: ${chazakaFiles.join(', ')}`);
}

console.log('Filling remaining LH halachas...\n');

let filled = 0;
let skipped = [];

for (const m of mappings) {
  const volDir = path.join(TRANS, `Likutay Halachos - ${m.v}`);
  const allParas = [];
  for (const f of m.f) {
    const fp = path.join(volDir, f);
    if (fs.existsSync(fp)) {
      const paras = extractParagraphs(fp);
      if (paras.length > 0) {
        allParas.push(...paras);
      }
    } else {
      console.log(`  WARN: ${f} — NOT FOUND`);
    }
  }

  if (allParas.length === 0) {
    skipped.push({ p: m.p, n: m.n, reason: 'No paragraphs extracted' });
    continue;
  }

  const assigned = assignAndSave(m.p, m.n, allParas);
  if (assigned > 0) {
    filled++;
    console.log(`  ✓ part-${m.p} halacha-${m.n}: ${assigned}/${allParas.length} paragraphs`);
  } else {
    skipped.push({ p: m.p, n: m.n, reason: 'No segments (all headers?)' });
  }
}

// Report
console.log(`\n========================================`);
console.log(`Filled: ${filled}/${mappings.length}`);
console.log(`Skipped: ${skipped.length}`);
for (const s of skipped) {
  console.log(`  part-${s.p} halacha-${s.n}: ${s.reason}`);
}
