#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / 'public/data/tzaddikim-database-complete.json',
    ROOT / 'public/data/tzaddikim-database.json',
    ROOT / 'public/data/tzaddikim-database-filtered.json',
]

def entry(name, he, day, year, notes, category='other', source='User-approved Elul yahrzeit candidates'):
    return {
        'name': name,
        'hebrew_name': he,
        'yahrzeit_hebrew': f'{day} Elul',
        'yahrzeit_month': 'Elul',
        'yahrzeit_day': str(day),
        'is_adar_ii': False,
        'year_passed': year,
        'notes': notes,
        'category': category,
        'source': source,
    }

APPROVED = [
    entry('Rabbi Pinchas Shapira of Koretz', 'רבי פנחס שפירא מקוריץ', 10, '1791',
          'Disciple of the Baal Shem Tov. Rabbeinu Nachman said that for a period he was חד בדרא — one of a generation.', 'chassidic'),
    entry('Rabbi Shlomo ben Hasson', 'רבי שלמה בן חסון', 11, '',
          'Early Salonika sage; author of Beit Shlomo and Mishpatim Yesharim.', 'sephardic'),
    entry('Rabbi Simcha Bunim of Peshischa', 'רבי שמחה בונים מפשיסחא', 12, '1827',
          'Author of Kol Simcha. קול שמחה plus the two words equals 491, the gematria of נ נח נחמ נחמן מאומן.', 'chassidic'),
    entry('Rabbi Yosef Chaim of Baghdad (Ben Ish Chai)', 'רבי יוסף חיים מבגדאד', 13, '1909',
          'The Ben Ish Chai; leading Sephardic sage and kabbalist of Baghdad.', 'sephardic'),
    entry('Rabbi Moshe Alshakar', 'רבי משה אלשקר', 15, '1542',
          'Author of Responsa Maharam Alshakar.', 'sephardic'),
    entry('Rabbi Yitzchak HaKohen Shapira', 'רבי יצחק הכהן שפירא', 16, '1582',
          'Father-in-law of the Maharam of Lublin.', 'acharonim'),
    entry('Rabbi Chaim Benveniste (Knesset HaGedolah)', 'רבי חיים בנבנישתי החבי״ב', 17, '1673',
          'Author of Knesset HaGedolah.', 'sephardic'),
    entry('Rabbi Moshe ben Yaakov Toledano', 'רבי משה ב״ר יעקב טולידנו', 17, '1778',
          'Sage of Meknes; author of Ohel Moshe.', 'sephardic'),
    entry('Rabbi Chaim Shmuel HaKohen Konorti', 'רבי חיים שמואל הכהן קונוורתי', 17, '',
          'Senior rabbinical judge and rabbi of Tiberias.', 'sephardic'),
    entry('Rabbi Yosef Yoska HaLevi of Rovno', 'רבי יוסף יוסקא הלוי מרובנא', 17, '1800',
          'Early disciple of the Maggid of Mezritch; author of Yesod Yosef and Likkutei Yosef.', 'chassidic',
          'User-approved: https://x.com/Yahrtzeits/status/2093927975087484996'),
    entry('Maharal of Prague (Rabbi Yehuda Loew)', 'מהר״ל מפראג', 18, '1609',
          'The Maharal of Prague; author of foundational works of Torah thought.', 'acharonim'),
    entry('Rabbi Avraham Shlomo Zalman Tzoref', 'רבי אברהם שלמה זלמן צורף', 19, '1851',
          'A leader of the Jerusalem community and builder of the Hurva synagogue.', 'acharonim'),
    entry('Rabbi Avraham Sternhartz', 'רבי אברהם שטרנהרץ', 20, '1955',
          'Elder Breslov leader and transmitter of the Breslov tradition in Jerusalem.', 'breslov'),
    entry('Rabbi Yonatan Eybeschutz', 'רבי יהונתן אייבשיץ', 21, '1764',
          'Author of Ya’arot Devash and major halachic works.', 'acharonim'),
    entry('Rabbi Uri the Seraph of Strelisk', 'רבי אורי השרף מסטרעליסק', 23, '1826',
          'Hasidic master known as the Seraph of Strelisk.', 'chassidic'),
    entry('Habakkuk the Prophet', 'חבקוק הנביא', 24, '',
          'Biblical prophet; author of the Book of Habakkuk.', 'biblical'),
    entry('Rabbi Elazar son of Rabbi Shimon bar Yochai', 'התנא רבי אלעזר ברשב״י', 25, '',
          'Tanna, son of Rabbi Shimon bar Yochai; buried in Meron.', 'talmudic'),
    entry('Rabbi Yechiel Michel, Maggid of Zlotchov', 'רבי יחיאל מיכל המגיד מזלוטשוב', 25, '1786',
          'The holy Maggid of Zlotchov, among the great early Hasidic masters.', 'chassidic'),
    entry('Rabbi Chaim Pinto the First', 'רבי חיים פינטו הראשון', 26, '1845',
          'Kabbalist and spiritual leader of Mogador, Morocco.', 'sephardic'),
    entry('Rabbi Eliyahu ben Yosef Tzarfati', 'רבי אליהו ב״ר יוסף צרפתי', 26, '1805',
          'Sage and rabbinical judge of Fez, Morocco.', 'sephardic'),
    entry('Sar Shalom of Belz', 'רבי שר שלום האדמו״ר מבעלז', 27, '1855',
          'Founder and first rebbe of the Belz Hasidic dynasty.', 'chassidic'),
    entry('Rabbi Natan HaKohen Adler', 'רבי נתן הכהן אדלר', 27, '1800',
          'Kabbalist and principal teacher of the Chatam Sofer.', 'acharonim'),
    entry('Rabbi Saadia, father-in-law of the Maharchu', 'רבי סעדיה חמיו של מהרח״ו', 28, '',
          'Father-in-law of Rabbi Chaim Vital (the Maharchu).', 'sephardic'),
    entry('Rabbi Yissachar ben Shlomo Zalman, author of Tzuf Devash', 'רבי יששכר ב״ר שלמה זלמן מח״ס צוף דבש', 29, '1807',
          'Author of Tzuf Devash.', 'acharonim'),
    entry('Rabbi Shlomo Amarillo', 'רבי שלמה אמאריליו', 29, '1721',
          'Author of Responsa Kerem Shlomo.', 'sephardic'),
]

