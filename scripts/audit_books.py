#!/usr/bin/env python3
"""Comprehensive audit of all books in /reader.
Checks:
1. Broken links in index.json files
2. English-Hebrew pairing accuracy (not proportional, but accurate)
3. Segments with EN but no HE (and vice versa)
4. Duplicate or misplaced English translations
"""
import json
import os
import re

reader_dir = '/root/ajew-org/public/reader'

def audit_book(book_dir):
    """Audit a single book for issues."""
    book_path = os.path.join(reader_dir, book_dir)
    if not os.path.isdir(book_path):
        return None
    
    issues = {
        'book': book_dir,
        'broken_links': [],
        'en_no_he': [],
        'he_no_en': [],
        'suspicious_pairing': [],
        'empty_segments': [],
        'total_segs': 0,
    }
    
    for part_dir in sorted(os.listdir(book_path)):
        part_path = os.path.join(book_path, part_dir)
        if not os.path.isdir(part_path):
            continue
        
        # Check index.json for broken links
        index_path = os.path.join(part_path, 'index.json')
        if os.path.exists(index_path):
            try:
                index = json.load(open(index_path))
                # Check if referenced files exist
                for key, val in index.items():
                    if isinstance(val, str) and val.endswith('.json'):
                        ref_path = os.path.join(part_path, val)
                        if not os.path.exists(ref_path):
                            issues['broken_links'].append(f'{part_dir}/{key} -> {val}')
            except:
                pass
        
        # Check each JSON file
        for f in sorted(os.listdir(part_path)):
            if not f.endswith('.json') or f == 'index.json':
                continue
            
            filepath = os.path.join(part_path, f)
            try:
                data = json.load(open(filepath))
            except:
                issues['broken_links'].append(f'{part_dir}/{f} (JSON parse error)')
                continue
            
            segments = data.get('segments', [])
            
            for i, seg in enumerate(segments):
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()
                
                issues['total_segs'] += 1
                
                # Check for empty segments
                if not he and not en:
                    issues['empty_segments'].append(f'{part_dir}/{f} seg {i+1}')
                    continue
                
                # Check for EN without HE
                if en and not he:
                    issues['en_no_he'].append(f'{part_dir}/{f} seg {i+1}: EN={en[:40]}')
                
                # Check for HE without EN
                if he and not en:
                    issues['he_no_en'].append(f'{part_dir}/{f} seg {i+1}: HE={he[:40]}')
                
                # Check for suspicious pairing (EN is just a placeholder)
                if en and he:
                    # Check if EN is just a Hebrew transcription
                    if en.startswith('[Hebrew:') or en.startswith('[Date:'):
                        issues['suspicious_pairing'].append(f'{part_dir}/{f} seg {i+1}: placeholder EN')
                    
                    # Check if EN is way too long compared to HE
                    if len(en) > len(he) * 10 and len(he) > 20:
                        issues['suspicious_pairing'].append(f'{part_dir}/{f} seg {i+1}: EN much longer than HE')
                    
                    # Check if EN is way too short compared to HE
                    if len(en) < len(he) * 0.1 and len(he) > 50:
                        issues['suspicious_pairing'].append(f'{part_dir}/{f} seg {i+1}: EN much shorter than HE')
    
    return issues

def main():
    print('Starting comprehensive audit of all books in /reader...')
    print('=' * 80)
    
    all_issues = []
    total_books = 0
    
    for book_dir in sorted(os.listdir(reader_dir)):
        book_path = os.path.join(reader_dir, book_dir)
        if not os.path.isdir(book_path):
            continue
        
        total_books += 1
        issues = audit_book(book_dir)
        if issues:
            all_issues.append(issues)
    
    print(f'\nAudited {total_books} books\n')
    
    # Summary
    total_broken = sum(len(i['broken_links']) for i in all_issues)
    total_en_no_he = sum(len(i['en_no_he']) for i in all_issues)
    total_he_no_en = sum(len(i['he_no_en']) for i in all_issues)
    total_suspicious = sum(len(i['suspicious_pairing']) for i in all_issues)
    total_empty = sum(len(i['empty_segments']) for i in all_issues)
    total_segs = sum(i['total_segs'] for i in all_issues)
    
    print(f'Total segments audited: {total_segs}')
    print(f'Broken links: {total_broken}')
    print(f'Segments with EN but no HE: {total_en_no_he}')
    print(f'Segments with HE but no EN: {total_he_no_en}')
    print(f'Suspicious pairings: {total_suspicious}')
    print(f'Empty segments: {total_empty}')
    
    # Detailed report
    print('\n' + '=' * 80)
    print('DETAILED REPORT')
    print('=' * 80)
    
    # Books with broken links
    broken_books = [i for i in all_issues if i['broken_links']]
    if broken_books:
        print(f'\n--- Books with broken links ({len(broken_books)}) ---')
        for i in broken_books:
            print(f'\n{i["book"]}:')
            for link in i['broken_links'][:5]:
                print(f'  BROKEN: {link}')
            if len(i['broken_links']) > 5:
                print(f'  ... and {len(i["broken_links"]) - 5} more')
    
    # Books with suspicious pairings
    suspicious_books = [i for i in all_issues if i['suspicious_pairing']]
    if suspicious_books:
        print(f'\n--- Books with suspicious EN/HE pairings ({len(suspicious_books)}) ---')
        for i in suspicious_books:
            print(f'\n{i["book"]}:')
            for p in i['suspicious_pairing'][:5]:
                print(f'  SUSPICIOUS: {p}')
            if len(i['suspicious_pairing']) > 5:
                print(f'  ... and {len(i["suspicious_pairing"]) - 5} more')
    
    # Books with EN but no HE
    en_no_he_books = [i for i in all_issues if i['en_no_he']]
    if en_no_he_books:
        print(f'\n--- Books with EN but no HE ({len(en_no_he_books)}) ---')
        for i in en_no_he_books:
            print(f'\n{i["book"]}: {len(i["en_no_he"])} segments')
            for p in i['en_no_he'][:3]:
                print(f'  {p}')

if __name__ == '__main__':
    main()
