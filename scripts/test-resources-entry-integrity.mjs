// Run: node --test --test-reporter=tap --test-concurrency=1 scripts/test-resources-entry-integrity.mjs
// Portable source regression: built-in Node modules only, no private evidence paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const bytes = readFileSync(new URL('../src/pages/resources.astro', import.meta.url));
const source = bytes.toString('utf8');
const broken = '/reader/likutay-moharan/2/46#seg-17';
const canonical = '/reader/likutay-moharan/2/46';
const targetTitle = 'Likutay Moharan II:46 — The Walls Are Only an Illusion';
const hash = value => createHash('sha256').update(value).digest('hex');
const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
// Execute only the page's trusted, declarative frontmatter without its Layout import.
const model = JSON.parse(JSON.stringify(vm.runInNewContext(
  frontmatter.replace(/^import Layout from '\.\.\/layouts\/Layout\.astro';\r?$/m, '') +
  '\n;({ sections, jsonLd })', {}, { timeout: 1000 }
)));
const cards = model.sections.flatMap(section => section.links);
const sectionIds = ['featured', 'hosted-study', 'study', 'practice', 'media', 'extras'];

test('LM II:46 teaching entry uses the canonical document without an invented fragment', () => {
  const targets = cards.filter(card => card.title === targetTitle);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].href, canonical);
  assert.equal(new URL(targets[0].href, 'https://ajew.org').hash, '');
  assert.equal(source.includes(broken), false);
});

test('all six sections and 57 cards retain their original order and counts', () => {
  assert.deepEqual(model.sections.map(section => section.id), sectionIds);
  assert.deepEqual(model.sections.map(section => section.links.length), [10, 5, 10, 6, 18, 8]);
  assert.equal(cards.length, 57);
  for (const card of cards) {
    for (const field of ['title', 'he', 'href', 'icon', 'desc']) {
      assert.equal(typeof card[field], 'string');
      assert.ok(card[field].length > 0, field);
    }
  }
});

test('every original field, section metadata and the other 56 hrefs are conserved', () => {
  const normalized = structuredClone(model.sections);
  for (const section of normalized) for (const card of section.links) {
    if (card.title === targetTitle && card.href === broken) card.href = canonical;
  }
  // Digest covers all fields, including icons, external flags, full Hebrew/English and order.
  assert.equal(hash(JSON.stringify(normalized)),
    '29e9e41a5da62bf6f27d6944543f5278905c506375023f99f9af3c55668883bb');
});

test('JSON-LD lists every ordered title and actual href exactly once with exact positions', () => {
  assert.equal(model.jsonLd['@type'], 'CollectionPage');
  assert.equal(model.jsonLd.mainEntity['@type'], 'ItemList');
  assert.equal(model.jsonLd.mainEntity.numberOfItems, 57);
  assert.deepEqual(model.jsonLd.mainEntity.itemListElement, cards.map((card, index) => ({
    '@type': 'ListItem', position: index + 1, name: card.title,
    url: card.href.startsWith('http') ? card.href : `https://ajew.org${card.href}`
  })));
});

test('six jump links retain their source mapping and section heading targets', () => {
  assert.ok(source.includes('{sections.map(section => <a href={`#${section.id}`}>{section.icon} {section.title}</a>)}'));
  assert.ok(source.includes('<section id={section.id} class="resource-section" aria-labelledby={`${section.id}-title`}>'));
  assert.ok(source.includes('<h2 id={`${section.id}-title`}>{section.title}</h2>'));
  assert.deepEqual(model.sections.map(section => `#${section.id}`), sectionIds.map(id => `#${id}`));
});

test('exact inverse restores the entire original source including CRLF, markup and styles', () => {
  assert.equal(Buffer.from(source, 'utf8').equals(bytes), true);
  const oldToken = `href: '${broken}'`;
  const newToken = `href: '${canonical}'`;
  const restored = source.includes(oldToken) ? source : source.replace(newToken, oldToken);
  assert.equal(hash(Buffer.from(restored, 'utf8')),
    '4de29359f2112745d09f5864b4014304dd077edde8d5496e7ecae930f9706c4a');
});
