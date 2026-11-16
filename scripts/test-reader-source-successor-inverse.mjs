import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const outer = require('./reader-source-successor-inverse.cjs');
const composed = require('./reader-cross-reference-cache-conservation.cjs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (commit, relative) => execFileSync('git', ['show', `${commit}:${relative}`], {cwd:root, maxBuffer:8*1024*1024});
const owners = Object.keys(outer.bank.paths);
test('outer domain is exactly the actual changed intersection with the frozen 258-query authority', () => {
  const changed = execFileSync('git', ['diff', '--name-only', outer.bank.sourceCommit, outer.bank.successorCommit], {cwd:root, encoding:'utf8'}).trim().split('\n');
  assert.deepEqual(changed.filter(p=>Object.hasOwn(composed.delta.paths,p)), owners);
  for (const relative of owners) {
    const current = fs.readFileSync(new URL('../'+relative,import.meta.url));
    const before = git(outer.bank.sourceCommit,relative);
    assert.deepEqual(outer.requireCurrent(relative,current),before);
    assert.deepEqual(outer.restore(relative,current),before);
    assert.deepEqual(composed.requireCurrent(relative,current),git(composed.delta.sourceCommit,relative));
    assert.deepEqual(composed.restore(relative,current),git(composed.delta.sourceCommit,relative));
    assert.equal(sha(current),outer.bank.paths[relative].afterSHA256);
  }
});
test('changed, absent, malformed, foreign owner and missing successor bodies cannot be admitted', () => {
  for (const relative of owners) {
    const current=fs.readFileSync(new URL('../'+relative,import.meta.url));
    const other=fs.readFileSync(new URL('../'+owners.find(p=>p!==relative),import.meta.url));
    const changed=Buffer.from(current);changed[Math.floor(changed.length/2)]^=1;
    for (const bad of [undefined,null,'not bytes',Buffer.alloc(0),Buffer.from('{malformed'),changed,other,Buffer.concat([current,Buffer.from(' ')]),git(outer.bank.sourceCommit,relative)]) {
      assert.equal(outer.restore(relative,bad),bad,'unadmitted body must never be transformed');
      assert.throws(()=>outer.requireCurrent(relative,bad),assert.AssertionError);
      assert.throws(()=>composed.requireCurrent(relative,bad));
    }
    for (const unknown of ['unselected/source','__proto__','constructor',relative+'-wrong'])
      assert.equal(outer.restore(unknown,current),current);
    assert.deepEqual(outer.requireCurrent(relative,current),git(outer.bank.sourceCommit,relative),'restored positive');
  }
});
test('cold bank/helper tampering and missing bank fail before guard use', () => {
  const script = `const Module=require('node:module'), fs=require('node:fs');
const original=fs.readFileSync;
fs.readFileSync=function(p,...args){if(String(p).endsWith(process.argv[1])){
if(process.argv[2]==='missing')throw Error('missing bank');
return Buffer.from('malformed or altered authority');}return original.call(this,p,...args);};
const admitted=require(process.argv[3]);if(process.argv[3].endsWith('reader-cross-reference-cache-conservation.cjs'))admitted.requireCurrent('src/pages/reader/otzar-hayirah/[part]/[torah].astro',Buffer.from(process.argv[4],'base64'));`;
  for (const [target,mode,entry] of [
    ['reader-source-successor-inverse.json','changed','reader-source-successor-inverse.cjs'],
    ['reader-source-successor-inverse.json','missing','reader-source-successor-inverse.cjs'],
    ['reader-source-successor-inverse.cjs','changed','reader-cross-reference-cache-conservation.cjs'],
  ]) assert.throws(()=>execFileSync(process.execPath,['-e',script,target,mode,fileURLToPath(new URL('./'+entry,import.meta.url)),fs.readFileSync(new URL('../'+owners[0],import.meta.url)).toString('base64')],{cwd:root,stdio:'pipe'}), error => {
    assert.match(error.stderr.toString(), mode === 'missing' ? /missing bank/ : target.endsWith('.cjs') ? /SOURCE_SUCCESSOR_HELPER_PIN/ : /SOURCE_SUCCESSOR_BANK_PIN/);
    return true;
  });
  execFileSync(process.execPath,['-e',`const fs=require('node:fs');require('./scripts/reader-cross-reference-cache-conservation.cjs').requireCurrent(${JSON.stringify(owners[0])},fs.readFileSync(${JSON.stringify(owners[0])}));`],{cwd:root,stdio:'pipe'});
});
