/* Chok LiYisroel daily app - ajew.org
 * Data (all project-owned, ingested once):
 *   /reader/chok/schedule.json   {weeks:{<parsha>:{slug,days:{<day>:{torah,navi,...}}}}}
 *   /reader/chok/shabbos-map.json [{date,heb,weeks:[parsha]|null(festival)}]
 *   /reader/medooyuk/<slug>.json        pointed text + medooyuk marks
 *   /reader/medooyuk/targum/<slug>.json Aramaic targum (Onkelos etc.)
 */
(function () {
  'use strict';

  var SLUGS = {
    'בראשית':'tanach-bereishit','שמות':'tanach-shemos','ויקרא':'tanach-vayikra',
    'במדבר':'tanach-bamidbar','דברים':'tanach-devarim','יהושע':'tanach-yehoshua',
    'שופטים':'tanach-shoftim','שמואל א':'tanach-shmuel-a','שמואל ב':'tanach-shmuel-b',
    'מלכים א':'tanach-melachim-a','מלכים ב':'tanach-melachim-b','ישעיה':'tanach-yeshayahu',
    'ישעיהו':'tanach-yeshayahu','ירמיה':'tanach-yirmiyahu','ירמיהו':'tanach-yirmiyahu',
    'יחזקאל':'tanach-yechezkel','הושע':'tanach-hoshea','יואל':'tanach-yoel',
    'עמוס':'tanach-amos','עובדיה':'tanach-ovadya','יונה':'tanach-yonah',
    'מיכה':'tanach-michah','נחום':'tanach-nachum','חבקוק':'tanach-havakkuk',
    'צפניה':'tanach-tzefanya','חגי':'tanach-chaggai','זכריה':'tanach-zecharya',
    'מלאכי':'tanach-malachi','תהלים':'tanach-tehillim','משלי':'tanach-mishlei',
    'איוב':'tanach-iyov','שיר השירים':'tanach-shir-hashirim','רות':'tanach-rus',
    'איכה':'tanach-eicha','קהלת':'tanach-koheles','אסתר':'tanach-esther',
    'דניאל':'tanach-daniel','עזרא':'tanach-ezra','נחמיה':'tanach-nechemia',
    'דברי הימים א':'tanach-divrei-hayamim-a','דברי הימים ב':'tanach-divrei-hayamim-b'
  };
  var DAYS = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','ליל שישי','יום שישי'];
  // JS getDay(): 0=Sun..6=Sat -> default tab index into DAYS
  var DAY_DEFAULT = {0:0, 1:1, 2:2, 3:3, 4:4, 5:6, 6:6};
  var ORDER = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','ליל שישי','יום שישי'];

  var TAAMIM = /[\u0591-\u05AF\u05BD\u05C0]/g;
  var NIKUD  = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g;

  var state = {
    mode: 'full', medooyuk: true, targum: true, commentary: true, rashi: true,
    tanachen: true,
    day: null, weeks: null, size: 26, theme: 'day',
    sched: null, map: null, bonus: null, mussar: null, dcomm: null, kav: null, kavA: null,
    carryMode: 'daily', focus: null, focusWeek: null,
    bookCache: {}, targCache: {}, rashiCache: {}, enCache: {}, superCache: {}
  };
  var DAY_SLUGS = {'יום ראשון':'yom-rishon','יום שני':'yom-sheni','יום שלישי':'yom-shlishi',
    'יום רביעי':'yom-revii','יום חמישי':'yom-chamishi','ליל שישי':'leil-shishi','יום שישי':'yom-shishi'};
  var TUR_HE = {OC:'אור״ח', YD:'יו״ד', EH:'אה״ע', CM:'חו״מ'};
  var RAMBAT_SLUG = {'תפילה':'tefilah-and-birkat-kohanim','שבת':'shabbos','ברכות':'berachot','מעשה הקרבנות':'maaseh-hakorbonos','תשובה':'teshuvah','קריאת שמע':'kriat-shema','תלמוד תורה':'talmud-torah','איסורי ביאה':'issurei-biah','יסודי התורה':'yesodey-hatorah','עבודה זרה':'avodah-kochavim','פרה אדומה':'parah-adummah','אישות':'ishut','דעות':'deot','שמיטה ויובל':'shemita'};
  function halachaHTML(d) {
    var h = d.halacha || {};
    if (h.work === 'rambam' && h.hilchot && h.from_perek) {
      var sl = RAMBAT_SLUG[h.hilchot];
      if (!sl) return Promise.resolve(null);
      return fetchJSON('/reader/rambam/rambam-' + sl + '.json').then(function (r) {
        var hal = (r.ch || {})[String(h.from_perek)];
        if (!hal || !hal.length) return null;
        var body = hal.map(function (x, k) { return '<div class="ck-halacha-item"><span class="ck-hnum">' + (k + 1) + '. </span>' + richText(x) + '</div>'; }).join('');
        return '<details class="ck-layer ck-halacha" open><summary>רמב״ם — הלכות ' + h.hilchot + ' פרק ' + heNum(h.from_perek) + '</summary>' + body + '</details>';
      }).catch(function () { return null; });
    }
    if (h.work === 'SA' && h.tur && h.from) {
      return fetchJSON('/reader/shulchan/' + h.tur + '.json').then(function (r) {
        var seifim = (r.sim || {})[String(h.from)];
        if (!seifim || !seifim.length) return null;
        var body = seifim.map(function (x, k) { return '<div class="ck-halacha-item"><span class="ck-hnum">' + (k === 0 ? 'סעיף א' : heNum(k + 1)) + '. </span>' + richText(x) + '</div>'; }).join('');
        return comm('sa-magen-avraham', 'sa-' + String(h.tur || '').toLowerCase() + '-' + h.from).then(function (md) {
          var ma = md && (md.ch || {})[String(h.from)];
          var maBody = '';
          if (ma && ma.length) {
            maBody = ma.map(function (x) {
              return x ? '<div class="ck-comm-body">' + richText(x) + '</div>' : '';
            }).join('');
          }
          var extra = maBody ? commDetails('מגן אברהם', maBody) : '';
          return '<details class="ck-layer ck-halacha" open><summary>שולחן ערוך ' + (TUR_HE[h.tur] || h.tur) + ' סימן ' + heNum(h.from) + '</summary>' + body + extra + '</details>';
        });
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  var MISHNA_SLUGS = {'ברכות':'mishna-berakhot','פאה':'mishna-peah','דמאי':'mishna-demai',
    'כלאים':'mishna-kilayim','שביעית':'mishna-sheviit','תרומות':'mishna-terumot',
    'מעשרות':'mishna-maasrot','מעשר שני':'mishna-maaser-sheni','חלה':'mishna-challah',
    'ערלה':'mishna-orlah','ביכורים':'mishna-bikkurim','שבת':'mishna-shabbat',
    'עירובין':'mishna-eruvin','פסחים':'mishna-pesachim','שקלים':'mishna-shekalim',
    'יומא':'mishna-yoma','סוכה':'mishna-sukkah','ביצה':'mishna-beitzah','יום טוב':'mishna-beitzah',
    'ראש השנה':'mishna-rosh-hashanah','תענית':'mishna-taanit','מגילה':'mishna-megillah',
    'מועד קטן':'mishna-moed-katan','חגיגה':'mishna-chagigah','יבמות':'mishna-yevamot',
    'כתובות':'mishna-ketubot','נדרים':'mishna-nedarim','נזיר':'mishna-nazir',
    'סוטה':'mishna-sotah','גיטין':'mishna-gittin','קידושין':'mishna-kiddushin',
    'בבא קמא':'mishna-bava-kamma','בבא מציעא':'mishna-bava-metzia','בבא בתרא':'mishna-bava-batra',
    'סנהדרין':'mishna-sanhedrin','מכות':'mishna-makkot','שבועות':'mishna-shevuot',
    'עדיות':'mishna-eduyot','אבות':'mishna-avot','עבודה זרה':'mishna-avodah-zarah',
    'הוריות':'mishna-horayot','זבחים':'mishna-zevachim','מנחות':'mishna-menachot',
    'חולין':'mishna-chullin','בכורות':'mishna-bekhorot','ערכין':'mishna-arakhin',
    'תמורה':'mishna-temurah','כריתות':'mishna-kritot','מעילה':'mishna-meilah',
    'תמיד':'mishna-tamid','מידות':'mishna-middot','קינים':'mishna-kinnim',
    'כלים':'mishna-kelim','אהלות':'mishna-oholot','נגעים':'mishna-negaim',
    'פרה':'mishna-parah','טהרות':'mishna-teharot','מקואות':'mishna-mikvaot',
    'נדה':'mishna-niddah','מכשירין':'mishna-makhshirin','זבים':'mishna-zavim',
    'טבול יום':'mishna-tevul-yom','ידים':'mishna-yadayim','עוקצין':'mishna-uktzin'};
  function normLabel(s) {
    var t = (s || '').replace(/[״'"׳.]/g, '').replace(/^\u05de\u05e1\u05db\u05ea\s+/, '').trim();
    var expand = {'בק':'בבא קמא','במ':'בבא מציעא','בב':'בבא בתרא','רה':'ראש השנה','עז':'עבודה זרה',
      'מק':'מכות','שבועות':'שבועות','קידושין':'קידושין'};
    return expand[t] || t;
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function save() { try { localStorage.setItem('chok-settings', JSON.stringify({
      mode: state.mode, medooyuk: state.medooyuk, targum: state.targum,
      commentary: state.commentary, rashi: state.rashi, tanachen: state.tanachen,
      size: state.size, theme: state.theme, carryMode: state.carryMode })); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem('chok-settings') || '{}'); } catch (e) { return {}; } }
  function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function localIso(t) { var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()); }

  function applyMode(txt) {
    if (state.mode === 'full') return txt;
    var t = txt;
    if (state.mode === 'nikud') return t.replace(TAAMIM, '');
    if (state.mode === 'taamim') return t.replace(NIKUD, '');
    return t.replace(TAAMIM, '').replace(NIKUD, '');
  }
  function joinTokens(arr) {
    var out = '';
    for (var i = 0; i < arr.length; i++) {
      if (out && !/[\u05BE\u05C0\u200F]$/.test(out) && out.slice(-1) !== ' ') out += ' ';
      out += arr[i];
    }
    return out;
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
  /* medooyuk marks on the NIKUD CHARACTERS themselves — letters stay regular:
     sheva na colored (m-na), meteg colored (m-meteg), qamats katan colored
     (m-qk; mk.li IS the qamats letter), qamats feeding an unresolved sheva
     dotted on the qamats itself (m-qb; mk.li is the sheva letter, the qamats
     sits on li-1). */
  function coloredVerse(verse) {
    var byTok = {};
    (verse.m || []).forEach(function (mk) {
      (byTok[mk[0]] = byTok[mk[0]] || []).push(mk);
    });
    return joinTokens(verse.t.map(function (tok, i) {
      if (!state.medooyuk) return esc(applyMode(tok));
      var segs = letterSegments(tok);
      var na = {}, qbPrev = {}, qk = {};
      (byTok[i] || []).forEach(function (mk) {
        if (mk[1] >= 0 && mk[1] < segs.length) {
          if (mk[2] === 'na') na[mk[1]] = 1;
          if (mk[2] === 'qk') qk[mk[1]] = 1;
          if (mk[3]) { if (mk[1] > 0) qbPrev[mk[1] - 1] = 1; }
        }
      });
      var out = '';
      for (var j = 0; j < segs.length; j++) {
        var seg = segs[j];
        for (var k = 0; k < seg.length; k++) {
          var vis = applyMode(seg[k]);
          if (!vis) continue;
          var cp = seg.charCodeAt(k), cls = null;
          if (cp === 0x5BD) cls = 'm-meteg';
          else if (cp === 0x5B0 && na[j]) cls = 'm-na';
          else if ((cp === 0x5B8 || cp === 0x5C7) && qbPrev[j]) cls = 'm-qb';
          else if ((cp === 0x5B8 || cp === 0x5C7) && qk[j]) cls = 'm-qk';
          out += cls ? '<span class="' + cls + '">' + esc(vis) + '</span>' : esc(vis);
        }
      }
      return out;
    }));
  }
  function heNum(n) {
    var G = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'], T = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'], H = ['','ק','ר','ש','ת'];
    function u(x) { return x < 10 ? G[x] : x < 100 ? T[Math.floor(x/10)] + G[x%10] : H[Math.floor(x/100)] + u(x%100); }
    var s = u(n);
    if (s === 'יה') s = 'טו'; if (s === 'יו') s = 'טז';
    return s.replace(/([א-ת])$/, '$1\u05f4');
  }
  var __fq = [], __frunning = 0;
  function __fnext() {
    if (__frunning >= 6 || !__fq.length) return;
    __frunning++;
    var job = __fq.shift();
    job.run().then(function (v) { job.done(v); }, function (e) { job.fail(e); })
      .then(function () { __frunning--; __fnext(); });
  }
  function rawJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }
  function fetchJSON(url) {
    // concurrency-limited + one retry: bursts of data fetches were
    // resetting connections and silently dropping whole day sections
    return new Promise(function (resolve, reject) {
      var attempt = 0;
      var run = function () { return rawJSON(url); };
      var go = function () {
        __fq.push({ run: run, done: resolve, fail: function (e) {
          attempt++;
          if (attempt <= 2) { setTimeout(go, 350 * attempt); }
          else reject(e);
        } });
        __fnext();
      };
      go();
    });
  }
  function book(slug) {
    if (!state.bookCache[slug]) state.bookCache[slug] = fetchJSON('/reader/medooyuk/' + slug + '.json');
    return state.bookCache[slug];
  }
  function targ(slug) {
    state.targCache[slug] = state.targCache[slug] || fetchJSON('/reader/medooyuk/targum/' + slug + '.json').catch(function(){ return null; });
    return state.targCache[slug];
  }
  function en(slug) {
    state.enCache[slug] = state.enCache[slug] || fetchJSON('/reader/tanachen/' + slug + '.json').catch(function(){ return null; });
    return state.enCache[slug];
  }
  function rashi(slug) {
    state.rashiCache[slug] = state.rashiCache[slug] || fetchJSON('/reader/rashi/' + slug + '.json').catch(function(){ return null; });
    return state.rashiCache[slug];
  }
  function rashiEn(slug) {
    state.rashiCache['en:' + slug] = state.rashiCache['en:' + slug] || fetchJSON('/reader/rashi/en/' + slug + '.json').catch(function(){ return null; });
    return state.rashiCache['en:' + slug];
  }
  function richText(s) {
    // escape everything, then re-enable the minimal tags Rashi text uses
    return esc(s || '').replace(/&lt;(\/?)(b|i)&gt;/g, '<$1$2>');
  }
  function rashiHTML(slug, c, v) {
    if (!state.rashi) return Promise.resolve('');
    return Promise.all([rashi(slug), rashiEn(slug)]).then(function (rs) {
      var rd = rs[0], re = rs[1];
      var he = rd && (rd.ch || {})[c] && rd.ch[c][v];
      var en = re && (re.ch || {})[c] && re.ch[c][v];
      if ((!he || !he.length) && (!en || !en.length)) return '';
      var body = '';
      if (he && he.length) {
        body = he.map(function (cm, i) {
          var e = (en && en.length === he.length && en[i]) ? en[i] : null;
          var out = '<div class="ck-rbody">' + richText(applyModeStrip(cm)) + '</div>';
          if (e) out += '<div class="ck-rbody ck-ren">' + richText(e) + '</div>';
          return out;
        }).join('');
        if (en && en.length !== he.length) {
          body += '<div class="ck-ren-div"></div>' + en.map(function (e) {
            return '<div class="ck-rbody ck-ren">' + richText(e) + '</div>';
          }).join('');
        }
      } else if (en && en.length) {
        body = en.map(function (e) {
          return '<div class="ck-rbody ck-ren">' + richText(e) + '</div>';
        }).join('');
      }
      return '<details class="ck-layer ck-rashi"><summary>רש״י · Rashi</summary>' + body + '</details>';
    });
  }
  function applyModeStrip(s) { return s; }
  function comm(source, slug) {
    if (!state.commCache) state.commCache = {};
    var key = source + ':' + slug;
    if (!state.commCache[key]) {
      state.commCache[key] = fetchJSON('/reader/commentary/' + source + '/' +
        encodeURIComponent(slug) + '.json').catch(function () { return null; });
    }
    return state.commCache[key];
  }
  function commDetails(label, body) {
    if (!body) return '';
    return '<details class="ck-layer ck-comm"><summary>' + label + '</summary>' + body + '</details>';
  }
  function rashiSuper(slug, c, v) {
    state.superCache[slug] = state.superCache[slug] || fetchJSON('/reader/commentary/rashi-super/' + slug + '.json').catch(function () { return null; });
    return state.superCache[slug].then(function (d) {
      var row = d && (d.ch || {})[c] && d.ch[c][c + ':' + v];
      if (!row) return '';
      var names = Object.keys(row).filter(function (n) { return (row[n] || []).length; });
      if (!names.length) return '';
      var body = names.map(function (n) {
        return '<div class="ck-sup-name">' + esc(n) + '</div>' +
          (row[n] || []).map(function (p) { return '<div class="ck-sup-body">' + richText(p) + '</div>'; }).join('');
      }).join('');
      if (!body) return '';
      return '<details class="ck-comm ck-super"><summary>על רש״י — ' + esc(names.join(' · ')) + '</summary>' + body + '</details>';
    });
  }
  function kavanaHTML(secKey, d) {
    var kA = state.kavA && state.kavA.kavanos && state.kavA.kavanos[secKey];
    var kT = state.kav && state.kav.tefillos && state.kav.tefillos[secKey];
    var h = '';
    if (kA && kA.length) {
      h += '<details class="ck-kavana"><summary>כוונת הלימוד — האריז״ל</summary><div class="ck-kavana-body">' +
        kA.map(function (t) { return richText(t); }).join('') + '</div></details>';
    }
    if (kT) {
      h += '<details class="ck-kavana"><summary>תפלה לפני הלימוד</summary><div class="ck-kavana-body">' +
        richText(kT) + '</div></details>';
    }
    return h;
  }
  function kavanosHTML() {
    return fetchJSON('/reader/kavanos/index.json').catch(function () { return null; }).then(function (idx) {
      if (!idx || !idx.gates || !idx.gates.length) return '';
      var items = idx.gates.map(function (g) {
        return '<details class="ck-kav-gate" data-gate="' + g.n + '"><summary>' + esc(g.heName) +
          ' <span class="ck-ref">' + esc(g.name) + (g.chapters ? ' — ' + g.chapters + ' פרקים' : '') + '</span></summary>' +
          '<div class="ck-kav-body"></div></details>';
      }).join('');
      return '<section class="ck-section" id="ck-kavanos">' + secHead('כוונות — האריז״ל (פרי עץ חיים)') +
        '<p class="ck-kav-link"><a href="/reader/chok/kavanos/">כוונות לימוד תורה לשמה ותפלות לפני הלימוד ←</a></p>' +
        '<p class="ck-kav-note">כוונות התפילה והמצות. פתח שער, ופרק לעיון.</p>' + items + '</section>';
    });
  }
  function wireKavanos(root) {
    root.querySelectorAll('.ck-kav-gate:not([data-wired])').forEach(function (d) {
      d.setAttribute('data-wired', '1');
      d.addEventListener('toggle', function () {
        if (!d.open || d.getAttribute('data-loaded')) return;
        d.setAttribute('data-loaded', '1');
        var body = d.querySelector('.ck-kav-body');
        fetchJSON('/reader/kavanos/pec-gate-' + ('0' + d.getAttribute('data-gate')).slice(-2) + '.json')
          .then(function (gd) {
            var chs = Object.keys((gd || {}).ch || {}).map(Number).sort(function (a, b) { return a - b; });
            body.innerHTML = chs.map(function (cn) {
              var paras = gd.ch[cn];
              return '<details class="ck-kav-ch"><summary>פרק ' + heNum(cn) + '</summary>' +
                paras.map(function (p) { return '<div class="ck-kav-para">' + richText(p) + '</div>'; }).join('') + '</details>';
            }).join('') || '<p class="ck-kav-note">עוד לא נטען</p>';
          }).catch(function () { body.innerHTML = '<p class="ck-kav-note">עוד לא נטען</p>'; });
      });
    });
  }
  function verseCommHTML(kind, slug, c, v) {
    // Ramban only on Torah - no Ibn Ezra (Chayei Moharan 410)
    if (kind === 'navi') {
      return comm('navi-metzudas', slug).then(function (d) {
        var metz = d && (d.ch || {})[String(c)] && d.ch[String(c)][v - 1];
        return metz ? commDetails('מצודת דוד', '<div class="ck-comm-body">' + richText(metz) + '</div>') : '';
      });
    }
    return comm('torah-ramban', slug).then(function (d) {
      var rb = d && (d.ch || {})[String(c)] && d.ch[String(c)][v - 1];
      return rb ? commDetails('רמב״ן', '<div class="ck-comm-body">' + richText(rb) + '</div>') : '';
    });
  }
  var HK_NAMES = { LM: 'ליקוטי מוהר״ן', LM2: 'ליקוטי מוהר״ן ב׳', KLM: 'קיצור ליקוטי מוהר״ן', KLM2: 'קיצור ליקוטי מוהר״ן ב׳', HaMidos: 'ספר המדות', LikHalachos: 'ליקוטי הלכות', LikTefilos: 'ליקוטי תפלות', ChayeyMoharan: 'חיי מוהר״ן', Sichos: 'שיחות הר״ן' };
  function hkLine(parsha, verse) {
    var hk = state.hk && state.hk.parshiyos && state.hk.parshiyos[parsha];
    var refs = hk && hk[String(verse)];
    if (!refs || !refs.length) return '';
    var names = refs.map(function (r) {
      var nm = HK_NAMES[r.src] || r.src;
      return nm + (r.ref ? ' ' + r.ref : '');
    });
    return '<div class="ck-hk-src">מקורות ברסלב <span class="ck-hk-t">(הלכתא כנחמני)</span>: ' +
      names.join('; ') + '</div>';
  }
  function hkSafe(parsha, chapter) {
    return !!(state.hk && state.hk.safeChapters && state.hk.safeChapters[parsha] === chapter);
  }
  function versesHTML(slug, from, to, kind, vcomm, parsha) {
    return book(slug).then(function (d) {
      return Promise.all([targ(slug), state.tanachen ? en(slug) : Promise.resolve(null)]).then(function (ts) {
        var tg = ts[0], en = ts[1];
        var items = [];
        var c = from.c, v = from.v;
        var guard = 0;
        while (guard++ < 400) {
          var ch = (d.ch || {})[c] || {};
          var keys = Object.keys(ch).map(Number).sort(function (a,b){return a-b;});
          var vv = keys.filter(function (x) { return x >= v; });
          if (!vv.length) break;
          vv.forEach(function (x) {
            if (to && (c > to.c || (c === to.c && x > to.v))) return;
            var verse = ch[x];
            var row = coloredVerse(verse) + ' <span class="tk-vnum">(' + heNum(c) + ',' + heNum(x) + ')</span>';
            if (state.targum && tg && (tg.ch || {})[c] && tg.ch[c][x]) {
              row += '<div class="ck-targum-line">' + richText(applyMode(tg.ch[c][x])) + '</div>';
            }
            if (state.tanachen && en && (en.ch || {})[String(c)] && en.ch[String(c)][x - 1]) {
              row += '<div class="ck-en-line" dir="ltr">' + en.ch[String(c)][x - 1] + '</div>';
            }
            if (vcomm && vcomm.verses && vcomm.verses[c + ':' + x]) {
              row += voiceLine(vcomm.verses[c + ':' + x]);
            }
            if (kind === 'torah' && parsha && hkSafe(parsha, c)) {
              row += hkLine(parsha, x);
            }
            items.push({ c: c, x: x, row: row });
          });
          if (to && c >= to.c) break;
          c++; v = 1;
        }
        return Promise.all(items.map(function (it) {
          return Promise.all([rashiHTML(slug, it.c, it.x),
            verseCommHTML(kind || 'torah', slug, it.c, it.x),
            (kind || 'torah') === 'torah' ? rashiSuper(slug, it.c, it.x) : Promise.resolve(''),
            Promise.resolve(vcomm && vcomm.rashi && vcomm.rashi[it.c + ':' + it.x] ?
              voiceLine(vcomm.rashi[it.c + ':' + it.x]) : '')])
            .then(function (parts) {
              return '<div class="ck-verse">' + it.row + parts.join('') + '</div>';
            });
        })).then(function (rows) { return rows.join(''); });
      });
    });
  }
  function dcommFor(wk, day) {
    return (state.dcomm || {})[wk + '|' + day] || null;
  }
  function want(key) { return !state.focus || state.focus === key; }
  function popBtn() {
    if (state.focus) return '';
    return '<button class="ck-popout" title="לימוד החלק הזה בחלון נפרד">↗</button>';
  }
  function focusBar() {
    var back = location.pathname;
    var f = state.focus === 'torah' ? 'חומש' : state.focus === 'navi' ? 'נביא' :
            state.focus === 'kesuvim' ? 'כתובים' : state.focus === 'mishna' ? 'משנה' :
            state.focus === 'talmud' ? 'גמרא' : state.focus === 'zohar' || state.focus === 'kabbala' ? 'זוהר' :
            state.focus === 'halacha' ? 'הלכה' : state.focus === 'mussar' ? 'מוסר' : state.focus;
    return '<div class="ck-focusbar" dir="rtl">לימוד ממוקד — ' + esc(f) +
      ' · <a href="' + back + '">חזרה ליום המלא</a></div>';
  }
  function voiceLine(v) {
    if (!v) return '';
    return '<div class="ck-voice-row"><div class="ck-voice-he">' + richText(v.he || '') +
      '</div><div class="ck-voice-en" dir="ltr">' + esc(v.en || '') + '</div></div>';
  }
  function voiceBox(v) {
    if (!v) return '';
    return '<div class="ck-voice"><div class="ck-voice-k">הסבר פשוט</div>' + voiceLine(v) + '</div>';
  }
  function voiceTop(dc) {
    if (!dc) return '';
    var h = '';
    if (dc.carry) h += '<div class="ck-voice-part"><div class="ck-voice-k">מה משך אתמול</div>' + voiceLine(dc.carry) + '</div>';
    if (dc.intro) h += '<div class="ck-voice-part"><div class="ck-voice-k">היום</div>' + voiceLine(dc.intro) + '</div>';
    if (!h) return '';
    var open = carryShouldOpen() ? ' open' : '';
    return '<section class="ck-section ck-voice-top"><details class="ck-layer ck-carry-top"' + open + '>' +
      '<summary>הסבר פשוט — מה משך אתמול ומה היום</summary>' +
      '<div class="ck-voice">' + h + '</div></details></section>';
  }
  function carryShouldOpen() {
    if (state.carryMode === 'always') return true;
    if (state.carryMode === 'never') return false;
    var key = localIso(new Date()) + '|' + ((state.weeks && state.weeks[0]) || '') + '|' + state.day;
    var seen = lsGet('chok-carry-last', null);
    if (seen === key) return false;
    lsSet('chok-carry-last', key);
    return true;
  }
  function secHead(title, ref) {
    return '<div class="ck-sec-head">' + title + (ref ? ' <span class="ck-ref">' + esc(ref) + '</span>' : '') + '</div>';
  }
  function refStr(r) {
    if (!r) return '';
    var f = r.from ? heNum(r.from.c) + (r.from.v ? ',' + heNum(r.from.v) : '') : '';
    var t = r.to ? heNum(r.to.c) + (r.to.v ? ',' + heNum(r.to.v) : '') : '';
    return f && t && f !== t ? f + '–' + t : (f || t);
  }
  function card(title, ref, note) {
    return '<div class="ck-card"><span class="ck-card-title">' + esc(title) + '</span> ' +
           (ref ? '<span class="ck-card-ref">' + esc(ref) + '</span>' : '') +
           (note ? '<div class="ck-soon">' + esc(note) + '</div>' : '') + '</div>';
  }

  function resolveWeek() {
    var today = new Date();
    var todayIso = localIso(today);
    // The chok regimen week runs Sun-Fri LEADING INTO its shabbos: resolve to
    // the UPCOMING shabbos entry (finish the parsha before it is read).
    var up = null;
    (state.map || []).forEach(function (e) {
      if (e.date >= todayIso && e.weeks && (!up || e.date < up.date)) up = e;
    });
    if (!up) {
      (state.map || []).forEach(function (e) { if (e.date <= todayIso && e.weeks) up = e; });
    }
    return { weeks: up ? up.weeks : null, sat: up ? up.date : null,
             day: DAYS[DAY_DEFAULT[today.getDay()]] || DAYS[0], today: today };
  }

  function commentaryHTML(c) {
    if (!c) return null;
    var carry = null;
    if (c.carry && (c.carry.he || c.carry.en)) {
      carry = '<details class="ck-layer ck-carry" open><summary>המשך מאתמול · Carry from yesterday</summary>' +
        '<div dir="rtl" class="ck-he">' + esc(c.carry.he || '') + '</div>' +
        '<div dir="ltr" class="ck-en">' + esc(c.carry.en || '') + '</div></details>';
    }
    var out = [];
    var items = [];
    (c.verses || []).forEach(function (v) {
      if (!v.he && !v.en) return;
      items.push('<div class="ck-citem"><b class="ck-ref">' + esc(v.ref || '') + '</b>' +
        (v.he ? '<div dir="rtl" class="ck-he">' + esc(v.he) + '</div>' : '') +
        (v.en ? '<div dir="ltr" class="ck-en">' + esc(v.en) + '</div>' : '') + '</div>');
    });
    if (items.length) {
      out.push('<details class="ck-layer" open><summary>ביאורנו · Our commentary</summary>' + items.join('') + '</details>');
    }
    var ritems = [];
    (c.rashi || []).forEach(function (r) {
      if (!r.he && !r.en) return;
      var sup = '';
      if (r.super) {
        sup = Object.keys(r.super).map(function (k) {
          var s = r.super[k] || {};
          if (!s.he && !s.en) return '';
          return '<details class="ck-layer ck-sup"><summary>' + esc(k) + '</summary>' +
            (s.he ? '<div dir="rtl" class="ck-he">' + esc(s.he) + '</div>' : '') +
            (s.en ? '<div dir="ltr" class="ck-en">' + esc(s.en) + '</div>' : '') + '</details>';
        }).join('');
      }
      ritems.push('<div class="ck-citem"><b class="ck-ref">' + esc(r.ref || '') + '</b>' +
        (r.he ? '<div dir="rtl" class="ck-he">' + esc(r.he) + '</div>' : '') +
        (r.en ? '<div dir="ltr" class="ck-en">' + esc(r.en) + '</div>' : '') + sup + '</div>');
    });
    if (ritems.length) {
      out.push('<details class="ck-layer"><summary>על הרש״י · On Rashi</summary>' + ritems.join('') + '</details>');
    }
    if (!carry && !out.length) return null;
    return { carry: carry, layers: out.length ? out.join('') : null };
  }
  function fetchCommentary(week, day) {
    var slug = DAY_SLUGS[day] || 'yom-rishon';
    return fetchJSON('/reader/chok/commentary/' + encodeURIComponent(week) + '-' + slug + '.json')
      .catch(function () { return null; });
  }
  function mishnaHTML(masechet, perek) {
    var slug = MISHNA_SLUGS[normLabel(masechet)];
    if (!slug) return Promise.resolve(null);
    return fetchJSON('/reader/mishna/' + slug + '.json').then(function (md) {
      var mishnayos = (md.ch || {})[String(perek)];
      if (!mishnayos || !mishnayos.length) return null;
      var body = mishnayos.map(function (m, i) {
        return '<div class="ck-mishna"><b class="ck-mnum">' + heNum(i + 1) + '</b> ' +
          esc(applyMode(m)) + '</div>';
      }).join('');
      return comm('mishna-bartenura', slug).then(function (bd) {
        var bar = bd && (bd.ch || {})[String(perek)];
        var barBody = '';
        if (bar && bar.length) {
          barBody = bar.map(function (b, i) {
            if (!b) return '';
            return '<div class="ck-comm-body"><b class="ck-mnum">' + heNum(i + 1) + '</b> ' + richText(b) + '</div>';
          }).join('');
        }
        var extra = barBody ? commDetails('ברטנורא', barBody) : '';
        return '<details class="ck-layer ck-mishna" open><summary>משנה — ' + esc(masechet) +
          ' פרק ' + heNum(perek) + '</summary>' + body + extra + '</details>';
      });
    }).catch(function () { return null; });
  }

  var GEMARA_SLUG = {'ברכות':'berakhot','שבת':'shabbat','עירובין':'eruvin','פסחים':'pesachim',
    'ביצה':'beitzah','ראש השנה':'rosh-hashanah','מועד קטן':'moed-katan','חגיגה':'chagigah',
    'יבמות':'yevamot','כתובות':'ketubot','נדרים':'nedarim','נזיר':'nazir','סוטה':'sotah',
    'גיטין':'gittin','קידושין':'kiddushin','בבא קמא':'bava-kamma','בבא מציעא':'bava-metzia',
    'בבא בתרא':'bava-batra','סנהדרין':'sanhedrin','מכות':'makkot','שבועות':'shevuot',
    'עבודה זרה':'avodah-zarah','זבחים':'zevachim','מנחות':'menachot','חולין':'chullin',
    'בכורות':'bekhorot','ערכין':'arakhin','קריתות':'keritut','נדה':'niddah'};
  function normGem(t) {
    var x = (t || '').replace(/[״'"׳.]/g, '').trim();
    var exp = {'בק':'בבא קמא','במ':'בבא מציעא','בב':'בבא בתרא','רה':'ראש השנה','עז':'עבודה זרה',
      'מק':'מכות','מציעא':'בבא מציעא','קדושין':'קידושין'};
    return exp[x] || x;
  }
  function zoharHTML(z) {
    var vol = z.vol || z.work;
    if (!vol || !z.daf) return Promise.resolve(null);
    var slug = 'zohar-' + vol.replace(/[\u05f4'\u0022\u05f3]/g, '').trim().replace(/ /g, '-');
    var letter = z.amud === 2 ? 'b' : 'a';
    return fetchJSON('/reader/zohar/' + encodeURIComponent(slug) + '.json').then(function (md) {
      var lines = ((md.ch || {})[String(z.daf)] || {})[letter];
      if (!lines || !lines.length) return null;
      var body = lines.map(function (ln) {
        return '<div class="ck-zohar-line">' + richText(applyMode(ln)) + '</div>';
      }).join('');
      return '<details class="ck-layer ck-zohar"><summary>זוהר — ' + esc(vol) +
        ' דף ' + heNum(z.daf) + ' ע׳ ' + (letter === 'a' ? 'א״' : 'ב״') + '</summary>' + body + '</details>';
    }).catch(function () { return null; });
  }

  function mussarHTML(wk, day) {
    var m = state.mussar && state.mussar.days[wk + '|' + day];
    if (!m) return Promise.resolve(null);
    var head = 'מוסר — ' + esc(m.sefer);
    if (m.daf) head += ' דף ' + heNum(m.daf) + (m.amud ? ' ע׳ ' + (m.amud === 2 ? 'ב״' : 'א״') : '');
    var body = m.text ? '<div class="ck-mussar-text">' + richText(applyMode(m.text)) + '</div>' : '';
    return Promise.resolve('<details class="ck-layer ck-mussar"><summary>' + head + '</summary>' + body + '</details>');
  }

  function gemaraHTML(g) {
    var lbl = normGem(g.masechet);
    var sl = GEMARA_SLUG[lbl];
    if (!sl || !g.daf) return Promise.resolve(null);
    var letter = g.amud === 2 ? 'b' : 'a';
    return fetchJSON('/reader/gemara/gemara-' + sl + '.json').then(function (md) {
      var lines = ((md.ch || {})[String(g.daf)] || {})[letter];
      if (!lines || !lines.length) return null;
      var body = lines.map(function (ln) {
        return '<div class="ck-gemara-line">' + richText(applyMode(ln)) + '</div>';
      }).join('');
      return comm('gemara-rashi', 'gemara-' + sl).then(function (rd) {
        var rashiSegs = rd && (rd.ch || {})[String(g.daf)] && rd.ch[String(g.daf)][letter];
        var rashiBody = '';
        if (rashiSegs && rashiSegs.length) {
          rashiBody = rashiSegs.map(function (x) {
            return x ? '<div class="ck-comm-body">' + richText(x) + '</div>' : '';
          }).join('');
        }
        var extra = rashiBody ? commDetails('רש״י על הגמרא', rashiBody) : '';
        return '<details class="ck-layer ck-gemara"><summary>גמרא — ' + esc(lbl) +
          ' דף ' + heNum(g.daf) + ' ע׳ ' + (letter === 'a' ? 'א״' : 'ב״') + '</summary>' + body + extra + '</details>';
      });
    }).catch(function () { return null; });
  }

  function bonusHTML(item) {
    return fetchJSON('/reader/mishna/' + item.slug + '.json').then(function (md) {
      var mishnayos = (md.ch || {})[String(item.perek)];
      if (!mishnayos || !mishnayos.length) return null;
      var body = mishnayos.map(function (m, i) {
        return '<div class="ck-mishna"><b class="ck-mnum">' + heNum(i + 1) + '</b> ' +
          esc(applyMode(m)) + '</div>';
      }).join('');
      return '<details class="ck-layer ck-mishna ck-bonus"><summary>בונוס לסיום כל המשנה — ' +
        esc(item.he) + ' פרק ' + heNum(item.perek) + '</summary>' + body + '</details>';
    }).catch(function () { return null; });
  }

  function renderDay() {
    var box = $('ck-content');
    var day = state.day;
    var weeks = state.weeks || [];
    if (!weeks.length) { box.innerHTML = '<p class="ck-error">No week selected.</p>'; return; }
    var jobs = weeks.map(function (wk) {
      var w = state.sched.weeks[wk];
      if (!w) return Promise.resolve('<p class="ck-error">No schedule for ' + esc(wk) + '</p>');
      var d = w.days[day] || {};
      var dc = dcommFor(wk, day);
      var out = [];
      if (state.focus) out.push(focusBar()); else out.push(voiceTop(dc));
      var p = Promise.resolve();
      if (d.torah && d.torah.from && want('torah')) {
        p = p.then(function () {
          return versesHTML(w.slug, d.torah.from, d.torah.to, 'torah', dc, wk).then(function (vh) {
            out.push('<section class="ck-section" data-sec="torah">' +
              secHead('תורה — ' + wk, refStr(d.torah)) + popBtn() + kavanaHTML('torah', d) + vh + '</section>');
          });
        });
      }
      [['navi','נביא'],['kesuvim','כתובים']].forEach(function (pair) {
        p = p.then(function () {
          var sec = d[pair[0]];
          if (!sec || !sec.book) return;
          var vkey = pair[1] === 'כתובים' ? 'kesuvim' : 'navi';
          if (!want(vkey)) return;
          var slug = SLUGS[sec.book];
          if (!slug) { out.push(card(pair[1], sec.book)); return; }
          /* chok regimen: 6 verses of navi + 6 of kesuvim per day. The
             schedule stores the chapter only, so the day's start = 1 +
             6 x (how many earlier DAYS of this week sit on the same chapter). */
          var dayIdx = DAYS.indexOf(day);
          var offset = 0;
          DAYS.forEach(function (dy, di) {
            if (di >= dayIdx) return;
            var prev = (w.days[dy] || {})[pair[0]];
            if (prev && prev.book === sec.book && prev.from && prev.from.c === sec.from.c) offset++;
          });
          var dayIdx = DAYS.indexOf(day);
          var mk = (state.miluy && state.miluy.days && state.miluy.days[dayIdx]) || null;
          var per = mk ? mk.count : 6;
          var startV = (sec.from.v || 1) + per * offset;
          var segFrom = { c: sec.from.c, v: startV };
          var segTo = { c: sec.from.c, v: startV + per - 1 };
          var headRef = heNum(segFrom.c) + ':' + heNum(segFrom.v) + '\u2013' + heNum(segTo.c) + ':' + heNum(segTo.v);
          var miluyTag = mk ? '<div class="ck-miluy"><span class="ck-miluy-t">כוונת המילוי — האריז״ל</span> ' +
            heNum(mk.count) + ' פסוקים כנגד האות ' + mk.letter + ' של המילוי' +
            (mk.path ? ' — ' + mk.path : '') + '</div>' : '';
          return versesHTML(slug, segFrom, segTo, 'navi', null).then(function (vh) {
            out.push('<section class="ck-section" data-sec="' + vkey + '">' +
              secHead(pair[1] + ' — ' + sec.book, headRef) + popBtn() + miluyTag + kavanaHTML(vkey, d) + voiceBox(dc && dc[vkey]) + vh + '</section>');
          });
        });
      });
      p = p.then(function () {
        if (!want('extras')) return;
        var extras = [];
        if (d.mishna) extras.push(card('משנה', (d.mishna.masechet||'') + (d.mishna.perek ? ' פרק ' + heNum(d.mishna.perek) : '')));
        if (d.gemara) extras.push(card('גמרא', (d.gemara.masechet||'') + ' ' + heNum(d.gemara.daf||0) + (d.gemara.amud ? (d.gemara.amud===2?' עמוד ב':' עמוד א') : '')));
        if (d.zohar) extras.push(card('זוהר', (d.zohar.work ? d.zohar.work + ' ' : (d.zohar.vol ? d.zohar.vol + ' ' : '')) + (d.zohar.daf ? heNum(d.zohar.daf) : '') + (d.zohar.amud ? (d.zohar.amud===2?' ב':' א') : '')));
        if (d.halacha && d.halacha.work === 'rambam' && d.halacha.hilchot) extras.push(card('הלכה — רמב״ם', 'הלכות ' + d.halacha.hilchot + (d.halacha.from_perek ? ' פרק ' + heNum(d.halacha.from_perek) : '')));
        if (d.halacha && d.halacha.work === 'SA' && d.halacha.from) extras.push(card('הלכה — שולחן ערוך', TUR_HE[d.halacha.tur] + ' סימן ' + heNum(d.halacha.from)));
        if (d.haftara) extras.push(card('הפטרה', (d.haftara.label || '').replace(/B/g,' ')));
        if (extras.length) out.push('<section class="ck-section">' + secHead('שאר חלקי היום') + extras.join('') + '</section>');
      });
      if (d.mishna && d.mishna.masechet && want('mishna')) {
        p = p.then(function () {
          return mishnaHTML(d.mishna.masechet, d.mishna.perek).then(function (html) { html = kavanaHTML('mishna', d) + html; html = voiceBox(dc && dc.mishna) + html;
            if (html) out.push('<section class="ck-section" data-sec="mishna">' + html + '</section>');
          });
        });
      }
      var bonusItems = (state.bonus && state.bonus.weeks[wk] && state.bonus.weeks[wk][day]) || null;
      if (bonusItems && want('bonus')) {
        p = p.then(function () {
          return Promise.all(bonusItems.map(bonusHTML)).then(function (parts) {
            var h = parts.filter(Boolean).join('');
            if (h) out.push('<section class="ck-section" data-sec="bonus">' + h + '</section>');
          });
        });
      }
      if (d.halacha && d.halacha.work && want('halacha')) {
        p = p.then(function () {
          return halachaHTML(d).then(function (html) { html = kavanaHTML('halacha', d) + html; html = voiceBox(dc && dc.halacha) + html;
            if (html) out.push('<section class="ck-section" data-sec="halacha">' + html + '</section>');
          });
        });
      }
      if (d.gemara && d.gemara.masechet && want('talmud')) {
        p = p.then(function () {
          return gemaraHTML(d.gemara).then(function (html) { html = kavanaHTML('talmud', d) + html; html = voiceBox(dc && dc.gemara) + html;
            if (html) out.push('<section class="ck-section" data-sec="talmud">' + html + '</section>');
          });
        });
      }
      if (d.zohar && (d.zohar.vol || d.zohar.work) && want('kabbala')) {
        p = p.then(function () {
          return zoharHTML(d.zohar).then(function (html) { html = kavanaHTML('kabbala', d) + html; html = voiceBox(dc && dc.zohar) + html;
            if (html) out.push('<section class="ck-section" data-sec="kabbala">' + html + '</section>');
          });
        });
      }
      p = p.then(function () {
        if (!want('mussar')) return;
        return mussarHTML(wk, day).then(function (html) { html = voiceBox(dc && dc.mussar) + html;
          if (html) out.push('<section class="ck-section" data-sec="mussar">' + html + '</section>');
        });
      });
      p = p.then(function () {
        if (!want('kavanos')) return;
        return kavanosHTML().then(function (html) {
          if (html) out.push(html);
        });
      });
      return p.then(function () { return out.join(''); });
    });
    box.innerHTML = '<p class="ck-loading">Loading…</p>';
    var comm = state.commentary ? Promise.all(weeks.map(function (wk) {
      return fetchCommentary(wk, day);
    })) : Promise.resolve([]);
    Promise.all(jobs).then(function (weekParts) {
      return comm.then(function (cs) {
        var carryHTML = '', commentHTML = '';
        cs.forEach(function (c, i) {
          if (!c) return;
          var h = commentaryHTML(c);
          if (!h) return;
          if (h.carry) carryHTML += h.carry;
          if (h.layers) commentHTML += '<section class="ck-section" dir="rtl">' +
            secHead('ביאור — ' + weeks[i]) + h.layers + '</section>';
        });
        var parts = [];
        if (carryHTML) parts.push(carryHTML);
        parts.push(weekParts.join(''));
        if (commentHTML) parts.push(commentHTML);
        box.innerHTML = parts.join('') || '<p class="ck-error">Nothing to show.</p>';
        wireKavanos(box);
        if (state.focus) {
          Array.prototype.forEach.call(box.querySelectorAll('.ck-section[data-sec] details'), function (dtl) { dtl.open = true; });
          var el = box.querySelector('.ck-section[data-sec="' + state.focus + '"]');
          if (el && el.scrollIntoView) el.scrollIntoView(); else { box.scrollTop = 0; window.scrollTo(0, 0); }
        } else {
          box.scrollTop = 0; window.scrollTo(0, 0);
        }
      });
    }).catch(function (e) {
      box.innerHTML = '<p class="ck-error">Could not load: ' + esc('' + e) + '</p>';
    });
  }

  function buildDayTabs() {
    var wrap = $('ck-days');
    wrap.innerHTML = '';
    DAYS.forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'ck-btn' + (d === state.day ? ' ck-day-on' : '');
      b.textContent = d;
      b.addEventListener('click', function () {
        state.day = d; buildDayTabs(); save(); renderDay();
      });
      wrap.appendChild(b);
    });
  }
  function buildWeekSelect() {
    var sel = $('ck-parsha');
    sel.innerHTML = '';
    Object.keys(state.sched.weeks).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k; o.textContent = k;
      sel.appendChild(o);
    });
    sel.value = state.weeks[0];
  }

  function setTheme(t) { state.theme = t; document.documentElement.setAttribute('data-theme', t); }

  function init() {
    var st = load();
    ['mode','medooyuk','targum','commentary','rashi','tanachen','size','theme','carryMode'].forEach(function (k) {
      if (st[k] !== undefined) state[k] = st[k];
    });
    state.day = DAYS[DAY_DEFAULT[new Date().getDay()]] || DAYS[0];
    if (location.search) {
      try {
        var qp = new URLSearchParams(location.search);
        if (qp.get('sec')) state.focus = qp.get('sec');
        if (qp.get('day')) state.day = qp.get('day');
        if (qp.get('week')) state.focusWeek = qp.get('week');
        if (qp.get('day') || qp.get('sec')) state.dayFromUrl = true;
      } catch (e) {}
    }
    Promise.all([
      fetchJSON('/reader/chok/schedule.json'),
      fetchJSON('/reader/chok/shabbos-map.json'),
      fetchJSON('/reader/chok/mishna-bonus.json').catch(function () { return null; }),
      fetchJSON('/reader/chok/mussar.json').catch(function(){return null;}),
      fetchJSON('/reader/chok/day-comm.json').catch(function () { return null; }),
      fetchJSON('/reader/chok/kavanos-chok.json').catch(function () { return null; }),
      fetchJSON('/reader/chok/kavanos-actual.json').catch(function () { return null; }),
      fetchJSON('/reader/chok/miluy-kavana.json').catch(function () { return null; }),
      fetchJSON('/reader/chok/hk-verses.json').catch(function () { return null; })
    ]).then(function (res) {
      state.sched = res[0];
      state.map = res[1];
      state.bonus = res[2] || null;
      state.mussar = res[3] || null;
      state.dcomm = res[4] || {};
      state.kav = res[5] || null;
      state.kavA = res[6] || null;
      state.miluy = res[7] || null;
      state.hk = res[8] || null;
      var rr = resolveWeek();
      state.weeks = rr.weeks || ['בראשית'];
      if (state.focusWeek) {
        var fw = state.focusWeek.split(',');
        state.weeks = fw.filter(function (x) { return state.sched.weeks[x]; });
      }
      if (!state.dayFromUrl) state.day = rr.day;
      var heb = (state.map.filter(function (e) { return e.date === rr.sat; })[0] || {}).heb;
      $('ck-date').textContent = rr.today.toDateString() + (heb ? ' · Shabbos: ' + heb.replace(/-/g,' / ') : '');
      $('ck-week').textContent = 'פרשת ' + state.weeks.join(' · ');
      buildWeekSelect();
      buildDayTabs();
      $('ck-mode').value = state.mode;
      $('ck-medooyuk').checked = state.medooyuk;
      $('ck-targum').checked = state.targum;
      $('ck-rashi').checked = state.rashi;
      $('ck-commentary').checked = state.commentary;
      $('ck-tanachen').checked = state.tanachen;
      $('ck-size').value = state.size;
      document.documentElement.style.setProperty('--ck-size', state.size + 'px');
      setTheme(state.theme);
      $('ck-legend').hidden = !state.medooyuk;

      $('ck-parsha').addEventListener('change', function () {
        state.weeks = [this.value]; renderDay();
      });
      $('ck-mode').addEventListener('change', function () { state.mode = this.value; save(); renderDay(); });
      $('ck-medooyuk').addEventListener('change', function () {
        state.medooyuk = this.checked; $('ck-legend').hidden = !state.medooyuk; save(); renderDay(); });
      $('ck-targum').addEventListener('change', function () { state.targum = this.checked; save(); renderDay(); });
      $('ck-rashi').addEventListener('change', function () { state.rashi = this.checked; save(); renderDay(); });
      $('ck-commentary').addEventListener('change', function () { state.commentary = this.checked; save(); renderDay(); });
      $('ck-tanachen').addEventListener('change', function () { state.tanachen = this.checked; save(); renderDay(); });
      $('ck-carrymode').value = state.carryMode;
      $('ck-carrymode').addEventListener('change', function () {
        state.carryMode = this.value; save(); renderDay(); });
      $('ck-content').addEventListener('click', function (ev) {
        var t = ev.target;
        if (!t || !t.classList || !t.classList.contains('ck-popout')) return;
        var sec = t.closest('.ck-section');
        var key = sec ? (sec.getAttribute('data-sec') || '') : '';
        if (!key) return;
        window.open(location.pathname + '?sec=' + encodeURIComponent(key) +
          '&week=' + encodeURIComponent(state.weeks.join(',')) +
          '&day=' + encodeURIComponent(state.day), '_blank');
      });
      $('ck-size').addEventListener('input', function () {
        state.size = parseInt(this.value, 10);
        document.documentElement.style.setProperty('--ck-size', state.size + 'px'); save();
      });
      Array.prototype.forEach.call(document.querySelectorAll('.ck-theme'), function (b) {
        b.addEventListener('click', function () { setTheme(this.getAttribute('data-t')); save(); });
      });
      renderDay();
    }).catch(function (e) {
      $('ck-content').innerHTML = '<p class="ck-error">Could not load schedule: ' + esc('' + e) + '</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
