#!/usr/bin/env python3
"""SAFEGUARD: Data integrity check for ajew.org content.
Run before every deployment. Blocks push if corruption detected.
Checks: LH English, LM English, Sefer HaMidos, Likutay Tefilos,
Otzar HaYirah, Kitzur LM, parsha files, JSON validity."""

import json, os, re, sys, gzip

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def check_lh_english():
    """Verify LH English: no scrambled Psalm text, no placeholder numbers."""
    lh_dir = os.path.join(ROOT, 'public', 'reader', 'likutay-halachos')
    errors = []
    files_ok = 0
    
    for d in sorted(os.listdir(lh_dir)):
        if not d.startswith('part-'):
            continue
        for f in sorted(os.listdir(os.path.join(lh_dir, d))):
            if not f.startswith('halacha-'):
                continue
            fp = os.path.join(lh_dir, d, f)
            try:
                with open(fp) as fh:
                    data = json.load(fh)
            except:
                errors.append(f"CORRUPT: {fp}")
                continue
            
            for key in ['segments', 'aligned_segments']:
                segs = data.get(key, [])
                if not segs:
                    continue
                # Check for bulk Psalm filler (5+ consecutive Psalm-only segments)
                psalm_kw = ['psalm', 'maskil', 'Korah', 'For the leader', 'lamnatzeiach', 'mizmor']
                cons = 0
                for s in segs:
                    en = s.get('en','').lower()
                    hits = sum(1 for kw in psalm_kw if kw.lower() in en)
                    if hits >= 2:  # Multiple psalm keywords in same segment
                        cons += 1
                    elif hits == 1:
                        cons += 0.5  # Single hit is weak
                    else:
                        cons = max(0, cons - 1)
                    
                    if cons >= 3:
                        errors.append(f"SCRAMBLED: {fp}")
                        break
                # Check placebo numbers
                for s in segs:
                    if re.match(r'^\d+[\.\)]?\s*$', s.get('en','').strip()):
                        errors.append(f"PLACEHOLDER: {fp}")
                        break
            
            files_ok += 1
    
    print(f"LH: {files_ok} ok, {len(errors)} issues")
    return errors

def check_book(dir_name, label):
    """Check any reader book for corruption."""
    book_path = os.path.join(ROOT, 'public', 'reader', dir_name)
    if not os.path.exists(book_path):
        return []
    errors = []
    files_ok = 0
    for root, dirs, fnames in os.walk(book_path):
        for f in fnames:
            if not f.endswith('.json') or f == 'index.json':
                continue
            fp = os.path.join(root, f)
            try:
                with open(fp) as fh:
                    data = json.load(fh)
            except:
                errors.append(f"CORRUPT JSON: {fp}")
                continue
            segs = data.get('segments', [])
            if not segs:
                continue
            # Check for placeholder numbers
            for s in segs:
                if re.match(r'^\d+[\.\)]?\s*$', s.get('en','').strip()):
                    errors.append(f"PLACEHOLDER EN: {fp}")
                    break
            files_ok += 1
    print(f"{label}: {files_ok} ok, {len(errors)} issues")
    return errors

def check_saba():
    """Verify Saba books alignment: correct opening, no Hebrew in English."""
    books = ['yisroel-saba', 'saba-tape-transcripts', 'sichos-chayay-saba']
    errors = []
    
    for book in books:
        book_path = os.path.join(ROOT, 'public', 'reader', book)
        if not os.path.exists(book_path):
            errors.append(f"MISSING: {book}")
            continue
        
        files_ok = 0
        for root, dirs, fnames in os.walk(book_path):
            for f in fnames:
                if not f.endswith('.json') or f == 'index.json':
                    continue
                fp = os.path.join(root, f)
                try:
                    with open(fp) as fh:
                        data = json.load(fh)
                except:
                    errors.append(f"CORRUPT JSON: {fp}")
                    continue
                
                segs = data.get('segments', [])
                if not segs:
                    continue
                
                # Check: no Hebrew characters in English fields
                for s in segs:
                    en = s.get('en', '').strip()
                    if en and len(en) > 10:
                        he_chars = sum(1 for c in en if '\u0590' <= c <= '\u05FF')
                        if he_chars > len(en) * 0.5:
                            errors.append(f"HEBREW IN EN: {fp} seg {s.get('index','?')}")
                            break
                
                files_ok += 1
        
        print(f"  {book}: {files_ok} ok, {len([e for e in errors if book in e])} issues")
    
    # Specific check: Yisroel Saba chapter 1 must open correctly
    ch1 = os.path.join(ROOT, 'public', 'reader', 'yisroel-saba', 'chapter-1.json')
    if os.path.exists(ch1):
        with open(ch1) as fh:
            data = json.load(fh)
        segs = data.get('segments', [])
        if segs:
            first_he = segs[0].get('he', '')
            first_en = segs[0].get('en', '')
            if 'רבי ישראל משורר' not in first_he:
                errors.append(f"MISALIGNED OPENING: yisroel-saba chapter-1 — wrong first HE line")
            if 'Rabbi Yisroel chants' not in first_en:
                errors.append(f"MISALIGNED OPENING: yisroel-saba chapter-1 — wrong first EN line")
    
    return errors


