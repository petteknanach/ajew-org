"""Conservative, offline removal of *built* Reader fallback HTML only.

Public API: audit_reader_errors(root) -> list[dict]; prune_reader_errors(dist)
-> receipt dict. Audit accepts arbitrary release directory names and writes
nothing. Mutation accepts only a real directory named ``dist``. Both reject
symlinked traversal; neither reads source JSON nor infers missing translations.

Linux/POSIX descriptor-relative filesystem operations are intentional. Call the
mutator on a quiescent build, before sitemap admission. All candidates and pins
are preflighted before any unlink. This is not a transaction: a later IO error
or concurrent mutation can leave a partial deletion; the exception must abort
the enclosing build. No directories are removed and no survivors are rewritten.
"""
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass, field
import hashlib
from html.parser import HTMLParser
import os
from pathlib import Path
import stat

MAX_ARTIFACT_BYTES = 2 * 1024 * 1024
POLICY_VERSION = 1
# Enumerated from current Reader producers, not a fuzzy "not found" match.
FALLBACK_TITLES = {
    name + ' Not Found | ajew.org': name
    for name in ('Chapter', 'Daf', 'Halacha', 'Letter', 'Mishna', 'Page',
                 'Parsha', 'Section', 'Sicha', 'Siman', 'Tape', 'Topic', 'Torah')
}
FALLBACK_TITLES['Not Found | ajew.org'] = 'Section'
_VOID = frozenset('area base br col embed hr img input link meta param source track wbr'.split())


class UnsafeArtifactError(RuntimeError):
    """Unsafe traversal, unexpected file type, or changed preflight artifact."""


@dataclass
class _Node:
    tag: str
    attrs: list
    children: list = field(default_factory=list)


class _ErrorHTML(HTMLParser):
    """Strict balanced markup and a tiny, explicit main DOM allowlist.

    HTMLParser tokenizes comments/scripts correctly but is not a validator. We
    add strict nesting, document/title/main cardinality, duplicate attribute and
    incomplete-token checks; no browser-style malformed-markup repair is used.
    """
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.main_stack = []
        self.main = None
        self.title = []
        self.counts = dict.fromkeys(('html', 'head', 'body', 'title', 'main'), 0)
        self.bad = False
        self.doctypes = 0

    def handle_starttag(self, tag, attrs):
        if not (self.get_starttag_text() or '').endswith('>'):
            self.bad = True
        if not self.stack and tag != 'html':
            self.bad = True
        if len({k for k, _ in attrs}) != len(attrs):
            self.bad = True
        parent = self.stack[-1] if self.stack else None
        if tag in self.counts:
            self.counts[tag] += 1
            expected = {'html': None, 'head': 'html', 'body': 'html', 'title': 'head'}
            if tag in expected and parent != expected[tag]:
                self.bad = True
        if 'title' in self.stack:
            self.bad = True
        if tag == 'body' and self.counts['head'] != 1:
            self.bad = True
        if tag == 'head' and self.counts['body']:
            self.bad = True
        if tag == 'main':
            if parent != 'body' or self.main is not None:
                self.bad = True
            node = _Node(tag, attrs)
            if self.main_stack:
                self.main_stack[-1].children.append(node)
            self.main = node
            self.main_stack.append(node)
        elif self.main_stack:
            node = _Node(tag, attrs)
            self.main_stack[-1].children.append(node)
            if tag not in _VOID:
                self.main_stack.append(node)
        if tag not in _VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        # Self-closing nonvoid HTML can be interpreted differently by browsers.
        if self.main_stack or tag in self.counts or (tag not in _VOID and 'svg' not in self.stack):
            self.bad = True
        if len({k for k, _ in attrs}) != len(attrs):
            self.bad = True

    def parse_endtag(self, i):
        # HTMLParser otherwise tolerates malformed endings such as </p/>.
        end = self.rawdata.find('>', i)
        if end != -1:
            name = self.rawdata[i + 2:end].rstrip()
            if not name or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_:' for c in name):
                self.bad = True
        return super().parse_endtag(i)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            self.bad = True
            return
        self.stack.pop()
        if self.main_stack:
            if self.main_stack[-1].tag != tag:
                self.bad = True
            else:
                self.main_stack.pop()

    def handle_data(self, text):
        if self.stack and self.stack[-1] == 'title':
            self.title.append(text)
        if self.main_stack:
            self.main_stack[-1].children.append(text)
        # Entity-decoded footer examples may legitimately contain '<'. Main
        # text is independently checked against the exact error DOM below.
        if not self.stack and text.strip():
            self.bad = True
        if '\x00' in text:
            self.bad = True

    def handle_decl(self, decl):
        self.doctypes += 1
        if decl.lower() != 'doctype html' or self.stack or self.counts['html'] or self.doctypes > 1:
            self.bad = True

    def unknown_decl(self, data):
        self.bad = True

    def handle_pi(self, data):
        self.bad = True


def _children(node):
    return [c for c in node.children if not isinstance(c, str) or c.strip()]


