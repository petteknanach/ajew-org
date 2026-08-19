#!/usr/bin/env python3
"""Build next 40 Sefer Hamidos media items from local Na Nach/Saba picture/video sources.

This is the no-credits fallback for the July 2026 Grok spending-limit blocker:
- no synthetic/cartoon art;
- exact teaching text is composited by code;
- photos come from the user's Pictures folder, with at least the first quarter using local Na Nach pictures and most of that quarter Saba Yisroel;
- videos use real local video motion with exact bilingual teaching overlay, not ffmpeg pan/zoom.
"""
import json, os, random, shutil, subprocess, textwrap, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / 'public/reader/sefer-hamidos'
PUB = ROOT / 'public'
W, H = 1280, 720
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
NANACH = 'נ נח נחמ נחמן מאומן'
DATE = '2026-07-10'

# Continue from prior completed batch: Eating 1-16.
BATCH = [
    {'topic': 5, 'slug': 'eating', 'title': 'Eating / אכילה', 'segments': list(range(17, 25))},
    {'topic': 6, 'slug': 'widower', 'title': 'Widower / אלמן', 'segments': list(range(1, 4))},
    {'topic': 7, 'slug': 'israel-land-of', 'title': 'Israel, Land Of / ארץ ישראל', 'segments': list(range(1, 8))},
    {'topic': 8, 'slug': 'lost-article', 'title': 'Lost Article / אבדה', 'segments': [1]},
    {'topic': 9, 'slug': 'children', 'title': 'Children / בנים', 'segments': list(range(1, 22))},
]

# First 10 = the requested quarter from the local Pictures folder; 8/10 Saba Yisroel.
LOCAL_QUARTER_IMAGES = [
    '/mnt/c/Users/Pettek/Pictures/Saba/portraits/Saba-black-white-portrait-beard.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/general/saba-pointing-classic.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/hands-up/cistern saba hands up.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/with-cane/Saba hands resting on cane.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/with-tallit/Saba-in-tallit-smiling-expressive.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/reading-studying/Book-cover-Saba-portrait-turquoise.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/home-bed/Rabbi Nachmans chair highest quality.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/holy-places/100073859_3293274070697094_1004174563669442560_n.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/people/nanach kid in beanie in front of bulldozer.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/vans/blue nanach van ext window saba.jpg',
]

OTHER_IMAGES = [
    '/mnt/c/Users/Pettek/Pictures/Uman-Breslov-Synagogue/Uman-General/gates to tzion rabbainu.jpg',
    '/mnt/c/Users/Pettek/Pictures/Uman-Breslov-Synagogue/Uman-General/high shot of tzion rabbainu.jpg',
    '/mnt/c/Users/Pettek/Pictures/Uman-Breslov-Synagogue/Bais-Rabbainu-2010/Ark and Charity Boxes of Bais Rabbainu.JPG',
    '/mnt/c/Users/Pettek/Pictures/Books-Sefarim/Nanach-Books-Images/books of Rabbi Nachman.jpg',
    '/mnt/c/Users/Pettek/Pictures/Books-Sefarim/Nanach-Books-Images/Rebbe Nachmans books.jpg',
    '/mnt/c/Users/Pettek/Pictures/Text-Publications/gesher-tzar-meod-quote-bridge.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/water/na-nach-over-river.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/water/nanach-stream-with-writing-nachal-novea-and-nanach.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/holy places/Tzion Rabbainu by night.jpg',
    '/mnt/c/Users/Pettek/Pictures/Rabbainu/Rabbainus tomb white covering.jpg',
    '/mnt/c/Users/Pettek/Pictures/Rabbainu/Rabbi Nachman everyones rabbi larger nanach green 10 times bigger.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/events/historic-gathering-with-saba-arrow.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/with-people/105602514_3370640006293833_137614286612072426_n.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/wheelchair/Saba-in-wheelchair-blue-plaid-blanket.jpg',
    '/mnt/c/Users/Pettek/Pictures/Saba/with-children/Risr%2520avec%2520son%2520fils.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/Israel - nature/Israel - field green wheat.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/Israel - nature/Israel - forest and white flowers.jpg',
    '/mnt/c/Users/Pettek/Pictures/Chanukah/Chanukah-candles-Saba-picture-doorpost.jpg',
    '/mnt/c/Users/Pettek/Pictures/Chanukah/chanukah-kolel-night-view.jpg',
    '/mnt/c/Users/Pettek/Pictures/Purim/chassidim-yellow-nanach-beanies-purim.jpg',
    '/mnt/c/Users/Pettek/Pictures/Weddings/Nanach-Wedding-Chuppah-Night.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/vans/nanach-van-folder/blue nanach van ext window saba.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/portraits/nanach-portrait-facebook-archive-001.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/sacred-locations/nanach-tzion-sacred-site-facebook-archive-014.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/signs-banners/nanach-sign-banner-facebook-archive-003.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/stickers-merch/nanach-clothing-merch-facebook-archive-017.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/events-simchas/nanach-friends-event-facebook-archive-030.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/graffiti/nanach-graffiti-wall-facebook-archive-018.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/nature/nanach-nature-outing-facebook-archive-020.jpg',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/booksbreslov/breslov-books-text-facebook-archive-010.jpg',
]

