'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const allowed={"public/chok.js":"e121d4517a1979695f61c7e23f10f35c2c1d21b3b6d32867c906b1ac169186ab","scripts/chok-all-biraishis-final-inverse.cjs":"0631bcaf4099dfdb9cdd9515eae77274bf181085513e9e9b6392963169bfcd2c","scripts/chok-genesis-english.test.cjs":"87669100c5f2756862de444e9b882cefb4d0c9db553df239fd15e2ae33c8f103","scripts/chok-lech-monday-init.test.cjs":"99430dfe2c329786af19f34ec571eadfa71c1a8a878a1f0e021746d78695dc61","scripts/chok-lech-sunday.test.cjs":"7b577450a77f601033e1125506ed20bc5b27a6a2a8d79d33d7f82efffe991e25","scripts/verify-chok-today-classical.cjs":"f49ef8d61138c90de9484aef485d225d62bd2b933d14c9104ac24001a6cfc0f9","src/pages/reader/chok.astro":"a1dfee06a4ebabd58052cac2d8e966fbd1076e55e919fb5a00405505f841e3c8"};
function restore(relative,bytes){
 if(!Object.prototype.hasOwnProperty.call(allowed,relative)||bytes===null||sha(bytes)!==allowed[relative])return bytes;
 const raw=fs.readFileSync(path.join(__dirname,'chok-sa-optional-admission.json'));assert.equal(sha(raw),'540c176e5f64c0acabdb5026d2ddb680344a415d4e2e3c930711f90325b5b69a','SA_OPTIONAL_BANK_PIN');
 const row=JSON.parse(raw).paths[relative];assert.equal(bytes.length,row.after.bytes);
 const before=Buffer.from(row.beforeUTF8,'utf8');assert.equal(before.length,row.before.bytes);assert.equal(sha(before),row.before.sha256,'SA_OPTIONAL_WHOLE_PREIMAGE');return before;
}
module.exports={restore};
