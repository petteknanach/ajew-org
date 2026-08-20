#!/usr/bin/env python3
"""Build remote sharded reader search for website + Android app.

Outputs:
  public/reader-search/meta.json                 lightweight id/title/path catalog
  public/reader-search/shards/<prefix>.json      word -> [doc ids]
  public/reader-search/docs/<id>.json            full searchable text for result snippets/verification
"""
import gzip, json, re, shutil, struct, unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public' / 'data'
OUT = ROOT / 'public' / 'reader-search'
SHARDS = OUT / 'shards'
DOCS = OUT / 'docs'
PHRASES = OUT / 'phrases'
NIKUD_RE = re.compile(r'[\u0591-\u05C7]')
COMBINING_RE = re.compile(r'[\u0300-\u036f]')
PUNCT_RE = re.compile(r'[^\w\s\u0590-\u05ff]+', re.UNICODE)
SPACE_RE = re.compile(r'\s+')
HE_KEYS = ('he', 'he_nikud', 'verse', 'commentary_he', 'text_he', 'hebrew', 'hebrew_text')
EN_KEYS = ('en', 'commentary_en', 'text_en', 'english', 'translation')
LAYER_KEYS = ('beginner', 'intermediate', 'scholarly')
HEBREW_NUMERALS = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100,
    'ר': 200, 'ש': 300, 'ת': 400,
}


def normalize(text: str) -> str:
    text = unicodedata.normalize('NFD', (text or '').lower())
    text = NIKUD_RE.sub('', text)
    text = COMBINING_RE.sub('', text)
    text = text.replace('״', '').replace('׳', '').replace('"', '').replace("'", '')
    text = PUNCT_RE.sub(' ', text)
    return SPACE_RE.sub(' ', text).strip()


def words(text: str):
    for w in normalize(text).split():
        if len(w) > 1 or re.search(r'[\u05d0-\u05ea]', w):
            yield w


def load_gz(name: str):
    with gzip.open(DATA / name, 'rt', encoding='utf-8') as f:
        return json.load(f)


def add(term_map, term, item_id):
    if term:
        term_map[term[:1] or '_'][term].append(item_id)


def phrase_hash(text: str) -> int:
    """FNV-1a 32-bit, mirrored by the browser search client.

    Hash collisions are harmless because exact-mode document verification still
    checks the normalized phrase before displaying a result.
    """
    value = 0x811C9DC5
    for byte in text.encode('utf-8'):
        value ^= byte
        value = (value * 0x01000193) & 0xFFFFFFFF
    return value


def clean_text(*parts):
    return SPACE_RE.sub(' ', ' '.join(p or '' for p in parts)).strip()


def segment_language_text(seg, keys, hebrew=False):
    """Mirror build-light-search-index.py's per-segment extraction order."""
    parts = []
    def add(value):
        if isinstance(value, str) and value.strip():
            parts.append(NIKUD_RE.sub('', value.strip()) if hebrew else value.strip())
    for key in keys:
        add(seg.get(key))
    layers = seg.get('layers') or {}
    if isinstance(layers, dict):
        for level in LAYER_KEYS:
            layer = layers.get(level) or {}
            if isinstance(layer, dict):
                for key in keys:
                    add(layer.get(key))
    for level in LAYER_KEYS:
        layer = seg.get(level)
        if isinstance(layer, dict):
            for key in keys:
                add(layer.get(key))
        elif isinstance(layer, str) and not hebrew:
            add(layer)
    return clean_text(*parts)


def hebrew_section_number(text):
    token = (text or '').strip().split(' ', 1)[0].replace('״', '').replace('׳', '').replace('"', '').replace("'", '')
    if not token or len(token) > 4 or any(ch not in HEBREW_NUMERALS for ch in token):
        return None
    return sum(HEBREW_NUMERALS[ch] for ch in token)


