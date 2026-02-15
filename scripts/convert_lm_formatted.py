"""
Convert Likutay Moharan docx files to Astro pages with proper formatting preservation.
Reads Word docx files and preserves bold, italic, and color formatting.
"""
import os
import re
from docx import Document
from docx.shared import RGBColor

SOURCE_DIR = r"C:\Users\Pettek\Documents\Translations\Likutay Moharan"
TARGET_DIR = r"C:\Users\Pettek\.openclaw\workspace\ajew-org\src\pages\teachings"

# Special cases for files with multiple versions
VERSION_OVERRIDES = {
    60: "Torah 60 - new.docx",
    61: "Torah 61 - improved.docx",
    64: "Torah 64 - new and improved.docx",
    65: "Torah 65 - newer updated.docx",
    66: "Torah 66 - newer edit than the previous.docx",
}

# Color mappings - map RGB to semantic class names
# Use string keys for easier matching
COLOR_MAP = {
    # Scripture citations (dark blue)
    "0,48,135": 'scripture',
    # Purple (scripture in some docs)
    "128,0,128": 'scripture',
    # Key terms (green)
    "0,102,0": 'term',
    # Headers (blue)
    "0,102,204": 'header',
    # Blue for explanations
    "0,0,255": 'explanation',
    # Regular text (dark gray)
    "51,51,51": 'regular',
    # Explanations (gray)
    "85,85,85": 'explanation',
}

def get_docx_filename(torah_num):
    """Get the correct docx filename for a given Torah number"""
    if torah_num in VERSION_OVERRIDES:
        return VERSION_OVERRIDES[torah_num]
    return f"Torah {torah_num}.docx"

def rgb_to_hex(rgb):
    """Convert RGB tuple to hex color"""
    if rgb is None:
        return None
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"

def get_color_class(rgb_color):
    """Map RGB color to semantic class name"""
    if rgb_color is None:
        return None
    
    # Convert RGBColor object to tuple
    # RGBColor uses .r, .g, .b properties (0-255)
    try:
        r = rgb_color.r
        g = rgb_color.g
        b = rgb_color.b
    except AttributeError:
        # Might be a tuple already
        return None
    
    # Create string key for exact match
    key = f"{r},{g},{b}"
    
    # Try exact match first
    if key in COLOR_MAP:
        return COLOR_MAP[key]
    
    # Try fuzzy match (close colors)
    for color_str, class_name in COLOR_MAP.items():
        parts = color_str.split(',')
        cr, cg, cb = int(parts[0]), int(parts[1]), int(parts[2])
        if abs(r - cr) <= 10 and abs(g - cg) <= 10 and abs(b - cb) <= 10:
            return class_name
    
    # Default: return hex color
    return rgb_to_hex((r, g, b))

def run_to_html(run):
    """Convert a single run to HTML with proper formatting"""
    text = run.text
    if not text:
        return ""
    
    # Escape HTML special characters
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    
    # Determine formatting
    is_bold = run.bold
    is_italic = run.italic
    
    # Get color class
    color_class = None
    inline_style = ""
    
    if run.font and run.font.color and run.font.color.rgb:
        rgb = run.font.color.rgb
        color_class = get_color_class(rgb)
        
        # If it's a hex color (not a semantic class), use inline style
        if color_class and color_class.startswith('#'):
            inline_style = f'color: {color_class};'
            color_class = None
    
    # Build HTML - handle combinations properly
    # Priority: bold + color (scripture), italic + color, bold, italic, color only
    
    if is_bold and color_class:
        # Bold + color (e.g., scripture citations)
        return f'<strong class="{color_class}">{text}</strong>'
    elif is_bold and inline_style:
        return f'<strong style="{inline_style}">{text}</strong>'
    elif is_bold and is_italic:
        return f"<strong><em>{text}</em></strong>"
    elif is_bold:
        return f"<strong>{text}</strong>"
    elif is_italic and color_class:
        return f'<em class="{color_class}">{text}</em>'
    elif is_italic and inline_style:
        return f'<em style="{inline_style}">{text}</em>'
    elif is_italic:
        return f"<em>{text}</em>"
    elif color_class:
        return f'<span class="{color_class}">{text}</span>'
    elif inline_style:
        return f'<span style="{inline_style}">{text}</span>'
    else:
        return text

