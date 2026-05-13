#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Fix prayer-58 in part 2 - add nextUrl to prayer-59
const filePath = 'public/reader/likutay-tefilos/part-2/prayer-58.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Check current nav
console.log('Current nav:', JSON.stringify(data.navigation));

// prayer-58 should link to prayer-59
if (!data.navigation.nextUrl) {
  data.navigation.nextUrl = '/reader/likutay-tefilos/2/59';
  console.log('Fixed: added nextUrl to prayer-58');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
} else {
  console.log('Already has nextUrl:', data.navigation.nextUrl);
}

// Also check prayer-59 prevUrl
const p59 = JSON.parse(fs.readFileSync('public/reader/likutay-tefilos/part-2/prayer-59.json', 'utf8'));
console.log('Prayer 59 nav:', JSON.stringify(p59.navigation));
