/* Four exact public-source successor bindings. Historical 32-entry admissions remain operative. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha=x=>createHash('sha256').update(x).digest('hex');
function canonical(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
function check(root,oracle){
 const read=p=>fs.readFileSync(path.join(root,p));const raw=read('scripts/chok-classical-public-source-admission.json');
 assert.equal(sha(raw),'63cbb9874c588f9a3dc4143ebbcccd295675b203b4d39ea35142ba4cf4dd1c49','CLASSICAL_PUBLIC_ADMISSION_PIN');const a=JSON.parse(raw);
 assert.equal(sha(read('scripts/chok-qualified-daily-reviewed.json')),a.oldOracleSHA256,'CLASSICAL_BEFORE_ORACLE');
 assert.equal(sha(read('public/chok-qualified-daily-selected.js')),a.oldSelectedSHA256,'FOREIGN_OLD_SELECTED_CONSERVATION');
 assert.equal(sha(require('./chok-attribution-conservation.cjs').historicalSource(root,'src/pages/reader/chok.astro')),a.afterTemplateSHA256,'CLASSICAL_AFTER_TEMPLATE');
 assert.notEqual(a.beforeTemplateSHA256,a.afterTemplateSHA256);
 assert.equal(sha(read(a.newSelectedPath)),a.newSelectedSHA256,'CLASSICAL_AFTER_SELECTED');
 assert.equal(a.rows.length,4);assert.equal(new Set(a.rows.map(x=>x.owner)).size,4);assert.equal(a.entries.length,2);
 for(const r of a.rows){assert(!oracle.units.some(x=>x.owner===r.owner),'DUPLICATE_SELECTED_OWNER');assert.equal(r.nativeAdmission.unit.sourceUse.evidenceSHA256,a.publicDecisionSHA256);assert.equal(r.nativeAdmission.section.sourceUse.evidenceSHA256,a.publicDecisionSHA256);}
 for(const e of a.entries)assert.equal(sha(read('public'+e.url)),e.payloadSHA256,'CLASSICAL_AFTER_PAYLOAD');
 oracle.units.push(...a.rows);oracle.classicalSelected=a.classicalSelected;return a;
}
module.exports={check};
