#!/usr/bin/env python3
"""Build Travel 11-21 through Judge 1-9 and Sweetening Of Judgments 1-20: 80 stills and 40 genuine Grok videos.
Exactly 10/40 still bases are local Pictures (8 Saba); all raw videos come from xAI/Grok.
Exact teachings are composited in post onto both stills and generated videos.
"""
import json, urllib.request, subprocess, shutil, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT=Path(__file__).resolve().parents[1]
PARTIAL=os.environ.get('SH_MEDIA_PARTIAL') == '1'
PUB=Path(os.environ.get('SH_MEDIA_PUB', str(ROOT/'public')))
READER=PUB/'reader/sefer-hamidos'
TARGETS=Path('/root/sefer_hamidos_next40_travel11_21_judge1_9_sweetening1_20.json')
WORKERS=[Path(f'/root/sh_media7_worker_{a}_{b}.json') for a,b in [(1,5),(6,10),(11,15),(16,20),(21,25),(26,30),(31,35),(36,40)]]
W,H=1280,720
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_SERIF='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
NANACH='נ נח נחמ נחמן מאומן'
DATE='2026-08-04'


def download(url,path,min_size=10000):
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists() and path.stat().st_size>=min_size:return
    import time
    last=None
    for attempt in range(4):
        tmp=path.with_suffix(path.suffix+'.part')
        try:
            if tmp.exists(): tmp.unlink()
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=180) as src, open(tmp,'wb') as dst:
                shutil.copyfileobj(src,dst)
            if tmp.stat().st_size<min_size: raise RuntimeError(f'short download {tmp} {tmp.stat().st_size}')
            os.replace(tmp,path); return
        except Exception as exc:
            last=exc
            if tmp.exists(): tmp.unlink()
            time.sleep(2*(attempt+1))
    raise RuntimeError(f'download failed {url}: {last}')


def cover_image(path,centering=(0.5,0.5)):
    im=ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    scale=max(W/im.width,H/im.height)
    im=im.resize((int(im.width*scale),int(im.height*scale)),Image.Resampling.LANCZOS)
    x=max(0,min(im.width-W,int((im.width-W)*float(centering[0]))))
    y=max(0,min(im.height-H,int((im.height-H)*float(centering[1]))))
    return ImageOps.autocontrast(im.crop((x,y,x+W,y+H)),cutoff=1).filter(ImageFilter.UnsharpMask(radius=1,percent=110))


def text_width(draw,text,font,direction):
    b=draw.textbbox((0,0),text,font=font,direction=direction); return b[2]-b[0]


def wrap(draw,text,font,maxw,direction):
    words=str(text).replace('\n',' ').split(); lines=[]; cur=''
    for word in words:
        cand=(cur+' '+word).strip()
        if cur and text_width(draw,cand,font,direction)>maxw:
            lines.append(cur); cur=word
        else: cur=cand
    if cur: lines.append(cur)
    return lines


def fit(draw,text,lang,maxw,maxh,max_size=34,min_size=10):
    direction='rtl' if lang=='he' else 'ltr'; face=FONT_BOLD if lang=='he' else FONT_SERIF
    for size in range(max_size,min_size-1,-1):
        font=ImageFont.truetype(face,size); lines=wrap(draw,text,font,maxw,direction); lh=int(size*1.24)
        if lines and len(lines)*lh<=maxh:return font,lines,lh,direction
    font=ImageFont.truetype(face,min_size); return font,wrap(draw,text,font,maxw,direction),int(min_size*1.2),direction


def draw_seal(draw):
    draw.rounded_rectangle((815,20,1250,74),radius=17,fill=(4,21,55,225),outline=(245,210,97,245),width=3)
    font=ImageFont.truetype(FONT_BOLD,27)
    draw.text((1032,47),NANACH,font=font,fill=(255,244,160,255),direction='rtl',anchor='mm',stroke_width=1,stroke_fill=(0,0,0,170))