def _attrs(node, expected):
    attrs = dict(node.attrs)
    for key, value in attrs.items():
        if key.startswith('data-astro-cid-') and value in (None, ''):
            continue
        if key not in expected or value != expected[key]:
            return False
    return all(attrs.get(k) == v for k, v in expected.items())


def _text(node):
    if any(not isinstance(c, str) for c in node.children):
        return None
    return ''.join(node.children).strip()


def _classify(data, unit):
    # Cheap literal byte prefilter; complete strict UTF-8 parsing follows for
    # possible fallbacks. Entity-encoded/novel titles are intentionally kept.
    if b'Not Found | ajew.org' not in data:
        return None
    try:
        text = data.decode('utf-8', errors='strict')
    except UnicodeDecodeError:
        return None
    parser = _ErrorHTML()
    try:
        parser.feed(text)
        # close() can silently discard a pending '<broken' token at EOF.
        if parser.rawdata:
            parser.bad = True
        parser.close()
    except (ValueError, AssertionError, RecursionError):
        return None
    if (parser.bad or parser.stack or parser.rawdata or
            any(n != 1 for n in parser.counts.values())):
        return None
    title = ''.join(parser.title)
    if title not in FALLBACK_TITLES:
        return None
    main = parser.main
    if not _attrs(main, {'id': 'main-content'}):
        return None
    children = _children(main)
    if len(children) != 1 or not isinstance(children[0], _Node):
        return None
    div = children[0]
    # The actual template uses this exact style; synthetic minimal equivalents
    # may omit it. Classes, reader data, event handlers and extra attrs reject.
    if div.tag != 'div':
        return None
    div_expected = {'style': 'text-align: center; padding: 80px 20px;'} if 'style' in dict(div.attrs) else {}
    if not _attrs(div, div_expected):
        return None
    children = _children(div)
    if len(children) != 2 or any(not isinstance(c, _Node) for c in children):
        return None
    heading, paragraph = children
    if heading.tag != 'h1' or paragraph.tag != 'p' or not _attrs(heading, {}) or not _attrs(paragraph, {}):
        return None
    links = _children(paragraph)
    if len(links) != 1 or not isinstance(links[0], _Node):
        return None
    link = links[0]
    if link.tag != 'a' or not _attrs(link, {'href': '/reader'}) or _text(link) != 'Back to Reader':
        return None
    accepted = {f'{FALLBACK_TITLES[title]} {unit} not found'}
    if title == 'Page Not Found | ajew.org':
        accepted.add(f'Page "{unit}" not found')
    if title == 'Not Found | ajew.org':
        accepted.add('Content not found')
    # Deliberately not "Content not available" or qualified-source hold text.
    if _text(heading) not in accepted:
        return None
    return {'title': title, 'heading': _text(heading)}


def _dir_identity(st):
    return (st.st_dev, st.st_ino, st.st_mode)


def _file_identity(st):
    return (st.st_dev, st.st_ino, st.st_mode, st.st_size, st.st_mtime_ns,
            st.st_ctime_ns, st.st_nlink)


@contextmanager
def _directory(parent_fd, name):
    fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent_fd)
    try:
        yield fd
    finally:
        os.close(fd)


@contextmanager
def _root(root, mutating=False):
    root = Path(root)
    if '..' in root.parts:
        raise UnsafeArtifactError('Parent traversal is not permitted')
    absolute = Path(os.path.abspath(root))
    if mutating and absolute.name != 'dist':
        raise UnsafeArtifactError('Mutation requires a directory named dist')
    # Walk from / using descriptors: neither root nor any ancestor is followed
    # through a symlink. Also prevents an intermediate symlink escaping scope.
    from contextlib import ExitStack
    with ExitStack() as stack:
        fd = stack.enter_context(_directory(None, absolute.anchor))
        for part in absolute.parts[1:]:
            fd = stack.enter_context(_directory(fd, part))
        yield absolute, fd


def _entries(fd):
    with os.scandir(fd) as entries:
        return sorted((entry.name, entry.stat(follow_symlinks=False)) for entry in entries)


def _candidate_paths(root_fd):
    """Only reader/<book>/<ASCII numeric part>/<unit>/index.html.

    Do not follow links even for enumeration. A symlink in a structurally
    relevant subtree is an error, not a silent skip during mutation.
    """
    try:
        reader_stat = os.stat('reader', dir_fd=root_fd, follow_symlinks=False)
    except FileNotFoundError:
        return []
    if not stat.S_ISDIR(reader_stat.st_mode):
        raise UnsafeArtifactError('reader is not a real directory')
    result = []
    def walk(fd, parts, level):
        for name, st in _entries(fd):
            if level == 1 and not (name.isascii() and name.isdecimal()):
                continue
            if level == 3:
                if name != 'index.html':
                    continue
                if not stat.S_ISREG(st.st_mode):
                    raise UnsafeArtifactError('Nonregular candidate: ' + '/'.join(parts + (name,)))
                result.append(parts + (name,))
                continue
            if stat.S_ISLNK(st.st_mode):
                raise UnsafeArtifactError('Symlink parent: ' + '/'.join(parts + (name,)))
            if not stat.S_ISDIR(st.st_mode):
                continue
            with _directory(fd, name) as child:
                walk(child, parts + (name,), level + 1)
    with _directory(root_fd, 'reader') as fd:
        walk(fd, ('reader',), 0)
    return result


