import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('src/components/CompactYahrzeit.astro', root), 'utf8');
const normalization = source.slice(source.indexOf('  function normalizeMonth('), source.indexOf('  // Find yahrzeits for'));
const finding = source.slice(source.indexOf('  function findYahrzeits('), source.indexOf('  // Find important dates for'));
function find(rows, month, day) {
  const context = {tzaddikimDatabase: rows};
  vm.createContext(context);
  return vm.runInContext(normalization + finding + `\nfindYahrzeits(${JSON.stringify(month)}, ${day})`, context);
}
const isPatriarch = row => ['Jacob', 'Yaakov Avinu'].includes(row.name)
  || ['יעקב', 'יעקב אבינו'].includes(row.hebrew_name);
for (const filename of ['tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json']) {
  const data = JSON.parse(fs.readFileSync(new URL('public/data/' + filename, root), 'utf8'));
  const rows = data.all_tzaddikim;
  test(filename + ': corrected cardinality and one preserved sourced identity', () => {
    assert.equal(data.metadata.total_count, rows.length);
    assert.equal(rows.filter(isPatriarch).length, 1);
    assert.equal(rows.filter(isPatriarch)[0].name, 'Yaakov Avinu');
    assert.ok(rows.filter(isPatriarch)[0].source_urls.length);
  });
  test(filename + ': actual widget never selects the patriarch on 15 Cheshvan', () => {
    assert.equal(find(rows, 'Cheshvan', 15).filter(isPatriarch).length, 0);
    assert.equal(find(rows, 'חשון', 15).filter(isPatriarch).length, 0);
    const bad = {name: 'Jacob', hebrew_name: 'יעקב', yahrzeit_month: 'Cheshvan', yahrzeit_day: '15'};
    // A real regression control: inserting the original bad date must select it.
    assert.equal(find([...rows, bad], 'Cheshvan', 15).filter(isPatriarch).length, 1);
    assert.equal(find(rows, 'Cheshvan', 15).filter(isPatriarch).length, 0);
  });
}
