#!/usr/bin/env python3
import importlib.util, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'scripts/build-sefer-hamidos-next40-local-media.py'
spec=importlib.util.spec_from_file_location('base_next40', src)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
collection='sefer-hamidos-children'
out=ROOT/'public/images'/collection
manifest_path=out/'manifest.json'
manifest=json.load(open(manifest_path,encoding='utf-8'))
byseg={int(e['segment']):e for e in manifest['entries']}
topic=json.load(open(ROOT/'public/reader/sefer-hamidos/topic-9.json',encoding='utf-8'))
segs={int(s['index']):s for s in topic['segments']}
# Replace low-quality/graphic/blank-looking source photos with real Saba/Na Nach/Pictures photographs.
replacements={
 34:'/mnt/c/Users/Pettek/Pictures/Saba/with-people/51528665_228817424739239_4018041132037439488_o.jpg',
 35:'/mnt/c/Users/Pettek/Pictures/Saba/portraits/Saba-portrait-1.jpg',
 36:'/mnt/c/Users/Pettek/Pictures/Saba/with-people/51562045_228817758072539_4207374109467738112_o.jpg',
 37:'/mnt/c/Users/Pettek/Pictures/Saba/with-people/51697767_228817641405884_1741949253908955136_o.jpg',
 39:'/mnt/c/Users/Pettek/Pictures/Saba/with-people/51742052_228817864739195_1885988025926680576_o.jpg',
 41:'/mnt/c/Users/Pettek/Pictures/Saba/portraits/Saba-portrait-4.jpg',
 44:'/mnt/c/Users/Pettek/Pictures/Saba/with-people/51571804_228817884739193_6258757310168956928_o.jpg',
 54:'/mnt/c/Users/Pettek/Pictures/Chanukah/Chanukah-candles-Saba-picture-doorpost.jpg',
 57:'/mnt/c/Users/Pettek/Pictures/Saba/with-people/51835787_228820574738924_7142539186002722816_o.jpg',
 59:'/mnt/c/Users/Pettek/Pictures/pictures labeled/Israel - nature/Israel - forest and white flowers.jpg',
}
for idx,raw in replacements.items():
    p=mod.exists_any(raw) or Path(raw)
    base=mod.cover_photo(p, seed=9000+idx)
    entry=byseg[idx]
    entry['source_image']=str(p).replace('/mnt/c/Users/Pettek/','~/')
    entry['source_note']='Replacement real photo source after visual QA; exact Sefer Hamidos text overlaid by code.'
    entry['images']=[im for im in entry.get('images',[]) if 'local-photo' not in im.get('path','')]
    for lang,label in [('he','hebrew'),('en','english')]:
        fname=f'sh-children-{idx:02d}-local-photo-{lang}.png'
        text=(segs[idx].get('he_nikud') or segs[idx]['he']) if lang=='he' else (segs[idx].get('en') or '')
        final=mod.overlay_image(base.copy(), text, lang, 'Children / בנים', idx, 'Local Photo HE' if lang=='he' else 'Local Photo EN', p)
        final.save(out/fname,optimize=True)
        item={'language':label,'variant':'Local Photo HE' if lang=='he' else 'Local Photo EN','path':f'/images/{collection}/{fname}','archive_filename':fname,'source':'local Pictures folder','source_image':entry['source_image'],'quality':'real Na Nach/Saba/Pictures photo with exact Sefer Hamidos teaching text overlaid','video_path':f'/images/{collection}/sh-children-{idx:02d}-local-real-motion.mp4','video_filename':f'sh-children-{idx:02d}-local-real-motion.mp4'}
        entry['images'].append(item)
    byseg[idx]=entry
# Replace very-low-size/static video encodes with a more active real local video source.
video_sources=[
 '/mnt/c/Users/Pettek/Pictures/Chanukah/Dancing/Simcha Nanach with the Breakdancers in the Mid-Rachov.wmv',
 '/mnt/c/Users/Pettek/Pictures/pictures labeled/art/nanach-singing-meah-shiurim.mp4',
 '/mnt/c/Users/Pettek/Pictures/pictures labeled/art/nanach-singing-rabbi-shimon.mp4',
 '/mnt/c/Users/Pettek/Pictures/Chanukah/The Holy Consciousness of the Chanukah Lights - A Nanach Song~1.mp4',
]
for n,idx in enumerate([22,32,42,52]):
    v=mod.exists_any(video_sources[n]) or Path(video_sources[n])
    overlay_dir=Path('/tmp/sefer-hamidos-next40-video-overlays')/collection
    overlay_dir.mkdir(parents=True, exist_ok=True)
    overlay_png=overlay_dir/f'sh-children-{idx:02d}-local-video-overlay.png'
    mod.make_video_overlay_png(segs[idx], 'Children / בנים', overlay_png)
    mp4=out/f'sh-children-{idx:02d}-local-real-motion.mp4'
    if mp4.exists(): mp4.unlink()
    mod.make_video(v, overlay_png, mp4, seed=7700+idx)
    byseg[idx]['source_video']=str(v).replace('/mnt/c/Users/Pettek/','~/')
manifest['entries']=[byseg[k] for k in sorted(byseg)]
manifest['qa_note']='Children 22-61 visual QA replaced low-quality/graphic-looking tiles with real photo sources and regenerated static-looking small video encodes from higher-motion real local videos.'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('replaced images',sorted(replacements),'regenerated videos',[22,32,42,52])
