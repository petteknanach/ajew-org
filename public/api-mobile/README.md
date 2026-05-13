# Mobile API for Ajew Ananach

## Overview
Mobile-optimized API structure for Breslov Torah content, designed for efficient mobile app consumption.

## Structure

### File Naming Convention
- `metadata.json` - API metadata and configuration
- `search-index.json` - Optimized search index for mobile
- `batch-example.json` - Example of batch request/response
- `likutay-moharan/part-1/index.json` - Part index with chapter listings
- `likutay-moharan/part-1/torah-{n}.json` - Individual Torah teachings

### Field Abbreviations (for mobile optimization)
- `id` - Unique identifier
- `n` - Number (torah number)
- `t` - Title (English)
- `ht` - Hebrew title
- `b` - Book code (lm = likutay-moharan)
- `p` - Part number
- `kv` - Key verse (English reference)
- `hkv` - Hebrew key verse
- `tr` - Translation of key verse
- `d` - Date delivered
- `l` - Location
- `o` - Occasion
- `th` - Themes array
- `kw` - Keywords array (Hebrew)
- `s` - Simanim array (sections)
  - `n` - Siman number
  - `t` - Title
  - `ht` - Hebrew title
  - `sum` - Summary
  - `kc` - Key concepts array
  - `src` - Sources array
- `st` - Structure
  - `ts` - Total simanim
  - `ms` - Main sections
  - `c` - Has conclusion
- `nav` - Navigation
  - `prev` - Previous torah ID
  - `next` - Next torah ID
- `v` - Version
- `lu` - Last updated

## Search Index Format
The search index (`search-index.json`) is optimized for mobile with:
- Minimal field set for searching
- Pre-computed relevance weights
- Compact document format
- Support for fuzzy matching

## Batch API
For mobile efficiency, use batch requests to fetch multiple documents in one call:
- Request format: `{ids: ["id1", "id2"], fields: ["t", "ht", "sum"], minified: true}`
- Response includes pagination support
- Reduces HTTP overhead

## Performance Optimizations
1. **Field minimization** - Short field names reduce payload size
2. **Batch requests** - Multiple documents in single call
3. **Search optimization** - Pre-built index with weights
4. **Compression** - All responses support gzip/brotli
5. **Caching** - Static content has long cache times

## Content Coverage
Currently includes:
- Likutay Moharan Part 1, Torahs 1-10
- Complete mobile-optimized structure
- Search index for all content
- Batch API example

## Next Steps
1. Add Torahs 11-60 for Part 1 completion
2. Add Part 2 content
3. Add other books (Sippurei Maasiyos, Sefer Hamidos, etc.)
4. Implement actual API endpoints
5. Add user progress tracking
6. Add offline support documentation