/* Exact source-admission extension. All original verifier assertions remain.
 * Source proposal only: this file has not been executed or parent-reviewed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const sha=x=>createHash('sha256').update(x).digest('hex');
function canonical(x){
 if(x===null||typeof x!=='object')return JSON.stringify(x);
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
function check(root,oracle){
 const raw=fs.readFileSync(path.join(root,'scripts/chok-next-readings-source-admission.json'));
 assert.equal(sha(raw),'8e48693c68790d584cbc4082e9b245622eb8f8085be1e02bf7e5c7a31b82f70f','SOURCE_ADMISSION_PIN');
 const a=JSON.parse(raw);assert.equal(a.schema,'chok-exact-next-readings-source-admission-v1');
 assert.equal(a.baseRevision,'dfb3b2d99725951eb82b60683570fa61bcad8647');
 assert.deepEqual(a.targets.map(t=>t.readingId).sort(),['ויצא|יום ראשון','ויצא|יום שני','ויצא|יום שלישי'].sort());
 assert.equal(oracle.authoritySHA256,a.originalGlobalAuthoritySHA256,'OLD_AUTHORITY_CONSERVATION');
 assert.deepEqual(oracle.readingKeys,a.readingKeys,'READING_DOMAIN');
 const keys=new Set(a.targets.map(t=>t.readingId));
 const old=oracle.units.filter(u=>!keys.has(u.readingId));
 assert.equal(old.length,a.untouchedOracleRows);assert.equal(sha(canonical(old)),a.untouchedOracleRowsSHA256,'UNTOUCHED_ORACLE_CONSERVATION');
 assert.equal(sha(fs.readFileSync(path.join(root,'public/chok-qualified-daily-selected.js'))),a.selectedIndexSHA256,'EXACT_SELECTED_SOURCE');
 for(const[p,digest]of Object.entries(a.unchangedSources))assert.equal(sha(require('./chok-attribution-conservation.cjs').historicalSource(root,p)),digest,'FOREIGN_RUNTIME_CONSERVATION:'+p);
 for(const t of a.targets){
  const rows=oracle.units.filter(u=>u.readingId===t.readingId);assert.deepEqual(rows.map(r=>r.owner),t.owners,'EXACT_SOURCE_OWNERS');
  assert.equal(sha(canonical(rows)),t.expectedRowsSHA256,'APPROVAL_DERIVED_FIELDS');
  const chain=a.chains.find(c=>c.readingId===t.readingId);assert(chain);assert.equal(sha(canonical(chain)),t.sourceApprovalChainSHA256,'SOURCE_APPROVAL_CHAIN');
  for(const r of rows)assert.equal(r.authoritySHA256,t.sourceApprovalChainSHA256,'OWNER_SOURCE_AUTHORITY');
  const file=path.resolve(root,'public','.'+t.url);assert(file.startsWith(path.resolve(root,'public')+path.sep));
  assert.equal(sha(fs.readFileSync(file)),t.payloadSHA256,'EXACT_APPROVED_PAYLOAD');
 }
 return {sourceAdmission:true,targets:a.targets.length,untouchedRows:old.length,nativeOrPublicationApproval:false};
}
module.exports={check};
