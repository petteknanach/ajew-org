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
    'מלאכי':'tanach-malachi','תהלים':'tanach-tehillim','תהילים':'tanach-tehillim','משלי':'tanach-mishlei',
    'איוב':'tanach-iyov','שיר השירים':'tanach-shir-hashirim','רות':'tanach-rus',
    'איכה':'tanach-eicha','קהלת':'tanach-koheles','אסתר':'tanach-esther',
    'דניאל':'tanach-daniel','עזרא':'tanach-ezra','נחמיה':'tanach-nechemia',
    'דברי הימים א':'tanach-divrei-hayamim-a','דברי הימים ב':'tanach-divrei-hayamim-b'
  };
  var DAYS = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','ליל שישי','יום שישי'];
  // JS getDay(): 0=Sun..6=Sat -> default tab index into DAYS
  var DAY_DEFAULT = {0:0, 1:1, 2:2, 3:3, 4:4, 5:6, 6:6};
  var ORDER = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','ליל שישי','יום שישי'];
  /* The four year-end weeks (נצבים, וילך, האזינו, וזאת הברכה) have no
     'יום שישי' entry — a Friday must not render an empty page. Fall back to
     the closest earlier day that exists in the week. */
  function availDay(w, day) {
    if (!w || !w.days || w.days[day]) return day;
    var i = DAYS.indexOf(day);
    if (i < 0) return day;
    for (var j = i - 1; j >= 0; j--) { if (w.days[DAYS[j]]) return DAYS[j]; }
    for (var k = i + 1; k < DAYS.length; k++) { if (w.days[DAYS[k]]) return DAYS[k]; }
    return day;
  }

  var TAAMIM = /[\u0591-\u05AF\u05BD\u05C0]/g;
  var NIKUD  = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g;

  var state = {
    mode: 'full', medooyuk: true, targum: true, commentary: true, rashi: true,
    tanachen: true,
    day: null, weeks: null, size: 26, theme: 'day',
    sched: null, map: null, bonus: null, mussar: null, dcomm: null, kav: null, kavA: null,
    carryMode: 'daily', kavanaMode: 'closed', kavGeneral: null, focus: null, focusWeek: null,
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
      size: state.size, theme: state.theme, carryMode: state.carryMode, kavanaMode: state.kavanaMode })); } catch (e) {} }
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
  /* Shared COLR paint: preserve the raw consonants, metadata and display mode.
     Only isolated vowel contours are enlarged/colored; no CSS run splitting. */
  function coloredVerse(verse) {
    var visible = { t: verse.t.map(applyMode), m: verse.m || [], k: verse.k || [] };
    if (window.AjewMarkedHebrew) {
      return window.AjewMarkedHebrew.renderVerse(visible, { specialNikud: state.medooyuk });
    }
    // A failed shared-script load must not masquerade as special-nikud output.
    return (state.medooyuk ? '<span class="ck-marked-unavailable" role="status">הניקוד המיוחד אינו זמין · </span>' : '') +
      joinTokens(visible.t.map(esc));
  }
  function heNum(n) {
    var G = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'], T = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'], H = ['','ק','ר','ש','ת'];
    function u(x) { return x < 10 ? G[x] : x < 100 ? T[Math.floor(x/10)] + G[x%10] : H[Math.floor(x/100)] + u(x%100); }
    var s = u(n);
    if (s === 'יה') s = 'טו'; if (s === 'יו') s = 'טז';
    return s.replace(/([א-ת])$/, '$1\u05f4');
  }
  // Generated references only: never normalize source paragraphs or Names.
  function plainHeNum(n) { return heNum(n).replace(/\u05f4/g, ''); }
  function refLabelHTML(ref) {
    // Keep chapter before verse visually, with each Hebrew numeral isolated.
    return '<bdi class="ck-generated-ref" dir="ltr">' + esc(ref).replace(/[א-ת]+/g, function (n) {
      return '<bdi dir="rtl">' + n + '</bdi>';
    }) + '</bdi>';
  }
  var __fq = [], __frunning = 0;
  function __fnext() {
    if (__frunning >= 6 || !__fq.length) return;
    __frunning++;
    var job = __fq.shift();
    job.run().then(function (v) { job.done(v); }, function (e) { job.fail(e); })
      .then(function () { __frunning--; __fnext(); });
  }
  function rawJSON(url, raw) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return raw ? r.text() : r.json();
    });
  }
  function fetchJSON(url, raw) {
    // concurrency-limited + one retry: bursts of data fetches were
    // resetting connections and silently dropping whole day sections
    return new Promise(function (resolve, reject) {
      var attempt = 0;
      var run = function () { return rawJSON(url, raw); };
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
    // Psalms coalesces in-flight requests, not an obsolete session-long copy.
    function authenticate(d) {
      if (!window.AjewMarkedHebrew || typeof window.AjewMarkedHebrew.applyBook !== 'function')
        throw Error('Authenticated annotations unavailable');
      return window.AjewMarkedHebrew.applyBook(d, slug);
    }
    if (slug === 'tanach-tehillim') return window.AjewPsalmsData.load().then(authenticate);
    if (!state.bookCache[slug]) state.bookCache[slug] = fetchJSON('/reader/medooyuk/' + slug + '.json')
      .then(authenticate).catch(function (error) {
        delete state.bookCache[slug]; // Allow explicit day/control retry; never cache unauthenticated data.
        throw error;
      });
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
  function kavanaRows(key, indexes) {
    var rows = state.kavA && state.kavA.kavanos && state.kavA.kavanos[key] || [];
    return (indexes || rows.map(function (_, i) { return i; })).filter(function (i) {
      return typeof rows[i] === 'string';
    }).map(function (i) { return { text: rows[i], pointer: 'kavanos-actual.json#/kavanos/' + key + '/' + i }; });
  }
  function kavanaParagraphs(rows) {
    return rows.map(function (row) {
      // Literal escaped text conserves complete public paragraphs, including Names.
      // This is an engineering JSON pointer, not an original-print certification.
      return '<div class="ck-kavana-para" data-source-pointer="' + row.pointer + '">' + esc(row.text) + '</div>';
    }).join('');
  }
  function kavanaDetails(category, title, body, section) {
    return '<details class="ck-kavana" data-kavana-category="' + category + '"' + (section ? ' id="ck-kavana-' + section + '"' : '') +
      (state.kavanaMode === 'always' ? ' open' : '') + '><summary>' + esc(title) +
      '</summary><div class="ck-kavana-body">' + body + '</div></details>';
  }
  function studyOverviewHTML() {
    var general = kavanaRows('torah', [0]);
    var items = state.kavGeneral && state.kavGeneral.arizal && state.kavGeneral.arizal.items || [];
    items.forEach(function (text, i) {
      // Only the known overlapping first paragraph is deduplicated; no text normalization.
      if (typeof text === 'string' && !(i === 0 && general.length && text === general[0].text))
        general.push({ text: text, pointer: 'kavanos-torah.json#/arizal/items/' + i });
    });
    var unavailable = '<p class="ck-kavana-note" role="status">המקור הציבורי אינו זמין כעת; אין השלמת נוסח ממקור אחר.</p>';
    var missing = '<p class="ck-kavana-note" role="status">שער המצוות ורבי מקמארנא — נוסח המקור המלא המאושר לפרסום אינו זמין כאן. ' +
      'אין הצגת סיכום כתחליף למקור. <a href="/reader/chok/kavanos/">עמוד כוונות הלימוד — מידע קיים</a></p>';
    var weekly = kavanaRows('torah', [1, 3, 4]);
    return '<section class="ck-section ck-kavana-overview" data-kavana-group="general">' +
      kavanaDetails('general', 'כוונות כלליות ללימוד התורה — תורה לשמה', (general.length ? kavanaParagraphs(general) : unavailable) + missing) +
      '</section><section class="ck-section ck-kavana-overview" data-kavana-group="weekly">' +
      kavanaDetails('weekly', 'כוונות חק לישראל — סדר השבוע כולו', weekly.length ? kavanaParagraphs(weekly) : unavailable) + '</section>';
  }
  function kavanaHTML(secKey, d, repeated) {
    // Prayers stay independent on /reader/chok/tefillos/. Public PEC allocation only.
    // Torah rows retain embedded weekly instructions: do not split their clauses.
    var rows = kavanaRows(secKey, secKey === 'torah' ? [2, 5] : null);
    return rows.length ? kavanaDetails('section', 'כוונת הלימוד — האריז״ל', repeated ?
      '<a href="#ck-kavana-' + secKey + '">הכוונות המלאות — בחלק הראשון של היום ↑</a>' : kavanaParagraphs(rows), repeated ? null : secKey) : '';
  }
  // Parent-qualified numeric schedule facts only. No prayer/Name publication authority.
  var NACH_COUNTS = [6,4,5,6,5];
  var NACH_RANGE_SHA256 = '796618d27c862a96e194e4c2faf635717f5702e0e4e9f6d501aab6706e2cc30f';
  var NACH_RANGE_POLICY = 'Explicit numeric source boundaries; source-qualified cross-chapter readings retained. Weekday counts 6/4/5/6/5; no prayer/name authority or corpus edits.';
  // Additional source-coordinate pins reject logically plausible wrong same-book units.
  // Order in each week: Sun Navi/Kesuvim, Mon Navi/Kesuvim, ... Thu Navi/Kesuvim.
  var NACH_BOUNDARIES = {"בראשית":[[42,5,42,10],[1,1,1,6],[42,11,42,14],[1,7,1,10],[42,15,42,19],[1,11,1,15],[42,20,42,25],[1,16,1,21],[43,1,43,5],[1,22,1,26]],"נח":[[52,13,53,3],[1,27,1,32],[53,4,53,7],[1,33,2,3],[53,8,53,12],[2,4,2,8],[54,1,54,6],[2,9,2,14],[54,7,54,11],[2,15,2,19]],"לך לך":[[40,27,41,1],[2,20,3,3],[41,2,41,5],[3,4,3,7],[41,6,41,10],[3,8,3,12],[41,11,41,16],[3,13,3,18],[41,17,41,21],[3,19,3,23]],"וירא":[[4,1,4,6],[3,24,3,29],[4,7,4,10],[3,30,3,33],[4,11,4,15],[3,34,4,3],[4,16,4,21],[4,4,4,9],[4,22,4,26],[4,10,4,14]],"חיי שרה":[[1,1,1,6],[4,15,4,20],[1,7,1,10],[4,21,4,24],[1,11,1,15],[4,25,5,2],[1,16,1,21],[5,3,5,8],[1,22,1,26],[5,9,5,13]],"תולדות":[[1,1,1,6],[5,14,5,19],[1,7,1,10],[5,20,5,23],[1,11,2,1],[6,1,6,5],[2,2,2,7],[6,6,6,11],[2,8,2,12],[6,12,6,16]],"ויצא":[[11,7,12,1],[6,17,6,22],[12,2,12,5],[6,23,6,26],[12,6,12,10],[6,27,6,31],[12,11,13,1],[6,32,7,2],[13,2,13,6],[7,3,7,7]],"וישלח":[[1,1,1,6],[7,8,7,13],[1,7,1,10],[7,14,7,17],[1,11,1,15],[7,18,7,22],[1,16,1,21],[7,23,8,1],[1,1,1,5],[8,2,8,6]],"וישב":[[2,6,2,11],[8,7,8,12],[2,12,2,15],[8,13,8,16],[2,16,3,4],[8,17,8,21],[3,5,3,10],[8,22,8,27],[3,11,3,15],[8,28,8,32]],"מקץ":[[3,15,3,20],[8,33,9,2],[3,21,3,24],[9,3,9,6],[3,25,4,1],[9,7,9,11],[4,2,4,7],[9,12,9,17],[4,8,4,12],[9,18,10,4]],"ויגש":[[37,15,37,20],[10,5,10,10],[37,21,37,24],[10,11,10,14],[37,25,38,1],[10,15,10,19],[38,2,38,7],[10,20,10,25],[38,8,38,12],[10,26,10,30]],"ויחי":[[2,1,2,6],[10,31,11,4],[2,7,2,10],[11,5,11,8],[2,11,2,15],[11,9,11,13],[2,16,2,21],[11,14,11,19],[2,22,2,26],[11,20,11,24]],"שמות":[[27,6,27,11],[11,25,11,30],[27,12,28,2],[11,31,12,3],[28,3,28,7],[12,4,12,8],[28,8,28,13],[12,9,12,14],[28,14,28,18],[12,15,12,19]],"וארא":[[28,25,29,4],[12,20,12,25],[29,5,29,8],[12,26,13,1],[29,9,29,13],[13,2,13,6],[29,14,29,19],[13,7,13,12],[29,20,30,3],[13,13,13,17]],"בא":[[46,13,46,18],[13,18,13,23],[46,19,46,22],[13,24,14,2],[46,23,46,27],[14,3,14,7],[46,28,47,5],[14,8,14,13],[47,6,48,3],[14,14,14,18]],"בשלח":[[3,30,4,4],[14,19,14,24],[4,5,4,8],[14,25,14,28],[4,9,4,13],[14,29,14,33],[4,14,4,19],[14,34,15,4],[4,20,4,24],[15,5,15,9]],"יתרו":[[6,1,6,6],[15,10,15,15],[6,7,6,10],[15,16,15,19],[6,11,7,2],[15,20,15,24],[7,3,7,8],[15,25,15,30],[7,9,7,13],[15,31,16,2]],"משפטים":[[34,8,34,13],[16,3,16,8],[34,14,34,17],[16,9,16,12],[34,18,34,22],[16,13,16,17],[35,1,35,6],[16,18,16,23],[35,7,35,11],[16,24,16,28]],"תרומה":[[5,26,5,31],[16,29,17,1],[5,32,6,3],[17,2,17,5],[6,4,6,8],[17,6,17,10],[6,9,6,14],[17,11,17,16],[6,15,6,19],[17,17,17,21]],"תצוה":[[43,10,43,15],[17,22,17,27],[43,16,43,19],[17,28,18,3],[43,20,43,24],[18,4,18,8],[43,25,44,3],[18,9,18,14],[44,4,44,8],[18,15,18,19]],"כי תשא":[[18,20,18,25],[18,20,19,1],[18,26,18,29],[19,2,19,5],[18,30,18,34],[19,6,19,10],[18,35,18,40],[19,11,19,16],[18,41,18,45],[19,17,19,21]],"ויקהל":[[7,13,7,18],[19,22,19,27],[7,19,7,22],[19,28,20,2],[7,23,7,27],[20,3,20,7],[7,28,7,33],[20,8,20,13],[7,34,7,38],[20,14,20,18]],"פקודי":[[7,40,7,45],[20,19,20,24],[7,46,7,49],[20,25,20,28],[7,50,8,3],[20,29,21,3],[8,4,8,9],[21,4,21,9],[8,10,8,14],[21,10,21,14]],"ויקרא":[[43,21,43,26],[21,15,21,20],[43,27,44,2],[21,21,21,24],[44,3,44,7],[21,25,21,29],[44,8,44,13],[21,30,22,4],[44,14,44,18],[22,5,22,9]],"צו":[[7,21,7,26],[22,10,22,15],[7,27,7,30],[22,16,22,19],[7,31,8,1],[22,20,22,24],[8,2,8,7],[22,25,23,1],[8,8,8,12],[23,2,23,6]],"שמיני":[[6,1,6,6],[23,7,23,12],[6,7,6,10],[23,13,23,16],[6,11,6,15],[23,17,23,21],[6,16,6,21],[23,22,23,27],[6,22,7,3],[23,28,23,32]],"תזריע":[[4,42,5,3],[23,33,24,3],[5,4,5,7],[24,4,24,7],[5,8,5,12],[24,8,24,12],[5,13,5,18],[24,13,24,18],[5,19,5,23],[24,19,24,23]],"מצורע":[[7,3,7,8],[24,24,24,29],[7,9,7,12],[24,30,24,33],[7,13,7,17],[24,34,25,4],[7,18,8,3],[25,5,25,10],[8,4,8,8],[25,11,25,15]],"אחרי מות":[[22,1,22,6],[25,16,25,21],[22,7,22,10],[25,22,25,25],[22,11,22,15],[25,26,26,2],[22,16,22,21],[26,3,26,8],[22,22,22,26],[26,9,26,13]],"קדושים":[[20,2,20,7],[26,14,26,19],[20,8,20,11],[26,20,26,23],[20,12,20,16],[26,24,26,28],[20,17,20,22],[27,1,27,6],[20,23,20,27],[27,7,27,11]],"אמור":[[44,15,44,20],[27,12,27,17],[44,21,44,24],[27,18,27,21],[44,25,44,29],[27,22,27,26],[44,30,45,4],[27,27,28,5],[45,5,45,9],[28,6,28,10]],"בהר":[[32,6,32,11],[28,11,28,16],[32,12,32,15],[28,17,28,20],[32,16,32,20],[28,21,28,25],[32,21,32,26],[28,26,29,3],[32,27,32,31],[29,4,29,8]],"בחוקותי":[[16,19,17,3],[29,9,29,14],[17,4,17,7],[29,15,29,18],[17,8,17,12],[29,19,29,23],[17,13,17,18],[29,24,30,2],[17,19,17,23],[30,3,30,7]],"במדבר":[[2,1,2,6],[30,8,30,13],[2,7,2,10],[30,14,30,17],[2,11,2,15],[30,18,30,22],[2,16,2,21],[30,23,30,28],[2,22,3,1],[30,29,30,33]],"נשא":[[13,2,13,7],[31,1,31,6],[13,8,13,11],[31,7,31,10],[13,12,13,16],[31,11,31,15],[13,17,13,22],[31,16,31,21],[13,23,14,2],[31,22,31,26]],"בהעלותך":[[2,14,3,2],[1,1,1,6],[3,3,3,6],[42,1,42,4],[3,7,4,1],[73,1,73,5],[4,2,4,7],[90,1,90,6],[4,8,4,12],[107,1,107,5]],"שלח":[[2,1,2,6],[2,1,2,6],[2,7,2,10],[42,5,42,8],[2,11,2,15],[73,6,73,10],[2,16,2,21],[90,7,90,12],[2,22,3,2],[107,6,107,10]],"קורח":[[11,14,12,4],[2,7,2,12],[12,5,12,8],[42,9,42,12],[12,9,12,13],[73,11,73,15],[12,14,12,19],[90,13,91,1],[12,20,12,24],[107,11,107,15]],"חוקת":[[11,1,11,6],[3,1,3,6],[11,7,11,10],[43,1,43,4],[11,11,11,15],[73,16,73,20],[11,16,11,21],[91,2,91,7],[11,22,11,26],[107,16,107,20]],"בלק":[[5,6,5,11],[3,7,4,3],[5,12,6,1],[43,5,44,3],[6,2,6,6],[73,21,73,25],[6,7,6,12],[91,8,91,13],[6,13,7,1],[107,21,107,25]],"פינחס":[[18,46,19,5],[4,4,4,9],[19,6,19,9],[44,4,44,7],[19,10,19,14],[73,26,74,2],[19,15,19,20],[91,14,92,3],[19,21,20,4],[107,26,107,30]],"מטות":[[13,15,13,20],[5,1,5,6],[13,21,13,24],[44,8,44,11],[13,25,13,29],[74,3,74,7],[13,30,14,2],[92,4,92,9],[14,3,14,7],[107,31,107,35]],"מסעי":[[2,4,2,9],[5,7,5,12],[2,10,2,13],[44,12,44,15],[2,14,2,18],[74,8,74,12],[2,19,2,24],[92,10,92,15],[2,25,2,29],[107,36,107,40]],"דברים":[[1,1,1,6],[5,13,6,5],[1,7,1,10],[44,16,44,19],[1,11,1,15],[74,13,74,17],[1,16,1,21],[92,16,93,5],[1,22,1,26],[107,41,108,2]],"ואתחנן":[[40,1,40,6],[6,6,6,11],[40,7,40,10],[44,20,44,23],[40,11,40,15],[74,18,74,22],[40,16,40,21],[94,1,94,6],[40,22,40,26],[108,3,108,7]],"עקב":[[49,14,49,19],[7,1,7,6],[49,20,49,23],[44,24,44,27],[49,24,50,2],[74,23,75,4],[50,3,50,8],[94,7,94,12],[50,9,51,2],[108,8,108,12]],"ראה":[[54,11,54,16],[7,7,7,12],[54,17,55,3],[45,1,45,4],[55,4,55,8],[75,5,75,9],[55,9,56,1],[94,13,94,18],[56,2,56,6],[108,13,109,3]],"שופטים":[[51,12,51,17],[7,13,7,18],[51,18,51,21],[45,5,45,8],[51,22,52,3],[75,10,76,3],[52,4,52,9],[94,19,95,1],[52,10,52,14],[109,4,109,8]],"כי תצא":[[17,1,17,6],[8,1,8,6],[17,7,17,10],[45,9,45,12],[17,11,17,15],[76,4,76,8],[17,16,17,21],[95,2,95,7],[17,22,17,26],[109,9,109,13]],"כי תבוא":[[60,1,60,6],[8,7,9,2],[60,7,60,10],[45,13,45,16],[60,11,60,15],[76,9,76,13],[60,16,60,21],[95,8,96,2],[60,22,61,4],[109,14,109,18]],"נצבים":[[61,10,62,4],[9,3,9,8],[62,5,62,8],[45,17,46,2],[62,9,63,1],[77,1,77,5],[63,2,63,7],[96,3,96,8],[63,8,63,12],[109,19,109,23]],"וילך":[[14,1,14,6],[9,9,9,14],[14,7,14,10],[46,3,46,6],[55,6,55,10],[77,6,77,10],[55,11,56,3],[96,9,97,1],[56,4,56,8],[109,24,109,28]],"האזינו":[[22,1,22,6],[9,15,9,20],[22,7,22,10],[46,7,46,10],[22,11,22,15],[77,11,77,15],[22,16,22,21],[97,2,97,7],[22,22,22,26],[109,29,110,2]],"וזאת הברכה":[[8,54,8,59],[10,1,10,6],[8,60,8,63],[46,11,47,2],[8,64,9,2],[77,16,77,20],[1,1,1,6],[97,8,98,1],[1,7,1,11],[110,3,110,7]]};
  // Full effective owned-book bodies, after the unchanged source/qatan helper.
  // Occurrence-only qatan packets do not themselves authenticate books with zero rows.
  var NACH_BOOK_HASHES = {"tanach-amos":"066f840cbc9d0e72a57ec70e9ce22067bc987c85e768b014e3e9f0cd7f22f487","tanach-hoshea":"694c820dd623170570ceb742a07d54687b2b855da7b4b7cadeb4d1051d0e1c86","tanach-malachi":"002fe83ae3b50a7cd777418041d9a8bc31c404695b87ed831fac2ea466ded2bc","tanach-melachim-a":"3563e5711cd9fd4c8033cb47c207c7fadd9a7e5b576e507a5fd395c02c9b0abc","tanach-melachim-b":"b9e271a5b92277ad1b3585f1693647f0468947e3a707b082c509080f531d681f","tanach-michah":"4b26112c298efa52a2a4e1441d9855afd020513f3289b25f6e52aa0aab7c0cb9","tanach-mishlei":"12104a7a343fdf75a0bee0bb502f5c818c9a04cf53b8c32b62eb98e5df9fb2b6","tanach-ovadya":"ca34eb4ad0728ae5306d1244c4e20cc735854ea03e4d5179800a86b7c2f8768c","tanach-shmuel-a":"1d03495230445bf7d1043d12823eb1aae966ffa9a6db7b6cb706d447e66af97a","tanach-shmuel-b":"c124fe1df7c3d6affced9b34922a91962511c4b9ac7fcf18dfb2ad58d7e15f90","tanach-shoftim":"21e3956f8a3cc94d32c6ae7b9d62c9a4b1056e3ec8920d8f8f0ec94e4e194bf4","tanach-tehillim":"2720255084dc1c822d31c126cbbff9da71fa96d75e03bfed989c6defd927f881","tanach-yechezkel":"ed1f5590688be6f16d91886dd8254da3c90515464799d355713b044c002a504c","tanach-yehoshua":"e3a99ede0324323a95083fd4e82a18d8d9e8e4b5634e067bee196e532b394ff1","tanach-yeshayahu":"55af3c185febf9001de261cc93e5ed92ab1290513fbd04f3df65976d1b6e1695","tanach-yirmiyahu":"64b026c2358fae2bbbb8fa69aea40b8b21c595c525239bf55fd52e1b52c5b034","tanach-yonah":"6f7631b320020bc2c14474df652ce9bfa9f9febaca37bf6a9825c0505c93d5b6","tanach-zecharya":"84eb0dc093875cd517c8d585f2c253df75a05d1e0f35261295344e8430a38eaa"};
  var nachFactsPromise;
  function exactFields(value, fields) {
    return value && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).length === fields.length && fields.every(function (k) { return Object.prototype.hasOwnProperty.call(value, k); });
  }
  function validNachRef(ref) {
    return exactFields(ref, ['c','v']) && Number.isSafeInteger(ref.c) && ref.c > 0 && Number.isSafeInteger(ref.v) && ref.v > 0;
  }
  function sameNachRef(a, b) { return a.c === b.c && a.v === b.v; }
  function validateNachFacts(facts) {
    if (!exactFields(facts, ['schemaVersion','policy','weeks']) || facts.schemaVersion !== 1 || facts.policy !== NACH_RANGE_POLICY ||
        !exactFields(facts.weeks, Object.keys(NACH_BOUNDARIES)) || !state.sched || !exactFields(state.sched.weeks, Object.keys(NACH_BOUNDARIES)))
      throw Error('Nach facts: missing or unqualified 54-week coverage');
    var records = 0;
    Object.keys(NACH_BOUNDARIES).forEach(function (wk) {
      var week = facts.weeks[wk], schedule = state.sched.weeks[wk];
      if (!exactFields(week, ['days']) || !exactFields(week.days, DAYS.slice(0,5))) throw Error('Nach facts: incomplete weekday coverage');
      DAYS.slice(0,5).forEach(function (day, i) {
        if (!exactFields(week.days[day], ['navi','kesuvim'])) throw Error('Nach facts: missing section');
        ['navi','kesuvim'].forEach(function (key, j) {
          var r = week.days[day][key], source = (schedule.days[day] || {})[key], pin = NACH_BOUNDARIES[wk][i * 2 + j];
          if (!exactFields(r, ['book','slug','from','to','count','refs']) || !source || !source.from ||
              typeof r.book !== 'string' || r.book !== source.book || !Object.prototype.hasOwnProperty.call(SLUGS, r.book) || r.slug !== SLUGS[r.book] ||
              !validNachRef(r.from) || !validNachRef(r.to) || r.from.c !== source.from.c ||
              r.from.c !== pin[0] || r.from.v !== pin[1] || r.to.c !== pin[2] || r.to.v !== pin[3] ||
              r.count !== NACH_COUNTS[i] || !Array.isArray(r.refs) || r.refs.length !== r.count || !r.refs.every(validNachRef) ||
              !sameNachRef(r.from,r.refs[0]) || !sameNachRef(r.to,r.refs[r.count - 1])) throw Error('Nach facts: rejected source binding or range');
          r.refs.forEach(function (ref, n) {
            if (!n) return;
            var prev = r.refs[n - 1];
            if (!((ref.c === prev.c && ref.v === prev.v + 1) || (ref.c === prev.c + 1 && ref.v === 1)))
              throw Error('Nach facts: rejected ref gap or order');
          });
          records++;
        });
      });
    });
    if (records !== 540) throw Error('Nach facts: rejected slot coverage');
    return facts;
  }
  function loadNachFacts() {
    // One coalesced attempt per page, one bounded transport retry via the six-fetch queue.
    // Missing, corrupt or unqualified data stays failed; never use the old prefix/clamp fallback.
    if (!nachFactsPromise) nachFactsPromise = fetchJSON('/reader/chok/nach-ranges.json?v=explicit-nach-ranges-20261006-r1', true).then(function (raw) {
      if (typeof raw !== 'string' || !window.crypto || !window.crypto.subtle) throw Error('Nach facts: raw hash authentication unavailable');
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(function (digest) {
        var hash = Array.from(new Uint8Array(digest)).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        if (hash !== NACH_RANGE_SHA256) throw Error('Nach facts: rejected raw UTF-8 payload hash');
        return validateNachFacts(JSON.parse(raw));
      });
    });
    return nachFactsPromise;
  }
  function nachRange(wk, day, key) {
    var i = DAYS.indexOf(day);
    if (i < 0 || i > 4) return Promise.resolve(null);
    return loadNachFacts().then(function (facts) {
      var week = facts.weeks[wk], record = week && week.days[day] && week.days[day][key];
      if (!record) throw Error('Nach facts: exact week/day/section not qualified');
      return record;
    });
  }
  function validateNachSpan(bd, r) {
    // Authenticate the entire owned book in book() BEFORE any cutting. Then prove
    // every selected unit, chapter ending and crossover, not merely a matching count.
    if (!bd || bd.slug !== r.slug || !Object.prototype.hasOwnProperty.call(NACH_BOOK_HASHES, r.slug) ||
        !window.TikkunBoundaries || window.TikkunBoundaries.boundaryHash(bd) !== NACH_BOOK_HASHES[r.slug])
      throw Error('Nach book data: entire owned-book authentication mismatch');
    var refs = [];
    for (var c = r.from.c; c <= r.to.c; c++) {
      var ch = (bd.ch || {})[c];
      if (!ch || typeof ch !== 'object') throw Error('Nach book data: missing source chapter');
      var keys = Object.keys(ch).map(Number).sort(function (a,b) { return a-b; });
      if (!keys.length || keys.some(function (v,i) { return !Number.isSafeInteger(v) || v !== i + 1; })) throw Error('Nach book data: chapter corpus gap');
      var start = c === r.from.c ? r.from.v : 1, end = c === r.to.c ? r.to.v : keys[keys.length - 1];
      if (start > end || end > keys[keys.length - 1]) throw Error('Nach book data: missing range boundary');
      for (var v = start; v <= end; v++) {
        if (!ch[v] || !Array.isArray(ch[v].t) || !ch[v].t.length) throw Error('Nach book data: missing verse corpus');
        refs.push({c:c,v:v});
      }
    }
    if (refs.length !== r.count || refs.some(function (ref,i) { return !sameNachRef(ref,r.refs[i]); })) throw Error('Nach book data: qualified refs disagree with owned units');
    return r;
  }
  function nachDataError(label, bookLabel, error) {
    return '<p class="ck-error ck-nach-boundary" data-nach-error="book-data" role="status">' + esc(label + ' — ' + (bookLabel || '')) +
      ': נתוני הספר או טווח המקור אינם מאומתים; לא מוצגים פסוקים חלופיים. <span dir="ltr">Nach book data error: ' +
      esc(String(error)) + '. No fallback verses are displayed.</span></p>';
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
        '<p class="ck-kav-link"><a href="/reader/chok/kavanos/">כוונות לימוד תורה לשמה ←</a></p>' +
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
  var HK_NAMES = { LM: 'ליקוטי מוהר״ן', LM2: 'ליקוטי מוהר״ן ב׳', KLM: 'קיצור ליקוטי מוהר״ן', KLM2: 'קיצור ליקוטי מוהר״ן ב׳', HaMidos: 'ספר המדות', LikHalachos: 'ליקוטי הלכות', LikTefilos: 'ליקוטי תפלות', ChayeyMoharan: 'חיי מוהר״ן', SichosHaRan: 'שיחות הר״ן', ShivchayMoharan: 'שבחי מוהרן', Pirpuros: 'פרפראות לחכמה', BabiHaNachal: 'באבי הנחל', BiurHaLikutim: 'ביאור הליקוטים', OnegShabbos: 'עונג שבת', LikutayEitzos: 'ליקוטי עצות', MeiHaNachal: 'מי הנחל' };
  function hkLine(parsha, c, verse) {
    var hk = state.hk && state.hk.parshiyos && state.hk.parshiyos[parsha];
    var ch = hk && hk[String(c)];
    var refs = ch && ch[String(verse)];
    if (!refs || !refs.length) return '';
    var names = refs.map(function (r) {
      if (!r || r.src === 'EXT') return r ? r.ref : '';
      var nm = HK_NAMES[r.src] || r.src;
      return nm + (r.ref ? ' ' + r.ref : '');
    }).filter(Boolean);
    if (!names.length) return '';
    return '<div class="ck-hk-src">מקורות ברסלב <span class="ck-hk-t">(הלכתא כנחמני)</span>: ' +
      names.join('; ') + '</div>';
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
            var row = coloredVerse(verse) + ' <span class="tk-vnum">' + refLabelHTML(plainHeNum(c) + ':' + plainHeNum(x)) + '</span>';
            if (state.targum && tg && (tg.ch || {})[c] && tg.ch[c][x]) {
              row += '<div class="ck-targum-line">' + richText(applyMode(tg.ch[c][x])) + '</div>';
            }
            if (state.tanachen && en && (en.ch || {})[String(c)] && en.ch[String(c)][x - 1]) {
              row += '<div class="ck-en-line" dir="ltr">' + en.ch[String(c)][x - 1] + '</div>';
            }
            if (vcomm && vcomm.verses && vcomm.verses[c + ':' + x]) {
              row += voiceLine(vcomm.verses[c + ':' + x]);
            }
            if (kind === 'torah' && parsha) {
              row += hkLine(parsha, c, x);
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
  function voiceBox(v, label) {
    if (!v) return '';
    return '<details class="ck-layer ck-voice-layer"><summary>הסבר פשוט' + (label ? ' — ' + label : '') + '</summary>' +
      '<div class="ck-voice">' + voiceLine(v) + '</div></details>';
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
  function secHead(title, ref, generatedRef) {
    return '<div class="ck-sec-head">' + title + (ref ? ' <span class="ck-ref">' + (generatedRef ? refLabelHTML(ref) : esc(ref)) + '</span>' : '') + '</div>';
  }
  function refStr(r) {
    if (!r) return '';
    var f = r.from ? plainHeNum(r.from.c) + (r.from.v ? ':' + plainHeNum(r.from.v) : '') : '';
    var t = r.to ? plainHeNum(r.to.c) + (r.to.v ? ':' + plainHeNum(r.to.v) : '') : '';
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
    // The chok week is anchored by a Shabbos entry and runs through the
    // following Friday (learning days = the Sun-Fri after its anchor Shabbos).
    // Resolve to the LATEST anchor on or before today — HH correction: Thu
    // 2026-09-24 is vezos habracha, though the next shabbos (09-26) opens
    // breishis. Fallback: earliest anchor if none before today.
    var cur = null;
    (state.map || []).forEach(function (e) {
      if (!e.weeks || !e.weeks.length) return;
      if (e.date <= todayIso && (!cur || e.date > cur.date)) cur = e;
    });
    if (!cur) {
      (state.map || []).forEach(function (e) {
        if (!e.weeks || !e.weeks.length) return;
        if (!cur || e.date < cur.date) cur = e;
      });
    }
    return { weeks: cur ? cur.weeks : null, sat: cur ? cur.date : null,
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
    // Breslov on the Parsha layer
    var bitems = [];
    (c.breslov || []).forEach(function (b) {
      if (!b.he && !b.en) return;
      bitems.push('<div class="ck-citem"><b class="ck-ref">' + esc(b.ref || '') + '</b>' +
        (b.summ ? '<div dir="rtl" class="ck-he"><b>' + esc(b.summ) + '</b></div>' : '') +
        (b.he ? '<div dir="rtl" class="ck-he">' + esc(b.he) + '</div>' : '') +
        (b.en ? '<div dir="ltr" class="ck-en">' + esc(b.en) + '</div>' : '') + '</div>');
    });
    if (bitems.length) {
      out.push('<details class="ck-layer"><summary>ברסלב על הפרשה · Breslov on the Parsha</summary>' + bitems.join('') + '</details>');
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
    if (!m) return Promise.resolve('');
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
    var jobs = weeks.map(function (wk, weekIndex) {
      var w = state.sched.weeks[wk];
      if (!w) return Promise.resolve('<p class="ck-error">No schedule for ' + esc(wk) + '</p>');
      var dayE = availDay(w, day);
      var d = w.days[dayE] || {};
      function dayKavana(key, sectionDay) {
        var field = key === 'talmud' ? 'gemara' : key === 'kabbala' ? 'zohar' : key;
        // Display ownership follows week order, never asynchronous fetch timing.
        var repeated = weeks.slice(0, weekIndex).some(function (prior) {
          var previous = state.sched.weeks[prior];
          return previous && (previous.days[availDay(previous, day)] || {})[field];
        });
        return kavanaHTML(key, sectionDay, repeated);
      }
      var dc = dcommFor(wk, dayE);
      var out = [];
      if (state.focus) out.push(focusBar());
      else {
        if (dayE !== day) out.push('<p class="ck-fb-note">אין סדר ל' + esc(day) + ' בשבוע זה — מוצג: ' + esc(dayE) + ' (סוף המחזור)</p>');
        out.push(voiceTop(dc));
      }
      var p = Promise.resolve();
      if (d.torah && d.torah.from && want('torah')) {
        p = p.then(function () {
          return versesHTML(w.slug, d.torah.from, d.torah.to, 'torah', dc, wk).then(function (vh) {
            out.push('<section class="ck-section" data-sec="torah">' +
              secHead('תורה — ' + wk, refStr(d.torah), true) + popBtn() + dayKavana('torah', d) + (vh || '') + '</section>');
          });
        });
      }
      [['navi','נביא'],['kesuvim','כתובים']].forEach(function (pair) {
        p = p.then(function () {
          var sec = d[pair[0]];
          if (!sec || !sec.book) {
            if (want(pair[0]) && DAYS.indexOf(dayE) >= 0 && DAYS.indexOf(dayE) < 5) {
              out.push(nachDataError(pair[1], '', Error('Nach facts: missing original schedule qualifier')));
              return;
            }
            if (want(pair[0]) && dayE !== 'ליל שישי') out.push('<p class="ck-nach-boundary" data-nach-unavailable="' + pair[0] + '" role="status">' +
              pair[1] + ': לא נקבע פרק בסדר המקור ליום זה; אין טווח יומי להצגה. ' +
              '<span dir="ltr">No chapter scheduled for this section today; the daily study window is unavailable. No other chapter is introduced.</span></p>');
            return;
          }
          var vkey = pair[1] === 'כתובים' ? 'kesuvim' : 'navi';
          if (!want(vkey)) return;
          return nachRange(wk, dayE, vkey).then(function (plan) {
            if (!plan) return;
            var requestedCount = plan.count;
            var policyTag = '<div class="ck-nach-policy">סדר הלימוד היומי: ' + heNum(requestedCount) + ' פסוקים לפי מניין המילוי. ' +
              '<span dir="ltr">Weekday miluy counts: 6 / 4 / 5 / 6 / 5. This source-qualified slot contains ' + requestedCount + ' verses.</span></div>';
            return book(plan.slug).then(function (bd) {
              validateNachSpan(bd, plan);
              return versesHTML(plan.slug, plan.from, plan.to, 'navi', null).then(function (vh) {
                out.push('<section class="ck-section" data-sec="' + vkey + '">' +
                  secHead(pair[1] + ' — ' + sec.book, refStr(plan), true) + popBtn() + policyTag + dayKavana(vkey, d) + voiceBox(dc && dc[vkey], pair[1]) + vh + '</section>');
              });
            });
          }).catch(function (error) { out.push(nachDataError(pair[1], sec.book, error)); });
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
          return mishnaHTML(d.mishna.masechet, d.mishna.perek).then(function (html) { html = html || ''; html = dayKavana('mishna', d) + html; html = voiceBox(dc && dc.mishna, 'משנה') + html;
            if (html) out.push('<section class="ck-section" data-sec="mishna">' + html + '</section>');
          });
        });
      }
      var bonusItems = (state.bonus && state.bonus.weeks[wk] && state.bonus.weeks[wk][dayE]) || null;
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
          return halachaHTML(d).then(function (html) { html = html || ''; html = dayKavana('halacha', d) + html; html = voiceBox(dc && dc.halacha, 'הלכה') + html;
            if (html) out.push('<section class="ck-section" data-sec="halacha">' + html + '</section>');
          });
        });
      }
      if (d.gemara && d.gemara.masechet && want('talmud')) {
        p = p.then(function () {
          return gemaraHTML(d.gemara).then(function (html) { html = html || ''; html = dayKavana('talmud', d) + html; html = voiceBox(dc && dc.talmud, 'גמרא') + html;
            if (html) out.push('<section class="ck-section" data-sec="talmud">' + html + '</section>');
          });
        });
      }
      if (d.zohar && (d.zohar.vol || d.zohar.work) && want('kabbala')) {
        p = p.then(function () {
          return zoharHTML(d.zohar).then(function (html) { html = html || ''; html = dayKavana('kabbala', d) + html; html = voiceBox(dc && dc.kabbala, 'זוהר') + html;
            if (html) out.push('<section class="ck-section" data-sec="kabbala">' + html + '</section>');
          });
        });
      }
      p = p.then(function () {
        if (!want('mussar')) return;
        return mussarHTML(wk, dayE).then(function (html) { html = html || ''; html = voiceBox(dc && dc.mussar, 'מוסר') + html;
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
      return fetchCommentary(wk, availDay(state.sched && state.sched.weeks[wk], day));
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
        if (!state.focus) parts.push(studyOverviewHTML());
        if (carryHTML) parts.push(carryHTML);
        if (!state.focus) parts.push('<p class="ck-tef-link"><a href="/reader/chok/tefillos/">תפלות שלפני לימוד התורה ←</a></p>');
        parts.push(weekParts.join(''));
        if (commentHTML) parts.push(commentHTML);
        box.innerHTML = parts.join('') || '<p class="ck-error">Nothing to show.</p>';
        wireKavanos(box);
        if (state.focus) {
          Array.prototype.forEach.call(box.querySelectorAll('.ck-section[data-sec] details:not(.ck-kavana)'), function (dtl) { dtl.open = true; });
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
    ['mode','medooyuk','targum','commentary','rashi','tanachen','size','theme','carryMode','kavanaMode'].forEach(function (k) {
      if (st[k] !== undefined) state[k] = st[k];
    });
    if (state.kavanaMode !== 'always') state.kavanaMode = 'closed';
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
      fetchJSON('/reader/chok/hk-verses.json?v=2').catch(function () { return null; }),
      fetchJSON('/reader/chok/kavanos-torah.json').catch(function () { return null; })
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
      state.kavGeneral = res[9] || null;
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
      $('ck-kavanamode').value = state.kavanaMode;
      $('ck-kavanamode').addEventListener('change', function () {
        state.kavanaMode = this.value === 'always' ? 'always' : 'closed'; save(); renderDay(); });
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
