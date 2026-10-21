/* Scoped selected-owner Bible English. Provenance and source-use decisions are private.
 * Uses only the caller's queued raw loader; original/English/qualifications are byte bound. */
(function () {
 'use strict';
 var DATA_PIN="dccecf062d41d2bd0eebe34cd7ceacc5a040dbbad296da427a1c722fef77fcc3", OWNER_PIN="d7e7332754f9a7ed8532ac2d2a7c36553891f1057bfa6b165aac1c6a2102a825", WEEKS=["בראשית","נח","לך לך","וירא","חיי שרה","תולדות","ויצא","וישלח","וישב","מקץ","ויגש","ויחי"], SOURCE_PINS={"tanach-amos":"066f840cbc9d0e72a57ec70e9ce22067bc987c85e768b014e3e9f0cd7f22f487","tanach-bereishit":"0c0ad1e69d4ee25860c2180477ef9dd0ccb598b216d4a10b7a70d8fe883d9608","tanach-hoshea":"694c820dd623170570ceb742a07d54687b2b855da7b4b7cadeb4d1051d0e1c86","tanach-malachi":"002fe83ae3b50a7cd777418041d9a8bc31c404695b87ed831fac2ea466ded2bc","tanach-melachim-a":"3563e5711cd9fd4c8033cb47c207c7fadd9a7e5b576e507a5fd395c02c9b0abc","tanach-melachim-b":"b9e271a5b92277ad1b3585f1693647f0468947e3a707b082c509080f531d681f","tanach-mishlei":"12104a7a343fdf75a0bee0bb502f5c818c9a04cf53b8c32b62eb98e5df9fb2b6","tanach-ovadya":"ca34eb4ad0728ae5306d1244c4e20cc735854ea03e4d5179800a86b7c2f8768c","tanach-yechezkel":"ed1f5590688be6f16d91886dd8254da3c90515464799d355713b044c002a504c","tanach-yeshayahu":"55af3c185febf9001de261cc93e5ed92ab1290513fbd04f3df65976d1b6e1695","tanach-yonah":"6f7631b320020bc2c14474df652ce9bfa9f9febaca37bf6a9825c0505c93d5b6"}, NECESSARY={"tanach-hoshea|12:12":"42b580d40792cf8466100561d6e31b2f482e04cf11d1e8543de8cc3bad052957","tanach-mishlei|8:16":"8cdc851326d0b7f3272475e392ef1537f6c8870d786980b915576005a51c8b90","tanach-yechezkel|38:7":"d22dd507cd53ca66e254388dfdfa275973d297d922aa86934585003a9d0ce1ff"};
 var pending;
 function need(ok,s) { if (!ok) throw Error('Scheduled Bible: '+s); }
 function hash(text) { return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2,'0'); }).join(''); }); }
 function esc(x) { return String(x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
 function supports(week,slug) { return WEEKS.indexOf(week)>=0 && Object.prototype.hasOwnProperty.call(SOURCE_PINS,slug); }
 function load(rawLoader) {
  if (!pending) pending=rawLoader('/reader/chok/scheduled-bible-english.json?v='+DATA_PIN).then(function(raw) {
   return hash(raw).then(function(h) {
    need(h===DATA_PIN,'carrier checksum'); var data=JSON.parse(raw),keys=Object.keys(data.rows||{}).sort();
    need(data.schema==='scheduled-bible-english/v1' && JSON.stringify(data.weeks)===JSON.stringify(WEEKS) && keys.length===1774,'carrier scope');
    return hash(JSON.stringify(keys)).then(function(h) {
     need(h===OWNER_PIN,'selected owner set');
     return Promise.all(keys.map(function(key) {
      var r=data.rows[key];need(typeof r.en==='string' && r.en.length && Array.isArray(r.notes) && Array.isArray(r.apparatus),'complete fields');
      need(Object.keys(r).sort().join() === 'apparatus,effectiveEntrySHA256,en,englishSHA256,notes,originalSHA256','audience fields');
      need(/^[a-f0-9]{64}$/.test(r.originalSHA256) && /^[a-f0-9]{64}$/.test(r.effectiveEntrySHA256),'original identity');
      r.apparatus.forEach(function(n){need(Object.keys(n).sort().join()==='id,text' && typeof n.id==='string' && typeof n.text==='string','apparatus projection');});
      return Promise.all([hash(r.en),hash(JSON.stringify(r.notes))]).then(function(hs) {
       need(hs[0]===r.englishSHA256,'English binding');
       if (Object.prototype.hasOwnProperty.call(NECESSARY,key)) need(hs[1]===NECESSARY[key] && r.notes.length>0,'mandatory note missing/changed');
       else need(r.notes.length===0,'foreign mandatory note');
       r.notes.forEach(function(n) { need(n.ownerKey===key && n.originalSHA256===r.originalSHA256 && n.mandatoryLocalMeaningQualification===true && n.he && n.en,'mandatory note owner'); });
      });
     })).then(function(){return data;});
    });
   });
  }).catch(function(e){pending=null;throw e;});
  return pending;
 }
 function prepare(week,day,slug,book,rawLoader) {
  if (!supports(week,slug)) return Promise.resolve(null);
  need(typeof day==='string' && day.length>0 && typeof rawLoader==='function','captured context');
  return Promise.all([load(rawLoader),hash(JSON.stringify(book))]).then(function(res) {
   var data=res[0];need(res[1]===SOURCE_PINS[slug],'effective source book');
   var checks=Object.keys(data.rows).filter(function(k){return k.indexOf(slug+'|')===0;}).map(function(k){
    var r=data.rows[k],p=k.split('|')[1].split(':'),e=book.ch[p[0]] && book.ch[p[0]][p[1]];need(e && Array.isArray(e.t),'source owner');
    var original=e.t.join(' ');
    return Promise.all([hash(original),hash(JSON.stringify(e))]).then(function(hs){
     need(hs[0]===r.originalSHA256 && hs[1]===r.effectiveEntrySHA256,'source entry binding');
     r.notes.forEach(function(n){var s=n.spanUnicodeCodepoints;need(Array.isArray(s)&&s.length===2&&s.every(Number.isSafeInteger)&&s[0]>=0&&s[1]>s[0]&&Array.from(original).slice(s[0],s[1]).join('')===n.anchor,'qualification anchor');});
    });
   });
   return Promise.all(checks).then(function(){return {rows:data.rows,slug:slug,week:week,day:day,book:book};});
  });
 }
 function render(data,ref,original,custom,enabled) {
  // An existing source object wins even when its English is explicitly null.
  if (custom!==null && custom!==undefined) return null;
  var key=data.slug+'|'+ref,r=data.rows[key];if(!r)return null;
  var p=ref.split(':');need(original && Array.isArray(original.t) && JSON.stringify(original)===JSON.stringify(data.book.ch[p[0]][p[1]]),'render original');
  var notes=r.notes.map(function(n){return '<aside class="ck-source-qualification ck-bible-meaning" data-bible-qualification-owner="'+esc(key)+'" data-note-id="'+esc(n.id)+'" data-original-sha256="'+esc(n.originalSHA256)+'" data-source-span="'+esc(JSON.stringify(n.spanUnicodeCodepoints))+'"><p lang="he" dir="rtl">'+esc(n.he)+'</p><p lang="en" dir="ltr">'+esc(n.en)+'</p></aside>';}).join('');
  if(!enabled)return notes;
  var body='<div class="ck-en-line" lang="en" dir="ltr" data-bible-english-owner="'+esc(key)+'">'+esc(r.en)+'</div>';
  if(r.apparatus.length)body+='<details class="ck-layer ck-bible-translation-notes" data-bible-note-owner="'+esc(key)+'"><summary>הערות לתרגום · Translation notes</summary>'+r.apparatus.map(function(n){return '<p lang="en" dir="ltr" data-apparatus-id="'+esc(n.id)+'">'+esc(n.text)+'</p>';}).join('')+'</details>';
  return body+notes;
 }
 window.ChokScheduledBible={supports:supports,prepare:prepare,render:render};
})();
