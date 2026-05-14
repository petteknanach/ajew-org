#!/usr/bin/env python3
"""Fix extra closing brace in reader templates after CDN fallback patch."""
import os
import re

reader_dir = "src/pages/reader"
fixed = 0

for root, dirs, files in os.walk(reader_dir):
    for f in files:
        if f == "[torah].astro":
            path = os.path.join(root, f)
            with open(path) as fh:
                content = fh.read()
            
            # Look for the pattern: extra } before "if (!torahData"
            # The issue is: }\n}\n\nif (!torahData  (extra closing brace)
            lines = content.split('\n')
            new_lines = []
            skip_next_close = False
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped == '}' and i + 1 < len(lines) and lines[i+1].strip() == '':
                    # Check if next non-empty line starts with "if (!torahData"
                    for j in range(i+1, min(i+4, len(lines))):
                        if lines[j].strip():
                            if lines[j].strip().startswith('if (!torahData'):
                                # This is the extra }, skip it
                                skip_next_close = True
                            break
                if skip_next_close and stripped == '}':
                    skip_next_close = False
                    continue
                new_lines.append(line)
            
            new_content = '\n'.join(new_lines)
            if new_content != content:
                with open(path, 'w') as fh:
                    fh.write(new_content)
                fixed += 1
                print(f"  FIXED: {path}")

print(f"Fixed {fixed} templates")
