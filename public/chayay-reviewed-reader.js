/* Route-local integrity successor v4. Source witnesses and shared consumers are immutable. */
(function () {
  'use strict';
  if (!/^\/reader\/chayey-moharan\/reviewed\/14-58\/?$/.test(location.pathname)) return;
  // Install the source-exact paint hook before the shared Reader's initial paint.
  // Pre-auth text is readable, but no outward payload is exposed until raw SHA auth.
  const boot=[...document.querySelectorAll('[data-reviewed-chayay] [data-field="he"]')].map(he=>({he,bare:he.getAttribute('data-bare'),pointed:he.getAttribute('data-nikud')}));
  window.AjewReaderEdition={edition:()=> 'reviewed-14-58',label:()=> 'AI-reviewed / editorially qualified Simanim 14–58',paint:state=>boot.forEach(r=>{r.he.textContent=state.nikud?r.pointed:r.bare;}),segmentText:()=>''};
  document.addEventListener('ajew-reader-ready', async function () {
    const api = window.AjewReader;
    const container = document.querySelector('[data-reviewed-chayay="14-58"]');
    if (!api || !container) return;
    try {
    // Authenticate raw bytes before trusting ANY DOM, including initial ownership.
    const pin='2f03be4727a8902da34f3a65bf3158cf93bd4fc5fb92a5c1cca8a2cae09daca4';
    const response=await fetch('/reader/chayey-moharan/reviewed/14-58.json',{cache:'no-store'});
    if(!response.ok || !crypto.subtle?.digest)throw Error('Source authentication unavailable');
    const bytes=await response.arrayBuffer();
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==pin)throw Error('Source authentication failed');
    const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
    const source=freeze(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const rows=source.nodes.map(n=>{
      const pair=container.querySelector('#seg-'+n.actual_index);
      if(!pair)throw Error('Missing source row');
      const fields=Object.fromEntries([...pair.querySelectorAll('[data-field]')].map(e=>[e.dataset.field,e]));
      const bindings={selected:n.selected_binding,baseline:n.baseline_binding,displaced:n.displaced_english.pointer,displaced_sha256:n.displaced_english.sha256,original_array_position_0:n.array_position_0,actual_index:n.actual_index,source_chapter_id:n.source_chapter_id};
      return {pair,he:fields.he,bare:n.selected.he,pointed:n.selected.he_nikud,node:n,fields,bindings,group:pair.closest('[data-siman]'),qualifications:[...pair.querySelectorAll('[data-qualification]')],notes:source.required_qualification_occurrences.filter(q=>q.owner_unit_id===n.unit_id)};
    });
    function sourceFields(row) {
      const n=row.node,r=n.selected;
      return {owner:n.unit_id,he:r.he,he_nikud:r.he_nikud,en:r.en,translationProvenance:r.translationProvenance,translationSourceEnglish:r.translationSourceEnglish,earlierUnalignedImport:n.displaced_english.text,bindings:row.bindings};
    }
    const qualification = row => 'AI-reviewed / editorially qualified — '+row.node.unit_id+'\n'+sourceFields(row).translationProvenance;
    function validRow(row) {
      const {pair,he,node:n,fields:f,group,notes,qualifications:qs}=row;
      if(!pair.isConnected || !container.contains(pair) || pair.id!=='seg-'+n.actual_index || pair.dataset.unit!==n.unit_id || !group?.isConnected || pair.closest('[data-siman]')!==group || group.dataset.siman!==String(n.siman) || group.id!=='siman-'+n.siman)return false;
      if(!he || he.getAttribute('data-bare')!==n.selected.he || he.getAttribute('data-nikud')!==n.selected.he_nikud)return false;
      const live=[...pair.querySelectorAll('[data-field]')];
      const keys=['he','en','translationProvenance','displaced_en','bindings',...('translationSourceEnglish' in n.selected?['translationSourceEnglish']:[])];
      if(!same(Object.keys(f).sort(),keys.sort()))return false;
      if(f.he.closest('.segment-he')?.dataset.index!==String(n.actual_index) || f.en.closest('.segment-en')?.dataset.index!==String(n.actual_index))return false;
      if(group.querySelector('h2')?.id!=='siman-heading-'+n.siman || group.querySelector('h2')?.textContent!=='Siman '+n.siman+' #')return false;
      if(pair.querySelector('.reviewed-provenance summary')?.textContent!=='AI review qualifications / provenance — chapter 1, index '+n.actual_index)return false;
      if(live.length!==Object.keys(f).length || live.some(e=>f[e.dataset.field]!==e))return false;
      const state=api.getState();
      if(he.textContent!==(state.nikud?n.selected.he_nikud:n.selected.he))return false;
      for(const key of ['en','translationProvenance','translationSourceEnglish']) {
        if((f[key]?.textContent)!==n.selected[key])return false;
      }
      if(f.displaced_en?.textContent!==n.displaced_english.text || f.displaced_en.dataset.owner!==n.unit_id || !same(JSON.parse(f.bindings.textContent),row.bindings))return false;
      const segments=[...pair.querySelectorAll('.reader-segment')];
      if(segments.length!==2 || segments.some(e=>e.dataset.index!==String(n.actual_index) || e.querySelector('.segment-number')?.textContent!==n.siman+'.'+n.actual_index))return false;
      const actual=[...pair.querySelectorAll('[data-qualification]')];
      if(actual.length!==notes.length || !actual.every((e,i)=>e===qs[i] && e.closest('[data-field]')===f.translationProvenance && e.dataset.qualification===notes[i].source_pointer && e.dataset.owner===notes[i].owner_unit_id && e.dataset.ordinal===String(notes[i].ordinal_0) && e.textContent===notes[i].text))return false;
      return true;
    }
    function integrity(selected=rows) {
      try {
        return window.AjewReader===api && typeof api.getState==='function' && selected.length>0 && container.isConnected && container.dataset.reviewedChayay==='14-58' && container.dataset.book==='chayey-moharan' && container.dataset.torahId==='chayey-moharan-reviewed-14-58' && [...container.querySelectorAll('[data-unit]')].every((p,i)=>p===rows[i]?.pair) && container.querySelectorAll('[data-unit]').length===142 && container.dataset.torahTitle==='Chayay Moharan — AI-reviewed, editorially qualified Simanim 14–58 - Chayey Moharan' && selected.every(validRow) && same(JSON.parse(container.querySelector('#historical-metadata').textContent),source.source_chapter_metadata_verbatim);
      }catch{return false;}
    }
    // The shared Reader can paint pointed text before its ready event.
    // Preserve that exact independent witness, never strip marks to make a gate pass.
    if(rows.length!==142 || container.querySelectorAll('[data-unit]').length!==rows.length || !integrity())throw Error('Initial source/ownership mismatch');
    function segmentText(pair) {
      const row = rows.find(r=>r.pair===pair);
      if (!row || !integrity([row])) return '';
      const f=sourceFields(row),state=api.getState(),result=[];
      if(state.mode!=='english') result.push(state.nikud?f.he_nikud:f.he);
      if(state.mode!=='hebrew') result.push(f.en);
      result.push(qualification(row));
      return result.join('\n\n');
    }
    window.AjewReaderEdition = {
      edition:()=> 'reviewed-14-58', label:()=> 'AI-reviewed / editorially qualified Simanim 14–58',
      paint:state=>rows.forEach(row=>{row.he.textContent=state.nikud?row.pointed:row.bare;}),segmentText
    };
    api.refresh();
    container.dataset.sourceExactReady='true';
    window.ChayayReviewedIntegrity={valid:()=>integrity(),print:()=>integrity() && rows.some(row=>visible(row.he)||visible(row.fields.en)) && rows.every(row=>{
      // Ignore only rows wholly excluded by current PRINT layout, never hidden ink.
      if(!row.pair.getClientRects().length)return true;
      const primary=[row.he,row.fields.en].some(e=>visible(e));
      return primary && printedInk(row.fields.translationProvenance) && row.qualifications.every(printedInk);
    })};
    // Print-only paint gate: text presence/boxes do not prove glyph ink.
    // Fail closed for transparent fill, low/same-background contrast, or
    // unsupported ancestor paint effects; reading/selection policy is unchanged.
    function printedInk(field) {
      if(!visible(field))return false;
      const rgba=value=>{
        const match=/^rgba?\(([^)]+)\)$/.exec(value||'');if(!match)return null;
        const parts=match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if(parts.length===3)parts.push(1);
        return parts.length===4 && parts.every(Number.isFinite) && parts.slice(0,3).every(v=>v>=0&&v<=255) && parts[3]>=0&&parts[3]<=1?parts:null;
      };
      const luminance=color=>color.slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
      const walker=document.createTreeWalker(field,NodeFilter.SHOW_TEXT);let node,seen=false;
      while((node=walker.nextNode())) {
        if(!node.textContent.trim())continue;seen=true;
        const leaf=node.parentElement,chain=[];
        for(let e=leaf;e;e=e.parentElement)chain.push(e);
        let background=[255,255,255,1];
        for(const e of chain.reverse()) {
          const s=getComputedStyle(e),bg=rgba(s.backgroundColor);
          if(!bg || e.hidden || s.display==='none' || s.visibility!=='visible' || Number(s.opacity)!==1 || s.backgroundImage!=='none' || s.filter!=='none' || (s.backdropFilter&&s.backdropFilter!=='none') || s.mixBlendMode!=='normal' || (s.maskImage&&s.maskImage!=='none') || (s.clipPath&&s.clipPath!=='none') || s.transform!=='none')return false;
          background=background.map((v,i)=>i<3?bg[i]*bg[3]+v*(1-bg[3]):1);
        }
        const s=getComputedStyle(leaf),color=rgba(s.color),fill=rgba(s.webkitTextFillColor||s.color);
        if(!leaf.getClientRects().length || parseFloat(s.fontSize)<1 || !color || !fill || color[3]!==1 || fill[3]!==1)return false;
        const b=luminance(background);
        if([color,fill].some(ink=>{const f=luminance(ink);return (Math.max(f,b)+0.05)/(Math.min(f,b)+0.05)<4.5;}))return false;
      }
      return seen;
    }
    document.dispatchEvent(new Event('chayay-integrity-ready'));
    const editionIdentity='chayay-reviewed-14-58:2f03be4727a8902da34f3a65bf3158cf93bd4fc5fb92a5c1cca8a2cae09daca4';
    const warning='AI-reviewed / editorially qualified; not human-approved or an authenticated complete original translation.';
    function url(selected) { return location.origin+'/reader/chayey-moharan/reviewed/14-58/'+(selected.length===1?'#seg-'+selected[0].node.actual_index:''); }
    function whole(selected) {
      return selected.map(row=>{const f=sourceFields(row);return f.owner+'\nHebrew — supplied unpointed witness\n'+f.he+'\n\nHebrew — supplied pointed witness\n'+f.he_nikud+'\n\nSelected English\n'+f.en+'\n\n'+qualification(row);}).join('\n\n');
    }
    const primaryFields=new Set(rows.flatMap(row=>[row.he,row.fields.en]));
    function visible(field) {
      if(!field?.isConnected || !field.getClientRects().length) return false;
      for(let e=field;e;e=e.parentElement) {
        const s=getComputedStyle(e);
        if(e.hidden || s.display==='none' || s.visibility==='hidden' || s.visibility==='collapse' || s.opacity==='0') return false;
      }
      return true;
    }
    function fieldAt(node) {
      const element=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
      const field=element?.closest('.reader-segment [data-field]');
      if(!primaryFields.has(field)) return null;
      const row=rows.find(r=>r.pair.contains(field));
      if(!row || !visible(field)) return null;
      if(!integrity([row]))return null;
      return field;
    }
    // Resolve DOM ownership, not the anchor's guessed segment or raw selection string.
    // A spanning range includes UI/disclosure text; export only its primary-source
    // intersections, visibly disclosed below. Outside-source endpoints are unsafe.
    function selectionPayload() {
      const sel=getSelection();
      if(!sel || sel.isCollapsed || sel.rangeCount!==1) return null;
      const range=sel.getRangeAt(0);
      if(!fieldAt(range.startContainer)||!fieldAt(range.endContainer)) return null;
      const blocks=[],selected=[],identity=[];
      for(const row of rows) {
        const excerpts=[];
        for(const field of row.pair.querySelectorAll('.reader-segment [data-field]')) {
          if(!range.intersectsNode(field) || !visible(field)) continue;
          if(!fieldAt(field)) return null;
          const part=document.createRange();part.selectNodeContents(field);
          if(range.compareBoundaryPoints(Range.START_TO_START,part)>0) part.setStart(range.startContainer,range.startOffset);
          if(range.compareBoundaryPoints(Range.END_TO_END,part)<0) part.setEnd(range.endContainer,range.endOffset);
          const text=part.toString();if(!text) continue;
          const prefix=document.createRange();prefix.selectNodeContents(field);prefix.setEnd(part.startContainer,part.startOffset);
          const fieldName=field.dataset.field==='he'?(api.getState().nikud?'he_nikud':'he'):'en';
          excerpts.push(fieldName+' excerpt\n'+text);
          identity.push([row.pair.dataset.unit,fieldName,prefix.toString().length,text]);
        }
        if(excerpts.length) {selected.push(row);blocks.push(excerpts.join('\n\n')+'\n\n'+qualification(row));}
      }
      if(!selected.length) return null;
      return {selected,identity,content:'Source selection (primary Hebrew/English intersections only; interface and comparison fields excluded).\n\n'+blocks.join('\n\n')};
    }
    const popup=document.querySelector('.selection-popup');
    let status;
    if(popup) {
      status=document.createElement('span');status.className='reviewed-export-status';status.setAttribute('role','status');status.style.cssText='display:block;max-width:260px;padding:6px;font:12px/1.4 system-ui';popup.append(status);
    }
    function updateSelection() {
      if(!popup) return;
      const valid=selectionPayload();
      popup.querySelectorAll('.sel-btn').forEach(b=>{b.disabled=!valid;b.title=valid?'Qualified source export':'Export unavailable: selection endpoints must be in primary Hebrew or English source text.';});
      status.textContent=valid?'Exports include selected primary-source text and complete qualifications for '+valid.selected.map(r=>r.pair.dataset.unit).join(', ')+'. Interface/comparison text is excluded.':'Source selection remains available. Qualified export unavailable: select endpoints within primary Hebrew or English text.';
    }
    // The frozen v2 family is installed independently of the selection popup.
    // Bind each newly-created menu to its live range, never v2's captured string.
    // Only its outward Share action is changed; Save/Note/Prayer remain native.
    const highlightMenus=new WeakMap();
    function rangeStamp() {
      const s=getSelection();if(!s || s.isCollapsed || s.rangeCount!==1)return null;
      const r=s.getRangeAt(0);
      return [r.startContainer,r.startOffset,r.endContainer,r.endOffset];
    }
    function highlightPayload(menu) {
      const record=highlightMenus.get(menu),stamp=rangeStamp(),payload=selectionPayload();
      if(!record || !stamp || !payload || !record.stamp || !stamp.every((v,i)=>v===record.stamp[i]) || !same(payload.identity,record.identity) || payload.content!==record.content)return null;
      return payload;
    }
    function updateHighlight(menu) {
      if(!menu)return;
      if(!highlightMenus.has(menu)) {
        // Keep the actual Share control clear of the inherited commentary handle
        // (z-index 1099/1100), without changing any shared styles or consumers.
        menu.style.zIndex='1101';
        const p=selectionPayload();
        highlightMenus.set(menu,{stamp:rangeStamp(),identity:p?.identity,content:p?.content});
        const note=document.createElement('span');note.className='reviewed-highlight-status';note.setAttribute('role','status');note.style.cssText='display:block;max-width:240px;font:12px/1.4 system-ui';menu.append(note);
      }
      const valid=highlightPayload(menu),button=menu.querySelector('.hl-action[data-action="share"]');
      if(!button)return;
      button.disabled=!valid;button.title=valid?'Share exact source excerpts with complete per-owner qualifications':'Share unavailable: stale or unsafe selection. Reselect primary Hebrew/English and use qualified Copy/Share.';
      const note=menu.querySelector('.reviewed-highlight-status');
      const message=valid?'Qualified Share includes complete provenance for '+valid.selected.map(r=>r.pair.dataset.unit).join(', ')+'.':'Share unavailable: stale or unsafe range. Reselect primary Hebrew/English; use qualified Copy/Share.';
      if(note.textContent!==message)note.textContent=message;
    }
    const refreshHighlight=()=>updateHighlight(document.getElementById('highlight-context-menu'));
    new MutationObserver(refreshHighlight).observe(document.body,{childList:true});
    const refreshOutward=()=>{updateSelection();refreshHighlight();
      const notice=document.getElementById('chayay-integrity-warning'),sourceValid=integrity();
      const message=sourceValid?'Authenticated source ownership. Qualified exports include complete per-owner provenance.':'Qualified export unavailable: source authentication or ownership changed. Reading and local highlights remain available.';
      if(notice&&notice.textContent!==message)notice.textContent=message;
      container.querySelectorAll('.seg-copy-btn,.ajew-segment-action-btn,#btn-share,#btn-add-sefer').forEach(b=>{
        const pair=b.closest('[data-unit]'),selected=pair?rows.filter(r=>r.pair===pair):rows;
        const invalid=!sourceValid || !selected.length;if(b.disabled!==invalid)b.disabled=invalid;
        if(invalid)b.title='Export unavailable: source identity or required qualifications changed.';
      });
    };
    new MutationObserver(refreshOutward).observe(container,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','style','class','open','id','data-unit','data-owner','data-index','data-field','data-bare','data-nikud','data-qualification','data-ordinal','data-siman','data-reviewed-chayay','data-book','data-torah-id','data-torah-title']});
    document.addEventListener('selectionchange',()=>{updateSelection();refreshHighlight();});
    document.addEventListener('mouseup',()=>setTimeout(updateSelection,20));
    document.addEventListener('mousedown',e=>{if(e.target.closest('.selection-popup,#highlight-context-menu .hl-action[data-action="share"]'))e.preventDefault();},true);
    const feedbackState=new WeakMap();
    function feedback(button,text) {
      const record=feedbackState.get(button)||{label:button.textContent};
      clearTimeout(record.timer);button.textContent=text;
      record.timer=setTimeout(()=>{button.textContent=record.label;},1500);feedbackState.set(button,record);
    }
    async function save(payload) {
      const bytes=new TextEncoder().encode(JSON.stringify([editionIdentity,payload.identity]));
      const hash=await crypto.subtle.digest('SHA-256',bytes);
      const key='chayay-v2-'+[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
      const write=()=>{
        if(!integrity(payload.selected))throw Error('Source changed; reselect');
        const storageKey='ajew-my-sefer',before=localStorage.getItem(storageKey);
        const data=before===null?{sections:[]}:JSON.parse(before);
        if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid collection');
        // Missing legacy sections may be added without discarding old passages.
        if(data.sections===undefined)data.sections=[];
        if(!Array.isArray(data.sections))throw Error('Invalid collection');
        const fields=payload.selected.map(sourceFields);
        const expected={title:container.dataset.torahTitle+' — '+fields.map(f=>f.owner).join(', '),content:warning+'\n\n'+payload.content+'\n\nSource: '+url(payload.selected),source:url(payload.selected),chayayReviewedSources:fields};
        const matches=data.sections.filter(p=>p.id===key);
        if(matches.length) {
          // An injected ID is not proof of ownership. Compare protected values;
          // leave all existing bytes/custom fields untouched, even on conflict.
          const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
          if(matches.length!==1 || (matches[0].chayayReviewedEdition!==undefined && matches[0].chayayReviewedEdition!==editionIdentity) || !Object.keys(expected).every(k=>stable(matches[0][k])===stable(expected[k])))throw Error('Conflicting saved item — not added');
          return 'existing';
        }
        data.sections.push({id:key,...expected,addedAt:new Date().toISOString(),chayayReviewedEdition:editionIdentity});
        if(localStorage.getItem(storageKey)!==before)throw Error('Collection changed; retry');
        const after=JSON.stringify(data);localStorage.setItem(storageKey,after);
        if(localStorage.getItem(storageKey)!==after)throw Error('Collection changed; retry');
        return 'added';
      };
      // Cooperating tabs serialize; no await separates the final fresh read/write.
      return navigator.locks?await navigator.locks.request('ajew-my-sefer',write):write();
    }
    async function exportText(action,payload,button) {
      try {
        if(!integrity(payload.selected))throw Error('Source changed');
        if(action==='save') {feedback(button,(await save(payload))==='existing'?'Already added':'Added!');}
        else if(action==='share'&&navigator.share) await navigator.share({title:container.dataset.torahTitle,text:warning+'\n\n'+payload.content,url:url(payload.selected)});
        else if(navigator.clipboard?.writeText) {await navigator.clipboard.writeText(warning+'\n\n'+payload.content+'\n\n'+url(payload.selected));feedback(button,'Copied!');}
        else feedback(button,'Copy unavailable');
      } catch (error) {feedback(button,action==='save'?(error.message==='Conflicting saved item — not added'?error.message:'Storage unavailable — retry'):'Export unavailable');}
    }
    document.addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button)return;
      const sel=button.closest('.selection-popup')&&button.classList.contains('sel-btn');
      const highlight=button.matches('#highlight-context-menu .hl-action[data-action="share"]');
      const pair=button.closest('[data-unit]');
      let action;
      if(highlight) action='share';
      else if(sel) action={copy:'copy',share:'share',mysefer:'save'}[button.dataset.action];
      else if(button.matches('#btn-add-sefer,.seg-add-sefer-btn'))action='save';
      else if(button.matches('.seg-copy-btn'))action='copy';
      else if(pair&&button.matches('.ajew-segment-action-btn'))action=['share','save','copy'][[...button.parentElement.children].indexOf(button)];
      else if(button.id==='btn-share')action='share';
      if(!action)return;
      e.preventDefault();e.stopImmediatePropagation();
      let payload;
      if(highlight) {
        const menu=button.closest('#highlight-context-menu');payload=highlightPayload(menu);updateHighlight(menu);
        if(!payload)return;
        menu.remove();getSelection().removeAllRanges();if(popup)popup.style.display='none';
      }
      else if(sel) {payload=selectionPayload();updateSelection();if(!payload)return;getSelection().removeAllRanges();popup.style.display='none';}
      else {
        const selected=pair?rows.filter(r=>r.pair===pair):rows;
        if(!integrity(selected)){feedback(button,'Export unavailable');return;}
        payload={selected,identity:['whole',selected.map(r=>r.node.unit_id)],content:action==='save'?whole(selected):selected.map(r=>segmentText(r.pair)).join('\n\n')};
      }
      void exportText(action,payload,button);
    },true);
    refreshOutward();
    }catch(error){
      container.dataset.sourceExactReady='false';
      const status=document.getElementById('chayay-integrity-warning');
      if(status)status.textContent='Qualified export unavailable: source authentication or required ownership failed. Reading remains available.';
    }
  },{once:true});
})();
