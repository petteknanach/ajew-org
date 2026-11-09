'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha=b=>createHash('sha256').update(b).digest('hex');
function restore(relative,bytes){
 const raw=fs.readFileSync(path.join(__dirname,'chok-all-cleared-zohar-admission.json'));
 assert.equal(sha(raw),'477aef4d388f4ab2038f87d4e8e01185ccdfde42cbc795f5873258098467383b','CLEARED_COHORT_PLAN_PIN');
 const d=JSON.parse(raw).paths[relative];if(!d||sha(bytes)!==d.afterSHA256)return bytes;
 const before=Buffer.from(d.beforeBase64,'base64');assert.equal(sha(before),d.beforeSHA256,'CLEARED_COHORT_EXACT_INVERSE:'+relative);return before;
}
module.exports={restore};
