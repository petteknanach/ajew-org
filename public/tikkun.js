/* Tikun Korim - ajew.org
 * Whole-Tanach reader's tikkun: 4 display modes, medooyuk sheva layer,
 * Shnayim Mikra (each verse twice: stacked or tap 2x).
 * All data is project-owned (ajew.org medooyuk build) - no external site
 * dependencies: /reader/medooyuk/<slug>.json {book,slug,he,en,ch:{c:{v:{t,k,m}}}}
 */
(function () {
  'use strict';

  var BOOKS = [
    ['tanach-bereishit','בְּרֵאשִׁית','Genesis'], ['tanach-shemos','שְׁמוֹת','Exodus'],
    ['tanach-vayikra','וַיִּקְרָא','Leviticus'], ['tanach-bamidbar','בְּמִדְבַּר','Numbers'],
    ['tanach-devarim','דְּבָרִים','Deuteronomy'], ['tanach-yehoshua','יְהוֹשֻׁעַ','Joshua'],
    ['tanach-shoftim','שׁוֹפְטִים','Judges'], ['tanach-shmuel-a','שְׁמוּאֵל א','I Samuel'],
    ['tanach-shmuel-b','שְׁמוּאֵל ב','II Samuel'], ['tanach-melachim-a','מְלָכִים א','I Kings'],
    ['tanach-melachim-b','מְלָכִים ב','II Kings'], ['tanach-yeshayahu','יְשַׁעְיָהוּ','Isaiah'],
    ['tanach-yirmiyahu','יִרְמְיָהוּ','Jeremiah'], ['tanach-yechezkel','יְחֶזְקֵאל','Ezekiel'],
    ['tanach-hoshea','הוֹשֵׁעַ','Hosea'], ['tanach-yoel','יוֹאֵל','Joel'],
    ['tanach-amos','עָמוֹס','Amos'], ['tanach-ovadya','עֹבַדְיָה','Obadiah'],
    ['tanach-yonah','יוֹנָה','Jonah'], ['tanach-michah','מִיכָה','Micah'],
    ['tanach-nachum','נַחוּם','Nahum'], ['tanach-havakkuk','חֲבַקּוּק','Habakkuk'],
    ['tanach-tzefanya','צְפַנְיָה','Zephaniah'], ['tanach-chaggai','חַגַּי','Haggai'],
    ['tanach-zecharya','זְכַרְיָה','Zechariah'], ['tanach-malachi','מַלְאָכִי','Malachi'],
    ['tanach-tehillim','תְּהִלִּים','Psalms'], ['tanach-mishlei','מִשְׁלֵי','Proverbs'],
    ['tanach-iyov','אִיּוֹב','Job'], ['tanach-shir-hashirim','שִׁיר הַשִּׁירִים','Song of Songs'],
    ['tanach-rus','רוּת','Ruth'], ['tanach-eicha','אֵיכָה','Lamentations'],
    ['tanach-koheles','קֹהֶלֶת','Ecclesiastes'], ['tanach-esther','אֶסְתֵּר','Esther'],
    ['tanach-daniel','דָּנִיֵּאל','Daniel'], ['tanach-ezra','עֶזְרָא','Ezra'],
    ['tanach-nechemia','נְחֶמְיָה','Nehemiah'],
    ['tanach-divrei-hayamim-a','דִּבְרֵי הַיָּמִים א','I Chronicles'],
    ['tanach-divrei-hayamim-b','דִּבְרֵי הַיָּמִים ב','II Chronicles']
  ];

  /* 54 parshiyos: [name, slug, startC, startV, endC, endV] */
  var PARSHIYOS = [
    ['Bereishis','tanach-bereishit',1,1,6,8], ['Noach','tanach-bereishit',6,9,11,32],
    ['Lech Lecha','tanach-bereishit',12,1,17,27], ['Vayera','tanach-bereishit',18,1,22,24],
    ['Chayei Sara','tanach-bereishit',23,1,25,18], ['Toldos','tanach-bereishit',25,19,28,9],
    ['Vayetze','tanach-bereishit',28,10,32,3], ['Vayishlach','tanach-bereishit',32,4,36,43],
    ['Vayeshev','tanach-bereishit',37,1,40,23], ['Miketz','tanach-bereishit',41,1,44,17],
    ['Vayigash','tanach-bereishit',44,18,47,27], ['Vayechi','tanach-bereishit',47,28,50,26],
    ['Shemos','tanach-shemos',1,1,6,1], ['Vaeira','tanach-shemos',6,2,9,35],
    ['Bo','tanach-shemos',10,1,13,16], ['Beshalach','tanach-shemos',13,17,17,16],
    ['Yisro','tanach-shemos',18,1,20,23], ['Mishpatim','tanach-shemos',21,1,24,18],
    ['Terumah','tanach-shemos',25,1,27,19], ['Tetzaveh','tanach-shemos',27,20,30,10],
    ['Ki Sisa','tanach-shemos',30,11,34,35], ['Vayakhel','tanach-shemos',35,1,38,20],
    ['Pekudei','tanach-shemos',38,21,40,38],
    ['Vayikra','tanach-vayikra',1,1,5,26], ['Tzav','tanach-vayikra',6,1,8,36],
    ['Shmini','tanach-vayikra',9,1,11,47], ['Tazria','tanach-vayikra',12,1,13,59],
    ['Metzora','tanach-vayikra',14,1,15,33], ['Acharei','tanach-vayikra',16,1,18,30],
    ['Kedoshim','tanach-vayikra',19,1,20,27], ['Emor','tanach-vayikra',21,1,24,23],
    ['Behar','tanach-vayikra',25,1,26,2], ['Bechukosai','tanach-vayikra',26,3,27,34],
    ['Bamidbar','tanach-bamidbar',1,1,4,20], ['Nasso','tanach-bamidbar',4,21,7,89],
    ['Behaaloscha','tanach-bamidbar',8,1,12,16], ['Shelach','tanach-bamidbar',13,1,15,41],
    ['Korach','tanach-bamidbar',16,1,18,32], ['Chukas','tanach-bamidbar',19,1,22,1],
    ['Balak','tanach-bamidbar',22,2,25,9], ['Pinchas','tanach-bamidbar',25,10,30,1],
    ['Mattos','tanach-bamidbar',30,2,32,42], ['Masei','tanach-bamidbar',33,1,36,13],
    ['Devarim','tanach-devarim',1,1,3,22], ['Vaeschanan','tanach-devarim',3,23,7,11],
    ['Aikev','tanach-devarim',7,12,11,25], ['Riay','tanach-devarim',11,26,16,17],
    ['Shoftim','tanach-devarim',16,18,21,9], ['Kee Saitzay','tanach-devarim',21,10,25,19],
    ['Kee Savoa','tanach-devarim',26,1,29,8], ['Nitzavim','tanach-devarim',29,9,30,20],
    ['Vayelech','tanach-devarim',31,1,31,30], ['Haazinu','tanach-devarim',32,1,32,52],
    ['Vezos Haberacha','tanach-devarim',33,1,34,12]
  ];

  var TAAMIM = /[\u0591-\u05AF\u05BD\u05C0]/g;   // teamim incl. meteg + pasek
  var NIKUD  = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g;

  var state = {
    slug: 'tanach-bereishit', chapter: 1,
    mode: 'full', medooyuk: true, shnayim: false,
    layout: 'stacked', size: 26, theme: 'day',
    data: null, tapCount: {}
  };

  function $(id) { return document.getElementById(id); }

  function heNum(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    var tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    var out = '';
    var h = Math.floor(n / 100), r = n % 100;
    if (h > 0) out += ones[h] === 'ה' ? 'ק' : (ones[h] === 'ו' ? 'ר' : 'ק' + ones[h]);
    if (r === 15) return out + 'טו';
    if (r === 16) return out + 'טז';
    if (r >= 10) {
      var t = Math.floor(r / 10), o = r % 10;
      if (t === 9) out += 'צ';
      else out += tens[t];
      out += o ? ones[o] : '';
    } else out += ones[r];
    return out;
  }

  function applyMode(text) {
    if (state.mode === 'nikud') return text.replace(TAAMIM, '');
    if (state.mode === 'taamim') return text.replace(NIKUD, '');
    if (state.mode === 'letters') return text.replace(TAAMIM, '').replace(NIKUD, '');
    return text;
  }

  function joinTokens(arr) {
    var out = '';
    for (var i = 0; i < arr.length; i++) {
      if (out && !/[\u05BE\u05C0\u200F]$/.test(out) && out.slice(-1) !== ' ') out += ' ';
      out += arr[i];
    }
    return out;
  }

  /* Render one verse's mikra text with medooyuk spans. marks: [[ti,li,lb,qb]] */
  function mikraHTML(verse) {
    var byTok = {};
    (verse.m || []).forEach(function (mk) {
      (byTok[mk[0]] = byTok[mk[0]] || []).push(mk);
    });
    return joinTokens(verse.t.map(function (tok, i) {
      var txt = applyMode(tok);
      var mks = byTok[i];
      if (!mks || !state.medooyuk) return esc(txt);
      /* sheva marks are letter-indexed inside the token; simple + robust:
         color the whole token when it carries a sheva decision. */
      var cls = [], qb = false;
      mks.forEach(function (mk) {
        if (mk[3]) qb = true;
        if (mk[2] === 'na') cls.push('m-na');
        else if (mk[2] === 'nach') cls.push('m-nach');
      });
      var c = cls.join(' ') + (qb ? ' m-qb' : '');
      return c ? '<span class="' + c.trim() + '">' + esc(txt) + '</span>' : esc(txt);
    }));
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    var box = $('tk-content');
    if (!state.data) { box.innerHTML = '<p class="tk-loading">Loading…</p>'; return; }
    var ch = state.data.ch[state.chapter];
    if (!ch) { box.innerHTML = '<p class="tk-error">Chapter not found.</p>'; return; }
    var shnayim = state.shnayim;
    var html = [];
    var tapLeft = null;
    Object.keys(ch).map(Number).sort(function (a, b) { return a - b; }).forEach(function (v) {
      var verse = ch[v];
      var mikra = mikraHTML(verse);
      var num = '<span class="tk-vnum">(' + heNum(v) + ')</span>';
      if (!shnayim) {
        html.push('<div class="tk-verse">' + mikra + num + '</div>');
        return;
      }
      if (state.layout === 'tap') {
        var n = state.tapCount[state.chapter + ':' + v] || 0;
        var body = mikra;
        if (n >= 2) body += '<div class="tk-mikra-repeat">' + mikra + '</div>';
        if (n >= 2) body = '<span class="tk-tap-done">' + body + '</span>';
        html.push('<div class="tk-verse tk-tapverse" data-cv="' + state.chapter + ':' + v +
                  '" style="cursor:pointer" title="tap for shnayim mikra">' + body +
                  ' <span class="tk-vnum">[' + n + '/2]</span>' + num + '</div>');
      } else { /* stacked */
        html.push('<div class="tk-verse">' + mikra + num +
          '<div class="tk-mikra-repeat">' + mikra + '</div>' +
          '</div>');
      }
    });
    box.innerHTML = html.join('');
    if (state.layout === 'tap') {
      Array.prototype.forEach.call(document.querySelectorAll('.tk-tapverse'), function (el) {
        el.addEventListener('click', function () {
          var cv = el.getAttribute('data-cv');
          state.tapCount[cv] = (state.tapCount[cv] || 0) + 1;
          render();
        });
      });
    }
  }

  function fillChapters() {
    var book = state.data;
    var sel = $('tk-chapter');
    sel.innerHTML = '';
    Object.keys(book.ch).map(Number).sort(function (a, b) { return a - b; }).forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c + '  (' + heNum(c) + ')';
      sel.appendChild(o);
    });
    sel.value = state.chapter;
  }

  function loadBook(slug, chapter, cb) {
    fetch('/reader/medooyuk/' + slug + '.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        state.data = d;
        state.chapter = Math.min(chapter || 1, Math.max.apply(null, Object.keys(d.ch).map(Number)));
        fillChapters();
        render();
        if (cb) cb();
      })
      .catch(function (e) {
        $('tk-content').innerHTML = '<p class="tk-error">Could not load ' + slug + ': ' + e + '</p>';
      });
  }

  function save() {
    try {
      localStorage.setItem('tk-settings', JSON.stringify({
        slug: state.slug, chapter: state.chapter, mode: state.mode,
        medooyuk: state.medooyuk, shnayim: state.shnayim, layout: state.layout,
        size: state.size, theme: state.theme
      }));
    } catch (e) {}
  }

  function load() {
    try { return JSON.parse(localStorage.getItem('tk-settings') || '{}'); } catch (e) { return {}; }
  }

  function parshaFor(slug, chapter) {
    for (var i = 0; i < PARSHIYOS.length; i++) {
      var p = PARSHIYOS[i];
      if (p[1] === slug && chapter >= p[2] && chapter <= p[4]) return i;
    }
    return -1;
  }

  function jumpParsha(i) {
    var p = PARSHIYOS[i];
    var slugChanged = state.slug !== p[1];
    state.slug = p[1];
    if (slugChanged) {
      loadBook(p[1], p[2], function () { gotoVerse(p[3]); });
    } else {
      state.chapter = p[2];
      $('tk-chapter').value = p[2];
      gotoVerse(p[3]);
    }
  }

  function gotoVerse(v) {
    var el = document.querySelector('.tk-verse');
    /* scroll to the verse element containing v: rebuild with anchor */
    var verses = document.querySelectorAll('.tk-verse');
    var keys = Object.keys(state.data.ch[state.chapter]).map(Number).sort(function (a, b) { return a - b; });
    var idx = keys.indexOf(v);
    if (verses[idx]) verses[idx].scrollIntoView({ block: 'start' });
  }

  function init() {
    var st = load();
    ['slug','chapter','mode','medooyuk','shnayim','layout','size','theme'].forEach(function (k) {
      if (st[k] !== undefined) state[k] = st[k];
    });
    /* deep link: /reader/tikkun?b=<slug>&c=<chapter> */
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('b')) { state.slug = q.get('b'); state.chapter = parseInt(q.get('c') || '1', 10); }
    } catch (e) {}

    var bsel = $('tk-book');
    BOOKS.forEach(function (b) {
      var o = document.createElement('option');
      o.value = b[0]; o.textContent = b[2] + ' · ' + b[1];
      bsel.appendChild(o);
    });
    bsel.value = state.slug;

    var psel = $('tk-parsha');
    PARSHIYOS.forEach(function (p, i) {
      var o = document.createElement('option');
      o.value = i; o.textContent = p[0];
      psel.appendChild(o);
    });
    var pi = parshaFor(state.slug, state.chapter);
    if (pi >= 0) psel.value = pi;

    $('tk-mode').value = state.mode;
    $('tk-medooyuk').checked = state.medooyuk;
    $('tk-shnayim').checked = state.shnayim;
    $('tk-layout').value = state.layout;
    $('tk-size').value = state.size;
    document.documentElement.style.setProperty('--tk-size', state.size + 'px');
    setTheme(state.theme);

    bsel.addEventListener('change', function () {
      state.slug = bsel.value;
      state.tapCount = {};
      psel.value = parshaFor(state.slug, state.chapter);
      save(); loadBook(state.slug, 1);
    });
    $('tk-chapter').addEventListener('change', function () {
      state.chapter = parseInt(this.value, 10); state.tapCount = {};
      psel.value = parshaFor(state.slug, state.chapter);
      save(); render(); window.scrollTo(0, 0);
    });
    psel.addEventListener('change', function () {
      jumpParsha(parseInt(this.value, 10)); save();
    });
    $('tk-mode').addEventListener('change', function () { state.mode = this.value; save(); render(); });
    $('tk-medooyuk').addEventListener('change', function () {
      state.medooyuk = this.checked; $('tk-legend').hidden = !state.medooyuk; save(); render();
    });
    $('tk-shnayim').addEventListener('change', function () { state.shnayim = this.checked; save(); render(); });
    $('tk-layout').addEventListener('change', function () { state.layout = this.value; save(); render(); });
    $('tk-size').addEventListener('input', function () {
      state.size = parseInt(this.value, 10);
      document.documentElement.style.setProperty('--tk-size', state.size + 'px'); save();
    });
    $('tk-prev').addEventListener('click', function () {
      if (state.chapter > 1) { state.chapter--; fillChapters(); save(); render(); window.scrollTo(0, 0); }
    });
    $('tk-next').addEventListener('click', function () {
      var max = Math.max.apply(null, Object.keys(state.data.ch).map(Number));
      if (state.chapter < max) { state.chapter++; fillChapters(); save(); render(); window.scrollTo(0, 0); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tk-theme'), function (b) {
      b.addEventListener('click', function () { setTheme(this.getAttribute('data-t')); save(); });
    });

    $('tk-legend').hidden = !state.medooyuk;
    loadBook(state.slug, state.chapter);
  }

  function setTheme(t) {
    state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