VIDEO_SOURCES = [
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/uncertainties/Pictures/Saba/Saba eating in France.wmv',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/videos/Do it yourself Nanach natural face mask LQ360.mp4',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach/videos/WIN_20181230_19_29_44_Pro.mp4',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/art/nanach-singing-meah-shiurim.mp4',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/art/nanach-singing-rabbi-shimon.mp4',
    '/mnt/c/Users/Pettek/Pictures/Chanukah/Dancing/Simcha Nanach with the Breakdancers in the Mid-Rachov.wmv',
    '/mnt/c/Users/Pettek/Pictures/Chanukah/The Holy Consciousness of the Chanukah Lights - A Nanach Song~1.mp4',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/uncertainties/Camera Roll/Through Faith A Person Is Beloved to Hashem as A Wife Is To Her Husband - a Nanach song~1.mp4',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/uncertainties/Camera Roll/Whoever prays for the people of Israel with self sacrifice everyone loves him - a Nanach song~1.mp4',
    '/mnt/c/Users/Pettek/Pictures/pictures labeled/uncertainties/Camera Roll/When they insult you and you are silent you merit big time - a Nanach song~1.mp4',
]


def exists_any(path):
    p = Path(path)
    if p.exists(): return p
    # Case/path drift fallback: look by basename under Pictures.
    base = Path('/mnt/c/Users/Pettek/Pictures')
    target = p.name.lower()
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d.lower() not in {'videos', '$recycle.bin'}]
        for f in files:
            if f.lower() == target:
                return Path(root) / f
    return None


def collect_sources():
    imgs=[]
    for raw in LOCAL_QUARTER_IMAGES + OTHER_IMAGES:
        p=exists_any(raw)
        if p and p.suffix.lower() in {'.jpg','.jpeg','.png','.webp'}:
            imgs.append(p)
    # If any named files drifted, fill with Saba then Na Nach pictures from known dirs.
    seen={str(p).lower() for p in imgs}
    for root in [Path('/mnt/c/Users/Pettek/Pictures/Saba'), Path('/mnt/c/Users/Pettek/Pictures/pictures labeled/nanach')]:
        if not root.exists(): continue
        for dirpath, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d.lower() not in {'videos', '$recycle.bin'}]
            for f in sorted(files):
                if f.lower().endswith(('.jpg','.jpeg','.png','.webp')):
                    p=Path(dirpath)/f
                    if str(p).lower() not in seen:
                        imgs.append(p); seen.add(str(p).lower())
                if len(imgs) >= 80: break
            if len(imgs) >= 80: break
        if len(imgs) >= 80: break
    vids=[]
    for raw in VIDEO_SOURCES:
        p=exists_any(raw)
        if p and p.suffix.lower() in {'.mp4','.mov','.m4v','.avi','.wmv','.webm'}:
            vids.append(p)
    if not vids:
        raise SystemExit('No video sources found')
    if len(imgs) < 40:
        raise SystemExit(f'Only {len(imgs)} image sources found')
    return imgs, vids


def load_topic(n):
    return json.load(open(READER / f'topic-{n}.json', encoding='utf-8'))


def cover_photo(path, seed):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im).convert('RGB')
    scale=max(W/im.width,H/im.height)
    im=im.resize((int(im.width*scale),int(im.height*scale)), Image.LANCZOS)
    rng=random.Random(seed)
    maxx=max(0, im.width-W); maxy=max(0, im.height-H)
    x=int(maxx*(0.5 + 0.22*random.Random(seed+1).uniform(-1,1))) if maxx else 0
    y=int(maxy*(0.45 + 0.22*random.Random(seed+2).uniform(-1,1))) if maxy else 0
    x=max(0,min(maxx,x)); y=max(0,min(maxy,y))
    im=im.crop((x,y,x+W,y+H))
    # sophisticated cinematic grade, no fake art.
    im=ImageOps.autocontrast(im, cutoff=1)
    im=im.filter(ImageFilter.UnsharpMask(radius=1, percent=115))
    return im