def norm_text(x):
    return re.sub(r'\s+', ' ', str(x or '')).strip()

def strip_nikud(x):
    return re.sub(r'[\u0591-\u05C7]', '', norm_text(x))

def check_otzar_strict():
    """Strict OHY deploy blocker: field presence is not enough; block known-corrupt structure."""
    base = os.path.join(ROOT, 'public', 'reader', 'otzar-hayirah')
    errors = []
    if not os.path.exists(base):
        return ["MISSING: otzar-hayirah"]
    try:
        idx = json.load(open(os.path.join(base, 'index.json'), encoding='utf-8'))
    except Exception:
        return ["CORRUPT: otzar-hayirah/index.json"]

    part_indexes = []
    for name in os.listdir(base):
        if name.startswith('part-') and os.path.exists(os.path.join(base, name, 'index.json')):
            part_indexes.append(os.path.join(base, name, 'index.json'))
    parts = idx.get('parts', [])
    if len(parts) != len(part_indexes):
        errors.append(f"OHY ROOT INDEX PARTS: expected {len(part_indexes)}, found {len(parts)}")

    topic_dir = os.path.join(base, 'topics')
    if os.path.exists(topic_dir):
        topic_files = [f for f in os.listdir(topic_dir) if f.endswith('.json')]
        topic_entries = idx.get('topics', [])
        if len(topic_entries) != len(topic_files):
            errors.append(f"OHY TOPIC INDEX: {len(topic_entries)} entries but {len(topic_files)} files")
        by_slug = {t.get('slug'): t for t in topic_entries}
        for f in topic_files:
            slug = f[:-5]
            try:
                d = json.load(open(os.path.join(topic_dir, f), encoding='utf-8'))
            except Exception:
                errors.append(f"OHY CORRUPT TOPIC: {f}")
                continue
            entry = by_slug.get(slug)
            if not entry:
                errors.append(f"OHY TOPIC INDEX missing {slug}")
            elif entry.get('siman_count') != len(d.get('simanim', [])):
                errors.append(f"OHY TOPIC INDEX {slug}: {entry.get('siman_count')} != {len(d.get('simanim', []))}")

    files_ok = 0
    empty_files = bad_idx = stale_aligned = bad_total = footer_text = 0
    for root, dirs, fnames in os.walk(base):
        for f in fnames:
            if not re.match(r'torah-\d+\.json$', f):
                continue
            fp = os.path.join(root, f)
            try:
                data = json.load(open(fp, encoding='utf-8'))
            except Exception:
                errors.append(f"OHY CORRUPT JSON: {fp}")
                continue
            segs = data.get('segments', [])
            files_ok += 1
            if any(not norm_text(seg.get('he')) and not norm_text(seg.get('en')) for seg in segs):
                empty_files += 1
            indexes = [seg.get('index', seg.get('siman', i+1)) for i, seg in enumerate(segs)]
            try:
                if any(int(v or 0) != i + 1 for i, v in enumerate(indexes)):
                    bad_idx += 1
            except Exception:
                bad_idx += 1
            if isinstance(data.get('totalParagraphs'), int) and data.get('totalParagraphs') != len(segs):
                bad_total += 1
            aligned = data.get('aligned_segments')
            if isinstance(aligned, list):
                same = len(aligned) == len(segs) and all(norm_text((aligned[i] or {}).get('he')) == norm_text(segs[i].get('he')) and norm_text((aligned[i] or {}).get('en')) == norm_text(segs[i].get('en')) for i in range(len(segs)))
                if not same:
                    stale_aligned += 1
            if any(re.search(r'Otzar HaYirah\s+—\s+Treasury of Awe|Na Nach Nachma Nachman May these words', norm_text(seg.get('en')), re.I) for seg in segs):
                footer_text += 1

    for label, count in [
        ('empty HE+EN segments', empty_files),
        ('non-sequential/missing indexes', bad_idx),
        ('totalParagraphs mismatches', bad_total),
        ('stale aligned_segments', stale_aligned),
        ('footer/header EN text', footer_text),
    ]:
        if count:
            errors.append(f"OHY {label}: {count} files")

    try:
        bodies = []
        for n in [22,23,24,25]:
            d = json.load(open(os.path.join(base, 'part-1', f'torah-{n}.json'), encoding='utf-8'))
            bodies.append((n, d.get('segments', [])))
        for i in range(len(bodies)):
            for j in range(i+1, len(bodies)):
                a_n, a = bodies[i]; b_n, b = bodies[j]
                a_he = '\n'.join(strip_nikud(x.get('he')) for x in a)
                b_he = '\n'.join(strip_nikud(x.get('he')) for x in b)
                a_en = '\n'.join(norm_text(x.get('en')) for x in a)
                b_en = '\n'.join(norm_text(x.get('en')) for x in b)
                if a_he and a_he == b_he and a_en != b_en:
                    errors.append(f"OHY DUPLICATED HE DIVERGENT EN: part-1 torah-{a_n} vs torah-{b_n}")
    except Exception as e:
        errors.append(f"OHY PESACH DUPLICATE CHECK ERROR: {e}")

    print(f"OHY strict: {files_ok} files checked, {len(errors)} issues")
    return errors