def segment_map(raw_link):
    """Return compact [DOM index, logical section, HE start/end, EN start/end]."""
    source = ROOT / 'public' / f"{raw_link.strip('/')}.json"
    if not source.exists():
        return []
    try:
        data = json.loads(source.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return []
    segments = data.get('segments') or []
    if not isinstance(segments, list):
        return []
    rows, he_cursor, en_cursor, section = [], 0, 0, 0
    for position, seg in enumerate(segments, 1):
        if not isinstance(seg, dict):
            continue
        he_seg = segment_language_text(seg, HE_KEYS, hebrew=True)
        en_seg = segment_language_text(seg, EN_KEYS, hebrew=False)
        en_match = re.match(r'^\s*(\d{1,3})\s*[.\-:)]', en_seg)
        candidate = int(en_match.group(1)) if en_match else hebrew_section_number(he_seg)
        if candidate and ((section == 0 and candidate == 1) or candidate in (section, section + 1)):
            section = candidate
        dom_index = seg.get('index') or position
        rows.append([dom_index, section or dom_index, he_cursor, he_cursor + len(he_seg), en_cursor, en_cursor + len(en_seg)])
        if he_seg: he_cursor += len(he_seg) + 1
        if en_seg: en_cursor += len(en_seg) + 1
    return rows


def canonical_reader_link(link: str) -> str:
    parts = (link or '').strip('/').split('/')
    if len(parts) < 3 or parts[0] != 'reader':
        return link
    book = parts[1]
    def clean_part(s):
        return re.sub(r'^part-', '', s)
    def clean_torah(s):
        return re.sub(r'^(torah|topic|section|sicha|chapter)-', '', s)
    # Complete Saba tape transcripts live under a storage-only ``tapes``
    # directory, while their public Reader routes are /1/37-b, etc.
    if book == 'saba-tape-transcripts' and len(parts) == 4 and parts[2] == 'tapes':
        match = re.fullmatch(r'tape-0*(\d+)-([ab])', parts[3])
        if match:
            return f'/reader/{book}/1/{int(match.group(1))}-{match.group(2)}'
    # Chayey Moharan simanim are stored under ``simanim/siman-N.json`` but
    # their canonical public Reader route is singular: ``/siman/N``.
    if book == 'chayey-moharan' and len(parts) == 4 and parts[2] == 'simanim':
        match = re.fullmatch(r'siman-(\d+)', parts[3])
        if match:
            return f'/reader/{book}/siman/{int(match.group(1))}'
    if len(parts) == 4:
        return f'/reader/{book}/{clean_part(parts[2])}/{clean_torah(parts[3])}'
    if len(parts) == 3:
        return f'/reader/{book}/1/{clean_torah(parts[2])}'
    return link


def main():
    he = load_gz('light-search-index-he.json.gz')
    en = load_gz('light-search-index-en.json.gz')
    by_link = {}
    for doc in he:
        by_link[doc.get('l','')] = {'he': doc, 'en': None}
    for doc in en:
        link = doc.get('l','')
        by_link.setdefault(link, {'he': None, 'en': None})['en'] = doc

    if OUT.exists(): shutil.rmtree(OUT)
    SHARDS.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    PHRASES.mkdir(parents=True, exist_ok=True)

    # Exact phrase lookup uses compact binary bigram postings. Each record is
    # <uint32 hash, uint32 document id>, sharded by the high hash byte. This
    # avoids fetching hundreds or thousands of full documents merely to find a
    # consecutive phrase while keeping the static-site architecture.
    phrase_tmp = OUT / '.phrase-tmp'
    phrase_tmp.mkdir(parents=True, exist_ok=True)
    phrase_handles = {}

    items = []
    shard_terms = defaultdict(lambda: defaultdict(list))
    for raw_link in sorted(k for k in by_link if k):
        link = canonical_reader_link(raw_link)
        hd = by_link[raw_link].get('he') or {}
        ed = by_link[raw_link].get('en') or {}
        title = (hd.get('t') or ed.get('t') or '').strip()
        hebrew = (hd.get('h') or ed.get('h') or title).strip()
        book = (hd.get('b') or ed.get('b') or '').strip()
        he_text = clean_text(hd.get('x',''))
        en_text = clean_text(ed.get('x','') or hd.get('e','') or ed.get('e',''))
        text = clean_text(title, hebrew, book, he_text, en_text)
        item_id = len(items)
        items.append({'t': title, 'h': hebrew, 'c': book, 'p': link, 'a': normalize(f'{title} {hebrew} {book}')[:500]})
        normalized = normalize(text)
        location_map = hd.get('m') if isinstance(hd.get('m'), list) else segment_map(raw_link)
        with open(DOCS / f'{item_id}.json', 'w', encoding='utf-8') as f:
            json.dump({'id': item_id, 't': title, 'h': hebrew, 'c': book, 'p': link, 'he': he_text, 'en': en_text, 'n': normalized, 'm': location_map}, f, ensure_ascii=False, separators=(',', ':'))
        for term in set(words(text)):
            add(shard_terms, term, item_id)
            add(shard_terms, 'e:' + ''.join(reversed(term)), item_id)

        tokens = normalized.split()
        # A phrase repeated many times in one document still needs one posting.
        # Buffer each document by bucket to avoid millions of tiny writes.
        phrase_values = defaultdict(list)
        for value in {phrase_hash(a + ' ' + b) for a, b in zip(tokens, tokens[1:])}:
            phrase_values[value >> 24].append(value)
        for bucket, values in phrase_values.items():
            handle = phrase_handles.get(bucket)
            if handle is None:
                handle = open(phrase_tmp / f'{bucket:02x}.bin', 'ab')
                phrase_handles[bucket] = handle
            handle.write(b''.join(struct.pack('<II', value, item_id) for value in values))

    for handle in phrase_handles.values():
        handle.close()

    term_count = 0
    for prefix, term_map in sorted(shard_terms.items()):
        with open(SHARDS / f'{prefix}.json', 'w', encoding='utf-8') as f:
            json.dump({k: v for k, v in sorted(term_map.items())}, f, ensure_ascii=False, separators=(',', ':'))
        term_count += len(term_map)

    phrase_records = 0
    phrase_shards = []
    max_phrase_shard_bytes = 0
    for bucket in range(256):
        tmp = phrase_tmp / f'{bucket:02x}.bin'
        raw = tmp.read_bytes() if tmp.exists() else b''
        records = sorted(set(struct.iter_unpack('<II', raw)))
        out_path = PHRASES / f'{bucket:02x}.bin'
        with open(out_path, 'wb') as f:
            for value, item_id in records:
                f.write(struct.pack('<II', value, item_id))
        size = out_path.stat().st_size
        max_phrase_shard_bytes = max(max_phrase_shard_bytes, size)
        phrase_records += len(records)
        phrase_shards.append({'key': f'{bucket:02x}', 'records': len(records), 'bytes': size})
    shutil.rmtree(phrase_tmp)
    with open(PHRASES / 'meta.json', 'w', encoding='utf-8') as f:
        json.dump({
            'version': 1,
            'algorithm': 'fnv1a32-utf8-bigram-le',
            'recordBytes': 8,
            'records': phrase_records,
            'maxShardBytes': max_phrase_shard_bytes,
            'shards': phrase_shards,
        }, f, separators=(',', ':'))

    meta = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'total': len(items), 'failures': 0, 'items': items}
    with open(OUT / 'meta.json', 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))
    print(json.dumps({'items': len(items), 'terms': term_count, 'shards': len(shard_terms), 'docs': len(items), 'phrase_records': phrase_records, 'max_phrase_shard_bytes': max_phrase_shard_bytes, 'meta_bytes': (OUT/'meta.json').stat().st_size, 'out': str(OUT)}, ensure_ascii=False, indent=2))

if __name__ == '__main__': main()
