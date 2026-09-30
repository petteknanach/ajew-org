#!/usr/bin/env python3
"""Generate COLR-v0 vowel glyph alternates, retaining original OpenType anchors.
No Unicode/PUA substitution or text run split. ss01=na, ss02=qk,
ss03=qb, ss04=meteg. A feature applies to the intact base+marks cluster;
ONLY the substituted vowel outline has color, consonants keep currentColor.
Derived Taamey Frank CLM: GPL-2 + document embedding exception is retained.
The unmodified font and this complete transformation are distributed together.
"""
import base64
import copy
import io
import json
from array import array
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot
from fontTools.colorLib.builder import buildCOLR, buildCPAL
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
from fontTools.ttLib.tables.ttProgram import Program

ROOT = Path(__file__).resolve().parents[1]
PALETTES = {
    'day': ['00665b','a12e25','834800','6944aa'],
    'sepia': ['006054','9b241f','713e00','613995'],
    'night': ['65ded0','ffaba2','ffd080','c7afff'],
}


def make_font(theme):
    f = TTFont(ROOT/'public/fonts/TaameyFrankCLM-Medium.ttf', recalcTimestamp=False)
    f['head'].modified = f['head'].created
    original_order = list(f.getGlyphOrder())
    definitions = [('ss01', ['sheva','finalkafsheva'], 0), ('ss02', ['qamats','qamatsqatan','finalkafqamats'], 1), ('ss03', ['qamats','qamatsqatan','finalkafqamats'], 2), ('ss04', ['meteg','hatafsegol_meteg','hatafpatah_meteg','hatafqamats_meteg'], 3)]
    copies, colors, substitutions = {}, {}, {}
    extra_layers = []
    def contours(name):
        coords, ends, flags = f['glyf'][name].getCoordinates(f['glyf'])
        start = 0; result = []
        for end in ends:
            result.append((list(coords[start:end+1]), list(flags[start:end+1])))
            start = end+1
        return result
    def signature(contour):
        coords, flags = contour
        x0, y0 = min(x for x,y in coords), min(y for x,y in coords)
        return sorted((x-x0,y-y0,flag) for (x,y),flag in zip(coords,flags))
    def layer(name, parts, old):
        glyph = Glyph(); glyph.numberOfContours = len(parts)
        glyph.coordinates = GlyphCoordinates([xy for coords,flags in parts for xy in coords])
        glyph.flags = array('B',[fl for coords,flags in parts for fl in flags])
        glyph.endPtsOfContours = []; count = 0
        for coords,flags in parts:
            count += len(coords); glyph.endPtsOfContours.append(count-1)
        glyph.program = Program(); glyph.program.fromBytecode([])
        f['glyf'][name] = glyph
        glyph.recalcBounds(f['glyf'])
        advance, bearing = f['hmtx'].metrics[old]
        # Paint-layer bearings must follow their own outline bounds. Keeping
        # the source LSB on wider ink makes Blink translate it horizontally by
        # (old.xMin-new.xMin), despite identical HarfBuzz shaping offsets.
        # Preserve the source bearing-to-outline relation; only non-shaping
        # COLR layers get this derived bearing. Original/alternate metrics stay.
        f['hmtx'].metrics[name] = (advance, glyph.xMin + bearing - f['glyf'][old].xMin)
        extra_layers.append(name)
        return name
    def enlarged(parts, tag):
        # Paint expansion ONLY: keep shaping glyphs, advances and GPOS anchors.
        # Sheva is TWO fat dots: enlarge about each original dot's center,
        # retaining both dot centers and their original separation.
        # Qatan expands about the original mark's center as one outline.
        if tag not in ('ss01', 'ss02'): return parts
        sx, sy = (1.8, 1.4) if tag == 'ss01' else (1.5, 1.5)
        all_coords = [xy for coords, flags in parts for xy in coords]
        result = []
        for coords, flags in parts:
            reference = coords if tag == 'ss01' else all_coords
            cx = (min(x for x,y in reference) + max(x for x,y in reference))/2
            cy = (min(y for x,y in reference) + max(y for x,y in reference))/2
            result.append(([(round(cx+(x-cx)*sx), round(cy+(y-cy)*sy)) for x,y in coords], flags))
        return result
    for tag, originals, color in definitions:
        substitutions[tag] = {}
        for old in originals:
            new = old+'.tikun.'+tag
            f['glyf'][new] = copy.deepcopy(f['glyf'][old])
            f['hmtx'].metrics[new] = f['hmtx'].metrics[old]
            copies.setdefault(old, []).append(new)
            substitutions[tag][old] = new
            if old in ['sheva','qamats','qamatsqatan','meteg']:
                ink = layer(new+'.ink', enlarged(contours(old), tag), old) if tag in ('ss01','ss02') else old
                colors[new] = [(ink, color)]
            else:
                # ccmp ligatures may contain BOTH a consonant/vowel and a
                # target mark. Split existing contours, not text, by exact
                # translated-outline equality. Never color the whole ligature.
                target = {'ss01':'sheva','ss02':'qamats','ss03':'qamats','ss04':'meteg'}[tag]
                targets = [signature(c) for c in contours(target)]
                marked, unmarked = [], []
                for c in contours(old):
                    (marked if signature(c) in targets else unmarked).append(c)
                assert len(marked) == len(targets) and unmarked, (old, 'cannot isolate vowel contours')
                colors[new] = [(layer(new+'.base',unmarked,old),0xffff), (layer(new+'.ink',enlarged(marked,tag),old),color)]
    f.setGlyphOrder(original_order + list(colors) + extra_layers)
    f['maxp'].numGlyphs = len(f.getGlyphOrder())
    # All new mark glyphs inherit every attachment/class/position of their
    # source. Coverage ordering and record indexing must change in lockstep.
    seen = set()
    def extend_coverage(cov, records=None):
        if id(cov) in seen: return
        seen.add(id(cov))
        old = list(cov.glyphs)
        pairs = [(name, copy.deepcopy(records[i]) if records is not None else None) for i,g in enumerate(old) for name in copies.get(g, [])]
        pairs.sort(key=lambda item: f.getGlyphID(item[0]))
        cov.glyphs.extend(name for name, _ in pairs)
        if records is not None: records.extend(rec for _,rec in pairs)
    def walk(obj):
        if isinstance(obj, list):
            for v in obj: walk(v)
        elif hasattr(obj, '__dict__'):
            if isinstance(obj, ot.Coverage): extend_coverage(obj); return
            if isinstance(obj, ot.ClassDef):
                for old, news in copies.items():
                    if old in obj.classDefs:
                        for new in news: obj.classDefs[new] = obj.classDefs[old]
                return
            for cv, arr, rec, count in [
                ('MarkCoverage','MarkArray','MarkRecord','MarkCount'),
                ('Mark1Coverage','Mark1Array','MarkRecord','MarkCount'),
                ('Mark2Coverage','Mark2Array','Mark2Record','Mark2Count'),
            ]:
                if hasattr(obj, cv):
                    records = getattr(getattr(obj, arr), rec)
                    extend_coverage(getattr(obj, cv), records)
                    setattr(getattr(obj, arr), count, len(records))
            if isinstance(obj, ot.SinglePos) and obj.Format == 2:
                extend_coverage(obj.Coverage, obj.Value); obj.ValueCount = len(obj.Value)
            for value in list(obj.__dict__.values()): walk(value)
    walk(f['GPOS'].table)
    walk(f['GDEF'].table)
    # Custom feature lookups are appended after original shaping substitutions.
    gsub = f['GSUB'].table
    old_records = list(gsub.FeatureList.FeatureRecord)
    for tag, mapping in substitutions.items():
        sub = ot.SingleSubst(); sub.mapping = mapping
        lookup = ot.Lookup(); lookup.LookupType = 1; lookup.LookupFlag = 0; lookup.SubTable = [sub]; lookup.SubTableCount = 1
        index = len(gsub.LookupList.Lookup); gsub.LookupList.Lookup.append(lookup)
        feature = ot.FeatureRecord(); feature.FeatureTag = tag; feature.Feature = ot.Feature()
        feature.Feature.FeatureParams = None; feature.Feature.LookupListIndex = [index]; feature.Feature.LookupCount = 1
        gsub.FeatureList.FeatureRecord.append(feature)
    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
    gsub.FeatureList.FeatureRecord.sort(key=lambda r:r.FeatureTag)
    gsub.FeatureList.FeatureCount = len(gsub.FeatureList.FeatureRecord)
    tag_index = {r.FeatureTag:i for i,r in enumerate(gsub.FeatureList.FeatureRecord)}
    for script in gsub.ScriptList.ScriptRecord:
        systems = ([script.Script.DefaultLangSys] if script.Script.DefaultLangSys else []) + [r.LangSys for r in script.Script.LangSysRecord]
        for system in systems:
            if system.ReqFeatureIndex != 65535: system.ReqFeatureIndex = tag_index[old_records[system.ReqFeatureIndex].FeatureTag]
            system.FeatureIndex = sorted([tag_index[old_records[i].FeatureTag] for i in system.FeatureIndex] + [tag_index[t] for t in substitutions])
            system.FeatureCount = len(system.FeatureIndex)
    f['COLR'] = buildCOLR(colors, version=0, glyphMap=f.getReverseGlyphMap())
    rgba = [tuple(int(h[i:i+2],16)/255 for i in (0,2,4)) + (1.,) for h in PALETTES[theme]]
    f['CPAL'] = buildCPAL([rgba])
    # Separate family prevents collisions with unmodified app fonts.
    for n in f['name'].names:
        if n.nameID in [1,3,4,6,16]:
            n.string = (('TikunVowels-'+theme) if n.nameID == 6 else ('Tikun Vowels '+theme)).encode(n.getEncoding())
    b = io.BytesIO(); f.save(b); return b.getvalue()


def main():
    for theme in PALETTES:
        data=make_font(theme)
        path=ROOT/f'public/fonts/tikkun/TikunVowels-{theme}.ttf'
        path.write_bytes(data)
        print(theme,len(data))
if __name__=='__main__':main()
