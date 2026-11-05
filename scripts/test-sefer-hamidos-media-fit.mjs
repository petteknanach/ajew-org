import test from 'node:test';
import assert from 'node:assert/strict';
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
