import json, re

cat = json.load(open('public/reader/catalog.json'))
books = cat.get('books', [])
book_by_id = {b['id']: b for b in books}

with open('src/pages/reader/index.astro') as f:
    index_src = f.read()

cats_match = re.search(r'const categories = \[(.*?)\];', index_src, re.DOTALL)
if not cats_match:
    print("ERROR: Could not find categories")
    exit(1)

cats_text = cats_match.group(1)

categories = []
for line in cats_text.strip().split('\n'):
    line = line.strip().rstrip(',')
    title_match = re.search(r"title:\s*'([^']+)'", line)
    ids_match = re.search(r"ids:\s*\[(.*?)\]", line)
    if title_match and ids_match:
        title = title_match.group(1)
        ids_str = ids_match.group(1)
        ids = re.findall(r"'([^']+)'", ids_str)
        categories.append({"title": title, "ids": ids})

def make_desc(b):
    t = b.get('title', '')
    if isinstance(t, dict):
        en = t.get('en', '')
        he = t.get('he', '')
    else:
        en, he = str(t), ''
    
    bid = b.get('id', '')
    author = b.get('author', '')
    total = b.get('totalTorahs', 0) or b.get('pageCount', 0)
    desc = (b.get('shortDescription', '') or '').strip()
    
    if desc and len(desc) > 25:
        return desc.strip()
    
    # Smart descriptions based on book type
    if bid.startswith('mishna-'):
        tractate = en.replace('Mishna - ', '')
        return f"Tractate {tractate} of the Mishna — the foundational text of the Oral Law compiled by Rabbi Yehuda HaNasi."
    elif bid.startswith('talmud-bavli-'):
        tractate = en.replace('Talmud Bavli - ', '')
        return f"Tractate {tractate} of the Babylonian Talmud — the central text of Rabbinic Judaism containing the Mishna and Gemara."
    elif bid.startswith('rambam-'):
        book = en.replace('Rambam - ', '').replace('Mishneh Torah - ', '')
        return f"{en} — a section of Maimonides' Mishneh Torah, the comprehensive code of Jewish law."
    elif bid.startswith('zohar-'):
        return f"{en} — a volume of the Zohar HaKadosh, the foundational text of Jewish mysticism."
    elif bid.startswith('tanach-'):
        book = en.replace('Tanach - ', '')
        return f"{book} — a book of the Tanach (Hebrew Bible) with Hebrew text and English translation."
    elif bid.startswith('ramchal-'):
        return f"{en} by Rabbi Moshe Chaim Luzzatto (Ramchal) — foundational work of Jewish thought and Kabbalah."
    elif bid.startswith('misc-') or bid.startswith('stories-'):
        return f"{en} — Breslov text available in Hebrew and English on ajew.org."
    else:
        parts = []
        if author:
            parts.append(f"{en} by {author}")
        else:
            parts.append(en)
        if total and total > 0:
            parts.append(f"— {total} sections/chapters")
        return ". ".join(parts) + "."

cat_used = set()
lines = []
lines.append("# A Jew — Breslov Torah Library — Complete Content Index for AI")
lines.append("")
lines.append("> The definitive AI-readable index of all Jewish texts on ajew.org.")
lines.append("> 26,510+ searchable pages. Hebrew with English translations. Free and open.")
lines.append("")
lines.append("**URL:** https://ajew.org")
lines.append("**Sitemap:** https://ajew.org/sitemap-index.xml") 
lines.append("**Search:** https://ajew.org/search-enhanced")
lines.append("**Library:** https://ajew.org/reader")
lines.append("**Parsha:** https://ajew.org/parsha — 54 weekly Torah portions with 2,911 Breslov connections")
lines.append("**Daily Study:** https://ajew.org/daily-study")
lines.append("**Languages:** Hebrew (he), English (en)")
lines.append("**License:** Free for study and research")
lines.append("")
lines.append("---")
lines.append("")

