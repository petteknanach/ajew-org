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
ASSET_PINS = {'reader/reviewed/aitzoas362-sources/selected-362.json': {'bytes': 1850166, 'sha256': 'a9fd091f59d7be07cb261a31ba4f0a73bd5bc5827a727f0305c6de1199db2fc7'}, 'reader/aitzoas-yeshuroas/section-1.json': {'bytes': 6132, 'sha256': 'a7d2f7cb58535fe54c93fb47372dc74497f900a4b6fa49fbd644a84ff8c5b430'}, 'reader/aitzoas-yeshuroas/section-2.json': {'bytes': 176433, 'sha256': '72faf56d8ff0790cd913e4de747449cdb144975b2bd1906caee8e9c9a7b4d6e0'}, 'reader/aitzoas-yeshuroas/section-3.json': {'bytes': 339845, 'sha256': 'bf5277addff0ea53176113bca04d32f40ad17b41f4a2754eaa10c22c85fb9a38'}, 'reader/aitzoas-yeshuroas/section-4.json': {'bytes': 400569, 'sha256': '2c3d3d3ba834d2d02fdf7487ba12dc99693fcef42a9bf3968f22e5c268d97439'}, 'reader/aitzoas-yeshuroas/section-5.json': {'bytes': 474954, 'sha256': '16ded65f5563b7652a23f7dff9356dda54e77e90b0749a6068166131e2803b00'}, 'reader/aitzoas-yeshuroas/section-6.json': {'bytes': 231501, 'sha256': 'be56eaed3086b6a47d7e4b4803f38541b13ccd98c3a4c8582c3867da36bb3b83'}, 'reader/reviewed/aitzoas362-sources/section-1-original.json': {'bytes': 1721, 'sha256': 'f76ceffd2a3be95d3cb1493642a03e3dfe3d9b8affb77d8d17348ce889cb2e66'}, 'reader/reviewed/aitzoas362-sources/section-2-original.json': {'bytes': 83233, 'sha256': 'e9b6f9dd53fd45ffee8719fbb9975483c73e662aae1cf4c50422319086e33239'}, 'reader/reviewed/aitzoas362-sources/section-3-original.json': {'bytes': 125089, 'sha256': '72fa3184be16e9ebb4bb8b6cf2fd07ac2a391dba96acfbd59a3c51b7348173c9'}, 'reader/reviewed/aitzoas362-sources/section-4-original.json': {'bytes': 125579, 'sha256': '6a738fba31b998a54e1c51333b22518dbf27624784c3222cb1ec2b80c907b80a'}, 'reader/reviewed/aitzoas362-sources/section-5-original.json': {'bytes': 230819, 'sha256': 'dd5b31a002f6982bd3e70bc49e4ea96d7b0b7cfb811c33fd8d8c876fdd899b42'}, 'reader/reviewed/aitzoas362-sources/section-6-original.json': {'bytes': 120744, 'sha256': '84015bf5cb5e955ab67f4b82ad3df3dc6cda0ee521a0a5ca6db68b409ade40ef'}}
CORE_PINS = {'qualified-aitzoas362-core.js': {'bytes': 38050, 'sha256': '6780cbc7defe3fe189f94d0528b59307d6787b2d852a89b055a94e5dc9881574'}, 'qualified-aitzoas362-core.mjs': {'bytes': 127, 'sha256': 'af0b4308257ce24158575b4876c9a28f2b8cd95ebdd7428d28820d5c9fa14e46'}}
BANK_VALUE_PIN = '79c2f1d37af70a9991a5c46c1d3cf089b89814c2c36903186623268e8a7cbfda'
SOURCE_BINDING_PIN = '3ba1ca678fe881fe2931b68d7e2894866bfb76123f1e47407624f075534438ab'
DISPLAY_RULES = {'208': {'inlineCaveat': {'text': '[opaque source wording: the designation is unresolved; no acronym expansion or two-forces/adversary interpretation is established]', 'codepointStart': 123, 'codepointEndExclusive': 253, 'textSHA256': '634352aabbab60f592bc484a76110a71ffdf864d57aca0ddf2d8b8c8e1d793ad'}, 'inlineNoteId': 'C-208-N01', 'otherNoteIds': ['C-208-N02'], 'allNotesRequiredInHebrewOrNoteOnlyContexts': True}, '242': {'overlappingInlineSpan': {'start': 710, 'endExclusive': 791, 'text': '[the final source token חט is unresolved; neither 29 nor 109 is established here]', 'sha256': '01fb53b79511a4161b5a1abdde2e4aadb9fe12ab29c604cea308a62a17e92356'}, 'omitSpanOnlyWithCompleteNotes': ['C-242-N01', 'C-242-N02'], 'storedEnglishUnchanged': True}}
DISPLAY_RULES_PIN = '0f57116d9137a7fed9e00ccd7001c28c818d0eb71e3997581aa652bb5c4e90eb'

