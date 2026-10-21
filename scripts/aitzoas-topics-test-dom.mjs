// Bounded synthetic DOM for actual client guard initialization and actions.
// Not SSR, layout/ink/native-browser evidence. HTML5 parsing uses real parse5.
import {createRequire} from 'node:module';
const {parse,parseFragment}=createRequire(import.meta.url)('parse5');
export function testDOM(html,pathname,read){
 const wrappers=new WeakMap(),all=n=>[n,...(n.childNodes??[]).flatMap(all)];
 const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
 const set=(n,k,v)=>{n.attrs??=[];const a=n.attrs.find(a=>a.name===k);if(a)a.value=String(v);else n.attrs.push({name:k,value:String(v)});};
 const text=n=>n.nodeName==='#text'?n.value:(n.childNodes??[]).map(text).join('');
 function match(n,s){
  if(s.includes(','))return s.split(',').some(x=>match(n,x.trim()));
  if(!n.tagName)return false;
  if(s.startsWith('#'))return attr(n,'id')===s.slice(1);
  if(s.startsWith('.'))return (attr(n,'class')??'').split(/\s+/).includes(s.slice(1));
  if(s.startsWith('[')){const m=/^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(s);return !!m&&(m[2]===undefined?attr(n,m[1])!==undefined:attr(n,m[1])===m[2]);}
  return n.tagName===s.toLowerCase();
 }
 function query(n,s){
  if(s.includes(','))return [...new Set(s.split(',').flatMap(x=>query(n,x.trim())))];
  const parts=s.split(/\s+/);return all(n).slice(1).filter(c=>{if(!match(c,parts.at(-1)))return false;let p=c.parentNode;for(let i=parts.length-2;i>=0;i--){while(p&&!match(p,parts[i]))p=p.parentNode;if(!p)return false;p=p.parentNode;}return true;});
 }
 class Element{
  constructor(n){this.n=n;this.handlers={};this.style={setProperty(){}};}
  get nodeType(){return this.n.nodeName==='#text'?3:this.n.nodeName==='#comment'?8:this.n.nodeName==='#document'?9:this.n.nodeName==='#document-fragment'?11:1;}
  get tagName(){return this.n.tagName?.toUpperCase();}
  get dataset(){return new Proxy({}, {get:(_,k)=>attr(this.n,'data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase())),set:(_,k,v)=>{set(this.n,'data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v);return true;}});}
  get id(){return attr(this.n,'id')??'';}set id(v){set(this.n,'id',v);}
  get open(){return this.hasAttribute('open');}set open(value){if(value)this.setAttribute('open','');else this.removeAttribute('open');}
  get children(){return(this.n.childNodes??[]).filter(n=>n.tagName).map(wrap);}
  get childNodes(){return(this.n.childNodes??[]).map(wrap);}
  get attributes(){return this.n.attrs??[];}
  get textContent(){return text(this.n);}set textContent(v){this.n.childNodes=[{nodeName:'#text',value:String(v),parentNode:this.n}];}
  get parentElement(){return this.n.parentNode?.tagName?wrap(this.n.parentNode):null;}
  get parentNode(){return this.n.parentNode?wrap(this.n.parentNode):null;}
  get previousElementSibling(){const siblings=this.parentElement?.children??[];return siblings[siblings.indexOf(this)-1]??null;}
  get isConnected(){return this.getRootNode()===document;}
  getRootNode(){let n=this.n;while(n.parentNode)n=n.parentNode;return wrap(n);}
  getAttribute(k){return attr(this.n,k)??null;}setAttribute(k,v){set(this.n,k,v);}hasAttribute(k){return attr(this.n,k)!==undefined;}
  removeAttribute(k){this.n.attrs=(this.n.attrs??[]).filter(a=>a.name!==k);}
  querySelectorAll(s){return query(this.n,s).map(wrap);}querySelector(s){return this.querySelectorAll(s)[0]??null;}
  matches(s){return match(this.n,s);}closest(s){for(let n=this;n;n=n.parentElement)if(n.matches(s))return n;return null;}
  contains(el){return all(this.n).includes(el?.n);}
  append(...els){for(const el of els){if(el.nodeType===11){this.append(...el.childNodes);continue;}if(el.parentNode)el.remove();el.n.parentNode=this.n;(this.n.childNodes??=[]).push(el.n);}}
  replaceChildren(...els){for(const n of this.n.childNodes??[])n.parentNode=null;this.n.childNodes=[];this.append(...els);}
  remove(){const a=this.n.parentNode?.childNodes;if(a)a.splice(a.indexOf(this.n),1);this.n.parentNode=null;}
  addEventListener(type,f){(this.handlers[type]??=[]).push(f);}
  getBoundingClientRect(){return {left:0,right:600,top:0,bottom:50,width:600,height:50};}getClientRects(){return[this.getBoundingClientRect()];}
 }
 const wrap=n=>{if(!wrappers.has(n))wrappers.set(n,new Element(n));return wrappers.get(n);};
 const document=wrap(parse(html));document.head=document.querySelector('head');document.body=document.querySelector('body');
 document.createElement=tag=>wrap({nodeName:tag,tagName:tag,attrs:[],childNodes:[]});
 document.createTextNode=value=>wrap({nodeName:'#text',value});
 document.createDocumentFragment=()=>wrap({nodeName:'#document-fragment',childNodes:[]});
 const clipboard=[],shares=[],local=new Map(),listeners={};
 const window={document,location:{pathname,search:'',origin:'https://ajew.org'},navigator:{clipboard:{writeText:async t=>clipboard.push(t)},share:async p=>shares.push(p),locks:{request:async(_name,_options,fn)=>fn()}},crypto:globalThis.crypto,localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,String(v))},history:{replaceState(){}},getSelection:()=>null,MutationObserver:class{observe(){}takeRecords(){return[];}},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(type,f){(listeners[type]??=[]).push(f);},fetch:async url=>{const b=read(url.split('?')[0].replace(/^\//,''));return{ok:true,arrayBuffer:async()=>new Uint8Array(b).buffer};},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1',contentVisibility:'visible',clipPath:'none',clip:'auto',filter:'none',transform:'none',overflowX:'visible',overflowY:'visible'})};
 async function click(el){const e={target:el,preventDefault(){},stopImmediatePropagation(){}};for(const f of document.handlers.click??[])f(e);await new Promise(resolve=>setImmediate(resolve));}
 return {document,window,clipboard,shares,local,click};
}
