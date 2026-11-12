import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/pages/reader/sefer-hamidos/[part]/[torah].astro', import.meta.url), 'utf8');
// This conditional template's global style stays inline in emitted HTML.
// Native checks bind its actual cascade; inspect the unique owning block here.
const blocks = [...source.matchAll(/<style\s+is:global>([\s\S]*?)<\/style>/g)];
assert.equal(blocks.length, 1, 'Expected the actual owning global style block');
const css = blocks[0][1].replace(/\/\*[\s\S]*?\*\//g, '');
function declarations(selector, within = css) {
  const start = within.indexOf(selector + '{');
  assert(start >= 0, 'Missing compiled rule: ' + selector);
  const body = within.slice(start + selector.length + 1, within.indexOf('}', start));
  return Object.fromEntries(body.split(';').filter(part => part.includes(':')).map(part => {
    const colon = part.indexOf(':');
    return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()];
  }));
}

test('mobile preview card fits its actual scroller including padding and border', () => {
  const mobileStart = css.search(/@media\s*\(max-width:\s*700px\)/);
  assert(mobileStart >= 0, 'Missing owning mobile breakpoint');
  const card = declarations('.sh-media-card', css.slice(mobileStart));
  assert.equal(card.flex.replace(/\s/g, ''), '00min(86vw,100%)');
  assert.equal(card['max-width'].replace(/\s/g, ''), 'min(86vw,100%)');
  assert.equal(card['box-sizing'], 'border-box');
  assert.equal(card['min-width'], '0');
});

test('intrinsic grid sizing cannot widen the strip and pictures retain their full aspect ratio', () => {
  assert.equal(declarations('.sh-media-body')['min-width'], '0');
  const strip = declarations('.sh-media-strip');
  assert.equal(strip['min-width'], '0');
  assert.equal(strip['max-width'], '100%');
  assert.equal(strip['box-sizing'], 'border-box');
  assert.equal(strip['overflow-x'], 'auto');
  assert.equal(strip['scroll-snap-type'], 'x mandatory');
  const image = declarations('.sh-media-card img');
  assert.equal(image.width, '100%');
  assert.equal(image.height, 'auto');
});

// Execute the exact owning viewport gate, not a separately reimplemented scheduler.
const gateStart = source.indexOf('          // Gate strip images by the document viewport');
const gateEnd = source.indexOf("          Array.prototype.forEach.call(document.querySelectorAll('.sh-media-card img')", gateStart);
assert(gateStart >= 0 && gateEnd > gateStart, 'Missing exact lazy-picture gate');
function pictureGate(hasObserver = true) {
  const timers = new Map(), panels = [0, 1, 2].map(index => ({
    index, rect: {top: index * 2000, bottom: index * 2000 + 100},
    image: {src: '', pending: '/exact-' + index + '.png', getAttribute(){return this.pending;}, removeAttribute(){this.pending = null;}},
    querySelectorAll(){return this.image.pending ? [this.image] : [];},
    getBoundingClientRect(){return this.rect;}
  }));
  let next = 0, callback, options; const unobserved = [], observed = [];
  const window = {innerHeight: 844};
  const context = {window, document:{querySelectorAll:()=>panels},
    setTimeout(fn,ms){assert.equal(ms,200);timers.set(++next,fn);return next;},clearTimeout(id){timers.delete(id);}};
  if(hasObserver){window.IntersectionObserver = true;context.IntersectionObserver=class {
    constructor(cb,opts){callback=cb;options=opts;} observe(p){observed.push(p.index);} unobserve(p){unobserved.push(p.index);}
  };}
  vm.runInNewContext(source.slice(gateStart,gateEnd), context);
  return {panels, timers, options, observed, unobserved,
    entry:(index,isIntersecting)=>callback([{target:panels[index],isIntersecting}]),
    dwell(){const current=[...timers];timers.clear();for(const [,fn] of current)fn();}};
}
test('strip images have no parser-visible source and preserve the exact noscript original',()=>{
  const line=source.match(/<img data-sh-src=\{img.path\}[^>]+\/>/g);assert.equal(line?.length,1);
  assert(!/\ssrc=/.test(line[0]));
  assert(source.includes('<noscript>'+line[0].replace('data-sh-src=','src=')+'</noscript>'));
  assert(source.includes('.sh-media-card img[data-sh-src]{display:none;}'));
  assert.equal((source.match(/<details open class="reader-media-dropdown sefer-hamidos-media"/g)||[]).length,1);
});
test('stable near panel hydrates exact source after 200ms and only once',()=>{
  const s=pictureGate();assert.equal(s.options.rootMargin,'600px 0px');assert.deepEqual(s.observed,[0,1,2]);
  s.entry(0,true);assert.equal(s.panels[0].image.src,'');assert.equal(s.timers.size,1);s.dwell();
  assert.equal(s.panels[0].image.src,'/exact-0.png');assert.equal(s.panels[0].image.pending,null);assert.deepEqual(s.unobserved,[0]);
  assert.equal(s.panels[1].image.src,'');
});
test('automatic pass-through exit cancels pending hydration and stale bounds refuse',()=>{
  const s=pictureGate();s.entry(0,true);s.entry(0,false);s.dwell();assert.equal(s.panels[0].image.src,'');
  s.entry(0,true);s.panels[0].rect={top:-3000,bottom:-2000};s.dwell();assert.equal(s.panels[0].image.src,'');assert.equal(s.unobserved.length,0);
});
test('ordinary forward and backward panel arrival hydrates newly near pictures',()=>{
  const s=pictureGate();for(const index of [1,2,0]){s.panels[index].rect={top:100,bottom:600};s.entry(index,true);s.dwell();assert.equal(s.panels[index].image.src,'/exact-'+index+'.png');}
  assert.deepEqual(s.unobserved,[1,2,0]);
});
test('browsers without IntersectionObserver keep all exact image sources available',()=>{
  const s=pictureGate(false);for(const p of s.panels)assert.equal(p.image.src,'/exact-'+p.index+'.png');assert.equal(s.timers.size,0);
});