def tw(draw, line, font, direction):
    b=draw.textbbox((0,0), line, font=font, direction=direction)
    return b[2]-b[0]


def wrap(draw, text, font, maxw, direction):
    words=str(text).replace('\n',' ').split()
    lines=[]; cur=''
    for w in words:
        cand=(cur+' '+w).strip()
        if cur and tw(draw,cand,font,direction)>maxw:
            lines.append(cur); cur=w
        else:
            cur=cand
    if cur: lines.append(cur)
    return lines


def pick_font(draw, text, lang, maxw, maxh, max_size=36, min_size=16):
    direction='rtl' if lang=='he' else 'ltr'
    face=FONT_BOLD if lang=='he' else FONT_SERIF
    for size in range(max_size, min_size-1, -2):
        f=ImageFont.truetype(face, size)
        lines=wrap(draw,text,f,maxw,direction)
        lh=int(size*1.23)
        if lines and len(lines)*lh<=maxh and max(tw(draw,l,f,direction) for l in lines)<=maxw:
            return f,lines,lh,direction
    f=ImageFont.truetype(face,min_size)
    return f,wrap(draw,text,f,maxw,direction),int(min_size*1.25),'rtl' if lang=='he' else 'ltr'


def draw_seal(d):
    d.rounded_rectangle((790,28,1240,88), radius=20, fill=(5,26,67,230), outline=(247,213,102,240), width=4)
    nf=ImageFont.truetype(FONT_BOLD, 30)
    d.text((1015,58), NANACH, font=nf, fill=(255,244,158,255), direction='rtl', anchor='mm', stroke_width=1, stroke_fill=(0,0,0,180))


def overlay_image(base, text, lang, topic_title, seg_idx, variant, source_path):
    im=base.convert('RGBA')
    d=ImageDraw.Draw(im,'RGBA')
    # vignette; keep picture dominant.
    shade=Image.new('RGBA',(W,H),(0,0,0,0)); sd=ImageDraw.Draw(shade,'RGBA')
    sd.rectangle((0,0,W,H), fill=(0,0,0,28))
    im=Image.alpha_composite(im, shade); d=ImageDraw.Draw(im,'RGBA')
    # Pick text size before drawing the panel, so short teachings get compact boxes.
    title_font=ImageFont.truetype(FONT_BOLD, 25)
    f,lines,lh,dirn=pick_font(d,text,lang,W-150,220,34,16)
    needed_h = 58 + min(len(lines), 7) * lh + 34
    panel_h = max(118, min(258, needed_h))
    if lang == 'he':
        panel=(44, 690-panel_h, 1236, 690)
    else:
        panel=(44, 54, 1236, 54+panel_h)
    fill=(4,18,43,218) if lang=='he' else (255,248,226,224)
    outline=(247,213,102,240) if lang=='he' else (25,54,107,225)
    d.rounded_rectangle(panel, radius=26, fill=fill, outline=outline, width=4)
    title = f"ספר המידות · {topic_title.split('/')[-1].strip()} {seg_idx} · תמונת נ נח" if lang=='he' else f"Sefer HaMidos · {topic_title.split('/')[0].strip()} {seg_idx} · Na Nach photo"
    title_dir='rtl' if lang=='he' else 'ltr'; title_anchor='ra' if lang=='he' else 'la'; title_x=panel[2]-28 if lang=='he' else panel[0]+28
    d.text((title_x,panel[1]+18), title, font=title_font, fill=(255,235,146,255) if lang=='he' else (20,48,105,255), direction=title_dir, anchor=title_anchor, stroke_width=1, stroke_fill=(0,0,0,120) if lang=='he' else (255,255,255,160))
    # Re-pick for exact panel width/height.
    f,lines,lh,dirn=pick_font(d,text,lang,panel[2]-panel[0]-58,panel[3]-panel[1]-78,34,16)
    y=panel[1]+58
    body_fill=(255,252,236,255) if lang=='he' else (14,31,61,255)
    for line in lines:
        x=panel[2]-28 if dirn=='rtl' else panel[0]+28
        anchor='ra' if dirn=='rtl' else 'la'
        d.text((x,y), line, font=f, fill=body_fill, direction=dirn, anchor=anchor, stroke_width=1, stroke_fill=(0,0,0,145) if lang=='he' else (255,255,255,160))
        y += lh
    draw_seal(d)
    credit=ImageFont.truetype(FONT,14)
    d.text((44,704), 'Na Nach picture · exact teaching text overlaid · ajew.org', font=credit, fill=(255,255,255,210), stroke_width=1, stroke_fill=(0,0,0,170))
    return im.convert('RGB')


