import {PIN,ROUTE,ASSET,authenticateEdition,ranges,fullBodyPayload,appendLegacyCollection,stable,historyEntries} from '/qualified-sichos-231240-core.js?v=1';
// This reader never initializes shared source painters or captured-text exporters.
if(location.pathname.replace(/\/$/,'')===ROUTE){
 const container=document.querySelector('[data-qualified-sichos-231240]');
 let ready=false,data=null,rows=[],failure='Authentication pending',mode='both',witness='he';
 const warning=container.querySelector('[data-integrity-status]');
 const say=text=>{warning.textContent=text;};
 const OUTWARD='#btn-share,#btn-add-sefer,#btn-print,.seg-copy-btn,.seg-add-sefer-btn,.ajew-segment-action-btn,.selection-popup .sel-btn,#highlight-context-menu .hl-action,.notes-panel-btn,[data-q-action]';
 const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const sha=async b=>hex(await crypto.subtle.digest('SHA-256',b));
 function assertDOM(){
  if(!ready)throw Error(failure);
  if(container!==document.querySelector('[data-qualified-sichos-231240]')||document.querySelectorAll('[data-qualified-sichos-231240]').length!==1||!container.isConnected||container.dataset.projectionSha!==PIN)throw Error('Untrusted reading scope');
  const installed=[...container.querySelectorAll('[data-unit]')];
  if(installed.length!==52||rows.length!==52||container.querySelectorAll('[data-owner-history]').length!==52||container.querySelectorAll('[data-source-field]').length!==156||container.querySelectorAll('[data-qualification]').length!==135)throw Error('Missing or duplicated paragraph, text or source note');
  const groups=[...container.querySelectorAll('[data-group]')];if(groups.length!==10||groups.some((g,i)=>g.dataset.group!==data.groups[i].id||g.id!=='group-'+data.groups[i].id))throw Error('Teaching order changed');
  for(const [i,r] of rows.entries()){
   const u=r.u;if(installed[i]!==r.el||r.el.id!==u.anchor||r.el.dataset.unit!==u.owner||r.el.dataset.index!==u.owner||r.el.dataset.sourceIndex!==String(u.source_index)||r.el.dataset.position!==String(u.array_position)||r.el.closest('[data-group]')!==r.group||r.group.dataset.group!==u.group)throw Error('Paragraph identity changed');
   const fields=[...r.el.querySelectorAll('[data-source-field]')];if(fields.length!==3||fields.some((el,j)=>el!==r.fields[j]||el.closest('.archive')))throw Error('Untrusted source text');
   for(const [j,f] of ['he','he_nikud','en'].entries())if(r.fields[j].dataset.sourceField!==f||r.fields[j].textContent!==u[f])throw Error('Source text changed');
   const contentRoot=r.el.querySelector('.required-qualifications');if(!contentRoot||contentRoot.previousElementSibling!==r.el.querySelector('.qualified-pair')||!contentRoot.nextElementSibling?.matches('.qualified-unit-actions'))throw Error('Source notes must follow their owning pair');
   const notes=[...r.el.querySelectorAll('[data-qualification]')];if(notes.length!==r.notes.length||notes.length!==u.qualifications.length)throw Error('Missing source note');
   notes.forEach((el,j)=>{const q=u.qualifications[j];if(el!==r.notes[j]||el.dataset.qualification!==q.id||el.dataset.owner!==u.owner||el.dataset.ordinal!==String(j)||el.textContent!==q.text||el.children.length||!el.parentElement.matches('.required-qualifications')||el.parentElement.parentElement!==r.el)throw Error('Source note text or attachment changed');});
   const history=r.el.querySelector('[data-owner-history]'),entries=historyEntries(u),nodes=[...history.querySelectorAll('[data-history-field]')];
   if(history!==r.history||history.dataset.ownerHistory!==u.owner||nodes.length!==entries.length||history.querySelector('summary')?.textContent!=='Earlier English and native comparison history — not the current translation')throw Error('Missing owner history');
   nodes.forEach((el,j)=>{const e=entries[j];if(el!==r.historyFields[j]||el.previousElementSibling?.textContent!==e.label||el.parentElement.parentElement!==history||el.dataset.historyField!==e.key||el.textContent!==e.text||el.children.length||el.closest('[data-owner-history]')!==history||(e.href?el.getAttribute('href')!==e.href:el.tagName!=='P'))throw Error('History text or archive link changed');});
  }
  return true;
 }
 Object.defineProperty(window,'QualifiedSichos231240IntegrityReady',{configurable:false,writable:false,value:()=>{try{return assertDOM();}catch(_){return false;}}});
 function visible(el){if(!el?.isConnected||!el.getClientRects().length)return false;const box=el.getBoundingClientRect();if(box.width<=0||box.height<=0)return false;for(let n=el;n;n=n.parentElement){const c=getComputedStyle(n);if(n.hidden||c.display==='none'||c.visibility!=='visible'||Number(c.opacity)<1||c.contentVisibility==='hidden'||c.clipPath!=='none'||(c.clip&&c.clip!=='auto')||c.filter!=='none'||c.transform!=='none')return false;if(/hidden|clip/.test(c.overflowX+' '+c.overflowY)){const r=n.getBoundingClientRect();if(box.left<r.left-1||box.right>r.right+1||box.top<r.top-1||box.bottom>r.bottom+1)return false;}if(n.tagName==='DETAILS'&&!n.open&&!n.querySelector('summary')?.contains(el))return false;}return true;}
 const searchMarks=new WeakSet();
 function printInk(note,source=false){
  if(!visible(note)||[...note.childNodes].some(n=>n.nodeType!==Node.TEXT_NODE&&(!source||n.nodeType!==Node.ELEMENT_NODE||n.tagName!=='MARK'||!searchMarks.has(n)||n.children.length)))return false;
  if(source)for(const mark of note.children)if(!printInk(mark,true))return false;
  const c=getComputedStyle(note);if(c.color!=='rgb(0, 0, 0)'||c.webkitTextFillColor!=='rgb(0, 0, 0)'||parseFloat(c.fontSize)<12||parseFloat(c.fontSize)>24||c.textIndent!=='0px'||c.letterSpacing!=='normal'||c.wordSpacing!=='0px')return false;
  let paper=false;
  for(let n=note;n;n=n.parentElement){const s=getComputedStyle(n),bg=s.backgroundColor;
   if(!paper&&bg!=='rgba(0, 0, 0, 0)'&&!(source&&searchMarks.has(n)&&bg==='rgb(255, 255, 0)')){const rgb=/^rgb\((\d+), (\d+), (\d+)\)$/.exec(bg);if(!rgb||rgb.slice(1).some(v=>Number(v)<245))return false;paper=true;}
   if(s.backgroundImage!=='none'||s.maskImage!=='none'||s.mixBlendMode!=='normal'||s.backdropFilter!=='none'||s.textShadow!=='none'||s.webkitTextStrokeWidth!=='0px'||s.animationName!=='none'||s.zoom!=='1'||!['static','relative'].includes(s.position))return false;
   for(const pseudo of ['::before','::after'])if(!['none','normal'].includes(getComputedStyle(n,pseudo).content))return false;
  }
  // A complete text-node Range returns every line fragment, including interior
  // runs. Validate all fragments, without creating one live Range per word.
  const box=note.getBoundingClientRect();let runs=note.children.length;
  for(const node of note.childNodes)if(node.nodeType===Node.TEXT_NODE&&/\S/u.test(node.textContent)){const range=document.createRange();range.setStart(node,0);range.setEnd(node,node.textContent.length);const rects=[...range.getClientRects()];if(!rects.length||rects.some(r=>r.width<=0||r.height<=0||r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1))return false;runs++;}
  return paper&&runs>0;
 }
 function sourceSelection(){const sel=getSelection();if(!sel||sel.isCollapsed)return false;try{for(let i=0;i<sel.rangeCount;i++)if(sel.getRangeAt(i).intersectsNode(container))return true;return container.contains(sel.anchorNode)||container.contains(sel.focusNode);}catch(_){return true;}}
 function selectionOwners(){
  assertDOM();const sel=getSelection();if(!sel||sel.isCollapsed||sel.rangeCount!==1)throw Error('Choose one visible source range');const range=sel.getRangeAt(0);
  const fieldAt=node=>{const el=node?.nodeType===Node.ELEMENT_NODE?node:node?.parentElement;return rows.flatMap(r=>r.fields).find(f=>f.contains(node)&&visible(f)&&visible(el));};
  if(!fieldAt(range.startContainer)||!fieldAt(range.endContainer))throw Error('Selection endpoints must be visible source text');
  const selected=rows.filter(r=>r.fields.some(f=>visible(f)&&range.intersectsNode(f)));if(!selected.length)throw Error('No authenticated source intersection');return selected.map(r=>r.u.owner);
 }
 function updateSelection(){let owners=null;try{owners=selectionOwners();}catch(_){}document.querySelectorAll('.selection-popup .sel-btn').forEach(b=>b.disabled=!owners);const status=container.querySelector('[data-qualified-selection-status]');if(status)status.textContent=owners?'Exports include the complete selected paragraphs, both Hebrew texts and all source notes.':'Select visible source text. Hidden, interface, archive and stale ranges cannot be exported.';}
 document.addEventListener('selectionchange',updateSelection);document.addEventListener('mousedown',e=>{if(e.target.closest('.selection-popup .sel-btn'))e.preventDefault();},true);
 function search(){
  assertDOM();const q=container.querySelector('[data-reader-query]').value;let found=0;
  for(const r of rows)for(const [i,f] of ['he','he_nikud','en'].entries()){
   const text=r.u[f],frag=document.createDocumentFragment();let cursor=0;
   for(const [a,b] of ranges(text,q)){frag.append(document.createTextNode(text.slice(cursor,a)));const mark=document.createElement('mark');mark.textContent=text.slice(a,b);searchMarks.add(mark);frag.append(mark);cursor=b;found++;}frag.append(document.createTextNode(text.slice(cursor)));r.fields[i].replaceChildren(frag);
  }
  container.querySelector('[data-search-status]').textContent=found+' exact-text matches';assertDOM();
 }
 function paint(){container.dataset.mode=mode;container.dataset.witness=witness;container.querySelectorAll('[data-q-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.qMode===mode)));container.querySelectorAll('[data-q-witness]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.qWitness===witness)));updateSelection();}
 async function save(payload){
  const id='qualified-sichos-231240-'+await sha(new TextEncoder().encode(stable([PIN,payload.owners,payload.content])));assertDOM();
  const commit=()=>{assertDOM();const key='ajew-my-sefer',before=localStorage.getItem(key);const existing=before===null?[]:JSON.parse(before).sections;if(!Array.isArray(existing))throw Error('Invalid saved collection');
   const prior=existing.filter(s=>s.id===id);if(prior.length>1)throw Error('Ambiguous save');
   const entry={id,title:data.title+' — '+payload.sourceUnits.map(u=>'Teaching '+u.section+', paragraph '+u.source_index).join('; '),content:payload.content,source:location.origin+ROUTE+'/',addedAt:prior[0]?.addedAt||new Date().toISOString(),qualifiedFullBody:payload};
   const next=appendLegacyCollection(before,entry);if(localStorage.getItem(key)!==before)throw Error('Collection changed; retry');localStorage.setItem(key,next);if(localStorage.getItem(key)!==next)throw Error('Save verification failed');};
  if(navigator.locks)await navigator.locks.request('ajew-my-sefer',{mode:'exclusive'},commit);else commit();
 }
 async function copy(content){
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(content);return true;}
  catch(_){assertDOM();window.prompt('Copy the complete paragraphs and source notes:',content);return false;}
 }
 async function act(action,owners){
  try{assertDOM();const payload=fullBodyPayload(data,owners);
   if(action==='save'){await save(payload);say('Saved complete paragraphs and source notes to My Sefer.');}
   else if(action==='share'&&navigator.share){assertDOM();await navigator.share({title:data.title,text:payload.content,url:location.origin+ROUTE+'/'});say('Shared complete paragraphs and source notes.');}
   else if(action==='copy'||action==='share'){assertDOM();say(await copy(payload.content)?'Copied complete paragraphs and source notes.':'Complete paragraphs and source notes are available in the copy dialog.');}
   else throw Error('Unrecognized action');
  }catch(e){say('Export blocked: '+e.message);}
 }
 // Captured menus are occurrence capabilities, never owner/text data attributes.
 // Keep all older annotation stores byte-for-byte; this edition uses a disjoint key.
 const ANNOTATIONS='ajew-qualified-sichos-231240-annotations-v1',captures=new WeakMap();
 let generation=0,activeMenu=null;
 function invalidateCapture(){generation++;if(activeMenu){activeMenu.remove();activeMenu=null;}}
 function captureRange(){
  const owners=selectionOwners(),range=getSelection().getRangeAt(0).cloneRange();
  return {owners,range,start:range.startContainer,end:range.endContainer,a:range.startOffset,b:range.endOffset,text:range.toString(),generation};
 }
 function checkCapture(menu){
  assertDOM();const cap=captures.get(menu);
  if(menu!==activeMenu||!menu.isConnected||!cap||cap.generation!==generation||!cap.start.isConnected||!cap.end.isConnected||cap.range.startContainer!==cap.start||cap.range.endContainer!==cap.end||cap.range.startOffset!==cap.a||cap.range.endOffset!==cap.b||cap.range.toString()!==cap.text)throw Error('Stale or unbound captured selection');
  const fields=rows.flatMap(r=>r.fields),a=fields.find(f=>f.contains(cap.start)),b=fields.find(f=>f.contains(cap.end));
  if(!a||!b||!visible(a)||!visible(b))throw Error('Captured selection is no longer visible');
  const ids=rows.filter(r=>r.fields.some(f=>visible(f)&&cap.range.intersectsNode(f))).map(r=>r.u.owner);
  if(stable(ids)!==stable(cap.owners))throw Error('Captured source identity changed');return cap;
 }
 function descriptor(cap){
  const row=rows.find(r=>r.fields.some(f=>f.contains(cap.start)&&f.contains(cap.end)));
  const field=row?.fields.find(f=>f.contains(cap.start)&&f.contains(cap.end));
  if(!row||!field)throw Error('Local annotations require one source field; Share includes all selected paragraphs');
  const before=document.createRange();before.selectNodeContents(field);before.setEnd(cap.start,cap.a);const start=before.toString().length;
  const end=start+cap.text.length,f=field.dataset.sourceField;
  if(row.u[f].slice(start,end)!==cap.text||start===end)throw Error('Annotation occurrence mismatch');
  return {projection_sha256:PIN,owner:row.u.owner,field:f,field_sha256:row.u.field_sha256[f],start,end,text:cap.text};
 }
 function checkAnnotation(a){
  const x=a?.selection,u=data.units.find(u=>u.owner===x?.owner);
  if(a?.schema!=='qualified-local-annotation/v1'||!['highlight','note','prayer'].includes(a.type)||typeof a.note!=='string'||typeof a.id!=='string'||!u||!['he','he_nikud','en'].includes(x.field)||x.projection_sha256!==PIN||x.field_sha256!==u.field_sha256[x.field]||!Number.isInteger(x.start)||!Number.isInteger(x.end)||x.start<0||x.end<=x.start||x.end>u[x.field].length||x.text!==u[x.field].slice(x.start,x.end))throw Error('Unmatched saved annotation retained; not attached to this text');return u;
 }
 function readAnnotations(raw){const a=raw===null?[]:JSON.parse(raw);if(!Array.isArray(a)||new Set(a.map(x=>x.id)).size!==a.length)throw Error('Invalid annotation collection');for(const x of a)checkAnnotation(x);return a;}
 function renderAnnotations(){
  const panel=container.querySelector('[data-local-annotations]');panel.replaceChildren();
  try{for(const a of readAnnotations(localStorage.getItem(ANNOTATIONS))){const u=checkAnnotation(a),item=document.createElement('article'),label=document.createElement('h3'),quote=document.createElement('p'),note=document.createElement('p'),full=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('pre');
   label.textContent=a.type+' — Teaching '+u.section+', paragraph '+u.source_index;quote.textContent=a.selection.text;note.textContent=a.note;summary.textContent='Complete paragraph and source notes';body.textContent=fullBodyPayload(data,[u.owner]).content;full.append(summary,body);item.append(label,quote,note,full);panel.append(item);}
  }catch(e){const p=document.createElement('p');p.textContent=e.message;panel.append(p);}
 }
 function saveAnnotation(type,cap,note=''){
  assertDOM();const selection=descriptor(cap),before=localStorage.getItem(ANNOTATIONS),items=readAnnotations(before);
  items.push({schema:'qualified-local-annotation/v1',id:crypto.randomUUID(),type,note,selection,createdAt:new Date().toISOString()});
  const next=JSON.stringify(items);if(localStorage.getItem(ANNOTATIONS)!==before)throw Error('Annotations changed; retry');localStorage.setItem(ANNOTATIONS,next);if(localStorage.getItem(ANNOTATIONS)!==next)throw Error('Annotation save verification failed');renderAnnotations();say('Saved local '+type+'. Earlier annotations are unchanged.');
 }
 function openCapture(){
  try{invalidateCapture();const cap=captureRange(),menu=document.createElement('div');menu.id='highlight-context-menu';menu.className='highlight-context-menu qualified-capture';menu.setAttribute('role','group');menu.setAttribute('aria-label','Captured selection actions');
   for(const [action,label] of [['save','Highlight'],['note','Note'],['pray','Prayer'],['share','Share complete paragraphs']]){const b=document.createElement('button');b.type='button';b.className='hl-action';b.dataset.action=action;b.textContent=label;menu.append(b);}
   const message=document.createElement('p');message.textContent='Local annotations keep the selected occurrence. Sharing includes complete paragraphs and all source notes.';menu.append(message);container.querySelector('[data-capture-host]').append(menu);captures.set(menu,cap);activeMenu=menu;
  }catch(e){say('Selection actions blocked: '+e.message);}
 }
 container.addEventListener('dblclick',e=>{if(e.target.closest('[data-source-field]'))openCapture();});
 document.addEventListener('mousedown',e=>{if(e.target.closest('#highlight-context-menu,.qualified-selection-actions'))e.preventDefault();},true);
 window.addEventListener('pagehide',invalidateCapture,{once:true});
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(container.contains(b)&&b.dataset.qMode){e.preventDefault();if(['hebrew','english','both'].includes(b.dataset.qMode))mode=b.dataset.qMode;paint();return;}
  if(container.contains(b)&&b.dataset.qWitness){e.preventDefault();if(['he','he_nikud'].includes(b.dataset.qWitness))witness=b.dataset.qWitness;paint();return;}
  if(container.contains(b)&&b.hasAttribute('data-q-capture')){e.preventDefault();e.stopImmediatePropagation();openCapture();return;}
  if(!b.matches(OUTWARD))return;
  const capturedMenu=b.closest('#highlight-context-menu');
  if(capturedMenu&&captures.has(capturedMenu)){
   e.preventDefault();e.stopImmediatePropagation();
   try{const cap=checkCapture(capturedMenu),action=b.dataset.action;
    if(action==='share'){void act('share',cap.owners);}
    else if(['save','note','pray'].includes(action)){let note='';if(action==='note'){note=window.prompt('Add a personal note to this selection:','');if(note===null)return;checkCapture(capturedMenu);}saveAnnotation({save:'highlight',note:'note',pray:'prayer'}[action],cap,note);}
    else throw Error('Unknown captured action');invalidateCapture();
   }catch(err){say('Captured action blocked: '+err.message);}return;
  }
  if(capturedMenu&&['note','pray'].includes(b.dataset.action))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(b.closest('#highlight-context-menu')||b.matches('.notes-panel-btn,.ajew-segment-action-btn')){say('Export blocked: use a new selection in the reading text or the controls beside a paragraph.');return;}
  try{assertDOM();if(b.id==='btn-print'){window.print();return;}
   let action=b.dataset.qAction;if(!action)action=b.closest('.selection-popup')?{copy:'copy',share:'share',mysefer:'save'}[b.dataset.action]:b.matches('#btn-add-sefer,.seg-add-sefer-btn')?'save':b.matches('.seg-copy-btn')?'copy':b.id==='btn-share'?'share':null;
   const element=b.closest('[data-unit]'),row=rows.find(r=>r.el===element);
   if(element&&!row||b.hasAttribute('data-q-action')&&!container.contains(b))throw Error('Untrusted paragraph control');
   const owners=b.closest('.selection-popup')?selectionOwners():row?[row.u.owner]:data.units.map(u=>u.owner);
   if(!action)throw Error('Unknown action');void act(action,owners);
  }catch(err){say('Export blocked: '+err.message);}
 },true);
 document.addEventListener('copy',e=>{if(!sourceSelection())return;e.preventDefault();e.stopImmediatePropagation();try{const owners=selectionOwners();e.clipboardData.setData('text/plain',fullBodyPayload(data,owners).content);say('Copied complete selected paragraphs and source notes.');}catch(err){say('Selection copy blocked: '+err.message);}},true);
 let printHistory=null;
 function restoreHistory(){if(printHistory){for(const [el,open] of printHistory)el.open=open;printHistory=null;}}
 function printGate(){container.dataset.printSafe='false';try{assertDOM();if(!matchMedia('print').matches)throw Error('Print media pending');if(!printHistory)printHistory=rows.map(r=>[r.history,r.history.open]);for(const r of rows)r.history.open=true;container.dataset.printSafe='true';for(const r of rows){for(const field of r.fields)if(!printInk(field,true))throw Error('Source text is not safely readable');for(const note of r.notes)if(!printInk(note))throw Error('Source notes are not safely readable');for(const text of r.historyFields)if(text.textContent&&!printInk(text))throw Error('History is not safely readable');}container.dataset.printSafe='true';}catch(e){container.dataset.printSafe='false';say('Print blocked: '+e.message);}}
 window.addEventListener('beforeprint',printGate);matchMedia('print').addEventListener('change',e=>{if(e.matches)printGate();else {container.dataset.printSafe='false';restoreHistory();}});window.addEventListener('afterprint',()=>{container.dataset.printSafe='false';restoreHistory();});
 Object.defineProperty(window,'QualifiedSichos231240Ready',{value:(async()=>{try{
  const res=await fetch(ASSET,{cache:'no-store'});if(!res.ok)throw Error('Edition unavailable');
  data=await authenticateEdition(await res.arrayBuffer(),async a=>{const r=await fetch(a.url,{cache:'no-store'});if(!r.ok)throw Error('Source text unavailable');return r.arrayBuffer();},sha);
  rows=[...container.querySelectorAll('[data-unit]')].map((el,i)=>({el,u:data.units[i],group:el.closest('[data-group]'),fields:[...el.querySelectorAll('[data-source-field]')],notes:[...el.querySelectorAll('[data-qualification]')],history:el.querySelector('[data-owner-history]'),historyFields:[...el.querySelectorAll('[data-history-field]')]}));
  ready=true;assertDOM();paint();renderAnnotations();container.querySelector('[data-reader-query]').addEventListener('input',()=>{try{search();}catch(e){say('Search blocked: '+e.message);}});say('Reading text, source notes and history verified.');container.dataset.sourceExactReady='true';
  const query=new URLSearchParams(location.search).get('q');if(query){container.querySelector('[data-reader-query]').value=query;search();}return true;
 }catch(e){ready=false;failure=e.message;container.dataset.sourceExactReady='false';say('Exports disabled: '+failure);return false;}})()});
}
