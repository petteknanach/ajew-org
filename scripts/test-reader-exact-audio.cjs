'use strict';
// Complete unchanged IIFE executed in a dependency-free DOM adapter. NOT browser/media QA.
// Sources are real configured JSON and captured Archive metadata. Negative cases mutate
// copies explicitly; alternate-edition/literal-name metadata are synthetic unit fixtures.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const base = '24e1a6145fb1417b455471f8848ee8f2970b3d99';
const raw = p => fs.readFileSync(path.join(root,p),'utf8');
const sources = JSON.parse(process.env.AUDIO_PLAYER_REVIEW_SOURCES ? fs.readFileSync(process.env.AUDIO_PLAYER_REVIEW_SOURCES,'utf8') : raw('public/audio-sources.json'));
const metadata = JSON.parse(raw('scripts/fixtures/reader-audio/archive-metadata.json'));
const evidence = JSON.parse(raw('scripts/fixtures/reader-audio/track-0042-source-evidence.json'));
const source = raw('public/audio-player.js');
const voice = 'voice-2018-likutay-moharan';
const alternate = 'kol-hatzadik-likutay-moharan-1';
const literal = 'voice-readings-torahs-rabbeinu';
const tick = () => new Promise(resolve => setImmediate(resolve));
function matches(node, selector) {
  const parsed = /^(\w+)?(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[([\w-]+)(\*=|=)"([^"]*)"\])?$/.exec(selector);
  assert.ok(parsed && parsed[0], `Unsupported fixture selector: ${selector}`);
  const [, tag, id, cls, attr, op, value] = parsed;
  return node.nodeType === 1 && (!tag || node.tagName === tag.toUpperCase()) &&
    (!id || node.id === id) && (!cls || node.className.split(/\s+/).includes(cls)) &&
    (!attr || (op === '*=' ? (node.getAttribute(attr) || '').includes(value) : node.getAttribute(attr) === value));
}
function selectorMatches(node, selector) {
  const parts = selector.trim().split(/\s+/);
  if (!matches(node, parts.pop())) return false;
  let ancestor = node.parentNode;
  while (parts.length) {
    const part = parts.pop();
    while (ancestor && !matches(ancestor, part)) ancestor = ancestor.parentNode;
    if (!ancestor) return false;
    ancestor = ancestor.parentNode;
  }
  return true;
}
class Element {
  constructor(tag, base, text) {
    this.nodeType = tag === '#text' ? 3 : 1;
    this.tagName = tag.toUpperCase(); this.base = base;
    this.children = []; this.parentNode = null; this.attrs = {}; this.listeners = {};
    this.style = {}; this.hidden = false; this.open = false; this.plays = 0;
    this._text = text || ''; this._value = undefined;
    this.classList = {
      add: cls => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), cls])].join(' '); },
      remove: cls => { this.className = this.className.split(/\s+/).filter(c => c !== cls).join(' '); },
      toggle: (cls, on) => { const add = on === undefined ? !this.className.split(/\s+/).includes(cls) : on; this.classList[add ? 'add' : 'remove'](cls); }
    };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.hasOwn(this.attrs, k) ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  get id() { return this.attrs.id || ''; } set id(v) { this.setAttribute('id', v); }
  get className() { return this.attrs.class || ''; } set className(v) { this.setAttribute('class', v); }
  get href() { return new URL(this.attrs.href || '', this.base).href; } set href(v) { this.setAttribute('href', v); }
  get src() { return this.attrs.src ? new URL(this.attrs.src, this.base).href : ''; } set src(v) { this.setAttribute('src', v); }
  get value() { return this._value ?? (this.tagName === 'SELECT' ? (this.children.find(c => c.selected) || this.children[0])?.value || '' : this.attrs.value || ''); }
  set value(v) { this._value = String(v); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.clear(); this._text = String(v); }
  set innerHTML(v) { assert.equal(v, '', 'Unsupported fixture HTML parsing'); this.clear(); }
  clear() { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._text = ''; }
  appendChild(child) { return this.insertBefore(child, null); }
  insertBefore(child, before) {
    if (child.parentNode) child.parentNode.children.splice(child.parentNode.children.indexOf(child), 1);
    const index = before ? this.children.indexOf(before) : this.children.length;
    assert.ok(index >= 0, 'Fixture insertBefore requires an existing child');
    this.children.splice(index, 0, child); child.parentNode = this; return child;
  }
  get nextSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null; }
  querySelectorAll(selector) {
    const result = []; const alternatives = selector.split(',').map(s => s.trim());
    const walk = node => { for (const child of node.children) { if (alternatives.some(s => selectorMatches(child, s))) result.push(child); walk(child); } };
    walk(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let n = this; n; n = n.parentNode) if (selectorMatches(n, selector)) return n; return null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type) {
    const event = { target: this, preventDefault() {}, stopPropagation() {} };
    this[`on${type}`]?.call(this, event);
    (this.listeners[type] || []).forEach(fn => fn.call(this, event));
  }
  pause() { this.paused = true; }
  play() { this.plays++; return this.playFailure ? Promise.reject(this.playFailure) : Promise.resolve(); }
  focus() { this.focused = true; }
  scrollIntoView(options) { this.scrolled = options; }
}

