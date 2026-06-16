#!/usr/bin/env python3
"""Fill ALL missing English across every book from Finished HTML files.
Uses anchor-based sync: existing EN segments → match in HTML → fill gaps sequentially.
"""

import os, re, json, glob

FINISHED = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/'
READER = '/root/ajew-org/public/reader/'

def strip_html(text):
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&quot;', '"').replace('&#39;', "'")
    text = text.replace('&mdash;', '\u2014').replace('&ndash;', '\u2013')
    text = text.replace('&nbsp;', ' ').replace('&rsquo;', '\u2019')
    text = text.replace('&lsquo;', '\u2018').replace('&rdquo;', '\u201D')
    text = text.replace('&ldquo;', '\u201C').replace('&hellip;', '\u2026')
    text = re.sub(r'&#x([0-9a-fA-F]+);', lambda m: chr(int(m.group(1), 16)), text)
    text = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_paragraphs_from_html(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()

    paras = []

    # Method 1: <div class="para">
    parts = html.split('<div class="para">')
    if len(parts) > 1:
        for part in parts[1:]:
            end = part.find('</div>')
            if end > 0:
                block = part[:end]
            else:
                block = part
            block = re.sub(r'<span class="source-ref">.*?</span>', '', block)
            block = re.sub(r'<span class="para-num">.*?</span>', '', block)
            block = re.sub(r'<span class="section-number">.*?</span>', '', block)
            text = strip_html(block)
            if len(text) > 15:
                paras.append(text)
        if paras:
            return paras

    # Method 2: <div class="section">
    parts = html.split('<div class="section">')
    if len(parts) > 1:
        for part in parts[1:]:
            end = part.find('</div>')
            if end > 0:
                block = part[:end]
            else:
                block = part
            block = re.sub(r'<span class="section-number">.*?</span>', '', block)
            block = re.sub(r'<span class="section-source">.*?</span>', '', block)
            text = strip_html(block)
            if len(text) > 15:
                paras.append(text)
        if paras:
            return paras

    # Method 3: <p> tags
    for m in re.finditer(r'<p[^>]*>(.*?)</p>', html, re.DOTALL):
        content = m.group(1)
        content = re.sub(r'<span onclick="tog\([^)]+\)"[^>]*>.*?</span>\s*', '', content, flags=re.DOTALL)
        content = re.sub(r'<span class="src">.*?</span>', '', content, flags=re.DOTALL)
        content = re.sub(r'<span class="source-ref">.*?</span>', '', content, flags=re.DOTALL)
        text = strip_html(content)
        if len(text) > 15 and not text.startswith('←') and not text.startswith('→') and not text.startswith('Back to'):
            paras.append(text)

    # Method 4: <h2>/<h3>/<h4> headings
    for m in re.finditer(r'<h[2-4][^>]*>(.*?)</h[2-4]>', html, re.DOTALL):
        text = strip_html(m.group(1))
        if len(text) > 10:
            paras.append(text)

    return paras

def normalize(text):
    return re.sub(r'[^a-zA-Z0-9\u0590-\u05FF]', '', (text or '')).lower()[:50]

def find_json_files(book_dir):
    files = []
    for root, dirs, filenames in os.walk(book_dir):
        for fn in filenames:
            if fn.endswith('.json') and fn != 'index.json' and fn != 'index-he.json':
                files.append(os.path.join(root, fn))
    # Sort numerically
    def sort_key(f):
        nums = re.findall(r'\d+', os.path.basename(f))
        parts = re.findall(r'\d+', f)
        return [int(n) for n in parts[-2:]] if len(parts) >= 2 else [0, int(nums[-1]) if nums else 0]
    return sorted(files, key=sort_key)

def process_book(book_id, finished_folders, label):
    book_dir = os.path.join(READER, book_id)
    if not os.path.isdir(book_dir):
        print(f'  {label}: reader dir not found ({book_id})')
        return 0, 0, 0

    # Collect all English paragraphs from HTML sources
    all_english = []
    for folder in finished_folders:
        full_path = os.path.join(FINISHED, folder)
        if os.path.isfile(full_path):
            all_english.extend(extract_paragraphs_from_html(full_path))
        elif os.path.isdir(full_path):
            html_files = sorted(glob.glob(os.path.join(full_path, '*.html')))
            for hf in html_files:
                all_english.extend(extract_paragraphs_from_html(hf))
        else:
            # Try .html extension
            alt = full_path + '.html'
            if os.path.isfile(alt):
                all_english.extend(extract_paragraphs_from_html(alt))

    if not all_english:
        print(f'  {label}: no English extracted from HTML')
        return 0, 0, 0

    # Build normalized index for anchor matching
    en_norm_map = {}
    for i, para in enumerate(all_english):
        norm = normalize(para)
        if len(norm) > 15 and norm not in en_norm_map:
            en_norm_map[norm] = i

    json_files = find_json_files(book_dir)
    if not json_files:
        print(f'  {label}: no JSON files found')
        return 0, 0, 0

    total_segs = 0
    before_en = 0
    new_matched = 0
    last_sync_idx = 0
    modified_files = set()

    for jf in json_files:
        with open(jf, 'r', encoding='utf-8') as f:
            data = json.load(f)

        segs = data.get('segments', [])
        if not segs:
            continue

        # Try to sync position using existing English anchor
        sync_found = False
        for seg in segs:
            en = (seg.get('en', '') or '').strip()
            if en:
                norm = normalize(en)
                if len(norm) > 15 and norm in en_norm_map:
                    anchor_pos = en_norm_map[norm]
                    # Find which segment index this is
                    seg_idx = segs.index(seg)
                    last_sync_idx = anchor_pos - seg_idx
                    if last_sync_idx < 0:
                        last_sync_idx = anchor_pos
                    sync_found = True
                    break

        file_changed = False
        local_idx = max(0, last_sync_idx)

        for seg in segs:
            total_segs += 1
            en = (seg.get('en', '') or '').strip()
            he = (seg.get('he', '') or '').strip()

            if en:
                before_en += 1
                local_idx += 1
                continue

            # Segment needs English
            if he and local_idx < len(all_english):
                seg['en'] = all_english[local_idx]
                new_matched += 1
                file_changed = True
                local_idx += 1

        last_sync_idx = local_idx

        if file_changed:
            data['hasEnglish'] = True
            with open(jf, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            modified_files.add(jf)

    after_en = before_en + new_matched
    if total_segs > 0:
        pct = round(after_en / total_segs * 100)
        before_pct = round(before_en / total_segs * 100)
        print(f'  {label}: {before_pct}% → {pct}% (+{new_matched} segs, {len(modified_files)} files) [{len(all_english)} EN paras]')
    return new_matched, len(modified_files), len(all_english)


# Book mappings: (reader_id, [finished_folders], label)
BOOK_MAP = [
    # Large gaps
    ('likutay-tefilos', ['Lekutay Tefilos 1', 'Likutay Tefilos 2'], 'Likutay Tefilos'),
    ('chayey-moharan', ['Chayay Moharan'], 'Chayey Moharan'),
    ('alim-litrufa', ['Ullim litrufa 1-88', 'Ullim litrufa 89-151', 'Ulim litrufa 152-226', 'Ulim litrufa 227-376', 'Ulim litrufa 377-'], 'Alim LiTrufa'),
    ('likutay-moharan', ['Likuaty Moharan 11-17'], 'Likutay Moharan'),
    ('yikra-dshabbata', ['Yikara diShabata'], 'Yikra DShabbata'),
    ('yisroel-saba', ['Yisroel Saba'], 'Yisroel Saba'),
    # Medium gaps
    ('michtevay-shmuel', ['Michtevay Shmuel 1 - 1-16', 'Michtevay Shmuel 1 - 17-', 'Michtevay Shmuel 2'], 'Michtevay Shmuel'),
    ('ebay-hanachal', ['Blossoms of the Stream'], 'Ebay HaNachal'),
    # Small gaps
    ('likutay-eitzos-basra', ['Likutay Aitzos Mahadura Basra'], 'LE Basra'),
    ('yemei-moharnat', ['Yimay Moharnat'], 'Yemei Moharnat'),
    ('likutay-eitzos', ['Likutay Aitzos Mahadura Basra'], 'Likutay Eitzos'),  # Basra may help for overlapping topics
    ('aitzoas-hamivooaroas', ['Aitzoas Hamivooaroas'], 'Eitzos HaMivuaros'),
    ('aitzoas-yeshuroas', ['Aitzoas Yeshuroas'], 'Eitzos Yesharos'),
    # Already 100% - fix hasEnglish flags only
    ('sichos-haran', ['Sichos Haran'], 'Sichos HaRan'),
    ('meshivas-nefesh', ['meshivas_nefesh'], 'Meshivas Nefesh'),
    ('yemei-hatlaos', ['yimai_hatlaos (1)'], 'Yemei HaTlaos'),
    ('kuntrass-hiskashrus', ['Kuntrass_Hiskashrus_LaTzadik'], 'Kuntrass Hiskashrus'),
    ('rimzei-hamaasiyos', ['Rimzay_HaMaaseyos'], 'Rimzei HaMaasiyos'),
    ('gevuros-shimshon', ['Gevuros Shimshon'], 'Gevuros Shimshon'),
    ('nachas-hashulchan', ['Nachas Hashulchan'], 'Nachas HaShulchan'),
    ('parparos-lechochma', ['Parparaos LaChuchmuh'], 'Parparos LeChochma'),
    ('zimras-haaretz', ['Zimras HaAretz'], 'Zimras HaAretz'),
    ('kokhvei-or', ['Koachvay Or'], 'Kokhvei Or'),
    ('yereach-haeitanim', ['Yerech HaAisunim'], 'Yereach HaEitanim'),
    ('kitzur-likutay-moharan', ['Kitzure lkm'], 'Kitzur LM'),
    ('otzar-hayirah', ['Oatzar volume 1', 'Oatzar 2', 'Oatzar 4', 'Oatzer volume Mem'], 'Otzar HaYirah'),
    # Nosson books
    ('nosson-by-מכתבי-ר--נתן-ב--ר-יה', ['Rabbi Nussun ben Rabbi Yehuda - 55', 'Rabbi Nussun ben Rabbi Yehuda 56-'], "R' Nussun"),
    ('nosson-by-קונטרס-הצירופים-עם-ה', ['Kuntrass Hatzairufim'], 'Kuntrass Hatzeirufim'),
    ('nosson-by-קונטרס-הצרופים', ['Kuntrass Hatzairufim'], 'Kuntrass Hatzeirufim 2'),
    # Misc
    ('misc-עצות-ישרות', ['Aitzoas Yeshuroas'], 'Eitzos Yesharos (misc)'),
]

print("=== Fill All English v2 ===\n")
grand_new = 0
grand_files = 0

for book_id, folders, label in BOOK_MAP:
    new_segs, mod_files, total_paras = process_book(book_id, folders, label)
    grand_new += new_segs
    grand_files += mod_files

print(f'\n=== GRAND TOTAL: {grand_new} new English segments in {grand_files} files ===')
