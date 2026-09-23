import re
t = open('/root/.hermes/cache/scratch/hk_ocr.txt').read()
lines = [l for l in t.split(chr(10)) if l.strip()]
for i in range(18050, 18130):
    print(i, '|', lines[i][:110])