BASELINE_BANK_VALUE_PIN = 'fd557b88202c0772d9df3b880c7cad2f77474e115863a7db95fef7597a463aba'
BASELINE_SOURCE_BINDING_PIN = '3b86b6146240792ef65a855ee8b37a7bd3fb7ff10be91d70b94074f4952ba206'
FINAL4_ORIGINALS = {'1': {'en': None, 'englishStatus': 'unavailable', 'origin': {'kind': 'unavailable', 'notice': 'English translation unavailable for this field.'}, 'requiredNotes': []}, '62': {'en': None, 'englishStatus': 'unavailable', 'origin': {'kind': 'unavailable', 'notice': 'English translation unavailable for this field.'}, 'requiredNotes': []}, '87': {'en': None, 'englishStatus': 'source-reading-unresolved', 'origin': {'kind': 'unavailable', 'notice': 'English unavailable pending source-reading clarification.'}, 'requiredNotes': []}, '179': {'en': None, 'englishStatus': 'source-reading-unresolved', 'origin': {'kind': 'unavailable', 'notice': 'English unavailable pending source-reading clarification.'}, 'requiredNotes': []}}
FINAL4_PINS = {'1': {'rowSHA256': '4afb7adad4461609a4081e230c76e20f90973d8353fb46a07ca4df5ca6fe9199', 'enSHA256': '1d59c320ac0ab5c3e75f3b6368de18a0eda48ba3d99abfc3144ac0b0b0bb17bc', 'englishStatusSHA256': '8b7092cc4b053d88fdfb7df09c11c9242c36aba5d07e422786913868eda34bfc', 'originSHA256': '0f3703d1400585553ec4e9521703e732bfd9b9d9576658ed9cbb1f414c96b470', 'requiredNotesSHA256': '6dd08e7f902033c91cd746fa61c0d15de6f3663164a3a25543840f49387327ab'}, '62': {'rowSHA256': 'b033229677cfe90d745ec7a54033f6b92fd8da8270a7669d293a9575b8aadd6a', 'enSHA256': '3064c70f27fdd4075de6d1fa9df5250a4188cd4a57783b19e6f992a0f441298c', 'englishStatusSHA256': '8b7092cc4b053d88fdfb7df09c11c9242c36aba5d07e422786913868eda34bfc', 'originSHA256': '1ddcdfb59faef766dc516edcf6a3e044aa3fe59707cf54b922b03904a7d53504', 'requiredNotesSHA256': 'd06893ba9b20281f37c77d1f977f6d134a833fcaa180ca531e0d1a7ff0e061c5'}, '87': {'rowSHA256': '37204115064781140bff89d0531920e4bee9615b5147e3f75e9b6e7438f4e32a', 'enSHA256': '52a38bc69ad294f1d13e8e6cde33608be757b9bb01feb9be5696bb36e0ffe97d', 'englishStatusSHA256': '8b7092cc4b053d88fdfb7df09c11c9242c36aba5d07e422786913868eda34bfc', 'originSHA256': 'fda9042fb2729869b2a7480377d4cfc3cb0ccefc900acb123ab0f99accf83067', 'requiredNotesSHA256': '0f849674ddff2b1bc9add16d9948b1eb4f2e11b06dbedaa2679d83c0c2b7eecb'}, '179': {'rowSHA256': '3e2102d5de3362010a3492d77d071521611e790d9474766fe67a26519028e410', 'enSHA256': '551a33bcb03ed178fae6a2e0fb93892a8e36d4a5925d14b121eb5100703df7e6', 'englishStatusSHA256': '8b7092cc4b053d88fdfb7df09c11c9242c36aba5d07e422786913868eda34bfc', 'originSHA256': '31ae287b360efca044470e2f71e89209d3752b78e4b2d6bae6623bf69d544b22', 'requiredNotesSHA256': 'c8d42ad3b2132eecc2a5092be880bb5faec10da4700cba31cc1e0db4ce4c186e'}}

