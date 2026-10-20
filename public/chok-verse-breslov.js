/* Qualified verse-local Breslov access. Canonical bodies are never edited.
 * Assign only a printed main verseRef and explicit apparatus owner_main_id.
 * Documentary after_pair locators are retained; necessary notes are displayed
 * as owner-local siblings OUTSIDE that owner's closed body, in source order. */
(function () {
  'use strict';
  var LECH='/reader/chumash-lh/part-1/torah-3.json';
  var PROJECTIONS='/reader/chok/lech-lichuh-breslov-projections.json';
  var PINS={};
  PINS[LECH]='5c9878ffbc5d8afaf7794569b0772710c82d5e4846b3b8e9734f72b08ed6c765';
  PINS[PROJECTIONS]='884a4b47c50f3db030f36733c04b10ade7ffe190f30b708a81906f8df867e8ee';
  var READING_NOTES='/reader/chok/breslov-reading-notes.json';
  PINS[READING_NOTES]='a1df2e7e0ff4dbcabacce67bd05e8ad976078d0edba742f84bc6a9f4a35309a5';
  var selections={}, pending;
  var printedNoteLabels={
    'noach':{'printed-note-50':'Printed note 50 — reference unidentified','P074-N01':'Printed note 54 — contextual association','P076-N01':'Printed note 55 — contextual association'},
    'lech-lichuh':{'P099-N01':'Printed note 72 — contextual association','P102-N01':'Printed note 73 — contextual association','P102-N02':'Printed note 74 — contextual association','P108-N01':'Printed note 75 — contextual association'}
  };
  var globalReadingProjections={
    'I0090':{before:'Quotation marks and geresh/gershayim code points are diplomatic encoding choices; raster printing cannot recover the original typesetter Unicode. This is distinct from unresolved visible glyphs.',text:null},
    'B04:qualification:q-points':{before:'This is a native-source authoring draft. Specific uncertain spellings and vowel clusters are listed by occurrence; independent certification of every printed mark and publication approval remain withheld.',text:'Specific uncertain spellings and vowel clusters are listed by occurrence.'},
    'E09':{before:'Original typesetter Unicode cannot be recovered from raster. Quote/apostrophe marks use explicit consistent candidate encoding: ASCII quotes for verse/quotations; Hebrew U+05F4 in numeric references and acronyms; ASCII apostrophe after הלכה ד. This does not claim original byte identity.',text:null}
  };
  function globalReadingText(q){var p=globalReadingProjections[q.id];return p&&p.before===q.text?p.text:q.text;}
  function esc(x) { return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function digest(raw) { return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0');}).join('');}); }
  function read(url,loader) { return loader(url+'?v='+PINS[url]).then(function(raw){return digest(raw).then(function(hash){if(hash!==PINS[url])throw Error('Breslov source changed');return JSON.parse(raw);});}); }
  // Validate every qualification, not just the first verse/day's visible notes.
  function validate(source, projection, lech) {
    var rows=lech?projection.rows:projection.notes, byId={}, checks=[], count=0;
    if(!Array.isArray(rows))throw Error('Missing Breslov qualifications');
    rows.forEach(function(q){if(byId[q.id])throw Error('Duplicate Breslov qualification');byId[q.id]=q;});
    var units={};
    source.units.forEach(function(u){
      if(units[u.id] || !Array.isArray(u.pairs) || !u.pairs.length || !Array.isArray(u.qualifications))throw Error('Incomplete Breslov owner');
      units[u.id]=u;
      var pairIds={};
      u.pairs.forEach(function(p){if(pairIds[p.id] || typeof p.he!=='string' || !p.he || typeof p.en!=='string' || !p.en)throw Error('Incomplete Breslov pair');pairIds[p.id]=true;});
      u.qualifications.forEach(function(q){
        var row=byId[q.id];count++;
        if(!row || row.owner!==u.id || q.owner!==u.id || row.pair_id!==q.pair_id || row.placement!==q.placement ||
           (q.placement==='after_pair'&&!pairIds[q.pair_id]) || (q.placement!=='after_pair'&&q.placement!=='after_owner') ||
           (lech?row.before:row.sourceText)!==q.text)throw Error('Breslov qualification owner/pair/placement changed');
        var text=lech?row.after:row.displayText;
        if(typeof text!=='string'||!text)throw Error('Missing Breslov qualification text');
        checks.push(Promise.all([digest(q.text),digest(text)]).then(function(h){if(h[0]!== (lech?row.beforeSHA256:row.sourceTextSHA256) || h[1]!== (lech?row.afterSHA256:row.displayTextSHA256))throw Error('Breslov qualification text changed');}));
        if(lech){
          if(!Array.isArray(row.pairs)||row.pairs.length!==u.pairs.length)throw Error('Missing Breslov pair bindings');
          u.pairs.forEach(function(p,i){var b=row.pairs[i];if(!b||b.id!==p.id)throw Error('Breslov pair order changed');checks.push(Promise.all([digest(p.he),digest(p.en)]).then(function(h){if(h[0]!==b.heSHA256||h[1]!==b.enSHA256)throw Error('Breslov pair body changed');}));});
        }
      });
    });
    source.units.forEach(function(u){if(u.sourceKind!=='main' && u.owner_main_id!==null && (!units[u.owner_main_id]||units[u.owner_main_id].sourceKind!=='main'))throw Error('Invalid Breslov apparatus owner');});
    if(count!==rows.length || (source.globalQualifications||[]).length)throw Error('Breslov qualification coverage changed');
    if(lech){
      if(projection.sourceSHA256!==PINS[LECH] || projection.sourceURL!==LECH || projection.scopeBefore!==source.scopeNotice || !projection.scopeAfter)throw Error('Breslov scope changed');
      checks.push(Promise.all([digest(source.scopeNotice),digest(projection.scopeAfter)]).then(function(h){if(h[0]!==projection.scopeBeforeSHA256||h[1]!==projection.scopeAfterSHA256)throw Error('Breslov scope binding changed');}));
    }
    return Promise.all(checks).then(function(){return {source:source,notes:byId,scope:lech?projection.scopeAfter:'Optional weekly teachings and printed notes. Some small letters and vowel points are uncertain; the alternatives appear beside their passages.',key:lech?'lech-lichuh':'noach'};});
  }
  // Reader-facing projections are separate from immutable source/provenance.
  // Every note has an explicit, source-bound disposition; no keyword filtering.
  function present(s, policy) {
    var portion=s.key==='noach'?'Noach':'Lech', rows=policy.notes.filter(function(q){return q.portion===portion;}), projected={}, checks=[];
    if(policy.schema!=='chok-breslov-reading-notes/v1' || !policy.scopes[portion] ||
       policy.sources.Noach!=='3c55e03dbdbbb935786debe80d6b3e17af27be56fb154381a1d515fd5514f56b' || policy.sources.Lech!==PINS[PROJECTIONS] ||
       policy.notes.length!==116 || rows.length!==Object.keys(s.notes).length)throw Error('Incomplete Breslov reading-note policy');
    rows.forEach(function(q){
      var original=s.notes[q.id], text=original && (original.after===undefined?original.displayText:original.after);
      if(!original || Object.prototype.hasOwnProperty.call(projected,q.id) || q.owner!==original.owner || q.pair_id!==original.pair_id || q.placement!==original.placement ||
         q.sourceTextSHA256!==(original.beforeSHA256===undefined?original.sourceTextSHA256:original.beforeSHA256) ||
         q.projectionSHA256!==(original.afterSHA256===undefined?original.displayTextSHA256:original.afterSHA256) ||
         (q.readerText!==null && (typeof q.readerText!=='string'||!q.readerText)) || (q.readerText===null && q.readerTextSHA256!==null))throw Error('Breslov reading-note binding changed');
      projected[q.id]=q.readerText;
      checks.push(digest(text).then(function(h){if(h!==q.projectionSHA256)throw Error('Breslov original projection changed');}));
      if(q.readerText!==null)checks.push(digest(q.readerText).then(function(h){if(h!==q.readerTextSHA256)throw Error('Breslov reader note changed');}));
    });
    return Promise.all(checks).then(function(){s.readerNotes=projected;s.scope=policy.scopes[portion];return s;});
  }
  // Routing reservations copied from the authenticated delivered indexes. They
  // identify editions, NOT source owners. Keep the reservation when an index is
  // unreadable: .has() must still suppress the displaced legacy OCR branch.
  // Noach/Lech always use their separate 117-disposition policy, never this path.
  var EDITIONS={
    'qualified-1-109':{'bereishit':'בראשית'},
    'qualified-110-171':{'vayeira':'וירא','chayei-sarah':'חיי שרה','toldot':'תולדות','vayeitzei':'ויצא'},
    'qualified-172-269':{'vayishlach':'וישלח','vayeishev':'וישב','mikeitz':'מקץ','vayigash':'ויגש','vayechi':'ויחי'}
  };
  function emptySelection(key) {return {publicNotes:true,key:key,source:{units:[],globalQualifications:[]},scope:'',readerNotes:{},unavailable:[]};}
  function failed(s,edition,error) {
    s.unavailable=s.unavailable||[];
    s.unavailable.push({edition:edition,reason:String(error&&error.message||error)});
    return s;
  }
  function attempt(fn) {return Promise.resolve().then(fn);}
  function guarded(fn,onError) {return attempt(fn).catch(onError);}
  function sourceUnit(u,slug) {
    if(!u||typeof u.id!=='string'||!u.id||u.parsha!==slug||!Array.isArray(u.pairs)||!u.pairs.length||!Array.isArray(u.qualifications))throw Error('Invalid Breslov source owner');
    var pairs=new Set();
    u.pairs.forEach(function(p){if(!p||typeof p.id!=='string'||!p.id||pairs.has(p.id)||typeof p.he!=='string'||!p.he||typeof p.en!=='string'||!p.en)throw Error('Incomplete Breslov pair');pairs.add(p.id);});
    u.qualifications.forEach(function(q){if(!q||typeof q.id!=='string'||!q.id||typeof q.text!=='string'||!q.text||q.owner!==u.id||
      (q.placement!=='after_owner'&&q.placement!=='after_pair')||(q.placement==='after_pair'&&!pairs.has(q.pair_id)))throw Error('Invalid Breslov qualification');});
  }
  function loadQualified(loader) {
    // All I/O stays on the application's existing shared six-request queue.
    return Promise.all(Object.keys(EDITIONS).map(function(namespace){
      var routes=EDITIONS[namespace], result={};
      Object.keys(routes).forEach(function(slug){result[routes[slug]]=emptySelection(slug);});
      return guarded(function(){
        return loader('/data/breslov-parsha/'+namespace+'/index.json?v=parsha-author-20261018-r1').then(function(raw){
          var index=JSON.parse(raw);
          if(!index||index.schema!=='qualified-parsha-three-consumer-index/v1'||!index.parshas||Array.isArray(index.parshas)||
            index.masterUrl!=='/data/breslov-parsha/'+namespace+'/master.json'||typeof index.revision!=='string'||!index.revision)throw Error('Invalid Breslov index');
          // Discover healthy index membership as before. Reservations are only
          // the authenticated fallback when membership itself cannot be read.
          Object.keys(index.parshas).forEach(function(slug){
            if(slug==='noach'||slug==='lech-lecha')return;
            var c=index.parshas[slug];
            if(c&&typeof c.titleHe==='string'&&c.titleHe&&!Object.prototype.hasOwnProperty.call(routes,slug)){
              routes=Object.assign({},routes);routes[slug]=c.titleHe;result[c.titleHe]=emptySelection(slug);
            }
          });
          return loader(index.masterUrl+'?v='+encodeURIComponent(index.revision)).then(function(raw){
            var master=JSON.parse(raw);
            if(!master||master.schema!=='qualified-parsha-public-master/v1'||!Array.isArray(master.units)||
              (master.apparatus!==undefined&&!Array.isArray(master.apparatus))||typeof master.scopeNotice!=='string'||!master.scopeNotice||
              (master.globalQualifications!==undefined&&!Array.isArray(master.globalQualifications)))throw Error('Invalid Breslov master');
            var byId=new Map();
            master.units.concat(master.apparatus||[]).forEach(function(u){if(!u||!u.id||byId.has(u.id))throw Error('Duplicate Breslov source owner');byId.set(u.id,u);});
            (master.globalQualifications||[]).forEach(function(q){if(!q||typeof q.id!=='string'||typeof q.text!=='string'||!q.text)throw Error('Invalid Breslov global qualification');});
            Object.keys(routes).forEach(function(slug){
              var week=routes[slug];
              try {
                var coverage=index.parshas[slug];
                if(!coverage||coverage.titleHe!==week||!Array.isArray(coverage.mainIds)||!Array.isArray(coverage.apparatusIds))throw Error('Invalid Breslov portion coverage');
                var ids=coverage.mainIds.concat(coverage.apparatusIds);
                if(!ids.length||new Set(ids).size!==ids.length)throw Error('Invalid Breslov portion owner set');
                var selected=ids.map(function(id){var u=byId.get(id);sourceUnit(u,slug);return u;});
                selected.forEach(function(u){var owner=mainOwner(u);if(role(u)!=='main'&&owner!=null&&!selected.some(function(m){return m.id===owner&&role(m)==='main';}))throw Error('Invalid Breslov apparatus owner');});
                // Commit only a fully validated portion, never a partial body.
                var s=result[week];s.source.units=selected;s.source.globalQualifications=master.globalQualifications||[];s.scope=master.scopeNotice;
                selected.forEach(function(u){u.qualifications.forEach(function(q){s.readerNotes[q.id]=q.text;});});
              } catch(e) {failed(result[week],namespace,e);}
            });
          });
        });
      },function(e){Object.keys(result).forEach(function(week){failed(result[week],namespace,e);});}).then(function(){return result;});
    })).then(function(rows){
      var result={};
      rows.forEach(function(row,i){Object.keys(row).forEach(function(week){
        var incoming=row[week],prior=result[week];
        if(!prior){result[week]=incoming;return;}
        if(prior.conflict)return;
        try {
          if(prior.key!==incoming.key)throw Error('Conflicting Breslov portion identity');
          var units=new Map(prior.source.units.map(function(u){return [u.id,u];}));
          incoming.source.units.forEach(function(u){if(units.has(u.id)&&JSON.stringify(units.get(u.id))!==JSON.stringify(u))throw Error('Conflicting Breslov source owner');units.set(u.id,u);});
          var globals=new Map(prior.source.globalQualifications.map(function(q){return [q.id,q];}));
          incoming.source.globalQualifications.forEach(function(q){if(globals.has(q.id)&&JSON.stringify(globals.get(q.id))!==JSON.stringify(q))throw Error('Conflicting Breslov qualification');globals.set(q.id,q);});
          prior.source.units=Array.from(units.values());prior.source.globalQualifications=Array.from(globals.values());
          prior.scope=Array.from(new Set([prior.scope,incoming.scope].filter(Boolean))).join('\n\n');
          prior.readerNotes=Object.assign({},prior.readerNotes,incoming.readerNotes);
          prior.unavailable=prior.unavailable.concat(incoming.unavailable);
        } catch(e) {
          // A contradictory identity has no chosen source authority. Block this
          // portion, not unrelated weeks; do not pick the last response to win.
          result[week]=failed(emptySelection(prior.key),Object.keys(EDITIONS)[i],e);
          result[week].conflict=true;
        }
      });});
      return result;
    });
  }
  function load(loader,noach,notes,noachError) {
    if(!pending)pending=attempt(function(){
      // A policy failure invalidates its two editions, not the qualified ones.
      // Observe each promise immediately, including synchronous validation errors.
      var policy=attempt(function(){return read(READING_NOTES,loader);}).then(function(value){return {value:value};},function(error){return {error:error};});
      function old(key,fn) {
        return guarded(function(){return Promise.all([attempt(fn),policy]).then(function(r){if(r[1].error)throw r[1].error;return present(r[0],r[1].value);});},function(e){return failed(emptySelection(key),'reviewed-'+key,e);});
      }
      return Promise.all([
        old('noach',function(){if(noachError)throw noachError;return validate(noach,notes,false);}),
        old('lech-lichuh',function(){return Promise.all([read(LECH,loader),read(PROJECTIONS,loader)]).then(function(r){return validate(r[0],r[1],true);});}),
        loadQualified(loader)
      ]).then(function(r){selections=Object.assign({},r[2],{'נח':r[0],'לך לך':r[1]});return true;});
    });
    return pending;
  }
  function role(u) {return u.sourceKind||u.source_kind||(u.kind==='apparatus'?'note':u.kind);}
  function mainOwner(u) {return u.owner_main_id==null?u.ownerMainId:u.owner_main_id;}
  function has(week) {return !!selections[week];}
  function parsha(week) {return selections[week]&&selections[week].key==='lech-lichuh'?'lech-lecha':selections[week]&&selections[week].key;}
  function languages() { return '<nav class="ck-source-languages" aria-label="Source language">'+[['he','עברית'],['en','English'],['both','Both']].map(function(x){return '<button type="button" data-ck-source-lang="'+x[0]+'" aria-pressed="'+(x[0]==='both')+'">'+x[1]+'</button>';}).join('')+'</nav>'; }
  // Selection/review coverage stays in source metadata, never in study prose.
  // Genuine global meaning qualifications remain visible and source-bound.
  function scope(s) {return (s.source.globalQualifications||[]).map(function(q){var text=globalReadingText(q);if(text===null)return '';return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" dir="ltr" lang="en">'+esc(text)+'</aside>';}).join('');}
// BEGIN source-bound note89/v1 (identical in the three owning adapters)
function note89Binding(units) {
  var b = {"schema":"qualified-note-end-binding/v1","mainId":"b-p146-m01","noteId":"b-p146-n01","parsha":"vayeitzei","verseRef":{"book":"bereishit","chapter":28,"verse":12},"number":"89","position":"end","pair":{"id":"146-body","kind":"body","he":"עִקַּר כָּל הַתִּקּוּנִים הֵם עַל יְדֵי אִתְעָרוּתָא דִּלְתַתָּא, כִּי ה' יִתְבָּרַךְ רוֹצֶה שֶׁדַּיְקָא אֲנַחְנוּ נַעֲבֹד אוֹתוֹ מִזֶּה הָעוֹלָם, וּכְמוֹ שֶׁאָמַר אֲדוֹנֵנוּ מוֹרֵנוּ וְרַבֵּנוּ לְכַמָּה מֵאֲנָשָׁיו, אִם הָיָה הַקָּדוֹשׁ בָּרוּךְ הוּא רוֹצֶה לַעֲבֹד אֶת עַצְמוֹ בְּעַצְמוֹ לֹא הָיָה צָרִיךְ אוֹתְךָ וְכוּ'.","en":"The essential part of all the rectifications is through an awakening from below, for Hashem, blessed be He, wants specifically us to serve Him from this world. And as our master, teacher, and Rebbe said to several of his followers: If the Holy One, blessed be He, wanted to serve Himself by Himself, He would not need you, etc."},"fieldSha256":{"he":"e6ba145bb3be5c33f3382fc306977ff1edf09cf757dabe6661a5c428eb70eb91","en":"af358ad38ed73db3d4eef9fe70ca0b104a35d4df1dfc45bb8a299f6f18b8f415"},"notePairs":[{"id":"89-146-right","kind":"note_body","he":"פט. בחיי מוהר\"ן (סימן ש\"ל): אמר אני יכול לעשות מכלכם צדיקים גמורים נוראים, אבל מה יהיה אם כן יעבוד השם יתברך בעצמו את עצמו (כלומר שרצונו הוא שאנחנו בעצמנו נתיגע בכחו ועצותיו הקדושים להשיג עבודת השם. אבל לא שהוא יתן הכל לגמרי). וכן שמעתי עוד בכמה לשונות שאמר, אני יכול לתן יראה להאדם עד שיצא מחייו ויתבטל במציאות. ופעם אחת בקש מאתו אחד מאנשי שלומנו הרבה בענין זה שיתן לו יראה. (וכמדומה לי הכותב שזה היה ר' שמעון המשמש שלו (מכת\"י)) ודבר עמו רבנו זכרונו לברכה דברים כעין הנ\"ל שבודאי יכול לתן [לו] יראה עצומה רק שאין זה תכלית, כי אם כן יתבטל במציאות. והאיש הנ\"ל היה משתוקק אף על פי כן שיאיר עליו יראה עצומה, ואחר כך יצא האיש מלפניו ונפל עליו יראה עצומה ומפלגת מאד, והתחיל לצעק להשם יתברך בקולות משנות מה שלא","en":"89. In Chayay Moharan (item 330): He said, I can make all of you into awesome, consummate righteous people, but what would happen? In that case Hashem, blessed be He, would serve Himself. (That is, [Rabbainu's] will is that we ourselves exert ourselves through his strength and his holy counsels to attain the service of Hashem, but not that he give everything entirely.) And I also heard in several expressions that he said, I can give a person fear to the point that he departs from his life and is nullified in existence. And once, one of our fellowship begged him greatly concerning this, that he give him fear. (And it seems to me, the writer, that this was Rabbi Shimon, his attendant (from a manuscript).) And Rabbainu, of blessed memory, spoke with him in terms such as those above: that he certainly could give [him] tremendous fear, but that this is not the ultimate purpose, for if so he would be nullified in existence. And that man nevertheless longed for tremendous fear to shine upon him. And afterward the man went out from before him, and tremendous, exceedingly extraordinary fear fell upon him. And he began to cry out to Hashem, blessed be He, in strange cries such as he had never"},{"id":"89-146-left","kind":"note_body","he":"היה רגיל בכך עד שכמעט יצא מחיותו. ונמשך כך עד למחרתו. ולמחרת נכנס אצלו ושאל אותו רבנו זכרונו לברכה אם הגיע אליו יראה, השיב לו האיש הנ\"ל שוב איני רוצה בזה, ובקש מאתו שיקח ממנו זאת וחזר ולקח ממנו ושב לקדמותו. וכן אמר לאחד אם הייתי מעביר ידי על עיניך היית רואה גדולות ונפלאות, אבל איני רוצה בזה, רק שאתה בעצמך תתיגע בעבודת השם עד שתזכה למה שתזכה. וכן אמר לי פעם אחת בענין זה אם היה השם יתברך בעצמו רוצה, שהוא יתברך בעצמו יעבד את עצמו, אם כן לא היה צריך אותך. (כלומר שהצדיק יכול להמשיך רצון השם יתברך שיעוררהו בעבודתו אף על פי שיעשה מה שיעשה וראוי לרחקו אף על פי כן יכול הצדיק לעורר רחמי השם יתברך עליו שיקרבהו לעבודתו אבל לא שהשם יתברך יעשה הכל בעצמו). ע\"כ. ובליקוטי הלכות (דברים הנוהגים בסעודה הלכה ד' אות י\"ד):","en":"been accustomed to, until he almost departed from his vitality. And this continued until the following day. And on the following day he entered his presence, and Rabbainu, of blessed memory, asked him whether fear had reached him. That man answered him, I no longer want this, and begged him to take this away from him. And he again took it away from him, and he returned to his former state. And he also said to one: If I were to pass my hand over your eyes, you would see great and wondrous things, but I do not want this; rather, you yourself should exert yourself in the service of Hashem until you attain what you attain. And he also once said to me concerning this: If Hashem, blessed be He, Himself wanted Himself to serve Himself, then He would not need you. (That is, the righteous person can draw forth the will of Hashem, blessed be He, that He awaken him in His service—even though he does what he does and deserves to be distanced, nevertheless the righteous person can arouse Hashem's mercy upon him, that He draw him near to His service; but not that Hashem do everything Himself.) End of quotation. And in Likutay Halachos (Dvurim HaNoahagim BaS'ooduh [Practices at a Meal], Halacha 4, item 14):"},{"id":"89-147-right","kind":"note_body","he":"ובודאי יש כח ביד הצדיק לטול הבחירה מהאדם ולהחזירו בתשובה, אבל אין זה תיקון מאחר שאינו עושה תשובה בבחירתו. ע\"כ. ועי' בספר בן לאשרי להרה\"ק רבי יצחק הכהן זצ\"ל (סוף חלק ג' בקונטרס \"מקבילות הלולאות\" אות","en":"And certainly the righteous person has the power to take away a person's free choice and bring him back in repentance, but this is not a rectification, since he does not repent by his own choice. End of quotation. And see the book Ben L'Ashray, by the holy Rabbi Yitzchak HaKoahain, of blessed righteous memory (at the end of Part 3, in the booklet \"מקבילות הלולאות\" [Parallel Loops], item"},{"id":"89-147-left","kind":"note_body","he":"א') שכתב בשם האור החיים הק' \"משה רבינו ע\"ה שהיה רבו הפרטי של יהושע, להכלל ישראל היה רב כללי, ועל כן היה כחו של משה רבינו ע\"ה לטול מן יהושע את הבחירה שלא יהיה בעצת מרגלים\" ע\"כ.","en":"1), who wrote in the name of the holy Oar HaChayim: \"Moshe Rabbainu, peace be upon him, who was Yehoshua's personal teacher, was a general teacher for the collective of Israel. And therefore Moshe Rabbainu, peace be upon him, had the power to take away Yehoshua's free choice, so that he would not participate in the counsel of the spies.\" End of quotation."}]};
  if (!Array.isArray(units)) return null;
  var mains = units.filter(function(u) { return u && u.id === b.mainId; });
  var notes = units.filter(function(u) { return u && u.id === b.noteId; });
  if (mains.length !== 1 || notes.length !== 1) return null;
  var main = mains[0], note = notes[0];
  var role = function(u) { return u.sourceKind || u.source_kind || (u.kind === 'apparatus' ? 'note' : u.kind); };
  if (role(main) !== 'main' || role(note) !== 'note' || main.parsha !== b.parsha || note.parsha !== b.parsha ||
      note.owner_main_id !== b.mainId || !main.verseRef || ['book','chapter','verse'].some(function(k) { return main.verseRef[k] !== b.verseRef[k]; }) ||
      !Array.isArray(main.pairs) || !Array.isArray(note.pairs)) return null;
  var pairs = main.pairs.filter(function(p) { return p && p.id === b.pair.id; });
  if (pairs.length !== 1 || ['kind','he','en'].some(function(k) { return pairs[0][k] !== b.pair[k]; }) ||
      note.pairs.length !== b.notePairs.length || note.pairs.some(function(p,i) {
        return !p || ['id','kind','he','en'].some(function(k) { return p[k] !== b.notePairs[i][k]; });
      })) return null;
  // Exact full-field equality is the binding; sourceStatus digests are not trusted.
  return {mainId:b.mainId, noteId:b.noteId, pairId:b.pair.id, number:b.number};
}
function note89Reference(binding, unit, pair, target) {
  if (!binding || unit.id !== binding.mainId || pair.id !== binding.pairId) return '';
  return '<sup data-note89-marker><a data-note89-ref role="doc-noteref" aria-label="Printed note 89" href="#'+target+'">89</a></sup>';
}
function note89Activate(event, rootSelector) {
  var link = event.target && event.target.closest('[data-note89-ref]');
  var root = link && link.closest(rootSelector);
  if (!root) return;
  var id = link.getAttribute('href').slice(1);
  var target = Array.prototype.find.call(root.querySelectorAll('[data-note89-target]'), function(n) { return n.id === id; });
  if (!target) return;
  event.preventDefault();
  for (var p = target; p && p !== root; p = p.parentNode) if (p.tagName && p.tagName.toLowerCase() === 'details') p.open = true;
  var body = target.querySelector('details'); if (body) body.open = true;
  target.focus(); target.scrollIntoView({block:'nearest'});
}
// END source-bound note89/v1

function note89QualificationText(q) {
  if (q.owner === 'b-p146-n01' &&
      ((q.id === 'note89-current-qualification' && q.placement === 'after_owner' && q.pair_id === null) ||
       (q.id === 'note89-source-locator' && q.placement === 'after_pair' && q.pair_id === '89-146-right')) &&
      q.text === "The author confirms note89’s marker at the END of paragraph 146-body, owned by b-p146-m01, ending עַצְמוֹ בְּעַצְמוֹ לֹא הָיָה צָרִיךְ אוֹתְךָ וְכוּ'. The complete note remains an independent apparatus body in its existing order; its association is now established, not uncertain. The author also confirms that note89 prints item330 and the corresponding source is item330; the earlier 333 discrepancy was our transcription/review error, not a printed variant.") return 'Printed note 89 follows the paragraph ending “He would not need you, etc.” Its citation is Chayay Moharan, item 330.';
  return q.text;
}

  document.addEventListener('click', function(event) { note89Activate(event, '.ck-source-island'); });

  function owner(u,s,namespace) {
    var marker = note89Binding(s.source && s.source.units), noteTarget = 'ck-note89-'+s.key+'-'+namespace;
    var label=role(u)==='main'?'Teaching':role(u)==='note'?'Printed note':['title','title-metadata'].indexOf(role(u))>=0?'Source title':['aside','compiler-aside','compiler_aside'].indexOf(role(u))>=0?'Compiler aside':'Printed apparatus';
    var contextual=printedNoteLabels[s.key]&&printedNoteLabels[s.key][u.id];
    if(contextual)label=contextual;
    else {if(u.printedNoteNumber!=null)label+=' '+u.printedNoteNumber;if(u.verseRef)label+=' — Genesis '+u.verseRef.chapter+':'+u.verseRef.verse;}
    var body=u.pairs.map(function(p,i){return '<div class="ck-source-pair" data-pair-id="'+esc(p.id)+'" data-pair-ordinal="'+i+'"><small class="ck-reading-ref" dir="ltr">'+(i+1)+'</small><div class="ck-he" lang="he" dir="rtl">'+(note89Reference(marker,u,p,noteTarget)?'<span data-source-field="he">'+esc(p.he)+'</span>'+note89Reference(marker,u,p,noteTarget):esc(p.he))+'</div><div class="ck-en" lang="en" dir="ltr">'+(note89Reference(marker,u,p,noteTarget)?'<span data-source-field="en">'+esc(p.en)+'</span>'+note89Reference(marker,u,p,noteTarget):esc(p.en))+'</div></div>';}).join('');
    var q=u.qualifications.map(function(q){var text=s.publicNotes?note89QualificationText(q):s.readerNotes[q.id];if(text===null)return '';
      var ordinal=u.pairs.findIndex(function(p){return p.id===q.pair_id;});
      return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" data-note-owner="'+esc(u.id)+'" data-note-pair="'+esc(q.pair_id===null?'null':q.pair_id)+'" data-note-placement="'+esc(q.placement)+'" data-note-display-placement="owner-local" lang="en" dir="ltr">'+(q.placement==='after_pair'?'<small>Paragraph '+(ordinal+1)+':</small> ':'')+'<span data-note-text>'+esc(text)+'</span></aside>';
    }).join('');
    var statuses=u.pairs.map(function(p,i){return ['he','en'].map(function(language){
      var value=p.sourceStatus&&p.sourceStatus[language],status=typeof value==='string'?value:value&&value.status;
      if(!status)return '';
      return '<aside class="ck-source-qualification" data-field-language="'+language+'" data-source-status="'+esc(status)+'" data-note-owner="'+esc(u.id)+'" data-note-pair="'+esc(p.id)+'" dir="ltr">Paragraph '+(i+1)+' · '+(language==='he'?'Hebrew':'English')+' — '+esc(status==='held'||status.indexOf('held-')===0?'unresolved source reading; see qualifications':status.replace(/-/g,' '))+'</aside>';
    }).join('');}).join('');
    return '<article'+(marker && u.id === marker.noteId ? ' id="'+esc(noteTarget)+'" data-note89-target tabindex="-1" role="doc-endnote" aria-label="Printed note 89"' : '')+' class="ck-breslov-owner" data-bop-unit="'+esc(u.id)+'" data-source-kind="'+esc(role(u))+'" data-owner-main-id="'+esc(mainOwner(u)==null?'null':mainOwner(u))+'" data-verse-ref="'+esc(JSON.stringify(u.verseRef))+'"><details class="ck-layer ck-qualified-disclosure" id="ck-bop-'+esc(s.key+'-'+namespace+'-'+u.id)+'"><summary>'+esc(label)+'</summary>'+body+'</details>'+statuses+q+'</article>';
  }
  function mapped(source,slug,chapter,verse) {
    var mains=source.units.filter(function(u){return role(u)==='main' && u.verseRef && u.verseRef.book===slug.replace(/^tanach-/,'') && u.verseRef.chapter===chapter && u.verseRef.verse===verse;});
    return mains.reduce(function(out,m){return out.concat([m],source.units.filter(function(u){return role(u)!=='main' && mainOwner(u)===m.id;}));},[]);
  }
  function verse(week,slug,chapter,verse) {
    var s=selections[week];if(!s)return '';
    var units=mapped(s.source,slug,chapter,verse);if(!units.length)return '';
    return '<details class="ck-layer ck-verse-breslov ck-source-island" data-language="both" data-language-key="breslov-'+s.key+'-inline-'+chapter+'-'+verse+'"><summary>ברסלב לפסוק זה · Breslov on this verse</summary>'+scope(s)+languages()+units.map(function(u){return owner(u,s,'inline-'+chapter+'-'+verse);}).join('')+'</details>';
  }
  function supplement(s) {
    var sup=s.source.sourceSupplement;if(!sup)return '';
    return '<details class="ck-layer ck-breslov-supplement"><summary>מקורות נוספים לשבוע נח · Separate weekly readings</summary><p dir="ltr">These readings are separate from the compiler’s anthology. Genesis 6:8 is the closing verse of Biraishis.</p>'+sup.segments.map(function(x,i){return '<article data-supplement-segment="'+i+'"><h4>'+esc(x.title)+'</h4><a href="'+esc(x.sourceUrl)+'">'+esc(x.sourceRef)+'</a><div class="ck-he" dir="rtl" lang="he">'+esc(x.he)+'</div><div class="ck-en" dir="ltr" lang="en">'+esc(x.en)+'</div>'+(x.commentary?'<aside class="ck-supplement-gematria"><h4>גימטריא · Supplemental gematria</h4><div class="ck-he" dir="rtl">'+esc(x.commentary.he)+'</div><div class="ck-en" dir="ltr">'+esc(x.commentary.en)+'</div></aside>':'')+'</article>';}).join('')+'</details>';
  }
  function availability(week) {
    var s=selections[week];
    return (s&&s.unavailable||[]).map(function(f){return '<aside class="ck-source-qualification" data-breslov-unavailable="'+esc(f.edition)+'" data-source-error="'+esc(f.reason)+'" role="status" lang="en" dir="ltr">Supplementary Breslov source unavailable or could not be verified ('+esc(f.edition)+'). No alternate source text has been substituted.</aside>';}).join('');
  }
  function weekly(week) {
    var s=selections[week||'נח'];if(!s)return '';
    // Individual context panels preserve canonical order even when unowned
    // metadata is interspersed among mapped mains. They never enter verse().
    var bodies=s.source.units.map(function(u){
      var main=role(u)==='main'?u:s.source.units.find(function(m){return role(m)==='main'&&m.id===mainOwner(u);});
      var html=owner(u,s,'weekly');
      return main&&main.verseRef?html:'<details class="ck-layer ck-weekly-unowned"><summary>לימוד שבועי ללא פסוק מסוים · Weekly context without a verse assignment</summary>'+html+'</details>';
    }).join('');
    var pdf=s.source.pdfSource?'<details class="ck-layer ck-facsimile"><summary>תצלום המקור · Source PDF</summary><a href="'+esc(s.source.pdfSource)+'" target="_blank" rel="noopener">Read / open PDF</a> · <a href="'+esc(s.source.pdfSource)+'" download>Download PDF</a></details>':'';
    // Keep failure visible outside the closed source disclosure and independent
    // of language controls. It is a failed edition, never valid source absence.
    var unavailable=availability(week||'נח');
    return '<section class="ck-section" data-sec="breslov" id="ck-breslov-week-'+esc(s.key)+'">'+unavailable+(s.source.units.length?'<details class="ck-layer ck-breslov ck-source-island" data-language="both" data-language-key="breslov-'+esc(s.key)+'-weekly"><summary>ברסלב על הפרשה — '+esc(week||'נח')+' · Breslov on the Parsha</summary>'+scope(s)+languages()+bodies+supplement(s)+pdf+'</details>':'')+'</section>';
  }
  window.ChokVerseBreslov={load:load,verse:verse,weekly:weekly,availability:availability,validate:validate,present:present,mapped:mapped,has:has,parsha:parsha,loadQualified:loadQualified};
})();
