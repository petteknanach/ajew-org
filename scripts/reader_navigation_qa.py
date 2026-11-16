"""Definitions-only QA inverses for authenticated, reviewed export successors.

Never writes outputs, invokes a producer, or imports its projection helpers.
Authenticate the complete actual bodies and independent source projection FIRST;
then expose exact predecessor bytes to the inherited conservation predicates.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / 'scripts/fixtures/reader-navigation-historical-inverse.json'
BANK_SHA256 = 'b91d66e4bb1f6e0d98c4d1f8e61fd61980e2868aaf483851cee7345c50db1d3a'
PRODUCER_SHA256 = '53706de26a3627c5258835dfb363864cf217d47a26a4297e8adc1f1016703d81'
HELPER_SHA256 = 'da4dcb39af22834ed6aa716c7acedc4c4ca3fef4d372eb56422f45580d72d652'
FORMATS = ('index.json', 'index.txt', 'index.md', 'index.html')
DOCUMENT_FIELDS = ('author', 'hebrewAuthor', 'license', 'source', 'sourceRef', 'notes', 'sourceNotes', 'methodology', 'layerAvailability', 'superReaderCoverageNote')


def require(value, message):
    if not value:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def exact(left, right):
    """Type- AND dictionary/list-order-sensitive source equality; no sorting."""
    return json.dumps(left, ensure_ascii=False) == json.dumps(right, ensure_ascii=False)


def authority():
    raw = BANK.read_bytes()
    require(sha(raw) == BANK_SHA256, 'navigation inverse authority bytes')
    bank = json.loads(raw)
    require(sha((ROOT / 'scripts/build-reader-plain-text.py').read_bytes()) == PRODUCER_SHA256, 'navigation actual producer bytes')
    require(sha((ROOT / 'scripts/reader_export_repairs.py').read_bytes()) == HELPER_SHA256, 'navigation actual helper bytes')
    require(bank['producer']['afterSHA256'] == PRODUCER_SHA256 and bank['helperSHA256'] == HELPER_SHA256, 'navigation authority anchors')
    return bank


def inverse(current, declaration):
    require(len(current) == declaration['afterBytes'] and sha(current) == declaration['afterSHA256'], 'navigation complete after body')
    restored = current
    previous = len(current) + 1
    for edit in reversed(declaration['edits']):
        at = edit['afterOffset']
        new, old = edit['after'].encode(), edit['before'].encode()
        require(type(at) is int and 0 <= at < previous and at + len(new) <= previous, 'navigation inverse edit interval')
        require(restored[at:at + len(new)] == new, 'navigation inverse exact edit body')
        restored = restored[:at] + old + restored[at + len(new):]
        previous = at
    require(len(restored) == declaration['beforeBytes'] and sha(restored) == declaration['beforeSHA256'], 'navigation complete predecessor body')
    return restored


def historical_producer_bytes(current):
    """Whole literal current producer -> whole authentic 2e producer, not AST pruning."""
    return inverse(current, authority()['producer'])


def source_apparatus(label, value):
    """Independent explicit source-tree walk, no candidate block-generation oracle."""
    if isinstance(value, dict):
        result = []
        for key in value:
            result += source_apparatus(label + ' — ' + key, value[key])
        return result
    if isinstance(value, list):
        result = []
        for position, item in enumerate(value, 1):
            result += source_apparatus(label + ' ' + str(position), item)
        return result
    if value is None or value == '':
        return []
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    language = 'he' if any('\u0590' <= c <= '\u05ff' for c in str(value)) else 'en'
    return [[label, language, text]]


def authenticate_source_projection(source_bytes, actual, relative, declaration):
    require(len(source_bytes) == declaration['sourceBytes'] and sha(source_bytes) == declaration['sourceSHA256'], 'navigation complete genuine source')
    source = json.loads(source_bytes)
    raw = json.loads(actual['index.json'])
    require(raw.get('schema') == 'reader-plain-source-projection-v1', 'navigation projection schema')
    require(raw.get('sourceFile') == '/reader/' + relative, 'navigation physical source filename')
    require(exact([raw.get(k) for k in ('bookId', 'part', 'torah')], declaration['actualIdentity']), 'navigation physical output owner')
    require(raw.get('plainUrl') == declaration['actualPlainUrl'], 'navigation physical output URL')
    metadata = {k: v for k, v in source.items() if k != 'segments'}
    require(exact(raw.get('sourceMetadata'), metadata), 'navigation complete original metadata')
    originals, emitted = source['segments'], raw.get('segments')
    require(isinstance(emitted, list) and len(emitted) == len(originals), 'navigation original record cardinality')
    for position, (original, current) in enumerate(zip(originals, emitted, strict=True), 1):
        require(exact(current.get('sourceSegment'), original), 'navigation complete original record')
        he, en = original.get('he_nikud') or original.get('he') or '', original.get('en') or ''
        blocks = []
        for lang, text in [('he', he), ('en', en)]:
            if text:
                blocks.append(['Source text', lang, text])
        if original.get('he_nikud') and original.get('he') and original['he'] != original['he_nikud']:
            blocks.append(['Original Hebrew', 'he', original['he']])
        for field, value in original.items():
            if field not in ('index', 'he', 'he_nikud', 'en'):
                blocks.extend(source_apparatus(field, value))
        expected = {'index': original.get('index') or position, 'he': he, 'en': en,
                    'sourceIndex': original.get('index'), 'sourcePosition': position,
                    'sourceSegment': original, 'blocks': blocks}
        require(exact(current, expected), 'navigation literal projection/position/index/notes/references')
    document = []
    for field in DOCUMENT_FIELDS:
        if field in source:
            document.extend(source_apparatus(field, source[field]))
    require(exact(raw.get('documentBlocks'), document), 'navigation complete document apparatus')
    require(list(raw) == ['bookId', 'part', 'torah', 'title', 'hebrewTitle', 'sourceUrl', 'plainUrl', 'segments', 'schema', 'documentBlocks', 'sourceFile', 'sourceMetadata'], 'navigation complete projection field schema')


def historical_output_views(relative, source_bytes, actual):
    """All four actual complete outputs remain on disk unchanged.

    Nonselected historical controls pass through byte-identically. Six explicit
    selected source controls join reviewed CLI pins before exact inversion.
    """
    bank = authority()
    require(set(actual) == set(FORMATS), 'navigation complete actual format domain')
    if relative not in bank['controls']:
        return dict(actual)
    declaration = bank['controls'][relative]
    # Pin every complete body before inspecting fields or discarding anything.
    for name in FORMATS:
        pin = declaration['outputs'][name]
        require(len(actual[name]) == pin['afterBytes'] and sha(actual[name]) == pin['afterSHA256'], 'navigation actual complete output: ' + name)
    authenticate_source_projection(source_bytes, actual, relative, declaration)
    return {name: inverse(actual[name], declaration['outputs'][name]) for name in FORMATS}