def make_still(base,text,lang,topic_title,segment,source_label):
    im=base.convert('RGBA'); draw=ImageDraw.Draw(im,'RGBA')
    title=ImageFont.truetype(FONT_BOLD,24)
    # Picture-forward caption panel, allowed to grow only as needed.
    temp=ImageDraw.Draw(Image.new('RGBA',(W,H)))
    font,lines,lh,direction=fit(temp,text,lang,W-140,290,34,11)
    panel_h=max(125,min(355,68+len(lines)*lh+25))
    panel=(38,H-panel_h-26,W-38,H-26)
    dark=lang=='he'; fill=(3,16,42,222) if dark else (255,249,231,229)
    outline=(247,211,103,245) if dark else (25,56,112,235)
    draw.rounded_rectangle(panel,radius=24,fill=fill,outline=outline,width=4)
    label=(f'ספר המידות · {topic_title.split("/")[-1].strip()} {segment}' if lang=='he' else f'Sefer HaMidos · {topic_title.split("/")[0].strip()} {segment}')
    draw.text((panel[2]-25 if lang=='he' else panel[0]+25,panel[1]+16),label,font=title,
              fill=(255,236,146,255) if dark else (19,48,103,255),direction='rtl' if lang=='he' else 'ltr',anchor='ra' if lang=='he' else 'la')
    font,lines,lh,direction=fit(draw,text,lang,panel[2]-panel[0]-50,panel[3]-panel[1]-70,34,10)
    y=panel[1]+55
    for line in lines:
        draw.text((panel[2]-25 if direction=='rtl' else panel[0]+25,y),line,font=font,
                  fill=(255,253,239,255) if dark else (12,30,62,255),direction=direction,
                  anchor='ra' if direction=='rtl' else 'la',stroke_width=1,stroke_fill=(0,0,0,140) if dark else (255,255,255,160)); y+=lh
    draw_seal(draw)
    return im.convert('RGB')


def make_video_overlay(he,en,topic_title,segment,out):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); draw=ImageDraw.Draw(im,'RGBA')
    # Fit both complete source texts. Panel may be tall for long teachings; no truncation.
    hf,hlines,hlh,_=fit(draw,he,'he',1140,190,24,9)
    ef,elines,elh,_=fit(draw,en,'en',1140,190,21,9)
    need=64+len(hlines)*hlh+16+len(elines)*elh+28
    panel_h=max(220,min(570,need)); top=H-panel_h-18
    draw.rounded_rectangle((30,top,W-30,H-18),radius=22,fill=(3,14,38,216),outline=(247,211,102,242),width=4)
    title=ImageFont.truetype(FONT_BOLD,22)
    draw.text((52,top+17),f'Sefer HaMidos · {topic_title.split("/")[0].strip()} {segment}',font=title,fill=(255,231,137,255))
    avail_h=panel_h-90
    hf,hlines,hlh,_=fit(draw,he,'he',1140,int(avail_h*.52),24,8)
    y=top+56
    for line in hlines:
        draw.text((W-55,y),line,font=hf,fill=(255,253,238,255),direction='rtl',anchor='ra',stroke_width=1,stroke_fill=(0,0,0,160)); y+=hlh
    y+=8
    ef,elines,elh,_=fit(draw,en,'en',1140,max(50,H-30-y),21,8)
    for line in elines:
        draw.text((55,y),line,font=ef,fill=(235,246,255,255),direction='ltr',anchor='la',stroke_width=1,stroke_fill=(0,0,0,160)); y+=elh
    draw_seal(draw); out.parent.mkdir(parents=True,exist_ok=True); im.save(out)


def overlay_video(raw,overlay,out,crop_spec=None):
    if out.exists() and out.stat().st_size>120000:return
    base=(f'[0:v]crop={crop_spec},scale=1280:720,setsar=1,format=yuv420p[v]' if crop_spec else
          '[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,format=yuv420p[v]')
    cmd=['ffmpeg','-y','-i',str(raw),'-i',str(overlay),'-t','5','-filter_complex',
         base+';[v][1:v]overlay=0:0:format=auto,format=yuv420p[out]',
         '-map','[out]','-an','-movflags','+faststart','-preset','veryfast','-crf','24',str(out)]
    subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)


