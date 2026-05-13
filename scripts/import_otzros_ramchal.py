#!/usr/bin/env python3
"""Import English from Otzros Ramchal HTML files."""
import json
import os
import re
from html.parser import HTMLParser

class SectionExtractor(HTMLParser):
    """Extract sections from HTML based on heading tags."""
    def __init__(self):
        super().__init__()
        self.sections = []
        self.current_title = None
        self.current_text = []
        self.in_heading = False
        self.in_body = False
        self.skip = False
        self.skip_tags = {'style', 'script', 'head'}
        self.heading_tags = {'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}
    
    def handle_starttag(self, tag, attrs):
        if tag in self.skip_tags:
            self.skip = True
        elif tag in self.heading_tags:
            self.in_heading = True
            # Save previous section
            if self.current_title and self.current_text:
                text = ' '.join(self.current_text).strip()
                if text and len(text) > 20:
                    self.sections.append((self.current_title, text))
            self.current_title = ''
            self.current_text = []
        elif tag == 'body':
            self.in_body = True
        elif tag in ('p', 'div', 'br', 'li', 'td', 'blockquote'):
            if self.in_body and not self.skip:
                self.current_text.append('\n')
    
    def handle_endtag(self, tag):
        if tag in self.skip_tags:
            self.skip = False
        elif tag in self.heading_tags:
            self.in_heading = False
        elif tag == 'html':
            # Save last section
            if self.current_title and self.current_text:
                text = ' '.join(self.current_text).strip()
                if text and len(text) > 20:
                    self.sections.append((self.current_title, text))
    
    def handle_data(self, data):
        if self.skip:
            return
        text = data.strip()
        if not text:
            return
        if self.in_heading:
            self.current_title += ' ' + text if self.current_title else text
        elif self.in_body:
            # Skip CSS-like content
            if any(x in text for x in ['{', '}', 'var(', 'rgba(', 'px;', 'em;', 'rem;', '.masthead', '.page-wrapper', 'font-family', 'background:', 'color:', 'padding:', 'margin:', 'border-', 'text-align', 'max-width', 'min-height', 'letter-spacing', 'text-transform', 'font-size', 'line-height', 'overflow', 'position:', 'display:', 'flex', 'grid', 'opacity', 'z-index', 'cursor:', 'transition', 'transform', 'box-sizing', 'box-shadow', 'border-radius', 'font-weight', 'text-decoration', 'list-style', 'white-space', 'word-wrap', 'content:', 'before:', 'after:', '@media', '@import', '@font-face']):
                return
            self.current_text.append(text)

def parse_html_file(filepath):
    """Parse HTML file and extract sections."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    extractor = SectionExtractor()
    try:
        extractor.feed(content)
    except:
        pass
    
    return extractor.sections

def main():
    downloads_dir = '/mnt/c/Users/Pettek/Downloads/Oatrzoas Ramchal'
    reader_dir = '/root/ajew-org/public/reader/ramchal-otzros-ramchal'
    
    if not os.path.exists(reader_dir):
        print(f'Reader directory not found: {reader_dir}')
        return
    
    # Map HTML files to JSON files based on content
    html_to_json = {
        '010_Bereishis_English.html': ['part-1/torah-1.json'],
        '020_Shemos_English.html': ['part-1/torah-2.json'],
        '030_Vayikra_English.html': ['part-1/torah-3.json'],
        '035_Mattos_Devarim_English.html': ['part-1/torah-4.json'],
        '100_Neviim_English.html': ['part-1/torah-5.json', 'part-1/torah-6.json'],
        '105_Neviim_Supplement_English.html': ['part-1/torah-6.json'],
        '200_Kesuvim_English.html': ['part-1/torah-7.json'],
        '700_Drushim_English.html': ['part-1/torah-8.json'],
        '800_Iggros_English.html': ['part-1/torah-9.json'],
    }
    
    total_imported = 0
    
    for html_file, json_files in html_to_json.items():
        html_path = os.path.join(downloads_dir, html_file)
        if not os.path.exists(html_path):
            continue
        
        sections = parse_html_file(html_path)
        print(f'{html_file}: {len(sections)} sections')
        
        for json_rel in json_files:
            json_path = os.path.join(reader_dir, json_rel)
            if not os.path.exists(json_path):
                continue
            
            data = json.load(open(json_path))
            segments = data.get('segments', [])
            
            imported = 0
            for seg in segments:
                if seg.get('en', '').strip():
                    continue
                
                he = seg.get('he', '').strip()
                if not he or len(he) < 10:
                    continue
                
                # Find best matching section
                best_match = None
                best_score = 0
                
                for title, text in sections:
                    # Check word overlap between Hebrew segment and section title
                    he_words = set(re.sub(r'[^\w\s]', '', he.lower()).split())
                    title_words = set(re.sub(r'[^\w\s]', '', title.lower()).split())
                    overlap = len(he_words & title_words)
                    
                    # Also check if Hebrew appears in the English text
                    if he[:20].lower() in text.lower():
                        overlap += 5
                    
                    if overlap > best_score:
                        best_score = overlap
                        best_match = text[:500]  # Limit text length
                
                if best_match and best_score > 0:
                    seg['en'] = best_match
                    imported += 1
            
            if imported > 0:
                json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
                print(f'  {json_rel}: {imported} imported')
                total_imported += imported
    
    print(f'\nTotal: {total_imported}')
    
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
    print(f'Otzros Ramchal: {has_en}/{total} = {has_en/total*100:.1f}%')

if __name__ == '__main__':
    main()
