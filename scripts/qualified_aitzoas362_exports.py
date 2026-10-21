#!/usr/bin/env python3
"""Pinned Aitzoas source reader and pure export projections; stdlib only.

Release interface: python3 scripts/qualified_aitzoas362_exports.py --verify
No environment variables, private QA, scope, delta, or oracle files are read.
Writers stay in the ordinary builders. read_asset(public_relative_name) is the
only injectable IO boundary; it returns immutable bytes, never parsed fallbacks.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import html
import json
import re
from pathlib import Path

BOOK = "aitzoas-yeshuroas"
ARCHIVE = ("reviewed", "aitzoas362-sources")
BANK = "reader/reviewed/aitzoas362-sources/selected-362.json"
ASSET_PINS = {'reader/reviewed/aitzoas362-sources/selected-362.json': {'bytes': 1849596, 'sha256': '8a90905ca1a09e524162f0100c3c9ba43580ca8796d6984e2482663481c294fc'}, 'reader/aitzoas-yeshuroas/section-1.json': {'bytes': 6132, 'sha256': 'a7d2f7cb58535fe54c93fb47372dc74497f900a4b6fa49fbd644a84ff8c5b430'}, 'reader/aitzoas-yeshuroas/section-2.json': {'bytes': 176171, 'sha256': 'b3ab7a64b00eb601897667cceb97839e9117781258cf8d0d0cb3f57012079490'}, 'reader/aitzoas-yeshuroas/section-3.json': {'bytes': 339845, 'sha256': 'bf5277addff0ea53176113bca04d32f40ad17b41f4a2754eaa10c22c85fb9a38'}, 'reader/aitzoas-yeshuroas/section-4.json': {'bytes': 400569, 'sha256': '2c3d3d3ba834d2d02fdf7487ba12dc99693fcef42a9bf3968f22e5c268d97439'}, 'reader/aitzoas-yeshuroas/section-5.json': {'bytes': 474600, 'sha256': '1a136cba7e51abeacc536b977781ccf0027f7c16e35d8e9c134b84898fcb80af'}, 'reader/aitzoas-yeshuroas/section-6.json': {'bytes': 231547, 'sha256': '481052e4e7e6992db517e3a43c09040aed8155adfc036d7d8097ab0be830464c'}, 'reader/reviewed/aitzoas362-sources/section-1-original.json': {'bytes': 1721, 'sha256': 'f76ceffd2a3be95d3cb1493642a03e3dfe3d9b8affb77d8d17348ce889cb2e66'}, 'reader/reviewed/aitzoas362-sources/section-2-original.json': {'bytes': 83233, 'sha256': 'e9b6f9dd53fd45ffee8719fbb9975483c73e662aae1cf4c50422319086e33239'}, 'reader/reviewed/aitzoas362-sources/section-3-original.json': {'bytes': 125089, 'sha256': '72fa3184be16e9ebb4bb8b6cf2fd07ac2a391dba96acfbd59a3c51b7348173c9'}, 'reader/reviewed/aitzoas362-sources/section-4-original.json': {'bytes': 125579, 'sha256': '6a738fba31b998a54e1c51333b22518dbf27624784c3222cb1ec2b80c907b80a'}, 'reader/reviewed/aitzoas362-sources/section-5-original.json': {'bytes': 230819, 'sha256': 'dd5b31a002f6982bd3e70bc49e4ea96d7b0b7cfb811c33fd8d8c876fdd899b42'}, 'reader/reviewed/aitzoas362-sources/section-6-original.json': {'bytes': 120744, 'sha256': '84015bf5cb5e955ab67f4b82ad3df3dc6cda0ee521a0a5ca6db68b409ade40ef'}}
CORE_PINS = {'qualified-aitzoas362-core.js': {'bytes': 26273, 'sha256': '609af7efd3ad2d5c5c6feb013a0a1feb198fd82c095eea969c5835b49341d792'}, 'qualified-aitzoas362-core.mjs': {'bytes': 127, 'sha256': 'af0b4308257ce24158575b4876c9a28f2b8cd95ebdd7428d28820d5c9fa14e46'}}
BANK_VALUE_PIN = '2bbc7de6851df399759c20fb1fe0e8dd3ef0875d734599eda502a9c50f83a9aa'
SOURCE_BINDING_PIN = '1acab76480179270ccfa8277d0830f4400d445a7077ac3fb6bc4fb8e8f27ccd4'
DISPLAY_RULES = {'208': {'inlineCaveat': {'text': '[opaque source wording: the designation is unresolved; no acronym expansion or two-forces/adversary interpretation is established]', 'codepointStart': 123, 'codepointEndExclusive': 253, 'textSHA256': '634352aabbab60f592bc484a76110a71ffdf864d57aca0ddf2d8b8c8e1d793ad'}, 'inlineNoteId': 'C-208-N01', 'otherNoteIds': ['C-208-N02'], 'allNotesRequiredInHebrewOrNoteOnlyContexts': True}, '242': {'overlappingInlineSpan': {'start': 710, 'endExclusive': 791, 'text': '[the final source token חט is unresolved; neither 29 nor 109 is established here]', 'sha256': '01fb53b79511a4161b5a1abdde2e4aadb9fe12ab29c604cea308a62a17e92356'}, 'omitSpanOnlyWithCompleteNotes': ['C-242-N01', 'C-242-N02'], 'storedEnglishUnchanged': True}}
DISPLAY_RULES_PIN = '0f57116d9137a7fed9e00ccd7001c28c818d0eb71e3997581aa652bb5c4e90eb'

BASELINE_BANK_VALUE_PIN = 'fd557b88202c0772d9df3b880c7cad2f77474e115863a7db95fef7597a463aba'
BASELINE_SOURCE_BINDING_PIN = '3b86b6146240792ef65a855ee8b37a7bd3fb7ff10be91d70b94074f4952ba206'
FINAL4_ORIGINALS = {'1': {'en': None, 'englishStatus': 'unavailable', 'origin': {'kind': 'unavailable', 'notice': 'English translation unavailable for this field.'}, 'requiredNotes': []}, '62': {'en': None, 'englishStatus': 'unavailable', 'origin': {'kind': 'unavailable', 'notice': 'English translation unavailable for this field.'}, 'requiredNotes': []}, '87': {'en': None, 'englishStatus': 'source-reading-unresolved', 'origin': {'kind': 'unavailable', 'notice': 'English unavailable pending source-reading clarification.'}, 'requiredNotes': []}, '179': {'en': None, 'englishStatus': 'source-reading-unresolved', 'origin': {'kind': 'unavailable', 'notice': 'English unavailable pending source-reading clarification.'}, 'requiredNotes': []}}
FINAL4_PINS = {'1': {'rowSHA256': '4afb7adad4461609a4081e230c76e20f90973d8353fb46a07ca4df5ca6fe9199', 'enSHA256': '1d59c320ac0ab5c3e75f3b6368de18a0eda48ba3d99abfc3144ac0b0b0bb17bc', 'englishStatusSHA256': '8b7092cc4b053d88fdfb7df09c11c9242c36aba5d07e422786913868eda34bfc', 'originSHA256': '0f3703d1400585553ec4e9521703e732bfd9b9d9576658ed9cbb1f414c96b470', 'requiredNotesSHA256': '6dd08e7f902033c91cd746fa61c0d15de6f3663164a3a25543840f49387327ab'}, '62': {'rowSHA256': 'b033229677cfe90d745ec7a54033f6b92fd8da8270a7669d293a9575b8aadd6a', 'enSHA256': '3064c70f27fdd4075de6d1fa9df5250a4188cd4a57783b19e6f992a0f441298c', 'englishStatusSHA256': '8b7092cc4b053d88fdfb7df09c11c9242c36aba5d07e422786913868eda34bfc', 'originSHA256': '1ddcdfb59faef766dc516edcf6a3e044aa3fe59707cf54b922b03904a7d53504', 'requiredNotesSHA256': 'd06893ba9b20281f37c77d1f977f6d134a833fcaa180ca531e0d1a7ff0e061c5'}, '87': {'rowSHA256': '37204115064781140bff89d0531920e4bee9615b5147e3f75e9b6e7438f4e32a', 'enSHA256': '52a38bc69ad294f1d13e8e6cde33608be757b9bb01feb9be5696bb36e0ffe97d', 'englishStatusSHA256': '8b7092cc4b053d88fdfb7df09c11c9242c36aba5d07e422786913868eda34bfc', 'originSHA256': 'fda9042fb2729869b2a7480377d4cfc3cb0ccefc900acb123ab0f99accf83067', 'requiredNotesSHA256': '0f849674ddff2b1bc9add16d9948b1eb4f2e11b06dbedaa2679d83c0c2b7eecb'}, '179': {'rowSHA256': '3e2102d5de3362010a3492d77d071521611e790d9474766fe67a26519028e410', 'enSHA256': '551a33bcb03ed178fae6a2e0fb93892a8e36d4a5925d14b121eb5100703df7e6', 'englishStatusSHA256': '8b7092cc4b053d88fdfb7df09c11c9242c36aba5d07e422786913868eda34bfc', 'originSHA256': '31ae287b360efca044470e2f71e89209d3752b78e4b2d6bae6623bf69d544b22', 'requiredNotesSHA256': 'c8d42ad3b2132eecc2a5092be880bb5faec10da4700cba31cc1e0db4ce4c186e'}}
FINAL_NOTE_COUNT = 218

_SEAL = object()
NIKUD = re.compile(r'[֑-ֽֿׁ-ׂׄ-ׇׅ]')


def require(ok, message):
    if not ok:
        raise ValueError(message)


def stable(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def sha(value):
    return hashlib.sha256(value.encode('utf-8') if isinstance(value, str) else value).hexdigest()


def _pairs(items):
    result = {}
    for key, value in items:
        require(key not in result, 'Duplicate JSON key')
        result[key] = value
    return result


def decode(raw):
    return json.loads(raw.decode('utf-8'), object_pairs_hook=_pairs,
                      parse_constant=lambda _: require(False, 'Nonfinite JSON'))


def audience_safe(value):
    private = {'bindingRole', 'primaryPointer', 'attachmentState', 'activeBinding'}
    bad = re.compile(r'/mnt/[a-z]/|/root/|[A-Za-z]:\\|qualifiedEnglish|acceptance_counter|hidden_private|English_qualified_total_private_only|INDEPENDENT-PRIVATE-ORACLE|proposedEnglish_in_new_private_proposal|REBOUND_PREPARATION_ONLY|PROPOSAL_AWAITING_|PRIVATE_PROCESS|INDEPENDENTLY_REVIEWED|/proposals/')
    def scan(item):
        if isinstance(item, str):
            require(not bad.search(item), 'Private path/workflow leak')
        elif isinstance(item, dict):
            for key, val in item.items():
                require(key not in private, 'Private workflow key')
                scan(key)
                scan(val)
        elif isinstance(item, list):
            for val in item:
                scan(val)
    scan(value)
    return value


def is_archive(path, reader_dir):
    return Path(path).relative_to(reader_dir).parts[:2] == ARCHIVE


def is_source(path, reader_dir):
    # Namespace recognition precedes validation: unknown files cannot fall back.
    return Path(path).relative_to(reader_dir).parts[:1] == (BOOK,)


def section_number(path, reader_dir):
    parts = Path(path).relative_to(reader_dir).parts
    require(len(parts) == 2 and parts[0] == BOOK, 'Exact canonical source path required')
    match = re.fullmatch(r'section-([1-6])\.json', parts[1])
    require(match is not None, 'Exact canonical section filename required')
    return int(match.group(1))


def route_section(link):
    match = re.fullmatch(r'/reader/aitzoas-yeshuroas/1/([1-6])', link)
    require(match is not None, 'Exact canonical source route required')
    return int(match.group(1))


def _binding(row):
    identity = {k: row[k] for k in ('owner', 'stableIndex', 'section', 'arrayPosition', 'sourcePointer', 'canonicalUrl')}
    return [identity, sha(row['he']), None if row['en'] is None else sha(row['en']),
            sha(stable(row['requiredNotes'])), sha(stable(row['origin'])),
            sha(stable(row['history'])), row['englishStatus']]


def validate_values(bank, loaded):
    """Relational validation plus independent literal-value bindings.

    Exposed for value-level controls: these do not get stopped at a byte envelope.
    Authentication must still precede any outward transport.
    """
    audience_safe(bank)
    audience_safe(loaded)
    require(set(bank) == {'schema', 'bookId', 'rows', 'displayRules'}, 'Bank field inventory')
    require(bank['schema'] == 'ajew-aitzoas362-source-reading/v1' and bank['bookId'] == BOOK, 'Bank identity')
    require(bank['displayRules'] == DISPLAY_RULES and sha(stable(bank['displayRules'])) == DISPLAY_RULES_PIN, 'Display policy drift')
    require(set(loaded) == set(ASSET_PINS) - {BANK}, 'Closed twelve source inventory')
    rows = bank['rows']
    require(isinstance(rows, list) and len(rows) == 366, '366 owner inventory')
    cursor, notes, available, seen_notes = 0, 0, 0, set()
    for section in range(1, 7):
        original_name = f'reader/reviewed/aitzoas362-sources/section-{section}-original.json'
        orig = loaded[original_name]
        proj = loaded[f'reader/{BOOK}/section-{section}.json']
        expected_count = (3, 60, 66, 62, 110, 65)[section-1]
        require(orig.get('bookId') == BOOK and orig.get('part') == 1 and orig.get('torah') == section, 'Section identity')
        require({k:v for k,v in orig.items() if k != 'segments'} == {k:v for k,v in proj.items() if k != 'segments'}, 'Section metadata drift')
        require(len(orig['segments']) == len(proj['segments']) == expected_count, 'Section inventory')
        for position, old in enumerate(orig['segments']):
            row = rows[cursor]
            cursor += 1
            owner = f'{BOOK}-section-{section}-index-{cursor}'
            require(row['owner'] == owner and row['stableIndex'] == old['index'] == cursor and row['section'] == section and row['arrayPosition'] == position and row['sourcePointer'] == f'/segments/{position}' and row['canonicalUrl'] == f'/reader/{BOOK}/1/{section}#seg-{cursor}', 'Owner/order/pointer drift')
            require(isinstance(row['he'], str) and row['he'] == old['he'] and 'he_nikud' not in row, 'Hebrew source integrity')
            absent = False  # Closed final-four successor, not generic adoption.
            require(row['en'] is None if absent else isinstance(row['en'], str) and bool(row['en']), 'Exact English null/inclusion contract')
            require(row['englishStatus'] == ('source-reading-unresolved' if cursor in (87,179) else 'unavailable') if absent else row['englishStatus'] == 'available', 'English status drift')
            available += not absent
            require(isinstance(row['origin'].get('notice'), str) and bool(row['origin']['notice']), 'Origin missing')
            history = row['history']
            require(history['en'] == old['en'] and history['archiveUrl'] == '/' + original_name and history['pointer'] == f'/segments/{position}/en' and history['archiveSHA256'] == ASSET_PINS[original_name]['sha256'] and history['label'] == 'Earlier site English (historical comparison, not the current translation).', 'History owner/field drift')
            require(isinstance(row['requiredNotes'], list), 'Reader notes missing')
            for note in row['requiredNotes']:
                require(note['owner'] == owner and isinstance(note['id'], str) and note['id'] not in seen_notes and isinstance(note['text'], str) and bool(note['text']) and bool(note['anchors']), 'Note ownership/inventory')
                notes += 1
                seen_notes.add(note['id'])
            projected = dict(old, en=row['en'], englishReading={k:row[k] for k in ('englishStatus','origin','requiredNotes','history')})
            require(proj['segments'][position] == projected, 'Runtime source projection drift')
    require(available == 366 and notes == FINAL_NOTE_COUNT, '366 English / exact mandatory notes')
    baseline = copy.deepcopy(bank)
    for index in (1,62,87,179):
        row, pins = rows[index-1], FINAL4_PINS[str(index)]
        require(sha(stable(row)) == pins['rowSHA256'], 'Exact final-four row drift')
        for key in ('en','englishStatus','origin','requiredNotes'):
            require(sha(stable(row[key])) == pins[key+'SHA256'], 'Exact final-four scalar drift')
        baseline['rows'][index-1].update(copy.deepcopy(FINAL4_ORIGINALS[str(index)]))
    require(sha(stable(baseline)) == BASELINE_BANK_VALUE_PIN, 'Immutable baseline362 bank drift')
    require(sha(stable([_binding(r) for r in baseline['rows']])) == BASELINE_SOURCE_BINDING_PIN, 'Immutable baseline362 source binding drift')
    require(sha(stable([_binding(r) for r in rows])) == SOURCE_BINDING_PIN, 'Independent source binding drift')
    require(sha(stable(bank)) == BANK_VALUE_PIN, 'Exact adopted bank value drift')
    return bank


class Edition:
    __slots__ = ('_bank', '_sections', '_seal')
    def __init__(self, bank, sections, seal):
        require(seal is _SEAL, 'Unauthenticated outward source')
        object.__setattr__(self, '_bank', stable(bank))
        object.__setattr__(self, '_sections', stable(sections))
        object.__setattr__(self, '_seal', seal)
    def __setattr__(self, name, value):
        raise AttributeError('Authenticated edition is immutable')
    @property
    def rows(self):
        return json.loads(self._bank)['rows']
    @property
    def sections(self):
        return json.loads(self._sections)


def require_edition(edition):
    require(isinstance(edition, Edition) and edition._seal is _SEAL, 'Unauthenticated outward source')
    return edition


def authenticate(read_asset):
    """Authenticate all thirteen final public assets and the delivered core ABI."""
    for name, pin in CORE_PINS.items():
        raw = read_asset(name)
        require(isinstance(raw, bytes) and len(raw) == pin['bytes'] and sha(raw) == pin['sha256'], 'Bound core authentication failed: ' + name)
    loaded = {}
    for name, pin in ASSET_PINS.items():
        raw = read_asset(name)
        require(isinstance(raw, bytes) and len(raw) == pin['bytes'] and sha(raw) == pin['sha256'], 'Bound source authentication failed: ' + name)
        loaded[name] = decode(raw)
    bank = loaded.pop(BANK)
    validate_values(bank, loaded)
    return Edition(bank, [loaded[f'reader/{BOOK}/section-{s}.json'] for s in range(1,7)], _SEAL)


def load_edition(root):
    public = Path(root) / 'public'
    return authenticate(lambda name: (public / name).read_bytes())


def checked_section(edition, path, data, reader_dir):
    require_edition(edition)
    section = section_number(path, reader_dir)
    require(data == edition.sections[section-1], 'Current source before fallback drift')
    return section


def display_plan(row, english=True, complete_notes=True, exact_english=False):
    en = row['en'] if english else None
    notes = copy.deepcopy(row['requiredNotes'])
    if row['stableIndex'] == 208 and english and en is not None:
        notes = [n for n in notes if n['id'] != DISPLAY_RULES['208']['inlineNoteId']]
    if row['stableIndex'] == 242 and english and complete_notes and not exact_english:
        rule = DISPLAY_RULES['242']
        require(all(any(q['id'] == name for q in notes) for name in rule['omitSpanOnlyWithCompleteNotes']), '242 requires complete notes')
        span = rule['overlappingInlineSpan']
        require(isinstance(en, str) and en[span['start']:span['endExclusive']] == span['text'], '242 display span drift')
        en = en[:span['start']] + en[span['endExclusive']:]
    return en, notes


def history_text(row):
    h = row['history']
    pairs = [('Historical role',h['label']), ('Earlier site English — comparison only (empty means no earlier wording)',h['en']), ('Complete original section archive',h['archiveUrl']), ('Original English field location',h['pointer']), ('Original archive SHA-256',h['archiveSHA256'])]
    return '\n\n'.join(label + '\n' + value for label,value in pairs)


def passage_text(row):
    en, notes = display_plan(row)
    text = f"Aitzoas Yesharoas — section {row['section']}, Reader paragraph {row['stableIndex']}\nReader anchors are not printed teaching numbers.\n\nSupplied Hebrew\n{row['he']}\n\nEnglish\n{en if en is not None else '[English unavailable; no historical fallback]'}\n\nEnglish origin\n{row['origin']['notice']}"
    if notes:
        text += '\n\n' + '\n\n'.join('Source note ['+q['id']+']\n'+q['text'] for q in notes)
    return text + '\n\n' + history_text(row) + '\n\nSource: https://ajew.org' + row['canonicalUrl']


def escape_exact(text):
    # HTML parsers normalize literal CR/CRLF. Numeric CR entities preserve it.
    return html.escape(text, quote=True).replace('\r', '&#13;')


def section_exports(edition, section):
    require_edition(edition)
    require(type(section) is int and 1 <= section <= 6, 'Section range')
    meta = edition.sections[section-1]
    rows = [r for r in edition.rows if r['section'] == section]
    title = meta.get('title') or f'Aitzoas Yesharoas — section {section}'
    he_title = meta.get('hebrewTitle') or ''
    source = f'/reader/{BOOK}/1/{section}'
    url = f'/reader-plain/{BOOK}/1/{section}/'
    content = '\n\n'.join(passage_text(r) for r in rows)
    raw = {'bookId':BOOK,'part':'1','torah':str(section),'title':title,'hebrewTitle':he_title,'sourceUrl':source,'plainUrl':url,
           'editionSHA256':ASSET_PINS[BANK]['sha256'],'content':content,
           'sourceUnitsRole':'Exact stored fields for authentication; not a second reader body.',
           'segments':[dict(index=r['stableIndex'], **copy.deepcopy(r)) for r in rows]}
    # Fenced literal Markdown is safe even when stored fields contain HTML.
    fence = '`' * max(3, 1 + max((len(m.group()) for m in re.finditer(r'`+', content)), default=0))
    md = '# ' + title + '\n\n' + fence + 'text\n' + content + '\n' + fence + '\n'
    rendered = ''.join(f'<section id="segment-{r["stableIndex"]}"><span id="seg-{r["stableIndex"]}"></span><pre dir="auto">{escape_exact(passage_text(r))}</pre></section>' for r in rows)
    page = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape_exact(title)+'</title><link rel="canonical" href="https://ajew.org'+source+'"><style>body{max-width:980px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.7}</style><header><h1>'+escape_exact(title)+'</h1><a href="'+source+'">Reader</a> · <a href="index.txt">TXT</a> · <a href="index.md">Markdown</a> · <a href="index.json">Stored fields JSON</a></header><main>'+rendered+'</main></html>\n'
    files = {'index.txt':content+'\n', 'index.md':md, 'index.json':json.dumps(raw, ensure_ascii=False, indent=2), 'index.html':page}
    entry = {'bookId':BOOK,'part':'1','torah':str(section),'title':title,'hebrewTitle':he_title,'url':url,'sourceUrl':source,'segments':len(rows)}
    return {name:text.encode('utf-8') for name,text in files.items()}, entry


def search_text(edition, section):
    require_edition(edition)
    require(type(section) is int and 1 <= section <= 6, 'Section range')
    he_parts, en_parts, locations = [], [], []
    hc = ec = 0
    for row in edition.rows:
        if row['section'] != section:
            continue
        # Search only the literal current fields, not display notices or notes.
        he = re.sub(r'\s+', ' ', NIKUD.sub('', row['he'])).strip()
        en = re.sub(r'\s+', ' ', row['en']).strip() if row['en'] is not None else ''
        locations.append([row['stableIndex'],row['stableIndex'],hc,hc+len(he),ec,ec+len(en)])
        if he:
            he_parts.append(he)
            hc += len(he)+1
        if en:
            en_parts.append(en)
            ec += len(en)+1
    return ' '.join(he_parts), ' '.join(en_parts), locations


def checked_search_artifacts(edition, link, he_doc, en_doc):
    section = route_section(link)
    he, en, locations = search_text(edition, section)
    meta = require_edition(edition).sections[section-1]
    title = meta.get('title', '') or ''
    hebrew_title = meta.get('hebrewTitle', '') or meta.get('title', '') or ''
    expected = {'t':title[:200], 'h':hebrew_title[:200], 'b':BOOK[:50], 'l':link[:200], 'a':''}
    for document in (he_doc, en_doc):
        require(isinstance(document, dict) and all(document.get(k) == v for k,v in expected.items()), 'Qualified light search metadata drift')
    require(he_doc.get('x') == he and en_doc.get('x') == en and he_doc.get('m') == locations and he_doc.get('e') == en[:500] and en_doc.get('e') == en[:500], 'Qualified light search body/locations drift')
    return he, en, locations


def verify(read_asset):
    edition = authenticate(read_asset)
    return {'check':'qualified-aitzoas362-production','owners':len(edition.rows),
            'availableEnglish':sum(r['en'] is not None for r in edition.rows),
            'requiredNotes':sum(len(r['requiredNotes']) for r in edition.rows),
            'publicAssets':len(ASSET_PINS),'coreBindings':len(CORE_PINS)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true', required=True)
    args = parser.parse_args(argv)
    root = Path(__file__).resolve().parents[1]
    result = verify(lambda name: (root / 'public' / name).read_bytes())
    print(json.dumps(result, sort_keys=True))
    return result


if __name__ == '__main__':
    main()