# Closed correction contract, independent of candidate-provided pins.
CORRECTION_PREDECESSOR_PIN = '8a90905ca1a09e524162f0100c3c9ba43580ca8796d6984e2482663481c294fc'
CORRECTION_PREDECESSOR_VALUE_PIN = '2bbc7de6851df399759c20fb1fe0e8dd3ef0875d734599eda502a9c50f83a9aa'
CORRECTION_PREDECESSOR_BINDING_PIN = '1acab76480179270ccfa8277d0830f4400d445a7077ac3fb6bc4fb8e8f27ccd4'
CORRECTION_OPERATIONS_PIN = '26ee02a2abca774512eacc414f6e0c2187070a3549790a1affb4c0c6b32c59bd'
CORRECTION_ARCHIVE = 'reader/reviewed/aitzoas362-sources/source-correction-predecessor.json'
CORRECTION_ARCHIVE_PIN = {'bytes': 25463, 'sha256': 'b3ebb6636d097289a27d190e03ab7de31455120c3e0d12a5fb432d247658b41a'}
CORRECTION_OPERATIONS = [{'pointer': '/rows/61/en', 'before': 'Hebrew initialism (unexpanded): ש"ע', 'after': '370 (ש"ע; “three hundred and seventy,” as expanded in Clothing, item 4).'}, {'pointer': '/rows/61/origin/notice', 'before': 'New English-labelled editorial apparatus retaining the supplied Hebrew initialism. Its expansion and referent are not established; no full name or phrase has been invented.', 'after': 'Editorial identification of the inline Hebrew numeral in Clothing, item 4; the supplied Hebrew explicitly expands it as שלש מאות ושבעים (370).'}, {'pointer': '/rows/61/requiredNotes/0/text', 'before': 'The entire Hebrew field is ש"ע, retained with its letters and straight quotation mark unchanged. Its expansion, referent and meaning are unknown. ‘Hebrew initialism (unexpanded)’ is an editorial label, not a decipherment or a translation of an established full name.', 'after': 'ש"ע is the inline Hebrew numeral in Clothing, item 4. The complete Hebrew reads ש"ע [שלש מאות ושבעים] (“three hundred and seventy”), and the supplied English renders it as 370 lights of the radiance of the [Divine] countenance. This fragment is not a separate teaching.'}, {'pointer': '/rows/62/en', 'before': 'Garment — Falsehood', 'after': 'Garment — falsehood (the Atbash wordplay in Clothing, item 5).'}, {'pointer': '/rows/62/origin/notice', 'before': 'Editorial English rendering of the supplied Hebrew heading or closing text.', 'after': 'Editorial identification of two inline Hebrew words in Clothing, item 5, not a separate heading or closing inscription.'}, {'pointer': '/rows/62/requiredNotes/0/text', 'before': 'בֶּגֶד שֶׁקֶר is only a two-word inscription or label. Its relation to the full Atbash teaching does not supply the rest of that teaching here. The preferred Hebrew witness has no whole-field match for this pointed two-word label.', 'after': 'בֶּגֶד and שֶׁקֶר occur as separate inline words within Clothing, item 5, where the teaching connects the letters of בגד with שקר by Atbash and identifies tzitzis as the repair. Their joined appearance here is an extracted fragment, not a separate inscription or teaching.'}, {'pointer': '/rows/357/requiredNotes/0/text', 'before': 'The Hebrew explicitly expands ש"ע here as שלש מאות ושבעים (370). This expansion applies to this passage, not to the separate, unresolved ש"ע inscription, which remains unexpanded.', 'after': 'The Hebrew explicitly expands ש"ע as שלש מאות ושבעים (370). The same numeral appears inline in Clothing, item 4 of the supplied English.'}, {'pointer': '/rows/192/en', 'before': 'Remainder — Shabbos\nש ת א ב ר ש', 'after': 'Festivals, item 1: inline Hebrew words and letter pairs — שְׁאָר; שַׁבָּת; ש→ת, א→ב, ר→ש.'}, {'pointer': '/rows/192/origin/notice', 'before': 'Editorial English rendering of the supplied Hebrew heading or closing text.', 'after': 'Editorial identification of inline Hebrew words and letter pairs within Festivals, item 1; the complete teaching is supplied separately.'}, {'pointer': '/rows/192/requiredNotes/0/text', 'before': 'This is standalone letter apparatus: the sequence ש ת א ב ר ש is preserved without prose expansion or an added teaching. The pointed שְׁאָר is rendered “remainder,” without silently repointing it to the contextual leaven term.', 'after': 'These words and letters are extracted from Festivals, item 1. Its complete paragraph concerns leaven in the dough and explains the succeeding-letter pairs ש→ת, א→ב, ר→ש, producing תבש, the letters of שבת in reverse. The supplied English prints שְׁאָר with pointing that reads “remainder”; that pointing is preserved, not silently changed. The contextual subject is leaven, not a separate teaching about a remainder.'}, {'pointer': '/rows/61/requiredNotes/0/anchors', 'before': [{'field': 'governingHebrew', 'token': 'ש"ע', 'codepointStart': 0, 'codepointEndExclusive': 3, 'utf8Start': 0, 'utf8EndExclusive': 5, 'occurrenceIndex': 0, 'occurrenceCountInFullField': 1, 'fullFieldSHA256': 'bf689656474a6dfd54ad4388161a25c2ea411940c4368369b55db196dfd7dff6', 'tokenSHA256': 'bf689656474a6dfd54ad4388161a25c2ea411940c4368369b55db196dfd7dff6', 'offsetUnit': 'Unicode code points, zero-based, end-exclusive'}, {'field': 'currentEnglish', 'token': 'Hebrew initialism (unexpanded): ש"ע', 'codepointStart': 0, 'codepointEndExclusive': 35, 'utf8Start': 0, 'utf8EndExclusive': 37, 'occurrenceIndex': 0, 'occurrenceCountInFullField': 1, 'fullFieldSHA256': '8e8672f7533363501c025af69825d31770f907a4dd05abab501947b2e328f6da', 'tokenSHA256': '8e8672f7533363501c025af69825d31770f907a4dd05abab501947b2e328f6da', 'offsetUnit': 'Unicode code points, zero-based, end-exclusive'}], 'after': [{'field': 'governingHebrew', 'token': 'ש"ע', 'codepointStart': 0, 'codepointEndExclusive': 3, 'utf8Start': 0, 'utf8EndExclusive': 5, 'occurrenceIndex': 0, 'occurrenceCountInFullField': 1, 'fullFieldSHA256': 'bf689656474a6dfd54ad4388161a25c2ea411940c4368369b55db196dfd7dff6', 'tokenSHA256': 'bf689656474a6dfd54ad4388161a25c2ea411940c4368369b55db196dfd7dff6', 'offsetUnit': 'Unicode code points, zero-based, end-exclusive'}, {'field': 'currentEnglish', 'token': '370 (ש"ע; “three hundred and seventy,” as expanded in Clothing, item 4).', 'codepointStart': 0, 'codepointEndExclusive': 72, 'utf8Start': 0, 'utf8EndExclusive': 78, 'occurrenceIndex': 0, 'occurrenceCountInFullField': 1, 'fullFieldSHA256': '45a607cb539494d8c73b3abc3ee3e87c9f833c2fd9c129722c237841896642a2', 'tokenSHA256': '45a607cb539494d8c73b3abc3ee3e87c9f833c2fd9c129722c237841896642a2', 'offsetUnit': 'Unicode code points, zero-based, end-exclusive'}]}, {'pointer': '/rows/62/requiredNotes/0/anchors', 'before': [{'field': 'governingHebrew', 'literalToken': 'בֶּגֶד שֶׁקֶר', 'occurrenceIndexZeroBased': 0, 'totalExactNonOverlappingOccurrences': 1, 'startCodePoint': 0, 'endCodePointExclusive': 13}, {'field': 'currentEnglish', 'literalToken': 'Garment — Falsehood', 'occurrenceIndexZeroBased': 0, 'totalExactNonOverlappingOccurrences': 1, 'startCodePoint': 0, 'endCodePointExclusive': 19}], 'after': [{'field': 'governingHebrew', 'literalToken': 'בֶּגֶד שֶׁקֶר', 'occurrenceIndexZeroBased': 0, 'totalExactNonOverlappingOccurrences': 1, 'startCodePoint': 0, 'endCodePointExclusive': 13}, {'field': 'currentEnglish', 'literalToken': 'Garment — falsehood (the Atbash wordplay in Clothing, item 5).', 'occurrenceIndexZeroBased': 0, 'totalExactNonOverlappingOccurrences': 1, 'startCodePoint': 0, 'endCodePointExclusive': 62}]}, {'pointer': '/rows/192/requiredNotes/0/anchors', 'before': [{'field': 'governingHebrew', 'text': 'שְׁאָר', 'occurrenceIndex': 0, 'codepointStart': 0, 'codepointEndExclusive': 6, 'utf8Start': 0, 'utf8EndExclusive': 12, 'fullFieldSHA256': 'd76af6e8048d85c2dcf06590fb5a0d55e1ebff5d751ec95bb83096cc7e96be93', 'tokenSHA256': 'bab92f8f70fefea9206bac66a0beb8e0c841daf66f120cfb407bbb3023f7e672'}, {'field': 'governingHebrew', 'text': 'ש ת א ב ר ש', 'occurrenceIndex': 0, 'codepointStart': 15, 'codepointEndExclusive': 26, 'utf8Start': 28, 'utf8EndExclusive': 45, 'fullFieldSHA256': 'd76af6e8048d85c2dcf06590fb5a0d55e1ebff5d751ec95bb83096cc7e96be93', 'tokenSHA256': '4db2e715682ac2df14cde019ee8d47b515546b081b9cec2c7cdc275936bac4b6'}, {'field': 'currentEnglish', 'text': 'Remainder', 'occurrenceIndex': 0, 'codepointStart': 0, 'codepointEndExclusive': 9, 'utf8Start': 0, 'utf8EndExclusive': 9, 'fullFieldSHA256': '90358d7fb24ad32585ce201b7611119edf0e2fb04c64a24a640cd1168c3a4005', 'tokenSHA256': '01cfff2f2306aeb92feffd2f1091115f01c7b2276c14072f1b75322b66370fbc'}, {'field': 'currentEnglish', 'text': 'ש ת א ב ר ש', 'occurrenceIndex': 0, 'codepointStart': 20, 'codepointEndExclusive': 31, 'utf8Start': 22, 'utf8EndExclusive': 39, 'fullFieldSHA256': '90358d7fb24ad32585ce201b7611119edf0e2fb04c64a24a640cd1168c3a4005', 'tokenSHA256': '4db2e715682ac2df14cde019ee8d47b515546b081b9cec2c7cdc275936bac4b6'}], 'after': [{'field': 'governingHebrew', 'text': 'שְׁאָר', 'occurrenceIndex': 0, 'codepointStart': 0, 'codepointEndExclusive': 6, 'utf8Start': 0, 'utf8EndExclusive': 12, 'fullFieldSHA256': 'd76af6e8048d85c2dcf06590fb5a0d55e1ebff5d751ec95bb83096cc7e96be93', 'tokenSHA256': 'bab92f8f70fefea9206bac66a0beb8e0c841daf66f120cfb407bbb3023f7e672'}, {'field': 'governingHebrew', 'text': 'ש ת א ב ר ש', 'occurrenceIndex': 0, 'codepointStart': 15, 'codepointEndExclusive': 26, 'utf8Start': 28, 'utf8EndExclusive': 45, 'fullFieldSHA256': 'd76af6e8048d85c2dcf06590fb5a0d55e1ebff5d751ec95bb83096cc7e96be93', 'tokenSHA256': '4db2e715682ac2df14cde019ee8d47b515546b081b9cec2c7cdc275936bac4b6'}, {'field': 'currentEnglish', 'text': 'שְׁאָר', 'occurrenceIndex': 0, 'codepointStart': 58, 'codepointEndExclusive': 64, 'utf8Start': 60, 'utf8EndExclusive': 72, 'fullFieldSHA256': '818ab1c2567c63329eb35bf777ab67441a15f5a1204040e6a4c543add52a25a9', 'tokenSHA256': 'bab92f8f70fefea9206bac66a0beb8e0c841daf66f120cfb407bbb3023f7e672'}, {'field': 'currentEnglish', 'text': 'ש→ת, א→ב, ר→ש', 'occurrenceIndex': 0, 'codepointStart': 75, 'codepointEndExclusive': 88, 'utf8Start': 90, 'utf8EndExclusive': 115, 'fullFieldSHA256': '818ab1c2567c63329eb35bf777ab67441a15f5a1204040e6a4c543add52a25a9', 'tokenSHA256': 'cda16c8e4e6ad69cc45194d2102ef3989e71d398e7d2d93fae70591dbd21b200'}]}]
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


