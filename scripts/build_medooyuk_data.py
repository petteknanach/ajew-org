#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build public/reader/medooyuk/<slug>.json for the Tikkun Korim + reader layer.

Input:
  --xml-dir   UXLC 2.5 XML per book (C.V. Kimball, tanach.us) — full pointed text
  --jsonl-dir sheva v0 render (one line per sheva-bearing word)
Output per book:
  {"book","slug","he","en","ch": { "<c>": { "<v>": {
      "t": [tokens...],          # display tokens: full <w> text (inline <x> UXLC
                                 #   markers removed, split halves rejoined) and
                                 #   qere <q> tokens (ketiv <k> pairs)
      "k": [0|1,...],            # 1 = token is a qere
      "m": [[ti,li,lb,qb],...]   # medooyuk marks; ti = 0-based DISPLAY token index
  }}}}

Engine alignment ground truth: render_tanach.py counts words as
[w.text for w in v.iter() if w.tag.endswith('w') and w.text] — i.e. w.text
truncated at any inline <x> child. wi is 1-based into that list; the k-th such
word maps to the k-th <w>-with-text display token. Each mark's rec['w'] is
verified (form_key equality) against that engine word before shipping.
"""
import argparse, json, os, sys, unicodedata
import xml.etree.ElementTree as ET

SLUGS = {
 'Genesis':'tanach-bereishit','Exodus':'tanach-shemos','Leviticus':'tanach-vayikra',
 'Numbers':'tanach-bamidbar','Deuteronomy':'tanach-devarim','Joshua':'tanach-yehoshua',
 'Judges':'tanach-shoftim','Samuel_1':'tanach-shmuel-a','Samuel_2':'tanach-shmuel-b',
 'Kings_1':'tanach-melachim-a','Kings_2':'tanach-melachim-b','Isaiah':'tanach-yeshayahu',
 'Jeremiah':'tanach-yirmiyahu','Ezekiel':'tanach-yechezkel','Hosea':'tanach-hoshea',
 'Joel':'tanach-yoel','Amos':'tanach-amos','Obadiah':'tanach-ovadya','Jonah':'tanach-yonah',
 'Micah':'tanach-michah','Nahum':'tanach-nachum','Habakkuk':'tanach-havakkuk',
 'Zephaniah':'tanach-tzefanya','Haggai':'tanach-chaggai','Zechariah':'tanach-zecharya',
 'Malachi':'tanach-malachi','Psalms':'tanach-tehillim','Proverbs':'tanach-mishlei',
 'Job':'tanach-iyov','Song_of_Songs':'tanach-shir-hashirim','Ruth':'tanach-rus',
 'Lamentations':'tanach-eicha','Ecclesiastes':'tanach-koheles','Esther':'tanach-esther',
 'Daniel':'tanach-daniel','Ezra':'tanach-ezra','Nehemiah':'tanach-nechemia',
 'Chronicles_1':'tanach-divrei-hayamim-a','Chronicles_2':'tanach-divrei-hayamim-b',
}
HE_NAMES = {
 'Genesis':'בְּרֵאשִׁית','Exodus':'שְׁמוֹת','Leviticus':'וַיִּקְרָא','Numbers':'בְּמִדְבַּר',
 'Deuteronomy':'דְּבָרִים','Joshua':'יְהוֹשֻׁעַ','Judges':'שׁוֹפְטִים','Samuel_1':'שְׁמוּאֵל א',
 'Samuel_2':'שְׁמוּאֵל ב','Kings_1':'מְלָכִים א','Kings_2':'מְלָכִים ב','Isaiah':'יְשַׁעְיָהוּ',
 'Jeremiah':'יִרְמְיָהוּ','Ezekiel':'יְחֶזְקֵאל','Hosea':'הוֹשֵׁעַ','Joel':'יוֹאֵל',
 'Amos':'עָמוֹס','Obadiah':'עֹבַדְיָה','Jonah':'יוֹנָה','Micah':'מִיכָה','Nahum':'נַחוּם',
 'Habakkuk':'חֲבַקּוּק','Zephaniah':'צְפַנְיָה','Haggai':'חַגַּי','Zechariah':'זְכַרְיָה',
 'Malachi':'מַלְאָכִי','Psalms':'תְּהִלִּים','Proverbs':'מִשְׁלֵי','Job':'אִיּוֹב',
 'Song_of_Songs':'שִׁיר הַשִּׁירִים','Ruth':'רוּת','Lamentations':'אֵיכָה',
 'Ecclesiastes':'קֹהֶלֶת','Esther':'אֶסְתֵּר','Daniel':'דָּנִיֵּאל','Ezra':'עֶזְרָא',
 'Nehemiah':'נְחֶמְיָה','Chronicles_1':'דִּבְרֵי הַיָּמִים א','Chronicles_2':'דִּבְרֵי הַיָּמִים ב',
}

def form_key(word):
    """Same normalization as render_tanach.py form_key."""
    out = []
    for ch in unicodedata.normalize('NFC', word):
        cp = ord(ch)
        if 0x05D0 <= cp <= 0x05FF or cp == 0x05BE:
            out.append(ch)
        elif 0x05B0 <= cp <= 0x05BC or cp == 0x05C1 or cp == 0x05C2 or cp == 0x05C7:
            out.append(ch)
    return ''.join(out)

def book_path(xml_dir, stem):
    for cand in (os.path.join(xml_dir, stem + '.xml'),
                 os.path.join(xml_dir, stem.lower() + '.xml'),
                 os.path.join(os.path.dirname(xml_dir), stem + '.xml'),
                 os.path.join(os.path.dirname(xml_dir), stem.lower() + '.xml')):
        if os.path.exists(cand):
            return cand
    raise FileNotFoundError(stem)

def verses_of(path):
    """Yield (chapter, verse, display_tokens, kflags, engine_words, flags, L).

    engine_words mirrors render_tanach.py verses_of exactly:
        [w.text for w in v.iter() if w.tag.endswith('w') and w.text]
    display tokens: one per <w> (full text: .text + inline <s> letter content
    + tails of inline <x> children, dropping the <x> marker content) and one
    per <q> (qere).

    flags: breaks are POSITIONAL: b = [[ti, 'p'|'s'|'n8']] where ti = number of
    tokens before the break and kind is petucha <pe/>, setuma <samekh/>, or
    reversed nun <reversednun/>; ti may equal len(toks) (verse-final break) or
    be smaller (the rare mid-verse parsha break, e.g. Deut 2:8, 5:21).
    L: [[tok_index, letter_index, 'lg'|'sm'|'sus']] from <s t="..."> wrapped
    letters; letter_index counts base consonants (U+05D0-05EA) in the display
    token, same indexing as the sheva marks' li.
    """
    root = ET.parse(path).getroot()
    for c in root.iter():
        if not c.tag.endswith('c') or c.get('n') is None:
            continue
        cn = int(c.get('n'))
        for v in c:
            if not v.tag.endswith('v') or v.get('n') is None:
                continue
            toks, kflags, engine_words, L, b = [], [], [], [], []
            for el in v:  # direct children: w, q, pe, samekh, reversednun, x, note
                if not isinstance(el.tag, str):
                    continue
                if el.tag.endswith('w'):
                    txt = el.text or ''
                    li = sum(1 for ch in txt if 0x5D0 <= ord(ch) <= 0x5EA)
                    for ch in el:
                        if not isinstance(ch.tag, str):
                            continue
                        if ch.tag.endswith('s'):
                            kind = {'large': 'lg', 'small': 'sm',
                                    'suspended': 'sus'}.get(ch.get('t') or '')
                            if kind and ch.text:
                                L.append([len(toks), li, kind])
                            txt += (ch.text or '') + (ch.tail or '')
                        elif ch.tag.endswith('x'):
                            txt += ch.tail or ''
                        li = sum(1 for ch2 in txt if 0x5D0 <= ord(ch2) <= 0x5EA)
                    if el.text:                       # engine counts only these
                        engine_words.append(el.text)
                    if txt:
                        toks.append(txt); kflags.append(0)
                elif el.tag.endswith('q'):
                    if el.text:
                        toks.append(el.text); kflags.append(1)
                elif el.tag.endswith('pe'):
                    b.append([len(toks), 'p'])
                elif el.tag.endswith('samekh'):
                    b.append([len(toks), 's'])
                elif el.tag.endswith('reversednun'):
                    b.append([len(toks), 'n8'])
            yield cn, int(v.get('n')), toks, kflags, engine_words, b, L

def build_book(book, xml_dir, jsonl_dir, out_dir):
    path = book_path(xml_dir, book)
    marks = {}
    jl = os.path.join(jsonl_dir, f'tanach_{book}.jsonl')
    n_marks = 0
    if os.path.exists(jl):
        for line in open(jl, encoding='utf-8'):
            rec = json.loads(line)
            marks.setdefault((rec['c'], rec['v']), []).append(rec)
    out_ch = {}
    mismatch = 0
    examples = []
    for c, v, toks, kflags, engine_words, b, L in verses_of(path):
        m = []
        for rec in marks.get((c, v), []):
            wi = rec['wi']
            if wi - 1 < len(engine_words):
                eng = engine_words[wi - 1]
                if form_key(rec['w']) == form_key(eng):
                    # display index of this engine word = index of the
                    # (number of <w>-with-text tokens seen so far)-th <w> token
                    di = -1; seen = 0
                    for i, kf in enumerate(kflags):
                        if kf == 0:
                            seen += 1
                            if seen == wi:
                                di = i; break
                    if di >= 0:
                        for s in rec['recs']:
                            m.append([di, s['li'], s['lb'], 1 if s.get('qb') else 0])
                    else:
                        mismatch += 1; examples.append((c, v, wi, rec['w'], None, 'no-di'))
                else:
                    mismatch += 1; examples.append((c, v, wi, rec['w'], eng, 'letters'))
            else:
                mismatch += 1; examples.append((c, v, wi, rec['w'], None, 'range'))
        out_ch[c] = out_ch.get(c, {})
        vd = {'t': toks, 'k': kflags, 'm': m}
        if b:
            vd['b'] = b
        if L:
            vd['L'] = L
        out_ch[c][v] = vd
        n_marks += len(m)
    data = {'book': book, 'slug': SLUGS[book], 'he': HE_NAMES[book],
            'en': book.replace('_1', ' 1').replace('_2', ' 2').replace('_', ' '),
            'ch': out_ch}
    op = os.path.join(out_dir, SLUGS[book] + '.json')
    with open(op, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    return op, len(out_ch), n_marks, mismatch, examples

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--xml-dir', default='/root/sheva_v0/books')
    ap.add_argument('--jsonl-dir', default='/root/sheva_render')
    ap.add_argument('--out-dir', default='/root/ajew-org/public/reader/medooyuk')
    args = ap.parse_args()
    os.makedirs(args.out_dir, exist_ok=True)
    total_m = 0; total_mm = 0
    for book in sorted(SLUGS):
        op, chs, ms, mm, ex = build_book(book, args.xml_dir, args.jsonl_dir, args.out_dir)
        total_m += ms; total_mm += mm
        print(f'{book:16} {chs:3} ch  marks={ms:6} mm={mm:4}  {os.path.getsize(op)//1024} KB')
        for e in ex[:3]:
            print('   MM:', e)
    print(f'TOTAL marks={total_m} mismatches={total_mm}')
    if total_mm:
        sys.exit(f'FATAL: {total_mm} mark/word mismatches - do not ship')

if __name__ == '__main__':
    main()