@contextmanager
def _parent(root_fd, parts):
    from contextlib import ExitStack
    with ExitStack() as stack:
        fd = root_fd
        pins = [_dir_identity(os.fstat(root_fd))]
        for part in parts[:-1]:
            fd = stack.enter_context(_directory(fd, part))
            pins.append(_dir_identity(os.fstat(fd)))
        yield fd, tuple(pins)


def _read_pinned(root_fd, parts):
    with _parent(root_fd, parts) as (parent, dirs):
        fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
        try:
            before = os.fstat(fd)
            if not stat.S_ISREG(before.st_mode):
                raise UnsafeArtifactError('Nonregular candidate: ' + '/'.join(parts))
            if before.st_size > MAX_ARTIFACT_BYTES:
                return None
            chunks, count = [], 0
            while count <= MAX_ARTIFACT_BYTES:
                chunk = os.read(fd, min(65536, MAX_ARTIFACT_BYTES + 1 - count))
                if not chunk:
                    break
                chunks.append(chunk)
                count += len(chunk)
            data = b''.join(chunks)
            after = os.fstat(fd)
            current = os.stat(parts[-1], dir_fd=parent, follow_symlinks=False)
            if (_file_identity(before) != _file_identity(after) or
                    _file_identity(before) != _file_identity(current) or len(data) != before.st_size):
                raise UnsafeArtifactError('Artifact changed during read: ' + '/'.join(parts))
            if count > MAX_ARTIFACT_BYTES:
                return None
            return data, (_file_identity(before), dirs)
        finally:
            os.close(fd)


def _audit(root_fd):
    paths = _candidate_paths(root_fd)
    admitted = []
    for parts in paths:
        read = _read_pinned(root_fd, parts)
        if read is None:
            continue
        data, pin = read
        classified = _classify(data, parts[-2])
        if classified is not None:
            record = dict(path='/'.join(parts), url='/' + '/'.join(parts[:-1]) + '/',
                          size=len(data), sha256=hashlib.sha256(data).hexdigest(), **classified)
            admitted.append((parts, record, pin))
    return paths, admitted


def _check_pin(root_fd, artifact):
    parts, record, pin = artifact
    read = _read_pinned(root_fd, parts)
    if read is None or read[1] != pin or hashlib.sha256(read[0]).hexdigest() != record['sha256']:
        raise UnsafeArtifactError('Preflight pin drift: ' + record['path'])


def _preflight(root_fd, paths, admitted):
    if _candidate_paths(root_fd) != paths:
        raise UnsafeArtifactError('Candidate inventory changed during audit')
    for artifact in admitted:
        _check_pin(root_fd, artifact)


def audit_reader_errors(root: Path):
    """Return JSON-serializable admitted records; never write into the root.

    Oversize, invalid UTF-8, novel or ambiguous HTML is preserved, not admitted.
    Unsafe filesystem traversal raises rather than producing a partial audit.
    """
    with _root(root) as (_, fd):
        return [record for _, record, _ in _audit(fd)[1]]


def prune_reader_errors(dist: Path):
    """Preflight all deletions, then unlink pinned errors from a private dist.

    Raises on unsafe paths or drift. Exceptions must fail the parent build;
    never continue sitemap admission after an exception, even if some earlier
    unlink operations succeeded. No source/corpus/English availability tests.
    """
    with _root(dist, mutating=True) as (absolute, fd):
        paths, admitted = _audit(fd)
        _preflight(fd, paths, admitted)
        # Reopening root proves that the lexical target still names this tree.
        root_pin = _dir_identity(os.fstat(fd))
        removed = []
        for artifact in admitted:
            parts, record, pin = artifact
            with _root(absolute, mutating=True) as (_, current_fd):
                if _dir_identity(os.fstat(current_fd)) != root_pin:
                    raise UnsafeArtifactError('Build root changed')
                _check_pin(current_fd, artifact)  # full hash immediately before unlink
                with _parent(current_fd, parts) as (parent, dirs):
                    current = os.stat(parts[-1], dir_fd=parent, follow_symlinks=False)
                    if dirs != pin[1] or _file_identity(current) != pin[0]:
                        raise UnsafeArtifactError('Unlink pin drift: ' + record['path'])
                    os.unlink(parts[-1], dir_fd=parent)
                    try:
                        os.stat(parts[-1], dir_fd=parent, follow_symlinks=False)
                    except FileNotFoundError:
                        pass
                    else:
                        raise UnsafeArtifactError('Artifact still present after unlink')
            removed.append(record)
        return dict(root=str(absolute), policy_version=POLICY_VERSION,
                    max_artifact_bytes=MAX_ARTIFACT_BYTES, candidate_count=len(paths),
                    removed_count=len(removed), bytes_removed=sum(r['size'] for r in removed),
                    removed=removed)
