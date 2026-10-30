'use strict';
// Exact presentation-only inverse. Historical assertions and data pins are not relabelled.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {restoreProject}=require('./chok-project-credit-conservation.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const DELTA={
  "public/chok.js": {
    "baseSHA256": "db1000b76a48b28be93a9586f3e00ca44efb04c938530daac6cbe94ff78d9f9f",
    "candidateSHA256": "1d9b9535983182e3bedf50f6dadb65135d44d0bd9e729eba32b946ce003617d8",
    "inverse": [
      {
        "candidate": "        }\n      });\n    });\n  }\n  function consolidateSourceCredits(root, destination) {\n    // Only the two explicit legal-credit carriers are relocated. Meaning,\n    // safety, recension and uncertainty notes are never classified by text.\n    var panels = Array.prototype.slice.call(root.querySelectorAll('.ck-source-credits'));\n    if (!panels.length) return;\n    if (!destination) {\n      var panel = document.createElement('section');\n      panel.className = 'ck-source-credits';\n      var heading = document.createElement('h2');\n      heading.textContent = 'מקורות וקרדיטים · Sources and credits';\n      panel.appendChild(heading);\n      destination = document.createElement('div');\n      panel.appendChild(destination);\n      root.appendChild(panel);\n    }\n    var seen = new Map();\n    function retain(entry, binding) {\n      // Exact rendered notice equality only: different editions, URLs,\n      // changes and reuse conditions remain distinct entries.\n      var key = entry.innerHTML, prior = seen.get(key);\n      if (!prior) {\n        prior = {element: entry, bindings: []};\n        seen.set(key, prior);\n        destination.appendChild(entry);\n      }\n      prior.bindings.push(binding);\n      prior.element.setAttribute('data-source-credit-bindings', JSON.stringify(prior.bindings));\n    }\n    panels.forEach(function (panel) {\n      var children = Array.prototype.slice.call(panel.children).filter(function (n) { return n.tagName.toLowerCase() !== 'summary'; });\n      var owner = panel.getAttribute('data-other-credit-owner');\n      if (owner !== null && children.length % 3 === 0 && children.every(function (n) { return n.tagName.toLowerCase() === 'p'; })) {\n        // ChokOtherLayers owns one title/licence, URI and changes triple per credit.\n        for (var i = 0; i < children.length; i += 3) {\n          var entry = document.createElement('div');\n          children.slice(i, i + 3).forEach(function (n) { entry.appendChild(n); });\n          retain(entry, {owner: owner, creditIndex: i / 3});\n        }\n      } else {\n        children.forEach(function (entry) {\n          retain(entry, {owner: entry.getAttribute('data-note-owner'), note: entry.getAttribute('data-daily-note'), role: entry.getAttribute('data-field-role')});\n        });\n      }\n      panel.remove();\n    });\n  }\n",
        "base": "        }\n      });\n    });\n  }\n"
      },
      {
        "candidate": "        box.innerHTML = parts.join('') || '<p class=\"ck-error\">Nothing to show.</p>';\n        presentPrimaryStudy(box);\n        var creditDestination = $('ck-reading-credits');\n        if (creditDestination) creditDestination.innerHTML = '';\n        consolidateSourceCredits(box, creditDestination);\n        box.setAttribute('data-language', state.language);\n        var root=box.closest('.ck-wrap');root.setAttribute('data-language',state.language);\n",
        "base": "        box.innerHTML = parts.join('') || '<p class=\"ck-error\">Nothing to show.</p>';\n        presentPrimaryStudy(box);\n        box.setAttribute('data-language', state.language);\n        var root=box.closest('.ck-wrap');root.setAttribute('data-language',state.language);\n"
      }
    ]
  },
  "src/pages/reader/chok.astro": {
    "baseSHA256": "4a75efd1cbdfa112cb3b63a854148aceeeaddd3b348fb67102e7edd71b748511",
    "candidateSHA256": "6ac95c590059ce4aa811387371a28b4b2747b617302c0da28ac05858951466ef",
    "inverse": [
      {
        "candidate": "    <footer class=\"ck-foot\" dir=\"ltr\">\n      <p><a href=\"/reader/tikkun/\">שנים מקרא ואחד תרגום · Shnayim Mikra</a></p>\n      <section id=\"ck-sources-and-credits\" class=\"ck-source-credits\" aria-labelledby=\"ck-sources-heading\">\n      <h2 id=\"ck-sources-heading\">מקורות וקרדיטים · Sources and credits</h2>\n      <div id=\"ck-reading-credits\"></div>\n      <p><a href=\"/tikkun/qatan-sources.html\">MAM qatan supplement — Hebrew Wikisource · CC BY-SA 4.0 · sources and changes</a></p>\n      <details id=\"ck-noach-legal\" class=\"ck-noach-legal\"><summary>Noach Bartenura — source and reuse conditions</summary><p>Selected English translations and source-dependent study notes only. Source: תורת אמת; TextSource: ר' פנחס ראובן שליט''א. In-house English and bilingual study notes. No endorsement is implied.</p><p>Noncommercial free educational Chok Reader use; attribution, same-or-similar share-alike for adaptations and communication of conditions. Retained Creative Commons 2.5 notice; port, jurisdiction and release date unidentified. No commercial or original-pointing/reprint clearance is asserted.</p><p><a href=\"/reader/chok/noach-bartenura-conditions.html\">Complete applicable retained conditions and permission evidence</a></p></details>\n",
        "base": "    <footer class=\"ck-foot\" dir=\"ltr\">\n      <p><a href=\"/reader/tikkun/\">שנים מקרא ואחד תרגום · Shnayim Mikra</a></p>\n      <p><a href=\"/tikkun/qatan-sources.html\">MAM qatan supplement — Hebrew Wikisource · CC BY-SA 4.0 · sources and changes</a></p>\n      <details id=\"ck-noach-legal\" class=\"ck-noach-legal\"><summary>Noach Bartenura — source and reuse conditions</summary><p>Selected English translations and source-dependent study notes only. Source: תורת אמת; TextSource: ר' פנחס ראובן שליט''א. In-house English and bilingual study notes. No endorsement is implied.</p><p>Noncommercial free educational Chok Reader use; attribution, same-or-similar share-alike for adaptations and communication of conditions. Retained Creative Commons 2.5 notice; port, jurisdiction and release date unidentified. No commercial or original-pointing/reprint clearance is asserted.</p><p><a href=\"/reader/chok/noach-bartenura-conditions.html\">Complete applicable retained conditions and permission evidence</a></p></details>\n"
      },
      {
        "candidate": "תודה מיוחדת מקרב לב למזכה הרבים הגדול ר&#x27; פנחס ראובן שליט&quot;א שבזכותו מאגר זה רואה אור שבאהבת השם הגדולה שלו ובאהבת ישראל הגדולה וברוחב לבו התיר לנו להכניס למאגר זה את כל ספרי הקודש שיש לו זכויות יוצרים עליהם !!! השם יברכהו בכל ברוחניות ובגשמיות וימלא כל משאלות לבו לטובה לעבודתו יתברך.\n</pre></div>\n      </section>\n    </footer>\n  </div>\n",
        "base": "תודה מיוחדת מקרב לב למזכה הרבים הגדול ר&#x27; פנחס ראובן שליט&quot;א שבזכותו מאגר זה רואה אור שבאהבת השם הגדולה שלו ובאהבת ישראל הגדולה וברוחב לבו התיר לנו להכניס למאגר זה את כל ספרי הקודש שיש לו זכויות יוצרים עליהם !!! השם יברכהו בכל ברוחניות ובגשמיות וימלא כל משאלות לבו לטובה לעבודתו יתברך.\n</pre></div>\n    </footer>\n  </div>\n"
      },
      {
        "candidate": "<script is:inline src=\"/chok-other-layers.js?v=08cadff0fdba47823afa318720f053bbd1f70e0f2a6943ad632963e3de4febe6\" integrity=\"sha256-CMrf8P26R4I6+jGHIPBTu9H3Dg8qaUOtYylj495P6+Y=\" crossorigin=\"anonymous\" defer></script>\n<script is:inline src=\"/chok-noach-english.js?v=2e4862f7114ff71f6683e689ecce6e6f6b741fc77b920c232da794b03836068f\" integrity=\"sha256-Lkhi9xFP9x9mg+aJ7M5ub2t0H8d7kgwjLaeUsDg2Bo8=\" crossorigin=\"anonymous\" defer></script>\n<script is:inline src=\"/chok.js?v=1d9b9535983182e3bedf50f6dadb65135d44d0bd9e729eba32b946ce003617d8\" integrity=\"sha256-HZuVNZgxguO+31D22ttlE11E0L2ecp66MrlGzgA2F9g=\" crossorigin=\"anonymous\" defer></script>\n\n<style is:global>\n",
        "base": "<script is:inline src=\"/chok-other-layers.js?v=08cadff0fdba47823afa318720f053bbd1f70e0f2a6943ad632963e3de4febe6\" integrity=\"sha256-CMrf8P26R4I6+jGHIPBTu9H3Dg8qaUOtYylj495P6+Y=\" crossorigin=\"anonymous\" defer></script>\n<script is:inline src=\"/chok-noach-english.js?v=2e4862f7114ff71f6683e689ecce6e6f6b741fc77b920c232da794b03836068f\" integrity=\"sha256-Lkhi9xFP9x9mg+aJ7M5ub2t0H8d7kgwjLaeUsDg2Bo8=\" crossorigin=\"anonymous\" defer></script>\n<script is:inline src=\"/chok.js?v=db1000b76a48b28be93a9586f3e00ca44efb04c938530daac6cbe94ff78d9f9f\" integrity=\"sha256-2xAAt2pIsovpOpWG8+AMpE77BMk4Uw2qxsvpT/eNn58=\" crossorigin=\"anonymous\" defer></script>\n\n<style is:global>\n"
      }
    ]
  }
};
function restoreExact(relative, bytes){
 const delta=DELTA[relative];if(!delta)return bytes;
 if(sha(bytes)===delta.baseSHA256)return bytes;
 bytes=restoreProject(relative,bytes);
 assert.equal(sha(bytes),delta.candidateSHA256,'ATTRIBUTION_CANDIDATE_PIN:'+relative);
 let text=bytes.toString('utf8');
 for(const op of delta.inverse){assert.equal(text.split(op.candidate).length,2,'EXACT_INVERSE_MEMBERSHIP:'+relative);text=text.replace(op.candidate,op.base);}
 const restored=Buffer.from(text);assert.equal(sha(restored),delta.baseSHA256,'ATTRIBUTION_EXACT_INVERSE:'+relative);return restored;
}
function historicalSource(root,relative){return restoreExact(relative,fs.readFileSync(path.join(root,relative)));}
module.exports={DELTA,restoreExact,historicalSource};
if(require.main===module){for(const relative of Object.keys(DELTA)){const bytes=restoreProject(relative,fs.readFileSync(path.join(__dirname,'..',relative)));assert.equal(sha(bytes),DELTA[relative].candidateSHA256);assert.equal(sha(restoreExact(relative,bytes)),DELTA[relative].baseSHA256);assert.throws(()=>restoreExact(relative,Buffer.concat([bytes,Buffer.from(' ')])),/(?:ATTRIBUTION|PROJECT)_CANDIDATE_PIN/);assert.throws(()=>restoreExact(relative,Buffer.from(bytes.toString().replace('Chok','ChangedChok'))),/(?:ATTRIBUTION|PROJECT)_CANDIDATE_PIN/);}console.log(JSON.stringify({exactInverseFiles:Object.keys(DELTA),outsideDeltaControlsRejected:4,historicalAssertionsPreserved:true}));}
