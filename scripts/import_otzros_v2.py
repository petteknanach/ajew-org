#!/usr/bin/env python3
"""Import English from Otzros Ramchal HTML files with proper section matching."""
import json
import os
import re
from html.parser import HTMLParser

def extract_sections_from_html(filepath):
    """Extract sections from HTML file based on heading tags.
    Returns list of (heading, english_text) tuples.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove script and style
    content = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', content)
    content = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', content)
    
    # Split by heading tags
    # Pattern: <h1..6>heading</h1..6> content
    sections = []
    
    # Find all headings and their positions
    heading_pattern = re.compile(r'<h([1-6])[^>]*>([\s\S]*?)</h\1>', re.I)
    matches = list(heading_pattern.finditer(content))
    
    for i, match in enumerate(matches):
        level = match.group(1)
        heading = re.sub(r'<[^>]+>', '', match.group(2)).strip()
        
        # Get content after this heading until next heading
        start = match.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(content)
        section_content = content[start:end]
        
        # Extract text from content
        text = re.sub(r'<[^>]+>', '\n', section_content)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Filter out CSS and short lines
        lines = []
        for line in text.split('\n'):
            line = line.strip()
            if line and len(line) > 10:
                # Skip CSS-like lines
                if any(x in line for x in ['{', '}', 'var(', 'rgba(', '.masthead', '.page-wrapper',
                    'font-family', 'background:', 'color:', 'padding:', 'margin:', 'border-',
                    'text-align', 'max-width', 'min-height', 'letter-spacing', 'text-transform',
                    'font-size', 'line-height', 'overflow', 'position:', 'display:', 'flex',
                    'grid', 'opacity', 'z-index', 'cursor:', 'transition', 'transform',
                    'box-sizing', 'box-shadow', 'border-radius', 'font-weight', 'text-decoration',
                    'list-style', 'white-space', 'word-wrap', 'content:', 'before:', 'after:',
                    '@media', '@import', '@font-face', 'pointer-events', 'user-select',
                    'text-rendering', '-webkit', '-moz-', 'scrollbar', '::selection']):
                    continue
                lines.append(line)
        
        english_text = '\n'.join(lines).strip()
        if english_text and len(english_text) > 30:
            sections.append((heading, english_text))
    
    return sections

def find_best_section(hebrew_text, sections):
    """Find the best matching English section for a Hebrew segment."""
    if not hebrew_text or len(hebrew_text) < 10:
        return None
    
    best_match = None
    best_score = 0
    
    # Extract key words from Hebrew
    he_words = set(re.sub(r'[^\w\s\u0590-\u05FF]', '', hebrew_text.lower()).split())
    he_words = {w for w in he_words if len(w) > 2}
    
    for heading, english in sections:
        score = 0
        
        # Check heading match
        heading_lower = heading.lower()
        he_lower = hebrew_text.lower()
        
        # Direct substring match
        if he_lower[:20] in english.lower():
            score += 50
        
        # Word overlap with heading
        heading_words = set(re.sub(r'[^\w\s]', '', heading_lower).split())
        overlap = len(he_words & heading_words)
        score += overlap * 5
        
        # Check if key Hebrew words appear in English
        for word in list(he_words)[:10]:
            if len(word) > 3 and word in english.lower():
                score += 2
        
        if score > best_score:
            best_score = score
            best_match = english[:1000]  # Limit length
    
    return best_match if best_score > 3 else None

def main():
    downloads_dir = '/mnt/c/Users/Pettek/Downloads/Oatrzoas Ramchal'
    reader_dir = '/root/ajew-org/public/reader/ramchal-otzros-ramchal'
    
    if not os.path.exists(reader_dir):
        print(f'Reader directory not found: {reader_dir}')
        return
    
    # Parse all HTML files
    html_files = [f for f in os.listdir(downloads_dir) if f.endswith('_English.html')]
    
    all_sections = []
    for html_file in sorted(html_files):
        filepath = os.path.join(downloads_dir, html_file)
        sections = extract_sections_from_html(filepath)
        all_sections.extend(sections)
        print(f'{html_file}: {len(sections)} sections')
    
    print(f'\nTotal sections: {len(all_sections)}')
    
    # Process JSON files
    total_imported = 0
    
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
                if not he or len(he) < 15:
                    continue
                
                english = find_best_section(he, all_sections)
                if english:
                    seg['en'] = english
                    imported += 1
            
            if imported > 0:
                json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
                print(f'{part_dir}/{f}: {imported} imported')
                total_imported += imported
    
    print(f'\nTotal imported: {total_imported}')
    
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
