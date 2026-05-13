#!/usr/bin/env node
/**
 * Properly align English translations to Hebrew segments in Likutay Halachos.
 * 
 * Strategy: Use the ois (אות) markers as anchor points. Within each ois section,
 * match Hebrew segments to English paragraphs 1:1 based on order.
 * 
 * This replaces the proportional alignment with proper segment-level alignment.
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
  { folder: 'Likutay Halachos - Evven Hu-ezehr', part: 6 },
  { folder: 'Likutay Halachos - Choshen Mishpat - 1', part: 7 },
  { folder: 'Likutay Halachos - Choshen Mishpat - 2', part: 8 },
];

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

  // Fallback
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
    if (/^Likutay Halachos\s*[—–]/i.test(t) && t.length < 80) return false;
    if (/^\d+$/.test(t)) return false;
    if (t.length < 20) return false;
    return true;
  });
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

/**
 * Properly align English paragraphs to Hebrew content segments.
 * Within each halacha, match 1:1 based on order.
 * If counts don't match, use proportional distribution as fallback.
 */
function assignEnglishProperly(segments, paragraphs) {
  if (!paragraphs || paragraphs.length === 0 || !segments) return 0;

  const contentIndices = getContentIndices(segments);
  if (contentIndices.length === 0) return 0;

  let assigned = 0;
  
  // If counts match exactly, 1:1 assignment
  if (paragraphs.length === contentIndices.length) {
    for (let i = 0; i < paragraphs.length; i++) {
      segments[contentIndices[i]].en = paragraphs[i];
      assigned++;
    }
    return assigned;
  }

  // If counts are close (within 2), still do 1:1 with slight adjustment
  if (Math.abs(paragraphs.length - contentIndices.length) <= 2) {
    const minLen = Math.min(paragraphs.length, contentIndices.length);
    for (let i = 0; i < minLen; i++) {
      segments[contentIndices[i]].en = paragraphs[i];
      assigned++;
    }
    // If extra paragraphs, append to last segment
    if (paragraphs.length > contentIndices.length) {
      for (let i = minLen; i < paragraphs.length; i++) {
        segments[contentIndices[contentIndices.length - 1]].en += '\n\n' + paragraphs[i];
      }
    }
    return assigned;
  }

  // Fallback: proportional distribution for significantly different counts
  for (let i = 0; i < paragraphs.length; i++) {
    const targetIdx = Math.min(
      Math.round(i * contentIndices.length / paragraphs.length),
      contentIndices.length - 1
    );
    const segIdx = contentIndices[targetIdx];
    if (!segments[segIdx].en) {
      segments[segIdx].en = paragraphs[i];
      assigned++;
    } else {
      segments[segIdx].en += '\n\n' + paragraphs[i];
    }
  }

  return assigned;
}

function getGroupBase(filename) {
  let name = filename.replace(/^\d+\s*/, '').replace(/\.html$/i, '');
  name = name.toLowerCase();
  name = name.replace(/^(?:lh_(?:oc\d?_|yd_)?|likutay_halachos[_ ]?|complete_|lh_choshen_mishpat_ii?_)/gi, '');
  name = name.replace(/\s*\(\d+\)\s*/g, '');
  name = name.replace(/\s*-\s*(?:this|have|added|just|probably|end|to the end|repitition|from|with|complete)[^]*/i, '');
  name = name.replace(/[_ ]?part\s?\d*[a-z]?$/gi, '');
  name = name.replace(/[_ ]?(?:v\d+|fixed|final|complete(?:[_ ]?translation)?|progress)$/gi, '');
  name = name.replace(/([_ ]\d+)[a-k]$/i, '$1');
  name = name.replace(/\s+\d+-\d+(?:\s+\d+-?\w*)*$/g, '');
  name = name.replace(/[_ ]\d{2,}[_ ]\d{2,}$/g, '');
  name = name.replace(/[_ ]+$/, '');
  return name || null;
}