async function boot({book='likutay-moharan', part='1', torah='51', config=sources, meta=metadata, editionMetas={}, saved, code=source, defer=false, loading=false, early=false}={}) {
 const location = new URL(`https://ajew.org/reader/${book}/${part}/${torah}/`);
 const document = new Element('document', location.href); document.title='Full-init DOM fixture';
 document.readyState=loading?'loading':'complete';
 document.createElement = tag => new Element(tag,location.href);
 document.createTextNode = text => new Element('#text',location.href,text);
 document.getElementById = id => document.querySelector(`#${id}`);
 document.head=document.appendChild(document.createElement('head'));
 document.body=document.appendChild(document.createElement('body'));
 const mobile=document.body.appendChild(document.createElement('button'));mobile.id='mobile-audio-btn';
 const fetches=[],pending=[],shares=[],warnings=[];
 const storage=new Map(saved?[[`ajew:audio:edition:${book}`,saved]]:[]);
 const fetch = async url => {
  fetches.push(url);
  if(url.startsWith('/audio-sources.json')) return {ok:true,json:async()=>structuredClone(config)};
  if(url.startsWith('/reader/suno-songs/')) return {ok:true,json:async()=>({entries:[]})};
  const identifier=decodeURIComponent(url.split('/').pop());
  if(defer) return new Promise((resolve,reject)=>pending.push({identifier,reject,resolve:data=>resolve({ok:true,json:async()=>structuredClone(data)})}));
  return {ok:true,json:async()=>structuredClone(editionMetas[identifier] || (identifier===voice?meta:{files:[]}))};
 };
 const context=vm.createContext({document,window:{location,console:{warn:(...a)=>warnings.push(a)},matchMedia:()=>({matches:false})},console:{warn:(...a)=>warnings.push(a)},navigator:{share:async data=>shares.push(data)},fetch,URL,URLSearchParams,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},MutationObserver:class{observe(){}},setTimeout:fn=>{fn();return 1;}});
 vm.runInContext(code,context,{filename:'public/audio-player.js',timeout:1000});
 if(early)context.window.openAjewAudioPlayer();
 if(loading){ assert.deepEqual(fetches,[]);document.readyState='complete';document.fire('DOMContentLoaded');}
 await tick();assert.deepEqual(warnings,[]);
 const wrap=document.getElementById('ajew-audio-player');assert.ok(wrap);
 const r={document,context,wrap,fetches,pending,shares,warnings};
 r.audio=()=>wrap.querySelector('audio');r.status=()=>wrap.querySelector('.ajew-ap-status').textContent;
 r.buttons=()=>wrap.querySelector('.ajew-ap-list').children.filter(n=>n.tagName==='BUTTON');r.selected=()=>r.buttons().findIndex(b=>b.className.split(' ').includes('active'));
 r.open=()=>context.window.openAjewAudioPlayer();
 r.change=async id=>{const s=wrap.querySelector('select');const o=s.children.find(o=>config.books[book].editions.filter(ed=>!ed.partMatch||String(ed.partMatch)===part)[Number(o.value)].identifier===id);assert.ok(o);s.value=o.value;s.fire('change');await tick();};
 return r;
}
function button(r,label){const b=r.wrap.querySelectorAll('button').find(b=>b.textContent===label);assert.ok(b,label);return b;}

