// Source-derived full-init regressions; no network, build or fabricated text.
// Usage: node scripts/test-chok-nach-regimen.cjs public /root/ajew-org/public [report.json]
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '../public'));
const CORPUS_ROOT = path.resolve(process.argv[3] || '/root/ajew-org/public');
const consumed = new Map(), results = [];
function read(p) {
  const raw = fs.readFileSync(p);
  consumed.set(p, crypto.createHash('sha256').update(raw).digest('hex'));
  return raw.toString('utf8');
}
function data(rel) {
  const p = fs.existsSync(path.join(ROOT, rel)) ? path.join(ROOT, rel) : path.join(CORPUS_ROOT, rel);
  return JSON.parse(read(p));
}
function check(name, cond, extra) {
  results.push({ name, pass: !!cond, ...(extra === undefined ? {} : { extra }) });
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra === undefined ? '' : ' | ' + JSON.stringify(extra)));
}
// Reuse the existing source-backed full-init DOM/fetch harness, not helper-only execution.
const inheritedPath = path.join(__dirname, 'test-chok-marked-init.cjs');
const prelude = read(inheritedPath).split('let failures = 0;')[0];
const trackedFS = Object.create(fs);
trackedFS.readFileSync = (p, options) => {
  const raw = fs.readFileSync(p);
  consumed.set(String(p), crypto.createHash('sha256').update(raw).digest('hex'));
  return typeof options === 'string' || options?.encoding ? raw.toString(typeof options === 'string' ? options : options.encoding) : raw;
};
const harness = { require: name => name === 'fs' ? trackedFS : require(name), __dirname, console, URLSearchParams,
  process: { argv: ['node', inheritedPath, ROOT, CORPUS_ROOT] }, setInterval, clearInterval, setTimeout, clearTimeout };
