'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha=b=>createHash('sha256').update(b).digest('hex');
function restore(relative,bytes){
 const raw=fs.readFileSync(path.join(__dirname,'chok-all-cleared-zohar-admission.json'));
 assert.equal(sha(raw),'9bb314e93c89020993ef71087484d3e38d02376ee9bf7e7a3e4b04e62952a91c','CLEARED_COHORT_PLAN_PIN');
 const d=JSON.parse(raw).paths[relative];if(!d||sha(bytes)!==d.afterSHA256)return bytes;
 const before=Buffer.from(d.beforeBase64,'base64');assert.equal(sha(before),d.beforeSHA256,'CLEARED_COHORT_EXACT_INVERSE:'+relative);return before;
}
function restoreCurrent37(relative,bytes){
 if(!['public/chok.js','public/chok-qualified-zohar.js','src/pages/reader/chok.astro','scripts/chok-genesis-english.test.cjs'].includes(relative))return bytes;
 const raw=fs.readFileSync(path.join(__dirname,'chok-all-cleared-zohar-admission.json'));assert.equal(sha(raw),'9bb314e93c89020993ef71087484d3e38d02376ee9bf7e7a3e4b04e62952a91c','CURRENT37_PLAN_PIN');const d=JSON.parse(raw).current37.paths[relative];if(!d||sha(bytes)!==d.afterSHA256)return bytes;const before=Buffer.from(d.beforeBase64,'base64');assert.equal(sha(before),d.beforeSHA256,'CURRENT37_EXACT_INVERSE:'+relative);return before;
}
module.exports={restore,restoreCurrent37};
