#!/usr/bin/env python3
"""Fix reader templates: ensure outer try-catch has proper closing brace before 'if (!torahData'."""
import os

reader_dir = "src/pages/reader"
fixed = 0

for root, dirs, files in os.walk(reader_dir):
    for f in files:
        if f == "[torah].astro":
            path = os.path.join(root, f)
            with open(path) as fh:
                content = fh.read()
            
            # The bug: after "} catch (e2) { error = ...; }" there should be a "}" 
            # to close the outer catch, but the previous fix script removed it.
            # Pattern: "}\n}\n\nif (!torahData" should be "}\n\nif (!torahData"
            # We need to add back the "}" before "\n\nif (!torahData"
            
            # Find the pattern: the last error assignment in the inner catch,
            # followed by "\n\nif (!torahData" - meaning the outer } was removed
            lines = content.split('\n')
            new_lines = []
            i = 0
            while i < len(lines):
                line = lines[i]
                stripped = line.strip()
                
                # Look for: }  (end of inner catch) followed by blank line, then "if (!torahData"
                if stripped == '}' and i + 1 < len(lines):
                    # Check if next line is blank and line after starts with "if (!torahData"
                    next_idx = i + 1
                    while next_idx < len(lines) and lines[next_idx].strip() == '':
                        next_idx += 1
                    if next_idx < len(lines) and lines[next_idx].strip().startswith('if (!torahData'):
                        # Count consecutive } before this one
                        # We need: } (close inner catch e2) \n } (close outer catch e) \n\n if (!torahData
                        # Currently we have: } \n\n if (!torahData (missing outer })
                        # Check if there's already a } two lines back
                        has_double_brace = False
                        j = i - 1
                        while j >= 0 and lines[j].strip() == '':
                            j -= 1
                        if j >= 0 and lines[j].strip() == '}':
                            # Check two levels back
                            k = j - 1
                            while k >= 0 and lines[k].strip() == '':
                                k -= 1
                            if k >= 0 and 'catch (e2)' in lines[k]:
                                has_double_brace = True
                        
                        if not has_double_brace:
                            # Insert the missing outer }
                            new_lines.append('}')
                
                new_lines.append(line)
                i += 1
            
            new_content = '\n'.join(new_lines)
            if new_content != content:
                with open(path, 'w') as fh:
                    fh.write(new_content)
                fixed += 1
                print(f"  FIXED: {path}")

print(f"Fixed {fixed} templates")
