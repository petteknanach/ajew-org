#!/usr/bin/env python3
"""Explore Otzros Ramchal HTML structure to understand EN-HE pairing."""
import re
import os

html_dir = '/mnt/c/Users/Pettek/Downloads/Oatrzoas Ramchal/'
files = sorted([f for f in os.listdir(html_dir) if f.endswith('.html')])

print("Otzros Ramchal HTML files:", files)
print()

# Check first file
with open(html_dir + files[0], 'r', encoding='utf-8') as f:
    content = f.read()

# Find all div tags with para class
para_matches = re.findall(r'<div class="para">.*?</div>', content, re.DOTALL)
print(f'Total para divs in {files[0]}: {len(para_matches)}')
print()

for i, pm in enumerate(para_matches[:5]):
    print(f'Para {i}:')
    # Extract text from each part
    p_texts = re.findall(r'<p[^>]*>(.*?)</p>', pm, re.DOTALL)
    for j, pt in enumerate(p_texts):
        clean = re.sub(r'<[^>]+>', '', pt).strip()
        hebrew = any(ord(c) > 127 for c in clean)
        print(f'  P{j} [{len(clean)} chars]: {clean[:150]}...' if len(clean) > 150 else f'  P{j} [{len(clean)} chars]: {clean}')
    print()