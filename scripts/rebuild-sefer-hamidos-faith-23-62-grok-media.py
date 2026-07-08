#!/usr/bin/env python3
import json, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/images/sefer-hamidos-faith'
BASE=OUT/'grok-bases-23-62'
OUT.mkdir(parents=True,exist_ok=True); BASE.mkdir(parents=True,exist_ok=True)
URLS=json.load(open(ROOT/'tmp_sefer_hamidos_faith_23_62_grok_urls.json',encoding='utf-8'))
VURLS=json.load(open(ROOT/'tmp_sefer_hamidos_faith_23_62_grok_video_urls.json',encoding='utf-8'))
TOPIC=json.load(open(ROOT/'public/reader/sefer-hamidos/topic-4.json',encoding='utf-8'))
SEGS={int(s['index']):s for s in TOPIC['segments']}
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; SERIF='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
NANACH='נַ נַחְ נַחְמָ נַחְמָן מאומן'; W,H=1280,720

def download(url,path,minsize=50000):
    if path.exists() and path.stat().st_size>minsize: return
    urllib.request.urlretrieve(url,path)

def cover(im):
    im=im.convert('RGB'); scale=max(W/im.width,H/im.height)
    im=im.resize((int(im.width*scale),int(im.height*scale)),Image.LANCZOS)
    return im.crop(((im.width-W)//2,(im.height-H)//2,(im.width+W)//2,(im.height+H)//2))

def text_w(d,txt,font,direction):
    b=d.textbbox((0,0),txt,font=font,direction=direction); return b[2]-b[0]

def wrap(d,text,font,maxw,direction):
    words=text.split(); lines=[]; cur=''
    for w in words:
        cand=(cur+' '+w).strip()
        if cur and text_w(d,cand,font,direction)>maxw:
            lines.append(cur); cur=w
        else: cur=cand
    if cur: lines.append(cur)
    return lines

def choose(d,text,lang,maxw,maxh):
    direction='rtl' if lang=='he' else 'ltr'; face=BOLD if lang=='he' else SERIF
    for size in range(38,16,-2):
        f=ImageFont.truetype(face,size); lines=wrap(d,text,f,maxw,direction); lh=int(size*1.28)
        if lines and len(lines)*lh<=maxh and max(text_w(d,l,f,direction) for l in lines)<=maxw:
            return f,lines,lh,direction
    f=ImageFont.truetype(face,16); return f,wrap(d,text,f,maxw,direction),21,direction

def seal(d, box):
    x1,y1,x2,y2=box
    d.ellipse(box, fill=(252,252,247,238), outline=(35,75,145,230), width=4)
    nf=ImageFont.truetype(BOLD,22)
    d.text(((x1+x2)//2,(y1+y2)//2), NANACH, font=nf, fill=(8,45,115,255), direction='rtl', anchor='mm', stroke_width=1, stroke_fill=(255,255,255,220))

def overlay(base, idx, lang):
    seg=SEGS[idx]; text=(seg.get('he_nikud') or seg['he']) if lang=='he' else seg['en']
    im=base.convert('RGBA'); d=ImageDraw.Draw(im,'RGBA')
    # cinematic dark lower-third; exact text by code only
    panel=(46,470,1234,690); d.rounded_rectangle(panel,radius=26,fill=(4,13,30,224),outline=(244,204,100,235),width=4)
    title_font=ImageFont.truetype(BOLD,25)
    title=f"Sefer HaMidos · Faith {idx} · Grok cinematic" if lang=='en' else f"ספר המידות · אמונה {idx} · Grok"
    direction='rtl' if lang=='he' else 'ltr'; anchor='ra' if lang=='he' else 'la'; tx=panel[2]-30 if lang=='he' else panel[0]+30
    d.text((tx,panel[1]+17), title, font=title_font, fill=(255,218,122,255), direction=direction, anchor=anchor)
    f,lines,lh,dirn=choose(d,text,lang,panel[2]-panel[0]-60,panel[3]-panel[1]-76)
    y=panel[1]+58
    for line in lines:
        x=panel[2]-30 if dirn=='rtl' else panel[0]+30; anc='ra' if dirn=='rtl' else 'la'
        d.text((x,y), line, font=f, fill=(255,250,232,255), direction=dirn, anchor=anc, stroke_width=1, stroke_fill=(0,0,0,130)); y+=lh
    seal(d,(1020,250,1224,410))
    credit=ImageFont.truetype(FONT,15)
    d.text((54,704),'Grok realistic/cinematic base · exact Sefer Hamidos text overlaid for ajew.org',font=credit,fill=(255,255,255,210),stroke_width=1,stroke_fill=(0,0,0,150))
    return im.convert('RGB')

manifest_path=OUT/'manifest.json'
manifest=json.load(open(manifest_path,encoding='utf-8'))
byseg={int(e['segment']):e for e in manifest.get('entries',[])}
for k,url in sorted(URLS.items(), key=lambda kv:int(kv[0])):
    idx=int(k); base_path=BASE/f'sh-faith-{idx:02d}-grok-base.png'; download(url,base_path)
    base=cover(Image.open(base_path)).filter(ImageFilter.UnsharpMask(radius=1,percent=110))
    entry=byseg[idx]
    # remove prior Grok C if re-run, preserve old holy teaching images
    entry['images']=[im for im in entry.get('images',[]) if im.get('variant')!='Grok C']
    mp4name=None
    if str(idx) in VURLS:
        mp4name=f'sh-faith-{idx:02d}-grok-motion.mp4'; download(VURLS[str(idx)], OUT/mp4name, minsize=100000)
        entry['grok_video_source_url']=VURLS[str(idx)]
        entry['video_note']='Grok image-to-video with prompted real scene/object motion; not ffmpeg pan/zoom.'
    for lang in ['he','en']:
        fname=f'sh-faith-{idx:02d}-grok-c-{lang}.png'; overlay(base,idx,lang).save(OUT/fname,optimize=True)
        item={'language':'hebrew' if lang=='he' else 'english','variant':'Grok C','path':f'/images/sefer-hamidos-faith/{fname}','archive_filename':fname,'base_image':f'/images/sefer-hamidos-faith/grok-bases-23-62/{base_path.name}','quality':'Grok realistic/cinematic replacement'}
        if mp4name:
            item['video_path']=f'/images/sefer-hamidos-faith/{mp4name}'; item['video_archive_filename']=mp4name
        entry['images'].append(item)
    entry['style_note']='Includes preserved older teaching-bearing media plus Grok-quality realistic/cinematic replacements with exact text overlaid.'
    byseg[idx]=entry
manifest['entries']=[byseg[k] for k in sorted(byseg)]
manifest['generated']='2026-07-08'
manifest['note']='Faith 23-62: preserved prior teaching-bearing media; appended Grok-quality realistic/cinematic replacement images for all 40 teachings. Grok motion videos attached where provider credits allowed.'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('grok images',len(URLS)*2,'grok videos',len(VURLS))
print(OUT)
