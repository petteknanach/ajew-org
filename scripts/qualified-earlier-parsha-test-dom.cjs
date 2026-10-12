// Portable HTML5/stub DOM; native disclosure is modeled, not a browser/paint oracle.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {createRequire} = require('node:module');
const dependencies = createRequire(process.env.AJEW_TEST_DEPENDENCY_ANCHOR || path.join(__dirname, '..', 'package.json'));
const parse5 = dependencies('parse5');
const observers = new Set();
let queued = false;
function changed() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; for (const observer of observers) observer.fn([]); });
}
class Observer {
  constructor(fn) { this.fn = fn; }
  observe() { observers.add(this); }
  disconnect() { observers.delete(this); }
}
function matches(node, selector) {
  if (!node.tagName) return false;
  selector = selector.replace(/:not\(([^)]+)\)/g, (_, sub) => matches(node, sub) ? ':impossible' : '');
  if (selector.includes(':impossible')) return false;
  const tag = selector.match(/^[\w-]+/);
  if (tag && node.tagName !== tag[0].toLowerCase()) return false;
  for (const match of selector.matchAll(/#([\w-]+)/g)) if (node.id !== match[1]) return false;
  for (const match of selector.matchAll(/\.([\w-]+)/g)) if (!node.classList.contains(match[1])) return false;
  for (const match of selector.matchAll(/\[([^=\]]+)(?:=["']?([^\]"']*)["']?)?\]/g)) {
    if (!node.hasAttribute(match[1])) return false;
    if (match[2] !== undefined && node.getAttribute(match[1]) !== match[2]) return false;
  }
  if (/:checked/.test(selector) && !node.checked) return false;
  return true;
}
function selects(node, selector) {
  const parts = selector.trim().split(/\s+(?![^\[]*\])/);
  if (!matches(node, parts.pop())) return false;
  let p = node.parentNode;
  while (parts.length) {
    const part = parts.pop();
    while (p && !matches(p, part)) p = p.parentNode;
    if (!p) return false;
    p = p.parentNode;
  }
  return true;
}
class Element {
  constructor(tag = '', attrs = {}, value = '') {
    this.tagName = tag; this.attrs = {...attrs}; this.value = ''; this.checked = true; this.scrollTop = 0;
    this.childNodes = []; this._text = value; this.parentNode = null; this._listeners = {};
    this.style = {setProperty() {}, removeProperty() {}};
    this.dataset = new Proxy({}, {
      get: (_, k) => this.getAttribute('data-' + String(k).replace(/[A-Z]/g, x => '-' + x.toLowerCase())),
      set: (_, k, v) => {this.setAttribute('data-' + String(k).replace(/[A-Z]/g, x => '-' + x.toLowerCase()), String(v)); return true;}
    });
    this.classList = {
      contains: c => (this.className || '').split(/\s+/).includes(c),
      add: (...cs) => { this.className = [...new Set((this.className || '').split(/\s+/).filter(Boolean).concat(cs))].join(' '); },
      remove: (...cs) => { this.className = (this.className || '').split(/\s+/).filter(c => c && !cs.includes(c)).join(' '); },
      toggle: (c, force) => { const yes = force === undefined ? !this.classList.contains(c) : force; this.classList[yes ? 'add' : 'remove'](c); return yes; }
    };
  }
  get id() { return this.attrs.id || ''; } set id(v) { this.setAttribute('id', v); }
  get className() { return this.attrs.class || ''; } set className(v) { this.setAttribute('class', v); }
  get children() { return this.childNodes.filter(x => x.tagName); }
  get firstChild() { return this.childNodes[0] || null; }
  get nextSibling() { const a = this.parentNode?.childNodes || []; return a[a.indexOf(this) + 1] || null; }
  get textContent() { return this.tagName === '#text' ? this._text : this.childNodes.map(n => n.textContent).join(''); }
  set textContent(value) { if (this.tagName === '#text') this._text = String(value); else this.replaceChildren(new Element('#text', {}, String(value))); changed(); }
  get innerHTML() { return parse5.serialize({nodeName: '#document-fragment', childNodes: this.childNodes.map(n => n.raw())}); }
  set innerHTML(value) { this.replaceChildren(...parse5.parseFragment(String(value)).childNodes.map(wrap)); }
  get hidden() { return this.hasAttribute('hidden'); } set hidden(v) { if (v) this.setAttribute('hidden',''); else this.removeAttribute('hidden'); }
  get open() { return this.hasAttribute('open'); } set open(v) { if (v) this.setAttribute('open',''); else this.removeAttribute('open'); }
  get href() { return this.getAttribute('href') || ''; } set href(v) {this.setAttribute('href', v);}
  set lang(v) {this.setAttribute('lang',v);} set dir(v) {this.setAttribute('dir',v);}
  getAttribute(k) { return Object.hasOwn(this.attrs, k) ? this.attrs[k] : null; }
  hasAttribute(k) { return Object.hasOwn(this.attrs, k); }
  setAttribute(k,v) { this.attrs[k] = String(v); changed(); }
  removeAttribute(k) { delete this.attrs[k]; changed(); }
  appendChild(n) { if (n.tagName === '#document-fragment') {for (const child of [...n.childNodes]) this.appendChild(child); return n;} n.parentNode = this; this.childNodes.push(n); changed(); return n; }
  append(...nodes) { for (const n of nodes) this.appendChild(n); }
  insertBefore(n, ref) { if (!ref) return this.appendChild(n); n.parentNode = this; this.childNodes.splice(this.childNodes.indexOf(ref),0,n); changed(); return n; }
  replaceChildren(...nodes) { for (const n of this.childNodes) n.parentNode = null; this.childNodes = []; for (const n of nodes) this.appendChild(n); changed(); }
  remove() { if (this.parentNode) { const p = this.parentNode; p.childNodes.splice(p.childNodes.indexOf(this),1); this.parentNode = null; changed(); } }
  querySelectorAll(selector) { const out=[]; const visit = p => { for (const n of p.childNodes) {if (n.tagName !== '#text' && selector.split(',').some(s => selects(n,s))) out.push(n); visit(n);} };visit(this);return out; }
  querySelector(selector) {return this.querySelectorAll(selector)[0] || null;}
  closest(selector) {for(let p=this;p;p=p.parentNode) if(matches(p,selector))return p;return null;}
  contains(node) {for(let p=node;p;p=p.parentNode)if(p===this)return true;return false;}
  cloneNode(deep) {const n=new Element(this.tagName,this.attrs,this._text);if(deep)for(const c of this.childNodes)n.appendChild(c.cloneNode(true));if(this.content)n.content=this.content.cloneNode(deep);return n;}
  addEventListener(type,fn) {(this._listeners[type] ||= []).push(fn);}
  removeEventListener(type,fn) {this._listeners[type]=(this._listeners[type] || []).filter(x=>x!==fn);}
  dispatchEvent(event) {event.target ||= this;event.preventDefault ||= ()=>{};event.stopPropagation ||= ()=>{event.stopped=true;};for(let p=this;p;p=event.bubbles===false || event.stopped ? null : p.parentNode)for(const fn of [...(p._listeners[event.type] || [])])fn.call(p,event);return true;}
  click() {const event={type:'click',preventDefault(){this.defaultPrevented=true;}};this.dispatchEvent(event);if(!event.defaultPrevented && this.tagName==='summary' && this.parentNode?.tagName==='details')this.parentNode.open=!this.parentNode.open;}
  focus() {} scrollIntoView() {} getBoundingClientRect() {return {top:0,bottom:100,left:0,right:100,width:100,height:100};}
  raw() {if(this.tagName==='#text')return {nodeName:'#text',value:this._text};const raw={nodeName:this.tagName,tagName:this.tagName,namespaceURI:'http://www.w3.org/1999/xhtml',attrs:Object.entries(this.attrs).map(([name,value])=>({name,value})),childNodes:this.childNodes.map(n=>n.raw())}; if(this.content)raw.content=this.content.raw();return raw;}
}
function wrap(raw) {const e=new Element(raw.tagName || raw.nodeName,Object.fromEntries((raw.attrs || []).map(a=>[a.name,a.value])),raw.value || '');for(const c of raw.childNodes || [])e.appendChild(wrap(c));if(raw.content)e.content=wrap(raw.content);return e;}
function documentFor(html) {const d=wrap(parse5.parse(html));d.readyState='complete';d.body=d.querySelector('body');d.head=d.querySelector('head');d.documentElement=d.querySelector('html');d.title='Plainly synthetic consumer fixture';d.getElementById=id=>d.querySelector('#'+id);d.createElement=tag=>new Element(tag);d.createTextNode=s=>new Element('#text',{},s);d.createTreeWalker=()=>({nextNode:()=>null});return d;}
function sandbox(document, pathname, fetcher) {
  const timers=new Set(), intervals=new Set(), storage=new Map();
  const location={pathname,search:'',hash:'',href:'https://fixture.invalid'+pathname};
  const win=new Element('window');Object.assign(win,{location,innerWidth:1200,innerHeight:800,scrollY:0,pageYOffset:0,scrollTo(){},open(){},getSelection:()=>({toString:()=>'',rangeCount:0}),matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})});
  const box={document,window:win,location,console,URL,URLSearchParams,Date,MutationObserver:Observer,NodeFilter:{SHOW_TEXT:4},IntersectionObserver:class {observe(){} disconnect(){}},navigator:{clipboard:{writeText:async()=>{}}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},fetch:fetcher,
    setTimeout:(fn,ms,...a)=>{const t=setTimeout(()=>{timers.delete(t);fn(...a);},ms);timers.add(t);return t;},clearTimeout:t=>{timers.delete(t);clearTimeout(t);},setInterval:(fn,ms)=>{const t=setInterval(fn,ms);intervals.add(t);return t;},clearInterval:t=>{intervals.delete(t);clearInterval(t);},requestAnimationFrame:fn=>setTimeout(fn,1),cancelAnimationFrame:clearTimeout,getComputedStyle:()=>({getPropertyValue:()=>'',lineHeight:'20px'}),alert(){},confirm:()=>false,CustomEvent:class {constructor(type,opts={}){this.type=type;Object.assign(this,opts);}},performance};
  Object.assign(box,{speechSynthesis:{getVoices:()=>[],addEventListener(){},cancel(){},pause(){},resume(){}},Event:class{constructor(type){this.type=type;}},TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,crypto:require('node:crypto').webcrypto,atob,btoa});
  Object.assign(win,{crypto:box.crypto,AjewMarkedHebrew:undefined});
  box.globalThis=box;win.document=document;vm.createContext(box);
  return {box,close(){for(const t of timers)clearTimeout(t);for(const t of intervals)clearInterval(t);for(const observer of [...observers])observer.disconnect();}};
}
function tick(ms=25){return new Promise(resolve=>setTimeout(resolve,ms));}
async function until(fn,ms=5000){const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await tick(10);}throw new Error('Fixture deadline exceeded');}
module.exports={dependencies,documentFor,sandbox,tick,until,Element,Observer};

function visible(element) {
  for (let node=element; node; node=node.parentNode) {
    if(node.hidden || node.style.display==='none') return false;
    if(node.tagName==='details' && !node.open) {const summary=node.children.find(c=>c.tagName==='summary');if(!summary || !summary.contains(element))return false;}
  }
  return true;
}
module.exports.visible=visible;
