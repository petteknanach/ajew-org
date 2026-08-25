#!/usr/bin/env python3
import argparse, io, json, re, shutil, zipfile
from collections import defaultdict
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DOWNLOAD_ROOTS = [Path('/root/Downloads'), Path('/mnt/c/Users/Pettek/Downloads')]
TOPICS = {
    'children': (9, 'children'),
    'israel-land-part-ii': (7, 'israel-land-of-part-ii'),
    'lost-article-part-ii': (8, 'lost-article-part-ii'),
    'sweetening': (22, 'sweetening-of-judgments'),
    'seclusion': (23, 'seclusion-hisbodidus'),
    'thoughts': (24, 'thoughts'),
    'superiority': (25, 'superiority'),
    'success': (26, 'success'),
}

def classify(name: str):
    low = name.lower()
    if low.startswith('children_') or low.startswith('children-'): topic = 'children'
    elif 'israel_land_of_part_ii' in low or 'israel-land-of-part-ii' in low: topic = 'israel-land-part-ii'
    elif 'lost_article_part_ii' in low or 'lost-article-part-ii' in low: topic = 'lost-article-part-ii'
    elif 'sweetening' in low and ('judgment' in low or 'judgement' in low): topic = 'sweetening'
    elif 'seclusion' in low or 'hisbodidus' in low: topic = 'seclusion'
    elif 'thoughts' in low or 'thought_' in low: topic = 'thoughts'
    elif 'superiority' in low: topic = 'superiority'
    elif low.startswith('success_') or low.startswith('success-'): topic = 'success'
    else: return None
    m = re.search(r'(?:children|israel[_-]land[_-]of[_-]part[_-]ii|lost[_-]article[_-]part[_-]ii|sweetening(?:_of_judgments?)?|seclusion(?:_hisbodidus)?|thoughts?|superiority|success)[_-](\d{1,3})', low)
    if not m: return None
    segment = int(m.group(1))
    # The transition package uses global sequence 85 for Superiority teaching 1.
    if topic == 'superiority' and segment == 85: segment = 1
    cm = re.search(r'concept[_ -]?([ab])', low) or re.search(r'[_-]([ab])[_-](?:en|he|english|hebrew)(?:\.|_|-)', low)
    if not cm: return None
    concept = cm.group(1)
    if re.search(r'(?:_|-)(?:english|en)(?:\.|_|-)', low): lang = 'en'
    elif re.search(r'(?:_|-)(?:hebrew|he)(?:\.|_|-)', low): lang = 'he'
    else: return None
    return topic, segment, concept, lang

def package_score(path: Path):
    low = path.name.lower()
    return (100 if 'repaired' in low or 'repair' in low else 0) + (50 if 'final' in low else 0) + int(path.stat().st_mtime)

def png_ok(data: bytes):
    try:
        with Image.open(io.BytesIO(data)) as im:
            # Some early authenticated ChatGPT packages were approved at the
            # provider's native 16:9 size (for example 1672x941) rather than
            # exactly 1280x720. They are still final teaching cards and must
            # not be silently omitted from the Reader.
            return im.format == 'PNG' and im.width >= 640 and im.height >= 360
    except Exception:
        return False

parser = argparse.ArgumentParser(description='Publish verified ChatGPT Sefer HaMidos picture packages.')
parser.add_argument(
    '--package', action='append', type=Path, default=[],
    help='Only ingest this physically verified package ZIP (repeatable).',
)
args = parser.parse_args()

def all_packages():
    if args.package:
        packages = [p.resolve() for p in args.package]
        missing = [str(p) for p in packages if not p.is_file()]
        if missing:
            parser.error('package not found: ' + ', '.join(missing))
        return sorted(set(packages))
    found = []
    for root in DOWNLOAD_ROOTS:
        if root.exists():
            # Authenticated ChatGPT deliverables consistently use Package in
            # the filename. Avoid opening unrelated (and sometimes very large)
            # ZIP archives in Downloads on every resumable publication pass.
            found.extend(root.glob('*Package*.zip'))
            found.extend(root.glob('*package*.zip'))
    # Previously verified Sweetening 52-75 packages were preserved here.
    found.extend(Path('/root/sefer-hamidos-chatgpt-packages-052-075').glob('*.zip'))
    # Resumable production checkpoints are preserved in unique staging paths.
    found.extend(Path('/root/sefer-hamidos-staging').glob('**/*.zip'))
    return sorted(set(found))

