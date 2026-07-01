#!/usr/bin/env python3
"""Import Likutay Halachos Volume 3 (Birchas HaShachar) from paired DOCX files.

Targets website Orach Chaim A reader files that currently represent Birchas HaShachar:
- halacha-25: Birchas HaShachar 1
- halacha-26: Birchas HaShachar 2 reference note
- halacha-27: Birchas HaShachar 3
- halacha-28: Birchas HaShachar 5

Halacha 4 is a reference-only entry in the DOCX (included in Tefillin 6), so it is added
independently to the summaries/study-aid index rather than replacing a reader content file.
"""
import json
import re
import zipfile
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
EN_DOCX = Path('/mnt/c/Users/Pettek/Downloads/Likutay Halachos English volume 3 - full index 259 pages - 16 Tamuz.docx')
HE_DOCX = Path('/mnt/c/Users/Pettek/Downloads/Likutay Halachos Hebrew volume 3 Birchas Hashachar - 16 Tamuz.docx')
OUT_DIR = REPO / 'public/reader/likutay-halachos/part-1'
SUMMARY_PATH = REPO / 'public/reader/likutay-halachos/summaries/index.json'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
NUM_RE = re.compile(r'^\u200f?\[(\d+)\]\s*(.*)$', re.S)
NIKUD_RE = re.compile(r'[\u0591-\u05C7]')
HEADING_EN_RE = re.compile(r'^Laws of the Morning Blessings — Halacha (\d+)\s*$')
HEADING_HE_RE = re.compile(r'^\u200f?הלכות ברכת השחר — הלכה ([אבגדה])\s*$')
HE_LETTER_TO_NUM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5}

TARGETS = {
    1: OUT_DIR / 'halacha-25.json',
    2: OUT_DIR / 'halacha-26.json',
    3: OUT_DIR / 'halacha-27.json',
    5: OUT_DIR / 'halacha-28.json',
}
EN_TITLES = {
    1: 'Laws of the Morning Blessings — Halacha 1',
    2: 'Laws of the Morning Blessings — Halacha 2',
    3: 'Laws of the Morning Blessings — Halacha 3',
    4: 'Laws of the Morning Blessings — Halacha 4',
    5: 'Laws of the Morning Blessings — Halacha 5',
}
HE_TITLES = {
    1: 'ברכת השחר א',
    2: 'ברכת השחר ב',
    3: 'ברכת השחר ג',
    4: 'ברכת השחר ד',
    5: 'ברכת השחר ה',
}

def strip_nikud(text: str) -> str:
    return NIKUD_RE.sub('', unicodedata.normalize('NFC', text)).replace('\u200f','').strip()

def docx_paragraphs(path: Path):
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out = []
    for p in root.iter(W + 'p'):
        txt = ''.join((t.text or '') for t in p.iter(W + 't'))
        txt = re.sub(r'\s+', ' ', txt).strip()
        if not txt:
            continue
        style = ''
        ppr = p.find(W + 'pPr')
        if ppr is not None:
            ps = ppr.find(W + 'pStyle')
            if ps is not None:
                style = ps.get(W + 'val') or ''
        out.append({'text': txt, 'style': style})
    return out

def collect_en_content(paras):
    current = None
    out = {i: {} for i in range(1, 6)}
    refs = {}
    for p in paras:
        text, style = p['text'], p['style']
        if style == 'Heading1':
            m = HEADING_EN_RE.match(text)
            if m:
                current = int(m.group(1)); continue
            if text.startswith('Translator') or text.startswith('Expanded') or text.startswith('Index'):
                current = None; continue
        if current and style == 'LHReferenceNote':
            refs[current] = text
        if current:
            m = NUM_RE.match(text)
            if m:
                out[current][int(m.group(1))] = m.group(2).strip()
    return out, refs

def collect_he_content(paras):
    current = None
    out = {i: {} for i in range(1, 6)}
    refs = {}
    for p in paras:
        text, style = p['text'], p['style']
        if style == 'Heading1':
            m = HEADING_HE_RE.match(text)
            if m:
                current = HE_LETTER_TO_NUM[m.group(1)]; continue
        if current and style == 'LHRefHebrew':
            refs[current] = text.replace('\u200f','').strip()
        if current and style == 'LHBodyHebrew':
            m = NUM_RE.match(text)
            if m:
                out[current][int(m.group(1))] = m.group(2).strip()
    return out, refs

def collect_study_sections(paras):
    sections = {}
    current = None
    section_type = None
    cur_head = None
    cur_paras = []
    def flush_sub():
        nonlocal cur_head, cur_paras, current, section_type
        if current and section_type and cur_head:
            sections.setdefault(current, {}).setdefault(section_type, []).append({'heading': cur_head, 'paragraphs': cur_paras[:]})
        cur_head = None; cur_paras = []
    for p in paras:
        text, style = p['text'], p['style']
        if style == 'Heading1':
            flush_sub()
            m = re.match(r"Translator's Summary — Halacha (\d+)$", text)
            if m:
                current = int(m.group(1)); section_type = 'Translator Summary'; cur_head = 'Overview'; cur_paras=[]; continue
            m = re.match(r'Expanded Study Aid — Halacha (\d+)$', text)
            if m:
                current = int(m.group(1)); section_type = 'Expanded Study Aid'; cur_head = 'Study Aid'; cur_paras=[]; continue
            current = None; section_type = None; continue
        if current and section_type:
            if style in {'KDPHeaderReference'}:
                continue
            if style in {'LHStudySubheading','LHDiagramHeading'}:
                flush_sub(); cur_head = text; cur_paras=[]; continue
            if text and not text.startswith('Overview and study aid'):
                cur_paras.append(text)
    flush_sub()
    return sections