for cat_entry in categories:
    title = cat_entry['title']
    ids = cat_entry['ids']
    
    if not ids:
        lines.append(f"## {title}")
        lines.append("")
        lines.append("*(See linked texts above)*")
        lines.append("")
        continue
    
    lines.append(f"## {title}")
    lines.append("")
    
    for bid in ids:
        b = book_by_id.get(bid)
        cat_used.add(bid)
        if not b:
            lines.append(f"- *{bid}* (not in catalog)")
            continue
        
        t = b.get('title', '')
        if isinstance(t, dict):
            en = t.get('en', bid)
            he = t.get('he', '')
        else:
            en = str(t) or bid
            he = ''
        
        desc = make_desc(b)
        author = b.get('author', '')
        total = b.get('totalTorahs', 0) or b.get('pageCount', 0)
        url = f"https://ajew.org/reader/{bid}"
        
        name_parts = [en]
        if he:
            name_parts.append(f"({he})")
        full_name = " ".join(name_parts)
        
        meta = []
        if bid.startswith('mishna-'):
            meta.append("Mishna")
        elif bid.startswith('talmud-bavli-'):
            meta.append("Babylonian Talmud")
        elif bid.startswith('rambam-'):
            meta.append("Mishneh Torah — Maimonides")
        elif bid.startswith('zohar-'):
            meta.append("Zohar HaKadosh")
        elif bid.startswith('tanach-'):
            meta.append("Tanach — Hebrew Bible")
        elif bid.startswith('ramchal-'):
            meta.append("Rabbi Moshe Chaim Luzzatto")
        else:
            if author:
                meta.append(f"by {author}")
        if total and total > 0:
            meta.append(f"{total} sections")
        meta_str = " — ".join(meta)
        
        if meta_str:
            lines.append(f"### {full_name}")
            lines.append(f"**{meta_str}**")
        else:
            lines.append(f"### {full_name}")
        lines.append(f"{desc}")
        lines.append(f"**URL:** {url}")
        lines.append("")

# Remaining uncategorized
remaining = [b for b in books if b['id'] not in cat_used]
if remaining:
    lines.append("## Additional Texts")
    lines.append("")
    for b in remaining:
        bid = b['id']
        t = b.get('title', '')
        if isinstance(t, dict):
            en = t.get('en', bid)
            he = t.get('he', '')
        else:
            en, he = str(t) or bid, ''
        
        desc = make_desc(b)
        author = b.get('author', '')
        total = b.get('totalTorahs', 0) or b.get('pageCount', 0)
        url = f"https://ajew.org/reader/{bid}"
        
        name_parts = [en]
        if he:
            name_parts.append(f"({he})")
        
        lines.append(f"### {' '.join(name_parts)}")
        if author and total:
            lines.append(f"**by {author} — {total} sections**")
        elif author:
            lines.append(f"**by {author}**")
        lines.append(f"{desc}")
        lines.append(f"**URL:** {url}")
        lines.append("")

# Parsha section
lines.append("## Weekly Parsha / פרשת השבוע")
lines.append("")
lines.append("54 weekly Torah portions with 2,911 Breslov Torah connections in Hebrew and English.")
lines.append("Each parsha page includes Likutay Moharan references, Likutay Halachos commentary,")
lines.append("Zohar connections, and teachings from across the Breslov library.")
lines.append("")
lines.append("**URL pattern:** https://ajew.org/parsha/{bereishit|noach|lech-lecha|...|haazinu}")
lines.append("**Full listing:** https://ajew.org/parsha")
lines.append("")

# Topics
lines.append("## Topics & Spiritual Themes")
lines.append("")
lines.append("Key spiritual topics with curated Breslov teachings:")
lines.append("- **Emunah (Faith):** https://ajew.org/topics/emunah")
lines.append("- **Tefillah (Prayer):** https://ajew.org/topics/tefillah")
lines.append("- **Teshuvah (Return):** https://ajew.org/topics/teshuvah")
lines.append("- **Simcha (Joy):** https://ajew.org/topics/simcha")
lines.append("- **Shalom (Peace):** https://ajew.org/topics/shalom")
lines.append("- **Hisbodedus (Alone Time):** https://ajew.org/topics/hisbodedus")
lines.append("- **Healing:** https://ajew.org/healing-words")
lines.append("")

