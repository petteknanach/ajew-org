// One route-local source engine. Other books and legacy annotation stores are untouched.
import {ASSET,PIN,BOOK,authenticateEdition,requireEdition,fullBodyPayload,appendLegacyCollection,stable,displayPlan,historyEntries,ranges,validateAnnotation} from './qualified-aitzoas362-core.js';
export const ANNOTATION_KEY='ajew-aitzoas362-source-annotations-v1';
export async function browserSHA(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function installAitzoas362(win=window){
 const doc=win.document,c=doc.querySelector('[data-aitzoas362]');
 if(!c||!/^\/reader\/aitzoas-yeshuroas\/1\/[1-6]\/?$/.test(win.location.pathname))return null;
 if(c.dataset.engineInstalled)return win.Aitzoas362Ready;c.dataset.engineInstalled='true';
 const all=(s,root=c)=>[...root.querySelectorAll(s)],say=text=>c.querySelector('[data-status]').textContent=text;
 let d,rows=[],ready=false,mode='both',generation=0,menu=null,manual=null,printState=null,sourceRoot=null,heading=null,observer=null,printEpoch=0,admission=null;
 const marks=new WeakSet(),captures=new WeakMap(),controls=new WeakSet(all('[data-action],[data-selection-action],[data-capture],[data-print]')),encode=x=>new TextEncoder().encode(x);
 const fail=msg=>{throw Error(msg);},must=(ok,msg)=>{if(!ok)fail(msg);};
 const atElement=n=>n?.nodeType===1?n:n?.parentElement;
 function invalidate(){generation++;admission=null;if(menu)menu.remove();menu=null;if(manual)manual.remove();manual=null;printFlag('printSafe','false');}
 function visible(el){
  if(!el?.isConnected||el.getRootNode()!==doc||!el.getClientRects().length)return false;const b=el.getBoundingClientRect();if(b.width<=0||b.height<=0)return false;
  for(let n=el;n;n=n.parentElement){const s=win.getComputedStyle(n);if(n.hidden||s.display==='none'||s.visibility!=='visible'||Number(s.opacity)!==1||s.contentVisibility==='hidden'||s.clipPath!=='none'||!['auto',''].includes(s.clip)||s.filter!=='none'||s.transform!=='none')return false;
   if(n.tagName==='DETAILS'&&!n.open&&!n.querySelector('summary')?.contains(el))return false;
   if(/hidden|clip/.test(s.overflowX+' '+s.overflowY)){const r=n.getBoundingClientRect();if(b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1)return false;}}
  return true;
 }

 function slots(el,tag,children){
  must(el?.tagName===tag,'Unexpected source template element');
  const actual=[...el.childNodes].filter(n=>n.nodeType!==8&&!(n.nodeType===3&&!/\S/u.test(n.textContent)));
  must(actual.length===children.length&&actual.every((n,i)=>n===children[i]),'Foreign source text/node or changed template slots');
 }
 function leaf(el,tag,text){must(el?.tagName===tag&&el.textContent===text&&[...el.childNodes].every(n=>n.nodeType===3||n.nodeType===8),'Foreign leaf markup/text');}
 function closedTree(){
  must(sourceRoot?.isConnected&&sourceRoot.parentElement===c&&doc.querySelectorAll('[data-source-root]').length===1&&doc.querySelector('[data-source-root]')===sourceRoot,'Source root identity drift');
  slots(sourceRoot,'SECTION',rows.map(r=>r.el));
  must(heading?.parentElement===c&&doc.querySelectorAll('[data-print-heading]').length===1&&c.querySelector('[data-print-heading]')===heading,'Print heading identity drift');
  leaf(heading,'H1',d.sections[Number(c.dataset.section)-1].title);
  // Direct text in the exposed route container is printable even without a marker.
  must([...c.childNodes].every(n=>n.nodeType===1||n.nodeType===8||(n.nodeType===3&&!/\S/u.test(n.textContent))),'Foreign route-level print text');
  for(const r of rows){
   const {u,el}=r,he=el.querySelector('[data-he-wrap]'),en=el.querySelector('[data-en-wrap]'),origin=el.querySelector('[data-origin-wrap]'),buttons=el.querySelector('.q-unit-controls');
   slots(el,'ARTICLE',[el.children[0],he,en,origin,r.noteRoot,buttons,r.history]);leaf(el.children[0],'H2','¶ '+u.stableIndex);
   for(const [wrap,label,body]of [[he,'Supplied Hebrew',r.fields[0]],[en,'English',u.en===null?el.querySelector('[data-unavailable]'):r.fields[1]],[origin,'English origin',r.origin]]){slots(wrap,'SECTION',[wrap.children[0],body]);leaf(wrap.children[0],'H3',label);}
   if(u.en===null)leaf(el.querySelector('[data-unavailable]'),'P',u.origin.notice+' No historical fallback is used.');
   for(const f of r.fields){must(f.tagName==='P','Source field element drift');for(const child of f.childNodes)if(child.nodeType===1)must(child.tagName==='MARK'&&marks.has(child)&&child.attributes.length===0&&[...child.childNodes].every(n=>n.nodeType===3),'Owned search mark attributes/markup changed');}
   slots(r.noteRoot,'SECTION',r.notes);r.notes.forEach((n,j)=>leaf(n,'P',expected(u).notes[j].text));leaf(r.origin,'P',u.origin.notice);
   must(buttons?.tagName==='DIV'&&buttons.getAttribute('class')==='q-unit-controls','Hidden controls slot changed');
   // Controls are never exposed in print, including their text and descendants.
   const hs=r.history.querySelector('summary'),groups=r.historyFields.map(f=>f.parentElement);slots(r.history,'DETAILS',[hs,...groups]);leaf(hs,'SUMMARY','Earlier English — historical comparison only');
   historyEntries(u).forEach((e,j)=>{const f=r.historyFields[j],group=groups[j],label=f.previousElementSibling;slots(group,'SECTION',[label,f]);leaf(label,'H4',e.label);leaf(f,e.href?'A':'P',e.text);});
  }
  return true;
 }
 function expected(r){return displayPlan(r,{english:mode!=='hebrew'});}
 function guard(){
  must(ready&&c.isConnected&&doc.querySelectorAll('[data-aitzoas362]').length===1&&doc.querySelector('[data-aitzoas362]')===c&&c.dataset.editionSha===PIN,'Source authentication unavailable');requireEdition(d);
  const installed=all('[data-unit]');must(installed.length===rows.length&&rows.length===d.rows.filter(r=>r.section===Number(c.dataset.section)).length,'Scope inventory drift');
  must(heading?.textContent===d.sections[Number(c.dataset.section)-1]?.title,'Section heading changed');
  must(c.dataset.section===win.location.pathname.match(/\/1\/([1-6])\/?$/)?.[1]&&c.dataset.mode===mode,'Route/mode drift');
  must(all('[data-source-field]').length===rows.reduce((n,r)=>n+r.fields.length,0)&&all('[data-note-id]').length===rows.reduce((n,r)=>n+expected(r.u).notes.length,0)&&all('[data-owner-history]').length===rows.length&&all('[data-origin]').length===rows.length,'Foreign or missing source elements');
  for(const [i,r]of rows.entries()){
   const {u,el}=r,plan=expected(u);must(installed[i]===el&&el.id==='seg-'+u.stableIndex&&el.dataset.unit===u.owner&&el.dataset.index===String(u.stableIndex)&&el.parentElement===c.querySelector('[data-source-root]'),'Paragraph identity/order changed');
   must(el.children.length===7&&el.children[0].tagName==='H2'&&el.children[0].textContent==='¶ '+u.stableIndex,'Unexpected paragraph content');
   for(const [selector,label]of [['[data-he-wrap]','Supplied Hebrew'],['[data-en-wrap]','English'],['[data-origin-wrap]','English origin']]){const wrap=el.querySelector(selector);must(wrap?.parentElement===el&&wrap.children.length===2&&wrap.children[0].tagName==='H3'&&wrap.children[0].textContent===label,'Source label/placement changed');}
   const fields=all('[data-source-field]',el),keys=u.en===null?['he']:['he','en'];must(fields.length===keys.length,'Field inventory changed');
   fields.forEach((f,j)=>{must(f===r.fields[j]&&f.dataset.sourceField===keys[j]&&f.textContent===(keys[j]==='he'?u.he:displayPlan(u).en)&&f.parentElement===el.querySelector(keys[j]==='he'?'[data-he-wrap]':'[data-en-wrap]'),'Source field changed');for(const child of f.childNodes)must(child.nodeType===3||(child.nodeType===1&&child.tagName==='MARK'&&marks.has(child)&&child.children.length===0),'Unbound field markup');});
   must(el.querySelector('[data-origin]')===r.origin&&r.origin.textContent===u.origin.notice&&r.origin.children.length===0&&r.origin.parentElement===el.querySelector('[data-origin-wrap]'),'Origin changed');
   const unavailable=all('[data-unavailable]',el);must(unavailable.length===(u.en===null?1:0)&&(!unavailable.length||unavailable[0].textContent===u.origin.notice+' No historical fallback is used.'),'Unavailable owner changed');
   const nr=el.querySelector('[data-notes-root]'),notes=all('[data-note-id]',el);must(nr===r.noteRoot&&notes.length===plan.notes.length&&nr.parentElement===el&&nr.children.length===notes.length,'Note root changed');
   notes.forEach((n,j)=>{const q=plan.notes[j];must(n===r.notes[j]&&n.parentElement===nr&&n.dataset.noteId===q.id&&n.dataset.owner===u.owner&&n.textContent===q.text&&n.children.length===0,'Required note changed');});
   must(el.querySelector('[data-owner-history]')===r.history&&r.history.parentElement===el&&r.history.dataset.ownerHistory===u.owner&&r.history.querySelector('summary')?.textContent==='Earlier English — historical comparison only','History owner changed');
   must(r.history.children.length===6,'Unexpected history content');
   const entries=historyEntries(u),hf=all('[data-history-field]',el);must(hf.length===entries.length,'History inventory changed');hf.forEach((h,j)=>{const e=entries[j];must(h===r.historyFields[j]&&h.dataset.historyField===e.key&&h.textContent===e.text&&h.children.length===0&&h.parentElement.parentElement===r.history&&h.parentElement.children.length===2&&h.previousElementSibling?.tagName==='H4'&&h.previousElementSibling?.textContent===e.label&&(e.href?h.tagName==='A'&&h.getAttribute('href')===e.href:h.tagName==='P'),'History source changed');});
  }
  closedTree();return true;
 }
 function outwardOwners(owners){
  guard();for(const owner of owners){const r=rows.find(r=>r.u.owner===owner);must(r,'Owner outside live route');
   const fields=r.fields.filter(f=>mode==='both'||f.dataset.sourceField===(mode==='hebrew'?'he':'en'));
   const unavailable=r.el.querySelector('[data-unavailable]');must(fields.length?fields.every(visible):mode==='english'&&unavailable&&visible(unavailable),'Live source is hidden/clipped/detached');
   must(visible(r.origin)&&r.notes.every(visible)&&visible(r.history.querySelector('summary')),'Live origin, notes or history disclosure hidden/clipped');
  }return owners;
 }
 function selection(){
  guard();const s=win.getSelection();must(s&&!s.isCollapsed&&s.rangeCount===1,'Select one visible source-field range');const range=s.getRangeAt(0);
  must(range.startContainer.isConnected&&range.endContainer.isConnected&&range.startContainer.getRootNode()===doc&&range.endContainer.getRootNode()===doc,'Detached selection');
  const r=rows.find(r=>r.fields.some(f=>f.contains(range.startContainer)&&f.contains(range.endContainer))),f=r?.fields.find(f=>f.contains(range.startContainer)&&f.contains(range.endContainer));
  must(f&&visible(f)&&visible(atElement(range.startContainer))&&visible(atElement(range.endContainer))&&range.toString().length>0,'Selection must remain inside one visible source field, not notes/history/UI');
  outwardOwners([r.u.owner]);return {owners:[r.u.owner],range:range.cloneRange(),start:range.startContainer,end:range.endContainer,a:range.startOffset,b:range.endOffset,text:range.toString(),generation,field:f,row:r};
 }
 function checkCapture(el){flushMutations();guard();const x=captures.get(el);must(menu===el&&el.isConnected&&x&&x.generation===generation&&x.start.isConnected&&x.end.isConnected&&x.range.startContainer===x.start&&x.range.endContainer===x.end&&x.range.startOffset===x.a&&x.range.endOffset===x.b&&x.range.toString()===x.text&&x.field.contains(x.start)&&x.field.contains(x.end)&&visible(x.field)&&visible(atElement(x.start))&&visible(atElement(x.end)),'Stale captured source');outwardOwners(x.owners);return x;}
 function sourceTouch(){const s=win.getSelection();if(!s||s.isCollapsed)return false;try{if(c.contains(s.anchorNode)||c.contains(s.focusNode))return true;for(let i=0;i<s.rangeCount;i++)if(s.getRangeAt(i).intersectsNode(c))return true;}catch{return true;}return false;}
 function live(token,check){flushMutations();guard();must(generation===token,'Source action generation changed');if(check)check();}
 function manualCopy(p,token,check){live(token,check);outwardOwners(p.owners);if(menu){menu.remove();menu=null;}if(manual)manual.remove();manual=doc.createElement('section');manual.setAttribute('data-manual-export','');const label=doc.createElement('p'),area=doc.createElement('textarea'),close=doc.createElement('button');label.textContent='Clipboard unavailable. This is the complete owner payload, including source notes, origin and history. Select all and copy.';area.value=p.content;area.readOnly=true;area.rows=12;close.textContent='Close manual copy';close.type='button';close.addEventListener('click',()=>{manual?.remove();manual=null;});manual.append(label,area,close);c.querySelector('[data-capture-host]').append(manual);
  area.addEventListener('copy',e=>{e.preventDefault();e.stopImmediatePropagation();try{live(token);outwardOwners(p.owners);must(area.value===p.content&&manual?.isConnected,'Stale manual source');must(e.clipboardData,'Native clipboard data unavailable');e.clipboardData.setData('text/plain',p.content);}catch(err){say('Manual copy blocked: '+err.message);}},true);area.focus();area.select();
 }
 async function save(p,token,check){
  const id='aitzoas362-'+await browserSHA(encode(stable([PIN,p.owners,p.content])));live(token,check);
  must(win.navigator.locks?.request,'Exclusive storage locking unavailable; save disabled');
  await win.navigator.locks.request('ajew-my-sefer',{mode:'exclusive'},()=>{
   live(token,check);const key='ajew-my-sefer',before=win.localStorage.getItem(key),old=before===null?{sections:[]}:JSON.parse(before);must(Array.isArray(old.sections),'Invalid legacy save collection');const existing=old.sections.filter(e=>e?.id===id);must(existing.length<=1,'Duplicate saved identity');
   const entry={id,title:'Aitzoas Yesharoas — '+p.sourceUnits.map(r=>'section '+r.section+', paragraph '+r.stableIndex).join('; '),content:p.content,source:'https://ajew.org'+p.sourceUnits[0].canonicalUrl,addedAt:existing[0]?.addedAt||new Date().toISOString(),qualifiedFullBody:p};
   const next=appendLegacyCollection(before,entry);live(token,check);must(win.localStorage.getItem(key)===before,'Collection changed; retry');if(next!==before)win.localStorage.setItem(key,next);must(win.localStorage.getItem(key)===next,'Saved collection readback failed');
  });
 }
 async function act(action,owners,check=null){
  const token=generation,originalCheck=check;check=()=>{outwardOwners(owners);if(originalCheck)originalCheck();};try{live(token,check);outwardOwners(owners);const p=fullBodyPayload(d,owners);
   if(action==='save'){await save(p,token,check);say('Saved complete source owners to My Sefer; legacy bridge unchanged.');}
   else if(action==='share'&&win.navigator.share){live(token,check);await win.navigator.share({title:'Aitzoas Yesharoas',text:p.content,url:'https://ajew.org'+p.sourceUnits[0].canonicalUrl});say('Shared complete owners, notes, origin and history.');}
   else if(action==='copy'||action==='share'){
    try{live(token,check);must(win.navigator.clipboard?.writeText,'Clipboard unavailable');await win.navigator.clipboard.writeText(p.content);say('Copied complete owners, notes, origin and history.');}
    catch(err){live(token,check);manualCopy(p,token,check);}
   }else fail('Unsupported source action');
  }catch(err){say(err.name==='AbortError'?'Share cancelled; nothing saved.':'Source action blocked: '+err.message);}
 }
 function descriptor(x){
  const before=doc.createRange();before.selectNodeContents(x.field);before.setEnd(x.start,x.a);let start=before.toString().length;const field=x.field.dataset.sourceField,u=x.row.u;
  if(field==='en'&&u.stableIndex===242){const chars=Array.from(u.en),span=d.bank.displayRules['242'].overlappingInlineSpan,cut=chars.slice(0,span.start).join('').length,length=span.text.length;if(start>=cut)start+=length;}
  const end=start+x.text.length;must(u[field].slice(start,end)===x.text,'Selection crosses a display contraction; choose a literal source span');return {editionSHA256:PIN,owner:u.owner,field,start,end,text:x.text,fullField:u[field]};
 }
 function readAnnotations(raw){const a=raw===null?[]:JSON.parse(raw);must(Array.isArray(a)&&new Set(a.map(x=>x.id)).size===a.length,'Invalid annotation collection');a.forEach(x=>validateAnnotation(d,x));return a;}
 function renderAnnotations(){const panel=c.querySelector('[data-annotations]');panel.replaceChildren();try{for(const a of readAnnotations(win.localStorage.getItem(ANNOTATION_KEY))){const r=validateAnnotation(d,a),item=doc.createElement('article'),h=doc.createElement('h3'),quote=doc.createElement('p'),note=doc.createElement('p'),detail=doc.createElement('details'),summary=doc.createElement('summary'),body=doc.createElement('pre');h.textContent=a.type+' — paragraph '+r.stableIndex;quote.textContent=a.selection.text;note.textContent=a.note;summary.textContent='Complete source owner, notes and history';body.textContent=fullBodyPayload(d,[r.owner]).content;detail.append(summary,body);item.append(h,quote,note,detail);panel.append(item);}}catch(err){panel.textContent='Existing local annotation data retained but not attached: '+err.message;}}
 async function annotate(type,x,el){
  const note=type==='note'||type==='prayer'?win.prompt('Personal '+type+' (not source text):',''):'';if(note===null)return;checkCapture(el);const selection=descriptor(x),a={schema:'qualified-aitzoas362-annotation/v1',id:win.crypto.randomUUID(),type,note,selection,createdAt:new Date().toISOString()};validateAnnotation(d,a);must(win.navigator.locks?.request,'Exclusive annotation locking unavailable');
  await win.navigator.locks.request(ANNOTATION_KEY,{mode:'exclusive'},()=>{checkCapture(el);const before=win.localStorage.getItem(ANNOTATION_KEY),items=readAnnotations(before);items.push(a);const next=JSON.stringify(items);must(win.localStorage.getItem(ANNOTATION_KEY)===before,'Annotation conflict');win.localStorage.setItem(ANNOTATION_KEY,next);must(win.localStorage.getItem(ANNOTATION_KEY)===next,'Annotation readback failed');});invalidate();renderAnnotations();say('Saved source-bound personal '+type+'. Legacy annotations unchanged.');
 }
 function openCapture(){try{const x=selection();invalidate();x.generation=generation;menu=doc.createElement('div');menu.setAttribute('data-source-capture','');menu.setAttribute('role','group');for(const [a,label]of [['copy','Copy complete owner'],['share','Share complete owner'],['save','Save complete owner'],['highlight','Highlight'],['note','Personal note'],['prayer','Personal prayer']]){const b=doc.createElement('button');b.type='button';b.dataset.capturedAction=a;b.textContent=label;if(['save','highlight','note','prayer'].includes(a)&&!win.navigator.locks?.request){b.disabled=true;b.title='Exclusive storage locking is unavailable in this browser';}menu.append(b);}c.querySelector('[data-capture-host]').append(menu);captures.set(menu,x);}catch(err){say('Capture blocked: '+err.message);}}
 function paint(){invalidate();c.dataset.mode=mode;for(const r of rows){const root=r.noteRoot;root.replaceChildren();for(const q of expected(r.u).notes){const p=doc.createElement('p');p.dataset.noteId=q.id;p.dataset.owner=r.u.owner;p.textContent=q.text;root.append(p);}r.notes=all('[data-note-id]',r.el);}all('[data-mode-button]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.modeButton===mode)));guard();}
 function search(){guard();invalidate();const query=c.querySelector('[data-query]').value;let count=0;for(const r of rows)for(const f of r.fields){const text=f.dataset.sourceField==='he'?r.u.he:displayPlan(r.u).en,frag=doc.createDocumentFragment();let start=0;for(const [a,b]of ranges(text,query)){frag.append(doc.createTextNode(text.slice(start,a)));const mark=doc.createElement('mark');mark.textContent=text.slice(a,b);marks.add(mark);frag.append(mark);start=b;count++;}frag.append(doc.createTextNode(text.slice(start)));f.replaceChildren(frag);}guard();c.querySelector('[data-search-status]').textContent=count+' literal-text matches';}
 function sourceInk(el){
  if(!visible(el))return false;
  function chain(leaf){
   if(!visible(leaf))return false;let paper=false;
   for(let n=leaf;n;n=n.parentElement){const t=win.getComputedStyle(n),bg=t.backgroundColor;
    if(t.color!=='rgb(0, 0, 0)'||t.webkitTextFillColor!=='rgb(0, 0, 0)'||parseFloat(t.fontSize)<12||parseFloat(t.fontSize)>24||t.textIndent!=='0px'||t.letterSpacing!=='normal'||t.wordSpacing!=='0px')return false;
    if(!paper&&bg!=='rgba(0, 0, 0, 0)'){const rgb=/^rgb\((\d+), (\d+), (\d+)\)$/.exec(bg);if(!rgb||rgb.slice(1).some(v=>Number(v)<245))return false;paper=true;}
    if(t.backgroundImage!=='none'||t.maskImage!=='none'||t.webkitMaskImage&&!['none',''].includes(t.webkitMaskImage)||t.mixBlendMode!=='normal'||t.backdropFilter!=='none'||t.textShadow!=='none'||t.webkitTextStrokeWidth!=='0px'||t.animationName!=='none'||t.zoom!=='1'||!['static','relative'].includes(t.position))return false;
    for(const pseudo of ['::before','::after'])if(!['none','normal'].includes(win.getComputedStyle(n,pseudo).content))return false;
   }return paper;
  }
  if(!chain(el))return false;
  const b=el.getBoundingClientRect(),walk=doc.createTreeWalker(el,win.NodeFilter.SHOW_TEXT);let n,runs=0;
  while((n=walk.nextNode()))for(const match of n.textContent.matchAll(/\S+/gu)){
   if(!chain(n.parentElement))return false;
   const range=doc.createRange();range.setStart(n,match.index);range.setEnd(n,match.index+match[0].length);const rects=[...range.getClientRects()];
   if(!rects.length||rects.some(r=>r.width<=0||r.height<=0||r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1))return false;runs++;
  }return runs>0;
 }
 // Only role-proven, direct HEAD favicon links are non-paint mutations.
 // Keep former non-icon roles sticky: current rel alone cannot authenticate a
 // queued removal or a stylesheet -> icon -> removal transaction.
 const linkRoles=new WeakMap(),headLinks=new WeakSet(),paintLinks=new WeakSet();
 const faviconRole=rel=>['icon','alternate icon','apple-touch-icon'].includes(String(rel??'').trim().toLowerCase().replace(/\s+/g,' '));
 function rememberHeadLink(n){if(n?.nodeType===1&&n.tagName==='LINK'){headLinks.add(n);const rel=n.getAttribute('rel');linkRoles.set(n,rel);if(!faviconRole(rel))paintLinks.add(n);}}
 if(doc.head)all('link',doc.head).forEach(rememberHeadLink);
 function batchFavicons(records){
  const touched=new Set(),safe=new Set(),touch=n=>{if(n?.nodeType===1&&n.tagName==='LINK')touched.add(n);};
  for(const r of records){
   touch(r.target);
   if(r.type==='childList'&&r.target===doc.head)for(const n of [...r.addedNodes,...r.removedNodes]){touch(n);if(n?.nodeType===1&&n.tagName==='LINK')headLinks.add(n);}
   // Evaluate ALL old roles before classifying ANY record in this batch.
   if(r.type==='attributes'&&r.attributeName==='rel'&&r.target?.tagName==='LINK'&&!faviconRole(r.oldValue))paintLinks.add(r.target);
  }
  for(const n of touched){
   const rel=n.getAttribute('rel');
   if(linkRoles.has(n)&&!faviconRole(linkRoles.get(n))||!faviconRole(rel))paintLinks.add(n);
   linkRoles.set(n,rel);
   if(headLinks.has(n)&&!paintLinks.has(n)&&faviconRole(rel)&&!n.childNodes.length&&(n.parentNode===doc.head||!n.isConnected))safe.add(n);
  }
  return safe;
 }
 function relevantMutation(r,safe){
  const t=r.target,e=atElement(t);
  if(t===c)return true;
  if(r.type==='attributes'&&r.attributeName==='rel'&&safe.has(t)&&faviconRole(r.oldValue))return false;
  if(r.type==='childList'&&t===doc.head){const nodes=[...r.addedNodes,...r.removedNodes];if(nodes.length&&nodes.every(n=>safe.has(n)))return false;}
  if(t===doc.head||doc.head?.contains(t))return true;
  if(e?.matches('style,link')||e?.closest('style'))return true;
  if(e&&e!==c&&e.contains(c))return true;
  return [sourceRoot,heading,c.querySelector('header')].some(root=>root&&(root===t||root.contains(t)));
 }
 function mutations(records){
  const safe=batchFavicons(records);
  if(!records.some(r=>relevantMutation(r,safe)))return;
  printEpoch++;generation++;admission=null;
  // Consume every record; never disconnect or clear a foreign queue as "owned".
  printFlag('printSafe','false');printFlag('printChecking','false');
 }
 function flushMutations(){if(observer)mutations(observer.takeRecords());}
 function printFlag(key,value){
  // Drain foreign records BEFORE a narrowly owned attribute write. Only the
  // single exact record produced by that write is exempt, not a whole batch.
  flushMutations();if(c.dataset[key]===value)return;
  const attr=key==='printSafe'?'data-print-safe':'data-print-checking',old=c.getAttribute(attr);c.setAttribute(attr,value);
  if(observer){const records=observer.takeRecords();let own=false;const foreign=records.filter(r=>{if(!own&&r.target===c&&r.type==='attributes'&&r.attributeName===attr&&r.oldValue===old){own=true;return false;}return true;});mutations(foreign);}
 }
 function watchAncestors(){for(let n=c.parentElement;n;n=n.parentElement)observer.observe(n,{childList:true,attributes:true,attributeOldValue:true});}
 function watchPrint(){
  must(typeof win.MutationObserver==='function','Print mutation tracking unavailable');
  observer=new win.MutationObserver(mutations);observer.observe(c,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true});
  if(doc.head)observer.observe(doc.head,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true});
  watchAncestors();
 }
 function restorePrint(){
  admission=null;printFlag('printSafe','false');printFlag('printChecking','false');
  if(printState){const prior=printState;printState=null;mode=prior.mode;
   try{paint();}catch(err){say('Print restore blocked: '+err.message);}
   finally{for(const [el,open]of prior.details)el.open=open;flushMutations();}
  }
 }
 function printGate(){
  admission=null;printFlag('printSafe','false');printFlag('printChecking','false');try{
   guard();must(observer&&win.matchMedia('print').matches,'Print media/tracking not active');watchAncestors();
   if(!printState)printState={mode,details:rows.map(r=>[r.history,r.history.open])};
   if(mode!=='both'){mode='both';paint();}rows.forEach(r=>r.history.open=true);
   flushMutations();guard();const epoch=printEpoch;
   // Checking exposes the SAME admitted tree for geometry, not an alternate body;
   // the warning remains visible until the complete synchronous check succeeds.
   printFlag('printChecking','true');
   must(sourceInk(heading),'Unreadable section heading');
   for(const r of rows)for(const el of [...r.fields,...r.notes,r.origin,...all('[data-unavailable]',r.el),...r.historyFields,...r.historyFields.map(h=>h.previousElementSibling),...all('[data-he-wrap] h3,[data-en-wrap] h3,[data-origin-wrap] h3',r.el),r.el.children[0]])if(el.textContent)must(sourceInk(el),'Unreadable/clipped source, note, origin or history');
   guard();flushMutations();must(epoch===printEpoch&&win.matchMedia('print').matches,'Print generation changed');
   admission={epoch};printFlag('printSafe','true');printFlag('printChecking','false');
   must(admission?.epoch===printEpoch,'Print admission revoked');say('Print media source/notes/history ink gate passed; native PDF review remains required.');
  }catch(err){admission=null;printFlag('printSafe','false');printFlag('printChecking','false');say('Print blocked: '+err.message);}
 }
 doc.addEventListener('selectionchange',()=>{if(menu)invalidate();},true);
 doc.addEventListener('mousedown',e=>{if(atElement(e.target)?.closest('[data-selection-action],[data-capture],[data-source-capture]'))e.preventDefault();},true);
 doc.addEventListener('copy',e=>{if(atElement(e.target)?.closest('[data-manual-export]'))return;if(!sourceTouch())return;e.preventDefault();e.stopImmediatePropagation();try{const x=selection();must(e.clipboardData,'Clipboard data unavailable');e.clipboardData.setData('text/plain',fullBodyPayload(d,x.owners).content);}catch(err){if(e.clipboardData)e.clipboardData.setData('text/plain','');say('Native copy blocked: '+err.message);}},true);
 for(const type of ['cut','dragstart'])doc.addEventListener(type,e=>{if(sourceTouch()){e.preventDefault();e.stopImmediatePropagation();say('Source cut/drag disabled; use complete-owner Copy.');}},true);
 doc.addEventListener('click',e=>{
  const b=atElement(e.target)?.closest('button');if(!b||!c.contains(b))return;
  const scope=b.closest('[data-unit]'),owned=rows.find(r=>r.el===scope);
  if(b.hasAttribute('data-action')||b.hasAttribute('data-selection-action')||b.hasAttribute('data-captured-action')){e.preventDefault();e.stopImmediatePropagation();try{guard();must(visible(b)&&!b.disabled,'Hidden or disabled source control');must(b.dataset.capturedAction||controls.has(b),'Unbound source control');if(b.dataset.capturedAction){const el=b.closest('[data-source-capture]'),x=checkCapture(el),a=b.dataset.capturedAction;if(['copy','share','save'].includes(a))void act(a,x.owners,()=>checkCapture(el));else if(['highlight','note','prayer'].includes(a))void annotate(a,x,el).catch(err=>say('Annotation blocked: '+err.message));else fail('Unknown capture action');}
   else if(b.dataset.selectionAction){const x=selection();void act(b.dataset.selectionAction,x.owners,()=>{const current=selection();must(current.start===x.start&&current.end===x.end&&current.a===x.a&&current.b===x.b&&current.text===x.text,'Selection changed');});}
   else {must(!scope||owned,'Foreign paragraph control');void act(b.dataset.action,owned?[owned.u.owner]:rows.map(r=>r.u.owner));}}catch(err){say('Export blocked: '+err.message);}return;}
  try{if(b.hasAttribute('data-capture')){openCapture();return;}if(b.dataset.modeButton){guard();must(['hebrew','english','both'].includes(b.dataset.modeButton),'Unknown mode');mode=b.dataset.modeButton;paint();return;}
   if(b.dataset.themeButton){guard();must(['day','sepia','night'].includes(b.dataset.themeButton),'Unknown theme');invalidate();c.dataset.theme=b.dataset.themeButton;return;}
   if(b.hasAttribute('data-print')){guard();invalidate();win.print();return;}
   if(b.hasAttribute('data-fullscreen')){guard();invalidate();if(doc.fullscreenElement)void doc.exitFullscreen().catch(err=>say(err.message));else if(c.requestFullscreen)void c.requestFullscreen().catch(err=>say(err.message));else say('Fullscreen unavailable in this browser.');return;}
   if(b.hasAttribute('data-bookmark')){guard();const r=rows.find(r=>r.el.getBoundingClientRect().bottom>0)||rows[0],key='ajew-aitzoas362-bookmark-v1',value=JSON.stringify({editionSHA256:PIN,owner:r.u.owner,url:r.u.canonicalUrl});win.localStorage.setItem(key,value);must(win.localStorage.getItem(key)===value,'Bookmark readback failed');win.history.replaceState(null,'','#seg-'+r.u.stableIndex);say('Bookmarked paragraph '+r.u.stableIndex);}
  }catch(err){say('Control blocked: '+err.message);}
 },true);
 c.addEventListener('dblclick',e=>{if(atElement(e.target)?.closest('[data-source-field]'))openCapture();});
 c.querySelector('[data-query]').addEventListener('input',()=>{try{search();}catch(err){say('Search blocked: '+err.message);}});
 c.querySelector('[data-font]').addEventListener('input',e=>{try{guard();const n=Number(e.target.value);must(Number.isInteger(n)&&n>=16&&n<=24,'Invalid text size');invalidate();c.style.setProperty('--q-font',n+'px');}catch(err){say(err.message);}});
 c.addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey||atElement(e.target)?.closest('input,textarea,button,select'))return;try{guard();const key=e.key.toLowerCase();if(['h','e','b'].includes(key)){mode={h:'hebrew',e:'english',b:'both'}[key];paint();}else if(key==='p'){invalidate();win.print();}else if(key==='j'||key==='k'){const r=rows.findIndex(r=>r.el.getBoundingClientRect().top>=0),i=Math.max(0,Math.min(rows.length-1,(r<0?0:r)+(key==='j'?1:-1)));rows[i].el.scrollIntoView();}else return;e.preventDefault();}catch(err){say(err.message);}});
 win.addEventListener('beforeprint',printGate);win.addEventListener('afterprint',restorePrint);win.matchMedia('print').addEventListener('change',e=>e.matches?printGate():restorePrint());win.addEventListener('pagehide',()=>{ready=false;c.dataset.ready='false';invalidate();},{once:true});
 const readyPromise=(async()=>{try{
  const read=async url=>{const res=await win.fetch(url,{cache:'no-store',credentials:'same-origin',redirect:'error'});must(res.ok,'Source unavailable: '+url);return res.arrayBuffer();};
  d=await authenticateEdition(await read(ASSET),a=>read(a.url),browserSHA);const section=Number(c.dataset.section),units=d.rows.filter(r=>r.section===section);
  rows=all('[data-unit]').map((el,i)=>({u:units[i],el,fields:all('[data-source-field]',el),notes:all('[data-note-id]',el),noteRoot:el.querySelector('[data-notes-root]'),origin:el.querySelector('[data-origin]'),history:el.querySelector('[data-owner-history]'),historyFields:all('[data-history-field]',el)}));
  sourceRoot=c.querySelector('[data-source-root]');heading=c.querySelector('[data-print-heading]');ready=true;guard();paint();renderAnnotations();all('button,input').filter(el=>el.matches('[data-action],[data-selection-action],[data-capture],[data-mode-button],[data-theme-button],[data-print],[data-fullscreen],[data-bookmark],[data-query],[data-font]')).forEach(el=>{el.disabled=(el.dataset.action==='save'||el.dataset.selectionAction==='save')&&!win.navigator.locks?.request||el.hasAttribute('data-fullscreen')&&!c.requestFullscreen;if(el.disabled)el.title='Required native locking or fullscreen support is unavailable';});c.dataset.ready='true';watchPrint();say('Source fields, origin, required notes and labelled history authenticated. Exports carry complete owners.');const q=new URLSearchParams(win.location.search).get('q');if(q){c.querySelector('[data-query]').value=q;search();}return true;
 }catch(err){ready=false;c.dataset.ready='false';c.dataset.printSafe='false';say('Source actions disabled: '+err.message);return false;}})();
 Object.defineProperty(win,'Aitzoas362Ready',{value:readyPromise});Object.defineProperty(win,'Aitzoas362IntegrityReady',{value:()=>{try{return guard();}catch{return false;}}});return readyPromise;
}
if(typeof window!=='undefined'&&typeof document!=='undefined')installAitzoas362();
