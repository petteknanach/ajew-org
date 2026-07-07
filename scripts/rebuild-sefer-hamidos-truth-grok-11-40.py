#!/usr/bin/env python3
import json, urllib.request, textwrap, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/images/sefer-hamidos-truth'
BASE=OUT/'grok-bases-11-40'
OUT.mkdir(parents=True,exist_ok=True); BASE.mkdir(parents=True,exist_ok=True)
URLS=json.load(open(ROOT/'tmp_sefer_hamidos_truth_11_40_grok_urls.json',encoding='utf-8'))
TOPIC=json.load(open(ROOT/'public/reader/sefer-hamidos/topic-1.json',encoding='utf-8'))
SEGS={int(s['index']):s for s in TOPIC['segments']}
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SERIF='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
NANACH='נַ נַחְ נַחְמָ נַחְמָן מאומן'
W,H=1280,720

def download(url,path):
    if path.exists() and path.stat().st_size>50000: return
    urllib.request.urlretrieve(url,path)

def cover(im):
    im=im.convert('RGB')
    scale=max(W/im.width,H/im.height)
    im=im.resize((int(im.width*scale),int(im.height*scale)),Image.LANCZOS)
    return im.crop(((im.width-W)//2,(im.height-H)//2,(im.width+W)//2,(im.height+H)//2))

def text_w(d,txt,font,direction):
    b=d.textbbox((0,0),txt,font=font,direction=direction)
    return b[2]-b[0]

def wrap(d,text,font,maxw,direction):
    words=text.split()
    lines=[]; cur=''
    for w in words:
        cand=(cur+' '+w).strip()
        if cur and text_w(d,cand,font,direction)>maxw:
            lines.append(cur); cur=w
        else: cur=cand
    if cur: lines.append(cur)
    return lines

def choose(d,text,lang,maxw,maxh):
    direction='rtl' if lang=='he' else 'ltr'
    face=BOLD if lang=='he' else SERIF
    for size in range(38,17,-2):
        f=ImageFont.truetype(face,size)
        lines=wrap(d,text,f,maxw,direction)
        lh=int(size*1.28)
        if lines and len(lines)*lh<=maxh and max(text_w(d,l,f,direction) for l in lines)<=maxw:
            return f,lines,lh,direction
    f=ImageFont.truetype(face,17)
    return f,wrap(d,text,f,maxw,direction),22,direction

def draw_exact_kippah_seal(d, box):
    x1,y1,x2,y2=box
    d.ellipse(box, fill=(252,252,247,242), outline=(35,75,145,235), width=4)
    nf=ImageFont.truetype(BOLD,23)
    d.text(((x1+x2)//2,(y1+y2)//2), NANACH, font=nf, fill=(8,45,115,255), direction='rtl', anchor='mm', stroke_width=1, stroke_fill=(255,255,255,220))
    small=ImageFont.truetype(FONT,12)
    d.text(((x1+x2)//2,y2-16), 'authentic Na Nach kippah text', font=small, fill=(30,55,90,220), anchor='mm')

def overlay(base, idx, lang, variant):
    seg=SEGS[idx]
    text=seg.get('he_nikud') or seg['he'] if lang=='he' else seg['en']
    im=base.convert('RGBA')
    # subtle vignette, no toddler shapes
    vign=Image.new('RGBA',(W,H),(0,0,0,0)); vd=ImageDraw.Draw(vign)
    for i,a in [(0,95),(90,45),(180,0)]:
        vd.rounded_rectangle((i,i,W-i,H-i), radius=1, outline=(0,0,0,a), width=95)
    im=Image.alpha_composite(im,vign)
    d=ImageDraw.Draw(im,'RGBA')
    # Elegant meme lower-third, varied A/B
    if variant=='A':
        panel=(54,478,1226,686); fill=(8,18,38,218); outline=(242,205,104,230); body=(255,250,232,255); titlec=(255,215,120,255)
    else:
        panel=(54,40,1226,236); fill=(255,249,232,226); outline=(42,74,135,220); body=(9,29,62,255); titlec=(92,53,12,255)
    d.rounded_rectangle(panel,radius=26,fill=fill,outline=outline,width=4)
    title_font=ImageFont.truetype(BOLD,25)
    title = f"Sefer HaMidos · Truth {idx} · Variant {variant}" if lang=='en' else f"ספר המידות · אמת {idx} · תמונה {variant}"
    direction='rtl' if lang=='he' else 'ltr'; anchor='ra' if lang=='he' else 'la'; tx=panel[2]-30 if lang=='he' else panel[0]+30
    d.text((tx,panel[1]+17), title, font=title_font, fill=titlec, direction=direction, anchor=anchor)
    f,lines,lh,dirn=choose(d,text,lang,panel[2]-panel[0]-60,panel[3]-panel[1]-76)
    y=panel[1]+58
    for line in lines:
        x=panel[2]-30 if dirn=='rtl' else panel[0]+30
        anc='ra' if dirn=='rtl' else 'la'
        d.text((x,y), line, font=f, fill=body, direction=dirn, anchor=anc, stroke_width=1, stroke_fill=(0,0,0,120) if variant=='A' else (255,255,255,160))
        y+=lh
    # exact kippah text seal in the picture so no random letters issue
    draw_exact_kippah_seal(d, (1016,260,1222,420) if variant=='A' else (1014,482,1222,642))
    credit=ImageFont.truetype(FONT,16)
    d.text((65,704),'Grok cinematic image · exact Sefer Hamidos text overlaid for ajew.org',font=credit,fill=(255,255,255,210),stroke_width=1,stroke_fill=(0,0,0,150))
    return im.convert('RGB')

manifest_path=OUT/'manifest.json'
manifest=json.load(open(manifest_path,encoding='utf-8')) if manifest_path.exists() else {'book':'sefer-hamidos','topic':1,'topic_title':'Truth / אמת','entries':[]}
byseg={int(e['segment']):e for e in manifest.get('entries',[])}
for i in range(11,41):
    base_path=BASE/f'sh-truth-{i:02d}-grok-base.png'
    download(URLS[str(i)], base_path)
    base=cover(Image.open(base_path)).filter(ImageFilter.UnsharpMask(radius=1,percent=110))
    entry={'segment':i,'he':SEGS[i].get('he_nikud') or SEGS[i]['he'],'en':SEGS[i]['en'],'images':[],'style_note':'Rebuilt with Grok quality cinematic base image; exact canonical teaching text and exact Na Nach kippah phrase overlaid by code.'}
    for variant in ['A','B']:
        for lang in ['he','en']:
            fname=f'sh-truth-{i:02d}-grok-{variant.lower()}-{lang}.png'
            out=OUT/fname
            overlay(base,i,lang,variant).save(out,optimize=True)
            item={'language':'hebrew' if lang=='he' else 'english','variant':f'Grok {variant}','path':f'/images/sefer-hamidos-truth/{fname}','archive_filename':fname,'base_image':f'/images/sefer-hamidos-truth/grok-bases-11-40/{base_path.name}'}
            # Real Grok video will be attached later when generated; old ffmpeg pan videos intentionally not reused.
            entry['images'].append(item)
    byseg[i]=entry
manifest['entries']=[byseg[k] for k in sorted(byseg)]
manifest['generated']='2026-07-07'
manifest['note']='Truth 11-40 rebuilt with high-quality Grok cinematic base images; exact Hebrew/English teaching text and exact Na Nach phrase are composited deterministically.'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('rebuilt',30,'teachings, images',30*4)
print(OUT)