def ensure_share_page(collection):
    page_dir=ROOT/'src/pages/share'/collection; page_dir.mkdir(parents=True,exist_ok=True)
    src=ROOT/'src/pages/share/sefer-hamidos-truth/[slug].astro'; dst=page_dir/'[slug].astro'
    text=src.read_text(encoding='utf8').replace('public/images/sefer-hamidos-truth/manifest.json',f'public/images/{collection}/manifest.json')
    text=text.replace('/reader/sefer-hamidos/1/1#media-${slug}','/reader/sefer-hamidos/1/${entry.topic || entry.topic_number || 1}#media-${slug}')
    text=text.replace('Sefer Hamidos Truth ${entry.segment}','Sefer Hamidos ${entry.topic_title || "Media"} ${entry.displayLabel || entry.segment}')
    text=text.replace('Sefer Hamidos Truth ${entry.segment} ${img.language} picture','Sefer Hamidos ${entry.topic_title || "Media"} ${entry.displayLabel || entry.segment} ${img.language} picture')
    dst.write_text(text,encoding='utf8')


def main():
    targets=json.load(open(TARGETS,encoding='utf8'))
    rows=[]
    for f in WORKERS:
        if not f.exists(): raise SystemExit(f'missing worker output {f}')
        rows.extend(json.load(open(f,encoding='utf8')))
    byidx={int(x['global_index']):x for x in rows}
    if sorted(byidx)!=list(range(1,41)): raise SystemExit(f'bad worker coverage {sorted(byidx)}')
    bad=[(i,byidx[i]) for i in range(1,41) if not byidx[i].get('image_url') or not byidx[i].get('video_url')]
    if bad and not PARTIAL: raise SystemExit(f'generation failures {bad}')
    if bad: print('PARTIAL generation gaps', [i for i,_ in bad])
    manifests={}
    for spec in [
        ('travel',20,'Travel / דְּרָכִים'),
        ('judge',21,'Judge / דַּיָּן'),
        ('sweetening-of-judgments',22,'Sweetening Of Judgments / הַמְתָּקַת דִּין'),
    ]:
        slug,topic,title=spec; out=PUB/'images'/f'sefer-hamidos-{slug}'; out.mkdir(parents=True,exist_ok=True)
        mp=out/'manifest.json'
        old=json.load(open(mp,encoding='utf8')) if mp.exists() else {'book':'sefer-hamidos','topic':topic,'topic_title':title,'collection':f'sefer-hamidos-{slug}','generated':DATE,'entries':[]}
        manifests[slug]=old
        if not PARTIAL: ensure_share_page(f'sefer-hamidos-{slug}')
    for gi,target in enumerate(targets,1):
        row=byidx[gi]; slug=target['slug']; seg=int(target['segment']); collection=f'sefer-hamidos-{slug}'; out=PUB/'images'/collection
        if not row.get('image_url') or not row.get('video_url'):
            continue
        is_local=bool(target.get('local_source'))
        src=None
        if is_local:
            src=Path(target['local_source'])
            if not src.exists(): raise SystemExit(f'missing local source {src}')
            base=cover_image(src,centering=(0.5,float(target.get('crop_center_y',0.5))))
            local_dir=out/'local-bases-travel11-judge9-sweetening20'; local_dir.mkdir(parents=True,exist_ok=True)
            local_copy=local_dir/f'sh-{slug}-{seg:03d}-local-original{src.suffix.lower()}'
            shutil.copy2(src,local_copy)
            source_image=f'/images/{collection}/local-bases-travel11-judge9-sweetening20/{local_copy.name}'
            variant='Local Photo'; source_label='Local Na Nach/Pictures still source · exact teaching overlaid'
            base_path=None
        else:
            base_dir=out/'grok-bases-travel11-judge9-sweetening20'; base_path=base_dir/f'sh-{slug}-{seg:03d}-grok-base.png'
            download(row['image_url'],base_path,20000); base=cover_image(base_path)
            source_image=f'Grok/xAI generated base: {row.get("image_provenance_url",row["image_url"])}'; variant='Grok I'; source_label='Grok/xAI generated picture · exact teaching overlaid'
        raw_dir=out/'raw-grok-videos-travel11-judge9-sweetening20'; raw=raw_dir/f'sh-{slug}-{seg:03d}-raw-grok.mp4'; download(row['video_url'],raw,100000)
        overlay=Path('/tmp/sefer-hamidos-travel11-judge9-sweetening20-overlays')/f'sh-{slug}-{seg:03d}.png'
        display=target.get('displayLabel') or str(seg)
        make_video_overlay(target['he'],target['en'],target['topic_title'],display,overlay)
        final_video=out/f'sh-{slug}-{seg:03d}-grok-generated-overlay.mp4'; overlay_video(raw,overlay,final_video,row.get('video_crop'))
        images=[]
        for lang,label,text in [('he','hebrew',target['he']),('en','english',target['en'])]:
            kind='local-photo' if is_local else 'grok-i'
            fname=f'sh-{slug}-{seg:03d}-{kind}-{lang}.png'
            make_still(base.copy(),text,lang,target['topic_title'],display,source_label).save(out/fname,optimize=True)
            item={'language':label,'variant':variant,'path':f'/images/{collection}/{fname}?v=20260804b','archive_filename':fname,
                  'source':'Local Pictures still (Saba/Na Nach)' if is_local else 'Grok/xAI realistic cinematic generated base',
                  'quality':'Exact Sefer Hamidos teaching overlaid in post',
                  'video_path':f'/images/{collection}/{final_video.name}','video_filename':final_video.name,
                  'video_source':'Grok/xAI generated video with exact teaching superimposed in post'}
            if base_path:item['base_image']=f'/images/{collection}/grok-bases-travel11-judge9-sweetening20/{base_path.name}'
            if is_local:item['base_image']=source_image
            images.append(item)
        entry={'topic':target['topic'],'topic_number':target['topic'],'topic_title':target['topic_title'],'segment':seg,'displayLabel':display,
               'he':target['he'],'en':target['en'],'images':images,'source_image':source_image,
               'source_video':'Grok/xAI generated raw video; no local/archive footage',
               'local_pictures_quarter':is_local,
               'source_note':'Local Pictures still only; video separately generated by Grok/xAI.' if is_local else 'Grok/xAI generated still base and video.',
               'video_note':'Genuine Grok/xAI-generated motion; exact teaching superimposed afterward in post. Not local/archive footage, still, slideshow, or pan/zoom.',
               'grok_image_source_url':row.get('image_provenance_url',row['image_url']),'grok_video_source_url':row['video_url']}
        if is_local: entry['local_source_original']=str(src).replace('/mnt/c/Users/Pettek/','~/')
        m=manifests[slug]; m['entries']=[e for e in m.get('entries',[]) if int(e.get('segment',-1))!=seg]; m['entries'].append(entry); m['entries'].sort(key=lambda e:int(e['segment'])); m['generated']=DATE
    for slug,m in manifests.items():
        (PUB/'images'/f'sefer-hamidos-{slug}'/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
    # Strict audit for the new 40.
    target_keys={(t['slug'],int(t['segment'])) for t in targets}
    new=[]
    for slug,m in manifests.items():
        for e in m['entries']:
            if (slug,int(e['segment'])) in target_keys: new.append(e)
    uniq_vid={im['video_path'] for e in new for im in e['images']}
    local=[e for e in new if e.get('local_pictures_quarter')]
    saba=[e for e in local if '/Saba/' in e.get('local_source_original','')]
    forbidden=[e for e in new if 'local-real-motion' in str(e) or ('source_video' in e and 'Pictures/' in str(e['source_video']))]
    missing=[]
    for e in new:
        for im in e['images']:
            for key in ('path','video_path'):
                p=PUB/im[key].split('?',1)[0].lstrip('/')
                if not p.exists() or p.stat().st_size<10000:missing.append(str(p))
    print('AUDIT entries',len(new),'images',sum(len(e['images']) for e in new),'videos',len(uniq_vid),'local',len(local),'saba',len(saba),'generated',len(new)-len(local),'forbidden',len(forbidden),'missing',len(missing))
    if PARTIAL:
        expected=sum(bool(byidx[i].get('image_url') and byidx[i].get('video_url')) for i in range(1,41))
        if len(new)!=expected or len(uniq_vid)!=expected or sum(len(e['images']) for e in new)!=expected*2 or forbidden or missing:
            raise SystemExit('partial audit failed')
    elif (len(new),sum(len(e['images']) for e in new),len(uniq_vid),len(local),len(saba),len(forbidden),len(missing))!=(40,80,40,10,8,0,0):
        raise SystemExit('strict audit failed')

if __name__=='__main__': main()
