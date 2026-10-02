"""Bounded, reversible metadata repair. Does not import or modify the classifier.

The pinned ledger is an application of existing user gold, NOT a lexicon.
Only the listed whole-verse identities are accepted, in their exact before or
complete after state. No normalization, partial upgrades, qere transfer or
unrelated-mark refresh is permitted. Failure leaves the caller's object intact.
"""
from copy import deepcopy
import hashlib
import json
from pathlib import Path

LEDGER_SHA256 = '107277684f4fd249dccbfc5bff2db9e82f6194f3a965a45b30034bbed90e218c'
LEDGER_PATH = Path(__file__).parent / 'data/psalms-qatan-ledger.json'


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(',', ':')).encode('utf-8')


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'duplicate JSON key: {key}')
        result[key] = value
    return result


def load_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'),
                      object_pairs_hook=unique_object)


def load_ledger():
    ledger = load_json(LEDGER_PATH)
    validate_ledger(ledger)
    return ledger


def validate_ledger(ledger):
    if digest(ledger) != LEDGER_SHA256:
        raise ValueError('Psalms qatan ledger/fixture/witness hash mismatch')
    entries = ledger['entries']
    identities = {(e['book'], e['chapter'], e['verse'], e['token_index'],
                   e['letter_index']) for e in entries}
    if len(entries) != 29 or len(identities) != 29:
        raise ValueError('duplicate or missing approved qatan target')


def _repair(book, chapter, verse, row, entries, reverse):
    hits = [e for e in entries if (e['book'], e['chapter'], e['verse']) ==
            (book, chapter, verse)]
    if not hits:
        return deepcopy(row)
    if len(hits) != 1:
        raise ValueError('duplicate approved verse')
    e = hits[0]
    fields = {k: v for k, v in row.items() if k != 'm'}
    if fields != e['source_fields'] or digest(fields) != e['source_sha256']:
        raise ValueError(f'Psalms {chapter}:{verse}: whole-verse source drift')
    ti, li = e['token_index'], e['letter_index']
    token = row['t'][ti]
    if token != e['source_token'] or row['k'][ti] != 0:
        raise ValueError('wrong token or qere target')
    pos = e['qamats_codepoint_offset']
    if token[pos] != '\u05b8' or sum('\u05d0' <= c <= '\u05ea' for c in token[:pos]) - 1 != li:
        raise ValueError('wrong qamats vowel/position')
    if row['m'] not in (e['before_m'], e['after_m']):
        raise ValueError(f'Psalms {chapter}:{verse}: unexpected metadata (partial/duplicate/drift)')
    state = 'before' if row['m'] == e['before_m'] else 'after'
    if digest(row) != e[state + '_verse_sha256']:
        raise ValueError('whole-verse hash mismatch')
    result = deepcopy(row)
    result['m'] = deepcopy(e['before_m'] if reverse else e['after_m'])
    return result


def repair_verse(book, chapter, verse, row, *, reverse=False, ledger=None):
    """Unknown references are unchanged; never locate targets by word alone."""
    ledger = load_ledger() if ledger is None else ledger
    validate_ledger(ledger)
    return _repair(book, chapter, verse, row, ledger['entries'], reverse)


def apply_book(data, *, reverse=False, ledger=None):
    """Validate every approved target before returning a separately owned book."""
    ledger = load_ledger() if ledger is None else ledger
    validate_ledger(ledger)
    if data.get('book') != 'Psalms' or data.get('slug') != 'tanach-tehillim':
        raise ValueError('Psalms overlay requires exact book and slug')
    result = deepcopy(data)
    for e in ledger['entries']:
        # The XML builder uses integer keys; serialized imports use strings.
        c = e['chapter'] if e['chapter'] in result['ch'] else str(e['chapter'])
        if c not in result['ch']:
            raise ValueError('missing approved chapter')
        v = e['verse'] if e['verse'] in result['ch'][c] else str(e['verse'])
        if v not in result['ch'][c]:
            raise ValueError('missing approved verse')
        result['ch'][c][v] = _repair('Psalms', e['chapter'], e['verse'],
                                     result['ch'][c][v], ledger['entries'], reverse)
    return result