# Best source per exact topic/segment/concept/language.
sources = {}
provenance = {}
for zp in all_packages():
    try:
        score = package_score(zp)
        with zipfile.ZipFile(zp) as z:
            if z.testzip() is not None:
                continue
            for member in z.namelist():
                if not member.lower().endswith('.png'):
                    continue
                cls = classify(Path(member).name)
                if not cls:
                    continue
                data = z.read(member)
                if not png_ok(data):
                    continue
                if cls not in sources or score > sources[cls][0]:
                    sources[cls] = (score, data)
                    provenance[cls] = f'{zp}:{member}'
    except (OSError, zipfile.BadZipFile, RuntimeError):
        continue

# Include already-verified canonical Sweetening 52-75 files that landed in Git
# but were omitted from the Reader manifest.
canon = ROOT / 'public/images/sefer-hamidos-sweetening-of-judgments'
for p in canon.glob('sh-sweetening-of-judgments-*-concept-*-*.png'):
    m = re.match(r'sh-sweetening-of-judgments-(\d{3})-concept-([ab])-(en|he)\.png$', p.name)
    if not m:
        continue
    cls = ('sweetening', int(m.group(1)), m.group(2), m.group(3))
    data = p.read_bytes()
    if png_ok(data) and cls not in sources:
        sources[cls] = (0, data)
        provenance[cls] = str(p)

report_path = ROOT / 'production-manifests/sefer-hamidos/chatgpt-reader-publication-20260820.json'
if report_path.exists():
    report = json.loads(report_path.read_text(encoding='utf-8'))
else:
    report = {'topics': {}, 'incomplete_segments': {}, 'source_count': 0}
report.setdefault('topics', {})
report.setdefault('incomplete_segments', {})
report['source_count'] = max(int(report.get('source_count', 0)), len(sources))
for topic_name, (topic_num, slug) in TOPICS.items():
    topic_path = ROOT / f'public/reader/sefer-hamidos/topic-{topic_num}.json'
    topic = json.loads(topic_path.read_text(encoding='utf-8'))
    segment_map = {int(s['index']): s for s in topic['segments']}
    out = ROOT / f'public/images/sefer-hamidos-{slug}'
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / 'manifest.json'
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    else:
        manifest = {
            'book': 'sefer-hamidos', 'topic': topic_num,
            'topic_title': f"{topic['title']} / {topic.get('hebrewTitle','')}",
            'collection': f'sefer-hamidos-{slug}', 'generated': '2026-08-20', 'entries': []
        }
    existing = {int(e['segment']): e for e in manifest.get('entries', [])}
    available_segments = sorted({k[1] for k in sources if k[0] == topic_name and k[1] in segment_map})
    published = []
    incomplete = []
    for seg_no in available_segments:
        keys = [(topic_name, seg_no, c, l) for c in ('a','b') for l in ('en','he')]
        if not all(k in sources for k in keys):
            incomplete.append({'segment': seg_no, 'present': [f'{k[2]}-{k[3]}' for k in keys if k in sources]})
            continue
        seg = segment_map[seg_no]
        images = []
        for concept in ('a','b'):
            for lang in ('he','en'):
                key = (topic_name, seg_no, concept, lang)
                filename = f'sh-{slug}-{seg_no:03d}-chatgpt-{concept}-{lang}.png'
                dest = out / filename
                dest.write_bytes(sources[key][1])
                images.append({
                    'language': 'hebrew' if lang == 'he' else 'english',
                    'variant': f'ChatGPT Concept {concept.upper()}',
                    'path': f'/images/sefer-hamidos-{slug}/{filename}?v=20260820a',
                    'archive_filename': filename,
                    'source': 'ChatGPT/OpenAI authenticated image production',
                    'quality': 'Exact Sefer Hamidos teaching with deterministic bilingual typography',
                })
        existing[seg_no] = {
            'topic': topic_num, 'topic_number': topic_num,
            'topic_title': f"{topic['title']} / {topic.get('hebrewTitle','')}",
            'segment': seg_no, 'displayLabel': seg.get('displayLabel', str(seg_no)),
            'he': seg.get('he',''), 'en': seg.get('en',''), 'images': images,
            'source_note': 'Two ChatGPT concepts; Hebrew and English cards share each concept base.',
        }
        published.append(seg_no)
    manifest['entries'] = [existing[n] for n in sorted(existing)]
    manifest['generated'] = '2026-08-20'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    previous_published = report['topics'].get(topic_name, {}).get('chatgpt_segments_published', [])
    report['topics'][topic_name] = {
        'topic_number': topic_num, 'manifest_entries': len(manifest['entries']),
        'chatgpt_segments_published': sorted(set(previous_published) | set(published)),
        'image_count': sum(len(e.get('images', [])) for e in manifest['entries']),
    }
    if incomplete:
        report['incomplete_segments'][topic_name] = incomplete

report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