test('Original full initializer reproduces WRONG 51 -> track 52 (same real captured metadata)',async()=>{
 const original=raw('scripts/fixtures/reader-audio/before-audio-player.js');
 const config=JSON.parse(raw('scripts/fixtures/reader-audio/before-audio-sources.json'));
 const r=await boot({code:original,config});assert.match(r.audio().src,/track-0052.mp3$/);assert.equal(r.selected(),51);
});
test('Desired contract RED on original / GREEN on candidate',async()=>{
 const rev=process.env.AUDIO_PLAYER_BASELINE_REV;
 const code=rev?execFileSync('git',['show',`${rev}:public/audio-player.js`],{cwd:root,encoding:'utf8'}):source;
 const config=rev?JSON.parse(execFileSync('git',['show',`${rev}:public/audio-sources.json`],{cwd:root,encoding:'utf8'})):sources;
 const r=await boot({code,config});assert.match(r.audio().src,/track-0042.mp3$/);
});
test('Candidate real JSON and metadata bind SHA1/size to report+screenshot; exact query; early deferred open',async()=>{
 const r=await boot({loading:true,early:true});assert.match(r.audio().src,/track-0042.mp3$/);assert.equal(r.selected(),41);
 assert.equal(r.buttons().length,69);assert.equal(r.audio().plays,0);
 assert.deepEqual(r.fetches,['/audio-sources.json?v=20261105-exact-track-r1',`https://archive.org/metadata/${voice}`]);
 assert.match(r.status(),/Selected 42 of 69: Likutay Moharan I:51/);assert.match(r.status(),/Full recording; section start not indexed/);assert.doesNotMatch(r.status(),/listener report|screenshot/);
 assert.match(r.buttons()[41].textContent,/42\. Likutay Moharan I:51/);
 const e=sources.books['likutay-moharan'].editions[0].trackMap.teachings['1:51'];assert.equal(e.sha1,evidence.hashes.sha1);assert.equal(e.size,evidence.bytes);assert.equal(e.verification.bodySha256,evidence.hashes.sha256);
});
for(const kind of ['wrong SHA1','missing SHA1','wrong size','missing file','ambiguous file'])test(`${kind}: no fake automatic selection, archive list retained`,async()=>{
 const meta=structuredClone(metadata);const f=meta.files.find(f=>f.name==='track-0042.mp3');
 if(kind==='wrong SHA1')f.sha1='0'.repeat(40);if(kind==='missing SHA1')delete f.sha1;if(kind==='wrong size')f.size='1';
 if(kind==='missing file')meta.files=meta.files.filter(f=>f!==meta.files.find(x=>x.name==='track-0042.mp3'));
 if(kind==='ambiguous file')meta.files.push(structuredClone(f));
 const r=await boot({meta});assert.equal(r.audio().src,'');assert.equal(r.selected(),-1);assert.ok(r.buttons().length>=68);assert.match(r.status(),/unavailable|ambiguous|identity/);
});
for(const torah of ['1','50','52','64','51oops'])test(`Unmapped ${torah}: browse without ordinal guess`,async()=>{
 const r=await boot({torah});assert.equal(r.audio().src,'');assert.equal(r.selected(),-1);assert.equal(r.buttons().length,69);assert.match(r.status(),/No verified track mapping/);
 r.buttons()[3].fire('click');assert.match(r.audio().src,/track-0004.mp3$/);assert.match(r.status(),/No verified track mapping/);
});
test('Every configured ordinal map audited: removed LM plus both Tefilos; no false complete/per-Torah labels',async()=>{
 const maps=Object.values(sources.books).flatMap(b=>b.editions).filter(ed=>ed.trackMap);
 assert.deepEqual(maps.map(ed=>ed.trackMap.mode).sort(),['filename','verified-filename']);
 assert.ok(Object.values(sources.books).flatMap(b=>b.editions).every(ed=>!/complete|per-Torah|sampler/i.test(ed.name)));
 for(const ed of sources.books['likutay-tefilos'].editions){assert.equal(ed.trackMap,undefined);assert.match(ed.mappingStatus,/ordinal inference removed/);}
});
test('Part 2 and unrelated book cannot borrow LM I:51; preference survives where no verified mapping',async()=>{
 const r=await boot({part:'2',saved:voice});assert.equal(r.audio().src,'');assert.ok(!r.fetches.includes(`https://archive.org/metadata/${voice}`));
 const other=await boot({book:'meshivas-nefesh',saved:'kol-hatzadik-meshivas-nefesh'});assert.ok(other.fetches.includes('https://archive.org/metadata/kol-hatzadik-meshivas-nefesh'));assert.equal(other.audio().src,'');
});
test('Literal Hebrew filename matching preserved, quotes and part-2 isolation; ambiguous literal refused',async()=>{
 const files=[{name:'תורה נא.mp3',source:'original'},{name:'תורה נ״א תנינא.mp3',source:'original'}];
 for(const part of ['1','2']){
  const r=await boot({part,saved:literal,defer:true});
  if(part==='1'){r.pending[0].resolve(metadata);await tick();await r.change(literal);}
  r.pending.at(-1).resolve({files});await tick();assert.match(decodeURIComponent(r.audio().src),part==='1'?/תורה נא.mp3$/:/תורה נ״א תנינא.mp3$/);assert.match(r.status(),/literal teaching filename/);
 }
 const r=await boot({torah:'50',saved:literal,defer:true});r.pending[0].resolve({files:[{name:'תורה נ.mp3',source:'original'},{name:'another תורה נ.mp3',source:'original'}]});await tick();assert.equal(r.audio().src,'');
});
test('Saved wrong edition, repeated open, edition changes, return shortcut and scroll are coherent',async()=>{
 const r=await boot({saved:alternate});assert.match(r.audio().src,/track-0042.mp3$/);
 r.open();const list=r.wrap.querySelector('.ajew-ap-list');const active=r.buttons()[41];list.offsetTop=100;list.clientHeight=200;active.offsetTop=1500;active.offsetHeight=30;r.open();assert.equal(list.scrollTop,1315);
 const audio=r.audio();r.open();assert.equal(r.audio(),audio);
 await r.change(alternate);assert.equal(audio.paused,true);assert.equal(r.audio().src,'');
 button(r,'Return to this teaching: Likutay Moharan I:51').fire('click');await tick();assert.match(r.audio().src,/track-0042.mp3$/);assert.equal(r.selected(),41);
 await r.change(alternate);button(r,'Return to this teaching: Likutay Moharan I:51').fire('click');await tick();assert.equal(r.selected(),41);
});
test('Stale edition success/error cannot overwrite newer files/audio/status; reselect applies mapping anew',async()=>{
 const r=await boot({defer:true});await r.change(alternate);r.pending[1].resolve({files:[{name:'other.mp3',source:'original'}]});await tick();
 r.pending[0].resolve(metadata);await tick();assert.equal(r.buttons().length,1);assert.match(r.buttons()[0].textContent,/other/);assert.equal(r.audio().src,'');
 await r.change(voice);r.pending[2].resolve(metadata);await tick();assert.equal(r.selected(),41);
});
test('Prev/next/ended/share keep archive queue and status truthful; rejected real promises handled',async()=>{
 const r=await boot();r.open();button(r,'Next ⏭').fire('click');assert.match(r.audio().src,/track-0043.mp3$/);assert.match(r.status(),/not the mapped teaching/);
 button(r,'⏮ Prev').fire('click');assert.equal(r.selected(),41);r.audio().fire('ended');assert.equal(r.selected(),42);
 button(r,'↗ Share').fire('click');assert.match(r.shares.at(-1).url,/track-0043.mp3$/);
 for(const [name,text] of [['NotAllowedError',/Playback blocked/],['NotSupportedError',/Playback failed/]]){
  const err=new Error(name);err.name=name;r.audio().playFailure=err;r.buttons()[41].fire('click');await tick();assert.match(r.status(),text);
 }
 const err=new Error('interrupted');err.name='AbortError';r.audio().playFailure=err;r.buttons()[40].fire('click');await tick();assert.doesNotMatch(r.status(),/Playback failed|Playback blocked/);
});

