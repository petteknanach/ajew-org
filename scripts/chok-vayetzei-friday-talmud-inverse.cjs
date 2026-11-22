'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(path.join(__dirname,'chok-vayetzei-friday-talmud-delta.json'));
assert.equal(sha(raw),'ea74c1abe6678cf13866441841cc402c5d73e3a76318f497970acd7bf33284f8');
const delta=JSON.parse(raw);
function restore(relative,bytes){
 bytes=require('./chok-biraishis-talmud-inverse.cjs').restore(relative,bytes);
 const row=Object.hasOwn(delta,relative)&&delta[relative];
 if(!row||!Buffer.isBuffer(bytes)||sha(bytes)!==row.after)return bytes;
 let text=bytes.toString('utf8');
 for(const [after,before] of row.ops){assert.equal(text.split(after).length,2);text=text.replace(after,before);}
 const original=Buffer.from(text);assert.equal(sha(original),row.before);return original;
}
module.exports={restore};
