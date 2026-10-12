import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const src = fs.readFileSync(new URL('src/components/CompactYahrzeit.astro', root), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('scripts/approved-cheshvon-records.json', root), 'utf8'));
const helpers = src.slice(src.indexOf('  function normalizeMonth('), src.indexOf('  // Month order'));
const render = src.slice(src.indexOf('  function visitorEventDescription('), src.indexOf('  // Main initialization'));
const important = src.slice(src.indexOf('  const importantDates ='), src.indexOf('  let tzaddikimDatabase'));
const document = {createElement: () => ({innerHTML: '', className: ''})};
for (const filename of ['tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json']) {
  const data = JSON.parse(fs.readFileSync(new URL('public/data/' + filename, root), 'utf8'));
  test(filename + ': actual selector/render of all22 owner-approved identities', () => {
    assert.equal(data.metadata.total_count, data.all_tzaddikim.length);
    const ctx = {tzaddikimDatabase: data.all_tzaddikim, document};
    vm.createContext(ctx); vm.runInContext(important + helpers + render, ctx);
    for (const entry of manifest) {
      const row = data.all_tzaddikim.filter(r => r.cheshvon_review_id === entry.id);
      assert.equal(row.length, 1, entry.id);
      for (const [key, value] of Object.entries(entry.record)) {
        assert.equal(JSON.stringify(row[0][key]), JSON.stringify(value), entry.id + '/' + key);
      }
      ctx.entryId = entry.id; ctx.day = Number(entry.record.yahrzeit_day);
      const selected = vm.runInContext("findYahrzeits('Marcheshvan', day).filter(r=>r.cheshvon_review_id===entryId)", ctx);
      assert.equal(selected.length, 1, entry.id);
      ctx.row = row[0];
      const html = vm.runInContext('renderTzaddikLink(row).innerHTML', ctx);
      assert.ok(html.includes(entry.record.description), entry.id + '/visible note');
      assert.ok(html.includes(entry.record.hebrew_name), entry.id + '/Hebrew name');
      assert.ok(!/<(?:img|video|picture)\b/i.test(html), 'text-only box');
      assert.equal(vm.runInContext("findYahrzeits('Kislev', day).filter(r=>r.cheshvon_review_id===entryId).length", ctx), 0);
      assert.equal(vm.runInContext("findYahrzeits('Cheshvan', day+1).filter(r=>r.cheshvon_review_id===entryId).length", ctx), 0);
    }
    assert.equal(data.all_tzaddikim.filter(r => /Cheshin|חשין|Yitzchak.*Volozhin/.test(r.name+' '+r.hebrew_name)).length, 0);
    for (const day of [3,13,17]) {
      ctx.day=day;
      assert.equal(vm.runInContext("findImportantDates('Cheshvan',day).filter(r=>/Cheshin|חשין|Yitzchak.*Volozhin/.test(r.name+' '+r.hebrew_name)).length",ctx),0);
    }
    assert.equal(data.all_tzaddikim.filter(r=>r.cheshvon_review_id==='cheshvon-070').length,1);
    assert.equal(data.all_tzaddikim.filter(r=>r.cheshvon_review_id==='cheshvon-148')[0].yahrzeit_day,'30');
    assert.equal(data.all_tzaddikim.filter(r=>r.cheshvon_review_id==='cheshvon-046').length,1);
  });
}
test('Cheshin absent from hard-coded calendar, unrelated important dates retained', () => {
  assert.ok(!/Cheshin|חשין/.test(important));
  assert.ok(important.includes('Saba Yisroel Ber Odesser'));
  assert.ok(important.includes('Chanukas HaMikdash begins'));
});
