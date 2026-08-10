#!/usr/bin/env python3
import importlib.util
import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
CHECKPOINT = Path('/root/sefer_hamidos_missing_grok_videos_checkpoint.json')
HELPER_PATH = ROOT / 'scripts/build-sefer-hamidos-travel11-judge9-sweetening20-grok-media.py'
DATE = '2026-08-10'
BATCH = 'missing-videos-20260810'

spec = importlib.util.spec_from_file_location('sh_overlay_helper', HELPER_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f'cannot load helper: {HELPER_PATH}')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def download(url: str, path: Path, minimum: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size >= minimum:
        return
    tmp = path.with_suffix(path.suffix + '.part')
    if tmp.exists():
        tmp.unlink()
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=240) as src, open(tmp, 'wb') as dst:
        while True:
            chunk = src.read(1024 * 1024)
            if not chunk:
                break
            dst.write(chunk)
        dst.flush()
        os.fsync(dst.fileno())
    if tmp.stat().st_size < minimum:
        raise RuntimeError(f'short download: {url} -> {tmp.stat().st_size}')
    os.replace(tmp, path)


def atomic_json(path: Path, obj) -> None:
    tmp = path.with_suffix(path.suffix + '.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
    json.load(open(tmp, encoding='utf-8'))
    os.replace(tmp, path)


def main() -> None:
    rows = json.load(open(CHECKPOINT, encoding='utf-8'))
    assert len(rows) == 5
    assert all(r.get('image_url') and r.get('video_url') and r.get('error') is None for r in rows)
    assert len({r['image_url'] for r in rows}) == 5
    assert len({r['video_url'] for r in rows}) == 5

    manifests = {}
    for collection in sorted({r['collection'] for r in rows}):
        path = PUB / 'images' / collection / 'manifest.json'
        manifests[collection] = (path, json.load(open(path, encoding='utf-8')))

    built = []
    for row in rows:
        collection = row['collection']
        slug = collection.removeprefix('sefer-hamidos-')
        seg = int(row['segment'])
        out = PUB / 'images' / collection
        manifest_path, manifest = manifests[collection]
        matches = [e for e in manifest['entries'] if int(e.get('segment', -1)) == seg]
        if len(matches) != 1:
            raise RuntimeError(f'entry match {collection} {seg}: {len(matches)}')
        entry = matches[0]

        base = out / f'grok-bases-{BATCH}' / f'sh-{slug}-{seg:03d}-grok-clean-base.png'
        raw = out / f'raw-grok-videos-{BATCH}' / f'sh-{slug}-{seg:03d}-raw-grok.mp4'
        overlay = Path('/tmp/sefer-hamidos-missing-video-overlays') / f'sh-{slug}-{seg:03d}.png'
        final = out / f'sh-{slug}-{seg:03d}-grok-generated-overlay.mp4'

        download(row['image_url'], base, 20000)
        download(row['video_url'], raw, 100000)
        helper.make_video_overlay(entry['he'], entry['en'], entry.get('topic_title', manifest['topic_title']), str(seg), overlay)
        if final.exists():
            final.unlink()
        helper.overlay_video(raw, overlay, final)
        if final.stat().st_size < 120000:
            raise RuntimeError(f'short final {final}')

        web_video = f'/images/{collection}/{final.name}'
        for image in entry.get('images', []):
            image['video_path'] = web_video
            image['video_filename'] = final.name
            image['video_source'] = 'Grok/xAI generated video with exact bilingual teaching superimposed in post'
        entry['grok_image_source_url'] = row['image_url']
        entry['grok_video_source_url'] = row['video_url']
        entry['source_video'] = 'Grok/xAI generated raw video; no local/archive footage'
        entry['video_note'] = 'Genuine Grok/xAI-generated motion from a clean text-free reconstruction of the existing teaching picture; exact bilingual teaching superimposed afterward in post.'
        entry['clean_grok_base'] = f'/images/{collection}/grok-bases-{BATCH}/{base.name}'
        manifest['generated'] = DATE
        atomic_json(manifest_path, manifest)
        built.append(str(final))

    print(json.dumps({'built': built, 'count': len(built)}, indent=2))


if __name__ == '__main__':
    main()
