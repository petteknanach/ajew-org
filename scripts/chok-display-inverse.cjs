'use strict';
// Admit only the complete reviewed Chok display delta before historical guards.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function restore(relative,bytes){
 if(bytes===null)return bytes;
 const raw=fs.readFileSync(path.join(__dirname,'chok-display-admission.json'));
 assert.equal(sha(raw),'2fe5766493bae7c91b7d2057947f2fbbf88d10aa15cbe364ebbda5f4240f5bf1','CHOK_DISPLAY_ADMISSION_PIN');
 const row=JSON.parse(raw).paths[relative];
 if(!row||sha(bytes)!==row.afterSHA256)return bytes;
 assert.equal(bytes.length,row.afterBytes);let s=bytes.toString('utf8');
 for(const op of row.inverse){assert.equal(s.split(op.after).length,2,'CHOK_DISPLAY_EXACT_DELTA:'+relative);s=s.replace(op.after,op.before);}
 const before=Buffer.from(s);assert.equal(before.length,row.beforeBytes);assert.equal(sha(before),row.beforeSHA256,'CHOK_DISPLAY_WHOLE_INVERSE:'+relative);return before;
}
module.exports={restore};
