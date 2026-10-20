import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const client=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
const entry=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('camera state is initialized before restoring saved planet view or starting homepage preview',()=>{
 const declaration=client.indexOf('let cameraSnap = true');
 const firstRestore=client.indexOf('if(previousWorld?.orbit)togglePlanetView();');
 const homepagePreview=client.indexOf('if(isPortalPreview){');
 const snapshotCall=client.indexOf('cameraSnap = true;',client.indexOf('function togglePlanetView()'));
 assert.ok(declaration>0,'camera must have explicit initialization');
 assert.ok(firstRestore>declaration,'restoring orbital camera must not hit temporal dead zone');
 assert.ok(homepagePreview>declaration,'homepage preview must not hit temporal dead zone');
 assert.ok(snapshotCall>declaration,'togglePlanetView uses initialized camera');
 assert.equal(client.match(/let cameraSnap\s*=/g)?.length,1,'single camera snapshot state');
});

test('published build changes the main-module cache key so Safari cannot reuse older code',()=>{
 const version=JSON.parse(readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;
 assert.match(entry,new RegExp('data-build="'+version.replaceAll('.','\\.')+'"'));
 assert.match(entry,/import\(['"]\.\/planet\.js\?v=\d+['"]\)/);
});
