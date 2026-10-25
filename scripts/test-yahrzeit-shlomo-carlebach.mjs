#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const template = readFileSync(new URL('../src/components/CompactYahrzeit.astro', import.meta.url), 'utf8');
const normalize = template.slice(template.indexOf('  function normalizeMonth('), template.indexOf('  // Find yahrzeits for a specific Hebrew date'));
const filter = template.slice(template.indexOf('  function findYahrzeits('), template.indexOf('  // Find important dates for a specific Hebrew date'));
assert.ok(normalize.includes('return map[lower] || m;'));
assert.ok(filter.includes('dates.some'));
for (const filename of ['tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json']) {
  const data = JSON.parse(readFileSync(new URL('../public/data/'+filename, import.meta.url), 'utf8'));
  const ctx = vm.createContext({tzaddikimDatabase:data.all_tzaddikim});
  vm.runInContext(normalize + filter, ctx);
  const rows = data.all_tzaddikim.filter(r => /shlomo carlebach/i.test(r.name));
  test(filename+': exactly one sourced approved identity and date', () => {
    assert.equal(rows.length,1);
    assert.equal(rows[0].hebrew_name,'רבי שלמה קרליבך');
    assert.equal(rows[0].yahrzeit_month,'Cheshvan');
    assert.equal(Number(rows[0].yahrzeit_day),16);
    assert.equal(rows[0].year_passed,'1994');
    assert.ok(rows[0].source_urls[0].startsWith('https://matzav.com/'));
    assert.equal(data.metadata.total_count,data.all_tzaddikim.length);
  });
  test(filename+': actual widget selects him only on 16 Cheshvan', () => {
    for (const month of ['Cheshvan','Heshvan','Marcheshvan']) {
      const result = ctx.findYahrzeits(month,16).filter(r=>/shlomo carlebach/i.test(r.name));
      assert.equal(result.length,1);
    }
    for (const day of [15,17]) assert.equal(ctx.findYahrzeits('Cheshvan',day).filter(r=>/shlomo carlebach/i.test(r.name)).length,0);
    assert.equal(ctx.findYahrzeits('Kislev',16).filter(r=>/shlomo carlebach/i.test(r.name)).length,0);
  });
}
