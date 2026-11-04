import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from '@astrojs/compiler';

const source = await readFile(new URL('../src/components/CompactYahrzeit.astro', import.meta.url), 'utf8');
const result = await transform(source, {
  filename: 'src/components/CompactYahrzeit.astro',
  scopedStyleStrategy: 'attribute',
});
const css = result.css.map(part => typeof part === 'string' ? part : part.code).join('\n');
const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...cleanCSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.trim().split(',').map(selector => selector.trim()),
  declarations: Object.fromEntries(body.split(';').filter(part => part.includes(':')).map(part => {
    const colon = part.indexOf(':');
    return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()];
  })),
}));
const dynamicClasses = ['tzaddik-link', 'tzaddik-name', 'tzaddik-hebrew', 'upcoming-event', 'next-big-date', 'event-description', 'countdown-badge', 'event-type', 'birth-badge', 'special-badge', 'yahrzeit-badge'];

function ownedDescendant(selector, name, hover = false) {
  return new RegExp('^\\.compact-yahrzeit\\[data-astro-cid-[a-zA-Z0-9-]+\\]\\s+\\.' + name + (hover ? ':hover' : '') + '$').test(selector.trim());
}
function declarations(name, hover = false) {
  return Object.assign({}, ...rules.filter(rule => rule.selectors.some(selector => ownedDescendant(selector, name, hover))).map(rule => rule.declarations));
}
function luminance(hex) {
  assert.match(hex, /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
  const full = hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
  const values = [1, 3, 5].map(index => parseInt(full.slice(index, index + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function assertContrast(foreground, background, label) {
  const [dark, light] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  assert((light + 0.05) / (dark + 0.05) >= 4.5, label + ': ' + foreground + ' on ' + background);
}

test('runtime-created rows match emitted CSS without a descendant Astro attribute', () => {
  for (const name of dynamicClasses) {
    assert.match(css, new RegExp('\\.compact-yahrzeit\\[data-astro-cid-[^\\]]+\\]\\s+\\.' + name + '(?:[:\\s{])'), name);
    assert.doesNotMatch(css, new RegExp('\\.' + name + '(?::hover)?\\[data-astro-cid-'), name + ' requires an attribute the renderer never creates');
  }
  assert.equal(declarations('tzaddik-link').display, 'flex');
  assert.equal(declarations('tzaddik-link')['flex-direction'], 'column');
  assert.equal(declarations('tzaddik-link')['overflow-wrap'], 'anywhere');
});

test('readable type and every emitted dynamic selector stay inside the calendar', () => {
  for (const [name, size] of [['tzaddik-name', '0.875rem'], ['tzaddik-hebrew', '0.875rem'], ['event-description', '0.8125rem'], ['countdown-badge', '0.75rem']]) {
    assert.equal(declarations(name)['font-size'], size, name);
  }
  for (const name of dynamicClasses) {
    const token = new RegExp('\\.' + name + '(?=$|[\\s:{,.])');
    const selectors = rules.flatMap(rule => rule.selectors).filter(selector => token.test(selector));
    assert(selectors.length > 0, name);
    for (const selector of selectors) assert(ownedDescendant(selector, name) || ownedDescendant(selector, name, true), selector + ' is not an owner-bounded descendant');
  }
});

test('containment guard rejects sibling escape, missing scope and extra targets', () => {
  const owner = '.compact-yahrzeit[data-astro-cid-test]';
  assert(ownedDescendant(owner + ' .tzaddik-name', 'tzaddik-name'));
  for (const selector of [owner + ' + .tzaddik-name', owner + ' ~ .tzaddik-name', '.compact-yahrzeit .tzaddik-name', owner + ' .tzaddik-name + div', owner + ' .tzaddik-name, .tzaddik-name']) {
    assert(!ownedDescendant(selector, 'tzaddik-name'), selector);
  }
});

test('winning label colors meet normal-text AA on normal and hover row backgrounds', () => {
  for (const variant of ['', 'upcoming-event', 'next-big-date']) {
    const normal = { ...declarations('tzaddik-link'), ...(variant ? declarations(variant) : {}) };
    const hover = { ...normal, ...declarations('tzaddik-link', true), ...(variant ? declarations(variant, true) : {}) };
    for (const [state, row] of [['normal', normal], ['hover', hover]]) {
      for (const name of ['tzaddik-name', 'tzaddik-hebrew', 'event-description']) {
        assertContrast(declarations(name).color, row.background, [variant || 'standard', state, name].join('/'));
      }
    }
  }
  for (const name of ['countdown-badge', 'birth-badge', 'special-badge', 'yahrzeit-badge']) {
    const label = declarations(name);
    assertContrast(label.color, label.background, name);
  }
});