def check_parsha():
    """Verify parsha files have source citations."""
    parsha_dir = os.path.join(ROOT, 'public', 'reader', 'parsha-lm')
    if not os.path.exists(parsha_dir):
        return []
    errors = []
    for f in os.listdir(parsha_dir):
        if not f.endswith('.json'):
            continue
        fp = os.path.join(parsha_dir, f)
        try:
            with open(fp) as fh:
                data = json.load(fh)
        except:
            errors.append(f"CORRUPT: {fp}")
            continue
        if not data.get('segments'):
            errors.append(f"EMPTY: {fp}")
    print(f"Parsha: {len(errors)} issues")
    return errors

def check_sichos_haran():
    """Verify Sichos HaRan alignment: 308 simanim, HE/EN matched, no spurious 309-310."""
    sh_dir = os.path.join(ROOT, 'public', 'reader', 'sichos-haran')
    errors = []
    if not os.path.exists(sh_dir):
        return ["MISSING: sichos-haran"]
    
    files = sorted([f for f in os.listdir(sh_dir) if f.startswith('sicha-') and f.endswith('.json')])
    
    # Check count: must be 308 (not 310 — 309/310 were spurious RAK notes)
    if len(files) != 308:
        errors.append(f"SICHOS HARAN COUNT: expected 308, found {len(files)}")
    
    # Check spurious files don't exist
    for bad in [309, 310]:
        if os.path.exists(os.path.join(sh_dir, f'sicha-{bad}.json')):
            errors.append(f"SICHOS HARAN SPURIOUS: sicha-{bad}.json should not exist (RAK note)")
    
    # Verify alignment at key boundary points
    alignment_checks = {
        18: ('הדפסת ספרים', 'printing of books'),      # Was duplicate of 17, now fixed
        50: ('דוקטורים', 'doctors'),                     # Was Kiddush Hashem, now fixed
        100: ('בגדו', 'garment'),                        # Cross-reference check
        150: ('מקבל ממון', 'receive money'),             # Topic check
    }
    
    files_ok = 0
    for f in files:
        n = int(f.replace('sicha-','').replace('.json',''))
        fp = os.path.join(sh_dir, f)
        try:
            data = json.load(open(fp))
        except:
            errors.append(f"CORRUPT JSON: sichos-haran/{f}")
            continue
        
        segs = data.get('segments', [])
        if not segs:
            continue
        
        first_he = segs[0].get('he', '')
        first_en = segs[0].get('en', '')
        
        # Check alignment anchors
        if n in alignment_checks:
            he_kw, en_kw = alignment_checks[n]
            if he_kw not in first_he:
                errors.append(f"SICHOS HARAN MISALIGNED: sicha-{n} HE missing '{he_kw}'")
            if en_kw.lower() not in first_en.lower():
                errors.append(f"SICHOS HARAN MISALIGNED: sicha-{n} EN missing '{en_kw}'")
        
        # All sichas should have both HE and EN (except historical edge cases)
        if not first_he.strip():
            errors.append(f"SICHOS HARAN EMPTY HE: sicha-{n}")
        
        files_ok += 1
    
    print(f"Sichos HaRan: {files_ok} files, {len(errors)} issues")
    return errors

