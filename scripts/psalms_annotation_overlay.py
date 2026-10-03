"""Exact combined metadata delivery; no classifier, normalization or new gold.

Supersedes the qatan-only importer overlay (which remains independently frozen).
104:24 retains BOTH disjoint changes. The three whole-corpus hashes prohibit
mixed/partial states, including drift at held or otherwise unedited positions.
All validation happens before returning an independent object or opening output.
"""
from copy import deepcopy
from pathlib import Path
from psalms_qatan_overlay import canonical, digest, load_json

LEDGER_SHA256 = '8c493378092dabc9cce9777811a762364cc6bfe573297dba33bc178ded2f37a1'
LEDGER_PATH = Path(__file__).parent / 'data/psalms-annotation-ledger.json'


def load_ledger():
    ledger = load_json(LEDGER_PATH)
    validate_ledger(ledger)
    return ledger


def validate_ledger(ledger):
    if digest(ledger) != LEDGER_SHA256:
        raise ValueError('Psalms combined source/authority ledger hash mismatch')


def repair_verse(book, chapter, verse, row, *, target='final', reverse=False, ledger=None):
    ledger = load_ledger() if ledger is None else ledger
    validate_ledger(ledger)
    target = 'before' if reverse else target
    if target not in ('before', 'qatan', 'final'):
        raise ValueError('unknown exact metadata state')
    entries = [e for e in ledger['entries'] if (book, chapter, verse) ==
               (e['book'], e['chapter'], e['verse'])]
    if not entries:
        return deepcopy(row)
    if len(entries) != 1:
        raise ValueError('duplicate verse in ledger')
    e = entries[0]
    fields = {k: v for k, v in row.items() if k != 'm'}
    if fields != e['source_fields'] or digest(fields) != e['source_sha256']:
        raise ValueError(f'Psalms {chapter}:{verse}: exact source drift')
    if not any(row.get('m') == state['m'] and digest(row) == state['verse_sha256']
               for state in e['states'].values()):
        raise ValueError(f'Psalms {chapter}:{verse}: partial/duplicate/metadata drift')
    result = deepcopy(row)
    result['m'] = deepcopy(e['states'][target]['m'])
    return result


def apply_book(data, *, target='final', reverse=False, ledger=None):
    """Only original, complete qatan-only or complete final books are accepted.

    Unknown top-level descriptive fields are preserved. Every chapter, verse,
    source field and metadata tuple is pinned, including all held coordinates.
    Integer XML-builder keys and their serialized string keys are equivalent.
    """
    ledger = load_ledger() if ledger is None else ledger
    validate_ledger(ledger)
    target = 'before' if reverse else target
    if target not in ('before', 'qatan', 'final'):
        raise ValueError('unknown exact metadata state')
    if data.get('book') != 'Psalms' or data.get('slug') != 'tanach-tehillim':
        raise ValueError('Psalms overlay requires exact book and slug')
    ch = data.get('ch', {})
    normalized = {str(c): {str(v): row for v, row in verses.items()} for c, verses in ch.items()}
    if len(normalized) != len(ch) or any(len(normalized[str(c)]) != len(vs) for c, vs in ch.items()):
        raise ValueError('duplicate numeric/string identities')
    if digest(normalized) not in ledger['corpus_sha256'].values():
        raise ValueError('Psalms corpus source/metadata drift or arbitrary partial state')
    result = deepcopy(data)
    for e in ledger['entries']:
        c = e['chapter'] if e['chapter'] in result['ch'] else str(e['chapter'])
        v = e['verse'] if e['verse'] in result['ch'][c] else str(e['verse'])
        result['ch'][c][v] = repair_verse('Psalms', e['chapter'], e['verse'],
                                          result['ch'][c][v], target=target, ledger=ledger)
    normalized = {str(c): {str(v): row for v, row in verses.items()} for c, verses in result['ch'].items()}
    if digest(normalized) != ledger['corpus_sha256'][target]:
        raise ValueError('final exact corpus hash mismatch')
    return result
