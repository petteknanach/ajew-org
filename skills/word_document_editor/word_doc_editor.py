"""
Main word document editor with natural language instruction support.
"""
import re
import os
from docx_utils import (
    create_document, add_heading, add_paragraph, add_list, add_table, add_image, save_document
)


class WordDocumentEditor:
    def __init__(self, title="", author=""):
        self.doc = create_document(title=title, author=author)
        self.history = []

    def execute(self, instruction):
        """Execute a natural language instruction to modify the document."""
        instruction = instruction.strip()
        if not instruction:
            return

        # Save state for undo
        self.history.append({"doc": self.doc, "instruction": instruction})

        # Heading: "Add heading level 1: My Title" or "Heading 1: My Title"
        m = re.match(r".*?heading\s+level?\s*(\d+)[:\s]+(.+)$", instruction, re.I)
        if m:
            level = int(m.group(1))
            text = m.group(2)
            add_heading(self.doc, text, level=level)
            return f"Added heading level {level}: {text}"

        # Paragraph: "Add paragraph: Some text here"
        m = re.match(r"add paragraph[:\s]+(.+)$", instruction, re.I)
        if m:
            text = m.group(1)
            add_paragraph(self.doc, text)
            return f"Added paragraph: {text}"

        # Bold paragraph: "Make bold: Some text"
        m = re.match(r"make bold[:\s]+(.+)$", instruction, re.I)
        if m:
            text = m.group(1)
            add_paragraph(self.doc, text, bold=True)
            return f"Added bold paragraph: {text}"

        # Italic: "Make italic: Some text"
        m = re.match(r"make italic[:\s]+(.+)$", instruction, re.I)
        if m:
            text = m.group(1)
            add_paragraph(self.doc, text, italic=True)
            return f"Added italic paragraph: {text}"

        # List: "Create bullet list: item1; item2; item3"
        m = re.match(r"create (?:bullet|numbered) list[:\s]+(.+)$", instruction, re.I)
        if m:
            items = [i.strip() for i in m.group(1).split(";")]
            list_type = "bullet" if "bullet" in instruction.lower() else "number"
            add_list(self.doc, items, list_type=list_type)
            return f"Added list with {len(items)} items"

        # Table: "Create table 2x3 with data: a,b,c; d,e,f"
        m = re.match(r"create table (\d+)x(\d+)(?: with data[:\s]+(.+))?$", instruction, re.I)
        if m:
            rows, cols = int(m.group(1)), int(m.group(2))
            data_str = m.group(3) or ""
            data = []
            if data_str:
                for row in data_str.split(";"):
                    data.append([c.strip() for c in row.split(",")])
            add_table(self.doc, rows, cols, data)
            return f"Added table {rows}x{cols}"

        # Image: "Insert image: /path/to/image.png"
        m = re.match(r"insert image[:\s]+(.+)$", instruction, re.I)
        if m:
            path = m.group(1).strip("'\"").strip('"')
            add_image(self.doc, path)
            return f"Inserted image: {path}"

        # Save: "Save as: /path/to/file.docx"
        m = re.match(r"save as[:\s]+(.+)$", instruction, re.I)
        if m:
            path = m.group(1).strip("'\"").strip('"')
            result = save_document(self.doc, path)
            return f"Document saved to: {result}"

        # Unknown instruction
        return f"Unknown instruction: {instruction}"

    def undo(self):
        """Undo the last operation."""
        if self.history:
            self.doc = self.history.pop()
            return "Undid last operation"
        return "Nothing to undo"

    def get_document(self):
        return self.doc