def correction_predecessor(bank):
    require(sha(stable(CORRECTION_OPERATIONS)) == CORRECTION_OPERATIONS_PIN, 'Closed correction contract drift')
    previous = copy.deepcopy(bank)
    for op in reversed(CORRECTION_OPERATIONS):
        keys = op['pointer'].strip('/').split('/')
        target = previous
        for key in keys[:-1]:
            target = target[int(key)] if isinstance(target, list) else target[key]
        key = int(keys[-1]) if isinstance(target, list) else keys[-1]
        require(target[key] == op['after'], 'Exact correction successor operand drift')
        target[key] = copy.deepcopy(op['before'])
    return previous


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
    predecessor = correction_predecessor(bank)
    baseline = copy.deepcopy(predecessor)
    for index in (1,62,87,179):
        row, pins = predecessor['rows'][index-1], FINAL4_PINS[str(index)]
        require(sha(stable(row)) == pins['rowSHA256'], 'Exact final-four row drift')
        for key in ('en','englishStatus','origin','requiredNotes'):
            require(sha(stable(row[key])) == pins[key+'SHA256'], 'Exact final-four scalar drift')
        baseline['rows'][index-1].update(copy.deepcopy(FINAL4_ORIGINALS[str(index)]))
    require(sha(stable(baseline)) == BASELINE_BANK_VALUE_PIN, 'Immutable baseline362 bank drift')
    require(sha(stable([_binding(r) for r in baseline['rows']])) == BASELINE_SOURCE_BINDING_PIN, 'Immutable baseline362 source binding drift')
    require(sha(stable(predecessor)) == CORRECTION_PREDECESSOR_VALUE_PIN, 'Immutable correction predecessor bank drift')
    require(sha(stable([_binding(r) for r in predecessor['rows']])) == CORRECTION_PREDECESSOR_BINDING_PIN, 'Immutable correction predecessor binding drift')
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
    raw = read_asset(CORRECTION_ARCHIVE)
    require(isinstance(raw, bytes) and len(raw) == CORRECTION_ARCHIVE_PIN['bytes'] and sha(raw) == CORRECTION_ARCHIVE_PIN['sha256'], 'Correction history authentication failed')
    history = decode(raw)
    audience_safe(history)
    previous = correction_predecessor(bank)
    require(history['rows'] == [previous['rows'][i-1] for i in (62,63,193,358)] and history['textualDeltas'] + history['derivedBindingDeltas'] == CORRECTION_OPERATIONS and history['predecessorEditionSHA256'] == CORRECTION_PREDECESSOR_PIN and history['predecessorBankValueSHA256'] == CORRECTION_PREDECESSOR_VALUE_PIN, 'Correction historical custody drift')
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
    from aitzoas_topic_navigation import navigation
    nav = navigation(edition.rows)
    raw = {'readingNavigation':[nav[r['stableIndex']] for r in rows], 'bookId':BOOK,'part':'1','torah':str(section),'title':title,'hebrewTitle':he_title,'sourceUrl':source,'plainUrl':url,
           'editionSHA256':ASSET_PINS[BANK]['sha256'],'content':content,
           'sourceUnitsRole':'Exact stored fields for authentication; not a second reader body.',
           'segments':[dict(index=r['stableIndex'], **copy.deepcopy(r)) for r in rows]}
    # Fenced literal Markdown is safe even when stored fields contain HTML.
    fence = '`' * max(3, 1 + max((len(m.group()) for m in re.finditer(r'`+', content)), default=0))
    md = '# ' + title + '\n\n' + fence + 'text\n' + content + '\n' + fence + '\n'
    rendered = ''.join(f'<section id="segment-{r["stableIndex"]}"><span id="seg-{r["stableIndex"]}"></span><h2>{escape_exact(nav[r['stableIndex']]['label'])}</h2><a href="{escape_exact(nav[r['stableIndex']]['readingUrl'])}">Topic / reading location</a><pre dir="auto">{escape_exact(passage_text(r))}</pre></section>' for r in rows)
    page = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape_exact(title)+'</title><link rel="canonical" href="https://ajew.org'+source+'"><style>body{max-width:980px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.7}</style><header><h1>'+escape_exact(title)+'</h1><a href="/reader/aitzoas-yeshuroas/1/">40-topic book directory</a> · <a href="'+source+'">Reader</a> · <a href="index.txt">TXT</a> · <a href="index.md">Markdown</a> · <a href="index.json">Stored fields JSON</a></header><main>'+rendered+'</main></html>\n'
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
