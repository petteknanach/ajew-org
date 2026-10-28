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
    // Authorized metadata backfill invalidates only its old compact representation.
    if (Object.prototype.hasOwnProperty.call(passage, PACK)) delete passage[PACK];
    return true;
  }

  // A compact passage remains a self-contained historical snapshot. It never
  // fetches current text, changes legacy storage or evicts another passage.
  var PACK = '_qualifiedSourcePackedV1';
  var MAX_PAYLOAD = 33554432;
  var packedCache = new Map();
  function own(o,k) { return Object.prototype.hasOwnProperty.call(o,k); }

  function internPayload(payload) {
    var strings=[], index=new Map();
    function enc(value) {
      if (typeof value==='string' && value.length>=64) {
        var i=index.get(value);
        if (i===undefined) { i=strings.length;strings.push(value);index.set(value,i); }
        return ['s',i];
      }
      if (Array.isArray(value)) return ['a',value.map(enc)];
      if (value!==null && typeof value==='object') return ['o',Object.keys(value).map(k=>[k,enc(value[k])])];
      if (value===null || ['string','boolean'].includes(typeof value) || (typeof value==='number' && Number.isFinite(value))) return ['v',value];
      throw new Error('Unsupported saved source value');
    }
    var value=enc(payload);
    return {format:'typed-string-bank-v1',strings:strings,value:value};
  }
  function restorePayload(bank) {
    if (!bank || typeof bank!=='object' || Array.isArray(bank) || Object.keys(bank).sort().join(',')!=='format,strings,value' ||
        bank.format!=='typed-string-bank-v1' || !Array.isArray(bank.strings) || bank.strings.some(s=>typeof s!=='string') || new Set(bank.strings).size!==bank.strings.length) {
      throw new Error('Malformed saved source string bank');
    }
    function dec(node) {
      if (!Array.isArray(node) || node.length!==2) throw new Error('Malformed saved source node');
      var kind=node[0],value=node[1];
      if (kind==='s') {
        if (!Number.isSafeInteger(value) || value<0 || value>=bank.strings.length) throw new Error('Invalid saved source string reference');
        return bank.strings[value];
      }
      if (kind==='v') {
        if (value===null || ['string','boolean'].includes(typeof value) || (typeof value==='number' && Number.isFinite(value))) return value;
        throw new Error('Invalid saved source scalar');
      }
      if (kind==='a' && Array.isArray(value)) return value.map(dec);
      if (kind==='o' && Array.isArray(value)) {
        var object={}, keys=new Set();
        for (var pair of value) {
          if (!Array.isArray(pair) || pair.length!==2 || typeof pair[0]!=='string' || keys.has(pair[0])) throw new Error('Invalid saved source object');
          keys.add(pair[0]);Object.defineProperty(object,pair[0],{value:dec(pair[1]),enumerable:true,writable:true,configurable:true});
        }
        return object;
      }
      throw new Error('Unknown saved source node');
    }
    return dec(bank.value);
  }

  function frameKey(frame) {
    if (!frame || typeof frame !== 'object' || Array.isArray(frame) ||
        Object.keys(frame).sort().join(',') !== 'bytes,codec,data,sha256,version' ||
        frame.version !== 1 || !['gzip-json','gzip-json-interned'].includes(frame.codec) ||
        !Number.isSafeInteger(frame.bytes) || frame.bytes < 1 || frame.bytes > MAX_PAYLOAD ||
        typeof frame.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(frame.sha256) ||
        typeof frame.data !== 'string' || frame.data.length > 16777216) {
      throw new Error('Unsupported compact saved source');
    }
    return JSON.stringify(frame);
  }
  function hex(bytes) { return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join(''); }
  function b64(bytes) {
    var s='';
    for (var i=0;i<bytes.length;i+=32768) s+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return root.btoa(s);
  }
  function unb64(s) {
    var decoded=root.atob(s);
    if (root.btoa(decoded)!==s) throw new Error('Malformed compact source encoding');
    return Uint8Array.from(decoded, c=>c.charCodeAt(0));
  }
  async function streamBytes(stream, limit) {
    var reader=stream.getReader(), chunks=[], total=0;
    try {
      while (true) {
        var part=await reader.read();
        if (part.done) break;
        total+=part.value.byteLength;
        if (total>limit) throw new Error('Compact source expansion refused');
        chunks.push(part.value);
      }
    } catch (error) {
      try { await reader.cancel(error); } catch (_) {}
      throw error;
    } finally { reader.releaseLock(); }
    var bytes=new Uint8Array(total), offset=0;
    for (var chunk of chunks) { bytes.set(chunk,offset);offset+=chunk.byteLength; }
    return bytes;
  }
  function remember(frame,payload) {
    if (!payload || typeof payload!=='object' || Array.isArray(payload) ||
        typeof payload.savedText!=='string' || Object.keys(payload).some(k=>!['savedText','qualifiedFullBody'].includes(k))) {
      throw new Error('Malformed compact saved payload');
    }
    var key=frameKey(frame), hasSnapshot=own(payload,'qualifiedFullBody');
    packedCache.set(key,{savedText:payload.savedText,hasSnapshot:hasSnapshot,
      snapshot:hasSnapshot?JSON.stringify(payload.qualifiedFullBody):null});
    return key;
  }
  function expandedPassage(passage) {
    if (!passage || typeof passage!=='object' || Array.isArray(passage) || !own(passage,PACK)) return passage;
    var cached=packedCache.get(frameKey(passage[PACK]));
    if (!cached) throw new Error('Compact source requires verified reload');
    if (own(passage,'savedText') && passage.savedText!==cached.savedText) throw new Error('Saved source text changed');
    if (own(passage,'qualifiedFullBody') && (!cached.hasSnapshot || JSON.stringify(passage.qualifiedFullBody)!==cached.snapshot)) {
      throw new Error('Saved source metadata changed');
    }
    passage.savedText=cached.savedText;
    if (cached.hasSnapshot) passage.qualifiedFullBody=JSON.parse(cached.snapshot);
    return passage;
  }
  async function unpackPassage(passage) {
    if (!passage || typeof passage!=='object' || Array.isArray(passage) || !own(passage,PACK)) return passage;
    var frame=passage[PACK], key=frameKey(frame);
    if (!packedCache.has(key)) {
      if (typeof root.DecompressionStream!=='function') throw new Error('Compact-source decoding unavailable');
      var raw=await streamBytes(new root.Blob([unb64(frame.data)]).stream().pipeThrough(new root.DecompressionStream('gzip')),frame.bytes);
      if (raw.byteLength!==frame.bytes || hex(await root.crypto.subtle.digest('SHA-256',raw))!==frame.sha256) {
        throw new Error('Compact saved source checksum failed');
      }
      var decoded=JSON.parse(new root.TextDecoder('utf-8',{fatal:true}).decode(raw));
      remember(frame,frame.codec==='gzip-json-interned'?restorePayload(decoded):decoded);
    }
    return expandedPassage(passage);
  }
  async function packPassage(passage) {
    if (own(passage,PACK)) { expandedPassage(passage);return; }
    var payload={savedText:passage.savedText};
    if (own(passage,'qualifiedFullBody')) payload.qualifiedFullBody=passage.qualifiedFullBody;
    var raw=new root.TextEncoder().encode(JSON.stringify(internPayload(payload)));
    if (raw.byteLength>MAX_PAYLOAD || typeof root.CompressionStream!=='function') throw new Error('Compact-source encoding unavailable');
    var compressed=await streamBytes(new root.Blob([raw]).stream().pipeThrough(new root.CompressionStream('gzip')),MAX_PAYLOAD);
    var frame={version:1,codec:'gzip-json-interned',bytes:raw.byteLength,sha256:hex(await root.crypto.subtle.digest('SHA-256',raw)),data:b64(compressed)};
    remember(frame,payload);passage[PACK]=frame;
  }
  function parseCurrent(raw) {
    var collection=parse(raw,{name:'',passages:[],createdAt:Date.now(),updatedAt:Date.now()},'passages');
    collection.passages.forEach(expandedPassage);
    return collection;
  }
  function serialize(collection) {
    if (!collection || typeof collection!=='object' || !Array.isArray(collection.passages)) throw new Error('Invalid saved collection');
    var passages=collection.passages.map(p=>{
      if (!own(p,PACK)) return p;
      expandedPassage(p);
      var compact={...p};delete compact.savedText;delete compact.qualifiedFullBody;
      return compact;
    });
    return JSON.stringify({...collection,passages:passages});
  }
  function quotaFailure(error) { return error && (error.name==='QuotaExceededError' || error.code===22 || error.code===1014); }

  async function loadAndMigrate(storage, origin) {
    var before = storage.getItem('mySefer');
    var legacyRaw = storage.getItem('ajew-my-sefer');
    var collection = parse(before, {name:'',passages:[],createdAt:Date.now(),updatedAt:Date.now()}, 'passages');
    for (var compactPassage of collection.passages) await unpackPassage(compactPassage);
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
      var next=serialize(collection);
      try { storage.setItem('mySefer',next); }
      catch (error) {
        if (!quotaFailure(error)) throw error;
        if (storage.getItem('mySefer')!==before || storage.getItem('ajew-my-sefer')!==legacyRaw) throw new Error('Collection changed in another tab; reload');
        var compacted=0;
        for (var passage of collection.passages) {
          if (typeof passage._legacyKey==='string' && typeof passage.savedText==='string' && passage.savedText.length>65536 && !own(passage,PACK)) {
            await packPassage(passage);compacted++;
          }
        }
        if (!compacted) throw error;
        if (storage.getItem('mySefer')!==before || storage.getItem('ajew-my-sefer')!==legacyRaw) throw new Error('Collection changed in another tab; reload');
        next=serialize(collection);storage.setItem('mySefer',next);
      }
      if (storage.getItem('mySefer')!==next) throw new Error('Save verification failed');
    }
    return collection;
  }
  root.AjewSeferStorage = {loadAndMigrate:loadAndMigrate,safeReaderUrl:safeReaderUrl,serialize:serialize,parseCurrent:parseCurrent};
})(globalThis);
