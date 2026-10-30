'use strict';
// Strict outer inverse only. Historical source/authority manifests stay unchanged.
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const DELTA=require('./chok-reference-order-delta.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
function restoreReference(relative,bytes){
 const d=DELTA[relative];if(!d)return bytes;
 if(sha(bytes)===d.beforeSHA256)return bytes;
 assert.equal(sha(bytes),d.afterSHA256,'REFERENCE_CANDIDATE_PIN:'+relative);
 let text=bytes.toString('utf8');
 for(const op of d.inverse){assert.equal(text.split(op.after).length,2,'REFERENCE_INVERSE_MEMBERSHIP:'+relative);text=text.replace(op.after,op.before);}
 const before=Buffer.from(text);assert.equal(sha(before),d.beforeSHA256,'REFERENCE_EXACT_INVERSE:'+relative);return before;
}
module.exports={DELTA,restoreReference};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 for(const [relative,d]of Object.entries(DELTA)){
  const b=fs.readFileSync(path.resolve(__dirname,'..',relative));assert.equal(sha(b),d.afterSHA256,'REQUIRED_CURRENT_REFERENCE_SUCCESSOR:'+relative);
  const restored=restoreReference(relative,b);assert.equal(sha(restored),d.beforeSHA256);assert.deepEqual(restoreReference(relative,restored),restored);
  assert.throws(()=>restoreReference(relative,Buffer.concat([b,Buffer.from(' ')])),/REFERENCE_CANDIDATE_PIN/);
  const bad=Buffer.from(b);bad[Math.floor(bad.length/2)]^=1;assert.throws(()=>restoreReference(relative,bad),/REFERENCE_CANDIDATE_PIN/);
 }
 console.log('Exact reference/paragraph successor inverse PASS:',Object.keys(DELTA).length,'complete paths; append/mid-body corruption rejected; historical manifests unchanged');
}
