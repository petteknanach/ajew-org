// Full init-path smoke test for chok.js with stub DOM (per skill lesson).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = '/root/ajew-org/public';

const files = {
  '/reader/chok/schedule.json': '/reader/chok/schedule.json',
  '/reader/chok/shabbos-map.json': '/reader/chok/shabbos-map.json',
  '/reader/chok/mishna-bonus.json': '/reader/chok/mishna-bonus.json',
  '/reader/chok/mussar.json': '/reader/chok/mussar.json',
  '/reader/chok/day-comm.json': '/reader/chok/day-comm.json',
  '/reader/chok/kavanos-chok.json': '/reader/chok/kavanos-chok.json',
  '/reader/chok/kavanos-actual.json': '/reader/chok/kavanos-actual.json',
  '/reader/chok/miluy-kavana.json': '/reader/chok/miluy-kavana.json',
  '/reader/chok/hk-verses.json': '/reader/chok/hk-verses.json',
};

function makeEl(id) {
  return {
    id, value: '', checked: true, textContent: '', innerHTML: '', hidden: false,
    scrollTop: 0, attrs: {},
    style: { setProperty() {} },
    classList: { contains: () => false },
    addEventListener() {}, appendChild() {}, setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k] || null; },
    querySelector: () => null,
    querySelectorAll: () => [],
    scrollIntoView() {},
  };
}

function runCase(search, cb, mockIso) {
  const els = {};
  ['ck-date','ck-week','ck-content','ck-parsha','ck-mode','ck-medooyuk','ck-targum',
   'ck-rashi','ck-commentary','ck-tanachen','ck-carrymode','ck-size','ck-legend','ck-days']
   .forEach(id => els[id] = makeEl(id));
  const documentStub = {
    readyState: 'complete',
    documentElement: { setAttribute() {}, style: { setProperty() {} } },
    getElementById: id => els[id] || makeEl(id),
    createElement: tag => makeEl('dyn-' + tag),
    addEventListener() {},
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  let D = Date;
  if (mockIso) {
    const fixed = new Date(mockIso).getTime();
    D = class extends Date {
      constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
      static now() { return fixed; }
    };
  }
  const sandbox = {
    console, setTimeout, clearTimeout, URLSearchParams,
    document: documentStub,
    localStorage: { getItem: () => null, setItem() {} },
    location: { pathname: '/reader/chok/', search },
    window: { open: (u) => { sandbox.__opened = u; }, scrollTo() {} },
    fetch: (url) => new Promise((res, rej) => {
      const p = path.join(ROOT, String(url).split('?')[0]);
      if (fs.existsSync(p)) res({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(p, 'utf8'))) });
      else rej(new Error('404 ' + url));
    }),
    XMLHttpRequest: function () {
      this.open = (m, u) => { this.__u = u; };
      this.send = () => {
        const p = path.join(ROOT, String(this.__u).split('?')[0]);
        setTimeout(() => {
          if (fs.existsSync(p)) { this.status = 200; this.responseText = fs.readFileSync(p, 'utf8'); }
          else { this.status = 404; this.responseText = ''; }
          if (this.onload) this.onload();
        }, 1);
      };
    },
    Array, Promise, JSON, Math, Date: D, Object, encodeURIComponent, decodeURIComponent, parseInt, RegExp, String, Number, Error,
  };
  sandbox.window.location = sandbox.location;
  sandbox.globalThis = sandbox;
  const src = fs.readFileSync(path.join(ROOT, 'chok.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  let n = 0;
  const iv = setInterval(() => {
    const html = els['ck-content'].innerHTML;
    n++;
    if ((html && !html.includes('Loading')) || n > 120) { clearInterval(iv); cb(html, els, sandbox); }
  }, 50);
}

let failures = 0;
function check(name, cond, extra) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' | ' + extra : ''));
  if (!cond) failures++;
}

let pending = 1;
function finishOnce() {
  if (--pending > 0) return;
  console.log(failures ? 'SMOKE: ' + failures + ' FAILURES' : 'SMOKE: ALL PASS');
  process.exit(failures ? 1 : 0);
}

// Case 0: week resolution by date. The chok week = the LATEST anchor shabbos
// on/before today (HH correction 2026-09-24: vezos habracha, though the next
// shabbos 09-26 opens breishis).
pending += 3;
runCase('', (html, els) => {
  check('resolve 2026-09-24 -> vezos habracha', (els['ck-week'].textContent || '').includes('וזאת הברכה'), els['ck-week'].textContent);
  finishOnce();
}, '2026-09-24T09:00:00');
runCase('', (html, els) => {
  check('resolve 2026-09-27 -> breishis (new year)', (els['ck-week'].textContent || '').includes('בראשית'), els['ck-week'].textContent);
  finishOnce();
}, '2026-09-27T09:00:00');
runCase('', (html, els) => {
  check('resolve 2026-09-18 -> haazinu', (els['ck-week'].textContent || '').includes('האזינו'), els['ck-week'].textContent);
  finishOnce();
}, '2026-09-18T09:00:00');

