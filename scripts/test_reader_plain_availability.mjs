import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, unlinkSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createReaderPlainAvailability, readerPlainAlternates } from '../src/lib/reader-plain-availability.mjs';
import { harness } from './reader_plain_dom_fixture.mjs';

const source = '/reader/book/1/2';
const section = '/reader-plain/book/actual-volume/2/';
const origin = 'https://ajew.org';
const row = (overrides = {}) => ({ sourceUrl: source, url: section, bookId: 'not-routing-authority', part: 999, torah: 'WRONG', ...overrides });
function fixture(t, entries = [row()]) {
  const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'reader-plain-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  function file(path, bytes = 'Synthetic test fixture only\n') {
    const full = join(dir, path.replace(/^\//, '')); mkdirSync(join(full, '..'), { recursive: true }); writeFileSync(full, bytes); return full;
  }
  function catalog(rows = entries) { file('/reader-plain/index.json', JSON.stringify({ total: rows.length, entries: rows })); }
  function exportsAt(base = section) { for (const ext of ['html', 'txt', 'md', 'json']) file(base + 'index.' + ext); }
  catalog(); exportsAt();
  for (const name of ['index.html', 'full.txt', 'full.md']) file('/reader-plain/book/' + name);
  const resolver = () => createReaderPlainAvailability({ publicDir: dir, site: origin });
  return { dir, file, catalog, exportsAt, resolver };
}
function declaration(access) {
  return { state: access.state, source: access.source, section: access.section?.html ?? null,
    'work-txt': access.work?.txt ?? null, 'work-md': access.work?.markdown ?? null };
}
const available = { state: 'available', source: origin + source, section: origin + section,
  'work-txt': origin + '/reader-plain/book/full.txt', 'work-md': origin + '/reader-plain/book/full.md' };
const unavailable = { state: 'unavailable', source: origin + source };
const headLinks = h => h.head.querySelectorAll('link[rel~="alternate"]');
const plainLinks = h => headLinks(h).filter(l => new URL(l.href).pathname.startsWith('/reader-plain/'));
function assertConserved(h) {
  assert.equal(h.paragraph.textContent, 'EXACT SOURCE BODY — אין שינוי');
  assert.equal(h.paragraph.parentElement, h.content);
  assert.equal(h.hold.textContent, 'Source unavailable; access remains locked.');
  assert.ok(h.control.attrs.has('disabled'));
  assert.equal(h.control.parentElement, h.group);
  assert.equal(h.youtube.parentElement, h.group);
  assert.equal(h.youtube.href, 'https://www.youtube.com/watch?v=FIXTURE0001');
  assert.ok(h.audio.parentElement);
  assert.equal(h.toolbar.parentElement, h.content.parentElement);
}

test('SSR catalog sourceUrl owns actual URL; four section files; separately checked work files', t => {
  const f = fixture(t), get = f.resolver();
  const access = get(source + '/');
  assert.equal(access.section.html, origin + section);
  assert.equal(access.source, origin + source);
  assert.equal(readerPlainAlternates(access).length, 6);
  f.catalog([]);
  assert.deepEqual(get(source), access, 'successful catalog is cached once for this build');
  f.catalog();
  f.file('/reader-plain/book/full.txt', '');
  unlinkSync(join(f.dir, '/reader-plain/book/full.md'));
  unlinkSync(join(f.dir, '/reader-plain/book/index.html'));
  const noWork = f.resolver()(source);
  assert.equal(noWork.state, 'available');
  assert.deepEqual(noWork.work, { html: null, txt: null, markdown: null });
  assert.equal(readerPlainAlternates(noWork).length, 4);
});

test('SSR locked hashmata162 and missing tape23-b/9-b absent catalog are unavailable; nonnumeric remains outside contract', t => {
  const f = fixture(t), get = f.resolver();
  for (const path of ['/reader/chayey-moharan/1/hashmata-162', '/reader/saba-tape-transcripts/1/23-b', '/reader/saba-tape-transcripts/1/9-b', '/reader/book/1/absent']) {
    const access = get(path); assert.equal(access.state, 'unavailable'); assert.equal(readerPlainAlternates(access).length, 0);
  }
  for (const path of ['/reader/chayey-moharan/siman/14', '/reader/sichos-haran/reviewed/271-280/', '/reader/custom/export/', '/reader/book/1/2/extra', '/other']) assert.equal(get(path), null);
});

test('SSR full source URL admission, exact identity, trailing slash only; current volume4 contract', t => {
  const f = fixture(t, [row({ sourceUrl: origin + source + '/' }), row({ sourceUrl: '/reader/likutay-nanach/4/16', url: '/reader-plain/likutay-nanach/volume-4/16/' })]);
  f.exportsAt('/reader-plain/likutay-nanach/volume-4/16/');
  const get = f.resolver();
  assert.equal(get(source).state, 'available');
  assert.equal(get('/reader/likutay-nanach/4/16/').section.html, origin + '/reader-plain/likutay-nanach/volume-4/16/');
  assert.equal(get('/reader/likutay-nanach/04/16').state, 'unavailable', 'no numeric coercion');
});

test('SSR duplicate exact choices dedupe; conflicting or unsafe choices fail closed for exact owner only', t => {
  const f = fixture(t, [row(), row({ sourceUrl: source + '/' }), row({ sourceUrl: origin + source })]);
  assert.equal(f.resolver()(source).state, 'available');
  for (const target of ['/reader-plain/book/other/2/', 'https://evil.test/reader-plain/book/1/2/', '/reader-plain/book/1/%2e%2e/', '/reader-plain/book/1/%252e%252e/']) {
    f.catalog([row(), row({ url: target }), row()]);
    assert.equal(f.resolver()(source).state, 'unavailable', target);
  }
});

test('SSR unsafe origin/credentials/query/hash/traversal/backslash/HTML/encoded separators never advertise', t => {
  const f = fixture(t);
  for (const bad of ['https://evil.test/reader-plain/book/1/2/', 'https://ajew.org@evil.test/reader-plain/book/1/2/', '//evil.test/reader-plain/book/1/2/', '/reader-plain/book/1/../2/', '/reader-plain/book/1/%2e%2e/', '/reader-plain/book/1/%2f/', '/reader-plain/book/1/%5c/', '/reader-plain/book/1/%00/', '/reader-plain/book/1/%GG/', '/reader-plain/book/1/2/?x=1', '/reader-plain/book/1/2/#x', '/reader-plain/book/1/2\\/', '/reader-plain/book/1/" onload="alert(1)/', '/reader-plain/book/1/<script>/']) {
    f.catalog([row({ url: bad })]); assert.equal(f.resolver()(source).state, 'unavailable', bad);
  }
  for (const badSource of ['https://evil.test' + source, source + '?x=1', '/reader/book/1/../2', '/reader/book/1/%2e%2e', '/reader/book/1/%252f']) {
    f.catalog([row({ sourceUrl: badSource })]); assert.equal(f.resolver()(source).state, 'unavailable', badSource);
  }
});

test('SSR rejects empty, missing, nonregular, file/ancestor symlink; fresh positive after corrupt fixture', t => {
  const f = fixture(t);
  for (const name of ['index.html', 'index.txt', 'index.md', 'index.json']) {
    const target = f.file(section + name, '');
    assert.equal(f.resolver()(source).state, 'unavailable');
    rmSync(target); assert.equal(f.resolver()(source).state, 'unavailable', 'missing file');
    mkdirSync(target); assert.equal(f.resolver()(source).state, 'unavailable');
    rmSync(target, { recursive: true });
    symlinkSync(f.file('/outside.txt'), target); assert.equal(f.resolver()(source).state, 'unavailable');
    unlinkSync(target); f.file(section + name);
    assert.equal(f.resolver()(source).state, 'available');
  }
  const directory = join(f.dir, section).replace(/\/$/, '');
  renameSync(directory, directory + '-real'); symlinkSync(directory + '-real', directory);
  assert.equal(f.resolver()(source).state, 'unavailable');
  unlinkSync(directory); renameSync(directory + '-real', directory);
  assert.equal(f.resolver()(source).state, 'available');
  const full = join(f.dir, '/reader-plain/book/full.txt'); unlinkSync(full); symlinkSync(f.file('/outside.txt'), full);
  assert.equal(f.resolver()(source).work.txt, null);
});

test('SSR missing/corrupt catalog is explicit prerequisite error, not all-off success, and retry is not poisoned', t => {
  const f = fixture(t), path = join(f.dir, '/reader-plain/index.json');
  unlinkSync(path); const get = f.resolver();
  assert.equal(get('/reader/manual/siman/1'), null, 'outside scope needs no generated catalog');
  assert.throws(() => get(source), /Plain reader prerequisite:.*catalog/);
  f.file('/reader-plain/index.json', '{broken'); assert.throws(() => get(source), /invalid generated catalog/);
  f.file('/reader-plain/index.json', 'null'); assert.throws(() => get(source), /invalid entries\/total/);
  f.file('/reader-plain/index.json', JSON.stringify({ entries: [], total: 1 })); assert.throws(() => get(source), /invalid entries\/total/);
  unlinkSync(path); symlinkSync(f.file('/catalog-backup.json', JSON.stringify({ total: 0, entries: [] })), path);
  assert.throws(() => get(source), /symlinked generated catalog/);
  unlinkSync(path); f.catalog(); assert.equal(get(source).state, 'available', 'same resolver fresh positive after failed prerequisite');
});

for (const loading of [false, true]) for (const order of ['core-first', 'access-first']) for (const state of ['available', 'unavailable']) {
  test(`complete exact old core + actual client: ${loading ? 'loading/DOMContentLoaded' : 'interactive/defer'}, ${order}, ${state}`, { timeout: 3000 }, async () => {
    const h = harness({ declaration: state === 'available' ? available : unavailable, loading });
    if (order === 'core-first') { h.runCore(); h.runAccess(); } else { h.runAccess(); h.runCore(); }
    if (loading) h.fireReady(); await h.settle(); assert.equal(h.coreInits(), 1);
    assert.equal(plainLinks(h).length, state === 'available' ? 6 : 0);
    if (state === 'available') {
      assert.equal(h.document.getElementById('btn-plain-text').href, available.section);
      assert.equal(h.document.getElementById('btn-plain-full-work').href, available['work-txt']);
      assert.equal(h.document.getElementById('btn-plain-text').textContent, 'Plain Section');
      assert.equal(h.document.getElementById('btn-plain-full-work').textContent, 'Full Plain Work');
    } else {
      assert.equal(h.document.getElementById('btn-plain-text'), null);
      assert.equal(h.document.getElementById('btn-plain-full-work'), null);
    }
    assertConserved(h);
    const before = h.counts(); h.fireReady(); await h.settle();
    assert.ok(h.counts().callbacks - before.callbacks <= 2);
  });
}

test('complete document/after DOMContentLoaded also reconciles either exact core load order', async () => {
  for (const decl of [available, unavailable]) for (const coreFirst of [true, false]) {
    const h = harness({ declaration: decl }); h.document.readyState = 'complete';
    if (coreFirst) { h.runCore(); h.runAccess(); } else { h.runAccess(); h.runCore(); }
    await h.settle(); assert.equal(h.coreInits(), 1);
    assert.equal(plainLinks(h).length, decl === available ? 6 : 0); assertConserved(h);
  }
});

test('edition Original — labels and arbitrary existing qualifications remain byte exact', async () => {
  const h = harness({ declaration: available, edition: true }); h.runCore();
  assert.equal(h.document.getElementById('btn-plain-text').textContent, 'Original — Plain Section');
  assert.equal(h.document.getElementById('btn-plain-full-work').textContent, 'Original — Full Plain Work');
  h.document.getElementById('btn-plain-text').textContent += ' (reviewed source qualification)';
  const label = h.document.getElementById('btn-plain-text').textContent;
  const title = h.document.getElementById('btn-plain-text').title;
  h.runAccess(); await h.settle();
  assert.equal(h.document.getElementById('btn-plain-text').textContent, label);
  assert.equal(h.document.getElementById('btn-plain-text').title, title);
  assert.equal(h.document.getElementById('btn-plain-full-work').textContent, 'Original — Full Plain Work');
  assertConserved(h);
});

test('late original core and href mutations cannot reintroduce false links; converges without loops', async () => {
  for (const decl of [available, unavailable]) {
    const h = harness({ declaration: decl }); h.runAccess(); await h.settle();
    for (let i = 0; i < 4; i++) { h.runCore(); await h.settle(); }
    assert.equal(h.coreInits(), 4);
    assert.equal(plainLinks(h).length, decl === available ? 6 : 0);
    if (decl === available) {
      const anchor = h.document.getElementById('btn-plain-text'); anchor.setAttribute('href', '/reader-plain/book/WRONG/');
      const link = plainLinks(h)[0]; link.setAttribute('href', 'https://evil.test/reader-plain/book/1/2/');
      await h.settle(); assert.equal(anchor.href, available.section); assert.equal(plainLinks(h).length, 6);
    }
    assertConserved(h);
  }
});

test('full-work absence is independent: keep section and exact label, omit only missing work formats', async () => {
  const h = harness({ declaration: { ...available, 'work-txt': null } }); h.runCore(); h.runAccess(); await h.settle();
  assert.equal(plainLinks(h).length, 5); assert.ok(h.document.getElementById('btn-plain-text'));
  assert.equal(h.document.getElementById('btn-plain-full-work'), null); assertConserved(h);
});

test('manual/reviewed/siman/custom and undeclared numeric pages stay untouched', async () => {
  for (const pathname of ['/reader/chayey-moharan/siman/14', '/reader/sichos-haran/reviewed/271-280/', '/reader/custom/export/', source]) {
    const h = harness({ pathname, declaration: pathname === source ? undefined : unavailable });
    const link = new h.Element('link'); link.rel = 'alternate'; link.type = 'text/plain'; link.href = '/reader-plain/reviewed/exact/index.txt'; h.head.append(link);
    const anchor = new h.Element('a'); anchor.id = 'btn-plain-text'; anchor.href = link.href; anchor.textContent = 'Reviewed — exact source'; h.group.append(anchor);
    const before = h.counts(); h.runAccess(); await h.settle();
    assert.equal(h.counts().mutations, before.mutations); assert.equal(anchor.textContent, 'Reviewed — exact source');
    assert.equal(anchor.href, link.href); assert.equal(link.parentElement, h.head); assertConserved(h);
  }
});

test('client rejects unsafe declaration attributes/origins/traversal/XSS; unrelated alternates survive', async () => {
  for (const bad of ['https://evil.test/reader-plain/book/1/2/', 'https://ajew.org@evil.test/reader-plain/book/1/2/', 'javascript:alert(1)', '//evil.test/reader-plain/book/1/2/', origin + '/reader-plain/book/1/../2/', origin + '/reader-plain/book/%2e%2e/2/', origin + '/reader-plain/book/1/%2f/', origin + '/reader-plain/book/1/%252f/', origin + '/reader-plain/book/1/" onload="alert(1)/', origin + '/reader-plain/book/1/%22onload%3Dalert(1)/', origin + '/reader-plain/book/1/2/?x=1']) {
    const h = harness({ declaration: { ...available, section: bad }, search: '?plain' });
    const rss = new h.Element('link'); rss.rel = 'alternate'; rss.type = 'application/rss+xml'; rss.href = '/rss.xml'; h.head.append(rss);
    const lang = new h.Element('link'); lang.rel = 'alternate'; lang.setAttribute('hreflang', 'he'); lang.href = source; h.head.append(lang);
    h.runCore(); h.runAccess(); await h.settle();
    assert.equal(plainLinks(h).length, 0, bad); assert.equal(h.redirects.length, 0);
    assert.equal(rss.parentElement, h.head); assert.equal(lang.parentElement, h.head); assertConserved(h);
  }
  for (const overrides of [{ source: 'https://evil.test' + source }, { state: 'incorrect' }]) {
    const h = harness({ declaration: { ...available, ...overrides } }); h.runCore(); h.runAccess(); await h.settle();
    assert.equal(plainLinks(h).length, 0); assertConserved(h);
  }
});

test('client catalog volume4 actual target and redirects use only individually declared available outputs', async () => {
  for (const [search, suffix] of [['?plain', ''], ['?text', 'index.txt'], ['?raw', 'index.txt'], ['?format=md', 'index.md'], ['?view=markdown', 'index.md'], ['?format=json', 'index.json']]) {
    const pathname = '/reader/likutay-nanach/4/16';
    const target = origin + '/reader-plain/likutay-nanach/volume-4/16/';
    const h = harness({ pathname, search, declaration: { state: 'available', source: origin + pathname, section: target } });
    h.runCore(); h.runAccess(); await h.settle();
    assert.equal(h.document.getElementById('btn-plain-text').href, target); assert.deepEqual(h.redirects, [target + suffix]);
  }
  for (const decl of [unavailable, { ...available, 'work-txt': null }]) {
    const h = harness({ declaration: decl, search: '?format=full' }); h.runCore(); h.runAccess(); await h.settle(); assert.equal(h.redirects.length, 0);
  }
  const h = harness({ declaration: available, search: '?plain&full' }); h.runAccess(); assert.deepEqual(h.redirects, [available['work-txt']]);
});

test('Layout explicit contract, versioned classic defer after slot, independent YouTube admission; core exact pin', () => {
  const layout = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
  assert.match(layout, /getReaderPlainAvailability\(Astro.url.pathname, Astro.site\)/);
  assert.match(layout, /name="ajew-reader-plain-access"/);
  assert.match(layout, /readerPlainAlternates\(readerPlainAccess\)/);
  assert.match(layout, /Boolean\(readerPlainMatch\) \|\|/);
  assert.doesNotMatch(layout, /const readerPlainBase|every reader page also has static|works for all reader teachings/);
  assert.equal(layout.match(/src="\/reader-plain-access.js\?v=20261023-1" is:inline defer/g)?.length, 1);
  assert.ok(layout.indexOf('src="/reader-plain-access.js') > layout.indexOf('<slot />'));
  const core = readFileSync(new URL('../public/reader-v2.js', import.meta.url));
  assert.equal(createHash('sha256').update(core).digest('hex'), '84eaa193e0410a83dc602f365712564c22609ab978d4f90122b7f055d47d4d8b');
});