def norm(s):
    return re.sub(r'[\s\"׳״()\-–—.,]+', '', s or '').lower()

# Aliases already used in the databases; these prevent duplicate records while
# allowing the approved Hebrew display name and notes to replace stale entries.
ALIASES = {
    norm('רבי פנחס שפירא מקוריץ'): {norm('רבי פנחס מקוריץ')},
    norm('רבי חיים בנבנישתי החבי״ב'): {norm('רבי חיים בנבנישתי')},
    norm('מהר״ל מפראג'): {norm('מהר"ל מפראג')},
    norm('רבי יהונתן אייבשיץ'): {norm('רבי יונתן אייבשיץ')},
    norm('התנא רבי אלעזר ברשב״י'): {norm('רבי אלעזר ברבי שמעון'), norm('רבי אלעזר בן רבי שמעון')},
    norm('רבי חיים פינטו הראשון'): {norm('רבי חיים פינטו')},
    norm('רבי שר שלום האדמו״ר מבעלז'): {norm('רבי שר שלום מבעלז')},
    norm('רבי נתן הכהן אדלר'): {norm('רבי נתן אדלר')},
}

summary = {}
for path in FILES:
    data = json.loads(path.read_text(encoding='utf-8'))
    rows = data.setdefault('all_tzaddikim', [])
    added = 0
    updated = 0
    for approved in APPROVED:
        target = norm(approved['hebrew_name'])
        acceptable = {target, *ALIASES.get(target, set())}
        matches = [i for i, row in enumerate(rows) if norm(row.get('hebrew_name')) in acceptable]
        if matches:
            first = matches[0]
            rows[first] = approved
            # Remove only duplicate aliases of this same approved identity.
            for i in reversed(matches[1:]):
                rows.pop(i)
            updated += 1
        else:
            rows.append(approved)
            added += 1
    # Preserve the existing database order; new approved Elul entries append.
    # The widget filters by month/day and does not require the source array sorted.
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    summary[path.name] = {'added': added, 'updated': updated, 'total': len(rows)}
print(json.dumps(summary, ensure_ascii=False, indent=2))
