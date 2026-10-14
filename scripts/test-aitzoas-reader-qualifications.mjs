// Bounded actual-template SSR: real Astro compiler, container, dependencies and JSON.
// No full-site build, dependency install, mock Layout or renderer reimplementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const { transform } = require('@astrojs/compiler');
const { build } = require('esbuild');
const { experimental_AstroContainer } = await import('astro/container');
const { createComponent } = await import('astro/runtime/server/index.js');
// Container 5.x omits config.site from its internal manifest. Supply the real site
// as rendering context, not by editing Layout or inventing application output.
function withSite(component) {
  return createComponent((result, props, slots) => {
    const original = result.createAstro;
    result.createAstro = (...args) => {
      const context = original(...args);
      context.site = new URL('https://ajew.org');
      return context;
    };
    return component(result, props, slots);
  });
}
const repo = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = path.resolve(process.env.AITZOAS_QUALIFICATIONS_SOURCE_ROOT || repo);
const evidence = process.env.AITZOAS_QUALIFICATIONS_EVIDENCE_DIR;
const output = evidence || fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'aitzoas-ssr-'));
fs.mkdirSync(output, { recursive: true });
const bookPath = 'public/reader/aitzoas-yeshuroas';
const pagePath = 'src/pages/reader/aitzoas-yeshuroas/[part]/[torah].astro';
const directoryPath = 'src/pages/reader/aitzoas-yeshuroas/[part]/index.astro';
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const data = (p) => JSON.parse(read(p));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const index = data(`${bookPath}/index.json`);
const sections = index.torahs.map((entry) => data(`${bookPath}/section-${entry.torah}.json`));
const diagnostics = [];
const inputs = new Map();
const missingNativeWitnesses = [];
const witnessPaths = [fileURLToPath(import.meta.url), path.join(root, `${bookPath}/index.json`), ...index.torahs.map((e) => path.join(root, `${bookPath}/section-${e.torah}.json`))];
for (const p of ['reader-script.js','reader-v2.js','unified-audio.js','reader-notes.js'].map((p) => path.join(repo, 'public', p))) {
  if (fs.existsSync(p)) witnessPaths.push(p); else missingNativeWitnesses.push(p);
}
for (const n of index.torahs.map((e) => e.torah)) {
  const p = path.join(root, `public/reader/biur-halikutim/section-${n}.json`);
  if (fs.existsSync(p)) witnessPaths.push(p); // Actual original wrong-book producer inputs in RED.
}
for (const p of witnessPaths) {
  const raw = fs.readFileSync(p);
  inputs.set(p, { path: p, bytes: raw.length, sha256: sha(raw), role: 'test-data-or-native-contract-witness' });
}
fs.writeFileSync(path.join(output, 'executed-test-source.mjs'), fs.readFileSync(fileURLToPath(import.meta.url)));
async function compile(relative, name) {
  const result = await build({
    entryPoints: [path.join(root, relative)], bundle: true, write: false,
    format: 'esm', platform: 'node', target: 'node18', logLevel: 'silent',
    plugins: [{ name: 'bounded-actual-astro', setup(b) {
      b.onResolve({ filter: /^astro\// }, (a) => ({ path: require.resolve(a.path), external: true }));
      b.onResolve({ filter: /\.astro\?astro&type=style/ }, (a) => ({ path: a.path, namespace: 'server-style' }));
      b.onLoad({ filter: /.*/, namespace: 'server-style' }, () => ({ contents: '', loader: 'js' }));
      b.onResolve({ filter: /\.(astro|css)$/ }, (a) => {
        let p = path.resolve(a.resolveDir || root, a.path);
        // A baseline contains scoped original pages; unchanged dependencies come from this repo.
        if (!fs.existsSync(p) && p.startsWith(root + path.sep)) p = path.join(repo, path.relative(root, p));
        return { path: p };
      });
      b.onLoad({ filter: /\.astro$/ }, async (a) => {
        const source = fs.readFileSync(a.path, 'utf8');
        inputs.set(a.path, { path: a.path, bytes: Buffer.byteLength(source), sha256: sha(source) });
        const compiled = await transform(source, {
          filename: a.path, internalURL: 'astro/compiler-runtime',
          astroGlobalArgs: JSON.stringify('https://ajew.org'),
          // Match Astro's server compiler ABI; no hydration/client bundling in this SSR gate.
          resultScopedSlot: true,
        });
        diagnostics.push({ path: a.path, diagnostics: compiled.diagnostics, cssCount: compiled.css.length });
        assert.equal(compiled.diagnostics.filter((d) => d.severity === 1).length, 0, `compiler: ${a.path}`);
        const tag = path.basename(a.path).replace(/[^a-z0-9]/gi, '-');
        fs.writeFileSync(path.join(output, `${name}-${tag}.compiled.js`), compiled.code);
        compiled.css.forEach((css, i) => fs.writeFileSync(path.join(output, `${name}-${tag}-${i}.css`), css));
        // Installed compiler 2.x emits metadata that Astro 5.x no longer exports.
        // Preserve raw compiler output above. Elide ONLY unused non-hydrated bookkeeping.
        let serverCode = compiled.code;
        const elisions = [];
        if (serverCode.includes('createMetadata as $$createMetadata')) {
          assert.equal((serverCode.match(/\$\$metadata/g) || []).length, 1, 'metadata must be unconsumed');
          assert.ok(/hydratedComponents: \[\], clientOnlyComponents: \[\]/.test(serverCode), 'non-hydrated only');
          serverCode = serverCode.replace(/  createMetadata as \$\$createMetadata\n/, '');
          serverCode = serverCode.replace(/^export const \$\$metadata = [\s\S]*?(?=\nconst \$\$Astro =)/m, (line) => { elisions.push(line); return ''; });
          serverCode = serverCode.replace(/^import \* as (\$\$module\d+) from .*;\n/gm, (line, binding) => {
            assert.equal((serverCode.match(/\$\$module\d+\b/g) || []).filter((v) => v === binding).length, 1, `${a.path}: ${binding} must be unconsumed`);
            elisions.push(line); return '';
          });
          assert.equal(serverCode.includes('$$createMetadata'), false);
        }
        diagnostics[diagnostics.length - 1].metadataElisions = elisions;
        return { contents: serverCode, loader: 'ts', resolveDir: path.dirname(a.path) };
      });
      // CSS imports are authenticated and retained, not executed by a server JS loader.
      b.onLoad({ filter: /\.css$/ }, (a) => {
        const raw = fs.readFileSync(a.path);
        inputs.set(a.path, { path: a.path, bytes: raw.length, sha256: sha(raw), serverCssImport: true });
        return { contents: '', loader: 'js' };
      });
    } }],
  });
  const out = path.join(output, `${name}.bundle.mjs`);
  fs.writeFileSync(out, result.outputFiles[0].contents);
  return import(pathToFileURL(out).href);
}
let page, directory, container;
const rendered = new Map();
const renderErrors = [];
try {
  page = await compile(pagePath, 'section');
  container = await experimental_AstroContainer.create();
} finally {
  fs.writeFileSync(path.join(output, 'compiler.json'), JSON.stringify({ diagnostics, inputs: [...inputs.values()] }, null, 2));
}
async function renderSection(n) {
  if (!rendered.has(n)) {
    const cwd = process.cwd();
    try {
      process.chdir(root);
      const html = await container.renderToString(withSite(page.default), {
        params: { part: '1', torah: String(n) },
        request: new Request(`https://ajew.org/reader/aitzoas-yeshuroas/1/${n}`),
      });
      fs.writeFileSync(path.join(output, `section-${n}.html`), html);
      rendered.set(n, html);
    } catch (e) {
      renderErrors.push({ section: n, error: String(e), stack: e.stack });
      throw e;
    } finally { process.chdir(cwd); }
  }
  return rendered.get(n);
}
// Parsed actual qualified SSR plus unchanged AST-selected consumers. Not native/browser/full init.
const acorn = require('acorn');
const { parse: parseHTML, parseFragment } = require('parse5');
const vm = require('node:vm');
const runtimePath = p => fs.existsSync(path.join(root,p)) ? path.join(root,p) : path.join(repo,p);
const runtimeRaw = fs.readFileSync(runtimePath('public/reader-script.js'),'utf8');
const v2Raw = fs.readFileSync(runtimePath('public/reader-v2.js'),'utf8');
const names = ['setupCopyAttribution','setupSelectionPopup','segmentPlainText','segmentTitle','absoluteShareUrl','saveSegmentToMySefer','setupCopyButtons','setupSegmentShareActions','shareOrCopy'];
function functions(raw, wanted) {
  const found = {};
  function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'FunctionDeclaration' && wanted.includes(n.id.name)) {
      assert.ok(!found[n.id.name]); found[n.id.name] = raw.slice(n.start,n.end);
    }
    for (const [k,v] of Object.entries(n)) if (k !== 'loc') {
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
    }
  }
  walk(acorn.parse(raw,{ecmaVersion:'latest'}));
  assert.equal(Object.keys(found).length,wanted.length); return found;
}
const consumers = functions(runtimeRaw,names);
const v2Copy = functions(v2Raw,['setupCopyAttribution']).setupCopyAttribution;
const html = await renderSection(4);
const helperURL = html.match(/\/reader-aitzoas-qualifications\.js\?v=20261014-r1(?:1)?\b/)?.[0] || '/reader-aitzoas-qualifications.js?v=20261014-r11';
const helperReferenced = html.includes(helperURL);
const helperRaw = helperReferenced ? read('public/reader-aitzoas-qualifications.js') : null;
for (const p of ['public/reader-script.js','public/reader-v2.js', ...(helperReferenced ? ['public/reader-aitzoas-qualifications.js'] : [])]) {
  const target = runtimePath(p), raw = fs.readFileSync(target); inputs.set(target,{path:target,bytes:raw.length,sha256:sha(raw)});
}
const actionObservations = [];
const functionPins = Object.fromEntries([...Object.entries(consumers),['v2.setupCopyAttribution',v2Copy]].map(([name,body])=>[name,sha(body)]));
function setup({withoutWarning=false,foreignRoute=false}={}) {
  const wrappers = new WeakMap();
  const all = n => [n,...(n.childNodes || []).flatMap(all)];
  const attrs = n => n.attrs || (n.attrs=[]);
  const attr = (n,k) => attrs(n).find(a=>a.name===k)?.value;
  const set = (n,k,v) => { const a=attrs(n).find(a=>a.name===k); if(a)a.value=String(v);else attrs(n).push({name:k,value:String(v)}); };
  const text = n => n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
  function match(n,s) {
    if(s.startsWith('#'))return attr(n,'id')===s.slice(1);
    if(s.startsWith('.'))return (attr(n,'class')||'').split(/\s+/).includes(s.slice(1));
    if(s.startsWith('[')){const m=s.match(/^\[([^=]+)="([^"]+)"\]$/);return m&&attr(n,m[1])===m[2];}
    return n.tagName===s;
  }
  function query(n,s) {
    if(s.includes(','))return [...new Set(s.split(',').flatMap(x=>query(n,x.trim())))];
    if(s.startsWith(':scope > '))return(n.childNodes||[]).filter(c=>match(c,s.slice(9)));
    const parts=s.split(/\s+/);return all(n).slice(1).filter(c=>{
      if(!match(c,parts.at(-1)))return false;let p=c.parentNode;
      for(let i=parts.length-2;i>=0;i--){while(p&&!match(p,parts[i]))p=p.parentNode;if(!p)return false;p=p.parentNode;}return true;
    });
  }
  class Element {
    constructor(n){this.n=n;this.style={};this.handlers={};const classes=()=>new Set((attr(n,'class')||'').split(/\s+/).filter(Boolean));this.classList={contains:c=>match(n,'.'+c),add:c=>{const s=classes();s.add(c);set(n,'class',[...s].join(' '));},remove:c=>{const s=classes();s.delete(c);set(n,'class',[...s].join(' '));},toggle:c=>{const s=classes();const on=!s.has(c);if(on)s.add(c);else s.delete(c);set(n,'class',[...s].join(' '));return on;}};}
    get dataset(){return new Proxy({}, {get:(_,k)=>attr(this.n,'data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase())),set:(_,k,v)=>{set(this.n,'data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v);return true;}});}
    get id(){return attr(this.n,'id')||'';}set id(v){set(this.n,'id',v);}
    get className(){return attr(this.n,'class')||'';}set className(v){set(this.n,'class',v);}
    get textContent(){return text(this.n);}set textContent(v){this.n.childNodes=[{nodeName:'#text',value:String(v),parentNode:this.n}];}
    set innerHTML(v){this.n.childNodes=parseFragment(v).childNodes;this.n.childNodes.forEach(c=>c.parentNode=this.n);}
    get firstChild(){return this.n.childNodes?.[0]?wrap(this.n.childNodes[0]):null;}
    get parentElement(){return this.n.parentNode?.tagName?wrap(this.n.parentNode):null;}
    get parentNode(){return this.n.parentNode?wrap(this.n.parentNode):null;}
    get ownerDocument(){return document;}
    get isConnected(){return this.getRootNode()===document;}
    getRootNode(){let n=this.n;while(n.parentNode)n=n.parentNode;return wrap(n);}
    querySelectorAll(s){return query(this.n,s).map(wrap);}querySelector(s){return this.querySelectorAll(s)[0]||null;}
    closest(s){let n=this.n;while(n){if(match(n,s))return wrap(n);n=n.parentNode;}return null;}
    contains(e){return all(this.n).includes(e?.n||e);}
    appendChild(e){e.n.parentNode=this.n;(this.n.childNodes||(this.n.childNodes=[])).push(e.n);return e;}
    insertBefore(e,b){e.n.parentNode=this.n;const a=this.n.childNodes||(this.n.childNodes=[]);const i=b?a.indexOf(b.n):-1;if(i<0)a.push(e.n);else a.splice(i,0,e.n);}
    cloneNode(){const copy=n=>{const c={nodeName:n.nodeName,tagName:n.tagName,value:n.value,attrs:attrs(n).map(a=>({...a})),childNodes:(n.childNodes||[]).map(copy)};c.childNodes.forEach(x=>x.parentNode=c);return c;};return wrap(copy(this.n));}
    remove(){const a=this.n.parentNode?.childNodes;if(a)a.splice(a.indexOf(this.n),1);this.n.parentNode=null;}
    addEventListener(k,f,opts=false){(this.handlers[k]||(this.handlers[k]=[])).push({f,capture:typeof opts==='boolean'?opts:!!opts.capture});}
    removeEventListener(k,f,opts=false){const capture=typeof opts==='boolean'?opts:!!opts.capture;this.handlers[k]=(this.handlers[k]||[]).filter(h=>h.f!==f||h.capture!==capture);}
    click(){return dispatch('click',this);}
  }
  function wrap(n){if(!wrappers.has(n))wrappers.set(n,new Element(n));return wrappers.get(n);}
  const document=wrap(parseHTML(html));document.body=document.querySelector('body');document.title=document.querySelector('title').textContent;
  document.getElementById=id=>document.querySelector('#'+id);
  document.createElement=tag=>wrap({nodeName:tag,tagName:tag,attrs:[],childNodes:[]});
  if(withoutWarning) document.getElementById('translation-review-warning').remove();
  const warning=document.getElementById('translation-review-warning');
  const local=new Map(),clipboard=[],shares=[],timers=[];let selection=null;
  const localStorage={getItem:k=>local.has(k)?local.get(k):null,setItem:(k,v)=>local.set(k,String(v))};
  const pathname=foreignRoute?'/reader/another-book/1/4':'/reader/aitzoas-yeshuroas/1/4';
  const window={location:{href:'https://ajew.org'+pathname+'#seg-152',pathname,origin:'https://ajew.org'},getSelection:()=>selection,prompt(){},scrollY:0};
  const context=vm.createContext({document,window,navigator:{clipboard:{writeText:t=>{clipboard.push(t);return Promise.resolve();}},share:p=>{shares.push(p);return Promise.resolve();}},localStorage,URL,Date,console,setTimeout:(f,ms)=>{const t={f,ms,cancelled:false};timers.push(t);return t;},clearTimeout:t=>{if(t)t.cancelled=true;}});
  function loadHelper(){if(helperRaw)vm.runInContext(helperRaw,context);}
  loadHelper();
  for(const body of Object.values(consumers))vm.runInContext(body,context);
  vm.runInContext('setupCopyAttribution();setupSelectionPopup();setupCopyButtons();setupSegmentShareActions();',context);
  vm.runInContext('('+v2Copy+')()',context);
  // getTorahSource is a presentation closure only; actual v2 copy callback stays exact.
  context.getTorahSource=()=>document.querySelector('.reader-container').dataset.torahTitle;
  function dispatch(type,target=document,extra={}) {
    const e={type,target,prevented:false,stopped:false,immediate:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.immediate=true;this.stopped=true;},...extra};
    const chain=[];for(let n=target.n;n;n=n.parentNode)chain.push(wrap(n));
    // Native dispatch on a detached subtree never reaches Document capture.
    const invoke=(el,capture)=>{for(const h of el.handlers[type]||[]){if(h.capture===capture){h.f.call(el,e);if(e.immediate)break;}}};
    for(const el of [...chain].reverse()){invoke(el,true);if(e.stopped)return e;}
    for(const el of chain){invoke(el,false);if(e.stopped)return e;}
    return e;
  }
  function flush(){while(timers.length){const batch=timers.splice(0).sort((a,b)=>a.ms-b.ms);for(const t of batch)if(!t.cancelled)t.f();}}
  const boundaries=new Map();let offset=0;
  function measure(n){const start=offset;if(n.nodeName==='#text')offset+=n.value.length;else for(const c of n.childNodes||[])measure(c);boundaries.set(n,{start,end:offset});}
  measure(document.n);
  function range(start,end) {
    const a=boundaries.get(start.n),b=boundaries.get(end.n);
    const lo=Math.min(a.start,b.start),hi=Math.max(a.end,b.end);
    const first=a.start<=b.start?start:end,last=a.start<=b.start?end:start;
    return {startContainer:first,endContainer:last,startOffset:0,endOffset:last.n.nodeName==='#text'?last.n.value.length:(last.n.childNodes||[]).length,collapsed:lo===hi,cloneRange(){return {...this};},intersectsNode(node){const p=boundaries.get(node.n);return !!p&&lo<p.end&&hi>p.start;},getBoundingClientRect:()=>({top:0,left:0,width:100})};
  }
  function select(start,end=start,{reverse=false,ranges=null,notify=true}={}) {
    const rs=ranges||[range(start,end)];
    const ordered=all(document.n).filter(n=>n.nodeName==='#text');
    const content=rs.map(r=>ordered.filter(n=>r.intersectsNode(wrap(n))).map(n=>n.value).join('')).join('');
    selection={anchorNode:reverse?end:start,focusNode:reverse?start:end,isCollapsed:false,rangeCount:rs.length,getRangeAt:i=>rs[i],toString:()=>content,removeAllRanges(){selection={isCollapsed:true,rangeCount:0,toString:()=>''};dispatch('selectionchange');}};
    if(notify)dispatch('selectionchange');return selection;
  }
  function copy(){let copied=null;const writes=[];const e=dispatch('copy',document,{clipboardData:{setData:(k,t)=>{assert.equal(k,'text/plain');copied=t;writes.push(t);}}});return {copied,writes,e};}
  const popup=document.querySelector('.selection-popup');
  return {document,warning,window,loadHelper,select,range,copy,dispatch,flush,popup,clipboard,shares,local,localStorage,context,timers,getSelection:()=>selection,clearSelection(){selection={isCollapsed:true,rangeCount:0,toString:()=>''};dispatch('selectionchange');}};
}
export { setup, functions, v2Raw, output, sha };
function unsafeCase(kind) {
  const s=setup(),p=s.document.querySelector('#seg-152 .segment-he p'),w=s.warning.querySelector('p');
  if(kind==='warning-only')s.select(w);
  else if(kind==='mixed-forward')s.select(w,p);
  else if(kind==='mixed-reverse')s.select(w,p,{reverse:true});
  else if(kind==='spanning-no-warning-endpoint')s.select(s.document.querySelector('.reader-header h1'),p,{reverse:true});
  else if(kind==='multi-range')s.select(p,p,{ranges:[s.range(p,p),s.range(w,w)]});
  return s;
}
for(const kind of ['warning-only','mixed-forward','mixed-reverse','spanning-no-warning-endpoint','multi-range']) {
  test(`${kind}: actual both native Copy consumers cannot append canonical attribution`,()=>{
    const s=unsafeCase(kind),plain=s.getSelection().toString();const {copied,writes}=s.copy();
    actionObservations.push({kind,action:'native-copy',plainSha256:sha(plain),writes:writes.map(text=>({sha256:sha(text),bookAttributed:text!==plain})),attributed:copied!==plain});
    assert.equal(copied,plain,'warning-bearing copy must remain plain, never book-attributed');
    assert.ok(writes.every(text=>text===plain));
  });
  test(`${kind}: actual generic popup hidden; stale Copy/Share/MySefer rejected on capture event path`,()=>{
    const s=unsafeCase(kind);s.dispatch('mouseup',s.document);s.flush();
    const displayed=s.popup.style.display;
    const displays=[];
    for(const action of ['copy','share','mysefer']){
      s.popup.style.display='flex';s.popup.querySelector(`[data-action="${action}"]`).click();displays.push(s.popup.style.display);
    }
    const entries=JSON.parse(s.localStorage.getItem('ajew-my-sefer')||'{"sections":[]}').sections;
    actionObservations.push({kind,action:'popup',displayed,clipboardExports:s.clipboard.map(text=>({sha256:sha(text),containsWarning:text.includes('Translation review warning:')})),shares:s.shares.map(p=>({textSha256:sha(p.text),url:p.url,containsWarning:p.text.includes('Translation review warning:')})),savedEntries:entries.map(e=>({source:e.source,contentSha256:sha(e.content),containsWarning:e.content.includes('Translation review warning:')}))});
    assert.notEqual(displayed,'flex','annotation selection must not expose canonical popup');
    assert.ok(displays.every(d=>d==='none'));assert.equal(s.clipboard.length,0);assert.equal(s.shares.length,0);assert.equal(s.local.size,0);
  });
}
test('fresh canonical generic selections 152/154 retain actual attribution and Copy/Share/MySefer semantics',()=>{
  for(const id of [152,154])for(const reverse of [false,true]){
    const s=setup(),p=s.document.querySelector(`#seg-${id} .segment-he p`);const selected=s.select(p,p,{reverse}).toString();
    const copied=s.copy().copied;assert.ok(copied.startsWith(selected));assert.ok(copied.includes('ajew.org'));
    s.dispatch('mouseup');s.flush();assert.equal(s.popup.style.display,'flex');
    s.popup.querySelector('[data-action="copy"]').click();assert.equal(s.clipboard.at(-1),selected);
    s.popup.querySelector('[data-action="share"]').click();assert.equal(s.shares.at(-1).text,selected);
    s.popup.querySelector('[data-action="mysefer"]').click();const entry=JSON.parse(s.localStorage.getItem('ajew-my-sefer')).sections.at(-1);
    assert.equal(entry.content,selected);assert.equal(entry.source,s.window.location.href);assert.ok(!entry.content.includes('Translation review warning:'));
  }
});
test('paragraph actions 152/154 unaffected even with an unsafe current selection',()=>{
  for(const id of [152,154]){
    const s=unsafeCase('mixed-reverse'),pair=s.document.querySelector(`#seg-${id}`);
    const buttons=pair.querySelector('.ajew-segment-actions').querySelectorAll('button');
    pair.querySelector('.seg-copy-btn').click();assert.ok(!s.clipboard.at(-1).includes('Translation review warning:'));
    buttons[0].click();assert.ok(!s.shares.at(-1).text.includes('Translation review warning:'));
    buttons[1].click();const entry=JSON.parse(s.localStorage.getItem('ajew-my-sefer')).sections.at(-1);
    assert.equal(entry.source,`https://ajew.org/reader/aitzoas-yeshuroas/1/4#seg-${id}`);
    for(const lang of ['he','en'])assert.ok(entry.content.includes(pair.querySelector(`.segment-${lang} p`).textContent.replace(/\s+/g,' ').trim()));
    assert.ok(!entry.content.includes('Translation review warning:'));
  }
});
test('stale popup from safe selection then unsafe, before queued mouseup completion, cannot store warning',()=>{
  const s=setup(),p=s.document.querySelector('#seg-152 .segment-he p');s.select(p);s.dispatch('mouseup');
  s.select(s.warning.querySelector('p'),p,{reverse:true});s.flush();assert.equal(s.popup.style.display,'none');
  s.popup.querySelector('[data-action="mysefer"]').click();assert.equal(s.local.size,0);
  s.select(p);s.dispatch('mouseup');s.flush();assert.equal(s.popup.style.display,'flex');
  s.select(s.warning.querySelector('p'),p,{reverse:true,notify:false});
  s.popup.querySelector('[data-action="share"]').click();assert.equal(s.shares.length,0);
  s.select(p);s.dispatch('mouseup');s.flush();assert.equal(s.popup.style.display,'flex');
  s.clearSelection();s.popup.querySelector('[data-action="mysefer"]').click();assert.equal(s.local.size,0);
});
test('helper is route-only, no-warning no-op, and idempotent without weakening positive source selection',()=>{
  for(const options of [{withoutWarning:true},{foreignRoute:true}]){
    const s=setup(options),count=(s.document.handlers.copy||[]).length;assert.equal(count,2,'only actual original copy handlers');
    s.loadHelper();assert.equal((s.document.handlers.copy||[]).length,count);
  }
  const s=setup(),before=Object.fromEntries(Object.entries(s.document.handlers).map(([k,v])=>[k,v.length]));
  s.loadHelper();assert.deepEqual(Object.fromEntries(Object.entries(s.document.handlers).map(([k,v])=>[k,v.length])),before);
  const p=s.document.querySelector('#seg-154 .segment-he p');s.select(p);s.dispatch('mouseup');s.flush();assert.equal(s.popup.style.display,'flex');
});
test('range retrieval errors fail closed for generic actions but recover for a fresh real source range',()=>{
  const s=setup(),p=s.document.querySelector('#seg-152 .segment-he p');s.select(p);
  s.getSelection().getRangeAt=()=>{throw new Error('detached range');};s.dispatch('mouseup');s.flush();assert.notEqual(s.popup.style.display,'flex');
  s.popup.querySelector('[data-action="mysefer"]').click();assert.equal(s.local.size,0);
  s.select(p);s.dispatch('mouseup');s.flush();assert.equal(s.popup.style.display,'flex');
});
test('actual emitted route loads exact versioned helper before unchanged defer Reader scripts; warning stays visible accessible and source-excluded',()=>{
  assert.ok(helperReferenced,'route-only helper must be emitted');
  assert.ok(html.indexOf(helperURL)<html.indexOf('/reader-script.js?'));
  assert.ok(html.indexOf(helperURL)<html.indexOf('/reader-v2.js'));
  const s=setup();assert.equal(s.warning.n.attrs.find(a=>a.name==='role').value,'note');
  assert.equal(s.warning.n.attrs.find(a=>a.name==='aria-label').value,'Translation review warning');
  assert.ok(s.warning.textContent.includes('known to be mismatched'));assert.ok(s.warning.textContent.includes('אינו תואם'));
  assert.ok(s.document.querySelector('.reader-container').contains(s.warning));assert.ok(!s.document.querySelector('.reader-content').contains(s.warning));
});
process.on('exit',()=>{
  fs.writeFileSync(path.join(output,'qualification-summary.json'),JSON.stringify({assembly:'actual qualified Astro SSR, parse5 HTML, exact AST-extracted unchanged callbacks from BOTH shared runtimes, capture/target/bubble event-path rehearsal and interval-based Selection/Range fixtures; no full init/native/browser/pixels/physical clipboard',sourceRoot:root,helperReferenced,actionObservations,helperSha256:helperRaw?sha(helperRaw):null,functionPins,runtime:{node:process.version,execPath:process.execPath,execArgv:process.execArgv,compiler:require('@astrojs/compiler/package.json').version,astro:require('astro/package.json').version},maxRssKiB:process.resourceUsage().maxRSS,inputs:[...inputs.values()],consumedInputsConservedAfterRun:[...inputs.values()].every(r=>sha(fs.readFileSync(r.path))===r.sha256)},null,2));
  if(!evidence)fs.rmSync(output,{recursive:true,force:true});
});
