# Alignment Verification Log v2

## Status: IN PROGRESS
Each book verified paragraph-by-paragraph and fixed.

## Method
1. Read HTML source file and reader JSON side by side
2. Match each English paragraph to its corresponding Hebrew segment
3. Use section headings, verse references, and Hebrew keywords as anchors
4. Verify first and last segments of each file match content

## LM Torah 11
- **Segs 0-11: CORRECT** - ois sections properly aligned
- **Segs 12-14: MISALIGNED** - English shifted by 1 position
  - Fix: seg 12 EN → seg 13, seg 13 EN → seg 14, seg 14 EN → append to seg 13
- **Status: NEEDS FIX**

## LM Torah 12-17
- **Status: NEEDS VERIFICATION**

## Nachas Hashulchan (4 files)
- **ALL FILES SEVERELY MISALIGNED**
- English is a continuous stream, not matched to Hebrew segments
- Title-page text mixed into content segments
- **Status: NEEDS COMPLETE REDO**

## Zimras HaAretz (3 files)
- **ALL FILES SEVERELY MISALIGNED**
- Same root cause: continuous English stream distributed without content matching
- **Status: NEEDS COMPLETE REDO**

## Yikara diShabata (4 files)
- **ALL FILES SEVERELY MISALIGNED**
- **Status: NEEDS COMPLETE REDO**

## Yerech HaAisunim (24 files)
- **ALL FILES SEVERELY MISALIGNED**
- Title-page, TOC, and translator notes mixed in
- English offset grows progressively
- **Status: NEEDS COMPLETE REDO**

## Parparaos LaChuchmuh (135 files)
- **Status: NEEDS VERIFICATION**

## Kuntrass Hatzairufim (23 files)
- **Status: NEEDS VERIFICATION**

## R' Nosson Letters (188 files)
- **Status: NEEDS VERIFICATION**
