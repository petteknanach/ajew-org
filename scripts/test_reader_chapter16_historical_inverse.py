"""Real chapter-16 output admission, inverse and fail-closed controls."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('historical_ownership', ROOT / 'scripts/test_reader_plain_ownership.py')
assert spec is not None and spec.loader is not None
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class Chapter16Inverse(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.reader = Path(self.temp.name) / 'reader'
        self.relative = m.CONTROLS[1]
        self.source = self.reader / self.relative
        self.source.parent.mkdir(parents=True)
        self.source.write_bytes((ROOT / 'public/reader' / self.relative).read_bytes())
        self.out = Path(self.temp.name) / 'out'
        with patch.object(m.P, 'READER_DIR', self.reader), patch.object(m.P, 'OUT_DIR', self.out):
            data = json.loads(self.source.read_bytes())
            row = m.P.write_teaching(self.source, data, *m.P.infer_ids(self.source, data))
        self.folder = self.out / row['url'].removeprefix('/reader-plain/')
        self.bank = json.loads((ROOT / 'scripts/fixtures/reader-chapter16-historical-inverse.json').read_bytes())

    def admit(self, name, body=None):
        return m.historical_control_bytes(self.relative, name, (self.folder / name).read_bytes() if body is None else body, self.source, self.folder)

    def test_actual_all_format_whole_pins_and_restored_positives(self):
        import hashlib
        for name, d in self.bank['outputs'].items():
            current = (self.folder / name).read_bytes()
            before = self.admit(name)
            self.assertEqual(hashlib.sha256(before).hexdigest(), d['beforeSHA256'])
            self.assertNotEqual(before, current)
            self.assertEqual(self.admit(name), before)
            self.assertEqual((self.folder / name).read_bytes(), current)

    def test_mutated_missing_malformed_and_wrong_owner_outputs_fail(self):
        for name in self.bank['outputs']:
            body = (self.folder / name).read_bytes()
            for bad in [b'', b'{malformed', body + b' ', body.replace(b'16', b'17', 1)]:
                with self.subTest(name=name), self.assertRaises(AssertionError):
                    self.admit(name, bad)
        raw_file = self.folder / 'index.json'
        original = raw_file.read_bytes()
        for field, value in [('bookId','foreign'),('sourceFile','/reader/foreign.json'),('sourceMetadata',{}),('segments',[])]:
            data = json.loads(original);data[field] = value
            raw_file.write_text(json.dumps(data))
            with self.assertRaises((AssertionError, KeyError)):
                self.admit('index.txt')
        raw_file.write_bytes(original)
        raw_file.unlink()
        with self.assertRaises(FileNotFoundError):self.admit('index.txt')
        raw_file.write_bytes(original)
        self.assertIsInstance(self.admit('index.txt'),bytes)

    def test_source_drift_and_missing_fail_and_other_controls_are_identity(self):
        original = self.source.read_bytes()
        for bad in [b'',b'{malformed',original+b' ']:
            self.source.write_bytes(bad)
            with self.assertRaises(AssertionError):self.admit('index.txt')
        self.source.unlink()
        with self.assertRaises(FileNotFoundError):self.admit('index.txt')
        self.source.write_bytes(original)
        for relative in (m.CONTROLS[0],m.CONTROLS[2]):
            current = b'identity sentinel, not a teaching fixture'
            self.assertIs(m.historical_control_bytes(relative,'index.txt',current,None,None),current)
        self.assertIsInstance(self.admit('index.txt'),bytes)


if __name__ == '__main__':
    unittest.main(verbosity=2)
