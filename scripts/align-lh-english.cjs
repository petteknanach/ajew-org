/**
 * align-lh-english.cjs
 *
 * Properly aligns English translations to Hebrew segments in Likutay Halachos.
 *
 * Strategy: For each volume, extract English from HTML files in order,
 * group sub-parts together, and assign each group to the next reader halacha
 * sequentially. Both the HTML files and reader halachos follow the same order.
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_BASE = '/mnt/c/Users/Pettek/Documents/Translations/Likutay Halachos';
const READER_BASE = '/root/ajew-org/public/reader/likutay-halachos';

const VOLUME_MAP = [
  { folder: 'Likutay Halachos - Orach Chaim - 1', part: 1 },
  { folder: 'Likutay Halachos - Orach Chaim - 2', part: 2 },
  { folder: 'Likutay Halachos - Orach Chaim - 3', part: 3 },
  { folder: 'Likutay Halachos - Yoreh Daya - 1', part: 4 },
  { folder: 'Likutay Halachos - Yoreh Daya - 2', part: 5 },
  { folder: 'Likutay Halachos - Choshen Mishpat - 1', part: 6 },
  { folder: 'Likutay Halachos - Choshen Mishpat - 2', part: 7 },
  { folder: 'Likutay Halachos - Evven Hu-ezehr', part: 8 },
];

// ============================================================
// HTML text extraction
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

function extractEnglishFromHTML(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;

  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  // Extract from <p> tags using indexOf to avoid regex backtracking on large HTML
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

  if (paragraphs.length >= 1) return filterBoilerplate(paragraphs);

  // Fallback: aggressive
  let text = content.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(?:p|div|h[1-6]|blockquote|li|tr)>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeHTMLEntities(text);
  const rawParas = text.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length >= 20);
  return filterBoilerplate(rawParas);
}

function filterBoilerplate(paragraphs) {
  return paragraphs.filter(p => {
    const t = p.trim();
    if (/^Likutay Halachos$/i.test(t)) return false;
    if (/^Orach Chaim\s*[–—-]?\s*Volume\s*\d*$/i.test(t)) return false;
    if (/^Yoreh De['']?ah\s*$/i.test(t)) return false;
    if (/^Even Ha['']?Ezer$/i.test(t)) return false;
    if (/^Choshen Mishpat\s*$/i.test(t)) return false;
    if (/^Likutay Halachos\s*[–—]/i.test(t) && t.length < 80) return false;
    if (/^\d+$/.test(t)) return false;
    if (t.length < 20) return false;
    return true;
  });
}

// ============================================================
// File grouping
// ============================================================

/**
 * Get group base: strip prefix, suffix, sub-part letters, section ranges.
 * Files with the same base belong to the same halacha.
 */
function getGroupBase(filename) {
  let name = filename.replace(/^\d+\s*/, '').replace(/\.html$/i, '');
  name = name.toLowerCase();
  // Remove common prefixes
  name = name.replace(/^(?:lh_(?:oc\d?_|yd_)?|likutay_halachos[_ ]?|complete_|lh_choshen_mishpat_ii?_)/gi, '');
  // Remove (1), (2) etc
  name = name.replace(/\s*\(\d+\)\s*/g, '');
  // Remove notes after dash
  name = name.replace(/\s*-\s*(?:this|have|added|just|probably|end|to the end|repitition|from|with|complete)[^]*/i, '');
  // Remove part markers
  name = name.replace(/[_ ]?part\s?\d*[a-z]?$/gi, '');
  name = name.replace(/[_ ]?(?:v\d+|fixed|final|complete(?:[_ ]translation)?|progress)$/gi, '');
  // Remove sub-part letter (5a -> 5)
  name = name.replace(/([_ ]\d+)[a-k]$/i, '$1');
  // Remove section number ranges (these are ois numbers, not halacha numbers)
  name = name.replace(/\s+\d+-\d+(?:\s+\d+-?\w*)*$/g, '');
  name = name.replace(/[_ ]\d{2,}[_ ]\d{2,}$/g, '');
  name = name.replace(/[_ ]+$/, '');
  return name || null;
}

/**
 * Group HTML files by base name.
 * Also merges "sections" continuation files with their parent.
 */
function buildGroups(htmlFiles, volDir) {
  if (htmlFiles.length === 0) return [];

  const groups = [];
  let curr = { base: getGroupBase(htmlFiles[0]), files: [htmlFiles[0]] };

  for (let i = 1; i < htmlFiles.length; i++) {
    const f = htmlFiles[i];
    const base = getGroupBase(f);

    // "sections" files are continuations of the previous group
    if (f.toLowerCase().includes('section')) {
      curr.files.push(f);
      continue;
    }

    if (base === curr.base) {
      curr.files.push(f);
    } else {
      groups.push(curr);
      curr = { base, files: [f] };
    }
  }
  groups.push(curr);

  return groups;
}

// ============================================================
// Segment helpers
// ============================================================

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
      // Overflow: append to last content segment
      data.segments[contentIndices[contentIndices.length - 1]].en += '\n\n' + paragraphs[i];
    }
  }

  if (assigned > 0) data.hasEnglish = true;
  return assigned;
}

