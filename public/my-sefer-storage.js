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
    var seen = new Set(imported), added = 0;
    for (var entry of legacy.sections) {
      if (!entry || typeof entry !== 'object' || typeof entry.content !== 'string' || typeof entry.title !== 'string' || typeof entry.source !== 'string') throw new Error('Invalid legacy passage');
      // Include all fields: identical timestamps must not discard distinct saves.
      var bytes = new TextEncoder().encode(JSON.stringify([entry.id,entry.source,entry.title,entry.content,entry.addedAt]));
      var hash = await root.crypto.subtle.digest('SHA-256', bytes);
      var key = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
      if (seen.has(key)) continue;
      collection.passages.push({
        _legacyKey:key, ref:entry.title, refHe:'', he:'', en:'',
        savedText:entry.content, readerUrl:safeReaderUrl(entry.source,origin),
        legacySource:entry.source, addedAt:entry.addedAt || '', note:'',tag:''
      });
      seen.add(key);added++;
    }
    if (added) {
      collection.legacyImportedKeys = Array.from(seen);
      collection.updatedAt = Date.now();
      // Cryptographic digests are asynchronous; don't overwrite another tab.
      if (storage.getItem('mySefer') !== before || storage.getItem('ajew-my-sefer') !== legacyRaw) throw new Error('Collection changed in another tab; reload');
      storage.setItem('mySefer', JSON.stringify(collection));
    }
    return collection;
  }
  root.AjewSeferStorage = {loadAndMigrate:loadAndMigrate,safeReaderUrl:safeReaderUrl};
})(globalThis);
