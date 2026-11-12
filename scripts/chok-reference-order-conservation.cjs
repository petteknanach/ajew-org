'use strict';
// Strict outer inverse only. Historical source/authority manifests stay unchanged.
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const DELTA=require('./chok-reference-order-delta.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
// Restore only the independently reviewed chapter-resource adoption before the
// unchanged reference/paragraph guards. No historical hash or manifest changes.
const readerAdoptionRaw=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'fixtures/tanach-commentary-availability/approved-template-delta.json'));
assert.equal(sha(readerAdoptionRaw),'8dba2fc162cb511197afd10ab12eec5c361c5bc1a41d7518c7523cc3f055eb61','READER_COMMENTARY_ADOPTION_PIN');
const READER_ADOPTION=JSON.parse(readerAdoptionRaw);
assert.equal(Object.keys(READER_ADOPTION.paths).length,24,'READER_COMMENTARY_EXACT_DOMAIN');
for(const [relative,d]of Object.entries(READER_ADOPTION.paths))assert.equal(d.beforeSHA256,DELTA[relative].afterSHA256,'READER_COMMENTARY_HISTORICAL_JOIN:'+relative);
function restoreReaderCommentary(relative,bytes){
 const d=READER_ADOPTION.paths[relative];if(!d||sha(bytes)!==d.afterSHA256)return bytes;
 let text=bytes.toString('utf8');
 for(const op of d.inverse){assert.equal(text.split(op.after).length,2,'READER_COMMENTARY_INVERSE_MEMBERSHIP:'+relative);text=text.replace(op.after,op.before);}
 const before=Buffer.from(text);assert.equal(sha(before),d.beforeSHA256,'READER_COMMENTARY_WHOLE_INVERSE:'+relative);return before;
}
// Admit only the exact independently meaning-selected English augmentation.
// Every historical source guard still receives its complete original preimage.
// Exact TODAY-only outer inverse; historical admissions below remain unchanged.
// Exact field-selected Friday note outer inverse; all historical authorities remain unchanged.
// Separate exact Halacha and parent-QA outer layers; historical admissions stay exact.
function restoreToldosWednesdayOuter(relative,bytes,filename,pin){
 const fs=require('node:fs'),path=require('node:path'),raw=fs.readFileSync(path.resolve(__dirname,filename));assert.equal(sha(raw),pin,'TOLDOS_WEDNESDAY_OUTER_ADMISSION_PIN');
 const d=JSON.parse(raw).paths[relative];if(!d||bytes===null||sha(bytes)!==d.afterSHA256)return bytes;
 assert.equal(bytes.length,d.afterBytes,'TOLDOS_WEDNESDAY_OUTER_BYTES');if(d.beforeSHA256===null)return null;
 let s=bytes.toString('utf8');for(const op of d.inverse){assert.equal(s.split(op.after).length,op.occurrences+1,'TOLDOS_WEDNESDAY_OUTER_MEMBERSHIP:'+relative);s=s.split(op.after).join(op.before);}
 const old=Buffer.from(s);assert.equal(old.length,d.beforeBytes);assert.equal(sha(old),d.beforeSHA256,'TOLDOS_WEDNESDAY_OUTER_WHOLE_INVERSE:'+relative);return old;
}
function restoreToldosWednesdayHalacha(relative,bytes){const allowed={"public/chok-qualified-daily-classical-selected-v1.js":"91c4fbea65117b3c507151eb90ed57b466f019c550d9bd1499a4ac82ba6d61f7","scripts/chok-qualified-daily-reviewed.json":"0b379a4c079e3cd009a4f847035eaf59d9e0c1359161d1c2d9c4ba62ddfe22be","src/pages/reader/chok.astro":"084af3faa253e1dd96fda6aa46f4ff43db78e038f35eaa2eb2b5eda44b798533","public/reader/chok/qualified/toldos-wednesday-complete-mussar-halacha-data-candidate-v1.json":"57da31e58cff24736b9db39b71e714ff0326e25366bdffe827523a1dea5c4624"};if(!allowed[relative]||bytes===null||sha(bytes)!==allowed[relative])return bytes;return restoreToldosWednesdayOuter(relative,bytes,'chok-toldos-wednesday-halacha-admission.json','8691851fb48045fee5b79def3713e0d03d921d1f7f9848824c8380fabea2e793');}
function restoreToldosWednesdayFinalQA(relative,bytes){const allowed={"scripts/verify-chok-qualified-daily.cjs":"b834c1ec21157e573754cfa5701daa067710071384c743ec5e68d3f8604a651b","scripts/chok-genesis-english.test.cjs":"0863944fc7f2ccd1a0211f8410fb63190be9d35e3fdfbd5e5e7f5d9904ec3503"};if(!allowed[relative]||bytes===null||sha(bytes)!==allowed[relative])return bytes;return restoreToldosWednesdayOuter(relative,bytes,'chok-toldos-wednesday-final-qa-admission.json','760e9f8d67e27027cb665f4da5d6c369dadf9ee0941c8abf8da2c421234e1f17');}
function restoreToldosWednesdayMussar(relative,bytes){
 bytes=restoreToldosWednesdayFinalQA(relative,restoreToldosWednesdayHalacha(relative,bytes));if(bytes===null)return null;
 const allowed={"public/chok-qualified-daily-classical-selected-v1.js":"fb9b96722705e771c2c137a7f2058219685a84e14267cf7c7ea93e43d59a4727","public/chok-qualified-daily.js":"9d3039077c36ec66f8e71d65c42ae903f4f5d94b8c7db129cb7b90e6ae580a25","public/reader/chok/qualified/toldos-wednesday-complete-mussar-additive-v1.json":"404a8ccccbb70d787a91102c422bf0de091113739d9f155a89280ad98af78fbc","scripts/chok-genesis-english.test.cjs":"f799caf596cb860dc2c1482db1f220471a74d07aea6c060c4b887438ffc789db","scripts/chok-qualified-daily-reviewed.json":"58a4e359d1e333959dcdaadfd9088e07e06b2c6821e7875187f276613d6f69aa","scripts/verify-chok-qualified-daily.cjs":"213c9bfe2556e3c16e546845ee548070fd3f9cf38f7ed819b13e880d83084ac5","scripts/verify-chok-vayaitzai-thursday.cjs":"250e6ba5d83cdbfd696a155b7652b5f42e7c1594f3ca7144fdef3e3517fccf47","src/pages/reader/chok.astro":"ab05733826a4102a0bcbf95d083a7ed25aebdf9a76890973de609f67cd949805"};
 if(!allowed[relative]||sha(bytes)!==allowed[relative])return bytes;
 const raw=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'chok-toldos-wednesday-mussar-admission.json'));
 assert.equal(sha(raw),'61a78bc6ac05a4a3e0825e543bd517d0d115159fe9704bb5a99cc0e4b556b102','TOLDOS_WEDNESDAY_MUSSAR_ADMISSION_PIN');
 const d=JSON.parse(raw).paths[relative];assert(d);assert.equal(sha(bytes),d.afterSHA256,'TOLDOS_WEDNESDAY_MUSSAR_AFTER_PIN');
 if(d.beforeSHA256===null)return null;
 let s=bytes.toString('utf8');for(const op of d.inverse){assert.equal(s.split(op.after).length,op.occurrences+1,'TOLDOS_WEDNESDAY_MUSSAR_INVERSE_MEMBERSHIP:'+relative);s=s.split(op.after).join(op.before);}
 const old=Buffer.from(s);assert.equal(sha(old),d.beforeSHA256,'TOLDOS_WEDNESDAY_MUSSAR_WHOLE_INVERSE:'+relative);return old;
}
function restoreVayaitzaiFridayNote(relative,bytes){
 bytes=restoreToldosWednesdayMussar(relative,bytes);
 const allowed={"public/chok-qualified-daily-classical-selected-v1.js":"238f54a00bf8f1ea3ca1119b53d47e3c8a30a2ca8a8d14564de242ed104884b3","public/reader/chok/qualified/p01-vayaitzai-monday-mishna-bartenura.json":"debe5b073c8b73ccd9d9b9c03c9df5801c26f6fba97ffd19367755773aab7ac9","public/reader/chok/qualified/p02-vayaitzai-tuesday-mishna-bartenura.json":"b456f1532c2d8626634ef28fe7a64e019a849b9cbd2cb9a19be392896044f590","public/reader/chok/qualified/p03-vayaitzai-wednesday-mishna-bartenura.json":"fd22222518bbd2ff04e3072b3c2961aa1f1c90f74ccae69110df660896cc2abb","public/reader/chok/qualified/p05-vayaitzai-friday-mishna-bartenura.json":"0201bddcdbf737eb57bc12e7e4a354a4fb5a395fb490d380a6a6f1d477eab272","public/reader/chok/qualified/p06-vayishlach-sunday-mishna-bartenura.json":"81090b27e60ea1d5ca1644d66647b551cd02576afed3f179407b8fc8fdc6771f","public/reader/chok/qualified/p07-vayishlach-monday-mishna-bartenura.json":"bc62bba47556b958f4e9db5aa8540b72d85d0fdf744b2337fcee19b44bb66769","public/reader/chok/qualified/p08-vayishlach-tuesday-mishna-bartenura.json":"554c2fabe009bc843a7a78ef9a3f4edf6bf2167b3d0727da19943820bbca1802","public/reader/chok/qualified/p11-vayaitzai-thursday-mishna-bartenura.json":"f6d47d7e3f06139d3d219f46149f8d1689452693fbdaa10cb31545b0714e1ce6","public/reader/chok/qualified/vayaitzai-sunday-complete-basics-v1.json":"afff35ef0fde31d75c6146f083ad2592d61f2ef0c384246d4e11e1398ffd16de","scripts/chok-genesis-english.test.cjs":"c651d912f729b9c39846f0581a33b8a500848b859694d9ab6e149dccf7d8058d","scripts/chok-qualified-daily-reviewed.json":"c7f8aec7b88b942eddbe877667353a0fd5b8be5c4f5607ee2c4d690fd5ae1b0b","scripts/verify-chok-classical-public-source-admission.cjs":"165fb7a6e813cdcf2cf3b092e2d00a63c4a7ac39bd816cf33b4142108530a4a8","scripts/verify-chok-firstweek-zhm-private.cjs":"380dcb15ce4f0ab824feda112b257cf4f5b069192797d892460ce0551ce0cb41","scripts/verify-chok-next-four.cjs":"0d6e0be7a51cd19d03f165940c31c81f53d8b862a1ff524e0abe546b08ca815b","scripts/verify-chok-next-readings-source-admission.cjs":"6d68da35fee474a0549d1d54585e9d54513a09be1f44b17c4e2f0d521a2cbdfb","scripts/verify-chok-qualified-daily.cjs":"5ae0c092caae54629d7e8f179c0c6383f43e2c879e5cf16182e8bdc864ef9cef","scripts/verify-chok-vayaitzai-thursday.cjs":"d5f8e02adbe58ba9018cd10beb128b43d512d9fdedb7b11ffcc95b9eaaa695ba","src/pages/reader/chok.astro":"cb67f84dff0b07589865cf177c28b72551761f1a43976aef885f9c8076d74cff"};
 if(!allowed[relative]||sha(bytes)!==allowed[relative])return bytes;
 const d=vayaitzaiFridayNoteAuthority().paths[relative];assert(d);
 assert.equal(bytes.length,d.afterBytes,'VAYA_FRI_NOTE_AFTER_BYTES');let s=bytes.toString('utf8');
 for(const op of d.inverse){assert.equal(s.split(op.after).length,op.occurrences+1,'VAYA_FRI_NOTE_INVERSE_MEMBERSHIP:'+relative);s=s.split(op.after).join(op.before);}
 const before=Buffer.from(s);assert.equal(before.length,d.beforeBytes);assert.equal(sha(before),d.beforeSHA256,'VAYA_FRI_NOTE_WHOLE_INVERSE:'+relative);return before;
}
function restoreToday(relative,bytes){
 bytes=restoreVayaitzaiFridayNote(relative,bytes);
 const allowed={"public/chok.js":"04eaaeea7ce2bc6cf153837d235ba76868b4bbdb7c6fa2f18bf3639b0f67eeea","public/chok-qualified-zohar.js":"daee7cbb92bef8513ea31a336707dcd7667deae49392a2c12a159bb1a687bcdf","src/pages/reader/chok.astro":"3617da3a1dfe1ee5d056b9204e8c46a9f5b5bf38bca9899dc99195339299797c"};
 if(!allowed[relative]||sha(bytes)!==allowed[relative])return bytes;
 const fs=require('node:fs'),path=require('node:path'),raw=fs.readFileSync(path.resolve(__dirname,'chok-today-toldos-monday-admission.json'));
 assert.equal(sha(raw),'130f742f6158b11b0aa04ec09e7a6127c5b3afd0889343f7594c2c84253b09be','TOLDOS_MONDAY_ADMISSION_PIN');
 const d=JSON.parse(raw).paths[relative];assert(d);assert.equal(sha(bytes),d.afterSHA256,'TOLDOS_MONDAY_AFTER_PIN');
 let s=bytes.toString('utf8');for(const op of d.inverse){assert.equal(s.split(op.after).length,2,'TOLDOS_MONDAY_INVERSE_MEMBERSHIP:'+relative);s=s.replace(op.after,op.before);}
 const before=Buffer.from(s);assert.equal(sha(before),d.beforeSHA256,'TOLDOS_MONDAY_WHOLE_INVERSE:'+relative);return before;
}
// Exact TOMORROW-only outer inverse; restoreToday keeps its original 18-source boundary.
function restoreCurrent38(relative,bytes){return require('./chok-all-cleared-zohar-admission.cjs').restoreCurrent38(relative,restoreVayaitzaiFridayNote(relative,bytes));}
function restoreCurrent37(relative,bytes){return require('./chok-all-cleared-zohar-admission.cjs').restoreCurrent37(relative,restoreVayaitzaiFridayNote(relative,bytes));}
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
 bytes=restoreReaderCommentary(relative,bytes);
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
var adoptedNoteAuthorityCache;
function freezeAdoptedNoteAuthority(x){if(x&&typeof x==='object'){Object.values(x).forEach(freezeAdoptedNoteAuthority);Object.freeze(x);}return x;}
function vayaitzaiFridayNoteAuthority(){if(!adoptedNoteAuthorityCache){const raw=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'chok-vayaitzai-friday-mishna-note-admission.json'));assert.equal(sha(raw),'705a27f9fcff045acc3582db44034b776f7cb24611d5e6ba3a1fe43ef0860acd','VAYA_FRI_NOTE_ADOPTION_PIN');adoptedNoteAuthorityCache=freezeAdoptedNoteAuthority(JSON.parse(raw));}return adoptedNoteAuthorityCache;}
module.exports={restoreToldosWednesdayHalacha,restoreToldosWednesdayFinalQA,restoreToldosWednesdayMussar,vayaitzaiFridayNoteAuthority,restoreVayaitzaiFridayNote,restoreCurrent38,restoreCurrent37,restoreCleared,DELTA,restoreReference,restoreGenesis,restoreToday,restoreTomorrow};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 for(const[filename,pin,restore]of[
  ['chok-toldos-wednesday-halacha-admission.json','8691851fb48045fee5b79def3713e0d03d921d1f7f9848824c8380fabea2e793',restoreToldosWednesdayHalacha],
  ['chok-toldos-wednesday-final-qa-admission.json','760e9f8d67e27027cb665f4da5d6c369dadf9ee0941c8abf8da2c421234e1f17',restoreToldosWednesdayFinalQA]]){
  const raw=fs.readFileSync(path.resolve(__dirname,filename));assert.equal(sha(raw),pin);const authority=JSON.parse(raw);
  for(const[relative,d]of Object.entries(authority.paths)){
   const b=fs.readFileSync(path.resolve(__dirname,'..',relative));assert.equal(sha(b),d.afterSHA256,'OUTER_REQUIRED_SUCCESSOR:'+relative);assert.equal(b.length,d.afterBytes);
   const old=restore(relative,b);if(d.beforeSHA256===null)assert.equal(old,null,'HALACHA_ABSENT_PACKET_PREIMAGE');else{
    assert.equal(sha(old),d.beforeSHA256);assert.equal(old.length,d.beforeBytes);let f=old.toString('utf8');for(const op of d.inverse.slice().reverse()){assert.equal(f.split(op.before).length,op.occurrences+1);f=f.split(op.before).join(op.after);}assert.deepEqual(Buffer.from(f),b);assert.deepEqual(restore(relative,old),old);
   }
   const bad=Buffer.from(b);bad[Math.floor(bad.length/2)]^=1;for(const x of[bad,Buffer.concat([b,Buffer.from(' ')])])assert.equal(restore(relative,x),x,'OUTER_CORRUPTION_NOT_ADMITTED');
   assert.equal(restore('unselected/source',b),b);assert.deepEqual(restore(relative,b),old,'OUTER_RESTORED_POSITIVE');
  }
 }
 const mussarRaw=fs.readFileSync(path.resolve(__dirname,'chok-toldos-wednesday-mussar-admission.json'));assert.equal(sha(mussarRaw),'61a78bc6ac05a4a3e0825e543bd517d0d115159fe9704bb5a99cc0e4b556b102');
 for(const[relative,d]of Object.entries(JSON.parse(mussarRaw).paths)){
  const b=restoreToldosWednesdayFinalQA(relative,restoreToldosWednesdayHalacha(relative,fs.readFileSync(path.resolve(__dirname,'..',relative))));assert.equal(sha(b),d.afterSHA256,'MUSSAR_REQUIRED_SUCCESSOR:'+relative);assert.equal(b.length,d.afterBytes);
  const old=restoreToldosWednesdayMussar(relative,b);
  if(d.beforeSHA256===null)assert.equal(old,null,'MUSSAR_ABSENT_PREIMAGE');else{assert.equal(sha(old),d.beforeSHA256);let f=old.toString('utf8');for(const op of d.inverse.slice().reverse()){assert.equal(f.split(op.before).length,op.occurrences+1);f=f.split(op.before).join(op.after);}assert.deepEqual(Buffer.from(f),b);}
  const bad=Buffer.from(b);bad[Math.floor(bad.length/2)]^=1;for(const x of[bad,Buffer.concat([b,Buffer.from(' ')])])assert.equal(restoreToldosWednesdayMussar(relative,x),x,'MUSSAR_CORRUPTION_NOT_ADMITTED');
  assert.equal(restoreToldosWednesdayMussar('unselected/source',b),b);
 }
 const noteRaw=fs.readFileSync(path.resolve(__dirname,'chok-vayaitzai-friday-mishna-note-admission.json'));assert.equal(sha(noteRaw),'705a27f9fcff045acc3582db44034b776f7cb24611d5e6ba3a1fe43ef0860acd');
 for(const[relative,d]of Object.entries(JSON.parse(noteRaw).paths)){
  const b=restoreToldosWednesdayMussar(relative,fs.readFileSync(path.resolve(__dirname,'..',relative)));assert.equal(sha(b),d.afterSHA256,'FRIDAY_REQUIRED_SUCCESSOR:'+relative);assert.equal(b.length,d.afterBytes);
  const old=restoreVayaitzaiFridayNote(relative,b);assert.equal(sha(old),d.beforeSHA256);let f=old.toString('utf8');for(const op of d.inverse.slice().reverse()){assert.equal(f.split(op.before).length,op.occurrences+1);f=f.split(op.before).join(op.after);}assert.deepEqual(Buffer.from(f),b);
  const bad=Buffer.from(b);bad[Math.floor(bad.length/2)]^=1;for(const x of[bad,Buffer.concat([b,Buffer.from(' ')])])assert.equal(restoreVayaitzaiFridayNote(relative,x),x);
  assert.equal(restoreVayaitzaiFridayNote('unselected/source',b),b);assert.deepEqual(restoreVayaitzaiFridayNote(relative,old),old);
 }
 for(const [relative,d]of Object.entries(DELTA)){
  const actual=fs.readFileSync(path.resolve(__dirname,'..',relative));
  const b=currentReference(relative,actual);assert.equal(sha(b),d.afterSHA256,'REQUIRED_CURRENT_REFERENCE_SUCCESSOR:'+relative);
  const restored=restoreReference(relative,b);assert.equal(sha(restored),d.beforeSHA256);assert.deepEqual(restoreReference(relative,restored),restored);
  assert.throws(()=>restoreReference(relative,Buffer.concat([b,Buffer.from(' ')])),/REFERENCE_CANDIDATE_PIN/);
  const bad=Buffer.from(b);bad[Math.floor(bad.length/2)]^=1;assert.throws(()=>restoreReference(relative,bad),/REFERENCE_CANDIDATE_PIN/);
  const adopted=READER_ADOPTION.paths[relative];
  if(adopted){
   assert.equal(sha(actual),adopted.afterSHA256,'REQUIRED_CURRENT_COMMENTARY_SUCCESSOR:'+relative);
   assert.equal(sha(restoreReaderCommentary(relative,actual)),adopted.beforeSHA256);
   assert.throws(()=>restoreReference(relative,Buffer.concat([actual,Buffer.from(' ')])),/REFERENCE_CANDIDATE_PIN/);
   const corrupt=Buffer.from(actual);corrupt[Math.floor(corrupt.length/2)]^=1;
   assert.throws(()=>restoreReference(relative,corrupt),/REFERENCE_CANDIDATE_PIN/);
   const guard=adopted.inverse[0];assert.equal(actual.toString('utf8').split(guard.after).length,2);
   const missingGuard=Buffer.from(actual.toString('utf8').replace(guard.after,guard.before));
   assert.throws(()=>restoreReference(relative,missingGuard),/REFERENCE_CANDIDATE_PIN/);
  }
 }
 console.log('Exact Reader commentary adoption PASS: 24 whole-template inverses; current candidates required; append/mid-body/missing-guard corruption rejected');
 console.log('Exact reference/paragraph successor inverse PASS:',Object.keys(DELTA).length,'complete paths; append/mid-body corruption rejected; historical manifests unchanged');
}