function saveHalacha(partDir, halacha) {
  const filePath = path.join(partDir, halacha.file);
  fs.writeFileSync(filePath, JSON.stringify(halacha.data, null, 2), 'utf8');
  // Mirror torah-N.json
  const torahPath = path.join(partDir, halacha.file.replace('halacha-', 'torah-'));
  if (fs.existsSync(torahPath)) {
    fs.writeFileSync(torahPath, JSON.stringify(halacha.data, null, 2), 'utf8');
  }
}

// ============================================================
// Multi-halacha detection
// ============================================================

/**
 * Conservative detection: only when filename EXPLICITLY says
 * "Halachos N-M" or "Halachah N-M" or "H1-H2".
 */
function detectHalachaCount(files) {
  const firstFile = files[0].toLowerCase();

  // "Halachos 1-2", "Halachos_1-3", "Halachah_1-2"
  const m = firstFile.match(/halachos?\s*[_ ]?(\d+)\s*-\s*(\d+)/i);
  if (m) {
    const diff = parseInt(m[2]) - parseInt(m[1]);
    if (diff >= 1 && diff <= 5) return diff + 1;
  }

  // "H1-H2"
  const h = firstFile.match(/\bh(\d+)\s*-\s*h(\d+)/i);
  if (h) return parseInt(h[2]) - parseInt(h[1]) + 1;

  return 1;
}

/**
 * Check if first group has hakdamah + first halacha
 */
function isHakdamahCombo(files) {
  const f = files[0].toLowerCase();
  return f.includes('hakdamah') && (f.includes('hashkamas') || f.includes('pirya') || f.includes('shechita'));
}

/**
 * Split an HTML file into sections at halacha boundaries.
 * Returns array of paragraph arrays, one per section.
 * If no boundaries found, returns null.
 */
