const fs = require('fs');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { Pick } = require('stream-json/filters/Pick');
const { streamObject } = require('stream-json/streamers/StreamObject');

console.time('stream');
const pipeline = chain([
  fs.createReadStream('public/data/enhanced-search-index.json'),
  parser(),
  new Pick({ filter: 'documents' }),
  streamObject()
]);

let count = 0;
let matchCount = 0;
pipeline.on('data', data => {
  count++;
  if (data.value.content && data.value.content.toLowerCase().includes('prayer')) {
    matchCount++;
  }
});

pipeline.on('end', () => {
  console.timeEnd('stream');
  console.log('Total documents:', count, 'Matches:', matchCount);
});
