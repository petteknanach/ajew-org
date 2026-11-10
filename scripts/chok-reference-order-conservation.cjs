'use strict';
// Strict outer inverse only. Historical source/authority manifests stay unchanged.
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const DELTA=require('./chok-reference-order-delta.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
// Admit only the exact independently meaning-selected English augmentation.
// Every historical source guard still receives its complete original preimage.
// Exact TODAY-only outer inverse; historical admissions below remain unchanged.
function restoreToday(relative,bytes){
 const allowed={"public/chok.js":"04eaaeea7ce2bc6cf153837d235ba76868b4bbdb7c6fa2f18bf3639b0f67eeea","public/chok-qualified-zohar.js":"daee7cbb92bef8513ea31a336707dcd7667deae49392a2c12a159bb1a687bcdf","src/pages/reader/chok.astro":"3617da3a1dfe1ee5d056b9204e8c46a9f5b5bf38bca9899dc99195339299797c"};
 if(!allowed[relative]||sha(bytes)!==allowed[relative])return bytes;
 const fs=require('node:fs'),path=require('node:path'),raw=fs.readFileSync(path.resolve(__dirname,'chok-today-toldos-monday-admission.json'));
 assert.equal(sha(raw),'130f742f6158b11b0aa04ec09e7a6127c5b3afd0889343f7594c2c84253b09be','TOLDOS_MONDAY_ADMISSION_PIN');
 const d=JSON.parse(raw).paths[relative];assert(d);assert.equal(sha(bytes),d.afterSHA256,'TOLDOS_MONDAY_AFTER_PIN');
 let s=bytes.toString('utf8');for(const op of d.inverse){assert.equal(s.split(op.after).length,2,'TOLDOS_MONDAY_INVERSE_MEMBERSHIP:'+relative);s=s.replace(op.after,op.before);}
 const before=Buffer.from(s);assert.equal(sha(before),d.beforeSHA256,'TOLDOS_MONDAY_WHOLE_INVERSE:'+relative);return before;
}
// Exact TOMORROW-only outer inverse; restoreToday keeps its original 18-source boundary.
function restoreCurrent37(relative,bytes){return require('./chok-all-cleared-zohar-admission.cjs').restoreCurrent37(relative,bytes);}
function restoreCleared(relative,bytes){
 bytes=restoreCurrent37(relative,bytes);
 const allowed={"public/chok.js":"418514feb99ec895017ddef2b6746f99f2e6c64613a549d5354213c4cf637a06","public/chok-qualified-zohar.js":"d89f12181e90034b08d036cf96fe7493ed984776db5a5574a515e0c095346a08","src/pages/reader/chok.astro":"f3a696f8ed967b071eacd3f9d93bd69827ffa7cb21a875891258efac9035149f","scripts/chok-genesis-english.test.cjs":"c74463b3593e308e1596e1352ea60541b97c023c96eee1bc1960540b16332fdf"};
 if(!allowed[relative]||sha(bytes)!==allowed[relative])return bytes;
 return require('./chok-all-cleared-zohar-admission.cjs').restore(relative,bytes);
}
function restoreTomorrow(relative,bytes){
 bytes=restoreCleared(relative,bytes);
 const allowed={"public/chok-qualified-zohar.js":"0200b50cf4226520e049f751fb6d63e98c2f8702f8f1058112c76e612860b114","public/chok.js":"21ec760448c18fbed0a2357278660a033311fe8d20fe17263051417da31da78e","src/pages/reader/chok.astro":"4e3d4fa3ccf53ffddb10a1446daa4289804a5f24a5331163253b1daf05a09413"};
 if(!allowed[relative]||sha(bytes)!==allowed[relative])return bytes;
 const fs=require('node:fs'),path=require('node:path'),raw=fs.readFileSync(path.resolve(__dirname,'chok-tomorrow-toldos-tuesday-admission.json'));
 assert.equal(sha(raw),'60bb19020ed1b3aa711619194dcd9e782731bec2c5c93870c23e3b92ce9f217f','TOLDOS_TUESDAY_ADMISSION_PIN');
 const d=JSON.parse(raw).paths[relative];assert(d);assert.equal(sha(bytes),d.afterSHA256,'TOLDOS_TUESDAY_AFTER_PIN');
 let s=bytes.toString('utf8');for(const op of d.inverse){assert.equal(s.split(op.after).length,2,'TOLDOS_TUESDAY_INVERSE_MEMBERSHIP:'+relative);s=s.replace(op.after,op.before);}
 const before=Buffer.from(s);assert.equal(sha(before),d.beforeSHA256,'TOLDOS_TUESDAY_WHOLE_INVERSE:'+relative);return before;
}
function restoreGenesis(relative,bytes){
 bytes=restoreTomorrow(relative,bytes);
 bytes=restoreToday(relative,bytes);
 if(!((relative==='public/chok.js'&&sha(bytes)==='7987621767f6bacf9cc742b85c9578e15730248a0ef7c1e4cfe7c5a3eb2844c9')||(relative==='src/pages/reader/chok.astro'&&sha(bytes)==='20e32cb922d077c2958340e077ec23ac3d6736bd5743a72daf5912a47f9e1619')||(relative==='public/chok-qualified-zohar.js'&&sha(bytes)==='0c920181116e71c08c40235b0a02fb1d0648945c3f323952a44a4d4a69321372')))return bytes;
 const fs=require('node:fs'),path=require('node:path');
 const raw=fs.readFileSync(path.resolve(__dirname,'chok-genesis-english-admission.json'));
 assert.equal(sha(raw),'46b87aeac256133c3f9f115e4ac67f3fc28b66400ad463f5c8730c08b5cec3f2','GENESIS_ENGLISH_ADMISSION_PIN');
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
module.exports={restoreCurrent37,restoreCleared,DELTA,restoreReference,restoreGenesis,restoreToday,restoreTomorrow};
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
