#!/usr/bin/env python3
import importlib.util, json, urllib.request
from pathlib import Path
from PIL import ImageFilter
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'scripts/build-sefer-hamidos-next40-local-media.py'
spec=importlib.util.spec_from_file_location('base_next40', src)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
urls=json.load(open(ROOT/'tmp_house_shame_001_014_grok_urls.json',encoding='utf-8'))
TOPICS={
 'house': {'topic':10,'collection':'sefer-hamidos-house','title':'House / בית','base_dir':'grok-bases-house-11-26','variant':'Grok G','segments':range(11,27)},
 'shame': {'topic':11,'collection':'sefer-hamidos-shame','title':'Shame / בושה','base_dir':'grok-bases-shame-01-14','variant':'Grok G','segments':range(1,15)},
}

def download(url,path):
    if path.exists() and path.stat().st_size>50000: return
    urllib.request.urlretrieve(url,path)

for slug,cfg in TOPICS.items():
    out=ROOT/'public/images'/cfg['collection']
    base_dir=out/cfg['base_dir']; base_dir.mkdir(parents=True,exist_ok=True)
    manifest_path=out/'manifest.json'
    manifest=json.load(open(manifest_path,encoding='utf-8'))
    byseg={int(e['segment']):e for e in manifest['entries']}
    topic=json.load(open(ROOT/f'public/reader/sefer-hamidos/topic-{cfg["topic"]}.json',encoding='utf-8'))
    segs={int(s['index']):s for s in topic['segments']}
    for idx in cfg['segments']:
        key=f'{slug}-{idx}'
        url=urls[key]
        base_path=base_dir/f'sh-{slug}-{idx:03d}-grok-base.png'
        download(url,base_path)
        base=mod.cover_photo(base_path, seed=30000+cfg['topic']*100+idx).filter(ImageFilter.UnsharpMask(radius=1,percent=110))
        entry=byseg[idx]
        old_images=entry.get('images',[])
        video_path=video_filename=None
        for im in old_images:
            if im.get('video_path'):
                video_path=im.get('video_path'); video_filename=im.get('video_filename'); break
        # remove over-quota local-photo picture cards for these segments; preserve video refs on new cards
        entry['images']=[im for im in old_images if 'local-photo' not in im.get('path','')]
        entry['source_image']=f'Grok base image, local file /images/{cfg["collection"]}/{cfg["base_dir"]}/{base_path.name}'
        entry['local_pictures_quarter']=False
        entry['source_note']='Grok realistic/cinematic base image; exact Sefer Hamidos text overlaid by code. Local Pictures images are limited to 10/40 teachings, mostly Saba Yisroel.'
        entry['video_note']='Video uses real local motion with exact Hebrew/English teaching overlay; every video has the teaching on it.'
        for lang,label in [('he','hebrew'),('en','english')]:
            fname=f'sh-{slug}-{idx:03d}-grok-g-{lang}.png'
            text=(segs[idx].get('he_nikud') or segs[idx]['he']) if lang=='he' else (segs[idx].get('en') or '')
            final=mod.overlay_image(base.copy(), text, lang, cfg['title'], idx, cfg['variant'], base_path)
            final.save(out/fname,optimize=True)
            entry['images'].append({'language':label,'variant':cfg['variant'],'path':f'/images/{cfg["collection"]}/{fname}','archive_filename':fname,'base_image':f'/images/{cfg["collection"]}/{cfg["base_dir"]}/{base_path.name}','source':'Grok realistic/cinematic generated base','quality':'Grok realistic/cinematic base with exact Sefer Hamidos teaching text overlaid','video_path':video_path,'video_filename':video_filename})
        byseg[idx]=entry
    manifest['entries']=[byseg[k] for k in sorted(byseg)]
    manifest['generated']='2026-07-15'
    manifest['note']='House 1-26 / Shame 1-14 media: exactly 10/40 local Na Nach/Pictures photo teachings (8 Saba Yisroel) plus 30 Grok realistic/cinematic generated base teachings; all images have exact canonical text overlaid by code; all 40 videos have exact bilingual teaching overlay.'
    manifest['local_picture_policy']='Exactly 10/40 teachings use local Pictures-folder Na Nach sources; 8/10 are Saba Yisroel. Remaining 30/40 use Grok base images, not local Pictures photos.'
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('applied Grok G quarter policy for House 11-26 and Shame 1-14')