test('Stable filename, not ordinal, survives inserted archive file; known label remains visible on unmapped pages',async()=>{
 const meta=structuredClone(metadata);meta.files.push({name:'track-0000.mp3',source:'original'});
 const r=await boot({meta});assert.match(r.audio().src,/track-0042.mp3$/);assert.equal(r.selected(),42);assert.match(r.status(),/Selected 43 of 70/);
 const unknown=await boot({torah:'50'});assert.match(unknown.buttons()[41].textContent,/Likutay Moharan I:51/);assert.equal(unknown.selected(),-1);
});
test('Stale failed metadata request cannot alter current edition status',async()=>{
 const r=await boot({defer:true});await r.change(alternate);r.pending[1].resolve({files:[{name:'current.mp3',source:'original'}]});await tick();
 const before=r.status();r.pending[0].reject(new Error('stale failure'));await tick();assert.equal(r.status(),before);assert.equal(r.buttons().length,1);
});
test('Mobile close/reopen preserves manual edition; explicit return restores mapped teaching',async()=>{
 const r=await boot();const mobile=r.document.getElementById('mobile-audio-btn');mobile.fire('click');await r.change(alternate);mobile.fire('click');mobile.fire('click');await tick();assert.equal(r.selected(),-1);button(r,'Return to this teaching: Likutay Moharan I:51').fire('click');await tick();assert.equal(r.selected(),41);assert.match(r.audio().src,/track-0042.mp3$/);
});

