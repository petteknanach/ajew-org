---
category: document-processing
name: word_document_editor
description: A skill for creating and editing .docx Word documents from natural language instructions.
---

# Word Document Editor Skill

A skill for creating and editing `.docx` Word documents from natural language instructions.

## Description
This skill provides tools to generate and modify `.docx` documents programmatically using natural language commands. It leverages `python-docx` for document creation/editing and integrates with the existing `scripts/` workflow.

## Usage
- Create new documents from templates or from scratch
- Add/modify paragraphs, headings, lists, and tables
- Apply basic formatting (bold, italic, font size, color)
- Insert images and page breaks
- Save/export documents in `.docx` format

## Examples
```python
import sys
sys.path.insert(0, '/workspace/.openclaw/workspace/ajew-org')
from skills.word_document_editor.word_doc_editor import WordDocumentEditor

editor = WordDocumentEditor(title="My Notes", author="Author")
editor.execute("Add heading level 1: Introduction")
editor.execute("Add paragraph: Welcome to the teachings.")
editor.execute("Create bullet list: item1; item2; item3")
editor.execute("Save as: output.docx")
```

## Files
- `word_doc_editor.py` — main editor class with `execute(instruction)` method
- `docx_utils.py` — helper utilities for common document operations
- `__init__.py` — package initializer with proper imports
- `examples/basic_usage.py` — usage example

## Environment
Requires `python-docx` (installed) and `typing_extensions` (installed).

## Supported Commands
- `Add heading level N: <text>`
- `Add paragraph: <text>`
- `Make bold: <text>`
- `Make italic: <text>`
- `Create bullet/numbered list: item1; item2; ...`
- `Create table RxC with data: a,b,c; d,e,f; ...`
- `Insert image: /path/to/image.png`
- `Save as: /path/to/file.docx`

## Import Notes
The skill must be used by adding its directory to `sys.path` directly, as it uses sibling module imports that require the skills directory to be on the Python path.
