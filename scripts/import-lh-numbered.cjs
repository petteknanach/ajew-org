/**
 * Import LH English from 37 numbered DOCX volumes.
 * Simple approach: extract ALL numbered paragraphs from each volume,
 * then for each reader halacha file in the matching part, assign by index match.
 * Each volume maps to a range of halachos within its part.
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos';
const READER_DIR = path.join(__dirname, '../public/reader/likutay-halachos');

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018').replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C').replace(/&hellip;/g, '\u2026')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\s+/g, ' ').trim();
}

/**
 * Extract numbered paragraphs from a volume, grouped into "number resets" (halacha boundaries).
 * Returns array of Maps, each map: number → english text.
 * A new group starts when the number resets to 1 (or goes lower than previous).
 */
async function extractNumberGroups(docxPath) {
  const result = await mammoth.convertToHtml({ path: docxPath });
  const html = result.value;
  const paras = html.split(/<p>/).slice(1).map(p => {
    const endIdx = p.indexOf('</p>');
    return endIdx > 0 ? p.substring(0, endIdx) : p;
  });

  const groups = [];
  let currentGroup = {};
  let pendingNum = null;
  let lastNum = 0;
  let pastBoilerplate = false;

  for (const rawHtml of paras) {
    const text = stripHtml(rawHtml).trim();
    if (!text) continue;

    // Skip boilerplate at start
    if (!pastBoilerplate) {
      if (text.match(/^Note on Paragraph/)) { pastBoilerplate = true; continue; }
      // Also detect start by first standalone "1"
      if (text === '1') pastBoilerplate = true;
      if (!pastBoilerplate) continue;
    }

    // Standalone number (1-999)
    if (text.match(/^\d+$/) && parseInt(text) >= 1 && parseInt(text) < 1000) {
      const num = parseInt(text);
      // New group if number resets
      if (num <= lastNum && Object.keys(currentGroup).length > 0) {
        groups.push(currentGroup);
        currentGroup = {};
      }
      pendingNum = num;
      lastNum = num;
      continue;
    }

    // Content after a number
    if (pendingNum !== null && text.length > 10) {
      currentGroup[pendingNum] = text;
      pendingNum = null;
      continue;
    }

    pendingNum = null; // Reset if not content
  }

  if (Object.keys(currentGroup).length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function getPartForVolume(filename) {
  if (filename.includes('_OC')) {
    const n = parseInt(filename.match(/OC(\d+)/)[1]);
    if (n <= 4) return 1;
    if (n <= 8) return 2;
    if (n <= 12) return 3;
    return 4;
  }
  if (filename.includes('_YD')) {
    const n = parseInt(filename.match(/YD(\d+)/)[1]);
    if (n <= 5) return 5;
    return 6;
  }
  if (filename.includes('_EH')) return 7;
  if (filename.includes('_CM')) return 8;
  return null;
}

const partProgress = {}; // part -> next halacha index

async function main() {
  const docxFiles = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.docx')).sort();
  console.log(`Found ${docxFiles.length} volume files\n`);

  let grandMatched = 0;

  for (const docxFile of docxFiles) {
    const partNum = getPartForVolume(docxFile);
    if (!partNum) continue;

    const partDir = path.join(READER_DIR, `part-${partNum}`);
    if (!fs.existsSync(partDir)) continue;

    if (!partProgress[partNum]) {
      partProgress[partNum] = {
        files: fs.readdirSync(partDir)
          .filter(f => f.startsWith('halacha-') && f.endsWith('.json'))
          .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0])),
        nextIdx: 0,
      };
    }

    const groups = await extractNumberGroups(path.join(SRC_DIR, docxFile));
    let volMatched = 0;

    for (const group of groups) {
      const pp = partProgress[partNum];
      if (pp.nextIdx >= pp.files.length) break;

      const hFile = pp.files[pp.nextIdx];
      const hPath = path.join(partDir, hFile);
      const data = JSON.parse(fs.readFileSync(hPath, 'utf8'));
      if (!data.segments) { pp.nextIdx++; continue; }

      let assigned = 0;
      for (const seg of data.segments) {
        if (seg.index && group[seg.index]) {
          seg.en = group[seg.index];
          assigned++;
        }
      }

      if (assigned > 0) {
        data.hasEnglish = true;
        fs.writeFileSync(hPath, JSON.stringify(data, null, 2), 'utf8');
        const torahFile = hFile.replace('halacha-', 'torah-');
        const torahPath = path.join(partDir, torahFile);
        if (fs.existsSync(torahPath)) {
          fs.writeFileSync(torahPath, JSON.stringify(data, null, 2), 'utf8');
        }
        volMatched += assigned;
      }

      pp.nextIdx++;
    }

    grandMatched += volMatched;
    console.log(`${docxFile}: ${groups.length} groups, ${volMatched} matched (part-${partNum})`);
  }

  // Final count
  let finalTotal = 0, finalWithEn = 0;
  function countDir(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) { countDir(full); continue; }
      if (!item.startsWith('halacha-') || !item.endsWith('.json')) continue;
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (!data.segments) continue;
      for (const seg of data.segments) {
        finalTotal++;
        if (seg.en && seg.en.trim()) finalWithEn++;
      }
    }
  }
  countDir(READER_DIR);

  console.log(`\n=== RESULTS ===`);
  console.log(`Total matched: ${grandMatched}`);
  console.log(`Coverage: ${finalWithEn}/${finalTotal} (${Math.round(finalWithEn / finalTotal * 100)}%)`);
}

main().catch(console.error);