for (const ed of sources.books['likutay-tefilos'].editions) test(`Tefilos ${ed.identifier}: full-init with available synthetic recordings never ordinal-selects`,async()=>{
 const r=await boot({book:'likutay-tefilos',saved:ed.identifier,editionMetas:{[ed.identifier]:{files:[{name:'001.mp3',source:'original'},{name:'051.mp3',source:'original'}]}}});
 assert.equal(r.buttons().length,2);assert.equal(r.audio().src,'');assert.equal(r.selected(),-1);assert.match(r.status(),/No verified track mapping/);r.buttons()[1].fire('click');assert.match(r.audio().src,/051.mp3$/);
});

// Independent review: actual full initializer and native rendered handler.
const reviewCode = process.env.AUDIO_PLAYER_REVIEW_ORIGINAL ? fs.readFileSync(process.env.AUDIO_PLAYER_REVIEW_ORIGINAL,'utf8') : source;
function returnButton(r) { const b=r.wrap.querySelectorAll('button').find(b=>/^(Current teaching:|Return to this teaching:)/.test(b.textContent));assert.ok(b);return b; }
test('Review: actual return button restores teaching after SAME-edition manual browse',async()=>{
 const r=await boot({code:reviewCode});r.buttons()[7].fire('click');assert.equal(r.selected(),7);
 returnButton(r).fire('click');await tick();assert.equal(r.selected(),41);assert.match(r.audio().src,/track-0042.mp3$/);assert.match(r.status(),/Full recording; section start not indexed/);
});
test('Review: generic opener and mobile close/reopen preserve manual edition and queue',async()=>{
 const r=await boot({code:reviewCode,editionMetas:{[alternate]:{files:[{name:'other.mp3',source:'original'}]}}});await r.change(alternate);r.buttons()[0].fire('click');const a=r.audio();
 r.open();await tick();assert.equal(r.audio(),a);assert.match(a.src,/other.mp3$/);
 const mobile=r.document.getElementById('mobile-audio-btn');mobile.fire('click');mobile.fire('click');await tick();assert.equal(r.audio(),a);assert.match(a.src,/other.mp3$/);
 returnButton(r).fire('click');await tick();assert.equal(r.selected(),41);
});
test('Review: visitor UI hides engineering provenance and never verifies mismatched file',async()=>{
 const r=await boot({code:reviewCode});assert.doesNotMatch(r.wrap.textContent,/listener report|screenshot|partial verified mapping/);
 const meta=structuredClone(metadata);meta.files.find(f=>f.name==='track-0042.mp3').sha1='0'.repeat(40);
 const bad=await boot({code:reviewCode,meta});returnButton(bad).fire('click');await tick();assert.equal(bad.selected(),-1);assert.equal(bad.audio().src,'');assert.doesNotMatch(bad.wrap.textContent,/verified reading|Verified reading/);assert.match(bad.status(),/identity/);
});
test('Review: return while pending is scoped; identity missing size and filename case refuse selection',async()=>{
 const r=await boot({code:reviewCode,defer:true});returnButton(r).fire('click');await r.change(alternate);r.pending[0].resolve(metadata);await tick();assert.equal(r.selected(),-1);r.pending[1].resolve({files:[]});await tick();assert.equal(r.audio().src,'');
 for(const kind of ['size','case']){const meta=structuredClone(metadata);const f=meta.files.find(f=>f.name==='track-0042.mp3');if(kind==='size')delete f.size;else f.name='TRACK-0042.MP3';const x=await boot({code:reviewCode,meta});returnButton(x).fire('click');await tick();assert.equal(x.selected(),-1);assert.equal(x.audio().src,'');}
});

test('Review: return already on teaching preserves audio/playhead; stale playback rejection cannot relabel return',async()=>{
 const r=await boot({code:reviewCode});r.audio().currentTime=123;const a=r.audio();returnButton(r).fire('click');assert.equal(r.audio(),a);assert.equal(a.currentTime,123);assert.equal(a.plays,0);
 let reject; a.play=()=>new Promise((resolve,no)=>{reject=no;});r.buttons()[3].fire('click');returnButton(r).fire('click');reject(Object.assign(new Error('stale'),{name:'NotSupportedError'}));await tick();assert.equal(r.selected(),41);assert.doesNotMatch(r.status(),/Playback failed/);assert.match(r.status(),/Full recording; section start not indexed/);
});