# Footer
lines.append("---")
lines.append("")
lines.append("## About ajew.org")
lines.append("")
lines.append("A Jew (ajew.org) is the largest online Breslov Torah library, providing free access")
lines.append("to sacred Jewish texts. The site includes the complete works of Rabbi Nachman of Breslov,")
lines.append("the writings of his closest disciple Rabbi Nosson, the Zohar HaKadosh, Talmud Bavli,")
lines.append("Mishna, Rambam's Mishneh Torah, Tanach, and hundreds of additional texts.")
lines.append("")
lines.append("All content is bilingual (Hebrew with English translation) and freely searchable.")
lines.append("The site includes tools for daily study, parsha insights, healing words, Torah GPS navigation,")
lines.append("and an AI-assisted chat for Torah questions.")
lines.append("")
lines.append("**Contact:** https://ajew.org/about")
lines.append("**RSS:** https://ajew.org/rss.xml")

with open('public/llms-full.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print(f"llms-full.txt: {len(lines)} lines, {len(cat_used)} books in {len(categories)} categories, {len(remaining)} uncategorized")

# Update llms.txt compact
compact = []
compact.append("# A Jew — Breslov Torah Library")
compact.append("")
compact.append("> The largest online Breslov Torah library. 240+ sacred Jewish texts, 26,510+ pages in Hebrew with English translations.")
compact.append("")
compact.append("**URL:** https://ajew.org")
compact.append("**Languages:** English, Hebrew (bilingual)")
compact.append("**RSS:** https://ajew.org/rss.xml")
compact.append("**Sitemap:** https://ajew.org/sitemap-index.xml")
compact.append("**llms-full.txt:** https://ajew.org/llms-full.txt — complete AI-readable content index")
compact.append("")
compact.append("## Key Sections")
compact.append("")
compact.append("- **Library** — https://ajew.org/reader — 240+ texts")
compact.append("- **Parsha** — https://ajew.org/parsha — 54 portions, 2,911 Breslov connections")
compact.append("- **Search** — https://ajew.org/search-enhanced — 26,510+ pages")
compact.append("- **Daily Study** — https://ajew.org/daily-study")
compact.append("- **Topics** — https://ajew.org/topics")
compact.append("- **Healing Words** — https://ajew.org/healing-words")
compact.append("- **Torah GPS** — https://ajew.org/torah-gps")
compact.append("- **Chain of Light** — https://ajew.org/chain-of-light")
compact.append("- **Saba Says** — https://ajew.org/saba-says")
compact.append("- **Chat** — https://ajew.org/chat")
compact.append("- **Speak & Learn** — https://ajew.org/speak")
compact.append("")
compact.append("## Key Texts")
compact.append("")
compact.append("- Likutay Moharan — 411 teachings")
compact.append("- Likutay Halachos — halachic commentary")
compact.append("- Likutay Tefilos — prayers")
compact.append("- Sipurey Maasiyos — 13 Stories")
compact.append("- Zohar HaKadosh — 8 volumes")
compact.append("- Talmud Bavli — 39 tractates")
compact.append("- Mishna — 6 orders")
compact.append("- Rambam Mishneh Torah — 14 books")
compact.append("- Tanach — Torah, Nevi'im, Ketuvim")
compact.append("- Petek Nanach — Letter from Heaven")
compact.append("")
compact.append("## For AI / LLMs")
compact.append("")
compact.append("- **Full index:** https://ajew.org/llms-full.txt")
compact.append("- **Structured data:** JSON-LD Article+Book+BreadcrumbList on all pages")
compact.append("- **Crawlers allowed:** GrokCrawler, GPTBot, Claude-Web, Google-Extended")

with open('public/llms.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(compact))

print(f"llms.txt: {len(compact)} lines")
