#!/usr/bin/env python3
"""Import English translations for Likutay Halachos from docx files."""
import json
import os
import re
from docx import Document

def extract_paragraphs_from_docx(filepath):
    """Extract non-empty paragraphs from a docx file."""
    doc = Document(filepath)
    paragraphs = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if text and len(text) > 5:
            paragraphs.append(text)
    return paragraphs

def main():
    docx_dir = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
    reader_dir = '/root/ajew-org/public/reader/likutay-halachos'
    
    if not os.path.exists(reader_dir):
        print(f'Reader directory not found: {reader_dir}')
        return
    
    # Get all docx files sorted
    docx_files = sorted([f for f in os.listdir(docx_dir) if f.endswith('.docx')])
    print(f'Found {len(docx_files)} docx files')
    
    # Extract all English paragraphs from all docx files
    all_english = []
    for docx_file in docx_files:
        filepath = os.path.join(docx_dir, docx_file)
        paragraphs = extract_paragraphs_from_docx(filepath)
        all_english.extend(paragraphs)
        print(f'  {docx_file}: {len(paragraphs)} paragraphs')
    
    print(f'\nTotal English paragraphs: {len(all_english)}')
    
    # Now process JSON files
    total_imported = 0
    en_idx = 0
    
    for part_dir in sorted(os.listdir(reader_dir)):
        part_path = os.path.join(reader_dir, part_dir)
        if not os.path.isdir(part_path): continue
        
        for f in sorted(os.listdir(part_path)):
            if not f.endswith('.json') or f == 'index.json': continue
            
            json_path = os.path.join(part_path, f)
            data = json.load(open(json_path))
            segments = data.get('segments', [])
            
            imported = 0
            for seg in segments:
                if seg.get('en', '').strip():
                    continue
                
                he = seg.get('he', '').strip()
                if not he or len(he) < 5:
                    continue
                
                # Assign next available English paragraph
                if en_idx < len(all_english):
                    seg['en'] = all_english[en_idx]
                    en_idx += 1
                    imported += 1
            
            if imported > 0:
                json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
                print(f'{part_dir}/{f}: {imported} imported')
                total_imported += imported
    
    print(f'\nTotal imported: {total_imported}')
    print(f'English paragraphs used: {en_idx}/{len(all_english)}')
    
    # Final coverage
    total = 0; has_en = 0
    for part in os.listdir(reader_dir):
        pd = os.path.join(reader_dir, part)
        if not os.path.isdir(pd): continue
        for f in os.listdir(pd):
            if not f.endswith('.json') or f == 'index.json': continue
            data = json.load(open(os.path.join(pd, f)))
            for seg in data.get('segments', []):
                total += 1
                if seg.get('en','').strip(): has_en += 1
    print(f'LH: {has_en}/{total} = {has_en/total*100:.1f}%')

if __name__ == '__main__':
    main()