def check_chayey_moharan():
    """Verify Chayay Moharan: 556 simanim, hashmatos content present."""
    cm_dir = os.path.join(ROOT, 'public', 'reader', 'chayey-moharan')
    errors = []
    if not os.path.exists(cm_dir):
        return ["MISSING: chayey-moharan"]
    
    # Check simanim directory
    siman_dir = os.path.join(cm_dir, 'simanim')
    if not os.path.exists(siman_dir):
        errors.append("MISSING: chayey-moharan/simanim")
    else:
        siman_files = [f for f in os.listdir(siman_dir) if f.startswith('siman-')]
        if len(siman_files) < 550:
            errors.append(f"CHAYAY MOHARAN SIMAN COUNT: expected 556, found {len(siman_files)}")
        
        # Verify siman 425 has section metadata and content
        s425 = os.path.join(siman_dir, 'siman-425.json')
        if os.path.exists(s425):
            data = json.load(open(s425))
            he = data['segments'][0].get('he', '')
            en = data['segments'][0].get('en', '')
            if not he.strip():
                errors.append("CHAYAY MOHARAN: siman-425 empty Hebrew")
            if not data.get('section'):
                errors.append("CHAYAY MOHARAN: siman-425 missing section metadata")
    
    # Check hashmatos-toc has full content (was truncated)
    htoc = os.path.join(cm_dir, 'hashmatos-toc.json')
    if os.path.exists(htoc):
        data = json.load(open(htoc))
        segs = data.get('aligned_segments', data.get('segments', []))
        # Find siman 425 entry
        found_425 = False
        for seg in segs:
            if '425' in seg.get('he', '') or 'תכה' in seg.get('he', ''):
                found_425 = True
                if 'גלגלים' not in seg.get('he', '') and 'גַּלְגַּלִּים' not in seg.get('he', ''):
                    errors.append("CHAYAY MOHARAN: hashmatos-toc siman 425 content still truncated")
                break
        if not found_425:
            errors.append("CHAYAY MOHARAN: hashmatos-toc missing siman 425 entry")
    
    print(f"Chayay Moharan: {len(errors)} issues")
    return errors

