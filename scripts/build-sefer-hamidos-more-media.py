#!/usr/bin/env python3
import json, math, os, random, shutil, subprocess, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / 'public/reader/sefer-hamidos'
W, H = 1280, 720
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
NANACH = 'נַ נַחְ נַחְמָ נַחְמָן מאומן'

BATCH = [
    # Continue from the already-deployed Truth 1-30, then the next topic's ten teachings.
    {'topic': 1, 'slug': 'truth', 'title': 'Truth / אמת', 'segments': list(range(31, 61))},
    {'topic': 2, 'slug': 'hospitality', 'title': 'Hospitality / הכנסת אורחים', 'segments': list(range(1, 11))},
]

CONCEPTS = [
 'storm clouds splitting over Jerusalem gold', 'glowing open sefer on a wooden table', 'desert night with brilliant stars',
 'bridge over rushing river at sunrise', 'ancient city gate with warm candles', 'forest path with rays of light',
 'shofar-shaped cloud over hills', 'market street with modest Breslov family silhouettes', 'mountain cliff and distant path',
 'parchment map with compass and blue light', 'waterfall and rainbow mist', 'olive grove with lamp and scroll',
 'close-up quill writing on parchment', 'sea waves under moonlit sky', 'garden archway with pomegranates',
 'ladder of light between valleys', 'stone steps rising to holy city', 'snowy mountain dawn',
 'candlelit window in a stone home', 'wheat field under dramatic sky', 'river stones and reflected letters',
 'celestial spiral of golden sparks', 'Torah crown silhouette and blue velvet', 'desert tent welcoming guests',
 'warm doorway and table prepared for guests', 'glowing path through cypress trees', 'old bridge in Tzfat alley',
 'shofar and prayer shawl on sunrise ridge', 'lanterns along rainy cobblestones', 'children silhouettes near a garden gate',
 'white Na Nach beanie on chair beside sefer', 'two roads diverging under clouds', 'well of water in desert oasis',
 'ark doors opening with soft light', 'sailing boat on calm lake', 'eagle over mountains', 'palm trees at dusk',
 'close-up of charity box and candle', 'family table with challah and warm light', 'heavenly palace gates in mist',
]
PALETTES = [
 ((10,24,55),(240,183,72),(45,94,130)), ((20,44,38),(238,214,145),(111,56,38)),
 ((15,19,54),(114,87,185),(255,215,115)), ((5,47,75),(83,171,187),(255,201,107)),
 ((50,23,35),(184,82,72),(255,220,150)), ((16,57,40),(83,138,87),(247,225,166)),
 ((32,36,64),(188,151,94),(242,238,210)), ((28,32,39),(192,105,61),(250,220,150)),
]

def load_topic(n):
    return json.load(open(READER / f'topic-{n}.json', encoding='utf-8'))

def slugify(s):
    return ''.join(c.lower() if c.isalnum() else '-' for c in s).strip('-')

def gradient(c1, c2, c3, seed):
    img = Image.new('RGB', (W,H))
    px = img.load()
    rng = random.Random(seed)
    cx, cy = rng.uniform(.25,.75)*W, rng.uniform(.18,.65)*H
    for y in range(H):
        for x in range(W):
            t = y/(H-1)
            r = math.hypot((x-cx)/W, (y-cy)/H)
            mix = max(0, 1-r*1.7)
            base = tuple(int(c1[i]*(1-t)+c2[i]*t) for i in range(3))
            col = tuple(min(255, int(base[i]*(1-mix)+c3[i]*mix)) for i in range(3))
            px[x,y] = col
    return img

def draw_starfield(d, rng, count=90):
    for _ in range(count):
        x,y = rng.randrange(W), rng.randrange(int(H*.58))
        r = rng.choice([1,1,1,2,2,3])
        col = rng.choice([(255,240,170,210),(255,255,255,190),(135,206,250,180)])
        d.ellipse((x-r,y-r,x+r,y+r), fill=col)

def draw_hills(d, rng, palette):
    for layer in range(3):
        y0 = int(H*(.54 + layer*.09))
        pts=[(0,H)]
        for x in range(0,W+90,90):
            y = y0 + int(math.sin(x*.008 + layer*1.7 + rng.random())*34) + rng.randrange(-24,25)
            pts.append((x,y))
        pts += [(W,H)]
        color = tuple(max(0,min(255, palette[0][i] + 28*layer)) for i in range(3)) + (205,)
        d.polygon(pts, fill=color)

