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

  var R = window.TikkunRenderer;
  var D = window.TikkunColumnDisplay;
  var requestId = 0, presentation = null, fixed = null, navigation = null, pointingReady = false, studyGeometry = null, studyFontsReady = false, presentationError = '', readingError = '';

  var state = {
    slug: 'tanach-bereishit', chapter: 1,
    mode: 'full', medooyuk: true, shnayim: false,
    layout: 'stacked', targum: '', size: 26, theme: 'day',
    view: 'sefer',   /* fixed edition columns; study/verses keep the UXLC reading */
    fixedPage: null, columnRepresentation: 'source', columnZoom: 1, columnNikud: false, columnTaamim: false,
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
    return R.mode(text, mode || state.mode);
  }

  function overlay() { return presentation && presentation.books[state.slug]; }
  function mikraHTML(verse, v) {
    return R.readingVerse(R.repaired(verse, overlay(), state.chapter + ':' + v), {mode:state.mode, marked:state.medooyuk});
  }
  function scrollHTML(verse, v) {
    var o = overlay();
    if (!o) return '<span class="tk-tmissing">Written text unavailable — reload to retry.</span>';
    return R.writtenVerse(verse, o.verses[state.chapter + ':' + v]);
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

    var shnayim = state.shnayim && state.targumData;
    var html = [];
    var heads = '';

    var isFixed = state.view === 'sefer';
    $('tk-app').setAttribute('data-tk-view',state.view);
    $('tk-mode').disabled = isFixed; // independent column switches below
    $('tk-medooyuk').disabled = isFixed;
    $('tk-legend').hidden = isFixed || !state.medooyuk;
    $('tk-layout').disabled = !state.shnayim;
    $('tk-column-controls').hidden = !isFixed;
    if (isFixed) {
      if (!fixed || !navigation) { box.innerHTML = '<p class="tk-error">' + esc(presentationError || 'Loading column layout…') + '</p>'; return; }
      var pages = chapterPages(state.slug, state.chapter);
      $('tk-column').disabled = !pages.length;
      $('tk-column-prev').disabled = !pages.length; $('tk-column-next').disabled = !pages.length;
      if (!pages.length) {
        box.innerHTML = '<p class="tk-sefer-note">Fixed Torah columns are available for the five books only. Choose Continuous study or Numbered verses for this book.</p>';
        return;
      }
      var n = state.fixedPage || pages[0];
      $('tk-column').value = n;
      $('tk-column-prev').disabled = n <= 1; $('tk-column-next').disabled = n >= 245;
      $('tk-column-nikud').checked = state.columnNikud; $('tk-column-taamim').checked = state.columnTaamim;
      $('tk-column-fit').textContent = 'Fit · ' + Math.round(state.columnZoom * 100) + '%';
      $('tk-column-less').disabled = state.columnZoom <= .5; $('tk-column-more').disabled = state.columnZoom >= 3;
      $('tk-column-representation').value = state.columnRepresentation;
      var study = state.columnRepresentation === 'study';
      if (study && (!pointingReady || !studyGeometry || !studyFontsReady)) { box.innerHTML = '<p class="pointing-unavailable tk-error">Study font or pointing data unavailable / still loading. Switch to Original ink; its source column is unchanged.</p>'; return; }
      box.innerHTML = (study ? '<p class="tk-sefer-note" dir="ltr">Pointable Shlomo Stam study · NOT original ink. Source rows and special letters retained; differing words stay bare. Copy retains associated Unicode. Meteg follows Taamim.</p>' : '') + '<p class="tk-sefer-note" dir="ltr">Fixed written edition · all 42 source rows and their groups stay intact. Fit scales the entire column, including song spacing; zoom allows local panning. Reading Size is separate. A typeset reconstruction, not a photographed scroll.</p>' +
        '<div class="tk-scroll-viewport" tabindex="0" role="region" aria-label="Torah column; fits screen at 100%, local panning when enlarged"><div class="tk-fixed-strip">' +
        (study ? D.renderStudyColumn(n, fixed.pages[n], studyGeometry[n], state.columnNikud, state.columnTaamim, [], true) : R.fixedColumn(fixed.pages[n], n)) + '</div></div>' +
        ((state.columnNikud || state.columnTaamim) ? pointingReady ? D.renderColumnPointingAdvice(n, state.columnNikud, state.columnTaamim, study) : '<p class="tk-error pointing-unavailable">Column pointing data unavailable. Fixed ink remains unchanged. Reload to retry.</p>' : '') +
        (readingError ? '<p class="tk-sefer-note">Fixed column remains available; the independent reading book could not load.</p>' : '');
      fitColumn();
      return;
    }
    if (!state.data) { box.innerHTML = '<p class="tk-error">' + (readingError || 'Loading reading…') + '</p>'; return; }
    var ch = state.data.ch[state.chapter];
    if (!ch) { box.innerHTML = '<p class="tk-error">Chapter not found.</p>'; return; }
    if (state.view === 'study') {
      box.innerHTML = '<p class="tk-sefer-note" dir="ltr">Continuous reading study · the lines adapt to your screen. This is not the fixed scroll layout.</p>' +
        '<div class="tk-study-flow">' + R.continuous(state.data.ch, state.chapter, overlay(), {mode:state.mode, marked:state.medooyuk}) + '</div>';
      return;
    }

    if (state.shnayim) {
      heads = '<div class="tk-shnayim-note">' +
        '<span class="tk-colhead-scroll">Unpointed written edition · per-verse study, not fixed scroll layout</span>' +
        '<span class="tk-colhead-read">קריאה · reading line (nikud + taamim)</span>' +
        '</div>';
      html.push(heads);
    }
    Object.keys(ch).map(Number).sort(function (a, b) { return a - b; }).forEach(function (v) {
      var verse = ch[v];
      var mikra = mikraHTML(verse, v);
      var scroll = state.shnayim ? scrollHTML(verse, v) : "";
      var num = '<span class="tk-vnum">(' + heNum(v) + ')</span>';
      var peCls = endsPetucha(verse) ? ' tk-petucha' : '';
      if (!state.shnayim) {
        html.push('<div class="tk-verse' + peCls + '" data-verse="' + state.chapter + ':' + v + '">' + mikra + num + '</div>');
        return;
      }
      if (state.layout === 'side') {
        html.push('<div class="tk-verse tk-side' + peCls + '">' +
          '<div class="tk-col-scroll"><div class="tk-line-scroll">' + scroll + '</div></div>' +
          '<div class="tk-col-read">' + mikra + num +
          (targumLine(state.chapter, v) || '<i class="tk-tmissing">targum not available</i>') + '</div></div>');
      } else if (state.layout === 'tap') {
        var n = state.tapCount[state.chapter + ':' + v] || 0;
        var body = '<div class="tk-line-scroll">' + scroll + '</div>';
        if (n >= 2) body += '<div class="tk-line-read">' + mikra + '</div>';
        if (n >= 3) body += targumLine(state.chapter, v);
        if (n >= 3) body = '<span class="tk-tap-done">' + body + '</span>';
        html.push('<div class="tk-verse tk-tapverse' + peCls + '" data-cv="' + state.chapter + ':' + v +
                  '" style="cursor:pointer" title="tap: 1 scroll · 2 reading · 3 targum">' + body +
                  ' <span class="tk-vnum">[' + Math.min(n, 3) + '/3]</span></div>');
      } else { /* stacked: scroll line, reading line, targum */
        html.push('<div class="tk-verse' + peCls + '">' +
          '<div class="tk-line-scroll">' + scroll + '</div>' +
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

  function chapterPages(slug, chapter) {
    if (!navigation) return [];
    var prefix=slug+'/'+chapter+'/';
    return [...new Set(Object.keys(navigation.verses).filter(function(k){return k.indexOf(prefix) === 0;}).flatMap(function(k){return navigation.verses[k].rows.map(function(r){return r[0];});}))].sort(function(a,b){return a-b;});
  }
  function fitColumn() {
    var viewport=document.querySelector('.tk-scroll-viewport'), column=document.querySelector('.tk-fixed-page');
    if (!viewport || !column) return;
    // Em geometry includes the outside gutter; labels never scale into ink.
    var width=viewport.getBoundingClientRect().width;
    var size=state.columnRepresentation === 'study' && studyGeometry ? D.studyDisplaySize(width+36,studyGeometry[column.dataset.column],state.columnZoom) : D.fixedDisplaySize(width+36,+column.dataset.column,state.columnZoom);
    viewport.style.fontSize=size+'px';
  }

  function fillChapters() {
    var book = state.data;
    if (!book && !navigation) return;
    var sel = $('tk-chapter');
    sel.innerHTML = '';
    (book ? Object.keys(book.ch) : [...new Set(Object.keys(navigation.verses).filter(function(k){return k.indexOf(state.slug + '/') === 0;}).map(function(k){return k.split('/')[1];}))]).map(Number).sort(function (a, b) { return a - b; }).forEach(function (c) {
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

  function fetchJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function loadBook(slug, chapter, cb) {
    var id = ++requestId;
    state.data = null; state.targumData = null; state.fixedPage = null; readingError = '';
    render();
    fetchJSON('/reader/medooyuk/' + slug + '.json').then(function (d) {
      if (id !== requestId) return;
      state.data = d;
      state.chapter = Math.max(1, Math.min(chapter || 1, Math.max.apply(null, Object.keys(d.ch).map(Number))));
      fillChapters(); fillTargumSelect(); $('tk-parsha').value = parshaFor(state.slug, state.chapter); save(); render();
      if (cb) cb();
      return fetch('/reader/medooyuk/targum/' + slug + '.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (t) {
        if (id !== requestId) return;
        state.targumData = t; fillTargumSelect(); if (state.shnayim) render();
      });
    }).catch(function () {
      if (id !== requestId) return;
      if (state.data) { fillTargumSelect(); render(); return; }
      readingError = 'Could not load this book. Please reload to retry.'; fillChapters(); render();
    });
  }
  function moveColumn(delta) {
    if (!fixed) return;
    var ps = chapterPages(state.slug, state.chapter);
    if (!ps.length) return;
    selectColumn(Math.max(1, Math.min(245, (state.fixedPage || ps[0]) + delta)));
  }

  function selectColumn(n) {
    if (!fixed || !navigation || !fixed.pages[n]) return;
    var owner = Object.keys(navigation.verses).find(function(k){return navigation.verses[k].rows.some(function(r){return r[0] === n;});});
    if (!owner) return;
    var parts = owner.split('/'), slug = parts[0], ref = {chapter:+parts[1]};
    var show = function () { state.fixedPage = n; render(); save(); };
    if (slug !== state.slug) { state.slug = slug; state.chapter = ref.chapter; $('tk-book').value = slug; loadBook(slug, ref.chapter, show); fillChapters(); show(); }
    else { state.chapter = ref.chapter; fillChapters(); $('tk-parsha').value = parshaFor(slug, ref.chapter); show(); }
  }

  function save() {
    try {
      localStorage.setItem('tk-settings', JSON.stringify({
        slug: state.slug, chapter: state.chapter, mode: state.mode,
        medooyuk: state.medooyuk, shnayim: state.shnayim, layout: state.layout,
        targum: state.targum, size: state.size, theme: state.theme,
        view: state.view, columnRepresentation: state.columnRepresentation, columnZoom: state.columnZoom, columnNikud: state.columnNikud, columnTaamim: state.columnTaamim
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
    if (!p) return;
    var slugChanged = state.slug !== p[1];
    state.slug = p[1];
    if (slugChanged) $('tk-book').value = p[1];
    if (slugChanged) {
      loadBook(p[1], p[2], function () { gotoVerse(p[3]); });
    } else {
      state.chapter = p[2];
      $('tk-chapter').value = p[2];
      state.fixedPage = null; render(); gotoVerse(p[3]);
    }
  }

  function gotoVerse(v) {
    if (state.view === 'sefer' && fixed) {
      var entry = navigation && navigation.verses[state.slug + '/' + state.chapter + '/' + v];
      var p = entry && entry.rows[0][0];
      if (p) { state.fixedPage = +p; render(); }
    }
    var el = document.querySelector('[data-verse="' + state.chapter + ':' + v + '"]');
    if (el) el.scrollIntoView({block:'start'});
  }

  function init() {
    var st = load();
    ['slug','chapter','mode','medooyuk','shnayim','layout','targum','size','theme','view','columnZoom','columnNikud','columnTaamim','columnRepresentation'].forEach(function (k) {
      if (st[k] !== undefined) state[k] = st[k];
    });
    /* deep link: /reader/tikkun?b=<slug>&c=<chapter> */
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('b')) { state.slug = q.get('b'); state.chapter = parseInt(q.get('c') || '1', 10); }
    } catch (e) {}

    if (!BOOKS.some(function (b) { return b[0] === state.slug; })) state.slug = BOOKS[0][0];
    if (!Number.isFinite(+state.chapter) || +state.chapter < 1) state.chapter = 1;
    if (['full','nikud','taamim','letters'].indexOf(state.mode) < 0) state.mode = 'full';
    if (['day','sepia','night'].indexOf(state.theme) < 0) state.theme = 'day';
    if (['sefer','study','verses'].indexOf(state.view) < 0) state.view = 'sefer';
    if (['stacked','side','tap'].indexOf(state.layout) < 0) state.layout = 'stacked';
    state.size = Math.max(16, Math.min(44, +state.size || 26));
    state.columnRepresentation = state.columnRepresentation === 'study' ? 'study' : 'source';
    state.columnZoom = D.clampColumnZoom(Number(state.columnZoom));
    state.columnNikud = state.columnNikud === true; state.columnTaamim = state.columnTaamim === true;
    var viewParam = new URLSearchParams(location.search).get('view');
    if (['sefer','study','verses'].indexOf(viewParam) >= 0) state.view = viewParam;
    if (state.shnayim) state.view = 'verses';

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
    $('tk-view').value = state.view;
    $('tk-size').value = state.size;
    $('tk-app').style.setProperty('--tk-size', state.size + 'px');
    setTheme(state.theme);

    bsel.addEventListener('change', function () {
      state.slug = bsel.value;
      state.tapCount = {};
      psel.value = parshaFor(state.slug, state.chapter);
      save(); loadBook(state.slug, 1);
    });
    $('tk-chapter').addEventListener('change', function () {
      state.chapter = parseInt(this.value, 10); state.tapCount = {}; state.fixedPage = null;
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
    $('tk-shnayim').addEventListener('change', function () {
      /* Shnayim and Sefer view are both full-page presentations; turning on
         Sefer turns off the per-verse shnayim layouts so the two never fight. */
      if (this.checked && state.view !== 'verses') { state.view = 'verses'; $('tk-view').value = 'verses'; }
      state.shnayim = this.checked; save(); render();
    });
    $('tk-view').addEventListener('change', function () {
      state.view = this.value;
      if (state.view !== 'verses') { state.shnayim = false; $('tk-shnayim').checked = false; }
      save(); render();
    });
    $('tk-layout').addEventListener('change', function () { state.layout = this.value; save(); render(); });
    $('tk-targum').addEventListener('change', function () { state.targum = this.value; save(); });
    $('tk-size').addEventListener('input', function () {
      state.size = parseInt(this.value, 10);
      $('tk-app').style.setProperty('--tk-size', state.size + 'px'); save();
    });
    $('tk-prev').addEventListener('click', function () {
      if (!state.data) return;
      state.fixedPage = null;
      if (state.chapter > 1) { state.chapter--; fillChapters(); save(); render(); window.scrollTo(0, 0); }
    });
    $('tk-next').addEventListener('click', function () {
      if (!state.data) return;
      state.fixedPage = null;
      var max = Math.max.apply(null, Object.keys(state.data.ch).map(Number));
      if (state.chapter < max) { state.chapter++; fillChapters(); save(); render(); window.scrollTo(0, 0); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tk-theme'), function (b) {
      b.addEventListener('click', function () { setTheme(this.getAttribute('data-t')); save(); });
    });

    $('tk-legend').hidden = !state.medooyuk;
    for (var n = 1; n <= 245; n++) {
      var option = document.createElement('option'); option.value = n; option.textContent = n;
      $('tk-column').appendChild(option);
    }
    $('tk-column').addEventListener('change', function () { selectColumn(+this.value); });
    $('tk-column-prev').addEventListener('click', function () { moveColumn(-1); });
    $('tk-column-next').addEventListener('click', function () { moveColumn(1); });
    $('tk-column-fit').addEventListener('click', function(){state.columnZoom=1;save();render();});
    $('tk-column-less').addEventListener('click', function(){state.columnZoom=D.clampColumnZoom(state.columnZoom-.25);save();render();});
    $('tk-column-more').addEventListener('click', function(){state.columnZoom=D.clampColumnZoom(state.columnZoom+.25);save();render();});
    $('tk-column-representation').addEventListener('change', function(){state.columnRepresentation=this.value;save();render();});
    $('tk-column-nikud').addEventListener('change', function(){state.columnNikud=this.checked;save();render();});
    $('tk-column-taamim').addEventListener('change', function(){state.columnTaamim=this.checked;save();render();});
    new ResizeObserver(fitColumn).observe($('tk-content'));
    Promise.all(['full','nikud','taamim','bare'].map(function(mode){return document.fonts.load('28px StudyStam-'+mode).then(function(faces){if(!faces.length||!faces.every(function(f){return f.status==='loaded';}))throw Error('Study font unavailable');});})).then(function(){studyFontsReady=true;render();}).catch(function(){studyFontsReady=false;render();});
    fetchJSON('/tikkun/study-geometry.json?v=study-1').then(function(d){if(Object.keys(d).length!==245 || !Object.values(d).every(function(v){return Number.isFinite(v)&&v>=21&&v<100;}))throw Error('Study geometry invalid');studyGeometry=d;render();}).catch(function(){studyGeometry=null;render();});
    fetchJSON('/tikkun/written-overrides.json?v=1').then(function (d) { presentation = d; render(); }).catch(function () {
      presentationError = 'Written spelling data could not load. Reload to retry.'; render();
    });
    fetchJSON('/tikkun/selection-index.json?v=column-fit-1').then(function (d) {
      if (!d || d.version !== 1 || d.fixedSha256 !== 'd0f4ca04162fc22299a492221cc67b9b3a054cdd77d9441821ea8b217fe69a85' || !d.verses || Object.keys(d.verses).length !== 5853 || !Object.values(d.verses).every(function(v){return v && Array.isArray(v.rows) && v.rows.length && v.rows.every(function(r){return Array.isArray(r) && r.length === 3 && r.every(Number.isInteger) && r[0]>=1 && r[0]<=245 && r[1]>=1 && r[2]<=42 && r[1]<=r[2];});})) throw new Error('Navigation source mismatch');
      navigation = d; Object.assign(window.TikkunColumnNavigation,d); if (!state.data) fillChapters(); render();
    }).catch(function () { navigation=null; presentationError = 'Column navigation data unavailable. Reload to retry.'; render(); });
    fetchJSON('/tikkun/column-pointing.json?v=column-fit-1').then(function(d){
      if (!d || d.version !== 2 || !d.columns || Object.keys(d.columns).length !== 245 || !Array.isArray(d.refs) || !d.sources || d.sources.fixedSha256 !== 'd0f4ca04162fc22299a492221cc67b9b3a054cdd77d9441821ea8b217fe69a85') throw new Error('Pointing source mismatch');
      Object.assign(window.TikkunColumnPointing,d);pointingReady=true;render();
    }).catch(function(){pointingReady=false;render();});
    fetchJSON('/tikkun/fixed-columns.json?v=1').then(function (d) { fixed = d; render(); }).catch(function () {
      presentationError = 'Column layout could not load. Choose a study view or reload to retry.'; render();
    });
    document.querySelectorAll('[data-tk-demo]').forEach(function (el) {
      var type = el.getAttribute('data-tk-demo'), t = type === 'na' ? 'ש\u05B0' : type === 'meteg' ? 'א\u05BD' : 'ק\u05B8';
      el.innerHTML = type === 'qb' ? R.token('ק\u05B8ב\u05B0', [[0,1,'',true]], [], {mode:'full',marked:true}) : R.token(t, [[0,0,type]], [], {mode:'full',marked:true});
    });
    loadBook(state.slug, state.chapter);
  }

  function setTheme(t) {
    state.theme = t;
    $('tk-app').setAttribute('data-tk-theme', t);
    Array.prototype.forEach.call(document.querySelectorAll('.tk-theme'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === t));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
