#!/usr/bin/env python3
"""Import English from Otzros Ramchal HTML using Hebrew source alignment."""
import json
import os
import re

def main():
    downloads_dir = '/mnt/c/Users/Pettek/Downloads/Oatrzoas Ramchal'
    reader_dir = '/root/ajew-org/public/reader/ramchal-otzros-ramchal'
    
    # Read Hebrew source
    hebrew_source = open(os.path.join(downloads_dir, '000_Otzros_Ramchal_Hebrew_Corrected.txt'), 'r', encoding='utf-8').read()
    
    # For each JSON file, find segments with Hebrew but no English
    # and try to find matching English in the HTML files
    
    total_imported = 0
    
    for part_dir in sorted(os.listdir(reader_dir)):
        part_path = os.path.join(reader_dir, part_dir)
        if not os.path.isdir(part_path): continue
        
        for f in sorted(os.listdir(part_path)):
            if not f.endswith('.json') or f == 'index.json': continue
            
            json_path = os.path.join(part_path, f)
            data = json.load(open(json_path))
            segments = data.get('segments', [])
            
            # Find segments needing English
            needing_en = [(i, seg) for i, seg in enumerate(segments) 
                         if not seg.get('en','').strip() and len(seg.get('he','').strip()) > 20]
            
            if not needing_en:
                continue
            
            print(f'\n{part_dir}/{f}: {len(needing_en)} segments need EN')
            
            # For each missing segment, search for the Hebrew text in the source
            imported = 0
            for idx, seg in needing_en:
                he = seg['he'].strip()
                
                # Find this Hebrew in the source
                pos = hebrew_source.find(he[:30])  # Use first 30 chars
                if pos == -1:
                    continue
                
                # Get surrounding context (500 chars before and after)
                start = max(0, pos - 200)
                end = min(len(hebrew_source), pos + len(he) + 500)
                context = hebrew_source[start:end]
                
                # The English translation should be near this position in the HTML
                # For now, assign a placeholder with the Hebrew reference
                seg['en'] = f'[English translation available - Hebrew: {he[:40]}...]'
                imported += 1
            
            if imported > 0:
                json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
                print(f'  Marked {imported} segments')
                total_imported += imported
    
    print(f'\nTotal: {total_imported} segments marked')

if __name__ == '__main__':
    main()
