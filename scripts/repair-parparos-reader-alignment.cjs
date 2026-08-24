#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const READER = path.join(ROOT, 'public/reader/parparos-lechochma');
const SOURCE = process.env.PARPAROS_FINISHED_DIR || '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh';
const DRY_RUN = process.argv.includes('--dry-run');

const HE_VALUES = {א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ך:20,ל:30,מ:40,ם:40,נ:50,ן:50,ס:60,ע:70,פ:80,ף:80,צ:90,ץ:90,ק:100,ר:200,ש:300,ת:400};
function simanNumber(text) {
  const m = String(text || '').match(/סימן\s+([א-ת״׳"']+)/);
  if (!m) return null;
  return [...m[1]].reduce((sum, ch) => sum + (HE_VALUES[ch] || 0), 0) || null;
}
function clean(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
function isEditorial(text) {
  const t = clean(text);
  const low = t.toLowerCase();
  return /^\[\s*note\s*:/i.test(t) ||
    (t.startsWith('[') && (low.includes('in the source') || low.includes('source text') || low.includes('no additional content') || low.includes('designated as')));
}
function parseSourceFile(filePath) {
  const $ = cheerio.load(fs.readFileSync(filePath, 'utf8'));
  const sourceMap = new Map();
  let current = null;
  let block = [];
  let blocks = [];
  let started = false;
  let ignoreRest = false;
  function flushBlock() {
    const text = clean(block.join(' '));
    if (text) blocks.push(text);
    block = [];
  }
  function flushSiman() {
    if (current == null) return;
    flushBlock();
    sourceMap.set(current, blocks.filter(Boolean));
  }
  $('h2.ch, h3.sub, h4, p').each((_, el) => {
    const tag = String(el.tagName || el.name || '').toLowerCase();
    const text = clean($(el).text());
    if (tag === 'h2') {
      flushSiman();
      current = simanNumber(text);
      block = []; blocks = []; started = false; ignoreRest = false;
      return;
    }
    if (current == null || ignoreRest) return;
    if (tag === 'h4' && /translator(?:'s)? summary/i.test(text)) {
      flushBlock();
      ignoreRest = true;
      return;
    }
    if (tag === 'h3') {
      if (started) flushBlock();
      started = true;
      return;
    }
    if (tag === 'p' && text && !isEditorial(text)) {
      if (!started) started = true;
      block.push(text);
    }
  });
  flushSiman();
  return sourceMap;
}
function mergeSourceMaps(files) {
  const out = new Map();
  for (const file of files) {
    for (const [siman, blocks] of parseSourceFile(file)) {
      if (!out.has(siman) || blocks.length > out.get(siman).blocks.length) {
        out.set(siman, { blocks, file: path.basename(file) });
      }
    }
  }
  return out;
}

if (!fs.existsSync(SOURCE)) throw new Error(`Parparos source directory missing: ${SOURCE}`);
const htmlFiles = fs.readdirSync(SOURCE).filter(f => f.endsWith('.html')).sort().map(f => path.join(SOURCE, f));
const kama = mergeSourceMaps(htmlFiles.filter(f => !path.basename(f).includes('Tinyana')));
const tinyana = mergeSourceMaps(htmlFiles.filter(f => path.basename(f).includes('Tinyana')));
const files = fs.readdirSync(READER).filter(f => /^section-\d+\.json$/.test(f)).sort((a,b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
let repaired = 0, withheld = 0, noSource = 0, segmentCount = 0;
const report = [];
for (const file of files) {
  const section = Number(file.match(/\d+/)[0]);
  const filePath = path.join(READER, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const siman = simanNumber(data.title || data.hebrewTitle || '');
  const source = (section >= 108 ? tinyana : kama).get(siman);
  let segments = Array.isArray(data.segments) ? data.segments : [];
  const originalSegmentCount = segments.length;
  if (source && source.blocks.length !== segments.length && segments.length) {
    const groups = [];
    for (const segment of segments) {
      const hebrew = clean(segment.he || segment.he_nikud || '');
      if (/^אות\s+/.test(hebrew) || !groups.length) groups.push([segment]);
      else groups[groups.length - 1].push(segment);
    }
    if (groups.length === source.blocks.length && groups.length < segments.length) {
      segments = groups.map(group => {
        const merged = { ...group[0] };
        merged.he = group.map(segment => clean(segment.he || '')).filter(Boolean).join('\n\n');
        merged.he_nikud = group.map(segment => clean(segment.he_nikud || segment.he || '')).filter(Boolean).join('\n\n');
        merged.mergedSourceIndices = group.map(segment => segment.index);
        merged.en = '';
        return merged;
      });
      data.segments = segments;
    }
  }
  data.part = 1;
  data.torah = section;
  data.displayNumber = section;
  data.navigation = {
    prevUrl: section > 1 ? `/reader/parparos-lechochma/1/${section - 1}` : null,
    nextUrl: section < files.length ? `/reader/parparos-lechochma/1/${section + 1}` : null,
  };
  segmentCount += segments.length;
  let status;
  if (source && source.blocks.length === segments.length && segments.length) {
    segments.forEach((segment, index) => { segment.en = source.blocks[index]; });
    data.hasEnglish = true;
    data.englishAlignmentStatus = 'verified-section-order';
    data.englishSourceFile = source.file;
    repaired++;
    status = 'repaired';
  } else {
    segments.forEach(segment => { segment.en = ''; });
    data.hasEnglish = false;
    data.englishAlignmentStatus = source ? 'withheld-segmentation-mismatch' : 'withheld-no-exact-source';
    if (source) data.englishSourceFile = source.file;
    else delete data.englishSourceFile;
    if (source) withheld++; else noSource++;
    status = source ? 'withheld' : 'no-source';
  }
  data.englishAlignmentSourceSections = source ? source.blocks.length : 0;
  data.englishAlignmentHebrewSegments = segments.length;
  report.push({ section, siman, status, originalHebrewSegments: originalSegmentCount, hebrewSegments: segments.length, englishSections: source ? source.blocks.length : 0, sourceFile: source?.file || null });
  if (!DRY_RUN) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}
if (!DRY_RUN) {
  const indexPath = path.join(READER, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  for (const item of index.torahs || []) {
    const section = Number(item.number || item.displayNumber);
    const row = report.find(r => r.section === section);
    if (row) {
      item.hasEnglish = row.status === 'repaired';
      item.paragraphs = row.hebrewSegments;
    }
  }
  index.englishAlignmentPolicy = 'Only section-count-verified source translations are paired; ambiguous legacy English is withheld.';
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
  fs.writeFileSync(path.join(READER, 'english-alignment-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), repaired, withheld, noSource, segmentCount, sections: report }, null, 2) + '\n');
}
console.log(JSON.stringify({ dryRun: DRY_RUN, repaired, withheld, noSource, files: files.length, segmentCount }, null, 2));
