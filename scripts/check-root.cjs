#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = '/mnt/c/Users/Pettek/LikutayHalachos - project by claude';

const entries = fs.readdirSync(base);
for (const e of entries) {
  const full = path.join(base, e);
  const isDir = fs.statSync(full).isDirectory();
  console.log(`${e} (${isDir ? 'dir' : 'file'})`);
}
