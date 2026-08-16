#!/usr/bin/env python3
"""Build a bilingual, segment-deep topic index for Saba transcripts."""
import json, re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / 'public' / 'reader'
OUTPUT = READER / 'saba-transcript-topics.json'

COLLECTIONS = [
    {
        'id': 'sichos-chayay-saba',
        'title': 'Sichos Metoch Chayay HaSaba',
        'hebrewTitle': 'שיחות מתוך חיי הסבא',
        'directory': 'sichos-chayay-saba',
        'glob': 'section-*.json',
        'slugPattern': r'section-(\d+)$',
    },
    {
        'id': 'saba-tape-transcripts',
        'title': 'Saba Tape Transcripts',
        'hebrewTitle': 'תמלולי קלטות סבא',
        'directory': 'saba-tape-transcripts/tapes',
        'glob': 'tape-*.json',
        'slugPattern': r'tape-0*(\d+)-([ab])$',
    },
]

# Keywords are deliberately bilingual. A result is one transcript section/tape,
# linked to the first matching paragraph so the topic index opens at the passage.
TOPICS = [
    ('rabbainu', 'Rabbainu — Rebbe Nachman', 'רבינו — רבי נחמן', ['rabbainu', 'rebbe nachman', 'reb nachman', 'rabbi nachman', 'רבינו', 'רבי נחמן']),
    ('petek-na-nach', 'The Petek & Na Nach', 'הפתק ונ נח', ['petek', 'holy letter', 'na nach', 'nachma nachman', 'פתק', 'נ נח', 'נַ נַחְ']),
    ('prayer-hisbodidus', 'Prayer & Hisbodidus', 'תפילה והתבודדות', ['prayer', 'pray', 'hisbodidus', 'hitbodedut', 'tefill', 'תפילה', 'להתפלל', 'התבודדות']),
    ('faith', 'Faith & Trust in H“Y', 'אמונה וביטחון בה׳', ['faith', 'emunah', 'trust in h', 'believe', 'אמונה', 'בטחון', 'ביטחון', 'להאמין']),
    ('joy', 'Joy, Song & Dance', 'שמחה, ניגון וריקוד', ['joy', 'glad', 'rejoice', 'dance', 'song', 'simcha', 'שמחה', 'ריקוד', 'לרקוד', 'ניגון', 'שמח']),
    ('yisroel-karduner', 'Reb Yisroel Karduner', 'רבי ישראל קרדונר', ['yisroel karduner', 'yisroel kardonner', 'israel karduner', 'ישראל קרדונר', 'ישראל קארדונר']),
    ('reb-noson', 'Reb Noson & His Books', 'רבי נתן וספריו', ['reb noson', 'rebbe nassan', 'rabbi nathan', 'likutay halachos', 'likutay tefillos', 'yemay moharnat', 'רבי נתן', 'ר׳ נתן', 'ליקוטי הלכות', 'ליקוטי תפילות', 'ימי מוהרנ']),
    ('breslov-books', 'Breslov Books & Printing', 'ספרי ברסלב והדפסתם', ['book', 'books', 'printing', 'print the books', 'likutay moharan', 'sipuray ma', 'ספר', 'ספרים', 'להדפיס', 'ליקוטי מוהר', 'סיפורי מעשיות']),
    ('israel-jerusalem', 'Land of Israel, Jerusalem & the Kotel', 'ארץ ישראל, ירושלים והכותל', ['land of israel', 'jerusalem', 'yerushalayim', 'kotel', 'tiberias', 'meron', 'ארץ ישראל', 'ירושלים', 'כותל', 'טבריה', 'מירון']),
    ('redemption', 'Redemption & Messiah', 'גאולה ומשיח', ['redemption', 'messiah', 'mashiach', 'geulah', 'גאולה', 'משיח']),
    ('healing', 'Healing, Salvation & Miracles', 'רפואה, ישועה וניסים', ['healing', 'heal', 'remedy', 'salvation', 'miracle', 'doctor', 'hospital', 'רפואה', 'רפוא', 'ישועה', 'נס', 'ניסים', 'רופא', 'בית חולים']),
    ('family', 'Family, Children & Marriage', 'משפחה, ילדים ונישואין', ['child', 'children', 'wife', 'husband', 'marriage', 'daughter', 'son', 'ילד', 'ילדים', 'אשה', 'אישה', 'בעל', 'נישוא', 'בת ', 'בן ']),
    ('desires', 'Purity, Trials & Desires', 'קדושה, ניסיונות ותאוות', ['desire', 'temptation', 'purity', 'pure', 'covenant', 'תאווה', 'תאוות', 'טהור', 'קדוש', 'ברית']),
    ('sacrifice-poverty', 'Self-Sacrifice, Poverty & Endurance', 'מסירות נפש, עניות והתחזקות', ['self-sacrifice', 'poverty', 'hunger', 'bread', 'suffer', 'מסירות נפש', 'עניות', 'רעב', 'לחם', 'יסורים', 'ייסורים']),
    ('shazar-state', 'President Shazar & the State of Israel', 'הנשיא שזר ומדינת ישראל', ['shazar', 'president', 'state of israel', 'ben gurion', 'שזר', 'נשיא', 'מדינת ישראל', 'בן גוריון']),
    ('opposition', 'Opposition to Breslov', 'המחלוקת על ברסלב', ['opposition', 'opponents', 'persecut', 'against breslov', 'chabad', 'slonim', 'מתנגד', 'מתנגדים', 'מחלוקת', 'רדפו', 'חב״ד', 'חבד', 'סלונים']),
    ('dreams', 'Dreams & Visions', 'חלומות ומראות', ['dream', 'vision', 'חלום', 'חזון']),
    ('rosh-hashanah', 'Rosh HaShanah, Uman & Tikkun HaKlali', 'ראש השנה, אומן ותיקון הכללי', ['rosh hashanah', 'uman', 'tikkun haklali', 'general remedy', 'ראש השנה', 'אומן', 'תיקון הכללי']),
]