def make_video_overlay_png(seg, topic_title, out_png):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im,'RGBA')
    d.rounded_rectangle((42,438,1238,696), radius=24, fill=(4,14,36,210), outline=(247,213,102,230), width=4)
    title_font=ImageFont.truetype(FONT_BOLD,24)
    d.text((60,462), f"Sefer HaMidos · {topic_title.split('/')[0].strip()} {seg['index']} · real local Na Nach video", font=title_font, fill=(255,232,139,255), anchor='la')
    he=(seg.get('he_nikud') or seg['he'])
    en=seg.get('en') or ''
    # Hebrew top line(s), English below. Exact, compact.
    hf,h_lines,h_lh,_=pick_font(d, he, 'he', 1120, 84, 25, 14)
    y=496
    for line in h_lines[:3]:
        d.text((1210,y), line, font=hf, fill=(255,253,236,255), direction='rtl', anchor='ra', stroke_width=1, stroke_fill=(0,0,0,150)); y+=h_lh
    ef,e_lines,e_lh,_=pick_font(d, en, 'en', 1120, 70, 22, 13)
    y=max(y+4,584)
    for line in e_lines[:3]:
        d.text((60,y), line, font=ef, fill=(236,246,255,255), direction='ltr', anchor='la', stroke_width=1, stroke_fill=(0,0,0,150)); y+=e_lh
    draw_seal(d)
    im.save(out_png)


def video_duration(path):
    try:
        out=subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)], text=True, timeout=20)
        return float(out.strip() or 0)
    except Exception:
        return 0


def make_video(src_video, overlay_png, out_mp4, seed):
    if out_mp4.exists() and out_mp4.stat().st_size>150000:
        return
    dur=video_duration(src_video)
    ss=0
    if dur>12:
        ss=int((seed*7) % max(1, int(dur-8)))
    vf="scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,format=yuv420p"
    cmd=['ffmpeg','-y','-ss',str(ss),'-i',str(src_video),'-i',str(overlay_png),'-t','5','-filter_complex',f'[0:v]{vf}[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p[out]','-map','[out]','-an','-movflags','+faststart','-preset','veryfast','-crf','27',str(out_mp4)]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def ensure_share_page(collection):
    page_dir=ROOT/'src/pages/share'/collection
    page_dir.mkdir(parents=True, exist_ok=True)
    src=ROOT/'src/pages/share/sefer-hamidos-truth/[slug].astro'
    dst=page_dir/'[slug].astro'
    text=src.read_text(encoding='utf-8')
    text=text.replace("public/images/sefer-hamidos-truth/manifest.json", f"public/images/{collection}/manifest.json")
    text=text.replace("/reader/sefer-hamidos/1/1#media-${slug}", "/reader/sefer-hamidos/1/${entry.topic || entry.topic_number || 1}#media-${slug}")
    text=text.replace("/reader/sefer-hamidos/1/1#media-${slug}", "/reader/sefer-hamidos/1/${entry.topic || entry.topic_number || 1}#media-${slug}")
    text=text.replace('Sefer Hamidos Truth ${entry.segment}', 'Sefer Hamidos ${entry.topic_title || "Media"} ${entry.segment}')
    text=text.replace('Sefer Hamidos Truth ${entry.segment} ${img.language} picture', 'Sefer Hamidos ${entry.topic_title || "Media"} ${entry.segment} ${img.language} picture')
    dst.write_text(text, encoding='utf-8')


