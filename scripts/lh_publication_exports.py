"""LH authenticated-publication plain exports; no legacy-context teaching fallback."""
import html
import json
from pathlib import Path


def write_publication(out_dir, data, book, part, torah, source_url):
    publication = data["sourcePublication"]
    assert publication["schema"] == "lh-authenticated-publication-v1"
    assert book == "likutay-halachos" and str(part) == "1"
    multi = data.get("readerTransportVersion") == 2
    if not multi and (data.get("sourcePublications") or
                      publication.get("volume", 5) != 5 or
                      any(row.get("sourceRole") == "supplied_english_source_paragraph" for row in data["segments"])):
        raise ValueError("Unsupported LH source edition transport; no unqualified export fallback")
    publications = [publication, *(data.get("sourcePublications", []) if multi else [])]
    by_edition = {pub["edition"]: pub for pub in publications}
    if len(by_edition) != len(publications):
        raise ValueError("Duplicate LH source edition")
    segments = data["segments"]
    if multi and any(row.get("sourceEdition") not in by_edition for row in segments):
        raise ValueError("Unqualified LH export record")
    last = {(pub["edition"], unit["recordIndices"][-1]): unit
            for pub in publications for unit in pub["units"]}
    plain_url = f"/reader-plain/{book}/{part}/{torah}/"
    canonical = source_url or plain_url
    title = data["title"]
    hebrew_title = data.get("hebrewTitle", "")
    credit = "Current matched Volume 5 source edition; unchanged Reader material is identified separately. Translator notes and learning aids are editorial layers, not original teaching paragraphs."
    if multi:
        credit = "Supplied source editions: " + "; ".join(f"Likutay Halachos, Volume {pub['volume']}" for pub in publications) + ". Additional supplied English paragraphs retain their nonexclusive reference spans and qualifications; no Hebrew counterpart is manufactured. Source qualifications and editorial learning aids remain separate from original teaching. Earlier personal annotations were not migrated."
    txt = [title, hebrew_title, "Source: https://ajew.org" + canonical, credit, ""]
    md = ["# " + title, hebrew_title, "Source: https://ajew.org" + canonical, credit, ""]
    rows = []
    toc = []
    previous_edition = None
    for segment in segments:
        owner = by_edition.get(segment.get("sourceEdition"))
        current = owner is not None
        if multi and len(publications) > 1 and segment["sourceEdition"] != previous_edition:
            boundary_owner = by_edition[segment["sourceEdition"]]
            boundary = f"Source edition: Likutay Halachos, Volume {boundary_owner['volume']} ({boundary_owner['edition']})"
            txt += [boundary, ""]
            md += ["## " + boundary, ""]
            rows.append(f'<section class="source-edition-boundary" data-source-edition="{html.escape(boundary_owner["edition"], quote=True)}"><h2>{html.escape(boundary)}</h2></section>')
            previous_edition = segment["sourceEdition"]
        role = segment.get("sourceRole", "")
        reference = segment.get("sourceReference")
        he = segment.get("he_nikud", segment.get("he", "")) if current else segment.get("he", "")
        en = segment.get("en", "")
        index = segment["index"]
        anchor = segment.get("canonicalAnchor") or f"segment-{index}"
        if multi and role == "supplied_english_source_paragraph":
            if (segment.get("exclusiveBilingualOwnerAsserted") is not False or
                    segment.get("editorialAid") is not False or he or not segment.get("sourceQualifications")):
                raise ValueError("Unsupported supplied-English export association")
            label = "Additional supplied English source paragraph — related references " + ", ".join(f"[{ref}]" for ref in segment["relatedReferences"])
            heading = 3
        elif current and role in ["unit_heading", "item_marker", "embedded_subheading"]:
            label = en or he
            heading = 2 if role == "unit_heading" else 3
        elif reference is not None:
            label = f"[{reference}]"
            heading = 3
        elif current:
            label = role.replace("_", " ").capitalize()
            heading = 3
        else:
            label = f"Unchanged Reader paragraph {index}"
            heading = 3
        structure = current and role in ["unit_heading", "item_marker", "embedded_subheading"]
        txt += ["HE:", he, "EN:", en, ""] if structure else [label, "HE:", he, "EN:", en, ""]
        md += ["#" * heading + " " + label, "HE:", he, ""] if structure else ["#" * heading + " " + label, "HE:", he, "EN:", en, ""]
        escaped_anchor = html.escape(anchor, quote=True)
        toc.append(f'<li><a href="#{escaped_anchor}">{html.escape(label)}</a></li>')
        body = [f'<section id="{escaped_anchor}" class="source-record" data-source-role="{html.escape(role, quote=True)}">',
                f'<h{heading}>{html.escape(label)}</h{heading}>',
                f'<div class="he" lang="he" dir="rtl">{html.escape(he)}</div>',
                f'<div class="en" lang="en" dir="ltr">{html.escape(en)}</div>' if not structure else ""]
        notes = ([*(owner or {}).get("sourceQualifications", []), *segment.get("translatorNotes", []), *segment.get("sourceQualifications", [])]
                 if multi else segment.get("translatorNotes", []))
        if notes:
            note_label = "Source qualifications — separate from the original teaching" if multi else "Translator notes — separate from the original teaching"
            txt += [note_label]
            md += ["#### " + note_label]
            body.append(f'<aside class="translator-notes" aria-label="{html.escape(note_label if multi else "Translator notes", quote=True)}">')
            for note in notes:
                text = note["text"]
                txt += [text, ""]
                md += [text, ""]
                body.append(f'<p id="{html.escape(note["id"], quote=True)}" dir="auto">{html.escape(text)}</p>')
            body.append('</aside>')
        body.append('</section>')
        rows.append("\n".join(body))
        if (segment.get("sourceEdition"), index) not in last:
            continue
        unit = last[(segment.get("sourceEdition"), index)]
        aid_title = "Summary and study aids — " + unit["title"]
        txt += [aid_title, unit["editorialAttribution"], ""]
        md += ["## " + aid_title, unit["editorialAttribution"], ""]
        body = [f'<section class="editorial" id="{html.escape(unit["aidAnchor"], quote=True)}"><h2>{html.escape(aid_title)}</h2>',
                f'<p>{html.escape(unit["editorialAttribution"])}</p>']
        for aid in unit["editorialAids"]:
            text = aid["text"]
            txt += [text, ""]
            md += [("### " if "Heading" in aid["style"] or "Subhead" in aid["style"] else "") + text, ""]
            tag = "h3" if "Heading" in aid["style"] or "Subhead" in aid["style"] else "p"
            body.append(f'<{tag}>{html.escape(text)}</{tag}>')
        for diagram in unit["diagrams"]:
            url = "https://ajew.org" + diagram["url"]
            title_text = diagram["title"]
            attribution = diagram["attribution"]
            txt += [title_text, attribution, url, ""]
            md += [f'[{title_text}]({url})', attribution, ""]
            body.append(f'<figure id="{html.escape(diagram["id"], quote=True)}"><a href="{html.escape(diagram["url"], quote=True)}"><img loading="lazy" src="{html.escape(diagram["url"], quote=True)}" alt="{html.escape(title_text, quote=True)}"></a><figcaption>{html.escape(title_text)} — {html.escape(attribution)}</figcaption></figure>')
        body.append('</section>')
        rows.append("\n".join(body))
    output = Path(out_dir) / book / str(part) / str(torah)
    output.mkdir(parents=True, exist_ok=True)
    (output / "index.txt").write_text("\n".join(txt) + "\n", encoding="utf8")
    (output / "index.md").write_text("\n".join(md) + "\n", encoding="utf8")
    raw = {"bookId": book, "part": str(part), "torah": str(torah), "title": title, "hebrewTitle": hebrew_title,
           "sourceUrl": source_url, "plainUrl": plain_url, "sourceQualification": credit,
           "sourcePublication": publication, "segments": segments}
    if multi:
        raw.update(readerTransportVersion=2, sourcePublications=data.get("sourcePublications", []))
    (output / "index.json").write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} — Plain Text</title><link rel="canonical" href="https://ajew.org{html.escape(canonical, quote=True)}">
