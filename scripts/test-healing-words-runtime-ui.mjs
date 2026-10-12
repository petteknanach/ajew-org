import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Portable source contract and full-inline-init mechanics, not native paint proof.
const source = readFileSync(process.env.HW_SOURCE || new URL('../src/pages/healing-words.astro', import.meta.url), 'utf8');
const journeys = JSON.parse(readFileSync(new URL('../public/healing-words.json', import.meta.url), 'utf8')).journeys;
const script = source.match(/<script is:inline define:vars[^>]*>([\s\S]*?)<\/script>/)[1];
const css = source.match(/<style>([\s\S]*?)<\/style>/)[1];
const roles = ['hw-detail-icon','hw-detail-title-he','hw-detail-title-en','hw-detail-desc','hw-share-btn','hw-step','hw-step--done','hw-step-header','hw-step-check','hw-step-num','hw-step-info','hw-step-title','hw-step-desc','hw-step-snippet','hw-snippet-he','hw-snippet-en','hw-step-link'];
function fixture(hash = '', items = journeys) {
  const nodes = new Map(), store = new Map(), events = new Map(), scrolls = [], historyCalls = [];
  const document = { activeElement: null };
  function node(id = '', dataset = {}) {
    const e = { id, dataset, hidden: false, style: {}, attrs: {}, children: [], listeners: {}, className: '', textContent: '', html: '', focusOptions: null,
      setAttribute(k,v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] ?? null; },
      addEventListener(k,fn) { this.listeners[k] = fn; }, focus(options) { document.activeElement = this; this.focusOptions = options; },
      appendChild(c) { c.parent = this; this.children.push(c); },
      querySelector(sel) { return this.bar; }, closest(sel) { return sel === '.hw-step' ? this.parent : this; },
      classList: { toggle(k,on) { e.className = on ? `hw-step ${k}` : 'hw-step'; } },
    };
    Object.defineProperty(e,'innerHTML',{get(){return this.html;},set(v){this.html=v;this.children=[];}});
    if (id) nodes.set(id,e); return e;
  }
  for (const id of ['journeyGrid','journeyDetail','backToGrid','journeyHeader','stepsList','journeyProgressFill','journeyProgressText']) node(id);
  nodes.get('journeyDetail').hidden = true;
  const cards = items.map(j => { const e=node('',{journey:j.id});e.setAttribute('aria-expanded','false');e.bar=node();return e; });
  document.getElementById = id => nodes.get(id);
  document.createElement = () => node();
  document.querySelectorAll = sel => sel === '.hw-card' ? cards : [];
  document.querySelector = sel => sel.startsWith('[data-journey-progress=') ? cards.find(c => sel.includes(c.dataset.journey)) : sel.startsWith('.hw-card[') ? cards.find(c => sel.includes(c.dataset.journey)) : null;
  const window = { location: { hash, origin:'https://example.test' }, scrollTo(v) {scrolls.push(v);}, addEventListener(k,fn) {events.set(k,fn);} };
  const history = { replaceState(a,b,url) { historyCalls.push(url);window.location.hash=url.includes('#')?'#'+url.split('#')[1]:''; } };
  const context = vm.createContext({ document, window, history, localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}, journeysJSON:JSON.stringify(items), navigator:{clipboard:{writeText:()=>Promise.resolve()}}, setTimeout:()=>0, prompt:()=>{} });
  vm.runInContext(script,context,{timeout:1000,filename:fileURLToPath(new URL('../src/pages/healing-words.astro',import.meta.url))});
  return {nodes,cards,document,window,store,scrolls,historyCalls,events,open(i){cards[i].listeners.click();},back(){nodes.get('backToGrid').listeners.click();},toggle(i,s){const li=nodes.get('stepsList').children[s],btn=node('',{j:items[i].id,s:String(s)});btn.parent=li;nodes.get('stepsList').listeners.click({target:btn});return btn;} };
}
test('HW-01 route grid respects hidden without global resets',()=>{
  assert.match(css,/\.hw-grid\[hidden\]\s*\{\s*display:\s*none\s*;/);
  assert.doesNotMatch(css,/\[hidden\][^{]*\{[^}]*!important/);
});
test('HW-02 every generated role has root-bounded unscoped descendants',()=>{
  for (const role of roles) assert.ok(css.includes(`.hw-page :global(.${role})`),role);
  assert.doesNotMatch(source,/<style\s+is:global|data-astro-cid-/);
  const selectors=css.match(/[^{}]+(?=\{)/g).filter(s=>roles.some(r=>new RegExp(`\\.${r}(?![\\w-])`).test(s)));
  for(const group of selectors) for(const sel of group.split(',')) if(roles.some(r=>new RegExp(`\\.${r}(?![\\w-])`).test(sel))) assert.match(sel,/\.hw-page\s+:global\(/,sel);
});
test('HW-03 day count badge retains palette with readable foreground',()=>{
  const body=css.match(/\.hw-card-steps\s*\{([^}]+)\}/)[1];
  const hex=body.match(/color:\s*(#[0-9a-f]{6})/i)[1];
  const rgb=h=>h.match(/\w\w/g).map(x=>parseInt(x,16));
  const lum=c=>c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
  for(const h of ['fdf8f0','f9f0e3']) {const bg=rgb(h).map((x,i)=>x*.85+rgb('c9a87c')[i]*.15);assert.ok((lum(bg)+.05)/(lum(rgb(hex.slice(1)))+.05)>=4.5,hex);}
  assert.match(css,/:global\(body.dark-mode\) \.hw-card-steps \{ background: rgba\(201, 168, 124, 0.1\); color: #c9a87c; \}/);
});
test('HW-04 original progress text is not clipped by bar',()=>{
  assert.match(css.match(/\.hw-journey-progress-bar\s*\{([^}]+)\}/)[1],/overflow:\s*visible/);
  const f=fixture();f.open(0);f.toggle(0,0);
  assert.equal(f.nodes.get('journeyProgressText').textContent,`1 / ${journeys[0].steps.length} completed (${Math.round(100/journeys[0].steps.length)}%)`);
});
test('HW-05 truthful card relation, open/back focus and all journey source order',()=>{
  assert.match(source,/aria-controls="journeyDetail"/);
  const f=fixture();
  for(let i=0;i<journeys.length;i++) {
    f.open(i);const j=journeys[i];assert.equal(f.nodes.get('journeyGrid').hidden,true);assert.equal(f.nodes.get('journeyDetail').hidden,false);
    assert.equal(f.cards[i].getAttribute('aria-expanded'),'true');assert.equal(f.cards.filter(c=>c.getAttribute('aria-expanded')==='true').length,1);
    assert.equal(f.document.activeElement,f.nodes.get('backToGrid'));assert.equal(f.document.activeElement.focusOptions.preventScroll,true);
    assert.equal(f.nodes.get('stepsList').children.length,j.steps.length);
    j.steps.forEach((s,n)=>{const html=f.nodes.get('stepsList').children[n].innerHTML;for(const value of [s.title,s.description,s.snippet_he,s.snippet_en,s.reader_url]) assert.ok(html.includes(value));});
    f.back();assert.equal(f.cards[i].getAttribute('aria-expanded'),'false');assert.equal(f.document.activeElement,f.cards[i]);assert.equal(f.nodes.get('journeyGrid').hidden,false);assert.equal(f.nodes.get('journeyDetail').hidden,true);
  }
  assert.ok(f.scrolls.every(s=>s.top===0&&s.behavior==='smooth'));
});
test('full initialization hash/popstate, progress toggle/revert and unknown IDs',()=>{
  const f=fixture('#'+journeys.at(-1).id);assert.equal(f.nodes.get('stepsList').children.length,journeys.at(-1).steps.length);
  f.back();f.open(0);const a=f.toggle(0,0);assert.equal(a.getAttribute('aria-label'),'Mark incomplete');const b=f.toggle(0,0);assert.equal(b.getAttribute('aria-label'),'Mark complete');
  assert.equal(JSON.parse(f.store.get('hw-progress'))[journeys[0].id][0],false);
  f.window.location.hash='';f.events.get('popstate')();assert.equal(f.nodes.get('journeyDetail').hidden,true);
  const bad=fixture('#not-a-journey');assert.equal(bad.nodes.get('journeyDetail').hidden,true);
});
test('small generic fixture accepts quoted titles and empty progress storage',()=>{
  const f=fixture('',[{id:'sample',title:"A 'quoted' title",hebrewTitle:'אב',icon:'★',description:'Description',steps:[{title:'Title',description:'Detail',snippet_he:'אב',snippet_en:'Text',reader_url:'/reader/sample'}]}]);
  f.open(0);assert.ok(f.nodes.get('journeyHeader').innerHTML.includes("A 'quoted' title"));f.toggle(0,0);f.toggle(0,0);f.back();assert.equal(f.nodes.get('journeyDetail').hidden,true);
});

test('HW-06 measured ordinary-text roles satisfy contrast across preserved backgrounds',()=>{
  const rgb=h=>h.replace('#','').match(/../g).map(x=>parseInt(x,16));
  const lum=c=>c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const roleBody=role=>css.match(new RegExp('(?:\\.hw-page :global\\(\\.'+role+'\\)|\\.'+role+')\\s*\\{([^}]+)\\}'))[1];
  const foreground=body=>rgb(body.match(/color:\s*(#[0-9a-f]{6}|white)\s*;/i)[1].replace('white','#ffffff'));
  const numberBody=roleBody('hw-step-num'); const numberForeground=foreground(numberBody);
  const background=numberBody.match(/background:\s*(#[0-9a-f]{6})\s*;/i);
  const numberBackgrounds=background?[background[1]]:[...numberBody.matchAll(/#[0-9a-f]{6}/ig)].slice(0,2).map(m=>m[0]);
  assert.ok(numberBackgrounds.length); for(const bg of numberBackgrounds) assert.ok(ratio(numberForeground,rgb(bg))>=4.5,'ordinal '+bg);
  for(const bg of ['#8bb86a','#6b8f4a']) assert.ok(ratio(numberForeground,rgb(bg))>=4.5,'done ordinal '+bg);
  for(const role of ['hw-card-title-en','hw-step-link','hw-journey-progress-text']) for(const bg of ['#fdf8f0','#f9f0e3','#f0f7e9','#e8f0dd','#fffdf7']) assert.ok(ratio(foreground(roleBody(role)),rgb(bg))>=4.5,role+bg);
  assert.match(css,/:global\(body:not\(\.dark-mode\)\) \.hw-page \.hw-subtitle span \{ color: #[0-9a-f]{6}; \}/i);
  const subtitle=rgb(css.match(/\.hw-subtitle span \{ color: (#[0-9a-f]{6}); \}/i)[1]);const base=rgb('#fffdf7'); assert.ok(ratio(subtitle.map((c,i)=>c*.8+base[i]*.2),base)>=4.5,'original subtitle opacity');
});