def draw_jerusalem(d, rng):
    base_y=520
    x=60
    while x<W-80:
        w=rng.randrange(45,90); h=rng.randrange(60,150)
        fill=rng.choice([(194,156,98,215),(222,190,126,218),(161,119,75,220)])
        d.rounded_rectangle((x,base_y-h,x+w,base_y), radius=5, fill=fill, outline=(255,231,160,80), width=2)
        if rng.random()<.35:
            d.arc((x+10,base_y-h-35,x+w-10,base_y-h+35),180,360,fill=fill,width=24)
        for wx in range(x+12,x+w-8,22):
            d.rounded_rectangle((wx,base_y-h+18,wx+9,base_y-h+38), radius=4, fill=(38,48,70,160))
        x += w + rng.randrange(8,22)

def draw_tree(d, x, y, scale, color):
    trunk=(95,59,34,205)
    d.rectangle((x-5*scale,y-55*scale,x+5*scale,y), fill=trunk)
    for i,r in enumerate([34,28,22]):
        d.ellipse((x-r*scale,y-(95+i*20)*scale,x+r*scale,y-(30+i*20)*scale), fill=color)

def draw_symbolic_scene(img, seed, concept, palette, variant):
    rng=random.Random(seed)
    d=ImageDraw.Draw(img,'RGBA')
    draw_starfield(d,rng, 55 if seed%3 else 130)
    # sun/moon/glow
    gx,gy=rng.randrange(120,1160),rng.randrange(70,250)
    for r,a in [(150,28),(95,36),(52,92)]:
        d.ellipse((gx-r,gy-r,gx+r,gy+r), fill=(255,220,112,a))
    if seed%5 in (0,1): draw_jerusalem(d,rng)
    if seed%5 in (2,3): draw_hills(d,rng,palette)
    if 'river' in concept or seed%7==0:
        pts=[]
        for y in range(360,H+40,30):
            width=80+(y-360)*.35
            cx=W/2 + math.sin(y*.025+seed)*160
            pts.append((cx-width,y)); pts.insert(0,(cx+width,y))
        d.polygon(pts, fill=(55,150,188,155))
        for y in range(390,H,45):
            d.arc((220,y-60,1060,y+70),0,180,fill=(255,255,255,80),width=2)
    if 'forest' in concept or seed%6==0:
        for tx in range(50,W,120): draw_tree(d, tx+rng.randrange(-25,25), 625+rng.randrange(-10,15), rng.uniform(.8,1.35), (31,105+rng.randrange(70),65,195))
    # symbolic objects
    if seed%4==0 or 'sefer' in concept or 'parchment' in concept:
        cx,cy = rng.randrange(250,1030), rng.randrange(385,535)
        d.rounded_rectangle((cx-170,cy-72,cx+170,cy+88), radius=18, fill=(245,231,188,225), outline=(105,62,26,180), width=4)
        d.line((cx,cy-65,cx,cy+80), fill=(119,75,33,180), width=3)
        for off in [-115,-80,-45,45,80,115]: d.line((cx+off,cy-42,cx+off//2,cy+48), fill=(84,62,44,75), width=2)
    if seed%4==1:
        # glowing doorway/table
        d.rounded_rectangle((780,300,1120,620), radius=18, fill=(82,52,38,190), outline=(255,216,142,180), width=5)
        d.rounded_rectangle((845,355,1055,620), radius=16, fill=(255,198,95,78))
        d.ellipse((145,520,480,645), fill=(104,60,34,210), outline=(255,225,164,120), width=4)
        d.ellipse((245,475,315,545), fill=(255,240,205,210))
    if seed%4==2:
        # bridge/road
        d.polygon([(100,H),(535,390),(725,390),(1180,H)], fill=(80,57,39,190))
        for i in range(8):
            y=420+i*38
            d.line((W/2-(i+1)*70,y,W/2+(i+1)*70,y), fill=(235,200,142,90), width=3)
    if seed%4==3:
        # candles/lamps
        for i in range(4):
            x=170+i*86+rng.randrange(-12,12); y=590+rng.randrange(-15,20)
            d.rectangle((x-10,y-80,x+10,y), fill=(244,231,190,225))
            d.ellipse((x-24,y-123,x+24,y-67), fill=(255,190,61,130))
            d.polygon([(x,y-118),(x-13,y-86),(x+13,y-86)], fill=(255,236,120,215))
    # Na Nach beanie/sign detail
    if seed%3==0:
        d.rounded_rectangle((58,585,398,662), radius=20, fill=(250,250,245,218), outline=(40,78,146,190), width=4)
        nf=ImageFont.truetype(FONT_BOLD, 30)
        d.text((228,624), NANACH, font=nf, fill=(12,52,118,255), direction='rtl', anchor='mm')
    return img.filter(ImageFilter.UnsharpMask(radius=1, percent=108))

def line_width(draw, line, font, direction):
    b = draw.textbbox((0,0), line, font=font, direction=direction)
    return b[2]-b[0]

def wrap(draw, text, font, maxw, direction):
    words=text.split()
    lines=[]; cur=''
    for w in words:
        cand=(cur+' '+w).strip()
        if cur and line_width(draw,cand,font,direction)>maxw:
            lines.append(cur); cur=w
        else: cur=cand
    if cur: lines.append(cur)
    return lines

def pick_font(draw, text, lang, maxw, maxh):
    direction='rtl' if lang=='he' else 'ltr'
    face=FONT_BOLD if lang=='he' else FONT_SERIF
    for size in range(44,18,-2):
        f=ImageFont.truetype(face,size)
        lines=wrap(draw,text,f,maxw,direction)
        lh=int(size*1.24)
        if lines and len(lines)*lh<=maxh and max(line_width(draw,l,f,direction) for l in lines)<=maxw:
            return f,lines,lh,direction
    f=ImageFont.truetype(face,18)
    return f,wrap(draw,text,f,maxw,direction),23,direction

def draw_text_overlay(bg, text, lang, topic_title, seg_idx, variant, concept):
    im=bg.convert('RGBA')
    d=ImageDraw.Draw(im,'RGBA')
    # picture-forward: compact caption panel; vary top/bottom/side
    positions=[(56,44,1224,248),(56,456,1224,676),(58,70,650,650),(630,70,1222,650)]
    panel=positions[(seg_idx + (0 if variant=='a' else 2)) % len(positions)]
    fill=(255,248,225,220) if variant=='a' else (13,31,59,213)
    outline=(255,219,119,230) if variant=='b' else (70,49,22,210)
    d.rounded_rectangle(panel, radius=24, fill=fill, outline=outline, width=4)
    title_font=ImageFont.truetype(FONT_BOLD, 24)
    title = f"Sefer HaMidos · {topic_title.split('/')[0].strip()} {seg_idx} · {variant.upper()}" if lang=='en' else f"ספר המידות · {topic_title.split('/')[-1].strip()} {seg_idx} · {variant.upper()}"
    title_fill=(255,236,158,255) if variant=='b' else (75,44,12,255)
    dirn='rtl' if lang=='he' else 'ltr'
    tx=panel[2]-28 if lang=='he' else panel[0]+28
    anchor='ra' if lang=='he' else 'la'
    d.text((tx,panel[1]+18), title, font=title_font, fill=title_fill, direction=dirn, anchor=anchor)
    maxw=panel[2]-panel[0]-56; maxh=panel[3]-panel[1]-86
    f, lines, lh, direction=pick_font(d, text, lang, maxw, maxh)
    body_fill=(250,250,245,255) if variant=='b' else (15,28,50,255)
    y=panel[1]+58
    for line in lines:
        x=panel[2]-28 if direction=='rtl' else panel[0]+28
        anchor='ra' if direction=='rtl' else 'la'
        d.text((x,y), line, font=f, fill=body_fill, direction=direction, anchor=anchor, stroke_width=1, stroke_fill=(0,0,0,80) if variant=='b' else (255,255,255,170))
        y += lh
    # compact Na Nach seal/ribbon
    d.rounded_rectangle((805,36,1224,92), radius=16, fill=(6,31,74,225), outline=(235,202,92,235), width=3)
    nf=ImageFont.truetype(FONT_BOLD, 27)
    d.text((1014,64), NANACH, font=nf, fill=(255,241,160,255), direction='rtl', anchor='mm', stroke_width=1, stroke_fill=(0,0,0,130))
    d.text((56,700), concept[:112], font=ImageFont.truetype(FONT,16), fill=(255,255,255,180), stroke_width=1, stroke_fill=(0,0,0,150))
    return im.convert('RGB')

def make_video(img_path, mp4_path, seed):
    if mp4_path.exists() and mp4_path.stat().st_size > 30000:
        return
    # short motion clip: slow zoom/pan across the exact final image
    zexpr = "min(zoom+0.0018,1.13)"
    xexpr = f"iw/2-(iw/zoom/2)+sin(on/38+{seed})*22"
    yexpr = f"ih/2-(ih/zoom/2)+cos(on/43+{seed})*14"
    cmd=[
        'ffmpeg','-y','-loop','1','-i',str(img_path),'-t','4','-vf',
        f"scale=1440:-1,zoompan=z='{zexpr}':x='{xexpr}':y='{yexpr}':d=100:s=1280x720:fps=25,format=yuv420p",
        '-an','-movflags','+faststart','-preset','veryfast','-crf','28',str(mp4_path)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def ensure_share_page(collection):
    page_dir=ROOT/'src/pages/share'/collection
    page_dir.mkdir(parents=True, exist_ok=True)
    src=ROOT/'src/pages/share/sefer-hamidos-truth/[slug].astro'
    dst=page_dir/'[slug].astro'
    if collection!='sefer-hamidos-truth':
        text=src.read_text(encoding='utf-8')
        text=text.replace("public/images/sefer-hamidos-truth/manifest.json", f"public/images/{collection}/manifest.json")
        text=text.replace("/reader/sefer-hamidos/1/1#seg-${entry.segment}", "/reader/sefer-hamidos/1/${entry.topic || entry.topic_number || 1}#seg-${entry.segment}")
        text=text.replace('Sefer Hamidos Truth ${entry.segment}', 'Sefer Hamidos ${entry.topic_title || "Media"} ${entry.segment}')
        dst.write_text(text, encoding='utf-8')

all_new=[]
for spec in BATCH:
    topic=load_topic(spec['topic'])
    out=ROOT/'public/images'/f"sefer-hamidos-{spec['slug']}"
    out.mkdir(parents=True, exist_ok=True)
    existing={}
    manifest_path=out/'manifest.json'
    if manifest_path.exists():
        try:
            old=json.load(open(manifest_path,encoding='utf-8'))
            existing={int(e['segment']):e for e in old.get('entries',[])}
        except Exception: existing={}
    collection=f"sefer-hamidos-{spec['slug']}"
    ensure_share_page(collection)
    segments={int(s['index']):s for s in topic['segments']}
    for seg_idx in spec['segments']:
        seg=segments[seg_idx]
        concept=CONCEPTS[(seg_idx + spec['topic']*11) % len(CONCEPTS)]
        entry={'topic':spec['topic'],'topic_number':spec['topic'],'topic_title':spec['title'],'segment':seg_idx,'he':seg.get('he_nikud') or seg['he'],'en':seg['en'],'images':[]}
        for variant in ['a','b']:
            seed=spec['topic']*10000+seg_idx*31+(1 if variant=='a' else 2)
            palette=PALETTES[seed % len(PALETTES)]
            bg=gradient(*palette, seed)
            bg=draw_symbolic_scene(bg, seed, concept, palette, variant)
            for lang,key in [('he','he'),('en','en')]:
                fname=f"sh-{spec['slug']}-{seg_idx:02d}-{variant}-{lang}.png"
                img_path=out/fname
                final=draw_text_overlay(bg.copy(), entry[key], lang, spec['title'], seg_idx, variant, concept)
                final.save(img_path, optimize=True)
                item={'language':'hebrew' if lang=='he' else 'english','variant':variant.upper(),'path':f'/images/{collection}/{fname}','archive_filename':fname}
                # Videos for A variant in both languages, matching the successful Truth 11-30 pattern.
                if variant=='a':
                    mp4=fname.replace('.png','.mp4')
                    mp4_path=out/mp4
                    make_video(img_path, mp4_path, seed + (7 if lang=='he' else 13))
                    item['video_path']=f'/images/{collection}/{mp4}'
                    item['video_filename']=mp4
                entry['images'].append(item)
                all_new.append(img_path)
        existing[seg_idx]=entry
    manifest={
        'book':'sefer-hamidos','topic':spec['topic'],'topic_title':spec['title'],
        'collection':collection,'generated':'2026-07-05',
        'entries':[existing[k] for k in sorted(existing)],
        'note':'Exact canonical teaching text is overlaid by script; A variants include per-teaching animation videos.'
    }
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(collection, 'entries', len(manifest['entries']), 'new range', spec['segments'][0], spec['segments'][-1])

print('done new png', len(all_new))
for spec in BATCH:
    out=ROOT/'public/images'/f"sefer-hamidos-{spec['slug']}"
    print(out, 'png', len(list(out.glob('sh-*.png'))), 'mp4', len(list(out.glob('sh-*.mp4'))))
