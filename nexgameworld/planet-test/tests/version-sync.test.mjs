import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const entry=new URL('../index.html',import.meta.url);
const manifest=new URL('../version.json',import.meta.url);

test('NexGameWorld published HTML build matches version manifest for nexions.ru sync',()=>{
 const html=readFileSync(entry,'utf8');
 const version=JSON.parse(readFileSync(manifest,'utf8')).version;
 assert.match(version,/^\d+\.\d+\.\d+(?:\.\d+)?$/);
 const builds=[...html.matchAll(/\bdata-build="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(builds,[version],
  'Update data-build in planet-test/index.html whenever version.json changes, or nexions.ru mirror cannot publish.');
});
