'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function restore(relative,bytes){
 if(bytes===null)return bytes;
 const raw=fs.readFileSync(path.join(__dirname,'chok-optional-commentary-admission.json'));
 assert.equal(sha(raw),'a11a6a58827f768685427a3edcc2187c7653ca11847ff7df1c3b9e618aa2e40b','CHOK_OPTIONAL_ADMISSION_PIN');
 const row=JSON.parse(raw).paths[relative];
 if(!row||sha(bytes)!==row.afterSHA256)return bytes;
 assert.equal(bytes.length,row.afterBytes);
 let s=bytes.toString('utf8');
 for(const op of row.inverse){assert.equal(s.split(op.after).length,2,'CHOK_OPTIONAL_EXACT_DELTA:'+relative);s=s.replace(op.after,op.before);}
 const before=Buffer.from(s);assert.equal(before.length,row.beforeBytes);assert.equal(sha(before),row.beforeSHA256,'CHOK_OPTIONAL_WHOLE_INVERSE:'+relative);return before;
}
module.exports={restore};
