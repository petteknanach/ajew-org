'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha=b=>createHash('sha256').update(b).digest('hex');
function restore(relative,bytes){
 const raw=fs.readFileSync(path.join(__dirname,'chok-all-cleared-zohar-admission.json'));
 assert.equal(sha(raw),'9bb314e93c89020993ef71087484d3e38d02376ee9bf7e7a3e4b04e62952a91c','CLEARED_COHORT_PLAN_PIN');
 const d=JSON.parse(raw).paths[relative];if(!d||sha(bytes)!==d.afterSHA256)return bytes;
 const before=Buffer.from(d.beforeBase64,'base64');assert.equal(sha(before),d.beforeSHA256,'CLEARED_COHORT_EXACT_INVERSE:'+relative);return before;
}
function restoreCurrent38(relative,bytes){
 const allowed={"public/chok-qualified-zohar.js":"c9f930afecfea0afcb6472b08a2b46ac51c6380621ad4e1a9123452dc0a048d8","public/chok.js":"0fa752655b0c54a5d5947d1ebd92b6d30b2a87c858d0f811b5685aeceb834e22","src/pages/reader/chok.astro":"1f5fc3bda5dbaee7853e3443de4cf2c4fa5638e769cc12d931b8d1420481a16c","scripts/chok-genesis-english.test.cjs":"1862d1423dff46d5917f7d8aec9eca79877468ff3fffba54a29563d305f94d94"};
 if(!allowed[relative]||sha(bytes)!==allowed[relative])return bytes;
 const raw=fs.readFileSync(path.join(__dirname,'chok-lech-tuesday38-admission.json'));assert.equal(sha(raw),'7573807ee258b49c82ad1a4702b47c3d36a5a87a633a763ffe4274bf0b6a4471','CURRENT38_PLAN_PIN');
 const d=JSON.parse(raw).paths[relative];assert(d);assert.equal(sha(bytes),d.afterSHA256,'CURRENT38_AFTER_PIN:'+relative);
 let s=bytes.toString('utf8');for(const op of d.inverse){assert.equal(s.split(op.after).length,2,'CURRENT38_INVERSE_MEMBERSHIP:'+relative);s=s.replace(op.after,op.before);}
 const before=Buffer.from(s);assert.equal(sha(before),d.beforeSHA256,'CURRENT38_EXACT_INVERSE:'+relative);return before;
}
function restoreCurrent37(relative,bytes){
 if(!['public/chok.js','public/chok-qualified-zohar.js','src/pages/reader/chok.astro','scripts/chok-genesis-english.test.cjs'].includes(relative))return bytes;
 bytes=restoreCurrent38(relative,bytes);
 const raw=fs.readFileSync(path.join(__dirname,'chok-all-cleared-zohar-admission.json'));assert.equal(sha(raw),'9bb314e93c89020993ef71087484d3e38d02376ee9bf7e7a3e4b04e62952a91c','CURRENT37_PLAN_PIN');const d=JSON.parse(raw).current37.paths[relative];if(!d||sha(bytes)!==d.afterSHA256)return bytes;const before=Buffer.from(d.beforeBase64,'base64');assert.equal(sha(before),d.beforeSHA256,'CURRENT37_EXACT_INVERSE:'+relative);return before;
}
module.exports={restore,restoreCurrent38,restoreCurrent37};
