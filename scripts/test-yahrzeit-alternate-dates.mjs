import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const src = fs.readFileSync(new URL('src/components/CompactYahrzeit.astro', root), 'utf8');
const normalize = src.slice(src.indexOf('  function normalizeMonth('), src.indexOf('  // Find yahrzeits for'));
const find = src.slice(src.indexOf('  function findYahrzeits('), src.indexOf('  // Find important dates for'));
function run(rows, month, day) {
  const ctx = {tzaddikimDatabase: rows}; vm.createContext(ctx);
  return vm.runInContext(normalize + find + `\nfindYahrzeits(${JSON.stringify(month)}, ${day})`, ctx);
}
for (const file of ['tzaddikim-database.json','tzaddikim-database-complete.json','tzaddikim-database-filtered.json']) {
  const rows=JSON.parse(fs.readFileSync(new URL('public/data/'+file,root),'utf8')).all_tzaddikim;
  test(file + ': one identity on both sourced dates, not fifth',()=>{
    const matching=rows.filter(r=>r.name==='Magen Avraham (Rabbi Avraham Gombiner)');
    assert.equal(matching.length,1);
    for (const day of [3,9]) {
      const selected=run(matching,'Tishrei',day);assert.equal(selected.length,1);
      assert.match(selected[0].notes,/\(Yahrzeit date disputed: 9 Tishray; other sources give 3 Tishray\.\)/);
    }
    assert.equal(run(matching,'Tishrei',5).length,0);
    assert.equal(run(matching,'Elul',9).length,0);
  });
}
test('ordinary and leap-Adar dates retain behavior',()=>{
  const rows=[{yahrzeit_month:'Adar',yahrzeit_day:'3'},{yahrzeit_month:'Adar II',yahrzeit_day:'3'}];
  assert.equal(run(rows,'Adar',3).length,1);assert.equal(run(rows,'Adar II',3).length,2);
  assert.equal(run(rows,'Adar II',4).length,0);
});
test('duplicate alternate date cannot duplicate identity',()=>{
  const rows=[{yahrzeit_month:'Tishrei',yahrzeit_day:'9',yahrzeit_alternate_dates:[{month:'Tishrei',day:'9'},{month:'Tishrei',day:'9'}]}];
  assert.equal(run(rows,'Tishri',9).length,1);
});
