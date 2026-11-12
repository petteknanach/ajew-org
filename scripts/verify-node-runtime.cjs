'use strict';

// Keep the ordinary npm build lifecycle aligned with package.json's Node 22.x.
function isSupportedNodeVersion(version) {
  return typeof version === 'string' && /^22\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(version);
}

if (require.main === module) {
  const supported = isSupportedNodeVersion(process.versions.node);
  const record = {
    check: 'node-runtime',
    required: '22.x',
    version: process.versions.node,
    execPath: process.execPath,
    status: supported ? 'PASS' : 'FAIL',
  };
  (supported ? console.log : console.error)(JSON.stringify(record));
  if (!supported) process.exitCode = 1;
}

module.exports = { isSupportedNodeVersion };