def main():
    image_sources, video_sources = collect_sources()
    flat=[]
    for spec in BATCH:
        topic=load_topic(spec['topic']); segs={int(s['index']):s for s in topic['segments']}
        for idx in spec['segments']:
            flat.append((spec, segs[idx]))
    assert len(flat)==40, len(flat)
    total_png=total_mp4=0
    source_log=[]
    for global_i,(spec,seg) in enumerate(flat, start=1):
        collection=f"sefer-hamidos-{spec['slug']}"
        out=PUB/'images'/collection
        out.mkdir(parents=True, exist_ok=True)
        overlay_dir=Path('/tmp/sefer-hamidos-next40-video-overlays')/collection
        overlay_dir.mkdir(parents=True, exist_ok=True)
        ensure_share_page(collection)
        manifest_path=out/'manifest.json'
        existing={}
        if manifest_path.exists():
            old=json.load(open(manifest_path,encoding='utf-8'))
            existing={int(e['segment']):e for e in old.get('entries',[])}
        seg_idx=int(seg['index'])
        img_src=image_sources[(global_i-1) % len(image_sources)]
        vid_src=video_sources[(global_i-1) % len(video_sources)]
        base=cover_photo(img_src, seed=spec['topic']*1000+seg_idx)
        entry={
            'topic': spec['topic'], 'topic_number': spec['topic'], 'topic_title': spec['title'], 'segment': seg_idx,
            'he': seg.get('he_nikud') or seg['he'], 'en': seg.get('en') or '',
            'images': [],
            'source_image': str(img_src).replace('/mnt/c/Users/Pettek/','~/'),
            'source_video': str(vid_src).replace('/mnt/c/Users/Pettek/','~/'),
            'local_pictures_quarter': global_i <= 10,
            'source_note': 'Local Na Nach/Pictures photo source; first quarter intentionally uses local Pictures folder, mostly Saba Yisroel.',
            'video_note': 'Real local video motion with exact bilingual teaching overlay; not ffmpeg pan/zoom.'
        }
        overlay_png=overlay_dir/f"sh-{spec['slug']}-{seg_idx:02d}-local-video-overlay.png"
        make_video_overlay_png(seg, spec['title'], overlay_png)
        mp4=f"sh-{spec['slug']}-{seg_idx:02d}-local-real-motion.mp4"
        make_video(vid_src, overlay_png, out/mp4, seed=global_i+seg_idx)
        total_mp4 += 1
        for lang,label in [('he','hebrew'),('en','english')]:
            fname=f"sh-{spec['slug']}-{seg_idx:02d}-local-photo-{lang}.png"
            text=(seg.get('he_nikud') or seg['he']) if lang=='he' else (seg.get('en') or '')
            variant='Local Photo HE' if lang=='he' else 'Local Photo EN'
            final=overlay_image(base.copy(), text, lang, spec['title'], seg_idx, variant, img_src)
            final.save(out/fname, optimize=True)
            item={
                'language': label,
                'variant': variant,
                'path': f'/images/{collection}/{fname}',
                'archive_filename': fname,
                'source': 'local Pictures folder',
                'source_image': entry['source_image'],
                'quality': 'real Na Nach/Saba/Pictures photo with exact Sefer Hamidos teaching text overlaid',
                'video_path': f'/images/{collection}/{mp4}',
                'video_filename': mp4,
            }
            entry['images'].append(item); total_png += 1
        existing[seg_idx]=entry
        manifest={
            'book':'sefer-hamidos','topic':spec['topic'],'topic_title':spec['title'],'collection':collection,
            'generated':DATE,
            'entries':[existing[k] for k in sorted(existing)],
            'note':'Next-40 local media batch: exact canonical teaching text over real Na Nach/Saba/Pictures photo sources; videos use real local video motion with exact bilingual overlay.',
            'local_picture_policy':'At least 10/40 teachings use Pictures-folder Na Nach images; most of that quarter are Saba Yisroel pictures. This build uses local Pictures-folder sources throughout because xAI/Grok generation returned spending-limit blocked.',
        }
        manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
        source_log.append((global_i,collection,seg_idx,img_src,vid_src))
    print('next40 teachings',len(flat),'png',total_png,'mp4',total_mp4)
    for spec in BATCH:
        collection=f"sefer-hamidos-{spec['slug']}"; out=PUB/'images'/collection
        m=json.load(open(out/'manifest.json',encoding='utf-8'))
        touched=[e for e in m['entries'] if e['topic']==spec['topic'] and e['segment'] in spec['segments']]
        imgs=sum(len(e.get('images',[])) for e in touched); vids=len({im.get('video_path') for e in touched for im in e.get('images',[]) if im.get('video_path')})
        print(collection,'new entries',len(touched),'images',imgs,'videos',vids)
    print('first-quarter source images:')
    for row in source_log[:10]: print(row[0], row[1], row[2], row[3])

if __name__ == '__main__':
    main()
