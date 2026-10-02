'use strict';
// Explicit source-reviewed repairs, not a Hebrew normalizer. Applied only to
// Original Psalms imports; UXLC/MAM are separate editions and remain untouched.
const { repairs } = require('../../audit/psalms-text/holam-repairs.json');
const byRef = new Map(repairs.map(r => [`${r.chapter}:${r.verse}`, r]));
function repairPsalmsHolam(book, chapter, verse, text) {
  if (book !== 'tanach-tehillim' && book !== 'psalms') return text;
  const repair = byRef.get(`${chapter}:${verse}`);
  if (!repair) return text;
  if (text === repair.after) return text;
  if (text !== repair.before) throw new Error(`Psalms ${chapter}:${verse}: source changed; re-review holam repair`);
  return repair.after;
}
module.exports = { repairPsalmsHolam };