def paragraph_to_html(paragraph):
    """Convert a paragraph to HTML, preserving inline formatting"""
    if not paragraph.text.strip():
        return ""
    
    # If paragraph has only simple formatting, use runs
    html_parts = []
    for run in paragraph.runs:
        html_parts.append(run_to_html(run))
    
    return ''.join(html_parts)

def read_docx_with_formatting(torah_num):
    """Read content from a docx file with formatting"""
    filename = get_docx_filename(torah_num)
    filepath = os.path.join(SOURCE_DIR, filename)
    
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return None
    
    doc = Document(filepath)
    paragraphs = []
    
    for p in doc.paragraphs:
        html = paragraph_to_html(p)
        if html.strip():
            paragraphs.append(html)
    
    return paragraphs

def create_astro_page(torah_num, paragraphs):
    """Create an Astro page from formatted content"""
    
    # Get prev/next links
    prev_num = torah_num - 1 if torah_num > 1 else None
    next_num = torah_num + 1 if torah_num < 286 else None
    
    nav_links = ""
    if prev_num:
        nav_links += f'      <a href="/teachings/likutay-moharan-volume-1-torah-{prev_num}" class="nav-link">← Prev</a>\n'
    nav_links += '      <a href="/teachings/likutay-moharan" class="nav-link">← Index</a>\n'
    if next_num:
        nav_links += f'      <a href="/teachings/likutay-moharan-volume-1-torah-{next_num}" class="nav-link">Next →</a>'
    
    # Convert paragraphs to HTML
    content_paragraphs = ""
    for para in paragraphs:
        content_paragraphs += f"      <p>{para}</p>\n"
    
    astro_template = f"""---
const pageTitle = "Likutay Moharan Volume 1 - Torah {torah_num}";
const pageDescription = "Torah {torah_num}";
---

<style>
  .page-header {{
    background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
    color: white;
    padding: 4rem 2rem;
    text-align: center;
  }}
  .page-header h1 {{ font-family: var(--font-hebrew); font-size: 2rem; margin-bottom: 0.5rem; }}
  .container {{ max-width: 800px; margin: 0 auto; padding: 0 2rem; }}
  .navigation {{ background: #f7f5f0; padding: 1rem 0; }}
  .nav-links {{ display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }}
  .nav-link {{ color: #1a365d; text-decoration: none; padding: 0.5rem 1rem; background: white; border-radius: 8px; }}
  .nav-link:hover {{ background: #1a365d; color: white; }}
  .content {{ padding: 3rem 0; }}
  .content-text {{
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    line-height: 1.9;
    font-size: 1.05rem;
  }}
  .content-text p {{ margin-bottom: 1.5rem; }}
  .content-text .scripture {{ color: #003087; font-weight: bold; }}
  .content-text .term {{ color: #006600; font-weight: bold; }}
  .content-text .header {{ color: #0066CC; font-weight: bold; }}
  .content-text .explanation {{ color: #555555; font-style: italic; }}
  .hebrew {{ font-family: 'SBL Hebrew', Arial, sans-serif; direction: rtl; margin: 1rem 0; }}
</style>

<section class="page-header">
  <h1>Likutay Moharan Vol 1 - Torah {torah_num}</h1>
</section>

<nav class="navigation">
  <div class="container">
    <div class="nav-links">
{nav_links}
    </div>
  </div>
</nav>

<section class="content">
  <div class="container">
    <div class="content-text">
{content_paragraphs}
    </div>
  </div>
</section>

<nav class="footer-nav">
  <div class="container">
    <a href="/teachings/likutay-moharan" class="back-link">
      <span>←</span>
      <span>Back to Likutay Moharan</span>
    </a>
  </div>
</nav>

---
import Layout from '../../layouts/Layout.astro';
"""
    
    return astro_template

def main():
    # Process all files 1-286
    total = 286
    errors = []
    
    for torah_num in range(1, total + 1):
        if torah_num % 20 == 0:
            print(f"Processing Torah {torah_num}/{total}...")
        
        paragraphs = read_docx_with_formatting(torah_num)
        if paragraphs is None:
            errors.append(torah_num)
            continue
        
        astro_content = create_astro_page(torah_num, paragraphs)
        
        output_filename = f"likutay-moharan-volume-1-torah-{torah_num}.astro"
        output_path = os.path.join(TARGET_DIR, output_filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(astro_content)
    
    if errors:
        print(f"\nErrors processing: {errors}")
    else:
        print(f"\nSuccessfully converted all {total} files!")

if __name__ == "__main__":
    main()
