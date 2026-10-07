import {PIN,ROUTE,ASSET,validateProjection,ranges,fullBodyPayload,appendLegacyCollection,stable} from '/qualified-wrapup-core.js?v=1d84e5193d94';
// Standalone scoped reader. Never invokes the shared source-transforming painter.
if(location.pathname.replace(/\/$/,'')===ROUTE){
 const container=document.querySelector('[data-qualified-wrapup]');
 let ready=false,data=null,rows=[],failure='Authentication pending',mode='both',witness='he';
 const warning=container.querySelector('[data-integrity-status]');
 const say=text=>{warning.textContent=text;};
 const OUTWARD='#btn-share,#btn-add-sefer,#btn-print,.seg-copy-btn,.seg-add-sefer-btn,.ajew-segment-action-btn,.selection-popup .sel-btn,#highlight-context-menu .hl-action,.notes-panel-btn,[data-q-action]';
 const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const sha=async b=>hex(await crypto.subtle.digest('SHA-256',b));
 function assertDOM(){
  if(!ready)throw Error(failure);
  if(container!==document.querySelector('[data-qualified-wrapup]')||document.querySelectorAll('[data-qualified-wrapup]').length!==1||!container.isConnected||container.dataset.projectionSha!==PIN)throw Error('Spoofed scope');
  const installed=[...container.querySelectorAll('[data-unit]')];if(installed.length!==rows.length||rows.length!==data.units.length||container.querySelectorAll('[data-source-field]').length!==rows.length*3||container.querySelectorAll('[data-qualification]').length!==33)throw Error('Lost/duplicate/orphan source owner or qualification');
  const groups=[...container.querySelectorAll('[data-group]')];if(groups.length!==data.groups.length||groups.some((g,i)=>g.dataset.group!==data.groups[i].id||g.id!=='group-'+data.groups[i].id))throw Error('Group scope/order drift');
  for(const [i,r] of rows.entries()){
   const u=r.u;if(installed[i]!==r.el||r.el.id!==u.anchor||r.el.dataset.unit!==u.owner||r.el.dataset.index!==u.owner||r.el.dataset.sourceIndex!==String(u.source_index)||r.el.dataset.position!==String(u.array_position)||r.el.closest('[data-group]')!==r.group||r.group.dataset.group!==u.group)throw Error('Owner/group/index spoof');
   const fields=[...r.el.querySelectorAll('[data-source-field]')];if(fields.length!==3||fields.some((el,j)=>el!==r.fields[j]))throw Error('Unknown/replaced source field');
   for(const [j,f] of ['he','he_nikud','en'].entries())if(r.fields[j].dataset.sourceField!==f||r.fields[j].textContent!==u[f])throw Error('Source DOM mutation');
   const notes=[...r.el.querySelectorAll('[data-qualification]')];if(notes.length!==r.notes.length||notes.length!==u.qualifications.length)throw Error('Lost qualification');
   notes.forEach((el,j)=>{const q=u.qualifications[j];if(el!==r.notes[j]||el.dataset.qualification!==q.id||el.dataset.owner!==u.owner||el.dataset.ordinal!==String(j)||el.textContent!==q.text)throw Error('Qualification ownership mutation');});
  }
  return true;
 }
 Object.defineProperty(window,'QualifiedWrapupIntegrityReady',{configurable:false,writable:false,value:()=>{try{return assertDOM();}catch(_){return false;}}});
 function visible(el){if(!el?.isConnected||!el.getClientRects().length)return false;const box=el.getBoundingClientRect();if(box.width<=0||box.height<=0)return false;for(let n=el;n;n=n.parentElement){const c=getComputedStyle(n);if(n.hidden||c.display==='none'||c.visibility!=='visible'||Number(c.opacity)<1||c.contentVisibility==='hidden'||c.clipPath!=='none'||(c.clip&&c.clip!=='auto')||c.filter!=='none'||c.transform!=='none')return false;if(/hidden|clip/.test(c.overflowX+' '+c.overflowY)){const r=n.getBoundingClientRect();if(box.left<r.left-1||box.right>r.right+1||box.top<r.top-1||box.bottom>r.bottom+1)return false;}if(n.tagName==='DETAILS'&&!n.open&&!n.querySelector('summary')?.contains(el))return false;}return true;}
 function printInk(note){
  if(!visible(note)||note.children.length||[...note.childNodes].some(n=>n.nodeType!==Node.TEXT_NODE))return false;
  const c=getComputedStyle(note);if(c.color!=='rgb(0, 0, 0)'||c.webkitTextFillColor!=='rgb(0, 0, 0)'||parseFloat(c.fontSize)<12||parseFloat(c.fontSize)>24||c.textIndent!=='0px'||c.letterSpacing!=='normal'||c.wordSpacing!=='0px')return false;
  let paper=false;
  for(let n=note;n;n=n.parentElement){const s=getComputedStyle(n),bg=s.backgroundColor;
   if(!paper&&bg!=='rgba(0, 0, 0, 0)'){const rgb=/^rgb\((\d+), (\d+), (\d+)\)$/.exec(bg);if(!rgb||rgb.slice(1).some(v=>Number(v)<245))return false;paper=true;}
   if(s.backgroundImage!=='none'||s.maskImage!=='none'||s.mixBlendMode!=='normal'||s.backdropFilter!=='none'||s.textShadow!=='none'||s.webkitTextStrokeWidth!=='0px'||s.animationName!=='none'||s.zoom!=='1'||!['static','relative'].includes(s.position))return false;
   for(const pseudo of ['::before','::after'])if(!['none','normal'].includes(getComputedStyle(n,pseudo).content))return false;
  }
  const box=note.getBoundingClientRect();let words=0;
  // Trailing pre-wrap whitespace can extend past the box without lost ink.
  for(const node of note.childNodes)for(const word of node.textContent.matchAll(/\S+/gu)){const range=document.createRange();range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);const rects=[...range.getClientRects()];if(!rects.length||rects.some(r=>r.width<=0||r.height<=0||r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1))return false;words++;}
  return paper&&words>0;
 }

 function sourceSelection(){const sel=getSelection();if(!sel||sel.isCollapsed)return false;try{for(let i=0;i<sel.rangeCount;i++)if(sel.getRangeAt(i).intersectsNode(container))return true;return container.contains(sel.anchorNode)||container.contains(sel.focusNode);}catch(_){return true;}}
 function selectionOwners(){
  assertDOM();const sel=getSelection();if(!sel||sel.isCollapsed||sel.rangeCount!==1)throw Error('Choose one visible source range');const range=sel.getRangeAt(0);
  const fieldAt=node=>{const el=node?.nodeType===Node.ELEMENT_NODE?node:node?.parentElement;return rows.flatMap(r=>r.fields).find(f=>f.contains(node)&&visible(f)&&visible(el));};
  if(!fieldAt(range.startContainer)||!fieldAt(range.endContainer))throw Error('Selection endpoints must be visible source fields');
  const selected=rows.filter(r=>r.fields.some(f=>visible(f)&&range.intersectsNode(f)));if(!selected.length)throw Error('No authenticated source intersection');return selected.map(r=>r.u.owner);
 }
 function updateSelection(){let owners=null;try{owners=selectionOwners();}catch(_){}document.querySelectorAll('.selection-popup .sel-btn').forEach(b=>b.disabled=!owners);const status=container.querySelector('[data-qualified-selection-status]');if(status)status.textContent=owners?'Exports include complete owned source bodies and every required qualification for '+owners.join(', ')+'.':'Select visible source text with authenticated endpoints. Qualified selection exports are unavailable for hidden, interface, archive or stale ranges.';}
 document.addEventListener('selectionchange',updateSelection);document.addEventListener('mousedown',e=>{if(e.target.closest('.selection-popup .sel-btn'))e.preventDefault();},true);
 function search(){
  const q=container.querySelector('[data-reader-query]').value;let found=0;
  for(const r of rows)for(const [i,f] of ['he','he_nikud','en'].entries()){
   const text=r.u[f],frag=document.createDocumentFragment();let cursor=0;
   for(const [a,b] of ranges(text,q)){frag.append(document.createTextNode(text.slice(cursor,a)));const mark=document.createElement('mark');mark.textContent=text.slice(a,b);frag.append(mark);cursor=b;found++;}frag.append(document.createTextNode(text.slice(cursor)));r.fields[i].replaceChildren(frag);
  }
  container.querySelector('[data-search-status]').textContent=found+' exact-source matches';assertDOM();
 }
 function paint(){container.dataset.mode=mode;container.dataset.witness=witness;container.querySelectorAll('[data-q-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.qMode===mode)));container.querySelectorAll('[data-q-witness]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.qWitness===witness)));updateSelection();}
 async function save(payload){
  const id='qualified-wrapup-'+await sha(new TextEncoder().encode(stable([PIN,payload.owners,payload.content])));assertDOM();
  const commit=()=>{assertDOM();const key='ajew-my-sefer',before=localStorage.getItem(key);const existing=before===null?[]:JSON.parse(before).sections;if(!Array.isArray(existing))throw Error('Invalid legacy collection');
   const prior=existing.filter(s=>s.id===id);if(prior.length>1)throw Error('Ambiguous save identity');
   const entry={id,title:data.title+' — '+payload.owners.join(', '),content:payload.content,source:location.origin+ROUTE,addedAt:prior[0]?.addedAt||new Date().toISOString(),qualifiedFullBody:payload};
   const next=appendLegacyCollection(before,entry);if(localStorage.getItem(key)!==before)throw Error('Collection changed; retry');localStorage.setItem(key,next);if(localStorage.getItem(key)!==next)throw Error('Save verification failed');};
  if(navigator.locks)await navigator.locks.request('ajew-my-sefer',{mode:'exclusive'},commit);else commit();
 }
 async function act(action,owners){
  try{assertDOM();const payload=fullBodyPayload(data,owners);
   if(action==='save'){await save(payload);say('Saved full source bodies and required qualifications; personal note remains separate.');}
   else if(action==='share'&&navigator.share){assertDOM();await navigator.share({title:data.title,text:payload.content,url:location.origin+ROUTE});say('Shared qualified full bodies.');}
   else if(action==='copy'||action==='share'){assertDOM();await navigator.clipboard.writeText(payload.content);say('Copied qualified full bodies.');}
   else throw Error('Unrecognized outward control');
  }catch(e){say('Qualified outward action blocked: '+e.message);}
 }
 function disableHighlight(){const menu=document.querySelector('#highlight-context-menu');if(!menu)return;for(const b of menu.querySelectorAll('.hl-action'))if(['share','save'].includes(b.dataset.action)){b.disabled=true;b.title='Captured highlight outward Save/Share blocked; use authenticated ordinary source selection.';}if(!menu.querySelector('.qualified-highlight-status')){const p=document.createElement('p');p.className='qualified-highlight-status';p.setAttribute('role','status');p.textContent='Captured highlight Save/Share blocked. Use ordinary qualified selection. Personal Note/Prayer remain available.';menu.append(p);}}
 const highlightObserver=new MutationObserver(disableHighlight);highlightObserver.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('pagehide',()=>highlightObserver.disconnect(),{once:true});
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.qMode){e.preventDefault();mode=b.dataset.qMode;paint();return;}
  if(b.dataset.qWitness){e.preventDefault();witness=b.dataset.qWitness;paint();return;}
  if(!b.matches(OUTWARD))return;
  if(b.closest('#highlight-context-menu')&&['note','pray'].includes(b.dataset.action))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(b.closest('#highlight-context-menu')||b.matches('.notes-panel-btn')||b.matches('.ajew-segment-action-btn')){say('Qualified outward action blocked: inherited or captured identity is not authenticated. Use the qualified controls.');return;}
  try{assertDOM();if(b.id==='btn-print'){window.print();return;}
   let action=b.dataset.qAction;if(!action)action=b.closest('.selection-popup')?{copy:'copy',share:'share',mysefer:'save'}[b.dataset.action]:b.matches('#btn-add-sefer,.seg-add-sefer-btn')?'save':b.matches('.seg-copy-btn')?'copy':b.id==='btn-share'?'share':null;
   const row=rows.find(r=>r.el===b.closest('[data-unit]'));const owners=b.closest('.selection-popup')?selectionOwners():row?[row.u.owner]:data.units.map(u=>u.owner);
   if(!action)throw Error('Unknown inherited outward action');void act(action,owners);
  }catch(err){say('Qualified outward action blocked: '+err.message);}
 },true);
 document.addEventListener('copy',e=>{if(!sourceSelection())return;e.preventDefault();e.stopImmediatePropagation();try{const owners=selectionOwners();e.clipboardData.setData('text/plain',fullBodyPayload(data,owners).content);say('Source selection copied as complete owned source bodies with required qualifications.');}catch(err){say('Qualified selection copy blocked: '+err.message);}},true);
 function printGate(){container.dataset.printSafe='false';try{assertDOM();if(!matchMedia('print').matches)throw Error('Print media pending');container.dataset.printSafe='true';for(const r of rows)for(const note of r.notes)if(!printInk(note))throw Error('Required qualification paint untrusted');container.dataset.printSafe='true';}catch(e){container.dataset.printSafe='false';say('Qualified print blocked: '+e.message);}}
 window.addEventListener('beforeprint',printGate);matchMedia('print').addEventListener('change',e=>{if(e.matches)printGate();else container.dataset.printSafe='false';});window.addEventListener('afterprint',()=>container.dataset.printSafe='false');
 (async()=>{try{
  const res=await fetch(ASSET,{cache:'no-store'}),bytes=await res.arrayBuffer();if(!res.ok||await sha(bytes)!==PIN)throw Error('Current projection authentication failed');data=JSON.parse(new TextDecoder().decode(bytes));const loaded={};
  for(const a of data.assets){const r=await fetch(a.url,{cache:'no-store'}),b=await r.arrayBuffer();if(!r.ok||b.byteLength!==a.bytes||await sha(b)!==a.sha256)throw Error('Missing/changed bound source: '+a.name);if(a.name.endsWith('.json'))loaded[a.name]=JSON.parse(new TextDecoder().decode(b));}
  validateProjection(data,loaded);
  rows=[...container.querySelectorAll('[data-unit]')].map((el,i)=>({el,u:data.units[i],group:el.closest('[data-group]'),fields:[...el.querySelectorAll('[data-source-field]')],notes:[...el.querySelectorAll('[data-qualification]')]}));
  ready=true;assertDOM();paint();container.querySelector('[data-reader-query]').addEventListener('input',search);say('Exact current saved sources authenticated; 41 original owners and 33 required qualifications.');container.dataset.sourceExactReady='true';
  const query=new URLSearchParams(location.search).get('q');if(query){container.querySelector('[data-reader-query]').value=query;search();}
 }catch(e){ready=false;failure=e.message;container.dataset.sourceExactReady='false';say('Qualified export disabled: '+failure);}})();
}
