'use strict';

// Build-time only: labels come from the Hebrew source titles, never the storage
// number/displayNumber, English alignment, or a presumed introductory offset.
const { readFileSync } = require('node:fs');
const path = require('node:path');

const LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת';
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400];
const NUMERAL = /^(?!.*י[הו]$)(?:ת{0,2}[קרש]?(?:ט[וז]|[יכלמנסעפצ]?[אבגדהוזחט]?)|ער[אבגדהוזחט]?)$/;

function kitzurReferenceFromHeading(hebrewTitle, part) {
  if (typeof hebrewTitle !== 'string' || !hebrewTitle.trim()) {
    throw new TypeError('Kitzur reference requires a Hebrew source title');
  }
  if (part !== 1 && part !== 2) throw new TypeError('Kitzur part must be 1 or 2');
  const plain = hebrewTitle.normalize('NFD').replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '').trim();
  const match = /^תורה\s+([א-ת׳״'"]+)(?=\s*[-־–—]|\s*$)/.exec(plain);
  if (match) {
    const token = match[1];
    // Allow unpunctuated numerals, a single-letter geresh, or a gershayim
    // immediately before the last letter. Never strip arbitrary punctuation.
    const punctuation = new RegExp(`^(?:[${LETTERS}]+|[${LETTERS}]['׳]|[${LETTERS}]+["״][${LETTERS}])$`);
    const letters = token.replace(/['׳"״]/g, '');
    // The source uses inverted 270s spellings ער / ערב / ערה (270/272/275).
    if (punctuation.test(token) && NUMERAL.test(letters)) {
      const number = [...letters].reduce((sum, letter) => sum + VALUES[LETTERS.indexOf(letter)], 0);
      if (number > 0 && number < 1000) return `Part ${part}, Torah ${number}`;
    }
  }
  // Includes introductions and headings without an explicit תורה prefix:
  // preserve the exact source title rather than manufacture a teaching number.
  return `Part ${part}, ${hebrewTitle}`;
}

/** Return a JSON-serializable URL -> human reference object in source order. */
function buildKitzurReferenceMap(projectRoot = path.resolve(__dirname, '../..')) {
  const references = {};
  for (const part of [1, 2]) {
    const index = JSON.parse(readFileSync(path.join(projectRoot,
      `public/reader/kitzur-likutay-moharan/part-${part}/index.json`), 'utf8'));
    for (const entry of index.torahs) {
      const canonical = new RegExp(`^/reader/kitzur-likutay-moharan/${part}/[1-9]\\d*$`);
      if (!canonical.test(entry.url) || Object.hasOwn(references, entry.url)) {
        throw new Error(`Invalid or duplicate Kitzur source URL: ${entry.url}`);
      }
      references[entry.url] = kitzurReferenceFromHeading(entry.hebrewTitle, part);
    }
  }
  return references;
}

module.exports = { buildKitzurReferenceMap, kitzurReferenceFromHeading };