def make_ref_json(hnum, he_ref, en_ref, existing):
    seg = {'index': hnum * 100, 'he': strip_nikud(he_ref), 'en': en_ref, 'he_nikud': he_ref}
    data = existing.copy()
    data.update({
        'title': EN_TITLES[hnum],
        'hebrewTitle': HE_TITLES[hnum],
        'segments': [seg],
        'totalParagraphs': 1,
        'hasEnglish': True,
        'hasNikud': True,
    })
    data['navigation'] = existing.get('navigation', {})
    return data

def import_reader():
    en, en_refs = collect_en_content(docx_paragraphs(EN_DOCX))
    he, he_refs = collect_he_content(docx_paragraphs(HE_DOCX))
    report = []
    for hnum, path in TARGETS.items():
        existing = json.load(open(path, encoding='utf8'))
        if hnum in (2,):
            data = make_ref_json(hnum, he_refs[hnum], en_refs[hnum], existing)
        else:
            e_nums = set(en[hnum])
            h_nums = set(he[hnum])
            if e_nums != h_nums:
                raise SystemExit(f'number mismatch h{hnum}: en-only={sorted(e_nums-h_nums)[:20]} he-only={sorted(h_nums-e_nums)[:20]}')
            segments = []
            for n in sorted(e_nums):
                he_nikud = he[hnum][n]
                segments.append({'index': n, 'he': strip_nikud(he_nikud), 'en': en[hnum][n], 'he_nikud': he_nikud})
            data = existing.copy()
            data.update({
                'title': EN_TITLES[hnum],
                'hebrewTitle': HE_TITLES[hnum],
                'segments': segments,
                'totalParagraphs': len(segments),
                'hasEnglish': True,
                'hasNikud': True,
            })
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
        report.append((path.name, hnum, len(data['segments']), data['segments'][0]['index'], data['segments'][-1]['index']))
    return report, en_refs, he_refs, collect_study_sections(docx_paragraphs(EN_DOCX))

def update_index():
    idx_path = OUT_DIR / 'index.json'
    idx = json.load(open(idx_path, encoding='utf8'))
    updates = {
        25: (EN_TITLES[1], HE_TITLES[1], len(json.load(open(OUT_DIR/'halacha-25.json',encoding='utf8'))['segments'])),
        26: (EN_TITLES[2], HE_TITLES[2], len(json.load(open(OUT_DIR/'halacha-26.json',encoding='utf8'))['segments'])),
        27: (EN_TITLES[3], HE_TITLES[3], len(json.load(open(OUT_DIR/'halacha-27.json',encoding='utf8'))['segments'])),
        28: (EN_TITLES[5], HE_TITLES[5], len(json.load(open(OUT_DIR/'halacha-28.json',encoding='utf8'))['segments'])),
    }
    for item in idx['torahs']:
        n = item['number']
        if n in updates:
            item['title'], item['hebrewTitle'], item['paragraphs'] = updates[n]
            item['hasEnglish'] = True
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

def summary_item(hnum, torah, study, en_refs=None, he_refs=None):
    en_refs = en_refs or {}
    he_refs = he_refs or {}
    sections = []
    if hnum in (2,4):
        sections.append({'heading': 'Reference Note', 'paragraphs': [en_refs.get(hnum,'')]})
        sections.append({'heading': 'Hebrew Reference', 'paragraphs': [he_refs.get(hnum,'')]})
    for kind, blocks in study.get(hnum, {}).items():
        sections.append({'heading': kind, 'paragraphs': []})
        sections.extend(blocks)
    return {
        'id': f'lh-summary-1-birchas-hashachar-{hnum}',
        'book': 'likutay-halachos',
        'part': 1 if torah else None,
        'torah': torah,
        'title': f'{EN_TITLES[hnum]} — Summary and Study Aid',
        'hebrewTitle': HE_TITLES[hnum],
        'readerUrl': f'/reader/likutay-halachos/1/{torah}' if torah else '/reader/likutay-halachos/1/23',
        'summaryUrl': f'/reader/likutay-halachos/summaries#birchas-hashachar-{hnum}',
        'sections': sections,
        'intro': ['Translator summary and expanded study aid from the Volume 3 English DOCX.']
    }

def update_summaries(study, en_refs, he_refs):
    data = json.load(open(SUMMARY_PATH, encoding='utf8'))
    old = [it for it in data['items'] if not str(it.get('id','')).startswith('lh-summary-1-birchas-hashachar-')]
    # existing reader routes for Birchas HaShachar volume 3: 25, 26, 27, 28 (halacha 5). Halacha 4 is independent/reference-only.
    new = [
        summary_item(1, 25, study, en_refs, he_refs),
        summary_item(2, 26, study, en_refs, he_refs),
        summary_item(3, 27, study, en_refs, he_refs),
        summary_item(4, None, study, en_refs, he_refs),
        summary_item(5, 28, study, en_refs, he_refs),
    ]
    data['items'] = old + new
    data['count'] = len(data['items'])
    data['description'] = 'Study summaries for Likutay Halachos, Orach Chaim A, prepared from the KDP publication drafts including Volumes 1–3.'
    SUMMARY_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

if __name__ == '__main__':
    report, en_refs, he_refs, study = import_reader()
    update_index()
    update_summaries(study, en_refs, he_refs)
    print('Imported reader files:')
    for row in report:
        print(row)
    print('Study sections:', {k: {kk: len(vv) for kk,vv in v.items()} for k,v in study.items()})
