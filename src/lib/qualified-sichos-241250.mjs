import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {PIN,ASSET,SOURCE_PREFIX,authenticateEdition,fullBodyPayload,historyEntries} from '../../public/qualified-sichos-241250-core.mjs';
export {PIN};
// Independent parent anchor, never derived from the runtime's asset manifest.
export const EXPECTED_SELECTED_SHA256='4ad752d42de72d020bbfc5a0edc97997331431a312e132c85f044bb0787548cb';
export const EXPECTED_SELECTED_BYTES=241108;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function assertAudienceSafe(text){if(/\/mnt\/[a-z]\/|\/root\/|[A-Za-z]:\\|qualifiedEnglish|acceptance_counter|hidden_private|English_qualified_total_private_only|parent-owned-public|QUALIFIED47-INDEPENDENT-SOURCE-ORACLE/.test(text))throw Error('Private path/workflow leak');return text;}
export async function loadEdition(root=process.cwd()){
 const bank=await fs.readFile(path.join(root,'public',SOURCE_PREFIX,'selected-47.json'));
 if(bank.length!==EXPECTED_SELECTED_BYTES||sha(bank)!==EXPECTED_SELECTED_SHA256)throw Error('Independent selected-bank authentication failed');
 const raw=await fs.readFile(path.join(root,'public',ASSET));assertAudienceSafe(raw.toString('utf8'));
 return authenticateEdition(raw,a=>a.name==='selected-47.json'?bank:fs.readFile(path.join(root,'public',SOURCE_PREFIX,a.name)),sha);
}
export const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');
export function historyHTML(u){return '<details class="qualified-history" data-owner-history="'+u.owner+'"><summary>Earlier English and comparison history — consult the origin note</summary>'+historyEntries(u).map(e=>'<section><h4>'+escape(e.label)+'</h4>'+(e.href?'<a data-history-field="'+e.key+'" href="'+escape(e.href)+'">'+escape(e.text)+'</a>':'<p data-history-field="'+e.key+'">'+escape(e.text)+'</p>')+'</section>').join('')+'</details>';}
export function plainExport(d,format){
 const p=fullBodyPayload(d,d.units.map(u=>u.owner));let out;
 if(format==='json')out=JSON.stringify({title:d.title,notice:d.notice,scope:d.scope,...p},null,2)+'\n';
 else if(format==='txt')out=d.title+'\n\n'+p.content+'\n';
 else if(format==='md')out='# '+d.title+'\n\n'+p.content+'\n';
 else if(format==='html')out='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+escape(d.title)+'</title><style>body{max-width:72rem;margin:auto;padding:1rem;font:18px/1.65 system-ui;color:#111;background:#fff}p,a{white-space:pre-wrap;overflow-wrap:anywhere}article{border-top:1px solid #888;margin-top:2rem}.source-notes{border-top:1px solid #bbb}@media print{p,a{white-space:break-spaces;color:black;background:white}}</style></head><body><h1>'+escape(d.title)+'</h1><p>'+escape(d.notice)+'</p>'+d.units.map(u=>'<article id="'+u.anchor+'"><h2>Teaching '+u.section+', paragraph '+u.source_index+'</h2><h3>Supplied Hebrew</h3><p lang="he" dir="rtl" data-source-field="he">'+escape(u.he)+'</p><h3>Supplied pointed Hebrew</h3><p lang="he" dir="rtl" data-source-field="he_nikud">'+escape(u.he_nikud)+'</p><h3>English</h3><p data-source-field="en">'+escape(u.en)+'</p><section class="source-notes"><h3>Source notes</h3>'+u.qualifications.map(q=>'<p data-qualification="'+q.id+'" data-owner="'+u.owner+'">'+escape(q.text)+'</p>').join('')+'</section>'+historyHTML(u).replace('<details','<section').replace(/<summary>.*?<\/summary>/,'<h3>Historical comparison — not independent textual authority</h3>').replace('</details>','</section>')+'</article>').join('')+'<p>Source: <a href="https://ajew.org'+p.source+'/">'+escape(d.title)+'</a></p></body></html>';
 else throw Error('Unsupported qualified format');return assertAudienceSafe(out);
}
