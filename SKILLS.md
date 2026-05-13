# Project Skills Registry

## Available Skills

### likutay-halachos-commentary
- **Purpose**: Structured, file-based commentary for Likutey Halachos (English + Hebrew) with stable permalinks and explicit source attribution (Rimzay Maaseyos, Likutay Nanach Vol4).
- **Conventions**:
  - Use static markdown files in `public/teachings/likutay-halachos/commentary/{vol-N}/`.
  - YAML frontmatter required: title, volume, series, lang (en/he), parshiyos (optional), date, sources.
  - Prefer checklist-style placeholders ([ ]) for practical halachos to enable incremental filling.
  - Include cross-reference section linking related series (Likutay Moharan, Tefilos, Eitzos).
  - Maintain bilingual support: separate lang files or explicit lang field; include Hebrew notes placeholder.
- **Build / PDF notes**: TeX Live at `C:\Users\Pettek\texlive\2026\bin\windows`; set in build-config.json when compiling PDFs.
- **Indexing**: Update `public/teachings/commentary-index/teachings-with-commentary.md` to track status and badges.
- **Reusable approach**: Can be applied to subsequent volumes and other Nach series (e.g., Likutay Tefilos) by copying structure and replacing content.
- **Version control**: All changes are file-based; ensure git commits align with release tags for permalinks.

## Default Skills

### word_document_editor
- **Purpose**: Create/edit .docx Word documents via natural language instructions
- **Location**: `skills/word_document_editor/`
- **Install**: `pip install python-docx --user` (done)
- **Usage**: `WordDocumentEditor.execute("Add heading level 1: Title")` etc.
- **Commands**: headings, paragraphs, bold/italic, lists, tables, images, save