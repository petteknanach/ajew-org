'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha=x=>createHash('sha256').update(x).digest('hex');
function restore(relative,bytes){
 const raw=fs.readFileSync(path.join(__dirname,'chok-original52-private-inverse.json'));assert.equal(sha(raw),'9d756c611772e37399fec37d2f57da573b19863a6e80e9749f46b0b8d3418b53','ORIGINAL52_PLAN_PIN');
 const d=JSON.parse(raw).paths[relative];if(!d||bytes===null||sha(bytes)!==d.afterSHA256)return bytes;
 assert.equal(bytes.length,d.afterBytes,'ORIGINAL52_AFTER_BYTES');let s=bytes.toString('utf8');
 for(const op of d.inverse){assert.equal(s.split(op.after).length,2,'ORIGINAL52_EXACT_MEMBERSHIP:'+relative);s=s.replace(op.after,op.before);}
 const before=Buffer.from(s);assert.equal(before.length,d.beforeBytes);assert.equal(sha(before),d.beforeSHA256,'ORIGINAL52_WHOLE_INVERSE:'+relative);return before;
}
module.exports={restore};
