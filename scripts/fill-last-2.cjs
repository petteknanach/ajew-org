// fill-last-2.cjs - Final fill: Chazakas Karkaos and Omanim
const fs = require('fs');
const path = require('path');

// Reuse extraction from fill-lh-final.cjs (inline)
function decodeEntities(text) {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013').replace(/&hellip;/g, '\u2026')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
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
  let idx = 0;
  while (true) {
    const s = content.indexOf('<p', idx); if (s === -1) break;
    const e = content.indexOf('</p>', s); if (e === -1) break;
    const inner = content.substring(content.indexOf('>', s) + 1, e);
    const text = decodeEntities(inner.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (text.length >= 20) paras.push(text);
    idx = e + 4;
  }
  if (paras.length) return paras;
  const divPRegex = /<div\s+class="p"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = divPRegex.exec(content)) !== null) {
    const text = decodeEntities(m[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (text.length >= 20) paras.push(text);
  }
  return paras;
}

const TRANS = '/mnt/c/Users/Pettek/Documents/Translations/Likutay Halachos';

const jobs = [
  {
    part: 7, num: 50,
    volDir: 'Likutay Halachos - Choshen Mishpat - 1',
    files: ['460 hilchos_chezkas_karkos_1.html', '465 hilchos_chezkas_karkos_2 1-3 24 25.html'],
  },
  {
    part: 8, num: 32,
    volDir: 'Likutay Halachos - Choshen Mishpat - 2',
    files: ['380 hilchos_umnin_ss16_25.html', '450 umnin_1_socheir.html', '455 umnin_2.html', '462 umnin_4a.html', '469 umnin_4b.html', '475 umnin_4c.html'],
  },
];

for (const j of jobs) {
  const volDir = path.join(TRANS, j.volDir);
  const allParas = [];
  for (const f of j.files) {
    const fp = path.join(volDir, f);
    if (fs.existsSync(fp)) allParas.push(...extractParagraphs(fp));
  }
  console.log(`part-${j.part} halacha-${j.num}: ${allParas.length} paragraphs`);

  const fpath = path.join('/root/ajew-org/public/reader/likutay-halachos', `part-${j.part}`, `halacha-${j.num}.json`);
  const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  if (!data.segments) continue;

  // Assign to all segments (skip real headers only)
  const contentIdx = [];
  for (let i = 0; i < data.segments.length; i++) {
    const he = (data.segments[i].he || '').trim();
    if (he.length >= 8 && !/^הלכה\s+\d+\s*$/.test(he) && !/^סימן\s/.test(he)
        && !/^פרק\s/.test(he) && !/^כלל\s/.test(he) && !/^[א-ת]{1,2}$/.test(he)) {
      contentIdx.push(i);
    }
  }

  let assigned = 0;
  for (let i = 0; i < Math.min(allParas.length, contentIdx.length); i++) {
    data.segments[contentIdx[i]].en = allParas[i];
    assigned++;
  }
  if (allParas.length > contentIdx.length) {
    const last = contentIdx[contentIdx.length - 1];
    data.segments[last].en += '\n\n' + allParas.slice(contentIdx.length).join('\n\n');
  }
  if (assigned > 0) data.hasEnglish = true;
  fs.writeFileSync(fpath, JSON.stringify(data, null, 2), 'utf8');
  const tpath = fpath.replace('halacha-', 'torah-');
  if (fs.existsSync(tpath)) fs.writeFileSync(tpath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  Assigned ${assigned} segments`);
}

console.log('\nDone.');
