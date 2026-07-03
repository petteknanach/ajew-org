#!/usr/bin/env python3
import json, os, re, subprocess, textwrap, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/images/sefer-hamidos-truth'
BG = OUT / 'backgrounds'
OUT.mkdir(parents=True, exist_ok=True)
BG.mkdir(parents=True, exist_ok=True)

URLS = {
  (1,'a'): 'https://files-cdn.x.ai/dJqGZ1t1RGWkWgvLA9pfkQ/file_7e95f79d-db82-4a1a-80fb-c30939fcf862.png',
  (1,'b'): 'https://files-cdn.x.ai/WEenj1VrRW-8Vd77OryZEQ/file_c3af52d2-87ac-427b-a759-ff4f2f8dba96.png',
  (2,'a'): 'https://files-cdn.x.ai/YaRGZejQRu-577KAf8jZ9g/file_c1f50413-8485-4c58-b967-964c6b00e495.png',
  (2,'b'): 'https://files-cdn.x.ai/5Qd_PEx8S921JK4MvdFKsQ/file_0819cf20-5579-45f0-8cdc-75457f1deefe.png',
  (3,'a'): 'https://files-cdn.x.ai/4tXat49VSqC8Y3N_iHMJ6g/file_6078ed8a-0aa6-4799-8deb-08c42cb50a77.png',
  (3,'b'): 'https://files-cdn.x.ai/3uSf-eN8QqejOR9hndmU6g/file_cca25fba-bdc4-422e-bf50-5c3a5ce23ed6.png',
  (4,'a'): 'https://files-cdn.x.ai/IBRnfU0JReC2WWeINSiUFQ/file_69a630a8-4ba2-4939-ae09-fdb2c4f897f6.png',
  (4,'b'): 'https://files-cdn.x.ai/YHLTH3_BSfiA6rgzpgRuXg/file_bcd8440a-a9dc-4c5b-a062-1c39bd3d2e4c.png',
  (5,'a'): 'https://files-cdn.x.ai/APnkcAyUQVOd_BB-pH_Xxg/file_0fffe40b-6c6d-4e30-afce-2d751fe29fe9.png',
  (5,'b'): 'https://files-cdn.x.ai/-ywS4r4IQpS03xt2WdX0Yw/file_83cbfd35-1d51-470a-8815-f9368404c384.png',
  (6,'a'): 'https://files-cdn.x.ai/jhwTOnLPSGG5u5LJMon8Sw/file_67e317ee-25df-4e3c-a04d-d11352a7e688.png',
  (6,'b'): 'https://files-cdn.x.ai/LbFGQSyZQXKWAUo7_Th0AA/file_42b8b9b7-9ba4-432e-acf4-708668a1f9f5.png',
  (7,'a'): 'https://files-cdn.x.ai/plvERvllS0SHV0XBIyx0EQ/file_1dabe2a3-f8e7-4e13-b421-6972f6bd50de.png',
  (7,'b'): 'https://files-cdn.x.ai/BMQmUDkYSFqT5TydJepErw/file_dce446df-b1b7-44f4-b124-4fc4bc398ca8.png',
  (8,'a'): 'https://files-cdn.x.ai/oBlo_tykR4uanwmys0sfmg/file_e6fa0fae-dd85-4a98-bf01-67f8450a4e81.png',
  (8,'b'): 'https://files-cdn.x.ai/MPO0nl-iQr64ne71L6ulgQ/file_f50abb13-7c8d-4222-a05e-11123616d130.png',
  (9,'a'): 'https://files-cdn.x.ai/tr-UHpPLSv2fWVgQvhFV2A/file_ca0b2d63-b2b9-4ce1-98f0-e09b50d2b16a.png',
  (9,'b'): 'https://files-cdn.x.ai/v_Hr9fXNQYy0VOFfIjnybQ/file_189769c7-fb04-4681-88ab-1ef41291ec54.png',
  (10,'a'): 'https://files-cdn.x.ai/T-UPVvmSScWrDtqO37X5fQ/file_cb03ee53-cef5-4c18-a0d1-f305290cb243.png',
  (10,'b'): 'https://files-cdn.x.ai/62i5lKKnT76sbE5RlMowgg/file_8d40bdef-b4e1-493f-8335-cbd28862a8d3.png',
}

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

with open(ROOT/'public/reader/sefer-hamidos/topic-1.json', encoding='utf-8') as f:
    topic = json.load(f)
segments = {int(s['index']): s for s in topic['segments'][:10]}

# clear old top-level PNGs for deterministic output
for p in OUT.glob('sh-truth-*.png'):
    p.unlink()

def download(url, dest):
    if dest.exists() and dest.stat().st_size > 10000:
        return
    urllib.request.urlretrieve(url, dest)