function buildGroups(htmlFiles) {
  if (htmlFiles.length === 0) return [];
  const groups = [];
  let curr = { base: getGroupBase(htmlFiles[0]), files: [htmlFiles[0]] };
  for (let i = 1; i < htmlFiles.length; i++) {
    const f = htmlFiles[i];
    const base = getGroupBase(f);
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

function detectHalachaCount(files) {
  const firstFile = files[0].toLowerCase();
  const m = firstFile.match(/halachos?\s*[_ ]?(\d+)\s*-\s*(\d+)/i);
  if (m) {
    const diff = parseInt(m[2]) - parseInt(m[1]);
    if (diff >= 1 && diff <= 5) return diff + 1;
  }
  const h = firstFile.match(/\bh(\d+)\s*-\s*h(\d+)/i);
  if (h) return parseInt(h[2]) - parseInt(h[1]) + 1;
  return 1;
}

function isHakdamahCombo(files) {
  const f = files[0].toLowerCase();
  return f.includes('hakdamah') && (f.includes('hashkamas') || f.includes('pirya') || f.includes('shechita'));
}

function splitHTMLAtBoundaries(filePath, expectedSections) {
  let html = fs.readFileSync(filePath, 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  const parts = content.split(/<div\s+class="halacha-header">/i);
  if (parts.length < 2) {
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

function main() {
  console.log('Likutay Halachos English Alignment Script (Proper Segment Matching)');
  console.log('='.repeat(70));

  // Step 1: Clear ALL existing English
  console.log('\nStep 1: Clearing all existing English...');
  let clearedFiles = 0, clearedSegments = 0;
  for (let part = 1; part <= 8; part++) {
    const partDir = path.join(READER_BASE, `part-${part}`);
    const files = fs.readdirSync(partDir).filter(f => f.startsWith('torah-'));
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

  // Step 2: Process each volume with proper alignment
  console.log('\nStep 2: Aligning translations (proper segment matching)...\n');

  let gTotalH = 0, gMatched = 0, gTotalS = 0, gEnS = 0;
  const allUnmatched = [];

  for (const vol of VOLUME_MAP) {
    const volDir = path.join(TRANSLATIONS_BASE, vol.folder);
    if (!fs.existsSync(volDir)) continue;
    const partDir = path.join(READER_BASE, `part-${vol.part}`);

    const htmlFiles = fs.readdirSync(volDir)
      .filter(f => f.toLowerCase().endsWith('.html') && fs.statSync(path.join(volDir, f)).isFile())
      .sort((a, b) => {
        const na = parseInt(a.match(/^(\d+)/)?.[1] || '9999');
        const nb = parseInt(b.match(/^(\d+)/)?.[1] || '9999');
        return na - nb;
      });

    const groups = buildGroups(htmlFiles);
    const halachaFiles = fs.readdirSync(partDir)
      .filter(f => f.startsWith('halacha-'))
      .sort((a, b) => parseInt(a.match(/(\d+)/)[1]) - parseInt(b.match(/(\d+)/)[1]));

    const halachas = halachaFiles.map(f => ({
      file: f,
      num: parseInt(f.match(/(\d+)/)[1]),
      data: JSON.parse(fs.readFileSync(path.join(partDir, f), 'utf8')),
    }));

    console.log(`  ${vol.folder} -> part-${vol.part}`);
    console.log(`    ${htmlFiles.length} HTML files -> ${groups.length} groups, ${halachas.length} halachos`);

    let hIdx = 0;
    let matched = 0, enSegs = 0;

    for (const group of groups) {
      if (hIdx >= halachas.length) break;

      const allParas = [];
      for (const file of group.files) {
        const paras = extractEnglishFromHTML(path.join(volDir, file));
        allParas.push(...paras);
      }

      if (allParas.length === 0) continue;

      let hCount = detectHalachaCount(group.files);
      if (isHakdamahCombo(group.files)) hCount = 2;

      if (hCount === 1) {
        const assigned = assignEnglishProperly(halachas[hIdx].data.segments, allParas);
        if (assigned > 0) {
          matched++;
          enSegs += assigned;
          // Save both halacha and torah files
          fs.writeFileSync(path.join(partDir, halachas[hIdx].file), JSON.stringify(halachas[hIdx].data, null, 2), 'utf8');
          const torahPath = path.join(partDir, halachas[hIdx].file.replace('halacha-', 'torah-'));
          if (fs.existsSync(torahPath)) {
            fs.writeFileSync(torahPath, JSON.stringify(halachas[hIdx].data, null, 2), 'utf8');
          }
        }
        hIdx++;
      } else {
        const targets = [];
        for (let i = 0; i < hCount && hIdx + i < halachas.length; i++) {
          targets.push(halachas[hIdx + i]);
        }

        let sectionParas = splitHTMLAtBoundaries(path.join(volDir, group.files[0]), hCount);
        if (sectionParas && sectionParas.length >= 2 && group.files.length > 1) {
          for (let fi = 1; fi < group.files.length; fi++) {
            const extraParas = extractEnglishFromHTML(path.join(volDir, group.files[fi]));
            sectionParas[sectionParas.length - 1].push(...extraParas);
          }
        }

        if (sectionParas && sectionParas.length >= hCount) {
          for (let i = 0; i < targets.length; i++) {
            const paras = sectionParas[i] || [];
            if (paras.length > 0) {
              const assigned = assignEnglishProperly(targets[i].data.segments, paras);
              if (assigned > 0) {
                matched++;
                enSegs += assigned;
                fs.writeFileSync(path.join(partDir, targets[i].file), JSON.stringify(targets[i].data, null, 2), 'utf8');
                const torahPath = path.join(partDir, targets[i].file.replace('halacha-', 'torah-'));
                if (fs.existsSync(torahPath)) {
                  fs.writeFileSync(torahPath, JSON.stringify(targets[i].data, null, 2), 'utf8');
                }
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
                const assigned = assignEnglishProperly(targets[i].data.segments, parasForThis);
                if (assigned > 0) {
                  matched++;
                  enSegs += assigned;
                  fs.writeFileSync(path.join(partDir, targets[i].file), JSON.stringify(targets[i].data, null, 2), 'utf8');
                  const torahPath = path.join(partDir, targets[i].file.replace('halacha-', 'torah-'));
                  if (fs.existsSync(torahPath)) {
                    fs.writeFileSync(torahPath, JSON.stringify(targets[i].data, null, 2), 'utf8');
                  }
                }
              }
            }
          }
        }
        hIdx += targets.length;
      }
    }

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

  console.log('\n' + '='.repeat(70));
  console.log('ALIGNMENT REPORT');
  console.log('='.repeat(70));
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
