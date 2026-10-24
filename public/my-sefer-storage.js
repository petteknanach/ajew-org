/* Non-destructive bridge between Reader saves and the personal anthology.
 * Never infer a language split or replace the untouched legacy collection.
 */
(function(root) {
  'use strict';
  function safeReaderUrl(value, origin) {
    if (typeof value !== 'string' || !value || value.trim() !== value) return '';
    try {
      var url = new URL(value, origin);
      if (![origin, 'https://ajew.org', 'https://www.ajew.org'].includes(url.origin) || !url.pathname.startsWith('/reader/')) return '';
      return value;
    } catch (_) { return ''; }
  }
  function parse(raw, fallback, field) {
    var data = raw === null ? fallback : JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data[field])) throw new Error('Invalid saved collection');
    return data;
  }
  function sameJSONValue(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && a.length !== b.length) return false;
    var keys = Object.keys(a), other = Object.keys(b);
    return keys.length === other.length && keys.every(k => Object.prototype.hasOwnProperty.call(b, k) && sameJSONValue(a[k], b[k]));
  }
  function preserveQualifiedSource(passage, entry) {
    if (!Object.prototype.hasOwnProperty.call(entry, 'qualifiedFullBody')) return false;
    if (Object.prototype.hasOwnProperty.call(passage, 'qualifiedFullBody')) {
      if (!sameJSONValue(passage.qualifiedFullBody, entry.qualifiedFullBody)) throw new Error('Saved source metadata conflicts; neither collection was changed');
      return false;
    }
    // Copy the self-contained historical snapshot, never reconstruct from today's text.
    passage.qualifiedFullBody = JSON.parse(JSON.stringify(entry.qualifiedFullBody));
    return true;
  }
  async function loadAndMigrate(storage, origin) {
    var before = storage.getItem('mySefer');
    var legacyRaw = storage.getItem('ajew-my-sefer');
    var collection = parse(before, {name:'',passages:[],createdAt:Date.now(),updatedAt:Date.now()}, 'passages');
    if (!collection.passages.every(p => p && typeof p === 'object' && !Array.isArray(p) &&
      ['ref','refHe','he','en','savedText','note','tag','readerUrl'].every(k => p[k] == null || typeof p[k] === 'string'))) throw new Error('Invalid saved passage');
    if (legacyRaw === null) return collection;
    var legacy = parse(legacyRaw, {sections:[]}, 'sections');
    var imported = collection.legacyImportedKeys || [];
    if (!Array.isArray(imported) || !imported.every(k => typeof k === 'string')) throw new Error('Invalid migration receipt');
    var seen = new Set(imported), added = 0, recovered = 0;
    for (var entry of legacy.sections) {
      if (!entry || typeof entry !== 'object' || typeof entry.content !== 'string' || typeof entry.title !== 'string' || typeof entry.source !== 'string') throw new Error('Invalid legacy passage');
      // Preserve the historical five-field identity; snapshots travel independently.
      var bytes = new TextEncoder().encode(JSON.stringify([entry.id,entry.source,entry.title,entry.content,entry.addedAt]));
      var hash = await root.crypto.subtle.digest('SHA-256', bytes);
      var key = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
      if (seen.has(key)) {
        if (!Object.prototype.hasOwnProperty.call(entry, 'qualifiedFullBody')) continue;
        var matches = collection.passages.filter(p => p._legacyKey === key);
        if (matches.length > 1) throw new Error('Ambiguous saved source identity; neither collection was changed');
        var prior = matches[0];
        if (prior && prior.savedText === entry.content && prior.legacySource === entry.source && preserveQualifiedSource(prior, entry)) recovered++;
        continue;
      }
      var passage = {
        _legacyKey:key, ref:entry.title, refHe:'', he:'', en:'',
        savedText:entry.content, readerUrl:safeReaderUrl(entry.source,origin),
        legacySource:entry.source, addedAt:entry.addedAt || '', note:'',tag:''
      };
      preserveQualifiedSource(passage, entry);
      collection.passages.push(passage);
      seen.add(key);added++;
    }
    if (added || recovered) {
      if (added) collection.legacyImportedKeys = Array.from(seen);
      collection.updatedAt = Date.now();
      // Cryptographic digests are asynchronous; don't overwrite another tab.
      if (storage.getItem('mySefer') !== before || storage.getItem('ajew-my-sefer') !== legacyRaw) throw new Error('Collection changed in another tab; reload');
      storage.setItem('mySefer', JSON.stringify(collection));
    }
    return collection;
  }
  root.AjewSeferStorage = {loadAndMigrate:loadAndMigrate,safeReaderUrl:safeReaderUrl};
})(globalThis);
