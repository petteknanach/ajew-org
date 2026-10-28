/* Exact selected bilingual additions; legacy source rows remain authoritative. */
(function(root){'use strict';
 const PIN='3d016d816b8fae9a9ba94ab3abccc7fc484a456e5f819454853e638d47c62593',ADOPTION='26b4d17f8d729658f7129ad9be32df3cbe00ebac7bd602f790a25cc6683d9a7e',URL='/reader/chok/other-layers/vayeira-wednesday-thursday.json',MANIFEST='/reader/chok/other-layers/vayeira-adoption.json';let pending=null;
 const fail=(ok,s)=>{if(!ok)throw Error('Other layers: '+s);};
 const hash=s=>root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''));
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function creditText(value) {
    var out = '', end = 0;
    String(value).replace(/https:\/\/[^\s<>"']+/g, function (url, offset) {
      out += esc(value.slice(end, offset)) + '<a href="' + esc(url) + '">' + esc(url) + '</a>';
      end = offset + url.length;
      return url;
    });
    return out + esc(value.slice(end));
 }
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 function supports(w,d){return w==='וירא'&&['יום רביעי','יום חמישי'].includes(d);}
 function load(loader){if(!pending)pending=Promise.all([loader(URL+'?v='+PIN),loader(MANIFEST+'?v='+ADOPTION)]).then(async raw=>{
  fail(raw.every(r=>typeof r==='string')&&await hash(raw[0])===PIN&&await hash(raw[1])===ADOPTION,'payload/adoption hash');const p=JSON.parse(raw[0]),a=JSON.parse(raw[1]);
  fail(p.schema==='chok-other-layers/v1'&&a.schema==='chok-other-layers-adoption/v1'&&a.payloadSHA256===PIN&&a.selected.length===128&&p.rows.length===128,'typed adoption/scope');let ids=new Set();
  for(const r of p.rows){const s=a.selected.find(x=>x.owner===r.id);fail(s&&!ids.has(r.id)&&!p.heldOwnerIndices.includes(r.index),'selected owner');ids.add(r.id);fail(['original','english','explanation','sourceUse','selection'].every(k=>s.admission[k].decision==='accepted'&&/^[a-f0-9]{64}$/.test(s.admission[k].evidenceSHA256)),'admission');fail(await hash(r.he)===s.originalSHA256&&s.originalSHA256===r.originalSHA256&&await hash(r.en)===s.englishSHA256&&s.englishSHA256===r.englishSHA256,'body binding');fail(r.notes.every(n=>typeof n.he==='string'&&typeof n.en==='string')&&r.credits.length,'qualifications/credits');for(const n of r.translatorNotes)fail(await hash(n.en)===n.sha256,'modern annotation');}
  fail(p.absences.length===1&&a.absenceSelections.length===1,'absence scope');
  for(const r of p.absences){const s=a.absenceSelections.find(s=>s.owner===r.id);fail(s&&s.role===r.role&&r.role==='selected-witness-no-comment'&&r.index===129&&r.key==='וירא|יום חמישי'&&r.slug==='tanach-mishlei'&&r.ref==='4:10'&&r.he===''&&r.en===''&&r.explanation.he===''&&r.explanation.en==='','typed witness absence');fail(s.sourceWitnessSHA256===r.sourceWitnessSHA256&&await hash(JSON.stringify(r.legacyWholeRow))===r.legacyWholeRowSHA256,'absence source binding');fail(['original','english','explanation','sourceUse','selection'].every(k=>s.admission[k].decision==='accepted'&&s.admission[k].evidenceSHA256===r.admission[k].evidenceSHA256),'absence adoption');}
  return freeze(p);
 }).catch(e=>{pending=null;throw e;});return pending;}
 async function prepare(w,d,slug,targum,loader){if(!supports(w,d))return null;const p=await load(loader),key=w+'|'+d,rows=p.rows.filter(r=>r.key===key&&r.slug===slug),legacy={},anchors={};for(const r of rows){if(!anchors[r.group])anchors[r.group]=r.id;if(r.id.startsWith('targum|')){const [c,v]=r.ref.split(':'),he=targum&&targum.ch&&targum.ch[c]&&targum.ch[c][v];if(typeof he==='string'&&await hash(he)===(r.legacyOriginalSHA256||r.originalSHA256))legacy[r.id]=he;}}
  return freeze({key,slug,rows,groups:p.groups,legacy,anchors,absences:p.absences.filter(r=>r.key===key&&r.slug===slug)});}
 function hasAbsence(ctx,ref){return !!(ctx&&ctx.absences&&ctx.absences.some(r=>r.key===ctx.key&&r.slug===ctx.slug&&r.ref===ref));}
 async function rashiAbsence(ctx,ref,raw,he,en){
  if(!hasAbsence(ctx,ref)||typeof raw!=='string')return null;const r=ctx.absences.find(r=>r.ref===ref);
  if(await hash(raw)!==r.legacyCarrierSHA256||JSON.stringify(he)!==JSON.stringify(r.legacyWholeRow)||(en!=null&&(!Array.isArray(en)||en.length)))return null;
  const [c,v]=ref.split(':'),d=JSON.parse(raw);if(JSON.stringify(d.ch&&d.ch[c]&&d.ch[c][v])!==JSON.stringify(he))return null;
  return '<div class="ck-rashi-absence" data-rashi-absence="'+esc(r.id)+'">'+qualifications(r)+'</div>';
 }
 function owner(ctx,id,ref,author,slot,he){fail(ctx&&ctx.rows,'context');const r=ctx.rows.find(x=>x.id===id);fail(r&&r.key===ctx.key&&r.slug===ctx.slug&&r.ref===ref&&r.author===author&&r.slot===slot,'exact day/verse/author/slot owner');fail(he===r.he,'changed original');return r;}
 function exact(ctx,id,ref,author,slot,he){if(!ctx)return null;const r=ctx.rows.find(x=>x.id===id);return r&&r.key===ctx.key&&r.slug===ctx.slug&&r.ref===ref&&r.author===author&&r.slot===slot&&he===r.he?r:null;}
 function qualifications(r){return r.notes.map((n,i)=>'<aside class="ck-source-qualification ck-other-note" data-other-note-owner="'+esc(r.id)+'" data-note-id="other-'+r.index+'-'+i+'"><p lang="he" dir="rtl">'+esc(n.he)+'</p><p lang="en" dir="ltr">'+esc(n.en)+'</p></aside>').join('');}
 function credits(r){return '<details class="ck-layer ck-source-credits" data-other-credit-owner="'+esc(r.id)+'"><summary>מקורות ורישיונות · Sources and licenses</summary>'+r.credits.map(c=>'<p dir="ltr">'+creditText(c.title)+' — '+creditText(c.license)+'</p><p dir="ltr">'+creditText(c.sourceURI||'')+' '+creditText(c.licenseURI||'')+'</p><p dir="ltr">'+creditText(c.changes)+'</p>').join('')+'</details>';}
 function explanation(ctx,r,enabled){if(ctx.anchors[r.group]!==r.id)return '';const g=ctx.groups.find(g=>g.id===r.group);fail(g&&g.members.includes(r.index),'complete group binding');return '<details class="ck-layer ck-other-group" data-other-group="'+esc(g.id)+'"><summary>הסבר לקבוצת הפירוש · Commentary-group explanation</summary><p lang="he" dir="rtl">'+esc(g.he)+'</p>'+root.ChokSources.english(g.en,enabled)+'</details>';}
 function parts(ctx,r,enabled){const body='<article class="ck-complete-pair ck-other-pair" data-other-owner="'+esc(r.id)+'" data-original-sha256="'+r.originalSHA256+'" data-english-sha256="'+r.englishSHA256+'"><div class="ck-original" lang="he" dir="rtl" style="white-space:pre-wrap">'+esc(r.he)+'</div>'+root.ChokSources.english(r.en,enabled)+'</article>';const modern=r.translatorNotes.length?'<details class="ck-layer ck-translator-annotations" data-other-modern-owner="'+esc(r.id)+'"><summary>הערות המתרגם המודרני · Modern translator annotations</summary>'+r.translatorNotes.map(n=>'<p lang="en" dir="ltr">'+esc(n.en)+'</p>').join('')+'</details>':'';return {body:body+modern,tail:qualifications(r)+explanation(ctx,r,enabled)+credits(r)};}
 function targum(ctx,ref,he,enabled){if(!ctx)return null;const r=ctx.rows.find(r=>r.ref===ref&&r.id.startsWith('targum|'));if(!r||ctx.legacy[r.id]!==he)return null;const checked=exact(ctx,r.id,ref,r.author,r.slot,r.he);if(!checked)return null;const p=parts(ctx,checked,enabled);return '<div class="ck-targum-reading" data-selected-recension="'+r.selectedRecension+'"><h4>'+(r.selectedRecension==='EXPLICIT_NEW_PD_ONKELOS'?'אונקלוס — נוסח נבחר · Onkelos — selected recension':'תרגום · Targum')+'</h4>'+p.body+'</div>'+p.tail;}
 function superHTML(ctx,c,v,source,enabled,richText){if(!ctx)return null;if(!source)return '';const ref=c+':'+v,names=Object.keys(source).filter(n=>(source[n]||[]).length);let tails=[];
  const body=names.map(n=>'<div class="ck-sup-name">'+esc(n)+'</div>'+(source[n]||[]).map((he,slot)=>{const r=exact(ctx,'super|'+n+'|'+ref+'|'+slot,ref,n,slot,he);if(!r)return '<div class="ck-sup-body">'+richText(he)+'</div>';const p=parts(ctx,r,enabled);tails.push(p.tail);return p.body;}).join('')).join('');
  return body?'<details class="ck-comm ck-super"><summary>פירושי התורה · Torah commentaries — '+esc(names.join(' · '))+'</summary>'+body+'</details>'+tails.join(''):'';
 }
 function commentary(ctx,kind,ref,he,enabled){if(!ctx)return null;const prefix=kind==='torah'?'ramban|':'metzudas|',r=ctx.rows.find(r=>r.ref===ref&&r.id.startsWith(prefix));if(!r)return null;const checked=exact(ctx,r.id,ref,r.author,r.slot,he);if(!checked)return null;const p=parts(ctx,checked,enabled);return '<details class="ck-layer ck-comm"><summary>'+esc(r.author)+'</summary>'+p.body+'</details>'+p.tail;}
 root.ChokOtherLayers=Object.freeze({supports,prepare,hasAbsence,rashiAbsence,owner,targum,superHTML,commentary,load,creditText,pin:PIN,url:URL});
})(window);
