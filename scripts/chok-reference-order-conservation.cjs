'use strict';
// Strict outer inverse only. Historical source/authority manifests stay unchanged.
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const DELTA=require('./chok-reference-order-delta.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
// Admit only the exact independently meaning-selected English augmentation.
// Every historical source guard still receives its complete original preimage.
function restoreGenesis(relative,bytes){
 if(!((relative==='public/chok.js'&&sha(bytes)==='89bd8b2ffcba1821c65a3a6c288bb481b74df73d04981521b1f34aa6fb34631e')||(relative==='src/pages/reader/chok.astro'&&sha(bytes)==='6b8b72a8ed918b502e0b00c263b127b27b93950b04ac3059ce9b420479e636db')))return bytes;
 const fs=require('node:fs'),path=require('node:path');
 const raw=fs.readFileSync(path.resolve(__dirname,'chok-genesis-english-admission.json'));
 assert.equal(sha(raw),'356d9e714e38db67d0f01f4b428a5e715b417ef422a69ad8882016a7034c0210','GENESIS_ENGLISH_ADMISSION_PIN');
 const d=JSON.parse(raw).paths[relative];if(!d||sha(bytes)!==d.afterSHA256)return bytes;
 let s=bytes.toString('utf8');for(const op of d.inverse){assert.equal(s.split(op.after).length,2,'GENESIS_ENGLISH_INVERSE_MEMBERSHIP:'+relative);s=s.replace(op.after,op.before);}
 const restored=Buffer.from(s);assert.equal(sha(restored),d.beforeSHA256,'GENESIS_ENGLISH_EXACT_INVERSE:'+relative);return restored;
}
function currentReference(relative,bytes){
 bytes=restoreGenesis(relative,bytes);
 if(relative!=='src/pages/reader/chok.astro'||sha(bytes)!=='e64a0357cb610931e31b741e53c313687240e65d324bbcfdb250ebec278bf5c5')return bytes;
 const restored=require('./chok-today-classical-admission.cjs').restore(require('node:path').resolve(__dirname,'..'),relative,bytes);
 assert.equal(sha(restored),DELTA[relative].afterSHA256,'TODAY_REFERENCE_EXACT_INVERSE');return restored;
}
function restoreReference(relative,bytes){
 bytes=currentReference(relative,bytes);
 const d=DELTA[relative];if(!d)return bytes;
 if(sha(bytes)===d.beforeSHA256)return bytes;
 assert.equal(sha(bytes),d.afterSHA256,'REFERENCE_CANDIDATE_PIN:'+relative);
 let text=bytes.toString('utf8');
 for(const op of d.inverse){assert.equal(text.split(op.after).length,2,'REFERENCE_INVERSE_MEMBERSHIP:'+relative);text=text.replace(op.after,op.before);}
 const before=Buffer.from(text);assert.equal(sha(before),d.beforeSHA256,'REFERENCE_EXACT_INVERSE:'+relative);return before;
}
module.exports={DELTA,restoreReference,restoreGenesis};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 for(const [relative,d]of Object.entries(DELTA)){
  const b=currentReference(relative,fs.readFileSync(path.resolve(__dirname,'..',relative)));assert.equal(sha(b),d.afterSHA256,'REQUIRED_CURRENT_REFERENCE_SUCCESSOR:'+relative);
  const restored=restoreReference(relative,b);assert.equal(sha(restored),d.beforeSHA256);assert.deepEqual(restoreReference(relative,restored),restored);
  assert.throws(()=>restoreReference(relative,Buffer.concat([b,Buffer.from(' ')])),/REFERENCE_CANDIDATE_PIN/);
  const bad=Buffer.from(b);bad[Math.floor(bad.length/2)]^=1;assert.throws(()=>restoreReference(relative,bad),/REFERENCE_CANDIDATE_PIN/);
 }
 console.log('Exact reference/paragraph successor inverse PASS:',Object.keys(DELTA).length,'complete paths; append/mid-body corruption rejected; historical manifests unchanged');
}