<link rel="alternate" type="text/plain" href="{plain_url}index.txt"><link rel="alternate" type="text/markdown" href="{plain_url}index.md"><link rel="alternate" type="application/json" href="{plain_url}index.json">
<style>body{{font:1.05rem/1.75 system-ui,sans-serif;max-width:65rem;padding:1rem;margin:auto;color:#171717;background:white}}.he,.en,p{{white-space:pre-wrap;overflow-wrap:anywhere}}.he{{font-size:1.3rem}}.source-record,.editorial{{border-bottom:1px solid #777;padding:1rem 0;scroll-margin-top:1rem}}.translator-notes{{border-inline-start:3px solid #555;padding:.7rem}}figure{{margin:1rem 0}}img{{max-width:100%;height:auto}}a{{color:#163e80}}</style></head><body>
<header><h1>{html.escape(title)}</h1><p lang="he" dir="rtl">{html.escape(hebrew_title)}</p><p>{html.escape(credit)}</p><nav><a href="{html.escape(canonical, quote=True)}">Human reader</a> · <a href="index.txt">TXT</a> · <a href="index.md">Markdown</a> · <a href="index.json">JSON</a></nav></header>
<nav aria-label="Source contents"><ol>{''.join(toc)}</ol></nav><main>{''.join(rows)}</main></body></html>'''
    (output / "index.html").write_text(page, encoding="utf8")
    return {"bookId": book, "part": str(part), "torah": str(torah), "title": title, "hebrewTitle": hebrew_title,
            "url": plain_url, "sourceUrl": source_url, "segments": len(segments)}


def reading_order(rows, reader_dir):
    """Follow the authenticated LH part-one index, without renumbering routes."""
    index = json.loads((Path(reader_dir) / "likutay-halachos/part-1/index.json").read_text(encoding="utf8"))
    sequence = index.get("sourceReadingSequence")
    if sequence is None:
        return rows
    if not isinstance(sequence, list) or len(set(sequence)) != len(sequence):
        raise ValueError("Invalid LH source reading sequence")
    ranks = {str(number): rank for rank, number in enumerate(sequence)}
    for row in rows:
        if str(row["part"]) == "1" and str(row["torah"]) not in ranks:
            raise ValueError("LH export missing from source reading sequence")
    return sorted(rows, key=lambda row: (str(row["part"]), ranks[str(row["torah"])]
                  if str(row["part"]) == "1" else str(row["torah"])))
