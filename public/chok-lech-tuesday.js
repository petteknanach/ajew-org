/* Private original-source wire successor; no acquisition or English invention. */
(function () {
  'use strict';
  var URL='/reader/chok/lech-tuesday-originals.json', PIN='3d6efe40a023c7f492d0542e1ad7053772bfa163b312f64a5cac61ffa7c7e687', SELECTION='133d663ed252e0420d23e4b9ee5c44163fc31c0d187d7bddec416e19c1220bd4', pending;
  function digest(s) { return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){return Array.from(new Uint8Array(b)).map(function(n){return n.toString(16).padStart(2,'0');}).join('');}); }
  function equal(a,b) { if (!a||!b) return false; var ak=Object.keys(a).sort(),bk=Object.keys(b).sort();return ak.length===bk.length&&ak.every(function(k,i){return k===bk[i]&&a[k]===b[k];}); }
  function schedule(s) {
    if (!s || !equal(s.gemara,{masechet:'יבמות',daf:30,amud:1}) || !equal(s.zohar,{vol:'לך',daf:81,amud:2})) throw Error('Tuesday schedule changed');
  }
  function validate(p) {
    if (!p || p.schema!=='chok-lech-tuesday-originals/v1' || p.key!=='לך לך|יום שלישי' || p.english!==null) throw Error('Tuesday identity changed');
    var g=p.gemaraProposal,z=p.zoharWireSuccessor;
    if (!g || g.schema!=='chok-lech-tuesday-talmud-private/v1' || g.key!==p.key || g.sourceSelectionSHA256!==SELECTION || Object.keys(g.sections).join(',')!=='talmud') throw Error('Tuesday Gemara selection changed');
    var u=g.sections.talmud.units,ids=['tuesday-gemara','tuesday-rashi-7','tuesday-rashi-8','tuesday-rashi-9'], hashes=['92a018b63103c2ca03aca65b88f202a442dfaaf55fa5f281c4cb2d00600e0316','ec2bc177ba4099368181ad2ccd5fcac0337cf954d61a44bb8b9a5ceff7bc73c8','223c0f9ac6e7b22bb9d2889333e5eddfce6fe3bd331fdac216873691683a455f','ac7d6467a1d796719e255fe24cb0c1c333e3d1223f8dde396c5d3824731be83a'];
    if (!Array.isArray(u)||u.length!==4||u.some(function(r,i){return !r||r.id!==ids[i]||r.originalSha256Utf8!==hashes[i]||r.ref!==(i?'Rashi on Yevamot 30a':'Yevamot 30a')||r.role!==(i?'rashi':'gemara')||typeof r.he!=='string'||!r.he||Object.prototype.hasOwnProperty.call(r,'en');})) throw Error('Tuesday prescribed source extent changed');
    if (!z || z.key!==p.key || z.week!=='לך לך'||z.day!=='יום שלישי'||!equal(z.originalRef,{vol:'לך',daf:81,amud:2})||z.fieldRole!=='original-source'||z.disposition!=='SOURCE_RANGE_APPROVED'||z.sourceDisposition!=='SOURCE_RANGE_APPROVED'||!Array.isArray(z.spans)||z.spans.length!==1) throw Error('Tuesday Zohar identity changed');
    var s=z.spans[0];
    if (s.selectedSha256Utf8!=='3891ab6400333b0916aa302df8955012ea4143da30680887f61abc1e1cbb9375'||s.work!=='Zohar'||s.volume!==1||s.daf!==81||s.amud!==2||s.stream!=='main'||s.nativeParagraphIndex!==4||s.ordinal!==0||s.offsetUnit!=='Unicode-codepoint'||s.startOffset!==0||s.endOffsetExclusive!==1106||s.entityPolicy!=='decode'||typeof s.rawText!=='string'||Array.from(s.rawText).length!==1106) throw Error('Tuesday complete paragraph changed');
    return Promise.all(u.map(function(r){return digest(r.he).then(function(h){if(h!==r.originalSha256Utf8)throw Error('Tuesday source body changed');});}).concat([digest(s.rawText).then(function(h){if(h!==s.selectedSha256Utf8||h!==s.paragraphSha256Utf8||h!==z.rawBodySha256Utf8)throw Error('Tuesday Zohar body changed');})])).then(function(){return p;});
  }
  function load(loader) {
    if (pending) return pending;
    pending=Promise.resolve().then(function(){if(typeof loader!=='function')throw Error('Tuesday loader unavailable');return loader(URL+'?v='+PIN);}).then(function(raw){if(typeof raw!=='string')throw Error('Tuesday raw bytes required');return digest(raw).then(function(h){if(h!==PIN)throw Error('Tuesday packet changed');return JSON.parse(raw);});}).then(validate).catch(function(e){pending=null;throw e;});
    return pending;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function original(id,text,hash) {
    if (!window.ChokSources||typeof window.ChokSources.richText!=='function') throw Error('Safe source presentation unavailable');
    return '<article data-reading-unit="'+esc(id)+'" data-source-sha256="'+esc(hash)+'"><div class="ck-untouched-original" data-source-field="he" lang="he" dir="rtl" style="white-space:pre-wrap">'+window.ChokSources.richText(esc(text))+'</div></article>';
  }
  function render(p,section) {
    var html;
    if(section==='talmud'){
      var u=p.gemaraProposal.sections.talmud.units;
      html='<details class="ck-layer ck-talmud" open><summary>גמרא — יבמות ל ע״א</summary>'+original(u[0].id,u[0].he,u[0].originalSha256Utf8)+'</details>';
      html+='<details class="ck-layer ck-gemara-rashi" data-reading-role="prescribed-rashi" open><summary>רש״י — יבמות ל ע״א</summary>'+u.slice(1).map(function(r){return original(r.id,r.he,r.originalSha256Utf8);}).join('')+'</details>';
    }else{
      var z=p.zoharWireSuccessor;
      html='<details class="ck-layer ck-zohar" open><summary>זוהר חלק א — פא ע״ב</summary>'+original('tuesday-zohar-1-81b-p4',z.spans[0].rawText,z.rawBodySha256Utf8)+'</details>';
    }
    return '<div data-qualified-daily="lech-tuesday" data-daily-section="'+section+'">'+html+'</div>';
  }
  function reading(week,day,section,english,loader,scheduled) {
    if (week!=='לך לך'||day!=='יום שלישי'||['talmud','zohar'].indexOf(section)<0) return Promise.resolve(null);
    return Promise.resolve().then(function(){schedule(scheduled);return load(loader);}).then(function(p){return render(p,section);});
  }
  window.ChokLechTuesday={reading:reading};
})();
