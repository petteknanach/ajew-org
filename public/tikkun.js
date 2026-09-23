/* Tikun Korim - ajew.org
 * Whole-Tanach reader's tikkun: 4 display modes, medooyuk sheva layer,
 * Shnayim Mikra v'Echad Targum with three layouts. Data:
 *   /reader/medooyuk/<slug>.json          {book,slug,he,en,ch:{c:{v:{t,k,m}}}}
 *   /reader/medooyuk/targum/<slug>.json   {name,ch:{c:{v:text}}}
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
    layout: 'stacked', targum: '', size: 26, theme: 'day',
    data: null, targumData: null, tapCount: {}
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

  function applyMode(text, mode) {
    var m = mode || state.mode;
    if (m === 'nikud') return text.replace(TAAMIM, '');
    if (m === 'taamim') return text.replace(NIKUD, '');
    if (m === 'letters') return text.replace(TAAMIM, '').replace(NIKUD, '');
    return text;
  }

  /* Split a token into per-letter segments: each base consonant (U+05D0-U+05EA)
     plus the combining marks that follow it. medooyuk letter indexes (li) count
     base consonants exactly this way. */
  function letterSegments(tok) {
    var segs = [], cur = '';
    for (var i = 0; i < tok.length; i++) {
      var cp = tok.charCodeAt(i);
      if (cp >= 0x5D0 && cp <= 0x5EA) {
        if (cur) segs.push(cur);
        cur = tok[i];
      } else {
        cur += tok[i];
      }
    }
    if (cur) segs.push(cur);
    return segs;
  }

  /* One token's HTML. medooyuk marks sit on the NIKUD CHARACTERS THEMSELVES —
     the letters stay regular (Simanim style: shva na is the emphasized one).
     m marks: [[ti, li, lb, qb]] where li is the SHEVA letter; qb=1 means the
     qamats feeding that sheva needs beur, so the qamats on li-1 is dotted.
     ls: [[ti, li, 'lg'|'sm'|'sus']] letter-presentation entries (scroll-true). */
  function tokenHTML(tok, mks, ls) {
    var segs = letterSegments(tok);
    var na = {}, qbNext = {}, lsByLi = {};
    (state.medooyuk && mks ? mks : []).forEach(function (mk) {
      if (mk[1] >= 0 && mk[1] < segs.length) {
        if (mk[2] === 'na') na[mk[1]] = 1;
        if (mk[3]) { if (mk[1] > 0) qbNext[mk[1] - 1] = 1; }
      }
    });
    (ls || []).forEach(function (l) {
      if (l[1] >= 0 && l[1] < segs.length) lsByLi[l[1]] = l[2];
    });
    var out = '';
    for (var j = 0; j < segs.length; j++) out += segHTML(segs[j], na[j], qbNext[j], lsByLi[j]);
    return out;
  }

  /* One letter segment (base consonant + its marks), mark-level styled. */
  function segHTML(seg, na, qb, lsKind) {
    var out = '';
    for (var i = 0; i < seg.length; i++) {
      var vis = applyMode(seg[i], state.mode);
      if (!vis) continue;
      var cp = seg.charCodeAt(i), cls = null;
      if (state.medooyuk) {
        if (cp === 0x5BD) cls = 'm-meteg';
        else if (cp === 0x5B0 && na) cls = 'm-na';
        else if ((cp === 0x5B8 || cp === 0x5C7) && qb) cls = 'm-qb';
      }
      if (i === 0 && lsKind) cls = cls ? cls + ' tk-l-' + lsKind : 'tk-l-' + lsKind;
      out += cls ? '<span class="' + cls + '">' + esc(vis) + '</span>' : esc(vis);
    }
    return out;
  }

  function joinTokens(arr) {
    var out = '';
    for (var i = 0; i < arr.length; i++) {
      if (out && !/[\u05BE\u05C0\u200F]$/.test(out) && out.slice(-1) !== ' ') out += ' ';
      out += arr[i];
    }
    return out;
  }

  /* Render one verse's mikra text with medooyuk spans on the marked letters. */
  function mikraHTML(verse) {
    var byTok = {}, byL = {};
    (verse.m || []).forEach(function (mk) {
      (byTok[mk[0]] = byTok[mk[0]] || []).push(mk);
    });
    (verse.L || []).forEach(function (l) {
      (byL[l[0]] = byL[l[0]] || []).push(l);
    });
    var parts = verse.t.map(function (tok, i) {
      return tokenHTML(tok, byTok[i], byL[i]);
    });
    return joinTokens(withBreaks(verse, parts));
  }

  /* The verse exactly as it appears in the sefer Torah: bare letters, with
     large/small/suspended letters at their true size (UXLC <s t=...>). */
  function scrollHTML(verse) {
    var byL = {};
    (verse.L || []).forEach(function (l) {
      (byL[l[0]] = byL[l[0]] || []).push(l);
    });
    var parts = verse.t.map(function (tok, i) {
      var bare = applyMode(tok, 'letters');
      var ls = byL[i];
      if (!ls) return esc(bare);
      var segs = letterSegments(tok); /* letter count identical in bare form */
      var out = '';
      for (var li = 0; li < segs.length; li++) {
        var kind = null;
        ls.forEach(function (l) { if (l[1] === li) kind = l[2]; });
        var seg = esc(applyMode(segs[li], 'letters'));
        out += kind ? '<span class="tk-l-' + kind + '">' + seg + '</span>' : seg;
      }
      return out;
    });
    return joinTokens(withBreaks(verse, parts));
  }

  /* Sefer-Torah parsha breaks, POSITIONAL: verse.b = [[ti, kind]] with ti =
     tokens before the break ('p' petucha, 's' setuma, 'n8' inverted nun).
     Verse-final breaks (ti = len) render after the last word; the rare
     mid-verse breaks (Deut 2:8, 5:21, ...) render between words. */
  function brkSpan(kind) {
    if (kind === 'p') return '<span class="tk-brk tk-brk-pe" title="petucha · פתוחה">פ</span>';
    if (kind === 's') return '<span class="tk-brk tk-brk-se" title="setuma · סתומה">ס</span>';
    return '<span class="tk-nun8" title="inverted nun · נ הפוכה">נ</span>';
  }
  function withBreaks(verse, parts) {
    var bs = verse.b || [];
    if (!bs.length) return parts;
    var out = parts.slice();
    for (var i = bs.length - 1; i >= 0; i--) {
      out.splice(Math.min(bs[i][0], out.length), 0, brkSpan(bs[i][1]));
    }
    return out;
  }
  function endsPetucha(verse) {
    var bs = verse.b || [];
    for (var i = 0; i < bs.length; i++) {
      if (bs[i][1] === 'p' && bs[i][0] >= verse.t.length) return true;
    }
    return false;
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function targumLine(c, v) {
    if (!state.targumData) return '';
    var t = (state.targumData.ch[c] || {})[v];
    if (!t) return '';
    var nm = state.targumData.name;
    return '<div class="tk-targum-line"><span class="tk-tname">' + esc(nm) +
           ':</span> ' + esc(applyMode(t, state.mode)) + '</div>';
  }

  function render() {
    var box = $('tk-content');
    if (!state.data) { box.innerHTML = '<p class="tk-loading">Loading…</p>'; return; }
    var ch = state.data.ch[state.chapter];
    if (!ch) { box.innerHTML = '<p class="tk-error">Chapter not found.</p>'; return; }
    var shnayim = state.shnayim && state.targumData;
    var html = [];
    var heads = '';
    if (state.shnayim) {
      heads = '<div class="tk-shnayim-note">' +
        '<span class="tk-colhead-scroll">כתב התורה · sefer-Torah line (bare letters)</span>' +
        '<span class="tk-colhead-read">קריאה · reading line (nikud + taamim)</span>' +
        '</div>';
      html.push(heads);
    }
    Object.keys(ch).map(Number).sort(function (a, b) { return a - b; }).forEach(function (v) {
      var verse = ch[v];
      var mikra = mikraHTML(verse);
      var scroll = scrollHTML(verse);
      var num = '<span class="tk-vnum">(' + heNum(v) + ')</span>';
      var peCls = endsPetucha(verse) ? ' tk-petucha' : '';
      if (!state.shnayim) {
        html.push('<div class="tk-verse' + peCls + '">' + mikra + num + '</div>');
        return;
      }
      if (state.layout === 'side') {
        html.push('<div class="tk-verse tk-side' + peCls + '">' +
          '<div class="tk-col-scroll"><div class="tk-line-scroll">' + scroll + num + '</div></div>' +
          '<div class="tk-col-read">' + mikra + num +
          (targumLine(state.chapter, v) || '<i class="tk-tmissing">targum not available</i>') + '</div></div>');
      } else if (state.layout === 'tap') {
        var n = state.tapCount[state.chapter + ':' + v] || 0;
        var body = '<div class="tk-line-scroll">' + scroll + num + '</div>';
        if (n >= 2) body += '<div class="tk-line-read">' + mikra + '</div>';
        if (n >= 3) body += targumLine(state.chapter, v);
        if (n >= 3) body = '<span class="tk-tap-done">' + body + '</span>';
        html.push('<div class="tk-verse tk-tapverse' + peCls + '" data-cv="' + state.chapter + ':' + v +
                  '" style="cursor:pointer" title="tap: 1 scroll · 2 reading · 3 targum">' + body +
                  ' <span class="tk-vnum">[' + Math.min(n, 3) + '/3]</span></div>');
      } else { /* stacked: scroll line, reading line, targum */
        html.push('<div class="tk-verse' + peCls + '">' +
          '<div class="tk-line-scroll">' + scroll + num + '</div>' +
          '<div class="tk-line-read">' + mikra + '</div>' +
          (targumLine(state.chapter, v) || '<div class="tk-targum-line"><i>targum not available</i></div>') +
          '</div>');
      }
    });
    if (state.shnayim && !state.targumData) {
      html.unshift('<p class="tk-error">Targum not available for this book — showing mikra lines only.</p>');
    }
    box.innerHTML = html.join('');
    if (state.layout === 'tap') {
      Array.prototype.forEach.call(document.querySelectorAll('.tk-tapverse'), function (el) {
        el.addEventListener('click', function () {
          var cv = el.getAttribute('data-cv');
          state.tapCount[cv] = Math.min((state.tapCount[cv] || 0) + 1, 3);
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

  function fillTargumSelect() {
    var sel = $('tk-targum');
    sel.innerHTML = '<option value="">—</option>';
    if (state.targumData) {
      var o = document.createElement('option');
      o.value = state.targumData.name; o.textContent = state.targumData.name;
      sel.appendChild(o);
      sel.value = state.targumData.name;
      sel.disabled = false;
    } else {
      sel.disabled = true;
    }
  }

  function loadBook(slug, chapter, cb) {
    fetch('/reader/medooyuk/' + slug + '.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        state.data = d;
        state.chapter = Math.min(chapter || 1, Math.max.apply(null, Object.keys(d.ch).map(Number)));
        fillChapters();
        var tsel = $('tk-targum');
        tsel.innerHTML = '<option value="">—</option>';
        tsel.disabled = true;
        state.targumData = null;
        fetch('/reader/medooyuk/targum/' + slug + '.json')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (t) {
            if (t) { state.targumData = t; }
            fillTargumSelect();
            render();
          }).catch(function () { fillTargumSelect(); render(); });
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
        targum: state.targum, size: state.size, theme: state.theme
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
    if (slugChanged) $('tk-book').value = p[1];
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
    ['slug','chapter','mode','medooyuk','shnayim','layout','targum','size','theme'].forEach(function (k) {
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
    $('tk-targum').addEventListener('change', function () { state.targum = this.value; save(); });
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