function splitHTMLAtBoundaries(filePath, expectedSections) {
  let html = fs.readFileSync(filePath, 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;

  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  // Split by halacha-header div or h2 with "Halacha" in it
  const parts = content.split(/<div\s+class="halacha-header">/i);

  if (parts.length < 2) {
    // Try splitting by h2 containing "Halacha"
    const h2Parts = content.split(/<h2[^>]*>[^<]*(?:Halacha|Halachah)\s+\d+[^<]*<\/h2>/i);
    if (h2Parts.length >= 2) {
      return h2Parts.map(section => extractParagraphsFromSection(section));
    }
    return null;
  }

  return parts.map(section => extractParagraphsFromSection(section));
}

function extractParagraphsFromSection(content) {
  const paragraphs = [];
  // Use indexOf to avoid regex catastrophic backtracking on large HTML
  let startIdx = 0;
  while (true) {
    const pStart = content.indexOf('<p', startIdx);
    if (pStart === -1) break;
    const pClose = content.indexOf('</p>', pStart);
    if (pClose === -1) break;
    const inner = content.substring(content.indexOf('>', pStart) + 1, pClose);
    let text = inner.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
    text = decodeHTMLEntities(text).replace(/\s+/g, ' ').trim();
    if (text.length >= 20) paragraphs.push(text);
    startIdx = pClose + 4;
  }
  return filterBoilerplate(paragraphs);
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('Likutay Halachos English Alignment Script');
  console.log('='.repeat(60));

  // Step 1: Clear ALL existing English
  console.log('\nStep 1: Clearing all existing English...');
  let clearedFiles = 0, clearedSegments = 0;

  for (let part = 1; part <= 8; part++) {
    const partDir = path.join(READER_BASE, `part-${part}`);
    const files = fs.readdirSync(partDir).filter(f => f.startsWith('halacha-') || f.startsWith('torah-'));

    for (const file of files) {
      const filePath = path.join(partDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let modified = false;

      if (data.segments) {
        for (const seg of data.segments) {
          if (seg.en) { seg.en = ''; clearedSegments++; modified = true; }
        }
      }
      if (data.hasEnglish) { data.hasEnglish = false; modified = true; }

      if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        clearedFiles++;
      }
    }
  }
  console.log(`  Cleared ${clearedSegments} segments in ${clearedFiles} files.`);

  // Step 2: Process each volume
  console.log('\nStep 2: Aligning translations...\n');

  let gTotalH = 0, gMatched = 0, gTotalS = 0, gEnS = 0;
  const allUnmatched = [];

  for (const vol of VOLUME_MAP) {
    const volDir = path.join(TRANSLATIONS_BASE, vol.folder);
    if (!fs.existsSync(volDir)) continue;

    const partDir = path.join(READER_BASE, `part-${vol.part}`);

    // Get sorted HTML files
    const htmlFiles = fs.readdirSync(volDir)
      .filter(f => f.toLowerCase().endsWith('.html') && fs.statSync(path.join(volDir, f)).isFile())
      .sort((a, b) => {
        const na = parseInt(a.match(/^(\d+)/)?.[1] || '9999');
        const nb = parseInt(b.match(/^(\d+)/)?.[1] || '9999');
        return na - nb;
      });

    // Build groups
    const groups = buildGroups(htmlFiles, volDir);

    // Load halachas
    const halachaFiles = fs.readdirSync(partDir)
      .filter(f => f.startsWith('halacha-'))
      .sort((a, b) => {
        const na = parseInt(a.match(/(\d+)/)?.[1] || '0');
        const nb = parseInt(b.match(/(\d+)/)?.[1] || '0');
        return na - nb;
      });

    const halachas = halachaFiles.map(f => ({
      file: f,
      num: parseInt(f.match(/(\d+)/)[1]),
      data: JSON.parse(fs.readFileSync(path.join(partDir, f), 'utf8')),
    }));

    console.log(`  ${vol.folder} -> part-${vol.part}`);
    console.log(`    ${htmlFiles.length} HTML files -> ${groups.length} groups, ${halachas.length} halachos`);

    // Sequential matching
    let hIdx = 0;
    let matched = 0, enSegs = 0;

    for (const group of groups) {
      if (hIdx >= halachas.length) break;

      // Extract all English from this group
      const allParas = [];
      for (const file of group.files) {
        const paras = extractEnglishFromHTML(path.join(volDir, file));
        allParas.push(...paras);
      }

      if (allParas.length === 0) continue;

      // How many halachos does this group cover?
      let hCount = detectHalachaCount(group.files);

      // Special: first group with hakdamah + first halacha
      if (isHakdamahCombo(group.files)) hCount = 2;

      if (hCount === 1) {
        // Simple: assign all to current halacha
        const assigned = assignEnglish(halachas[hIdx].data, allParas);
        if (assigned > 0) {
          matched++;
          enSegs += assigned;
          saveHalacha(partDir, halachas[hIdx]);
        }
        hIdx++;
      } else {
        // Multi-halacha: try to split HTML at boundaries first
        const targets = [];
        for (let i = 0; i < hCount && hIdx + i < halachas.length; i++) {
          targets.push(halachas[hIdx + i]);
        }

        // Try to split the first HTML file at halacha boundaries
        let sectionParas = splitHTMLAtBoundaries(path.join(volDir, group.files[0]), hCount);

        // If the group has more files (continuation parts), append their
        // content to the last section
        if (sectionParas && sectionParas.length >= 2 && group.files.length > 1) {
          for (let fi = 1; fi < group.files.length; fi++) {
            const extraParas = extractEnglishFromHTML(path.join(volDir, group.files[fi]));
            sectionParas[sectionParas.length - 1].push(...extraParas);
          }
        }

        if (sectionParas && sectionParas.length >= hCount) {
          // Clean split: assign each section to its target halacha
          for (let i = 0; i < targets.length; i++) {
            const paras = sectionParas[i] || [];
            if (paras.length > 0) {
              const assigned = assignEnglish(targets[i].data, paras);
              if (assigned > 0) {
                matched++;
                enSegs += assigned;
                saveHalacha(partDir, targets[i]);
              }
            }
          }
        } else {
          // Fallback: proportional distribution
          const contentCounts = targets.map(h => getContentIndices(h.data.segments).length);
          const totalContent = contentCounts.reduce((a, b) => a + b, 0);

          if (totalContent > 0) {
            let pIdx = 0;
            for (let i = 0; i < targets.length; i++) {
              let parasForThis;
              if (i === targets.length - 1) {
                parasForThis = allParas.slice(pIdx);
              } else {
                const proportion = contentCounts[i] / totalContent;
                const count = Math.max(1, Math.round(allParas.length * proportion));
                parasForThis = allParas.slice(pIdx, pIdx + count);
                pIdx += count;
              }

              if (parasForThis.length > 0) {
                const assigned = assignEnglish(targets[i].data, parasForThis);
                if (assigned > 0) {
                  matched++;
                  enSegs += assigned;
                  saveHalacha(partDir, targets[i]);
                }
              }
            }
          }
        }
        hIdx += targets.length;
      }
    }

    // Count totals
    let totSegs = 0;
    for (const h of halachas) {
      totSegs += h.data.segments.length;
      if (!h.data.hasEnglish) {
        allUnmatched.push({ part: vol.part, num: h.num, title: h.data.hebrewTitle || h.data.title || '' });
      }
    }

    gTotalH += halachas.length;
    gMatched += matched;
    gTotalS += totSegs;
    gEnS += enSegs;

    console.log(`    Matched: ${matched}/${halachas.length}, English segments: ${enSegs}/${totSegs}`);
  }

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('ALIGNMENT REPORT');
  console.log('='.repeat(60));
  console.log(`Total halachos: ${gTotalH}`);
  console.log(`Halachos with English: ${gMatched} (${(gMatched / gTotalH * 100).toFixed(1)}%)`);
  console.log(`Halachos without English: ${gTotalH - gMatched}`);
  console.log(`Total segments: ${gTotalS}`);
  console.log(`Segments with English: ${gEnS} (${(gEnS / gTotalS * 100).toFixed(1)}%)`);

  if (allUnmatched.length > 0) {
    console.log(`\nHalachos without English translation (${allUnmatched.length}):`);
    for (const u of allUnmatched) {
      console.log(`  part-${u.part} halacha-${u.num}: ${u.title}`);
    }
  }
}

main();
