"""
Example usage of the Word Document Editor skill.
"""
import sys
sys.path.insert(0, '/workspace/.openclaw/workspace/ajew-org/skills/word_document_editor')

from word_doc_editor import WordDocumentEditor

# Create editor with title and author
editor = WordDocumentEditor(title="My Teaching Notes", author="Simcha Nanach")

# Execute natural language instructions
instructions = [
    "Add heading level 1: Introduction",
    "Add paragraph: Welcome to the teachings of Rebbe Nachman.",
    "Create bullet list: item1; item2; item3",
    "Create table 2x2 with data: Name,Value; Test1,100; Test2,200",
    "Add paragraph: This is a bold statement.",
    "Make bold: Important teaching",
    "Save as: /tmp/my_document.docx",
]

for instr in instructions:
    result = editor.execute(instr)
    print(f"✓ {result}")

print("\nDocument created successfully at /tmp/my_document.docx")