vm.runInNewContext(prelude + '\nthis.runCase = runCase;', harness, { filename: inheritedPath });
const init = (search, iso = '2026-09-30T09:00:00') => new Promise(resolve => {
  harness.runCase(search, (html, els) => resolve({ html, els }), iso);
});
const schedule = data('reader/chok/schedule.json');
const DAYS = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','ליל שישי','יום שישי'];
const weekdays = DAYS.filter(x => x !== 'ליל שישי');
const source = read(path.join(ROOT, 'chok.js'));
const slugs = vm.runInNewContext('(' + source.match(/var SLUGS = (\{[\s\S]*?\n  \});/)[1] + ')');
// The plene label must remain literal in the schedule, with an explicit lookup alias.
const expectedSlugs = { ...slugs, 'תהילים': 'tanach-tehillim' };
const books = new Map();
function book(slug) { if (!books.has(slug)) books.set(slug, data('reader/medooyuk/' + slug + '.json')); return books.get(slug); }
function nums(n) {
  if (n === 15) return 'טו״'; if (n === 16) return 'טז״';
  const values = [400,300,200,100,90,80,70,60,50,40,30,20,10,9,8,7,6,5,4,3,2,1];

  // Keep the independent numeral encoder simple and explicit.
  const map = {400:'ת',300:'ש',200:'ר',100:'ק',90:'צ',80:'פ',70:'ע',60:'ס',50:'נ',40:'מ',30:'ל',20:'כ',10:'י',9:'ט',8:'ח',7:'ז',6:'ו',5:'ה',4:'ד',3:'ג',2:'ב',1:'א'};
  let out = ''; for (const v of values) while (n >= v) { out += map[v]; n -= v; } return out + '״';
}
function section(html, key) { return html.match(new RegExp('<section[^>]*data-sec="' + key + '"[^>]*>([\\s\\S]*?)</section>'))?.[1] || ''; }
function refs(html) { return [...html.matchAll(/<span class="tk-vnum">\(([^<]+)\)<\/span>/g)].map(m => m[1]); }
function range(w, day, key) {
  const sec = w.days[day]?.[key]; if (!sec) return null;
  const slug = expectedSlugs[sec.book], chapter = book(slug).ch[sec.from.c];
  const prior = DAYS.slice(0, DAYS.indexOf(day)).filter(d => {
    const x = w.days[d]?.[key]; return x && expectedSlugs[x.book] === slug && x.from.c === sec.from.c;
  }).length;
  const start = (sec.from.v || 1) + 6 * prior;
  const verseNumbers = Object.keys(chapter).map(Number).sort((a,b) => a-b);
  const selected = verseNumbers.filter(v => v >= start && v < start + 6);
  return { slug, c: sec.from.c, start, length: verseNumbers.length, selected,
    refs: selected.map(v => nums(sec.from.c) + ',' + nums(v)), type: selected.length === 6 ? 'full' : selected.length ? 'short' : 'empty' };
}
function torahRefs(w, sec) {
  const b = book(w.slug); let out = [];
  for (let c = sec.from.c; c <= sec.to.c; c++) for (const v of Object.keys(b.ch[c]).map(Number).sort((a,b) => a-b))
    if ((c !== sec.from.c || v >= sec.from.v) && (c !== sec.to.c || v <= sec.to.v)) out.push(nums(c) + ',' + nums(v));
  return out;
}
async function verifyNach(week, day, key) {
  const expected = range(schedule.weeks[week], day, key);
  const { html } = await init('?sec=' + key + '&week=' + encodeURIComponent(week) + '&day=' + encodeURIComponent(day));
  const h = section(html, key), actual = refs(h);
  check(week + ' / ' + day + ' / ' + key + ': source-exact bounded six-verse window', JSON.stringify(actual) === JSON.stringify(expected.refs), { actual, expected: expected.refs, type: expected.type });
  check(week + ' / ' + day + ' / ' + key + ': section and historic/regimen disclosure', !!h && h.includes('six-verse') && (DAYS.indexOf(day) > 4 || h.includes('historical')), expected.type);
  if (expected.type !== 'full') {
    check(week + ' / ' + day + ' / ' + key + ': boundary disclosed', h.includes('ck-nach-boundary') && h.includes(expected.type === 'empty' ? 'No verses' : 'Only ' + actual.length + ' of 6'), expected.type);
    const head = h.match(/class="ck-sec-head">([\s\S]*?)<\/div>/)?.[1] || '';
    check(week + ' / ' + day + ' / ' + key + ': header never claims nonexistent endpoint', expected.type === 'empty' ? !head.includes('–') : head.includes(nums(expected.selected.at(-1))));
  }
  return expected;
}
(async () => {
  check('54 source weeks preserved', Object.keys(schedule.weeks).length === 54);
  check('plene תהילים mapping present', slugs['תהילים'] === 'tanach-tehillim');
  // Parse every actual owned Chok and medooyuk JSON, including untouched prayer/kavana data.
  let parsed = 0;
  for (const dir of ['reader/chok','reader/medooyuk']) {
    function walk(p, rel) { for (const e of fs.readdirSync(p, {withFileTypes:true})) {
      if (e.isDirectory()) walk(path.join(p,e.name), rel + '/' + e.name);
      else if (e.name.endsWith('.json')) { data(rel + '/' + e.name); parsed++; }
    }}
    walk(path.join(CORPUS_ROOT,dir), dir);
  }
  check('actual JSON corpus parses', parsed > 0, parsed);
  let slots = 0, nachSlots = 0, plene = [], examples = {}, missing = [], integrity = [];
  for (const [week,w] of Object.entries(schedule.weeks)) for (const day of DAYS) {
    const d = w.days[day]; if (!d) continue;
    if (d.torah) { const rr = torahRefs(w,d.torah); if (!rr.length) integrity.push(week + ' ' + day); slots++; }
    for (const key of ['navi','kesuvim']) if (d[key]) {
      if (!expectedSlugs[d[key].book]) { missing.push(d[key].book); continue; }
      const r = range(w,day,key); nachSlots++;
      examples[key + '/' + r.type] ||= {week,day,key};
      if (d[key].book === 'תהילים') plene.push({week,day,key});
      const keys = Object.keys(book(r.slug).ch[r.c]).map(Number).sort((a,b)=>a-b);
      if (keys.some((v,i)=>v!==i+1) || keys.some(v=>!Array.isArray(book(r.slug).ch[r.c][v].t))) integrity.push(week + ' ' + day + ' ' + key);
    }
  }
  check('all schedule book labels resolve without rewriting labels', !missing.length, missing);
  check('all actual Torah/Nach chapters and verse token arrays valid', !integrity.length, {torahSlots:slots,nachSlots,errors:integrity});
  // Full day (all layers) init for all SIX weekdays. Friday has no Nach slot in this source;
  // preserve that absence rather than silently inventing a chapter or a Friday range.
  for (const day of weekdays) {
    const w = schedule.weeks['בראשית'], { html } = await init('?week=' + encodeURIComponent('בראשית') + '&day=' + encodeURIComponent(day));
    check('full init ' + day + ': literal Torah schedule unchanged', JSON.stringify(refs(section(html,'torah'))) === JSON.stringify(torahRefs(w,w.days[day].torah)));
    check('full init ' + day + ': shared renderer, independent prayers link and actual kavana', html.includes('marked-hebrew') && html.includes('/reader/chok/tefillos/') && html.includes('כוונת הלימוד — האריז״ל') && !html.includes('ck-marked-unavailable'));
    for (const key of ['navi','kesuvim']) {
      const expected = range(w,day,key), h = section(html,key);
      check('full init ' + day + ': ' + key + ' matches actual schedule', expected ? JSON.stringify(refs(h)) === JSON.stringify(expected.refs) : !h && html.includes('data-nach-unavailable="' + key + '"'), expected?.refs || 'source has no Friday Nach slot; absence disclosed');
    }
  }
  if (process.argv.includes('--all-slots')) {
    const slotsToExercise = [];
    for (const [week,w] of Object.entries(schedule.weeks)) for (const day of DAYS)
      for (const key of ['navi','kesuvim']) if (w.days[day]?.[key]) slotsToExercise.push({week,day,key});
    let exercised = 0;
    // Four independent VM contexts at a time; bounded memory and no network.
    for (let i = 0; i < slotsToExercise.length; i += 4) {
      await Promise.all(slotsToExercise.slice(i,i+4).map(async c => {
        await verifyNach(c.week,c.day,c.key); exercised++;
      }));
    }
    check('every actual scheduled Nach slot exercised through full init', exercised === nachSlots, exercised);
  } else for (const c of Object.values(examples)) await verifyNach(c.week,c.day,c.key);
  check('all real short/empty cases included', !!examples['navi/short'] && !!examples['navi/empty'] && !!examples['kesuvim/short'] && !!examples['kesuvim/empty'], examples);
  check('plene source schedule present', plene.length > 0, plene.length);
  await verifyNach(plene[0].week,plene[0].day,plene[0].key);
  for (const [iso,label] of [['2026-09-24T09:00:00','וזאת הברכה'],['2026-09-27T09:00:00','בראשית'],['2026-09-18T09:00:00','האזינו']]) {
    const {els} = await init('',iso); check('anchor cycle ' + iso, els['ck-week'].textContent.includes(label), els['ck-week'].textContent);
  }
  const { html: friday } = await init('', '2026-09-25T09:00:00');
  check('cycle-end Friday fallback disclosed and literal tail preserved', friday.includes('ck-fb-note') && JSON.stringify(refs(section(friday,'torah'))) === JSON.stringify(torahRefs(schedule.weeks['וזאת הברכה'],schedule.weeks['וזאת הברכה'].days['ליל שישי'].torah)) && !friday.includes('>null<'));
  for (const [week,count] of [['נצבים',14],['וילך',4],['וזאת הברכה',15]]) {
    const w = schedule.weeks[week], d = w.days['ליל שישי'];
    const {html} = await init('?sec=torah&week=' + encodeURIComponent(week) + '&day=' + encodeURIComponent('ליל שישי'));
    const h = section(html,'torah'), expected = torahRefs(w,d.torah);
    check('Thursday-night source tail ' + week + ' = ' + count + ', not 26', expected.length === count && JSON.stringify(refs(h)) === JSON.stringify(expected) && !/26 verses|כ״ו פסוקים/.test(h), refs(h).length);
  }
  const report = { passed: results.every(x=>x.pass), results, consumed: [...consumed].map(([file,sha256])=>({file,sha256})), qualification:'Local website full-init with stub DOM and actual owned JSON; not native, build, deployment or live release.' };
  if (process.argv[4]) fs.writeFileSync(process.argv[4],JSON.stringify(report,null,2)+'\n');
  console.log('REGIMEN: ' + results.filter(x=>x.pass).length + '/' + results.length + ' PASS');
  process.exit(report.passed ? 0 : 1);
})().catch(e=>{ console.error(e); process.exit(1); });