// Case 1: normal day view, 2026-09-23 (system date in test env is faked below via Date override)
// We override Date inside sandbox only for the resolve test: run with real date first.
runCase('', (html, els) => {
  if (!html || html.includes('Loading') || html.length <= 500) {
    console.log('DEBUG content:', JSON.stringify(html));
    console.log('DEBUG date/week:', els['ck-date'].textContent, '|', els['ck-week'].textContent);
  }
  check('content rendered', !!html && !html.includes('Loading') && html.length > 500, (html || '').length + ' chars');
  check('torah section present', /data-sec="torah"/.test(html || ''));
  check('navi section present', /data-sec="navi"/.test(html || ''));
  check('talmud section present', /data-sec="talmud"/.test(html || ''));
  check('kavana actual chip present', (html || '').includes('כוונת הלימוד — האריז״ל'));
  check('prayer chip removed from kavanos stack', !(html || '').includes('תפלה לפני הלימוד'));
  check('tefillos page link present', (html || '').includes('/reader/chok/tefillos/'));
  check('popout buttons present', (html || '').includes('ck-popout'));

  // Case 1b: a week WITH day-comm data renders the carry top layer
  runCase('?week=' + encodeURIComponent('וזאת הברכה') + '&day=' + encodeURIComponent('יום רביעי'), (h1b) => {
    check('carry top is details layer (wz habracha)', (h1b || '').includes('ck-carry-top'));
    check('carry voice rows render', (h1b || '').includes('ck-voice-row'));
    check('verse row 33:16 renders', (h1b || '').includes('רצון שוכני סנה'));
    check('rashi row 33:18 renders', (h1b || '').includes('שותפות'));
    check('mussar section rendered', /data-sec="mussar"/.test(h1b || ''));
    // Miluy kavana: WZ habracha Wed = 6/day -> navi seg = 6 verses, chip shows the letter vav
    check('miluy chip renders', (h1b || '').includes('ck-miluy'));
    check('miluy chip names the letter', (h1b || '').includes('כנגד האות ו׳ של המילוי'));
    // Breslov sources layer (Halechta Knechmani facts): WZ habracha = Devarim ch33 (safe)
    check('breslov sources line renders', (h1b || '').includes('ck-hk-src'));
    check('breslov sources name the index', (h1b || '').includes('הלכתא כנחמני'));
    // day-comm collapsible layers (HH): per-section explanations are details
    check('voice layer is collapsible', (h1b || '').includes('ck-voice-layer'));
    check('talmud explanation renders', (h1b || '').includes('הסבר פשוט — גמרא'));
    check('kabbala explanation renders', (h1b || '').includes('הסבר פשוט — זוהר'));
    // Case 1c: today's own week now has a full-scope entry
    runCase('?week=' + encodeURIComponent('בראשית') + '&day=' + encodeURIComponent('יום רביעי'), (h1c) => {
      check('breishis carry renders', (h1c || '').includes('ck-carry-top'));
      check('verse row 1:16 renders', (h1c || '').includes('המאורות הגדולים'));
      check('rashi row 1:16 renders', (h1c || '').includes('שני מלכים'));
      check('section explanations render', (h1c || '').includes('ארבעה אבות נזיקין'));
      runCase('?sec=talmud&week=' + encodeURIComponent('בראשית') + '&day=' + encodeURIComponent('יום רביעי'), (h2) => {
        check('focus: focusbar present', (h2 || '').includes('ck-focusbar'));
        check('focus: only talmud section', /data-sec="talmud"/.test(h2 || '') && !/data-sec="torah"/.test(h2 || ''));
        check('focus: no popout buttons', !(h2 || '').includes('ck-popout'));
        // Case 3: focus torah
        runCase('?sec=torah&week=' + encodeURIComponent('בראשית'), (h3) => {
          check('focus torah: torah present', /data-sec="torah"/.test(h3 || ''));
          check('focus torah: no mussar', !/data-sec="mussar"/.test(h3 || ''));
          check('focus: no tefillos link', !(h3 || '').includes('tefillos/'));
          finishOnce();
        });
      });
    });
  });
});
