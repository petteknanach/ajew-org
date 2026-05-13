import importlib
import sys
import os

# Ensure the current directory is in sys.path for relative module imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

# Import modules
import docx_utils
from word_doc_editor import WordDocumentEditor

__all__ = [
    "WordDocumentEditor",
    "docx_utils",
]
