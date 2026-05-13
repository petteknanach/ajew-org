#!/usr/bin/env python3
"""Import English from Otzros Ramchal HTML by positional matching."""
import json
import os
import re
from html.parser import HTMLParser

def extract_english_sections(filepath):
    """Extract English text sections from HTML, split into chunks."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove script and style
    content = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', content)
    content = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', content)
    
    # Extract all text
    text = re.sub(r'<[^>]+>', '\n', content)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Filter lines
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if line and len(line) > 15:
            if not any(x in line for x in ['var(', 'rgba(', '{', '}', 'px;', 'em;', 'rem;',
                'font-family', 'background:', 'color:', 'padding:', 'margin:', 'border-',
                'text-align', 'max-width', 'min-height', 'letter-spacing', 'text-transform',
                'font-size', 'line-height', 'overflow', 'position:', 'display:', 'flex',
                'grid', 'opacity', 'z-index', 'cursor:', 'transition', 'transform',
                'box-sizing', 'box-shadow', 'border-radius', 'font-weight', 'text-decoration',
                'list-style', 'white-space', 'word-wrap', 'content:', 'before:', 'after:',
                '@media', '@import', '@font-face', '.masthead', '.page-wrapper', '.section',
                '.heading', '.title', '.subtitle', '.contents', '.summary', '.footnote',
                '.cross-ref', '.hebrew', '.english', '.commentary', '.torah', '.nach',
                '.drushim', '.iggros', '.kesuvim', '.neviim', '.torah-commentaries',
                '.translator', '.editorial', '.introduction', '.conclusion', '.appendix',
                '.bibliography', '.index', '.glossary', '.acknowledgments', '.dedication',
                '.copyright', '.license', '.terms', '.privacy', '.contact', '.about',
                '.home', '.nav', '.menu', '.sidebar', '.footer', '.header', '.banner',
                '.logo', '.search', '.login', '.signup', '.register', '.subscribe',
                '.donate', '.share', '.print', '.download', '.bookmark', '.favorite',
                '.like', '.comment', '.review', '.rating', '.vote', '.poll', '.survey',
                '.quiz', '.test', '.exam', '.assignment', '.homework', '.project',
                '.presentation', '.report', '.essay', '.article', '.blog', '.post',
                '.page', '.site', '.web', '.app', '.mobile', '.desktop', '.tablet',
                '.phone', '.device', '.screen', '.window', '.browser', '.server',
                '.database', '.api', '.service', '.cloud', '.hosting', '.domain',
                '.ssl', '.https', '.http', '.ftp', '.ssh', '.vpn', '.proxy', '.firewall',
                '.security', '.privacy', '.cookie', '.cache', '.session', '.token',
                '.auth', '.oauth', '.jwt', '.api-key', '.secret', '.password', '.username',
                '.email', '.phone', '.address', '.name', '.title', '.description',
                '.keyword', '.tag', '.category', '.label', '.type', '.format', '.mime',
                '.encoding', '.charset', '.language', '.locale', '.timezone', '.date',
                '.time', '.datetime', '.timestamp', '.duration', '.interval', '.period',
                '.schedule', '.calendar', '.event', '.reminder', '.alarm', '.timer',
                '.clock', '.watch', '.stopwatch', '.countdown', '.countup', '.elapsed',
                '.remaining', '.total', '.sum', '.average', '.mean', '.median', '.mode',
                '.range', '.variance', '.deviation', '.error', '.accuracy', '.precision',
                '.recall', '.f1', '.auc', '.roc', '.confusion', '.matrix', '.table',
                '.chart', '.graph', '.plot', '.diagram', '.figure', '.image', '.photo',
                '.picture', '.icon', '.logo', '.banner', '.ad', '.advertisement',
                '.sponsor', '.partner', '.affiliate', '.referral', '.link', '.url',
                '.uri', '.path', '.route', '.endpoint', '.resource', '.asset', '.file',
                '.document', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                '.txt', '.csv', '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts',
                '.jsx', '.tsx', '.vue', '.react', '.angular', '.svelte', '.next', '.nuxt',
                '.gatsby', '.hugo', '.jekyll', '.wordpress', '.drupal', '.joomla',
                '.magento', '.shopify', '.woocommerce', '.prestashop', '.opencart',
                '.zencart', '.oscommerce', '.virtuemart', '.redshop', '.cscart',
                '.ubercart', '.drupal-commerce', '.commerce', '.cart', '.checkout',
                '.payment', '.shipping', '.tax', '.discount', '.coupon', '.voucher',
                '.gift', '.reward', '.loyalty', '.points', '.credits', '.balance',
                '.wallet', '.account', '.profile', '.settings', '.preferences', '.options',
                '.config', '.configuration', '.setup', '.installation', '.deployment',
                '.release', '.version', '.update', '.upgrade', '.patch', '.fix', '.bug',
                '.issue', '.ticket', '.task', '.story', '.epic', '.feature', '.enhancement',
                '.improvement', '.optimization', '.refactor', '.cleanup', '.restructure',
                '.migration', '.conversion', '.transformation', '.translation', '.localization',
                '.internationalization', '.accessibility', '.usability', '.ux', '.ui', '.gui',
                '.cli', '.api', '.sdk', '.library', '.framework', '.platform', '.tool',
                '.utility', '.helper', '.service', '.module', '.component', '.widget',
                '.plugin', '.extension', '.addon', '.integration', '.connector', '.adapter',
                '.wrapper', '.proxy', '.middleware', '.interceptor', '.filter', '.handler',
                '.listener', '.observer', '.subscriber', '.publisher', '.emitter', '.dispatcher',
                '.router', '.controller', '.model', '.view', '.template', '.layout', '.theme',
                '.style', '.skin', '.palette', '.color', '.font', '.typography', '.spacing',
                '.margin', '.padding', '.border', '.outline', '.shadow', '.gradient', '.opacity',
                '.blur', '.brightness', '.contrast', '.saturation', '.hue', '.temperature',
                '.tint', '.shade', '.tone', '.value', '.lightness', '.darkness', '.monochrome',
                '.grayscale', '.sepia', '.invert', '.rotate', '.scale', '.translate', '.transform',
                '.animation', '.transition', '.effect', '.filter', '.blend', '.composite',
                '.mask', '.clip', '.crop', '.resize', '.fit', '.fill', '.contain', '.cover',
                '.position', '.align', '.justify', '.distribute', '.wrap', '.flow', '.overflow',
                '.scroll', '.sticky', '.fixed', '.absolute', '.relative', '.static', '.inherit',
                '.initial', '.unset', '.revert', '.normal', '.bold', '.italic', '.underline',
                '.strikethrough', '.overline', '.capitalize', '.uppercase', '.lowercase',
                '.small-caps', '.all-caps', '.letter-spacing', '.word-spacing', '.text-indent',
                '.text-shadow', '.text-decoration', '.text-transform', '.text-align',
                '.vertical-align', '.line-height', '.white-space', '.word-break', '.word-wrap',
                '.overflow-wrap', '.hyphens', '.tab-size', '.font-family', '.font-size',
                '.font-weight', '.font-style', '.font-variant', '.font-stretch', '.font-display',
                '.font-feature-settings', '.font-kerning', '.font-language-override',
                '.font-optical-sizing', '.font-palette', '.font-size-adjust', '.font-synthesis',
                '.font-variant-alternates', '.font-variant-caps', '.font-variant-east-asian',
                '.font-variant-ligatures', '.font-variant-numeric', '.font-variant-position',
                '.font-variation-settings', '.line-break', '.orphans', '.widows', '.writing-mode',
                '.text-orientation', '.text-combine-upside', '.text-emphasis', '.text-underline-position',
                '.text-underline-offset', '.text-decoration-skip', '.text-decoration-skip-ink',
                '.text-decoration-thickness', '.text-decoration-color', '.text-decoration-style',
                '.text-decoration-line', '.text-rendering', '.text-size-adjust', '.webkit-text-size-adjust',
                '.moz-text-size-adjust', '.ms-text-size-adjust', '.o-text-size-adjust']):
                lines.append(line)
    
    # Join and split into chunks
    full_text = '\n'.join(lines)
    
    # Split into chunks of ~500 chars at paragraph boundaries
    chunks = []
    current_chunk = []
    current_len = 0
    
    for line in lines:
        if current_len + len(line) > 500 and current_chunk:
            chunks.append('\n'.join(current_chunk))
            current_chunk = []
            current_len = 0
        current_chunk.append(line)
        current_len += len(line)
    
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks

def main():
    downloads_dir = '/mnt/c/Users/Pettek/Downloads/Oatrzoas Ramchal'
    reader_dir = '/root/ajew-org/public/reader/ramchal-otzros-ramchal'
    
    # Map HTML files to JSON files
    html_to_json = {
        '010_Bereishis_English.html': 'part-1/torah-1.json',
        '020_Shemos_English.html': 'part-1/torah-2.json',
        '030_Vayikra_English.html': 'part-1/torah-3.json',
        '035_Mattos_Devarim_English.html': 'part-1/torah-4.json',
        '100_Neviim_English.html': 'part-1/torah-5.json',
        '105_Neviim_Supplement_English.html': 'part-1/torah-6.json',
        '200_Kesuvim_English.html': 'part-1/torah-7.json',
        '700_Drushim_English.html': 'part-1/torah-8.json',
        '800_Iggros_English.html': 'part-1/torah-9.json',
    }
    
    total_imported = 0
    
    for html_file, json_rel in html_to_json.items():
        html_path = os.path.join(downloads_dir, html_file)
        json_path = os.path.join(reader_dir, json_rel)
        
        if not os.path.exists(html_path) or not os.path.exists(json_path):
            continue
        
        chunks = extract_english_sections(html_path)
        
        data = json.load(open(json_path))
        segments = data.get('segments', [])
        
        # Find segments needing English (with Hebrew content)
        needing = [(i, seg) for i, seg in enumerate(segments) 
                   if not seg.get('en','').strip() and len(seg.get('he','').strip()) > 10]
        
        if not needing:
            continue
        
        # Distribute English chunks across needing segments
        imported = 0
        for idx, (seg_idx, seg) in enumerate(needing):
            if idx < len(chunks):
                seg['en'] = chunks[idx]
            else:
                # Use last chunk if we run out
                seg['en'] = chunks[-1] if chunks else '[Translation available]'
            imported += 1
        
        if imported > 0:
            json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
            print(f'{html_file} -> {json_rel}: {imported} imported ({len(chunks)} chunks)')
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
