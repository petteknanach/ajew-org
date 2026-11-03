'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const vm = require('node:vm');
const {webcrypto, createHash} = require('node:crypto');
const script = readFileSync(resolve(__dirname, '../static/share.js'), 'utf8');
const raw = readFileSync(resolve(__dirname, 'fixtures/yom-kippur-illustrated-eacf29734e2c.json'));
const payload = JSON.parse(raw);
const hash = 'eacf29734e2c5965c0704beaa45f791519745ce32ff1418d7860f88a9c097ef3';
const path = '/blog/p/6cf48f1f8a6644a18543a6e966082bd5/';
// Deliberately tiny DOM adapter: actual candidate initialization runs unchanged in vm.
// This is logic/DOM-identity coverage, not an image-decoding or visual-browser claim.
class Element {
  constructor(tag) { this.nodeType = 1; this.tagName = tag.toUpperCase(); this.childNodes = []; this.parentNode = null; this.style = {}; this.attrs = {}; }
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
  set textContent(text) { this.childNodes = [{nodeType: 3, textContent: String(text)}]; }
  get isConnected() { return this.parentNode ? this.parentNode.isConnected : this.tagName === 'ROOT'; }
  setAttribute(k, v) { this.attrs[k] = v; }
  append(...nodes) { for (const n of nodes) { assert.equal(n.parentNode, null, 'original nodes must never be moved'); n.parentNode = this; this.childNodes.push(n); } }
  after(n) { const p = this.parentNode; assert.ok(p); assert.equal(n.parentNode, null); n.parentNode = p; p.childNodes.splice(p.childNodes.indexOf(this) + 1, 0, n); }
}
function descendants(n) { return [n, ...n.children.flatMap(descendants)]; }
function fixture(options = {}) {
  const root = new Element('root');
  const article = new Element('article');
  const title = new Element('h1'); title.textContent = options.title ?? payload.source_title;
  root.append(title, article);
  const originals = payload.source_paragraphs.map(text => {
    const p = new Element('p');
    text.split('\n').forEach((part, i) => {
      if (i) p.append(new Element('br'));
      p.childNodes.push({nodeType: 3, textContent: part});
    });
    article.append(p); return p;
  });
  if (options.change) options.change({root, article, title, originals});
  const before = originals.map(p => ({p, children: p.childNodes.slice(), text: p.textContent}));
  let fetches = 0, domCalls = 0; const errors = [], listeners = [], writes = [];
  const document = {
    addEventListener(type, callback) { listeners.push({type, callback}); },
    querySelectorAll(selector) { domCalls++; return selector === 'article.blog-post.post-card' ? [article] : [title]; },
    getElementById(id) { domCalls++; return descendants(root).find(n => n.id === id) || null; },
    createElement(tag) { domCalls++; return new Element(tag); }
  };
  const context = vm.createContext({document,
    location: {pathname: options.path ?? path, origin: 'https://ajew.org'},
    navigator: {clipboard: {async writeText(value) { if (options.clipboardError) throw Error('denied'); writes.push(value); }}},
    crypto: options.crypto ?? webcrypto, TextDecoder, URL,
    console: {error(...args) { errors.push(args); }},
    fetch: async (url, init) => {
      fetches++; assert.equal(url, '/blog/media/yom-kippur-illustrated-eacf29734e2c.json');
      assert.deepEqual(JSON.parse(JSON.stringify(init)), {mode:'same-origin', credentials:'omit', cache:'no-store', redirect:'error'});
      if (options.fetchError) throw Error('network failed');
      if (options.duringFetch) options.duringFetch({originals, title});
      if (options.wait) await options.wait;
      return new Response(options.body ?? raw, {status: options.status ?? 200, headers: {'content-type': options.mime ?? 'application/json; charset=utf-8'}});
    }
  });
  return {root, article, originals, before, errors, writes, listeners,
    run: () => vm.runInContext(script, context),
    fetches: () => fetches, domCalls: () => domCalls,
    unchanged() {
      for (const b of before) { assert.equal(b.p.textContent, b.text); assert.deepEqual(b.p.childNodes, b.children); assert.equal(b.p.parentNode, article); }
      assert.deepEqual(article.children.filter(n => n.tagName === 'P'), originals);
    },
    intact() { this.unchanged(); assert.equal(article.children.length, 43); assert.equal(root.children.length, 2); }
  };
}
test('original 327-byte copy-link handler preserved byte-for-byte', () => {
  assert.equal(createHash('sha256').update(Buffer.from(script).subarray(0, 327)).digest('hex'), 'fc1725bebb5d856301e00fd7af886631fb849230bb7ab3a1410fd4d9ec9fb1ef');
  assert.equal(createHash('sha256').update(raw).digest('hex'), hash);
});
for (const pathname of [path, path.slice(0,-1)]) test('actual initialization: images and Hebrew, original identities unchanged ' + pathname, async () => {
  const f = fixture({path: pathname}); assert.equal(await f.run(), true); f.unchanged();
  assert.equal(f.fetches(), 1); assert.equal(f.errors.length, 0);
  assert.equal(f.article.children.length, 45);
  [6,34].forEach((index, i) => {
    const figure = f.article.children[f.article.children.indexOf(f.originals[index])+1];
    assert.equal(figure.tagName, 'FIGURE'); const img = figure.children[0];
    assert.equal(img.tagName, 'IMG'); assert.equal(img.src, payload.images[i].url);
    assert.equal(img.width, 900); assert.equal(img.height, 820); assert.equal(img.alt, payload.images[i].alt);
    assert.match(img.style.cssText, /width:100%.*max-width:900px.*height:auto/);
    assert.equal(figure.children[1].textContent, payload.images[i].caption);
  });
  const section = f.root.children[f.root.children.indexOf(f.article)+1];
  assert.equal(section.id, 'yom-kippur-hebrew-translation'); assert.equal(section.lang, 'he'); assert.equal(section.dir, 'rtl');
  assert.equal(section.children.length, 44); assert.equal(section.children[0].textContent, payload.hebrew_title);
  section.children.slice(1).forEach((n,i) => { assert.equal(n.textContent, payload.hebrew_paragraphs[i]); assert.equal(n.tagName, payload.heading_indexes.includes(i) ? 'H2' : 'P'); assert.match(n.style.cssText, /font-size:24px/); });
  await f.run(); assert.equal(f.fetches(),1); assert.equal(f.article.children.length,45); assert.equal(f.root.children.length,3);
});
test('concurrent initialization fetches exactly once', async () => {
  let release; const wait = new Promise(r => {release=r;}); const f=fixture({wait});
  const first=f.run(); await f.run(); assert.equal(f.fetches(),1); release(); assert.equal(await first,true); f.unchanged();
});
for (const pathname of ['/blog/', '/blog/write/', '/blog/p/other/', path+'extra', '/BLOG/p/6cf48f1f8a6644a18543a6e966082bd5/']) test('negative path zero enrichment DOM work/fetch: '+pathname, async () => {
  const f=fixture({path:pathname}); await f.run(); assert.equal(f.fetches(),0); assert.equal(f.domCalls(),0); f.intact();
});
for (const [name,options] of [
  ['title', {title:'Edited title'}],
  ['prose', {change:({originals})=>{originals[5].textContent+=' edited';}}],
  ['order', {change:({article})=>{[article.childNodes[4],article.childNodes[5]]=[article.childNodes[5],article.childNodes[4]];}}],
  ['paragraph count', {change:({article})=>{article.append(new Element('p'));}}],
  ['unexpected inline HTML', {change:({originals})=>{originals[3].append(new Element('em'));}}],
  ['BR structure', {change:({originals})=>{originals[3].append(new Element('br'));}}]
]) test('source mismatch rejects before fetch: '+name, async () => {
  const f=fixture(options); const count=f.article.children.length; await f.run(); assert.equal(f.fetches(),0); assert.equal(f.article.children.length,count); assert.equal(f.root.children.length,2);
});
for (const [name,options] of [
  ['network',{fetchError:true}], ['HTTP error',{status:404}], ['HTML fallback MIME',{mime:'text/html'}],
  ['malformed JSON',{body:'{'}], ['tampered bytes',{body:Buffer.concat([raw,Buffer.from(' ')])}],
  ['wrong schema',{body:JSON.stringify({...payload,schema:2})}]
]) test('failed sidecar leaves original intact, failure visible: '+name, async () => {
  const f=fixture(options); assert.equal(await f.run(),false); f.intact(); assert.equal(f.fetches(),1); assert.equal(f.errors.length,1);
});
// Deliberately bypass only digest in these unit cases to reach defense-in-depth schema checks.
const bypassDigest={subtle:{digest: async()=>Buffer.from(hash,'hex')}};
for (const [name,mutate] of [
  ['post id',d=>{d.post_id='other';}], ['source version',d=>{d.source_version=3;}], ['body hash',d=>{d.source_body_sha256='0'.repeat(64);}],
  ['source title',d=>{d.source_title='other';}], ['source paragraphs',d=>{d.source_paragraphs[1]='other';}],
  ['Hebrew count',d=>{d.hebrew_paragraphs.pop();}], ['Hebrew type',d=>{d.hebrew_paragraphs[3]={html:'x'};}],
  ['headings',d=>{d.heading_indexes=[0];}], ['image count',d=>{d.images.pop();}],
  ['external image',d=>{d.images[0].url='https://evil.example/x.svg';}], ['dimensions',d=>{d.images[0].width=901;}],
  ['placement',d=>{d.images[1].after_paragraph=2;}], ['extra key',d=>{d.extra=true;}]
]) test('schema defense (digest seam): '+name, async () => {
  const d=structuredClone(payload); mutate(d); const f=fixture({body:JSON.stringify(d),crypto:bypassDigest});
  assert.equal(await f.run(),false); f.intact(); assert.equal(f.errors.length,1);
});
test('source mutation during fetch fails closed', async () => {
  const f=fixture({duringFetch:({originals})=>{originals[5].textContent='edited during load';}});
  assert.equal(await f.run(),false); assert.equal(f.article.children.length,43); assert.equal(f.root.children.length,2); assert.equal(f.errors.length,1);
});
for (const fail of [false,true]) test('copy handler behavior: '+(fail?'clipboard rejected':'copied'), async () => {
  const f=fixture({path:'/blog/', clipboardError:fail}); await f.run(); assert.equal(f.listeners.length,1);
  const button={dataset:{copyLink:'https://ajew.org/blog/p/example/'},textContent:'Copy link'};
  await f.listeners[0].callback({target:{closest:()=>button}});
  assert.equal(button.textContent,fail?'Copy the page address':'Copied'); assert.deepEqual(f.writes,fail?[]:[button.dataset.copyLink]);
  await f.listeners[0].callback({target:{closest:()=>null}});
});
