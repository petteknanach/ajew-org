// Canonical scoped source/Q/history/export/discovery gate, not semantic or native proof.
import assert from 'node:assert/strict';
import * as runtimeCore from '../public/qualified-sichos-241250-core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PIN,ASSET,SOURCE_PREFIX,ORDER,validateProjection,authenticateEdition,fullBodyPayload,historyEntries} from '../public/qualified-sichos-241250-core.mjs';
import {loadEdition,plainExport,assertAudienceSafe} from '../src/lib/qualified-sichos-241250.mjs';
import {GET,getStaticPaths} from '../src/pages/reader-plain/reviewed/sichos-241-250/[format].js';
export const EXPECTED_BANK_SHA='4ad752d42de72d020bbfc5a0edc97997331431a312e132c85f044bb0787548cb';
export const EXPECTED_BANK_BYTES=241108;
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
// Built only from independently pinned bank fields; never call production payload/history builders.
export function expectedHistory(r){const h=r.history;return [['Historical role',h.role],['Earlier supplied English — comparison record',h.earlier_supplied_English],['Complete original teaching archive',h.original_source_url],['Original paragraph location',h.original_owner_pointer],...h.comparison_witnesses.flatMap(c=>[[c.format.toUpperCase()+' comparison — not adopted, not independent authority',c.role],['Section locator — not equivalence proof',String(c.section_locator_not_equivalence_proof)],[c.format.toUpperCase()+' whole comparison container',c.whole_comparison_container_text],[c.format.toUpperCase()+' full comparison witness text',c.full_witness_text_url]])];}
export function expectedText(bank,ids=bank.rows.map(r=>r.owner)){
 const rows=bank.rows.filter(r=>ids.includes(r.owner));assert.deepEqual(rows.map(r=>r.owner),ids);
 return bank.notice+'\n\n'+rows.map(r=>'Teaching '+r.section+', paragraph '+r.source_index+'\n\nSupplied Hebrew\n'+r.fields.he+'\n\nSupplied pointed Hebrew\n'+r.fields.he_nikud+'\n\nEnglish\n'+r.fields.en+'\n\n'+r.required_qualifications.map(q=>'Source note\n'+q.text).join('\n\n')+'\n\nHistorical comparison — not independent textual authority\n'+expectedHistory(r).map(([label,text])=>label+'\n'+text).join('\n\n')).join('\n\n')+'\n\nSource: https://ajew.org/reader/reviewed/sichos-241-250/';
}
export function verifyPair(d,bankBytes,assets){
 assert.equal(bankBytes.length,EXPECTED_BANK_BYTES,'Independent selected-bank size');assert.equal(sha(bankBytes),EXPECTED_BANK_SHA,'Independent selected-bank digest');
 const bank=JSON.parse(bankBytes);validateProjection(d,{...assets,'selected-47.json':bank});
 assert.equal(d.title,bank.title);assert.equal(d.notice,bank.notice);
 for(const [i,u] of d.units.entries()){const r=bank.rows[i];assert.equal(u.owner,r.owner);assert.deepEqual(Object.fromEntries(['he','he_nikud','en'].map(f=>[f,u[f]])),r.fields);assert.deepEqual(u.qualifications,r.required_qualifications);assert.deepEqual(u.history,r.history);for(const f of ['he','he_nikud','en'])assert.equal(sha(Buffer.from(u[f])),u.field_sha256[f]);assert.deepEqual(historyEntries(u).map(e=>[e.label,e.text]),expectedHistory(r));}
 assertAudienceSafe(JSON.stringify(d));return bank;
}
export async function verify(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')){
 for(const name of ['authenticateEdition','ranges','fullBodyPayload','appendLegacyCollection','stable','historyEntries'])assert.equal(typeof runtimeCore[name],'function','Client module ABI requires '+name);
 process.chdir(root);const d=await loadEdition(root),ids=d.units.map(u=>u.owner),raw=fs.readFileSync(path.join(root,'public',ASSET));
 const assets=Object.fromEntries(d.assets.map(a=>{const b=fs.readFileSync(path.join(root,'public',a.url));assert.equal(b.length,a.bytes);assert.equal(sha(b),a.sha256);return [a.name,a.name.endsWith('.json')?JSON.parse(b):b.toString('utf8')];}));
 const bankBytes=fs.readFileSync(path.join(root,'public',SOURCE_PREFIX,'selected-47.json')),bank=verifyPair(d,bankBytes,assets);
 assert.equal(raw.length,264008);assert.equal(sha(raw),'d0be35aee0498ad18e60b8e7a3463566c19197f6685b1992112467c22af4a09f');assert.equal(sha(raw),PIN);
 assert.equal(d.units.length,47);assert.equal(d.units.flatMap(u=>u.qualifications).length,133);assert.deepEqual(d.units.map(u=>[u.section,u.array_position,u.source_index]),ORDER);
 for(const u of d.units){const original=JSON.parse(fs.readFileSync(path.join(root,'public/reader/sichos-haran/sicha-'+u.section+'.json'))).segments[u.array_position];assert.equal(original.index,u.source_index);for(const f of ['he','he_nikud'])assert.equal(original[f],u[f]);assert.equal(fullBodyPayload(d,[u.owner]).content,expectedText(bank,[u.owner]));}
 const mutations=[x=>x.units.pop(),x=>x.units.reverse(),x=>x.units[0].owner=ids[1],x=>x.units[0].source_index=999,x=>x.units[0].en+='x',x=>x.units[0].he+='x',x=>x.units[0].he_nikud+='x',x=>x.units[0].qualifications.pop(),x=>x.units[0].qualifications.push(x.units[0].qualifications[0]),x=>x.units[0].qualifications.reverse(),x=>x.units[0].qualifications[0].owner=ids[1],x=>x.units[0].qualifications[0].text='All sources independently certified',x=>delete x.units[0].history,x=>x.units[0].history.earlier_supplied_English+='x',x=>x.units[0].history.comparison_witnesses.pop(),x=>x.units[0].history.comparison_witnesses[0].full_witness_text_url='/wrong',x=>x.units.push({...x.units[0],owner:'sichos-249-position-8'}),x=>x.units.push({...x.units[0],owner:'sichos-249-position-14'}),x=>x.units[0].en=x.units[0].history.earlier_supplied_English,x=>x.units[0].history.role='/root/private',x=>x.assets.pop()];
 for(const mutate of mutations){const x=structuredClone(d);mutate(x);assert.throws(()=>verifyPair(x,bankBytes,assets));verifyPair(d,bankBytes,assets);}
 // Real digest recalculation; both corrupted documents agree but independent bank anchor must reject.
 for(const kind of ['en','Q','history','origin']){const x=structuredClone(d),b=structuredClone(bank),u=x.units[0],r=b.rows[0];if(kind==='en'){u.en+='x';u.field_sha256.en=sha(Buffer.from(u.en));r.fields.en=u.en;}else if(kind==='history'){u.history.role+='x';r.history=structuredClone(u.history);}else{u.qualifications[0].text=kind==='origin'?'Retained verbatim':'All citations independently verified';r.required_qualifications=structuredClone(u.qualifications);}const changed=Buffer.from(JSON.stringify(b));x.assets[0].bytes=changed.length;x.assets[0].sha256=sha(changed);assert.throws(()=>verifyPair(x,changed,assets),/Independent selected-bank/);verifyPair(d,bankBytes,assets);}
 for(const bad of [[],[ids[0],ids[0]],['unknown'],[ids.at(-1),ids[0]],['sichos-249-position-8'],['sichos-249-position-14']])assert.throws(()=>fullBodyPayload(d,bad));assert.throws(()=>fullBodyPayload(structuredClone(d),[ids[0]]));
 await assert.rejects(authenticateEdition(Buffer.concat([raw,Buffer.from(' ')]),()=>{},sha));
 for(const a of d.assets){await assert.rejects(authenticateEdition(raw,x=>x.name===a.name?Buffer.from('{}'):fs.readFileSync(path.join(root,'public',x.url)),sha));assert.equal((await loadEdition(root)).units.length,47);}
 const whole=expectedText(bank);assert.equal(fullBodyPayload(d,ids).content,whole);
 assert.deepEqual(getStaticPaths().map(x=>x.params.format),['index.txt','index.md','index.json']);
 for(const f of ['txt','md','json']){const res=await GET({params:{format:'index.'+f}});assert.equal(res.status,200);assert.equal(res.headers.get('X-Robots-Tag'),'noindex, nofollow');const text=await res.text();assertAudienceSafe(text);if(f==='json'){const p=JSON.parse(text);assert.equal(p.content,whole);assert.deepEqual(p.sourceUnits,d.units);assert.deepEqual(p.requiredQualifications,bank.rows.flatMap(r=>r.required_qualifications));}else assert(text.includes(whole));}
 assert.equal((await GET({params:{format:'english-only.txt'}})).status,404);
 const html=plainExport(d,'html');for(const [token,n] of [['data-source-field=',141],['data-qualification=',133],['data-owner-history=',47],['data-history-field=',564]])assert.equal(html.split(token).length-1,n);assert(!html.includes('<details'));
 // Parent-owned integration is verified, never authored here. Old gates/entries remain.
 for(const rel of ['src/pages/reader/reviewed/index.astro','src/pages/reader/sichos-haran/[part]/index.astro','src/pages/reader/sichos-haran/[part]/[torah].astro']){const t=fs.readFileSync(path.join(root,rel),'utf8');for(const range of ['241-250','231-240','221-230'])assert(t.includes('/reader/reviewed/sichos-'+range+'/'));assert(t.includes('data-sichos-241250-entry'));}
 const teaching=fs.readFileSync(path.join(root,'src/pages/reader/sichos-haran/[part]/[torah].astro'),'utf8');assert(teaching.includes('torahNum >= 241 && torahNum <= 250'));assert(teaching.includes('/reader/reviewed/sichos-241-250/#group-sichos${torahNum}'));
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));assert.equal(pkg.scripts['verify:sichos-241250'],'node --max-old-space-size=128 scripts/verify-sichos-241250.mjs');for(const key of ['241250','231240','221230'])assert(pkg.scripts.verify.includes('npm run verify:sichos-'+key));
 return {status:'PASS',paragraphs:47,source_fields:141,qualifications:133,history_fields:564,assets:13,scope:'canonical source/Q/history/export/discovery only; no semantic or native proof'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await verify()));
