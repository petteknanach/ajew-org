'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(path.join(__dirname,'genesis-30-20-segoal-admission.json'));
assert.equal(sha(raw),'6092d62c0d7d17bc09d6cf92156e842fb0f64330613c22c36ab9e4d0f98da6fe');
const paths=JSON.parse(raw).paths;
function restore(relative,bytes){
  bytes=require('./chok-two-week-mishna-inverse.cjs').restore(relative,bytes);
  bytes=require('./genesis-32-18-shoorook-inverse.cjs').restore(relative,bytes);
  bytes=require('./chok-vayetzei-friday-talmud-inverse.cjs').restore(relative,bytes);
  bytes=require('./genesis-30-37-patach-inverse.cjs').restore(relative,bytes);
  const row=paths[relative];
  if(!row||bytes===null||sha(bytes)!==row.after)return bytes;
  let text=bytes.toString('utf8');
  for(const {after,before} of row.inverse){assert.equal(text.split(after).length,2);text=text.replace(after,before);}
  const restored=Buffer.from(text);assert.equal(sha(restored),row.before);return restored;
}
module.exports={restore};
