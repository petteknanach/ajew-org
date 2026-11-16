/* Chok-only presentation. Never mutate source packets, references or kavanos. */
(function (host) {
  'use strict';
  var marks = '[\\u0591-\\u05bd\\u05bf-\\u05c2\\u05c4\\u05c5\\u05c7\\u034f]*';
  var names = new RegExp('(^|[^א-ת\\u0591-\\u05c7\\u034f])((?:[ובכלמש]' + marks + '){0,3})(י(' + marks + ')ה(' + marks + ')ו(' + marks + ')ה(' + marks + '))(?![א-ת])', 'g');
  function nameInsertions(text) {
    var at = [];
    text.replace(names, function (whole, boundary, prefix, name, yod, he, vav, last, offset) {
      function vowels(s) { return s.replace(/[^\u05b0-\u05bc\u05c7]/g, ''); }
      // Ordinary Adonai and Elohim-qere patterns remain distinct. Unpointed,
      // fully pointed and nonstandard/kavana arrangements are not completed.
      if (/[\u05b9\u05ba]/.test(name) || !/^(?:\u05b0|\u05b1)?$/.test(vowels(yod)) || vowels(he) || !/^[\u05b8\u05b4]$/.test(vowels(vav)) || vowels(last)) return whole;
      at.push(offset + boundary.length + prefix.length + 1 + yod.length + 1);
      return whole;
    });
    return at;
  }
  function pointedName(text) {
    var at = nameInsertions(text);
    for (var i = at.length - 1; i >= 0; i--) text = text.slice(0, at[i]) + '\u05b9' + text.slice(at[i]);
    return text;
  }
  function referenceHTML(ref) {
    function esc(s) { return s.replace(/[&<>]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
    return '<bdi class="ck-generated-ref" dir="ltr">' + esc(ref).replace(/[א-ת]+|[0-9]+/g, function (n) { return '<bdi dir="' + (/[א-ת]/.test(n) ? 'rtl' : 'ltr') + '">' + n + '</bdi>'; }) + '</bdi>';
  }
  function mishnaReferences(root) {
    root.querySelectorAll('[data-sec="mishna"], [data-sec="bonus"]').forEach(function (section) {
      section.querySelectorAll('h3,h4,.ck-mnum,.ck-reading-ref').forEach(function (node) {
        // Generated owner labels only, not source bodies, questions or quotations.
        if (node.querySelector('.ck-generated-ref') || node.children.length || !node.firstChild || node.firstChild.nodeType !== 3) return;
        var parent = node.parentElement;
        if (!node.classList.contains('ck-mnum') && !node.classList.contains('ck-reading-ref') && !parent.hasAttribute('data-mishna-owner') && !parent.hasAttribute('data-reading-unit')) return;
        var s = node.textContent.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ''), match = /([א-ת]+|[0-9]+):([א-ת]+|[0-9]+)(?:[–-]([א-ת]+|[0-9]+)(?::([א-ת]+|[0-9]+))?)?\s*$/.exec(s);
        if (!match) return;
        var text = node.firstChild;
        text.data = s.slice(0, match.index);
        var holder = node.ownerDocument.createElement('span'); holder.innerHTML = referenceHTML(match[0].trim());
        while (holder.firstChild) node.appendChild(holder.firstChild);
      });
    });
  }
  function readingNames(root, language) {
    if (language === 'original') return;
    var nodes = [], text = '';
    function flush() {
      var at = nameInsertions(text);
      for (var i = at.length - 1; i >= 0; i--) {
        for (var j = nodes.length - 1; j >= 0; j--) if (at[i] > nodes[j].start && at[i] <= nodes[j].end) {
          var n = nodes[j], offset = at[i] - n.start;
          n.node.data = n.node.data.slice(0, offset) + '\u05b9' + n.node.data.slice(offset); break;
        }
      }
      nodes = []; text = '';
    }
    function walk(node) {
      if (node.nodeType === 3) { nodes.push({node:node,start:text.length,end:text.length + node.data.length}); text += node.data; return; }
      if (node.nodeType !== 1) return;
      if (node.matches('.ck-kavana,.ck-kavana-para,.ck-kav-para,.ck-native-group,[data-kavana-category],[data-daily-field="untouched"],script,style,textarea')) { flush(); return; }
      var block = /^(DIV|P|SECTION|ARTICLE|DETAILS|SUMMARY|H[1-6]|BR|LI|ASIDE|HEADER|BUTTON)$/.test(node.tagName);
      if (block) flush();
      Array.prototype.forEach.call(node.childNodes, walk);
      if (block) flush();
    }
    walk(root); flush();
  }
  function apply(root, language) { mishnaReferences(root); readingNames(root, language); }
  host.ChokDisplay = Object.freeze({pointedName:pointedName, referenceHTML:referenceHTML, apply:apply});
})(typeof window === 'undefined' ? globalThis : window);
