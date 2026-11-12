'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { isSupportedNodeVersion } = require('./verify-node-runtime.cjs');
const pkg = require('../package.json');

test('accepts the project Node 22.x line', () => {
  for (const version of ['22.0.0', '22.1.0', '22.22.3', '22.99.999']) {
    assert.equal(isSupportedNodeVersion(version), true, version);
  }
});

test('rejects other majors and malformed versions', () => {
  for (const version of [
    '20.20.2', '21.7.3', '23.0.0', '24.0.0', '122.0.0',
    '', '22', '22.x', 'v22.22.3', '22.1', '22.1.0.0', '22.01.0',
    '22.1.00', '22.1.0-rc.1', ' 22.1.0', '22.1.0\n', null, undefined, 22,
  ]) {
    assert.equal(isSupportedNodeVersion(version), false, String(version));
  }
});

test('ordinary npm build runs the guard before focused tests and build', () => {
  assert.equal(pkg.engines.node, '22.x');
  assert.equal(pkg.scripts.prebuild,
    'node scripts/verify-node-runtime.cjs && node --test scripts/test-node-runtime.cjs');
  assert.equal(typeof pkg.scripts.build, 'string');
  assert.notEqual(pkg.scripts.build.length, 0);
});

test('CLI reports the real executable/version and fails closed on unsupported Node', () => {
  const result = spawnSync(process.execPath,
    [path.join(__dirname, 'verify-node-runtime.cjs')], { encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  const supported = isSupportedNodeVersion(process.versions.node);
  assert.equal(result.status, supported ? 0 : 1);
  assert.equal(supported ? result.stderr : result.stdout, '');
  assert.deepEqual(JSON.parse(supported ? result.stdout : result.stderr), {
    check: 'node-runtime', required: '22.x', version: process.versions.node,
    execPath: process.execPath, status: supported ? 'PASS' : 'FAIL',
  });
});
