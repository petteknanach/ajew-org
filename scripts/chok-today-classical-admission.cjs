/* Exact additive Vayera-Friday selection. No publication authority. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha=x=>createHash('sha256').update(x).digest('hex');
const PLAN_SHA='e9764fd23b4780e41c7221b9dbbebe916632d3046c670c743b6c0917ec610105';
function canonical(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
function plan(root){const b=fs.readFileSync(path.join(root,'scripts/chok-today-classical-admission.json'));assert.equal(sha(b),PLAN_SHA,'TODAY_ADMISSION_PIN');return JSON.parse(b);}
function restore(root,relative,bytes){
 if((relative==='public/chok.js'&&sha(bytes)==='04eaaeea7ce2bc6cf153837d235ba76868b4bbdb7c6fa2f18bf3639b0f67eeea')||(relative==='src/pages/reader/chok.astro'&&sha(bytes)==='3617da3a1dfe1ee5d056b9204e8c46a9f5b5bf38bca9899dc99195339299797c')||(relative==='public/chok-qualified-zohar.js'&&sha(bytes)==='daee7cbb92bef8513ea31a336707dcd7667deae49392a2c12a159bb1a687bcdf')||(relative==='public/chok.js'&&sha(bytes)==='7987621767f6bacf9cc742b85c9578e15730248a0ef7c1e4cfe7c5a3eb2844c9')||(relative==='src/pages/reader/chok.astro'&&sha(bytes)==='20e32cb922d077c2958340e077ec23ac3d6736bd5743a72daf5912a47f9e1619')||(relative==='public/chok-qualified-zohar.js'&&sha(bytes)==='0c920181116e71c08c40235b0a02fb1d0648945c3f323952a44a4d4a69321372'))bytes=require('./chok-reference-order-conservation.cjs').restoreGenesis(relative,bytes);
 const a=plan(root);let s=bytes.toString('utf8');
 if(relative==='public/chok-qualified-daily-classical-selected-v1.js'){
  assert.equal(sha(bytes),a.newSelectedSHA256,'TODAY_SELECTED_PIN');const needle=canonical(a.newDescriptor);assert.equal(s.split(needle).length,2,'TODAY_DESCRIPTOR_UNIQUE');s=s.replace(needle,canonical(a.oldDescriptor));assert.equal(sha(s),a.oldSelectedSHA256,'TODAY_SELECTED_EXACT_INVERSE');return Buffer.from(s);
 }
 const edits=a.inverseEdits[relative];if(!edits)return bytes;
 for(const[after,before]of edits){assert.equal(s.split(after).length,2,'TODAY_INVERSE_PREIMAGE:'+relative);s=s.replace(after,before);}
 return Buffer.from(s);
}
function check(root,oracle){
 const a=plan(root),b=fs.readFileSync(path.join(root,'public/chok-qualified-daily-classical-selected-v1.js'));restore(root,'public/chok-qualified-daily-classical-selected-v1.js',b);
 const raw=fs.readFileSync(path.join(root,'public'+a.newDescriptor.url));assert.equal(sha(raw),a.newPayloadSHA256,'TODAY_PAYLOAD_PIN');const payload=JSON.parse(raw);
 const old=JSON.parse(JSON.stringify(payload));delete old.sections.halacha;delete old.sections.mussar;
 assert.deepEqual(old,JSON.parse(a.oldPayloadUTF8),'TODAY_PAYLOAD_OUTSIDE_FIELD_INVERSE');assert.equal(sha(a.oldPayloadUTF8),a.oldPayloadSHA256,'TODAY_PAYLOAD_BYTE_INVERSE');
 assert.deepEqual(Object.keys(payload.sections).sort(),['halacha','mishna','mussar','talmud']);
 for(const name of ['mishna','talmud'])assert.deepEqual(a.newDescriptor.sections[name],a.oldDescriptor.sections[name],'TODAY_OLD_SECTION_PLAN');
 for(const key of Object.keys(a.oldDescriptor))if(!['sections','payloadSHA256'].includes(key))assert.deepEqual(a.newDescriptor[key],a.oldDescriptor[key],'TODAY_ENTRY_OUTSIDE_CONSERVATION');
 for(const row of a.rows){assert(!oracle.units.some(x=>x.owner===row.owner),'TODAY_DUPLICATE_REVIEWED_OWNER');assert.equal(row.readingId,a.key);}
 assert.equal(a.rows.length,5);assert.equal(a.rows.filter(r=>r.role==='halacha').length,4);assert.equal(a.rows.filter(r=>r.role==='mussar').length,1);
 oracle.units.push(...a.rows);oracle.todayClassical={key:a.key,sections:Object.fromEntries(['halacha','mussar'].map(name=>[name,{reference:a.newDescriptor.sections[name].reference,extent:a.newDescriptor.sections[name].extent,owners:a.newDescriptor.sections[name].units.map(u=>u.owner)}]))};
 return a;
}
module.exports={plan,restore,check,canonical};
