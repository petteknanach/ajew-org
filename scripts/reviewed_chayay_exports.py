"""Exact additive Chayay export adapter; not canonical/source approval.

The pin binds the separately verified source projection, not a human decision.
Search is a normalized lookup view. Plain exports conserve complete raw values.
"""
from collections import Counter
import copy
import hashlib
import html
import json
from pathlib import Path

RELATIVE_SOURCE = 'chayey-moharan/reviewed/14-58.json'
SOURCE_SHA256 = '2f03be4727a8902da34f3a65bf3158cf93bd4fc5fb92a5c1cca8a2cae09daca4'
ROUTE = '/reader/chayey-moharan/reviewed/14-58'
TITLE = 'Chayay Moharan — AI-reviewed / editorially qualified Simanim 14–58'
NOTICE = ('Additive, editorially qualified AI-reviewed edition. Not human-approved '
          'or authenticated as the complete original user translation. Canonical '
          'edition unchanged. Retained earlier English is a source witness, not '
          'asserted to correspond to its neighboring Hebrew.')


def is_reviewed_source(path, reader_dir):
    return Path(path).relative_to(reader_dir).as_posix() == RELATIVE_SOURCE


def checked_projection(path, data):
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('Chayay reviewed source pin mismatch; final current authority must be rebound before export')
    if json.loads(raw) != data:
        raise ValueError('Chayay decoded payload differs from pinned source')
    if data['schema'] != 'chayay-companion-projection/v1':
        raise ValueError('wrong reviewed projection schema')
    if any(data[k] is not False for k in ('human_signoff', 'publication_approved',
           'full_original_english_authenticated', 'canonical_replacement_approved')):
        raise ValueError('false approval claim')
    nodes = data['nodes']
    if len(nodes) != 142 or data['pair_count'] != 142:
        raise ValueError('incomplete reviewed scope')
    ids = [n['unit_id'] for n in nodes]
    if len(set(ids)) != len(ids) or sorted(set(n['siman'] for n in nodes)) != list(range(14, 59)):
        raise ValueError('duplicate owner or wrong siman coverage')
    if len(data['required_qualification_occurrences']) != 307:
        raise ValueError('incomplete FINAL current qualifications')
    if len(data['source_apparatus_verbatim']) != 23 or len(data['prior_selected_bindings_history']) != 142:
        raise ValueError('incomplete retained apparatus/history')
    owners = {n['unit_id']: n for n in nodes}
    expected = Counter()
    for q in data['required_qualification_occurrences']:
        expected[q['owner_unit_id'], q['text']] += 1
        if hashlib.sha256(q['text'].encode()).hexdigest() != q['text_sha256']:
            raise ValueError('qualification digest mismatch')
    for (owner, text), count in expected.items():
        if owners[owner]['selected']['translationProvenance'].count(text) != count:
            raise ValueError('qualification occurrence mismatch')
    for n in nodes:
        if n['selected']['index'] != n['actual_index'] or n['selected']['siman'] != n['siman']:
            raise ValueError('selected owner/index mismatch')
        if n['displaced_english']['owner_unit_id'] != n['unit_id']:
            raise ValueError('legacy owner mismatch')
        if any(not isinstance(n['selected'].get(k), str) or not n['selected'][k]
               for k in ('he', 'he_nikud', 'en', 'translationProvenance')):
            raise ValueError('missing complete selected field')
    return data


def search_document(path, data):
    checked_projection(path, data)
    segments = []
    for n in data['nodes']:
        # Search-only whitespace normalization matches the final shard serializer;
        # it is never applied to frozen witnesses or plain publication fields.
        s = n['selected']
        segments.append({'index': n['actual_index'], 'siman': n['siman'],
                         'he': ' '.join(s['he'].split()),
                         'he_nikud': ' '.join(s['he_nikud'].split()),
                         'en': ' '.join(s['en'].split()),
                         'commentary_en': ' '.join(s['translationProvenance'].split())})
    return {'title': TITLE, 'hebrewTitle': 'חיי מוהר״ן', 'segments': segments,
            'qualifiedReviewedProjection': True}


def write_plain(path, data, out_dir):
    checked_projection(path, data)
    out = Path(out_dir) / 'chayey-moharan' / 'reviewed' / '14-58'
    out.mkdir(parents=True, exist_ok=True)
    text_parts = [TITLE, NOTICE, 'Source: https://ajew.org' + ROUTE]
    md_parts = ['# ' + TITLE, NOTICE, 'Source: https://ajew.org' + ROUTE]
    html_parts = ['<!doctype html><meta charset="utf-8"><title>' + html.escape(TITLE)
                  + '</title><meta name="robots" content="index,follow,max-snippet:-1">',
                  '<h1>' + html.escape(TITLE) + '</h1><p>' + html.escape(NOTICE) + '</p>',
                  '<nav><a href="' + ROUTE + '">Reader</a> · <a href="index.txt">TXT</a> · '
                  '<a href="index.md">Markdown</a> · <a href="index.json">Exact source JSON</a></nav>']
    def emit(label, value, direction='ltr'):
        # Numeric CR references preserve source CR when parsed as HTML.
        escaped = html.escape(value).replace('\r', '&#13;')
        text_parts.extend([label, value])
        md_parts.extend(['## ' + label, '<pre dir="' + direction + '">' + escaped + '</pre>'])
        html_parts.extend(['<h3>' + html.escape(label) + '</h3>',
                           '<pre dir="' + direction + '" style="white-space:pre-wrap;overflow-wrap:anywhere">' + escaped + '</pre>'])
    for n in data['nodes']:
        html_parts.append('<section id="seg-' + str(n['actual_index']) + '">')
        emit('Siman ' + str(n['siman']) + ' — ' + n['unit_id'], '')
        for field in ('he', 'he_nikud', 'en', 'translationProvenance', 'translationSourceEnglish'):
            value = n['selected'].get(field)
            if value is not None:
                emit(field, value, 'rtl' if field in ('he', 'he_nikud') else 'ltr')
        emit('Earlier unaligned import — retained at original owner; NOT corresponding translation',
             n['displaced_english']['text'])
        emit('Exact field provenance', json.dumps({k: n[k] for k in
             ('unit_id', 'source_chapter_id', 'array_position_0', 'actual_index',
              'selected_binding', 'baseline_binding')}, ensure_ascii=False, indent=2))
        html_parts.append('</section>')
    emit('Complete retained source apparatus — witnesses, NOT selected translations',
         json.dumps(data['source_apparatus_verbatim'], ensure_ascii=False, indent=2))
    emit('Original chapter metadata — source context, NOT new approval',
         json.dumps(data['source_chapter_metadata_verbatim'], ensure_ascii=False, indent=2))
    for name, value in (('index.txt', '\n\n'.join(text_parts) + '\n'),
                        ('index.md', '\n\n'.join(md_parts) + '\n'),
                        ('index.html', '\n'.join(html_parts) + '\n')):
        (out / name).write_bytes(value.encode('utf-8'))
    (out / 'index.json').write_bytes(Path(path).read_bytes())
    return {'bookId': 'chayey-moharan', 'part': 'reviewed', 'torah': '14-58',
            'title': TITLE, 'hebrewTitle': 'חיי מוהר״ן', 'sourceUrl': ROUTE,
            'url': '/reader-plain/chayey-moharan/reviewed/14-58/', 'segments': 142}
