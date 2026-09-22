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
    day: null, weeks: null, size: 26, theme: 'day',
    sched: null, map: null, bonus: null, bookCache: {}, targCache: {}, rashiCache: {}
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
        return '<details class="ck-layer ck-halacha" open><summary>שולחן ערוך ' + (TUR_HE[h.tur] || h.tur) + ' סימן ' + heNum(h.from) + '</summary>' + body + '</details>';
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
      commentary: state.commentary, rashi: state.rashi,
      size: state.size, theme: state.theme })); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem('chok-settings') || '{}'); } catch (e) { return {}; } }

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
  function coloredVerse(verse) {
    var byTok = {};
    (verse.m || []).forEach(function (mk) {
      (byTok[mk[0]] = byTok[mk[0]] || []).push(mk);
    });
    return joinTokens(verse.t.map(function (tok, i) {
      var mks = byTok[i];
      if (!mks || !state.medooyuk) return esc(applyMode(tok));
      var cls = [], qb = false;
      mks.forEach(function (mk) {
        if (mk[3]) qb = true;
        if (mk[2] === 'na') cls.push('m-na');
        else if (mk[2] === 'nach') cls.push('m-nach');
      });
      var c = cls.join(' ') + (qb ? ' m-qb' : '');
      var txt = applyMode(tok);
      return c ? '<span class="' + c.trim() + '">' + esc(txt) + '</span>' : esc(txt);
    }));
  }
  function heNum(n) {
    var G = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'], T = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'], H = ['','ק','ר','ש','ת'];
    function u(x) { return x < 10 ? G[x] : x < 100 ? T[Math.floor(x/10)] + G[x%10] : H[Math.floor(x/100)] + u(x%100); }
    var s = u(n);
    if (s === 'יה') s = 'טו'; if (s === 'יו') s = 'טז';
    return s.replace(/([א-ת])$/, '$1\u05f4');
  }
  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
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
  function versesHTML(slug, from, to) {
    return book(slug).then(function (d) {
      return targ(slug).then(function (tg) {
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
            items.push({ c: c, x: x, row: row });
          });
          if (to && c >= to.c) break;
          c++; v = 1;
        }
        return Promise.all(items.map(function (it) {
          return rashiHTML(slug, it.c, it.x).then(function (rh) {
            return '<div class="ck-verse">' + it.row + rh + '</div>';
          });
        })).then(function (rows) { return rows.join(''); });
      });
    });
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
    var todayIso = today.toISOString().slice(0,10);
    var best = null;
    (state.map || []).forEach(function (e) { if (e.date <= todayIso && e.weeks) best = e; });
    var days = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','ליל שישי','יום שישי'];
    var hebDays = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    return { weeks: best ? best.weeks : null, sat: best ? best.date : null,
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
      return '<details class="ck-layer ck-mishna" open><summary>משנה — ' + esc(masechet) +
        ' פרק ' + heNum(perek) + '</summary>' + body + '</details>';
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
      var out = [];
      var p = Promise.resolve();
      if (d.torah && d.torah.from) {
        p = p.then(function () {
          return versesHTML(w.slug, d.torah.from, d.torah.to).then(function (vh) {
            out.push('<section class="ck-section">' +
              secHead('תורה — ' + wk, refStr(d.torah)) + vh + '</section>');
          });
        });
      }
      [['navi','נביא'],['kesuvim','כתובים']].forEach(function (pair) {
        p = p.then(function () {
          var sec = d[pair[0]];
          if (!sec || !sec.book) return;
          var slug = SLUGS[sec.book];
          if (!slug) { out.push(card(pair[1], sec.book)); return; }
          return versesHTML(slug, {c: sec.from.c, v: sec.from.v || 1}, null).then(function (vh) {
            out.push('<section class="ck-section">' +
              secHead(pair[1] + ' — ' + sec.book, refStr(sec)) + vh + '</section>');
          });
        });
      });
      p = p.then(function () {
        var extras = [];
        if (d.mishna) extras.push(card('משנה', (d.mishna.masechet||'') + (d.mishna.perek ? ' פרק ' + heNum(d.mishna.perek) : '')));
        if (d.gemara) extras.push(card('גמרא', (d.gemara.masechet||'') + ' ' + heNum(d.gemara.daf||0) + (d.gemara.amud ? (d.gemara.amud===2?' עמוד ב':' עמוד א') : '')));
        if (d.zohar) extras.push(card('זוהר', (d.zohar.work ? d.zohar.work + ' ' : (d.zohar.vol ? d.zohar.vol + ' ' : '')) + (d.zohar.daf ? heNum(d.zohar.daf) : '') + (d.zohar.amud ? (d.zohar.amud===2?' ב':' א') : '')));
        if (d.halacha && d.halacha.work === 'rambam' && d.halacha.hilchot) extras.push(card('הלכה — רמב״ם', 'הלכות ' + d.halacha.hilchot + (d.halacha.from_perek ? ' פרק ' + heNum(d.halacha.from_perek) : '')));
        if (d.halacha && d.halacha.work === 'SA' && d.halacha.from) extras.push(card('הלכה — שולחן ערוך', TUR_HE[d.halacha.tur] + ' סימן ' + heNum(d.halacha.from)));
        if (d.mussar) extras.push(card('מוסר', d.mussar.label || ''));
        if (d.haftara) extras.push(card('הפטרה', (d.haftara.label || '').replace(/B/g,' ')));
        if (extras.length) out.push('<section class="ck-section">' + secHead('שאר חלקי היום') + extras.join('') + '</section>');
      });
      if (d.mishna && d.mishna.masechet) {
        p = p.then(function () {
          return mishnaHTML(d.mishna.masechet, d.mishna.perek).then(function (html) {
            if (html) out.push(html);
          });
        });
      }
      var bonusItems = (state.bonus && state.bonus.weeks[wk] && state.bonus.weeks[wk][day]) || null;
      if (bonusItems) {
        p = p.then(function () {
          return Promise.all(bonusItems.map(bonusHTML)).then(function (parts) {
            parts.forEach(function (html) { if (html) out.push(html); });
          });
        });
      }
      if (d.halacha && d.halacha.work) {
        p = p.then(function () {
          return halachaHTML(d).then(function (html) {
            if (html) out.push(html);
          });
        });
      }
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
        box.scrollTop = 0; window.scrollTo(0, 0);
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
    ['mode','medooyuk','targum','commentary','rashi','size','theme'].forEach(function (k) {
      if (st[k] !== undefined) state[k] = st[k];
    });
    state.day = DAYS[DAY_DEFAULT[new Date().getDay()]] || DAYS[0];
    Promise.all([
      fetchJSON('/reader/chok/schedule.json'),
      fetchJSON('/reader/chok/shabbos-map.json'),
      fetchJSON('/reader/chok/mishna-bonus.json').catch(function () { return null; })
    ]).then(function (res) {
      state.sched = res[0];
      state.map = res[1];
      state.bonus = res[2] || null;
      var rr = resolveWeek();
      state.weeks = rr.weeks || ['בראשית'];
      state.day = rr.day;
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
