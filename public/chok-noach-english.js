/* Exact-field augmentation. All transport belongs to the caller's queued raw loader. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChokNoachEnglish = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var PAYLOAD_SHA = '9e301739920c3f6de7e7a68726323c2e809d8e2f2b022ec9663a623bd8d3eed8';
  var URL = '/reader/chok/noach-bartenura-english.json?v=' + PAYLOAD_SHA;
  var LEGAL_URL = '/reader/chok/noach-bartenura-conditions.html';
  var CONTEXT_KEYS = ["נח|יום חמישי|mishna-zevachim|2","נח|יום ראשון|mishna-berakhot|2","נח|יום רביעי|mishna-bava-kamma|2","נח|יום שישי|mishna-mikvaot|2","נח|יום שלישי|mishna-yevamot|2","נח|יום שני|mishna-shabbat|2"];
  var CONDITIONS_TEXT = "These conditions apply only to the selected Noach Bartenura English translations and their source-dependent bilingual study notes and qualifications, not to the entire ajew.org corpus.\nSource provider: תורת אמת. TextSource: ר' פנחס ראובן שליט''א. English translation and bilingual study notes: in-house. No endorsement by the provider or named contributor is implied.\nThis selection is for the noncommercial free educational Chok Reader. Noncommercial use, attribution, same-or-similar share-alike for adaptations, and communication of these conditions are required. Commercial/KDP or other paid distribution and arbitrary relicensing are not authorized by this selection.\nThe retained notice identifies Creative Commons 2.5 but does not identify a port, jurisdiction or release date. No exact port URL, worldwide clearance or original-pointing/reprinting clearance is asserted. These field-specific conditions do not grant rights in other source editions, fonts or unrelated content.\n\nRetained notice:\nבס\"ד\n\nהתוכנית חופשית ומותרת להעתקה ולהפצה בשלימותה שלא לשימוש מסחרי\n\nאם ברצונך להפיץ רק חלק מהתכנית או הקבצים ראה תנאים בדף ההקדמה שבתוך התכנית\n\nמותר להפיץ חלקים מתוכנה זו אך ורק לפי תנאי רשיון 2.5-Creative Commons-CC\n\nComplete applicable retained conditions:\nניתן לך החופש לשתף ,להעתיק, להפיץ ולהעביר את היצירה להכין רמיקס ולעבד את היצירה בכפוף לתנאים הבאים:\n\nייחוס. עליך לייחס את היצירה (לתת קרדיט) באופן המצויין על-ידי היוצר או מעניק הרישיון (אך לא בשום אופן המרמז על כך שהם תומכים בך או בשימוש שלך ביצירה). \n\nשימוש לא מסחרי. אינך רשאי/ת להשתמש ביצירה זו לצרכים מסחריים. \n\nשיתוף זהה. אם תחליט/י לשנות, לעבד או ליצור יצירה נגזרת בהסתמך על יצירה זו, תוכל/י להפיץ את יצירתך החדשה רק תחת אותו הרישיון או רישיון דומה לרישיון זה. \n\nבכל שימוש חוזר או הפצה של היצירה עליך להבהיר לאחרים את תנאי הרישיון ביצירה זו. \n\nניתן לוותר על כל אחד מתנאים אלו בכפוף לקבלת רשות מבעלי זכויות היוצרים. \n\nרישיון זה אינו פוגע או מגביל את זכויותיו של היוצר.\n\nRetained named-contributor permission evidence:\nתודה מיוחדת מקרב לב למזכה הרבים הגדול ר' פנחס ראובן שליט\"א שבזכותו מאגר זה רואה אור שבאהבת השם הגדולה שלו ובאהבת ישראל הגדולה וברוחב לבו התיר לנו להכניס למאגר זה את כל ספרי הקודש שיש לו זכויות יוצרים עליהם !!! השם יברכהו בכל ברוחניות ובגשמיות וימלא כל משאלות לבו לטובה לעבודתו יתברך.\n";
  var admittedResults = new WeakSet();
  function supports(week,day,slug,chapter) { return CONTEXT_KEYS.includes(week+'|'+day+'|'+slug+'|'+chapter); }
  function reject(code) { throw new Error('NOACH_' + code); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  }); }
  function freeze(x) {
    if (x && typeof x === 'object' && !Object.isFrozen(x)) {
      Object.keys(x).forEach(function(k) { freeze(x[k]); }); Object.freeze(x);
    }
    return x;
  }
  async function hash(s) {
    if (typeof s !== 'string') reject('TEXT_TYPE');
    var bytes = new TextEncoder().encode(s);
    return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)))
      .map(function(x) { return x.toString(16).padStart(2,'0'); }).join('');
  }
  function pointer(x, path) {
    return path.slice(1).split('/').reduce(function(v,k) {
      k=k.replace(/~1/g,'/').replace(/~0/g,'~');
      if (v===null || typeof v!=='object' || !Object.prototype.hasOwnProperty.call(v,k)) reject('POINTER');
      return v[k];
    },x);
  }
  async function authenticateSelection(p) {
    if (!p || p.schema!=='noach45-current-scalar-sidecar-v2' || p.selection.entries.length!==45 ||
        p.selection.selectionQualifications.length!==4) reject('SELECTION');
    var seen=new Set(), notes=0;
    for (var e of p.selection.entries) {
      var identity=e.context+'|'+e.runtimeOwner+'|'+e.sourceOriginalSHA256;
      if (seen.has(identity) || e.role!=='bartenura' || !p.carrierPins[e.sourcePath] ||
          e.context.split('|')[0]!=='נח' || e.sourceOwner!==e.context+'|bartenura|'+e.runtimeOwner ||
          await hash(e.english)!==e.englishSHA256) reject('ENGLISH_OR_OWNER');
      seen.add(identity);
      var noteIDs=new Set();
      for (var n of e.notes) {
        if (noteIDs.has(n.id) || n.owner!==e.sourceOwner || n.runtimeOwner!==e.runtimeOwner ||
            !n.segment.startsWith(e.sourceOwner+'|segment:') ||
            n.visibility!=='OWNER_LOCAL_OUTSIDE_OPTIONAL_DISCLOSURES_AND_LANGUAGE_CONTROLS' ||
            n.anchor.currentOriginalSHA256!==e.sourceOriginalSHA256 ||
            n.anchor.englishOwnerSHA256!==e.englishSHA256 ||
            await hash(n.he)!==n.heSHA256 || await hash(n.en)!==n.enSHA256) reject('NOTE');
        noteIDs.add(n.id); notes++;
      }
    }
    if (notes!==72) reject('NOTE_COUNT');
    for (var q of p.selection.selectionQualifications) {
      if (await hash(q.he)!==q.heSHA256 || await hash(q.en)!==q.enSHA256) reject('QUALIFICATION');
    }
    if (!Array.isArray(p.referenceApparatus) || p.referenceApparatus.length!==71) reject('APPARATUS_COUNT');
    var apparatusIDs=new Set();
    for (var r of p.referenceApparatus) {
      var owner=p.selection.entries.find(function(e) { return e.sourceOwner===r.owner; });
      var span=r.englishSpanCP;
      if (!owner || apparatusIDs.has(r.id) || r.runtimeOwner!==owner.runtimeOwner ||
          !r.id.startsWith(r.segment+'|source-apparatus:') || !r.segment.startsWith(r.owner+'|segment:') ||
          !/^\{[^{}]+\}$/.test(r.sourceMarker) || r.printedNoteTarget!==null ||
          r.currentOriginalSHA256!==owner.sourceOriginalSHA256 || !Array.isArray(span) || span.length!==2 ||
          !span.every(Number.isSafeInteger) || span[0]<0 || span[0]>=span[1] || span[1]>Array.from(owner.english).length ||
          await hash(Array.from(owner.english).slice(span[0],span[1]).join(''))!==r.segmentEnglishSHA256) reject('APPARATUS');
      apparatusIDs.add(r.id);
    }
    return freeze(p);
  }
  function create(loadRaw) {
    if (typeof loadRaw!=='function') reject('RAW_LOADER');
    var pending=null;
    function payload() {
      if (!pending) pending=Promise.resolve().then(function() { return loadRaw(URL); }).then(async function(raw) {
        if (await hash(raw)!==PAYLOAD_SHA) reject('PAYLOAD_HASH');
        return authenticateSelection(JSON.parse(raw));
      }).catch(function(error) { pending=null; throw error; });
      return pending;
    }
    async function load(request) {
      // Capture values before the first await; no mutable current-day/global state is consulted.
      if (!request || typeof request.week!=='string' || typeof request.day!=='string' ||
          typeof request.slug!=='string' || !Number.isSafeInteger(request.chapter) ||
          typeof request.english!=='boolean') reject('REQUEST');
      var week=request.week, day=request.day, slug=request.slug, chapter=request.chapter,
          english=request.english, context=week+'|'+day;
      var p=await payload();
      var entries=p.selection.entries.filter(function(e) {
        return e.context===context && e.runtimeOwner.startsWith(slug+':'+chapter+':');
      });
      if (!entries.length) reject('CONTEXT');
      var path=entries[0].sourcePath;
      if (entries.some(function(e) { return e.sourcePath!==path; })) reject('SOURCE_PATH');
      var raw=await loadRaw('/'+path.replace(/^public\//,''));
      var pin=p.carrierPins[path];
      if (new TextEncoder().encode(raw).byteLength!==pin.bytes || await hash(raw)!==pin.sha256) reject('SOURCE_HASH');
      var source=JSON.parse(raw), rows=source.ch && source.ch[String(chapter)];
      if (!Array.isArray(rows) || rows.some(function(x) { return typeof x!=='string'; })) reject('SCALAR_BOUNDARY');
      for (var e of entries) {
        var original=pointer(source,e.sourcePointer);
        if (typeof original!=='string' || await hash(original)!==e.sourceOriginalSHA256) reject('CURRENT_ORIGINAL');
        for (var r of p.referenceApparatus.filter(function(r) { return r.owner===e.sourceOwner; })) {
          var word=r.currentWordSpanCP, segment=r.currentSegmentSpanCP, chars=Array.from(original);
          if (![word,segment].every(function(s) { return Array.isArray(s) && s.length===2 && s.every(Number.isSafeInteger) && s[0]>=0 && s[0]<s[1] && s[1]<=chars.length; }) ||
              word[0]<segment[0] || word[1]>segment[1] ||
              await hash(chars.slice(word[0],word[1]).join(''))!==r.currentWordSHA256) reject('APPARATUS_ANCHOR');
        }
        for (var n of e.notes) {
          var a=n.anchor, span=a.currentOwnerSpanCP, chars=Array.from(original);
          if (a.field!=='he' || !Array.isArray(span) || span.length!==2 ||
              !span.every(Number.isSafeInteger) || span[0]<0 || span[0]>=span[1] || span[1]>chars.length ||
              await hash(chars.slice(span[0],span[1]).join(''))!==a.currentSpanSHA256) reject('ANCHOR');
        }
      }
      var qualifications=p.selection.selectionQualifications.filter(function(q) {
        return q.id.startsWith(context+'|selection-wide:');
      });
      // Newly parsed raw source, detached and frozen. Never rewrite a scalar carrier or Mishna English.
      var result=freeze({context:context,slug:slug,chapter:chapter,english:english,
        rows:rows,entries:entries,qualifications:qualifications,conditions:p.conditions,
        referenceApparatus:p.referenceApparatus.filter(function(r) { return entries.some(function(e) { return e.sourceOwner===r.owner; }); })});
      admittedResults.add(result); return result;
    }
    return Object.freeze({load:load});
  }
  function unitID(result, ordinal) {
    return 'ck-noach-'+encodeURIComponent(result.context+'|'+result.slug+':'+result.chapter+':'+ordinal);
  }
  function bilingual(n,attrs) {
    return '<div '+attrs+'><p lang="he" dir="rtl">'+esc(n.he)+'</p><p lang="en" dir="ltr">'+esc(n.en)+'</p></div>';
  }
  function render(result, originalRenderer) {
    if (!result || !admittedResults.has(result) || typeof originalRenderer!=='function') reject('RENDER_INPUT');
    var extra='', byOrdinal=new Map();
    result.entries.forEach(function(e) { byOrdinal.set(Number(e.runtimeOwner.split(':').pop()),e); });
    var body=result.rows.map(function(original,i) {
      if (!original) return '';
      var e=byOrdinal.get(i+1), id=unitID(result,i+1);
      var html='<article class="ck-comm-body" data-classical-unit="'+(i+1)+'"'+(e?' id="'+esc(id)+'"':'')+'>'+originalRenderer(original);
      if (e) {
        var enID=id+'-english';
        html+='<div class="ck-noach-local" dir="ltr"><button type="button" data-ck-noach-toggle="'+esc(enID)+'" aria-controls="'+esc(enID)+'" aria-expanded="'+result.english+'">English translation</button></div>'+
          '<div class="ck-noach-en" data-ck-noach-licensed="english" id="'+esc(enID)+'" lang="en" dir="ltr"'+(result.english?'':' hidden')+'>'+esc(e.english)+'</div>';
        if (e.notes.length) extra+='<aside class="ck-noach-notes" aria-label="Bartenura '+result.chapter+':'+(i+1)+' notes"><p dir="ltr"><a href="#'+esc(id)+'">Bartenura '+result.chapter+':'+(i+1)+' — Notes</a></p>'+e.notes.map(function(n) {
          return bilingual(n,'data-ck-noach-licensed="note"');
        }).join('')+'</aside>';
      }
      return html+'</article>';
    }).join('');
    // Material qualifications remain outside the optional classical-commentary disclosure and local language controls.
    return '<details class="ck-layer ck-bartenura" data-classical-chapter="'+esc(result.slug+' '+result.chapter)+'"><summary>ברטנורא — פירוש המשנה · Bartenura — classical commentary</summary>'+body+'</details>'+extra+
      result.qualifications.map(function(q) { return bilingual(q,'class="ck-noach-qualification" data-ck-noach-licensed="qualification"'); }).join('');
  }
  function exportSelection(result, options) {
    options=options || {};
    if (!admittedResults.has(result) || !result.conditions || !['text','json','html'].includes(options.format)) reject('EXPORT_FORMAT');
    if (options.use!=='noncommercial-free-educational-reader') reject('EXPORT_USE');
    var selected={context:result.context,entries:result.entries.map(function(e) {
      return {runtimeOwner:e.runtimeOwner,english:e.english,notes:e.notes};
    }),selectionQualifications:result.qualifications,conditions:result.conditions,referenceApparatus:result.referenceApparatus};
    if (options.format==='json') return JSON.stringify(selected,null,2);
    var text=result.context+'\n\n'+result.entries.map(function(e) {
      return e.runtimeOwner+'\n'+e.english+'\n\n'+e.notes.map(function(n) {return n.he+'\n'+n.en;}).join('\n\n');
    }).concat(result.qualifications.map(function(q) { return q.he+'\n'+q.en; })).join('\n\n')+'\n\n'+result.conditions.text;
    return options.format==='text'?text:'<!doctype html><meta charset="utf-8"><title>Bartenura study selection</title><pre style="white-space:pre-wrap">'+esc(text)+'</pre><p><a href="'+LEGAL_URL+'">Retained conditions</a></p>';
  }
  function bind(root) {
    root.querySelectorAll('[data-ck-noach-toggle]').forEach(function(button) {
      if (button.dataset.ckNoachBound) return;
      button.dataset.ckNoachBound='1';
      button.addEventListener('click',function() {
        var target=root.ownerDocument.getElementById(button.getAttribute('data-ck-noach-toggle'));
        if (!target || !root.contains(target)) return;
        target.hidden=!target.hidden; button.setAttribute('aria-expanded',String(!target.hidden));
      });
    });
  }
  function installCopyConditions(doc) {
    var conditionsText=CONDITIONS_TEXT;
    if (!doc || typeof doc.addEventListener!=='function' || typeof conditionsText!=='string' || !conditionsText) reject('COPY_CONDITIONS');
    function copy(event) {
      var selection=doc.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;
      var affected=Array.from(doc.querySelectorAll('[data-ck-noach-licensed]')).some(function(node) {
        for (var i=0;i<selection.rangeCount;i++) {
          if (selection.getRangeAt(i).intersectsNode(node)) return true;
        }
        return false;
      });
      if (!affected) return;
      // Scoped fail-closed: never suppress unrelated/global exports. No suffix delivery means no scoped copy.
      event.preventDefault();
      if (!event.clipboardData) return;
      var text=selection.toString()+'\n\n'+conditionsText;
      event.clipboardData.setData('text/plain',text);
      event.clipboardData.setData('text/html','<pre style="white-space:pre-wrap">'+esc(text)+'</pre>');
    }
    doc.addEventListener('copy',copy); doc.addEventListener('cut',copy);
  }
  return Object.freeze({create:create,supports:supports,render:render,bind:bind,exportSelection:exportSelection,
    installCopyConditions:installCopyConditions,payloadURL:URL,conditionsURL:LEGAL_URL});
}));
