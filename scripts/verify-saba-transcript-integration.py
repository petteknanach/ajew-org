#!/usr/bin/env python3
"""Verify every available Saba transcript is complete in all search artifacts."""
import gzip, json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / 'public' / 'reader'
DATA = ROOT / 'public' / 'data'
SEARCH = ROOT / 'public' / 'reader-search'
SOURCES = [
    ('sichos-chayay-saba', READER / 'sichos-chayay-saba', 'section-*.json', re.compile(r'section-(\d+)$')),
    ('saba-tape-transcripts', READER / 'saba-tape-transcripts' / 'tapes', 'tape-*.json', re.compile(r'tape-0*(\d+)-([ab])$')),
]
failures = []


def fail(message): failures.append(message)
def normalize(text):
    text = unicodedata.normalize('NFD', str(text or '').lower())
    text = re.sub(r'[\u0591-\u05C7\u0300-\u036f]', '', text)
    text = text.replace('״', '').replace('׳', '').replace('"', '').replace("'", '')
    text = re.sub(r'[^\w\s\u0590-\u05ff]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()
def load_gz(name):
    with gzip.open(DATA / name, 'rt', encoding='utf-8') as handle: return json.load(handle)
def source_slug(path, pattern):
    match = pattern.search(path.stem)
    if not match: raise ValueError(path)
    return f'{int(match.group(1))}-{match.group(2)}' if len(match.groups()) == 2 else str(int(match.group(1)))
def raw_and_canonical(collection, source, slug):
    if collection == 'saba-tape-transcripts':
        return f'/reader/{collection}/tapes/{source.stem}', f'/reader/{collection}/1/{slug}'
    return f'/reader/{collection}/{source.stem}', f'/reader/{collection}/1/{slug}'

he_index = {row.get('l'): row for row in load_gz('light-search-index-he.json.gz')}
en_index = {row.get('l'): row for row in load_gz('light-search-index-en.json.gz')}
meta = json.loads((SEARCH / 'meta.json').read_text(encoding='utf-8'))
meta_by_path = {row.get('p'): (idx, row) for idx, row in enumerate(meta.get('items', []))}
topics = json.loads((READER / 'saba-transcript-topics.json').read_text(encoding='utf-8'))
topic_docs = {(row['collection'], str(row['number'])): row for row in topics.get('documents', [])}
source_keys = set()
counts = {'sichos-chayay-saba': 0, 'saba-tape-transcripts': 0, 'bilingual': 0, 'he': 0, 'en': 0}

for collection, folder, pattern, slug_pattern in SOURCES:
    files = list(folder.glob(pattern))
    counts[collection] = len(files)
    for source in files:
        slug = source_slug(source, slug_pattern)
        source_keys.add((collection, slug))
        data = json.loads(source.read_text(encoding='utf-8'))
        segments = [seg for seg in data.get('segments', []) if isinstance(seg, dict)]
        expected_he = '\n\n'.join((seg.get('he') or '').strip() for seg in segments if (seg.get('he') or '').strip())
        expected_en = '\n\n'.join((seg.get('en') or '').strip() for seg in segments if (seg.get('en') or '').strip())
        counts['he'] += bool(expected_he); counts['en'] += bool(expected_en); counts['bilingual'] += bool(expected_he and expected_en)
        raw_path, canonical_path = raw_and_canonical(collection, source, slug)

        # Empty, explicitly missing sides have no searchable text and are expected
        # to be omitted by the builders; every side with text must be fully present.
        if expected_he or expected_en:
            he_doc = he_index.get(raw_path); en_doc = en_index.get(raw_path)
            if not he_doc: fail(f'{source.name}: missing from Hebrew light index')
            elif normalize(he_doc.get('x')) != normalize(expected_he): fail(f'{source.name}: Hebrew light index is incomplete')
            if not en_doc: fail(f'{source.name}: missing from English light index')
            elif normalize(en_doc.get('x')) != normalize(expected_en): fail(f'{source.name}: English light index is incomplete')

            found = meta_by_path.get(canonical_path)
            if not found: fail(f'{source.name}: missing/wrong URL in sharded search ({canonical_path})')
            else:
                doc_id, _ = found
                doc_path = SEARCH / 'docs' / f'{doc_id}.json'
                if not doc_path.exists(): fail(f'{source.name}: sharded search document is missing')
                else:
                    doc = json.loads(doc_path.read_text(encoding='utf-8'))
                    if normalize(doc.get('he')) != normalize(expected_he): fail(f'{source.name}: sharded Hebrew is incomplete')
                    if normalize(doc.get('en')) != normalize(expected_en): fail(f'{source.name}: sharded English is incomplete')
                    if len(doc.get('m') or []) != len(segments): fail(f'{source.name}: segment-deep search map is incomplete')

        topic_doc = topic_docs.get((collection, slug))
        if not topic_doc: fail(f'{source.name}: absent from transcript topic directory')
        else:
            if bool(expected_he) != bool(topic_doc.get('hasHebrew')): fail(f'{source.name}: topic Hebrew flag is wrong')
            if bool(expected_en) != bool(topic_doc.get('hasEnglish')): fail(f'{source.name}: topic English flag is wrong')

if set(topic_docs) != source_keys: fail(f'topic document set differs from sources: sources={len(source_keys)}, topics={len(topic_docs)}')
for topic in topics.get('topics', []):
    entries = topic.get('entries', [])
    if not entries: fail(f"topic {topic.get('id')} has no entries")
    if topic.get('count') != len(entries): fail(f"topic {topic.get('id')} count is wrong")
    for entry in entries:
        key = (entry.get('collection'), str(entry.get('number')))
        if key not in source_keys: fail(f"topic {topic.get('id')} links unknown transcript {key}")
        if not re.search(r'#seg-[\w-]+$', entry.get('url', '')): fail(f"topic {topic.get('id')} lacks a segment-deep link")

stats = topics.get('stats', {})
expected = {'documents': 251, 'he': 249, 'en': 245, 'bilingual': 245, 'topics': 18}
for key, value in expected.items():
    if stats.get(key) != value: fail(f'topic stats {key}: expected {value}, got {stats.get(key)}')
if counts['sichos-chayay-saba'] != 17 or counts['saba-tape-transcripts'] != 234:
    fail(f"source inventory changed: Sichos={counts['sichos-chayay-saba']}, tape sides={counts['saba-tape-transcripts']}")

if failures:
    print('Saba transcript integration verification failed:', file=sys.stderr)
    for message in failures: print(f' - {message}', file=sys.stderr)
    raise SystemExit(1)
print('Saba transcript integration passed: 251 transcript documents; 249 Hebrew, 245 English, 245 bilingual; 18 topics; full light + sharded search coverage with canonical Reader links.')
