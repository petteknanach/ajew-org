#!/usr/bin/env python3
import importlib.util, json, urllib.request
from pathlib import Path
from PIL import ImageFilter
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'scripts/build-sefer-hamidos-next40-local-media.py'
spec=importlib.util.spec_from_file_location('base_next40', src)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
collection='sefer-hamidos-children'
out=ROOT/'public/images'/collection
base_dir=out/'grok-bases-72-101'; base_dir.mkdir(parents=True,exist_ok=True)
manifest_path=out/'manifest.json'
urls=json.load(open(ROOT/'tmp_children_72_101_grok_urls.json',encoding='utf-8'))
manifest=json.load(open(manifest_path,encoding='utf-8'))
byseg={int(e['segment']):e for e in manifest['entries']}
topic=json.load(open(ROOT/'public/reader/sefer-hamidos/topic-9.json',encoding='utf-8'))
segs={int(s['index']):s for s in topic['segments']}

def download(url,path):
    if path.exists() and path.stat().st_size>50000: return
    urllib.request.urlretrieve(url,path)

for k,url in sorted(urls.items(), key=lambda kv:int(kv[0])):
    idx=int(k)
    base_path=base_dir/f'sh-children-{idx:03d}-grok-base.png'
    download(url,base_path)
    base=mod.cover_photo(base_path, seed=22000+idx).filter(ImageFilter.UnsharpMask(radius=1,percent=110))
    entry=byseg[idx]
    # Remove over-quota local-photo picture cards, preserve the real-motion video refs.
    old_images=entry.get('images',[])
    video_path=None; video_filename=None
    for im in old_images:
        if im.get('video_path'):
            video_path=im.get('video_path'); video_filename=im.get('video_filename')
            break
    entry['images']=[im for im in old_images if 'local-photo' not in im.get('path','')]
    entry['source_image']=f'Grok base image, local file /images/{collection}/grok-bases-72-101/{base_path.name}'
    entry['local_pictures_quarter']=False
    entry['source_note']='Grok realistic/cinematic base image; exact Sefer Hamidos text overlaid by code. Local Pictures images are limited to the first quarter of this batch.'
    entry['video_note']='Real local video motion with exact bilingual teaching overlay on every video; not a textless video.'
    for lang,label in [('he','hebrew'),('en','english')]:
        fname=f'sh-children-{idx:03d}-grok-f-{lang}.png'
        text=(segs[idx].get('he_nikud') or segs[idx]['he']) if lang=='he' else (segs[idx].get('en') or '')
        final=mod.overlay_image(base.copy(), text, lang, 'Children / בנים', idx, 'Grok F', base_path)
        final.save(out/fname,optimize=True)
        item={'language':label,'variant':'Grok F','path':f'/images/{collection}/{fname}','archive_filename':fname,'base_image':f'/images/{collection}/grok-bases-72-101/{base_path.name}','source':'Grok realistic/cinematic generated base','quality':'Grok realistic/cinematic base with exact Sefer Hamidos teaching text overlaid','video_path':video_path,'video_filename':video_filename}
        entry['images'].append(item)
    byseg[idx]=entry
manifest['entries']=[byseg[k] for k in sorted(byseg)]
manifest['generated']='2026-07-14'
manifest['note']='Children 62-101: 10 local Na Nach/Pictures photo teachings (first quarter, 8 Saba Yisroel) plus 30 Grok realistic/cinematic generated base teachings; all images have exact canonical text overlaid by code; all 40 videos use real local video motion with exact bilingual teaching overlay.'
manifest['local_picture_policy']='Exactly 10/40 teachings use local Pictures-folder Na Nach sources; 8/10 are Saba Yisroel. Teachings 72-101 use Grok base images, not local Pictures photos.'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('replaced segments 72-101 with Grok F images')
