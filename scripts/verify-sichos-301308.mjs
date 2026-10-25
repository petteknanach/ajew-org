// Source/static verifier. No child processes or native/build claims.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import * as core from '../public/qualified-sichos-301308-core.mjs';
import {loadEdition,plainExport} from '../src/lib/qualified-sichos-301308.mjs';
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function verify(root=process.cwd()){
 const d=await loadEdition(root),assets=Object.fromEntries(d.assets.map(a=>[a.name,JSON.parse(fs.readFileSync(path.join(root,'public',a.url)))])),s=assets['selected-63.json'];
 assert.equal(d.units.length,63);assert.equal(d.groups.length,8);assert.equal(d.assets.length,9);assert.equal(s.rows.length,63);
 assert.equal(d.units.reduce((n,u)=>n+u.qualifications.length,0),91);assert.equal(d.globalQualifications.length,4);
 assert.equal(new Set(d.units.flatMap(u=>u.qualifications.map(q=>q.id))).size,91);
 for(const [i,u] of d.units.entries()){
  const r=s.rows[i],a=assets['sicha-'+u.section+'-original.json'].segments[u.array_position];
  assert.equal(u.owner,r.owner);assert.equal(u.history.earlier_supplied_English,a.en);
  for(const f of ['he','he_nikud','en']){assert.equal(u[f],r.fields[f]);assert.equal(sha(Buffer.from(u[f])),u.field_sha256[f]);}
  assert.equal(u.he,a.he);assert.equal(u.he_nikud,a.he_nikud);assert.deepEqual(u.qualifications,r.required_qualifications);
  assert.equal(u.currentOrigin.noticeID,u.qualifications.find(q=>q.role==='current-origin').id);
 }
 const page=fs.readFileSync(path.join(root,'src/pages/reader/reviewed/sichos-301-308.astro'),'utf8');assert(page.includes('noindex={true}'));assert(page.includes('paragraph {u.array_position+1}'));assert(!page.includes('/reader-script.js'));assert(!page.includes('/reader-v2.js'));
 assert(page.includes('data-sichos281290-yahrzeit-host'));
 assert(page.includes('body:has(.qualified-sichos-301308) { display:block!important; min-height:0!important; }'));
 assert(page.includes('body:has(.qualified-sichos-301308) #main-content { display:block!important; flex:none!important; min-height:0!important; padding-block:0!important; margin-block:0!important; }'));
 for(const name of ['reader','controls']){const file='qualified-sichos-301308-'+name+'.js';assert(page.includes('/'+file+'?v='+sha(fs.readFileSync(path.join(root,'public',file)))));}
 const reader=fs.readFileSync(path.join(root,'public/qualified-sichos-301308-reader.js'),'utf8');
 assert(reader.includes('/qualified-sichos-301308-core.js?v='+sha(fs.readFileSync(path.join(root,'public/qualified-sichos-301308-core.js')))));
 assert.equal(core.ORDER.length,63);assert.equal(Object.keys(core.ASSET_PINS).length,9);
 assert.deepEqual(core.ORDER,s.rows.map(r=>[r.section,r.position,r.source_index]));
 for(const u of d.units){for(const f of ['he','he_nikud','en']){const b=Buffer.from(u[f]);assert.equal(b.length,core.FIELD_PINS[u.owner][f].bytes);assert.equal(sha(b),core.FIELD_PINS[u.owner][f].sha256);}const b=Buffer.from(u.history.earlier_supplied_English);assert.equal(b.length,core.FIELD_PINS[u.owner].history.bytes);assert.equal(sha(b),core.FIELD_PINS[u.owner].history.sha256);}
 for(const f of ['txt','md','json','html'])assert(plainExport(d,f).length>0);
 return {status:'PASS',owners:63,English:63,Hebrew:126,history:63,localNotes:91,globalNotes:4,assets:9,scope:'source/static/local exports only; no Astro/native/live/publication'};
}
// Parent-owned canonical integration gate: retained assertions, deliberately not part of sparse private verification.
export function verifySharedIntegration(root=process.cwd()){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
 assert.equal(pkg.scripts['verify:sichos-301308'],'node --max-old-space-size=512 scripts/verify-sichos-301308.mjs --shared-integration');
 assert(pkg.scripts.verify.includes('npm run verify:sichos-301308 && npm run verify:sichos-291300 && npm run verify:sichos-281290 && npm run verify:sichos-271280 && npm run verify:sichos-261270'));
 assert(pkg.scripts.verify.endsWith(' && npm run verify:sichos-231240 && npm run verify:sichos-221230'));
 for(const p of ['src/pages/reader/reviewed/index.astro','src/pages/reader/sichos-haran/[part]/index.astro','src/pages/reader/sichos-haran/[part]/[torah].astro']){const t=fs.readFileSync(path.join(root,p),'utf8');assert.equal(t.split('data-sichos-301308-entry').length,2);assert(t.includes('/reader/reviewed/sichos-271-280/'));}
 return {status:'PASS',scope:'canonical package and entry links only'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify({...(await verify()),sharedIntegration:process.argv.includes('--shared-integration')?verifySharedIntegration():'NOT_RUN_PARENT_GATE'}));