TAG_RE = re.compile(r'<[^>]+>')
SPACE_RE = re.compile(r'\s+')


def clean(value):
    return SPACE_RE.sub(' ', TAG_RE.sub(' ', str(value or ''))).strip()


def transcript_slug(path, pattern):
    match = re.search(pattern, path.stem)
    if not match:
        raise ValueError(f'Unrecognized transcript filename: {path}')
    if len(match.groups()) == 2:
        return f'{int(match.group(1))}-{match.group(2)}'
    return str(int(match.group(1)))


def slug_sort_key(slug):
    match = re.match(r'^(\d+)(?:-([ab]))?$', slug)
    return (int(match.group(1)), match.group(2) or '') if match else (999999, slug)


def excerpt(text, needles, width=230):
    folded = text.casefold()
    positions = [folded.find(k.casefold()) for k in needles]
    positions = [p for p in positions if p >= 0]
    pos = min(positions) if positions else 0
    start = max(0, pos - 65)
    end = min(len(text), start + width)
    return ('…' if start else '') + text[start:end].strip() + ('…' if end < len(text) else '')


def main():
    topic_rows = {topic[0]: [] for topic in TOPICS}
    documents = []
    language_counts = {'he': 0, 'en': 0, 'bilingual': 0}

    for collection in COLLECTIONS:
        folder = READER / collection['directory']
        sources = [(transcript_slug(path, collection['slugPattern']), path) for path in folder.glob(collection['glob'])]
        for slug, source in sorted(sources, key=lambda row: slug_sort_key(row[0])):
            data = json.loads(source.read_text(encoding='utf-8'))
            number = slug
            title = clean(data.get('title'))
            hebrew_title = clean(data.get('hebrewTitle'))
            segments = data.get('segments') or []
            has_he = any(clean(seg.get('he')) for seg in segments if isinstance(seg, dict))
            has_en = any(clean(seg.get('en')) for seg in segments if isinstance(seg, dict))
            if has_he: language_counts['he'] += 1
            if has_en: language_counts['en'] += 1
            if has_he and has_en: language_counts['bilingual'] += 1
            base_url = f"/reader/{collection['id']}/1/{slug}"
            documents.append({
                'collection': collection['id'], 'number': slug, 'title': title,
                'hebrewTitle': hebrew_title, 'url': base_url,
                'paragraphs': len(segments), 'hasHebrew': has_he, 'hasEnglish': has_en,
            })

            for topic_slug, topic_en, topic_he, needles in TOPICS:
                first = None
                hits = 0
                for position, seg in enumerate(segments, 1):
                    if not isinstance(seg, dict):
                        continue
                    he = clean(seg.get('he'))
                    en = clean(seg.get('en'))
                    haystack = f'{title} {hebrew_title} {he} {en}'.casefold()
                    matched = [needle for needle in needles if needle.casefold() in haystack]
                    if not matched:
                        continue
                    hits += 1
                    if first is None:
                        index = seg.get('index') or position
                        first = {
                            'collection': collection['id'], 'number': slug,
                            'title': title, 'hebrewTitle': hebrew_title,
                            'url': f'{base_url}#seg-{index}', 'segment': index,
                            'excerptEn': excerpt(en or title, matched),
                            'excerptHe': excerpt(he or hebrew_title, matched),
                        }
                if first:
                    first['matches'] = hits
                    topic_rows[topic_slug].append(first)

    topics = []
    for slug, title, hebrew_title, _ in TOPICS:
        rows = topic_rows[slug]
        if rows:
            topics.append({'id': slug, 'title': title, 'hebrewTitle': hebrew_title, 'count': len(rows), 'entries': rows})

    payload = {
        'version': 1,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'collections': [{k: v for k, v in c.items() if k not in ('glob', 'directory', 'slugPattern')} for c in COLLECTIONS],
        'stats': {'documents': len(documents), **language_counts, 'topics': len(topics)},
        'documents': documents,
        'topics': topics,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(OUTPUT), 'documents': len(documents), 'topics': len(topics), **language_counts}, ensure_ascii=False))


if __name__ == '__main__':
    main()