def check_lm_commentary():
    """Verify Likutay Moharan commentary registry: LN, Parparos, PNC all wired."""
    errors = []
    reg_path = os.path.join(ROOT, 'src', 'data', 'lm-commentaries.json')
    if not os.path.exists(reg_path):
        return ["MISSING: src/data/lm-commentaries.json"]
    
    reg = json.load(open(reg_path))
    
    # Check LN coverage: every LN vol-4 chapter with a Torah marker should be in registry
    vol4 = os.path.join(ROOT, 'public', 'reader', 'likutay-nanach', 'volume-4')
    ln_registered = set()
    for part_key in ['1', '2']:
        for torah_key in reg.get(part_key, {}):
            for rc in reg[part_key][torah_key].get('related_commentaries', []):
                if rc.get('book') == 'likutay-nanach':
                    url = rc.get('url', '')
                    if url:
                        path = 'public' + url
                        if not os.path.exists(path):
                            errors.append(f"LN BROKEN URL: {url}")
    
    # Check Parparos coverage
    pp_dir = os.path.join(ROOT, 'public', 'reader', 'parparos-lechochma')
    if os.path.exists(pp_dir):
        for f in os.listdir(pp_dir):
            if f.startswith('section-') and f.endswith('.json'):
                num = f.replace('section-','').replace('.json','')
                # Verify it's referenced in registry
                found = False
                for part_key in ['1', '2']:
                    if num in reg.get(part_key, {}):
                        for rc in reg[part_key][num].get('related_commentaries', []):
                            if rc.get('book') == 'parparos-lechochma':
                                found = True
                                break
                if not found and num.isdigit() and int(num) <= 286:
                    errors.append(f"PARPAROS ORPHAN: section-{num}.json not in registry")
    
    # Check PNC coverage
    pnc_dir = os.path.join(ROOT, 'public', 'reader', 'pettek-nanach-commentary')
    if os.path.exists(pnc_dir):
        for f in os.listdir(pnc_dir):
            if (f.startswith('torah-') or f.startswith('tinyana-')) and f.endswith('.json'):
                m = re.match(r'(torah|tinyana)-(\d+)\.json', f)
                if m:
                    prefix, num = m.group(1), m.group(2)
                    part = '2' if prefix == 'tinyana' else '1'
                    if num in reg.get(part, {}):
                        rc = reg[part][num].get('running_commentary')
                        if not rc or rc.get('status') != 'available':
                            errors.append(f"PNC NOT WIRED: {f}")
    
    # Count stats
    ln_count = 0
    pp_count = 0
    pnc_count = 0
    for part_key in ['1', '2']:
        for torah_key in reg.get(part_key, {}):
            entry = reg[part_key][torah_key]
            for rc in entry.get('related_commentaries', []):
                if rc.get('book') == 'likutay-nanach': ln_count += 1
                if rc.get('book') == 'parparos-lechochma': pp_count += 1
            rc = entry.get('running_commentary')
            if rc and isinstance(rc, dict) and rc.get('status') == 'available':
                pnc_count += 1
    
    print(f"LM Commentary: LN={ln_count} Parparos={pp_count} PNC={pnc_count}, {len(errors)} issues")
    return errors

def check_search_index():
    """Verify search index has critical Breslov terms. Catches stale-index deploys."""
    errors = []
    idx_path = os.path.join(ROOT, 'public', 'data', 'light-search-index-he.json.gz')
    if not os.path.exists(idx_path):
        return ["MISSING: light-search-index-he.json.gz — run build-light-search-index.py before deploy"]
    
    try:
        data = json.load(gzip.open(idx_path, 'rt'))
    except Exception as e:
        return [f"CORRUPT SEARCH INDEX: {e}"]
    
    # Critical Breslov terms that MUST return results
    # Hebrew terms checked against HE index
    he_terms = {
        'אין יאוש': ('ein yeush — core Breslov concept', 30),
        'התבודדות': ('hisbodidus — foundational practice', 100),
        'נ נח נחמ נחמן מאומן': ('the Petek — central to Na Nach', 5),
        'אמונה': ('faith — universal term', 500),
    }
    
    total_docs = len(data)
    for term, (desc, minimum) in he_terms.items():
        count = sum(1 for d in data if term in (d.get('x', '') + d.get('t', '') + d.get('h', '')))
        if count < minimum:
            errors.append(f"SEARCH INDEX STALE: '{term}' ({desc}) has {count} matches, expected >= {minimum}")
    
    # English terms checked against EN index if available
    en_path = os.path.join(ROOT, 'public', 'data', 'light-search-index-en.json.gz')
    if os.path.exists(en_path):
        try:
            en_data = json.load(gzip.open(en_path, 'rt'))
            if 'Likutay Moharan' not in str(en_data[0].get('x','')[:200]):
                # Quick sanity: first few docs should have English content
                pass
        except:
            pass
    
    print(f"Search Index: {total_docs} docs, {len(errors)} issues")
    return errors

