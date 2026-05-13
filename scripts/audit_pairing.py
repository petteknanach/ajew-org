#!/usr/bin/env python3
"""Fix English-Hebrew pairing accuracy for Breslov books."""
import json
import os
import re

reader_dir = '/root/ajew-org/public/reader'

def normalize_hebrew(text):
    if not text:
        return ''
    text = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    text = text.replace('\u05BE', ' ').replace('\u05C3', '')
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def text_similarity(he, en):
    if not he or not en:
        return 0
    if en.startswith('[Hebrew:') or en.startswith('[Date:') or en.startswith('[English'):
        return 0
    if len(en) > len(he) * 10 and len(he) > 20:
        return 0.1
    if len(en) < len(he) * 0.1 and len(he) > 50:
        return 0.1
    he_normalized = normalize_hebrew(he)
    he_words = set(he_normalized.lower().split())
    en_lower = en.lower()
    significant_words = [w for w in he_words if len(w) > 3]
    if not significant_words:
        return 0.5
    matches = sum(1 for w in significant_words if w in en_lower)
    return matches / len(significant_words)

def audit_pairing(book_dir):
    book_path = os.path.join(reader_dir, book_dir)
    if not os.path.isdir(book_path):
        return None
    
    results = {
        'book': book_dir,
        'total': 0,
        'paired': 0,
        'good': 0,
        'bad': 0,
        'missing_en': 0,
        'bad_examples': [],
    }
    
    for part_dir in sorted(os.listdir(book_path)):
        part_path = os.path.join(book_path, part_dir)
        if not os.path.isdir(part_path):
            continue
        for f in sorted(os.listdir(part_path)):
            if not f.endswith('.json') or f == 'index.json':
                continue
            filepath = os.path.join(part_path, f)
            try:
                data = json.load(open(filepath))
            except:
                continue
            segments = data.get('segments', [])
            for i, seg in enumerate(segments):
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()
                results['total'] += 1
                if not he and not en:
                    continue
                if he and not en:
                    results['missing_en'] += 1
                    continue
                if not he and en:
                    results['paired'] += 1
                    results['good'] += 1
                    continue
                results['paired'] += 1
                similarity = text_similarity(he, en)
                if similarity < 0.2:
                    results['bad'] += 1
                    if len(results['bad_examples']) < 3:
                        results['bad_examples'].append({
                            'file': part_dir + '/' + f,
                            'seg': i + 1,
                            'he': he[:60],
                            'en': en[:60],
                            'similarity': similarity,
                        })
                else:
                    results['good'] += 1
    return results

def main():
    breslov_keywords = ['likutay', 'ramchal', 'otzar-hayirah', 'kitzur',
        'alim-litrufa', 'sichos', 'shivchay', 'chayey-moharan', 'sefer-hamidos',
        'sipurey', 'ebay', 'ruzin', 'michtevay', 'chumash-lh']
    
    print('Auditing EN-HE pairing accuracy for Breslov books...')
    print('=' * 80)
    
    breslov_books = []
    for book_dir in sorted(os.listdir(reader_dir)):
        book_path = os.path.join(reader_dir, book_dir)
        if not os.path.isdir(book_path):
            continue
        if not any(kw in book_dir for kw in breslov_keywords):
            continue
        results = audit_pairing(book_dir)
        if results and results['total'] > 0:
            breslov_books.append(results)
    
    hdr = '{:40s} {:>6s} {:>6s} {:>6s} {:>6s} {:>6s} {:>6s}'.format(
        'Book', 'Total', 'Paired', 'Good', 'Bad', 'Missing', 'Bad%')
    print('\n' + hdr)
    print('-' * 85)
    
    total_bad = 0
    total_paired = 0
    total_good = 0
    total_missing = 0
    
    for r in sorted(breslov_books, key=lambda x: -x['bad']):
        bad_pct = r['bad'] / r['paired'] * 100 if r['paired'] > 0 else 0
        total_bad += r['bad']
        total_paired += r['paired']
        total_good += r['good']
        total_missing += r['missing_en']
        line = '{:40s} {:6d} {:6d} {:6d} {:6d} {:6d} {:5.1f}%'.format(
            r['book'], r['total'], r['paired'], r['good'], r['bad'], r['missing_en'], bad_pct)
        print(line)
    
    print('-' * 85)
    total_bad_pct = total_bad / total_paired * 100 if total_paired > 0 else 0
    line = '{:40s} {:6s} {:6d} {:6d} {:6d} {:6d} {:5.1f}%'.format(
        'TOTAL', '', total_paired, total_good, total_bad, total_missing, total_bad_pct)
    print(line)
    
    # Show bad examples
    print('\n' + '=' * 80)
    print('BAD PAIRING EXAMPLES (top 10 books)')
    print('=' * 80)
    
    for r in sorted(breslov_books, key=lambda x: -x['bad'])[:10]:
        if r['bad_examples']:
            print('\n' + r['book'] + ' (' + str(r['bad']) + ' bad pairings):')
            for ex in r['bad_examples']:
                print('  ' + ex['file'] + ' seg ' + str(ex['seg']) + ':')
                print('    HE: ' + ex['he'])
                print('    EN: ' + ex['en'])

if __name__ == '__main__':
    main()
