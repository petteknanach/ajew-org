"""Stdlib offline tests. Set READER_SOFT404_TEST_SCRATCH and optionally
READER_SOFT404_SAMPLE_MANIFEST. No fixture is ever created in system /tmp.
Run with PYTHONDONTWRITEBYTECODE=1 to leave the source tree unmodified.
"""
import hashlib
import json
import os
import errno
import stat
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import reader_soft404_artifacts as subject


def document(title='Torah Not Found | ajew.org', heading='Torah 7 not found',
             main=None, before='', after=''):
    if main is None:
        main = ('<main id="main-content"><div><h1>' + heading + '</h1>'
                '<p><a href="/reader">Back to Reader</a></p></div></main>')
    return ('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title +
            '</title></head><body>' + before + main + after + '</body></html>').encode('utf-8')


def snapshot(root):
    return {str(p.relative_to(root)): (p.read_bytes(), p.stat().st_mtime_ns)
            for p in root.rglob('*') if p.is_file() and not p.is_symlink()}


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        scratch = os.environ.get('READER_SOFT404_TEST_SCRATCH')
        if not scratch:
            self.fail('Set READER_SOFT404_TEST_SCRATCH to an owned scratch directory')
        self.temp = tempfile.TemporaryDirectory(prefix='case-', dir=scratch)
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.dist = self.base / 'dist'
        self.dist.mkdir()

    def put(self, data=None, route='reader/book/1/7/index.html', root=None):
        target = (root or self.dist) / route
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(document() if data is None else data)
        return target

    def assertKept(self, data):
        path = self.put(data)
        before = snapshot(self.dist)
        self.assertEqual(subject.audit_reader_errors(self.dist), [])
        self.assertEqual(subject.prune_reader_errors(self.dist)['removed_count'], 0)
        self.assertEqual(snapshot(self.dist), before)
        self.assertTrue(path.exists())

    def test_basic_receipt_hash_size_and_idempotence(self):
        path = self.put()
        data = path.read_bytes()
        receipt = subject.prune_reader_errors(self.dist)
        self.assertEqual(receipt['removed_count'], 1)
        self.assertEqual(receipt['candidate_count'], 1)
        self.assertEqual(receipt['bytes_removed'], len(data))
        self.assertEqual(receipt['removed'][0]['sha256'], hashlib.sha256(data).hexdigest())
        self.assertFalse(path.exists())
        self.assertTrue(path.parent.is_dir())
        self.assertEqual(subject.prune_reader_errors(self.dist)['removed_count'], 0)
        json.dumps(receipt)

    def test_all_finite_titles_and_matching_headings(self):
        for title, kind in subject.FALLBACK_TITLES.items():
            with self.subTest(title=title):
                data = document(title=title, heading=f'{kind} 7 not found')
                self.assertIsNotNone(subject._classify(data, '7'))

    def test_slug_units_and_quoted_page_heading(self):
        self.assertIsNotNone(subject._classify(document(heading='Torah intro not found'), 'intro'))
        self.assertIsNotNone(subject._classify(document(title='Page Not Found | ajew.org',
                                                        heading='Page "intro" not found'), 'intro'))
        self.assertIsNone(subject._classify(document(heading='Torah 8 not found'), '7'))

    def test_comments_cannot_forge_main_or_title(self):
        fake = '<!-- <main id="main-content"><h1>fake</h1></main><title>fake</title> -->'
        self.put(document(before=fake, after=fake))
        self.assertEqual(len(subject.audit_reader_errors(self.dist)), 1)
        self.assertEqual(subject.prune_reader_errors(self.dist)['removed_count'], 1)

    def test_observed_profile_labels_slug_loader_errors_and_extra_book_link(self):
        for unit in ('preface-section-42', 'manuscript-91'):
            with self.subTest(unit=unit):
                self.assertIsNotNone(subject._classify(document(heading=f'Torah {unit} not found'), unit))
        for kind in ('Parsha', 'Page'):
            with self.subTest(kind=kind):
                self.assertIsNotNone(subject._classify(document(title=f'{kind} Not Found | ajew.org',
                                                                heading=f'{kind} 7 not found'), '7'))
        extra_link = document(title='Section Not Found | ajew.org', heading='Section 7 not found')
        self.assertKept(extra_link.replace(b'<a href="/reader">', b'<a href="/reader/book/1">Book Index</a><a href="/reader">'))

    def test_entity_escaped_footer_tags_are_not_real_main_tags(self):
        self.put(document(after='<p><code>&lt;main&gt;&lt;/main&gt;</code></p>'))
        self.assertEqual(len(subject.audit_reader_errors(self.dist)), 1)

    def test_malformed_endtag_alone_is_preserved(self):
        self.assertKept(document().replace(b'</p>', b'</p/>'))

    def test_only_comment_main_preserved(self):
        data = document(main='<!-- <main id="main-content"><div><h1>Torah 7 not found</h1>'
                        '<p><a href="/reader">Back to Reader</a></p></div></main> -->')
        self.assertKept(data)

    def test_title_only_preserved(self):
        self.assertKept(document(main='<main id="main-content"></main>'))

    def test_extra_text_every_main_position_preserved(self):
        base = document().decode('utf-8')
        for old, new in (('<div>', 'extra<div>'), ('<h1>', 'extra<h1>'),
                         ('<p>', 'extra<p>'), ('<a href', 'extra<a href'),
                         ('</a>', '</a>extra'), ('</div>', '</div>תורה')):
            with self.subTest(position=old):
                self.assertKept(base.replace(old, new).encode('utf-8'))

    def test_main_scripts_reader_markers_and_extra_elements_preserved(self):
        base = document().decode('utf-8')
        variants = [base.replace('</div>', '<script>void 0</script></div>'),
                    base.replace('<div>', '<div class="reader-container">'),
                    base.replace('<div>', '<div data-torah-id="7">'),
                    base.replace('<div>', '<div id="hebrew-content">'),
                    base.replace('<h1>', '<h1 onclick="go()">'),
                    base.replace('</h1>', '<span>תורה</span></h1>'),
                    base.replace('</main>', '<p>content</p></main>')]
        for data in variants:
            with self.subTest(data=data):
                self.assertKept(data.encode('utf-8'))

    def test_malformed_or_ambiguous_markup_preserved(self):
        base = document().decode('utf-8')
        variants = [base.replace('</h1>', ''), base.replace('</div>', ''),
                    base.replace('</main>', ''), base.replace('</html>', ''),
                    base.replace('<div>', '<main id="main-content"><div>'),
                    base.replace('</main>', '</main><main id="main-content"></main>'),
                    base.replace('id="main-content"', 'id="main-content" id="other"'),
                    base.replace('</title>', '</title><title>Torah Not Found | ajew.org</title>'),
                    base.replace('<title>', '<title><b>'),
                    base.replace('<main', '<MAIN_BAD'),
                    base.replace('</p>', '</p/><!-- unterminated'),
                    base.replace('</body>', '<script/>tail</body>'),
                    base.replace('</body>', '<?repair?></body>'),
                    base.replace('</body>', '<![CDATA[bad]]></body>'),
                    base.replace('</html>', '</html><broken')]
        for data in variants:
            with self.subTest(data=data):
                self.assertKept(data.encode('utf-8'))

    def test_unknown_titles_and_title_heading_mismatch_preserved(self):
        for title in ('A Torah Not Found | ajew.org', 'Not Found',
                      'Mystery Not Found | ajew.org', 'Torah Not Found | other.org'):
            with self.subTest(title=title):
                self.assertKept(document(title=title))
        self.assertKept(document(title='Letter Not Found | ajew.org'))

    def test_back_link_is_exact(self):
        for old, new in (('href="/reader"', 'href="/reader/"'),
                         ('href="/reader"', 'href="https://ajew.org/reader"'),
                         ('Back to Reader', 'Back'), ('Back to Reader', '<b>Back to Reader</b>')):
            with self.subTest(new=new):
                self.assertKept(document().replace(old.encode(), new.encode()))

    def test_utf8_complete_decode_and_late_extra_text(self):
        self.assertIsNotNone(subject._classify(document(before='<p>שלום 🌄</p>'), '7'))
        self.assertKept(document(after='<p>שלום</p>')[:-1] + b'\xff')
        self.assertKept(document().replace(b'</div>', b' ' * 100000 + 'תורה'.encode() + b'</div>'))

    def test_reading_bodies_not_found_words_and_empty_english_preserved(self):
        main = ('<main id="main-content"><div class="reader-container">'
                '<h1>Torah 7 not found</h1><div class="hebrew-text">שלום תורה</div>'
                '<div class="english-text"></div><p>Translation not found</p>'
                '<p><a href="/reader">Back to Reader</a></p></div></main>')
        self.assertKept(document(main=main))
        self.assertKept(document(title='Real Reading | ajew.org', main=main))
        self.assertKept(document(main=main.replace('<p>Translation not found</p>', '')))
        self.assertKept(document(main=main.replace('<div class="english-text"></div>', '')))

    def test_source_holds_and_unavailable_text_preserved(self):
        self.assertKept(document(heading='Content not available'))
        self.assertKept(document(heading='Current qualified source selection unavailable'))

    def test_fixed_size_cap_preserves_oversize_and_handles_boundary(self):
        data = document()
        with mock.patch.object(subject, 'MAX_ARTIFACT_BYTES', len(data)):
            self.put(data)
            self.assertEqual(len(subject.audit_reader_errors(self.dist)), 1)
        with mock.patch.object(subject, 'MAX_ARTIFACT_BYTES', len(data) - 1):
            self.assertEqual(subject.prune_reader_errors(self.dist)['removed_count'], 0)

    def test_exact_path_scope_and_raw_formats_survive(self):
        routes = ['reader/book/1/index.html', 'reader/book/x/7/index.html',
                  'reader/book/١/7/index.html', 'reader/book/part-1/7/index.html',
                  'reader/book/1/7/more/index.html', 'reader/book/1/7/raw.html',
                  'elsewhere/book/1/7/index.html', 'reader/book/1/7/data.json',
                  'reader/book/1/7/source.txt', 'reader/book/1/7/source.md',
                  'reader/book/part-1/torah-7.json']
        for route in routes:
            self.put(route=route)
        before = snapshot(self.dist)
        self.assertEqual(subject.prune_reader_errors(self.dist)['removed_count'], 0)
        self.assertEqual(snapshot(self.dist), before)

    def test_audit_arbitrary_immutable_release_name_writes_nothing(self):
        release = self.base / 'release-immutable'
        path = self.put(root=release)
        before = snapshot(release)
        dirs_before = sorted(str(p.relative_to(release)) for p in release.rglob('*'))
        self.assertEqual(len(subject.audit_reader_errors(release)), 1)
        self.assertEqual(snapshot(release), before)
        self.assertEqual(sorted(str(p.relative_to(release)) for p in release.rglob('*')), dirs_before)
        self.assertTrue(path.exists())

    def test_mutator_protected_root_name_and_parent_traversal(self):
        release = self.base / 'release'
        self.put(root=release)
        with self.assertRaises(subject.UnsafeArtifactError):
            subject.prune_reader_errors(release)
        with self.assertRaises(subject.UnsafeArtifactError):
            subject.prune_reader_errors(self.base / 'dist' / '..' / 'dist')
        self.assertEqual(len(subject.audit_reader_errors(release)), 1)

    def test_symlink_root_and_ancestor_refused(self):
        release = self.base / 'release'
        self.put(root=release)
        self.dist.rmdir()
        self.dist.symlink_to(release, target_is_directory=True)
        with self.assertRaises((OSError, subject.UnsafeArtifactError)):
            subject.prune_reader_errors(self.dist)
        alias = self.base / 'alias'
        alias.symlink_to(release, target_is_directory=True)
        self.put(root=release / 'dist')
        with self.assertRaises((OSError, subject.UnsafeArtifactError)):
            subject.prune_reader_errors(alias / 'dist')
        self.assertEqual(len(subject.audit_reader_errors(release)), 1)

    def test_symlink_candidate_escape_preflight_leaves_earlier_error(self):
        first = self.put(route='reader/book/1/1/index.html')
        outside = self.base / 'outside.html'
        outside.write_bytes(document())
        link = self.dist / 'reader/book/1/7/index.html'
        link.parent.mkdir(parents=True)
        link.symlink_to(outside)
        before = outside.read_bytes()
        with self.assertRaises((OSError, subject.UnsafeArtifactError)):
            subject.prune_reader_errors(self.dist)
        self.assertTrue(first.exists())
        self.assertTrue(link.is_symlink())
        self.assertEqual(outside.read_bytes(), before)

    def test_symlink_each_parent_refused(self):
        for route in ('reader', 'reader/book', 'reader/book/1', 'reader/book/1/7'):
            with self.subTest(route=route):
                case = self.base / route.replace('/', '-')
                root = case / 'dist'
                root.mkdir(parents=True)
                outside = case / 'outside'
                outside.mkdir()
                link = root / route
                link.parent.mkdir(parents=True, exist_ok=True)
                link.symlink_to(outside, target_is_directory=True)
                with self.assertRaises((OSError, subject.UnsafeArtifactError)):
                    subject.prune_reader_errors(root)
                self.assertTrue(link.is_symlink())

    def test_nonregular_fifo_and_directory_candidates_refused(self):
        first = self.put(route='reader/book/1/1/index.html')
        path = self.dist / 'reader/book/1/7/index.html'
        path.parent.mkdir(parents=True)
        try:
            os.mkfifo(path)
        except OSError as error:
            if error.errno not in (errno.ENOTSUP, errno.EOPNOTSUPP):
                raise
            # WSL's Windows-backed evidence directory cannot create FIFOs.
            # Exercise the nonregular enumeration guard using a stat fixture;
            # the directory-candidate guard below still runs on real files.
            path.write_bytes(document())
            original = subject._entries
            def fifo_entries(fd):
                entries = original(fd)
                return [(name, os.stat_result((stat.S_IFIFO | 0o600,) + tuple(st)[1:]))
                        if name == 'index.html' else (name, st) for name, st in entries]
            with mock.patch.object(subject, '_entries', side_effect=fifo_entries):
                with self.assertRaises(subject.UnsafeArtifactError):
                    subject.prune_reader_errors(self.dist)
            print('FIFO_TEST: filesystem ENOTSUP; enumeration nonregular guard exercised with mocked FIFO stat')
        else:
            with self.assertRaises((OSError, subject.UnsafeArtifactError)):
                subject.prune_reader_errors(self.dist)
        self.assertTrue(first.exists())
        path.unlink()
        path.mkdir()
        with self.assertRaises((OSError, subject.UnsafeArtifactError)):
            subject.prune_reader_errors(self.dist)
        self.assertTrue(first.exists())

    def test_preflight_second_pin_drift_deletes_nothing(self):
        first = self.put(route='reader/book/1/1/index.html', data=document(heading='Torah 1 not found'))
        second = self.put()
        original = subject._preflight
        def drift(fd, paths, admitted):
            second.write_bytes(b'changed reading body')
            return original(fd, paths, admitted)
        with mock.patch.object(subject, '_preflight', side_effect=drift):
            with self.assertRaises(subject.UnsafeArtifactError):
                subject.prune_reader_errors(self.dist)
        self.assertTrue(first.exists())
        self.assertTrue(second.exists())

    def test_preflight_inventory_drift_deletes_nothing(self):
        first = self.put()
        original = subject._preflight
        def drift(fd, paths, admitted):
            self.put(route='reader/book/1/8/index.html')
            return original(fd, paths, admitted)
        with mock.patch.object(subject, '_preflight', side_effect=drift):
            with self.assertRaises(subject.UnsafeArtifactError):
                subject.prune_reader_errors(self.dist)
        self.assertTrue(first.exists())

    def test_same_size_content_drift_detected_even_with_restored_mtime(self):
        path = self.put()
        original = subject._preflight
        st = path.stat()
        def drift(fd, paths, admitted):
            path.write_bytes(path.read_bytes().replace(b'Torah 7', b'Torah 8'))
            os.utime(path, ns=(st.st_atime_ns, st.st_mtime_ns))
            return original(fd, paths, admitted)
        with mock.patch.object(subject, '_preflight', side_effect=drift):
            with self.assertRaises(subject.UnsafeArtifactError):
                subject.prune_reader_errors(self.dist)
        self.assertTrue(path.exists())

    def test_immediate_unlink_pin_recheck(self):
        path = self.put()
        original = subject._preflight
        def drift_after(fd, paths, admitted):
            original(fd, paths, admitted)
            path.write_bytes(b'a now valid reading page')
        with mock.patch.object(subject, '_preflight', side_effect=drift_after):
            with self.assertRaises(subject.UnsafeArtifactError):
                subject.prune_reader_errors(self.dist)
        self.assertTrue(path.exists())

    def test_parent_swap_after_preflight_refused(self):
        path = self.put()
        outside = self.base / 'outside'
        outside.mkdir()
        original = subject._preflight
        def swap(fd, paths, admitted):
            original(fd, paths, admitted)
            path.parent.rename(path.parent.with_name('original'))
            path.parent.symlink_to(outside, target_is_directory=True)
        with mock.patch.object(subject, '_preflight', side_effect=swap):
            with self.assertRaises((OSError, subject.UnsafeArtifactError)):
                subject.prune_reader_errors(self.dist)
        self.assertTrue(path.parent.with_name('original').joinpath('index.html').exists())

    def test_root_swap_after_preflight_refused(self):
        self.put()
        original = subject._preflight
        def swap(fd, paths, admitted):
            original(fd, paths, admitted)
            self.dist.rename(self.base / 'old-dist')
            self.dist.mkdir()
        with mock.patch.object(subject, '_preflight', side_effect=swap):
            with self.assertRaises(subject.UnsafeArtifactError):
                subject.prune_reader_errors(self.dist)
        self.assertTrue((self.base / 'old-dist/reader/book/1/7/index.html').exists())

    def test_drift_during_complete_read_aborts_before_deletion(self):
        path = self.put()
        original = subject.os.read
        changed = False
        def drifting_read(fd, count):
            nonlocal changed
            chunk = original(fd, count)
            if not changed:
                changed = True
                path.write_bytes(b'replacement reading page')
            return chunk
        with mock.patch.object(subject.os, 'read', side_effect=drifting_read):
            with self.assertRaises(subject.UnsafeArtifactError):
                subject.prune_reader_errors(self.dist)
        self.assertEqual(path.read_bytes(), b'replacement reading page')

    def test_candidate_symlink_swap_after_preflight_refused(self):
        path = self.put()
        outside = self.base / 'outside.html'
        outside.write_bytes(document())
        original = subject._preflight
        def swap(fd, paths, admitted):
            original(fd, paths, admitted)
            path.unlink()
            path.symlink_to(outside)
        with mock.patch.object(subject, '_preflight', side_effect=swap):
            with self.assertRaises((OSError, subject.UnsafeArtifactError)):
                subject.prune_reader_errors(self.dist)
        self.assertTrue(path.is_symlink())
        self.assertEqual(outside.read_bytes(), document())

    def test_post_unlink_drift_raises_not_a_successful_receipt(self):
        first = self.put(route='reader/book/1/1/index.html', data=document(heading='Torah 1 not found'))
        second = self.put()
        original = subject.os.unlink
        def drift_after_unlink(name, *, dir_fd=None):
            original(name, dir_fd=dir_fd)
            second.write_bytes(b'replacement')
        with mock.patch.object(subject.os, 'unlink', side_effect=drift_after_unlink):
            with self.assertRaises(subject.UnsafeArtifactError):
                subject.prune_reader_errors(self.dist)
        self.assertFalse(first.exists())
        self.assertEqual(second.read_bytes(), b'replacement')

    def test_missing_reader_is_noop(self):
        self.assertEqual(subject.audit_reader_errors(self.dist), [])
        self.assertEqual(subject.prune_reader_errors(self.dist)['removed_count'], 0)

    def test_actual_six_saved_pages_and_survivor_byte_conservation(self):
        manifest = os.environ.get('READER_SOFT404_SAMPLE_MANIFEST')
        if not manifest:
            self.skipTest('Set READER_SOFT404_SAMPLE_MANIFEST for saved real HTML verification')
        samples = json.loads(Path(manifest).read_bytes().decode('utf-8'))
        self.assertEqual(len(samples), 6)
        expected = []
        for sample in samples:
            data = Path(sample['file']).read_bytes()
            self.assertEqual(len(data), sample['bytes'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), sample['sha256'])
            route = sample['public_path'].strip('/') + '/index.html'
            self.put(data, route=route)
            if sample['role'] == 'current200-error-document':
                expected.append(route)
        self.assertEqual(len(expected), 4)
        before = snapshot(self.dist)
        records = subject.audit_reader_errors(self.dist)
        self.assertEqual(sorted(r['path'] for r in records), sorted(expected))
        self.assertEqual(snapshot(self.dist), before)
        receipt = subject.prune_reader_errors(self.dist)
        self.assertEqual(receipt['candidate_count'], 6)
        self.assertEqual(receipt['removed_count'], 4)
        survivors = snapshot(self.dist)
        self.assertEqual(len(survivors), 2)
        self.assertEqual(survivors, {k: v for k, v in before.items() if k not in expected})
        print('ACTUAL_SAMPLES: verified=6 admitted=4 removed=4 byte-and-mtime-identical-survivors=2')


if __name__ == '__main__':
    unittest.main(verbosity=2)