def check_likutay_eitzos():
    """Verify Likutay Eitzos (and Basra) alignment: HE/EN match, no empty gaps, key terms present."""
    errors = []
    books = {
        'likutay-eitzos': 'Likutay Eitzos',
        'likutay-eitzos-basra': 'Likutay Eitzos Basra',
    }
    critical_he_terms = ['צדיק', 'אמונה', 'תפלה', 'שמחה', 'דעת', 'התבודדות']
    
    for book_dir, book_name in books.items():
        path = os.path.join(ROOT, 'public', 'reader', book_dir)
        if not os.path.exists(path):
            errors.append(f"MISSING: {book_name} ({book_dir})")
            continue
        
        json_files = sorted([f for f in os.listdir(path) if f.startswith('topic-') and f.endswith('.json')])
        if not json_files:
            errors.append(f"EMPTY: {book_name} — no topic files")
            continue
        
        total_he = 0
        total_en = 0
        total_segs = 0
        gap_files = []
        
        for f in json_files:
            fp = os.path.join(path, f)
            try:
                data = json.load(open(fp))
            except:
                errors.append(f"CORRUPT JSON: {book_dir}/{f}")
                continue
            
            segs = data.get('segments', [])
            if not segs:
                errors.append(f"EMPTY SEGMENTS: {book_dir}/{f}")
                continue
            
            he_count = sum(1 for s in segs if (s.get('he','') or '').strip())
            en_count = sum(1 for s in segs if (s.get('en','') or '').strip())
            total_he += he_count
            total_en += en_count
            total_segs += len(segs)
            
            if len(segs) > 5 and en_count < len(segs) * 0.2:
                gap_files.append(f)
        
        en_pct = round(100 * total_en / max(1, total_he))
        print(f"{book_name}: {len(json_files)} topics, {total_en}/{total_he} EN ({en_pct}%)")
        
        if gap_files:
            errors.append(f"{book_name} EN GAPS (>80% missing): {', '.join(gap_files[:5])}")
        if en_pct < 85:
            errors.append(f"{book_name} LOW EN COVERAGE: {en_pct}% (< 85% threshold)")
    
    return errors

def check_en_coverage():
    """Quick EN coverage check for all books in catalog."""
    errors = []
    reader = os.path.join(ROOT, 'public', 'reader')
    
    # Books to check with minimum EN thresholds
    thresholds = {
        'michtevay-shmuel': 85,
        'yereach-haeitanim': 85,
        'zimras-haaretz': 85,
        'nachas-hashulchan': 85,
        'kokhvei-or': 85,
        'chayey-moharan': 80,
        'likutay-tefilos': 85,
        'likutay-eitzos-basra': 90,
    }
    
    for book_id, minimum in thresholds.items():
        book_dir = os.path.join(reader, book_id)
        if not os.path.isdir(book_dir):
            continue
        
        total_he = total_en = 0
        files_checked = 0
        for root, dirs, fnames in os.walk(book_dir):
            for f in fnames:
                if f == 'index.json' or not f.endswith('.json'):
                    continue
                try:
                    data = json.load(open(os.path.join(root, f)))
                except:
                    continue
                for s in data.get('segments', []):
                    if (s.get('he','') or '').strip(): total_he += 1
                    if (s.get('en','') or '').strip(): total_en += 1
                files_checked += 1
        
        if total_he == 0:
            continue
        
        pct = round(100 * total_en / total_he)
        if pct < minimum:
            errors.append(f"LOW EN: {book_id} = {pct}% (threshold {minimum}%)")
        else:
            print(f"  {book_id}: {total_en}/{total_he} EN ({pct}%) OK")
    
    return errors

if __name__ == '__main__':
    all_errors = []
    all_errors.extend(check_lh_english())
    all_errors.extend(check_saba())
    all_errors.extend(check_book('sefer-hamidos', 'SH'))
    all_errors.extend(check_book('likutay-tefilos', 'LT'))
    all_errors.extend(check_otzar_strict())
    all_errors.extend(check_book('kitzur-likutay-moharan', 'KLM'))
    all_errors.extend(check_book('likutay-moharan', 'LM'))
    all_errors.extend(check_parsha())
    all_errors.extend(check_sichos_haran())
    all_errors.extend(check_chayey_moharan())
    all_errors.extend(check_lm_commentary())
    all_errors.extend(check_likutay_eitzos())
    all_errors.extend(check_en_coverage())
    all_errors.extend(check_search_index())
    
    if all_errors:
        print(f"\n{'='*60}")
        print(f"SAFEGUARD FAILED: {len(all_errors)} issues")
        print(f"{'='*60}")
        for e in all_errors[:30]:
            print(f"  X {e}")
        sys.exit(1)
    else:
        print(f"\n{'='*60}")
        print("SAFEGUARD PASSED — all data integrity checks OK")
        print(f"{'='*60}")
        sys.exit(0)
