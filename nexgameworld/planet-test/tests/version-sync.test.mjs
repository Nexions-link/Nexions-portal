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

test('build label comes from data-build instead of stale hard-coded version strings',()=>{
 const html=readFileSync(entry,'utf8');
 const buildStatus=readFileSync(new URL('../build-status.js',import.meta.url),'utf8');
 assert.match(html,/<title>NexGameWorld · Alpha<\/title>/);
 assert.match(html,/<span>Alpha —<\/span>/);
 assert.match(html,/<div id="planetBuildLoaded">Запущена: Alpha —<\/div>/);
 assert.match(buildStatus,/badgeText\.textContent='Alpha '\+running/);
 assert.match(buildStatus,/document\.title='NexGameWorld · Alpha '\+running/);
 assert.match(buildStatus,/url\.searchParams\.set\('fresh',String\(Date\.now\(\)\)\)/);
});
