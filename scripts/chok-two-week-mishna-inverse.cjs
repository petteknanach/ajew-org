'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const raw=fs.readFileSync(path.join(__dirname,'chok-two-week-mishna-delta.json'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(raw),'eb2e0226c69444d3c8d6f0f4cc5762348c7860c9bc23ea28e556d514aed7ed5b');
const proof=JSON.parse(raw);
function restore(relative,body){
 const row=proof.paths[relative]; if(!row||body===null||sha(body)!==row.after)return body;
 let text=body.toString('utf8');for(const [a,b] of row.inverse){assert.equal(text.split(a).length,2);text=text.replace(a,b);}
 const before=Buffer.from(text);assert.equal(sha(before),row.before);return before;
}
module.exports={restore,proof};
