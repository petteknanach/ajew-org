#!/usr/bin/env python3
import importlib.util, json, urllib.request
from pathlib import Path
from PIL import Image, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'scripts/build-sefer-hamidos-next40-local-media.py'
spec=importlib.util.spec_from_file_location('base_next40', src)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
collection='sefer-hamidos-children'
out=ROOT/'public/images'/collection
base_dir=out/'grok-bases-32-61'; base_dir.mkdir(parents=True,exist_ok=True)
manifest_path=out/'manifest.json'
urls=json.load(open(ROOT/'tmp_children_32_61_grok_urls.json',encoding='utf-8'))
manifest=json.load(open(manifest_path,encoding='utf-8'))
byseg={int(e['segment']):e for e in manifest['entries']}
topic=json.load(open(ROOT/'public/reader/sefer-hamidos/topic-9.json',encoding='utf-8'))
segs={int(s['index']):s for s in topic['segments']}

def download(url,path):
    if path.exists() and path.stat().st_size>50000: return
    urllib.request.urlretrieve(url,path)

for k,url in sorted(urls.items(), key=lambda kv:int(kv[0])):
    idx=int(k)
    base_path=base_dir/f'sh-children-{idx:02d}-grok-base.png'
    download(url,base_path)
    base=mod.cover_photo(base_path, seed=12000+idx).filter(ImageFilter.UnsharpMask(radius=1,percent=110))
    entry=byseg[idx]
    # Remove local photo image cards after the allowed first quarter; preserve the real-motion videos.
    entry['images']=[im for im in entry.get('images',[]) if 'local-photo' not in im.get('path','')]
    entry['source_image']=f'Grok base image, local file /images/{collection}/grok-bases-32-61/{base_path.name}'
    entry['local_pictures_quarter']=False
    entry['source_note']='Grok realistic/cinematic base image; exact Sefer Hamidos text overlaid by code. Local Pictures images are limited to the first quarter of this batch.'
    for lang,label in [('he','hebrew'),('en','english')]:
        fname=f'sh-children-{idx:02d}-grok-e-{lang}.png'
        text=(segs[idx].get('he_nikud') or segs[idx]['he']) if lang=='he' else (segs[idx].get('en') or '')
        final=mod.overlay_image(base.copy(), text, lang, 'Children / בנים', idx, 'Grok E', base_path)
        final.save(out/fname,optimize=True)
        item={'language':label,'variant':'Grok E','path':f'/images/{collection}/{fname}','archive_filename':fname,'base_image':f'/images/{collection}/grok-bases-32-61/{base_path.name}','source':'Grok realistic/cinematic generated base','quality':'Grok realistic/cinematic base with exact Sefer Hamidos teaching text overlaid','video_path':f'/images/{collection}/sh-children-{idx:02d}-local-real-motion.mp4','video_filename':f'sh-children-{idx:02d}-local-real-motion.mp4'}
        entry['images'].append(item)
    byseg[idx]=entry
manifest['entries']=[byseg[k] for k in sorted(byseg)]
manifest['generated']='2026-07-13'
manifest['note']='Children 22-61: 10 local Na Nach/Pictures photo teachings (first quarter, 8 Saba Yisroel) plus 30 Grok realistic/cinematic generated base teachings; all images have exact canonical text overlaid by code; all 40 videos use real local video motion with exact bilingual overlay.'
manifest['local_picture_policy']='Exactly 10/40 teachings use local Pictures-folder Na Nach sources; 8/10 are Saba Yisroel. Teachings 32-61 use Grok base images, not local Pictures photos.'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('replaced segments 32-61 with Grok E images')
