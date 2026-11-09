'use strict';
// Source-only prepared verifier. No execution receipt is implied by this file.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash, webcrypto} = require('node:crypto');
const vm = require('node:vm');
const {TextEncoder} = require('node:util');
const sha = x => createHash('sha256').update(x).digest('hex');
function canonical(x) {
  if (x === null || typeof x !== 'object') return JSON.stringify(x);
  if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
  return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
}
function read(root, name, digest) {
  let raw = fs.readFileSync(path.join(root, name));
  // Parent-selected exact Today successor: verify its full inverse, never repin the historical oracle.
  if (name === 'public/chok-qualified-zohar.js' && digest === '0c920181116e71c08c40235b0a02fb1d0648945c3f323952a44a4d4a69321372' && (sha(raw) === 'daee7cbb92bef8513ea31a336707dcd7667deae49392a2c12a159bb1a687bcdf' || sha(raw) === '0200b50cf4226520e049f751fb6d63e98c2f8702f8f1058112c76e612860b114')) {
    const conservation = require(path.join(root, 'scripts/chok-reference-order-conservation.cjs'));
    raw = conservation.restoreToday(name, conservation.restoreTomorrow(name, raw));
  }
  assert.equal(sha(raw), digest, 'EXACT_INPUT:' + name);
  return raw;
}
function fields(o, keys) {
  assert(o && typeof o === 'object' && !Array.isArray(o));
  assert.deepEqual(Object.keys(o).sort(), keys.slice().sort());
}
function checkNew(u, p, a) {
  fields(u, ['owner','ref','role','status','he','en','explanation','notes']);
  assert.equal(u.owner,a.owner); assert.equal(u.ref,a.ref);
  assert.equal(u.role,a.role); assert.equal(u.status,'complete');
  assert.equal(sha(u.he),a.originalSHA256); assert.equal(sha(u.en),a.englishSHA256);
  fields(u.explanation,['title','paragraphs']); fields(u.explanation.title,['he','en']);
  assert.equal(sha(u.explanation.title.he),a.titleHeSHA256);
  assert.equal(sha(u.explanation.title.en),a.titleEnSHA256);
  assert.equal(u.explanation.paragraphs.length,1);
  fields(u.explanation.paragraphs[0],['he','en']);
  assert.equal(sha(u.explanation.paragraphs[0].he),a.explanationHeSHA256);
  assert.equal(sha(u.explanation.paragraphs[0].en),a.explanationEnSHA256);
  assert.deepEqual(u.notes.map(n => ({id:n.id,owner:n.owner,role:n.role,placement:n.placement,
    heSHA256:sha(n.he),enSHA256:sha(n.en),sourceTextSHA256:n.sourceTextSHA256,span:n.span})),a.notes);
  for (const n of u.notes) {
    fields(n,['id','owner','role','placement','he','en','sourceTextSHA256','span']);
    assert.equal(n.owner,u.owner); assert.equal(n.placement,'outside-source-disclosure');
    assert.equal(n.sourceTextSHA256,sha(u.he));
    assert(n.span.start >= 0 && n.span.end > n.span.start && n.span.end <= Array.from(u.he).length);
    assert.equal(n.span.unit,'unicode-codepoint'); assert.equal(n.span.endExclusive,true);
  }
  assert.equal(p.edition,a.edition); assert.equal(p.provenanceSHA256,a.provenanceSHA256);
  assert.deepEqual(p.admission,a.admission);
}
async function verify(root) {
  root = path.resolve(root);
  const expected = JSON.parse(read(root,'scripts/chok-firstweek-zhm-reviewed.json','b22f03032cd0e7d0e6122cf5988e5e573a011b16354a22a7c3c33d01f63f24ea'));
  for (const [name,pin] of Object.entries(expected.dependencies)) read(root,name,pin.sha256);
  const legacyChecker = require(path.join(root,'scripts/verify-chok-qualified-daily.cjs')).checkOracle;
  const host = {crypto:webcrypto};
  const sandbox = {window:host,TextEncoder,Uint8Array}; vm.createContext(sandbox);
  for (const name of ['public/chok-qualified-daily.js','public/chok-qualified-daily-classical-selected-v1.js']) {
    new vm.Script(read(root,name,expected.dependencies[name].sha256).toString('utf8'),{filename:name}).runInContext(sandbox);
  }
  const originalAPI = host.ChokQualifiedDailySelected;
  new vm.Script(read(root,'public/chok-firstweek-zhm-private-v1.js',expected.moduleSHA256).toString('utf8'),
    {filename:'chok-firstweek-zhm-private-v1.js'}).runInContext(sandbox);
  const api = host.ChokQualifiedDailySelected;
  let newUnits=0, newNotes=0, legacyUnits=0, reads=0;
  for (const e of expected.entries) {
    const loader = async url => {
      assert.equal(url,e.url+'?v='+e.payloadSHA256); reads++;
      return read(root,'public'+e.url,e.payloadSHA256).toString('utf8');
    };
    const packet = JSON.parse(JSON.stringify(await api.load(e.week,e.day,e.schedule,loader)));
    assert.equal(packet.key,e.key); assert.deepEqual(Object.keys(packet.sections).sort(),Object.keys(e.sections).sort());
    const added = expected.newSections[e.key];
    for (const name of added) {
      const section=packet.sections[name], plan=e.sections[name], owned=expected.units.filter(u=>u.readingId===e.key&&u.section===name);
      assert.deepEqual(section.reference,plan.reference); assert.deepEqual(section.extent,plan.extent);
      assert.deepEqual(section.units.map(u=>u.owner),owned.map(u=>u.owner));
      section.units.forEach((u,i)=>{checkNew(u,plan.units[i],owned[i]);newUnits++;newNotes+=u.notes.length;});
    }
    const old = expected.legacyEntries.find(v=>v.key===e.key);
    if (old) {
      const sub=Object.assign({},packet,{sections:{}});
      for (const name of Object.keys(old.sections)) sub.sections[name]=packet.sections[name];
      const result=legacyChecker(sub,old,expected.legacyOracle); legacyUnits+=result.checked;
      assert.deepEqual(Object.keys(e.sections).filter(n=>!added.includes(n)).sort(),Object.keys(old.sections).sort());
    }
    for (const section of Object.keys(e.sections)) {
      assert(api.has(e.week,e.day,section));
      const html=await api.reading(e.week,e.day,section,{language:'both',mode:'full',commentary:true,
        optionalRashi:false,transform:s=>s},loader,e.schedule);
      assert(html && html.includes('ck-qualified-daily'));
      // This is API rendering, not a whole Main or native paint acceptance.
    }
  }
  assert.equal(newUnits,expected.counts.units); assert.equal(newNotes,expected.counts.notes);
  assert.equal(reads,expected.entries.length);
  const held=expected.heldCurrent;
  assert.equal(api.has(held.week,held.day,'zohar'),originalAPI.has(held.week,held.day,'zohar'));
  assert.equal(sha(read(root,held.modulePath,held.moduleSHA256)),held.moduleSHA256);
  return {privateCandidate:true,readings:expected.entries.length,newUnits,newNotes,legacyUnits,
    productionAPI:true,independentNewFieldOracle:true,unchangedLegacyCheckOracle:true,
    wholeMain:false,nativePaint:false,publication:false};
}
module.exports={verify,checkNew};
if (require.main===module) {
  if (process.argv[2]!=='--execute-private-candidate') throw Error('SEPARATE_PARENT_RUNTIME_ADMISSION_REQUIRED');
  verify(path.resolve(__dirname,'..')).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e.stack);process.exitCode=1;});
}
