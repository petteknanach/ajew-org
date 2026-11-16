'use strict';
// Definitions-only, exact whole-body admission before the inherited QA layers.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {createHash} = require('node:crypto');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = fs.readFileSync(path.join(__dirname, 'reader-source-successor-inverse.json'));
assert.equal(sha(raw), '48be7bfbfc266e053aefd18e5961ac974fd6274fdcae824ecdd91385704a2757', 'SOURCE_SUCCESSOR_BANK_PIN');
const bank = JSON.parse(raw);
const owners = ['src/pages/reader/otzar-hayirah/[part]/[torah].astro', 'src/pages/reader/sefer-hamidos/[part]/[torah].astro'];
assert.deepEqual(Object.keys(bank.paths), owners, 'SOURCE_SUCCESSOR_EXACT_DOMAIN');
function restore(relative, bytes) {
  const d = Object.hasOwn(bank.paths, relative) ? bank.paths[relative] : null;
  // Preserve the inherited non-admission ABI. No unpinned body is transformed.
  if (!d || !Buffer.isBuffer(bytes) || sha(bytes) !== d.afterSHA256) return bytes;
  assert.equal(bytes.length, d.afterBytes, 'SOURCE_SUCCESSOR_AFTER_BYTES');
  let text = bytes.toString('utf8');
  for (const edit of [...d.edits].reverse()) {
    assert(edit.after.length > 0, 'SOURCE_SUCCESSOR_NONEMPTY_EDIT');
    assert.equal(text.split(edit.after).length, 2, 'SOURCE_SUCCESSOR_UNIQUE_EDIT');
    text = text.replace(edit.after, () => edit.before);
  }
  const before = Buffer.from(text);
  assert.equal(before.length, d.beforeBytes, 'SOURCE_SUCCESSOR_BEFORE_BYTES');
  assert.equal(sha(before), d.beforeSHA256, 'SOURCE_SUCCESSOR_WHOLE_INVERSE');
  return before;
}
function requireCurrent(relative, bytes) {
  if (!Object.hasOwn(bank.paths, relative)) return bytes;
  assert(Buffer.isBuffer(bytes), 'SOURCE_SUCCESSOR_REQUIRED_BUFFER');
  assert.equal(sha(bytes), bank.paths[relative].afterSHA256, 'SOURCE_SUCCESSOR_REQUIRED_CURRENT:' + relative);
  return restore(relative, bytes);
}
module.exports = {restore, requireCurrent, bank};