def fit_bg(path):
    im = Image.open(path).convert('RGB')
    target=(1280,720)
    im.thumbnail((target[0]*2, target[1]*2))
    # cover crop
    scale=max(target[0]/im.width, target[1]/im.height)
    im=im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS)
    left=(im.width-target[0])//2; top=(im.height-target[1])//2
    return im.crop((left,top,left+target[0],top+target[1]))

def line_width(draw, line, font, direction=None):
    b = draw.textbbox((0,0), line, font=font, direction=direction)
    return b[2]-b[0]

def wrap_words(draw, text, font, maxw, direction=None):
    words=text.split()
    lines=[]; cur=''
    for w in words:
        cand = (cur + ' ' + w).strip()
        if cur and line_width(draw, cand, font, direction) > maxw:
            lines.append(cur); cur=w
        else:
            cur=cand
    if cur: lines.append(cur)
    return lines

def choose_font(draw, text, lang, maxw, maxh):
    direction = 'rtl' if lang=='he' else 'ltr'
    for size in range(52, 21, -2):
        font = ImageFont.truetype(FONT_BOLD if lang=='he' else FONT, size)
        lines = wrap_words(draw, text, font, maxw, direction)
        line_h = int(size*1.28)
        if len(lines)*line_h <= maxh and max(line_width(draw,l,font,direction) for l in lines) <= maxw:
            return font, lines, line_h, direction
    size=22; font=ImageFont.truetype(FONT, size)
    return font, wrap_words(draw, text, font, maxw, direction), int(size*1.25), direction

def draw_panel(im, text, lang, idx, variant):
    im = im.filter(ImageFilter.UnsharpMask(radius=1, percent=110))
    overlay = Image.new('RGBA', im.size, (0,0,0,0))
    d = ImageDraw.Draw(overlay)
    # text panel
    panel=(62,55,1218,330)
    d.rounded_rectangle(panel, radius=24, fill=(255,248,226,226), outline=(54,38,18,210), width=3)
    maxw=panel[2]-panel[0]-58; maxh=panel[3]-panel[1]-86
    font, lines, line_h, direction = choose_font(d, text, lang, maxw, maxh)
    title_font=ImageFont.truetype(FONT_BOLD, 25)
    title = f"Sefer HaMidos · Truth {idx} · Variant {variant.upper()}" if lang=='en' else f"ספר המידות · אמת {idx} · תמונה {variant.upper()}"
    d.text((panel[0]+28, panel[1]+16), title, font=title_font, fill=(75,45,10,255), direction='rtl' if lang=='he' else 'ltr')
    y=panel[1]+58
    for line in lines:
        if direction=='rtl':
            x=panel[2]-28
            anchor='ra'
        else:
            x=panel[0]+28
            anchor='la'
        d.text((x,y), line, font=font, fill=(15,31,56,255), direction=direction, anchor=anchor, stroke_width=1, stroke_fill=(255,255,255,190))
        y += line_h
    # Na Nach insignia ribbon
    ribbon=(675,618,1225,690)
    d.rounded_rectangle(ribbon, radius=18, fill=(12,38,80,222), outline=(235,202,92,255), width=3)
    nanach='נַ נַחְ נַחְמָ נַחְמָן מאומן'
    nf=ImageFont.truetype(FONT_BOLD, 34)
    d.text((950,654), nanach, font=nf, fill=(255,245,175,255), direction='rtl', anchor='mm', stroke_width=1, stroke_fill=(0,0,0,170))
    d.text((97,666), 'Generated for ajew.org · modest Breslov / Na Nach visual', font=ImageFont.truetype(FONT, 18), fill=(255,255,255,210), stroke_width=1, stroke_fill=(0,0,0,160))
    return Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')

manifest={'book':'sefer-hamidos','topic':1,'topic_title':'Truth / אמת','generated':'2026-07-03','entries':[]}
for idx in range(1,11):
    seg=segments[idx]
    entry={'segment':idx,'he':seg['he'],'en':seg['en'],'images':[]}
    for variant in ['a','b']:
        bg_path=BG/f'bg-{idx:02d}-{variant}.png'
        download(URLS[(idx,variant)], bg_path)
        bg=fit_bg(bg_path)
        for lang, text in [('he', seg['he']), ('en', seg['en'])]:
            filename=f'sh-truth-{idx:02d}-{variant}-{lang}.png'
            out=OUT/filename
            draw_panel(bg.copy(), text, lang, idx, variant).save(out, optimize=True)
            entry['images'].append({'language':'hebrew' if lang=='he' else 'english','variant':variant.upper(),'path':f'/images/sefer-hamidos-truth/{filename}','archive_filename':filename})
    manifest['entries'].append(entry)

(OUT/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print('generated images', len(list(OUT.glob('sh-truth-*.png'))))
print(OUT)
