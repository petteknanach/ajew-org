'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function restore(relative,bytes){
 bytes=require('./chok-display-inverse.cjs').restore(relative,bytes);
 if(bytes===null)return bytes;
 const raw=fs.readFileSync(path.join(__dirname,'chok-commentary-fresh-admission.json'));
 assert.equal(sha(raw),'13c75b2eda9005448134f1a4b084c80d9121da9a9129c8dcda10d31b4c101358','CHOK_FRESH_ADMISSION_PIN');
 const row=JSON.parse(raw).paths[relative];
 if(!row||sha(bytes)!==row.afterSHA256)return bytes;
 assert.equal(bytes.length,row.afterBytes);
 let s=bytes.toString('utf8');
 for(const op of row.inverse){assert.equal(s.split(op.after).length,2,'CHOK_FRESH_EXACT_DELTA:'+relative);s=s.replace(op.after,op.before);}
 const before=Buffer.from(s);assert.equal(before.length,row.beforeBytes);assert.equal(sha(before),row.beforeSHA256,'CHOK_FRESH_WHOLE_INVERSE:'+relative);return before;
}
module.exports={restore};
