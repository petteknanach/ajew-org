'use strict';
// Outer inverse for exactly three build-time optional-file guards. No query pins move.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const sha = b => createHash('sha256').update(b).digest('hex');
const raw = fs.readFileSync(path.join(__dirname, 'reader-optional-commentary-guard-delta.json'));
assert.equal(sha(raw), '7dd910f86f7cbb6b9f5de81a5dc55f54e892a0428e3340b46c2f1fb6e3a44173', 'OPTIONAL_GUARD_AUTHORITY_PIN');
const delta = JSON.parse(raw);
assert.equal(Object.keys(delta.paths).length, 3, 'OPTIONAL_GUARD_EXACT_DOMAIN');
function restore(relative, bytes) {
  const d = delta.paths[relative];
  if (!d || !Buffer.isBuffer(bytes) || sha(bytes) !== d.afterSHA256) return bytes;
  assert.equal(bytes.length, d.afterBytes, 'OPTIONAL_GUARD_AFTER_BYTES:' + relative);
  const source = bytes.toString('utf8');
  assert.equal(source.split(d.after).length, 2, 'OPTIONAL_GUARD_UNIQUE:' + relative);
  const before = Buffer.from(source.replace(d.after, d.before));
  assert.equal(before.length, d.beforeBytes);
  assert.equal(sha(before), d.beforeSHA256, 'OPTIONAL_GUARD_WHOLE_INVERSE:' + relative);
  return before;
}
function requireCurrent(relative, bytes) {
  const d = delta.paths[relative];
  if (!d) return bytes; // The inherited query layer owns all other paths.
  assert(Buffer.isBuffer(bytes), 'OPTIONAL_GUARD_REQUIRED_BUFFER:' + relative);
  assert.equal(sha(bytes), d.afterSHA256, 'OPTIONAL_GUARD_REQUIRED_CURRENT:' + relative);
  return restore(relative, bytes);
}
module.exports = {restore, requireCurrent, delta};
