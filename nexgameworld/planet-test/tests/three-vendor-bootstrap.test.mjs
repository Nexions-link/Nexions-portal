import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as VENDORED_THREE from '../vendor/three.module.js';
import * as PACKAGE_THREE from 'three';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('PC browser bootstrap imports Three.js from Nexions.ru, never an external CDN',()=>{
 const page=read('../index.html');
 const match=page.match(/<script type="importmap">([^<]+)<\/script>/);
 assert.ok(match,'The production page needs a native browser import map');
 const map=JSON.parse(match[1]);
 assert.equal(map.imports.three,'./vendor/three.module.js?v=160');
 assert.ok(page.includes('<link rel="modulepreload" href="./vendor/three.module.js?v=160">'));
 assert.doesNotMatch(page,/cdn\.jsdelivr\.net|unpkg\.com/);
 assert.match(page,/import\('\.\/planet\.js\?v=\d+'\)/);
 const vendor=read('../vendor/three.module.js');
 assert.match(vendor,/const REVISION = '160'/);
 assert.ok(vendor.length>1_000_000,'ship real Three.js, not a CDN stub');
 assert.match(read('../vendor/three.LICENSE.txt'),/MIT License/);
 assert.equal(VENDORED_THREE.REVISION,'160');
 assert.equal(VENDORED_THREE.REVISION,PACKAGE_THREE.REVISION);
 assert.equal(typeof VENDORED_THREE.WebGLRenderer,'function');
 assert.equal(typeof VENDORED_THREE.InstancedMesh,'function');
});
test('Failed module loads show a manual PC retry without endless reload loops',()=>{
 const page=read('../index.html');
 assert.match(page,/\.catch\(error=>\{/);
 assert.match(page,/Повторить загрузку/);
 assert.match(page,/url\.searchParams\.set\('ngw_retry',String\(Date\.now\(\)\)\)/);
 assert.doesNotMatch(page,/setInterval\(.*reload/);
});
test('release manifest, native import cache-key and VPS server agree',()=>{
 const v=JSON.parse(read('../version.json')).version;
 const page=read('../index.html');
 const server=read('../../server/index.js');
 assert.ok(page.includes('data-build="'+v+'"'));
 assert.ok(server.includes("BUILD='"+v+"'"));
 assert.match(page,/import\('\.\/planet\.js\?v=\d+'\)/);
});
