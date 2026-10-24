// Source/static verifier. No child processes or native/build claims.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import * as core from '../public/qualified-sichos-281290-core.mjs';
import {loadEdition,plainExport} from '../src/lib/qualified-sichos-281290.mjs';
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function verify(root=process.cwd()){
 const d=await loadEdition(root),assets=Object.fromEntries(d.assets.map(a=>[a.name,JSON.parse(fs.readFileSync(path.join(root,'public',a.url)))])),s=assets['selected-39.json'];
 assert.equal(d.units.length,39);assert.equal(d.groups.length,10);assert.equal(d.assets.length,11);assert.equal(s.rows.length,39);
 assert.equal(d.units.reduce((n,u)=>n+u.qualifications.length,0),52);assert.equal(d.globalQualifications.length,4);
 assert.equal(new Set(d.units.flatMap(u=>u.qualifications.map(q=>q.id))).size,52);
 for(const [i,u] of d.units.entries()){
  const r=s.rows[i],a=assets['sicha-'+u.section+'-original.json'].segments[u.array_position];
  assert.equal(u.owner,r.owner);assert.equal(u.history.earlier_supplied_English,a.en);
  for(const f of ['he','he_nikud','en']){assert.equal(u[f],r.fields[f]);assert.equal(sha(Buffer.from(u[f])),u.field_sha256[f]);}
  assert.equal(u.he,a.he);assert.equal(u.he_nikud,a.he_nikud);assert.deepEqual(u.qualifications,r.required_qualifications);
  assert.equal(u.currentOrigin.noticeID,u.qualifications.find(q=>q.role==='current-origin').id);
 }
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
 assert.equal(pkg.scripts['verify:sichos-281290'],'node --max-old-space-size=512 scripts/verify-sichos-281290.mjs');
 assert(pkg.scripts.verify.includes('npm run verify:sichos-281290 && npm run verify:sichos-271280 && npm run verify:sichos-261270'));
 assert(pkg.scripts.verify.endsWith(' && npm run verify:sichos-231240 && npm run verify:sichos-221230'));
 const page=fs.readFileSync(path.join(root,'src/pages/reader/reviewed/sichos-281-290.astro'),'utf8');assert(page.includes('noindex={true}'));assert(page.includes('paragraph {u.array_position+1}'));assert(!page.includes('/reader-script.js'));assert(!page.includes('/reader-v2.js'));
 for(const p of ['src/pages/reader/reviewed/index.astro','src/pages/reader/sichos-haran/[part]/index.astro','src/pages/reader/sichos-haran/[part]/[torah].astro']){const t=fs.readFileSync(path.join(root,p),'utf8');assert.equal(t.split('data-sichos-281290-entry').length,2);assert(t.includes('/reader/reviewed/sichos-271-280/'));}
 for(const f of ['txt','md','json','html'])assert(plainExport(d,f).length>0);
 return {status:'PASS',owners:39,English:39,Hebrew:78,history:39,localNotes:52,globalNotes:4,assets:11,scope:'source/static/local exports only; no Astro/native/live/publication'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await verify()));
